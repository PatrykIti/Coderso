import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentTypes, customScreens } from "../../../core/db/schema";
import {
  mapCustomScreenError,
  registerCustomScreenRoutes,
} from "../../../core/server/routes/customScreenRoutes";
import { validate } from "../../../core/server/validation/schemaValidator";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";
import {
  createCustomScreen,
  getCustomScreen,
} from "../../../core/services/customScreens/customScreenService";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
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
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`Missing route ${method} ${path}`);
  return route;
};

const runRoute = async (route: Route, ctx: Partial<RouteContext>) => {
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      params: {},
      query: {},
      body: undefined,
      ...ctx,
    });
    if (output !== undefined) result = output;
  }
  return result;
};

test("registerCustomScreenRoutes wires custom screen endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerCustomScreenRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /custom-screens",
      "GET /custom-screens/:id",
      "POST /custom-screens",
      "PATCH /custom-screens/:id",
      "DELETE /custom-screens/:id",
      "GET /custom-screens/:screenId/entries/:entryId/overrides",
      "PATCH /custom-screens/:screenId/entries/:entryId/overrides",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
  ]);
});

test("mapCustomScreenError maps domain errors to API errors", () => {
  expect(mapCustomScreenError(new Error("custom_screen_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_status_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_definition_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_legacy_write_unsupported"))?.status).toBe(
    400
  );
  expect(mapCustomScreenError(new Error("custom_screen_override_invalid"))?.status).toBe(400);
  expect(mapCustomScreenError(new Error("custom_screen_override_not_found"))?.status).toBe(404);
  expect(mapCustomScreenError(new Error("custom_screen_override_conflict"))?.status).toBe(409);
  expect(mapCustomScreenError(new Error("other_error"))).toBeNull();
});

// TASK-503 — DB-backed persistence of the block style channel via the existing
// PATCH /custom-screens/:id path (no new route). Skips when no DATABASE_URL.
const canConnect = async () => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const trackedScreenIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();

afterEach(async () => {
  if (!hasDb) return;
  const screenIds = [...trackedScreenIds];
  const contentTypeIds = [...trackedContentTypeIds];
  if (screenIds.length > 0) {
    await db.delete(customScreens).where(inArray(customScreens.id, screenIds));
  }
  for (const contentTypeId of contentTypeIds) {
    await deleteContentType(contentTypeId).catch(() => undefined);
    await db
      .delete(contentTypes)
      .where(inArray(contentTypes.id, [contentTypeId]))
      .catch(() => undefined);
  }
  trackedScreenIds.clear();
  trackedContentTypeIds.clear();
});

const seedBoundScreen = async () => {
  const contentType = await createContentType({
    name: `Style Screen ${randomUUID()}`,
    slug: `style-screen-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string", xFieldType: "text" },
      },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const screen = await createCustomScreen({
    name: `Style Screen ${randomUUID()}`,
    contentTypeId: contentType.id,
    definition: buildDefinition(),
  });
  trackedScreenIds.add(screen.id);
  return screen;
};

const buildDefinition = (style?: Record<string, unknown>): CustomScreenDefinition =>
  ({
    schemaVersion: 4,
    listView: {
      columns: [
        {
          id: "system-title",
          source: "system",
          field: "title",
          label: "Record",
          formatter: "text",
          visible: true,
        },
      ],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-1",
            type: "section",
            label: "Details",
            data: { title: "Details" },
            blocks: [
              {
                id: "field-1",
                type: "field",
                data: { label: "Name", value: "" },
                ...(style ? { style } : {}),
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "field-1-value",
          blockId: "field-1",
          propPath: "value",
          source: "entry",
          field: "name",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    },
  }) as CustomScreenDefinition;

const patchScreenDefinition = async (screenId: string, definition: CustomScreenDefinition) => {
  const { router, routes } = makeRouter();
  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });
  const route = findRoute(routes, "PATCH", "/custom-screens/:id");
  return runRoute(route, {
    params: { id: screenId },
    body: { definition },
    user: { id: "44444444-4444-4444-8444-444444444444" },
  });
};

testIfDb(
  "PATCH /custom-screens/:id persists a definition carrying a valid block style and round-trips byte-stable",
  async () => {
    const screen = await seedBoundScreen();
    const style = {
      width: "half",
      minHeight: 120,
      margin: { top: 24, left: 8 },
      padding: { top: 16 },
      align: "center",
    };

    const updated = (await patchScreenDefinition(screen.id, buildDefinition(style))) as Awaited<
      ReturnType<typeof getCustomScreen>
    >;

    const updatedBlock = updated?.definition.editorView.document.sections[0]?.blocks[0];
    expect(updatedBlock?.style).toEqual(style);

    // Independent read round-trips the same style verbatim (write → read identity).
    const reread = await getCustomScreen(screen.id);
    const rereadBlock = reread?.definition.editorView.document.sections[0]?.blocks[0];
    expect(rereadBlock?.style).toEqual(style);
  }
);

testIfDb(
  "PATCH /custom-screens/:id with an unknown block style key rejects 400 at the route edge",
  async () => {
    const screen = await seedBoundScreen();
    // 503-01's Ajv mirror (screenBlockStyleV1Schema, additionalProperties:false)
    // rejects an unknown style key at the route validate() layer BEFORE the service
    // normalizer runs, so the machine-readable rejection is validation_error/400
    // (the service-layer custom_screen_definition_invalid path is pinned in the
    // customScreenService mocked-db suite). Either way the store is never mutated.
    await expect(
      patchScreenDefinition(screen.id, buildDefinition({ width: "half", bogus: 1 }))
    ).rejects.toMatchObject({ status: 400 });

    // The stored definition is untouched — no style leaked through.
    const reread = await getCustomScreen(screen.id);
    const rereadBlock = reread?.definition.editorView.document.sections[0]?.blocks[0];
    expect(rereadBlock?.style).toBeUndefined();
  }
);

test("PATCH custom screen entry overrides rejects unknown envelope keys before service work", async () => {
  const { router, routes } = makeRouter();

  registerCustomScreenRoutes(router, {
    requirePermission: () => async () => undefined,
    validate,
  });

  const route = findRoute(routes, "PATCH", "/custom-screens/:screenId/entries/:entryId/overrides");

  await expect(
    runRoute(route, {
      params: { screenId: "screen-1", entryId: "entry-1" },
      body: { overrides: [], extra: true },
      user: { id: "44444444-4444-4444-8444-444444444444" },
    })
  ).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  });
});
