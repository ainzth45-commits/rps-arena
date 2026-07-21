import { gameAssets } from "./assets";

/**
 * พื้นหลังของแต่ละหน้า — **แหล่งความจริงที่เดียว**
 *
 * กฎ: 1 หน้า = พื้นหลังใบเดียว วาดที่ html canvas ชั้นเดียวเท่านั้น
 * (เคยพลาดมาแล้ว: วาง bg-arena ที่ html + วางพื้นหลังห้องซ้อนในฉาก + วางภาพผลซ้อนอีกชั้น
 *  กลายเป็น 3 ชั้นทับกันจนมั่ว อ่านไม่ออกว่าอยู่ห้องไหน)
 */
export interface Backdrop {
  image: string;
  /** ความมืดที่คลุมทับ (0–1) — ยิ่งเนื้อหาบนจอเยอะ ยิ่งต้องมืด */
  dim: number;
}

const ARENA: Backdrop = { image: gameAssets.bgArena, dim: 0.58 };

/** phase → พื้นหลัง · หน้าไหนไม่ระบุ = ใช้อารีน่ากลาง */
const BY_PHASE: Record<string, Backdrop> = {
  boot: { image: gameAssets.bgArena, dim: 0.72 },
  moveSet: { image: gameAssets.bgMoveSet, dim: 0.5 },
  enrollMoveSet: { image: gameAssets.bgMoveSet, dim: 0.5 },
  movePick: { image: gameAssets.bgPrep, dim: 0.58 },
  // ฉาก VS วาดเวทีเองจากสองซีก — พื้นหลังชั้นนี้เป็นแค่ฉากมืดรองรับตอนซีกยังพุ่งไม่ถึง
  versus: { image: gameAssets.bgVersus, dim: 0.82 },
  shoot: { image: gameAssets.bgPrep, dim: 0.42 },
  duelResult: { image: gameAssets.bgResult, dim: 0.5 },
  seasonEnd: { image: gameAssets.seasonPodium, dim: 0.52 },
  tutorial: { image: gameAssets.bgMoveSet, dim: 0.62 },
};

export function backdropFor(phase: string): Backdrop {
  return BY_PHASE[phase] ?? ARENA;
}
