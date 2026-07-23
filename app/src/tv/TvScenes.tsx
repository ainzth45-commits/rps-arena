import { useEffect, useState } from "react";
import { gameAssets } from "../data/assets";
import { formatDelta, formatTenths } from "../domain/scoreEngine";
import { MoveIcon } from "../ui/MoveIcon";
import { DuelResultLayout } from "../features/duel/DuelResultScene";
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

/** ฉากปะทะ VS บน TV — ใช้ markup/CSS เดียวกับเกม (versus3) */
function TvVsSlot({ side, corner, data }: { side: "left" | "right"; corner: string; data: TvDuelSide }) {
  return (
    <div className={`versus3__slot versus3__slot--${side}`}>
      <span className="versus3__corner">{corner}</span>
      <img className="versus3__photo" src={photo(data.imageUrl)} alt="" />
      <span className="versus3__name">{data.name}</span>
      <span className="versus3__meta">
        <span className="versus3__rank">อันดับ {data.rank ?? "—"}</span>
        <span className="versus3__record">ชนะ {data.win} · แพ้ {data.lose}</span>
        {data.streak >= 2 && (
          <span className="versus3__streak">
            <img src={gameAssets.streakFire} alt="" />
            {data.streak}
          </span>
        )}
      </span>
    </div>
  );
}

function TvVersus({ view }: { view: Extract<TvView, { kind: "versus" }> }) {
  const [stage, setStage] = useState<"in" | "clash" | "info" | "ready">("in");
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage("clash"), 600),
      window.setTimeout(() => setStage("info"), 900),
      window.setTimeout(() => setStage("ready"), 3200),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  const shown = stage !== "in";
  const labels = view.mode === "offRound" ? ["คนที่ 1", "คนที่ 2"] : ["ผู้ท้าชิง", "คู่แข่ง"];
  return (
    <section className={`versus3 versus3--${stage}`}>
      <div className="versus3__stage">
        <img className="versus3__half versus3__half--left" src={gameAssets.bgVersusLeft} alt="" />
        <img className="versus3__half versus3__half--right" src={gameAssets.bgVersusRight} alt="" />
        <TvVsSlot side="left" corner={labels[0]} data={view.left} />
        <TvVsSlot side="right" corner={labels[1]} data={view.right} />
        <img className={`versus3__badge${shown ? " is-in" : ""}`} src={gameAssets.vsBadge} alt="VS" />
        {stage === "clash" && <img className="versus3__spark" src={gameAssets.clashSpark} alt="" />}
        <div className="versus3__band">
          <span className="versus3__h2h">{view.headToHead}</span>
          {view.wasRandomPick && <span className="versus3__tag">🎲 สุ่มคู่แข่ง</span>}
        </div>
        {stage === "ready" && <div className="versus3__go">พร้อม!</div>}
      </div>
    </section>
  );
}

/** หน้าเลือกมูฟ — มิเรอร์ iPad: คู่ดวล + นาฬิกา + 3 มูฟ ไฮไลต์มูฟที่ผู้ท้าชิงเลือก */
function TvMovePick({ view }: { view: Extract<TvView, { kind: "movePick" }> }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((view.deadline - Date.now()) / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft(Math.max(0, Math.ceil((view.deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [view.deadline]);
  const danger = left <= 10;
  const labels = view.mode === "offRound" ? ["คนที่ 1", "คนที่ 2"] : ["ผู้ท้าชิง", "คู่แข่ง"];
  return (
    <section className={`scene${danger ? " scene--danger" : ""}`}>
      <div className="panel">
        <div className="pick-head">
          <span className="pick-head__side pick-head__side--left">
            <span className="pick-head__name">{view.left.name}</span>
            <img className="pick-head__photo" src={photo(view.left.imageUrl)} alt="" />
          </span>
          <span className="pick-head__vs">VS</span>
          <span className="pick-head__side">
            <img className="pick-head__photo" src={photo(view.right.imageUrl)} alt="" />
            <span className="pick-head__name">{view.right.name}</span>
          </span>
        </div>
        <h2 className="title">{labels[0]}เลือกมูฟ</h2>

        <div className={`timer${danger ? " timer--danger" : ""}`}>
          <span className="timer__num">
            <img className="timer__icon" src={gameAssets.iconTimer} alt="" />
            {left}
          </span>
          <span className="timer__unit">วินาที</span>
          <div className="timer__bar">
            <div className="timer__fill" style={{ transform: `scaleX(${view.deadline ? left / 30 : 0})` }} />
          </div>
        </div>

        <div className="move-pick">
          {(["rock", "scissors", "paper"] as const).map((move) => (
            <div key={move} className={`move-pick__btn${view.pickedMove === move ? " move-pick__btn--on" : ""}`}>
              <MoveIcon move={move} size={150} />
            </div>
          ))}
        </div>
        <p className="lead">{view.picked ? "เลือกมูฟแล้ว! รอเปิด..." : "กำลังเลือก..."}</p>
      </div>
    </section>
  );
}

/** ฉากเป่ายิ้งฉุบ — ใช้ shoot2 เหมือนเกม: นับ เป่า-ยิ้ง-ฉุบ แล้วเปิดมูฟพร้อมกัน */
const CHANT = ["เป่า...", "ยิ้ง...", "ฉุบ!"];
function TvShoot({ view }: { view: Extract<TvView, { kind: "shoot" }> }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= 3) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), 640);
    return () => window.clearTimeout(t);
  }, [step]);
  const revealed = step >= 3;
  return (
    <section className={`shoot2${revealed ? " shoot2--reveal" : ""}`}>
      <div className="shoot2__side shoot2__side--left">
        <div className="shoot2__handbox">
          {revealed && (
            <div className="shoot2__hand shoot2__hand--left">
              <MoveIcon move={view.left.move} size={190} />
            </div>
          )}
        </div>
        <img className="shoot2__photo" src={photo(view.left.imageUrl)} alt="" />
        <div className="shoot2__name">{view.left.name}</div>
      </div>
      <div className="shoot2__center">
        {!revealed ? (
          <div className="shoot2__chant" key={step}>{CHANT[step]}</div>
        ) : (
          <img className="shoot2__spark" src={gameAssets.clashSpark} alt="" />
        )}
      </div>
      <div className="shoot2__side shoot2__side--right">
        <div className="shoot2__handbox">
          {revealed && (
            <div className="shoot2__hand shoot2__hand--right">
              <MoveIcon move={view.right.move} size={190} />
            </div>
          )}
        </div>
        <img className="shoot2__photo" src={photo(view.right.imageUrl)} alt="" />
        <div className="shoot2__name">{view.right.name}</div>
      </div>
    </section>
  );
}

/** จอผล — ใช้ DuelResultLayout ตัวเดียวกับเกม (มิเรอร์เป๊ะ) */
function TvResult({ view }: { view: Extract<TvView, { kind: "result" }> }) {
  const headline = view.outcome === "win" ? `${view.left.name} ชนะ!` : view.outcome === "lose" ? `${view.right.name} ชนะ!` : "เสมอ!";
  return (
    <DuelResultLayout
      outcome={view.outcome}
      mode={view.mode}
      eyebrow={view.mode === "offRound" ? "ดวลนอกรอบ" : `${view.left.name} ท้า ${view.right.name}`}
      headline={headline}
      left={{ name: view.left.name, imageUrl: view.left.imageUrl, move: view.left.move }}
      right={{ name: view.right.name, imageUrl: view.right.imageUrl, move: view.right.move }}
    >
      <p className="callout">
        {view.left.name} {formatDelta(view.leftDeltaTenths)} · {view.right.name} {formatDelta(view.rightDeltaTenths)}
      </p>
    </DuelResultLayout>
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
