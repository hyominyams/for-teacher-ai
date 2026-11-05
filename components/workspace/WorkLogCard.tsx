"use client";

import { Archive, BookOpen, CalendarDays, Download, Edit3, Eye, FileText, Heart, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORK_CATEGORIES } from "@/lib/work-logs";
import type { WorkLogSummary } from "@/lib/work-logs";

const categoryStyles = {
    behavior: { icon: Heart, badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300", line: "bg-sky-400" },
    subject: { icon: BookOpen, badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300", line: "bg-indigo-400" },
    creative: { icon: Sparkles, badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300", line: "bg-amber-400" },
    docs: { icon: FileText, badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", line: "bg-slate-400" },
};

type Props = {
    log: WorkLogSummary;
    busy: boolean;
    dateLabel: string;
    onPreview: () => void;
    onEdit: () => void;
    onExport: () => void;
    onArchive: () => void;
};

export function WorkLogCard({ log, busy, dateLabel, onPreview, onEdit, onExport, onArchive }: Props) {
    const style = categoryStyles[log.category];
    const Icon = style.icon;
    return (
        <article className="relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div aria-hidden="true" className={`absolute inset-x-6 top-0 h-1 rounded-b-full ${style.line}`} />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${style.badge}`}><Icon className="size-4" />{WORK_CATEGORIES[log.category]}</span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">{log.archived_at && <LockKeyhole className="size-3" />}{log.archived_at ? "보관본 · 읽기 전용" : "수정 가능"}</span>
            </div>
            <h2 className="break-words text-lg font-bold leading-7 tracking-tight text-slate-900 dark:text-slate-100">{log.title}</h2>
            <time dateTime={log.updated_at} className="mt-2 flex items-center gap-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400"><CalendarDays className="size-3.5 shrink-0" />{dateLabel}</time>
            <dl className="mb-5 mt-5 grid grid-cols-2 divide-x divide-slate-200 rounded-2xl bg-slate-50 px-4 py-3 dark:divide-slate-700 dark:bg-slate-800/60">
                <div><dt className="text-xs text-slate-500 dark:text-slate-400">학생 수</dt><dd className="mt-1 text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{log.student_count}<span className="ml-1 text-xs font-medium text-slate-500">명</span></dd></div>
                <div className="pl-4"><dt className="text-xs text-slate-500 dark:text-slate-400">작성된 결과</dt><dd className="mt-1 text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{log.completed_count}<span className="ml-1 text-xs font-medium text-slate-500">명</span></dd></div>
            </dl>
            <div className="mt-auto space-y-3">
                <div className={`grid gap-2 ${!log.archived_at && log.category !== "docs" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <Button variant="outline" onClick={onPreview} disabled={busy} className="h-11 gap-2 rounded-xl"><Eye className="size-4" />보기</Button>
                    {!log.archived_at && log.category !== "docs" && <Button onClick={onEdit} disabled={busy} className="h-11 gap-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"><Edit3 className="size-4" />수정하기</Button>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Button variant="ghost" onClick={onExport} disabled={busy || !log.completed_count} className="h-9 gap-1.5 rounded-lg px-2 text-xs text-slate-600 dark:text-slate-300"><Download className="size-3.5" />내보내기</Button>
                    {!log.archived_at && <Button variant="ghost" onClick={onArchive} disabled={busy} className="h-9 gap-1.5 rounded-lg px-2 text-xs text-slate-500 dark:text-slate-400"><Archive className="size-3.5" />보관하기</Button>}
                </div>
            </div>
        </article>
    );
}
