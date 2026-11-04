import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { HomeFigure } from "./rules/home";
import { JumpFigure } from "./rules/jump";
import { PathFigure } from "./rules/path";

/**
 * The rules of Cờ cá ngựa as the app plays them (`openspec/specs/ludo`): out with a 6 only onto a
 * start square free of one's own horses, another roll after a 6, no passing, sending home, the
 * forced jump of a 1 to the next home entry, climbing home by steps, and winning on steps 3–6.
 */
export function LudoRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection
        place={place}
        title={t("ludo.board.title")}
        figures={
          <PathFigure
            label={t("ludo.figures.path.label")}
            caption={t("ludo.figures.path.caption")}
          />
        }
      >
        <p>{t("ludo.board.body")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("ludo.turn.title")}>
        <p>{t.rich("ludo.turn.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("ludo.out.title")}>
        <p>{t.rich("ludo.out.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("ludo.move.title")}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("ludo.move.item1")}</li>
          <li>{t("ludo.move.item2")}</li>
          <li>{t("ludo.move.item3")}</li>
          <li>{t.rich("ludo.move.item4", RULES_TAGS)}</li>
          <li>{t("ludo.move.item5")}</li>
        </ul>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("ludo.one.title")}
        figures={
          <JumpFigure
            label={t("ludo.figures.jump.label")}
            caption={t.rich("ludo.figures.jump.caption", RULES_TAGS)}
          />
        }
      >
        <p>{t.rich("ludo.one.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("ludo.home.title")}
        figures={
          <HomeFigure
            label={t("ludo.figures.home.label")}
            caption={t("ludo.figures.home.caption")}
          />
        }
      >
        <p>{t("ludo.home.body")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("ludo.win.title")}>
        <p>{t.rich("ludo.win.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="standIn" vsAi />
    </>
  );
}
