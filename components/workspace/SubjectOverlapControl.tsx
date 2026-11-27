"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, CheckCheck, Loader2, RotateCcw, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyPolishProposals, latestPolishBatch, undoPolishBatch } from "@/lib/class-polish";
import { creditAIFetch } from "@/lib/credit-client";
import { getSubjectCriteriaForLevel } from "@/lib/subject-plan-values";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { SubjectOverlapEvidence, SubjectOverlapProposal, SubjectOverlapRecord } from "@/lib/subject-overlap";
import type { Student, SubjectGlobalConfig } from "@/types";

type Props = {
    students: Student[];
    setStudents: (students: Student[]) => void;
    config: SubjectGlobalConfig;
    workLogId?: string;
    disabled: boolean;
    onPersist: (students: Student[]) => Promise<boolean>;
};

type Decision = "pending" | "approved" | "rejected" | "restored";
type ReviewRow = SubjectOverlapProposal & {
    evidence: SubjectOverlapEvidence;
    studentInput: string;
    decision: Decision;
    excluded: boolean;
};
type Review = { batchId: string; createdAt: string; config: string; rows: ReviewRow[] };

const history = "subjectOverlapHistory";
const subscribe = () => () => {};
const splitSentences = (text: string) => text.split(/(?<=[.!?。！？])(?=\s)/u);

const statusStyles = {
    pending: { label: "검토 대기", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200" },
    approved: { label: "승인", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
    rejected: { label: "거절", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
    restored: { label: "원문 복구", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
    unchanged: { label: "원문 유지", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
    stale: { label: "원문 변경", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
    excluded: { label: "검사 제외", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
} as const;

function ComparedText({ text, against, proposed = false }: { text: string; against: string; proposed?: boolean }) {
    const other = splitSentences(against);
    return <p className="whitespace-pre-wrap break-words text-sm leading-7 [word-break:keep-all]">
        {splitSentences(text).map((sentence, index) => {
            const counterpart = other[index] ?? "";
            if (sentence === counterpart) return <span key={index}>{sentence}</span>;
            const characters = Array.from(sentence);
            const otherCharacters = Array.from(counterpart);
            const sharedLength = Math.min(characters.length, otherCharacters.length);
            let start = 0;
            while (start < sharedLength && characters[start] === otherCharacters[start]) start++;
            let tail = 0;
            while (tail < sharedLength - start && characters.at(-tail - 1) === otherCharacters.at(-tail - 1)) tail++;
            const end = characters.length - tail;
            return <span key={index}>
                {characters.slice(0, start).join("")}
                {start < end && <mark className={cn("rounded-sm text-inherit", proposed ? "bg-indigo-100 dark:bg-indigo-900/70" : "bg-amber-100/80 dark:bg-amber-950/75")}>{characters.slice(start, end).join("")}</mark>}
                {characters.slice(end).join("")}
            </span>;
        })}
    </p>;
}

function readReviewResponse(value: unknown, records: SubjectOverlapRecord[]) {
    if (!value || typeof value !== "object"
        || !("batchId" in value) || typeof value.batchId !== "string" || !value.batchId
        || !("proposals" in value) || !Array.isArray(value.proposals)
        || !("excludedIds" in value) || !Array.isArray(value.excludedIds)) {
        throw new Error("겹침 제거 결과를 읽지 못했습니다.");
    }
    const originals = new Map(records.map(record => [record.studentId, record.text]));
    const proposals = new Map<number, SubjectOverlapProposal>();
    for (const proposal of value.proposals) {
        if (!proposal || !originals.has(proposal.studentId) || proposals.has(proposal.studentId)
            || proposal.before !== originals.get(proposal.studentId) || typeof proposal.after !== "string" || !proposal.after.trim()) {
            throw new Error("학생별 결과가 원문과 일치하지 않습니다.");
        }
        proposals.set(proposal.studentId, proposal);
    }
    const excludedIds = new Set<number>(value.excludedIds);
    if ([...excludedIds].some(id => !originals.has(id) || proposals.has(id))) throw new Error("학생별 검사 결과를 읽지 못했습니다.");
    return { batchId: value.batchId, proposals, excludedIds };
}

export function SubjectOverlapControl({ students, setStudents, config, workLogId, disabled, onPersist }: Props) {
    const titleId = useId();
    const mounted = useSyncExternalStore(subscribe, () => true, () => false);
    const dialog = useRef<HTMLDialogElement>(null);
    const selectedButton = useRef<HTMLButtonElement>(null);
    const controller = useRef<AbortController | null>(null);
    const [open, setOpen] = useState(false);
    const [stage, setStage] = useState<"idle" | "reviewing" | "saving">("idle");
    const [review, setReview] = useState<Review | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saveFailed, setSaveFailed] = useState(false);

    const eligibleCount = students.filter(student => student.aiResult.trim()).length;
    const busy = disabled || students.some(student => student.isGenerating) || stage !== "idle";
    const studentsById = new Map(students.map(student => [student.id, student]));
    const configKey = review ? JSON.stringify(config) : "";
    const undo = latestPolishBatch(students, history);
    const isCurrent = (row: ReviewRow) => {
        const student = studentsById.get(row.studentId);
        return review?.config === configKey && student?.aiResult === row.before && !student.isGenerating
            && (JSON.stringify(student.subjectData) ?? "") === row.studentInput;
    };
    const awaiting = (review?.rows ?? []).filter(row => row.decision === "pending" && row.before !== row.after && isCurrent(row));
    const active = review?.rows.find(row => row.studentId === selectedId) ?? review?.rows[0];
    const activeAwaiting = active && awaiting.some(row => row.studentId === active.studentId);
    const getStatus = (row: ReviewRow) => row.excluded ? "excluded" : row.before === row.after ? "unchanged"
        : row.decision === "pending" && !isCurrent(row) ? "stale" : row.decision;
    const approvedCount = review?.rows.filter(row => row.decision === "approved").length ?? 0;
    const rejectedCount = review?.rows.filter(row => row.decision === "rejected").length ?? 0;

    useEffect(() => {
        if (!mounted || !dialog.current) return;
        if (open && !dialog.current.open) dialog.current.showModal();
        else if (!open && dialog.current.open) dialog.current.close();
    }, [mounted, open]);
    useEffect(() => () => controller.current?.abort(), []);
    useEffect(() => {
        if (!open) return;
        const showSelected = () => selectedButton.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
        showSelected();
        window.addEventListener("resize", showSelected);
        return () => window.removeEventListener("resize", showSelected);
    }, [open, selectedId]);

    function close() {
        if (stage === "saving") return;
        controller.current?.abort();
        controller.current = null;
        if (stage === "reviewing") setStage("idle");
        setOpen(false);
    }

    async function startReview() {
        if (busy || saveFailed || eligibleCount < 2) return;
        const completeStudents = students.filter(student => student.aiResult.trim());
        const records = completeStudents.map(student => ({ studentId: student.id, text: student.aiResult }));
        const evidence: SubjectOverlapEvidence[] = completeStudents.map(student => ({
            studentId: student.id,
            individualNote: student.subjectData?.individualNote ?? "",
            assessments: config.assessments.flatMap((assessment, index) => {
                const level = student.subjectData?.assessments?.find(item => item.assessmentId === assessment.id)?.level;
                return level ? [{ area: assessment.area || `평가 ${index + 1}`, level, criteria: getSubjectCriteriaForLevel(assessment, level) ?? "" }] : [];
            }),
        }));
        const course = [config.grade && `${config.grade}학년`, config.subjectName].filter(Boolean).join(" ");
        const capturedConfig = JSON.stringify(config);
        const abort = new AbortController();
        controller.current = abort;
        const timer = setTimeout(() => abort.abort(), 119_000);
        setStage("reviewing");
        setReview(null);
        setMessage("");
        setError("");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (abort.signal.aborted) return;
            if (!session) throw new Error("다시 로그인한 뒤 이용해주세요.");
            const response = await creditAIFetch("/api/polish/subject-overlap", {
                method: "POST", signal: abort.signal,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ course, records, evidence, workLogId }),
            }, 118_000);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "겹침 제거 검토에 실패했습니다.");
            const checked = readReviewResponse(data, records);
            if (controller.current !== abort || abort.signal.aborted) return;
            const rows = records.map((record, i): ReviewRow => ({
                studentId: record.studentId,
                before: record.text,
                after: checked.proposals.get(record.studentId)?.after ?? record.text,
                evidence: evidence[i],
                studentInput: JSON.stringify(completeStudents[i].subjectData) ?? "",
                decision: "pending",
                excluded: checked.excludedIds.has(record.studentId),
            }));
            setReview({ batchId: checked.batchId, createdAt: new Date().toISOString(), config: capturedConfig, rows });
            setSelectedId(rows.find(row => row.before !== row.after)?.studentId ?? rows[0].studentId);
        } catch (cause) {
            if (controller.current !== abort) return;
            setError(abort.signal.aborted ? "검토 시간이 초과됐습니다." : cause instanceof Error ? cause.message : "겹침 제거 검토에 실패했습니다.");
        } finally {
            clearTimeout(timer);
            if (controller.current === abort) {
                controller.current = null;
                setStage("idle");
            }
        }
    }

    function recordDecision(ids: number[], decision: Decision) {
        setReview(previous => previous && ({ ...previous, rows: previous.rows.map(row => ids.includes(row.studentId) ? { ...row, decision } : row) }));
        if (decision === "restored" || !selectedId || !ids.includes(selectedId)) return;
        const remaining = awaiting.filter(row => !ids.includes(row.studentId));
        setSelectedId(remaining.find(row => row.studentId > selectedId)?.studentId ?? remaining[0]?.studentId ?? selectedId);
    }

    async function persist(next: Student[], success: string) {
        setStage("saving");
        setError("");
        setMessage("");
        try {
            const saved = await onPersist(next);
            setSaveFailed(!saved);
            if (saved) setMessage(success);
            else setError("화면에 반영했지만 저장에 실패했습니다. 저장을 다시 시도해주세요.");
        } catch {
            setSaveFailed(true);
            setError("저장에 실패했습니다. 저장을 다시 시도해주세요.");
        } finally { setStage("idle"); }
    }

    async function approve(rows: ReviewRow[]) {
        if (!review || busy || saveFailed || !rows.length) return;
        const result = applyPolishProposals(students, rows.filter(isCurrent), review.batchId, review.createdAt, history);
        if (!result.applied.length) return;
        setStudents(result.students);
        recordDecision(result.applied, "approved");
        await persist(result.students, `${result.applied.length}명의 결과를 저장했습니다.`);
    }

    function reject(row: ReviewRow) {
        if (busy || saveFailed || !isCurrent(row)) return;
        recordDecision([row.studentId], "rejected");
        setMessage(`${row.studentId}번의 원문을 유지했습니다.`);
    }

    async function restore() {
        if (busy || saveFailed || !undo?.count) return;
        const result = undoPolishBatch(students, undo.batchId, history);
        if (!result.restored.length) return;
        setStudents(result.students);
        if (review?.batchId === undo.batchId) recordDecision(result.restored, "restored");
        await persist(result.students, `${result.restored.length}명을 겹침 제거 전 원문으로 복구했습니다.${result.skipped.length ? ` 이후 수정된 ${result.skipped.length}명은 유지했습니다.` : ""}`);
    }

    return <>
        <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={busy || (eligibleCount < 2 && !undo?.count && !saveFailed)}
            title={eligibleCount < 2 && !undo?.count ? "완성된 학생 기록이 2명 이상 필요합니다." : undefined}
            className="h-10 gap-2 rounded-xl border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900">
            <ScanText aria-hidden="true" className="size-4" />겹침 제거
        </Button>
        {mounted && createPortal(<dialog ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); close(); }}
            className="fixed inset-0 m-auto max-h-none w-[min(1120px,calc(100vw-20px))] max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/55 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <div className="flex max-h-[calc(100dvh-20px)] flex-col sm:max-h-[90dvh]">
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-indigo-100 bg-indigo-50/75 px-4 py-4 dark:border-indigo-950 dark:bg-indigo-950/35 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><ScanText aria-hidden="true" className="size-4" /></span>
                        <div className="min-w-0">
                            <h2 id={titleId} className="text-lg font-bold tracking-tight">겹침 제거</h2>
                            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                {config.subjectName.trim() && `${config.subjectName.trim()} · `}{review ? `${review.rows.length}명 검토 · ${awaiting.length}명 대기 · ${approvedCount}명 승인 · ${rejectedCount}명 거절` : `작성된 ${eligibleCount}명의 종합의견을 함께 비교합니다.`}
                            </p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label="겹침 제거 닫기" onClick={close} disabled={stage === "saving"} className="size-9 shrink-0 rounded-xl"><X aria-hidden="true" /></Button>
                </header>

                {(error || message) && <div role={error ? "alert" : "status"} className={cn("shrink-0 border-b px-4 py-2.5 text-sm sm:px-6", error ? "border-red-100 bg-red-50 text-red-800 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200" : "border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200")}>{error || message}</div>}

                {active && review ? (
                    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[168px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
                        <nav aria-label="겹침 제거 검토 학생" className="flex min-w-0 gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r">
                            {review.rows.map(row => {
                                const status = statusStyles[getStatus(row)];
                                const selected = row.studentId === active.studentId;
                                return <button key={row.studentId} type="button" ref={selected ? selectedButton : undefined} aria-current={selected ? "true" : undefined}
                                    onClick={() => setSelectedId(row.studentId)} className={cn("flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-xl border px-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500", selected ? "border-indigo-300 bg-white text-indigo-800 dark:border-indigo-700 dark:bg-slate-950 dark:text-indigo-200" : "border-transparent text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800")}>
                                    <span className="tabular-nums">{row.studentId}번</span><span className={cn("rounded-md px-1.5 py-0.5 text-[11px]", status.className)}>{status.label}</span>
                                </button>;
                            })}
                        </nav>
                        <div className="min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
                            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h3 className="text-base font-bold">{active.studentId}번 학생</h3>
                                <p className="min-w-0 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    {active.evidence.assessments.map(item => `${item.area} ${item.level}`).join(" · ") || "입력된 평가 수준 없음"}
                                </p>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <section aria-label="겹침 제거 전 원문" className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <h4 className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">원문</h4>
                                    <ComparedText text={active.before} against={active.after} />
                                </section>
                                <section aria-label="겹침 제거 제안" className="min-w-0 rounded-xl border border-indigo-100 bg-indigo-50/65 p-4 dark:border-indigo-900/65 dark:bg-indigo-950/30">
                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-200"><ArrowRight aria-hidden="true" className="size-3.5" />AI 제안</h4>
                                    <ComparedText text={active.after} against={active.before} proposed />
                                </section>
                            </div>
                            {active.excluded && <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">숫자가 달라졌거나 다른 학생 기록과 동일한 제안은 원문을 유지합니다.</p>}
                            {getStatus(active) === "stale" && <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">검토 이후 원문이나 평가 자료가 바뀌었습니다. 새로 검토해주세요.</p>}
                            {(active.evidence.assessments.length > 0 || active.evidence.individualNote.trim()) && <details className="mt-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">평가 기준과 개별 특이사항 보기</summary>
                                <dl className="mt-3 space-y-2.5 leading-5 text-slate-600 dark:text-slate-300">
                                    {active.evidence.assessments.map((item, i) => <div key={i} className="break-words"><dt className="font-semibold">{item.area} · {item.level}</dt><dd>{item.criteria || "입력된 기준 문구 없음"}</dd></div>)}
                                    {active.evidence.individualNote.trim() && <div className="break-words"><dt className="font-semibold">개별 특이사항</dt><dd className="whitespace-pre-wrap">{active.evidence.individualNote}</dd></div>}
                                </dl>
                            </details>}
                        </div>
                    </div>
                ) : (
                    <div className="min-h-0 overflow-y-auto px-4 py-9 sm:px-6">
                        {stage === "reviewing" ? <div role="status" className="flex items-center gap-3 text-sm"><Loader2 aria-hidden="true" className="size-5 shrink-0 animate-spin text-indigo-600" />{eligibleCount}명의 기록에서 반복되는 표현을 찾고 있습니다.</div>
                            : <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">겹치는 표현을 다듬은 AI 제안을 원문과 비교할 수 있습니다. 승인한 문장은 학생별 결과에 저장됩니다.</p>}
                    </div>
                )}

                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                        {!!undo?.count && <Button type="button" variant="outline" onClick={() => void restore()} disabled={busy || saveFailed} className="h-9 gap-1.5 rounded-xl px-3 text-xs"><RotateCcw aria-hidden="true" className="size-3.5" />겹침 제거 되돌리기 ({undo.count}명)</Button>}
                        {awaiting.length > 0 && <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">승인 전 평가 수준과 관찰 사실을 확인하세요.</span>}
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {saveFailed ? <Button type="button" disabled={busy} onClick={() => void persist(students, "현재 결과를 저장했습니다.")} className="rounded-xl">저장 다시 시도</Button>
                            : stage === "saving" ? <span role="status" className="flex items-center gap-2 text-xs"><Loader2 aria-hidden="true" className="size-4 animate-spin" />저장 중</span>
                            : stage === "reviewing" ? <Button type="button" variant="outline" onClick={close} className="rounded-xl">검토 취소</Button>
                            : !review || !awaiting.length ? <Button type="button" onClick={() => void startReview()} disabled={busy || eligibleCount < 2} className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">{review ? "다시 검토" : "겹침 제거 시작"}</Button>
                            : <>
                                <Button type="button" variant="outline" disabled={busy || !activeAwaiting} onClick={() => { if (active) reject(active); }} className="rounded-xl">거절</Button>
                                <Button type="button" variant="outline" disabled={busy || !activeAwaiting} onClick={() => { if (active) void approve([active]); }} className="rounded-xl border-indigo-200 text-indigo-800 dark:border-indigo-900 dark:text-indigo-200"><Check aria-hidden="true" />승인</Button>
                                <Button type="button" disabled={busy} onClick={() => void approve(awaiting)} className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><CheckCheck aria-hidden="true" />전체 승인 ({awaiting.length}명)</Button>
                            </>}
                    </div>
                </footer>
            </div>
        </dialog>, document.body)}
    </>;
}
