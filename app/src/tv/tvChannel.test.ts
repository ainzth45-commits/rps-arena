import { beforeEach, describe, expect, it, vi } from "vitest";
import { unpairedView, type TvView } from "./tvView";

const realtime = vi.hoisted(() => {
  const send = vi.fn();
  const unsubscribe = vi.fn();
  const handlers: Record<string, () => void> = {};
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, handler: () => void) => {
      handlers[filter.event] = handler;
      return channel;
    }),
    subscribe: vi.fn((handler: (status: string) => void) => {
      handler("SUBSCRIBED");
      return channel;
    }),
    send,
    unsubscribe,
  };
  return {
    channel,
    handlers,
    send,
    unsubscribe,
    channelFactory: vi.fn(() => channel),
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    channel: realtime.channelFactory,
  })),
}));

import { createBroadcaster } from "./tvChannel";

const leaderboardView: TvView = {
  kind: "leaderboard",
  seasonId: "S1",
  rows: [],
  waiting: 0,
  focus: null,
};

function viewPayloadCalls() {
  return realtime.send.mock.calls.filter(([message]) => message.event === "view");
}

describe("TV broadcaster", () => {
  beforeEach(() => {
    realtime.send.mockClear();
    realtime.unsubscribe.mockClear();
    realtime.channelFactory.mockClear();
    for (const key of Object.keys(realtime.handlers)) delete realtime.handlers[key];
  });

  it("ข้าม payload ซ้ำตอน broadcast ปกติ เพื่อลด TV render เปล่า", () => {
    const broadcaster = createBroadcaster("1234", () => null);

    broadcaster.send(leaderboardView);
    broadcaster.send({ ...leaderboardView, rows: [] });

    expect(viewPayloadCalls()).toHaveLength(1);
  });

  it("ยังส่ง snapshot และ unpaired แม้ payload จะเหมือนเดิม", () => {
    const broadcaster = createBroadcaster("1234", () => leaderboardView);

    broadcaster.send(leaderboardView);
    broadcaster.send({ ...leaderboardView, rows: [] });
    realtime.handlers["want-snapshot"]();
    broadcaster.send(unpairedView);
    broadcaster.send(unpairedView);

    expect(viewPayloadCalls()).toHaveLength(4);
  });
});
