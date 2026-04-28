import { expect, test } from "bun:test";

import { registerBackupRoutes } from "../../../core/server/routes/backupRoutes";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
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
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
    },
  };
};

test("registerBackupRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerBackupRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /backups",
      "POST /backups",
      "POST /backups/:id/restore",
      "GET /backups/:id/download",
      "GET /backups/schedule",
      "PATCH /backups/schedule",
    ])
  );
});
