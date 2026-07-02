import { describe, expect, test } from "vitest";

import {
  MENU_DOCUMENT_INVALID,
  MENU_DOCUMENT_SCHEMA_VERSION,
  buildMenuDocumentV2FromLegacy,
  createDefaultMenuDocumentV2,
  isEmptyMenuDocument,
  isMenuDocumentError,
  normalizeMenuDocumentV2ForWrite,
  normalizeStoredMenuDocumentV2ForRead,
  resolvePublishedMenuDocument,
  resolveStoredMenuDocument,
} from "../../../core/services/menus/menuDocumentV2";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";

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
