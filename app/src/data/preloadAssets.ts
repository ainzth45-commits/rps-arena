import { gameAssets } from "./assets";

// โหลดรูปทั้งเกมไว้เบื้องหลังตั้งแต่เปิดแอป — เข้าหน้าไหนรูปก็พร้อมทันที ไม่ต้องรอโหลดกลางเกม
// (ยกมาจากเกมที่ 1 ที่พิสูจน์แล้วว่าใช้ได้จริงบน iPad)
//
// ไล่ทีละชุด จำกัดพร้อมกัน 4 รูป กันแย่งแบนด์วิดท์กับหน้าที่กำลังแสดงอยู่
// หน้าโลโก้ (BootScene) ใช้ progress จากที่นี่กั้นไม่ให้เข้าเกมก่อนรูปครบ
let started = false;
let lanesRunning = false;
let delayTimerId: number | null = null;
const queue: string[] = [];
let total = 0;
let loadedCount = 0;
const listeners = new Set<() => void>();

export function preloadAllGameAssets(): void {
  if (started) return; // กันเรียกซ้ำ (StrictMode/re-render)
  started = true;

  // รูปผู้เล่นไม่ preload — เป็น data URL/ลิงก์ที่ลงทะเบียนเองในเครื่อง โหลดตรงจาก state
  queue.push(...new Set(Object.values(gameAssets)));
  total = queue.length;

  // เริ่มหลังปล่อยให้หน้าโลโก้วาดเสร็จก่อน แล้วค่อยลากที่เหลือเข้ามาเงียบๆ
  delayTimerId = window.setTimeout(startLanes, 600);
}

/** ผู้เล่นกดโลโก้แล้วต้องรอ — ข้าม delay ปล่อยเลนโหลดทันที */
export function boostPreload(): void {
  if (!started) preloadAllGameAssets();
  startLanes();
}

export function getPreloadProgress(): { loaded: number; total: number } {
  return { loaded: loadedCount, total };
}

export function subscribePreload(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function startLanes(): void {
  if (lanesRunning) return;
  lanesRunning = true;
  if (delayTimerId !== null) {
    window.clearTimeout(delayTimerId);
    delayTimerId = null;
  }
  for (let lane = 0; lane < 4; lane += 1) loadNext();
}

function loadNext(): void {
  const url = queue.shift();
  if (!url) return;
  const img = new Image();
  img.decoding = "async";
  // นับต่อไม่ว่าสำเร็จหรือพัง — progress ต้องถึง 100% เสมอ ห้ามค้างเพราะรูปใดรูปหนึ่งโหลดไม่ขึ้น
  const done = () => {
    loadedCount += 1;
    for (const listener of listeners) listener();
    loadNext();
  };
  img.onload = done;
  img.onerror = done;
  img.src = url;
}
