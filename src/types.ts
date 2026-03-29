export interface Student {
  id: string;
  name: string;
  isZombie: boolean;
  isOriginalZombie: boolean;
  infectedThisRound: boolean;
  points: number;
  touchedThisRound: boolean;
}

export interface GameLog {
  id: string;
  timestamp: string;
  round: number;
  message: string;
  type: 'TOUCH' | 'CURE' | 'INFECTION' | 'ROUND_START' | 'ROUND_END' | 'GAME_START';
  // New fields for detailed Excel export
  student1?: string;
  status1?: string;
  student2?: string;
  status2?: string;
  pointsAwarded?: number;
  cumulativePoints?: number;
  isOriginalZombie?: boolean;
  vaccineUsed?: boolean;
}

export type GameState = 'START' | 'SETUP_CONFIG' | 'SETUP_STUDENTS' | 'SETUP_ZOMBIES' | 'GAME' | 'RESULTS';

export interface GameConfig {
  roundTime: number; // in seconds
  totalRounds: number;
}
