"use client";
import { Archive, ArrowLeft, FilePlus2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
type Props = { draftStatus?: string; editing: boolean; title: string; onTitle: (value: string) => void; busy: boolean; saving?: boolean; dirty: boolean; message: string; error: string; onSave: () => void; onSaveNew: () => void; onReset: () => void; onBack: () => void };
export function WorkLogSessionBar(p: Props) {
    return <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" aria-label="작업로그 저장">
        <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1"><label htmlFor="work-log-title" className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><Archive className="size-4" />{p.editing ? "저장본 수정 중" : `새 작업 · ${p.draftStatus || "임시 작업 자동 저장"}`}{p.editing && p.dirty && <span className="text-amber-700 dark:text-amber-400">변경사항 있음</span>}</label><input id="work-log-title" value={p.title} onChange={e => p.onTitle(e.target.value)} maxLength={120} disabled={p.busy} placeholder="작업 이름을 입력하세요" className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-offset-2 focus:outline-blue-500 dark:border-slate-700" /></div>
            <div className="flex flex-wrap gap-2"><Button onClick={p.onSave} disabled={p.busy || !p.title.trim()} className="h-10 gap-2 rounded-lg">{p.busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{p.editing ? "수정 내용 저장" : "작업로그에 저장"}</Button>
                {p.editing ? <Button variant="outline" onClick={p.onBack} disabled={p.saving} className="h-10 gap-2 rounded-lg"><ArrowLeft className="size-4" />목록으로</Button> : <><Button variant="outline" onClick={p.onSaveNew} disabled={p.busy || !p.title.trim()} className="h-10 gap-2 rounded-lg"><FilePlus2 className="size-4" />저장하고 새 작업</Button><Button variant="ghost" onClick={p.onReset} disabled={p.busy} className="h-10 rounded-lg text-slate-500">입력 비우기</Button></>}
            </div>
        </div>
        {p.message && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{p.message}</p>}
        {p.error && <p role="alert" className="mt-3 text-sm leading-6 text-red-700 dark:text-red-400">{p.error}</p>}
    </section>;
}
