import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { registerAssistantRoutes } from "../../../core/server/routes/assistantRoutes";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";
import { ASSISTANT_SITE_BUILDER_INTAKE_VERSION } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  requestId?: string;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
    },
  };
};

test("assistant action dry-run route blocks site-kit actions when LLM Guide is unavailable", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = {
    id: "plan-site-kit-install",
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: "Install site kit",
    answer: "I can install the site kit.",
    summary: "Install the selected site kit.",
    confidence: 0.8,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Apply the site kit.",
        input: {
          businessType: "automotive_workshop",
          goals: ["lead_generation"],
          locale: "en",
          preview: {
            selectedKitId: "automotive-workshop",
            selectedKitTitle: "Automotive Workshop",
            enabledStepIds: ["settings"],
            plan: { confidence: 80 },
          },
          selectedKitId: "automotive-workshop",
          enabledStepIds: ["settings"],
          continueOnError: true,
        },
      },
    ],
  };

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan },
      requestId: "req-site-kit-dry-run-unavailable",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_llm_unavailable");
    expect(apiError.status).toBe(409);
    expect(apiError.message).toBe(
      "LLM Guide must be configured before catalog-backed planning or site-kit actions"
    );
    expect(apiError.details).toEqual({ requestId: "req-site-kit-dry-run-unavailable" });
  }
});

test("assistant action execute route blocks site-kit actions when LLM Guide is unavailable", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = {
    id: "plan-site-kit-install",
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: "Install site kit",
    answer: "I can install the site kit.",
    summary: "Install the selected site kit.",
    confidence: 0.8,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Apply the site kit.",
        input: {
          businessType: "automotive_workshop",
          goals: ["lead_generation"],
          locale: "en",
          preview: {
            selectedKitId: "automotive-workshop",
            selectedKitTitle: "Automotive Workshop",
            enabledStepIds: ["settings"],
            plan: { confidence: 80 },
          },
          selectedKitId: "automotive-workshop",
          enabledStepIds: ["settings"],
          continueOnError: true,
        },
      },
    ],
  };

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan, idempotencyKey: "assistant-site-kit-unavailable" },
      requestId: "req-site-kit-execute-unavailable",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_llm_unavailable");
    expect(apiError.status).toBe(409);
    expect(apiError.message).toBe(
      "LLM Guide must be configured before catalog-backed planning or site-kit actions"
    );
    expect(apiError.details).toEqual({ requestId: "req-site-kit-execute-unavailable" });
  }
});

test("assistant action dry-run route forwards plan payload", async () => {
  const { router, routes } = makeRouter();
  const plan = buildHouseProjectsCatalogPlan();
  let receivedPlanId: string | null = null;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      dryRunActions: async (payload) => {
        receivedPlanId = payload.plan.id;
        return {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { plan },
    requestId: "req-dry-run",
    user: { id: "user-1" },
  });

  expect(receivedPlanId).toBe(plan.id);
  expect(result).toMatchObject({
    readyToExecute: true,
  });
});

test("assistant action dry-run route enforces per-action read permissions", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const plan = {
    id: "plan-per-action-dry-run",
    status: "ready",
    intentId: "per-action",
    title: "Per action",
    answer: "Plan",
    summary: "Plan",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "screen-update",
        type: "custom-screen.update",
        title: "Screen update",
        description: "Screen update",
        input: {},
      },
      {
        id: "screen-block",
        type: "custom-screen.block.patch",
        title: "Screen block",
        description: "Screen block",
        input: {},
      },
      { id: "menu", type: "menu.item.upsert", title: "Menu", description: "Menu", input: {} },
      {
        id: "menu-delete",
        type: "menu.item.delete",
        title: "Menu delete",
        description: "Menu delete",
        input: {},
      },
      {
        id: "menu-update",
        type: "menu.item.update",
        title: "Menu update",
        description: "Menu update",
        input: {},
      },
      { id: "entry", type: "entry.delete", title: "Entry", description: "Entry", input: {} },
      {
        id: "entry-update",
        type: "entry.update",
        title: "Entry update",
        description: "Entry update",
        input: {},
      },
      {
        id: "listing-query",
        type: "listing-query.delete",
        title: "Listing query",
        description: "Listing query",
        input: {},
      },
      {
        id: "listing-query-update",
        type: "listing-query.update",
        title: "Listing query update",
        description: "Listing query update",
        input: {},
      },
      {
        id: "listing-template",
        type: "listing-template.delete",
        title: "Listing template",
        description: "Listing template",
        input: {},
      },
      {
        id: "listing-template-update",
        type: "listing-template.update",
        title: "Listing template update",
        description: "Listing template update",
        input: {},
      },
      {
        id: "content-type",
        type: "content-type.delete",
        title: "Content type",
        description: "Content type",
        input: {},
      },
      { id: "form", type: "form.automation.upsert", title: "Form", description: "Form", input: {} },
      {
        id: "form-delete",
        type: "form.delete",
        title: "Form delete",
        description: "Form delete",
        input: {},
      },
      {
        id: "form-archive",
        type: "form.archive",
        title: "Form archive",
        description: "Form archive",
        input: {},
      },
      {
        id: "form-update",
        type: "form.update",
        title: "Form update",
        description: "Form update",
        input: {},
      },
      {
        id: "media",
        type: "media.reference.attach",
        title: "Media",
        description: "Media",
        input: {},
      },
      {
        id: "seo-delete",
        type: "seo.document.delete",
        title: "SEO delete",
        description: "SEO delete",
        input: {},
      },
      {
        id: "seo-update",
        type: "seo.document.update",
        title: "SEO update",
        description: "SEO update",
        input: {},
      },
      { id: "page", type: "page.delete", title: "Page", description: "Page", input: {} },
    ],
  };

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
    service: {
      dryRunActions: async (payload) => ({
        plan: payload.plan,
        changes: [],
        warnings: [],
        readyToExecute: true,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: { plan },
    requestId: "req-dry-run-per-action",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("menus:read");
  expect(requestedPermissions).toContain("forms:read");
  expect(requestedPermissions).toContain("media:read");
});

test("assistant action dry-run route maps unsupported actions to invalid plan error", async () => {
  const { router, routes } = makeRouter();
  const plan = {
    id: "plan-unsupported-action",
    status: "ready",
    intentId: "unsupported",
    title: "Unsupported",
    answer: "Unsupported",
    summary: "Unsupported",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "bad-action",
        type: "database.drop",
        title: "Drop database",
        description: "Unsupported action.",
        input: {},
      },
    ],
  };

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan },
      requestId: "req-unsupported-action",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_action_plan_invalid");
    expect(apiError.status).toBe(400);
    expect(apiError.details).toEqual({ requestId: "req-unsupported-action" });
  }
});

test("assistant action dry-run route rejects invalid content route detailPageId", async () => {
  const { router, routes } = makeRouter();
  const plan = {
    id: "plan-invalid-detail-page-id",
    status: "ready",
    intentId: "invalid-detail-page-id",
    title: "Invalid detail page id",
    answer: "Invalid detail page id",
    summary: "Invalid detail page id",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "route-invalid-detail-page-id",
        type: "setting.content-route.upsert",
        title: "Update route",
        description: "Update route with invalid detailPageId.",
        input: {
          typeSlug: "products",
          listPath: "/products",
          detailPath: "/products/:slug",
          enabled: true,
          detailPageId: "not-a-detail-page-id",
        },
      },
    ],
  };

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan },
      requestId: "req-invalid-detail-page-id",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_action_plan_invalid");
    expect(apiError.status).toBe(400);
    expect(apiError.details).toEqual({ requestId: "req-invalid-detail-page-id" });
  }
});
