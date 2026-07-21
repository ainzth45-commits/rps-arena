// ระบบเสียงของเกม — สังเคราะห์เสียงเองด้วย Web Audio ไม่ต้องโหลดไฟล์เสียงเลย
//
// ข้อควรระวังที่ออกแบบรองรับไว้ตั้งแต่ต้น:
// - iPad/Safari ห้ามเล่นเสียงก่อนผู้ใช้แตะจอ → AudioContext ถูกสร้าง "ตอนแตะครั้งแรก" เท่านั้น
// - เครื่อง/เบราว์เซอร์ที่ไม่มี Web Audio → ทุกฟังก์ชันต้องเงียบแล้วไปต่อ ห้าม throw
// - localStorage อาจอ่าน/เขียนไม่ได้ (โหมดส่วนตัว) → ค่าเปิด-ปิดเสียงกลับไปใช้ default ได้เสมอ

const MUTE_KEY = "rps-arena/muted";

export type SfxName =
  | "tap" // แตะปุ่มทั่วไป
  | "confirm" // ยืนยัน/ผ่านขั้น
  | "coin" // จ่ายเหรียญเริ่มรอบ
  | "whoosh" // สองฝั่งพุ่งเข้าในฉาก VS
  | "clash" // กระแทกกลางจอ
  | "tick" // นับ เป่า-ยิ้ง-ฉุบ
  | "reveal" // เปิดมูฟพร้อมกัน
  | "win"
  | "lose"
  | "draw"
  | "champion";

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let muted = readMuted();
/** จำไว้ว่าเคยลองสร้าง context แล้วพัง จะได้ไม่ลองซ้ำทุกครั้งที่เล่นเสียง */
let unavailable = false;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

/** สลับเปิด-ปิดเสียง คืนสถานะใหม่ · เขียน localStorage ไม่ได้ก็ยังสลับได้ในรอบนี้ */
export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // เซฟค่าไม่ได้ก็ช่างมัน เสียงยังเปิด-ปิดได้ในรอบนี้
  }
  if (muted && master) master.gain.value = 0;
  if (!muted && master) master.gain.value = 0.28;
  return muted;
}

function audio(): Ctx | null {
  if (unavailable || typeof window === "undefined") return null;
  if (ctx) {
    // Safari แขวน context ไว้ตอนสลับแอป — ปลุกทุกครั้งที่จะเล่น
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    unavailable = true;
    return null;
  }
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.28;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    unavailable = true;
    return null;
  }
}

/**
 * ปลุกระบบเสียงตอนผู้ใช้แตะจอครั้งแรก — เรียกซ้ำได้ ไม่มีผลข้างเคียง
 * (iPad ไม่ยอมให้เล่นเสียงถ้ายังไม่มี gesture)
 */
export function unlockAudio(): void {
  audio();
}

interface ToneSpec {
  /** ความถี่เริ่ม → จบ (Hz) */
  from: number;
  to?: number;
  /** ความยาว (วินาที) */
  duration: number;
  type?: OscillatorType;
  /** ดังแค่ไหนเทียบกับ master (0–1) */
  gain?: number;
  /** หน่วงก่อนเล่น (วินาที) */
  delay?: number;
}

function tone(spec: ToneSpec): void {
  const context = audio();
  if (!context || !master || muted) return;
  try {
    const start = context.currentTime + (spec.delay ?? 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = spec.type ?? "square";
    osc.frequency.setValueAtTime(spec.from, start);
    if (spec.to !== undefined && spec.to !== spec.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), start + spec.duration);
    }
    const peak = spec.gain ?? 0.5;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + spec.duration + 0.02);
  } catch {
    // เสียงพังไม่ควรทำให้เกมสะดุด
  }
}

/** เสียงซ่า (ใช้ทำ whoosh/กระแทก) — noise ผ่าน filter กวาดความถี่ */
function noise(duration: number, from: number, to: number, gainValue: number): void {
  const context = audio();
  if (!context || !master || muted) return;
  try {
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      // ค่อยๆ เบาลงตอนท้าย ไม่ให้ตัดห้วน
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(from, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, to), context.currentTime + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  } catch {
    // เช่นเดียวกัน — เงียบแล้วไปต่อ
  }
}

/** สูตรเสียงของแต่ละเหตุการณ์ — จูนให้เข้ากับอารมณ์การ์ตูนกวนๆ ของเกม */
const RECIPES: Record<SfxName, () => void> = {
  tap: () => tone({ from: 620, to: 780, duration: 0.07, gain: 0.28 }),
  confirm: () => {
    tone({ from: 620, to: 900, duration: 0.09, gain: 0.35 });
    tone({ from: 900, to: 1250, duration: 0.12, gain: 0.3, delay: 0.08 });
  },
  coin: () => {
    tone({ from: 1180, duration: 0.07, gain: 0.32, type: "triangle" });
    tone({ from: 1560, duration: 0.16, gain: 0.28, type: "triangle", delay: 0.06 });
  },
  whoosh: () => noise(0.5, 220, 2600, 0.42),
  clash: () => {
    noise(0.42, 3200, 180, 0.75);
    tone({ from: 180, to: 40, duration: 0.36, gain: 0.6, type: "sawtooth" });
  },
  tick: () => tone({ from: 480, to: 520, duration: 0.1, gain: 0.4, type: "triangle" }),
  reveal: () => {
    tone({ from: 300, to: 1400, duration: 0.22, gain: 0.45, type: "sawtooth" });
    noise(0.3, 900, 3000, 0.35);
  },
  // แฟนฟาร์ชนะ: โด–มี–ซอล–โดสูง
  win: () => [523, 659, 784, 1047].forEach((hz, i) => tone({ from: hz, duration: 0.2, gain: 0.42, type: "triangle", delay: i * 0.11 })),
  // แพ้: ไหลลงต่ำแบบเสียงใจแป้ว
  lose: () => [392, 330, 262].forEach((hz, i) => tone({ from: hz, duration: 0.26, gain: 0.38, type: "sawtooth", delay: i * 0.13 })),
  draw: () => [440, 440].forEach((hz, i) => tone({ from: hz, duration: 0.16, gain: 0.32, type: "triangle", delay: i * 0.18 })),
  // แชมป์: แฟนฟาร์ยาวกว่า จบด้วยคอร์ดค้าง
  champion: () => {
    [523, 659, 784, 1047, 1319].forEach((hz, i) =>
      tone({ from: hz, duration: 0.26, gain: 0.45, type: "triangle", delay: i * 0.13 }),
    );
    [784, 1047, 1319].forEach((hz) => tone({ from: hz, duration: 0.9, gain: 0.3, type: "triangle", delay: 0.68 }));
  },
};

/** เล่นเสียง — ปิดเสียงอยู่ / ไม่มี Web Audio ก็เงียบแล้วไปต่อ ไม่ throw */
export function playSfx(name: SfxName): void {
  if (muted) return;
  const recipe = RECIPES[name];
  if (!recipe) return;
  try {
    recipe();
  } catch {
    // กันเหนียว — เสียงพังห้ามทำเกมล้ม
  }
}

/** ใช้ในเทสเท่านั้น: รีเซตสถานะภายในกลับเป็นค่าเริ่ม */
export function resetSfxForTest(): void {
  ctx = null;
  master = null;
  unavailable = false;
  muted = readMuted();
}
