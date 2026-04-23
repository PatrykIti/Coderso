import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapSettingsRouteError,
  registerSettingsRoutes,
  resolveSettingsRouteKey,
} from "../../../core/server/routes/settingsRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      patch: (path: string) => routes.push({ method: "PATCH", path }),
    },
  };
};

test("registerSettingsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerSettingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /settings",
      "GET /settings/storage",
      "GET /settings/security",
      "GET /settings/:key",
      "PATCH /settings/storage",
      "PATCH /settings/security",
      "PATCH /settings/:key",
      "PATCH /settings",
    ])
  );
});

test("resolveSettingsRouteKey maps site.baseUrl alias", () => {
  expect(resolveSettingsRouteKey("site.baseUrl")).toBe("site.publicBaseUrl");
  expect(resolveSettingsRouteKey("site.publicBaseUrl")).toBe("site.publicBaseUrl");
});

test("mapSettingsRouteError preserves known settings contract errors", () => {
  const mapped = mapSettingsRouteError(new Error("settings_key_invalid"));

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped.code).toBe("settings_key_invalid");
  expect(mapped.status).toBe(400);
  expect(mapped.message).toBe("Unknown setting key");
});

test("mapSettingsRouteError hides unexpected raw query errors", () => {
  const mapped = mapSettingsRouteError(
    new Error('Failed query: select "key", "value" from "settings"')
  );

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped.code).toBe("settings_error");
  expect(mapped.status).toBe(500);
  expect(mapped.message).toBe("Could not complete settings request.");
  expect(mapped.message).not.toContain("select");
  expect(mapped.message).not.toContain("Failed query");
});
