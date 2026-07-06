import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { contentTypes } from "../../../core/db/schema";
import { registerContentTypeRoutes } from "../../../core/server/routes/contentTypeRoutes";
import type { RouteContext, RouteHandler } from "../../../core/server/routes/contentEntryRoutes";

// makeRouter/runRoute/testIfDbWithOptions/canConnect are the same file-local helpers used by
// contentTypes.test.ts (copied verbatim so this file self-isolates on the shared DB).
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

const runRoute = async (routes: Route[], method: string, path: string, ctx: RouteContext) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) throw new Error(`route_not_found:${method} ${path}`);
  let result: unknown;
  for (const handler of route.handlers) {
    result = await handler(ctx);
  }
  return result;
};

const uid = () => randomUUID().slice(0, 8);
const created: string[] = [];
// Concrete teardown (shared-DB self-isolation — avoids the smoke-DB-pollution transient): delete
// every row this file created, even when an assertion throws mid-test. `splice(0)` drains the list
// so a later test cannot re-delete a stale id.
afterEach(async () => {
  for (const id of created.splice(0)) await db.delete(contentTypes).where(eq(contentTypes.id, id));
});

const REAL_ROLE = "editor"; // any role slug is allowed (additionalProperties role keys)

testIfDbWithOptions(
  "content-type config + date/slug round-trip via POST→GET→PATCH→GET",
  async () => {
    const { router, routes } = makeRouter();
    registerContentTypeRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });

    const slug = `rt-${uid()}`;
    const body = {
      name: `Round Trip ${uid()}`,
      slug,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          // Every field carries xFieldConfig.order (0-based authored index) — exactly what
          // buildSchemaFromFields stamps; order rides the registered xFieldConfig keyword.
          title: { type: "string", xFieldConfig: { order: 0 } },
          // NO format key: ajv strict:true would throw on it (513-02).
          publishedAt: { type: "string", xFieldType: "date", xFieldConfig: { order: 1 } },
          urlSlug: {
            type: "string",
            xFieldType: "slug",
            xFieldConfig: { slug: { source: "title" }, unique: true, order: 2 },
          },
        },
      },
      // present-only: draftsEnabled:true & versioning:false are RESOLVED DEFAULTS → dropped to {}
      config: {
        singularName: "Story",
        pluralName: "Stories",
        draftsEnabled: true,
        versioning: false,
        permissions: { [REAL_ROLE]: { read: true, create: false } },
      },
    };

    // ACT: create
    const post = (await runRoute(routes, "POST", "/content-types", {
      params: {},
      query: {},
      body,
    })) as any;
    const id = post.id ?? post.contentType?.id;
    created.push(id);

    // ASSERT: present-only on the READ path (defaults dropped, false caps dropped, empty role dropped)
    const get1 = (await runRoute(routes, "GET", "/content-types/:id", {
      params: { id },
      query: {},
      body: {},
    })) as any;
    const cfg1 = get1.config ?? get1.contentType?.config;
    expect(cfg1).toEqual({
      singularName: "Story",
      pluralName: "Stories",
      permissions: { [REAL_ROLE]: { read: true } },
    });
    expect("draftsEnabled" in cfg1).toBe(false);
    expect("versioning" in cfg1).toBe(false);

    // schema field-type markers survive the round-trip (identified by xFieldType, NOT format)
    const props1 = (get1.schema ?? get1.contentType?.schema).properties;
    expect(props1.publishedAt.xFieldType).toBe("date");
    expect(props1.urlSlug.xFieldType).toBe("slug");
    // `unique` rides xFieldConfig verbatim through the route/jsonb round-trip.
    expect(props1.urlSlug.xFieldConfig.unique).toBe(true); // persisted when set
    expect(props1.title.xFieldConfig?.unique).toBeUndefined(); // omitted when unset
    // field-ORDER persists as DATA — authored xFieldConfig.order integers round-trip verbatim.
    expect(props1.title.xFieldConfig.order).toBe(0);
    expect(props1.publishedAt.xFieldConfig.order).toBe(1);
    expect(props1.urlSlug.xFieldConfig.order).toBe(2);
    // field SET preserved (jsonb re-sorts keys — compare the sorted set, never raw insertion order).
    expect([...Object.keys(props1)].sort()).toEqual(["publishedAt", "title", "urlSlug"]);

    // ACT: PATCH — turn a default OFF (now present) + REORDER, RE-STAMPING xFieldConfig.order.
    await runRoute(routes, "PATCH", "/content-types/:id", {
      params: { id },
      query: {},
      body: {
        config: { ...body.config, draftsEnabled: false, versioning: true },
        schema: {
          ...body.schema,
          properties: {
            title: { ...body.schema.properties.title, xFieldConfig: { order: 0 } },
            urlSlug: {
              ...body.schema.properties.urlSlug,
              xFieldConfig: { ...body.schema.properties.urlSlug.xFieldConfig, order: 1 },
            },
            publishedAt: {
              ...body.schema.properties.publishedAt,
              xFieldConfig: { order: 2 },
            },
          },
        },
      },
    });

    const get2 = (await runRoute(routes, "GET", "/content-types/:id", {
      params: { id },
      query: {},
      body: {},
    })) as any;
    const cfg2 = get2.config ?? get2.contentType?.config;
    const props2 = (get2.schema ?? get2.contentType?.schema).properties;
    expect(cfg2.draftsEnabled).toBe(false); // now non-default → PERSISTED
    expect(cfg2.versioning).toBe(true);
    // ORDER-persistence proof: the re-stamped xFieldConfig.order integers round-trip.
    expect(props2.title.xFieldConfig.order).toBe(0);
    expect(props2.urlSlug.xFieldConfig.order).toBe(1);
    expect(props2.publishedAt.xFieldConfig.order).toBe(2);
    expect([...Object.keys(props2)].sort()).toEqual(["publishedAt", "title", "urlSlug"]);
  },
  { timeout: 20000 }
);

testIfDbWithOptions(
  "reject-unknown: config.bogus and permissions.<role>.bogus → 400",
  async () => {
    const { router, routes } = makeRouter();
    registerContentTypeRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });
    const base = {
      name: `Bad ${uid()}`,
      slug: `bad-${uid()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    };

    for (const badConfig of [
      { bogus: true }, // unknown top-level config key
      { permissions: { [REAL_ROLE]: { bogus: true } } }, // unknown per-role capability key
    ]) {
      const run = runRoute(routes, "POST", "/content-types", {
        params: {},
        query: {},
        body: { ...base, config: badConfig },
      });
      // ApiError(status 400) from mapContentTypeError(content_type_config_invalid)
      await expect(run).rejects.toMatchObject({ status: 400 });
    }
  },
  { timeout: 20000 }
);
