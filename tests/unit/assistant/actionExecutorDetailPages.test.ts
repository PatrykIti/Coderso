import { expect, test } from "bun:test";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { matchExistingCompositionResources } from "../../../core/services/assistant/blueprints/blueprintExistingResourceMatcher";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import type {
  DetailPageDocument,
  DetailPageDocumentV1,
} from "../../../core/services/content/detailPageTypes";
import type { PageLayoutSettings } from "../../../core/services/pages/layoutSettings";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import { hasPageBlockType } from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

const layoutSettings = {
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
} satisfies PageLayoutSettings;

// Assistant detail-page authoring is schemaVersion 2 sections only
// (TASK-580-03-L06); v1 `blocks` payloads fail closed on write.
const buildV2DetailPageDocument = (input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  name?: string;
  status?: DetailPageDocument["status"];
  heroText?: string;
  bindings?: DetailPageDocument["bindings"];
}): DetailPageDocument => ({
  schemaVersion: 2,
  id: input.id,
  name: input.name ?? "Products detail template",
  contentTypeId: input.contentTypeId,
  contentTypeSlug: input.contentTypeSlug,
  status: input.status ?? "published",
  titlePattern: "{{ title }}",
  settings: {
    template: "detail",
    layout: layoutSettings,
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
          props: { text: input.heroText ?? "Products detail" },
          visibility: { visible: true },
        },
      ],
    },
  ],
  bindings: input.bindings ?? [],
});

test("executeAssistantActionPlan upserts detail-page documents through the content-domain seam", async () => {
  const deps = createDeps();
  const contentType = {
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
  };
  deps.__state.contentTypes.push(contentType);

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-upsert",
    status: "ready",
    intentId: "detail-page-upsert",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: buildV2DetailPageDocument({
            id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeId: contentType.id,
            contentTypeSlug: "stale-products-slug",
            heroText: "Products detail",
          }),
        },
      },
    ],
  };

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-detail-page-upsert-1",
    },
    deps
  );

  expect(first.summary.failed).toBe(0);
  expect(first.summary.create).toBe(1);
  expect(first.results[0]?.adminHref).toBe(
    `/admin/advanced/engine/${contentType.id}/collection/detail-template/34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c`
  );
  expect(deps.__state.detailPages).toHaveLength(1);
  expect(deps.__state.detailPages[0]?.currentDocument.contentTypeSlug).toBe("products");
  expect(deps.__state.detailPages[0]?.publishedDocument?.contentTypeSlug).toBe("products");

  const detailAction = plan.actions[0];
  if (!detailAction || detailAction.type !== "detail-page.upsert") {
    throw new Error("missing_detail_page_action");
  }

  const second = await executeAssistantActionPlan(
    {
      plan: {
        ...plan,
        actions: [
          {
            ...detailAction,
            input: {
              ...detailAction.input,
              document: {
                ...detailAction.input.document,
                name: "Products detail template updated",
                status: "draft",
              },
            },
          },
        ],
      },
      actorId: "user-1",
      idempotencyKey: "assistant-detail-page-upsert-2",
    },
    deps
  );

  expect(second.summary.failed).toBe(0);
  expect(second.summary.update).toBe(1);
  expect(deps.__state.detailPages).toHaveLength(1);
  expect(deps.__state.detailPages[0]?.name).toBe("Products detail template updated");
  expect(deps.__state.detailPages[0]?.status).toBe("draft");
  expect(deps.__state.detailPages[0]?.publishedDocument).toBeNull();
});

test("executeAssistantActionPlan consumes matched existing detail-page ids without creating duplicates", async () => {
  const deps = createDeps();
  const contentType = {
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
  };
  deps.__state.contentTypes.push(contentType);
  const existingDetailPageId = "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
  const plannedDetailPageId = "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
  const existingDocument: DetailPageDocument = buildV2DetailPageDocument({
    id: existingDetailPageId,
    contentTypeId: contentType.id,
    contentTypeSlug: "products",
  });
  deps.__state.detailPages.push({
    id: existingDetailPageId,
    name: existingDocument.name,
    contentTypeId: contentType.id,
    status: "published",
    currentDocument: existingDocument,
    publishedDocument: existingDocument,
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
    updatedAt: new Date("2026-04-10T12:00:00.000Z"),
    publishedAt: new Date("2026-04-10T12:00:00.000Z"),
  });
  deps.__state.contentRoutes.push({
    type: "products",
    listPath: "/products",
    detailPath: "/products/:slug",
    enabled: true,
    detailPageId: existingDetailPageId,
  });

  const plannedDocument: DetailPageDocument = {
    ...existingDocument,
    id: plannedDetailPageId,
    name: "Products detail template updated",
    status: "draft",
  };
  const matched = matchExistingCompositionResources({
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Update products detail template",
        description: "Update the linked products detail template.",
        input: {
          document: plannedDocument,
        },
      },
      {
        id: "route-products",
        type: "setting.content-route.upsert",
        title: "Link products route",
        description: "Link the products route.",
        input: {
          typeSlug: "products",
          listPath: "/products",
          detailPath: "/products/:slug",
          enabled: true,
          detailPageId: plannedDetailPageId,
        },
      },
    ],
    catalog: {
      schemaVersion: 1,
      generatedAt: "2026-05-10T10:00:00.000Z",
      budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
      pages: [],
      posts: [],
      entries: [],
      contentTypes: [
        {
          id: contentType.id,
          slug: contentType.slug,
          name: contentType.name,
          entryCount: 0,
          fields: [],
        },
      ],
      customScreens: [],
      detailPages: [
        {
          id: existingDetailPageId,
          name: existingDocument.name,
          status: "published",
          contentTypeId: contentType.id,
          contentTypeSlug: "products",
          linkedRouteType: "products",
          updatedAt: "2026-04-10T12:00:00.000Z",
          blockCount: 1,
          bindingCount: 0,
        },
      ],
      listings: { queries: [], templates: [] },
      forms: [],
      menus: [],
      seoDocuments: [],
      media: [],
      commerce: { products: [], collections: [] },
      solutionKits: [],
      warnings: [],
    },
  });

  expect(matched.conflicts).toHaveLength(0);
  expect(matched.matches[0]).toMatchObject({
    existingId: existingDetailPageId,
    reason: "canonical_link",
  });

  const result = await executeAssistantActionPlan(
    {
      plan: {
        id: "plan-detail-page-existing-resource-match",
        status: "ready",
        intentId: "detail-page-existing-resource-match",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Update detail template",
        answer: "I can update the existing detail template.",
        summary: "Update a route-linked products detail template.",
        confidence: 0.91,
        assumptions: [],
        questions: [],
        actions: matched.actions,
      },
      actorId: "user-1",
      idempotencyKey: "assistant-detail-page-existing-resource-match-1",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(result.summary.update).toBe(1);
  expect(result.summary.noop).toBe(1);
  expect(deps.__state.detailPages).toHaveLength(1);
  expect(deps.__state.detailPages[0]?.id).toBe(existingDetailPageId);
  expect(deps.__state.detailPages[0]?.name).toBe("Products detail template updated");
  expect(deps.__state.contentRoutes[0]?.detailPageId).toBe(existingDetailPageId);
});

test("executeAssistantActionPlan fails detail-page upserts that reuse an id across content types", async () => {
  const deps = createDeps();
  const productType = {
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
  };
  const servicesType = {
    ...productType,
    id: "74d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Services",
    slug: "services",
  };
  deps.__state.contentTypes.push(productType, servicesType);
  deps.__state.detailPages.push({
    id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Services detail template",
    contentTypeId: servicesType.id,
    status: "draft",
    currentDocument: buildV2DetailPageDocument({
      id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      name: "Services detail template",
      contentTypeId: servicesType.id,
      contentTypeSlug: servicesType.slug,
      status: "draft",
    }),
    publishedDocument: null,
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
    updatedAt: new Date("2026-04-10T12:00:00.000Z"),
    publishedAt: null,
  });

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-content-type-mismatch",
    status: "ready",
    intentId: "detail-page-content-type-mismatch",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template with a conflicting id.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: buildV2DetailPageDocument({
            id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeId: productType.id,
            contentTypeSlug: productType.slug,
            status: "draft",
          }),
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(false);
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_content_type_mismatch");

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-detail-page-content-type-mismatch",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");
});

test("executeAssistantActionPlan fails detail-page upserts with stale expectedExistingId", async () => {
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

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-execute-conflict",
    status: "ready",
    intentId: "detail-page-execute-conflict",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a detail template with a stale expectedExistingId.",
    confidence: 0.91,
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
          document: buildV2DetailPageDocument({
            id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeId: "64d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeSlug: "products",
            status: "draft",
          }),
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(false);
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_conflict");

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-detail-page-execute-conflict",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");
});

test("executeAssistantActionPlan resolves renamed listing resources from existing page state", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-renamed-initial",
    },
    deps
  );

  const query = deps.__state.listingQueries[0];
  const template = deps.__state.listingTemplates[0];
  if (!query || !template) throw new Error("missing_listing_resources");
  query.name = "Renamed editorial query";
  template.slug = "renamed-editorial-template";

  const refinementPlan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-renamed-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.listingQueries).toHaveLength(1);
  expect(deps.__state.listingTemplates).toHaveLength(1);
  expect(hasPageBlockType(deps.__state.pages[0]?.currentData, "collection")).toBe(true);
});

test("executeAssistantActionPlan fails closed on v1-shaped detail-page documents", async () => {
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

  const v1Document: DetailPageDocumentV1 = {
    schemaVersion: 1,
    id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Products detail template",
    contentTypeId: "64d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    contentTypeSlug: "products",
    status: "draft",
    titlePattern: "{{ title }}",
    settings: {
      template: "detail" as const,
      layout: layoutSettings,
    },
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        variant: "centered",
        data: { headline: "Products detail" },
      },
    ],
    bindings: [],
  };

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-v1-rejected",
    status: "ready",
    intentId: "detail-page-v1-rejected",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template from a legacy v1 document.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: v1Document as unknown as DetailPageDocument,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(false);
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_legacy_v1_invalid");

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-detail-page-v1-rejected",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");
  expect(deps.__state.detailPages).toHaveLength(0);
});
