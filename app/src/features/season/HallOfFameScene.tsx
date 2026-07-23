import { gameAssets } from "../../data/assets";
import { formatTenths } from "../../domain/scoreEngine";
import type { SeasonRecordRow } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

/** วันที่แบบไทยสั้นๆ เช่น "21 ก.ค. 26" — ไม่พึ่ง locale ของเครื่อง (iPad บางเครื่องตั้งอังกฤษ) */
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatDate(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return "—";
  const date = new Date(at);
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${String((date.getFullYear() + 543) % 100).padStart(2, "0")}`;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/**
 * ธรรมเนียบเกียรติยศ — โชว์แชมป์อันดับ 1-3 ของทุกซีซั่นที่จบแล้ว แบบโพเดียม (2-1-3)
 * เน้นเปิดโชว์ทีม (เกมหลักเท่านั้น ไม่สตรีมขึ้น TV) · ต่างจาก "บันทึกซีซั่นเก่า" ที่เป็นตารางละเอียด
 */
export function HallOfFameScene({ onBack }: { onBack: () => void }) {
  const { state } = useGameStore();
  // ใหม่สุดอยู่บนสุด — เห็นแชมป์ล่าสุดก่อน
  const records = [...state.records].sort((a, b) => b.endedAt - a.endedAt);

  if (records.length === 0) {
    return (
      <section className="scene">
        <div className="panel">
          <p className="eyebrow">🏆 ธรรมเนียบเกียรติยศ</p>
          <h2 className="title">ยังไม่มีแชมป์</h2>
          <p className="lead">จบซีซั่นแล้ว แชมป์อันดับ 1-3 จะขึ้นหอเกียรติยศที่นี่</p>
          <div className="button-row">
            <Button variant="ghost" onClick={onBack}>
              ← กลับ
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="scene hall">
      <div className="panel hall__panel">
        <p className="eyebrow">🏆 ธรรมเนียบเกียรติยศ</p>
        <h2 className="title hall__title">หอเกียรติยศแชมป์</h2>
        <p className="lead">อันดับ 1-3 ของทุกซีซั่นที่ปิดฉากแล้ว · {records.length} ซีซั่น</p>

        <div className="hall__scroll">
          {records.map((record) => {
            const [first, second, third] = record.rows;
            // เรียงแบบโพเดียม: อันดับ 2 ซ้าย · อันดับ 1 กลาง (สูงสุด) · อันดับ 3 ขวา
            const podium = [second, first, third].filter(Boolean) as SeasonRecordRow[];
            return (
              <div key={record.id} className="hall__season">
                <div className="hall__season-head">
                  <span className="hall__season-id">{record.id}</span>
                  <span className="hall__season-date">
                    ปิดฉาก {formatDate(record.endedAt)} · ดวล {record.totalDuels} ครั้ง
                  </span>
                </div>

                <div className="hall__podium">
                  {podium.map((row) => (
                    <div key={row.playerId} className={`hall__slot hall__slot--${row.rank}`}>
                      <span className="hall__medal">{MEDAL[row.rank] ?? row.rank}</span>
                      <span className="hall__photo-wrap">
                        {row.rank === 1 && <img className="hall__crown" src={gameAssets.crown} alt="" />}
                        <img
                          className="hall__photo"
                          src={row.imageUrl || gameAssets.avatarPlaceholder}
                          alt=""
                        />
                      </span>
                      <span className="hall__name">{row.name}</span>
                      <span className="hall__score">{formatTenths(row.mainScoreTenths)}</span>
                      <span className="hall__step">{row.rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            ← กลับ
          </Button>
        </div>
      </div>
    </section>
  );
}
