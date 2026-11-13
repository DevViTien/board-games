import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { CannonFigure, HorseFigure } from "./rules/figures";

/** The rules of Cờ tướng (`openspec/specs/xiangqi`, spec "Luật Cờ tướng"). */
export function XiangqiRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection place={place} title={t("xiangqi.goal.title")}>
        <p>{t.rich("xiangqi.goal.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("xiangqi.board.title")}>
        <p>{t.rich("xiangqi.board.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("xiangqi.pieces.title")}
        figures={
          <>
            <HorseFigure
              label={t("xiangqi.figures.horse.label")}
              caption={t("xiangqi.figures.horse.caption")}
            />
            <CannonFigure
              label={t("xiangqi.figures.cannon.label")}
              caption={t("xiangqi.figures.cannon.caption")}
            />
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          <li>{t.rich("xiangqi.pieces.general", RULES_TAGS)}</li>
          <li>{t.rich("xiangqi.pieces.advisor", RULES_TAGS)}</li>
          <li>{t.rich("xiangqi.pieces.elephant", RULES_TAGS)}</li>
          <li>{t.rich("xiangqi.pieces.horse", RULES_TAGS)}</li>
          <li>{t.rich("xiangqi.pieces.rook", RULES_TAGS)}</li>
          <li>{t.rich("xiangqi.pieces.cannon", RULES_TAGS)}</li>
          <li>{t.rich("xiangqi.pieces.soldier", RULES_TAGS)}</li>
        </ul>
      </RulesSection>
      <RulesSection place={place} title={t("xiangqi.check.title")}>
        <p>{t.rich("xiangqi.check.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("xiangqi.end.title")}>
        <p>{t.rich("xiangqi.end.body", RULES_TAGS)}</p>
        <p>{t.rich("xiangqi.end.perpetual", RULES_TAGS)}</p>
        <p>{t.rich("xiangqi.end.quiet", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("xiangqi.notation.title")}>
        <p>{t.rich("xiangqi.notation.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="two" vsAi />
    </>
  );
}
