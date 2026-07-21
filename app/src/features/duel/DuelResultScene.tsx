import { useEffect } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { formatDelta, formatTenths, streakPercent } from "../../domain/scoreEngine";
import type { DuelRecord } from "../../state/gameState";
import type { DuelOutcome, Move } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { Confetti } from "../../ui/Confetti";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

const HEADLINE = {
  win: "ชนะ!",
  draw: "เสมอ",
  lose: "แพ้",
} as const;

const RESULT_ART = {
  win: gameAssets.resultWin,
  draw: gameAssets.resultDraw,
  lose: gameAssets.resultLose,
} as const;

// คู่ปรับประจำเกมโผล่ 2 ข้างตามผล — สื่ออารมณ์ "แมวป่วน vs พนักงานหัวร้อน"
// (จากมุมมองผู้ท้าชิง: ชนะ = พนักงานเอาชนะแมวได้ · แพ้ = โดนแมวแกล้ง)
function mascotsFor(outcome: DuelOutcome): { cat: string; emp: string } {
  if (outcome === "win") return { cat: gameAssets.catLose, emp: gameAssets.employeeWin };
  if (outcome === "lose") return { cat: gameAssets.catWin, emp: gameAssets.employeeLose };
  return { cat: gameAssets.catSmug, emp: gameAssets.employeeAngry };
}

export function DuelResultScene({ duel, onRanking, onDone }: { duel: DuelRecord; onRanking: () => void; onDone: () => void }) {
  const { state } = useGameStore();
  const player = findPlayer(state, duel.challengerId);
  const opponent = findPlayer(state, duel.opponentId);
  // ใครชนะ = รูปใหญ่มีสี · ใครแพ้ = รูปเล็กขาวดำ · เสมอ = เท่ากันทั้งคู่
  const sideOf = (isChallenger: boolean): "win" | "lose" | "draw" => {
    if (duel.challengerOutcome === "draw") return "draw";
    const challengerWon = duel.challengerOutcome === "win";
    return challengerWon === isChallenger ? "win" : "lose";
  };
  const streakBonus = duel.challengerOutcome === "win" && duel.streakAfter >= 2;
  const mascots = mascotsFor(duel.challengerOutcome);

  useEffect(() => {
    playSfx(duel.challengerOutcome);
  }, [duel.challengerOutcome]);

  return (
    <section className={`scene result-scene result-scene--${duel.challengerOutcome}`}>
      {/* ตราผลการดวล — ชิ้นเดียวหลังการ์ด ไม่ใช่พื้นหลังเต็มจอ (พื้นหลังคุมจาก sceneBackdrop) */}
      <img className="result-scene__stamp" src={RESULT_ART[duel.challengerOutcome]} alt="" />
      {duel.challengerOutcome === "win" && <Confetti />}
      {/* คู่ปรับโผล่มุมล่าง 2 ข้าง */}
      <img className="result-scene__mascot result-scene__mascot--left" src={mascots.cat} alt="" />
      <img className="result-scene__mascot result-scene__mascot--right" src={mascots.emp} alt="" />
      <div className="panel">
        <p className="eyebrow">
          {duel.challengerName} ท้า {duel.opponentName}
          {duel.wasRandomPick ? " · สุ่ม" : ""}
        </p>
        <h2 className={`title result--${duel.challengerOutcome}`}>{HEADLINE[duel.challengerOutcome]}</h2>

        <div className="result-duo">
          <ResultSide
            state={sideOf(true)}
            name={duel.challengerName}
            imageUrl={player?.imageUrl ?? ""}
            move={duel.challengerMove}
          />
          <span className="result-duo__vs">VS</span>
          <ResultSide
            state={sideOf(false)}
            name={duel.opponentName}
            imageUrl={opponent?.imageUrl ?? ""}
            move={duel.opponentMove}
          />
        </div>

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

        {player && <p className="lead">คะแนนรวมของ {player.name} ตอนนี้: <b>{formatTenths(player.mainScoreTenths)}</b></p>}

        <div className="button-row">
          <Button variant="ghost" onClick={onRanking}>
            ดูอันดับ
          </Button>
          <Button onClick={onDone}>จบรอบ →</Button>
        </div>
      </div>
    </section>
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
        <MoveIcon move={move} size={40} />
        {moveLabel[move]}
      </span>
    </div>
  );
}
