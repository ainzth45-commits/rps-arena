import { describe, expect, it } from "vitest";
import {
  applyDelta,
  opponentDeltaTenths,
  formatDelta,
  formatTenths,
  nextStreak,
  offRoundDeltaTenths,
  offRoundSubScore,
  challengerDeltaTenths,
  streakPercent,
} from "./scoreEngine";
import { defaultConfig } from "./types";

const cfg = defaultConfig;

describe("เรทคะแนนพื้นฐาน (spec §8.1)", () => {
  it("ผู้เล่นเลือกเป้าเอง: +4 / +1 / −3", () => {
    expect(challengerDeltaTenths("win", false, 1, cfg)).toBe(40);
    expect(challengerDeltaTenths("draw", false, 0, cfg)).toBe(10);
    expect(challengerDeltaTenths("lose", false, 0, cfg)).toBe(-30);
  });

  it("ผู้เล่นกดสุ่ม: +5 / +1 / −2", () => {
    expect(challengerDeltaTenths("win", true, 1, cfg)).toBe(50);
    expect(challengerDeltaTenths("draw", true, 0, cfg)).toBe(10);
    expect(challengerDeltaTenths("lose", true, 0, cfg)).toBe(-20);
  });

  it("ผู้ท้าชิง: +3 / +1 / −2", () => {
    expect(opponentDeltaTenths("win", cfg)).toBe(30);
    expect(opponentDeltaTenths("draw", cfg)).toBe(10);
    expect(opponentDeltaTenths("lose", cfg)).toBe(-20);
  });

  it("ดวลนอกรอบ (เรทเบา): +2 / +1 / −1", () => {
    expect(offRoundDeltaTenths("win", cfg)).toBe(20);
    expect(offRoundDeltaTenths("draw", cfg)).toBe(10);
    expect(offRoundDeltaTenths("lose", cfg)).toBe(-10);
  });

  it("คะแนนรองของดวลนอกรอบเป็นจำนวนเต็ม ไม่ใช่ทศนิยม", () => {
    expect(offRoundSubScore("win", cfg)).toBe(2);
    expect(offRoundSubScore("draw", cfg)).toBe(1);
    expect(offRoundSubScore("lose", cfg)).toBe(-1);
  });
});

describe("โบนัสสตรีค (spec §8.2)", () => {
  it("ตัวคูณเป็น % ตามจำนวนครั้งที่ชนะติดกัน", () => {
    expect(streakPercent(1, cfg)).toBe(100);
    expect(streakPercent(2, cfg)).toBe(110);
    expect(streakPercent(3, cfg)).toBe(120);
    expect(streakPercent(10, cfg)).toBe(190);
  });

  it("ตารางในสเปกต้องตรงเป๊ะ — เลือกเอง (ฐาน 4)", () => {
    expect(challengerDeltaTenths("win", false, 1, cfg)).toBe(40); // 4.0
    expect(challengerDeltaTenths("win", false, 2, cfg)).toBe(44); // 4.4
    expect(challengerDeltaTenths("win", false, 3, cfg)).toBe(48); // 4.8
    expect(challengerDeltaTenths("win", false, 5, cfg)).toBe(56); // 5.6
    expect(challengerDeltaTenths("win", false, 10, cfg)).toBe(76); // 7.6
  });

  it("ตารางในสเปกต้องตรงเป๊ะ — กดสุ่ม (ฐาน 5)", () => {
    expect(challengerDeltaTenths("win", true, 1, cfg)).toBe(50); // 5.0
    expect(challengerDeltaTenths("win", true, 2, cfg)).toBe(55); // 5.5
    expect(challengerDeltaTenths("win", true, 3, cfg)).toBe(60); // 6.0
    expect(challengerDeltaTenths("win", true, 5, cfg)).toBe(70); // 7.0
    expect(challengerDeltaTenths("win", true, 10, cfg)).toBe(95); // 9.5
  });

  it("ตัวคูณไม่ใช้กับเสมอ และไม่ใช้กับการหักคะแนนตอนแพ้", () => {
    expect(challengerDeltaTenths("draw", false, 9, cfg)).toBe(10);
    expect(challengerDeltaTenths("lose", false, 9, cfg)).toBe(-30);
    expect(challengerDeltaTenths("lose", true, 9, cfg)).toBe(-20);
  });

  it("ไม่มีเพดานสตรีค", () => {
    expect(challengerDeltaTenths("win", false, 21, cfg)).toBe(120); // 4 × 300% = 12.0
  });

  it("ทุกผลลัพธ์เป็นจำนวนเต็ม (ไม่มีทศนิยม float หลุดมา)", () => {
    for (let streak = 1; streak <= 50; streak++) {
      expect(Number.isInteger(challengerDeltaTenths("win", false, streak, cfg))).toBe(true);
      expect(Number.isInteger(challengerDeltaTenths("win", true, streak, cfg))).toBe(true);
    }
  });
});

describe("สตรีคเดินยังไง", () => {
  it("ชนะ +1 · เสมอและแพ้กลับเป็น 0", () => {
    expect(nextStreak(0, "win")).toBe(1);
    expect(nextStreak(4, "win")).toBe(5);
    expect(nextStreak(7, "draw")).toBe(0);
    expect(nextStreak(7, "lose")).toBe(0);
  });
});

describe("พื้นคะแนน 0 (spec §8.3)", () => {
  it("แพ้แล้วจะติดลบ → ได้ 0 แทน", () => {
    expect(applyDelta(20, -30)).toBe(0);
  });

  it("อยู่ที่ 0 แล้วแพ้ → ยังเป็น 0 ไม่ติดลบ", () => {
    expect(applyDelta(0, -30)).toBe(0);
  });

  it("ปกติบวกลบตามจริง", () => {
    expect(applyDelta(300, 44)).toBe(344);
    expect(applyDelta(300, -30)).toBe(270);
  });

  it("เริ่มซีซั่นที่ 30 แต้ม = 300 tenths", () => {
    expect(cfg.startScore * 10).toBe(300);
  });
});

describe("แสดงผลคะแนน", () => {
  it("แปลงหน่วย 0.1 เป็นข้อความ", () => {
    expect(formatTenths(344)).toBe("34.4");
    expect(formatTenths(300)).toBe("30.0");
    expect(formatTenths(0)).toBe("0.0");
    expect(formatTenths(5)).toBe("0.5");
  });

  it("ข้อความคะแนนที่ได้/เสียมีเครื่องหมายนำ", () => {
    expect(formatDelta(44)).toBe("+4.4");
    expect(formatDelta(-30)).toBe("-3.0");
    expect(formatDelta(0)).toBe("0.0");
  });
});

describe("สถานการณ์จริง — ปั้นสตรีค 3 ครั้งติดแล้วแพ้", () => {
  it("คะแนนสะสมถูกต้องทุกก้าว", () => {
    let score = cfg.startScore * 10; // 300 = 30.0
    let streak = 0;

    for (let i = 0; i < 3; i++) {
      streak = nextStreak(streak, "win");
      score = applyDelta(score, challengerDeltaTenths("win", false, streak, cfg));
    }
    // 30.0 + 4.0 + 4.4 + 4.8 = 43.2
    expect(score).toBe(432);
    expect(streak).toBe(3);

    streak = nextStreak(streak, "lose");
    score = applyDelta(score, challengerDeltaTenths("lose", false, streak, cfg));
    // 43.2 − 3.0 = 40.2 · สตรีคกลับเป็น 0
    expect(score).toBe(402);
    expect(streak).toBe(0);

    // ชนะครั้งถัดไปต้องเป็น "ครั้งที่ 1" ได้ 4.0 ไม่ใช่ต่อจากของเดิม
    streak = nextStreak(streak, "win");
    expect(challengerDeltaTenths("win", false, streak, cfg)).toBe(40);
  });
});
