import { supabase } from "@/lib/supabase";

export const CREDIT_CHANGED_EVENT="ftai:credits-changed";
export async function creditRequest(url:string,options:RequestInit={}) {
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error("로그인 후 이용해주세요.");
    const response=await fetch(url,{...options,cache:"no-store",headers:{"Content-Type":"application/json",...options.headers,Authorization:`Bearer ${session.access_token}`}});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"크레딧 정보를 불러오지 못했습니다.");
    return data;
}

let active=0;
const queue:Array<()=>void>=[];
async function limited<T>(signal:AbortSignal|null|undefined,work:()=>Promise<T>):Promise<T> {
    if(active>=3)await new Promise<void>(resolve=>queue.push(resolve));
    else active++;
    try {if(signal?.aborted)throw new DOMException("작업이 취소되었습니다.","AbortError");return await work();}
    finally {const next=queue.shift();if(next)next();else active--;}
}
const pause=(ms:number,signal?:AbortSignal|null)=>new Promise<void>((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException("취소되었습니다.","AbortError"));return;}
    const abort=()=>{clearTimeout(timer);reject(new DOMException("취소되었습니다.","AbortError"));};
    const timer=setTimeout(()=>{signal?.removeEventListener("abort",abort);resolve();},ms);
    signal?.addEventListener("abort",abort,{once:true});
});
export async function creditAIFetch(url:string,options:RequestInit):Promise<Response> {
    const requestId=crypto.randomUUID();
    const headers=new Headers(options.headers);headers.set("Idempotency-Key",requestId);
    return limited(options.signal,async()=>{
        try {
            let response:Response;
            try {response=await fetch(url,{...options,headers});}
            catch(error){
                if(options.signal?.aborted)throw error;
                // A transport retry MUST reuse the same key, even if the first response was lost.
                response=await fetch(url,{...options,headers});
            }
            const data=await response.clone().json().catch(()=>({}));
            if(data.code!=="CREDIT_IN_PROGRESS")return response;
            const deadline=Date.now()+110_000;
            while(Date.now()<deadline){
                await pause(1000,options.signal);
                const status=await fetch(`/api/credits/requests/${requestId}`,{headers,signal:options.signal,cache:"no-store"});
                const job=await status.clone().json();
                if(!status.ok)return status;
                if(job.status==="completed"&&job.result)return new Response(JSON.stringify({...job.result,credits:{requestId,chargedUnits:job.chargedUnits,replayed:true}}),{status:200,headers:{"Content-Type":"application/json"}});
                if(job.status==="failed"||job.status==="uncertain")return new Response(JSON.stringify({error:job.status==="failed"?"AI 요청이 완료되지 않아 크레딧 예약을 해제했습니다. 다시 시도해주세요.":"AI 사용량을 확인 중입니다. 크레딧 내역에서 확인해주세요.",code:job.code||"AI_FAILED",requestId}),{status:503,headers:{"Content-Type":"application/json"}});
            }
            return response;
        } finally {window.dispatchEvent(new Event(CREDIT_CHANGED_EVENT));}
    });
}
