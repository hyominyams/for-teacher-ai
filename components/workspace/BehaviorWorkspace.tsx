"use client";

import React, { useEffect, useState } from "react";
import {
    Brain,
    Maximize2,
    Minimize2,
    X,
    Plus,
    ChevronDown,
    ChevronUp,
    Sparkles,
    RotateCcw,
    Trash2,
    UserCheck,
    Zap,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GenerationMenu } from "@/components/workspace/GenerationMenu";
import type { GenerationMode } from "@/lib/record-generation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    WorkspaceActionBar,
    WorkspaceCardHeader,
    workspaceCardClassName,
    workspaceCheckboxClassName,
    workspacePrimaryActionClassName,
    workspaceRowClassName,
    workspaceRowGenerateClassName,
    workspaceRowNumberClassName,
    workspaceRowResetClassName,
    workspaceSecondaryActionClassName,
    workspaceStickyHeadClassName,
    workspaceTableHeadClassName,
    workspaceTableScrollClassName,
    workspaceToolButtonClassName,
} from "@/components/workspace/WorkspaceControls";
import { Student } from "@/types";

const KEYWORD_PREVIEW_LIMIT = 10;
const GRID_COLUMNS = "grid-cols-[32px_52px_minmax(200px,1.2fr)_minmax(280px,2fr)_120px]";

interface BehaviorWorkspaceProps {
    polishAction?: React.ReactNode;
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    charLimit: number;
    handleAutoGenerateKeywords: () => void;
    handleGenerate: (id: number, mode: GenerationMode) => void;
    handleReset: (id: number) => void;
    handleResetAll: () => void;
    handleResetKeywords: () => void;
    handleDeleteUnusedKeywords: () => void;
    handleSelectedGenerate: (mode: GenerationMode) => void;
    handleAllGenerate: (mode: GenerationMode) => void;
    handleClearSelection?: () => void;
    toggleAllSelection: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleStudentSelection: (id: number) => void;
    isAddingKeyword: number | null;
    setIsAddingKeyword: (val: number | null) => void;
    newKeywordInput: string;
    setNewKeywordInput: (val: string) => void;
    addCustomKeyword: (id: number) => void;
    defaultKeywords: string[];
}

export const BehaviorWorkspace = ({
    polishAction,
    students,
    setStudents,
    isExpanded,
    setIsExpanded,
    handleAutoGenerateKeywords,
    handleGenerate,
    handleReset,
    handleResetAll,
    handleResetKeywords,
    handleDeleteUnusedKeywords,
    handleSelectedGenerate,
    handleAllGenerate,
    handleClearSelection,
    toggleAllSelection,
    toggleStudentSelection,
    isAddingKeyword,
    setIsAddingKeyword,
    newKeywordInput,
    setNewKeywordInput,
    addCustomKeyword,
    defaultKeywords,
}: BehaviorWorkspaceProps) => {
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    const [expandedKeywordRows, setExpandedKeywordRows] = useState<Set<number>>(new Set());
    const selectedCount = students.filter(s => s.selected).length;

    const toggleKeywordRow = (studentId: number) => {
        setExpandedKeywordRows(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    // 전체화면일 때 뒤 페이지가 함께 스크롤되지 않게 한다(교과·창체와 같은 동작).
    useEffect(() => {
        if (!isExpanded) return;
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, [isExpanded]);

    return (
        <>
        {isExpanded && <div aria-hidden="true" className="fixed inset-0 z-[199] bg-slate-100/90 backdrop-blur-sm dark:bg-slate-950/90" />}
        <section
            aria-label="학생별 기록"
            className={cn(
                workspaceCardClassName,
                "space-y-4 p-4 sm:p-5",
                isExpanded && "fixed inset-4 z-[200] overflow-y-auto overscroll-contain shadow-2xl"
            )}
        >
            <WorkspaceCardHeader
                icon={<UserCheck />}
                accent="sky"
                title="학생별 기록"
                description="키워드를 기반으로 생활기록부 작성을 시작하세요."
                actions={<>
                    {polishAction}
                    <Button variant="outline" onClick={handleAutoGenerateKeywords} className={workspaceToolButtonClassName}>
                        <Brain aria-hidden="true" className="text-violet-500" />키워드 자동생성
                    </Button>
                    <Button
                        variant="outline"
                        aria-label={isExpanded ? "전체화면 닫기" : "전체화면으로 넓게 보기"}
                        title={isExpanded ? "전체화면 닫기" : "전체화면으로 넓게 보기"}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(workspaceToolButtonClassName, "w-9 px-0")}
                    >
                        {isExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                    </Button>
                </>}
            />

            <div className={cn("rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40", workspaceTableScrollClassName(isExpanded, "lg"))}>
                <div className="w-fit min-w-full">
                    <div className={cn(workspaceStickyHeadClassName(isExpanded, "lg"), "rounded-t-xl")}>
                        <div className={cn("grid items-center gap-4 px-5 py-2.5", GRID_COLUMNS, workspaceTableHeadClassName)}>
                            <div className="flex items-center justify-center">
                                <input type="checkbox" onChange={toggleAllSelection} aria-label="모든 학생 선택"
                                    checked={students.length > 0 && students.every(s => s.selected)} className={workspaceCheckboxClassName} />
                            </div>
                            <div className="text-center">번호</div>
                            <div>행동특성 키워드 (2개 이상)</div>
                            <div>작성 결과</div>
                            <div className="text-center">관리</div>
                        </div>
                    </div>

                    <div className="space-y-2 p-2 sm:p-3">
                        {students.map((student) => {
                            const isRowOpen = expandedRowId === student.id;
                            const allKeywords = Array.from(new Set([...defaultKeywords, ...student.customKeywords]));
                            const isKeywordRowOpen = expandedKeywordRows.has(student.id);
                            const visibleKeywords = isKeywordRowOpen ? allKeywords : allKeywords.slice(0, KEYWORD_PREVIEW_LIMIT);
                            const hiddenKeywordCount = allKeywords.length - visibleKeywords.length;
                            return (
                            <div
                                key={student.id} data-student-id={student.id}
                                className={cn(
                                    "group/row grid items-start gap-4 px-3 py-3",
                                    GRID_COLUMNS,
                                    workspaceRowClassName(student.selected, "sky"),
                                    isRowOpen && "ring-2 ring-primary/20"
                                )}
                            >
                                <div className="flex items-center justify-center pt-1.5">
                                    <input
                                        type="checkbox"
                                        aria-label={`${student.id}번 학생 선택`}
                                        checked={student.selected}
                                        onChange={() => toggleStudentSelection(student.id)}
                                        className={workspaceCheckboxClassName}
                                    />
                                </div>
                                <div className={cn(workspaceRowNumberClassName, "whitespace-nowrap pt-1 text-center")}>{student.id}번</div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {visibleKeywords.map(k => {
                                            const isSelected = student.selectedKeywords.includes(k);
                                            return (
                                            <button
                                                key={k}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => {
                                                    setStudents(prev => prev.map(s => s.id === student.id ? {
                                                        ...s,
                                                        selectedKeywords: isSelected ? s.selectedKeywords.filter(kw => kw !== k) : [...s.selectedKeywords, k]
                                                    } : s));
                                                }}
                                                className={cn(
                                                    "rounded-lg border px-2.5 py-1 text-xs font-medium leading-5 transition-colors",
                                                    isSelected
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                                                )}
                                            >
                                                {k}
                                            </button>
                                            );
                                        })}
                                        {hiddenKeywordCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleKeywordRow(student.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium leading-5 text-slate-500 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-sky-800 dark:hover:bg-sky-950/40 dark:hover:text-sky-300"
                                            >
                                                더보기 {hiddenKeywordCount}
                                                <ChevronDown aria-hidden="true" className="size-3.5" />
                                            </button>
                                        )}
                                        {isKeywordRowOpen && allKeywords.length > KEYWORD_PREVIEW_LIMIT && (
                                            <button
                                                type="button"
                                                onClick={() => toggleKeywordRow(student.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium leading-5 text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
                                            >
                                                접기
                                                <ChevronUp aria-hidden="true" className="size-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {isAddingKeyword === student.id ? (
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                autoFocus
                                                value={newKeywordInput}
                                                onChange={(e) => setNewKeywordInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addCustomKeyword(student.id)}
                                                placeholder="키워드 입력"
                                                aria-label={`${student.id}번 학생 새 키워드`}
                                                className="h-8 w-36 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                            />
                                            <Button aria-label={`${student.id}번 학생 키워드 추가`} onClick={() => addCustomKeyword(student.id)} className="size-8 rounded-lg p-0"><CheckCircle2 aria-hidden="true" /></Button>
                                            <Button aria-label="키워드 추가 취소" onClick={() => setIsAddingKeyword(null)} variant="ghost" className="size-8 rounded-lg p-0 text-slate-500"><X aria-hidden="true" /></Button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingKeyword(student.id);
                                                setNewKeywordInput("");
                                            }}
                                            className="inline-flex w-fit items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium leading-5 text-slate-500 transition-colors hover:border-slate-400 hover:bg-white hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                            <Plus aria-hidden="true" className="size-3.5" /> 키워드 직접 추가
                                        </button>
                                    )}
                                </div>

                                <div className={cn("group/txt relative", isRowOpen && "col-span-full row-start-2 max-w-[calc(100vw-6rem)]")}>
                                    <div
                                        onClick={() => { if (!isRowOpen && !student.isGenerating) setExpandedRowId(student.id); }}
                                        className={cn(
                                            "rounded-xl text-sm leading-relaxed transition-colors",
                                            isRowOpen ? "min-h-[180px] p-4" : "h-[96px] cursor-pointer overflow-hidden p-3 pr-10 hover:border-sky-200 dark:hover:border-sky-800",
                                            student.aiResult ? "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" : "border border-dashed border-slate-200 bg-white/60 text-slate-400 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-500"
                                        )}
                                    >
                                        {student.isGenerating ? (
                                            <div className="flex flex-col gap-3 pt-1">
                                                <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                                                <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                                                <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                                            </div>
                                        ) : isRowOpen ? (
                                            <textarea
                                                autoFocus
                                                aria-label={`${student.id}번 학생 작성 결과`}
                                                value={student.aiResult}
                                                placeholder="선택된 키워드가 없습니다. 키워드를 클릭하고 생성을 눌러주세요."
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                }}
                                                className="min-h-[160px] w-full resize-none border-none bg-transparent p-0 leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-300 dark:placeholder:text-slate-500"
                                            />
                                        ) : (
                                            <div className="line-clamp-3">{student.aiResult || "선택된 키워드가 없습니다. 키워드를 클릭하고 생성을 눌러주세요."}</div>
                                        )}
                                    </div>
                                    {!student.isGenerating && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setExpandedRowId(isRowOpen ? null : student.id); }}
                                            title={isRowOpen ? "접기" : "펼쳐서 편집"}
                                            aria-label={isRowOpen ? `${student.id}번 결과 접기` : `${student.id}번 결과 펼쳐서 편집`}
                                            className={cn(
                                                "absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg border transition-colors",
                                                isRowOpen ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-400 opacity-0 hover:text-primary focus-visible:opacity-100 group-hover/txt:opacity-100 dark:border-slate-700 dark:bg-slate-800"
                                            )}
                                        >
                                            {isRowOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-col items-stretch gap-1" style={{ gridColumn: "-2 / -1", gridRow: 1 }}>
                                    <GenerationMenu
                                        onGenerate={mode => handleGenerate(student.id, mode)}
                                        disabled={student.selectedKeywords.length < 2 || student.isGenerating}
                                        className={workspaceRowGenerateClassName(Boolean(student.aiResult))}
                                    >
                                        <Sparkles aria-hidden="true" />{student.aiResult ? "재생성" : "생성"}
                                    </GenerationMenu>
                                    <button type="button" onClick={() => handleReset(student.id)} className={workspaceRowResetClassName}>
                                        <RotateCcw aria-hidden="true" className="size-3.5" /> 초기화
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <WorkspaceActionBar selectedCount={selectedCount} onClearSelection={handleClearSelection} expanded={isExpanded}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className={workspaceSecondaryActionClassName}>
                            <RotateCcw aria-hidden="true" /> 초기화 <ChevronDown aria-hidden="true" className="opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[300] w-56 rounded-xl p-1.5">
                        <DropdownMenuItem onClick={handleResetAll} className="rounded-lg px-2.5 py-2 font-medium">
                            <RotateCcw aria-hidden="true" className="text-slate-400" /> 전체 초기화
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleResetKeywords} className="rounded-lg px-2.5 py-2 font-medium">
                            <X aria-hidden="true" className="text-sky-500" /> 키워드 초기화
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteUnusedKeywords} className="rounded-lg px-2.5 py-2 font-medium text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40">
                            <Trash2 aria-hidden="true" className="text-red-500" /> 미선택 키워드만 삭제
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <GenerationMenu onGenerate={handleSelectedGenerate} variant="outline" className={workspaceSecondaryActionClassName}>
                    <UserCheck aria-hidden="true" /> 선택 생성
                </GenerationMenu>
                <GenerationMenu onGenerate={handleAllGenerate} className={workspacePrimaryActionClassName}>
                    <Zap aria-hidden="true" /> 전체 생성
                </GenerationMenu>
            </WorkspaceActionBar>
        </section>
        </>
    );
};
