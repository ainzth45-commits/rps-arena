import { useState } from "react";
import { gameAssets } from "../../data/assets";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";
import { MoveIcon } from "../../ui/MoveIcon";

interface Step {
  title: string;
  lines: string[];
  art: string;
  /** โชว์แถบไอคอนมูฟ 3 อันใต้ภาพ (ใช้ตอนอธิบายชุดมูฟ/ตัวชี้) */
  showMoves?: boolean;
}

/**
 * สอนเล่น 5 หน้า — กลไก "ตัวชี้ชุดมูฟ" ซับซ้อนที่สุด จึงกินไปสองหน้า
 * ข้อความเขียนสั้นๆ อ่านจบใน 5 วิ ต่อหน้า · เปิดจากหน้าแรกได้ตลอด ไม่บังคับดู
 */
export function TutorialScene({ onDone }: { onDone: () => void }) {
  const { state } = useGameStore();
  const [index, setIndex] = useState(0);

  const steps: Step[] = [
    {
      title: "เป่ายิ้งฉุบ ชิงคะแนนกันทั้งออฟฟิศ",
      lines: [
        `จ่าย ${state.config.coinCost} เหรียญให้ซุป = ได้ 1 รอบ`,
        "ในรอบนึงท้าคนอื่นดวลได้ 1 ครั้ง ชนะได้คะแนน แพ้เสียคะแนน",
      ],
      art: gameAssets.tutorialDuel,
    },
    {
      title: "ตั้งชุดมูฟ 3 ช่องไว้ล่วงหน้า",
      lines: [
        "ก่อนลงสังเวียนต้องตั้ง เป่า1 / เป่า2 / เป่า3 (ซ้ำกันได้)",
        "ชุดมูฟเป็นความลับ ไม่มีใครเห็นจนกว่าจะจบซีซั่น",
      ],
      art: gameAssets.tutorialMoveSet,
      showMoves: true,
    },
    {
      title: "เวลาโดนท้า ระบบออกมูฟแทนคุณ",
      lines: [
        "ตัวชี้จะออกมูฟจากช่องที่ชี้อยู่ แล้วเลื่อนไปช่องถัดไป ครบ 3 ช่องก็วนกลับช่องแรก",
        "ตัวชี้ผูกกับตัวคุณ ไม่ได้ผูกกับคู่ไหน — โดนท้าบ่อย ตัวชี้ยิ่งเดินไว",
      ],
      art: gameAssets.tutorialPointer,
      showMoves: true,
    },
    {
      title: "เลือกคู่แข่งเอง หรือกดสุ่ม?",
      lines: [
        `เลือกเอง: ชนะ +${state.config.pickedRates.win} · แพ้ ${state.config.pickedRates.lose}`,
        `กดสุ่ม: ชนะ +${state.config.randomRates.win} · แพ้ ${state.config.randomRates.lose} — เสี่ยงกว่า จึงคุ้มกว่า`,
      ],
      art: gameAssets.iconDice,
    },
    {
      title: "ชนะติดกันยิ่งได้เยอะ",
      lines: [
        `ชนะติดกันทุก 1 ครั้ง คะแนนชนะคูณเพิ่ม ${state.config.streakStepPercent}%`,
        "แพ้หรือเสมอเมื่อไหร่ สตรีคกลับไปเริ่มใหม่ · จ่าฝูงตอนจบซีซั่นคือแชมป์",
      ],
      art: gameAssets.crown,
    },
  ];

  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <section className="scene">
      <div className="panel tutorial">
        <p className="eyebrow">
          สอนเล่น {index + 1}/{steps.length}
        </p>
        <h2 className="title">{step.title}</h2>

        <img className="tutorial__art" src={step.art} alt="" />

        {step.showMoves && (
          <div className="tutorial__moves">
            {(["rock", "scissors", "paper"] as const).map((move, slot) => (
              <span key={move} className="tutorial__slot">
                <small>เป่า {slot + 1}</small>
                <MoveIcon move={move} size={44} />
              </span>
            ))}
          </div>
        )}

        <div className="tutorial__lines">
          {step.lines.map((line) => (
            <p key={line} className="lead">
              {line}
            </p>
          ))}
        </div>

        <div className="tutorial__dots" aria-hidden="true">
          {steps.map((one, dot) => (
            <span key={one.title} className={`tutorial__dot${dot === index ? " is-on" : ""}`} />
          ))}
        </div>

        <div className="button-row">
          <Button variant="ghost" onClick={() => (index === 0 ? onDone() : setIndex(index - 1))}>
            {index === 0 ? "ปิด" : "← ก่อนหน้า"}
          </Button>
          <Button onClick={() => (last ? onDone() : setIndex(index + 1))}>{last ? "เข้าใจแล้ว!" : "ถัดไป →"}</Button>
        </div>
      </div>
    </section>
  );
}
