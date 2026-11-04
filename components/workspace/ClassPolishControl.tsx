"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, PenLine, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { applyPolishProposals, editSegments, latestPolishBatch, parsePolishRequest, toPolishRecords, undoPolishBatch, validatePolishCandidates } from "@/lib/class-polish";
import type { PolishCategory, PolishProposal } from "@/lib/class-polish";
import type { Student } from "@/types";

type Props = {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    category: PolishCategory;
    workLogId?: string;
    disabled?: boolean;
    onPersist: (students: Student[]) => Promise<boolean>;
};

const subscribe = () => () => {};

function DiffText({ proposal, after }: { proposal: PolishProposal; after: boolean }) {
    return <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
        {editSegments(proposal.before, proposal.edits, after).map((segment, i) => segment.changed
            ? <mark key={i} className={after ? "rounded bg-emerald-100 px-0.5 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100" : "rounded bg-amber-100 px-0.5 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"}>{segment.text}</mark>
            : <React.Fragment key={i}>{segment.text}</React.Fragment>)}
    </p>;
}

export function ClassPolishControl({ students, setStudents, category, workLogId, disabled = false, onPersist }: Props) {
    const mounted = useSyncExternalStore(subscribe, () => true, () => false);
    const dialog = useRef<HTMLDialogElement>(null);
    const controller = useRef<AbortController | null>(null);
    const [open, setOpen] = useState(false);
    const [stage, setStage] = useState<"idle" | "reviewing" | "ready" | "saving">("idle");
    const [proposals, setProposals] = useState<PolishProposal[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [batchId, setBatchId] = useState("");
    const [reviewedCount, setReviewedCount] = useState(0);
    const [discarded, setDiscarded] = useState(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [saveFailed, setSaveFailed] = useState(false);
    const records = toPolishRecords(students, category);
    const busy = disabled || students.some(s => s.isGenerating);
    const pending = stage === "reviewing" || stage === "saving";
    const undo = latestPolishBatch(students);
    const isCurrent = (proposal: PolishProposal) => students.some(s => s.id === proposal.studentId && !s.isGenerating && s.aiResult === proposal.before);
    const applicable = proposals.filter(p => selected.has(p.studentId) && isCurrent(p));

    useEffect(() => {
        if (!mounted || !dialog.current) return;
        if (open && !dialog.current.open) dialog.current.showModal();
        if (!open && dialog.current.open) dialog.current.close();
    }, [open, mounted]);

    useEffect(() => () => controller.current?.abort(), []);

    const close = () => {
        if (stage === "saving") return;
        controller.current?.abort();
        controller.current = null;
        if (stage === "reviewing") setStage("idle");
        setOpen(false);
    };

    const review = async () => {
        if (busy || pending) return;
        setError(""); setMessage(""); setProposals([]); setSelected(new Set());
        let input;
        try { input = parsePolishRequest({ category, records }); }
        catch (e) { setError(e instanceof Error ? e.message : "입력 내용을 확인해주세요."); return; }
        const abort = new AbortController();
        controller.current = abort;
        const timer = setTimeout(() => abort.abort(), 95000);
        setStage("reviewing");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("다시 로그인한 뒤 이용해주세요.");
            if (abort.signal.aborted) return;
            const response = await fetch("/api/polish", {
                method: "POST", signal: abort.signal,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ ...input, workLogId }),
            });
            const data = await response.json().catch(() => { throw new Error("윤문 결과를 읽지 못했습니다. 잠시 후 다시 시도해주세요."); });
            if (!response.ok) throw new Error(data.error || "윤문 검토에 실패했습니다.");
            if (!Array.isArray(data.proposals) || typeof data.batchId !== "string") throw new Error("윤문 결과를 읽을 수 없습니다.");
            const checked = validatePolishCandidates(records, { changes: data.proposals });
            if (controller.current !== abort || abort.signal.aborted) return;
            setProposals(checked.proposals);
            setSelected(new Set(checked.proposals.map(p => p.studentId)));
            setBatchId(data.batchId);
            setReviewedCount(records.length);
            setDiscarded((Number.isInteger(data.discarded) ? data.discarded : 0) + checked.discarded);
            setStage("ready");
        } catch (e) {
            if (controller.current === abort) {
                setError(abort.signal.aborted ? "검토 시간이 초과되었습니다. 원문은 변경되지 않았습니다." : e instanceof Error ? e.message : "윤문 검토에 실패했습니다.");
                setStage("idle");
            }
        } finally {
            clearTimeout(timer);
            if (controller.current === abort) controller.current = null;
        }
    };

    const persist = async (next: Student[], success: string) => {
        setStage("saving"); setError("");
        try {
            const saved = await onPersist(next);
            setSaveFailed(!saved);
            if (!saved) setError("화면에는 적용했지만 저장하지 못했습니다. 화면을 닫기 전에 저장을 다시 시도해주세요.");
            else setMessage(success);
        } catch {
            setSaveFailed(true);
            setError("저장에 실패했습니다. 화면을 닫기 전에 저장을 다시 시도해주세요.");
        } finally { setStage("idle"); }
    };

    const apply = async () => {
        if (busy || pending || !applicable.length) return;
        const result = applyPolishProposals(students, applicable, batchId, new Date().toISOString());
        setStudents(result.students);
        setProposals([]); setSelected(new Set());
        await persist(result.students, `${result.applied.length}명의 윤문과 원문을 저장했습니다. 최근 윤문 되돌리기로 복구할 수 있습니다.`);
    };

    const restore = async () => {
        if (!undo || !undo.count || busy || pending) return;
        setOpen(true);
        const result = undoPolishBatch(students, undo.batchId);
        setStudents(result.students);
        setProposals([]); setSelected(new Set());
        await persist(result.students, `${result.restored.length}명을 윤문 전 원문으로 되돌려 저장했습니다.${result.skipped.length ? ` 이후 수정된 ${result.skipped.length}명은 유지했습니다.` : ""}`);
    };

    return <>
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(true)} disabled={busy || records.length < 2 || pending}
                title={records.length < 2 ? "완성된 학생 기록이 2명 이상 필요합니다." : "완성된 학급 기록 전체의 반복 표현을 검토합니다."}
                className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <PenLine className="size-4" />학급 표현 다듬기
            </Button>
            {undo && <Button variant="ghost" onClick={restore} disabled={busy || pending || !undo.count} title={undo.skipped ? "윤문 후 직접 수정한 기록은 유지합니다." : "최근 적용한 윤문을 원문으로 되돌립니다."}
                className="h-10 gap-1.5 rounded-xl px-3 text-xs text-slate-500 dark:text-slate-400"><RotateCcw className="size-3.5" />최근 윤문 되돌리기 ({undo.count}명)</Button>}
            {saveFailed && <button onClick={() => { setOpen(true); void persist(students, "현재 기록과 윤문 원문을 저장했습니다."); }} disabled={pending} className="text-xs font-semibold text-red-600 underline">저장 다시 시도</button>}
        </div>
        {mounted && createPortal(<dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} onClose={() => setOpen(false)} aria-labelledby="class-polish-title"
            className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1100px,calc(100vw-24px))] max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <div className="flex max-h-[92dvh] flex-col">
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 md:px-7 dark:border-slate-800">
                    <div><h2 id="class-polish-title" className="text-xl font-bold tracking-tight">학급 표현 다듬기</h2><p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">완성된 {records.length}명의 기록을 함께 읽고 반복이 심한 표현만 제안합니다.</p></div>
                    <button onClick={close} disabled={stage === "saving"} aria-label="윤문 창 닫기" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><X className="size-5" /></button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-7">
                    <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">활동 내용과 평가 수준은 유지하고, 단어와 문장 표현만 다듬습니다. 원문과 비교한 뒤 필요한 학생만 선택해 적용하세요.</div>
                    {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
                    {message && <p role="status" className="mb-5 flex gap-2 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Check className="mt-0.5 size-4 shrink-0" />{message}</p>}
                    {stage === "reviewing" && <div role="status" className="flex flex-col items-center gap-4 py-12 text-center"><Loader2 className="size-7 animate-spin text-primary" /><p className="text-sm leading-7">학급 전체의 반복 표현과 수정 전후의 의미를 확인하고 있습니다.<br />원문은 아직 변경되지 않았습니다.</p></div>}
                    {stage === "ready" && <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-slate-600 dark:text-slate-300">{reviewedCount}명 검토 · {proposals.length}명 수정 제안{discarded > 0 ? ` · 의미나 수정 범위를 확인하기 어려운 ${discarded}건 제외` : ""}</p>{proposals.length > 0 && <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-blue-600" checked={proposals.filter(isCurrent).length > 0 && proposals.filter(isCurrent).every(p => selected.has(p.studentId))} onChange={e => setSelected(e.target.checked ? new Set(proposals.filter(isCurrent).map(p => p.studentId)) : new Set())} />제안 전체 선택</label>}</div>}
                    {stage === "ready" && !proposals.length && <p className="py-10 text-center text-sm leading-7 text-slate-500">{discarded ? "안전하게 적용할 수 있는 수정 제안이 없습니다. 원문을 유지합니다." : "바꿀 필요가 있는 반복 표현을 찾지 못했습니다. 원문을 유지합니다."}</p>}
                    <div className="space-y-4">{proposals.map(proposal => {
                        const current = isCurrent(proposal);
                        return <section key={proposal.studentId} className={`overflow-hidden rounded-xl border ${current ? "border-slate-200 dark:border-slate-700" : "border-amber-200 opacity-65 dark:border-amber-800"}`}>
                            <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-900"><label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold"><input type="checkbox" aria-label={`${proposal.studentId}번 윤문 적용 선택`} disabled={!current || pending} checked={selected.has(proposal.studentId) && current} className="size-4 accent-blue-600" onChange={e => setSelected(prev => { const next = new Set(prev); if (e.target.checked) next.add(proposal.studentId); else next.delete(proposal.studentId); return next; })} />{proposal.studentId}번 학생</label><span className="text-xs leading-5 text-slate-500 dark:text-slate-400">{current ? proposal.reason : "검토 후 원문이 바뀌었습니다. 다시 검토해주세요."}</span></div>
                            <div className="grid md:grid-cols-2"><div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r dark:border-slate-800"><h3 className="mb-2 text-xs font-semibold text-slate-500">변경 전 · {proposal.before.length}자</h3><DiffText proposal={proposal} after={false} /></div><div className="p-4"><h3 className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">윤문 제안 · {proposal.after.length}자</h3><DiffText proposal={proposal} after /></div></div>
                        </section>;
                    })}</div>
                </div>
                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 md:px-7 dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-xs text-slate-500">선택 적용 전까지 원문은 바뀌지 않습니다.</span>
                    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={close} disabled={stage === "saving"} className="rounded-lg">{stage === "reviewing" ? "검토 취소" : "닫기"}</Button>
                        {saveFailed ? <Button disabled={pending} onClick={() => void persist(students, "현재 기록과 윤문 원문을 저장했습니다.")} className="rounded-lg">저장 다시 시도</Button>
                            : stage === "ready" && proposals.length ? <><Button variant="outline" disabled={pending || busy} onClick={review} className="rounded-lg">다시 검토</Button><Button onClick={apply} disabled={!applicable.length || pending || busy} className="gap-2 rounded-lg"><Check className="size-4" />선택 {applicable.length}명 적용</Button></>
                                : <Button onClick={review} disabled={pending || busy || records.length < 2} className="gap-2 rounded-lg">{pending ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}{stage === "saving" ? "저장 중" : stage === "reviewing" ? "검토 중" : "학급 전체 검토"}</Button>}
                    </div>
                </footer>
            </div>
        </dialog>, document.body)}
    </>;
}
