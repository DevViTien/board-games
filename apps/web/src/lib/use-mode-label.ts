import type { AiLevel } from "@board-games/engine";
import { useTranslations } from "next-intl";

import type { ModeSettings, SeatController } from "@/transport/types";

/** The seats a saved game was set up with; every seat of a same-device game is a person here. */
export function seatsOf(settings: ModeSettings): readonly SeatController[] {
  return settings.kind === "ai" ? settings.seats : [];
}

/**
 * Hook returning how a game's mode is named, the same on the menu, the setup screen and the play
 * screen: "Same device" without an AI seat, "Vs computer · Hard" when every AI seat plays one
 * level, and just "Vs computer" when they play several (M6).
 */
export function useModeLabel(): (seats: readonly SeatController[]) => string {
  const t = useTranslations("Modes");
  const tLevels = useTranslations("Levels");
  return (seats) => {
    const levels = new Set<AiLevel>(
      seats.flatMap((seat) => (seat.kind === "ai" ? [seat.level] : [])),
    );
    if (levels.size === 0) return t("local");
    const [level] = levels;
    if (levels.size === 1 && level !== undefined) return t("aiLevel", { level: tLevels(level) });
    return t("ai");
  };
}
