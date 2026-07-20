// ที่อยู่ของไฟล์ภาพทั้งหมด — รวมไว้จุดเดียว เวลาได้ asset ใหม่จาก Codex แก้ที่นี่ที่เดียว
// `?v=N` ใช้ล้าง cache ตอนเปลี่ยนรูป (บทเรียนเกมที่ 1: iPad ชอบจำรูปเก่า)
const BASE = import.meta.env.BASE_URL;
const V = "3";

function asset(path: string): string {
  return `${BASE}assets/${path}?v=${V}`;
}

export const gameAssets = {
  logo: asset("logo.png"),
  bgArena: asset("bg-arena.png"),

  moveRock: asset("moves/rock.png"),
  moveScissors: asset("moves/scissors.png"),
  movePaper: asset("moves/paper.png"),

  iconPlayers: asset("icons/icon-players.webp"),
  iconDuel: asset("icons/icon-duel.webp"),
  iconOffRound: asset("icons/icon-offround.webp"),
  iconRanking: asset("icons/icon-ranking.webp"),
  iconCoin: asset("icons/icon-coin.webp"),
  iconMoveSet: asset("icons/icon-moveset.webp"),
  iconHistory: asset("icons/icon-history.webp"),
  iconMail: asset("icons/icon-mail.webp"),
  iconTimer: asset("icons/icon-timer.webp"),
  iconLock: asset("icons/icon-lock.webp"),
  iconWarning: asset("icons/icon-warning.webp"),
  iconSettings: asset("icons/icon-settings.webp"),
  iconTutorial: asset("icons/icon-tutorial.webp"),
  avatarPlaceholder: asset("icons/avatar-placeholder.webp"),
} as const;
