import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import {
  createTestCustomScreenDefinition,
  createNativeTestCustomScreenDefinition,
} from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan deletes custom screens through explicit delete actions", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "House Projects",
    slug: "house-projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "House Projects Archive",
    contentTypeId: contentType.id,
    status: "active",
    showInSidebar: true,
    sidebarLabel: "House Projects Archive",
    blocks: [],
    bindings: [],
  });
  const plan: AssistantActionPlan = {
    id: "plan-delete-house-project-screen",
    status: "ready",
    intentId: "custom-screen-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete custom screen",
    answer: "I can delete the selected custom screen.",
    summary: "Delete one custom screen matching prefix.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-delete-1",
        type: "custom-screen.delete",
        title: "Delete House Projects Archive",
        description: "Delete selected custom screen.",
        input: {
          id: screen.id,
          name: screen.name,
          expectedNamePrefix: "House Projects",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings).toContain(
    "This active custom screen is shown in the Coderso sidebar."
  );

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-custom-screen-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted custom screen "House Projects Archive".');
  expect(await deps.getCustomScreen(screen.id)).toBeNull();
});

test("executeAssistantActionPlan updates custom screen metadata and binding mode", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Projects",
    slug: "projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "Projects Screen",
    contentTypeId: contentType.id,
    status: "draft",
    showInSidebar: false,
    sidebarLabel: null,
    blocks: [{ id: "hero-1", type: "hero", data: { headline: "Old headline" } }],
    bindings: [
      {
        id: "hero-headline",
        widgetId: "hero-1",
        propPath: "headline",
        field: "title",
        mode: "read",
      },
    ],
  });
  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-update",
    status: "ready",
    intentId: "custom-screen-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update custom screen",
    answer: "I can update the selected custom screen.",
    summary: "Update custom screen metadata and binding.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-binding-set-1",
        type: "custom-screen.binding.set",
        title: "Update Projects Screen binding",
        description: "Update selected custom screen binding.",
        input: {
          id: screen.id,
          name: "Projects Screen",
          expectedStatus: "draft",
          binding: {
            id: "hero-headline",
            blockId: "hero-1",
            propPath: "headline",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
        },
      },
      {
        id: "custom-screen-update-1",
        type: "custom-screen.update",
        title: "Update Projects Screen",
        description: "Update selected custom screen.",
        input: {
          id: screen.id,
          name: "Projects Screen",
          expectedStatus: "draft",
          expectedContentTypeId: contentType.id,
          patch: {
            name: "Projects Admin",
            status: "active",
            collectionRole: "secondary-admin-screen",
            compositionKey: "projects-secondary",
            showInSidebar: true,
            sidebarLabel: "Projects",
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
      idempotencyKey: "assistant-custom-screen-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(2);
  expect(deps.__state.customScreens[0]?.name).toBe("Projects Admin");
  expect(deps.__state.customScreens[0]?.collectionRole).toBe("secondary-admin-screen");
  expect(deps.__state.customScreens[0]?.compositionKey).toBe("projects-secondary");
  expect(deps.__state.customScreens[0]?.showInSidebar).toBe(true);
  expect(deps.__state.customScreens[0]?.bindings[0]?.mode).toBe("readwrite");
  expect(deps.__state.customScreens[0]?.blocks[0]?.id).toBe("hero-1");
});

test("dryRunAssistantActionPlan treats matching custom screen upserts as noop", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "House Projects",
    slug: "house-projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createCustomScreen({
    name: "House Projects",
    contentTypeId: contentType.id,
    status: "active",
    collectionRole: "canonical-admin-screen",
    compositionKey: "house-projects-catalog",
    showInSidebar: true,
    sidebarLabel: "House Projects",
    blocks: [
      {
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: "Record overview",
        },
      },
    ],
    bindings: [
      {
        id: "binding-header-title",
        widgetId: "header-1",
        propPath: "title",
        field: "title",
        mode: "read",
      },
    ],
  });

  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-upsert-noop",
    status: "ready",
    intentId: "custom-screen-upsert",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Upsert custom screen",
    answer: "I can keep the selected custom screen as-is.",
    summary: "Verify custom screen reruns stay noop.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create a dedicated House Projects admin screen",
        description: "Keep the current House Projects screen contract.",
        input: {
          name: "House Projects",
          contentTypeSlug: "house-projects",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "house-projects-catalog",
          showInSidebar: true,
          sidebarLabel: "House Projects",
          definition: createTestCustomScreenDefinition(
            [
              {
                id: "header-1",
                type: "screen-record-header",
                data: {
                  title: "Record overview",
                },
              },
            ],
            [
              {
                id: "binding-header-title",
                widgetId: "header-1",
                propPath: "title",
                field: "title",
                mode: "read",
              },
            ]
          ),
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);

  expect(preview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan reuses renamed custom screens by composition metadata", async () => {
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
  const existing = await deps.createCustomScreen({
    name: "Products Admin Renamed",
    contentTypeId: contentType.id,
    status: "active",
    collectionRole: "canonical-admin-screen",
    compositionKey: "product-catalog",
    showInSidebar: true,
    sidebarLabel: "Products",
    blocks: [
      {
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: "Old overview",
        },
      },
    ],
    bindings: [],
  });

  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-upsert-renamed",
    status: "ready",
    intentId: "custom-screen-upsert-renamed",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Upsert product admin screen",
    answer: "I can update the existing product admin screen.",
    summary: "Reuse the canonical screen even if it was renamed.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create products admin screen",
        description: "Keep the canonical Products screen contract.",
        input: {
          name: "Products",
          contentTypeSlug: "products",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "product-catalog",
          showInSidebar: true,
          sidebarLabel: "Products",
          definition: createTestCustomScreenDefinition([
            {
              id: "header-1",
              type: "screen-record-header",
              data: {
                title: "Product overview",
              },
            },
          ]),
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
      idempotencyKey: "assistant-custom-screen-upsert-renamed",
    },
    deps
  );

  expect(executed.summary.failed).toBe(0);
  expect(executed.summary.update).toBe(1);
  expect(deps.__state.customScreens).toHaveLength(1);
  expect(deps.__state.customScreens[0]?.id).toBe(existing.id);
  expect(deps.__state.customScreens[0]?.name).toBe("Products");
  expect(deps.__state.customScreens[0]?.blocks[0]?.data.title).toBe("Product overview");
});

test("executeAssistantActionPlan reuses legacy custom screens by name before metadata exists", async () => {
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
  const existing = await deps.createCustomScreen({
    name: "Products",
    contentTypeId: contentType.id,
    status: "active",
    collectionRole: null,
    compositionKey: null,
    showInSidebar: true,
    sidebarLabel: "Products",
    blocks: [
      {
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: "Legacy overview",
        },
      },
    ],
    bindings: [],
  });

  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-upsert-legacy",
    status: "ready",
    intentId: "custom-screen-upsert-legacy",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Upsert product admin screen",
    answer: "I can update the legacy product admin screen.",
    summary: "Reuse the canonical screen before metadata existed.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create products admin screen",
        description: "Keep the canonical Products screen contract.",
        input: {
          name: "Products",
          contentTypeSlug: "products",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "product-catalog",
          showInSidebar: true,
          sidebarLabel: "Products",
          definition: createTestCustomScreenDefinition([
            {
              id: "header-1",
              type: "screen-record-header",
              data: {
                title: "Product overview",
              },
            },
          ]),
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
      idempotencyKey: "assistant-custom-screen-upsert-legacy",
    },
    deps
  );

  expect(executed.summary.failed).toBe(0);
  expect(executed.summary.update).toBe(1);
  expect(deps.__state.customScreens).toHaveLength(1);
  expect(deps.__state.customScreens[0]?.id).toBe(existing.id);
  expect(deps.__state.customScreens[0]?.collectionRole).toBe("canonical-admin-screen");
  expect(deps.__state.customScreens[0]?.compositionKey).toBe("product-catalog");
  expect(deps.__state.customScreens[0]?.blocks[0]?.data.title).toBe("Product overview");
});

test("executeAssistantActionPlan rejects same-name custom screens owned by other metadata", async () => {
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
  const existing = await deps.createCustomScreen({
    name: "Products",
    contentTypeId: contentType.id,
    status: "active",
    collectionRole: "secondary-admin-screen",
    compositionKey: "comparison",
    showInSidebar: true,
    sidebarLabel: "Products",
    blocks: [
      {
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: "Comparison overview",
        },
      },
    ],
    bindings: [],
  });

  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-upsert-conflicting-metadata",
    status: "ready",
    intentId: "custom-screen-upsert-conflicting-metadata",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Upsert product admin screen",
    answer: "I need the exact screen before updating this admin surface.",
    summary: "Do not overwrite a same-name screen from another composition.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create products admin screen",
        description: "Keep the canonical Products screen contract.",
        input: {
          name: "Products",
          contentTypeSlug: "products",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "product-catalog",
          showInSidebar: true,
          sidebarLabel: "Products",
          definition: createTestCustomScreenDefinition([
            {
              id: "header-1",
              type: "screen-record-header",
              data: {
                title: "Product overview",
              },
            },
          ]),
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
        idempotencyKey: "assistant-custom-screen-upsert-conflicting-metadata",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");

  expect(deps.__state.customScreens).toHaveLength(1);
  expect(deps.__state.customScreens[0]?.id).toBe(existing.id);
  expect(deps.__state.customScreens[0]?.collectionRole).toBe("secondary-admin-screen");
  expect(deps.__state.customScreens[0]?.compositionKey).toBe("comparison");
  expect(deps.__state.customScreens[0]?.blocks[0]?.data.title).toBe("Comparison overview");
});

test("executeAssistantActionPlan rejects ambiguous legacy custom screen name reuse", async () => {
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
  await deps.createCustomScreen({
    name: "Products",
    contentTypeId: contentType.id,
    status: "active",
    collectionRole: null,
    compositionKey: null,
    showInSidebar: true,
    sidebarLabel: "Products",
    blocks: [],
    bindings: [],
  });
  await deps.createCustomScreen({
    name: "Products",
    contentTypeId: contentType.id,
    status: "draft",
    collectionRole: null,
    compositionKey: null,
    showInSidebar: false,
    sidebarLabel: null,
    blocks: [],
    bindings: [],
  });

  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-upsert-ambiguous-legacy",
    status: "ready",
    intentId: "custom-screen-upsert-ambiguous-legacy",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Upsert product admin screen",
    answer: "I need the exact legacy screen before updating this admin surface.",
    summary: "Do not pick between ambiguous legacy screens.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create products admin screen",
        description: "Keep the canonical Products screen contract.",
        input: {
          name: "Products",
          contentTypeSlug: "products",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "product-catalog",
          showInSidebar: true,
          sidebarLabel: "Products",
          definition: createTestCustomScreenDefinition(),
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
        idempotencyKey: "assistant-custom-screen-upsert-ambiguous-legacy",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_plan_not_ready");

  expect(deps.__state.customScreens).toHaveLength(2);
  expect(deps.__state.customScreens.every((entry) => entry.collectionRole === null)).toBe(true);
});

test("executeAssistantActionPlan patches custom screen block data", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Projects",
    slug: "projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "Projects Screen",
    contentTypeId: contentType.id,
    status: "draft",
    showInSidebar: false,
    sidebarLabel: null,
    definition: createNativeTestCustomScreenDefinition([
      { id: "heading-1", type: "heading", data: { text: "Old headline", label: "Keep label" } },
      { id: "text-1", type: "text", data: { content: "Keep sibling" } },
    ]),
  });
  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-block-patch",
    status: "ready",
    intentId: "custom-screen-block-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Patch custom screen block",
    answer: "I can patch the selected custom screen block.",
    summary: "Patch screen heading text.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-block-patch-1",
        type: "custom-screen.block.patch",
        title: "Patch heading",
        description: "Patch selected custom screen block.",
        input: {
          id: screen.id,
          name: "Projects Screen",
          expectedStatus: "draft",
          blockId: "heading-1",
          expectedBlockType: "heading",
          dataPath: ["text"],
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
      idempotencyKey: "assistant-custom-screen-block-patch-1",
    },
    deps
  );

  expect(deps.__state.customScreens[0]?.blocks[0]?.data.text).toBe("New headline");
  expect(deps.__state.customScreens[0]?.blocks[0]?.data.label).toBe("Keep label");
  expect(deps.__state.customScreens[0]?.blocks[1]?.data.content).toBe("Keep sibling");
});

// TASK-569 — definition actions send the loaded revision; metadata PATCHes stay revision-free.
test("definition actions send expectedRevision while metadata PATCHes proceed without one", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Audits",
    slug: "audits",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "Audits Screen",
    contentTypeId: contentType.id,
    status: "draft",
    showInSidebar: false,
    sidebarLabel: null,
    blocks: [{ id: "hero-1", type: "hero", data: { headline: "Old headline" } }],
    bindings: [
      {
        id: "hero-headline",
        widgetId: "hero-1",
        propPath: "headline",
        field: "title",
        mode: "read",
      },
    ],
  });
  expect(screen.revision).toBe(1);

  const plan: AssistantActionPlan = {
    id: "plan-task-569-revision-contract",
    status: "ready",
    intentId: "custom-screen-revision-contract",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Audits Screen",
    answer: "I can update the selected custom screen.",
    summary: "Definition action + metadata patch revision contract.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-binding-set-1",
        type: "custom-screen.binding.set",
        title: "Update Audits Screen binding",
        description: "Update selected custom screen binding.",
        input: {
          id: screen.id,
          name: "Audits Screen",
          expectedStatus: "draft",
          binding: {
            id: "hero-headline",
            blockId: "hero-1",
            propPath: "headline",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
        },
      },
      {
        id: "custom-screen-update-1",
        type: "custom-screen.update",
        title: "Update Audits Screen",
        description: "Update selected custom screen.",
        input: {
          id: screen.id,
          name: "Audits Screen",
          expectedStatus: "draft",
          expectedContentTypeId: contentType.id,
          patch: {
            name: "Audits Admin",
            status: "active",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-task-569-revision-contract-1",
    },
    deps
  );

  expect(executed.summary.failed).toBe(0);
  expect(executed.summary.update).toBe(2);

  const updateCalls = deps.__state.customScreenUpdateCalls;
  const definitionCall = updateCalls[0];
  const metadataCall = updateCalls[1];
  expect(definitionCall?.id).toBe(screen.id);
  expect(definitionCall?.input.definition).toBeDefined();
  expect(definitionCall?.input.expectedRevision).toBe(1);
  expect(metadataCall?.id).toBe(screen.id);
  expect(metadataCall?.input.definition).toBeUndefined();
  expect(metadataCall?.input.expectedRevision).toBeUndefined();
  // Only the definition write bumped the monotonic revision.
  expect(deps.__state.customScreens[0]?.revision).toBe(2);
});

test("custom-screen.upsert update sends the loaded revision (TASK-569)", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Reviews",
    slug: "reviews",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const existing = await deps.createCustomScreen({
    name: "Reviews Admin",
    contentTypeId: contentType.id,
    status: "active",
    collectionRole: "canonical-admin-screen",
    compositionKey: "reviews-catalog",
    showInSidebar: true,
    sidebarLabel: "Reviews",
    blocks: [
      {
        id: "header-1",
        type: "screen-record-header",
        data: { title: "Old overview" },
      },
    ],
    bindings: [],
  });
  expect(existing.revision).toBe(1);

  const plan: AssistantActionPlan = {
    id: "plan-task-569-upsert-revision",
    status: "ready",
    intentId: "custom-screen-upsert-revision",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Upsert reviews admin screen",
    answer: "I can update the existing reviews admin screen.",
    summary: "Upsert sends the loaded revision.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create reviews admin screen",
        description: "Keep the canonical Reviews screen contract.",
        input: {
          name: "Reviews",
          contentTypeSlug: "reviews",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "reviews-catalog",
          showInSidebar: true,
          sidebarLabel: "Reviews",
          definition: createTestCustomScreenDefinition([
            {
              id: "header-1",
              type: "screen-record-header",
              data: { title: "Reviews overview" },
            },
          ]),
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-task-569-upsert-revision-1",
    },
    deps
  );

  expect(executed.summary.failed).toBe(0);
  expect(executed.summary.update).toBe(1);
  const upsertCall = deps.__state.customScreenUpdateCalls[0];
  expect(upsertCall?.id).toBe(existing.id);
  expect(upsertCall?.input.definition).toBeDefined();
  expect(upsertCall?.input.expectedRevision).toBe(1);
  expect(deps.__state.customScreens[0]?.revision).toBe(2);
});
