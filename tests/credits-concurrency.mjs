// Run after credits-db.sql against the disposable LOCAL test database only.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const exec=promisify(execFile);
const port=process.env.CREDITS_TEST_PG_PORT||"55438";
async function sql(text){try{const r=await exec("psql",["-h","127.0.0.1","-p",port,"-d","ftai_credits_test","-v","ON_ERROR_STOP=1","-At","-c",text]);return {ok:true,text:r.stdout.trim()};}catch(e){return {ok:false,text:e.stderr||e.message};}}
const users=[randomUUID(),randomUUID()];
try{
    const seeded=await sql(`insert into auth.users(id,email,email_confirmed_at) values ('${users[0]}','parallel-budget@example.test',now()),('${users[1]}','parallel-duplicate@example.test',now());`);assert.ok(seeded.ok,seeded.text);
    const attempts=await Promise.all(Array.from({length:12},()=>sql(`select public.reserve_credit_job('${users[0]}','${randomUUID()}','${randomUUID()}','${"a".repeat(64)}','generate',100000000);`)));
    assert.equal(attempts.filter(a=>a.ok).length,3);assert.ok(attempts.every(a=>a.ok||a.text.includes("CREDIT_INSUFFICIENT")));
    const snapshot=await sql(`select jsonb_build_object('balance',balance_units,'reserved',reserved_units,'grants',(select count(*) from public.credit_ledger where user_id='${users[0]}' and kind='welcome')) from public.credit_wallets where user_id='${users[0]}';`);
    assert.deepEqual(JSON.parse(snapshot.text),{balance:300000000,reserved:300000000,grants:1});
    const requestId=randomUUID(),owner=randomUUID();
    const duplicates=await Promise.all(Array.from({length:8},()=>sql(`select public.reserve_credit_job('${users[1]}','${requestId}','${owner}','${"b".repeat(64)}','generate',100000000);`)));
    assert.ok(duplicates.every(r=>r.ok));assert.equal(duplicates.filter(r=>JSON.parse(r.text).created).length,1);
    console.log("12 concurrent requests: only 3 admitted within balance; 8 duplicate requests: only one reserved; welcome granted once.");
}finally{const cleanup=await sql(`delete from auth.users where id in ('${users[0]}','${users[1]}');`);assert.ok(cleanup.ok,cleanup.text);}
