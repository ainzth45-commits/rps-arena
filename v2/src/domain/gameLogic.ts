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
  RateSet
} from "./types";

const moves: Move[] = ["rock", "paper", "scissors"];

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
    offRound: { win: 20, draw: 10, loss: -10 }
  }
};

export function createInitialGame(settings: Partial<GameSettings> = {}): GameState {
  return {
    seasonId: "SS1",
    players: {},
    history: [],
    settings: { ...defaultSettings, ...settings, rates: { ...defaultSettings.rates, ...settings.rates } },
    activeRound: null,
    activeOffRound: null,
    archives: []
  };
}

export function createPlayer(game: GameState, id: string, name: string, avatarUrl = "/assets/icons/avatar-placeholder.webp"): GameState {
  const player: Player = {
    id,
    name: name.trim() || "ผู้เล่นใหม่",
    avatarUrl,
    active: true,
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
    moveCounts: emptyMoveCounts(),
    lastSeenHistoryId: null
  };
  return cloneGame(game, { players: { ...game.players, [id]: player } });
}

export function setMoveset(game: GameState, playerId: string, moveset: Move[]): GameState {
  assertMoveset(moveset);
  const player = requirePlayer(game, playerId);
  return updatePlayer(game, playerId, { ...player, moveset: [...moveset], pointer: 0 });
}

export function eligibleOpponents(game: GameState, challengerId: string): Player[] {
  return Object.values(game.players)
    .filter((player) => player.id !== challengerId && player.active && player.moveset?.length === 3)
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export function startMainDuel(game: GameState, input: MainDuelInput) {
  const challenger = requirePlayer(game, input.challengerId);
  const defender = requirePlayer(game, input.defenderId, input.opponentMode === "random" ? "ยังไม่มีคู่แข่งที่ตั้งชุดมูฟแล้ว" : undefined);
  if (!challenger.moveset) throw new Error("ผู้ท้าต้องตั้งชุดมูฟก่อน");
  if (!defender.moveset) throw new Error("ยังไม่มีคู่แข่งที่ตั้งชุดมูฟแล้ว");
  if (challenger.id === defender.id) throw new Error("ห้ามดวลกับตัวเอง");

  const defenderMove = defender.moveset[defender.pointer] ?? defender.moveset[0];
  const challengerOutcome = decideOutcome(input.challengerMove, defenderMove);
  const defenderOutcome = invertOutcome(challengerOutcome);

  const nextStreak = challengerOutcome === "win" ? challenger.streak + 1 : 0;
  const challengerRates = input.opponentMode === "random" ? game.settings.rates.challengerRandom : game.settings.rates.challengerChosen;
  const challengerRawDeltaUnits = challengerOutcome === "win"
    ? scoreWinWithStreak(challengerRates.win, nextStreak, game.settings.streakBonusPercent)
    : rateFor(challengerRates, challengerOutcome);
  const defenderRawDeltaUnits = rateFor(game.settings.rates.defender, defenderOutcome);
  const challengerDeltaUnits = actualDelta(challenger.mainScoreUnits, challengerRawDeltaUnits);
  const defenderDeltaUnits = actualDelta(defender.mainScoreUnits, defenderRawDeltaUnits);

  let next = game;
  next = updatePlayer(next, challenger.id, applyMainDuelPlayer(challenger, {
    outcome: challengerOutcome,
    move: input.challengerMove,
    deltaUnits: challengerRawDeltaUnits,
    streak: nextStreak,
    challengerEntry: true
  }));
  const freshDefender = next.players[defender.id];
  next = updatePlayer(next, defender.id, {
    ...applyMainDuelPlayer(freshDefender, {
      outcome: defenderOutcome,
      move: defenderMove,
      deltaUnits: defenderRawDeltaUnits,
      streak: freshDefender.streak,
      challengerEntry: false
    }),
    pointer: (freshDefender.pointer + 1) % 3
  });

  const history: DuelHistory = {
    id: `main-${input.now}-${next.history.length + 1}`,
    kind: "main",
    challengerId: challenger.id,
    challengerName: challenger.name,
    defenderId: defender.id,
    defenderName: defender.name,
    challengerMove: input.challengerMove,
    defenderMove,
    challengerOutcome,
    challengerDeltaUnits,
    defenderDeltaUnits,
    createdAt: input.now
  };

  next = cloneGame(next, {
    history: [history, ...next.history],
    activeRound: next.activeRound?.playerId === challenger.id
      ? { ...next.activeRound, didMainDuel: true }
      : next.activeRound
  });

  return {
    game: next,
    result: { challengerOutcome, defenderOutcome, defenderMove, challengerDeltaUnits, defenderDeltaUnits }
  };
}

export function commitOffRoundDuel(game: GameState, input: OffRoundInput) {
  const playerA = requirePlayer(game, input.playerAId);
  const playerB = requirePlayer(game, input.playerBId);
  if (playerA.id === playerB.id) throw new Error("ต้องเลือกผู้เล่น 2 คน");

  const outcomeA = decideOutcome(input.moveA, input.moveB);
  const outcomeB = invertOutcome(outcomeA);
  const rawDeltaA = rateFor(game.settings.rates.offRound, outcomeA);
  const rawDeltaB = rateFor(game.settings.rates.offRound, outcomeB);
  const deltaA = actualDelta(playerA.mainScoreUnits, rawDeltaA);
  const deltaB = actualDelta(playerB.mainScoreUnits, rawDeltaB);

  let next = game;
  if (input.saveMode === "main") {
    next = updatePlayer(next, playerA.id, applyOffRoundMain(playerA, outcomeA, input.moveA, rawDeltaA));
    next = updatePlayer(next, playerB.id, applyOffRoundMain(next.players[playerB.id], outcomeB, input.moveB, rawDeltaB));
  }
  if (input.saveMode === "secondary") {
    next = updatePlayer(next, playerA.id, { ...playerA, sideScoreUnits: Math.max(0, playerA.sideScoreUnits + rawDeltaA) });
    next = updatePlayer(next, playerB.id, { ...next.players[playerB.id], sideScoreUnits: Math.max(0, next.players[playerB.id].sideScoreUnits + rawDeltaB) });
  }

  const kind = input.saveMode === "main" ? "offround-main" : input.saveMode === "secondary" ? "offround-secondary" : "offround-discard";
  const history: DuelHistory = {
    id: `${kind}-${input.now}-${next.history.length + 1}`,
    kind,
    playerAId: playerA.id,
    playerAName: playerA.name,
    playerBId: playerB.id,
    playerBName: playerB.name,
    moveA: input.moveA,
    moveB: input.moveB,
    outcomeA,
    challengerDeltaUnits: input.saveMode === "discard" ? 0 : deltaA,
    defenderDeltaUnits: input.saveMode === "discard" ? 0 : deltaB,
    createdAt: input.now
  };

  return {
    game: cloneGame(next, { history: [history, ...next.history], activeOffRound: null }),
    result: { outcomeA, outcomeB, deltaA, deltaB }
  };
}

export function rankPlayers(game: GameState) {
  const unrankedCount = Object.values(game.players).filter((player) => player.active && player.duelCount === 0).length;
  const competed = Object.values(game.players)
    .filter((player) => player.active && player.duelCount > 0)
    .sort(comparePlayers);

  let previous: Player | null = null;
  let rank = 0;
  return competed.map((player, index) => {
    if (!previous || compareTieFields(player, previous) !== 0) {
      rank = index + 1;
    }
    previous = player;
    return { player, rank, unrankedCount };
  });
}

export function championTax(game: GameState) {
  return rankPlayers(game)
    .filter((row) => row.rank <= 3)
    .map((row) => {
      const stats = moveStats(row.player.moveCounts);
      const visibleMoves = row.rank === 1
        ? stats
        : stats.filter((stat) => stat.count === Math.max(...stats.map((item) => item.count)));
      return { player: row.player, rank: row.rank, visibleMoves };
    });
}

export function canDeletePlayer(game: GameState, playerId: string): { ok: true } | { ok: false; reason: string } {
  if (game.activeRound?.playerId === playerId) {
    return { ok: false, reason: "ผู้เล่นนี้อยู่ในรอบที่เปิดค้างอยู่" };
  }
  if (game.activeOffRound && game.activeOffRound.step !== "result") {
    if (game.activeOffRound.playerAId === playerId || game.activeOffRound.playerBId === playerId) {
      return { ok: false, reason: "ผู้เล่นนี้อยู่ในดวลนอกรอบที่ยังไม่จบ" };
    }
  }
  return { ok: true };
}

export function decimalScore(units: number): string {
  return (units / 10).toFixed(1);
}

export function decideOutcome(left: Move, right: Move): Outcome {
  if (left === right) return "draw";
  if (
    (left === "rock" && right === "scissors") ||
    (left === "scissors" && right === "paper") ||
    (left === "paper" && right === "rock")
  ) {
    return "win";
  }
  return "loss";
}

export function moveLabel(move: Move): string {
  return move === "rock" ? "ค้อน" : move === "paper" ? "กระดาษ" : "กรรไกร";
}

function comparePlayers(a: Player, b: Player): number {
  return compareTieFields(a, b) || a.name.localeCompare(b.name, "th");
}

function compareTieFields(a: Player, b: Player): number {
  return b.mainScoreUnits - a.mainScoreUnits ||
    b.sideScoreUnits - a.sideScoreUnits ||
    (b.wins - b.losses) - (a.wins - a.losses) ||
    b.challengerEntries - a.challengerEntries;
}

function moveStats(counts: MoveCounts) {
  const total = moves.reduce((sum, move) => sum + counts[move], 0);
  return moves.map((move) => ({
    move,
    label: moveLabel(move),
    count: counts[move],
    total,
    percent: total === 0 ? 0 : Math.round((counts[move] / total) * 100)
  }));
}

function applyMainDuelPlayer(player: Player, update: {
  outcome: Outcome;
  move: Move;
  deltaUnits: number;
  streak: number;
  challengerEntry: boolean;
}): Player {
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
    moveCounts: incrementMove(player.moveCounts, update.move)
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
    moveCounts: incrementMove(player.moveCounts, move)
  };
}

function scoreWinWithStreak(baseUnits: number, streak: number, bonusPercent: number): number {
  return Math.round(baseUnits * (100 + (streak - 1) * bonusPercent) / 100);
}

function actualDelta(currentUnits: number, rawDeltaUnits: number): number {
  return Math.max(0, currentUnits + rawDeltaUnits) - currentUnits;
}

function rateFor(rates: RateSet, outcome: Outcome): number {
  return rates[outcome];
}

function invertOutcome(outcome: Outcome): Outcome {
  if (outcome === "win") return "loss";
  if (outcome === "loss") return "win";
  return "draw";
}

function incrementMove(counts: MoveCounts, move: Move): MoveCounts {
  return { ...counts, [move]: counts[move] + 1 };
}

function emptyMoveCounts(): MoveCounts {
  return { rock: 0, paper: 0, scissors: 0 };
}

function assertMoveset(moveset: Move[]): void {
  if (moveset.length !== 3 || moveset.some((move) => !moves.includes(move))) {
    throw new Error("ชุดมูฟต้องมี 3 ช่อง");
  }
}

function requirePlayer(game: GameState, playerId: string, fallbackMessage = "ไม่พบผู้เล่น"): Player {
  const player = game.players[playerId];
  if (!player || !player.active) throw new Error(fallbackMessage);
  return player;
}

function updatePlayer(game: GameState, playerId: string, player: Player): GameState {
  return cloneGame(game, { players: { ...game.players, [playerId]: player } });
}

function cloneGame(game: GameState, patch: Partial<GameState>): GameState {
  return { ...game, ...patch };
}
