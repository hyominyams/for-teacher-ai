import type { AchievementLevel } from "@/types";

export type SubjectOverlapRecord = { studentId: number; text: string };
export type SubjectOverlapEvidence = {
    studentId: number;
    individualNote: string;
    assessments: { area: string; level: AchievementLevel; criteria: string }[];
};
export type SubjectOverlapInput = { course: string; records: SubjectOverlapRecord[]; evidence: SubjectOverlapEvidence[] };
export type SubjectOverlapProposal = { studentId: number; before: string; after: string };

const maximumRecords = 50;
const maximumRecordLength = 10_000;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isLevel = (value: unknown): value is AchievementLevel => value === "상" || value === "중" || value === "하";
const readText = (value: unknown): value is string => typeof value === "string" && value.length <= maximumRecordLength;

export function parseSubjectOverlapInput(value: unknown): SubjectOverlapInput {
    if (!isObject(value) || !readText(value.course) || !Array.isArray(value.records) || !Array.isArray(value.evidence)) {
        throw new Error("겹침 제거에 사용할 교과와 학생 기록을 확인해주세요.");
    }
    if (value.records.length < 2 || value.records.length > maximumRecords) {
        throw new Error("완성된 학생 기록이 2명 이상, 50명 이하일 때 검토할 수 있습니다.");
    }

    const ids = new Set<number>();
    const records = value.records.map((item: unknown): SubjectOverlapRecord => {
        if (!isObject(item) || typeof item.studentId !== "number" || !Number.isSafeInteger(item.studentId) || item.studentId < 1
            || ids.has(item.studentId) || !readText(item.text) || !item.text.trim()) {
            throw new Error("학생 번호와 작성 결과를 확인해주세요.");
        }
        ids.add(item.studentId);
        return { studentId: item.studentId, text: item.text };
    });
    const evidenceIds = new Set<number>();
    const evidence = value.evidence.map((item: unknown): SubjectOverlapEvidence => {
        if (!isObject(item) || typeof item.studentId !== "number" || !ids.has(item.studentId) || evidenceIds.has(item.studentId)
            || !readText(item.individualNote) || !Array.isArray(item.assessments)) {
            throw new Error("학생별 평가 자료를 확인해주세요.");
        }
        evidenceIds.add(item.studentId);
        const assessments = item.assessments.map((assessment: unknown) => {
            if (!isObject(assessment) || !readText(assessment.area) || !isLevel(assessment.level) || !readText(assessment.criteria)) {
                throw new Error("학생별 평가 수준과 기준을 확인해주세요.");
            }
            return { area: assessment.area, level: assessment.level, criteria: assessment.criteria };
        });
        return { studentId: item.studentId, individualNote: item.individualNote, assessments };
    });
    if (evidenceIds.size !== ids.size) throw new Error("학생별 평가 자료가 빠져 있습니다.");
    return { course: value.course, records, evidence };
}

const comparableText = (text: string) => text.trim().replace(/\s+/gu, " ");
const numbers = (text: string) => JSON.stringify((text.match(/\d+(?:[.,]\d+)*/gu) ?? []).sort());

export function parseSubjectOverlapOutput(records: SubjectOverlapRecord[], value: unknown) {
    const message = "학생 번호와 겹침 제거 결과를 일대일로 확인하지 못했습니다. 원문을 유지했습니다.";
    if (!isObject(value) || !Array.isArray(value.records) || value.records.length !== records.length) throw new Error(message);

    const originals = new Map(records.map(record => [record.studentId, record.text]));
    const responses = new Map<number, string>();
    const responseCounts = new Map<string, number>();
    for (const item of value.records) {
        if (!isObject(item) || typeof item.studentId !== "number" || !originals.has(item.studentId) || responses.has(item.studentId)
            || !readText(item.text) || !item.text.trim()) throw new Error(message);
        responses.set(item.studentId, item.text.trim());
        const key = comparableText(item.text);
        responseCounts.set(key, (responseCounts.get(key) ?? 0) + 1);
    }

    const originalTexts = new Set(records.map(record => comparableText(record.text)));
    const proposals: SubjectOverlapProposal[] = [];
    const excludedIds: number[] = [];
    for (const { studentId, text: before } of records) {
        const after = responses.get(studentId)!;
        const key = comparableText(after);
        if (key === comparableText(before)) continue;
        // Mechanical checks only. The teacher sees each proposed record and its evidence before saving.
        if (numbers(after) !== numbers(before) || originalTexts.has(key) || (responseCounts.get(key) ?? 0) > 1) {
            excludedIds.push(studentId);
            continue;
        }
        proposals.push({ studentId, before, after });
    }
    return { proposals, excludedIds };
}
