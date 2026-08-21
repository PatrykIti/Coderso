import { describe, expect, test } from "vitest";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  normalizeMenuDocumentV2ForWrite,
  type BrandStyle,
  type MenuDocumentV2,
  type NavItemsProps,
} from "../../../core/services/menus/menuDocumentV2";
import { buildMenuDocumentCss } from "../../../core/site/menuDocumentCss";

/**
 * TASK-542-02 — table-driven neutralizer goldens for per-device menu deltas.
 * Split out of `menu-document-css.test.ts` so the §1-§7 suite stays under the
 * repo's 1,000-line file gate. Pins the EXACT reset bytes for base→tablet AND
 * base→mobile overrides, plus the no-override byte-identity round-trip.
 * `buildDoc`/`SCOPE`/branch helpers keep minimal local copies for the
 * selectors this suite actually asserts.
 */

const SCOPE = `[data-site-menu-doc="true"]`;
const L1_LINK = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`;
const L1_CONTAINER = `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist, ${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`;

type DocOpts = {
  brandStyle?: BrandStyle;
  navProps?: NavItemsProps;
  brandResponsive?: { tablet?: { style?: BrandStyle }; mobile?: { style?: BrandStyle } };
  navResponsive?: {
    tablet?: { navProps?: NavItemsProps };
    mobile?: { navProps?: NavItemsProps };
  };
  layout?: Record<string, unknown>;
  responsive?: {
    tablet?: { layout?: Record<string, unknown> };
    mobile?: { layout?: Record<string, unknown> };
  };
};

const buildDoc = (opts: DocOpts = {}): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout: opts.layout ?? {},
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
      ...(opts.navResponsive || opts.responsive
        ? { responsive: { ...opts.navResponsive, ...opts.responsive } }
        : {}),
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

// --- TASK-542-02 exact neutralizer matrix (table-driven, device deltas) -------
// Each row flips a desktop-emitted value OFF (or restores it) on tablet and pins
// the EXACT reset bytes the delta emits — proving the device branch re-paints
// instead of leaving the desktop rule leaking through the media-query scope.
describe("TASK-542-02 neutralizer matrix (tablet device deltas)", () => {
  const tabletBlock = (css: string) =>
    css.slice(
      css.indexOf("@media (min-width: 640px) and (max-width: 1023px){"),
      css.indexOf("@media (max-width: 639px){")
    );

  const rows: Array<{
    id: string;
    base: NavItemsProps;
    tablet: NavItemsProps;
    expectPresent: string[];
    expectAbsent: string[];
  }> = [
    {
      id: "itemDividerShow OFF",
      base: { levelStyles: { 1: { itemDividerShow: true } } },
      tablet: { levelStyles: { 1: { itemDividerShow: false } } },
      expectPresent: [
        `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child){border-block-end:none}`,
      ],
      expectAbsent: [],
    },
    {
      id: "hoverUnderline OFF",
      base: { levelStyles: { 1: { hoverUnderline: true } } },
      tablet: { levelStyles: { 1: { hoverUnderline: false } } },
      expectPresent: [`${L1_LINK}:hover,${L1_LINK}:focus-visible{text-decoration:none}`],
      expectAbsent: [],
    },
    {
      id: "indicator none",
      base: { levelStyles: { 1: { indicator: "underline" } } },
      tablet: { levelStyles: { 1: { indicator: "none" } } },
      expectPresent: [`${L1_LINK}::before{content:none;opacity:1;transform:none;transition:none}`],
      expectAbsent: [],
    },
    {
      id: "showCaret restored",
      base: { levelStyles: { 1: { showCaret: false } } },
      tablet: { levelStyles: { 1: { showCaret: true } } },
      expectPresent: [
        `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link::after{content:" \\25BE";font-size:.7em}`,
      ],
      expectAbsent: [],
    },
    {
      id: "caretRotateOnOpen OFF",
      base: { levelStyles: { 1: { caretRotateOnOpen: true } } },
      tablet: { levelStyles: { 1: { caretRotateOnOpen: false } } },
      expectPresent: [
        `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link::after{transform:none;transition:none}`,
      ],
      expectAbsent: [],
    },
    {
      id: "flyoutAnimation none",
      base: { levelStyles: { 1: { flyoutAnimation: "fade" } } },
      tablet: { levelStyles: { 1: { flyoutAnimation: "none" } } },
      expectPresent: [
        `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist{display:none;visibility:visible;opacity:1;transform:none;transition:none}`,
        `${SCOPE} .site-nav-list > .site-nav-item:hover > .site-nav-sublist,${SCOPE} .site-nav-list > .site-nav-item:focus-within > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none;transition:none}`,
      ],
      expectAbsent: [],
    },
  ];

  test.each(rows)(
    "$id re-emits the exact reset on tablet",
    ({ base, tablet, expectPresent, expectAbsent }) => {
      const css = buildMenuDocumentCss(
        buildDoc({ navProps: base, navResponsive: { tablet: { navProps: tablet } } })
      );
      const block = tabletBlock(css);
      for (const golden of expectPresent) expect(block).toContain(golden);
      for (const absent of expectAbsent) expect(block).not.toContain(absent);
    }
  );

  test("unchanged device record emits ZERO tablet delta bytes", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 1: { hoverUnderline: true } } },
        navResponsive: { tablet: { navProps: { levelStyles: { 1: { hoverUnderline: true } } } } },
      })
    );
    // Positive control: the desktop hover underline IS emitted (builder ran).
    expect(sharedBranchOf(css)).toContain("text-decoration:underline");
    // Whole-css negative: no reset anywhere — a missing tablet media block
    // cannot make this assertion pass vacuously.
    expect(css).not.toContain("text-decoration:none");
  });

  test("L2 OFF after L1 ON emits the reset on the exact L2 selector (descendant L1 cannot win)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: {
          levelStyles: { 1: { itemDividerShow: true }, 2: { itemDividerShow: true } },
        },
        navResponsive: { tablet: { navProps: { levelStyles: { 2: { itemDividerShow: false } } } } },
      })
    );
    const block = tabletBlock(css);
    // L2's own reset, NOT a bare descendant match of the L1 reset.
    expect(block).toContain(
      `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li:not(:last-child){border-block-end:none}`
    );
  });

  test("orientation flip clears BOTH divider axes before the new axis re-emits", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        layout: { orientation: "horizontal" },
        responsive: { tablet: { layout: { orientation: "vertical" } } },
      })
    );
    const block = tabletBlock(css);
    expect(block).toContain(
      `${SCOPE} .site-nav-list > .site-nav-item:not(:last-child){border-inline-end:none;border-block-end:none}`
    );
  });

  test("padding: missing axis falls back to MENU_SHELL_SUBLIST_PADDING (6), not 0", () => {
    const xOnly = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 1: { containerPaddingX: 20 } } } })
    );
    expect(xOnly).toContain(`${L1_CONTAINER}{padding:6px 20px}`);
    const yOnly = buildMenuDocumentCss(
      buildDoc({ navProps: { levelStyles: { 1: { containerPaddingY: 16 } } } })
    );
    expect(yOnly).toContain(`${L1_CONTAINER}{padding:16px 6px}`);
  });
});

// --- TASK-542-02 exact neutralizer matrix, mobile (base→mobile device deltas) --
// Four sublist-scoped rules (itemDivider/caret/rotate/flyout) are emitted only in
// the shared ≥640px scope, so a mobile override emits ZERO mobile bytes; the L1
// link rules (hoverUnderline/indicator) re-emit into the <640px scope, so their
// resets ARE pinned there. Every row carries a shared-branch positive control so
// a missing mobile media block cannot make the zero-delta rows pass vacuously.
describe("TASK-542-02 neutralizer matrix (mobile device deltas)", () => {
  const mobileRows: Array<{
    id: string;
    base: NavItemsProps;
    mobile: NavItemsProps;
    sharedPositive: string;
    expectMobilePresent: string[];
    expectMobileAbsent: string[];
  }> = [
    {
      id: "itemDividerShow OFF",
      base: { levelStyles: { 1: { itemDividerShow: true } } },
      mobile: { levelStyles: { 1: { itemDividerShow: false } } },
      sharedPositive: `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child){border-block-end:1px solid currentColor}`,
      expectMobilePresent: [],
      expectMobileAbsent: ["border-block-end"],
    },
    {
      id: "hoverUnderline OFF",
      base: { levelStyles: { 1: { hoverUnderline: true } } },
      mobile: { levelStyles: { 1: { hoverUnderline: false } } },
      sharedPositive: `${L1_LINK}:hover,${L1_LINK}:focus-visible{text-decoration:underline}`,
      expectMobilePresent: [`${L1_LINK}:hover,${L1_LINK}:focus-visible{text-decoration:none}`],
      expectMobileAbsent: [],
    },
    {
      id: "indicator none",
      base: { levelStyles: { 1: { indicator: "underline" } } },
      mobile: { levelStyles: { 1: { indicator: "none" } } },
      sharedPositive: `${L1_LINK}::before{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;background:currentColor;opacity:0;transform:none;transition:opacity 150ms}`,
      expectMobilePresent: [
        `${L1_LINK}::before{content:none;opacity:1;transform:none;transition:none}`,
      ],
      expectMobileAbsent: [],
    },
    {
      id: "showCaret restored",
      base: { levelStyles: { 1: { showCaret: false } } },
      mobile: { levelStyles: { 1: { showCaret: true } } },
      sharedPositive: `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link::after{content:none}`,
      expectMobilePresent: [],
      expectMobileAbsent: ["data-site-nav-group"],
    },
    {
      id: "caretRotateOnOpen OFF",
      base: { levelStyles: { 1: { caretRotateOnOpen: true } } },
      mobile: { levelStyles: { 1: { caretRotateOnOpen: false } } },
      sharedPositive: `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link::after{display:inline-block;transform:rotate(0);transition:transform 150ms}`,
      expectMobilePresent: [],
      expectMobileAbsent: ["transform:rotate"],
    },
    {
      id: "flyoutAnimation none",
      base: { levelStyles: { 1: { flyoutAnimation: "fade" } } },
      mobile: { levelStyles: { 1: { flyoutAnimation: "none" } } },
      sharedPositive: `${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:hidden;opacity:0;transition:opacity 150ms,visibility 0s linear 150ms}`,
      expectMobilePresent: [],
      expectMobileAbsent: ["visibility:hidden", "opacity:0"],
    },
  ];

  test.each(mobileRows)("$id: mobile branch matches the base→mobile golden", (row) => {
    const css = buildMenuDocumentCss(
      buildDoc({ navProps: row.base, navResponsive: { mobile: { navProps: row.mobile } } })
    );
    // Positive control: the desktop rule IS emitted in the shared ≥640px scope.
    expect(sharedBranchOf(css)).toContain(row.sharedPositive);
    // Mobile goldens: exact resets when the rule re-emits <640px, else ZERO bytes.
    const mobileBlock = mobileBranchOf(css);
    for (const golden of row.expectMobilePresent) expect(mobileBlock).toContain(golden);
    for (const absent of row.expectMobileAbsent) expect(mobileBlock).not.toContain(absent);
  });

  test("combined tablet + mobile overrides emit BOTH device resets independently", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        navProps: { levelStyles: { 1: { hoverUnderline: true, indicator: "underline" } } },
        navResponsive: {
          tablet: {
            navProps: { levelStyles: { 1: { hoverUnderline: false, indicator: "none" } } },
          },
          mobile: {
            navProps: { levelStyles: { 1: { hoverUnderline: false, indicator: "none" } } },
          },
        },
      })
    );
    const tablet = tabletBlockOf(css);
    const mobile = mobileBranchOf(css);
    expect(tablet).toContain(`${L1_LINK}:hover,${L1_LINK}:focus-visible{text-decoration:none}`);
    expect(tablet).toContain(
      `${L1_LINK}::before{content:none;opacity:1;transform:none;transition:none}`
    );
    expect(mobile).toContain(`${L1_LINK}:hover,${L1_LINK}:focus-visible{text-decoration:none}`);
    expect(mobile).toContain(
      `${L1_LINK}::before{content:none;opacity:1;transform:none;transition:none}`
    );
  });
});

// --- TASK-542-02 matrix #10: brand iconColor per-device deltas ----------------
describe("TASK-542-02 brand iconColor device deltas", () => {
  test("icon-color-ONLY device change re-emits the svg delta (iconColor in BRAND_STYLE_COMPARE_KEYS)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        brandStyle: { iconColor: "#101828" },
        brandResponsive: { mobile: { style: { iconColor: "#d92d20" } } },
      })
    );
    expect(mobileBranchOf(css)).toContain(`[data-menu-block-id="blk_brand"] svg{color:#d92d20}`);
  });

  test("base-only icon-color emits the svg rule in the base branch and ZERO device bytes", () => {
    const css = buildMenuDocumentCss(buildDoc({ brandStyle: { iconColor: "#101828" } }));
    expect(baseBranchOf(css)).toContain(`[data-menu-block-id="blk_brand"] svg{color:#101828}`);
    expect(mobileBranchOf(css)).not.toContain("blk_brand");
    expect(sharedBranchOf(css)).not.toContain("blk_brand");
  });

  test("iconColor equal across devices ⇒ NO brand delta (only the authored key differs on tablet)", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        brandStyle: { iconColor: "#101828" },
        brandResponsive: { tablet: { style: { iconColor: "#101828" } } },
      })
    );
    // Positive control: the base svg rule IS emitted (builder ran).
    expect(baseBranchOf(css)).toContain(`[data-menu-block-id="blk_brand"] svg{color:#101828}`);
    // Negative: no brand delta in any device branch.
    expect(sharedBranchOf(css)).not.toContain("blk_brand");
    expect(mobileBranchOf(css)).not.toContain("blk_brand");
  });

  test("iconSize + iconColor device change re-emits width/height AND color together", () => {
    const css = buildMenuDocumentCss(
      buildDoc({
        brandStyle: { iconSize: 24, iconColor: "#101828" },
        brandResponsive: { tablet: { style: { iconSize: 32, iconColor: "#d92d20" } } },
      })
    );
    expect(tabletBlockOf(css)).toContain(
      `[data-menu-block-id="blk_brand"] svg{width:32px;height:32px;color:#d92d20}`
    );
  });
});

// --- TASK-542-02 no-override byte identity -----------------------------------
describe("TASK-542-02 no-override byte identity", () => {
  test("a no-override doc emits byte-identical CSS through write→read round-trip", () => {
    const bare = buildDoc({});
    const css = buildMenuDocumentCss(bare);
    expect(css).toBe(buildMenuDocumentCss(normalizeMenuDocumentV2ForWrite(bare)));
  });

  test("no per-device overrides ⇒ ZERO brand/nav delta rules in device branches", () => {
    const css = buildMenuDocumentCss(buildDoc({}));
    // Non-vacuous: the BASE branch emits the block-scoped rules (builder ran),
    // while both device branches carry zero brand/nav deltas.
    expect(baseBranchOf(css)).toContain(".site-nav-list");
    expect(sharedBranchOf(css)).not.toContain("blk_");
    expect(mobileBranchOf(css)).not.toContain("blk_");
  });
});
