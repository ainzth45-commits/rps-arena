/**
 * พื้นหลังเฉพาะห้อง — วางเป็นเลเยอร์หลังสุดของฉาก
 * ใช้คู่กับ class `scene--art` ที่ <section> (ตัวจัด stacking ให้เนื้อหาลอยเหนือภาพ)
 */
export function SceneBackdrop({ src }: { src: string }) {
  return <img className="scene-backdrop" src={src} alt="" />;
}
