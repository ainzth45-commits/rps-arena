import { useState } from "react";
import { ALL_MOVES, type Move, type MoveSet } from "../../domain/types";
import { playSfx } from "../../audio/sfx";
import { confirmMoveSet } from "../../state/actions";
import { findPlayer, isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { gameAssets } from "../../data/assets";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";

const SLOT_LABEL = ["เป่า 1", "เป่า 2", "เป่า 3"];

/**
 * ตั้ง/ปรับชุดมูฟ — จบด้วยจอทึบ "ส่ง iPad คืนซุป" ไม่โชว์ชุดมูฟซ้ำ (กันคนข้างๆ แอบเห็น)
 */
export function MoveSetScene({ playerId, onDone }: { playerId: string; onDone: () => void }) {
  const { state, update } = useGameStore();
  const player = findPlayer(state, playerId);
  const firstSetup = player ? !isInArena(player) : false;

  const [draft, setDraft] = useState<MoveSet>(player?.moveSet ?? ["rock", "scissors", "paper"]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;

  // จอทึบหลังบันทึก — ไม่โชว์ชุดมูฟอีก
  if (saved) {
    return (
      <section className="scene">
        <div className="panel secret-panel">
          <img className="secret-panel__lock" src={gameAssets.iconLock} alt="" />
          <h2 className="title">ชุดมูฟล็อกแล้ว</h2>
          <p className="lead">ส่ง iPad คืนซุป · ชุดมูฟยังลับอยู่</p>
          <div className="button-row">
            <Button onClick={onDone}>เรียบร้อย →</Button>
          </div>
        </div>
      </section>
    );
  }

  function setSlot(index: number, move: Move) {
    setDraft((current) => current.map((value, i) => (i === index ? move : value)) as MoveSet);
  }

  function confirm() {
    try {
      // คำนวณ state ใหม่ "นอก" setState — ถ้าโยน Error ข้างใน updater
      // มันจะหลุด try/catch นี้ไปพังตอน render แทน
      const next = confirmMoveSet(state, playerId, draft);
      update(() => next);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">ชุดมูฟลับของ {player.name}</p>
        <h2 className="title">{firstSetup ? "ตั้งชุดมูฟ ลงสังเวียน" : "ปรับชุดมูฟ"}</h2>
        <p className="lead">
          <b>ยืนยันแล้ว ตัวชี้กลับเป่า 1</b>
        </p>

        <div className="slot-row">
          {draft.map((move, index) => (
            <div key={index} className="slot">
              <span className="slot__label">{SLOT_LABEL[index]}</span>
              <div className="slot__choices">
                {ALL_MOVES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`slot__choice${move === option ? " slot__choice--on" : ""}`}
                    onClick={() => {
                      playSfx("tap");
                      setSlot(index, option);
                    }}
                  >
                    <MoveIcon move={option} size={78} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="callout callout--warn">{error}</p>}

        <div className="button-row">
          <Button variant="ghost" onClick={onDone}>
            ยกเลิก · ตัวชี้ไม่รีเซต
          </Button>
          <Button onClick={confirm}>ยืนยันชุดมูฟ</Button>
        </div>
      </div>
    </section>
  );
}
