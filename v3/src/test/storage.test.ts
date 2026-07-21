import { describe, expect, it } from "vitest";
import { createGame } from "../domain/game";
import { createPersistentStore } from "../persistence/storage";

function memoryStorage(overrides: Partial<Storage> = {}): Storage {
  const bag = new Map<string, string>();
  return {
    length: 0,
    clear: () => bag.clear(),
    getItem: (key) => bag.get(key) ?? null,
    key: () => null,
    removeItem: (key) => void bag.delete(key),
    setItem: (key, value) => void bag.set(key, value),
    ...overrides,
  };
}

describe("local persistence", () => {
  it("loads fallback with a visible warning instead of silently failing when localStorage is blocked", () => {
    const store = createPersistentStore("x", createGame(), memoryStorage({ getItem: () => { throw new Error("blocked"); } }));
    const loaded = store.load();

    expect(loaded.available).toBe(false);
    expect(loaded.message).toMatch(/บันทึกข้อมูลในเครื่องไม่ได้/);
    expect(loaded.value.seasonId).toBe("SS1");
  });

  it("returns a visible save warning for quota or private-mode failures", () => {
    const store = createPersistentStore("x", createGame(), memoryStorage({ setItem: () => { throw new DOMException("full", "QuotaExceededError"); } }));

    expect(store.save(createGame())).toEqual({
      ok: false,
      message: "บันทึกข้อมูลในเครื่องไม่ได้: พื้นที่เต็มหรือเบราว์เซอร์ปิด localStorage",
    });
  });
});
