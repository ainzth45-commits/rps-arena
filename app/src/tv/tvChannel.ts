import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabaseConfig";
import { roomChannel } from "./roomCode";
import type { TvView } from "./tvView";

/**
 * ชั้นเชื่อม Supabase Realtime สำหรับสตรีม iPad↔TV
 *
 * 🔴 หลักการรากฐาน: **best-effort ทั้งหมด** — ถ้าเน็ตล่ม/Supabase ใช้ไม่ได้
 * ทุกฟังก์ชันต้องเงียบ (try/catch) ไม่ throw ไม่ทำให้เกมค้าง
 *
 * iPad ใช้ `createBroadcaster` (ส่ง TvView + ตอบ snapshot เมื่อ TV เข้าห้อง)
 * TV ใช้ `createReceiver` (รับ TvView + บอกว่าตัวเองเข้าห้องผ่าน presence)
 */

const EVENT = "view";
const REQUEST_SNAPSHOT = "want-snapshot";

let sharedClient: SupabaseClient | null = null;
let clientUnavailable = false;

function client(): SupabaseClient | null {
  if (clientUnavailable) return null;
  if (sharedClient) return sharedClient;
  try {
    sharedClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
    return sharedClient;
  } catch {
    clientUnavailable = true;
    return null;
  }
}

export interface Broadcaster {
  /** ส่งภาพปัจจุบันขึ้น TV (เงียบถ้าส่งไม่ได้) */
  send(view: TvView): void;
  /** ตัดการเชื่อม */
  close(): void;
  /** true ถ้าเชื่อม channel สำเร็จ */
  isConnected(): boolean;
}

/**
 * ฝั่ง iPad — เปิดห้องแล้วรอส่ง TvView
 * @param getSnapshot ให้ view ล่าสุดกลับไป เมื่อ TV เพิ่งเข้าห้อง (ขอ snapshot)
 */
export function createBroadcaster(code: string, getSnapshot: () => TvView | null): Broadcaster {
  let channel: RealtimeChannel | null = null;
  let connected = false;
  let last: TvView | null = null;

  try {
    const supa = client();
    if (supa) {
      channel = supa.channel(roomChannel(code), { config: { broadcast: { ack: false } } });
      // TV ขอ snapshot (เพิ่งเข้าห้อง / รีเฟรช) → ส่ง view ล่าสุดให้
      channel.on("broadcast", { event: REQUEST_SNAPSHOT }, () => {
        const snap = getSnapshot() ?? last;
        if (snap) safeSend(channel, snap);
      });
      channel.subscribe((status) => {
        connected = status === "SUBSCRIBED";
      });
    }
  } catch {
    channel = null;
  }

  function safeSend(ch: RealtimeChannel | null, view: TvView): void {
    if (!ch) return;
    try {
      void ch.send({ type: "broadcast", event: EVENT, payload: view });
    } catch {
      // เงียบ — สตรีมพังห้ามทำเกมสะดุด
    }
  }

  return {
    send(view) {
      last = view;
      safeSend(channel, view);
    },
    close() {
      try {
        channel?.unsubscribe();
      } catch {
        // ignore
      }
      channel = null;
      connected = false;
    },
    isConnected: () => connected,
  };
}

export interface Receiver {
  close(): void;
  isConnected(): boolean;
}

/**
 * ฝั่ง TV — เข้าห้องแล้วรับ TvView
 * @param onView เรียกทุกครั้งที่ได้ view ใหม่
 * @param onConnectionChange แจ้งสถานะเชื่อม (true/false)
 */
export function createReceiver(
  code: string,
  onView: (view: TvView) => void,
  onConnectionChange?: (connected: boolean) => void,
): Receiver {
  let channel: RealtimeChannel | null = null;
  let connected = false;

  try {
    const supa = client();
    if (supa) {
      channel = supa.channel(roomChannel(code), { config: { broadcast: { ack: false } } });
      channel.on("broadcast", { event: EVENT }, (message) => {
        try {
          onView(message.payload as TvView);
        } catch {
          // view พังก็ข้ามไป
        }
      });
      channel.subscribe((status) => {
        connected = status === "SUBSCRIBED";
        onConnectionChange?.(connected);
        // เพิ่งเข้าห้องสำเร็จ → ขอ snapshot จาก iPad ทันที (broadcast ไม่เก็บย้อนหลัง)
        if (connected) requestSnapshot(channel);
      });
    }
  } catch {
    channel = null;
  }

  function requestSnapshot(ch: RealtimeChannel | null): void {
    if (!ch) return;
    try {
      void ch.send({ type: "broadcast", event: REQUEST_SNAPSHOT, payload: {} });
    } catch {
      // ignore
    }
  }

  return {
    close() {
      try {
        channel?.unsubscribe();
      } catch {
        // ignore
      }
      channel = null;
      connected = false;
    },
    isConnected: () => connected,
  };
}
