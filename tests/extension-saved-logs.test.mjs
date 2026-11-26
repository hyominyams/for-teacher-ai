import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../extension/popup.js', import.meta.url), 'utf8');
const importer = readFileSync(new URL('../extension/file-import.js', import.meta.url), 'utf8');
const account = { access_token: 'test-token', user: { id: 'user-a', email: 'test@example.invalid' } };
const log = (id, category = 'behavior', archived = false) => ({
  id, category, title: `${id} 반`, revision: 1, student_count: 3, completed_count: 2,
  archived_at: archived ? '2026-11-05T00:00:00Z' : null, updated_at: '2026-11-05T00:00:00Z',
  data: { students: [{ id: 2, aiResult: `${id} 학생 2 결과` }, { id: 1, aiResult: `${id} 학생 1 결과` }, { id: 3, aiResult: ' ' }] }
});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(r => setImmediate(r));

async function setup({ saved = {}, handler = () => ({ logs: [], total: 0 }) } = {}) {
  const elements = new Map();
  class Element {
    value = ''; disabled = false; textContent = ''; handlers = {}; options = []; checked = false;
    attributes = {}; dataset = {}; tabs = [];
    classList = { toggle() {} };
    addEventListener(name, callback) { this.handlers[name] = callback; }
    querySelectorAll() { return this.tabs; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    focus() { this.hasFocus = true; }
    closest() { return this; }
    set innerHTML(value) {
      this.html = value;
      if (value.includes('<option')) {
        this.options = [...value.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(m => ({ value: m[1], text: m[2] }));
        this.value = this.options[0]?.value || '';
      }
      this.tabs = [...value.matchAll(/data-log-id="([^"]*)"/g)].map(match => {
        const tab = new Element(); tab.dataset.logId = match[1]; return tab;
      });
    }
    get innerHTML() { return this.html || ''; }
    get selectedIndex() { return this.options.findIndex(o => o.value === this.value); }
  }
  const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  element('category').options = [{ value: 'behavior', text: '행특' }, { value: 'subject', text: '학기말 종합의견' }, { value: 'creative', text: '창체' }];
  element('category').value = 'behavior'; element('logState').value = 'editable';
  const radios = ['web', 'csv'].map(id => { const e = element(id); e.value = id; return e; });
  const data = { forteacherSession: account, ...saved }, listeners = [], calls = [], injections = [];
  const storage = {
    async get(keys) { return Object.fromEntries(keys.map(k => [k, data[k]])); },
    async set(values) { const changes = {}; for (const [k, v] of Object.entries(values)) { changes[k] = { oldValue: data[k], newValue: v }; data[k] = v; } listeners.forEach(fn => fn(changes, 'local')); },
    async remove(keys) { const changes = {}; for (const k of keys) { changes[k] = { oldValue: data[k] }; delete data[k]; } listeners.forEach(fn => fn(changes, 'local')); }
  };
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => radios },
    window: { FORTEACHER_EXTENSION_CONFIG: { appOrigin: 'https://for-teacher-ai.vercel.app' } },
    chrome: { storage: { local: storage, onChanged: { addListener: fn => listeners.push(fn) } }, tabs: { query: async () => [{ id: 10 }] }, scripting: { executeScript: async payload => { injections.push(payload); return [{ result: { ok: true } }]; } } },
    fetch: async (url, options) => { calls.push({ url, options }); const result = await handler(url, options); return { status: result?.status || 200, ok: !(result?.status >= 400), json: async () => result?.body || result }; },
    URLSearchParams, Date, TextDecoder, Uint8Array, console, navigator: { clipboard: { readText: async () => '' } }
  });
  vm.runInContext(importer, context);
  vm.runInContext(source, context);
  await tick(); await tick();
  const emit = async (id, event = 'click', value, details) => { if (value !== undefined) element(id).value = value; await element(id).handlers[event](details); await tick(); };
  return { element, emit, context, data, storage, calls, injections };
}

test('all categories select independent saved logs; old unowned cache is discarded', async () => {
  const a = log('a'), b = log('b');
  const t = await setup({ saved: { neisUploadRecords: [{ text: 'stale' }], neisUploadWebRecordsByCategory: { behavior: ['stale'] } }, handler: url => url.includes('?') ? { logs: [a, b], total: 2 } : b });
  assert.equal(t.element('recordCount').textContent, '0명');
  assert.equal(t.element('workLog').options.length, 2);
  assert.equal(t.data.neisUploadRecords, undefined);
  await t.emit('workLog', 'change', 'b'); await t.emit('loadWebData');
  assert.equal(t.element('recordCount').textContent, '2명');
  assert.match(t.element('recordTable').innerHTML, /b 학생 1 결과/);
  assert.ok(t.element('recordTable').innerHTML.indexOf('b 학생 1') < t.element('recordTable').innerHTML.indexOf('b 학생 2'));
  assert.equal(t.data.neisUploadRecords, undefined, 'web student data is not persisted');
  await t.emit('openOverlay');
  assert.equal(t.injections.length, 1);
  assert.equal(t.injections[0].args[1].categoryLabel, '행특 · b 반');
  assert.equal(t.calls.every(c => !c.options.method || c.options.method === 'GET'), true);
});

test('archived records stay out of the chooser and cannot enter the paste panel', async () => {
  const active = log('active');
  const archived = log('archived', 'behavior', true);
  let moved = false;
  const t = await setup({ handler: url => url.includes('?') ? { logs: [active, archived], total: 2 } : { ...active, archived_at: moved ? archived.archived_at : null } });
  assert.deepEqual(t.element('workLog').options.map(o => o.value), ['active']);
  await t.emit('loadWebData');
  assert.equal(t.element('recordCount').textContent, '2명');
  moved = true;
  await t.emit('openOverlay');
  assert.equal(t.injections.length, 0);
  assert.equal(t.element('openOverlay').disabled, true);
  assert.ok(t.calls[0].url.includes('state=editable'));
});

test('empty refresh and failed refresh invalidate old loaded results', async () => {
  const a = log('a'); let mode = 'ok';
  const t = await setup({ handler: url => mode === 'error' ? { status: 500, body: { error: 'test failure' } } : url.includes('?') ? { logs: mode === 'empty' ? [] : [a], total: mode === 'empty' ? 0 : 1 } : a });
  await t.emit('loadWebData'); assert.equal(t.element('openOverlay').disabled, false);
  mode = 'empty'; await t.emit('refreshLogs');
  assert.equal(t.element('recordCount').textContent, '0명'); assert.equal(t.element('openOverlay').disabled, true);
  mode = 'ok'; await t.emit('refreshLogs'); await t.emit('loadWebData');
  mode = 'error'; await t.emit('refreshLogs');
  assert.equal(t.element('recordCount').textContent, '0명'); assert.equal(t.element('loadWebData').disabled, true);
});

test('delayed detail response cannot repopulate results after category change', async () => {
  const a = log('a'), pending = deferred();
  const t = await setup({ handler: url => url.includes('?') ? { logs: [a], total: 1 } : pending.promise });
  const load = t.emit('loadWebData'); await tick();
  await t.emit('category', 'change', 'subject'); pending.resolve(a); await load;
  assert.equal(t.element('recordCount').textContent, '0명'); assert.equal(t.element('openOverlay').disabled, true);
});

test('account switch and logout clear loaded records; late old-account requests are ignored', async () => {
  const a = log('a'), pending = deferred(); let detail = false;
  const t = await setup({ handler: url => url.includes('?') ? { logs: [a], total: 1 } : detail ? pending.promise : a });
  await t.emit('loadWebData');
  detail = true; const loading = t.emit('loadWebData'); await tick();
  await t.storage.set({ forteacherSession: { access_token: 'new-token', user: { id: 'user-b', email: 'b@example.invalid' } } });
  pending.resolve(a); await loading; await tick();
  assert.equal(t.element('recordCount').textContent, '0명');
  await t.emit('logoutWebApp');
  assert.equal(t.data.forteacherSession, undefined); assert.equal(t.element('openOverlay').disabled, true);
});

test('401 explains reconnect and keeps insertion disabled', async () => {
  const t = await setup({ handler: () => ({ status: 401, body: {} }) });
  assert.match(t.element('status').textContent, /계정 다시 연결/);
  assert.equal(t.element('connectWebApp').disabled, false);
  assert.equal(t.element('openOverlay').disabled, true);
});

test('paginated metadata requests allow older logs without fetching student bodies', async () => {
  const t = await setup({ handler: () => ({ logs: [log('a')], total: 61 }) });
  await t.emit('nextPage'); assert.match(t.calls.at(-1).url, /page=1/);
  await t.emit('nextPage'); assert.match(t.calls.at(-1).url, /page=2/);
  assert.equal(t.element('nextPage').disabled, true);
  await t.emit('previousPage'); assert.match(t.calls.at(-1).url, /page=1/);
  assert.equal(t.element('recordCount').textContent, '0명');
});

test('updated revision requires reviewing fresh preview before panel injection', async () => {
  const a = log('a'); let revision = 1;
  const t = await setup({ handler: url => url.includes('?') ? { logs: [a], total: 1 } : { ...a, revision, data: { students: [{ id: 1, aiResult: `revision ${revision}` }] } } });
  await t.emit('loadWebData'); revision = 2; await t.emit('openOverlay');
  assert.equal(t.injections.length, 0); assert.match(t.element('recordTable').innerHTML, /revision 2/);
  await t.emit('openOverlay'); assert.equal(t.injections.length, 1);
});

test('new work-log CSV header, quoted multiline text and independent CSV source work', async () => {
  const t = await setup();
  const parsed = vm.runInContext('ForTeacherImport.parseText(\'번호,작성 결과,비고\\n2,"인용 ""문구""\\n다음 문장",메모\\n1,첫째 결과,메모\', \'behavior\')', t.context);
  assert.equal(parsed[0].id, '1'); assert.equal(parsed[1].text, '인용 "문구"\n다음 문장');
  await t.emit('csv', 'change');
  const csv = new TextEncoder().encode('번호,작성 결과\n1,CSV 결과');
  t.element('csvFile').files = [{ name: 'result.csv', size: csv.length, arrayBuffer: async () => csv.buffer }];
  await t.emit('csvFile', 'change'); assert.equal(t.element('recordCount').textContent, '1명');
  await t.emit('web', 'change'); assert.equal(t.element('recordCount').textContent, '0명');
  await t.emit('csv', 'change'); assert.equal(t.element('recordCount').textContent, '1명');
  await t.emit('category', 'change', 'subject');
  assert.equal(t.element('recordCount').textContent, '0명');
  await t.emit('csvFile', 'change'); await t.emit('openOverlay');
  assert.equal(t.injections[0].args[1].category, 'subject');
  await t.emit('resetData'); assert.equal(t.data.neisUploadCsvRecords, undefined);
});

test('popup markup escapes saved titles and generated text', async () => {
  const a = log('a'); a.title = '<img src=x onerror=alert(1)>';
  a.data.students = [{ id: 1, aiResult: '<script>bad()</script>' }];
  const t = await setup({ handler: url => url.includes('?') ? { logs: [a], total: 1 } : a });
  assert.doesNotMatch(t.element('workLog').innerHTML, /<img/);
  await t.emit('loadWebData'); assert.doesNotMatch(t.element('recordTable').innerHTML, /<script/);
});


test('upgrading never reuses legacy web records even if the old popup had switched to CSV', async () => {
  const t = await setup({ saved: { neisUploadSource: 'csv', neisUploadRecords: [{ id: 1, text: 'unowned old web result' }] } });
  assert.equal(t.element('recordCount').textContent, '0명');
  assert.equal(t.data.neisUploadRecords, undefined);
});

test('selecting a project immediately presents every subject tab and loads only the selected records', async () => {
  const project = { id: 'project-1', title: '2학기 <6학년>' };
  const math = { ...log('math', 'subject'), project, subject_name: '수학' };
  const korean = { ...log('korean', 'subject'), project, subject_name: '국어' };
  const t = await setup({
    saved: { neisUploadCategory: 'subject' },
    handler: url => {
      const { pathname, searchParams } = new URL(url);
      if (searchParams.has('project')) return { logs: searchParams.get('page') === '0' ? [math] : [korean], total: 2 };
      if (pathname === '/api/work-logs') return { logs: [math, korean], total: 2 };
      return pathname.endsWith('/math') ? math : korean;
    },
  });
  assert.match(t.element('workLog').innerHTML, /2학기 &lt;6학년&gt;/);
  assert.deepEqual(t.element('workLog').options.map(option => option.value), ['project:project-1']);
  assert.deepEqual(t.element('subjectTabs').tabs.map(tab => tab.dataset.logId), ['math', 'korean']);
  assert.match(t.element('subjectTabs').innerHTML, />국어<\/button>/);
  assert.equal(t.element('recordCount').textContent, '0명');
  assert.equal(t.element('openOverlay').disabled, true);
  assert.ok(t.calls.some(c => c.url.includes('project=project-1') && c.url.includes('page=1')));
  assert.ok(t.calls.every(c => new URL(c.url).pathname === '/api/work-logs'));
  const [mathTab, koreanTab] = t.element('subjectTabs').tabs;
  await t.emit('subjectTabs', 'keydown', undefined, { key: 'ArrowRight', target: mathTab, preventDefault() {} });
  assert.equal(koreanTab.hasFocus, true);
  await t.emit('subjectTabs', 'click', undefined, { target: koreanTab });
  assert.equal(koreanTab.attributes['aria-selected'], 'true');
  assert.equal(t.element('recordCount').textContent, '2명');
  assert.match(t.element('recordTable').innerHTML, /korean 학생 1 결과/);
  assert.doesNotMatch(t.element('recordTable').innerHTML, /math 학생/);
  await t.emit('openOverlay');
  assert.equal(t.injections[0].args[1].categoryLabel, '2학기 <6학년> · 국어');
  assert.ok(t.injections[0].args[1].records.every(r => r.text.startsWith('korean')));
});

test('a late result cannot replace a newer subject tab selection', async () => {
  const project = { id: 'project-1', title: '교과 프로젝트' };
  const math = { ...log('math', 'subject'), project };
  const korean = { ...log('korean', 'subject'), project };
  const pending = deferred();
  const t = await setup({
    saved: { neisUploadCategory: 'subject' },
    handler: url => url.includes('?') ? { logs: [math, korean], total: 2 } : url.endsWith('/math') ? pending.promise : korean,
  });
  const [mathTab, koreanTab] = t.element('subjectTabs').tabs;
  const loading = t.emit('subjectTabs', 'click', undefined, { target: mathTab }); await tick();
  assert.equal(t.element('openOverlay').disabled, true);
  await t.emit('subjectTabs', 'click', undefined, { target: koreanTab });
  pending.resolve(math); await loading;
  assert.match(t.element('recordTable').innerHTML, /korean 학생 1 결과/);
  assert.doesNotMatch(t.element('recordTable').innerHTML, /math 학생/);
  await t.emit('logoutWebApp');
  assert.equal(t.element('subjectTabs').tabs.length, 0);
  assert.equal(t.element('openOverlay').disabled, true);
});

test('a standalone subject also waits for its named tab before reading student results', async () => {
  const only = { ...log('korean', 'subject'), title: '학기말 종합의견', subject_name: '국어' };
  const t = await setup({ saved: { neisUploadCategory: 'subject' }, handler: url => url.includes('?') ? { logs: [only], total: 1 } : only });
  assert.match(t.element('subjectTabs').innerHTML, />국어<\/button>/);
  assert.equal(t.calls.length, 1);
  assert.equal(t.element('openOverlay').disabled, true);
  await t.emit('subjectTabs', 'click', undefined, { target: t.element('subjectTabs').tabs[0] });
  assert.match(t.element('recordTable').innerHTML, /korean 학생 1 결과/);
});
