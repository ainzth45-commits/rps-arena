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
 * ช็อตปะทะก่อนเป่ายิ้งฉุบ — สองฝั่งพุ่งเข้าประกบกลางจอ แล้วโชว์ข้อมูลคู่นี้ 5 วิ
 * ซ้าย = ผู้ท้าชิง (มุมน้ำเงิน) · ขวา = คู่แข่ง (มุมชมพู) · แตะที่ไหนก็ข้ามได้
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
      const won = iAmChallenger ? duel.challengerOutcome === "win" : duel.challengerOutcome === "lose";
      if (duel.challengerOutcome === "draw") draws += 1;
      else if (won) mine += 1;
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
      <Side
        side="blue"
        corner="ผู้ท้าชิง"
        name={challenger.name}
        imageUrl={challenger.imageUrl}
        rank={rankOf.get(challenger.id)}
        win={challenger.stats.asChallenger.win}
        lose={challenger.stats.asChallenger.lose}
        streak={challenger.streak}
      />

      <div className="versus3__mid">
        {stage !== "in" && <img className="versus3__spark" src={gameAssets.clashSpark} alt="" />}
        <img className={`versus3__badge${shown ? " is-in" : ""}`} src={gameAssets.vsBadge} alt="VS" />
      </div>

      <Side
        side="pink"
        corner="คู่แข่ง"
        name={opponent.name}
        imageUrl={opponent.imageUrl}
        rank={rankOf.get(opponent.id)}
        win={opponent.stats.asOpponent.win}
        lose={opponent.stats.asOpponent.lose}
        streak={0}
      />

      <div className="versus3__band">
        <span className="versus3__h2h">{headToHeadText}</span>
        {wasRandomPick && <span className="versus3__tag">🎲 สุ่มคู่แข่ง</span>}
      </div>

      {stage === "ready" && <div className="versus3__go">พร้อม!</div>}

      <button type="button" className="versus3__skip" onClick={leave}>
        ข้าม →
      </button>
    </section>
  );
}

function Side({
  side,
  corner,
  name,
  imageUrl,
  rank,
  win,
  lose,
  streak,
}: {
  side: "blue" | "pink";
  corner: string;
  name: string;
  imageUrl: string;
  rank?: number;
  win: number;
  lose: number;
  streak: number;
}) {
  return (
    <div className={`versus3__side versus3__side--${side}`}>
      <div className="versus3__corner">{corner}</div>
      <img className="versus3__photo" src={imageUrl || gameAssets.avatarPlaceholder} alt="" />
      <div className="versus3__name">{name}</div>
      <div className="versus3__meta">
        <span className="versus3__rank">อันดับ {rank ?? "—"}</span>
        <span className="versus3__record">
          ชนะ {win} · แพ้ {lose}
        </span>
        {streak >= 2 && (
          <span className="versus3__streak">
            <img src={gameAssets.streakFire} alt="" />
            ชนะติด {streak}
          </span>
        )}
      </div>
    </div>
  );
}
