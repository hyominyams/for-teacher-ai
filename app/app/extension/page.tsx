"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Chrome, Download, FileText, Link2, Loader2, MousePointer2 } from "lucide-react";
import { useAppSession } from "@/components/auth/use-app-session";
import styles from "@/components/dashboard/extension.module.css";

const webStoreUrl = "https://chromewebstore.google.com/detail/forteacher-ai-neis-upload/kccpnhgkaombpfajdjgonenibmglpcmp?hl=ko";
const steps = [
    { icon: Chrome, title: "Chrome에 설치", description: "Chrome 웹 스토어에서 확장 프로그램을 설치하고, 브라우저 도구 모음에 고정하세요." },
    { icon: Link2, title: "기록 불러오기", description: "확장 프로그램에서 ‘웹앱 계정 연결’ 후 작업로그를 선택하세요. 내 CSV·XLSX 파일도 불러올 수 있어요." },
    { icon: MousePointer2, title: "나이스에 입력", description: "해당 영역의 나이스 입력 화면에서 첫 학생 입력칸을 선택하고, 패널의 ‘시작’을 누르세요. 결과 확인 후 나이스에서 직접 저장하세요." },
];

export default function ExtensionPage() {
    const { ready } = useAppSession();
    if (!ready) return <main className={styles.loading} aria-label="로그인 확인 중"><Loader2 className="animate-spin" /></main>;
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Link href="/app" className={styles.back}><ArrowLeft size={16} /> 메인으로</Link>
                <header className={styles.hero}>
                    <div className={styles.copy}>
                        <p className={styles.eyebrow}><Chrome size={17} /> FOR TEACHER AI · CHROME EXTENSION</p>
                        <h1>기록은 완성했으니까,<br />이제 나이스로.</h1>
                        <p className={styles.description}>행동특성, 학기말 종합의견, 창체 기록을<br />학생 번호에 맞춰 나이스 입력칸에 붙여넣으세요.</p>
                        <a href={webStoreUrl} target="_blank" rel="noreferrer" className={styles.install}><Download size={18} /> Chrome 웹 스토어에서 설치 <ArrowUpRight size={17} /></a>
                        <p className={styles.caption}>설치 버튼을 누르면 Chrome 웹 스토어가 새 탭으로 열립니다.</p>
                    </div>
                    <div className={styles.transfer} aria-hidden="true"><div><FileText /><span>선생님의 기록</span></div><span className={styles.transferArrow}>→</span><div><b>N</b><span>나이스</span></div></div>
                </header>
                <section className={styles.steps} aria-label="확장 프로그램 사용 방법">
                    {steps.map(({ icon: Icon, title, description }, index) => <article key={title}><span className={styles.stepNumber}>STEP 0{index + 1}</span><Icon size={25} /><h2>{title}</h2><p>{description}</p></article>)}
                </section>
                <aside className={styles.help}><div><h2>저장한 기록부터 확인할까요?</h2><p>작업로그에서 작성 결과를 확인하고 CSV로 내보낼 수 있어요.</p></div><Link href="/app/logs">작업로그 열기 <ArrowUpRight size={16} /></Link></aside>
            </div>
        </main>
    );
}
