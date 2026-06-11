import { describe, expect, test } from "vitest";

import {
  PAGE_TEMPLATE_PREVIEW_TTL_DEFAULT_MINUTES,
  PAGE_TEMPLATE_PREVIEW_TTL_MAX_MINUTES,
  PAGE_TEMPLATE_PREVIEW_TTL_MIN_MINUTES,
  PageTemplateError,
  clampPageTemplatePreviewTtlMinutes,
  instantiatePageTemplateSections,
  isPageTemplateError,
  normalizePageTemplateCreateInput,
  normalizePageTemplateSlug,
  normalizePageTemplateUpdateInput,
  normalizeStoredPageTemplateDocument,
  resolvePageTemplateCopyNaming,
} from "../../../core/services/pages/pageTemplateLibrarySchema";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const templateDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: false },
  sections: [
    createPageSectionV2("hero", {
      id: "sec_template_hero",
      blocks: [
        createPageBlockV2("group", {
          id: "blk_template_group",
          props: { direction: "column", gap: 12, wrap: false },
          slots: {
            children: [
              createPageBlockV2("heading", {
                id: "blk_template_heading",
                props: { text: "Template heading", level: "h2", align: "left" },
              }),
            ],
          },
        }),
      ],
    }),
  ],
});

const legacyWidgetDocument = () => ({
  blocks: [{ id: "legacy-1", type: "hero", data: { title: "Legacy" } }],
  settings: { template: "landing" },
});

describe("page template library schema", () => {
  test("normalizes a strict create payload and derives the slug from the name", () => {
    const created = normalizePageTemplateCreateInput({
      name: "  Landing Hero Stack!  ",
      description: "  Reusable hero  ",
      category: " marketing ",
      document: templateDocument(),
    });

    expect(created.name).toBe("Landing Hero Stack!");
    expect(created.slug).toBe("landing-hero-stack");
    expect(created.description).toBe("Reusable hero");
    expect(created.category).toBe("marketing");
    expect(created.status).toBe("draft");
    expect(created.document.sections).toHaveLength(1);
  });

  test("slug normalization is deterministic and strips edge dashes", () => {
    expect(normalizePageTemplateSlug("  Hello -- World 42 ")).toBe("hello-world-42");
    expect(normalizePageTemplateSlug("--Łó!@#--")).toBe("");
  });

  test("rejects invalid names, slugs, statuses, and oversized metadata", () => {
    const document = templateDocument();
    expect(() => normalizePageTemplateCreateInput({ name: "   ", document })).toThrow(
      PageTemplateError
    );
    expect(() => normalizePageTemplateCreateInput({ name: "x".repeat(161), document })).toThrow(
      PageTemplateError
    );
    expect(() =>
      normalizePageTemplateCreateInput({ name: "Valid", slug: "!!!", document })
    ).toThrow(PageTemplateError);
    expect(() =>
      normalizePageTemplateCreateInput({ name: "Valid", status: "archived", document })
    ).toThrowError("Template status is invalid.");
    expect(() =>
      normalizePageTemplateCreateInput({
        name: "Valid",
        description: "x".repeat(501),
        document,
      })
    ).toThrow(PageTemplateError);
    expect(() =>
      normalizePageTemplateCreateInput({ name: "Valid", category: "x".repeat(81), document })
    ).toThrow(PageTemplateError);
  });

  test("rejects legacy WidgetBlock[] payloads with the boundary error", () => {
    try {
      normalizePageTemplateCreateInput({ name: "Legacy", document: legacyWidgetDocument() });
      throw new Error("expected_rejection");
    } catch (error) {
      expect(isPageTemplateError(error, "page_template_legacy_widget_blocks_invalid")).toBe(true);
    }
  });

  test("rejects unknown document fields through the strict Page v2 owner", () => {
    const document = { ...templateDocument(), rogue: true } as unknown;
    expect(() => normalizePageTemplateCreateInput({ name: "Strict", document })).toThrowError(
      /rogue/
    );
  });

  test("update payload requires at least one field and normalizes each field", () => {
    expect(() => normalizePageTemplateUpdateInput({})).toThrow(PageTemplateError);
    const update = normalizePageTemplateUpdateInput({
      slug: "  New Slug ",
      status: "published",
      description: null,
    });
    expect(update).toEqual({ slug: "new-slug", status: "published", description: null });
  });

  test("stored documents fail closed when they are not Page v2 documents", () => {
    expect(() => normalizeStoredPageTemplateDocument(legacyWidgetDocument())).toThrow(
      PageTemplateError
    );
    expect(() => normalizeStoredPageTemplateDocument({ sections: [] })).toThrow(PageTemplateError);
    const stored = normalizeStoredPageTemplateDocument(templateDocument());
    expect(stored.sections[0]?.type).toBe("hero");
  });

  test("preview ttl clamps deterministically", () => {
    expect(clampPageTemplatePreviewTtlMinutes(undefined)).toBe(
      PAGE_TEMPLATE_PREVIEW_TTL_DEFAULT_MINUTES
    );
    expect(clampPageTemplatePreviewTtlMinutes(0)).toBe(PAGE_TEMPLATE_PREVIEW_TTL_MIN_MINUTES);
    expect(clampPageTemplatePreviewTtlMinutes(999)).toBe(PAGE_TEMPLATE_PREVIEW_TTL_MAX_MINUTES);
    expect(clampPageTemplatePreviewTtlMinutes(15.4)).toBe(15);
  });

  test("duplicate naming is deterministic and walks copy suffixes", () => {
    const taken = new Set(["landing-copy", "landing-copy-2"]);
    expect(
      resolvePageTemplateCopyNaming({ name: "Landing", slug: "landing" }, (slug) => taken.has(slug))
    ).toEqual({ name: "Landing (copy)", slug: "landing-copy-3" });
    expect(
      resolvePageTemplateCopyNaming({ name: "Landing", slug: "landing" }, () => false)
    ).toEqual({ name: "Landing (copy)", slug: "landing-copy" });
  });

  describe("instantiatePageTemplateSections", () => {
    test("regenerates every section and block id recursively without touching the template", () => {
      const document = templateDocument();
      let counter = 0;
      const sections = instantiatePageTemplateSections(document, {
        createId: (prefix) => `${prefix}_fresh_${(counter += 1)}`,
      });

      expect(sections).toHaveLength(1);
      expect(sections[0]?.id).toBe("sec_fresh_1");
      expect(sections[0]?.blocks[0]?.id).toBe("blk_fresh_2");
      expect(sections[0]?.blocks[0]?.slots?.children?.[0]?.id).toBe("blk_fresh_3");
      // Template document is read-only source material.
      expect(document.sections[0]?.id).toBe("sec_template_hero");
      expect(document.sections[0]?.blocks[0]?.id).toBe("blk_template_group");
      expect(document.sections[0]?.blocks[0]?.slots?.children?.[0]?.id).toBe(
        "blk_template_heading"
      );
      // Content carried verbatim.
      expect(sections[0]?.blocks[0]?.slots?.children?.[0]?.props.text).toBe("Template heading");
    });

    test("repeat applies never collide and default ids use the owner prefixes", () => {
      const document = templateDocument();
      const first = instantiatePageTemplateSections(document);
      const second = instantiatePageTemplateSections(document);
      const collectIds = (sections: ReturnType<typeof instantiatePageTemplateSections>) => {
        const ids: string[] = [];
        const walkBlocks = (blocks: PageDocumentV2["sections"][number]["blocks"]) => {
          for (const block of blocks) {
            ids.push(block.id);
            for (const children of Object.values(block.slots ?? {})) {
              if (Array.isArray(children)) walkBlocks(children);
            }
          }
        };
        for (const section of sections) {
          ids.push(section.id);
          walkBlocks(section.blocks);
        }
        return ids;
      };

      const firstIds = collectIds(first);
      const secondIds = collectIds(second);
      expect(firstIds.every((id) => /^(sec|blk)_/.test(id))).toBe(true);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
      const templateIds = collectIds(document.sections);
      expect(firstIds.some((id) => templateIds.includes(id))).toBe(false);
    });
  });
});
