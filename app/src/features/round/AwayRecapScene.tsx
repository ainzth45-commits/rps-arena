import { gameAssets } from "../../data/assets";
import { formatDelta } from "../../domain/scoreEngine";
import { awayRecapFor } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";

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
        <div className="recap-head">
          <img className="recap-head__photo" src={player?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
          <div className="recap-head__text">
            <p className="eyebrow">
              <img className="inline-icon" src={gameAssets.iconMail} alt="" /> ระหว่างที่คุณไม่อยู่
            </p>
            <h2 className="title">{player?.name}</h2>
            {!nothingHappened && (
              <p className="recap-head__sum">
                โดนท้า <b>{recap.entries.length}</b> ครั้ง ·{" "}
                <b className={recap.totalDeltaTenths < 0 ? "recap-sum--down" : "recap-sum--up"}>
                  {formatDelta(recap.totalDeltaTenths)}
                </b>
              </p>
            )}
          </div>
        </div>

        {nothingHappened ? (
          <p className="callout">ไม่มีใครมาท้าคุณเลย — ชุดมูฟยังเป็นความลับอยู่</p>
        ) : (
          <>
            <ul className="recap-list">
              {recap.entries.map(({ duel, outcome, deltaTenths }) => (
                <li key={duel.id} className={`recap-row recap-row--${outcome}`}>
                  <span className="recap-row__who">{duel.challengerName}</span>
                  <span className="recap-row__move">
                    <MoveIcon move={duel.challengerMove} size={30} />
                    <b>vs</b>
                    <MoveIcon move={duel.opponentMove} size={30} />
                  </span>
                  <span className={`recap-row__result recap-row__result--${outcome}`}>
                    {outcome === "win" ? "ชนะ" : outcome === "draw" ? "เสมอ" : "แพ้"}
                  </span>
                  <span className="recap-row__delta">{formatDelta(deltaTenths)}</span>
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
