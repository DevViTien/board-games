"use client";

import { Button, buttonVariants, cn, Input, PlusIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type RefObject, type SyntheticEvent, useEffect, useId, useRef, useState } from "react";

import { PLAYER_NAME_MAX_LENGTH } from "@/features/identity/name-limit";
import { AppStateScreen } from "@/features/shell/AppStateScreen";
import { AppTopBar } from "@/features/shell/AppTopBar";
import { BackLink, goTo, HistoryLink, ScreenTitle } from "@/features/shell/client-navigation";
import { isImeKey } from "@/lib/ime-key";

import {
  addPlayer,
  CARD_SCORE_ERROR,
  CardScoreError,
  type CardScoreGroup,
  type CardScorePlayer,
  MAX_ACTIVE_PLAYERS,
  MAX_GROUP_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_ACTIVE_PLAYERS,
  playerHasScores,
  removePlayer,
  renameGroup,
  renamePlayer,
  restPlayer,
  returnPlayer,
} from "./group";
import { boardHref, CARD_SCORE_HOME } from "./routes";
import { type UseGroup, useGroup } from "./use-group";

/** `/tools/card-score/<id>/edit`: each change counts as soon as it is made. */
export function GroupEdit({ groupId }: { readonly groupId: string }) {
  const t = useTranslations("CardScore");
  const { state, change } = useGroup(groupId);
  const back = <BackLink href={boardHref(groupId)} label={t("backToBoard")} />;

  switch (state.status) {
    case "ready":
      return <EditForm group={state.group} change={change} />;
    case "loading":
      return <AppStateScreen title={t("loading")} busy back={back} />;
    case "unavailable":
      return (
        <AppStateScreen
          title={t("unavailableTitle")}
          description={t("unavailableText")}
          tone="warning"
          back={back}
        />
      );
    case "newer":
      return (
        <AppStateScreen
          title={t("newerTitle")}
          description={t("newerText")}
          tone="warning"
          back={back}
        />
      );
    case "corrupt":
      return (
        <AppStateScreen
          title={t("corruptTitle")}
          description={t("corruptText")}
          tone="warning"
          back={back}
        />
      );
    case "missing":
      return (
        <AppStateScreen
          title={t("notFoundTitle")}
          description={t("notFoundText")}
          tone="warning"
          back={<BackLink href={CARD_SCORE_HOME} label={t("backToGroups")} />}
        >
          <HistoryLink href={CARD_SCORE_HOME} className={buttonVariants()}>
            {t("backToGroups")}
          </HistoryLink>
        </AppStateScreen>
      );
  }
}

/** Each field's way to save what is typed in it, for "Xong" to wait for them all. */
type PendingSaves = Map<string, () => Promise<boolean>>;

interface NameFieldOptions {
  /** What is stored now: shown until the player types, so another tab's change shows too. */
  readonly stored: string;
  readonly save: (typed: string) => Promise<unknown>;
  readonly explain: (error: unknown) => string;
  readonly key: string;
  readonly pendingRef: RefObject<PendingSaves>;
}

/**
 * A name saved when the player leaves its field, and only if they typed in it: passing through must
 * not write an old name over what another tab has changed. What is being typed when the screen goes
 * away is saved too.
 */
function useNameField({ stored, save, explain, key, pendingRef }: NameFieldOptions) {
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typedRef = useRef<string | null>(null);

  const commit = async (): Promise<boolean> => {
    const text = typedRef.current;
    if (text === null) return true;
    const done = () => {
      typedRef.current = null;
      setTyped(null);
      setError(null);
    };
    if (text.trim() === stored) {
      done();
      return true;
    }
    try {
      await save(text);
      done();
      return true;
    } catch (reason) {
      setError(explain(reason));
      return false;
    }
  };

  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    const pending = pendingRef.current;
    const latest = () => commitRef.current();
    pending.set(key, latest);
    return () => {
      pending.delete(key);
      void latest();
    };
  }, [key, pendingRef]);

  return {
    value: typed ?? stored,
    error,
    onChange: (text: string) => {
      typedRef.current = text;
      setTyped(text);
    },
    commit,
  };
}

interface EditFormProps {
  readonly group: CardScoreGroup;
  readonly change: UseGroup["change"];
}

function EditForm({ group, change }: EditFormProps) {
  const t = useTranslations("CardScore");
  const tIdentity = useTranslations("Identity");
  const baseId = useId();
  const pendingRef = useRef<PendingSaves>(new Map());
  const addFieldRef = useRef<HTMLInputElement>(null);
  const adding = useRef(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const active = group.players.filter((player) => player.active).length;
  const full = active >= MAX_ACTIVE_PLAYERS;
  const few = active <= MIN_ACTIVE_PLAYERS;
  const atPlayerLimit = group.players.length >= MAX_PLAYERS;
  const fullId = `${baseId}-full`;
  const fewId = `${baseId}-few`;
  const limitId = `${baseId}-limit`;

  const explain = (error: unknown): string => {
    if (error instanceof CardScoreError) {
      switch (error.code) {
        case CARD_SCORE_ERROR.nameInvalid:
          return tIdentity("invalidName", { max: PLAYER_NAME_MAX_LENGTH });
        case CARD_SCORE_ERROR.nameTaken:
          return error.player?.active === false
            ? t("nameTakenByResting", { name: error.player.name })
            : t("nameTaken");
        case CARD_SCORE_ERROR.groupNameInvalid:
          return t("groupNameTooLong", { max: MAX_GROUP_NAME_LENGTH });
        case CARD_SCORE_ERROR.tooFewPlayers:
          return t("minActive", { min: MIN_ACTIVE_PLAYERS });
        case CARD_SCORE_ERROR.tooManyPlayers:
          return t("maxPlayers", { max: MAX_ACTIVE_PLAYERS });
        case CARD_SCORE_ERROR.playerLimit:
          return t("playerLimit", { max: MAX_PLAYERS });
        default:
          break;
      }
    }
    return t("errorEdit");
  };

  const groupName = useNameField({
    stored: group.name,
    save: (typed) => change((current) => renameGroup(current, typed, new Date())),
    explain,
    key: "group-name",
    pendingRef,
  });

  const act = (apply: (current: CardScoreGroup) => CardScoreGroup) => {
    setActionError(null);
    change(apply).catch((error: unknown) => {
      // A second press on someone already gone: what was asked has been done.
      if (error instanceof CardScoreError && error.code === CARD_SCORE_ERROR.playerGone) return;
      setActionError(explain(error));
    });
  };

  const add = (event: SyntheticEvent) => {
    event.preventDefault();
    if (full || atPlayerLimit || adding.current) return;
    adding.current = true;
    setAddError(null);
    change((current) => addPlayer(current, newName, new Date()))
      .then(
        () => {
          setNewName("");
        },
        (error: unknown) => {
          setAddError(explain(error));
        },
      )
      .finally(() => {
        adding.current = false;
      });
  };

  const done = boardHref(group.id);

  return (
    <>
      <AppTopBar back={<BackLink href={done} label={t("backToBoard")} />} />
      <main className="mx-auto flex max-w-xl flex-col gap-5 pt-6 px-safe-4 pb-14 sm:px-safe-6 lg:pt-8">
        <ScreenTitle className="text-title">{t("editGroup")}</ScreenTitle>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-name`} className="text-caption text-fg-muted">
            {t("groupName")}
          </label>
          <Input
            id={`${baseId}-name`}
            value={groupName.value}
            placeholder={t("groupNamePlaceholder")}
            autoComplete="off"
            aria-invalid={groupName.error !== null}
            aria-describedby={groupName.error === null ? undefined : `${baseId}-name-error`}
            onChange={(event) => {
              groupName.onChange(event.target.value);
            }}
            onBlur={() => {
              void groupName.commit();
            }}
          />
          {groupName.error !== null && (
            <p
              id={`${baseId}-name-error`}
              role="alert"
              className="text-small font-semibold text-danger-ink"
            >
              {groupName.error}
            </p>
          )}
        </div>

        <section aria-labelledby={`${baseId}-players`} className="flex flex-col gap-2">
          <h2 id={`${baseId}-players`} className="text-caption text-fg-muted">
            {t("activeCount", { count: active })}
          </h2>
          {group.players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              group={group}
              few={few}
              fewId={fewId}
              full={full}
              fullId={fullId}
              change={change}
              explain={explain}
              pendingRef={pendingRef}
              onAct={act}
              onRemoved={() => {
                addFieldRef.current?.focus();
              }}
            />
          ))}
          {few && (
            <p id={fewId} className="text-small text-fg-muted">
              {t("minActive", { min: MIN_ACTIVE_PLAYERS })}
            </p>
          )}
          {actionError !== null && (
            <p role="alert" className="text-small font-semibold text-danger-ink">
              {actionError}
            </p>
          )}
          <form noValidate className="mt-2 flex items-start gap-2" onSubmit={add}>
            <div className="min-w-0 flex-1">
              <Input
                ref={addFieldRef}
                value={newName}
                placeholder={t("playerPlaceholder")}
                aria-label={t("newPlayer")}
                autoComplete="off"
                aria-invalid={addError !== null}
                aria-describedby={addError === null ? undefined : `${baseId}-add-error`}
                onChange={(event) => {
                  setNewName(event.target.value);
                }}
              />
              {addError !== null && (
                <p
                  id={`${baseId}-add-error`}
                  role="alert"
                  className="mt-1 text-small font-semibold text-danger-ink"
                >
                  {addError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="shrink-0 px-3"
              aria-disabled={full || atPlayerLimit}
              aria-describedby={atPlayerLimit ? limitId : full ? fullId : undefined}
            >
              <PlusIcon aria-hidden className="size-4" />
              {t("addPlayer")}
            </Button>
          </form>
          {full && (
            <p id={fullId} className="text-small text-fg-muted">
              {t("maxPlayers", { max: MAX_ACTIVE_PLAYERS })}
            </p>
          )}
          {atPlayerLimit && (
            <p id={limitId} className="text-small text-fg-muted">
              {t("playerLimit", { max: MAX_PLAYERS })}
            </p>
          )}
        </section>

        <p className="text-small text-fg-muted">{t("editHint")}</p>

        <HistoryLink
          href={done}
          className={cn(buttonVariants(), "w-full")}
          onClick={(event) => {
            // Names still being saved first: one refused stays on screen, with its reason.
            event.preventDefault();
            void Promise.all([...pendingRef.current.values()].map((save) => save())).then(
              (saved) => {
                if (saved.every(Boolean)) goTo(done);
              },
            );
          }}
        >
          {t("done")}
        </HistoryLink>
      </main>
    </>
  );
}

interface PlayerRowProps {
  readonly player: CardScorePlayer;
  readonly group: CardScoreGroup;
  /** Only the fewest may play: nobody more can leave. Its reason, on screen, by id. */
  readonly few: boolean;
  readonly fewId: string;
  /** As many as may play: nobody more can come back. Its reason, on screen, by id. */
  readonly full: boolean;
  readonly fullId: string;
  readonly change: UseGroup["change"];
  readonly explain: (error: unknown) => string;
  readonly pendingRef: RefObject<PendingSaves>;
  readonly onAct: (apply: (current: CardScoreGroup) => CardScoreGroup) => void;
  readonly onRemoved: () => void;
}

function PlayerRow({
  player,
  group,
  few,
  fewId,
  full,
  fullId,
  change,
  explain,
  pendingRef,
  onAct,
  onRemoved,
}: PlayerRowProps) {
  const t = useTranslations("CardScore");
  const baseId = useId();
  const name = useNameField({
    stored: player.name,
    save: (typed) => change((current) => renamePlayer(current, player.id, typed, new Date())),
    explain,
    key: player.id,
    pendingRef,
  });

  const hasScores = playerHasScores(group, player.id);
  const leavingBlocked = player.active && few;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          value={name.value}
          aria-label={t("playerName", { name: player.name })}
          autoComplete="off"
          translate="no"
          className={cn(!player.active && "border-dashed")}
          aria-invalid={name.error !== null}
          aria-describedby={name.error === null ? undefined : `${baseId}-error`}
          onChange={(event) => {
            name.onChange(event.target.value);
          }}
          onBlur={() => {
            void name.commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isImeKey(event)) void name.commit();
          }}
        />
        {player.active && hasScores && (
          <Button
            variant="secondary"
            size="sm"
            className="min-w-23 shrink-0 px-3"
            aria-label={t("restPlayer", { name: player.name })}
            aria-disabled={leavingBlocked}
            aria-describedby={leavingBlocked ? fewId : undefined}
            onClick={() => {
              onAct((current) => restPlayer(current, player.id, new Date()));
            }}
          >
            {t("rest")}
          </Button>
        )}
        {!player.active && (
          <Button
            variant="secondary"
            size="sm"
            className="min-w-23 shrink-0 px-3"
            aria-label={t("returnPlayer", { name: player.name })}
            aria-disabled={full}
            aria-describedby={full ? fullId : undefined}
            onClick={() => {
              onAct((current) => returnPlayer(current, player.id, new Date()));
            }}
          >
            {t("return")}
          </Button>
        )}
        {!hasScores && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 px-3"
            aria-label={t("removePlayer", { name: player.name })}
            aria-disabled={leavingBlocked}
            aria-describedby={leavingBlocked ? fewId : undefined}
            onClick={() => {
              onAct((current) => removePlayer(current, player.id, new Date()));
              onRemoved();
            }}
          >
            {t("remove")}
          </Button>
        )}
      </div>
      {name.error !== null && (
        <p
          id={`${baseId}-error`}
          role="alert"
          className="mt-1 text-small font-semibold text-danger-ink"
        >
          {name.error}
        </p>
      )}
    </div>
  );
}
