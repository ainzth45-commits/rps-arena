import { useEffect, useMemo, useState } from "react";

const COLORS = ["#ffd93d", "#e82f9c", "#2b4bd8", "#6a2fd0", "#ff5fc4", "#fdf7ff"];

/**
 * เศษกระดาษฉลองตกจากด้านบน — ทำด้วย CSS ล้วน (ไม่ต้องมี asset)
 * ใช้ค่าคงที่ต่อชิ้นจาก index (ไม่ใช้ Math.random ตอน render เพื่อไม่ให้กระพริบ)
 */
export function Confetti({ count = 40, stopAfterMs = null }: { count?: number; stopAfterMs?: number | null }) {
  const [visible, setVisible] = useState(true);
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // กระจายค่าแบบ deterministic จาก index
        const left = (i * 97) % 100;
        const delay = ((i * 53) % 100) / 50; // 0–2s
        const duration = 2.4 + (((i * 31) % 100) / 100) * 1.8; // 2.4–4.2s
        const size = 6 + ((i * 17) % 8);
        const color = COLORS[i % COLORS.length];
        const rotate = (i * 47) % 360;
        return { left, delay, duration, size, color, rotate, i };
      }),
    [count],
  );

  useEffect(() => {
    setVisible(true);
    if (stopAfterMs === null) return undefined;
    const timer = window.setTimeout(() => setVisible(false), stopAfterMs);
    return () => window.clearTimeout(timer);
  }, [stopAfterMs]);

  if (!visible) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="confetti__bit"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
