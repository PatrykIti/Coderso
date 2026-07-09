import { describe, expect, test } from "vitest";

import { PAGE_INTERACTIVITY_CSS } from "../../../core/services/pages/pageCompositionEffects";

// TASK-534-03-L02 — static-shape coverage for PAGE_INTERACTIVITY_CSS. Pure string
// assertions (no DB, no DOM) matching the PAGE_COMPOSITION_EFFECTS_CSS static-shape
// suite. Guards the reduced-motion partitioning (functional vs motion rules) and
// the no-author-input security invariant.

describe("PAGE_INTERACTIVITY_CSS (TASK-534)", () => {
  const css = PAGE_INTERACTIVITY_CSS;

  test("is a non-empty string containing switcher / filter / magnetic selectors", () => {
    expect(typeof css).toBe("string");
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain("[data-switcher]");
    expect(css).toContain("[data-switcher-variant='pill']");
    expect(css).toContain("[data-switcher-variant='underline']");
    expect(css).toContain("[data-gallery-filter]");
    expect(css).toContain(".cx-filter-chip");
    expect(css).toContain("[data-filter-item].is-hidden");
    expect(css).toContain("[data-magnetic]");
  });

  test("[hidden] / .is-hidden display:none rules are OUTSIDE any reduced-motion guard", () => {
    // The FUNCTIONAL show/hide rules must be top-level (not nested in a
    // `@media (prefers-reduced-motion: no-preference)` block) so tabs/filters still
    // WORK (instant) for reduce users. Strip every media block, then assert the
    // functional rules survive at the top level.
    const withoutMedia = css.replace(
      /@media \(prefers-reduced-motion: no-preference\)\{[^}]*\}[^}]*\}/g,
      ""
    );
    // The simple single-rule media blocks in this string are `@media(...){SELECTOR{...}}`;
    // remove them and confirm the functional rules remain in what's left.
    const strippedMedia = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    expect(strippedMedia).toContain("[data-switcher-panel][hidden]{display:none}");
    expect(strippedMedia).toContain("[data-filter-item].is-hidden{display:none}");
    // Sanity: media stripping removed the motion transitions from the top level.
    expect(strippedMedia).not.toContain("transition:opacity .25s");
    expect(withoutMedia.length).toBeLessThanOrEqual(css.length);
  });

  test("every transition/opacity animated rule sits inside prefers-reduced-motion: no-preference", () => {
    // Split on the media guard opener; the PREFIX (before any guard) must contain no
    // transition/animation, while the guarded suffix carries them.
    const parts = css.split("@media (prefers-reduced-motion: no-preference)");
    const prefix = parts[0]!;
    expect(prefix).not.toContain("transition:");
    // Guarded content carries the panel crossfade + filter fade + magnetic transition.
    const guarded = parts.slice(1).join("");
    expect(guarded).toContain("transition:opacity");
    expect(guarded).toContain("transition:transform");
  });

  test("uses var(--primary) design token, not author input; contains no ${} interpolation or url()", () => {
    expect(css).toContain("var(--primary)");
    expect(css.includes("${")).toBe(false);
    // No author-data url() (the noise data-URI lives in pageInteractivityGlyphs).
    expect(css.includes("url(")).toBe(false);
  });
});
