import assert from "node:assert/strict";
import test from "node:test";
import { applyPolishProposals, latestPolishBatch, undoPolishBatch } from "../lib/class-polish.ts";
import { getSubjectCriteriaForLevel } from "../lib/subject-plan-values.ts";
import { parseSubjectOverlapInput, parseSubjectOverlapOutput } from "../lib/subject-overlap.ts";
import { normalizeWorkData } from "../lib/work-logs.ts";

const records = [
    { studentId: 2, text: "두 가락의 어울림을 찾아 설명함." },
    { studentId: 7, text: "리듬을 2회 연주함." },
    { studentId: 11, text: "노랫말의 흐름을 살려 표현함." },
];
const rewritten = "가락이 어우러지는 부분을 짚어 설명함.";
const response = [
    { studentId: 11, text: records[2].text },
    { studentId: 2, text: rewritten },
    { studentId: 7, text: "리듬을 3회 연주함." },
];
const input = (items = records) => ({ course: "6학년 음악", records: items, evidence: items.map(({ studentId }) => ({
    studentId, individualNote: "", assessments: [{ area: "감상", level: "중", criteria: "두 가락의 어울림을 찾음." }],
})) });

test("overlap input keeps evaluation evidence attached by ID and accepts up to 50 records", () => {
    const fifty = input(Array.from({ length: 50 }, (_, index) => ({ ...records[0], studentId: index + 1 })));
    assert.deepEqual(parseSubjectOverlapInput(fifty), fifty);
    assert.throws(() => parseSubjectOverlapInput(input([records[0]])), /2명 이상/);
    assert.throws(() => parseSubjectOverlapInput({ ...input(), evidence: input().evidence.slice(1) }), /빠져/);
    assert.throws(() => parseSubjectOverlapInput(input([records[0], records[0]])), /학생 번호/);
});

test("structured output matches by student ID and requires exactly one record per requested student", () => {
    assert.deepEqual(parseSubjectOverlapOutput(records, { records: response }), {
        proposals: [{ studentId: 2, before: records[0].text, after: rewritten }], excludedIds: [7],
    });
    assert.throws(() => parseSubjectOverlapOutput(records, { records: response.slice(1) }), /일대일/);
    assert.throws(() => parseSubjectOverlapOutput(records, { records: [response[0], response[0], response[2]] }), /일대일/);
    assert.throws(() => parseSubjectOverlapOutput(records, { records: [response[0], response[1], { ...response[2], studentId: 42 }] }), /일대일/);
});

test("unchanged and whitespace-only output stays untouched and new exact duplicates are excluded", () => {
    const proposed = [{ ...records[0], text: records[2].text }, { ...records[1], text: `  ${records[1].text}  ` }, records[2]];
    assert.deepEqual(parseSubjectOverlapOutput(records, { records: proposed }), { proposals: [], excludedIds: [2] });
    const sameRewrite = [{ ...records[0], text: rewritten }, records[1], { ...records[2], text: rewritten }];
    assert.deepEqual(parseSubjectOverlapOutput(records, { records: sameRewrite }), { proposals: [], excludedIds: [2, 11] });
});

test("legacy level-specific criteria use the same slice as subject generation", () => {
    const assessment = { criteria: "상: 앞뒤 관계를 설명함.\n중: 내용을 정리함.\n하: 안내에 따라 찾음." };
    assert.equal(getSubjectCriteriaForLevel(assessment, "중"), "내용을 정리함.");
    assert.equal(getSubjectCriteriaForLevel({ ...assessment, criteriaLevels: { 중: "새 기준" } }, "중"), "새 기준");
});

test("single and bulk approvals share one undo batch and persist independently of ordinary polish", () => {
    const history = "subjectOverlapHistory";
    const savedPolish = { batchId: "prior", createdAt: "2026-11-26T00:00:00.000Z", before: "먼저 쓴 글", after: records[0].text };
    const students = records.map(({ studentId, text }) => ({ id: studentId, aiResult: text, isGenerating: false, selected: true, subjectData: { individualNote: "교사 메모", assessments: [] } }));
    students[0].polishHistory = [savedPolish];
    const apply = (state, index, text) => applyPolishProposals(state, [{ studentId: records[index].studentId, before: records[index].text, after: text }], "overlap", "2026-11-27T00:00:00.000Z", history).students;
    const single = apply(students, 0, rewritten);
    const bulk = apply(single, 2, "노랫말의 흐름을 표현에 살림.");
    const loaded = normalizeWorkData(JSON.parse(JSON.stringify({ students: bulk })), "subject").students;
    assert.equal(latestPolishBatch(loaded, history).count, 2);
    assert.deepEqual(loaded[0].polishHistory, [savedPolish]);
    assert.equal(loaded[1].aiResult, records[1].text);
    assert.deepEqual(loaded[0].subjectData, students[0].subjectData);
    const edited = loaded.map(student => student.id === 11 ? { ...student, aiResult: "나중에 직접 수정함." } : student);
    const undone = undoPolishBatch(edited, "overlap", history);
    assert.deepEqual(undone.restored, [2]);
    assert.deepEqual(undone.skipped, [11]);
    assert.equal(undone.students[0].aiResult, records[0].text);
    assert.equal(undone.students[2].aiResult, "나중에 직접 수정함.");
    assert.deepEqual(undone.students[0].polishHistory, [savedPolish]);
});
