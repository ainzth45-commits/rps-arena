import { rankPlayers } from "../../domain/rankingEngine";
import { formatTenths } from "../../domain/scoreEngine";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

interface Props {
  onStartRound: () => void;
  onRanking: () => void;
  onOffRound: () => void;
  onPlayers: () => void;
}

export function HomeScene({ onStartRound, onRanking, onOffRound, onPlayers }: Props) {
  const { state } = useGameStore();
  const ranked = rankPlayers(state.players);
  const armed = state.players.filter(isInArena).length;
  const leader = ranked[0];

  return (
    <section className="scene">
      <p className="eyebrow">ซีซั่น {state.season.id} · ลงสังเวียนแล้ว {armed}/{state.players.length} คน</p>
      <h1 className="visually-hidden">เป่า ยิ้ง ฉุบ! อารีน่า!</h1>
      <img className="home-logo" src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />

      {leader ? (
        <p className="callout">
          👑 จ่าฝูงตอนนี้: {leader.player.name} · {formatTenths(leader.player.mainScoreTenths)} แต้ม
        </p>
      ) : (
        <p className="lead">ยังไม่มีผู้เล่นเลย — ไปลงทะเบียนกันก่อนนะคะ</p>
      )}

      <div className="button-row">
        <Button variant="ghost" onClick={onPlayers}>
          👥 ผู้เล่น
        </Button>
        <Button variant="ghost" onClick={onOffRound} disabled={armed < 2}>
          ⚔️ ดวลนอกรอบ
        </Button>
        <Button variant="ghost" onClick={onRanking} disabled={state.players.length === 0}>
          🏆 อันดับ
        </Button>
        <Button onClick={onStartRound} disabled={state.players.length === 0}>
          🪙 จ่ายเหรียญ เริ่มรอบ
        </Button>
      </div>

      <p className="lead" style={{ opacity: 0.7 }}>
        เล่น 1 ครั้ง = {state.config.coinCost} เหรียญ · จ่ายที่ซุปแล้วกดปุ่มขวาสุด
      </p>
    </section>
  );
}
