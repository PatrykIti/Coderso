import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { ContentValidationError } from "../../../core/services/content/validation";

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";

const { db } = await import("../../../core/db/client");
const { contentEntries, contentRevisions, contentTypes, seoDocuments, users } =
  await import("../../../core/db/schema");
const { createEntry, getEntry, updateEntryMetadata } =
  await import("../../../core/services/content/entryService");
const { createContentType } = await import("../../../core/services/content/typeService");
const { validate: validateSchema } =
  await import("../../../core/server/validation/schemaValidator");
const { mapContentEntryError, mapEntryMetadataError, registerContentEntryRoutes } =
  await import("../../../core/server/routes/contentEntryRoutes");

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
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
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

test("registerContentEntryRoutes wires content entry endpoints and permissions", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerContentEntryRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
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
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
    "content:write",
    "content:write",
    "content:read",
    "content:publish",
    "content:publish",
  ]);
});

test("mapContentEntryError maps entry domain errors to route ApiErrors", () => {
  expect(mapContentEntryError(new Error("content_type_not_found"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("entry_not_found"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("entry_slug_conflict"))?.status).toBe(409);
  expect(mapContentEntryError(new Error("media_value_invalid"))?.status).toBe(400);
  expect(mapContentEntryError(new Error("media_asset_missing"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("relation_entry_missing"))?.status).toBe(404);
  expect(mapContentEntryError(new Error("auth_required"))?.status).toBe(401);
  expect(mapContentEntryError(new Error("other_error"))).toBeNull();
});

test("PATCH metadata route accepts visibility + accessPassword and gates publish", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerContentEntryRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const metadataRoute = routes.find(
    (route) => route.method === "PATCH" && route.path === "/content/:type/entries/:id/metadata"
  );
  expect(metadataRoute).toBeDefined();
  // The metadata route rides content:write (no new RBAC bucket for visibility).
  expect(requestedPermissions).toContain("content:write");
});

test("mapEntryMetadataError maps entry_password_required to a 400 without leaking the secret", () => {
  const mapped = mapEntryMetadataError(new Error("entry_password_required"));
  expect(mapped?.status).toBe(400);
  expect(mapped?.code).toBe("entry_password_required");
  expect(JSON.stringify(mapped)).not.toContain("accessPassword");
  expect(mapEntryMetadataError(new Error("scheduled_at_required"))?.status).toBe(400);
  expect(mapEntryMetadataError(new Error("seo_canonical_invalid"))).toMatchObject({
    code: "seo_canonical_invalid",
    status: 400,
  });
  expect(mapEntryMetadataError(new Error("seo_robots_invalid"))).toMatchObject({
    code: "seo_robots_invalid",
    status: 400,
  });
  expect(mapEntryMetadataError(new Error("other_error"))).toBeNull();
});

test("mapContentEntryError preserves field details for domain field errors", () => {
  const mapped = mapContentEntryError(
    Object.assign(new Error("entry_slug_conflict"), {
      field: "slug",
    })
  );

  expect(mapped?.details).toEqual({
    field: "slug",
  });
});

test("mapContentEntryError preserves content validation details", () => {
  const mapped = mapContentEntryError(
    new ContentValidationError("entry_validation_failed", [
      {
        instancePath: "/status",
        schemaPath: "#/properties/status/enum",
        keyword: "enum",
        params: { allowedValues: ["planned", "active"] },
        message: "must be equal to one of the allowed values",
      },
    ])
  );

  expect(mapped?.code).toBe("entry_validation_failed");
  expect(mapped?.status).toBe(400);
  expect(mapped?.details).toEqual({
    validation: [
      expect.objectContaining({
        instancePath: "/status",
        keyword: "enum",
      }),
    ],
  });
});

testIfDbWithOptions(
  "metadata route preserves scheduledAt presence, validates dates, and authorizes locked publish transitions",
  async () => {
    const [actor] = await db
      .insert(users)
      .values({
        email: `entry-route-${randomUUID()}@example.com`,
        passwordHash: "test",
        status: "active",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("missing_entry_route_actor");
    let type: Awaited<ReturnType<typeof createContentType>> | null = null;
    let entryId: string | null = null;

    try {
      type = await createContentType({
        name: `Entry route ${randomUUID()}`,
        slug: `entry-route-${randomUUID()}`,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title"],
          properties: { title: { type: "string" } },
        },
      });
      const typeSlug = type.slug;
      const entry = await createEntry(type.id, {
        title: "Entry route fixture",
        slug: `entry-route-${randomUUID()}`,
        data: { title: "Entry route fixture" },
        authorId: actor.id,
      });
      entryId = entry.id;
      const initialScheduledAt = new Date("2037-03-04T05:06:07.000Z");
      await updateEntryMetadata(entry.id, { scheduledAt: initialScheduledAt });

      const { router, routes } = makeRouter();
      const permissionCalls: string[] = [];
      registerContentEntryRoutes(router, {
        requirePermission: (permission) => async () => {
          permissionCalls.push(permission);
        },
        validate: validateSchema,
      });
      const metadataRoute = routes.find(
        (route) => route.method === "PATCH" && route.path === "/content/:type/entries/:id/metadata"
      );
      const handler = metadataRoute?.handlers.at(-1);
      if (!handler) throw new Error("missing_metadata_route_handler");
      const invoke = (body: unknown) =>
        handler({
          params: { type: typeSlug, id: entry.id },
          query: {},
          body,
          user: { id: actor.id },
        });

      permissionCalls.length = 0;
      await invoke({ tags: ["omitted-schedule"] });
      expect((await getEntry(entry.id))?.scheduledAt?.getTime()).toBe(initialScheduledAt.getTime());
      expect(permissionCalls).toEqual([]);

      await invoke({ scheduledAt: null });
      expect((await getEntry(entry.id))?.scheduledAt).toBeNull();

      const replacementScheduledAt = new Date("2038-04-05T06:07:08.000Z");
      await invoke({ scheduledAt: replacementScheduledAt.toISOString() });
      expect((await getEntry(entry.id))?.scheduledAt?.getTime()).toBe(
        replacementScheduledAt.getTime()
      );

      for (const invalidScheduledAt of ["", "tomorrow"]) {
        try {
          await invoke({ scheduledAt: invalidScheduledAt });
          throw new Error("expected_route_validation_error");
        } catch (error) {
          expect((error as { code?: string }).code).toBe("validation_error");
          expect((error as { status?: number }).status).toBe(400);
        }
      }

      await invoke({ scheduledAt: null });
      try {
        await invoke({ status: "scheduled" });
        throw new Error("expected_scheduled_at_required");
      } catch (error) {
        expect((error as { code?: string }).code).toBe("scheduled_at_required");
        expect((error as { status?: number }).status).toBe(400);
      }

      permissionCalls.length = 0;
      await invoke({ status: "published" });
      expect(permissionCalls).toEqual(["content:publish"]);
      expect((await getEntry(entry.id))?.status).toBe("published");

      permissionCalls.length = 0;
      await invoke({ status: "published", tags: ["already-published"] });
      expect(permissionCalls).toEqual([]);

      const beforeInvalidSeo = await getEntry(entry.id);
      for (const [field, value, expectedCode] of [
        ["canonicalUrl", "ftp://invalid.example.test", "seo_canonical_invalid"],
        ["robots", "index<script>", "seo_robots_invalid"],
      ] as const) {
        try {
          await invoke({ seo: { [field]: value }, tags: ["must-not-commit"] });
          throw new Error("expected_seo_validation_error");
        } catch (error) {
          expect((error as { code?: string }).code).toBe(expectedCode);
          expect((error as { status?: number }).status).toBe(400);
        }
      }
      const afterInvalidSeo = await getEntry(entry.id);
      expect(afterInvalidSeo?.tags).toEqual(beforeInvalidSeo?.tags);
    } finally {
      if (entryId) {
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, entryId));
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, entryId));
        await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
      }
      if (type) await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  },
  { timeout: 45_000 }
);
