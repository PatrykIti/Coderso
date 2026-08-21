import { describe, expect, test } from "vitest";

import {
  BRAND_STYLE_NUMBER_RANGES,
  MENU_BAR_LAYOUT_NUMBER_RANGES,
  MENU_BRAND_TEXT_MAX_LENGTH,
  MENU_DOCUMENT_INVALID,
  MENU_DOCUMENT_SCHEMA_VERSION,
  MENU_NAV_DEVICE_DEFINING_KEYS,
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  MENU_SHELL_DEFAULT_LINK_PX,
  MENU_SHELL_DEFAULT_LINK_PY,
  MENU_SHELL_DEFAULT_LINK_RADIUS,
  MENU_SHELL_SUBLIST_MIN_WIDTH,
  MENU_SHELL_SUBLIST_PADDING,
  NAV_CHROME_DEFAULTS,
  NAV_CHROME_NUMBER_RANGES,
  NAV_FONT_SIZE_INHERITED,
  NAV_LEVEL_NUMBER_RANGES,
  NAV_LINK_NUMBER_RANGES,
  buildMenuDocumentV2FromLegacy,
  clearMenuBlockVisibilityOverride,
  clearMenuBrandStyleBase,
  clearMenuBrandStyleOverride,
  clearMenuNavChromeBase,
  clearMenuNavChromeOverride,
  clearMenuNavLevelStyleBase,
  clearMenuNavLevelStyleOverride,
  clearMenuSectionBase,
  clearMenuSectionOverride,
  createDefaultMenuDocumentV2,
  hasMenuBlockVisibilityOverride,
  hasMenuBrandStyleOverride,
  isEmptyMenuDocument,
  isMenuDocumentError,
  normalizeMenuBoxShadowValue,
  normalizeMenuDocumentV2ForWrite,
  normalizeStoredMenuDocumentV2ForRead,
  patchMenuBrandStyleForDevice,
  patchMenuNavChromeForDevice,
  patchMenuNavLevelStyleForDevice,
  patchMenuSectionForDevice,
  readMenuBrandStyleBaseValue,
  readMenuBrandStyleOverrideValue,
  readMenuNavChromeBaseValue,
  readMenuNavChromeOverrideValue,
  readMenuNavLevelStyleBaseValue,
  readMenuNavLevelStyleOverrideValue,
  readMenuSectionBaseValue,
  readMenuSectionOverrideValue,
  resolveBrandImageSrc,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  resolveMenuControlDefault,
  resolveMenuNavChrome,
  resolveMenuNavLevelStyle,
  resolveMenuSectionAppearanceForDevice,
  resolvePublishedMenuDocument,
  resolveStoredMenuDocument,
  setMenuBlockVisibleForDevice,
  type BrandProps,
  type MenuBlockV2,
  type MenuDocumentV2,
  type MenuSectionV2,
  type NavChromeStyle,
  type NavLevelStyle,
} from "../../../core/services/menus/menuDocumentV2";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";
import { buildMenuDocumentCss } from "../../../core/site/menuDocumentCss";

// TASK-542-01-L01: the WRITE contract requires explicit valid IDs (the
// normalizer never invents one). Inject deterministic ids into plain-object
// blocks that lack one; assertions elsewhere are unchanged.
const blockWithId = (block: unknown, index: number): unknown =>
  typeof block === "object" && block !== null && !Array.isArray(block) && !("id" in block)
    ? { id: `blk-0-${index}`, ...(block as Record<string, unknown>) }
    : block;

const section = (blocks: unknown[], extra?: Record<string, unknown>) => ({
  id: "sec-menu-bar",
  type: "menu-bar",
  name: "Menu bar",
  layout: {},
  blocks: blocks.map(blockWithId),
  ...extra,
});

const doc = (blocks: unknown[], extra?: Record<string, unknown>) => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [section(blocks, extra)],
});

const boundaryTerminal = "transparent";
const boundaryPaddingLength = CSS_COLOR_VALUE_MAX_LENGTH - boundaryTerminal.length;
const rawAtCapColor = `${" ".repeat(Math.floor(boundaryPaddingLength / 2))}${boundaryTerminal}${" ".repeat(
  Math.ceil(boundaryPaddingLength / 2)
)}`;
const rawOverCapColor = `${rawAtCapColor} `;
const rawMenuColorCases = [
  { id: "exact cap", input: rawAtCapColor, expected: "transparent" },
  { id: "cap plus one", input: rawOverCapColor, expected: null },
  { id: "C0 control", input: `\u001f${boundaryTerminal}`, expected: null },
  { id: "C1 control", input: `\u0085${boundaryTerminal}`, expected: null },
  { id: "NBSP", input: `\u00a0${boundaryTerminal}`, expected: null },
  { id: "EM SPACE", input: `\u2003${boundaryTerminal}`, expected: null },
  { id: "inherited currentColor", input: "currentColor", expected: null },
  { id: "inherited inherit", input: "inherit", expected: null },
  { id: "out-of-range function", input: "rgb(256,0,0)", expected: null },
] as const;

const shadowColorPrefix = "rgba(";
const shadowColorTerminal = "0,0,0,.5)";
const shadowColorAtCap = `${shadowColorPrefix}${" ".repeat(
  CSS_COLOR_VALUE_MAX_LENGTH - shadowColorPrefix.length - shadowColorTerminal.length
)}${shadowColorTerminal}`;
const shadowColorOverCap = `${shadowColorPrefix} ${shadowColorAtCap.slice(shadowColorPrefix.length)}`;
const shadowColorBoundaryCases = [
  { id: "exact cap", input: shadowColorAtCap, expected: "rgba(0, 0, 0, 0.5)" },
  { id: "cap plus one", input: shadowColorOverCap, expected: null },
  { id: "C0 control", input: "rgba(\u001f0,0,0,.5)", expected: null },
  { id: "C1 control", input: "rgba(\u00850,0,0,.5)", expected: null },
  { id: "NBSP", input: "rgba(\u00a00,0,0,.5)", expected: null },
  { id: "EM SPACE", input: "rgba(\u20030,0,0,.5)", expected: null },
  { id: "inherited keyword", input: "currentColor", expected: null },
  { id: "out-of-range function", input: "rgb(256,0,0)", expected: null },
] as const;

const expectDocError = (fn: () => unknown, path: string) => {
  try {
    fn();
    throw new Error(`expected ${MENU_DOCUMENT_INVALID} at ${path}`);
  } catch (error) {
    expect(isMenuDocumentError(error)).toBe(true);
    expect((error as { code: string }).code).toBe(MENU_DOCUMENT_INVALID);
    expect((error as { path: string }).path).toBe(path);
  }
};

describe("menuDocumentV2 write-strict", () => {
  test("passes untouched raw colors through the strict flat appearance subset", () => {
    expect(rawAtCapColor).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(rawOverCapColor).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

    for (const colorCase of rawMenuColorCases) {
      if (colorCase.expected !== null) {
        const out = normalizeMenuDocumentV2ForWrite(
          doc([], { layout: { surfaceColor: colorCase.input, paddingY: 4 } })
        );
        expect(out.sections[0]?.layout, colorCase.id).toEqual({
          surfaceColor: colorCase.expected,
          paddingY: 4,
        });
        continue;
      }

      expectDocError(
        () =>
          normalizeMenuDocumentV2ForWrite(
            doc([], { layout: { surfaceColor: colorCase.input, paddingY: 4 } })
          ),
        "document.sections[0].layout.surfaceColor"
      );
    }
  });

  test("rejects unknown section types with a machine-readable path", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite({
          schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
          sections: [{ type: "footer", name: "x", layout: {}, blocks: [] }],
        }),
      "document.sections[0].type"
    );
  });

  test("rejects unknown block types", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([{ type: "widget", props: {} }])),
      "document.sections[0].blocks[0].type"
    );
  });

  test("rejects a nav-items prop that belongs to the menu-bar layout subset (cross-subset)", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([{ type: "nav-items", props: { sticky: true } }])),
      "document.sections[0].blocks[0].props.sticky"
    );
  });

  test("rejects a menu-bar layout key that belongs to the nav-items subset (cross-subset)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(doc([], { layout: { linkColor: "var(--color-primary)" } })),
      "document.sections[0].layout.linkColor"
    );
  });

  test("rejects a malformed color value via the reused appearance validator", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([], { layout: { surfaceColor: "not-a-color" } })),
      "document.sections[0].layout.surfaceColor"
    );
  });

  test("menu-native blocks reject block-level style/visibility (no validation path)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([{ type: "nav-items", props: {}, style: { align: "left" } }])
        ),
      "document.sections[0].blocks[0].style"
    );
  });

  test("rejects over-capacity block trees", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc(Array.from({ length: 13 }, () => ({ type: "nav-items", props: {} })))
        ),
      "document.sections[0].blocks"
    );
  });
});

describe("menuDocumentV2 reused leaf blocks", () => {
  test("cta-button inherits the page button validator: bad enum props rejected on write", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([
            {
              type: "cta-button",
              props: { label: "Go", variant: "NONSENSE" },
              visibility: { visible: true },
            },
          ])
        ),
      "document.sections[0].blocks[0]"
    );
  });

  test("cta-button href is sanitized by the page leaf pipeline (javascript: dropped)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        {
          type: "cta-button",
          props: {
            label: "Go",
            href: "javascript:alert(1)",
            target: "self",
            variant: "primary",
            size: "md",
          },
          visibility: { visible: true },
        },
      ])
    );
    const block = out.sections[0]?.blocks[0];
    expect(block?.type).toBe("cta-button");
    expect((block as { props: Record<string, unknown> }).props.href).toBeNull();
  });

  test("brand.href is sanitized by the shared authoring URL sanitizer (javascript: rejected on write)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        {
          type: "brand",
          props: { mode: "text", href: "javascript:alert(1)" },
        },
      ])
    );
    const block = out.sections[0]?.blocks[0] as { props: { href?: unknown } };
    // The unsafe scheme is rejected on write and never persisted; it fails soft
    // to "/" (the safe default) instead of reaching the rendered anchor.
    expect(block.props.href).toBe("/");
    expect(block.props.href).not.toContain("javascript");
  });

  test("brand.href keeps a safe value verbatim", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([{ type: "brand", props: { mode: "text", href: "/home" } }])
    );
    const block = out.sections[0]?.blocks[0] as { props: { href?: unknown } };
    expect(block.props.href).toBe("/home");
  });

  test("brand.image reuses the page image leaf and sanitizes an unsafe src", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        {
          type: "brand",
          props: { mode: "image", href: "/", image: { src: "javascript:alert(1)", alt: "Logo" } },
        },
      ])
    );
    const block = out.sections[0]?.blocks[0] as { props: { image?: Record<string, unknown> } };
    expect(block.props.image?.src).toBeNull();
    expect(block.props.image?.alt).toBe("Logo");
  });
});

describe("menuDocumentV2 read fail-closed", () => {
  test("garbage stored input degrades to an empty document and never throws", () => {
    expect(normalizeStoredMenuDocumentV2ForRead("garbage")).toEqual({
      schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
      sections: [],
    });
    expect(normalizeStoredMenuDocumentV2ForRead(null).sections).toEqual([]);
    expect(normalizeStoredMenuDocumentV2ForRead({ sections: [{ type: "nope" }] }).sections).toEqual(
      []
    );
  });

  test("canonicalizes accepted flat colors and never restores rejected raw bytes", () => {
    for (const colorCase of rawMenuColorCases) {
      const stored = doc([{ id: "blk-color-nav", type: "nav-items", props: {} }], {
        id: "sec-color-flat",
        layout: { surfaceColor: colorCase.input, paddingY: 4 },
      });
      const read = normalizeStoredMenuDocumentV2ForRead(stored);

      if (colorCase.expected === null) {
        expect(read.sections, colorCase.id).toEqual([]);
        expect(resolveStoredMenuDocument({ document: stored }), colorCase.id).toBeNull();
        expect(
          resolvePublishedMenuDocument({ published: { document: stored } }),
          colorCase.id
        ).toBeNull();
        continue;
      }

      expect(read.sections[0]?.layout, colorCase.id).toEqual({
        surfaceColor: colorCase.expected,
        paddingY: 4,
      });
      expect(
        resolveStoredMenuDocument({ document: stored })?.sections[0]?.layout,
        colorCase.id
      ).toEqual(read.sections[0]?.layout);
      expect(
        resolvePublishedMenuDocument({ published: { document: stored } })?.sections[0]?.layout,
        colorCase.id
      ).toEqual(read.sections[0]?.layout);
    }
  });
});

describe("menuDocumentV2 version marker", () => {
  const nonEmptyMarkerless = {
    sections: [section([{ type: "nav-items", props: {} }])],
  };

  test("a non-empty document without the exact marker fails the strict write", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(nonEmptyMarkerless),
      "document.schemaVersion"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite({ schemaVersion: 0, ...nonEmptyMarkerless }),
      "document.schemaVersion"
    );
  });

  test("a marker-less stored document degrades to empty ⇒ resolver returns null (legacy)", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(nonEmptyMarkerless).sections).toEqual([]);
    expect(resolvePublishedMenuDocument({ document: nonEmptyMarkerless })).toBeNull();
  });

  test("a correctly-marked document resolves to the document path", () => {
    const valid = doc([{ type: "nav-items", props: {} }]);
    expect(resolvePublishedMenuDocument({ document: valid })?.sections[0]?.blocks[0]?.type).toBe(
      "nav-items"
    );
  });
});

describe("menuDocumentV2 defaults + legacy adapter", () => {
  test("createDefaultMenuDocumentV2 = menu-bar ⊃ [brand(text), nav-items, cta-button?]", () => {
    const def = createDefaultMenuDocumentV2();
    expect(def.schemaVersion).toBe(MENU_DOCUMENT_SCHEMA_VERSION);
    expect(def.sections[0]?.type).toBe("menu-bar");
    const types = def.sections[0]?.blocks.map((block) => block.type);
    expect(types).toContain("brand");
    expect(types).toContain("nav-items");
    const brand = def.sections[0]?.blocks.find((block) => block.type === "brand");
    expect((brand as { props: { mode: string } }).props.mode).toBe("text");
    // A default document round-trips through the strict writer.
    expect(() => normalizeMenuDocumentV2ForWrite(def)).not.toThrow();
    expect(isEmptyMenuDocument(def)).toBe(false);
  });

  test("buildMenuDocumentV2FromLegacy returns null for a fresh menu (nothing to seed)", () => {
    expect(buildMenuDocumentV2FromLegacy(null, [])).toBeNull();
  });

  test("buildMenuDocumentV2FromLegacy maps appearance+extras into a menu-bar document", () => {
    const button = createPageBlockV2("button", { id: "blk-cta" });
    const image = createPageBlockV2("image", { id: "blk-logo" });
    const built = buildMenuDocumentV2FromLegacy(
      { surfaceColor: "#0f172a", linkColor: "var(--color-primary)", itemGap: 12 },
      [button, image]
    );
    expect(built).not.toBeNull();
    const built2 = built as NonNullable<typeof built>;
    // Layout carries the menu-bar subset; nav-items carries the typography subset.
    expect(built2.sections[0]?.layout).toEqual({ surfaceColor: "#0f172a" });
    const nav = built2.sections[0]?.blocks.find((block) => block.type === "nav-items");
    expect((nav as { props: Record<string, unknown> }).props).toEqual({
      linkColor: "var(--color-primary)",
      itemGap: 12,
    });
    const types = built2.sections[0]?.blocks.map((block) => block.type);
    expect(types).toContain("cta-button");
    expect(types).toContain("brand");
    // The whole adapter output round-trips through the strict writer.
    expect(() => normalizeMenuDocumentV2ForWrite(built2)).not.toThrow();
  });
});

describe("menuDocumentV2 resolvers", () => {
  const valid = doc([{ type: "nav-items", props: {} }]);

  test("resolvePublishedMenuDocument reads the published snapshot, never the draft", () => {
    const settings = { document: valid, published: {} };
    // Published present but has no document ⇒ null (draft never leaks).
    expect(resolvePublishedMenuDocument(settings)).toBeNull();
    // Published document present ⇒ resolves it (and never the top-level draft).
    expect(
      resolvePublishedMenuDocument({ document: {}, published: { document: valid } })?.sections[0]
        ?.type
    ).toBe("menu-bar");
    expect(
      resolvePublishedMenuDocument({ published: { document: valid } })?.sections[0]?.type
    ).toBe("menu-bar");
  });

  test("resolvePublishedMenuDocument falls back to top-level for legacy envelopes (no published)", () => {
    expect(resolvePublishedMenuDocument({ document: valid })?.sections[0]?.type).toBe("menu-bar");
    expect(resolvePublishedMenuDocument({})).toBeNull();
    expect(resolvePublishedMenuDocument(null)).toBeNull();
  });

  test("resolveStoredMenuDocument reads the top-level draft only", () => {
    expect(resolveStoredMenuDocument({ document: valid })?.sections[0]?.type).toBe("menu-bar");
    expect(resolveStoredMenuDocument({ published: { document: valid } })).toBeNull();
    expect(resolveStoredMenuDocument({ document: doc([]) })).toBeNull();
  });
});

// --- TASK-501-01: per-device responsive overrides ----------------------------

describe("menuDocumentV2 responsive write round-trips (TASK-501-01)", () => {
  test("breakpoint vocabulary is tablet + mobile (TASK-502-01 un-deferral)", () => {
    expect(MENU_RESPONSIVE_BREAKPOINT_KEYS).toEqual(["tablet", "mobile"]);
  });

  test("section + block responsive records round-trip through the strict writer", () => {
    const input = doc(
      [
        {
          id: "blk-nav",
          type: "nav-items",
          props: { itemGap: 8 },
          responsive: { mobile: { visibility: { visible: false } } },
        },
        {
          id: "blk-cta",
          type: "cta-button",
          props: { label: "Go", href: "/x", target: "self", variant: "primary", size: "md" },
          visibility: { visible: true },
          responsive: { mobile: { visibility: { visible: false } } },
        },
      ],
      {
        responsive: {
          mobile: {
            layout: { paddingY: 4 },
            navProps: { orientation: "vertical", itemGap: 16 },
          },
        },
      }
    );
    const out = normalizeMenuDocumentV2ForWrite(input);
    const section0 = out.sections[0] as MenuSectionV2;
    expect(section0.responsive).toEqual({
      mobile: { layout: { paddingY: 4 }, navProps: { orientation: "vertical", itemGap: 16 } },
    });
    expect(section0.blocks[0]?.responsive).toEqual({ mobile: { visibility: { visible: false } } });
    expect(section0.blocks[1]?.responsive).toEqual({ mobile: { visibility: { visible: false } } });
    // Idempotent: a normalized responsive document round-trips deep-equal
    // through BOTH the strict writer and the stored read.
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });

  test("orientation is a valid nav-items base prop and override prop", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([{ id: "blk-nav", type: "nav-items", props: { orientation: "vertical" } }])
    );
    expect((out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      orientation: "vertical",
    });
  });

  test("empty responsive records are pruned on write, never persisted", () => {
    const emptyShapes: Record<string, unknown>[] = [
      { responsive: {} },
      { responsive: { mobile: {} } },
      { responsive: { mobile: { layout: {} } } },
      { responsive: { mobile: { navProps: {} } } },
      { responsive: null },
    ];
    for (const extra of emptyShapes) {
      const out = normalizeMenuDocumentV2ForWrite(doc([{ type: "nav-items", props: {} }], extra));
      expect("responsive" in (out.sections[0] as MenuSectionV2)).toBe(false);
    }
    const blockShapes: Record<string, unknown>[] = [
      { responsive: {} },
      { responsive: { mobile: {} } },
      { responsive: { mobile: { visibility: {} } } },
      { responsive: null },
    ];
    for (const extra of blockShapes) {
      const out = normalizeMenuDocumentV2ForWrite(
        doc([{ id: "blk-nav", type: "nav-items", props: {}, ...extra }])
      );
      expect("responsive" in (out.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
    }
  });
});

describe("menuDocumentV2 responsive write reject-unknown (TASK-501-01)", () => {
  test("rejects non-responsive breakpoint keys (desktop is the base, junk rejected)", () => {
    for (const breakpoint of ["desktop", "wide"]) {
      expectDocError(
        () =>
          normalizeMenuDocumentV2ForWrite(
            doc([], { responsive: { [breakpoint]: { layout: { paddingY: 4 } } } })
          ),
        `document.sections[0].responsive.${breakpoint}`
      );
    }
  });

  test("rejects unknown section override groups", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { style: { align: "left" } } } })
        ),
      "document.sections[0].responsive.mobile.style"
    );
  });

  test("rejects cross-subset override props via the shared subset normalizers", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { layout: { linkColor: "var(--color-primary)" } } } })
        ),
      "document.sections[0].responsive.mobile.layout.linkColor"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { navProps: { sticky: true } } } })
        ),
      "document.sections[0].responsive.mobile.navProps.sticky"
    );
  });

  test("rejects malformed override values via the shared field validators", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { navProps: { orientation: "diagonal" } } } })
        ),
      "document.sections[0].responsive.mobile.navProps.orientation"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { layout: { surfaceColor: "not-a-color" } } } })
        ),
      "document.sections[0].responsive.mobile.layout.surfaceColor"
    );
  });

  test("block overrides carry ONLY visibility + style — page-shaped props group is rejected (leaf strip trap)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([
            {
              type: "cta-button",
              props: { label: "Go", variant: "primary", size: "md", target: "self" },
              visibility: { visible: true },
              responsive: { mobile: { props: { label: "Mobile" } } },
            },
          ])
        ),
      "document.sections[0].blocks[0].responsive.mobile.props"
    );
    // TASK-504-01 §5: `style` is now a VALID block-override group (brand style
    // delta), so an unknown brand-style KEY rejects one level deeper (not the
    // whole group). The reject-unknown discipline is preserved, just at .style.align.
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([
            {
              type: "brand",
              props: { mode: "text", href: "/" },
              responsive: { mobile: { style: { align: "left" } } },
            },
          ])
        ),
      "document.sections[0].blocks[0].responsive.mobile.style.align"
    );
  });

  test("rejects non-boolean and unknown visibility override members", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([
            {
              type: "nav-items",
              props: {},
              responsive: { mobile: { visibility: { visible: "yes" } } },
            },
          ])
        ),
      "document.sections[0].blocks[0].responsive.mobile.visibility.visible"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([
            {
              type: "nav-items",
              props: {},
              responsive: { mobile: { visibility: { hidden: true } } },
            },
          ])
        ),
      "document.sections[0].blocks[0].responsive.mobile.visibility.hidden"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([{ type: "nav-items", props: {}, responsive: { mobile: "hide" } }])
        ),
      "document.sections[0].blocks[0].responsive.mobile"
    );
  });
});

describe("menuDocumentV2 responsive fail-closed read (TASK-501-01, conscious)", () => {
  test("legacy documents WITHOUT responsive read byte-identically (no responsive member materializes)", () => {
    const legacy = normalizeMenuDocumentV2ForWrite(
      doc([
        { id: "blk-nav", type: "nav-items", props: { itemGap: 8 } },
        { id: "blk-brand", type: "brand", props: { mode: "text", href: "/" } },
      ])
    );
    const read = normalizeStoredMenuDocumentV2ForRead(legacy);
    expect(read).toEqual(legacy);
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
    for (const block of read.sections[0]?.blocks ?? []) {
      expect("responsive" in block).toBe(false);
    }
  });

  test("a stored doc with an UNKNOWN responsive key degrades the WHOLE document to empty (designed blast radius)", () => {
    // CONSCIOUS assertion: the stored read is fail-closed EXCEPT the one
    // device-defining carve-out, so one unknown responsive key (`desktop` is
    // never a record; `wide` is junk) fails the whole document closed to the
    // legacy look — this is the designed blast radius of the fail-closed read,
    // not an accident. (Tablet is now a VALID breakpoint — see the tablet
    // round-trip suite below.)
    for (const stored of [
      doc([{ type: "nav-items", props: {} }], {
        responsive: { desktop: { layout: { paddingY: 4 } } },
      }),
      doc([{ type: "nav-items", props: {} }], {
        responsive: { wide: { layout: { paddingY: 4 } } },
      }),
    ]) {
      expect(normalizeStoredMenuDocumentV2ForRead(stored).sections).toEqual([]);
      expect(resolveStoredMenuDocument({ document: stored })).toBeNull();
    }
  });
});

describe("menuDocumentV2 deterministic ID + topology (TASK-542-01-L01)", () => {
  // Raw legacy/write fixtures bypass the shared `doc()` helper, which injects
  // `blk-0-<index>` ids — these tests must exercise REAL missing/invalid ids.
  const rawDoc = (blocks: unknown[]): Record<string, unknown> => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: "sec-bar",
        type: "menu-bar",
        name: "Menu bar",
        layout: {},
        blocks,
      },
    ],
  });

  test("unknown top-level keys fail closed (legacy flat topology is never laundered)", () => {
    const flat = rawDoc([{ type: "nav-items", props: {} }]) as Record<string, unknown>;
    flat.blocks = flat.sections;
    delete flat.sections;
    expectDocError(() => normalizeMenuDocumentV2ForWrite(flat), "document.blocks");
  });

  test("write requires explicit valid IDs: missing, blank, and syntactically-invalid all throw", () => {
    for (const blocks of [
      [{ type: "nav-items", props: {} }], // missing id
      [{ id: "   ", type: "nav-items", props: {} }], // blank
      [{ id: "1bad", type: "nav-items", props: {} }], // leading digit
      [{ id: "bad id", type: "nav-items", props: {} }], // space
      [{ id: "bad/url", type: "nav-items", props: {} }], // slash
      [{ id: "a".repeat(161), type: "nav-items", props: {} }], // too long
    ]) {
      expectDocError(
        () => normalizeMenuDocumentV2ForWrite(rawDoc(blocks)),
        "document.sections[0].blocks[0].id"
      );
    }
  });

  test("stored-read repairs missing legacy IDs with stable structural-path fallbacks", () => {
    const read = normalizeStoredMenuDocumentV2ForRead(
      rawDoc([
        { type: "nav-items", props: {} },
        { type: "brand", props: { mode: "text", href: "/" } },
        { type: "nav-items", props: {} },
      ])
    );
    expect(read.sections[0]?.blocks.map((b) => b.id)).toEqual([
      "blk-0-nav-items-0",
      "blk-0-brand-1",
      "blk-0-nav-items-2",
    ]);
  });

  test("stored-read repairs colliding legacy IDs with stable -N suffixes (document-wide Set)", () => {
    const read = normalizeStoredMenuDocumentV2ForRead(
      rawDoc([
        { id: "blk-x", type: "nav-items", props: {} },
        { id: "blk-x", type: "nav-items", props: {} },
        { id: "blk-x", type: "brand", props: { mode: "text", href: "/" } },
      ])
    );
    expect(read.sections[0]?.blocks.map((b) => b.id)).toEqual(["blk-x", "blk-x-2", "blk-x-3"]);
  });

  test("duplicate maximum-length IDs stay within the 160-char grammar (marker reserved before slicing)", () => {
    const longId = "a".repeat(160);
    const read = normalizeStoredMenuDocumentV2ForRead(
      rawDoc([
        { id: longId, type: "nav-items", props: {} },
        { id: longId, type: "nav-items", props: {} },
      ])
    );
    const ids = read.sections[0]?.blocks.map((b) => b.id) ?? [];
    expect(ids[0]).toBe(longId);
    expect(ids[1]).toBe(`${"a".repeat(158)}-2`);
    for (const id of ids) {
      expect(id.length).toBeLessThanOrEqual(160);
      expect(/^[a-z][a-z0-9_-]{0,159}$/.test(id)).toBe(true);
    }
  });

  test("suffix collisions after truncation allocate the next free suffix", () => {
    const longId = "a".repeat(160);
    const third = `${"a".repeat(158)}-2`; // collides with the generated suffix of the second
    const read = normalizeStoredMenuDocumentV2ForRead(
      rawDoc([
        { id: longId, type: "nav-items", props: {} },
        { id: longId, type: "nav-items", props: {} },
        { id: third, type: "nav-items", props: {} },
        { id: longId, type: "nav-items", props: {} },
      ])
    );
    const ids = read.sections[0]?.blocks.map((b) => b.id) ?? [];
    expect(ids[1]).toBe(`${"a".repeat(158)}-2`);
    expect(ids[2]).toBe(`${"a".repeat(158)}-3`); // preferred collided → next free suffix
    expect(ids[3]).toBe(`${"a".repeat(158)}-4`);
    for (const id of ids) expect(id.length).toBeLessThanOrEqual(160);
  });

  test("section/block IDs share one document-wide uniqueness domain (global collisions)", () => {
    const read = normalizeStoredMenuDocumentV2ForRead({
      schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
      sections: [
        {
          id: "sec-bar",
          type: "menu-bar",
          name: "Menu bar",
          layout: {},
          blocks: [{ id: "sec-bar", type: "nav-items", props: {} }],
        },
      ],
    });
    expect(read.sections[0]?.id).toBe("sec-bar");
    expect(read.sections[0]?.blocks[0]?.id).toBe("sec-bar-2");
  });

  test("every invalid topology fails closed with a precise path", () => {
    const bar = (blocks: unknown[] = []) => ({
      id: "s1",
      type: "menu-bar",
      name: "Menu bar",
      layout: {},
      blocks,
    });
    const drawer = (blocks: unknown[] = []) => ({
      id: "s2",
      type: "menu-drawer",
      name: "Drawer",
      layout: {},
      blocks,
    });
    const cases: Array<[string, unknown]> = [
      [
        "three sections",
        { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [bar(), drawer(), drawer()] },
      ],
      [
        "first is not menu-bar",
        { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [drawer()] },
      ],
      [
        "second is not menu-drawer",
        { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [bar(), bar()] },
      ],
      [
        "two menu-drawers",
        { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [bar(), drawer(), drawer()] },
      ],
    ];
    for (const [, input] of cases) {
      expect(() => normalizeMenuDocumentV2ForWrite(input)).toThrow();
    }
    // Empty sections are the explicit clear sentinel and remain valid.
    expect(
      normalizeMenuDocumentV2ForWrite({ schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [] })
        .sections
    ).toEqual([]);
  });

  test("stable repeated legacy repair: same malformed input read twice is deeply equal", () => {
    const malformed = JSON.parse(
      JSON.stringify(
        rawDoc([
          { type: "nav-items", props: {} },
          { id: "blk-x", type: "nav-items", props: {} },
          { id: "blk-x", type: "nav-items", props: {} },
          { id: "1bad", type: "brand", props: { mode: "text", href: "/" } },
        ])
      )
    );
    const first = normalizeStoredMenuDocumentV2ForRead(malformed);
    const second = normalizeStoredMenuDocumentV2ForRead(malformed);
    expect(first).toEqual(second);
  });

  test("read → unrelated-save persists only the canonical adapted copy", () => {
    const malformed = rawDoc([
      { type: "nav-items", props: {} },
      { id: "dup", type: "nav-items", props: {} },
      { id: "dup", type: "nav-items", props: {} },
    ]);
    const read = normalizeStoredMenuDocumentV2ForRead(malformed);
    const saved = normalizeMenuDocumentV2ForWrite(read); // the writer accepts the adapted copy
    expect(saved.sections[0]?.blocks.map((b) => b.id)).toEqual([
      "blk-0-nav-items-0",
      "dup",
      "dup-2",
    ]);
  });

  test("valid canonical documents round-trip byte-identically through write → read", () => {
    const canonical = normalizeMenuDocumentV2ForWrite(
      rawDoc([
        { id: "blk-nav", type: "nav-items", props: { itemGap: 8 } },
        { id: "blk-brand", type: "brand", props: { mode: "text", href: "/", text: "Acme" } },
      ])
    );
    expect(normalizeStoredMenuDocumentV2ForRead(canonical)).toEqual(canonical);
  });
});
