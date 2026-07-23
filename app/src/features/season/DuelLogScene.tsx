import { useMemo, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { formatDelta } from "../../domain/scoreEngine";
import { deleteDuels } from "../../state/actions";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";

/**
 * ประวัติการดวลทั้งหมด (เมนูซุป) — เลือกลบรายการที่เป็นการทดสอบทิ้งได้
 * ลบแล้วระบบคำนวณคะแนน/สถิติ/อันดับใหม่ทั้งหมดจากรายการที่เหลือ (ไม่ต้องรีเซตซีซั่น)
 */
export function DuelLogScene({ onBack }: { onBack: () => void }) {
  const { state, update } = useGameStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ใหม่สุดอยู่บนสุด
  const duels = useMemo(() => [...state.duels].sort((a, b) => b.at - a.at), [state.duels]);

  function toggle(id: string) {
    playSfx("tap");
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function doDelete() {
    try {
      const ids = [...selected];
      update((current) => deleteDuels(current, ids));
      setSelected(new Set());
      setConfirming(false);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ลบไม่สำเร็จ");
      setConfirming(false);
    }
  }

  const roundOpen = state.round !== null;

  return (
    <section className="scene">
      <div className="panel duel-log">
        <p className="eyebrow">เมนูซุป</p>
        <h2 className="title">ประวัติการดวลทั้งหมด ({duels.length})</h2>
        <p className="lead duel-log__hint">แตะเลือกดวลที่เป็นการทดสอบ แล้วลบทิ้ง — คะแนนกับอันดับจะคิดใหม่ให้เอง</p>

        {roundOpen && <p className="callout callout--warn">มีรอบเปิดค้างอยู่ — จบรอบก่อนถึงจะลบได้</p>}
        {error && <p className="callout callout--warn">{error}</p>}

        {duels.length === 0 ? (
          <p className="callout">ยังไม่มีการดวลในซีซั่นนี้</p>
        ) : (
          <div className="duel-log__list">
            {duels.map((duel) => {
              const isPicked = selected.has(duel.id);
              const outcome = duel.challengerOutcome;
              return (
                <button
                  key={duel.id}
                  type="button"
                  className={`duel-log__row${isPicked ? " is-picked" : ""}`}
                  onClick={() => toggle(duel.id)}
                >
                  <span className={`duel-log__check${isPicked ? " is-on" : ""}`}>{isPicked ? "✓" : ""}</span>
                  <span className={`duel-log__mode duel-log__mode--${duel.mode}`}>
                    {duel.mode === "offRound" ? "นอกรอบ" : "ท้าดวล"}
                  </span>
                  <span className="duel-log__names">
                    <b>{duel.challengerName}</b>
                    <small>ท้า {duel.opponentName}</small>
                  </span>
                  <span className="duel-log__moves">
                    <MoveIcon move={duel.challengerMove} size={26} />
                    <b>vs</b>
                    <MoveIcon move={duel.opponentMove} size={26} />
                  </span>
                  <span className={`duel-log__result duel-log__result--${outcome}`}>
                    {outcome === "win" ? "ชนะ" : outcome === "draw" ? "เสมอ" : "แพ้"}
                  </span>
                  <span className="duel-log__delta">{formatDelta(duel.challengerDeltaTenths)}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            <img className="btn__icon" src={gameAssets.iconHome} alt="" />
            กลับ
          </Button>
          {confirming ? (
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                ยกเลิก
              </Button>
              <Button variant="danger" onClick={doDelete}>
                ยืนยัน ลบ {selected.size} รายการ
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              disabled={selected.size === 0 || roundOpen}
              onClick={() => setConfirming(true)}
            >
              ลบที่เลือก ({selected.size})
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
