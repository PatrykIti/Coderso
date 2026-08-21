import { describe, expect, test } from "vitest";

import {
  type BrandStyle,
  type MenuDocumentV2,
  type NavChromeStyle,
  type NavItemsProps,
  type NavLevelStyle,
} from "../../../core/services/menus/menuDocumentV2";
import {
  buildMenuDocumentCss,
  buildMenuDocumentPreviewCss,
  NAV_CHROME_COMPARE_KEYS,
  NAV_LEVEL_STYLE_COMPARE_KEYS,
  STRUCTURAL_BASE_ONLY_CHROME_KEYS,
} from "../../../core/site/menuDocumentCss";

/**
 * TASK-508 — R1(b)/R3a/R3b emission goldens (offset-reset matrix, linkAlign,
 * accordion in-flow) plus the TASK-508-03 front↔CSS class-hook coherence guard.
 * Split out of `menu-document-css.test.ts` so the §1-§7 suite stays under the
 * repo's 1,000-line file gate. `buildDoc`/`SCOPE`/link-selector helpers live in
 * the owning §1-§7 file; this suite keeps its own minimal copies for the
 * selectors it actually asserts.
 */

const SCOPE = `[data-site-menu-doc="true"]`;
const L1_LINK = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`;
const L2_LINK = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link`;
const L2_CONTAINER = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`;

type DocOpts = {
  brandStyle?: BrandStyle;
  navProps?: NavItemsProps;
  brandResponsive?: { tablet?: { style?: BrandStyle }; mobile?: { style?: BrandStyle } };
  navResponsive?: {
    tablet?: { navProps?: NavItemsProps };
    mobile?: { navProps?: NavItemsProps };
  };
};

const buildDoc = (opts: DocOpts = {}): MenuDocumentV2 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout: {},
      blocks: [
        {
          id: "blk_brand",
          type: "brand",
          props: {
            mode: "text",
            href: "/",
            text: "Acme",
            ...(opts.brandStyle ? { style: opts.brandStyle } : {}),
          },
          ...(opts.brandResponsive ? { responsive: opts.brandResponsive } : {}),
        },
        {
          id: "blk_nav",
          type: "nav-items",
          props: opts.navProps ?? {},
        },
      ],
      ...(opts.navResponsive ? { responsive: opts.navResponsive } : {}),
    },
  ],
});

const sharedBranchOf = (css: string) =>
  css.slice(css.indexOf("@media (min-width:"), css.indexOf("@media (max-width:"));
const mobileBranchOf = (css: string) => css.slice(css.indexOf("@media (max-width:"));
const tabletBlockOf = (css: string) => {
  const opener = "@media (min-width: 640px) and (max-width: 1023px){";
  const start = css.indexOf(opener);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("\n}", start));
};

// --- TASK-508 R1(b)/R3a/R3b emission goldens (§9) -----------------------------
// The all-four-direction offset-reset matrix (Hard Invariant #5) + the linkAlign
// text-align emission + accordion in-flow rules, asserted VERBATIM at both depths.
describe("TASK-508 R1(b)/R3a/R3b emission goldens (§9)", () => {
  const FIRST_DROPDOWN = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist`; // (0,4,0)
  // R3a offset map — mirror directionOffsets() in menuDocumentCss.ts EXACTLY.
  const DIRECTION_OFFSETS = {
    down: "left:0;top:100%;right:auto;bottom:auto",
    up: "left:0;bottom:100%;top:auto;right:auto",
    right: "left:100%;top:0;right:auto;bottom:auto",
    left: "right:100%;top:0;left:auto;bottom:auto",
  } as const;

  // R1(b) — linkAlign folds text-align into the per-level link decls -----------
  test("R1(b) linkAlign emits text-align on LEVEL_LINK_SELECTORS[lvl] per level; absent ⇒ no text-align", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 1: { linkAlign: "center" }, 2: { linkAlign: "right" } } },
      })
    );
    expect(sharedBranchOf(css)).toContain(`${L1_LINK}{text-align:center}`);
    expect(sharedBranchOf(css)).toContain(`${L2_LINK}{text-align:right}`);
    // link-level ⇒ re-emits at mobile via the linkOnly bucket:
    expect(mobileBranchOf(css)).toContain(`${L1_LINK}{text-align:center}`);
    // unset ⇒ no text-align anywhere (non-emptiness control: shell still emitted):
    const bare = buildMenuDocumentCss(buildDoc());
    expect(bare).toContain(".site-nav-link{");
    expect(bare).not.toContain("text-align:");
  });

  // R3a — unified direction: all four directions, both depths, all-four resets --
  test.each(["down", "up", "right", "left"] as const)(
    "R3a submenuDirection:%s emits TWO rules (level-1 precise (0,4,0) + anchored (0,5,0)) with ALL FOUR offsets reset — no double-anchor stretch",
    (dir) => {
      const offsets = DIRECTION_OFFSETS[dir];
      const shared = sharedBranchOf(
        buildMenuDocumentCss(buildDoc({ navProps: { navChrome: { submenuDirection: dir } } }))
      );
      expect(shared).toContain(`${FIRST_DROPDOWN}{${offsets}}`); // rule A
      expect(shared).toContain(`${L2_CONTAINER}{${offsets}}`); // rule B
      // every offset axis is DECLARED exactly once per rule (no inherited left:100%):
      for (const axis of ["left:", "right:", "top:", "bottom:"]) {
        expect(offsets.includes(axis)).toBe(true);
      }
    }
  );

  test("R3a is ≥640-only (absent from the mobile branch) + present-only (unset ⇒ ZERO direction bytes)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({ navProps: { navChrome: { submenuDirection: "down" } } })
    );
    expect(mobileBranchOf(css)).not.toContain(`${FIRST_DROPDOWN}{left:0;top:100%`);
    // positive control: the ≥640 shell DOES carry the direction rule, so the
    // mobile negative cannot pass on a truncated/missing stylesheet.
    expect(sharedBranchOf(css)).toContain(`${FIRST_DROPDOWN}{left:0;top:100%`);
    // unset doc emits neither rule (shell still emitted as the control):
    const bare = buildMenuDocumentCss(buildDoc());
    expect(bare).toContain(".site-nav-link{");
    expect(bare).not.toContain(`${FIRST_DROPDOWN}{left:0;top:100%`);
  });

  test("R3a precedence: submenuDirection is emitted BEFORE a granular level-2 submenuPlacement so the per-level override still WINS by source order", () => {
    const shared = sharedBranchOf(
      buildMenuDocumentCss(
        buildDoc({
          navProps: {
            navChrome: { submenuDirection: "down" },
            levelStyles: { 2: { submenuPlacement: "right" } },
          },
        })
      )
    );
    const globalIdx = shared.indexOf(`${L2_CONTAINER}{left:0;top:100%;right:auto;bottom:auto}`); // global down
    const placementIdx = shared.indexOf(`${L2_CONTAINER}{left:100%;right:auto;top:0;bottom:auto}`); // per-level right
    expect(globalIdx).toBeGreaterThanOrEqual(0);
    expect(placementIdx).toBeGreaterThan(globalIdx); // per-level wins (later source order)
  });

  test("R3a/R3b are BASE-ONLY: a tablet-authored submenuDirection / submenuMode produces ZERO tablet-delta bytes", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navResponsive: {
          tablet: { navProps: { navChrome: { submenuDirection: "up", submenuMode: "accordion" } } },
        },
      })
    );
    const tablet = tabletBlockOf(css);
    expect(tablet).not.toContain("bottom:100%"); // no direction delta
    expect(tablet).not.toContain("position:static"); // no accordion delta
    // positive control: base-authored equivalents DO emit in the ≥640 shell,
    // so these negatives cannot pass on a builder that dropped the rules.
    const baseAuthored = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: { submenuDirection: "up", submenuMode: "accordion" },
        },
      })
    );
    expect(sharedBranchOf(baseAuthored)).toContain(`${L2_CONTAINER}{left:0;bottom:100%`);
    expect(sharedBranchOf(baseAuthored)).toContain(`${SCOPE} .site-nav-sublist{position:static`);
  });

  // R3b — accordion in-flow block ---------------------------------------------
  test("R3b accordion emits vertical-stack + position:static + indent VERBATIM; a flyout-mode doc emits ZERO accordion bytes", () => {
    const shared = sharedBranchOf(
      buildMenuDocumentCss(buildDoc({ navProps: { navChrome: { submenuMode: "accordion" } } }))
    );
    expect(shared).toContain(`${SCOPE} .site-nav-list{flex-direction:column;align-items:stretch}`);
    expect(shared).toContain(
      `${SCOPE} .site-nav-sublist{position:static;box-shadow:none;border:0;min-width:0}`
    );
    expect(shared).toContain(`${SCOPE} .site-nav-sublist{padding-left:16px}`);
    // flyout mode (default) ⇒ none of these bytes:
    const flyout = buildMenuDocumentCss(
      buildDoc({ navProps: { navChrome: { submenuMode: "flyout" } } })
    );
    expect(flyout).not.toContain("position:static");
    expect(flyout).not.toContain(
      `${SCOPE} .site-nav-list{flex-direction:column;align-items:stretch}`
    );
  });

  test("R3b accordion gates the R2 flyout reveal OFF (no visibility:hidden over static content); the display:none→grid toggle stays", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: { submenuMode: "accordion" },
          levelStyles: { 1: { flyoutAnimation: "slide" } },
        },
      })
    );
    expect(css).not.toContain("visibility:hidden");
    expect(css).toContain(
      `${SCOPE} .site-nav-item:hover>.site-nav-sublist,${SCOPE} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`
    );
  });

  // R3b accordion — tablet-delta seam: the flyout skip must hold on the
  // collectLevelDeltaRules(doc,"tablet") @920 path, not only desktopShared. A
  // base accordion doc with a per-device TABLET flyoutAnimation must emit ZERO
  // visibility:hidden bytes inside the tablet media block (else the accordion
  // sublist reserves space but is invisible on tablet — a real visual gap).
  test("R3b accordion gates the flyout reveal OFF in the tablet delta too (base accordion + per-device tablet flyoutAnimation ⇒ ZERO visibility:hidden bytes)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { navChrome: { submenuMode: "accordion" } },
        navResponsive: {
          // flyoutAnimation drives the seam (WOULD emit visibility:hidden absent
          // the skip); linkColor co-varies so the tablet delta is non-empty even
          // once the flyout rule is correctly skipped.
          tablet: {
            navProps: { levelStyles: { 1: { flyoutAnimation: "slide", linkColor: "#abcdef" } } },
          },
        },
      })
    );
    const tablet = tabletBlockOf(css);
    // the tablet delta MUST have fired (level-1 re-emit present) but WITHOUT the
    // flyout reveal — accordion is recomputed from the base doc in the seam.
    expect(tablet).toContain(`${L1_LINK}{color:#abcdef}`);
    expect(tablet).not.toContain("visibility:hidden");
    // and no accordion visibility bytes leak into the whole output either:
    expect(css).not.toContain("visibility:hidden");
  });

  // Compare-key coverage guard (cross-subtask test #4 / named guard #5) --------
  // FAIL-CLOSED trip-wire: the field-enumeration objects below are typed
  // `Record<keyof …, true>`, so a NEW NavLevelStyle/NavChromeStyle field is a
  // COMPILE error here until listed; the runtime keys then drive the membership
  // assertions, catching a field that was added to the type but never wired into
  // its compare-key list (e.g. a missing `linkAlign`) — which would silently
  // suppress every per-device override of that field.
  const ALL_NAV_LEVEL_STYLE_FIELDS: Record<keyof NavLevelStyle, true> = {
    linkColor: true,
    linkHoverColor: true,
    linkHoverTextColor: true,
    linkActiveColor: true,
    fontSize: true,
    fontWeight: true,
    gap: true,
    paddingX: true,
    paddingY: true,
    background: true,
    borderColor: true,
    borderWidth: true,
    radius: true,
    shadow: true,
    minWidth: true,
    itemDividerShow: true,
    itemDividerColor: true,
    itemDividerWidth: true,
    itemDividerStyle: true,
    indicator: true,
    indicatorColor: true,
    indicatorThickness: true,
    indicatorGrow: true,
    hoverUnderline: true,
    transitionMs: true,
    hoverLift: true,
    showCaret: true,
    caretRotateOnOpen: true,
    flyoutAnimation: true,
    containerPaddingX: true,
    containerPaddingY: true,
    submenuPlacement: true,
    linkAlign: true,
  };
  const ALL_NAV_CHROME_STYLE_FIELDS: Record<keyof NavChromeStyle, true> = {
    navPillBackground: true,
    navPillRadius: true,
    navPillPaddingX: true,
    navPillPaddingY: true,
    itemDividerShow: true,
    itemDividerColor: true,
    itemDividerWidth: true,
    itemDividerStyle: true,
    indicator: true,
    indicatorColor: true,
    indicatorThickness: true,
    indicatorGrow: true,
    hoverUnderline: true,
    transitionMs: true,
    hoverLift: true,
    showCaret: true,
    caretRotateOnOpen: true,
    submenuDirection: true,
    submenuMode: true,
  };

  test("compare-key coverage guard: every NavLevelStyle field ∈ NAV_LEVEL_STYLE_COMPARE_KEYS; every NavChromeStyle field minus STRUCTURAL_BASE_ONLY_CHROME_KEYS ∈ NAV_CHROME_COMPARE_KEYS; the base-only keys are ABSENT", () => {
    // (a) every NavLevelStyle field is wired into the level compare list.
    for (const field of Object.keys(ALL_NAV_LEVEL_STYLE_FIELDS) as (keyof NavLevelStyle)[]) {
      expect(NAV_LEVEL_STYLE_COMPARE_KEYS).toContain(field);
    }
    // (b) every NavChromeStyle field EXCEPT the structural base-only keys is
    //     wired into the navChrome compare list.
    const baseOnly = new Set<string>(STRUCTURAL_BASE_ONLY_CHROME_KEYS);
    for (const field of Object.keys(ALL_NAV_CHROME_STYLE_FIELDS) as (keyof NavChromeStyle)[]) {
      if (baseOnly.has(field)) {
        expect(NAV_CHROME_COMPARE_KEYS).not.toContain(field);
      } else {
        expect(NAV_CHROME_COMPARE_KEYS).toContain(field);
      }
    }
    // (c) SEPARATELY assert the two structural base-only keys are ABSENT — a later
    //     accidental addition of a dead-data per-device delta is caught here.
    expect(STRUCTURAL_BASE_ONLY_CHROME_KEYS).toEqual(["submenuDirection", "submenuMode"]);
    expect(NAV_CHROME_COMPARE_KEYS).not.toContain("submenuDirection");
    expect(NAV_CHROME_COMPARE_KEYS).not.toContain("submenuMode");
  });

  // Per-device linkAlign delta (mobile ≠ tablet, both diff vs desktop) ---------
  test("R1(b) per-device: a tablet + mobile linkAlign override each diff vs DESKTOP; mobile ≠ tablet (linkAlign ∈ NAV_LEVEL_STYLE_COMPARE_KEYS)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 1: { linkAlign: "center" } } },
        navResponsive: {
          tablet: { navProps: { levelStyles: { 1: { linkAlign: "right" } } } },
          mobile: { navProps: { levelStyles: { 1: { linkAlign: "left" } } } },
        },
      })
    );
    expect(tabletBlockOf(css)).toContain(`${L1_LINK}{text-align:right}`);
    expect(mobileBranchOf(css)).toContain(`${L1_LINK}{text-align:left}`);
    // mobile carries its OWN value, never the tablet one:
    expect(mobileBranchOf(css)).not.toContain(`${L1_LINK}{text-align:right}`);
  });

  test("front↔canvas parity: the R3a direction + R3b accordion + R1(b) linkAlign rules appear in BOTH builders", () => {
    const styled = buildDoc({
      navProps: {
        navChrome: { submenuDirection: "down", submenuMode: "accordion" },
        levelStyles: { 1: { linkAlign: "center" } },
      },
    });
    const front = buildMenuDocumentCss(styled);
    const canvas = buildMenuDocumentPreviewCss(styled, "desktop");
    for (const rule of [
      `${FIRST_DROPDOWN}{left:0;top:100%;right:auto;bottom:auto}`,
      `${SCOPE} .site-nav-sublist{position:static;box-shadow:none;border:0;min-width:0}`,
      `${L1_LINK}{text-align:center}`,
    ]) {
      expect(front).toContain(rule);
      expect(canvas).toContain(rule);
    }
  });
});

// --- TASK-508-03 front↔CSS selector coherence (no dangling hook) --------------
// The Bun render suite (`tests/unit/site/menu-document-render.test.tsx`
// "TASK-508-03") is the AUTHORITATIVE proof that `SiteHeaderMenuDocumentRender`
// renders every `.site-nav-*` hook the 508 fields target (and that `siteShell.tsx`
// needs ZERO markup change). This Bun-free guard mirrors it at the CSS layer: it
// derives the class-hook vocabulary the 508 selectors USE and asserts each hook is
// one the front markup provides — so a typo'd/dangling selector (e.g. a new field
// wired to a non-existent hook) fails here, not silently in production.
describe("TASK-508-03 front↔CSS coherence (§8)", () => {
  // The canonical `.site-nav-*` hooks SiteHeaderMenuDocumentRender emits (pinned by
  // the Bun render suite). A selector referencing anything outside this set dangles.
  const FRONT_NAV_HOOKS = new Set([
    "site-nav-list",
    "site-nav-item",
    "site-nav-sublist",
    "site-nav-link",
    "site-nav-group", // details-mode <details class="site-nav-group"> (siteShell.tsx)
    "site-nav-group-label",
    "site-nav-disclosure",
    "site-nav-utility",
    "site-nav-extras",
    "site-nav",
  ]);

  test("every nav class hook the 508 fields (linkAlign+direction+accordion+R2) emit resolves to a front markup hook", () => {
    // Accordion doc — carries linkAlign + direction + accordion selectors.
    const accordion = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: { submenuDirection: "down", submenuMode: "accordion" },
          levelStyles: { 1: { linkAlign: "center" }, 2: { linkAlign: "center" } },
        },
      })
    );
    // Flyout doc — carries the R2 perceptible reveal selectors (accordion gates R2 off).
    const flyout = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: { submenuDirection: "down" },
          levelStyles: { 1: { linkAlign: "center", flyoutAnimation: "slide" } },
        },
      })
    );
    for (const css of [accordion, flyout]) {
      // Declarations never contain a class selector, so every `.site-nav-*` token is a hook.
      const hooks = new Set([...css.matchAll(/\.site-nav-[a-z0-9-]+/g)].map((m) => m[0].slice(1)));
      expect(hooks.size).toBeGreaterThan(0);
      for (const hook of hooks) expect([...FRONT_NAV_HOOKS]).toContain(hook);
    }
  });
});
