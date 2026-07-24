import { describe, expect, it } from "vitest";
import {
  addPlayer,
  configLimits,
  confirmMoveSet,
  duelBlockedReason,
  editPlayer,
  endRound,
  endSeason,
  isValidPlayerCode,
  performDuel,
  performOffRoundDuel,
  deleteDuels,
  removeBlockedReason,
  updateConfig,
  removePlayer,
  startNewSeason,
  startRound,
} from "./actions";
import { AEK_ID, awayRecapFor, challengeableIds, createInitialState, findPlayer, historyFor, isInArena } from "./gameState";
import { armWith, makeTestState, T0, TEST_PLAYERS } from "./testUtils";

const [P1, P2, P3] = TEST_PLAYERS;
const emptyMoveCount = { rock: 0, scissors: 0, paper: 0 };

/** ผู้เล่นดวลหนึ่งครั้ง — คืน state ใหม่ */
function duelOnce(
  state: ReturnType<typeof makeTestState>,
  playerId: string,
  opponentId: string,
  challengerMove: Parameters<typeof performDuel>[1]["challengerMove"],
  now: number,
  wasRandomPick = false,
) {
  const opened = state.round ? state : startRound(state, playerId, now);
  return performDuel(opened, { challengerId: playerId, opponentId, wasRandomPick, challengerMove, now });
}

function expectMoveCount(
  state: ReturnType<typeof makeTestState>,
  playerId: string,
  expected: { rock: number; scissors: number; paper: number },
) {
  expect(findPlayer(state, playerId)!.stats.moveCount).toEqual(expected);
}

describe("รหัสผู้เล่น", () => {
  it("ตัวพิมพ์ใหญ่ 1 + ตัวเลข 3 เท่านั้น", () => {
    expect(isValidPlayerCode("A101")).toBe(true);
    expect(isValidPlayerCode("a101")).toBe(false);
    expect(isValidPlayerCode("AB01")).toBe(false);
    expect(isValidPlayerCode("A1013")).toBe(false);
    expect(isValidPlayerCode("A10")).toBe(false);
  });

  it("รหัสซ้ำเพิ่มไม่ได้", () => {
    let state = createInitialState(T0);
    state = addPlayer(state, "A101", "คนแรก", "");
    expect(() => addPlayer(state, "A101", "คนสอง", "")).toThrow(/มีคนใช้แล้ว/);
  });

  it("รหัสพิมพ์เล็กถูกแปลงเป็นพิมพ์ใหญ่ให้", () => {
    const state = addPlayer(createInitialState(T0), "a101", "คนแรก", "");
    expect(findPlayer(state, "A101")).toBeDefined();
  });

  it("แก้ชื่อ/รูปได้ แต่คะแนนไม่ถูกแตะ", () => {
    let state = makeTestState();
    state = editPlayer(state, P1.id, "ชื่อใหม่", "https://example.com/a.png");
    expect(findPlayer(state, P1.id)!.name).toBe("ชื่อใหม่");
    expect(findPlayer(state, P1.id)!.mainScoreTenths).toBe(300);
  });
});

describe("ลงสังเวียน", () => {
  it("ยังไม่ตั้งชุดมูฟ = ไม่ลงสังเวียน ไม่โผล่ในรายการให้ท้า", () => {
    const state = makeTestState(2); // เฉพาะ 2 คนแรกที่ตั้งแล้ว
    expect(isInArena(findPlayer(state, P3.id)!)).toBe(false);
    expect(challengeableIds(state, P1.id)).toEqual([P2.id]);
  });

  it("ตัวเองไม่อยู่ในรายการให้ท้าเสมอ", () => {
    const state = makeTestState(4);
    expect(challengeableIds(state, P1.id)).not.toContain(P1.id);
    expect(challengeableIds(state, P1.id)).toHaveLength(3);
  });

  it("ตั้งชุดมูฟครั้งแรกของซีซั่นทำได้โดยไม่ต้องเปิดรอบ (ฟรี)", () => {
    let state = createInitialState(T0);
    state = addPlayer(state, "A101", "คนแรก", "");
    expect(() => confirmMoveSet(state, "A101", ["rock", "rock", "rock"])).not.toThrow();
  });
});

describe("ตัวชี้ชุดมูฟ (spec §5.3)", () => {
  it("ตัวชี้เดินทีละช่องเมื่อถูกท้า และวนกลับช่องแรก", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "scissors", "paper"]);
    for (const expected of ["rock", "scissors", "paper", "rock"]) {
      const result = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
      expect(result.duel.opponentMove).toBe(expected);
      state = endRound(result.state, T0 + 2);
    }
  });

  it("ตัวชี้ไม่เดินเมื่อเราเป็นฝ่ายท้า (เดินเฉพาะตอนถูกท้า)", () => {
    const state = armWith(makeTestState(4), P2.id, ["rock", "scissors", "paper"]);
    const result = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    expect(findPlayer(result.state, P1.id)!.pointerIndex).toBe(0);
    expect(findPlayer(result.state, P2.id)!.pointerIndex).toBe(1);
  });

  it("ยืนยันชุดมูฟ = รีเซตตัวชี้กลับช่อง 1 แม้ไม่เปลี่ยนค่าอะไรเลย (ซื้อการสับขาหลอก)", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "scissors", "paper"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + 1).state, T0 + 2);
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + 3).state, T0 + 4);
    expect(findPlayer(state, P2.id)!.pointerIndex).toBe(2);

    state = startRound(state, P2.id, T0 + 5);
    state = confirmMoveSet(state, P2.id, ["rock", "scissors", "paper"]); // ค่าเดิมเป๊ะ
    expect(findPlayer(state, P2.id)!.pointerIndex).toBe(0);
    expect(state.round!.moveSetConfirmed).toBe(true);
  });

  it("ยืนยันชุดมูฟได้ครั้งเดียวต่อรอบ", () => {
    let state = makeTestState(4);
    state = startRound(state, P1.id, T0 + 1);
    state = confirmMoveSet(state, P1.id, ["rock", "rock", "rock"]);
    expect(() => confirmMoveSet(state, P1.id, ["paper", "paper", "paper"])).toThrow(/ปรับชุดมูฟไปแล้ว/);
  });
});

describe("การดวล — คะแนนและสถิติ", () => {
  it("ชนะแบบเลือกเป้าเอง: ผู้เล่น +4.0 · ผู้ท้าชิง −2.0", () => {
    const state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    const { state: after, duel } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    expect(duel.challengerOutcome).toBe("win");
    expect(findPlayer(after, P1.id)!.mainScoreTenths).toBe(340);
    expect(findPlayer(after, P2.id)!.mainScoreTenths).toBe(280);
  });

  it("ชนะแบบกดสุ่ม: ผู้เล่น +5.0", () => {
    const state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1, true);
    expect(findPlayer(after, P1.id)!.mainScoreTenths).toBe(350);
  });

  it("แพ้: ผู้เล่น −3.0 · ผู้ท้าชิงได้ +3.0", () => {
    const state = armWith(makeTestState(4), P2.id, ["paper", "paper", "paper"]);
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    expect(findPlayer(after, P1.id)!.mainScoreTenths).toBe(270);
    expect(findPlayer(after, P2.id)!.mainScoreTenths).toBe(330);
  });

  it("เสมอ: ทั้งคู่ได้ +1.0", () => {
    const state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    expect(findPlayer(after, P1.id)!.mainScoreTenths).toBe(310);
    expect(findPlayer(after, P2.id)!.mainScoreTenths).toBe(310);
  });

  it("สถิติแยกบทบาทถูกต้อง + เรตมูฟนับเฉพาะตอนเป็นคู่แข่งในดวลหลัก", () => {
    const state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    const player = findPlayer(after, P1.id)!;
    const opponent = findPlayer(after, P2.id)!;
    expect(player.stats.asChallenger).toEqual({ win: 1, draw: 0, lose: 0, mainDuels: 1 });
    expect(player.stats.moveCount).toEqual(emptyMoveCount);
    expect(opponent.stats.asOpponent).toEqual({ win: 0, draw: 0, lose: 1 });
    expect(opponent.stats.moveCount.scissors).toBe(1);
  });

  it("ผู้ท้าชิงที่ชนะบ่อยแต่ไม่เคยถูกท้าเป็นคู่แข่ง มี moveCount เป็น 0", () => {
    let state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    for (let i = 0; i < 3; i++) {
      state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + i + 1).state, T0 + i + 1);
    }
    expect(findPlayer(state, P1.id)!.stats.asChallenger.win).toBe(3);
    expectMoveCount(state, P1.id, emptyMoveCount);
  });

  it("สตรีคสะสมแล้วคูณคะแนนถูกต้อง (4.0 → 4.4 → 4.8)", () => {
    let state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const result = duelOnce(state, P1.id, P2.id, "rock", T0 + i + 1);
      gains.push(result.duel.challengerDeltaTenths);
      state = endRound(result.state, T0 + i + 1);
    }
    expect(gains).toEqual([40, 44, 48]);
    expect(findPlayer(state, P1.id)!.streak).toBe(3);
    expect(findPlayer(state, P1.id)!.bestStreak).toBe(3);
  });

  it("แพ้แล้วสตรีคกลับเป็น 0 แต่ bestStreak ยังจำไว้", () => {
    let state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "paper"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + 1).state, T0 + 1);
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + 2).state, T0 + 2);
    expect(findPlayer(state, P1.id)!.streak).toBe(2);
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + 3).state, T0 + 3); // เจอ paper = แพ้
    expect(findPlayer(state, P1.id)!.streak).toBe(0);
    expect(findPlayer(state, P1.id)!.bestStreak).toBe(2);
  });

  it("อยู่ที่ 0 แล้วแพ้ → คะแนนคงที่ 0 แต่สถิติแพ้ถูกบันทึก (spec §16 ข้อ 3)", () => {
    let state = armWith(makeTestState(4), P2.id, ["paper", "paper", "paper"]);
    // ทุบให้เหลือ 0 ก่อน
    state = { ...state, players: state.players.map((p) => (p.id === P1.id ? { ...p, mainScoreTenths: 0 } : p)) };
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    expect(findPlayer(after, P1.id)!.mainScoreTenths).toBe(0);
    expect(findPlayer(after, P1.id)!.stats.asChallenger.lose).toBe(1);
  });
});

describe("กันไล่ปั๊มดวลคนเดียว (คู่แข่งถูกท้าติดกัน)", () => {
  it("ครั้งที่ 5-6 ผู้ท้าชิงชนะได้ครึ่ง · 7+ ได้ 25% · คู่แข่งเสียเท่าเดิม", () => {
    let state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    state = updateConfig(state, { streakStepPercent: 0 }); // ตัดโบนัสสตรีค เทียบ delta ตรงๆ
    const cd: number[] = [];
    const od: number[] = [];
    for (let n = 0; n < 8; n += 1) {
      const res = duelOnce(state, P1.id, P2.id, "rock", T0 + n + 1); // P1 ชนะ P2 (rock > scissors)
      cd.push(res.duel.challengerDeltaTenths);
      od.push(res.duel.opponentDeltaTenths);
      state = endRound(res.state, T0 + n + 1);
    }
    // ครั้งที่ 1-4 เต็ม 40 · 5-6 ครึ่ง 20 · 7-8 = 25% = 10
    expect(cd).toEqual([40, 40, 40, 40, 20, 20, 10, 10]);
    // คู่แข่งที่ถูกปั๊มเสียคะแนนเท่าเดิมทุกครั้ง (ไม่ถูกหั่น)
    expect(od.every((delta) => delta === -20)).toBe(true);
  });

  it("ผู้ท้าชิงเสมอ ไม่ถูกหั่น แม้คู่แข่งถูกท้าติดกันหลายครั้ง", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = updateConfig(state, { streakStepPercent: 0 });
    let last = 0;
    for (let n = 0; n < 6; n += 1) {
      const res = duelOnce(state, P1.id, P2.id, "rock", T0 + n + 1); // เสมอ (rock vs rock)
      last = res.duel.challengerDeltaTenths;
      state = endRound(res.state, T0 + n + 1);
    }
    expect(last).toBe(10); // เสมอ = pickedRates.draw (1) → 10 ทุกครั้ง แม้ครั้งที่ 6
  });

  it("มีคนอื่นถูกท้าคั่น → การนับติดกันเริ่มใหม่ (ได้คะแนนเต็ม)", () => {
    let state = armWith(armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]), P3.id, ["scissors", "scissors", "scissors"]);
    state = updateConfig(state, { streakStepPercent: 0 });
    for (let n = 0; n < 4; n += 1) {
      state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + n + 1).state, T0 + n + 1);
    }
    // คั่นด้วยการท้าคนอื่น (P3) → รีเซตการนับติดกันของ P2
    state = endRound(duelOnce(state, P1.id, P3.id, "rock", T0 + 10).state, T0 + 10);
    // กลับมาท้า P2 = นับใหม่เป็นครั้งที่ 1 (ไม่ถูกหั่น)
    const res = duelOnce(state, P1.id, P2.id, "rock", T0 + 20);
    expect(res.duel.challengerDeltaTenths).toBe(40);
  });
});

describe("Guard ของการดวล (spec §16)", () => {
  it("ยังไม่เปิดรอบ ดวลไม่ได้", () => {
    expect(duelBlockedReason(makeTestState(4), P1.id)).toMatch(/เปิดรอบ/);
  });

  it("รอบนี้ดวลไปแล้ว ดวลซ้ำไม่ได้", () => {
    const state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    expect(duelBlockedReason(after, P1.id)).toMatch(/ดวลไปแล้ว/);
    expect(() => performDuel(after, { challengerId: P1.id, opponentId: P2.id, wasRandomPick: false, challengerMove: "rock", now: T0 + 2 })).toThrow();
  });

  it("ไม่มีใครลงสังเวียนนอกจากตัวเอง → ดวลไม่ได้ (spec §16 ข้อ 1)", () => {
    const state = startRound(makeTestState(1), P1.id, T0 + 1);
    expect(duelBlockedReason(state, P1.id)).toMatch(/ยังไม่มีใครลงสังเวียน/);
  });

  it("ตัวเองยังไม่ตั้งชุดมูฟ → ดวลไม่ได้ (spec §16 ข้อ 2)", () => {
    let state = makeTestState(0);
    state = confirmMoveSet(state, P2.id, ["rock", "rock", "rock"]);
    state = startRound(state, P1.id, T0 + 1);
    expect(duelBlockedReason(state, P1.id)).toMatch(/ตั้งชุดมูฟก่อน/);
  });

  it("ท้าตัวเองไม่ได้", () => {
    const state = startRound(makeTestState(4), P1.id, T0 + 1);
    expect(() => performDuel(state, { challengerId: P1.id, opponentId: P1.id, wasRandomPick: false, challengerMove: "rock", now: T0 + 2 })).toThrow(/ท้าตัวเอง/);
  });

  it("เปิดรอบซ้อนไม่ได้", () => {
    const state = startRound(makeTestState(4), P1.id, T0 + 1);
    expect(() => startRound(state, P2.id, T0 + 2)).toThrow(/เปิดค้าง/);
  });
});

describe("ดวลนอกรอบ (spec §10)", () => {
  const base = () => makeTestState(4);

  it("บันทึกเป็นคะแนนหลัก: เรทเบา +2/−1 · นับสถิติ · แต่ไม่นับ mainDuels หรือ moveCount", () => {
    const { state } = performOffRoundDuel(base(), { aId: P1.id, bId: P2.id, aMove: "rock", bMove: "scissors", save: "main", now: T0 + 1 });
    expect(findPlayer(state, P1.id)!.mainScoreTenths).toBe(320);
    expect(findPlayer(state, P2.id)!.mainScoreTenths).toBe(290);
    expect(findPlayer(state, P1.id)!.stats.asChallenger.win).toBe(1);
    expect(findPlayer(state, P1.id)!.stats.asChallenger.mainDuels).toBe(0); // ← ไม่ให้ไต่อันดับชั้น 4
    expectMoveCount(state, P1.id, emptyMoveCount);
    expectMoveCount(state, P2.id, emptyMoveCount);
  });

  it("บันทึกเป็นคะแนนรอง: เข้าคอลัมน์แยก ไม่แตะคะแนนหลัก ไม่แตะสถิติ", () => {
    const { state } = performOffRoundDuel(base(), { aId: P1.id, bId: P2.id, aMove: "rock", bMove: "scissors", save: "sub", now: T0 + 1 });
    expect(findPlayer(state, P1.id)!.mainScoreTenths).toBe(300);
    expect(findPlayer(state, P1.id)!.subScore).toBe(2);
    expect(findPlayer(state, P2.id)!.subScore).toBe(-1);
    expect(findPlayer(state, P1.id)!.stats.asChallenger.win).toBe(0);
    expectMoveCount(state, P1.id, emptyMoveCount);
    expectMoveCount(state, P2.id, emptyMoveCount);
  });

  it("ไม่บันทึก: ไม่มีอะไรเปลี่ยนเลยสักอย่าง (spec §16 ข้อ 8)", () => {
    const before = base();
    const { state } = performOffRoundDuel(before, { aId: P1.id, bId: P2.id, aMove: "rock", bMove: "scissors", save: "none", now: T0 + 1 });
    expect(state.players).toEqual(before.players);
    expect(state.duels).toHaveLength(0);
  });

  it("ไม่แตะสตรีค และไม่เลื่อนตัวชี้ของทั้งคู่ (spec §10.3)", () => {
    let state = armWith(base(), P2.id, ["rock", "scissors", "paper"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 1).state, T0 + 2); // paper ชนะ rock → สตรีค 1
    expect(findPlayer(state, P1.id)!.streak).toBe(1);
    expect(findPlayer(state, P2.id)!.pointerIndex).toBe(1);

    const { state: after } = performOffRoundDuel(state, { aId: P1.id, bId: P2.id, aMove: "paper", bMove: "rock", save: "main", now: T0 + 3 });
    expect(findPlayer(after, P1.id)!.streak).toBe(1); // ชนะนอกรอบก็ไม่เพิ่ม
    expect(findPlayer(after, P2.id)!.pointerIndex).toBe(1); // ตัวชี้ไม่ขยับ
  });

  it("แพ้นอกรอบก็ไม่ตัดสตรีค", () => {
    let state = armWith(base(), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 1).state, T0 + 2);
    expect(findPlayer(state, P1.id)!.streak).toBe(1);
    const { state: after } = performOffRoundDuel(state, { aId: P1.id, bId: P2.id, aMove: "rock", bMove: "paper", save: "main", now: T0 + 3 });
    expect(findPlayer(after, P1.id)!.streak).toBe(1);
  });

  it("เลือกคนเดียวกันสองฝั่งไม่ได้", () => {
    expect(() => performOffRoundDuel(base(), { aId: P1.id, bId: P1.id, aMove: "rock", bMove: "rock", save: "none", now: T0 })).toThrow(/คนละคน/);
  });

  it("ดวลกับ Aek (ซุป): ผู้เล่นได้คะแนนปกติ · Aek ไม่มีในผู้เล่น/ไม่ได้คะแนน", () => {
    const { state, duel } = performOffRoundDuel(base(), { aId: P1.id, bId: AEK_ID, aMove: "rock", bMove: "scissors", save: "main", now: T0 + 1 });
    expect(findPlayer(state, P1.id)!.mainScoreTenths).toBe(320); // P1 ชนะได้ปกติ +2.0
    expect(findPlayer(state, P1.id)!.stats.asChallenger.win).toBe(1);
    expect(findPlayer(state, AEK_ID)).toBeUndefined(); // Aek ไม่เข้า players
    expect(state.players).toHaveLength(4);
    expect(duel.opponentName).toBe("Aek");
    expect(duel.opponentDeltaTenths).toBe(0); // Aek ไม่ได้/ไม่เสียคะแนน
  });
});

describe("จอ 'ระหว่างที่คุณไม่อยู่'", () => {
  it("เห็นเฉพาะครั้งที่ถูกท้าหลังจากรอบล่าสุดของตัวเอง", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 11);
    state = endRound(startRound(state, P2.id, T0 + 20), T0 + 21); // P2 เข้ามาแล้วออก
    state = endRound(duelOnce(state, P3.id, P2.id, "paper", T0 + 30).state, T0 + 31);

    const recap = awayRecapFor(state, P2.id);
    expect(recap.entries).toHaveLength(1); // เห็นเฉพาะครั้งหลัง T0+21
    expect(recap.entries[0].duel.challengerId).toBe(P3.id);
    expect(recap.entries[0].outcome).toBe("lose");
    expect(recap.totalDeltaTenths).toBe(-20);
  });

  it("ไม่มีใครท้าเลย = รายการว่าง ไม่พัง", () => {
    const recap = awayRecapFor(makeTestState(4), P1.id);
    expect(recap.entries).toEqual([]);
    expect(recap.totalDeltaTenths).toBe(0);
    expect(recap.farmers).toEqual([]);
  });

  it("ป้ายเตือน 'โดนไล่เก็บ' ขึ้นเมื่อคนเดิมท้าครบเกณฑ์และชนะเกินครึ่ง", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    for (let i = 0; i < 3; i++) {
      state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10 + i).state, T0 + 10 + i);
    }
    const recap = awayRecapFor(state, P2.id);
    expect(recap.farmers).toHaveLength(1);
    expect(recap.farmers[0].id).toBe(P1.id);
    expect(recap.farmers[0].duels).toBe(3);
    expect(recap.farmers[0].wins).toBe(3);
  });

  it("ท้าครบเกณฑ์แต่ชนะไม่เกินครึ่ง = ไม่เตือน", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 10); // ชนะ
    state = endRound(duelOnce(state, P1.id, P2.id, "scissors", T0 + 11).state, T0 + 11); // แพ้
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", T0 + 12).state, T0 + 12); // เสมอ
    expect(awayRecapFor(state, P2.id).farmers).toEqual([]);
  });
});

describe("ประวัติ", () => {
  it("เห็นทั้งตอนเป็นผู้เล่นและผู้ท้าชิง เรียงใหม่สุดก่อน", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 11);
    state = endRound(duelOnce(state, P2.id, P3.id, "rock", T0 + 20).state, T0 + 21);
    const history = historyFor(state, P2.id);
    expect(history).toHaveLength(2);
    expect(history[0].at).toBe(T0 + 20);
  });

  it("ลบผู้เล่นแล้วประวัติเก่ายังอ่านชื่อได้ (spec §16 ข้อ 13)", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 11);
    state = removePlayer(state, P1.id);
    expect(findPlayer(state, P1.id)).toBeUndefined();
    expect(state.duels[0].challengerName).toBe(P1.name);
  });

  it("ลบคนที่กำลังอยู่ในรอบที่เปิดค้างไม่ได้", () => {
    const state = startRound(makeTestState(4), P1.id, T0 + 1);
    expect(removeBlockedReason(state, P1.id)).toMatch(/เปิดค้าง/);
    expect(() => removePlayer(state, P1.id)).toThrow();
  });
});

describe("ซีซั่น", () => {
  it("จบซีซั่นแล้วบันทึก record พร้อมอันดับและชุดมูฟสุดท้าย", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 11);
    state = endSeason(state, T0 + 999);

    expect(state.records).toHaveLength(1);
    const record = state.records[0];
    expect(record.id).toBe("SS1");
    expect(record.totalDuels).toBe(1);
    expect(record.rows[0].rank).toBe(1);
    expect(record.rows[0].playerId).toBe(P1.id); // ชนะไป +4 นำอยู่
    expect(record.rows[0].finalMoveSet).not.toBeNull();
  });

  it("เปิดซีซั่นใหม่: คะแนนกลับ 30 · ล้างชุดมูฟทุกคน · ล้างสถิติ", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 11);
    state = startNewSeason(endSeason(state, T0 + 999), T0 + 1000);

    expect(state.season.id).toBe("SS2");
    expect(state.duels).toEqual([]);
    for (const player of state.players) {
      expect(player.mainScoreTenths).toBe(300);
      expect(player.subScore).toBe(0);
      expect(player.moveSet).toBeNull(); // ← ช่วงเวลา relax ต้องมาตั้งใหม่
      expect(player.pointerIndex).toBe(0);
      expect(player.streak).toBe(0);
      expect(player.stats.asChallenger.win).toBe(0);
    }
  });

  it("record ซีซั่นเก่ายังอยู่ครบหลังเปิดซีซั่นใหม่", () => {
    let state = endSeason(makeTestState(4), T0 + 999);
    state = startNewSeason(state, T0 + 1000);
    expect(state.records).toHaveLength(1);
    expect(state.records[0].id).toBe("SS1");
  });

  it("ไม่มีใครลงสังเวียนเลย ก็ยังเปิดรายการให้ท้าไม่ได้หลังซีซั่นใหม่", () => {
    let state = startNewSeason(endSeason(makeTestState(4), T0 + 999), T0 + 1000);
    expect(challengeableIds(state, P1.id)).toEqual([]);
    state = startRound(state, P1.id, T0 + 1001);
    expect(duelBlockedReason(state, P1.id)).toMatch(/ตั้งชุดมูฟก่อน/);
  });
});

describe("ปรับค่าเกมในหน้าตั้งค่า", () => {
  it("ตั้งค่าปกติ = บันทึกตามที่ตั้ง", () => {
    const next = updateConfig(makeTestState(2), {
      startScore: 50,
      movePickSeconds: 45,
      pickedRates: { win: 6, draw: 2, lose: -4 },
    });
    expect(next.config.startScore).toBe(50);
    expect(next.config.movePickSeconds).toBe(45);
    expect(next.config.pickedRates).toEqual({ win: 6, draw: 2, lose: -4 });
    expect(next.config.coinCost).toBe(3); // ค่าที่ไม่ได้แตะต้องคงเดิม
  });

  it("ค่าประหลาดถูกบีบเข้าขอบเขต ไม่ทำเกมพัง", () => {
    const next = updateConfig(makeTestState(2), {
      startScore: -5,
      movePickSeconds: 9999,
      streakStepPercent: 250,
      pickedRates: { win: 999, draw: 0, lose: -999 },
    });
    expect(next.config.startScore).toBe(configLimits.startScore.min);
    expect(next.config.movePickSeconds).toBe(configLimits.movePickSeconds.max);
    expect(next.config.streakStepPercent).toBe(configLimits.streakStepPercent.max);
    expect(next.config.pickedRates.win).toBe(configLimits.rate.max);
    expect(next.config.pickedRates.lose).toBe(configLimits.rate.min);
  });

  it("NaN / ทศนิยม → ปัดเป็นจำนวนเต็มหรือคืนค่าเดิม ไม่กลายเป็น NaN", () => {
    const next = updateConfig(makeTestState(2), { startScore: Number.NaN, coinCost: 4.6 });
    expect(next.config.startScore).toBe(30);
    expect(next.config.coinCost).toBe(5);
  });

  it("ปรับคะแนนตั้งต้นไม่ย้อนไปแก้คะแนนของคนที่เล่นอยู่", () => {
    const state = makeTestState(2);
    const before = state.players[0].mainScoreTenths;
    const next = updateConfig(state, { startScore: 99 });
    expect(next.players[0].mainScoreTenths).toBe(before);
  });

  it("ความดัง TV: เก็บทศนิยม (ไม่ปัดเป็นจำนวนเต็ม) + ไม่หายเมื่อปรับค่าอื่น", () => {
    const next = updateConfig(makeTestState(2), { tvVolume: 0.65 });
    expect(next.config.tvVolume).toBe(0.65);
    // ปรับ field อื่นต่อ — tvVolume ต้องคงอยู่ ไม่ถูกรีเซต (updateConfig ระบุ field เจาะจง)
    const after = updateConfig(next, { startScore: 40 });
    expect(after.config.tvVolume).toBe(0.65);
  });

  it("ความดัง TV: ค่าสกปรกถูกบีบเข้า 0–1 (เกิน/ติดลบ/NaN)", () => {
    expect(updateConfig(makeTestState(2), { tvVolume: 3 }).config.tvVolume).toBe(2);
    expect(updateConfig(makeTestState(2), { tvVolume: -2 }).config.tvVolume).toBe(0);
    // NaN → คืนค่าเดิม (default 0.85) ไม่กลายเป็น NaN
    expect(updateConfig(makeTestState(2), { tvVolume: Number.NaN }).config.tvVolume).toBe(1);
  });
});

describe("ลบประวัติแล้วคำนวณคะแนนใหม่", () => {
  function play(state: ReturnType<typeof makeTestState>, a: string, b: string, move: "rock" | "scissors" | "paper", now: number) {
    const opened = startRound(state, a, now);
    const result = performDuel(opened, { challengerId: a, opponentId: b, wasRandomPick: false, challengerMove: move, now });
    return endRound(result.state, now + 1);
  }

  it("ลบดวลตอนทดสอบทิ้ง แล้วคะแนน/สถิติ/ตัวชี้กลับไปเหมือนไม่เคยดวลนั้น", () => {
    let state = makeTestState(2);
    const start = state.players.find((p) => p.id === "A101")!.mainScoreTenths;
    // ดวลจริง 1 ครั้ง (เก็บ) + ดวลทดสอบ 1 ครั้ง (จะลบ)
    state = play(state, "A101", "B202", "rock", 100); // A ออกค้อน
    const realId = state.duels[state.duels.length - 1].id;
    state = play(state, "A101", "B202", "scissors", 200); // ดวลทดสอบ
    const testId = state.duels[state.duels.length - 1].id;
    const afterBothA = state.players.find((p) => p.id === "A101")!.mainScoreTenths;

    const cleaned = deleteDuels(state, [testId]);
    const a = cleaned.players.find((p) => p.id === "A101")!;
    const b = cleaned.players.find((p) => p.id === "B202")!;
    expect(cleaned.duels.map((d) => d.id)).toEqual([realId]); // เหลือแค่ดวลจริง
    // คะแนนต้องเท่ากับตอนดวลจริงครั้งเดียว ไม่ใช่สองครั้ง
    const afterRealOnly = deleteDuels(state, [testId, realId]); // ลบหมด = กลับจุดเริ่ม
    expect(afterRealOnly.players.find((p) => p.id === "A101")!.mainScoreTenths).toBe(start);
    expect(a.mainScoreTenths).toBeLessThan(afterBothA); // คะแนนลดลงเพราะตัดดวลทดสอบออก
    // ตัวชี้ของคู่แข่งเดินตามจำนวนดวลที่เหลือ (1 ครั้ง)
    expect(b.pointerIndex).toBe(1);
    // สถิติ mainDuels ของ A เหลือ 1
    expect(a.stats.asChallenger.mainDuels).toBe(1);
  });

  it("ลบดวลกลางสาย สตรีคของดวลที่เหลือถูกคิดใหม่ต่อเนื่อง", () => {
    let state = makeTestState(2);
    // A ชนะ 3 ครั้งติด (ค้อน vs กรรไกร — ตั้ง moveset B เป็นกรรไกรล้วน)
    state = armWith(state, "B202", ["scissors", "scissors", "scissors"]);
    state = play(state, "A101", "B202", "rock", 100);
    const midId = state.duels[state.duels.length - 1].id;
    state = play(state, "A101", "B202", "rock", 200);
    state = play(state, "A101", "B202", "rock", 300);
    expect(state.players.find((p) => p.id === "A101")!.streak).toBe(3);

    // ลบดวลกลาง → เหลือ 2 ครั้ง สตรีคต้องเป็น 2 (ไม่ใช่ 3)
    const cleaned = deleteDuels(state, [midId]);
    expect(cleaned.players.find((p) => p.id === "A101")!.streak).toBe(2);
    expect(cleaned.duels).toHaveLength(2);
  });

  it("recompute หลังลบประวัตินับ moveCount เหมือน performDuel: เฉพาะคู่แข่งในดวลหลัก", () => {
    let state = armWith(makeTestState(4), P2.id, ["scissors", "paper", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "rock", 100).state, 101); // P2 ถูกท้า ออก scissors
    state = performOffRoundDuel(state, { aId: P1.id, bId: P2.id, aMove: "paper", bMove: "rock", save: "main", now: 200 }).state;
    state = performOffRoundDuel(state, { aId: P2.id, bId: P1.id, aMove: "scissors", bMove: "paper", save: "sub", now: 300 }).state;
    state = endRound(duelOnce(state, P1.id, P2.id, "scissors", 400).state, 401); // P2 ถูกท้า ออก paper

    expectMoveCount(state, P1.id, emptyMoveCount);
    expectMoveCount(state, P2.id, { rock: 0, scissors: 1, paper: 1 });

    const recomputed = deleteDuels(state, []);
    expectMoveCount(recomputed, P1.id, emptyMoveCount);
    expectMoveCount(recomputed, P2.id, { rock: 0, scissors: 1, paper: 1 });
  });

  it("มีรอบเปิดค้างอยู่ → ลบประวัติไม่ได้", () => {
    let state = makeTestState(2);
    state = startRound(state, "A101", 100);
    expect(() => deleteDuels(state, [])).toThrow(/จบรอบ/);
  });
});
