// จัดอันดับ + "ภาษีของแชมป์" (เปิดเรตมูฟท็อป 3) — ดู 01-game-design-spec.md §9 และ §12
import { ALL_MOVES, type Move, type Player } from "./types";

export interface RankedPlayer {
  player: Player;
  /** เลขอันดับที่แสดงบนกระดาน — อันดับร่วมแบบกีฬา (1,1,3) */
  rank: number;
  /** เกณฑ์ชั้น 3: ชนะรวมทุกบทบาท − แพ้รวมทุกบทบาท (เสมอไม่นับ) */
  winMinusLose: number;
  /** เกณฑ์ชั้น 4: จำนวนครั้งที่ลงเป็นผู้เล่นในเกมหลัก */
  mainDuelsAsPlayer: number;
}

export function winMinusLose(player: Player): number {
  const { asPlayer, asChallenger } = player.stats;
  return asPlayer.win + asChallenger.win - (asPlayer.lose + asChallenger.lose);
}

/** เคยลงแข่งอย่างน้อย 1 ครั้ง (บทบาทใดก็ได้) — คนที่ยังไม่แข่งไม่ต้องอยู่ในตารางอันดับ */
export function hasPlayed(player: Player): boolean {
  const { asPlayer, asChallenger } = player.stats;
  return asPlayer.win + asPlayer.draw + asPlayer.lose + asChallenger.win + asChallenger.draw + asChallenger.lose > 0;
}

/**
 * เรียงอันดับตามเกณฑ์ 4 ชั้น:
 *   1. คะแนนหลัก  2. คะแนนรอง  3. ชนะ−แพ้  4. จำนวนครั้งที่เป็นผู้เล่น
 * เท่ากันหมด = อันดับร่วมจริง (คนถัดไปข้ามเลขอันดับ แบบกีฬา)
 */
export function rankPlayers(players: readonly Player[]): RankedPlayer[] {
  const rows = players.map((player) => ({
    player,
    rank: 0,
    winMinusLose: winMinusLose(player),
    mainDuelsAsPlayer: player.stats.asPlayer.mainDuels,
  }));

  rows.sort((a, b) => {
    if (a.player.mainScoreTenths !== b.player.mainScoreTenths) return b.player.mainScoreTenths - a.player.mainScoreTenths;
    if (a.player.subScore !== b.player.subScore) return b.player.subScore - a.player.subScore;
    if (a.winMinusLose !== b.winMinusLose) return b.winMinusLose - a.winMinusLose;
    return b.mainDuelsAsPlayer - a.mainDuelsAsPlayer;
  });

  let lastRank = 0;
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    const tiedWithPrevious =
      previous !== undefined &&
      previous.player.mainScoreTenths === row.player.mainScoreTenths &&
      previous.player.subScore === row.player.subScore &&
      previous.winMinusLose === row.winMinusLose &&
      previous.mainDuelsAsPlayer === row.mainDuelsAsPlayer;

    // เสมอกับคนก่อนหน้า = ใช้เลขอันดับเดิม · ไม่เสมอ = ใช้ลำดับจริง (จึงข้ามเลขได้ เช่น 1,1,3)
    lastRank = tiedWithPrevious ? lastRank : index + 1;
    row.rank = lastRank;
  });

  return rows;
}

export interface MoveRate {
  move: Move;
  count: number;
  /** % ของจำนวนครั้งที่ออกมูฟทั้งหมด ปัดเป็นจำนวนเต็ม */
  percent: number;
}

/** เรตการออกมูฟทั้ง 3 เรียงจากมากไปน้อย — คืนอาเรย์ว่างถ้ายังไม่เคยออกมูฟเลย */
export function moveRates(player: Player): MoveRate[] {
  const counts = player.stats.moveCount;
  const total = ALL_MOVES.reduce((sum, move) => sum + counts[move], 0);
  if (total === 0) return [];
  return ALL_MOVES.map((move) => ({
    move,
    count: counts[move],
    percent: Math.round((counts[move] / total) * 100),
  })).sort((a, b) => b.count - a.count);
}

/** จำนวนครั้งที่ออกมูฟทั้งหมดในซีซั่น (ฐานของ %) */
export function totalMoveCount(player: Player): number {
  return ALL_MOVES.reduce((sum, move) => sum + player.stats.moveCount[move], 0);
}

/**
 * "ภาษีของแชมป์" — อันดับ 1 เปิดครบ 3 มูฟ · อันดับ 2 และ 3 เปิดเฉพาะมูฟที่ออกบ่อยที่สุด
 * (มูฟสูงสุดเท่ากันหลายอัน → เปิดทั้งหมด)
 * คืน null ถ้าอันดับนั้นไม่ต้องเปิดอะไร · คืน [] ถ้าต้องเปิดแต่ยังไม่มีข้อมูล
 */
export function visibleMoveRates(rank: number, player: Player): MoveRate[] | null {
  if (rank > 3) return null;
  const rates = moveRates(player);
  if (rank === 1 || rates.length === 0) return rates;
  const top = rates[0].count;
  return rates.filter((rate) => rate.count === top);
}
