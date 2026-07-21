export type Move = "rock" | "paper" | "scissors";
export type Outcome = "win" | "draw" | "loss";
export type OpponentMode = "chosen" | "random";
export type OffRoundSaveMode = "main" | "secondary" | "discard";

export type MoveCounts = Record<Move, number>;

export interface RateSet {
  win: number;
  draw: number;
  loss: number;
}

export interface GameSettings {
  startingScoreUnits: number;
  coinsPerRound: number;
  mainPickSeconds: number;
  offRoundPickSeconds: number;
  streakBonusPercent: number;
  huntedMinChallenges: number;
  huntedWinRatePercent: number;
  rates: {
    challengerChosen: RateSet;
    challengerRandom: RateSet;
    defender: RateSet;
    offRound: RateSet;
  };
}

export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  active: boolean;
  moveset: Move[] | null;
  pointer: number;
  mainScoreUnits: number;
  sideScoreUnits: number;
  streak: number;
  bestStreak: number;
  wins: number;
  losses: number;
  draws: number;
  challengerEntries: number;
  duelCount: number;
  moveCounts: MoveCounts;
  lastSeenHistoryId: string | null;
}

export interface DuelHistory {
  id: string;
  kind: "main" | "offround-main" | "offround-secondary" | "offround-discard";
  challengerId?: string;
  challengerName?: string;
  defenderId?: string;
  defenderName?: string;
  playerAId?: string;
  playerAName?: string;
  playerBId?: string;
  playerBName?: string;
  moveA?: Move;
  moveB?: Move;
  challengerMove?: Move;
  defenderMove?: Move;
  outcomeA?: Outcome;
  challengerOutcome?: Outcome;
  challengerDeltaUnits: number;
  defenderDeltaUnits: number;
  createdAt: number;
}

export interface ActiveRound {
  playerId: string;
  openedAt: number;
  didMainDuel: boolean;
  didMovesetChange: boolean;
}

export interface ActiveOffRound {
  playerAId: string;
  playerBId: string;
  step: "pickA" | "curtain" | "pickB" | "result";
}

export interface SeasonArchive {
  seasonId: string;
  finishedAt: number;
  championName: string | null;
  ranking: Array<{ rank: number; playerName: string; mainScoreUnits: number; sideScoreUnits: number }>;
  revealedMovesets: Array<{ playerName: string; moveset: Move[] | null }>;
}

export interface GameState {
  seasonId: string;
  players: Record<string, Player>;
  history: DuelHistory[];
  settings: GameSettings;
  activeRound: ActiveRound | null;
  activeOffRound: ActiveOffRound | null;
  archives: SeasonArchive[];
}

export interface MainDuelInput {
  challengerId: string;
  defenderId: string;
  challengerMove: Move;
  opponentMode: OpponentMode;
  now: number;
}

export interface OffRoundInput {
  playerAId: string;
  playerBId: string;
  moveA: Move;
  moveB: Move;
  saveMode: OffRoundSaveMode;
  now: number;
}
