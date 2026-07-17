import { expect, test } from "bun:test";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import { createTestPageData } from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan upserts menu items without duplicates", async () => {
  const deps = createDeps();
  const plan: AssistantActionPlan = {
    id: "plan-menu-item",
    status: "ready",
    intentId: "menu-item",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Add menu item",
    answer: "I can add a menu item.",
    summary: "Add products to the primary menu.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-products",
        type: "menu.item.upsert",
        title: "Add products menu item",
        description: "Add products catalog link to navigation.",
        input: {
          menuId: "menu-primary",
          label: "Products",
          href: "/products",
          orderIndex: 0,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("create");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "menu",
      targetKey: "menu-primary",
      optional: false,
    },
    {
      actionId: null,
      targetType: "permission",
      targetKey: "menus:write",
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.resourceId).toBe("menu-item-1");
  expect(executed.results[0]?.publicHref).toBe("/products");
  expect(deps.__state.menuItemsByMenu.get("menu-primary")).toHaveLength(1);

  const menuAction = plan.actions[0];
  if (!menuAction || menuAction.type !== "menu.item.upsert") {
    throw new Error("missing_menu_action");
  }
  const updatedAction: Extract<AssistantPlannedAction, { type: "menu.item.upsert" }> = {
    ...menuAction,
    input: {
      ...menuAction.input,
      label: "Products Catalog",
    },
  };
  const updatedPlan: AssistantActionPlan = {
    ...plan,
    id: "plan-menu-item-update",
    actions: [updatedAction],
  };
  const updatePreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(updatePreview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan: updatedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-2",
    },
    deps
  );
  expect(deps.__state.menuItemsByMenu.get("menu-primary")).toHaveLength(1);
  expect(deps.__state.menuItemsByMenu.get("menu-primary")?.[0]?.label).toBe("Products Catalog");

  const noopPreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan creates menus and resolves menu item locators", async () => {
  const deps = createDeps();
  const plan: AssistantActionPlan = {
    id: "plan-menu-locator",
    status: "ready",
    intentId: "menu-locator",
    promptKind: "setup_request",
    intentFamily: "unknown",
    title: "Create navigation menu",
    answer: "I can create navigation and links.",
    summary: "Create primary menu and one link.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-primary",
        type: "menu.upsert",
        title: "Create primary menu",
        description: "Create the primary navigation menu.",
        input: {
          name: "Primary navigation",
          location: "primary",
          status: "published",
        },
      },
      {
        id: "menu-primary-home",
        type: "menu.item.upsert",
        title: "Add home link",
        description: "Add the home link to primary navigation.",
        input: {
          menuId: {
            kind: "action-result",
            actionId: "menu-primary",
            resourceType: "menu",
            field: "id",
          },
          label: "Start",
          href: "/",
          orderIndex: 0,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes[1]?.dependencies[0]).toEqual({
    actionId: "menu-primary",
    targetType: "menu",
    targetKey: "menu:menu-primary:id",
    optional: false,
  });

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-locator-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(2);
  expect(deps.__state.menus[0]?.location).toBe("primary");
  expect(deps.__state.menuItemsByMenu.get("menu-1")?.[0]?.href).toBe("/");

  const rerunPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(rerunPreview.readyToExecute).toBe(true);
  expect(rerunPreview.changes.map((change) => change.operation)).toEqual(["noop", "noop"]);

  const rerun = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-locator-2",
    },
    deps
  );

  expect(rerun.summary.failed).toBe(0);
  expect(rerun.summary.noop).toBe(2);
  expect(deps.__state.menuItemsByMenu.get("menu-1")).toHaveLength(1);
});

test("executeAssistantActionPlan updates menu items and preserves unrelated tree", async () => {
  const deps = createDeps();
  deps.__state.menuItemsByMenu.set("menu-primary", [
    {
      id: "menu-products",
      label: "Products",
      href: "/products",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      settings: {},
    },
    {
      id: "menu-about",
      label: "About",
      href: "/about",
      pageId: null,
      parentId: null,
      orderIndex: 1,
      settings: {},
    },
  ]);
  const plan: AssistantActionPlan = {
    id: "plan-menu-item-domain-update",
    status: "ready",
    intentId: "menu-item-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update menu item",
    answer: "I can update the selected menu item.",
    summary: "Update menu item.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-products-update",
        type: "menu.item.update",
        title: "Update Products menu item",
        description: "Update selected menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
          patch: {
            label: "Products Catalog",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.menuItemsByMenu.get("menu-primary")?.map((item) => item.label)).toEqual([
    "Products Catalog",
    "About",
  ]);
});

test("executeAssistantActionPlan upserts seo documents for known targets", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Products",
    slug: "/products",
    data: createTestPageData(),
  });
  const plan: AssistantActionPlan = {
    id: "plan-seo-document",
    status: "ready",
    intentId: "seo-document",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Update SEO",
    answer: "I can update SEO metadata.",
    summary: "Update products page SEO.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "seo-products",
        type: "seo.document.upsert",
        title: "Update products SEO",
        description: "Add SEO metadata for the products page.",
        input: {
          targetType: "page",
          targetId: page.id,
          seo: {
            title: "Products Catalog",
            description: "Browse the product catalog.",
            robots: "index,follow",
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
      targetType: "page",
      targetKey: page.id,
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-seo-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.resourceId).toBe("seo-1");
  expect(deps.__state.seoDocuments[0]?.slug).toBe("/products");
  expect(deps.__state.seoDocuments[0]?.title).toBe("Products Catalog");

  const seoAction = plan.actions[0];
  if (!seoAction || seoAction.type !== "seo.document.upsert") {
    throw new Error("missing_seo_action");
  }
  const updatedAction: Extract<AssistantPlannedAction, { type: "seo.document.upsert" }> = {
    ...seoAction,
    input: {
      ...seoAction.input,
      seo: {
        title: "Products Catalog",
        description: "Browse updated products.",
        robots: "index,follow",
      },
    },
  };
  const updatedPlan: AssistantActionPlan = {
    ...plan,
    id: "plan-seo-document-update",
    actions: [updatedAction],
  };
  const updatePreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(updatePreview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan: updatedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-seo-2",
    },
    deps
  );
  expect(deps.__state.seoDocuments).toHaveLength(1);
  expect(deps.__state.seoDocuments[0]?.description).toBe("Browse updated products.");

  const noopPreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan resolves same-plan seo action-result locators", async () => {
  const deps = createDeps();
  await deps.createContentType({
    name: "Services",
    slug: "services-directory",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
      },
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-seo-locator",
    status: "ready",
    intentId: "seo-locator",
    promptKind: "setup_request",
    intentFamily: "services_directory",
    title: "Create sample entry and SEO",
    answer: "I can create a sample entry and SEO.",
    summary: "Create sample entry then SEO by locator.",
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
          },
        },
      },
      {
        id: "seo-service-sample",
        type: "seo.document.upsert",
        title: "Update service SEO",
        description: "Create SEO metadata for the sample service.",
        input: {
          targetType: "entry",
          targetId: {
            kind: "action-result",
            actionId: "entry-service-sample",
            resourceType: "entry",
            field: "id",
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
  expect(preview.changes[1]?.dependencies).toEqual([
    {
      actionId: "entry-service-sample",
      targetType: "entry",
      targetKey: "entry:entry-service-sample:id",
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-seo-locator-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(2);
  expect(deps.__state.seoDocuments[0]?.targetType).toBe("entry");
  expect(deps.__state.seoDocuments[0]?.targetId).toBe("entry-1");
  expect(deps.__state.seoDocuments[0]?.title).toBe("Projekt koncepcyjny | Studio Forma");
});

test("executeAssistantActionPlan deletes menu items while preserving unrelated items", async () => {
  const deps = createDeps();
  deps.__state.menuItemsByMenu.set("menu-primary", [
    {
      id: "menu-products",
      label: "Products",
      href: "/products",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      settings: {},
    },
    {
      id: "menu-products-child",
      label: "Featured",
      href: "/products/featured",
      pageId: null,
      parentId: "menu-products",
      orderIndex: 1,
      settings: {},
    },
    {
      id: "menu-about",
      label: "About",
      href: "/about",
      pageId: null,
      parentId: null,
      orderIndex: 2,
      settings: {},
    },
  ]);
  const plan: AssistantActionPlan = {
    id: "plan-menu-item-delete",
    status: "ready",
    intentId: "menu-item-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Products menu item",
    answer: "I can delete the selected menu item.",
    summary: "Delete menu item.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-products-delete",
        type: "menu.item.delete",
        title: "Delete Products",
        description: "Delete selected menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings[0]).toContain("nested child");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted menu item "Products".');
  expect(deps.__state.menuItemsByMenu.get("menu-primary")?.map((item) => item.id)).toEqual([
    "menu-about",
  ]);
});

test("executeAssistantActionPlan deletes SEO documents through explicit delete actions", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Products",
    slug: "/products",
    data: createTestPageData(),
  });
  const seo = await deps.upsertSeoDocument({
    targetType: "page",
    targetId: page.id,
    slug: "/products",
    title: "Products Catalog",
    description: "Browse the product catalog.",
    robots: "index,follow",
  });
  const plan: AssistantActionPlan = {
    id: "plan-seo-document-delete",
    status: "ready",
    intentId: "seo-document-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Products SEO",
    answer: "I can delete the selected SEO document.",
    summary: "Delete products SEO document.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "seo-products-delete",
        type: "seo.document.delete",
        title: "Delete Products SEO",
        description: "Delete selected SEO document.",
        input: {
          id: seo.id,
          targetType: "page",
          targetId: page.id,
          expectedSlug: "/products",
          expectedTitle: "Products Catalog",
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
      idempotencyKey: "assistant-seo-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe(`Deleted SEO document for page ${page.id}.`);
  expect(deps.__state.seoDocuments).toHaveLength(0);
});
