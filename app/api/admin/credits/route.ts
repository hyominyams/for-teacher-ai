import { NextResponse } from "next/server";
import { creditAmountToUnits } from "@/lib/credits";
import { creditAdminClient, creditFailure, creditHeaders, creditUser, CreditError, isRequestId, readAIJson, requireCreditAdmin } from "@/lib/server/credits";

export const dynamic="force-dynamic";
export async function GET(req:Request) {
    try {
        const user=await creditUser(req),client=creditAdminClient();await requireCreditAdmin(client,user.id);
        const url=new URL(req.url),q=(url.searchParams.get("q")||"").slice(0,100),offset=Number(url.searchParams.get("offset")||0);
        if(!Number.isInteger(offset)||offset<0)throw new CreditError("INVALID_INPUT","조회 범위를 확인해주세요.");
        const maintenance=await client.rpc("maintain_credit_jobs");if(maintenance.error)throw maintenance.error;
        const [members,pending,ledger]=await Promise.all([
            client.rpc("admin_credit_members",{p_actor_id:user.id,p_query:q,p_limit:50,p_offset:offset}),
            client.from("credit_jobs").select("user_id,request_id,operation,status,reserved_units,actual_units,created_at").eq("status","uncertain").order("created_at",{ascending:true}).limit(50),
            client.from("credit_ledger").select("id,user_id,kind,delta_units,reason,created_at,actor_id").in("kind",["admin_grant","admin_revoke"]).order("created_at",{ascending:false}).limit(30),
        ]);
        for(const result of [members,pending,ledger])if(result.error)throw result.error;
        return NextResponse.json({members:members.data,pending:pending.data,ledger:ledger.data},{headers:creditHeaders});
    }catch(error){return creditFailure(error);}
}
export async function POST(req:Request) {
    try {
        const user=await creditUser(req),client=creditAdminClient();await requireCreditAdmin(client,user.id);
        const {userId,requestId,credits,reason,action}=await readAIJson(req);
        if(!isRequestId(userId)||!isRequestId(requestId)||typeof reason!=="string"||reason.trim().length<2||reason.length>200)throw new CreditError("INVALID_INPUT","대상 회원과 사유를 확인해주세요.");
        if(action==="release") {
            const {error}=await client.rpc("release_uncertain_credit_job",{p_actor_id:user.id,p_user_id:userId,p_request_id:requestId,p_reason:reason.trim()});if(error)throw error;
            return NextResponse.json({released:true},{headers:creditHeaders});
        }
        if(action!=="adjust")throw new CreditError("INVALID_INPUT","작업 종류를 확인해주세요.");
        let units:number;
        try{units=creditAmountToUnits(credits);}catch(e){throw new CreditError("INVALID_INPUT",e instanceof Error?e.message:"크레딧을 확인해주세요.");}
        const {data,error}=await client.rpc("adjust_credit_balance",{p_actor_id:user.id,p_user_id:userId,p_request_id:requestId,p_delta_units:units,p_reason:reason.trim()});if(error)throw error;
        return NextResponse.json({wallet:data},{headers:creditHeaders});
    }catch(error){return creditFailure(error);}
}
