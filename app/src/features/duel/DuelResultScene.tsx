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


/**
 * คู่ปรับประจำเกมโผล่ 2 ข้างตามผล — ฝั่งซ้ายคือฝั่งซ้ายของจอเสมอ
 * เกมหลัก: ซ้าย = พนักงาน (ตัวแทนผู้ท้าชิง) · ขวา = แมว (ตัวแทนคู่แข่ง)
 * ดวลนอกรอบ: ไม่มีแมวมาเกี่ยว ทั้งคู่เป็นคนจริง → ใช้พนักงานทั้งสองฝั่ง
 */
function mascotsFor(outcome: DuelOutcome, mode: "duel" | "offRound"): { left: string; right: string } {
  const leftWon = outcome === "win";
  const draw = outcome === "draw";
  if (mode === "offRound") {
    if (draw) return { left: gameAssets.employeeAngry, right: gameAssets.employeeAngry };
    return leftWon
      ? { left: gameAssets.employeeWin, right: gameAssets.employeeLose }
      : { left: gameAssets.employeeLose, right: gameAssets.employeeWin };
  }
  if (draw) return { left: gameAssets.employeeAngry, right: gameAssets.catSmug };
  return leftWon
    ? { left: gameAssets.employeeWin, right: gameAssets.catLose }
    : { left: gameAssets.employeeLose, right: gameAssets.catWin };
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
  mode = "duel",
  children,
}: {
  /** ผลจากมุมมองฝั่งซ้าย */
  outcome: DuelOutcome;
  eyebrow: string;
  headline: string;
  left: { name: string; imageUrl: string; move: Move };
  right: { name: string; imageUrl: string; move: Move };
  /** ดวลนอกรอบใช้ตัวละครคนละชุด (ไม่มีแมว) */
  mode?: "duel" | "offRound";
  children: ReactNode;
}) {
  const mascots = mascotsFor(outcome, mode);
  const sideOf = (isLeft: boolean): "win" | "lose" | "draw" => {
    if (outcome === "draw") return "draw";
    return (outcome === "win") === isLeft ? "win" : "lose";
  };

  return (
    <section className={`scene result-scene result-scene--${outcome}`}>
      {outcome === "win" && <Confetti />}
      <img className="result-scene__mascot result-scene__mascot--left" src={mascots.left} alt="" />
      <img className="result-scene__mascot result-scene__mascot--right" src={mascots.right} alt="" />
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

export function DuelResultScene({ duel, onDone }: { duel: DuelRecord; onDone: () => void }) {
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
              สตรีค {duel.streakAfter} ครั้ง · โบนัส {streakPercent(duel.streakAfter, state.config)}%
            </small>
          </>
        )}
      </p>

      {player && (
        <p className="lead">
          {player.name}: <b>{formatTenths(player.mainScoreTenths)}</b> แต้ม
        </p>
      )}

      <div className="button-row">
        <Button onClick={onDone}>จบรอบ · ดูอันดับ →</Button>
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
