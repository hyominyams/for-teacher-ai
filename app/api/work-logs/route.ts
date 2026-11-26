import { NextResponse } from "next/server";
import { isUuid, isWorkCategory, parseSavedLogInput } from "@/lib/work-logs";
import { workLogFailure, workLogUser } from "@/lib/server/work-log-access";

export async function GET(req: Request) {
    try {
        const { client, user } = await workLogUser(req);
        const params = new URL(req.url).searchParams;
        const page = Math.min(100, Math.max(0, Math.floor(Number(params.get("page")) || 0)));
        const state = params.get("state") || "editable", category = params.get("category"), search = (params.get("q") || "").trim().slice(0, 100);
        const projectId = params.get("project");
        if (projectId !== null && !isUuid(projectId)) return NextResponse.json({ error: "프로젝트를 다시 선택해주세요." }, { status: 400 });
        const columns = "id,category,title,revision,source_scope_key,legacy_work_log_id,student_count,completed_count,archived_at,created_at,updated_at,subject_name:data->globalConfig->>subjectName";
        const table = client.from("saved_work_logs");
        let query = (projectId
            ? table.select(`${columns},membership:subject_project_saved_logs!inner()` as const, { count: "exact" })
            : table.select(columns, { count: "exact" })).eq("user_id", user.id);
        query = state === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
        if (projectId) query = query.eq("category", "subject").eq("membership.project_id", projectId);
        else if (isWorkCategory(category)) query = query.eq("category", category);
        if (search) query = query.ilike("title", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
        const { data, count, error } = await query.order("updated_at", { ascending: false }).order("id", { ascending: false }).range(page * 30, page * 30 + 29);
        if (error) throw error;
        const logs = data || [];
        const subjectIds = logs.filter(log => log.category === "subject").map(log => log.id);
        const projects = new Map<string, { id: string; title: string }>();
        if (subjectIds.length > 0) {
            const links = await client.from("subject_project_saved_logs")
                .select("saved_log_id,project:subject_projects(id,title)")
                .eq("user_id", user.id).in("saved_log_id", subjectIds);
            if (links.error) throw links.error;
            for (const link of links.data || []) {
                const project = Array.isArray(link.project) ? link.project[0] : link.project;
                if (project) projects.set(link.saved_log_id, project);
            }
        }
        return NextResponse.json({ logs: logs.map(log => ({ ...log, project: projects.get(log.id) })), total: count || 0 }, { headers: { "Cache-Control": "no-store" } });
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
