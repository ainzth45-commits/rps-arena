import { useEffect, useState } from "react";
import { gameAssets } from "../../data/assets";
import { Button } from "../../ui/Button";
import { connectTv, disconnectTv, getPairedCode, isTvConnected, subscribeTvStatus } from "../../tv/tvBroadcast";
import { isValidRoomCode, normalizeRoomCode } from "../../tv/roomCode";

/** หน้าเชื่อมจอ TV (เมนูซุป) — พิมพ์รหัสที่ TV โชว์ */
export function TvLinkScene({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [paired, setPaired] = useState<string | null>(() => getPairedCode());
  const [connected, setConnected] = useState(() => isTvConnected());

  useEffect(() => subscribeTvStatus(setConnected), []);

  function link() {
    const clean = normalizeRoomCode(code);
    if (!clean) return;
    connectTv(clean);
    setPaired(clean);
    setCode("");
  }

  function unlink() {
    disconnectTv();
    setPaired(null);
    setConnected(false);
  }

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">เมนูซุป</p>
        <h2 className="title">เชื่อมจอ TV</h2>
        <p className="lead">
          เปิดเว็บเดียวกันบน TV แล้วเติม <b>?tv</b> ท้าย URL · TV จะโชว์รหัส 4 หลัก เอามาพิมพ์ที่นี่
        </p>

        {paired ? (
          <div className="tv-link">
            <div className={`tv-link__status${connected ? " is-on" : ""}`}>
              <img src={gameAssets.iconRanking} alt="" />
              <div>
                <b>{connected ? "เชื่อมกับ TV แล้ว" : "กำลังเชื่อม / TV ยังไม่พร้อม"}</b>
                <small>รหัส {paired}</small>
              </div>
            </div>
            <div className="button-row">
              <Button variant="danger" onClick={unlink}>
                เลิกเชื่อม
              </Button>
            </div>
          </div>
        ) : (
          <div className="tv-link">
            <div className="field">
              <span>รหัสจาก TV (4 หลัก)</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="เช่น 4821"
                inputMode="numeric"
                maxLength={12}
              />
            </div>
            <div className="button-row">
              <Button disabled={!isValidRoomCode(code)} onClick={link}>
                เชื่อม
              </Button>
            </div>
          </div>
        )}

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            <img className="btn__icon" src={gameAssets.iconHome} alt="" />
            กลับ
          </Button>
        </div>
      </div>
    </section>
  );
}
