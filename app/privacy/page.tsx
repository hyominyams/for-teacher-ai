import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowLeft,
    Chrome,
    Database,
    FileText,
    KeyRound,
    Mail,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
    title: "개인정보처리방침 | For Teacher AI",
    description: "For Teacher AI 개인정보 처리 기준과 보호 조치를 안내합니다.",
};

const effectiveDate = "2026년 6월 9일";

const summaryItems = [
    {
        icon: KeyRound,
        title: "계정 정보 최소 처리",
        description: "로그인과 서비스 제공에 필요한 이메일, 이름, 소속 학교 등 최소한의 계정 정보를 처리합니다.",
    },
    {
        icon: FileText,
        title: "학생 실명 입력 지양",
        description: "서비스는 학생 번호 중심 사용을 전제로 하며, 학생 이름 등 직접 식별 가능한 정보 입력을 권장하지 않습니다.",
    },
    {
        icon: Sparkles,
        title: "웹앱 AI 생성 처리",
        description: "문장 생성을 요청할 때 입력한 키워드와 평가 정보가 OpenAI API로 전송될 수 있습니다.",
    },
    {
        icon: Chrome,
        title: "확장 프로그램 별도 처리",
        description: "크롬 확장은 웹앱 저장 데이터 또는 CSV를 불러와 나이스 입력을 보조하며, 로컬 저장소를 사용합니다.",
    },
];

const sections = [
    {
        title: "1. 웹사이트/웹앱에서 처리하는 개인정보 항목",
        body: [
            "For Teacher AI는 서비스 제공에 필요한 최소한의 정보를 처리합니다.",
            "구글 로그인 이용 시: Supabase Auth 및 Google OAuth를 통해 제공되는 식별자, 이메일, 이름 또는 프로필 정보가 처리될 수 있습니다.",
            "이메일 회원가입 이용 시: 이름, 소속 학교, 이메일 주소, 비밀번호 인증 정보가 처리됩니다. 비밀번호는 Supabase Auth를 통해 관리되며 서비스 화면에 평문으로 저장하지 않습니다.",
            "작업 저장 기능 이용 시: 학생 수, 학생 번호, 선택한 키워드, 창체 활동 입력, 교과 평가 입력, 특이사항, AI 생성 결과 등 사용자가 저장한 작업 데이터가 계정별 작업 기록으로 저장될 수 있습니다.",
        ],
    },
    {
        title: "2. 웹사이트/웹앱의 개인정보 처리 목적",
        body: [
            "회원 식별, 로그인 상태 유지, 계정별 작업 공간 제공",
            "생활기록부 문장 생성, 저장 기록 조회, 확장 프로그램 연동 등 서비스 기능 제공",
            "오류 대응, 문의 처리, 서비스 안정성 확보",
        ],
    },
    {
        title: "3. 크롬 확장 프로그램에서 처리하는 정보",
        body: [
            "ForTeacher AI NEIS Uploader 확장 프로그램은 웹사이트/웹앱과 구분되는 별도 실행 환경에서 동작합니다.",
            "확장 프로그램은 웹앱 계정 연결을 위해 Supabase 로그인 세션의 access token, refresh token, 만료 시각, 사용자 이메일 일부를 chrome.storage.local에 저장할 수 있습니다.",
            "확장 프로그램은 웹앱 저장 데이터 또는 사용자가 직접 제공한 CSV/클립보드 데이터를 chrome.storage.local에 저장할 수 있습니다. 저장되는 항목에는 학생 번호, 표시 이름, 생성 결과 문장이 포함될 수 있습니다.",
            "확장 프로그램은 사용자가 버튼을 눌러 실행할 때 활성 탭의 나이스 입력칸을 찾고, 불러온 문장을 해당 입력칸에 채워 넣습니다.",
            "확장 프로그램은 사용자가 클립보드 CSV 불러오기를 누른 경우에만 클립보드를 읽습니다.",
            "확장 프로그램은 불러온 데이터를 자체적으로 외부 서버에 새로 업로드하지 않으며, 웹앱 저장 데이터 조회 시 For Teacher AI 웹앱 API에 인증 토큰을 전달합니다.",
        ],
    },
    {
        title: "4. 크롬 확장 프로그램 권한 사용",
        body: [
            "activeTab, scripting 권한: 사용자의 명시적인 버튼 클릭 이후 현재 활성화된 나이스 화면에서 입력 보조 스크립트를 실행하기 위해 사용합니다.",
            "tabs 권한: 웹앱 브리지 탭을 찾거나 현재 활성 탭을 확인하기 위해 사용합니다.",
            "storage 권한: 계정 연결 상태, 웹앱에서 불러온 작업 데이터, CSV로 불러온 입력 데이터를 브라우저 로컬 저장소에 보관하기 위해 사용합니다.",
            "clipboardRead 권한: 사용자가 직접 클립보드 CSV 불러오기를 실행할 때만 클립보드 내용을 읽기 위해 사용합니다.",
            "host permissions: For Teacher AI 웹앱 브리지와 저장 데이터 API에 접근하기 위해 https://for-teacher-ai.vercel.app/* 범위로만 제한해 사용합니다.",
        ],
    },
    {
        title: "5. 학생 정보 처리 원칙",
        body: [
            "서비스는 학생 실명 대신 번호와 특성 키워드를 사용하는 흐름을 기본으로 설계되어 있습니다.",
            "AI 생성 API에는 학생 이름이나 번호를 결과 문장에 언급하지 않도록 지시하고 있습니다.",
            "다만 사용자가 특이사항, 키워드, 직접 편집한 결과 등에 학생 이름이나 민감한 내용을 직접 입력하면 해당 내용이 작업 저장 데이터 또는 AI 생성 요청에 포함될 수 있습니다. 따라서 학생 실명, 주민등록번호, 연락처, 민감정보 등은 입력하지 않는 것을 권장합니다.",
        ],
    },
    {
        title: "6. AI 생성 기능 및 제3자 처리",
        body: [
            "For Teacher AI는 문장 생성을 위해 OpenAI API를 사용합니다. 사용자가 생성 버튼을 누르면 키워드, 활동 정보, 교과 평가 정보, 특이사항 등 생성에 필요한 입력값이 OpenAI로 전송될 수 있습니다.",
            "OpenAI는 API Platform의 입력과 출력을 기본적으로 모델 학습 또는 개선에 사용하지 않는다고 안내하고 있으며, 남용 모니터링 등을 위해 API 데이터가 일정 기간 보관될 수 있습니다.",
            "For Teacher AI는 OpenAI로 전송되는 입력값을 줄이기 위해 학생 실명 대신 번호와 비식별적 설명을 사용하는 것을 권장합니다.",
        ],
    },
    {
        title: "7. 개인정보 보유 및 이용 기간",
        body: [
            "계정 정보는 회원 탈퇴 또는 삭제 요청 시까지 보관합니다.",
            "작업 기록은 사용자가 서비스에서 저장하거나 자동 저장한 최신 작업 데이터를 제공하기 위해 보관하며, 사용자가 초기화하거나 삭제를 요청하면 지체 없이 처리합니다.",
            "확장 프로그램의 로컬 저장 데이터는 사용자가 확장 프로그램에서 초기화하거나 브라우저 확장 저장소를 삭제할 때까지 브라우저에 남을 수 있습니다.",
            "법령상 보관 의무가 있는 경우에는 해당 법령에서 정한 기간 동안 보관할 수 있습니다.",
        ],
    },
    {
        title: "8. 개인정보의 제3자 제공 및 처리 위탁",
        body: [
            "For Teacher AI는 이용자의 개인정보를 임의로 판매하거나 광고 목적으로 제공하지 않습니다.",
            "서비스 운영을 위해 Supabase를 인증, 데이터베이스, 계정 관리 인프라로 사용합니다.",
            "AI 문장 생성을 위해 OpenAI API를 사용합니다.",
            "구글 로그인을 선택한 경우 Google OAuth 인증 절차가 사용됩니다.",
        ],
    },
    {
        title: "9. 개인정보 파기",
        body: [
            "보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 복구하기 어려운 방법으로 삭제합니다.",
            "데이터베이스에 저장된 계정 및 작업 기록은 삭제 요청 처리 후 서비스 운영상 필요한 절차에 따라 삭제됩니다.",
            "확장 프로그램에 저장된 로컬 데이터는 확장 프로그램의 데이터 초기화 기능, 확장 프로그램 삭제, 또는 브라우저 저장소 삭제를 통해 제거할 수 있습니다.",
        ],
    },
    {
        title: "10. 안전성 확보 조치",
        body: [
            "로그인한 사용자 본인 데이터만 접근하도록 Supabase Row Level Security 정책을 적용합니다.",
            "서비스 통신은 배포 환경에서 HTTPS 기반으로 제공됩니다.",
            "API 키와 인증 토큰은 클라이언트에 불필요하게 노출하지 않도록 서버 환경변수와 인증 세션을 통해 관리합니다.",
            "확장 프로그램은 불러온 작업 데이터를 브라우저 로컬 저장소에 저장하므로, 공용 PC 또는 공유 브라우저에서는 사용 후 연결 해제 및 데이터 초기화를 권장합니다.",
        ],
    },
    {
        title: "11. 이용자의 권리",
        body: [
            "이용자는 본인의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
            "계정 또는 저장 기록 삭제가 필요한 경우 아래 문의 이메일로 요청할 수 있습니다.",
        ],
    },
    {
        title: "12. 문의 및 개인정보 보호 담당",
        body: [
            "개인정보 처리와 관련한 문의, 삭제 요청, 고충 처리는 이메일로 접수합니다.",
            "담당 이메일: jhjhpark0800@gmail.com",
        ],
    },
    {
        title: "13. 처리방침 변경",
        body: [
            "본 개인정보처리방침은 서비스 구조, 관련 법령, 외부 처리업체 변경 등에 따라 수정될 수 있습니다.",
            `시행일: ${effectiveDate}`,
        ],
    },
];

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background">
            <section className="border-b border-border bg-secondary/20">
                <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
                    <Link
                        href="/login"
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        로그인으로 돌아가기
                    </Link>

                    <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
                            <ShieldCheck className="size-3.5" />
                            Privacy Policy
                        </div>
                        <h1 className="break-keep text-4xl font-black tracking-tight text-foreground md:text-6xl">
                            개인정보처리방침
                        </h1>
                        <p className="max-w-3xl break-keep text-base leading-8 text-muted-foreground md:text-lg">
                            For Teacher AI는 교사의 생활기록부 작성 보조를 위해 필요한 최소한의 정보를 처리합니다.
                            이 방침은 웹사이트/웹앱과 크롬 확장 프로그램의 개인정보 처리 범위를 구분해 안내합니다.
                        </p>
                        <p className="text-sm font-medium text-muted-foreground">
                            시행일: {effectiveDate}
                        </p>
                    </div>
                </div>
            </section>

            <section className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
                <div className="grid gap-4 md:grid-cols-2">
                    {summaryItems.map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg border border-border bg-background p-5 shadow-sm"
                        >
                            <item.icon className="mb-4 size-5 text-primary" />
                            <h2 className="mb-2 break-keep text-base font-black text-foreground">
                                {item.title}
                            </h2>
                            <p className="break-keep text-sm leading-6 text-muted-foreground">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <div className="flex items-start gap-3">
                        <Database className="mt-1 size-5 shrink-0" />
                        <p className="break-keep text-sm leading-7">
                            현재 코드 기준으로 For Teacher AI는 구글 로그인만 사용하는 서비스는 아닙니다.
                            이메일 회원가입을 선택하면 이름, 소속 학교, 이메일이 처리되며, 저장 기능을 사용하면 작업 데이터가 계정별로 저장됩니다.
                            크롬 확장 프로그램은 웹앱과 별도로 브라우저 로컬 저장소에 연결 세션과 불러온 입력 데이터를 저장할 수 있습니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container mx-auto max-w-5xl px-4 pb-16 md:pb-24">
                <div className="space-y-5">
                    {sections.map((section) => (
                        <article
                            key={section.title}
                            className="rounded-lg border border-border bg-background p-6 shadow-sm md:p-8"
                        >
                            <h2 className="mb-4 break-keep text-xl font-black tracking-tight text-foreground">
                                {section.title}
                            </h2>
                            <div className="space-y-3">
                                {section.body.map((paragraph) => (
                                    <p
                                        key={paragraph}
                                        className="break-keep text-sm leading-7 text-muted-foreground md:text-base"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-secondary/30 p-6 md:flex-row md:items-center">
                    <div>
                        <p className="text-sm font-black text-foreground">문의가 필요하신가요?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            개인정보 열람, 정정, 삭제 요청은 이메일로 보내주세요.
                        </p>
                    </div>
                    <a
                        href="mailto:jhjhpark0800@gmail.com"
                        className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90"
                    >
                        <Mail className="size-4" />
                        문의하기
                    </a>
                </div>
            </section>
        </main>
    );
}
