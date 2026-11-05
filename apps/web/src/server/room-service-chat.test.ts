import * as engine from "@board-games/engine";
import {
  type AnyGameDefinition,
  createRng,
  currentState,
  fromRecord,
  type Rng,
} from "@board-games/engine";
import { ludo, tictactoe } from "@board-games/games";
import { ABANDON_AFTER_MS, type ChatBodyInput, type RoomCode } from "@board-games/protocol";
import { describe, expect, it, vi } from "vitest";

import { type RoomPlayer, type StoredRoom, toRoomView } from "./room";
import {
  createRoomService,
  type RoomService,
  type RoomServiceDeps,
  type ServiceResult,
} from "./room-service";
import { createMemoryRoomStore, type MemoryRoomStore } from "./store/memory";

vi.mock("@board-games/engine", { spy: true });

const LAN: RoomPlayer = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN: RoomPlayer = { playerId: "an-0123456789abcdefgh", name: "An" };
const BINH: RoomPlayer = { playerId: "binh-0123456789abcdef", name: "Bình" };
const CHI: RoomPlayer = { playerId: "chi-0123456789abcdefg", name: "Chi" };
const STRANGER = "stranger-0123456789ab";

const GAMES: readonly AnyGameDefinition[] = [tictactoe, ludo];

const text = (value: string): ChatBodyInput => ({ kind: "text", text: value });

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

function setup(rng: Rng = createRng(1), deps: Pick<RoomServiceDeps, "sleep"> = {}) {
  const store = createMemoryRoomStore();
  const clock = { now: 1_000 };
  const service = createRoomService({
    store,
    rng,
    now: () => clock.now,
    games: GAMES,
    abandonAfterMs: ABANDON_AFTER_MS,
    ...deps,
  });
  return { store, clock, service };
}

type Context = ReturnType<typeof setup>;

async function stored(store: MemoryRoomStore, code: RoomCode): Promise<StoredRoom> {
  const room = await store.get(code);
  if (room === null) throw new Error(`No room ${code}`);
  return room;
}

/** A room of `gameId` with Lan in the first seat and `others` after her. */
async function room(context: Context, gameId: string, seats: number, others: RoomPlayer[]) {
  const created = expectOk(
    await context.service.create({ gameId, playerCount: seats, player: LAN }),
  );
  for (const player of others) expectOk(await context.service.sit(created.code, player));
  return created.code;
}

/** Sends `count` messages from `player`, each with its own id. */
async function say(
  service: RoomService,
  code: RoomCode,
  player: RoomPlayer,
  count: number,
  tag = "",
): Promise<ServiceResult<StoredRoom>[]> {
  const results: ServiceResult<StoredRoom>[] = [];
  for (let index = 0; index < count; index += 1) {
    results.push(
      await service.chat(code, player.playerId, {
        id: `${player.name}-${tag}-chat-${String(index)}`.normalize("NFD").replace(/\p{M}/gu, ""),
        body: text(`${player.name} ${String(index)}`),
      }),
    );
  }
  return results;
}

/**
 * Lets `act` run just before the next `store.update` (once for each of `times`), as another
 * instance writing during the request's read and write.
 */
function beforeNextWrites(store: MemoryRoomStore, times: number, act: () => Promise<unknown>) {
  let left = times;
  let inside = false;
  const stop = store.intercept("update", async () => {
    if (inside || left === 0) return;
    inside = true;
    left -= 1;
    await act();
    inside = false;
  });
  return { stop, left: () => left };
}

/** What the move request reads, as its `decide` replays the game. */
const decisions = () => vi.mocked(engine.fromRecord);

describe("who may chat", () => {
  it("Người chưa có ghế gửi tin: refuses it with not-seated, and the room does not change", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, []);
    const before = await stored(context.store, code);

    const result = await context.service.chat(code, STRANGER, {
      id: "stranger-1",
      body: text("xin chào"),
    });

    expect(result).toMatchObject({ ok: false, error: "not-seated" });
    expect(await stored(context.store, code)).toEqual(before);
  });

  it("Người vừa vào ghế: sees the messages the room holds once seated", async () => {
    const context = setup();
    const code = await room(context, "ludo", 3, [AN]);
    await say(context.service, code, LAN, 1);
    await say(context.service, code, AN, 1);

    const before = await stored(context.store, code);
    expect(toRoomView(before, 0, BINH.playerId).chat).toEqual([]);

    const seated = expectOk(await context.service.sit(code, BINH));
    expect(
      toRoomView(seated, 0, BINH.playerId).chat.map(({ name, mine }) => ({ name, mine })),
    ).toEqual([
      { name: "Lan", mine: false },
      { name: "An", mine: false },
    ]);
  });

  it("Người đã đầu hàng: reads and sends once the AI plays their seat", async () => {
    const context = setup();
    const code = await room(context, "ludo", 3, [AN, BINH]);
    const resigned = expectOk(await context.service.resign(code, AN.playerId, 1));
    expect(resigned.players[1]).toMatchObject({ kind: "human", standIn: true });
    await say(context.service, code, LAN, 1);

    const sent = expectOk(
      await context.service.chat(code, AN.playerId, { id: "an-after-resign", body: text("gg") }),
    );

    const view = toRoomView(sent, 0, AN.playerId);
    expect(view.chat.at(-1)).toMatchObject({ mine: true, body: { text: "gg" } });
    expect(view.chat).toHaveLength(2);
  });

  it("Máy không gửi tin: a move the AI plays adds no message", async () => {
    const context = setup();
    const code = await room(context, "ludo", 3, [AN]);
    expectOk(await context.service.setAiSeat(code, LAN.playerId, 2, true));
    await say(context.service, code, AN, 1);
    const before = await stored(context.store, code);

    // Every roll and move of the game goes round the table, AI included, until the AI has played.
    let current = before;
    for (let step = 0; step < 40 && current.record.entries.length < 6; step += 1) {
      const session = fromRecord(ludo, current.record);
      if (!session.ok) throw new Error(session.error);
      const state = currentState(session.value);
      const seat = current.players[ludo.currentPlayer(state)];
      if (seat?.kind !== "human") throw new Error("The AI should already have played");
      const [move] = ludo.legalMoves(state);
      current = expectOk(
        await context.service.move(
          code,
          seat.playerId,
          { gameNumber: current.gameNumber, moveIndex: current.record.entries.length },
          move,
        ),
      );
    }

    expect(current.chat).toEqual(before.chat);
  });
});

describe("what a message may hold", () => {
  it("stores a text as sanitized, with the sender's name and the write's revision", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const before = await stored(context.store, code);

    const after = expectOk(
      await context.service.chat(code, LAN.playerId, {
        id: "chat-0123",
        body: text("  chào\u{202E} bạn\n"),
      }),
    );

    expect(after.revision).toBe(before.revision + 1);
    expect(after.chat).toEqual([
      {
        seq: after.revision,
        id: "chat-0123",
        playerId: LAN.playerId,
        name: "Lan",
        at: 1_000,
        body: { kind: "text", text: "chào bạn" },
      },
    ]);
  });

  it.each([
    ["Tin quá dài", text("a".repeat(201))],
    ["Tin vô hình", text("\u{200B}\u{200D}\u{3164}\u{2800}")],
    ["Câu có sẵn không có trong danh sách", { kind: "preset", preset: "not-a-preset" } as const],
    ["an unknown reaction", { kind: "reaction", reaction: "hello" } as const],
  ])("%s: refuses it with invalid-chat", async (_label, body) => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const before = await stored(context.store, code);

    const result = await context.service.chat(code, LAN.playerId, { id: "chat-0123", body });

    expect(result).toMatchObject({ ok: false, error: "invalid-chat" });
    expect(await stored(context.store, code)).toEqual(before);
  });

  it("takes a preset and a reaction of the app, by id", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);

    expectOk(
      await context.service.chat(code, LAN.playerId, {
        id: "chat-preset",
        body: { kind: "preset", preset: "nice-move" },
      }),
    );
    const after = expectOk(
      await context.service.chat(code, LAN.playerId, {
        id: "chat-reaction",
        body: { kind: "reaction", reaction: "fire" },
      }),
    );

    expect(after.chat.map(({ body }) => body)).toEqual([
      { kind: "preset", preset: "nice-move" },
      { kind: "reaction", reaction: "fire" },
    ]);
  });

  it("Đổi tên sau khi gửi: keeps the name a message was sent under", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await say(context.service, code, LAN, 1);

    const after = expectOk(await context.service.join(code, LAN.playerId, "Lan Anh"));

    expect(after.players[0]).toMatchObject({ name: "Lan Anh" });
    expect(after.chat[0]?.name).toBe("Lan");
  });
});

describe("how long messages stay", () => {
  it("Tin thứ 31: keeps the latest 30", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    for (let index = 0; index < 31; index += 1) {
      // Past the rate limit: the clock moves on between messages.
      context.clock.now += 2_500;
      expectOk(
        await context.service.chat(code, LAN.playerId, {
          id: `chat-${String(index).padStart(4, "0")}`,
          body: text(String(index)),
        }),
      );
    }

    const { chat } = await stored(context.store, code);

    expect(chat).toHaveLength(30);
    expect(chat[0]?.body).toEqual(text("1"));
    expect(chat.at(-1)?.body).toEqual(text("30"));
    // Rising through the room, also once the first has fallen off.
    expect(chat.map(({ seq }) => seq)).toEqual(
      [...chat.map(({ seq }) => seq)].sort((a, b) => a - b),
    );
  });

  it("Qua ván mới: keeps the messages through a rematch, and tells whose they are after the seats moved", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await say(context.service, code, AN, 2);
    expectOk(await context.service.resign(code, LAN.playerId, 1));

    const next = expectOk(await context.service.rematch(code, LAN.playerId, 1));

    expect(next.gameNumber).toBe(2);
    expect(next.chat).toHaveLength(2);
    expect(toRoomView(next, 0, AN.playerId).chat.every(({ mine }) => mine)).toBe(true);
  });

  it("Phòng từ bản trước: a room stored before chat gets its first message and plays on", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const before = await stored(context.store, code);
    const old: Record<string, unknown> = { ...before };
    delete old.chat;
    context.store.writeRaw(code, before.revision, JSON.stringify(old));
    expect((await stored(context.store, code)).chat).toEqual([]);

    const after = expectOk(
      await context.service.chat(code, LAN.playerId, { id: "chat-0123", body: text("chào") }),
    );
    expect(after.chat).toHaveLength(1);
    expect(after.record).toEqual(before.record);

    const moved = expectOk(
      await context.service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    );
    expect(moved.record.entries).toHaveLength(1);
    expect(moved.chat).toHaveLength(1);
  });

  it("Tin gia hạn phòng: a message is a write of the room like any other", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const update = vi.spyOn(context.store, "update");
    const before = await stored(context.store, code);
    // The service reads the store it was given: spy through a service built on the spied store.
    const service = createRoomService({
      store: context.store,
      rng: createRng(1),
      now: () => context.clock.now,
      games: GAMES,
    });

    const after = expectOk(
      await service.chat(code, LAN.playerId, { id: "chat-0123", body: text("chào") }),
    );

    // `update` is what starts the room's 7 days again (`redis.test.ts`, "from each write").
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(code, before.revision, after);
  });
});

describe("the rate limit", () => {
  it("Tin thứ sáu: refuses the sixth message within 10 seconds, and the game plays on", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const results = await say(context.service, code, LAN, 6);

    expect(results.slice(0, 5).every(({ ok }) => ok)).toBe(true);
    expect(results[5]).toMatchObject({ ok: false, error: "chat-too-fast" });
    expect((await stored(context.store, code)).chat).toHaveLength(5);

    expectOk(
      await context.service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    );
  });

  it("lets another message through once the window has passed", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await say(context.service, code, LAN, 5);

    context.clock.now += 9_999;
    expect((await say(context.service, code, LAN, 1, "b"))[0]).toMatchObject({ ok: false });

    context.clock.now += 1;
    expect((await say(context.service, code, LAN, 1, "c"))[0]).toMatchObject({ ok: true });
  });

  it("counts each player apart", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await say(context.service, code, LAN, 5);

    expect((await say(context.service, code, AN, 1))[0]).toMatchObject({ ok: true });
  });

  it("Hai kết nối của một người: counts a player's messages from the room, on every connection", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    // A second service: another instance, serving the other tab, knows nothing of the first.
    const otherTab = createRoomService({
      store: context.store,
      rng: createRng(2),
      now: () => context.clock.now,
      games: GAMES,
    });

    await say(context.service, code, LAN, 3, "first");
    await say(otherTab, code, LAN, 2, "second");

    expect((await say(context.service, code, LAN, 1, "third"))[0]).toMatchObject({
      ok: false,
      error: "chat-too-fast",
    });
  });

  it("answers a message sent again before the limit: it already went through", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await say(context.service, code, LAN, 5);
    const before = await stored(context.store, code);

    const again = expectOk(
      await context.service.chat(code, LAN.playerId, {
        id: "Lan--chat-4",
        body: text("Lan 4"),
      }),
    );

    expect(again).toEqual(before);
  });
});

describe("the clocks of instances", () => {
  it("does not count a message stamped far ahead: it would block the sender for as long", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const before = await stored(context.store, code);
    const ahead = Array.from({ length: 5 }, (_, index) => ({
      seq: before.revision,
      id: `ahead-${String(index)}-chat`,
      playerId: LAN.playerId,
      name: "Lan",
      at: context.clock.now + 60 * 60_000,
      body: text("x"),
    }));
    context.store.writeRaw(code, before.revision, JSON.stringify({ ...before, chat: ahead }));

    expect((await say(context.service, code, LAN, 1))[0]).toMatchObject({ ok: true });
  });

  it("still counts one a little ahead: instances' clocks differ by that much", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const before = await stored(context.store, code);
    const ahead = Array.from({ length: 5 }, (_, index) => ({
      seq: before.revision,
      id: `ahead-${String(index)}-chat`,
      playerId: LAN.playerId,
      name: "Lan",
      at: context.clock.now + 500,
      body: text("x"),
    }));
    context.store.writeRaw(code, before.revision, JSON.stringify({ ...before, chat: ahead }));

    expect((await say(context.service, code, LAN, 1))[0]).toMatchObject({
      ok: false,
      error: "chat-too-fast",
    });
  });
});

describe("a chat message that keeps losing", () => {
  /** Every write of the message is beaten to it by another write. */
  function alwaysBeaten(context: Context, code: RoomCode) {
    let inside = false;
    let round = 0;
    return context.store.intercept("update", async () => {
      if (inside) return;
      inside = true;
      round += 1;
      await context.service.join(code, AN.playerId, `An ${String(round)}`);
      inside = false;
    });
  }

  it("tries at most 12 times, waiting a little and at random between them", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const context = setup(createRng(1), { sleep });
    const code = await room(context, "tictactoe", 2, [AN]);
    const stop = alwaysBeaten(context, code);
    const update = vi.spyOn(context.store, "update");
    const service = createRoomService({
      store: context.store,
      rng: createRng(1),
      now: () => context.clock.now,
      games: GAMES,
      sleep,
    });

    const result = await service.chat(code, LAN.playerId, { id: "chat-0123", body: text("mine") });
    stop();

    expect(result).toMatchObject({ ok: false, error: "unavailable" });
    const own = update.mock.calls.filter(([, , next]) =>
      next.chat.some(({ id }) => id === "chat-0123"),
    );
    expect(own).toHaveLength(12);
    expect(sleep).toHaveBeenCalledTimes(11);
    for (const [ms] of sleep.mock.calls as unknown as [number][]) {
      expect(ms).toBeGreaterThanOrEqual(5);
      expect(ms).toBeLessThanOrEqual(30);
    }
  });

  it("stops at its time limit, whatever is left of its tries: nobody waits for it by then", async () => {
    const context = setup(createRng(1), { sleep: () => Promise.resolve() });
    const code = await room(context, "tictactoe", 2, [AN]);
    let reads = 0;
    const stopGet = context.store.intercept("get", () => {
      reads += 1;
      context.clock.now += 1_000;
    });
    const stop = alwaysBeaten(context, code);

    const result = await context.service.chat(code, LAN.playerId, {
      id: "chat-0123",
      body: text("mine"),
    });
    stop();
    stopGet();

    expect(result).toMatchObject({ ok: false, error: "unavailable" });
    expect(reads).toBeLessThan(16);
    expect((await stored(context.store, code)).chat.some(({ id }) => id === "chat-0123")).toBe(
      false,
    );
  });
});

describe("sending again", () => {
  it("Gửi lại sau khi không có trả lời: the same id changes nothing and answers the room", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const first = expectOk(
      await context.service.chat(code, LAN.playerId, { id: "chat-0123", body: text("chào") }),
    );

    const again = expectOk(
      await context.service.chat(code, LAN.playerId, { id: "chat-0123", body: text("chào") }),
    );

    expect(again.revision).toBe(first.revision);
    expect((await stored(context.store, code)).chat).toHaveLength(1);
  });

  it("takes the same id from another player as another message", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await context.service.chat(code, LAN.playerId, { id: "chat-0123", body: text("chào") });

    const after = expectOk(
      await context.service.chat(code, AN.playerId, { id: "chat-0123", body: text("chào") }),
    );

    expect(after.chat).toHaveLength(2);
  });
});

describe("chat does not touch the game", () => {
  it("Đồng hồ bỏ ván: a message leaves the turn's start as it is", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const before = await stored(context.store, code);
    expect(before.turnStartedAt).not.toBeNull();

    context.clock.now += 4 * 60_000;
    const after = expectOk(
      await context.service.chat(code, AN.playerId, { id: "chat-0123", body: text("đâu rồi") }),
    );
    expect(after.turnStartedAt).toBe(before.turnStartedAt);

    // Lan's turn is claimed exactly 5 minutes after it began, the message or not.
    context.clock.now = (before.turnStartedAt ?? 0) + ABANDON_AFTER_MS - 1;
    expect(
      await context.service.claimAbandoned(code, AN.playerId, { gameNumber: 1, moveIndex: 0 }),
    ).toMatchObject({ ok: false, error: "not-abandoned" });
    context.clock.now += 1;
    expectOk(
      await context.service.claimAbandoned(code, AN.playerId, { gameNumber: 1, moveIndex: 0 }),
    );
  });

  it("Lịch sử ván: the game gets one move more, and its replay knows nothing of messages", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    await say(context.service, code, AN, 2);

    const moved = expectOk(
      await context.service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    );

    expect(moved.record.entries).toEqual([{ move: { cell: 4 } }]);
    expect(JSON.stringify(moved.record)).not.toContain("An 0");
  });

  it("plays no AI seat left to move and replays nothing", async () => {
    const context = setup();
    const code = await room(context, "ludo", 3, [AN]);
    expectOk(await context.service.setAiSeat(code, LAN.playerId, 2, true));
    const before = await stored(context.store, code);
    // A room left on the AI's turn: only a person's return or request moves it on, not a message.
    decisions().mockClear();

    const after = expectOk(
      await context.service.chat(code, AN.playerId, { id: "chat-0123", body: text("chào") }),
    );

    expect(after.record).toEqual(before.record);
    expect(decisions()).not.toHaveBeenCalled();
  });
});

describe("a write that meets a message", () => {
  /** A Tic-tac-toe game, Lan to move, ready for a move to be sent. */
  async function game() {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    const move = () =>
      context.service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 });
    return { ...context, code, move };
  }

  it("Nước đi trùng lúc với tin: writes both, deciding the move once", async () => {
    const { store, service, code, move } = await game();
    const writes = beforeNextWrites(store, 1, () =>
      service.chat(code, AN.playerId, { id: "chat-0123", body: text("nhanh lên") }),
    );
    decisions().mockClear();

    const moved = expectOk(await move());
    writes.stop();

    expect(writes.left()).toBe(0);
    // Once for the move: the room did not change but for its chat, so it is not replayed again.
    expect(decisions()).toHaveBeenCalledTimes(1);
    expect(moved.record.entries).toHaveLength(1);
    expect(moved.chat).toHaveLength(1);
    expect(await stored(store, code)).toEqual(moved);
  });

  it("keeps the decision, the roll included, and its turn's start", async () => {
    const rng = createRng(3);
    const nextInt = vi.spyOn(rng, "nextInt");
    const context = setup(rng);
    const code = await room(context, "ludo", 2, [AN]);
    const room0 = await stored(context.store, code);
    const writes = beforeNextWrites(context.store, 2, () =>
      context.service.chat(code, AN.playerId, {
        id: `chat-${String(writes.left())}-0123`,
        body: text("nhanh lên"),
      }),
    );
    nextInt.mockClear();
    decisions().mockClear();
    context.clock.now += 5;

    const moved = expectOk(
      await context.service.move(
        code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        { type: "roll" },
      ),
    );
    writes.stop();

    expect(decisions()).toHaveBeenCalledTimes(1);
    expect(nextInt.mock.calls.length).toBeLessThanOrEqual(1);
    expect(moved.chat).toHaveLength(2);
    expect(moved.turnStartedAt).toBe(room0.turnStartedAt === null ? null : context.clock.now);
    expect(await stored(context.store, code)).toEqual(moved);
  });

  it("does not count messages against the move's attempts", async () => {
    const { store, service, clock, code, move } = await game();
    // More than a move's 2 reads, fewer than a rebase's limit.
    let sent = 0;
    const writes = beforeNextWrites(store, 8, async () => {
      sent += 1;
      clock.now += 2_500;
      expectOk(
        await service.chat(code, AN.playerId, {
          id: `chat-${String(sent).padStart(4, "0")}`,
          body: text(String(sent)),
        }),
      );
    });
    decisions().mockClear();

    const moved = expectOk(await move());
    writes.stop();

    expect(sent).toBe(8);
    expect(decisions()).toHaveBeenCalledTimes(1);
    expect(moved.chat).toHaveLength(8);
    expect(moved.record.entries).toHaveLength(1);
  });

  it("decides again past the limit of times one decision is written anew", async () => {
    const { store, service, clock, code, move } = await game();
    let sent = 0;
    const writes = beforeNextWrites(store, 11, async () => {
      sent += 1;
      clock.now += 2_500;
      expectOk(
        await service.chat(code, AN.playerId, {
          id: `chat-${String(sent).padStart(4, "0")}`,
          body: text(String(sent)),
        }),
      );
    });
    decisions().mockClear();

    const moved = expectOk(await move());
    writes.stop();

    expect(sent).toBe(11);
    expect(decisions()).toHaveBeenCalledTimes(2);
    expect(moved.chat).toHaveLength(11);
    expect(moved.record.entries).toHaveLength(1);
  });

  it("a real conflict still decides again on the newer room", async () => {
    const { store, service, code, move } = await game();
    // A rename: not a message, so what was decided may no longer hold.
    const writes = beforeNextWrites(store, 1, () => service.join(code, AN.playerId, "An Nhiên"));
    decisions().mockClear();

    const moved = expectOk(await move());
    writes.stop();

    expect(decisions()).toHaveBeenCalledTimes(2);
    expect(moved.players[1]).toMatchObject({ name: "An Nhiên" });
    expect(moved.record.entries).toHaveLength(1);
  });

  it("a move in between makes the move stale", async () => {
    const context = setup();
    const code = await room(context, "tictactoe", 2, [AN]);
    expectOk(
      await context.service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 0 }),
    );
    // An's two tabs: the second sends the same position once the first has moved.
    const writes = beforeNextWrites(context.store, 1, () =>
      context.service.move(code, AN.playerId, { gameNumber: 1, moveIndex: 1 }, { cell: 1 }),
    );

    const result = await context.service.move(
      code,
      AN.playerId,
      { gameNumber: 1, moveIndex: 1 },
      { cell: 2 },
    );
    writes.stop();

    expect(result).toMatchObject({ ok: false, error: "stale-move" });
    expect((await stored(context.store, code)).record.entries).toHaveLength(2);
  });

  it("a chat message that loses reads the list again, and cuts the list it read", async () => {
    const { store, service, clock, code } = await game();
    for (let index = 0; index < 30; index += 1) {
      clock.now += 2_500;
      expectOk(
        await service.chat(code, AN.playerId, {
          id: `chat-${String(index).padStart(4, "0")}`,
          body: text(String(index)),
        }),
      );
    }
    clock.now += 10_000;
    const writes = beforeNextWrites(store, 1, () =>
      service.chat(code, AN.playerId, { id: "chat-other", body: text("other") }),
    );

    const after = expectOk(
      await service.chat(code, LAN.playerId, { id: "chat-mine", body: text("mine") }),
    );
    writes.stop();

    expect(after.chat).toHaveLength(30);
    expect(after.chat.map(({ body }) => body).slice(-2)).toEqual([text("other"), text("mine")]);
    expect(after.chat.at(-1)?.seq).toBe(after.revision);
  });

  it("Nước đi giữa loạt tin: every message and the move are written, none refused for the store", async () => {
    const context = setup();
    const code = await room(context, "ludo", 4, [AN, BINH, CHI]);
    const update = vi.spyOn(context.store, "update");
    const service = createRoomService({
      store: context.store,
      rng: createRng(1),
      now: () => context.clock.now,
      games: GAMES,
    });
    const results = await Promise.all([
      ...[LAN, AN, BINH, CHI].map((player) => say(service, code, player, 5)),
      service
        .move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { type: "roll" })
        .then((moved) => [moved]),
    ]);

    expect(results.flat().filter(({ ok }) => !ok)).toEqual([]);
    // A bound on what the burst costs: 21 writes, and few lost among them.
    expect(update.mock.calls.length).toBeLessThanOrEqual(120);
    const after = await stored(context.store, code);
    expect(after.chat).toHaveLength(20);
    expect(after.record.entries).toHaveLength(1);
    // Every write has its own revision, and every message the revision that wrote it.
    expect(new Set(after.chat.map(({ seq }) => seq)).size).toBe(20);
  });
});
