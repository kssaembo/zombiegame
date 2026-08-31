import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, writeSave, loadSave, clearSave, SAVE_KEY, type SavedGame } from '../src/game/storage';

const save: SavedGame = {version:1,savedAt:'2026-09-01T00:00:00Z',view:'GAME',config:{roundTime:120,totalRounds:3},currentRound:2,timeLeft:57,
  students:[{id:'a',name:'A',isZombie:true,isOriginalZombie:true,infectedThisRound:false,touchedThisRound:true,points:2},{id:'b',name:'B',isZombie:false,isOriginalZombie:false,infectedThisRound:false,touchedThisRound:true,points:5}],
  logs:[{id:'l',round:2,type:'ROUND_START',message:'2라운드 시작!',timestamp:'2026-09-01T00:00:00Z'}],touchHistory:['a-b']};

test('save round trip preserves all state needed to resume including contact history', () => {
  assert.deepEqual(parseSave(JSON.stringify(save)),save);
});
test('corrupt or incompatible saves cannot reach the UI', () => {
  const variants:any[]=[{version:2},{config:{roundTime:-1,totalRounds:3}},{currentRound:4},{timeLeft:-1},{students:[save.students[0],save.students[0]]},{logs:[{...save.logs[0],message:{}}]},{touchHistory:[42]},{view:'INVALID'}];
  for(const patch of variants) assert.equal(parseSave(JSON.stringify({...save,...patch})),null);
  for(const raw of [null,'{','null','[]']) assert.equal(parseSave(raw),null);
});
test('setup and finished sessions are also restorable', () => {
  assert.ok(parseSave(JSON.stringify({...save,view:'SETUP_CONFIG',students:[]})));
  assert.ok(parseSave(JSON.stringify({...save,view:'RESULTS',currentRound:3,timeLeft:0})));
});
test('storage operations save, load, clear and expose failures', () => {
  const values=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
  assert.equal(writeSave(save),null);assert.deepEqual(loadSave().game,save);
  assert.ok(values.has(SAVE_KEY));assert.equal(clearSave(),null);assert.equal(loadSave().game,null);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('blocked');}});
  assert.ok(writeSave(save));assert.ok(loadSave().error);assert.ok(clearSave());
  delete (globalThis as any).localStorage;
});
