// คำนวณคะแนน — ดู 01-game-design-spec.md §8
//
// ⚠️ คะแนนทั้งหมดในไฟล์นี้เป็น "หน่วย 0.1" (tenths) เป็นจำนวนเต็มเสมอ
// เหตุผล: 4 * 1.1 ใน JS = 4.4000000000000004 ถ้าปล่อยให้เป็นทศนิยมจริง คะแนนจะเพี้ยนสะสม
// สูตรสตรีคที่เรทเริ่มต้น (step 10%) ลงตัวเป็นจำนวนเต็มพอดีเสมอ: base × (10 + (n−1))
import type { DuelOutcome, GameConfig, OutcomeRates } from "./types";

/** ตัวคูณสตรีคเป็น % — ชนะติดครั้งที่ n → 100 + (n−1) × step */
export function streakPercent(streakAfterWin: number, config: GameConfig): number {
  const n = Math.max(1, streakAfterWin);
  return 100 + (n - 1) * config.streakStepPercent;
}

/** ตัวคูณแบบทศนิยม (ไว้แสดงผลบนจอเท่านั้น เช่น "110%") */
export function streakMultiplier(streakAfterWin: number, config: GameConfig): number {
  return streakPercent(streakAfterWin, config) / 100;
}

function ratesFor(outcome: DuelOutcome, rates: OutcomeRates): number {
  if (outcome === "win") return rates.win;
  if (outcome === "draw") return rates.draw;
  return rates.lose;
}

/**
 * คะแนนของผู้ท้าชิง — คนจ่ายเหรียญมาท้า (หน่วย 0.1)
 * @param streakAfterWin สตรีค "หลังจาก" บวกครั้งนี้แล้ว — ใช้เฉพาะตอนชนะ
 *
 * ตัวคูณสตรีคใช้กับ "คะแนนชนะ" เท่านั้น ไม่ใช้กับเสมอและไม่ใช้กับการหักคะแนนตอนแพ้
 */
export function challengerDeltaTenths(
  outcome: DuelOutcome,
  wasRandomPick: boolean,
  streakAfterWin: number,
  config: GameConfig,
): number {
  const rates = wasRandomPick ? config.randomRates : config.pickedRates;
  const base = ratesFor(outcome, rates);
  if (outcome !== "win") return base * 10;
  // base × 10 × percent / 100 = base × percent / 10 · ปัดเผื่อกรณีเจ้านายตั้ง step แปลกๆ
  return Math.round((base * streakPercent(streakAfterWin, config)) / 10);
}

/** คะแนนของคู่แข่ง — คนถูกท้า (หน่วย 0.1) — ไม่มีสตรีค */
export function opponentDeltaTenths(outcome: DuelOutcome, config: GameConfig): number {
  return ratesFor(outcome, config.opponentRates) * 10;
}

/** คะแนนดวลนอกรอบ (หน่วย 0.1) — เรทเบา ใช้กับทั้งสองฝ่าย ไม่มีสตรีค */
export function offRoundDeltaTenths(outcome: DuelOutcome, config: GameConfig): number {
  return ratesFor(outcome, config.offRoundRates) * 10;
}

/** คะแนนรองของดวลนอกรอบ — จำนวนเต็ม ใช้เรทเบาตรงๆ */
export function offRoundSubScore(outcome: DuelOutcome, config: GameConfig): number {
  return ratesFor(outcome, config.offRoundRates);
}

/** บวกคะแนนแล้วกันไม่ให้ต่ำกว่า 0 (พื้นคะแนนตาม spec §8.3) */
export function applyDelta(currentTenths: number, deltaTenths: number): number {
  return Math.max(0, currentTenths + deltaTenths);
}

/** สตรีคหลังจบการดวลในเกมหลัก — ชนะ +1 · ไม่ชนะกลับเป็น 0 */
export function nextStreak(current: number, outcome: DuelOutcome): number {
  return outcome === "win" ? current + 1 : 0;
}

/** แปลงหน่วย 0.1 เป็นข้อความบนจอ เช่น 44 → "4.4" */
export function formatTenths(tenths: number): string {
  const sign = tenths < 0 ? "-" : "";
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}`;
}

/** แปลงหน่วย 0.1 เป็นข้อความแบบมีเครื่องหมายหน้า เช่น 44 → "+4.4" */
export function formatDelta(tenths: number): string {
  if (tenths === 0) return "0.0";
  return tenths > 0 ? `+${formatTenths(tenths)}` : formatTenths(tenths);
}
