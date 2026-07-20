import { useEffect, useState } from "react";
import { formatTenths } from "../../domain/scoreEngine";
import type { SeasonRecord } from "../../state/gameState";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

const PODIUM_ORDER = [1, 0, 2]; // ที่ 2 ซ้าย · ที่ 1 กลาง · ที่ 3 ขวา — แบบโพเดียมจริง

/**
 * ประกาศแชมป์ปิดซีซั่น — ต้องมีช็อตลุ้น: ขึ้นทีละอันดับจากท้ายไปหัว
 * จบแล้วเปิดชุดมูฟของทุกคน (ซีซั่นจบแล้ว ไม่มีความลับอีก)
 */
export function SeasonEndScene({
  record,
  onNewSeason,
  onExit,
}: {
  record: SeasonRecord;
  onNewSeason: () => void;
  onExit: () => void;
}) {
  // เผยทีละขั้น: 0 = ยังไม่เผย · 1 = ที่ 3 · 2 = ที่ 2 · 3 = ที่ 1 · 4 = เผยชุดมูฟ
  const [step, setStep] = useState(0);
  const [showSets, setShowSets] = useState(false);

  useEffect(() => {
    if (step >= 3) return;
    const timer = window.setTimeout(() => setStep((current) => current + 1), step === 0 ? 700 : 1500);
    return () => window.clearTimeout(timer);
  }, [step]);

  const top3 = record.rows.slice(0, 3);
  const champion = record.rows[0];
  const revealedFor = (rank: number) => (rank === 3 ? step >= 1 : rank === 2 ? step >= 2 : step >= 3);

  return (
    <section className="scene season-end">
      <p className="eyebrow">ปิดฉากซีซั่น {record.id}</p>
      <h2 className="title">{step >= 3 ? `${champion?.name ?? "—"} คือแชมป์!` : "ประกาศผล..."}</h2>

      <div className="podium">
        {PODIUM_ORDER.map((index) => {
          const row = top3[index];
          if (!row) return <div key={index} className="podium__slot podium__slot--empty" />;
          const shown = revealedFor(row.rank);
          return (
            <div
              key={row.playerId}
              className={`podium__slot podium__slot--${row.rank}${shown ? " is-in" : ""}`}
            >
              <span className="podium__rank">{row.rank}</span>
              {row.imageUrl ? (
                <img className="podium__photo" src={row.imageUrl} alt="" />
              ) : (
                <span className="podium__photo" />
              )}
              <span className="podium__name">{shown ? row.name : "???"}</span>
              <span className="podium__score">{shown ? formatTenths(row.mainScoreTenths) : "—"}</span>
              <div className="podium__block" />
            </div>
          );
        })}
      </div>

      {step >= 3 && (
        <>
          <p className="lead">
            ดวลกันทั้งซีซั่น <b>{record.totalDuels}</b> ครั้ง · สตรีคสูงสุดของแชมป์{" "}
            <b>{champion?.bestStreak ?? 0}</b> ครั้งติด
          </p>

          <div className="button-row">
            <Button variant="ghost" onClick={() => setShowSets((value) => !value)}>
              {showSets ? "ซ่อนชุดมูฟ" : "เปิดชุดมูฟลับของทุกคน"}
            </Button>
            <Button variant="ghost" onClick={onExit}>
              กลับหน้าแรก
            </Button>
            <Button onClick={onNewSeason}>เริ่มซีซั่นใหม่</Button>
          </div>

          {showSets && (
            <div className="reveal-list">
              {record.rows.map((row) => (
                <div key={row.playerId} className="reveal-row">
                  <span className="reveal-row__rank">{row.rank}</span>
                  <span className="reveal-row__name">{row.name}</span>
                  <span className="reveal-row__moves">
                    {row.finalMoveSet ? (
                      row.finalMoveSet.map((move, i) => (
                        <span key={i} className="reveal-row__move">
                          <MoveIcon move={move} size={26} />
                          <small>{moveLabel[move]}</small>
                        </span>
                      ))
                    ) : (
                      <small>ไม่ได้ลงสังเวียน</small>
                    )}
                  </span>
                  <span className="reveal-row__wl">
                    ชนะ {row.win} · แพ้ {row.lose}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
