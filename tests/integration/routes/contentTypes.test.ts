import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  customScreens,
  detailPageDocuments,
  listingQueries,
  listingTemplates,
  pages,
  users,
} from "../../../core/db/schema";
import { matchRoute } from "../../../core/server/router";
import { ApiError } from "../../../core/server/errorHandler";
import type { PermissionRequirement } from "../../../core/server/middleware/rbac";
import {
  registerContentEntryRoutes,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/contentEntryRoutes";
import { registerContentTypeRoutes } from "../../../core/server/routes/contentTypeRoutes";
import { createEntry } from "../../../core/services/content/entryService";
import { createListingQuery } from "../../../core/services/content/listingQueriesService";
import { createListingTemplate } from "../../../core/services/content/listingTemplatesService";
import type { CollectionWorkspaceSummary } from "../../../core/services/content/collectionWorkspaceService";
import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import { createContentType } from "../../../core/services/content/typeService";
import { createPage } from "../../../core/services/pages/pageService";
import { createCustomScreen } from "../../../core/services/customScreens/customScreenService";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";

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
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const runRoute = async (routes: Route[], method: string, path: string, ctx: RouteContext) => {
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
      "GET /content-types/:id/collection-workspace",
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

test("collection workspace route requires content read permission", async () => {
  const { router, routes } = makeRouter();
  const permissions: string[] = [];

  registerContentTypeRoutes(router, {
    requirePermission: (permission) => async () => {
      permissions.push(permission);
      throw new Error("permission_checked");
    },
    validate: () => undefined,
  });

  await expect(
    runRoute(routes, "GET", "/content-types/:id/collection-workspace", {
      params: { id: "ct-1" },
      query: {},
      body: {},
    })
  ).rejects.toThrow("permission_checked");

  expect(permissions).toEqual(["content:read"]);
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
  const permissions: PermissionRequirement[] = [];

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

testIfDbWithOptions(
  "content entry metadata publish requires publish permission",
  async () => {
    const { router, routes } = makeRouter();
    const permissions: PermissionRequirement[] = [];
    const permissionExecutors: unknown[] = [];

    registerContentEntryRoutes(router, {
      requirePermission: (permission) => async (_ctx, executor) => {
        permissions.push(permission);
        permissionExecutors.push(executor);
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

      expect(permissions).toEqual(["content:write", ["content:write", "content:publish"]]);
      expect(permissionExecutors[0]).toBeUndefined();
      expect(permissionExecutors[1]).toEqual(
        expect.objectContaining({ select: expect.any(Function) })
      );
    } finally {
      await db.delete(contentEntries).where(eq(contentEntries.id, entry.id));
      await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
      await db.delete(users).where(eq(users.id, user!.id));
    }
  },
  { timeout: 15_000 }
);

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
    const result = (await runRoute(routes, "POST", "/content/:type/entries/:id/duplicate", {
      params: { type: type.slug, id: entry.id },
      query: {},
      body: {},
    })) as { title: string; slug: string; status: string };

    expect(result.title).toBe("Route doc (Copy)");
    expect(result.slug).toBe(`${entry.slug}-copy`);
    expect(result.status).toBe("draft");
  } finally {
    await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
  }
});

testIfDb("content type delete route maps detail page dependency conflicts", async () => {
  const { router, routes } = makeRouter();

  registerContentTypeRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const type = await createContentType({
    name: `Route Detail Guard ${randomUUID()}`,
    slug: `route-detail-guard-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: { title: { type: "string" } },
    },
  });

  try {
    await db.insert(detailPageDocuments).values({
      id: randomUUID(),
      name: "Route detail page",
      contentTypeId: type.id,
      status: "draft",
      currentDocument: normalizeDetailPageDocument({
        schemaVersion: 1,
        id: randomUUID(),
        name: "Route detail page",
        contentTypeId: type.id,
        contentTypeSlug: type.slug,
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
              headline: "Detail",
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
      }),
    });

    await expect(
      runRoute(routes, "DELETE", "/content-types/:id", {
        params: { id: type.id },
        query: {},
        body: {},
      })
    ).rejects.toMatchObject({
      code: "content_type_has_detail_pages",
      status: 409,
    } satisfies Partial<ApiError>);
  } finally {
    await db.delete(detailPageDocuments).where(eq(detailPageDocuments.contentTypeId, type.id));
    await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
  }
});

testIfDbWithOptions(
  "collection workspace route resolves canonical resources from owner seams",
  async () => {
    const { router, routes } = makeRouter();
    const originalContentRoutes =
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];

    registerContentTypeRoutes(router, {
      requirePermission: () => async () => undefined,
      resolvePermissions: () => ["content:read", "settings:read"],
      validate: () => undefined,
    });

    const type = await createContentType({
      name: `Route Workspace ${randomUUID()}`,
      slug: `route-workspace-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" }, summary: { type: "string" } },
      },
    });
    const detailPageId = randomUUID();
    const createdPageIds: string[] = [];
    const createdScreenIds: string[] = [];
    const createdQueryIds: string[] = [];
    const createdTemplateIds: string[] = [];

    try {
      const listingQuery = await createListingQuery({
        name: `Workspace query ${randomUUID()}`,
        description: null,
        query: {
          source: "entries",
          sourceConfig: { contentTypeId: type.id },
          filters: [],
          sort: [{ field: "updatedAt", dir: "desc" }],
          pagination: { limit: 12, offset: 0 },
          fields: ["id", "title"],
        },
      });
      createdQueryIds.push(listingQuery.id);

      const listingTemplate = await createListingTemplate({
        name: `Workspace Template ${randomUUID()}`,
        slug: `workspace-template-${randomUUID()}`,
      });
      createdTemplateIds.push(listingTemplate.id);

      const listPage = await createPage({
        title: "Workspace catalog page",
        slug: `workspace-catalog-${randomUUID()}`,
        data: {
          schemaVersion: 2,
          settings: {
            collectionLink: {
              contentTypeId: type.id,
              pageRole: "canonical-list-page",
              compositionKey: "catalog-main",
              listingQueryId: listingQuery.id,
              listingTemplateId: listingTemplate.id,
            },
          },
          sections: [],
        },
      });
      createdPageIds.push(listPage.id);

      const supportingPage = await createPage({
        title: "Workspace supporting page",
        slug: `workspace-supporting-${randomUUID()}`,
        data: {
          schemaVersion: 2,
          settings: {
            collectionLink: {
              contentTypeId: type.id,
              pageRole: "supporting-page",
              compositionKey: "catalog-support",
            },
          },
          sections: [],
        },
      });
      createdPageIds.push(supportingPage.id);

      const adminScreen = await createCustomScreen({
        name: "Workspace admin screen",
        contentTypeId: type.id,
        status: "active",
        collectionRole: "canonical-admin-screen",
        compositionKey: "catalog-main",
      });
      createdScreenIds.push(adminScreen.id);

      const secondaryScreen = await createCustomScreen({
        name: "Workspace secondary admin screen",
        contentTypeId: type.id,
        status: "active",
        collectionRole: "secondary-admin-screen",
        compositionKey: "catalog-support",
      });
      createdScreenIds.push(secondaryScreen.id);

      await db.insert(detailPageDocuments).values({
        id: detailPageId,
        name: "Workspace detail page",
        contentTypeId: type.id,
        status: "draft",
        currentDocument: normalizeDetailPageDocument({
          schemaVersion: 1,
          id: detailPageId,
          name: "Workspace detail page",
          contentTypeId: type.id,
          contentTypeSlug: type.slug,
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
                headline: "Detail",
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
        }),
      });
      await setSetting("site.contentRoutes", [
        {
          type: type.slug,
          listPath: `/_catalog/${type.slug}`,
          detailPath: `/${type.slug}/:slug`,
          enabled: true,
          detailPageId,
        },
      ]);

      const result = (await runRoute(routes, "GET", "/content-types/:id/collection-workspace", {
        params: { id: type.id },
        query: {},
        body: {},
      })) as CollectionWorkspaceSummary;

      expect(Object.keys(result)).toEqual([
        "contentType",
        "canonical",
        "linkedSecondary",
        "unresolved",
        "candidates",
      ]);
      expect(result.contentType).toMatchObject({
        id: type.id,
        slug: type.slug,
        fieldCount: 2,
      });
      expect(result.canonical.contentRoute).toMatchObject({
        type: type.slug,
        listPath: `/_catalog/${type.slug}`,
        detailPath: `/${type.slug}/:slug`,
        detailPageId,
      });
      expect(result.canonical.detailPage).toMatchObject({
        id: detailPageId,
        label: "Workspace detail page",
        status: "draft",
      });
      expect(result.canonical.listPage).toMatchObject({
        id: listPage.id,
        label: "Workspace catalog page",
        role: "canonical-list-page",
        compositionKey: "catalog-main",
      });
      expect(result.canonical.listPage).not.toHaveProperty("listingQueryId");
      expect(result.canonical.listingQuery).toMatchObject({
        id: listingQuery.id,
        label: listingQuery.name,
      });
      expect(result.canonical.listingTemplate).toMatchObject({
        id: listingTemplate.id,
        label: listingTemplate.name,
        slug: listingTemplate.slug,
      });
      expect(result.canonical.adminScreen).toMatchObject({
        id: adminScreen.id,
        label: "Workspace admin screen",
        role: "canonical-admin-screen",
        compositionKey: "catalog-main",
      });
      expect(result.linkedSecondary.pages).toEqual([
        expect.objectContaining({
          id: supportingPage.id,
          label: "Workspace supporting page",
          role: "supporting-page",
        }),
      ]);
      expect(result.linkedSecondary.adminScreens).toEqual([
        expect.objectContaining({
          id: secondaryScreen.id,
          label: "Workspace secondary admin screen",
          role: "secondary-admin-screen",
        }),
      ]);
      expect(result.candidates.detailPages).toEqual([
        expect.objectContaining({
          id: detailPageId,
          label: "Workspace detail page",
          status: "draft",
        }),
      ]);
      expect(result.unresolved).toEqual([]);
    } finally {
      await setSetting("site.contentRoutes", originalContentRoutes);
      await db.delete(detailPageDocuments).where(eq(detailPageDocuments.contentTypeId, type.id));
      for (const id of createdScreenIds) {
        await db.delete(customScreens).where(eq(customScreens.id, id));
      }
      for (const id of createdPageIds) {
        await db.delete(pages).where(eq(pages.id, id));
      }
      for (const id of createdTemplateIds) {
        await db.delete(listingTemplates).where(eq(listingTemplates.id, id));
      }
      for (const id of createdQueryIds) {
        await db.delete(listingQueries).where(eq(listingQueries.id, id));
      }
      await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
    }
  },
  { timeout: 50_000 }
);

testIfDbWithOptions(
  "collection workspace route returns unresolved candidates for ambiguous explicit links",
  async () => {
    const { router, routes } = makeRouter();
    const originalContentRoutes =
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];

    registerContentTypeRoutes(router, {
      requirePermission: () => async () => undefined,
      resolvePermissions: () => ["content:read", "settings:read"],
      validate: () => undefined,
    });

    const type = await createContentType({
      name: `Ambiguous Workspace ${randomUUID()}`,
      slug: `ambiguous-workspace-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    });
    const createdPageIds: string[] = [];
    const createdScreenIds: string[] = [];

    try {
      await setSetting("site.contentRoutes", [
        {
          type: type.slug,
          listPath: `/_catalog/${type.slug}`,
          detailPath: `/${type.slug}/:slug`,
          enabled: true,
        },
      ]);

      for (const suffix of ["one", "two"]) {
        const page = await createPage({
          title: `Ambiguous catalog ${suffix}`,
          slug: `ambiguous-catalog-${suffix}-${randomUUID()}`,
          data: {
            schemaVersion: 2,
            settings: {
              collectionLink: {
                contentTypeId: type.id,
                pageRole: "canonical-list-page",
                compositionKey: `catalog-${suffix}`,
              },
            },
            sections: [],
          },
        });
        createdPageIds.push(page.id);

        const screen = await createCustomScreen({
          name: `Ambiguous admin ${suffix}`,
          contentTypeId: type.id,
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: `catalog-${suffix}`,
        });
        createdScreenIds.push(screen.id);
      }

      const result = (await runRoute(routes, "GET", "/content-types/:id/collection-workspace", {
        params: { id: type.id },
        query: {},
        body: {},
      })) as CollectionWorkspaceSummary;

      expect(result.canonical.listPage).toBeNull();
      expect(result.canonical.adminScreen).toBeNull();
      expect(result.candidates.pages).toHaveLength(2);
      expect(result.candidates.adminScreens).toHaveLength(2);
      expect(result.unresolved).toEqual(
        expect.arrayContaining([
          { resource: "detailPage", reason: "explicit_link_missing" },
          { resource: "listPage", reason: "ambiguous_candidates" },
          { resource: "listingQuery", reason: "canonical_resolution_deferred" },
          { resource: "listingTemplate", reason: "canonical_resolution_deferred" },
          { resource: "adminScreen", reason: "ambiguous_candidates" },
        ])
      );
    } finally {
      await setSetting("site.contentRoutes", originalContentRoutes);
      for (const id of createdScreenIds) {
        await db.delete(customScreens).where(eq(customScreens.id, id));
      }
      for (const id of createdPageIds) {
        await db.delete(pages).where(eq(pages.id, id));
      }
      await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
    }
  },
  { timeout: 15_000 }
);

testIfDbWithOptions(
  "collection workspace route redacts settings-owned canonical links without settings read",
  async () => {
    const { router, routes } = makeRouter();
    const originalContentRoutes =
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];

    registerContentTypeRoutes(router, {
      requirePermission: () => async () => undefined,
      resolvePermissions: () => ["content:read"],
      validate: () => undefined,
    });

    const type = await createContentType({
      name: `Redacted Workspace ${randomUUID()}`,
      slug: `redacted-workspace-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    });
    const detailPageId = randomUUID();

    try {
      await db.insert(detailPageDocuments).values({
        id: detailPageId,
        name: "Redacted detail page",
        contentTypeId: type.id,
        status: "draft",
        currentDocument: normalizeDetailPageDocument({
          schemaVersion: 1,
          id: detailPageId,
          name: "Redacted detail page",
          contentTypeId: type.id,
          contentTypeSlug: type.slug,
          status: "draft",
          titlePattern: "{{ title }}",
          settings: {
            template: "detail",
            layout: {},
          },
          blocks: [],
          bindings: [],
        }),
      });
      await setSetting("site.contentRoutes", [
        {
          type: type.slug,
          listPath: `/_catalog/${type.slug}`,
          detailPath: `/${type.slug}/:slug`,
          enabled: true,
          detailPageId,
        },
      ]);

      const result = (await runRoute(routes, "GET", "/content-types/:id/collection-workspace", {
        params: { id: type.id },
        query: {},
        body: {},
      })) as CollectionWorkspaceSummary;

      expect(result.canonical.contentRoute).toBeNull();
      expect(result.canonical.detailPage).toBeNull();
      expect(result.candidates.detailPages).toEqual([
        expect.objectContaining({
          id: detailPageId,
          label: "Redacted detail page",
        }),
      ]);
      expect(result.unresolved).toEqual(
        expect.arrayContaining([
          { resource: "contentRoute", reason: "permission_missing" },
          { resource: "detailPage", reason: "permission_missing" },
        ])
      );
    } finally {
      await setSetting("site.contentRoutes", originalContentRoutes);
      await db.delete(detailPageDocuments).where(eq(detailPageDocuments.contentTypeId, type.id));
      await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
    }
  },
  { timeout: 15_000 }
);

testIfDb("collection workspace route maps unknown content type to not found", async () => {
  const { router, routes } = makeRouter();

  registerContentTypeRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  await expect(
    runRoute(routes, "GET", "/content-types/:id/collection-workspace", {
      params: { id: randomUUID() },
      query: {},
      body: {},
    })
  ).rejects.toMatchObject({
    code: "content_type_not_found",
    status: 404,
  } satisfies Partial<ApiError>);
});
