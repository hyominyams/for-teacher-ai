import { NextResponse } from "next/server";
import { creditAdminClient, creditFailure, creditHeaders, creditUser } from "@/lib/server/credits";

export const dynamic="force-dynamic";
export async function GET(req:Request) {
    try {
        const user=await creditUser(req),client=creditAdminClient();
        const maintenance=await client.rpc("maintain_credit_jobs");if(maintenance.error)throw maintenance.error;
        const wallet=await client.rpc("ensure_credit_wallet",{p_user_id:user.id});if(wallet.error)throw wallet.error;
        if(new URL(req.url).searchParams.get("summary")==="1") {
            const admin=await client.from("credit_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(admin.error)throw admin.error;
            const w=Array.isArray(wallet.data)?wallet.data[0]:wallet.data;
            return NextResponse.json({wallet:{balance_units:Number(w.balance_units),reserved_units:Number(w.reserved_units),available_units:Number(w.balance_units)-Number(w.reserved_units),is_admin:Boolean(admin.data)}},{headers:creditHeaders});
        }
        const [admin,ledger,jobs,usage]=await Promise.all([
            client.from("credit_admins").select("user_id").eq("user_id",user.id).maybeSingle(),
            client.from("credit_ledger").select("id,kind,delta_units,balance_after,reason,created_at,request_id").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50),
            client.from("credit_jobs").select("request_id,operation,status,reserved_units,actual_units,charged_units,error_code,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
            client.from("credit_usage").select("request_id,call_index,model,usage,cost_units,price_version").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60),
        ]);
        for(const result of [admin,ledger,jobs,usage])if(result.error)throw result.error;
        const w=Array.isArray(wallet.data)?wallet.data[0]:wallet.data;
        return NextResponse.json({wallet:{balance_units:Number(w.balance_units),reserved_units:Number(w.reserved_units),available_units:Number(w.balance_units)-Number(w.reserved_units),is_admin:Boolean(admin.data)},ledger:ledger.data,jobs:jobs.data,usage:usage.data},{headers:creditHeaders});
    } catch(error){return creditFailure(error);}
}
