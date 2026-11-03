"use client";

import { PLAYER_NAME_MAX_LENGTH } from "@board-games/protocol";
import { Input } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type Ref, useId } from "react";

import { parsePlayerName } from "./identity";

interface NameFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Called when the player leaves the field with a valid name, trimmed as the server keeps it. */
  readonly onCommit?: ((name: string) => void) | undefined;
  /** Says why the name is refused; set once the player has tried to go on with it. */
  readonly showError: boolean;
  /** A line under the field, read with it (`aria-describedby`); none by default. */
  readonly hint?: string | undefined;
  /**
   * The input, for the form to focus it when the name is refused on submit: the error is then read
   * with the field.
   */
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

/**
 * The player's temporary name for online play, checked with the protocol's own schema so the
 * server never refuses a name this field accepted. The error is tied to the input, so a screen
 * reader reads it with the field. No `maxLength`: a pasted name that is too long is shown and
 * explained rather than silently cut.
 */
export function NameField({ value, onChange, onCommit, showError, hint, ref }: NameFieldProps) {
  const t = useTranslations("Identity");
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const invalid = showError && parsePlayerName(value) === null;
  const describedBy = [hint === undefined ? null : hintId, invalid ? errorId : null]
    .filter((id) => id !== null)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-caption text-fg-muted">
        {t("name")}
      </label>
      <Input
        ref={ref}
        id={inputId}
        value={value}
        autoComplete="nickname"
        aria-invalid={invalid}
        aria-describedby={describedBy === "" ? undefined : describedBy}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onBlur={() => {
          const name = parsePlayerName(value);
          if (name !== null) onCommit?.(name);
        }}
      />
      {hint !== undefined && (
        <p id={hintId} className="text-small text-fg-muted">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-small text-danger">
          {t("invalidName", { max: PLAYER_NAME_MAX_LENGTH })}
        </p>
      )}
    </div>
  );
}
