import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesFigure } from "@/features/rules/RulesFigure";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { MiniTable } from "./rules/table";

const [A, B, C, D, E] = [0, 1, 2, 3, 4] as const;

/** The rules of Tam giác cấm (`openspec/specs/forbidden-triangle`, spec "Luật Tam giác cấm"). */
export function ForbiddenTriangleRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection place={place} title={t("forbidden-triangle.goal.title")}>
        <p>{t.rich("forbidden-triangle.goal.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("forbidden-triangle.moves.title")}>
        <p>{t.rich("forbidden-triangle.moves.body", RULES_TAGS)}</p>
        <p>{t.rich("forbidden-triangle.moves.warning", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("forbidden-triangle.lose.title")}
        figures={
          <RulesFigure
            label={t("forbidden-triangle.figures.closed.label")}
            caption={t("forbidden-triangle.figures.closed.caption")}
            viewBox="0 0 100 100"
          >
            <MiniTable
              guests={6}
              x={0}
              size={100}
              lines={[
                [A, B, 0],
                [B, C, 0],
                [A, C, 0],
                [C, D, 1],
                [D, E, 1],
              ]}
              triangle={{ guests: [A, B, C], owner: 0 }}
            />
          </RulesFigure>
        }
      >
        <p>{t.rich("forbidden-triangle.lose.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("forbidden-triangle.draw.title")}
        figures={
          <RulesFigure
            label={t("forbidden-triangle.figures.five.label")}
            caption={t("forbidden-triangle.figures.five.caption")}
            viewBox="0 0 100 100"
          >
            <MiniTable
              guests={5}
              x={0}
              size={100}
              lines={[
                [A, B, 0],
                [B, C, 0],
                [C, D, 0],
                [D, E, 0],
                [E, A, 0],
                [A, C, 1],
                [C, E, 1],
                [E, B, 1],
                [B, D, 1],
                [D, A, 1],
              ]}
            />
          </RulesFigure>
        }
      >
        <p>{t.rich("forbidden-triangle.draw.body", RULES_TAGS)}</p>
        <p>{t.rich("forbidden-triangle.draw.theorem", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("forbidden-triangle.tables.title")}>
        <p>{t.rich("forbidden-triangle.tables.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="two" vsAi />
    </>
  );
}
