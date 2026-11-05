// Live, read-only file extraction check. Requires a running app configured for AI calls.
// Only synthetic fixtures are uploaded; no student records are created or changed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const origin = new URL(process.argv[2] || 'http://127.0.0.1:3140');
assert.ok(['127.0.0.1', 'localhost', 'for-teacher-ai.vercel.app'].includes(origin.hostname), 'Use the local app or this project’s production host.');
const fixtureText = readFileSync(new URL('../tests/fixtures/subject-plan-parity.txt', import.meta.url), 'utf8');
const compact = value => String(value || '').replace(/\s+/g, '');
const expected = [...fixtureText.matchAll(/^성취기준:\s*(.+)\n평가기준 상:\s*(.+)\n평가기준 중:\s*(.+)\n평가기준 하:\s*(.+)/gm)];
assert.equal(expected.length, 3);
for (const extension of ['pdf', 'hwpx']) {
    const filename = `subject-plan-parity.${extension}`;
    const form = new FormData();
    form.append('file', new File([readFileSync(new URL(`../tests/fixtures/${filename}`, import.meta.url))], filename));
    form.append('schoolLevel', 'elementary'); form.append('grade', '5');
    const response = await fetch(new URL('/api/subject-plan/parse', origin), { method: 'POST', body: form,
        headers: process.env.FTAI_QA_TOKEN ? { Authorization: `Bearer ${process.env.FTAI_QA_TOKEN}` } : {}, signal: AbortSignal.timeout(120000) });
    assert.equal(response.status, 200, `${filename}: HTTP ${response.status}`);
    const body = await response.json();
    assert.deepEqual(body.subjects.map(s => s.subjectName).sort(), ['국어', '수학']);
    assert.ok(body.subjects.every(s => s.schoolLevel === 'elementary' && s.grade === '5'));
    const assessments = body.subjects.flatMap(s => s.assessments);
    assert.equal(assessments.length, 3);
    for (const [, standard, high, middle, low] of expected) {
        const assessment = assessments.find(a => compact(a.standard) === compact(standard));
        assert.ok(assessment, `${filename}: missing original standard ${standard}`);
        for (const [level, value] of [['상', high], ['중', middle], ['하', low]]) assert.equal(compact(assessment.criteriaLevels?.[level]), compact(value), `${filename}: ${level} rubric changed`);
    }
    console.log(JSON.stringify({ file: filename, subjects: body.subjects.map(s => ({ name: s.subjectName, count: s.assessments.length })), originalStandardsAndRubrics: true }));
}
