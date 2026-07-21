import { useState } from "react";
import { defaultConfig, type GameConfig, type OutcomeRates } from "../../domain/types";
import { configLimits, updateConfig } from "../../state/actions";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

type RateKey = "pickedRates" | "randomRates" | "opponentRates" | "offRoundRates";

const RATE_ROWS: { key: RateKey; label: string; note: string }[] = [
  { key: "pickedRates", label: "ผู้ท้าชิง — เลือกคู่แข่งเอง", note: "เลือกเป้าเอง" },
  { key: "randomRates", label: "ผู้ท้าชิง — กดสุ่ม", note: "เสี่ยงกว่า ได้มากกว่า" },
  { key: "opponentRates", label: "คู่แข่ง (ถูกท้า)", note: "ระบบออกมูฟแทน · ไม่มีสตรีค" },
  { key: "offRoundRates", label: "ดวลนอกรอบ", note: "เรทเบา · ทั้งสองฝ่าย" },
];

const NUMBER_ROWS: {
  key: "startScore" | "coinCost" | "movePickSeconds" | "streakStepPercent" | "farmWarnMinDuels";
  label: string;
  unit: string;
  note?: string;
}[] = [
  { key: "startScore", label: "คะแนนตั้งต้น", unit: "คะแนน", note: "เริ่มซีซั่นใหม่เท่านั้น" },
  { key: "coinCost", label: "ค่าเล่นต่อรอบ", unit: "เหรียญ", note: "โชว์เฉยๆ ไม่เก็บยอด" },
  { key: "movePickSeconds", label: "เวลาเลือกมูฟ", unit: "วินาที" },
  { key: "streakStepPercent", label: "โบนัสสตรีคต่อชนะติด 1 ครั้ง", unit: "%" },
  { key: "farmWarnMinDuels", label: "เตือน “โดนไล่เก็บ” เมื่อโดนท้าซ้ำ", unit: "ครั้ง" },
];

/** ปรับเรทคะแนน/เวลาในเกม — ค่าทุกตัวถูกบีบเข้าขอบเขตที่ actions กำหนดเสมอ */
export function ConfigScene({ onBack }: { onBack: () => void }) {
  const { state, update } = useGameStore();
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<GameConfig>) {
    update((current) => updateConfig(current, next));
    setSaved(true);
  }

  function step(key: (typeof NUMBER_ROWS)[number]["key"], delta: number) {
    patch({ [key]: state.config[key] + delta } as Partial<GameConfig>);
  }

  function stepRate(key: RateKey, field: keyof OutcomeRates, delta: number) {
    patch({ [key]: { ...state.config[key], [field]: state.config[key][field] + delta } } as Partial<GameConfig>);
  }

  return (
    <section className="scene">
      <div className="panel config">
        <p className="eyebrow">เมนูซุป</p>
        <h2 className="title">ปรับค่าเกม</h2>

        <div className="config__body">
          <div className="config__group">
            <h3 className="settings-block__title">ตัวเลขทั่วไป</h3>
            {NUMBER_ROWS.map((row) => (
              <div key={row.key} className="config__row">
                <span className="config__label">
                  {row.label}
                  {row.note && <small>{row.note}</small>}
                </span>
                <Stepper
                  value={state.config[row.key]}
                  unit={row.unit}
                  onStep={(delta) => step(row.key, delta)}
                />
              </div>
            ))}
          </div>

          <div className="config__group">
            <h3 className="settings-block__title">เรทคะแนน (ชนะ / เสมอ / แพ้)</h3>
            {RATE_ROWS.map((row) => (
              <div key={row.key} className="config__row config__row--rates">
                <span className="config__label">
                  {row.label}
                  <small>{row.note}</small>
                </span>
                <div className="config__rates">
                  {(["win", "draw", "lose"] as const).map((field) => (
                    <Stepper
                      key={field}
                      value={state.config[row.key][field]}
                      unit={field === "win" ? "ชนะ" : field === "draw" ? "เสมอ" : "แพ้"}
                      onStep={(delta) => stepRate(row.key, field, delta)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="config__hint">
          ล็อกช่วงไว้: เรท {configLimits.rate.min} ถึง {configLimits.rate.max} · เวลาเลือกมูฟ{" "}
          {configLimits.movePickSeconds.min}–{configLimits.movePickSeconds.max} วิ · กดแล้วบันทึกทันที
          {saved && <b> ✓ บันทึกแล้ว</b>}
        </p>

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            ← กลับ
          </Button>
          <Button variant="danger" onClick={() => patch({ ...defaultConfig })}>
            คืนค่าเริ่มต้น
          </Button>
        </div>
      </div>
    </section>
  );
}

function Stepper({ value, unit, onStep }: { value: number; unit: string; onStep: (delta: number) => void }) {
  return (
    <span className="stepper">
      <button type="button" className="stepper__btn" onClick={() => onStep(-1)} aria-label={`ลด ${unit}`}>
        −
      </button>
      <span className="stepper__value">
        {value}
        <small>{unit}</small>
      </span>
      <button type="button" className="stepper__btn" onClick={() => onStep(1)} aria-label={`เพิ่ม ${unit}`}>
        +
      </button>
    </span>
  );
}
