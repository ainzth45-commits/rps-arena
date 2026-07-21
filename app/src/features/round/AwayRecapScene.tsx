import { gameAssets } from "../../data/assets";
import { formatDelta } from "../../domain/scoreEngine";
import { awayRecapFor } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

/**
 * จอแรกของทุกรอบ — "ระหว่างที่คุณไม่อยู่"
 * บอกหมดเปลือก: ใครท้า · มูฟที่ระบบออกแทนเรา · ผล · คะแนน · ป้ายเตือนโดนไล่เก็บ
 */
export function AwayRecapScene({ playerId, onNext }: { playerId: string; onNext: () => void }) {
  const { state } = useGameStore();
  const recap = awayRecapFor(state, playerId);
  const player = state.players.find((row) => row.id === playerId);
  const nothingHappened = recap.entries.length === 0;

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow"><img className="inline-icon" src={gameAssets.iconMail} alt="" /> ระหว่างที่คุณไม่อยู่</p>
        <h2 className="title">{player?.name}</h2>

        {nothingHappened ? (
          <p className="callout">ไม่มีใครมาท้าคุณเลย — ชุดมูฟยังเป็นความลับอยู่</p>
        ) : (
          <>
            <p className="lead">
              โดนท้าไปทั้งหมด <b>{recap.entries.length}</b> ครั้ง · รวม{" "}
              <b style={{ color: recap.totalDeltaTenths < 0 ? "var(--ring-pink)" : "var(--spark)" }}>
                {formatDelta(recap.totalDeltaTenths)}
              </b>{" "}
              แต้ม
            </p>

            <ul className="recap-list">
              {recap.entries.map(({ duel, outcome, deltaTenths }) => (
                <li key={duel.id} className="recap-row">
                  <span className="recap-row__who">{duel.challengerName}</span>
                  <span className="recap-row__vs">ท้าคุณ</span>
                  <span className="recap-row__move">
                    <MoveIcon move={duel.opponentMove} size={22} /> ระบบออก{moveLabel[duel.opponentMove]}ให้
                  </span>
                  <span className={`recap-row__result recap-row__result--${outcome}`}>
                    {outcome === "win" ? "ชนะ" : outcome === "draw" ? "เสมอ" : "แพ้"} {formatDelta(deltaTenths)}
                  </span>
                </li>
              ))}
            </ul>

            {recap.farmers.length > 0 && (
              <p className="callout callout--warn">
                <img className="inline-icon" src={gameAssets.iconWarning} alt="" />{" "}
                <b>{recap.farmers.map((farmer) => farmer.name).join(" และ ")}</b> กำลังไล่เก็บคุณอยู่!
                <br />
                <small>ท้าซ้ำ {recap.farmers[0].duels} ครั้ง ชนะไป {recap.farmers[0].wins} — ชุดมูฟคุณอาจถูกอ่านออกแล้ว</small>
              </p>
            )}
          </>
        )}

        <div className="button-row">
          <Button onClick={onNext}>เข้าสู่รอบของฉัน →</Button>
        </div>
      </div>
    </section>
  );
}
