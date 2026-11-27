/* Shared by the extension popup and its import regression tests. */
globalThis.ForTeacherImport = (() => {
  const categories = {
    behavior: { label: "행특", headers: ["행특", "행동특성", "행동특성 및 종합의견"], example: "친구의 의견을 경청하고 맡은 일을 성실히 수행함." },
    subject: { label: "학기말종합", headers: ["학기말종합", "학기말종합의견", "학기말 종합의견", "세특", "교과세특"], example: "글의 중심 내용을 파악하고 자신의 생각을 근거와 함께 표현함." },
    creative: { label: "창체(자율)", headers: ["창체", "창체(자율)", "자율활동", "자율자치활동", "특기사항"], example: "학급 자치 활동에서 역할을 맡아 친구들과 협력하며 참여함." }
  };
  const MAX_ROWS = 2000;
  const normalize = (value) => String(value ?? "").replace(/^\uFEFF/, "").replace(/\s+/g, "").toLowerCase();
  const genericTextHeaders = ["내용", "AI생성결과", "작성 결과", "결과", "text"];

  function findColumn(headers, aliases, label, required = false) {
    const matches = headers.flatMap((header, index) => aliases.map(normalize).includes(header) ? [index] : []);
    if (matches.length > 1) throw new Error(`${label} 열이 여러 개입니다. 사용할 열 하나만 남겨 주세요.`);
    if (!matches.length && required) throw new Error(`${label} 열을 찾지 못했습니다. 예시 CSV의 열 이름을 유지해 주세요.`);
    return matches[0] ?? -1;
  }

  function rowsToRecords(rows, category) {
    const config = categories[category];
    if (!config) throw new Error("먼저 붙여넣을 영역을 선택하세요.");
    if (!rows.length) throw new Error("파일에 데이터가 없습니다.");
    if (rows.length > MAX_ROWS + 1) throw new Error(`한 번에 ${MAX_ROWS}명까지 불러올 수 있습니다.`);
    const headers = rows[0].map(normalize);
    const idIndex = findColumn(headers, ["번호", "no", "number", "id"], "번호", true);
    const nameIndex = findColumn(headers, ["이름", "성명", "name"], "이름");
    for (const [key, value] of Object.entries(categories)) {
      if (key !== category && headers.some((header) => value.headers.map(normalize).includes(header))) {
        throw new Error(`${value.label} 내용 열이 있습니다. 해당 영역을 선택하거나 파일을 영역별로 나눠 주세요.`);
      }
    }
    const textIndex = findColumn(headers, [...genericTextHeaders, ...config.headers], "내용", true);
    const seen = new Set();
    const records = [];
    const errors = [];
    rows.slice(1).forEach((source, index) => {
      const row = source.map((cell) => String(cell ?? ""));
      if (!row.some((cell) => cell.trim())) return;
      const rowNumber = index + 2;
      const rawId = (row[idIndex] || "").trim();
      const text = row[textIndex] || "";
      const id = String(Number(rawId));
      if (row.length > headers.length && row.slice(headers.length).some((cell) => cell.trim())) {
        errors.push(`${rowNumber}행: 열 개수가 맞지 않습니다. 쉼표가 포함된 내용은 따옴표로 감싸 주세요.`);
      } else if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1) {
        errors.push(`${rowNumber}행: 번호는 1 이상의 정수여야 합니다.`);
      } else if (seen.has(id)) {
        errors.push(`${rowNumber}행: ${id}번이 중복되었습니다.`);
      } else if (!text.trim()) {
        errors.push(`${rowNumber}행: ${id}번의 내용이 비어 있습니다. 입력하지 않을 학생은 행 전체를 삭제하세요.`);
      } else {
        records.push({ id, name: nameIndex >= 0 ? (row[nameIndex] || "").trim() : "", text, category });
      }
      seen.add(id);
    });
    if (errors.length) throw new Error(errors.slice(0, 3).join("\n") + (errors.length > 3 ? `\n외 ${errors.length - 3}건을 수정해 주세요.` : ""));
    if (!records.length) throw new Error("붙여넣을 내용이 없습니다. 예시 양식의 두 번째 행부터 작성하세요.");
    return records.sort((a, b) => Number(a.id) - Number(b.id));
  }

  // RFC-style quoted fields, including embedded commas, quotes and newlines.
  // Tabs are accepted for spreadsheet clipboard data.
  function parseCSV(input) {
    const text = input.replace(/^\uFEFF/, "");
    const firstLine = text.split(/\r?\n/, 1)[0];
    const delimiter = firstLine.includes("\t") ? "\t" : ",";
    const rows = [];
    let row = [], cell = "", state = "start";
    const pushCell = () => { row.push(cell); cell = ""; state = "start"; };
    const pushRow = () => {
      pushCell(); rows.push(row); row = [];
      if (rows.length > MAX_ROWS + 1) throw new Error(`한 번에 ${MAX_ROWS}명까지 불러올 수 있습니다.`);
    };
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (state === "quoted") {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') state = "closed";
        else cell += char;
      } else if (char === delimiter) pushCell();
      else if (char === "\r" || char === "\n") {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        pushRow();
      } else if (char === '"' && state === "start") state = "quoted";
      else if (state === "closed" || char === '"') throw new Error("CSV 따옴표 형식이 잘못되었습니다. 예시 양식에 작성한 뒤 CSV로 다시 저장하세요.");
      else { cell += char; state = "unquoted"; }
    }
    if (state === "quoted") throw new Error("CSV의 닫는 따옴표가 없습니다. 파일을 확인해 주세요.");
    if (cell || row.length || state !== "start") pushRow();
    return rows;
  }

  function parseText(text, category) {
    return rowsToRecords(parseCSV(text), category);
  }

  async function parseFile(file, category, xlsx = globalThis.XLSX) {
    if (file.size > 5 * 1024 * 1024) throw new Error("5MB 이하의 파일을 사용하세요.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (/\.csv$/i.test(file.name)) {
      let text;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { text = new TextDecoder("euc-kr", { fatal: true }).decode(bytes); }
      return { records: parseText(text, category), sheetName: "" };
    }
    if (!/\.xlsx$/i.test(file.name)) throw new Error("CSV 또는 XLSX 파일만 업로드할 수 있습니다.");
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new Error("올바른 XLSX 파일이 아닙니다. 엑셀에서 XLSX 형식으로 다시 저장하세요.");
    let workbook;
    try { workbook = xlsx.read(bytes, { type: "array", sheetRows: MAX_ROWS + 2 }); }
    catch { throw new Error("엑셀 파일을 읽지 못했습니다. 암호를 해제하고 XLSX 형식으로 다시 저장하세요."); }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("엑셀 파일에 첫 번째 시트가 없습니다.");
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: true });
    return { records: rowsToRecords(rows, category), sheetName };
  }

  function template(category) {
    const config = categories[category];
    if (!config) throw new Error("영역을 선택하세요.");
    const rows = [["번호", "이름", config.headers[0]], ["1", "김예시", config.example]];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n") + "\r\n";
    return { filename: `ForTeacherAI_${config.label}_붙여넣기_예시.csv`, csv };
  }

  return { categories, parseCSV, parseText, rowsToRecords, parseFile, template };
})();
