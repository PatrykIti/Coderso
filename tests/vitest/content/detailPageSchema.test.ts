import { expect, test } from "vitest";

import {
  buildDeterministicDetailPageId,
  normalizeDetailPageDocument,
  normalizeDetailPageDocumentForWrite,
  normalizeDetailPageId,
} from "../../../core/services/content/detailPageSchema";

const baseDocument = {
  schemaVersion: 1,
  id: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
  name: "Product detail page",
  contentTypeId: "8f530de0-9954-4ad3-bfce-2ee6d2e7f8d2",
  contentTypeSlug: "products",
  status: "draft",
  titlePattern: "{{ title }}",
  settings: {
    template: "detail",
    layout: {
      wrapper: {
        container: "default",
        padding: { top: "md", bottom: "lg" },
        background: {
          color: "#ffffff",
          image: null,
          media: {
            type: "none",
            source: "external",
            src: null,
          },
        },
      },
      sections: {
        gap: "lg",
        defaults: {
          container: "default",
          padding: { top: "xl", bottom: "xl" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  },
  blocks: [
    {
      id: "hero",
      type: "hero",
      variant: "centered",
      data: {
        headline: "Default headline",
        subhead: "Default subhead",
      },
    },
  ],
  bindings: [
    {
      id: "binding-headline",
      blockId: "hero",
      propPath: "headline",
      source: {
        kind: "entry-meta",
        field: "title",
      },
      transform: "text",
      required: true,
    },
  ],
};

test("normalizeDetailPageDocument converts a valid v1 document to v2 deterministically", () => {
  const normalized = normalizeDetailPageDocument(baseDocument);

  expect(normalized).toMatchObject({
    schemaVersion: 2,
    id: baseDocument.id,
    contentTypeId: baseDocument.contentTypeId,
    contentTypeSlug: "products",
    settings: {
      template: "detail",
      layout: {
        wrapper: {
          container: "default",
        },
      },
    },
    sections: [
      expect.objectContaining({
        id: "hero",
        type: "hero",
      }),
    ],
    bindings: [
      expect.objectContaining({
        id: "binding-headline",
        blockId: "hero-heading",
        propPath: "text",
      }),
    ],
  });

  expect(normalizeDetailPageDocument(baseDocument)).toEqual(normalized);
});

test("normalizeDetailPageDocument clamps related source limits", () => {
  const normalized = normalizeDetailPageDocument({
    ...baseDocument,
    related: [
      {
        id: "related-products",
        kind: "listing-query",
        label: "Related products",
        listingQueryId: "query-1",
        limit: 200,
      },
    ],
  });

  expect(normalized.related?.[0]?.limit).toBe(24);
});

// Stored-read converts v1 to v2; the strict WRITE path owns fail-closed
// validation and rejects v1 payloads up front. These rejection tests run the
// write normalizer against a v2 document derived from the v1 base.
const baseDocumentV2 = normalizeDetailPageDocument(baseDocument) as {
  schemaVersion: number;
  id: string;
  name: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status: string;
  titlePattern: string;
  settings: Record<string, unknown>;
  sections: Array<{ id: string; blocks: Array<{ id: string }> }>;
  bindings: Array<Record<string, unknown>>;
};

test("normalizeDetailPageDocumentForWrite rejects legacy v1 payloads", () => {
  expect(() => normalizeDetailPageDocumentForWrite(baseDocument)).toThrow(
    "detail_page_legacy_v1_invalid"
  );
});

test("normalizeDetailPageDocumentForWrite rejects duplicate block ids", () => {
  expect(() =>
    normalizeDetailPageDocumentForWrite({
      ...baseDocumentV2,
      sections: [...baseDocumentV2.sections, { ...baseDocumentV2.sections[0]! }],
    })
  ).toThrow("Duplicate page block id");
});

test("normalizeDetailPageDocumentForWrite rejects bindings targeting missing blocks", () => {
  expect(() =>
    normalizeDetailPageDocumentForWrite({
      ...baseDocumentV2,
      bindings: [
        ...baseDocumentV2.bindings,
        {
          id: "binding-missing",
          blockId: "missing",
          propPath: "text",
          source: {
            kind: "entry-meta",
            field: "title",
          },
        },
      ],
    })
  ).toThrow("detail_page_document_invalid");
});

test("normalizeDetailPageDocumentForWrite rejects unsafe prop paths", () => {
  expect(() =>
    normalizeDetailPageDocumentForWrite({
      ...baseDocumentV2,
      bindings: [
        {
          id: "binding-unsafe",
          blockId: "hero-heading",
          propPath: "dangerouslySetInnerHTML",
          source: {
            kind: "entry-meta",
            field: "title",
          },
        },
      ],
    })
  ).toThrow("detail_page_document_invalid");
});

test("normalizeDetailPageDocument rejects secret-like entry fields", () => {
  expect(() =>
    normalizeDetailPageDocument({
      ...baseDocument,
      bindings: [
        {
          id: "binding-secret",
          blockId: "hero",
          propPath: "headline",
          source: {
            kind: "entry-field",
            field: "apiKey",
          },
        },
      ],
    })
  ).toThrow("detail_page_document_invalid");
});

test("normalizeDetailPageDocument accepts safe title pattern tokens", () => {
  const normalized = normalizeDetailPageDocument({
    ...baseDocument,
    titlePattern: "{{ title }} - {{ data.headline }} - { publishedAt }",
    seo: {
      titlePattern: "{{ slug }} | {{ headline }}",
    },
  });

  expect(normalized.titlePattern).toBe("{{ title }} - {{ data.headline }} - { publishedAt }");
  expect(normalized.seo?.titlePattern).toBe("{{ slug }} | {{ headline }}");
});

test("normalizeDetailPageDocument rejects unsafe title pattern tokens", () => {
  expect(() =>
    normalizeDetailPageDocument({
      ...baseDocument,
      titlePattern: "{{ data.apiKey }}",
    })
  ).toThrow("detail_page_document_invalid");

  expect(() =>
    normalizeDetailPageDocument({
      ...baseDocument,
      seo: {
        titlePattern: "{{ password }}",
      },
    })
  ).toThrow("detail_page_document_invalid");
});

test("detail page ids stay UUID-compatible and deterministic for stable content identity", () => {
  const first = buildDeterministicDetailPageId({
    contentTypeId: baseDocument.contentTypeId,
    pageRole: "canonical-list-page",
    compositionKey: "primary",
  });
  const second = buildDeterministicDetailPageId({
    contentTypeId: baseDocument.contentTypeId,
    pageRole: "canonical-list-page",
    compositionKey: "primary",
  });
  const other = buildDeterministicDetailPageId({
    contentTypeId: baseDocument.contentTypeId,
    pageRole: "supporting-page",
    compositionKey: "secondary",
  });

  expect(normalizeDetailPageId(first)).toBe(first);
  expect(first).toBe("051b16e5-c5a6-596e-84ba-2c7052186326");
  expect(first).toBe(second);
  expect(other).not.toBe(first);
});

test("normalizeDetailPageId rejects non-uuid-compatible values", () => {
  expect(() => normalizeDetailPageId("detail-page-products")).toThrow(
    "detail_page_document_invalid"
  );
});

test("normalizeDetailPageDocumentForWrite rejects unknown keys", () => {
  expect(() =>
    normalizeDetailPageDocumentForWrite({
      ...baseDocumentV2,
      extra: true,
    })
  ).toThrow("detail_page_document_invalid");
});
