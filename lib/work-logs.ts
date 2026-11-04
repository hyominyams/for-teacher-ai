import type { Student, SubjectGlobalConfig } from "@/types";

export const WORK_CATEGORIES = { behavior: "행동특성", subject: "학기말 종합의견", creative: "창의적 체험활동", docs: "문서" } as const;
export type WorkCategory = keyof typeof WORK_CATEGORIES;
export type WorkLogData = { students: Student[]; studentCount: number; charLimits: Record<string, number>; charLimit?: number; globalConfig?: SubjectGlobalConfig };
export type SavedWorkLog = {
    id: string; category: WorkCategory; title: string; revision: number; data: WorkLogData;
    source_scope_key: string; legacy_work_log_id?: string | null; student_count: number; completed_count: number;
    archived_at: string | null; created_at: string; updated_at: string;
};
export type WorkLogSummary = Omit<SavedWorkLog, "data">;
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const isWorkCategory = (value: unknown): value is WorkCategory => typeof value === "string" && Object.hasOwn(WORK_CATEGORIES, value);

export function normalizeWorkData(raw: unknown, category: WorkCategory): WorkLogData {
    if (!raw || typeof raw !== "object" || !Array.isArray((raw as WorkLogData).students)) throw new Error("저장된 학생 기록을 읽을 수 없습니다.");
    const data = raw as WorkLogData;
    if (data.students.length > 40) throw new Error("한 작업에는 최대 40명의 기록을 저장할 수 있습니다.");
    const ids = new Set<number>();
    const students = data.students.map((s): Student => {
        if (!s || !Number.isInteger(s.id) || s.id < 1 || s.id > 40 || ids.has(s.id)) throw new Error("학생 번호가 올바르지 않거나 중복되었습니다.");
        ids.add(s.id);
        return { ...s, name: s.name || `${s.id}번 학생`, customKeywords: Array.isArray(s.customKeywords) ? s.customKeywords : [], selectedKeywords: Array.isArray(s.selectedKeywords) ? s.selectedKeywords : [], participatedEvents: Array.isArray(s.participatedEvents) ? s.participatedEvents : [], officerRole: s.officerRole || "임원아님", officerPeriod: s.officerPeriod || "", subjectData: s.subjectData || { assessments: [], individualNote: "" }, aiResult: typeof s.aiResult === "string" ? s.aiResult : "", isGenerating: false, isEditable: !!s.aiResult, selected: false };
    });
    return { ...data, ...(category === "subject" ? { globalConfig: { schoolLevel: "elementary", grade: "1", subjectName: "", assessments: [], ...data.globalConfig } } : {}), students, studentCount: students.length, charLimits: { behavior: 300, subject: 300, creative: 300, docs: 500, ...(data.charLimit ? { [category]: data.charLimit } : {}), ...data.charLimits } };
}

export function parseSavedLogInput(value: unknown, update = false) {
    if (!value || typeof value !== "object") throw new Error("저장할 내용을 확인해주세요.");
    const v = value as Record<string, unknown>;
    if (!isWorkCategory(v.category) || !isUuid(v.id) || typeof v.title !== "string" || !v.title.trim() || v.title.trim().length > 120) throw new Error("작업 이름(120자 이내)과 영역을 확인해주세요.");
    if (update && (!Number.isInteger(v.revision) || Number(v.revision) < 1)) throw new Error("저장본 버전을 확인해주세요.");
    return { id: v.id, category: v.category, title: v.title.trim(), revision: Number(v.revision), data: normalizeWorkData(v.data, v.category), source_scope_key: typeof v.source_scope_key === "string" ? v.source_scope_key.slice(0, 100) : "default" };
}

export function defaultWorkTitle(category: WorkCategory, subject = "", now = new Date()) {
    const date = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    return `${subject.trim() || WORK_CATEGORIES[category]} · ${date}`;
}
// JSONB may reorder object keys. Arrays keep their order; storage order must not
// make an unchanged saved record look dirty or create a duplicate snapshot.
export const stableWorkJson = (value: unknown) => JSON.stringify(value, (_key, item) => (
    item && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item
));
export const workFingerprint = (data: WorkLogData, title: string) => stableWorkJson({ title: title.trim(), data });

export function workLogCsv(log: Pick<SavedWorkLog, "category" | "data">) {
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["번호", "관찰 키워드", "참여 행사", "임원", "임기", "개별 특이사항", "평가 수준", "작성 결과"];
    const rows = log.data.students.map(s => [s.id, (s.selectedKeywords || []).join(", "), (s.participatedEvents || []).join(", "), s.officerRole || "", s.officerPeriod || "", s.subjectData?.individualNote || "", (s.subjectData?.assessments || []).map(a => `${log.data.globalConfig?.assessments.find(g => g.id === a.assessmentId)?.area || a.assessmentId}: ${a.level}`).join(", "), s.aiResult]);
    return "\uFEFF" + [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
}
