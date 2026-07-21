import { describe, expect, it } from "vitest";
import {
  canDeletePlayer,
  challengeablePlayers,
  championTax,
  closeRound,
  commitMainDuel,
  commitOffRoundDuel,
  createGame,
  createPlayer,
  formatScore,
  huntedWarnings,
  rankPlayers,
  setMoveset,
  startRound,
} from "../domain/game";
import type { Move } from "../domain/types";

const set: [Move, Move, Move] = ["rock", "paper", "scissors"];

function withPlayer(game = createGame(), id: string, name = id) {
  return createPlayer(game, { id, name, avatarUrl: "" });
}

describe("main duel scoring and pointer", () => {
  it("uses integer tenths and the required 9-step order: outcome, streak, scores, stats, pointer, history", () => {
    let game = withPlayer(withPlayer(createGame(), "a", "ผู้เล่นหนึ่ง"), "b", "ผู้เล่นสอง");
    game = setMoveset(game, "a", ["rock", "rock", "rock"]);
    game = setMoveset(game, "b", ["scissors", "paper", "rock"]);
    game = startRound(game, "a", 100);

    const first = commitMainDuel(game, {
      challengerId: "a",
      defenderId: "b",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 101,
    });

    expect(first.result.challengerOutcome).toBe("win");
    expect(first.result.defenderMove).toBe("scissors");
    expect(first.result.challengerDeltaUnits).toBe(40);
    expect(first.game.players.a.streak).toBe(1);
    expect(first.game.players.b.pointer).toBe(1);
    expect(first.game.players.a.mainScoreUnits).toBe(340);
    expect(first.game.players.b.mainScoreUnits).toBe(280);
    expect(first.game.history[0].challengerName).toBe("ผู้เล่นหนึ่ง");

    const reopened = startRound(closeRound(first.game, 102), "a", 103);
    const second = commitMainDuel(reopened, {
      challengerId: "a",
      defenderId: "b",
      challengerMove: "scissors",
      opponentMode: "chosen",
      now: 104,
    });

    expect(second.result.defenderMove).toBe("paper");
    expect(second.result.challengerDeltaUnits).toBe(44);
    expect(second.game.players.a.mainScoreUnits).toBe(384);
    expect(formatScore(second.game.players.a.mainScoreUnits)).toBe("38.4");
    expect(second.game.players.a.bestStreak).toBe(2);
    expect(second.game.players.b.pointer).toBe(2);
    expect(Number.isInteger(second.game.players.a.mainScoreUnits)).toBe(true);
  });

  it("resets streak on draw/loss and clamps score at zero while still recording loss stats", () => {
    let game = withPlayer(withPlayer(createGame(), "a"), "b");
    game = setMoveset(game, "a", set);
    game = setMoveset(game, "b", ["paper", "paper", "paper"]);
    game.players.a.mainScoreUnits = 0;
    game.players.a.streak = 5;
    game = startRound(game, "a", 1);

    const next = commitMainDuel(game, {
      challengerId: "a",
      defenderId: "b",
      challengerMove: "rock",
      opponentMode: "chosen",
      now: 2,
    }).game;

    expect(next.players.a.mainScoreUnits).toBe(0);
    expect(next.players.a.streak).toBe(0);
    expect(next.players.a.losses).toBe(1);
    expect(next.players.b.wins).toBe(1);
  });

  it("first moveset setup is free, later setup consumes the round moveset right and resets pointer", () => {
    let game = withPlayer(createGame(), "a");
    game = setMoveset(game, "a", ["rock", "rock", "rock"]);
    game.players.a.pointer = 2;
    game = startRound(game, "a", 1);
    game = setMoveset(game, "a", ["paper", "paper", "rock"]);

    expect(game.players.a.pointer).toBe(0);
    expect(game.activeRound?.didMovesetChange).toBe(true);
    expect(() => setMoveset(game, "a", ["scissors", "scissors", "scissors"])).toThrow(/ปรับชุดมูฟไปแล้ว/);
  });

  it("blocks random or chosen duel when there is no eligible opponent in the arena", () => {
    let game = withPlayer(createGame(), "a");
    game = setMoveset(game, "a", set);
    game = startRound(game, "a", 1);

    expect(challengeablePlayers(game, "a")).toEqual([]);
    expect(() =>
      commitMainDuel(game, {
        challengerId: "a",
        defenderId: "missing",
        challengerMove: "rock",
        opponentMode: "random",
        now: 2,
      }),
    ).toThrow(/ยังไม่มีใครลงสังเวียน/);
  });
});

describe("ranking, champion tax, off-round, and hunted warnings", () => {
  it("ranks by 4 tie-breaker layers and uses sports ties", () => {
    let game = createGame();
    for (const id of ["a", "b", "c", "d"]) {
      game = withPlayer(game, id);
      game.players[id].duelCount = 1;
      game.players[id].mainScoreUnits = id === "d" ? 250 : 310;
    }
    game.players.b.sideScore = 10;
    game.players.c.sideScore = 10;
    game.players.b.wins = 4;
    game.players.b.losses = 1;
    game.players.c.wins = 4;
    game.players.c.losses = 1;
    game.players.b.challengerEntries = 2;
    game.players.c.challengerEntries = 2;

    expect(rankPlayers(game).map((row) => [row.player.id, row.rank])).toEqual([
      ["b", 1],
      ["c", 1],
      ["a", 3],
      ["d", 4],
    ]);
  });

  it("keeps never-competed players outside ranking and exposes champion tax counts safely", () => {
    let game = createGame();
    for (const id of ["a", "b", "c", "fresh"]) {
      game = withPlayer(game, id);
    }
    game.players.a.duelCount = 1;
    game.players.b.duelCount = 1;
    game.players.c.duelCount = 1;
    game.players.a.mainScoreUnits = 500;
    game.players.b.mainScoreUnits = 490;
    game.players.c.mainScoreUnits = 480;
    game.players.a.moveCounts = { rock: 5, paper: 3, scissors: 2 };
    game.players.b.moveCounts = { rock: 4, paper: 4, scissors: 1 };
    game.players.c.moveCounts = { rock: 0, paper: 0, scissors: 0 };

    const ranked = rankPlayers(game);
    const tax = championTax(game);

    expect(ranked).toHaveLength(3);
    expect(tax[0].visibleMoves.map((row) => row.move)).toEqual(["rock", "paper", "scissors"]);
    expect(tax[1].visibleMoves.map((row) => row.move).sort()).toEqual(["paper", "rock"]);
    expect(tax[2].visibleMoves).toEqual([]);
    expect(tax[0].visibleMoves[0]).toMatchObject({ count: 5, total: 10 });
  });

  it("off-round main is light-rate only and never touches streak, pointer, or challenger entries", () => {
    let game = withPlayer(withPlayer(createGame(), "a"), "b");
    game = setMoveset(game, "a", set);
    game = setMoveset(game, "b", ["scissors", "scissors", "scissors"]);
    game.players.a.streak = 4;
    game.players.a.pointer = 2;

    const next = commitOffRoundDuel(game, {
      playerAId: "a",
      playerBId: "b",
      moveA: "rock",
      moveB: "scissors",
      saveMode: "main",
      now: 5,
    }).game;

    expect(next.players.a.mainScoreUnits).toBe(320);
    expect(next.players.b.mainScoreUnits).toBe(290);
    expect(next.players.a.streak).toBe(4);
    expect(next.players.a.pointer).toBe(2);
    expect(next.players.a.challengerEntries).toBe(0);
  });

  it("off-round secondary uses whole points and never adds to main score or move stats", () => {
    let game = withPlayer(withPlayer(createGame(), "a"), "b");
    const next = commitOffRoundDuel(game, {
      playerAId: "a",
      playerBId: "b",
      moveA: "paper",
      moveB: "rock",
      saveMode: "secondary",
      now: 6,
    }).game;

    expect(next.players.a.sideScore).toBe(2);
    expect(next.players.a.mainScoreUnits).toBe(300);
    expect(next.players.a.wins).toBe(0);
    expect(next.players.a.moveCounts.paper).toBe(0);
  });

  it("uses settings to warn when one challenger repeatedly hunts the same defender", () => {
    let game = withPlayer(withPlayer(createGame(), "hunter", "นักล่า"), "target", "เป้าหมาย");
    game = setMoveset(game, "hunter", ["rock", "rock", "rock"]);
    game = setMoveset(game, "target", ["scissors", "scissors", "scissors"]);

    for (let i = 0; i < 3; i += 1) {
      game = startRound(game, "hunter", 10 + i * 2);
      game = commitMainDuel(game, {
        challengerId: "hunter",
        defenderId: "target",
        challengerMove: "rock",
        opponentMode: "chosen",
        now: 11 + i * 2,
      }).game;
      game = closeRound(game, 12 + i * 2);
    }

    expect(huntedWarnings(game, "target")).toEqual([
      { challengerId: "hunter", challengerName: "นักล่า", challengeCount: 3, winCount: 3, winRatePercent: 100 },
    ]);
  });
});

describe("previous crash cases", () => {
  it("does not allow deleting a player in an open round or unfinished off-round, but old history keeps names", () => {
    let game = withPlayer(withPlayer(createGame(), "a", "ชื่อเก่า"), "b", "คู่แข่ง");
    game = setMoveset(game, "a", set);
    game = setMoveset(game, "b", ["scissors", "scissors", "scissors"]);
    game = startRound(game, "a", 1);
    expect(canDeletePlayer(game, "a")).toEqual({ ok: false, reason: "ผู้เล่นนี้อยู่ในรอบที่เปิดค้างอยู่" });
    const afterDuel = commitMainDuel(game, { challengerId: "a", defenderId: "b", challengerMove: "rock", opponentMode: "chosen", now: 2 }).game;
    expect(afterDuel.history[0].challengerName).toBe("ชื่อเก่า");
    expect(canDeletePlayer({ ...afterDuel, activeOffRound: { playerAId: "a", playerBId: "b", step: "pickB" } }, "b")).toEqual({
      ok: false,
      reason: "ผู้เล่นนี้อยู่ในดวลนอกรอบที่ยังไม่จบ",
    });
  });

  it("recovers an unfinished round after reload because activeRound is persisted as state", () => {
    let game = withPlayer(createGame(), "a");
    game = startRound(game, "a", 123);
    expect(game.activeRound).toMatchObject({ playerId: "a", openedAt: 123, didMainDuel: false });
  });

  it("has an explicit privacy curtain state after moveset and off-round first pick", () => {
    let game = withPlayer(createGame(), "a");
    game = setMoveset(game, "a", set);
    expect(game.privacyCurtain).toMatchObject({ reason: "moveset", playerId: "a" });
    expect({ playerAId: "a", playerBId: "b", step: "curtain" }).toMatchObject({ step: "curtain" });
  });

  it("resolves a move once when timeout and tap happen at the same time", () => {
    let game = withPlayer(withPlayer(createGame(), "a"), "b");
    game = setMoveset(game, "a", set);
    game = setMoveset(game, "b", ["scissors", "scissors", "scissors"]);
    game = startRound(game, "a", 1);
    const once = commitMainDuel(game, { challengerId: "a", defenderId: "b", challengerMove: "rock", opponentMode: "chosen", now: 2 }).game;
    expect(() => commitMainDuel(once, { challengerId: "a", defenderId: "b", challengerMove: "paper", opponentMode: "chosen", now: 3 })).toThrow(/ดวลไปแล้ว/);
  });
});
