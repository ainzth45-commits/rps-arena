import { rankPlayers } from "../../domain/rankingEngine";
import { formatTenths } from "../../domain/scoreEngine";
import { gameAssets } from "../../data/assets";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

interface Props {
  onStartRound: () => void;
  onRanking: () => void;
  onOffRound: () => void;
  onPlayers: () => void;
}

/** หน้าแรก — ภาพไตเติลเต็มจอ + แถบปุ่มด้านล่าง (โครงเดียวกับหน้าแรกเกมที่ 1) */
export function HomeScene({ onStartRound, onRanking, onOffRound, onPlayers }: Props) {
  const { state } = useGameStore();
  const ranked = rankPlayers(state.players);
  const armed = state.players.filter(isInArena).length;
  const leader = ranked[0];

  return (
    <section className="scene home">
      <h1 className="visually-hidden">เป่า ยิ้ง ฉุบ! อารีน่า!</h1>

      <img className="home__art" src={gameAssets.homeTitle} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />

      <div className="home__bar">
        <div className="home__status">
          <span className="home__season">ซีซั่น {state.season.id}</span>
          <span className="home__armed">
            ลงสังเวียนแล้ว {armed}/{state.players.length} คน
          </span>
          {leader && (
            <span className="home__leader">
              จ่าฝูง: {leader.player.name} · {formatTenths(leader.player.mainScoreTenths)} แต้ม
            </span>
          )}
        </div>

        <div className="button-row">
          <Button variant="ghost" onClick={onPlayers}>
            ผู้เล่น
          </Button>
          <Button variant="ghost" onClick={onOffRound} disabled={armed < 2}>
            ดวลนอกรอบ
          </Button>
          <Button variant="ghost" onClick={onRanking} disabled={state.players.length === 0}>
            อันดับ
          </Button>
          <Button onClick={onStartRound} disabled={state.players.length === 0}>
            จ่าย {state.config.coinCost} เหรียญ เริ่มรอบ
          </Button>
        </div>
      </div>
    </section>
  );
}
