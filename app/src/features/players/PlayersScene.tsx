import { useState } from "react";
import { addPlayer, isValidPlayerCode, removeBlockedReason, removePlayer } from "../../state/actions";
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

  const codeOk = isValidPlayerCode(code.toUpperCase());

  function add() {
    try {
      const next = addPlayer(state, code, name, imageUrl.trim());
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
        <h2 className="title">👥 ผู้เล่น ({state.players.length})</h2>

        <div className="form-row">
          <label className="field">
            <span>รหัส</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="A101"
              maxLength={4}
            />
          </label>
          <label className="field field--wide">
            <span>ชื่อ</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่อเล่น" maxLength={30} />
          </label>
          <label className="field field--wide">
            <span>ลิงก์รูป (ไม่บังคับ)</span>
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
          </label>
          <Button disabled={!codeOk || name.trim() === ""} onClick={add}>
            ➕ เพิ่ม
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
                <span className="player-card__rank">{isInArena(player) ? "⚔️ ลงสังเวียนแล้ว" : "ยังไม่ลงสังเวียน"}</span>
                <Button
                  variant={confirmId === player.id ? "danger" : "ghost"}
                  disabled={!!blocked}
                  onClick={() => (confirmId === player.id ? remove(player.id) : setConfirmId(player.id))}
                >
                  {blocked ? "ลบไม่ได้" : confirmId === player.id ? "⚠️ กดอีกครั้งเพื่อลบ" : "ลบ"}
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
