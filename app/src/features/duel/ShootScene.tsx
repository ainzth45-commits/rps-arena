import { useEffect, useState } from "react";
import { gameAssets } from "../../data/assets";
import type { Move } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { MoveIcon } from "../../ui/MoveIcon";

const CHANT = ["เป่า...", "ยิ้ง...", "ฉุบ!"];

/**
 * ฉากลุ้นที่สุดของเกม — ผู้เล่นสองฝั่งภายใต้สปอตไลต์
 * นับ เป่า-ยิ้ง-ฉุบ แล้วเปิดมูฟพร้อมกัน + ประกายปะทะ
 */
export function ShootScene({
  playerId,
  challengerId,
  playerMove,
  challengerMove,
  onRevealed,
}: {
  playerId: string;
  challengerId: string;
  playerMove: Move;
  challengerMove: Move;
  onRevealed: () => void;
}) {
  const { state } = useGameStore();
  const [step, setStep] = useState(0); // 0,1,2 = นับ · 3 = เปิดมูฟ

  useEffect(() => {
    if (step < 3) {
      const timer = window.setTimeout(() => setStep((current) => current + 1), 640);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onRevealed, 1500);
    return () => window.clearTimeout(timer);
  }, [step, onRevealed]);

  const player = findPlayer(state, playerId);
  const challenger = findPlayer(state, challengerId);
  const revealed = step >= 3;

  return (
    <section className={`shoot2${revealed ? " shoot2--reveal" : ""}`}>
      {/* ฝั่งผู้เล่น (ซ้าย) */}
      <div className="shoot2__side shoot2__side--left">
        <img className="shoot2__photo" src={player?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
        <div className="shoot2__name">{player?.name}</div>
        {revealed && (
          <div className="shoot2__hand shoot2__hand--left">
            <MoveIcon move={playerMove} size={130} />
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
          <div className="shoot2__spark">💥</div>
        )}
      </div>

      {/* ฝั่งคู่ต่อสู้ (ขวา) */}
      <div className="shoot2__side shoot2__side--right">
        <img className="shoot2__photo" src={challenger?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
        <div className="shoot2__name">{challenger?.name}</div>
        {revealed && (
          <div className="shoot2__hand shoot2__hand--right">
            <MoveIcon move={challengerMove} size={130} />
          </div>
        )}
      </div>
    </section>
  );
}
