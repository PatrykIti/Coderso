import { expect, test } from "bun:test";
import {
  mapMediaError,
  registerMediaRoutes,
} from "../../../core/server/routes/mediaRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
      delete: (path: string) => routes.push({ method: "DELETE", path }),
    },
  };
};

test("registerMediaRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerMediaRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /media",
      "POST /media",
      "GET /media/:id",
      "GET /media/:id/usage",
      "PATCH /media/:id",
      "POST /media/:id/dimensions/recover",
      "POST /media/:id/replace",
      "DELETE /media/:id",
    ])
  );
});

test("mapMediaError maps service errors at route boundary", () => {
  expect(mapMediaError(new Error("media_not_found"))?.status).toBe(404);
  expect(mapMediaError(new Error("media_file_too_large"))?.status).toBe(413);
  expect(mapMediaError(new Error("media_storage_unavailable"))?.status).toBe(503);
  expect(mapMediaError(new Error("other_error"))).toBeNull();
});
