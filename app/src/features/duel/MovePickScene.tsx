import { useEffect, useRef, useState } from "react";
import { randomMove } from "../../domain/rpsEngine";
import { ALL_MOVES, type Move } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

/** เลือกมูฟภายในเวลาที่กำหนด — หมดเวลา ระบบสุ่มให้แล้วไปต่อทันที */
export function MovePickScene({ challengerId, onConfirm }: { challengerId: string; onConfirm: (move: Move, wasAuto: boolean) => void }) {
  const { state } = useGameStore();
  const total = state.config.movePickSeconds;
  const [picked, setPicked] = useState<Move | null>(null);
  const [left, setLeft] = useState(total);
  const done = useRef(false);

  // เก็บค่าล่าสุดไว้ใน ref เพื่อให้ timer อ่านได้โดยไม่ต้อง restart ทุกครั้งที่กดเปลี่ยนมูฟ
  const pickedRef = useRef<Move | null>(null);
  pickedRef.current = picked;

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const remain = Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(remain);
      if (remain === 0 && !done.current) {
        done.current = true;
        window.clearInterval(timer);
        // หมดเวลา: ถ้าเลือกไว้แล้วแต่ยังไม่กดยืนยัน ให้ใช้ที่เลือกไว้ · ถ้ายังไม่เลือกเลย สุ่มให้
        const fallback = pickedRef.current ?? randomMove();
        onConfirm(fallback, pickedRef.current === null);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [total, onConfirm]);

  const challenger = findPlayer(state, challengerId);
  const danger = left <= 10;

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">กำลังดวลกับ {challenger?.name}</p>
        <h2 className="title">จะออกมูฟอะไร?</h2>

        <div className={`timer${danger ? " timer--danger" : ""}`}>
          <span className="timer__num">{left}</span>
          <span className="timer__unit">วินาที</span>
          <div className="timer__bar">
            <div className="timer__fill" style={{ width: `${(left / total) * 100}%` }} />
          </div>
          <span className="timer__note">หมดเวลาแล้วระบบจะสุ่มให้</span>
        </div>

        <div className="move-pick">
          {ALL_MOVES.map((move) => (
            <button
              key={move}
              type="button"
              className={`move-pick__btn${picked === move ? " move-pick__btn--on" : ""}`}
              onClick={() => setPicked(move)}
            >
              <MoveIcon move={move} size={64} />
              <span>{moveLabel[move]}</span>
            </button>
          ))}
        </div>

        <div className="button-row">
          <Button
            disabled={picked === null}
            onClick={() => {
              if (done.current || picked === null) return;
              done.current = true;
              onConfirm(picked, false);
            }}
          >
            ✅ ยืนยัน — ลุยเลย!
          </Button>
        </div>
      </div>
    </section>
  );
}
