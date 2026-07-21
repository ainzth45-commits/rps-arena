import { describe, expect, it } from "vitest";
import {
  canDeletePlayer,
  calculateHuntedWarnings,
  championTax,
  commitOffRoundDuel,
  createInitialGame,
  createPlayer,
  decimalScore,
  eligibleOpponents,
  rankPlayers,
  setMoveset,
  startMainDuel
} from "../domain/gameLogic";
import type { Move } from "../domain/types";

const trio: Move[] = ["rock", "paper", "scissors"];

describe("main duel scoring", () => {
  it("stores scores as integer tenths and applies the 9-step order including streak before win multiplier", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ผู้เล่นหนึ่ง");
    game = createPlayer(game, "p2", "ผู้เล่นสอง");
    game = setMoveset(game, "p1", ["rock", "rock", "rock"]);
    game = setMoveset(game, "p2", ["scissors", "paper", "rock"]);

    const first = startMainDuel(game, {
      challengerId: "p1",
      defenderId: "p2",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 1
    });

    expect(first.result.challengerOutcome).toBe("win");
    expect(first.result.challengerDeltaUnits).toBe(40);
    expect(first.game.players.p1.streak).toBe(1);
    expect(first.game.players.p2.pointer).toBe(1);

    const second = startMainDuel(first.game, {
      challengerId: "p1",
      defenderId: "p2",
      challengerMove: "scissors",
      opponentMode: "chosen",
      now: 2
    });

    expect(second.result.defenderMove).toBe("paper");
    expect(second.result.challengerDeltaUnits).toBe(44);
    expect(second.game.players.p1.mainScoreUnits).toBe(384);
    expect(decimalScore(second.game.players.p1.mainScoreUnits)).toBe("38.4");
    expect(second.game.players.p1.bestStreak).toBe(2);
    expect(second.game.players.p2.pointer).toBe(2);
    expect(second.game.players.p1.moveCounts.rock).toBe(1);
    expect(second.game.players.p2.moveCounts.paper).toBe(1);
    expect(second.game.history).toHaveLength(2);
  });

  it("resets challenger streak on draw or loss and clamps score at zero while recording the loss", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ผู้เล่นหนึ่ง");
    game = createPlayer(game, "p2", "ผู้เล่นสอง");
    game = setMoveset(game, "p1", trio);
    game = setMoveset(game, "p2", ["rock", "paper", "scissors"]);
    game.players.p1.mainScoreUnits = 10;
    game.players.p1.streak = 5;

    const next = startMainDuel(game, {
      challengerId: "p1",
      defenderId: "p2",
      challengerMove: "scissors",
      opponentMode: "chosen",
      now: 3
    });

    expect(next.result.challengerOutcome).toBe("loss");
    expect(next.result.challengerDeltaUnits).toBe(-10);
    expect(next.game.players.p1.mainScoreUnits).toBe(0);
    expect(next.game.players.p1.streak).toBe(0);
    expect(next.game.players.p1.losses).toBe(1);
    expect(next.game.players.p2.wins).toBe(1);
  });

  it("rejects random opponent selection when no eligible opponent has a season moveset", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ผู้เล่นหนึ่ง");
    game = setMoveset(game, "p1", trio);

    expect(eligibleOpponents(game, "p1")).toEqual([]);
    expect(() =>
      startMainDuel(game, {
        challengerId: "p1",
        defenderId: "missing",
        challengerMove: "rock",
        opponentMode: "random",
        now: 4
      })
    ).toThrow("ยังไม่มีคู่แข่งที่ตั้งชุดมูฟแล้ว");
  });
});

describe("moveset pointer and off-round rules", () => {
  it("resets the personal pointer when a player confirms a new moveset", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ผู้เล่นหนึ่ง");
    game = setMoveset(game, "p1", ["rock", "paper", "scissors"]);
    game.players.p1.pointer = 2;

    const next = setMoveset(game, "p1", ["paper", "paper", "rock"]);

    expect(next.players.p1.pointer).toBe(0);
    expect(next.players.p1.moveset).toEqual(["paper", "paper", "rock"]);
  });

  it("off-round main score uses light rates but does not touch streak, pointers, or challenger entries", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ผู้เล่นหนึ่ง");
    game = createPlayer(game, "p2", "ผู้เล่นสอง");
    game = setMoveset(game, "p1", ["rock", "paper", "scissors"]);
    game = setMoveset(game, "p2", ["scissors", "paper", "rock"]);
    game.players.p1.streak = 4;
    game.players.p1.pointer = 2;

    const next = commitOffRoundDuel(game, {
      playerAId: "p1",
      playerBId: "p2",
      moveA: "rock",
      moveB: "scissors",
      saveMode: "main",
      now: 5
    });

    expect(next.result.outcomeA).toBe("win");
    expect(next.game.players.p1.mainScoreUnits).toBe(320);
    expect(next.game.players.p2.mainScoreUnits).toBe(290);
    expect(next.game.players.p1.streak).toBe(4);
    expect(next.game.players.p1.pointer).toBe(2);
    expect(next.game.players.p1.challengerEntries).toBe(0);
  });

  it("off-round secondary score never changes main score, win/loss stats, moves, streak, or pointers", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ผู้เล่นหนึ่ง");
    game = createPlayer(game, "p2", "ผู้เล่นสอง");

    const next = commitOffRoundDuel(game, {
      playerAId: "p1",
      playerBId: "p2",
      moveA: "paper",
      moveB: "rock",
      saveMode: "secondary",
      now: 6
    });

    expect(next.game.players.p1.sideScoreUnits).toBe(2);
    expect(next.game.players.p2.sideScoreUnits).toBe(0);
    expect(next.game.history[0].challengerDeltaUnits).toBe(2);
    expect(next.game.players.p1.mainScoreUnits).toBe(300);
    expect(next.game.players.p1.wins).toBe(0);
    expect(next.game.players.p1.moveCounts.paper).toBe(0);
  });
});

describe("ranking and champion tax", () => {
  it("ranks by the four required tie-breakers and uses shared sports ranks", () => {
    let game = createInitialGame();
    for (const id of ["a", "b", "c", "d"]) {
      game = createPlayer(game, id, `ผู้เล่น ${id}`);
      game.players[id].duelCount = 1;
    }
    game.players.a.mainScoreUnits = 310;
    game.players.b.mainScoreUnits = 310;
    game.players.c.mainScoreUnits = 310;
    game.players.d.mainScoreUnits = 250;
    game.players.b.sideScoreUnits = 10;
    game.players.c.sideScoreUnits = 10;
    game.players.b.wins = 4;
    game.players.b.losses = 1;
    game.players.c.wins = 4;
    game.players.c.losses = 1;
    game.players.b.challengerEntries = 2;
    game.players.c.challengerEntries = 2;

    const ranked = rankPlayers(game);

    expect(ranked.map((row) => [row.player.id, row.rank])).toEqual([
      ["b", 1],
      ["c", 1],
      ["a", 3],
      ["d", 4]
    ]);
  });

  it("keeps never-competed registered players outside the ranking table", () => {
    let game = createInitialGame();
    game = createPlayer(game, "a", "ผู้เล่น a");
    game = createPlayer(game, "b", "ผู้เล่น b");
    game.players.a.duelCount = 1;

    const ranked = rankPlayers(game);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].unrankedCount).toBe(1);
  });

  it("reveals all move stats for rank 1 and only tied top moves for ranks 2 and 3", () => {
    let game = createInitialGame();
    for (const id of ["a", "b", "c"]) {
      game = createPlayer(game, id, `ผู้เล่น ${id}`);
      game.players[id].duelCount = 1;
      game.players[id].mainScoreUnits = id === "a" ? 400 : id === "b" ? 390 : 380;
    }
    game.players.a.moveCounts = { rock: 4, paper: 3, scissors: 3 };
    game.players.b.moveCounts = { rock: 5, paper: 5, scissors: 1 };
    game.players.c.moveCounts = { rock: 0, paper: 2, scissors: 9 };

    const tax = championTax(game);

    expect(tax[0].visibleMoves.map((move) => move.move)).toEqual(["rock", "paper", "scissors"]);
    expect(tax[1].visibleMoves.map((move) => move.move)).toEqual(["rock", "paper"]);
    expect(tax[1].visibleMoves[0].total).toBe(11);
  });

  it("does not reveal rank 2 or 3 moves when they have no move history yet", () => {
    let game = createInitialGame();
    for (const id of ["a", "b", "c"]) {
      game = createPlayer(game, id, `ผู้เล่น ${id}`);
      game.players[id].duelCount = 1;
      game.players[id].mainScoreUnits = id === "a" ? 400 : id === "b" ? 390 : 380;
    }
    game.players.a.moveCounts = { rock: 1, paper: 0, scissors: 0 };

    const tax = championTax(game);

    expect(tax[1].visibleMoves).toEqual([]);
    expect(tax[2].visibleMoves).toEqual([]);
  });
});

describe("hunted warning", () => {
  it("warns when one challenger hunted the returning player at least the configured count and won over the configured rate", () => {
    let game = createInitialGame({ huntedMinChallenges: 3, huntedWinRatePercent: 50 });
    game = createPlayer(game, "target", "คนโดนล่า");
    game = createPlayer(game, "hunter", "นักล่า");
    game = createPlayer(game, "other", "คนอื่น");
    game = setMoveset(game, "target", ["scissors", "scissors", "rock"]);
    game = setMoveset(game, "hunter", trio);
    game = setMoveset(game, "other", trio);

    game = startMainDuel(game, {
      challengerId: "hunter",
      defenderId: "target",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 20
    }).game;
    game = startMainDuel(game, {
      challengerId: "hunter",
      defenderId: "target",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 21
    }).game;
    game = startMainDuel(game, {
      challengerId: "hunter",
      defenderId: "target",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 22
    }).game;
    game = startMainDuel(game, {
      challengerId: "other",
      defenderId: "target",
      challengerMove: "paper",
      opponentMode: "chosen",
      now: 23
    }).game;

    const warnings = calculateHuntedWarnings(game, "target", game.history);

    expect(warnings).toEqual([
      { challengerId: "hunter", challengerName: "นักล่า", challengeCount: 3, winCount: 2, winRatePercent: 67 }
    ]);
  });
});

describe("player deletion guard", () => {
  it("blocks deleting players in an active round or unfinished off-round duel but preserves history names after later deletion", () => {
    let game = createInitialGame();
    game = createPlayer(game, "p1", "ชื่อเดิม");
    game = createPlayer(game, "p2", "คู่แข่ง");
    game = setMoveset(game, "p1", trio);
    game = setMoveset(game, "p2", trio);
    game.activeRound = { playerId: "p1", openedAt: 10, didMainDuel: false, didMovesetChange: false };

    expect(canDeletePlayer(game, "p1").ok).toBe(false);
    expect(canDeletePlayer(game, "p2").ok).toBe(true);

    game.activeRound = null;
    const duel = startMainDuel(game, {
      challengerId: "p1",
      defenderId: "p2",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 11
    }).game;
    delete duel.players.p2;

    expect(duel.history[0].defenderName).toBe("คู่แข่ง");
  });
});
