import { describe, expect, test } from "vitest";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  type BrandStyle,
  type MenuDocumentV2,
  type NavChromeStyle,
  type NavItemsProps,
  type NavLevelStyle,
  type NavLevelStyles,
} from "../../../core/services/menus/menuDocumentV2";
import {
  buildMenuDocumentCss,
  buildMenuDocumentPreviewCss,
  NAV_CHROME_COMPARE_KEYS,
  NAV_LEVEL_STYLE_COMPARE_KEYS,
  STRUCTURAL_BASE_ONLY_CHROME_KEYS,
} from "../../../core/site/menuDocumentCss";

/**
 * TASK-504-02 — scoped emission for brand styling, per-nesting-level styling,
 * the cheap-win keys (per-link padding/radius, hover-text, current-page), the
 * per-device brand/level deltas, and the canvas force-open. Asserts the EXACT
 * doc-scoped selectors AND the present-only (zero-bytes-when-unauthored) guard.
 * Byte-identity for no-override docs is separately locked by the Bun golden
 * suite (`tests/unit/site/menu-document-render.test.tsx`).
 */

const SCOPE = `[data-site-menu-doc="true"]`;
const TOP_BAR_LINK = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-link`;
const L1_LINK = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`;
const L2_LINK = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link`;
const L1_CONTAINER = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist, ${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`;
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
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
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

const baseBranchOf = (css: string) => css.slice(0, css.indexOf("@media (min-width:"));
const sharedBranchOf = (css: string) =>
  css.slice(css.indexOf("@media (min-width:"), css.indexOf("@media (max-width:"));
const mobileBranchOf = (css: string) => css.slice(css.indexOf("@media (max-width:"));
const tabletBlockOf = (css: string) => {
  const opener = "@media (min-width: 640px) and (max-width: 1023px){";
  const start = css.indexOf(opener);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("\n}", start));
};

// --- §1 brand -------------------------------------------------------------

describe("collectMenuBrandRules (§1)", () => {
  test("text + image style emit scoped decls on the block-id stamp", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        brandStyle: {
          fontSize: 22,
          fontWeight: 700,
          color: "#112233",
          textTransform: "uppercase",
          letterSpacing: 2,
          height: 48,
          maxWidth: 200,
        },
      })
    );
    const base = baseBranchOf(css);
    expect(base).toContain(
      `${SCOPE} [data-menu-block-id="blk_brand"]{font-size:22px;font-weight:700;color:#112233;text-transform:uppercase;letter-spacing:2px}`
    );
    expect(base).toContain(
      `${SCOPE} [data-menu-block-id="blk_brand"] img{height:48px;max-width:200px;width:auto}`
    );
  });

  test("absent style ⇒ ZERO brand bytes", () => {
    const css = buildMenuDocumentCss(buildDoc());
    expect(css).not.toContain(`[data-menu-block-id="blk_brand"]`);
  });

  test("brand rule appears on BOTH front and canvas (shared builder parity)", () => {
    const doc = buildDoc({ brandStyle: { color: "#abcdef" } });
    const rule = `${SCOPE} [data-menu-block-id="blk_brand"]{color:#abcdef}`;
    expect(buildMenuDocumentCss(doc)).toContain(rule);
    expect(buildMenuDocumentPreviewCss(doc, "desktop")).toContain(rule);
  });
});

// --- §2 per-level ---------------------------------------------------------

describe("navLevelRules (§2)", () => {
  test("level 1 & 2 emit the EXACT depth selectors (links + containers)", () => {
    const levelStyles: NavLevelStyles = {
      1: { linkColor: "#111111", background: "#fafafa", borderColor: "#dddddd", radius: 8 },
      2: { linkColor: "#222222", background: "#eeeeee" },
    };
    const shared = sharedBranchOf(buildMenuDocumentCss(buildDoc({ navProps: { levelStyles } })));
    // `radius` applies to the LINK (border-radius) AND the container — by design.
    expect(shared).toContain(`${L1_LINK}{color:#111111;border-radius:8px}`);
    expect(shared).toContain(`${L2_LINK}{color:#222222}`);
    expect(shared).toContain(
      `${L1_CONTAINER}{background:#fafafa;border:1px solid #dddddd;border-radius:8px}`
    );
    expect(shared).toContain(`${L2_CONTAINER}{background:#eeeeee}`);
    // level-2 link selector is STRICTLY more specific (extra .site-nav-sublist)
    // than level 1 — the N-1 cascade lock.
    expect(L2_LINK.startsWith(L1_LINK.replace(" .site-nav-link", ""))).toBe(true);
  });

  test("level base rules ride the ALL-WIDTH base? NO — link+container ride desktopShared and re-emit into mobile (mobile inherits desktop)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 1: { linkColor: "#abcdef" } } } })
    );
    // level-1 link rule appears in BOTH the >=640 shared region AND the <640 mobile branch.
    expect(sharedBranchOf(css)).toContain(`${L1_LINK}{color:#abcdef}`);
    expect(mobileBranchOf(css)).toContain(`${L1_LINK}{color:#abcdef}`);
  });

  test("container chrome is >=640-only: the <640 mobile bucket re-emits ONLY level LINK typography, never the submenu CONTAINER chrome", () => {
    // level-1 carries BOTH link typography (color) AND container chrome
    // (background/border/min-width). The nav is INLINE below 640 (base sheet
    // strips the dropdown chrome), so container decls must NOT reach the mobile
    // bucket — re-emitting min-width/background there would paint/overflow the
    // inline nested list (parent contract: container folds into desktopShared).
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          levelStyles: {
            1: {
              linkColor: "#abcdef",
              background: "#fafafa",
              borderColor: "#dddddd",
              minWidth: 480,
            },
          },
        },
      })
    );
    const shared = sharedBranchOf(css);
    const mobile = mobileBranchOf(css);
    // Container chrome DOES ride the shared >=640 bucket.
    expect(shared).toContain(
      `${L1_CONTAINER}{background:#fafafa;border:1px solid #dddddd;min-width:480px}`
    );
    // Level LINK typography STILL reaches the <640 inline view (mobile inherits desktop).
    expect(mobile).toContain(`${L1_LINK}{color:#abcdef}`);
    // But the container rule (and every container declaration) is ABSENT from <640.
    expect(mobile).not.toContain(`${L1_CONTAINER}{`);
    expect(mobile).not.toContain(`background:#fafafa`);
    expect(mobile).not.toContain(`min-width:480px`);
    expect(mobile).not.toContain(`border:1px solid #dddddd`);
  });

  test("a MOBILE-specific level container override also stays out of the <640 bucket (delta is link-only on mobile)", () => {
    // A mobile-forked level container must not leak either — the mobile delta
    // re-emits only link typography, never container chrome.
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 1: { linkColor: "#111111" } } },
        navResponsive: {
          mobile: {
            navProps: {
              levelStyles: { 1: { linkColor: "#222222", background: "#0f0f0f", minWidth: 320 } },
            },
          },
        },
      })
    );
    const mobile = mobileBranchOf(css);
    // The mobile-forked LINK color IS emitted (delta wins on source order).
    expect(mobile).toContain(`${L1_LINK}{color:#222222}`);
    // The mobile-forked CONTAINER chrome is NOT.
    expect(mobile).not.toContain(`background:#0f0f0f`);
    expect(mobile).not.toContain(`min-width:320px`);
    // Tablet (>=640) keeps the full container chrome path — sanity: the base
    // desktop container still rides the shared bucket unaffected by this fork.
  });

  test("gap lands on the CONTAINER, never the link (inert on display:block)", () => {
    const shared = sharedBranchOf(
      buildMenuDocumentCss(buildDoc({ navProps: { levelStyles: { 1: { gap: 6 } } } }))
    );
    expect(shared).toContain(`${L1_CONTAINER}{gap:6px}`);
    // no link rule at all (only gap authored ⇒ empty link decls) and no `gap:` on any link selector.
    expect(shared).not.toContain(`${L1_LINK}{`);
  });

  test("a level present with only linkColor emits ONLY color (sparse, no neutral leak)", () => {
    const shared = sharedBranchOf(
      buildMenuDocumentCss(buildDoc({ navProps: { levelStyles: { 1: { linkColor: "#0a0a0a" } } } }))
    );
    expect(shared).toContain(`${L1_LINK}{color:#0a0a0a}`);
    expect(shared).not.toContain(`${L1_CONTAINER}{`);
  });

  test("hover/active state ride the state selectors; shadow none ⇒ explicit box-shadow:none", () => {
    const shared = sharedBranchOf(
      buildMenuDocumentCss(
        buildDoc({
          navProps: {
            levelStyles: {
              1: {
                linkHoverColor: "#f00",
                linkHoverTextColor: "#fff",
                linkActiveColor: "#00f",
                shadow: "none",
              },
            },
          },
        })
      )
    );
    expect(shared).toContain(
      `${L1_LINK}:hover,${L1_LINK}:focus-visible{background:#f00;color:#fff}`
    );
    expect(shared).toContain(`${L1_LINK}:active{background:#00f}`);
    expect(shared).toContain(`box-shadow:none`);
  });

  test("undefined levelStyles ⇒ ZERO level bytes", () => {
    const css = buildMenuDocumentCss(buildDoc());
    expect(css).not.toContain(".site-nav-sublist .site-nav-link");
  });
});

// --- §3 per-link box group ------------------------------------------------

describe("per-link padding/radius (§3)", () => {
  test("UNAUTHORED ⇒ ZERO bytes (present-only, no default seed)", () => {
    const css = buildMenuDocumentCss(buildDoc());
    // the only .site-nav-link{...} rule is group 5 (color), never a padding rule.
    expect(css).not.toContain(`${SCOPE} .site-nav-link{padding:`);
    expect(css).not.toContain(`${SCOPE} .site-nav-link{border-radius:`);
  });

  test("authored padding + radius emit; a single axis completes the shorthand from the base-sheet fallback", () => {
    const both = baseBranchOf(
      buildMenuDocumentCss(
        buildDoc({ navProps: { linkPaddingX: 20, linkPaddingY: 10, linkRadius: 4 } })
      )
    );
    expect(both).toContain(`${SCOPE} .site-nav-link{padding:10px 20px;border-radius:4px}`);
    const oneAxis = baseBranchOf(
      buildMenuDocumentCss(buildDoc({ navProps: { linkPaddingX: 20 } }))
    );
    expect(oneAxis).toContain(`${SCOPE} .site-nav-link{padding:8px 20px}`); // PY completed from fallback 8
  });

  test("tablet override re-emits a TOTAL box rule into the bounded tablet media", () => {
    const doc = buildDoc({
      navProps: { linkPaddingX: 20 },
      navResponsive: { tablet: { navProps: { linkPaddingX: 30 } } },
    });
    expect(tabletBlockOf(buildMenuDocumentCss(doc))).toContain(
      `${SCOPE} .site-nav-link{padding:8px 30px;border-radius:6px}`
    );
  });
});

// --- §4 hover-text + current-page -----------------------------------------

describe("hover-text + current-page (§4)", () => {
  test("group-6 base appends color ONLY when linkHoverTextColor set", () => {
    const withText = baseBranchOf(
      buildMenuDocumentCss(
        buildDoc({ navProps: { linkHoverColor: "#eee", linkHoverTextColor: "#333" } })
      )
    );
    expect(withText).toContain(`background:#eee;color:#333`);
    const withoutText = baseBranchOf(buildMenuDocumentCss(buildDoc()));
    // default hover background exists but no hover-text color decl.
    expect(withoutText).not.toContain(`:focus-visible{background:rgba(15,23,42,.06);color:`);
  });

  test("hover delta reverts unset hover-text to the RESOLVED base linkColor, NOT inherit", () => {
    const doc = buildDoc({
      navProps: { linkColor: "#111111" },
      navResponsive: { tablet: { navProps: { linkHoverColor: "#999999" } } },
    });
    const tablet = tabletBlockOf(buildMenuDocumentCss(doc));
    expect(tablet).toContain(`background:#999999;color:#111111`);
    expect(tablet).not.toContain(`color:inherit`);
  });

  test("current-page rule emits present-only, keyed off linkActiveColor", () => {
    const withActive = baseBranchOf(
      buildMenuDocumentCss(buildDoc({ navProps: { linkActiveColor: "#7c3aed" } }))
    );
    expect(withActive).toContain(
      `${SCOPE} .site-nav-link:where([aria-current="page"]){color:#7c3aed}`
    );
    const withoutActive = buildMenuDocumentCss(buildDoc());
    expect(withoutActive).not.toContain(`aria-current`);
  });
});

// --- §5 per-device brand + level deltas -----------------------------------

describe("per-device brand + level deltas (§5)", () => {
  test("brand delta emits ONLY when the device-resolved style differs from desktop", () => {
    const doc = buildDoc({
      brandStyle: { fontSize: 20 },
      brandResponsive: { tablet: { style: { fontSize: 30 } } },
    });
    const css = buildMenuDocumentCss(doc);
    expect(baseBranchOf(css)).toContain(`[data-menu-block-id="blk_brand"]{font-size:20px}`);
    expect(tabletBlockOf(css)).toContain(`[data-menu-block-id="blk_brand"]{font-size:30px}`);
  });

  test("a tablet brand override EQUAL to desktop ⇒ NO tablet brand delta", () => {
    const doc = buildDoc({
      brandStyle: { fontSize: 20 },
      brandResponsive: { tablet: { style: { fontSize: 20 } } },
    });
    expect(tabletBlockOf(buildMenuDocumentCss(doc))).not.toContain(
      `[data-menu-block-id="blk_brand"]`
    );
  });

  test("brand delta diffs vs DESKTOP (mobile ≠ tablet)", () => {
    const doc = buildDoc({
      brandStyle: { fontSize: 20 },
      brandResponsive: { mobile: { style: { fontSize: 40 } } },
    });
    const css = buildMenuDocumentCss(doc);
    expect(tabletBlockOf(css)).not.toContain(`[data-menu-block-id="blk_brand"]`); // tablet inherits desktop
    expect(mobileBranchOf(css)).toContain(`[data-menu-block-id="blk_brand"]{font-size:40px}`);
  });

  test("level delta emits the device-resolved level rule when differing from desktop", () => {
    const doc = buildDoc({
      navProps: { levelStyles: { 1: { linkColor: "#111111" } } },
      navResponsive: { tablet: { navProps: { levelStyles: { 1: { linkColor: "#222222" } } } } },
    });
    expect(tabletBlockOf(buildMenuDocumentCss(doc))).toContain(`${L1_LINK}{color:#222222}`);
  });
});

// --- §6 canvas force-open -------------------------------------------------

describe("canvas force-open (§6)", () => {
  const doc = buildDoc({
    navProps: { levelStyles: { 1: { linkColor: "#111" }, 2: { linkColor: "#222" } } },
  });
  // TASK-506-02 + TASK-508 R2: force-open now ALSO neutralizes the flyoutAnimation
  // closed rest (`visibility:visible;opacity:1;transform:none`) and the level-2 rule
  // uses the anchored (0,5,0) form so it ties flyoutAnimRule(2)'s hidden selector
  // (short (0,3,0) would lose). The `visibility:visible` fold is UNCONDITIONAL (added
  // even on a no-flyoutAnimation doc — this doc has none @376).
  const L1_OPEN = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`;
  const L2_OPEN = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`;

  test("level 1 opens ONLY the level-1 sublist, LAST", () => {
    const css = buildMenuDocumentPreviewCss(doc, "desktop", 1);
    expect(css).toContain(L1_OPEN);
    expect(css).not.toContain(L2_OPEN);
    expect(css.lastIndexOf(L1_OPEN)).toBeGreaterThan(
      css.indexOf(`${SCOPE} .site-nav-sublist{display:none}`)
    );
  });

  test("level 2 opens the WHOLE ancestor chain (levels 1 AND 2)", () => {
    const css = buildMenuDocumentPreviewCss(doc, "desktop", 2);
    expect(css).toContain(L1_OPEN);
    expect(css).toContain(L2_OPEN);
  });

  test("no forceOpenLevel ⇒ byte-identical to the un-forced preview; force-open never on the front", () => {
    expect(buildMenuDocumentPreviewCss(doc, "desktop")).toBe(
      buildMenuDocumentPreviewCss(doc, "desktop", undefined)
    );
    // the front carries hover/focus-within `{display:grid}` (navNestingRules) but
    // NEVER the unconditional force-open rules.
    expect(buildMenuDocumentCss(doc)).not.toContain(L1_OPEN);
    expect(buildMenuDocumentCss(doc)).not.toContain(L2_OPEN);
  });
});

// --- §7 TASK-506 modern bundles — per-bundle emission goldens --------------
// Closure (506-05) gap-fill: positive exact-string goldens for B1–B5 that the
// vitest lane was missing (siblings covered force-open + byte-identity; these pin
// the emitted selectors themselves). Every string is captured verbatim from the
// live builder. Present-only + doc-scope + front↔canvas parity are re-asserted.

describe("TASK-506-02 modern bundle emission goldens (§7)", () => {
  // B1 — item separators, orientation-aware -----------------------------------
  test("B1 level-0 (navChrome) top-bar emits a VERTICAL divider (border-inline-end) on :not(:last-child); ≥640-only", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: {
            itemDividerShow: true,
            itemDividerColor: "#cccccc",
            itemDividerWidth: 2,
            itemDividerStyle: "dashed",
          },
        },
      })
    );
    const rule = `${SCOPE} .site-nav-list > .site-nav-item:not(:last-child){border-inline-end:2px dashed #cccccc}`;
    expect(sharedBranchOf(css)).toContain(rule);
    // container-level (≥640-only): NOT re-emitted into the <640 mobile bucket.
    expect(mobileBranchOf(css)).not.toContain("border-inline-end");
  });

  test("B1 level-1 dropdown emits a HORIZONTAL divider (border-block-end) on the dedicated single-member selector", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          levelStyles: {
            1: {
              itemDividerShow: true,
              itemDividerColor: "#cccccc",
              itemDividerWidth: 2,
              itemDividerStyle: "solid",
            },
          },
        },
      })
    );
    const rule = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child){border-block-end:2px solid #cccccc}`;
    expect(sharedBranchOf(css)).toContain(rule);
  });

  // B2 — indicator + hover/lift/transition ------------------------------------
  test("B2 indicator emits a ::before bar (grow ⇒ scaleX) shown on :hover/:focus-visible/[aria-current]; link gets position:relative; re-emits at mobile (link-level)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: {
            indicator: "underline",
            indicatorColor: "#123456",
            indicatorThickness: 3,
            indicatorGrow: true,
            hoverUnderline: true,
            transitionMs: 200,
            hoverLift: 4,
          },
        },
      })
    );
    // TASK-507 A.1: the transition + position:relative stay cascade-root
    // `.site-nav-link` (harmless anchors), but the B2 ::before bar + hover-lift/
    // underline are scoped to the TOP-BAR-only selector so they never leak onto
    // dropdown links. TASK-507 A.2: the grow rest-block resets `opacity:1` too.
    const relative = `${SCOPE} .site-nav-link{transition:color 200ms,background 200ms,transform 200ms;position:relative}`;
    const bar = `${TOP_BAR_LINK}::before{content:"";position:absolute;left:0;bottom:0;height:3px;width:100%;background:#123456;transform:scaleX(0);opacity:1;transform-origin:left;transition:transform 200ms}`;
    const shown = `${TOP_BAR_LINK}:hover::before,${TOP_BAR_LINK}:focus-visible::before,${TOP_BAR_LINK}:where([aria-current="page"])::before{transform:scaleX(1)}`;
    const lift = `${TOP_BAR_LINK}:hover,${TOP_BAR_LINK}:focus-visible{text-decoration:underline;transform:translateY(-4px)}`;
    for (const rule of [relative, bar, shown, lift]) {
      expect(sharedBranchOf(css)).toContain(rule);
      // link-level ⇒ ALSO re-emits into the <640 mobile bucket (mobile inherits desktop).
      expect(mobileBranchOf(css)).toContain(rule);
    }
  });

  test("B2 non-grow indicator uses opacity (not scaleX) and resets transform:none at rest (TASK-507 A.2)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { navChrome: { indicator: "underline", indicatorColor: "#111111" } },
      })
    );
    expect(css).toContain(
      `${TOP_BAR_LINK}::before{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;background:#111111;opacity:0;transform:none;transition:opacity 150ms}`
    );
    expect(css).toContain(
      `${TOP_BAR_LINK}:hover::before,${TOP_BAR_LINK}:focus-visible::before,${TOP_BAR_LINK}:where([aria-current="page"])::before{opacity:1}`
    );
  });

  test("B2 (TASK-507 A.1) level-0 indicator does NOT leak onto dropdown links: no bare `.site-nav-link::before` and no `.site-nav-sublist` indicator from navChrome", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: {
            indicator: "underline",
            indicatorColor: "#123456",
            hoverUnderline: true,
            hoverLift: 4,
          },
        },
      })
    );
    // The cascade-root `.site-nav-link::before` (which matches ALL depths) must
    // NEVER carry the level-0 bar — only the TOP-BAR-scoped selector does.
    expect(css).not.toContain(`${SCOPE} .site-nav-link::before`);
    // navChrome authored ONLY level 0 ⇒ no level-1/2 sublist link indicator emitted.
    expect(css).not.toContain(`${L1_LINK}::before`);
    expect(css).not.toContain(`${L2_LINK}::before`);
    // The top-bar bar + hover-lift/underline ARE emitted, top-bar-scoped.
    expect(css).toContain(`${TOP_BAR_LINK}::before{`);
    expect(css).toContain(
      `${TOP_BAR_LINK}:hover,${TOP_BAR_LINK}:focus-visible{text-decoration:underline;transform:translateY(-4px)}`
    );
  });

  test("B2 (TASK-507 A.2) EVERY indicator rest-block resets BOTH axes — grow adds opacity:1, non-grow adds transform:none, at level 1 and level 2", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          levelStyles: {
            1: { indicator: "underline", indicatorColor: "#aaa", indicatorGrow: true },
            2: { indicator: "overline", indicatorColor: "#bbb" }, // non-grow
          },
        },
      })
    );
    // level-1 grow rest-block carries `opacity:1` alongside `transform:scaleX(0)`.
    expect(css).toContain(
      `${L1_LINK}::before{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;background:#aaa;transform:scaleX(0);opacity:1;transform-origin:left;transition:transform 150ms}`
    );
    // level-2 non-grow rest-block carries `transform:none` alongside `opacity:0`.
    expect(css).toContain(
      `${L2_LINK}::before{content:"";position:absolute;left:0;top:0;height:2px;width:100%;background:#bbb;opacity:0;transform:none;transition:opacity 150ms}`
    );
  });

  test("B2 (TASK-507 A.1) per-device chrome delta emits the indicator bar on the TOP-BAR-only selector (front↔canvas parity)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { navChrome: { indicator: "underline", indicatorColor: "#111" } },
        navResponsive: {
          tablet: { navProps: { navChrome: { indicator: "underline", indicatorColor: "#222" } } },
        },
      })
    );
    // tablet delta re-emits the bar on the top-bar-only selector, never the root.
    expect(tabletBlockOf(css)).toContain(`${TOP_BAR_LINK}::before{`);
    expect(tabletBlockOf(css)).not.toContain(`${SCOPE} .site-nav-link::before`);
  });

  // B3 — caret toggle/rotate + flyout animation -------------------------------
  test("B3 showCaret:false suppresses the caret ::after (content:none) for that level", () => {
    const css = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 1: { showCaret: false } } } })
    );
    expect(css).toContain(
      `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link::after{content:none}`
    );
  });

  test("B3 caretRotateOnOpen rotates the caret 180deg on :hover/:focus-within", () => {
    const css = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 1: { caretRotateOnOpen: true } } } })
    );
    expect(css).toContain(
      `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link::after{display:inline-block;transform:rotate(0);transition:transform 150ms}`
    );
    expect(css).toContain(
      `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"]:hover > .site-nav-link::after,${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"]:focus-within > .site-nav-link::after{transform:rotate(180deg)}`
    );
  });

  test("TASK-508 R2 flyoutAnimation:slide emits the perceptible visibility+opacity+transform reveal (rest display:grid;visibility:hidden, shown visibility:visible) with NO @starting-style/allow-discrete/display-in-transition; display:none→grid toggle stays", () => {
    const css = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 1: { flyoutAnimation: "slide" } } } })
    );
    const rest = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:hidden;opacity:0;transform:translateY(-6px);transition:opacity 150ms,transform 150ms,visibility 0s linear 150ms}`;
    const shown = `${SCOPE} .site-nav-list > .site-nav-item:hover > .site-nav-sublist,${SCOPE} .site-nav-list > .site-nav-item:focus-within > .site-nav-sublist{visibility:visible;opacity:1;transform:none;transition:opacity 150ms,transform 150ms,visibility 0s}`;
    expect(css).toContain(rest);
    expect(css).toContain(shown);
    // The perceptible fix EMITS `visibility` and drops the inert allow-discrete machinery.
    expect(css).toContain("visibility:hidden");
    expect(css).not.toContain("@starting-style");
    expect(css).not.toContain("allow-discrete");
    // reachability: the base display:none→grid open toggle is NOT removed.
    expect(css).toContain(
      `${SCOPE} .site-nav-item:hover>.site-nav-sublist,${SCOPE} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`
    );
  });

  // B4 — pill nav + dropdown padding ------------------------------------------
  test("B4 pill emits on .site-nav-list (bg/radius/padding = py px); ≥640-only", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: {
            navPillBackground: "#eeeeee",
            navPillRadius: 24,
            navPillPaddingX: 12,
            navPillPaddingY: 8,
          },
        },
      })
    );
    expect(sharedBranchOf(css)).toContain(
      `${SCOPE} .site-nav-list{background:#eeeeee;border-radius:24px;padding:8px 12px}`
    );
  });

  test("B4 dropdown container padding emits on the container selector (≥640-only, absent from the mobile linkOnly bucket)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 1: { containerPaddingX: 20, containerPaddingY: 16 } } },
      })
    );
    expect(sharedBranchOf(css)).toContain(
      `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist, ${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{padding:16px 20px}`
    );
    expect(mobileBranchOf(css)).not.toContain("padding:16px 20px");
  });

  // B5 — nested submenu placement on the anchored (0,5,0) selector ------------
  test("B5 placement emits all-four-offset resets on the anchored (0,5,0) selector; right|bottom|left distinct; base dropdownDirection rule intact", () => {
    const rightCss = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 2: { submenuPlacement: "right" } } } })
    );
    const bottomCss = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 2: { submenuPlacement: "bottom" } } } })
    );
    const leftCss = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 2: { submenuPlacement: "left" } } } })
    );
    expect(rightCss).toContain(`${L2_CONTAINER}{left:100%;right:auto;top:0;bottom:auto}`);
    expect(bottomCss).toContain(`${L2_CONTAINER}{left:0;top:100%;right:auto;bottom:auto}`);
    expect(leftCss).toContain(`${L2_CONTAINER}{right:100%;left:auto;top:0;bottom:auto}`);
    // the base first-dropdown direction rule (short selector) stays present.
    expect(bottomCss).toContain(`${SCOPE} .site-nav-sublist{top:100%;bottom:auto}`);
  });

  // Present-only + doc-scope + parity -----------------------------------------
  test("present-only: an unauthored doc emits ZERO bytes for EVERY new bundle", () => {
    const css = buildMenuDocumentCss(buildDoc());
    for (const marker of [
      "border-inline-end",
      "border-block-end",
      "::before",
      "scaleX",
      "allow-discrete",
      "@starting-style",
      "content:none",
      "rotate(180deg)",
      "background:#eeeeee",
      "padding:16px 20px",
      "right:auto",
    ]) {
      expect(css).not.toContain(marker);
    }
  });

  test("front↔canvas parity: every representative modern rule appears in BOTH buildMenuDocumentCss and buildMenuDocumentPreviewCss", () => {
    const styled = buildDoc({
      navProps: {
        navChrome: {
          navPillBackground: "#eeeeee",
          navPillRadius: 24,
          navPillPaddingX: 12,
          navPillPaddingY: 8,
        },
        levelStyles: {
          1: {
            itemDividerShow: true,
            itemDividerColor: "#cccccc",
            itemDividerWidth: 2,
            itemDividerStyle: "solid",
          },
          2: { submenuPlacement: "bottom" },
        },
      },
    });
    const front = buildMenuDocumentCss(styled);
    const canvas = buildMenuDocumentPreviewCss(styled, "desktop");
    for (const rule of [
      `${SCOPE} .site-nav-list{background:#eeeeee;border-radius:24px;padding:8px 12px}`,
      `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child){border-block-end:2px solid #cccccc}`,
      `${L2_CONTAINER}{left:0;top:100%;right:auto;bottom:auto}`,
    ]) {
      expect(front).toContain(rule);
      expect(canvas).toContain(rule);
    }
  });

  // Per-device deltas ---------------------------------------------------------
  test("per-device navChrome delta: tablet navPillRadius (container ≥640) + mobile indicator (link) diff vs desktop; mobile ≠ tablet", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: { navPillRadius: 24, indicator: "underline", indicatorColor: "#111111" },
        },
        navResponsive: {
          tablet: { navProps: { navChrome: { navPillRadius: 32 } } },
          mobile: { navProps: { navChrome: { indicatorColor: "#ff0000" } } },
        },
      })
    );
    expect(tabletBlockOf(css)).toContain(`${SCOPE} .site-nav-list{border-radius:32px}`);
    // container-level (pill radius) NEVER leaks into the mobile bucket:
    expect(mobileBranchOf(css)).not.toContain("border-radius:32px");
    // link-level indicator override re-emits at mobile with the mobile color:
    expect(mobileBranchOf(css)).toContain("background:#ff0000");
  });

  test("B5 per-device is a STANDALONE delta (≥640-only, never mobile): a tablet-only level-2 placement (base unset) rewrites on the anchored selector inside the tablet block; ABSENT from mobile", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navResponsive: {
          tablet: { navProps: { levelStyles: { 2: { submenuPlacement: "left" } } } },
        },
      })
    );
    expect(tabletBlockOf(css)).toContain(`${L2_CONTAINER}{right:100%;left:auto;top:0;bottom:auto}`);
    // never in the mobile branch (submenuPlacement is ≥640-only):
    expect(mobileBranchOf(css)).not.toContain(`${L2_CONTAINER}{`);
  });

  test("B5 per-device diff-gated: a tablet level-2 placement IDENTICAL to base emits ZERO placement bytes", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 2: { submenuPlacement: "bottom" } } },
        navResponsive: {
          tablet: { navProps: { levelStyles: { 2: { submenuPlacement: "bottom" } } } },
        },
      })
    );
    expect(tabletBlockOf(css)).not.toContain("top:100%");
  });

  test("doc-scope: no UNSCOPED modern selector leaks (every bundle rule sits under the doc scope)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          navChrome: {
            navPillBackground: "#eeeeee",
            indicator: "underline",
            indicatorColor: "#111111",
            itemDividerShow: true,
            itemDividerColor: "#ccc",
            itemDividerWidth: 2,
          },
          levelStyles: {
            1: { flyoutAnimation: "fade", containerPaddingX: 20, containerPaddingY: 16 },
            2: { submenuPlacement: "bottom" },
          },
        },
      })
    );
    for (const line of css.split("\n")) {
      if (
        /border-inline-end|border-block-end|::before|scaleX|allow-discrete|content:none|rotate\(180deg\)|background:#eeeeee|padding:16px 20px/.test(
          line
        )
      ) {
        // scoped either directly (selector starts with SCOPE) or inside @starting-style{SCOPE …}.
        expect(line.includes(SCOPE)).toBe(true);
      }
    }
  });
});

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
    // unset ⇒ no text-align anywhere:
    expect(buildMenuDocumentCss(buildDoc())).not.toContain("text-align:");
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
    // unset doc emits neither rule:
    const bare = buildMenuDocumentCss(buildDoc());
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
