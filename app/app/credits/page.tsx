"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { creditRequest, CREDIT_CHANGED_EVENT } from "@/lib/credit-client";
import { CREDIT_OPERATIONS, formatCredits, type Wallet, type CreditOperation, type TokenUsage } from "@/lib/credits";

type Ledger={id:string;kind:string;delta_units:number;balance_after:number;reason:string;created_at:string};
type Job={request_id:string;operation:CreditOperation;status:string;reserved_units:number;charged_units:number;created_at:string};
type Usage={request_id:string;call_index:number;model:string;usage:TokenUsage;cost_units:number};
type Data={wallet:Wallet;ledger:Ledger[];jobs:Job[];usage:Usage[]};
const date=(s:string)=>new Date(s).toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Seoul"});
const labels:Record<string,string>={welcome:"기본 지급",admin_grant:"관리자 지급",admin_revoke:"관리자 회수",usage:"AI 사용"};
const statuses:Record<string,string>={running:"생성 중",completed:"완료",failed:"미차감 · 예약 해제",uncertain:"사용량 확인 중"};
function replayText(result:Record<string,unknown>) {
    if(typeof result.result==="string")return result.result;
    if(typeof result.standard==="string")return result.standard;
    if(Array.isArray(result.proposals))return `${result.reviewedCount}명 검토 · 수정 제안 ${result.proposals.length}건\n\n`+result.proposals.map(p=>`${p.studentId}번 학생\n원문: ${p.before}\n제안: ${p.after}`).join("\n\n");
    if(Array.isArray(result.subjects))return result.subjects.map(s=>`${s.subjectName} · ${s.grade}학년\n`+(Array.isArray(s.assessments)?s.assessments.map((a:{area:string;standard:string;criteria:string;competency:string})=>`영역: ${a.area}\n성취기준: ${a.standard}\n평가기준: ${a.criteria}\n핵심역량: ${a.competency}`).join("\n\n"):"")).join("\n\n────────\n\n");
    return "표시할 결과가 없습니다.";
}

export default function CreditsPage(){
    const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
    const [replay,setReplay]=useState<{title:string;text:string}|null>(null),[replaying,setReplaying]=useState<string|null>(null);
    const dialog=useRef<HTMLDialogElement|null>(null);
    const seq=useRef(0);
    useEffect(()=>{if(replay)dialog.current?.showModal();else dialog.current?.close();},[replay]);
    const load=useCallback(async()=>{
        const version=++seq.current;setLoading(true);
        try{const result=await creditRequest("/api/credits");if(version===seq.current){setData(result);setError("");}}
        catch(e){if(version===seq.current){setData(null);setError(e instanceof Error?e.message:"내역을 불러오지 못했습니다.");}}
        finally{if(version===seq.current)setLoading(false);}
    },[]);
    useEffect(()=>{
        void load();const update=()=>void load();
        const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"||event==="SIGNED_IN"){seq.current++;setData(null);setReplay(null);window.setTimeout(update,0);}});
        window.addEventListener("focus",update);window.addEventListener(CREDIT_CHANGED_EVENT,update);
        const invalidate=()=>{seq.current++;};return()=>{invalidate();subscription.unsubscribe();window.removeEventListener("focus",update);window.removeEventListener(CREDIT_CHANGED_EVENT,update);};
    },[load]);
    async function openResult(job:Job){
        const version=seq.current;setReplaying(job.request_id);setError("");
        try{const result=await creditRequest(`/api/credits/requests/${job.request_id}`);if(version!==seq.current)return;if(!result.result)throw new Error("결과의 24시간 임시 보관 기간이 지났습니다. 작업로그에 저장한 내용은 유지됩니다.");setReplay({title:CREDIT_OPERATIONS[job.operation],text:replayText(result.result)});}
        catch(e){if(version===seq.current)setError(e instanceof Error?e.message:"결과를 불러오지 못했습니다.");}
        finally{setReplaying(null);}
    }
    return <main className="mx-auto min-h-[80vh] max-w-5xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4"/>작성 화면으로</Link>
        <div className="mb-8 mt-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">내 크레딧</h1><p className="mt-3 text-sm text-muted-foreground">사용한 만큼 차감하고, 내역은 투명하게 확인합니다.</p></div><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading?"animate-spin":""}`}/>새로고침</Button></div>
        {error&&<div role="alert" className="mb-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error} <Link href="/login" className="underline">로그인 확인</Link></div>}
        {!data&&loading&&<p role="status" className="py-8 text-muted-foreground">잔액과 사용 내역을 불러오는 중입니다.</p>}
        {data&&<>
            <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
                <p className="text-sm font-semibold text-primary">지금 사용 가능한 크레딧</p>
                <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums">{formatCredits(data.wallet.available_units)}<span className="ml-2 text-2xl text-primary">C</span></p>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-primary/15 pt-5 text-sm text-muted-foreground"><span>전체 잔액 <strong className="text-foreground">{formatCredits(data.wallet.balance_units)} C</strong></span><span>처리 중 예약 <strong className="text-foreground">{formatCredits(data.wallet.reserved_units)} C</strong></span></div>
                {data.wallet.available_units<=0&&<p role="status" className="mt-5 text-sm font-semibold text-destructive">크레딧이 없어 AI 생성을 이용할 수 없습니다. 기존 기록은 계속 조회·수정·저장할 수 있습니다.</p>}
                {data.wallet.reserved_units>0&&<p className="mt-4 text-xs leading-6 text-muted-foreground">진행 중인 요청에 필요한 금액을 잠시 예약합니다. 완료하면 실제 사용량만 차감하고 나머지는 즉시 사용 가능해집니다. ‘사용량 확인 중’ 요청은 관리자 확인 후 예약을 해제합니다.</p>}
            </section>
            <div className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5"><p className="text-sm leading-6"><strong>100크레딧 = API 원가 $1</strong><br/><span className="text-muted-foreground">최초 30크레딧을 한 번 지급합니다. 추가 지급은 관리자에게 요청해주세요.</span></p>{data.wallet.is_admin&&<Link href="/app/admin/credits" className="inline-flex items-center gap-1 text-sm font-bold text-primary">관리자 지급·회수<ArrowUpRight className="size-4"/></Link>}</div>
            <section className="mt-9" aria-labelledby="ai-history"><h2 id="ai-history" className="mb-4 text-xl font-bold">최근 AI 사용</h2><div className="overflow-hidden rounded-2xl border">
                {!data.jobs.length?<p className="p-6 text-sm text-muted-foreground">아직 AI 사용 내역이 없습니다.</p>:data.jobs.map(job=>{const usage=data.usage.filter(u=>u.request_id===job.request_id);return <article key={job.request_id} className="border-b p-5 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{CREDIT_OPERATIONS[job.operation]}</p><p className="mt-1 text-xs text-muted-foreground">{date(job.created_at)} · {statuses[job.status]||job.status}</p></div><div className="flex items-center gap-3">{job.status==="completed"&&<Button variant="outline" size="sm" disabled={replaying!==null} onClick={()=>void openResult(job)}>{replaying===job.request_id?"불러오는 중…":"결과 다시 보기"}</Button>}<p className="font-semibold tabular-nums">{job.status==="completed"?`${formatCredits(job.charged_units,6)} C`:job.status==="failed"?"0 C":`${formatCredits(job.reserved_units)} C 예약`}</p></div></div>{usage.length>0&&<details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">토큰 사용량과 비용 확인</summary>{usage.map(u=><p key={u.call_index} className="mt-2 leading-6">{u.model} · 입력 {u.usage.input.toLocaleString()} · 출력 {u.usage.output.toLocaleString()} · 캐시 읽기 {u.usage.cached.toLocaleString()} · 캐시 쓰기 {(u.usage.write30m+u.usage.write12h).toLocaleString()} 토큰 · API 원가 ${(u.cost_units/1_000_000_000).toFixed(8)}</p>)}{job.status==="failed"&&<p className="mt-2">완성된 결과를 받지 못한 요청의 API 비용은 사이트에서 부담합니다.</p>}</details>}</article>;})}
            </div></section>
            <section className="mt-9" aria-labelledby="credit-ledger"><h2 id="credit-ledger" className="mb-4 text-xl font-bold">지급·차감 내역</h2><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="p-4">일시</th><th className="p-4">내역</th><th className="p-4 text-right">증감</th><th className="p-4 text-right">반영 후 잔액</th></tr></thead><tbody>{data.ledger.map(row=><tr key={row.id} className="border-t"><td className="p-4 text-xs text-muted-foreground">{date(row.created_at)}</td><td className="p-4">{labels[row.kind]}<span className="mt-1 block text-xs text-muted-foreground">{CREDIT_OPERATIONS[row.reason as CreditOperation]||row.reason}</span></td><td className={`p-4 text-right font-medium tabular-nums ${row.delta_units>0?"text-primary":""}`}>{row.delta_units>0?"+":""}{formatCredits(row.delta_units,6)} C</td><td className="p-4 text-right tabular-nums">{formatCredits(row.balance_after)} C</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted-foreground">최근 50개 내역입니다. 표시를 반올림하더라도 내부 계산은 작은 단위까지 누적하며, 요청마다 1크레딧으로 올리지 않습니다.</p></section>
        </>}
        <dialog ref={dialog} onCancel={()=>setReplay(null)} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/40" aria-labelledby="credit-result-title">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 id="credit-result-title" className="text-xl font-bold">{replay?.title} 결과</h2><Button variant="ghost" onClick={()=>setReplay(null)}>닫기</Button></div>
            <p className="mb-4 text-sm text-muted-foreground">이미 생성한 결과를 다시 보는 기능입니다. 추가 크레딧을 사용하거나 현재 작업에 자동 적용하지 않습니다.</p>
            <textarea aria-label="저장된 AI 결과" readOnly value={replay?.text||""} rows={14} className="w-full rounded-xl border bg-background p-4 text-sm leading-7"/>
        </dialog>
    </main>;
}
