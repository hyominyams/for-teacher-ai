import { createHash, randomUUID } from "node:crypto";
import OpenAI from "openai";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTokenUsage, PRICE_VERSION, reserveCostUnits, usageCostUnits, type BilledModel, type CreditOperation } from "@/lib/credits";

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
export type BilledChat = (params: ChatParams) => Promise<OpenAI.Chat.Completions.ChatCompletion>;
export type CallBudget = { model: BilledModel; inputCeiling: number; maxOutput: number };
export class CreditError extends Error {
    readonly code: string; readonly status: number;
    constructor(code: string, message: string, status = 400) { super(message); this.code = code; this.status = status; }
}
const MESSAGES: Record<string, [number, string]> = {
    CREDIT_INSUFFICIENT: [402,"사용 가능한 크레딧이 부족합니다. 진행 중인 생성이 끝난 뒤 다시 시도하거나 관리자에게 추가 지급을 요청해주세요."],
    CREDIT_VERIFICATION_REQUIRED: [403,"이메일 인증을 완료한 계정으로 로그인해주세요."],
    CREDIT_ADMIN_REQUIRED: [403,"관리자만 사용할 수 있습니다."],
    CREDIT_REQUEST_CONFLICT: [409,"같은 요청 번호로 다른 작업을 실행할 수 없습니다. 새로 요청해주세요."],
    CREDIT_BUSY: [429,"이미 여러 AI 요청을 처리 중입니다. 완료 후 다시 시도해주세요."],
    CREDIT_RATE_LIMIT: [429,"짧은 시간에 요청이 많습니다. 잠시 후 다시 시도해주세요."],
    CREDIT_SETTLEMENT_REQUIRED: [503,"AI 요청의 사용량을 확인 중입니다. 크레딧 내역에서 확인 중인 금액을 볼 수 있으며, 임의로 중복 차감하지 않습니다."],
    CREDIT_STILL_RUNNING: [409,"아직 실행 중일 수 있어 예약을 해제할 수 없습니다. 요청 후 10분이 지나면 다시 확인해주세요."],
    CREDIT_INVALID_REQUEST: [400,"크레딧 요청 값을 확인해주세요."],
    CREDIT_NOT_FOUND: [404,"요청을 찾을 수 없습니다."],
};
export function mapCreditError(error: unknown): CreditError {
    if (error instanceof CreditError) return error;
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
    for (const [code, [status, text]] of Object.entries(MESSAGES)) if (message.includes(code)) return new CreditError(code,text,status);
    return new CreditError("AI_FAILED","요청을 완료하지 못했습니다. 입력과 기존 결과는 유지됩니다. 잠시 후 다시 시도해주세요.",502);
}
export const creditHeaders = { "Cache-Control": "no-store, private" };
export function creditFailure(error: unknown, requestId?: string) {
    const e = mapCreditError(error);
    return NextResponse.json({ error:e.message,code:e.code,...(requestId?{requestId}:{}) }, {status:e.status,headers:creditHeaders});
}
export function creditAdminClient() {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)throw new CreditError("CREDITS_UNAVAILABLE","크레딧 서비스를 준비 중입니다. AI 요청은 잠시 후 다시 시도해주세요.",503);
    return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function creditUser(req:Request):Promise<User> {
    const token=req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if(!token)throw new CreditError("AUTH_REQUIRED","로그인 후 AI 기능을 이용해주세요.",401);
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!key)throw new CreditError("AUTH_UNAVAILABLE","로그인 상태를 확인할 수 없습니다.",503);
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await client.auth.getUser(token);
    if(error||!data.user)throw new CreditError("AUTH_REQUIRED","로그인이 만료되었습니다. 다시 로그인해주세요.",401);
    if(!data.user.email_confirmed_at&&!data.user.phone_confirmed_at)throw mapCreditError(new Error("CREDIT_VERIFICATION_REQUIRED"));
    return data.user;
}
export async function requireCreditAdmin(client:SupabaseClient,userId:string) {
    const {data,error}=await client.from("credit_admins").select("user_id").eq("user_id",userId).maybeSingle();
    if(error)throw error;
    if(!data)throw mapCreditError(new Error("CREDIT_ADMIN_REQUIRED"));
}
export function isRequestId(value:unknown):value is string { return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export async function readAIJson(req:Request) {
    const text=await req.text();
    if(Buffer.byteLength(text)>400_000)throw new CreditError("INPUT_TOO_LARGE","입력 내용이 너무 큽니다.",413);
    try { const value=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();return value; }
    catch {throw new CreditError("INVALID_INPUT","입력 형식을 확인해주세요.");}
}
export function inputTokenCeiling(params:Pick<ChatParams,"messages"|"response_format">) {
    // Every BPE text token consumes at least one UTF-8 byte. Add room for framing/schema.
    return Buffer.byteLength(JSON.stringify({messages:params.messages,response_format:params.response_format}))+2048;
}
export function callBudget(params:ChatParams):CallBudget {
    if(params.model!=="gpt-6-luna"&&params.model!=="gpt-5-nano")throw new Error("UNPRICED_MODEL");
    if(!Number.isInteger(params.max_completion_tokens)||!params.max_completion_tokens||params.max_completion_tokens>40000)throw new Error("OUTPUT_LIMIT_REQUIRED");
    return {model:params.model as BilledModel,inputCeiling:inputTokenCeiling(params),maxOutput:params.max_completion_tokens};
}
export function completionText(response:OpenAI.Chat.Completions.ChatCompletion) {
    const choice=response.choices[0];
    if(choice?.finish_reason!=="stop"||choice.message.refusal||!choice.message.content?.trim())throw new CreditError("AI_INCOMPLETE","완성된 생성 결과를 받지 못했습니다. 크레딧은 차감하지 않습니다.",502);
    return choice.message.content.trim();
}
async function rpc(client:SupabaseClient,name:string,args:Record<string,unknown>) {
    // Only retry transport/database failures; RPC mutations are idempotent.
    let failure:unknown;
    for(let i=0;i<2;i++) {
        try {const {data,error}=await client.rpc(name,args);if(!error)return data;failure=error;if(error.code?.startsWith("PT"))throw mapCreditError(error);}
        catch(e){if(e instanceof CreditError)throw e;failure=e;}
    }
    throw failure;
}
export async function runCreditJob(req:Request,user:User,operation:CreditOperation,fingerprintData:unknown,budgets:CallBudget[],work:(complete:BilledChat)=>Promise<Record<string,unknown>>) {
    const requestId=req.headers.get("idempotency-key")||randomUUID();
    if(!isRequestId(requestId))return creditFailure(new CreditError("INVALID_REQUEST_ID","요청 번호 형식을 확인해주세요."));
    const client=creditAdminClient(), owner=randomUUID();
    const fingerprint=createHash("sha256").update(JSON.stringify({version:PRICE_VERSION,operation,data:fingerprintData})).digest("hex");
    const reserved=budgets.reduce((sum,b)=>sum+reserveCostUnits(b.model,b.inputCeiling,b.maxOutput),0);
    const args={p_user_id:user.id,p_request_id:requestId,p_owner_token:owner};
    let claimed=false, uncertain=false, callIndex=0;
    try {
        if(!process.env.OPENAI_API_KEY)throw new CreditError("AI_UNAVAILABLE","AI 서비스를 준비 중입니다.",503);
        const reservation=await rpc(client,"reserve_credit_job",{...args,p_fingerprint:fingerprint,p_operation:operation,p_reserve_units:reserved});
        // A lost reserve RPC response can be retried by this exact worker. Other
        // HTTP handlers always have a different owner token and cannot run it.
        const ownedRetry=reservation.job.owner_token===owner&&reservation.job.status==="running";
        if(!reservation.created&&!ownedRetry) {
            const job=reservation.job;
            if(job.status==="completed"&&job.result&&new Date(job.result_expires_at).getTime()>Date.now())return NextResponse.json({...job.result,credits:{requestId,chargedUnits:Number(job.charged_units),replayed:true}},{headers:creditHeaders});
            if(job.status==="running")return creditFailure(new CreditError("CREDIT_IN_PROGRESS","같은 요청이 처리 중입니다. 잠시 기다려주세요.",409),requestId);
            if(job.status==="uncertain")throw mapCreditError(new Error("CREDIT_SETTLEMENT_REQUIRED"));
            throw new CreditError("CREDIT_REQUEST_FINISHED","이미 처리된 요청입니다. 결과가 필요하면 새 작업으로 요청해주세요.",409);
        }
        claimed=true;
        const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:operation==="subject_plan"?90000:45000});
        const complete:BilledChat=async params=>{
            const budget=budgets[callIndex];
            if(!budget||params.model!==budget.model||params.max_completion_tokens!==budget.maxOutput||inputTokenCeiling(params)>budget.inputCeiling)throw new CreditError("BUDGET_MISMATCH","요청 크기를 확인하지 못했습니다. 다시 시도해주세요.",400);
            uncertain=true;
            let response:OpenAI.Chat.Completions.ChatCompletion;
            const cacheOptions=budget.model==="gpt-6-luna"?{prompt_cache_options:{ttl:"30m"}}:{};
            try { response=await openai.chat.completions.create({...params,...cacheOptions,service_tier:"default",store:false,n:1}); }
            catch(error) {
                // Explicit 4xx rejections are unbilled. Timeout, connection loss and 5xx are uncertain.
                if(error instanceof OpenAI.APIError&&error.status&&error.status>=400&&error.status<500&&error.status!==408)uncertain=false;
                throw error;
            }
            const usage=normalizeTokenUsage(response.usage,"30m");
            if(response.service_tier&&response.service_tier!=="default")throw new Error("UNPRICED_SERVICE_TIER");
            const cost=usageCostUnits(budget.model,usage);
            await rpc(client,"record_credit_usage",{...args,p_call_index:callIndex,p_model:budget.model,p_response_id:response.id,p_price_version:PRICE_VERSION,p_usage:usage,p_cost_units:cost});
            callIndex++; uncertain=false;
            return response;
        };
        const result=await work(complete);
        // A lost settlement response is retried with the same request; never rerun the model.
        uncertain=true;
        const settled=await rpc(client,"finish_credit_job",{...args,p_status:"completed",p_result:result});
        if(settled.status!=="completed"||!settled.result)throw new CreditError("CREDIT_REQUEST_FINISHED","이미 종료된 요청입니다. 크레딧 내역을 확인해주세요.",409);
        return NextResponse.json({...settled.result,credits:{requestId,chargedUnits:Number(settled.charged_units)}},{headers:creditHeaders});
    } catch(error) {
        if(claimed) {
            try {
                const settled=await rpc(client,"finish_credit_job",{...args,p_status:uncertain?"uncertain":"failed",p_error_code:mapCreditError(error).code});
                if(settled.status==="completed"&&settled.result)return NextResponse.json({...settled.result,credits:{requestId,chargedUnits:Number(settled.charged_units),replayed:true}},{headers:creditHeaders});
            } catch {uncertain=true;}
        }
        return creditFailure(uncertain?mapCreditError(new Error("CREDIT_SETTLEMENT_REQUIRED")):error,requestId);
    }
}
