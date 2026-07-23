import { describe, expect, it } from "vitest";
import { displayRoomCode, isValidRoomCode, makeRoomCode, normalizeRoomCode, roomChannel } from "./roomCode";

describe("รหัสห้องเชื่อม TV", () => {
  it("สุ่มรหัส 4 หลักเสมอ (เติม 0 หน้าถ้าสั้น)", () => {
    expect(makeRoomCode(() => 0)).toBe("0000");
    expect(makeRoomCode(() => 0.4821)).toBe("4821");
    expect(makeRoomCode(() => 0.9999)).toHaveLength(4);
    // ค่าขอบ ~1 ต้องไม่หลุดเป็น 5 หลัก
    expect(makeRoomCode(() => 0.99999999)).toHaveLength(4);
  });

  it("normalize รับได้ทั้งเลขล้วน มีช่องว่าง และมี prefix", () => {
    expect(normalizeRoomCode("4821")).toBe("4821");
    expect(normalizeRoomCode("  4821 ")).toBe("4821");
    expect(normalizeRoomCode("ARENA-4821")).toBe("4821");
    expect(normalizeRoomCode("arena 4821")).toBe("4821");
  });

  it("รหัสผิด (สั้น/ยาว/ว่าง) → null และ isValid = false", () => {
    expect(normalizeRoomCode("482")).toBeNull();
    expect(normalizeRoomCode("48210")).toBeNull();
    expect(normalizeRoomCode("")).toBeNull();
    expect(normalizeRoomCode("abcd")).toBeNull();
    expect(isValidRoomCode("482")).toBe(false);
    expect(isValidRoomCode("4821")).toBe(true);
  });

  it("ประกอบ channel และข้อความโชว์ถูกต้อง", () => {
    expect(roomChannel("4821")).toBe("arena-4821");
    expect(displayRoomCode("4821")).toBe("ARENA-4821");
  });
});
