import "./theme.css";

import { RULES_TAGS } from "@/features/rules/rich";
import { RulesLeavingSection } from "@/features/rules/RulesLeavingSection";
import { RulesSection } from "@/features/rules/RulesSection";
import type { GameRulesProps } from "@/features/rules/types";

import { CastlingFigure } from "./rules/castling";
import { EnPassantFigure } from "./rules/en-passant";
import { MovesFigure } from "./rules/moves";
import { PromotionFigure } from "./rules/promotion";

const PIECES = ["king", "queen", "rook", "bishop", "knight", "pawn"] as const;
const ENDINGS = ["checkmate", "stalemate", "automatic", "claim"] as const;

/**
 * The rules of Cờ vua (`openspec/specs/chess`): how each piece moves, castling, en passant,
 * promotion, and how a game ends, automatic draws apart from the draws a player claims. Ends with
 * the credit of the "staunty" pieces; its link to the licences only on the page, as the dialog
 * must not lead away from a game.
 */
export function ChessRules({ t, place }: GameRulesProps) {
  return (
    <>
      <RulesSection place={place} title={t("chess.goal.title")}>
        <p>{t.rich("chess.goal.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection place={place} title={t("chess.board.title")}>
        <p>{t.rich("chess.board.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("chess.pieces.title")}
        figures={
          <MovesFigure
            label={t("chess.figures.moves.label")}
            caption={t("chess.figures.moves.caption")}
          />
        }
      >
        <ul className="list-disc space-y-1 pl-5">
          {PIECES.map((piece) => (
            <li key={piece}>{t.rich(`chess.pieces.${piece}`, RULES_TAGS)}</li>
          ))}
        </ul>
        <p>{t("chess.pieces.capture")}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("chess.castling.title")}
        figures={
          <CastlingFigure
            label={t("chess.figures.castling.label")}
            caption={t("chess.figures.castling.caption")}
          />
        }
      >
        <p>{t("chess.castling.body")}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("chess.enPassant.title")}
        figures={
          <EnPassantFigure
            label={t("chess.figures.enPassant.label")}
            caption={t("chess.figures.enPassant.caption")}
          />
        }
      >
        <p>{t.rich("chess.enPassant.body", RULES_TAGS)}</p>
      </RulesSection>
      <RulesSection
        place={place}
        title={t("chess.promotion.title")}
        figures={
          <PromotionFigure
            label={t("chess.figures.promotion.label")}
            caption={t("chess.figures.promotion.caption")}
          />
        }
      >
        <p>{t("chess.promotion.body")}</p>
      </RulesSection>
      <RulesSection place={place} title={t("chess.end.title")}>
        <ul className="list-disc space-y-1 pl-5">
          {ENDINGS.map((ending) => (
            <li key={ending}>{t.rich(`chess.end.${ending}`, RULES_TAGS)}</li>
          ))}
        </ul>
      </RulesSection>
      <RulesLeavingSection t={t} place={place} rooms="two" vsAi={false} />
      <p className="text-small text-fg-muted">
        {t("chess.credit")}
        {place === "page" && (
          <>
            {" "}
            <a
              href="/third-party-licenses.txt"
              className="focus-ring rounded-sm underline underline-offset-2 hover:text-fg"
            >
              {t("chess.licence")}
            </a>
          </>
        )}
      </p>
    </>
  );
}
