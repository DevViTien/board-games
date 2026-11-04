import { createRequire } from "node:module";

import { expect, type Page, test } from "@playwright/test";
import type { AxeResults, NodeResult, Result, RunOptions } from "axe-core";

// Automated accessibility checks (change `polish-accessibility-and-mobile`, design §1): axe-core,
// injected into the page as the browser runs it, without a wrapper package.

/** The browser build of axe-core, resolved from this ESM module (`require` does not exist here). */
const AXE_PATH = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

/** WCAG 2.0, 2.1 and 2.2 at levels A and AA. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

/**
 * The axe rules Lighthouse scores its Accessibility category with, best practices among them:
 * copied from Lighthouse 13.5's `core/config/default-config.js` (category `accessibility`, its audits'
 * axe ids; the manual audits left out), the version run when this change was applied. With these green, the Lighthouse
 * score only depends on what it leaves to manual checks. Ids this axe-core no longer has are skipped
 * (`knownRules`).
 */
const LIGHTHOUSE_RULES = [
  "accesskeys",
  "aria-allowed-attr",
  "aria-allowed-role",
  "aria-command-name",
  "aria-conditional-attr",
  "aria-deprecated-role",
  "aria-dialog-name",
  "aria-hidden-body",
  "aria-hidden-focus",
  "aria-input-field-name",
  "aria-meter-name",
  "aria-progressbar-name",
  "aria-prohibited-attr",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  "aria-roles",
  "aria-text",
  "aria-toggle-field-name",
  "aria-tooltip-name",
  "aria-treeitem-name",
  "aria-valid-attr-value",
  "aria-valid-attr",
  "autocomplete-valid",
  "button-name",
  "bypass",
  "color-contrast",
  "definition-list",
  "dlitem",
  "document-title",
  "duplicate-id-aria",
  "empty-heading",
  "form-field-multiple-labels",
  "frame-title",
  "heading-order",
  "html-has-lang",
  "html-lang-valid",
  "html-xml-lang-mismatch",
  "identical-links-same-purpose",
  "image-alt",
  "image-redundant-alt",
  "input-button-name",
  "input-image-alt",
  "label-content-name-mismatch",
  "label",
  "landmark-one-main",
  "link-in-text-block",
  "link-name",
  "list",
  "listitem",
  "meta-refresh",
  "meta-viewport",
  "object-alt",
  "presentation-role-conflict",
  "select-name",
  "skip-link",
  "svg-img-alt",
  "tabindex",
  "table-duplicate-name",
  "table-fake-caption",
  "target-size",
  "td-has-header",
  "td-headers-attr",
  "th-has-data-cells",
  "valid-lang",
  "video-caption",
] as const;

/** One finding, short enough to read in a failed test. */
interface Finding {
  readonly id: string;
  readonly impact: string | null;
  readonly help: string;
  readonly targets: readonly string[];
}

declare global {
  interface Window {
    axe?: {
      run: (context: Document, options: RunOptions) => Promise<AxeResults>;
      getRules: (tags?: string[]) => { ruleId: string; tags: string[] }[];
    };
  }
}

/**
 * Waits until the page stands still: the web fonts loaded and no finite animation running (a die,
 * a piece sliding, confetti), so contrast is checked on what stays on screen. The specs run with
 * `reducedMotion: "reduce"`, which stops the endless ones too.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(() =>
      page.evaluate(() =>
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.playState !== "running" ||
              animation.effect?.getComputedTiming().iterations === Infinity,
          ),
      ),
    )
    .toBe(true);
}

async function inject(page: Page): Promise<void> {
  if (await page.evaluate(() => window.axe === undefined)) {
    await page.addScriptTag({ path: AXE_PATH });
  }
}

function summarise(results: readonly Result[]): Finding[] {
  return results.map((result) => ({
    id: result.id,
    impact: result.impact ?? null,
    help: result.help,
    targets: result.nodes.map((node: NodeResult) => node.target.join(" ")),
  }));
}

function describe(findings: readonly Finding[]): string {
  return findings
    .map(
      (finding) =>
        `${finding.id} (${finding.impact ?? "?"}): ${finding.help}\n  ${finding.targets.join("\n  ")}`,
    )
    .join("\n");
}

/**
 * Checks the page as it is now against WCAG 2.x A and AA and the rules Lighthouse scores: fails on
 * any violation (each with its rule, impact and elements). What axe could not decide (`incomplete`:
 * contrast over a picture, say) is attached to the test as `axe-<screen>.json`, not a failure; the
 * design's "Kết quả kiểm tra" records it after each review.
 */
export async function expectNoAxeViolations(page: Page, screen: string): Promise<void> {
  await settle(page);
  await inject(page);
  const { violations, incomplete } = await page.evaluate(
    async ({ tags, lighthouse }) => {
      const axe = window.axe;
      if (axe === undefined) throw new Error("axe-core is not loaded");
      const known = new Set(axe.getRules().map((rule) => rule.ruleId));
      const values = [
        ...new Set([
          // As `runOnly` by tag would: without the experimental rules (Lighthouse names its own).
          ...axe
            .getRules([...tags])
            .filter((rule) => !rule.tags.includes("experimental"))
            .map((rule) => rule.ruleId),
          ...lighthouse.filter((id) => known.has(id)),
        ]),
      ];
      const results = await axe.run(document, {
        runOnly: { type: "rule", values },
        resultTypes: ["violations", "incomplete"],
      });
      return { violations: results.violations, incomplete: results.incomplete };
    },
    { tags: WCAG_TAGS, lighthouse: LIGHTHOUSE_RULES },
  );
  const found = summarise(violations);
  await test.info().attach(`axe-${screen}.json`, {
    body: JSON.stringify({ screen, violations: found, incomplete: summarise(incomplete) }, null, 2),
    contentType: "application/json",
  });
  expect(found, `${screen}:\n${describe(found)}`).toEqual([]);
}

/**
 * Every axe best practice, once (desktop, light): reported only, attached as
 * `axe-best-practice-<screen>.json`; the design records what is fixed and what is kept, and why.
 */
export async function reportBestPractices(page: Page, screen: string): Promise<void> {
  await settle(page);
  await inject(page);
  const violations = await page.evaluate(async () => {
    const axe = window.axe;
    if (axe === undefined) throw new Error("axe-core is not loaded");
    const results = await axe.run(document, {
      runOnly: { type: "tag", values: ["best-practice"] },
      resultTypes: ["violations"],
    });
    return results.violations;
  });
  await test.info().attach(`axe-best-practice-${screen}.json`, {
    body: JSON.stringify({ screen, violations: summarise(violations) }, null, 2),
    contentType: "application/json",
  });
}
