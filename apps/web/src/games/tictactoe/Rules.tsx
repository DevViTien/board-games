import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { LinesFigure } from "./rules/lines";

/** The rules of Tic-tac-toe (`openspec/specs/tictactoe`). */
export function TicTacToeRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection place={place} title={t("tictactoe.goal.title")}>
        <p>{t("tictactoe.goal.body")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("tictactoe.moves.title")}>
        <p>{t.rich("tictactoe.moves.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("tictactoe.win.title")}
        figures={
          <LinesFigure
            label={t("tictactoe.figures.lines.label")}
            caption={t("tictactoe.figures.lines.caption")}
          />
        }
      >
        <p>{t("tictactoe.win.body")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("tictactoe.draw.title")}>
        <p>{t("tictactoe.draw.body")}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="two" vsAi />
    </>
  );
}
