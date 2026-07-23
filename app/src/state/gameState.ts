// โครงสร้าง state ของทั้งเกม + ตัวช่วยอ่านค่า — ไม่มี side effect
import type { DuelOutcome, GameConfig, Move, Player } from "../domain/types";
import { defaultConfig, emptyStats } from "../domain/types";

// v2 (2026-07-21): เปลี่ยนศัพท์ — ผู้ท้าชิง = คนจ่ายเหรียญมาท้า (เดิม player) · คู่แข่ง = คนถูกท้า (เดิม challenger)
export const SAVE_VERSION = 2;

export type Phase =
  | "boot"
  | "home"
  | "challengerPick"
  | "awayRecap"
  | "roundMenu"
  | "moveSet"
  | "opponentPick"
  | "versus"
  | "movePick"
  | "shoot"
  | "duelResult"
  | "ranking"
  | "history"
  | "offRound"
  | "seasonEnd"
  | "seasonRecords"
  | "players"
  | "settings"
  | "tutorial";

export type OffRoundSave = "main" | "sub" | "none";

export interface DuelRecord {
  id: string;
  at: number;
  mode: "main" | "offRound";
  /** ผู้ท้าชิง — คนที่จ่ายเหรียญมาท้า */
  challengerId: string;
  /** เก็บชื่อ ณ ตอนดวลไว้ด้วย — ลบผู้เล่นแล้วประวัติเก่ายังอ่านรู้เรื่อง (spec §16 ข้อ 13) */
  challengerName: string;
  opponentId: string;
  opponentName: string;
  wasRandomPick: boolean;
  challengerMove: Move;
  opponentMove: Move;
  challengerOutcome: DuelOutcome;
  challengerDeltaTenths: number;
  opponentDeltaTenths: number;
  challengerSubDelta: number;
  opponentSubDelta: number;
  streakAfter: number;
  offRoundSave?: OffRoundSave;
}

/** รอบที่เปิดอยู่ (ผู้เล่นจ่ายเหรียญแล้ว ซุปกดเข้าหน้าให้) */
export interface Round {
  /** ผู้ท้าชิงที่เปิดรอบนี้ */
  challengerId: string;
  startedAt: number;
  duelDone: boolean;
  moveSetConfirmed: boolean;
}

export interface SeasonRecordRow {
  rank: number;
  playerId: string;
  name: string;
  imageUrl: string;
  mainScoreTenths: number;
  subScore: number;
  win: number;
  draw: number;
  lose: number;
  bestStreak: number;
  /** ชุดมูฟสุดท้าย — เปิดเผยได้แล้วเพราะซีซั่นจบ */
  finalMoveSet: [Move, Move, Move] | null;
  /** เรตการออกมูฟรวมทั้งซีซั่น (ทุกรอบ · ทั้งตอนเป็นผู้ท้าชิงและคู่แข่ง) — นับจากประวัติดวล · records เก่าไม่มี */
  moveRates?: Record<Move, number>;
}

export interface SeasonRecord {
  id: string;
  number: number;
  startedAt: number;
  endedAt: number;
  rows: SeasonRecordRow[];
  totalDuels: number;
}

export interface GameState {
  version: number;
  config: GameConfig;
  season: { id: string; number: number; startedAt: number };
  players: Player[];
  duels: DuelRecord[];
  round: Round | null;
  records: SeasonRecord[];
  /** playerId → เวลาที่คนนั้นเข้ารอบล่าสุด · ใช้คำนวณจอ "ระหว่างที่คุณไม่อยู่" */
  lastSeenAt: Record<string, number>;
}

export function createInitialState(now: number): GameState {
  return {
    version: SAVE_VERSION,
    config: { ...defaultConfig },
    season: { id: "SS1", number: 1, startedAt: now },
    players: [],
    duels: [],
    round: null,
    records: [],
    lastSeenAt: {},
  };
}

export function createPlayer(id: string, name: string, imageUrl: string, config: GameConfig): Player {
  return {
    id,
    name,
    imageUrl,
    moveSet: null,
    pointerIndex: 0,
    mainScoreTenths: config.startScore * 10,
    subScore: 0,
    streak: 0,
    bestStreak: 0,
    stats: emptyStats(),
  };
}

export function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((player) => player.id === id);
}

/** ลงสังเวียนแล้ว = ตั้งชุดมูฟของซีซั่นนี้เรียบร้อย → คนอื่นท้าได้ */
export function isInArena(player: Player): boolean {
  return player.moveSet !== null;
}

/**
 * คนที่ผู้เล่นคนนี้ท้าได้ — ตัวเองไม่อยู่ในรายการ และต้องลงสังเวียนแล้วเท่านั้น
 * ปุ่มสุ่มก็สุ่มจากรายการเดียวกัน จึงไม่มีทางสุ่มโดนตัวเอง
 */
export function challengeableIds(state: GameState, playerId: string): string[] {
  return state.players.filter((player) => player.id !== playerId && isInArena(player)).map((player) => player.id);
}

/**
 * "Aek" — ผู้เล่นพิเศษ (ซุป/ผู้คุม) ที่ลงเล่นแทนในดวลนอกรอบได้ ไม่ใช่ผู้เล่นจริง
 * อวาตาร์เป็นแมวส้มมาสคอตของเกม · ดวลได้เหมือนปกติ แต่ Aek ไม่ได้/ไม่เสียคะแนน และไม่นับสถิติ
 */
export const AEK_ID = "AEK";
export const AEK_NAME = "Aek";
export function isAek(id: string | null | undefined): boolean {
  return id === AEK_ID;
}

export interface AwayEntry {
  duel: DuelRecord;
  /** ผลจากมุมมองของเจ้าของจอ (ฝ่ายผู้ท้าชิง) */
  outcome: DuelOutcome;
  deltaTenths: number;
}

export interface AwayRecap {
  entries: AwayEntry[];
  totalDeltaTenths: number;
  /** ชื่อคนที่ไล่เก็บเรา (ท้าซ้ำถึงเกณฑ์ และชนะเราเกินครึ่ง) */
  farmers: { id: string; name: string; duels: number; wins: number }[];
}

function invert(outcome: DuelOutcome): DuelOutcome {
  if (outcome === "win") return "lose";
  if (outcome === "lose") return "win";
  return "draw";
}

/**
 * สิ่งที่เกิดขึ้นกับผู้เล่นคนนี้ตั้งแต่รอบที่แล้วของเขา — ใช้กับจอ "📬 ระหว่างที่คุณไม่อยู่"
 * นับเฉพาะตอนถูกท้าในเกมหลัก (ดวลนอกรอบเจ้าตัวอยู่ตรงนั้นอยู่แล้ว)
 */
export function awayRecapFor(state: GameState, playerId: string): AwayRecap {
  const since = state.lastSeenAt[playerId] ?? 0;
  const entries: AwayEntry[] = state.duels
    .filter((duel) => duel.mode === "main" && duel.opponentId === playerId && duel.at > since)
    .map((duel) => ({
      duel,
      outcome: invert(duel.challengerOutcome),
      deltaTenths: duel.opponentDeltaTenths,
    }));

  const byAttacker = new Map<string, { id: string; name: string; duels: number; wins: number }>();
  for (const entry of entries) {
    const key = entry.duel.challengerId;
    const row = byAttacker.get(key) ?? { id: key, name: entry.duel.challengerName, duels: 0, wins: 0 };
    row.duels += 1;
    // "wins" = ครั้งที่ฝ่ายท้าชนะเรา
    if (entry.outcome === "lose") row.wins += 1;
    byAttacker.set(key, row);
  }

  const farmers = [...byAttacker.values()].filter(
    (row) => row.duels >= state.config.farmWarnMinDuels && row.wins * 2 > row.duels,
  );

  return {
    entries,
    totalDeltaTenths: entries.reduce((sum, entry) => sum + entry.deltaTenths, 0),
    farmers,
  };
}

/** ประวัติทั้งหมดของผู้เล่นคนหนึ่ง (ทั้งสองบทบาท) เรียงใหม่สุดก่อน */
export function historyFor(state: GameState, playerId: string): DuelRecord[] {
  return state.duels
    .filter((duel) => duel.challengerId === playerId || duel.opponentId === playerId)
    .slice()
    .sort((a, b) => b.at - a.at);
}
