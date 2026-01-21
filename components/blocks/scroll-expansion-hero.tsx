'use client';

import {
    useEffect,
    useRef,
    useState,
    ReactNode,
    TouchEvent,
    WheelEvent,
} from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollExpandMediaProps {
    mediaType?: 'video' | 'image';
    mediaSrc: string;
    posterSrc?: string;
    bgImageSrc: string;
    titleLeft?: string;
    titleRight?: string;
    date?: string;
    scrollToExpand?: string;
    textBlend?: boolean;
    children?: ReactNode;
}

const ScrollExpandMedia = ({
    mediaType = 'video',
    mediaSrc,
    posterSrc,
    bgImageSrc,
    titleLeft,
    titleRight,
    date,
    scrollToExpand,
    textBlend,
    children,
}: ScrollExpandMediaProps) => {
    const [scrollProgress, setScrollProgress] = useState<number>(0);
    const [showContent, setShowContent] = useState<boolean>(false);
    const [mediaFullyExpanded, setMediaFullyExpanded] = useState<boolean>(false);
    const [touchStartY, setTouchStartY] = useState<number>(0);
    const [isMobileState, setIsMobileState] = useState<boolean>(false);

    const sectionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setScrollProgress(0);
        setShowContent(false);
        setMediaFullyExpanded(false);
    }, [mediaType]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
                setMediaFullyExpanded(false);
                e.preventDefault();
            } else if (!mediaFullyExpanded) {
                e.preventDefault();
                const scrollDelta = e.deltaY * 0.0008;
                const newProgress = Math.min(
                    Math.max(scrollProgress + scrollDelta, 0),
                    1
                );
                setScrollProgress(newProgress);

                if (newProgress >= 1) {
                    setMediaFullyExpanded(true);
                    setShowContent(true);
                } else if (newProgress < 0.7) {
                    setShowContent(false);
                }
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            setTouchStartY(e.touches[0].clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStartY) return;

            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;

            if (mediaFullyExpanded && deltaY < -20 && window.scrollY <= 5) {
                setMediaFullyExpanded(false);
                e.preventDefault();
            } else if (!mediaFullyExpanded) {
                e.preventDefault();
                const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
                const scrollDelta = deltaY * scrollFactor;
                const newProgress = Math.min(
                    Math.max(scrollProgress + scrollDelta, 0),
                    1
                );
                setScrollProgress(newProgress);

                if (newProgress >= 1) {
                    setMediaFullyExpanded(true);
                    setShowContent(true);
                } else if (newProgress < 0.7) {
                    setShowContent(false);
                }

                setTouchStartY(touchY);
            }
        };

        const handleTouchEnd = (): void => {
            setTouchStartY(0);
        };

        const handleScroll = (): void => {
            if (!mediaFullyExpanded) {
                window.scrollTo(0, 0);
            }
        };

        window.addEventListener('wheel', handleWheel as unknown as EventListener, {
            passive: false,
        });
        window.addEventListener('scroll', handleScroll as EventListener);
        window.addEventListener(
            'touchstart',
            handleTouchStart as unknown as EventListener,
            { passive: false }
        );
        window.addEventListener(
            'touchmove',
            handleTouchMove as unknown as EventListener,
            { passive: false }
        );
        window.addEventListener('touchend', handleTouchEnd as EventListener);

        return () => {
            window.removeEventListener(
                'wheel',
                handleWheel as unknown as EventListener
            );
            window.removeEventListener('scroll', handleScroll as EventListener);
            window.removeEventListener(
                'touchstart',
                handleTouchStart as unknown as EventListener
            );
            window.removeEventListener(
                'touchmove',
                handleTouchMove as unknown as EventListener
            );
            window.removeEventListener('touchend', handleTouchEnd as EventListener);
        };
    }, [scrollProgress, mediaFullyExpanded, touchStartY]);

    useEffect(() => {
        const checkIfMobile = (): void => {
            setIsMobileState(window.innerWidth < 768);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    // Calculate media size - Calibrated for 2:3 Aspect Ratio (Portrait/Vertical)
    const mediaWidth = (isMobileState ? 300 : 400) + scrollProgress * (isMobileState ? 700 : 1500);
    const mediaHeight = (isMobileState ? 450 : 600) + scrollProgress * (isMobileState ? 300 : 400);

    // Initial gap: 0, slower expansion (multiplier reduced to 70)
    const baseGap = 0;
    const translation = baseGap + scrollProgress * (isMobileState ? 60 : 70);

    return (
        <div
            ref={sectionRef}
            className='transition-colors duration-700 ease-in-out bg-background'
        >
            <section className='relative flex flex-col items-center justify-start min-h-[100dvh] overflow-x-hidden'>
                <div className='relative w-full flex flex-col items-center min-h-[100dvh]'>

                    {/* Background Layer (Atmospheric fade) */}
                    <motion.div
                        className='fixed inset-0 z-0 h-screen w-full'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 - scrollProgress * 0.9 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <Image
                            src={bgImageSrc}
                            alt='Background'
                            fill
                            className='object-cover brightness-[0.3]'
                            priority
                        />
                    </motion.div>

                    {/* Main Interactive Stage */}
                    <div className='container mx-auto flex flex-col items-center justify-start relative z-10'>
                        <div className='flex flex-col items-center justify-center w-full h-[100dvh] relative overflow-visible'>

                            {/* Huge Split Title (Start overlapped, fly out on scroll) */}
                            <div
                                className={cn(
                                    "absolute top-1/2 left-0 w-full -translate-y-1/2 flex items-center justify-center pointer-events-none z-30 transition-all duration-300",
                                    textBlend ? 'mix-blend-hard-light' : 'mix-blend-normal'
                                )}
                            >
                                <div className="relative w-full flex justify-center items-center overflow-visible">
                                    {/* Top Line (titleLeft) - Centered and stacked */}
                                    <div
                                        className="absolute left-1/2 text-center transition-none pointer-events-none w-full"
                                        style={{ transform: `translateX(calc(-50% - ${translation}vw)) translateY(-6vh)` }}
                                    >
                                        <h2 className="text-5xl md:text-8xl lg:text-9xl xl:text-[8rem] font-black text-blue-100 leading-[0.8] tracking-tighter whitespace-nowrap drop-shadow-2xl opacity-90">
                                            {titleLeft}
                                        </h2>
                                    </div>

                                    {/* Bottom Line (titleRight) - Centered and stacked */}
                                    <div
                                        className="absolute left-1/2 text-center transition-none pointer-events-none w-full"
                                        style={{ transform: `translateX(calc(-50% + ${translation}vw)) translateY(7vh)` }}
                                    >
                                        <h2 className="text-5xl md:text-8xl lg:text-9xl xl:text-[8rem] font-black text-blue-100 leading-[0.8] tracking-tighter whitespace-nowrap drop-shadow-2xl opacity-90">
                                            {titleRight}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {/* Media Container (Main Portal) */}
                            <div
                                className='absolute z-10 transition-none rounded-[3rem] md:rounded-[4rem] flex items-center justify-center overflow-hidden border border-white/10'
                                style={{
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: `${mediaWidth}px`,
                                    height: `${mediaHeight}px`,
                                    maxWidth: '100vw',
                                    maxHeight: '100vh',
                                    boxShadow: '0px 100px 200px rgba(0, 0, 0, 1)',
                                }}
                            >
                                {mediaType === 'video' ? (
                                    <div className='relative w-full h-full'>
                                        {mediaSrc.includes('youtube.com') || mediaSrc.includes('youtu.be') ? (
                                            <iframe
                                                width='100%'
                                                height='100%'
                                                src={
                                                    mediaSrc.includes('embed')
                                                        ? mediaSrc + (mediaSrc.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1'
                                                        : mediaSrc.replace('watch?v=', 'embed/').split('&')[0] + '?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1'
                                                }
                                                className='w-full h-full scale-125'
                                                frameBorder='0'
                                                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                                            />
                                        ) : (
                                            <video
                                                src={mediaSrc}
                                                poster={posterSrc}
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                                className='w-full h-full object-cover scale-110'
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className='relative w-full h-full'>
                                        <Image
                                            src={mediaSrc}
                                            alt={titleLeft + ' ' + titleRight}
                                            fill
                                            className='object-cover scale-105'
                                            unoptimized={mediaSrc.endsWith('.gif')}
                                        />
                                    </div>
                                )}

                                {/* Subtle internal overlay */}
                                <motion.div
                                    className='absolute inset-0 bg-black/20 z-15 pointer-events-none'
                                    animate={{ opacity: 0.2 - scrollProgress * 0.2 }}
                                />
                            </div>

                            {/* Subtext Layer: Positioned OUTSIDE the media box, relative to viewport */}
                            <div className='absolute bottom-12 left-0 w-full flex items-end justify-between px-10 md:px-16 z-20 pointer-events-none'>
                                {date && (
                                    <p
                                        className='text-lg md:text-2xl text-white font-extrabold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-none'
                                        style={{
                                            opacity: 1 - (scrollProgress * 3.5),
                                            transform: `translateX(-${translation * 0.4}vw)`
                                        }}
                                    >
                                        {date}
                                    </p>
                                )}
                                {scrollToExpand && (
                                    <div
                                        className='flex flex-col items-end gap-1 overflow-visible transition-none'
                                        style={{
                                            opacity: 1 - (scrollProgress * 3.5),
                                            transform: `translateX(${translation * 0.4}vw)`
                                        }}
                                    >
                                        <span className='text-white font-black text-[10px] md:text-xs tracking-[0.3em] uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]'>
                                            {scrollToExpand}
                                        </span>
                                        <motion.div
                                            className="w-full h-[1px] bg-white/40 origin-right"
                                            animate={{ scaleX: [0, 1, 0] }}
                                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Revealing Content Section (Seamless) */}
                        <motion.section
                            className='flex flex-col w-full bg-background relative z-40'
                            style={{
                                boxShadow: '0 -200px 300px 200px var(--background)'
                            }}
                            initial={{ opacity: 0, y: 150 }}
                            animate={{
                                opacity: showContent ? 1 : 0,
                                y: showContent ? 0 : 150
                            }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="w-full max-w-7xl mx-auto py-40 px-6 md:px-12 border-t border-white/5">
                                {children}
                            </div>
                        </motion.section>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ScrollExpandMedia;
