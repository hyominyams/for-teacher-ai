"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { creditRequest, CREDIT_CHANGED_EVENT } from "@/lib/credit-client";
import { CREDIT_OPERATIONS, formatCredits, type CreditOperation } from "@/lib/credits";

type Member={user_id:string;email:string;full_name:string;balance_units:number;reserved_units:number;verified:boolean;is_admin:boolean};
type Pending={user_id:string;request_id:string;operation:CreditOperation;reserved_units:number;actual_units:number;created_at:string};
type Audit={id:string;user_id:string;kind:string;delta_units:number;reason:string;created_at:string};
type AdminData={members:Member[];pending:Pending[];ledger:Audit[]};
export default function AdminCredits(){
    const [data,setData]=useState<AdminData|null>(null),[query,setQuery]=useState(""),[offset,setOffset]=useState(0),[selected,setSelected]=useState<Member|null>(null);
    const [amount,setAmount]=useState("30"),[direction,setDirection]=useState("grant"),[reason,setReason]=useState("");
    const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
    const sequence=useRef(0),attempt=useRef<{fingerprint:string;id:string}|null>(null);
    const load=useCallback(async(q:string,page:number)=>{
        const current=++sequence.current;setLoading(true);
        try{const result=await creditRequest(`/api/admin/credits?q=${encodeURIComponent(q)}&offset=${page}`);if(current===sequence.current){setData(result);setOffset(page);setError("");}}
        catch(e){if(current===sequence.current){setData(null);setError(e instanceof Error?e.message:"관리자 정보를 불러오지 못했습니다.");}}
        finally{if(current===sequence.current)setLoading(false);}
    },[]);
    useEffect(()=>{
        void load("",0);
        const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"||event==="SIGNED_IN"){sequence.current++;setData(null);setSelected(null);window.setTimeout(()=>void load("",0),0);}});
        const invalidate=()=>{sequence.current++;};return()=>{invalidate();subscription.unsubscribe();};
    },[load]);
    async function adjust(event:React.FormEvent){
        event.preventDefault();if(!selected||busy)return;
        const value=Number(amount);if(!Number.isFinite(value)||value<=0||value>100000){setError("0보다 크고 100,000 이하인 크레딧을 입력해주세요.");return;}
        const body={action:"adjust",userId:selected.user_id,credits:direction==="grant"?value:-value,reason:reason.trim()};
        const fingerprint=JSON.stringify(body);if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()};
        setBusy(true);setError("");setMessage("");
        try{await creditRequest("/api/admin/credits",{method:"POST",body:JSON.stringify({...body,requestId:attempt.current.id})});attempt.current=null;setMessage(`${selected.email} 계정에 ${value}크레딧을 ${direction==="grant"?"지급":"회수"}했습니다.`);setSelected(null);setReason("");window.dispatchEvent(new Event(CREDIT_CHANGED_EVENT));await load(query,offset);}
        catch(e){setError(e instanceof Error?e.message:"처리하지 못했습니다.");}
        finally{setBusy(false);}
    }
    async function release(job:Pending){
        const note=window.prompt("사용 여부를 확인한 후 예약을 해제합니다. 사유를 입력해주세요. 이미 발생한 API 비용은 사이트에서 부담합니다.");
        if(!note?.trim())return;setBusy(true);setError("");
        try{await creditRequest("/api/admin/credits",{method:"POST",body:JSON.stringify({action:"release",userId:job.user_id,requestId:job.request_id,reason:note.trim()})});setMessage("확인 중이던 예약을 해제했습니다.");window.dispatchEvent(new Event(CREDIT_CHANGED_EVENT));await load(query,offset);}
        catch(e){setError(e instanceof Error?e.message:"예약을 해제하지 못했습니다.");}finally{setBusy(false);}
    }
    return <main className="mx-auto min-h-[80vh] max-w-6xl px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <Link href="/app/credits" className="text-sm text-primary">← 내 크레딧</Link><h1 className="mt-7 text-3xl font-bold tracking-tight">크레딧 관리</h1><p className="mb-8 mt-3 text-sm text-muted-foreground">100크레딧 = API 원가 $1 · 기본 지급 30크레딧 · 관리자 권한은 서버에서 확인합니다.</p>
        {error&&<p role="alert" className="mb-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}{message&&<p role="status" className="mb-5 rounded-xl bg-primary/10 p-4 text-sm">{message}</p>}
        {loading&&!data&&<p role="status">회원 정보를 확인 중입니다.</p>}
        {data&&<>
            <form onSubmit={e=>{e.preventDefault();void load(query,0);}} className="mb-5 flex gap-2"><Input aria-label="회원 이메일 또는 이름 검색" placeholder="이메일 또는 이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/><Button type="submit" disabled={loading||busy}>검색</Button></form>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section className="overflow-hidden rounded-2xl border"><h2 className="border-b bg-muted/40 p-4 text-sm font-bold">회원 선택</h2>{!data.members.length?<p className="p-6 text-sm text-muted-foreground">검색 결과가 없습니다.</p>:data.members.map(member=><button key={member.user_id} type="button" disabled={busy||!member.verified} onClick={()=>{setSelected(member);setError("");setMessage("");}} className={`flex w-full items-center justify-between gap-3 border-b p-4 text-left last:border-0 hover:bg-primary/5 disabled:opacity-50 ${selected?.user_id===member.user_id?"bg-primary/10":""}`}><span className="min-w-0"><span className="block truncate font-medium">{member.full_name||"이름 없음"}{member.is_admin&&<span className="ml-2 text-xs text-primary">관리자</span>}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{member.email}{!member.verified&&" · 이메일 미인증"}</span></span><span className="shrink-0 text-right text-sm font-semibold tabular-nums">{formatCredits(Number(member.balance_units)-Number(member.reserved_units))} C<span className="block text-xs font-normal text-muted-foreground">예약 {formatCredits(member.reserved_units)} C</span></span></button>)}<div className="flex items-center justify-between border-t p-3"><Button variant="ghost" disabled={offset===0||loading||busy} onClick={()=>void load(query,Math.max(0,offset-50))}>이전</Button><span className="text-xs text-muted-foreground">{offset+1}–{offset+data.members.length}</span><Button variant="ghost" disabled={data.members.length<50||loading||busy} onClick={()=>void load(query,offset+50)}>다음</Button></div></section>
                <form onSubmit={adjust} className="space-y-4 rounded-2xl border bg-card p-5"><h2 className="text-lg font-bold">지급·회수</h2><p className="break-all text-sm text-muted-foreground">{selected?selected.email:"왼쪽 목록에서 회원을 선택해주세요."}</p><label className="block text-sm font-medium">작업<select aria-label="지급 또는 회수" value={direction} onChange={e=>setDirection(e.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-background px-3"><option value="grant">크레딧 지급</option><option value="revoke">미사용 크레딧 회수</option></select></label><label className="block text-sm font-medium">크레딧<Input className="mt-2" type="number" min="0.001" max="100000" step="0.001" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label className="block text-sm font-medium">사유<Input className="mt-2" value={reason} minLength={2} maxLength={200} placeholder="예: 학기말 추가 지원" onChange={e=>setReason(e.target.value)} required/></label><p className="text-xs leading-6 text-muted-foreground">회수는 사용 가능한 잔액 범위에서만 가능합니다. 지급·회수 사유와 담당자는 모두 기록합니다.</p><Button className="w-full" type="submit" disabled={!selected||busy||reason.trim().length<2}>{busy?"처리 중…":direction==="grant"?"크레딧 지급":"크레딧 회수"}</Button></form>
            </div>
            <section className="mt-9"><h2 className="mb-4 text-xl font-bold">사용량 확인이 필요한 요청</h2><div className="divide-y rounded-2xl border">{!data.pending.length?<p className="p-5 text-sm text-muted-foreground">확인이 필요한 요청이 없습니다.</p>:data.pending.map(job=><div key={job.request_id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-sm font-semibold">{CREDIT_OPERATIONS[job.operation]} · {formatCredits(job.reserved_units)} C 예약</p><p className="mt-1 break-all text-xs text-muted-foreground">회원 {job.user_id} · {new Date(job.created_at).toLocaleString("ko-KR")}</p><p className="mt-1 text-xs text-muted-foreground">확인된 API 원가 ${(Number(job.actual_units)/1_000_000_000).toFixed(8)}</p></div><Button variant="outline" disabled={busy} onClick={()=>void release(job)}>확인 후 예약 해제</Button></div>)}</div></section>
            <section className="mt-9"><h2 className="mb-4 text-xl font-bold">최근 관리자 처리 내역</h2><div className="divide-y rounded-2xl border">{!data.ledger.length?<p className="p-5 text-sm text-muted-foreground">아직 처리 내역이 없습니다.</p>:data.ledger.map(row=><div key={row.id} className="p-4 text-sm"><p>{row.delta_units>0?"+":""}{formatCredits(row.delta_units)} C · {row.reason}</p><p className="mt-1 break-all text-xs text-muted-foreground">회원 {row.user_id} · {new Date(row.created_at).toLocaleString("ko-KR")}</p></div>)}</div></section>
        </>}
    </main>;
}
