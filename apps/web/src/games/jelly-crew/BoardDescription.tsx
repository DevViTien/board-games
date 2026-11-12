"use client";

import {
  type JellyCrewKind,
  jellyCrewLayoutOf,
  jellyCrewOpenDoors,
  type JellyCrewState,
} from "@board-games/games/jelly-crew";
import { useTranslations } from "next-intl";

import { useGroupSign, useJellyCrewPlayerLabel } from "./words";

/**
 * The map in words, row by row (spec "Dùng được bằng trình đọc màn hình"): in each row, the columns
 * holding a character, jelly, a mold, a plate or a door, and what. For screen readers only: the
 * drawing says the same to the eye.
 */
export function BoardDescription({ state, label }: { state: JellyCrewState; label: string }) {
  const t = useTranslations("Games.jelly-crew");
  const seatName = useJellyCrewPlayerLabel();
  const sign = useGroupSign();
  const grid = jellyCrewLayoutOf(state);
  const open = jellyCrewOpenDoors(grid, state.board);
  const kindAt = new Map<number, JellyCrewKind>();
  for (const piece of state.board.pieces) {
    piece.cells.forEach((cell, index) => {
      const kind = piece.kinds[index];
      if (kind !== undefined) kindAt.set(cell, kind);
    });
  }

  const rows = Array.from({ length: grid.height }, (_, y) => {
    const cells = Array.from({ length: grid.width }, (_unused, x) => {
      const cell = y * grid.width + x;
      const things: string[] = [];
      const seat = state.board.chars.indexOf(cell);
      if (seat !== -1) things.push(t("describe.char", { name: seatName(seat), seat: seat + 1 }));
      const kind = kindAt.get(cell);
      if (kind !== undefined) things.push(t(`kinds.${kind}`));
      const mold = grid.molds.get(cell);
      if (mold !== undefined) things.push(t(`moldKinds.${mold}`));
      const plate = grid.plates.get(cell);
      if (plate !== undefined) things.push(t("describe.plate", { group: sign(plate) }));
      const door = grid.doors.get(cell);
      if (door !== undefined) {
        things.push(
          t(open.has(cell) ? "describe.doorOpen" : "describe.doorClosed", { group: sign(door) }),
        );
      }
      return things.length === 0
        ? null
        : t("describe.cell", { col: x + 1, things: things.join(", ") });
    }).filter((text) => text !== null);
    return cells.length === 0
      ? null
      : { row: y + 1, text: t("describe.row", { row: y + 1, cells: cells.join("; ") }) };
  }).filter((row) => row !== null);

  return (
    <div className="sr-only">
      <p>{label}</p>
      <ul aria-label={t("describe.title")}>
        {rows.map(({ row, text }) => (
          <li key={row}>{text}</li>
        ))}
      </ul>
    </div>
  );
}
