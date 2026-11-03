import { IN_STABLE, type LudoMove, type LudoState, OWN_GATE } from "@board-games/games/ludo";
import { useTranslations } from "next-intl";

import { useLudoPlayerLabel } from "./player-label";

/**
 * Where a horse at `progress` stands, as players name it: in its stable, on a square counted from
 * its own start square (1–56), on its own home entry (chân chuồng), or on home step 1–6.
 */
type HorsePlace =
  | { readonly kind: "stable" }
  | { readonly kind: "cell"; readonly cell: number }
  | { readonly kind: "gate" }
  | { readonly kind: "step"; readonly step: number };

function placeOf(progress: number): HorsePlace {
  if (progress === IN_STABLE) return { kind: "stable" };
  if (progress < OWN_GATE) return { kind: "cell", cell: progress + 1 };
  if (progress === OWN_GATE) return { kind: "gate" };
  return { kind: "step", step: progress - OWN_GATE };
}

/** Labels shared by the move label and the board's choices. */
export function useLudoText() {
  const t = useTranslations("Games.ludo");
  const colour = useLudoPlayerLabel();
  return {
    colour,
    /** Where a horse goes, after "Ngựa 2:" ("tới ô 17", "ra chuồng"). */
    target(from: number, to: number): string {
      if (from === IN_STABLE) return t("target.out");
      const place = placeOf(to);
      switch (place.kind) {
        case "gate":
          return t("target.gate");
        case "step":
          return t("target.step", { step: place.step });
        default:
          return t("target.cell", { cell: place.kind === "cell" ? place.cell : 0 });
      }
    },
    /** A horse's move as an action ("đi ngựa 2 tới ô 17"), horses counted from 1. */
    horseMove(horse: number, from: number, to: number): string {
      const number = horse + 1;
      if (from === IN_STABLE) return t("move.out", { number });
      const place = placeOf(to);
      switch (place.kind) {
        case "gate":
          return t("move.gate", { number });
        case "step":
          return t("move.step", { number, step: place.step });
        default:
          return t("move.cell", { number, cell: place.kind === "cell" ? place.cell : 0 });
      }
    },
    /** Where a horse stands, for the list of positions ("ô 17"). */
    place(progress: number): string {
      const place = placeOf(progress);
      switch (place.kind) {
        case "stable":
          return t("where.stable");
        case "gate":
          return t("where.gate");
        case "step":
          return t("where.step", { step: place.step });
        default:
          return t("where.cell", { cell: place.cell });
      }
    },
  };
}

/**
 * A move read out from what it did (`state.last`, the state after it): a roll with its number,
 * the turn lost or a roll again after a 6 that moved nothing; a horse brought out, moved to a
 * square, its home entry or a home step, with the horse it kicked.
 */
export function useLudoMoveLabel(): (move: LudoMove, state: LudoState) => string {
  const t = useTranslations("Games.ludo");
  const text = useLudoText();
  return (_move, state) => {
    const { last } = state;
    if (last === null) return "";
    if (last.kind === "roll") {
      if (last.lost) return t("move.lost", { face: last.face });
      return last.again ? t("move.again") : t("move.roll", { face: last.face });
    }
    const action = text.horseMove(last.horse, last.from, last.to);
    return last.kicked === null
      ? action
      : t("moveKick", { action, colour: text.colour(last.kicked.player, state) });
  };
}
