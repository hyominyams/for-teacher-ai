"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
    busy: boolean;
    error: string;
    onFileChange: () => void;
    onStart: (file: File) => void;
    onClose: () => void;
};

export function SubjectPlanUploadDialog({ busy, error, onFileChange, onStart, onClose }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const picker = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState("");

    useEffect(() => {
        const node = dialog.current!;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        node.showModal();
        return () => {
            node.close();
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    function select(files: FileList | null) {
        if (busy || !files?.length) return;
        onFileChange();
        const next = files[0];
        const message = files.length !== 1 ? "파일을 하나만 선택해주세요."
            : !/\.hwpx?$/i.test(next.name) ? "HWPX 또는 HWP 파일을 선택해주세요."
            : next.size > 20 * 1024 * 1024 ? "20MB 이하 파일을 선택해주세요." : "";
        setFileError(message);
        setFile(message ? null : next);
    }

    function cancel() {
        if (!busy || window.confirm("현재 AI 분석을 요청한 상태입니다. 지금 취소해도 이미 진행된 분석에는 크레딧이 소모됩니다. 취소하시겠습니까?")) onClose();
    }

    return (
        <dialog ref={dialog} aria-labelledby="plan-upload-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}
            onDragOver={e => e.preventDefault()} onDrop={e => e.preventDefault()}
            className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-background p-6 text-foreground shadow-xl backdrop:bg-slate-950/55 dark:border-slate-700">
            <h2 id="plan-upload-title" className="text-lg font-bold">평가계획 가져오기</h2>
            {busy ? (
                <div role="status" className="flex flex-col items-center gap-3 py-12 text-center">
                    <Loader2 aria-hidden="true" className="size-8 animate-spin text-indigo-600 dark:text-indigo-300" />
                    <p className="font-semibold">평가계획 분석 중</p>
                    <p className="text-sm text-muted-foreground">문서가 길면 1분 이상 걸릴 수 있습니다.</p>
                </div>
            ) : (
                <>
                    <input ref={picker} hidden id="subject-plan-upload" type="file" accept=".hwpx,.hwp"
                        onChange={e => { select(e.target.files); e.target.value = ""; }} />
                    <button type="button" onClick={() => picker.current?.click()} onDrop={e => { e.preventDefault(); select(e.dataTransfer.files); }}
                        className="my-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-8 text-sm font-semibold text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
                        <Plus aria-hidden="true" /><span className="max-w-full break-all">{file?.name || "여기를 눌러 파일을 추가해주세요"}</span>
                        <span className="font-normal">파일을 끌어다 놓으세요 · HWPX, HWP · 최대 20MB</span>
                    </button>
                    {(fileError || error) && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{fileError || error}</p>}
                </>
            )}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancel}>취소</Button>
                {!busy && <Button type="button" disabled={!file} onClick={() => file && onStart(file)}>{error ? "다시 분석" : "평가계획 분석 시작"}</Button>}
            </div>
        </dialog>
    );
}
