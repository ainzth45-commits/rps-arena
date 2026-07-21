import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { formatTenths } from "../../domain/scoreEngine";
import { duelBlockedReason } from "../../state/actions";
import { findPlayer, isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

interface Props {
  playerId: string;
  onDuel: () => void;
  onMoveSet: () => void;
  onHistory: () => void;
  onEndRound: () => void;
}

/** เมนูของรอบ — บอกชัดว่าใช้สิทธิ์อะไรไปแล้วบ้าง */
export function RoundMenuScene({ playerId, onDuel, onMoveSet, onHistory, onEndRound }: Props) {
  const { state } = useGameStore();
  const player = findPlayer(state, playerId);
  const round = state.round;
  if (!player || !round) return null;

  const duelBlocked = duelBlockedReason(state, playerId);
  const firstSetup = !isInArena(player);

  return (
    <section className="scene">
      <div className="panel">
        <div className="round-head">
          <img className="round-head__photo" src={player.imageUrl || gameAssets.avatarPlaceholder} alt="" />
          <div className="round-head__text">
            <p className="eyebrow">รอบของ {player.name} · ซีซั่น {state.season.id}</p>
            <h2 className="title">{formatTenths(player.mainScoreTenths)} แต้ม</h2>
          </div>
        </div>
        {player.streak > 0 && <p className="callout">กำลังชนะติดกัน {player.streak} ครั้ง!</p>}

        {firstSetup && <p className="callout callout--warn">ยังไม่ลงสังเวียน · ตั้งชุดมูฟก่อนดวล</p>}

        <div className="round-actions">

          <button
            type="button"
            className="round-action"
            data-action="history"
            onClick={() => {
              playSfx("tap");
              onHistory();
            }}
          >
            <img className="round-action__icon" src={gameAssets.iconHistory} alt="" />
            <span className="round-action__title">ประวัติของฉัน</span>
          </button>

          <button
            type="button"
            className="round-action"
            data-action="moveset"
            disabled={round.moveSetConfirmed}
            onClick={() => {
              playSfx("tap");
              onMoveSet();
            }}
          >
            <img className="round-action__icon" src={gameAssets.iconMoveSet} alt="" />
            <span className="round-action__title">{firstSetup ? "ตั้งชุดมูฟ" : "ปรับชุดมูฟ"}</span>
            {round.moveSetConfirmed && <span className="round-action__note">รอบนี้ปรับไปแล้ว</span>}
          </button>

          <button
            type="button"
            className="round-action"
            data-action="duel"
            disabled={!!duelBlocked}
            onClick={() => {
              playSfx("tap");
              onDuel();
            }}
          >
            <img className="round-action__icon" src={gameAssets.iconDuel} alt="" />
            <span className="round-action__title">ท้าดวล</span>
            {duelBlocked && <span className="round-action__note">{duelBlocked}</span>}
          </button>
        </div>

        <div className="button-row">
          <Button variant="ghost" onClick={onEndRound}>
            จบรอบ ส่ง iPad คืนซุป
          </Button>
        </div>
      </div>
    </section>
  );
}
