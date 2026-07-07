import { afterEach, beforeEach, expect, test } from "bun:test";

import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import type { DetailPageBindingResolverEntry } from "../../../core/services/content/detailPageBindingResolver";

type DetailPageRecord = {
  id: string;
  contentTypeId: string;
  status: "draft" | "published";
  currentDocument: Record<string, unknown> | null;
  publishedDocument: Record<string, unknown> | null;
};

const contentType = {
  id: "8f530de0-9954-4ad3-bfce-2ee6d2e7f8d2",
  slug: "products",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string", xFieldType: "text" },
    },
  },
};

const entry: DetailPageBindingResolverEntry = {
  id: "entry-1",
  typeId: contentType.id,
  title: "Runtime product",
  slug: "runtime-product",
  status: "published",
  visibility: "public",
  hasPassword: false,
  tags: [],
  data: {
    headline: "Bound headline",
  },
  publishedAt: new Date("2026-05-08T10:00:00.000Z"),
  scheduledAt: null,
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  updatedAt: new Date("2026-05-08T10:00:00.000Z"),
  author: null,
};

const createDocument = (overrides: Record<string, unknown> = {}) =>
  normalizeDetailPageDocument({
    schemaVersion: 1,
    id: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Product detail page",
    contentTypeId: contentType.id,
    contentTypeSlug: contentType.slug,
    status: "published",
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
          headline: "Default detail headline",
        },
      },
    ],
    bindings: [],
    ...overrides,
  });

let currentRecords: DetailPageRecord[] = [];
const bunVi = (
  (await import("bun:test")) as {
    vi?: { fn: <T>(impl?: T) => any; mock: (id: string, factory: () => unknown) => void };
  }
).vi;
const resolveDetailPageBlocks = bunVi!.fn(async () => [
  {
    id: "hero",
    type: "hero",
    variant: "centered",
    data: {
      headline: "Resolved detail block",
    },
  },
]);

bunVi!.mock("../../../core/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => currentRecords,
        }),
      }),
    }),
  },
}));

bunVi!.mock("../../../core/services/content/detailPageBindingResolver", () => ({
  resolveDetailPageBlocks,
}));

const { resolvePreviewDetailPageRuntime, resolvePublishedDetailPageRuntime } =
  await import("../../../core/services/content/detailPageRuntimeResolver");

beforeEach(() => {
  currentRecords = [];
  resolveDetailPageBlocks.mockClear();
  resolveDetailPageBlocks.mockImplementation(async () => [
    {
      id: "hero",
      type: "hero",
      variant: "centered",
      data: {
        headline: "Resolved detail block",
      },
    },
  ]);
});

afterEach(() => {
  currentRecords = [];
  resolveDetailPageBlocks.mockClear();
});

test("resolvePublishedDetailPageRuntime resolves published matching detail-page documents", async () => {
  const document = createDocument();
  currentRecords = [
    {
      id: document.id,
      contentTypeId: contentType.id,
      status: "published",
      currentDocument: document,
      publishedDocument: document,
    },
  ];

  const result = await resolvePublishedDetailPageRuntime({
    detailPageId: document.id,
    entry,
    contentType,
    contentRoutes: [],
  });

  expect(result).not.toBeNull();
  expect(result?.document.id).toBe(document.id);
  expect(result?.blocks).toEqual([
    expect.objectContaining({
      id: "hero",
      data: expect.objectContaining({
        headline: "Resolved detail block",
      }),
    }),
  ]);
});

test("resolvePreviewDetailPageRuntime can render current documents in preview mode", async () => {
  const publishedDocument = createDocument({
    blocks: [
      {
        id: "hero",
        type: "hero",
        variant: "centered",
        data: {
          headline: "Published detail headline",
        },
      },
    ],
  });
  const currentDocument = createDocument({
    blocks: [
      {
        id: "hero",
        type: "hero",
        variant: "centered",
        data: {
          headline: "Draft detail headline",
        },
      },
    ],
  });
  currentRecords = [
    {
      id: publishedDocument.id,
      contentTypeId: contentType.id,
      status: "draft",
      currentDocument,
      publishedDocument,
    },
  ];

  const result = await resolvePreviewDetailPageRuntime({
    detailPageId: publishedDocument.id,
    documentSource: "current",
    entry,
    contentType,
    contentRoutes: [],
  });

  expect(result).not.toBeNull();
  expect(resolveDetailPageBlocks).toHaveBeenCalledWith(
    expect.objectContaining({
      preview: true,
    })
  );
});

test("resolvePublishedDetailPageRuntime fails closed for unpublished or mismatched records", async () => {
  const document = createDocument();
  currentRecords = [
    {
      id: document.id,
      contentTypeId: contentType.id,
      status: "draft",
      currentDocument: document,
      publishedDocument: document,
    },
  ];

  await expect(
    resolvePublishedDetailPageRuntime({
      detailPageId: document.id,
      entry,
      contentType,
      contentRoutes: [],
    })
  ).resolves.toBeNull();

  currentRecords = [
    {
      id: document.id,
      contentTypeId: "11111111-1111-4111-8111-111111111111",
      status: "published",
      currentDocument: document,
      publishedDocument: document,
    },
  ];

  await expect(
    resolvePublishedDetailPageRuntime({
      detailPageId: document.id,
      entry,
      contentType,
      contentRoutes: [],
    })
  ).resolves.toBeNull();

  currentRecords = [
    {
      id: document.id,
      contentTypeId: contentType.id,
      status: "published",
      currentDocument: document,
      publishedDocument: null,
    },
  ];

  await expect(
    resolvePublishedDetailPageRuntime({
      detailPageId: document.id,
      entry,
      contentType,
      contentRoutes: [],
    })
  ).resolves.toBeNull();
});

test("resolvePublishedDetailPageRuntime fails closed when document normalization or binding resolution fails", async () => {
  currentRecords = [
    {
      id: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      contentTypeId: contentType.id,
      status: "published",
      currentDocument: null,
      publishedDocument: {
        id: "not-a-valid-document",
      },
    },
  ];

  await expect(
    resolvePublishedDetailPageRuntime({
      detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      entry,
      contentType,
      contentRoutes: [],
    })
  ).resolves.toBeNull();

  const document = createDocument();
  currentRecords = [
    {
      id: document.id,
      contentTypeId: contentType.id,
      status: "published",
      currentDocument: document,
      publishedDocument: document,
    },
  ];
  resolveDetailPageBlocks.mockImplementation(async () => {
    throw new Error("detail_page_binding_failed");
  });

  await expect(
    resolvePublishedDetailPageRuntime({
      detailPageId: document.id,
      entry,
      contentType,
      contentRoutes: [],
    })
  ).resolves.toBeNull();
});
