import { expect, test } from "vitest";

import { matchExistingCompositionResources } from "../../../core/services/assistant/blueprints/blueprintExistingResourceMatcher";
import type { AssistantPlannedAction } from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "../../../core/services/assistant/adminContextTypes";

const layout = {
  wrapper: {
    container: "default" as const,
    padding: { top: "md" as const, bottom: "lg" as const },
    background: {
      color: "#ffffff",
      image: null,
      media: {
        type: "none" as const,
        source: "external" as const,
        src: null,
      },
    },
  },
  sections: {
    gap: "lg" as const,
    defaults: {
      container: "default" as const,
      padding: { top: "xl" as const, bottom: "xl" as const },
      margin: { top: "none" as const, bottom: "none" as const },
    },
  },
  applyDefaultsToNewBlocks: false,
};

const createCatalog = (
  overrides: Partial<AssistantResourceCatalogSnapshot> = {}
): AssistantResourceCatalogSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-05-10T10:00:00.000Z",
  budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
  pages: [],
  posts: [],
  entries: [],
  contentTypes: [
    { id: "ct-products", slug: "products", name: "Products", entryCount: 0, fields: [] },
  ],
  customScreens: [],
  detailPages: [],
  listings: { queries: [], templates: [] },
  forms: [],
  menus: [],
  seoDocuments: [],
  media: [],
  commerce: { products: [], collections: [] },
  solutionKits: [],
  warnings: [],
  ...overrides,
});

const createDetailPageAction = (
  id: string
): Extract<AssistantPlannedAction, { type: "detail-page.upsert" }> => ({
  id: "detail-page-products",
  type: "detail-page.upsert",
  title: "Create products detail page",
  description: "Create products detail page.",
  input: {
    document: {
      schemaVersion: 2,
      id,
      name: "Products detail",
      contentTypeId: "ct-products",
      contentTypeSlug: "products",
      status: "published",
      titlePattern: "{{ title }}",
      settings: {
        template: "detail",
        layout,
      },
      sections: [
        {
          id: "hero-1",
          type: "hero",
          name: "Hero",
          variant: "centered",
          layout: {
            columns: 1,
            align: "start",
            justify: "start",
            maxWidth: 1080,
            stackVertical: false,
          },
          style: {
            background: "#ffffff",
            backgroundType: "color",
            backgroundImage: null,
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          spacing: {
            paddingTop: 64,
            paddingBottom: 64,
            paddingLeft: 40,
            paddingRight: 40,
            gap: 24,
          },
          visibility: {
            visible: true,
            authOnly: false,
            anchor: null,
            startsAt: null,
            endsAt: null,
          },
          responsive: {},
          blocks: [
            {
              id: "hero-1-heading",
              type: "heading",
              props: { text: "Products detail", level: "h2", align: "left" },
              visibility: { visible: true },
            },
          ],
        },
      ],
      bindings: [],
    },
  },
});

test("matchExistingCompositionResources reuses canonical linked detail pages through stable catalog ids", () => {
  const result = matchExistingCompositionResources({
    actions: [
      createDetailPageAction("detail-planned"),
      {
        id: "route-products",
        type: "setting.content-route.upsert",
        title: "Link products route",
        description: "Link products route.",
        input: {
          typeSlug: "products",
          listPath: "/products",
          detailPath: "/products/:slug",
          enabled: true,
          detailPageId: "detail-planned",
        },
      },
    ],
    catalog: createCatalog({
      detailPages: [
        {
          id: "detail-existing",
          name: "Products detail existing",
          status: "published",
          contentTypeId: "ct-products",
          contentTypeSlug: "products",
          linkedRouteType: "products",
          updatedAt: "2026-05-10T09:00:00.000Z",
          blockCount: 3,
          bindingCount: 2,
        },
      ],
    }),
  });

  expect(result.conflicts).toHaveLength(0);
  expect(result.matches).toContainEqual(
    expect.objectContaining({
      resourceKey: "detail-page:ct-products",
      existingId: "detail-existing",
      status: "matched",
      reason: "canonical_link",
    })
  );
  expect(result.actions[0]).toMatchObject({
    type: "detail-page.upsert",
    input: {
      expectedExistingId: "detail-existing",
      document: {
        id: "detail-existing",
        contentTypeId: "ct-products",
      },
    },
  });
  expect(result.actions[1]).toMatchObject({
    type: "setting.content-route.upsert",
    input: { detailPageId: "detail-existing" },
  });
});

test("matchExistingCompositionResources blocks non-unique listing-query names", () => {
  const result = matchExistingCompositionResources({
    actions: [
      {
        id: "query-products",
        type: "listing-query.upsert",
        title: "Create products query",
        description: "Create products query.",
        input: {
          name: "Products Query",
          contentTypeSlug: "products",
          description: null,
          includeDrafts: false,
          fields: ["title"],
          sort: [],
          limit: 12,
        },
      },
    ],
    catalog: createCatalog({
      listings: {
        queries: [
          {
            id: "query-1",
            name: "Products Query",
            description: null,
            source: "entries",
            contentTypeId: "ct-products",
            taxonomyId: null,
            includeDrafts: false,
            fields: ["title"],
            sort: [],
            limit: 12,
          },
          {
            id: "query-2",
            name: "Products Query",
            description: null,
            source: "entries",
            contentTypeId: "ct-products",
            taxonomyId: null,
            includeDrafts: false,
            fields: ["title"],
            sort: [],
            limit: 12,
          },
        ],
        templates: [],
      },
    }),
  });

  expect(result.conflicts).toEqual([
    expect.objectContaining({
      code: "resource_key_duplicate",
      actionType: "listing-query.upsert",
      resourceKey: "listing-query:Products Query",
    }),
  ]);
  expect(result.matches[0]).toMatchObject({
    status: "unresolved",
    reason: "non_unique_name",
    candidateIds: ["query-1", "query-2"],
  });
});

test("matchExistingCompositionResources reuses pages by persisted collection links", () => {
  const result = matchExistingCompositionResources({
    actions: [
      {
        id: "page-products",
        type: "page.upsert",
        title: "Create products page",
        description: "Create products page.",
        input: {
          title: "Products",
          slug: "/new-products",
          status: "published",
          introTitle: "Products",
          introBody: "Products.",
          collectionLink: {
            contentTypeSlug: "products",
            pageRole: "canonical-list-page",
          },
        },
      },
      {
        id: "route-products",
        type: "setting.content-route.upsert",
        title: "Link products route",
        description: "Link products route.",
        input: {
          typeSlug: "products",
          listPath: "/new-products",
          detailPath: "/products/:slug",
          enabled: true,
        },
      },
    ],
    catalog: createCatalog({
      pages: [
        {
          id: "page-existing",
          title: "Products",
          slug: "/products",
          status: "published",
          collectionLink: {
            contentTypeId: "ct-products",
            pageRole: "canonical-list-page",
            compositionKey: null,
            listingQueryId: "query-products",
            listingTemplateId: "template-products",
          },
        },
      ],
    }),
  });

  expect(result.conflicts).toHaveLength(0);
  expect(result.actions[0]).toMatchObject({
    type: "page.upsert",
    input: { slug: "/products" },
  });
  expect(result.actions[1]).toMatchObject({
    type: "setting.content-route.upsert",
    input: { listPath: "/products" },
  });
});

test("matchExistingCompositionResources keeps media reuse exact-id only", () => {
  const catalog = createCatalog({
    media: [
      {
        id: "media-hero",
        title: "Hero",
        originalName: "hero.png",
        type: "image",
        mimeType: "image/png",
        size: 120,
        alt: "Hero",
        createdAt: "2026-05-10T09:00:00.000Z",
      },
    ],
  });

  const exact = matchExistingCompositionResources({
    actions: [],
    catalog,
    resources: [
      {
        key: "hero-media",
        kind: "media",
        label: "Hero media",
        executable: true,
        actionTypes: ["media.reference.attach"],
        stableTarget: "entry:product.gallery",
        owner: "media.reference.attach",
        metadata: {
          mode: "existing-asset-reference",
          targetKinds: ["entry"],
          assetId: "media-hero",
        },
      },
    ],
  });
  expect(exact.conflicts).toHaveLength(0);
  expect(exact.matches[0]).toMatchObject({
    resourceKey: "hero-media",
    existingId: "media-hero",
    status: "matched",
  });

  const filenameOnly = matchExistingCompositionResources({
    actions: [],
    catalog,
    resources: [
      {
        key: "hero-media",
        kind: "media",
        label: "Hero media",
        executable: true,
        actionTypes: ["media.reference.attach"],
        stableTarget: "entry:product.gallery",
        owner: "media.reference.attach",
        metadata: {
          originalName: "hero.png",
        },
      },
    ],
  });
  expect(filenameOnly.conflicts).toEqual([
    expect.objectContaining({
      code: "media_asset_ambiguous",
      resourceKey: "hero-media",
    }),
  ]);
});
