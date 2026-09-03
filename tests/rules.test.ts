import test from 'node:test';
import assert from 'node:assert/strict';
import type { Student, GameLog } from '../src/types';
import { hasUsedTreatment, isValidRoundTime, resolveTouch, resolveCure, resolveRoundEnd } from '../src/game/rules';
import { createWorkbookSheets } from '../src/export/excel';

const student = (id: string, patch: Partial<Student> = {}): Student => ({ id, name: id, points: 0, isZombie: false, isOriginalZombie: false, infectedThisRound: false, touchedThisRound: false, ...patch });

test('safe contact awards one point to each participant without mutating input', () => {
  const input = [student('a', {points: 4}), student('b', {points: 1})];
  input.forEach(Object.freeze); Object.freeze(input);
  const result = resolveTouch(input, ['a','b'], [], 1);
  assert.ok(!('error' in result));
  assert.deepEqual(result.students.map(s => s.points), [5,2]);
  assert.equal(result.log.cumulativePoints,5);
  assert.equal(result.log.cumulativePoints2,2);
  assert.equal(result.log.beforeStatus1,'비감염자');
  assert.equal(result.log.status1,'비감염자');
});
test('infection keeps existing scores and logs before/after status for both students', () => {
  const result = resolveTouch([student('a',{points:4}), student('z',{isZombie:true,isOriginalZombie:true,points:2})], ['a','z'], [], 2);
  assert.ok(!('error' in result));
  assert.equal(result.log.cumulativePoints,4);
  assert.equal(result.log.cumulativePoints2,2);
  assert.equal(result.log.beforeStatus1,'비감염자');
  assert.equal(result.log.status1,'감염자');
  assert.equal(result.log.status2,'감염자');
  assert.equal(result.log.isOriginalZombie2,true);
  assert.equal(result.students[0].infectedThisRound,true);
});
test('reverse duplicate contact is rejected across rounds', () => {
  assert.ok('error' in resolveTouch([student('a'), student('b')], ['b','a'], ['a-b'], 3));
});
test('invalid pairs cannot change the game', () => {
  for(const ids of [[], ['a'], ['a','a'], ['a','missing']]) assert.ok('error' in resolveTouch([student('a')], ids, [], 1));
});
test('treatment preserves original and previous-round infected status in logs', () => {
  for (const patch of [{isZombie:true,isOriginalZombie:true}, {isZombie:true}]) {
    const result = resolveCure([student('a',{...patch,points:6})],'a',2)!;
    assert.equal(result.students[0].isZombie,true);
    assert.equal(result.log.status1,'감염자');
    assert.equal(result.log.cumulativePoints,6);
  }
});
test('repeated treatment after reinfection remains allowed', () => {
  let result = resolveCure([student('a',{isZombie:true,infectedThisRound:true,points:3})],'a',1)!;
  assert.equal(result.students[0].isZombie,false);
  result = resolveCure([{...result.students[0],isZombie:true,infectedThisRound:true}],'a',1)!;
  assert.equal(result.students[0].isZombie,false);
  assert.equal(result.log.cumulativePoints,3);
  assert.equal(result.log.status1,'비감염자');
});
test('treatment history identifies repeat use for the same student', () => {
  const logs: GameLog[] = [
    { id: 'cure-a', timestamp: '2026-09-03T00:00:00Z', round: 1, type: 'CURE', message: 'a 치료제 사용', student1Id: 'a', vaccineUsed: true },
    { id: 'touch-b', timestamp: '2026-09-03T00:00:01Z', round: 1, type: 'TOUCH', message: 'b 접촉', student1Id: 'b', vaccineUsed: false },
  ];
  assert.equal(hasUsedTreatment(logs, 'a'), true);
  assert.equal(hasUsedTreatment(logs, 'b'), false);
});
test('round settlement infects inactive humans and starts rounds 2 and 3 exactly once', () => {
  for (const round of [1,2]) {
    const result = resolveRoundEnd([student('a',{points:5}),student('b',{touchedThisRound:true})],round,3);
    assert.equal(result.students[0].isZombie,true);
    assert.equal(result.students[1].isZombie,false);
    assert.ok(result.students.every(s => !s.touchedThisRound && !s.infectedThisRound));
    assert.deepEqual(result.logs.map(l=>[l.type,l.round]), [['ROUND_END',round],['INFECTION',round],['ROUND_START',round+1]]);
    assert.equal(result.logs[1].cumulativePoints,5);
  }
});
test('final round has no phantom round 4', () => {
  const result=resolveRoundEnd([student('a',{touchedThisRound:true})],3,3);
  assert.equal(result.finished,true);assert.equal(result.round,3);
  assert.deepEqual(result.logs.map(l=>l.type),['ROUND_END']);
});
test('time input rejects zero, negatives, decimals, NaN, infinity and unsafe integers', () => {
  for(const value of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.equal(isValidRoundTime(value),false);
  for(const value of [1,120,480]) assert.equal(isValidRoundTime(value),true);
});
test('Excel round trip keeps both scores and post-event states in chronological order', async () => {
  const event=resolveTouch([student('a',{points:5}),student('b',{isZombie:true,isOriginalZombie:true,points:2})],['a','b'],[],1);
  assert.ok(!('error' in event));
  const logs: GameLog[]=[{...event.log,id:'touch',timestamp:'2026-09-01T00:00:01Z'},{id:'start',timestamp:'2026-09-01T00:00:00Z',round:1,type:'ROUND_START',message:'start'}];
  const [logSheet,summarySheet]=createWorkbookSheets(logs,[student('a',{points:5}),student('b',{isZombie:true,isOriginalZombie:true,points:2})],1);
  const rows=logSheet.data;
  assert.equal(rows[1][1],'ROUND_START');assert.equal(rows[2][5],'감염자');
  assert.equal(rows[2][6],5);assert.equal(rows[2][12],2);assert.equal(rows[2][13],'O');
  assert.equal(logSheet.sheet,'게임 로그');assert.equal(logSheet.stickyRowsCount,1);
  assert.equal(summarySheet.sheet,'학생 현황');assert.equal(summarySheet.data[1][1],'a');
  const [{default:writeExcelFile},{readSheet}]=await Promise.all([import('write-excel-file/universal'),import('read-excel-file/node')]);
  const blob=await writeExcelFile([logSheet,summarySheet]).toBlob();
  const roundTripRows=await readSheet(Buffer.from(await blob.arrayBuffer()),'게임 로그');
  assert.equal(roundTripRows[1][1],'ROUND_START');assert.equal(roundTripRows[2][5],'감염자');
  assert.equal(roundTripRows[2][6],5);assert.equal(roundTripRows[2][12],2);assert.equal(roundTripRows[2][13],'O');
});
