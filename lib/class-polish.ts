import type { Student } from "@/types";

export type PolishCategory = "behavior" | "subject" | "creative";
export type PolishRecord = { studentId: number; text: string; protectedTerms: string[] };
export type PolishEdit = { from: string; to: string };
export type PolishProposal = {
    studentId: number;
    before: string;
    after: string;
    reason: string;
    edits: PolishEdit[];
};
export type PolishHistoryEntry = {
    batchId: string;
    createdAt: string;
    before: string;
    after: string;
};

export const POLISH_LIMITS = { students: 40, text: 2000, totalText: 40000, edits: 3, phrase: 160, changes: 24 } as const;

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function parsePolishRequest(value: unknown): { category: PolishCategory; records: PolishRecord[] } {
    if (!isObject(value) || !["behavior", "subject", "creative"].includes(String(value.category)) || !Array.isArray(value.records)) {
        throw new Error("윤문할 영역과 학생 기록을 확인해주세요.");
    }
    if (value.records.length < 2 || value.records.length > POLISH_LIMITS.students) {
        throw new Error("완성된 기록이 2명 이상, 40명 이하일 때 사용할 수 있습니다.");
    }
    const ids = new Set<number>();
    let total = 0;
    const records = value.records.map((record): PolishRecord => {
        if (!isObject(record) || !Number.isInteger(record.studentId) || Number(record.studentId) < 1 || Number(record.studentId) > 40 || ids.has(Number(record.studentId))) {
            throw new Error("학생 번호가 올바르지 않거나 중복되었습니다.");
        }
        if (typeof record.text !== "string" || record.text.trim().length < 10 || record.text.length > POLISH_LIMITS.text) {
            throw new Error("학생별 기록은 10자 이상, 2,000자 이하로 입력해주세요.");
        }
        if (!Array.isArray(record.protectedTerms) || record.protectedTerms.length > 40 || record.protectedTerms.some(t => typeof t !== "string" || t.length > 120)) {
            throw new Error("보존할 활동 정보를 확인해주세요.");
        }
        ids.add(Number(record.studentId));
        total += record.text.length;
        return { studentId: Number(record.studentId), text: record.text, protectedTerms: [...new Set(record.protectedTerms.filter((t): t is string => typeof t === "string" && !!t.trim()))] };
    });
    if (total > POLISH_LIMITS.totalText) throw new Error("전체 기록은 40,000자 이내에서 검토할 수 있습니다.");
    return { category: value.category as PolishCategory, records };
}

export function toPolishRecords(students: Student[], category: PolishCategory): PolishRecord[] {
    return students.filter(s => s.aiResult.trim()).map(s => ({
        studentId: s.id,
        text: s.aiResult,
        protectedTerms: category === "creative"
            ? [...(s.participatedEvents || []), ...(s.officerRole && s.officerRole !== "임원아님" ? [s.officerRole] : []), ...(s.officerPeriod ? [s.officerPeriod] : [])]
            : [],
    }));
}

export function editSegments(before: string, edits: PolishEdit[], showAfter = false): Array<{ text: string; changed: boolean }> {
    const located = edits.map(edit => ({ ...edit, index: before.indexOf(edit.from) })).sort((a, b) => a.index - b.index);
    const segments: Array<{ text: string; changed: boolean }> = [];
    let cursor = 0;
    for (const edit of located) {
        if (edit.index < cursor) throw new Error("수정 범위가 겹칩니다.");
        if (edit.index > cursor) segments.push({ text: before.slice(cursor, edit.index), changed: false });
        segments.push({ text: showAfter ? edit.to : edit.from, changed: true });
        cursor = edit.index + edit.from.length;
    }
    if (cursor < before.length) segments.push({ text: before.slice(cursor), changed: false });
    return segments;
}

const occurrences = (text: string, phrase: string) => text.split(phrase).length - 1;
const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)*/g) || []).sort().join("|");

/** Reject malformed, ambiguous, overlapping, or fact-bearing replacements. */
export function validatePolishCandidates(records: PolishRecord[], value: unknown): { proposals: PolishProposal[]; discarded: number } {
    if (!isObject(value) || !Array.isArray(value.changes) || value.changes.length > POLISH_LIMITS.students) throw new Error("윤문 응답 형식을 확인할 수 없습니다.");
    const duplicateIds = new Set(value.changes.filter((v, i, a) => isObject(v) && a.some((o, j) => j !== i && isObject(o) && o.studentId === v.studentId)).map(v => (v as Record<string, unknown>).studentId));
    const proposals: PolishProposal[] = [];
    let discarded = 0;
    for (const candidate of value.changes) {
        const record = isObject(candidate) ? records.find(r => r.studentId === candidate.studentId) : undefined;
        try {
            if (!record || !isObject(candidate) || duplicateIds.has(candidate.studentId) || typeof candidate.reason !== "string" || !candidate.reason.trim() || candidate.reason.length > 240 || !Array.isArray(candidate.edits) || !candidate.edits.length || candidate.edits.length > POLISH_LIMITS.edits) throw new Error("invalid");
            const edits = candidate.edits.map((edit): PolishEdit => {
                if (!isObject(edit) || typeof edit.from !== "string" || typeof edit.to !== "string" || edit.from.trim().length < 4 || !edit.to.trim() || edit.from === edit.to || edit.from.length > POLISH_LIMITS.phrase || edit.to.length > POLISH_LIMITS.phrase || /[\r\n]/.test(edit.from + edit.to) || occurrences(record.text, edit.from) !== 1) throw new Error("invalid edit");
                return { from: edit.from, to: edit.to };
            });
            if (edits.reduce((sum, e) => sum + e.from.length, 0) > record.text.length * 0.6) throw new Error("too much rewritten");
            const after = editSegments(record.text, edits, true).map(s => s.text).join("");
            if (after.length > POLISH_LIMITS.text || after.length > record.text.length * 1.2 || after.length < record.text.length * 0.8 || numbers(after) !== numbers(record.text)) throw new Error("facts or length changed");
            if ((after.match(/[.!?]/g) || []).length !== (record.text.match(/[.!?]/g) || []).length) throw new Error("sentence structure changed");
            if (record.protectedTerms.some(term => occurrences(record.text, term) !== occurrences(after, term))) throw new Error("protected term changed");
            if (records.some(r => r.studentId !== record.studentId && r.text === after) || proposals.some(p => p.after === after)) throw new Error("duplicate result");
            if (proposals.length >= Math.min(records.length - 1, POLISH_LIMITS.changes)) throw new Error("too many changes");
            proposals.push({ studentId: record.studentId, before: record.text, after, reason: candidate.reason, edits });
        } catch {
            discarded++;
        }
    }
    return { proposals, discarded };
}

export function verifiedPolishProposals(proposals: PolishProposal[], value: unknown): PolishProposal[] {
    if (!isObject(value) || !Array.isArray(value.verdicts)) throw new Error("의미 보존 검토를 완료하지 못했습니다.");
    return proposals.filter(proposal => {
        const rows = (value.verdicts as unknown[]).filter(v => isObject(v) && v.studentId === proposal.studentId);
        if (rows.length !== 1 || !isObject(rows[0])) return false;
        return rows[0].meaningPreserved === true && rows[0].factsPreserved === true && rows[0].evaluationPreserved === true;
    });
}

function historyOf(student: Student): PolishHistoryEntry[] {
    return (Array.isArray(student.polishHistory) ? student.polishHistory : []).filter(h => h && typeof h.batchId === "string" && typeof h.createdAt === "string" && typeof h.before === "string" && typeof h.after === "string");
}

export function applyPolishProposals(students: Student[], proposals: PolishProposal[], batchId: string, createdAt: string) {
    const applied: number[] = [];
    const skipped: number[] = [];
    const unique = new Map<number, PolishProposal>();
    for (const proposal of proposals) {
        if (unique.has(proposal.studentId)) throw new Error("학생별 제안이 중복되었습니다.");
        unique.set(proposal.studentId, proposal);
    }
    const next = students.map(student => {
        const proposal = unique.get(student.id);
        if (!proposal) return student;
        if (student.isGenerating || student.aiResult !== proposal.before) { skipped.push(student.id); return student; }
        applied.push(student.id);
        return { ...student, aiResult: proposal.after, isEditable: true, polishHistory: [...historyOf(student), { batchId, createdAt, before: proposal.before, after: proposal.after }].slice(-3) };
    });
    for (const id of unique.keys()) if (!students.some(s => s.id === id)) skipped.push(id);
    return { students: next, applied, skipped };
}

export function latestPolishBatch(students: Student[]) {
    const entries = students.flatMap(s => historyOf(s).slice(-1));
    const latest = entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) return null;
    const affected = students.filter(s => historyOf(s).at(-1)?.batchId === latest.batchId);
    const restorable = affected.filter(s => !s.isGenerating && s.aiResult === historyOf(s).at(-1)?.after);
    return { batchId: latest.batchId, count: restorable.length, skipped: affected.length - restorable.length };
}

export function undoPolishBatch(students: Student[], batchId: string) {
    const restored: number[] = [];
    const skipped: number[] = [];
    const next = students.map(student => {
        const history = historyOf(student);
        const last = history.at(-1);
        if (!last || last.batchId !== batchId) return student;
        if (student.isGenerating || student.aiResult !== last.after) { skipped.push(student.id); return student; }
        restored.push(student.id);
        return { ...student, aiResult: last.before, polishHistory: history.slice(0, -1) };
    });
    return { students: next, restored, skipped };
}
