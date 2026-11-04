import { cn } from "@board-games/ui";
import type { ReactNode } from "react";

import type { RulesPlace } from "./types";

interface RulesSectionProps {
  readonly place: RulesPlace;
  readonly title: ReactNode;
  /** The section's words: paragraphs or a list. */
  readonly children: ReactNode;
  /** The section's figures (`RulesFigure`), beside the words where there is room, else below. */
  readonly figures?: ReactNode;
}

/**
 * One section of a game's rules: a heading (`h2` on the page, `h3` in the dialog), a short text
 * column, and its figures. Two columns once its container is 48rem wide (a laptop's page), one in
 * the dialog and on a phone: the layout follows the room the section has, not the screen.
 */
export function RulesSection({ place, title, children, figures }: RulesSectionProps) {
  const Heading = place === "page" ? "h2" : "h3";
  return (
    <section
      className={cn(
        "grid gap-3",
        figures !== undefined &&
          "@3xl:grid-cols-[minmax(0,1fr)_22.5rem] @3xl:items-start @3xl:gap-8",
      )}
    >
      <div className="flex max-w-[68ch] min-w-0 flex-col gap-2">
        <Heading
          className={cn("text-balance", place === "page" ? "text-heading" : "text-body font-bold")}
        >
          {title}
        </Heading>
        <div className="flex flex-col gap-2 text-body text-pretty">{children}</div>
      </div>
      {figures !== undefined && <div className="flex min-w-0 flex-col gap-3">{figures}</div>}
    </section>
  );
}
