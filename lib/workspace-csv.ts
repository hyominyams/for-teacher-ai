import type { Student, SubjectGlobalConfig, SubjectAssessmentInfo } from '../types/index.ts';

type Category = 'behavior' | 'subject' | 'creative';
export function parseWorkspaceCsv(text: string): string[][] {
    const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
            else quoted = !quoted;
        } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
        else if ((c === '\n' || c === '\r') && !quoted) {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = '';
        } else cell += c;
    }
    if (quoted) throw new Error('CSV의 따옴표가 닫히지 않았습니다. 파일을 확인해주세요.');
    row.push(cell); if (row.some(value => value.trim())) rows.push(row);
    return rows;
}
const normalize = (text: string) => text.replace(/\s/g, '').toLowerCase();
const tags = (text: string) => [...new Set(text.split(',').map(s => s.trim()).filter(Boolean))];
export function importWorkspaceCsv(text: string, category: Category, current: Student[], config: SubjectGlobalConfig, baseKeywords: string[] = []) {
    const [headers, ...rows] = parseWorkspaceCsv(text);
    if (!headers || !rows.length) throw new Error('CSV에 학생 데이터가 없습니다.');
    const find = (...aliases: string[]) => headers.findIndex(h => aliases.map(normalize).includes(normalize(h)));
    const idIndex = find('번호'), resultIndex = find('작성 결과', 'AI생성결과', 'AI생성', 'AI결과');
    const keywordIndex = find('키워드', '관찰 키워드'), eventIndex = find('참여 행사');
    const roleIndex = find('임원여부', '임원', '임원직책'), periodIndex = find('임원기간', '임기');
    const noteIndex = find('개별특이사항'), levelsIndex = find('평가수준');
    const levelColumns = headers.flatMap((h, index) => /^평가\d+$/.test(normalize(h)) ? [{ index, ordinal: Number(normalize(h).slice(2)) - 1 }] : []);
    if (idIndex < 0 || (category === 'behavior' && keywordIndex < 0) || (category === 'creative' && eventIndex < 0) || (category === 'subject' && !levelColumns.length && levelsIndex < 0 && noteIndex < 0)) throw new Error('현재 영역의 CSV 양식을 확인해주세요. 번호와 키워드 / 참여 행사 / 평가 열이 필요합니다.');
    const ids = new Set<number>();
    for (const row of rows) {
        const id = Number(row[idIndex]);
        if (!Number.isInteger(id) || id < 1 || id > 40 || ids.has(id)) throw new Error('학생 번호는 중복 없이 1~40 사이여야 합니다.');
        if (row.length !== headers.length) throw new Error(`${id}번 학생의 CSV 열 개수가 맞지 않습니다.`);
        ids.add(id);
    }
    const assessments: SubjectAssessmentInfo[] = structuredClone(config.assessments);
    if (levelColumns.some(c => c.ordinal < 0 || c.ordinal > 29)) throw new Error('평가 번호는 1~30 사이여야 합니다.');
    const maxOrdinal = Math.max(-1, ...levelColumns.map(c => c.ordinal));
    while (assessments.length <= maxOrdinal) assessments.push({ id: crypto.randomUUID(), area: `평가${assessments.length + 1}`, standard: '', criteria: '', criteriaLevels: {}, competency: '' });
    const maxId = Math.max(current.length, ...ids);
    const students: Student[] = Array.from({ length: maxId }, (_, i) => structuredClone(current.find(s => s.id === i + 1) || { id: i + 1, name: `${i + 1}번 학생`, selectedKeywords: [], customKeywords: [], aiResult: '', isGenerating: false, isEditable: false, selected: false }));
    const validLevel = (value: string) => { if (!['', '상', '중', '하'].includes(value)) throw new Error('학생 평가 수준은 상·중·하 또는 빈칸만 가능합니다.'); return value as '상' | '중' | '하' | ''; };
    for (const row of rows) {
        const student = students[Number(row[idIndex]) - 1];
        student.selected = false; student.isGenerating = false;
        if (resultIndex >= 0) { student.aiResult = row[resultIndex]; student.isEditable = Boolean(student.aiResult); }
        if (category === 'behavior') {
            const previous = student.selectedKeywords;
            student.selectedKeywords = tags(row[keywordIndex]);
            student.customKeywords = [...new Set([...student.customKeywords, ...student.selectedKeywords.filter(tag => !previous.includes(tag) && !baseKeywords.includes(tag))])];
        } else if (category === 'creative') {
            student.participatedEvents = tags(row[eventIndex]);
            if (roleIndex >= 0) student.officerRole = row[roleIndex] || '임원아님';
            if (periodIndex >= 0) student.officerPeriod = row[periodIndex];
        } else {
            const data = student.subjectData || { assessments: [], individualNote: '' };
            if (noteIndex >= 0) data.individualNote = row[noteIndex];
            for (const column of levelColumns) {
                const assessmentId = assessments[column.ordinal].id, level = validLevel(row[column.index].trim());
                data.assessments = [...data.assessments.filter(a => a.assessmentId !== assessmentId), { assessmentId, level }];
            }
            if (levelsIndex >= 0) for (const item of row[levelsIndex].split(',').filter(s => s.trim())) {
                const match = item.trim().match(/^(.+):\s*(상|중|하)?$/);
                if (!match) throw new Error('평가 수준 열의 형식을 확인해주세요. 예: 듣기: 상, 쓰기: 중');
                const candidates = assessments.filter(a => a.area === match[1].trim() || a.id === match[1].trim());
                if (candidates.length !== 1) throw new Error(`평가 영역 '${match[1]}'을 현재 교과에서 하나로 확인할 수 없습니다. 교과별 CSV 내보내기 양식을 사용해주세요.`);
                data.assessments = [...data.assessments.filter(a => a.assessmentId !== candidates[0].id), { assessmentId: candidates[0].id, level: validLevel(match[2] || '') }];
            }
            student.subjectData = data;
        }
    }
    return { students, globalConfig: { ...config, assessments }, importedCount: rows.length };
}
export function exportWorkspaceCsv(category: Category, students: Student[], config?: SubjectGlobalConfig) {
    const headers = category === 'behavior' ? ['번호', '키워드', 'AI생성결과'] : category === 'creative' ? ['번호', '참여 행사', '임원여부', '임원기간', 'AI생성결과'] : ['번호', ...(config?.assessments || []).map((_, i) => `평가${i + 1}`), '개별특이사항', 'AI생성결과'];
    const rows = students.map(s => category === 'behavior' ? [s.id, s.selectedKeywords.join(', '), s.aiResult] : category === 'creative' ? [s.id, (s.participatedEvents || []).join(', '), s.officerRole || '', s.officerPeriod || '', s.aiResult] : [s.id, ...(config?.assessments || []).map(a => s.subjectData?.assessments.find(sa => sa.assessmentId === a.id)?.level || ''), s.subjectData?.individualNote || '', s.aiResult]);
    return '\uFEFF' + [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
export function downloadWorkspaceCsv(category: Category, students: Student[], config?: SubjectGlobalConfig) {
    const url = URL.createObjectURL(new Blob([exportWorkspaceCsv(category, students, config)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${category}_기록_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
}
