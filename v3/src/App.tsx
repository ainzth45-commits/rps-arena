import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  awayEntries,
  canDeletePlayer,
  challengeablePlayers,
  championTax,
  clearPrivacyCurtain,
  closeRound,
  commitMainDuel,
  commitOffRoundDuel,
  createGame,
  createPlayer,
  decideOutcome,
  deletePlayer,
  finishSeason,
  formatDelta,
  formatScore,
  huntedWarnings,
  mainDuelBlockedReason,
  moveLabel,
  moves,
  rankPlayers,
  setMoveset,
  startRound,
  updateSettings,
} from "./domain/game";
import type { GameState, Move, OffRoundSaveMode, Player } from "./domain/types";
import { createPersistentStore } from "./persistence/storage";
import { asset, gameAssetUrls } from "./preload/assets";
import { loadBrowserImage, preloadAssets, type AssetPreloadState } from "./preload/preloader";

type View = "home" | "players" | "round" | "offround" | "ranking" | "settings" | "season";
type RoundStep = "selectPlayer" | "inbox" | "moveset" | "action" | "opponent" | "pickMove" | "versus" | "result";
type OffStep = "setup" | "pickA" | "curtain" | "pickB" | "result";

const store = createPersistentStore<GameState>("rps-arena-v3", createGame());
const blankPreload: AssetPreloadState = { total: gameAssetUrls().length, completed: 0, failed: 0, percent: 0, ready: false };
const moveImages: Record<Move, string> = {
  rock: asset("moves/rock.webp"),
  paper: asset("moves/paper.webp"),
  scissors: asset("moves/scissors.webp"),
};

export default function App() {
  const loaded = useMemo(() => store.load(), []);
  const [entry, setEntry] = useState<"tap" | "loading" | "entered">("tap");
  const [preload, setPreload] = useState<AssetPreloadState>(blankPreload);
  const [game, setGame] = useState<GameState>(loaded.value);
  const [storageWarning, setStorageWarning] = useState<string | null>(loaded.available ? null : loaded.message ?? null);
  const [view, setView] = useState<View>(loaded.value.activeRound ? "round" : "home");
  const [roundStep, setRoundStep] = useState<RoundStep>(loaded.value.activeRound ? "inbox" : "selectPlayer");
  const [roundPlayerId, setRoundPlayerId] = useState<string | null>(loaded.value.activeRound?.playerId ?? null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponentMode, setOpponentMode] = useState<"chosen" | "random">("chosen");
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [duelResult, setDuelResult] = useState<ReturnType<typeof commitMainDuel>["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offStep, setOffStep] = useState<OffStep>("setup");
  const [offA, setOffA] = useState("");
  const [offB, setOffB] = useState("");
  const [offMoveA, setOffMoveA] = useState<Move | null>(null);
  const [offMoveB, setOffMoveB] = useState<Move | null>(null);
  const [offPreview, setOffPreview] = useState<{ outcomeA: string; moveA: Move; moveB: Move } | null>(null);
  const preloadStarted = useRef(false);

  useEffect(() => {
    if (preloadStarted.current) return;
    preloadStarted.current = true;
    void preloadAssets(gameAssetUrls(), { concurrency: 4, loadAsset: loadBrowserImage, onProgress: setPreload }).then(setPreload);
  }, []);

  useEffect(() => {
    if (entry === "loading" && preload.ready) setEntry("entered");
  }, [entry, preload.ready]);

  useEffect(() => {
    const result = store.save(game);
    setStorageWarning(result.ok ? null : result.message ?? "บันทึกข้อมูลในเครื่องไม่ได้");
  }, [game]);

  const updateGame = useCallback((next: GameState) => setGame(next), []);
  const activePlayers = Object.values(game.players).filter((player) => player.active);
  const roundPlayer = roundPlayerId ? game.players[roundPlayerId] : null;

  function enterArena() {
    setEntry(preload.ready ? "entered" : "loading");
  }

  if (entry !== "entered") {
    return <EntryGate preload={preload} state={entry} onEnter={enterArena} />;
  }

  function openRound(playerId: string) {
    try {
      const player = game.players[playerId];
      const next = startRound(game, playerId, Date.now());
      updateGame(next);
      setRoundPlayerId(playerId);
      setRoundStep(player?.moveset ? "inbox" : "moveset");
      setView("round");
      setOpponentId(null);
      setSelectedMove(null);
      setDuelResult(null);
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function finishRound() {
    updateGame(closeRound(game, Date.now()));
    setRoundPlayerId(null);
    setRoundStep("selectPlayer");
    setView("home");
  }

  function confirmMoveset(value: Move[]) {
    if (!roundPlayerId) return;
    try {
      updateGame(setMoveset(game, roundPlayerId, value));
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function chooseRandomOpponent() {
    if (!roundPlayerId) return;
    const options = challengeablePlayers(game, roundPlayerId);
    if (options.length === 0) {
      setError("ยังไม่มีใครลงสังเวียนให้ท้า");
      return;
    }
    const picked = options[Math.floor(Math.random() * options.length)];
    setOpponentId(picked.id);
    setOpponentMode("random");
    setError(null);
  }

  function resolveMainMove(move: Move) {
    if (!roundPlayerId || !opponentId) return;
    try {
      const next = commitMainDuel(game, {
        challengerId: roundPlayerId,
        defenderId: opponentId,
        challengerMove: move,
        opponentMode,
        now: Date.now(),
      });
      updateGame(next.game);
      setDuelResult(next.result);
      setSelectedMove(move);
      setRoundStep("versus");
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function addPlayer(name: string) {
    const id = `P${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    updateGame(createPlayer(game, { id, name, avatarUrl: asset("icons/avatar-placeholder.webp") }));
  }

  function removePlayer(id: string) {
    const guard = canDeletePlayer(game, id);
    if (!guard.ok) {
      setError(guard.reason);
      return;
    }
    updateGame(deletePlayer(game, id));
  }

  function startOffRound() {
    if (!offA || !offB || offA === offB) {
      setError("เลือกผู้เล่น 2 คนก่อน");
      return;
    }
    updateGame({ ...game, activeOffRound: { playerAId: offA, playerBId: offB, step: "pickA" } });
    setOffStep("pickA");
    setError(null);
  }

  function confirmOffMoveA(move: Move) {
    setOffMoveA(move);
    updateGame({ ...game, activeOffRound: offA && offB ? { playerAId: offA, playerBId: offB, step: "curtain" } : game.activeOffRound, privacyCurtain: { reason: "offround", playerId: offA } });
    setOffStep("curtain");
  }

  function confirmOffMoveB(move: Move) {
    if (!offMoveA) return;
    setOffMoveB(move);
    setOffPreview({ outcomeA: decideOutcome(offMoveA, move), moveA: offMoveA, moveB: move });
    updateGame({ ...game, activeOffRound: offA && offB ? { playerAId: offA, playerBId: offB, step: "result" } : game.activeOffRound, privacyCurtain: null });
    setOffStep("result");
  }

  function saveOffRound(saveMode: OffRoundSaveMode) {
    if (!offMoveA || !offMoveB || !offA || !offB) return;
    const next = commitOffRoundDuel(game, { playerAId: offA, playerBId: offB, moveA: offMoveA, moveB: offMoveB, saveMode, now: Date.now() });
    updateGame(next.game);
    setOffStep("setup");
    setOffA("");
    setOffB("");
    setOffMoveA(null);
    setOffMoveB(null);
    setOffPreview(null);
  }

  return (
    <main className="app-shell" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,10,24,.88), rgba(8,10,24,.55)), url(${asset("bg-arena.png")})` }}>
      <header className="topbar">
        <img src={asset("logo.png")} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" className="logo" />
        <div className="season-strip">
          <b>{game.seasonId}</b>
          <span>{game.settings.coinsPerRound} เหรียญต่อรอบ</span>
          {game.activeRound && <strong>รอบค้าง: {game.players[game.activeRound.playerId]?.name ?? "ไม่พบผู้เล่น"}</strong>}
        </div>
        <div className={storageWarning ? "save warn" : "save"}>{storageWarning ?? "บันทึกในเครื่องอัตโนมัติ"}</div>
      </header>

      <section className="console">
        <nav className="left-rail" aria-label="เมนูหลัก">
          <NavButton icon="icons/icon-home.webp" label="หน้าแรก" active={view === "home"} onClick={() => setView("home")} />
          <NavButton icon="icons/icon-players.webp" label="ผู้เล่น" active={view === "players"} onClick={() => setView("players")} />
          <NavButton icon="icons/icon-duel.webp" label="เปิดรอบ" active={view === "round"} onClick={() => { setView("round"); setRoundStep(game.activeRound ? "inbox" : "selectPlayer"); }} />
          <NavButton icon="icons/icon-offround.webp" label="นอกรอบ" active={view === "offround"} onClick={() => setView("offround")} />
          <NavButton icon="icons/icon-ranking.webp" label="อันดับ" active={view === "ranking"} onClick={() => setView("ranking")} />
          <NavButton icon="icons/icon-settings.webp" label="ตั้งค่า" active={view === "settings"} onClick={() => setView("settings")} />
        </nav>

        <section className="stage" aria-live="polite">
          {error && <div className="toast">{error}</div>}
          {game.privacyCurtain && <PrivacyCurtain game={game} onContinue={() => updateGame(clearPrivacyCurtain(game))} />}
          {!game.privacyCurtain && view === "home" && <HomeView game={game} setView={setView} openRound={openRound} />}
          {!game.privacyCurtain && view === "players" && <PlayersView players={activePlayers} onAdd={addPlayer} onDelete={removePlayer} />}
          {!game.privacyCurtain && view === "round" && (
            <RoundView
              game={game}
              step={roundStep}
              setStep={setRoundStep}
              player={roundPlayer}
              openRound={openRound}
              closeRound={finishRound}
              confirmMoveset={confirmMoveset}
              opponentId={opponentId}
              setOpponentId={setOpponentId}
              opponentMode={opponentMode}
              setOpponentMode={setOpponentMode}
              chooseRandomOpponent={chooseRandomOpponent}
              resolveMainMove={resolveMainMove}
              selectedMove={selectedMove}
              result={duelResult}
            />
          )}
          {!game.privacyCurtain && view === "offround" && (
            <OffRoundView
              game={game}
              step={offStep}
              setStep={setOffStep}
              playerAId={offA}
              playerBId={offB}
              setPlayerAId={setOffA}
              setPlayerBId={setOffB}
              start={startOffRound}
              confirmMoveA={confirmOffMoveA}
              confirmMoveB={confirmOffMoveB}
              preview={offPreview}
              save={saveOffRound}
            />
          )}
          {!game.privacyCurtain && view === "ranking" && <RankingView game={game} />}
          {!game.privacyCurtain && view === "settings" && <SettingsView game={game} updateGame={updateGame} />}
          {!game.privacyCurtain && view === "season" && <SeasonView game={game} onFinish={() => updateGame(finishSeason(game, Date.now()))} />}
        </section>

        <aside className="right-rail">
          <QuickRanking game={game} />
          <ChampionTax game={game} />
        </aside>
      </section>
    </main>
  );
}

function EntryGate({ preload, state, onEnter }: { preload: AssetPreloadState; state: "tap" | "loading"; onEnter: () => void }) {
  const loading = state === "loading";
  return (
    <main className="entry" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,10,24,.88), rgba(8,10,24,.58)), url(${asset("bg-arena.png")})` }}>
      <button className="entry-card" onClick={onEnter} disabled={loading}>
        <img src={asset("logo.png")} alt="เป่า ยิ้ง ฉุบ! อารีน่า!" />
        {!loading && <b>แตะโลโก้เพื่อเข้าอารีน่า</b>}
        {loading && (
          <div className="load-panel">
            <b>โหลดรูปทั้งเกม {preload.percent}%</b>
            <div className="loadbar"><span style={{ transform: `scaleX(${preload.percent / 100})` }} /></div>
            <small>{preload.completed}/{preload.total} ไฟล์จบแล้ว{preload.failed ? ` · รูปเสีย ${preload.failed} ไฟล์ถูกข้าม` : ""}</small>
          </div>
        )}
      </button>
    </main>
  );
}

function HomeView({ game, setView, openRound }: { game: GameState; setView: (view: View) => void; openRound: (id: string) => void }) {
  const active = Object.values(game.players).filter((player) => player.active);
  const armed = active.filter((player) => player.moveset).length;
  const leader = rankPlayers(game)[0];
  return (
    <div className="home-grid">
      <section className="hero-card">
        <span className="kicker">Supervisor Arena Console</span>
        <h1>เปิดรอบเร็ว เห็นเมต้าเกมทันที</h1>
        <p>คอนโซลนี้วางให้ซุปกดได้ใน 1-2 นาที: เริ่มรอบ, ดูคนโดนไล่เก็บ, อ่านภาษีแชมป์, แล้วส่งเครื่องคืนแบบไม่หลุดความลับ</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => setView("round")}>เปิดรอบ {game.settings.coinsPerRound} เหรียญ</button>
          <button className="secondary" onClick={() => setView("players")}>จัดผู้เล่น</button>
        </div>
      </section>
      <section className="metrics">
        <Metric icon="icons/icon-moveset.webp" label="ลงสังเวียน" value={`${armed}/${active.length}`} />
        <Metric icon="icons/crown.webp" label="จ่าฝูง" value={leader ? `${leader.player.name} ${formatScore(leader.player.mainScoreUnits)}` : "ยังไม่มี"} />
        <Metric icon="icons/icon-warning.webp" label="รอบค้าง" value={game.activeRound ? game.players[game.activeRound.playerId]?.name ?? "มีรอบค้าง" : "ไม่มี"} />
      </section>
      <section className="quick-open">
        <h2>เปิดรอบด่วน</h2>
        <div className="mini-roster">
          {active.slice(0, 12).map((player) => (
            <button key={player.id} onClick={() => openRound(player.id)}>
              <img src={player.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
              <span>{player.name}</span>
              <small>{player.moveset ? `${formatScore(player.mainScoreUnits)} แต้ม` : "ตั้งชุดฟรี"}</small>
            </button>
          ))}
          {active.length === 0 && <p className="empty-state">ยังไม่มีผู้เล่น กดเมนูผู้เล่นเพื่อเพิ่มรายชื่อทดสอบหรือรายชื่อจริงของทีม</p>}
        </div>
      </section>
    </div>
  );
}

function PlayersView({ players, onAdd, onDelete }: { players: Player[]; onAdd: (name: string) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="panel-view">
      <Header icon="icons/icon-players.webp" title="ผู้เล่น" subtitle="รองรับชื่อไทยยาวและผู้เล่น 12+ คน โดยไม่ใส่ชื่อจริงในโค้ด" />
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); onAdd(name); setName(""); }}>
        <input value={name} maxLength={30} onChange={(event) => setName(event.target.value)} placeholder="ชื่อเล่น/รหัสพนักงาน (ไม่ใส่ชื่อจริงในโค้ด)" />
        <button className="primary">เพิ่ม</button>
      </form>
      <div className="player-wall">
        {players.map((player) => (
          <article key={player.id} className="player-tile">
            <img src={player.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
            <b>{player.name}</b>
            <span>{player.moveset ? `${formatScore(player.mainScoreUnits)} แต้ม · ช่อง ${player.pointer + 1}` : "ยังไม่ตั้งชุดมูฟ"}</span>
            <button className="text-danger" onClick={() => onDelete(player.id)}>ลบ</button>
          </article>
        ))}
        {players.length === 0 && <p className="empty-state">ยังไม่มีผู้เล่น เพิ่มชื่อแรกเพื่อเริ่มตั้งชุดมูฟ</p>}
      </div>
    </div>
  );
}

function RoundView(props: {
  game: GameState;
  step: RoundStep;
  setStep: (step: RoundStep) => void;
  player: Player | null;
  openRound: (id: string) => void;
  closeRound: () => void;
  confirmMoveset: (moveset: Move[]) => void;
  opponentId: string | null;
  setOpponentId: (id: string | null) => void;
  opponentMode: "chosen" | "random";
  setOpponentMode: (mode: "chosen" | "random") => void;
  chooseRandomOpponent: () => void;
  resolveMainMove: (move: Move) => void;
  selectedMove: Move | null;
  result: ReturnType<typeof commitMainDuel>["result"] | null;
}) {
  const { game, step, setStep, player } = props;
  if (!player) return <RoundSelect game={game} openRound={props.openRound} />;
  if (step === "selectPlayer") return <RoundSelect game={game} openRound={props.openRound} />;
  if (step === "inbox") return <Inbox game={game} player={player} onNext={() => setStep("action")} />;
  if (step === "moveset") return <MoveSetBuilder player={player} onConfirm={(moveset) => props.confirmMoveset(moveset)} />;
  if (step === "opponent") return <OpponentPick {...props} />;
  if (step === "pickMove") return <MovePicker title="เลือกมูฟของคุณ" seconds={game.settings.mainPickSeconds} onPick={props.resolveMainMove} />;
  if (step === "versus") return <Versus game={game} player={player} opponentId={props.opponentId} selectedMove={props.selectedMove} result={props.result} onDone={() => setStep("result")} />;
  if (step === "result") return <MainResult game={game} player={player} opponentId={props.opponentId} result={props.result} closeRound={props.closeRound} />;
  const blocked = mainDuelBlockedReason(game, player.id);
  return (
    <div className="panel-view">
      <Header icon="icons/icon-duel.webp" title={`รอบของ ${player.name}`} subtitle={`${formatScore(player.mainScoreUnits)} แต้ม · สตรีค ${player.streak}`} />
      <div className="command-grid">
        <button className="command" disabled={!!blocked} onClick={() => setStep("opponent")}>
          <img src={asset("icons/icon-duel.webp")} alt="" />
          <b>ท้าดวล</b>
          <span>{blocked ?? "เลือกคู่แข่งเองหรือสุ่มเพื่อแต้มที่มากกว่า"}</span>
        </button>
        <button className="command" disabled={!!game.activeRound?.didMovesetChange} onClick={() => setStep("moveset")}>
          <img src={asset("icons/icon-moveset.webp")} alt="" />
          <b>ปรับชุดมูฟ</b>
          <span>ยืนยันแล้วตัวชี้กลับช่องแรก ใช้ได้ 1 ครั้งต่อรอบ</span>
        </button>
        <button className="command" onClick={() => props.closeRound()}>
          <img src={asset("icons/icon-lock.webp")} alt="" />
          <b>จบรอบ</b>
          <span>ส่ง iPad คืนซุปหลังจอปลอดภัย</span>
        </button>
      </div>
    </div>
  );
}

function RoundSelect({ game, openRound }: { game: GameState; openRound: (id: string) => void }) {
  const players = Object.values(game.players).filter((player) => player.active);
  return (
    <div className="panel-view">
      <Header icon="icons/icon-coin.webp" title={`เปิดรอบ ${game.settings.coinsPerRound} เหรียญ`} subtitle="เลือกผู้เล่นที่จ่ายเหรียญแล้ว หรือเปิดคนที่ยังไม่ตั้งชุดมูฟเพื่อตั้งฟรี" />
      <div className="select-grid">
        {players.map((player) => (
          <button key={player.id} onClick={() => openRound(player.id)}>
            <img src={player.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
            <b>{player.name}</b>
            <span>{player.moveset ? `${formatScore(player.mainScoreUnits)} แต้ม` : "ตั้งชุดมูฟฟรี"}</span>
          </button>
        ))}
        {players.length === 0 && <p className="empty-state">ยังไม่มีผู้เล่นให้เปิดรอบ</p>}
      </div>
    </div>
  );
}

function Inbox({ game, player, onNext }: { game: GameState; player: Player; onNext: () => void }) {
  const entries = awayEntries(game, player.id);
  const warnings = huntedWarnings(game, player.id, entries);
  const total = entries.reduce((sum, item) => sum + item.defenderDeltaUnits, 0);
  return (
    <div className="panel-view">
      <Header icon="icons/icon-mail.webp" title={`ระหว่างที่ ${player.name} ไม่อยู่`} subtitle={`${entries.length} เหตุการณ์ · รวม ${formatDelta(total)} แต้ม`} />
      {warnings.length > 0 && <div className="hunt-alert"><img src={asset("icons/icon-warning.webp")} alt="" />{warnings.map((w) => `${w.challengerName} ท้า ${w.challengeCount} ชนะ ${w.winRatePercent}%`).join(" · ")}</div>}
      <div className="event-list">
        {entries.slice(0, 5).map((item) => (
          <div key={item.id}>
            <b>{item.challengerName}</b>
            <span>ท้าเรา · เขาออก {item.challengerMove ? moveLabel(item.challengerMove) : "-"} เจอเรา {item.defenderMove ? moveLabel(item.defenderMove) : "-"}</span>
            <strong>{formatDelta(item.defenderDeltaUnits)}</strong>
          </div>
        ))}
        {entries.length === 0 && <p className="empty-state">ไม่มีใครมาท้าในช่วงที่ไม่อยู่</p>}
      </div>
      <button className="primary" onClick={onNext}>ไปเมนูรอบ</button>
    </div>
  );
}

function MoveSetBuilder({ player, onConfirm }: { player: Player; onConfirm: (moveset: Move[]) => void }) {
  const [slots, setSlots] = useState<Move[]>(player.moveset ?? ["rock", "paper", "scissors"]);
  return (
    <div className="panel-view moveset-bg">
      <Header icon="icons/icon-moveset.webp" title="ตั้งชุดมูฟลับ 3 ช่อง" subtitle="ซ้ำกันได้ · ยืนยันแล้วตัวชี้กลับช่องแรกทันที" />
      <div className="slot-row">
        {slots.map((move, index) => (
          <button key={index} className="move-slot" onClick={() => setSlots(slots.map((old, i) => (i === index ? nextMove(old) : old)))}>
            <small>ช่อง {index + 1}</small>
            <img src={moveImages[move]} alt="" />
            <b>{moveLabel(move)}</b>
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => onConfirm(slots)}>ยืนยันชุดมูฟ แล้วปิดจอ</button>
    </div>
  );
}

function OpponentPick(props: Parameters<typeof RoundView>[0]) {
  const options = props.player ? challengeablePlayers(props.game, props.player.id) : [];
  return (
    <div className="panel-view">
      <Header icon="icons/icon-duel.webp" title="เลือกคู่แข่ง" subtitle="เห็นอันดับได้ แต่ไม่โชว์คะแนนตรงนี้ คะแนนไปดูที่ตารางอันดับ" />
      <div className="duel-choice">
        <button className="random-card" onClick={() => { props.chooseRandomOpponent(); props.setStep("pickMove"); }}>
          <img src={asset("icons/icon-dice.webp")} alt="" />
          <b>สุ่มคู่แข่ง</b>
          <span>ชนะ +5 แพ้ -2 แต่เปลี่ยนไม่ได้</span>
        </button>
        <div className="select-grid compact">
          {options.map((player) => (
            <button key={player.id} onClick={() => { props.setOpponentId(player.id); props.setOpponentMode("chosen"); props.setStep("pickMove"); }}>
              <img src={player.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
              <b>{player.name}</b>
              <span>อันดับ {rankPlayers(props.game).find((row) => row.player.id === player.id)?.rank ?? "-"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MovePicker({ title, seconds, onPick }: { title: string; seconds: number; onPick: (move: Move) => void }) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(false);
  const pick = useCallback((move: Move) => {
    if (done.current) return;
    done.current = true;
    onPick(move);
  }, [onPick]);
  useEffect(() => {
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    const timeout = window.setTimeout(() => pick(moves[Math.floor(Math.random() * moves.length)]), seconds * 1000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [pick, seconds]);
  return (
    <div className="panel-view prep-bg">
      <Header icon="icons/icon-timer.webp" title={title} subtitle={`เหลือ ${left} วินาที · หมดเวลาระบบสุ่มให้`} />
      <div className="move-picks">
        {moves.map((move) => (
          <button key={move} onClick={() => pick(move)}>
            <img src={moveImages[move]} alt="" />
            <b>{moveLabel(move)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function Versus({ game, player, opponentId, selectedMove, result, onDone }: { game: GameState; player: Player; opponentId: string | null; selectedMove: Move | null; result: ReturnType<typeof commitMainDuel>["result"] | null; onDone: () => void }) {
  const opponent = opponentId ? game.players[opponentId] : null;
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <button className="versus-screen" onClick={onDone}>
      <img className="versus-bg" src={asset("scenes/bg-versus.webp")} alt="" />
      <div className="vs-player left">
        <img src={player.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
        <b>{player.name}</b>
      </div>
      <img className="vs-badge" src={asset("scenes/vs-badge.webp")} alt="" />
      <div className="vs-player right">
        <img src={opponent?.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
        <b>{opponent?.name ?? "-"}</b>
      </div>
      <div className="vs-band">{selectedMove ? moveLabel(selectedMove) : "-"} ปะทะ {result?.defenderMove ? moveLabel(result.defenderMove) : "?"}</div>
    </button>
  );
}

function MainResult({ game, player, opponentId, result, closeRound }: { game: GameState; player: Player; opponentId: string | null; result: ReturnType<typeof commitMainDuel>["result"] | null; closeRound: () => void }) {
  const opponent = opponentId ? game.players[opponentId] : null;
  const win = result?.challengerOutcome === "win";
  const draw = result?.challengerOutcome === "draw";
  return (
    <div className="panel-view result-bg">
      <Header icon={win ? "scenes/result-win.webp" : draw ? "scenes/result-draw.webp" : "scenes/result-lose.webp"} title={win ? "ชนะ!" : draw ? "เสมอ" : "แพ้รอบนี้"} subtitle={`${player.name} vs ${opponent?.name ?? "-"}`} />
      <div className="result-grid">
        <ResultCard name={player.name} delta={result?.challengerDeltaUnits ?? 0} score={game.players[player.id]?.mainScoreUnits ?? player.mainScoreUnits} />
        <ResultCard name={opponent?.name ?? "คู่แข่ง"} delta={result?.defenderDeltaUnits ?? 0} score={opponent?.mainScoreUnits ?? 0} />
      </div>
      {result && result.streakAfter > 1 && <div className="streak"><img src={asset("scenes/streak-fire.webp")} alt="" /> สตรีคต่อเป็น {result.streakAfter}</div>}
      <button className="primary" onClick={closeRound}>จบรอบ ส่ง iPad คืนซุป</button>
    </div>
  );
}

function OffRoundView(props: {
  game: GameState;
  step: OffStep;
  setStep: (step: OffStep) => void;
  playerAId: string;
  playerBId: string;
  setPlayerAId: (id: string) => void;
  setPlayerBId: (id: string) => void;
  start: () => void;
  confirmMoveA: (move: Move) => void;
  confirmMoveB: (move: Move) => void;
  preview: { outcomeA: string; moveA: Move; moveB: Move } | null;
  save: (mode: OffRoundSaveMode) => void;
}) {
  const players = Object.values(props.game.players).filter((player) => player.active);
  if (props.step === "pickA") return <MovePicker title="คนที่ 1 เลือกมูฟ" seconds={props.game.settings.offRoundPickSeconds} onPick={props.confirmMoveA} />;
  if (props.step === "curtain") return <PrivacyCurtain game={props.game} onContinue={() => { props.setStep("pickB"); }} />;
  if (props.step === "pickB") return <MovePicker title="คนที่ 2 เลือกมูฟ" seconds={props.game.settings.offRoundPickSeconds} onPick={props.confirmMoveB} />;
  if (props.step === "result") {
    return (
      <div className="panel-view">
        <Header icon="icons/icon-offround.webp" title="ผลดวลนอกรอบ" subtitle={`${props.preview ? moveLabel(props.preview.moveA) : "-"} ปะทะ ${props.preview ? moveLabel(props.preview.moveB) : "-"}`} />
        <div className="button-row">
          <button className="primary" onClick={() => props.save("main")}>บันทึกคะแนนหลัก</button>
          <button className="secondary" onClick={() => props.save("secondary")}>บันทึกคะแนนรอง</button>
          <button className="secondary" onClick={() => props.save("discard")}>ไม่บันทึก</button>
        </div>
      </div>
    );
  }
  return (
    <div className="panel-view">
      <Header icon="icons/icon-offround.webp" title="ดวลนอกรอบ" subtitle="ไม่แตะสตรีค ไม่เลื่อนตัวชี้ และไม่เพิ่มจำนวนครั้งฝ่ายท้า" />
      <div className="two-selects">
        <SelectPlayer label="คนที่ 1" players={players} value={props.playerAId} onChange={props.setPlayerAId} />
        <SelectPlayer label="คนที่ 2" players={players} value={props.playerBId} onChange={props.setPlayerBId} />
      </div>
      <button className="primary" onClick={props.start}>เริ่มเลือกมูฟ</button>
    </div>
  );
}

function RankingView({ game }: { game: GameState }) {
  const ranked = rankPlayers(game);
  return (
    <div className="panel-view">
      <Header icon="icons/icon-ranking.webp" title="ตารางอันดับ" subtitle="คะแนนหลัก > คะแนนรอง > ชนะ-แพ้ > จำนวนครั้งฝ่ายท้า · อันดับร่วมแบบกีฬา" />
      <div className="rank-table">
        {ranked.map((row) => (
          <div key={row.player.id}>
            <b>#{row.rank}</b>
            <span>{row.player.name}</span>
            <strong>{formatScore(row.player.mainScoreUnits)}</strong>
            <small>รอง {row.player.sideScore} · W-L {row.winMinusLoss} · ท้า {row.player.challengerEntries}</small>
          </div>
        ))}
        {ranked[0]?.unrankedCount ? <p className="empty-state">อีก {ranked[0]?.unrankedCount} คนลงทะเบียนแล้วแต่ยังไม่แข่ง</p> : null}
        {ranked.length === 0 && <p className="empty-state">ยังไม่มีอันดับ รอให้มีการดวลอย่างน้อย 1 ครั้ง</p>}
      </div>
    </div>
  );
}

function SettingsView({ game, updateGame }: { game: GameState; updateGame: (game: GameState) => void }) {
  const s = game.settings;
  const setNumber = (key: "coinsPerRound" | "mainPickSeconds" | "offRoundPickSeconds" | "streakBonusPercent" | "huntedMinChallenges") => (value: string) => {
    updateGame(updateSettings(game, { [key]: Number(value) }));
  };
  return (
    <div className="panel-view">
      <Header icon="icons/icon-settings.webp" title="ตั้งค่าเกม" subtitle="ค่าถูกบีบขอบเขตกันตั้งพลาด คะแนนตั้งต้นมีผลกับซีซั่นใหม่เท่านั้น" />
      <div className="settings-grid">
        <NumberField label="เหรียญต่อรอบ" value={s.coinsPerRound} onChange={setNumber("coinsPerRound")} />
        <NumberField label="เวลาเลือกมูฟหลัก" value={s.mainPickSeconds} onChange={setNumber("mainPickSeconds")} />
        <NumberField label="เวลาเลือกนอกรอบ" value={s.offRoundPickSeconds} onChange={setNumber("offRoundPickSeconds")} />
        <NumberField label="โบนัสสตรีค %" value={s.streakBonusPercent} onChange={setNumber("streakBonusPercent")} />
        <NumberField label="เกณฑ์โดนไล่เก็บ" value={s.huntedMinChallenges} onChange={setNumber("huntedMinChallenges")} />
      </div>
    </div>
  );
}

function SeasonView({ game, onFinish }: { game: GameState; onFinish: () => void }) {
  return (
    <div className="panel-view season-bg">
      <Header icon="scenes/season-trophy.webp" title="ซีซั่น" subtitle="จบซีซั่นแล้วบันทึกอันดับและเปิดชุดมูฟลับย้อนหลัง" />
      <button className="primary" onClick={onFinish}>จบซีซั่นนี้</button>
      <div className="archive-list">
        {game.archives.map((archive) => <div key={archive.finishedAt}>{archive.seasonId} · แชมป์ {archive.championName ?? "ไม่มี"}</div>)}
        {game.archives.length === 0 && <p className="empty-state">ยังไม่มีบันทึกซีซั่นเก่า</p>}
      </div>
    </div>
  );
}

function QuickRanking({ game }: { game: GameState }) {
  return (
    <section className="side-card">
      <h2>Top Board</h2>
      {rankPlayers(game).slice(0, 5).map((row) => (
        <div className="side-row" key={row.player.id}>
          <b>#{row.rank}</b>
          <span>{row.player.name}</span>
          <strong>{formatScore(row.player.mainScoreUnits)}</strong>
        </div>
      ))}
      {rankPlayers(game).length === 0 && <p className="empty-state empty-state--compact">ยังไม่มีอันดับ</p>}
    </section>
  );
}

function ChampionTax({ game }: { game: GameState }) {
  return (
    <section className="side-card tax">
      <h2>ภาษีแชมป์</h2>
      {championTax(game).map((row) => (
        <div key={row.player.id} className="tax-row">
          <b>#{row.rank} {row.player.name}</b>
          {row.visibleMoves.length === 0 ? <span>ยังไม่มีข้อมูลมูฟ</span> : row.visibleMoves.map((move) => <span key={move.move}>{move.label} {move.percent}% จาก {move.count}/{move.total}</span>)}
        </div>
      ))}
      {championTax(game).length === 0 && <p className="empty-state empty-state--compact">ยังไม่มีข้อมูลภาษี</p>}
    </section>
  );
}

function PrivacyCurtain({ game, onContinue }: { game: GameState; onContinue: () => void }) {
  const player = game.privacyCurtain?.playerId ? game.players[game.privacyCurtain.playerId] : null;
  return (
    <button className="privacy" onClick={onContinue}>
      <img src={asset("icons/icon-lock.webp")} alt="" />
      <h1>ปิดจอก่อนส่งเครื่อง</h1>
      <p>{player ? `${player.name} เลือกเสร็จแล้ว` : "ส่ง iPad ให้อีกคนได้แล้ว"} · แตะเพื่อไปต่อ</p>
    </button>
  );
}

function Header({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <header className="view-header">
      <img src={asset(icon)} alt="" />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "nav active" : "nav"} onClick={onClick}><img src={asset(icon)} alt="" /><span>{label}</span></button>;
}

function Metric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="metric"><img src={asset(icon)} alt="" /><span>{label}</span><b>{value}</b></div>;
}

function ResultCard({ name, delta, score }: { name: string; delta: number; score: number }) {
  return <div className="result-card"><b>{name}</b><strong>{formatDelta(delta)}</strong><span>{formatScore(score)} แต้ม</span></div>;
}

function SelectPlayer({ label, players, value, onChange }: { label: string; players: Player[]; value: string; onChange: (id: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">เลือกผู้เล่น</option>
        {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return <label><span>{label}</span><input type="number" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function nextMove(move: Move): Move {
  const index = moves.indexOf(move);
  return moves[(index + 1) % moves.length];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
}
