import { supabase } from "@/lib/supabase";
import type { SavedWorkLog, SubjectSaveTarget, WorkLogSummary } from "@/lib/work-logs";

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

export async function listSubjectProjectLogs(projectId: string, signal?: AbortSignal) {
    const subjects = new Map<string, WorkLogSummary>();
    for (let page = 0; page <= 100; page++) {
        const { logs, total } = await listSavedWorkLogs(new URLSearchParams({ project: projectId, category: "subject", state: "editable", page: String(page) }), signal);
        const previous = subjects.size;
        for (const log of logs) if (log.category === "subject" && log.project?.id === projectId) subjects.set(log.id, log);
        if (subjects.size >= total) return [...subjects.values()];
        if (subjects.size === previous) break;
    }
    throw new Error("프로젝트의 교과 목록을 불러오지 못했습니다. 다시 불러와 주세요.");
}

export async function listSubjectSaveTargets(sourceScope: string) {
    const targets = new Map<string, SubjectSaveTarget>();
    for (let page = 0; page <= 100; page++) {
        const { logs, total } = await listSavedWorkLogs(new URLSearchParams({ category: "subject", sourceScope, state: "editable", page: String(page) }));
        const previous = targets.size;
        for (const log of logs) {
            if (log.project && log.category === "subject" && !log.archived_at && log.source_scope_key === sourceScope) {
                targets.set(log.id, { ...log, project: log.project });
            }
        }
        if (targets.size >= total) return [...targets.values()];
        if (targets.size === previous) break;
    }
    throw new Error("저장할 프로젝트 목록이 바뀌었습니다. 다시 시도해주세요.");
}
