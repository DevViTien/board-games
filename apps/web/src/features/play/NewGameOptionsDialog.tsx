"use client";

import type { OptionChoiceList, OptionValue } from "@board-games/engine";
import { ConfirmDialog } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { OptionFields } from "@/features/setup/OptionFields";
import type { ChosenOptions } from "@/lib/option-choices";

interface NewGameOptionsDialogProps {
  readonly open: boolean;
  readonly gameId: string;
  readonly choices: readonly OptionChoiceList[];
  /** The options of the game just over: chosen when the dialog opens. */
  readonly current: ChosenOptions;
  /** Online: the new game starts for the whole room. */
  readonly online: boolean;
  /** The dialog's title, the button that opened it ("Change map"). */
  readonly title: string;
  readonly onStart: (options: ChosenOptions) => void;
  readonly onCancel: () => void;
}

/**
 * The rule options of the next game, chosen once a game is over (spec "Đổi tuỳ chọn khi ván kết
 * thúc"): the setup screen's groups, the options just played chosen, then "Start a new game".
 */
export function NewGameOptionsDialog({ open, ...props }: NewGameOptionsDialogProps) {
  // Mounted only while open, so every opening starts from the options just played.
  return open ? <OpenDialog {...props} /> : null;
}

function OpenDialog({
  gameId,
  choices,
  current,
  online,
  title,
  onStart,
  onCancel,
}: Omit<NewGameOptionsDialogProps, "open">) {
  const t = useTranslations("Play.optionsDialog");
  const [chosen, setChosen] = useState<ChosenOptions>(current);
  return (
    <ConfirmDialog
      open
      wide
      title={title}
      description={online ? t("descriptionOnline") : t("description")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={() => {
        onStart(chosen);
      }}
      onCancel={onCancel}
    >
      <OptionFields
        gameId={gameId}
        choices={choices}
        value={chosen}
        onChange={(name: string, value: OptionValue) => {
          setChosen((before) => ({ ...before, [name]: value }));
        }}
      />
    </ConfirmDialog>
  );
}
