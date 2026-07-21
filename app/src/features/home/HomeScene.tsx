import { hasPlayed, rankPlayers, visibleMoveRates } from "../../domain/rankingEngine";
import { formatTenths } from "../../domain/scoreEngine";
import { gameAssets } from "../../data/assets";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { Dock } from "../../ui/Dock";
import { MoveIcon } from "../../ui/MoveIcon";

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
  // กระดานย่อมุมขวาบน — เห็นเมต้าเกมตลอดโดยไม่ต้องกดเข้าหน้าอันดับ
  // ไม่โชว์ชื่อ (พื้นที่น้อย + รูปจำได้อยู่แล้ว) · เรตมูฟเปิดตามกติกาภาษีของแชมป์เป๊ะ
  const top5 = rankPlayers(state.players.filter(hasPlayed)).slice(0, 5);

  return (
    <section className="home">
      <div className="home__topbar">
        <img className="home__logo-mini" src={gameAssets.logo} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />

        {top5.length > 0 && (
          <div className="mini-board" aria-label="อันดับ 5 อันดับแรก">
            {top5.map((row) => {
              const rates = visibleMoveRates(row.rank, row.player);
              return (
                <div key={row.player.id} className={`mini-board__item mini-board__item--${Math.min(row.rank, 5)}`}>
                  <span className="mini-board__rank">{row.rank}</span>
                  <span className="mini-board__face">
                    <img
                      className="mini-board__photo"
                      src={row.player.imageUrl || gameAssets.avatarPlaceholder}
                      alt=""
                    />
                    {row.rank === 1 && <img className="mini-board__crown" src={gameAssets.crown} alt="" />}
                  </span>
                  <span className="mini-board__score">{formatTenths(row.player.mainScoreTenths)}</span>

                  {/* เรตการออกมูฟชิดขวา เรียงลงมา (เปิดตามกติกาภาษีของแชมป์) */}
                  {rates !== null && rates.length > 0 && (
                    <span className="mini-board__rates">
                      {rates.map((rate) => (
                        <span key={rate.move} className="mini-board__rate">
                          <MoveIcon move={rate.move} size={20} />
                          {rate.percent}%
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
            🥷 ตั้งชุดมูฟฟรี · เหลือ {notArmed} คน
          </button>
        )}

        {noPlayers && <p className="home__hint">ยังไม่มีผู้เล่น — กด "ผู้เล่น" เพื่อลงทะเบียน</p>}
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
            disabledNote: "ต้องมีคนลงสังเวียน 2 คนขึ้นไป",
          },
          { key: "ranking", label: "อันดับ", icon: gameAssets.iconRanking, short: "อันดับ", onClick: onRanking, disabled: noPlayers },
          { key: "tutorial", label: "สอนเล่น", icon: gameAssets.iconTutorial, short: "สอน", onClick: onTutorial },
          { key: "settings", label: "ตั้งค่า", icon: gameAssets.iconSettings, short: "ตั้งค่า", onClick: onSettings },
        ]}
      />
    </section>
  );
}
