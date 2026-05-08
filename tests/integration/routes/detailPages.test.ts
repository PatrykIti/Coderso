import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentTypes, detailPageDocuments } from "../../../core/db/schema";
import type { RouteContext } from "../../../core/server/router";
import {
  mapDetailPageError,
  registerDetailPageRoutes,
  type DetailPageRouteHandler,
} from "../../../core/server/routes/detailPageRoutes";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";
import {
  deleteSetting,
  getSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";

type Route = { method: string; path: string; handlers: DetailPageRouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: DetailPageRouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: DetailPageRouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: DetailPageRouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      delete: (path: string, ...handlers: DetailPageRouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedDetailPageIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const rememberSetting = async (key: string) => {
  if (settingSnapshots.has(key)) return;
  const row = await getSettingRecord(key);
  settingSnapshots.set(key, {
    exists: Boolean(row),
    value: row?.value,
  });
};

const restoreSettings = async () => {
  for (const [key, snapshot] of [...settingSnapshots].reverse()) {
    if (snapshot.exists) {
      await setSetting(key, snapshot.value);
    } else {
      await deleteSetting(key);
    }
  }
  settingSnapshots.clear();
};

const cleanupTrackedRows = async () => {
  const detailPageIds = [...trackedDetailPageIds];
  const contentTypeIds = [...trackedContentTypeIds];

  if (detailPageIds.length > 0) {
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, detailPageIds));
  }

  for (const contentTypeId of contentTypeIds) {
    await db
      .delete(detailPageDocuments)
      .where(eq(detailPageDocuments.contentTypeId, contentTypeId));
    await deleteContentType(contentTypeId).catch(() => undefined);
    await db
      .delete(contentTypes)
      .where(eq(contentTypes.id, contentTypeId))
      .catch(() => undefined);
  }

  trackedDetailPageIds.clear();
  trackedContentTypeIds.clear();
};

afterEach(async () => {
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((entry) => entry.method === method && entry.path === path);
  if (!route) throw new Error(`missing route ${method} ${path}`);
  return route;
};

const runRoute = async (
  routes: Route[],
  method: string,
  path: string,
  ctx: Partial<RouteContext> = {}
) => {
  const route = findRoute(routes, method, path);
  let result: unknown;
  for (const handler of route.handlers) {
    const output = await handler({
      params: {},
      query: {},
      body: {},
      ...ctx,
    } as RouteContext);
    if (output !== undefined) result = output;
  }
  return result;
};

const buildDetailPageDocumentInput = (contentTypeId: string, contentTypeSlug: string) => ({
  name: "Products detail template",
  contentTypeId,
  contentTypeSlug,
  status: "draft",
  titlePattern: "{{ title }}",
  settings: {
    template: "detail",
    layout: {},
  },
  blocks: [
    {
      id: "hero",
      type: "hero",
      data: {
        headline: "Products detail",
      },
    },
  ],
  bindings: [
    {
      id: "binding-title",
      blockId: "hero",
      propPath: "headline",
      source: {
        kind: "entry-meta",
        field: "title",
      },
    },
  ],
});

test("registerDetailPageRoutes wires endpoints and permissions", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerDetailPageRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /detail-pages",
      "GET /detail-pages/:id",
      "POST /detail-pages",
      "PATCH /detail-pages/:id",
      "DELETE /detail-pages/:id",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:write",
    "content:write",
  ]);
});

test("mapDetailPageError maps known domain failures", () => {
  expect(mapDetailPageError(new Error("detail_page_not_found"))?.status).toBe(404);
  expect(mapDetailPageError(new Error("detail_page_invalid"))?.status).toBe(400);
  expect(mapDetailPageError(new Error("detail_page_conflict"))?.status).toBe(409);
  expect(mapDetailPageError(new Error("detail_page_route_conflict"))?.status).toBe(409);
  expect(mapDetailPageError(new Error("detail_page_content_type_mismatch"))?.status).toBe(409);
  expect(mapDetailPageError(new Error("other_error"))).toBeNull();
});

test("detail page routes validate list and write payloads before service work", async () => {
  const { router, routes } = makeRouter();
  const validateCalls: Array<{ schema: unknown; payload: unknown }> = [];

  registerDetailPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validateCalls.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  await expect(
    runRoute(routes, "GET", "/detail-pages", {
      query: { contentTypeId: "bad" },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "POST", "/detail-pages", {
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "PATCH", "/detail-pages/:id", {
      params: { id: "detail-1" },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  expect(validateCalls.map((entry) => entry.payload)).toEqual([
    { contentTypeId: "bad" },
    { extra: true },
    { extra: true },
  ]);
});

testIfDb("detail page routes create, list, read, update, and delete documents", async () => {
  const { router, routes } = makeRouter();
  registerDetailPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const contentType = await createContentType({
    name: `Products ${randomUUID()}`,
    slug: `products-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", xFieldType: "text" },
      },
    },
  });
  trackedContentTypeIds.add(contentType.id);

  const created = (await runRoute(routes, "POST", "/detail-pages", {
    body: {
      document: buildDetailPageDocumentInput(contentType.id, "stale-products"),
    },
  })) as { id: string; currentDocument: { contentTypeSlug: string } };
  trackedDetailPageIds.add(created.id);

  expect(created.currentDocument.contentTypeSlug).toBe(contentType.slug);

  const listed = (await runRoute(routes, "GET", "/detail-pages", {
    query: { contentTypeId: contentType.id },
  })) as { items: Array<{ id: string }> };
  expect(listed.items).toHaveLength(1);
  expect(listed.items[0]?.id).toBe(created.id);

  const detail = (await runRoute(routes, "GET", "/detail-pages/:id", {
    params: { id: created.id },
  })) as { id: string };
  expect(detail.id).toBe(created.id);

  const updated = (await runRoute(routes, "PATCH", "/detail-pages/:id", {
    params: { id: created.id },
    body: {
      document: {
        ...buildDetailPageDocumentInput(contentType.id, "stale-products-updated"),
        name: "Products detail template updated",
        status: "published",
      },
    },
  })) as {
    name: string;
    status: string;
    publishedDocument: { contentTypeSlug: string } | null;
  };
  expect(updated.name).toBe("Products detail template updated");
  expect(updated.status).toBe("published");
  expect(updated.publishedDocument?.contentTypeSlug).toBe(contentType.slug);

  const deleted = (await runRoute(routes, "DELETE", "/detail-pages/:id", {
    params: { id: created.id },
  })) as { ok: true };
  expect(deleted.ok).toBe(true);
  trackedDetailPageIds.delete(created.id);

  await expect(
    runRoute(routes, "GET", "/detail-pages/:id", {
      params: { id: created.id },
    })
  ).rejects.toMatchObject({
    code: "detail_page_not_found",
    status: 404,
  });
});

testIfDb(
  "detail page delete route rejects documents that are still linked from content routes",
  async () => {
    const { router, routes } = makeRouter();
    registerDetailPageRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });

    await rememberSetting("site.contentRoutes");
    const originalRoutes =
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];

    const contentType = await createContentType({
      name: `Linked Products ${randomUUID()}`,
      slug: `linked-products-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    trackedContentTypeIds.add(contentType.id);

    const created = (await runRoute(routes, "POST", "/detail-pages", {
      body: {
        document: buildDetailPageDocumentInput(contentType.id, contentType.slug),
      },
    })) as { id: string };
    trackedDetailPageIds.add(created.id);

    await setSetting("site.contentRoutes", [
      ...originalRoutes,
      {
        type: contentType.slug,
        listPath: `/${contentType.slug}`,
        detailPath: `/${contentType.slug}/:slug`,
        enabled: true,
        detailPageId: created.id,
      },
    ]);

    await expect(
      runRoute(routes, "DELETE", "/detail-pages/:id", {
        params: { id: created.id },
      })
    ).rejects.toMatchObject({
      code: "detail_page_route_conflict",
      status: 409,
    });
  }
);
