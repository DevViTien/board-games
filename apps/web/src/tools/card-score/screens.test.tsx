import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMapGroupKeyValue } from "@/test/map-group-key-value";
import { renderWithIntl } from "@/test/render-with-intl";

import { CardScoreApp } from "./CardScoreApp";
import {
  addRound,
  type CardScoreGroup,
  createGroup,
  renameGroup,
  renamePlayer,
  restPlayer,
} from "./group";
import type * as StoreModule from "./group-store";
import type { GroupKeyValue, GroupStore } from "./group-store";
import { GroupEdit } from "./GroupEdit";
import { NewGroup } from "./GroupForm";
import { GroupList } from "./GroupList";
import { routeOf } from "./routes";
import { Scoreboard } from "./Scoreboard";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

const nav = vi.hoisted(() => ({ pathname: "/tools/card-score", from: null as string | null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.from === null ? "" : `from=${nav.from}`),
}));

// Every screen shares one store: here over a Map (jsdom has no IndexedDB), swapped per test.
const holder = vi.hoisted(() => ({ store: undefined as GroupStore | undefined }));
vi.mock("./group-store", async (original) => {
  const actual = await original<typeof StoreModule>();
  const current = (): GroupStore => {
    if (holder.store === undefined) throw new Error("no store in this test");
    return holder.store;
  };
  return {
    ...actual,
    groupStore: {
      list: () => current().list(),
      load: (id) => current().load(id),
      create: (group) => current().create(group),
      change: (id, apply) => current().change(id, apply),
      remove: (id) => current().remove(id),
    } satisfies GroupStore,
  };
});

const { createGroupStore } = await vi.importActual<typeof StoreModule>("./group-store");

const NOW = new Date("2026-11-07T12:00:00.000Z");
let kv: ReturnType<typeof createMapGroupKeyValue>;

function useStore(override: Partial<GroupKeyValue> = {}) {
  holder.store = createGroupStore({ ...kv, ...override }, 50);
}

function saved(group: CardScoreGroup): CardScoreGroup {
  kv.stored.set(group.id, JSON.parse(JSON.stringify(group)));
  return group;
}

const group = (
  names: readonly string[] = ["Lan", "Minh", "Hùng", "Tú"],
  rounds: readonly Readonly<Record<string, number>>[] = [],
  name = "Team Dev",
) => {
  let built = createGroup({ id: "g1", name, playerNames: names }, NOW);
  rounds.forEach((scores, index) => {
    built = addRound(built, { id: `r${index}`, scores }, NOW);
  });
  return built;
};

/** Whether the device's main pointer is a finger. */
function pointer(coarse: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: coarse && query === "(pointer: coarse)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

const show = (ui: ReactElement) => renderWithIntl(ui);
const stored = (id = "g1") => kv.stored.get(id) as CardScoreGroup;
const field = (name: string) => screen.getByRole<HTMLInputElement>("textbox", { name });
const pressKeys = async (...names: readonly string[]) => {
  for (const name of names) await userEvent.click(screen.getByRole("button", { name }));
};
const saveButton = () => screen.getByRole("button", { name: "Lưu ván" });

beforeEach(() => {
  kv = createMapGroupKeyValue();
  useStore();
  pointer(false);
  window.sessionStorage.clear();
  window.localStorage.clear();
  nav.pathname = "/tools/card-score";
  nav.from = null;
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  holder.store = undefined;
  vi.unstubAllGlobals();
});

describe("routeOf", () => {
  it.each([
    [[], { screen: "list" }],
    [["new"], { screen: "new" }],
    [["abc"], { screen: "board", groupId: "abc" }],
    [["abc", "edit"], { screen: "edit", groupId: "abc" }],
  ])("%j", (segments, route) => {
    expect(routeOf(segments)).toEqual(route);
  });

  it.each([[["a", "b", "c"]], [["a", "b"]], [["new", "edit"]]])("no such page: %j", (segments) => {
    expect(routeOf(segments)).toBeNull();
  });
});

describe("CardScoreApp", () => {
  it.each([
    ["/tools/card-score", "Ghi điểm đánh bài"],
    ["/tools/card-score/new", "Tạo nhóm"],
    ["/tools/card-score/g1", "Team Dev"],
    ["/tools/card-score/g1/edit", "Sửa nhóm"],
  ])("%s shows its screen", async (pathname, title) => {
    saved(group());
    nav.pathname = pathname;
    show(<CardScoreApp />);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });
});

describe("Danh sách nhóm", () => {
  it("Chưa có nhóm nào: says what the tool does, and the way on", async () => {
    show(<GroupList />);
    expect(await screen.findByRole("heading", { name: "Chưa có nhóm nào" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tạo nhóm" })).toHaveAttribute(
      "href",
      "/tools/card-score/new",
    );
    expect(screen.getByText(/chỉ lưu trên trình duyệt này/)).toBeInTheDocument();
  });

  it("shows each group's name, players and rounds; Nhóm không đặt tên goes by its players", async () => {
    saved(group(undefined, [{ p1: 1, p2: -1 }]));
    saved({ ...group(["Bố", "Mẹ"], [], ""), id: "g2" });
    show(<GroupList />);

    const named = (await screen.findByRole("link", { name: /Team Dev/ })).textContent;
    expect(named).toContain("Lan, Minh, Hùng, Tú");
    expect(named).toContain("1 ván");
    expect(screen.getByRole("link", { name: /Bố, Mẹ/ })).toHaveAttribute(
      "href",
      "/tools/card-score/g2",
    );
  });

  it("the way back goes to the toolbox", async () => {
    show(<GroupList />);
    await screen.findByRole("heading", { level: 1 });
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "Hộp công cụ" }),
    ).toHaveAttribute("href", "/tools");
  });

  it("Một nhóm hỏng và bản mới hơn: said in a line, the others still there", async () => {
    saved(group());
    kv.stored.set("bad", "nonsense");
    kv.stored.set("next", { format: 99 });
    show(<GroupList />);

    expect(await screen.findByRole("link", { name: /Team Dev/ })).toBeInTheDocument();
    expect(screen.getByText(/1 nhóm không đọc được/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở nhóm hỏng 1" })).toHaveAttribute(
      "href",
      "/tools/card-score/bad",
    );
    expect(screen.getByText(/1 nhóm được lưu bởi phiên bản mới hơn/)).toBeInTheDocument();
    expect(kv.stored.get("bad")).toBe("nonsense");
  });

  it("Trình duyệt chặn lưu trữ: says so, with a way back", async () => {
    useStore({
      entries: () => {
        throw new Error("blocked");
      },
    });
    show(<GroupList />);
    expect(
      await screen.findByRole("heading", { name: "Không dùng được công cụ trên trình duyệt này" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Hộp công cụ" }),
    ).toBeVisible();
  });
});

describe("Tạo nhóm", () => {
  const fillPlayers = async (...names: readonly string[]) => {
    for (const [index, name] of names.entries()) {
      await userEvent.type(field(`Người chơi ${index + 1}`), name);
    }
  };
  const create = () => userEvent.click(screen.getByRole("button", { name: "Tạo nhóm" }));

  it("Tạo nhóm hợp lệ: stored, and on to its board, Back not returning to the form", async () => {
    show(<NewGroup from={null} />);
    await fillPlayers("Lan", "Minh", "Hùng", "Tú");
    const before = window.history.length;
    await create();

    await waitFor(() => {
      expect(kv.stored.size).toBe(1);
    });
    const [created] = [...kv.stored.values()] as CardScoreGroup[];
    expect(created?.players.map(({ name }) => name)).toEqual(["Lan", "Minh", "Hùng", "Tú"]);
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/tools/card-score/${created?.id ?? ""}`);
    });
    expect(window.history.length).toBe(before);
  });

  it("Ít hơn hai người: nothing created, and why", async () => {
    show(<NewGroup from={null} />);
    await fillPlayers("Lan");
    await create();
    expect(await screen.findByRole("alert")).toHaveTextContent("Cần ít nhất 2 người chơi.");
    expect(kv.stored.size).toBe(0);
  });

  it("Tên trùng: the row is marked", async () => {
    show(<NewGroup from={null} />);
    await fillPlayers("Lan", "lan");
    await create();
    expect(field("Người chơi 2")).toHaveAccessibleDescription("Tên này đã có trong nhóm.");
    expect(field("Người chơi 2")).toBeInvalid();
    expect(field("Người chơi 2")).toHaveFocus();
    expect(field("Người chơi 1")).toBeValid();
    expect(kv.stored.size).toBe(0);
  });

  it("Tối đa tám người: no ninth row, and why", async () => {
    show(<NewGroup from={null} />);
    for (let added = 0; added < 4; added += 1) await pressKeys("Thêm người");
    expect(screen.getAllByRole("textbox", { name: /^Người chơi/ })).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Thêm người" })).not.toBeInTheDocument();
    expect(screen.getByText("Mỗi nhóm có tối đa 8 người đang chơi.")).toBeVisible();
  });

  it("Không tạo được, sent again: one group, not two", async () => {
    const realUpdate = kv.update;
    let failing = true;
    useStore({
      update: (key, updater) =>
        failing
          ? realUpdate(key, updater).then(() => Promise.reject(new Error("late")))
          : realUpdate(key, updater),
    });
    show(<NewGroup from={null} />);
    await fillPlayers("Lan", "Minh");
    await create();
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa tạo được nhóm.");
    failing = false;
    await create();
    await waitFor(() => {
      expect(window.location.pathname).toMatch(/^\/tools\/card-score\/./);
    });
    expect(kv.stored.size).toBe(1);
  });

  it("rows can go, down to two", async () => {
    show(<NewGroup from={null} />);
    await pressKeys("Bỏ ô 4", "Bỏ ô 3");
    expect(screen.getAllByRole("textbox", { name: /^Người chơi/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Bỏ ô/ })).not.toBeInTheDocument();
  });

  it("a group's name too long", async () => {
    show(<NewGroup from={null} />);
    await userEvent.type(field("Tên nhóm (không bắt buộc)"), "x".repeat(41));
    await fillPlayers("Lan", "Minh");
    await create();
    expect(field("Tên nhóm (không bắt buộc)")).toHaveAccessibleDescription(/tối đa 40 ký tự/);
    expect(field("Tên nhóm (không bắt buộc)")).toHaveFocus();
    expect(kv.stored.size).toBe(0);
  });

  it("Không tạo được: says so and stays", async () => {
    useStore({
      update: () => {
        throw new Error("blocked");
      },
    });
    show(<NewGroup from={null} />);
    await fillPlayers("Lan", "Minh");
    await create();
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa tạo được nhóm.");
    expect(field("Người chơi 1").value).toBe("Lan");
  });

  it("Buổi mới: filled in from the group, which does not change", async () => {
    const old = saved(restPlayer(group(undefined, [{ p1: 1, p4: -1 }]), "p4", NOW));
    show(<NewGroup from="g1" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Buổi mới" })).toBeInTheDocument();
    expect(field("Tên nhóm (không bắt buộc)").value).toBe("Team Dev");
    expect(field("Người chơi 1").value).toBe("Lan");
    expect(field("Người chơi 3").value).toBe("Hùng");
    expect(field("Người chơi 4").value).toBe("");
    await create();

    await waitFor(() => {
      expect(kv.stored.size).toBe(2);
    });
    expect(stored("g1").rounds).toEqual(old.rounds);
    const fresh = [...kv.stored.entries()].find(([id]) => id !== "g1")?.[1] as CardScoreGroup;
    expect(fresh.name).toBe("Team Dev");
    expect(fresh.rounds).toEqual([]);
  });

  it("Nhóm nguồn không còn: an empty form, and why", async () => {
    show(<NewGroup from="gone" />);
    expect(await screen.findByText(/Không tìm thấy nhóm nguồn/)).toBeVisible();
    expect(field("Người chơi 1").value).toBe("");
  });
});

describe("Sửa nhóm khi đang chơi", () => {
  const showEdit = async (built: CardScoreGroup) => {
    saved(built);
    show(<GroupEdit groupId="g1" />);
    await screen.findByRole("heading", { level: 1, name: "Sửa nhóm" });
  };

  it("Người mới vào giữa buổi", async () => {
    await showEdit(group(undefined, [{ p1: 1, p2: -1 }]));
    await userEvent.type(field("Tên người mới"), "Nam");
    await pressKeys("Thêm người");

    await waitFor(() => {
      expect(stored().players.at(-1)?.name).toBe("Nam");
    });
    expect(stored().rounds).toHaveLength(1);
    expect(await screen.findByRole("textbox", { name: "Tên của Nam" })).toBeVisible();
    expect(field("Tên người mới").value).toBe("");
  });

  it("Người chơi nghỉ, rồi chơi lại: at once, the score kept", async () => {
    await showEdit(group(undefined, [{ p1: 40, p4: -40 }]));
    await pressKeys("Cho nghỉ: Tú");
    await waitFor(() => {
      expect(stored().players[3]?.active).toBe(false);
    });
    await pressKeys("Chơi lại: Tú");
    await waitFor(() => {
      expect(stored().players[3]?.active).toBe(true);
    });
    expect(stored().rounds).toHaveLength(1);
  });

  it("one with no score goes for good", async () => {
    await showEdit(group());
    await pressKeys("Xoá: Tú");
    await waitFor(() => {
      expect(stored().players).toHaveLength(3);
    });
  });

  it("Không còn đủ hai người: the button says why and does nothing", async () => {
    await showEdit(group(["Lan", "Minh"], [{ p1: 1, p2: -1 }]));
    const rest = screen.getByRole("button", { name: "Cho nghỉ: Lan" });
    expect(rest).toHaveAttribute("aria-disabled", "true");
    expect(rest).toHaveAccessibleDescription("Nhóm cần ít nhất 2 người đang chơi.");
    // On the screen too, not only for a screen reader.
    expect(screen.getByText("Nhóm cần ít nhất 2 người đang chơi.")).not.toHaveClass("sr-only");
    await userEvent.click(rest);
    expect(stored().players[0]?.active).toBe(true);
  });

  it("Đã đủ tám người: neither add nor bring back", async () => {
    const eight = restPlayer(
      group(["a", "b", "c", "d", "e", "f", "g", "h"], [{ p1: 1, p2: -1 }]),
      "p1",
      NOW,
    );
    let full = eight;
    full = {
      ...full,
      players: [...full.players, { id: "p9", name: "i", active: true }],
      nextPlayerId: 10,
    };
    await showEdit(full);

    expect(screen.getByRole("button", { name: "Chơi lại: a" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    const add = screen.getByRole("button", { name: "Thêm người" });
    expect(add).toHaveAttribute("aria-disabled", "true");
    expect(add).toHaveAccessibleDescription("Mỗi nhóm có tối đa 8 người đang chơi.");
    await userEvent.type(field("Tên người mới"), "j{Enter}");
    expect(stored().players).toHaveLength(9);
  });

  it("Đã đủ mười sáu người: suggests a new session", async () => {
    let full = group(["a", "b", "c", "d", "e", "f", "g", "h"]);
    full = {
      ...full,
      players: [
        ...full.players,
        ...Array.from({ length: 8 }, (_, index) => ({
          id: `p${index + 9}`,
          name: `r${index}`,
          active: false,
        })),
      ],
      nextPlayerId: 17,
    };
    await showEdit(full);
    expect(screen.getByRole("button", { name: "Thêm người" })).toHaveAccessibleDescription(
      /Hãy tạo buổi mới/,
    );
  });

  it("one resting whose rounds are gone can still come back, or go, even with eight playing", async () => {
    let built = restPlayer(group(["a", "b", "c", "d", "e", "f", "g", "h"]), "p1", NOW);
    built = {
      ...built,
      players: [...built.players, { id: "p9", name: "i", active: true }],
      nextPlayerId: 10,
    };
    await showEdit(built);
    expect(screen.getByRole("button", { name: "Chơi lại: a" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    const remove = screen.getByRole("button", { name: "Xoá: a" });
    expect(remove).not.toHaveAttribute("aria-disabled", "true");
    await userEvent.click(remove);
    await waitFor(() => {
      expect(stored().players).toHaveLength(8);
    });
  });

  it("a name another tab changed: shown, and leaving the field writes nothing back", async () => {
    await showEdit(group());
    saved(renamePlayer(renameGroup(group(), "Mới", NOW), "p1", "Lan Anh", NOW));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });
    expect(await screen.findByRole("textbox", { name: "Tên của Lan Anh" })).toHaveValue("Lan Anh");
    expect(field("Tên nhóm (không bắt buộc)").value).toBe("Mới");
    await userEvent.click(field("Tên của Lan Anh"));
    await userEvent.tab();
    await userEvent.click(field("Tên nhóm (không bắt buộc)"));
    await userEvent.tab();
    expect(stored().players[0]?.name).toBe("Lan Anh");
    expect(stored().name).toBe("Mới");
  });

  it("a name being typed when the screen goes is still saved", async () => {
    saved(group());
    const view = show(<GroupEdit groupId="g1" />);
    await screen.findByRole("heading", { level: 1, name: "Sửa nhóm" });
    await userEvent.clear(field("Tên của Lan"));
    await userEvent.type(field("Tên của Lan"), "An");
    view.unmount();
    await waitFor(() => {
      expect(stored().players[0]?.name).toBe("An");
    });
  });

  it("Xong with a name refused: stays, and says why", async () => {
    await showEdit(group());
    const before = window.location.pathname;
    await userEvent.clear(field("Tên của Lan"));
    await userEvent.type(field("Tên của Lan"), "Minh");
    await userEvent.click(screen.getByRole("link", { name: "Xong" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tên này đã có trong nhóm.");
    expect(window.location.pathname).toBe(before);
  });

  it("the error on the group's name goes when the old name comes back", async () => {
    await showEdit(group());
    const name = field("Tên nhóm (không bắt buộc)");
    await userEvent.type(name, "x".repeat(40));
    await userEvent.tab();
    await waitFor(() => {
      expect(name).toBeInvalid();
    });
    await userEvent.clear(name);
    await userEvent.type(name, "Team Dev");
    await userEvent.tab();
    await waitFor(() => {
      expect(name).toBeValid();
    });
  });

  it("a double press on Thêm người adds one, with no error", async () => {
    await showEdit(group());
    await userEvent.type(field("Tên người mới"), "Nam");
    const add = screen.getByRole("button", { name: "Thêm người" });
    await act(async () => {
      add.click();
      add.click();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(stored().players).toHaveLength(5);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Đổi tên: when leaving the field", async () => {
    await showEdit(group(undefined, [{ p1: 1, p2: -1 }]));
    const name = field("Tên của Lan");
    await userEvent.clear(name);
    await userEvent.type(name, "Lan Anh");
    await userEvent.tab();
    await waitFor(() => {
      expect(stored().players[0]?.name).toBe("Lan Anh");
    });
    expect(stored().rounds[0]?.scores).toEqual({ p1: 1, p2: -1 });
  });

  it("a name taken: said on the row, nothing changed", async () => {
    await showEdit(group());
    const name = field("Tên của Lan");
    await userEvent.clear(name);
    await userEvent.type(name, "minh");
    await userEvent.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Tên này đã có trong nhóm.");
    expect(stored().players[0]?.name).toBe("Lan");
  });

  it("Thêm trùng tên người đã nghỉ: points to bringing them back", async () => {
    await showEdit(restPlayer(group(undefined, [{ p1: 1, p4: -1 }]), "p4", NOW));
    await userEvent.type(field("Tên người mới"), "Tú");
    await pressKeys("Thêm người");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Chọn "Chơi lại"/);
    expect(stored().players).toHaveLength(4);
  });

  it("renames the group, and Xong goes back to the board", async () => {
    await showEdit(group());
    const name = field("Tên nhóm (không bắt buộc)");
    await userEvent.clear(name);
    await userEvent.type(name, "Team");
    await userEvent.tab();
    await waitFor(() => {
      expect(stored().name).toBe("Team");
    });
    expect(screen.getByRole("link", { name: "Xong" })).toHaveAttribute(
      "href",
      "/tools/card-score/g1",
    );
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "Bảng điểm" }),
    ).toBeVisible();
  });
});

describe("Bảng điểm", () => {
  const showBoard = async (built: CardScoreGroup) => {
    saved(built);
    show(<Scoreboard groupId={built.id} />);
    await screen.findByRole("heading", { level: 1 });
  };

  it("Đường dẫn nhóm trên máy khác: explained, with the way to the groups", async () => {
    show(<Scoreboard groupId="elsewhere" />);
    expect(
      await screen.findByRole("heading", { name: "Không thấy nhóm này trên trình duyệt này" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/chỉ lưu trên máy đã tạo/)).toBeVisible();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Các nhóm" }),
    ).toHaveAttribute("href", "/tools/card-score");
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "Các nhóm" }),
    ).toBeVisible();
  });

  it("Dữ liệu của bản mới hơn", async () => {
    kv.stored.set("g1", { format: 99 });
    show(<Scoreboard groupId="g1" />);
    expect(
      await screen.findByRole("heading", { name: "Nhóm này được lưu bởi phiên bản mới hơn" }),
    ).toBeVisible();
  });

  it("Một nhóm hỏng: said so, and deleted only when the player chooses", async () => {
    kv.stored.set("g1", "nonsense");
    show(<Scoreboard groupId="g1" />);
    expect(await screen.findByRole("heading", { name: "Không đọc được nhóm này" })).toBeVisible();
    expect(kv.stored.has("g1")).toBe(true);
    await pressKeys("Xoá nhóm");
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Xoá nhóm" }),
    );
    await waitFor(() => {
      expect(kv.stored.has("g1")).toBe(false);
    });
  });

  it("Trình duyệt chặn lưu trữ", async () => {
    useStore({
      get: () => {
        throw new Error("blocked");
      },
    });
    show(<Scoreboard groupId="g1" />);
    expect(
      await screen.findByRole("heading", { name: "Không dùng được công cụ trên trình duyệt này" }),
    ).toBeVisible();
  });

  it("the place is a number on screen, and a word for a screen reader", async () => {
    await showBoard(group(undefined, [{ p1: 20, p2: -20 }]));
    const lines = screen.getAllByRole("list").at(0)?.querySelectorAll("li") ?? [];
    const second = lines[1];
    expect(second?.querySelector("[aria-hidden]")).toHaveTextContent(/^1$|^2$/);
    expect(second).toHaveTextContent("Hạng 2");
    expect(screen.getByText("Hạng 1")).toHaveClass("sr-only");
  });

  it("reads the group again when the page is shown again", async () => {
    await showBoard(group());
    saved(group(undefined, [{ p1: 1, p2: -1 }]));
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(await screen.findByRole("button", { name: "Nhập ván 2" })).toBeInTheDocument();
  });

  it("Có dấu, Bằng điểm: places, signs, and rounds won", async () => {
    await showBoard(group(undefined, [{ p1: 20, p2: 20, p3: -15, p4: -25 }]));
    const lines = screen.getAllByRole("list").at(0)?.querySelectorAll("li") ?? [];
    expect([...lines].map((line) => line.textContent)).toEqual([
      expect.stringMatching(/Lan.*1 ván nhất.*\+20/),
      expect.stringMatching(/Minh.*1 ván nhất.*\+20/),
      expect.stringMatching(/Hạng 3.*Hùng.*0 ván nhất.*−15/),
      expect.stringMatching(/Hạng 4.*Tú.*−25/),
    ]);
  });

  it("Chưa có ván: no leader, and a word on what to do", async () => {
    await showBoard(group());
    expect(screen.getByText(/Chưa có ván nào\. Bấm/)).toBeVisible();
    expect(document.querySelector("svg.lucide-trophy")).toBeNull();
    expect(screen.getByRole("button", { name: "Nhập ván 1" })).toBeVisible();
  });

  it("Người chơi nghỉ: in the table with a label", async () => {
    await showBoard(restPlayer(group(undefined, [{ p1: 40, p4: -40 }]), "p4", NOW));
    expect(screen.getByText("Đã nghỉ")).toBeVisible();
  });

  it("Cân điểm bốn người, named a suggestion, in points", async () => {
    await showBoard(group(undefined, [{ p1: 120, p2: 30, p3: -50, p4: -100 }]));
    expect(screen.getByRole("heading", { name: "Gợi ý cân điểm" })).toBeVisible();
    expect(screen.getByText("100 điểm").closest("li")).toHaveTextContent(/Tú.*Lan/);
    expect(screen.getByText("30 điểm").closest("li")).toHaveTextContent(/Hùng.*Minh/);
    expect(screen.getByText("20 điểm").closest("li")).toHaveTextContent(/Hùng.*Lan/);
  });

  it("Đã cân", async () => {
    await showBoard(group(undefined, [{ p1: 0, p2: 0, p3: 0, p4: 0 }]));
    expect(screen.getByText("Mọi người đều 0, không cần chuyển gì.")).toBeVisible();
  });

  it("Lịch sử các ván: newest first, a focusable frame, — for one not there yet", async () => {
    let built = group(undefined, [
      { p1: 1, p2: -1 },
      { p1: 2, p2: -2 },
    ]);
    built = {
      ...built,
      players: [...built.players, { id: "p5", name: "Nam", active: true }],
      nextPlayerId: 6,
    };
    await showBoard(built);

    const frame = screen.getByRole("region", { name: "Bảng các ván" });
    expect(frame).toHaveAttribute("tabindex", "0");
    const rows = within(frame).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Tổng");
    expect(rows[2]).toContainElement(within(frame).getByRole("button", { name: "Sửa ván 2" }));
    expect(rows[3]).toContainElement(within(frame).getByRole("button", { name: "Sửa ván 1" }));
    expect(rows[2]).toHaveTextContent("—");
  });

  describe("Chia sẻ tổng kết", () => {
    const playedGroup = () => group(undefined, [{ p1: 120, p2: 30, p3: -50, p4: -100 }]);
    const stubClipboard = (writeText: (text: string) => Promise<void>) => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    };

    afterEach(() => {
      Reflect.deleteProperty(navigator, "share");
      Reflect.deleteProperty(navigator, "clipboard");
    });

    it("Máy không có bảng chia sẻ: copied, and said so", async () => {
      await showBoard(playedGroup());
      const writeText = vi.fn(() => Promise.resolve());
      stubClipboard(writeText);
      await pressKeys("Chia sẻ tổng kết");

      expect(await screen.findByRole("status")).toHaveTextContent("Đã sao chép tổng kết.");
      const text = String((writeText.mock.calls as unknown[][])[0]?.[0]);
      expect(text).toMatch(
        /^Team Dev · .+ · 1 ván\n1\. Lan: \+120\n2\. Minh: \+30\n3\. Hùng: −50\n4\. Tú: −100\n\nCân điểm:\nTú → Lan: 100 điểm/,
      );
    });

    it("the device's sheet is used when there is one", async () => {
      await showBoard(playedGroup());
      const share = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, "share", { configurable: true, value: share });
      await pressKeys("Chia sẻ tổng kết");
      expect(share).toHaveBeenCalledOnce();
    });

    it("Huỷ bảng chia sẻ: no message", async () => {
      await showBoard(playedGroup());
      const writeText = vi.fn(() => Promise.resolve());
      stubClipboard(writeText);
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: () => Promise.reject(new DOMException("cancelled", "AbortError")),
      });
      await pressKeys("Chia sẻ tổng kết");
      await act(() => Promise.resolve());
      expect(writeText).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Không sao chép được: the text in a dialog", async () => {
      await showBoard(playedGroup());
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: () => Promise.reject(new DOMException("no", "NotAllowedError")),
      });
      stubClipboard(() => Promise.reject(new Error("no")));
      await pressKeys("Chia sẻ tổng kết");
      const dialog = await screen.findByRole("dialog", { name: "Tổng kết" });
      expect(dialog).toHaveTextContent("1. Lan: +120");
    });

    it("Chưa có ván: does nothing, and says why", async () => {
      await showBoard(group());
      const writeText = vi.fn(() => Promise.resolve());
      stubClipboard(writeText);
      const button = screen.getByRole("button", { name: "Chia sẻ tổng kết" });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAccessibleDescription("Chưa có ván nào để chia sẻ.");
      await userEvent.click(button);
      expect(writeText).not.toHaveBeenCalled();
    });
  });

  it("links to Sửa nhóm and Buổi mới", async () => {
    await showBoard(group());
    expect(screen.getByRole("link", { name: "Sửa nhóm" })).toHaveAttribute(
      "href",
      "/tools/card-score/g1/edit",
    );
    expect(screen.getByRole("link", { name: "Buổi mới" })).toHaveAttribute(
      "href",
      "/tools/card-score/new?from=g1",
    );
  });

  describe("Xoá nhóm", () => {
    it("Xác nhận xoá: names the group and the rounds lost", async () => {
      await showBoard(group(undefined, [{ p1: 1, p2: -1 }]));
      await pressKeys("Xoá nhóm");
      const dialog = screen.getByRole("dialog", { name: 'Xoá nhóm "Team Dev"?' });
      expect(dialog).toHaveTextContent("1 ván sẽ mất, không hoàn tác được.");
      await userEvent.click(within(dialog).getByRole("button", { name: "Xoá nhóm" }));
      await waitFor(() => {
        expect(kv.stored.has("g1")).toBe(false);
      });
      expect(window.location.pathname).toBe("/tools/card-score");
    });

    it("Huỷ xoá", async () => {
      await showBoard(group(undefined, [{ p1: 1, p2: -1 }]));
      await pressKeys("Xoá nhóm");
      await userEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Huỷ" }),
      );
      expect(kv.stored.has("g1")).toBe(true);
    });
  });

  it("Quá giới hạn số ván: the next round cannot open, and why", async () => {
    const built = group();
    await showBoard({
      ...built,
      rounds: Array.from({ length: 500 }, (_, index) => ({
        id: `r${index}`,
        at: NOW.toISOString(),
        scores: { p1: 0, p2: 0 },
      })),
    });
    const button = screen.getByRole("button", { name: "Nhập ván 501" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(/Hãy tạo buổi mới/);
    await userEvent.click(button);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Quay lại tab cũ: comes back to the page, sees the new round, keeps what is typed", async () => {
    await showBoard(group(undefined, [{ p1: 1, p2: -1 }]));
    await pressKeys("Nhập ván 2");
    await userEvent.keyboard("7");

    saved(
      group(undefined, [
        { p1: 1, p2: -1 },
        { p1: 2, p2: -2 },
      ]),
    );
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Nhập ván 3", hidden: true })).toBeInTheDocument();
    });
    expect(field("Lan").value).toBe("7");
  });
});

describe("Màn hình nhập ván", () => {
  const openRound = async (built: CardScoreGroup = group()) => {
    saved(built);
    show(<Scoreboard groupId={built.id} />);
    await screen.findByRole("heading", { level: 1 });
    await pressKeys(`Nhập ván ${built.rounds.length + 1}`);
    return screen.getByRole("dialog");
  };
  const type = async (name: string, value: string) => {
    await userEvent.click(field(name));
    await userEvent.keyboard(value);
  };

  it("opens with the first field chosen, and one field for each one playing", async () => {
    await openRound(restPlayer(group(), "p4", NOW));
    expect(screen.getByRole("heading", { level: 2, name: "Ván 1" })).toBeVisible();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.queryByRole("textbox", { name: "Tú" })).not.toBeInTheDocument();
    expect(field("Lan")).toHaveFocus();
  });

  it("Lưu ván, Người cuối được tự tính: worked out, shown, read, saved", async () => {
    await openRound();
    await type("Lan", "-10");
    await type("Minh", "-20");
    await type("Hùng", "-5");

    expect(screen.getByText("Tú được tự tính: +35")).toBeVisible();
    expect(screen.getByText("Tự tính")).toBeVisible();
    expect(field("Tú")).toHaveAccessibleDescription("Tự tính: +35");
    expect(field("Tú").value).toBe("");
    await waitFor(() => {
      expect(
        within(screen.getByRole("dialog")).getByText("Tú được tự tính: +35", {
          selector: "[role=status]",
        }),
      ).toBeInTheDocument();
    });

    await userEvent.click(saveButton());
    await waitFor(() => {
      expect(stored().rounds).toHaveLength(1);
    });
    expect(stored().rounds[0]?.scores).toEqual({ p1: -10, p2: -20, p3: -5, p4: 35 });
    // Báo đã lưu: outside the dialog, once it has closed.
    await waitFor(() => {
      expect(screen.getByText("Đã lưu ván 1.")).toHaveAttribute("role", "status");
    });
  });

  it("Xoá số làm đổi người được tự tính", async () => {
    await openRound(group(["Lan", "Minh", "Tú"]));
    await type("Lan", "5");
    await type("Minh", "3");
    expect(screen.getByText("Tú được tự tính: −8")).toBeVisible();
    await type("Tú", "9");
    await userEvent.clear(field("Lan"));
    expect(screen.getByText("Lan được tự tính: −12")).toBeVisible();
    expect(field("Tú").value).toBe("9");
  });

  it("Còn hai ô trống: does not save, and the button says why", async () => {
    await openRound();
    await type("Lan", "5");
    await type("Minh", "-5");
    expect(screen.getByText("Còn 2 người chưa nhập")).toBeVisible();
    expect(saveButton()).toHaveAttribute("aria-disabled", "true");
    expect(saveButton()).toHaveAccessibleDescription("Còn 2 người chưa nhập");
    await userEvent.click(saveButton());
    expect(stored().rounds).toEqual([]);
  });

  it("Điền đủ mà lệch, then Đã cân", async () => {
    await openRound(group(["Lan", "Minh", "Hùng"]));
    await type("Lan", "5");
    await type("Minh", "5");
    await type("Hùng", "-5");
    expect(screen.getByText("Tổng đang lệch +5")).toBeVisible();
    expect(saveButton()).toHaveAttribute("aria-disabled", "true");

    await type("Hùng", "-10");
    expect(screen.getByText("Tổng đã bằng 0")).toBeVisible();
    expect(saveButton()).not.toHaveAttribute("aria-disabled", "true");
  });

  it("Chữ không được nhận: the field is marked, no saving", async () => {
    await openRound(group(["Lan", "Minh"]));
    await userEvent.click(field("Lan"));
    await userEvent.paste("12a");
    expect(field("Lan")).toBeInvalid();
    expect(screen.getByText("Có ô không phải số nguyên hợp lệ")).toBeVisible();
    expect(saveButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("Số quá lớn", async () => {
    await openRound(group(["Lan", "Minh"]));
    await userEvent.click(field("Lan"));
    await userEvent.paste("10000000");
    expect(field("Lan")).toBeInvalid();
  });

  it("Thay số đã nhập: choosing a field selects its number, a key replaces it", async () => {
    await openRound();
    await type("Lan", "-10");
    await type("Minh", "1");
    await type("Lan", "5");
    expect(field("Lan").value).toBe("5");
  });

  it("Gõ trên máy tính: -12, Enter to the next; no keypad", async () => {
    await openRound();
    await userEvent.keyboard("-12{Enter}");
    expect(field("Lan").value).toBe("−12");
    expect(field("Minh")).toHaveFocus();
    expect(screen.queryByRole("group", { name: "Bàn số" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dùng bàn phím của máy" })).not.toBeInTheDocument();
    expect(field("Lan")).toHaveAttribute("inputmode", "numeric");
  });

  it("Enter ở ô cuối: saves when it can, stays when not", async () => {
    await openRound(group(["Lan", "Minh", "Hùng"]));
    await userEvent.keyboard("{Enter}{Enter}5");
    expect(field("Hùng")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(stored().rounds).toEqual([]);
    expect(field("Hùng")).toHaveFocus();
    await type("Lan", "-5");
    await userEvent.click(field("Hùng"));
    await userEvent.keyboard("5{Enter}");
    await waitFor(() => {
      expect(stored().rounds).toHaveLength(1);
    });
  });

  it("Enter that belongs to the IME does not move on", async () => {
    await openRound();
    fireEvent.keyDown(field("Lan"), { key: "Enter", keyCode: 229 });
    expect(field("Lan")).toHaveFocus();
    fireEvent.keyDown(field("Lan"), { key: "Enter", isComposing: true });
    expect(field("Lan")).toHaveFocus();
  });

  it("Bấm lưu hai lần: one round", async () => {
    await openRound(group(["Lan", "Minh"]));
    await type("Lan", "5");
    const save = saveButton();
    await act(async () => {
      save.click();
      save.click();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(stored().rounds).toHaveLength(1);
    });
  });

  it("Không lưu được: stays open, with the numbers; saving again adds one round", async () => {
    const realUpdate = kv.update;
    let failing = true;
    useStore({
      update: (key, updater) =>
        failing ? Promise.reject(new Error("full")) : realUpdate(key, updater),
    });
    await openRound(group(["Lan", "Minh"]));
    await type("Lan", "5");
    await userEvent.click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa lưu được ván. Hãy thử lại.");
    expect(field("Lan").value).toBe("5");
    expect(screen.getByRole("dialog")).toHaveAttribute("open");

    failing = false;
    await userEvent.click(saveButton());
    await waitFor(() => {
      expect(stored().rounds).toHaveLength(1);
    });
  });

  it("says the round's number as it is now, when another tab saved one meanwhile", async () => {
    await openRound(group(["Lan", "Minh"]));
    await type("Lan", "5");
    saved(group(["Lan", "Minh"], [{ p1: 1, p2: -1 }]));
    await userEvent.click(saveButton());
    expect(await screen.findByText("Đã lưu ván 2.")).toBeVisible();
  });

  it("Người chơi bị xoá ở tab khác: explained, the numbers kept", async () => {
    const dialog = await openRound();
    expect(dialog).toBeVisible();
    await type("Lan", "5");
    await type("Minh", "-5");
    await type("Hùng", "0");
    // Tú goes in another tab.
    const changed = { ...stored(), players: stored().players.slice(0, 3) };
    kv.stored.set("g1", changed);
    await userEvent.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Danh sách người chơi đã đổi/);
    expect(field("Lan").value).toBe("5");
  });

  describe("Giữ ván đang nhập dở", () => {
    it("closes at once when nothing was typed", async () => {
      await openRound();
      await pressKeys("Đóng");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Đóng khi đang nhập dở: asks inside the screen; Nhập tiếp keeps the numbers", async () => {
      await openRound();
      await type("Lan", "5");
      await pressKeys("Đóng");
      expect(screen.getByRole("heading", { name: "Bỏ ván đang nhập?" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Nhập tiếp" })).toHaveFocus();
      await pressKeys("Nhập tiếp");
      expect(field("Lan").value).toBe("5");
    });

    it("Bỏ ván: closes, and leaves no draft", async () => {
      await openRound();
      await type("Lan", "5");
      await pressKeys("Đóng", "Bỏ ván");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(window.sessionStorage.length).toBe(0);
    });

    it("Esc lặp lại: the question stays, and the screen is usable after", async () => {
      const dialog = await openRound();
      await type("Lan", "5");
      const cancel = () => new Event("cancel", { cancelable: true });
      await act(async () => {
        dialog.dispatchEvent(cancel());
        dialog.dispatchEvent(cancel());
        await Promise.resolve();
      });
      expect(screen.getByRole("heading", { name: "Bỏ ván đang nhập?" })).toBeVisible();
      await pressKeys("Nhập tiếp");
      expect(field("Lan").value).toBe("5");
    });

    it("the browser closing it by itself: shown again, asking", async () => {
      const dialog = (await openRound()) as HTMLDialogElement;
      await type("Lan", "5");
      await act(async () => {
        dialog.close();
        dialog.dispatchEvent(new Event("close"));
        await Promise.resolve();
      });
      expect(dialog).toHaveAttribute("open");
      expect(screen.getByRole("heading", { name: "Bỏ ván đang nhập?" })).toBeVisible();
    });

    it("a round back from its draft still asks before closing", async () => {
      saved(group());
      const first = show(<Scoreboard groupId="g1" />);
      await screen.findByRole("heading", { level: 1 });
      await pressKeys("Nhập ván 1");
      await type("Lan", "5");
      first.unmount();

      show(<Scoreboard groupId="g1" />);
      await screen.findByRole("dialog");
      await pressKeys("Đóng");
      expect(screen.getByRole("heading", { name: "Bỏ ván đang nhập?" })).toBeVisible();
      await pressKeys("Bỏ ván");
      expect(window.sessionStorage.length).toBe(0);
    });

    it("the close button on the question goes back to the round", async () => {
      await openRound();
      await type("Lan", "5");
      await pressKeys("Đóng");
      await pressKeys("Đóng");
      expect(field("Lan").value).toBe("5");
    });

    it("the question keeps the focus where the player moved it", async () => {
      await openRound();
      await type("Lan", "5");
      await pressKeys("Đóng");
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Bỏ ván" })).toHaveFocus();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });
      expect(screen.getByRole("button", { name: "Bỏ ván" })).toHaveFocus();
    });

    it("Tải lại giữa chừng: comes back with its numbers", async () => {
      const built = group();
      saved(built);
      const first = show(<Scoreboard groupId="g1" />);
      await screen.findByRole("heading", { level: 1 });
      await pressKeys("Nhập ván 1");
      await type("Lan", "5");
      await type("Minh", "-3");
      first.unmount();

      show(<Scoreboard groupId="g1" />);
      expect(await screen.findByRole("dialog")).toBeVisible();
      expect(field("Lan").value).toBe("5");
      expect(field("Minh").value).toBe("−3");
    });

    it("those playing changed since: the draft is dropped", async () => {
      saved(group());
      const first = show(<Scoreboard groupId="g1" />);
      await screen.findByRole("heading", { level: 1 });
      await pressKeys("Nhập ván 1");
      await type("Lan", "5");
      first.unmount();

      saved(restPlayer(group(), "p4", NOW));
      show(<Scoreboard groupId="g1" />);
      await screen.findByRole("heading", { level: 1 });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(window.sessionStorage.length).toBe(0);
    });

    it("a saved round leaves no draft", async () => {
      await openRound(group(["Lan", "Minh"]));
      await type("Lan", "5");
      await userEvent.click(saveButton());
      await waitFor(() => {
        expect(stored().rounds).toHaveLength(1);
      });
      await waitFor(() => {
        expect(window.sessionStorage.length).toBe(0);
      });
    });
  });

  describe("Bàn số", () => {
    beforeEach(() => {
      pointer(true);
    });

    it("has every key, and the fields ask for no keyboard", async () => {
      await openRound();
      const pad = within(screen.getByRole("group", { name: "Bàn số" }));
      for (const key of [
        "0",
        "00",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "Đổi dấu",
        "Xoá lùi",
        "Tiếp",
        "Lưu ván",
      ]) {
        expect(pad.getByRole("button", { name: key })).toBeVisible();
      }
      expect(field("Lan")).toHaveAttribute("inputmode", "none");
    });

    it("Nhập số âm bằng bàn số", async () => {
      await openRound();
      await pressKeys("1", "2", "Đổi dấu", "Tiếp");
      expect(field("Lan").value).toBe("−12");
      expect(field("Minh")).toHaveFocus();
    });

    it("Đổi dấu khi chưa có số", async () => {
      await openRound();
      await pressKeys("Đổi dấu", "5");
      expect(field("Lan").value).toBe("−5");
    });

    it("Đổi dấu số đã có", async () => {
      await openRound();
      await pressKeys("1", "0", "Tiếp");
      await userEvent.click(field("Lan"));
      await pressKeys("Đổi dấu");
      expect(field("Lan").value).toBe("−10");
    });

    it("Thay số, Xoá lùi ô vừa chọn: the whole number goes", async () => {
      await openRound();
      await pressKeys("1", "2", "0", "Đổi dấu", "Tiếp");
      await userEvent.click(field("Lan"));
      await pressKeys("Xoá lùi");
      expect(field("Lan").value).toBe("");
      await pressKeys("7", "3", "Xoá lùi");
      expect(field("Lan").value).toBe("7");
    });

    it("Tiếp tới ô trống kế tiếp, going round", async () => {
      await openRound();
      // Rows 2 and 3 filled, row 4 and row 1 blank; row 3 chosen.
      await userEvent.click(field("Minh"));
      await pressKeys("1");
      await userEvent.click(field("Hùng"));
      await pressKeys("2", "Tiếp");
      expect(field("Tú")).toHaveFocus();
      await pressKeys("Tiếp");
      expect(field("Lan")).toHaveFocus();
    });

    it("Lưu ván on the keypad: only when it can, no second one at the top", async () => {
      await openRound(group(["Lan", "Minh"]));
      expect(screen.getAllByRole("button", { name: "Lưu ván" })).toHaveLength(1);
      expect(saveButton()).toHaveAttribute("aria-disabled", "true");
      await userEvent.click(saveButton());
      expect(stored().rounds).toEqual([]);
      await pressKeys("5");
      expect(saveButton()).not.toHaveAttribute("aria-disabled", "true");
      await userEvent.click(saveButton());
      await waitFor(() => {
        expect(stored().rounds[0]?.scores).toEqual({ p1: 5, p2: -5 });
      });
    });

    it("back from another app, the same field goes on: the digits are not lost", async () => {
      await openRound();
      await pressKeys("1", "2");
      fireEvent.blur(field("Lan"), { relatedTarget: null });
      fireEvent.focus(field("Lan"), { relatedTarget: null });
      await pressKeys("3");
      expect(field("Lan").value).toBe("123");
    });

    it("the device's keyboard has a sign button: some have no minus", async () => {
      await openRound();
      await pressKeys("Dùng bàn phím của máy", "Đổi dấu");
      await userEvent.keyboard("7");
      expect(field("Lan").value).toBe("−7");
    });

    it("Đổi sang bàn phím của máy: remembered", async () => {
      const first = await openRound();
      expect(first).toBeVisible();
      await pressKeys("Dùng bàn phím của máy");
      expect(screen.queryByRole("group", { name: "Bàn số" })).not.toBeInTheDocument();
      expect(field("Lan")).toHaveAttribute("inputmode", "numeric");
      expect(saveButton()).toBeVisible();
      await pressKeys("Đóng");

      await pressKeys("Nhập ván 1");
      expect(screen.queryByRole("group", { name: "Bàn số" })).not.toBeInTheDocument();
      await pressKeys("Dùng bàn số");
      expect(screen.getByRole("group", { name: "Bàn số" })).toBeVisible();
    });
  });

  describe("Sửa và xoá ván đã lưu", () => {
    const openEdit = async (built: CardScoreGroup, number: number) => {
      saved(built);
      show(<Scoreboard groupId={built.id} />);
      await screen.findByRole("heading", { level: 1 });
      await pressKeys(`Sửa ván ${number}`);
    };

    it("Sửa ván cũ: filled in, the totals follow", async () => {
      await openEdit(
        group(
          ["Lan", "Minh"],
          [
            { p1: 5, p2: -5 },
            { p1: 1, p2: -1 },
          ],
        ),
        1,
      );
      expect(screen.getByRole("heading", { level: 2, name: "Sửa ván 1" })).toBeVisible();
      expect(field("Lan").value).toBe("5");
      expect(field("Minh").value).toBe("−5");
      await type("Lan", "8");
      await type("Minh", "-8");
      await userEvent.click(saveButton());
      await waitFor(() => {
        expect(stored().rounds[0]?.scores).toEqual({ p1: 8, p2: -8 });
      });
      expect(await screen.findByText("Đã sửa ván 1.")).toBeVisible();
    });

    it("Xoá ván: asks inside the screen, then renumbers; the focus goes to the next round's button", async () => {
      await openEdit(
        group(
          ["Lan", "Minh"],
          [
            { p1: 1, p2: -1 },
            { p1: 2, p2: -2 },
            { p1: 3, p2: -3 },
          ],
        ),
        2,
      );
      await pressKeys("Xoá ván này");
      expect(screen.getByRole("heading", { name: "Xoá ván 2?" })).toBeVisible();
      await pressKeys("Xoá ván");
      await waitFor(() => {
        expect(stored().rounds.map((round) => round.scores.p1)).toEqual([1, 3]);
      });
      expect(await screen.findByText("Đã xoá ván 2.")).toBeVisible();
      expect(screen.getByRole("button", { name: "Sửa ván 2" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Sửa ván 3" })).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Nhập ván 3" })).toHaveFocus();
      });
    });

    it("Giữ lại: nothing goes", async () => {
      await openEdit(group(["Lan", "Minh"], [{ p1: 1, p2: -1 }]), 1);
      await pressKeys("Xoá ván này", "Giữ lại");
      expect(field("Lan").value).toBe("1");
      expect(stored().rounds).toHaveLength(1);
    });

    it("Sửa ván có người đã nghỉ: those of that round, not the newcomer", async () => {
      let built = restPlayer(group(undefined, [{ p1: 1, p2: -1, p4: 0 }]), "p4", NOW);
      built = {
        ...built,
        players: [...built.players, { id: "p5", name: "Nam", active: true }],
        nextPlayerId: 6,
      };
      await openEdit(built, 1);
      expect(field("Tú")).toBeVisible();
      expect(screen.queryByRole("textbox", { name: "Nam" })).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Hùng" })).not.toBeInTheDocument();
    });

    it("Sửa ngay ván vừa lưu: from the message", async () => {
      await openRound(group(["Lan", "Minh"]));
      await type("Lan", "5");
      await userEvent.click(saveButton());
      await screen.findByText("Đã lưu ván 1.");
      const message = screen.getByText("Đã lưu ván 1.").closest("div");
      if (message === null) throw new Error("no message");
      await userEvent.click(within(message).getByRole("button", { name: "Sửa ván 1" }));
      expect(screen.getByRole("heading", { level: 2, name: "Sửa ván 1" })).toBeVisible();
    });

    it("no draft is kept of an edit", async () => {
      await openEdit(group(["Lan", "Minh"], [{ p1: 5, p2: -5 }]), 1);
      await type("Lan", "8");
      expect(window.sessionStorage.length).toBe(0);
    });
  });
});
