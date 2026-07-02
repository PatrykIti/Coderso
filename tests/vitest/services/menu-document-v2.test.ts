import { describe, expect, test } from "vitest";

import {
  MENU_BRAND_TEXT_MAX_LENGTH,
  MENU_DOCUMENT_INVALID,
  MENU_DOCUMENT_SCHEMA_VERSION,
  MENU_NAV_DEVICE_DEFINING_KEYS,
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  buildMenuDocumentV2FromLegacy,
  clearMenuBlockVisibilityOverride,
  clearMenuSectionOverride,
  createDefaultMenuDocumentV2,
  hasMenuBlockVisibilityOverride,
  isEmptyMenuDocument,
  isMenuDocumentError,
  normalizeMenuDocumentV2ForWrite,
  normalizeStoredMenuDocumentV2ForRead,
  patchMenuSectionForDevice,
  readMenuSectionOverrideValue,
  resolveMenuBlockVisibleForDevice,
  resolveMenuSectionAppearanceForDevice,
  resolvePublishedMenuDocument,
  resolveStoredMenuDocument,
  setMenuBlockVisibleForDevice,
  type BrandProps,
  type MenuBlockV2,
  type MenuDocumentV2,
  type MenuSectionV2,
} from "../../../core/services/menus/menuDocumentV2";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
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

  test("block overrides carry ONLY visibility — page-shaped props/style groups are rejected (leaf strip trap)", () => {
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
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([
            {
              type: "nav-items",
              props: {},
              responsive: { mobile: { style: { align: "left" } } },
            },
          ])
        ),
      "document.sections[0].blocks[0].responsive.mobile.style"
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
