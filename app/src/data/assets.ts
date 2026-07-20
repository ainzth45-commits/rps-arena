// ที่อยู่ของไฟล์ภาพทั้งหมด — รวมไว้จุดเดียว เวลาได้ asset ใหม่จาก Codex แก้ที่นี่ที่เดียว
// `?v=N` ใช้ล้าง cache ตอนเปลี่ยนรูป (บทเรียนเกมที่ 1: iPad ชอบจำรูปเก่า)
const BASE = import.meta.env.BASE_URL;
const V = "2";

function asset(path: string): string {
  return `${BASE}assets/${path}?v=${V}`;
}

export const gameAssets = {
  logo: asset("logo.png"),
  homeTitle: asset("home-title.png"),
  bgArena: asset("bg-arena.png"),
  moveRock: asset("moves/rock.png"),
  moveScissors: asset("moves/scissors.png"),
  movePaper: asset("moves/paper.png"),
} as const;
