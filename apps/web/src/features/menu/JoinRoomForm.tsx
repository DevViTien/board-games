"use client";

import { normalizeRoomCode } from "@board-games/protocol";
import { Button, Input } from "@board-games/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

/**
 * "Join a room" by its code, for a code read out or typed from another screen rather than a link.
 * Spaces and lower case are forgiven (`abc 234`); a code that cannot be one is told at the field,
 * which takes the focus back so the message is read with it, and the player stays on the menu.
 * Whether the room exists is for the room page to say.
 */
export function JoinRoomForm() {
  const t = useTranslations("Menu");
  const router = useRouter();
  const headingId = useId();
  const inputId = useId();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-body font-bold">
        {t("joinTitle")}
      </h2>
      <form
        noValidate
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const room = normalizeRoomCode(code);
          setInvalid(room === null);
          if (room === null) input.current?.focus();
          else router.push(`/room/${room}`);
        }}
      >
        {/* The heading says what the field is for; its name is still read out with it. */}
        <label htmlFor={inputId} className="sr-only">
          {t("joinCode")}
        </label>
        <div className="flex gap-2">
          <Input
            ref={input}
            id={inputId}
            name="code"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            enterKeyHint="go"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            variant="code"
            placeholder={t("joinPlaceholder")}
            className="min-w-0"
            onChange={(event) => {
              setCode(event.target.value);
              setInvalid(false);
            }}
          />
          <Button type="submit" className="shrink-0">
            {t("join")}
          </Button>
        </div>
        {invalid && (
          <p id={errorId} className="text-small text-danger">
            {t("joinInvalid")}
          </p>
        )}
      </form>
    </section>
  );
}
