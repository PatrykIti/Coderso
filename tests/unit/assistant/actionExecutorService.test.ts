import { expect, test } from "bun:test";

import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "../../../core/services/assistant/siteBuilderExecutor";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";

const createDeps = () => {
  let contentRoutes: ContentRouteSetting[] = [];
  const contentTypes: Array<{ id: string; name: string; slug: string; schema: unknown }> = [];
  const customScreens: Array<{
    id: string;
    name: string;
    contentTypeId: string;
    status: "draft" | "active";
    showInSidebar: boolean;
    sidebarLabel: string | null;
    schemaVersion: 1;
    blocks: Array<Record<string, unknown>>;
    bindings: Array<Record<string, unknown>>;
    capabilities: { mode: "record-view"; writableBindingFields: string[] };
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const listingQueries: Array<{
    id: string;
    name: string;
    description: string | null;
    query: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const listingTemplates: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    layout: "grid" | "list" | "table" | "calendar" | "map";
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const pages: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    currentData: Record<string, unknown>;
  }> = [];
  const forms: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    description: string | null;
    successMessage: string | null;
    submissionAccess: string;
  }> = [];
  const formFields = new Map<string, Array<Record<string, unknown>>>();
  const deps = {
    getSetting: async (key: string) => {
      if (key === "site.contentRoutes") return contentRoutes;
      return null;
    },
    setSetting: async (key: string, value: unknown) => {
      if (key === "site.contentRoutes") {
        contentRoutes = (value as ContentRouteSetting[]).slice();
      }
      return { key, value };
    },
    getContentTypeBySlug: async (slug: string) =>
      contentTypes.find((entry) => entry.slug === slug) ?? null,
    createContentType: async (input: { name: string; slug: string; schema: unknown }) => {
      const record = {
        id: `ct-${contentTypes.length + 1}`,
        name: input.name,
        slug: input.slug,
        schema: input.schema,
      };
      contentTypes.push(record);
      return record;
    },
    updateContentType: async (
      id: string,
      input: { name?: string; slug?: string; schema?: unknown }
    ) => {
      const existing = contentTypes.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined) existing.slug = input.slug;
      if (input.schema !== undefined) existing.schema = input.schema;
      return existing;
    },
    listCustomScreens: async () => customScreens,
    createCustomScreen: async (input: {
      name: string;
      contentTypeId: string;
      status?: "draft" | "active";
      showInSidebar?: boolean;
      sidebarLabel?: string | null;
      blocks?: Array<Record<string, unknown>> | null;
      bindings?: Array<Record<string, unknown>> | null;
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `screen-${customScreens.length + 1}`,
        name: input.name,
        contentTypeId: input.contentTypeId,
        status: input.status ?? "draft",
        showInSidebar: input.showInSidebar === true,
        sidebarLabel: input.sidebarLabel ?? null,
        schemaVersion: 1 as const,
        blocks: input.blocks ?? [],
        bindings: input.bindings ?? [],
        capabilities: { mode: "record-view" as const, writableBindingFields: [] },
        createdAt: now,
        updatedAt: now,
      };
      customScreens.push(record);
      return record;
    },
    updateCustomScreen: async (
      id: string,
      input: {
        name?: string;
        contentTypeId?: string;
        status?: "draft" | "active";
        showInSidebar?: boolean;
        sidebarLabel?: string | null;
        blocks?: Array<Record<string, unknown>> | null;
        bindings?: Array<Record<string, unknown>> | null;
      }
    ) => {
      const existing = customScreens.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.contentTypeId !== undefined) existing.contentTypeId = input.contentTypeId;
      if (input.status !== undefined) existing.status = input.status;
      if (input.showInSidebar !== undefined) existing.showInSidebar = input.showInSidebar;
      if (input.sidebarLabel !== undefined) existing.sidebarLabel = input.sidebarLabel;
      if (input.blocks !== undefined) existing.blocks = input.blocks;
      if (input.bindings !== undefined) existing.bindings = input.bindings;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing;
    },
    listListingQueries: async () => listingQueries,
    createListingQuery: async (input: {
      name: string;
      description: string | null;
      query: Record<string, unknown>;
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `query-${listingQueries.length + 1}`,
        name: input.name,
        description: input.description,
        query: input.query,
        createdAt: now,
        updatedAt: now,
      };
      listingQueries.push(record);
      return record;
    },
    updateListingQuery: async (
      id: string,
      input: { name?: string; description?: string | null; query?: Record<string, unknown> }
    ) => {
      const existing = listingQueries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.description !== undefined) existing.description = input.description;
      if (input.query !== undefined) existing.query = input.query;
      return existing;
    },
    listListingTemplates: async () => listingTemplates,
    createListingTemplate: async (input: {
      name: string;
      slug: string;
      description?: string | null;
      layout?: "grid" | "list" | "table" | "calendar" | "map";
      config?: Record<string, unknown>;
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `template-${listingTemplates.length + 1}`,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        layout: input.layout ?? "grid",
        config: input.config ?? {},
        createdAt: now,
        updatedAt: now,
      };
      listingTemplates.push(record);
      return record;
    },
    updateListingTemplate: async (
      id: string,
      input: {
        name?: string;
        slug?: string | null;
        description?: string | null;
        layout?: "grid" | "list" | "table" | "calendar" | "map";
        config?: Record<string, unknown>;
      }
    ) => {
      const existing = listingTemplates.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined && input.slug !== null) existing.slug = input.slug;
      if (input.description !== undefined) existing.description = input.description;
      if (input.layout !== undefined) existing.layout = input.layout;
      if (input.config !== undefined) existing.config = input.config;
      return existing;
    },
    getPageBySlug: async (slug: string) =>
      pages.find((entry) => entry.slug === slug) ?? null,
    createPage: async (input: {
      title: string;
      slug: string;
      data: Record<string, unknown>;
      authorId?: string;
    }) => {
      const record = {
        id: `page-${pages.length + 1}`,
        title: input.title,
        slug: input.slug,
        status: "draft",
        currentData: input.data,
      };
      pages.push(record);
      return record;
    },
    updatePage: async (
      id: string,
      input: { title?: string; slug?: string; data?: Record<string, unknown> }
    ) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.title !== undefined) existing.title = input.title;
      if (input.slug !== undefined) existing.slug = input.slug;
      if (input.data !== undefined) existing.currentData = input.data;
      return existing;
    },
    publishPage: async (id: string) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      existing.status = "published";
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/pages/pageService"))["publishPage"]>
      >;
    },
    listForms: async () => forms,
    createForm: async (input: {
      name: string;
      slug?: string | null;
      status?: "draft" | "published" | "archived";
      description?: string | null;
      successMessage?: string | null;
      submissionAccess?: "public" | "internal";
    }) => {
      const record = {
        id: `form-${forms.length + 1}`,
        name: input.name,
        slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-"),
        status: input.status ?? "draft",
        description: input.description ?? null,
        successMessage: input.successMessage ?? null,
        submissionAccess: input.submissionAccess ?? "public",
      };
      forms.push(record);
      return record;
    },
    updateForm: async (
      id: string,
      input: {
        name?: string;
        slug?: string | null;
        status?: "draft" | "published" | "archived";
        description?: string | null;
        successMessage?: string | null;
        submissionAccess?: "public" | "internal";
      }
    ) => {
      const existing = forms.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined && input.slug !== null) existing.slug = input.slug;
      if (input.status !== undefined) existing.status = input.status;
      if (input.description !== undefined) existing.description = input.description;
      if (input.successMessage !== undefined) existing.successMessage = input.successMessage;
      if (input.submissionAccess !== undefined) existing.submissionAccess = input.submissionAccess;
      return existing;
    },
    setFormFields: async (formId: string, fields: Array<Record<string, unknown>>) => {
      formFields.set(formId, fields);
      return fields;
    },
    logAudit: async () => ({
      id: "audit-1",
      actorId: "user-1",
      action: "assistant.actions.execute",
      targetType: "assistant-action-plan",
      targetId: "plan-house-projects-catalog",
      metadata: {},
      createdAt: new Date("2026-04-10T12:00:00.000Z"),
    }),
    previewSiteKitPlan: previewGuidedSiteBuilderPlan,
    executeSiteKit: (async (input) => {
      const preview = previewGuidedSiteBuilderPlan(input);
      return {
        ...preview,
        execution: {
          run: {
            id: "run-site-kit-1",
            kitId: preview.selectedKitId,
            mode: input.dryRun ? "dry_run" : "apply",
            status: "success",
            actorId: input.actorId ?? null,
            rollbackOfRunId: null,
            options: {},
            summary: {
              total: 1,
              success: 1,
              failed: 0,
              planned: 0,
              skipped: 0,
              operations: {
                create: 1,
                update: 0,
                noop: 0,
                delete: 0,
                restore: 0,
              },
            },
            error: null,
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            updatedAt: new Date("2026-04-10T12:00:00.000Z"),
            finishedAt: new Date("2026-04-10T12:00:01.000Z"),
          },
          items: [],
          summary: {
            total: 1,
            success: 1,
            failed: 0,
            planned: 0,
            skipped: 0,
            operations: {
              create: 1,
              update: 0,
              noop: 0,
              delete: 0,
              restore: 0,
            },
          },
          manifest: {
            id: preview.selectedKitId,
            title: preview.selectedKitTitle,
            vertical: "test",
            includes: {
              contentTypes: [],
              entries: [],
              widgets: [],
              templates: [],
              forms: [],
              menus: [],
            },
            requiredModules: [],
          },
          templateInstall: null,
        },
        validation: {
          runId: "run-site-kit-1",
          status: "ok",
          unresolvedItems: [],
          checks: [],
        },
      };
    }) as typeof executeGuidedSiteBuilder,
    validateSiteKitRun: (async (input) => ({
      runId: input.runId,
      status: "ok",
      unresolvedItems: [],
      checks: [],
    })) as typeof validateGuidedSiteBuilderRun,
  };

  return Object.assign(deps, {
    __state: {
      contentRoutes,
      contentTypes,
      customScreens,
      listingQueries,
      listingTemplates,
      pages,
      forms,
      formFields,
    },
  });
};

test("dryRunAssistantActionPlan previews create operations for house projects catalog", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes).toHaveLength(6);
  expect(preview.changes.every((change) => change.operation === "create")).toBeTrue();
  expect(preview.warnings.some((warning) => warning.includes("system list route"))).toBeTrue();
});

test("executeAssistantActionPlan creates resources and reuses idempotency key", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-1",
    },
    deps
  );
  const second = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-1",
    },
    deps
  );

  expect(first.summary.failed).toBe(0);
  expect(first.summary.create).toBe(6);
  expect(first.results.some((item) => item.publicHref === "/projekty-domow")).toBeTrue();
  expect(second.summary).toEqual(first.summary);
  expect(second.results).toEqual(first.results);
});

test("executeAssistantActionPlan replays persisted idempotency result", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();
  let saved:
    | {
        idempotencyKey: string;
        actorId: string;
        planId: string;
        planHash: string;
        result: Awaited<ReturnType<typeof executeAssistantActionPlan>>;
      }
    | null = null;

  const persistentDeps = Object.assign(deps, {
    getExecutionResult: async (input: {
      idempotencyKey: string;
      actorId: string;
      planId: string;
      planHash: string;
    }) => {
      if (
        saved &&
        saved.idempotencyKey === input.idempotencyKey &&
        saved.actorId === input.actorId &&
        saved.planId === input.planId &&
        saved.planHash === input.planHash
      ) {
        return saved.result;
      }
      return null;
    },
    saveExecutionResult: async (input: {
      idempotencyKey: string;
      actorId: string;
      planId: string;
      planHash: string;
      result: Awaited<ReturnType<typeof executeAssistantActionPlan>>;
    }) => {
      saved = input;
    },
  });

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-persistent-1",
    },
    persistentDeps
  );
  const second = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-persistent-1",
    },
    persistentDeps
  );

  expect(saved?.planId).toBe(plan.id);
  expect(second).toEqual(first);
});

test("executeAssistantActionPlan propagates idempotency conflicts", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = Object.assign(createDeps(), {
    getExecutionResult: async () => {
      throw new Error("assistant_action_idempotency_conflict");
    },
    saveExecutionResult: async () => undefined,
  });

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-house-projects-conflict-1",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_idempotency_conflict");
});

test("dryRunAssistantActionPlan supports product catalog preset through the same executor contract", async () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes).toHaveLength(6);
  expect(preview.changes.some((change) => change.targetKey === "products")).toBe(true);
  expect(preview.changes.some((change) => change.targetKey === "/produkty")).toBe(true);
});

test("dryRunAssistantActionPlan previews site-kit recommend and install actions", async () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes.map((change) => change.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
  expect(preview.changes[0]?.operation).toBe("noop");
  expect(preview.changes[1]?.operation).toBe("create");
  expect(preview.changes[1]?.details?.siteKit?.plan?.selectedKitId).toBe(
    "automotive-workshop"
  );
});

test("executeAssistantActionPlan delegates site-kit install to guided site-builder executor", async () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-site-kit-install-1",
    },
    createDeps()
  );

  const installResult = result.results.find((item) => item.type === "site-kit.install");
  expect(result.summary.failed).toBe(0);
  expect(result.summary.create).toBe(1);
  expect(result.summary.noop).toBe(1);
  expect(installResult?.resourceId).toBe("run-site-kit-1");
  expect(installResult?.details?.siteKit?.execution?.validation.status).toBe("ok");
});

test("executeAssistantActionPlan refines existing house-project catalog without creating duplicate page", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-initial",
    },
    deps
  );

  const refinementPlan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.create).toBe(0);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "listing-filters")).toBe(true);
});

test("executeAssistantActionPlan adds inquiry form without creating duplicate page", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-form-initial",
    },
    deps
  );

  const refinementPlan = planAssistantActions({
    prompt: "dodaj formularz zapytania do strony szczegolowej",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-form-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.create).toBe(1);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.forms).toHaveLength(1);
  const form = deps.__state.forms[0];
  if (!form) throw new Error("missing_form");
  expect(deps.__state.formFields.get(form.id)?.length).toBeGreaterThan(0);
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "form-embed")).toBe(true);
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
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "listing-filters")).toBe(true);
});
