export type ShareOutcome = "shared" | "cancelled" | "copied" | "failed";

/**
 * Hands the summary to the device's share sheet when it has one, otherwise to the clipboard. The
 * player cancelling the sheet is no failure. The text leaves the device only where the player
 * sends it.
 */
export async function shareSummary(text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Not allowed here: the clipboard may still be.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
