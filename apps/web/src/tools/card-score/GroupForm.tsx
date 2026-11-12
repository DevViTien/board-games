"use client";

import { Button, Input, PlusIcon, XIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type SyntheticEvent, useEffect, useId, useRef, useState } from "react";

import { parsePlayerName } from "@/features/identity/identity";
import { PLAYER_NAME_MAX_LENGTH } from "@/features/identity/name-limit";
import { AppStateScreen } from "@/features/shell/AppStateScreen";
import { AppTopBar } from "@/features/shell/AppTopBar";
import { BackLink, goTo, ScreenTitle } from "@/features/shell/client-navigation";
import { randomId } from "@/lib/random-id";

import {
  createGroup,
  MAX_ACTIVE_PLAYERS,
  MAX_GROUP_NAME_LENGTH,
  MIN_ACTIVE_PLAYERS,
  nameKey,
  newSessionDraft,
  parseGroupName,
} from "./group";
import { groupStore } from "./group-store";
import { boardHref, CARD_SCORE_HOME } from "./routes";

const INITIAL_ROWS = 4;

interface Draft {
  readonly name: string;
  readonly playerNames: readonly string[];
  /** The group it was to start from could not be read. */
  readonly sourceMissing: boolean;
  /** It starts from another group: the screen says "Buổi mới". */
  readonly session: boolean;
}

const BLANK: Draft = { name: "", playerNames: [], sourceMissing: false, session: false };

/** `/tools/card-score/new`, also from a group (`?from=<id>`): waits to know what it starts from. */
export function NewGroup({ from }: { readonly from: string | null }) {
  const t = useTranslations("CardScore");
  const [draft, setDraft] = useState<Draft | null>(from === null ? BLANK : null);

  useEffect(() => {
    if (from === null) return;
    groupStore.load(from).then(
      (loaded) => {
        setDraft(
          loaded.kind === "saved"
            ? { ...newSessionDraft(loaded.group), sourceMissing: false, session: true }
            : { ...BLANK, sourceMissing: true },
        );
      },
      () => {
        setDraft({ ...BLANK, sourceMissing: true });
      },
    );
  }, [from]);

  const back = <BackLink href={CARD_SCORE_HOME} label={t("backToGroups")} />;
  if (draft === null) return <AppStateScreen title={t("loading")} busy back={back} />;
  return <GroupForm key={from} draft={draft} />;
}

interface Row {
  readonly key: string;
  readonly value: string;
}

type RowError = "invalid" | "taken";

/** What is wrong with each row; blank rows are simply not players. */
function rowErrors(rows: readonly Row[]): ReadonlyMap<string, RowError> {
  const errors = new Map<string, RowError>();
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.value.trim() === "") continue;
    if (parsePlayerName(row.value) === null) {
      errors.set(row.key, "invalid");
      continue;
    }
    const key = nameKey(row.value);
    if (seen.has(key)) errors.set(row.key, "taken");
    seen.add(key);
  }
  return errors;
}

function GroupForm({ draft }: { readonly draft: Draft }) {
  const t = useTranslations("CardScore");
  const tIdentity = useTranslations("Identity");
  const baseId = useId();
  const [name, setName] = useState(draft.name);
  const [rows, setRows] = useState<readonly Row[]>(() => {
    const names = [
      ...draft.playerNames,
      ...Array.from({ length: Math.max(0, INITIAL_ROWS - draft.playerNames.length) }, () => ""),
    ];
    return names.map((value, index) => ({ key: `row-${index}`, value }));
  });
  const nextKey = useRef(rows.length);
  // One for this form: sending it again after an answer that came too late makes no second group.
  const [groupId] = useState(randomId);
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors = tried ? rowErrors(rows) : new Map<string, RowError>();
  const filled = rows.filter((row) => row.value.trim() !== "");
  const nameError = tried && parseGroupName(name) === null;
  const tooFew = tried && filled.length < MIN_ACTIVE_PLAYERS;

  const setRow = (key: string, value: string) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, value } : row)));
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setTried(true);
    setFailed(false);
    const errorsNow = rowErrors(rows);
    const invalid = parseGroupName(name) === null;
    if (busy || errorsNow.size > 0 || invalid || filled.length < MIN_ACTIVE_PLAYERS) {
      // The first thing to fix has the focus: its reason is read with it.
      const inputs = event.currentTarget.querySelectorAll("input");
      const firstRow = rows.findIndex(({ key }) => errorsNow.has(key));
      if (invalid) inputs[0]?.focus();
      else if (firstRow >= 0) inputs[firstRow + 1]?.focus();
      return;
    }
    const group = createGroup(
      { id: groupId, name, playerNames: filled.map((row) => row.value) },
      new Date(),
    );
    setBusy(true);
    groupStore.create(group).then(
      () => {
        // Back must not come to the form again and make a second group.
        goTo(boardHref(group.id), { replace: true });
      },
      () => {
        setBusy(false);
        setFailed(true);
      },
    );
  };

  return (
    <>
      <AppTopBar back={<BackLink href={CARD_SCORE_HOME} label={t("backToGroups")} />} />
      <main className="mx-auto flex max-w-xl flex-col gap-5 pt-6 px-safe-4 pb-14 sm:px-safe-6 lg:pt-8">
        <ScreenTitle className="text-title">
          {draft.session ? t("newSession") : t("create")}
        </ScreenTitle>
        {draft.sourceMissing && (
          <p className="rounded-control bg-warning-soft px-3 py-2 text-small font-semibold text-warning-ink">
            {t("sourceMissing")}
          </p>
        )}
        <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${baseId}-name`} className="text-caption text-fg-muted">
              {t("groupName")}
            </label>
            <Input
              id={`${baseId}-name`}
              value={name}
              placeholder={t("groupNamePlaceholder")}
              autoComplete="off"
              aria-invalid={nameError}
              aria-describedby={nameError ? `${baseId}-name-error` : undefined}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            {nameError && (
              <p id={`${baseId}-name-error`} className="text-small font-semibold text-danger-ink">
                {t("groupNameTooLong", { max: MAX_GROUP_NAME_LENGTH })}
              </p>
            )}
          </div>

          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-1 text-caption text-fg-muted">
              {t("players", { min: MIN_ACTIVE_PLAYERS, max: MAX_ACTIVE_PLAYERS })}
            </legend>
            {rows.map((row, index) => {
              const error = errors.get(row.key);
              const number = index + 1;
              const errorId = `${baseId}-${row.key}-error`;
              return (
                <div key={row.key}>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="w-5 shrink-0 text-right text-caption text-fg-muted"
                    >
                      {number}
                    </span>
                    <Input
                      value={row.value}
                      placeholder={t("playerPlaceholder")}
                      aria-label={t("playerLabel", { number })}
                      autoComplete="off"
                      aria-invalid={error !== undefined}
                      aria-describedby={error === undefined ? undefined : errorId}
                      onChange={(event) => {
                        setRow(row.key, event.target.value);
                      }}
                    />
                    {rows.length > MIN_ACTIVE_PLAYERS ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label={t("removeRow", { number })}
                        onClick={(event) => {
                          // The button goes with its row: the focus must not fall out of the form.
                          event.currentTarget.closest("fieldset")?.querySelector("input")?.focus();
                          setRows((current) => current.filter((other) => other.key !== row.key));
                        }}
                      >
                        <XIcon aria-hidden className="size-5" />
                      </Button>
                    ) : (
                      <span aria-hidden className="size-11 shrink-0" />
                    )}
                  </div>
                  {error !== undefined && (
                    <p id={errorId} className="mt-1 ml-7 text-small font-semibold text-danger-ink">
                      {error === "taken"
                        ? t("nameTaken")
                        : tIdentity("invalidName", { max: PLAYER_NAME_MAX_LENGTH })}
                    </p>
                  )}
                </div>
              );
            })}
            {rows.length < MAX_ACTIVE_PLAYERS ? (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => {
                  nextKey.current += 1;
                  const key = `row-${nextKey.current}`;
                  setRows((current) => [...current, { key, value: "" }]);
                }}
              >
                <PlusIcon aria-hidden className="size-4" />
                {t("addPlayer")}
              </Button>
            ) : (
              <p className="text-small text-fg-muted">
                {t("maxPlayers", { max: MAX_ACTIVE_PLAYERS })}
              </p>
            )}
            {tooFew && (
              <p role="alert" className="text-small font-semibold text-danger-ink">
                {t("tooFew", { min: MIN_ACTIVE_PLAYERS })}
              </p>
            )}
          </fieldset>

          {failed && (
            <p role="alert" className="text-small font-semibold text-danger-ink">
              {t("errorCreate")}
            </p>
          )}
          <Button type="submit" aria-disabled={busy} className="w-full">
            {t("create")}
          </Button>
        </form>
      </main>
    </>
  );
}
