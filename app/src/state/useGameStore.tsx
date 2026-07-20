// สโตร์กลางของเกม — โหลดเซฟตอนเปิด · บันทึกทุกครั้งที่ state เปลี่ยน · แจ้งเตือนเมื่อเซฟไม่ได้
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type GameState } from "./gameState";
import { loadState, saveState } from "./storage";

interface GameStore {
  state: GameState;
  /** อัปเดต state — โยน Error ออกมาได้ ตัวเรียกต้องดักเอง (ใช้แสดงข้อความเตือนบนจอ) */
  update: (updater: (current: GameState) => GameState) => void;
  /** ข้อความเตือนตอนเซฟไม่ได้ (private mode / โควตาเต็ม) — null = ปกติ */
  saveError: string | null;
  /** ข้อความบอกว่าเซฟเดิมใช้ไม่ได้แล้ว เริ่มใหม่ให้ — null = ปกติ */
  loadWarning: string | null;
  dismissLoadWarning: () => void;
}

const StoreContext = createContext<GameStore | null>(null);

export function GameStoreProvider({ children, now = Date.now() }: { children: ReactNode; now?: number }) {
  const initial = useRef(loadState(now)).current;
  const [state, setState] = useState<GameState>(initial.state);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(
    initial.kind === "recovered" ? `${initial.reason} — เริ่มเกมใหม่ให้แล้ว` : null,
  );
  const firstRun = useRef(true);

  useEffect(() => {
    // ไม่ต้องเซฟทับตอนโหลดครั้งแรก
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveError(saveState(state));
  }, [state]);

  const update = useCallback((updater: (current: GameState) => GameState) => {
    setState((current) => updater(current));
  }, []);

  const value = useMemo<GameStore>(
    () => ({ state, update, saveError, loadWarning, dismissLoadWarning: () => setLoadWarning(null) }),
    [state, update, saveError, loadWarning],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useGameStore(): GameStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useGameStore ต้องอยู่ใน GameStoreProvider");
  return store;
}
