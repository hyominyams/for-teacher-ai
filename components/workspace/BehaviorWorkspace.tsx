"use client";

import React from "react";
import {
    Brain,
    Download,
    Maximize2,
    Minimize2,
    X,
    Plus,
    Edit3,
    Sparkles,
    RotateCcw,
    UserCheck,
    Zap,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Student } from "@/types";

interface BehaviorWorkspaceProps {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    charLimit: number;
    handleAutoGenerateKeywords: () => void;
    handleGenerate: (id: number) => void;
    handleReset: (id: number) => void;
    handleResetAll: () => void;
    handleSelectedGenerate: () => void;
    handleAllGenerate: () => void;
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
    students,
    setStudents,
    isExpanded,
    setIsExpanded,
    charLimit,
    handleAutoGenerateKeywords,
    handleGenerate,
    handleReset,
    handleResetAll,
    handleSelectedGenerate,
    handleAllGenerate,
    toggleAllSelection,
    toggleStudentSelection,
    isAddingKeyword,
    setIsAddingKeyword,
    newKeywordInput,
    setNewKeywordInput,
    addCustomKeyword,
    defaultKeywords,
}: BehaviorWorkspaceProps) => {
    return (
        <Card className={cn(
            "p-10 border-0 bg-white shadow-2xl shadow-slate-200/50 space-y-8 overflow-hidden transition-all duration-500",
            isExpanded ? "fixed inset-4 z-[200] rounded-[3rem] border border-blue-100 shadow-primary/20" : "rounded-[3rem]"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <UserCheck className="size-7" />
                    </div>
                    <div>
                        <h4 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            학생별 AI Workspace
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] rounded-lg font-black tracking-widest leading-none">V2.9 PRO</div>
                        </h4>
                        <p className="text-sm text-slate-400 font-medium">키워드를 기반으로 생활기록부 작성을 시작하세요.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleAutoGenerateKeywords}
                        className="rounded-2xl h-11 px-6 font-bold border-purple-100 bg-purple-50 text-purple-600 gap-2 hover:bg-purple-100 transition-all font-black text-xs shrink-0"
                    >
                        키워드 자동생성 <Brain className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            const headers = ["번호", "키워드", "AI생성결과"];
                            const rows = students.map(s => [
                                s.id,
                                `"${s.selectedKeywords.join(", ")}"`,
                                `"${s.aiResult.replace(/\n/g, " ").replace(/"/g, '""')}"`
                            ]);
                            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `행특_데이터_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="rounded-2xl h-11 px-6 font-bold border-emerald-100 bg-emerald-50 text-emerald-600 gap-2 hover:bg-emerald-100 transition-all font-black text-xs shrink-0"
                    >
                        내보내기 <Download className="size-4" />
                    </Button>
                    <Button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="rounded-2xl h-11 px-5 border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all"
                        variant="ghost"
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

            <div
                className="bg-slate-100/30 rounded-[2.5rem] border border-slate-100 overflow-auto custom-scrollbar relative"
                style={{ height: isExpanded ? "calc(100vh - 400px)" : "600px" }}
            >
                <div className="min-w-max flex flex-col min-h-full">
                    {/* Sticky Table Header */}
                    <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-100 shadow-sm">
                        <div className="grid grid-cols-[40px_80px_minmax(250px,1fr)_minmax(300px,2fr)_160px] gap-8 px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 items-center">
                            <div className="flex items-center justify-center">
                                <input type="checkbox" onChange={toggleAllSelection} checked={students.length > 0 && students.every(s => s.selected)} className="size-5 rounded-lg border-slate-300 accent-primary cursor-pointer" />
                            </div>
                            <div className="text-center font-black">번호</div>
                            <div>행동특성 키워드 (최소 2개)</div>
                            <div>AI 결과 및 편집</div>
                            <div className="text-center">관리 액션</div>
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="p-6 pt-4 space-y-3">
                        {students.map((student) => (
                            <div
                                key={student.id}
                                className={cn(
                                    "grid grid-cols-[40px_80px_minmax(250px,1fr)_minmax(300px,2fr)_160px] gap-8 px-8 py-7 rounded-[2rem] border transition-all items-start group/row",
                                    student.selected ? "bg-blue-50 border-blue-200" : "bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-100"
                                )}
                            >
                                <div className="flex items-center justify-center pt-3">
                                    <input
                                        type="checkbox"
                                        checked={student.selected}
                                        onChange={() => toggleStudentSelection(student.id)}
                                        className="size-5 rounded-lg border-slate-300 accent-primary cursor-pointer"
                                    />
                                </div>
                                <div className="text-lg font-black text-slate-900 text-center pt-2 whitespace-nowrap">{student.id}번</div>

                                <div className="flex flex-col gap-4 pt-1">
                                    <div className="flex gap-2 flex-wrap">
                                        {[...defaultKeywords, ...student.customKeywords].map(k => (
                                            <button
                                                key={k}
                                                onClick={() => {
                                                    const isSelected = student.selectedKeywords.includes(k);
                                                    setStudents(prev => prev.map(s => s.id === student.id ? {
                                                        ...s,
                                                        selectedKeywords: isSelected ? s.selectedKeywords.filter(kw => kw !== k) : [...s.selectedKeywords, k]
                                                    } : s));
                                                }}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-[11px] font-black transition-all border-2",
                                                    student.selectedKeywords.includes(k)
                                                        ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600"
                                                )}
                                            >
                                                {k}
                                            </button>
                                        ))}
                                    </div>

                                    {isAddingKeyword === student.id ? (
                                        <div className="flex gap-2 items-center">
                                            <input
                                                autoFocus
                                                value={newKeywordInput}
                                                onChange={(e) => setNewKeywordInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addCustomKeyword(student.id)}
                                                placeholder="키워드 입력"
                                                className="px-4 py-2 text-xs font-bold border-2 rounded-xl w-32 outline-none focus:border-primary/50 transition-all bg-white"
                                            />
                                            <Button onClick={() => addCustomKeyword(student.id)} variant="ghost" className="size-9 rounded-lg bg-primary text-white p-0"><CheckCircle2 className="size-4" /></Button>
                                            <Button onClick={() => setIsAddingKeyword(null)} variant="ghost" className="size-9 rounded-lg bg-slate-100 text-slate-400 p-0"><X className="size-4" /></Button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setIsAddingKeyword(student.id);
                                                setNewKeywordInput("");
                                            }}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 text-[11px] font-black text-slate-400 border-2 border-dashed border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-500 w-fit transition-all group/btn"
                                        >
                                            <Plus className="size-4 transition-transform group-hover/btn:rotate-90" /> 키워드 직접 추가
                                        </button>
                                    )}
                                </div>

                                <div className="relative group/txt pt-1">
                                    <div className={cn(
                                        "p-6 rounded-2xl text-[13px] font-medium min-h-[120px] leading-[1.8] transition-all",
                                        student.aiResult ? "bg-slate-50 text-slate-700 border border-slate-100" : "bg-slate-50/50 text-slate-300 italic border border-dashed border-slate-200"
                                    )}>
                                        {student.isGenerating ? (
                                            <div className="flex flex-col gap-3">
                                                <div className="h-2.5 w-full bg-slate-200 rounded-full animate-pulse" />
                                                <div className="h-2.5 w-4/5 bg-slate-200 rounded-full animate-pulse" />
                                                <div className="h-2.5 w-3/5 bg-slate-200 rounded-full animate-pulse" />
                                            </div>
                                        ) : student.isEditable ? (
                                            <textarea
                                                value={student.aiResult}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                }}
                                                className="w-full min-h-[120px] bg-transparent outline-none resize-none border-none p-0 focus:ring-0"
                                            />
                                        ) : (
                                            student.aiResult || "선택된 키워드가 없습니다. 키워드를 클릭하고 생성을 눌러주세요."
                                        )}
                                    </div>
                                    {student.aiResult && !student.isGenerating && (
                                        <div className="absolute top-4 right-4 opacity-0 group-hover/txt:opacity-100 transition-opacity">
                                            <div
                                                onClick={() => {
                                                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isEditable: !s.isEditable } : s));
                                                }}
                                                className={cn(
                                                    "size-9 rounded-xl shadow-xl border border-slate-100 flex items-center justify-center cursor-pointer transition-all hover:scale-110",
                                                    student.isEditable ? "bg-primary text-white" : "bg-white text-slate-400 hover:text-primary"
                                                )}
                                            >
                                                <Edit3 className="size-4" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center justify-start gap-2 pt-2">
                                    <Button
                                        onClick={() => handleGenerate(student.id)}
                                        disabled={student.selectedKeywords.length < 2 || student.isGenerating}
                                        className={cn(
                                            "w-full rounded-2xl font-black h-12 px-5 gap-2 text-[13px] transition-all shadow-lg",
                                            student.aiResult
                                                ? "bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-blue-100"
                                                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                                        )}
                                    >
                                        {student.aiResult ? "재생성" : "생성"} <Sparkles className="size-4" />
                                    </Button>
                                    <button
                                        onClick={() => handleReset(student.id)}
                                        className="w-full h-11 rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2 font-black text-[11px]"
                                    >
                                        <RotateCcw className="size-4" /> 초기화
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between py-8 px-4 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="px-6 py-3 bg-white rounded-2xl text-sm font-black text-slate-600 border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="size-2 rounded-full bg-blue-600 animate-pulse" />
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
                        <Zap className="size-5 text-primary" /> 전체 생성
                    </Button>
                </div>
            </div>
        </Card>
    );
};
