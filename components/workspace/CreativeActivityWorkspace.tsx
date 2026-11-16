"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
    Zap,
    X,
    Plus,
    Search,
    Sparkles,
    CheckCircle2,
    Maximize2,
    Minimize2,
    RotateCcw,
    UserCheck,
    ChevronDown,
    ChevronUp,
    ListPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GenerationMenu } from "@/components/workspace/GenerationMenu";
import type { GenerationMode } from "@/lib/record-generation";
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
import { CREATIVE_CATEGORIES, OFFICER_ROLES } from "@/lib/constants/creative-events";

const EVENT_PREVIEW_LIMIT = 4;
const GRID_COLUMNS = "grid-cols-[32px_52px_minmax(180px,1.2fr)_120px_140px_minmax(280px,2fr)_120px]";

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

interface CreativeActivityWorkspaceProps {
    polishAction?: React.ReactNode;
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    handleGenerate: (id: number, mode: GenerationMode) => void;
    handleAllGenerate: (mode: GenerationMode) => void;
    handleSelectedGenerate: (mode: GenerationMode) => void;
    handleResetAll: () => void;
    handleClearSelection?: () => void;
    toggleAllSelection: () => void;
    toggleStudentSelection: (id: number) => void;
    studentCount: number;
    charLimit: number;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CreativeActivityWorkspace = ({
    polishAction,
    students,
    setStudents,
    handleGenerate,
    handleAllGenerate,
    handleSelectedGenerate,
    handleResetAll,
    handleClearSelection,
    toggleAllSelection,
    toggleStudentSelection,
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
    const selectedCount = students.filter(s => s.selected).length;

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
            <section
                aria-label="학생별 기록"
                className={cn(
                    workspaceCardClassName,
                    "relative space-y-4 p-4 sm:p-5",
                    isExpanded && "pointer-events-auto fixed inset-4 overflow-y-auto overscroll-contain shadow-2xl"
                )}
            >
                <WorkspaceCardHeader
                    icon={<Zap />}
                    accent="amber"
                    title="학생별 기록"
                    description="활동 선택 → 임원·기간 입력 → 학생별 또는 선택·전체 생성"
                    actions={<>
                        {polishAction}
                        <AutoDistributeEvents students={students} setStudents={setStudents} />
                        <BulkEventAdd students={students} setStudents={setStudents} />
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

                <div className={cn("rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40", workspaceTableScrollClassName(isExpanded, "xl"))}>
                    <div className="w-fit min-w-full">
                        <div className={cn(workspaceStickyHeadClassName(isExpanded, "xl"), "rounded-t-xl")}>
                            <div className={cn("grid items-center gap-4 px-5 py-2.5", GRID_COLUMNS, workspaceTableHeadClassName)}>
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
                                <div>참여 행사 (복수 선택)</div>
                                <div>임원 여부</div>
                                <div>임원 기간</div>
                                <div>작성 결과</div>
                                <div className="text-center">관리</div>
                            </div>
                        </div>

                        <div className="space-y-2 p-2 sm:p-3">
                            {students.map((student) => {
                                const isRowOpen = expandedRowId === student.id;
                                const participatedEvents = student.participatedEvents || [];
                                const isEventRowOpen = expandedEventRows.has(student.id);
                                const visibleEvents = isEventRowOpen ? participatedEvents : participatedEvents.slice(0, EVENT_PREVIEW_LIMIT);
                                const hiddenEventCount = participatedEvents.length - visibleEvents.length;
                                const isOfficer = (student.officerRole || "임원아님") !== "임원아님";
                                return (
                                <div
                                    key={student.id}
                                    data-student-id={student.id}
                                    className={cn(
                                        "group/row grid items-start gap-4 px-3 py-3",
                                        GRID_COLUMNS,
                                        workspaceRowClassName(student.selected, "amber"),
                                        isRowOpen && "ring-2 ring-amber-400/30"
                                    )}
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

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <AnimatePresence mode="popLayout">
                                            {visibleEvents.map((ev) => (
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                    key={ev}
                                                >
                                                    <Badge variant="secondary" className="h-8 gap-0.5 rounded-lg border-amber-200 bg-amber-50 py-0 pl-2.5 pr-1 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                                        {ev}
                                                        <button
                                                            type="button"
                                                            aria-label={`${student.id}번 학생 ${ev} 삭제`}
                                                            onClick={() => {
                                                                setStudents(prev => prev.map(s => s.id === student.id ? {
                                                                    ...s, participatedEvents: s.participatedEvents?.filter(e => e !== ev)
                                                                } : s));
                                                            }}
                                                            className="flex size-5 items-center justify-center rounded-md text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60 dark:hover:text-amber-200"
                                                        >
                                                            <X aria-hidden="true" className="size-3" />
                                                        </button>
                                                    </Badge>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        {hiddenEventCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleEventRow(student.id)}
                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-500 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
                                            >
                                                더보기 {hiddenEventCount}
                                                <ChevronDown aria-hidden="true" className="size-3.5" />
                                            </button>
                                        )}
                                        {isEventRowOpen && participatedEvents.length > EVENT_PREVIEW_LIMIT && (
                                            <button
                                                type="button"
                                                onClick={() => toggleEventRow(student.id)}
                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
                                            >
                                                접기
                                                <ChevronUp aria-hidden="true" className="size-3.5" />
                                            </button>
                                        )}
                                        <EventPicker
                                            studentId={student.id}
                                            selectedEvents={participatedEvents}
                                            setStudents={setStudents}
                                        />
                                    </div>

                                    <div>
                                        <Select
                                            value={student.officerRole || "임원아님"}
                                            onValueChange={(val) => {
                                                setStudents(prev => prev.map(s =>
                                                    s.id === student.id ? { ...s, officerRole: val, officerPeriod: val === "임원아님" ? "" : s.officerPeriod } : s
                                                ));
                                            }}
                                        >
                                            <SelectTrigger aria-label={`${student.id}번 학생 임원 직책`} className={cn("h-9 w-full rounded-xl border-slate-200 bg-white text-xs font-medium shadow-none dark:border-slate-700 dark:bg-slate-900", isOfficer ? "text-amber-800 dark:text-amber-200" : "text-slate-500 dark:text-slate-400")}>
                                                <SelectValue placeholder="임원아님" />
                                            </SelectTrigger>
                                            <SelectContent className="z-[10000] rounded-xl">
                                                {[...new Set([...OFFICER_ROLES, "회장", "부회장", student.officerRole].filter((role): role is string => Boolean(role)))].map(role => (
                                                    <SelectItem key={role} value={role} className="rounded-lg py-2 text-xs font-medium">{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            placeholder={isOfficer ? "예: 2026.03.01.~08.31." : "임원만 입력"}
                                            aria-label={`${student.id}번 학생 임원 기간`}
                                            value={student.officerPeriod || ""}
                                            disabled={!isOfficer}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, officerPeriod: val } : s));
                                            }}
                                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-amber-900/50 dark:disabled:bg-slate-800/60"
                                        />
                                    </div>

                                    <div className={cn("group/txt relative", isRowOpen && "col-span-full row-start-2 max-w-[calc(100vw-6rem)]")}>
                                        <div
                                            onClick={() => { if (!isRowOpen && !student.isGenerating) setExpandedRowId(student.id); }}
                                            className={cn(
                                                "rounded-xl text-sm leading-relaxed transition-colors",
                                                isRowOpen ? "min-h-[180px] p-4" : "h-[96px] cursor-pointer overflow-hidden p-3 pr-10 hover:border-amber-200 dark:hover:border-amber-800",
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
                                                    placeholder="참여 행사를 클릭하고 생성을 눌러주세요."
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, aiResult: newVal } : s));
                                                    }}
                                                    className="min-h-[160px] w-full resize-none border-none bg-transparent p-0 leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-300 dark:placeholder:text-slate-500"
                                                />
                                            ) : (
                                                <div className="line-clamp-3">{student.aiResult || "참여 행사를 클릭하고 생성을 눌러주세요."}</div>
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
                                                    isRowOpen ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 bg-white text-slate-400 opacity-0 hover:text-amber-600 focus-visible:opacity-100 group-hover/txt:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-amber-400"
                                                )}
                                            >
                                                {isRowOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-stretch gap-1" style={{ gridColumn: "-2 / -1", gridRow: 1 }}>
                                        <GenerationMenu
                                            onGenerate={mode => handleGenerate(student.id, mode)}
                                            disabled={student.isGenerating || participatedEvents.length === 0}
                                            className={workspaceRowGenerateClassName(Boolean(student.aiResult))}
                                        >
                                            <Sparkles aria-hidden="true" />{student.aiResult ? "재생성" : "생성"}
                                        </GenerationMenu>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStudents(prev => prev.map(s => s.id === student.id ? {
                                                    ...s,
                                                    participatedEvents: [],
                                                    officerRole: "임원아님",
                                                    officerPeriod: "",
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

                <WorkspaceActionBar selectedCount={selectedCount} onClearSelection={handleClearSelection} expanded={isExpanded}>
                    <Button variant="outline" onClick={handleResetAll} className={workspaceSecondaryActionClassName}>
                        <RotateCcw aria-hidden="true" /> 전체 초기화
                    </Button>
                    <GenerationMenu onGenerate={handleSelectedGenerate} variant="outline" className={workspaceSecondaryActionClassName}>
                        <UserCheck aria-hidden="true" /> 선택 생성
                    </GenerationMenu>
                    <GenerationMenu onGenerate={handleAllGenerate} className={workspacePrimaryActionClassName}>
                        <Zap aria-hidden="true" /> 전체 생성
                    </GenerationMenu>
                </WorkspaceActionBar>
            </section>
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
                    className={workspaceToolButtonClassName}
                >
                    <Sparkles aria-hidden="true" className="text-amber-500" />활동 자동배정
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0 rounded-xl border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-[10050]" align="end">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">활동 자동배정</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
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
                        className="w-full h-28 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all resize-none leading-relaxed"
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
                                    "h-9 rounded-xl border text-xs font-semibold transition-colors",
                                    countMode === option.value
                                        ? "bg-amber-500 border-amber-500 text-white"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-200 dark:hover:border-amber-800 hover:text-amber-600 dark:hover:text-amber-300"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {countMode === "custom" && (
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/40 px-4 py-3">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">학생당 배정 개수</span>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={customCount}
                                onChange={(event) => setCustomCount(event.target.value)}
                                className="h-9 w-24 rounded-lg border border-amber-100 dark:border-amber-900 bg-white dark:bg-slate-900 px-3 text-right text-xs font-semibold text-amber-800 dark:text-amber-200 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                            />
                        </label>
                    )}

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-4 py-3 cursor-pointer">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">기존 행사 비우기</span>
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
                                <Badge key={`${event}-${index}`} variant="secondary" className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-900 font-medium text-xs">
                                    {event}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="text-amber-700 dark:text-amber-300">{selectedCount}명</span>
                            <span className="mx-1">/</span>
                            <span className="text-amber-700 dark:text-amber-300">{parsedEvents.length}개 행사</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Select value={randomCount} onValueChange={setRandomCount}>
                                <SelectTrigger className="h-9 w-20 rounded-[12px] border-amber-100 dark:border-amber-900 bg-white dark:bg-slate-900 text-xs font-semibold text-amber-800 dark:text-amber-200">
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
                                className="rounded-xl h-9 px-3 font-semibold text-xs border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-2"
                            >
                                행사랜덤추가 <Sparkles className={cn("size-3.5", isRandomLoading && "animate-spin")} />
                            </Button>
                            <Button
                                onClick={handleDistribute}
                                disabled={parsedEvents.length === 0 || selectedCount === 0}
                                className="rounded-xl h-9 px-4 font-semibold text-xs"
                            >
                                배정하기
                            </Button>
                        </div>
                    </div>
                    {selectedCount === 0 && (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">학생을 선택하세요.</p>
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
                    className={workspaceToolButtonClassName}
                >
                    <ListPlus aria-hidden="true" className="text-amber-500" />선택 학생 활동 일괄추가
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 rounded-xl border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-[10050]" align="end">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">선택 학생 활동 일괄추가</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
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
                        className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all resize-none leading-relaxed"
                    />
                    {parsedEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {parsedEvents.map((ev, i) => (
                                <Badge key={`${ev}-${i}`} variant="secondary" className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900 font-medium text-xs">
                                    {ev}
                                </Badge>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            선택된 학생 <span className="text-amber-700 dark:text-amber-300">{selectedCount}명</span>에게 추가
                        </div>
                        <Button
                            onClick={handleAdd}
                            disabled={parsedEvents.length === 0 || selectedCount === 0}
                            className="rounded-xl h-9 px-4 font-semibold text-xs"
                        >
                            추가하기
                        </Button>
                    </div>
                    {selectedCount === 0 && (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">먼저 학생을 체크해주세요.</p>
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
                <button type="button" aria-label={`${studentId}번 학생 활동 선택`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-amber-300 px-2.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/40">
                    <Plus aria-hidden="true" className="size-3.5" />활동 선택
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-xl border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-[10050]" align="start">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="활동 검색 또는 직접 입력" aria-label={`${studentId}번 학생 활동 검색 또는 직접 입력`}
                            className="w-full h-9 pl-9 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-amber-400 transition-colors"
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
                            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 mb-3 flex items-center justify-between"
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
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{cat.name}</div>
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
                                                    "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between group/item",
                                                    isSelected ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200" : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300"
                                                )}
                                            >
                                                {e}
                                                {isSelected ? <CheckCircle2 className="size-3.5 text-amber-500 dark:text-amber-400" /> : <Plus className="size-3.5 opacity-0 group-hover/item:opacity-100 text-slate-300" />}
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
