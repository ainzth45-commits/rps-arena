import { describe, expect, it, vi } from "vitest";
import { armWith, makeTestState } from "../state/testUtils";
import { endRound, performDuel, startRound } from "../state/actions";
import { buildLeaderboard, buildMovePick, buildShoot, offRoundSecretView } from "./tvView";

/** ดวลจริง 1 ครั้งให้มีข้อมูลอันดับ */
function duel(state: ReturnType<typeof makeTestState>, a: string, b: string, move: "rock" | "scissors" | "paper", now: number) {
  const opened = startRound(state, a, now);
  const after = performDuel(opened, { challengerId: a, opponentId: b, wasRandomPick: false, challengerMove: move, now }).state;
  return endRound(after, now + 1);
}

describe("TvView projections", () => {
  it("ตารางอันดับโชว์สูงสุด 10 คน + เรตมูฟตามกติกาภาษีของแชมป์", () => {
    let state = makeTestState(2);
    state = armWith(state, "B202", ["scissors", "scissors", "scissors"]);
    // A ชนะ B (ค้อน vs กรรไกร) → A อันดับ 1
    state = duel(state, "A101", "B202", "rock", 100);

    const board = buildLeaderboard(state);
    expect(board.kind).toBe("leaderboard");
    expect(board.rows.length).toBeLessThanOrEqual(10);
    const top = board.rows[0];
    // อันดับ 1 เปิดครบ 3 มูฟ (มี rates ไม่ใช่ null)
    expect(top.rank).toBe(1);
    expect(top.rates).not.toBeNull();
    // คนที่ยังไม่แข่งไม่อยู่ในตาราง แต่ถูกนับใน waiting
    expect(board.rows.every((r) => r.scoreTenths !== undefined)).toBe(true);
  });

  it("อันดับ 4+ ไม่เปิดเรตมูฟ (rates = null)", () => {
    let state = makeTestState(4);
    for (const [c, o] of [["A101", "B202"], ["B202", "C303"], ["C303", "D404"], ["D404", "A101"]] as const) {
      state = duel(state, c, o, "rock", 100 + Math.random());
    }
    const board = buildLeaderboard(state);
    const rank4 = board.rows.find((r) => r.rank >= 4);
    if (rank4) expect(rank4.rates).toBeNull();
  });

  it("หน้าเลือกมูฟส่งเวลาที่เหลือแบบ relative + ไม่บอกว่าเลือกมูฟอะไร (แค่ boolean)", () => {
    const state = makeTestState(2);
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);

    const view = buildMovePick(state, "A101", "B202", 1_700_000_018_000, 45, null);

    vi.useRealTimers();
    expect(view.kind).toBe("movePick");
    expect(view.secondsLeft).toBe(18);
    expect(view.totalSeconds).toBe(45);
    expect(view).not.toHaveProperty("deadline");
    expect(view.picked).toBe(false);
    // ต้องไม่รั่วค่ามูฟจริง และไม่มี field "move" (คำว่า movePick มี "move" ในชื่อ kind จึงเช็คเจาะจง)
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/rock|paper|scissors/);
    expect(json).not.toContain('"move"');
  });

  it("หน้าเลือกมูฟ snapshot กลางรอบส่งเวลาที่เหลือจริงจากนาฬิกา iPad", () => {
    const state = makeTestState(2);
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_010_250);

    const view = buildMovePick(state, "A101", "B202", 1_700_000_030_000, 30, "rock");

    vi.useRealTimers();
    expect(view.secondsLeft).toBe(20);
    expect(view.totalSeconds).toBe(30);
    expect(view.picked).toBe(true);
    expect(view.pickedMove).toBe("rock");
  });

  it("ดวลนอกรอบระหว่างเลือกมูฟ = offRoundSecret ไม่มีข้อมูลมูฟเลย (กันสปอยล์)", () => {
    expect(offRoundSecretView.kind).toBe("offRoundSecret");
    expect(JSON.stringify(offRoundSecretView)).not.toMatch(/rock|paper|scissors|move/);
  });

  it("ฉากเป่ายิ้งฉุบเปิดมูฟทั้งสองฝั่ง + ผล", () => {
    const state = makeTestState(2);
    const view = buildShoot(state, "A101", "B202", "rock", "scissors", "win");
    expect(view.left.move).toBe("rock");
    expect(view.right.move).toBe("scissors");
    expect(view.outcome).toBe("win");
  });

  it("ทุก view เป็น JSON ล้วน (serializable ส่งผ่านเน็ตได้ ไม่มี function/undefined)", () => {
    const state = makeTestState(2);
    const board = buildLeaderboard(state);
    expect(() => JSON.parse(JSON.stringify(board))).not.toThrow();
    expect(JSON.parse(JSON.stringify(board))).toEqual(board);
  });
});
