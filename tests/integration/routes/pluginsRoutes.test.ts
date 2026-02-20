import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import { registerPluginsRoutes } from "../../../core/server/routes/pluginsRoutes";

type Handler = (ctx: { body?: unknown }) => Promise<unknown> | unknown;
type Route = { method: string; path: string; handlers: Handler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: Handler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: Handler[]) =>
        routes.push({ method: "POST", path, handlers }),
    },
  };
};

test("registerPluginsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerPluginsRoutes(router, {
    requirePermission: () => async () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /plugins",
      "POST /plugins/manifest/validate",
    ])
  );
});

test("manifest validate route returns ApiError for invalid payload", async () => {
  const { router, routes } = makeRouter();

  registerPluginsRoutes(router, {
    requirePermission: () => async () => undefined,
  });

  const validateRoute = routes.find(
    (route) => route.method === "POST" && route.path === "/plugins/manifest/validate"
  );

  const handler = validateRoute?.handlers.at(-1);
  if (!handler) throw new Error("handler_missing");

  await expect(handler({ body: {} })).rejects.toBeInstanceOf(ApiError);
});
