import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { BlockedFigure, HoldFigure } from "./rules/figures";

/**
 * The rules of Đội gom thạch as the app plays them (`openspec/specs/jelly-crew`): the team's goal,
 * everyone moving at any time, pushing and sticking, characters in the way, plates and doors, the
 * end without losing, resetting the map, the maps, and giving up.
 */
export function JellyCrewRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection place={place} title={t("jelly-crew.goal.title")}>
        <p>{t.rich("jelly-crew.goal.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("jelly-crew.turn.title")}>
        <p>{t.rich("jelly-crew.turn.body", RULES_TAGS)}</p>
        <p>{t("jelly-crew.turn.body2")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("jelly-crew.jelly.title")}>
        <p>{t.rich("jelly-crew.jelly.body", RULES_TAGS)}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich("jelly-crew.jelly.grass", RULES_TAGS)}</li>
          <li>{t.rich("jelly-crew.jelly.ice", RULES_TAGS)}</li>
        </ul>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("jelly-crew.block.title")}
        figures={
          <BlockedFigure
            label={t("jelly-crew.figures.blocked.label")}
            caption={t.rich("jelly-crew.figures.blocked.caption", RULES_TAGS)}
          />
        }
      >
        <p>{t("jelly-crew.block.body")}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("jelly-crew.doors.title")}
        figures={
          <HoldFigure
            label={t("jelly-crew.figures.hold.label")}
            caption={t.rich("jelly-crew.figures.hold.caption", RULES_TAGS)}
          />
        }
      >
        <p>{t.rich("jelly-crew.doors.body", RULES_TAGS)}</p>
        <p>{t("jelly-crew.doors.body2")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("jelly-crew.end.title")}>
        <p>{t.rich("jelly-crew.end.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("jelly-crew.tools.title")}>
        <p>{t.rich("jelly-crew.tools.reset", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("jelly-crew.maps.title")}>
        <p>{t.rich("jelly-crew.maps.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="freeTeam" vsAi={false} />
    </>
  );
}
