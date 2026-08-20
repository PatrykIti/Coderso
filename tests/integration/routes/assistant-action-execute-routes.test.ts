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

test("assistant action execute route injects actorId and idempotency key", async () => {
  const { router, routes } = makeRouter();
  const plan = buildHouseProjectsCatalogPlan();
  let receivedActorId: string | null = null;
  let receivedIdempotencyKey: string | null = null;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      executeActions: async (payload) => {
        receivedActorId = payload.actorId;
        receivedIdempotencyKey = payload.idempotencyKey;
        return {
          plan: payload.plan,
          preview: {
            plan: payload.plan,
            changes: [],
            warnings: [],
            readyToExecute: true,
          },
          results: [],
          summary: {
            create: 0,
            update: 0,
            noop: 0,
            failed: 0,
          },
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { plan, idempotencyKey: "assistant-action-1" },
    requestId: "req-execute",
    user: { id: "user-55" },
  });

  expect(receivedActorId).toBe("user-55");
  expect(receivedIdempotencyKey).toBe("assistant-action-1");
  expect(result).toMatchObject({
    summary: {
      create: 0,
    },
  });
});

test("assistant action execute route enforces per-action write permissions", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const plan = {
    id: "plan-per-action-execute",
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
      executeActions: async (payload) => ({
        plan: payload.plan,
        preview: {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [],
        summary: {
          create: 0,
          update: 0,
          noop: 0,
          failed: 0,
        },
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: { plan, idempotencyKey: "assistant-per-action-1" },
    requestId: "req-execute-per-action",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("menus:write");
  expect(requestedPermissions).toContain("forms:write");
  expect(requestedPermissions).toContain("media:read");
  expect(requestedPermissions).toContain("content:write");
  expect(requestedPermissions).toContain("content:publish");
});

test("assistant action execute preserves the settings-only route-link permission boundary", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
    service: {
      executeActions: async (payload) => ({
        plan: payload.plan,
        preview: {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [],
        summary: {
          create: 0,
          update: 1,
          noop: 0,
          failed: 0,
        },
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: {
      idempotencyKey: "assistant-content-route-execute-1",
      plan: {
        id: "plan-content-route-execute",
        status: "ready",
        intentId: "content-route-execute",
        title: "Update content route",
        answer: "Update content route",
        summary: "Update content route",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "route-link",
            type: "setting.content-route.upsert",
            title: "Update route link",
            description: "Update route link",
            input: {
              typeSlug: "products",
              listPath: "/products",
              detailPath: "/products/:slug",
              enabled: true,
              detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            },
          },
        ],
      },
    },
    requestId: "req-content-route-execute",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("settings:write");
  expect(requestedPermissions).not.toContain("content:write");
  expect(requestedPermissions).not.toContain("content:publish");
});

test("assistant action execute route enforces kit permission for site-kit plans", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => {
      validateCalls += 1;
    },
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "llm-guide",
        retrievalBackend: "db",
        llmAvailable: true,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
      executeActions: async (payload) => ({
        plan: payload.plan,
        preview: {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [
          {
            actionId: "site-kit-install-automotive-workshop",
            type: "site-kit.install",
            targetType: "site-kit",
            targetKey: "automotive-workshop",
            operation: "create",
            status: "success",
            resourceId: "run-1",
            adminHref: "/admin/advanced/solution-kits",
            publicHref: null,
            message: `Actor ${payload.actorId} executed site kit.`,
            details: {
              siteKit: {
                validation: {
                  runId: "run-1",
                  status: "ok",
                  unresolvedItems: [],
                  checks: [],
                },
              },
            },
          },
        ],
        summary: {
          create: 1,
          update: 0,
          noop: 0,
          failed: 0,
        },
      }),
    },
  });

  const plan = {
    id: "plan-site-kit-automotive-workshop",
    status: "ready",
    intentId: "site-kit-install",
    title: "Automotive Workshop Site Kit",
    answer: "Plan ready",
    summary: "Install site kit",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Install selected site kit steps.",
        input: {},
      },
    ],
  };

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { plan, idempotencyKey: "assistant-site-kit-1" },
    user: { id: "user-99" },
    requestId: "req-site-kit-1",
  });

  expect(validateCalls).toBe(1);
  expect(requestedPermissions).toContain("solution-kits:write");
  expect(result).toMatchObject({
    summary: {
      create: 1,
    },
  });
});

test("assistant action execute maps site-kit validate errors through generic route", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "llm-guide",
        retrievalBackend: "db",
        llmAvailable: true,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
      executeActions: async () => {
        throw new Error("site_builder_run_not_found");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = {
    id: "plan-site-kit-validate",
    status: "ready",
    intentId: "site-kit-validate",
    title: "Validate site kit run",
    answer: "Validate run",
    summary: "Validate run",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-validate-run",
        type: "site-kit.validate",
        title: "Validate run",
        description: "Validate site kit run.",
        input: {
          runId: "0f7573a3-9ac9-4bc7-a492-fb11da09c37e",
        },
      },
    ],
  };

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan, idempotencyKey: "assistant-site-kit-validate-1" },
      requestId: "req-site-kit-2",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("site_builder_run_not_found");
    expect(apiError.status).toBe(404);
    expect(apiError.details).toEqual({ requestId: "req-site-kit-2" });
  }
});

test("assistant action execute maps idempotency conflicts", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      executeActions: async () => {
        throw new Error("assistant_action_idempotency_conflict");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = buildHouseProjectsCatalogPlan();

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan, idempotencyKey: "assistant-action-conflict-1" },
      requestId: "req-idempotency-conflict",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_action_idempotency_conflict");
    expect(apiError.status).toBe(409);
    expect(apiError.details).toEqual({ requestId: "req-idempotency-conflict" });
  }
});
