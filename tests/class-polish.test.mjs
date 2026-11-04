import test from "node:test";
import assert from "node:assert/strict";
import { applyPolishProposals, editSegments, latestPolishBatch, parsePolishRequest, toPolishRecords, undoPolishBatch, validatePolishCandidates, verifiedPolishProposals } from "../lib/class-polish.ts";

const text = "친구의 의견을 경청하며 모둠 활동에 성실하게 참여함. 맡은 과제를 끝까지 수행하며 도움이 필요할 때 질문함.";
const records = [{ studentId: 1, text, protectedTerms: [] }, { studentId: 2, text, protectedTerms: [] }];
const candidate = (studentId = 1) => ({ studentId, reason: "반복되는 경청 표현을 다듬음.", edits: [{ from: "친구의 의견을 경청하며", to: "친구의 의견에 귀 기울이며" }] });
const proposal = validatePolishCandidates(records, { changes: [candidate()] }).proposals[0];
const student = (id, aiResult = text) => ({ id, name: "", selectedKeywords: [], customKeywords: [], aiResult, isGenerating: false, isEditable: true, selected: false });

test("class size, category, unique IDs and text limits are validated", () => {
    assert.equal(parsePolishRequest({ category: "behavior", records }).records.length, 2);
    assert.throws(() => parsePolishRequest({ category: "docs", records }));
    assert.throws(() => parsePolishRequest({ category: "behavior", records: [records[0]] }));
    assert.throws(() => parsePolishRequest({ category: "behavior", records: [records[0], records[0]] }));
    assert.throws(() => parsePolishRequest({ category: "behavior", records: records.map(r => ({ ...r, text: "a".repeat(2001) })) }));
    assert.throws(() => parsePolishRequest({ category: "behavior", records: Array.from({ length: 41 }, (_, i) => ({ ...records[0], studentId: i + 1 })) }));
});

test("two exact edits preserve all untouched characters and displayed diff", () => {
    const change = { ...candidate(), edits: [...candidate().edits, { from: "맡은 과제를 끝까지 수행하며", to: "맡은 과제를 끝까지 해내며" }] };
    const p = validatePolishCandidates(records, { changes: [change] }).proposals[0];
    assert.ok(p);
    assert.equal(editSegments(text, p.edits).map(s => s.text).join(""), text);
    assert.equal(editSegments(text, p.edits, true).map(s => s.text).join(""), p.after);
    assert.ok(p.after.endsWith("도움이 필요할 때 질문함."));
});

test("ambiguous, overlapping, missing and whole-record edits are rejected", () => {
    const edits = [
        [{ from: "없는 원문 문자열", to: "새로운 표현" }],
        [{ from: "친구의 의견을 경청하며", to: "친구의 의견에 귀 기울이며" }, { from: "의견을 경청하며", to: "의견을 들으며" }],
        [{ from: text, to: text.replace("경청하며", "들으며") }],
    ];
    for (const edit of edits) assert.equal(validatePolishCandidates(records, { changes: [{ ...candidate(), edits: edit }] }).proposals.length, 0);
    const repeated = records.map(r => ({ ...r, text: text + " " + text }));
    assert.equal(validatePolishCandidates(repeated, { changes: [candidate()] }).proposals.length, 0);
});

test("dates, counts and protected event/role names cannot change", () => {
    const original = "학급 회장(2026.03.01.~2026.07.20.)으로서 학급회의에 2회 참여함. 맡은 과제를 끝까지 수행하며 도움이 필요할 때 질문함.";
    const protectedRecords = records.map(r => ({ ...r, text: original, protectedTerms: ["학급 회장", "학급회의"] }));
    for (const edit of [
        { from: "학급회의에 2회 참여함", to: "학급회의에 3회 참여함" },
        { from: "학급 회장", to: "학급 부회장" },
        { from: "학급회의에 2회 참여함", to: "학교 행사에 2회 참여함" },
        { from: "2026.07.20.", to: "2026.07.21." },
    ]) assert.equal(validatePolishCandidates(protectedRecords, { changes: [{ ...candidate(), edits: [edit] }] }).proposals.length, 0);
});

test("unknown IDs and duplicate candidate IDs cannot target students", () => {
    assert.equal(validatePolishCandidates(records, { changes: [candidate(40)] }).proposals.length, 0);
    assert.equal(validatePolishCandidates(records, { changes: [candidate(), candidate()] }).proposals.length, 0);
    const same = validatePolishCandidates(records, { changes: [candidate(1), candidate(2)] });
    assert.equal(same.proposals.length, 1);
});

test("polishing cannot add line breaks or remove sentence endings", () => {
    for (const edit of [
        { from: "도움이 필요할 때 질문함.", to: "도움이 필요하면 질문함" },
        { from: "친구의 의견을 경청하며", to: "친구의 의견에\n귀 기울이며" },
    ]) assert.equal(validatePolishCandidates(records, { changes: [{ ...candidate(), edits: [edit] }] }).proposals.length, 0);
});

test("semantic checker fails closed on missing, duplicate or negative verdict", () => {
    const positive = { studentId: 1, meaningPreserved: true, factsPreserved: true, evaluationPreserved: true };
    assert.equal(verifiedPolishProposals([proposal], { verdicts: [positive] }).length, 1);
    assert.equal(verifiedPolishProposals([proposal], { verdicts: [] }).length, 0);
    assert.equal(verifiedPolishProposals([proposal], { verdicts: [positive, positive] }).length, 0);
    for (const key of ["meaningPreserved", "factsPreserved", "evaluationPreserved"]) {
        assert.equal(verifiedPolishProposals([proposal], { verdicts: [{ ...positive, [key]: false }] }).length, 0);
    }
});

test("selected application preserves other students, metadata and original history", () => {
    const before = [student(1), { ...student(2), name: "로컬 이름", selected: true }];
    const result = applyPolishProposals(before, [proposal], "batch-1", "2026-11-05T00:00:00Z");
    assert.deepEqual(result.applied, [1]);
    assert.equal(result.students[1], before[1]);
    assert.equal(result.students[0].polishHistory[0].before, text);
    assert.equal(before[0].aiResult, text);
    assert.equal(result.students[0].aiResult, proposal.after);
});

test("late response never overwrites edited, generating, deleted or foreign records", () => {
    assert.deepEqual(applyPolishProposals([student(1, "직접 수정한 새 문장")], [proposal], "b", "now").applied, []);
    assert.deepEqual(applyPolishProposals([{ ...student(1), isGenerating: true }], [proposal], "b", "now").applied, []);
    assert.deepEqual(applyPolishProposals([student(2)], [proposal], "b", "now").skipped, [1]);
    const result = applyPolishProposals([student(1)], [proposal], "b", "now");
    assert.deepEqual(applyPolishProposals(result.students, [proposal], "b", "now").applied, []);
});

test("history survives JSON saving and undo restores exactly the original", () => {
    const applied = applyPolishProposals([student(1), student(2)], [proposal], "b", "2026-11-05T00:00:00Z");
    const loaded = JSON.parse(JSON.stringify(applied.students));
    assert.equal(latestPolishBatch(loaded).count, 1);
    const undone = undoPolishBatch(loaded, "b");
    assert.equal(undone.students[0].aiResult, text);
    assert.equal(undone.students[0].polishHistory.length, 0);
    assert.deepEqual(undone.restored, [1]);
});

test("undo preserves edits made after polishing and ignores another batch", () => {
    const applied = applyPolishProposals([student(1)], [proposal], "b", "2026-11-05T00:00:00Z").students;
    assert.deepEqual(undoPolishBatch(applied, "different").restored, []);
    applied[0].aiResult = "나중에 교사가 직접 수정한 문장";
    assert.equal(latestPolishBatch(applied).count, 0);
    const result = undoPolishBatch(applied, "b");
    assert.deepEqual(result.skipped, [1]);
    assert.equal(result.students[0].aiResult, applied[0].aiResult);
});

test("payload omits names and includes only nonempty records and protected creative terms", () => {
    const rows = [student(1), { ...student(2), name: "전송하면 안 되는 이름", participatedEvents: ["학급회의"], officerRole: "회장", officerPeriod: "2026.03.01.~2026.07.20." }, student(3, "")];
    const payload = toPolishRecords(rows, "creative");
    assert.equal(payload.length, 2);
    assert.ok(!JSON.stringify(payload).includes("전송하면 안 되는 이름"));
    assert.deepEqual(payload[1].protectedTerms, ["학급회의", "회장", "2026.03.01.~2026.07.20."]);
});
