/* Pure preview helpers: no network, storage, or generation side effects. */
(function (root) {
  "use strict";
  const splitTags = value => [...new Set(String(value).trim().replace(/^[\[{]|[\]}]$/g, "").split(/[|,，\n]/).map(x => x.trim()).filter(Boolean))];
  const inputReason = (student, category) => category === "behavior"
    ? student.tags.length >= 2 ? "" : "키워드 2개 이상 필요"
    : category === "creative" ? student.tags.length ? "" : "참여 행사 필요"
      : student.levels.some(value => ["상", "중", "하"].includes(value)) ? "" : "평가 입력 필요";
  function generationTargets(students, category, scope, selection, studentId) {
    const requested = students.filter(s => scope === "all" || (scope === "single" ? s.id === studentId : selection.has(s.id)));
    return {
      requested,
      eligible: requested.filter(s => !inputReason(s, category)),
      skipped: requested.filter(s => inputReason(s, category)).map(s => ({ id: s.id, reason: inputReason(s, category) }))
    };
  }
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", quoted = false, afterQuote = false;
    text = String(text).replace(/^\uFEFF/, "");
    const endCell = () => { row.push(cell); cell = ""; afterQuote = false; };
    const endRow = () => { endCell(); if (row.some(value => value.trim())) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else { quoted = false; afterQuote = true; }
        } else cell += char;
      } else if (char === ",") endCell();
      else if (char === "\n" || char === "\r") { if (char === "\r" && text[i + 1] === "\n") i++; endRow(); }
      else if (char === '"' && !cell && !afterQuote) quoted = true;
      else if (afterQuote && /\s/.test(char)) continue;
      else if (afterQuote || char === '"') throw Error("CSV 따옴표 형식이 올바르지 않습니다.");
      else cell += char;
    }
    if (quoted) throw Error("CSV의 닫는 따옴표가 없습니다.");
    if (cell || row.length || afterQuote) endRow();
    return rows;
  }
  function encodeCSV(rows) {
    return "\uFEFF" + rows.map(row => row.map(value => {
      let text = String(value ?? "");
      if (/^[=+@\-\t\r\n]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(",")).join("\r\n");
  }
  function importCSV(text, category, existing, currentAssessmentCount) {
    const table = parseCSV(text);
    if (table.length < 2) throw Error("열 이름과 학생 데이터가 있는 CSV를 선택해주세요.");
    const headers = table[0].map(value => value.replace(/\s+/g, ""));
    if (new Set(headers).size !== headers.length) throw Error("중복된 CSV 열 이름이 있습니다.");
    const index = names => headers.findIndex(value => names.includes(value));
    const no = index(["번호"]), result = index(["AI생성결과", "AI생성", "AI결과", "작성결과"]);
    const tags = index(category === "creative" ? ["참여행사"] : ["키워드"]);
    const note = index(["개별특이사항", "특이사항", "관찰메모"]);
    const role = index(["임원여부", "임원직책"]), period = index(["임원기간"]);
    const status = index(["검토상태", "상태"]);
    const assessmentCols = headers.map((name, i) => ({ name, i })).filter(c => /^평가\d+$/.test(c.name));
    if (no < 0 || (category === "subject" ? !assessmentCols.length : tags < 0)) throw Error(category === "subject"
      ? "번호와 평가1, 평가2 등 평가 열이 필요합니다."
      : "번호와 " + (category === "creative" ? "참여 행사" : "키워드") + " 열이 필요합니다.");
    if (table.length > 41) throw Error("한 번에 최대 40명의 CSV를 가져올 수 있습니다.");
    if (category === "subject" && assessmentCols.some((c, i) => c.name !== "평가" + (i + 1))) throw Error("평가 열은 평가1부터 순서대로 지정해주세요.");
    const assessmentCount = category === "subject" ? Math.max(currentAssessmentCount, assessmentCols.length) : currentAssessmentCount;
    const seen = new Set();
    const rows = table.slice(1).map((cols, line) => {
      if (cols.length !== headers.length) throw Error((line + 2) + "행의 열 개수가 맞지 않습니다.");
      const id = Number(cols[no]);
      if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) throw Error("학생 번호는 중복 없는 양의 정수여야 합니다.");
      seen.add(id);
      const previous = existing.find(s => s.id === id);
      const student = structuredClone(previous || { id, tags: [], availableTags: [], levels: Array(assessmentCount).fill(""), note: "", result: "", status: "empty", officerRole: "임원아님", officerPeriod: "" });
      if (tags >= 0) {
        student.tags = splitTags(cols[tags]);
        student.availableTags = [...new Set([...(student.availableTags || []), ...student.tags])];
      }
      if (result >= 0) student.result = cols[result];
      if (note >= 0) student.note = cols[note];
      if (category === "creative") {
        if (role >= 0) student.officerRole = cols[role].trim() || "임원아님";
        if (period >= 0) student.officerPeriod = cols[period];
      }
      if (category === "subject") {
        student.levels = Array.from({ length: assessmentCount }, (_, i) => student.levels[i] || "");
        assessmentCols.forEach((col, i) => {
          const level = cols[col.i].trim();
          if (!["", "상", "중", "하"].includes(level)) throw Error(id + "번 " + col.name + ": 상·중·하 또는 빈 값만 입력할 수 있습니다.");
          student.levels[i] = level;
        });
      }
      student.status = student.result.trim() ? "review" : "empty";
      if (status >= 0 && student.result.trim() && ["done", "검토 완료"].includes(cols[status])) student.status = "done";
      return student;
    });
    return { rows, assessmentCount };
  }
  function exportRows(students, category, assessmentCount) {
    const meta = ["관찰메모", "검토상태"];
    const status = s => ({ done: "검토 완료", review: "검토 필요", empty: "작성 전" })[s.status];
    if (category === "creative") return [
      ["번호", "참여 행사", "임원여부", "임원기간", "AI생성결과", ...meta],
      ...students.map(s => [s.id, s.tags.join("|"), s.officerRole || "임원아님", s.officerPeriod || "", s.result, s.note, status(s)])
    ];
    if (category === "behavior") return [
      ["번호", "키워드", "AI생성결과", ...meta],
      ...students.map(s => [s.id, s.tags.join("|"), s.result, s.note, status(s)])
    ];
    return [
      ["번호", ...Array.from({ length: assessmentCount }, (_, i) => "평가" + (i + 1)), "개별특이사항", "AI생성결과", "검토상태"],
      ...students.map(s => [s.id, ...Array.from({ length: assessmentCount }, (_, i) => s.levels[i] || ""), s.note, s.result, status(s)])
    ];
  }
  // Same balancing rules as AutoDistributeEvents in CreativeActivityWorkspace.tsx.
  function distribute(students, events, count, replace) {
    events = [...new Set(events)];
    const usage = new Map(events.map(event => [event, 0]));
    if (!replace) students.forEach(s => s.tags.forEach(event => { if (usage.has(event)) usage.set(event, usage.get(event) + 1); }));
    let previous = [];
    return [...students].sort((a, b) => a.id - b.id).map((student, studentIndex) => {
      const assigned = [], target = Math.min(events.length, count);
      while (assigned.length < target) {
        const cursor = (studentIndex * target + assigned.length) % events.length;
        const distance = event => { const d = Math.abs(events.indexOf(event) - cursor); return Math.min(d, events.length - d); };
        const next = events.filter(e => !assigned.includes(e)).sort((a, b) => usage.get(a) - usage.get(b)
          || Number(previous.includes(a)) - Number(previous.includes(b)) || distance(a) - distance(b) || a.localeCompare(b, "ko"))[0];
        assigned.push(next); usage.set(next, usage.get(next) + 1);
      }
      previous = assigned;
      return { ...student, tags: replace ? assigned : [...new Set([...student.tags, ...assigned])] };
    });
  }
  const api = { splitTags, inputReason, generationTargets, parseCSV, encodeCSV, importCSV, exportRows, distribute };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PreviewCore = api;
})(globalThis);
