importScripts("config.js", "work-log-records.js");

const PANEL_PREFIX = "neisPanel:";
const SELECTION_PREFIX = "neisUploadLastWorkLog";
const PANEL_LIFETIME = 30 * 60 * 1000;
const EXPIRED = "패널 연결이 끝났습니다. 확장 프로그램에서 패널을 다시 여세요.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(["behavior", "creative", "subject"]);

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || !["neis-panel-open", "neis-panel-read", "neis-panel-reset"].includes(message?.type)) return;
  handleMessage(message, sender).then(
    data => reply({ ok: true, ...data }),
    error => reply({ ok: false, error: error.message })
  );
  return true;
});

chrome.tabs.onRemoved.addListener(tabId => {
  void chrome.storage.session.remove(PANEL_PREFIX + tabId).catch(() => {});
});

async function getAccount() {
  const { forteacherSession, forteacherAppOrigin } = await chrome.storage.local.get(["forteacherSession", "forteacherAppOrigin"]);
  const origin = FORTEACHER_EXTENSION_CONFIG.appOrigin;
  if (!forteacherSession?.user?.id || !forteacherSession.access_token || (forteacherAppOrigin && forteacherAppOrigin !== origin)) {
    throw new Error("웹앱 계정을 다시 연결하세요.");
  }
  return { owner: forteacherSession.user.id, token: forteacherSession.access_token, origin };
}

async function handleMessage(message, sender) {
  if (message.type === "neis-panel-read") return readRecords(message, sender.tab?.id);
  if (sender.url !== chrome.runtime.getURL("popup.html")) throw new Error(EXPIRED);
  if (message.type === "neis-panel-reset") {
    const entries = await chrome.storage.session.get(null);
    await chrome.storage.session.remove(Object.keys(entries).filter(key => key.startsWith(PANEL_PREFIX)));
    return {};
  }

  const { tabId, logId, projectId, category, subjectIds, page } = message;
  if (!Number.isInteger(tabId) || tabId < 1 || !UUID.test(logId) || !CATEGORIES.has(category)
      || (projectId && (category !== "subject" || !UUID.test(projectId) || !Array.isArray(subjectIds)
        || subjectIds.length > 3030 || !subjectIds.includes(logId) || !subjectIds.every(id => UUID.test(id))))) {
    throw new Error("패널에 표시할 작업로그를 다시 선택하세요.");
  }
  const account = await getAccount();
  if (message.owner !== account.owner) throw new Error("연결된 계정이 바뀌었습니다. 다시 불러오세요.");
  const key = PANEL_PREFIX + tabId;
  const session = {
    id: crypto.randomUUID(), owner: account.owner, category, logId, projectId: projectId || "",
    allowed: projectId ? [...new Set(subjectIds)] : [logId], page: Number.isInteger(page) ? page : 0,
    expiresAt: Date.now() + PANEL_LIFETIME
  };
  await chrome.storage.session.set({ [key]: session });
  return { id: session.id, expiresAt: session.expiresAt };
}

async function readRecords({ id, logId, remember }, tabId) {
  const key = PANEL_PREFIX + tabId;
  const session = (await chrome.storage.session.get(key))[key];
  if (!session || session.id !== id || session.expiresAt <= Date.now() || !session.allowed.includes(logId)) throw new Error(EXPIRED);
  const account = await getAccount();
  if (session.owner !== account.owner) throw new Error(EXPIRED);

  const response = await fetch(`${account.origin}/api/work-logs/${encodeURIComponent(logId)}`, {
    headers: { Authorization: `Bearer ${account.token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  }).catch(() => { throw new Error("웹앱에 연결하지 못했습니다. 다시 시도하세요."); });
  if (response.status === 401) throw new Error("연결이 만료됐습니다. 확장 프로그램에서 계정을 다시 연결하세요.");
  if (response.status === 404) throw new Error("작업로그를 찾을 수 없습니다.");
  if (!response.ok) throw new Error("작업로그를 확인하지 못했습니다. 다시 시도하세요.");
  const log = await response.json();
  if (log.id !== logId || log.category !== session.category || !Array.isArray(log.data?.students)
      || (log.project?.id || "") !== session.projectId) throw new Error("작업로그가 바뀌었습니다. 확장 프로그램에서 다시 선택하세요.");
  if (log.archived_at) throw new Error("보관함으로 이동한 작업로그입니다.");

  const latest = (await chrome.storage.session.get(key))[key];
  const current = await getAccount();
  if (current.owner !== session.owner || latest?.id !== id || latest.expiresAt <= Date.now()) throw new Error(EXPIRED);

  if (remember) {
    const selectionKey = `${SELECTION_PREFIX}:${JSON.stringify([account.origin, account.owner, session.category])}`;
    await chrome.storage.local.set({
      [selectionKey]: { key: session.projectId ? `project:${session.projectId}` : session.logId, detailId: logId, page: session.page }
    });
  }
  return { records: ForTeacherWorkLogs.toRecords(log.category, log.data, log.title), revision: log.revision };
}
