"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            router.push("/app");
            router.refresh();
        } catch (error: any) {
            alert(error.message || "로그인 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
        } catch (error: any) {
            alert(error.message || "구글 로그인 중 오류가 발생했습니다.");
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
            {/* Dynamic Atmospheric Background */}
            <div className="absolute inset-0 -z-10">
                <Image
                    src="/korean_teacher_at_computer_v2_1769013704052.png"
                    alt="Background"
                    fill
                    className="object-cover blur-[100px] opacity-30 scale-125 saturate-150"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-transparent" />
            </div>

            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                {/* Back to Home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                    홈으로 돌아가기
                </Link>

                <Card>
                    <CardHeader className="space-y-3">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[10px] text-primary font-black tracking-[0.3em] uppercase">
                                Welcome Back
                            </h3>
                            <CardTitle className="text-3xl">로그인</CardTitle>
                        </div>
                        <CardDescription>
                            For Teacher AI와 함께 교육의 가치를 더해보세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Social Login Section */}
                            <div className="space-y-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="w-full h-12 rounded-xl font-bold border-border bg-white/50 hover:bg-white transition-all shadow-sm gap-3"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                >
                                    <svg className="size-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Google로 로그인
                                </Button>


                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/50" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase">
                                        <span className="bg-white px-2 text-muted-foreground font-black tracking-widest leading-none rounded-full border border-border/20 py-1">OR</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">이메일 주소</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@school.ac.kr"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="password">비밀번호</Label>
                                        <Link href="#" className="text-xs text-primary font-bold hover:underline">
                                            비밀번호 분실
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-12 rounded-xl font-bold bg-foreground text-background hover:opacity-90 transition-all gap-2 shadow-xl"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <><LogIn className="size-4" /> 로그인하기</>}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-transparent px-2 text-muted-foreground font-medium">
                                    계정이 없으신가요?
                                </span>
                            </div>
                        </div>
                        <Button asChild variant="outline" size="lg" className="w-full h-12 rounded-xl font-bold border-border bg-white/50 hover:bg-white transition-all shadow-sm">
                            <Link href="/signup">회원가입 하기</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <p className="mt-8 text-center text-xs text-muted-foreground px-8 leading-relaxed">
                    로그인함으로써 귀하는 For Teacher AI의 <Link href="#" className="underline hover:text-foreground">이용약관</Link> 및 <Link href="#" className="underline hover:text-foreground">개인정보처리방침</Link>에 동의하게 됩니다.
                </p>
            </div>
        </main>
    );
}
