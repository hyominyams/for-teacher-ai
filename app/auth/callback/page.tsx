"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            // Supabase client handles code exchange and hash fragment automatically
            const { data: { session }, error } = await supabase.auth.getSession();

            if (session) {
                router.push("/app");
                router.refresh();
            } else if (error) {
                console.error("Auth callback error:", error.message);
                router.push("/login");
            } else {
                // If no session yet, wait for onAuthStateChange
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === "SIGNED_IN" && session) {
                        router.push("/app");
                        router.refresh();
                        subscription.unsubscribe();
                    }
                });
            }
        };

        handleAuth();
    }, [router]);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <Loader2 className="size-12 animate-spin text-primary relative z-10" />
            </div>
            <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <h2 className="text-xl font-bold tracking-tight">인증 처리 중...</h2>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요. 안전하게 로그인 중입니다.</p>
            </div>
        </main>
    );
}
