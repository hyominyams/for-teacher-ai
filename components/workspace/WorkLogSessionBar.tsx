"use client";
import { type ReactNode, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, ChevronDown, Circle, Ellipsis, FilePlus2, Loader2, PencilLine, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkspaceButton, workspaceCardClassName, workspaceControlClassName } from "./WorkspaceControls";
import { SubjectWorkLogCopyDialog, type SubjectCopyScope } from "./SubjectWorkLogCopyDialog";

type Props = {
    draftStatus?: string; editing: boolean; project?: boolean; title: string; onTitle: (value: string) => void;
    busy: boolean; saving?: boolean; dirty: boolean; autoSavePaused?: boolean; message: string; error: string;
    onSave: () => void; onSaveNew: () => void; onReset: () => void; onBack: () => void; settings?: ReactNode;
    subjectSave?: {
        subjectName: string;
        allSubjects?: string;
        copyTitle: string;
        onSaveCopy: (scope: SubjectCopyScope, title: string) => Promise<boolean>;
    };
    savedSubjectHref?: string;
};

export function WorkLogSessionBar(p: Props) {
    const [copyOpen, setCopyOpen] = useState(false);
    const [copyError, setCopyError] = useState("");
    const openCopyAfterMenu = useRef(false);
    const saveTrigger = useRef<HTMLButtonElement>(null);
    const subjectSave = p.subjectSave;
    const failed = !p.editing && p.draftStatus?.includes("실패");
    const savingDraft = !p.editing && p.draftStatus?.includes("저장 중");
    const savedDraft = !p.editing && p.draftStatus?.includes("완료");
    const savingChanges = p.editing && p.dirty && p.saving;
    const StatusIcon = failed || (p.editing && p.dirty && p.autoSavePaused) ? AlertCircle
        : savingDraft || savingChanges ? Loader2 : savedDraft || (p.editing && !p.dirty) ? Check : Circle;
    const status = p.editing
        ? p.dirty ? p.saving ? "작업로그 저장 중…" : p.autoSavePaused ? "자동 저장 일시 중지" : "자동 저장 대기" : "저장된 내용과 같음"
        : failed ? p.draftStatus
            : subjectSave ? savingDraft ? "서버에 저장 중…" : savedDraft ? "서버에 저장됨" : "자동 저장"
                : savingDraft ? "임시 저장 중…" : savedDraft ? "임시 저장됨" : "임시 작업 자동 저장";
    const closeCopy = () => {
        setCopyOpen(false);
        requestAnimationFrame(() => saveTrigger.current?.focus());
    };

    return <section className={cn(workspaceCardClassName, "mb-4 p-4")} aria-label="작업로그 저장">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <label htmlFor="work-log-title" className="text-xs font-semibold leading-4 text-slate-800 dark:text-slate-200">{p.project ? "프로젝트명" : "작업 이름"}</label>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-4", p.editing ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300")}>{p.editing ? "저장본 수정" : "새 작업"}</span>
                    <span role={failed ? "alert" : "status"} className={cn("flex min-w-0 items-center gap-1 text-xs leading-4", failed ? "text-red-700 dark:text-red-400" : p.editing && p.dirty ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400")}>
                        <StatusIcon aria-hidden="true" className={cn("size-3.5 shrink-0", (savingDraft || savingChanges) && "animate-spin")} />{status}
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
                {p.subjectSave ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <WorkspaceButton ref={saveTrigger} type="button" disabled={p.busy} className="flex-1 sm:flex-none">
                                {p.saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                                저장<ChevronDown aria-hidden="true" className="opacity-70" />
                            </WorkspaceButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)] rounded-xl p-1.5"
                            onCloseAutoFocus={event => {
                                if (!openCopyAfterMenu.current) return;
                                event.preventDefault();
                                openCopyAfterMenu.current = false;
                                setCopyError("");
                                setCopyOpen(true);
                            }}>
                            <DropdownMenuItem onSelect={p.onSave} disabled={p.editing && !p.title.trim()} className="items-start rounded-lg px-2.5 py-2">
                                <Save aria-hidden="true" className="mt-0.5" />
                                <span><span className="block font-semibold">변경사항 저장</span><span className="block text-xs leading-5 text-muted-foreground">{p.editing ? "열어 둔 작업로그에 반영" : "기존 프로젝트의 해당 교과에 반영"}</span></span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { openCopyAfterMenu.current = true; }} className="items-start rounded-lg px-2.5 py-2">
                                <FilePlus2 aria-hidden="true" className="mt-0.5" />
                                <span className="font-semibold">다른 이름으로 작업로그 저장</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : <WorkspaceButton onClick={p.onSave} disabled={p.busy || !p.title.trim()} className="flex-1 sm:flex-none">{p.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}{p.editing ? "수정 내용 저장" : "작업로그 저장"}</WorkspaceButton>}
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
        {subjectSave && <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{p.editing
            ? "변경사항은 입력을 멈추면 약 1분 뒤 저장됩니다. 나이스로 바로 가져갈 때는 ‘변경사항 저장’을 눌러주세요."
            : "‘변경사항 저장’을 누르면 기존 프로젝트에 반영됩니다. ‘다른 이름으로 작업로그 저장’으로 새 프로젝트나 교과 저장본을 만들 수 있습니다."}</p>}
        {p.message && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{p.message}{p.savedSubjectHref && <Link className="ml-2 font-semibold underline underline-offset-4" href={p.savedSubjectHref} target="_blank" rel="noreferrer">저장본 열기</Link>}</p>}
        {p.error && <p role="alert" className="mt-3 text-sm leading-6 text-red-700 dark:text-red-400">{p.error}</p>}
        {copyOpen && subjectSave && <SubjectWorkLogCopyDialog title={subjectSave.copyTitle} subjectName={subjectSave.subjectName}
            allSubjects={subjectSave.allSubjects} busy={!!p.saving} error={copyError} onClose={closeCopy}
            onSave={async (scope, title) => {
                setCopyError("");
                try { return await subjectSave.onSaveCopy(scope, title); }
                catch (error) {
                    setCopyError(error instanceof Error ? error.message : "작업로그를 저장하지 못했습니다. 다시 시도해주세요.");
                    return false;
                }
            }} />}
    </section>;
}
