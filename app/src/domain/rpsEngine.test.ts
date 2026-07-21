import { describe, expect, it } from "vitest";
import { moveAtPointer, nextPointer, randomOpponentId, randomMove, resolveDuel } from "./rpsEngine";
import type { Move, MoveSet, PointerIndex } from "./types";

describe("resolveDuel — ครบทั้ง 9 คู่", () => {
  const cases: [Move, Move, string][] = [
    ["rock", "scissors", "win"],
    ["rock", "paper", "lose"],
    ["rock", "rock", "draw"],
    ["scissors", "paper", "win"],
    ["scissors", "rock", "lose"],
    ["scissors", "scissors", "draw"],
    ["paper", "rock", "win"],
    ["paper", "scissors", "lose"],
    ["paper", "paper", "draw"],
  ];

  it.each(cases)("%s vs %s = %s", (player, opponent, expected) => {
    expect(resolveDuel(player, opponent)).toBe(expected);
  });

  it("ผลของสองฝั่งตรงข้ามกันเสมอ (ยกเว้นเสมอ)", () => {
    for (const [player, opponent] of cases) {
      const forward = resolveDuel(player, opponent);
      const backward = resolveDuel(opponent, player);
      if (forward === "draw") expect(backward).toBe("draw");
      else expect(backward).toBe(forward === "win" ? "lose" : "win");
    }
  });
});

describe("ตัวชี้ชุดมูฟ", () => {
  it("เดินทีละช่องแล้ววนกลับช่องแรก", () => {
    expect(nextPointer(0)).toBe(1);
    expect(nextPointer(1)).toBe(2);
    expect(nextPointer(2)).toBe(0);
  });

  it("เดินครบ 1 รอบกลับมาที่เดิม", () => {
    let index: PointerIndex = 0;
    for (let i = 0; i < 3; i++) index = nextPointer(index);
    expect(index).toBe(0);
  });

  it("ดึงมูฟตามช่องที่ตัวชี้ชี้อยู่", () => {
    const set: MoveSet = ["rock", "scissors", "paper"];
    expect(moveAtPointer(set, 0)).toBe("rock");
    expect(moveAtPointer(set, 1)).toBe("scissors");
    expect(moveAtPointer(set, 2)).toBe("paper");
  });

  it("ชุดมูฟที่ตั้งซ้ำกันได้ ก็ดึงถูกช่อง", () => {
    const set: MoveSet = ["rock", "scissors", "scissors"];
    expect(moveAtPointer(set, 1)).toBe("scissors");
    expect(moveAtPointer(set, 2)).toBe("scissors");
  });
});

describe("randomMove", () => {
  it("แต่ละช่วงของ rng ให้มูฟตรงตามลำดับ", () => {
    expect(randomMove(() => 0)).toBe("rock");
    expect(randomMove(() => 0.5)).toBe("scissors");
    expect(randomMove(() => 0.99)).toBe("paper");
  });

  it("rng คืน 1 พอดี (ขอบบน) ต้องไม่หลุด index", () => {
    expect(randomMove(() => 1)).toBe("paper");
  });

  it("สุ่มจริงได้ครบทั้ง 3 มูฟ", () => {
    const seen = new Set<Move>();
    for (let i = 0; i < 300; i++) seen.add(randomMove());
    expect(seen.size).toBe(3);
  });
});

describe("randomOpponentId", () => {
  it("สุ่มจากรายการที่ให้มา", () => {
    expect(randomOpponentId(["A001", "B002", "C003"], () => 0)).toBe("A001");
    expect(randomOpponentId(["A001", "B002", "C003"], () => 0.9)).toBe("C003");
  });

  it("rng = 1 พอดี ต้องไม่หลุดขอบ", () => {
    expect(randomOpponentId(["A001", "B002"], () => 1)).toBe("B002");
  });

  it("ไม่มีใครให้สุ่ม → null (ยังไม่มีใครลงสังเวียนนอกจากตัวเอง)", () => {
    expect(randomOpponentId([], () => 0)).toBeNull();
  });
});
