import { ROOM_PREFIX } from "./supabaseConfig";

/**
 * รหัสห้องเชื่อม iPad↔TV — ตัวเลข 4 หลัก (เหมือน PIN ของ Kahoot)
 * TV โชว์เป็น "ARENA-4821" เพื่ออ่านง่าย · iPad พิมพ์แค่ 4821
 */

const CODE_LENGTH = 4;

/** สุ่มรหัส 4 หลัก (0000–9999) — รับ rng ได้เพื่อให้เทสคุมค่าได้ */
export function makeRoomCode(rng: () => number = Math.random): string {
  const n = Math.floor(rng() * 10 ** CODE_LENGTH);
  return String(n).padStart(CODE_LENGTH, "0");
}

/**
 * ทำความสะอาด input ที่ผู้ใช้พิมพ์ให้เหลือรหัส 4 หลัก
 * รับได้ทั้ง "4821", " 4821 ", "ARENA-4821", "arena-4821", "arena 4821"
 * คืน null ถ้าไม่ครบ 4 หลัก
 */
export function normalizeRoomCode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== CODE_LENGTH) return null;
  return digits;
}

/** true ถ้าเป็นรหัสถูกต้อง (4 หลักพอดี) */
export function isValidRoomCode(input: string): boolean {
  return normalizeRoomCode(input) !== null;
}

/** รหัส 4 หลัก → ชื่อ channel ของ Supabase */
export function roomChannel(code: string): string {
  return `${ROOM_PREFIX}${code}`;
}

/** รหัส 4 หลัก → ข้อความโชว์บนจอ TV */
export function displayRoomCode(code: string): string {
  return `ARENA-${code}`;
}
