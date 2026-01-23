"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, User, LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { supabase } from "@/lib/supabase"
import { ArrowLeft, LayoutDashboard } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function NavbarLanding() {
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [isLoggedIn, setIsLoggedIn] = React.useState(false)

    React.useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setIsLoggedIn(!!session)
        }
        checkSession()
    }, [])

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const navItems = [
        { name: "철학", href: "/#philosophy" },
        { name: "비전", href: "/#vision" },
        { name: "서비스", href: "/#services" },
        { name: "핵심 기능", href: "/#features" },
    ]

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-700",
                isScrolled
                    ? "bg-background/40 dark:bg-slate-950/80 backdrop-blur-2xl py-3 border-b border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                    : "bg-transparent py-6"
            )}
        >
            <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                <Link href={isLoggedIn ? "/app" : "/"} className="flex items-center gap-2 group tracking-tighter">
                    <span className="text-xl md:text-2xl font-black text-foreground group-hover:opacity-70 transition-all duration-300">
                        FOR TEACHER <span className="text-primary italic">AI</span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-12">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="text-[13px] font-bold tracking-[0.05em] uppercase transition-all relative group text-muted-foreground/60 hover:text-foreground"
                        >
                            {item.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-8">
                    <ModeToggle />
                    {isLoggedIn ? (
                        <Button variant="default" className="shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] rounded-full font-bold px-8 h-12 text-sm gap-2" asChild>
                            <Link href="/app">
                                <LayoutDashboard className="size-4" /> 대시보드로 이동
                            </Link>
                        </Button>
                    ) : (
                        <>
                            <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                                로그인
                            </Link>
                            <Button variant="default" className="shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] rounded-full font-bold px-8 h-12 text-sm" asChild>
                                <Link href="/signup">무료 시작하기</Link>
                            </Button>
                        </>
                    )}
                </div>

                <button
                    className="md:hidden p-2 text-muted-foreground hover:bg-white/5 rounded-full transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                </button>
            </div>

            <div
                className={cn(
                    "md:hidden absolute top-full left-4 right-4 bg-background/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] mt-4 transition-all duration-500 shadow-2xl overflow-hidden",
                    isMobileMenuOpen ? "max-h-[80vh] opacity-100 p-8" : "max-h-0 opacity-0 p-0"
                )}
            >
                <div className="flex flex-col gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="text-2xl font-black tracking-tighter text-muted-foreground"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {item.name}
                        </Link>
                    ))}
                    <div className="h-px bg-white/5 w-full" />
                    <div className="h-px bg-white/5 w-full" />
                    {isLoggedIn ? (
                        <Button className="w-full h-14 rounded-2xl font-bold text-lg gap-2" asChild>
                            <Link href="/app">
                                <LayoutDashboard className="size-5" /> 대시보드로 이동
                            </Link>
                        </Button>
                    ) : (
                        <Button className="w-full h-14 rounded-2xl font-bold text-lg" asChild>
                            <Link href="/signup">지금 시작하기</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}
