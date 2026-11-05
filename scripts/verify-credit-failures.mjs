// Requires a built app and local Supabase server credentials. Creates/removes one
// synthetic account. The model endpoint is a local mock and uses a dummy API key.
import env from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
env.loadEnvConfig(process.cwd());
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let mode="invalid-json",calls=0,child,userId;
const modelPort=Number(process.env.CREDIT_MOCK_PORT||3157),appPort=Number(process.env.CREDIT_TEST_APP_PORT||3156);
const mock=createServer(async(req,res)=>{
    calls++;for await(const _ of req){} // Never log authorization headers or request bodies.
    if(mode==="disconnect"){req.socket.destroy();return;}
    res.setHeader("Content-Type","application/json");
    if(mode==="reject"){res.statusCode=400;res.end(JSON.stringify({error:{message:"Synthetic rejection",type:"invalid_request_error",code:"invalid_request"}}));return;}
    res.end(JSON.stringify({id:`chatcmpl-synthetic-${randomUUID()}`,object:"chat.completion",created:1,model:"gpt-5-nano",service_tier:"default",choices:[{index:0,message:{role:"assistant",content:mode==="invalid-json"?"invalid JSON":"검증용 생성 문장입니다."},finish_reason:"stop"}],...(mode==="missing-usage"?{}:{usage:{prompt_tokens:100,completion_tokens:20,prompt_tokens_details:{cached_tokens:0}}})}));
});
try{
    await new Promise((resolve,reject)=>{mock.once("error",reject);mock.listen(modelPort,"127.0.0.1",resolve);});
    const email=`qa-credit-failure-${Date.now()}@example.test`,password=randomBytes(24).toString("base64url")+"Aa1!";
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:"QA credit failure simulation"}});if(created.error)throw created.error;userId=created.data.user.id;
    const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const signed=await auth.auth.signInWithPassword({email,password});if(signed.error)throw signed.error;
    const token=signed.data.session.access_token;
    child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(appPort)],{env:{...process.env,OPENAI_API_KEY:"synthetic-key-not-a-real-secret",OPENAI_BASE_URL:`http://127.0.0.1:${modelPort}/v1`},stdio:["ignore","pipe","pipe"]});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Local app startup timeout")),20000);const done=chunk=>{if(String(chunk).includes("Ready")){clearTimeout(timer);resolve();}};child.stdout.on("data",done);child.once("exit",()=>{clearTimeout(timer);reject(new Error("Local app exited before verification"));});});
    const headers={Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
    async function request(path,body,key=randomUUID()){
        const r=await fetch(`http://127.0.0.1:${appPort}`+path,{method:"POST",headers:{...headers,"Idempotency-Key":key},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),id:key};
    }
    async function job(id){const r=await admin.from("credit_jobs").select().eq("user_id",userId).eq("request_id",id).single();if(r.error)throw r.error;return r.data;}
    const input={category:"behavior",keywords:["성실","협력"],targetChars:100};
    const invalid=await request("/api/generate/standard",{subjectName:"국어",grade:"5",criteria:"토의 참여"});assert.equal(invalid.status,502);let j=await job(invalid.id);assert.equal(j.status,"failed");assert.equal(j.charged_units,0);assert.ok(j.actual_units>0);
    mode="missing-usage";
    const missing=await request("/api/generate",input);assert.equal(missing.status,503);assert.equal(missing.body.code,"CREDIT_SETTLEMENT_REQUIRED");j=await job(missing.id);assert.equal(j.status,"uncertain");const callCount=calls;
    const repeated=await request("/api/generate",input,missing.id);assert.equal(repeated.status,503);assert.equal(calls,callCount,"uncertain retry must never call model again");
    const wallet=await admin.from("credit_wallets").select().eq("user_id",userId).single();assert.equal(wallet.data.balance_units,300000000);assert.ok(wallet.data.reserved_units>0);
    mode="reject";const rejection=await request("/api/generate",input);assert.equal(rejection.status,502);j=await job(rejection.id);assert.equal(j.status,"failed");assert.equal(j.actual_units,0);
    mode="disconnect";const lost=await request("/api/generate",input);assert.equal(lost.status,503);assert.equal((await job(lost.id)).status,"uncertain");
    console.log(JSON.stringify({invalidOutputRefund:true,unknownUsageHeld:true,unknownRetryNoSecondModelCall:true,explicitRejectionReleased:true,connectionLossHeld:true,realOpenAICalls:0}));
}finally{
    child?.kill("SIGTERM");await new Promise(resolve=>mock.close(resolve));
    if(userId){const removed=await admin.auth.admin.deleteUser(userId);if(removed.error)throw removed.error;}
}
