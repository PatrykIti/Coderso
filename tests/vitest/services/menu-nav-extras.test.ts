import { describe, expect, test } from "vitest";

import {
  buildMenuDesignDocument,
  collectMenuDesignExtras,
  MENU_DESIGN_EXTRAS_SECTION_ID,
  MENU_DESIGN_EXTRAS_SECTION_NAME,
  menuDesignEditorPalette,
  resolveMenuDesignDraft,
} from "../../../core/services/menus/menuDesignDocument";
import {
  isMenuNavExtrasError,
  MENU_NAV_EXTRAS_MAX_BLOCKS,
  menuNavExtrasAllowedBlockTypes,
  normalizeMenuNavExtras,
  resolveStoredMenuNavExtras,
  sanitizeStoredMenuNavExtras,
} from "../../../core/services/menus/menuNavExtras";
import {
  createPageBlockV2,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageSectionCapabilities,
} from "../../../core/services/pages/pageDocumentV2";
import { buildSiteShellCss, buildSiteShellPreviewCss } from "../../../core/site/siteShellCss";

const ctaButton = (id = "blk-cta") =>
  createPageBlockV2("button", {
    id,
    props: { label: "Book now", href: "/contact", variant: "primary", size: "md" },
  });

const logoImage = (id = "blk-logo") =>
  createPageBlockV2("image", {
    id,
    props: { src: "/logo.png", alt: "Logo" },
  });

describe("normalizeMenuNavExtras (strict write path)", () => {
  test("accepts allowlisted blocks and round-trips through the page block schema", () => {
    const normalized = normalizeMenuNavExtras([ctaButton(), logoImage()]);
    expect(normalized.map((block) => block.type)).toEqual(["button", "image"]);
    expect(normalized[0]?.props.label).toBe("Book now");
    expect(normalized[1]?.props.src).toBe("/logo.png");
  });

  test("rejects non-arrays with menu_nav_extras_invalid", () => {
    for (const value of [null, undefined, "blocks", { blocks: [] }, 7]) {
      try {
        normalizeMenuNavExtras(value);
        expect.unreachable("expected menu_nav_extras_invalid");
      } catch (error) {
        expect(isMenuNavExtrasError(error)).toBe(true);
      }
    }
  });

  test("rejects disallowed block types with the offending field", () => {
    const heading = createPageBlockV2("heading", { id: "blk-heading" });
    try {
      normalizeMenuNavExtras([ctaButton(), heading]);
      expect.unreachable("expected menu_nav_extras_invalid");
    } catch (error) {
      expect(isMenuNavExtrasError(error)).toBe(true);
      if (isMenuNavExtrasError(error)) {
        expect(error.field).toBe("extras[1].type");
      }
    }
  });

  test("rejects schema-invalid blocks and oversized lists", () => {
    expect(() => normalizeMenuNavExtras([{ type: "button", bogus: true }])).toThrowError();
    const tooMany = Array.from({ length: MENU_NAV_EXTRAS_MAX_BLOCKS + 1 }, (_, index) =>
      ctaButton(`blk-cta-${index}`)
    );
    try {
      normalizeMenuNavExtras(tooMany);
      expect.unreachable("expected menu_nav_extras_invalid");
    } catch (error) {
      expect(isMenuNavExtrasError(error)).toBe(true);
    }
  });
});

describe("stored extras sanitizers (fail-closed read path)", () => {
  test("unreadable stored values resolve to an empty slot", () => {
    expect(sanitizeStoredMenuNavExtras("nope")).toEqual([]);
    expect(sanitizeStoredMenuNavExtras(null)).toEqual([]);
    expect(resolveStoredMenuNavExtras(null)).toEqual([]);
    expect(resolveStoredMenuNavExtras({ extras: "nope" })).toEqual([]);
    expect(resolveStoredMenuNavExtras([])).toEqual([]);
  });

  test("disallowed block types are dropped instead of failing the render", () => {
    const stored = {
      extras: [ctaButton(), createPageBlockV2("heading", { id: "blk-heading" }), logoImage()],
    };
    const resolved = resolveStoredMenuNavExtras(stored);
    expect(resolved.map((block) => block.type)).toEqual(["button", "image"]);
  });
});

describe("menu design document adapter", () => {
  test("builds a single fixed extras section from the stored envelope", () => {
    const document = buildMenuDesignDocument({
      appearance: { surfaceColor: "#0f172a", sticky: true },
      extras: [ctaButton()],
    });
    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.id).toBe(MENU_DESIGN_EXTRAS_SECTION_ID);
    expect(document.sections[0]?.name).toBe(MENU_DESIGN_EXTRAS_SECTION_NAME);
    expect(document.sections[0]?.blocks.map((block) => block.type)).toEqual(["button"]);
    expect(document.settings.menuAppearance).toEqual({ surfaceColor: "#0f172a", sticky: true });
  });

  test("legacy/null settings build an empty design document (fail closed)", () => {
    const document = buildMenuDesignDocument(null);
    expect(document.sections[0]?.blocks).toEqual([]);
    expect(document.settings.menuAppearance).toBeUndefined();
    expect(resolveMenuDesignDraft(document)).toEqual({ appearance: null, extras: [] });
  });

  test("draft resolution round-trips appearance and extras", () => {
    const document = buildMenuDesignDocument({
      appearance: { itemGap: 12 },
      extras: [ctaButton(), logoImage()],
    });
    const draft = resolveMenuDesignDraft(document);
    expect(draft.appearance).toEqual({ itemGap: 12 });
    expect(draft.extras.map((block) => block.type)).toEqual(["button", "image"]);
    expect(collectMenuDesignExtras(document)).toEqual(draft.extras);
  });

  test("an empty appearance object resolves to null (clears to the legacy look)", () => {
    const document = buildMenuDesignDocument(null);
    const withEmpty = {
      ...document,
      settings: { ...document.settings, menuAppearance: {} },
    };
    expect(resolveMenuDesignDraft(withEmpty).appearance).toBeNull();
  });

  test("palette is a narrowing allowlist: extras blocks only, no sections, gated stays gated", () => {
    expect(menuDesignEditorPalette.sections).toEqual([]);
    expect(menuDesignEditorPalette.blocks).toEqual([...menuNavExtrasAllowedBlockTypes]);
    for (const type of menuDesignEditorPalette.blocks) {
      expect(pageBlockCapabilities[type].editorInsertable).toBe(true);
    }
    // The global navigation section is NOT insertable; a palette cannot
    // widen the global capability tables.
    expect(pageSectionCapabilities.navigation.insertable).toBe(false);
  });
});

describe("settings.menuAppearance document vehicle", () => {
  test("write mode validates strictly and read mode sanitizes fail-closed", () => {
    const document = buildMenuDesignDocument(null);
    const written = normalizePageDocumentV2ForWrite({
      ...document,
      settings: { ...document.settings, menuAppearance: { surfaceColor: "transparent" } },
    });
    expect(written.settings.menuAppearance).toEqual({ surfaceColor: "transparent" });

    expect(() =>
      normalizePageDocumentV2ForWrite({
        ...document,
        settings: { ...document.settings, menuAppearance: { surfaceColor: "not-a-color" } },
      })
    ).toThrowError();
    expect(() =>
      normalizePageDocumentV2ForWrite({
        ...document,
        settings: { ...document.settings, menuAppearance: { unknownField: true } },
      })
    ).toThrowError();

    const read = normalizeStoredPageDocumentV2ForRead({
      ...document,
      settings: {
        ...document.settings,
        menuAppearance: { surfaceColor: "not-a-color", itemGap: 12, unknownField: true },
      },
    });
    expect(read.settings.menuAppearance).toEqual({ itemGap: 12 });
  });

  test("absent menuAppearance stays absent (non-destructive for page documents)", () => {
    const document = normalizePageDocumentV2ForWrite(buildMenuDesignDocument(null));
    expect("menuAppearance" in document.settings).toBe(false);
  });
});

describe("buildSiteShellPreviewCss", () => {
  test("flattens the matching breakpoint branch without media queries", () => {
    const desktop = buildSiteShellPreviewCss(null, "desktop");
    const tablet = buildSiteShellPreviewCss(null, "tablet");
    const mobile = buildSiteShellPreviewCss(null, "mobile");

    expect(desktop).not.toContain("@media");
    expect(mobile).not.toContain("@media");
    // Desktop and tablet share the desktop branch (dropdown positioning).
    expect(desktop).toContain(".site-nav-sublist{position:absolute");
    expect(tablet).toBe(desktop);
    // Mobile flattens the disclosure branch so the CSS-only toggle previews.
    expect(mobile).toContain(".site-nav-disclosure{display:block}");
    expect(mobile).toContain(
      ".site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column"
    );
    expect(mobile).not.toContain("position:absolute");
  });

  test("mobile inline mode keeps the link list visible", () => {
    const mobileInline = buildSiteShellPreviewCss({ mobileMode: "inline" }, "mobile");
    expect(mobileInline).not.toContain(".site-nav-disclosure{display:block}");
    expect(mobileInline).not.toContain(".site-nav-list{display:none}");
  });

  test("every preview rule exists verbatim in the public stylesheet", () => {
    const appearance = { surfaceColor: "#0f172a", sticky: true } as const;
    const publicCss = buildSiteShellCss(appearance);
    for (const breakpoint of ["desktop", "mobile"] as const) {
      for (const line of buildSiteShellPreviewCss(appearance, breakpoint).split("\n")) {
        expect(publicCss).toContain(line);
      }
    }
  });
});
