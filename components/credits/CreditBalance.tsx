"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CREDIT_CHANGED_EVENT, creditRequest } from "@/lib/credit-client";
import { formatCredits, type Wallet } from "@/lib/credits";

export function useCreditSummary() {
    const [wallet,setWallet]=useState<Wallet|null>(null),[error,setError]=useState("");
    const sequence=useRef(0);
    const refresh=useCallback(async()=>{
        const version=++sequence.current;
        try {
            const data=await creditRequest("/api/credits?summary=1");
            if(sequence.current===version){setWallet(data.wallet);setError("");}
        }catch(e){if(sequence.current===version){setWallet(null);setError(e instanceof Error?e.message:"잔액 확인 실패");}}
    },[]);
    useEffect(()=>{
        let timer:ReturnType<typeof setTimeout>;
        const update=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),250);};
        update();
        const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{
            if(event==="SIGNED_OUT"||event==="SIGNED_IN"){sequence.current++;setWallet(null);setError("");update();}
        });
        window.addEventListener(CREDIT_CHANGED_EVENT,update);window.addEventListener("focus",update);
        const invalidate=()=>{sequence.current++;};
        return()=>{invalidate();clearTimeout(timer);subscription.unsubscribe();window.removeEventListener(CREDIT_CHANGED_EVENT,update);window.removeEventListener("focus",update);};
    },[refresh]);
    return {wallet,error,refresh};
}
export function CreditBalance() {
    const {wallet,error}=useCreditSummary();
    return <Link href="/app/credits" className="whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary" title={error||"크레딧 잔액과 사용 내역"}>
        {wallet?`${formatCredits(wallet.available_units)} C`:error?"잔액 확인 필요":"잔액 확인 중"}
    </Link>;
}
