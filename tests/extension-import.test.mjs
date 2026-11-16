import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const XLSX = require("../extension/vendor/xlsx.full.min.js");
const context = vm.createContext({ TextDecoder, Uint8Array, XLSX });
vm.runInContext(readFileSync(new URL("../extension/file-import.js", import.meta.url), "utf8"), context);
const importer = context.ForTeacherImport;
const plain = (value) => JSON.parse(JSON.stringify(value));
const csvFile = (text, name = "test.csv") => {
  const data = new TextEncoder().encode(text);
  return { name, size: data.length, arrayBuffer: async () => data.buffer };
};

test("all three downloaded templates import without changing student data", () => {
  for (const category of Object.keys(importer.categories)) {
    const { csv, filename } = importer.template(category);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(filename.endsWith(".csv"));
    assert.deepEqual(plain(importer.parseText(csv, category)), [{
      id: "1", name: "김예시", text: importer.categories[category].example, category
    }]);
  }
});

test("column order, optional names, quoted commas/quotes/newlines, gaps and sorting", () => {
  const records = importer.parseText('내용,번호,이름\r\n"쉼표, 그리고 ""인용""\n둘째 줄",03,홍길동\r\n첫째,1,\r\n,,\r\n', "behavior");
  assert.deepEqual(plain(records), [
    { id: "1", name: "", text: "첫째", category: "behavior" },
    { id: "3", name: "홍길동", text: '쉼표, 그리고 "인용"\n둘째 줄', category: "behavior" }
  ]);
  assert.equal(importer.parseText("번호\t내용\n1\t클립보드", "subject")[0].text, "클립보드");
});

test("existing web app CSV exports keep the final AI result, ignoring input fields", () => {
  const exports = {
    behavior: '번호,키워드,AI생성결과\n1,"성실,배려",행특 결과',
    creative: '번호,참여 행사,임원여부,임원기간,AI생성결과\n1,자치활동,반장,3월~8월,창체 결과',
    subject: '번호,평가1,개별특이사항,AI생성결과\n1,상,메모,교과 결과'
  };
  for (const [category, csv] of Object.entries(exports)) {
    assert.match(importer.parseText(csv, category)[0].text, /결과$/);
  }
  assert.equal(importer.parseText('번호,이름,작성 결과\n1,김예시,작업로그 결과', "subject")[0].text, "작업로그 결과");
});

test("invalid schemas and rows are rejected with actionable errors", () => {
  const cases = [
    ["이름,내용\n김예시,기록", /번호 열/],
    ["번호,키워드\n1,성실", /내용 열/],
    ["번호,내용\n1,기록\n01,다른 기록", /3행.*중복/],
    ["번호,내용\n-1,기록", /2행.*정수/],
    ["번호,내용\n1,", /2행.*비어/],
    ["번호,내용\n1,문장,쉼표", /2행.*열 개수/],
    ['번호,내용\n1,"닫히지 않음', /따옴표/],
    ['번호,내용\n1,"닫힘"잘못', /따옴표/],
    ["번호,내용,AI생성결과\n1,하나,둘", /여러 개/],
    ["번호,창체\n1,기록", /창체.*영역/],
    ["번호,내용\n", /내용이 없습니다/]
  ];
  for (const [csv, error] of cases) assert.throws(() => importer.parseText(csv, "behavior"), error);
});

test("CSV UTF-8 and Korean Excel legacy encoding are supported", async () => {
  assert.equal((await importer.parseFile(csvFile("번호,내용\n1,한글 기록"), "behavior")).records[0].text, "한글 기록");
  const bytes = Uint8Array.from([0xb9, 0xf8, 0xc8, 0xa3, 44, 0xb3, 0xbb, 0xbf, 0xeb, 10, 49, 44, 0xc7, 0xd1, 0xb1, 0xdb]);
  assert.equal((await importer.parseFile({ name: "legacy.csv", size: bytes.length, arrayBuffer: async () => bytes.buffer }, "behavior")).records[0].text, "한글");
});

test("real XLSX bytes use the first sheet, preserve multiline text and validate columns", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["번호", "이름", "학기말 종합의견"], [3, "홍예시", "줄1\n줄2"], [1, "", "내용, 쉼표"]
  ]), "국어");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["잘못된 열"]]), "둘째 시트");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const result = await importer.parseFile({ name: "교과.XLSX", size: bytes.length, arrayBuffer: async () => bytes }, "subject");
  assert.equal(result.sheetName, "국어");
  assert.deepEqual(plain(result.records).map(({ id, text }) => ({ id, text })), [
    { id: "1", text: "내용, 쉼표" }, { id: "3", text: "줄1\n줄2" }
  ]);
  await assert.rejects(() => importer.parseFile({ name: "test.xlsx", size: bytes.length, arrayBuffer: async () => bytes }, "behavior"), /학기말종합/);
});

test("empty/corrupt/unsupported/oversized files and excess rows fail before applying", async () => {
  await assert.rejects(() => importer.parseFile(csvFile("", "empty.csv"), "behavior"), /데이터가 없습니다/);
  await assert.rejects(() => importer.parseFile(csvFile("번호,내용\n1,기록", "fake.xlsx"), "behavior"), /올바른 XLSX/);
  await assert.rejects(() => importer.parseFile(csvFile("PK\u0003\u0004broken", "broken.xlsx"), "behavior"), /엑셀 파일/);
  await assert.rejects(() => importer.parseFile(csvFile("text", "test.xls"), "behavior"), /CSV 또는 XLSX/);
  await assert.rejects(() => importer.parseFile({ size: 6 * 1024 * 1024 }, "behavior"), /5MB/);
  assert.throws(() => importer.rowsToRecords([["번호", "내용"], ...Array.from({ length: 2001 }, (_, i) => [i + 1, "기록"])], "behavior"), /2000명/);
});
