import { rankPlayers } from "../../domain/rankingEngine";
import { formatTenths } from "../../domain/scoreEngine";
import { gameAssets } from "../../data/assets";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { Dock } from "../../ui/Dock";

interface Props {
  onStartRound: () => void;
  onRanking: () => void;
  onOffRound: () => void;
  onPlayers: () => void;
}

/**
 * หน้าแรก — โครงเดียวกับหน้าแรกเกมที่ 1:
 * ฉากเต็มขอบจอ · โลโก้ลอยกลาง · เม็ดยาสถานะ · ปุ่มหลักเด่นตัวเดียว · dock ล่าง · ชิปมุมจอ
 */
export function HomeScene({ onStartRound, onRanking, onOffRound, onPlayers }: Props) {
  const { state } = useGameStore();
  const ranked = rankPlayers(state.players);
  const armed = state.players.filter(isInArena).length;
  const leader = ranked[0];
  const noPlayers = state.players.length === 0;

  return (
    <section className="home">
      <h1 className="visually-hidden">เป่า ยิ้ง ฉุบ! อารีน่า!</h1>

      <div className="home__topbar">
        <button type="button" className="chip-btn" onClick={onPlayers}>
          ผู้เล่น
        </button>
        <button type="button" className="chip-btn" disabled={noPlayers} onClick={onRanking}>
          อันดับ
        </button>
      </div>

      <div className="home__center">
        <img className="home__logo" src={gameAssets.logo} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />

        <div className="home__stats">
          <div className="stat-pill">
            <b>{state.season.id}</b>
            <span>ซีซั่นนี้</span>
          </div>
          <div className="stat-pill">
            <b>
              {armed}/{state.players.length}
            </b>
            <span>ลงสังเวียนแล้ว</span>
          </div>
          <div className="stat-pill">
            <b>{leader ? formatTenths(leader.player.mainScoreTenths) : "—"}</b>
            <span>{leader ? `จ่าฝูง: ${leader.player.name}` : "ยังไม่มีจ่าฝูง"}</span>
          </div>
        </div>

        <Button className="home__cta" disabled={noPlayers} onClick={onStartRound}>
          จ่าย {state.config.coinCost} เหรียญ · เริ่มรอบ
        </Button>
        {noPlayers && <p className="home__hint">ยังไม่มีผู้เล่นเลย — กด "ผู้เล่น" มุมซ้ายบนเพื่อลงทะเบียนก่อนนะคะ</p>}
      </div>

      <Dock
        items={[
          { key: "players", label: "ผู้เล่น", short: "คน", onClick: onPlayers },
          {
            key: "offround",
            label: "ดวลนอกรอบ",
            short: "VS",
            onClick: onOffRound,
            disabled: armed < 2,
            disabledNote: "ต้องมีคนลงสังเวียนอย่างน้อย 2 คน",
          },
          { key: "ranking", label: "อันดับ", short: "อันดับ", onClick: onRanking, disabled: noPlayers },
        ]}
      />
    </section>
  );
}
