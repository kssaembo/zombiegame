import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyButtonSound } from '../src/audio/buttonSound';

test('button semantics select distinct feedback sounds', () => {
  assert.equal(classifyButtonSound('게임 강제 종료'), 'alert');
  assert.equal(classifyButtonSound('다음 라운드 시작'), 'next');
  assert.equal(classifyButtonSound('치료제 사용하기'), 'confirm');
  assert.equal(classifyButtonSound('학생A'), 'select');
  assert.equal(classifyButtonSound('무관', 'alert'), 'alert');
});
