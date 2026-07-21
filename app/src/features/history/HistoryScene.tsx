import { useState } from "react";
import { formatDelta } from "../../domain/scoreEngine";
import { gameAssets } from "../../data/assets";
import { historyFor } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";

type Tab = "all" | "asChallenger" | "asOpponent";

/**
 * ประวัติของผู้เล่นคนหนึ่ง — แยกแท็บ ทั้งหมด / ตอนเป็นผู้ท้าชิง / ตอนเป็นคู่แข่ง
 * เห็นได้เฉพาะของตัวเอง (ซุปเปิดหน้าให้ = ด่านกันเอง)
 */
export function HistoryScene({ playerId, onBack }: { playerId: string; onBack: () => void }) {
  const { state } = useGameStore();
  const [tab, setTab] = useState<Tab>("all");
  const player = state.players.find((row) => row.id === playerId);
  const rows = historyFor(state, playerId).filter((duel) => {
    if (tab === "asChallenger") return duel.challengerId === playerId;
    if (tab === "asOpponent") return duel.opponentId === playerId;
    return true;
  });

  if (!player) return null;
  const stats = player.stats;

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">
          <img className="inline-icon" src={gameAssets.iconHistory} alt="" /> ประวัติของ {player.name}
        </p>

        <div className="history-summary">
          <span>
            ตอนท้า: ชนะ <b>{stats.asChallenger.win}</b> · แพ้ {stats.asChallenger.lose} · เสมอ {stats.asChallenger.draw}
          </span>
          <span>
            ตอนถูกท้า: ชนะ <b>{stats.asOpponent.win}</b> · แพ้ {stats.asOpponent.lose} · เสมอ{" "}
            {stats.asOpponent.draw}
          </span>
          <span>
            สตรีคสูงสุด <b>{player.bestStreak}</b>
          </span>
        </div>

        <div className="tab-row">
          {(
            [
              ["all", "ทั้งหมด"],
              ["asChallenger", "ผู้ท้าชิง"],
              ["asOpponent", "คู่แข่ง"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab-btn${tab === key ? " tab-btn--on" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="callout">หมวดนี้ยังว่าง</p>
        ) : (
          <div className="history-list">
            {rows.map((duel) => {
              const iAmChallenger = duel.challengerId === playerId;
              const myMove = iAmChallenger ? duel.challengerMove : duel.opponentMove;
              const foeMove = iAmChallenger ? duel.opponentMove : duel.challengerMove;
              const foeName = iAmChallenger ? duel.opponentName : duel.challengerName;
              // ผลจากมุมมองของเจ้าของประวัติ
              const outcome = iAmChallenger
                ? duel.challengerOutcome
                : duel.challengerOutcome === "win"
                  ? "lose"
                  : duel.challengerOutcome === "lose"
                    ? "win"
                    : "draw";
              const myDelta = iAmChallenger ? duel.challengerDeltaTenths : duel.opponentDeltaTenths;
              const foeId = iAmChallenger ? duel.opponentId : duel.challengerId;
              const foePhoto = state.players.find((row) => row.id === foeId)?.imageUrl;
              return (
                <div key={duel.id} className="history-row">
                  <span className={`history-row__role history-row__role--${iAmChallenger ? "challenger" : "opponent"}`}>
                    {duel.mode === "offRound" ? "นอกรอบ" : iAmChallenger ? "ท้า" : "ถูกท้า"}
                  </span>
                  <img className="history-row__photo" src={foePhoto || gameAssets.avatarPlaceholder} alt="" />
                  <span className="history-row__foe">{foeName}</span>
                  <span className="history-row__moves">
                    <MoveIcon move={myMove} size={26} />
                    <b>vs</b>
                    <MoveIcon move={foeMove} size={26} />
                  </span>
                  <span className={`history-row__result history-row__result--${outcome}`}>
                    {outcome === "win" ? "ชนะ" : outcome === "draw" ? "เสมอ" : "แพ้"}
                    {duel.mode === "offRound" && duel.offRoundSave === "none" ? "" : ` ${formatDelta(myDelta)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            กลับ
          </Button>
        </div>
      </div>
    </section>
  );
}
