"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CardScoreGroup } from "./group";
import { type GroupList, groupStore } from "./group-store";

/**
 * Calls `read` once mounted, and again when the player comes back to this tab: another tab may have
 * written since. Nothing here touches what is being typed: screens keep their own drafts.
 */
function useReadOnReturn(read: () => void): void {
  useEffect(() => {
    read();
    const onVisibility = () => {
      if (document.visibilityState === "visible") read();
    };
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [read]);
}

export type GroupsState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | ({ readonly status: "ready" } & GroupList);

export function useGroups(): GroupsState {
  const [state, setState] = useState<GroupsState>({ status: "loading" });

  const read = useCallback(() => {
    groupStore.list().then(
      (list) => {
        setState({ status: "ready", ...list });
      },
      () => {
        // A list already on screen stays: this was only a look for news.
        setState((current) => (current.status === "ready" ? current : { status: "unavailable" }));
      },
    );
  }, []);
  useReadOnReturn(read);

  return state;
}

type GroupState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "missing" }
  | { readonly status: "newer" }
  | { readonly status: "corrupt" }
  | { readonly status: "ready"; readonly group: CardScoreGroup };

export interface UseGroup {
  readonly state: GroupState;
  /** Applies a pure change to the stored group and shows the result; rejects when it is refused. */
  readonly change: (apply: (group: CardScoreGroup) => CardScoreGroup) => Promise<CardScoreGroup>;
}

export function useGroup(id: string): UseGroup {
  const [state, setState] = useState<GroupState>({ status: "loading" });
  // A read that started before a change must not bring the old group back.
  const latest = useRef(0);

  const read = useCallback(() => {
    latest.current += 1;
    const asked = latest.current;
    groupStore.load(id).then(
      (loaded) => {
        if (asked !== latest.current) return;
        setState(
          loaded.kind === "saved"
            ? { status: "ready", group: loaded.group }
            : { status: loaded.kind },
        );
      },
      () => {
        if (asked !== latest.current) return;
        setState((current) => (current.status === "ready" ? current : { status: "unavailable" }));
      },
    );
  }, [id]);
  useReadOnReturn(read);

  const change = useCallback<UseGroup["change"]>(
    async (apply) => {
      latest.current += 1;
      const group = await groupStore.change(id, apply);
      setState({ status: "ready", group });
      return group;
    },
    [id],
  );

  return { state, change };
}
