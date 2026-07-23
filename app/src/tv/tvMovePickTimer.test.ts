import { describe, expect, it } from "vitest";
import {
  movePickDeadlineFromSecondsLeft,
  movePickSecondsLeftFromDeadline,
  shouldRefreshMovePickDeadline,
} from "./tvMovePickTimer";

describe("TV move-pick local timer", () => {
  it("ตั้ง local deadline จาก secondsLeft แบบ relative ของ iPad", () => {
    expect(movePickDeadlineFromSecondsLeft(20, 1_000)).toBe(21_000);
    expect(movePickSecondsLeftFromDeadline(21_000, 1_000)).toBe(20);
  });

  it("ไม่ reset timer เมื่อ re-broadcast จาก move preview ทำให้เวลาต่างไม่เกิน 1 วิ", () => {
    const localDeadline = movePickDeadlineFromSecondsLeft(20, 1_000);

    expect(shouldRefreshMovePickDeadline(localDeadline, 19, false, 1_500)).toBe(false);
  });

  it("reset timer เมื่อ snapshot/reconnect ได้เวลาที่ต่างจริงหรือ totalSeconds เปลี่ยน", () => {
    const localDeadline = movePickDeadlineFromSecondsLeft(20, 1_000);

    expect(shouldRefreshMovePickDeadline(localDeadline, 14, false, 1_500)).toBe(true);
    expect(shouldRefreshMovePickDeadline(localDeadline, 19, true, 1_500)).toBe(true);
  });
});
