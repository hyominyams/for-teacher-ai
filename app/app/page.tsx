"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    UserCheck,
    BookOpen,
    Zap,
    FileText,
    X,
    Upload,
    FileSearch,
    Loader2,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importWorkspaceCsv } from "@/lib/workspace-csv";
import { supabase } from "@/lib/supabase";
import type { AchievementLevel, CriteriaLevels, ParsedSubjectPlanSubject, Student, SubjectAssessmentInfo, SubjectGlobalConfig } from "@/types";
import { WorkLogSessionBar } from "@/components/workspace/WorkLogSessionBar";
import { getSavedWorkLog, workLogRequest, WorkLogError } from "@/lib/work-log-client";
import { defaultWorkTitle, isWorkCategory, normalizeWorkData, workFingerprint, workLogCsv, stableWorkJson } from "@/lib/work-logs";
import type { SavedWorkLog } from "@/lib/work-logs";
import { ClassPolishControl } from "@/components/workspace/ClassPolishControl";
import type { PolishCategory } from "@/lib/class-polish";
import { BehaviorWorkspace } from "@/components/workspace/BehaviorWorkspace";
import { CreativeActivityWorkspace } from "@/components/workspace/CreativeActivityWorkspace";
import { SubjectWorkspace } from "@/components/workspace/SubjectWorkspace";
import { PlaceholderWorkspace } from "@/components/workspace/PlaceholderWorkspace";
import { studentKeywordPool, defaultKeywords } from "@/lib/constants/behavior-keywords";

type WorkLogData = {
    students: Student[];
    studentCount: number;
    charLimits: Record<string, number>;
    globalConfig?: SubjectGlobalConfig;
};

type SubjectPlanImportResult = {
    subjects: ParsedSubjectPlanSubject[];
    warnings: string[];
};

const features = [
    {
        id: "behavior",
        title: "행동특성 및 종합의견",
        desc: "관찰된 핵심 키워드 입력만으로 생동감 넘치는 생활기록부 문장을 완성합니다.",
        icon: UserCheck,
        color: "blue",
    },
    {
        id: "subject",
        title: "학기말 종합의견(교과)",
        desc: "교과별 성취 수준을 반영한 개인별 맞춤 의견 작성",
        icon: BookOpen,
        color: "indigo",
    },
    {
        id: "creative",
        title: "창의적 체험활동",
        desc: "자율, 동아리, 봉사, 진로 활동의 데이터 통합 관리",
        icon: Zap,
        color: "amber",
    },
    {
        id: "docs",
        title: "문서 작성",
        desc: "안내장, 보고서 초안 등 필수 행정 문서 지원",
        icon: FileText,
        color: "emerald",
    }
];

const DEFAULT_SCOPE_KEY = "default";
const DEFAULT_STUDENT_COUNTS: Record<string, number> = {
    behavior: 7,
    subject: 7,
    creative: 7,
    docs: 7
};
const SUBJECT_ORDER_STORAGE_PREFIX = "for-teacher-ai:subject-order:";

interface SubjectWorkLogSummary {
    scopeKey: string;
    scopeLabel: string;
    updatedAt?: string;
    createdAt?: string;
}

const getDefaultSubjectConfig = (): SubjectGlobalConfig => ({
    schoolLevel: "elementary",
    grade: "1",
    subjectName: "",
    assessments: []
});

const createInitialStudents = (count: number): Student[] => Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${i + 1}번 학생`,
    customKeywords: [],
    selectedKeywords: [],
    participatedEvents: [],
    officerRole: "임원아님",
    officerPeriod: "",
    aiResult: "",
    isGenerating: false,
    isEditable: false,
    selected: false,
    subjectData: { assessments: [], individualNote: "" }
}));

const resizeStudentsToCount = (sourceStudents: Student[] | undefined, count: number): Student[] => {
    const students = sourceStudents || [];
    if (students.length === count) return students;
    if (students.length > count) return students.slice(0, count);

    return [
        ...students,
        ...createInitialStudents(count).slice(students.length)
    ];
};

const getSubjectScopeLabel = (config: SubjectGlobalConfig) => config.subjectName.trim() || "새 교과";

const getSubjectOrderStorageKey = (userId: string) => `${SUBJECT_ORDER_STORAGE_PREFIX}${userId}`;

const readSubjectOrder = (userId: string): string[] => {
    if (typeof window === "undefined") return [];

    try {
        const rawValue = window.localStorage.getItem(getSubjectOrderStorageKey(userId));
        const parsed = rawValue ? JSON.parse(rawValue) : [];
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    } catch {
        return [];
    }
};

const writeSubjectOrder = (userId: string, logs: SubjectWorkLogSummary[]) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
        getSubjectOrderStorageKey(userId),
        JSON.stringify(logs.map(log => log.scopeKey))
    );
};

const applySubjectOrder = (logs: SubjectWorkLogSummary[], orderedScopeKeys: string[]) => {
    if (!orderedScopeKeys.length) return logs;

    const orderIndex = new Map(orderedScopeKeys.map((scopeKey, index) => [scopeKey, index]));
    return [...logs].sort((a, b) => {
        const aIndex = orderIndex.get(a.scopeKey);
        const bIndex = orderIndex.get(b.scopeKey);
        if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return 0;
    });
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
            levels[marker.level] = text
                .slice(marker.contentStart, nextMarker ? nextMarker.markerStart : text.length)
                .trim();
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
    }

    return levels;
};

const getCriteriaLevels = (
    assessment: Pick<ParsedSubjectPlanSubject["assessments"][number] | SubjectAssessmentInfo, "criteria" | "criteriaLevels">
): CriteriaLevels => {
    const parsedLevels = assessment.criteriaLevels ? {} : splitCriteriaLevelsFromText(assessment.criteria || "");
    return ACHIEVEMENT_LEVELS.reduce<CriteriaLevels>((acc, level) => {
        acc[level] = assessment.criteriaLevels?.[level] || parsedLevels[level] || "";
        return acc;
    }, {});
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

function DashboardPage() {
    const router = useRouter();
    const params = useSearchParams();
    const requestedLogId = params.get("log");
    const isSavedEditor = !!requestedLogId;
    const workEpoch = useRef(0);
    const aiAbort = useRef(new AbortController());
    const [workspaceVersion, setWorkspaceVersion] = useState(0);
    const [savedLog, setSavedLog] = useState<SavedWorkLog | null>(null);
    const savedLogRef = useRef<SavedWorkLog | null>(null);
    const [savedBaseline, setSavedBaseline] = useState("");
    const [logTitle, setLogTitle] = useState("");
    const [logBusy, setLogBusy] = useState(false);
    const [logMessage, setLogMessage] = useState("");
    const [logError, setLogError] = useState("");
    const [loadedSavedId, setLoadedSavedId] = useState("");
    const saveQueue = useRef(Promise.resolve(true));
    const draftSaveQueue = useRef(Promise.resolve());
    const [draftSaveStatus, setDraftSaveStatus] = useState("");
    const lastSnapshot = useRef<{ fingerprint: string; id: string } | null>(null);
    const snapshotAttempt = useRef<{ fingerprint: string; id: string } | null>(null);
    const [staleEdit, setStaleEdit] = useState<{ title: string; data: WorkLogData } | null>(null);
    const invalidateWorkspace = () => {
        aiAbort.current.abort(); aiAbort.current = new AbortController();
        workEpoch.current++; setWorkspaceVersion(v => v + 1);
    };
    useEffect(() => () => aiAbort.current.abort(), []);
    const [activeTabId, setActiveTabId] = useState(isWorkCategory(params.get("category")) ? params.get("category")! : features[0].id);
    const [studentCounts, setStudentCounts] = useState<Record<string, number>>(DEFAULT_STUDENT_COUNTS);
    const [charLimits, setCharLimits] = useState<Record<string, number>>({
        behavior: 300,
        subject: 300,
        creative: 300,
        docs: 500
    });
    const [students, setStudents] = useState<Student[]>([]);
    const [isAddingKeyword, setIsAddingKeyword] = useState<number | null>(null);
    const [newKeywordInput, setNewKeywordInput] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [subjectConfig, setSubjectConfig] = useState<SubjectGlobalConfig>(getDefaultSubjectConfig);
    const [subjectLogs, setSubjectLogs] = useState<SubjectWorkLogSummary[]>([]);
    const [activeSubjectScopeKey, setActiveSubjectScopeKey] = useState(DEFAULT_SCOPE_KEY);
    const restoredSubjectUser = useRef<string | null>(null);
    const hydratedSubjectScope = useRef<{ userId: string; scopeKey: string; epoch: number } | null>(null);
    const [isWorkLogLoading, setIsWorkLogLoading] = useState(true);
    const [isSubjectPlanImporting, setIsSubjectPlanImporting] = useState(false);
    const [subjectPlanImport, setSubjectPlanImport] = useState<SubjectPlanImportResult | null>(null);
    const [selectedSubjectPlanIndexes, setSelectedSubjectPlanIndexes] = useState<number[]>([]);
    const planDialogRef = useRef<HTMLDivElement>(null);
    const hasSubjectPlanImport = Boolean(subjectPlanImport);
    useEffect(() => {
        if (!hasSubjectPlanImport) return;
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
        planDialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, [hasSubjectPlanImport]);
    const studentCount = studentCounts[activeTabId] || DEFAULT_STUDENT_COUNTS[activeTabId] || 7;
    const setStudentCount = (count: number) => {
        setStudentCounts(prev => ({ ...prev, [activeTabId]: count }));
    };

    const currentData = useMemo(() => normalizeWorkData({ ...(isSavedEditor ? savedLog?.data : {}), students, studentCount, charLimits, ...(activeTabId === "subject" ? { globalConfig: subjectConfig } : {}) }, activeTabId as keyof typeof import("@/lib/work-logs").WORK_CATEGORIES), [students, studentCount, charLimits, activeTabId, subjectConfig, savedLog, isSavedEditor]);
    const editorDirty = isSavedEditor && loadedSavedId === requestedLogId && workFingerprint(currentData, logTitle) !== savedBaseline;
    const editCacheKey = userId && requestedLogId ? `ftai:saved-edit:${userId}:${requestedLogId}` : null;

    useEffect(() => {
        if (!isSavedEditor) setLogTitle(defaultWorkTitle(activeTabId as "behavior" | "subject" | "creative" | "docs"));
    }, [activeTabId, isSavedEditor]);

    useEffect(() => {
        if (!userId || !requestedLogId) { savedLogRef.current = null; setSavedLog(null); setLoadedSavedId(""); return; }
        const abort = new AbortController();
        invalidateWorkspace(); setIsWorkLogLoading(true); setLoadedSavedId(""); setLogError(""); setLogMessage(""); setStaleEdit(null);
        getSavedWorkLog(requestedLogId, abort.signal).then(log => {
            if (abort.signal.aborted) return;
            if (log.archived_at) { router.replace(`/app/logs?view=${log.id}`); return; }
            const normalized = normalizeWorkData(log.data, log.category);
            savedLogRef.current = log; setSavedLog(log);
            setSavedBaseline(workFingerprint(normalized, log.title));
            let restored = normalized, title = log.title;
            try {
                const raw = sessionStorage.getItem(`ftai:saved-edit:${userId}:${log.id}`);
                const pending = raw ? JSON.parse(raw) : null;
                if (pending && pending.revision === log.revision) { restored = normalizeWorkData(pending.data, log.category); title = pending.title; setLogMessage("저장하지 않았던 수정 내용을 복구했습니다. 확인 후 저장해주세요."); }
                else if (pending) { setStaleEdit({ title: pending.title, data: normalizeWorkData(pending.data, log.category) }); setLogMessage("다른 곳에서 변경된 최신 저장본을 열었습니다. 이전 임시 수정은 별도로 내보낼 수 있습니다."); }
            } catch { /* Corrupt local drafts never replace the server copy. */ }
            setActiveTabId(log.category); setLogTitle(title); setStudents(restored.students);
            setStudentCounts(prev => ({ ...prev, [log.category]: restored.studentCount }));
            setCharLimits(restored.charLimits);
            setSubjectConfig(restored.globalConfig || getDefaultSubjectConfig());
            setLoadedSavedId(log.id); setIsWorkLogLoading(false);
        }).catch(e => { if (!abort.signal.aborted) { setLogError(e instanceof Error ? e.message : "저장본을 불러오지 못했습니다."); setIsWorkLogLoading(false); } });
        return () => abort.abort();
    }, [userId, requestedLogId, router]);

    useEffect(() => {
        if (!editCacheKey || !savedLog || loadedSavedId !== requestedLogId || isWorkLogLoading) return;
        try {
            if (editorDirty) sessionStorage.setItem(editCacheKey, JSON.stringify({ revision: savedLog.revision, title: logTitle, data: currentData }));
            else { const prior = JSON.parse(sessionStorage.getItem(editCacheKey) || "null"); if (prior?.revision === savedLog.revision) sessionStorage.removeItem(editCacheKey); }
        } catch { /* The visible editor remains usable when browser storage is full. */ }
    }, [editCacheKey, savedLog, loadedSavedId, requestedLogId, isWorkLogLoading, editorDirty, currentData, logTitle]);

    useEffect(() => {
        if (!editorDirty) return;
        const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        const leaveLink = (event: MouseEvent) => {
            const link = (event.target as Element)?.closest?.("a");
            if (!link || link.target === "_blank" || event.metaKey || event.ctrlKey || link.href === window.location.href) return;
            if (!confirm("저장하지 않은 수정 내용이 있습니다. 이 화면을 나가시겠습니까?")) { event.preventDefault(); event.stopImmediatePropagation(); }
        };
        window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", leaveLink, true);
        return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", leaveLink, true); };
    }, [editorDirty]);

    const persistSavedEdits = (overrideStudents?: Student[]) => {
        const snapshot = normalizeWorkData({ ...currentData, students: overrideStudents || students }, activeTabId as "behavior" | "subject" | "creative" | "docs");
        const expectedId = requestedLogId, title = logTitle, epoch = workEpoch.current;
        const run = async () => {
            const log = savedLogRef.current;
            if (!log || log.id !== expectedId || log.archived_at) return false;
            setLogBusy(true); setLogError("");
            try {
                const updated = await workLogRequest<SavedWorkLog>(`/api/work-logs/${log.id}`, { method: "PUT", body: JSON.stringify({ id: log.id, category: log.category, revision: log.revision, title, data: snapshot }) });
                if (epoch === workEpoch.current) { savedLogRef.current = updated; setSavedLog(updated); setSavedBaseline(workFingerprint(snapshot, title)); }
                if (editCacheKey) sessionStorage.removeItem(editCacheKey);
                if (epoch === workEpoch.current) setLogMessage("수정 내용을 작업로그에 저장했습니다."); return true;
            } catch (e) { setLogError(e instanceof Error ? e.message : "저장하지 못했습니다."); return false; }
            finally { setLogBusy(false); }
        };
        saveQueue.current = saveQueue.current.then(run, run); return saveQueue.current;
    };

    const requestWorkspaceAI = async (url: string, options: RequestInit) => {
        const epoch = workEpoch.current, signal = aiAbort.current.signal;
        const { data: { session } } = await supabase.auth.getSession();
        if (epoch !== workEpoch.current || signal.aborted) throw new DOMException("작업이 변경되었습니다.", "AbortError");
        let body = options.body;
        if (requestedLogId && body instanceof FormData) body.set("workLogId", requestedLogId);
        else if (requestedLogId && typeof body === "string") body = JSON.stringify({ ...JSON.parse(body), workLogId: requestedLogId });
        const response = await fetch(url, { ...options, body, signal, headers: { ...options.headers, ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) } });
        if (!response.ok) {
            const failure = await response.clone().json().catch(() => ({}));
            if (epoch === workEpoch.current) setLogError(failure.error || "AI 요청을 처리하지 못했습니다.");
            throw new WorkLogError(failure.error || "AI 요청을 처리하지 못했습니다.", failure.code || "AI_ERROR", response.status);
        }
        return response;
    };

    const categoryFromUrl = params.get("category");
    useEffect(() => {
        if (!requestedLogId && isWorkCategory(categoryFromUrl)) setActiveTabId(categoryFromUrl);
    }, [requestedLogId, categoryFromUrl]);

    // User Session Profile + auth guard
    useEffect(() => {
        let mounted = true;

        const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
            if (!mounted) return;
            if (!session?.user) {
                setUserId(null);
                router.replace("/login");
                return;
            }

            setUserId(session.user.id);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            applySession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            applySession(session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    // Load work logs from Supabase
    useEffect(() => {
        if (!userId || isSavedEditor) return;

        const supportedTabs = ['behavior', 'creative', 'subject'];
        if (!supportedTabs.includes(activeTabId)) {
            setIsWorkLogLoading(false); return;
        }

        let cancelled = false;
        const previousEpoch = workEpoch.current, hydrated = hydratedSubjectScope.current;
        hydratedSubjectScope.current = null;
        invalidateWorkspace();
        if (activeTabId === "subject" && hydrated?.userId === userId && hydrated.scopeKey === activeSubjectScopeKey && hydrated.epoch === previousEpoch) {
            try { localStorage.setItem(`ftai:active-subject:${userId}`, activeSubjectScopeKey); } catch { /* Optional preference. */ }
            setIsWorkLogLoading(false);
            return;
        }
        const loadWorkLog = async () => {
            setIsWorkLogLoading(true);

            if (activeTabId === 'subject') {
                const { data, error } = await supabase
                    .from('work_logs')
                    .select('scope_key, scope_label, data, created_at, updated_at')
                    .eq('user_id', userId)
                    .eq('category', 'subject')
                    .order('created_at', { ascending: false });

                if (cancelled) return;
                if (error) { setLogError("작업을 불러오지 못했습니다. 기존 저장 데이터를 보호하기 위해 편집을 멈췄습니다. 다시 불러오기를 눌러주세요."); return; }
                const logs = data || [];
                let nextSubjectLogs: SubjectWorkLogSummary[] = logs.map(log => ({
                    scopeKey: log.scope_key || DEFAULT_SCOPE_KEY,
                    scopeLabel: log.scope_label || log.data?.globalConfig?.subjectName || "교과",
                    updatedAt: log.updated_at,
                    createdAt: log.created_at
                }));
                nextSubjectLogs = applySubjectOrder(nextSubjectLogs, readSubjectOrder(userId));

                let preferredScopeKey = activeSubjectScopeKey;
                if (restoredSubjectUser.current !== userId) {
                    restoredSubjectUser.current = userId;
                    preferredScopeKey = DEFAULT_SCOPE_KEY;
                    try {
                        const remembered = localStorage.getItem(`ftai:active-subject:${userId}`);
                        if (remembered && logs.some(log => log.scope_key === remembered)) preferredScopeKey = remembered;
                    } catch { /* Browser storage can be unavailable. */ }
                }
                let selectedLog = logs.find(log => (log.scope_key || DEFAULT_SCOPE_KEY) === preferredScopeKey);
                if (preferredScopeKey === DEFAULT_SCOPE_KEY && !selectedLog?.data?.globalConfig?.subjectName && !selectedLog?.data?.globalConfig?.assessments?.length) {
                    selectedLog = nextSubjectLogs.map(summary => logs.find(log => log.scope_key === summary.scopeKey)).find(log => log?.data?.globalConfig?.subjectName || log?.data?.globalConfig?.assessments?.length) || selectedLog;
                }
                if (!selectedLog && preferredScopeKey !== DEFAULT_SCOPE_KEY) {
                    nextSubjectLogs = [
                        { scopeKey: activeSubjectScopeKey, scopeLabel: "새 교과" },
                        ...nextSubjectLogs
                    ];
                }

                setSubjectLogs(nextSubjectLogs);

                const firstOrderedScopeKey = nextSubjectLogs[0]?.scopeKey;
                selectedLog = selectedLog || (
                    activeSubjectScopeKey === DEFAULT_SCOPE_KEY && firstOrderedScopeKey
                        ? logs.find(log => (log.scope_key || DEFAULT_SCOPE_KEY) === firstOrderedScopeKey)
                        : undefined
                );
                // Each subject owns its student records and count. Opening or resizing one
                // subject must never truncate students in a different saved draft.
                const nextSubjectCount = selectedLog?.data?.studentCount || studentCounts.subject || DEFAULT_STUDENT_COUNTS.subject;
                setStudentCounts(prev => ({ ...prev, subject: nextSubjectCount }));

                if (selectedLog?.data) {
                    const nextScopeKey = selectedLog.scope_key || DEFAULT_SCOPE_KEY;
                    try { localStorage.setItem(`ftai:active-subject:${userId}`, nextScopeKey); } catch { /* Optional preference. */ }
                    if (nextScopeKey !== activeSubjectScopeKey) {
                        setActiveSubjectScopeKey(nextScopeKey);
                    }
                    setStudents(resizeStudentsToCount(selectedLog.data.students, nextSubjectCount).map(student => ({ ...student, isGenerating: false })));
                    if (selectedLog.data.charLimits) {
                        setCharLimits(prev => ({ ...prev, ...selectedLog.data.charLimits }));
                    } else if (selectedLog.data.charLimit) {
                        setCharLimits(prev => ({ ...prev, subject: selectedLog.data.charLimit }));
                    }
                    setSubjectConfig(selectedLog.data.globalConfig || getDefaultSubjectConfig());
                } else {
                    setStudents(createInitialStudents(nextSubjectCount));
                    setSubjectConfig(getDefaultSubjectConfig());
                }

                setIsWorkLogLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('work_logs')
                .select('data')
                .eq('user_id', userId)
                .eq('category', activeTabId)
                .eq('scope_key', DEFAULT_SCOPE_KEY)
                .maybeSingle();

            if (cancelled) return;
                if (error) { setLogError("작업을 불러오지 못했습니다. 기존 저장 데이터를 보호하기 위해 편집을 멈췄습니다. 다시 불러오기를 눌러주세요."); return; }
            if (data?.data) {
                const nextCount = data.data.studentCount || studentCounts[activeTabId] || DEFAULT_STUDENT_COUNTS[activeTabId] || 7;
                setStudentCounts(prev => ({ ...prev, [activeTabId]: nextCount }));
                setStudents(resizeStudentsToCount(data.data.students, nextCount).map(student => ({ ...student, isGenerating: false })));
                if (data.data.charLimits) {
                    setCharLimits(prev => ({ ...prev, ...data.data.charLimits }));
                } else if (data.data.charLimit) {
                    setCharLimits(prev => ({ ...prev, [activeTabId]: data.data.charLimit }));
                }
            } else {
                const nextCount = studentCounts[activeTabId] || DEFAULT_STUDENT_COUNTS[activeTabId] || 7;
                setStudents(createInitialStudents(nextCount));
            }

            setIsWorkLogLoading(false);
        };

        void loadWorkLog();
        return () => { cancelled = true; };
    }, [userId, activeTabId, activeSubjectScopeKey, isSavedEditor]); // studentCount 제거하여 수동 변경 시 데이터 덮어쓰기 방지

    const saveWorkLog = async (silent = false, overrideStudents?: Student[], overrideConfig?: SubjectGlobalConfig) => {
        if (isSavedEditor) return persistSavedEdits(overrideStudents);
        if (!userId) return false;

        const workLogData: WorkLogData = {
            students: (overrideStudents || students).map(student => ({ ...student, isGenerating: false })),
            studentCount,
            charLimits
        };

        if (activeTabId === 'subject') {
            workLogData.globalConfig = overrideConfig || subjectConfig;
        }

        const scopeKey = activeTabId === 'subject' ? activeSubjectScopeKey : DEFAULT_SCOPE_KEY;
        const scopeLabel = activeTabId === 'subject' ? getSubjectScopeLabel(overrideConfig || subjectConfig) : null;
        const savedAt = new Date().toISOString();

        const epoch = workEpoch.current;
        const task = draftSaveQueue.current.catch(() => {}).then(() => supabase
            .from('work_logs')
            .upsert({
                user_id: userId,
                category: activeTabId,
                scope_key: scopeKey,
                scope_label: scopeLabel,
                data: workLogData,
                schema_version: 2,
                updated_at: savedAt
            }, {
                onConflict: 'user_id, category, scope_key'
            }));
        draftSaveQueue.current = task.then(() => {}, () => {});
        const { error } = await task;
        if (epoch === workEpoch.current) setDraftSaveStatus(error ? "임시 저장 실패 · 작업로그에 저장을 다시 눌러주세요" : "임시 작업 저장 완료");

        if (error) {
            // Silence common auth/session errors
            if (error.code === 'PGRST116' || error.message?.includes('JWT')) return false;
            console.error("Save Error:", error);
            if (!silent) alert("저장 중 오류가 발생했습니다.");
            return false;
        } else {
            if (activeTabId === 'subject') {
                setSubjectLogs(prev => {
                    const currentLog = prev.find(log => log.scopeKey === scopeKey);
                    const nextLog = {
                        scopeKey,
                        scopeLabel: scopeLabel || "교과",
                        updatedAt: savedAt,
                        createdAt: currentLog?.createdAt || savedAt
                    };
                    const nextLogs = currentLog
                        ? prev.map(log => log.scopeKey === scopeKey ? nextLog : log)
                        : [nextLog, ...prev];
                    writeSubjectOrder(userId, nextLogs);
                    return nextLogs;
                });
            }
            if (!silent) console.log("Auto-saved work log.");
            return true;
        }
    };

    const hasCurrentSubjectWork = () => {
        const hasSavedLog = subjectLogs.some(log => log.scopeKey === activeSubjectScopeKey);
        const hasSubjectConfig = Boolean(subjectConfig.subjectName.trim()) || subjectConfig.assessments.length > 0;
        const hasStudentSubjectData = students.some(student => (
            Boolean(student.aiResult.trim()) ||
            Boolean(student.subjectData?.individualNote?.trim()) ||
            (student.subjectData?.assessments || []).some(assessment => Boolean(assessment.level))
        ));

        return hasSavedLog || hasSubjectConfig || hasStudentSubjectData;
    };

    const runSubjectAction = async (action: (epoch: number) => Promise<void>) => {
        if (!userId || logBusy || isWorkLogLoading) return;
        setLogBusy(true); setLogError("");
        try { await action(workEpoch.current); }
        catch { setIsWorkLogLoading(false); setLogError("교과 작업을 처리하지 못했습니다. 현재 입력은 유지됩니다. 다시 시도해주세요."); }
        finally { setLogBusy(false); }
    };
    const handleSubjectScopeChange = async (scopeKey: string) => {
        if (scopeKey === activeSubjectScopeKey) return;
        await runSubjectAction(async (epoch) => {
            if (hasCurrentSubjectWork() && !await saveWorkLog(true)) { setLogError("현재 교과를 저장하지 못했습니다. 저장한 뒤 다시 이동해주세요."); return; }
            if (epoch !== workEpoch.current) return;
            setIsWorkLogLoading(true);
            setActiveSubjectScopeKey(scopeKey);
        });
    };

    const handleCreateSubjectLog = async () => runSubjectAction(async (epoch) => {
        if (!userId) return;

        const currentSaved = hasCurrentSubjectWork() ? await saveWorkLog(true) : true;
        if (!currentSaved) { setLogError("현재 교과를 저장하지 못했습니다. 저장한 뒤 새 교과를 만들어주세요."); return; }

        if (epoch !== workEpoch.current) return;
        const scopeKey = crypto.randomUUID();
        const defaultConfig = getDefaultSubjectConfig();
        const initialStudents = createInitialStudents(studentCount);
        const savedAt = new Date().toISOString();

        setIsWorkLogLoading(true);

        const { error } = await supabase
            .from('work_logs')
            .upsert({
                user_id: userId,
                category: 'subject',
                scope_key: scopeKey,
                scope_label: getSubjectScopeLabel(defaultConfig),
                data: {
                    students: initialStudents,
                    studentCount,
                    charLimits,
                    globalConfig: defaultConfig
                },
                schema_version: 2,
                updated_at: savedAt
            }, {
                onConflict: 'user_id, category, scope_key'
            });

        if (epoch !== workEpoch.current) return;
        if (error) {
            console.error("Create Subject Error:", error);
            alert("새 교과 저장본을 만들지 못했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        hydratedSubjectScope.current = { userId, scopeKey, epoch: workEpoch.current };
        setActiveSubjectScopeKey(scopeKey);
        setSubjectConfig(defaultConfig);
        setStudents(initialStudents);
        setSubjectLogs(prev => {
            const nextLogs = [{ scopeKey, scopeLabel: "새 교과", updatedAt: savedAt, createdAt: savedAt }, ...prev];
            writeSubjectOrder(userId, nextLogs);
            return nextLogs;
        });
        setIsWorkLogLoading(false);
    });

    const handleDeleteSubjectLog = async (scopeKey: string) => runSubjectAction(async (epoch) => {
        if (!userId) return;
        const target = subjectLogs.find(log => log.scopeKey === scopeKey);
        const label = target?.scopeLabel || "교과";
        if (!confirm(`${label} 교과의 임시 작업을 삭제할까요? 작업로그에 저장한 기록은 유지됩니다.`)) return;

        setIsWorkLogLoading(true);
        await draftSaveQueue.current;
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('user_id', userId)
            .eq('category', 'subject')
            .eq('scope_key', scopeKey);

        if (epoch !== workEpoch.current) return;
        if (error) {
            console.error("Delete Error:", error);
            alert("삭제 중 오류가 발생했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        const remainingLogs = subjectLogs.filter(log => log.scopeKey !== scopeKey);
        setSubjectLogs(remainingLogs);
        writeSubjectOrder(userId, remainingLogs);

        if (scopeKey === activeSubjectScopeKey) {
            const nextLog = remainingLogs[0];
            if (nextLog) {
                setActiveSubjectScopeKey(nextLog.scopeKey);
                return; // The loader unlocks the new subject after its data arrives.
            } else {
                hydratedSubjectScope.current = activeSubjectScopeKey !== DEFAULT_SCOPE_KEY ? { userId, scopeKey: DEFAULT_SCOPE_KEY, epoch: workEpoch.current } : null;
                setActiveSubjectScopeKey(DEFAULT_SCOPE_KEY);
                setSubjectConfig(getDefaultSubjectConfig());
                setStudents(createInitialStudents(studentCount));
            }
        }

        setIsWorkLogLoading(false);
    });

    const handleDeleteAllSubjectLogs = async () => runSubjectAction(async (epoch) => {
        if (!userId) return;
        if (!subjectLogs.length && !hasCurrentSubjectWork()) return;
        if (!confirm("모든 교과의 임시 작업을 삭제할까요? 작업로그에 저장한 기록은 유지됩니다.")) return;

        setIsWorkLogLoading(true);
        await draftSaveQueue.current;
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('user_id', userId)
            .eq('category', 'subject');

        if (epoch !== workEpoch.current) return;
        if (error) {
            console.error("Delete All Subjects Error:", error);
            alert("전체삭제 중 오류가 발생했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        setSubjectLogs([]);
        writeSubjectOrder(userId, []);
        hydratedSubjectScope.current = activeSubjectScopeKey !== DEFAULT_SCOPE_KEY ? { userId, scopeKey: DEFAULT_SCOPE_KEY, epoch: workEpoch.current } : null;
        setActiveSubjectScopeKey(DEFAULT_SCOPE_KEY);
        setSubjectConfig(getDefaultSubjectConfig());
        setStudents(createInitialStudents(studentCount));
        setIsWorkLogLoading(false);
    });

    const handleReorderSubjectLogs = (fromScopeKey: string, toScopeKey: string) => {
        if (!userId || fromScopeKey === toScopeKey) return;

        setSubjectLogs(prev => {
            const fromIndex = prev.findIndex(log => log.scopeKey === fromScopeKey);
            const toIndex = prev.findIndex(log => log.scopeKey === toScopeKey);
            if (fromIndex === -1 || toIndex === -1) return prev;

            const nextLogs = [...prev];
            const [movedLog] = nextLogs.splice(fromIndex, 1);
            nextLogs.splice(toIndex, 0, movedLog);
            writeSubjectOrder(userId, nextLogs);
            return nextLogs;
        });
    };

    // Auto-save logic (Debounced)
    useEffect(() => {
        if (!userId || !students.length || isWorkLogLoading || isSavedEditor || logBusy) return;

        setDraftSaveStatus("임시 작업 저장 중…");
        const timer = setTimeout(() => {
            void saveWorkLog(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, [students, studentCount, charLimits, userId, activeTabId, activeSubjectScopeKey, subjectConfig, isWorkLogLoading, isSavedEditor, logBusy]);

    // 학생 수 변경 시 처리
    useEffect(() => {
        setStudents(prev => {
            return resizeStudentsToCount(prev, studentCount);
        });
    }, [studentCount]);



    const activeTab = features.find(f => f.id === activeTabId) || features[0];

    // AI 생성
    const handleGenerate = async (id: number) => {
        setLogError("");
        const epoch = workEpoch.current;
        const updateStudents: typeof setStudents = action => { if (epoch === workEpoch.current) setStudents(action); };

        const student = students.find(s => s.id === id);
        if (!student) return;
        if (activeTabId === "subject" && !student.subjectData?.assessments.some(a => a.level && subjectConfig.assessments.some(g => g.id === a.assessmentId))) {
            setLogError("학생의 평가 수준을 하나 이상 선택해주세요."); return;
        }

        updateStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));

        try {
            let tokens: string[] = [];
            let currentSubjectConfig = subjectConfig;

            if (activeTabId === 'behavior') {
                if (student.selectedKeywords.length < 2) {
                    updateStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
                    return;
                }
                tokens = student.selectedKeywords;
            } else if (activeTabId === 'creative') {
                if (!student.participatedEvents || student.participatedEvents.length === 0) {
                    updateStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
                    return;
                }
                tokens = student.participatedEvents;
            } else if (activeTabId === 'subject') {
                // 1단계: 성취기준이 비어있는지 확인 및 자동 채우기
                const missingAssessments = subjectConfig.assessments.filter(a => {
                    const studentLevel = student.subjectData?.assessments?.find(sa => sa.assessmentId === a.id)?.level;
                    // studentLevel이 존재하고(상,중,하) 성취기준이 비어있는 경우
                    return studentLevel && !a.standard;
                });

                if (missingAssessments.length > 0) {
                    // 모든 누락된 성취기준을 병렬로 요청
                    const standardPromises = missingAssessments.map(async (ass) => {
                        try {
                            const sResp = await requestWorkspaceAI("/api/generate/standard", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    schoolLevel: subjectConfig.schoolLevel,
                                    grade: subjectConfig.grade,
                                    subjectName: subjectConfig.subjectName,
                                    area: ass.area,
                                    criteria: ass.criteria,
                                    competency: ass.competency
                                })
                            });
                            const sData = await sResp.json();
                            return { id: ass.id, standard: sData.standard };
                        } catch (e) {
                            console.error(e);
                            return { id: ass.id, standard: null };
                        }
                    });

                    const results = await Promise.all(standardPromises);
                if (epoch !== workEpoch.current) return;

                    let updatedAssessments = [...subjectConfig.assessments];
                    results.forEach(res => {
                        if (res.standard) {
                            updatedAssessments = updatedAssessments.map(a => a.id === res.id ? { ...a, standard: res.standard } : a);
                        }
                    });

                    currentSubjectConfig = { ...subjectConfig, assessments: updatedAssessments };
                    if (epoch === workEpoch.current) setSubjectConfig(currentSubjectConfig);
                }
            }

            // 2단계: 본문 생성
            const response = await requestWorkspaceAI("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keywords: tokens,
                    term: student.officerPeriod || "",
                    role: student.officerRole || "임원아님",
                    targetChars: charLimits[activeTabId],
                    category: activeTabId,
                    subjectMeta: activeTabId === 'subject' ? {
                        ...currentSubjectConfig,
                        individualNote: student.subjectData?.individualNote || "",
                        studentAssessments: student.subjectData?.assessments || []
                    } : undefined
                })
            });

            const data = await response.json();
                if (epoch !== workEpoch.current) return;
            if (data.result) {
                updateStudents(prev => prev.map(s => s.id === id ? {
                    ...s,
                    isGenerating: false,
                    aiResult: data.result,
                    isEditable: true
                } : s));
            } else {
                throw new Error(data.error || "작성 결과를 받지 못했습니다. 다시 생성해주세요.");
            }
        } catch (error) {
            if (epoch !== workEpoch.current || (error instanceof Error && error.name === "AbortError")) return;
            console.error(error);
            updateStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
            setLogError(`${id}번 학생 생성에 실패했습니다. 기존 문장은 유지됩니다. ${error instanceof Error ? error.message : "다시 시도해주세요."}`);
        }
    };

    const handleAllGenerate = async () => {
        setLogError("");
        const epoch = workEpoch.current;
        const updateStudents: typeof setStudents = action => { if (epoch === workEpoch.current) setStudents(action); };

        const targetStudents = students.filter(s => {
            if (activeTabId === 'behavior') return s.selectedKeywords.length >= 2;
            if (activeTabId === 'creative') return (s.participatedEvents?.length || 0) > 0;
            if (activeTabId === 'subject') return Boolean(s.subjectData?.assessments?.some(a => a.level && subjectConfig.assessments.some(g => g.id === a.assessmentId)));
            return false;
        });

        if (targetStudents.length === 0) {
            let msg = "조건을 만족하는 학생이 없습니다.";
            if (activeTabId === 'behavior') msg = "키워드가 2개 이상 선택된 학생이 없습니다.";
            if (activeTabId === 'creative') msg = "참여 행사가 선택된 학생이 없습니다.";
            if (activeTabId === 'subject') msg = "평가 점수가 입력된 학생이 없습니다.";
            alert(msg);
            return;
        }

        updateStudents(prev => prev.map(s =>
            targetStudents.find(ss => ss.id === s.id) ? { ...s, isGenerating: true } : s
        ));

        // 성취기준 전처리 (교과 세특인 경우)
        let currentSubjectConfig = subjectConfig;
        if (activeTabId === 'subject') {
            const missingAssessments = subjectConfig.assessments.filter(a => {
                return targetStudents.some(s => {
                    const level = s.subjectData?.assessments?.find(sa => sa.assessmentId === a.id)?.level;
                    return level && !a.standard;
                });
            });

            if (missingAssessments.length > 0) {
                const standardPromises = missingAssessments.map(async (ass) => {
                    try {
                        const sResp = await requestWorkspaceAI("/api/generate/standard", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                schoolLevel: subjectConfig.schoolLevel,
                                grade: subjectConfig.grade,
                                subjectName: subjectConfig.subjectName,
                                area: ass.area, criteria: ass.criteria, competency: ass.competency
                            })
                        });
                        const sData = await sResp.json();
                        return { id: ass.id, standard: sData.standard };
                    } catch (e) {
                        console.error(e);
                        return { id: ass.id, standard: null };
                    }
                });

                const results = await Promise.all(standardPromises);
                if (epoch !== workEpoch.current) return;

                let updatedAssessments = [...subjectConfig.assessments];
                results.forEach(res => {
                    if (res.standard) {
                        updatedAssessments = updatedAssessments.map(a => a.id === res.id ? { ...a, standard: res.standard } : a);
                    }
                });

                currentSubjectConfig = { ...subjectConfig, assessments: updatedAssessments };
                if (epoch === workEpoch.current) setSubjectConfig(currentSubjectConfig);
            }
        }

        // 병렬 처리 실행
        let firstError: string | null = null;
        const results = await Promise.all(targetStudents.map(async (student) => {
            try {
                let tokens: string[] = [];
                if (activeTabId === 'behavior') tokens = student.selectedKeywords;
                else if (activeTabId === 'creative') tokens = student.participatedEvents || [];

                const response = await requestWorkspaceAI("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        keywords: tokens,
                        term: student.officerPeriod || "",
                        role: student.officerRole || "임원아님",
                        targetChars: charLimits[activeTabId],
                        category: activeTabId,
                        subjectMeta: activeTabId === 'subject' ? {
                            ...currentSubjectConfig,
                            individualNote: student.subjectData?.individualNote || "",
                            studentAssessments: student.subjectData?.assessments || []
                        } : undefined
                    })
                });
                const data = await response.json();
                if (epoch !== workEpoch.current) return;

                if (!response.ok) {
                    if (!firstError) firstError = data.error || `생성 실패 (HTTP ${response.status})`;
                    updateStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGenerating: false } : s));
                    return false;
                }

                // 결과 도착 시 즉시 상태 업데이트 (개별 업데이트)
                updateStudents(prev => prev.map(s => s.id === student.id ? {
                    ...s,
                    isGenerating: false,
                    aiResult: data.result || s.aiResult,
                    isEditable: !!data.result
                } : s));
                return true;
            } catch (error: unknown) {
                console.error(`Error generating for student ${student.id}:`, error);
                if (!firstError) firstError = error instanceof Error ? error.message : "네트워크 오류가 발생했습니다.";
                updateStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGenerating: false } : s));
                return false;
            }
        }));

        if (epoch === workEpoch.current && firstError) {
            setLogError(`${results.filter(ok => !ok).length}명 생성에 실패했습니다. 기존 문장은 유지됩니다. ${firstError}`);
        }
    };

    const handleSelectedGenerate = async () => {
        setLogError("");
        const epoch = workEpoch.current;
        const updateStudents: typeof setStudents = action => { if (epoch === workEpoch.current) setStudents(action); };

        const selectedStudents = students.filter(s => {
            if (!s.selected) return false;
            if (activeTabId === 'behavior') return s.selectedKeywords.length >= 2;
            if (activeTabId === 'creative') return (s.participatedEvents?.length || 0) > 0;
            if (activeTabId === 'subject') return Boolean(s.subjectData?.assessments?.some(a => a.level && subjectConfig.assessments.some(g => g.id === a.assessmentId)));
            return false;
        });

        if (selectedStudents.length === 0) {
            alert("조건(키워드/행사)을 만족하는 선택된 학생이 없습니다.");
            return;
        }

        updateStudents(prev => prev.map(s =>
            selectedStudents.find(ss => ss.id === s.id) ? { ...s, isGenerating: true } : s
        ));

        // 성취기준 전처리
        let currentSubjectConfig = subjectConfig;
        if (activeTabId === 'subject') {
            const missingAssessments = subjectConfig.assessments.filter(a => {
                return selectedStudents.some(s => {
                    const level = s.subjectData?.assessments?.find(sa => sa.assessmentId === a.id)?.level;
                    return level && !a.standard;
                });
            });

            if (missingAssessments.length > 0) {
                const standardPromises = missingAssessments.map(async (ass) => {
                    try {
                        const sResp = await requestWorkspaceAI("/api/generate/standard", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                schoolLevel: subjectConfig.schoolLevel,
                                grade: subjectConfig.grade,
                                subjectName: subjectConfig.subjectName,
                                area: ass.area, criteria: ass.criteria, competency: ass.competency
                            })
                        });
                        const sData = await sResp.json();
                        return { id: ass.id, standard: sData.standard };
                    } catch (e) {
                        console.error(e);
                        return { id: ass.id, standard: null };
                    }
                });

                const results = await Promise.all(standardPromises);
                if (epoch !== workEpoch.current) return;

                let updatedAssessments = [...subjectConfig.assessments];
                results.forEach(res => {
                    if (res.standard) {
                        updatedAssessments = updatedAssessments.map(a => a.id === res.id ? { ...a, standard: res.standard } : a);
                    }
                });

                currentSubjectConfig = { ...subjectConfig, assessments: updatedAssessments };
                if (epoch === workEpoch.current) setSubjectConfig(currentSubjectConfig);
            }
        }

        // 병렬 처리 실행
        selectedStudents.forEach(async (student) => {
            try {
                let tokens: string[] = [];
                if (activeTabId === 'behavior') tokens = student.selectedKeywords;
                else if (activeTabId === 'creative') tokens = student.participatedEvents || [];

                const response = await requestWorkspaceAI("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        keywords: tokens,
                        term: student.officerPeriod || "",
                        role: student.officerRole || "임원아님",
                        targetChars: charLimits[activeTabId],
                        category: activeTabId,
                        subjectMeta: activeTabId === 'subject' ? {
                            ...currentSubjectConfig,
                            individualNote: student.subjectData?.individualNote || "",
                            studentAssessments: student.subjectData?.assessments || []
                        } : undefined
                    })
                });
                const data = await response.json();
                if (epoch !== workEpoch.current) return;

                // 결과 도착 시 즉시 상태 업데이트 (개별 업데이트)
                updateStudents(prev => prev.map(s => s.id === student.id ? {
                    ...s,
                    isGenerating: false,
                    aiResult: data.result || s.aiResult,
                    isEditable: !!data.result
                } : s));
            } catch (error) {
            if (epoch !== workEpoch.current || (error instanceof Error && error.name === "AbortError")) return;
                console.error(`Error generating for student ${student.id}:`, error);
                setLogError(`${student.id}번 학생 생성에 실패했습니다. 기존 문장은 유지됩니다.`);
                updateStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGenerating: false } : s));
            }
        });
    };

    const handleReset = async (id: number) => {
        const nextStudents = students.map(s => s.id === id ? {
            ...s,
            selectedKeywords: [],
            customKeywords: [],
            participatedEvents: [],
            officerRole: "임원아님",
            officerPeriod: "",
            subjectData: { assessments: [], individualNote: "" },
            aiResult: "",
            isEditable: false,
            isGenerating: false
        } : s);
        setStudents(nextStudents);
        if (!isSavedEditor) await saveWorkLog(true, nextStudents);
    };

    const handleResetAll = async () => {
        if (!confirm(isSavedEditor ? "수정 중인 입력값을 비우시겠습니까? 저장 버튼을 누르기 전에는 저장본이 유지됩니다." : "현재 입력값을 비우시겠습니까? 작업로그의 저장본은 유지됩니다.")) return;
        invalidateWorkspace();
        const nextStudents = students.map(s => ({
            ...s,
            selected: false,
            selectedKeywords: [],
            customKeywords: [],
            participatedEvents: [],
            officerRole: "임원아님",
            officerPeriod: "",
            subjectData: { assessments: [], individualNote: "" },
            aiResult: "",
            isEditable: false,
            isGenerating: false
        }));
        setStudents(nextStudents);
        if (!isSavedEditor) await saveWorkLog(false, nextStudents);
        alert(isSavedEditor ? "입력을 비웠습니다. 수정 내용 저장을 누르면 반영됩니다." : "입력을 비웠습니다. 저장된 작업로그는 유지됩니다.");
    };

    const handleResetBehaviorKeywords = async () => {
        if (!confirm("모든 학생의 키워드를 초기화하시겠습니까? AI 결과는 유지됩니다.")) return;
        const nextStudents = students.map(s => ({
            ...s,
            selectedKeywords: [],
            customKeywords: []
        }));
        setStudents(nextStudents);
        if (!isSavedEditor) await saveWorkLog(false, nextStudents);
        alert(isSavedEditor ? "키워드를 비웠습니다. 수정 내용 저장을 누르면 반영됩니다." : "키워드 초기화 및 임시 저장이 완료되었습니다.");
    };

    const handleDeleteUnusedBehaviorKeywords = async () => {
        const nextStudents = students.map(s => ({
            ...s,
            customKeywords: s.customKeywords.filter(k => s.selectedKeywords.includes(k))
        }));
        setStudents(nextStudents);
        if (!isSavedEditor) await saveWorkLog(false, nextStudents);
        alert(isSavedEditor ? "미선택 키워드를 지웠습니다. 수정 내용 저장을 누르면 반영됩니다." : "미선택 키워드를 지웠습니다.");
    };

    const handleResetSelection = () => {
        setStudents(prev => prev.map(s => ({ ...s, selected: false })));
    };

    const toggleStudentSelection = (id: number) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
    };

    const toggleAllSelection = () => {
        const allSelected = students.length > 0 && students.every(s => s.selected);
        setStudents(prev => prev.map(s => ({ ...s, selected: !allSelected })));
    };

    const handleAutoGenerateKeywords = () => {
        if (!students.some(s => s.selected)) {
            alert("선택된 학생이 없습니다.");
            return;
        }
        setStudents(prev => prev.map(student => {
            if (!student.selected) return student;
            // 섞어서 2개 추출
            const shuffled = [...studentKeywordPool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 2);

            return {
                ...student,
                customKeywords: Array.from(new Set([...student.customKeywords, ...selected])),
                selectedKeywords: Array.from(new Set([...student.selectedKeywords, ...selected]))
            };
        }));
    };

    const addCustomKeyword = (studentId: number) => {
        if (!newKeywordInput.trim()) return;
        setStudents(prev => prev.map(s => s.id === studentId ? {
            ...s,
            customKeywords: [...s.customKeywords, newKeywordInput.trim()],
            selectedKeywords: [...s.selectedKeywords, newKeywordInput.trim()]
        } : s));
        setNewKeywordInput("");
        setIsAddingKeyword(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file || !["behavior", "subject", "creative"].includes(activeTabId)) return;
        if (isWorkLogLoading || logBusy || isSubjectPlanImporting) { setLogError("작업을 불러오는 중입니다. 완료 후 파일을 다시 선택해주세요."); return; }
        const epoch = workEpoch.current;
        setLogError(""); setLogBusy(true);
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error("CSV는 5MB 이하 파일을 선택해주세요.");
            const imported = importWorkspaceCsv(await file.text(), activeTabId as "behavior" | "subject" | "creative", students, subjectConfig, defaultKeywords);
            if (epoch !== workEpoch.current) return;
            if (!confirm(`${imported.importedCount}명의 데이터를 가져옵니다. 같은 번호 학생의 CSV에 있는 항목을 갱신하고, 파일에 없는 학생과 기존 평가기준은 유지합니다. 적용할까요?`)) return;
            setStudents(imported.students); setStudentCount(imported.students.length);
            if (activeTabId === "subject") setSubjectConfig(imported.globalConfig);
            setLogMessage(`${imported.importedCount}명의 CSV 입력을 적용했습니다.`);
        } catch (error) { if (epoch === workEpoch.current) setLogError(error instanceof Error ? error.message : "CSV를 읽지 못했습니다."); }
        finally { setLogBusy(false); }
    };

    const handleSubjectPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (isWorkLogLoading || logBusy || isSubjectPlanImporting) { setLogError("진행 중인 작업이 끝난 뒤 파일을 다시 선택해주세요."); return; }

        const epoch = workEpoch.current, signal = aiAbort.current.signal;
        setIsSubjectPlanImporting(true);
        setLogError("");
        setSubjectPlanImport(null);
        setSelectedSubjectPlanIndexes([]);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("schoolLevel", subjectConfig.schoolLevel);
            formData.append("grade", subjectConfig.grade);
            formData.append("subjectName", subjectConfig.subjectName);

            const { data: { session } } = await supabase.auth.getSession();
            if (requestedLogId) formData.append("workLogId", requestedLogId);
            if (epoch !== workEpoch.current) return;
            const response = await fetch("/api/subject-plan/parse", {
                method: "POST", body: formData, signal,
                headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
            });
            const data = await response.json();
            if (epoch !== workEpoch.current || signal.aborted) return;

            if (!response.ok) {
                throw new Error(data.error || "평가계획을 읽을 수 없습니다.");
            }

            const subjects = (data.subjects || []) as ParsedSubjectPlanSubject[];
            if (!subjects.length) {
                throw new Error("평가 영역, 성취기준, 평가기준을 찾지 못했습니다.");
            }

            setSubjectPlanImport({
                subjects,
                warnings: Array.isArray(data.warnings) ? data.warnings : [],
            });
            setSelectedSubjectPlanIndexes(isSavedEditor ? [0] : subjects.map((_, index) => index));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "평가계획을 읽을 수 없습니다.";
            if (epoch === workEpoch.current && !signal.aborted) setLogError(message);
        } finally {
            if (epoch === workEpoch.current) setIsSubjectPlanImporting(false);
        }
    };

    const toggleSubjectPlanSelection = (index: number) => {
        if (isSavedEditor) { setSelectedSubjectPlanIndexes([index]); return; }
        setSelectedSubjectPlanIndexes(prev => (
            prev.includes(index)
                ? prev.filter(item => item !== index)
                : [...prev, index].sort((a, b) => a - b)
        ));
    };

    const updateSubjectPlanSubject = (
        subjectIndex: number,
        field: keyof Pick<ParsedSubjectPlanSubject, "subjectName" | "grade">,
        value: string
    ) => {
        setSubjectPlanImport(prev => {
            if (!prev) return prev;

            return {
                ...prev,
                subjects: prev.subjects.map((subject, index) => (
                    index === subjectIndex ? { ...subject, [field]: value } : subject
                )),
            };
        });
    };

    const updateSubjectPlanAssessment = (
        subjectIndex: number,
        assessmentIndex: number,
        field: "area" | "standard" | "criteria",
        value: string
    ) => {
        setSubjectPlanImport(prev => {
            if (!prev) return prev;

            return {
                ...prev,
                subjects: prev.subjects.map((subject, index) => {
                    if (index !== subjectIndex) return subject;

                    return {
                        ...subject,
                        assessments: subject.assessments.map((assessment, itemIndex) => (
                            itemIndex === assessmentIndex
                                ? { ...assessment, [field]: value }
                                : assessment
                        )),
                    };
                }),
            };
        });
    };

    const updateSubjectPlanCriteriaLevel = (
        subjectIndex: number,
        assessmentIndex: number,
        level: AchievementLevel,
        value: string
    ) => {
        setSubjectPlanImport(prev => {
            if (!prev) return prev;

            return {
                ...prev,
                subjects: prev.subjects.map((subject, index) => {
                    if (index !== subjectIndex) return subject;

                    return {
                        ...subject,
                        assessments: subject.assessments.map((assessment, itemIndex) => {
                            if (itemIndex !== assessmentIndex) return assessment;

                            const nextLevels = {
                                ...getCriteriaLevels(assessment),
                                [level]: value,
                            };

                            return {
                                ...assessment,
                                criteriaLevels: nextLevels,
                                criteria: formatCriteriaFromLevels(nextLevels) || assessment.criteria,
                            };
                        }),
                    };
                }),
            };
        });
    };

    const applySubjectPlanImport = async () => {
        if (!userId || !subjectPlanImport) return;
        if (!selectedSubjectPlanIndexes.length) {
            alert("적용할 교과를 선택해주세요.");
            return;
        }

        if (isSavedEditor) {
            if (selectedSubjectPlanIndexes.length !== 1) { setLogError("수정 중인 저장본에 적용할 교과를 하나만 선택해주세요."); return; }
            const subject = subjectPlanImport.subjects[selectedSubjectPlanIndexes[0]];
            if (!confirm("현재 저장본의 교과·평가기준을 교체하고 학생별 상·중·하 입력을 비웁니다. 작성 문장과 개별 메모는 유지됩니다. 적용할까요?")) return;
            setSubjectConfig({ schoolLevel: subject.schoolLevel || subjectConfig.schoolLevel, grade: subject.grade || subjectConfig.grade, subjectName: subject.subjectName, assessments: subject.assessments.map(a => ({ ...a, id: crypto.randomUUID(), criteriaLevels: getCriteriaLevels(a) })) });
            setStudents(prev => prev.map(student => ({ ...student, subjectData: { ...student.subjectData, assessments: [], individualNote: student.subjectData?.individualNote || "" } })));
            setSubjectPlanImport(null); setSelectedSubjectPlanIndexes([]);
            setLogMessage("평가계획을 적용했습니다. 학생별 평가를 입력한 뒤 수정 내용 저장을 눌러주세요.");
            return;
        }
        const currentSaved = hasCurrentSubjectWork() ? await saveWorkLog(true) : true;
        if (!currentSaved) { setLogError("현재 교과를 저장하지 못했습니다. 입력을 유지했습니다. 저장을 다시 시도한 뒤 가져오기를 적용해주세요."); return; }

        const savedAt = new Date().toISOString();
        const selectedSubjects = selectedSubjectPlanIndexes
            .map(index => subjectPlanImport.subjects[index])
            .filter(Boolean);

        const importedLogs = selectedSubjects.map((subject) => {
            const scopeKey = crypto.randomUUID();
            const globalConfig: SubjectGlobalConfig = {
                schoolLevel: subject.schoolLevel || subjectConfig.schoolLevel || "elementary",
                grade: subject.grade || subjectConfig.grade || "1",
                subjectName: subject.subjectName || "가져온 교과",
                assessments: subject.assessments.map((assessment) => ({
                    id: crypto.randomUUID(),
                    area: assessment.area,
                    standard: assessment.standard,
                    criteria: formatCriteriaFromLevels(getCriteriaLevels(assessment)) || assessment.criteria,
                    criteriaLevels: getCriteriaLevels(assessment),
                    competency: assessment.competency,
                })),
            };
            const nextStudents = createInitialStudents(studentCount);
            const scopeLabel = getSubjectScopeLabel(globalConfig);

            return {
                scopeKey,
                scopeLabel,
                globalConfig,
                students: nextStudents,
                row: {
                    user_id: userId,
                    category: "subject",
                    scope_key: scopeKey,
                    scope_label: scopeLabel,
                    data: {
                        students: nextStudents,
                        studentCount,
                        charLimits,
                        globalConfig,
                    },
                    schema_version: 2,
                    updated_at: savedAt,
                },
            };
        });

        setIsWorkLogLoading(true);
        const { error } = await supabase
            .from("work_logs")
            .upsert(importedLogs.map(log => log.row), {
                onConflict: "user_id, category, scope_key",
            });

        if (error) {
            console.error("Subject Plan Import Save Error:", error);
            alert("평가계획을 적용하지 못했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        const firstLog = importedLogs[0];
        setSubjectLogs(prev => {
            const nextLogs = [
                ...importedLogs.map(log => ({
                    scopeKey: log.scopeKey,
                    scopeLabel: log.scopeLabel,
                    updatedAt: savedAt,
                    createdAt: savedAt,
                })),
                ...prev,
            ];
            writeSubjectOrder(userId, nextLogs);
            return nextLogs;
        });
        hydratedSubjectScope.current = { userId, scopeKey: firstLog.scopeKey, epoch: workEpoch.current };
        setActiveSubjectScopeKey(firstLog.scopeKey);
        setSubjectConfig(firstLog.globalConfig);
        setStudents(firstLog.students);
        setSubjectPlanImport(null);
        setSelectedSubjectPlanIndexes([]);
        setIsWorkLogLoading(false);
    };

    const leaveEditor = (url: string) => {
        if (editorDirty && !confirm("저장하지 않은 수정 내용이 있습니다. 나가시겠습니까?")) return false;
        invalidateWorkspace(); setStudents([]); setIsWorkLogLoading(true); router.push(url); return true;
    };
    const changeCategory = async (id: string) => {
        if (logBusy || isWorkLogLoading || isSubjectPlanImporting || id === activeTabId) return;
        if (isSavedEditor) { if (leaveEditor(`/app?category=${id}`)) setActiveTabId(id); }
        else {
            setLogBusy(true);
            try {
                if (["behavior", "creative", "subject"].includes(activeTabId) && !await saveWorkLog(true)) { setLogError("현재 입력을 저장하지 못했습니다. 다시 저장한 뒤 영역을 이동해주세요."); return; }
                setLogError(""); setLogMessage(""); invalidateWorkspace(); setActiveTabId(id); router.replace(`/app?category=${id}`, { scroll: false });
            } finally { setLogBusy(false); }
        }
    };
    const clearCurrentDraft = async () => {
        invalidateWorkspace(); lastSnapshot.current = null;
        const empty = createInitialStudents(studentCount), config = getDefaultSubjectConfig();
        setStudents(empty); if (activeTabId === "subject") setSubjectConfig(config);
        setSubjectPlanImport(null); setSelectedSubjectPlanIndexes([]); setIsAddingKeyword(null); setNewKeywordInput("");
        setLogTitle(defaultWorkTitle(activeTabId as "behavior" | "subject" | "creative" | "docs"));
        const saved = await saveWorkLog(true, empty, config);
        if (!saved) setLogError("저장본은 보존됐지만 새 작업의 임시 저장에 실패했습니다. 화면을 유지하고 다시 저장해주세요.");
    };
    const saveSnapshot = async (startNew: boolean) => {
        if (logBusy || students.some(s => s.isGenerating) || isWorkLogLoading) return;
        if (isSavedEditor) { await persistSavedEdits(); return; }
        const payload = { category: activeTabId, title: logTitle, data: currentData, source_scope_key: activeTabId === "subject" ? activeSubjectScopeKey : DEFAULT_SCOPE_KEY };
        const fingerprint = stableWorkJson(payload), epoch = workEpoch.current;
        if (lastSnapshot.current?.fingerprint === fingerprint) {
            if (startNew) { setLogBusy(true); try { await clearCurrentDraft(); setLogMessage("이미 저장된 기록을 유지하고 새 작업을 시작했습니다."); } finally { setLogBusy(false); } }
            else setLogMessage("같은 내용이 이미 작업로그에 저장되어 있습니다.");
            return;
        }
        if (snapshotAttempt.current?.fingerprint !== fingerprint) snapshotAttempt.current = { fingerprint, id: crypto.randomUUID() };
        setLogBusy(true); setLogError(""); setLogMessage("");
        try {
            await workLogRequest<SavedWorkLog>("/api/work-logs", { method: "POST", body: JSON.stringify({ ...payload, id: snapshotAttempt.current.id }) });
            lastSnapshot.current = { fingerprint, id: snapshotAttempt.current.id };
            snapshotAttempt.current = null;
            if (epoch !== workEpoch.current) return;
            if (startNew) await clearCurrentDraft();
            setLogMessage(startNew ? "작업로그에 저장하고 새 작업을 시작했습니다." : "작업로그에 독립된 저장본을 만들었습니다. 입력을 비워도 이 저장본은 유지됩니다.");
        } catch (e) { setLogError(e instanceof Error ? e.message : "저장하지 못했습니다. 입력은 유지됩니다."); }
        finally { setLogBusy(false); }
    };
    const changeStudentCount = (count: number) => {
        if (count < studentCount && students.slice(count).some(student => student.aiResult || student.selectedKeywords.length || student.participatedEvents?.length || student.officerPeriod || (student.officerRole && student.officerRole !== "임원아님") || student.subjectData?.individualNote || student.subjectData?.assessments.some(a => a.level))) {
            if (!confirm(`${count + 1}번 이후 학생의 현재 입력이 삭제됩니다. 작업로그에 저장한 기록은 유지됩니다. 학생 수를 줄일까요?`)) return;
        }
        setStudentCount(count);
    };
    const cancelSubjectPlanImport = () => {
        invalidateWorkspace(); setIsSubjectPlanImporting(false); setSubjectPlanImport(null); setSelectedSubjectPlanIndexes([]);
        setLogMessage("평가계획 분석을 취소했습니다. 기존 입력은 유지됩니다.");
    };
    const startEmptyDraft = async () => {
        if (!confirm("현재 입력을 비우고 새 작업을 시작하시겠습니까? 작업로그에 저장된 기록은 바뀌지 않습니다.")) return;
        setLogBusy(true); setLogError(""); setLogMessage("");
        try { await clearCurrentDraft(); } finally { setLogBusy(false); }
    };

    const polishAction = ["behavior", "subject", "creative"].includes(activeTabId) ? (
        <ClassPolishControl
            key={`${userId}:${requestedLogId || "draft"}:${workspaceVersion}:${activeTabId}:${activeTabId === "subject" ? activeSubjectScopeKey : "default"}`}
            students={students}
            setStudents={setStudents}
            category={activeTabId as PolishCategory}
            disabled={isWorkLogLoading || isSubjectPlanImporting || logBusy || (isSavedEditor && loadedSavedId !== requestedLogId)}
            workLogId={requestedLogId || undefined}
            onPersist={nextStudents => saveWorkLog(true, nextStudents)}
        />
    ) : null;

    // --- UI Rendering ---
    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">

            <main className="pt-24 pb-12">
                <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
                    <nav aria-label="작성 영역" className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
                        {features.filter(feature => feature.id !== "docs").map(feature => <button key={feature.id}
                            onClick={() => changeCategory(feature.id)} aria-current={activeTabId === feature.id ? "page" : undefined}
                            disabled={logBusy || isWorkLogLoading || isSubjectPlanImporting}
                            className={cn("flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:opacity-50", activeTabId === feature.id ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300")}>
                            <feature.icon className="size-4 shrink-0" />{feature.title}
                        </button>)}
                        <a href="/app/logs" className="ml-auto flex items-center px-3 text-sm font-semibold text-slate-600 underline underline-offset-4 dark:text-slate-300">작업로그 열기</a>
                    </nav>
                    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div><h1 className="text-2xl font-black tracking-tight">{activeTab.title}</h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activeTabId === "subject" ? "평가계획을 가져오거나 직접 기준을 입력한 뒤, 학생별 상·중·하를 선택하세요." : activeTabId === "creative" ? "각 학생의 활동 선택에서 참여 활동을 고르세요. 임원 직책과 기간도 함께 기록할 수 있습니다." : "관찰 키워드를 2개 이상 선택하고 학생별 문장을 작성하세요."}</p></div>
                        <a href="/extension/bridge" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">나이스 확장 연결</a>
                    </header>
                    <WorkLogSessionBar saving={logBusy} editing={isSavedEditor} title={logTitle} onTitle={setLogTitle}
                        busy={logBusy || isWorkLogLoading || isSubjectPlanImporting || students.some(s => s.isGenerating) || (isSavedEditor && loadedSavedId !== requestedLogId)} dirty={editorDirty}
                        message={logMessage} error={logError} draftStatus={isSavedEditor ? undefined : draftSaveStatus} onSave={() => void saveSnapshot(false)} onSaveNew={() => void saveSnapshot(true)}
                        onReset={() => void startEmptyDraft()} onBack={() => leaveEditor("/app/logs")} />
                    {isWorkLogLoading && logError && <Button variant="outline" onClick={() => window.location.reload()} className="mb-4">다시 불러오기</Button>}
                    {staleEdit && <button className="mb-4 text-sm text-blue-700 underline" onClick={() => { const url = URL.createObjectURL(new Blob([workLogCsv({ category: activeTabId as "behavior", data: staleEdit.data })], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `${staleEdit.title}-임시수정.csv`; a.click(); URL.revokeObjectURL(url); }}>이전 임시 수정 내보내기</button>}
                    <fieldset disabled={isWorkLogLoading || logBusy || students.some(s => s.isGenerating) || (isSavedEditor && loadedSavedId !== requestedLogId)} className="min-w-0 border-0 p-0 m-0">
                        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="작성 설정과 가져오기">
                            <label className="flex items-center gap-2 text-sm font-semibold">학생 수
                                <select aria-label="학생 수" value={studentCount} disabled={isSubjectPlanImporting || students.some(s => s.isGenerating)} onChange={e => changeStudentCount(Number(e.target.value))} className="h-10 rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700">
                                    {Array.from({ length: 40 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}명</option>)}
                                </select>
                            </label>
                            <label className="flex items-center gap-2 text-sm font-semibold">목표 글자 수
                                <select aria-label="목표 글자 수" value={charLimits[activeTabId]} onChange={e => setCharLimits(prev => ({ ...prev, [activeTabId]: Number(e.target.value) }))} className="h-10 rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700">
                                    {[charLimits[activeTabId], 100, 200, 300, 400, 500, 600, 800, 1000].filter((value, i, all) => all.indexOf(value) === i).map(value => <option key={value} value={value}>{value}자</option>)}
                                </select>
                            </label>
                            {students.some(student => student.selected) && <Button variant="ghost" onClick={handleResetSelection} className="rounded-xl">선택 해제</Button>}
                            <input type="file" id="workspace-csv-upload" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                            <Button variant="outline" onClick={() => document.getElementById("workspace-csv-upload")?.click()} disabled={isSubjectPlanImporting} className="ml-auto gap-2 rounded-xl"><Upload className="size-4" />CSV 가져오기</Button>
                            {activeTabId === "subject" && <>
                                <input type="file" id="subject-plan-upload" accept=".hwp,.hwpx,.pdf" className="hidden" onChange={handleSubjectPlanUpload} />
                                <Button onClick={() => document.getElementById("subject-plan-upload")?.click()} disabled={isSubjectPlanImporting} className="h-auto min-h-10 gap-2 whitespace-normal rounded-xl bg-indigo-600 px-4 py-2 text-left hover:bg-indigo-700">
                                    {isSubjectPlanImporting ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <FileSearch className="size-4 shrink-0" />}
                                    {isSubjectPlanImporting ? "평가계획 분석 중…" : "평가계획 PDF·HWPX 가져오기"}
                                </Button>
                                {isSubjectPlanImporting && <Button variant="outline" onClick={cancelSubjectPlanImport}>분석 취소</Button>}
                            </>}
                        </div>
                        {activeTabId === "behavior" ? (
                            <BehaviorWorkspace
                            polishAction={polishAction}
                            students={students}
                            setStudents={setStudents}
                            isExpanded={isExpanded}
                            setIsExpanded={setIsExpanded}
                            charLimit={charLimits.behavior}
                            handleAutoGenerateKeywords={handleAutoGenerateKeywords}
                            handleGenerate={handleGenerate}
                            handleReset={handleReset}
                            handleResetAll={handleResetAll}
                            handleResetKeywords={handleResetBehaviorKeywords}
                            handleDeleteUnusedKeywords={handleDeleteUnusedBehaviorKeywords}
                            handleSelectedGenerate={handleSelectedGenerate}
                            handleAllGenerate={handleAllGenerate}
                            toggleAllSelection={() => {
                            const allSelected = students.every(s => s.selected);
                            setStudents(prev => prev.map(s => ({ ...s, selected: !allSelected })));
                            }}
                            toggleStudentSelection={toggleStudentSelection}
                            isAddingKeyword={isAddingKeyword}
                            setIsAddingKeyword={setIsAddingKeyword}
                            newKeywordInput={newKeywordInput}
                            setNewKeywordInput={setNewKeywordInput}
                            addCustomKeyword={addCustomKeyword}
                            defaultKeywords={defaultKeywords}
                            />
                        ) : activeTabId === "subject" ? (
                            <SubjectWorkspace
                            savedEditor={isSavedEditor}
                            polishAction={polishAction}
                            students={students}
                            setStudents={setStudents}
                            globalConfig={subjectConfig}
                            setGlobalConfig={setSubjectConfig}
                            subjectLogs={subjectLogs}
                            activeSubjectScopeKey={activeSubjectScopeKey}
                            onSubjectScopeChange={handleSubjectScopeChange}
                            onCreateSubjectLog={handleCreateSubjectLog}
                            onDeleteSubjectLog={handleDeleteSubjectLog}
                            onDeleteAllSubjectLogs={handleDeleteAllSubjectLogs}
                            onReorderSubjectLogs={handleReorderSubjectLogs}
                            handleGenerate={handleGenerate}
                            handleAllGenerate={handleAllGenerate}
                            handleSelectedGenerate={handleSelectedGenerate}
                            handleResetAll={handleResetAll}
                            toggleAllSelection={toggleAllSelection}
                            toggleStudentSelection={toggleStudentSelection}
                            isExpanded={isExpanded}
                            setIsExpanded={setIsExpanded}
                            />
                        ) : activeTabId === "creative" ? (
                            <CreativeActivityWorkspace
                            polishAction={polishAction}
                            students={students}
                            setStudents={setStudents}
                            handleGenerate={handleGenerate}
                            handleAllGenerate={handleAllGenerate}
                            handleSelectedGenerate={handleSelectedGenerate}
                            handleResetAll={handleResetAll}
                            toggleAllSelection={toggleAllSelection}
                            toggleStudentSelection={toggleStudentSelection}
                            studentCount={studentCount}
                            charLimit={charLimits.creative}
                            isExpanded={isExpanded}
                            setIsExpanded={setIsExpanded}
                            />
                        ) : <PlaceholderWorkspace title={activeTab.title} onBack={() => changeCategory("behavior")} />}
                    </fieldset>
                    <p className="mt-5 text-xs leading-6 text-slate-500">나이스에 가져갈 기록은 먼저 작업로그에 저장하세요. <a href="https://chromewebstore.google.com/detail/forteacher-ai-neis-upload/kccpnhgkaombpfajdjgonenibmglpcmp?hl=ko" target="_blank" rel="noreferrer" className="underline underline-offset-4">크롬 확장 프로그램 설치</a></p>
                </div>
            </main>

            {subjectPlanImport && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/50 px-4 py-6 flex items-center justify-center">
                    <div ref={planDialogRef} role="dialog" aria-modal="true" aria-labelledby="plan-import-heading" onKeyDown={event => {
                        if (event.key === "Escape" && !isWorkLogLoading) { setSubjectPlanImport(null); setSelectedSubjectPlanIndexes([]); }
                        if (event.key === "Tab") {
                            const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length);
                            const first = nodes[0], last = nodes[nodes.length - 1];
                            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
                        }
                    }} className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 tracking-widest uppercase">평가계획 불러오기</div>
                                <h3 id="plan-import-heading" className="text-2xl font-black text-slate-900 dark:text-slate-100">가져온 교과</h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {isSavedEditor ? "현재 저장본에 적용할 교과 하나를 선택하세요. 작성 문장과 메모는 유지됩니다." : "적용할 교과를 선택하세요. 선택한 교과마다 독립된 작업을 만들며 기존 교과는 유지됩니다."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSubjectPlanImport(null);
                                    setSelectedSubjectPlanIndexes([]);
                                }}
                                className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 flex items-center justify-center transition-colors"
                                title="닫기" aria-label="평가계획 미리보기 닫기" disabled={isWorkLogLoading}
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {subjectPlanImport.warnings.length > 0 && (
                            <div className="mx-8 mt-5 rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-5 py-4 text-xs font-bold leading-6 text-amber-700 dark:text-amber-200">
                                {subjectPlanImport.warnings.slice(0, 3).map((warning, index) => (
                                    <div key={`${warning}-${index}`}>{warning}</div>
                                ))}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-4">
                            {subjectPlanImport.subjects.map((subject, index) => {
                                const selected = selectedSubjectPlanIndexes.includes(index);
                                return (
                                    <div
                                        key={`${subject.subjectName}-${index}`}
                                        className={cn(
                                            "w-full text-left rounded-2xl border p-5 transition-all",
                                            selected
                                                ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 shadow-sm"
                                                : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                        )}
                                    >
                                        <div className="space-y-4">
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1 space-y-4">
                                                    <div className="flex items-start gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSubjectPlanSelection(index)}
                                                            className={cn(
                                                                "size-7 rounded-lg border flex items-center justify-center shrink-0",
                                                                selected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-transparent"
                                                            )}
                                                            aria-label={selected ? "선택 해제" : "선택"}
                                                        >
                                                            <Check className="size-4" />
                                                        </button>
                                                        <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-[1fr_7rem] gap-3">
                                                            <label className="space-y-1">
                                                                <span className="text-[11px] font-black text-slate-400">교과명</span>
                                                                <Input
                                                                    value={subject.subjectName || ""}
                                                                    onChange={(event) => updateSubjectPlanSubject(index, "subjectName", event.target.value)}
                                                                    placeholder="교과명"
                                                                    className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-base font-black text-slate-900 dark:text-slate-100"
                                                                />
                                                            </label>
                                                            <label className="space-y-1">
                                                                <span className="text-[11px] font-black text-slate-400">학년</span>
                                                                <Input
                                                                    value={subject.grade || ""}
                                                                    onChange={(event) => updateSubjectPlanSubject(index, "grade", event.target.value)}
                                                                    placeholder="학년"
                                                                    className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-base font-black text-slate-900 dark:text-slate-100"
                                                                />
                                                            </label>
                                                            <div className="md:col-span-2 text-xs font-bold text-slate-400">
                                                                평가 {subject.assessments.length}개
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            <div className="shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-black text-slate-500 dark:text-slate-400">
                                                {selected ? "선택됨" : "제외됨"}
                                            </div>
                                        </div>
                                            <div className="grid gap-3">
                                                {subject.assessments.map((assessment, assessmentIndex) => {
                                                    const criteriaLevels = getCriteriaLevels(assessment);

                                                    return (
                                                        <div
                                                            key={`${assessment.area}-${assessmentIndex}`}
                                                            className="rounded-xl bg-white/85 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-4 space-y-3"
                                                        >
                                                        <label className="space-y-1 block">
                                                            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-300">영역</span>
                                                            <Input
                                                                value={assessment.area || ""}
                                                                onChange={(event) => updateSubjectPlanAssessment(index, assessmentIndex, "area", event.target.value)}
                                                                placeholder={`평가 ${assessmentIndex + 1}`}
                                                                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm font-black text-indigo-700 dark:text-indigo-200"
                                                            />
                                                        </label>
                                                        <label className="space-y-1 block">
                                                            <span className="text-[11px] font-black text-slate-400">성취기준</span>
                                                            <textarea
                                                                value={assessment.standard || ""}
                                                                onChange={(event) => updateSubjectPlanAssessment(index, assessmentIndex, "standard", event.target.value)}
                                                                placeholder="성취기준"
                                                                rows={2}
                                                                className="w-full min-h-20 resize-y rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200 outline-none transition-all focus-visible:border-indigo-300 focus-visible:ring-4 focus-visible:ring-indigo-100"
                                                            />
                                                        </label>
                                                        <div className="space-y-2">
                                                            <span className="text-[11px] font-black text-slate-400">평가기준</span>
                                                            <div className="grid gap-2 md:grid-cols-3">
                                                                {ACHIEVEMENT_LEVELS.map((level) => (
                                                                    <label key={level} className="block space-y-1">
                                                                        <span className={cn(
                                                                            "inline-flex h-6 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-black",
                                                                            level === "상" && "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300",
                                                                            level === "중" && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
                                                                            level === "하" && "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200"
                                                                        )}>
                                                                            {level}
                                                                        </span>
                                                                        <textarea
                                                                            value={criteriaLevels[level] || ""}
                                                                            onChange={(event) => updateSubjectPlanCriteriaLevel(index, assessmentIndex, level, event.target.value)}
                                                                            placeholder={`${level} 수준 평가기준`}
                                                                            rows={3}
                                                                            className="w-full min-h-24 resize-y rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200 outline-none transition-all focus-visible:border-indigo-300 focus-visible:ring-4 focus-visible:ring-indigo-100"
                                                                        />
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-sm font-black text-slate-500 dark:text-slate-400">
                                {selectedSubjectPlanIndexes.length}개 교과 선택
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isWorkLogLoading}
                                    onClick={() => {
                                        setSubjectPlanImport(null);
                                        setSelectedSubjectPlanIndexes([]);
                                    }}
                                    className="h-12 rounded-xl px-6 font-black border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                                >
                                    건너뛰기
                                </Button>
                                <Button
                                    type="button"
                                    disabled={isWorkLogLoading || selectedSubjectPlanIndexes.length === 0}
                                    onClick={applySubjectPlanImport}
                                    className="h-12 rounded-xl px-8 font-black bg-indigo-600 text-white hover:bg-indigo-700 gap-2"
                                >
                                    {isWorkLogLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                    적용
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

                @keyframes shimmer {
                    0% { transform: translateX(-150%) skewX(-20deg); }
                    100% { transform: translateX(150%) skewX(-20deg); }
                }

                input[type='range']::-webkit-slider-thumb {
                    width: 24px; height: 24px; border: 4px solid white;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    appearance: none; background: #3b82f6; border-radius: 50%; cursor: pointer;
                }
            `}</style>
        </div>
    );
}

export default function Page() {
    return <Suspense fallback={<main className="p-12 pt-32">작업을 불러오는 중입니다.</main>}><DashboardPage /></Suspense>;
}
