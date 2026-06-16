import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
    BookOpen,
    CheckCircle2,
    Download,
    FileDown,
    History,
    KeyRound,
    LayoutDashboard,
    ListChecks,
    Sparkles,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const sections = [
    {
        id: "login",
        title: "로그인",
        icon: KeyRound,
        image: "/manual-assets/00-login.png",
        steps: [
            "로그인 화면에서 Google 로그인, 체험 계정, 이메일 로그인을 선택합니다.",
            "체험 계정으로 바로 들어가면 대시보드를 먼저 확인할 수 있습니다.",
            "공용 기기에서는 사용 후 로그아웃합니다.",
        ],
    },
    {
        id: "behavior",
        title: "행동특성 및 종합의견",
        icon: Users,
        image: "/manual-assets/06-behavior-workspace.png",
        steps: [
            "학생 수를 맞춘 뒤 학생별 키워드를 최소 2개 선택합니다.",
            "생성 버튼으로 문장을 만들고, 펼쳐서 편집에서 문장을 직접 다듬습니다.",
            "내보내기로 현재 화면 데이터를 CSV로 저장합니다.",
        ],
    },
    {
        id: "subject",
        title: "학기말 종합의견(교과)",
        icon: BookOpen,
        image: "/manual-assets/05-subject-workspace.png",
        steps: [
            "교과명을 선택하거나 새 교과를 추가합니다.",
            "학교급, 학년, 평가 영역, 성취기준, 평가기준을 입력합니다.",
            "학생별 개별 입력 탭에서 성취수준과 특이사항을 넣고 문장을 생성합니다.",
        ],
    },
    {
        id: "creative",
        title: "창의적 체험활동",
        icon: Sparkles,
        image: "/manual-assets/02-creative-detail.png",
        steps: [
            "창의적 체험활동 탭에서 학생별 참여 행사를 선택합니다.",
            "행사 자동배정과 행사 일괄추가로 여러 학생에게 빠르게 적용합니다.",
            "임원 여부와 임원 기간이 필요한 학생만 추가로 입력합니다.",
        ],
    },
    {
        id: "logs",
        title: "작업 로그와 CSV",
        icon: History,
        image: "/manual-assets/03-work-logs.png",
        steps: [
            "작업로그에서 영역별 저장본과 최근 수정 시간을 확인합니다.",
            "Ready to Export 상태의 내보내기 버튼으로 CSV를 다운로드합니다.",
            "미리보기에서 학생별 결과 문장을 확인하고 Excel로 전체 내보내기를 실행합니다.",
        ],
    },
];

const quickStart = [
    { title: "1. 로그인", text: "체험 계정 또는 본인 계정으로 대시보드에 들어갑니다." },
    { title: "2. 영역 선택", text: "행동특성, 교과, 창체 중 작성할 영역을 선택합니다." },
    { title: "3. 학생별 입력", text: "키워드, 평가, 행사, 특이사항을 학생별로 입력합니다." },
    { title: "4. 생성과 편집", text: "문장을 생성한 뒤 필요한 표현을 바로 수정합니다." },
    { title: "5. 기록 확인", text: "작업로그에서 저장본을 확인하고 CSV로 내려받습니다." },
];

export default function GuidebookPage() {
    return (
        <div className="min-h-screen bg-[#F7F9FC] text-slate-950">
            <main className="pt-32 pb-24">
                <div className="mx-auto max-w-6xl px-6 md:px-10 space-y-16">
                    <header className="space-y-8">
                        <Badge variant="outline" className="w-fit rounded-full border-blue-200 bg-white px-4 py-2 text-blue-700">
                            사용자 매뉴얼
                        </Badge>
                        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
                            <div className="space-y-5">
                                <h1 className="break-keep text-4xl md:text-5xl font-black tracking-tight text-slate-950">
                                    <span className="block">For Teacher AI</span>
                                    <span className="block">사용 가이드</span>
                                </h1>
                                <p className="max-w-3xl text-lg font-medium leading-8 text-slate-600 [word-break:keep-all]">
                                    로그인부터 생활기록부 문장 작성, 작업 로그 확인, CSV 다운로드까지 한 번에 확인하세요.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <LayoutDashboard className="size-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-slate-950">대시보드 기준</div>
                                        <div className="text-xs font-bold text-slate-500">체험 계정 화면으로 확인</div>
                                    </div>
                                </div>
                                <Button asChild className="mt-5 h-12 w-full rounded-xl font-black">
                                    <Link href="/login">로그인 화면 열기</Link>
                                </Button>
                            </div>
                        </div>
                    </header>

                    <section className="grid gap-4 md:grid-cols-5">
                        {quickStart.map((item) => (
                            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="text-sm font-black text-blue-600">{item.title}</div>
                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 [word-break:keep-all]">{item.text}</p>
                            </div>
                        ))}
                    </section>

                    <section className="space-y-12">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            return (
                                <article key={section.id} id={section.id} className="scroll-mt-28 space-y-6">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                                                <Icon className="size-6" />
                                            </div>
                                            <div>
                                                <h2 className="break-keep text-2xl md:text-3xl font-black tracking-tight">{section.title}</h2>
                                                <p className="mt-1 text-sm font-bold text-slate-500 [word-break:keep-all]">주요 버튼과 입력 위치를 화면에서 확인하세요.</p>
                                            </div>
                                        </div>
                                        {section.id === "logs" ? (
                                            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                                                <FileDown className="size-4" />
                                                CSV 다운로드 확인
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <Image
                                            src={section.image}
                                            alt={`${section.title} 화면`}
                                            width={1440}
                                            height={900}
                                            className="h-auto w-full"
                                            sizes="(max-width: 768px) 100vw, 1100px"
                                        />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        {section.steps.map((step) => (
                                            <div key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-blue-600" />
                                                <p className="text-sm font-semibold leading-6 text-slate-600 [word-break:keep-all]">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-black text-blue-600">
                                    <ListChecks className="size-4" />
                                    다운로드 파일
                                </div>
                                <h2 className="text-2xl font-black tracking-tight [word-break:keep-all]">CSV는 다운로드 폴더에 저장됩니다.</h2>
                                <p className="text-sm font-semibold leading-6 text-slate-600 [word-break:keep-all]">
                                    파일명에는 영역명과 날짜가 들어갑니다. 예: 행동특성_기록_2026-06-11.csv
                                </p>
                            </div>
                            <Button asChild variant="outline" className="h-12 rounded-xl px-6 font-black">
                                <a href="/manual-assets/03-work-logs.png" download>
                                    <Download className="mr-2 size-4" />
                                    기록 화면 저장
                                </a>
                            </Button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
