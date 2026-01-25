"use client";

import React, { useState, useEffect } from "react";
import {
    Zap,
    Maximize2,
    Minimize2,
    X,
    Plus,
    Sparkles,
    RotateCcw,
    UserCheck,
    Edit3,
    Trash2,
    Settings2,
    Users,
    Download,
    Target,
    ChevronDown
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
import { Student, SubjectGlobalConfig, SubjectAssessmentInfo } from "@/types";

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
    handleGenerate: (id: number) => void;
    handleAllGenerate: () => void;
    handleSelectedGenerate: () => void;
    handleResetAll: () => void;
    toggleAllSelection: (e: any) => void;
    toggleStudentSelection: (id: number) => void;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SubjectWorkspace = ({
    students,
    setStudents,
    globalConfig,
    setGlobalConfig,
    handleGenerate,
    handleAllGenerate,
    handleSelectedGenerate,
    handleResetAll,
    toggleAllSelection,
    toggleStudentSelection,
    isExpanded,
    setIsExpanded
}: SubjectWorkspaceProps) => {
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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
        ? `${"140px ".repeat(globalConfig.assessments.length)}`
        : ""; // If no assessments, do not create a placeholder column to avoid grid misalignment

    // Adjusted ratios: AI Result gets more space (2.5fr) vs Note (1fr)
    const gridTemplateCols = `40px 80px ${assessmentCols} minmax(200px, 1fr) minmax(350px, 2.5fr) 160px`;

    return (
        <Wrapper isExpanded={isExpanded} mounted={mounted}>
            <Card className={cn(
                "p-10 border-0 bg-white shadow-2xl shadow-slate-200/50 space-y-8 transition-all duration-500",
                isExpanded ? "fixed inset-4 z-[9999] rounded-[3rem] border border-indigo-100 shadow-primary/20 !transform-none overflow-hidden flex flex-col pointer-events-auto cursor-default" : "rounded-[3rem] overflow-hidden"
            )}>
                {/* Header Section */}
                <div className="flex items-center justify-between">
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
                    <div className="flex items-center gap-3">
                        {/* Bulk Level Input */}
                        <Popover open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    disabled={students.filter(s => s.selected).length === 0}
                                    className="rounded-2xl h-11 px-6 font-bold border-indigo-100 bg-indigo-50 text-indigo-600 gap-2 hover:bg-indigo-100 transition-all font-black text-xs shrink-0"
                                >
                                    선택 일괄 적용 <ChevronDown className="size-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2 rounded-2xl shadow-xl border-indigo-100 z-[10000]" align="end">
                                <div className="grid gap-1">
                                    <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                        평가 등급 선택
                                    </div>
                                    {(["상", "중", "하"] as const).map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => {
                                                setStudents(prev => prev.map(student => {
                                                    if (!student.selected) return student;

                                                    const newAssessments = globalConfig.assessments.map(a => ({
                                                        assessmentId: a.id,
                                                        level: level
                                                    }));

                                                    return {
                                                        ...student,
                                                        subjectData: {
                                                            ...(student.subjectData || { assessments: [], individualNote: "" }),
                                                            assessments: newAssessments
                                                        }
                                                    };
                                                }));
                                                setIsBulkOpen(false);
                                            }}
                                            className="flex items-center w-full px-4 py-2.5 text-sm font-bold text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="outline"
                            className="rounded-2xl h-11 px-6 font-bold border-emerald-100 bg-emerald-50 text-emerald-600 gap-2 hover:bg-emerald-100 transition-all font-black text-xs shrink-0"
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
                            className="rounded-2xl h-11 px-5 border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all"
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

                <Tabs defaultValue="global" className={cn(
                    "space-y-8",
                    isExpanded && "flex flex-col flex-1 min-h-0"
                )}>
                    <TabsList className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 h-14">
                        <TabsTrigger value="global" className="rounded-xl px-8 font-black text-[13px] tracking-tight data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all h-full">
                            <Settings2 className="size-4 mr-2" /> 전체 정보 설정
                        </TabsTrigger>
                        <TabsTrigger value="individual" className="rounded-xl px-8 font-black text-[13px] tracking-tight data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all h-full">
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
                                                <textarea
                                                    value={assessment.criteria}
                                                    onChange={(e) => updateAssessment(assessment.id, "criteria", e.target.value)}
                                                    placeholder="예: 문단별 중심 문장을 찾고, 이를 연결하여 글 전체의 중심 생각을 파악할 수 있다."
                                                    className="w-full min-h-[100px] p-6 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50/50 text-sm font-medium leading-relaxed resize-none outline-none focus:bg-white focus:border-emerald-200 focus:ring-0 transition-all placeholder:text-slate-300 text-slate-700"
                                                />
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
                            <div className="w-full flex flex-col min-h-full">
                                {/* Sticky Table Header */}
                                <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-100 shadow-sm">
                                    <div
                                        className="grid gap-6 px-10 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 items-center"
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
                                            <div key={a.id} className="text-indigo-600 bg-indigo-100/30 py-2 rounded-xl text-center px-4">
                                                평가 {i + 1}
                                                <div className="text-[8px] opacity-40 truncate">{a.area || "영역"}</div>
                                            </div>
                                        ))}
                                        <div>개별 특이사항 (선택)</div>
                                        <div>AI 결과 및 편집</div>
                                        <div className="text-center">관리 액션</div>
                                    </div>
                                </div>

                                {/* List Content */}
                                <div className="p-6 space-y-3">
                                    {students.map((student) => (
                                        <div
                                            key={student.id}
                                            className={cn(
                                                "grid gap-6 px-8 py-6 rounded-[2rem] border transition-all items-start group/row",
                                                student.selected ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-100"
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
                                                            onValueChange={(v) => handleLevelChange(student.id, a.id, (v === "none" ? "" : v) as any)}
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
                                                <div className={cn(
                                                    "p-5 rounded-2xl text-[12px] font-medium min-h-[44px] leading-[1.7] transition-all",
                                                    student.aiResult ? "bg-slate-50 text-slate-700 border border-slate-100 shadow-inner" : "bg-slate-50 border border-dashed border-slate-200 text-slate-300 italic"
                                                )}>
                                                    {student.isGenerating ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="h-2 w-full bg-slate-200 rounded-full animate-pulse" />
                                                            <div className="h-2 w-4/5 bg-slate-200 rounded-full animate-pulse" />
                                                        </div>
                                                    ) : student.isEditable ? (
                                                        <textarea
                                                            value={student.aiResult}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                            }}
                                                            className="w-full min-h-[100px] bg-transparent outline-none resize-none border-none p-0 focus:ring-0 font-medium"
                                                        />
                                                    ) : (
                                                        <div className="line-clamp-2 group-hover/txt:line-clamp-none transition-all">{student.aiResult || "평가 선택 후 생성을 눌러주세요."}</div>
                                                    )}
                                                </div>
                                                {student.aiResult && !student.isGenerating && (
                                                    <button
                                                        onClick={() => {
                                                            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isEditable: !s.isEditable } : s));
                                                        }}
                                                        className={cn(
                                                            "absolute top-3 right-3 size-8 rounded-lg border border-slate-100 flex items-center justify-center bg-white shadow-xl transition-all hover:scale-110",
                                                            student.isEditable ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-indigo-600"
                                                        )}
                                                    >
                                                        <Edit3 className="size-3.5" />
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
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-8 px-8 bg-slate-50/50 rounded-[3rem] border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="px-8 py-4 bg-white rounded-[1.5rem] text-sm font-black text-slate-600 border border-slate-200 shadow-sm flex items-center gap-3">
                                    <div className="size-2.5 rounded-full bg-indigo-500 animate-pulse" />
                                    {students.filter(s => s.selected).length} Students Focused
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
