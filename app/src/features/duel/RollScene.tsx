import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";

/**
 * หน้าสุ่มคู่แข่งแบบ slot machine — แถบรูปวิ่งผ่านหน้าต่างตรงกลาง เร็ว→ช้า แล้วหยุดที่คนที่สุ่มได้
 * ผลถูกสุ่มไว้แล้ว (จริงล้วน เท่ากันทุกคน) หน้านี้แค่ "เฉลย" ให้ลุ้น
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
  const reelRef = useRef<HTMLDivElement | null>(null);
  // เก็บ onDone ล่าสุดไว้ใน ref — effect setup รันครั้งเดียว (mount) จึงห้ามผูก onDone/reel
  // เป็น dependency ไม่งั้น parent re-render (หรือ StrictMode) จะ clear timer ทิ้งกลางคัน = ค้าง
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // สร้างแถบยาว: วนรายชื่อหลายรอบ แล้วปิดท้ายด้วยคนที่สุ่มได้ตรงตำแหน่งหยุด
  const reel = useMemo(() => {
    const pool = candidateIds.length > 0 ? candidateIds : [resultId];
    const strip: string[] = [];
    const loops = Math.max(6, Math.ceil(28 / pool.length));
    for (let i = 0; i < loops; i += 1) strip.push(...pool);
    strip.push(resultId); // ช่องสุดท้าย = ผลจริง (แถบเลื่อนไปหยุดตรงนี้)
    return strip;
  }, [candidateIds, resultId]);

  const result = findPlayer(state, resultId);

  useLayoutEffect(() => {
    const reelEl = reelRef.current;
    if (!reelEl) {
      onDoneRef.current();
      return;
    }
    // อ่านความกว้างช่องจริงจาก DOM — hardcode ไม่ได้ เพราะช่องใช้ clamp/dvh เปลี่ยนตามจอ
    // ถ้าคลาดแม้ 1px จะสะสมทุกช่อง ทำให้ผลหยุดหลุดจากกรอบไปไกล
    const firstCell = reelEl.querySelector<HTMLElement>(".roll__cell");
    const CELL = firstCell?.getBoundingClientRect().width || 154;
    const winW = reelEl.parentElement?.clientWidth ?? 0; // ความกว้างหน้าต่างเฉลยจริง
    const stopIndex = reel.length - 1;

    // คำนวณเป็น px จาก "กลางหน้าต่าง" จริง — ห้ามใช้ 50% เพราะ % คิดจากความกว้างแถบ reel
    // ที่ยาวไม่เท่ากันตามจำนวนคน → จุดหยุดจะเพี้ยนไม่สอดคล้องกัน
    const centerX = winW / 2 - CELL / 2; // ทำให้ช่องแรก (index 0) อยู่กลางพอดี
    const finalX = centerX - stopIndex * CELL; // เลื่อนต่อจนช่องผล (ช่องสุดท้าย) มาอยู่กลาง

    // ตั้งตำแหน่งเริ่มที่ช่องแรกกลางจอก่อน (ปิด transition ชั่วคราว) แล้วค่อยวิ่งไปช่องผล
    reelEl.style.transition = "none";
    reelEl.style.transform = `translateX(${centerX}px)`;
    void reelEl.getBoundingClientRect(); // force reflow ให้ตำแหน่งเริ่มมีผลก่อนวิ่ง

    // เสียงติ๊กระหว่างวิ่ง เร็ว→ช้า (เหมือนวงล้อใกล้หยุด)
    const timers: number[] = [];
    let tickDelay = 60;
    let ticks = 0;
    const tick = () => {
      playSfx("tick");
      ticks += 1;
      tickDelay = Math.min(280, tickDelay * 1.12);
      if (ticks < 26) timers.push(window.setTimeout(tick, tickDelay));
    };
    timers.push(window.setTimeout(tick, tickDelay));

    // เลื่อนแถบไปหยุดที่ช่องผลจริง (คืน transition จาก CSS → ค่อยๆ ช้าลง)
    const rafId = requestAnimationFrame(() => {
      reelEl.style.transition = "";
      reelEl.style.transform = `translateX(${finalX}px)`;
    });

    // จบวิ่ง → เด้งชื่อ + ค้าง 1.5 วิ แล้วไปต่อ
    const revealAt = 3000;
    timers.push(
      window.setTimeout(() => {
        setDone(true);
        playSfx("reveal");
      }, revealAt),
    );
    timers.push(window.setTimeout(() => onDoneRef.current(), revealAt + 1500));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.cancelAnimationFrame(rafId);
    };
    // รันครั้งเดียวตอน mount — reel/onDone อ่านผ่าน closure/ref จึงไม่ต้องอยู่ใน deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={`roll${done ? " roll--done" : ""}`}>
      <p className="roll__eyebrow">🎲 สุ่มคู่แข่ง</p>
      <p className="roll__fair">สุ่มจริง โอกาสเท่ากันทุกคน</p>

      <div className="roll__window">
        <div className="roll__pointer roll__pointer--top">▼</div>
        <div className="roll__reel" ref={reelRef}>
          {reel.map((id, index) => {
            const player = findPlayer(state, id);
            return (
              <div key={`${id}-${index}`} className="roll__cell">
                <img
                  className="roll__photo"
                  src={player?.imageUrl || gameAssets.avatarPlaceholder}
                  alt=""
                />
              </div>
            );
          })}
        </div>
        <div className="roll__pointer roll__pointer--bottom">▲</div>
      </div>

      {done && (
        <div className="roll__result">
          <img className="roll__result-photo" src={result?.imageUrl || gameAssets.avatarPlaceholder} alt="" />
          <span className="roll__result-name">{result?.name}</span>
        </div>
      )}
    </section>
  );
}
