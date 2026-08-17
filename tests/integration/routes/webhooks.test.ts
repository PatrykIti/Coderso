import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapWebhookError,
  registerWebhooksRoutes,
} from "../../../core/server/routes/webhooksRoutes";

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

test("registerWebhooksRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerWebhooksRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings/webhooks",
      "POST /settings/webhooks",
      "PATCH /settings/webhooks/:id",
      "DELETE /settings/webhooks/:id",
      "GET /settings/webhooks/:id/deliveries",
      "POST /settings/webhooks/:id/test",
    ])
  );
});

test("mapWebhookError maps service errors to ApiError (TASK-567)", () => {
  const mapped = mapWebhookError(new Error("webhook_url_invalid"));
  expect(mapped).toBeInstanceOf(ApiError);
  expect((mapped as ApiError).code).toBe("webhook_url_invalid");
  expect((mapped as ApiError).status).toBe(400);

  expect((mapWebhookError(new Error("webhook_name_required")) as ApiError).status).toBe(400);
  expect((mapWebhookError(new Error("webhook_url_required")) as ApiError).status).toBe(400);
  expect((mapWebhookError(new Error("webhook_events_required")) as ApiError).status).toBe(400);
  expect((mapWebhookError(new Error("webhook_not_found")) as ApiError).status).toBe(404);

  // Unknown errors pass through so the global handler owns them.
  expect(mapWebhookError(new Error("something_else"))).toBeNull();
  expect(mapWebhookError("not-an-error")).toBeNull();
});
