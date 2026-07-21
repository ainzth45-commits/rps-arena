import { gameAssets } from "../data/assets";
import { playSfx } from "../audio/sfx";

/**
 * ปุ่มกลับหน้าแรก — ลอยมุมขวาบนของทุกหน้า (ยกเว้นหน้าโลโก้/หน้าแรก/ช่วงกำลังดวล)
 * ระยะจากขอบเท่ากับโลโก้มุมซ้ายบนเป๊ะ (ตัวแปร --corner-* ตัวเดียวกัน) แบบเกมที่ 1
 */
export function HomeButton({ onHome }: { onHome: () => void }) {
  return (
    <button
      type="button"
      className="home-chip"
      aria-label="กลับหน้าแรก"
      onClick={() => {
        playSfx("tap");
        onHome();
      }}
    >
      <img src={gameAssets.iconHome} alt="" />
    </button>
  );
}
