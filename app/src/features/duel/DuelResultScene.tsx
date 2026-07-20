import { formatDelta, formatTenths, streakPercent } from "../../domain/scoreEngine";
import type { DuelRecord } from "../../state/gameState";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

const HEADLINE = {
  win: "🎉 ชนะ!",
  draw: "🤝 เสมอ",
  lose: "💀 แพ้",
} as const;

export function DuelResultScene({ duel, onRanking, onDone }: { duel: DuelRecord; onRanking: () => void; onDone: () => void }) {
  const { state } = useGameStore();
  const player = findPlayer(state, duel.playerId);
  const streakBonus = duel.playerOutcome === "win" && duel.streakAfter >= 2;

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">
          {duel.playerName} ท้า {duel.challengerName}
          {duel.wasRandomPick ? " · 🎲 สุ่ม" : ""}
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
              <small>
                🔥 ชนะติดกัน {duel.streakAfter} ครั้ง — โบนัส {streakPercent(duel.streakAfter, state.config)}%
              </small>
            </>
          )}
        </p>

        {player && <p className="lead">คะแนนรวมของ {player.name} ตอนนี้: <b>{formatTenths(player.mainScoreTenths)}</b></p>}

        <div className="button-row">
          <Button variant="ghost" onClick={onRanking}>
            🏆 ดูอันดับ
          </Button>
          <Button onClick={onDone}>จบรอบ →</Button>
        </div>
      </div>
    </section>
  );
}
