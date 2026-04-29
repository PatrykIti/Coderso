import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, users } from "../../../core/db/schema";
import { matchRoute } from "../../../core/server/router";
import {
  registerContentEntryRoutes,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/contentEntryRoutes";
import { registerContentTypeRoutes } from "../../../core/server/routes/contentTypeRoutes";
import { createEntry } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";

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

const runRoute = async (
  routes: Route[],
  method: string,
  path: string,
  ctx: RouteContext
) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`route_not_found:${method} ${path}`);
  let result: unknown;
  for (const handler of route.handlers) {
    result = await handler(ctx);
  }
  return result;
};

test("content routes are registered", () => {
  const { router, routes } = makeRouter();

  registerContentTypeRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  registerContentEntryRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /content-types",
      "POST /content-types",
      "POST /content-types/:id/duplicate",
      "GET /content-types/:id",
      "PATCH /content-types/:id",
      "DELETE /content-types/:id",
      "GET /content-entries",
      "GET /content/:type/entries",
      "POST /content/:type/entries",
      "GET /content/:type/entries/:id",
      "PATCH /content/:type/entries/:id",
      "PATCH /content/:type/entries/:id/metadata",
      "POST /content/:type/entries/:id/duplicate",
      "DELETE /content/:type/entries/:id",
      "POST /content/:type/entries/:id/preview",
      "POST /content/:type/entries/:id/publish",
      "POST /content/:type/entries/:id/unpublish",
    ])
  );
});

test("all entries route does not collide with type-scoped entries routes", () => {
  const { router, routes } = makeRouter();

  registerContentEntryRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const route = routes.find(
    (item) => item.method === "GET" && matchRoute(item.path, "/content-entries").matched
  );

  expect(route?.path).toBe("/content-entries");
  expect(matchRoute("/content/:type/entries", "/content-entries").matched).toBe(false);
});

test("all entries route requires content read permission", async () => {
  const { router, routes } = makeRouter();
  const permissions: string[] = [];

  registerContentEntryRoutes(router, {
    requirePermission: (permission) => async () => {
      permissions.push(permission);
      throw new Error("permission_checked");
    },
    validate: () => undefined,
  });

  await expect(
    runRoute(routes, "GET", "/content-entries", {
      params: {},
      query: {},
      body: {},
    })
  ).rejects.toThrow("permission_checked");

  expect(permissions).toEqual(["content:read"]);
});

testIfDb("content entry metadata publish requires publish permission", async () => {
  const { router, routes } = makeRouter();
  const permissions: string[] = [];

  registerContentEntryRoutes(router, {
    requirePermission: (permission) => async () => {
      permissions.push(permission);
    },
    validate: () => undefined,
  });

  const [user] = await db
    .insert(users)
    .values({
      email: `content-route-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  const type = await createContentType({
    name: `Route Stories ${randomUUID()}`,
    slug: `route-stories-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: { title: { type: "string" } },
    },
  });
  const entry = await createEntry(type.id, {
    title: "Route entry",
    slug: `route-entry-${randomUUID()}`,
    data: { title: "Route entry" },
  });

  try {
    await runRoute(routes, "PATCH", "/content/:type/entries/:id/metadata", {
      params: { type: type.slug, id: entry.id },
      query: {},
      body: { status: "published" },
      user: { id: user!.id },
    });

    expect(permissions).toContain("content:write");
    expect(permissions).toContain("content:publish");
  } finally {
    await db.delete(contentEntries).where(eq(contentEntries.id, entry.id));
    await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
    await db.delete(users).where(eq(users.id, user!.id));
  }
});

testIfDb("content entry duplicate route returns a draft clone", async () => {
  const { router, routes } = makeRouter();

  registerContentEntryRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const type = await createContentType({
    name: `Route Docs ${randomUUID()}`,
    slug: `route-docs-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: { title: { type: "string" } },
    },
  });
  const entry = await createEntry(type.id, {
    title: "Route doc",
    slug: `route-doc-${randomUUID()}`,
    data: { title: "Route doc" },
  });

  try {
    const result = (await runRoute(
      routes,
      "POST",
      "/content/:type/entries/:id/duplicate",
      {
        params: { type: type.slug, id: entry.id },
        query: {},
        body: {},
      }
    )) as { title: string; slug: string; status: string };

    expect(result.title).toBe("Route doc (Copy)");
    expect(result.slug).toBe(`${entry.slug}-copy`);
    expect(result.status).toBe("draft");
  } finally {
    await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
  }
});
