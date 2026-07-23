import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gameAssets } from "../data/assets";
import { formatDelta, formatTenths } from "../domain/scoreEngine";
import { playSfx } from "../audio/sfx";
import { MoveIcon } from "../ui/MoveIcon";
import { DuelResultLayout } from "../features/duel/DuelResultScene";
import { Confetti } from "../ui/Confetti";
import type { TvDuelSide, TvRankFocus, TvRankRow, TvView } from "./tvView";

/**
 * component เรนเดอร์ฝั่ง TV — รับ TvView มาแสดง
 * ใช้ CSS class เดิมของเกม (versus3/shoot2/result-scene/mini-board) ให้หน้าตาเหมือนกัน
 * โดยไม่ต้องพึ่ง game store (TV ไม่มี state เกม)
 */

function photo(url: string): string {
  return url || gameAssets.avatarPlaceholder;
}

/** เรียงลำดับ "ก่อนดวล" — เอาผู้ท้าชิงกลับไปไว้ที่อันดับเดิม + คะแนนเดิม (สร้าง state ก่อนไต่) */
function reorderBefore(afterRows: TvRankRow[], focus: TvRankFocus): TvRankRow[] {
  const idx = afterRows.findIndex((row) => row.playerId === focus.playerId);
  if (idx < 0) return afterRows;
  const without = afterRows.filter((_, i) => i !== idx);
  const insertAt = Math.min(without.length, Math.max(0, focus.fromRank - 1));
  const focusBefore: TvRankRow = { ...afterRows[idx], scoreTenths: focus.fromScoreTenths };
  return [...without.slice(0, insertAt), focusBefore, ...without.slice(insertAt)];
}

/**
 * ตารางอันดับเต็มจอ TV — อันดับ 1 การ์ดใหญ่ · 2-3 โพเดียม · 4-10 ลิสต์
 * ถ้ามี focus (เพิ่งดวลเสร็จ) → เล่นอนิเมชัน: ค้างอันดับเดิมแล้วสไลด์ไปอันดับใหม่ + คะแนนไต่ (เหมือน iPad)
 */
function TvLeaderboard({
  rows,
  seasonId,
  waiting,
  focus,
}: {
  rows: TvRankRow[];
  seasonId: string;
  waiting: number;
  focus: TvRankFocus | null;
}) {
  // key ของรอบอนิเมชัน — เปลี่ยนเมื่อ focus เปลี่ยนคน/รอบ เพื่อรีเซ็ต state
  const runKey = focus ? `${focus.playerId}:${focus.fromRank}:${focus.fromScoreTenths}` : "static";
  const [settled, setSettled] = useState(!focus);
  const [shownTenths, setShownTenths] = useState<number | null>(focus ? focus.fromScoreTenths : null);
  const runKeyRef = useRef(runKey);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  // เริ่มรอบใหม่เมื่อ focus เปลี่ยน
  if (runKeyRef.current !== runKey) {
    runKeyRef.current = runKey;
    setSettled(!focus);
    setShownTenths(focus ? focus.fromScoreTenths : null);
  }

  const focusRow = focus ? rows.find((row) => row.playerId === focus.playerId) : undefined;
  const displayRows = focus && !settled ? reorderBefore(rows, focus) : rows;

  // จับตำแหน่งการ์ดทุกใบก่อน render รอบถัดไป (สำหรับ FLIP)
  const measureRects = () => {
    const map = new Map<string, DOMRect>();
    boardRef.current?.querySelectorAll<HTMLElement>("[data-pid]").forEach((el) => {
      map.set(el.dataset.pid!, el.getBoundingClientRect());
    });
    return map;
  };

  // ── ตัวเลขคะแนนของผู้ท้าชิงไต่จากค่าเดิม → ค่าปัจจุบัน + เสียงติ๊ก ──
  useEffect(() => {
    if (!focus || !focusRow) return;
    const start = focus.fromScoreTenths;
    const target = focusRow.scoreTenths;
    if (start === target) {
      setShownTenths(target);
      return;
    }
    const steps = Math.min(24, Math.max(1, Math.abs(target - start)));
    const timers: number[] = [];
    for (let i = 1; i <= steps; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setShownTenths(Math.round(start + ((target - start) * i) / steps));
          if (i % 2 === 0 || steps < 6) playSfx("countTick");
        }, (800 / steps) * i),
      );
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  // ── ค้างอันดับเดิม ~850ms แล้วปล่อยไหลไปอันดับใหม่ + เสียงตามทิศทาง ──
  useEffect(() => {
    if (!focus || !focusRow) return;
    prevRects.current = measureRects(); // ตำแหน่ง "ก่อน"
    const rankDelta = focus.fromRank - focusRow.rank;
    const timer = window.setTimeout(() => {
      setSettled(true);
      if (rankDelta > 0) {
        const gap = Math.max(90, 260 - rankDelta * 28);
        for (let i = 0; i < rankDelta; i += 1) {
          window.setTimeout(() => playSfx("rankUpStep", { step: i }), gap * i);
        }
      } else if (rankDelta < 0) {
        playSfx("rankDownSlide", { steps: Math.abs(rankDelta) });
      }
    }, 850);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  // ── FLIP: หลังสลับเป็นอันดับใหม่ ให้การ์ดที่ขยับ "บิน" จากตำแหน่งเดิมไปใหม่นุ่มๆ ──
  useLayoutEffect(() => {
    if (prevRects.current.size === 0) return;
    const before = prevRects.current;
    prevRects.current = new Map();
    boardRef.current?.querySelectorAll<HTMLElement>("[data-pid]").forEach((el) => {
      const pid = el.dataset.pid!;
      const old = before.get(pid);
      if (!old) return;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.zIndex = pid === focus?.playerId ? "5" : "1";
      requestAnimationFrame(() => {
        el.style.transition = "transform 620ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
      });
    });
  }, [settled, focus]);

  if (rows.length === 0) {
    return (
      <div className="tv-empty">
        <img className="tv-empty__logo" src={gameAssets.logo} alt="" />
        <p>ยังไม่มีใครลงแข่ง · เริ่มดวลบน iPad ได้เลย</p>
      </div>
    );
  }

  const scoreFor = (row: TvRankRow) =>
    focus && row.playerId === focus.playerId && shownTenths !== null ? shownTenths : row.scoreTenths;
  const isHot = (row: TvRankRow) => focus?.playerId === row.playerId;
  const [first, second, third, ...rest] = displayRows;
  const hasRankList = rest.length > 0;
  const showSideList = hasRankList || waiting > 0;

  return (
    <div className="tv-board" ref={boardRef}>
      <div className="tv-board__head">
        <img className="tv-board__trophy" src={gameAssets.iconRanking} alt="" />
        <span>ตารางอันดับ · ซีซั่น {seasonId}</span>
      </div>

      <div className={`tv-board__body${hasRankList ? "" : " tv-board__body--podium-only"}`}>
        <div className="tv-board__podium">
          {first && <TvChampionCard row={first} scoreTenths={scoreFor(first)} hot={isHot(first)} />}
          <div className="tv-board__runners">
            {second && <TvPodiumCard row={second} rank={2} scoreTenths={scoreFor(second)} hot={isHot(second)} />}
            {third && <TvPodiumCard row={third} rank={3} scoreTenths={scoreFor(third)} hot={isHot(third)} />}
          </div>
        </div>

        {showSideList && (
          <div className={`tv-board__list${hasRankList ? "" : " tv-board__list--waiting-only"}`}>
            {rest.map((row, index) => (
              <div key={row.playerId} data-pid={row.playerId} className={`tv-list-row${isHot(row) ? " is-hot" : ""}`}>
                <span className="tv-list-row__rank">{index + 4}</span>
                <img className="tv-list-row__photo" src={photo(row.imageUrl)} alt="" />
                <span className="tv-list-row__name">{row.name}</span>
                <span className="tv-list-row__score">{formatTenths(scoreFor(row))}</span>
              </div>
            ))}
            {waiting > 0 && <p className="tv-board__waiting">อีก {waiting} คนยังไม่ลงแข่ง</p>}
          </div>
        )}
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

function TvChampionCard({ row, scoreTenths, hot }: { row: TvRankRow; scoreTenths: number; hot: boolean }) {
  return (
    <div className={`tv-champ${hot ? " is-hot" : ""}`} data-pid={row.playerId}>
      <img className="tv-champ__crown" src={gameAssets.crown} alt="" />
      <img className="tv-champ__photo" src={photo(row.imageUrl)} alt="" />
      <div className="tv-champ__info">
        <span className="tv-champ__rank">อันดับ 1</span>
        <span className="tv-champ__name">{row.name}</span>
        <span className="tv-champ__score">{formatTenths(scoreTenths)}</span>
        <TvRates rates={row.rates} />
      </div>
    </div>
  );
}

function TvPodiumCard({ row, rank, scoreTenths, hot }: { row: TvRankRow; rank: number; scoreTenths: number; hot: boolean }) {
  return (
    <div className={`tv-podium tv-podium--${rank}${hot ? " is-hot" : ""}`} data-pid={row.playerId}>
      <span className="tv-podium__rank">อันดับ {rank}</span>
      <img className="tv-podium__photo" src={photo(row.imageUrl)} alt="" />
      <span className="tv-podium__name">{row.name}</span>
      <span className="tv-podium__score">{formatTenths(scoreTenths)}</span>
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
      <p className="callout tv-result-score-strip">
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
          <TvPodiumCard key={row.playerId} row={row} rank={row.rank} scoreTenths={row.scoreTenths} hot={false} />
        ))}
      </div>
    </div>
  );
}

/** สลับเรนเดอร์ตาม kind ของ view */
export function TvViewRenderer({ view }: { view: TvView }) {
  switch (view.kind) {
    case "leaderboard":
      return <TvLeaderboard rows={view.rows} seasonId={view.seasonId} waiting={view.waiting} focus={view.focus} />;
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
