import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: Request) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
        return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({ error: "Supabase environment is not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
        return NextResponse.json({ error: "Invalid authorization token" }, { status: 401 });
    }

    const { data: saved, error } = await supabase
        .from("saved_work_logs")
        .select("id,category,title,source_scope_key,legacy_work_log_id,data,updated_at,archived_at,completed_count")
        .gt("completed_count", 0)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(100);
    if (error) return NextResponse.json({ error: "저장본을 불러오지 못했습니다." }, { status: 500 });
    const seen = new Set<string>();
    const logs = (saved || []).filter(log => {
        if (log.category === "subject") return true;
        if (seen.has(log.category)) return false;
        seen.add(log.category); return true;
    }).map(log => ({ category: log.category, scope_key: log.legacy_work_log_id ? log.source_scope_key : log.id, scope_label: log.title, data: log.data, updated_at: log.updated_at }));
    const { data: drafts } = await supabase.from("work_logs").select("category,scope_key,scope_label,data,updated_at").order("updated_at", { ascending: false });
    const savedCategories = new Set(logs.map(log => log.category));
    for (const draft of drafts || []) if (!savedCategories.has(draft.category)) {
        logs.push(draft);
        if (draft.category !== "subject") savedCategories.add(draft.category);
    }
    return NextResponse.json({ logs }, { headers: { "Cache-Control": "no-store" } });
}
