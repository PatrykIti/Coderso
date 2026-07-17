import { expect, test } from "bun:test";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildProductInquiryCatalogPlan } from "../../../core/services/assistant/blueprints/productInquiryBlueprint";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import { createTestPageIntroSection } from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan preserves trusted media asset ids in page.upsert section blocks", async () => {
  const deps = createDeps();

  const result = await executeAssistantActionPlan(
    {
      plan: {
        id: "plan-page-upsert-media-asset",
        status: "ready",
        intentId: "page-upsert-media-asset",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Create landing page",
        answer: "I can create the landing page.",
        summary: "Create a page that references an existing media-library asset.",
        confidence: 0.84,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "page-media-landing",
            type: "page.upsert",
            title: "Create media landing page",
            description: "Create a landing page with a trusted hero background asset.",
            input: {
              title: "Media Landing",
              slug: "/media-landing",
              status: "draft",
              introTitle: "Media landing",
              introBody: "Showcase the trusted hero asset.",
              sections: [
                createPageSectionV2("content", {
                  id: "media-landing-hero",
                  name: "Media landing hero",
                  blocks: [
                    createPageBlockV2("image", {
                      id: "media-landing-image",
                      props: {
                        assetId: "media-hero",
                        src: "/media/hero.jpg",
                        alt: "Media landing",
                      },
                    }),
                  ],
                }),
              ],
            },
          },
        ],
      },
      actorId: "user-1",
      idempotencyKey: "assistant-page-upsert-media-asset",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (
      deps.__state.pages[0]?.currentData.sections as Array<{
        blocks?: Array<{ props?: { assetId?: string } }>;
      }>
    )?.[0]?.blocks?.[0]?.props?.assetId
  ).toBe("media-hero");
});

test("executeAssistantActionPlan resolves supporting page collection-link listing locators into persisted ids", async () => {
  const deps = createDeps();
  const plan = buildProductInquiryCatalogPlan();
  plan.actions.push({
    id: "page-products-comparison",
    type: "page.upsert",
    title: "Create products comparison page",
    description: "Create a supporting page linked to the products collection.",
    input: {
      title: "Compare Products",
      slug: "/compare-products",
      status: "draft",
      introTitle: "Compare products",
      introBody: "Pick the right model.",
      sections: [
        createPageSectionV2("content", {
          id: "products-comparison-intro",
          name: "Intro",
          blocks: [
            createPageBlockV2("heading", {
              id: "products-comparison-heading",
              props: { text: "Compare products", level: "h2", align: "left" },
            }),
          ],
        }),
      ],
      collectionLink: {
        contentTypeSlug: PRODUCT_CATALOG_PRESET.contentTypeSlug,
        pageRole: "supporting-page",
        compositionKey: "comparison",
        listingQueryName: PRODUCT_CATALOG_PRESET.listingQueryName,
        listingTemplateSlug: PRODUCT_CATALOG_PRESET.listingTemplateSlug,
      },
    },
  });

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link-locators",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (deps.__state.pages[1]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    contentTypeId: deps.__state.contentTypes[0]?.id,
    pageRole: "supporting-page",
    compositionKey: "comparison",
    listingQueryId: deps.__state.listingQueries[0]?.id,
    listingTemplateId: deps.__state.listingTemplates[0]?.id,
  });
});

test("executeAssistantActionPlan accepts supporting page collection-link ids without name locators", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const query = await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: contentType.id,
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });
  const template = await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Products template",
    layout: "grid",
    config: { fields: [] },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-ids",
    status: "ready",
    intentId: "supporting-page-collection-link-ids",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting products page.",
    summary: "Supporting page with persisted collection-link ids.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-products-comparison",
        type: "page.upsert",
        title: "Create products comparison page",
        description: "Create a supporting page linked to the products collection.",
        input: {
          title: "Compare Products",
          slug: "/compare-products",
          status: "draft",
          introTitle: "Compare products",
          introBody: "Pick the right model.",
          sections: [
            createPageSectionV2("content", {
              id: "products-comparison-intro",
              name: "Intro",
              blocks: [
                createPageBlockV2("heading", {
                  id: "products-comparison-heading",
                  props: { text: "Compare products", level: "h2", align: "left" },
                }),
              ],
            }),
          ],
          collectionLink: {
            contentTypeId: contentType.id,
            pageRole: "supporting-page",
            compositionKey: "comparison",
            listingQueryId: query.id,
            listingTemplateId: template.id,
          },
        },
      },
    ],
  };

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link-ids",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (deps.__state.pages[0]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    contentTypeId: contentType.id,
    pageRole: "supporting-page",
    compositionKey: "comparison",
    listingQueryId: query.id,
    listingTemplateId: template.id,
  });
});

test("dryRunAssistantActionPlan flags conflicting supporting page collection-link locators", async () => {
  const deps = createDeps();
  await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createContentType({
    name: "Cars",
    slug: "cars",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-1",
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-preview-conflict",
    status: "ready",
    intentId: "supporting-page-collection-link-preview-conflict",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Preview conflicting supporting page",
    answer: "I can preview a conflicting supporting page.",
    summary: "Supporting page with conflicting collection locators.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-cars-comparison",
        type: "page.upsert",
        title: "Create cars comparison page",
        description: "Create a supporting page linked to the cars collection.",
        input: {
          title: "Compare Cars",
          slug: "/compare-cars",
          status: "draft",
          introTitle: "Compare cars",
          introBody: "Pick the right model.",
          sections: [createTestPageIntroSection("cars-comparison-intro", "Compare cars")],
          collectionLink: {
            contentTypeSlug: "cars",
            pageRole: "supporting-page",
            listingQueryName: "Products Query",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);

  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");
  expect(preview.readyToExecute).toBe(false);
});

test("executeAssistantActionPlan rejects conflicting collection-link content type and listing locators", async () => {
  const deps = createDeps();
  const productsType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createContentType({
    name: "Cars",
    slug: "cars",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: productsType.id,
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-conflict",
    status: "ready",
    intentId: "supporting-page-collection-link-conflict",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting cars page.",
    summary: "Supporting page with conflicting collection locators.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-cars-comparison",
        type: "page.upsert",
        title: "Create cars comparison page",
        description: "Create a supporting page linked to the cars collection.",
        input: {
          title: "Compare Cars",
          slug: "/compare-cars",
          status: "draft",
          introTitle: "Compare cars",
          introBody: "Pick the right model.",
          sections: [createTestPageIntroSection("cars-comparison-intro", "Compare cars")],
          collectionLink: {
            contentTypeSlug: "cars",
            pageRole: "supporting-page",
            listingQueryName: "Products Query",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");
  expect(preview.readyToExecute).toBe(false);

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-supporting-page-collection-link-conflict",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");
});

test("executeAssistantActionPlan rejects stale supporting page collection-link listing ids", async () => {
  const deps = createDeps();
  const productsType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: productsType.id,
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-stale-id",
    status: "ready",
    intentId: "supporting-page-collection-link-stale-id",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting products page.",
    summary: "Supporting page with stale listing ids.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-products-comparison",
        type: "page.upsert",
        title: "Create products comparison page",
        description: "Create a supporting page linked to the products collection.",
        input: {
          title: "Compare Products",
          slug: "/compare-products",
          status: "draft",
          introTitle: "Compare products",
          introBody: "Pick the right model.",
          sections: [createTestPageIntroSection("products-comparison-intro", "Compare products")],
          collectionLink: {
            contentTypeSlug: "products",
            pageRole: "supporting-page",
            listingQueryId: "query-stale",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_missing");
  expect(preview.readyToExecute).toBe(false);

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-supporting-page-collection-link-stale-id",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");
});

test("dryRunAssistantActionPlan flags detail-page upserts whose content type does not exist", async () => {
  const deps = createDeps();

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-missing-content-type",
    status: "ready",
    intentId: "detail-page-missing-content-type",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can preview the detail template.",
    summary: "Preview a detail template with a missing content type.",
    confidence: 0.84,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: {
            schemaVersion: 1,
            id: "24d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            name: "Products detail template",
            contentTypeId: "94d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
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
                id: "hero-1",
                type: "hero",
                variant: "centered",
                data: {
                  headline: "Products detail",
                },
              },
            ],
            bindings: [],
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);

  expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_invalid");
  expect(preview.readyToExecute).toBe(false);
  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-detail-page-missing-content-type",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");
});

test("dryRunAssistantActionPlan flags detail-page expectedExistingId mismatches", async () => {
  const deps = createDeps();
  deps.__state.contentTypes.push({
    id: "64d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", xFieldType: "text" },
      },
    },
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
    updatedAt: new Date("2026-04-10T12:00:00.000Z"),
  });

  const preview = await dryRunAssistantActionPlan(
    {
      plan: {
        id: "plan-detail-page-conflict",
        status: "ready",
        intentId: "detail-page-conflict",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Create detail template",
        answer: "I can preview the detail template.",
        summary: "Preview a detail template with a stale expectedExistingId.",
        confidence: 0.84,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "detail-page-products",
            type: "detail-page.upsert",
            title: "Create products detail template",
            description: "Create a products detail template.",
            input: {
              expectedExistingId: "94d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
              document: {
                schemaVersion: 1,
                id: "24d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
                name: "Products detail template",
                contentTypeId: "64d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
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
                        media: { type: "none", source: "external", src: null },
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
                blocks: [{ id: "hero-1", type: "hero", variant: "centered", data: {} }],
                bindings: [],
              },
            },
          },
        ],
      },
    },
    deps
  );

  expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_conflict");
});
