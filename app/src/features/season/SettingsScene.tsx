import { useState } from "react";
import { isMuted, playSfx, toggleMuted } from "../../audio/sfx";
import { formatTenths } from "../../domain/scoreEngine";
import { endSeason } from "../../state/actions";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../../ui/Button";

/** เมนูแอดมิน — จบซีซั่น + ดูบันทึกซีซั่นเก่า */
export function SettingsScene({
  onSeasonEnded,
  onRecords,
  onConfig,
  onBack,
}: {
  onSeasonEnded: () => void;
  onRecords: () => void;
  onConfig: () => void;
  onBack: () => void;
}) {
  const { state, update } = useGameStore();
  const [confirming, setConfirming] = useState(false);
  const [soundOff, setSoundOff] = useState(isMuted());
  const [error, setError] = useState<string | null>(null);

  const roundOpen = state.round !== null;
  const noPlayers = state.players.length === 0;

  function finishSeason() {
    try {
      const next = endSeason(state, Date.now());
      update(() => next);
      setConfirming(false);
      onSeasonEnded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "จบซีซั่นไม่สำเร็จ");
    }
  }

  return (
    <section className="scene">
      <div className="panel">
        <p className="eyebrow">เมนูซุป</p>
        <h2 className="title">ตั้งค่า</h2>

        <div className="settings-block">
          <h3 className="settings-block__title">ซีซั่นปัจจุบัน: {state.season.id}</h3>
          <p className="lead">
            ผู้เล่น {state.players.length} คน · ดวลไปแล้ว {state.duels.length} ครั้ง
            {state.players.length > 0 && (
              <>
                {" "}
                · คะแนนสูงสุด{" "}
                <b>{formatTenths(Math.max(...state.players.map((player) => player.mainScoreTenths)))}</b>
              </>
            )}
          </p>
        </div>

        {roundOpen && <p className="callout callout--warn">มีรอบค้างอยู่ · จบรอบก่อนปิดซีซั่น</p>}
        {error && <p className="callout callout--warn">{error}</p>}

        <div className="settings-block">
          <h3 className="settings-block__title">เสียง</h3>
          <p className="lead">
            เสียงในเครื่อง · ตอนนี้{" "}
            <b>{soundOff ? "ปิดอยู่" : "เปิดอยู่"}</b>
          </p>
          <div className="button-row">
            <Button
              variant={soundOff ? "primary" : "ghost"}
              onClick={() => {
                const next = toggleMuted();
                setSoundOff(next);
                if (!next) playSfx("confirm"); // เปิดเสียงแล้วให้ได้ยินทันทีว่าดังจริง
              }}
            >
              {soundOff ? "🔊 เปิดเสียง" : "🔇 ปิดเสียง"}
            </Button>
          </div>
        </div>

        <div className="settings-block">
          <h3 className="settings-block__title">จบซีซั่น</h3>
          <p className="lead">
            บันทึกอันดับ · ประกาศแชมป์
            <br />
            <b>ซีซั่นใหม่รีเซตแต้มเป็น {state.config.startScore} และล้างชุดมูฟทุกคน</b>
          </p>
          <div className="button-row">
            {confirming ? (
              <>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  ยกเลิก
                </Button>
                <Button variant="danger" onClick={finishSeason}>
                  ยืนยัน จบซีซั่น {state.season.id}
                </Button>
              </>
            ) : (
              <Button variant="danger" disabled={roundOpen || noPlayers} onClick={() => setConfirming(true)}>
                จบซีซั่นนี้
              </Button>
            )}
          </div>
        </div>

        <div className="button-row">
          <Button variant="ghost" onClick={onBack}>
            กลับ
          </Button>
          <Button variant="ghost" onClick={onConfig}>
            ปรับค่าเกม
          </Button>
          <Button variant="ghost" disabled={state.records.length === 0} onClick={onRecords}>
            บันทึกซีซั่นเก่า ({state.records.length})
          </Button>
        </div>
      </div>
    </section>
  );
}
