// action ทั้งหมดของเกม — reducer บริสุทธิ์ (state, payload) => state ใหม่
// ทุกฟังก์ชันรับ `now` เข้ามาเพื่อให้เทสได้ ไม่เรียก Date.now() เอง
import { rankPlayers } from "../domain/rankingEngine";
import { moveAtPointer, nextPointer, resolveDuel } from "../domain/rpsEngine";
import {
  applyDelta,
  opponentDeltaTenths,
  nextStreak,
  offRoundDeltaTenths,
  offRoundSubScore,
  challengerDeltaTenths,
} from "../domain/scoreEngine";
import type { DuelOutcome, GameConfig, Move, MoveSet, Player } from "../domain/types";
import { emptyStats } from "../domain/types";
import {
  AEK_NAME,
  createPlayer,
  findPlayer,
  isAek,
  isInArena,
  type DuelRecord,
  type GameState,
  type OffRoundSave,
  type SeasonRecord,
  type SeasonRecordRow,
} from "./gameState";

function invert(outcome: DuelOutcome): DuelOutcome {
  if (outcome === "win") return "lose";
  if (outcome === "lose") return "win";
  return "draw";
}

function replacePlayer(state: GameState, updated: Player): Player[] {
  return state.players.map((player) => (player.id === updated.id ? updated : player));
}

function clonePlayer(player: Player): Player {
  return {
    ...player,
    stats: {
      asChallenger: { ...player.stats.asChallenger },
      asOpponent: { ...player.stats.asOpponent },
      moveCount: { ...player.stats.moveCount },
    },
  };
}

function bumpRole(record: { win: number; draw: number; lose: number }, outcome: DuelOutcome): void {
  if (outcome === "win") record.win += 1;
  else if (outcome === "draw") record.draw += 1;
  else record.lose += 1;
}

// ─── ผู้เล่น ───────────────────────────────────────────────────────────────

/** รหัสผู้เล่น: ตัวพิมพ์ใหญ่ 1 + ตัวเลข 3 = 4 ตัวเป๊ะ (เหมือนเกมที่ 1) */
export function isValidPlayerCode(code: string): boolean {
  return /^[A-Z]\d{3}$/.test(code);
}

export function addPlayer(state: GameState, id: string, name: string, imageUrl: string): GameState {
  const code = id.trim().toUpperCase();
  if (!isValidPlayerCode(code)) throw new Error("รหัสต้องเป็นตัวพิมพ์ใหญ่ 1 ตัว + ตัวเลข 3 ตัว");
  if (findPlayer(state, code)) throw new Error("รหัสนี้มีคนใช้แล้ว");
  if (name.trim() === "") throw new Error("ต้องใส่ชื่อ");
  return { ...state, players: [...state.players, createPlayer(code, name.trim(), imageUrl, state.config)] };
}

export function editPlayer(state: GameState, id: string, name: string, imageUrl: string): GameState {
  const player = findPlayer(state, id);
  if (!player) throw new Error("ไม่พบผู้เล่น");
  if (name.trim() === "") throw new Error("ต้องใส่ชื่อ");
  return { ...state, players: replacePlayer(state, { ...player, name: name.trim(), imageUrl }) };
}

/** เหตุผลที่ลบผู้เล่นไม่ได้ตอนนี้ — null = ลบได้ */
export function removeBlockedReason(state: GameState, id: string): string | null {
  if (state.round?.challengerId === id) return "คนนี้กำลังอยู่ในรอบที่เปิดค้าง — จบรอบก่อน";
  return null;
}

export function removePlayer(state: GameState, id: string): GameState {
  const blocked = removeBlockedReason(state, id);
  if (blocked) throw new Error(blocked);
  return { ...state, players: state.players.filter((player) => player.id !== id) };
}

// ─── รอบ ──────────────────────────────────────────────────────────────────

export function startRound(state: GameState, playerId: string, now: number): GameState {
  const player = findPlayer(state, playerId);
  if (!player) throw new Error("ไม่พบผู้เล่น");
  if (state.round) throw new Error("ยังมีรอบที่เปิดค้างอยู่");
  return { ...state, round: { challengerId: playerId, startedAt: now, duelDone: false, moveSetConfirmed: false } };
}

/** จบรอบ + จำเวลาที่คนนี้เข้ามาล่าสุด (ใช้คำนวณจอ "ระหว่างที่คุณไม่อยู่" รอบหน้า) */
export function endRound(state: GameState, now: number): GameState {
  if (!state.round) return state;
  return {
    ...state,
    round: null,
    lastSeenAt: { ...state.lastSeenAt, [state.round.challengerId]: now },
  };
}

/**
 * ยืนยันชุดมูฟ — **รีเซตตัวชี้กลับช่อง 1 เสมอ** แม้ไม่ได้เปลี่ยนค่าอะไรเลย
 * (จ่าย 3 เหรียญ "ซื้อการสับขาหลอก" ได้ · spec §5.3)
 *
 * การตั้งครั้งแรกของซีซั่น (moveSet เดิมเป็น null) = ฟรี ไม่นับเป็นสิทธิ์ปรับชุดมูฟของรอบ
 */
export function confirmMoveSet(state: GameState, playerId: string, moveSet: MoveSet): GameState {
  const player = findPlayer(state, playerId);
  if (!player) throw new Error("ไม่พบผู้เล่น");

  const isFirstSetup = player.moveSet === null;
  if (!isFirstSetup) {
    if (!state.round || state.round.challengerId !== playerId) throw new Error("ต้องอยู่ในรอบของตัวเองก่อน");
    if (state.round.moveSetConfirmed) throw new Error("รอบนี้ปรับชุดมูฟไปแล้ว");
  }

  const updated: Player = { ...clonePlayer(player), moveSet: [...moveSet] as MoveSet, pointerIndex: 0 };
  return {
    ...state,
    players: replacePlayer(state, updated),
    round: state.round && !isFirstSetup ? { ...state.round, moveSetConfirmed: true } : state.round,
  };
}

// ─── ดวล ──────────────────────────────────────────────────────────────────

export interface DuelResult {
  state: GameState;
  duel: DuelRecord;
}

/** เหตุผลที่ดวลไม่ได้ตอนนี้ — null = ดวลได้ */
export function duelBlockedReason(state: GameState, playerId: string): string | null {
  if (!state.round || state.round.challengerId !== playerId) return "ต้องเปิดรอบก่อน";
  if (state.round.duelDone) return "รอบนี้ดวลไปแล้ว";
  const player = findPlayer(state, playerId);
  if (!player) return "ไม่พบผู้เล่น";
  if (!isInArena(player)) return "ต้องตั้งชุดมูฟก่อนลงสังเวียน";
  if (state.players.filter((other) => other.id !== playerId && isInArena(other)).length === 0) {
    return "ยังไม่มีใครลงสังเวียนให้ท้า — รอเพื่อนมาตั้งชุดมูฟก่อน";
  }
  return null;
}

/**
 * กันไล่ปั๊มดวลคนเดียว — ถ้า "คู่แข่งคนเดิม" ถูกท้า (ดวลหลัก) ติดต่อกันหลายครั้ง
 * ผู้ท้าชิงที่ "ชนะ" จะได้คะแนนน้อยลง (หั่นเป็นขั้นสุดท้าย หลังคูณสตรีค/โบนัสสุ่มแล้ว)
 * · ครั้งที่ 5+ = ครึ่งเดียว · ครั้งที่ 7+ = 25% · แพ้/เสมอ และฝั่งคู่แข่งไม่ถูกแตะ
 */
function applyFarmDiscount(
  challengerDeltaTenths: number,
  challengerOutcome: DuelOutcome,
  consecutiveOnOpponent: number,
): number {
  if (challengerOutcome !== "win") return challengerDeltaTenths;
  if (consecutiveOnOpponent >= 7) return Math.round(challengerDeltaTenths * 0.25);
  if (consecutiveOnOpponent >= 5) return Math.round(challengerDeltaTenths * 0.5);
  return challengerDeltaTenths;
}

/** นับว่าคู่แข่งคนนี้ถูกท้า (ดวลหลัก) ติดต่อกันมากี่ครั้งแล้ว รวมครั้งที่กำลังจะเกิด
 *  ดวลนอกรอบไม่นับ/ไม่ตัดการติดกัน · เจอคนอื่นถูกท้าคั่น = หยุดนับ (เริ่มใหม่) */
function consecutiveChallengesOn(pastDuels: readonly DuelRecord[], opponentId: string): number {
  let count = 1; // รวมครั้งที่กำลังจะเกิดขึ้น
  for (let i = pastDuels.length - 1; i >= 0; i -= 1) {
    const past = pastDuels[i];
    if (past.mode !== "main") continue;
    if (past.opponentId === opponentId) count += 1;
    else break;
  }
  return count;
}

/**
 * ดวลในเกมหลัก — ลำดับการคำนวณตาม spec §8.4 เป๊ะ
 */
export function performDuel(
  state: GameState,
  args: { challengerId: string; opponentId: string; wasRandomPick: boolean; challengerMove: Move; now: number },
): DuelResult {
  const { challengerId, opponentId, wasRandomPick, challengerMove, now } = args;
  const blocked = duelBlockedReason(state, challengerId);
  if (blocked) throw new Error(blocked);
  if (challengerId === opponentId) throw new Error("ท้าตัวเองไม่ได้");

  const challenger = clonePlayer(findPlayer(state, challengerId)!);
  const opponent = clonePlayer(findPlayer(state, opponentId)!);
  if (!opponent.moveSet) throw new Error("คนนี้ยังไม่ลงสังเวียน");

  // 1. ตัดสินผล
  const opponentMove = moveAtPointer(opponent.moveSet, opponent.pointerIndex);
  const challengerOutcome = resolveDuel(challengerMove, opponentMove);
  const opponentOutcome = invert(challengerOutcome);

  // 2. สตรีคเดินก่อน แล้วค่อยเอาไปคูณ
  const streakAfter = nextStreak(challenger.streak, challengerOutcome);
  challenger.streak = streakAfter;
  challenger.bestStreak = Math.max(challenger.bestStreak, streakAfter);

  // 3-4. คะแนนสองฝั่ง + พื้นที่ 0 · ผู้ท้าชิงที่ไล่ปั๊มคู่แข่งคนเดิมชนะ → คะแนนถูกหั่น (ฝั่งคู่แข่งเสียเท่าเดิม)
  const consecutiveOnOpponent = consecutiveChallengesOn(state.duels, opponentId);
  const challengerDelta = applyFarmDiscount(
    challengerDeltaTenths(challengerOutcome, wasRandomPick, streakAfter, state.config),
    challengerOutcome,
    consecutiveOnOpponent,
  );
  const opponentDelta = opponentDeltaTenths(opponentOutcome, state.config);
  challenger.mainScoreTenths = applyDelta(challenger.mainScoreTenths, challengerDelta);
  opponent.mainScoreTenths = applyDelta(opponent.mainScoreTenths, opponentDelta);

  // 5. สถิติ + เรตมูฟ
  bumpRole(challenger.stats.asChallenger, challengerOutcome);
  challenger.stats.asChallenger.mainDuels += 1;
  bumpRole(opponent.stats.asOpponent, opponentOutcome);
  opponent.stats.moveCount[opponentMove] += 1;

  // 7. ตัวชี้ของคู่แข่งเดิน 1 ช่อง
  opponent.pointerIndex = nextPointer(opponent.pointerIndex);

  const duel: DuelRecord = {
    id: `${now}-${challengerId}-${opponentId}`,
    at: now,
    mode: "main",
    challengerId,
    challengerName: challenger.name,
    opponentId,
    opponentName: opponent.name,
    wasRandomPick,
    challengerMove,
    opponentMove,
    challengerOutcome,
    challengerDeltaTenths: challengerDelta,
    opponentDeltaTenths: opponentDelta,
    challengerSubDelta: 0,
    opponentSubDelta: 0,
    streakAfter,
  };

  const players = state.players.map((row) => {
    if (row.id === challengerId) return challenger;
    if (row.id === opponentId) return opponent;
    return row;
  });

  return {
    state: {
      ...state,
      players,
      duels: [...state.duels, duel],
      round: { ...state.round!, duelDone: true },
    },
    duel,
  };
}

// ─── ดวลนอกรอบ ────────────────────────────────────────────────────────────

/**
 * ดวลนอกรอบ — ทั้งสองฝ่ายเลือกมูฟเอง
 * ไม่แตะสตรีค · ไม่เลื่อนตัวชี้ · ไม่นับ mainDuels (spec §10.3)
 */
export function performOffRoundDuel(
  state: GameState,
  args: { aId: string; bId: string; aMove: Move; bMove: Move; save: OffRoundSave; now: number },
): DuelResult {
  const { aId, bId, aMove, bMove, save, now } = args;
  if (aId === bId) throw new Error("ต้องเลือกคนละคน");
  const a = clonePlayer(findPlayer(state, aId) ?? (() => { throw new Error("ไม่พบผู้เล่น"); })());
  // Aek (ซุป/ผู้คุม) ไม่ใช่ผู้เล่นจริง — ไม่มีใน players · b = null แปลว่าคู่ต่อสู้คือ Aek
  const b = isAek(bId) ? null : clonePlayer(findPlayer(state, bId) ?? (() => { throw new Error("ไม่พบผู้เล่น"); })());

  const aOutcome = resolveDuel(aMove, bMove);
  const bOutcome = invert(aOutcome);

  let aDelta = 0;
  let bDelta = 0;
  let aSub = 0;
  let bSub = 0;

  if (save === "main") {
    aDelta = offRoundDeltaTenths(aOutcome, state.config);
    a.mainScoreTenths = applyDelta(a.mainScoreTenths, aDelta);
    // นับสถิติแพ้ชนะ แต่ **ไม่นับ mainDuels** (ไม่ให้ไต่อันดับชั้น 4 ด้วยโหมดนี้)
    bumpRole(a.stats.asChallenger, aOutcome);
    if (b) {
      // ฝั่ง Aek ไม่ได้/ไม่เสียคะแนน และไม่นับสถิติ (b = null)
      bDelta = offRoundDeltaTenths(bOutcome, state.config);
      b.mainScoreTenths = applyDelta(b.mainScoreTenths, bDelta);
      bumpRole(b.stats.asChallenger, bOutcome);
    }
  } else if (save === "sub") {
    aSub = offRoundSubScore(aOutcome, state.config);
    a.subScore += aSub;
    if (b) {
      bSub = offRoundSubScore(bOutcome, state.config);
      b.subScore += bSub;
    }
  }

  const duel: DuelRecord = {
    id: `${now}-off-${aId}-${bId}`,
    at: now,
    mode: "offRound",
    challengerId: aId,
    challengerName: a.name,
    opponentId: bId,
    opponentName: b?.name ?? AEK_NAME,
    wasRandomPick: false,
    challengerMove: aMove,
    opponentMove: bMove,
    challengerOutcome: aOutcome,
    challengerDeltaTenths: aDelta,
    opponentDeltaTenths: bDelta,
    challengerSubDelta: aSub,
    opponentSubDelta: bSub,
    streakAfter: a.streak, // ไม่เปลี่ยน — บันทึกค่าเดิมไว้เฉยๆ
    offRoundSave: save,
  };

  const players = state.players.map((row) => {
    if (row.id === aId) return a;
    if (b && row.id === bId) return b;
    return row;
  });

  return {
    state: { ...state, players, duels: save === "none" ? state.duels : [...state.duels, duel] },
    duel,
  };
}

// ─── จัดการประวัติ (ลบรายการทดสอบ + คำนวณคะแนนใหม่) ──────────────────────────

/**
 * รีเซตค่าที่คำนวณได้ของผู้เล่นกลับจุดเริ่ม (คงชื่อ/รูป/ชุดมูฟไว้)
 * — ใช้ก่อน replay ประวัติที่เหลือ
 */
function resetDerived(player: Player, config: GameConfig): Player {
  return {
    ...player,
    pointerIndex: 0,
    mainScoreTenths: config.startScore * 10,
    subScore: 0,
    streak: 0,
    bestStreak: 0,
    stats: emptyStats(),
  };
}

/**
 * เล่นซ้ำการดวล 1 รายการลงบน map ผู้เล่น (แก้ค่าในตัว) แล้วคืน record ที่อัปเดต delta/streak ให้ถูกต้อง
 * ตรรกะตรงกับ performDuel / performOffRoundDuel เป๊ะ — ใช้ตอน rebuild หลังลบประวัติ
 */
function replayDuel(
  players: Map<string, Player>,
  duel: DuelRecord,
  config: GameConfig,
  consecutiveOnOpponent = 1,
): DuelRecord {
  const challenger = players.get(duel.challengerId);
  const opponent = players.get(duel.opponentId);
  // ผู้เล่นถูกลบไปแล้ว → เก็บ record ไว้เฉยๆ ไม่ต้องคิดคะแนน (ประวัติยังอ่านได้จากชื่อที่บันทึกไว้)
  if (!challenger || !opponent) return duel;

  const challengerOutcome = resolveDuel(duel.challengerMove, duel.opponentMove);
  const opponentOutcome = invert(challengerOutcome);

  if (duel.mode === "main") {
    const streakAfter = nextStreak(challenger.streak, challengerOutcome);
    challenger.streak = streakAfter;
    challenger.bestStreak = Math.max(challenger.bestStreak, streakAfter);
    const challengerDelta = applyFarmDiscount(
      challengerDeltaTenths(challengerOutcome, duel.wasRandomPick, streakAfter, config),
      challengerOutcome,
      consecutiveOnOpponent,
    );
    const opponentDelta = opponentDeltaTenths(opponentOutcome, config);
    challenger.mainScoreTenths = applyDelta(challenger.mainScoreTenths, challengerDelta);
    opponent.mainScoreTenths = applyDelta(opponent.mainScoreTenths, opponentDelta);
    bumpRole(challenger.stats.asChallenger, challengerOutcome);
    challenger.stats.asChallenger.mainDuels += 1;
    bumpRole(opponent.stats.asOpponent, opponentOutcome);
    opponent.stats.moveCount[duel.opponentMove] += 1;
    opponent.pointerIndex = nextPointer(opponent.pointerIndex);
    return {
      ...duel,
      challengerOutcome,
      challengerDeltaTenths: challengerDelta,
      opponentDeltaTenths: opponentDelta,
      streakAfter,
    };
  }

  // โหมดดวลนอกรอบ — ตามที่บันทึกวิธีเก็บผลไว้ (main/sub) · ไม่แตะสตรีค/ตัวชี้
  const save = duel.offRoundSave ?? "main";
  let aDelta = 0;
  let bDelta = 0;
  let aSub = 0;
  let bSub = 0;
  if (save === "main") {
    aDelta = offRoundDeltaTenths(challengerOutcome, config);
    bDelta = offRoundDeltaTenths(opponentOutcome, config);
    challenger.mainScoreTenths = applyDelta(challenger.mainScoreTenths, aDelta);
    opponent.mainScoreTenths = applyDelta(opponent.mainScoreTenths, bDelta);
    bumpRole(challenger.stats.asChallenger, challengerOutcome);
    bumpRole(opponent.stats.asChallenger, opponentOutcome);
  } else if (save === "sub") {
    aSub = offRoundSubScore(challengerOutcome, config);
    bSub = offRoundSubScore(opponentOutcome, config);
    challenger.subScore += aSub;
    opponent.subScore += bSub;
  }
  return {
    ...duel,
    challengerOutcome,
    challengerDeltaTenths: aDelta,
    opponentDeltaTenths: bDelta,
    challengerSubDelta: aSub,
    opponentSubDelta: bSub,
    streakAfter: challenger.streak,
  };
}

/**
 * ลบประวัติการดวลบางรายการ แล้ว **คำนวณคะแนน/สถิติ/อันดับใหม่ทั้งหมด** จากรายการที่เหลือ
 * ใช้ในหน้าตั้งค่า: ผู้ควบคุมลบดวลตอนทดสอบทิ้ง โดยไม่ต้องรีเซตทั้งซีซั่น (ไม่ต้องตั้งชุดมูฟใหม่)
 *
 * เล่นซ้ำตามลำดับเวลา (at) เพื่อให้สตรีค/ตัวชี้/คะแนนต่อเนื่องถูกต้อง
 */
export function deleteDuels(state: GameState, removeIds: readonly string[]): GameState {
  if (state.round) throw new Error("จบรอบที่เปิดค้างก่อน ถึงจะแก้ประวัติได้");
  const remove = new Set(removeIds);
  const kept = state.duels.filter((duel) => !remove.has(duel.id)).sort((a, b) => a.at - b.at);

  const players = new Map(state.players.map((player) => [player.id, resetDerived(clonePlayer(player), state.config)]));
  // เล่นซ้ำตามลำดับเวลา — track ว่าคู่แข่งแต่ละคนถูกท้า(ดวลหลัก)ติดกันกี่ครั้ง เพื่อหั่นคะแนนปั๊มให้ตรงกับตอนเล่นจริง
  let prevMainOpponent: string | null = null;
  let consecOnOpponent = 0;
  const rebuiltDuels = kept.map((duel) => {
    let consec = 1;
    if (duel.mode === "main") {
      consecOnOpponent = duel.opponentId === prevMainOpponent ? consecOnOpponent + 1 : 1;
      prevMainOpponent = duel.opponentId;
      consec = consecOnOpponent;
    }
    return replayDuel(players, duel, state.config, consec);
  });

  return {
    ...state,
    players: state.players.map((player) => players.get(player.id) ?? player),
    duels: rebuiltDuels,
    // ล้าง lastSeenAt ของประวัติที่ถูกลบไม่จำเป็น — จอ recap อิงเวลา ยังทำงานถูก
  };
}

// ─── ซีซั่น ────────────────────────────────────────────────────────────────

/** ขอบเขตที่ยอมให้ตั้งได้ — กันตั้งค่าประหลาดจนเกมพัง (ติดลบ/0/มหาศาล) */
export const configLimits = {
  startScore: { min: 0, max: 999 },
  coinCost: { min: 0, max: 99 },
  movePickSeconds: { min: 5, max: 180 },
  streakStepPercent: { min: 0, max: 100 },
  farmWarnMinDuels: { min: 2, max: 20 },
  rate: { min: -20, max: 20 },
  tvVolume: { min: 0, max: 2 },
} as const;

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** เหมือน clampInt แต่ไม่ปัดเศษ — ใช้กับค่าทศนิยมอย่างความดัง TV */
function clampFloat(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * ปรับค่าเกมในหน้าตั้งค่า — บีบทุกค่าให้อยู่ในขอบเขตเสมอ ไม่เชื่อ input ตรงๆ
 * คะแนนตั้งต้นมีผลกับ "ซีซั่นใหม่" เท่านั้น ไม่ย้อนไปแก้คะแนนที่เล่นไปแล้ว
 */
export function updateConfig(state: GameState, patch: Partial<GameConfig>): GameState {
  const merged = { ...state.config, ...patch };
  const limits = configLimits;
  const clampRates = (rates: { win: number; draw: number; lose: number }) => ({
    win: clampInt(rates.win, limits.rate.min, limits.rate.max, 0),
    draw: clampInt(rates.draw, limits.rate.min, limits.rate.max, 0),
    lose: clampInt(rates.lose, limits.rate.min, limits.rate.max, 0),
  });
  return {
    ...state,
    config: {
      startScore: clampInt(merged.startScore, limits.startScore.min, limits.startScore.max, state.config.startScore),
      coinCost: clampInt(merged.coinCost, limits.coinCost.min, limits.coinCost.max, state.config.coinCost),
      movePickSeconds: clampInt(merged.movePickSeconds, limits.movePickSeconds.min, limits.movePickSeconds.max, state.config.movePickSeconds),
      streakStepPercent: clampInt(merged.streakStepPercent, limits.streakStepPercent.min, limits.streakStepPercent.max, state.config.streakStepPercent),
      farmWarnMinDuels: clampInt(merged.farmWarnMinDuels, limits.farmWarnMinDuels.min, limits.farmWarnMinDuels.max, state.config.farmWarnMinDuels),
      pickedRates: clampRates(merged.pickedRates),
      randomRates: clampRates(merged.randomRates),
      opponentRates: clampRates(merged.opponentRates),
      offRoundRates: clampRates(merged.offRoundRates),
      tvVolume: clampFloat(merged.tvVolume, limits.tvVolume.min, limits.tvVolume.max, state.config.tvVolume),
    },
  };
}

/** นับเรตการออกมูฟรวมทุกรอบของผู้เล่น (ทั้งตอนเป็นผู้ท้าชิงและคู่แข่ง) จากประวัติดวลทั้งซีซั่น */
function moveRatesFromDuels(duels: readonly DuelRecord[], playerId: string): Record<Move, number> {
  const count: Record<Move, number> = { rock: 0, scissors: 0, paper: 0 };
  for (const duel of duels) {
    if (duel.challengerId === playerId) count[duel.challengerMove] += 1;
    if (duel.opponentId === playerId) count[duel.opponentMove] += 1;
  }
  return count;
}

export function endSeason(state: GameState, now: number): GameState {
  const rows: SeasonRecordRow[] = rankPlayers(state.players).map((ranked) => ({
    rank: ranked.rank,
    playerId: ranked.player.id,
    name: ranked.player.name,
    imageUrl: ranked.player.imageUrl,
    mainScoreTenths: ranked.player.mainScoreTenths,
    subScore: ranked.player.subScore,
    win: ranked.player.stats.asChallenger.win + ranked.player.stats.asOpponent.win,
    draw: ranked.player.stats.asChallenger.draw + ranked.player.stats.asOpponent.draw,
    lose: ranked.player.stats.asChallenger.lose + ranked.player.stats.asOpponent.lose,
    bestStreak: ranked.player.bestStreak,
    finalMoveSet: ranked.player.moveSet,
    moveRates: moveRatesFromDuels(state.duels, ranked.player.id),
  }));

  const record: SeasonRecord = {
    id: state.season.id,
    number: state.season.number,
    startedAt: state.season.startedAt,
    endedAt: now,
    rows,
    totalDuels: state.duels.length,
  };

  return { ...state, records: [...state.records, record], round: null };
}

/**
 * เปิดซีซั่นใหม่ — **ล้างชุดมูฟทุกคน** ให้มาตั้งใหม่ (ช่วงเวลา relax ตามที่เจ้าของเกมเคาะ)
 */
export function startNewSeason(state: GameState, now: number): GameState {
  const number = state.season.number + 1;
  return {
    ...state,
    season: { id: `SS${number}`, number, startedAt: now },
    players: state.players.map((player) => ({
      ...player,
      moveSet: null,
      pointerIndex: 0,
      mainScoreTenths: state.config.startScore * 10,
      subScore: 0,
      streak: 0,
      bestStreak: 0,
      stats: emptyStats(),
    })),
    duels: [],
    round: null,
    lastSeenAt: {},
  };
}
