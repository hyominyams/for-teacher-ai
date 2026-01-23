"use client";

import React from "react";
import { Bell, Zap, Calendar, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const UPDATES = [
    {
        version: "v1.0.0",
        date: "2026.02 (예정)",
        title: "정식 서비스 배포 예정",
        type: "Upcoming",
        contents: [
            "For Teacher AI 정식 버전 릴리즈",
            "초기 사용자 피드백 수렴 및 안정화",
            "추가 기능(문서 작성 등) 고도화"
        ]
    },
    {
        version: "v0.9.0 (MVP)",
        date: "2026.01.23",
        title: "핵심 기능 구현 완료",
        type: "Major",
        contents: [
            "행동특성 및 종합의견 AI 생성 기능 구현",
            "학기말 종합의견(교과) 평가 데이터 연동",
            "창의적 체험활동(자율/동아리/진로) 통합 관리 시스템 구축"
        ]
    },
    {
        version: "v0.1.0",
        date: "2026.01.21",
        title: "프로젝트 개발 착수",
        type: "Notice",
        contents: [
            "For Teacher AI 프로젝트 기획 및 설계",
            "교사 업무 경감을 위한 핵심 기능 정의",
            "프로토타입 개발 시작"
        ]
    }
];

export default function UpdatesPage() {
    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">
            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6 max-w-4xl space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <Bell className="size-3" /> News & Updates
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-foreground tracking-tight">
                            업데이트 <span className="text-emerald-500 dark:text-emerald-400">소식</span>
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-muted-foreground font-medium max-w-2xl mx-auto">
                            더 나은 서비스를 위한 For Teacher AI의 발자취입니다.
                        </p>
                    </div>

                    {/* Timeline List */}
                    <div className="relative space-y-8 before:absolute before:inset-0 before:left-8 md:before:left-12 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:hidden md:before:block">
                        {UPDATES.map((update, idx) => (
                            <div key={idx} className="relative flex flex-col md:flex-row gap-8 md:gap-12 items-start group">
                                {/* Timeline Dot & Date */}
                                <div className="hidden md:flex flex-col items-end w-48 shrink-0 space-y-2 pt-2 relative z-10">
                                    <div className="text-sm font-bold text-slate-400 dark:text-slate-500 font-mono tracking-tight">{update.date}</div>
                                    <Badge variant="outline" className="border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 font-mono text-[10px]">
                                        {update.version}
                                    </Badge>

                                    {/* Timeline Dot */}
                                    <div className="absolute right-[-29px] top-3 size-3 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-500 group-hover:scale-125 transition-all shadow-sm" />
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 bg-white dark:bg-card rounded-[2rem] p-8 border border-slate-100 dark:border-border shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:border-emerald-100 dark:hover:border-emerald-900/50 hover:shadow-emerald-100/30 dark:hover:shadow-emerald-900/10 transition-all w-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3 mb-2 md:hidden">
                                                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">{update.date}</Badge>
                                                <span className="text-xs font-mono text-slate-300 dark:text-slate-600">|</span>
                                                <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{update.version}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-foreground flex items-center gap-3">
                                                {update.title}
                                                {idx === 0 && <Badge className="bg-red-500 hover:bg-red-600 text-[10px] border-0">NEW</Badge>}
                                            </h3>
                                        </div>
                                        <Badge variant="outline" className={`
                                            border-0 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider
                                            ${update.type === 'Major' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' :
                                                update.type === 'Notice' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}
                                        `}>
                                            {update.type}
                                        </Badge>
                                    </div>

                                    <ul className="space-y-3">
                                        {update.contents.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-slate-500 dark:text-muted-foreground font-medium text-sm">
                                                <div className="mt-1.5 size-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
