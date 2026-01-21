import Link from "next/link"
import { Mail, Github, ExternalLink } from "lucide-react"

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="relative overflow-hidden border-t border-border bg-background py-12 md:py-16">
            {/* Huge Watermark Text */}
            <div className="absolute -bottom-10 -left-10 select-none pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
                <span className="text-[12rem] md:text-[20rem] font-black leading-none tracking-tighter whitespace-nowrap">
                    FOR TEACHER AI
                </span>
            </div>

            <div className="container relative z-10 mx-auto px-4 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

                    {/* Brand Section Simplified */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black tracking-tighter text-foreground uppercase leading-none">
                                FOR TEACHER <span className="text-primary italic">AI</span>
                            </h3>
                            <p className="text-[10px] text-primary font-black tracking-[0.3em] uppercase">
                                Smart Education Assistant
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                            우리는 교사들이 행정 업무의 부담에서 벗어나 학생들과의 수업에 더 집중할 수 있는 미래를 만듭니다.
                            인공지능 기술을 통해 교육의 질을 혁신합니다.
                        </p>

                        <div className="flex gap-4">
                            <div className="p-2.5 rounded-2xl bg-secondary/50 border border-border hover:border-primary/30 hover:bg-secondary transition-all cursor-pointer group">
                                <Github className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="p-2.5 rounded-2xl bg-secondary/50 border border-border hover:border-primary/30 hover:bg-secondary transition-all cursor-pointer group">
                                <ExternalLink className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Links Sections */}
                    <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Service</h4>
                            <nav className="flex flex-col gap-4">
                                <Link href="/app/behavior" className="text-sm text-muted-foreground hover:text-primary transition-colors">행동특성 기록</Link>
                                <Link href="/app/grade" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                                    교과 세특 <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">SOON</span>
                                </Link>
                                <Link href="/app/creative" className="text-sm text-muted-foreground hover:text-primary transition-colors">창의적 체험활동</Link>
                                <Link href="/app/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">업무 자동화</Link>
                            </nav>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Resource</h4>
                            <nav className="flex flex-col gap-4">
                                <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">가이드북</Link>
                                <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">자주 묻는 질문</Link>
                                <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">업데이트 소식</Link>
                                <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">커뮤니티</Link>
                            </nav>
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-6">
                            <h4 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Contact</h4>
                            <div className="space-y-6">
                                <a
                                    href="mailto:jhjhpark0800@gmail.com"
                                    className="group block space-y-3"
                                >
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">Email Support</p>
                                        <p className="text-sm text-foreground font-bold break-all group-hover:text-primary transition-colors underline underline-offset-4 decoration-primary/20">
                                            jhjhpark0800@gmail.com
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        피드백이나 제안은 언제나 환영합니다. <br />
                                        24시간 이내에 답변 드립니다.
                                    </p>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                        <p className="text-xs text-muted-foreground font-medium">
                            &copy; {currentYear} For Teacher AI. Built with ❤️ for educators.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">이용약관</Link>
                            <Link href="#" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-bold border-b border-muted-foreground/30">개인정보처리방침</Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">System: Operational</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent text-foreground font-bold">v1.2.0</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
