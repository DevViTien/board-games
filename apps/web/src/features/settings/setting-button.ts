import { buttonVariants, cn } from "@board-games/ui";

/** The look of the theme and language buttons of the top bar: 44 px, framed, an icon (and a code). */
export const SETTING_BUTTON = cn(
  buttonVariants({ variant: "secondary", size: "icon" }),
  "w-auto min-w-11 gap-1 border-border-control px-2.5 text-small font-bold",
);
