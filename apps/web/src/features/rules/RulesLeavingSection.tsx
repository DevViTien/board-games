import { RULES_TAGS } from "./rich";
import { RulesSection } from "./RulesSection";
import type { RulesPlace, RulesTranslator } from "./types";

interface RulesLeavingSectionProps {
  readonly t: RulesTranslator;
  readonly place: RulesPlace;
  /**
   * What happens to whoever resigns or leaves online: the game ends and the others win (a room of
   * two, a game without an AI), or, in a room of three or four, the computer plays for them, or,
   * in a cooperative game (`team`), the game stops for everyone and nobody wins.
   */
  readonly rooms: "two" | "standIn" | "team";
  /** Whether the game can be played against the computer (then resigning hands it the win). */
  readonly vsAi: boolean;
}

/** The section every game's rules end with: resigning, and a turn left for 5 minutes. */
export function RulesLeavingSection({ t, place, rooms, vsAi }: RulesLeavingSectionProps) {
  return (
    <RulesSection
      place={place}
      title={rooms === "team" ? t("common.leaving.titleTeam") : t("common.leaving.title")}
    >
      {rooms === "team" ? (
        <>
          <p>{t.rich("common.leaving.giveUp", RULES_TAGS)}</p>
          <p>{t.rich("common.leaving.abandonTeam", RULES_TAGS)}</p>
        </>
      ) : (
        <p>{t.rich("common.leaving.resign", RULES_TAGS)}</p>
      )}
      {rooms === "team" ? null : rooms === "two" ? (
        <p>{t.rich("common.leaving.abandon", RULES_TAGS)}</p>
      ) : (
        <>
          <p>{t.rich("common.leaving.abandonRoom", RULES_TAGS)}</p>
          <p>{t.rich("common.leaving.standIn", RULES_TAGS)}</p>
        </>
      )}
      {vsAi && <p>{t("common.leaving.vsAi")}</p>}
    </RulesSection>
  );
}
