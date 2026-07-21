import { useRef, useState } from "react";
import { addPlayer, editPlayer, isValidPlayerCode, removeBlockedReason, removePlayer } from "../../state/actions";
import { fileToSquareDataUrl, normalizeImageUrl } from "./playerImage";
import { isInArena } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";
import { gameAssets } from "../../data/assets";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  // กล้องถ่ายสด (capture) — รูปจากลิงก์ใส่ในช่องข้อความตรงๆ
  const cameraRef = useRef<HTMLInputElement>(null);
  const editCameraRef = useRef<HTMLInputElement>(null);

  // ถ่ายรูปสดสำหรับ "แก้รูป" ของผู้เล่นที่ลงทะเบียนแล้ว
  async function pickEditImage(id: string, file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      saveEditedPhoto(id, await fileToSquareDataUrl(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ใช้รูปนี้ไม่ได้");
    } finally {
      setBusy(false);
    }
  }

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

  /**
   * วางข้อความจากคลิปบอร์ดลงช่องที่กด
   * Safari/iPad: อ่านคลิปบอร์ดได้เฉพาะตอนมี user gesture (กดปุ่ม) และผู้ใช้อาจปฏิเสธสิทธิ์
   * → ต้องไม่พังเงียบ ถ้าอ่านไม่ได้ให้บอกผู้ใช้ว่าให้กดค้างที่ช่องแล้ววางเอง
   */
  async function pasteInto(target: "code" | "name" | "image") {
    try {
      const text = (await navigator.clipboard?.readText())?.trim() ?? "";
      if (!text) {
        setError("คลิปบอร์ดว่าง — คัดลอกข้อความมาก่อน");
        return;
      }
      setError(null);
      if (target === "code") setCode(text.slice(0, 4).toUpperCase());
      else if (target === "name") setName(text.slice(0, 30));
      else setImageUrl(text);
    } catch {
      setError("เบราว์เซอร์ไม่ให้อ่านคลิปบอร์ด — กดค้างที่ช่องแล้วเลือกวางแทนได้");
    }
  }

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

  // แก้รูปของผู้เล่นที่ลงทะเบียนแล้ว (คงชื่อเดิม) — รับได้ทั้งลิงก์และรูปถ่ายสด (data URL)
  function saveEditedPhoto(id: string, url: string) {
    const player = state.players.find((row) => row.id === id);
    if (!player) return;
    try {
      const photo = url.startsWith("data:") ? url : normalizeImageUrl(url);
      update(() => editPlayer(state, id, player.name, photo));
      setEditingId(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "แก้รูปไม่สำเร็จ");
    }
  }

  return (
    <section className="scene">
      <div className="panel roster">
        <h2 className="title roster__title">ผู้เล่น ({state.players.length})</h2>

        <div className="roster__body">
        <div className="player-form">
          <div className="player-form__grid">
            <label className="field">
              <span>รหัส</span>
              <span className="input-wrap">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="A101"
                  maxLength={4}
                />
                <button type="button" className="input-paste" onClick={() => void pasteInto("code")}>
                  วาง
                </button>
              </span>
            </label>
            <label className="field">
              <span>ชื่อ</span>
              <span className="input-wrap">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่อเล่น" maxLength={30} />
                <button type="button" className="input-paste" onClick={() => void pasteInto("name")}>
                  วาง
                </button>
              </span>
            </label>
          </div>

          <div className="field">
            <span>รูป (ไม่บังคับ) · วางลิงก์หรือถ่ายสด</span>
            <div className="photo-row">
              {/* รูปที่ถ่ายสดเป็น data: URL — ช่องลิงก์จะว่างไว้ให้ · ถ้าเป็นลิงก์ก็โชว์ในช่อง */}
              <span className="input-wrap input-wrap--grow">
                <input
                  className="photo-link"
                  value={imageUrl.startsWith("data:") ? "" : imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder={imageUrl.startsWith("data:") ? "ใช้รูปถ่ายสดอยู่" : "https://... วางลิงก์รูป"}
                  disabled={imageUrl.startsWith("data:")}
                  inputMode="url"
                />
                {!imageUrl.startsWith("data:") && (
                  <button type="button" className="input-paste" onClick={() => void pasteInto("image")}>
                    วาง
                  </button>
                )}
              </span>
              <Button variant="ghost" disabled={busy} onClick={() => cameraRef.current?.click()}>
                {busy ? "ย่อรูป…" : "📷 ถ่ายสด"}
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

        {code !== "" && !codeOk && <p className="callout callout--warn">รหัสแบบ A101 เท่านั้น</p>}
        {error && <p className="callout callout--warn">{error}</p>}

        <div className="roster__list">
          {state.players.map((player) => {
            const blocked = removeBlockedReason(state, player.id);
            const editing = editingId === player.id;
            return (
              <div key={player.id} className={`roster-row${editing ? " roster-row--editing" : ""}`}>
                <img className="roster-row__photo" src={player.imageUrl || gameAssets.avatarPlaceholder} alt="" />
                <span className="roster-row__info">
                  <span className="roster-row__name">{player.name}</span>
                  <span className="roster-row__meta">
                    <b>{player.id}</b>
                    <span className={isInArena(player) ? "roster-row__in" : "roster-row__out"}>
                      {isInArena(player) ? "ลงสังเวียนแล้ว" : "ยังไม่ลงสังเวียน"}
                    </span>
                  </span>
                </span>

                {editing ? (
                  <div className="roster-row__edit">
                    <input
                      className="photo-link"
                      placeholder="https://... วางลิงก์รูป"
                      defaultValue={player.imageUrl.startsWith("data:") ? "" : player.imageUrl}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditedPhoto(player.id, (e.target as HTMLInputElement).value);
                      }}
                      id={`edit-${player.id}`}
                    />
                    <div className="button-row">
                      <Button variant="ghost" disabled={busy} onClick={() => editCameraRef.current?.click()}>
                        📷 ถ่ายสด
                      </Button>
                      <Button
                        onClick={() =>
                          saveEditedPhoto(
                            player.id,
                            (document.getElementById(`edit-${player.id}`) as HTMLInputElement)?.value ?? "",
                          )
                        }
                      >
                        บันทึกรูป
                      </Button>
                    </div>
                    <input
                      ref={editCameraRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      hidden
                      onChange={(e) => void pickEditImage(player.id, e.target.files?.[0])}
                    />
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      ยกเลิก
                    </Button>
                  </div>
                ) : (
                  <div className="roster-row__actions">
                    <Button variant="ghost" onClick={() => setEditingId(player.id)}>
                      แก้รูป
                    </Button>
                    <Button
                      variant={confirmId === player.id ? "danger" : "ghost"}
                      disabled={!!blocked}
                      title={blocked ?? undefined}
                      onClick={() => (confirmId === player.id ? remove(player.id) : setConfirmId(player.id))}
                    >
                      {blocked ? "ลบไม่ได้" : confirmId === player.id ? "กดอีกครั้ง" : "ลบ"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>{/* ปิด roster__body */}

        <div className="button-row">
          <Button variant="ghost" onClick={onDone}>
            ← กลับ
          </Button>
        </div>
      </div>
    </section>
  );
}
