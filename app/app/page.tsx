"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserCheck,
    BookOpen,
    Zap,
    FileText,
    ArrowRight,
    Layout,
    Activity,
    ChevronRight,
    ChevronDown,
    Clock,
    Target,
    Brain,
    Plus,
    RotateCcw,
    Edit3,
    CheckCircle2,
    Settings2,
    Search,
    X,
    Maximize2,
    Minimize2,
    Download,
    Upload,
    FileSearch,
    Loader2,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import type { AchievementLevel, CriteriaLevels, ParsedSubjectPlanSubject, Student, SubjectGlobalConfig } from "@/types";
import { BehaviorWorkspace } from "@/components/workspace/BehaviorWorkspace";
import { CreativeActivityWorkspace } from "@/components/workspace/CreativeActivityWorkspace";
import { SubjectWorkspace } from "@/components/workspace/SubjectWorkspace";
import { PlaceholderWorkspace } from "@/components/workspace/PlaceholderWorkspace";
import { NavbarMain } from "@/components/layout/NavbarMain";
import { Footer } from "@/components/layout/Footer";
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
    }

    return levels;
};

const getCriteriaLevels = (assessment: Pick<ParsedSubjectPlanSubject["assessments"][number], "criteria" | "criteriaLevels">): CriteriaLevels => {
    const parsedLevels = splitCriteriaLevelsFromText(assessment.criteria || "");
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

export default function DashboardPage() {
    const router = useRouter();
    const [userName, setUserName] = useState<string | null>(null);
    const [activeTabId, setActiveTabId] = useState(features[0].id);
    const [studentCounts, setStudentCounts] = useState<Record<string, number>>(DEFAULT_STUDENT_COUNTS);
    const [loadedStudentCountCategories, setLoadedStudentCountCategories] = useState<Record<string, boolean>>({});
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
    const [isWorkLogLoading, setIsWorkLogLoading] = useState(false);
    const [isSubjectPlanImporting, setIsSubjectPlanImporting] = useState(false);
    const [subjectPlanImport, setSubjectPlanImport] = useState<SubjectPlanImportResult | null>(null);
    const [selectedSubjectPlanIndexes, setSelectedSubjectPlanIndexes] = useState<number[]>([]);
    const studentCount = studentCounts[activeTabId] || DEFAULT_STUDENT_COUNTS[activeTabId] || 7;
    const setStudentCount = (count: number) => {
        setLoadedStudentCountCategories(prev => ({ ...prev, [activeTabId]: true }));
        setStudentCounts(prev => ({ ...prev, [activeTabId]: count }));
    };

    // User Session Profile + auth guard
    useEffect(() => {
        let mounted = true;

        const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
            if (!mounted) return;
            if (!session?.user) {
                setUserId(null);
                setUserName(null);
                router.replace("/login");
                return;
            }

            setUserId(session.user.id);
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();

            if (!mounted) return;
            if (profile) {
                setUserName(profile.full_name);
            }
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
        if (!userId) return;

        const supportedTabs = ['behavior', 'creative', 'subject'];
        if (!supportedTabs.includes(activeTabId)) {
            return;
        }

        const loadWorkLog = async () => {
            setIsWorkLogLoading(true);

            if (activeTabId === 'subject') {
                const { data } = await supabase
                    .from('work_logs')
                    .select('scope_key, scope_label, data, created_at, updated_at')
                    .eq('user_id', userId)
                    .eq('category', 'subject')
                    .order('created_at', { ascending: false });

                const logs = data || [];
                let nextSubjectLogs: SubjectWorkLogSummary[] = logs.map(log => ({
                    scopeKey: log.scope_key || DEFAULT_SCOPE_KEY,
                    scopeLabel: log.scope_label || log.data?.globalConfig?.subjectName || "교과",
                    updatedAt: log.updated_at,
                    createdAt: log.created_at
                }));

                let selectedLog = logs.find(log => (log.scope_key || DEFAULT_SCOPE_KEY) === activeSubjectScopeKey);
                if (!selectedLog && activeSubjectScopeKey !== DEFAULT_SCOPE_KEY) {
                    nextSubjectLogs = [
                        { scopeKey: activeSubjectScopeKey, scopeLabel: "새 교과" },
                        ...nextSubjectLogs
                    ];
                }

                setSubjectLogs(nextSubjectLogs);

                selectedLog = selectedLog || (activeSubjectScopeKey === DEFAULT_SCOPE_KEY ? logs[0] : undefined);
                const subjectCountAlreadyLoaded = Boolean(loadedStudentCountCategories.subject);
                const nextSubjectCount = subjectCountAlreadyLoaded
                    ? studentCounts.subject
                    : (selectedLog?.data?.studentCount || logs[0]?.data?.studentCount || DEFAULT_STUDENT_COUNTS.subject);
                if (!subjectCountAlreadyLoaded) {
                    setLoadedStudentCountCategories(prev => ({ ...prev, subject: true }));
                    setStudentCounts(prev => ({ ...prev, subject: nextSubjectCount }));
                }

                if (selectedLog?.data) {
                    const nextScopeKey = selectedLog.scope_key || DEFAULT_SCOPE_KEY;
                    if (nextScopeKey !== activeSubjectScopeKey) {
                        setActiveSubjectScopeKey(nextScopeKey);
                    }
                    setStudents(resizeStudentsToCount(selectedLog.data.students, nextSubjectCount));
                    if (selectedLog.data.charLimits) {
                        setCharLimits(selectedLog.data.charLimits);
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

            const { data } = await supabase
                .from('work_logs')
                .select('data')
                .eq('user_id', userId)
                .eq('category', activeTabId)
                .eq('scope_key', DEFAULT_SCOPE_KEY)
                .maybeSingle();

            if (data?.data) {
                const nextCount = data.data.studentCount || studentCounts[activeTabId] || DEFAULT_STUDENT_COUNTS[activeTabId] || 7;
                setLoadedStudentCountCategories(prev => ({ ...prev, [activeTabId]: true }));
                setStudentCounts(prev => ({ ...prev, [activeTabId]: nextCount }));
                setStudents(resizeStudentsToCount(data.data.students, nextCount));
                if (data.data.charLimits) {
                    setCharLimits(data.data.charLimits);
                } else if (data.data.charLimit) {
                    setCharLimits(prev => ({ ...prev, [activeTabId]: data.data.charLimit }));
                }
            } else {
                const nextCount = studentCounts[activeTabId] || DEFAULT_STUDENT_COUNTS[activeTabId] || 7;
                setLoadedStudentCountCategories(prev => ({ ...prev, [activeTabId]: true }));
                setStudents(createInitialStudents(nextCount));
            }

            setIsWorkLogLoading(false);
        };

        loadWorkLog();
    }, [userId, activeTabId, activeSubjectScopeKey]); // studentCount 제거하여 수동 변경 시 데이터 덮어쓰기 방지

    const saveWorkLog = async (silent = false, overrideStudents?: Student[]) => {
        if (!userId) return false;

        const workLogData: WorkLogData = {
            students: overrideStudents || students,
            studentCount,
            charLimits
        };

        if (activeTabId === 'subject') {
            workLogData.globalConfig = subjectConfig;
        }

        const scopeKey = activeTabId === 'subject' ? activeSubjectScopeKey : DEFAULT_SCOPE_KEY;
        const scopeLabel = activeTabId === 'subject' ? getSubjectScopeLabel(subjectConfig) : null;
        const savedAt = new Date().toISOString();

        const { error } = await supabase
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
            });

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
                    return currentLog
                        ? prev.map(log => log.scopeKey === scopeKey ? nextLog : log)
                        : [nextLog, ...prev];
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

    const handleSubjectScopeChange = async (scopeKey: string) => {
        if (scopeKey === activeSubjectScopeKey) return;

        const saved = hasCurrentSubjectWork() ? await saveWorkLog(true) : true;
        if (!saved && !confirm("현재 교과 저장에 실패했습니다. 저장하지 않고 이동하시겠습니까?")) {
            return;
        }

        setActiveSubjectScopeKey(scopeKey);
    };

    const handleCreateSubjectLog = async () => {
        if (!userId) return;

        const currentSaved = hasCurrentSubjectWork() ? await saveWorkLog(true) : true;
        if (!currentSaved && !confirm("현재 교과 저장에 실패했습니다. 새 교과로 이동하시겠습니까?")) {
            return;
        }

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

        if (error) {
            console.error("Create Subject Error:", error);
            alert("새 교과 저장본을 만들지 못했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        setActiveSubjectScopeKey(scopeKey);
        setSubjectConfig(defaultConfig);
        setStudents(initialStudents);
        setSubjectLogs(prev => [{ scopeKey, scopeLabel: "새 교과", updatedAt: savedAt, createdAt: savedAt }, ...prev]);
        setIsWorkLogLoading(false);
    };

    const handleDeleteSubjectLog = async (scopeKey: string) => {
        if (!userId) return;
        const target = subjectLogs.find(log => log.scopeKey === scopeKey);
        const label = target?.scopeLabel || "교과";
        if (!confirm(`${label} 저장본을 삭제하시겠습니까?`)) return;

        setIsWorkLogLoading(true);
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('user_id', userId)
            .eq('category', 'subject')
            .eq('scope_key', scopeKey);

        if (error) {
            console.error("Delete Error:", error);
            alert("삭제 중 오류가 발생했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        const remainingLogs = subjectLogs.filter(log => log.scopeKey !== scopeKey);
        setSubjectLogs(remainingLogs);

        if (scopeKey === activeSubjectScopeKey) {
            const nextLog = remainingLogs[0];
            if (nextLog) {
                setActiveSubjectScopeKey(nextLog.scopeKey);
            } else {
                setActiveSubjectScopeKey(DEFAULT_SCOPE_KEY);
                setSubjectConfig(getDefaultSubjectConfig());
                setStudents(createInitialStudents(studentCount));
            }
        }

        setIsWorkLogLoading(false);
    };

    const handleDeleteAllSubjectLogs = async () => {
        if (!userId) return;
        if (!subjectLogs.length && !hasCurrentSubjectWork()) return;
        if (!confirm("모든 교과 저장본을 삭제하시겠습니까?")) return;

        setIsWorkLogLoading(true);
        const { error } = await supabase
            .from('work_logs')
            .delete()
            .eq('user_id', userId)
            .eq('category', 'subject');

        if (error) {
            console.error("Delete All Subjects Error:", error);
            alert("전체삭제 중 오류가 발생했습니다.");
            setIsWorkLogLoading(false);
            return;
        }

        setSubjectLogs([]);
        setActiveSubjectScopeKey(DEFAULT_SCOPE_KEY);
        setSubjectConfig(getDefaultSubjectConfig());
        setStudents(createInitialStudents(studentCount));
        setIsWorkLogLoading(false);
    };

    const syncSubjectStudentCountAcrossLogs = async (count: number, currentStudents: Student[]) => {
        if (!userId || activeTabId !== 'subject') return;

        const { data, error } = await supabase
            .from('work_logs')
            .select('scope_key, scope_label, data, schema_version')
            .eq('user_id', userId)
            .eq('category', 'subject');

        if (error || !data?.length) {
            if (error) console.error("Subject Count Sync Error:", error);
            return;
        }

        const syncedAt = new Date().toISOString();
        const updates = data.map(log => {
            const scopeKey = log.scope_key || DEFAULT_SCOPE_KEY;
            const baseData = log.data || {};
            const baseStudents = scopeKey === activeSubjectScopeKey
                ? currentStudents
                : baseData.students;

            return {
                user_id: userId,
                category: 'subject',
                scope_key: scopeKey,
                scope_label: log.scope_label,
                data: {
                    ...baseData,
                    students: resizeStudentsToCount(baseStudents, count),
                    studentCount: count,
                    charLimits: baseData.charLimits || charLimits,
                    globalConfig: scopeKey === activeSubjectScopeKey
                        ? subjectConfig
                        : baseData.globalConfig
                },
                schema_version: log.schema_version || 2,
                updated_at: syncedAt
            };
        });

        const { error: upsertError } = await supabase
            .from('work_logs')
            .upsert(updates, {
                onConflict: 'user_id, category, scope_key'
            });

        if (upsertError) {
            console.error("Subject Count Sync Save Error:", upsertError);
        }
    };

    // Auto-save logic (Debounced)
    useEffect(() => {
        if (!userId || !students.length || isWorkLogLoading) return;

        const timer = setTimeout(() => {
            saveWorkLog(true);
        }, 3000); // 3초 뒤 자동 저장

        return () => clearTimeout(timer);
    }, [students, studentCount, charLimits, userId, activeTabId, activeSubjectScopeKey, subjectConfig, isWorkLogLoading]);

    // 학생 수 변경 시 처리
    useEffect(() => {
        setStudents(prev => {
            return resizeStudentsToCount(prev, studentCount);
        });
    }, [studentCount]);

    useEffect(() => {
        if (
            !userId ||
            activeTabId !== 'subject' ||
            isWorkLogLoading ||
            !subjectLogs.length ||
            students.length !== studentCount
        ) {
            return;
        }

        const timer = setTimeout(() => {
            syncSubjectStudentCountAcrossLogs(studentCount, students);
        }, 1200);

        return () => clearTimeout(timer);
    }, [userId, activeTabId, studentCount, students.length, isWorkLogLoading, subjectLogs.length]);

    const activeTab = features.find(f => f.id === activeTabId) || features[0];
    const FeatureIcon = activeTab.icon;

    // AI 생성
    const handleGenerate = async (id: number) => {
        const student = students.find(s => s.id === id);
        if (!student) return;

        setStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));

        try {
            let tokens: string[] = [];
            let currentSubjectConfig = subjectConfig;

            if (activeTabId === 'behavior') {
                if (student.selectedKeywords.length < 2) {
                    setStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
                    return;
                }
                tokens = student.selectedKeywords;
            } else if (activeTabId === 'creative') {
                if (!student.participatedEvents || student.participatedEvents.length === 0) {
                    setStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
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
                            const sResp = await fetch("/api/generate/standard", {
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

                    let updatedAssessments = [...subjectConfig.assessments];
                    results.forEach(res => {
                        if (res.standard) {
                            updatedAssessments = updatedAssessments.map(a => a.id === res.id ? { ...a, standard: res.standard } : a);
                        }
                    });

                    currentSubjectConfig = { ...subjectConfig, assessments: updatedAssessments };
                    setSubjectConfig(currentSubjectConfig);
                }
            }

            // 2단계: 본문 생성
            const response = await fetch("/api/generate", {
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
            if (data.result) {
                setStudents(prev => prev.map(s => s.id === id ? {
                    ...s,
                    isGenerating: false,
                    aiResult: data.result,
                    isEditable: true
                } : s));
            } else {
                throw new Error(data.error || "Failed to generate");
            }
        } catch (error) {
            console.error(error);
            setStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
            alert("생성 중 오류가 발생했습니다.");
        }
    };

    const handleAllGenerate = async () => {
        const targetStudents = students.filter(s => {
            if (activeTabId === 'behavior') return s.selectedKeywords.length >= 2;
            if (activeTabId === 'creative') return (s.participatedEvents?.length || 0) > 0;
            if (activeTabId === 'subject') return (s.subjectData?.assessments?.length || 0) > 0;
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

        setStudents(prev => prev.map(s =>
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
                        const sResp = await fetch("/api/generate/standard", {
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

                let updatedAssessments = [...subjectConfig.assessments];
                results.forEach(res => {
                    if (res.standard) {
                        updatedAssessments = updatedAssessments.map(a => a.id === res.id ? { ...a, standard: res.standard } : a);
                    }
                });

                currentSubjectConfig = { ...subjectConfig, assessments: updatedAssessments };
                setSubjectConfig(currentSubjectConfig);
            }
        }

        // 병렬 처리 실행
        let firstError: string | null = null;
        const results = await Promise.all(targetStudents.map(async (student) => {
            try {
                let tokens: string[] = [];
                if (activeTabId === 'behavior') tokens = student.selectedKeywords;
                else if (activeTabId === 'creative') tokens = student.participatedEvents || [];

                const response = await fetch("/api/generate", {
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

                if (!response.ok) {
                    if (!firstError) firstError = data.error || `생성 실패 (HTTP ${response.status})`;
                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGenerating: false } : s));
                    return false;
                }

                // 결과 도착 시 즉시 상태 업데이트 (개별 업데이트)
                setStudents(prev => prev.map(s => s.id === student.id ? {
                    ...s,
                    isGenerating: false,
                    aiResult: data.result || s.aiResult,
                    isEditable: !!data.result
                } : s));
                return true;
            } catch (error: unknown) {
                console.error(`Error generating for student ${student.id}:`, error);
                if (!firstError) firstError = error instanceof Error ? error.message : "네트워크 오류가 발생했습니다.";
                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGenerating: false } : s));
                return false;
            }
        }));

        if (firstError && results.every(ok => !ok)) {
            alert(`전체 생성 실패: ${firstError}`);
        }
    };

    const handleSelectedGenerate = async () => {
        const selectedStudents = students.filter(s => {
            if (!s.selected) return false;
            if (activeTabId === 'behavior') return s.selectedKeywords.length >= 2;
            if (activeTabId === 'creative') return (s.participatedEvents?.length || 0) > 0;
            if (activeTabId === 'subject') return (s.subjectData?.assessments?.length || 0) > 0;
            return false;
        });

        if (selectedStudents.length === 0) {
            alert("조건(키워드/행사)을 만족하는 선택된 학생이 없습니다.");
            return;
        }

        setStudents(prev => prev.map(s =>
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
                        const sResp = await fetch("/api/generate/standard", {
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

                let updatedAssessments = [...subjectConfig.assessments];
                results.forEach(res => {
                    if (res.standard) {
                        updatedAssessments = updatedAssessments.map(a => a.id === res.id ? { ...a, standard: res.standard } : a);
                    }
                });

                currentSubjectConfig = { ...subjectConfig, assessments: updatedAssessments };
                setSubjectConfig(currentSubjectConfig);
            }
        }

        // 병렬 처리 실행
        selectedStudents.forEach(async (student) => {
            try {
                let tokens: string[] = [];
                if (activeTabId === 'behavior') tokens = student.selectedKeywords;
                else if (activeTabId === 'creative') tokens = student.participatedEvents || [];

                const response = await fetch("/api/generate", {
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

                // 결과 도착 시 즉시 상태 업데이트 (개별 업데이트)
                setStudents(prev => prev.map(s => s.id === student.id ? {
                    ...s,
                    isGenerating: false,
                    aiResult: data.result || s.aiResult,
                    isEditable: !!data.result
                } : s));
            } catch (error) {
                console.error(`Error generating for student ${student.id}:`, error);
                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, isGenerating: false } : s));
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
        await saveWorkLog(true, nextStudents);
    };

    const handleResetAll = async () => {
        if (!confirm("모든 입력값(키워드 및 결과)을 초기화하시겠습니까? 초기화 후 즉시 저장되므로 복구할 수 없습니다.")) return;
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
        await saveWorkLog(false, nextStudents);
        alert("초기화 및 저장이 완료되었습니다.");
    };

    const handleResetBehaviorKeywords = async () => {
        if (!confirm("모든 학생의 키워드를 초기화하시겠습니까? AI 결과는 유지됩니다.")) return;
        const nextStudents = students.map(s => ({
            ...s,
            selectedKeywords: [],
            customKeywords: []
        }));
        setStudents(nextStudents);
        await saveWorkLog(false, nextStudents);
        alert("키워드 초기화 및 저장이 완료되었습니다.");
    };

    const handleDeleteUnusedBehaviorKeywords = async () => {
        const nextStudents = students.map(s => ({
            ...s,
            customKeywords: s.customKeywords.filter(k => s.selectedKeywords.includes(k))
        }));
        setStudents(nextStudents);
        await saveWorkLog(false, nextStudents);
        alert("미선택 키워드 삭제 및 저장이 완료되었습니다.");
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/).filter(line => line.trim());
            if (lines.length <= 1) return;

            // Robust CSV parser that handles quotes correctly
            const parseCSVLine = (line: string) => {
                const result = [];
                let cur = "";
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) {
                        result.push(cur.trim());
                        cur = "";
                    } else cur += char;
                }
                result.push(cur.trim());
                // Remove outer quotes and handle double quotes
                return result.map(v => v.replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
            };

            const header = parseCSVLine(lines[0]);
            const noIdx = header.indexOf("번호");
            const resultIdx = header.findIndex(h => ["AI생성결과", "AI생성", "AI 결과", "AI결과"].includes(h.replace(/\s+/g, ""))) !== -1
                ? header.findIndex(h => ["AI생성결과", "AI생성", "AI 결과", "AI결과"].includes(h.replace(/\s+/g, "")))
                : header.indexOf("AI생성결과");

            if (activeTabId === 'behavior') {
                const keywordIdx = header.indexOf("키워드");
                if (noIdx === -1 || keywordIdx === -1) {
                    alert("행발 CSV 헤더에는 '번호'와 '키워드' 컬럼이 포함되어야 합니다.");
                    return;
                }

                const newStudents: Student[] = lines.slice(1).map((line, idx): Student | null => {
                    const cols = parseCSVLine(line);
                    if (cols.length < 2) return null;
                    const studentNo = parseInt(cols[noIdx]) || (idx + 1);
                    const rawKeywords = cols[keywordIdx] || "";
                    const cleanKeywords: string[] = rawKeywords.replace(/[{}[\]]/g, "").split(/[|,]/).map(k => k.trim()).filter(k => k);
                    const resultText = cols[resultIdx] || "";

                    return {
                        id: studentNo,
                        name: `${studentNo}번 학생`,
                        customKeywords: cleanKeywords.filter(k => !defaultKeywords.includes(k)),
                        selectedKeywords: cleanKeywords,
                        participatedEvents: [] as string[],
                        officerRole: "임원아님",
                        officerPeriod: "",
                        aiResult: resultText,
                        isGenerating: false,
                        isEditable: !!resultText,
                        selected: false
                    };
                }).filter((s): s is Student => s !== null);

                setStudents(newStudents);
                setStudentCount(newStudents.length);
            } else if (activeTabId === 'creative') {
                const eventIdx = header.findIndex(h => h.replace(/\s+/g, "") === "참여행사");
                if (noIdx === -1 || eventIdx === -1) {
                    alert("창체 CSV 헤더에는 '번호'와 '참여 행사' 컬럼이 포함되어야 합니다.");
                    return;
                }

                const roleIdx = header.indexOf("임원여부");
                const periodIdx = header.indexOf("임원기간");

                const newStudents: Student[] = lines.slice(1).map((line, idx): Student | null => {
                    const cols = parseCSVLine(line);
                    if (cols.length < 2) return null;
                    const studentNo = parseInt(cols[noIdx]) || (idx + 1);
                    const rawEvents = cols[eventIdx] || "";
                    const cleanEvents: string[] = rawEvents.replace(/[{}[\]()]/g, "").split(/[|,]/).map(k => k.trim()).filter(k => k);
                    const resultText = cols[resultIdx] || "";

                    return {
                        id: studentNo,
                        name: `${studentNo}번 학생`,
                        customKeywords: [] as string[],
                        selectedKeywords: [] as string[],
                        participatedEvents: cleanEvents,
                        officerRole: roleIdx !== -1 ? (cols[roleIdx] || "임원아님") : "임원아님",
                        officerPeriod: periodIdx !== -1 ? (cols[periodIdx] || "") : "",
                        aiResult: resultText,
                        isGenerating: false,
                        isEditable: !!resultText,
                        selected: false
                    };
                }).filter((s): s is Student => s !== null);

                setStudents(newStudents);
                setStudentCount(newStudents.length);
            } else if (activeTabId === 'subject') {
                // 1. 평가 컬럼(평가1, 평가2...) 찾기
                const assessmentCols = header.filter(h => h.startsWith("평가") && !isNaN(Number(h.replace("평가", ""))));
                const noteIdx = header.findIndex(h => ["개별특이사항", "특이사항"].includes(h.replace(/\s+/g, "")));

                if (noIdx === -1 || assessmentCols.length === 0) {
                    alert("교과 CSV 헤더에는 '번호'와 최소 하나 이상의 '평가N' 컬럼이 포함되어야 합니다.");
                    return;
                }

                // 2. config 업데이트 (평가 영역 자동 생성)
                // 기존 config의 assessment 정보를 유지하려면 별도 로직이 필요하나,
                // 여기서는 "양식 업로드" 개념이므로 파일 내용에 맞춰 재구성합니다.
                // 단, 평가 문구(성취기준 등)는 CSV에 없으므로 빈 값으로 생성됩니다.
                const newAssessments = assessmentCols.map((col, i) => ({
                    id: crypto.randomUUID(),
                    area: col, // 임시로 컬럼명을 영역명으로
                    standard: "",
                    criteria: "",
                    competency: ""
                }));

                setSubjectConfig(prev => ({
                    ...prev,
                    assessments: newAssessments
                }));

                // 3. 학생 데이터 파싱
                const newStudents: Student[] = lines.slice(1).map((line, idx): Student | null => {
                    const cols = parseCSVLine(line);
                    if (cols.length < 2) return null;

                    const studentNo = parseInt(cols[noIdx]) || (idx + 1);
                    const resultText = cols[resultIdx] || "";
                    const noteText = noteIdx !== -1 ? (cols[noteIdx] || "") : "";

                    // 평가 점수 매핑
                    const studentAssessments = newAssessments.map(ass => {
                        const colIdx = header.indexOf(ass.area);
                        let val = colIdx !== -1 ? (cols[colIdx] || "") : "";
                        // 유효성 검사 (상/중/하 아니면 빈값 처리)
                        if (!["상", "중", "하"].includes(val)) val = "";
                        return {
                            assessmentId: ass.id,
                            level: val as "상" | "중" | "하" | ""
                        };
                    });

                    return {
                        id: studentNo,
                        name: `${studentNo}번 학생`,
                        customKeywords: [],
                        selectedKeywords: [],
                        participatedEvents: [],
                        officerRole: "임원아님",
                        officerPeriod: "",
                        aiResult: resultText,
                        isGenerating: false,
                        isEditable: !!resultText,
                        selected: false,
                        subjectData: {
                            assessments: studentAssessments,
                            individualNote: noteText
                        }
                    };
                }).filter((s): s is Student => s !== null);

                setStudents(newStudents);
                setStudentCount(newStudents.length);
            }
        };
        reader.readAsText(file);
        // Reset input value to allow re-uploading the same file
        e.target.value = "";
    };

    const handleSubjectPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setIsSubjectPlanImporting(true);
        setSubjectPlanImport(null);
        setSelectedSubjectPlanIndexes([]);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("schoolLevel", subjectConfig.schoolLevel);
            formData.append("grade", subjectConfig.grade);
            formData.append("subjectName", subjectConfig.subjectName);

            const response = await fetch("/api/subject-plan/parse", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

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
            setSelectedSubjectPlanIndexes(subjects.map((_, index) => index));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "평가계획을 읽을 수 없습니다.";
            alert(message);
        } finally {
            setIsSubjectPlanImporting(false);
        }
    };

    const toggleSubjectPlanSelection = (index: number) => {
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

        const currentSaved = hasCurrentSubjectWork() ? await saveWorkLog(true) : true;
        if (!currentSaved && !confirm("현재 교과 저장에 실패했습니다. 평가계획을 적용하시겠습니까?")) {
            return;
        }

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
        setSubjectLogs(prev => [
            ...importedLogs.map(log => ({
                scopeKey: log.scopeKey,
                scopeLabel: log.scopeLabel,
                updatedAt: savedAt,
                createdAt: savedAt,
            })),
            ...prev,
        ]);
        setActiveSubjectScopeKey(firstLog.scopeKey);
        setSubjectConfig(firstLog.globalConfig);
        setStudents(firstLog.students);
        setSubjectPlanImport(null);
        setSelectedSubjectPlanIndexes([]);
        setIsWorkLogLoading(false);
    };

    // --- UI Rendering ---
    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">

            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6 max-w-[1440px]">
                    {/* Header Section */}
                    <header className="flex flex-col gap-6 mb-12 border-b border-slate-200 dark:border-border pb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-1 bg-primary rounded-full" />
                                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-primary/60 dark:text-primary/80">Advanced Dashboard v2.9</span>
                                </div>
                                <h2 className="text-5xl font-black tracking-tight text-slate-900 dark:text-foreground leading-tight">
                                    Welcome <span className="text-primary">Teacher!</span>
                                </h2>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-card p-6 rounded-[2.5rem] border border-slate-100 dark:border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
                                <div className="flex items-center gap-6 px-4">
                                    <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest mb-1">학생 수</span>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range" min="1" max="40"
                                                value={studentCount}
                                                onChange={(e) => setStudentCount(Number(e.target.value))}
                                                className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                            <span className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tighter w-8">{studentCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-8">
                        {/* Workspace Content (Left) */}
                        <div className="min-w-0 space-y-10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTabId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className={cn(isExpanded && "!transform-none")}
                                >

                                    {activeTabId === "behavior" ? (
                                        <div className="space-y-10">
                                            {/* Configuration Card */}
                                            <Card className="p-0 border-0 bg-white dark:bg-card dark:border dark:border-border shadow-2xl shadow-slate-200/40 dark:shadow-none rounded-[3.5rem] overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                    <div className="p-10 border-r border-slate-100 dark:border-border space-y-8 bg-slate-50/30 dark:bg-slate-900/20">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 text-sm font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest break-keep min-w-0">
                                                                <Target className="size-5 text-primary shrink-0" /> 워크스페이스 설정
                                                            </div>
                                                            <input
                                                                type="file"
                                                                id="csv-upload-behavior"
                                                                accept=".csv"
                                                                className="hidden"
                                                                onChange={handleFileUpload}
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => document.getElementById('csv-upload-behavior')?.click()}
                                                                className="rounded-xl h-10 px-5 font-black bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm text-[11px]"
                                                            >
                                                                양식 업로드 <Upload className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center h-24">
                                                            <span className="text-6xl font-black text-slate-900 dark:text-foreground tracking-tighter">{studentCount}</span>
                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Selected Students</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-10 space-y-8">
                                                        <div className="flex items-center gap-3 text-sm font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest break-keep min-w-0">
                                                            <Edit3 className="size-5 text-primary shrink-0" /> 행동특성 글자수 가이드
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {[100, 200, 300, 500].map(limit => (
                                                                <button
                                                                    key={limit}
                                                                    onClick={() => setCharLimits(prev => ({ ...prev, behavior: limit }))}
                                                                    className={cn(
                                                                        "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-4",
                                                                        charLimits.behavior === limit
                                                                            ? "bg-primary border-primary text-white scale-105 shadow-xl shadow-primary/20 dark:shadow-none"
                                                                            : "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700 hover:scale-105"
                                                                    )}
                                                                >
                                                                    <span className="text-xl font-black">{limit}</span>
                                                                    <span className="text-[10px] font-bold uppercase opacity-60">Char</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>

                                            <BehaviorWorkspace
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
                                        </div>
                                    ) : activeTabId === "subject" ? (
                                        <div className="space-y-10">
                                            <Card className="p-0 border-0 bg-white dark:bg-card dark:border dark:border-border shadow-2xl shadow-slate-200/40 dark:shadow-none rounded-[3.5rem] overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                    <div className="p-10 border-r border-slate-100 dark:border-border space-y-8 bg-slate-50/30 dark:bg-slate-900/20">
                                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                                            <div className="flex items-center gap-3 text-sm font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest break-keep min-w-0">
                                                                <Target className="size-5 text-indigo-500 shrink-0" /> 워크스페이스 설정
                                                            </div>
                                                            <input
                                                                type="file"
                                                                id="csv-upload-subject"
                                                                accept=".csv"
                                                                className="hidden"
                                                                onChange={handleFileUpload}
                                                            />
                                                            <input
                                                                type="file"
                                                                id="subject-plan-upload"
                                                                accept=".hwp,.hwpx,.pdf"
                                                                className="hidden"
                                                                onChange={handleSubjectPlanUpload}
                                                            />
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        disabled={isSubjectPlanImporting}
                                                                        className="rounded-xl h-10 px-5 font-black bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-slate-700 gap-2 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all shadow-sm text-[11px]"
                                                                    >
                                                                        {isSubjectPlanImporting ? (
                                                                            <>
                                                                                읽는 중 <Loader2 className="size-3.5 animate-spin" />
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                불러오기 <ChevronDown className="size-3.5" />
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-2xl z-[300]">
                                                                    <DropdownMenuItem
                                                                        onClick={() => document.getElementById('csv-upload-subject')?.click()}
                                                                        className="rounded-xl px-3 py-2 text-xs font-bold cursor-pointer gap-2"
                                                                    >
                                                                        <Upload className="size-3.5" /> CSV
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => document.getElementById('subject-plan-upload')?.click()}
                                                                        className="rounded-xl px-3 py-2 text-xs font-bold cursor-pointer gap-2"
                                                                    >
                                                                        <FileSearch className="size-3.5" /> 평가계획
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center h-24">
                                                            <span className="text-6xl font-black text-slate-900 dark:text-foreground tracking-tighter">{studentCount}</span>
                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Selected Students</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-10 space-y-8">
                                                        <div className="flex items-center gap-3 text-sm font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest break-keep min-w-0">
                                                            <Edit3 className="size-5 text-indigo-500 shrink-0" /> 교과세특 글자수 가이드
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {[100, 200, 300, 500].map(limit => (
                                                                <button
                                                                    key={limit}
                                                                    onClick={() => setCharLimits(prev => ({ ...prev, subject: limit }))}
                                                                    className={cn(
                                                                        "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-4",
                                                                        charLimits.subject === limit
                                                                            ? "bg-indigo-500 border-indigo-500 text-white scale-105 shadow-xl shadow-indigo-200/40 dark:shadow-none"
                                                                            : "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700 hover:scale-105"
                                                                    )}
                                                                >
                                                                    <span className="text-xl font-black">{limit}</span>
                                                                    <span className="text-[10px] font-bold uppercase opacity-60">Char</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>

                                            <SubjectWorkspace
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
                                                handleGenerate={handleGenerate}
                                                handleAllGenerate={handleAllGenerate}
                                                handleSelectedGenerate={handleSelectedGenerate}
                                                handleResetAll={handleResetAll}
                                                toggleAllSelection={toggleAllSelection}
                                                toggleStudentSelection={toggleStudentSelection}
                                                isExpanded={isExpanded}
                                                setIsExpanded={setIsExpanded}
                                            />
                                        </div>
                                    ) : activeTabId === "creative" ? (
                                        <div className="space-y-10">
                                            <Card className="p-0 border-0 bg-white dark:bg-card dark:border dark:border-border shadow-2xl shadow-slate-200/40 dark:shadow-none rounded-[3.5rem] overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                    <div className="p-10 border-r border-slate-100 dark:border-border space-y-8 bg-slate-50/30 dark:bg-slate-900/20">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 text-sm font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest break-keep min-w-0">
                                                                <Target className="size-5 text-amber-500 shrink-0" /> 워크스페이스 설정
                                                            </div>
                                                            <input
                                                                type="file"
                                                                id="csv-upload-creative"
                                                                accept=".csv"
                                                                className="hidden"
                                                                onChange={handleFileUpload}
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => document.getElementById('csv-upload-creative')?.click()}
                                                                className="rounded-xl h-10 px-5 font-black bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm text-[11px]"
                                                            >
                                                                양식 업로드 <Upload className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center h-24">
                                                            <span className="text-6xl font-black text-slate-900 dark:text-foreground tracking-tighter">{studentCount}</span>
                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Selected Students</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-10 space-y-8">
                                                        <div className="flex items-center gap-3 text-sm font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest break-keep min-w-0">
                                                            <Edit3 className="size-5 text-amber-500 shrink-0" /> 창체활동 글자수 가이드
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {[100, 200, 300, 500].map(limit => (
                                                                <button
                                                                    key={limit}
                                                                    onClick={() => setCharLimits(prev => ({ ...prev, creative: limit }))}
                                                                    className={cn(
                                                                        "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-4",
                                                                        charLimits.creative === limit
                                                                            ? "bg-amber-500 border-amber-500 text-white scale-105 shadow-xl shadow-amber-200/40 dark:shadow-none"
                                                                            : "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700 hover:scale-105"
                                                                    )}
                                                                >
                                                                    <span className="text-xl font-black">{limit}</span>
                                                                    <span className="text-[10px] font-bold uppercase opacity-60">Char</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>

                                            <CreativeActivityWorkspace
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
                                        </div>
                                    ) : (
                                        <PlaceholderWorkspace
                                            title={features.find(f => f.id === activeTabId)?.title || ""}
                                            onBack={() => setActiveTabId("behavior")}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Sidebar (Right) */}
                        <aside className="space-y-6">
                            <div className="px-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">Service Area</h3>
                                <div className="space-y-4">
                                    {features.map((f) => {
                                        const Icon = f.icon;
                                        const isActive = activeTabId === f.id;
                                        return (
                                            <button
                                                key={f.id}
                                                onClick={() => setActiveTabId(f.id)}
                                                className={cn(
                                                    "w-full p-6 min-h-28 rounded-[2.5rem] flex items-center gap-6 transition-all text-left border",
                                                    isActive
                                                        ? "bg-white dark:bg-card border-primary shadow-2xl shadow-primary/5 dark:shadow-none ring-1 ring-primary/20 dark:ring-primary/40"
                                                        : "bg-white dark:bg-slate-900/50 border-transparent dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                                                )}
                                            >
                                                <div className={cn("size-14 rounded-3xl flex items-center justify-center shrink-0", isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-50 dark:bg-slate-800")}>
                                                    <Icon className="size-7" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={cn("font-black text-sm block mb-1 break-keep", isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{f.title}</span>
                                                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter">Feature</span>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {/* Chrome Extension Promo Card - Neon Dark Design */}
                                    <div className="w-full p-11 rounded-[2.5rem] bg-[#0A101E] border border-white/5 shadow-2xl relative overflow-hidden group mt-6 text-center transition-all hover:scale-[1.01]">
                                        {/* Radial background glow */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                                        {/* Stable Badge */}
                                        <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                                            <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                            <span className="text-[10px] font-bold text-slate-300">Stable</span>
                                        </div>

                                        <div className="relative z-10 flex flex-col items-center space-y-8">
                                            {/* Neon Icon */}
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-20 animate-pulse" />
                                                <Zap className="size-20 text-cyan-400 stroke-[1.5] relative filter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-2xl font-black text-white tracking-tight">나이스 붙여넣기</h4>
                                                <p className="text-[13px] font-medium text-slate-400 leading-relaxed max-w-[280px]">
                                                    열심히 작업하신 결과를 <br />
                                                    <span className="text-white font-bold">크롬 확장프로그램</span>을 통해 <br /> 나이스에 바로 입력하세요.
                                                </p>
                                            </div>

                                            <Button
                                                asChild
                                                variant="outline"
                                                className="w-full rounded-[1.25rem] h-16 border-2 border-cyan-500/40 hover:border-cyan-400 bg-transparent hover:bg-cyan-500/5 text-cyan-400 font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.1)] active:scale-95 flex items-center justify-center gap-2 group/btn"
                                            >
                                                <a
                                                    href="https://chromewebstore.google.com/detail/forteacher-ai-neis-upload/kccpnhgkaombpfajdjgonenibmglpcmp?hl=ko"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    다운로드하러가기
                                                    <ChevronRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            {subjectPlanImport && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/50 px-4 py-6 flex items-center justify-center">
                    <div className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-slate-200 flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-[11px] font-black text-indigo-500 tracking-widest uppercase">평가계획 불러오기</div>
                                <h3 className="text-2xl font-black text-slate-900">가져온 교과</h3>
                                <p className="text-sm font-medium text-slate-500">
                                    적용할 교과를 선택하세요.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSubjectPlanImport(null);
                                    setSelectedSubjectPlanIndexes([]);
                                }}
                                className="size-11 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                                title="닫기"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {subjectPlanImport.warnings.length > 0 && (
                            <div className="mx-8 mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-xs font-bold leading-6 text-amber-700">
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
                                                ? "border-indigo-200 bg-indigo-50 shadow-sm"
                                                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
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
                                                                selected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-transparent"
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
                                                                    className="h-11 bg-white border-slate-200 text-base font-black text-slate-900"
                                                                />
                                                            </label>
                                                            <label className="space-y-1">
                                                                <span className="text-[11px] font-black text-slate-400">학년</span>
                                                                <Input
                                                                    value={subject.grade || ""}
                                                                    onChange={(event) => updateSubjectPlanSubject(index, "grade", event.target.value)}
                                                                    placeholder="학년"
                                                                    className="h-11 bg-white border-slate-200 text-base font-black text-slate-900"
                                                                />
                                                            </label>
                                                            <div className="md:col-span-2 text-xs font-bold text-slate-400">
                                                                평가 {subject.assessments.length}개
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            <div className="shrink-0 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-500">
                                                {selected ? "선택됨" : "제외됨"}
                                            </div>
                                        </div>
                                            <div className="grid gap-3">
                                                {subject.assessments.map((assessment, assessmentIndex) => {
                                                    const criteriaLevels = getCriteriaLevels(assessment);

                                                    return (
                                                        <div
                                                            key={`${assessment.area}-${assessmentIndex}`}
                                                            className="rounded-xl bg-white/85 border border-slate-100 p-4 space-y-3"
                                                        >
                                                        <label className="space-y-1 block">
                                                            <span className="text-[11px] font-black text-indigo-600">영역</span>
                                                            <Input
                                                                value={assessment.area || ""}
                                                                onChange={(event) => updateSubjectPlanAssessment(index, assessmentIndex, "area", event.target.value)}
                                                                placeholder={`평가 ${assessmentIndex + 1}`}
                                                                className="h-10 bg-white border-slate-200 text-sm font-black text-indigo-700"
                                                            />
                                                        </label>
                                                        <label className="space-y-1 block">
                                                            <span className="text-[11px] font-black text-slate-400">성취기준</span>
                                                            <textarea
                                                                value={assessment.standard || ""}
                                                                onChange={(event) => updateSubjectPlanAssessment(index, assessmentIndex, "standard", event.target.value)}
                                                                placeholder="성취기준"
                                                                rows={2}
                                                                className="w-full min-h-20 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition-all focus-visible:border-indigo-300 focus-visible:ring-4 focus-visible:ring-indigo-100"
                                                            />
                                                        </label>
                                                        <div className="space-y-2">
                                                            <span className="text-[11px] font-black text-slate-400">평가기준</span>
                                                            <div className="grid gap-2 md:grid-cols-3">
                                                                {ACHIEVEMENT_LEVELS.map((level) => (
                                                                    <label key={level} className="block space-y-1">
                                                                        <span className={cn(
                                                                            "inline-flex h-6 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-black",
                                                                            level === "상" && "bg-indigo-50 text-indigo-600",
                                                                            level === "중" && "bg-slate-100 text-slate-600",
                                                                            level === "하" && "bg-amber-50 text-amber-700"
                                                                        )}>
                                                                            {level}
                                                                        </span>
                                                                        <textarea
                                                                            value={criteriaLevels[level] || ""}
                                                                            onChange={(event) => updateSubjectPlanCriteriaLevel(index, assessmentIndex, level, event.target.value)}
                                                                            placeholder={`${level} 수준 평가기준`}
                                                                            rows={3}
                                                                            className="w-full min-h-24 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium leading-6 text-slate-700 outline-none transition-all focus-visible:border-indigo-300 focus-visible:ring-4 focus-visible:ring-indigo-100"
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

                        <div className="px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-sm font-black text-slate-500">
                                {selectedSubjectPlanIndexes.length}개 교과 선택
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSubjectPlanImport(null);
                                        setSelectedSubjectPlanIndexes([]);
                                    }}
                                    className="h-12 rounded-xl px-6 font-black border-slate-200 bg-white text-slate-500"
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
