import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media } from "../../../core/db/schema";
import { ApiError } from "../../../core/server/errorHandler";
import {
  mapMediaError,
  registerMediaRoutes,
  type MediaRouteDeps,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/mediaRoutes";
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

const createdMedia: string[] = [];

afterEach(async () => {
  if (!hasDb) return;
  for (const id of createdMedia.splice(0)) {
    await db.delete(media).where(eq(media.id, id));
  }
});

const insertAsset = async () => {
  const [asset] = await db
    .insert(media)
    .values({
      key: `test/${crypto.randomUUID()}.png`,
      url: "http://localhost/media/x.png",
      type: "image",
      mimeType: "image/png",
      size: 10,
      alt: "seed-alt",
      title: "seed-title",
    })
    .returning();
  createdMedia.push(asset.id);
  return asset;
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
  expect(mapMediaError(new Error("media_file_invalid"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_mime_not_allowed"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_not_found"))?.status).toBe(404);
  expect(mapMediaError(new Error("media_file_too_large"))?.status).toBe(413);
  expect(mapMediaError(new Error("media_storage_unavailable"))?.status).toBe(503);
  expect(mapMediaError(new Error("other_error"))).toBeNull();
});

test("mapMediaError maps folder + metadata service errors to closed-set codes", () => {
  expect(mapMediaError(new Error("media_folder_not_found"))?.status).toBe(404);
  expect(mapMediaError(new Error("media_folder_slug_conflict"))?.status).toBe(409);
  expect(mapMediaError(new Error("media_folder_slug_invalid"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_folder_name_required"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_folder_cycle"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_folder_depth_exceeded"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_folder_order_invalid"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_focal_invalid"))?.status).toBe(400);
  expect(mapMediaError(new Error("media_tags_invalid"))?.status).toBe(400);
  // forward-compat: no producer until storage.quota.enforce
  expect(mapMediaError(new Error("media_quota_exceeded"))?.status).toBe(413);
});

// ---- (f) upload boundary: folderId/tags rejected by mediaUploadSchema (reject-unknown) ----

test("POST /media rejects folderId/tags in the upload body (reject-unknown 4xx)", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());

  for (const extra of [{ folderId: crypto.randomUUID() }, { tags: ["a", "b"] }] as const) {
    let err: unknown;
    try {
      await runRoute(findRoute(routes, "POST", "/media"), {
        body: { file: { name: "x.png", type: "image/png", size: 1 }, ...extra },
      });
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("validation_error");
    expect((err as ApiError).status).toBe(400);
  }
});

// ---- (c) PATCH /media/:id persists new fields, siblings survive, focal clamp, reject-unknown ----

testIfDb("PATCH /media/:id persists tags/focal/description/credit/folderId per-key", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());
  const asset = await insertAsset();

  const updated = (await runRoute(findRoute(routes, "PATCH", "/media/:id"), {
    params: { id: asset.id },
    body: {
      tags: ["hero", "banner"],
      focalX: 0.25,
      focalY: 0.75,
      description: "A long description",
      credit: "Jane Photographer",
    },
  })) as {
    tags: string[];
    focalX: number | null;
    focalY: number | null;
    description: string | null;
    credit: string | null;
    alt: string | null;
    title: string | null;
  };

  expect(updated.tags).toEqual(["hero", "banner"]);
  expect(updated.focalX).toBe(0.25);
  expect(updated.focalY).toBe(0.75);
  expect(updated.description).toBe("A long description");
  expect(updated.credit).toBe("Jane Photographer");
  // siblings (omitted keys) survive present-only patch
  expect(updated.alt).toBe("seed-alt");
  expect(updated.title).toBe("seed-title");
});

testIfDb(
  "PATCH /media/:id clamps out-of-range focal to [0,1] and persists (not rejected)",
  async () => {
    const { router, routes } = makeRouter();
    registerMediaRoutes(router, okDeps());
    const asset = await insertAsset();

    const updated = (await runRoute(findRoute(routes, "PATCH", "/media/:id"), {
      params: { id: asset.id },
      body: { focalX: 1.5, focalY: -0.3 },
    })) as { focalX: number | null; focalY: number | null };

    expect(updated.focalX).toBe(1);
    expect(updated.focalY).toBe(0);

    const [row] = await db.select().from(media).where(eq(media.id, asset.id));
    expect(row.focalX).toBe(1);
    expect(row.focalY).toBe(0);
  }
);

test("PATCH /media/:id with a non-number focal → HTTP 400 validation_error (schema-shadowed)", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());

  let err: unknown;
  try {
    await runRoute(findRoute(routes, "PATCH", "/media/:id"), {
      params: { id: crypto.randomUUID() },
      body: { focalX: "nope" },
    });
  } catch (error) {
    err = error;
  }
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).code).toBe("validation_error");
  expect((err as ApiError).status).toBe(400);
});

test("PATCH /media/:id rejects an unknown key (reject-unknown 4xx)", async () => {
  const { router, routes } = makeRouter();
  registerMediaRoutes(router, okDeps());

  let err: unknown;
  try {
    await runRoute(findRoute(routes, "PATCH", "/media/:id"), {
      params: { id: crypto.randomUUID() },
      body: { bogus: true },
    });
  } catch (error) {
    err = error;
  }
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).code).toBe("validation_error");
  expect((err as ApiError).status).toBe(400);
});
