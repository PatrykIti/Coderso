import { expect, test } from "bun:test";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

const createDeps = () => createActionExecutorTestDeps().deps;

test("dryRunAssistantActionPlan previews create operations for house projects catalog", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes).toHaveLength(7);
  expect(preview.changes.every((change) => change.operation === "create")).toBe(true);
  expect(preview.changes.find((change) => change.targetType === "detail-page")).toMatchObject({
    dependencies: [
      {
        actionId: "content-type-house-projects-catalog",
        targetType: "content-type",
        targetKey: "content-type:house-projects",
        optional: false,
      },
    ],
  });
  expect(preview.warnings.some((warning) => warning.includes("system list route"))).toBe(true);
});

test("executeAssistantActionPlan creates and reuses draft entry actions", async () => {
  const deps = createDeps();
  await deps.createContentType({
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
  const plan: AssistantActionPlan = {
    id: "plan-entry-draft",
    status: "ready",
    intentId: "entry-draft",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create draft entry",
    answer: "I can create a draft entry.",
    summary: "Create one draft product entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-products-sample",
        type: "entry.upsert-draft",
        title: "Create sample product",
        description: "Create a draft product entry.",
        input: {
          contentTypeSlug: "products",
          title: "Sample Product",
          slug: "sample-product",
          values: {
            title: "Sample Product",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("create");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "content-type",
      targetKey: "products",
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.adminHref).toBe("/admin/advanced/entries/products/entry-1");
  expect(deps.__state.entries[0]?.authorId).toBe("user-1");

  const replayPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(replayPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan creates published sample entries idempotently", async () => {
  const deps = createDeps();
  await deps.createContentType({
    name: "Services",
    slug: "services-directory",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
      },
    },
  });
  deps.__state.contentRoutes.push({
    type: "services-directory",
    listPath: "/uslugi",
    detailPath: "/uslugi/:slug",
    enabled: true,
  });
  const plan: AssistantActionPlan = {
    id: "plan-entry-sample",
    status: "ready",
    intentId: "entry-sample",
    promptKind: "setup_request",
    intentFamily: "services_directory",
    title: "Create sample entry",
    answer: "I can create a public sample entry.",
    summary: "Create one published service entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-service-sample",
        type: "entry.sample.create",
        title: "Publish service sample",
        description: "Create a published service sample.",
        input: {
          contentTypeSlug: "services-directory",
          title: "Projekt koncepcyjny",
          slug: "projekt-koncepcyjny",
          status: "published",
          values: {
            title: "Projekt koncepcyjny",
            summary: "Zakres koncepcji architektonicznej.",
          },
          seo: {
            title: "Projekt koncepcyjny | Studio Forma",
            description: "Poznaj zakres projektu koncepcyjnego.",
            canonicalUrl: "/uslugi/projekt-koncepcyjny",
            robots: "index,follow",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes[0]?.operation).toBe("create");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-sample-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.publicHref).toBe("/uslugi/projekt-koncepcyjny");
  expect(deps.__state.entries).toHaveLength(1);
  expect(deps.__state.entries[0]?.status).toBe("published");
  expect(deps.__state.seoDocuments[0]?.targetId).toBe("entry-1");
  expect(deps.__state.seoDocuments[0]?.robots).toBe("index,follow");

  const replayPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(replayPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan deletes entries through explicit delete actions", async () => {
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
  const entry = await deps.createEntry(contentType.id, {
    title: "Sample Product",
    slug: "sample-product",
    data: { title: "Sample Product" },
    authorId: "user-1",
  });
  const plan: AssistantActionPlan = {
    id: "plan-entry-delete",
    status: "ready",
    intentId: "entry-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete entry",
    answer: "I can delete the active entry.",
    summary: "Delete active entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-delete-1",
        type: "entry.delete",
        title: "Delete Sample Product",
        description: "Delete selected entry.",
        input: {
          id: entry.id,
          contentTypeSlug: "products",
          expectedTitle: "Sample Product",
          expectedSlug: "sample-product",
          expectedStatus: "draft",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted entry "Sample Product".');
  expect(await deps.getEntry(entry.id)).toBeNull();
});

test("executeAssistantActionPlan deletes content types when dependency count is zero", async () => {
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
  const plan: AssistantActionPlan = {
    id: "plan-content-type-delete",
    status: "ready",
    intentId: "content-type-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete content type",
    answer: "I can delete the selected content type.",
    summary: "Delete content type.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "content-type-delete-1",
        type: "content-type.delete",
        title: "Delete Products",
        description: "Delete selected content type.",
        input: {
          id: contentType.id,
          name: "Products",
          slug: "products",
          expectedEntryCount: 0,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-content-type-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted content type "Products".');
  expect(await deps.getContentTypeBySlug("products")).toBeNull();
});

test("executeAssistantActionPlan adds fields to existing content types", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string", title: "Title" },
      },
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-content-type-field-add",
    status: "ready",
    intentId: "content-type-field-add",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Add content type fields",
    answer: "I can add supported fields.",
    summary: "Add fields to an existing content model.",
    confidence: 0.88,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "content-type-field-add-products",
        type: "content-type.field.add",
        title: "Add fields to Products",
        description: "Add fields while preserving existing schema.",
        input: {
          id: contentType.id,
          name: "Products",
          slug: "products",
          fields: [
            { name: "price_amount", label: "Price Amount", type: "number" },
            {
              name: "gallery_images",
              label: "Gallery Images",
              type: "media",
              multiple: true,
              mediaAccept: ["image/*"],
            },
          ],
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes[0]?.operation).toBe("update");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "actor-1",
      idempotencyKey: "assistant-content-type-field-add-1",
    },
    deps
  );

  expect(executed.results[0]?.message).toBe("Content type fields were updated.");
  const updated = await deps.getContentTypeBySlug("products");
  expect(updated?.schema).toMatchObject({
    properties: {
      title: { type: "string", title: "Title" },
      price_amount: { type: "number", title: "Price Amount", xFieldType: "number" },
      gallery_images: {
        type: "array",
        items: { type: "string" },
        xFieldType: "media",
        xFieldConfig: { media: { multiple: true, accept: ["image/*"] } },
      },
    },
  });
});
