import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkspaceCsv, importWorkspaceCsv, exportWorkspaceCsv } from '../lib/workspace-csv.ts';
const config = { schoolLevel:'elementary',grade:'5',subjectName:'국어',assessments:[{id:'a',area:'읽기',standard:'기존 성취기준',criteria:'기존 평가기준',criteriaLevels:{상:'상 기준'},competency:'소통'},{id:'b',area:'쓰기',standard:'쓰기 성취기준',criteria:'쓰기 평가기준',competency:''}] };
const student = id => ({id,name:`${id}번 학생`,selectedKeywords:['성실함','협동심'],customKeywords:['직접 "인용"'],participatedEvents:['협력 "토론"'],officerRole:'전교부회장',officerPeriod:'2026.03.~2027.02.',aiResult:'첫째 "인용", 문장\n둘째 문장 #테스트',isGenerating:false,isEditable:true,selected:false,subjectData:{assessments:[{assessmentId:'a',level:'상'},{assessmentId:'b',level:'중'}],individualNote:'메모, "인용"\n다음 줄'},polishHistory:[{batchId:'p',before:'원문',after:'수정',createdAt:'2026-11-05'}]});
test('quoted commas, quotes, BOM, CRLF and embedded newlines survive all exports',()=>{
 for(const category of ['behavior','subject','creative']) {
  const original=[student(1),student(2)], csv=exportWorkspaceCsv(category,original,config);
  const result=importWorkspaceCsv(csv,category,original,config);
  assert.deepEqual(result.students,original);
  assert.deepEqual(result.globalConfig,config);
 }
});
test('partial CSV update preserves absent students, subject criteria, assessment IDs and original polish history',()=>{
 const original=[student(1),student(2)];
 const result=importWorkspaceCsv('번호,평가1\n1,하','subject',original,config);
 assert.equal(result.students[0].subjectData.assessments.find(a=>a.assessmentId==='a').level,'하');
 assert.equal(result.students[0].subjectData.assessments.find(a=>a.assessmentId==='b').level,'중');
 assert.deepEqual(result.students[1],original[1]);assert.deepEqual(result.globalConfig,config);
 assert.deepEqual(result.students[0].polishHistory,original[0].polishHistory);
 assert.equal(result.students[0].subjectData.individualNote,original[0].subjectData.individualNote);
 assert.equal(original[0].subjectData.assessments[0].level,'상');
});
test('creative imports preserve officer fields when columns are missing',()=>{
 const s=student(1),r=importWorkspaceCsv('번호,참여 행사\n1,진로체험','creative',[s],config);
 assert.equal(r.students[0].officerRole,s.officerRole);assert.equal(r.students[0].officerPeriod,s.officerPeriod);
 assert.equal(r.students[0].aiResult,s.aiResult);assert.deepEqual(r.students[0].participatedEvents,['진로체험']);
});
test('saved-log CSV headings and blank results are supported',()=>{
 const r=importWorkspaceCsv('번호,관찰 키워드,작성 결과\n1,"성실함, 배려심",','behavior',[student(1)],config);
 assert.deepEqual(r.students[0].selectedKeywords,['성실함','배려심']);assert.equal(r.students[0].aiResult,'');
 const subject=importWorkspaceCsv('번호,평가 수준,개별 특이사항,작성 결과\n1,"읽기: 하, 쓰기: 상",메모,결과','subject',[student(1)],config);
 assert.equal(subject.students[0].subjectData.assessments.find(a=>a.assessmentId==='b').level,'상');
});
test('bad IDs, duplicates, columns, quotes, levels, and wrong categories cannot partially mutate original input',()=>{
 const original=[student(1)];const before=structuredClone(original);
 for(const csv of ['번호,평가1\n0,상','번호,평가1\n41,상','번호,평가1\n1,상\n1,중','번호,평가1\n1,상,하','번호,평가1\n1,불명','번호,평가1\n1,"상','번호,참여 행사\n1,행사']) assert.throws(()=>importWorkspaceCsv(csv,'subject',original,config));
 assert.deepEqual(original,before);
});
test('sparse new rows retain numbered student slots; new evaluations append without resetting existing criteria',()=>{
 const r=importWorkspaceCsv('번호,평가3\n4,중','subject',[student(1)],config);
 assert.equal(r.students.length,4);assert.equal(r.students[3].id,4);
 assert.deepEqual(r.globalConfig.assessments.slice(0,2),config.assessments);assert.equal(r.globalConfig.assessments.length,3);
});
test('empty or unknown evaluation labels are rejected before application',()=>{
 assert.throws(()=>importWorkspaceCsv('번호,평가 수준\n1,없는영역: 상','subject',[student(1)],config));
 assert.throws(()=>importWorkspaceCsv('번호,평가1','subject',[student(1)],config));
 assert.deepEqual(parseWorkspaceCsv('번호,키워드\r\n1,성실함\r\n'),[['번호','키워드'],['1','성실함']]);
});

test('a subject CSV exported without assessment columns still imports notes and results',()=>{
 const original=[student(1)],emptyConfig={...config,assessments:[]};
 const csv=exportWorkspaceCsv('subject',original,emptyConfig);
 const result=importWorkspaceCsv(csv,'subject',original,emptyConfig);
 assert.deepEqual(result.students,original);assert.deepEqual(result.globalConfig,emptyConfig);
});
