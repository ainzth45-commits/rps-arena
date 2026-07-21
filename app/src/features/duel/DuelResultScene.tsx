import { useEffect, type ReactNode } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { formatDelta, formatTenths, streakPercent } from "../../domain/scoreEngine";
import type { DuelRecord } from "../../state/gameState";
import type { DuelOutcome, Move } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { Confetti } from "../../ui/Confetti";
import { MoveIcon } from "../../ui/MoveIcon";

const HEADLINE = {
  win: "ชนะ!",
  draw: "เสมอ",
  lose: "แพ้",
} as const;


// คู่ปรับประจำเกมโผล่ 2 ข้างตามผล — สื่ออารมณ์ "แมวป่วน vs พนักงานหัวร้อน"
// (จากมุมมองผู้ท้าชิง: ชนะ = พนักงานเอาชนะแมวได้ · แพ้ = โดนแมวแกล้ง)
function mascotsFor(outcome: DuelOutcome): { cat: string; emp: string } {
  if (outcome === "win") return { cat: gameAssets.catLose, emp: gameAssets.employeeWin };
  if (outcome === "lose") return { cat: gameAssets.catWin, emp: gameAssets.employeeLose };
  return { cat: gameAssets.catSmug, emp: gameAssets.employeeAngry };
}

/**
 * โครงจอผลการดวล — ใช้ร่วมกันทั้งดวลในเกมหลักและดวลนอกรอบ
 * (ดวลนอกรอบต่างแค่ "ทั้งคู่เลือกมูฟเอง" ที่เหลือควรเห็นจอเดียวกันเป๊ะ)
 */
export function DuelResultLayout({
  outcome,
  eyebrow,
  headline,
  left,
  right,
  children,
}: {
  /** ผลจากมุมมองฝั่งซ้าย */
  outcome: DuelOutcome;
  eyebrow: string;
  headline: string;
  left: { name: string; imageUrl: string; move: Move };
  right: { name: string; imageUrl: string; move: Move };
  children: ReactNode;
}) {
  const mascots = mascotsFor(outcome);
  const sideOf = (isLeft: boolean): "win" | "lose" | "draw" => {
    if (outcome === "draw") return "draw";
    return (outcome === "win") === isLeft ? "win" : "lose";
  };

  return (
    <section className={`scene result-scene result-scene--${outcome}`}>
      {outcome === "win" && <Confetti />}
      <img className="result-scene__mascot result-scene__mascot--left" src={mascots.cat} alt="" />
      <img className="result-scene__mascot result-scene__mascot--right" src={mascots.emp} alt="" />
      <div className="panel">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className={`title result--${outcome}`}>{headline}</h2>

        <div className="result-duo">
          <ResultSide state={sideOf(true)} name={left.name} imageUrl={left.imageUrl} move={left.move} />
          <span className="result-duo__vs">VS</span>
          <ResultSide state={sideOf(false)} name={right.name} imageUrl={right.imageUrl} move={right.move} />
        </div>

        {children}
      </div>
    </section>
  );
}

export function DuelResultScene({ duel, onRanking, onDone }: { duel: DuelRecord; onRanking: () => void; onDone: () => void }) {
  const { state } = useGameStore();
  const player = findPlayer(state, duel.challengerId);
  const opponent = findPlayer(state, duel.opponentId);
  const streakBonus = duel.challengerOutcome === "win" && duel.streakAfter >= 2;

  useEffect(() => {
    playSfx(duel.challengerOutcome);
    if (streakBonus) playSfx("streakFire");
  }, [duel.challengerOutcome, streakBonus]);

  return (
    <DuelResultLayout
      outcome={duel.challengerOutcome}
      eyebrow={`${duel.challengerName} ท้า ${duel.opponentName}${duel.wasRandomPick ? " · สุ่ม" : ""}`}
      headline={HEADLINE[duel.challengerOutcome]}
      left={{ name: duel.challengerName, imageUrl: player?.imageUrl ?? "", move: duel.challengerMove }}
      right={{ name: duel.opponentName, imageUrl: opponent?.imageUrl ?? "", move: duel.opponentMove }}
    >
      <p className="callout">
        {duel.challengerName} {formatDelta(duel.challengerDeltaTenths)} · {duel.opponentName}{" "}
        {formatDelta(duel.opponentDeltaTenths)}
        {streakBonus && (
          <>
            <br />
            <small className="streak-line">
              <img className="streak-line__fire" src={gameAssets.streakFire} alt="" />
              ชนะติดกัน {duel.streakAfter} ครั้ง — โบนัส {streakPercent(duel.streakAfter, state.config)}%
            </small>
          </>
        )}
      </p>

      {player && (
        <p className="lead">
          คะแนนรวมของ {player.name} ตอนนี้: <b>{formatTenths(player.mainScoreTenths)}</b>
        </p>
      )}

      <div className="button-row">
        <Button variant="ghost" onClick={onRanking}>
          ดูอันดับ
        </Button>
        <Button onClick={onDone}>จบรอบ →</Button>
      </div>
    </DuelResultLayout>
  );
}

/** ฝั่งหนึ่งของจอผล — คนชนะรูปใหญ่มีสี · คนแพ้รูปเล็กขาวดำ */
function ResultSide({
  state,
  name,
  imageUrl,
  move,
}: {
  state: "win" | "lose" | "draw";
  name: string;
  imageUrl: string;
  move: Move;
}) {
  return (
    <div className={`result-side result-side--${state}`}>
      <div className="result-side__frame">
        <img className="result-side__photo" src={imageUrl || gameAssets.avatarPlaceholder} alt="" />
        {state === "win" && <span className="result-side__crown"><img src={gameAssets.crown} alt="" /></span>}
      </div>
      <span className="result-side__name">{name}</span>
      <span className="result-side__move">
        <MoveIcon move={move} size={54} />
      </span>
    </div>
  );
}
