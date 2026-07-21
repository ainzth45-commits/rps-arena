// แถบเมนูล่างแบบเกมที่ 1 — ปุ่มไอคอน + ชื่อกำกับ เรียงเป็นแถว
import type { ReactNode } from "react";
import { playSfx } from "../audio/sfx";

export interface DockItem {
  key: string;
  label: string;
  /** ไอคอนจริง (รอ Codex) — ยังไม่มีก็ใช้ตัวย่อภาษาไทยไปก่อน */
  icon?: string;
  short: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledNote?: string;
}

export function Dock({ items }: { items: DockItem[] }) {
  return (
    <nav className="dock">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="dock-btn"
          data-dock={item.key}
          disabled={item.disabled}
          title={item.disabled ? item.disabledNote : undefined}
          onClick={() => {
            playSfx("tap");
            item.onClick();
          }}
        >
          <span className="dock-btn__icon">
            {item.icon ? <img src={item.icon} alt="" /> : <span className="dock-btn__short">{item.short}</span>}
          </span>
          <span className="dock-btn__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
