import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGrade,normalizeSchoolLevel} from '../lib/subject-plan-values.ts';
test('document school labels normalize to actual select values',()=>{
 for(const value of ['초등학교','초등','elementary','elementary school','primary'])assert.equal(normalizeSchoolLevel(value),'elementary');
 for(const value of ['중학교','중등','middle'])assert.equal(normalizeSchoolLevel(value),'middle');
 for(const value of ['고등학교','high school','high'])assert.equal(normalizeSchoolLevel(value),'high');
 assert.equal(normalizeSchoolLevel('', 'middle'),'middle');assert.equal(normalizeSchoolLevel('미상','고등학교'),'high');
});
test('grade labels are restored as valid values without guessing invalid secondary grades',()=>{
 assert.equal(normalizeGrade('5학년','elementary'),'5');assert.equal(normalizeGrade('2026학년도 3학년','middle'),'3');
 assert.equal(normalizeGrade('05','elementary'),'5');assert.equal(normalizeGrade('6','high','2'),'2');assert.equal(normalizeGrade('알수없음','middle','9'),'1');
});
