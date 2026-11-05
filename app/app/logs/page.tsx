"use client";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Download, Edit3, FilePlus2, Loader2, LockKeyhole, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkLogCard } from "@/components/workspace/WorkLogCard";
import { supabase } from "@/lib/supabase";
import { getSavedWorkLog, listSavedWorkLogs, workLogRequest } from "@/lib/work-log-client";
import { normalizeWorkData, WORK_CATEGORIES, workLogCsv } from "@/lib/work-logs";
import type { SavedWorkLog, WorkLogSummary } from "@/lib/work-logs";
const dateLabel = (v: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(v));

function WorkLogs() {
    const router = useRouter(), params = useSearchParams();
    const [userId, setUserId] = useState<string | null>(null);
    const [logs, setLogs] = useState<WorkLogSummary[]>([]), [total, setTotal] = useState(0);
    const [state, setState] = useState("editable"), [category, setCategory] = useState("all");
    const [search, setSearch] = useState(""), [query, setQuery] = useState("");
    const [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
    const [error, setError] = useState(""), [message, setMessage] = useState("");
    const [selected, setSelected] = useState<SavedWorkLog | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<WorkLogSummary | null>(null);
    const preview = useRef<HTMLDialogElement>(null), archiveDialog = useRef<HTMLDialogElement>(null);
    const viewId = params.get("view");
    useEffect(() => {
        const apply = (id?: string) => { if (id) setUserId(id); else { setUserId(null); router.replace("/login"); } };
        void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user.id));
        return () => subscription.unsubscribe();
    }, [router]);
    useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 250); return () => clearTimeout(timer); }, [search]);
    useEffect(() => {
        if (!userId) return;
        const abort = new AbortController(); setLoading(true); setError(""); if (!page) setLogs([]);
        listSavedWorkLogs(new URLSearchParams({ state, category, q: query, page: String(page) }), abort.signal).then(data => {
            if (!abort.signal.aborted) { setLogs(prev => page ? [...prev, ...data.logs.filter(r => !prev.some(p => p.id === r.id))] : data.logs); setTotal(data.total); }
        }).catch(e => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
        return () => abort.abort();
    }, [userId, state, category, query, page, refresh]);
    useEffect(() => {
        if (!userId || !viewId) return;
        const abort = new AbortController();
        getSavedWorkLog(viewId, abort.signal).then(log => { if (!abort.signal.aborted) { setSelected(log); if (log.archived_at) { setState("archived"); setPage(0); } } }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
        return () => abort.abort();
    }, [userId, viewId]);
    useEffect(() => { if (selected && !preview.current?.open) preview.current?.showModal(); if (!selected) preview.current?.close(); }, [selected]);
    useEffect(() => { if (archiveTarget && !archiveDialog.current?.open) archiveDialog.current?.showModal(); if (!archiveTarget) archiveDialog.current?.close(); }, [archiveTarget]);
    const openPreview = async (id: string) => { setBusy(true); setError(""); try { const log = await getSavedWorkLog(id); setSelected(log); if (log.archived_at) { setState("archived"); setPage(0); } } catch (e) { setError(e instanceof Error ? e.message : "저장본을 읽지 못했습니다."); } finally { setBusy(false); } };
    const exportLog = async (id: string) => {
        setBusy(true); setError("");
        try {
            const log = await getSavedWorkLog(id), data = normalizeWorkData(log.data, log.category);
            const url = URL.createObjectURL(new Blob([workLogCsv({ ...log, data })], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a"); a.href = url; a.download = `${log.title.replace(/[\\/:*?"<>|]/g, "-")}.csv`; a.click(); URL.revokeObjectURL(url);
        } catch (e) { setError(e instanceof Error ? e.message : "내보내기에 실패했습니다."); } finally { setBusy(false); }
    };
    const archive = async () => {
        if (!archiveTarget || busy) return;
        setBusy(true); setError("");
        try {
            await workLogRequest<SavedWorkLog>(`/api/work-logs/${archiveTarget.id}`, { method: "PATCH", body: JSON.stringify({ action: "archive", revision: archiveTarget.revision }) });
            setMessage(`‘${archiveTarget.title}’을 보관함으로 옮겼습니다. 보관본은 수정할 수 없습니다.`); setPage(0); setRefresh(v => v + 1);
        } catch (e) { setError(e instanceof Error ? e.message : "보관하지 못했습니다."); setRefresh(v => v + 1); }
        finally { setArchiveTarget(null); setBusy(false); }
    };
    const closePreview = () => { setSelected(null); if (viewId) router.replace("/app/logs"); };
    const dialogClass = "fixed inset-0 m-auto max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
    return <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 md:px-10 dark:bg-slate-950"><div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400">선생님의 작성 기록</p><h1 className="text-3xl font-bold tracking-tight">작업로그</h1><p className="mt-3 text-sm leading-6 text-slate-500">저장본을 다시 열어 수정하거나, 완성된 기록을 보관하세요.</p></div><Button onClick={() => router.push("/app")} className="h-11 gap-2 rounded-xl"><FilePlus2 className="size-4" />작성 화면으로</Button></header>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-label="저장된 작업로그">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 md:px-6 dark:border-slate-700"><div className="flex gap-2" aria-label="저장 상태">{[{ id: "editable", label: "수정 가능한 기록" }, { id: "archived", label: "보관함" }].map(tab => <button key={tab.id} aria-pressed={state === tab.id} onClick={() => { setState(tab.id); setPage(0); }} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${state === tab.id ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "text-slate-500"}`}>{tab.id === "archived" && <LockKeyhole className="size-4" />}{tab.label}</button>)}</div><span className="text-xs text-slate-500">{total}개 기록</span></div>
            <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4 md:px-6 dark:border-slate-800"><label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700"><Search className="size-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="작업 이름 검색" aria-label="작업 이름 검색" className="h-10 w-full bg-transparent text-sm outline-none" /></label><select aria-label="영역 필터" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} className="rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="all">모든 영역</option>{Object.entries(WORK_CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
            {error && <div role="alert" className="m-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}<button onClick={() => setRefresh(v => v + 1)} className="ml-3 underline">다시 불러오기</button></div>}{message && <p role="status" className="m-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
            {state === "archived" && <p className="mx-6 mt-4 text-xs leading-6 text-slate-500">보관본은 열람과 내보내기만 가능합니다. 제목 변경, AI 재생성, 내용 수정, 보관 해제와 삭제는 할 수 없습니다.</p>}
            {loading && !page ? <div role="status" className="flex justify-center gap-3 p-16 text-sm text-slate-500"><Loader2 className="size-5 animate-spin" />기록을 불러오고 있습니다.</div> : !logs.length && !error ? <div className="px-6 py-20 text-center"><Archive className="mx-auto mb-4 size-9 text-slate-300" /><h2 className="font-semibold">{query || category !== "all" ? "조건에 맞는 기록이 없습니다." : state === "archived" ? "아직 보관한 기록이 없습니다." : "아직 저장된 작업로그가 없습니다."}</h2><p className="mt-3 text-sm text-slate-500">{state === "editable" ? "작성 화면에서 ‘작업로그에 저장’을 누르면 이곳에 쌓입니다." : "수정 가능한 기록에서 보관하기를 이용하세요."}</p></div> : <div className="grid grid-cols-1 gap-4 bg-slate-50/70 p-4 dark:bg-slate-950/40 md:grid-cols-2 md:gap-5 md:p-6 xl:grid-cols-3">{logs.map(log => (
                <WorkLogCard key={log.id} log={log} busy={busy} dateLabel={dateLabel(log.updated_at)}
                    onPreview={() => void openPreview(log.id)}
                    onEdit={() => router.push(`/app?log=${log.id}`)}
                    onExport={() => void exportLog(log.id)}
                    onArchive={() => setArchiveTarget(log)} />
            ))}</div>}
            {logs.length < total && <div className="border-t border-slate-100 p-5 text-center"><Button variant="outline" onClick={() => setPage(v => v + 1)} disabled={loading}>{loading ? "불러오는 중" : "기록 더 보기"}</Button></div>}
        </section></div>
        <dialog ref={preview} onCancel={e => { e.preventDefault(); closePreview(); }} onClose={() => setSelected(null)} aria-labelledby="log-preview-title" className={`${dialogClass} max-h-[90dvh] w-[min(1000px,calc(100vw-24px))]`}>
            {selected && <div className="flex max-h-[90dvh] flex-col"><header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800"><div className="min-w-0"><p className="mb-2 text-xs text-slate-500">{WORK_CATEGORIES[selected.category]} · {selected.archived_at ? "보관본 · 읽기 전용" : "수정 가능한 저장본"}</p><h2 id="log-preview-title" className="break-words text-xl font-bold">{selected.title}</h2><p className="mt-2 text-xs text-slate-500">{dateLabel(selected.updated_at)} · 학생 {selected.student_count}명</p></div><button aria-label="기록 보기 닫기" onClick={closePreview} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-5" /></button></header><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{(selected.data.students || []).map(student => <article key={student.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex flex-wrap gap-3"><h3 className="text-sm font-bold">{student.id}번 학생</h3><span className="text-xs text-slate-500">{(selected.category === "creative" ? student.participatedEvents || [] : student.selectedKeywords || []).join(" · ")}</span></div><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{student.aiResult || "작성된 결과가 없습니다."}</p></article>)}</div><footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800"><Button variant="outline" onClick={() => void exportLog(selected.id)} disabled={busy || !selected.completed_count} className="gap-2 rounded-lg"><Download className="size-4" />CSV 내보내기</Button>{!selected.archived_at && selected.category !== "docs" && <Button onClick={() => router.push(`/app?log=${selected.id}`)} className="gap-2 rounded-lg"><Edit3 className="size-4" />수정하기</Button>}<Button variant="ghost" onClick={closePreview} className="rounded-lg">닫기</Button></footer></div>}
        </dialog>
        <dialog ref={archiveDialog} onCancel={e => { if (busy) e.preventDefault(); else setArchiveTarget(null); }} onClose={() => setArchiveTarget(null)} aria-labelledby="archive-title" className={`${dialogClass} w-[min(460px,calc(100vw-24px))]`}><div className="p-6"><LockKeyhole className="mb-4 size-7 text-slate-500" /><h2 id="archive-title" className="text-xl font-bold">이 기록을 보관하시겠습니까?</h2><p className="my-4 break-words text-sm font-semibold">{archiveTarget?.title}</p><p className="text-sm leading-7 text-slate-500">보관한 뒤에는 열람과 내보내기만 가능합니다. 내용 수정, 특정 학생 AI 재생성, 삭제, 보관 해제는 불가능합니다.</p><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setArchiveTarget(null)} disabled={busy} className="rounded-lg">취소</Button><Button onClick={() => void archive()} disabled={busy} className="gap-2 rounded-lg">{busy ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}수정 불가 상태로 보관</Button></div></div></dialog>
    </main>;
}
export default function Page() { return <Suspense fallback={<main className="p-12 pt-32">작업로그를 불러오는 중입니다.</main>}><WorkLogs /></Suspense>; }
