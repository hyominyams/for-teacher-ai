"use client";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, Check, Circle, Ellipsis, FilePlus2, Loader2, PencilLine, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkspaceButton, workspaceCardClassName, workspaceControlClassName } from "./WorkspaceControls";
type Props = { draftStatus?: string; editing: boolean; title: string; onTitle: (value: string) => void; busy: boolean; saving?: boolean; dirty: boolean; message: string; error: string; onSave: () => void; onSaveNew: () => void; onReset: () => void; onBack: () => void; settings?: ReactNode };
export function WorkLogSessionBar(p: Props) {
    const failed = !p.editing && p.draftStatus?.includes("실패");
    const savingDraft = !p.editing && p.draftStatus?.includes("저장 중");
    const savedDraft = !p.editing && p.draftStatus?.includes("완료");
    const StatusIcon = failed ? AlertCircle : savingDraft ? Loader2 : savedDraft || (p.editing && !p.dirty) ? Check : Circle;
    const status = p.editing ? (p.dirty ? "저장하지 않은 변경사항" : "저장된 내용과 같음") : failed ? p.draftStatus : savingDraft ? "임시 저장 중…" : savedDraft ? "임시 저장됨" : "임시 작업 자동 저장";

    return <section className={cn(workspaceCardClassName, "mb-4 p-4")} aria-label="작업로그 저장">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <label htmlFor="work-log-title" className="text-xs font-semibold leading-4 text-slate-800 dark:text-slate-200">작업 이름</label>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-4", p.editing ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300")}>{p.editing ? "저장본 수정" : "새 작업"}</span>
                    <span role={failed ? "alert" : "status"} className={cn("flex min-w-0 items-center gap-1 text-xs leading-4", failed ? "text-red-700 dark:text-red-400" : p.editing && p.dirty ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400")}>
                        <StatusIcon aria-hidden="true" className={cn("size-3.5 shrink-0", savingDraft && "animate-spin")} />{status}
                    </span>
                </div>
                <div className="relative">
                    <PencilLine aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sky-600 dark:text-sky-400" />
                    <input id="work-log-title" aria-describedby="work-log-title-hint" value={p.title} onChange={e => p.onTitle(e.target.value)} maxLength={120} disabled={p.busy} placeholder="예: 6학년 2반 · 2학기" title="반·학기 이름으로 바꿔보세요" className={cn(workspaceControlClassName, "w-full border border-sky-200 bg-sky-50/40 pl-10 pr-3.5 font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-sky-300 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-50 dark:border-sky-900 dark:bg-sky-950/20 dark:text-slate-100 dark:hover:border-sky-700 dark:focus-visible:bg-slate-900")} />
                    <span id="work-log-title-hint" className="sr-only">반·학기 이름으로 바꿔보세요</span>
                </div>
            </div>
            {p.settings}
            <div className="flex items-center gap-2">
                <WorkspaceButton onClick={p.onSave} disabled={p.busy || !p.title.trim()} className="flex-1 sm:flex-none">{p.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}{p.editing ? "수정 내용 저장" : "작업로그 저장"}</WorkspaceButton>
                {p.editing ? <WorkspaceButton variant="outline" onClick={p.onBack} disabled={p.saving} className="border-slate-200 dark:border-slate-700"><ArrowLeft aria-hidden="true" />목록으로</WorkspaceButton> : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <WorkspaceButton variant="outline" aria-label="작업로그 더보기" title="저장 후 새 작업 · 입력 비우기" className="w-11 border-slate-200 px-0 dark:border-slate-700"><Ellipsis aria-hidden="true" /></WorkspaceButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
                            <DropdownMenuItem onSelect={p.onSaveNew} disabled={p.busy || !p.title.trim()} className="items-start rounded-lg px-2.5 py-2">
                                <FilePlus2 aria-hidden="true" className="mt-0.5" />
                                <span><span className="block font-semibold">저장 후 새 작업</span><span className="block text-xs text-muted-foreground">현재 작업을 작업로그에 저장한 뒤 입력을 비웁니다</span></span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={p.onReset} disabled={p.busy} className="items-start rounded-lg px-2.5 py-2">
                                <RotateCcw aria-hidden="true" className="mt-0.5" />
                                <span><span className="block font-semibold">입력 비우기</span><span className="block text-xs text-muted-foreground">작업로그에 저장된 기록은 바뀌지 않습니다</span></span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
        {p.message && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{p.message}</p>}
        {p.error && <p role="alert" className="mt-3 text-sm leading-6 text-red-700 dark:text-red-400">{p.error}</p>}
    </section>;
}
