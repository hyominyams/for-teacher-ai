"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WorkspaceButton, workspaceControlClassName } from "./WorkspaceControls";

export type SubjectCopyScope = "current" | "all";

type Props = {
    title: string;
    subjectName: string;
    allSubjects?: string;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSave: (scope: SubjectCopyScope, title: string) => Promise<boolean>;
};

export function SubjectWorkLogCopyDialog({ title, subjectName, allSubjects, busy, error, onClose, onSave }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const nameInput = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(() => title.trim() ? `${title.trim().slice(0, 117)} 사본` : "");
    const [scope, setScope] = useState<SubjectCopyScope | null>(null);
    const selectedScope = allSubjects ? scope : "current";

    useEffect(() => {
        const node = dialog.current!;
        node.showModal();
        nameInput.current?.select();
        return () => node.close();
    }, []);

    return (
        <dialog ref={dialog} aria-labelledby="subject-copy-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
            className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-indigo-100 bg-background p-0 text-foreground shadow-xl backdrop:bg-slate-950/50 dark:border-indigo-900">
            <form className="space-y-5 p-5 sm:p-6" onSubmit={async event => {
                event.preventDefault();
                if (!busy && selectedScope && name.trim() && await onSave(selectedScope, name.trim())) onClose();
            }}>
                <h2 id="subject-copy-title" className="text-lg font-bold">다른 이름으로 작업로그 저장</h2>
                <div className="space-y-2">
                    <label htmlFor="subject-copy-name" className="block text-sm font-semibold">새 작업로그 이름</label>
                    <Input ref={nameInput} id="subject-copy-name" value={name} onChange={event => setName(event.target.value)}
                        placeholder="예: 6학년 2반 · 2학기" disabled={busy} maxLength={120} required
                        className={workspaceControlClassName} />
                </div>
                {allSubjects ? <fieldset disabled={busy} className="space-y-2">
                    <legend className="mb-2 text-sm font-semibold">저장할 과목</legend>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 has-checked:border-indigo-400 has-checked:bg-indigo-50/60 dark:border-slate-700 dark:has-checked:border-indigo-600 dark:has-checked:bg-indigo-950/45">
                        <input type="radio" name="subject-copy-scope" value="current" checked={scope === "current"} onChange={() => setScope("current")} className="mt-1 accent-indigo-600" />
                        <span className="min-w-0"><span className="block text-sm font-semibold">현재 과목만</span><span className="block break-words text-xs leading-5 text-muted-foreground">{subjectName}</span></span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 has-checked:border-indigo-400 has-checked:bg-indigo-50/60 dark:border-slate-700 dark:has-checked:border-indigo-600 dark:has-checked:bg-indigo-950/45">
                        <input type="radio" name="subject-copy-scope" value="all" checked={scope === "all"} onChange={() => setScope("all")} className="mt-1 accent-indigo-600" />
                        <span className="min-w-0"><span className="block text-sm font-semibold">전체 과목</span><span className="block break-words text-xs leading-5 text-muted-foreground">{allSubjects}</span></span>
                    </label>
                </fieldset> : <p className="break-words text-sm text-muted-foreground">저장할 과목 · {subjectName}</p>}
                {error && <p role="alert" className="text-sm leading-6 text-red-700 dark:text-red-300">{error}</p>}
                <div className="flex justify-end gap-2">
                    <WorkspaceButton type="button" variant="outline" disabled={busy} onClick={onClose}>취소</WorkspaceButton>
                    <WorkspaceButton type="submit" disabled={busy || !selectedScope || !name.trim()}>
                        {busy && <Loader2 aria-hidden="true" className="animate-spin" />}저장
                    </WorkspaceButton>
                </div>
            </form>
        </dialog>
    );
}
