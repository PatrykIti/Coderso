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

type Route = { method: string; path: string; handlers: RouteHandler[] };

const buildPageData = (settings: Record<string, unknown> = {}) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
    ...settings,
  },
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      name: "Hero",
      variant: "split",
      layout: { columns: 2, align: "center", justify: "between", maxWidth: 1080 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "sm",
      },
      spacing: {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 32,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "hero",
        startsAt: null,
        endsAt: null,
      },
      responsive: {
        mobile: { layout: { columns: 1 }, spacing: { paddingLeft: 20, paddingRight: 20 } },
      },
      blocks: [
        {
          id: "blk_heading",
          type: "heading",
          props: { text: "Route Page", level: "h1", align: "left" },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

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

const expectRouteApiError = async (promise: Promise<unknown>, code: string, status: number) => {
  try {
    await promise;
    throw new Error("expected_route_error");
  } catch (error) {
    expect(error).toMatchObject({ code, status });
  }
};

const expectRouteApiErrorWithPath = async (
  promise: Promise<unknown>,
  code: string,
  status: number,
  path: string
) => {
  try {
    await promise;
    throw new Error("expected_route_error");
  } catch (error) {
    expect(error).toMatchObject({ code, status });
    expect((error as { details?: { path?: string } }).details).toEqual({ path });
  }
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
        data: buildPageData({
          template: "landing",
          showInNav: true,
          collectionLink: {
            contentTypeId: "content-type-1",
            pageRole: "canonical-list-page",
            listingQueryId: "query-1",
            listingTemplateId: "template-1",
          },
        }),
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
        data: buildPageData({
          collectionLink: {
            contentTypeId: "content-type-1",
            pageRole: "canonical-list-page",
            listingQueryId: "query-2",
            listingTemplateId: "template-2",
          },
        }),
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
        data: buildPageData({ showInNav: false }),
      },
    })) as { revision: { id: string; kind: string }; reusedRevision: boolean };
    expect(autosave.revision.kind).toBe("autosave");
    expect(autosave.reusedRevision).toBe(false);

    const publish = (await runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {
        data: buildPageData({
          showInNav: true,
          collectionLink: {
            contentTypeId: "content-type-1",
            pageRole: "canonical-list-page",
            listingQueryId: "query-2",
            listingTemplateId: "template-2",
          },
        }),
      },
    })) as { ok: boolean; page: typeof pages.$inferSelect };
    expect(publish.ok).toBe(true);
    // The route returns the post-publish detail so admin clients can keep
    // the cached draft coherent with the published state: the published
    // document is also persisted as `currentData`.
    expect(publish.page.id).toBe(created.id);
    expect(publish.page.status).toBe("published");
    expect(
      (
        publish.page.currentData as {
          settings?: { collectionLink?: Record<string, unknown> };
        }
      ).settings?.collectionLink
    ).toEqual({
      contentTypeId: "content-type-1",
      pageRole: "canonical-list-page",
      listingQueryId: "query-2",
      listingTemplateId: "template-2",
    });

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

testIfDb("page routes reject fresh legacy widget payloads before persistence", async () => {
  const { router, routes } = makeRouter();
  const deps = makeValidatingDeps();
  const actor = await createRouteActor();
  const page = await createPageDirectly("Invalid Legacy Payload Page");
  const legacyData = { blocks: [] };

  registerPageRoutes(router, deps);

  await expectRouteApiError(
    runRoute(routes, "PATCH", "/pages/:id", {
      params: { id: page.id },
      body: { data: legacyData },
    }),
    "page_document_invalid",
    400
  );

  const afterSaveAttempt = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(afterSaveAttempt[0]?.currentData).toEqual({ blocks: [] });

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: page.id },
      user: { id: actor.id },
      body: { data: legacyData },
    }),
    "page_document_invalid",
    400
  );

  const afterPublishAttempt = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(afterPublishAttempt[0]?.status).toBe("draft");
  expect(afterPublishAttempt[0]?.publishedData).toBeNull();
});

testIfDb("page routes reject unknown v2 document fields before persistence", async () => {
  const { router, routes } = makeRouter();
  const deps = makeValidatingDeps();
  const actor = await createRouteActor();
  const page = await createPageDirectly("Invalid V2 Field Page");
  const invalidSection = buildPageData().sections[0]!;
  const invalidData = {
    ...buildPageData(),
    sections: [
      {
        ...invalidSection,
        unknownField: "nope",
      },
    ],
  };

  registerPageRoutes(router, deps);

  await expectRouteApiError(
    runRoute(routes, "PATCH", "/pages/:id", {
      params: { id: page.id },
      body: { data: invalidData },
    }),
    "page_document_unknown_field",
    400
  );

  const afterSaveAttempt = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(afterSaveAttempt[0]?.currentData).toEqual({ blocks: [] });

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: page.id },
      user: { id: actor.id },
      body: { data: invalidData },
    }),
    "page_document_unknown_field",
    400
  );

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

  await expectRouteApiError(
    runRoute(routes, "GET", "/pages/:id", { params: { id: missingPageId } }),
    "page_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "PATCH", "/pages/:id", {
      params: { id: missingPageId },
      body: { title: "Missing" },
    }),
    "page_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/preview", {
      params: { id: missingPageId },
      body: {},
    }),
    "page_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/publish", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    }),
    "page_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/unpublish", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    }),
    "page_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/duplicate", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    }),
    "page_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "DELETE", "/pages/:id", {
      params: { id: missingPageId },
      user: { id: actor.id },
      body: {},
    }),
    "page_not_found",
    404
  );

  const page = await createPageDirectly();
  const missingRevisionId = randomUUID();

  await expectRouteApiError(
    runRoute(routes, "POST", "/pages/:id/revisions/:revisionId/restore", {
      params: { id: page.id, revisionId: missingRevisionId },
      user: { id: actor.id },
      body: {},
    }),
    "revision_not_found",
    404
  );

  await expectRouteApiError(
    runRoute(routes, "DELETE", "/pages/:id/revisions/:revisionId", {
      params: { id: page.id, revisionId: missingRevisionId },
      user: { id: actor.id },
      body: {},
    }),
    "revision_not_found",
    404
  );

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

  await expectRouteApiError(
    runRoute(routes, "DELETE", "/pages/:id/revisions/:revisionId", {
      params: { id: page.id, revisionId: publishRevision!.id },
      user: { id: actor.id },
      body: {},
    }),
    "revision_delete_forbidden",
    409
  );
});

const canonicalGalleryRows = [
  {
    src: "https://media.example.com/photo.jpg",
    alt: "Photo alt",
    caption: "Photo caption",
    category: "nature",
  },
  { src: "", alt: "", caption: "Caption only" },
  { src: "", alt: "Alt only", caption: "" },
  { src: "", alt: "", caption: "" },
];

const buildCanonicalRoundTripData = () => {
  const base = buildPageData();
  const section = base.sections[0] as { blocks: unknown[] };
  return {
    ...base,
    sections: [
      {
        ...section,
        blocks: [
          {
            id: "blk_gallery",
            type: "gallery",
            props: { layout: "grid", items: canonicalGalleryRows },
            visibility: { visible: true },
          },
          {
            id: "blk_heading",
            type: "heading",
            props: { text: "Route Page", level: "h1", align: "left" },
            style: { layer: { x: 10, y: 20, z: 2 } },
            visibility: { visible: true },
            responsive: { mobile: { style: { layer: { x: 30, y: 40, z: 3 } } } },
          },
        ],
      },
    ],
  };
};

type PersistedPageDoc = {
  sections: Array<{
    blocks: Array<{ props: { items?: Array<Record<string, unknown>> } }>;
  }>;
};

const readGalleryItems = (doc: unknown): Array<Record<string, unknown>> =>
  ((doc as PersistedPageDoc).sections[0]?.blocks[0]?.props.items ?? []) as Array<
    Record<string, unknown>
  >;

const readResponsiveLayerDelta = (doc: unknown): unknown =>
  (
    doc as {
      sections: Array<{
        blocks: Array<{
          responsive?: { mobile?: { style?: { layer?: unknown } } };
        }>;
      }>;
    }
  ).sections[0]?.blocks[1]?.responsive?.mobile?.style?.layer;

testIfDb(
  "page routes round-trip canonical gallery rows and present keys, and reject invalid nested gallery writes without mutating the owned page",
  async () => {
    const { router, routes } = makeRouter();
    const deps = makeValidatingDeps();
    const page = await createPageDirectly("Canonical Gallery Page");
    registerPageRoutes(router, deps);

    const patchData = (data: unknown) =>
      runRoute(routes, "PATCH", "/pages/:id", {
        params: { id: page.id },
        body: { data },
      });

    const patched = (await patchData(buildCanonicalRoundTripData())) as typeof pages.$inferSelect;
    expect(readGalleryItems(patched.currentData)).toEqual(canonicalGalleryRows);

    const [persisted] = await db.select().from(pages).where(eq(pages.id, page.id));
    expect(readGalleryItems(persisted?.currentData)).toEqual(canonicalGalleryRows);
    expect(readResponsiveLayerDelta(patched.currentData)).toEqual({ x: 30, y: 40, z: 3 });
    expect(readResponsiveLayerDelta(persisted?.currentData)).toEqual({ x: 30, y: 40, z: 3 });
    expect(persisted?.currentData).toEqual(patched.currentData);

    const persistedData = persisted?.currentData;
    const persistedStatus = persisted?.status;
    const persistedPublished = persisted?.publishedData;

    const assertOwnedPageUnchanged = async () => {
      const [after] = await db.select().from(pages).where(eq(pages.id, page.id));
      expect(after?.currentData).toEqual(persistedData);
      expect(after?.status).toEqual(persistedStatus);
      expect(after?.publishedData).toEqual(persistedPublished);
    };

    const galleryItemPath = "sections.0.blocks.0.props.items.0";
    const unknownKeyCases = [
      "mystery",
      "url",
      "image",
      "assetUrl",
      "title",
      "label",
      "name",
      "description",
    ];
    for (const key of unknownKeyCases) {
      const doc = structuredClone(persistedData) as PersistedPageDoc;
      readGalleryItems(doc)[0]![key] = "legacy";
      await expectRouteApiErrorWithPath(
        patchData(doc),
        "page_document_unknown_field",
        400,
        `${galleryItemPath}.${key}`
      );
      await assertOwnedPageUnchanged();
    }

    const invalidCases: Array<(items: Array<Record<string, unknown>>) => void> = [
      (items) => {
        delete items[0]!.src;
      },
      (items) => {
        items[0]!.src = "javascript:alert(1)";
      },
      (items) => {
        items[0]!.category = "nature nature";
      },
      (items) => {
        items.length = 0;
        items.push(...Array.from({ length: 121 }, () => ({ src: "", alt: "", caption: "" })));
      },
      (items) => {
        items[0]!.src = "a".repeat(2049);
      },
      (items) => {
        items[0]!.alt = "a".repeat(501);
      },
      (items) => {
        items[0]!.caption = "a".repeat(2001);
      },
      (items) => {
        items[0]!.src = " https://media.example.com/photo.jpg ";
      },
      (items) => {
        items[0]!.alt = " alt ";
      },
      (items) => {
        items[0]!.caption = " caption ";
      },
    ];

    for (const mutate of invalidCases) {
      const doc = structuredClone(persistedData) as PersistedPageDoc;
      mutate(readGalleryItems(doc));
      await expectRouteApiError(patchData(doc), "page_document_invalid", 400);
      await assertOwnedPageUnchanged();
    }
  },
  15_000
);
