"use client";

import React from "react";
import { Bell, Chrome, Database, ExternalLink, Layers, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const UPDATES = [
    {
        version: "v1.3.0",
        date: "2026.06.11",
        title: "크롬 확장프로그램 정식 출시",
        type: "Release",
        icon: Chrome,
        contents: [
            "Chrome 웹 스토어에서 ForTeacher AI NEIS Uploader 제공",
            "웹앱 계정 연결 후 저장된 행특·창체·교과 결과 불러오기",
            "나이스 입력 화면에서 현재 칸부터 학생별 문장 입력 지원"
        ],
        href: "https://chromewebstore.google.com/detail/forteacher-ai-neis-upload/kccpnhgkaombpfajdjgonenibmglpcmp?hl=ko",
        actionLabel: "Chrome 웹 스토어"
    },
    {
        version: "v1.2.0",
        date: "2026.06.10",
        title: "교과별 저장 지원",
        type: "Major",
        icon: Layers,
        contents: [
            "교과 작업을 과목별 저장본으로 분리",
            "저장된 교과 목록 선택, 불러오기, 삭제 지원",
            "확장프로그램에서도 저장된 교과를 선택해 불러오기"
        ]
    },
    {
        version: "v1.1.0",
        date: "2026.05.28",
        title: "계정 기반 작업 저장",
        type: "Major",
        icon: Database,
        contents: [
            "로그인 계정별 행특·창체·교과 작업 데이터 저장",
            "기기나 브라우저가 바뀌어도 저장 기록 조회 가능",
            "마이페이지에서 최근 작업 기록 확인"
        ]
    },
    {
        version: "v1.0.0",
        date: "2026.02",
        title: "For Teacher AI 정식 서비스 시작",
        type: "Release",
        icon: Rocket,
        contents: [
            "행동특성 및 종합의견, 교과, 창체 문장 생성 제공",
            "학생별 입력 데이터와 생성 결과를 한 화면에서 관리",
            "학교 생활기록부 작성 흐름에 맞춘 작업 환경 제공"
        ]
    },
    {
        version: "v0.9.0 (MVP)",
        date: "2026.01.23",
        title: "핵심 기능 구현 완료",
        type: "Major",
        icon: Sparkles,
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
        icon: ShieldCheck,
        contents: [
            "For Teacher AI 프로젝트 기획 및 설계",
            "교사 업무 경감을 위한 핵심 기능 정의",
            "프로토타입 개발 시작"
        ]
    }
];

const typeStyles: Record<string, string> = {
    Release: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    Major: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400",
    Notice: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
};

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
                            For Teacher AI의 새 기능과 출시 소식을 확인하세요.
                        </p>
                    </div>

                    {/* Timeline List */}
                    <div className="relative space-y-8 before:absolute before:inset-0 before:left-8 md:before:left-12 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:hidden md:before:block">
                        {UPDATES.map((update, idx) => (
                            <div key={update.version} className="relative flex flex-col md:flex-row gap-8 md:gap-12 items-start group">
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
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2 md:hidden">
                                                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">{update.date}</Badge>
                                                <span className="text-xs font-mono text-slate-300 dark:text-slate-600">|</span>
                                                <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{update.version}</span>
                                            </div>
                                            <div className="size-10 rounded-2xl bg-slate-50 dark:bg-slate-900 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mb-3">
                                                <update.icon className="size-5" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-foreground flex flex-wrap items-center gap-3 break-keep">
                                                {update.title}
                                                {idx === 0 && <Badge className="bg-red-500 hover:bg-red-600 text-[10px] border-0">NEW</Badge>}
                                            </h3>
                                        </div>
                                        <Badge variant="outline" className={`border-0 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider shrink-0 ${typeStyles[update.type]}`}>
                                            {update.type}
                                        </Badge>
                                    </div>

                                    <ul className="space-y-3 mb-6">
                                        {update.contents.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-slate-500 dark:text-muted-foreground font-medium text-sm">
                                                <div className="mt-1.5 size-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>

                                    {update.href && update.actionLabel && (
                                        <Button asChild variant="outline" className="rounded-xl h-11 px-4 font-bold gap-2">
                                            <a href={update.href} target="_blank" rel="noreferrer">
                                                {update.actionLabel}
                                                <ExternalLink className="size-4" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
