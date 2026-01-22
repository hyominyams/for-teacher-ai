"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    History,
    Download,
    Sparkles,
    ChevronRight,
    Calendar,
    Users,
    LayoutDashboard,
    Search,
    Filter,
    ArrowLeft,
    CheckCircle2,
    Eye,
    Brain,
    Activity,
    BookOpen,
    Edit3,
    FileText,
    ExternalLink,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Student {
    id: number;
    name: string;
    selectedKeywords: string[];
    aiResult: string;
}

interface WorkLog {
    id: string;
    category: string;
    data: {
        students: Student[];
        studentCount: number;
        charLimit: number;
    };
    updated_at: string;
}

const CATEGORIES = [
    { id: "behavior", name: "행동특성", icon: Activity, color: "blue" },
    { id: "subject", name: "교과세특", icon: BookOpen, color: "purple" },
    { id: "creative", name: "창체활동", icon: Brain, color: "emerald" },
    { id: "docs", name: "문서작성", icon: Edit3, color: "orange" }
];

export default function WorkLogPage() {
    const [logs, setLogs] = useState<WorkLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                router.push("/login");
            }
        };
        getSession();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('work_logs')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (data) {
                setLogs(data);
            }
            setLoading(false);
        };

        fetchLogs();
    }, [userId]);

    const handleExport = (log: WorkLog) => {
        try {
            if (!log.data || !log.data.students) {
                alert("기록된 데이터가 부적절합니다.");
                return;
            }

            const headers = ["번호", "키워드", "AI생성결과"];
            const rows = log.data.students.map(s => [
                s.id,
                `"${(s.selectedKeywords || []).join(", ")}"`,
                `"${(s.aiResult || "").replace(/\n/g, " ").replace(/"/g, '""')}"`
            ]);

            const csvString = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const categoryName = CATEGORIES.find(c => c.id === log.category)?.name || log.category;
            const dateStr = new Date(log.updated_at).toISOString().slice(0, 10);

            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${categoryName}_기록_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export Error:", error);
            alert("파일 생성 중 오류가 발생했습니다.");
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-24 px-6 md:px-12 lg:px-24">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <History className="size-5" />
                            </div>
                            <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Work History</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight">작업 로그 <span className="text-primary">기록</span></h1>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-2xl">
                            영역별로 저장된 마지막 작업 기록을 확인하고 <br className="hidden md:block" />
                            필요한 데이터를 빠르게 내보내세요.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-full md:w-[400px]">
                        <Search className="size-5 text-slate-400 ml-4" />
                        <input
                            type="text"
                            placeholder="영역 또는 날짜 검색..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-600 placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4].map(i => (
                            <Card key={i} className="h-80 rounded-[3rem] bg-white border-slate-50 animate-pulse shadow-sm" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <Card className="p-24 border-0 bg-white shadow-2xl shadow-slate-200/40 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-8">
                        <div className="size-32 rounded-[3.5rem] bg-slate-50 flex items-center justify-center relative group">
                            <Sparkles className="size-14 text-slate-200 animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-slate-900">아직 저장된 기록이 없습니다.</h3>
                            <p className="text-slate-400 font-medium text-lg">대시보드에서 생성을 시작하고 작업로그를 남겨보세요!</p>
                        </div>
                        <Button
                            onClick={() => router.push("/app")}
                            className="rounded-[2rem] bg-slate-900 text-white font-black h-16 px-12 text-lg hover:bg-slate-800 shadow-2xl shadow-slate-900/20"
                        >
                            대시보드로 이동하기
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {logs
                            .filter(log => {
                                const categoryName = CATEGORIES.find(c => c.id === log.category)?.name || "";
                                return categoryName.includes(searchQuery) || log.updated_at.includes(searchQuery);
                            })
                            .map((log) => {
                                const category = CATEGORIES.find(c => c.id === log.category) || CATEGORIES[0];
                                const hasData = log.data.students.some(s => s.aiResult);

                                return (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -8 }}
                                        className="h-full"
                                    >
                                        <Card className="h-full rounded-[3rem] border-0 bg-white p-8 shadow-xl shadow-slate-200/40 flex flex-col justify-between group cursor-pointer hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 relative overflow-hidden">
                                            {/* Category Indicator */}
                                            <div className={cn(
                                                "absolute top-0 left-0 w-2 h-full",
                                                category.color === "blue" ? "bg-blue-500" :
                                                    category.color === "purple" ? "bg-purple-500" :
                                                        category.color === "emerald" ? "bg-emerald-500" : "bg-orange-500"
                                            )} />

                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className={cn(
                                                        "size-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                                                        category.color === "blue" ? "bg-blue-50 text-blue-500" :
                                                            category.color === "purple" ? "bg-purple-50 text-purple-500" :
                                                                category.color === "emerald" ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-500"
                                                    )}>
                                                        <category.icon className="size-7" />
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Students</div>
                                                        <div className="text-2xl font-black text-slate-900 tracking-tighter">{log.data.studentCount}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{category.name}</h3>
                                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                        <Calendar className="size-3.5" />
                                                        {formatDate(log.updated_at)}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-500 border border-slate-100 italic">
                                                        {log.data.charLimit} chars limit
                                                    </div>
                                                    {hasData ? (
                                                        <div className="px-3 py-1.5 rounded-xl bg-green-50 text-[10px] font-black text-green-600 border border-green-100 flex items-center gap-1.5">
                                                            <CheckCircle2 className="size-3" /> Ready to Export
                                                        </div>
                                                    ) : (
                                                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-400 border border-slate-100">
                                                            No Result
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-8 grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedLog(log);
                                                    }}
                                                    className="rounded-2xl h-12 font-black text-xs border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all gap-2"
                                                >
                                                    <Eye className="size-4" /> 미리보기
                                                </Button>
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExport(log);
                                                    }}
                                                    disabled={!hasData}
                                                    className={cn(
                                                        "rounded-2xl h-12 font-black text-xs gap-2 transition-all shadow-lg",
                                                        category.color === "blue" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100" :
                                                            category.color === "purple" ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100" :
                                                                category.color === "emerald" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-orange-600 hover:bg-orange-700 shadow-orange-100"
                                                    )}
                                                >
                                                    <Download className="size-4" /> 내보내기
                                                </Button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedLog(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-6xl h-[85vh] bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "size-16 rounded-[1.8rem] flex items-center justify-center",
                                        CATEGORIES.find(c => c.id === selectedLog.category)?.color === "blue" ? "bg-blue-50 text-blue-500" :
                                            CATEGORIES.find(c => c.id === selectedLog.category)?.color === "purple" ? "bg-purple-50 text-purple-500" :
                                                CATEGORIES.find(c => c.id === selectedLog.category)?.color === "emerald" ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-500"
                                    )}>
                                        {React.createElement(CATEGORIES.find(c => c.id === selectedLog.category)?.icon || History, { className: "size-8" })}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                            {CATEGORIES.find(c => c.id === selectedLog.category)?.name} 기록
                                        </h2>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                                            {formatDate(selectedLog.updated_at)} • {selectedLog.data.studentCount} Students
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => handleExport(selectedLog)}
                                        className="rounded-2xl h-12 px-8 bg-slate-900 text-white font-black hover:bg-slate-800 gap-2 transition-all"
                                    >
                                        Excel로 전체 내보내기 <Download className="size-4" />
                                    </Button>
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <X className="size-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-8 bg-slate-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedLog.data.students.map((student) => (
                                        <Card key={student.id} className="p-8 border-0 bg-white shadow-xl shadow-slate-200/30 rounded-[2.5rem] flex flex-col gap-6 relative group/card overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <div className="text-2xl font-black text-slate-400 tracking-tighter">#{student.id}</div>
                                                <div className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">{student.name}</div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {student.selectedKeywords.map((k, idx) => (
                                                        <span key={idx} className="px-3 py-1 bg-slate-50 text-[10px] font-black text-slate-500 rounded-lg border border-slate-100">
                                                            {k}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="p-6 bg-slate-50 rounded-2xl text-[12px] font-medium leading-[1.8] text-slate-600 italic border border-slate-100/50">
                                                    {student.aiResult || "생성된 결과가 없습니다."}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-white border-t border-slate-100 flex justify-center">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="text-slate-400 font-black text-sm hover:text-slate-600 transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft className="size-4" /> 기록 목록으로 돌아가기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </main>
    );
}

