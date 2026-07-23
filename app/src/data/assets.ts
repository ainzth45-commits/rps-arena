// ที่อยู่ของไฟล์ภาพทั้งหมด — รวมไว้จุดเดียว เวลาได้ asset ใหม่จาก Codex แก้ที่นี่ที่เดียว
// `?v=N` ใช้ล้าง cache ตอนเปลี่ยนรูป (บทเรียนเกมที่ 1: iPad ชอบจำรูปเก่า)
const BASE = import.meta.env.BASE_URL;
const V = "12";

function asset(path: string): string {
  return `${BASE}assets/${path}?v=${V}`;
}

export const gameAssets = {
  logo: asset("logo.png"),
  bgArena: asset("bg-arena.webp"),

  moveRock: asset("moves/rock.webp"),
  moveScissors: asset("moves/scissors.webp"),
  movePaper: asset("moves/paper.webp"),

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
  iconHome: asset("icons/icon-home.webp"),
  avatarPlaceholder: asset("icons/avatar-placeholder.webp"),
  crown: asset("icons/crown.webp"),
  iconDice: asset("icons/icon-dice.webp"),

  // ตัวละคร (คู่ปรับประจำเกม)
  catSmug: asset("chars/cat-smug.webp"),
  catWin: asset("chars/cat-win.webp"),
  catLose: asset("chars/cat-lose.webp"),
  employeeAngry: asset("chars/employee-angry.webp"),
  employeeWin: asset("chars/employee-win.webp"),
  employeeLose: asset("chars/employee-lose.webp"),

  // ฉาก/เอฟเฟกต์
  resultWin: asset("scenes/result-win.webp"),
  resultLose: asset("scenes/result-lose.webp"),
  resultDraw: asset("scenes/result-draw.webp"),
  streakFire: asset("scenes/streak-fire.webp"),
  vsBadge: asset("scenes/vs-badge.webp"),
  clashSpark: asset("scenes/clash-spark.webp"),
  seasonPodium: asset("scenes/season-podium.webp"),
  seasonTrophy: asset("scenes/season-trophy.webp"),

  // พื้นหลังเฉพาะห้อง (ทึบเต็มเฟรม)
  bgMoveSet: asset("scenes/bg-moveset.webp"),
  bgPrep: asset("scenes/bg-prep.webp"),
  bgResult: asset("scenes/bg-result.webp"),
  bgVersus: asset("scenes/bg-versus.webp"),
  // เวที VS ผ่าสองซีก (อีกฝั่งโปร่งใส) — ประกบแล้วได้ภาพเดิมเป๊ะ
  bgVersusLeft: asset("scenes/bg-versus-left.webp"),
  bgVersusRight: asset("scenes/bg-versus-right.webp"),

  // ภาพประกอบสอนเล่น
  tutorialMoveSet: asset("scenes/tutorial-moveset.webp"),
  tutorialPointer: asset("scenes/tutorial-pointer.webp"),
  tutorialDuel: asset("scenes/tutorial-duel.webp"),
} as const;
