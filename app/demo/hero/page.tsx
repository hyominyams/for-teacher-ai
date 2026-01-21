'use client';

import { useState, useEffect } from 'react';
import ScrollExpandMedia from '@/components/blocks/scroll-expansion-hero';
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturesGrid } from "@/components/blocks/features-grid";

const HeroDemoPage = () => {
    const [mediaType, setMediaType] = useState<'video' | 'image'>('video');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [mediaType]);

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            {/* Demo Controls */}
            <div className='fixed top-28 right-8 z-50 flex gap-2 p-1.5 bg-background/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl'>
                <button
                    onClick={() => setMediaType('video')}
                    className={`px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${mediaType === 'video'
                        ? 'bg-primary text-primary-foreground shadow-xl'
                        : 'hover:bg-white/5 text-muted-foreground'
                        }`}
                >
                    Check Video
                </button>
                <button
                    onClick={() => setMediaType('image')}
                    className={`px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${mediaType === 'image'
                        ? 'bg-primary text-primary-foreground shadow-xl'
                        : 'hover:bg-white/5 text-muted-foreground'
                        }`}
                >
                    Check Image
                </button>
            </div>

            <ScrollExpandMedia
                mediaType='image'
                mediaSrc="/A_calm_premium_202601220053.gif"
                bgImageSrc="/background.jpeg"
                titleLeft="혁신적인"
                titleRight="교육의 시작"
                date="For Teacher AI"
                scrollToExpand="Scroll to Experience"
                textBlend
            >
                <div className="space-y-32 py-20">
                    <section className="max-w-4xl space-y-12">
                        <h3 className="text-sm font-black text-primary tracking-[0.4em] uppercase flex items-center gap-3">
                            <span className="w-8 h-px bg-primary" /> Philosophy
                        </h3>
                        <h2 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tight text-foreground">
                            기록의 가치를 더하고 <br />
                            시간의 무게를 덜다.
                        </h2>
                        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium">
                            선생님은 전문적인 시선으로 아이들의 성장을 담고,<br />
                            복잡한 정제 과정은 AI가 대신합니다.
                        </p>
                    </section>

                    <FeaturesGrid />

                    <section className="py-32 flex flex-col items-center text-center space-y-12">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                            이제, 더 나은 <br />
                            교육 환경을 마주하세요.
                        </h2>
                        <div className="flex gap-6">
                            <Button size="lg" className="h-16 rounded-full px-12 text-lg font-bold shadow-2xl hover:scale-105 transition-all">
                                데모 체험하기
                            </Button>
                        </div>
                    </section>
                </div>
            </ScrollExpandMedia>
        </div>
    );
};

export default HeroDemoPage;
