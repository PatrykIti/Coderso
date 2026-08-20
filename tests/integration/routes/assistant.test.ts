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
      "POST /assistant/model-metadata",
      "POST /assistant/chat",
      "POST /assistant/actions/plan",
      "POST /assistant/actions/dry-run",
      "POST /assistant/actions/execute",
    ])
  );
  expect(paths).not.toContain("POST /assistant/site-builder/plan");
  expect(paths).not.toContain("POST /assistant/site-builder/execute");
  expect(paths).not.toContain("POST /assistant/site-builder/validate");

  expect(requestedPermissions).toEqual([
    "settings:read",
    "settings:write",
    "settings:read",
    "settings:read",
    "settings:read",
    "content:read",
  ]);
});

test("model metadata route validates payload and calls service", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => {
      validateCalls += 1;
    },
    service: {
      getModelMetadata: async () => ({
        model: "openai/gpt-5.4-nano",
        maxInputTokens: 128000,
        maxOutputTokens: 8192,
        supportedParameters: ["max_tokens"],
        source: "provider",
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/model-metadata");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { provider: "openrouter", model: "openai/gpt-5.4-nano" },
    requestId: "req-model-metadata",
    user: { id: "user-1" },
  });

  expect(validateCalls).toBe(1);
  expect(result).toMatchObject({
    model: "openai/gpt-5.4-nano",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
  });
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
        detailLevel: "instruction",
        guideMode: "default",
        answer: "Most relevant locations in docs",
        confidence: 0.9,
        sources: [],
        followUpOptions: [],
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

test("chat route returns clarifying question payload without remapping template", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async () => ({
        mode: "docs-only",
        template: "clarifying_question",
        detailLevel: "medium",
        guideMode: "default",
        answer:
          "I am not confident which product area you mean from the docs yet.\n\nDo you mean:\n- Themes\n- Coderso Widgets and Template Editor",
        confidence: 0.22,
        sources: [],
        followUpOptions: [],
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
    body: { message: "where can I configure colors", mode: "docs-only" },
    requestId: "req-clarify",
    user: { id: "user-3" },
  });

  expect(result).toMatchObject({
    template: "clarifying_question",
    retrievalBackend: "db",
  });
});

test("chat route forwards detail level and guide mode", async () => {
  const { router, routes } = makeRouter();
  let receivedDetailLevel: string | undefined;
  let receivedGuideMode: string | undefined;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async (input) => {
        receivedDetailLevel = input.detailLevel;
        receivedGuideMode = input.guideMode;
        return {
          mode: "docs-only",
          template: "how_to_answer",
          detailLevel: "advanced",
          guideMode: "security",
          answer: "Security answer",
          confidence: 0.72,
          sources: [],
          followUpOptions: [],
          fallbackUsed: false,
          requestedMode: "docs-only",
          effectiveMode: "docs-only",
          retrievalBackend: "db",
          llm: null,
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: {
      message: "how to secure assistant integrations",
      detailLevel: "advanced",
      guideMode: "security",
    },
    requestId: "req-detail-mode",
    user: { id: "user-10" },
  });

  expect(receivedDetailLevel).toBe("advanced");
  expect(receivedGuideMode).toBe("security");
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
