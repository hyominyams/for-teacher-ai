import Link from "next/link";
import Image from "next/image";
import { LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
    return (
        <section className="relative py-40 flex flex-col items-center text-center space-y-12 overflow-hidden w-full">
            {/* Background Image Area - Full Wide with Blur */}
            <div className="absolute inset-0 w-full h-full -z-10 bg-gray-50/10">
                <Image
                    src="/korean_teacher_at_computer_v2_1769013704052.png"
                    alt="Background"
                    fill
                    className="object-cover blur-[80px] opacity-20 scale-110 saturate-150"
                />
                <div className="absolute inset-0 bg-white/60" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto space-y-8 px-6">
                {/* Reference Style: Badge */}
                <div className="px-5 py-2 bg-foreground text-background rounded-full text-xs font-black tracking-widest uppercase">
                    Get started
                </div>

                <div className="space-y-6">
                    <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-[1.1] text-foreground text-balance">
                        더 나은 교육 환경,<br className="hidden md:block" />
                        지금 바로 경험해보세요.
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
                        복잡한 업무와 기록은 인공지능에 맡기고,<br className="hidden md:block" />
                        선생님은 오직 아이들의 성장에만 집중하는 시간을 마주하세요.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button asChild variant="outline" size="lg" className="h-16 rounded-[1.25rem] px-10 text-base font-bold bg-white/80 hover:bg-white transition-all gap-3 border-border shadow-sm">
                        <Link href="/login" className="flex items-center gap-3">
                            로그인 <LogIn className="size-4 opacity-70" />
                        </Link>
                    </Button>
                    <Button asChild size="lg" className="h-16 rounded-[1.25rem] px-10 text-base font-bold bg-foreground text-background hover:opacity-90 transition-all gap-3 shadow-xl">
                        <Link href="/signup">
                            무료로 시작하기 <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
