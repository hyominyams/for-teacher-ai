import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/work-logs";

export class WorkLogAccessError extends Error { constructor(message: string, public status: number, public code: string) { super(message); } }
export async function workLogUser(req: Request) {
    const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new WorkLogAccessError("로그인 후 이용해주세요.", 401, "AUTH_REQUIRED");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new WorkLogAccessError("저장 서비스를 준비 중입니다.", 503, "UNAVAILABLE");
    const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new WorkLogAccessError("로그인이 만료되었습니다.", 401, "AUTH_REQUIRED");
    return { client, user: data.user };
}
export function workLogFailure(error: unknown) {
    if (error instanceof WorkLogAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
    if (message.includes("WORK_LOG_ARCHIVED")) return NextResponse.json({ error: "보관된 작업은 수정하거나 AI를 재생성할 수 없습니다.", code: "WORK_LOG_ARCHIVED" }, { status: 409 });
    if (message.includes("WORK_LOG_CONFLICT")) return NextResponse.json({ error: "다른 창에서 이 기록이 변경되었습니다. 현재 수정 내용은 유지됩니다. 최신 저장본을 확인해주세요.", code: "WORK_LOG_CONFLICT" }, { status: 409 });
    if (message.includes("WORK_LOG_NOT_FOUND")) return NextResponse.json({ error: "작업로그를 찾을 수 없습니다.", code: "WORK_LOG_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ error: "저장 요청을 처리하지 못했습니다. 현재 내용을 유지한 채 다시 시도해주세요.", code: "SAVE_FAILED" }, { status: 500 });
}
export async function assertEditableWorkLog(req: Request, id: unknown) {
    if (id === undefined || id === null || id === "") return;
    if (!isUuid(id)) throw new WorkLogAccessError("작업로그 번호를 확인해주세요.", 400, "INVALID_ID");
    const { client, user } = await workLogUser(req);
    const { data, error } = await client.from("saved_work_logs").select("id,archived_at").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new WorkLogAccessError("작업로그를 찾을 수 없습니다.", 404, "WORK_LOG_NOT_FOUND");
    if (data.archived_at) throw new WorkLogAccessError("보관된 작업은 수정하거나 AI를 재생성할 수 없습니다.", 409, "WORK_LOG_ARCHIVED");
}
