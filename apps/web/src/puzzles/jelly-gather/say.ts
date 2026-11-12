"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

import {
  BLOCKED,
  type Blocked,
  type Board,
  type JellyKind,
  type Level,
  type Outcome,
} from "./rules/types";

/** What screen readers hear about the board and each move (spec "Đọc được bàn và kết quả mỗi bước"). */
export function useSay() {
  const t = useTranslations("JellyGather");
  const format = useFormatter();
  const kindName = useCallback((kind: JellyKind) => t(`kinds.${kind}`), [t]);
  const list = useCallback(
    (kinds: readonly JellyKind[]) => format.list(kinds.map(kindName), { type: "conjunction" }),
    [format, kindName],
  );

  /** One move's result, in the order it happened. */
  const outcome = useCallback(
    (level: Level, result: Outcome, steps: number) => {
      const parts: string[] = [];
      if (result.pushed.length > 0) parts.push(t("say.pushed", { kinds: list(result.pushed) }));
      else {
        parts.push(
          t("say.at", {
            row: Math.floor(result.player / level.width) + 1,
            col: (result.player % level.width) + 1,
          }),
        );
      }
      for (const { colour, pieces } of result.stuck) {
        parts.push(t("say.stuck", { kind: kindName(colour), count: pieces }));
      }
      if (result.glued.length > 0) parts.push(t("say.glued", { kinds: list(result.glued) }));
      if (result.fixed) parts.push(t("say.fixed"));
      if (result.solved) parts.push(t("say.solved", { count: steps }));
      return parts.join(" ");
    },
    [kindName, list, t],
  );

  const blocked = useCallback(
    (reason: Blocked) =>
      reason === BLOCKED.Wall
        ? t("say.wall")
        : reason === BLOCKED.Fixed
          ? t("say.fixedBlock")
          : t("say.jam"),
    [t],
  );

  /** The board as text, one entry a row, with runs of the same thing told once. */
  const rows = useCallback(
    (level: Level, board: Board): string[] => {
      const at = new Map<number, { kind: JellyKind; fixed: boolean }>();
      for (const piece of board.pieces) {
        piece.cells.forEach((cell, index) => {
          const kind = piece.kinds[index];
          if (kind !== undefined) at.set(cell, { kind, fixed: piece.fixed });
        });
      }
      return Array.from({ length: level.height }, (_, row) => {
        const runs: { key: string; text: (count: number) => string; count: number }[] = [];
        for (let col = 0; col < level.width; col += 1) {
          const cell = row * level.width + col;
          const thing = at.get(cell);
          const entry =
            cell === board.player
              ? { key: "player", text: () => t("cell.player") }
              : level.walls.has(cell)
                ? { key: "wall", text: (count: number) => t("cell.wall", { count }) }
                : thing === undefined
                  ? { key: "floor", text: (count: number) => t("cell.floor", { count }) }
                  : {
                      key: `${thing.kind}${thing.fixed ? "!" : ""}`,
                      text: (count: number) => {
                        const name = thing.fixed
                          ? t("cell.fixed", { name: kindName(thing.kind) })
                          : kindName(thing.kind);
                        return t("cell.piece", { count, name });
                      },
                    };
          const last = runs.at(-1);
          if (last?.key === entry.key && entry.key !== "player") last.count += 1;
          else runs.push({ ...entry, count: 1 });
        }
        return t("cell.row", {
          row: row + 1,
          cells: runs.map((run) => run.text(run.count)).join(t("cell.separator")),
        });
      });
    },
    [kindName, t],
  );

  return { outcome, blocked, rows };
}
