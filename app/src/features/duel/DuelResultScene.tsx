import { gameAssets } from "../../data/assets";
import { formatDelta, formatTenths, streakPercent } from "../../domain/scoreEngine";
import type { DuelRecord } from "../../state/gameState";
import type { DuelOutcome } from "../../domain/types";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { Confetti } from "../../ui/Confetti";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";
import { SceneBackdrop } from "../../ui/SceneBackdrop";

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
// (จากมุมมองผู้เล่น: ชนะ = พนักงานเอาชนะแมวได้ · แพ้ = โดนแมวแกล้ง)
function mascotsFor(outcome: DuelOutcome): { cat: string; emp: string } {
  if (outcome === "win") return { cat: gameAssets.catLose, emp: gameAssets.employeeWin };
  if (outcome === "lose") return { cat: gameAssets.catWin, emp: gameAssets.employeeLose };
  return { cat: gameAssets.catSmug, emp: gameAssets.employeeAngry };
}

export function DuelResultScene({ duel, onRanking, onDone }: { duel: DuelRecord; onRanking: () => void; onDone: () => void }) {
  const { state } = useGameStore();
  const player = findPlayer(state, duel.playerId);
  const streakBonus = duel.playerOutcome === "win" && duel.streakAfter >= 2;
  const mascots = mascotsFor(duel.playerOutcome);

  return (
    <section className={`scene result-scene result-scene--${duel.playerOutcome}`}>
      {/* เวทีสังเวียน (ชั้นล่างสุด) */}
      <SceneBackdrop src={gameAssets.bgResult} />
      {/* ฉากผลตามผลการดวล (ชนะ/แพ้/เสมอ) วางเป็นเลเยอร์หลังการ์ด */}
      <img className="result-scene__art" src={RESULT_ART[duel.playerOutcome]} alt="" />
      {duel.playerOutcome === "win" && <Confetti />}
      {/* คู่ปรับโผล่มุมล่าง 2 ข้าง */}
      <img className="result-scene__mascot result-scene__mascot--left" src={mascots.cat} alt="" />
      <img className="result-scene__mascot result-scene__mascot--right" src={mascots.emp} alt="" />
      <div className="panel">
        <p className="eyebrow">
          {duel.playerName} ท้า {duel.challengerName}
          {duel.wasRandomPick ? " · สุ่ม" : ""}
        </p>
        <h2 className={`title result--${duel.playerOutcome}`}>{HEADLINE[duel.playerOutcome]}</h2>

        <div className="result-hands">
          <div className="result-hands__side">
            <MoveIcon move={duel.playerMove} size={72} />
            <span>{moveLabel[duel.playerMove]}</span>
            <small>{duel.playerName}</small>
          </div>
          <span className="result-hands__vs">VS</span>
          <div className="result-hands__side">
            <MoveIcon move={duel.challengerMove} size={72} />
            <span>{moveLabel[duel.challengerMove]}</span>
            <small>{duel.challengerName}</small>
          </div>
        </div>

        <p className="callout">
          {duel.playerName} {formatDelta(duel.playerDeltaTenths)} · {duel.challengerName}{" "}
          {formatDelta(duel.challengerDeltaTenths)}
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
