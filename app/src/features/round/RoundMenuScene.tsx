import { gameAssets } from "../../data/assets";
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
        <p className="eyebrow">รอบของ {player.name} · ซีซั่น {state.season.id}</p>
        <h2 className="title">{formatTenths(player.mainScoreTenths)} แต้ม</h2>
        {player.streak > 0 && <p className="callout">กำลังชนะติดกัน {player.streak} ครั้ง!</p>}

        {firstSetup && <p className="callout callout--warn">คุณยังไม่ได้ลงสังเวียน — ตั้งชุดมูฟก่อนถึงจะดวลได้</p>}

        <div className="round-actions">
          <button type="button" className="round-action" data-action="duel" disabled={!!duelBlocked} onClick={onDuel}>
            <img className="round-action__icon" src={gameAssets.iconDuel} alt="" />
            <span className="round-action__title">ท้าดวล</span>
            <span className="round-action__note">{duelBlocked ?? "เลือกคู่ต่อสู้เอง หรือกดสุ่มเพื่อคะแนนที่มากกว่า"}</span>
          </button>

          <button
            type="button"
            className="round-action"
            data-action="moveset"
            disabled={round.moveSetConfirmed}
            onClick={onMoveSet}
          >
            <img className="round-action__icon" src={gameAssets.iconMoveSet} alt="" />
            <span className="round-action__title">{firstSetup ? "ตั้งชุดมูฟ" : "ปรับชุดมูฟ"}</span>
            <span className="round-action__note">
              {round.moveSetConfirmed
                ? "รอบนี้ปรับไปแล้ว"
                : "ยืนยันเมื่อไหร่ ตัวชี้กลับไปเป่า1 ทันที (สับขาหลอกได้)"}
            </span>
          </button>

          <button type="button" className="round-action" data-action="history" onClick={onHistory}>
            <img className="round-action__icon" src={gameAssets.iconHistory} alt="" />
            <span className="round-action__title">ประวัติของฉัน</span>
            <span className="round-action__note">ดูย้อนหลังได้ทั้งซีซั่น</span>
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
