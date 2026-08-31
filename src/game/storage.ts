import type { GameConfig, GameLog, GameState, Student } from '../types';
import { isValidRoundTime } from './rules';

export const SAVE_KEY = 'virus-game.save.v1';
export interface SavedGame {
  version: 1;
  savedAt: string;
  view: Exclude<GameState, 'START'>;
  students: Student[];
  config: GameConfig;
  currentRound: number;
  timeLeft: number;
  logs: GameLog[];
  touchHistory: string[];
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const views = ['SETUP_CONFIG', 'SETUP_STUDENTS', 'SETUP_ZOMBIES', 'GAME', 'RESULTS'];
const logTypes = ['TOUCH', 'CURE', 'INFECTION', 'ROUND_START', 'ROUND_END', 'GAME_START'];

export function parseSave(raw: string | null): SavedGame | null {
  try {
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (!object(v) || v.version !== 1 || !text(v.savedAt) || !Number.isFinite(Date.parse(v.savedAt)) || !views.includes(v.view as string)) return null;
    if (!object(v.config) || typeof v.config.roundTime !== 'number' || !isValidRoundTime(v.config.roundTime) || v.config.totalRounds !== 3) return null;
    if (!integer(v.currentRound) || v.currentRound < 1 || v.currentRound > 3 || !integer(v.timeLeft)) return null;
    if (!Array.isArray(v.students) || !v.students.every(s => object(s) && text(s.id) && !!s.id && text(s.name) && !!s.name.trim() && integer(s.points) && ['isZombie', 'isOriginalZombie', 'infectedThisRound', 'touchedThisRound'].every(k => typeof s[k] === 'boolean') && (!s.isOriginalZombie || s.isZombie) && (!s.infectedThisRound || s.isZombie))) return null;
    const ids = new Set(v.students.map(s => s.id));
    if (ids.size !== v.students.length) return null;
    if ((v.view === 'GAME' || v.view === 'RESULTS') && (v.students.length < 2 || !v.students.some(s => s.isOriginalZombie))) return null;
    if (!Array.isArray(v.touchHistory) || !v.touchHistory.every(text)) return null;
    if (!Array.isArray(v.logs) || !v.logs.every(l => {
      if (!object(l) || !text(l.id) || !text(l.timestamp) || !text(l.message) || !integer(l.round) || l.round < 1 || l.round > 3 || !logTypes.includes(l.type as string)) return false;
      const strings = ['student1', 'student2', 'student1Id', 'student2Id', 'beforeStatus1', 'beforeStatus2', 'status1', 'status2'];
      return strings.every(k => l[k] === undefined || text(l[k])) && ['pointsAwarded', 'cumulativePoints', 'cumulativePoints2'].every(k => l[k] === undefined || integer(l[k])) && ['isOriginalZombie', 'isOriginalZombie2', 'vaccineUsed'].every(k => l[k] === undefined || typeof l[k] === 'boolean');
    })) return null;
    return v as unknown as SavedGame;
  } catch { return null; }
}

export function loadSave(): { game: SavedGame | null; error: string | null } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const game = parseSave(raw);
    return { game, error: raw && !game ? '저장 데이터가 손상되었거나 지원하지 않는 형식입니다. 새 게임을 시작해주세요.' : null };
  } catch { return { game: null, error: '브라우저 저장소에 접근할 수 없습니다. 자동 저장을 사용할 수 없습니다.' }; }
}

export function writeSave(game: SavedGame): string | null {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); return null; }
  catch { return '자동 저장에 실패했습니다. 창을 닫기 전에 엑셀로 기록을 내려받아 주세요.'; }
}

export function clearSave(): string | null {
  try { localStorage.removeItem(SAVE_KEY); return null; }
  catch { return '저장 기록을 삭제하지 못했습니다. 브라우저 저장소 설정을 확인해주세요.'; }
}
