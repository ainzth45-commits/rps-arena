import { describe, expect, it } from "vitest";
import { moveRates, rankPlayers, totalMoveCount, visibleMoveRates, winMinusLose } from "./rankingEngine";
import { emptyStats, type Move, type Player } from "./types";

function makePlayer(id: string, over: Partial<Player> = {}): Player {
  const stats = emptyStats();
  return {
    id,
    name: id,
    imageUrl: "",
    moveSet: ["rock", "scissors", "paper"],
    pointerIndex: 0,
    mainScoreTenths: 300,
    subScore: 0,
    streak: 0,
    bestStreak: 0,
    stats,
    ...over,
  };
}

function withRecord(
  id: string,
  opts: {
    main?: number;
    sub?: number;
    challengerWin?: number;
    challengerLose?: number;
    challengerDraw?: number;
    mainDuels?: number;
    chWin?: number;
    chLose?: number;
    moves?: Partial<Record<Move, number>>;
  },
): Player {
  const stats = emptyStats();
  stats.asChallenger.win = opts.challengerWin ?? 0;
  stats.asChallenger.lose = opts.challengerLose ?? 0;
  stats.asChallenger.draw = opts.challengerDraw ?? 0;
  stats.asChallenger.mainDuels = opts.mainDuels ?? 0;
  stats.asOpponent.win = opts.chWin ?? 0;
  stats.asOpponent.lose = opts.chLose ?? 0;
  stats.moveCount = { rock: 0, scissors: 0, paper: 0, ...opts.moves };
  return makePlayer(id, { mainScoreTenths: opts.main ?? 300, subScore: opts.sub ?? 0, stats });
}

describe("เกณฑ์อันดับ 4 ชั้น (spec §9)", () => {
  it("ชั้น 1 — คะแนนหลักมากกว่าชนะ", () => {
    const ranked = rankPlayers([withRecord("A", { main: 300 }), withRecord("B", { main: 472 })]);
    expect(ranked.map((r) => r.player.id)).toEqual(["B", "A"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("ชั้น 2 — คะแนนหลักเท่ากัน ดูคะแนนรอง", () => {
    const ranked = rankPlayers([
      withRecord("A", { main: 400, sub: 1 }),
      withRecord("B", { main: 400, sub: 6 }),
    ]);
    expect(ranked.map((r) => r.player.id)).toEqual(["B", "A"]);
  });

  it("คะแนนรองไม่มีทางแซงคนที่คะแนนหลักสูงกว่า (เจตนาของเจ้าของเกม)", () => {
    const ranked = rankPlayers([
      withRecord("มีคะแนนรองเยอะ", { main: 400, sub: 99 }),
      withRecord("คะแนนหลักสูงกว่านิดเดียว", { main: 401, sub: 0 }),
    ]);
    expect(ranked[0].player.id).toBe("คะแนนหลักสูงกว่านิดเดียว");
  });

  it("ชั้น 3 — ชนะ−แพ้ (เสมอไม่นับ · รวมทุกบทบาท)", () => {
    const ranked = rankPlayers([
      withRecord("A", { main: 400, challengerWin: 22, challengerLose: 14 }), // +8
      withRecord("B", { main: 400, challengerWin: 15, challengerLose: 6 }), //  +9
    ]);
    expect(ranked.map((r) => r.player.id)).toEqual(["B", "A"]);
  });

  it("ชั้น 3 นับผลตอนเป็นผู้ท้าชิงด้วย", () => {
    const ranked = rankPlayers([
      withRecord("A", { main: 400, challengerWin: 5, chWin: 0, chLose: 3 }), // +2
      withRecord("B", { main: 400, challengerWin: 5, chWin: 2, chLose: 0 }), // +7
    ]);
    expect(ranked[0].player.id).toBe("B");
  });

  it("เสมอไม่ถูกนับในชั้น 3", () => {
    expect(winMinusLose(withRecord("X", { challengerWin: 3, challengerDraw: 10, challengerLose: 1 }))).toBe(2);
  });

  it("ชั้น 4 — ลงเป็นผู้เล่นบ่อยกว่าชนะ", () => {
    const ranked = rankPlayers([
      withRecord("ขี้เกียจ", { main: 400, challengerWin: 3, challengerLose: 1, mainDuels: 4 }),
      withRecord("ขยัน", { main: 400, challengerWin: 3, challengerLose: 1, mainDuels: 30 }),
    ]);
    expect(ranked[0].player.id).toBe("ขยัน");
  });
});

describe("อันดับร่วมแบบกีฬา", () => {
  it("เท่ากันทุกชั้น = อันดับร่วม และคนถัดไปข้ามเลข (1,1,3)", () => {
    const ranked = rankPlayers([
      withRecord("A", { main: 500 }),
      withRecord("B", { main: 500 }),
      withRecord("C", { main: 400 }),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("เสมอกลางตาราง (1,2,2,4)", () => {
    const ranked = rankPlayers([
      withRecord("A", { main: 600 }),
      withRecord("B", { main: 500 }),
      withRecord("C", { main: 500 }),
      withRecord("D", { main: 400 }),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("เท่ากันหมดทั้งตาราง = อันดับ 1 ร่วมทุกคน", () => {
    const ranked = rankPlayers([withRecord("A", {}), withRecord("B", {}), withRecord("C", {})]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 1]);
  });

  it("ตารางว่างไม่พัง", () => {
    expect(rankPlayers([])).toEqual([]);
  });
});

describe("เรตการออกมูฟจากการถูกท้าในดวลหลัก", () => {
  it("คิด % จาก moveCount ที่บันทึกตอนเป็นคู่แข่ง เรียงมากไปน้อย", () => {
    const player = withRecord("A", { moves: { rock: 9, scissors: 6, paper: 5 } });
    expect(totalMoveCount(player)).toBe(20);
    expect(moveRates(player)).toEqual([
      { move: "rock", count: 9, percent: 45 },
      { move: "scissors", count: 6, percent: 30 },
      { move: "paper", count: 5, percent: 25 },
    ]);
  });

  it("ยังไม่เคยถูกท้าเป็นคู่แข่งเลย → อาเรย์ว่าง ไม่ใช่ NaN (spec §16 ข้อ 11)", () => {
    const player = withRecord("A", {});
    expect(moveRates(player)).toEqual([]);
    expect(totalMoveCount(player)).toBe(0);
  });

  it("ชนะในฐานะผู้ท้าชิงบ่อย แต่ไม่เคยถูกท้าเป็นคู่แข่ง → ไม่มีเรตมูฟ", () => {
    const player = withRecord("A", { challengerWin: 10, mainDuels: 10 });
    expect(moveRates(player)).toEqual([]);
    expect(totalMoveCount(player)).toBe(0);
  });
});

describe("ภาษีของแชมป์ — เปิดเรตมูฟท็อป 3 (spec §12)", () => {
  const heavy = withRecord("แชมป์", { moves: { rock: 9, scissors: 6, paper: 5 } });

  it("อันดับ 1 เปิดครบทั้ง 3 มูฟ", () => {
    expect(visibleMoveRates(1, heavy)?.map((r) => r.move)).toEqual(["rock", "scissors", "paper"]);
  });

  it("อันดับ 2 และ 3 เปิดเฉพาะมูฟที่ออกบ่อยที่สุด", () => {
    expect(visibleMoveRates(2, heavy)).toEqual([{ move: "rock", count: 9, percent: 45 }]);
    expect(visibleMoveRates(3, heavy)).toEqual([{ move: "rock", count: 9, percent: 45 }]);
  });

  it("อันดับ 4 ลงไปไม่เปิดอะไรเลย", () => {
    expect(visibleMoveRates(4, heavy)).toBeNull();
    expect(visibleMoveRates(11, heavy)).toBeNull();
  });

  it("อันดับ 2/3 ถ้ามูฟสูงสุดเท่ากันหลายอัน → เปิดทั้งหมด", () => {
    const tied = withRecord("B", { moves: { rock: 8, scissors: 8, paper: 4 } });
    expect(visibleMoveRates(2, tied)?.map((r) => r.move).sort()).toEqual(["rock", "scissors"]);
  });

  it("ติดท็อป 3 แต่ยังไม่เคยถูกท้าเป็นคู่แข่ง → อาเรย์ว่าง (จอโชว์ 'ยังไม่มีข้อมูล')", () => {
    const fresh = withRecord("ใหม่", {});
    expect(visibleMoveRates(1, fresh)).toEqual([]);
    expect(visibleMoveRates(2, fresh)).toEqual([]);
  });

  it("อันดับ 1 ร่วม 2 คน → เปิด 3 มูฟทั้งคู่ · คนถัดไปเป็นอันดับ 3 เปิดมูฟเดียว", () => {
    const ranked = rankPlayers([
      withRecord("A", { main: 500, moves: { rock: 5, scissors: 3, paper: 2 } }),
      withRecord("B", { main: 500, moves: { rock: 4, scissors: 4, paper: 2 } }),
      withRecord("C", { main: 400, moves: { rock: 7, scissors: 2, paper: 1 } }),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(visibleMoveRates(ranked[0].rank, ranked[0].player)).toHaveLength(3);
    expect(visibleMoveRates(ranked[1].rank, ranked[1].player)).toHaveLength(3);
    expect(visibleMoveRates(ranked[2].rank, ranked[2].player)).toHaveLength(1);
  });
});
