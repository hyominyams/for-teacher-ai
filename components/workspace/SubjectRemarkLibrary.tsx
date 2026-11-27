"use client";

import { useId, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { BookOpenText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workspaceToolButtonClassName } from "@/components/workspace/WorkspaceControls";
import { cn } from "@/lib/utils";

const remarkLevels = ["공통", "상", "중", "하"] as const;
type RemarkLevel = (typeof remarkLevels)[number];

export type RemarkSubject = { id: string; name: string; detail?: string };

export type SubjectRemarkDraft = {
    customSubjects: RemarkSubject[];
    phrases: Record<string, Partial<Record<RemarkLevel, string>>>;
};

interface SubjectRemarkLibraryProps {
    id: string;
    open: boolean;
    subjects: RemarkSubject[];
    currentSubjectId: string;
    assessmentAreas: string[];
    draft: SubjectRemarkDraft;
    setDraft: Dispatch<SetStateAction<SubjectRemarkDraft>>;
}

const countPhrases = (text?: string) => text?.split("\n").filter(line => line.trim()).length ?? 0;

export function SubjectRemarkLibrary({ id, open, subjects, currentSubjectId, assessmentAreas, draft, setDraft }: SubjectRemarkLibraryProps) {
    const headingId = useId();
    const inputId = useId();
    const subjectInputId = useId();
    const phraseInput = useRef<HTMLTextAreaElement>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [level, setLevel] = useState<RemarkLevel>("공통");
    const [addingSubject, setAddingSubject] = useState(false);
    const [subjectName, setSubjectName] = useState("");

    const allSubjects = [...subjects, ...draft.customSubjects];
    const subjectIdsByName = new Map<string, string[]>();
    for (const subject of allSubjects) {
        const ids = subjectIdsByName.get(subject.name);
        if (ids) ids.push(subject.id);
        else subjectIdsByName.set(subject.name, [subject.id]);
    }
    const activeSubject = allSubjects.find(subject => subject.id === selectedSubjectId)
        ?? allSubjects.find(subject => subject.id === currentSubjectId)
        ?? allSubjects[0];
    const phrases = activeSubject ? draft.phrases[activeSubject.id] : undefined;
    const areas = activeSubject?.id === currentSubjectId ? assessmentAreas : [];

    function selectSubject(subjectId: string) {
        setSelectedSubjectId(subjectId);
        setLevel("공통");
    }

    function addSubject(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = subjectName.trim().replace(/\s+/g, " ");
        if (!name) return;

        const existing = allSubjects.find(subject => subject.name === name);
        if (existing) {
            selectSubject(existing.id);
        } else {
            const subject = { id: `custom:${crypto.randomUUID()}`, name };
            setDraft(previous => ({ ...previous, customSubjects: [...previous.customSubjects, subject] }));
            selectSubject(subject.id);
        }
        setSubjectName("");
        setAddingSubject(false);
        requestAnimationFrame(() => phraseInput.current?.focus());
    }

    function updatePhrases(subjectId: string, value: string) {
        setDraft(previous => ({
            ...previous,
            phrases: { ...previous.phrases, [subjectId]: { ...previous.phrases[subjectId], [level]: value } },
        }));
    }

    return (
        <section id={id} hidden={!open} aria-labelledby={headingId} className="border-t border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30 sm:p-4">
            <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white dark:border-indigo-900/70 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-indigo-100 bg-indigo-50/70 px-4 py-3.5 dark:border-indigo-900/70 dark:bg-indigo-950/40 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
                            <BookOpenText aria-hidden="true" className="size-4" />
                        </div>
                        <div>
                            <h3 id={headingId} className="text-sm font-bold text-slate-900 dark:text-white">과목별 참고 평어</h3>
                            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">AI가 종합의견을 작성할 때 참고할 문장을 과목과 수준별로 모아두세요.</p>
                        </div>
                    </div>
                    <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">UI 시안 · 새로고침하면 입력이 초기화돼요.</p>
                </div>

                <Tabs value={activeSubject?.id ?? ""} onValueChange={selectSubject} className="gap-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
                        <span className="mr-1 text-xs font-semibold text-slate-600 dark:text-slate-400">과목</span>
                        {allSubjects.length > 0 && (
                            <TabsList aria-label="평어 과목" className="h-auto min-w-0 max-w-full flex-wrap justify-start gap-1.5 bg-transparent p-0">
                                {allSubjects.map(subject => {
                                    const matchingIds = subjectIdsByName.get(subject.name) ?? [];
                                    const label = matchingIds.length > 1 ? `${subject.name} #${matchingIds.indexOf(subject.id) + 1}` : subject.name;
                                    return (
                                        <TabsTrigger key={subject.id} value={subject.id} title={subject.detail ? `${label} · ${subject.detail}` : label}
                                            className="h-8 min-w-0 max-w-full flex-none rounded-lg border-slate-200 px-3 text-xs font-semibold text-slate-700 data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800 data-[state=active]:shadow-none dark:border-slate-700 dark:text-slate-300 dark:data-[state=active]:border-indigo-800 dark:data-[state=active]:bg-indigo-950/60 dark:data-[state=active]:text-indigo-200">
                                            <span className="truncate">{label}</span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        )}
                        <Button type="button" variant="outline" aria-expanded={addingSubject} onClick={() => setAddingSubject(!addingSubject)}
                            className={cn(workspaceToolButtonClassName, "h-8 rounded-lg border-dashed border-indigo-300 px-2.5 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300")}>
                            <Plus aria-hidden="true" /> 과목 추가
                        </Button>
                        {addingSubject && (
                            <form onSubmit={addSubject} className="flex w-full flex-wrap items-center gap-2 pt-1">
                                <label htmlFor={subjectInputId} className="sr-only">추가할 과목명</label>
                                <Input id={subjectInputId} value={subjectName} onChange={event => setSubjectName(event.target.value)}
                                    autoFocus maxLength={80} placeholder="과목명 입력" className="h-9 min-w-28 flex-1 border-slate-300 shadow-none dark:border-slate-700 sm:max-w-60" />
                                <Button type="submit" disabled={!subjectName.trim()} className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">추가</Button>
                            </form>
                        )}
                    </div>

                    {activeSubject ? (
                        <TabsContent value={activeSubject.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.4fr)] lg:items-start">
                            <Tabs value={level} onValueChange={value => setLevel(value as RemarkLevel)} className="min-w-0 gap-3">
                                <TabsList aria-label="평어 수준" className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-fit">
                                    {remarkLevels.map(value => (
                                        <TabsTrigger key={value} value={value} className="h-8 gap-1 rounded-lg px-2 text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-800 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-indigo-200 sm:min-w-[70px] sm:px-3">
                                            {value}<span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400" aria-hidden="true">{countPhrases(phrases?.[value])}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                <TabsContent value={level} className="min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                        <label htmlFor={inputId} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{level === "공통" ? "공통 평어" : `${level} 수준 평어`}</label>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">한 줄에 한 문장씩 입력</span>
                                    </div>
                                    <textarea ref={phraseInput} id={inputId} rows={4} value={phrases?.[level] ?? ""} onChange={event => updatePhrases(activeSubject.id, event.target.value)}
                                        placeholder="평어를 입력하거나 여러 문장을 붙여넣으세요."
                                        className="block w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-indigo-900/60" />
                                </TabsContent>
                            </Tabs>

                            <aside aria-label="AI 참고 범위" className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/70 dark:bg-indigo-950/30">
                                <h4 className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200"><Sparkles aria-hidden="true" className="size-3.5" /> AI 참고 범위</h4>
                                <dl className="space-y-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                    <div>
                                        <dt className="font-semibold text-slate-800 dark:text-slate-200">평가 기준과 학생별 수준</dt>
                                        <dd className="break-words">{areas.length ? areas.join(" · ") : "학생에게 입력한 수준에 해당하는 평가 기준"}</dd>
                                    </div>
                                    <div>
                                        <dt className="break-words font-semibold text-slate-800 dark:text-slate-200">{activeSubject.name} 참고 평어</dt>
                                        <dd>공통 평어와 학생의 수준에 해당하는 평어</dd>
                                    </div>
                                </dl>
                            </aside>
                        </TabsContent>
                    ) : (
                        <p className="px-4 py-5 text-sm text-slate-600 dark:text-slate-400 sm:px-5">등록된 과목이 없어요. 과목을 추가하면 평어를 입력할 수 있어요.</p>
                    )}
                </Tabs>
            </div>
        </section>
    );
}
