import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rankPlayers } from "../../domain/rankingEngine";
import { gameAssets } from "../../data/assets";
import { playSfx } from "../../audio/sfx";
import { findPlayer } from "../../state/gameState";
import { useGameStore } from "../../state/useGameStore";

/** ขั้นของฉาก — ไล่ตามไทม์ไลน์ 5 วินาที */
type Stage = "in" | "clash" | "info" | "ready";

/** เวลา (มิลลิวินาที) ที่แต่ละขั้นเริ่ม · ตัวสุดท้ายคือเวลาที่ตัดเข้าเป่ายิ้งฉุบ */
const TIMELINE = { clash: 600, info: 900, ready: 3200, leave: 5000 } as const;
/** โหมดลดการเคลื่อนไหว — ย่นทั้งฉากให้สั้น ไม่มีพุ่ง ไม่มีสั่น */
const TIMELINE_CALM = { clash: 100, info: 200, ready: 700, leave: 1400 } as const;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * ฉากปะทะก่อนเป่ายิ้งฉุบ — เวทีถูกผ่าเป็นสองซีก (ไฟล์ภาพคนละใบ อีกฝั่งโปร่งใส)
 * สองซีกพุ่งเข้าจากนอกจอมาประกบกันพอดีเป๊ะเป็นเวทีเดียว แล้วรูปผู้เล่นโผล่ในกรอบที่เจาะไว้
 *
 * ทุกอย่างวางด้วย % บนกล่อง `versus3__stage` ที่ล็อกอัตราส่วนไว้เท่าภาพ (1600:1067)
 * → พิกัดกรอบรูป/วง VS/แถบชื่อ ตรงกับที่วาดไว้ในภาพเสมอ ไม่ว่าจอจะกว้างแค่ไหน
 */
export function VersusScene({
  challengerId,
  opponentId,
  wasRandomPick,
  onReady,
}: {
  challengerId: string;
  opponentId: string;
  wasRandomPick: boolean;
  onReady: () => void;
}) {
  const { state } = useGameStore();
  const [stage, setStage] = useState<Stage>("in");
  const done = useRef(false);

  // เรียกได้ครั้งเดียว — กันกดข้ามพร้อมกับหมดเวลาแล้วเด้ง 2 ที
  const leave = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  }, [onReady]);

  useEffect(() => {
    const t = prefersReducedMotion() ? TIMELINE_CALM : TIMELINE;
    playSfx("whoosh");
    const timers = [
      window.setTimeout(() => {
        setStage("clash");
        playSfx("clash");
      }, t.clash),
      window.setTimeout(() => setStage("info"), t.info),
      window.setTimeout(() => setStage("ready"), t.ready),
      window.setTimeout(leave, t.leave),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [leave]);

  const challenger = findPlayer(state, challengerId);
  const opponent = findPlayer(state, opponentId);

  const rankOf = useMemo(
    () => new Map(rankPlayers(state.players).map((row) => [row.player.id, row.rank])),
    [state.players],
  );

  // สถิติเจอกันของคู่นี้ (นับทั้งสองทิศทาง) — ใช้ปลุกอารมณ์ "คู่ปรับ"
  const headToHead = useMemo(() => {
    let mine = 0;
    let theirs = 0;
    let draws = 0;
    for (const duel of state.duels) {
      const iAmChallenger = duel.challengerId === challengerId && duel.opponentId === opponentId;
      const iAmOpponent = duel.challengerId === opponentId && duel.opponentId === challengerId;
      if (!iAmChallenger && !iAmOpponent) continue;
      if (duel.challengerOutcome === "draw") draws += 1;
      else if (iAmChallenger ? duel.challengerOutcome === "win" : duel.challengerOutcome === "lose") mine += 1;
      else theirs += 1;
    }
    return { mine, theirs, draws, total: mine + theirs + draws };
  }, [state.duels, challengerId, opponentId]);

  if (!challenger || !opponent) return null;

  const shown = stage !== "in";
  const headToHeadText =
    headToHead.total === 0
      ? "เจอกันครั้งแรก!"
      : `เคยเจอกัน ${headToHead.total} ครั้ง · ${
          headToHead.mine === headToHead.theirs
            ? `สูสี ${headToHead.mine}–${headToHead.theirs}`
            : headToHead.mine > headToHead.theirs
              ? `${challenger.name} นำ ${headToHead.mine}–${headToHead.theirs}`
              : `${opponent.name} นำ ${headToHead.theirs}–${headToHead.mine}`
        }`;

  return (
    <section
      className={`versus3 versus3--${stage}`}
      onClick={leave}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") leave();
      }}
      aria-label="ฉากปะทะ — แตะเพื่อข้าม"
    >
      <div className="versus3__stage">
        {/* สองซีกของเวทีเดียวกัน — ประกบแล้วต่อกันพอดีเป๊ะ */}
        <img className="versus3__half versus3__half--left" src={gameAssets.bgVersusLeft} alt="" />
        <img className="versus3__half versus3__half--right" src={gameAssets.bgVersusRight} alt="" />

        <Slot
          side="left"
          corner="ผู้ท้าชิง"
          name={challenger.name}
          imageUrl={challenger.imageUrl}
          rank={rankOf.get(challenger.id)}
          win={challenger.stats.asChallenger.win}
          lose={challenger.stats.asChallenger.lose}
          streak={challenger.streak}
        />
        <Slot
          side="right"
          corner="คู่แข่ง"
          name={opponent.name}
          imageUrl={opponent.imageUrl}
          rank={rankOf.get(opponent.id)}
          win={opponent.stats.asOpponent.win}
          lose={opponent.stats.asOpponent.lose}
          streak={0}
        />

        {/* ป้าย VS ลงกลางวงกลมที่ภาพเจาะไว้ */}
        <img className={`versus3__badge${shown ? " is-in" : ""}`} src={gameAssets.vsBadge} alt="VS" />
        {/* ประกายปะทะโผล่เฉพาะจังหวะกระแทก แล้วหายไป ปล่อยให้ป้าย VS เด่นแทน */}
        {stage === "clash" && <img className="versus3__spark" src={gameAssets.clashSpark} alt="" />}

        {/* แถบล่างของเวที — สถิติเจอกัน */}
        <div className="versus3__band">
          <span className="versus3__h2h">{headToHeadText}</span>
          {wasRandomPick && <span className="versus3__tag">🎲 สุ่มคู่แข่ง</span>}
        </div>

        {stage === "ready" && <div className="versus3__go">พร้อม!</div>}
      </div>

      <button type="button" className="versus3__skip" onClick={leave}>
        ข้าม →
      </button>
    </section>
  );
}

function Slot({
  side,
  corner,
  name,
  imageUrl,
  rank,
  win,
  lose,
  streak,
}: {
  side: "left" | "right";
  corner: string;
  name: string;
  imageUrl: string;
  rank?: number;
  win: number;
  lose: number;
  streak: number;
}) {
  return (
    <div className={`versus3__slot versus3__slot--${side}`}>
      <span className="versus3__corner">{corner}</span>
      <img className="versus3__photo" src={imageUrl || gameAssets.avatarPlaceholder} alt="" />
      <span className="versus3__name">{name}</span>
      <span className="versus3__meta">
        <span className="versus3__rank">อันดับ {rank ?? "—"}</span>
        <span className="versus3__record">
          ชนะ {win} · แพ้ {lose}
        </span>
        {streak >= 2 && (
          <span className="versus3__streak">
            <img src={gameAssets.streakFire} alt="" />
            {streak}
          </span>
        )}
      </span>
    </div>
  );
}
