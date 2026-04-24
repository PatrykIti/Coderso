import { expect, test } from "bun:test";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapTaxonomyDomainError,
  mapTaxonomyRouteError,
  registerTaxonomyRoutes,
} from "../../../core/server/routes/taxonomyRoutes";

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

test("taxonomy routes are registered", () => {
  const { router, routes } = makeRouter();

  registerTaxonomyRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /content-types/:id/taxonomies",
      "PATCH /content-types/:id/taxonomies",
      "GET /content-types/:id/terms",
      "GET /taxonomies/:id/terms",
      "POST /taxonomies/:id/terms",
      "PATCH /terms/:id",
      "DELETE /terms/:id",
    ])
  );
});

test("taxonomy route mapper preserves known domain errors", () => {
  const missingTerm = mapTaxonomyDomainError(new Error("taxonomy_term_missing"));
  const missingTaxonomy = mapTaxonomyDomainError(new Error("taxonomy_not_found"));
  const duplicateSlug = mapTaxonomyDomainError({
    code: "23505",
    constraint: "content_terms_taxonomy_slug_idx",
  });

  expect(missingTerm).toBeInstanceOf(ApiError);
  expect(missingTerm?.code).toBe("taxonomy_term_missing");
  expect(missingTerm?.status).toBe(404);
  expect(missingTaxonomy).toBeInstanceOf(ApiError);
  expect(missingTaxonomy?.code).toBe("taxonomy_not_found");
  expect(missingTaxonomy?.status).toBe(404);
  expect(duplicateSlug).toBeInstanceOf(ApiError);
  expect(duplicateSlug?.code).toBe("term_slug_duplicate");
  expect(duplicateSlug?.status).toBe(400);
});

test("taxonomy route mapper hides unexpected raw database errors", () => {
  const mapped = mapTaxonomyRouteError(
    new Error('Failed query: select "content_terms"."id" from "content_terms"')
  );

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped.code).toBe("taxonomy_unexpected_error");
  expect(mapped.status).toBe(500);
  expect(mapped.message).toBe("Could not load taxonomy terms.");
  expect(mapped.message).not.toContain("select");
  expect(mapped.message).not.toContain("Failed query");
});
