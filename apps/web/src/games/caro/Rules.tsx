import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { BlockedFigure } from "./rules/blocked";
import { EdgeFigure } from "./rules/edge";
import { FiveFigure } from "./rules/five";

/** The rules of Cờ caro (`openspec/specs/caro`): both board sizes and both winning rules. */
export function CaroRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection place={place} title={t("caro.goal.title")}>
        <p>{t.rich("caro.goal.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("caro.board.title")}>
        <p>{t.rich("caro.board.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("caro.free.title")}
        figures={
          <FiveFigure
            label={t("caro.figures.five.label")}
            caption={t.rich("caro.figures.five.caption", RULES_TAGS)}
          />
        }
      >
        <p>{t("caro.free.body")}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("caro.blocked.title")}
        figures={
          <>
            <BlockedFigure
              label={t("caro.figures.blocked.label")}
              caption={t.rich("caro.figures.blocked.caption", RULES_TAGS)}
            />
            <EdgeFigure
              label={t("caro.figures.edge.label")}
              caption={t.rich("caro.figures.edge.caption", RULES_TAGS)}
            />
          </>
        }
      >
        <p>{t.rich("caro.blocked.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("caro.draw.title")}>
        <p>{t("caro.draw.body")}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="two" vsAi />
    </>
  );
}
