"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles, User, LogOut, Menu, X, LayoutDashboard, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export function NavbarMain() {
    const pathname = usePathname()
    const router = useRouter()
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [userName, setUserName] = React.useState<string | null>(null)
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)

        // 사용자 정보 가져오기
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single()

                setUserName(profile?.full_name || session.user.email?.split('@')[0] || "선생님")
            }
        }
        getUser()

        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const handleLogout = async () => {
        setIsLoggingOut(true)
        await supabase.auth.signOut()
        router.push("/")
        router.refresh()
        setIsLoggingOut(false)
    }

    const navItems = [
        { name: "대시보드", href: "/app", icon: LayoutDashboard },
        { name: "작업로그", href: "/app/logs" },
    ]

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-700",
                isScrolled
                    ? "bg-white/70 backdrop-blur-2xl py-3 border-b border-black/5 shadow-sm"
                    : "bg-transparent py-6"
            )}
        >
            <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                <Link href="/app" className="flex items-center gap-2 group tracking-tighter">
                    <span className="text-xl md:text-2xl font-black text-foreground group-hover:opacity-70 transition-all duration-300">
                        FOR TEACHER <span className="text-primary italic">AI</span>
                    </span>
                    <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider ml-1">
                        App
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-10">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-[13px] font-bold tracking-tight transition-all relative group",
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

                <div className="hidden md:flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/5">
                        <User className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                            {userName ? `${userName} 선생님` : "선생님"}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all font-bold"
                    >
                        {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4 mr-2" />}
                        로그아웃
                    </Button>
                </div>

                <button
                    className="md:hidden p-2 text-muted-foreground hover:bg-black/5 rounded-full transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                </button>
            </div>

            <div
                className={cn(
                    "md:hidden absolute top-full left-4 right-4 bg-white/95 backdrop-blur-3xl border border-black/5 rounded-[2rem] mt-4 transition-all duration-500 shadow-2xl overflow-hidden",
                    isMobileMenuOpen ? "max-h-[80vh] opacity-100 p-8" : "max-h-0 opacity-0 p-0"
                )}
            >
                <div className="flex flex-col gap-6">
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
                    <div className="h-px bg-black/5 w-full" />
                    <Button
                        variant="outline"
                        className="w-full h-14 rounded-2xl text-destructive border-destructive/20 hover:bg-destructive/10 font-bold"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4 mr-2" />}
                        로그아웃
                    </Button>
                </div>
            </div>
        </header>
    )
}
