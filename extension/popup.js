const SESSION_KEY = "forteacherSession";
const CSV_KEY = "neisUploadCsvRecords";
const FILE_RECORDS_KEY = "neisUploadFileRecordsByCategory";
const WEB_SELECTION_PREFIX = "neisUploadLastWorkLog";
const LEGACY_KEYS = ["neisUploadRecords", "neisUploadWebRecordsByCategory", "neisUploadSubjectScope", "neisUploadRecordLabel"];
const NEIS_GRID_EDITABLE_SELECTOR = ".cl-textarea:not(.cl-disabled)";
const BEHAVIOR_SELECTOR = [
  ".cl-grid-cell[data-cellindex='3'][aria-label*='행동특성'] .cl-textarea:not(.cl-disabled)",
  ".cl-grid-cell[data-cellindex='3'][aria-label*='종합의견'] .cl-textarea:not(.cl-disabled)",
  ".cl-grid-cell[data-cellindex='3'] .cl-textarea:not(.cl-disabled)"
].join(", ");
const CREATIVE_SELECTOR = [
  ".cl-grid-cell[data-cellindex='3'][aria-label*='특기사항']:not([aria-label*='행동특성']):not([aria-label*='종합의견']) .cl-textarea:not(.cl-disabled)",
  ".cl-grid-cell[data-cellindex='3']:not([aria-label*='행동특성']):not([aria-label*='종합의견']) .cl-textarea:not(.cl-disabled)"
].join(", ");
const SUBJECT_SELECTOR = ".cl-grid-cell[data-cellindex='4'][aria-label*='학기말 종합의견'] .cl-textarea:not(.cl-disabled), .cl-grid-cell[data-cellindex='4'] .cl-textarea:not(.cl-disabled)";
const DEFAULT_SELECTORS = {
  behavior: BEHAVIOR_SELECTOR,
  creative: CREATIVE_SELECTOR,
  subject: SUBJECT_SELECTOR
};

const FILE_SELECTORS = {
  behavior: ".cl-grid-cell[data-cellindex='3'][aria-label*='행동특성'] .cl-textarea:not(.cl-disabled)",
  creative: ".cl-grid-cell[data-cellindex='3'][aria-label*='특기사항']:not([aria-label*='행동특성']):not([aria-label*='종합의견']) .cl-textarea:not(.cl-disabled)",
  subject: ".cl-grid-cell[data-cellindex='4'][aria-label*='학기말 종합의견'] .cl-textarea:not(.cl-disabled)"
};

const $ = (id) => document.getElementById(id);
const csvFile = $("csvFile"), parseClipboard = $("parseClipboard");
const downloadTemplate = $("downloadTemplate"), fileHelp = $("fileHelp");
const recordCount = $("recordCount"), recordSummary = $("recordSummary"), recordTable = $("recordTable");
const delay = $("delay"), accountState = $("accountState"), accountBadge = $("accountBadge");
const connectWebApp = $("connectWebApp"), logoutWebApp = $("logoutWebApp");
const category = $("category"), workLog = $("workLog");
const refreshLogs = $("refreshLogs"), previousPage = $("previousPage"), nextPage = $("nextPage"), pageInfo = $("pageInfo");
const loadWebData = $("loadWebData"), resetData = $("resetData");
const webSourcePanel = $("webSourcePanel"), csvSourcePanel = $("csvSourcePanel");
const projectSubjects = $("projectSubjects"), subjectTabs = $("subjectTabs");
const recordPanel = $("recordPanel");
const openOverlay = $("openOverlay"), statusEl = $("status");
const sourceModeInputs = [...document.querySelectorAll("input[name='sourceMode']")];
let records = [], csvRecords = [], logs = [], loadedLog = null;
let loadedProject = null, subjectLogs = [], selectedSubjectId = "";
let fileRecordsByCategory = {};
let activeSource = "web", session = null, page = 0, total = 0, epoch = 0, busy = false;
let selectionStorageKey = "";

function on(element, eventName, handler) {
  element.addEventListener(eventName, handler);
}

async function init() {
  const saved = await chrome.storage.local.get([CSV_KEY, FILE_RECORDS_KEY, SESSION_KEY, "neisUploadSource", "neisUploadCategory", ...LEGACY_KEYS]);
  session = saved[SESSION_KEY] || null;
  activeSource = saved.neisUploadSource === "csv" ? "csv" : "web";
  if (DEFAULT_SELECTORS[saved.neisUploadCategory]) category.value = saved.neisUploadCategory;
  fileRecordsByCategory = saved[FILE_RECORDS_KEY] || {};
  const legacyCsv = saved[CSV_KEY] || [];
  if (!saved[FILE_RECORDS_KEY] && legacyCsv.length) {
    fileRecordsByCategory[category.value] = { records: legacyCsv, label: saved.neisUploadRecordLabel || "CSV 파일" };
  }
  csvRecords = getFileBucket()?.records || [];
  // Old web caches have no reliable owner or saved-log identity. Never reuse them.
  await chrome.storage.local.set({ [FILE_RECORDS_KEY]: fileRecordsByCategory });
  await chrome.storage.local.remove([CSV_KEY, ...LEGACY_KEYS]);
  records = activeSource === "csv" ? csvRecords : [];
  renderAccount(); renderSource(); renderLogList(); renderRecords();
  if (activeSource === "web" && session?.access_token) await loadLogList();
}

function invalidate({ keepProject = false } = {}) {
  epoch += 1;
  busy = false;
  loadedLog = null;
  selectedSubjectId = "";
  if (!keepProject) {
    loadedProject = null;
    subjectLogs = [];
    renderSubjectTabs();
  }
  csvRecords = getFileBucket()?.records || [];
  records = activeSource === "csv" ? csvRecords : [];
  renderRecords(); renderControls();
  return epoch;
}

sourceModeInputs.forEach(input => on(input, "change", async () => {
  activeSource = input.value;
  invalidate(); renderSource();
  setStatus("");
  await chrome.storage.local.set({ neisUploadSource: activeSource });
  if (activeSource === "web") await loadLogList();
}));

on(category, "change", async () => {
  page = 0;
  selectionStorageKey = "";
  invalidate();
  renderSource();
  setStatus("");
  await chrome.storage.local.set({ neisUploadCategory: category.value });
  if (activeSource === "web") await loadLogList();
} );
on(refreshLogs, "click", () => loadLogList());
on(previousPage, "click", () => { page = Math.max(0, page - 1); return loadLogList(false); });
on(nextPage, "click", () => { page += 1; return loadLogList(false); });
on(workLog, "change", () => {
  if (activeSource !== "web") return;
  rememberSelection();
  return prepareSelectedLog();
});

on(subjectTabs, "click", event => {
  const id = event.target.closest("button[data-log-id]")?.dataset.logId;
  if (loadedProject && subjectLogs.some(log => log.id === id)) {
    rememberSelection(id);
    return loadLogDetail(id, true);
  }
});
on(subjectTabs, "keydown", event => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...subjectTabs.querySelectorAll("button[data-log-id]")];
  const index = tabs.indexOf(event.target);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
    : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[index].tabIndex = -1;
  tabs[next].tabIndex = 0;
  tabs[next].focus();
});

on(csvFile, "change", async () => {
  const file = csvFile.files?.[0];
  if (!file) return;
  await importRecords(() => ForTeacherImport.parseFile(file, category.value), file.name);
  csvFile.value = "";
});
on(parseClipboard, "click", async () => {
  await importRecords(async () => {
    const text = await navigator.clipboard.readText();
    return { records: ForTeacherImport.parseText(text, category.value) };
  }, "클립보드 CSV");
});
on(downloadTemplate, "click", () => {
  const { filename, csv } = ForTeacherImport.template(category.value);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("예시 학생을 실제 데이터로 바꾸고 열 이름을 유지해 저장한 뒤 업로드하세요.");
});

on(connectWebApp, "click", async () => {
  try {
    const appOrigin = await getAppOrigin();
    const existingSession = await pullSessionFromBridgeTab(appOrigin);
    if (existingSession?.access_token && (!existingSession.expires_at || existingSession.expires_at * 1000 > Date.now())) {
      await chrome.storage.local.set({ [SESSION_KEY]: existingSession, forteacherAppOrigin: appOrigin });
      setStatus("웹앱 계정을 연결했습니다.");
    } else {
      await chrome.tabs.create({ url: `${appOrigin}/extension/bridge` });
      setStatus("브리지 화면에서 연결한 뒤 확장 프로그램을 다시 여세요.");
    }
  } catch (error) { setStatus(`계정 연결에 실패했습니다: ${error.message}`); }
});

on(logoutWebApp, "click", async () => {
  session = null; logs = []; total = 0; csvRecords = []; fileRecordsByCategory = {};
  selectionStorageKey = "";
  invalidate(); renderAccount(); renderLogList();
  await chrome.storage.local.remove([SESSION_KEY, CSV_KEY, FILE_RECORDS_KEY, ...LEGACY_KEYS]);
  await chrome.runtime.sendMessage({ type: "neis-panel-reset" }).catch(() => {});
  setStatus("계정 연결과 불러온 학생 데이터를 지웠습니다.");
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SESSION_KEY]) return;
  const next = changes[SESSION_KEY].newValue || null;
  // The bridge may send the same session repeatedly.
  if (next?.access_token === session?.access_token && next?.user?.id === session?.user?.id) return;
  session = next; logs = []; total = 0; page = 0;
  selectionStorageKey = "";
  invalidate(); renderAccount(); renderLogList();
  if (activeSource === "web" && session?.access_token) void loadLogList();
});

on(loadWebData, "click", loadSelectedLog);
on(resetData, "click", async () => {
  csvRecords = []; fileRecordsByCategory = {}; logs = []; total = 0; page = 0; csvFile.value = "";
  invalidate(); renderLogList();
  await chrome.storage.local.remove([CSV_KEY, FILE_RECORDS_KEY, ...LEGACY_KEYS, ...(selectionStorageKey ? [selectionStorageKey] : [])]);
  await chrome.runtime.sendMessage({ type: "neis-panel-reset" }).catch(() => {});
  setStatus("불러온 데이터를 비웠습니다. 작업로그 목록을 새로고침하거나 CSV·XLSX 파일을 선택하세요.");
});

on(openOverlay, "click", async () => {
  if (!records.length || busy) return;
  const requestEpoch = epoch;
  busy = true; renderControls();
  setStatus("패널 준비 중…", true);
  try {
    // Check again before handing off to NEIS so a newly edited record is not silently stale.
    if (activeSource === "web") {
      const current = await requestLog(`/api/work-logs/${encodeURIComponent(loadedLog.id)}`);
      if (requestEpoch !== epoch) return;
      if (current.category !== category.value || current.id !== loadedLog.id) throw new Error("작업로그를 다시 선택하세요.");
      if (current.archived_at) throw new Error("보관함으로 이동한 기록입니다. 저장본을 다시 선택하세요.");
      if (current.revision !== loadedLog.revision) {
        applyLoadedLog(current);
        setStatus("작업로그가 변경되어 최신 내용을 불러왔습니다. 목록을 확인한 뒤 다시 패널을 띄우세요.");
        return;
      }
    }
    if (requestEpoch === epoch) await runOnActiveTab("showOverlay", getPayload(), requestEpoch);
  } catch (error) {
    if (requestEpoch === epoch) { invalidate(); setStatus(`불러온 내용을 확인할 수 없습니다: ${error.message}`); }
  } finally { if (requestEpoch === epoch) { busy = false; renderControls(); } }
});

function getFileBucket() {
  return fileRecordsByCategory[category.value];
}

async function importRecords(read, label) {
  const requestEpoch = ++epoch;
  const importCategory = category.value;
  busy = true; renderControls();
  setStatus("파일 형식과 학생별 데이터를 확인하는 중입니다.");
  try {
    const result = await read();
    if (requestEpoch !== epoch || activeSource !== "csv") return;
    const sourceLabel = `${ForTeacherImport.categories[importCategory].label} · ${label}${result.sheetName ? ` · ${result.sheetName}` : ""}`;
    const nextBuckets = { ...fileRecordsByCategory, [importCategory]: { records: result.records, label: sourceLabel } };
    await chrome.storage.local.set({ [FILE_RECORDS_KEY]: nextBuckets });
    if (requestEpoch !== epoch) {
      // Mode changes and reset may happen while Chrome completes a storage write.
      const saved = await chrome.storage.local.get([FILE_RECORDS_KEY]);
      fileRecordsByCategory = saved[FILE_RECORDS_KEY] || {};
      if (!busy && activeSource === "csv") invalidate();
      return;
    }
    fileRecordsByCategory = nextBuckets;
    invalidate();
    setStatus("");
  } catch (error) {
    if (requestEpoch === epoch) setStatus(`불러오지 못했습니다: ${error.message}\n기존 목록은 유지됩니다.`);
  } finally {
    if (requestEpoch === epoch) { busy = false; renderControls(); }
  }
}

async function requestLog(path) {
  const token = session?.access_token;
  if (!token) throw new Error("먼저 웹앱 계정을 연결하세요.");
  const appOrigin = await getAppOrigin();
  const response = await fetch(`${appOrigin}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (response.status === 401) throw new Error("연결이 만료됐습니다. 계정 다시 연결을 눌러주세요.");
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `서버 응답 ${response.status}`);
  return body;
}

function logOptionKey(log) {
  return log.category === "subject" && log.project?.id && log.project.title ? `project:${log.project.id}` : log.id;
}

function rememberSelection(detailId = "") {
  const key = workLog.value;
  if (!selectionStorageKey || !key) return;
  // Store only the selection. Every preview is fetched again for the current account.
  void chrome.storage.local.set({ [selectionStorageKey]: { key, detailId, page } }).catch(() => {});
}

async function loadLogList(restore = true) {
  const requestEpoch = invalidate();
  selectionStorageKey = "";
  logs = []; total = 0; busy = true; renderLogList();
  setStatus("목록 불러오는 중…", true);
  try {
    const categoryValue = category.value;
    const owner = session?.user?.id;
    const initialPage = restore ? 0 : page;
    const storageKey = owner ? `${WEB_SELECTION_PREFIX}:${JSON.stringify([await getAppOrigin(), owner, categoryValue])}` : "";
    const remembered = restore && storageKey ? (await chrome.storage.local.get([storageKey]))[storageKey] : null;
    if (requestEpoch !== epoch) return;
    selectionStorageKey = storageKey;
    const fetchPage = async pageNumber => {
      const params = new URLSearchParams({ category: categoryValue, state: "editable", page: String(pageNumber) });
      const body = await requestLog(`/api/work-logs?${params}`);
      return {
        logs: Array.isArray(body.logs) ? body.logs.filter(log => log.category === categoryValue && !log.archived_at) : [],
        total: body.total || 0,
        page: pageNumber,
      };
    };
    let result = await fetchPage(initialPage);
    if (requestEpoch !== epoch) return;
    let restored = false;
    if (typeof remembered?.key === "string" && remembered.key) {
      const pages = Math.min(101, Math.ceil(result.total / 30));
      const preferred = Number.isInteger(remembered.page) ? remembered.page : 0;
      const searchPages = [...new Set([0, preferred, ...Array.from({ length: pages }, (_, index) => index)])];
      for (const candidate of searchPages) {
        if (candidate < 0 || (candidate >= pages && candidate !== 0)) continue;
        const current = candidate === initialPage ? result : await fetchPage(candidate);
        if (requestEpoch !== epoch) return;
        if (current.logs.some(log => logOptionKey(log) === remembered.key)) {
          result = current;
          restored = true;
          break;
        }
      }
      if (!restored) void chrome.storage.local.remove([storageKey]).catch(() => {});
    }
    ({ logs, total, page } = result);
    renderLogList();
    if (restored) {
      workLog.value = remembered.key;
      await prepareSelectedLog(remembered.detailId);
    } else if (logs.length) {
      if (remembered?.key) setStatus("이전에 선택한 작업로그를 찾을 수 없습니다. 작업로그를 다시 선택하세요.");
      else await prepareSelectedLog();
    }
    else setStatus("저장된 작업로그가 없습니다. 웹앱의 작업로그에 먼저 저장하세요.");
  } catch (error) { if (requestEpoch === epoch) setStatus(`목록을 불러오지 못했습니다: ${error.message}`); }
  finally { if (requestEpoch === epoch) { busy = false; renderControls(); } }
}

async function loadSelectedLog() {
  const key = workLog.value;
  if (!key || busy) return;
  const detailId = category.value === "subject" ? "" : key;
  rememberSelection(detailId);
  return detailId ? loadLogDetail(key) : prepareSelectedLog();
}

async function prepareSelectedLog(detailId = "") {
  const key = workLog.value;
  if (category.value === "subject") {
    const project = logs.find(log => log.project && key === `project:${log.project.id}`)?.project;
    if (project) return loadProject(project, detailId);
    const subject = logs.find(log => log.id === key);
    if (subject) {
      invalidate();
      showSubjectTabs({ title: subject.title }, [subject]);
      if (detailId === subject.id) return loadLogDetail(detailId, true);
      return;
    }
  }
  invalidate();
  if (key && detailId === key) return loadLogDetail(key);
  if (key) setStatus("");
}

async function loadProject(project, detailId) {
  const requestEpoch = invalidate();
  busy = true; renderControls(); setStatus("과목 목록 불러오는 중…", true);
  try {
    const members = new Map();
    let projectPage = 0;
    let projectTotal;
    do {
      const params = new URLSearchParams({ project: project.id, category: "subject", state: "editable", page: String(projectPage++) });
      const body = await requestLog(`/api/work-logs?${params}`);
      if (requestEpoch !== epoch) return;
      const list = body.logs;
      projectTotal = Number(body.total);
      if (!Array.isArray(list) || !Number.isInteger(projectTotal) || projectTotal < 0
        || list.some(log => log.category !== "subject" || log.archived_at || log.project?.id !== project.id)) {
        throw new Error("프로젝트 목록을 새로고침한 뒤 다시 선택하세요.");
      }
      const count = members.size;
      for (const log of list) members.set(log.id, log);
      if (members.size === count && count < projectTotal) throw new Error("교과 목록이 바뀌었습니다. 다시 불러오세요.");
    } while (members.size < projectTotal && projectPage <= 100);
    if (members.size < projectTotal) throw new Error("교과 목록을 모두 불러오지 못했습니다.");
    showSubjectTabs(project, [...members.values()]);
    if (members.has(detailId)) await loadLogDetail(detailId, true);
    else if (detailId) {
      rememberSelection();
      setStatus("이전에 선택한 교과를 찾을 수 없습니다. 교과를 다시 선택하세요.");
    }
  } catch (error) { if (requestEpoch === epoch) setStatus(`프로젝트를 불러오지 못했습니다: ${error.message}`); }
  finally { if (requestEpoch === epoch) { busy = false; renderControls(); } }
}

function showSubjectTabs(project, members) {
  loadedProject = project;
  subjectLogs = members;
  renderSubjectTabs(); renderRecords(); renderControls();
  setStatus(subjectLogs.length ? "" : "불러올 과목이 없습니다.");
}

async function loadLogDetail(id, keepProject = false) {
  const requestEpoch = invalidate({ keepProject });
  if (keepProject) {
    selectedSubjectId = id;
    updateSubjectSelection();
  }
  busy = true; renderControls(); setStatus(keepProject ? "과목 불러오는 중…" : "기록 불러오는 중…", true);
  try {
    const log = await requestLog(`/api/work-logs/${encodeURIComponent(id)}`);
    if (requestEpoch !== epoch) return;
    if (log.id !== id || log.category !== category.value) throw new Error("작업로그 영역이 일치하지 않습니다.");
    if (log.archived_at) throw new Error("보관함으로 이동한 기록입니다. 저장본을 다시 선택하세요.");
    applyLoadedLog(log);
    setStatus(records.length ? "" : "작성 결과가 없습니다.");
  } catch (error) { if (requestEpoch === epoch) setStatus(`작업로그를 불러오지 못했습니다: ${error.message}`); }
  finally { if (requestEpoch === epoch) { busy = false; renderControls(); } }
}

function applyLoadedLog(log) {
  const summary = subjectLogs.find(item => item.id === log.id) || logs.find(item => item.id === log.id);
  loadedLog = { ...log, project: summary?.project || log.project, subjectName: log.data.globalConfig?.subjectName || summary?.subject_name };
  records = ForTeacherWorkLogs.toRecords(log.category, log.data, log.title);
  renderRecords();
}

function renderLogList() {
  const seenProjects = new Set();
  const options = [];
  for (const log of logs) {
    const key = logOptionKey(log);
    if (key !== log.id) {
      if (seenProjects.has(log.project.id)) continue;
      seenProjects.add(log.project.id);
      options.push(`<option value="${escapeHTML(key)}">${escapeHTML(log.project.title)}</option>`);
    } else {
      options.push(`<option value="${escapeHTML(log.id)}">${escapeHTML(log.title)} · ${log.completed_count}명 · ${escapeHTML(formatDate(log.updated_at))}</option>`);
    }
  }
  workLog.innerHTML = options.length ? options.join("") : '<option value="">저장된 작업로그 없음</option>';
  pageInfo.parentElement?.classList.toggle("hidden", total <= 30);
  pageInfo.textContent = `${page + 1} / ${Math.max(1, Math.ceil(total / 30))}쪽 · ${total}개`;
  renderControls();
}

function renderSubjectTabs() {
  projectSubjects.classList.toggle("hidden", !loadedProject || !subjectLogs.length);
  subjectTabs.innerHTML = subjectLogs.map(log => `<button type="button" class="subject-tab" role="tab" id="subject-tab-${escapeHTML(log.id)}" data-log-id="${escapeHTML(log.id)}" aria-controls="recordPanel">${escapeHTML(log.subject_name || log.title)}</button>`).join("");
  updateSubjectSelection();
}

function updateSubjectSelection() {
  const buttons = [...subjectTabs.querySelectorAll("button[data-log-id]")];
  for (const [index, button] of buttons.entries()) {
    const selected = button.dataset.logId === selectedSubjectId;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected || (!selectedSubjectId && index === 0) ? 0 : -1;
  }
  if (selectedSubjectId) {
    recordPanel.setAttribute("role", "tabpanel");
    recordPanel.setAttribute("aria-labelledby", `subject-tab-${selectedSubjectId}`);
  } else {
    recordPanel.removeAttribute("role");
    recordPanel.removeAttribute("aria-labelledby");
  }
}

function renderControls() {
  workLog.disabled = busy || !logs.length;
  loadWebData.disabled = busy || !workLog.value;
  loadWebData.classList.toggle("hidden", category.value === "subject" && !!loadedProject);
  refreshLogs.disabled = busy;
  previousPage.disabled = busy || page <= 0;
  nextPage.disabled = busy || (page + 1) * 30 >= total || page >= 100;
  openOverlay.disabled = busy || !records.length;
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function getCategoryLabel() {
  const baseLabel = category.options[category.selectedIndex]?.text || category.value;
  if (activeSource === "web" && loadedLog) {
    return `${loadedLog.project?.title || baseLabel} · ${loadedLog.subjectName || loadedLog.title}`;
  }
  return getFileBucket()?.label || `${baseLabel} · 내 파일`;
}
function renderAccount() {
  const email = session?.user?.email || "";
  accountBadge.textContent = email ? "계정" : "계정 연결";
  accountBadge.classList.toggle("connected", Boolean(email));
  accountState.textContent = email;
  connectWebApp.textContent = email ? "계정 다시 연결" : "웹앱 계정 연결";
  logoutWebApp.disabled = !session;
}
function renderSource() {
  sourceModeInputs.forEach(input => { input.checked = input.value === activeSource; });
  webSourcePanel.classList.toggle("hidden", activeSource !== "web");
  csvSourcePanel.classList.toggle("hidden", activeSource !== "csv");
  const config = ForTeacherImport.categories[category.value];
  downloadTemplate.setAttribute("title", `${config.label} 예시 CSV 다운로드`);
  fileHelp.textContent = `번호·이름(선택)·${config.headers[0]} 열 · 엑셀은 첫 시트`;
}

void init();

function renderRecords() {
  recordCount.textContent = `${records.length}명`;
  const label = activeSource === "csv" ? getFileBucket()?.label : "";
  const prefix = `${ForTeacherImport.categories[category.value].label} · `;
  recordSummary.textContent = label?.startsWith(prefix) ? label.slice(prefix.length) : label || "";
  recordPanel.classList.toggle("hidden", !records.length);
  openOverlay.disabled = records.length === 0;

  if (!records.length) {
    recordTable.innerHTML = "";
    return;
  }

  recordTable.innerHTML = [
    `<div class="record-row header"><div>번호</div><div>이름</div><div>내용</div></div>`,
    ...records.map((record) => `
      <div class="record-row">
        <div class="record-id">${escapeHTML(record.id || "-")}</div>
        <div class="record-name" title="${escapeHTML(record.name || "")}">${escapeHTML(record.name || "-")}</div>
        <div class="record-text" title="${escapeHTML(record.text || "")}">${escapeHTML(record.text || "")}</div>
      </div>
    `)
  ].join("");
}

async function getAppOrigin() {
  const saved = await chrome.storage.local.get(["forteacherAppOrigin"]);
  const configured = window.FORTEACHER_EXTENSION_CONFIG?.appOrigin || "http://localhost:3000";
  const savedOrigin = saved.forteacherAppOrigin;
  if (!savedOrigin || savedOrigin === "https://for-teacher-ai.vercel.app") {
    await chrome.storage.local.set({ forteacherAppOrigin: configured });
    return configured;
  }
  return savedOrigin;
}

async function pullSessionFromBridgeTab(appOrigin) {
  const tabs = await chrome.tabs.query({ url: `${appOrigin}/extension/bridge*` });
  const tab = tabs[0];
  if (!tab?.id) return null;

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: readSupabaseSessionFromPage
  });

  return result?.result || null;
}

function readSupabaseSessionFromPage() {
  const authKey = Object.keys(localStorage).find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
  if (!authKey) return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(authKey) || "null");
    const session = parsed?.currentSession || parsed;
    if (!session?.access_token) return null;
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user?.id,
        email: session.user?.email
      }
    };
  } catch {
    return null;
  }
}

async function runOnActiveTab(action, payload, requestEpoch = epoch) {
  if (!records.length) {
    setStatus("먼저 데이터를 불러오세요.");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (requestEpoch !== epoch) return;
  if (!tab?.id) {
    setStatus("활성 탭을 찾지 못했습니다.");
    return;
  }

  try {
    if (activeSource === "web") {
      const { id, revision, project } = loadedLog;
      const subjects = project ? subjectLogs.map(log => ({ id: log.id, label: log.subject_name || log.title })) : [];
      const response = await chrome.runtime.sendMessage({
        type: "neis-panel-open", tabId: tab.id, logId: id, projectId: project?.id,
        category: category.value, subjectIds: subjects.map(subject => subject.id), owner: session.user?.id, page
      });
      if (requestEpoch !== epoch) return;
      if (!response?.ok) throw new Error(response?.error || "패널을 준비하지 못했습니다.");
      payload.web = { sessionId: response.id, expiresAt: response.expiresAt, logId: id, revision, subjects };
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: runUploaderInPage,
      args: [action, payload]
    });
    if (requestEpoch !== epoch) return;

    const successful = results
      .map((item) => item.result)
      .filter((result) => result?.count > 0 || result?.ok);
    const best = successful[0] || results.map((item) => item.result).find(Boolean);
    setStatus(best?.message || "나이스 화면에 패널을 띄우지 못했습니다.");
  } catch (error) {
    if (requestEpoch === epoch) setStatus(`실행 실패: ${error.message}`);
  }
}

function getPayload() {
  return {
    records,
    matchStudentNumber: activeSource === "csv",
    category: category.value,
    selector: getSelectorForCategory(),
    fallbackSelector: NEIS_GRID_EDITABLE_SELECTOR,
    delayMs: delay.value === "" ? 300 : Math.min(2000, Math.max(0, Number(delay.value) || 0)),
    categoryLabel: getCategoryLabel() || "ForTeacher AI"
  };
}

function getSelectorForCategory() {
  if (activeSource === "csv") return FILE_SELECTORS[category.value] || FILE_SELECTORS.behavior;
  return DEFAULT_SELECTORS[category.value] || BEHAVIOR_SELECTOR;
}

function setStatus(message, loading = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("loading", loading);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function runUploaderInPage(action, payload) {
  if (action !== "showOverlay") {
    return { ok: false, count: 0, message: "지원하지 않는 실행 방식입니다." };
  }

  let records = payload?.records || [];
  const preferredSelector = payload?.selector || "";
  const fallbackSelector = payload?.fallbackSelector || ".cl-textarea:not(.cl-disabled)";
  const delayMs = payload?.delayMs ?? 300;
  const categoryLabel = payload?.categoryLabel || "ForTeacher AI";
  const isSubjectUpload = payload?.category === "subject";
  const matchStudentNumber = Boolean(payload?.matchStudentNumber);
  const web = payload?.web;

  if (!records.length) {
    return { ok: false, count: 0, message: "불러온 데이터가 없습니다." };
  }

  const selector = getUsableSelector(preferredSelector, fallbackSelector);
  if (!selector) {
    return { ok: false, count: 0, message: "이 프레임에는 나이스 입력칸이 없습니다." };
  }
  const existing = document.getElementById("forteacher-neis-overlay");
  if (existing?.dataset.running === "true") return { ok: true, message: "나이스 패널에서 입력 중입니다." };
  installSelectionTracker(selector);
  mountOverlay(existing);
  return { ok: true, count: records.length, message: "나이스 화면에 업로드 패널을 띄웠습니다." };

  function getUsableSelector(primarySelector, secondarySelector) {
    if (primarySelector && findVisibleEditables(primarySelector).length > 0) {
      return primarySelector;
    }
    if (!matchStudentNumber && secondarySelector && findVisibleEditables(secondarySelector).length > 0) {
      return secondarySelector;
    }
    return "";
  }

  function installSelectionTracker(activeSelector) {
    window.__forTeacherActiveSelector = activeSelector;
    const selected = findActiveEditable(activeSelector);
    if (selected) window.__forTeacherLastEditable = selected;
    if (window.__forTeacherSelectionTrackerInstalled) return;
    window.__forTeacherSelectionTrackerInstalled = true;
    document.addEventListener("mousedown", (event) => {
      const target = event.target?.closest?.(window.__forTeacherActiveSelector || activeSelector);
      if (target) rememberEditable(target);
    }, true);
    document.addEventListener("focusin", (event) => {
      const target = event.target?.closest?.(window.__forTeacherActiveSelector || activeSelector);
      if (target) rememberEditable(target);
    }, true);
  }

  function rememberEditable(target) {
    window.__forTeacherLastEditable = target;
    window.__forTeacherSelectionVersion = (window.__forTeacherSelectionVersion || 0) + 1;
  }

  function mountOverlay(existing) {
    existing?.__forteacherDispose?.();
    existing?.remove();

    const overlay = document.createElement("section");
    overlay.id = "forteacher-neis-overlay";
    const canSwitchSubject = web?.subjects?.length > 1;
    overlay.innerHTML = `
      <style>
        #forteacher-neis-overlay {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 2147483647;
          width: min(340px, calc(100vw - 36px));
          color: #111827;
          font-family: "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif;
          letter-spacing: 0;
        }
        #forteacher-neis-overlay * { box-sizing: border-box; }
        .ft-panel {
          overflow: hidden;
          border: 1px solid #cfd8e3;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 22px 54px rgba(17, 24, 39, 0.18);
        }
        .ft-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid #e6ebf1;
          background: #f8fafc;
        }
        .ft-title {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          line-height: 1.35;
        }
        .ft-close {
          width: 30px;
          height: 30px;
          border: 1px solid #d7dee8;
          border-radius: 8px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
        .ft-body {
          display: grid;
          gap: 9px;
          padding: 12px;
        }
        .ft-meta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-height: 32px;
        }
        .ft-source { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475569; font-size: 12px; }
        .ft-subject {
          width: 100%; min-width: 0; height: 34px; padding: 0 8px; border: 1px solid #c8d1ed;
          border-radius: 8px; background: #f5f6ff; color: #363f82; font: inherit; font-size: 13px; font-weight: 700;
        }
        .ft-count {
          color: #0f766e;
          font-size: 14px;
          font-weight: 900;
        }
        .ft-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .ft-field label {
          display: block;
          margin-bottom: 5px;
          color: #334155;
          font-size: 11px;
          font-weight: 900;
        }
        .ft-field input {
          width: 100%;
          height: 34px;
          padding: 0 9px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #111827;
          font: inherit;
          font-size: 12px;
        }
        .ft-mode {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin: 0;
          padding: 5px 9px 8px;
          border: 1px solid #e1e7ee;
          border-radius: 8px;
          color: #334155;
          font-size: 12px;
        }
        .ft-mode legend { padding: 0 4px; font-weight: 900; }
        .ft-mode label { display: flex; align-items: center; gap: 6px; }
        .ft-mode input { margin: 0; accent-color: #0f766e; }
        .ft-progress {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: #e5eaf0;
        }
        .ft-progress span {
          display: block;
          width: 0%;
          height: 100%;
          background: #0f766e;
          transition: width 160ms ease;
        }
        .ft-feedback { display: flex; align-items: flex-start; gap: 8px; }
        .ft-status {
          margin: 0;
          color: #475569;
          font-size: 11px;
          line-height: 1.45;
        }
        .ft-feedback:has(.ft-status:empty):has(.ft-spinner[hidden]):has(.ft-retry[hidden]) { display: none; }
        .ft-spinner {
          flex: none; width: 12px; height: 12px; margin-top: 2px; border: 2px solid #b8dcd7;
          border-top-color: #0f766e; border-radius: 50%; animation: ft-spin .7s linear infinite;
        }
        @keyframes ft-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .ft-spinner { animation: none; } }
        #forteacher-neis-overlay [hidden] { display: none !important; }
        .ft-retry { flex: none; padding: 0; border: 0; background: transparent; color: #0f766e; font: inherit; font-size: 11px; text-decoration: underline; cursor: pointer; }
        .ft-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .ft-button {
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #111827;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }
        .ft-button.primary {
          border-color: #0f766e;
          background: #0f766e;
          color: #ffffff;
        }
        .ft-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
      </style>
      <div class="ft-panel">
        <div class="ft-head">
          <h2 class="ft-title">나이스 붙여넣기</h2>
          <button class="ft-close" type="button" aria-label="닫기">×</button>
        </div>
        <div class="ft-body">
          <div class="ft-meta">
            ${canSwitchSubject ? `<select class="ft-subject" aria-label="과목">${web.subjects.map(subject => `<option value="${escapeText(subject.id)}">${escapeText(subject.label)}</option>`).join("")}</select>`
              : `<span class="ft-source" title="${escapeText(categoryLabel)}">${escapeText(categoryLabel)}</span>`}
            <strong class="ft-count">${records.length}명</strong>
          </div>
          <div class="ft-controls">
            <div class="ft-field">
              <label for="ft-start-id">시작 번호</label>
              <input id="ft-start-id" class="ft-start-id" type="number" min="1" value="${escapeText(records[0]?.id || "1")}" />
            </div>
            <div class="ft-field">
              <label for="ft-delay">입력 간격(ms)</label>
              <input id="ft-delay" class="ft-delay" type="number" min="0" max="2000" step="50" value="${delayMs}" />
            </div>
          </div>
          <fieldset class="ft-mode">
            <legend>붙여넣기 방식</legend>
            <label title="기존 문장 끝에 공백 한 칸을 두고 추가"><input type="radio" name="ft-write-mode" value="append" checked /> 이어쓰기</label>
            <label><input type="radio" name="ft-write-mode" value="replace" /> 덮어쓰기</label>
          </fieldset>
          <div class="ft-progress" hidden><span></span></div>
          <div class="ft-feedback">
            <span class="ft-spinner" aria-hidden="true" hidden></span>
            <p class="ft-status" role="status">첫 입력칸을 클릭하세요.</p>
            <button type="button" class="ft-retry" hidden>다시 불러오기</button>
          </div>
          <div class="ft-actions">
            <button class="ft-button primary ft-start" type="button">시작</button>
            <button class="ft-button ft-detect" type="button">선택 확인</button>
          </div>
        </div>
      </div>
    `;

    const close = overlay.querySelector(".ft-close");
    const start = overlay.querySelector(".ft-start");
    const detect = overlay.querySelector(".ft-detect");
    const status = overlay.querySelector(".ft-status");
    const progress = overlay.querySelector(".ft-progress span");
    const progressBar = progress.parentElement;
    const startIdInput = overlay.querySelector(".ft-start-id");
    const delayInput = overlay.querySelector(".ft-delay");
    const writeMode = overlay.querySelector(".ft-mode");
    const subjectSelect = overlay.querySelector(".ft-subject");
    const countLabel = overlay.querySelector(".ft-count");
    const spinner = overlay.querySelector(".ft-spinner");
    const retry = overlay.querySelector(".ft-retry");
    let logId = web?.logId, revision = web?.revision;
    let loading = false, running = false, expired = false, failed = false;
    let selectionAfter = -1;
    let expiryTimer;

    if (subjectSelect) subjectSelect.value = logId;
    if (web) expiryTimer = setTimeout(expirePanel, Math.max(0, web.expiresAt - Date.now()));
    overlay.__forteacherDispose = () => { clearTimeout(expiryTimer); records = []; overlay.remove(); };
    close.addEventListener("click", () => overlay.__forteacherDispose());
    subjectSelect?.addEventListener("change", () => switchSubject(subjectSelect.value));
    retry.addEventListener("click", () => switchSubject(logId));
    detect.addEventListener("click", () => {
      status.textContent = chosenEditable() ? "입력칸을 확인했습니다." : "나이스에서 첫 입력칸을 클릭하세요.";
    });
    start.addEventListener("click", async () => {
      if (loading || running || expired || !records.length) return;
      const selected = chosenEditable();
      if (!selected) {
        status.textContent = "입력칸을 찾지 못했습니다. 첫 학생 입력칸을 클릭한 뒤 다시 시작하세요.";
        return;
      }

      const startId = Number(startIdInput.value);
      const startRecordIndex = records.findIndex((record) => Number(record.id) === startId);
      if (startRecordIndex < 0) {
        status.textContent = "불러온 목록에 없는 시작 번호입니다. 번호를 확인하세요.";
        return;
      }
      const interval = Math.min(2000, Math.max(0, Number(delayInput.value) || 0));
      const append = writeMode.querySelector("input:checked").value === "append";

      if (web && !await checkLatest(selected)) return;
      const uploadRecords = records.slice(startRecordIndex);
      running = true; syncControls();
      progressBar.hidden = false;
      progress.style.width = "0%";
      status.textContent = "입력을 시작합니다.";
      let completed = 0;
      try {
        const count = await fillFromFocused(selector, uploadRecords, interval, append, (done, total, record) => {
          completed = done;
          progress.style.width = `${Math.round((done / total) * 100)}%`;
          status.textContent = `${done}/${total} 입력 중: ${record?.id || "-"}번`;
        });
        if ((isSubjectUpload || matchStudentNumber) && count < uploadRecords.length) {
          status.textContent = `${count}/${uploadRecords.length}개만 입력했습니다. ${uploadRecords[count]?.id}번 입력칸을 확인하지 못해 중단했습니다. 나이스의 영역·학생 번호를 확인하세요.`;
        } else {
          status.textContent = `${count}개 입력을 완료했습니다. 나이스 저장 전 내용을 확인하세요.`;
        }
      } catch (error) {
        status.textContent = `${completed}/${uploadRecords.length}개 입력 후 ${uploadRecords[completed]?.id || "-"}번에서 중단했습니다. ${error.message}`;
      } finally {
        running = false; syncControls();
      }
    });

    document.body.appendChild(overlay);
    syncControls();

    function syncControls() {
      const unavailable = loading || running || expired;
      start.disabled = unavailable || !records.length;
      detect.disabled = unavailable || !records.length;
      if (subjectSelect) subjectSelect.disabled = unavailable;
      writeMode.disabled = unavailable;
      startIdInput.disabled = unavailable;
      delayInput.disabled = unavailable;
      close.disabled = running;
      spinner.hidden = !loading;
      retry.hidden = !failed || unavailable;
      overlay.dataset.running = String(running);
      overlay.setAttribute("aria-busy", String(loading));
    }

    function expirePanel() {
      expired = true;
      records = [];
      countLabel.textContent = "—";
      status.textContent = "시간이 지나 연결이 끝났습니다. 확장 프로그램에서 패널을 다시 여세요.";
      syncControls();
    }

    function chosenEditable() {
      return (window.__forTeacherSelectionVersion || 0) > selectionAfter ? getCurrentEditable(selector) : null;
    }

    async function readRecords(remember) {
      const result = await chrome.runtime.sendMessage({ type: "neis-panel-read", id: web.sessionId, logId, remember });
      if (!result?.ok) throw new Error(result?.error || "기록을 다시 불러오지 못했습니다.");
      return result;
    }

    function setRecords(result) {
      records = result.records;
      revision = result.revision;
      failed = !records.length;
      startIdInput.value = records[0]?.id || "";
      countLabel.textContent = `${records.length}명`;
      progressBar.hidden = true;
    }

    async function switchSubject(next) {
      if (loading || running || expired) return;
      logId = next;
      selectionAfter = window.__forTeacherSelectionVersion || 0;
      records = []; countLabel.textContent = "—"; startIdInput.value = ""; progressBar.hidden = true;
      loading = true; failed = false; syncControls();
      status.textContent = canSwitchSubject ? "과목 불러오는 중…" : "기록 확인 중…";
      try {
        const result = await readRecords(true);
        if (!overlay.isConnected || expired) return;
        setRecords(result);
        selectionAfter = window.__forTeacherSelectionVersion || 0;
        status.textContent = records.length
          ? canSwitchSubject ? "나이스에서 같은 과목을 열고 첫 입력칸을 클릭하세요." : "첫 입력칸을 클릭하세요."
          : "작성 결과가 없습니다.";
      } catch (error) {
        if (!expired) { failed = true; status.textContent = error.message; }
      } finally { loading = false; syncControls(); }
    }

    async function checkLatest(selected) {
      loading = true; syncControls(); status.textContent = "최신 기록 확인 중…";
      try {
        const result = await readRecords(false);
        if (!overlay.isConnected || expired) return false;
        if (result.revision !== revision) {
          setRecords(result);
          status.textContent = records.length ? "기록이 갱신됐습니다. 시작 번호를 확인하고 다시 시작하세요." : "작성 결과가 없습니다.";
          return false;
        }
        if (chosenEditable() !== selected) {
          status.textContent = "입력칸이 바뀌었습니다. 첫 입력칸을 클릭하고 다시 시작하세요.";
          return false;
        }
        return true;
      } catch (error) {
        if (!expired) { records = []; countLabel.textContent = "—"; failed = true; status.textContent = error.message; }
        return false;
      } finally { loading = false; syncControls(); }
    }
  }

  function findFocusedEditable(inputSelector) {
    if (window.__forTeacherLastEditable?.matches?.(inputSelector)) return window.__forTeacherLastEditable;
    const active = document.activeElement;
    if (active && isEditable(active) && active.matches(inputSelector)) return active;
    const activeParent = active?.closest?.(inputSelector);
    if (activeParent && isEditable(activeParent)) return activeParent;
    return null;
  }

  function getCurrentEditable(inputSelector) {
    return isSubjectUpload || matchStudentNumber ? findActiveEditable(inputSelector) : findFocusedEditable(inputSelector);
  }

  function findActiveEditable(inputSelector) {
    const active = document.activeElement;
    const activeTarget = findEditableTarget(active, inputSelector);
    if (activeTarget) return activeTarget;

    const targetFromEditor = findTargetOverlappingEditor(active, inputSelector);
    if (targetFromEditor) return targetFromEditor;

    const markedTarget = findMarkedFocusedEditable(inputSelector);
    if (markedTarget) return markedTarget;

    if (window.__forTeacherLastEditable?.matches?.(inputSelector)
      && isEditable(window.__forTeacherLastEditable)
      && isVisible(window.__forTeacherLastEditable)) {
      return window.__forTeacherLastEditable;
    }
    return null;
  }

  function findEditableTarget(element, inputSelector) {
    if (!(element instanceof Element)) return null;
    if (element.matches?.(inputSelector) && isEditable(element)) return element;
    const parent = element.closest?.(inputSelector);
    return parent && isEditable(parent) ? parent : null;
  }

  function findTargetOverlappingEditor(editor, inputSelector) {
    if (!(editor instanceof HTMLElement) || !isEditable(editor) || !isVisible(editor)) return null;
    const editorRect = editor.getBoundingClientRect();
    return findVisibleEditables(inputSelector)
      .find((candidate) => rectanglesOverlap(editorRect, candidate.getBoundingClientRect())) || null;
  }

  function findMarkedFocusedEditable(inputSelector) {
    return findVisibleEditables(inputSelector).find((candidate) => {
      const cell = candidate.closest(".cl-grid-cell");
      return candidate.classList.contains("cl-focus")
        || cell?.classList.contains("cl-focus")
        || Boolean(candidate.querySelector?.(".cl-focus"));
    }) || null;
  }

  async function fillFromFocused(inputSelector, uploadRecords, intervalMs, append, onProgress) {
    if (isSubjectUpload || matchStudentNumber) {
      return fillSubjectFromFocused(inputSelector, uploadRecords, intervalMs, append, onProgress);
    }

    const targets = findVisibleEditables(inputSelector);
    const focused = findFocusedEditable(inputSelector);
    const startIndex = focused ? targets.indexOf(focused) : -1;
    if (startIndex < 0) return 0;

    const availableTargets = targets.slice(startIndex);
    const count = Math.min(availableTargets.length, uploadRecords.length);
    for (let i = 0; i < count; i += 1) {
      await setEditableValue(availableTargets[i], uploadRecords[i].text, {
        append,
        advanceAfterCommit: i < count - 1
      });
      onProgress?.(i + 1, count, uploadRecords[i]);
      if (intervalMs > 0) await sleep(intervalMs);
    }
    return count;
  }

  async function fillSubjectFromFocused(inputSelector, uploadRecords, intervalMs, append, onProgress) {
    const initialTarget = findActiveEditable(inputSelector);
    if (!initialTarget) return 0;

    const total = uploadRecords.length;
    for (let i = 0; i < total; i += 1) {
      const target = await waitForSubjectEditable(inputSelector, uploadRecords[i], 2600);
      if (!target) return i;

      await setEditableValue(target, uploadRecords[i].text, {
        append,
        advanceAfterCommit: false,
        simulatePaste: true
      });
      onProgress?.(i + 1, total, uploadRecords[i]);

      if (intervalMs > 0) await sleep(intervalMs);
    }

    return total;
  }

  async function waitForSubjectEditable(inputSelector, record, timeoutMs) {
    const startedAt = Date.now();
    let attempts = 0;
    while (Date.now() - startedAt < timeoutMs) {
      const target = findSubjectEditableByRecord(inputSelector, record);
      if (target) return target;
      scrollSubjectGrid(inputSelector, record, attempts);
      attempts += 1;
      await sleep(120);
    }
    return null;
  }

  function findSubjectEditableByRecord(inputSelector, record) {
    const recordNumber = normalizeRowNumber(record?.id);
    if (!recordNumber) return null;
    return findVisibleEditables(inputSelector).find((target) => {
      return (matchStudentNumber ? getGridStudentNumber(target) : getGridRowNumber(target)) === recordNumber;
    }) || null;
  }

  function getGridStudentNumber(element) {
    const row = element?.closest?.(".cl-grid-row, [role='row']");
    if (!row) return "";
    const numberCell = [...row.querySelectorAll("[aria-label]")].find((cell) => /(?:^|\s)번호\s+\d+(?:\s|$)/.test(cell.getAttribute("aria-label") || ""));
    const match = numberCell?.getAttribute("aria-label")?.match(/(?:^|\s)번호\s+(\d+)(?:\s|$)/);
    return match ? normalizeRowNumber(match[1]) : "";
  }

  function getGridRowNumber(element) {
    const cell = element?.closest?.(".cl-grid-cell");
    const row = element?.closest?.(".cl-grid-row");
    const labels = [
      cell?.getAttribute("aria-label"),
      row?.getAttribute("aria-label"),
      row?.getAttribute("aria-rowindex")
    ].filter(Boolean);

    for (const label of labels) {
      const match = String(label).match(/^(\d+)행/);
      if (match) return normalizeRowNumber(match[1]);
    }
    return null;
  }

  function normalizeRowNumber(value) {
    const number = Number(String(value ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(number) && number > 0 ? String(number) : "";
  }

  function scrollSubjectGrid(inputSelector, record, attempt) {
    const focused = findActiveEditable(inputSelector);
    const anchor = focused || findVisibleEditables(inputSelector).at(-1);
    const grid = anchor?.closest?.(".cl-grid") || document.querySelector(".cl-grid");
    const scrollRoot = findGridVerticalScrollbar(grid)
      || anchor?.closest?.("[data-role='scroll-container'], .cl-scrollbar")
      || grid?.querySelector?.("[data-role='scroll-container'], .cl-scrollbar")
      || document.scrollingElement
      || document.documentElement;
    const deltaY = getSubjectScrollDirection(inputSelector, record) * (320 + (attempt % 3) * 120);

    for (const target of [anchor, grid, scrollRoot].filter(Boolean)) {
      target.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        composed: true,
        deltaY
      }));
    }

    if ("scrollTop" in scrollRoot) {
      scrollRoot.scrollTop += deltaY;
      scrollRoot.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
  }

  function findGridVerticalScrollbar(grid) {
    const scrollbars = [...(grid?.querySelectorAll?.(".cl-grid-detail .cl-scrollbar, .cl-scrollbar") || [])];
    return scrollbars
      .filter((element) => element instanceof HTMLElement)
      .filter((element) => element.scrollHeight > element.clientHeight)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || null;
  }

  function getSubjectScrollDirection(inputSelector, record) {
    const wanted = Number(normalizeRowNumber(record?.id));
    const visibleRows = findVisibleEditables(inputSelector)
      .map(matchStudentNumber ? getGridStudentNumber : getGridRowNumber)
      .map(Number)
      .filter((number) => Number.isFinite(number) && number > 0);

    if (!Number.isFinite(wanted) || !visibleRows.length) return 1;
    const min = Math.min(...visibleRows);
    const max = Math.max(...visibleRows);
    if (wanted < min) return -1;
    if (wanted > max) return 1;
    return 1;
  }

  function findVisibleEditables(inputSelector) {
    return [...document.querySelectorAll(inputSelector)]
      .filter(isEditable)
      .filter(isVisible)
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || ar.left - br.left;
      });
  }

  function isEditable(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.matches(".cl-textarea")) return !element.classList.contains("cl-disabled");
    if (element.matches("textarea, input")) return !element.disabled && !element.readOnly;
    return element.isContentEditable;
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function rectanglesOverlap(a, b) {
    return a.left < b.right
      && a.right > b.left
      && a.top < b.bottom
      && a.bottom > b.top;
  }

  async function setEditableValue(element, value, options = {}) {
    if (options.append && (!element.isConnected || !isEditable(element))) {
      throw new Error("입력칸이 바뀌었습니다. 나이스에서 해당 학생의 칸을 다시 선택하세요.");
    }
    element.scrollIntoView({ block: "center", inline: "nearest" });
    activateEditable(element);
    await sleep(180);

    if (element.matches(".cl-textarea")) {
      const nativeEditor = await waitForNativeEditor(element, 1200, options.append);
      if (nativeEditor) {
        nativeEditor.focus();
        if (options.append) {
          appendToEditor(nativeEditor, value);
          await sleep(80);
          commitNativeEditor(nativeEditor, element, options);
          return;
        }
        nativeEditor.select?.();
        clearNativeEditor(nativeEditor);
        nativeEditor.focus();
        nativeEditor.select?.();
        if (options.simulatePaste) {
          dispatchPasteEvent(nativeEditor, value);
          insertTextCommand(value);
          await sleep(20);
        }
        setNativeInputValue(nativeEditor, value);
        dispatchEditableEvents(nativeEditor, value);
        await sleep(80);
        await commitNativeEditor(nativeEditor, element, options);
        return;
      }

      if (options.append) throw unreadableEditorError();
      if (options.simulatePaste) dispatchPasteEvent(element, value);
      dispatchEditableEvents(element, value);
      return;
    }

    if (options.append) {
      appendToEditor(element, value);
      return;
    }

    if (element.isContentEditable) {
      element.textContent = value;
      dispatchEditableEvents(element, value);
      return;
    }

    setNativeInputValue(element, value);
    dispatchEditableEvents(element, value);
  }

  function unreadableEditorError() {
    return new Error("기존 내용을 읽을 수 없어 이 칸은 변경하지 않았습니다. 해당 입력칸을 확인하세요.");
  }

  function appendToEditor(editor, value) {
    if (!editor.isConnected || !isEditable(editor) || editor.closest("#forteacher-neis-overlay")) {
      throw unreadableEditorError();
    }
    const nativeInput = editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement;
    if (nativeInput ? editor.disabled || editor.readOnly : !editor.isContentEditable) throw unreadableEditorError();
    const existing = nativeInput ? editor.value : editor.innerText;
    const singleLine = editor instanceof HTMLInputElement;
    const prefix = existing.trimEnd();
    const suffix = `${prefix ? " " : ""}${value.trimStart()}`;
    const nextValue = prefix + suffix;
    if (nativeInput && editor.maxLength >= 0 && nextValue.length > editor.maxLength) {
      throw new Error("이어쓴 내용이 입력칸의 글자 수 제한을 넘습니다. 기존 내용은 유지했습니다.");
    }
    if (nativeInput) {
      setNativeInputValue(editor, nextValue);
      const expected = singleLine ? nextValue.replace(/[\r\n]/g, "") : nextValue.replace(/\r\n?/g, "\n");
      if (editor.value !== expected) {
        setNativeInputValue(editor, existing);
        throw new Error("새 내용을 입력할 수 없어 기존 내용을 유지했습니다.");
      }
    } else {
      appendContentEditable(editor, suffix, Boolean(prefix));
    }
    // Append emits the completed field without publishing an intermediate empty value.
    dispatchInputEvents(editor, nativeInput ? editor.value : editor.innerText);
  }

  function appendContentEditable(editor, suffix, hasExistingText) {
    const fragment = document.createDocumentFragment();
    suffix.split(/\r\n?|\n/).forEach((line, index) => {
      if (index) fragment.append(document.createElement("br"));
      if (line) fragment.append(document.createTextNode(line));
    });
    if (!hasExistingText) {
      editor.replaceChildren(fragment);
      return;
    }

    // Insert within the last line, preserving the earlier nodes and line breaks.
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let lastText;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.data.trim()) lastText = node;
    }
    if (!lastText) throw unreadableEditorError();
    const offset = lastText.data.trimEnd().length;
    const range = document.createRange();
    range.setStart(lastText, offset);
    range.setEnd(editor, editor.childNodes.length);
    range.deleteContents();
    range.setStart(lastText, offset);
    range.collapse(true);
    range.insertNode(fragment);
  }

  function activateEditable(element) {
    const cell = element.closest(".cl-grid-cell") || element;
    for (const target of [cell, element]) {
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerType: "mouse" }));
      target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
      target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, composed: true }));
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
      target.click();
      target.focus();
    }
    element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "F2" }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "F2" }));
  }

  async function waitForNativeEditor(container, timeoutMs, requireMatch = false) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const editor = findNativeEditor(container, requireMatch);
      if (editor) return editor;
      await sleep(50);
    }
    return null;
  }

  function findNativeEditor(container, requireMatch) {
    const editorSelector = "textarea, input[type='text'], [contenteditable='true']";
    const isNativeEditor = (editor) => editor?.matches?.(editorSelector) && isEditable(editor)
      && (!requireMatch || (!editor.closest("#forteacher-neis-overlay") && isVisible(editor)));
    const localEditor = [container, ...container.querySelectorAll(editorSelector)].find(isNativeEditor);
    if (localEditor) return localEditor;
    const active = document.activeElement;
    if (!requireMatch && active && active !== container && isEditable(active) && isVisible(active)) return active;
    const containerRect = container.getBoundingClientRect();
    const containerCell = container.closest(".cl-grid-cell");
    const candidates = [...document.querySelectorAll(editorSelector)]
      .filter(isEditable)
      .filter(isVisible)
      .filter((candidate) => rectanglesOverlap(candidate.getBoundingClientRect(), containerRect));
    if (!requireMatch) return candidates[0] || null;

    // NEIS can position its editor outside the cell. Only trust the focused editor
    // over the target, never a different grid cell or a stale editor.
    if (!isNativeEditor(active) || !candidates.includes(active)) return null;
    const activeCell = active.closest(".cl-grid-cell");
    return !activeCell || activeCell === containerCell ? active : null;
  }

  function setNativeInputValue(element, value) {
    if (element.isContentEditable) {
      element.textContent = value;
      return;
    }
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(element, value);
  }

  function clearNativeEditor(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.select();
      setNativeInputValue(element, "");
      dispatchEditableEvents(element, "");
      return;
    }
    if (element.isContentEditable) {
      element.textContent = "";
      dispatchEditableEvents(element, "");
    }
  }

  function insertTextCommand(value) {
    try {
      document.execCommand("insertText", false, value);
    } catch {
      // Some NEIS frames disable execCommand; native value setting follows.
    }
  }

  function commitNativeEditor(editor, originalElement, options = {}) {
    if (!options.append) dispatchEditableEvents(editor, editor.value ?? editor.textContent ?? "");
    if (options.advanceAfterCommit) {
      editor.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
      editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Tab" }));
    }
    editor.blur();
    originalElement.dispatchEvent(new Event("change", { bubbles: true }));
    originalElement.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function dispatchPasteEvent(element, value) {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    data.setData("text", value);
    element.dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      composed: true,
      clipboardData: data
    }));
  }

  function dispatchInputEvents(element, value = element.value ?? element.textContent ?? "") {
    element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, composed: true, inputType: "insertFromPaste", data: value }));
    element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertFromPaste", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Process" }));
  }

  function dispatchEditableEvents(element, value = element.value ?? element.textContent ?? "") {
    dispatchInputEvents(element, value);
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function escapeText(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
