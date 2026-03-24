export interface Student {
  id: string;
  name: string;
  isZombie: boolean;
  isOriginalZombie: boolean;
  infectedThisRound: boolean;
  points: number;
  touchedThisRound: boolean;
}

export type GameState = 'START' | 'SETUP_CONFIG' | 'SETUP_STUDENTS' | 'SETUP_ZOMBIES' | 'GAME' | 'RESULTS';

export interface GameConfig {
  roundTime: number; // in seconds
  totalRounds: number;
}
