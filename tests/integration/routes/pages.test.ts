import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { auditLogs, pageRevisions, pages, previewTokens, users } from "../../../core/db/schema";
import {
  registerPageRoutes,
  type RouteContext,
  type RouteHandler,
} from "../../../core/server/routes/pageRoutes";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

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

const trackedPageIds = new Set<string>();
const trackedUserIds = new Set<string>();

const trackPage = (id: string | undefined | null) => {
  if (id) trackedPageIds.add(id);
};

const trackUser = (id: string | undefined | null) => {
  if (id) trackedUserIds.add(id);
};

const cleanupTrackedRows = async () => {
  const pageIds = [...trackedPageIds];
  const userIds = [...trackedUserIds];

  if (pageIds.length > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.targetId, pageIds));
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPageIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  if (hasDb) await cleanupTrackedRows();
});

const findRoute = (routes: Route[], method: string, path: string) => {
  const route = routes.find((item) => item.method === method && item.path === path);
  if (!route) {
    throw new Error(`missing route ${method} ${path}`);
  }
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

const makeValidatingDeps = () => {
  return {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  };
};

const createRouteActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `pages-route-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  trackUser(actor?.id);
  if (!actor?.id) throw new Error("missing_test_actor");
  return actor;
};

const createPageDirectly = async (title = "Route Error Page") => {
  const [page] = await db
    .insert(pages)
    .values({
      title,
      slug: `/route-${randomUUID()}`,
      status: "draft",
      currentData: { blocks: [] },
    })
    .returning();
  trackPage(page?.id);
  if (!page?.id) throw new Error("missing_test_page");
  return page;
};

test("registerPageRoutes wires endpoints and required permissions", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerPageRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /pages",
      "GET /pages/template-options",
      "POST /pages",
      "GET /pages/:id",
      "PATCH /pages/:id",
      "POST /pages/:id/autosave",
      "POST /pages/:id/publish",
      "POST /pages/:id/unpublish",
      "POST /pages/:id/preview",
      "POST /pages/:id/duplicate",
      "DELETE /pages/:id",
      "GET /pages/:id/revisions",
      "POST /pages/:id/revisions/:revisionId/restore",
      "DELETE /pages/:id/revisions/:revisionId",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
    "content:publish",
    "content:publish",
    "content:read",
    "content:write",
    "content:write",
    "content:read",
    "content:write",
    "content:write",
  ]);
});

test("mutating and preview page routes validate payloads before service work", async () => {
  const { router, routes } = makeRouter();
  const validateCalls: Array<{ schema: unknown; payload: unknown }> = [];

  registerPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validateCalls.push({ schema, payload });
      throw new Error("validation_stop");
    },
  });

  const cases: Array<{
    method: string;
    path: string;
    body: unknown;
    params?: Record<string, string>;
  }> = [
    { method: "POST", path: "/pages", body: { extra: true } },
    {
      method: "PATCH",
      path: "/pages/:id",
      body: { extra: true },
      params: { id: "page-1" },
    },
    {
      method: "POST",
      path: "/pages/:id/autosave",
      body: { extra: true },
      params: { id: "page-1" },
    },
    {
      method: "POST",
      path: "/pages/:id/publish",
      body: { extra: true },
      params: { id: "page-1" },
    },
    {
      method: "POST",
      path: "/pages/:id/preview",
      body: { extra: true },
      params: { id: "page-1" },
    },
  ];

  for (const item of cases) {
    await expect(
      runRoute(routes, item.method, item.path, {
        params: item.params ?? {},
        body: item.body,
        user: { id: "user-1" },
      })
    ).rejects.toThrow("validation_stop");
  }

  expect(validateCalls.map((call) => call.payload)).toEqual(cases.map((item) => item.body));
});

test("autosave and publish require an authenticated actor after validation", async () => {
  const { router, routes } = makeRouter();

  registerPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  await expect(
    runRoute(routes, "POST", "/pages/:id/autosave", {
      params: { id: randomUUID() },
      body: { title: "Draft title" },
    })
  ).rejects.toThrow("auth_required");

  await expect(
    runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: randomUUID() },
      body: {},
    })
  ).rejects.toThrow("auth_required");
});

testIfDb(
  "page route handlers cover create, update, autosave, publish, preview, restore, discard, duplicate, unpublish, and delete",
  async () => {
    const { router, routes } = makeRouter();
    const actor = await createRouteActor();
    const deps = makeValidatingDeps();

    registerPageRoutes(router, deps);

    const slug = `/route-pages-${randomUUID()}`;
    const created = (await runRoute(routes, "POST", "/pages", {
      user: { id: actor.id },
      body: {
        title: "Route Page",
        slug,
        data: {
          blocks: [],
          settings: {
            template: "landing",
            showInNav: true,
            collectionLink: {
              contentTypeId: "content-type-1",
              pageRole: "canonical-list-page",
              listingQueryId: "query-1",
              listingTemplateId: "template-1",
            },
          },
        },
      },
    })) as typeof pages.$inferSelect;
    trackPage(created.id);
    expect(created.title).toBe("Route Page");
    expect(created.authorId).toBe(actor.id);
    expect(
      (
        created.currentData as {
          settings?: { collectionLink?: Record<string, unknown> };
        }
      ).settings?.collectionLink
    ).toEqual({
      contentTypeId: "content-type-1",
      pageRole: "canonical-list-page",
      listingQueryId: "query-1",
      listingTemplateId: "template-1",
    });

    const detail = (await runRoute(routes, "GET", "/pages/:id", {
      params: { id: created.id },
    })) as typeof pages.$inferSelect;
    expect(detail.id).toBe(created.id);

    const updated = (await runRoute(routes, "PATCH", "/pages/:id", {
      params: { id: created.id },
      body: {
        title: "Route Page Updated",
        data: {
          blocks: [],
          settings: {
            collectionLink: {
              contentTypeId: "content-type-1",
              pageRole: "canonical-list-page",
              listingQueryId: "query-2",
              listingTemplateId: "template-2",
            },
          },
        },
      },
    })) as typeof pages.$inferSelect;
    expect(updated.title).toBe("Route Page Updated");
    expect(
      (
        updated.currentData as {
          settings?: { collectionLink?: Record<string, unknown> };
        }
      ).settings?.collectionLink
    ).toEqual({
      contentTypeId: "content-type-1",
      pageRole: "canonical-list-page",
      listingQueryId: "query-2",
      listingTemplateId: "template-2",
    });

    const autosave = (await runRoute(routes, "POST", "/pages/:id/autosave", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {
        title: "Route Page Autosave",
        slug: `${slug}-autosave`,
        data: { blocks: [], settings: { showInNav: false } },
      },
    })) as { revision: { id: string; kind: string }; reusedRevision: boolean };
    expect(autosave.revision.kind).toBe("autosave");
    expect(autosave.reusedRevision).toBe(false);

    const publish = await runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {
        data: {
          blocks: [],
          settings: {
            showInNav: true,
            collectionLink: {
              contentTypeId: "content-type-1",
              pageRole: "canonical-list-page",
              listingQueryId: "query-2",
              listingTemplateId: "template-2",
            },
          },
        },
      },
    });
    expect(publish).toEqual({ ok: true });

    const preview = (await runRoute(routes, "POST", "/pages/:id/preview", {
      params: { id: created.id },
      headers: {
        host: "localhost:8787",
        "x-forwarded-host": "cms.example.test",
        "x-forwarded-proto": "https",
      },
      body: { ttlMinutes: 5 },
    })) as { token: string; previewUrl: string; expiresAt: Date };
    expect(typeof preview.token).toBe("string");
    expect(preview.previewUrl).toContain("/preview?");
    expect(preview.previewUrl).toContain("type=page");
    expect(preview.previewUrl).toContain("token=");
    expect(preview.expiresAt).toBeInstanceOf(Date);

    const revisions = (await runRoute(routes, "GET", "/pages/:id/revisions", {
      params: { id: created.id },
    })) as Array<{ id: string; kind: string }>;
    expect(revisions.map((revision) => revision.kind)).toContain("publish");
    expect(revisions.map((revision) => revision.kind)).toContain("autosave");

    const publishedDetail = (await runRoute(routes, "GET", "/pages/:id", {
      params: { id: created.id },
    })) as typeof pages.$inferSelect;
    expect(
      (
        publishedDetail.publishedData as {
          settings?: { collectionLink?: Record<string, unknown> };
        }
      ).settings?.collectionLink
    ).toEqual({
      contentTypeId: "content-type-1",
      pageRole: "canonical-list-page",
      listingQueryId: "query-2",
      listingTemplateId: "template-2",
    });

    const restore = (await runRoute(routes, "POST", "/pages/:id/revisions/:revisionId/restore", {
      params: { id: created.id, revisionId: autosave.revision.id },
      user: { id: actor.id },
      body: {},
    })) as { ok: boolean; restored: boolean; page: { title: string } };
    expect(restore.ok).toBe(true);
    expect(restore.restored).toBe(true);
    expect(restore.page.title).toBe("Route Page Autosave");

    const discard = await runRoute(routes, "DELETE", "/pages/:id/revisions/:revisionId", {
      params: { id: created.id, revisionId: autosave.revision.id },
      user: { id: actor.id },
      body: {},
    });
    expect(discard).toEqual({ ok: true });

    const clone = (await runRoute(routes, "POST", "/pages/:id/duplicate", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {},
    })) as typeof pages.$inferSelect;
    trackPage(clone.id);
    expect(clone.id).not.toBe(created.id);
    expect(clone.authorId).toBe(actor.id);

    const unpublish = await runRoute(routes, "POST", "/pages/:id/unpublish", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {},
    });
    expect(unpublish).toEqual({ ok: true });

    const deleted = await runRoute(routes, "DELETE", "/pages/:id", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {},
    });
    expect(deleted).toEqual({ ok: true });

    const actionRows = await db
      .select({ action: auditLogs.action, targetId: auditLogs.targetId })
      .from(auditLogs)
      .where(eq(auditLogs.targetId, created.id));
    expect(actionRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "pages.publish",
        "pages.restore",
        "pages.autosave.discard",
        "pages.delete",
      ])
    );
  },
  15_000
);

testIfDb("page preview route returns sanitized probe metadata", async () => {
  const { router, routes } = makeRouter();
  const deps = makeValidatingDeps();
  const page = await createPageDirectly("Probe Page");
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  registerPageRoutes(router, deps);

  try {
    globalThis.fetch = async (input) => {
      fetchCalls.push(String(input));
      return new Response(null, { status: 503 });
    };

    const preview = (await runRoute(routes, "POST", "/pages/:id/preview", {
      params: { id: page.id },
      headers: {
        host: "localhost:8787",
        "x-forwarded-host": "cms.example.test",
        "x-forwarded-proto": "https",
      },
      body: { ttlMinutes: 5, probe: true },
    })) as {
      token: string;
      previewUrl: string;
      probe: {
        ok: false;
        status: number;
        reason: string;
        targetLabel: string;
      };
    };

    const previewTarget = new URL(preview.previewUrl);

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toBe(preview.previewUrl);
    expect(preview.probe).toEqual({
      ok: false,
      status: 503,
      reason: "http_error",
      targetLabel: `${previewTarget.origin}${previewTarget.pathname}`,
    });
    expect(preview.previewUrl).toContain("token=");
    expect(JSON.stringify(preview.probe)).not.toContain(preview.token);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

testIfDb("page routes reject invalid Section widget payloads before persistence", async () => {
  ensureRuntimeWidgetsRegistered();
  const { router, routes } = makeRouter();
  const deps = makeValidatingDeps();
  const actor = await createRouteActor();
  const page = await createPageDirectly("Invalid Section Payload Page");
  const invalidData = {
    blocks: [
      {
        id: "section-invalid",
        type: "section",
        variant: "default",
        data: {
          heading: {
            level: "h8",
          },
          style: {
            borderWidth: "9",
            radius: "circle",
          },
        },
        layout: {
          container: "inherit",
          padding: { top: "inherit", bottom: "inherit" },
          margin: { top: "inherit", bottom: "inherit" },
          background: { color: "transparent", image: null },
        },
        visibility: { devices: ["desktop", "tablet", "mobile"], enabled: true },
        editor: { mode: "visual", wizardCompleted: true },
      },
    ],
  };

  registerPageRoutes(router, deps);

  await expect(
    runRoute(routes, "PATCH", "/pages/:id", {
      params: { id: page.id },
      body: { data: invalidData },
    })
  ).rejects.toThrow("widget_schema_invalid");

  const afterSaveAttempt = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(afterSaveAttempt[0]?.currentData).toEqual({ blocks: [] });

  await expect(
    runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: page.id },
      user: { id: actor.id },
      body: { data: invalidData },
    })
  ).rejects.toThrow("widget_schema_invalid");

  const afterPublishAttempt = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(afterPublishAttempt[0]?.status).toBe("draft");
  expect(afterPublishAttempt[0]?.publishedData).toBeNull();
});

testIfDb("page route handlers surface not-found and revision guard errors", async () => {
  const { router, routes } = makeRouter();
  const actor = await createRouteActor();
  const deps = makeValidatingDeps();

  registerPageRoutes(router, deps);

  const missingPageId = randomUUID();

  await expect(
    runRoute(routes, "GET", "/pages/:id", { params: { id: missingPageId } })
  ).rejects.toThrow("page_not_found");

  await expect(
    runRoute(routes, "PATCH", "/pages/:id", {
      params: { id: missingPageId },
      body: { title: "Missing" },
    })
  ).rejects.toThrow("page_not_found");

  await expect(
    runRoute(routes, "POST", "/pages/:id/preview", {
      params: { id: missingPageId },
      body: {},
    })
  ).rejects.toThrow("page_not_found");

  await expect(
    runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("page_not_found");

  await expect(
    runRoute(routes, "POST", "/pages/:id/unpublish", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("page_not_found");

  await expect(
    runRoute(routes, "POST", "/pages/:id/duplicate", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("page_not_found");

  await expect(
    runRoute(routes, "DELETE", "/pages/:id", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("page_not_found");

  const page = await createPageDirectly();
  const missingRevisionId = randomUUID();

  await expect(
    runRoute(routes, "POST", "/pages/:id/revisions/:revisionId/restore", {
      params: { id: page.id, revisionId: missingRevisionId },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("revision_not_found");

  await expect(
    runRoute(routes, "DELETE", "/pages/:id/revisions/:revisionId", {
      params: { id: page.id, revisionId: missingRevisionId },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("revision_not_found");

  await runRoute(routes, "POST", "/pages/:id/publish", {
    params: { id: page.id },
    user: { id: actor.id },
    body: {},
  });
  const publishRevisions = (await runRoute(routes, "GET", "/pages/:id/revisions", {
    params: { id: page.id },
  })) as Array<{ id: string; kind: string }>;
  const publishRevision = publishRevisions.find((revision) => revision.kind === "publish");
  expect(typeof publishRevision?.id).toBe("string");

  await expect(
    runRoute(routes, "DELETE", "/pages/:id/revisions/:revisionId", {
      params: { id: page.id, revisionId: publishRevision!.id },
      user: { id: actor.id },
      body: {},
    })
  ).rejects.toThrow("revision_delete_forbidden");
});
