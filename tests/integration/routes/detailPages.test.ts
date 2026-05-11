import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  previewTokens,
  users,
} from "../../../core/db/schema";
import type { RouteContext } from "../../../core/server/router";
import {
  mapDetailPageError,
  registerDetailPageRoutes,
  type DetailPageRouteHandler,
} from "../../../core/server/routes/detailPageRoutes";
import { detailPageCreateSchema } from "../../../core/server/validation/detailPageSchemas";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";
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
const trackedEntryIds = new Set<string>();
const trackedUserIds = new Set<string>();
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
  const entryIds = [...trackedEntryIds];
  const userIds = [...trackedUserIds];

  if (detailPageIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, detailPageIds));
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, detailPageIds));
  }

  if (entryIds.length > 0) {
    await db.delete(contentEntries).where(inArray(contentEntries.id, entryIds));
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

  if (userIds.length > 0) {
    await db
      .delete(users)
      .where(inArray(users.id, userIds))
      .catch(() => undefined);
  }

  trackedDetailPageIds.clear();
  trackedContentTypeIds.clear();
  trackedEntryIds.clear();
  trackedUserIds.clear();
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

const createRouteActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `detail-page-route-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_detail_page_route_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

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
      "POST /detail-pages/:id/preview",
      "POST /detail-pages/:id/publish",
      "POST /detail-pages/:id/unpublish",
      "POST /detail-pages/:id/autosave",
      "GET /detail-pages/:id/revisions",
      "POST /detail-pages/:id/revisions/:revisionId/restore",
      "DELETE /detail-pages/:id/revisions/:revisionId",
    ])
  );
  expect(requestedPermissions).toEqual([
    "content:read",
    "content:read",
    "content:write",
    "content:write",
    "content:write",
    "content:read",
    "content:publish",
    "content:publish",
    "content:write",
    "content:read",
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
  expect(mapDetailPageError(new Error("detail_page_status_requires_lifecycle"))?.status).toBe(409);
  expect(mapDetailPageError(new Error("detail_page_revision_not_found"))?.status).toBe(404);
  expect(mapDetailPageError(new Error("detail_page_revision_delete_forbidden"))?.status).toBe(409);
  expect(mapDetailPageError(new Error("other_error"))).toBeNull();
});

test("detail page routes validate list and write payloads before service work", async () => {
  const { router, routes } = makeRouter();
  const validateCalls: Array<{ schema: unknown; payload: unknown }> = [];
  const validId = randomUUID();
  const validRevisionId = randomUUID();

  registerDetailPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: (schema, payload) => {
      validateCalls.push({ schema, payload });
      if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        (("extra" in payload && payload.extra === true) ||
          ("contentTypeId" in payload && payload.contentTypeId === "bad") ||
          ("id" in payload && payload.id === "not-a-uuid") ||
          ("revisionId" in payload && payload.revisionId === "not-a-uuid"))
      ) {
        throw new Error("validation_stop");
      }
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
      params: { id: validId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "POST", "/detail-pages/:id/preview", {
      params: { id: validId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "POST", "/detail-pages/:id/autosave", {
      params: { id: validId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "DELETE", "/detail-pages/:id", {
      params: { id: validId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "POST", "/detail-pages/:id/publish", {
      params: { id: validId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "GET", "/detail-pages/:id/revisions", {
      params: { id: "not-a-uuid" },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "POST", "/detail-pages/:id/revisions/:revisionId/restore", {
      params: { id: validId, revisionId: validRevisionId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  await expect(
    runRoute(routes, "DELETE", "/detail-pages/:id/revisions/:revisionId", {
      params: { id: validId, revisionId: validRevisionId },
      body: { extra: true },
    })
  ).rejects.toThrow("validation_stop");

  expect(validateCalls.map((entry) => entry.payload)).toEqual([
    { contentTypeId: "bad" },
    { extra: true },
    { id: validId },
    { extra: true },
    { id: validId },
    { extra: true },
    { id: validId },
    { extra: true },
    { id: validId },
    { extra: true },
    { id: validId },
    { extra: true },
    { id: "not-a-uuid" },
    { id: validId, revisionId: validRevisionId },
    { extra: true },
    { id: validId, revisionId: validRevisionId },
    { extra: true },
  ]);
});

test("detail page route schemas reject unknown top-level document fields before service work", async () => {
  const { router, routes } = makeRouter();

  registerDetailPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: validateSchema,
  });

  await expect(
    runRoute(routes, "POST", "/detail-pages", {
      body: {
        document: {
          ...buildDetailPageDocumentInput(randomUUID(), "products"),
          unexpectedField: true,
        },
      },
    })
  ).rejects.toMatchObject({
    code: "validation_error",
    status: 400,
  });
});

test("detail page route schemas accept the owner document related field only", () => {
  const payload = {
    document: {
      ...buildDetailPageDocumentInput(randomUUID(), "products"),
      related: [
        {
          id: "related-products",
          kind: "same-content-type",
          label: "Related products",
          limit: 4,
          excludeCurrentEntry: true,
        },
      ],
    },
  };

  expect(() => validateSchema(detailPageCreateSchema, payload)).not.toThrow();
  expect(() =>
    validateSchema(detailPageCreateSchema, {
      document: {
        ...buildDetailPageDocumentInput(randomUUID(), "products"),
        relatedSources: [],
      },
    })
  ).toThrow();
});

test("detail page autosave and publish require an authenticated actor after validation", async () => {
  const { router, routes } = makeRouter();

  registerDetailPageRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  await expect(
    runRoute(routes, "POST", "/detail-pages/:id/autosave", {
      params: { id: randomUUID() },
      body: {
        document: {
          ...buildDetailPageDocumentInput(randomUUID(), "products"),
          id: randomUUID(),
        },
      },
    })
  ).rejects.toThrow("auth_required");

  await expect(
    runRoute(routes, "POST", "/detail-pages/:id/publish", {
      params: { id: randomUUID() },
      body: {},
    })
  ).rejects.toThrow("auth_required");
});

testIfDb(
  "detail page routes cover create, list, read, update, preview, autosave, publish, revisions, unpublish, and delete",
  async () => {
    const { router, routes } = makeRouter();
    registerDetailPageRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });

    const actor = await createRouteActor();
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

    const [entry] = await db
      .insert(contentEntries)
      .values({
        typeId: contentType.id,
        slug: `product-${randomUUID()}`,
        title: "Preview product",
        status: "published",
        data: { headline: "Preview product" },
        publishedAt: new Date(),
      })
      .returning();
    if (!entry?.id) throw new Error("missing_detail_page_route_entry");
    trackedEntryIds.add(entry.id);

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
          status: "draft",
        },
      },
    })) as {
      name: string;
      status: string;
      publishedDocument: { contentTypeSlug: string } | null;
    };
    expect(updated.name).toBe("Products detail template updated");
    expect(updated.status).toBe("draft");
    expect(updated.publishedDocument).toBeNull();

    const preview = (await runRoute(routes, "POST", "/detail-pages/:id/preview", {
      params: { id: created.id },
      headers: {
        host: "localhost:8787",
        "x-forwarded-host": "cms.example.test",
        "x-forwarded-proto": "https",
      },
      body: { sampleEntryId: entry.id, ttlMinutes: 5 },
    })) as { token: string; previewUrl: string; expiresAt: Date };
    expect(typeof preview.token).toBe("string");
    expect(preview.previewUrl).toContain("/preview?");
    expect(preview.previewUrl).toContain("type=detail-page");
    expect(preview.expiresAt).toBeInstanceOf(Date);

    const autosave = (await runRoute(routes, "POST", "/detail-pages/:id/autosave", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {
        document: {
          ...buildDetailPageDocumentInput(contentType.id, contentType.slug),
          id: created.id,
          name: "Products detail autosave",
        },
      },
    })) as { revision: { kind: string }; reusedRevision: boolean };
    expect(autosave.revision.kind).toBe("autosave");
    expect(autosave.reusedRevision).toBe(false);

    const publish = await runRoute(routes, "POST", "/detail-pages/:id/publish", {
      params: { id: created.id },
      user: { id: actor.id },
      body: {},
    });
    expect(publish).toEqual({ ok: true });

    const revisions = (await runRoute(routes, "GET", "/detail-pages/:id/revisions", {
      params: { id: created.id },
    })) as Array<{ id: string; kind: string; document?: unknown }>;
    expect(revisions.map((revision) => revision.kind)).toContain("publish");
    expect(revisions.map((revision) => revision.kind)).toContain("autosave");
    expect(revisions.every((revision) => !("document" in revision))).toBe(true);

    const autosaveRevision = revisions.find((revision) => revision.kind === "autosave");
    const publishRevision = revisions.find((revision) => revision.kind === "publish");
    if (!autosaveRevision || !publishRevision) {
      throw new Error("missing_detail_page_revisions");
    }

    const restore = (await runRoute(
      routes,
      "POST",
      "/detail-pages/:id/revisions/:revisionId/restore",
      {
        params: { id: created.id, revisionId: autosaveRevision.id },
        body: {},
      }
    )) as { ok: boolean; restored: boolean; detailPage: { name: string } };
    expect(restore.ok).toBe(true);
    expect(restore.restored).toBe(true);
    expect(restore.detailPage.name).toBe("Products detail autosave");
    expect("document" in (restore as { revision?: { document?: unknown } }).revision!).toBe(false);
    expect(
      "currentDocument" in (restore as { detailPage?: { currentDocument?: unknown } }).detailPage!
    ).toBe(false);

    const discard = await runRoute(routes, "DELETE", "/detail-pages/:id/revisions/:revisionId", {
      params: { id: created.id, revisionId: autosaveRevision.id },
      body: {},
    });
    expect(discard).toEqual({ ok: true });

    await expect(
      runRoute(routes, "DELETE", "/detail-pages/:id/revisions/:revisionId", {
        params: { id: created.id, revisionId: publishRevision.id },
        body: {},
      })
    ).rejects.toMatchObject({
      code: "detail_page_revision_delete_forbidden",
      status: 409,
    });

    const afterPublish = (await runRoute(routes, "GET", "/detail-pages/:id", {
      params: { id: created.id },
    })) as {
      status: string;
      currentDocument: { name: string; status: string };
      publishedDocument: { name: string; status: string } | null;
    };
    expect(afterPublish.status).toBe("published");
    expect(afterPublish.publishedDocument).not.toBeNull();

    const editedDraft = (await runRoute(routes, "PATCH", "/detail-pages/:id", {
      params: { id: created.id },
      body: {
        document: {
          ...buildDetailPageDocumentInput(contentType.id, contentType.slug),
          id: created.id,
          name: "Products detail draft edit",
          status: "draft",
        },
      },
    })) as {
      status: string;
      currentDocument: { name: string; status: string };
      publishedDocument: { name: string; status: string } | null;
    };
    expect(editedDraft.status).toBe("published");
    expect(editedDraft.currentDocument).toMatchObject({
      name: "Products detail draft edit",
      status: "draft",
    });
    expect(editedDraft.publishedDocument).toMatchObject({
      name: "Products detail template updated",
      status: "published",
    });

    const unpublish = await runRoute(routes, "POST", "/detail-pages/:id/unpublish", {
      params: { id: created.id },
      body: {},
    });
    expect(unpublish).toEqual({ ok: true });

    const afterUnpublish = (await runRoute(routes, "GET", "/detail-pages/:id", {
      params: { id: created.id },
    })) as { status: string; publishedDocument: object | null };
    expect(afterUnpublish.status).toBe("draft");
    expect(afterUnpublish.publishedDocument).toBeNull();

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
  },
  15_000
);

testIfDb(
  "detail page preview route rejects mismatched, draft, and missing sample entries",
  async () => {
    const { router, routes } = makeRouter();
    registerDetailPageRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });

    const contentType = await createContentType({
      name: `Preview Products ${randomUUID()}`,
      slug: `preview-products-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    trackedContentTypeIds.add(contentType.id);

    const otherContentType = await createContentType({
      name: `Preview Services ${randomUUID()}`,
      slug: `preview-services-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    trackedContentTypeIds.add(otherContentType.id);

    const created = (await runRoute(routes, "POST", "/detail-pages", {
      body: {
        document: buildDetailPageDocumentInput(contentType.id, contentType.slug),
      },
    })) as { id: string };
    trackedDetailPageIds.add(created.id);

    const [mismatchedEntry] = await db
      .insert(contentEntries)
      .values({
        typeId: otherContentType.id,
        slug: `preview-service-${randomUUID()}`,
        title: "Preview service",
        status: "published",
        data: { headline: "Preview service" },
        publishedAt: new Date(),
      })
      .returning();
    if (!mismatchedEntry?.id) throw new Error("missing_detail_page_preview_mismatched_entry");
    trackedEntryIds.add(mismatchedEntry.id);

    await expect(
      runRoute(routes, "POST", "/detail-pages/:id/preview", {
        params: { id: created.id },
        body: { sampleEntryId: mismatchedEntry.id },
      })
    ).rejects.toMatchObject({
      code: "detail_page_content_type_mismatch",
      status: 409,
    });

    const [draftEntry] = await db
      .insert(contentEntries)
      .values({
        typeId: contentType.id,
        slug: `preview-draft-${randomUUID()}`,
        title: "Preview draft",
        status: "draft",
        data: { headline: "Preview draft" },
      })
      .returning();
    if (!draftEntry?.id) throw new Error("missing_detail_page_preview_draft_entry");
    trackedEntryIds.add(draftEntry.id);

    await expect(
      runRoute(routes, "POST", "/detail-pages/:id/preview", {
        params: { id: created.id },
        body: { sampleEntryId: draftEntry.id },
      })
    ).rejects.toMatchObject({
      code: "detail_page_invalid",
      status: 400,
    });

    await expect(
      runRoute(routes, "POST", "/detail-pages/:id/preview", {
        params: { id: created.id },
        body: { sampleEntryId: randomUUID() },
      })
    ).rejects.toMatchObject({
      code: "detail_page_invalid",
      status: 400,
    });
  }
);

testIfDb(
  "detail page CRUD routes reject published documents and require lifecycle routes for public state changes",
  async () => {
    const { router, routes } = makeRouter();
    registerDetailPageRoutes(router, {
      requirePermission: () => async () => undefined,
      validate: () => undefined,
    });

    const contentType = await createContentType({
      name: `Draft Products ${randomUUID()}`,
      slug: `draft-products-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    trackedContentTypeIds.add(contentType.id);

    await expect(
      runRoute(routes, "POST", "/detail-pages", {
        body: {
          document: {
            ...buildDetailPageDocumentInput(contentType.id, contentType.slug),
            status: "published",
          },
        },
      })
    ).rejects.toMatchObject({
      code: "detail_page_status_requires_lifecycle",
      status: 409,
    });

    const created = (await runRoute(routes, "POST", "/detail-pages", {
      body: {
        document: buildDetailPageDocumentInput(contentType.id, contentType.slug),
      },
    })) as { id: string };
    trackedDetailPageIds.add(created.id);

    await expect(
      runRoute(routes, "PATCH", "/detail-pages/:id", {
        params: { id: created.id },
        body: {
          document: {
            ...buildDetailPageDocumentInput(contentType.id, contentType.slug),
            id: created.id,
            status: "published",
          },
        },
      })
    ).rejects.toMatchObject({
      code: "detail_page_status_requires_lifecycle",
      status: 409,
    });
  }
);

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
