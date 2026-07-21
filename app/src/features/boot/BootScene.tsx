import { gameAssets } from "../../data/assets";
import { playSfx, unlockAudio } from "../../audio/sfx";

/**
 * หน้าเปิดเกม — โครงเดียวกับหน้า boot ของเกมสายลับ
 * ฉากหรี่ลงมาก · โลโก้ใหญ่กลางจอ · แตะโลโก้เพื่อเข้าเกม
 */
export function BootScene({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="boot">
      <h1 className="visually-hidden">เป่า ยิ้ง ฉุบ! อารีน่า!</h1>
      <button
        type="button"
        className="boot__logo-btn"
        onClick={() => {
          unlockAudio(); // gesture แรกของเกม — ปลุก AudioContext ตรงนี้ที่เดียว
          playSfx("confirm");
          onEnter();
        }}
      >
        <img className="boot__logo" src={gameAssets.logo} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />
      </button>
      <p className="boot__hint">แตะโลโก้เพื่อลงสังเวียน</p>
    </section>
  );
}
