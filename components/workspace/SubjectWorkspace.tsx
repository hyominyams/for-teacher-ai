"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import {
    Zap,
    BookOpen,
    Maximize2,
    Minimize2,
    Plus,
    Sparkles,
    RotateCcw,
    UserCheck,
    Trash2,
    Settings2,
    Target,
    ChevronDown,
    ChevronUp,
    GripVertical
} from "lucide-react";
import { normalizeSchoolLevel } from "@/lib/subject-plan-values";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    type WorkspaceTableFit,
} from "@/components/workspace/WorkspaceControls";
import { createPortal } from "react-dom";
import { AchievementLevel, CriteriaLevels, Student, SubjectGlobalConfig, SubjectAssessmentInfo } from "@/types";

interface WrapperProps {
    children: React.ReactNode;
    isExpanded: boolean;
    mounted: boolean;
}

/** 전체화면은 body로 포털해 상위 transform·overflow 영향을 받지 않게 한다(기존 동작 유지). */
const Wrapper = ({ children, isExpanded, mounted }: WrapperProps) => {
    if (isExpanded && mounted) {
        return createPortal(
            <div className="fixed inset-0 z-[9999] isolate">
                <div className="pointer-events-auto absolute inset-0 bg-slate-100/90 backdrop-blur-sm dark:bg-slate-950/90" />
                {children}
            </div>,
            document.body
        );
    }
    return <>{children}</>;
};

const subjectFieldClassName = "h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold tabular-nums text-slate-900 shadow-none data-[size=default]:h-11 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const subjectTextInputClassName = "h-10 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const subjectTextAreaClassName = "w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900/50";

interface SubjectWorkspaceProps {
    savedEditor?: boolean;
    polishAction?: React.ReactNode;
    /** 평가계획 HWPX 가져오기 버튼(파일 입력과 처리는 RecordWorkspace에 있다) */
    planImportAction?: React.ReactNode;
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    globalConfig: SubjectGlobalConfig;
    setGlobalConfig: React.Dispatch<React.SetStateAction<SubjectGlobalConfig>>;
    subjectLogs: Array<{
        scopeKey: string;
        scopeLabel: string;
        updatedAt?: string;
        createdAt?: string;
    }>;
    activeSubjectScopeKey: string;
    onSubjectScopeChange: (scopeKey: string) => void;
    onCreateSubjectLog: () => void;
    onDeleteSubjectLog: (scopeKey: string) => void;
    onDeleteAllSubjectLogs: () => void;
    onReorderSubjectLogs: (fromScopeKey: string, toScopeKey: string) => void;
    handleGenerate: (id: number) => void;
    handleAllGenerate: () => void;
    handleSelectedGenerate: () => void;
    handleResetAll: () => void;
    handleClearSelection?: () => void;
    toggleAllSelection: React.ChangeEventHandler<HTMLInputElement>;
    toggleStudentSelection: (id: number) => void;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const getDisplaySubjectLabel = (label: string) => {
    const normalized = (label || "교과").trim();
    return normalized.replace(/\s+\d{2}\.\d{2}\.\d{2}:\d{2}$/, "").trim() || "교과";
};

const ACHIEVEMENT_LEVELS: AchievementLevel[] = ["상", "중", "하"];

const stripLevelPrefix = (value: string, level: AchievementLevel) => (
    value.replace(new RegExp(`^\\s*${level}\\s*[):：:\\-]\\s*`), "").trim()
);

const splitCriteriaLevelsFromText = (criteria: string): CriteriaLevels => {
    const levels: CriteriaLevels = {};
    const text = criteria.trim();
    if (!text) return levels;

    const markers = Array.from(text.matchAll(/(?:^|\n)\s*([상중하])\s*[):：:\-]\s*/g))
        .map((match) => ({
            level: match[1] as AchievementLevel,
            contentStart: (match.index || 0) + match[0].length,
            markerStart: match.index || 0,
        }));

    if (markers.length > 0) {
        markers.forEach((marker, index) => {
            const nextMarker = markers[index + 1];
            const value = text
                .slice(marker.contentStart, nextMarker ? nextMarker.markerStart : text.length)
                .trim();
            levels[marker.level] = value;
        });
        return levels;
    }

    const lines = text
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
        .filter(Boolean);
    if (lines.length === 3) {
        ACHIEVEMENT_LEVELS.forEach((level, index) => {
            levels[level] = stripLevelPrefix(lines[index], level);
        });
        return levels;
    }

    return levels;
};

const getAssessmentCriteriaLevels = (assessment: SubjectAssessmentInfo): CriteriaLevels => (
    assessment.criteriaLevels ?? splitCriteriaLevelsFromText(assessment.criteria)
);

const formatCriteriaFromLevels = (levels: CriteriaLevels) => (
    ACHIEVEMENT_LEVELS
        .map((level) => {
            const value = levels[level]?.trim();
            return value ? `${level}: ${value}` : "";
        })
        .filter(Boolean)
        .join("\n")
);

export const SubjectWorkspace = ({
    savedEditor = false,
    polishAction,
    planImportAction,
    students,
    setStudents,
    globalConfig,
    setGlobalConfig,
    subjectLogs,
    activeSubjectScopeKey,
    onSubjectScopeChange,
    onCreateSubjectLog,
    onDeleteSubjectLog,
    onDeleteAllSubjectLogs,
    onReorderSubjectLogs,
    handleGenerate,
    handleAllGenerate,
    handleSelectedGenerate,
    handleResetAll,
    handleClearSelection,
    toggleAllSelection,
    toggleStudentSelection,
    isExpanded,
    setIsExpanded
}: SubjectWorkspaceProps) => {
    const [bulkAssessmentId, setBulkAssessmentId] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    // 평가 기준 섹션: 사용자가 직접 열고 닫기 전에는 평가가 없을 때만 펼친다. 교과를 바꾸면 다시 자동으로 돌아간다.
    const [criteriaOpenOverride, setCriteriaOpenOverride] = useState<boolean | null>(null);
    const [criteriaScopeKey, setCriteriaScopeKey] = useState(activeSubjectScopeKey);
    if (criteriaScopeKey !== activeSubjectScopeKey) {
        setCriteriaScopeKey(activeSubjectScopeKey);
        setCriteriaOpenOverride(null);
    }
    const criteriaOpen = criteriaOpenOverride ?? (globalConfig.assessments.length === 0);
    const [draggedSubjectScopeKey, setDraggedSubjectScopeKey] = useState<string | null>(null);
    const [dragOverSubjectScopeKey, setDragOverSubjectScopeKey] = useState<string | null>(null);
    const suppressSubjectClickRef = useRef(false);

    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

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

    const addAssessment = () => {
        const newId = crypto.randomUUID();
        setGlobalConfig(prev => ({
            ...prev,
            assessments: [
                ...prev.assessments,
                { id: newId, area: "", standard: "", criteria: "", criteriaLevels: {}, competency: "" }
            ]
        }));
    };

    const removeAssessment = (id: string) => {
        setGlobalConfig(prev => ({
            ...prev,
            assessments: prev.assessments.filter(a => a.id !== id)
        }));
    };

    const updateAssessment = (id: string, field: keyof SubjectAssessmentInfo, value: string) => {
        setGlobalConfig(prev => ({
            ...prev,
            assessments: prev.assessments.map(a => a.id === id ? { ...a, [field]: value } : a)
        }));
    };

    const updateAssessmentCriteriaLevel = (id: string, level: AchievementLevel, value: string) => {
        setGlobalConfig(prev => ({
            ...prev,
            assessments: prev.assessments.map(assessment => {
                if (assessment.id !== id) return assessment;

                const nextLevels = {
                    ...getAssessmentCriteriaLevels(assessment),
                    [level]: value,
                };

                return {
                    ...assessment,
                    criteriaLevels: nextLevels,
                    criteria: formatCriteriaFromLevels(nextLevels),
                };
            })
        }));
    };

    const handleLevelChange = (studentId: number, assessmentId: string, level: "상" | "중" | "하" | "") => {
        setStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            const currentSubjectData = s.subjectData || { assessments: [], individualNote: "" };
            const existingAssessments = currentSubjectData.assessments || [];
            const updatedAssessments = existingAssessments.find(a => a.assessmentId === assessmentId)
                ? existingAssessments.map(a => a.assessmentId === assessmentId ? { ...a, level } : a)
                : [...existingAssessments, { assessmentId, level }];

            return {
                ...s,
                subjectData: {
                    ...currentSubjectData,
                    assessments: updatedAssessments
                }
            };
        }));
    };

    const applyBulkAssessmentLevel = (assessmentId: string, level: "상" | "중" | "하" | "") => {
        if (selectedStudentCount === 0) return;

        setStudents(prev => prev.map(student => {
            if (!student.selected) return student;

            const currentSubjectData = student.subjectData || { assessments: [], individualNote: "" };
            const existingAssessments = currentSubjectData.assessments || [];
            const updatedAssessments = existingAssessments.find(a => a.assessmentId === assessmentId)
                ? existingAssessments.map(a => a.assessmentId === assessmentId ? { ...a, level } : a)
                : [...existingAssessments, { assessmentId, level }];

            return {
                ...student,
                subjectData: {
                    ...currentSubjectData,
                    assessments: updatedAssessments
                }
            };
        }));
        setBulkAssessmentId(null);
    };

    const handleNoteChange = (studentId: number, note: string) => {
        setStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            return {
                ...s,
                subjectData: {
                    ...(s.subjectData || { assessments: [], individualNote: "" }),
                    individualNote: note
                }
            };
        }));
    };

    // 열: 선택(32) + 번호(52) + 평가 수(각 96) + 특이사항 + 작성 결과 + 관리(120). 평가가 없으면 평가 열을 만들지 않는다.
    const assessmentCount = globalConfig.assessments.length;
    const assessmentCols = assessmentCount > 0 ? "96px ".repeat(assessmentCount) : "";
    const gridTemplateCols = `32px 52px ${assessmentCols}minmax(180px, 1fr) minmax(280px, 2.5fr) 120px`;
    // 표 최소 폭이 카드 안에 들어오는 폭에서만 페이지 스크롤 고정 머리글을 쓴다.
    const tableFit: WorkspaceTableFit = assessmentCount <= 3 ? "xl" : assessmentCount <= 5 ? "2xl" : "none";
    const currentSubjectLabel = globalConfig.subjectName.trim() || "새 교과";
    const activeSubjectLogExists = subjectLogs.some(log => log.scopeKey === activeSubjectScopeKey);
    const rawSubjectSelectItems = activeSubjectLogExists
        ? subjectLogs
        : [{ scopeKey: activeSubjectScopeKey, scopeLabel: currentSubjectLabel }, ...subjectLogs];
    const subjectLabelCounts = rawSubjectSelectItems.reduce<Record<string, number>>((counts, log) => {
        const label = getDisplaySubjectLabel(log.scopeLabel);
        counts[label] = (counts[label] || 0) + 1;
        return counts;
    }, {});
    const subjectLabelSeen: Record<string, number> = {};
    const subjectSelectItems = rawSubjectSelectItems.map(log => {
        const displayLabel = getDisplaySubjectLabel(log.scopeLabel);
        subjectLabelSeen[displayLabel] = (subjectLabelSeen[displayLabel] || 0) + 1;
        return {
            ...log,
            displayLabel,
            shortLabel: subjectLabelCounts[displayLabel] > 1
                ? `${displayLabel} #${subjectLabelSeen[displayLabel]}`
                : displayLabel,
        };
    });
    const selectedStudentCount = students.filter(s => s.selected).length;

    const handleSubjectDragStart = (event: React.DragEvent<HTMLButtonElement>, scopeKey: string) => {
        setDraggedSubjectScopeKey(scopeKey);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", scopeKey);
    };

    const handleSubjectDragOver = (event: React.DragEvent<HTMLButtonElement>, scopeKey: string) => {
        if (!draggedSubjectScopeKey || draggedSubjectScopeKey === scopeKey) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOverSubjectScopeKey(scopeKey);
    };

    const resetSubjectDragState = () => {
        setDraggedSubjectScopeKey(null);
        setDragOverSubjectScopeKey(null);
    };

    const suppressNextSubjectClick = () => {
        suppressSubjectClickRef.current = true;
        window.setTimeout(() => {
            suppressSubjectClickRef.current = false;
        }, 0);
    };

    const handleSubjectDrop = (event: React.DragEvent<HTMLButtonElement>, scopeKey: string) => {
        event.preventDefault();
        const fromScopeKey = draggedSubjectScopeKey || event.dataTransfer.getData("text/plain");
        if (fromScopeKey && fromScopeKey !== scopeKey) {
            onReorderSubjectLogs(fromScopeKey, scopeKey);
            suppressNextSubjectClick();
        }
        resetSubjectDragState();
    };

    return (
        <Wrapper isExpanded={isExpanded} mounted={mounted}>
            <section
                aria-label="학생별 기록"
                className={cn(
                    workspaceCardClassName,
                    "relative space-y-4 p-4 sm:p-5",
                    isExpanded && "pointer-events-auto fixed inset-4 overflow-y-auto overscroll-contain shadow-2xl"
                )}
            >
                <WorkspaceCardHeader
                    icon={<BookOpen />}
                    accent="indigo"
                    title="학생별 기록"
                    description={isExpanded ? `${currentSubjectLabel} · 학생 평가 수준과 결과 입력` : "성취수준을 바탕으로 생활기록부 작성을 시작하세요."}
                    actions={<>
                        {polishAction}
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

                {!isExpanded && (
                <section aria-label="교과 기본정보와 교과 선택" className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20 sm:p-4">
                    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[144px_112px_minmax(0,1fr)] lg:grid-cols-[144px_112px_minmax(0,1fr)_auto]">
                        <div className="min-w-0 space-y-1.5">
                            <Label htmlFor="subject-school-level" className="text-xs font-semibold text-slate-600 dark:text-slate-400">학교급</Label>
                            <Select value={globalConfig.schoolLevel ? normalizeSchoolLevel(globalConfig.schoolLevel) : ""} onValueChange={(val) => setGlobalConfig(p => ({ ...p, schoolLevel: val }))}>
                                <SelectTrigger id="subject-school-level" className={subjectFieldClassName}>
                                    <SelectValue placeholder="학교급 선택" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="elementary">초등학교</SelectItem>
                                    <SelectItem value="middle">중학교</SelectItem>
                                    <SelectItem value="high">고등학교</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <Label htmlFor="subject-grade" className="text-xs font-semibold text-slate-600 dark:text-slate-400">학년</Label>
                            <Select value={globalConfig.grade} onValueChange={(val) => setGlobalConfig(p => ({ ...p, grade: val }))}>
                                <SelectTrigger id="subject-grade" className={subjectFieldClassName}>
                                    <SelectValue placeholder="학년 선택" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {[1, 2, 3, 4, 5, 6].map(g => (
                                        <SelectItem key={g} value={g.toString()}>{g}학년</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
                            <Label htmlFor="subject-name" className="text-xs font-semibold text-slate-600 dark:text-slate-400">교과명</Label>
                            <Input
                                id="subject-name"
                                value={globalConfig.subjectName}
                                onChange={(e) => setGlobalConfig(p => ({ ...p, subjectName: e.target.value }))}
                                placeholder="예: 국어, 수학, 통합교과(봄) 등"
                                className="h-11 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                        {!savedEditor && (
                            <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-1">
                                <Button variant="outline" onClick={onCreateSubjectLog} className="h-11 gap-1.5 rounded-xl border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-none hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50">
                                    <Plus aria-hidden="true" /> 새 교과
                                </Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-11 gap-1.5 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                            교과 관리 <ChevronDown aria-hidden="true" className="opacity-60" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-56 rounded-xl border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
                                        <p className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">교과 삭제</p>
                                        <Button variant="ghost" onClick={() => onDeleteSubjectLog(activeSubjectScopeKey)} disabled={subjectLogs.length === 0} className="h-10 w-full justify-start gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <Trash2 aria-hidden="true" /> 현재 교과 삭제
                                        </Button>
                                        <Button variant="ghost" onClick={onDeleteAllSubjectLogs} disabled={subjectLogs.length === 0 && globalConfig.assessments.length === 0 && !globalConfig.subjectName.trim()} className="h-10 w-full justify-start gap-2 rounded-lg px-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40">
                                            <Trash2 aria-hidden="true" /> 전체 교과 삭제
                                        </Button>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                    {!savedEditor && (
                    <div role="group" aria-label="교과 선택 · 드래그해서 순서 변경" className="custom-scrollbar flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden border-t border-indigo-100 pb-1 pr-1 pt-3 dark:border-indigo-900">
                        {subjectSelectItems.map(log => {
                            const isActive = log.scopeKey === activeSubjectScopeKey;
                            const isRealSubjectLog = subjectLogs.some(subjectLog => subjectLog.scopeKey === log.scopeKey);
                            const isDragging = draggedSubjectScopeKey === log.scopeKey;
                            const isDragOver = dragOverSubjectScopeKey === log.scopeKey;
                            return (
                                <button
                                    key={log.scopeKey}
                                    type="button"
                                    aria-pressed={isActive}
                                    draggable={isRealSubjectLog}
                                    onDragStart={(event) => handleSubjectDragStart(event, log.scopeKey)}
                                    onDragOver={(event) => handleSubjectDragOver(event, log.scopeKey)}
                                    onDragLeave={() => {
                                        if (isDragOver) setDragOverSubjectScopeKey(null);
                                    }}
                                    onDrop={(event) => handleSubjectDrop(event, log.scopeKey)}
                                    onDragEnd={() => {
                                        if (draggedSubjectScopeKey) suppressNextSubjectClick();
                                        resetSubjectDragState();
                                    }}
                                    onClick={() => {
                                        if (suppressSubjectClickRef.current) return;
                                        onSubjectScopeChange(log.scopeKey);
                                    }}
                                    className={cn(
                                        "h-9 min-w-16 max-w-[160px] shrink-0 rounded-xl border px-3 text-xs font-semibold transition-colors",
                                        isRealSubjectLog ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                                        isActive
                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                            : "border-indigo-100 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700 dark:border-indigo-900 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300",
                                        isDragging && "opacity-50",
                                        isDragOver && "border-indigo-300 ring-4 ring-indigo-100 dark:ring-indigo-900/60"
                                    )}
                                    title={`${log.scopeLabel || "교과"}${isRealSubjectLog ? " - 드래그해서 순서 변경" : ""}`}
                                >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <GripVertical aria-hidden="true" className="size-3 shrink-0 opacity-50" />
                                        <span className="truncate">{log.shortLabel}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    )}
                </section>
                )}

                {!isExpanded && (
                <section aria-labelledby="subject-criteria-heading" className="rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                        <button
                            type="button"
                            aria-expanded={criteriaOpen}
                            aria-controls="subject-criteria-panel"
                            onClick={() => setCriteriaOpenOverride(!criteriaOpen)}
                            className="-mx-1.5 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                            <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-slate-400 transition-transform", !criteriaOpen && "-rotate-90")} />
                            <Settings2 aria-hidden="true" className="size-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                            <span id="subject-criteria-heading" className="text-sm font-semibold text-slate-900 dark:text-white">평가 기준</span>
                            <Badge variant="secondary" className="rounded-md border-indigo-100 bg-indigo-50 px-1.5 py-0 text-xs font-semibold tabular-nums text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">{globalConfig.assessments.length}</Badge>
                            {!criteriaOpen && (
                                <span className="hidden min-w-0 truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                                    {globalConfig.assessments.length > 0
                                        ? globalConfig.assessments.map((a, i) => `평가 ${i + 1} · ${a.area.trim() || "영역 미입력"}`).join("   ")
                                        : "평가 영역과 상·중·하 기준을 입력하세요"}
                                </span>
                            )}
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                            {planImportAction}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    addAssessment();
                                    setCriteriaOpenOverride(true);
                                }}
                                className={cn(workspaceToolButtonClassName, "border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50")}
                            >
                                <Plus aria-hidden="true" /> 평가정보 추가
                            </Button>
                        </div>
                    </div>

                    {criteriaOpen && (
                    <div id="subject-criteria-panel" className="space-y-3 border-t border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30 sm:p-4">
                        {globalConfig.assessments.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                아직 평가정보가 없습니다. 평가계획 HWPX를 가져오거나 &lsquo;평가정보 추가&rsquo;로 직접 입력하세요.
                            </p>
                        )}
                        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                            {globalConfig.assessments.map((assessment, index) => {
                                const criteriaLevels = getAssessmentCriteriaLevels(assessment);
                                return (
                                <article key={assessment.id} aria-label={`평가 ${index + 1}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex items-end gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold tabular-nums text-white">
                                            {index + 1}
                                        </div>
                                        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                                            <label className="min-w-0 space-y-1.5">
                                                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">영역 (대단원)</span>
                                                <Input
                                                    value={assessment.area}
                                                    onChange={(e) => updateAssessment(assessment.id, "area", e.target.value)}
                                                    placeholder="예: 듣기, 화법과 작문 등"
                                                    className={subjectTextInputClassName}
                                                />
                                            </label>
                                            <label className="min-w-0 space-y-1.5">
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    <Target aria-hidden="true" className="size-3.5 text-indigo-500 dark:text-indigo-400" /> 관련 핵심 역량
                                                </span>
                                                <Input
                                                    value={assessment.competency}
                                                    onChange={(e) => updateAssessment(assessment.id, "competency", e.target.value)}
                                                    placeholder="예: 비판적 사고 역량, 의사소통 역량"
                                                    className={subjectTextInputClassName}
                                                />
                                            </label>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => removeAssessment(assessment.id)}
                                            aria-label={`평가 ${index + 1} 삭제`}
                                            title="평가정보 삭제"
                                            className="size-9 shrink-0 rounded-lg p-0 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </Button>
                                    </div>

                                    <label className="block space-y-1.5">
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            <span aria-hidden="true" className="size-1.5 rounded-full bg-indigo-400" /> 성취기준
                                        </span>
                                        <textarea
                                            value={assessment.standard}
                                            onChange={(e) => updateAssessment(assessment.id, "standard", e.target.value)}
                                            placeholder="예: [4국02-02] 문단과 글에서 중심 생각을 파악하고..."
                                            rows={2}
                                            className={cn(subjectTextAreaClassName, "min-h-[64px]")}
                                        />
                                    </label>

                                    <div className="space-y-1.5">
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-400" /> 평가기준
                                        </span>
                                        <div className="grid gap-2 lg:grid-cols-3">
                                            {ACHIEVEMENT_LEVELS.map((level) => (
                                                <label key={level} className="relative block">
                                                    <span className={cn(
                                                        "absolute left-2 top-2 inline-flex h-5 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-semibold",
                                                        level === "상" && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
                                                        level === "중" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                                                        level === "하" && "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                                                    )}>
                                                        {level}
                                                    </span>
                                                    <textarea
                                                        value={criteriaLevels[level] || ""}
                                                        onChange={(e) => updateAssessmentCriteriaLevel(assessment.id, level, e.target.value)}
                                                        placeholder={`${level} 수준 평가기준`}
                                                        aria-label={`평가 ${index + 1} ${level} 수준 평가기준`}
                                                        rows={3}
                                                        className={cn(subjectTextAreaClassName, "min-h-[88px] resize-y pt-8")}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                                );
                            })}
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setGlobalConfig({ schoolLevel: "", grade: "", subjectName: "", assessments: [] })}
                                variant="ghost"
                                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                                <RotateCcw aria-hidden="true" className="size-3.5" /> 입력 정보 초기화
                            </Button>
                        </div>
                    </div>
                    )}
                </section>
                )}

                <div className={cn("rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40", workspaceTableScrollClassName(isExpanded, tableFit))}>
                    <div className="w-fit min-w-full">
                        <div className={cn(workspaceStickyHeadClassName(isExpanded, tableFit), "rounded-t-xl")}>
                            <div
                                className={cn("grid items-center gap-4 px-5 py-2.5", workspaceTableHeadClassName)}
                                style={{ gridTemplateColumns: gridTemplateCols }}
                            >
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        onChange={toggleAllSelection}
                                        aria-label="모든 학생 선택"
                                        checked={students.length > 0 && students.every(s => s.selected)}
                                        className={workspaceCheckboxClassName}
                                    />
                                </div>
                                <div className="text-center">번호</div>
                                {globalConfig.assessments.map((a, i) => (
                                    <Popover
                                        key={a.id}
                                        open={bulkAssessmentId === a.id}
                                        onOpenChange={(open) => setBulkAssessmentId(open ? a.id : null)}
                                    >
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                title={`${a.area || `평가 ${i + 1}`} 일괄 입력`}
                                                aria-label={`평가 ${i + 1} ${a.area || ""} 선택 학생 일괄 입력`.replace(/\s+/g, " ")}
                                                className="min-w-0 rounded-lg px-2 py-1 text-center text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                                            >
                                                <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
                                                    <span className="truncate">평가 {i + 1}</span>
                                                    <ChevronDown aria-hidden="true" className="size-3 shrink-0 opacity-60" />
                                                </span>
                                                <span className="block truncate text-xs font-normal leading-4 text-slate-500 dark:text-slate-400">
                                                    {a.area || "영역"}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="z-[10000] w-44 rounded-xl border-slate-200 p-1.5 shadow-xl dark:border-slate-700" align="center">
                                            <div className="grid gap-0.5">
                                                <div className="border-b border-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                                    {selectedStudentCount > 0 ? `${selectedStudentCount}명 선택` : "학생을 선택하세요"}
                                                </div>
                                                {(["상", "중", "하"] as const).map((level) => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        disabled={selectedStudentCount === 0}
                                                        onClick={() => applyBulkAssessmentLevel(a.id, level)}
                                                        className="flex h-9 w-full items-center rounded-lg px-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 dark:disabled:text-slate-600"
                                                    >
                                                        {level} 입력
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    disabled={selectedStudentCount === 0}
                                                    onClick={() => applyBulkAssessmentLevel(a.id, "")}
                                                    className="flex h-9 w-full items-center rounded-lg px-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-red-950/40 dark:disabled:text-slate-600"
                                                >
                                                    비우기
                                                </button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                ))}
                                <div>개별 특이사항 (선택)</div>
                                <div>작성 결과</div>
                                <div className="text-center">관리</div>
                            </div>
                        </div>

                        <div className="space-y-2 p-2 sm:p-3">
                            {students.map((student) => {
                                const isRowOpen = expandedRowId === student.id;
                                return (
                                <div
                                    key={student.id}
                                    data-student-id={student.id}
                                    className={cn(
                                        "group/row grid items-start gap-4 px-3 py-3",
                                        workspaceRowClassName(student.selected, "indigo"),
                                        isRowOpen && "ring-2 ring-indigo-400/30"
                                    )}
                                    style={{ gridTemplateColumns: gridTemplateCols }}
                                >
                                    <div className="flex items-center justify-center pt-2.5">
                                        <input
                                            type="checkbox"
                                            aria-label={`${student.id}번 학생 선택`}
                                            checked={student.selected}
                                            onChange={() => toggleStudentSelection(student.id)}
                                            className={workspaceCheckboxClassName}
                                        />
                                    </div>
                                    <div className={cn(workspaceRowNumberClassName, "whitespace-nowrap pt-2 text-center")}>{student.id}번</div>

                                    {globalConfig.assessments.map((a, i) => {
                                        const val = student.subjectData?.assessments?.find(sa => sa.assessmentId === a.id)?.level || "";
                                        return (
                                            <div key={a.id}>
                                                <Select
                                                    value={val || "none"}
                                                    onValueChange={(v) => {
                                                        const level = v === "상" || v === "중" || v === "하" ? v : "";
                                                        handleLevelChange(student.id, a.id, level);
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        aria-label={`${student.id}번 학생 평가 ${i + 1} 수준`}
                                                        className={cn(
                                                            "h-9 w-full rounded-xl border-slate-200 bg-white px-2.5 text-xs font-semibold shadow-none dark:border-slate-700 dark:bg-slate-900",
                                                            val === "상" && "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
                                                            val === "중" && "text-slate-800 dark:text-slate-200",
                                                            val === "하" && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
                                                            !val && "text-slate-400 dark:text-slate-500"
                                                        )}
                                                    >
                                                        <SelectValue placeholder="평가" />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[10080] rounded-xl">
                                                        <SelectItem value="none" className="text-slate-400">미선택</SelectItem>
                                                        <SelectItem value="상" className="font-semibold text-indigo-700 dark:text-indigo-300">상</SelectItem>
                                                        <SelectItem value="중" className="font-semibold text-slate-700 dark:text-slate-300">중</SelectItem>
                                                        <SelectItem value="하" className="font-semibold text-amber-800 dark:text-amber-200">하</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        );
                                    })}

                                    <div>
                                        <textarea
                                            value={student.subjectData?.individualNote || ""}
                                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                            aria-label={`${student.id}번 학생 개별 특이사항`}
                                            placeholder="학생 관찰 특이사항..."
                                            className="h-9 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700 outline-none transition-[height,border-color] placeholder:text-slate-400 focus:h-24 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900/50"
                                        />
                                    </div>

                                    <div className={cn("group/txt relative", isRowOpen && "col-span-full row-start-2 max-w-[calc(100vw-6rem)]")}>
                                        <div
                                            onClick={() => { if (!isRowOpen && !student.isGenerating) setExpandedRowId(student.id); }}
                                            className={cn(
                                                "rounded-xl text-sm leading-relaxed transition-colors",
                                                isRowOpen ? "min-h-[160px] p-4" : "h-[88px] cursor-pointer overflow-hidden p-3 pr-10 hover:border-indigo-200 dark:hover:border-indigo-800",
                                                student.aiResult ? "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" : "border border-dashed border-slate-200 bg-white/60 text-slate-400 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-500"
                                            )}
                                        >
                                            {student.isGenerating ? (
                                                <div className="flex flex-col gap-3 pt-1">
                                                    <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                                                    <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                                                </div>
                                            ) : isRowOpen ? (
                                                <textarea
                                                    autoFocus
                                                    aria-label={`${student.id}번 학생 작성 결과`}
                                                    value={student.aiResult}
                                                    placeholder="평가 수준을 선택해 생성하거나 직접 작성하세요."
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                    }}
                                                    className="min-h-[140px] w-full resize-none border-none bg-transparent p-0 leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-300 dark:placeholder:text-slate-500"
                                                />
                                            ) : (
                                                <div className="line-clamp-3">{student.aiResult || "평가 수준을 선택해 생성하거나 직접 작성하세요."}</div>
                                            )}
                                        </div>
                                        {!student.isGenerating && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setExpandedRowId(isRowOpen ? null : student.id); }}
                                                type="button"
                                                aria-label={isRowOpen ? `${student.id}번 결과 접기` : `${student.id}번 결과 편집`}
                                                title={isRowOpen ? "결과 접기" : "결과 편집"}
                                                className={cn(
                                                    "absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg border transition-colors",
                                                    isRowOpen ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-400 opacity-0 hover:text-indigo-600 focus-visible:opacity-100 group-hover/txt:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-indigo-300"
                                                )}
                                            >
                                                {isRowOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-stretch gap-1" style={{ gridColumn: "-2 / -1", gridRow: 1 }}>
                                        <Button
                                            onClick={() => handleGenerate(student.id)}
                                            title={student.aiResult ? "기존 문장을 새로 생성한 문장으로 바꿉니다." : "평가 수준과 개별 관찰 내용을 바탕으로 생성합니다."}
                                            disabled={student.isGenerating || !student.subjectData?.assessments.some(a => a.level && globalConfig.assessments.some(g => g.id === a.assessmentId))}
                                            className={workspaceRowGenerateClassName(Boolean(student.aiResult))}
                                        >
                                            <Sparkles aria-hidden="true" />{student.aiResult ? "재생성" : "생성"}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStudents(prev => prev.map(s => s.id === student.id ? {
                                                    ...s,
                                                    subjectData: { assessments: [], individualNote: "" },
                                                    aiResult: ""
                                                } : s));
                                            }}
                                            className={workspaceRowResetClassName}
                                        >
                                            <RotateCcw aria-hidden="true" className="size-3.5" /> 초기화
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <WorkspaceActionBar selectedCount={selectedStudentCount} onClearSelection={handleClearSelection} expanded={isExpanded}>
                    <Button variant="outline" onClick={handleResetAll} className={workspaceSecondaryActionClassName}>
                        <RotateCcw aria-hidden="true" /> 전체 초기화
                    </Button>
                    <Button variant="outline" onClick={handleSelectedGenerate} className={workspaceSecondaryActionClassName}>
                        <UserCheck aria-hidden="true" /> 선택 생성
                    </Button>
                    <Button onClick={handleAllGenerate} className={workspacePrimaryActionClassName}>
                        <Zap aria-hidden="true" /> 전체 생성
                    </Button>
                </WorkspaceActionBar>
            </section>
        </Wrapper>
    );
};
