import { NextResponse } from "next/server";
import { creditAdminClient, creditFailure, creditHeaders, creditUser, CreditError, isRequestId } from "@/lib/server/credits";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}) {
    try {
        const user=await creditUser(req),{id}=await params;
        if(!isRequestId(id))throw new CreditError("INVALID_REQUEST_ID","요청 번호를 확인해주세요.");
        const {data:job,error}=await creditAdminClient().from("credit_jobs").select("status,result,result_expires_at,error_code,charged_units").eq("user_id",user.id).eq("request_id",id).maybeSingle();
        if(error)throw error;
        if(!job)throw new CreditError("CREDIT_NOT_FOUND","요청을 찾을 수 없습니다.",404);
        const result=job.result&&job.result_expires_at&&Date.parse(job.result_expires_at)>Date.now()?job.result:null;
        return NextResponse.json({status:job.status,result,code:job.error_code,chargedUnits:Number(job.charged_units)},{headers:creditHeaders});
    }catch(error){return creditFailure(error);}
}
