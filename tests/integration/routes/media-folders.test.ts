import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media, mediaFolders } from "../../../core/db/schema";
import { ApiError, toErrorResponse } from "../../../core/server/errorHandler";
import {
  registerMediaFolderRoutes,
  registerMediaRoutes,
  type MediaRouteDeps,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/mediaRoutes";
import { matchRoute } from "../../../core/server/router";
import { validate } from "../../../core/server/validation/schemaValidator";

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";

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
  const routeContext = { params: {}, query: {}, body: undefined, ...ctx } as RouteContext;
  for (const handler of route.handlers) {
    result = await handler(routeContext);
  }
  return result;
};

const okDeps = (): MediaRouteDeps => ({
  requirePermission: () => async () => undefined,
  validate,
});

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const createdFolders: string[] = [];
const createdMedia: string[] = [];

const uniqueName = (prefix = "Folder") => `${prefix} ${crypto.randomUUID()}`;
const uniqueSlug = (prefix = "f") => `${prefix}-${crypto.randomUUID()}`;

const expectBoundedConflictResponse = (error: unknown) => {
  expect(error).toBeInstanceOf(ApiError);
  const apiError = error as ApiError;
  expect(apiError.status).toBe(409);
  expect(apiError.code).toBe("media_folder_slug_conflict");
  expect(apiError.message).toBe("Folder slug already in use");

  const serialized = JSON.stringify(toErrorResponse(apiError));
  expect(serialized).toBe(
    '{"error":{"code":"media_folder_slug_conflict","message":"Folder slug already in use"}}'
  );
  expect(serialized.length).toBeLessThan(128);
  for (const forbidden of [
    "23505",
    "media_folders_slug_idx",
    "constraint_name",
    "postgres",
    "insert into",
    "update media_folders",
    "stack",
    "cause",
    "details",
  ]) {
    expect(serialized.toLowerCase()).not.toContain(forbidden);
  }
};

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdMedia.splice(0)) {
    await db.delete(media).where(eq(media.id, id));
  }
  for (const id of createdFolders.splice(0)) {
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  }
});

// ---- wiring + RBAC (b) ----

test("registerMediaFolderRoutes wires folder endpoints behind media RBAC buckets", () => {
  const { router, routes } = makeRouter();
  const requiredPermissions: string[] = [];

  registerMediaFolderRoutes(router, {
    requirePermission: (permission) => {
      requiredPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /media/folders",
      "POST /media/folders",
      "POST /media/folders/reorder",
      "PATCH /media/folders/:id",
      "DELETE /media/folders/:id",
    ])
  );
  // read → media:read; every write → media:write. No new RBAC bucket.
  expect(requiredPermissions).toEqual([
    "media:read",
    "media:write",
    "media:write",
    "media:write",
    "media:write",
  ]);
});

test("folder routes reject unauthorized callers (permission middleware throws 403)", async () => {
  const { router, routes } = makeRouter();
  registerMediaFolderRoutes(router, {
    requirePermission: () => async () => {
      throw new ApiError("forbidden", "Forbidden", 403);
    },
    validate,
  });

  for (const [method, path] of [
    ["GET", "/media/folders"],
    ["POST", "/media/folders"],
    ["PATCH", "/media/folders/:id"],
    ["DELETE", "/media/folders/:id"],
  ] as const) {
    let status = 0;
    try {
      await runRoute(findRoute(routes, method, path), { params: { id: "x" }, body: {} });
    } catch (error) {
      status = error instanceof ApiError ? error.status : -1;
    }
    expect(status).toBe(403);
  }
});

// ---- ordering (e): /media/folders NOT shadowed by /media/:id ----

test("GET /media/folders is registered before /media/:id (first-match dispatch)", () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());

  // Replicate httpServer first-match dispatch semantics for GET /media/folders.
  const dispatched = routes.find(
    (route) => route.method === "GET" && matchRoute(route.path, "/media/folders").matched
  );
  expect(dispatched?.path).toBe("/media/folders");
  // And /media/:id exists but is registered AFTER the folder group.
  const folderIdx = routes.findIndex((r) => r.method === "GET" && r.path === "/media/folders");
  const byIdIdx = routes.findIndex((r) => r.method === "GET" && r.path === "/media/:id");
  expect(folderIdx).toBeGreaterThanOrEqual(0);
  expect(byIdIdx).toBeGreaterThan(folderIdx);
});

// ---- reject-unknown at the edge ----

test("folder create rejects unknown keys (4xx validation_error)", async () => {
  const { router, routes } = makeRouter();
  registerMediaFolderRoutes(router, okDeps());
  let err: unknown;
  try {
    await runRoute(findRoute(routes, "POST", "/media/folders"), {
      body: { name: "X", bogus: true },
    });
  } catch (error) {
    err = error;
  }
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).code).toBe("validation_error");
  expect((err as ApiError).status).toBe(400);
});

// ---- CRUD round-trip (a) ----

testIfDb("folder CRUD via HTTP: create → list → patch → reorder → delete", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());

  const created = (await runRoute(findRoute(routes, "POST", "/media/folders"), {
    body: { name: uniqueName("Photos"), slug: uniqueSlug() },
  })) as { id: string; name: string };
  createdFolders.push(created.id);
  expect(created.id).toBeTruthy();

  const list = (await runRoute(findRoute(routes, "GET", "/media/folders"), {})) as Array<{
    id: string;
  }>;
  expect(list.some((f) => f.id === created.id)).toBe(true);

  const patched = (await runRoute(findRoute(routes, "PATCH", "/media/folders/:id"), {
    params: { id: created.id },
    body: { name: "Renamed folder" },
  })) as { name: string };
  expect(patched.name).toBe("Renamed folder");

  const reordered = await runRoute(findRoute(routes, "POST", "/media/folders/reorder"), {
    body: { orders: [{ id: created.id, orderIndex: 7 }] },
  });
  expect(reordered).toEqual({ ok: true });
  const afterReorder = (await runRoute(findRoute(routes, "GET", "/media/folders"), {})) as Array<{
    id: string;
    orderIndex: number;
  }>;
  expect(afterReorder.find((f) => f.id === created.id)?.orderIndex).toBe(7);

  const deleted = await runRoute(findRoute(routes, "DELETE", "/media/folders/:id"), {
    params: { id: created.id },
  });
  expect(deleted).toEqual({ ok: true });
  createdFolders.splice(createdFolders.indexOf(created.id), 1);

  const afterDelete = (await runRoute(findRoute(routes, "GET", "/media/folders"), {})) as Array<{
    id: string;
  }>;
  expect(afterDelete.some((f) => f.id === created.id)).toBe(false);
});

testIfDb("PATCH /media/folders/:id on a missing id → media_folder_not_found (404)", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());
  let err: unknown;
  try {
    await runRoute(findRoute(routes, "PATCH", "/media/folders/:id"), {
      params: { id: crypto.randomUUID() },
      body: { name: "x" },
    });
  } catch (error) {
    err = error;
  }
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(404);
  expect((err as ApiError).code).toBe("media_folder_not_found");
});

testIfDb("POST folder duplicate maps to a bounded media_folder_slug_conflict 409", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());
  const slug = uniqueSlug("dup");
  const first = (await runRoute(findRoute(routes, "POST", "/media/folders"), {
    body: { name: "First", slug },
  })) as { id: string };
  createdFolders.push(first.id);

  let err: unknown;
  try {
    await runRoute(findRoute(routes, "POST", "/media/folders"), {
      body: { name: "Second", slug },
    });
  } catch (error) {
    err = error;
  }
  expectBoundedConflictResponse(err);
});

testIfDb("PATCH folder duplicate maps to a bounded media_folder_slug_conflict 409", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());
  const reservedSlug = uniqueSlug("patch-dup");
  const first = (await runRoute(findRoute(routes, "POST", "/media/folders"), {
    body: { name: "Patch first", slug: reservedSlug },
  })) as { id: string };
  const second = (await runRoute(findRoute(routes, "POST", "/media/folders"), {
    body: { name: "Patch second", slug: uniqueSlug("patch-source") },
  })) as { id: string };
  createdFolders.push(first.id, second.id);

  let err: unknown;
  try {
    await runRoute(findRoute(routes, "PATCH", "/media/folders/:id"), {
      params: { id: second.id },
      body: { slug: reservedSlug },
    });
  } catch (error) {
    err = error;
  }
  expectBoundedConflictResponse(err);
});

// ---- delete un-files media (d) ----

testIfDb(
  "DELETE folder un-files assigned media (folderId → null), never cascade-deletes",
  async () => {
    const { router, routes } = makeRouter();
    registerMediaRoutes(router, okDeps());

    const folder = (await runRoute(findRoute(routes, "POST", "/media/folders"), {
      body: { name: uniqueName(), slug: uniqueSlug() },
    })) as { id: string };
    createdFolders.push(folder.id);

    const [asset] = await db
      .insert(media)
      .values({
        key: `test/${crypto.randomUUID()}.png`,
        url: "http://localhost/media/x.png",
        type: "image",
        mimeType: "image/png",
        size: 10,
        folderId: folder.id,
      })
      .returning();
    createdMedia.push(asset.id);

    const deleted = await runRoute(findRoute(routes, "DELETE", "/media/folders/:id"), {
      params: { id: folder.id },
    });
    expect(deleted).toEqual({ ok: true });
    createdFolders.splice(createdFolders.indexOf(folder.id), 1);

    const [after] = await db.select().from(media).where(eq(media.id, asset.id));
    expect(after).toBeDefined();
    expect(after.folderId).toBeNull();
  }
);
