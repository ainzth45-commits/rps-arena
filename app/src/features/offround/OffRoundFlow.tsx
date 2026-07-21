import { useCallback, useEffect, useRef, useState } from "react";
import { playSfx, startLoopingSfx } from "../../audio/sfx";
import { randomMove, resolveDuel } from "../../domain/rpsEngine";
import { formatDelta } from "../../domain/scoreEngine";
import { ALL_MOVES, type Move } from "../../domain/types";
import { performOffRoundDuel } from "../../state/actions";
import { findPlayer, isInArena, type OffRoundSave } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { gameAssets } from "../../data/assets";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";
import { PlayerPickScene } from "../round/PlayerPickScene";
import { applyBackdrop } from "../../data/sceneBackdrop";
import { VersusScene } from "../duel/VersusScene";
import { ShootScene } from "../duel/ShootScene";
import { DuelResultLayout } from "../duel/DuelResultScene";

type Step = "pickA" | "pickB" | "moveA" | "handoff" | "moveB" | "versus" | "shoot" | "reveal" | "save";

/**
 * ดวลนอกรอบ — ทั้งสองฝ่ายอยู่ตรงนั้น ผลัดกันเลือกมูฟเอง (ส่ง iPad ให้กัน)
 * ไม่แตะสตรีค · ไม่เลื่อนตัวชี้ · ไม่นับ mainDuels (spec §10)
 */
export function OffRoundFlow({ onExit }: { onExit: () => void }) {
  const { state, update } = useGameStore();
  const [step, setStep] = useState<Step>("pickA");
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [aMove, setAMove] = useState<Move | null>(null);
  const [bMove, setBMove] = useState<Move | null>(null);
  const [error, setError] = useState<string | null>(null);

  const a = aId ? findPlayer(state, aId) : undefined;
  const b = bId ? findPlayer(state, bId) : undefined;

  // ดวลนอกรอบมีเวลาเลือกมูฟ 10 วิต่อคน (สั้นกว่าดวลจริงเพราะทั้งคู่ยืนอยู่ตรงนั้น)
  const OFF_ROUND_SECONDS = 10;
  const [left, setLeft] = useState(OFF_ROUND_SECONDS);
  const picking = step === "moveA" || step === "moveB";

  /** รับมูฟของคนที่กำลังเลือกอยู่ แล้วไปขั้นถัดไป — ใช้ทั้งตอนกดเองและตอนหมดเวลา */
  const takeMove = useCallback(
    (move: Move) => {
      if (step === "moveA") {
        setAMove(move);
        setStep("handoff");
      } else {
        setBMove(move);
        setStep("versus"); // ดวลนอกรอบก็ต้องมันส์ — เข้าฉากปะทะเหมือนดวลจริง
      }
    },
    [step],
  );
  const takeMoveRef = useRef(takeMove);
  takeMoveRef.current = takeMove;

  useEffect(() => {
    if (!picking) return undefined;
    setLeft(OFF_ROUND_SECONDS);
    const startedAt = Date.now();
    let fired = false;
    const timer = window.setInterval(() => {
      const remain = Math.max(0, OFF_ROUND_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(remain);
      if (remain === 0 && !fired) {
        fired = true;
        window.clearInterval(timer);
        takeMoveRef.current(randomMove()); // หมดเวลา = สุ่มให้ ไม่ค้างจอ
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [picking, step]);

  const danger = left <= 5;
  useEffect(() => {
    if (!picking || left <= 0) return undefined;
    return startLoopingSfx("timerClock", { danger });
  }, [picking, danger, left <= 0]);

  // ฉากปะทะ/เป่ายิ้งฉุบมีพื้นหลังของตัวเอง — ทาทับระหว่างอยู่สองขั้นนี้ แล้ว App จะทาคืนตอนออก
  useEffect(() => {
    if (step === "versus" || step === "shoot") applyBackdrop(step);
    else if (step === "moveA" || step === "moveB") applyBackdrop("movePick"); // ห้องเตรียมตัว
    else applyBackdrop("offRound");
  }, [step]);

  function save(mode: OffRoundSave) {
    if (!aId || !bId || !aMove || !bMove) return;
    try {
      const result = performOffRoundDuel(state, { aId, bId, aMove, bMove, save: mode, now: Date.now() });
      update(() => result.state);
      onExit();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกไม่สำเร็จ");
    }
  }

  if (step === "pickA") {
    return (
      <PlayerPickScene
        title="ดวลนอกรอบ — เลือกคนที่ 1"
        lead="โหมดกิจกรรม ไม่ต้องจ่ายเหรียญ · ทั้งคู่เลือกมูฟเอง ระบบไม่เล่นแทน"
        hidden={(player) => !isInArena(player)}
        onPick={(id) => {
          setAId(id);
          setStep("pickB");
        }}
        onCancel={onExit}
      />
    );
  }

  if (step === "pickB") {
    return (
      <PlayerPickScene
        title="เลือกคนที่ 2"
        lead={`${a?.name} จะดวลกับใคร?`}
        hidden={(player) => !isInArena(player) || player.id === aId}
        onPick={(id) => {
          setBId(id);
          setStep("moveA");
        }}
        onCancel={() => {
          setAId(null);
          setStep("pickA");
        }}
      />
    );
  }

  // เลือกมูฟทีละคน — จอปิดทับตอนส่งเครื่อง
  if (step === "moveA" || step === "moveB") {
    const who = step === "moveA" ? a : b;
    return (
      <section className={`scene${danger ? " scene--danger" : ""}`}>
        <div className="panel">
          <p className="eyebrow">ดวลนอกรอบ · {step === "moveA" ? "คนที่ 1" : "คนที่ 2"}</p>
          <h2 className="title">{who?.name} เลือกมูฟ</h2>
          <p className="lead">อีกฝ่ายอย่าแอบดูนะคะ</p>

          <div className={`timer${danger ? " timer--danger" : ""}`}>
            <span className="timer__num">
              <img className="timer__icon" src={gameAssets.iconTimer} alt="" />
              {left}
            </span>
            <span className="timer__unit">วินาที</span>
            <div className="timer__bar">
              <div className="timer__fill" style={{ transform: `scaleX(${left / OFF_ROUND_SECONDS})` }} />
            </div>
            <span className="timer__note">หมดเวลาแล้วระบบจะสุ่มให้</span>
          </div>

          <div className="move-pick">
            {ALL_MOVES.map((move) => (
              <button
                key={move}
                type="button"
                className="move-pick__btn"
                onClick={() => {
                  playSfx("tap");
                  takeMove(move);
                }}
              >
                <MoveIcon move={move} size={132} />
              </button>
            ))}
          </div>
          <div className="button-row">
            <Button variant="ghost" onClick={onExit}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // จอปิดทับระหว่างส่งเครื่อง — ไม่โชว์อะไรที่ฟ้องมูฟของคนแรก
  if (step === "handoff") {
    return (
      <section className="scene">
        <div className="panel secret-panel">
          <img className="secret-panel__lock" src={gameAssets.iconLock} alt="" />
          <h2 className="title">ส่ง iPad ให้ {b?.name}</h2>
          <p className="lead">{a?.name} เลือกมูฟเรียบร้อยแล้ว — ปิดเป็นความลับไว้</p>
          <div className="button-row">
            <Button onClick={() => setStep("moveB")}>พร้อมแล้ว →</Button>
          </div>
        </div>
      </section>
    );
  }

  // ฉากปะทะ VS — ใช้ตัวเดียวกับดวลในเกมหลัก (ซ้าย = คนที่ 1 · ขวา = คนที่ 2)
  if (step === "versus" && aId && bId) {
    return (
      <VersusScene
        challengerId={aId}
        opponentId={bId}
        wasRandomPick={false}
        labels={["คนที่ 1", "คนที่ 2"]}
        onReady={() => setStep("shoot")}
      />
    );
  }

  // ฉากเป่า-ยิ้ง-ฉุบ เปิดมูฟพร้อมกันทั้งสองฝั่ง
  if (step === "shoot" && aId && bId && aMove && bMove) {
    return (
      <ShootScene
        challengerId={aId}
        opponentId={bId}
        challengerMove={aMove}
        opponentMove={bMove}
        onRevealed={() => setStep("reveal")}
      />
    );
  }

  if ((step === "reveal" || step === "save") && aMove && bMove) {
    const outcome = resolveDuel(aMove, bMove);
    const headline = outcome === "win" ? `${a?.name} ชนะ!` : outcome === "lose" ? `${b?.name} ชนะ!` : "เสมอ!";
    const rates = state.config.offRoundRates;

    return (
      <DuelResultLayout
        outcome={outcome}
        mode="offRound"
        eyebrow="ดวลนอกรอบ · ทั้งคู่เลือกมูฟเอง"
        headline={headline}
        left={{ name: a?.name ?? "คนที่ 1", imageUrl: a?.imageUrl ?? "", move: aMove }}
        right={{ name: b?.name ?? "คนที่ 2", imageUrl: b?.imageUrl ?? "", move: bMove }}
      >
        {error && <p className="callout callout--warn">{error}</p>}

        <p className="lead">จะบันทึกผลนี้ยังไงดีคะ?</p>

          <div className="round-actions">
            <button
              type="button"
              className="round-action"
              data-action="save-main"
              onClick={() => {
                playSfx("tap");
                save("main");
              }}
            >
                <span className="round-action__title">บันทึกเป็นคะแนนหลัก</span>
              <span className="round-action__note">
                ชนะ {formatDelta(rates.win * 10)} · เสมอ {formatDelta(rates.draw * 10)} · แพ้ {formatDelta(rates.lose * 10)}
                <br />
                มีผลกับอันดับเต็มๆ + นับสถิติแพ้ชนะ
              </span>
            </button>

            <button
              type="button"
              className="round-action"
              data-action="save-sub"
              onClick={() => {
                playSfx("tap");
                save("sub");
              }}
            >
                <span className="round-action__title">บันทึกเป็นคะแนนรอง</span>
              <span className="round-action__note">
                ชนะ +{rates.win} · เสมอ +{rates.draw} · แพ้ {rates.lose}
                <br />
                คอลัมน์แยก ใช้ตัดสินเฉพาะตอนคะแนนหลักเท่ากัน
              </span>
            </button>

            <button
              type="button"
              className="round-action"
              data-action="save-none"
              onClick={() => {
                playSfx("tap");
                save("none");
              }}
            >
                <span className="round-action__title">ไม่บันทึก</span>
              <span className="round-action__note">เล่นสนุกเฉยๆ ไม่กระทบอะไรเลย</span>
            </button>
          </div>

        <p className="lead" style={{ opacity: 0.7 }}>
          ไม่ว่าเลือกแบบไหน โหมดนี้ไม่นับสตรีค และไม่ขยับตัวชี้ชุดมูฟของทั้งคู่
        </p>
      </DuelResultLayout>
    );
  }

  return null;
}
