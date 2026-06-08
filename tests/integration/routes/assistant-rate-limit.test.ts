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

test("assistant chat route maps assistant_rate_limited to 429 ApiError", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async () => {
        throw new Error("assistant_rate_limited");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { message: "test" },
      requestId: "req-rate-1",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_rate_limited");
    expect(apiError.status).toBe(429);
  }
});

test("assistant chat route maps assistant_budget_exceeded to 429 ApiError", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async () => {
        throw new Error("assistant_budget_exceeded");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { message: "test" },
      requestId: "req-budget-1",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_budget_exceeded");
    expect(apiError.status).toBe(429);
  }
});

test("assistant action plan route maps assistant_prompt_too_large to 413 ApiError", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      planActions: async () => {
        throw new Error("assistant_prompt_too_large");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { prompt: "x" },
      requestId: "req-prompt-large-1",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_prompt_too_large");
    expect(apiError.status).toBe(413);
  }
});
