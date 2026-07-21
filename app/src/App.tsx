import { useCallback, useEffect, useState } from "react";
import { gameAssets } from "./data/assets";
import { applyBackdrop } from "./data/sceneBackdrop";
import { preloadAllGameAssets } from "./data/preloadAssets";
import { randomOpponentId } from "./domain/rpsEngine";
import type { Move } from "./domain/types";
import { endRound, performDuel, startNewSeason, startRound } from "./state/actions";
import { challengeableIds, findPlayer, isInArena, type DuelRecord } from "./state/gameState";
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
import { SeasonRecordsScene } from "./features/season/SeasonRecordsScene";
import { ConfigScene } from "./features/season/ConfigScene";
import { HomeButton } from "./ui/HomeButton";
import { TutorialScene } from "./features/tutorial/TutorialScene";
import { SettingsScene } from "./features/season/SettingsScene";
import { AwayRecapScene } from "./features/round/AwayRecapScene";
import { PlayerPickScene } from "./features/round/PlayerPickScene";
import { RoundMenuScene } from "./features/round/RoundMenuScene";

type Phase =
  | "boot"
  | "home"
  | "challengerPick"
  | "awayRecap"
  | "roundMenu"
  | "moveSet"
  | "opponentPick"
  | "versus"
  | "movePick"
  | "shoot"
  | "duelResult"
  | "ranking"
  | "offRound"
  | "enrollPick"
  | "enrollMoveSet"
  | "history"
  | "settings"
  | "seasonEnd"
  | "seasonRecords"
  | "tutorial"
  | "gameConfig"
  | "players";

/** ข้อมูลของการดวลที่กำลังดำเนินอยู่ */
interface PendingDuel {
  opponentId: string;
  wasRandomPick: boolean;
  challengerMove?: Move;
  opponentMove?: Move;
}

export function App() {
  const { state, update, saveError, loadWarning, dismissLoadWarning } = useGameStore();
  const [phase, setPhase] = useState<Phase>("boot");
  const [pending, setPending] = useState<PendingDuel | null>(null);
  const [lastDuel, setLastDuel] = useState<DuelRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** หน้าที่จะกลับไปเมื่อกดออกจากอันดับ */
  const [rankingBack, setRankingBack] = useState<Phase>("home");
  const [enrollId, setEnrollId] = useState<string | null>(null);

  const activeId = state.round?.challengerId ?? null;

  // วาดฉากลงบน html canvas — เต็ม viewport เสมอ ไม่มีแถบสีหลุดที่ขอบจอ iPad
  // เริ่มโหลดรูปทั้งเกมตั้งแต่เปิดแอป (หน้าโลโก้จะรอจนครบก่อนพาเข้าเกม)
  useEffect(() => {
    preloadAllGameAssets();
  }, []);

  useEffect(() => {
    applyBackdrop(phase);
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

  function pickOpponent(opponentId: string, wasRandomPick: boolean) {
    setPending({ opponentId, wasRandomPick });
    setPhase("movePick");
  }

  function rollOpponent() {
    if (!activeId) return;
    const rolled = randomOpponentId(challengeableIds(state, activeId));
    if (!rolled) {
      setError("ยังไม่มีใครลงสังเวียนให้สุ่ม");
      return;
    }
    pickOpponent(rolled, true);
  }

  const confirmMove = useCallback(
    (move: Move) => {
      setPending((current) => (current ? { ...current, challengerMove: move } : current));
      setPhase("versus");
    },
    [],
  );

  // ยิงผลจริงตอนเข้าฉากเป่ายิ้งฉุบ เพื่อให้รู้มูฟของคู่แข่งมาโชว์พร้อมกัน
  const resolveNow = useCallback(() => {
    if (!activeId || !pending?.challengerMove) return null;
    try {
      const result = performDuel(state, {
        challengerId: activeId,
        opponentId: pending.opponentId,
        wasRandomPick: pending.wasRandomPick,
        challengerMove: pending.challengerMove,
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
  if (phase === "shoot" && pending?.challengerMove && !lastDuel) {
    const duel = resolveNow();
    if (duel && !pending.opponentMove) {
      setPending({ ...pending, opponentMove: duel.opponentMove });
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

      {/* มีรอบเปิดค้างแต่ไม่ได้อยู่ในรอบ (เช่นปิดแอปกลางคัน) — ให้เคลียร์ได้ ไม่งั้นลบผู้เล่นคนนั้นไม่ได้ตลอด */}
      {state.round && ["home", "players", "settings", "ranking", "offRound"].includes(phase) && (
        <div className="resume-banner">
          <span>
            มีรอบของ <b>{findPlayer(state, state.round.challengerId)?.name ?? "ผู้เล่น"}</b> ค้างอยู่
          </span>
          <button type="button" onClick={() => setPhase("awayRecap")}>
            กลับเข้ารอบ
          </button>
          <button type="button" onClick={finishRound}>
            จบรอบค้าง
          </button>
        </div>
      )}

      {/* ปุ่มบ้านลอยมุมขวาบน — ซ่อนตอนอยู่หน้าโลโก้/หน้าแรก และตอนกำลังดวล (ห้ามขัดจังหวะลุ้น) */}
      {!["boot", "home", "versus", "shoot", "duelResult"].includes(phase) && (
        <HomeButton onHome={() => setPhase("home")} />
      )}

      {phase === "boot" && <BootScene onEnter={() => setPhase("home")} />}

      {phase === "home" && (
        <HomeScene
          onStartRound={() => setPhase("challengerPick")}
          onRanking={() => openRanking("home")}
          onOffRound={() => setPhase("offRound")}
          onPlayers={() => setPhase("players")}
          onSettings={() => setPhase("settings")}
          onTutorial={() => setPhase("tutorial")}
          onEnroll={() => setPhase("enrollPick")}
        />
      )}

      {phase === "enrollPick" && (
        <PlayerPickScene
          title="ลงสังเวียน — เลือกคนที่จะตั้งชุดมูฟ"
          lead="ตั้งชุดมูฟครั้งแรกของซีซั่น ฟรี ไม่ต้องจ่ายเหรียญ"
          hidden={(player) => isInArena(player)}
          onPick={(id) => {
            setEnrollId(id);
            setPhase("enrollMoveSet");
          }}
          onCancel={() => setPhase("home")}
        />
      )}

      {phase === "enrollMoveSet" && enrollId && (
        <MoveSetScene
          playerId={enrollId}
          onDone={() => {
            setEnrollId(null);
            setPhase("home");
          }}
        />
      )}

      {phase === "players" && <PlayersScene onDone={() => setPhase("home")} />}

      {phase === "challengerPick" && (
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
          onDuel={() => setPhase("opponentPick")}
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

      {phase === "opponentPick" && activeId && (
        <PlayerPickScene
          title="เลือกคู่แข่ง"
          lead="เลือกแล้วเปลี่ยนไม่ได้ · กดสุ่มได้คะแนนมากกว่าและเสียน้อยกว่า"
          showRank
          hidden={(player) => player.id === activeId || !isInArena(player)}
          onPick={(id) => pickOpponent(id, false)}
          onCancel={() => setPhase("roundMenu")}
          extraAction={{
            label: "สุ่มคู่แข่ง",
            icon: gameAssets.iconDice,
            onClick: rollOpponent,
            disabled: challengeableIds(state, activeId).length === 0,
          }}
        />
      )}

      {phase === "movePick" && pending && (
        <MovePickScene opponentId={pending.opponentId} onConfirm={confirmMove} />
      )}

      {/* ฉากปะทะคั่นหลังเลือกมูฟ — ปลุกอารมณ์ก่อนเป่ายิ้งฉุบ */}
      {phase === "versus" && activeId && pending && (
        <VersusScene
          challengerId={activeId}
          opponentId={pending.opponentId}
          wasRandomPick={pending.wasRandomPick}
          onReady={() => setPhase("shoot")}
        />
      )}

      {phase === "shoot" && activeId && pending?.challengerMove && lastDuel && (
        <ShootScene
          challengerId={activeId}
          opponentId={pending.opponentId}
          challengerMove={pending.challengerMove}
          opponentMove={lastDuel.opponentMove}
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
          onRecords={() => setPhase("seasonRecords")}
          onConfig={() => setPhase("gameConfig")}
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

      {phase === "seasonRecords" && <SeasonRecordsScene onBack={() => setPhase("settings")} />}

      {phase === "gameConfig" && <ConfigScene onBack={() => setPhase("settings")} />}

      {phase === "tutorial" && <TutorialScene onDone={() => setPhase("home")} />}

      {phase === "ranking" && <RankingScene onBack={() => setPhase(rankingBack)} />}
    </div>
  );
}
