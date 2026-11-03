import { describe, expect, it, vi } from "vitest";

import { createMemoryRoomStore } from "./memory";
import { describeRoomStore, nextRevision, testRoom } from "./room-store-contract";

describeRoomStore("memory store", () => {
  const store = createMemoryRoomStore();
  return Promise.resolve({
    store,
    writeRaw: (code, revision, json) => {
      store.writeRaw(code, revision, json);
      return Promise.resolve();
    },
    cleanup: () => store.close(),
  });
});

describe("memory store test controls", () => {
  it("drops the next messages", async () => {
    const store = createMemoryRoomStore();
    const room = testRoom();
    await store.create(room);
    const listener = vi.fn();
    await store.subscribe(room.code, listener);

    store.dropMessages();
    await store.update(room.code, 1, nextRevision(room));
    await store.update(room.code, 2, nextRevision(nextRevision(room)));

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledTimes(1);
    });
    expect(listener).toHaveBeenCalledWith(nextRevision(nextRevision(room)));
  });

  it("hands every listened room to its listeners again on reconnect", async () => {
    const store = createMemoryRoomStore();
    const room = testRoom();
    const quiet = testRoom();
    await store.create(room);
    await store.create(quiet);
    const listener = vi.fn();
    await store.subscribe(room.code, listener);
    store.dropMessages();
    await store.update(room.code, 1, nextRevision(room));

    store.reconnect();

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(nextRevision(room));
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("deletes a room as if it expired", async () => {
    const store = createMemoryRoomStore();
    const room = testRoom();
    await store.create(room);

    store.expire(room.code);

    expect(await store.get(room.code)).toBeNull();
  });

  it("runs a hook before an operation until it is removed", async () => {
    const store = createMemoryRoomStore();
    const room = testRoom();
    const remove = store.intercept("get", () => {
      throw new Error("down");
    });

    await expect(store.get(room.code)).rejects.toThrow("down");
    remove();
    await expect(store.get(room.code)).resolves.toBeNull();
  });

  it("counts the listeners of a room", async () => {
    const store = createMemoryRoomStore();
    const room = testRoom();
    const unsubscribe = await store.subscribe(room.code, vi.fn());
    await store.subscribe(room.code, vi.fn());

    expect(store.listenerCount(room.code)).toBe(2);
    unsubscribe();
    expect(store.listenerCount(room.code)).toBe(1);
    await store.close();
    expect(store.listenerCount(room.code)).toBe(0);
  });
});
