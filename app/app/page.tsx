"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserCheck,
    BookOpen,
    Zap,
    FileText,
    ArrowRight,
    Layout,
    Sparkles,
    Activity,
    ChevronRight,
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
    Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Student } from "@/types";
import { BehaviorWorkspace } from "@/components/workspace/BehaviorWorkspace";
import { CreativeActivityWorkspace } from "@/components/workspace/CreativeActivityWorkspace";
import { SubjectWorkspace } from "@/components/workspace/SubjectWorkspace";
import { PlaceholderWorkspace } from "@/components/workspace/PlaceholderWorkspace";
import { NavbarMain } from "@/components/layout/NavbarMain";
import { Footer } from "@/components/layout/Footer";
import { studentKeywordPool, defaultKeywords } from "@/lib/constants/behavior-keywords";
import { CREATIVE_CATEGORIES } from "@/lib/constants/creative-events";
import { SubjectGlobalConfig } from "@/types";

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

export default function DashboardPage() {
    const [userName, setUserName] = useState<string | null>(null);
    const [activeTabId, setActiveTabId] = useState(features[0].id);
    const [studentCount, setStudentCount] = useState(7);
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
    const [subjectConfig, setSubjectConfig] = useState<SubjectGlobalConfig>({
        schoolLevel: "elementary",
        grade: "1",
        subjectName: "",
        assessments: []
    });

    // User Session Profile
    useEffect(() => {
        const getUserProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUserName(profile.full_name);
                }
            }
        };
        getUserProfile();
    }, []);

    // Load work logs from Supabase
    useEffect(() => {
        if (!userId) return;

        // 지원하는 탭만 데이터를 가져옴
        const supportedTabs = ['behavior', 'creative', 'subject'];
        if (!supportedTabs.includes(activeTabId)) {
            return;
        }

        const loadWorkLog = async () => {
            const { data, error } = await supabase
                .from('work_logs')
                .select('data')
                .eq('user_id', userId)
                .eq('category', activeTabId)
                .maybeSingle(); // .single() 대신 .maybeSingle()을 사용하여 데이터가 없을 때 406 에러 방지

            if (data && data.data) {
                setStudents(data.data.students || []);
                setStudentCount(data.data.studentCount || 7);
                if (data.data.charLimits) {
                    setCharLimits(data.data.charLimits);
                } else if (data.data.charLimit) {
                    // 호환성 유지
                    setCharLimits(prev => ({ ...prev, [activeTabId]: data.data.charLimit }));
                }

                if (activeTabId === 'subject' && data.data.globalConfig) {
                    setSubjectConfig(data.data.globalConfig);
                }
            } else {
                // 초기화
                const initialStudents = Array.from({ length: studentCount }, (_, i) => ({
                    id: i + 1,
                    name: `${i + 1}번 학생`,
                    customKeywords: [],
                    selectedKeywords: [],
                    participatedEvents: [], // 창체활동 전용
                    officerRole: "임원아님", // 창체활동 전용
                    officerPeriod: "", // 창체활동 전용
                    aiResult: "",
                    isGenerating: false,
                    isEditable: false,
                    selected: false
                }));
                setStudents(initialStudents);
            }
        };

        loadWorkLog();
    }, [userId, activeTabId]); // studentCount 제거하여 수동 변경 시 데이터 덮어쓰기 방지

    const saveWorkLog = async (silent = false, overrideStudents?: Student[]) => {
        if (!userId) return;

        const workLogData: any = {
            students: overrideStudents || students,
            studentCount,
            charLimits
        };

        if (activeTabId === 'subject') {
            workLogData.globalConfig = subjectConfig;
        }

        const { error } = await supabase
            .from('work_logs')
            .upsert({
                user_id: userId,
                category: activeTabId,
                data: workLogData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, category'
            });

        if (error) {
            console.error("Save Error:", error);
            if (!silent) alert("저장 중 오류가 발생했습니다.");
        } else {
            if (!silent) console.log("Auto-saved work log.");
        }
    };

    // Auto-save logic (Debounced)
    useEffect(() => {
        if (!userId || !students.length) return;

        const timer = setTimeout(() => {
            saveWorkLog(true);
        }, 3000); // 3초 뒤 자동 저장

        return () => clearTimeout(timer);
    }, [students, studentCount, charLimits, userId, activeTabId, subjectConfig]);

    // 학생 수 변경 시 처리
    useEffect(() => {
        setStudents(prev => {
            if (prev.length === studentCount) return prev;
            if (prev.length < studentCount) {
                // 추가
                const toAdd = Array.from({ length: studentCount - prev.length }, (_, i) => ({
                    id: prev.length + i + 1,
                    name: `${prev.length + i + 1}번 학생`,
                    customKeywords: [],
                    selectedKeywords: [],
                    participatedEvents: [],
                    officerRole: "임원아님",
                    officerPeriod: "",
                    aiResult: "",
                    isGenerating: false,
                    isEditable: false,
                    selected: true
                }));
                return [...prev, ...toAdd];
            } else {
                // 제거
                return prev.slice(0, studentCount);
            }
        });
    }, [studentCount]);

    const activeTab = features.find(f => f.id === activeTabId) || features[0];
    const FeatureIcon = activeTab.icon;

    // AI 생성
    const handleGenerate = async (id: number) => {
        const student = students.find(s => s.id === id);
        if (!student) return;

        let tokens: string[] = [];
        if (activeTabId === 'behavior') {
            if (student.selectedKeywords.length < 2) return;
            tokens = student.selectedKeywords;
        } else if (activeTabId === 'creative') {
            if (!student.participatedEvents || student.participatedEvents.length === 0) return;
            tokens = student.participatedEvents;
        }

        setStudents(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keywords: tokens,
                    term: student.officerPeriod || "",
                    role: student.officerRole || "임원아님",
                    targetChars: charLimits[activeTabId],
                    category: activeTabId,
                    // 교과세특 전용 데이터
                    subjectMeta: activeTabId === 'subject' ? {
                        ...subjectConfig,
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

        // 병렬 처리 실행
        targetStudents.forEach(async (student) => {
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
                            ...subjectConfig,
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
                            ...subjectConfig,
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

    const handleAutoGenerateEvents = () => {
        if (!students.some(s => s.selected)) {
            alert("선택된 학생이 없습니다.");
            return;
        }
        const allEvents = CREATIVE_CATEGORIES.flatMap(cat => cat.events);
        setStudents(prev => prev.map(student => {
            if (!student.selected) return student;
            const shuffled = [...allEvents].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 3);
            return {
                ...student,
                participatedEvents: Array.from(new Set([...(student.participatedEvents || []), ...selected]))
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
                    let rawKeywords = cols[keywordIdx] || "";
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
                    let rawEvents = cols[eventIdx] || "";
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

    // --- UI Rendering ---
    return (
        <div className="min-h-screen bg-[#FAFBFF]">

            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6 max-w-7xl">
                    {/* Header Section */}
                    <header className="flex flex-col gap-6 mb-12 border-b border-slate-200 pb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-1 bg-primary rounded-full" />
                                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-primary/60">Advanced Dashboard v2.9</span>
                                </div>
                                <h2 className="text-5xl font-black tracking-tight text-slate-900 leading-tight">
                                    Welcome <span className="text-primary">Teacher!</span>
                                </h2>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                                <div className="flex items-center gap-6 px-4">
                                    <div className="flex flex-col items-center min-w-[80px]">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">학생 수</span>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range" min="1" max="40"
                                                value={studentCount}
                                                onChange={(e) => setStudentCount(Number(e.target.value))}
                                                className="w-24 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                            <span className="text-2xl font-black text-slate-900 tracking-tighter w-8">{studentCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                        {/* Workspace Content (Left) */}
                        <div className="lg:col-span-3 space-y-10">
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
                                            <Card className="p-0 border-0 bg-white shadow-2xl shadow-slate-200/40 rounded-[3.5rem] overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                    <div className="p-10 border-r border-slate-100 space-y-8 bg-slate-50/30">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                                <Target className="size-5 text-primary" /> 워크스페이스 설정
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
                                                                className="rounded-xl h-10 px-5 font-black bg-white text-slate-600 border-slate-200 gap-2 hover:bg-slate-50 transition-all shadow-sm text-[11px]"
                                                            >
                                                                양식 업로드 <Upload className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center h-24">
                                                            <span className="text-6xl font-black text-slate-900 tracking-tighter">{studentCount}</span>
                                                            <span className="text-xs font-bold text-slate-400 uppercase">Selected Students</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-10 space-y-8">
                                                        <div className="flex items-center gap-3 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                            <Edit3 className="size-5 text-primary" /> 행동특성 글자수 가이드
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {[100, 200, 300, 500].map(limit => (
                                                                <button
                                                                    key={limit}
                                                                    onClick={() => setCharLimits(prev => ({ ...prev, behavior: limit }))}
                                                                    className={cn(
                                                                        "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-4",
                                                                        charLimits.behavior === limit ? "bg-primary border-primary text-white scale-105 shadow-xl shadow-primary/20" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200 hover:scale-105"
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
                                            <Card className="p-0 border-0 bg-white shadow-2xl shadow-slate-200/40 rounded-[3.5rem] overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                    <div className="p-10 border-r border-slate-100 space-y-8 bg-slate-50/30">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                                <Target className="size-5 text-indigo-500" /> 워크스페이스 설정
                                                            </div>
                                                            <input
                                                                type="file"
                                                                id="csv-upload-subject"
                                                                accept=".csv"
                                                                className="hidden"
                                                                onChange={handleFileUpload}
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => document.getElementById('csv-upload-subject')?.click()}
                                                                className="rounded-xl h-10 px-5 font-black bg-white text-slate-600 border-slate-200 gap-2 hover:bg-slate-50 transition-all shadow-sm text-[11px]"
                                                            >
                                                                양식 업로드 <Upload className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center h-24">
                                                            <span className="text-6xl font-black text-slate-900 tracking-tighter">{studentCount}</span>
                                                            <span className="text-xs font-bold text-slate-400 uppercase">Selected Students</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-10 space-y-8">
                                                        <div className="flex items-center gap-3 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                            <Edit3 className="size-5 text-indigo-500" /> 교과세특 글자수 가이드
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {[100, 200, 300, 500].map(limit => (
                                                                <button
                                                                    key={limit}
                                                                    onClick={() => setCharLimits(prev => ({ ...prev, subject: limit }))}
                                                                    className={cn(
                                                                        "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-4",
                                                                        charLimits.subject === limit ? "bg-indigo-500 border-indigo-500 text-white scale-105 shadow-xl shadow-indigo-200/40" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200 hover:scale-105"
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
                                            <Card className="p-0 border-0 bg-white shadow-2xl shadow-slate-200/40 rounded-[3.5rem] overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                    <div className="p-10 border-r border-slate-100 space-y-8 bg-slate-50/30">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                                <Target className="size-5 text-amber-500" /> 워크스페이스 설정
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
                                                                className="rounded-xl h-10 px-5 font-black bg-white text-slate-600 border-slate-200 gap-2 hover:bg-slate-50 transition-all shadow-sm text-[11px]"
                                                            >
                                                                양식 업로드 <Upload className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center h-24">
                                                            <span className="text-6xl font-black text-slate-900 tracking-tighter">{studentCount}</span>
                                                            <span className="text-xs font-bold text-slate-400 uppercase">Selected Students</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-10 space-y-8">
                                                        <div className="flex items-center gap-3 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                            <Edit3 className="size-5 text-amber-500" /> 창체활동 글자수 가이드
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {[100, 200, 300, 500].map(limit => (
                                                                <button
                                                                    key={limit}
                                                                    onClick={() => setCharLimits(prev => ({ ...prev, creative: limit }))}
                                                                    className={cn(
                                                                        "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all border-4",
                                                                        charLimits.creative === limit ? "bg-amber-500 border-amber-500 text-white scale-105 shadow-xl shadow-amber-200/40" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200 hover:scale-105"
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
                                                handleAutoGenerateEvents={handleAutoGenerateEvents}
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
                                                    "w-full p-6 h-28 rounded-[2.5rem] flex items-center gap-6 transition-all text-left border",
                                                    isActive ? "bg-white border-primary shadow-2xl shadow-primary/5 ring-1 ring-primary/20" : "bg-white border-transparent text-slate-600 hover:border-slate-200"
                                                )}
                                            >
                                                <div className={cn("size-14 rounded-3xl flex items-center justify-center shrink-0", isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-50")}>
                                                    <Icon className="size-7" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className={cn("font-black text-sm block mb-1", isActive ? "text-slate-900" : "text-slate-500")}>{f.title}</span>
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Feature</span>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {/* Chrome Extension Promo */}
                                    <div className="w-full p-6 rounded-[2.5rem] bg-slate-900 flex flex-col items-start gap-4 text-left border border-slate-800 shadow-2xl relative overflow-hidden group mt-4">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Zap className="size-24 text-white" />
                                        </div>
                                        <div className="relative z-10 w-full">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="flex size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                                <span className="text-sm font-black text-white">나이스에 붙여넣기</span>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-4">
                                                나이스에 바로 붙여넣고 싶으시면 <br />크롬 확장프로그램을 다운로드하세요.
                                            </p>
                                            <Button
                                                onClick={() => alert("추후 링크 삽입 예정")}
                                                className="w-full rounded-2xl h-10 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition-all"
                                            >
                                                다운로드하러가기
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>


            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                input[type='range']::-webkit-slider-thumb {
                    width: 24px; height: 24px; border: 4px solid white;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    appearance: none; background: #3b82f6; border-radius: 50%; cursor: pointer;
                }
            `}</style>
        </div>
    );
}
