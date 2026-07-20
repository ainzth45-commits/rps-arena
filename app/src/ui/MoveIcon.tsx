// ท่ามือเป่ายิ้งฉุบ — ตอนนี้ใช้อิโมจิไปก่อน รอ asset จริงจาก Codex (P7) แล้วสลับเป็นรูป
import type { Move } from "../domain/types";

export const moveLabel: Record<Move, string> = {
  rock: "ค้อน",
  scissors: "กรรไกร",
  paper: "กระดาษ",
};

/** ท่ามือจริงของเป่ายิ้งฉุบ — ค้อน=กำหมัด · กรรไกร=สองนิ้ว · กระดาษ=แบมือ */
export const moveEmoji: Record<Move, string> = {
  rock: "✊",
  scissors: "✌️",
  paper: "✋",
};

export function MoveIcon({ move, size = 56 }: { move: Move; size?: number }) {
  return (
    <span role="img" aria-label={moveLabel[move]} style={{ fontSize: size, lineHeight: 1 }}>
      {moveEmoji[move]}
    </span>
  );
}
