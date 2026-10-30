// Vietnamese is the source language: its file defines the shape every other locale must match,
// so a key missing from en.json or ja.json is a type error.
import type viMessages from "../../messages/vi.json";
import type { Locale } from "./config";

export type Messages = typeof viMessages;

/** Loaded on demand so each request only pulls in one language. */
export const MESSAGE_LOADERS: Record<Locale, () => Promise<{ default: Messages }>> = {
  vi: () => import("../../messages/vi.json"),
  en: () => import("../../messages/en.json"),
  ja: () => import("../../messages/ja.json"),
};
