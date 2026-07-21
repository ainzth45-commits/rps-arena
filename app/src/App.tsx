import { useCallback, useEffect, useState } from "react";
import { gameAssets } from "./data/assets";
import { randomChallengerId } from "./domain/rpsEngine";
import type { Move } from "./domain/types";
import { endRound, performDuel, startNewSeason, startRound } from "./state/actions";
import { challengeableIds, isInArena, type DuelRecord } from "./state/gameState";
import { useGameStore } from "./state/useGameStore";
import { DuelResultScene } from "./features/duel/DuelResultScene";
import { MovePickScene } from "./features/duel/MovePickScene";
import { ShootScene } from "./features/duel/ShootScene";
import { VersusScene } from "./features/duel/VersusScene";
import { BootScene } from "./features/boot/BootScene";
import { HistoryScene } from "./features/history/HistoryScene";
import { HomeScene } from "./features/home/HomeScene";
import { MoveSetScene } from "./features/moveset/MoveSetScene";
import { OffRoundFlow } from "./features/offround/OffRoundFlow";
import { PlayersScene } from "./features/players/PlayersScene";
import { RankingScene } from "./features/ranking/RankingScene";
import { SeasonEndScene } from "./features/season/SeasonEndScene";
import { SettingsScene } from "./features/season/SettingsScene";
import { AwayRecapScene } from "./features/round/AwayRecapScene";
import { PlayerPickScene } from "./features/round/PlayerPickScene";
import { RoundMenuScene } from "./features/round/RoundMenuScene";

type Phase =
  | "boot"
  | "home"
  | "playerPick"
  | "awayRecap"
  | "roundMenu"
  | "moveSet"
  | "challengerPick"
  | "versus"
  | "movePick"
  | "shoot"
  | "duelResult"
  | "ranking"
  | "offRound"
  | "history"
  | "settings"
  | "seasonEnd"
  | "players";

/** ข้อมูลของการดวลที่กำลังดำเนินอยู่ */
interface PendingDuel {
  challengerId: string;
  wasRandomPick: boolean;
  playerMove?: Move;
  challengerMove?: Move;
}

export function App() {
  const { state, update, saveError, loadWarning, dismissLoadWarning } = useGameStore();
  const [phase, setPhase] = useState<Phase>("boot");
  const [pending, setPending] = useState<PendingDuel | null>(null);
  const [lastDuel, setLastDuel] = useState<DuelRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** หน้าที่จะกลับไปเมื่อกดออกจากอันดับ */
  const [rankingBack, setRankingBack] = useState<Phase>("home");

  const activeId = state.round?.playerId ?? null;

  // วาดฉากลงบน html canvas — เต็ม viewport เสมอ ไม่มีแถบสีหลุดที่ขอบจอ iPad
  useEffect(() => {
    const dim = phase === "boot" ? 0.72 : 0.58;
    document.documentElement.style.backgroundImage =
      `linear-gradient(rgba(10, 14, 50, ${dim}), rgba(10, 14, 50, ${dim})), url("${gameAssets.bgArena}")`;
  }, [phase]);

  const fail = useCallback((caught: unknown) => {
    setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด");
  }, []);

  function beginRound(playerId: string) {
    try {
      const next = startRound(state, playerId, Date.now());
      update(() => next);
      setPhase("awayRecap");
    } catch (caught) {
      fail(caught);
    }
  }

  function finishRound() {
    try {
      const next = endRound(state, Date.now());
      update(() => next);
    } catch (caught) {
      fail(caught);
    }
    setPending(null);
    setLastDuel(null);
    setPhase("home");
  }

  function pickChallenger(challengerId: string, wasRandomPick: boolean) {
    setPending({ challengerId, wasRandomPick });
    setPhase("versus");
  }

  function rollChallenger() {
    if (!activeId) return;
    const rolled = randomChallengerId(challengeableIds(state, activeId));
    if (!rolled) {
      setError("ยังไม่มีใครลงสังเวียนให้สุ่ม");
      return;
    }
    pickChallenger(rolled, true);
  }

  const confirmMove = useCallback(
    (move: Move) => {
      setPending((current) => (current ? { ...current, playerMove: move } : current));
      setPhase("shoot");
    },
    [],
  );

  // ยิงผลจริงตอนเข้าฉากเป่ายิ้งฉุบ เพื่อให้รู้มูฟของผู้ท้าชิงมาโชว์พร้อมกัน
  const resolveNow = useCallback(() => {
    if (!activeId || !pending?.playerMove) return null;
    try {
      const result = performDuel(state, {
        playerId: activeId,
        challengerId: pending.challengerId,
        wasRandomPick: pending.wasRandomPick,
        playerMove: pending.playerMove,
        now: Date.now(),
      });
      update(() => result.state);
      setLastDuel(result.duel);
      return result.duel;
    } catch (caught) {
      fail(caught);
      setPhase("roundMenu");
      return null;
    }
  }, [activeId, pending, state, update, fail]);

  // เข้าฉาก shoot ครั้งแรก → คำนวณผลทันที (ครั้งเดียว)
  if (phase === "shoot" && pending?.playerMove && !lastDuel) {
    const duel = resolveNow();
    if (duel && !pending.challengerMove) {
      setPending({ ...pending, challengerMove: duel.challengerMove });
    }
  }

  function openRanking(from: Phase) {
    setRankingBack(from);
    setPhase("ranking");
  }

  return (
    <div className="app-frame">
      {loadWarning && (
        <div className="save-error" onClick={dismissLoadWarning} role="button" tabIndex={0}>
          {loadWarning} (แตะเพื่อปิด)
        </div>
      )}
      {saveError && <div className="save-error">{saveError}</div>}
      {error && (
        <div className="save-error" onClick={() => setError(null)} role="button" tabIndex={0}>
          {error} (แตะเพื่อปิด)
        </div>
      )}

      {phase === "boot" && <BootScene onEnter={() => setPhase("home")} />}

      {phase === "home" && (
        <HomeScene
          onStartRound={() => setPhase("playerPick")}
          onRanking={() => openRanking("home")}
          onOffRound={() => setPhase("offRound")}
          onPlayers={() => setPhase("players")}
          onSettings={() => setPhase("settings")}
        />
      )}

      {phase === "players" && <PlayersScene onDone={() => setPhase("home")} />}

      {phase === "playerPick" && (
        <PlayerPickScene
          title="ใครจ่ายเหรียญมาเล่น?"
          lead={`รับ ${state.config.coinCost} เหรียญแล้วกดชื่อคนนั้นได้เลย`}
          onPick={beginRound}
          onCancel={() => setPhase("home")}
        />
      )}

      {phase === "awayRecap" && activeId && (
        <AwayRecapScene playerId={activeId} onNext={() => setPhase("roundMenu")} />
      )}

      {phase === "roundMenu" && activeId && (
        <RoundMenuScene
          playerId={activeId}
          onDuel={() => setPhase("challengerPick")}
          onMoveSet={() => setPhase("moveSet")}
          onHistory={() => setPhase("history")}
          onEndRound={finishRound}
        />
      )}

      {phase === "history" && activeId && (
        <HistoryScene playerId={activeId} onBack={() => setPhase("roundMenu")} />
      )}

      {phase === "moveSet" && activeId && (
        <MoveSetScene playerId={activeId} onDone={() => setPhase("roundMenu")} />
      )}

      {phase === "challengerPick" && activeId && (
        <PlayerPickScene
          title="เลือกคู่ต่อสู้"
          lead="เลือกแล้วเปลี่ยนไม่ได้ · กดสุ่มได้คะแนนมากกว่าและเสียน้อยกว่า"
          showRank
          hidden={(player) => player.id === activeId || !isInArena(player)}
          onPick={(id) => pickChallenger(id, false)}
          onCancel={() => setPhase("roundMenu")}
          extraAction={{
            label: "สุ่มคู่ต่อสู้",
            onClick: rollChallenger,
            disabled: challengeableIds(state, activeId).length === 0,
          }}
        />
      )}

      {phase === "versus" && activeId && pending && (
        <VersusScene
          playerId={activeId}
          challengerId={pending.challengerId}
          wasRandomPick={pending.wasRandomPick}
          onReady={() => setPhase("movePick")}
        />
      )}

      {phase === "movePick" && pending && (
        <MovePickScene challengerId={pending.challengerId} onConfirm={confirmMove} />
      )}

      {phase === "shoot" && pending?.playerMove && lastDuel && (
        <ShootScene
          playerMove={pending.playerMove}
          challengerMove={lastDuel.challengerMove}
          onRevealed={() => setPhase("duelResult")}
        />
      )}

      {phase === "duelResult" && lastDuel && (
        <DuelResultScene duel={lastDuel} onRanking={() => openRanking("duelResult")} onDone={finishRound} />
      )}

      {phase === "offRound" && <OffRoundFlow onExit={() => setPhase("home")} />}

      {phase === "settings" && (
        <SettingsScene
          onSeasonEnded={() => setPhase("seasonEnd")}
          onRecords={() => setError("หน้าบันทึกซีซั่นเก่ากำลังสร้างอยู่ค่ะ")}
          onBack={() => setPhase("home")}
        />
      )}

      {phase === "seasonEnd" && state.records.length > 0 && (
        <SeasonEndScene
          record={state.records[state.records.length - 1]}
          onNewSeason={() => {
            update((current) => startNewSeason(current, Date.now()));
            setPhase("home");
          }}
          onExit={() => setPhase("home")}
        />
      )}

      {phase === "ranking" && <RankingScene onBack={() => setPhase(rankingBack)} />}
    </div>
  );
}
