import { NextResponse } from "next/server";
import { isUuid, parseSavedLogInput } from "@/lib/work-logs";
import { WorkLogAccessError, workLogFailure, workLogUser } from "@/lib/server/work-log-access";
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
    try {
        const { id } = await context.params;
        if (!isUuid(id)) throw new WorkLogAccessError("작업로그 번호를 확인해주세요.", 400, "INVALID_ID");
        const { client, user } = await workLogUser(req);
        const { data, error } = await client.from("saved_work_logs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new WorkLogAccessError("작업로그를 찾을 수 없습니다.", 404, "WORK_LOG_NOT_FOUND");
        return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return workLogFailure(error); }
}
export async function PUT(req: Request, context: Context) {
    try {
        const { id } = await context.params;
        const { client } = await workLogUser(req);
        let input;
        try { input = parseSavedLogInput({ ...await req.json(), id }, true); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "입력을 확인해주세요." }, { status: 400 }); }
        const { data, error } = await client.rpc("update_saved_work_log", { p_id: id, p_revision: input.revision, p_title: input.title, p_data: input.data });
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) { return workLogFailure(error); }
}
export async function PATCH(req: Request, context: Context) {
    try {
        const { id } = await context.params;
        const { client } = await workLogUser(req);
        const body = await req.json().catch(() => ({}));
        if (!isUuid(id) || body.action !== "archive" || !Number.isInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: "보관 요청을 확인해주세요." }, { status: 400 });
        const { data, error } = await client.rpc("archive_saved_work_log", { p_id: id, p_revision: body.revision });
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) { return workLogFailure(error); }
}
