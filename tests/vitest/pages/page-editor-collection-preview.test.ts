import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  buildPageEditorCollectionPreviewBinding,
  buildPageEditorCollectionPreviewBindings,
  collectPageEditorCollectionPreviewContentTypeIds,
  type PageEditorCollectionPreviewEntry,
  type PageEditorCollectionPreviewSource,
} from "../../../core/services/pages/pageEditorCollectionPreview";

const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

const buildEntry = (
  overrides: Partial<PageEditorCollectionPreviewEntry> & { id: string }
): PageEditorCollectionPreviewEntry => ({
  title: `Entry ${overrides.id}`,
  slug: overrides.id,
  status: "published",
  data: {},
  updatedAt: "2026-06-01T09:00:00.000Z",
  ...overrides,
});

const servicesSource: PageEditorCollectionPreviewSource = {
  contentType: { id: "ct-services", name: "Services", slug: "services" },
  entries: [
    buildEntry({
      id: "entry-old",
      publishedAt: "2026-01-10T09:00:00.000Z",
      data: { summary: "<p>Old   summary</p>" },
    }),
    buildEntry({ id: "entry-draft", status: "draft" }),
    buildEntry({
      id: "entry-new",
      publishedAt: "2026-05-10T09:00:00.000Z",
      tags: ["featured"],
      author: { name: "Jane" },
    }),
    buildEntry({ id: "entry-mid", publishedAt: "2026-03-10T09:00:00.000Z" }),
  ],
};

describe("page editor collection preview mapper (TASK-457)", () => {
  test("maps cached entries onto the runtime collection binding with published-desc order and the limit clamp", () => {
    const block = createPageBlockV2("collection", {
      id: "blk-collection",
      props: { contentTypeId: "ct-services", queryId: null, limit: 2, templateId: null },
    });
    const binding = buildPageEditorCollectionPreviewBinding(block, servicesSource);
    expect(binding.kind).toBe("collection");
    // Shared prop mapper parity: source mode/clamps come from
    // `mapPageCollectionBlockToContentListData`, not a forked mapping.
    expect(binding.data.source).toMatchObject({
      mode: "legacy",
      contentTypeId: "ct-services",
      statusScope: "published",
      limit: 2,
    });
    const resolved = binding.data.resolved!;
    expect(resolved.error).toBeUndefined();
    expect(resolved.sourceTypeId).toBe("ct-services");
    expect(resolved.sourceTypeSlug).toBe("services");
    // Draft entries are excluded; total counts published entries pre-slice.
    expect(resolved.total).toBe(3);
    expect(resolved.items?.map((item) => item.id)).toEqual(["entry-new", "entry-mid"]);
    expect(resolved.items?.[0]).toMatchObject({
      title: "Entry entry-new",
      slug: "entry-new",
      tags: ["featured"],
      authorName: "Jane",
      publishedAt: "2026-05-10T09:00:00.000Z",
      status: "published",
    });
    // Canvas-safe: no detail hrefs are emitted (interactivity is off anyway).
    expect(resolved.items?.every((item) => item.href === undefined)).toBe(true);
  });

  test("derives a canvas excerpt from prose data fields with HTML stripped and runtime parity clamps the limit", () => {
    const block = createPageBlockV2("collection", {
      id: "blk-limit",
      // Schema allows 1..50; the runtime content-list bound caps rendering at
      // 24 (`mapPageCollectionBlockToContentListData`) and the canvas mirrors
      // that so the preview never over-promises.
      props: { contentTypeId: "ct-services", queryId: null, limit: 50, templateId: null },
    });
    const binding = buildPageEditorCollectionPreviewBinding(block, servicesSource);
    expect(binding.data.source?.limit).toBe(24);
    const oldEntry = binding.data.resolved?.items?.find((item) => item.id === "entry-old");
    expect(oldEntry?.excerpt).toBe("Old summary");
  });

  test("maps a missing content type to the runtime fail-closed error binding", () => {
    const block = createPageBlockV2("collection", {
      id: "blk-dangling",
      props: { contentTypeId: "ct-deleted", queryId: null, limit: 6, templateId: null },
    });
    const binding = buildPageEditorCollectionPreviewBinding(block, null);
    expect(binding.data.resolved).toMatchObject({
      items: [],
      total: 0,
      sourceTypeId: "ct-deleted",
      sourceTypeSlug: "",
      // Pinned runtime resolver shape for a dangling content type id.
      error: "Selected content type no longer exists.",
    });
  });

  test("collects unique referenced content type ids across slots and responsive overrides", () => {
    const document = createDocument([
      createPageSectionV2("content", {
        id: "sec-collections",
        blocks: [
          createPageBlockV2("collection", {
            id: "blk-base",
            props: { contentTypeId: "ct-a", queryId: null, limit: 6, templateId: null },
            responsive: { mobile: { props: { contentTypeId: "ct-mobile" } } },
          }),
          createPageBlockV2("collection", {
            id: "blk-unset",
            props: { contentTypeId: null, queryId: null, limit: 6, templateId: null },
          }),
          createPageBlockV2("columns", {
            id: "blk-columns",
            props: { count: 2, gap: 24, distribution: "equal" },
            slots: {
              "column:1": [
                createPageBlockV2("collection", {
                  id: "blk-nested",
                  props: { contentTypeId: "ct-b", queryId: null, limit: 6, templateId: null },
                }),
              ],
            },
          }),
          createPageBlockV2("collection", {
            id: "blk-duplicate",
            props: { contentTypeId: "ct-a", queryId: null, limit: 6, templateId: null },
            visibility: { visible: false },
          }),
        ],
      }),
    ]);
    expect(collectPageEditorCollectionPreviewContentTypeIds(document).sort()).toEqual([
      "ct-a",
      "ct-b",
      "ct-mobile",
    ]);
  });

  test("builds per-breakpoint bindings only for resolved sources", () => {
    const document = createDocument([
      createPageSectionV2("content", {
        id: "sec-bindings",
        blocks: [
          createPageBlockV2("collection", {
            id: "blk-ready",
            props: { contentTypeId: "ct-services", queryId: null, limit: 6, templateId: null },
            responsive: { mobile: { props: { contentTypeId: "ct-mobile" } } },
          }),
          createPageBlockV2("collection", {
            id: "blk-pending",
            props: { contentTypeId: "ct-x", queryId: null, limit: 6, templateId: null },
          }),
          createPageBlockV2("collection", {
            id: "blk-unset",
            props: { contentTypeId: null, queryId: null, limit: 6, templateId: null },
          }),
        ],
      }),
    ]);

    const desktop = buildPageEditorCollectionPreviewBindings(document, "desktop", {
      "ct-services": servicesSource,
    });
    expect(Object.keys(desktop)).toEqual(["blk-ready"]);
    expect(desktop["blk-ready"]).toMatchObject({ kind: "collection" });

    // The mobile override resolves the overridden contentTypeId; unresolved
    // sources produce NO binding (the renderer shows its canvas loading
    // state), and a null source produces the fail-closed binding.
    const mobile = buildPageEditorCollectionPreviewBindings(document, "mobile", {
      "ct-services": servicesSource,
      "ct-mobile": null,
    });
    expect(mobile["blk-ready"]?.kind).toBe("collection");
    expect(
      mobile["blk-ready"]?.kind === "collection"
        ? mobile["blk-ready"].data.resolved?.error
        : undefined
    ).toBe("Selected content type no longer exists.");
    expect(mobile["blk-pending"]).toBeUndefined();
    expect(mobile["blk-unset"]).toBeUndefined();
  });
});
