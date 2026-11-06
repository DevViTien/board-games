"use client";

import {
  Button,
  CheckIcon,
  CircleAlertIcon,
  cn,
  DialogFrame,
  type IconComponent,
  Input,
  KeyboardIcon,
  Trash2Icon,
  XIcon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { isImeKey } from "@/lib/ime-key";

import { useScoreFormat } from "./format";
import { CARD_SCORE_ERROR, CardScoreError, type CardScorePlayer } from "./group";
import { useKeypadPreference } from "./keypad-preference";
import { clearRoundDraft, writeRoundDraft } from "./round-draft";
import {
  nextRow,
  parseScore,
  pressDigits,
  type RoundState,
  roundState,
  savableScores,
  type Scores,
  toggleSign,
} from "./score-logic";
import { ScoreKeypad } from "./ScoreKeypad";

/** A round to type or to correct. `key`: another opening of the screen starts afresh. */
export interface RoundRequest {
  readonly key: string;
  readonly groupId: string;
  readonly roundId: string;
  /** Its number in the group: the next one for a new round. */
  readonly number: number;
  /** Who it is typed for, settled when it opens: another tab changing the group does not move it. */
  readonly players: readonly CardScorePlayer[];
  readonly values: readonly string[];
  /** An existing round, rather than a new one. */
  readonly editing: boolean;
}

interface RoundSheetProps {
  readonly request: RoundRequest | null;
  readonly onSave: (request: RoundRequest, scores: Scores) => Promise<void>;
  readonly onDelete: (request: RoundRequest) => Promise<void>;
  readonly onClose: () => void;
}

type StatusTone = "wait" | "ok" | "bad" | "auto";

const STATUS_LINE =
  "flex h-9 shrink-0 items-center gap-2 px-safe-4 text-small font-semibold short-landscape:h-7";

const TONE_CLASS: Record<StatusTone, string> = {
  wait: "bg-surface-muted text-fg-muted",
  ok: "bg-success-soft text-success-ink",
  bad: "bg-danger-soft text-danger-ink",
  auto: "bg-accent-soft text-accent-ink",
};

const TONE_ICON: Record<StatusTone, IconComponent> = {
  wait: CircleAlertIcon,
  ok: CheckIcon,
  bad: CircleAlertIcon,
  auto: CheckIcon,
};

function toneOf(state: RoundState): StatusTone {
  switch (state.kind) {
    case "empty":
    case "missing":
      return "wait";
    case "auto":
      return "auto";
    case "balanced":
      return "ok";
    case "invalid":
    case "auto-too-large":
    case "mismatch":
      return "bad";
  }
}

/** How long typing settles before the status is read out: not at every digit. */
const SPEAK_DELAY_MS = 500;

/**
 * The screen a round is typed on: the whole screen on a phone. It sits in one native `<dialog>` that
 * stays in the page, so that closing it gives the focus back to what opened it.
 */
export function RoundSheet({ request, onSave, onDelete, onClose }: RoundSheetProps) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const dismissRef = useRef<() => void>(onClose);

  return (
    <DialogFrame
      open={request !== null}
      onDismiss={() => {
        dismissRef.current();
      }}
      labelledBy={titleId}
      initialFocus={firstFieldRef}
      className={cn(
        // `open:flex`, never `flex`: a closed dialog must keep the browser's `display: none`.
        "m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-hidden border-0 p-0 open:flex",
        "lg:m-auto lg:h-fit lg:max-h-[calc(100dvh-3rem)] lg:w-[calc(100%-2rem)] lg:max-w-lg lg:rounded-card lg:border lg:border-border",
      )}
    >
      {request !== null && (
        <RoundForm
          key={request.key}
          request={request}
          titleId={titleId}
          firstFieldRef={firstFieldRef}
          dismissRef={dismissRef}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}
    </DialogFrame>
  );
}

interface RoundFormProps {
  readonly request: RoundRequest;
  readonly titleId: string;
  readonly firstFieldRef: RefObject<HTMLInputElement | null>;
  readonly dismissRef: RefObject<() => void>;
  readonly onSave: (request: RoundRequest, scores: Scores) => Promise<void>;
  readonly onDelete: (request: RoundRequest) => Promise<void>;
  readonly onClose: () => void;
}

type Question = "discard" | "delete";

function RoundForm({
  request,
  titleId,
  firstFieldRef,
  dismissRef,
  onSave,
  onDelete,
  onClose,
}: RoundFormProps) {
  const t = useTranslations("CardScore");
  const formatScore = useScoreFormat();
  const { coarse, showKeypad, toggle } = useKeypadPreference();
  const statusId = useId();

  const [values, setValues] = useState(request.values);
  const [active, setActive] = useState(0);
  // The chosen field's number goes away with the first digit or the first backspace.
  const [fresh, setFresh] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const fields = useRef<(HTMLInputElement | null)[]>([]);

  const rows = useMemo(
    () =>
      request.players.map((player, index) => ({
        playerId: player.id,
        raw: values[index] ?? "",
      })),
    [request.players, values],
  );
  const state = roundState(rows);
  const scores = savableScores(state);
  // A new round is measured from nothing, even when it came back from its draft.
  const dirty = request.editing
    ? values.some((value, index) => value !== request.values[index])
    : values.some((value) => value !== "");
  const nameOf = (playerId: string) =>
    request.players.find((player) => player.id === playerId)?.name ?? "";

  const status = ((): string => {
    switch (state.kind) {
      case "empty":
        return t("statusEmpty");
      case "invalid":
        return t("statusInvalid");
      case "missing":
        return t("statusMissing", { count: state.count });
      case "auto":
        return t("statusAuto", { name: nameOf(state.playerId), value: formatScore(state.value) });
      case "auto-too-large":
        return t("statusTooLarge", { name: nameOf(state.playerId) });
      case "mismatch":
        return t("statusMismatch", { delta: formatScore(state.delta) });
      case "balanced":
        return t("statusBalanced");
    }
  })();
  const tone = toneOf(state);
  const ToneIcon = TONE_ICON[tone];
  const blockedBy = scores === null || busy ? statusId : undefined;

  // Esc, the browser's own closing, the close button: nothing typed is lost without asking.
  const askToLeave = () => {
    if (question !== null) return;
    if (dirty) setQuestion("discard");
    else onClose();
  };
  useEffect(() => {
    dismissRef.current = askToLeave;
  });

  // The new round being typed outlives a reload or the phone clearing the tab.
  useEffect(() => {
    if (request.editing) return;
    if (values.some((value) => value !== "")) {
      writeRoundDraft(request.groupId, {
        roundId: request.roundId,
        playerIds: request.players.map((player) => player.id),
        values,
      });
    } else {
      clearRoundDraft(request.groupId);
    }
  }, [request, values]);

  // The chosen field is in view and has the focus, unless the keyboard is working the keypad.
  useEffect(() => {
    if (question !== null) return;
    const field = fields.current[active];
    if (field === null || field === undefined) return;
    const row = field.closest("[data-round-row]");
    if (row !== null && "scrollIntoView" in row) row.scrollIntoView({ block: "nearest" });
    if (
      document.activeElement?.closest("[data-keypad]") === null ||
      document.activeElement === null
    ) {
      field.focus({ preventScroll: true });
    }
  }, [active, question, showKeypad]);

  // Read out once the typing settles.
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSpoken(status);
    }, SPEAK_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [status]);

  const setValue = (index: number, value: string) => {
    setFailure(null);
    setValues((current) => current.map((old, at) => (at === index ? value : old)));
  };

  const choose = (index: number) => {
    setActive(index);
    setFresh(true);
  };

  const changeSign = () => {
    setValue(active, toggleSign(values[active] ?? ""));
    setFresh(false);
  };

  const moveOn = () => {
    choose(nextRow(rows, active));
  };

  const save = async () => {
    if (scores === null || saving.current) return;
    saving.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await onSave(request, scores);
      clearRoundDraft(request.groupId);
    } catch (error) {
      setFailure(failureText(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const failureText = (error: unknown): string => {
    if (error instanceof CardScoreError) {
      if (error.code === CARD_SCORE_ERROR.playerGone) return t("errorPlayerGone");
      if (error.code === CARD_SCORE_ERROR.roundGone) return t("errorRoundGone");
      if (error.code === CARD_SCORE_ERROR.roundLimit) return t("errorRoundLimit");
      if (error.code === CARD_SCORE_ERROR.groupGone) return t("errorGroupGone");
    }
    return t("errorSave");
  };

  const remove = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await onDelete(request);
    } catch (error) {
      setQuestion(null);
      setFailure(failureText(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const onFieldKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter" || isImeKey(event)) return;
    event.preventDefault();
    if (index === rows.length - 1) void save();
    else choose(index + 1);
  };

  const saveLabel = t("save");
  const title = request.editing
    ? t("editRoundTitle", { number: request.number })
    : t("roundTitle", { number: request.number });

  return (
    <>
      <header className="flex h-13 shrink-0 items-center gap-1 border-b border-border pr-[max(0.5rem,var(--safe-right))] pl-[max(0.25rem,var(--safe-left))] max-lg:box-content max-lg:pt-[var(--safe-top)] short-landscape:h-11">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("closeRound")}
          onClick={() => {
            if (question === null) askToLeave();
            else setQuestion(null);
          }}
        >
          <XIcon aria-hidden className="size-5" />
        </Button>
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-heading">
          {title}
        </h2>
        {coarse && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={showKeypad ? t("useKeyboard") : t("useKeypad")}
            title={showKeypad ? t("useKeyboard") : t("useKeypad")}
            onClick={toggle}
          >
            <KeyboardIcon aria-hidden className="size-5" />
          </Button>
        )}
        {coarse && !showKeypad && question === null && (
          // The numeric keyboard of some phones has no minus sign.
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("keySign")}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            onClick={changeSign}
          >
            <span aria-hidden className="text-heading">
              ±
            </span>
          </Button>
        )}
        {!showKeypad && question === null && (
          <Button
            size="sm"
            aria-disabled={blockedBy !== undefined}
            aria-describedby={blockedBy}
            onClick={() => {
              void save();
            }}
          >
            {saveLabel}
          </Button>
        )}
      </header>

      {question !== null ? (
        <AskInside
          question={question}
          number={request.number}
          busy={busy}
          onKeep={() => {
            setQuestion(null);
          }}
          onConfirm={() => {
            if (question === "discard") {
              clearRoundDraft(request.groupId);
              onClose();
            } else {
              void remove();
            }
          }}
        />
      ) : (
        <>
          <div id={statusId} className={cn(STATUS_LINE, TONE_CLASS[tone])}>
            <ToneIcon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{status}</span>
          </div>
          {failure !== null && (
            <p
              role="alert"
              className="shrink-0 bg-danger-soft py-2 px-safe-4 text-small font-semibold text-danger-ink"
            >
              {failure}
            </p>
          )}
          <p role="status" className="sr-only">
            {spoken}
          </p>
          <div className="flex min-h-0 flex-1 flex-col short-landscape:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 px-safe-3 lg:pb-3">
              {request.players.map((player, index) => {
                const isAuto = state.kind === "auto" && state.playerId === player.id;
                const inputId = `${titleId}-${player.id}`;
                const readId = `${inputId}-auto`;
                return (
                  <div
                    key={player.id}
                    data-round-row=""
                    className="grid min-h-11 grid-cols-[minmax(0,1fr)_8.25rem] items-center gap-2.5 py-0.5"
                  >
                    <div className="min-w-0 pl-1 leading-tight">
                      <label htmlFor={inputId}>
                        <span
                          translate="no"
                          className={cn(
                            "block truncate font-semibold",
                            index === active && "font-extrabold",
                          )}
                        >
                          {player.name}
                        </span>
                      </label>
                      {/* Outside the label: the field keeps its name, and reads this as its description. */}
                      {isAuto && (
                        <span aria-hidden className="block text-caption font-bold text-accent-ink">
                          {t("autoLabel")}
                        </span>
                      )}
                    </div>
                    <span className="relative block">
                      <Input
                        ref={(element) => {
                          fields.current[index] = element;
                          if (index === 0) firstFieldRef.current = element;
                        }}
                        id={inputId}
                        value={(values[index] ?? "").replace("-", "−")}
                        inputMode={showKeypad ? "none" : "numeric"}
                        autoComplete="off"
                        enterKeyHint={index === rows.length - 1 ? "done" : "next"}
                        aria-invalid={parseScore(values[index] ?? "") === "invalid"}
                        aria-describedby={isAuto ? readId : undefined}
                        data-score-field={player.id}
                        className={cn(
                          "h-10 px-2.5 text-right font-bold tabular-nums",
                          isAuto &&
                            "border-dashed bg-accent-soft text-transparent caret-accent-ink hover:bg-accent-soft focus:bg-accent-soft",
                        )}
                        onFocus={(event) => {
                          // Back from another tab or app, in the same field: typing goes on.
                          if (index === active && event.relatedTarget === null && !fresh) return;
                          setActive(index);
                          setFresh(true);
                          event.target.select();
                        }}
                        onClick={(event) => {
                          setFresh(true);
                          event.currentTarget.select();
                        }}
                        onChange={(event) => {
                          setFresh(false);
                          setValue(index, event.target.value.replace("−", "-"));
                        }}
                        onKeyDown={(event) => {
                          onFieldKey(event, index);
                        }}
                      />
                      {isAuto && (
                        <>
                          <span
                            aria-hidden
                            data-auto-score={player.id}
                            className="pointer-events-none absolute inset-y-0 right-3 z-20 flex items-center font-extrabold text-accent-ink tabular-nums"
                          >
                            {formatScore(state.value)}
                          </span>
                          <span id={readId} className="sr-only">
                            {t("autoRead", { value: formatScore(state.value) })}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
              {request.editing && (
                <div className="py-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-danger-ink text-danger-ink"
                    onClick={() => {
                      setQuestion("delete");
                    }}
                  >
                    <Trash2Icon aria-hidden className="size-4" />
                    {t("deleteRound")}
                  </Button>
                </div>
              )}
            </div>
            {showKeypad && (
              <ScoreKeypad
                saveLabel={saveLabel}
                saveBlockedBy={blockedBy}
                onDigits={(digits) => {
                  setValue(active, pressDigits(values[active] ?? "", digits, fresh));
                  setFresh(false);
                }}
                onSign={changeSign}
                onBack={() => {
                  setValue(active, fresh ? "" : (values[active] ?? "").slice(0, -1));
                  setFresh(false);
                }}
                onNext={moveOn}
                onSave={() => {
                  void save();
                }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

interface AskInsideProps {
  readonly question: Question;
  readonly number: number;
  readonly busy: boolean;
  readonly onKeep: () => void;
  readonly onConfirm: () => void;
}

/**
 * A question asked inside the screen rather than in a dialog over it: two native dialogs would have
 * their `cancel` and `close` reach each other, and their order on screen to keep right.
 */
function AskInside({ question, number, busy, onKeep, onConfirm }: AskInsideProps) {
  const t = useTranslations("CardScore");
  const titleId = useId();
  // The safe answer has the focus, once, so Enter right away loses nothing.
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
  }, []);
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex flex-1 flex-col justify-center gap-3 p-6"
    >
      <h3 id={titleId} className="text-heading">
        {question === "discard" ? t("askDiscardTitle") : t("askDeleteTitle", { number })}
      </h3>
      <p className="text-body text-fg-muted">
        {question === "discard" ? t("askDiscardText") : t("askDeleteText")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" ref={keepRef} onClick={onKeep}>
          {question === "discard" ? t("keepEntering") : t("keepRound")}
        </Button>
        <Button aria-disabled={busy} onClick={onConfirm}>
          {question === "discard" ? t("discard") : t("confirmDelete")}
        </Button>
      </div>
    </div>
  );
}
