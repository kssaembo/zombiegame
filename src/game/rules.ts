import type { GameLog, Student } from '../types';

export type LogEntry = Omit<GameLog, 'id' | 'timestamp'>;
export const isValidRoundTime = (value: number) => Number.isSafeInteger(value) && value > 0;
export const statusOf = (student: Student) => student.isZombie ? '감염자' : '비감염자';

function studentDetails(before: Student, after: Student) {
  return {
    student1Id: after.id, student1: after.name,
    beforeStatus1: statusOf(before), status1: statusOf(after),
    cumulativePoints: after.points, isOriginalZombie: after.isOriginalZombie,
  };
}

export function resolveTouch(students: Student[], ids: string[], history: string[], round: number) {
  if (ids.length !== 2 || ids[0] === ids[1]) return { error: '두 학생을 선택해주세요.' };
  const pairId = [...ids].sort().join('-');
  if (history.includes(pairId)) return { error: '이미 접촉을 완료했습니다.' };
  const first = students.find(s => s.id === ids[0]);
  const second = students.find(s => s.id === ids[1]);
  if (!first || !second) return { error: '학생 정보를 확인해주세요.' };
  const infected = first.isZombie || second.isZombie;
  const next = students.map(s => {
    if (!ids.includes(s.id)) return s;
    return {
      ...s, touchedThisRound: true,
      isZombie: infected || s.isZombie,
      infectedThisRound: s.infectedThisRound || (infected && !s.isZombie),
      points: s.points + (infected ? 0 : 1),
    };
  });
  const after1 = next.find(s => s.id === first.id)!;
  const after2 = next.find(s => s.id === second.id)!;
  const log: LogEntry = {
    round, type: 'TOUCH',
    message: `${first.name}와(과) ${second.name} 터치! ${infected ? (first.isZombie && second.isZombie ? '감염자 접촉 (승점 없음)' : '감염 발생 (승점 없음)') : '안전 (+1점)'}`,
    ...studentDetails(first, after1),
    student2Id: after2.id, student2: after2.name,
    beforeStatus2: statusOf(second), status2: statusOf(after2),
    cumulativePoints2: after2.points, isOriginalZombie2: after2.isOriginalZombie,
    pointsAwarded: infected ? 0 : 1, vaccineUsed: false,
  };
  return { students: next, pairId, log };
}

// Repeated treatment is intentional: there is no inventory or use-count limit.
export function resolveCure(students: Student[], id: string, round: number) {
  const before = students.find(s => s.id === id);
  if (!before) return null;
  const canCure = before.isZombie && before.infectedThisRound && !before.isOriginalZombie;
  const after = canCure ? { ...before, isZombie: false, infectedThisRound: false } : before;
  const log: LogEntry = {
    round, type: 'CURE',
    message: `${before.name} 치료제 사용! ${canCure ? '비감염자로 복구' : '변화 없음'}`,
    ...studentDetails(before, after), pointsAwarded: 0, vaccineUsed: true,
  };
  return { students: students.map(s => s.id === id ? after : s), log };
}

export function resolveRoundEnd(students: Student[], round: number, totalRounds: number) {
  const logs: LogEntry[] = [{ round, type: 'ROUND_END', message: `${round}라운드 종료` }];
  const next = students.map(s => {
    const after = { ...s, isZombie: s.isZombie || !s.touchedThisRound, infectedThisRound: false, touchedThisRound: false };
    if (!s.isZombie && !s.touchedThisRound) {
      logs.push({ round, type: 'INFECTION', message: `활동 부족으로 인한 감염: ${s.name}`, ...studentDetails(s, after), pointsAwarded: 0 });
    }
    return after;
  });
  const finished = round >= totalRounds;
  const nextRound = finished ? round : round + 1;
  if (!finished) logs.push({ round: nextRound, type: 'ROUND_START', message: `${nextRound}라운드 시작!` });
  return { students: next, round: nextRound, finished, logs };
}

export function logRows(logs: GameLog[]) {
  const flag = (value: boolean | undefined) => value === undefined ? '-' : value ? 'O' : 'X';
  return [
    ['라운드', '유형', '학생1 ID', '학생1', '학생1 처리 전 상태', '학생1 처리 후 상태', '학생1 누적승점', '학생1 최초감염자', '학생2 ID', '학생2', '학생2 처리 전 상태', '학생2 처리 후 상태', '학생2 누적승점', '학생2 최초감염자', '1인당 획득승점', '치료제 사용', '메시지', '시간'],
    ...[...logs].reverse().map(l => [
      l.round, l.type, l.student1Id ?? '-', l.student1 ?? '-', l.beforeStatus1 ?? '-', l.status1 ?? '-', l.cumulativePoints ?? '-', flag(l.isOriginalZombie),
      l.student2Id ?? '-', l.student2 ?? '-', l.beforeStatus2 ?? '-', l.status2 ?? '-', l.cumulativePoints2 ?? '-', flag(l.isOriginalZombie2),
      l.pointsAwarded ?? '-', flag(l.vaccineUsed), l.message, l.timestamp,
    ]),
  ];
}
