import { useState } from "react";
import { gameAssets } from "../../data/assets";
import { formatTenths } from "../../domain/scoreEngine";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon, moveLabel } from "../../ui/MoveIcon";

/** วันที่แบบไทยสั้นๆ เช่น "21 ก.ค. 26" — ไม่พึ่ง locale ของเครื่อง (iPad บางเครื่องตั้งอังกฤษ) */
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatDate(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return "—";
  const date = new Date(at);
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${String((date.getFullYear() + 543) % 100).padStart(2, "0")}`;
}

/**
 * บันทึกซีซั่นเก่า — เลือกซีซั่นจากรายการซ้าย แล้วดูตารางอันดับเต็มของซีซั่นนั้น
 * ซีซั่นจบแล้วจึงเปิดชุดมูฟสุดท้ายของทุกคนได้ (ไม่มีความลับให้ปกป้องอีก)
 */
export function SeasonRecordsScene({ onBack }: { onBack: () => void }) {
  const { state } = useGameStore();
  // ใหม่สุดอยู่บนสุด
  const records = [...state.records].sort((a, b) => b.endedAt - a.endedAt);
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const selected = records.find((record) => record.id === selectedId) ?? records[0];

  if (records.length === 0) {
    return (
      <section className="scene">
        <div className="panel">
          <p className="eyebrow">เมนูซุป</p>
          <h2 className="title">ยังไม่มีซีซั่นที่จบ</h2>
          <p className="lead">จบซีซั่นแล้ว อันดับจะมาอยู่ที่นี่</p>
          <div className="button-row">
            <Button variant="ghost" onClick={onBack}>
              กลับ
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const champion = selected?.rows[0];

  return (
    <section className="scene">
      <div className="panel records">
        <p className="eyebrow">บันทึกซีซั่นเก่า ({records.length} ซีซั่น)</p>

        <div className="records__body">
          <div className="records__list">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`records__item${record.id === selected?.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(record.id)}
              >
                <span className="records__item-id">{record.id}</span>
                <span className="records__item-champ">🏆 {record.rows[0]?.name ?? "—"}</span>
                <span className="records__item-date">{formatDate(record.endedAt)}</span>
              </button>
            ))}
          </div>

          <div className="records__detail">
            {selected && (
              <>
                <h2 className="title records__title">
                  <img className="records__trophy" src={gameAssets.seasonTrophy} alt="" />
                  {champion?.name ?? "—"}
                </h2>
                <p className="lead">
                  {selected.id} · ดวล <b>{selected.totalDuels}</b> ครั้ง · จบ{" "}
                  {formatDate(selected.endedAt)}
                </p>

                <div className="reveal-list">
                  {selected.rows.map((row) => (
                    <div key={row.playerId} className="reveal-row">
                      <span className="reveal-row__rank">{row.rank}</span>
                      <img className="reveal-row__photo" src={row.imageUrl || gameAssets.avatarPlaceholder} alt="" />
                      <span className="reveal-row__name">{row.name}</span>
                      <span className="reveal-row__moves">
                        {row.finalMoveSet ? (
                          row.finalMoveSet.map((move, index) => (
                            <span key={index} className="reveal-row__move">
                              <MoveIcon move={move} size={26} />
                              <small>{moveLabel[move]}</small>
                            </span>
                          ))
                        ) : (
                          <small>ไม่ได้ลงสังเวียน</small>
                        )}
                      </span>
                      <span className="reveal-row__wl">
                        {formatTenths(row.mainScoreTenths)} · ชนะ {row.win} · แพ้ {row.lose}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
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
