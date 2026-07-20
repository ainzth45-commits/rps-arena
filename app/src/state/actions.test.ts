import { describe, expect, it } from "vitest";
import {
  addPlayer,
  confirmMoveSet,
  duelBlockedReason,
  editPlayer,
  endRound,
  endSeason,
  isValidPlayerCode,
  performDuel,
  performOffRoundDuel,
  removeBlockedReason,
  removePlayer,
  startNewSeason,
  startRound,
} from "./actions";
import { awayRecapFor, challengeableIds, createInitialState, findPlayer, historyFor, isInArena } from "./gameState";
import { armWith, makeTestState, T0, TEST_PLAYERS } from "./testUtils";

const [P1, P2, P3] = TEST_PLAYERS;

/** ผู้เล่นดวลหนึ่งครั้ง — คืน state ใหม่ */
function duelOnce(
  state: ReturnType<typeof makeTestState>,
  playerId: string,
  challengerId: string,
  playerMove: Parameters<typeof performDuel>[1]["playerMove"],
  now: number,
  wasRandomPick = false,
) {
  const opened = state.round ? state : startRound(state, playerId, now);
  return performDuel(opened, { playerId, challengerId, wasRandomPick, playerMove, now });
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
      expect(result.duel.challengerMove).toBe(expected);
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
    expect(duel.playerOutcome).toBe("win");
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

  it("สถิติแยกบทบาทถูกต้อง + เรตมูฟนับทั้งสองฝั่ง", () => {
    const state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    const { state: after } = duelOnce(state, P1.id, P2.id, "rock", T0 + 1);
    const player = findPlayer(after, P1.id)!;
    const challenger = findPlayer(after, P2.id)!;
    expect(player.stats.asPlayer).toEqual({ win: 1, draw: 0, lose: 0, mainDuels: 1 });
    expect(player.stats.moveCount.rock).toBe(1);
    expect(challenger.stats.asChallenger).toEqual({ win: 0, draw: 0, lose: 1 });
    expect(challenger.stats.moveCount.scissors).toBe(1);
  });

  it("สตรีคสะสมแล้วคูณคะแนนถูกต้อง (4.0 → 4.4 → 4.8)", () => {
    let state = armWith(makeTestState(4), P2.id, ["scissors", "scissors", "scissors"]);
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const result = duelOnce(state, P1.id, P2.id, "rock", T0 + i + 1);
      gains.push(result.duel.playerDeltaTenths);
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
    expect(findPlayer(after, P1.id)!.stats.asPlayer.lose).toBe(1);
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
    expect(() => performDuel(after, { playerId: P1.id, challengerId: P2.id, wasRandomPick: false, playerMove: "rock", now: T0 + 2 })).toThrow();
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
    expect(() => performDuel(state, { playerId: P1.id, challengerId: P1.id, wasRandomPick: false, playerMove: "rock", now: T0 + 2 })).toThrow(/ท้าตัวเอง/);
  });

  it("เปิดรอบซ้อนไม่ได้", () => {
    const state = startRound(makeTestState(4), P1.id, T0 + 1);
    expect(() => startRound(state, P2.id, T0 + 2)).toThrow(/เปิดค้าง/);
  });
});

describe("ดวลนอกรอบ (spec §10)", () => {
  const base = () => makeTestState(4);

  it("บันทึกเป็นคะแนนหลัก: เรทเบา +2/−1 · นับสถิติ · แต่ไม่นับ mainDuels", () => {
    const { state } = performOffRoundDuel(base(), { aId: P1.id, bId: P2.id, aMove: "rock", bMove: "scissors", save: "main", now: T0 + 1 });
    expect(findPlayer(state, P1.id)!.mainScoreTenths).toBe(320);
    expect(findPlayer(state, P2.id)!.mainScoreTenths).toBe(290);
    expect(findPlayer(state, P1.id)!.stats.asPlayer.win).toBe(1);
    expect(findPlayer(state, P1.id)!.stats.asPlayer.mainDuels).toBe(0); // ← ไม่ให้ไต่อันดับชั้น 4
    expect(findPlayer(state, P1.id)!.stats.moveCount.rock).toBe(1);
  });

  it("บันทึกเป็นคะแนนรอง: เข้าคอลัมน์แยก ไม่แตะคะแนนหลัก ไม่แตะสถิติ", () => {
    const { state } = performOffRoundDuel(base(), { aId: P1.id, bId: P2.id, aMove: "rock", bMove: "scissors", save: "sub", now: T0 + 1 });
    expect(findPlayer(state, P1.id)!.mainScoreTenths).toBe(300);
    expect(findPlayer(state, P1.id)!.subScore).toBe(2);
    expect(findPlayer(state, P2.id)!.subScore).toBe(-1);
    expect(findPlayer(state, P1.id)!.stats.asPlayer.win).toBe(0);
    expect(findPlayer(state, P1.id)!.stats.moveCount.rock).toBe(0);
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
});

describe("จอ 'ระหว่างที่คุณไม่อยู่'", () => {
  it("เห็นเฉพาะครั้งที่ถูกท้าหลังจากรอบล่าสุดของตัวเอง", () => {
    let state = armWith(makeTestState(4), P2.id, ["rock", "rock", "rock"]);
    state = endRound(duelOnce(state, P1.id, P2.id, "paper", T0 + 10).state, T0 + 11);
    state = endRound(startRound(state, P2.id, T0 + 20), T0 + 21); // P2 เข้ามาแล้วออก
    state = endRound(duelOnce(state, P3.id, P2.id, "paper", T0 + 30).state, T0 + 31);

    const recap = awayRecapFor(state, P2.id);
    expect(recap.entries).toHaveLength(1); // เห็นเฉพาะครั้งหลัง T0+21
    expect(recap.entries[0].duel.playerId).toBe(P3.id);
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
    expect(state.duels[0].playerName).toBe(P1.name);
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
      expect(player.stats.asPlayer.win).toBe(0);
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
