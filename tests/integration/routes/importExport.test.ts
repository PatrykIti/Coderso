import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import {
  mapImportExportError,
  registerImportExportRoutes,
} from "../../../core/server/routes/importExportRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";

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
    },
  };
};

test("registerImportExportRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerImportExportRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /tools/export",
      "POST /tools/import",
      "POST /tools/import/preview",
    ])
  );
});

test("export route rejects unknown and incompatible query options", async () => {
  const { router, routes } = makeRouter();

  registerImportExportRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = routes.find((item) => item.method === "GET" && item.path === "/tools/export");
  const handler = route?.handlers.at(-1);
  if (!handler) throw new Error("Missing export handler");

  await expect(
    handler({
      params: {},
      query: { extra: "1" },
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 });

  await expect(
    handler({
      params: {},
      query: { target: "settings", include: "menus" },
      body: undefined,
    })
  ).rejects.toMatchObject({ code: "export_include_invalid", status: 400 });
});

test("preview route rejects malformed bundle identifiers before service apply", async () => {
  const { router, routes } = makeRouter();

  registerImportExportRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = routes.find(
    (item) => item.method === "POST" && item.path === "/tools/import/preview"
  );
  const handler = route?.handlers.at(-1);
  if (!handler) throw new Error("Missing preview handler");

  await expect(
    handler({
      params: {},
      query: {},
      body: {
        version: 1,
        exportedAt: "2026-06-01T10:00:00.000Z",
        settings: {},
        menus: [{ id: "not-a-uuid", name: "Main", items: [] }],
        themeProfiles: [],
        adminThemes: { templates: [], profiles: [] },
        redirects: [],
      },
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 });
});

test("mapImportExportError maps known domain failures to ApiError", () => {
  const invalidId = mapImportExportError(new Error("import_menu_id_invalid"));
  expect(invalidId).toBeInstanceOf(ApiError);
  expect(invalidId).toMatchObject({
    code: "import_menu_id_invalid",
    status: 400,
  });

  const duplicateRoutes = mapImportExportError(new Error("theme_routes_duplicate"));
  expect(duplicateRoutes).toBeInstanceOf(ApiError);
  expect(duplicateRoutes).toMatchObject({
    code: "theme_routes_duplicate",
    status: 400,
  });
});
