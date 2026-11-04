import { NextResponse } from "next/server";
import { isWorkCategory, parseSavedLogInput } from "@/lib/work-logs";
import { workLogFailure, workLogUser } from "@/lib/server/work-log-access";

export async function GET(req: Request) {
    try {
        const { client, user } = await workLogUser(req);
        const params = new URL(req.url).searchParams;
        const page = Math.min(100, Math.max(0, Math.floor(Number(params.get("page")) || 0)));
        const state = params.get("state") || "editable", category = params.get("category"), search = (params.get("q") || "").trim().slice(0, 100);
        let query = client.from("saved_work_logs").select("id,category,title,revision,source_scope_key,legacy_work_log_id,student_count,completed_count,archived_at,created_at,updated_at", { count: "exact" }).eq("user_id", user.id);
        query = state === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
        if (isWorkCategory(category)) query = query.eq("category", category);
        if (search) query = query.ilike("title", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
        const { data, count, error } = await query.order("updated_at", { ascending: false }).order("id", { ascending: false }).range(page * 30, page * 30 + 29);
        if (error) throw error;
        return NextResponse.json({ logs: data || [], total: count || 0 }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return workLogFailure(error); }
}
export async function POST(req: Request) {
    try {
        const { client } = await workLogUser(req);
        let input;
        try { input = parseSavedLogInput(await req.json()); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "입력을 확인해주세요." }, { status: 400 }); }
        const { data, error } = await client.rpc("create_saved_work_log", { p_id: input.id, p_category: input.category, p_title: input.title, p_data: input.data, p_source_scope_key: input.source_scope_key });
        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error) { return workLogFailure(error); }
}
