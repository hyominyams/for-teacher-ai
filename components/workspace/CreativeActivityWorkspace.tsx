"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
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
    ChevronDown,
    ChevronUp,
    ListPlus
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

const EVENT_PREVIEW_LIMIT = 4;

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

interface CreativeActivityWorkspaceProps {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    handleGenerate: (id: number) => void;
    handleAllGenerate: () => void;
    handleSelectedGenerate: () => void;
    handleResetAll: () => void;
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
    setIsExpanded
}: CreativeActivityWorkspaceProps) => {
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    const [expandedEventRows, setExpandedEventRows] = useState<Set<number>>(new Set());

    const toggleEventRow = (studentId: number) => {
        setExpandedEventRows(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

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
        <Wrapper isExpanded={isExpanded} mounted={mounted}>
            <Card className={cn(
                "p-10 border-0 bg-white shadow-2xl shadow-slate-200/50 space-y-8 transition-all duration-500 relative",
                isExpanded ? "fixed inset-4 z-[9999] rounded-[3rem] border border-blue-100 shadow-primary/20 !transform-none overflow-y-auto overscroll-contain pointer-events-auto cursor-default" : "rounded-[3rem] overflow-hidden"
            )}>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
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
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 w-full xl:w-auto">
                        <AutoDistributeEvents students={students} setStudents={setStudents} />
                        <BulkEventAdd students={students} setStudents={setStudents} />
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
                            className="rounded-2xl h-11 px-6 font-bold border-emerald-100 bg-emerald-50 text-emerald-600 gap-2 hover:bg-emerald-100 transition-all font-black text-xs shrink-0 w-full sm:w-auto"
                        >
                            내보내기 <Download className="size-4" />
                        </Button>
                        <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="rounded-2xl h-11 px-5 border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all w-full sm:w-auto"
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

                <div
                    className="bg-amber-100/10 rounded-[2.5rem] border border-slate-100 overflow-auto custom-scrollbar relative"
                    style={{ height: isExpanded ? "calc(100vh - 400px)" : "600px" }}
                >
                    <div className="w-fit min-w-full flex flex-col min-h-full">
                        {/* Sticky Table Header */}
                        <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-100 shadow-sm">
                            <div className="grid grid-cols-[40px_60px_minmax(180px,1.2fr)_120px_130px_minmax(280px,2fr)_120px] gap-6 px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 items-center">
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
                                <div className="pl-3">임원 여부</div>
                                <div className="pl-3">임원 기간</div>
                                <div className="pl-5">AI 결과 및 편집</div>
                                <div className="text-center">관리 액션</div>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="p-6 pt-4 space-y-3">
                            {students.map((student) => {
                                const isRowOpen = expandedRowId === student.id;
                                const participatedEvents = student.participatedEvents || [];
                                const isEventRowOpen = expandedEventRows.has(student.id);
                                const visibleEvents = isEventRowOpen ? participatedEvents : participatedEvents.slice(0, EVENT_PREVIEW_LIMIT);
                                const hiddenEventCount = participatedEvents.length - visibleEvents.length;
                                return (
                                <div key={student.id} className={cn(
                                    "grid grid-cols-[40px_60px_minmax(180px,1.2fr)_120px_130px_minmax(280px,2fr)_120px] gap-6 px-8 rounded-[2rem] border transition-all items-start group/row",
                                    isRowOpen ? "py-6" : "py-3.5",
                                    student.selected ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-100",
                                    isRowOpen && "ring-2 ring-amber-400/30 border-amber-300 shadow-xl shadow-amber-100/40"
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
                                            {visibleEvents.map((ev) => (
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
                                        {hiddenEventCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleEventRow(student.id)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-black text-slate-500 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                                            >
                                                더보기 {hiddenEventCount}
                                                <ChevronDown className="size-3.5" />
                                            </button>
                                        )}
                                        {isEventRowOpen && participatedEvents.length > EVENT_PREVIEW_LIMIT && (
                                            <button
                                                type="button"
                                                onClick={() => toggleEventRow(student.id)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 text-[11px] font-black text-amber-700 transition-all hover:bg-amber-100"
                                            >
                                                접기
                                                <ChevronUp className="size-3.5" />
                                            </button>
                                        )}
                                        <EventPicker
                                            studentId={student.id}
                                            selectedEvents={participatedEvents}
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
                                        <div
                                            onClick={() => { if (!isRowOpen && !student.isGenerating) setExpandedRowId(student.id); }}
                                            className={cn(
                                                "rounded-2xl text-[12px] font-medium leading-[1.7] transition-all",
                                                isRowOpen ? "p-5 min-h-[180px]" : "p-4 h-[100px] overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-300/50",
                                                student.aiResult ? "bg-slate-50 text-slate-700 border border-slate-100" : "bg-slate-50/50 text-slate-300 italic border border-dashed border-slate-200"
                                            )}
                                        >
                                            {student.isGenerating ? (
                                                <div className="flex flex-col gap-2.5">
                                                    <div className="h-2 w-full bg-slate-200 rounded-full animate-pulse" />
                                                    <div className="h-2 w-4/5 bg-slate-200 rounded-full animate-pulse" />
                                                </div>
                                            ) : isRowOpen ? (
                                                <textarea
                                                    autoFocus
                                                    value={student.aiResult}
                                                    placeholder="참여 행사를 클릭하고 생성을 눌러주세요."
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                    }}
                                                    className="w-full min-h-[160px] bg-transparent outline-none resize-none border-none p-0 focus:ring-0 leading-[1.7]"
                                                />
                                            ) : (
                                                <div className="line-clamp-3">{student.aiResult || "참여 행사를 클릭하고 생성을 눌러주세요."}</div>
                                            )}
                                        </div>
                                        {!student.isGenerating && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setExpandedRowId(isRowOpen ? null : student.id); }}
                                                title={isRowOpen ? "접기" : "펼쳐서 편집"}
                                                className={cn(
                                                    "absolute top-2.5 right-2.5 size-8 rounded-lg shadow-lg border flex items-center justify-center cursor-pointer transition-all hover:scale-110",
                                                    isRowOpen ? "bg-amber-500 text-white border-amber-500 opacity-100" : "bg-white text-slate-400 border-slate-100 opacity-0 group-hover/txt:opacity-100 hover:text-amber-500"
                                                )}
                                            >
                                                {isRowOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                            </button>
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
                                );
                            })}
                        </div>
                    </div>
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
            </Card>
        </Wrapper>
    );
};

type EventCountMode = "3" | "4" | "custom";

const parseEventInput = (input: string) => Array.from(new Set(
    input
        .split(/[,，\n]/)
        .map(event => event.replace(/\s+/g, " ").trim())
        .filter(Boolean)
));

const getEventCountForStudent = (mode: EventCountMode, customCount: number) => {
    if (mode === "3") return 3;
    if (mode === "4") return 4;
    return customCount;
};

const circularDistance = (from: number, to: number, size: number) => {
    const direct = Math.abs(from - to);
    return Math.min(direct, size - direct);
};

const pickDistributedEvents = (
    events: string[],
    studentIndex: number,
    targetCount: number,
    usage: Map<string, number>,
    previousAssignment: string[]
) => {
    const selected: string[] = [];

    while (selected.length < targetCount) {
        const cursor = (studentIndex * targetCount + selected.length) % events.length;
        const candidates = events.filter(event => !selected.includes(event));
        if (candidates.length === 0) break;

        const next = candidates.sort((a, b) => {
            const usageDiff = (usage.get(a) || 0) - (usage.get(b) || 0);
            if (usageDiff !== 0) return usageDiff;

            const previousDiff = Number(previousAssignment.includes(a)) - Number(previousAssignment.includes(b));
            if (previousDiff !== 0) return previousDiff;

            const distanceDiff = circularDistance(events.indexOf(a), cursor, events.length)
                - circularDistance(events.indexOf(b), cursor, events.length);
            if (distanceDiff !== 0) return distanceDiff;

            return a.localeCompare(b, "ko");
        })[0];

        selected.push(next);
        usage.set(next, (usage.get(next) || 0) + 1);
    }

    return selected;
};

const AutoDistributeEvents = ({
    students,
    setStudents
}: {
    students: Student[],
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>
}) => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [countMode, setCountMode] = useState<EventCountMode>("3");
    const [customCount, setCustomCount] = useState("5");
    const [randomCount, setRandomCount] = useState("3");
    const [isRandomLoading, setIsRandomLoading] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(true);
    const selectedCount = students.filter(s => s.selected).length;
    const parsedEvents = parseEventInput(input);
    const normalizedCustomCount = Math.min(Math.max(Number(customCount) || 1, 1), 20);

    const handleRandomAdd = async () => {
        setIsRandomLoading(true);
        try {
            const response = await fetch(`/api/creative-events/random?count=${randomCount}&exclude=${encodeURIComponent(parsedEvents.join(","))}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "행사를 불러오지 못했습니다.");
            }

            const nextEvents: unknown[] = Array.isArray(data.events) ? data.events : [];
            const merged = [...parsedEvents];
            nextEvents.forEach((event) => {
                if (typeof event === "string" && event.trim() && !merged.includes(event.trim())) {
                    merged.push(event.trim());
                }
            });
            setInput(merged.join(", "));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "행사를 불러오지 못했습니다.";
            alert(message);
        } finally {
            setIsRandomLoading(false);
        }
    };

    const handleDistribute = () => {
        if (parsedEvents.length === 0 || selectedCount === 0) return;

        setStudents(prev => {
            const selectedStudents = prev
                .filter(student => student.selected)
                .sort((a, b) => a.id - b.id);
            const usage = new Map<string, number>(parsedEvents.map(event => [event, 0]));

            if (!replaceExisting) {
                selectedStudents.forEach(student => {
                    (student.participatedEvents || []).forEach(event => {
                        if (usage.has(event)) usage.set(event, (usage.get(event) || 0) + 1);
                    });
                });
            }

            const assignments = new Map<number, string[]>();
            let previousAssignment: string[] = [];

            selectedStudents.forEach((student, index) => {
                const targetCount = Math.min(parsedEvents.length, getEventCountForStudent(countMode, normalizedCustomCount));
                const assignedEvents = pickDistributedEvents(parsedEvents, index, targetCount, usage, previousAssignment);
                assignments.set(student.id, assignedEvents);
                previousAssignment = assignedEvents;
            });

            return prev.map(student => {
                if (!student.selected) return student;
                const assignedEvents = assignments.get(student.id) || [];

                if (replaceExisting) {
                    return { ...student, participatedEvents: assignedEvents };
                }

                const merged = [...(student.participatedEvents || [])];
                assignedEvents.forEach(event => {
                    if (!merged.includes(event)) merged.push(event);
                });
                return { ...student, participatedEvents: merged };
            });
        });

        setInput("");
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="rounded-2xl h-11 px-6 font-bold border-amber-100 bg-amber-50 text-amber-600 gap-2 hover:bg-amber-100 transition-all font-black text-xs shrink-0 w-full sm:w-auto"
                >
                    행사 자동배정 <Sparkles className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0 rounded-2xl border-slate-100 shadow-2xl overflow-hidden z-[10050]" align="end">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="text-sm font-black text-slate-700">행사 자동배정</div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                        학교 행사명으로 선택 학생의 참여 행사를 채웁니다.
                    </p>
                </div>
                <div className="p-4 space-y-4">
                    <textarea
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleDistribute();
                            }
                        }}
                        placeholder="예: 시업식, 학급자치회, 과학의 달, 운동회, 현장체험학습"
                        className="w-full h-28 px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold placeholder:text-slate-300 focus:border-amber-400 outline-none transition-all resize-none leading-relaxed"
                    />

                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { value: "3", label: "3개" },
                            { value: "4", label: "4개" },
                            { value: "custom", label: "직접 입력" }
                        ] as const).map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setCountMode(option.value)}
                                className={cn(
                                    "h-10 rounded-xl border text-xs font-black transition-all",
                                    countMode === option.value
                                        ? "bg-amber-500 border-amber-500 text-white"
                                        : "bg-white border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {countMode === "custom" && (
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
                            <span className="text-xs font-black text-amber-700">학생당 배정 개수</span>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={customCount}
                                onChange={(event) => setCustomCount(event.target.value)}
                                className="h-9 w-24 rounded-lg border border-amber-100 bg-white px-3 text-right text-xs font-black text-amber-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                        </label>
                    )}

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 cursor-pointer">
                        <span className="text-xs font-black text-slate-600">기존 행사 비우기</span>
                        <input
                            type="checkbox"
                            checked={replaceExisting}
                            onChange={(e) => setReplaceExisting(e.target.checked)}
                            className="size-4 rounded border-slate-300 accent-amber-500"
                        />
                    </label>

                    {parsedEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                            {parsedEvents.map((event, index) => (
                                <Badge key={`${event}-${index}`} variant="secondary" className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border-amber-100 font-bold text-[11px]">
                                    {event}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="text-[11px] font-bold text-slate-400">
                            <span className="text-amber-600">{selectedCount}명</span>
                            <span className="mx-1">/</span>
                            <span className="text-amber-600">{parsedEvents.length}개 행사</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Select value={randomCount} onValueChange={setRandomCount}>
                                <SelectTrigger className="h-9 w-20 rounded-xl border-amber-100 bg-white text-xs font-black text-amber-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[10080]">
                                    {Array.from({ length: 20 }, (_, index) => index + 1).map(count => (
                                        <SelectItem key={count} value={String(count)}>
                                            {count}개
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRandomAdd}
                                disabled={isRandomLoading}
                                className="rounded-xl h-9 px-4 font-black text-xs border-amber-100 bg-white text-amber-700 hover:bg-amber-50 gap-2"
                            >
                                행사랜덤추가 <Sparkles className={cn("size-3.5", isRandomLoading && "animate-spin")} />
                            </Button>
                            <Button
                                onClick={handleDistribute}
                                disabled={parsedEvents.length === 0 || selectedCount === 0}
                                className="rounded-xl h-9 px-5 font-black text-xs bg-amber-600 text-white hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all"
                            >
                                배정하기
                            </Button>
                        </div>
                    </div>
                    {selectedCount === 0 && (
                        <p className="text-[11px] font-bold text-red-400">학생을 선택하세요.</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const BulkEventAdd = ({
    students,
    setStudents
}: {
    students: Student[],
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>
}) => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const selectedCount = students.filter(s => s.selected).length;

    const parsedEvents = parseEventInput(input);

    const handleAdd = () => {
        if (parsedEvents.length === 0 || selectedCount === 0) return;
        setStudents(prev => prev.map(s => {
            if (!s.selected) return s;
            const existing = s.participatedEvents || [];
            const merged = [...existing];
            parsedEvents.forEach(ev => {
                if (!merged.includes(ev)) merged.push(ev);
            });
            return { ...s, participatedEvents: merged };
        }));
        setInput("");
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="rounded-2xl h-11 px-6 font-bold border-blue-100 bg-blue-50 text-blue-600 gap-2 hover:bg-blue-100 transition-all font-black text-xs shrink-0 w-full sm:w-auto"
                >
                    행사 일괄추가 <ListPlus className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 rounded-2xl border-slate-100 shadow-2xl overflow-hidden z-[10050]" align="end">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="text-sm font-black text-slate-700">행사 일괄추가</div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                        쉼표로 구분한 행사명을 선택 학생에게 추가합니다.
                    </p>
                </div>
                <div className="p-4 space-y-3">
                    <textarea
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                        placeholder="예: 시업식, 방학식, 운동회"
                        className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold placeholder:text-slate-300 focus:border-blue-400 outline-none transition-all resize-none leading-relaxed"
                    />
                    {parsedEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {parsedEvents.map((ev, i) => (
                                <Badge key={`${ev}-${i}`} variant="secondary" className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border-blue-100 font-bold text-[11px]">
                                    {ev}
                                </Badge>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] font-bold text-slate-400">
                            선택된 학생 <span className="text-blue-600">{selectedCount}명</span>에게 추가
                        </div>
                        <Button
                            onClick={handleAdd}
                            disabled={parsedEvents.length === 0 || selectedCount === 0}
                            className="rounded-xl h-9 px-5 font-black text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all"
                        >
                            추가하기
                        </Button>
                    </div>
                    {selectedCount === 0 && (
                        <p className="text-[11px] font-bold text-red-400">먼저 학생을 체크해주세요.</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
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
                            <span>{search} 직접 추가하기</span>
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
