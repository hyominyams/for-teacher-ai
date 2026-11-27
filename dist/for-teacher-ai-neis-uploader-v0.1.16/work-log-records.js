globalThis.ForTeacherWorkLogs = {
  toRecords(category, data, scopeLabel = "") {
    return (data.students || [])
      .map((student, index) => ({
        id: student.id || String(index + 1),
        name: student.name || "",
        category,
        scopeLabel,
        text: student.aiResult || ""
      }))
      .filter(record => typeof record.text === "string" && record.text.trim())
      .sort((a, b) => {
        const aNumber = Number(a.id), bNumber = Number(b.id);
        return Number.isFinite(aNumber) && Number.isFinite(bNumber)
          ? aNumber - bNumber
          : String(a.id || "").localeCompare(String(b.id || ""), "ko");
      });
  }
};
