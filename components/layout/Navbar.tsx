"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, User, LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Navbar() {
    const pathname = usePathname()
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

    // 페이지 스크롤 감동에 따른 배경 처리
    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const navItems = pathname?.startsWith("/app")
        ? [
            { name: "대시보드", href: "/app" },
            { name: "행동특성", href: "/app/behavior" },
            { name: "저장소", href: "/app/saved" },
        ]
        : [
            { name: "철학", href: "/#philosophy" },
            { name: "비전", href: "/#vision" },
            { name: "서비스", href: "/#services" },
            { name: "핵심 기능", href: "/#features" },
        ]

    const isAppData = pathname?.startsWith("/app")

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-700",
                isScrolled
                    ? "bg-background/40 backdrop-blur-2xl py-3 border-b border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                    : "bg-transparent py-6"
            )}
        >
            <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group tracking-tighter">
                    <span className="text-xl md:text-2xl font-black text-foreground group-hover:opacity-70 transition-all duration-300">
                        FOR TEACHER <span className="text-primary italic">AI</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-12">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-[13px] font-bold tracking-[0.05em] uppercase transition-all relative group",
                                pathname === item.href
                                    ? "text-primary"
                                    : "text-muted-foreground/60 hover:text-foreground"
                            )}
                        >
                            {item.name}
                            <span className={cn(
                                "absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full",
                                pathname === item.href ? "w-full" : ""
                            )} />
                        </Link>
                    ))}
                </nav>

                {/* Action Buttons */}
                <div className="hidden md:flex items-center gap-6">
                    {isAppData ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
                                <User className="size-4 text-primary" />
                                <span className="text-xs font-bold text-foreground">teacher@example.com</span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all font-bold">
                                <LogOut className="size-4 mr-2" />
                                로그아웃
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-8">
                            <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                                로그인
                            </Link>
                            <Button variant="default" className="shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] rounded-full font-bold px-8 h-12 text-sm" asChild>
                                <Link href="/signup">무료 시작하기</Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-muted-foreground hover:bg-white/5 rounded-full transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                </button>
            </div>

            {/* Mobile Navigation */}
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
                            className={cn(
                                "text-2xl font-black tracking-tighter",
                                pathname === item.href ? "text-primary" : "text-muted-foreground"
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {item.name}
                        </Link>
                    ))}
                    <div className="h-px bg-white/5 w-full" />
                    {isAppData ? (
                        <Button variant="outline" className="w-full h-14 rounded-2xl text-destructive border-destructive/20 hover:bg-destructive/10 font-bold">
                            <LogOut className="size-4 mr-2" />
                            로그아웃
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
