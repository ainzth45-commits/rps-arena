import { useLayoutEffect, useRef, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";

/**
 * หน้าสุ่มคู่แข่งแบบ "กาชา" — แคปซูลกลางจอสลับรูปผู้เล่นถี่→ช้า แล้วหยุดเฉลยคนที่สุ่มได้
 * (พอร์ตกลไกจากกาชาเกมที่ 1: สลับรูปในช่องเดียวด้วย setState ไม่มีแถบเลื่อน/คำนวณตำแหน่งพิกเซล
 *  จึงไม่มีทาง "หยุดไม่ตรงกรอบ") · ผลถูกสุ่มไว้แล้ว (จริงล้วน เท่ากันทุกคน) หน้านี้แค่เฉลยให้ลุ้น
 *  layout เป็นแคปซูลกลางจอ → ใช้ได้ทั้ง iPad และเมื่อสตรีมขึ้นจอ TV (16:9)
 */
export function RollScene({
  candidateIds,
  resultId,
  onDone,
}: {
  candidateIds: readonly string[];
  resultId: string;
  onDone: () => void;
}) {
  const { state } = useGameStore();
  const [done, setDone] = useState(false);
  const [reelId, setReelId] = useState<string>(() => candidateIds[0] ?? resultId);
  // onDone ล่าสุดใน ref — effect รันครั้งเดียว (mount) ห้ามผูก dependency ไม่งั้น
  // StrictMode/parent re-render จะ clear timer ทิ้งกลางคัน (บทเรียนจาก slot เดิม)
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const result = findPlayer(state, resultId);
  const reelPlayer = findPlayer(state, reelId);

  // อุ่น cache รูปผู้เล่นทุกคนในพูลก่อนเริ่มหมุน — ตอนสลับรูป (key เปลี่ยน = img mount ใหม่)
  // จะดึงจาก cache ทันที ไม่กระพริบว่างระหว่างโหลด remote (เหตุที่รูปจริง "สลับ/ขึ้นตก")
  useLayoutEffect(() => {
    if (typeof Image === "undefined") return;
    const ids = candidateIds.length > 0 ? candidateIds : [resultId];
    for (const id of ids) {
      const url = findPlayer(state, id)?.imageUrl;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
    // อุ่นครั้งเดียวตอน mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const pool = candidateIds.length > 0 ? candidateIds : [resultId];
    const timers: number[] = [];
    const SPIN_MS = 2800; // รวมเวลาลุ้นก่อนเฉลย
    let delay = 80; // เริ่มสลับเร็ว แล้วค่อยๆ ช้าลง (เหมือนวงล้อใกล้หยุด)
    let elapsed = 0;

    const tick = () => {
      // สลับรูปถัดไป — เลี่ยงซ้ำอันเดิมติดกัน ให้ตาเห็นว่าหมุนจริง
      setReelId((prev) => {
        if (pool.length === 1) return pool[0];
        let next = prev;
        while (next === prev) next = pool[Math.floor(Math.random() * pool.length)];
        return next;
      });
      playSfx("tick");
      elapsed += delay;
      delay = Math.min(360, delay * 1.09);
      if (elapsed < SPIN_MS) {
        timers.push(window.setTimeout(tick, delay));
      } else {
        // หยุด → เฉลยคนที่สุ่มได้จริง + เด้งชื่อ แล้วหน่วงไปต่อ
        setReelId(resultId);
        setDone(true);
        playSfx("reveal");
        timers.push(window.setTimeout(() => onDoneRef.current(), 1700));
      }
    };
    timers.push(window.setTimeout(tick, delay));

    return () => timers.forEach((id) => window.clearTimeout(id));
    // รันครั้งเดียวตอน mount — candidateIds/resultId/onDone อ่านผ่าน closure/ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = done ? result : reelPlayer;

  return (
    <section className={`roll${done ? " roll--done" : ""}`}>
      <p className="roll__eyebrow">🎲 สุ่มคู่แข่ง</p>
      <p className="roll__fair">สุ่มจริง โอกาสเท่ากันทุกคน</p>

      <div className={`roll__capsule${done ? " roll__capsule--done" : ""}`}>
        <div className="roll__capsule-ring" aria-hidden="true" />
        <img
          key={done ? "result" : reelId}
          className="roll__capsule-photo"
          src={shown?.imageUrl || gameAssets.avatarPlaceholder}
          alt=""
        />
      </div>

      <div className="roll__nameplate">
        {done ? (
          <span className="roll__result-name">{result?.name}</span>
        ) : (
          <span className="roll__spinning">กำลังสุ่ม…</span>
        )}
      </div>
    </section>
  );
}
