import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { registerAssistantRoutes } from "../../../core/server/routes/assistantRoutes";

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

test("registerAssistantRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /assistant/status",
      "POST /assistant/reindex",
      "POST /assistant/chat",
      "POST /assistant/site-builder/plan",
      "POST /assistant/site-builder/execute",
      "POST /assistant/site-builder/validate",
    ])
  );

  expect(requestedPermissions).toEqual([
    "settings:read",
    "settings:write",
    "settings:read",
    "solution-kits:read",
    "solution-kits:write",
    "solution-kits:read",
  ]);
});

test("chat route calls service and returns payload", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => {
      validateCalls += 1;
    },
    service: {
      chat: async () => ({
        mode: "docs-only",
        template: "location_answer",
        answer: "Most relevant locations in docs",
        confidence: 0.9,
        sources: [],
        fallbackUsed: false,
        requestedMode: "docs-only",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { message: "where is hero visual", mode: "docs-only" },
    requestId: "req-1",
    user: { id: "user-1" },
  });

  expect(validateCalls).toBe(1);
  expect(result).toMatchObject({
    mode: "docs-only",
    retrievalBackend: "db",
    requestedMode: "docs-only",
  });
});

test("chat route maps assistant errors to ApiError with requestId", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async () => {
        throw new Error("assistant_disabled");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { message: "test", mode: "docs-only" },
      requestId: "req-42",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_disabled");
    expect(apiError.status).toBe(403);
    expect(apiError.details).toEqual({ requestId: "req-42" });
  }
});

test("site-builder execute route injects actorId and returns service payload", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => {
      validateCalls += 1;
    },
    service: {
      executeSiteBuilder: async (payload) => ({
        plan: {
          recommendedKitId: "automotive-workshop",
          confidence: 90,
          recommendations: [],
          steps: [],
          settingsPatch: {},
          notes: [],
        },
        selectedKitId: "automotive-workshop",
        selectedKitTitle: "Automotive Workshop",
        enabledStepIds: ["settings", "pages", "qa"],
        actions: [],
        modules: {
          required: [],
          optional: [],
          recommended: [],
        },
        execution: {
          run: {
            id: "run-1",
            kitId: "automotive-workshop",
            mode: "apply",
            status: "success",
            actorId: payload.actorId ?? null,
            rollbackOfRunId: null,
            options: {},
            summary: {
              total: 0,
              success: 0,
              failed: 0,
              planned: 0,
              skipped: 0,
              operations: {
                create: 0,
                update: 0,
                noop: 0,
                delete: 0,
                restore: 0,
              },
            },
            error: null,
            createdAt: new Date("2026-02-20T10:00:00.000Z"),
            updatedAt: new Date("2026-02-20T10:00:00.000Z"),
            finishedAt: new Date("2026-02-20T10:00:01.000Z"),
          },
          items: [],
          summary: {
            total: 0,
            success: 0,
            failed: 0,
            planned: 0,
            skipped: 0,
            operations: {
              create: 0,
              update: 0,
              noop: 0,
              delete: 0,
              restore: 0,
            },
          },
          manifest: {
            id: "automotive-workshop",
            title: "Automotive Workshop",
            vertical: "automotive",
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
          runId: "run-1",
          status: "ok",
          unresolvedItems: [],
          checks: [],
        },
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/site-builder/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: {
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
      selectedKitId: "automotive-workshop",
      enabledStepIds: ["settings", "pages", "qa"],
    },
    user: { id: "user-99" },
    requestId: "req-site-builder-1",
  });

  expect(validateCalls).toBe(1);
  expect(result).toMatchObject({
    selectedKitId: "automotive-workshop",
    validation: {
      status: "ok",
    },
    execution: {
      run: {
        actorId: "user-99",
      },
    },
  });
});

test("site-builder validate route maps known run-not-found errors", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      validateSiteBuilderRun: async () => {
        throw new Error("site_builder_run_not_found");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/site-builder/validate");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: {
        runId: "0f7573a3-9ac9-4bc7-a492-fb11da09c37e",
      },
      requestId: "req-site-builder-2",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("site_builder_run_not_found");
    expect(apiError.status).toBe(404);
    expect(apiError.details).toEqual({ requestId: "req-site-builder-2" });
  }
});
