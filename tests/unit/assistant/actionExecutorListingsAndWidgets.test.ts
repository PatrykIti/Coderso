import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan deletes widget templates through explicit delete actions", async () => {
  const deps = createDeps();
  const now = new Date("2026-04-10T12:00:00.000Z");
  deps.__state.widgetTemplates.push({
    id: "template-1",
    name: "Contact CTA",
    description: null,
    category: "Marketing",
    status: "published",
    blocks: [],
    settings: {},
    createdAt: now,
    updatedAt: now,
  });
  const plan: AssistantActionPlan = {
    id: "plan-delete-contact-template",
    status: "ready",
    intentId: "widget-template-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Contact CTA",
    answer: "I can delete the selected widget template.",
    summary: "Delete active widget template Contact CTA.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "widget-template-delete-contact",
        type: "widget-template.delete",
        title: "Delete Contact CTA",
        description: "Delete selected widget template.",
        input: {
          id: "template-1",
          name: "Contact CTA",
          expectedStatus: "published",
          expectedCategory: "Marketing",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings).toContain(
    "This reusable widget template may be referenced by pages or other templates."
  );
  expect(preview.changes[0]?.warnings).toContain("This widget template is published.");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-widget-template-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted widget template "Contact CTA".');
  expect(await deps.getWidgetTemplate("template-1")).toBeNull();
});

test("executeAssistantActionPlan updates widget template metadata and preserves blocks", async () => {
  const deps = createDeps();
  const now = new Date("2026-04-10T12:00:00.000Z");
  deps.__state.widgetTemplates.push({
    id: "template-1",
    name: "Contact CTA",
    description: null,
    category: "Marketing",
    status: "draft",
    blocks: [{ id: "hero-1", type: "hero", data: { headline: "Hello" } }],
    settings: {
      layout: {
        wrapper: {
          container: "full",
          padding: { top: "none", bottom: "none" },
          background: {
            color: "transparent",
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
    createdAt: now,
    updatedAt: now,
  });
  const plan: AssistantActionPlan = {
    id: "plan-update-contact-template",
    status: "ready",
    intentId: "widget-template-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact CTA",
    answer: "I can update the selected widget template.",
    summary: "Update active widget template.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "widget-template-update-contact",
        type: "widget-template.update",
        title: "Update Contact CTA",
        description: "Update selected widget template.",
        input: {
          id: "template-1",
          name: "Contact CTA",
          expectedStatus: "draft",
          expectedCategory: "Marketing",
          patch: {
            name: "Contact CTA Updated",
            status: "published",
            settings: {
              wrapperContainer: "narrow",
              sectionGap: "md",
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-widget-template-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(executed.results[0]?.message).toBe('Updated widget template "Contact CTA Updated".');
  expect(deps.__state.widgetTemplates[0]?.name).toBe("Contact CTA Updated");
  expect(deps.__state.widgetTemplates[0]?.status).toBe("published");
  expect(deps.__state.widgetTemplates[0]?.blocks[0]?.id).toBe("hero-1");
  expect(
    (deps.__state.widgetTemplates[0]?.settings.layout as { wrapper?: { container?: string } })
      ?.wrapper?.container
  ).toBe("narrow");
});

test("executeAssistantActionPlan patches widget template block data and preserves siblings", async () => {
  const deps = createDeps();
  const now = new Date("2026-04-10T12:00:00.000Z");
  deps.__state.widgetTemplates.push({
    id: "template-1",
    name: "Hero Template",
    description: null,
    category: "Marketing",
    status: "draft",
    blocks: [
      { id: "hero-1", type: "hero", data: { headline: "Old headline", body: "Keep body" } },
      { id: "text-1", type: "rich-text-section", data: { title: "Keep sibling" } },
    ],
    settings: {},
    createdAt: now,
    updatedAt: now,
  });
  const plan: AssistantActionPlan = {
    id: "plan-template-block-patch",
    status: "ready",
    intentId: "widget-template-block-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Patch template hero",
    answer: "I can patch the selected widget template block.",
    summary: "Patch template hero headline.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "widget-template-block-patch-hero",
        type: "widget-template.block.patch",
        title: "Patch hero headline",
        description: "Patch selected template block.",
        input: {
          id: "template-1",
          name: "Hero Template",
          expectedStatus: "draft",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New headline",
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
      idempotencyKey: "assistant-widget-template-block-patch-1",
    },
    deps
  );

  const firstBlockData = deps.__state.widgetTemplates[0]?.blocks[0]?.data as
    | Record<string, unknown>
    | undefined;
  const secondBlockData = deps.__state.widgetTemplates[0]?.blocks[1]?.data as
    | Record<string, unknown>
    | undefined;
  expect(firstBlockData?.headline).toBe("New headline");
  expect(firstBlockData?.body).toBe("Keep body");
  expect(secondBlockData?.title).toBe("Keep sibling");
});

test("executeAssistantActionPlan deletes listing queries and templates through explicit delete actions", async () => {
  const deps = createDeps();
  const query = await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-products",
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
    description: "Product cards",
    layout: "grid",
    config: { fields: [] },
  });
  const plan: AssistantActionPlan = {
    id: "plan-listing-delete",
    status: "ready",
    intentId: "listing-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete listing resources",
    answer: "I can delete selected listing resources.",
    summary: "Delete listing query and template.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-delete-1",
        type: "listing-query.delete",
        title: "Delete Products Catalog Query",
        description: "Delete selected listing query.",
        input: {
          id: query.id,
          name: "Products Catalog Query",
        },
      },
      {
        id: "listing-template-delete-1",
        type: "listing-template.delete",
        title: "Delete Products Grid",
        description: "Delete selected listing template.",
        input: {
          id: template.id,
          name: "Products Grid",
          slug: "products-grid",
          expectedLayout: "grid",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes.map((change) => change.operation)).toEqual(["delete", "delete"]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(2);
  expect(deps.__state.listingQueries).toHaveLength(0);
  expect(deps.__state.listingTemplates).toHaveLength(0);
});

test("executeAssistantActionPlan blocks listing deletes when page references remain", async () => {
  const deps = createDeps();
  const query = await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-products",
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
    description: "Product cards",
    layout: "grid",
    config: { fields: [] },
  });
  await deps.createPage({
    title: "Products",
    slug: "/products",
    data: {
      blocks: [
        {
          id: "catalog-list",
          type: "content-list",
          data: {
            source: {
              listingQueryId: query.id,
              listingTemplateId: template.id,
            },
          },
        },
      ],
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-listing-delete-blocked",
    status: "ready",
    intentId: "listing-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete listing query",
    answer: "I can delete selected listing query.",
    summary: "Delete listing query.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-delete-1",
        type: "listing-query.delete",
        title: "Delete Products Catalog Query",
        description: "Delete selected listing query.",
        input: {
          id: query.id,
          name: "Products Catalog Query",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.warnings[0]).toContain("referenced by 1 page");
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");
  expect(preview.readyToExecute).toBe(false);

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-listing-delete-blocked-1",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");

  expect(deps.__state.listingQueries).toHaveLength(1);
});

test("executeAssistantActionPlan updates listing query and template config without broad rewrites", async () => {
  const deps = createDeps();
  await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-products",
        includeDrafts: true,
      },
      filters: [{ field: "status", operator: "eq", value: "active" }],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });
  await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Product cards",
    layout: "grid",
    config: {
      columns: 3,
      card: { showImage: true },
    },
  });
  const query = deps.__state.listingQueries[0]!;
  const template = deps.__state.listingTemplates[0]!;
  const plan: AssistantActionPlan = {
    id: "plan-listing-update",
    status: "ready",
    intentId: "listing-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update listing resources",
    answer: "I can update selected listing resources.",
    summary: "Update listing query and template.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-update-1",
        type: "listing-query.update",
        title: "Update Products Query",
        description: "Update selected listing query.",
        input: {
          id: query.id,
          name: query.name,
          patch: {
            limit: 24,
            includeDrafts: false,
          },
        },
      },
      {
        id: "listing-template-update-1",
        type: "listing-template.update",
        title: "Update Products Grid",
        description: "Update selected listing template.",
        input: {
          id: template.id,
          name: template.name,
          slug: template.slug,
          expectedLayout: "grid",
          patch: {
            layout: "list",
            card: { showImage: false },
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(2);
  expect(deps.__state.listingQueries[0]?.query.pagination).toEqual({ limit: 24, offset: 0 });
  expect(deps.__state.listingQueries[0]?.query.sourceConfig).toEqual({
    contentTypeId: "ct-products",
    includeDrafts: false,
  });
  expect(deps.__state.listingQueries[0]?.query.filters).toHaveLength(1);
  expect(deps.__state.listingTemplates[0]?.layout).toBe("list");
  expect(deps.__state.listingTemplates[0]?.config.columns).toBe(3);
  expect(deps.__state.listingTemplates[0]?.config.card).toEqual({ showImage: false });
});

test("listing query upsert blocks ambiguous name matches", async () => {
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
  const queryPayload = {
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries" as const,
      sourceConfig: {
        contentTypeId: contentType.id,
        includeDrafts: false,
      },
      filters: [],
      sort: [{ field: "title", dir: "asc" as const }],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  };
  await deps.createListingQuery(queryPayload);
  await deps.createListingQuery(queryPayload);

  const plan: AssistantActionPlan = {
    id: "plan-ambiguous-listing-query",
    status: "ready",
    intentId: "listing-query-upsert",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update listing query",
    answer: "I can update the listing query.",
    summary: "Update listing query.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-upsert-ambiguous",
        type: "listing-query.upsert",
        title: "Update Products Catalog Query",
        description: "Update selected listing query.",
        input: {
          name: "Products Catalog Query",
          description: "Updated product listing",
          contentTypeSlug: "products",
          fields: ["title", "slug"],
          includeDrafts: false,
          limit: 24,
          sort: [{ field: "title", dir: "asc" }],
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
        idempotencyKey: "assistant-listing-query-upsert-ambiguous",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");

  expect(deps.__state.listingQueries).toHaveLength(2);
  expect(
    deps.__state.listingQueries.every((query) => query.description === "Product listing")
  ).toBe(true);
});
