import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const popup = readFileSync(new URL("../extension/popup.js", import.meta.url), "utf8").replace("void init();", "");
const importer = readFileSync(new URL("../extension/file-import.js", import.meta.url), "utf8");
const workLogRecords = readFileSync(new URL("../extension/work-log-records.js", import.meta.url), "utf8");
const copy = (value) => JSON.parse(JSON.stringify(value));

async function harness(saved = {}) {
  const elements = new Map();
  const storage = copy(saved);
  const requests = [], injections = [], storageListeners = [];
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const node = {
      id, value: "", textContent: "", disabled: false, listeners: {},
      classList: { toggle() {} }, parentElement: { classList: { toggle() {} } },
      addEventListener(event, handler) { this.listeners[event] = handler; },
      querySelectorAll() { return []; }, setAttribute() {}, removeAttribute() {},
      get selectedIndex() { return this.options?.findIndex((option) => option.value === this.value) || 0; },
      get innerHTML() { return this.html || ""; },
      set innerHTML(value) {
        this.html = value;
        if (id === "workLog") this.value = value.match(/<option value="([^"]*)"/)?.[1] || "";
      }
    };
    elements.set(id, node);
    return node;
  }
  const category = element("category");
  category.options = [{ value: "behavior", text: "행특" }, { value: "subject", text: "학기말 종합의견" }, { value: "creative", text: "창체(자율)" }];
  category.value = "behavior";
  element("logState").value = "editable";
  element("delay").value = "300";
  const radios = [element("webRadio"), element("csvRadio")];
  radios[0].value = "web"; radios[1].value = "csv";
  const details = new Map();
  const getLog = (category, state = "editable") => {
    const id = `${category}-${state}`;
    if (!details.has(id)) details.set(id, {
      id, category, title: `${category} ${state}`, revision: 1,
      updated_at: "2026-11-05T01:00:00Z", archived_at: state === "archived" ? "2026-11-04" : null,
      completed_count: 1, student_count: 2,
      data: { students: [{ id: "1", name: "검증학생", aiResult: `${id} 결과` }, { id: "2", aiResult: "" }] }
    });
    return details.get(id);
  };
  const context = vm.createContext({
    TextDecoder, Uint8Array, URLSearchParams, Date, console,
    document: { getElementById: element, querySelectorAll: () => radios },
    window: { FORTEACHER_EXTENSION_CONFIG: { appOrigin: "https://example.test" } },
    chrome: {
      runtime: { sendMessage: async () => ({ ok: true, id: "test-panel", expiresAt: Date.now() + 1800000 }) },
      storage: {
        local: {
          get: async () => copy(storage),
          set: async (patch) => Object.assign(storage, copy(patch)),
          remove: async (keys) => keys.forEach((key) => delete storage[key])
        },
        onChanged: { addListener: (callback) => storageListeners.push(callback) }
      },
      tabs: { query: async () => [{ id: 1 }] },
      scripting: { executeScript: async (request) => { injections.push(copy(request.args)); return [{ result: { ok: true, count: 1 } }]; } }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      const parsed = new URL(url);
      let body;
      if (parsed.pathname === "/api/work-logs") body = { logs: [getLog(parsed.searchParams.get("category"), parsed.searchParams.get("state"))], total: 31 };
      else body = details.get(decodeURIComponent(parsed.pathname.split("/").at(-1)));
      return { ok: Boolean(body), status: body ? 200 : 404, json: async () => copy(body || { error: "없음" }) };
    }
  });
  vm.runInContext(importer, context);
  vm.runInContext(workLogRecords, context);
  vm.runInContext(popup, context);
  await context.init();
  const change = async (id, value) => { element(id).value = value; await element(id).listeners.change(); };
  const click = async (id) => element(id).listeners.click();
  return { context, storage, element, radios, details, requests, injections, storageListeners, change, click };
}

const session = { access_token: "test-token", user: { id: "test-owner", email: "teacher@example.test" } };

test("saved log selection, paging and latest revision review survive file feature merge", async () => {
  const h = await harness({ forteacherSession: session, neisUploadRecords: [{ id: "99", text: "stale web" }] });
  assert.equal(h.storage.neisUploadRecords, undefined);
  assert.ok(h.element("openOverlay").disabled);
  await h.click("loadWebData");
  assert.match(h.element("recordTable").innerHTML, /behavior-editable 결과/);
  assert.equal(h.element("recordCount").textContent, "1명");
  h.details.get("behavior-editable").revision = 2;
  h.details.get("behavior-editable").data.students[0].aiResult = "최신 윤문 결과";
  await h.click("openOverlay");
  assert.equal(h.injections.length, 0);
  assert.match(h.element("status").textContent, /최신 내용을 불러왔습니다/);
  await h.click("openOverlay");
  assert.equal(h.injections[0][1].records[0].text, "최신 윤문 결과");
  assert.equal(h.injections[0][1].matchStudentNumber, false);
  await h.click("nextPage");
  assert.match(h.requests.at(-1).url, /page=1/);
  await h.change("category", "subject");
  assert.equal(h.element("recordCount").textContent, "0명");
  assert.match(h.element("subjectTabs").innerHTML, /subject editable/);
  await h.context.loadLogDetail("subject-editable", true);
  assert.match(h.element("recordTable").innerHTML, /subject-editable 결과/);
  assert.ok(h.requests.every((request) => request.options.cache === "no-store"));
  assert.ok(!JSON.stringify(h.storage).includes("최신 윤문 결과"));
  assert.ok(!JSON.stringify(h.storage).includes("subject-editable 결과"));
});

test("file buckets persist independently, failed imports preserve data, and logout clears students", async () => {
  const h = await harness({ neisUploadSource: "csv", neisUploadCsvRecords: [{ id: "1", text: "기존 CSV" }] });
  assert.equal(h.element("recordCount").textContent, "1명");
  assert.equal(h.storage.neisUploadCsvRecords, undefined);
  await h.context.importRecords(async () => ({ records: [{ id: "3", text: "파일 행특" }] }), "행특.csv");
  await h.context.importRecords(async () => { throw new Error("중복 번호"); }, "오류.csv");
  assert.match(h.element("recordTable").innerHTML, /파일 행특/);
  assert.match(h.element("status").textContent, /기존 목록은 유지/);
  await h.change("category", "subject");
  assert.ok(h.element("openOverlay").disabled);
  await h.context.importRecords(async () => ({ records: [{ id: "1", text: "엑셀 교과" }], sheetName: "국어" }), "국어.xlsx");
  await h.change("category", "behavior");
  assert.match(h.element("recordTable").innerHTML, /파일 행특/);
  const restored = await harness(h.storage);
  assert.match(restored.element("recordTable").innerHTML, /파일 행특/);
  await restored.change("category", "subject");
  assert.match(restored.element("recordSummary").textContent, /국어.xlsx · 국어/);
  await restored.click("openOverlay");
  assert.equal(restored.injections[0][1].category, "subject");
  assert.equal(restored.injections[0][1].matchStudentNumber, true);
  await restored.click("logoutWebApp");
  assert.equal(restored.element("recordCount").textContent, "0명");
  assert.equal(restored.storage.neisUploadFileRecordsByCategory, undefined);
});

test("pending import cannot repopulate another area or undo reset", async () => {
  for (const action of ["category", "resetData"]) {
    const h = await harness({ neisUploadSource: "csv" });
    let resolve;
    const pending = h.context.importRecords(() => new Promise((done) => { resolve = done; }), "slow.csv");
    if (action === "category") await h.change("category", "creative");
    else await h.click("resetData");
    resolve({ records: [{ id: "1", text: "늦게 읽은 파일" }] });
    await pending;
    assert.equal(h.element("recordCount").textContent, "0명");
    assert.ok(!JSON.stringify(h.storage).includes("늦게 읽은 파일"));
  }
});

test("account changes invalidate a loaded web result before any new request completes", async () => {
  const h = await harness({ forteacherSession: session });
  await h.click("loadWebData");
  h.storageListeners[0]({ forteacherSession: { newValue: { access_token: "new-owner-token", user: { id: "new-owner" } } } }, "local");
  assert.equal(h.element("recordCount").textContent, "0명");
  assert.ok(h.element("openOverlay").disabled);
});
