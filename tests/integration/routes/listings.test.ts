import { expect, test } from "bun:test";

import {
  mapListingError,
  registerListingsRoutes,
} from "../../../core/server/routes/listingsRoutes";

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

test("registerListingsRoutes wires query and template endpoints", () => {
  const { router, routes } = makeRouter();

  registerListingsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /listings/queries",
      "GET /listings/queries/:id",
      "POST /listings/queries",
      "PATCH /listings/queries/:id",
      "DELETE /listings/queries/:id",
      "POST /listings/queries/preview",
      "GET /listings/templates",
      "GET /listings/templates/:id",
      "POST /listings/templates",
      "PATCH /listings/templates/:id",
      "DELETE /listings/templates/:id",
    ])
  );
});

test("mapListingError keeps listings query and template sentinels stable", () => {
  const cases = [
    ["listing_query_invalid", 400],
    ["listing_query_invalid_source_config", 400],
    ["listing_query_invalid_filter_value", 400],
    ["listing_query_invalid_name", 400],
    ["listing_query_update_empty", 400],
    ["listing_query_not_found", 404],
    ["listing_template_invalid", 400],
    ["listing_template_config_invalid", 400],
    ["listing_template_slug_exists", 409],
    ["listing_template_not_found", 404],
  ] as const;

  for (const [code, status] of cases) {
    const mapped = mapListingError(new Error(code));
    expect(mapped?.code).toBe(code);
    expect(mapped?.status).toBe(status);
  }

  expect(mapListingError(new Error("unmapped"))).toBeNull();
  expect(mapListingError("listing_query_invalid")).toBeNull();
});
