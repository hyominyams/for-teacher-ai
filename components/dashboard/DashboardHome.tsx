"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Chrome, FileText, History, Loader2, Sparkles, UserRoundCheck } from "lucide-react";
import { useAppSession } from "@/components/auth/use-app-session";
import styles from "@/components/dashboard/dashboard.module.css";

function CardArrow() {
    return <span className={styles.cardArrow} aria-hidden="true"><ArrowUpRight size={20} /></span>;
}

export default function DashboardHome() {
    const { ready, name } = useAppSession();
    if (!ready) return <main className={styles.loading} aria-label="로그인 확인 중"><Loader2 className="animate-spin" /><span>작업 공간을 준비하고 있어요.</span></main>;

    return (
        <main className={styles.dashboard}>
            <div className={styles.container}>
                <header className={styles.intro}>
                    <div>
                        <p className={styles.eyebrow}><span /> TEACHER’S WORKSPACE</p>
                        <h1>{name ? `${name} 선생님,` : "선생님,"}<br className={styles.mobileBreak} /> 오늘은 어떤 기록을 남길까요?</h1>
                        <p className={styles.introDescription}>형식을 다듬느라 본질을 놓치지 않도록</p>
                    </div>
                    <Link href="/resource/guide" className={styles.guideLink}><BookOpen size={16} /> 사용 가이드 <ArrowUpRight size={15} /></Link>
                </header>

                <section className={styles.grid} aria-label="작업 영역 선택">
                    <Link href="/app/workspace/behavior" className={`${styles.card} ${styles.behavior}`}>
                        <div className={styles.cardTop}><span className={styles.category}><UserRoundCheck size={15} /> 행특</span><CardArrow /></div>
                        <div className={styles.cardCopy}>
                            <p className={styles.kicker}>작은 관찰이, 한 학생의 이야기로.</p>
                            <h2>행동특성 및<br />종합의견<span className={styles.titleDot}>.</span></h2>
                            <p className={styles.description}>학생을 가장 잘 아는 선생님의 키워드로<br />한 명 한 명의 특별함을 기록하세요.</p>
                        </div>
                        <div className={styles.behaviorArt}><Image src="/dashboard/behavior.webp" alt="학생의 성장을 상징하는 파란 노트와 종이 잎사귀" fill sizes="(max-width: 700px) 95vw, 480px" priority /></div>
                        <div className={styles.cardBottom}><span>키워드로 기록 시작하기</span><ArrowRight size={18} /></div>
                    </Link>

                    <Link href="/app/workspace/subject" className={`${styles.card} ${styles.subject}`}>
                        <div className={styles.cardTop}><span className={styles.category}><BookOpen size={15} /> 교과</span><CardArrow /></div>
                        <div className={styles.cardCopy}><h2>학기말<br />종합의견<span className={styles.titleDot}>.</span></h2><p className={styles.description}>배움의 과정과 성취를<br />교과별 맞춤 문장으로.</p></div>
                        <div className={styles.subjectArt}><Image src="/dashboard/subject.webp" alt="교과별 배움을 표현한 인디고 색상의 책" fill sizes="(max-width: 700px) 80vw, 330px" /></div>
                        <div className={styles.smallBottom}>교과 기록하기 <ArrowRight size={17} /></div>
                    </Link>

                    <Link href="/app/workspace/creative" className={`${styles.card} ${styles.creative}`}>
                        <div className={styles.cardTop}><span className={styles.category}><Sparkles size={15} /> 창체</span><CardArrow /></div>
                        <div className={styles.cardCopy}><h2>창의적<br />체험활동<span className={styles.titleDot}>.</span></h2><p className={styles.description}>함께한 경험 속에서<br />학생의 가능성을 발견하세요.</p></div>
                        <div className={styles.creativeArt}><Image src="/dashboard/creative.webp" alt="다양한 체험활동을 상징하는 앰버 색상의 종이 별과 아치" fill sizes="(max-width: 700px) 80vw, 280px" /></div>
                        <div className={styles.smallBottom}>활동 기록하기 <ArrowRight size={17} /></div>
                    </Link>

                    <Link href="/app/logs" className={`${styles.card} ${styles.logs}`}>
                        <div className={styles.cardTop}><span className={styles.utilityIcon}><History size={22} /></span><CardArrow /></div>
                        <div className={styles.cardCopy}><p className={styles.utilityKicker}>이어서, 차근차근</p><h2>작업로그</h2><p className={styles.description}>저장한 기록을 확인하고<br />필요한 문장을 내보내세요.</p></div>
                        <div className={styles.smallBottom}>저장한 기록 보기 <ArrowRight size={17} /></div>
                    </Link>

                    <Link href="/app/extension" className={`${styles.card} ${styles.extension}`}>
                        <div className={styles.cardTop}><span className={styles.extensionLabel}><Chrome size={17} /> CHROME EXTENSION</span><CardArrow /></div>
                        <div className={styles.cardCopy}><h2>완성한 기록,<br />나이스까지 한 번에.</h2><p className={styles.description}>반복되는 붙여넣기는 확장 프로그램에 맡기세요.</p></div>
                        <span className={styles.extensionGraphic} aria-hidden="true"><FileText /><ArrowRight /><span>N</span></span>
                        <div className={styles.smallBottom}>확장 프로그램 설치 안내 <ArrowDownToLine size={17} /></div>
                    </Link>
                </section>

                <div className={styles.resources}>
                    <p><span className={styles.resourceMark} aria-hidden="true">✳</span> 기록에 쓰던 시간을, 학생 곁의 시간으로.</p>
                    <nav aria-label="더 많은 도구"><Link href="/app/workspace/docs"><FileText size={15} /> 문서 작성 <span className={styles.soon}>준비 중</span></Link><span className={styles.separator} /><Link href="/resource/faq">자주 묻는 질문 <ArrowUpRight size={14} /></Link></nav>
                </div>
            </div>
        </main>
    );
}
