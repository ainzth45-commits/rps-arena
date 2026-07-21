import { useEffect, useMemo, useRef, useState } from "react";
import {
  canDeletePlayer,
  championTax,
  commitOffRoundDuel,
  createInitialGame,
  createPlayer,
  decimalScore,
  decideOutcome,
  defaultSettings,
  eligibleOpponents,
  moveLabel,
  rankPlayers,
  setMoveset,
  startMainDuel
} from "./domain/gameLogic";
import type { GameState, Move, OffRoundSaveMode, Player } from "./domain/types";
import { createPersistentStore } from "./persistence/storage";

type View = "home" | "players" | "round" | "offround" | "ranking" | "settings" | "season";
type RoundStep = "selectPlayer" | "inbox" | "moveset" | "privacy" | "action" | "opponent" | "pickMove" | "result";
type OffRoundStep = "setup" | "pickA" | "curtain" | "pickB" | "result";

const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
const moveAssets: Record<Move, string> = {
  rock: asset("moves/rock.webp"),
  paper: asset("moves/paper.webp"),
  scissors: asset("moves/scissors.webp")
};
const moveOrder: Move[] = ["rock", "paper", "scissors"];
const store = createPersistentStore<GameState>("rps-arena-v2", createInitialGame());

function App() {
  const loaded = useMemo(() => store.load(), []);
  const [game, setGame] = useState<GameState>(loaded.value);
  const [storageWarning, setStorageWarning] = useState<string | null>(loaded.available ? null : loaded.message ?? null);
  const [view, setView] = useState<View>(loaded.value.activeRound ? "round" : "home");
  const [roundStep, setRoundStep] = useState<RoundStep>(loaded.value.activeRound ? "inbox" : "selectPlayer");
  const [roundPlayerId, setRoundPlayerId] = useState<string | null>(loaded.value.activeRound?.playerId ?? null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [opponentMode, setOpponentMode] = useState<"chosen" | "random">("chosen");
  const [roundResult, setRoundResult] = useState<ReturnType<typeof startMainDuel>["result"] | null>(null);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [offStep, setOffStep] = useState<OffRoundStep>("setup");
  const [offA, setOffA] = useState<string>("");
  const [offB, setOffB] = useState<string>("");
  const [offMoveA, setOffMoveA] = useState<Move | null>(null);
  const [offMoveB, setOffMoveB] = useState<Move | null>(null);
  const [offResult, setOffResult] = useState<{ outcomeA: string; preview: string } | null>(null);

  useEffect(() => {
    const result = store.save(game);
    setStorageWarning(result.ok ? null : result.message ?? "บันทึกข้อมูลในเครื่องไม่ได้");
  }, [game]);

  const players = Object.values(game.players).filter((player) => player.active);
  const activeRoundPlayer = roundPlayerId ? game.players[roundPlayerId] : null;

  function updateGame(next: GameState) {
    setGame(next);
  }

  function openRound(playerId: string) {
    const player = game.players[playerId];
    if (!player) return;
    const activeRound = { playerId, openedAt: Date.now(), didMainDuel: false, didMovesetChange: false };
    updateGame({ ...game, activeRound });
    setRoundPlayerId(playerId);
    setRoundResult(null);
    setSelectedOpponentId(null);
    setOpponentMode("chosen");
    setRoundError(null);
    setRoundStep(player.moveset ? "inbox" : "moveset");
  }

  function closeRound() {
    if (roundPlayerId && game.players[roundPlayerId]) {
      const latestId = game.history[0]?.id ?? null;
      updateGame({
        ...game,
        activeRound: null,
        players: {
          ...game.players,
          [roundPlayerId]: { ...game.players[roundPlayerId], lastSeenHistoryId: latestId }
        }
      });
    } else {
      updateGame({ ...game, activeRound: null });
    }
    setRoundStep("selectPlayer");
    setRoundPlayerId(null);
    setView("home");
  }

  function confirmMoveset(moveset: Move[]) {
    if (!roundPlayerId) return;
    const next = setMoveset(game, roundPlayerId, moveset);
    const currentRound = next.activeRound;
    updateGame({
      ...next,
      activeRound: currentRound
        ? { ...currentRound, didMovesetChange: activeRoundPlayer?.moveset ? true : currentRound.didMovesetChange }
        : currentRound
    });
    setRoundStep("privacy");
  }

  function chooseRandomOpponent() {
    if (!roundPlayerId) return;
    const options = eligibleOpponents(game, roundPlayerId);
    if (options.length === 0) {
      setRoundError("ยังไม่มีคู่แข่งที่ตั้งชุดมูฟแล้ว");
      return;
    }
    const picked = options[Math.floor(Math.random() * options.length)];
    setSelectedOpponentId(picked.id);
    setOpponentMode("random");
    setRoundError(null);
  }

  function resolveMainMove(move: Move) {
    if (!roundPlayerId || !selectedOpponentId) return;
    try {
      const next = startMainDuel(game, {
        challengerId: roundPlayerId,
        defenderId: selectedOpponentId,
        challengerMove: move,
        opponentMode,
        now: Date.now()
      });
      updateGame(next.game);
      setRoundResult(next.result);
      setRoundStep("result");
    } catch (error) {
      setRoundError(error instanceof Error ? error.message : "ดวลไม่ได้");
    }
  }

  function addGenericPlayer(name: string) {
    const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    updateGame(createPlayer(game, id, name));
  }

  function deletePlayer(playerId: string) {
    const guard = canDeletePlayer(game, playerId);
    if (!guard.ok) {
      setRoundError(guard.reason);
      return;
    }
    const nextPlayers = { ...game.players };
    delete nextPlayers[playerId];
    updateGame({ ...game, players: nextPlayers });
  }

  function commitOffRound(saveMode: OffRoundSaveMode) {
    if (!offA || !offB || !offMoveA || !offMoveB) return;
    const next = commitOffRoundDuel(game, {
      playerAId: offA,
      playerBId: offB,
      moveA: offMoveA,
      moveB: offMoveB,
      saveMode,
      now: Date.now()
    });
    updateGame(next.game);
    resetOffRound();
  }

  function resetOffRound() {
    setOffStep("setup");
    setOffA("");
    setOffB("");
    setOffMoveA(null);
    setOffMoveB(null);
    setOffResult(null);
  }

  function finishSeason() {
    const ranking = rankPlayers(game);
    const archive = {
      seasonId: game.seasonId,
      finishedAt: Date.now(),
      championName: ranking[0]?.player.name ?? null,
      ranking: ranking.map((row) => ({
        rank: row.rank,
        playerName: row.player.name,
        mainScoreUnits: row.player.mainScoreUnits,
        sideScoreUnits: row.player.sideScoreUnits
      })),
      revealedMovesets: Object.values(game.players).map((player) => ({ playerName: player.name, moveset: player.moveset }))
    };
    const nextSeasonNumber = game.archives.length + 2;
    const resetPlayers = Object.fromEntries(
      Object.values(game.players).map((player) => [
        player.id,
        {
          ...player,
          moveset: null,
          pointer: 0,
          mainScoreUnits: game.settings.startingScoreUnits,
          sideScoreUnits: 0,
          streak: 0,
          bestStreak: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          challengerEntries: 0,
          duelCount: 0,
          moveCounts: { rock: 0, paper: 0, scissors: 0 },
          lastSeenHistoryId: null
        }
      ])
    );
    updateGame({
      ...game,
      seasonId: `SS${nextSeasonNumber}`,
      players: resetPlayers,
      history: [],
      activeRound: null,
      activeOffRound: null,
      archives: [archive, ...game.archives]
    });
    setView("season");
  }

  return (
    <main className="app-shell" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,18,31,.9), rgba(16,18,31,.58)), url(${asset("bg-arena.png")})` }}>
      <header className="topbar">
        <img src={asset("logo.png")} alt="เป่ายิ้งฉุบ! อารีน่า!" className="logo" />
        <div className="season-pill">
          <span>{game.seasonId}</span>
          <b>{game.settings.coinsPerRound} เหรียญ / รอบ</b>
        </div>
        <div className={storageWarning ? "save-status warn" : "save-status"}>
          {storageWarning ?? "บันทึกในเครื่องอัตโนมัติ"}
        </div>
      </header>

      <section className="game-grid">
        <nav className="dock" aria-label="เมนูหลัก">
          <DockButton icon="icon-home.webp" active={view === "home"} label="หน้าแรก" onClick={() => setView("home")} />
          <DockButton icon="icon-players.webp" active={view === "players"} label="ผู้เล่น" onClick={() => setView("players")} />
          <DockButton icon="icon-duel.webp" active={view === "round"} label="เปิดรอบ" onClick={() => { setView("round"); setRoundStep(game.activeRound ? "inbox" : "selectPlayer"); }} />
          <DockButton icon="icon-offround.webp" active={view === "offround"} label="นอกรอบ" onClick={() => setView("offround")} />
          <DockButton icon="icon-ranking.webp" active={view === "ranking"} label="อันดับ" onClick={() => setView("ranking")} />
          <DockButton icon="icon-settings.webp" active={view === "settings"} label="ตั้งค่า" onClick={() => setView("settings")} />
        </nav>

        <section className="stage">
          {view === "home" && <HomeView game={game} setView={setView} />}
          {view === "players" && <PlayersView players={players} onAdd={addGenericPlayer} onDelete={deletePlayer} error={roundError} />}
          {view === "round" && (
            <RoundView
              game={game}
              step={roundStep}
              setStep={setRoundStep}
              player={activeRoundPlayer}
              openRound={openRound}
              closeRound={closeRound}
              confirmMoveset={confirmMoveset}
              selectedOpponentId={selectedOpponentId}
              setSelectedOpponentId={setSelectedOpponentId}
              opponentMode={opponentMode}
              setOpponentMode={setOpponentMode}
              chooseRandomOpponent={chooseRandomOpponent}
              resolveMainMove={resolveMainMove}
              result={roundResult}
              error={roundError}
            />
          )}
          {view === "offround" && (
            <OffRoundView
              game={game}
              step={offStep}
              setStep={setOffStep}
              playerAId={offA}
              playerBId={offB}
              setPlayerAId={setOffA}
              setPlayerBId={setOffB}
              moveA={offMoveA}
              moveB={offMoveB}
              setMoveA={setOffMoveA}
              setMoveB={setOffMoveB}
              result={offResult}
              setResult={setOffResult}
              commit={commitOffRound}
            />
          )}
          {view === "ranking" && <RankingView game={game} />}
          {view === "settings" && <SettingsView game={game} updateGame={updateGame} />}
          {view === "season" && <SeasonView game={game} finishSeason={finishSeason} />}
        </section>

        <aside className="scoreboard">
          <QuickRanking game={game} />
          <ChampionTaxPanel game={game} />
        </aside>
      </section>
    </main>
  );
}

function DockButton({ icon, active, label, onClick }: { icon: string; active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={active ? "dock-button active" : "dock-button"} onClick={onClick}>
      <img src={asset(`icons/${icon}`)} alt="" />
      <span>{label}</span>
    </button>
  );
}

function HomeView({ game, setView }: { game: GameState; setView: (view: View) => void }) {
  const ranked = rankPlayers(game);
  return (
    <div className="home-view">
      <div className="hero-copy">
        <p className="kicker">เกมขายของที่คนโดนอ่านออก ต้องจ่ายกลับมาสับขาหลอก</p>
        <h1>อารีน่าของซุป</h1>
        <p>เปิดรอบเร็ว จ่ายเหรียญจริงนอกแอป ตั้งชุดมูฟลับ แล้วเลือกว่าจะล่าเหยื่อเองหรือสุ่มชนแบบเสี่ยงกว่าแต่คุ้มกว่า</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => setView("round")}>เปิดรอบให้ผู้เล่น</button>
          <button onClick={() => setView("offround")}>เปิดดวลนอกรอบ</button>
        </div>
      </div>
      <div className="mascot-card">
        <img src={asset("chars/cat-smug.webp")} alt="แมวส้มกวนโอ๊ย" />
        <img src={asset("chars/employee-angry.webp")} alt="พนักงานหญิงหัวร้อน" />
        <div>
          <b>{Object.keys(game.players).length} ผู้เล่น</b>
          <span>{ranked.length} คนลงสังเวียนแล้ว</span>
        </div>
      </div>
    </div>
  );
}

function PlayersView({ players, onAdd, onDelete, error }: { players: Player[]; onAdd: (name: string) => void; onDelete: (id: string) => void; error: string | null }) {
  const [name, setName] = useState("");
  return (
    <div className="panel-view">
      <SectionTitle icon="icon-players.webp" title="รายชื่อผู้เล่น" subtitle="ซุปเพิ่มชื่อได้เอง ไม่มีล็อกอินและไม่มีชื่อจริงฝังในโค้ด" />
      <form className="add-player" onSubmit={(event) => { event.preventDefault(); onAdd(name); setName(""); }}>
        <input maxLength={30} value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่อเล่นหรือรหัสผู้เล่น" />
        <button className="primary" type="submit">เพิ่ม</button>
      </form>
      {error && <p className="error-line">{error}</p>}
      <div className="player-grid">
        {players.map((player) => (
          <article className="player-card" key={player.id}>
            <img src={player.avatarUrl || asset("icons/avatar-placeholder.webp")} alt="" />
            <div>
              <b>{player.name}</b>
              <span>{player.moveset ? "ตั้งชุดมูฟแล้ว" : "ยังไม่ตั้งชุดมูฟ"}</span>
              <small>{decimalScore(player.mainScoreUnits)} คะแนน · สตรีค {player.streak}</small>
            </div>
            <button onClick={() => onDelete(player.id)}>ลบ</button>
          </article>
        ))}
      </div>
    </div>
  );
}

function RoundView(props: {
  game: GameState;
  step: RoundStep;
  setStep: (step: RoundStep) => void;
  player: Player | null;
  openRound: (playerId: string) => void;
  closeRound: () => void;
  confirmMoveset: (moveset: Move[]) => void;
  selectedOpponentId: string | null;
  setSelectedOpponentId: (id: string | null) => void;
  opponentMode: "chosen" | "random";
  setOpponentMode: (mode: "chosen" | "random") => void;
  chooseRandomOpponent: () => void;
  resolveMainMove: (move: Move) => void;
  result: ReturnType<typeof startMainDuel>["result"] | null;
  error: string | null;
}) {
  const { game, player, step } = props;
  if (step === "selectPlayer" || !player) {
    return (
      <div className="panel-view">
        <SectionTitle icon="icon-duel.webp" title="เปิดรอบหลัก" subtitle="ผู้เล่นจ่ายเหรียญให้ซุปก่อน แล้วเลือกชื่อเพื่อเริ่มรอบ" />
        {game.activeRound && <p className="warning-line">พบรอบค้างของ {game.players[game.activeRound.playerId]?.name ?? "ผู้เล่นที่ถูกลบ"} กู้กลับมาได้จากรายการนี้</p>}
        <div className="select-list">
          {Object.values(game.players).map((item) => (
            <button key={item.id} onClick={() => props.openRound(item.id)}>
              <img src={item.avatarUrl} alt="" />
              <span>{item.name}</span>
              <small>{item.moveset ? "พร้อมดวล" : "ต้องตั้งชุดมูฟก่อน"}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "moveset") {
    return (
      <MovesetEditor
        title={player.moveset ? "ปรับชุดมูฟลับ" : "ตั้งชุดมูฟแรกของซีซั่น"}
        subtitle={player.moveset ? "ยืนยันแล้วตัวชี้รีเซตกลับช่องแรกทันที" : "ครั้งแรกฟรี ไม่นับเป็นสิทธิ์ปรับของรอบ"}
        initial={player.moveset ?? ["rock", "paper", "scissors"]}
        onConfirm={props.confirmMoveset}
      />
    );
  }

  if (step === "privacy") {
    return <PrivacyCurtain onContinue={() => props.setStep("action")} />;
  }

  if (step === "inbox") {
    const unseen = unseenHistory(game, player);
    return (
      <div className="panel-view">
        <SectionTitle icon="icon-mail.webp" title={`กล่องจดหมายของ ${player.name}`} subtitle="สิ่งที่เกิดขึ้นระหว่างที่ไม่อยู่" />
        <div className="history-stack">
          {unseen.length === 0 && <p className="empty-line">ยังไม่มีใครมาท้าระหว่างที่ไม่อยู่</p>}
          {unseen.slice(0, 5).map((item) => <HistoryLine key={item.id} item={item} playerId={player.id} />)}
        </div>
        <button className="primary" onClick={() => props.setStep("action")}>เข้ารอบ</button>
      </div>
    );
  }

  if (step === "action") {
    const round = game.activeRound;
    return (
      <div className="action-grid">
        <ActionCard icon="icon-duel.webp" title="ท้าดวล 1 ครั้ง" disabled={!!round?.didMainDuel} onClick={() => props.setStep("opponent")} />
        <ActionCard icon="icon-moveset.webp" title="ปรับชุดมูฟ 1 ครั้ง" disabled={!!round?.didMovesetChange} onClick={() => props.setStep("moveset")} />
        <ActionCard icon="icon-lock.webp" title="จบรอบและคืนเครื่อง" onClick={props.closeRound} />
      </div>
    );
  }

  if (step === "opponent") {
    const opponents = eligibleOpponents(game, player.id);
    const selected = props.selectedOpponentId ? game.players[props.selectedOpponentId] : null;
    return (
      <div className="panel-view">
        <SectionTitle icon="icon-duel.webp" title="เลือกคู่แข่ง" subtitle="เลือกเองเห็นแค่อันดับ หรือกดสุ่มเพื่อแต้มคุ้มกว่าแต่เปลี่ยนไม่ได้" />
        {props.error && <p className="error-line">{props.error}</p>}
        <div className="opponent-layout">
          <button className="random-card" onClick={props.chooseRandomOpponent} disabled={props.opponentMode === "random" && !!selected}>
            <img src={asset("icons/icon-dice.webp")} alt="" />
            <b>{selected && props.opponentMode === "random" ? `สุ่มได้ ${selected.name}` : "สุ่มคู่แข่ง"}</b>
            <span>ชนะ +5 · แพ้ -2</span>
          </button>
          <div className="opponent-list">
            {opponents.map((opponent) => (
              <button
                key={opponent.id}
                disabled={props.opponentMode === "random"}
                className={props.selectedOpponentId === opponent.id ? "selected" : ""}
                onClick={() => { props.setOpponentMode("chosen"); props.setSelectedOpponentId(opponent.id); }}
              >
                <img src={opponent.avatarUrl} alt="" />
                <span>{opponent.name}</span>
                <small>อันดับ {rankOf(game, opponent.id) ?? "-"}</small>
              </button>
            ))}
          </div>
        </div>
        <button className="primary" disabled={!props.selectedOpponentId} onClick={() => props.setStep("pickMove")}>ไปเลือกมูฟ</button>
      </div>
    );
  }

  if (step === "pickMove") {
    return <MovePicker seconds={game.settings.mainPickSeconds} title="เลือกมูฟของฝ่ายท้า" onPick={props.resolveMainMove} />;
  }

  return (
    <ResultView
      player={player}
      opponent={props.selectedOpponentId ? game.players[props.selectedOpponentId] : null}
      result={props.result}
      closeRound={props.closeRound}
    />
  );
}

function OffRoundView(props: {
  game: GameState;
  step: OffRoundStep;
  setStep: (step: OffRoundStep) => void;
  playerAId: string;
  playerBId: string;
  setPlayerAId: (id: string) => void;
  setPlayerBId: (id: string) => void;
  moveA: Move | null;
  moveB: Move | null;
  setMoveA: (move: Move) => void;
  setMoveB: (move: Move) => void;
  result: { outcomeA: string; preview: string } | null;
  setResult: (result: { outcomeA: string; preview: string }) => void;
  commit: (mode: OffRoundSaveMode) => void;
}) {
  const players = Object.values(props.game.players);
  if (props.step === "setup") {
    return (
      <div className="panel-view">
        <SectionTitle icon="icon-offround.webp" title="ดวลนอกรอบ" subtitle="สองคนอยู่ตรงนั้น เลือกเองทั้งคู่ ไม่แตะสตรีค ตัวชี้ หรือจำนวนครั้งฝ่ายท้า" />
        <div className="two-selects">
          <PlayerSelect players={players} value={props.playerAId} onChange={props.setPlayerAId} label="คนที่ 1" />
          <PlayerSelect players={players.filter((player) => player.id !== props.playerAId)} value={props.playerBId} onChange={props.setPlayerBId} label="คนที่ 2" />
        </div>
        <button className="primary" disabled={!props.playerAId || !props.playerBId} onClick={() => props.setStep("pickA")}>เริ่มเลือกมูฟ</button>
      </div>
    );
  }
  if (props.step === "pickA") {
    return <MovePicker seconds={props.game.settings.offRoundPickSeconds} title="คนที่ 1 เลือกมูฟ" onPick={(move) => { props.setMoveA(move); props.setStep("curtain"); }} />;
  }
  if (props.step === "curtain") {
    return <PrivacyCurtain onContinue={() => props.setStep("pickB")} />;
  }
  if (props.step === "pickB") {
    return <MovePicker seconds={props.game.settings.offRoundPickSeconds} title="คนที่ 2 เลือกมูฟ" onPick={(move) => {
      props.setMoveB(move);
      const outcome = decideOutcome(props.moveA ?? "rock", move);
      props.setResult({ outcomeA: outcome, preview: `${moveLabel(props.moveA ?? "rock")} เจอ ${moveLabel(move)}` });
      props.setStep("result");
    }} />;
  }
  return (
    <div className="panel-view result-panel">
      <SectionTitle icon="clash-spark.webp" iconFolder="scenes" title="ผลดวลนอกรอบ" subtitle={props.result?.preview ?? ""} />
      <div className={`result-word ${props.result?.outcomeA ?? "draw"}`}>{outcomeLabel(props.result?.outcomeA ?? "draw")}</div>
      <div className="result-actions">
        <button className="primary" onClick={() => props.commit("main")}>บันทึกคะแนนหลัก</button>
        <button onClick={() => props.commit("secondary")}>บันทึกคะแนนรอง</button>
        <button onClick={() => props.commit("discard")}>ไม่บันทึก</button>
      </div>
    </div>
  );
}

function MovePicker({ seconds, title, onPick }: { seconds: number; title: string; onPick: (move: Move) => void }) {
  const [left, setLeft] = useState(seconds);
  const locked = useRef(false);

  useEffect(() => {
    setLeft(seconds);
    locked.current = false;
    const ticker = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    const timeout = window.setTimeout(() => choose(moveOrder[Math.floor(Math.random() * moveOrder.length)]), seconds * 1000);
    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(timeout);
    };
  }, [seconds]);

  function choose(move: Move) {
    if (locked.current) return;
    locked.current = true;
    onPick(move);
  }

  return (
    <div className="move-picker" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,18,31,.9), rgba(16,18,31,.62)), url(${asset("scenes/bg-prep.webp")})` }}>
      <div className="timer-badge">
        <img src={asset("icons/icon-timer.webp")} alt="" />
        <b>{left}</b>
      </div>
      <h2>{title}</h2>
      <div className="move-row">
        {moveOrder.map((move) => (
          <button key={move} onClick={() => choose(move)}>
            <img src={moveAssets[move]} alt="" />
            <span>{moveLabel(move)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MovesetEditor({ title, subtitle, initial, onConfirm }: { title: string; subtitle: string; initial: Move[]; onConfirm: (moves: Move[]) => void }) {
  const [slots, setSlots] = useState<Move[]>(initial);
  return (
    <div className="moveset-editor" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,18,31,.88), rgba(16,18,31,.68)), url(${asset("scenes/bg-moveset.webp")})` }}>
      <SectionTitle icon="icon-moveset.webp" title={title} subtitle={subtitle} />
      <div className="slot-row">
        {slots.map((slot, index) => (
          <div className="move-slot" key={`${slot}-${index}`}>
            <b>ช่อง {index + 1}</b>
            <img src={moveAssets[slot]} alt="" />
            <div className="segmented">
              {moveOrder.map((move) => (
                <button key={move} className={slot === move ? "active" : ""} onClick={() => setSlots(slots.map((item, slotIndex) => slotIndex === index ? move : item))}>
                  {moveLabel(move)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="primary" onClick={() => onConfirm(slots)}>ยืนยันชุดมูฟ</button>
    </div>
  );
}

function PrivacyCurtain({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="privacy-curtain">
      <img src={asset("icons/icon-lock.webp")} alt="" />
      <h2>ปิดจอก่อนส่งเครื่อง</h2>
      <p>จังหวะนี้กันไม่ให้คนถัดไปเห็นชุดมูฟหรือมูฟที่เลือกไว้</p>
      <button className="primary" onClick={onContinue}>คนถัดไปถือเครื่องแล้ว</button>
    </div>
  );
}

function ResultView({ player, opponent, result, closeRound }: { player: Player; opponent: Player | null; result: ReturnType<typeof startMainDuel>["result"] | null; closeRound: () => void }) {
  const outcome = result?.challengerOutcome ?? "draw";
  return (
    <div className="result-arena" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,18,31,.7), rgba(16,18,31,.72)), url(${asset("scenes/bg-result.webp")})` }}>
      <div className="versus-names">
        <b>{player.name}</b>
        <img src={asset("scenes/vs-badge.webp")} alt="" />
        <b>{opponent?.name ?? "คู่แข่ง"}</b>
      </div>
      <div className={`result-word ${outcome}`}>{outcomeLabel(outcome)}</div>
      <p>
        ฝ่ายท้า {formatDelta(result?.challengerDeltaUnits ?? 0)} · ฝ่ายถูกท้า {formatDelta(result?.defenderDeltaUnits ?? 0)}
      </p>
      <button className="primary" onClick={closeRound}>จบรอบ</button>
    </div>
  );
}

function RankingView({ game }: { game: GameState }) {
  const ranked = rankPlayers(game);
  return (
    <div className="panel-view">
      <SectionTitle icon="icon-ranking.webp" title="ตารางอันดับ" subtitle="เรียงคะแนนหลัก คะแนนรอง ผลต่างชนะ-แพ้ แล้วจำนวนครั้งที่ลงเป็นฝ่ายท้า" />
      <div className="ranking-table large">
        {ranked.map((row) => <RankingRow key={row.player.id} row={row} />)}
      </div>
      <p className="empty-line">ลงทะเบียนแล้วแต่ยังไม่แข่ง {ranked[0]?.unrankedCount ?? Object.keys(game.players).length} คน</p>
    </div>
  );
}

function SettingsView({ game, updateGame }: { game: GameState; updateGame: (game: GameState) => void }) {
  function setNumber(path: string, value: number) {
    const clamped = Math.max(path.includes("Seconds") ? 5 : path.includes("loss") ? -100 : 0, Math.min(999, value));
    if (path === "coinsPerRound") updateGame({ ...game, settings: { ...game.settings, coinsPerRound: clamped } });
    if (path === "mainPickSeconds") updateGame({ ...game, settings: { ...game.settings, mainPickSeconds: clamped } });
    if (path === "offRoundPickSeconds") updateGame({ ...game, settings: { ...game.settings, offRoundPickSeconds: clamped } });
    if (path === "streakBonusPercent") updateGame({ ...game, settings: { ...game.settings, streakBonusPercent: clamped } });
    if (path === "startingScoreUnits") updateGame({ ...game, settings: { ...game.settings, startingScoreUnits: clamped * 10 } });
  }
  return (
    <div className="panel-view">
      <SectionTitle icon="icon-settings.webp" title="ตั้งค่าซุป" subtitle="เปลี่ยนจากในเกมได้ การเปลี่ยนคะแนนตั้งต้นไม่ย้อนแก้คะแนนคนที่เล่นอยู่แล้ว" />
      <div className="settings-grid">
        <NumberField label="คะแนนตั้งต้น" value={game.settings.startingScoreUnits / 10} onChange={(value) => setNumber("startingScoreUnits", value)} />
        <NumberField label="เหรียญต่อรอบ" value={game.settings.coinsPerRound} onChange={(value) => setNumber("coinsPerRound", value)} />
        <NumberField label="เวลาหลัก" value={game.settings.mainPickSeconds} onChange={(value) => setNumber("mainPickSeconds", value)} />
        <NumberField label="เวลานอกรอบ" value={game.settings.offRoundPickSeconds} onChange={(value) => setNumber("offRoundPickSeconds", value)} />
        <NumberField label="โบนัสสตรีค %" value={game.settings.streakBonusPercent} onChange={(value) => setNumber("streakBonusPercent", value)} />
      </div>
      <button onClick={() => updateGame({ ...game, settings: defaultSettings })}>คืนค่าเรตเริ่มต้น</button>
    </div>
  );
}

function SeasonView({ game, finishSeason }: { game: GameState; finishSeason: () => void }) {
  return (
    <div className="panel-view">
      <SectionTitle icon="season-trophy.webp" iconFolder="scenes" title="ซีซั่น" subtitle="จบซีซั่นจะบันทึกอันดับและเปิดชุดมูฟทั้งหมดไว้ดูย้อนหลัง" />
      <button className="primary" onClick={finishSeason}>จบซีซั่นและประกาศแชมป์</button>
      <div className="archive-list">
        {game.archives.map((archive) => (
          <article key={archive.finishedAt}>
            <b>{archive.seasonId}: {archive.championName ?? "ไม่มีแชมป์"}</b>
            <span>{archive.ranking.slice(0, 3).map((row) => `#${row.rank} ${row.playerName}`).join(" · ")}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function QuickRanking({ game }: { game: GameState }) {
  const ranked = rankPlayers(game).slice(0, 5);
  return (
    <section>
      <h3>อันดับสด</h3>
      <div className="ranking-table">
        {ranked.map((row) => <RankingRow key={row.player.id} row={row} />)}
      </div>
    </section>
  );
}

function ChampionTaxPanel({ game }: { game: GameState }) {
  const tax = championTax(game);
  return (
    <section>
      <h3>ภาษีของแชมป์</h3>
      <div className="tax-list">
        {tax.length === 0 && <p className="empty-line">ยังไม่มีข้อมูลมูฟของท็อป 3</p>}
        {tax.map((row) => (
          <article key={row.player.id}>
            <b>#{row.rank} {row.player.name}</b>
            <span>{row.visibleMoves.map((move) => `${move.label} ${move.percent}% จาก ${move.total} ครั้ง`).join(" · ")}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function RankingRow({ row }: { row: ReturnType<typeof rankPlayers>[number] }) {
  return (
    <article className="ranking-row">
      <b>#{row.rank}</b>
      <span>{row.player.name}</span>
      <strong>{decimalScore(row.player.mainScoreUnits)}</strong>
      <small>รอง {decimalScore(row.player.sideScoreUnits)} · W-L {row.player.wins - row.player.losses}</small>
    </article>
  );
}

function SectionTitle({ icon, iconFolder = "icons", title, subtitle }: { icon: string; iconFolder?: string; title: string; subtitle: string }) {
  return (
    <div className="section-title">
      <img src={asset(`${iconFolder}/${icon}`)} alt="" />
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, disabled = false, onClick }: { icon: string; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button className="action-card" disabled={disabled} onClick={onClick}>
      <img src={asset(`icons/${icon}`)} alt="" />
      <b>{title}</b>
      <span>{disabled ? "ใช้สิทธิ์นี้แล้ว" : "แตะเพื่อทำรายการ"}</span>
    </button>
  );
}

function PlayerSelect({ players, value, onChange, label }: { players: Player[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">เลือกผู้เล่น</option>
        {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function unseenHistory(game: GameState, player: Player) {
  const items = game.history.filter((item) =>
    item.challengerId === player.id ||
    item.defenderId === player.id ||
    item.playerAId === player.id ||
    item.playerBId === player.id
  );
  if (!player.lastSeenHistoryId) return items;
  const index = items.findIndex((item) => item.id === player.lastSeenHistoryId);
  return index === -1 ? items : items.slice(0, index);
}

function HistoryLine({ item, playerId }: { item: GameState["history"][number]; playerId: string }) {
  const isChallenger = item.challengerId === playerId;
  const opponent = isChallenger ? item.defenderName : item.challengerName;
  const delta = isChallenger ? item.challengerDeltaUnits : item.defenderDeltaUnits;
  return (
    <article className="history-line">
      <b>{item.kind === "main" ? "ดวลหลัก" : "ดวลนอกรอบ"}</b>
      <span>{opponent ? `เจอกับ ${opponent}` : `${item.playerAName} กับ ${item.playerBName}`}</span>
      <strong>{formatDelta(delta)}</strong>
    </article>
  );
}

function rankOf(game: GameState, playerId: string) {
  return rankPlayers(game).find((row) => row.player.id === playerId)?.rank ?? null;
}

function outcomeLabel(outcome: string) {
  if (outcome === "win") return "ชนะ";
  if (outcome === "loss") return "แพ้";
  return "เสมอ";
}

function formatDelta(units: number) {
  return `${units >= 0 ? "+" : ""}${decimalScore(units)}`;
}

export default App;
