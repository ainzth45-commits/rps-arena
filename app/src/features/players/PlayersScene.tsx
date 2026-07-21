import { useRef, useState } from "react";
import { addPlayer, isValidPlayerCode, removeBlockedReason, removePlayer } from "../../state/actions";
import { fileToSquareDataUrl, normalizeImageUrl } from "./playerImage";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

/** ลงทะเบียนผู้เล่น — รหัสตัวพิมพ์ใหญ่ 1 + ตัวเลข 3 (เหมือนเกมที่ 1) */
export function PlayersScene({ onDone }: { onDone: () => void }) {
  const { state, update } = useGameStore();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // กล้องถ่ายสด (capture) — รูปจากลิงก์ใส่ในช่องข้อความตรงๆ
  const cameraRef = useRef<HTMLInputElement>(null);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setImageUrl(await fileToSquareDataUrl(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ใช้รูปนี้ไม่ได้");
    } finally {
      setBusy(false);
    }
  }

  const codeOk = isValidPlayerCode(code.toUpperCase());

  function add() {
    try {
      // รูปจากกล้อง/ไฟล์เป็น data URL อยู่แล้ว · ถ้าเป็นลิงก์ต้องกรองก่อน
      const photo = imageUrl.startsWith("data:") ? imageUrl : normalizeImageUrl(imageUrl);
      const next = addPlayer(state, code, name, photo);
      update(() => next);
      setCode("");
      setName("");
      setImageUrl("");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เพิ่มไม่สำเร็จ");
    }
  }

  function remove(id: string) {
    try {
      const next = removePlayer(state, id);
      update(() => next);
      setConfirmId(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ลบไม่สำเร็จ");
    }
  }

  return (
    <section className="scene">
      <div className="panel">
        <h2 className="title">ผู้เล่น ({state.players.length})</h2>

        <div className="player-form">
          <div className="player-form__grid">
            <label className="field">
              <span>รหัส</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="A101"
                maxLength={4}
              />
            </label>
            <label className="field">
              <span>ชื่อ</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่อเล่น" maxLength={30} />
            </label>
          </div>

          <div className="field">
            <span>รูป (ไม่บังคับ) — วางลิงก์รูป หรือ ถ่ายสดจากกล้อง</span>
            <div className="photo-row">
              {/* รูปที่ถ่ายสดเป็น data: URL — ช่องลิงก์จะว่างไว้ให้ · ถ้าเป็นลิงก์ก็โชว์ในช่อง */}
              <input
                className="photo-link"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder={imageUrl.startsWith("data:") ? "ใช้รูปที่ถ่ายสดอยู่" : "https://... วางลิงก์รูป"}
                disabled={imageUrl.startsWith("data:")}
                inputMode="url"
              />
              <Button variant="ghost" disabled={busy} onClick={() => cameraRef.current?.click()}>
                {busy ? "กำลังย่อรูป…" : "📷 ถ่ายสด"}
              </Button>
              {imageUrl && (
                <>
                  <img className="photo-preview" src={imageUrl} alt="ตัวอย่างรูป" onError={(e) => (e.currentTarget.style.opacity = "0.3")} />
                  <Button variant="ghost" onClick={() => setImageUrl("")}>
                    ลบรูป
                  </Button>
                </>
              )}
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(event) => void pickImage(event.target.files?.[0])}
            />
          </div>

          <Button className="player-form__add" disabled={!codeOk || name.trim() === "" || busy} onClick={add}>
            เพิ่มผู้เล่น
          </Button>
        </div>

        {code !== "" && !codeOk && <p className="callout callout--warn">รหัสต้องเป็นตัวพิมพ์ใหญ่ 1 ตัว + ตัวเลข 3 ตัว เช่น A101</p>}
        {error && <p className="callout callout--warn">{error}</p>}

        <div className="player-grid">
          {state.players.map((player) => {
            const blocked = removeBlockedReason(state, player.id);
            return (
              <div key={player.id} className="player-card">
                {player.imageUrl ? (
                  <img className="player-card__photo" src={player.imageUrl} alt="" />
                ) : (
                  <div className="player-card__photo" />
                )}
                <span className="player-card__name">{player.name}</span>
                <span className="player-card__rank">{player.id}</span>
                <span className="player-card__rank">{isInArena(player) ? "ลงสังเวียนแล้ว" : "ยังไม่ลงสังเวียน"}</span>
                <Button
                  variant={confirmId === player.id ? "danger" : "ghost"}
                  disabled={!!blocked}
                  onClick={() => (confirmId === player.id ? remove(player.id) : setConfirmId(player.id))}
                >
                  {blocked ? "ลบไม่ได้" : confirmId === player.id ? "กดอีกครั้งเพื่อลบ" : "ลบ"}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="button-row">
          <Button variant="ghost" onClick={onDone}>
            ← กลับ
          </Button>
        </div>
      </div>
    </section>
  );
}
