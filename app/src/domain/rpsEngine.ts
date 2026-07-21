// ตรรกะเป่ายิ้งฉุบล้วนๆ + ตัวชี้ชุดมูฟ — ฟังก์ชันบริสุทธิ์ทั้งหมด ไม่แตะ state ไม่แตะ React
import { ALL_MOVES, type DuelOutcome, type Move, type MoveSet, type PointerIndex } from "./types";

/** มูฟไหนชนะมูฟไหน — key ชนะ value */
const BEATS: Record<Move, Move> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

/** ผลจากมุมมองของ challengerMove */
export function resolveDuel(challengerMove: Move, opponentMove: Move): DuelOutcome {
  if (challengerMove === opponentMove) return "draw";
  return BEATS[challengerMove] === opponentMove ? "win" : "lose";
}

/** ตัวชี้เดินไป 1 ช่อง แล้ววนกลับช่องแรก (0→1→2→0) */
export function nextPointer(index: PointerIndex): PointerIndex {
  return ((index + 1) % 3) as PointerIndex;
}

/** มูฟที่คู่แข่งจะออกในครั้งนี้ */
export function moveAtPointer(moveSet: MoveSet, pointerIndex: PointerIndex): Move {
  return moveSet[pointerIndex];
}

/**
 * สุ่มมูฟ — ใช้ตอนผู้เล่นเลือกไม่ทัน 30 วิ
 * รับ rng เข้ามาเพื่อให้เทสได้ (ค่า default = Math.random)
 */
export function randomMove(rng: () => number = Math.random): Move {
  const index = Math.min(ALL_MOVES.length - 1, Math.floor(rng() * ALL_MOVES.length));
  return ALL_MOVES[index];
}

/**
 * สุ่มคู่แข่งจากรายการที่ลงสังเวียนแล้ว
 * ผู้เรียกต้องกรองตัวเองออกมาก่อน (หน้าเลือกคู่แข่งไม่แสดงตัวเองอยู่แล้ว)
 * คืน null ถ้าไม่มีใครให้สุ่ม
 */
export function randomOpponentId(candidateIds: readonly string[], rng: () => number = Math.random): string | null {
  if (candidateIds.length === 0) return null;
  const index = Math.min(candidateIds.length - 1, Math.floor(rng() * candidateIds.length));
  return candidateIds[index];
}
