import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { BREAK_STEPS, BreakFigure, GateFigure, PlaceFigure, SealedFigure } from "./rules/figures";

/**
 * The rules of Cờ rào as the app plays them (`openspec/specs/fence-race`): the gate of five cells,
 * the board and fences by the number of players, one thing a turn, fences that may not overlap,
 * cross or seal anyone in, one break, and the limit of moves.
 */
export function FenceRaceRules({ t, place }: GameRulesProps) {
  const steps = BREAK_STEPS;
  return (
    <>
      <RulesSection
        place={place}
        title={t("fence-race.goal.title")}
        figures={
          <GateFigure
            label={t("fence-race.figures.gate.label")}
            caption={t.rich("fence-race.figures.gate.caption", RULES_TAGS)}
          />
        }
      >
        <p>{t.rich("fence-race.goal.body", RULES_TAGS)}</p>
        <p>{t("fence-race.goal.body2")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("fence-race.board.title")}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich("fence-race.board.two", RULES_TAGS)}</li>
          <li>{t.rich("fence-race.board.three", RULES_TAGS)}</li>
          <li>{t.rich("fence-race.board.four", RULES_TAGS)}</li>
        </ul>
        <p>{t("fence-race.board.body")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("fence-race.turn.title")}>
        <p>{t.rich("fence-race.turn.body", RULES_TAGS)}</p>
        <p>{t.rich("fence-race.turn.body2", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("fence-race.place.title")}
        figures={
          <PlaceFigure
            label={t("fence-race.figures.place.label")}
            caption={t.rich("fence-race.figures.place.caption", RULES_TAGS)}
            ok={t("fence-race.figures.place.ok")}
            overlap={t("fence-race.figures.place.overlap")}
            cross={t("fence-race.figures.place.cross")}
          />
        }
      >
        <p>{t.rich("fence-race.place.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("fence-race.way.title")}
        figures={
          <SealedFigure
            label={t("fence-race.figures.sealed.label")}
            caption={t.rich("fence-race.figures.sealed.caption", RULES_TAGS)}
          />
        }
      >
        <p>{t.rich("fence-race.way.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("fence-race.break.title")}
        figures={
          <BreakFigure
            label={t("fence-race.figures.break.label", steps)}
            caption={t.rich("fence-race.figures.break.caption", { ...RULES_TAGS, ...steps })}
            stepsBefore={t("fence-race.figures.break.steps", { count: steps.before })}
            stepsAfter={t("fence-race.figures.break.steps", { count: steps.after })}
          />
        }
      >
        <p>{t.rich("fence-race.break.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("fence-race.end.title")}>
        <p>{t.rich("fence-race.end.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="standIn" vsAi />
    </>
  );
}
