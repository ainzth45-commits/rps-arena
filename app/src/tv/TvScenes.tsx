import { useEffect, useState } from "react";
import { gameAssets } from "../data/assets";
import { formatDelta, formatTenths } from "../domain/scoreEngine";
import { MoveIcon } from "../ui/MoveIcon";
import { Confetti } from "../ui/Confetti";
import type { TvDuelSide, TvRankRow, TvView } from "./tvView";

/**
 * component เรนเดอร์ฝั่ง TV — รับ TvView มาแสดง
 * ใช้ CSS class เดิมของเกม (versus3/shoot2/result-scene/mini-board) ให้หน้าตาเหมือนกัน
 * โดยไม่ต้องพึ่ง game store (TV ไม่มี state เกม)
 */

function photo(url: string): string {
  return url || gameAssets.avatarPlaceholder;
}

/** ตารางอันดับเต็มจอ TV — อันดับ 1 การ์ดใหญ่ · 2-3 กลาง · 4-10 ลิสต์ */
function TvLeaderboard({ rows, seasonId, waiting }: { rows: TvRankRow[]; seasonId: string; waiting: number }) {
  if (rows.length === 0) {
    return (
      <div className="tv-empty">
        <img className="tv-empty__logo" src={gameAssets.logo} alt="" />
        <p>ยังไม่มีใครลงแข่ง · เริ่มดวลบน iPad ได้เลย</p>
      </div>
    );
  }
  const [first, second, third, ...rest] = rows;
  return (
    <div className="tv-board">
      <div className="tv-board__head">
        <img className="tv-board__trophy" src={gameAssets.iconRanking} alt="" />
        <span>ตารางอันดับ · ซีซั่น {seasonId}</span>
      </div>

      <div className="tv-board__body">
        <div className="tv-board__podium">
          {first && <TvChampionCard row={first} />}
          <div className="tv-board__runners">
            {second && <TvPodiumCard row={second} />}
            {third && <TvPodiumCard row={third} />}
          </div>
        </div>

        <div className="tv-board__list">
          {rest.map((row) => (
            <div key={row.playerId} className="tv-list-row">
              <span className="tv-list-row__rank">{row.rank}</span>
              <img className="tv-list-row__photo" src={photo(row.imageUrl)} alt="" />
              <span className="tv-list-row__name">{row.name}</span>
              <span className="tv-list-row__score">{formatTenths(row.scoreTenths)}</span>
            </div>
          ))}
          {waiting > 0 && <p className="tv-board__waiting">อีก {waiting} คนยังไม่ลงแข่ง</p>}
        </div>
      </div>
    </div>
  );
}

function TvRates({ rates }: { rates: TvRankRow["rates"] }) {
  if (rates === null || rates.length === 0) return null;
  return (
    <div className="tv-rates">
      {rates.map((rate) => (
        <span key={rate.move} className="tv-rates__item">
          <MoveIcon move={rate.move} size={30} />
          {rate.percent}%
        </span>
      ))}
    </div>
  );
}

function TvChampionCard({ row }: { row: TvRankRow }) {
  return (
    <div className="tv-champ">
      <img className="tv-champ__crown" src={gameAssets.crown} alt="" />
      <img className="tv-champ__photo" src={photo(row.imageUrl)} alt="" />
      <div className="tv-champ__info">
        <span className="tv-champ__rank">อันดับ 1</span>
        <span className="tv-champ__name">{row.name}</span>
        <span className="tv-champ__score">{formatTenths(row.scoreTenths)}</span>
        <TvRates rates={row.rates} />
      </div>
    </div>
  );
}

function TvPodiumCard({ row }: { row: TvRankRow }) {
  return (
    <div className={`tv-podium tv-podium--${row.rank}`}>
      <span className="tv-podium__rank">อันดับ {row.rank}</span>
      <img className="tv-podium__photo" src={photo(row.imageUrl)} alt="" />
      <span className="tv-podium__name">{row.name}</span>
      <span className="tv-podium__score">{formatTenths(row.scoreTenths)}</span>
      <TvRates rates={row.rates} />
    </div>
  );
}

/** ฉากปะทะ VS บน TV */
function TvVersus({ view }: { view: Extract<TvView, { kind: "versus" }> }) {
  const [clash, setClash] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setClash(true), 500);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className={`tv-versus${clash ? " tv-versus--clash" : ""}`}>
      <TvVsSide side="blue" corner="ผู้ท้าชิง" data={view.left} />
      <div className="tv-versus__mid">
        <img className="tv-versus__badge" src={gameAssets.vsBadge} alt="VS" />
        {view.wasRandomPick && <span className="tv-versus__tag">🎲 สุ่มคู่แข่ง</span>}
      </div>
      <TvVsSide side="pink" corner="คู่แข่ง" data={view.right} />
      <div className="tv-versus__h2h">{view.headToHead}</div>
    </div>
  );
}

function TvVsSide({ side, corner, data }: { side: "blue" | "pink"; corner: string; data: TvDuelSide }) {
  return (
    <div className={`tv-vs-side tv-vs-side--${side}`}>
      <span className="tv-vs-side__corner">{corner}</span>
      <img className="tv-vs-side__photo" src={photo(data.imageUrl)} alt="" />
      <span className="tv-vs-side__name">{data.name}</span>
      <span className="tv-vs-side__rank">อันดับ {data.rank ?? "—"}</span>
    </div>
  );
}

/** หน้าเลือกมูฟ — TV นับถอยหลังเองจากเส้นตาย */
function TvMovePick({ view }: { view: Extract<TvView, { kind: "movePick" }> }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((view.deadline - Date.now()) / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft(Math.max(0, Math.ceil((view.deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [view.deadline]);
  const danger = left <= 10;
  return (
    <div className="tv-pick">
      <div className="tv-pick__pair">
        <TvVsSide side="blue" corner="ผู้ท้าชิง" data={view.left} />
        <span className="tv-pick__vs">VS</span>
        <TvVsSide side="pink" corner="คู่แข่ง" data={view.right} />
      </div>
      <div className={`tv-pick__timer${danger ? " tv-pick__timer--danger" : ""}`}>
        <img src={gameAssets.iconTimer} alt="" />
        <b>{left}</b>
        <small>วินาที</small>
      </div>
      <p className="tv-pick__status">{view.picked ? "เลือกมูฟแล้ว! รอเปิด..." : "กำลังเลือกมูฟ..."}</p>
    </div>
  );
}

/** ฉากเป่ายิ้งฉุบ — เปิดมูฟทั้งสองฝั่ง */
function TvShoot({ view }: { view: Extract<TvView, { kind: "shoot" }> }) {
  return (
    <div className="tv-shoot">
      <div className="tv-shoot__side">
        <img className="tv-shoot__photo" src={photo(view.left.imageUrl)} alt="" />
        <span className="tv-shoot__name">{view.left.name}</span>
        <div className="tv-shoot__hand">
          <MoveIcon move={view.left.move} size={200} />
        </div>
      </div>
      <img className="tv-shoot__spark" src={gameAssets.clashSpark} alt="" />
      <div className="tv-shoot__side">
        <img className="tv-shoot__photo" src={photo(view.right.imageUrl)} alt="" />
        <span className="tv-shoot__name">{view.right.name}</span>
        <div className="tv-shoot__hand">
          <MoveIcon move={view.right.move} size={200} />
        </div>
      </div>
    </div>
  );
}

/** จอผล — ผู้ชนะรูปใหญ่ · ผู้แพ้เล็ก ขาวดำ */
function TvResult({ view }: { view: Extract<TvView, { kind: "result" }> }) {
  const headline = view.outcome === "win" ? `${view.left.name} ชนะ!` : view.outcome === "lose" ? `${view.right.name} ชนะ!` : "เสมอ!";
  const stateOf = (isLeft: boolean): "win" | "lose" | "draw" => {
    if (view.outcome === "draw") return "draw";
    return (view.outcome === "win") === isLeft ? "win" : "lose";
  };
  return (
    <div className="tv-result">
      {view.outcome === "win" && <Confetti count={80} />}
      <h1 className="tv-result__headline">{headline}</h1>
      <div className="tv-result__duo">
        <TvResultSide state={stateOf(true)} name={view.left.name} imageUrl={view.left.imageUrl} move={view.left.move} delta={view.leftDeltaTenths} />
        <span className="tv-result__vs">VS</span>
        <TvResultSide state={stateOf(false)} name={view.right.name} imageUrl={view.right.imageUrl} move={view.right.move} delta={view.rightDeltaTenths} />
      </div>
      {view.mode === "duel" && view.streakAfter >= 2 && view.outcome === "win" && (
        <p className="tv-result__streak">
          <img src={gameAssets.streakFire} alt="" /> ชนะติดกัน {view.streakAfter} ครั้ง!
        </p>
      )}
    </div>
  );
}

function TvResultSide({
  state,
  name,
  imageUrl,
  move,
  delta,
}: {
  state: "win" | "lose" | "draw";
  name: string;
  imageUrl: string;
  move: import("../domain/types").Move;
  delta: number;
}) {
  return (
    <div className={`tv-result-side tv-result-side--${state}`}>
      <div className="tv-result-side__frame">
        <img className="tv-result-side__photo" src={photo(imageUrl)} alt="" />
        {state === "win" && <img className="tv-result-side__crown" src={gameAssets.crown} alt="" />}
      </div>
      <span className="tv-result-side__name">{name}</span>
      <span className="tv-result-side__move">
        <MoveIcon move={move} size={48} />
      </span>
      <span className="tv-result-side__delta">{formatDelta(delta)}</span>
    </div>
  );
}

/** ประกาศแชมป์ */
function TvSeasonEnd({ view }: { view: Extract<TvView, { kind: "seasonEnd" }> }) {
  const champ = view.rows[0];
  return (
    <div className="tv-season">
      <Confetti count={100} />
      <img className="tv-season__trophy" src={gameAssets.seasonTrophy} alt="" />
      <h1 className="tv-season__title">{champ ? `${champ.name} คือแชมป์!` : "ปิดซีซั่น"}</h1>
      <div className="tv-board__runners tv-season__podium">
        {view.rows.map((row) => (
          <TvPodiumCard key={row.playerId} row={row} />
        ))}
      </div>
    </div>
  );
}

/** สลับเรนเดอร์ตาม kind ของ view */
export function TvViewRenderer({ view }: { view: TvView }) {
  switch (view.kind) {
    case "leaderboard":
      return <TvLeaderboard rows={view.rows} seasonId={view.seasonId} waiting={view.waiting} />;
    case "versus":
      return <TvVersus view={view} />;
    case "movePick":
      return <TvMovePick view={view} />;
    case "shoot":
      return <TvShoot view={view} />;
    case "result":
      return <TvResult view={view} />;
    case "seasonEnd":
      return <TvSeasonEnd view={view} />;
    case "offRoundSecret":
      return (
        <div className="tv-empty">
          <img className="tv-empty__mascot" src={gameAssets.employeeAngry} alt="" />
          <p>กำลังดวลนอกรอบ · รอทั้งคู่เลือกมูฟ...</p>
        </div>
      );
    default:
      return null;
  }
}
