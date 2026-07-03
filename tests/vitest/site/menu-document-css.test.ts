import { describe, expect, test } from "vitest";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  type BrandStyle,
  type MenuDocumentV2,
  type NavItemsProps,
  type NavLevelStyles,
} from "../../../core/services/menus/menuDocumentV2";
import {
  buildMenuDocumentCss,
  buildMenuDocumentPreviewCss,
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
  const L1_OPEN = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid}`;
  const L2_OPEN = `${SCOPE} .site-nav-sublist .site-nav-sublist{display:grid}`;

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
