import { useEffect, useState } from "react";
import { rankPlayers } from "../../domain/rankingEngine";
import { gameAssets } from "../../data/assets";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";

/**
 * ช็อตปะทะก่อนเข้าสนาม — ผู้เล่นสองฝั่งพุ่งเข้าชนกลางจอ + ฟ้าผ่าแตก
 * มุมน้ำเงิน (ผู้เล่น) vs มุมชมพู (คู่ต่อสู้) · เด้งเองอัตโนมัติ
 */
export function VersusScene({
  playerId,
  challengerId,
  wasRandomPick,
  onReady,
}: {
  playerId: string;
  challengerId: string;
  wasRandomPick: boolean;
  onReady: () => void;
}) {
  const { state } = useGameStore();
  const [phase, setPhase] = useState<"in" | "clash">("in");

  useEffect(() => {
    const clash = window.setTimeout(() => setPhase("clash"), 520);
    const leave = window.setTimeout(onReady, 2300);
    return () => {
      window.clearTimeout(clash);
      window.clearTimeout(leave);
    };
  }, [onReady]);

  const player = findPlayer(state, playerId);
  const challenger = findPlayer(state, challengerId);
  const rankOf = new Map(rankPlayers(state.players).map((row) => [row.player.id, row.rank]));
  if (!player || !challenger) return null;

  const shown = phase !== "in";

  return (
    <section className={`versus2${phase === "clash" ? " versus2--clash" : ""}`}>
      <div className="versus2__side versus2__side--blue">
        <div className="versus2__corner">มุมน้ำเงิน</div>
        <img
          className="versus2__photo"
          src={player.imageUrl || gameAssets.avatarPlaceholder}
          alt=""
        />
        <div className="versus2__name">{player.name}</div>
        <div className="versus2__rank">อันดับ {rankOf.get(player.id)}</div>
      </div>

      <div className="versus2__mid">
        <div className={`versus2__bolt${shown ? " is-in" : ""}`} />
        <div className={`versus2__vs${shown ? " is-in" : ""}`}>VS</div>
        {wasRandomPick && <div className="versus2__tag">🎲 สุ่มคู่ต่อสู้</div>}
      </div>

      <div className="versus2__side versus2__side--pink">
        <div className="versus2__corner">มุมชมพู</div>
        <img
          className="versus2__photo"
          src={challenger.imageUrl || gameAssets.avatarPlaceholder}
          alt=""
        />
        <div className="versus2__name">{challenger.name}</div>
        <div className="versus2__rank">อันดับ {rankOf.get(challenger.id)}</div>
      </div>
    </section>
  );
}
