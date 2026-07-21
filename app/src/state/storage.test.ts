import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSave, loadState, saveState } from "./storage";
import { makeTestState, T0 } from "./testUtils";

const KEY = "rps-arena/save-v1";

// jsdom ที่นี่ให้ localStorage เป็น object เปล่า — stub ด้วย Map (บทเรียนจากเกมที่ 1)
function stubStorage(): Map<string, string> {
  const map = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  });
  return map;
}

/** จำลอง storage ที่ใช้ไม่ได้เลย (Safari private mode) */
function stubBrokenStorage(errorName: string): void {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new DOMException("nope", errorName);
    },
    setItem: () => {
      throw new DOMException("nope", errorName);
    },
    removeItem: () => {
      throw new DOMException("nope", errorName);
    },
  });
}

describe("โหลด/บันทึกเซฟ", () => {
  beforeEach(() => stubStorage());

  it("ยังไม่เคยเล่น = เริ่มใหม่", () => {
    const result = loadState(T0);
    expect(result.kind).toBe("fresh");
    expect(result.state.players).toEqual([]);
    expect(result.state.season.id).toBe("SS1");
  });

  it("บันทึกแล้วโหลดคืนได้ครบ", () => {
    const state = makeTestState(4);
    expect(saveState(state)).toBeNull();
    const result = loadState(T0);
    expect(result.kind).toBe("loaded");
    expect(result.state.players).toHaveLength(4);
    expect(result.state.players[0].moveSet).toEqual(["rock", "scissors", "paper"]);
  });

  it("JSON พัง → เริ่มใหม่พร้อมบอกเหตุผล ไม่ทำแอปล้ม", () => {
    localStorage.setItem(KEY, "{ไม่ใช่ json");
    const result = loadState(T0);
    expect(result.kind).toBe("recovered");
    expect(result.state.players).toEqual([]);
    if (result.kind === "recovered") expect(result.reason).toMatch(/เสียหาย/);
  });

  it("รูปแบบไม่ใช่ state ของเกม → เริ่มใหม่พร้อมบอกเหตุผล", () => {
    localStorage.setItem(KEY, JSON.stringify({ hello: "world" }));
    const result = loadState(T0);
    expect(result.kind).toBe("recovered");
  });

  it("เซฟเก่าที่ config ขาด field ใหม่ → เติมค่า default ให้", () => {
    const state = makeTestState(1);
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...state, config: { startScore: 50, pickedRates: { win: 9 } } }),
    );
    const result = loadState(T0);
    expect(result.state.config.startScore).toBe(50); // ค่าที่เจ้านายเคยตั้งไว้ยังอยู่
    expect(result.state.config.pickedRates.win).toBe(9);
    expect(result.state.config.pickedRates.lose).toBe(-3); // field ที่ขาดถูกเติม
    expect(result.state.config.offRoundRates.win).toBe(2);
    expect(result.state.config.movePickSeconds).toBe(30);
  });

  it("เซฟเวอร์ชัน 1 (ศัพท์เก่า) → แปลงเป็นศัพท์ใหม่ครบ ไม่มีข้อมูลหาย", () => {
    const base = makeTestState(2);
    const v1 = {
      ...base,
      version: 1,
      config: { ...base.config, challengerRates: { win: 7, draw: 1, lose: -2 }, opponentRates: undefined },
      round: { playerId: "P1", startedAt: T0, duelDone: false, moveSetConfirmed: true },
      players: base.players.map((player) => ({
        ...player,
        stats: {
          asPlayer: { win: 5, draw: 1, lose: 2, mainDuels: 8 },
          asChallenger: { win: 3, draw: 0, lose: 4 },
          moveCount: { rock: 1, scissors: 2, paper: 3 },
        },
      })),
      duels: [
        {
          id: "d1",
          at: T0,
          mode: "main",
          playerId: "P1",
          playerName: "คนท้า",
          challengerId: "P2",
          challengerName: "คนถูกท้า",
          wasRandomPick: false,
          playerMove: "rock",
          challengerMove: "scissors",
          playerOutcome: "win",
          playerDeltaTenths: 40,
          challengerDeltaTenths: -20,
          playerSubDelta: 0,
          challengerSubDelta: 0,
          streakAfter: 1,
        },
      ],
    };
    localStorage.setItem(KEY, JSON.stringify(v1));

    const result = loadState(T0);
    expect(result.kind).toBe("loaded");
    const duel = result.state.duels[0];
    // ผู้ท้าชิง = คนที่จ่ายเหรียญมาท้า (เดิมชื่อ player)
    expect(duel.challengerId).toBe("P1");
    expect(duel.challengerName).toBe("คนท้า");
    expect(duel.challengerMove).toBe("rock");
    expect(duel.challengerOutcome).toBe("win");
    expect(duel.challengerDeltaTenths).toBe(40);
    // คู่แข่ง = คนถูกท้า (เดิมชื่อ challenger)
    expect(duel.opponentId).toBe("P2");
    expect(duel.opponentName).toBe("คนถูกท้า");
    expect(duel.opponentMove).toBe("scissors");
    expect(duel.opponentDeltaTenths).toBe(-20);
    // ไม่มีชื่อเก่าหลงเหลือ
    expect((duel as unknown as Record<string, unknown>).playerId).toBeUndefined();
    // สถิติย้ายบทบาทถูกฝั่ง
    expect(result.state.players[0].stats.asChallenger.mainDuels).toBe(8);
    expect(result.state.players[0].stats.asChallenger.win).toBe(5);
    expect(result.state.players[0].stats.asOpponent.lose).toBe(4);
    // รอบค้าง + เรทใน config ตามมาด้วย
    expect(result.state.round?.challengerId).toBe("P1");
    expect(result.state.config.opponentRates.win).toBe(7);
    expect(result.state.version).toBe(2);
  });

  it("เซฟเวอร์ชัน 2 โหลดซ้ำแล้วไม่ถูกแปลงซ้ำ", () => {
    const state = makeTestState(2);
    expect(saveState(state)).toBeNull();
    const once = loadState(T0);
    expect(saveState(once.state)).toBeNull();
    const twice = loadState(T0);
    expect(twice.state.players[0].stats.asChallenger.mainDuels).toBe(0);
    expect(twice.state.config.opponentRates.win).toBe(3);
  });

  it("ล้างเซฟแล้วกลับไปเริ่มใหม่", () => {
    saveState(makeTestState(4));
    clearSave();
    expect(loadState(T0).kind).toBe("fresh");
  });
});

describe("storage ใช้ไม่ได้ (private mode / โควตาเต็ม) — ห้ามพังเงียบ", () => {
  it("อ่านไม่ได้ → เริ่มใหม่พร้อมบอกเหตุผล", () => {
    stubBrokenStorage("SecurityError");
    const result = loadState(T0);
    expect(result.kind).toBe("recovered");
    if (result.kind === "recovered") expect(result.reason).toMatch(/อ่าน/);
  });

  it("โควตาเต็ม → คืนข้อความเตือนที่บอกว่าเล่นต่อได้", () => {
    stubBrokenStorage("QuotaExceededError");
    const message = saveState(makeTestState(1));
    expect(message).toMatch(/เต็ม/);
    expect(message).toMatch(/เล่นต่อได้/);
  });

  it("โหมดส่วนตัว → คืนข้อความเตือน ไม่ throw", () => {
    stubBrokenStorage("SecurityError");
    expect(() => saveState(makeTestState(1))).not.toThrow();
    expect(saveState(makeTestState(1))).toMatch(/บันทึกเกมไม่ได้/);
  });

  it("ลบเซฟตอน storage พัง ก็ไม่ throw", () => {
    stubBrokenStorage("SecurityError");
    expect(() => clearSave()).not.toThrow();
  });
});
