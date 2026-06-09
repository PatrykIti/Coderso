import { describe, expect, test } from "vitest";
import Ajv from "ajv";

import {
  clearResponsiveOverride,
  createDefaultPageDocumentV2,
  createPageSectionV2,
  isPageDocumentError,
  isLegacyOrVersionlessPageDocument,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageDocumentV2JsonSchema,
  resolvePageDocumentForBreakpoint,
  resolvePageSectionForBreakpoint,
  toPublishedPageDocumentV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const buildDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {
    title: "Homepage",
    description: "Primary landing page",
    image: null,
  },
  settings: {
    template: "page-v2",
    showInNav: true,
    collectionLink: {
      contentTypeId: "projects",
      pageRole: "canonical-list-page",
      listingQueryId: "featured",
      listingTemplateId: null,
    },
  },
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      name: "Hero",
      variant: "split",
      layout: {
        columns: 2,
        align: "center",
        justify: "between",
        maxWidth: 1080,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "sm",
      },
      spacing: {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 32,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "hero",
        startsAt: null,
        endsAt: null,
      },
      responsive: {
        tablet: {
          layout: { columns: 1 },
          spacing: { gap: 20 },
        },
        mobile: {
          layout: { columns: 1 },
          spacing: { paddingLeft: 20, paddingRight: 20 },
          visibility: { visible: false },
        },
      },
      blocks: [
        {
          id: "blk_heading",
          type: "heading",
          props: {
            text: "Build with Coderso",
            level: "h1",
            align: "left",
          },
          visibility: { visible: true },
        },
        {
          id: "blk_cta",
          type: "button",
          props: {
            label: "See projects",
            href: "/projects",
            target: "self",
            variant: "primary",
            size: "md",
          },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

describe("PageDocumentV2", () => {
  test("normalizes a strict v2 Page document without widget block coupling", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());

    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0]?.blocks[0]).toMatchObject({
      id: "blk_heading",
      type: "heading",
      props: {
        text: "Build with Coderso",
        level: "h1",
      },
    });
    expect("blocks" in normalized).toBe(false);
  });

  test("exposes a JSON schema that accepts v2 and rejects v1 blocks payloads", () => {
    const ajv = new Ajv({ allErrors: true, strict: true });
    const validate = ajv.compile(pageDocumentV2JsonSchema);

    expect(validate(buildDocument())).toBe(true);
    expect(validate({ blocks: [] })).toBe(false);
    expect(validate({ schemaVersion: 2, sections: [], extra: true })).toBe(false);
  });

  test("rejects unknown root, section, block, and block prop fields on fresh writes", () => {
    expect(() =>
      normalizePageDocumentV2ForWrite({
        ...buildDocument(),
        unexpected: true,
      })
    ).toThrow("Unknown page document field: unexpected");

    const sectionUnknown = buildDocument();
    sectionUnknown.sections[0] = {
      ...sectionUnknown.sections[0]!,
      extra: "nope",
    } as PageDocumentV2["sections"][number];
    expect(() => normalizePageDocumentV2ForWrite(sectionUnknown)).toThrow(
      "Unknown page document field: sections.0.extra"
    );

    const blockUnknown = buildDocument();
    blockUnknown.sections[0]!.blocks[0] = {
      ...blockUnknown.sections[0]!.blocks[0]!,
      extra: "nope",
    } as PageDocumentV2["sections"][number]["blocks"][number];
    expect(() => normalizePageDocumentV2ForWrite(blockUnknown)).toThrow(
      "Unknown page document field: sections.0.blocks.0.extra"
    );

    const propUnknown = buildDocument();
    propUnknown.sections[0]!.blocks[0]!.props = {
      ...propUnknown.sections[0]!.blocks[0]!.props,
      trackingPixel: "nope",
    };
    expect(() => normalizePageDocumentV2ForWrite(propUnknown)).toThrow(
      "Unknown page document field: sections.0.blocks.0.props.trackingPixel"
    );
  });

  test("rejects fresh legacy/versionless writes and resets stored legacy data for reads", () => {
    expect(() => normalizePageDocumentV2ForWrite({ blocks: [] })).toThrow(
      "Pages require schemaVersion 2 and sections[]."
    );
    expect(isLegacyOrVersionlessPageDocument({ blocks: [] })).toBe(true);
    expect(isLegacyOrVersionlessPageDocument({ schemaVersion: 2, sections: [] })).toBe(false);

    expect(normalizeStoredPageDocumentV2ForRead({ blocks: [] })).toEqual(
      createDefaultPageDocumentV2()
    );
    expect(normalizeStoredPageDocumentV2ForRead({})).toEqual(createDefaultPageDocumentV2());
  });

  test("normalizes corrupt stored revision retention to the documented default", () => {
    const stored = {
      ...buildDocument(),
      settings: {
        ...buildDocument().settings,
        revisionRetention: Number.NaN,
      },
    };

    expect(normalizeStoredPageDocumentV2ForRead(stored).settings.revisionRetention).toBe(10);
  });

  test("resolves responsive section overrides through a desktop-first cascade", () => {
    const [section] = buildDocument().sections;
    expect(section).toBeDefined();

    const desktop = resolvePageSectionForBreakpoint(section!, "desktop");
    const tablet = resolvePageSectionForBreakpoint(section!, "tablet");
    const mobileDocument = resolvePageDocumentForBreakpoint(buildDocument(), "mobile");

    expect(desktop.layout.columns).toBe(2);
    expect(tablet.layout.columns).toBe(1);
    expect(tablet.spacing.gap).toBe(20);
    expect(tablet.spacing.paddingLeft).toBe(40);
    expect(mobileDocument.sections[0]?.visibility.visible).toBe(false);
    expect(mobileDocument.sections[0]?.spacing.paddingLeft).toBe(20);
  });

  test("clears responsive overrides and prunes empty breakpoint records", () => {
    const section = buildDocument().sections[0]!;

    const withoutGap = clearResponsiveOverride(section, "tablet", ["spacing", "gap"]);
    expect(withoutGap.responsive.tablet?.spacing).toBeUndefined();
    expect(withoutGap.responsive.tablet?.layout?.columns).toBe(1);

    const withoutColumns = clearResponsiveOverride(withoutGap, "tablet", ["layout", "columns"]);
    expect(withoutColumns.responsive.tablet).toBeUndefined();
  });

  test("creates atomic section defaults and strips editor fields from published data", () => {
    const section = createPageSectionV2("hero", {
      id: "sec_created",
      blocks: [
        {
          id: "blk_text",
          type: "text",
          props: { text: "Body copy", format: "plain", align: "left" },
          visibility: { visible: true },
        },
      ],
    });
    expect(section).toMatchObject({
      id: "sec_created",
      type: "hero",
      name: "Hero",
      layout: { maxWidth: 1080 },
    });

    const published = toPublishedPageDocumentV2({
      ...buildDocument(),
      editor: { selectedSectionId: "sec_hero" },
    });
    expect(published).toEqual(buildDocument());
  });

  test("exposes machine-readable document errors", () => {
    try {
      normalizePageDocumentV2ForWrite({ schemaVersion: 2, sections: [], extra: true });
    } catch (error) {
      expect(isPageDocumentError(error, "page_document_unknown_field")).toBe(true);
      expect(error).toMatchObject({ path: "extra" });
    }
  });
});
