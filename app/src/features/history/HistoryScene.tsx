import { useState } from "react";
import { formatDelta } from "../../domain/scoreEngine";
import { gameAssets } from "../../data/assets";
import { historyFor } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

type Tab = "all" | "asPlayer" | "asChallenger";

/**
 * ประวัติของผู้เล่นคนหนึ่ง — แยกแท็บ ทั้งหมด / ตอนเป็นผู้เล่น / ตอนเป็นผู้ท้าชิง
 * เห็นได้เฉพาะของตัวเอง (ซุปเปิดหน้าให้ = ด่านกันเอง)
 */
export function HistoryScene({ playerId, onBack }: { playerId: string; onBack: () => void }) {
  const { state } = useGameStore();
  const [tab, setTab] = useState<Tab>("all");
  const player = state.players.find((row) => row.id === playerId);
  const rows = historyFor(state, playerId).filter((duel) => {
    if (tab === "asPlayer") return duel.playerId === playerId;
    if (tab === "asChallenger") return duel.challengerId === playerId;
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
            ผู้เล่น: ชนะ <b>{stats.asPlayer.win}</b> · แพ้ {stats.asPlayer.lose} · เสมอ {stats.asPlayer.draw}
          </span>
          <span>
            ผู้ท้าชิง: ชนะ <b>{stats.asChallenger.win}</b> · แพ้ {stats.asChallenger.lose} · เสมอ{" "}
            {stats.asChallenger.draw}
          </span>
          <span>
            สตรีคสูงสุด <b>{player.bestStreak}</b>
          </span>
        </div>

        <div className="tab-row">
          {(
            [
              ["all", "ทั้งหมด"],
              ["asPlayer", "ตอนเป็นผู้เล่น"],
              ["asChallenger", "ตอนเป็นผู้ท้าชิง"],
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
          <p className="callout">ยังไม่มีประวัติในหมวดนี้</p>
        ) : (
          <div className="history-list">
            {rows.map((duel) => {
              const iAmPlayer = duel.playerId === playerId;
              const myMove = iAmPlayer ? duel.playerMove : duel.challengerMove;
              const foeMove = iAmPlayer ? duel.challengerMove : duel.playerMove;
              const foeName = iAmPlayer ? duel.challengerName : duel.playerName;
              // ผลจากมุมมองของเจ้าของประวัติ
              const outcome = iAmPlayer
                ? duel.playerOutcome
                : duel.playerOutcome === "win"
                  ? "lose"
                  : duel.playerOutcome === "lose"
                    ? "win"
                    : "draw";
              const myDelta = iAmPlayer ? duel.playerDeltaTenths : duel.challengerDeltaTenths;
              return (
                <div key={duel.id} className="history-row">
                  <span className={`history-row__role history-row__role--${iAmPlayer ? "player" : "challenger"}`}>
                    {duel.mode === "offRound" ? "นอกรอบ" : iAmPlayer ? "ท้า" : "ถูกท้า"}
                  </span>
                  <span className="history-row__foe">{iAmPlayer ? `→ ${foeName}` : `← ${foeName}`}</span>
                  <span className="history-row__moves">
                    <MoveIcon move={myMove} size={22} /> <small>{moveLabel[myMove]}</small>
                    <b>vs</b>
                    <MoveIcon move={foeMove} size={22} /> <small>{moveLabel[foeMove]}</small>
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
