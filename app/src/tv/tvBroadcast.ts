import { createBroadcaster, type Broadcaster } from "./tvChannel";
import { unpairedView, type TvView } from "./tvView";

/**
 * ตัวจัดการการเชื่อม TV ฝั่ง iPad (singleton)
 * ให้ทั้ง App และ flow ย่อย (ดวลนอกรอบ) เรียก sendTvView ร่วมกันได้ โดยไม่ต้อง prop-drill
 *
 * 🔴 best-effort ทั้งหมด — ไม่เชื่อม/เน็ตล่ม ก็เงียบ เกมเดินต่อปกติ
 */

const PAIR_KEY = "rps-arena/tv-paired-code";

let broadcaster: Broadcaster | null = null;
let pairedCode: string | null = null;
/** ความดัง TV ล่าสุด — re-apply ทุกครั้งที่สร้าง broadcaster ใหม่ (reconnect) */
let lastVolume: number | null = null;
/** App ลงทะเบียนไว้ — คืน view ล่าสุดให้ส่งตอน TV เพิ่งเข้าห้อง */
let snapshotProvider: (() => TvView | null) | null = null;
const listeners = new Set<(connected: boolean) => void>();

function notify(): void {
  const connected = isTvConnected();
  for (const listener of listeners) listener(connected);
}

export function getPairedCode(): string | null {
  if (pairedCode) return pairedCode;
  try {
    pairedCode = localStorage.getItem(PAIR_KEY);
  } catch {
    pairedCode = null;
  }
  return pairedCode;
}

export function setSnapshotProvider(fn: (() => TvView | null) | null): void {
  snapshotProvider = fn;
}

/** เชื่อมห้องตามรหัส (จำไว้ใน localStorage) — ปิดของเก่าก่อน */
export function connectTv(code: string): void {
  disconnectTv(false);
  pairedCode = code;
  try {
    localStorage.setItem(PAIR_KEY, code);
  } catch {
    // จำไม่ได้ก็ยังเชื่อมในรอบนี้ได้
  }
  broadcaster = createBroadcaster(code, () => snapshotProvider?.() ?? null);
  // broadcaster ใหม่ยังไม่รู้ความดังที่ตั้งไว้ → ยัดค่าล่าสุดให้ทันที
  if (lastVolume !== null) {
    try {
      broadcaster.setVolume(lastVolume);
    } catch {
      // best-effort
    }
  }
  // แจ้งสถานะหลัง subscribe เสร็จ (เผื่อเวลา)
  window.setTimeout(notify, 400);
  window.setTimeout(notify, 1500);
}

/** เชื่อมอัตโนมัติจากรหัสที่จำไว้ (เรียกตอนเปิดเกม) */
export function autoConnectTv(): void {
  const code = getPairedCode();
  if (code && !broadcaster) connectTv(code);
}

export function disconnectTv(clearMemory = true): void {
  // บอก TV ว่าเลิกเชื่อมแล้ว → TV กลับไปหน้าจับคู่
  // ส่ง unpaired หลายครั้ง แล้วค่อยปิด channel (บนเน็ตจริง send เป็น async ต้องให้ flush ก่อน)
  const closing = broadcaster;
  try {
    closing?.send(unpairedView);
    window.setTimeout(() => closing?.send(unpairedView), 150);
  } catch {
    // ignore
  }
  window.setTimeout(() => {
    try {
      closing?.close();
    } catch {
      // ignore
    }
  }, 600);
  broadcaster = null;
  if (clearMemory) {
    pairedCode = null;
    try {
      localStorage.removeItem(PAIR_KEY);
    } catch {
      // ignore
    }
  }
  notify();
}

/** ส่ง view ขึ้น TV (เงียบถ้าไม่ได้เชื่อม/ส่งไม่ได้) */
export function sendTvView(view: TvView): void {
  try {
    broadcaster?.send(view);
  } catch {
    // best-effort
  }
}

/** ตั้งความดังเสียงบนจอ TV (0–1) — จำค่าไว้ re-apply ตอน reconnect ด้วย */
export function sendTvVolume(v: number): void {
  lastVolume = v;
  try {
    broadcaster?.setVolume(v);
  } catch {
    // best-effort
  }
}

export function isTvConnected(): boolean {
  return broadcaster?.isConnected() ?? false;
}

export function isTvPaired(): boolean {
  return getPairedCode() !== null;
}

export function subscribeTvStatus(listener: (connected: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
