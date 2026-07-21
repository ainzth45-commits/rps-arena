import type {
  DuelHistory,
  GameSettings,
  GameState,
  MainDuelInput,
  Move,
  MoveCounts,
  OffRoundInput,
  Outcome,
  Player,
  RateSet,
  SeasonArchive,
} from "./types";

export const moves: Move[] = ["rock", "paper", "scissors"];

export const defaultSettings: GameSettings = {
  startingScoreUnits: 300,
  coinsPerRound: 3,
  mainPickSeconds: 30,
  offRoundPickSeconds: 10,
  streakBonusPercent: 10,
  huntedMinChallenges: 3,
  huntedWinRatePercent: 50,
  rates: {
    challengerChosen: { win: 40, draw: 10, loss: -30 },
    challengerRandom: { win: 50, draw: 10, loss: -20 },
    defender: { win: 30, draw: 10, loss: -20 },
    offRound: { win: 20, draw: 10, loss: -10 },
  },
};

export function createGame(settings: Partial<GameSettings> = {}): GameState {
  return {
    version: 3,
    seasonId: "SS1",
    players: {},
    history: [],
    settings: mergeSettings(defaultSettings, settings),
    activeRound: null,
    activeOffRound: null,
    privacyCurtain: null,
    archives: [],
  };
}

export function createPlayer(game: GameState, input: { id: string; name: string; avatarUrl?: string }): GameState {
  const id = input.id.trim();
  if (!id) throw new Error("ต้องมีรหัสผู้เล่น");
  if (game.players[id]?.active) throw new Error("รหัสนี้มีคนใช้แล้ว");
  const player: Player = {
    id,
    name: input.name.trim() || "ผู้เล่นใหม่",
    avatarUrl: input.avatarUrl ?? "./assets/icons/avatar-placeholder.webp",
    active: true,
    moveset: null,
    pointer: 0,
    mainScoreUnits: game.settings.startingScoreUnits,
    sideScore: 0,
    streak: 0,
    bestStreak: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    challengerEntries: 0,
    duelCount: 0,
    moveCounts: emptyMoveCounts(),
    lastSeenHistoryId: null,
  };
  return clone(game, { players: { ...game.players, [id]: player } });
}

export function updatePlayerProfile(game: GameState, id: string, name: string, avatarUrl: string): GameState {
  const player = requirePlayer(game, id);
  return updatePlayer(game, id, { ...player, name: name.trim() || player.name, avatarUrl });
}

export function deletePlayer(game: GameState, id: string): GameState {
  const guard = canDeletePlayer(game, id);
  if (!guard.ok) throw new Error(guard.reason);
  const players = { ...game.players };
  delete players[id];
  return clone(game, { players });
}

export function startRound(game: GameState, playerId: string, now: number): GameState {
  requirePlayer(game, playerId);
  if (game.activeRound) throw new Error("ยังมีรอบที่เปิดค้างอยู่");
  return clone(game, {
    activeRound: { playerId, openedAt: now, didMainDuel: false, didMovesetChange: false },
    privacyCurtain: null,
  });
}

export function closeRound(game: GameState, _now: number): GameState {
  if (!game.activeRound) return game;
  const player = game.players[game.activeRound.playerId];
  if (!player) return clone(game, { activeRound: null, privacyCurtain: null });
  return updatePlayer(clone(game, { activeRound: null, privacyCurtain: null }), player.id, {
    ...player,
    lastSeenHistoryId: game.history[0]?.id ?? player.lastSeenHistoryId,
  });
}

export function setMoveset(game: GameState, playerId: string, moveset: Move[]): GameState {
  assertMoveset(moveset);
  const player = requirePlayer(game, playerId);
  const firstSetup = player.moveset === null;
  let activeRound = game.activeRound;
  if (!firstSetup) {
    if (!activeRound || activeRound.playerId !== playerId) throw new Error("ต้องเปิดรอบของตัวเองก่อนปรับชุดมูฟ");
    if (activeRound.didMovesetChange) throw new Error("รอบนี้ปรับชุดมูฟไปแล้ว");
    activeRound = { ...activeRound, didMovesetChange: true };
  }
  const next = updatePlayer(game, playerId, {
    ...player,
    moveset: [moveset[0], moveset[1], moveset[2]],
    pointer: 0,
  });
  return clone(next, { activeRound, privacyCurtain: { reason: "moveset", playerId } });
}

export function clearPrivacyCurtain(game: GameState): GameState {
  return clone(game, { privacyCurtain: null });
}

export function challengeablePlayers(game: GameState, challengerId: string): Player[] {
  return Object.values(game.players)
    .filter((player) => player.active && player.id !== challengerId && player.moveset !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export function mainDuelBlockedReason(game: GameState, challengerId: string): string | null {
  if (!game.activeRound || game.activeRound.playerId !== challengerId) return "ต้องเปิดรอบก่อน";
  if (game.activeRound.didMainDuel) return "รอบนี้ดวลไปแล้ว";
  const challenger = game.players[challengerId];
  if (!challenger?.active) return "ไม่พบผู้เล่น";
  if (!challenger.moveset) return "ต้องตั้งชุดมูฟก่อนลงสังเวียน";
  if (challengeablePlayers(game, challengerId).length === 0) return "ยังไม่มีใครลงสังเวียนให้ท้า";
  return null;
}

export function commitMainDuel(game: GameState, input: MainDuelInput) {
  const blocked = mainDuelBlockedReason(game, input.challengerId);
  if (blocked) throw new Error(blocked);
  if (input.challengerId === input.defenderId) throw new Error("ห้ามดวลกับตัวเอง");
  const challenger = requirePlayer(game, input.challengerId);
  const defender = requirePlayer(game, input.defenderId, input.opponentMode === "random" ? "ยังไม่มีใครลงสังเวียนให้ท้า" : "ไม่พบคู่แข่ง");
  if (!defender.moveset) throw new Error("คนนี้ยังไม่ลงสังเวียน");

  const defenderMove = defender.moveset[defender.pointer] ?? defender.moveset[0];
  const challengerOutcome = decideOutcome(input.challengerMove, defenderMove);
  const defenderOutcome = invertOutcome(challengerOutcome);
  const nextStreak = challengerOutcome === "win" ? challenger.streak + 1 : 0;

  const challengerRate = input.opponentMode === "random" ? game.settings.rates.challengerRandom : game.settings.rates.challengerChosen;
  const rawChallengerDelta = challengerOutcome === "win"
    ? scoreWinWithStreak(challengerRate.win, nextStreak, game.settings.streakBonusPercent)
    : rateFor(challengerRate, challengerOutcome);
  const rawDefenderDelta = rateFor(game.settings.rates.defender, defenderOutcome);
  const challengerDelta = actualMainDelta(challenger.mainScoreUnits, rawChallengerDelta);
  const defenderDelta = actualMainDelta(defender.mainScoreUnits, rawDefenderDelta);

  const updatedChallenger = applyDuelPlayer(challenger, {
    outcome: challengerOutcome,
    move: input.challengerMove,
    deltaUnits: challengerDelta,
    streak: nextStreak,
    challengerEntry: true,
  });
  const updatedDefender = {
    ...applyDuelPlayer(defender, {
      outcome: defenderOutcome,
      move: defenderMove,
      deltaUnits: defenderDelta,
      streak: defender.streak,
      challengerEntry: false,
    }),
    pointer: (defender.pointer + 1) % 3,
  };

  const history: DuelHistory = {
    id: `main-${input.now}-${game.history.length + 1}`,
    kind: "main",
    challengerId: challenger.id,
    challengerName: challenger.name,
    defenderId: defender.id,
    defenderName: defender.name,
    challengerMove: input.challengerMove,
    defenderMove,
    challengerOutcome,
    challengerDeltaUnits: challengerDelta,
    defenderDeltaUnits: defenderDelta,
    createdAt: input.now,
  };

  const next = clone(game, {
    players: { ...game.players, [challenger.id]: updatedChallenger, [defender.id]: updatedDefender },
    history: [history, ...game.history],
    activeRound: game.activeRound ? { ...game.activeRound, didMainDuel: true } : game.activeRound,
    privacyCurtain: null,
  });

  return {
    game: next,
    result: {
      challengerOutcome,
      defenderOutcome,
      defenderMove,
      challengerDeltaUnits: challengerDelta,
      defenderDeltaUnits: defenderDelta,
      streakAfter: nextStreak,
    },
  };
}

export function commitOffRoundDuel(game: GameState, input: OffRoundInput) {
  const playerA = requirePlayer(game, input.playerAId);
  const playerB = requirePlayer(game, input.playerBId);
  if (playerA.id === playerB.id) throw new Error("ต้องเลือกผู้เล่น 2 คน");
  const outcomeA = decideOutcome(input.moveA, input.moveB);
  const outcomeB = invertOutcome(outcomeA);
  const rawA = rateFor(game.settings.rates.offRound, outcomeA);
  const rawB = rateFor(game.settings.rates.offRound, outcomeB);
  const mainDeltaA = actualMainDelta(playerA.mainScoreUnits, rawA);
  const mainDeltaB = actualMainDelta(playerB.mainScoreUnits, rawB);
  const sideDeltaA = actualSideDelta(playerA.sideScore, rawA / 10);
  const sideDeltaB = actualSideDelta(playerB.sideScore, rawB / 10);

  let nextA = playerA;
  let nextB = playerB;
  if (input.saveMode === "main") {
    nextA = applyOffRoundMain(playerA, outcomeA, input.moveA, mainDeltaA);
    nextB = applyOffRoundMain(playerB, outcomeB, input.moveB, mainDeltaB);
  }
  if (input.saveMode === "secondary") {
    nextA = { ...playerA, sideScore: playerA.sideScore + sideDeltaA };
    nextB = { ...playerB, sideScore: playerB.sideScore + sideDeltaB };
  }

  const kind = input.saveMode === "main" ? "offround-main" : input.saveMode === "secondary" ? "offround-secondary" : "offround-discard";
  const history: DuelHistory = {
    id: `${kind}-${input.now}-${game.history.length + 1}`,
    kind,
    playerAId: playerA.id,
    playerAName: playerA.name,
    playerBId: playerB.id,
    playerBName: playerB.name,
    moveA: input.moveA,
    moveB: input.moveB,
    outcomeA,
    challengerDeltaUnits: input.saveMode === "main" ? mainDeltaA : input.saveMode === "secondary" ? sideDeltaA : 0,
    defenderDeltaUnits: input.saveMode === "main" ? mainDeltaB : input.saveMode === "secondary" ? sideDeltaB : 0,
    createdAt: input.now,
  };

  return {
    game: clone(game, {
      players: { ...game.players, [playerA.id]: nextA, [playerB.id]: nextB },
      history: input.saveMode === "discard" ? game.history : [history, ...game.history],
      activeOffRound: null,
      privacyCurtain: null,
    }),
    result: { outcomeA, outcomeB, deltaA: history.challengerDeltaUnits, deltaB: history.defenderDeltaUnits },
  };
}

export function canDeletePlayer(game: GameState, playerId: string): { ok: true } | { ok: false; reason: string } {
  if (game.activeRound?.playerId === playerId) return { ok: false, reason: "ผู้เล่นนี้อยู่ในรอบที่เปิดค้างอยู่" };
  if (game.activeOffRound && game.activeOffRound.step !== "result") {
    if (game.activeOffRound.playerAId === playerId || game.activeOffRound.playerBId === playerId) {
      return { ok: false, reason: "ผู้เล่นนี้อยู่ในดวลนอกรอบที่ยังไม่จบ" };
    }
  }
  return { ok: true };
}

export interface RankedPlayer {
  player: Player;
  rank: number;
  unrankedCount: number;
  winMinusLoss: number;
}

export function rankPlayers(game: GameState): RankedPlayer[] {
  const players = Object.values(game.players).filter((player) => player.active);
  const unrankedCount = players.filter((player) => player.duelCount === 0).length;
  const competed = players.filter((player) => player.duelCount > 0).sort(comparePlayers);
  let previous: Player | null = null;
  let rank = 0;
  return competed.map((player, index) => {
    if (!previous || compareTieFields(player, previous) !== 0) rank = index + 1;
    previous = player;
    return { player, rank, unrankedCount, winMinusLoss: player.wins - player.losses };
  });
}

export interface MoveRate {
  move: Move;
  label: string;
  count: number;
  total: number;
  percent: number;
}

export function moveStats(counts: MoveCounts): MoveRate[] {
  const total = moves.reduce((sum, move) => sum + counts[move], 0);
  return moves
    .map((move) => ({ move, label: moveLabel(move), count: counts[move], total, percent: total === 0 ? 0 : Math.round((counts[move] / total) * 100) }))
    .sort((a, b) => b.count - a.count || moves.indexOf(a.move) - moves.indexOf(b.move));
}

export function championTax(game: GameState) {
  return rankPlayers(game)
    .filter((row) => row.rank <= 3)
    .map((row) => {
      const stats = moveStats(row.player.moveCounts).filter((stat) => stat.total > 0);
      const visibleMoves = row.rank === 1 || stats.length === 0 ? stats : stats.filter((stat) => stat.count === stats[0].count);
      return { player: row.player, rank: row.rank, visibleMoves };
    });
}

export interface HuntedWarning {
  challengerId: string;
  challengerName: string;
  challengeCount: number;
  winCount: number;
  winRatePercent: number;
}

export function huntedWarnings(game: GameState, defenderId: string, historyItems: DuelHistory[] = game.history): HuntedWarning[] {
  const byChallenger = new Map<string, HuntedWarning>();
  for (const item of historyItems) {
    if (item.kind !== "main" || item.defenderId !== defenderId || !item.challengerId || !item.challengerName) continue;
    const current = byChallenger.get(item.challengerId) ?? {
      challengerId: item.challengerId,
      challengerName: item.challengerName,
      challengeCount: 0,
      winCount: 0,
      winRatePercent: 0,
    };
    const challengeCount = current.challengeCount + 1;
    const winCount = current.winCount + (item.challengerOutcome === "win" ? 1 : 0);
    byChallenger.set(item.challengerId, {
      ...current,
      challengerName: item.challengerName,
      challengeCount,
      winCount,
      winRatePercent: Math.round((winCount / challengeCount) * 100),
    });
  }
  return [...byChallenger.values()]
    .filter((row) => row.challengeCount >= game.settings.huntedMinChallenges && row.winRatePercent > game.settings.huntedWinRatePercent)
    .sort((a, b) => b.challengeCount - a.challengeCount || b.winRatePercent - a.winRatePercent);
}

export function awayEntries(game: GameState, playerId: string): DuelHistory[] {
  const player = game.players[playerId];
  const lastSeenId = player?.lastSeenHistoryId;
  const endIndex = lastSeenId ? game.history.findIndex((item) => item.id === lastSeenId) : -1;
  const recent = endIndex >= 0 ? game.history.slice(0, endIndex) : game.history;
  return recent.filter((item) => item.kind === "main" && item.defenderId === playerId);
}

export function finishSeason(game: GameState, now: number): GameState {
  const ranking = rankPlayers(game);
  const archive: SeasonArchive = {
    seasonId: game.seasonId,
    finishedAt: now,
    championName: ranking[0]?.player.name ?? null,
    ranking: ranking.map((row) => ({ rank: row.rank, playerName: row.player.name, mainScoreUnits: row.player.mainScoreUnits, sideScore: row.player.sideScore })),
    revealedMovesets: Object.values(game.players).map((player) => ({ playerName: player.name, moveset: player.moveset })),
  };
  const nextNumber = game.archives.length + 2;
  const players = Object.fromEntries(
    Object.values(game.players).map((player) => [
      player.id,
      {
        ...player,
        moveset: null,
        pointer: 0,
        mainScoreUnits: game.settings.startingScoreUnits,
        sideScore: 0,
        streak: 0,
        bestStreak: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        challengerEntries: 0,
        duelCount: 0,
        moveCounts: emptyMoveCounts(),
        lastSeenHistoryId: null,
      },
    ]),
  );
  return clone(game, { seasonId: `SS${nextNumber}`, players, history: [], activeRound: null, activeOffRound: null, privacyCurtain: null, archives: [archive, ...game.archives] });
}

export function updateSettings(game: GameState, patch: Partial<GameSettings>): GameState {
  return clone(game, { settings: sanitizeSettings(mergeSettings(game.settings, patch), game.settings) });
}

export function decideOutcome(left: Move, right: Move): Outcome {
  if (left === right) return "draw";
  if ((left === "rock" && right === "scissors") || (left === "scissors" && right === "paper") || (left === "paper" && right === "rock")) return "win";
  return "loss";
}

export function moveLabel(move: Move): string {
  return move === "rock" ? "ค้อน" : move === "paper" ? "กระดาษ" : "กรรไกร";
}

export function formatScore(units: number): string {
  return (units / 10).toFixed(1);
}

export function formatDelta(units: number): string {
  if (units === 0) return "0.0";
  return `${units > 0 ? "+" : ""}${formatScore(units)}`;
}

function applyDuelPlayer(player: Player, update: { outcome: Outcome; move: Move; deltaUnits: number; streak: number; challengerEntry: boolean }): Player {
  return {
    ...player,
    mainScoreUnits: Math.max(0, player.mainScoreUnits + update.deltaUnits),
    streak: update.streak,
    bestStreak: Math.max(player.bestStreak, update.streak),
    wins: player.wins + (update.outcome === "win" ? 1 : 0),
    losses: player.losses + (update.outcome === "loss" ? 1 : 0),
    draws: player.draws + (update.outcome === "draw" ? 1 : 0),
    challengerEntries: player.challengerEntries + (update.challengerEntry ? 1 : 0),
    duelCount: player.duelCount + 1,
    moveCounts: incrementMove(player.moveCounts, update.move),
  };
}

function applyOffRoundMain(player: Player, outcome: Outcome, move: Move, deltaUnits: number): Player {
  return {
    ...player,
    mainScoreUnits: Math.max(0, player.mainScoreUnits + deltaUnits),
    wins: player.wins + (outcome === "win" ? 1 : 0),
    losses: player.losses + (outcome === "loss" ? 1 : 0),
    draws: player.draws + (outcome === "draw" ? 1 : 0),
    duelCount: player.duelCount + 1,
    moveCounts: incrementMove(player.moveCounts, move),
  };
}

function comparePlayers(a: Player, b: Player): number {
  return compareTieFields(a, b) || a.name.localeCompare(b.name, "th");
}

function compareTieFields(a: Player, b: Player): number {
  return b.mainScoreUnits - a.mainScoreUnits || b.sideScore - a.sideScore || (b.wins - b.losses) - (a.wins - a.losses) || b.challengerEntries - a.challengerEntries;
}

function rateFor(rates: RateSet, outcome: Outcome): number {
  return rates[outcome];
}

function invertOutcome(outcome: Outcome): Outcome {
  if (outcome === "win") return "loss";
  if (outcome === "loss") return "win";
  return "draw";
}

function scoreWinWithStreak(baseUnits: number, streak: number, bonusPercent: number): number {
  return Math.round((baseUnits * (100 + (streak - 1) * bonusPercent)) / 100);
}

function actualMainDelta(currentUnits: number, rawDeltaUnits: number): number {
  return Math.max(0, currentUnits + rawDeltaUnits) - currentUnits;
}

function actualSideDelta(currentPoints: number, rawDeltaPoints: number): number {
  return Math.max(0, currentPoints + rawDeltaPoints) - currentPoints;
}

function assertMoveset(moveset: Move[]): asserts moveset is [Move, Move, Move] {
  if (moveset.length !== 3 || moveset.some((move) => !moves.includes(move))) throw new Error("ชุดมูฟต้องมี 3 ช่อง");
}

function requirePlayer(game: GameState, playerId: string, message = "ไม่พบผู้เล่น"): Player {
  const player = game.players[playerId];
  if (!player?.active) throw new Error(message);
  return player;
}

function updatePlayer(game: GameState, playerId: string, player: Player): GameState {
  return clone(game, { players: { ...game.players, [playerId]: player } });
}

function incrementMove(counts: MoveCounts, move: Move): MoveCounts {
  return { ...counts, [move]: counts[move] + 1 };
}

function emptyMoveCounts(): MoveCounts {
  return { rock: 0, paper: 0, scissors: 0 };
}

function mergeSettings(base: GameSettings, patch: Partial<GameSettings>): GameSettings {
  return sanitizeSettings({
    ...base,
    ...patch,
    rates: {
      ...base.rates,
      ...patch.rates,
      challengerChosen: { ...base.rates.challengerChosen, ...patch.rates?.challengerChosen },
      challengerRandom: { ...base.rates.challengerRandom, ...patch.rates?.challengerRandom },
      defender: { ...base.rates.defender, ...patch.rates?.defender },
      offRound: { ...base.rates.offRound, ...patch.rates?.offRound },
    },
  }, base);
}

function sanitizeSettings(settings: GameSettings, fallback: GameSettings): GameSettings {
  const clamp = (value: number, min: number, max: number, fallbackValue: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallbackValue);
  const rate = (rates: RateSet, old: RateSet): RateSet => ({
    win: clamp(rates.win, -200, 200, old.win),
    draw: clamp(rates.draw, -200, 200, old.draw),
    loss: clamp(rates.loss, -200, 200, old.loss),
  });
  return {
    startingScoreUnits: clamp(settings.startingScoreUnits, 0, 9990, fallback.startingScoreUnits),
    coinsPerRound: clamp(settings.coinsPerRound, 0, 99, fallback.coinsPerRound),
    mainPickSeconds: clamp(settings.mainPickSeconds, 5, 180, fallback.mainPickSeconds),
    offRoundPickSeconds: clamp(settings.offRoundPickSeconds, 3, 60, fallback.offRoundPickSeconds),
    streakBonusPercent: clamp(settings.streakBonusPercent, 0, 100, fallback.streakBonusPercent),
    huntedMinChallenges: clamp(settings.huntedMinChallenges, 2, 20, fallback.huntedMinChallenges),
    huntedWinRatePercent: clamp(settings.huntedWinRatePercent, 0, 100, fallback.huntedWinRatePercent),
    rates: {
      challengerChosen: rate(settings.rates.challengerChosen, fallback.rates.challengerChosen),
      challengerRandom: rate(settings.rates.challengerRandom, fallback.rates.challengerRandom),
      defender: rate(settings.rates.defender, fallback.rates.defender),
      offRound: rate(settings.rates.offRound, fallback.rates.offRound),
    },
  };
}

function clone(game: GameState, patch: Partial<GameState>): GameState {
  return { ...game, ...patch };
}
