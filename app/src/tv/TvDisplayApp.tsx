import { useEffect, useRef, useState } from "react";
import { gameAssets } from "../data/assets";
import { playSfx, setMasterVolume, unlockAudio } from "../audio/sfx";
import { BootScene } from "../features/boot/BootScene";
import { applyBackdrop } from "../data/sceneBackdrop";
import { createReceiver, type Receiver } from "./tvChannel";
import { displayRoomCode, makeRoomCode } from "./roomCode";
import { TvViewRenderer } from "./TvScenes";
import type { TvView } from "./tvView";

const CODE_KEY = "rps-arena/tv-code";
const CACHE_KEY = "rps-arena/tv-last-view";

/** รหัสห้องของ TV — จำไว้ใน localStorage ให้รีเฟรชแล้วได้รหัสเดิม */
function loadOrMakeCode(): string {
  try {
    const saved = localStorage.getItem(CODE_KEY);
    if (saved && /^\d{4}$/.test(saved)) return saved;
    const code = makeRoomCode();
    localStorage.setItem(CODE_KEY, code);
    return code;
  } catch {
    return makeRoomCode();
  }
}

/** อ่าน view ล่าสุดที่ cache ไว้ (รีเฟรช TV แล้วเห็นอันดับทันที ไม่ต้องรอ iPad) */
function loadCachedView(): TvView | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TvView) : null;
  } catch {
    return null;
  }
}

/** view kind → ฉากหลัง (ใช้ applyBackdrop ตัวเดียวกับเกม) */
function backdropForView(view: TvView | null): string {
  switch (view?.kind) {
    case "versus":
      return "versus";
    case "movePick":
    case "offRoundSecret":
      return "movePick";
    case "shoot":
      return "shoot";
    case "result":
      return "duelResult";
    case "seasonEnd":
      return "seasonEnd";
    default:
      return "home"; // อันดับ/จับคู่/ว่าง = ฉากอารีน่า
  }
}

/** เสียงที่ต้องเล่นตอนเข้าฉากแต่ละแบบ (TV เล่นเองเหมือน iPad) */
function sfxForView(prev: TvView | null, next: TvView): void {
  if (prev?.kind === next.kind) return; // เข้าฉากใหม่เท่านั้น
  switch (next.kind) {
    case "versus":
      playSfx("whoosh");
      window.setTimeout(() => playSfx("clash"), 500);
      break;
    case "shoot":
      playSfx("reveal");
      break;
    case "result":
      playSfx(next.outcome);
      break;
    case "seasonEnd":
      playSfx("champion");
      break;
    default:
      break;
  }
}

export function TvDisplayApp() {
  const [entered, setEntered] = useState(false); // ผ่านหน้า boot (แตะโลโก้) แล้วหรือยัง
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<TvView | null>(() => loadCachedView());
  const codeRef = useRef<string>(loadOrMakeCode());
  const prevView = useRef<TvView | null>(view);
  const receiverRef = useRef<Receiver | null>(null);

  // ทาฉากหลัง TV ตามสิ่งที่กำลังโชว์ (เหมือนเกม iPad)
  useEffect(() => {
    applyBackdrop(entered ? backdropForView(view) : "boot");
  }, [entered, view]);

  // เชื่อมห้องหลังผ่านหน้า boot แล้ว (เสียงถูกปลุกแล้ว)
  useEffect(() => {
    if (!entered) return;
    const receiver = createReceiver(
      codeRef.current,
      (next) => {
        // iPad สั่งเลิกเชื่อม → กลับหน้าจับคู่ ล้าง cache
        if (next.kind === "unpaired") {
          setView(null);
          prevView.current = null;
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch {
            // ignore
          }
          return;
        }
        setView(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // cache พังไม่เป็นไร
        }
        sfxForView(prevView.current, next);
        prevView.current = next;
      },
      setConnected,
      (v) => setMasterVolume(v), // iPad ปรับความดัง TV จากตั้งค่า
    );
    receiverRef.current = receiver;
    return () => receiver.close();
  }, [entered]);

  // สถานะ 0: หน้า boot (ใช้ตัวเดียวกับเกม) — แตะโลโก้ = โหลดรูปครบ + ปลุกเสียง
  if (!entered) {
    return (
      <div className="app-frame tv-frame">
        <BootScene
          onEnter={() => {
            unlockAudio();
            setMasterVolume(0.85); // TV ดังเต็มโดย default ก่อนรับค่าจริงจาก iPad
            setEntered(true);
          }}
        />
      </div>
    );
  }

  const code = codeRef.current;

  return (
    <div className="app-frame tv-frame">
      {/* ลิงก์ไปกระดานอันดับยอดขาย CRM — จางๆ มุมล่างซ้าย ไม่เกะกะ */}
      <a
        className={`tv-crm-link${view?.kind === "leaderboard" ? " tv-crm-link--leaderboard" : ""}`}
        href="https://ainzth45-commits.github.io/crm-sale-ranking/"
        aria-label="ไปหน้าอันดับยอดขาย CRM"
        title="อันดับยอดขาย CRM"
      >
        <img className="tv-crm-link__icon" src={gameAssets.iconRanking} alt="" />
      </a>

      {/* จุดบอกสถานะ + รหัสเครื่อง — โชว์เฉพาะตอนกำลังแสดงข้อมูล (หน้าจับคู่ไม่ต้อง เพราะรหัสตัวใหญ่อยู่แล้ว) */}
      {view && (
        <div className={`tv-status${connected ? " tv-status--on" : ""}`}>
          <span className="tv-status__code">{displayRoomCode(code)}</span>
          <span className="tv-status__state">{connected ? "เชื่อมแล้ว" : "iPad ไม่ได้เชื่อมอยู่"}</span>
        </div>
      )}

      {view ? (
        <TvViewRenderer view={view} />
      ) : (
        // สถานะ 1: ยังไม่เชื่อม / ยังไม่เคยรับข้อมูล → หน้าจับคู่โชว์รหัส
        <div className="tv-pair">
          <img className="tv-pair__logo" src={gameAssets.logo} alt="" />
          <p className="tv-pair__label">เปิดเกมบน iPad แล้วใส่รหัสนี้เพื่อเชื่อมจอ</p>
          <div className="tv-pair__code">{displayRoomCode(code)}</div>
          <p className="tv-pair__hint">iPad → ตั้งค่า → เชื่อมจอ TV → พิมพ์ {code}</p>
        </div>
      )}
    </div>
  );
}
