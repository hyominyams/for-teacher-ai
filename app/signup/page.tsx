"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        school: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        school_name: formData.school,
                    },
                },
            });

            if (error) throw error;

            alert("회원가입이 완료되었습니다! 이메일 인증을 확인해주세요.");
            router.push("/login");
        } catch (error: any) {
            alert(error.message || "회원가입 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
            {/* Dynamic Atmospheric Background Reused */}
            <div className="absolute inset-0 -z-10">
                <Image
                    src="/korean_teacher_at_computer_v2_1769013704052.png"
                    alt="Background"
                    fill
                    className="object-cover blur-[100px] opacity-30 scale-125 saturate-150 rotate-180"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-bl from-background via-background/90 to-transparent" />
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
                                Join Us
                            </h3>
                            <CardTitle className="text-3xl">회원가입</CardTitle>
                        </div>
                        <CardDescription>
                            스마트한 교육 환경을 여는 첫 번째 단계입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-6">
                            {/* Social Login Section */}
                            <div className="space-y-4">
                                <Button type="button" variant="outline" size="lg" className="w-full h-12 rounded-xl font-bold border-border bg-white/50 hover:bg-white transition-all shadow-sm gap-3">
                                    <svg className="size-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Google로 계속하기
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">이름</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="홍길동"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="school">소속 학교</Label>
                                        <Input
                                            id="school"
                                            type="text"
                                            placeholder="○○고등학교"
                                            required
                                            value={formData.school}
                                            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                        />
                                    </div>
                                </div>
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
                                    <Label htmlFor="password">비밀번호</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted-foreground font-medium">영문, 숫자 포함 8자 이상</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">비밀번호 확인</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-12 rounded-xl font-bold bg-foreground text-background hover:opacity-90 transition-all gap-2 shadow-xl"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <><UserPlus className="size-4" /> 가입하고 시작하기</>}
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
                                    이미 계정이 있으신가요?
                                </span>
                            </div>
                        </div>
                        <Button asChild variant="outline" size="lg" className="w-full h-12 rounded-xl font-bold border-border bg-white/50 hover:bg-white transition-all shadow-sm">
                            <Link href="/login">기존 계정으로 로그인</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <p className="mt-8 text-center text-xs text-muted-foreground px-8 leading-relaxed text-balance">
                    가입 시 For Teacher AI의 <Link href="#" className="underline hover:text-foreground">이용약관</Link> 및 <Link href="#" className="underline hover:text-foreground">개인정보처리방침</Link>에 동의하게 됩니다.
                </p>
            </div>
        </main>
    );
}
