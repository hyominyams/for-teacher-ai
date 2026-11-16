/* Standalone, synthetic preview. No network calls, credentials, or persistent data. */
"use strict";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const labels = { behavior: "행동특성 및 종합의견", subject: "학기말 종합의견", creative: "창의적 체험활동" };
const icons = { behavior: "heart", subject: "book", creative: "spark" };
const statuses = { empty: "작성 전", review: "검토 필요", done: "검토 완료" };
const Core = globalThis.PreviewCore;
const Catalog = globalThis.PreviewCatalog;
const assessments = { 국어: ["읽기", "쓰기", "듣기·말하기"], 수학: ["수와 연산", "도형", "자료 해석"], 사회: ["지역 이해", "자료 탐구", "의견 나누기"] };
const keywords = [
  ["성실함", "책임감", "배려"], ["협동심", "경청", "의사소통"],
  ["탐구심", "논리적 사고"], ["자기주도성", "꾸준함"],
  ["배려", "공감"], ["도전", "창의성"]
];
const activities = [["학급회의", "안전교육"], ["환경보호", "자원순환"], ["진로 탐색", "협동 활동"], ["독서 활동", "학급자치"]];
const sampleResults = {
  behavior: [
    "맡은 역할을 끝까지 책임감 있게 수행하며 수업과 학급 활동에 성실히 참여함. 친구의 이야기를 끝까지 듣고 도움이 필요한 상황에서 먼저 손을 내미는 배려심이 돋보임. 모둠 활동에서 서로 다른 의견을 존중하며 함께 해결 방법을 찾아가는 태도를 지님.",
    "모둠 활동에서 친구들의 의견을 차분히 듣고 자신의 생각을 조리 있게 표현함. 공동의 목표를 위해 역할을 나누고 협력하며, 의견이 다를 때에도 대화를 통해 해결하려는 자세가 돋보임.",
    "새로운 내용을 접하면 궁금한 점을 스스로 찾아 질문하고 탐구하는 태도가 돋보임. 여러 자료를 비교하며 자신의 생각을 논리적으로 정리하고, 배운 내용을 생활 속 문제와 연결하여 이해하려고 노력함.",
    "스스로 학습 계획을 세우고 실천하려는 의지가 있으며, 어려운 과제를 만나도 꾸준히 해결 방법을 찾아감. 활동 후 자신의 과정을 돌아보며 부족한 부분을 보완하는 성실한 모습을 보임."
  ],
  국어: [
    "글을 읽고 중심 내용을 정확하게 파악하며 중요한 정보를 자신의 말로 간추림. 글 속 인물의 마음을 상황과 연결하여 설명하고 자신의 경험과 비교하며 내용을 이해함.",
    "여러 자료의 공통점과 차이점을 찾아 비교하고 자신의 생각을 근거와 함께 표현함. 친구의 발표를 경청하며 궁금한 점을 질문하고 서로의 관점을 존중함."
  ],
  수학: [
    "분수의 덧셈과 뺄셈 원리를 이해하고 풀이 과정을 순서대로 설명함. 도형을 관찰하며 공통된 성질을 찾고 다양한 해결 방법을 비교함.",
    "자료를 표와 그래프로 나타내고 변화하는 양을 비교함. 계산 과정을 다시 확인하며 오류를 찾고 자신의 풀이를 설명하려고 노력함."
  ],
  사회: [
    "우리 지역의 생활 모습을 자료에서 찾아 설명함. 지역의 변화에 관심을 가지고 모둠 친구들과 조사한 내용을 나누며 서로의 의견을 경청함.",
    "지도와 사진을 활용하여 지역의 특징을 비교함. 조사 과정에서 궁금한 점을 질문하고 함께 수집한 자료를 정리하여 발표함."
  ],
  creative: [
    "학급회의에서 친구들의 의견을 경청하고 학급의 문제를 함께 해결하기 위한 의견을 제안함. 안전교육에 참여하여 생활 속 위험 상황을 알아보고 자신과 친구의 안전을 지키는 방법을 익힘.",
    "환경보호 활동을 통해 생활 속 쓰레기를 줄이는 방법을 알아보고 분리배출을 실천함. 친구들과 역할을 나누어 교실 환경을 정돈하며 공동체를 위한 활동에 성실히 참여함."
  ]
};
function fixture(scope) {
  return Array.from({ length: 28 }, (_, i) => ({
    id: i + 1,
    tags: [...(scope === "creative" ? activities[i % activities.length] : keywords[i % keywords.length])],
    availableTags: [...new Set([...Catalog.defaultKeywords, ...keywords[i % keywords.length]])],
    officerRole: scope === "creative" && i < 2 ? ["반장", "부반장"][i] : "임원아님",
    officerPeriod: scope === "creative" && i < 2 ? "2026.03.01.~2026.08.31." : "",
    levels: ["상", i % 2 ? "상" : "중", i % 3 ? "중" : "상"],
    note: i % 4 === 0 ? "맡은 역할을 끝까지 해내며 친구를 살펴봄." : i % 4 === 1 ? "친구의 이야기를 듣고 자신의 생각을 덧붙임." : "",
    result: i < 18 ? sampleResults[scope][i % sampleResults[scope].length] : "",
    status: i < 9 ? "done" : i < 18 ? "review" : "empty"
  }));
}
const data = Object.fromEntries(["behavior", "creative", ...Object.keys(assessments)].map(scope => [scope, fixture(scope)]));
const scopeCounts = Object.fromEntries(Object.keys(data).map(key => [key, 28]));
const limits = { behavior: 300, subject: 300, creative: 300 };
let subjectOrder = Object.keys(assessments);
const subjectMeta = Object.fromEntries(subjectOrder.map(name => [name, {
  schoolLevel: "초등학교", grade: 5,
  items: assessments[name].map(area => ({ id: crypto.randomUUID(), area, standard: "", criteria: "", competency: "", high: "", middle: "", low: "" }))
}]));
let resetUndo = null, pickerSelected = new Set(), pickerAvailable = [], importCandidate = null, assessmentDraft = null, confirmAction = null, editorExpanded = false;
let category = "behavior", subject = "국어", filter = "all", view = "review";
let selected = new Set(), onlySelected = false, editing = null, editQueue = [], limit = 300;
let toastTimer, lastEditorTrigger = null, editorRatio = 46;
const smallScreen = matchMedia("(max-width: 1000px)");
const currentScope = () => category === "subject" ? subject : category;
const records = () => data[currentScope()].slice(0, scopeCounts[currentScope()]);
const tagsFor = s => category === "subject" ? assessments[subject].map((name, i) => name + " · " + s.levels[i]) : s.tags;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3600);
}
function info(title, message) {
  $("#info-title").textContent = title;
  $("#info-body").textContent = message;
  $("#info").showModal();
}
function visible() {
  const query = $("#search").value.trim().replace(/^0+(?=\d)/, "");
  return records().filter(s => (filter === "all" || s.status === filter) && (!onlySelected || selected.has(s.id)) && (!query || String(s.id).includes(query)));
}
function statusHTML(s) {
  return '<span class="status ' + s.status + '"><i></i>' + statuses[s.status] + "</span>";
}
function checkboxHTML(s) {
  return '<input type="checkbox" id="select-' + s.id + '" data-select="' + s.id + '" aria-label="' + s.id + '번 학생 선택" ' + (selected.has(s.id) ? "checked" : "") + ">";
}
function rowHTML(s) {
  return '<article class="student-row' + (selected.has(s.id) ? " selected" : "") + (editing?.id === s.id ? " editing" : "") + '" data-row="' + s.id + '">' +
    checkboxHTML(s) + '<span class="student-number">' + String(s.id).padStart(2, "0") + '</span><div class="row-input"><div class="tags">' +
    tagsFor(s).map(tag => '<span class="tag">' + esc(tag) + "</span>").join("") +
    (category === "creative" && s.officerRole !== "임원아님" ? '<span class="tag officer-tag" title="' + esc(s.officerPeriod || "기간 미입력") + '">' + esc(s.officerRole) + "</span>" : "") +
    '</div><p class="row-note">' + esc(s.note) + "</p></div>" +
    '<button class="result-preview" id="edit-' + s.id + '" data-edit="' + s.id + '" aria-label="' + s.id + '번 학생 내용 편집"' + (editing?.id === s.id ? ' aria-current="true"' : "") + ">" +
    (s.result ? '<span class="excerpt">' + esc(s.result) + '</span><span class="row-meta"><span>' + s.result.length + '자 / 목표 ' + limit + '자</span><span class="edit-label">편집 ↗</span></span>' :
      '<span class="empty-result">관찰 내용을 입력하고 초안을 만들어보세요.</span><span class="row-meta"><span>아직 작성한 결과가 없습니다</span><span class="edit-label">입력 ↗</span></span>') +
    "</button>" + statusHTML(s) + "</article>";
}
function assessmentHTML(list) {
  return '<p class="assessment-hint">Tab으로 다음 칸 · Enter로 다음 학생 · 엑셀의 상·중·하 범위를 복사해 붙여넣을 수 있어요.</p>' +
    '<table class="assessment-table"><caption class="sr-only">학생별 ' + esc(subject) + ' 성취수준 입력</caption><thead><tr><th scope="col">선택</th><th scope="col">번호</th>' +
    assessments[subject].map(name => '<th scope="col">' + esc(name) + "</th>").join("") + '<th scope="col">진행 상태</th></tr></thead><tbody>' +
    list.map(s => '<tr data-row="' + s.id + '" class="' + (selected.has(s.id) ? "selected" : "") + '"><td>' + checkboxHTML(s) +
      '</td><th scope="row" class="assessment-number">' + String(s.id).padStart(2, "0") + "</th>" +
      s.levels.map((level, col) => '<td><select id="level-' + s.id + "-" + col + '" data-level="' + col + '" data-student="' + s.id +
        '" aria-label="' + s.id + "번 " + esc(assessments[subject][col]) + '">' +
        ["", "상", "중", "하"].map(value => '<option value="' + value + '"' + (level === value ? " selected" : "") + ">" + (value || "미입력") + "</option>").join("") + "</select></td>").join("") +
      "<td>" + statusHTML(s) + "</td></tr>").join("") + "</tbody></table>";
}
function updateSelection() {
  const list = visible();
  const visibleIds = new Set(list.map(s => s.id));
  const hiddenCount = [...selected].filter(id => !visibleIds.has(id)).length;
  $("#selection-bar").hidden = selected.size === 0;
  $("#selection-count").textContent = selected.size + "명 선택" + (hiddenCount ? " · 현재 화면 밖 " + hiddenCount + "명" : "");
  $("#generate-label").textContent = selected.size ? "선택 " + selected.size + "명 생성" : "선택 생성";
  $("#generate").disabled = !selected.size;
  $("#generate-all").disabled = !records().length;
  $("#select-all").checked = list.length > 0 && list.every(s => selected.has(s.id));
  $("#select-all").indeterminate = list.some(s => selected.has(s.id)) && !$("#select-all").checked;
  $("#show-selected").setAttribute("aria-pressed", String(onlySelected));
  $("#show-selected").textContent = onlySelected ? "전체 목록으로" : "선택 학생만 보기";
}
function render() {
  const focusId = document.activeElement?.id;
  const all = records(), list = visible();
  limit = limits[category];
  $(".title-row .count").textContent = all.length + "명";
  $("#review-progress").max = all.length || 1;
  $("#undo-reset").hidden = !resetUndo || resetUndo.scope !== currentScope();
  document.body.dataset.category = category;
  $("#page-heading").textContent = labels[category];
  $("#category-icon use").setAttribute("href", "#i-" + icons[category]);
  $("#subjects").hidden = category !== "subject";
  $("#input-heading").textContent = category === "subject" ? "평가 요약과 메모" : category === "creative" ? "참여 활동과 메모" : "관찰 키워드와 메모";
  $$("[data-filter]").forEach(button => {
    const value = button.dataset.filter;
    button.classList.toggle("active", filter === value);
    button.setAttribute("aria-pressed", String(filter === value));
    button.querySelector("span").textContent = value === "all" ? all.length : all.filter(s => s.status === value).length;
  });
  const assessmentView = category === "subject" && view === "assessment";
  $("#column-header").classList.toggle("assessment-selection-header", assessmentView);
  $("#student-list").innerHTML = list.length ? assessmentView ? assessmentHTML(list) : list.map(rowHTML).join("") :
    '<div class="empty-view">조건에 맞는 학생이 없습니다.<br>상태 필터나 학생 번호를 바꿔보세요.</div>';
  const done = all.filter(s => s.status === "done").length;
  $("#footer-count").textContent = all.length + "명 중 " + done + "명 검토 완료";
  $("#review-progress").value = done;
  $("#polish-open").disabled = all.filter(s => s.result.trim()).length < 2;
  updateSelection();
  if (focusId && document.activeElement === document.body) document.getElementById(focusId)?.focus({ preventScroll: true });
}
function closeEditor(restoreFocus = true) {
  if (!editing) return;
  const id = editing.id;
  editing = null;
  $("#editor").close();
  $("#workbench").classList.remove("has-editor");
  $("#panel-resizer").hidden = true;
  render();
  if (restoreFocus) (document.getElementById("edit-" + id) || (lastEditorTrigger?.isConnected ? lastEditorTrigger : null) || $("#table-scroller")).focus({ preventScroll: true });
}
function syncEditorMode() {
  if (!editing) return;
  const dialog = $("#editor");
  const focusId = document.activeElement?.id;
  if (dialog.open) dialog.close();
  if (smallScreen.matches || editorExpanded) dialog.showModal();
  else dialog.show();
  dialog.setAttribute("aria-modal", String(smallScreen.matches || editorExpanded));
  dialog.classList.toggle("is-expanded", editorExpanded);
  $("#panel-resizer").hidden = smallScreen.matches || editorExpanded;
  if (focusId && dialog.contains(document.getElementById(focusId))) document.getElementById(focusId).focus({ preventScroll: true });
}
function updateEditorState() {
  $("#editor-count").textContent = $("#editor-result").value.length + "자 / 목표 " + limit + "자";
  $("#editor-status").textContent = statuses[editing.status];
  const empty = !$("#editor-result").value.trim();
  $("#editor-done").disabled = empty;
  $("#editor-done-next").disabled = empty;
  $("#editor-copy").disabled = empty;
  $("#editor-generate span").textContent = empty ? "이 학생 생성" : "이 학생 재생성";
  $("#editor-generate").disabled = !!Core.inputReason(editing, category);
  $("#editor-generate").title = Core.inputReason(editing, category) || "이 학생만 대상으로 생성";
  const index = editQueue.indexOf(editing.id);
  $("#editor-position").textContent = (index + 1) + " / " + editQueue.length;
  $("#editor-prev").disabled = index <= 0;
  $("#editor-next").disabled = index >= editQueue.length - 1;
}
function openEditor(id, keepQueue = false) {
  const next = records().find(s => s.id === id);
  if (!next) return;
  const wasOpen = $("#editor").open;
  if (!keepQueue) {
    editQueue = visible().map(s => s.id);
    lastEditorTrigger = document.getElementById("edit-" + id);
  }
  editing = next;
  $("#editor-title").textContent = String(id).padStart(2, "0") + "번 학생";
  $("#editor-eyebrow").textContent = labels[category] + (category === "subject" ? " · " + subject : "");
  $("#keywords-label").textContent = category === "subject" ? "평가 요약" : category === "creative" ? "참여 활동" : "관찰 키워드";
  $("#editor-keywords").value = tagsFor(editing).join(", ");
  $("#editor-keywords").readOnly = category === "subject";
  $("#tag-picker-open").hidden = category === "subject";
  $("#tag-picker-open").textContent = category === "creative" ? "행사 목록에서 선택" : "키워드 목록에서 선택";
  $("#editor-keywords").nextElementSibling.textContent = category === "subject" ? "성취수준은 ‘평가 입력’ 보기에서 바꿀 수 있습니다." : "쉼표로 구분해 입력하세요. 학생 실명은 입력하지 않습니다.";
  $("#editor-note").value = editing.note;
  $("#editor-result").value = editing.result;
  $("#editor-inputs").open = !editing.result.trim();
  $("#officer-fields").hidden = category !== "creative";
  const roles = [...new Set(["임원아님", "반장", "부반장", "회장", "부회장", ...Catalog.OFFICER_ROLES, editing.officerRole || "임원아님"])];
  $("#officer-role").innerHTML = roles.map(role => '<option' + (role === (editing.officerRole || "임원아님") ? " selected" : "") + ">" + esc(role) + "</option>").join("");
  $("#officer-period").value = editing.officerPeriod || "";
  $("#officer-period").disabled = (editing.officerRole || "임원아님") === "임원아님";
  $("#input-summary").textContent = tagsFor(editing).join(" · ");
  $("#draft-state").textContent = "수정 내용은 이 미리보기에만 유지됩니다.";
  $("#workbench").classList.add("has-editor");
  updateEditorState();
  render();
  if (!wasOpen) syncEditorMode();
  $("#editor-result").focus({ preventScroll: true });
}
function moveEditor(delta) {
  const id = editQueue[editQueue.indexOf(editing.id) + delta];
  if (id) openEditor(id, true);
}
function markReviewed(next) {
  if (!editing?.result.trim()) return;
  const current = editing.id;
  const index = editQueue.indexOf(current);
  editing.status = "done";
  render();
  updateEditorState();
  if (next) {
    const remaining = editQueue.slice(index + 1).concat(editQueue.slice(0, index));
    const nextId = remaining.find(id => records().find(s => s.id === id)?.status !== "done");
    if (nextId) openEditor(nextId, true);
    else { closeEditor(); notify("이 검토 목록의 학생을 모두 확인했습니다."); }
  } else notify(current + "번 학생을 미리보기에서 검토 완료로 표시했습니다.");
}
function markInputChanged(s) { s.status = s.result.trim() ? "review" : "empty"; }

$$(".navline [data-category]").forEach(button => button.onclick = () => {
  closeEditor(false);
  category = button.dataset.category;
  filter = "all"; view = "review"; onlySelected = false; selected.clear(); $("#search").value = "";
  $$(".navline [data-category]").forEach(tab => {
    tab.classList.toggle("active", tab === button);
    if (tab === button) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
  });
  $$("[data-view]").forEach(tab => { tab.classList.toggle("active", tab.dataset.view === view); tab.setAttribute("aria-pressed", String(tab.dataset.view === view)); });
  $("#table-scroller").scrollTop = 0;
  render();
});
$(".subject-tabs").onclick = event => {
  const button = event.target.closest("[data-subject]");
  if (button) switchSubject(button.dataset.subject);
};
$$("[data-view]").forEach(button => button.onclick = () => {
  closeEditor(false); view = button.dataset.view;
  $$("[data-view]").forEach(tab => { tab.classList.toggle("active", tab === button); tab.setAttribute("aria-pressed", String(tab === button)); });
  $("#table-scroller").scrollTop = 0;
  render();
});
$$("[data-filter]").forEach(button => button.onclick = () => { closeEditor(false); filter = button.dataset.filter; $("#table-scroller").scrollTop = 0; render(); });
$("#search").oninput = () => { closeEditor(false); render(); };
$("#student-list").addEventListener("click", event => {
  const button = event.target.closest("[data-edit]");
  if (button) openEditor(Number(button.dataset.edit));
});
$("#student-list").addEventListener("change", event => {
  if (event.target.matches("[data-select]")) {
    const id = Number(event.target.dataset.select);
    event.target.checked ? selected.add(id) : selected.delete(id);
    if (!selected.size) onlySelected = false;
    render();
  } else if (event.target.matches("[data-level]")) {
    const s = records().find(row => row.id === Number(event.target.dataset.student));
    s.levels[Number(event.target.dataset.level)] = event.target.value;
    markInputChanged(s); render();
  }
});
$("#select-all").onchange = event => {
  const allVisible = visible();
  allVisible.forEach(s => event.target.checked ? selected.add(s.id) : selected.delete(s.id));
  if (!selected.size) onlySelected = false;
  render();
};
$("#clear-selection").onclick = () => { selected.clear(); onlySelected = false; render(); };
$("#show-selected").onclick = () => { onlySelected = !onlySelected; render(); };
$("#density-toggle").onclick = event => {
  const compact = document.body.dataset.density !== "compact";
  document.body.dataset.density = compact ? "compact" : "comfortable";
  event.currentTarget.textContent = compact ? "촘촘하게" : "여유롭게";
  event.currentTarget.setAttribute("aria-pressed", String(compact));
};
$("#theme-toggle").onclick = event => {
  const dark = document.documentElement.classList.toggle("dark");
  event.currentTarget.setAttribute("aria-label", dark ? "라이트 모드 켜기" : "다크 모드 켜기");
  event.currentTarget.setAttribute("aria-pressed", String(dark));
};
["#editor-keywords", "#editor-note", "#editor-result"].forEach(selector => $(selector).oninput = () => {
  if (!editing) return;
  if (category !== "subject") {
    editing.tags = Core.splitTags($("#editor-keywords").value);
    editing.availableTags = [...new Set([...(editing.availableTags || []), ...editing.tags])];
  }
  editing.note = $("#editor-note").value;
  editing.result = $("#editor-result").value;
  $("#input-summary").textContent = tagsFor(editing).join(" · ");
  markInputChanged(editing);
  $("#draft-state").textContent = "미리보기에 반영됨 · 서버에 저장하지 않습니다.";
  updateEditorState(); render();
});
$("#editor-prev").onclick = () => moveEditor(-1);
$("#editor-next").onclick = () => moveEditor(1);
$("#editor-close").onclick = () => closeEditor();
$("#editor-done").onclick = () => markReviewed(false);
$("#editor-done-next").onclick = () => markReviewed(true);
$("#editor").addEventListener("cancel", event => { event.preventDefault(); closeEditor(); });
$("#editor").addEventListener("keydown", event => {
  if (event.key === "Escape") { event.preventDefault(); closeEditor(); }
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); markReviewed(true); }
  if (event.altKey && event.key === "ArrowLeft") { event.preventDefault(); moveEditor(-1); }
  if (event.altKey && event.key === "ArrowRight") { event.preventDefault(); moveEditor(1); }
});
$("#editor-copy").onclick = async () => {
  try { await navigator.clipboard.writeText($("#editor-result").value); notify("작성 결과를 복사했습니다."); }
  catch { $("#editor-result").focus(); $("#editor-result").select(); notify("내용을 선택했습니다. Ctrl 또는 Command + C로 복사하세요."); }
};
smallScreen.addEventListener("change", syncEditorMode);
function setEditorRatio(value) {
  editorRatio = Math.max(35, Math.min(60, Math.round(value)));
  $("#workbench").style.setProperty("--editor-size", editorRatio + "%");
  $("#panel-resizer").setAttribute("aria-valuenow", String(editorRatio));
  $("#panel-resizer").setAttribute("aria-valuetext", "편집 패널 " + editorRatio + "%");
}
$("#panel-resizer").onpointerdown = event => {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.onpointermove = move => {
    const rect = $("#workbench").getBoundingClientRect();
    setEditorRatio((rect.right - move.clientX) / rect.width * 100);
  };
};
$("#panel-resizer").onpointerup = $("#panel-resizer").onpointercancel = event => {
  event.currentTarget.onpointermove = null;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
};
$("#panel-resizer").onkeydown = event => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  setEditorRatio(event.key === "Home" ? 35 : event.key === "End" ? 60 : editorRatio + (event.key === "ArrowLeft" ? 2 : -2));
};

$("#settings-open").onclick = () => {
  $("#student-count-input").value = records().length;
  $("#char-limit").value = limits[category];
  $("#settings").showModal();
};
$("#settings-form").onsubmit = event => {
  event.preventDefault();
  $("#class-label").textContent = $("#class-input").value.trim() || "학급 미설정";
  limits[category] = Number($("#char-limit").value);
  limit = limits[category];
  const nextCount = Number($("#student-count-input").value);
  const scope = currentScope();
  while (data[scope].length < nextCount) data[scope].push(emptyStudent(Math.max(0, ...data[scope].map(s => s.id)) + 1));
  scopeCounts[scope] = nextCount;
  selected = new Set([...selected].filter(id => records().some(s => s.id === id)));
  if (!selected.size) onlySelected = false;
  editQueue = editQueue.filter(id => records().some(s => s.id === id));
  if (editing && !records().some(s => s.id === editing.id)) closeEditor(false);
  $("#settings").close(); render();
  if (editing) updateEditorState();
  notify("미리보기 작성 설정을 적용했습니다.");
};
$("#bulk-open").onclick = () => {
  $("#bulk-count").textContent = $("#selection-count").textContent;
  $("#bulk-tags-group").hidden = category === "subject";
  $("#bulk-assessment-group").hidden = category !== "subject";
  $("#bulk-label").textContent = category === "creative" ? "추가할 참여 활동" : "추가할 관찰 키워드";
  $("#bulk-tags").placeholder = category === "creative" ? "예: 안전교육, 학급회의" : "예: 책임감, 협동심";
  $("#bulk-tags").value = "";
  $("#bulk-tags").required = category !== "subject";
  $("#bulk-assessment").innerHTML = assessments[subject].map((name, i) => '<option value="' + i + '">' + esc(name) + "</option>").join("");
  $("#bulk-apply").textContent = "선택 " + selected.size + "명에 적용";
  $("#bulk-apply").disabled = category === "subject" && !assessments[subject].length;
  $("#bulk").showModal();
};
$("#bulk-form").onsubmit = event => {
  event.preventDefault();
  const additions = $("#bulk-tags").value.split(",").map(s => s.trim()).filter(Boolean);
  if (category === "subject" && !assessments[subject].length) return;
  if (category !== "subject" && !additions.length) { $("#bulk-tags").focus(); return; }
  records().filter(s => selected.has(s.id)).forEach(s => {
    if (category === "subject") s.levels[Number($("#bulk-assessment").value)] = $("#bulk-level").value;
    else s.tags = [...new Set([...s.tags, ...additions])];
    markInputChanged(s);
  });
  $("#bulk").close(); render();
  if (editing) openEditor(editing.id, true);
  notify(selected.size + "명의 입력을 미리보기에 적용했습니다. 기존 결과는 유지했습니다.");
};
$("#student-list").addEventListener("keydown", event => {
  const cell = event.target.closest("[data-level]");
  if (!cell || !["Enter", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const list = visible(), row = list.findIndex(s => s.id === Number(cell.dataset.student)), col = Number(cell.dataset.level);
  const nextRow = row + (event.key === "Enter" ? event.shiftKey ? -1 : 1 : 0);
  const nextCol = col + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0);
  const nextId = list[nextRow]?.id;
  event.preventDefault();
  if (nextId) document.getElementById("level-" + nextId + "-" + nextCol)?.focus();
});
$("#student-list").addEventListener("paste", event => {
  const cell = event.target.closest("[data-level]");
  if (!cell || category !== "subject") return;
  event.preventDefault();
  const values = event.clipboardData.getData("text").trim().split(/\r?\n/).map(line => line.split("\t").map(value => value.trim()));
  const list = visible(), row = list.findIndex(s => s.id === Number(cell.dataset.student)), col = Number(cell.dataset.level);
  if (values.some(line => line.some(value => !["상", "중", "하"].includes(value)))) {
    notify("상·중·하로만 구성된 셀을 복사해주세요. 입력은 변경되지 않았습니다."); return;
  }
  if (row + values.length > list.length || values.some(line => col + line.length > assessments[subject].length)) {
    notify("붙여넣을 범위가 표를 벗어납니다. 시작 위치나 복사 범위를 확인해주세요."); return;
  }
  values.forEach((line, offset) => {
    line.forEach((value, index) => { list[row + offset].levels[col + index] = value; });
    markInputChanged(list[row + offset]);
  });
  render(); notify(values.length + "명의 성취수준을 미리보기에 붙여넣었습니다.");
});
$("#export-open").onclick = () => {
  const done = records().filter(s => s.status === "done").length;
  $("#export-summary").textContent = "전체 " + records().length + "명 · 검토 완료 " + done + "명 · 미검토 " + (records().length - done) + "명";
  $("#export-dialog").showModal();
};
$("#export-form").onsubmit = event => {
  event.preventDefault();
  const scope = document.querySelector('[name="export-scope"]:checked').value;
  const exportRows = records().filter(s => scope === "all" || s.status === "done");
  if (!exportRows.length) { $("#export-summary").textContent = "검토 완료한 학생이 없습니다. 전체 학생을 선택하거나 검토를 완료해주세요."; return; }
  const rows = Core.exportRows(exportRows, category, assessments[subject].length);
  const csv = Core.encodeCSV(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = "ForTeacherAI-미리보기-" + (category === "subject" ? subject : category) + ".csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("#export-dialog").close(); notify(exportRows.length + "명의 예시 데이터를 내려받았습니다.");
};
$("#generate").onclick = () => showGeneration("selected");
$("#generate-all").onclick = () => showGeneration("all");
$("#editor-generate").onclick = () => showGeneration("single", editing?.id);
$("#polish-open").onclick = () => info("학급 표현 다듬기", "실제 앱에 구현된 원문·수정안 비교 화면이 연결될 위치입니다. 반복 표현의 수정 제안을 학생별로 선택해 적용하고 최근 윤문을 되돌릴 수 있습니다. 이 디자인 미리보기에서는 AI를 호출하지 않습니다.");
$("#assessment-open").onclick = openAssessmentSettings;
$$("[data-info]").forEach(button => button.onclick = () => info(button.textContent.trim(), button.dataset.info));
$$("[data-close]").forEach(button => button.onclick = () => document.getElementById(button.dataset.close).close());
setEditorRatio(editorRatio);
render();

function emptyStudent(id) {
  return { id, tags: [], availableTags: [...Catalog.defaultKeywords], levels: Array(assessments[subject].length).fill(""),
    note: "", result: "", status: "empty", officerRole: "임원아님", officerPeriod: "" };
}
function refreshEditor() {
  if (editing) openEditor(editing.id, true);
  else render();
}
function confirmChange(title, message, action) {
  $("#confirm-title").textContent = title;
  $("#confirm-body").textContent = message;
  confirmAction = action;
  $("#confirm-dialog").showModal();
}
$("#confirm-apply").onclick = () => {
  const action = confirmAction;
  $("#confirm-dialog").close();
  confirmAction = null;
  action?.();
};
$("#confirm-dialog").addEventListener("close", () => { confirmAction = null; });
$("#officer-role").onchange = () => {
  if (!editing || category !== "creative") return;
  editing.officerRole = $("#officer-role").value;
  if (editing.officerRole === "임원아님") {
    editing.officerPeriod = "";
    $("#officer-period").value = "";
  }
  $("#officer-period").disabled = editing.officerRole === "임원아님";
  markInputChanged(editing); updateEditorState(); render();
};
$("#officer-period").oninput = () => {
  if (!editing || category !== "creative") return;
  editing.officerPeriod = $("#officer-period").value;
  markInputChanged(editing); updateEditorState(); render();
};
const expandButton = document.createElement("button");
expandButton.type = "button";
expandButton.className = "icon-button";
expandButton.id = "editor-expand";
expandButton.setAttribute("aria-label", "전체화면 편집");
expandButton.setAttribute("aria-pressed", "false");
expandButton.textContent = "⤢";
$("#editor-close").before(expandButton);
expandButton.onclick = () => {
  editorExpanded = !editorExpanded;
  expandButton.setAttribute("aria-label", editorExpanded ? "분할 편집으로 돌아가기" : "전체화면 편집");
  expandButton.setAttribute("aria-pressed", String(editorExpanded));
  syncEditorMode();
};

function showGeneration(scope, studentId) {
  const target = Core.generationTargets(records(), category, scope, selected, studentId);
  const title = scope === "all" ? "전체 생성" : scope === "single" ? studentId + "번 학생 " + (editing?.result ? "재생성" : "생성") : "선택 학생 생성";
  const existing = target.eligible.filter(s => s.result.trim()).length;
  $("#generation-title").textContent = title + " · 대상 확인";
  $("#generation-summary").textContent = (scope === "all" ? "현재 영역 전체 학급 기준 · 필터와 검색에 영향받지 않습니다. " : "") +
    target.requested.length + "명 중 생성 가능 " + target.eligible.length + "명" + (existing ? " · 기존 결과 재생성 " + existing + "명" : "");
  $("#generation-skipped").textContent = target.skipped.length ? "제외: " + target.skipped.map(s => s.id + "번 (" + s.reason + ")").join(", ") : "입력 조건을 모두 충족했습니다.";
  $("#generation-targets").innerHTML = target.eligible.map(s => '<div class="generation-record"><strong>' + s.id + '번 학생</strong><span>' + esc(tagsFor(s).join(", ")) + "</span>" +
    (category === "creative" ? '<span>임원: ' + esc(s.officerRole || "임원아님") + (s.officerPeriod ? " · " + esc(s.officerPeriod) : "") + "</span>" : "") +
    (s.note ? '<span>관찰 메모: ' + esc(s.note) + "</span>" : "") + "</div>").join("") || '<p class="empty-view">조건을 충족하는 학생이 없습니다.</p>';
  $("#generation-dialog").showModal();
}

$("#workspace-tools-open").onclick = () => {
  $("#tools-category").textContent = labels[category] + " · 선택 " + selected.size + "명";
  $("#auto-keywords").hidden = category !== "behavior";
  $("#auto-events").hidden = category !== "creative";
  $("#plan-import-open").hidden = category !== "subject";
  ["#auto-keywords", "#auto-events", "#tools-bulk"].forEach(id => $(id).disabled = !selected.size);
  $("#workspace-tools").showModal();
};
$("#tools-bulk").onclick = () => { $("#workspace-tools").close(); $("#bulk-open").click(); };
$("#tools-reset").onclick = () => { $("#workspace-tools").close(); openReset("all"); };
$("#editor-reset").onclick = () => openReset("single");
$("#tools-import").onclick = () => { $("#workspace-tools").close(); openImport(); };
$("#tools-neis").onclick = () => { $("#workspace-tools").close(); info("나이스로 옮기기", "기존 앱의 나이스 확장 프로그램 연결을 보존할 위치입니다. 시안의 예시 기록은 운영 저장본으로 전송하지 않습니다. 실제 앱 이식 시 기존 직책·기간과 생성 결과의 전송 경로를 함께 연결합니다."); };
$("#plan-import-open").onclick = () => { $("#workspace-tools").close(); info("평가계획 가져오기", "기존 앱의 파일 분석 → 평가계획 미리보기 → 선택 적용 흐름을 연결할 위치입니다. 이 정적 시안은 문서 분석 서버에 연결하지 않으므로 파일을 업로드하지 않습니다. CSV 양식과 교과 평가정보 편집은 이 시안에서 체험할 수 있습니다."); };

function resetTargets() {
  const scope = $("#reset-scope").value;
  return records().filter(s => scope === "all" || (scope === "single" ? s.id === editing?.id : selected.has(s.id)));
}
function resetSummary() {
  const list = resetTargets(), kind = $("#reset-kind").value;
  $("#reset-summary").textContent = labels[category] + (category === "subject" ? " · " + subject : "") + " / " + list.length + "명 대상. " +
    (kind === "all" ? "입력·결과" + (category === "creative" ? "·임원 직책·기간" : "") + "을 초기화합니다." :
      kind === "keywords" ? "선택한 키워드만 비웁니다. 작성 결과는 유지합니다." : "선택하지 않은 추가 키워드만 정리합니다. 선택 키워드와 결과는 유지합니다.");
  $("#reset-confirm").disabled = !list.length;
}
function openReset(scope) {
  $("#reset-scope").value = scope;
  $("#reset-scope option[value=single]").disabled = !editing;
  $("#reset-scope option[value=selected]").disabled = !selected.size;
  $("#reset-kind").value = "all";
  $$("#reset-kind option:not([value=all])").forEach(option => { option.hidden = category !== "behavior"; option.disabled = category !== "behavior"; });
  resetSummary(); $("#reset-dialog").showModal();
}
$("#reset-scope").onchange = $("#reset-kind").onchange = resetSummary;
$("#reset-form").onsubmit = event => {
  event.preventDefault();
  const list = resetTargets(), scope = currentScope(), kind = $("#reset-kind").value;
  if (!list.length) return;
  resetUndo = { scope, before: structuredClone(data[scope]) };
  list.forEach(s => {
    if (kind === "unused") { s.availableTags = [...new Set([...Catalog.defaultKeywords, ...s.tags])]; return; }
    s.tags = [];
    if (kind === "keywords") return;
    s.availableTags = [...Catalog.defaultKeywords];
    s.levels = Array(assessments[subject].length).fill("");
    s.note = ""; s.result = ""; s.status = "empty";
    s.officerRole = "임원아님"; s.officerPeriod = "";
  });
  resetUndo.after = JSON.stringify(data[scope]);
  $("#reset-dialog").close(); refreshEditor();
  notify(list.length + "명을 미리보기에서 초기화했습니다. 하단에서 되돌릴 수 있습니다.");
};
$("#undo-reset").onclick = () => {
  if (!resetUndo || resetUndo.scope !== currentScope()) return;
  if (JSON.stringify(data[currentScope()]) !== resetUndo.after) {
    info("이후 수정한 기록을 유지합니다", "초기화 후 입력이 변경되었습니다. 새 입력을 덮어쓰지 않도록 이 상태에서는 되돌리지 않습니다."); return;
  }
  data[currentScope()] = structuredClone(resetUndo.before);
  resetUndo = null; refreshEditor(); notify("초기화 전 입력과 결과를 복원했습니다.");
};

$("#tag-picker-open").onclick = () => {
  if (!editing || category === "subject") return;
  pickerSelected = new Set(editing.tags);
  const catalog = category === "creative" ? Catalog.CREATIVE_CATEGORIES.flatMap(group => group.events) : [...Catalog.defaultKeywords, ...Catalog.studentKeywordPool];
  pickerAvailable = [...new Set([...(editing.availableTags || []), ...catalog, ...editing.tags])];
  $("#tag-picker-title").textContent = editing.id + "번 " + (category === "creative" ? "참여 행사 선택" : "관찰 키워드 선택");
  $("#picker-search").value = ""; $("#picker-custom").value = "";
  renderPicker(); $("#tag-picker").showModal();
};
function renderPicker() {
  const query = $("#picker-search").value.trim();
  $("#picker-options").innerHTML = pickerAvailable.filter(tag => tag.includes(query)).map(tag =>
    '<label class="picker-option"><input type="checkbox" data-picker-tag="' + esc(tag) + '"' + (pickerSelected.has(tag) ? " checked" : "") + ">" + esc(tag) + "</label>").join("");
  $("#picker-count").textContent = pickerSelected.size + "개 선택";
}
$("#picker-search").oninput = renderPicker;
$("#picker-options").onchange = event => {
  const tag = event.target.dataset.pickerTag;
  if (tag === undefined) return;
  event.target.checked ? pickerSelected.add(tag) : pickerSelected.delete(tag);
  $("#picker-count").textContent = pickerSelected.size + "개 선택";
};
$("#picker-add").onclick = () => {
  const tags = Core.splitTags($("#picker-custom").value);
  tags.forEach(tag => { if (!pickerAvailable.includes(tag)) pickerAvailable.push(tag); pickerSelected.add(tag); });
  $("#picker-custom").value = ""; $("#picker-search").value = ""; renderPicker();
};
$("#picker-custom").onkeydown = event => { if (event.key === "Enter") { event.preventDefault(); $("#picker-add").click(); } };
$("#picker-apply").onclick = () => {
  if (!editing) return;
  editing.tags = [...pickerSelected];
  editing.availableTags = [...new Set([...(editing.availableTags || []), ...pickerSelected])];
  markInputChanged(editing);
  $("#tag-picker").close(); refreshEditor();
};
$("#auto-keywords").onclick = () => {
  records().filter(s => selected.has(s.id)).forEach(s => {
    const pool = [...Catalog.studentKeywordPool];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    s.tags = [...new Set([...s.tags, ...pool.slice(0, 2)])];
    s.availableTags = [...new Set([...(s.availableTags || []), ...s.tags])];
    markInputChanged(s);
  });
  $("#workspace-tools").close(); refreshEditor(); notify("선택 학생에게 기존 키워드 목록에서 2개씩 추가했습니다.");
};

$("#auto-events").onclick = () => {
  $("#workspace-tools").close();
  $("#distribute-scope").textContent = "선택 " + selected.size + "명에게 배정합니다. 화면 밖 선택 학생도 포함합니다.";
  $("#distribute-events").value = "";
  $("#distribute-dialog").showModal();
};
$("#distribute-random").onclick = () => {
  const entered = Core.splitTags($("#distribute-events").value);
  const pool = Catalog.CREATIVE_CATEGORIES.flatMap(group => group.events).filter(event => !entered.includes(event));
  for (let i = 0; i < 3 && pool.length; i++) entered.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  $("#distribute-events").value = entered.join(", ");
};
$("#distribute-form").onsubmit = event => {
  event.preventDefault();
  const events = Core.splitTags($("#distribute-events").value);
  if (!events.length || !selected.size) return;
  const next = Core.distribute(records().filter(s => selected.has(s.id)), events, Number($("#distribute-count").value), $("#distribute-replace").checked);
  next.forEach(s => { markInputChanged(s); });
  data.creative = data.creative.map(s => next.find(row => row.id === s.id) || s);
  $("#distribute-dialog").close(); refreshEditor(); notify(next.length + "명에게 행사를 배정했습니다. 임원 정보와 결과는 유지했습니다.");
};

function openImport() {
  importCandidate = null;
  $('[name="import-mode"][value="merge"]').checked = true;
  $("#csv-file").value = ""; $("#import-preview").textContent = ""; $("#import-error").textContent = ""; $("#import-apply").disabled = true;
  $("#import-guide").textContent = labels[category] + (category === "subject" ? " · " + subject : "") + "에 가져옵니다. 필수 열: 번호, " + (category === "subject" ? "평가1 (평가2… 추가 가능)" : category === "creative" ? "참여 행사" : "키워드") + ".";
  $("#import-dialog").showModal();
}
$("#import-open").onclick = openImport;
$("#csv-file").onchange = async event => {
  const file = event.target.files[0];
  importCandidate = null; $("#import-apply").disabled = true; $("#import-preview").textContent = ""; $("#import-error").textContent = "";
  if (!file) return;
  const scope = currentScope(), inputCategory = category;
  try {
    if (file.size > 2 * 1024 * 1024) throw Error("2MB 이하의 CSV 파일을 선택해주세요.");
    const text = await file.text();
    if ($("#csv-file").files[0] !== file || !$("#import-dialog").open || currentScope() !== scope) return;
    const candidate = Core.importCSV(text, inputCategory, data[scope], assessments[subject].length);
    importCandidate = { ...candidate, scope, category: inputCategory };
    $("#import-preview").innerHTML = '<p class="action-summary">' + esc(file.name) + " · " + candidate.rows.length + '명</p><div class="generation-targets">' +
      candidate.rows.slice(0, 5).map(s => '<div class="generation-record"><strong>' + s.id + '번</strong><span>' + esc(inputCategory === "subject" ? s.levels.join(" · ") : s.tags.join(", ")) + "</span>" +
        (inputCategory === "creative" ? '<span>임원: ' + esc(s.officerRole) + " · " + esc(s.officerPeriod || "기간 없음") + "</span>" : "") + "</div>").join("") + "</div>";
    $("#import-apply").disabled = false;
  } catch (error) {
    if ($("#csv-file").files[0] === file) $("#import-error").textContent = error.message;
  }
};
$("#import-form").onsubmit = event => {
  event.preventDefault();
  if (!importCandidate || importCandidate.scope !== currentScope()) return;
  const candidate = importCandidate;
  const mode = $('[name="import-mode"]:checked').value;
  const next = mode === "replace" ? candidate.rows : data[currentScope()].map(s => candidate.rows.find(row => row.id === s.id) || s)
    .concat(candidate.rows.filter(s => !data[currentScope()].some(old => old.id === s.id)));
  if (next.length > 40) { $("#import-error").textContent = "병합하면 40명을 초과합니다. 번호를 확인하거나 전체 교체를 선택해주세요."; return; }
  const apply = () => {
    closeEditor(false);
    if (candidate.category === "subject") {
      while (subjectMeta[subject].items.length < candidate.assessmentCount) {
        const i = subjectMeta[subject].items.length;
        subjectMeta[subject].items.push(newAssessment("평가" + (i + 1)));
      }
      assessments[subject] = subjectMeta[subject].items.map(item => item.area);
      next.forEach(s => { s.levels = Array.from({ length: assessments[subject].length }, (_, i) => s.levels[i] || ""); });
    }
    data[candidate.scope] = structuredClone(next).sort((a, b) => a.id - b.id);
    scopeCounts[candidate.scope] = next.length;
    selected.clear(); onlySelected = false; filter = "all"; $("#search").value = ""; resetUndo = null;
    $("#import-dialog").close(); render(); notify(candidate.rows.length + "명의 CSV를 미리보기에 적용했습니다.");
  };
  confirmChange("CSV 적용 확인", labels[category] + " · " + candidate.rows.length + "명. " +
    (mode === "replace" ? "현재 영역 학생 " + records().length + "명을 파일의 학생으로 교체합니다." : "번호가 같은 학생의 파일 입력을 적용하고 다른 학생은 유지합니다."), apply);
};

function switchSubject(name) {
  if (!subjectOrder.includes(name)) return;
  closeEditor(false); subject = name; selected.clear(); onlySelected = false; filter = "all"; $("#search").value = "";
  renderSubjects(); $("#table-scroller").scrollTop = 0; render();
}
function renderSubjects() {
  $(".subject-tabs").innerHTML = subjectOrder.map(name => '<button data-subject="' + esc(name) + '" class="' + (subject === name ? "active" : "") + '" aria-pressed="' + (subject === name) + '">' + esc(name) + "</button>").join("");
}
function validSubjectName(name, previous) {
  if (!name || name.length > 40) return "교과 이름을 1~40자로 입력해주세요.";
  if (["__proto__", "prototype", "constructor", "behavior", "creative"].includes(name)) return "다른 교과 이름을 입력해주세요.";
  if (name !== previous && Object.hasOwn(data, name)) return "이미 있는 교과 이름입니다.";
  return "";
}
function newAssessment(area = "") {
  return { id: crypto.randomUUID(), area, standard: "", criteria: "", competency: "", high: "", middle: "", low: "" };
}
function addSubject(name) {
  assessments[name] = ["평가 1"];
  subjectMeta[name] = { schoolLevel: "초등학교", grade: 5, items: [newAssessment("평가 1")] };
  data[name] = records().map(s => ({ ...emptyStudent(s.id), levels: [""] }));
  scopeCounts[name] = data[name].length; subjectOrder.push(name);
}
function renderSubjectManager() {
  $("#subject-manager-list").innerHTML = subjectOrder.map((name, i) => '<div class="subject-manager-row"><input class="field" data-rename-subject="' + i + '" aria-label="' + esc(name) + ' 교과 이름" value="' + esc(name) + '" maxlength="40">' +
    '<button class="button" data-subject-action="rename" data-index="' + i + '">이름 적용</button>' +
    '<button class="icon-button" data-subject-action="up" data-index="' + i + '" aria-label="' + esc(name) + ' 위로"' + (i === 0 ? " disabled" : "") + '>↑</button>' +
    '<button class="icon-button" data-subject-action="down" data-index="' + i + '" aria-label="' + esc(name) + ' 아래로"' + (i === subjectOrder.length - 1 ? " disabled" : "") + '>↓</button>' +
    '<button class="button danger-quiet" data-subject-action="delete" data-index="' + i + '" aria-label="' + esc(name) + ' 교과 삭제">삭제</button></div>').join("");
}
$("#subject-manage-open").onclick = () => { $("#subject-manager-error").textContent = ""; renderSubjectManager(); $("#subject-manager").showModal(); };
$("#subject-add-form").onsubmit = event => {
  event.preventDefault();
  const name = $("#subject-add-name").value.trim(), error = validSubjectName(name);
  $("#subject-manager-error").textContent = error;
  if (error) return;
  addSubject(name); switchSubject(name); $("#subject-add-name").value = ""; renderSubjectManager();
};
$("#subject-manager-list").onclick = event => {
  const button = event.target.closest("[data-subject-action]");
  if (!button) return;
  const i = Number(button.dataset.index), name = subjectOrder[i], action = button.dataset.subjectAction;
  if (action === "rename") {
    const next = $('[data-rename-subject="' + i + '"]').value.trim(), error = validSubjectName(next, name);
    $("#subject-manager-error").textContent = error;
    if (error || next === name) return;
    [data, assessments, scopeCounts, subjectMeta].forEach(map => { map[next] = map[name]; delete map[name]; });
    subjectOrder[i] = next; if (subject === name) subject = next;
    if (resetUndo?.scope === name) resetUndo.scope = next;
    renderSubjects(); renderSubjectManager(); refreshEditor();
  } else if (action === "up" || action === "down") {
    const j = i + (action === "up" ? -1 : 1);
    if (j < 0 || j >= subjectOrder.length) return;
    [subjectOrder[i], subjectOrder[j]] = [subjectOrder[j], subjectOrder[i]];
    renderSubjects(); renderSubjectManager();
  } else confirmChange(name + " 교과 삭제", "이 미리보기의 " + name + " 입력·결과·평가정보를 삭제합니다. 다른 교과는 유지합니다.", () => {
    closeEditor(false);
    // Keep a blank workspace when removing the final subject.
    if (subjectOrder.length === 1) addSubject(name === "새 교과" ? "새 교과 2" : "새 교과");
    subjectOrder = subjectOrder.filter(n => n !== name);
    [data, assessments, scopeCounts, subjectMeta].forEach(map => { delete map[name]; });
    resetUndo = null;
    switchSubject(subject === name ? subjectOrder[0] : subject); renderSubjectManager();
  });
};
$("#subjects-delete-all").onclick = () => confirmChange("전체 교과 삭제", "이 미리보기의 모든 교과 입력·결과를 삭제하고 빈 교과를 만듭니다. 행동특성과 창체는 유지합니다.", () => {
  closeEditor(false);
  const count = records().length;
  subjectOrder.forEach(name => [data, assessments, scopeCounts, subjectMeta].forEach(map => { delete map[name]; }));
  subject = "새 교과"; subjectOrder = [subject]; assessments[subject] = ["평가 1"];
  subjectMeta[subject] = { schoolLevel: "초등학교", grade: 5, items: [newAssessment("평가 1")] };
  data[subject] = Array.from({ length: count }, (_, i) => emptyStudent(i + 1));
  scopeCounts[subject] = count; resetUndo = null; switchSubject(subject); renderSubjectManager();
});

function openAssessmentSettings() {
  assessmentDraft = structuredClone(subjectMeta[subject]);
  $("#school-level").value = assessmentDraft.schoolLevel; $("#school-grade").value = assessmentDraft.grade;
  renderAssessmentFields(); $("#assessment-settings").showModal();
}
function renderAssessmentFields() {
  const fields = { area: "평가 영역", standard: "성취기준", criteria: "평가기준", competency: "교과 역량", high: "상", middle: "중", low: "하" };
  $("#assessment-fields").innerHTML = assessmentDraft.items.map((item, i) => '<fieldset class="assessment-card"><legend>평가 ' + (i + 1) + '</legend><button class="text-button danger-quiet" type="button" data-remove-assessment="' + item.id + '">이 항목 삭제</button>' +
    Object.entries(fields).map(([key, label]) => '<label>' + label + '<input class="field" data-assessment-id="' + item.id + '" data-assessment-field="' + key + '" value="' + esc(item[key]) + '"' + (key === "area" ? " required" : "") + "></label>").join("") + "</fieldset>").join("");
}
$("#assessment-fields").oninput = event => {
  const item = assessmentDraft.items.find(row => row.id === event.target.dataset.assessmentId);
  if (item) item[event.target.dataset.assessmentField] = event.target.value;
};
$("#assessment-fields").onclick = event => {
  const button = event.target.closest("[data-remove-assessment]");
  if (!button) return;
  assessmentDraft.items = assessmentDraft.items.filter(item => item.id !== button.dataset.removeAssessment);
  renderAssessmentFields();
};
$("#assessment-add").onclick = () => {
  assessmentDraft.items.push(newAssessment("평가 " + (assessmentDraft.items.length + 1))); renderAssessmentFields();
};
$("#assessment-clear").onclick = () => confirmChange("평가정보 초기화", "이 교과의 평가정보와 학생별 평가 입력을 비우도록 준비합니다. 아래 ‘평가정보 적용’을 눌러야 반영됩니다. 개별 메모와 결과는 유지합니다.", () => { assessmentDraft.items = []; renderAssessmentFields(); });
$("#assessment-form").onsubmit = event => {
  event.preventDefault();
  const before = subjectMeta[subject].items;
  const apply = () => {
    assessmentDraft.schoolLevel = $("#school-level").value; assessmentDraft.grade = Number($("#school-grade").value);
    data[subject].forEach(s => {
      s.levels = assessmentDraft.items.map(item => { const old = before.findIndex(row => row.id === item.id); return old < 0 ? "" : s.levels[old] || ""; });
      markInputChanged(s);
    });
    subjectMeta[subject] = structuredClone(assessmentDraft); assessments[subject] = assessmentDraft.items.map(item => item.area);
    $("#assessment-settings").close(); refreshEditor(); notify("평가정보를 반영했습니다. 기존 메모와 결과는 유지했습니다.");
  };
  const removed = before.filter(item => !assessmentDraft.items.some(row => row.id === item.id)).length;
  if (removed) confirmChange("평가 항목 삭제 확인", removed + "개 평가 항목과 해당 학생 평가를 제거합니다. 남은 평가·메모·결과는 유지합니다.", apply);
  else apply();
};

// Share a specific preview screen without storing or changing production data.
const previewParams = new URLSearchParams(location.search);
const previewArea = previewParams.get("area");
if (Object.hasOwn(labels, previewArea)) $('.navline [data-category="' + previewArea + '"]').click();
const previewStudent = Number(previewParams.get("student"));
if (Number.isSafeInteger(previewStudent) && records().some(s => s.id === previewStudent)) openEditor(previewStudent);
