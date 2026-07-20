import { useEffect, useState } from "react";
import { rankPlayers } from "../../domain/rankingEngine";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";

/** ช็อตปลุกใจก่อนเข้าสนาม — เด้งเองอัตโนมัติ ไม่ต้องกด */
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
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const enter = window.setTimeout(() => setShown(true), 60);
    const leave = window.setTimeout(onReady, 2200);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(leave);
    };
  }, [onReady]);

  const player = findPlayer(state, playerId);
  const challenger = findPlayer(state, challengerId);
  const rankOf = new Map(rankPlayers(state.players).map((row) => [row.player.id, row.rank]));
  if (!player || !challenger) return null;

  return (
    <section className="scene versus">
      <div className={`versus__side versus__side--left${shown ? " is-in" : ""}`}>
        {player.imageUrl && <img className="versus__photo" src={player.imageUrl} alt="" />}
        <span className="versus__name">{player.name}</span>
        <span className="versus__rank">อันดับ {rankOf.get(player.id)}</span>
      </div>

      <div className={`versus__bolt${shown ? " is-in" : ""}`}>
        <span className="versus__vs">VS</span>
        {wasRandomPick && <span className="versus__tag">สุ่มคู่ต่อสู้ — คะแนนสูงกว่า</span>}
      </div>

      <div className={`versus__side versus__side--right${shown ? " is-in" : ""}`}>
        {challenger.imageUrl && <img className="versus__photo" src={challenger.imageUrl} alt="" />}
        <span className="versus__name">{challenger.name}</span>
        <span className="versus__rank">อันดับ {rankOf.get(challenger.id)}</span>
      </div>
    </section>
  );
}
