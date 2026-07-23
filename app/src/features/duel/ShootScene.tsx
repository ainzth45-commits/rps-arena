import { useEffect, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import type { Move } from "../../domain/types";
import { AEK_NAME, findPlayer, isAek } from "../../state/gameState";
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
    if (step < 3) playSfx("tick", { step });
    else playSfx("revealImpact");
    if (step < 3) {
      const timer = window.setTimeout(() => setStep((current) => current + 1), 640);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onRevealed, 2800); // เจ้านายบอกว่าเดิมจบเร็วเกินไป ดูไม่ทัน
    return () => window.clearTimeout(timer);
  }, [step, onRevealed]);

  const challenger = findPlayer(state, challengerId);
  const opponent = isAek(opponentId) ? null : findPlayer(state, opponentId);
  // Aek (ซุป) → แสดงชื่อ "Aek" + แมวส้ม แทนข้อมูลผู้เล่นจริง
  const opponentName = isAek(opponentId) ? AEK_NAME : opponent?.name;
  const opponentImage = isAek(opponentId) ? gameAssets.catSmug : opponent?.imageUrl;
  const revealed = step >= 3;

  return (
    <section className={`shoot2${revealed ? " shoot2--reveal" : ""}`}>
      {/* ฝั่งผู้ท้าชิง (ซ้าย) */}
      <div className="shoot2__side shoot2__side--left">
        <div className="shoot2__handbox">
          {revealed && (
            <div className="shoot2__hand shoot2__hand--left">
              <MoveIcon move={challengerMove} size={190} />
            </div>
          )}
        </div>
        <img className="shoot2__photo" src={challenger?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
        <div className="shoot2__name">{challenger?.name}</div>
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
        <div className="shoot2__handbox">
          {revealed && (
            <div className="shoot2__hand shoot2__hand--right">
              <MoveIcon move={opponentMove} size={190} />
            </div>
          )}
        </div>
        <img className="shoot2__photo" src={opponentImage || gameAssets.avatarPlaceholder} alt="" />
        <div className="shoot2__name">{opponentName}</div>
      </div>
    </section>
  );
}
