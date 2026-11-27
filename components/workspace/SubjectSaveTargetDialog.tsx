"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { SubjectSaveTarget } from "@/lib/work-logs";
import { WorkspaceButton } from "./WorkspaceControls";

type Props = {
    targets: SubjectSaveTarget[];
    busy: boolean;
    error: string;
    onClose: () => void;
    onSave: (target: SubjectSaveTarget) => void;
};

export function SubjectSaveTargetDialog({ targets, busy, error, onClose, onSave }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [selectedId, setSelectedId] = useState(targets.length === 1 ? targets[0].id : "");
    const selected = targets.find(target => target.id === selectedId);
    useEffect(() => {
        const node = dialog.current;
        node?.showModal();
        return () => node?.close();
    }, []);

    return <dialog ref={dialog} aria-labelledby="subject-save-project-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-indigo-100 bg-background p-5 text-foreground shadow-xl backdrop:bg-slate-950/50 dark:border-indigo-900 sm:p-6">
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (selected && !busy) onSave(selected); }}>
            <h2 id="subject-save-project-title" className="text-lg font-bold">반영할 작업로그 선택</h2>
            <fieldset disabled={busy} aria-label="작업로그 프로젝트" className="space-y-2">
                {targets.map(target => <label key={target.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 has-checked:border-indigo-400 has-checked:bg-indigo-50/60 dark:border-slate-700 dark:has-checked:border-indigo-600 dark:has-checked:bg-indigo-950/45">
                    <input type="radio" name="subject-save-target" className="mt-1 accent-indigo-600" checked={selectedId === target.id}
                        onChange={() => setSelectedId(target.id)} />
                    <span className="min-w-0 break-words">
                        <span className="block text-sm font-semibold">{target.project.title}</span>
                        <span className="block text-xs leading-5 text-muted-foreground">{target.subject_name || target.title} · {new Date(target.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" })}</span>
                    </span>
                </label>)}
            </fieldset>
            {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="flex justify-end gap-2">
                <WorkspaceButton type="button" variant="outline" onClick={onClose} disabled={busy}>닫기</WorkspaceButton>
                <WorkspaceButton type="submit" disabled={!selected || busy}>{busy && <Loader2 aria-hidden="true" className="animate-spin" />}변경사항 저장</WorkspaceButton>
            </div>
        </form>
    </dialog>;
}
