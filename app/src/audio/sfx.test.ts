import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMuted, playSfx, resetSfxForTest, toggleMuted, unlockAudio } from "./sfx";

/** localStorage ปลอมแบบ Map (jsdom ที่นี่ให้ object เปล่า — บทเรียนจากเกมที่ 1) */
function stubStorage(): Map<string, string> {
  const map = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  });
  return map;
}

describe("ระบบเสียง", () => {
  beforeEach(() => {
    stubStorage();
    vi.unstubAllGlobals();
    stubStorage();
    // เครื่องที่ไม่มี Web Audio เลย (เหมือน jsdom จริงๆ)
    vi.stubGlobal("window", { AudioContext: undefined });
    resetSfxForTest();
  });

  it("ไม่มี Web Audio → เล่นเสียงแล้วเงียบ ไม่ throw", () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => playSfx("clash")).not.toThrow();
    expect(() => playSfx("champion")).not.toThrow();
  });

  it("ชื่อเสียงที่ไม่รู้จัก → ไม่ throw", () => {
    expect(() => playSfx("ไม่มีจริง" as never)).not.toThrow();
  });

  it("สลับปิด/เปิดเสียงแล้วจำค่าไว้", () => {
    expect(isMuted()).toBe(false);
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem("rps-arena/muted")).toBe("1");
    expect(toggleMuted()).toBe(false);
    expect(localStorage.getItem("rps-arena/muted")).toBe("0");
  });

  it("เปิดเกมมาโดยเคยปิดเสียงไว้ → ยังปิดอยู่", () => {
    localStorage.setItem("rps-arena/muted", "1");
    resetSfxForTest();
    expect(isMuted()).toBe(true);
  });

  it("localStorage ใช้ไม่ได้ (โหมดส่วนตัว) → ยังสลับเสียงได้ ไม่ throw", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("nope");
      },
      setItem: () => {
        throw new Error("nope");
      },
      removeItem: () => undefined,
    });
    resetSfxForTest();
    expect(isMuted()).toBe(false);
    expect(() => toggleMuted()).not.toThrow();
    expect(isMuted()).toBe(true);
  });

  it("มี Web Audio → สร้าง context ตอนแตะครั้งแรก แล้วต่อ node ครบ", () => {
    const connect = vi.fn();
    const start = vi.fn();
    const stop = vi.fn();
    const gainNode = () => ({ gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect });
    const created: string[] = [];
    class FakeCtx {
      currentTime = 0;
      sampleRate = 44100;
      state = "running";
      destination = {};
      createGain() {
        created.push("gain");
        return gainNode();
      }
      createOscillator() {
        created.push("osc");
        return {
          type: "square",
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect,
          start,
          stop,
        };
      }
      createBuffer() {
        return { getChannelData: () => new Float32Array(16) };
      }
      createBufferSource() {
        return { buffer: null, connect, start };
      }
      createBiquadFilter() {
        return { type: "", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect };
      }
      resume() {
        return Promise.resolve();
      }
    }
    vi.stubGlobal("window", { AudioContext: FakeCtx });
    resetSfxForTest();

    unlockAudio();
    playSfx("win");
    expect(created.filter((node) => node === "osc").length).toBe(4); // แฟนฟาร์ 4 โน้ต
    expect(start).toHaveBeenCalledTimes(4);
  });

  it("ปิดเสียงอยู่ → ไม่สร้าง oscillator เลย", () => {
    const start = vi.fn();
    class FakeCtx {
      currentTime = 0;
      sampleRate = 44100;
      state = "running";
      destination = {};
      createGain() {
        return { gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
      createOscillator() {
        return {
          type: "square",
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start,
          stop: vi.fn(),
        };
      }
      resume() {
        return Promise.resolve();
      }
    }
    vi.stubGlobal("window", { AudioContext: FakeCtx });
    localStorage.setItem("rps-arena/muted", "1");
    resetSfxForTest();

    playSfx("win");
    expect(start).not.toHaveBeenCalled();
  });
});
