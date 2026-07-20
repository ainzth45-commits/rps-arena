import { useState } from "react";
import { resolveDuel } from "../../domain/rpsEngine";
import { formatDelta } from "../../domain/scoreEngine";
import { ALL_MOVES, type Move } from "../../domain/types";
import { performOffRoundDuel } from "../../state/actions";
import { findPlayer, isInArena, type OffRoundSave } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";
import { PlayerPickScene } from "../round/PlayerPickScene";

type Step = "pickA" | "pickB" | "moveA" | "handoff" | "moveB" | "reveal" | "save";

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
        title="⚔️ ดวลนอกรอบ — เลือกคนที่ 1"
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
        title="⚔️ เลือกคนที่ 2"
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
      <section className="scene">
        <div className="panel">
          <p className="eyebrow">⚔️ ดวลนอกรอบ · {step === "moveA" ? "คนที่ 1" : "คนที่ 2"}</p>
          <h2 className="title">{who?.name} เลือกมูฟ</h2>
          <p className="lead">อีกฝ่ายอย่าแอบดูนะคะ 👀</p>
          <div className="move-pick">
            {ALL_MOVES.map((move) => (
              <button
                key={move}
                type="button"
                className="move-pick__btn"
                onClick={() => {
                  if (step === "moveA") {
                    setAMove(move);
                    setStep("handoff");
                  } else {
                    setBMove(move);
                    setStep("reveal");
                  }
                }}
              >
                <MoveIcon move={move} size={64} />
                <span>{moveLabel[move]}</span>
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
          <span className="secret-panel__lock">🤝</span>
          <h2 className="title">ส่ง iPad ให้ {b?.name}</h2>
          <p className="lead">{a?.name} เลือกมูฟเรียบร้อยแล้ว — ปิดเป็นความลับไว้</p>
          <div className="button-row">
            <Button onClick={() => setStep("moveB")}>พร้อมแล้ว →</Button>
          </div>
        </div>
      </section>
    );
  }

  if ((step === "reveal" || step === "save") && aMove && bMove) {
    const outcome = resolveDuel(aMove, bMove);
    const headline = outcome === "win" ? `${a?.name} ชนะ!` : outcome === "lose" ? `${b?.name} ชนะ!` : "เสมอ!";
    const rates = state.config.offRoundRates;

    return (
      <section className="scene">
        <div className="panel">
          <p className="eyebrow">⚔️ ดวลนอกรอบ</p>
          <h2 className={`title result--${outcome === "draw" ? "draw" : "win"}`}>{headline}</h2>

          <div className="result-hands">
            <div className="result-hands__side">
              <MoveIcon move={aMove} size={72} />
              <span>{moveLabel[aMove]}</span>
              <small>{a?.name}</small>
            </div>
            <span className="result-hands__vs">VS</span>
            <div className="result-hands__side">
              <MoveIcon move={bMove} size={72} />
              <span>{moveLabel[bMove]}</span>
              <small>{b?.name}</small>
            </div>
          </div>

          {error && <p className="callout callout--warn">{error}</p>}

          <p className="lead">จะบันทึกผลนี้ยังไงดีคะ?</p>

          <div className="round-actions">
            <button type="button" className="round-action" data-action="save-main" onClick={() => save("main")}>
              <span className="round-action__icon">🏆</span>
              <span className="round-action__title">บันทึกเป็นคะแนนหลัก</span>
              <span className="round-action__note">
                ชนะ {formatDelta(rates.win * 10)} · เสมอ {formatDelta(rates.draw * 10)} · แพ้ {formatDelta(rates.lose * 10)}
                <br />
                มีผลกับอันดับเต็มๆ + นับสถิติแพ้ชนะ
              </span>
            </button>

            <button type="button" className="round-action" data-action="save-sub" onClick={() => save("sub")}>
              <span className="round-action__icon">🎖️</span>
              <span className="round-action__title">บันทึกเป็นคะแนนรอง</span>
              <span className="round-action__note">
                ชนะ +{rates.win} · เสมอ +{rates.draw} · แพ้ {rates.lose}
                <br />
                คอลัมน์แยก ใช้ตัดสินเฉพาะตอนคะแนนหลักเท่ากัน
              </span>
            </button>

            <button type="button" className="round-action" data-action="save-none" onClick={() => save("none")}>
              <span className="round-action__icon">🎈</span>
              <span className="round-action__title">ไม่บันทึก</span>
              <span className="round-action__note">เล่นสนุกเฉยๆ ไม่กระทบอะไรเลย</span>
            </button>
          </div>

          <p className="lead" style={{ opacity: 0.7 }}>
            ไม่ว่าเลือกแบบไหน โหมดนี้ไม่นับสตรีค และไม่ขยับตัวชี้ชุดมูฟของทั้งคู่
          </p>
        </div>
      </section>
    );
  }

  return null;
}
