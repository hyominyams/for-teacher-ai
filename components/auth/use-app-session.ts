"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAppSession() {
    const router = useRouter();
    const [sessionState, setSessionState] = useState({ ready: false, name: "" });

    useEffect(() => {
        let mounted = true;
        let currentUserId: string | null = null;
        const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
            if (!mounted) return;
            currentUserId = session?.user.id ?? null;
            if (!session) {
                setSessionState({ ready: false, name: "" });
                router.replace("/login");
                return;
            }
            const userId = session.user.id;
            setSessionState({ ready: true, name: "" });
            const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
            if (mounted && currentUserId === userId) setSessionState({ ready: true, name: data?.full_name || "" });
        };
        supabase.auth.getSession().then(({ data: { session } }) => applySession(session)).catch(() => {
            if (mounted) router.replace("/login");
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void applySession(session); });
        return () => { mounted = false; subscription.unsubscribe(); };
    }, [router]);

    return sessionState;
}
