import { gameAssets } from "../../data/assets";
import { useState } from "react";
import { hasPlayed, rankPlayers, totalMoveCount, visibleMoveRates } from "../../domain/rankingEngine";
import { formatTenths } from "../../domain/scoreEngine";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

/** ตารางอันดับ + "ภาษีของแชมป์" — กดที่ท็อป 3 เพื่อดูเรตการออกมูฟ */
export function RankingScene({ onBack }: { onBack: () => void }) {
  const { state } = useGameStore();
  // แสดงเฉพาะคนที่เคยแข่งแล้ว — คนที่ลงทะเบียนแต่ยังไม่แข่ง (30 แต้มเท่ากันหมด) ยังไม่เข้าอันดับ
  const ranked = rankPlayers(state.players.filter(hasPlayed));
  const [openId, setOpenId] = useState<string | null>(null);
  const waiting = state.players.filter((p) => !hasPlayed(p)).length;

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">ซีซั่น {state.season.id}</p>
        <h2 className="title">ตารางอันดับ</h2>
        <p className="lead">แตะที่คน 3 อันดับแรกเพื่อดูสถิติการออกมูฟของเขา — ราคาของการเป็นแชมป์</p>

        {ranked.length === 0 ? (
          <p className="callout">ยังไม่มีใครลงแข่งเลย — ดวลกันสักตาแล้วอันดับจะขึ้นที่นี่</p>
        ) : (
        <div className="rank-table">
          {ranked.map((row) => {
            const rates = visibleMoveRates(row.rank, row.player);
            const canOpen = rates !== null;
            const isOpen = openId === row.player.id;
            return (
              <div key={row.player.id} className="rank-row-wrap">
                <button
                  type="button"
                  className={`rank-row${canOpen ? " rank-row--tappable" : ""}`}
                  disabled={!canOpen}
                  onClick={() => setOpenId(isOpen ? null : row.player.id)}
                >
                  <span className="rank-row__rank">
                    {row.rank === 1 && <img className="rank-row__crown" src={gameAssets.crown} alt="จ่าฝูง" />}
                    {row.rank}
                  </span>
                  {row.player.imageUrl ? (
                    <img className="rank-row__photo" src={row.player.imageUrl} alt="" />
                  ) : (
                    <span className="rank-row__photo" />
                  )}
                  <span className="rank-row__name">
                    {row.player.name}
                    {row.player.streak >= 2 && <span className="rank-row__streak">ชนะติด {row.player.streak}</span>}
                  </span>
                  <span className="rank-row__score">{formatTenths(row.player.mainScoreTenths)}</span>
                  {row.player.subScore !== 0 && <span className="rank-row__sub">รอง {row.player.subScore}</span>}
                  {canOpen && <span className="rank-row__peek">{isOpen ? "▲" : "เปิดดู"}</span>}
                </button>

                {isOpen && rates && (
                  <div className="rate-panel">
                    {rates.length === 0 ? (
                      <p className="lead">ยังไม่มีข้อมูล — คนนี้ยังไม่เคยออกมูฟเลย</p>
                    ) : (
                      <>
                        <p className="eyebrow">
                          {row.rank === 1 ? "อันดับ 1 เปิดครบทั้ง 3 มูฟ" : "เปิดเฉพาะมูฟที่ออกบ่อยที่สุด"}
                        </p>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {waiting > 0 && ranked.length > 0 && (
          <p className="lead" style={{ opacity: 0.7 }}>
            อีก {waiting} คนลงทะเบียนแล้วแต่ยังไม่ลงแข่ง — ดวลสักตาแล้วจะเข้าอันดับ
          </p>
        )}

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            ← กลับ
          </Button>
        </div>
      </div>
    </section>
  );
}
