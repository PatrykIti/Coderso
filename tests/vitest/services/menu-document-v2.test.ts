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

const section = (blocks: unknown[], extra?: Record<string, unknown>) => ({
  type: "menu-bar",
  name: "Menu bar",
  layout: {},
  blocks,
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

describe("menuDocumentV2 per-device resolve/read helpers (TASK-501-01)", () => {
  const sectionFixture: MenuSectionV2 = {
    id: "sec-1",
    type: "menu-bar",
    name: "Menu bar",
    layout: { paddingY: 16, surfaceColor: "#0f172a" },
    blocks: [{ id: "blk-nav", type: "nav-items", props: { itemGap: 8, fontSize: 14 } }],
    responsive: {
      mobile: {
        layout: { paddingY: 4 },
        navProps: { orientation: "vertical" },
      },
    },
  };

  test("desktop resolves the base; a mobile-only override leaves tablet === desktop (mobile does NOT leak to tablet)", () => {
    const desktop = resolveMenuSectionAppearanceForDevice(sectionFixture, "desktop");
    expect(desktop.layout).toEqual({ paddingY: 16, surfaceColor: "#0f172a" });
    expect(desktop.navProps).toEqual({ itemGap: 8, fontSize: 14 });
    // The fixture carries ONLY a mobile record ⇒ tablet reads its OWN (absent)
    // record and inherits the desktop base unchanged.
    expect(resolveMenuSectionAppearanceForDevice(sectionFixture, "tablet")).toEqual(desktop);
  });

  test("mobile resolves base merged with the sparse override (overridden key wins, others inherit)", () => {
    const mobile = resolveMenuSectionAppearanceForDevice(sectionFixture, "mobile");
    expect(mobile.layout).toEqual({ paddingY: 4, surfaceColor: "#0f172a" });
    expect(mobile.navProps).toEqual({ itemGap: 8, fontSize: 14, orientation: "vertical" });
  });

  test("readMenuSectionOverrideValue reads the RAW override, never the merge", () => {
    expect(readMenuSectionOverrideValue(sectionFixture, "mobile", "layout", "paddingY")).toBe(4);
    expect(readMenuSectionOverrideValue(sectionFixture, "mobile", "navProps", "orientation")).toBe(
      "vertical"
    );
    // Inherited (base-only) keys read undefined — badge shows Inherited.
    expect(
      readMenuSectionOverrideValue(sectionFixture, "mobile", "layout", "surfaceColor")
    ).toBeUndefined();
    expect(
      readMenuSectionOverrideValue(sectionFixture, "mobile", "navProps", "itemGap")
    ).toBeUndefined();
  });
});

describe("menuDocumentV2 patchMenuSectionForDevice (TASK-501-01)", () => {
  const makeDoc = (): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: "sec-1",
        type: "menu-bar",
        name: "Menu bar",
        layout: { paddingY: 16 },
        blocks: [{ id: "blk-nav", type: "nav-items", props: { itemGap: 8 } }],
      },
    ],
  });

  test("desktop patch mutates the base and leaves responsive absent", () => {
    const out = patchMenuSectionForDevice(makeDoc(), "sec-1", "desktop", "layout", {
      paddingY: 2,
    });
    expect(out.sections[0]?.layout).toEqual({ paddingY: 2 });
    expect("responsive" in (out.sections[0] as MenuSectionV2)).toBe(false);
    const nav = patchMenuSectionForDevice(makeDoc(), "sec-1", "desktop", "navProps", {
      orientation: "vertical",
    });
    expect((nav.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      itemGap: 8,
      orientation: "vertical",
    });
    expect("responsive" in (nav.sections[0] as MenuSectionV2)).toBe(false);
  });

  test("tablet patch writes its OWN sparse responsive.tablet record and leaves the base untouched", () => {
    const out = patchMenuSectionForDevice(makeDoc(), "sec-1", "tablet", "layout", { paddingY: 2 });
    expect(out.sections[0]?.responsive).toEqual({ tablet: { layout: { paddingY: 2 } } });
    expect(out.sections[0]?.layout).toEqual({ paddingY: 16 }); // base untouched
    const nav = patchMenuSectionForDevice(makeDoc(), "sec-1", "tablet", "navProps", {
      orientation: "vertical",
    });
    expect(nav.sections[0]?.responsive).toEqual({
      tablet: { navProps: { orientation: "vertical" } },
    });
    // The base nav-items props stay untouched by a tablet write.
    expect((nav.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      itemGap: 8,
    });
  });

  test("a tablet patch NEVER touches an existing mobile record and vice versa", () => {
    const withMobile = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 4,
    });
    const both = patchMenuSectionForDevice(withMobile, "sec-1", "tablet", "layout", {
      paddingY: 8,
    });
    expect(both.sections[0]?.responsive).toEqual({
      mobile: { layout: { paddingY: 4 } },
      tablet: { layout: { paddingY: 8 } },
    });
    // Clearing the tablet override leaves the mobile record deep-equal to before.
    const clearedTablet = clearMenuSectionOverride(both, "sec-1", "tablet", "layout", "paddingY");
    expect(clearedTablet.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 4 } } });
  });

  test("mobile patch creates the sparse record with ONLY the patched key; a second patch merges", () => {
    const one = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", { paddingY: 2 });
    expect(one.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 2 } } });
    // Base untouched.
    expect(one.sections[0]?.layout).toEqual({ paddingY: 16 });
    const two = patchMenuSectionForDevice(one, "sec-1", "mobile", "navProps", {
      orientation: "vertical",
    });
    expect(two.sections[0]?.responsive).toEqual({
      mobile: { layout: { paddingY: 2 }, navProps: { orientation: "vertical" } },
    });
    // Sibling override keys survive a merge within the same group.
    const three = patchMenuSectionForDevice(two, "sec-1", "mobile", "navProps", { itemGap: 20 });
    expect(three.sections[0]?.responsive?.mobile?.navProps).toEqual({
      orientation: "vertical",
      itemGap: 20,
    });
  });

  test("NO auto-remove-on-equality: patching mobile with the exact base value still stores the override", () => {
    const out = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", { paddingY: 16 });
    expect(out.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 16 } } });
  });

  test("multi-nav-items write target: desktop navProps patch mutates ONLY the FIRST nav-items block", () => {
    const base = makeDoc();
    const secondNav: MenuBlockV2 = { id: "blk-nav-2", type: "nav-items", props: { itemGap: 4 } };
    const twoNavDoc: MenuDocumentV2 = {
      ...base,
      sections: [
        {
          ...(base.sections[0] as MenuSectionV2),
          blocks: [...(base.sections[0] as MenuSectionV2).blocks, secondNav],
        },
      ],
    };
    const out = patchMenuSectionForDevice(twoNavDoc, "sec-1", "desktop", "navProps", {
      fontSize: 18,
    });
    expect((out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      itemGap: 8,
      fontSize: 18,
    });
    // The second nav-items block is untouched (reference-identical).
    expect(out.sections[0]?.blocks[1]).toBe(secondNav);
  });

  test("no nav-items block ⇒ identity on a desktop navProps patch; unknown sectionId ⇒ identity", () => {
    const base = makeDoc();
    const noNavDoc: MenuDocumentV2 = {
      ...base,
      sections: [{ ...(base.sections[0] as MenuSectionV2), blocks: [] }],
    };
    const out = patchMenuSectionForDevice(noNavDoc, "sec-1", "desktop", "navProps", {
      fontSize: 18,
    });
    expect(out.sections[0]).toEqual(noNavDoc.sections[0]);
    expect(
      patchMenuSectionForDevice(base, "sec-missing", "mobile", "layout", { paddingY: 2 })
    ).toBe(base);
  });

  test("delete-on-undefined: desktop deletes the base key; mobile deletes the override leaf and prunes", () => {
    const desktopOut = patchMenuSectionForDevice(makeDoc(), "sec-1", "desktop", "layout", {
      paddingY: undefined,
    });
    expect(desktopOut.sections[0]?.layout).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(desktopOut.sections[0]?.layout, "paddingY")).toBe(
      false
    );

    const withOverride = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 2,
    });
    const cleared = patchMenuSectionForDevice(withOverride, "sec-1", "mobile", "layout", {
      paddingY: undefined,
    });
    // Sole override deleted ⇒ the whole responsive chain prunes back to the
    // pre-override document (never an own `undefined` key).
    expect(cleared).toEqual(makeDoc());
    expect("responsive" in (cleared.sections[0] as MenuSectionV2)).toBe(false);
    expect(
      readMenuSectionOverrideValue(
        cleared.sections[0] as MenuSectionV2,
        "mobile",
        "layout",
        "paddingY"
      )
    ).toBeUndefined();

    // Undefined patch for a key absent from the target leaves no residue.
    const noResidue = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "navProps", {
      fontWeight: undefined,
    });
    expect(noResidue).toEqual(makeDoc());
  });
});

describe("menuDocumentV2 clearMenuSectionOverride (TASK-501-01)", () => {
  const makeDoc = (): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: "sec-1",
        type: "menu-bar",
        name: "Menu bar",
        layout: { paddingY: 16 },
        blocks: [{ id: "blk-nav", type: "nav-items", props: {} }],
      },
    ],
  });

  test("removes one key; removing the last key prunes group ⇒ breakpoint ⇒ responsive", () => {
    let patched = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 2,
      paddingX: 4,
    });
    patched = clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingX");
    expect(patched.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 2 } } });
    const fullyCleared = clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingY");
    // Deep-equals the pre-override document (byte-identical legacy shape).
    expect(fullyCleared).toEqual(makeDoc());
    expect("responsive" in (fullyCleared.sections[0] as MenuSectionV2)).toBe(false);
  });

  test("clearing keeps sibling groups intact", () => {
    let patched = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 2,
    });
    patched = patchMenuSectionForDevice(patched, "sec-1", "mobile", "navProps", {
      orientation: "vertical",
    });
    const cleared = clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingY");
    expect(cleared.sections[0]?.responsive).toEqual({
      mobile: { navProps: { orientation: "vertical" } },
    });
  });

  test("clearing a non-existent override is an identity return", () => {
    const base = makeDoc();
    const out = clearMenuSectionOverride(base, "sec-1", "mobile", "layout", "paddingY");
    expect(out.sections[0]).toBe(base.sections[0]);
    expect(clearMenuSectionOverride(base, "sec-missing", "mobile", "layout", "paddingY")).toBe(
      base
    );
  });

  test("patch/clear are immutable — the input document object is never mutated (TASK-501-04)", () => {
    const input = makeDoc();
    const snapshot = structuredClone(input);

    const patched = patchMenuSectionForDevice(input, "sec-1", "mobile", "layout", { paddingY: 2 });
    expect(patched).not.toBe(input);
    expect(input).toEqual(snapshot);

    const basePatched = patchMenuSectionForDevice(input, "sec-1", "desktop", "layout", {
      paddingY: 20,
    });
    expect(basePatched).not.toBe(input);
    expect(input).toEqual(snapshot);

    expect(clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingY")).not.toBe(
      patched
    );
    expect(patched.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 2 } } });
    expect(input).toEqual(snapshot);
  });
});

describe("menuDocumentV2 block visibility per device (TASK-501-01)", () => {
  const nativeBlock: MenuBlockV2 = { id: "blk-nav", type: "nav-items", props: {} };
  const leafVisible: MenuBlockV2 = {
    id: "blk-cta",
    type: "cta-button",
    props: {},
    visibility: { visible: true },
  };
  const leafHidden: MenuBlockV2 = {
    id: "blk-cta-hidden",
    type: "cta-button",
    props: {},
    visibility: { visible: false },
  };

  const makeDoc = (blocks: MenuBlockV2[]): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [{ id: "sec-1", type: "menu-bar", name: "Menu bar", layout: {}, blocks }],
  });

  test("resolveMenuBlockVisibleForDevice: desktop = flat visibility (native ⇒ true); tablet inherits desktop with no tablet record", () => {
    expect(resolveMenuBlockVisibleForDevice(nativeBlock, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(leafVisible, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(leafHidden, "desktop")).toBe(false);
    // No tablet record ⇒ tablet inherits the flat/desktop value.
    expect(resolveMenuBlockVisibleForDevice(leafHidden, "tablet")).toBe(false);
  });

  test("mobile override wins over the flat value in BOTH directions; no override ⇒ inherits desktop", () => {
    // hide-on-mobile: flat visible + mobile false.
    const hideOnMobile: MenuBlockV2 = {
      ...leafVisible,
      responsive: { mobile: { visibility: { visible: false } } },
    };
    expect(resolveMenuBlockVisibleForDevice(hideOnMobile, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(hideOnMobile, "mobile")).toBe(false);
    // show-only-on-mobile: flat false + mobile true.
    const showOnlyOnMobile: MenuBlockV2 = {
      ...leafHidden,
      responsive: { mobile: { visibility: { visible: true } } },
    };
    expect(resolveMenuBlockVisibleForDevice(showOnlyOnMobile, "desktop")).toBe(false);
    expect(resolveMenuBlockVisibleForDevice(showOnlyOnMobile, "mobile")).toBe(true);
    // No override ⇒ mobile inherits desktop.
    expect(resolveMenuBlockVisibleForDevice(leafHidden, "mobile")).toBe(false);
    expect(resolveMenuBlockVisibleForDevice(nativeBlock, "mobile")).toBe(true);
  });

  test("hasMenuBlockVisibilityOverride detects the record", () => {
    expect(hasMenuBlockVisibilityOverride(nativeBlock)).toBe(false);
    expect(
      hasMenuBlockVisibilityOverride({
        ...nativeBlock,
        responsive: { mobile: { visibility: { visible: false } } },
      })
    ).toBe(true);
  });

  test("setMenuBlockVisibleForDevice: mobile writes the sparse override on native AND leaf blocks", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const out = setMenuBlockVisibleForDevice(
      setMenuBlockVisibleForDevice(base, "blk-nav", "mobile", false),
      "blk-cta",
      "mobile",
      false
    );
    expect(out.sections[0]?.blocks[0]?.responsive).toEqual({
      mobile: { visibility: { visible: false } },
    });
    expect(out.sections[0]?.blocks[1]?.responsive).toEqual({
      mobile: { visibility: { visible: false } },
    });
    // Flat leaf visibility untouched by a mobile write.
    expect(
      (out.sections[0]?.blocks[1] as { visibility?: { visible: boolean } }).visibility
    ).toEqual({ visible: true });
  });

  test("setMenuBlockVisibleForDevice: desktop writes flat visibility on leaf blocks; native ⇒ documented no-op", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const leafOut = setMenuBlockVisibleForDevice(base, "blk-cta", "desktop", false);
    expect(
      (leafOut.sections[0]?.blocks[1] as { visibility?: { visible: boolean } }).visibility
    ).toEqual({ visible: false });
    expect("responsive" in (leafOut.sections[0]?.blocks[1] as MenuBlockV2)).toBe(false);
    const nativeOut = setMenuBlockVisibleForDevice(base, "blk-nav", "desktop", false);
    expect(nativeOut.sections[0]?.blocks[0]).toBe(nativeBlock);
    expect("visibility" in (nativeOut.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
    // Unknown block id ⇒ identity.
    expect(setMenuBlockVisibleForDevice(base, "blk-missing", "mobile", false)).toBe(base);
  });

  test("clearMenuBlockVisibilityOverride prunes back to the pre-override block shape", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const withOverride = setMenuBlockVisibleForDevice(base, "blk-nav", "mobile", false);
    const cleared = clearMenuBlockVisibilityOverride(withOverride, "blk-nav", "mobile");
    expect(cleared).toEqual(base);
    expect("responsive" in (cleared.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
    // Clearing a non-existent override is an identity return.
    const noop = clearMenuBlockVisibilityOverride(base, "blk-nav", "mobile");
    expect(noop.sections[0]?.blocks[0]).toBe(nativeBlock);
    expect(clearMenuBlockVisibilityOverride(base, "blk-missing", "mobile")).toBe(base);
  });
});

// --- TASK-502-01: brand.text ------------------------------------------------

describe("menuDocumentV2 brand text (TASK-502-01)", () => {
  const brandDoc = (props: Record<string, unknown>) =>
    doc([{ id: "blk-brand", type: "brand", props }]);
  const readBrand = (props: Record<string, unknown>) =>
    normalizeMenuDocumentV2ForWrite(brandDoc(props)).sections[0]?.blocks[0] as {
      props: BrandProps;
    };

  test("accepts a text override, round-tripping through the strict writer", () => {
    expect(readBrand({ mode: "text", href: "/", text: "Acme Corp" }).props.text).toBe("Acme Corp");
  });

  test("trims surrounding whitespace", () => {
    expect(readBrand({ mode: "text", href: "/", text: "  Acme  " }).props.text).toBe("Acme");
  });

  test("caps at MENU_BRAND_TEXT_MAX_LENGTH without throwing", () => {
    const long = "a".repeat(200);
    const stored = readBrand({ mode: "text", href: "/", text: long }).props.text;
    expect(stored).toBe("a".repeat(MENU_BRAND_TEXT_MAX_LENGTH));
    expect(stored?.length).toBe(MENU_BRAND_TEXT_MAX_LENGTH);
  });

  test("empty / whitespace / null store NO text member (sparse omit ⇒ inherit site name)", () => {
    for (const text of ["", "   ", null]) {
      const props = readBrand({ mode: "text", href: "/", text }).props;
      expect("text" in props).toBe(false);
    }
  });

  test("rejects a non-string text with the exact path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/", text: 42 })),
      "document.sections[0].blocks[0].props.text"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/", text: {} })),
      "document.sections[0].blocks[0].props.text"
    );
  });

  test("a legacy brand WITHOUT text round-trips deep-equal (no text member materializes)", () => {
    const legacy = normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/" }));
    const read = normalizeStoredMenuDocumentV2ForRead(legacy);
    expect(read).toEqual(legacy);
    const props = read.sections[0]?.blocks[0]?.props as BrandProps;
    expect("text" in props).toBe(false);
  });

  test("createDefaultMenuDocumentV2 and buildMenuDocumentV2FromLegacy stay textless", () => {
    const def = createDefaultMenuDocumentV2();
    const brand = def.sections[0]?.blocks.find((block) => block.type === "brand");
    expect("text" in (brand as { props: BrandProps }).props).toBe(false);
    const built = buildMenuDocumentV2FromLegacy(null, [
      createPageBlockV2("image", { id: "blk-logo" }),
    ]);
    const builtBrand = built?.sections[0]?.blocks.find((block) => block.type === "brand");
    expect("text" in (builtBrand as { props: BrandProps }).props).toBe(false);
  });
});

// --- TASK-502-01: tablet breakpoint round-trip + reject ----------------------

describe("menuDocumentV2 tablet breakpoint (TASK-502-01)", () => {
  test("section tablet layout/navProps + tablet & mobile side-by-side round-trip deep-equal", () => {
    const input = doc(
      [
        {
          id: "blk-nav",
          type: "nav-items",
          props: { itemGap: 8 },
          responsive: {
            tablet: { visibility: { visible: false } },
            mobile: { visibility: { visible: true } },
          },
        },
        {
          id: "blk-cta",
          type: "cta-button",
          props: { label: "Go", href: "/x", target: "self", variant: "primary", size: "md" },
          visibility: { visible: true },
          responsive: { tablet: { visibility: { visible: false } } },
        },
      ],
      {
        responsive: {
          tablet: { layout: { paddingY: 12 }, navProps: { itemGap: 24 } },
          mobile: { layout: { paddingY: 4 }, navProps: { orientation: "vertical" } },
        },
      }
    );
    const out = normalizeMenuDocumentV2ForWrite(input);
    const section0 = out.sections[0] as MenuSectionV2;
    expect(section0.responsive).toEqual({
      tablet: { layout: { paddingY: 12 }, navProps: { itemGap: 24 } },
      mobile: { layout: { paddingY: 4 }, navProps: { orientation: "vertical" } },
    });
    expect(section0.blocks[0]?.responsive).toEqual({
      tablet: { visibility: { visible: false } },
      mobile: { visibility: { visible: true } },
    });
    expect(section0.blocks[1]?.responsive).toEqual({ tablet: { visibility: { visible: false } } });
    // Idempotent through BOTH the writer and the stored read.
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });

  test("reject-unknown: cross-subset keys inside a tablet record throw with the exact path", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { tablet: { layout: { linkColor: "var(--color-primary)" } } } })
        ),
      "document.sections[0].responsive.tablet.layout.linkColor"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { tablet: { navProps: { sticky: true } } } })
        ),
      "document.sections[0].responsive.tablet.navProps.sticky"
    );
  });

  test("reject-unknown: a tablet block override carrying page-shaped props is rejected (leaf strip trap)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([{ type: "nav-items", props: {}, responsive: { tablet: { props: { x: 1 } } } }])
        ),
      "document.sections[0].blocks[0].responsive.tablet.props"
    );
  });
});

// --- TASK-502-01: cascade (mobile does NOT inherit tablet) -------------------

describe("menuDocumentV2 cascade (TASK-502-01)", () => {
  const sectionFixture: MenuSectionV2 = {
    id: "sec-1",
    type: "menu-bar",
    name: "Menu bar",
    layout: { paddingY: 16, surfaceColor: "#0f172a" },
    blocks: [{ id: "blk-nav", type: "nav-items", props: { itemGap: 8, fontSize: 14 } }],
    responsive: { tablet: { layout: { paddingY: 12 }, navProps: { itemGap: 24 } } },
  };

  test("tablet = base merged with ONLY the tablet record", () => {
    const tablet = resolveMenuSectionAppearanceForDevice(sectionFixture, "tablet");
    expect(tablet.layout).toEqual({ paddingY: 12, surfaceColor: "#0f172a" });
    expect(tablet.navProps).toEqual({ itemGap: 24, fontSize: 14 });
  });

  test("a tablet-only override leaves the mobile resolve deep-equal to desktop (mobile ignores tablet)", () => {
    const desktop = resolveMenuSectionAppearanceForDevice(sectionFixture, "desktop");
    const mobile = resolveMenuSectionAppearanceForDevice(sectionFixture, "mobile");
    expect(mobile).toEqual(desktop);
    expect(mobile.layout).toEqual({ paddingY: 16, surfaceColor: "#0f172a" });
    expect(mobile.navProps).toEqual({ itemGap: 8, fontSize: 14 });
  });
});

// --- TASK-502-01: device-defining carve-out ---------------------------------

describe("menuDocumentV2 device-defining carve-out (TASK-502-01)", () => {
  test("exported key list is mobileMode + dropdownDirection", () => {
    expect(MENU_NAV_DEVICE_DEFINING_KEYS).toEqual(["mobileMode", "dropdownDirection"]);
  });

  test("WRITE rejects mobileMode / dropdownDirection inside a responsive navProps record", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { navProps: { mobileMode: "inline" } } } })
        ),
      "document.sections[0].responsive.mobile.navProps.mobileMode"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { tablet: { navProps: { dropdownDirection: "top" } } } })
        ),
      "document.sections[0].responsive.tablet.navProps.dropdownDirection"
    );
  });

  test("BASE nav-items props still accept mobileMode / dropdownDirection", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([{ type: "nav-items", props: { mobileMode: "inline", dropdownDirection: "top" } }])
    );
    expect((out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      mobileMode: "inline",
      dropdownDirection: "top",
    });
  });

  test("STORED READ hoists a mobile mobileMode override into the base props then prunes the record", () => {
    // A 501-era doc: base nav-items mobileMode "disclosure", mobile override "inline".
    const stored = doc(
      [{ id: "blk-nav", type: "nav-items", props: { mobileMode: "disclosure", itemGap: 8 } }],
      { responsive: { mobile: { navProps: { mobileMode: "inline" } } } }
    );
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    const nav = read.sections[0]?.blocks[0] as { props: Record<string, unknown> };
    // Hoisted: the base value is overwritten with the override value.
    expect(nav.props).toEqual({ mobileMode: "inline", itemGap: 8 });
    // The record is pruned back to the never-overridden shape (no responsive member).
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
    // Doc NOT degraded.
    expect(read.sections).toHaveLength(1);
    // Migrated doc round-trips clean through the STRICT writer (persistable).
    expect(() => normalizeMenuDocumentV2ForWrite(read)).not.toThrow();
    expect(normalizeMenuDocumentV2ForWrite(read)).toEqual(read);
  });

  test("mobileMode hoist emits byte-identical published CSS before and after the migration", () => {
    // "Before" = the raw 501-era doc with the live override; "after" = the
    // migrated (hoisted+pruned) doc. The mobile branch reads the mobile-resolved
    // appearance, so the hoist must not change one byte of the emission.
    const before = doc(
      [{ id: "blk-nav", type: "nav-items", props: { mobileMode: "disclosure" } }],
      { responsive: { mobile: { navProps: { mobileMode: "inline" } } } }
    ) as unknown as MenuDocumentV2;
    const after = normalizeStoredMenuDocumentV2ForRead(before);
    expect(buildMenuDocumentCss(after)).toBe(buildMenuDocumentCss(before));
  });

  test("STORED READ prune-only drops a dead dropdownDirection override (never hoisted)", () => {
    const stored = doc(
      [{ id: "blk-nav", type: "nav-items", props: { dropdownDirection: "bottom" } }],
      { responsive: { mobile: { navProps: { dropdownDirection: "top" } } } }
    );
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    const nav = read.sections[0]?.blocks[0] as { props: Record<string, unknown> };
    // Base is UNCHANGED — dropdownDirection is never hoisted.
    expect(nav.props).toEqual({ dropdownDirection: "bottom" });
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
  });

  test("a junk mobileMode override value is NOT hoisted (prune-only, base unchanged, doc not degraded)", () => {
    const stored = doc(
      [{ id: "blk-nav", type: "nav-items", props: { mobileMode: "disclosure" } }],
      { responsive: { mobile: { navProps: { mobileMode: "diagonal" } } } }
    );
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    const nav = read.sections[0]?.blocks[0] as { props: Record<string, unknown> };
    expect(nav.props).toEqual({ mobileMode: "disclosure" }); // base untouched
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
    expect(read.sections).toHaveLength(1); // NOT degraded
  });

  test("sibling override keys in the same record survive the carve-out prune", () => {
    const stored = doc([{ id: "blk-nav", type: "nav-items", props: {} }], {
      responsive: { mobile: { navProps: { mobileMode: "inline", itemGap: 20 } } },
    });
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    // itemGap survives as a real mobile override; mobileMode is hoisted+pruned.
    expect(read.sections[0]?.responsive).toEqual({ mobile: { navProps: { itemGap: 20 } } });
    expect((read.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      mobileMode: "inline",
    });
  });

  test("blast radius unchanged: a malformed LEAF prop still degrades the whole doc (carve-out did NOT loosen leaf validation)", () => {
    const stored = doc([
      {
        type: "cta-button",
        props: { label: "Go", variant: "NONSENSE" },
        visibility: { visible: true },
      },
    ]);
    expect(normalizeStoredMenuDocumentV2ForRead(stored).sections).toEqual([]);
  });
});

// --- TASK-502-01: per-breakpoint block visibility (tablet) ------------------

describe("menuDocumentV2 tablet block visibility (TASK-502-01)", () => {
  const nativeBlock: MenuBlockV2 = { id: "blk-nav", type: "nav-items", props: {} };
  const leafVisible: MenuBlockV2 = {
    id: "blk-cta",
    type: "cta-button",
    props: {},
    visibility: { visible: true },
  };
  const makeDoc = (blocks: MenuBlockV2[]): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [{ id: "sec-1", type: "menu-bar", name: "Menu bar", layout: {}, blocks }],
  });

  test("setMenuBlockVisibleForDevice tablet writes responsive.tablet on native AND leaf; desktop stays flat", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const out = setMenuBlockVisibleForDevice(
      setMenuBlockVisibleForDevice(base, "blk-nav", "tablet", false),
      "blk-cta",
      "tablet",
      false
    );
    expect(out.sections[0]?.blocks[0]?.responsive).toEqual({
      tablet: { visibility: { visible: false } },
    });
    expect(out.sections[0]?.blocks[1]?.responsive).toEqual({
      tablet: { visibility: { visible: false } },
    });
    // Flat leaf visibility untouched by the tablet write.
    expect(
      (out.sections[0]?.blocks[1] as { visibility?: { visible: boolean } }).visibility
    ).toEqual({
      visible: true,
    });
  });

  test("resolveMenuBlockVisibleForDevice reads the tablet record; mobile ignores it", () => {
    const block: MenuBlockV2 = {
      ...leafVisible,
      responsive: { tablet: { visibility: { visible: false } } },
    };
    expect(resolveMenuBlockVisibleForDevice(block, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(block, "tablet")).toBe(false);
    // A tablet-only override leaves mobile inheriting the flat/desktop value.
    expect(resolveMenuBlockVisibleForDevice(block, "mobile")).toBe(true);
  });

  test("hasMenuBlockVisibilityOverride: any-breakpoint vs a specific breakpoint", () => {
    const tabletOnly: MenuBlockV2 = {
      ...nativeBlock,
      responsive: { tablet: { visibility: { visible: false } } },
    };
    expect(hasMenuBlockVisibilityOverride(tabletOnly)).toBe(true); // any-breakpoint
    expect(hasMenuBlockVisibilityOverride(tabletOnly, "tablet")).toBe(true);
    expect(hasMenuBlockVisibilityOverride(tabletOnly, "mobile")).toBe(false);
    expect(hasMenuBlockVisibilityOverride(nativeBlock)).toBe(false);
  });

  test("clearMenuBlockVisibilityOverride accepts tablet and prunes to the pre-override shape", () => {
    const base = makeDoc([nativeBlock]);
    const withOverride = setMenuBlockVisibleForDevice(base, "blk-nav", "tablet", false);
    const cleared = clearMenuBlockVisibilityOverride(withOverride, "blk-nav", "tablet");
    expect(cleared).toEqual(base);
    expect("responsive" in (cleared.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
  });
});

// --- TASK-502-01: mobile-only doc byte-identity -----------------------------

describe("menuDocumentV2 mobile-only byte-identity (TASK-502-01)", () => {
  test("a 501-era doc with ONLY mobile overrides (no dead keys) round-trips deep-equal", () => {
    const mobileOnly = normalizeMenuDocumentV2ForWrite(
      doc(
        [
          {
            id: "blk-nav",
            type: "nav-items",
            props: { itemGap: 8 },
            responsive: { mobile: { visibility: { visible: false } } },
          },
        ],
        { responsive: { mobile: { layout: { paddingY: 4 }, navProps: { itemGap: 16 } } } }
      )
    );
    expect(normalizeStoredMenuDocumentV2ForRead(mobileOnly)).toEqual(mobileOnly);
  });
});

// --- TASK-504-01: brand style, per-level styles, cheap-wins ------------------

const brandBlock = (extra: Record<string, unknown> = {}) => ({
  id: "blk-brand",
  type: "brand",
  props: { mode: "text", href: "/", ...(extra.props ?? {}) },
  ...(extra.responsive ? { responsive: extra.responsive } : {}),
});
const navBlock = (props: Record<string, unknown> = {}) => ({
  id: "blk-nav",
  type: "nav-items",
  props,
});
const firstBlock = (d: MenuDocumentV2) => d.sections[0]!.blocks[0]!;
const firstSection = (d: MenuDocumentV2) => d.sections[0]!;

test("nested Menu color fields canonicalize or omit fail-soft across write and read resolvers", () => {
  for (const colorCase of rawMenuColorCases) {
    const input = doc(
      [
        brandBlock({ props: { style: { color: colorCase.input, height: 40 } } }),
        navBlock({
          levelStyles: { 1: { linkColor: colorCase.input, fontSize: 16 } },
          navChrome: { navPillBackground: colorCase.input, navPillRadius: 8 },
        }),
      ],
      {
        id: "sec-color-nested",
        layout: { surfaceColorScrolled: colorCase.input, radius: 6 },
      }
    );

    const assertNestedResult = (out: MenuDocumentV2) => {
      const layout = out.sections[0]?.layout;
      const brand = out.sections[0]?.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>;
      const nav = out.sections[0]?.blocks[1] as Extract<MenuBlockV2, { type: "nav-items" }>;
      const expectedColor = colorCase.expected ?? undefined;

      expect(layout?.surfaceColorScrolled, `${colorCase.id}:scrolled`).toBe(expectedColor);
      expect(layout?.radius, `${colorCase.id}:layout-sibling`).toBe(6);
      expect(brand.props.style?.color, `${colorCase.id}:brand`).toBe(expectedColor);
      expect(brand.props.style?.height, `${colorCase.id}:brand-sibling`).toBe(40);
      expect(nav.props.levelStyles?.[1]?.linkColor, `${colorCase.id}:level`).toBe(expectedColor);
      expect(nav.props.levelStyles?.[1]?.fontSize, `${colorCase.id}:level-sibling`).toBe(16);
      expect(nav.props.navChrome?.navPillBackground, `${colorCase.id}:chrome`).toBe(expectedColor);
      expect(nav.props.navChrome?.navPillRadius, `${colorCase.id}:chrome-sibling`).toBe(8);
    };

    const written = normalizeMenuDocumentV2ForWrite(input);
    assertNestedResult(written);
    const stored = normalizeStoredMenuDocumentV2ForRead(input);
    assertNestedResult(stored);
    const resolvedStored = resolveStoredMenuDocument({ document: input });
    expect(resolvedStored, `${colorCase.id}:stored-resolver`).not.toBeNull();
    assertNestedResult(resolvedStored as MenuDocumentV2);
    const resolvedPublished = resolvePublishedMenuDocument({ published: { document: input } });
    expect(resolvedPublished, `${colorCase.id}:published-resolver`).not.toBeNull();
    assertNestedResult(resolvedPublished as MenuDocumentV2);
  }
});

describe("menuDocumentV2 normalizeBrandStyle (TASK-504-01)", () => {
  test("accepts each text-mode + image-mode key, SPARSE (only present kept)", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        brandBlock({
          props: {
            style: {
              fontSize: 24,
              fontWeight: 700,
              color: "var(--color-primary)",
              textTransform: "uppercase",
              letterSpacing: 2,
              height: 48,
              maxWidth: 200,
            },
          },
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>;
    expect(block.props.style).toEqual({
      fontSize: 24,
      fontWeight: 700,
      color: "var(--color-primary)",
      textTransform: "uppercase",
      letterSpacing: 2,
      height: 48,
      maxWidth: 200,
    });
  });

  test("empty style ⇒ member omitted (legacy byte-identity)", () => {
    const d = normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: {} } })]));
    expect("style" in (firstBlock(d) as { props: BrandProps }).props).toBe(false);
  });

  test("reject-unknown key ⇒ throw at the exact path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: { foo: 1 } } })])),
      "document.sections[0].blocks[0].props.style.foo"
    );
  });

  test("non-object / array style container ⇒ structural throw at path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: [] } })])),
      "document.sections[0].blocks[0].props.style"
    );
  });

  test("bad VALUES fail-soft (omitted, NOT thrown) — distinct from the flat subset", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        brandBlock({
          props: {
            style: { color: "not-a-color", fontSize: Number.NaN, fontWeight: 450, height: 40 },
          },
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>;
    // only the valid `height` survives; the three bad values are omitted, not thrown.
    expect(block.props.style).toEqual({ height: 40 });
  });

  test("NEW clamp ranges: letterSpacing negative allowed, fontSize 48, height/maxWidth bounds", () => {
    const styled = (style: Record<string, unknown>) =>
      (
        firstBlock(
          normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style } })]))
        ) as Extract<MenuBlockV2, { type: "brand" }>
      ).props.style;
    expect(styled({ letterSpacing: -2 })).toEqual({ letterSpacing: -2 });
    expect(styled({ letterSpacing: -3 })).toEqual({
      letterSpacing: BRAND_STYLE_NUMBER_RANGES.letterSpacing.min,
    });
    expect(styled({ fontSize: 48 })).toEqual({ fontSize: 48 });
    expect(styled({ fontSize: 999 })).toEqual({ fontSize: 48 });
    expect(styled({ fontSize: 1 })).toEqual({ fontSize: 10 });
    expect(styled({ height: 999 })).toEqual({ height: 120 });
    expect(styled({ maxWidth: 1 })).toEqual({ maxWidth: 40 });
  });
});

describe("menuDocumentV2 normalizeNavLevelStyles (TASK-504-01)", () => {
  test("accepts levels 1/2 with link + container fields; sparse + prune", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          levelStyles: {
            1: {
              linkColor: "#111111",
              fontSize: 14,
              background: "#ffffff",
              borderWidth: 2,
              radius: 8,
              minWidth: 200,
              shadow: "md",
            },
            2: { linkColor: "#222222" },
          },
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>;
    expect(block.props.levelStyles).toEqual({
      1: {
        linkColor: "#111111",
        fontSize: 14,
        background: "#ffffff",
        borderWidth: 2,
        radius: 8,
        minWidth: 200,
        shadow: "md",
      },
      2: { linkColor: "#222222" },
    });
  });

  test("reject-unknown OUTER level key (0/3/junk) at levelStyles.<key>", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock({ levelStyles: { 0: { linkColor: "#111" } } })])
        ),
      "document.sections[0].blocks[0].props.levelStyles.0"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock({ levelStyles: { 3: { linkColor: "#111" } } })])
        ),
      "document.sections[0].blocks[0].props.levelStyles.3"
    );
  });

  test("reject-unknown per-level style key", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { bogus: 1 } } })])),
      "document.sections[0].blocks[0].props.levelStyles.1.bogus"
    );
  });

  test("NEW ranges: minWidth [80,480], radius/borderWidth/gap/paddingX/paddingY", () => {
    const lvl = (style: Record<string, unknown>) =>
      (
        firstBlock(
          normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: style } })]))
        ) as Extract<MenuBlockV2, { type: "nav-items" }>
      ).props.levelStyles![1];
    expect(lvl({ minWidth: 1 })).toEqual({ minWidth: NAV_LEVEL_NUMBER_RANGES.minWidth.min });
    expect(lvl({ minWidth: 999 })).toEqual({ minWidth: 480 });
    expect(lvl({ radius: 999 })).toEqual({ radius: 32 });
    expect(lvl({ borderWidth: 999 })).toEqual({ borderWidth: 8 });
    expect(lvl({ gap: 999 })).toEqual({ gap: 32 });
    expect(lvl({ paddingX: 999 })).toEqual({ paddingX: 40 });
    expect(lvl({ paddingY: 999 })).toEqual({ paddingY: 32 });
  });

  test("empty level pruned; empty record ⇒ member omitted (bad values fail-soft)", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { linkColor: "nope" }, 2: {} } })])
    );
    expect("levelStyles" in (firstBlock(d) as { props: Record<string, unknown> }).props).toBe(
      false
    );
  });
});

describe("menuDocumentV2 normalizeNavItemsProps extension (TASK-504-01)", () => {
  test("scalars + levelStyles round-trip both", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ itemGap: 12, linkColor: "#111111", levelStyles: { 1: { fontSize: 16 } } })])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>;
    expect(block.props.itemGap).toBe(12);
    expect(block.props.linkColor).toBe("#111111");
    expect(block.props.levelStyles).toEqual({ 1: { fontSize: 16 } });
  });

  test("scalar bad value STILL THROWS (unchanged flat-subset behavior)", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ linkColor: "not-a-color" })])),
      "document.sections[0].blocks[0].props.linkColor"
    );
  });

  test("stray non-scalar/non-levelStyles key still rejects", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ bogusKey: 1 })])),
      "document.sections[0].blocks[0].props.bogusKey"
    );
  });

  test("cheap-win base scalars ride NAV_ITEMS_PROP_KEYS (round-trip)", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          linkPaddingX: 20,
          linkPaddingY: 10,
          linkRadius: 8,
          linkHoverTextColor: "#abcdef",
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>;
    expect(block.props).toMatchObject({
      linkPaddingX: 20,
      linkPaddingY: 10,
      linkRadius: 8,
      linkHoverTextColor: "#abcdef",
    });
    expect(NAV_LINK_NUMBER_RANGES).toEqual({
      paddingX: { min: 0, max: 40 },
      paddingY: { min: 0, max: 32 },
      radius: { min: 0, max: 32 },
    });
  });

  test("LEVEL-0 key-namespace guard: bare NavLevelStyle keys at props ROOT still throw", () => {
    // paddingX/paddingY/radius/gap are NOT MenuAppearance base keys ⇒ reject-unknown
    // (proves the level-0 base writes linkPaddingX/linkPaddingY/linkRadius/itemGap).
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ paddingX: 10 })])),
      "document.sections[0].blocks[0].props.paddingX"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ radius: 10 })])),
      "document.sections[0].blocks[0].props.radius"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ gap: 10 })])),
      "document.sections[0].blocks[0].props.gap"
    );
  });
});

describe("menuDocumentV2 fail-closed READ-trap round-trips (TASK-504-01)", () => {
  test("brand.props.style + navProps.levelStyles + responsive deltas survive IDENTICALLY", () => {
    const input = normalizeMenuDocumentV2ForWrite(
      doc(
        [
          brandBlock({
            props: { style: { fontSize: 22, color: "#111111" } },
            responsive: {
              tablet: { style: { fontSize: 18 } },
              mobile: { style: { fontSize: 14 } },
            },
          }),
          navBlock({
            linkColor: "#111111",
            levelStyles: { 1: { fontSize: 16 }, 2: { linkColor: "#222222" } },
          }),
        ],
        {
          responsive: {
            tablet: { navProps: { levelStyles: { 1: { fontSize: 18 } } } },
            mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } },
          },
        }
      )
    );
    expect(normalizeStoredMenuDocumentV2ForRead(input)).toEqual(input);
    // sanity: the members actually materialized (guards against a vacuous pass).
    const brand = input.sections[0]!.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>;
    expect(brand.props.style).toBeDefined();
    expect(brand.responsive?.mobile?.style).toEqual({ fontSize: 14 });
    expect(input.sections[0]!.responsive?.tablet?.navProps?.levelStyles?.[1]).toEqual({
      fontSize: 18,
    });
  });
});

describe("menuDocumentV2 per-device brand style model (TASK-504-01 §5)", () => {
  test("accepts {tablet|mobile}.style, prunes empty, rejects unknown style key", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        brandBlock({ responsive: { tablet: { style: { fontSize: 20 } }, mobile: { style: {} } } }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>;
    expect(block.responsive?.tablet?.style).toEqual({ fontSize: 20 });
    expect(block.responsive?.mobile).toBeUndefined(); // empty style pruned ⇒ no breakpoint
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([brandBlock({ responsive: { tablet: { style: { nope: 1 } } } })])
        ),
      "document.sections[0].blocks[0].responsive.tablet.style.nope"
    );
  });

  test("CONTROL-FLOW data-loss guard: a style delta WITHOUT visibility survives (not dropped)", () => {
    const styleOnly = normalizeMenuDocumentV2ForWrite(
      doc([brandBlock({ responsive: { mobile: { style: { fontSize: 14 } } } })])
    );
    expect(normalizeStoredMenuDocumentV2ForRead(styleOnly)).toEqual(styleOnly);
    expect(
      (styleOnly.sections[0]!.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>).responsive
        ?.mobile?.style
    ).toEqual({ fontSize: 14 });
  });

  test("CONTROL-FLOW data-loss guard: empty/absent `visible` beside a style delta keeps the style", () => {
    // visibility present but with NO `visible` ⇒ the visibility assign is skipped;
    // the style branch MUST still run (the §5 continue→non-assign conversion).
    const mixed = normalizeMenuDocumentV2ForWrite(
      doc([brandBlock({ responsive: { tablet: { visibility: {}, style: { fontSize: 16 } } } })])
    );
    const record = (mixed.sections[0]!.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>)
      .responsive?.tablet;
    expect(record?.style).toEqual({ fontSize: 16 });
    expect(record?.visibility).toBeUndefined();
    expect(normalizeStoredMenuDocumentV2ForRead(mixed)).toEqual(mixed);
  });
});

describe("menuDocumentV2 resolveMenuBrandStyleForDevice (TASK-504-01)", () => {
  const block = () =>
    firstBlock(
      normalizeMenuDocumentV2ForWrite(
        doc([
          brandBlock({
            props: { style: { fontSize: 24, color: "#111111" } },
            responsive: {
              tablet: { style: { fontSize: 18 } },
              mobile: { style: { fontSize: 12 } },
            },
          }),
        ])
      )
    );

  test("desktop = base; tablet/mobile = base ⊕ own delta; mobile ≠ tablet", () => {
    const b = block();
    expect(resolveMenuBrandStyleForDevice(b, "desktop")).toEqual({
      fontSize: 24,
      color: "#111111",
    });
    expect(resolveMenuBrandStyleForDevice(b, "tablet")).toEqual({ fontSize: 18, color: "#111111" });
    expect(resolveMenuBrandStyleForDevice(b, "mobile")).toEqual({ fontSize: 12, color: "#111111" });
  });

  test("non-brand block ⇒ {}", () => {
    const nav = firstBlock(normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })])));
    expect(resolveMenuBrandStyleForDevice(nav, "desktop")).toEqual({});
  });
});

describe("menuDocumentV2 patch/clear brand style per device (TASK-504-01)", () => {
  const base = () =>
    normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: { fontSize: 24 } } })]));

  test("desktop writes props.style; tablet/mobile write responsive[bp].style", () => {
    let d = base();
    d = patchMenuBrandStyleForDevice(d, "blk-brand", "desktop", { color: "#222222" });
    expect((firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).props.style).toEqual({
      fontSize: 24,
      color: "#222222",
    });
    d = patchMenuBrandStyleForDevice(d, "blk-brand", "mobile", { fontSize: 12 });
    expect(
      (firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).responsive?.mobile?.style
    ).toEqual({
      fontSize: 12,
    });
    expect(hasMenuBrandStyleOverride(firstBlock(d), "mobile")).toBe(true);
    expect(hasMenuBrandStyleOverride(firstBlock(d), "tablet")).toBe(false);
    expect(hasMenuBrandStyleOverride(firstBlock(d))).toBe(true);
  });

  test("undefined patch value deletes the key; readOverrideValue is RAW hasOwnProperty", () => {
    let d = patchMenuBrandStyleForDevice(base(), "blk-brand", "mobile", {
      fontSize: 12,
      color: "#333333",
    });
    expect(readMenuBrandStyleOverrideValue(firstBlock(d), "mobile", "fontSize")).toBe(12);
    d = patchMenuBrandStyleForDevice(d, "blk-brand", "mobile", { fontSize: undefined });
    expect(readMenuBrandStyleOverrideValue(firstBlock(d), "mobile", "fontSize")).toBeUndefined();
    expect(
      (firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).responsive?.mobile?.style
    ).toEqual({
      color: "#333333",
    });
  });

  test("clear prunes style ⇒ override ⇒ responsive to byte-identical legacy shape", () => {
    const legacy = base();
    let d = patchMenuBrandStyleForDevice(legacy, "blk-brand", "tablet", { fontSize: 18 });
    d = clearMenuBrandStyleOverride(d, "blk-brand", "tablet", "fontSize");
    expect(d).toEqual(legacy);
    expect((firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).responsive).toBeUndefined();
  });

  test("patch on a non-brand block ⇒ identity", () => {
    const nav = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    expect(patchMenuBrandStyleForDevice(nav, "blk-nav", "mobile", { fontSize: 12 })).toEqual(nav);
  });
});

describe("menuDocumentV2 nav-level resolve/deep-merge (TASK-504-01)", () => {
  test("resolveMenuSectionAppearanceForDevice DEEP-merges levelStyles per level per field", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { fontSize: 16, linkColor: "#111111" } } })], {
        responsive: { mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } } },
      })
    );
    const section = firstSection(d);
    // override field wins, unset field inherits desktop:
    expect(resolveMenuSectionAppearanceForDevice(section, "mobile").navProps.levelStyles).toEqual({
      1: { fontSize: 12, linkColor: "#111111" },
    });
    // desktop unchanged; tablet has no override ⇒ inherits desktop:
    expect(resolveMenuSectionAppearanceForDevice(section, "desktop").navProps.levelStyles).toEqual({
      1: { fontSize: 16, linkColor: "#111111" },
    });
    expect(resolveMenuSectionAppearanceForDevice(section, "tablet").navProps.levelStyles).toEqual({
      1: { fontSize: 16, linkColor: "#111111" },
    });
  });

  test("resolveMenuNavLevelStyle single-level: desktop base; device ⊕ delta; mobile ≠ tablet", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { fontSize: 16 }, 2: { linkColor: "#222222" } } })], {
        responsive: {
          tablet: { navProps: { levelStyles: { 1: { fontSize: 18 } } } },
          mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } },
        },
      })
    );
    const section = firstSection(d);
    expect(resolveMenuNavLevelStyle(section, "desktop", 1)).toEqual({ fontSize: 16 });
    expect(resolveMenuNavLevelStyle(section, "tablet", 1)).toEqual({ fontSize: 18 });
    expect(resolveMenuNavLevelStyle(section, "mobile", 1)).toEqual({ fontSize: 12 });
    expect(resolveMenuNavLevelStyle(section, "mobile", 2)).toEqual({ linkColor: "#222222" });
  });
});

describe("menuDocumentV2 patch/clear nav-level style per device (TASK-504-01)", () => {
  const base = () =>
    normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { fontSize: 16 } } })]));

  test("desktop writes nav block props.levelStyles[level]", () => {
    const d0 = base();
    const d = patchMenuNavLevelStyleForDevice(d0, d0.sections[0]!.id, "desktop", 1, {
      linkColor: "#111111",
    });
    expect(
      (firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>).props.levelStyles
    ).toEqual({
      1: { fontSize: 16, linkColor: "#111111" },
    });
  });

  test("tablet writes responsive[bp].navProps.levelStyles[level]; nested raw read reports Override vs Inherited", () => {
    const d0 = base();
    const d = patchMenuNavLevelStyleForDevice(d0, d0.sections[0]!.id, "mobile", 1, {
      fontSize: 12,
    });
    expect(firstSection(d).responsive?.mobile?.navProps?.levelStyles?.[1]).toEqual({
      fontSize: 12,
    });
    expect(readMenuNavLevelStyleOverrideValue(firstSection(d), "mobile", 1, "fontSize")).toBe(12);
    expect(
      readMenuNavLevelStyleOverrideValue(firstSection(d), "mobile", 1, "linkColor")
    ).toBeUndefined();
  });

  test("clearing ONE nested field DEEP-prunes to legacy shape while a sibling level survives", () => {
    const d0 = base();
    let d = patchMenuNavLevelStyleForDevice(d0, d0.sections[0]!.id, "mobile", 1, { fontSize: 12 });
    d = patchMenuNavLevelStyleForDevice(d, d0.sections[0]!.id, "mobile", 2, {
      linkColor: "#999999",
    });
    d = clearMenuNavLevelStyleOverride(d, d0.sections[0]!.id, "mobile", 1, "fontSize");
    // level-1 field cleared, but level-2 sibling still present ⇒ responsive retained:
    expect(firstSection(d).responsive?.mobile?.navProps?.levelStyles).toEqual({
      2: { linkColor: "#999999" },
    });
    d = clearMenuNavLevelStyleOverride(d, d0.sections[0]!.id, "mobile", 2, "linkColor");
    // now fully pruned ⇒ byte-identical legacy shape (no responsive member):
    expect(firstSection(d).responsive).toBeUndefined();
    expect(d).toEqual(d0);
  });

  test("desktop level-0 scalar overrides still route through patchMenuSectionForDevice (no regression)", () => {
    const d0 = base();
    const d = patchMenuSectionForDevice(d0, d0.sections[0]!.id, "mobile", "navProps", {
      itemGap: 24,
    });
    expect(firstSection(d).responsive?.mobile?.navProps).toEqual({ itemGap: 24 });
  });
});

describe("menuDocumentV2 resolveBrandImageSrc (TASK-504-01 §3a B1)", () => {
  test("resolves the leaf `src` shape; null when absent/unresolvable", () => {
    expect(resolveBrandImageSrc({ src: "/media/logo.png", assetId: "a1", alt: "" })).toBe(
      "/media/logo.png"
    );
    expect(resolveBrandImageSrc({ src: "https://cdn.example.com/l.svg" })).toBe(
      "https://cdn.example.com/l.svg"
    );
    expect(resolveBrandImageSrc({ assetId: "a1", src: null })).toBeNull();
    expect(resolveBrandImageSrc(undefined)).toBeNull();
    expect(resolveBrandImageSrc({ src: "javascript:alert(1)" })).toBeNull();
  });
});

// ============================================================================
// TASK-506-01 — modern fields, F1 base-reset, F2 resolved-default provider
// ============================================================================

// Representative valid value per NEW NavLevelStyle key (fail-closed READ trap:
// each must round-trip AND join exactly one value partition).
const LEVEL_STYLE_NEW_VALUES: Record<string, unknown> = {
  itemDividerShow: true,
  itemDividerColor: "#abcdef",
  itemDividerWidth: 3,
  itemDividerStyle: "dashed",
  indicator: "underline",
  indicatorColor: "#123456",
  indicatorThickness: 4,
  indicatorGrow: true,
  hoverUnderline: true,
  transitionMs: 200,
  hoverLift: 5,
  showCaret: false,
  caretRotateOnOpen: true,
  flyoutAnimation: "slide",
  containerPaddingX: 20,
  containerPaddingY: 16,
  submenuPlacement: "bottom",
};

// Representative valid value per NEW navChrome key (no flyoutAnimation; + pill).
const NAV_CHROME_NEW_VALUES: Record<string, unknown> = {
  navPillBackground: "#eeeeee",
  navPillRadius: 24,
  navPillPaddingX: 12,
  navPillPaddingY: 8,
  itemDividerShow: true,
  itemDividerColor: "#abcdef",
  itemDividerWidth: 3,
  itemDividerStyle: "dotted",
  indicator: "overline",
  indicatorColor: "#123456",
  indicatorThickness: 5,
  indicatorGrow: true,
  hoverUnderline: true,
  transitionMs: 150,
  hoverLift: 4,
  showCaret: true,
  caretRotateOnOpen: true,
};

const navLevelStyleOf = (d: MenuDocumentV2, level: 1 | 2) =>
  (firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>).props.levelStyles?.[level];
const navChromeOf = (d: MenuDocumentV2) =>
  (firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>).props.navChrome;

describe("TASK-506-01 fail-closed READ-trap round-trip (NavLevelStyle new keys)", () => {
  test.each(Object.entries(LEVEL_STYLE_NEW_VALUES))(
    "levelStyles.1.%s round-trips write→read without dropping siblings",
    (key, value) => {
      const input = doc([navBlock({ levelStyles: { 1: { [key]: value, fontSize: 16 } } })]);
      const out = normalizeMenuDocumentV2ForWrite(input);
      expect(navLevelStyleOf(out, 1)).toEqual({ [key]: value, fontSize: 16 });
      // stored read is idempotent (proves no silent whole-record degrade):
      expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
      expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    }
  );
});

describe("TASK-506-01 fail-closed READ-trap round-trip (navChrome new keys)", () => {
  test.each(Object.entries(NAV_CHROME_NEW_VALUES))(
    "navChrome.%s round-trips write→read without dropping siblings",
    (key, value) => {
      // Sibling must never collide with the tested key (all navChrome keys are new):
      const siblingKey = key === "showCaret" ? "itemDividerShow" : "showCaret";
      const input = doc([navBlock({ navChrome: { [key]: value, [siblingKey]: true } })]);
      const out = normalizeMenuDocumentV2ForWrite(input);
      expect(navChromeOf(out)).toEqual({ [key]: value, [siblingKey]: true });
      expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
      expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    }
  );

  test("a stored doc carrying the whole navChrome set survives read intact", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ navChrome: NAV_CHROME_NEW_VALUES })])
    );
    expect(navChromeOf(out)).toEqual(NAV_CHROME_NEW_VALUES);
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });
});

// ============================================================================
// TASK-508-01 — linkAlign (NavLevelStyle) + submenuDirection/submenuMode (navChrome)
// ============================================================================

describe("TASK-508-01 fail-closed READ-trap round-trip (new keys)", () => {
  // R1(b): linkAlign on BOTH dropdown levels (survives read, siblings intact).
  test.each([1, 2] as const)("levelStyles.%s.linkAlign round-trips write→read", (level) => {
    const input = doc([
      navBlock({ levelStyles: { [level]: { linkAlign: "center", fontSize: 16 } } }),
    ]);
    const out = normalizeMenuDocumentV2ForWrite(input);
    expect(navLevelStyleOf(out, level)).toEqual({ linkAlign: "center", fontSize: 16 });
    // idempotent stored read ⇒ no silent whole-record degrade:
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
  });

  // R3a/R3b: submenuDirection + submenuMode on navChrome (base-only nav-global keys).
  test.each([
    ["submenuDirection", "up"],
    ["submenuDirection", "left"],
    ["submenuMode", "accordion"],
  ] as const)("navChrome.%s=%s round-trips write→read without dropping siblings", (key, value) => {
    const input = doc([navBlock({ navChrome: { [key]: value, showCaret: true } })]);
    const out = normalizeMenuDocumentV2ForWrite(input);
    expect(navChromeOf(out)).toEqual({ [key]: value, showCaret: true });
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
  });

  test("submenuDirection + submenuMode coexist on one navChrome record", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ navChrome: { submenuDirection: "down", submenuMode: "flyout" } })])
    );
    expect(navChromeOf(out)).toEqual({ submenuDirection: "down", submenuMode: "flyout" });
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });
});

describe("TASK-508-01 reject-unknown KEY throws with exact path", () => {
  test("unknown key under levelStyles still throws (linkAlign allowlist did not widen the guard)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { bogusAlign: 1 } } })])),
      "document.sections[0].blocks[0].props.levelStyles.1.bogusAlign"
    );
  });
  test("unknown key under navChrome still throws", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { submenuFoo: "down" } })])),
      "document.sections[0].blocks[0].props.navChrome.submenuFoo"
    );
  });
});

describe("TASK-508-01 fail-soft VALUE omit (bad enum ⇒ OMIT, siblings survive, prune-empty)", () => {
  test("linkAlign:'top' OMITTED, sibling survives", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { linkAlign: "top", fontSize: 16 } } })])
    );
    expect(navLevelStyleOf(out, 1)).toEqual({ fontSize: 16 });
  });
  test("submenuDirection:'sideways' / submenuMode:'drawer' OMITTED, sibling survives", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          navChrome: { submenuDirection: "sideways", submenuMode: "drawer", showCaret: true },
        }),
      ])
    );
    expect(navChromeOf(out)).toEqual({ showCaret: true });
  });
  test("a navChrome carrying ONLY bad new values prunes to undefined (byte-identical to never-set)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ navChrome: { submenuDirection: "sideways", submenuMode: "drawer" } })])
    );
    expect(navChromeOf(out)).toBeUndefined();
    expect(
      "navChrome" in (firstBlock(out) as Extract<MenuBlockV2, { type: "nav-items" }>).props
    ).toBe(false);
  });
  test("a levelStyle carrying ONLY a bad linkAlign prunes to undefined", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { linkAlign: "top" } } })])
    );
    expect(navLevelStyleOf(out, 1)).toBeUndefined();
  });
});

describe("TASK-508-01 no schemaVersion bump + legacy byte-identity", () => {
  test("schemaVersion stays 1 after normalization", () => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    expect(out.schemaVersion).toBe(MENU_DOCUMENT_SCHEMA_VERSION);
    expect(MENU_DOCUMENT_SCHEMA_VERSION).toBe(1);
  });
  test("a legacy doc WITHOUT any new field normalizes byte-unchanged", () => {
    const legacy = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ itemGap: 8, levelStyles: { 1: { fontSize: 16 } } })])
    );
    expect(normalizeMenuDocumentV2ForWrite(legacy)).toEqual(legacy);
    expect(normalizeStoredMenuDocumentV2ForRead(legacy)).toEqual(legacy);
  });
});

describe("TASK-506-01 reject-unknown KEY throws with exact path", () => {
  test("base navChrome unknown key", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { bogus: 1 } })])),
      "document.sections[0].blocks[0].props.navChrome.bogus"
    );
  });
  test("flyoutAnimation is NOT a navChrome key (levels-1/2 only) ⇒ reject", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock({ navChrome: { flyoutAnimation: "fade" } })])
        ),
      "document.sections[0].blocks[0].props.navChrome.flyoutAnimation"
    );
  });
  test("base levelStyles unknown modern key", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { bogus: 1 } } })])),
      "document.sections[0].blocks[0].props.levelStyles.1.bogus"
    );
  });
  test("per-device responsive navChrome unknown key (with .navProps. prefix)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock()], { responsive: { mobile: { navProps: { navChrome: { bogus: 1 } } } } })
        ),
      "document.sections[0].responsive.mobile.navProps.navChrome.bogus"
    );
  });
});

describe("TASK-506-01 fail-soft VALUE omit (new partitions)", () => {
  test("bad enum / non-boolean bool / non-finite number / bad color OMITTED, siblings intact", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          levelStyles: {
            1: {
              indicator: "blink", // bad enum ⇒ omit
              showCaret: "yes", // non-boolean ⇒ omit
              indicatorThickness: Number.NaN, // non-finite ⇒ omit
              itemDividerColor: "not-a-color", // bad color ⇒ omit
              fontSize: 16, // valid sibling survives
            },
          },
        }),
      ])
    );
    expect(navLevelStyleOf(out, 1)).toEqual({ fontSize: 16 });
  });
});

describe("TASK-506-01 clamp bounds (new numerics, round + clamp)", () => {
  const clampLevel = (key: string, value: number) => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { [key]: value } } })])
    );
    return (navLevelStyleOf(out, 1) as Record<string, unknown> | undefined)?.[key];
  };
  const clampChrome = (key: string, value: number) => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { [key]: value } })]));
    return (navChromeOf(out) as Record<string, unknown> | undefined)?.[key];
  };
  test("itemDividerWidth 0→1 / 99→8", () => {
    expect(clampLevel("itemDividerWidth", 0)).toBe(NAV_LEVEL_NUMBER_RANGES.itemDividerWidth.min);
    expect(clampLevel("itemDividerWidth", 99)).toBe(NAV_LEVEL_NUMBER_RANGES.itemDividerWidth.max);
  });
  test("indicatorThickness 0→1 / 9→6", () => {
    expect(clampLevel("indicatorThickness", 0)).toBe(1);
    expect(clampLevel("indicatorThickness", 9)).toBe(6);
  });
  test("transitionMs -5→0 / 999→400", () => {
    expect(clampLevel("transitionMs", -5)).toBe(0);
    expect(clampLevel("transitionMs", 999)).toBe(400);
  });
  test("hoverLift -1→0 / 20→8", () => {
    expect(clampLevel("hoverLift", -1)).toBe(0);
    expect(clampLevel("hoverLift", 20)).toBe(8);
  });
  test("containerPaddingX/Y clamp", () => {
    expect(clampLevel("containerPaddingX", 99)).toBe(40);
    expect(clampLevel("containerPaddingY", 99)).toBe(32);
  });
  test("navPill radius/paddingX/paddingY clamp (navChrome table)", () => {
    expect(clampChrome("navPillRadius", 99)).toBe(NAV_CHROME_NUMBER_RANGES.navPillRadius.max);
    expect(clampChrome("navPillPaddingX", 99)).toBe(40);
    expect(clampChrome("navPillPaddingY", 99)).toBe(32);
  });
});

describe("TASK-506-01 navChrome split byte-identity", () => {
  test("absent navChrome ⇒ bare base (byte-identical to pre-506)", () => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    expect((firstBlock(out) as Extract<MenuBlockV2, { type: "nav-items" }>).props).toEqual({
      itemGap: 8,
    });
  });
  test("empty navChrome object ⇒ pruned, NO member", () => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: {} })]));
    expect(navChromeOf(out)).toBeUndefined();
    expect(
      "navChrome" in (firstBlock(out) as Extract<MenuBlockV2, { type: "nav-items" }>).props
    ).toBe(false);
  });
});

describe("TASK-506-01 F1 base-clear byte-identity per surface", () => {
  test("clearMenuNavLevelStyleBase lands byte-identical to never-authored", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { fontSize: 16 } } })])
    );
    const id = d0.sections[0]!.id;
    const authored = patchMenuNavLevelStyleForDevice(d0, id, "desktop", 1, {
      indicator: "underline",
    });
    expect(readMenuNavLevelStyleBaseValue(firstSection(authored), 1, "indicator")).toBe(
      "underline"
    );
    const cleared = clearMenuNavLevelStyleBase(authored, id, 1, "indicator");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
  });

  test("clearMenuNavChromeBase prunes props.navChrome → props (byte-identical)", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    const id = d0.sections[0]!.id;
    const authored = patchMenuNavChromeForDevice(d0, id, "desktop", { navPillRadius: 20 });
    expect(readMenuNavChromeBaseValue(firstSection(authored), "navPillRadius")).toBe(20);
    const cleared = clearMenuNavChromeBase(authored, id, "navPillRadius");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
    expect(
      "navChrome" in (firstBlock(cleared) as Extract<MenuBlockV2, { type: "nav-items" }>).props
    ).toBe(false);
  });

  test("clearMenuSectionBase clears a flat level-0 scalar to legacy shape", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    const id = d0.sections[0]!.id;
    const authored = patchMenuSectionForDevice(d0, id, "desktop", "navProps", { linkPaddingX: 20 });
    expect(readMenuSectionBaseValue(firstSection(authored), "navProps", "linkPaddingX")).toBe(20);
    const cleared = clearMenuSectionBase(authored, id, "navProps", "linkPaddingX");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
  });

  test("clearMenuBrandStyleBase prunes props.style → props (byte-identical)", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([brandBlock()]));
    const authored = patchMenuBrandStyleForDevice(d0, "blk-brand", "desktop", { fontSize: 20 });
    expect(readMenuBrandStyleBaseValue(firstBlock(authored), "fontSize")).toBe(20);
    const cleared = clearMenuBrandStyleBase(authored, "blk-brand", "fontSize");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
  });

  test("clearing a never-authored base field ⇒ identity", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([navBlock()]));
    const id = d0.sections[0]!.id;
    expect(clearMenuNavChromeBase(d0, id, "navPillRadius")).toEqual(d0);
    expect(clearMenuNavLevelStyleBase(d0, id, 1, "indicator")).toEqual(d0);
  });
});

describe("TASK-506-01 per-device navChrome delta + resolve", () => {
  const base = () =>
    normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { navPillRadius: 20 } })]));

  test("tablet/mobile write only their own sparse navChrome record; mobile never reads tablet", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    let d = patchMenuNavChromeForDevice(d0, id, "tablet", { indicator: "underline" });
    d = patchMenuNavChromeForDevice(d, id, "mobile", { indicator: "overline" });
    expect(firstSection(d).responsive?.tablet?.navProps?.navChrome).toEqual({
      indicator: "underline",
    });
    expect(firstSection(d).responsive?.mobile?.navProps?.navChrome).toEqual({
      indicator: "overline",
    });
    // resolve merges base ⊕ own delta only:
    expect(resolveMenuNavChrome(firstSection(d), "desktop")).toEqual({ navPillRadius: 20 });
    expect(resolveMenuNavChrome(firstSection(d), "tablet")).toEqual({
      navPillRadius: 20,
      indicator: "underline",
    });
    expect(resolveMenuNavChrome(firstSection(d), "mobile")).toEqual({
      navPillRadius: 20,
      indicator: "overline",
    });
    expect(readMenuNavChromeOverrideValue(firstSection(d), "mobile", "indicator")).toBe("overline");
    expect(
      readMenuNavChromeOverrideValue(firstSection(d), "mobile", "navPillRadius")
    ).toBeUndefined();
  });

  test("resolveMenuSectionAppearanceForDevice carries navChrome forward (deep-merge)", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    const d = patchMenuNavChromeForDevice(d0, id, "tablet", { indicator: "underline" });
    const resolved = resolveMenuSectionAppearanceForDevice(firstSection(d), "tablet");
    expect(resolved.navProps.navChrome).toEqual({ navPillRadius: 20, indicator: "underline" });
  });

  test("clearMenuNavChromeOverride deep-prunes tablet/mobile to legacy shape", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    let d = patchMenuNavChromeForDevice(d0, id, "mobile", { indicator: "overline" });
    d = clearMenuNavChromeOverride(d, id, "mobile", "indicator");
    expect(firstSection(d).responsive).toBeUndefined();
    expect(d).toEqual(d0);
  });

  test("per-device navChrome round-trips through the write normalizer", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    const d = patchMenuNavChromeForDevice(d0, id, "mobile", { navPillPaddingX: 12 });
    expect(normalizeMenuDocumentV2ForWrite(d)).toEqual(d);
    expect(normalizeStoredMenuDocumentV2ForRead(d)).toEqual(d);
  });
});

describe("TASK-506-01 F2 resolveMenuControlDefault source labels", () => {
  const sectionOf = (navProps: Record<string, unknown> = {}, extra?: Record<string, unknown>) =>
    firstSection(normalizeMenuDocumentV2ForWrite(doc([navBlock(navProps)], extra)));

  test("level 0 unset ⇒ theme / base-sheet defaults", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", 0, "fontSize")).toEqual({
      value: NAV_FONT_SIZE_INHERITED,
      sourceLabel: `Inherited from theme (${NAV_FONT_SIZE_INHERITED}px)`,
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "paddingX")).toEqual({
      value: MENU_SHELL_DEFAULT_LINK_PX,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_PX}px`,
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "paddingY").value).toBe(
      MENU_SHELL_DEFAULT_LINK_PY
    );
    expect(resolveMenuControlDefault(s, "desktop", 0, "radius").value).toBe(
      MENU_SHELL_DEFAULT_LINK_RADIUS
    );
  });

  test("modern enum/bool defaults resolve from NAV_CHROME_DEFAULTS", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", 0, "submenuPlacement")).toEqual({
      value: NAV_CHROME_DEFAULTS.submenuPlacement,
      sourceLabel: "Default (Right)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "showCaret")).toEqual({
      value: true,
      sourceLabel: "Default (On)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "indicator").sourceLabel).toBe(
      "Default (None)"
    );
    expect(resolveMenuControlDefault(s, "desktop", 0, "itemDividerShow").sourceLabel).toBe(
      "Default (Off)"
    );
  });

  test("TASK-508-01 R3a/R3b/R1(b): new-enum hint entries resolve from NAV_CHROME_DEFAULTS", () => {
    const s = sectionOf();
    // R3a submenuDirection + R3b submenuMode are navChrome (level-0) keys:
    expect(resolveMenuControlDefault(s, "desktop", 0, "submenuDirection")).toEqual({
      value: "down",
      sourceLabel: "Default (Down)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "submenuMode")).toEqual({
      value: "flyout",
      sourceLabel: "Default (Flyout)",
    });
    // R1(b) linkAlign is a LEVEL key — NAV_CHROME_DEFAULTS serves it via the
    // level-agnostic hasOwnProperty branch (levels 1/2 fall through to it):
    expect(resolveMenuControlDefault(s, "desktop", 1, "linkAlign")).toEqual({
      value: "left",
      sourceLabel: "Default (Left)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 2, "linkAlign")).toEqual({
      value: "left",
      sourceLabel: "Default (Left)",
    });
  });

  test("GATED present-only numerics ⇒ value undefined + Off/Not applied (NEVER range.min)", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", 1, "indicatorThickness")).toEqual({
      value: undefined,
      sourceLabel: "Off",
    });
    // TASK-508-01 R1(a): containerPaddingX/Y are NO LONGER gated — asserted in the
    // "R1(a) real container defaults" test below. The level-0 PILL numerics stay gated
    // (no base-sheet default when unset — no element painted):
    for (const key of ["navPillRadius", "navPillPaddingX", "navPillPaddingY"]) {
      expect(resolveMenuControlDefault(s, "desktop", 0, key)).toEqual({
        value: undefined,
        sourceLabel: "Not applied",
      });
    }
    // and definitely not the misleading range.min:
    expect(resolveMenuControlDefault(s, "desktop", 1, "itemDividerWidth").value).not.toBe(
      NAV_LEVEL_NUMBER_RANGES.itemDividerWidth.min
    );
  });

  test("TASK-508-01 R1(a): container controls resolve REAL base-sheet defaults (180 / 6), NOT 'Not applied'", () => {
    const s = sectionOf();
    // minWidth ⇒ 180px (mirrors .site-nav-sublist{min-width:180px}):
    expect(resolveMenuControlDefault(s, "desktop", 1, "minWidth")).toEqual({
      value: MENU_SHELL_SUBLIST_MIN_WIDTH,
      sourceLabel: `Default ${MENU_SHELL_SUBLIST_MIN_WIDTH}px`,
    });
    // containerPaddingX/Y ⇒ 6px (mirrors .site-nav-sublist{padding:6px}):
    for (const key of ["containerPaddingX", "containerPaddingY"]) {
      const r = resolveMenuControlDefault(s, "desktop", 1, key);
      expect(r).toEqual({
        value: MENU_SHELL_SUBLIST_PADDING,
        sourceLabel: `Default ${MENU_SHELL_SUBLIST_PADDING}px`,
      });
      // no longer the misleading "Not applied" / undefined thumb:
      expect(r.sourceLabel).not.toBe("Not applied");
      expect(r.value).not.toBeUndefined();
    }
  });

  test("level 2 unset WITH level 1 SET ⇒ Inherits level 1 (resolved number)", () => {
    const s = sectionOf({ levelStyles: { 1: { paddingX: 14 } } });
    expect(resolveMenuControlDefault(s, "desktop", 2, "paddingX")).toEqual({
      value: 14,
      sourceLabel: "Inherits level 1 (14px)",
    });
  });

  test("compound: level 2 unset WHILE level 1 ALSO unset ⇒ falls through, NEVER 'level 1 (undefined)'", () => {
    // nav base linkPaddingX set ⇒ falls to level 0:
    const s0 = sectionOf({ linkPaddingX: 10 });
    expect(resolveMenuControlDefault(s0, "desktop", 2, "paddingX")).toEqual({
      value: 10,
      sourceLabel: "Inherits level 0 (10px)",
    });
    // nav base ALSO unset ⇒ theme default, value defined (not undefined):
    const s1 = sectionOf();
    const r = resolveMenuControlDefault(s1, "desktop", 2, "paddingX");
    expect(r.value).toBe(MENU_SHELL_DEFAULT_LINK_PX);
    expect(r.sourceLabel).not.toContain("(undefined)");
  });

  test("tablet/mobile unset ⇒ Inherited from desktop (resolved desktop value)", () => {
    // layout base is section-scoped ⇒ reachable:
    const s = sectionOf({}, { layout: { paddingX: 30 } });
    expect(resolveMenuControlDefault(s, "tablet", "base", "paddingX")).toEqual({
      value: 30,
      sourceLabel: "Inherited from desktop",
    });
    // level field with a desktop value:
    const s2 = sectionOf({ levelStyles: { 2: { paddingX: 18 } } });
    expect(resolveMenuControlDefault(s2, "mobile", 2, "paddingX")).toEqual({
      value: 18,
      sourceLabel: "Inherited from desktop",
    });
  });

  test("compound device×level: level-2 unset on tablet WITH desktop-level-2 unset resolves via recursion", () => {
    const s = sectionOf({ levelStyles: { 1: { paddingX: 14 } } });
    const r = resolveMenuControlDefault(s, "tablet", 2, "paddingX");
    // value = resolved shallower (level-1) number; label stays the device-inherit label:
    expect(r.value).toBe(14);
    expect(r.sourceLabel).toBe("Inherited from desktop");
    expect(r.sourceLabel).not.toContain("(undefined)");
  });

  test("brand 'base' key unset on tablet/mobile ⇒ value undefined, NO 'Inherited from desktop'", () => {
    const s = sectionOf();
    const r = resolveMenuControlDefault(s, "tablet", "base", "color");
    expect(r.value).toBeUndefined();
    expect(r.sourceLabel).not.toBe("Inherited from desktop");
  });

  test("layout 'base' key unset on desktop ⇒ theme default from SHELL_APPEARANCE_DEFAULTS", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", "base", "paddingX")).toEqual({
      value: 24,
      sourceLabel: "Default 24px",
    });
  });

  test("provider never mutates the doc", () => {
    const s = sectionOf({ levelStyles: { 1: { paddingX: 14 } } });
    const before = JSON.stringify(s);
    resolveMenuControlDefault(s, "tablet", 2, "paddingX");
    expect(JSON.stringify(s)).toBe(before);
  });
});

// --- TASK-520-01: menu-bar scrolled/radius/custom-shadow + brand icon/combo ---

const layoutOf = (out: MenuDocumentV2): Record<string, unknown> =>
  (out.sections[0]?.layout ?? {}) as Record<string, unknown>;
const brandPropsOf = (out: MenuDocumentV2): Record<string, unknown> =>
  (out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props;

describe("TASK-520-01-L01 menu-bar layout scrolled variants + radius", () => {
  test("round-trips radius + scrolled color/width/shadow-enum keys", () => {
    const layout = {
      radius: 18,
      surfaceColorScrolled: "rgba(8,17,31,.84)",
      borderColorScrolled: "#ffffff2e",
      borderWidthScrolled: 2,
      shadowScrolled: "md",
    };
    const out = normalizeMenuDocumentV2ForWrite(doc([], { layout }));
    expect(layoutOf(out)).toEqual({
      ...layout,
      surfaceColorScrolled: "rgba(8, 17, 31, 0.84)",
    });
    // idempotent round-trip
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
  });

  test("rejects an unknown menu-bar layout key with a machine-readable path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([], { layout: { bogus: 1 } })),
      "document.sections[0].layout.bogus"
    );
  });

  test("fails soft on bad values, clamps borderWidthScrolled, keeps siblings", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], {
        layout: {
          radius: "x",
          shadowScrolled: "xl",
          surfaceColorScrolled: "url(x)",
          borderWidthScrolled: 999,
          borderColorScrolled: "#ffffff2e",
        },
      })
    );
    expect(layoutOf(out)).toEqual({ borderWidthScrolled: 8, borderColorScrolled: "#ffffff2e" });
  });

  test("present-only: an appearance-only layout is byte-identical (no extra keys)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], { layout: { surfaceColor: "#101828", sticky: true } })
    );
    expect(layoutOf(out)).toEqual({ surfaceColor: "#101828", sticky: true });
  });

  test("radius is per-device via responsive.mobile.layout and merges on resolve", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], { layout: { radius: 18 }, responsive: { mobile: { layout: { radius: 8 } } } })
    );
    expect(layoutOf(out).radius).toBe(18);
    const resolved = resolveMenuSectionAppearanceForDevice(
      out.sections[0] as MenuSectionV2,
      "mobile"
    );
    expect((resolved.layout as Record<string, unknown>).radius).toBe(8);
  });

  test("MENU_BAR_LAYOUT_NUMBER_RANGES.radius bounds are exported for the slider", () => {
    expect(MENU_BAR_LAYOUT_NUMBER_RANGES.radius).toEqual({ min: 0, max: 40 });
  });
});

describe("TASK-520-01-L02 normalizeMenuBoxShadowValue (security-critical whitelist)", () => {
  test("accepts the owner token + hex8 + inset + 2-layer with canonical color bytes", () => {
    expect(normalizeMenuBoxShadowValue("0 18px 50px rgba(0,0,0,.24)")).toBe(
      "0 18px 50px rgba(0, 0, 0, 0.24)"
    );
    expect(normalizeMenuBoxShadowValue("0 8px 24px #0000003d")).toBe("0 8px 24px #0000003d");
    expect(normalizeMenuBoxShadowValue("inset 0 1px 2px #00000022")).toBe(
      "inset 0 1px 2px #00000022"
    );
    expect(normalizeMenuBoxShadowValue("0 2px 4px #000, 0 8px 16px #0003")).toBe(
      "0 2px 4px #000, 0 8px 16px #0003"
    );
  });

  test("keeps a color function with internal spaces as ONE token (bracket-aware)", () => {
    expect(normalizeMenuBoxShadowValue("0 18px 50px rgba(8, 17, 31, .84)")).toBe(
      "0 18px 50px rgba(8, 17, 31, 0.84)"
    );
  });

  test("passes each untouched embedded color token through the shared raw-byte boundary", () => {
    expect(shadowColorAtCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(shadowColorOverCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

    for (const colorCase of shadowColorBoundaryCases) {
      const expected = colorCase.expected === null ? null : `0 0 ${colorCase.expected}`;
      expect(normalizeMenuBoxShadowValue(`0 0 ${colorCase.input}`), colorCase.id).toBe(expected);
    }
  });

  test("rejects injection / escape / non-grammar inputs (→ null)", () => {
    for (const bad of [
      "0 0 10px red;} body{display:none}",
      "0 0 5px url(x)",
      "0 0 5px expression(alert(1))",
      "0 0 5px var(--x)",
      "0 0 5px calc(1px)",
      "<script>",
      "0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000",
      "10px",
      "foo bar baz #fff",
      "0 0 5px red",
      `0 0 ${"1".repeat(210)}px #000`,
      42,
      null,
    ]) {
      expect(normalizeMenuBoxShadowValue(bad)).toBeNull();
    }
  });

  test("shadowCustom* round-trip via the document; invalid omitted, siblings survive", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], {
        layout: {
          shadow: "sm",
          shadowCustom: "0 18px 50px rgba(0,0,0,.24)",
          shadowCustomScrolled: "0 8px 24px rgba(0,0,0,.3)",
        },
      })
    );
    expect(layoutOf(out)).toEqual({
      shadow: "sm",
      shadowCustom: "0 18px 50px rgba(0, 0, 0, 0.24)",
      shadowCustomScrolled: "0 8px 24px rgba(0, 0, 0, 0.3)",
    });
    const bad = normalizeMenuDocumentV2ForWrite(
      doc([], { layout: { radius: 6, shadowCustom: "0 0 10px red;}body{}" } })
    );
    expect(layoutOf(bad)).toEqual({ radius: 6 });
  });
});

describe("TASK-520-01-L03 brand icon mode + graphic-with-text combo", () => {
  const brandDoc = (props: Record<string, unknown>) => doc([{ type: "brand", props }]);

  test("icon mode round-trips with icon + showText + icon style", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({
        mode: "icon",
        href: "/",
        icon: "house",
        showText: true,
        style: { iconColor: "#f7fbffcc", iconSize: 28 },
      })
    );
    expect(brandPropsOf(out)).toEqual({
      mode: "icon",
      href: "/",
      icon: "house",
      showText: true,
      style: { iconColor: "#f7fbffcc", iconSize: 28 },
    });
  });

  test("image + showText combo round-trips", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "image", href: "/", showText: true })
    );
    expect(brandPropsOf(out)).toEqual({ mode: "image", href: "/", showText: true });
  });

  test("icon name is lowercased; bad name / bad color / small size fail soft", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({
        mode: "icon",
        href: "/",
        icon: "Arrow-Right",
        style: { iconColor: "url(x)", iconSize: 5 },
      })
    );
    expect(brandPropsOf(out)).toEqual({
      mode: "icon",
      href: "/",
      icon: "arrow-right",
      style: { iconSize: 12 },
    });
  });

  test("invalid icon name is omitted (render falls through)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "icon", href: "/", icon: "../../etc" })
    );
    expect(brandPropsOf(out)).toEqual({ mode: "icon", href: "/" });
  });

  test("showText present-only: false is dropped, non-boolean throws", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "text", href: "/", showText: false })
    );
    expect(brandPropsOf(out)).toEqual({ mode: "text", href: "/" });
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/", showText: "yes" })),
      "document.sections[0].blocks[0].props.showText"
    );
  });

  test("bad mode throws; unknown brand style key throws", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "svg", href: "/" })),
      "document.sections[0].blocks[0].props.mode"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          brandDoc({ mode: "icon", href: "/", style: { bogusStyle: 1 } })
        ),
      "document.sections[0].blocks[0].props.style.bogusStyle"
    );
  });

  test("back-compat: legacy text/image brand round-trips byte-identical", () => {
    const outText = normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/" }));
    expect(brandPropsOf(outText)).toEqual({ mode: "text", href: "/" });
    const outImage = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "image", href: "/", image: { src: "/logo.png", alt: "Logo" } })
    );
    const p = brandPropsOf(outImage);
    expect(p.mode).toBe("image");
    expect(p.icon).toBeUndefined();
    expect(p.showText).toBeUndefined();
    expect(BRAND_STYLE_NUMBER_RANGES.iconSize).toEqual({ min: 12, max: 64 });
  });
});

// Type-level anchors so a signature drift is caught at compile-time.
const _levelKeyAnchor: keyof NavLevelStyle = "flyoutAnimation";
const _chromeKeyAnchor: keyof NavChromeStyle = "navPillBackground";
void _levelKeyAnchor;
void _chromeKeyAnchor;
