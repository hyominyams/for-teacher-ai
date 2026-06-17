"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import {
    Zap,
    Maximize2,
    Minimize2,
    X,
    Plus,
    Sparkles,
    RotateCcw,
    UserCheck,
    Trash2,
    Settings2,
    Users,
    Download,
    Target,
    ChevronDown,
    ChevronUp,
    GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPortal } from "react-dom";
import { AchievementLevel, CriteriaLevels, Student, SubjectGlobalConfig, SubjectAssessmentInfo } from "@/types";

interface WrapperProps {
    children: React.ReactNode;
    isExpanded: boolean;
    mounted: boolean;
}

const Wrapper = ({ children, isExpanded, mounted }: WrapperProps) => {
    if (isExpanded && mounted) {
        return createPortal(
            <div className="fixed inset-0 z-[9999] isolate">
                <div className="absolute inset-0 bg-white pointer-events-auto" />
                {children}
            </div>,
            document.body
        );
    }
    return <div className="space-y-8 mt-8 pb-20 transform-none">{children}</div>;
};

interface SubjectWorkspaceProps {
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

    ACHIEVEMENT_LEVELS.forEach((level, index) => {
        const nextLevel = ACHIEVEMENT_LEVELS[index + 1];
        const pattern = nextLevel
            ? new RegExp(`(?:^|\\n)\\s*${level}\\s*[):：:\\-]\\s*([\\s\\S]*?)(?=\\n\\s*${nextLevel}\\s*[):：:\\-])`)
            : new RegExp(`(?:^|\\n)\\s*${level}\\s*[):：:\\-]\\s*([\\s\\S]*)`);
        const match = text.match(pattern);
        if (match?.[1]?.trim()) {
            levels[level] = match[1].trim();
        }
    });

    if (ACHIEVEMENT_LEVELS.every((level) => levels[level])) return levels;

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

    ACHIEVEMENT_LEVELS.forEach((level) => {
        levels[level] = text;
    });
    return levels;
};

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
    toggleAllSelection,
    toggleStudentSelection,
    isExpanded,
    setIsExpanded
}: SubjectWorkspaceProps) => {
    const [bulkAssessmentId, setBulkAssessmentId] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    const [activeInputTab, setActiveInputTab] = useState("global");
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
                { id: newId, area: "", standard: "", criteria: "", competency: "" }
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
                    ...splitCriteriaLevelsFromText(assessment.criteria),
                    [level]: value,
                };

                return {
                    ...assessment,
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

    // Calculate dynamic grid columns for the row based on number of assessments
    // cols: Checkbox(40px) + Number(80px) + (Assessments x 140px) + Note(minmax 200) + Result(minmax 300) + Actions(160px)
    // cols: Checkbox(40px) + Number(80px) + (Assessments x 140px) + Note(minmax 200) + Result(minmax 300) + Actions(160px)
    const assessmentCols = globalConfig.assessments.length > 0
        ? `${"120px ".repeat(globalConfig.assessments.length)}`
        : ""; // If no assessments, do not create a placeholder column to avoid grid misalignment

    // Adjusted ratios: AI Result gets more space (2.5fr) vs Note (1fr)
    const gridTemplateCols = `40px 70px ${assessmentCols} minmax(180px, 1fr) minmax(280px, 2.5fr) 140px`;
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
            <Card className={cn(
                "p-10 border-0 bg-white shadow-2xl shadow-slate-200/50 space-y-8 transition-all duration-500",
                isExpanded ? "fixed inset-4 z-[9999] rounded-[2rem] border border-indigo-100 shadow-primary/20 !transform-none overflow-hidden flex flex-col pointer-events-auto cursor-default p-6 space-y-0 gap-4" : "rounded-[3rem] overflow-hidden"
            )}>
                {/* Header Section */}
                {!isExpanded && (
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Zap className="size-7" />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                학생별 AI Workspace
                                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] rounded-lg font-black tracking-widest leading-none">V1.0 PRO</div>
                            </h4>
                            <p className="text-sm text-slate-400 font-medium">성취수준을 바탕으로 생활기록부 작성을 시작하세요.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 w-full xl:w-auto">
                        <Button
                            variant="outline"
                            className="rounded-2xl h-11 px-6 font-bold border-emerald-100 bg-emerald-50 text-emerald-600 gap-2 hover:bg-emerald-100 transition-all font-black text-xs shrink-0 w-full sm:w-auto"
                            onClick={() => {
                                const headers = ["번호", ...globalConfig.assessments.map((_, i) => `평가${i + 1}`), "개별특이사항", "AI생성결과"];
                                const rows = students.map(s => [
                                    s.id,
                                    ...globalConfig.assessments.map(a => s.subjectData?.assessments?.find(sa => sa.assessmentId === a.id)?.level || ""),
                                    `"${(s.subjectData?.individualNote || "").replace(/"/g, '""')}"`,
                                    `"${(s.aiResult || "").replace(/\n/g, " ").replace(/"/g, '""')}"`
                                ]);
                                const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `교과세특_데이터_${new Date().toISOString().slice(0, 10)}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                        >
                            내보내기 <Download className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="rounded-2xl h-11 px-5 border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all col-span-2 sm:col-span-1"
                        >
                            {isExpanded ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
                        </Button>
                        {isExpanded && (
                            <Button
                                onClick={() => setIsExpanded(false)}
                                className="rounded-2xl size-11 p-0 bg-red-50 text-red-400 hover:bg-red-100"
                            >
                                <X className="size-6" />
                            </Button>
                        )}
                    </div>
                </div>
                )}

                {isExpanded && (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-4 shrink-0">
                        <div className="min-w-0">
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">학생별 개별 입력</div>
                            <div className="truncate text-lg font-black text-slate-900">{currentSubjectLabel}</div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsExpanded(false)}
                            className="h-11 rounded-xl border-indigo-100 bg-white px-5 text-xs font-black text-indigo-600 hover:bg-indigo-100 gap-2 shrink-0"
                        >
                            <Minimize2 className="size-4" /> 돌아가기
                        </Button>
                    </div>
                )}

                {!isExpanded && (
                <div className="rounded-[2rem] bg-indigo-50/60 border border-indigo-100 p-5 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,680px)_1fr] gap-4 lg:items-end">
                        <div className="space-y-2 min-w-0 max-w-[680px]">
                            <Label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1">현재 교과</Label>
                            <Input
                                value={globalConfig.subjectName}
                                onChange={(e) => setGlobalConfig(p => ({ ...p, subjectName: e.target.value }))}
                                placeholder="교과명을 입력하세요"
                                className="h-14 rounded-2xl bg-white border-indigo-100 px-5 text-lg font-black text-slate-800 placeholder:text-slate-300 shadow-sm focus-visible:ring-indigo-200 focus-visible:border-indigo-200"
                            />
                        </div>
                        <div className="grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={onCreateSubjectLog}
                                className="h-12 rounded-xl px-3 sm:px-5 border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-100 font-black text-xs gap-2"
                            >
                                새 교과 <Plus className="size-4" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onDeleteSubjectLog(activeSubjectScopeKey)}
                                disabled={subjectLogs.length === 0}
                                title="교과 삭제"
                                className="h-12 rounded-xl px-3 sm:px-4 border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 font-black text-xs gap-2 disabled:opacity-40"
                            >
                                <Trash2 className="size-4" />
                                삭제
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onDeleteAllSubjectLogs}
                                disabled={subjectLogs.length === 0 && globalConfig.assessments.length === 0 && !globalConfig.subjectName.trim()}
                                title="전체삭제"
                                className="h-12 rounded-xl px-3 sm:px-4 border-red-100 bg-white text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-black text-xs gap-2 disabled:opacity-40"
                            >
                                <Trash2 className="size-4" />
                                전체삭제
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar pb-1 pr-1">
                        {subjectSelectItems.map(log => {
                            const isActive = log.scopeKey === activeSubjectScopeKey;
                            const isRealSubjectLog = subjectLogs.some(subjectLog => subjectLog.scopeKey === log.scopeKey);
                            const isDragging = draggedSubjectScopeKey === log.scopeKey;
                            const isDragOver = dragOverSubjectScopeKey === log.scopeKey;
                            return (
                                <button
                                    key={log.scopeKey}
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
                                        "h-10 min-w-16 max-w-[160px] shrink-0 rounded-xl border px-3 text-xs font-black transition-all",
                                        isRealSubjectLog ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                                        isActive
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                                            : "bg-white border-indigo-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600",
                                        isDragging && "opacity-50",
                                        isDragOver && "ring-4 ring-indigo-100 border-indigo-300"
                                    )}
                                    title={`${log.scopeLabel || "교과"}${isRealSubjectLog ? " - 드래그해서 순서 변경" : ""}`}
                                >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <GripVertical className="size-3 shrink-0 opacity-45" />
                                        <span className="truncate">{log.shortLabel}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                )}

                <Tabs value={isExpanded ? "individual" : activeInputTab} onValueChange={setActiveInputTab} className={cn(
                    "space-y-8",
                    isExpanded && "flex flex-col flex-1 min-h-0 space-y-0"
                )}>
                    <TabsList className={cn(
                        "grid grid-cols-2 w-full bg-slate-50 p-1.5 rounded-2xl border border-slate-100 h-auto",
                        isExpanded && "hidden"
                    )}>
                        <TabsTrigger value="global" className="rounded-xl px-3 sm:px-8 font-black text-[12px] sm:text-[13px] tracking-tight data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all h-11">
                            <Settings2 className="size-4 mr-2" /> 전체 정보 설정
                        </TabsTrigger>
                        <TabsTrigger value="individual" className="rounded-xl px-3 sm:px-8 font-black text-[12px] sm:text-[13px] tracking-tight data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all h-11">
                            <Users className="size-4 mr-2" /> 학생별 개별 입력
                        </TabsTrigger>
                    </TabsList>

                    {/* 전체 정보 설정 탭 */}
                    <TabsContent value="global" className={cn(
                        "space-y-10 focus:outline-none custom-scrollbar pb-40",
                        isExpanded ? "overflow-y-auto flex-1 h-full" : "h-auto"
                    )}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">학교급</Label>
                                <Select value={globalConfig.schoolLevel} onValueChange={(val) => setGlobalConfig(p => ({ ...p, schoolLevel: val }))}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold focus:ring-indigo-200 text-slate-600">
                                        <SelectValue placeholder="학교급 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                        <SelectItem value="elementary" className="font-bold">초등학교</SelectItem>
                                        <SelectItem value="middle" className="font-bold">중학교</SelectItem>
                                        <SelectItem value="high" className="font-bold">고등학교</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">학년</Label>
                                <Select value={globalConfig.grade} onValueChange={(val) => setGlobalConfig(p => ({ ...p, grade: val }))}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold focus:ring-indigo-200 text-slate-600">
                                        <SelectValue placeholder="학년 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                        {[1, 2, 3, 4, 5, 6].map(g => (
                                            <SelectItem key={g} value={g.toString()} className="font-bold">{g}학년</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2 space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">교과명</Label>
                                <Input
                                    value={globalConfig.subjectName}
                                    onChange={(e) => setGlobalConfig(p => ({ ...p, subjectName: e.target.value }))}
                                    placeholder="예: 국어, 수학, 통합교과(봄) 등"
                                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold px-5 focus:border-indigo-300 shadow-inner border-none text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                                />
                            </div>
                            <div className="md:col-span-4 flex justify-end">
                                <Button
                                    onClick={() => setGlobalConfig({ schoolLevel: "", grade: "", subjectName: "", assessments: [] })}
                                    variant="ghost"
                                    className="h-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold gap-2 text-xs"
                                >
                                    <RotateCcw className="size-3" /> 입력 정보 초기화
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6 pb-20">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs font-black text-slate-900 uppercase tracking-wider">평가 영역 및 기준 설정</Label>
                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black px-2.5 py-0.5 rounded-lg">{globalConfig.assessments.length}</Badge>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addAssessment}
                                    className="rounded-2xl h-11 px-6 border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-black text-xs gap-2"
                                >
                                    평가정보 추가 <Plus className="size-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {globalConfig.assessments.map((assessment, index) => (
                                    <Card key={assessment.id} className="relative overflow-visible border-slate-100 bg-white shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-100 transition-all group/card rounded-[2.5rem]">
                                        <button
                                            onClick={() => removeAssessment(assessment.id)}
                                            className="absolute -top-3 -right-3 size-10 rounded-full bg-white border border-slate-100 text-slate-300 flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all z-10 shadow-sm opacity-0 group-hover/card:opacity-100"
                                            title="평가정보 삭제"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>

                                        <div className="p-8 space-y-8">
                                            {/* Row 1: Header (Area + Competency) */}
                                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                                {/* 영역 입력 */}
                                                <div className="flex items-center gap-4 flex-[1.5]">
                                                    <div className="size-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-200 shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.05em] ml-1">영역 (대단원)</Label>
                                                        <Input
                                                            value={assessment.area}
                                                            onChange={(e) => updateAssessment(assessment.id, "area", e.target.value)}
                                                            placeholder="예: 듣기, 화법과 작문 등"
                                                            className="h-12 rounded-xl bg-slate-50 font-bold px-4 focus:bg-white transition-all outline-none border-none shadow-inner text-lg text-slate-900 placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                </div>

                                                {/* 핵심 역량 입력 */}
                                                <div className="flex-1 space-y-2 w-full">
                                                    <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.05em] ml-1 flex items-center gap-2">
                                                        <Target className="size-3.5 text-indigo-500" /> 관련 핵심 역량
                                                    </Label>
                                                    <div className="bg-white p-2 rounded-xl border-2 border-slate-100 focus-within:border-indigo-200 focus-within:shadow-md transition-all flex items-center gap-3 h-12">
                                                        <input
                                                            value={assessment.competency}
                                                            onChange={(e) => updateAssessment(assessment.id, "competency", e.target.value)}
                                                            placeholder="예: 비판적 사고 역량, 의사소통 역량"
                                                            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300 h-full px-2"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 2: Standard */}
                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.05em] ml-1 flex items-center gap-2">
                                                    <span className="size-1.5 rounded-full bg-indigo-400"></span> 성취기준 (Standard)
                                                </Label>
                                                <textarea
                                                    value={assessment.standard}
                                                    onChange={(e) => updateAssessment(assessment.id, "standard", e.target.value)}
                                                    placeholder="예: [4국02-02] 문단과 글에서 중심 생각을 파악하고..."
                                                    className="w-full min-h-[100px] p-6 rounded-[1.5rem] border-2 border-slate-100 bg-white text-sm font-medium leading-relaxed resize-none outline-none focus:border-indigo-200 focus:ring-0 transition-all placeholder:text-slate-300 text-slate-700"
                                                />
                                            </div>

                                            {/* Row 3: Criteria */}
                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.05em] ml-1 flex items-center gap-2">
                                                    <span className="size-1.5 rounded-full bg-emerald-400"></span> 평가기준 (Criteria)
                                                </Label>
                                                <div className="grid gap-3 lg:grid-cols-3">
                                                    {ACHIEVEMENT_LEVELS.map((level) => {
                                                        const criteriaLevels = splitCriteriaLevelsFromText(assessment.criteria);

                                                        return (
                                                            <label key={level} className="block space-y-2">
                                                                <span className={cn(
                                                                    "inline-flex h-7 min-w-9 items-center justify-center rounded-xl px-3 text-[11px] font-black",
                                                                    level === "상" && "bg-indigo-50 text-indigo-600",
                                                                    level === "중" && "bg-slate-100 text-slate-600",
                                                                    level === "하" && "bg-amber-50 text-amber-700"
                                                                )}>
                                                                    {level}
                                                                </span>
                                                                <textarea
                                                                    value={criteriaLevels[level] || ""}
                                                                    onChange={(e) => updateAssessmentCriteriaLevel(assessment.id, level, e.target.value)}
                                                                    placeholder={`${level} 수준 평가기준`}
                                                                    className="w-full min-h-[132px] resize-y rounded-[1.5rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:border-emerald-200 focus:ring-0"
                                                                />
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* 학생별 개별 입력 탭 */}
                    <TabsContent value="individual" className={cn(
                        "space-y-6 focus:outline-none",
                        isExpanded && "flex-1 flex flex-col min-h-0"
                    )}>
                        <div
                            className={cn(
                                "bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-auto custom-scrollbar relative",
                                isExpanded ? "flex-1 h-full" : "h-[600px]"
                            )}>
                            <div className="w-fit min-w-full flex flex-col min-h-full">
                                {/* Sticky Table Header */}
                                <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-100 shadow-sm">
                                    <div
                                        className="grid gap-6 px-8 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 items-center"
                                        style={{ gridTemplateColumns: gridTemplateCols }}
                                    >
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                onChange={toggleAllSelection}
                                                checked={students.length > 0 && students.every(s => s.selected)}
                                                className="size-5 rounded-lg border-slate-300 accent-indigo-500 cursor-pointer"
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
                                                        className="min-w-0 rounded-xl bg-indigo-100/30 px-3 py-2 text-center text-indigo-600 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                                                    >
                                                        <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
                                                            <span className="truncate">평가 {i + 1}</span>
                                                            <ChevronDown className="size-3 shrink-0 opacity-60" />
                                                        </span>
                                                        <span className="mt-0.5 block truncate text-[8px] leading-3 opacity-45">
                                                            {a.area || "영역"}
                                                        </span>
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-44 rounded-2xl border-indigo-100 p-2 shadow-xl z-[10000]" align="center">
                                                    <div className="grid gap-1">
                                                        <div className="border-b border-slate-100 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                            {selectedStudentCount > 0 ? `${selectedStudentCount}명 선택` : "학생을 선택하세요"}
                                                        </div>
                                                        {(["상", "중", "하"] as const).map((level) => (
                                                            <button
                                                                key={level}
                                                                type="button"
                                                                disabled={selectedStudentCount === 0}
                                                                onClick={() => applyBulkAssessmentLevel(a.id, level)}
                                                                className="flex h-9 w-full items-center rounded-xl px-3 text-left text-sm font-black text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                                                            >
                                                                {level} 입력
                                                            </button>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            disabled={selectedStudentCount === 0}
                                                            onClick={() => applyBulkAssessmentLevel(a.id, "")}
                                                            className="flex h-9 w-full items-center rounded-xl px-3 text-left text-sm font-black text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                                                        >
                                                            비우기
                                                        </button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        ))}
                                        <div className="pl-4">개별 특이사항 (선택)</div>
                                        <div className="pl-5">AI 결과 및 편집</div>
                                        <div className="text-center">관리 액션</div>
                                    </div>
                                </div>

                                {/* List Content */}
                                <div className="p-6 space-y-3">
                                    {students.map((student) => {
                                        const isRowOpen = expandedRowId === student.id;
                                        return (
                                        <div
                                            key={student.id}
                                            className={cn(
                                                "grid gap-6 px-8 rounded-[2rem] border transition-all items-start group/row",
                                                isRowOpen ? "py-6" : "py-3.5",
                                                student.selected ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-100",
                                                isRowOpen && "ring-2 ring-indigo-400/30 border-indigo-300 shadow-xl shadow-indigo-100/40"
                                            )}
                                            style={{ gridTemplateColumns: gridTemplateCols }}
                                        >
                                            <div className="flex items-center justify-center pt-3">
                                                <input
                                                    type="checkbox"
                                                    checked={student.selected}
                                                    onChange={() => toggleStudentSelection(student.id)}
                                                    className="size-5 rounded-lg border-slate-300 accent-indigo-500 cursor-pointer"
                                                />
                                            </div>
                                            <div className="text-lg font-black text-slate-900 text-center pt-2 whitespace-nowrap">{student.id}번</div>

                                            {/* Assessment Dropdowns */}
                                            {globalConfig.assessments.map((a) => {
                                                const val = student.subjectData?.assessments?.find(sa => sa.assessmentId === a.id)?.level || "";
                                                return (
                                                    <div key={a.id} className="pt-1">
                                                        <Select
                                                            value={val || "none"}
                                                            onValueChange={(v) => {
                                                                const level = v === "상" || v === "중" || v === "하" ? v : "";
                                                                handleLevelChange(student.id, a.id, level);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold text-xs">
                                                                <SelectValue placeholder="평가" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-slate-100 shadow-2xl z-[400]">
                                                                <SelectItem value="none" className="font-bold text-slate-300">미선택</SelectItem>
                                                                <SelectItem value="상" className="font-bold text-indigo-600">상</SelectItem>
                                                                <SelectItem value="중" className="font-bold text-slate-600">중</SelectItem>
                                                                <SelectItem value="하" className="font-bold text-slate-400">하</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                );
                                            })}

                                            <div className="pt-1">
                                                <textarea
                                                    value={student.subjectData?.individualNote || ""}
                                                    onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                                    placeholder="학생 관찰 특이사항..."
                                                    className="w-full h-11 px-4 py-3 rounded-xl border-none bg-slate-50 text-[11px] font-medium placeholder:text-slate-300 focus:h-24 transition-all outline-none focus:bg-white shadow-inner resize-none"
                                                />
                                            </div>

                                            <div className="relative group/txt pt-1">
                                                <div
                                                    onClick={() => { if (!isRowOpen && !student.isGenerating) setExpandedRowId(student.id); }}
                                                    className={cn(
                                                        "rounded-2xl text-[12px] font-medium leading-[1.7] transition-all",
                                                        isRowOpen ? "p-5 min-h-[160px] shadow-inner" : "p-4 h-[88px] overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-300/50",
                                                        student.aiResult ? "bg-slate-50 text-slate-700 border border-slate-100 shadow-inner" : "bg-slate-50 border border-dashed border-slate-200 text-slate-300 italic"
                                                    )}
                                                >
                                                    {student.isGenerating ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="h-2 w-full bg-slate-200 rounded-full animate-pulse" />
                                                            <div className="h-2 w-4/5 bg-slate-200 rounded-full animate-pulse" />
                                                        </div>
                                                    ) : isRowOpen ? (
                                                        <textarea
                                                            autoFocus
                                                            value={student.aiResult}
                                                            placeholder="평가 선택 후 생성을 눌러주세요."
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                            }}
                                                            className="w-full min-h-[140px] bg-transparent outline-none resize-none border-none p-0 focus:ring-0 font-medium leading-[1.7]"
                                                        />
                                                    ) : (
                                                        <div className="line-clamp-3">{student.aiResult || "평가 선택 후 생성을 눌러주세요."}</div>
                                                    )}
                                                </div>
                                                {!student.isGenerating && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setExpandedRowId(isRowOpen ? null : student.id); }}
                                                        title={isRowOpen ? "접기" : "펼쳐서 편집"}
                                                        className={cn(
                                                            "absolute top-2.5 right-2.5 size-8 rounded-lg border flex items-center justify-center shadow-xl transition-all hover:scale-110",
                                                            isRowOpen ? "bg-indigo-600 text-white border-indigo-600 opacity-100" : "bg-white text-slate-400 border-slate-100 opacity-0 group-hover/txt:opacity-100 hover:text-indigo-600"
                                                        )}
                                                    >
                                                        {isRowOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2 pt-1">
                                                <Button
                                                    onClick={() => handleGenerate(student.id)}
                                                    disabled={student.isGenerating}
                                                    className={cn(
                                                        "w-full rounded-2xl font-black h-11 px-5 gap-2 text-[12px] transition-all shadow-lg",
                                                        student.aiResult
                                                            ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/20"
                                                    )}
                                                >
                                                    {student.aiResult ? "재생성" : "생성"} <Sparkles className="size-3.5" />
                                                </Button>
                                                <button
                                                    onClick={() => {
                                                        setStudents(prev => prev.map(s => s.id === student.id ? {
                                                            ...s,
                                                            subjectData: { assessments: [], individualNote: "" },
                                                            aiResult: ""
                                                        } : s));
                                                    }}
                                                    className="w-full h-10 rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2 font-black text-[10px]"
                                                >
                                                    <RotateCcw className="size-3" /> 초기화
                                                </button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-8 px-8 bg-slate-50/50 rounded-[3rem] border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="px-8 py-4 bg-white rounded-[1.5rem] text-sm font-black text-slate-600 border border-slate-200 shadow-sm flex items-center gap-3">
                                    <div className="size-2.5 rounded-full bg-indigo-500 animate-pulse" />
                                    선택 학생 {selectedStudentCount}명
                                </div>

                            </div>
                            <div className="flex gap-4">
                                <Button
                                    onClick={handleResetAll}
                                    variant="ghost"
                                    className="rounded-2xl bg-white text-slate-500 font-black h-16 px-10 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all"
                                >
                                    전체 초기화
                                </Button>
                                <Button
                                    onClick={handleSelectedGenerate}
                                    variant="outline"
                                    className="rounded-2xl border-2 border-slate-900 text-slate-900 font-black h-16 px-10 hover:bg-slate-50 shadow-sm gap-3 transition-all"
                                >
                                    <UserCheck className="size-5" /> 선택 생성
                                </Button>
                                <Button
                                    onClick={handleAllGenerate}
                                    className="rounded-2xl bg-slate-900 text-white font-black h-16 px-12 hover:bg-slate-800 shadow-2xl shadow-slate-300 gap-4 text-lg transition-all"
                                >
                                    <Zap className="size-5 text-indigo-400" /> 전체 생성
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs >
            </Card >
        </Wrapper>
    );
};
