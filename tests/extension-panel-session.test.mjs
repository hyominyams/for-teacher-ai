import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = name => readFileSync(new URL(`../extension/${name}`, import.meta.url), "utf8");
const origin = "https://for-teacher-ai.vercel.app";
const extension = "chrome-extension://test";
const projectId = "20000000-0000-4000-8000-000000000001";
const math = "20000000-0000-4000-8000-000000000002";
const korean = "20000000-0000-4000-8000-000000000003";
const outside = "20000000-0000-4000-8000-000000000004";
const popup = { id: "test", url: `${extension}/popup.html` };
const panel = { id: "test", tab: { id: 8 } };

function harness() {
  let listener, removeTab, now = 1000;
  const stored = {};
  const local = { forteacherSession: { user: { id: "teacher" }, access_token: "test-token" }, forteacherAppOrigin: origin };
  const requests = [];
  const log = { id: korean, category: "subject", project: { id: projectId }, revision: 3, title: "국어", data: { students: [{ id: 1, aiResult: "학생 문장" }] } };
  const chromeStorage = data => ({
    async get(keys) {
      if (keys === null) return { ...data };
      const names = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(names.map(key => [key, data[key]]));
    },
    async set(values) { Object.assign(data, values); },
    async remove(keys) { for (const key of [].concat(keys)) delete data[key]; }
  });
  const context = vm.createContext({
    Date: { now: () => now }, AbortSignal, crypto,
    chrome: {
      runtime: { id: "test", getURL: file => `${extension}/${file}`, onMessage: { addListener: fn => { listener = fn; } } },
      tabs: { onRemoved: { addListener: fn => { removeTab = fn; } } },
      storage: { local: chromeStorage(local), session: chromeStorage(stored) }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => log };
    },
    importScripts: (...files) => files.forEach(name => vm.runInContext(source(name), context))
  });
  vm.runInContext(source("panel-session.js"), context);
  const send = (message, sender) => new Promise(resolve => {
    if (listener(message, sender, resolve) !== true) resolve(undefined);
  });
  const open = (sender = popup) => send({
    type: "neis-panel-open", tabId: 8, owner: "teacher", projectId, logId: math,
    category: "subject", subjectIds: [math, korean], page: 2
  }, sender);
  const read = (id, logId = korean, sender = panel) => send({ type: "neis-panel-read", id, logId, remember: true }, sender);
  return { open, read, send, removeTab, local, stored, requests, log, advance: ms => { now += ms; } };
}

test("a NEIS tab fetches a permitted subject fresh, and remembers its choice without storing bodies", async () => {
  const h = harness();
  const opened = await h.open();
  assert.equal(opened.ok, true);
  const loaded = await h.read(opened.id);
  assert.equal(loaded.records[0].text, "학생 문장");
  assert.equal(loaded.revision, 3);
  assert.equal(h.requests[0].url, `${origin}/api/work-logs/${korean}`);
  assert.equal(h.requests[0].options.cache, "no-store");
  assert.equal(h.requests[0].options.headers.Authorization, "Bearer test-token");
  assert.equal(h.local[`neisUploadLastWorkLog:${JSON.stringify([origin, "teacher", "subject"])}`].detailId, korean);
  assert.ok(!JSON.stringify(h.stored).includes("학생 문장"));
  assert.ok(!JSON.stringify(h.local).includes("학생 문장"));
  assert.ok(!JSON.stringify(opened).includes("test-token"));
});

test("the worker rejects untrusted registration, other tabs, other subjects, stale accounts and expired panels", async () => {
  const h = harness();
  assert.equal((await h.open({ ...panel, url: "https://neis.example" })).ok, false);
  const opened = await h.open();
  assert.equal((await h.read(opened.id, korean, { ...panel, id: "other-extension" })), undefined);
  assert.equal((await h.read(opened.id, korean, { ...panel, tab: { id: 9 } })).ok, false);
  assert.equal((await h.read(opened.id, outside)).ok, false);
  h.local.forteacherSession.user.id = "different";
  assert.equal((await h.read(opened.id)).ok, false);
  h.local.forteacherSession.user.id = "teacher";
  h.advance(30 * 60 * 1000);
  assert.equal((await h.read(opened.id)).ok, false);
  assert.equal(h.requests.length, 0);
});

test("reset and tab closure revoke the panel, and archived or moved subjects return no data", async () => {
  const h = harness();
  const opened = await h.open();
  h.log.archived_at = "2026-11-27";
  assert.equal((await h.read(opened.id)).ok, false);
  h.log.archived_at = null;
  h.log.project.id = outside;
  assert.equal((await h.read(opened.id)).ok, false);
  assert.equal((await h.send({ type: "neis-panel-reset" }, popup)).ok, true);
  assert.equal((await h.read(opened.id)).ok, false);
  const replacement = await h.open();
  h.removeTab(8);
  assert.equal((await h.read(replacement.id)).ok, false);
});
