import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkData, parseSavedLogInput, workLogCsv, workFingerprint, defaultWorkTitle, isUuid } from "../lib/work-logs.ts";
const id = "fa4971cd-2e54-41aa-a524-482e03c3729d";
const raw = { students: [{ id: 1, aiResult: '첫째 결과, "인용"\n둘째 줄', isGenerating: true, selected: true, polishHistory: [{ before: "원문", after: "윤문", batchId: "b", createdAt: "2026-11-05" }] }, { id: 2, aiResult: "둘째 학생" }], studentCount: 2, charLimit: 200 };
test("saved data clears transient flags but preserves result and polish originals", () => {
    const result = normalizeWorkData(raw, "behavior");
    assert.equal(result.students[0].isGenerating, false); assert.equal(result.students[0].selected, false);
    assert.equal(result.students[0].polishHistory[0].before, "원문"); assert.equal(result.charLimits.behavior, 200);
    assert.equal(raw.students[0].isGenerating, true);
});
test("legacy subject data becomes a stable complete editor configuration", () => {
    const result = normalizeWorkData(raw, "subject");
    assert.equal(result.globalConfig.schoolLevel, "elementary");
    assert.equal(workFingerprint(result, "제목"), workFingerprint(normalizeWorkData(result, "subject"), "제목"));
});
test("JSONB object-key ordering never marks an unchanged record as dirty", () => {
    const value = normalizeWorkData(raw, "subject");
    const reorder = v => Array.isArray(v) ? v.map(reorder) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, item]) => [k, reorder(item)])) : v;
    assert.equal(workFingerprint(value, "제목"), workFingerprint(reorder(value), "제목"));
    assert.notEqual(workFingerprint(value, "제목"), workFingerprint({ ...value, students: [...value.students].reverse() }, "제목"));
});
test("invalid IDs, duplicate student numbers and unknown categories are rejected", () => {
    assert.ok(isUuid(id)); assert.ok(!isUuid("../other"));
    assert.throws(() => parseSavedLogInput({ id, title: "제목", category: "other", data: raw }));
    assert.throws(() => normalizeWorkData({ ...raw, students: [raw.students[0], raw.students[0]] }, "behavior"));
    assert.throws(() => parseSavedLogInput({ id, title: " ", category: "behavior", data: raw }));
    assert.throws(() => parseSavedLogInput({ id, title: "제목", category: "behavior", data: raw, revision: 0 }, true));
});
test("new working fields cannot modify an independent saved snapshot", () => {
    const saved = JSON.parse(JSON.stringify(normalizeWorkData(raw, "behavior")));
    const newDraft = normalizeWorkData({ ...raw, students: raw.students.map(s => ({ ...s, aiResult: "", selectedKeywords: [] })) }, "behavior");
    assert.equal(newDraft.students[0].aiResult, ""); assert.equal(saved.students[0].aiResult, raw.students[0].aiResult);
});
test("CSV quotes commas, quotes and multiline text and includes category inputs", () => {
    const csv = workLogCsv({ category: "behavior", data: normalizeWorkData(raw, "behavior") });
    assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes('"첫째 결과, ""인용""\n둘째 줄"'));
    assert.ok(csv.includes("참여 행사")); assert.ok(csv.includes("평가 수준"));
});
test("default record title uses Korean local date across UTC midnight", () => {
    assert.ok(defaultWorkTitle("behavior", "", new Date("2026-11-04T16:00:00Z")).includes("11. 05"));
});
