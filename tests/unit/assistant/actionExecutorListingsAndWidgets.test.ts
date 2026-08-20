import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

const createDeps = () => createActionExecutorTestDeps().deps;

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
