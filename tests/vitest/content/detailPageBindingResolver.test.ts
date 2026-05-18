import { expect, test, vi } from "vitest";

import {
  type DetailPageBindingResolverDeps,
  type DetailPageBindingResolverEntry,
  resolveDetailPageBlocks,
  resolveDetailPageRelatedItems,
} from "../../../core/services/content/detailPageBindingResolver";
import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import { getDefaultFormSettings } from "../../../core/services/forms/formSettings";

const contentType = {
  id: "8f530de0-9954-4ad3-bfce-2ee6d2e7f8d2",
  slug: "products",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string", xFieldType: "text" },
      summary: { type: "string", xFieldType: "textarea" },
      apiKey: { type: "string", xFieldType: "text" },
    },
  },
};

const createEntry = (): DetailPageBindingResolverEntry => ({
  id: "entry-1",
  typeId: contentType.id,
  title: "Sample product",
  slug: "sample-product",
  status: "published",
  data: {
    headline: "Bound headline",
  },
  tags: ["featured"],
  publishedAt: new Date("2026-05-08T10:00:00.000Z"),
  scheduledAt: null,
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  updatedAt: new Date("2026-05-08T10:00:00.000Z"),
  author: {
    id: "author-1",
    name: "Ada Editor",
    email: "ada@example.com",
  },
});

const createDocument = (overrides: Partial<DetailPageDocument> = {}) =>
  normalizeDetailPageDocument({
    schemaVersion: 1,
    id: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Product detail page",
    contentTypeId: contentType.id,
    contentTypeSlug: contentType.slug,
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
        },
      },
    ],
    bindings: [],
    ...overrides,
  });

test("resolveDetailPageBlocks writes entry fields into widget props", async () => {
  const document = createDocument({
    bindings: [
      {
        id: "binding-headline",
        blockId: "hero",
        propPath: "headline",
        source: {
          kind: "entry-field",
          field: "headline",
        },
        transform: "text",
        required: true,
      },
    ],
  });

  const resolved = await resolveDetailPageBlocks({
    document,
    entry: createEntry(),
    contentType,
    preview: false,
  });

  expect(resolved[0]?.data).toMatchObject({
    headline: "Bound headline",
  });
});

test("resolveDetailPageBlocks binds entry meta and detail href through the current route contract", async () => {
  const document = createDocument({
    bindings: [
      {
        id: "binding-title",
        blockId: "hero",
        propPath: "headline",
        source: {
          kind: "entry-meta",
          field: "title",
        },
        transform: "text",
      },
      {
        id: "binding-href",
        blockId: "hero",
        propPath: "cta.href",
        source: {
          kind: "computed",
          resolver: "detailHref",
        },
        transform: "text",
      },
      {
        id: "binding-published-at",
        blockId: "hero",
        propPath: "meta.publishedAt",
        source: {
          kind: "entry-meta",
          field: "publishedAt",
        },
        transform: "text",
      },
    ],
  });

  const resolved = await resolveDetailPageBlocks({
    document,
    entry: createEntry(),
    contentType,
    preview: false,
    contentRoutes: [
      {
        type: contentType.slug,
        listPath: "/products",
        detailPath: "/products/:slug",
        enabled: true,
      },
    ],
  });

  expect(resolved[0]?.data).toMatchObject({
    headline: "Sample product",
    cta: { href: "/products/sample-product" },
    meta: { publishedAt: "2026-05-08T10:00:00.000Z" },
  });
});

test("resolveDetailPageBlocks uses entry ids for detailHref when the content route is id-based", async () => {
  const document = createDocument({
    bindings: [
      {
        id: "binding-href",
        blockId: "hero",
        propPath: "cta.href",
        source: {
          kind: "computed",
          resolver: "detailHref",
        },
        transform: "text",
      },
    ],
  });

  const resolved = await resolveDetailPageBlocks({
    document,
    entry: createEntry(),
    contentType,
    preview: false,
    contentRoutes: [
      {
        type: contentType.slug,
        listPath: "/products",
        detailPath: "/products/:id",
        enabled: true,
      },
    ],
  });

  expect(resolved[0]?.data).toMatchObject({
    cta: { href: "/products/entry-1" },
  });
});

test("resolveDetailPageBlocks returns a machine-readable error for missing required bindings", async () => {
  const document = createDocument({
    bindings: [
      {
        id: "binding-required",
        blockId: "hero",
        propPath: "headline",
        source: {
          kind: "entry-field",
          field: "summary",
        },
        transform: "text",
        required: true,
      },
    ],
  });

  await expect(
    resolveDetailPageBlocks({
      document,
      entry: createEntry(),
      contentType,
      preview: false,
    })
  ).rejects.toMatchObject({
    code: "detail_page_binding_missing_required",
    bindingId: "binding-required",
  });
});

test("resolveDetailPageBlocks uses fallback for optional missing bindings", async () => {
  const document = createDocument({
    bindings: [
      {
        id: "binding-fallback",
        blockId: "hero",
        propPath: "subhead",
        source: {
          kind: "entry-field",
          field: "summary",
        },
        transform: "text",
        fallback: "Fallback summary",
      },
    ],
  });

  const resolved = await resolveDetailPageBlocks({
    document,
    entry: createEntry(),
    contentType,
    preview: false,
  });

  expect(resolved[0]?.data).toMatchObject({
    subhead: "Fallback summary",
  });
});

test("detail page bindings reject secret-like field paths during document normalization", () => {
  expect(() =>
    createDocument({
      bindings: [
        {
          id: "binding-secret",
          blockId: "hero",
          propPath: "headline",
          source: {
            kind: "entry-field",
            field: "apiKey",
          },
          transform: "text",
        },
      ],
    })
  ).toThrow("detail_page_document_invalid");
});

test("resolveDetailPageBlocks mirrors resolveFormRuntimeData for formContext bindings", async () => {
  const resolveFormRuntimeData = vi.fn(async () => ({
    formId: "form-1",
    formName: "Contact form",
    description: "Ask about the offer",
    status: "published",
    successMessage: "Thanks",
    successRedirectUrl: null,
    settings: getDefaultFormSettings(),
    submissionAccess: "public" as const,
    submissionNonce: "nonce-1",
    botProtection: {
      provider: "recaptcha_v3" as const,
      siteKey: "site-key-1",
      action: "public_write" as const,
    },
    fields: [],
  }));
  const document = createDocument({
    blocks: [
      {
        id: "form-block",
        type: "form-embed",
        data: {
          formId: "form-1",
        },
      },
    ],
    bindings: [
      {
        id: "binding-form-context",
        blockId: "form-block",
        propPath: "resolved",
        source: {
          kind: "computed",
          resolver: "formContext",
        },
        required: true,
      },
    ],
  });

  const resolved = await resolveDetailPageBlocks(
    {
      document,
      entry: createEntry(),
      contentType,
      preview: false,
    },
    {
      resolveFormRuntimeData: resolveFormRuntimeData as NonNullable<
        DetailPageBindingResolverDeps["resolveFormRuntimeData"]
      >,
    }
  );

  expect(resolveFormRuntimeData).toHaveBeenCalledWith("form-1", { preview: false });
  expect(resolved[0]?.data).toMatchObject({
    formId: "form-1",
    resolved: {
      formId: "form-1",
      submissionNonce: "nonce-1",
      botProtection: {
        provider: "recaptcha_v3",
        siteKey: "site-key-1",
        action: "public_write",
      },
    },
  });
});

test("resolveDetailPageRelatedItems reuses published collection entries and clamps the result size", async () => {
  const document = createDocument({
    related: [
      {
        id: "related-products",
        kind: "same-content-type",
        label: "Related products",
        limit: 999,
        excludeCurrentEntry: true,
      },
    ],
  });
  const entry = createEntry();
  const listEntries = vi.fn(async () =>
    Array.from({ length: 30 }, (_, index) => ({
      ...entry,
      id: index === 0 ? entry.id : `entry-${index + 1}`,
      slug: index === 0 ? entry.slug : `entry-${index + 1}`,
      title: index === 0 ? entry.title : `Entry ${index + 1}`,
      status: index % 5 === 0 ? "draft" : "published",
      data: {
        headline: `Headline ${index + 1}`,
      },
    }))
  );
  const mapEntriesToContentListItems = vi.fn(
    async (entries: Array<{ id: string; title: string; status: string }>) =>
      entries.map((current) => ({
        id: current.id,
        title: current.title,
        slug: current.id,
        href: `/products/${current.id}`,
        excerpt: undefined,
        imageSrc: undefined,
        imageAlt: undefined,
        tags: [],
        authorName: undefined,
        publishedAt: "2026-05-08T10:00:00.000Z",
        status: "published",
      }))
  );

  const items = await resolveDetailPageRelatedItems(
    {
      document,
      entry,
      contentType,
      preview: false,
      binding: {
        id: "binding-related",
        blockId: "related-block",
        propPath: "items",
        source: {
          kind: "computed",
          resolver: "relatedItems",
        },
      },
      block: document.blocks[0]!,
      schemaFields: new Map(),
    },
    {
      listEntries: listEntries as NonNullable<DetailPageBindingResolverDeps["listEntries"]>,
      mapEntriesToContentListItems,
    }
  );

  expect(listEntries).toHaveBeenCalledWith(contentType.id);
  expect(mapEntriesToContentListItems).toHaveBeenCalledTimes(1);
  expect(mapEntriesToContentListItems.mock.calls[0]?.[0]).toHaveLength(24);
  expect(
    mapEntriesToContentListItems.mock.calls[0]?.[0].every(
      (current) => current.status === "published"
    )
  ).toBe(true);
  expect(
    mapEntriesToContentListItems.mock.calls[0]?.[0].some((current) => current.id === entry.id)
  ).toBe(false);
  expect(items).toHaveLength(24);
});
