import { gameAssets } from "../../data/assets";
import { rankPlayers } from "../../domain/rankingEngine";
import type { Player } from "../../domain/types";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

interface Props {
  title: string;
  lead: string;
  /** กรองว่าใครกดได้ — ไม่ส่งมา = กดได้ทุกคน */
  selectable?: (player: Player) => boolean;
  /** ซ่อนบางคนไปเลย (เช่น ตัวเองในหน้าเลือกคู่แข่ง) */
  hidden?: (player: Player) => boolean;
  /** โชว์อันดับบนการ์ด แต่ไม่โชว์คะแนน (กติกาหน้าเลือกคู่แข่ง) */
  showRank?: boolean;
  onPick: (playerId: string) => void;
  onCancel: () => void;
  extraAction?: { label: string; onClick: () => void; disabled?: boolean };
}

/** จอเลือกคนแบบใช้ซ้ำได้ — ใช้ทั้งเลือกผู้ท้าชิงที่จ่ายเหรียญ และเลือกคู่แข่ง */
export function PlayerPickScene({ title, lead, selectable, hidden, showRank, onPick, onCancel, extraAction }: Props) {
  const { state } = useGameStore();
  const ranked = rankPlayers(state.players);
  const rankOf = new Map(ranked.map((row) => [row.player.id, row.rank]));
  const visible = state.players.filter((player) => !hidden?.(player));

  return (
    <section className="scene">
      <div className="panel">
        <h2 className="title">{title}</h2>
        <p className="lead">{lead}</p>

        {visible.length === 0 ? (
          <p className="callout">ยังไม่มีใครให้เลือกเลยค่ะ</p>
        ) : (
          <div className="player-grid">
            {visible.map((player) => {
              const canPick = selectable ? selectable(player) : true;
              return (
                <button
                  key={player.id}
                  type="button"
                  className="player-card"
                  disabled={!canPick}
                  onClick={() => onPick(player.id)}
                >
                  <img className="player-card__photo" src={player.imageUrl || gameAssets.avatarPlaceholder} alt="" />
                  <span className="player-card__name">{player.name}</span>
                  {showRank && <span className="player-card__rank">อันดับ {rankOf.get(player.id)}</span>}
                  {!isInArena(player) && <span className="player-card__rank">ยังไม่ลงสังเวียน</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="button-row">
          <Button variant="ghost" onClick={onCancel}>
            ← กลับ
          </Button>
          {extraAction && (
            <Button onClick={extraAction.onClick} disabled={extraAction.disabled}>
              {extraAction.label}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
