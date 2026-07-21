import { useEffect, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import type { Move } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { MoveIcon } from "../../ui/MoveIcon";

const CHANT = ["เป่า...", "ยิ้ง...", "ฉุบ!"];

/**
 * ฉากลุ้นที่สุดของเกม — ผู้ท้าชิงกับคู่แข่งภายใต้สปอตไลต์
 * นับ เป่า-ยิ้ง-ฉุบ แล้วเปิดมูฟพร้อมกัน + ประกายปะทะ
 */
export function ShootScene({
  challengerId,
  opponentId,
  challengerMove,
  opponentMove,
  onRevealed,
}: {
  challengerId: string;
  opponentId: string;
  challengerMove: Move;
  opponentMove: Move;
  onRevealed: () => void;
}) {
  const { state } = useGameStore();
  const [step, setStep] = useState(0); // 0,1,2 = นับ · 3 = เปิดมูฟ

  useEffect(() => {
    playSfx(step < 3 ? "tick" : "reveal");
    if (step < 3) {
      const timer = window.setTimeout(() => setStep((current) => current + 1), 640);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onRevealed, 1500);
    return () => window.clearTimeout(timer);
  }, [step, onRevealed]);

  const challenger = findPlayer(state, challengerId);
  const opponent = findPlayer(state, opponentId);
  const revealed = step >= 3;

  return (
    <section className={`shoot2${revealed ? " shoot2--reveal" : ""}`}>
      {/* ฝั่งผู้ท้าชิง (ซ้าย) */}
      <div className="shoot2__side shoot2__side--left">
        <img className="shoot2__photo" src={challenger?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
        <div className="shoot2__name">{challenger?.name}</div>
        {revealed && (
          <div className="shoot2__hand shoot2__hand--left">
            <MoveIcon move={challengerMove} size={130} />
          </div>
        )}
      </div>

      {/* กลางจอ */}
      <div className="shoot2__center">
        {!revealed ? (
          <div className="shoot2__chant" key={step}>
            {CHANT[step]}
          </div>
        ) : (
          <img className="shoot2__spark" src={gameAssets.clashSpark} alt="" />
        )}
      </div>

      {/* ฝั่งคู่แข่ง (ขวา) */}
      <div className="shoot2__side shoot2__side--right">
        <img className="shoot2__photo" src={opponent?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
        <div className="shoot2__name">{opponent?.name}</div>
        {revealed && (
          <div className="shoot2__hand shoot2__hand--right">
            <MoveIcon move={opponentMove} size={130} />
          </div>
        )}
      </div>
    </section>
  );
}
