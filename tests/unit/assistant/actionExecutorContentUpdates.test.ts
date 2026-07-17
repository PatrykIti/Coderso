import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan updates entries and SEO documents through domain services", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        price: { type: "number" },
      },
    },
  });
  const entry = await deps.createEntry(contentType.id, {
    title: "Sample Product",
    slug: "sample-product",
    data: { title: "Sample Product", price: 10 },
    authorId: "user-1",
  });
  const seo = await deps.upsertSeoDocument({
    targetType: "entry",
    targetId: entry.id,
    slug: "sample-product",
    title: "Sample Product SEO",
    description: "Old description.",
  });
  const plan: AssistantActionPlan = {
    id: "plan-entry-seo-update",
    status: "ready",
    intentId: "entry-seo-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update entry and SEO",
    answer: "I can update the selected entry and SEO document.",
    summary: "Update entry and SEO.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-update-1",
        type: "entry.update",
        title: "Update Sample Product",
        description: "Update selected entry.",
        input: {
          id: entry.id,
          contentTypeSlug: "products",
          expectedTitle: "Sample Product",
          expectedSlug: "sample-product",
          expectedStatus: "draft",
          patch: {
            title: "Sample Product Updated",
            values: { title: "Sample Product Updated" },
          },
        },
      },
      {
        id: "seo-update-1",
        type: "seo.document.update",
        title: "Update Sample Product SEO",
        description: "Update selected SEO document.",
        input: {
          id: seo.id,
          targetType: "entry",
          targetId: entry.id,
          expectedSlug: "sample-product",
          expectedTitle: "Sample Product SEO",
          patch: {
            description: "Updated description.",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-seo-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(2);
  expect(deps.__state.entries[0]?.title).toBe("Sample Product Updated");
  expect(deps.__state.entries[0]?.data.price).toBe(10);
  expect(deps.__state.seoDocuments.find((item) => item.id === seo.id)?.description).toBe(
    "Updated description."
  );
});

test("executeAssistantActionPlan attaches existing media references to entries", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        heroImage: { type: "string", xFieldType: "media" },
      },
    },
  });
  const entry = await deps.createEntry(contentType.id, {
    title: "Sample Product",
    slug: "sample-product",
    data: {
      title: "Sample Product",
    },
    authorId: "user-1",
  });
  deps.__state.mediaAssets.push({
    id: "media-1",
    key: "media-1.jpg",
    url: "/media/media-1.jpg",
    originalName: "media-1.jpg",
    type: "image",
    mimeType: "image/jpeg",
    size: 100,
    alt: null,
    title: null,
    caption: null,
    createdBy: "user-1",
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
  });
  const plan: AssistantActionPlan = {
    id: "plan-media-reference",
    status: "ready",
    intentId: "media-reference",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Attach media",
    answer: "I can attach media to an entry.",
    summary: "Attach hero image to draft entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "media-entry-hero",
        type: "media.reference.attach",
        title: "Attach hero image",
        description: "Attach existing media to the hero image field.",
        input: {
          mediaId: "media-1",
          targetType: "entry",
          targetId: entry.id,
          field: "heroImage",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "media",
      targetKey: "media-1",
      optional: false,
    },
    {
      actionId: null,
      targetType: "entry",
      targetKey: entry.id,
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-media-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.entries[0]?.data.heroImage).toBe("media-1");

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-media-2",
    },
    deps
  );
  expect(deps.__state.entries[0]?.data.heroImage).toBe("media-1");
});

test("content route actions preserve, clear, and replace detailPageId links", async () => {
  const deps = createDeps();
  await deps.setSetting("site.contentRoutes", [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
      detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    },
  ]);

  const preservePlan: AssistantActionPlan = {
    id: "plan-route-preserve",
    status: "ready",
    intentId: "route-preserve",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Preserve route link",
    answer: "I can preserve the linked detail page.",
    summary: "Keep the current route link.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "route-blog-preserve",
        type: "setting.content-route.upsert",
        title: "Update blog route",
        description: "Update the route without changing the detail page link.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
        },
      },
    ],
  };

  const preservePreview = await dryRunAssistantActionPlan({ plan: preservePlan }, deps);
  expect(preservePreview.changes[0]?.operation).toBe("noop");
  await executeAssistantActionPlan(
    {
      plan: preservePlan,
      actorId: "user-1",
      idempotencyKey: "assistant-route-preserve-1",
    },
    deps
  );
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");

  const clearPlan: AssistantActionPlan = {
    ...preservePlan,
    id: "plan-route-clear",
    intentId: "route-clear",
    title: "Clear route link",
    actions: [
      {
        id: "route-blog-clear",
        type: "setting.content-route.upsert",
        title: "Clear blog detail page link",
        description: "Clear the linked detail page.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
          detailPageId: null,
        },
      },
    ],
  };
  await executeAssistantActionPlan(
    {
      plan: clearPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-route-clear-1",
    },
    deps
  );
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBeNull();

  const replacePlan: AssistantActionPlan = {
    ...preservePlan,
    id: "plan-route-replace",
    intentId: "route-replace",
    title: "Replace route link",
    actions: [
      {
        id: "route-blog-replace",
        type: "setting.content-route.upsert",
        title: "Replace blog detail page link",
        description: "Set a new linked detail page.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
          detailPageId: "6dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      },
    ],
  };
  await executeAssistantActionPlan(
    {
      plan: replacePlan,
      actorId: "user-1",
      idempotencyKey: "assistant-route-replace-1",
    },
    deps
  );
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBe("6dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test("executeAssistantActionPlan patches listing query filters without rewriting config", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
      },
    },
  });
  await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: contentType.id,
      },
      filters: [],
      sort: [{ field: "title", dir: "asc" }],
      limit: 12,
    },
  });
  const filters = [
    {
      field: "category",
      operator: "eq",
      value: "chairs",
    },
  ];
  const plan: AssistantActionPlan = {
    id: "plan-listing-filters",
    status: "ready",
    intentId: "listing-filters",
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
    title: "Patch listing filters",
    answer: "I can patch listing filters.",
    summary: "Add filters to an existing listing query.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-filters",
        type: "listing-query.filters.patch",
        title: "Add category filter",
        description: "Patch product listing filters.",
        input: {
          listingQueryName: "Products Catalog Query",
          filters,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-filters-1",
    },
    deps
  );
  expect(deps.__state.listingQueries[0]?.query.filters).toEqual(filters);
  expect((deps.__state.listingQueries[0]?.query as { limit?: number } | undefined)?.limit).toBe(12);

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan patches listing template card config without rewriting config", async () => {
  const deps = createDeps();
  await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Product listing template",
    layout: "grid",
    config: {
      columns: 3,
      card: {
        showImage: true,
      },
    },
  });
  const card = {
    showImage: true,
    showPrice: true,
    showStatus: true,
  };
  const plan: AssistantActionPlan = {
    id: "plan-listing-card",
    status: "ready",
    intentId: "listing-card",
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
    title: "Patch listing card",
    answer: "I can patch listing card config.",
    summary: "Add price and status to listing cards.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-card-patch",
        type: "listing-template.card.patch",
        title: "Show price and status",
        description: "Patch listing template card config.",
        input: {
          listingTemplateSlug: "products-grid",
          card,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-card-1",
    },
    deps
  );
  expect(deps.__state.listingTemplates[0]?.config.card).toEqual(card);
  expect(deps.__state.listingTemplates[0]?.config.columns).toBe(3);

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});
