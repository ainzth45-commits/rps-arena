// action ทั้งหมดของเกม — reducer บริสุทธิ์ (state, payload) => state ใหม่
// ทุกฟังก์ชันรับ `now` เข้ามาเพื่อให้เทสได้ ไม่เรียก Date.now() เอง
import { rankPlayers } from "../domain/rankingEngine";
import { moveAtPointer, nextPointer, resolveDuel } from "../domain/rpsEngine";
import {
  applyDelta,
  challengerDeltaTenths,
  nextStreak,
  offRoundDeltaTenths,
  offRoundSubScore,
  playerDeltaTenths,
} from "../domain/scoreEngine";
import type { DuelOutcome, Move, MoveSet, Player } from "../domain/types";
import { emptyStats } from "../domain/types";
import {
  createPlayer,
  findPlayer,
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
      asPlayer: { ...player.stats.asPlayer },
      asChallenger: { ...player.stats.asChallenger },
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
  if (state.round?.playerId === id) return "คนนี้กำลังอยู่ในรอบที่เปิดค้าง — จบรอบก่อน";
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
  return { ...state, round: { playerId, startedAt: now, duelDone: false, moveSetConfirmed: false } };
}

/** จบรอบ + จำเวลาที่คนนี้เข้ามาล่าสุด (ใช้คำนวณจอ "ระหว่างที่คุณไม่อยู่" รอบหน้า) */
export function endRound(state: GameState, now: number): GameState {
  if (!state.round) return state;
  return {
    ...state,
    round: null,
    lastSeenAt: { ...state.lastSeenAt, [state.round.playerId]: now },
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
    if (!state.round || state.round.playerId !== playerId) throw new Error("ต้องอยู่ในรอบของตัวเองก่อน");
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
  if (!state.round || state.round.playerId !== playerId) return "ต้องเปิดรอบก่อน";
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
 * ดวลในเกมหลัก — ลำดับการคำนวณตาม spec §8.4 เป๊ะ
 */
export function performDuel(
  state: GameState,
  args: { playerId: string; challengerId: string; wasRandomPick: boolean; playerMove: Move; now: number },
): DuelResult {
  const { playerId, challengerId, wasRandomPick, playerMove, now } = args;
  const blocked = duelBlockedReason(state, playerId);
  if (blocked) throw new Error(blocked);
  if (playerId === challengerId) throw new Error("ท้าตัวเองไม่ได้");

  const player = clonePlayer(findPlayer(state, playerId)!);
  const challenger = clonePlayer(findPlayer(state, challengerId)!);
  if (!challenger.moveSet) throw new Error("คนนี้ยังไม่ลงสังเวียน");

  // 1. ตัดสินผล
  const challengerMove = moveAtPointer(challenger.moveSet, challenger.pointerIndex);
  const playerOutcome = resolveDuel(playerMove, challengerMove);
  const challengerOutcome = invert(playerOutcome);

  // 2. สตรีคเดินก่อน แล้วค่อยเอาไปคูณ
  const streakAfter = nextStreak(player.streak, playerOutcome);
  player.streak = streakAfter;
  player.bestStreak = Math.max(player.bestStreak, streakAfter);

  // 3-4. คะแนนสองฝั่ง + พื้นที่ 0
  const playerDelta = playerDeltaTenths(playerOutcome, wasRandomPick, streakAfter, state.config);
  const challengerDelta = challengerDeltaTenths(challengerOutcome, state.config);
  player.mainScoreTenths = applyDelta(player.mainScoreTenths, playerDelta);
  challenger.mainScoreTenths = applyDelta(challenger.mainScoreTenths, challengerDelta);

  // 5. สถิติ + เรตมูฟ
  bumpRole(player.stats.asPlayer, playerOutcome);
  player.stats.asPlayer.mainDuels += 1;
  player.stats.moveCount[playerMove] += 1;
  bumpRole(challenger.stats.asChallenger, challengerOutcome);
  challenger.stats.moveCount[challengerMove] += 1;

  // 7. ตัวชี้ของผู้ท้าชิงเดิน 1 ช่อง
  challenger.pointerIndex = nextPointer(challenger.pointerIndex);

  const duel: DuelRecord = {
    id: `${now}-${playerId}-${challengerId}`,
    at: now,
    mode: "main",
    playerId,
    playerName: player.name,
    challengerId,
    challengerName: challenger.name,
    wasRandomPick,
    playerMove,
    challengerMove,
    playerOutcome,
    playerDeltaTenths: playerDelta,
    challengerDeltaTenths: challengerDelta,
    playerSubDelta: 0,
    challengerSubDelta: 0,
    streakAfter,
  };

  const players = state.players.map((row) => {
    if (row.id === playerId) return player;
    if (row.id === challengerId) return challenger;
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
  const b = clonePlayer(findPlayer(state, bId) ?? (() => { throw new Error("ไม่พบผู้เล่น"); })());

  const aOutcome = resolveDuel(aMove, bMove);
  const bOutcome = invert(aOutcome);

  let aDelta = 0;
  let bDelta = 0;
  let aSub = 0;
  let bSub = 0;

  if (save === "main") {
    aDelta = offRoundDeltaTenths(aOutcome, state.config);
    bDelta = offRoundDeltaTenths(bOutcome, state.config);
    a.mainScoreTenths = applyDelta(a.mainScoreTenths, aDelta);
    b.mainScoreTenths = applyDelta(b.mainScoreTenths, bDelta);
    // นับสถิติแพ้ชนะ + เรตมูฟ แต่ **ไม่นับ mainDuels** (ไม่ให้ไต่อันดับชั้น 4 ด้วยโหมดนี้)
    bumpRole(a.stats.asPlayer, aOutcome);
    bumpRole(b.stats.asPlayer, bOutcome);
    a.stats.moveCount[aMove] += 1;
    b.stats.moveCount[bMove] += 1;
  } else if (save === "sub") {
    aSub = offRoundSubScore(aOutcome, state.config);
    bSub = offRoundSubScore(bOutcome, state.config);
    a.subScore += aSub;
    b.subScore += bSub;
  }

  const duel: DuelRecord = {
    id: `${now}-off-${aId}-${bId}`,
    at: now,
    mode: "offRound",
    playerId: aId,
    playerName: a.name,
    challengerId: bId,
    challengerName: b.name,
    wasRandomPick: false,
    playerMove: aMove,
    challengerMove: bMove,
    playerOutcome: aOutcome,
    playerDeltaTenths: aDelta,
    challengerDeltaTenths: bDelta,
    playerSubDelta: aSub,
    challengerSubDelta: bSub,
    streakAfter: a.streak, // ไม่เปลี่ยน — บันทึกค่าเดิมไว้เฉยๆ
    offRoundSave: save,
  };

  const players = state.players.map((row) => {
    if (row.id === aId) return a;
    if (row.id === bId) return b;
    return row;
  });

  return {
    state: { ...state, players, duels: save === "none" ? state.duels : [...state.duels, duel] },
    duel,
  };
}

// ─── ซีซั่น ────────────────────────────────────────────────────────────────

export function endSeason(state: GameState, now: number): GameState {
  const rows: SeasonRecordRow[] = rankPlayers(state.players).map((ranked) => ({
    rank: ranked.rank,
    playerId: ranked.player.id,
    name: ranked.player.name,
    imageUrl: ranked.player.imageUrl,
    mainScoreTenths: ranked.player.mainScoreTenths,
    subScore: ranked.player.subScore,
    win: ranked.player.stats.asPlayer.win + ranked.player.stats.asChallenger.win,
    draw: ranked.player.stats.asPlayer.draw + ranked.player.stats.asChallenger.draw,
    lose: ranked.player.stats.asPlayer.lose + ranked.player.stats.asChallenger.lose,
    bestStreak: ranked.player.bestStreak,
    finalMoveSet: ranked.player.moveSet,
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
