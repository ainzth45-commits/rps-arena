import type { GameState } from "../state/gameState";
import { findPlayer } from "../state/gameState";
import { hasPlayed, rankPlayers, visibleMoveRates } from "../domain/rankingEngine";
import type { DuelOutcome, Move } from "../domain/types";

/**
 * "ภาพที่ TV ควรโชว์ตอนนี้" — เป็น projection ของ game state
 * ต้อง serializable ล้วน (ส่งผ่าน Supabase broadcast เป็น JSON) · ห้ามมี function/ref
 *
 * iPad สร้างจาก state แล้วยิงขึ้น TV · TV รับมาเรนเดอร์
 * ฟังก์ชันในไฟล์นี้บริสุทธิ์ทั้งหมด เทสได้โดยไม่ต้องมีเน็ต
 */

/** เรตมูฟย่อสำหรับโชว์บน TV (เฉพาะ top 3 ตามกติกาภาษีของแชมป์) */
export interface TvMoveRate {
  move: Move;
  percent: number;
}

/** 1 แถวในตารางอันดับบน TV */
export interface TvRankRow {
  playerId: string;
  rank: number;
  name: string;
  imageUrl: string;
  scoreTenths: number;
  streak: number;
  /** null = อันดับนี้ไม่เปิดเรตมูฟ (4+) · [] = เปิดแต่ยังไม่มีข้อมูล */
  rates: TvMoveRate[] | null;
}

/** ผู้ท้าชิงที่เพิ่งดวลเสร็จ — ให้ TV เล่นอนิเมชันไต่คะแนน/เลื่อนอันดับจากค่าก่อนดวล */
export interface TvRankFocus {
  playerId: string;
  fromRank: number;
  fromScoreTenths: number;
}

/** ฝั่งหนึ่งของการดวลที่โชว์บน TV */
export interface TvDuelSide {
  name: string;
  imageUrl: string;
  rank: number | null;
  win: number;
  lose: number;
  streak: number;
}

export type TvView =
  | { kind: "leaderboard"; seasonId: string; rows: TvRankRow[]; waiting: number; focus: TvRankFocus | null }
  | {
      kind: "versus";
      seasonId: string;
      left: TvDuelSide;
      right: TvDuelSide;
      headToHead: string;
      wasRandomPick: boolean;
      mode: "duel" | "offRound";
    }
  | {
      kind: "movePick";
      left: TvDuelSide;
      right: TvDuelSide;
      /** เวลาเส้นตาย (epoch ms) — TV นับถอยหลังเอง */
      deadline: number;
      picked: boolean;
      /** มูฟที่ผู้ท้าชิงเลือก (โชว์ไฮไลต์บน TV) — null = ยังไม่เลือก */
      pickedMove: Move | null;
      mode: "duel" | "offRound";
    }
  | { kind: "offRoundSecret" } // ดวลนอกรอบกำลังเลือกมูฟ — กันสปอยล์ ไม่ส่งข้อมูลมูฟ
  | {
      kind: "shoot";
      left: TvDuelSide & { move: Move };
      right: TvDuelSide & { move: Move };
      /** ผลจากมุมมองฝั่งซ้าย */
      outcome: DuelOutcome;
      mode: "duel" | "offRound";
    }
  | {
      kind: "result";
      left: TvDuelSide & { move: Move };
      right: TvDuelSide & { move: Move };
      outcome: DuelOutcome;
      leftDeltaTenths: number;
      rightDeltaTenths: number;
      streakAfter: number;
      mode: "duel" | "offRound";
    }
  | { kind: "seasonEnd"; seasonId: string; rows: TvRankRow[] }
  | { kind: "unpaired" };

const MAX_TV_RANKS = 10;

function rankMap(state: GameState): Map<string, number> {
  return new Map(rankPlayers(state.players.filter(hasPlayed)).map((row) => [row.player.id, row.rank]));
}

/** ตารางอันดับ (top 10) พร้อมเรตมูฟตามกติกา */
export function buildLeaderboard(
  state: GameState,
  focus: TvRankFocus | null = null,
): Extract<TvView, { kind: "leaderboard" }> {
  const ranked = rankPlayers(state.players.filter(hasPlayed)).slice(0, MAX_TV_RANKS);
  const rows: TvRankRow[] = ranked.map((row) => {
    const rates = visibleMoveRates(row.rank, row.player);
    return {
      playerId: row.player.id,
      rank: row.rank,
      name: row.player.name,
      imageUrl: row.player.imageUrl,
      scoreTenths: row.player.mainScoreTenths,
      streak: row.player.streak,
      rates: rates === null ? null : rates.map((rate) => ({ move: rate.move, percent: rate.percent })),
    };
  });
  const waiting = state.players.filter((player) => !hasPlayed(player)).length;
  // เล่นอนิเมชันเฉพาะเมื่อผู้ท้าชิงอยู่ในตารางที่โชว์จริง (top10) ไม่งั้นไม่มีแถวให้ไต่
  const shownFocus = focus && rows.some((row) => row.playerId === focus.playerId) ? focus : null;
  return { kind: "leaderboard", seasonId: state.season.id, rows, waiting, focus: shownFocus };
}

function sideOf(
  state: GameState,
  playerId: string,
  ranks: Map<string, number>,
  role: "challenger" | "opponent" = "challenger",
): TvDuelSide {
  const player = findPlayer(state, playerId);
  const record = role === "challenger" ? player?.stats.asChallenger : player?.stats.asOpponent;
  return {
    name: player?.name ?? "—",
    imageUrl: player?.imageUrl ?? "",
    rank: player ? ranks.get(playerId) ?? null : null,
    win: record?.win ?? 0,
    lose: record?.lose ?? 0,
    streak: role === "challenger" ? player?.streak ?? 0 : 0,
  };
}

/** ข้อความสถิติเจอกันของคู่นี้ (นับทั้งสองทิศทาง) */
export function headToHeadText(state: GameState, aId: string, bId: string): string {
  let mine = 0;
  let theirs = 0;
  let draws = 0;
  for (const duel of state.duels) {
    const aIsChallenger = duel.challengerId === aId && duel.opponentId === bId;
    const bIsChallenger = duel.challengerId === bId && duel.opponentId === aId;
    if (!aIsChallenger && !bIsChallenger) continue;
    if (duel.challengerOutcome === "draw") draws += 1;
    else if (aIsChallenger ? duel.challengerOutcome === "win" : duel.challengerOutcome === "lose") mine += 1;
    else theirs += 1;
  }
  const total = mine + theirs + draws;
  const a = findPlayer(state, aId)?.name ?? "ซ้าย";
  const b = findPlayer(state, bId)?.name ?? "ขวา";
  if (total === 0) return "เจอกันครั้งแรก!";
  if (mine === theirs) return `เคยเจอกัน ${total} ครั้ง · สูสี ${mine}–${theirs}`;
  return mine > theirs
    ? `เคยเจอกัน ${total} ครั้ง · ${a} นำ ${mine}–${theirs}`
    : `เคยเจอกัน ${total} ครั้ง · ${b} นำ ${theirs}–${mine}`;
}

function invert(outcome: DuelOutcome): DuelOutcome {
  if (outcome === "win") return "lose";
  if (outcome === "lose") return "win";
  return "draw";
}

/** ฉากปะทะ VS ในเกมหลัก */
export function buildVersus(
  state: GameState,
  challengerId: string,
  opponentId: string,
  wasRandomPick: boolean,
): Extract<TvView, { kind: "versus" }> {
  const ranks = rankMap(state);
  return {
    kind: "versus",
    seasonId: state.season.id,
    left: sideOf(state, challengerId, ranks, "challenger"),
    right: sideOf(state, opponentId, ranks, "opponent"),
    headToHead: headToHeadText(state, challengerId, opponentId),
    wasRandomPick,
    mode: "duel",
  };
}

/** หน้าเลือกมูฟ — ส่งเส้นตายให้ TV นับเอง · ไม่บอกว่าเลือกมูฟอะไร */
export function buildMovePick(
  state: GameState,
  challengerId: string,
  opponentId: string,
  deadline: number,
  pickedMove: Move | null,
): Extract<TvView, { kind: "movePick" }> {
  const ranks = rankMap(state);
  return {
    kind: "movePick",
    left: sideOf(state, challengerId, ranks, "challenger"),
    right: sideOf(state, opponentId, ranks, "opponent"),
    deadline,
    picked: pickedMove !== null,
    pickedMove,
    mode: "duel",
  };
}

/** ฉากเป่ายิ้งฉุบ — เปิดมูฟทั้งสองฝั่ง */
export function buildShoot(
  state: GameState,
  challengerId: string,
  opponentId: string,
  challengerMove: Move,
  opponentMove: Move,
  outcome: DuelOutcome,
  mode: "duel" | "offRound" = "duel",
): Extract<TvView, { kind: "shoot" }> {
  const ranks = rankMap(state);
  return {
    kind: "shoot",
    left: { ...sideOf(state, challengerId, ranks, "challenger"), move: challengerMove },
    right: { ...sideOf(state, opponentId, ranks, mode === "offRound" ? "challenger" : "opponent"), move: opponentMove },
    outcome,
    mode,
  };
}

/** จอผลจาก DuelRecord ล่าสุด (ทั้งเกมหลักและดวลนอกรอบ) */
export function buildResult(
  state: GameState,
  duel: {
    challengerId: string;
    opponentId: string;
    challengerMove: Move;
    opponentMove: Move;
    challengerOutcome: DuelOutcome;
    challengerDeltaTenths: number;
    opponentDeltaTenths: number;
    streakAfter: number;
    mode: "main" | "offRound";
  },
): Extract<TvView, { kind: "result" }> {
  const ranks = rankMap(state);
  return {
    kind: "result",
    left: { ...sideOf(state, duel.challengerId, ranks, "challenger"), move: duel.challengerMove },
    right: { ...sideOf(state, duel.opponentId, ranks, duel.mode === "offRound" ? "challenger" : "opponent"), move: duel.opponentMove },
    outcome: duel.challengerOutcome,
    leftDeltaTenths: duel.challengerDeltaTenths,
    rightDeltaTenths: duel.opponentDeltaTenths,
    streakAfter: duel.streakAfter,
    mode: duel.mode === "offRound" ? "offRound" : "duel",
  };
}

/** ประกาศแชมป์ปิดซีซั่น */
export function buildSeasonEnd(state: GameState): Extract<TvView, { kind: "seasonEnd" }> {
  const board = buildLeaderboard(state);
  return { kind: "seasonEnd", seasonId: state.season.id, rows: board.rows.slice(0, 3) };
}

export const offRoundSecretView: Extract<TvView, { kind: "offRoundSecret" }> = { kind: "offRoundSecret" };
export const unpairedView: Extract<TvView, { kind: "unpaired" }> = { kind: "unpaired" };

// historyFor ถูก re-export เผื่อใช้คำนวณ head-to-head ที่อื่น (กัน tree-shake ตัดทิ้ง)
export { invert };
