import test from "node:test";
import assert from "node:assert/strict";
import core from "../docs/workspace-redesign-core.js";

const student = (id, extra = {}) => ({
  id, tags: ["학급회의", "안전교육"], availableTags: ["학급회의", "안전교육"],
  levels: ["상", "중", "하"], note: "관찰 메모", result: "기존 결과", status: "review",
  officerRole: "전교부회장", officerPeriod: "2026.03.01.~2026.08.31.", ...extra
});

test("전체·선택·개별 생성 대상과 기존 입력 조건을 구분한다", () => {
  const rows = [student(1), student(2, { tags: [] }), student(3, { tags: ["책임감"] })];
  assert.deepEqual(core.generationTargets(rows, "behavior", "all", new Set([3])).eligible.map(s => s.id), [1]);
  assert.deepEqual(core.generationTargets(rows, "creative", "selected", new Set([3])).eligible.map(s => s.id), [3]);
  assert.deepEqual(core.generationTargets(rows, "creative", "single", new Set([1]), 3).eligible.map(s => s.id), [3]);
  assert.equal(core.generationTargets(rows, "subject", "all", new Set()).eligible.length, 3);
  assert.equal(core.generationTargets([student(4, { levels: ["", "", ""] })], "subject", "all", new Set()).skipped.length, 1);
});

test("창체 CSV 왕복에서 임원·기간·따옴표·줄바꿈·활동 괄호를 보존한다", () => {
  const rows = [student(7, { tags: ["환경보호활동(학교숲 탐방 등)", "학급회의"], result: '친구의 "의견"을 듣고,\n함께 활동함.', status: "done" })];
  const csv = core.encodeCSV(core.exportRows(rows, "creative", 3));
  const parsed = core.importCSV(csv, "creative", [], 3).rows[0];
  for (const key of ["id", "tags", "note", "result", "status", "officerRole", "officerPeriod"]) assert.deepEqual(parsed[key], rows[0][key]);
  assert.deepEqual(core.parseCSV(csv)[0].slice(0, 5), ["번호", "참여 행사", "임원여부", "임원기간", "AI생성결과"]);
});

test("오래된 CSV에 임원 열이 없어도 같은 학생의 기존 정보와 추가 메타데이터를 보존한다", () => {
  const before = student(1, { polishHistory: { before: "원문", batchId: "example" } });
  const next = core.importCSV('번호,참여 행사,AI생성결과\n1,독서교육,수정 결과', "creative", [before], 3).rows[0];
  assert.equal(next.officerRole, before.officerRole);
  assert.equal(next.officerPeriod, before.officerPeriod);
  assert.equal(next.note, before.note);
  assert.deepEqual(next.polishHistory, before.polishHistory);
  assert.equal(before.result, "기존 결과");
});

test("잘못된 가져오기는 전체 적용 전에 거부하고 원본을 바꾸지 않는다", () => {
  const before = [student(1)];
  const original = structuredClone(before);
  assert.throws(() => core.importCSV("번호,키워드\n1,책임감\n1,성실함", "behavior", before, 3), /중복/);
  assert.throws(() => core.importCSV("번호,평가1\n1,최상", "subject", before, 3), /상·중·하/);
  assert.throws(() => core.parseCSV('번호,키워드\n1,"열린 따옴표'), /따옴표/);
  assert.deepEqual(before, original);
});

test("교과 CSV의 일부 평가를 갱신해도 다른 평가와 메모는 유지한다", () => {
  const next = core.importCSV("번호,평가1,평가2\n1,하,상", "subject", [student(1)], 3);
  assert.deepEqual(next.rows[0].levels, ["하", "상", "하"]);
  assert.equal(next.rows[0].note, "관찰 메모");
  assert.equal(next.rows[0].result, "기존 결과");
});

test("행사 배정은 직책·기간·결과를 유지하며 선택된 인원만 반환한다", () => {
  const rows = [student(1), student(8)];
  const original = structuredClone(rows);
  const next = core.distribute(rows, ["독서교육", "학급회의", "체육대회", "교통안전교육"], 3, true);
  assert.deepEqual(next.map(s => s.id), [1, 8]);
  for (let i = 0; i < next.length; i++) {
    assert.equal(new Set(next[i].tags).size, 3);
    for (const key of ["officerRole", "officerPeriod", "result", "note"]) assert.equal(next[i][key], rows[i][key]);
  }
  assert.deepEqual(rows, original);
  assert.ok(core.distribute(rows, ["독서교육"], 3, false).every(s => s.tags.includes("안전교육") && s.tags.includes("독서교육")));
});
