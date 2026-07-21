import { hasPlayed, rankPlayers } from "../../domain/rankingEngine";
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
  onSettings: () => void;
  onTutorial: () => void;
  onEnroll: () => void;
}

/**
 * หน้าแรก — โครงเดียวกับเกมสายลับ
 * โลโก้ย่อไปมุมซ้ายบน · เม็ดยาสถานะกลางจอ · ปุ่มหลักเด่นตัวเดียว · dock ล่าง
 */
export function HomeScene({ onStartRound, onRanking, onOffRound, onPlayers, onSettings, onTutorial, onEnroll }: Props) {
  const { state } = useGameStore();
  // จ่าฝูง = คนที่เคยแข่งและอันดับ 1 (ไม่ใช่ใครก็ได้ที่ 30 แต้ม)
  const leader = rankPlayers(state.players.filter(hasPlayed))[0];
  const armed = state.players.filter(isInArena).length;
  const notArmed = state.players.length - armed;
  const noPlayers = state.players.length === 0;

  return (
    <section className="home">
      <div className="home__topbar">
        <img className="home__logo-mini" src={gameAssets.logo} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />
      </div>

      <div className="home__center">
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

        {/* ลงสังเวียนครั้งแรก = ฟรี ไม่ต้องจ่ายเหรียญ — แยกปุ่มชัดเจนกันงง */}
        {notArmed > 0 && (
          <button type="button" className="home__enroll" onClick={onEnroll}>
            🥷 ตั้งชุดมูฟ ลงสังเวียน (ฟรี) — เหลืออีก {notArmed} คน
          </button>
        )}

        {noPlayers && <p className="home__hint">ยังไม่มีผู้เล่นเลย — กด "ผู้เล่น" ด้านล่างเพื่อลงทะเบียนก่อนนะคะ</p>}
      </div>

      <Dock
        items={[
          { key: "players", label: "ผู้เล่น", icon: gameAssets.iconPlayers, short: "คน", onClick: onPlayers },
          {
            key: "offround",
            label: "ดวลนอกรอบ",
            icon: gameAssets.iconOffRound,
            short: "VS",
            onClick: onOffRound,
            disabled: armed < 2,
            disabledNote: "ต้องมีคนลงสังเวียนอย่างน้อย 2 คน",
          },
          { key: "ranking", label: "อันดับ", icon: gameAssets.iconRanking, short: "อันดับ", onClick: onRanking, disabled: noPlayers },
          { key: "tutorial", label: "สอนเล่น", icon: gameAssets.iconTutorial, short: "สอน", onClick: onTutorial },
          { key: "settings", label: "ตั้งค่า", icon: gameAssets.iconSettings, short: "ตั้งค่า", onClick: onSettings },
        ]}
      />
    </section>
  );
}
