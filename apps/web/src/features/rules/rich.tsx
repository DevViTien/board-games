import type { ReactNode } from "react";

/**
 * The tags the rules' messages may use: `<b>` for what matters most in a paragraph, `<yes>` and
 * `<no>` for whether a figure shows a win, in words that say it (colour is never the only sign).
 */
export const RULES_TAGS = {
  b: (chunks: ReactNode) => <b className="font-bold">{chunks}</b>,
  yes: (chunks: ReactNode) => <strong className="font-bold text-success-ink">{chunks}</strong>,
  no: (chunks: ReactNode) => <strong className="font-bold text-danger-ink">{chunks}</strong>,
};
