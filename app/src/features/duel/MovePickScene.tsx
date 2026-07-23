import { useEffect, useRef, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx, startLoopingSfx } from "../../audio/sfx";
import { randomMove } from "../../domain/rpsEngine";
import { ALL_MOVES, type Move } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";

/** เลือกมูฟภายในเวลาที่กำหนด — หมดเวลา ระบบสุ่มให้แล้วไปต่อทันที */
export function MovePickScene({
  challengerId,
  opponentId,
  onConfirm,
  onPreview,
}: {
  challengerId: string;
  opponentId: string;
  onConfirm: (move: Move, wasAuto: boolean) => void;
  /** แจ้งมูฟที่กำลังเลือก (ก่อนยืนยัน) — ใช้สตรีมขึ้น TV */
  onPreview?: (move: Move) => void;
}) {
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

  const opponent = findPlayer(state, opponentId);
  const challenger = findPlayer(state, challengerId);
  const danger = left <= 10;
  const clockActive = picked === null && left > 0 && left <= 30;

  useEffect(() => {
    if (!clockActive) return undefined;
    return startLoopingSfx("timerClock", { danger });
  }, [clockActive, danger]);

  return (
    <section className={`scene${danger ? " scene--danger" : ""}`}>
      <div className="panel">
        <div className="pick-head">
          <span className="pick-head__side pick-head__side--left">
            <span className="pick-head__name">{challenger?.name}</span>
            <img className="pick-head__photo" src={challenger?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
          </span>
          <span className="pick-head__vs">VS</span>
          <span className="pick-head__side">
            <img className="pick-head__photo" src={opponent?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
            <span className="pick-head__name">{opponent?.name}</span>
          </span>
        </div>
        <h2 className="title">จะออกมูฟอะไร?</h2>

        <div className={`timer${danger ? " timer--danger" : ""}`}>
          <span className="timer__num"><img className="timer__icon" src={gameAssets.iconTimer} alt="" />{left}</span>
          <span className="timer__unit">วินาที</span>
          <div className="timer__bar">
            <div className="timer__fill" style={{ transform: `scaleX(${left / total})` }} />
          </div>
          <span className="timer__note">หมดเวลา = สุ่มให้</span>
        </div>

        <div className="move-pick">
          {ALL_MOVES.map((move) => (
            <button
              key={move}
              type="button"
              className={`move-pick__btn${picked === move ? " move-pick__btn--on" : ""}`}
              onClick={() => {
                playSfx("tap");
                setPicked(move);
                onPreview?.(move);
              }}
            >
              <MoveIcon move={move} size={210} />
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
            ยืนยัน — ลุยเลย!
          </Button>
        </div>
      </div>
    </section>
  );
}
