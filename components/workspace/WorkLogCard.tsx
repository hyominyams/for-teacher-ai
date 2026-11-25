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
    const category = WORK_CATEGORIES[log.category];
    const title = log.title.replace(/ · \d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?(?:\s+\d{1,2}:\d{2})?$/, "") || category;
    const canEdit = !log.archived_at && log.category !== "docs";
    return (
        <article className="relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div aria-hidden="true" className={`absolute inset-x-6 top-0 h-1 rounded-b-full ${style.line}`} />
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                    <Icon aria-hidden="true" className="size-3.5" />{title !== category && category}
                </span>
                {title === category && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
                {log.archived_at && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"><LockKeyhole className="size-3" />읽기 전용</span>}
            </div>
            {title !== category && <h2 className="mt-3 break-words text-lg font-bold leading-7 tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>}
            <time dateTime={log.updated_at} className="mt-2 flex items-center gap-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400"><CalendarDays className="size-3.5 shrink-0" />{dateLabel}</time>
            <div className="mt-auto space-y-2 pt-5">
                <div className={`grid gap-2 ${canEdit ? "grid-cols-2" : "grid-cols-1"}`}>
                    <Button variant="outline" onClick={onPreview} disabled={busy} className="h-11 gap-2 rounded-xl"><Eye className="size-4" />보기</Button>
                    {canEdit && <Button onClick={onEdit} disabled={busy} className="h-11 gap-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"><Edit3 className="size-4" />편집하기</Button>}
                </div>
                <div className={`grid gap-2 border-t border-slate-100 pt-2 dark:border-slate-800 ${log.archived_at ? "grid-cols-1" : "grid-cols-2"}`}>
                    <Button variant="ghost" onClick={onExport} disabled={busy || !log.completed_count} className="h-9 gap-1.5 rounded-lg px-2 text-xs text-slate-600 dark:text-slate-300"><Download className="size-3.5" />내보내기</Button>
                    {!log.archived_at && <Button variant="ghost" onClick={onArchive} disabled={busy} className="h-9 gap-1.5 rounded-lg px-2 text-xs text-slate-500 dark:text-slate-400"><Archive className="size-3.5" />보관하기</Button>}
                </div>
            </div>
        </article>
    );
}
