import { useEffect, useState } from "react";
import { gameAssets } from "../../data/assets";
import { boostPreload, getPreloadProgress, subscribePreload } from "../../data/preloadAssets";
import { playSfx, unlockAudio } from "../../audio/sfx";

/**
 * หน้าเปิดเกม — โลโก้ใหญ่กลางจอ แตะโลโก้เพื่อเข้าเกม
 * การแตะครั้งแรกยังทำหน้าที่ปลุกระบบเสียงด้วย (iPad ต้องมี gesture ก่อนเล่นเสียงได้)
 *
 * ถ้ารูปทั้งเกมยังโหลดไม่ครบ แตะแล้วค้างหน้าโหลดไว้ก่อน — เห็น 100% ชัดๆ แล้วค่อยพาเข้าหน้าแรก
 * (แบบเดียวกับเกมที่ 1 · กันอาการรูปค่อยๆ โผล่กลางเกม)
 */
export function BootScene({ onEnter }: { onEnter: () => void }) {
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(() => getPreloadProgress());

  const done = progress.total > 0 && progress.loaded >= progress.total;
  const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  useEffect(() => {
    if (!waiting) return;
    const update = () => setProgress(getPreloadProgress());
    update();
    return subscribePreload(update);
  }, [waiting]);

  // โหลดครบระหว่างรอ → ค้างภาพ 100% ให้เห็นจังหวะสำเร็จก่อน แล้วค่อยเข้าเกม
  useEffect(() => {
    if (!waiting || !done) return;
    const timer = window.setTimeout(onEnter, 800);
    return () => window.clearTimeout(timer);
  }, [waiting, done, onEnter]);

  function enter() {
    unlockAudio(); // gesture แรกของเกม — ปลุก AudioContext ตรงนี้ที่เดียว
    playSfx("confirm");
    const now = getPreloadProgress();
    if (now.total > 0 && now.loaded >= now.total) {
      onEnter();
      return;
    }
    boostPreload();
    setWaiting(true);
  }

  if (waiting) {
    return (
      <section className="boot boot--loading">
        <h1 className="visually-hidden">เป่า ยิ้ง ฉุบ! อารีน่า!</h1>
        <img className="boot__logo boot__logo--loading" src={gameAssets.logo} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />
        <div className="boot-load">
          <div
            className="boot-load__track"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="boot-load__fill" style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
          <p className="boot-load__label">
            {done ? "พร้อมลุย! 100%" : `อุ่นเครื่อง... ${percent}%`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="boot">
      <h1 className="visually-hidden">เป่า ยิ้ง ฉุบ! อารีน่า!</h1>
      <button type="button" className="boot__logo-btn" onClick={enter}>
        <img className="boot__logo" src={gameAssets.logo} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />
      </button>
      <p className="boot__hint">แตะโลโก้เพื่อลงสังเวียน</p>
    </section>
  );
}
