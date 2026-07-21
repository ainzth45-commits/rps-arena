import { useEffect, useMemo, useRef, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { hasPlayed, rankPlayers, totalMoveCount, visibleMoveRates } from "../../domain/rankingEngine";
import { formatTenths } from "../../domain/scoreEngine";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

/** สภาพก่อนดวลของคนที่เพิ่งเล่น — ใช้เล่นอนิเมชัน "อันดับขยับ" ให้เขาเห็น */
export interface RankFocus {
  playerId: string;
  fromRank: number;
  fromScoreTenths: number;
}

/** ตารางอันดับ + "ภาษีของแชมป์" — กดที่ท็อป 3 เพื่อดูเรตการออกมูฟ */
export function RankingScene({
  onBack,
  backToHome = false,
  focus = null,
}: {
  onBack: () => void;
  /** true = ออกจากหน้านี้แล้วกลับหน้าแรก (ใช้ไอคอนบ้านแทนคำว่ากลับ) */
  backToHome?: boolean;
  focus?: RankFocus | null;
}) {
  const { state } = useGameStore();
  // แสดงเฉพาะคนที่เคยแข่งแล้ว — คนที่ลงทะเบียนแต่ยังไม่แข่ง (คะแนนเท่ากันหมด) ยังไม่เข้าอันดับ
  const ranked = useMemo(() => rankPlayers(state.players.filter(hasPlayed)), [state.players]);
  const [openId, setOpenId] = useState<string | null>(null);
  const waiting = state.players.filter((player) => !hasPlayed(player)).length;

  const focusRow = focus ? ranked.find((row) => row.player.id === focus.playerId) : undefined;
  const rankDelta = focus && focusRow && focus.fromRank > 0 ? focus.fromRank - focusRow.rank : 0;

  // ── ตัวเลขคะแนนวิ่งจากค่าก่อนดวล → ค่าปัจจุบัน ─────────────
  const [shownTenths, setShownTenths] = useState<number | null>(focus ? focus.fromScoreTenths : null);
  const played = useRef(false);

  /**
   * อนิเมชันอันดับ: ค้างแถวไว้ที่ "ตำแหน่งเดิม" ก่อน แล้วค่อยไหลไปตำแหน่งใหม่
   * ระหว่างไหล ขนาด (รูป/ตัวเลข) ก็ค่อยๆ เปลี่ยนตามชั้นอันดับใหม่ด้วย
   */
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [settled, setSettled] = useState(() => !focus);
  const [holdOffset, setHoldOffset] = useState(0);

  useEffect(() => {
    if (!focus || !focusRow || rankDelta === 0) {
      setSettled(true);
      return;
    }
    const rows = tableRef.current?.querySelectorAll<HTMLElement>(".rank-row-wrap");
    if (!rows || rows.length === 0) {
      setSettled(true);
      return;
    }
    const toIndex = ranked.findIndex((row) => row.player.id === focus.playerId);
    const fromIndex = Math.min(rows.length - 1, Math.max(0, toIndex + rankDelta));
    const offset = rows[fromIndex].offsetTop - rows[toIndex].offsetTop;
    setHoldOffset(offset);
    // ค้างให้เห็นตำแหน่งเดิมก่อน แล้วค่อยปล่อยไหล (ตรงกับจังหวะเสียงไต่/ร่วงอันดับ)
    const timer = window.setTimeout(() => setSettled(true), 850);
    return () => window.clearTimeout(timer);
  }, [focus, focusRow, rankDelta, ranked]);

  useEffect(() => {
    if (!focus || !focusRow || played.current) return;
    played.current = true;

    const target = focusRow.player.mainScoreTenths;
    const start = focus.fromScoreTenths;
    const timers: number[] = [];

    // 1) ตัวเลขวิ่ง — ยาว ~800ms ไม่ว่าคะแนนจะห่างแค่ไหน
    const steps = Math.min(24, Math.max(1, Math.abs(target - start)));
    for (let i = 1; i <= steps; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setShownTenths(Math.round(start + ((target - start) * i) / steps));
          if (i % 2 === 0 || steps < 6) playSfx("countTick");
        }, (800 / steps) * i),
      );
    }

    // 2) เสียงตามทิศทางอันดับ — ขึ้นกี่ขั้นก็กี่จังหวะ ยิ่งเยอะยิ่งถี่ · ตกก็ลากเสียงดิ่งยาวตามขั้น
    if (rankDelta > 0) {
      const gap = Math.max(90, 260 - rankDelta * 28); // ขั้นเยอะ = ถี่ขึ้น
      for (let i = 0; i < rankDelta; i += 1) {
        timers.push(window.setTimeout(() => playSfx("rankUpStep", { step: i }), 850 + gap * i));
      }
    } else if (rankDelta < 0) {
      timers.push(window.setTimeout(() => playSfx("rankDownSlide", { steps: Math.abs(rankDelta) }), 850));
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [focus, focusRow, rankDelta]);

  return (
    <section className="scene ranking">
      <div className="panel ranking__panel">
        <p className="eyebrow">ซีซั่น {state.season.id}</p>
        <h2 className="title">ตารางอันดับ</h2>

        {ranked.length === 0 ? (
          <p className="callout">ยังไม่มีอันดับ · ดวลสักตาก่อน</p>
        ) : (
          <div className="rank-table" ref={tableRef}>
            {ranked.map((row) => {
              const rates = visibleMoveRates(row.rank, row.player);
              const canOpen = rates !== null;
              const isOpen = openId === row.player.id;
              const isFocus = focus?.playerId === row.player.id;
              // ระหว่างค้าง ใช้ชั้นขนาดของ "อันดับเดิม" แล้วค่อยสลับเป็นอันดับใหม่ตอนไหล
              const tier = isFocus && !settled && focus ? Math.min(focus.fromRank, 4) : Math.min(row.rank, 4);
              const scoreTenths = isFocus && shownTenths !== null ? shownTenths : row.player.mainScoreTenths;
              return (
                <div
                  key={row.player.id}
                  className="rank-row-wrap"
                  style={
                    isFocus && !settled
                      ? { transform: `translateY(${holdOffset}px)`, zIndex: 3 }
                      : isFocus
                        ? { zIndex: 3 }
                        : undefined
                  }
                >
                  <button
                    type="button"
                    className={[
                      "rank-row",
                      `rank-row--top${tier}`,
                      canOpen ? "rank-row--tappable" : "",
                      isFocus ? "rank-row--focus" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={!canOpen}
                    onClick={() => setOpenId(isOpen ? null : row.player.id)}
                  >
                    <span className="rank-row__rank">
                      {row.rank === 1 && <img className="rank-row__crown" src={gameAssets.crown} alt="จ่าฝูง" />}
                      {row.rank}
                    </span>
                    <img
                      className="rank-row__photo"
                      src={row.player.imageUrl || gameAssets.avatarPlaceholder}
                      alt=""
                    />
                    <span className="rank-row__name">
                      {row.player.name}
                      {row.player.streak >= 2 && (
                        <span className="rank-row__streak">
                          <img src={gameAssets.streakFire} alt="" />
                          {row.player.streak}
                        </span>
                      )}
                    </span>

                    {isFocus && rankDelta !== 0 && (
                      <span className={`rank-row__delta rank-row__delta--${rankDelta > 0 ? "up" : "down"}`}>
                        {rankDelta > 0 ? `▲ ${rankDelta}` : `▼ ${Math.abs(rankDelta)}`}
                      </span>
                    )}

                    <span className="rank-row__score">{formatTenths(scoreTenths)}</span>
                    {row.player.subScore !== 0 && <span className="rank-row__sub">รอง {row.player.subScore}</span>}
                    {canOpen && (
                      <span className={`rank-row__peek${isOpen ? " is-open" : ""}`}>
                        <img src={gameAssets.iconMoveSet} alt="ดูมูฟ" />
                      </span>
                    )}
                  </button>

                  {isOpen && rates && (
                    <div className="rate-panel">
                      {rates.length === 0 ? (
                        <p className="lead">ยังไม่ออกมูฟ</p>
                      ) : (
                        <div className="rate-list">
                          {rates.map((rate) => (
                            <div key={rate.move} className="rate-item">
                              <MoveIcon move={rate.move} size={34} />
                              <span className="rate-item__label">{moveLabel[rate.move]}</span>
                              <span className="rate-item__percent">{rate.percent}%</span>
                              <span className="rate-item__count">จาก {totalMoveCount(row.player)} ครั้ง</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {waiting > 0 && <p className="lead ranking__waiting">รออีก {waiting} คนลงแข่ง</p>}

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            {backToHome ? (
              <>
                <img className="btn__icon" src={gameAssets.iconHome} alt="" />
                หน้าแรก
              </>
            ) : (
              "← กลับ"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
