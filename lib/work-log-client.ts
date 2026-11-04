import { supabase } from "@/lib/supabase";
import type { SavedWorkLog, WorkLogSummary } from "@/lib/work-logs";

export class WorkLogError extends Error { constructor(message: string, public code: string, public status: number) { super(message); } }
export async function workLogRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new WorkLogError("다시 로그인해주세요.", "AUTH_REQUIRED", 401);
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...options.headers } });
    const data = await response.json().catch(() => { throw new Error("저장 서버의 응답을 읽을 수 없습니다."); });
    if (!response.ok) throw new WorkLogError(data.error || "작업로그 요청을 처리하지 못했습니다.", data.code || "UNKNOWN", response.status);
    return data as T;
}
export const getSavedWorkLog = (id: string, signal?: AbortSignal) => workLogRequest<SavedWorkLog>(`/api/work-logs/${encodeURIComponent(id)}`, { signal });
export const listSavedWorkLogs = (query: URLSearchParams, signal?: AbortSignal) => workLogRequest<{ logs: WorkLogSummary[]; total: number }>(`/api/work-logs?${query}`, { signal });
