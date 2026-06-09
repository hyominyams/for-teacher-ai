"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlugZap } from "lucide-react";

export default function ExtensionBridgePage() {
    const [status, setStatus] = useState("checking");
    const [email, setEmail] = useState<string | null>(null);
    const [sessionPayload, setSessionPayload] = useState<unknown>(null);

    useEffect(() => {
        let mounted = true;

        const handleSaved = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data?.type !== "FORTEACHER_EXTENSION_SESSION_SAVED") return;
            setEmail(event.data.email || null);
            setStatus("saved");
        };

        window.addEventListener("message", handleSaved);

        const publishSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!mounted) return;

            if (!session) {
                setStatus("signed-out");
                return;
            }

            setEmail(session.user.email || null);
            const payload = {
                type: "FORTEACHER_EXTENSION_SESSION",
                session: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                    },
                },
            };
            setSessionPayload(payload);
            window.postMessage(payload, window.location.origin);
            setStatus("connected");
        };

        publishSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            if (!session) {
                setStatus("signed-out");
                return;
            }

            setEmail(session.user.email || null);
            const payload = {
                type: "FORTEACHER_EXTENSION_SESSION",
                session: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                    },
                },
            };
            setSessionPayload(payload);
            window.postMessage(payload, window.location.origin);
            setStatus("connected");
        });

        return () => {
            mounted = false;
            window.removeEventListener("message", handleSaved);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!sessionPayload) return;

        let count = 0;
        const timer = window.setInterval(() => {
            window.postMessage(sessionPayload, window.location.origin);
            count += 1;
            if (count >= 10) window.clearInterval(timer);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [sessionPayload]);

    const handleGoogleLogin = async () => {
        setStatus("signing-in");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/extension/bridge`,
            },
        });

        if (error) {
            setStatus("signed-out");
            alert(error.message);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <PlugZap className="size-6" />
                    </div>
                    <CardTitle>Chrome 확장 계정 연결</CardTitle>
                    <CardDescription>
                        ForTeacher AI에 로그인한 계정을 확장 프로그램과 연결합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === "checking" || status === "signing-in" ? (
                        <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-600">
                            <Loader2 className="size-4 animate-spin" />
                            계정 상태를 확인하는 중입니다.
                        </div>
                    ) : null}

                    {status === "connected" ? (
                        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                            로그인 완료: {email || "ForTeacher AI 계정"}
                            <br />
                            확장 프로그램에 연결 신호를 보내는 중입니다.
                        </div>
                    ) : null}

                    {status === "saved" ? (
                        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                            확장 프로그램 연결 완료: {email || "ForTeacher AI 계정"}
                        </div>
                    ) : null}

                    {status === "signed-out" ? (
                        <Button onClick={handleGoogleLogin} className="w-full">
                            Google 계정으로 연결
                        </Button>
                    ) : null}

                    {sessionPayload ? (
                        <Button
                            onClick={() => window.postMessage(sessionPayload, window.location.origin)}
                            variant="outline"
                            className="w-full"
                        >
                            확장 프로그램에 다시 연결
                        </Button>
                    ) : null}

                    <Button asChild variant="outline" className="w-full">
                        <Link href="/app">웹앱으로 돌아가기</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
