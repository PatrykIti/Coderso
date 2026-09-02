import { describe, expect, test } from "vitest";
import type { DetailPageRecord } from "../../../core/admin/services/detailPagesClient";
import type { DetailPageBinding } from "../../../core/services/content/detailPageTypes";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  buildDefaultDetailTemplateDocument,
  buildDetailTemplateDocumentUpdate,
  buildDetailTemplateEditorHref,
  collectSectionBlockIds,
  defaultDetailTemplateSelection,
  detailTemplateSelectionTargetExists,
  findBlockInSection,
  normalizeDetailTemplateDocument,
  reconcileDetailTemplateSelection,
  resolveDetailTemplateEditorRoute,
  summarizeDetailTemplateBindingsForAssistant,
  summarizeDetailTemplateBlocksForAssistant,
} from "../../../core/admin/ui/content-types/detailTemplateEditorModel";

const makeRecord = (overrides: Partial<DetailPageRecord> = {}): DetailPageRecord => ({
  id: "6f9619ff-8b86-4a11-b42d-00c04fc964f1",
  contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
  contentTypeSlug: "products",
  name: "Product detail",
  status: "draft",
  currentDocument: {
    schemaVersion: 2,
    sections: [],
    id: "6f9619ff-8b86-4a11-b42d-00c04fc964f1",
    name: "Product detail",
    contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
    contentTypeSlug: "products",
    status: "draft",
    titlePattern: "{title}",
    settings: {
      template: "detail",
      layout: {
        wrapper: {
          container: "full",
          padding: { top: "none", bottom: "none" },
          background: {
            color: "transparent",
            image: null,
            media: { type: "none", source: "external", src: null },
          },
        },
        sections: {
          gap: "none",
          defaults: {
            container: "default",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "none" },
          },
        },
        applyDefaultsToNewBlocks: false,
      },
    },
    bindings: [],
  },
  createdAt: "2026-05-10T08:00:00.000Z",
  updatedAt: "2026-05-10T08:00:00.000Z",
  publishedAt: null,
  authorId: null,
  ...overrides,
});

const makeBinding = (overrides: Partial<DetailPageBinding> = {}): DetailPageBinding => ({
  id: "binding-1",
  blockId: "block-1",
  propPath: "text",
  source: { kind: "entry-field", field: "title" },
  ...overrides,
});

describe("detail template editor route helpers", () => {
  test("builds editor hrefs and resolves canonical routes", () => {
    expect(buildDetailTemplateEditorHref("ct-1", "detail-1")).toBe(
      "/advanced/engine/ct-1/collection/detail-template/detail-1"
    );
    expect(
      resolveDetailTemplateEditorRoute(
        "/admin/advanced/engine/ct-1/collection/detail-template/detail-1"
      )
    ).toEqual({
      contentTypeId: "ct-1",
      detailPageId: "detail-1",
    });
    expect(
      resolveDetailTemplateEditorRoute(
        "/admin/coderso/engine/ct-1/collection/detail-template/detail-1"
      )
    ).toEqual({
      contentTypeId: "ct-1",
      detailPageId: "detail-1",
    });
  });

  test("resolves null for unrelated and malformed paths", () => {
    expect(resolveDetailTemplateEditorRoute("/admin/pages/page-1")).toBeNull();
    expect(resolveDetailTemplateEditorRoute("/admin/advanced/forms/form-1")).toBeNull();
    expect(resolveDetailTemplateEditorRoute("/admin/advanced/engine/ct-1")).toBeNull();
    expect(resolveDetailTemplateEditorRoute("/admin/advanced/engine/ct-1/schema")).toBeNull();
    expect(
      resolveDetailTemplateEditorRoute("/admin/advanced/engine/ct-1/collection/detail-template/%zz")
    ).toEqual({ contentTypeId: "ct-1", detailPageId: "%zz" });
  });

  test("survives malformed percent-encoding in ids", () => {
    expect(
      resolveDetailTemplateEditorRoute(
        "/admin/advanced/engine/%zz-1/collection/detail-template/detail-1"
      )
    ).toEqual({ contentTypeId: "%zz-1", detailPageId: "detail-1" });
  });
});

describe("buildDefaultDetailTemplateDocument", () => {
  test("uses the content type name with a fallback to the slug", () => {
    const document = buildDefaultDetailTemplateDocument({
      contentTypeId: "ct-1",
      contentTypeSlug: "products",
      contentTypeName: "Products",
    });
    expect(document.name).toBe("Products detail template");
    expect(document.titlePattern).toBe("{title}");
    expect(document.contentTypeId).toBe("ct-1");
    expect(document.status).toBe("draft");
    expect(document.sections).toEqual([]);
    expect(document.bindings).toEqual([]);

    const fallback = buildDefaultDetailTemplateDocument({
      contentTypeId: "ct-2",
      contentTypeSlug: "articles",
      contentTypeName: "",
    });
    expect(fallback.name).toBe("articles detail template");
  });
});

describe("normalizeDetailTemplateDocument", () => {
  test("normalizes stored documents with seo, related, settings and title fallbacks", () => {
    const record = makeRecord({
      currentDocument: {
        schemaVersion: 2,
        sections: [],
        id: "6f9619ff-8b86-4a11-b42d-00c04fc964f1",
        name: "Stored name",
        contentTypeId: "6f9619ff-8b86-4a11-b42d-00c04fc964f0",
        contentTypeSlug: "products",
        status: "draft",
        titlePattern: "{stored-title}",
        settings: {
          template: "list",
          layout: {
            wrapper: {
              container: "full",
              padding: { top: "none", bottom: "none" },
              background: {
                color: "transparent",
                image: null,
                media: { type: "none", source: "external", src: null },
              },
            },
            sections: {
              gap: "none",
              defaults: {
                container: "default",
                padding: { top: "xl", bottom: "xl" },
                margin: { top: "none", bottom: "none" },
              },
            },
            applyDefaultsToNewBlocks: false,
          },
        },
        seo: { titlePattern: "SEO {title}" },
        related: [
          {
            id: "related-1",
            kind: "same-content-type",
            label: "Related products",
            limit: 3,
            excludeCurrentEntry: true,
          },
        ],
        bindings: [],
      } as DetailPageRecord["currentDocument"],
    });
    const document = normalizeDetailTemplateDocument(record);
    expect(document.name).toBe("Stored name");
    expect(document.titlePattern).toBe("{stored-title}");
    expect(document.settings.template).toBe("list");
    expect(document.seo).toEqual({ titlePattern: "SEO {title}" });
    expect(document.related).toHaveLength(1);
  });
});

describe("buildDetailTemplateDocumentUpdate", () => {
  test("downgrades published records to draft updates with normalized fields", () => {
    const record = makeRecord({
      status: "published",
      publishedAt: "2026-05-10T09:00:00.000Z",
    });
    const updated = buildDetailTemplateDocumentUpdate(record, {
      name: "  ",
      titlePattern: "New {title}",
      sections: [],
      bindings: [],
    });
    expect(updated.status).toBe("draft");
    expect(updated.name).toBe("Product detail");
    expect(updated.titlePattern).toBe("New {title}");
  });
});

describe("block walking and binding summaries", () => {
  test("findBlockInSection finds top-level and nested slot blocks", () => {
    const inner = createPageBlockV2("text", { id: "block-inner", props: { text: "Inner" } });
    const columns = createPageBlockV2("columns", {
      id: "block-columns",
      props: { count: 1, gap: 16 },
      slots: { "column:1": [inner] },
    });
    const section = createPageSectionV2("hero", {
      id: "section-1",
      blocks: [
        createPageBlockV2("heading", { id: "block-heading", props: { text: "Hi" } }),
        columns,
      ],
    });
    expect(findBlockInSection(section, "block-heading")?.id).toBe("block-heading");
    expect(findBlockInSection(section, "block-inner")?.id).toBe("block-inner");
    expect(findBlockInSection(section, "missing")).toBeNull();
    expect(collectSectionBlockIds([section])).toEqual([
      "block-heading",
      "block-columns",
      "block-inner",
    ]);
  });

  test("summarizeDetailTemplateBlocksForAssistant walks nested slots with paths", () => {
    const inner = createPageBlockV2("text", { id: "block-inner", props: { text: "Inner" } });
    const columns = createPageBlockV2("columns", {
      id: "block-columns",
      props: { count: 1, gap: 16 },
      slots: { "column:1": [inner] },
    });
    const section = createPageSectionV2("hero", { id: "section-1", blocks: [columns] });
    const summary = summarizeDetailTemplateBlocksForAssistant([section]);
    expect(summary).toHaveLength(2);
    const columnsNode = summary[0]!;
    expect(columnsNode.id).toBe("block-columns");
    expect(columnsNode.slotKeys).toEqual(["column:1"]);
    expect(columnsNode.childCount).toBe(1);
    const innerNode = summary[1]!;
    expect(innerNode.path).toBe("sections.0.0.slots.column:1.0");
    expect(innerNode.label).toBe("Inner");
  });

  test("summarizeDetailTemplateBlocksForAssistant respects the max block budget", () => {
    const section = createPageSectionV2("hero", {
      id: "section-1",
      blocks: Array.from({ length: 5 }, (_, index) =>
        createPageBlockV2("text", { id: `block-${index}`, props: { text: `B${index}` } })
      ),
    });
    const summary = summarizeDetailTemplateBlocksForAssistant([section], { maxBlocks: 3 });
    expect(summary).toHaveLength(3);
    expect(summary[0]?.label).toBe("B0");
    expect(summary[2]?.label).toBe("B2");
  });

  test("summarizeDetailTemplateBindingsForAssistant slices and flags required", () => {
    const bindings = Array.from({ length: 4 }, (_, index) =>
      makeBinding({
        id: `binding-${index}`,
        blockId: `block-${index}`,
        propPath: `prop-${index}`,
        required: index === 0,
        transform: index === 1 ? "text" : undefined,
      })
    );
    const summary = summarizeDetailTemplateBindingsForAssistant(bindings, { maxBindings: 2 });
    expect(summary).toHaveLength(2);
    expect(summary[0]?.required).toBe(true);
    expect(summary[1]?.transform).toBe("text");
  });
});

describe("selection reconciliation", () => {
  const section = createPageSectionV2("hero", {
    id: "section-1",
    blocks: [createPageBlockV2("heading", { id: "block-1", props: { text: "Hi" } })],
  });

  test("defaultDetailTemplateSelection picks the first block", () => {
    expect(defaultDetailTemplateSelection([section])).toEqual({
      kind: "block",
      sectionId: "section-1",
      id: "block-1",
    });
    expect(
      defaultDetailTemplateSelection([createPageSectionV2("hero", { id: "section-empty" })])
    ).toEqual({
      kind: "section",
      id: "section-empty",
    });
    expect(defaultDetailTemplateSelection([])).toBeNull();
  });

  test("detailTemplateSelectionTargetExists validates section and block targets", () => {
    expect(
      detailTemplateSelectionTargetExists({ kind: "section", id: "section-1" }, [section])
    ).toBe(true);
    expect(detailTemplateSelectionTargetExists({ kind: "section", id: "missing" }, [section])).toBe(
      false
    );
    expect(
      detailTemplateSelectionTargetExists(
        { kind: "block", sectionId: "section-1", id: "block-1" },
        [section]
      )
    ).toBe(true);
    expect(
      detailTemplateSelectionTargetExists(
        { kind: "block", sectionId: "section-1", id: "missing" },
        [section]
      )
    ).toBe(false);
    expect(detailTemplateSelectionTargetExists(null, [section])).toBe(false);
  });

  test("reconcileDetailTemplateSelection falls back to the default", () => {
    const existing = { kind: "block", sectionId: "section-1", id: "block-1" } as const;
    expect(reconcileDetailTemplateSelection(existing, [section])).toBe(existing);
    expect(
      reconcileDetailTemplateSelection({ kind: "block", sectionId: "section-1", id: "gone" }, [
        section,
      ])
    ).toEqual({ kind: "block", sectionId: "section-1", id: "block-1" });
    expect(reconcileDetailTemplateSelection(null, [])).toBeNull();
  });
});

describe("cloneRecord fallback", () => {
  test("falls back to JSON round-trip when structuredClone is unavailable", () => {
    const record = makeRecord({
      currentDocument: {
        ...makeRecord().currentDocument,
        related: [
          {
            id: "related-1",
            kind: "same-content-type",
            label: "Related products",
            limit: 3,
            excludeCurrentEntry: true,
          },
        ],
      },
    });
    const original = globalThis.structuredClone;
    Object.defineProperty(globalThis, "structuredClone", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const document = normalizeDetailTemplateDocument(record);
      expect(document.related).toHaveLength(1);
    } finally {
      Object.defineProperty(globalThis, "structuredClone", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
