"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Zap,
    Layout,
    X,
    Plus,
    Search,
    Sparkles,
    CheckCircle2,
    Maximize2,
    Minimize2,
    Download,
    RotateCcw,
    UserCheck,
    Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Student } from "@/types";
import { CREATIVE_CATEGORIES, OFFICER_ROLES } from "@/lib/constants/creative-events";

interface CreativeActivityWorkspaceProps {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    handleGenerate: (id: number) => void;
    handleAllGenerate: () => void;
    handleSelectedGenerate: () => void;
    handleResetAll: () => void;
    handleAutoGenerateEvents: () => void;
    toggleAllSelection: () => void;
    toggleStudentSelection: (id: number) => void;
    studentCount: number;
    charLimit: number;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CreativeActivityWorkspace = ({
    students,
    setStudents,
    handleGenerate,
    handleAllGenerate,
    handleSelectedGenerate,
    handleResetAll,
    toggleAllSelection,
    toggleStudentSelection,
    studentCount,
    charLimit,
    isExpanded,
    setIsExpanded,
    handleAutoGenerateEvents
}: CreativeActivityWorkspaceProps) => {
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

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
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

    return (
        <Wrapper>
            <Card className={cn(
                "p-10 border-0 bg-white shadow-2xl shadow-slate-200/50 space-y-8 transition-all duration-500 relative",
                isExpanded ? "fixed inset-4 z-[9999] rounded-[3rem] border border-blue-100 shadow-primary/20 !transform-none overflow-y-auto overscroll-contain pointer-events-auto cursor-default" : "rounded-[3rem] overflow-hidden"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Zap className="size-7" />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                학생별 AI Workspace
                                <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] rounded-lg font-black tracking-widest leading-none">V1.0 PRO</div>
                            </h4>
                            <p className="text-sm text-slate-400 font-medium">참여행사를 기반으로 생활기록부 작성을 시작하세요.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleAutoGenerateEvents}
                            className="rounded-2xl h-11 px-6 font-bold border-amber-100 bg-amber-50 text-amber-600 gap-2 hover:bg-amber-100 transition-all font-black text-xs shrink-0"
                        >
                            행사 자동생성 <Sparkles className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const headers = ["번호", "참여 행사", "임원여부", "임원기간", "AI생성결과"];
                                const rows = students.map(s => [
                                    s.id,
                                    `"${(s.participatedEvents || []).join(", ")}"`,
                                    `"${s.officerRole}"`,
                                    `"${s.officerPeriod || ""}"`,
                                    `"${(s.aiResult || "").replace(/\n/g, " ").replace(/"/g, '""')}"`
                                ]);
                                const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `창체_데이터_${new Date().toISOString().slice(0, 10)}.csv`);
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
                                className="rounded-2xl size-11 p-0 bg-red-50 text-red-500 hover:bg-red-100"
                            >
                                <X className="size-5" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-[40px_80px_minmax(250px,1fr)_140px_140px_minmax(400px,2fr)_120px] gap-6 px-8 py-5 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 items-center">
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                onChange={toggleAllSelection}
                                checked={students.length > 0 && students.every(s => s.selected)}
                                className="size-5 rounded-lg border-slate-300 accent-amber-500 cursor-pointer"
                            />
                        </div>
                        <div className="text-center font-black">번호</div>
                        <div>참여 행사 (복수 선택)</div>
                        <div className="text-center">임원 여부</div>
                        <div className="text-center">임원 기간</div>
                        <div>AI 결과 및 편집</div>
                        <div className="text-center">관리 액션</div>
                    </div>

                    <div className={cn(
                        "space-y-3 pr-2 custom-scrollbar overflow-y-auto",
                        isExpanded ? "h-[calc(100vh-450px)]" : "h-[500px]"
                    )}>
                        {students.map((student) => (
                            <div key={student.id} className={cn(
                                "grid grid-cols-[40px_80px_minmax(250px,1fr)_140px_140px_minmax(400px,2fr)_120px] gap-6 px-8 py-6 rounded-[2rem] border transition-all items-start group/row",
                                student.selected ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-100"
                            )}>
                                <div className="flex items-center justify-center pt-3">
                                    <input
                                        type="checkbox"
                                        checked={student.selected}
                                        onChange={() => toggleStudentSelection(student.id)}
                                        className="size-5 rounded-lg border-slate-300 accent-amber-500 cursor-pointer"
                                    />
                                </div>
                                <div className="text-lg font-black text-slate-900 text-center pt-2 whitespace-nowrap">{student.id}번</div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    <AnimatePresence mode="popLayout">
                                        {student.participatedEvents?.map((ev) => (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                key={ev}
                                            >
                                                <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-lg bg-amber-50 text-amber-700 border-amber-100 font-bold group/tag">
                                                    {ev}
                                                    <button
                                                        onClick={() => {
                                                            setStudents(prev => prev.map(s => s.id === student.id ? {
                                                                ...s, participatedEvents: s.participatedEvents?.filter(e => e !== ev)
                                                            } : s));
                                                        }}
                                                        className="size-5 rounded-md hover:bg-amber-100 flex items-center justify-center text-amber-400 hover:text-amber-800 transition-all ml-1"
                                                    >
                                                        <X className="size-3" />
                                                    </button>
                                                </Badge>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <EventPicker
                                        studentId={student.id}
                                        selectedEvents={student.participatedEvents || []}
                                        setStudents={setStudents}
                                    />
                                </div>

                                <div className="pt-1">
                                    <Select
                                        value={student.officerRole || "임원아님"}
                                        onValueChange={(val) => {
                                            setStudents(prev => prev.map(s =>
                                                s.id === student.id ? { ...s, officerRole: val, officerPeriod: val === "임원아님" ? "" : s.officerPeriod } : s
                                            ));
                                        }}
                                    >
                                        <SelectTrigger className="w-full h-10 rounded-xl bg-white border-slate-200 font-bold text-xs ring-0 focus:ring-1 focus:ring-amber-200">
                                            <SelectValue placeholder="임원아님" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl z-[10000]">
                                            {["임원아님", "반장", "부반장", "회장", "부회장", "전교회장", "전교부회장"].map(role => (
                                                <SelectItem key={role} value={role} className="rounded-lg font-bold text-xs py-2.5">{role}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="pt-1">
                                    <input
                                        type="text"
                                        placeholder="예: 25.03~"
                                        value={student.officerPeriod || ""}
                                        disabled={(student.officerRole || "임원아님") === "임원아님"}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, officerPeriod: val } : s));
                                        }}
                                        className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold placeholder:text-slate-300 focus:border-amber-400 outline-none transition-all disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-300"
                                    />
                                </div>

                                <div className="relative group/txt pt-1">
                                    <div className={cn(
                                        "p-5 rounded-2xl text-[12px] font-medium min-h-[100px] leading-[1.7] transition-all",
                                        student.aiResult ? "bg-slate-50 text-slate-700 border border-slate-100" : "bg-slate-50/50 text-slate-300 italic border border-dashed border-slate-200"
                                    )}>
                                        {student.isGenerating ? (
                                            <div className="flex flex-col gap-2.5">
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
                                                className="w-full min-h-[100px] bg-transparent outline-none resize-none border-none p-0 focus:ring-0"
                                            />
                                        ) : (
                                            student.aiResult || "참여 행사를 클릭하고 생성을 눌러주세요."
                                        )}
                                    </div>
                                    {student.aiResult && !student.isGenerating && (
                                        <div className="absolute top-3 right-3 opacity-0 group-hover/txt:opacity-100 transition-opacity">
                                            <div
                                                onClick={() => {
                                                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isEditable: !s.isEditable } : s));
                                                }}
                                                className={cn(
                                                    "size-8 rounded-lg shadow-lg border border-slate-100 flex items-center justify-center cursor-pointer transition-all hover:scale-110",
                                                    student.isEditable ? "bg-amber-500 text-white" : "bg-white text-slate-400 hover:text-amber-500"
                                                )}
                                            >
                                                <Edit3 className="size-3.5" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 pt-1 min-w-[100px]">
                                    <Button
                                        onClick={() => handleGenerate(student.id)}
                                        disabled={student.isGenerating || (student.participatedEvents?.length || 0) === 0}
                                        className={cn(
                                            "w-full rounded-2xl font-black h-12 px-5 gap-2 text-[13px] transition-all shadow-lg",
                                            student.aiResult
                                                ? "bg-amber-100 text-amber-600 hover:bg-amber-200 shadow-amber-100"
                                                : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/20"
                                        )}
                                    >
                                        {student.aiResult ? "재생성" : "생성"} <Sparkles className="size-3.5" />
                                    </Button>
                                    <button
                                        onClick={() => {
                                            setStudents(prev => prev.map(s => s.id === student.id ? {
                                                ...s,
                                                participatedEvents: [],
                                                officerRole: "임원아님",
                                                officerPeriod: "",
                                                aiResult: ""
                                            } : s));
                                        }}
                                        className="w-full h-11 rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2 font-black text-[11px]"
                                    >
                                        <RotateCcw className="size-3" /> 초기화
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between py-8 px-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="px-6 py-3 bg-white rounded-2xl text-sm font-black text-slate-600 border border-slate-200 shadow-sm flex items-center gap-3">
                                <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
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
                                <Zap className="size-5 text-amber-400" /> 전체 생성
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </Wrapper>
    );
};

const EventPicker = ({
    studentId,
    selectedEvents,
    setStudents
}: {
    studentId: number,
    selectedEvents: string[],
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>
}) => {
    const [search, setSearch] = useState("");

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="h-8 w-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500 transition-all group">
                    <Plus className="size-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl border-slate-100 shadow-2xl overflow-hidden z-[10050]" align="start">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="행사명 검색..."
                            className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-400 transition-all"
                        />
                    </div>
                </div>
                <div className="h-64 overflow-y-auto custom-scrollbar p-2">
                    {search && !CREATIVE_CATEGORIES.some(cat => cat.events.includes(search)) && (
                        <button
                            onClick={() => {
                                setStudents(prev => prev.map(s => {
                                    if (s.id !== studentId) return s;
                                    const events = s.participatedEvents || [];
                                    if (events.includes(search)) return s;
                                    return {
                                        ...s,
                                        participatedEvents: [...events, search]
                                    };
                                }));
                                setSearch("");
                            }}
                            className="w-full text-left px-3 py-3 rounded-xl text-xs font-black bg-amber-500 text-white shadow-lg shadow-amber-200 mb-4 flex items-center justify-between group"
                        >
                            <span>"{search}" 직접 추가하기</span>
                            <Plus className="size-4" />
                        </button>
                    )}
                    {CREATIVE_CATEGORIES.map(cat => {
                        const filteredEvents = cat.events.filter(e => e.includes(search));
                        if (filteredEvents.length === 0) return null;

                        return (
                            <div key={cat.id} className="mb-4">
                                <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</div>
                                <div className="space-y-0.5">
                                    {filteredEvents.map(e => {
                                        const isSelected = selectedEvents.includes(e);
                                        return (
                                            <button
                                                key={e}
                                                onClick={() => {
                                                    setStudents(prev => prev.map(s => {
                                                        if (s.id !== studentId) return s;
                                                        const events = s.participatedEvents || [];
                                                        return {
                                                            ...s,
                                                            participatedEvents: isSelected ? events.filter(ev => ev !== e) : [...events, e]
                                                        };
                                                    }));
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group/item",
                                                    isSelected ? "bg-amber-50 text-amber-600" : "hover:bg-slate-50 text-slate-600"
                                                )}
                                            >
                                                {e}
                                                {isSelected ? <CheckCircle2 className="size-3.5 text-amber-500" /> : <Plus className="size-3.5 opacity-0 group-hover/item:opacity-100 text-slate-300" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
