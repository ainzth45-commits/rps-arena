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
  | "revealImpact" // เปิดมูฟพร้อมกันแบบหนักแน่น
  | "timerTick" // นาฬิกาเลือกมูฟ
  | "timerDangerTick" // นาฬิกาเลือกมูฟช่วง 10 วิสุดท้าย
  | "tension" // ช่วงลุ้นก่อนพร้อมในฉาก VS
  | "podiumReveal" // เผยอันดับบนโพเดียมทีละขั้น
  | "streakFire" // โบนัสสตรีคชนะ
  | "countTick" // ตัวเลขคะแนนกำลังไล่ขึ้น/ลง
  | "rankUpStep" // ไต่อันดับขึ้นทีละขั้น (ยิ่งขั้นสูงยิ่งเสียงสูง)
  | "rankDownSlide" // อันดับร่วง — เสียงดิ่งลง ยาวตามจำนวนขั้นที่ตก
  | "win"
  | "lose"
  | "draw"
  | "champion";

type Ctx = AudioContext;
export type LoopSfxName = "timerClock" | "versusTension";

interface SfxOptions {
  /** ใช้กับ tick เพื่อไล่ระดับ เป่า → ยิ้ง → ฉุบ */
  step?: number;
  /** ใช้กับ timerClock เพื่อเร่งและทำให้เสียงตึงขึ้น */
  danger?: boolean;
  /** จำนวนขั้นที่อันดับเปลี่ยน — ใช้กำหนดความยาว/ความถี่ของเสียงไต่อันดับ */
  steps?: number;
}

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let muted = readMuted();
/** ความดังรวม (0–1) — iPad คงค่าเริ่มต้นนี้, จอ TV จะถูกสั่งดันขึ้นผ่าน setMasterVolume */
const DEFAULT_MASTER = 0.28;
let masterVol = DEFAULT_MASTER;

/** จำกัดค่าให้อยู่ 0–1 เสมอ กันค่าสกปรก (NaN, ติดลบ, เกิน 1) จาก input/แชนเนล */
function clampVol(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_MASTER;
  return Math.min(2, Math.max(0, v));
}

/**
 * ตั้งความดังรวม (0–1) — จอ TV เรียกเพื่อดันเสียงให้ดังพอได้ยินจากไกล
 * เรียกก่อนหรือหลังสร้าง AudioContext ก็ได้ ค่าจะมีผลทันทีถ้าไม่ได้ mute อยู่
 */
export function setMasterVolume(v: number): void {
  masterVol = clampVol(v);
  if (!muted && master) master.gain.value = masterVol;
}

export function getMasterVolume(): number {
  return masterVol;
}
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
  if (!muted && master) master.gain.value = masterVol;
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
    master.gain.value = muted ? 0 : masterVol;
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
  attack?: number;
  release?: number;
  vibrato?: {
    rate: number;
    depth: number;
  };
  echo?: {
    delay: number;
    wet: number;
  };
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
    const attack = spec.attack ?? 0.012;
    const release = spec.release ?? spec.duration;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + release);
    osc.connect(gain);
    connectWithEcho(context, gain, spec.echo);
    if (spec.vibrato) addVibrato(context, osc.frequency, start, spec.duration, spec.vibrato.rate, spec.vibrato.depth);
    osc.start(start);
    osc.stop(start + Math.max(spec.duration, release) + 0.03);
  } catch {
    // เสียงพังไม่ควรทำให้เกมสะดุด
  }
}

function addVibrato(context: Ctx, target: AudioParam, start: number, duration: number, rate: number, depth: number): void {
  try {
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(rate, start);
    lfoGain.gain.setValueAtTime(depth, start);
    lfo.connect(lfoGain);
    lfoGain.connect(target);
    lfo.start(start);
    lfo.stop(start + duration + 0.03);
  } catch {
    // vibrato เป็นเครื่องปรุง ถ้าเบราว์เซอร์ไม่ชอบก็เล่นเสียงหลักต่อ
  }
}

function connectWithEcho(context: Ctx, node: AudioNode, echo?: ToneSpec["echo"]): void {
  if (!master) return;
  node.connect(master);
  if (!echo) return;
  try {
    const maybeDelay = context as Ctx & { createDelay?: (maxDelayTime?: number) => DelayNode };
    if (!maybeDelay.createDelay) return;
    const delay = maybeDelay.createDelay(0.6);
    const wet = context.createGain();
    delay.delayTime.setValueAtTime(echo.delay, context.currentTime);
    wet.gain.setValueAtTime(echo.wet, context.currentTime);
    node.connect(delay);
    delay.connect(wet);
    wet.connect(master);
  } catch {
    // echo ไม่สำคัญเท่าเสียงหลัก
  }
}

/** เสียงซ่า (ใช้ทำ whoosh/กระแทก) — noise ผ่าน filter กวาดความถี่ */
function noise(duration: number, from: number, to: number, gainValue: number, delay = 0): void {
  const context = audio();
  if (!context || !master || muted) return;
  try {
    const start = context.currentTime + delay;
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
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  } catch {
    // เช่นเดียวกัน — เงียบแล้วไปต่อ
  }
}

/** สูตรเสียงของแต่ละเหตุการณ์ — จูนให้เข้ากับอารมณ์การ์ตูนกวนๆ ของเกม */
const RECIPES: Record<SfxName, (options?: SfxOptions) => void> = {
  tap: () => {
    tone({ from: 690, to: 880, duration: 0.055, gain: 0.22, type: "triangle" });
    tone({ from: 1380, to: 1760, duration: 0.04, gain: 0.09, type: "sine", delay: 0.012 });
  },
  confirm: () => {
    tone({ from: 520, to: 980, duration: 0.13, gain: 0.3, type: "triangle", echo: { delay: 0.08, wet: 0.09 } });
    tone({ from: 780, to: 1320, duration: 0.16, gain: 0.25, type: "square", delay: 0.07 });
    tone({ from: 1560, duration: 0.09, gain: 0.18, type: "sine", delay: 0.16 });
  },
  coin: () => {
    tone({ from: 1180, to: 1320, duration: 0.07, gain: 0.28, type: "triangle" });
    tone({ from: 1560, to: 1860, duration: 0.16, gain: 0.24, type: "triangle", delay: 0.055, echo: { delay: 0.06, wet: 0.1 } });
  },
  whoosh: () => {
    noise(0.55, 180, 3200, 0.44);
    tone({ from: 180, to: 720, duration: 0.5, gain: 0.14, type: "sawtooth", attack: 0.04 });
  },
  clash: () => {
    noise(0.52, 3800, 120, 0.82);
    noise(0.16, 160, 70, 0.48, 0.01);
    tone({ from: 140, to: 38, duration: 0.46, gain: 0.66, type: "sawtooth", vibrato: { rate: 18, depth: 10 } });
    tone({ from: 70, to: 46, duration: 0.5, gain: 0.28, type: "square", delay: 0.025 });
  },
  tick: (options) => {
    const step = Math.max(0, Math.min(2, options?.step ?? 0));
    const from = [560, 660, 790][step];
    tone({ from, to: from + 90, duration: 0.11, gain: 0.38, type: "triangle", echo: { delay: 0.055, wet: 0.06 } });
    tone({ from: from * 2, duration: 0.055, gain: 0.12, type: "sine", delay: 0.018 });
  },
  reveal: () => {
    RECIPES.revealImpact();
  },
  revealImpact: () => {
    noise(0.38, 2800, 170, 0.62);
    tone({ from: 110, to: 48, duration: 0.34, gain: 0.64, type: "sawtooth" });
    tone({ from: 420, to: 1120, duration: 0.18, gain: 0.34, type: "square", delay: 0.015 });
    tone({ from: 1760, to: 920, duration: 0.22, gain: 0.2, type: "triangle", delay: 0.08, echo: { delay: 0.09, wet: 0.08 } });
  },
  timerTick: () => {
    tone({ from: 920, to: 760, duration: 0.035, gain: 0.11, type: "square", attack: 0.004 });
  },
  timerDangerTick: () => {
    tone({ from: 1120, to: 880, duration: 0.045, gain: 0.18, type: "square", attack: 0.003 });
    tone({ from: 1640, duration: 0.025, gain: 0.08, type: "sine", delay: 0.035 });
  },
  tension: () => {
    [196, 233, 277, 330, 392].forEach((hz, i) => {
      tone({ from: hz, to: hz * 1.08, duration: 0.18, gain: 0.16 + i * 0.015, type: "triangle", delay: i * 0.17 });
      noise(0.05, 140, 420, 0.07 + i * 0.01, i * 0.17);
    });
  },
  podiumReveal: () => {
    noise(0.18, 160, 900, 0.22);
    tone({ from: 196, to: 294, duration: 0.18, gain: 0.25, type: "triangle" });
    tone({ from: 392, to: 784, duration: 0.22, gain: 0.22, type: "square", delay: 0.08, echo: { delay: 0.08, wet: 0.08 } });
  },
  // ตัวเลขวิ่ง — เบามาก เล่นถี่ได้ไม่รำคาญ
  countTick: () => tone({ from: 1180, to: 1240, duration: 0.03, gain: 0.12, type: "triangle" }),

  // ไต่อันดับขึ้น 1 ขั้น — ยิ่งขั้นที่เท่าไหร่ยิ่งสูงขึ้น (เรียกซ้ำตามจำนวนขั้น)
  rankUpStep: (options) => {
    const step = Math.max(0, options?.step ?? 0);
    const base = 520 * Math.pow(1.16, step);
    tone({ from: base, to: base * 1.5, duration: 0.16, gain: 0.36, type: "triangle" });
    tone({ from: base * 2, to: base * 3, duration: 0.12, gain: 0.14, type: "sine", delay: 0.02 });
  },

  // อันดับร่วง — กวาดความถี่ลงยาวตามจำนวนขั้นที่ตก
  rankDownSlide: (options) => {
    const steps = Math.max(1, options?.steps ?? 1);
    const duration = Math.min(0.28 + steps * 0.16, 1.4);
    tone({ from: 640, to: Math.max(70, 300 - steps * 30), duration, gain: 0.34, type: "sawtooth" });
    noise(duration * 0.8, 1400, 220, 0.16);
  },

  streakFire: () => {
    noise(0.42, 500, 2600, 0.3);
    [330, 392, 494, 659].forEach((hz, i) => tone({ from: hz, to: hz * 1.35, duration: 0.14, gain: 0.24, type: "sawtooth", delay: i * 0.055 }));
  },
  // แฟนฟาร์ชนะ: โด–มี–ซอล–โดสูง
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((hz, i) =>
      tone({ from: hz, to: hz * 1.02, duration: 0.18, gain: 0.34, type: "triangle", delay: i * 0.09, echo: { delay: 0.08, wet: 0.06 } }),
    );
    [659, 784, 1047].forEach((hz) => tone({ from: hz, duration: 0.42, gain: 0.18, type: "sine", delay: 0.36 }));
  },
  // แพ้: ไหลลงต่ำแบบเสียงใจแป้ว
  lose: () => {
    [392, 330, 262].forEach((hz, i) => tone({ from: hz, to: hz * 0.84, duration: 0.22, gain: 0.26, type: "sawtooth", delay: i * 0.12, vibrato: { rate: 7, depth: 8 } }));
    tone({ from: 220, to: 180, duration: 0.12, gain: 0.18, type: "square", delay: 0.43 });
  },
  draw: () => {
    [440, 440].forEach((hz, i) => tone({ from: hz, to: hz * 1.01, duration: 0.14, gain: 0.28, type: "triangle", delay: i * 0.16 }));
    tone({ from: 660, to: 620, duration: 0.18, gain: 0.12, type: "sine", delay: 0.34 });
  },
  // แชมป์: แฟนฟาร์ยาวกว่า จบด้วยคอร์ดค้าง
  champion: () => {
    noise(0.5, 600, 5200, 0.2, 0.04);
    [523, 659, 784, 1047, 1319, 1568].forEach((hz, i) =>
      tone({ from: hz, to: hz * 1.025, duration: 0.24, gain: 0.38, type: "triangle", delay: i * 0.105, echo: { delay: 0.1, wet: 0.08 } }),
    );
    [784, 1047, 1319, 1568].forEach((hz) => tone({ from: hz, duration: 1, gain: 0.24, type: "triangle", delay: 0.66, vibrato: { rate: 5, depth: 4 } }));
  },
};

/** เล่นเสียง — ปิดเสียงอยู่ / ไม่มี Web Audio ก็เงียบแล้วไปต่อ ไม่ throw */
export function playSfx(name: SfxName, options?: SfxOptions): void {
  if (muted) return;
  const recipe = RECIPES[name];
  if (!recipe) return;
  try {
    recipe(options);
  } catch {
    // กันเหนียว — เสียงพังห้ามทำเกมล้ม
  }
}

/** เล่นเสียงเป็นจังหวะซ้ำและคืน cleanup สำหรับ useEffect */
export function startLoopingSfx(name: LoopSfxName, options?: SfxOptions): () => void {
  if (typeof window === "undefined" || typeof window.setInterval !== "function") return () => undefined;
  try {
    const interval = name === "timerClock" ? (options?.danger ? 420 : 900) : 360;
    const tick = () => {
      if (name === "timerClock") playSfx(options?.danger ? "timerDangerTick" : "timerTick");
      else playSfx("tension");
    };
    tick();
    const timer = window.setInterval(tick, interval);
    return () => window.clearInterval(timer);
  } catch {
    return () => undefined;
  }
}

/** ใช้ในเทสเท่านั้น: รีเซตสถานะภายในกลับเป็นค่าเริ่ม */
export function resetSfxForTest(): void {
  ctx = null;
  master = null;
  unavailable = false;
  muted = readMuted();
}
