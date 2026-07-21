import { describe, expect, it } from "vitest";
import { createPersistentStore } from "../persistence/storage";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(_key: string): string | null {
    throw new Error("private mode");
  }
  override setItem(_key: string, _value: string): void {
    throw new Error("quota exceeded");
  }
}

describe("persistent store", () => {
  it("round-trips serializable game state and reports healthy storage", () => {
    const storage = new MemoryStorage();
    const store = createPersistentStore("arena", { version: 1 }, storage);

    expect(store.load()).toEqual({ value: { version: 1 }, available: true });
    expect(store.save({ version: 2 })).toEqual({ ok: true });
    expect(store.load()).toEqual({ value: { version: 2 }, available: true });
  });

  it("falls back without throwing when local storage is unavailable", () => {
    const store = createPersistentStore("arena", { version: 1 }, new ThrowingStorage());

    const loaded = store.load();
    const saved = store.save({ version: 2 });

    expect(loaded.available).toBe(false);
    expect(loaded.value).toEqual({ version: 1 });
    expect(saved.ok).toBe(false);
    expect(saved.message).toContain("บันทึกข้อมูลในเครื่องไม่ได้");
  });
});
