import { describe, expect, it } from "vitest";

import { createMapGroupKeyValue } from "@/test/map-group-key-value";

import { addRound, CARD_SCORE_ERROR, CardScoreError, createGroup, renameGroup } from "./group";
import { createGroupStore, type GroupKeyValue } from "./group-store";

const at = (minute: number) => new Date(`2026-11-07T12:${String(minute).padStart(2, "0")}:00.000Z`);
const group = (id: string, minute = 0) =>
  createGroup({ id, name: "", playerNames: ["Lan", "Minh"] }, at(minute));

describe("createGroupStore", () => {
  it("creates and loads a group", async () => {
    const store = createGroupStore(createMapGroupKeyValue());
    const created = group("a");
    await store.create(created);
    expect(await store.load("a")).toEqual({ kind: "saved", group: created });
    expect(await store.load("b")).toEqual({ kind: "missing" });
  });

  it("lists the most recently used first", async () => {
    const store = createGroupStore(createMapGroupKeyValue());
    await store.create(group("old", 1));
    await store.create(group("new", 2));
    expect((await store.list()).groups.map(({ id }) => id)).toEqual(["new", "old"]);

    await store.change("old", (current) => renameGroup(current, "Team", at(3)));
    expect((await store.list()).groups.map(({ id }) => id)).toEqual(["old", "new"]);
  });

  it("Một nhóm hỏng: the others still show, it is counted and left alone", async () => {
    const kv = createMapGroupKeyValue({ bad: { format: 1, nonsense: true } });
    const store = createGroupStore(kv);
    await store.create(group("a"));

    const list = await store.list();
    expect(list.groups.map(({ id }) => id)).toEqual(["a"]);
    expect(list.corruptIds).toEqual(["bad"]);
    expect(list.newer).toBe(0);
    expect(await store.load("bad")).toEqual({ kind: "corrupt" });
    expect(kv.stored.has("bad")).toBe(true);
  });

  it("Dữ liệu của bản mới hơn: counted, not written over, not deleted", async () => {
    const newer = { format: 99, future: true };
    const kv = createMapGroupKeyValue({ next: newer });
    const store = createGroupStore(kv);

    expect((await store.list()).newer).toBe(1);
    expect(await store.load("next")).toEqual({ kind: "newer" });
    await expect(store.change("next", (g) => g)).rejects.toMatchObject({
      code: CARD_SCORE_ERROR.groupNewer,
    });
    await expect(store.remove("next")).rejects.toMatchObject({
      code: CARD_SCORE_ERROR.groupNewer,
    });
    expect(kv.stored.get("next")).toEqual(newer);
  });

  it("a corrupt group is not written over, and goes only when asked", async () => {
    const kv = createMapGroupKeyValue({ bad: "nonsense" });
    const store = createGroupStore(kv);

    await expect(store.change("bad", (g) => g)).rejects.toMatchObject({
      code: CARD_SCORE_ERROR.groupCorrupt,
    });
    expect(kv.stored.get("bad")).toBe("nonsense");
    await store.remove("bad");
    expect(kv.stored.has("bad")).toBe(false);
  });

  it("a change refused writes nothing and says why", async () => {
    const kv = createMapGroupKeyValue();
    const store = createGroupStore(kv);
    const created = group("a");
    await store.create(created);

    await expect(
      store.change("a", () => {
        throw new CardScoreError(CARD_SCORE_ERROR.scoreMismatch);
      }),
    ).rejects.toBeInstanceOf(CardScoreError);
    expect(kv.stored.get("a")).toEqual(created);
  });

  it("a change to a group that is gone", async () => {
    const store = createGroupStore(createMapGroupKeyValue());
    await expect(store.change("gone", (g) => g)).rejects.toMatchObject({
      code: CARD_SCORE_ERROR.groupGone,
    });
  });

  it("Hai tab lưu cùng lúc: each change starts from what is stored, so no round is lost", async () => {
    const store = createGroupStore(createMapGroupKeyValue());
    await store.create(group("a"));

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        store.change("a", (current) =>
          addRound(current, { id: `r${index}`, scores: { p1: 1, p2: -1 } }, at(1)),
        ),
      ),
    );
    const loaded = await store.load("a");
    expect(loaded.kind === "saved" && loaded.group.rounds).toHaveLength(10);
  });

  it("change resolves with the group as it is now", async () => {
    const store = createGroupStore(createMapGroupKeyValue());
    await store.create(group("a"));
    const changed = await store.change("a", (current) => renameGroup(current, "Team", at(1)));
    expect(changed.name).toBe("Team");
  });

  it("the same form sent again: one group, as last sent", async () => {
    const kv = createMapGroupKeyValue();
    const store = createGroupStore(kv);
    await store.create(group("a"));
    await store.create(renameGroup(group("a"), "Other", at(1)));
    expect(kv.stored.size).toBe(1);
    const loaded = await store.load("a");
    expect(loaded.kind === "saved" && loaded.group.name).toBe("Other");
  });

  it("Không lưu được: storage that hangs is a failure, and saving again adds no second round", async () => {
    const kv = createMapGroupKeyValue();
    const store = createGroupStore(kv);
    await store.create(group("a"));

    // The write goes through, but its answer never comes in time.
    let release: () => void = () => undefined;
    const slow: GroupKeyValue = {
      ...kv,
      update: async (key, updater) => {
        await kv.update(key, updater);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    };
    const round = { id: "r1", scores: { p1: 1, p2: -1 } };
    const hanging = createGroupStore(slow, 5);
    await expect(hanging.change("a", (current) => addRound(current, round, at(1)))).rejects.toThrow(
      /change/,
    );
    release();

    await store.change("a", (current) => addRound(current, round, at(2)));
    const loaded = await store.load("a");
    expect(loaded.kind === "saved" && loaded.group.rounds).toHaveLength(1);
  });

  it("Trình duyệt chặn lưu trữ: storage that refuses rejects, it does not throw", async () => {
    const refusing: GroupKeyValue = {
      get: () => {
        throw new Error("no IndexedDB");
      },
      update: () => {
        throw new Error("no IndexedDB");
      },
      entries: () => {
        throw new Error("no IndexedDB");
      },
      del: () => {
        throw new Error("no IndexedDB");
      },
    };
    const store = createGroupStore(refusing);
    await expect(store.list()).rejects.toThrow("no IndexedDB");
    await expect(store.load("a")).rejects.toThrow("no IndexedDB");
    await expect(store.create(group("a"))).rejects.toThrow("no IndexedDB");
  });
});
