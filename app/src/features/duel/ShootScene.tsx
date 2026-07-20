import { useEffect, useState } from "react";
import type { Move } from "../../domain/types";
import { MoveIcon } from "../../ui/MoveIcon";

const CHANT = ["เป่า...", "ยิ้ง...", "ฉุบ!"];

/**
 * ฉากลุ้นที่สุดของเกม — นับ เป่า-ยิ้ง-ฉุบ แล้วเปิดมูฟพร้อมกันสองฝั่ง
 * ยังไม่บอกผล ปล่อยให้เห็นมูฟก่อนแล้วค่อยไปจอผล
 */
export function ShootScene({
  playerMove,
  challengerMove,
  onRevealed,
}: {
  playerMove: Move;
  challengerMove: Move;
  onRevealed: () => void;
}) {
  const [step, setStep] = useState(0); // 0,1,2 = นับ · 3 = เปิดมูฟ

  useEffect(() => {
    if (step < 3) {
      const timer = window.setTimeout(() => setStep((current) => current + 1), 620);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onRevealed, 1400);
    return () => window.clearTimeout(timer);
  }, [step, onRevealed]);

  const revealed = step >= 3;

  return (
    <section className="scene shoot">
      {!revealed ? (
        <div className="shoot__chant" key={step}>
          {CHANT[step]}
        </div>
      ) : (
        <div className="shoot__reveal">
          <div className="shoot__hand shoot__hand--left">
            <MoveIcon move={playerMove} size={120} />
          </div>
          <div className="shoot__spark">💥</div>
          <div className="shoot__hand shoot__hand--right">
            <MoveIcon move={challengerMove} size={120} />
          </div>
        </div>
      )}
    </section>
  );
}
