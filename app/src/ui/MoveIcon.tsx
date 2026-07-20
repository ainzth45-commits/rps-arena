// ท่ามือเป่ายิ้งฉุบ — ใช้รูปจริง (ตัดมาจากธีมหลัก) · อิโมจิเป็นแค่ fallback ถ้ารูปโหลดไม่ขึ้น
import { useState } from "react";
import { gameAssets } from "../data/assets";
import type { Move } from "../domain/types";

export const moveLabel: Record<Move, string> = {
  rock: "ค้อน",
  scissors: "กรรไกร",
  paper: "กระดาษ",
};

/** ท่ามือจริงของเป่ายิ้งฉุบ — ค้อน=กำหมัด · กรรไกร=สองนิ้ว · กระดาษ=แบมือ */
const fallbackEmoji: Record<Move, string> = {
  rock: "✊",
  scissors: "✌️",
  paper: "✋",
};

const src: Record<Move, string> = {
  rock: gameAssets.moveRock,
  scissors: gameAssets.moveScissors,
  paper: gameAssets.movePaper,
};

export function MoveIcon({ move, size = 56 }: { move: Move; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span role="img" aria-label={moveLabel[move]} style={{ fontSize: size, lineHeight: 1 }}>
        {fallbackEmoji[move]}
      </span>
    );
  }

  return (
    <img
      className="move-icon"
      src={src[move]}
      alt={moveLabel[move]}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  );
}
