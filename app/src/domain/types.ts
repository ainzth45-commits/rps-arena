// ชนิดข้อมูลกลางของเกม — ดู 01-game-design-spec.md §14

export type Move = "rock" | "scissors" | "paper";
export type DuelOutcome = "win" | "draw" | "lose";
export type PointerIndex = 0 | 1 | 2;

/** ชุดมูฟ 3 ช่อง: เป่า1 / เป่า2 / เป่า3 — ซ้ำกันได้ */
export type MoveSet = [Move, Move, Move];

export const ALL_MOVES: readonly Move[] = ["rock", "scissors", "paper"] as const;

export interface RoleRecord {
  win: number;
  draw: number;
  lose: number;
}

export interface PlayerStats {
  /** ผลตอนเป็นผู้ท้าชิง — รวมผลจากดวลนอกรอบที่บันทึกเป็นคะแนนหลักด้วย */
  asChallenger: RoleRecord & {
    /** นับเฉพาะดวลในเกมหลัก · ดวลนอกรอบไม่นับ (ใช้เป็นเกณฑ์อันดับชั้น 4) */
    mainDuels: number;
  };
  asOpponent: RoleRecord;
  /** นับเฉพาะมูฟจาก pre-set moveSet ตอนถูกท้าเป็นคู่แข่งในดวลหลัก — ใช้คำนวณเรตมูฟ */
  moveCount: Record<Move, number>;
}

export interface Player {
  /** รหัส 4 ตัว เช่น "A123" — เปลี่ยนไม่ได้ ใช้เป็น id ผูกข้อมูลทั้งหมด */
  id: string;
  name: string;
  imageUrl: string;
  /** null = ยังไม่ลงสังเวียนในซีซั่นนี้ → ไม่โผล่ในรายการเลือกคู่แข่ง */
  moveSet: MoveSet | null;
  pointerIndex: PointerIndex;
  /** คะแนนหลักเก็บเป็นจำนวนเต็มหน่วย 0.1 (300 = 30.0) กัน float เพี้ยน */
  mainScoreTenths: number;
  /** คะแนนรอง — จำนวนเต็ม ไม่บวกเข้าคะแนนหลัก ใช้ตัดสินเฉพาะตอนคะแนนหลักเท่ากัน */
  subScore: number;
  /** สตรีคชนะต่อเนื่องปัจจุบัน — นับเฉพาะตอนเป็นผู้ท้าชิงในเกมหลัก */
  streak: number;
  bestStreak: number;
  stats: PlayerStats;
}

export interface OutcomeRates {
  win: number;
  draw: number;
  lose: number;
}

export interface GameConfig {
  /** คะแนนตั้งต้นของทุกคนเมื่อเปิดซีซั่น */
  startScore: number;
  /** ค่าเล่นต่อรอบ — แสดงผลอย่างเดียว แอปไม่เก็บยอดเหรียญ */
  coinCost: number;
  /** ผู้ท้าชิงที่เลือกคู่แข่งเอง */
  pickedRates: OutcomeRates;
  /** ผู้ท้าชิงที่กดสุ่มคู่แข่ง */
  randomRates: OutcomeRates;
  /** คู่แข่ง — คนถูกท้า (ระบบเล่นแทน) */
  opponentRates: OutcomeRates;
  /** ดวลนอกรอบ — ใช้กับทั้งสองฝ่าย */
  offRoundRates: OutcomeRates;
  /** โบนัสสตรีคต่อการชนะติดกัน 1 ครั้ง (หน่วย %) */
  streakStepPercent: number;
  /** เวลาเลือกมูฟ (วินาที) — หมดเวลาระบบสุ่มให้ */
  movePickSeconds: number;
  /** ป้ายเตือน "โดนไล่เก็บ": คนเดียวท้าเรากี่ครั้งขึ้นไปถึงจะเตือน */
  farmWarnMinDuels: number;
  /** ความดังเสียงบนจอ TV (0–2 = 0–200%) — iPad เป็นรีโมทปรับให้ ส่งค่าผ่าน realtime */
  tvVolume: number;
}

export const defaultConfig: GameConfig = {
  startScore: 30,
  coinCost: 3,
  pickedRates: { win: 4, draw: 1, lose: -3 },
  randomRates: { win: 5, draw: 1, lose: -2 },
  opponentRates: { win: 3, draw: 1, lose: -2 },
  offRoundRates: { win: 2, draw: 1, lose: -1 },
  streakStepPercent: 10,
  movePickSeconds: 30,
  farmWarnMinDuels: 3,
  tvVolume: 1.0,
};

export function emptyStats(): PlayerStats {
  return {
    asChallenger: { win: 0, draw: 0, lose: 0, mainDuels: 0 },
    asOpponent: { win: 0, draw: 0, lose: 0 },
    moveCount: { rock: 0, scissors: 0, paper: 0 },
  };
}
