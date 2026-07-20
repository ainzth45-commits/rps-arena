// บันทึก/โหลดเกมลง localStorage
// บทเรียนจากเกมที่ 1: Safari private mode และโควตาเต็ม ทำให้เซฟไม่ได้ — ห้ามพังเงียบ ต้องบอกผู้ใช้
import type { GameConfig } from "../domain/types";
import { defaultConfig } from "../domain/types";
import { createInitialState, SAVE_VERSION, type GameState } from "./gameState";

const KEY = "rps-arena/save-v1";

export type LoadResult =
  | { kind: "fresh"; state: GameState }
  | { kind: "loaded"; state: GameState }
  | { kind: "recovered"; state: GameState; reason: string };

/** เติมค่า config ที่ขาดหาย (เซฟเก่าที่บันทึกก่อนมี field ใหม่) */
function mergeConfig(saved: unknown): GameConfig {
  if (typeof saved !== "object" || saved === null) return { ...defaultConfig };
  const partial = saved as Partial<GameConfig>;
  return {
    ...defaultConfig,
    ...partial,
    pickedRates: { ...defaultConfig.pickedRates, ...partial.pickedRates },
    randomRates: { ...defaultConfig.randomRates, ...partial.randomRates },
    challengerRates: { ...defaultConfig.challengerRates, ...partial.challengerRates },
    offRoundRates: { ...defaultConfig.offRoundRates, ...partial.offRoundRates },
  };
}

function looksLikeState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<GameState>;
  return Array.isArray(state.players) && Array.isArray(state.duels) && typeof state.season === "object";
}

/**
 * โหลดเซฟ — ไม่ว่าเจออะไรก็ต้องคืน state ที่เล่นได้เสมอ
 * เซฟพัง/อ่านไม่ได้ = เริ่มใหม่ แต่บอกเหตุผลให้ผู้ใช้รู้ ไม่หลอกว่าโหลดสำเร็จ
 */
export function loadState(now: number): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { kind: "recovered", state: createInitialState(now), reason: "อ่านที่เก็บข้อมูลของเบราว์เซอร์ไม่ได้" };
  }

  if (!raw) return { kind: "fresh", state: createInitialState(now) };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "recovered", state: createInitialState(now), reason: "ไฟล์เซฟเสียหาย อ่านไม่ออก" };
  }

  if (!looksLikeState(parsed)) {
    return { kind: "recovered", state: createInitialState(now), reason: "รูปแบบเซฟไม่ถูกต้อง" };
  }

  const state = parsed as GameState;
  return {
    kind: "loaded",
    state: {
      ...createInitialState(now),
      ...state,
      version: SAVE_VERSION,
      config: mergeConfig(state.config),
      records: state.records ?? [],
      lastSeenAt: state.lastSeenAt ?? {},
      round: state.round ?? null,
    },
  };
}

/** บันทึก — คืน null ถ้าสำเร็จ · คืนข้อความบอกสาเหตุถ้าไม่สำเร็จ (เอาไปขึ้นแถบเตือน) */
export function saveState(state: GameState): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return null;
  } catch (error) {
    // ⚠️ QuotaExceededError เป็น DOMException ซึ่ง **ไม่ได้สืบทอดจาก Error** ในเบราว์เซอร์
    // เช็คด้วย instanceof Error จะพลาดเสมอ ต้องอ่าน .name ตรงๆ
    const name = typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
    if (name === "QuotaExceededError") return "พื้นที่เก็บข้อมูลเต็ม — เกมยังเล่นต่อได้แต่จะไม่ถูกบันทึก";
    return "บันทึกเกมไม่ได้ (เบราว์เซอร์อาจอยู่ในโหมดส่วนตัว) — เกมยังเล่นต่อได้แต่จะไม่ถูกบันทึก";
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // เพิกเฉย — ลบไม่ได้ก็ไม่ได้ทำให้เกมพัง
  }
}
