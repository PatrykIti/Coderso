import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  detailPageDocuments,
  detailPageRevisions,
  contentTypes,
  users,
} from "../../../core/db/schema";
import {
  autosaveDetailPageDocument,
  createDetailPageDocument,
  deleteDetailPageDocument,
  getDetailPageDocument,
  listDetailPageDocuments,
  publishDetailPageDocument,
  unpublishDetailPageDocument,
  updateDetailPageDocument,
} from "../../../core/services/content/detailPageDocumentService";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";

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

const cleanupDetailPageIds = new Set<string>();
const cleanupContentTypeIds = new Set<string>();
const cleanupUserIds = new Set<string>();
let originalContentRoutes: ContentRouteSetting[] | null = null;

afterEach(async () => {
  if (!hasDb) return;

  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
    originalContentRoutes = null;
  }

  for (const detailPageId of cleanupDetailPageIds) {
    await db
      .delete(detailPageDocuments)
      .where(eq(detailPageDocuments.id, detailPageId))
      .catch(() => undefined);
  }
  cleanupDetailPageIds.clear();

  for (const contentTypeId of cleanupContentTypeIds) {
    await db
      .delete(detailPageDocuments)
      .where(eq(detailPageDocuments.contentTypeId, contentTypeId))
      .catch(() => undefined);
    await deleteContentType(contentTypeId).catch(async () => {
      await db
        .delete(contentTypes)
        .where(eq(contentTypes.id, contentTypeId))
        .catch(() => undefined);
    });
  }
  cleanupContentTypeIds.clear();

  for (const userId of cleanupUserIds) {
    await db
      .delete(users)
      .where(eq(users.id, userId))
      .catch(() => undefined);
  }
  cleanupUserIds.clear();
});

const createSchema = () => ({
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", xFieldType: "text" },
  },
});

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

const createLifecycleActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `detail-page-lifecycle-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_detail_page_lifecycle_actor");
  cleanupUserIds.add(actor.id);
  return actor;
};

testIfDb(
  "detail page document service creates, filters, updates, and deletes documents",
  async () => {
    const contentType = await createContentType({
      name: `Products ${randomUUID()}`,
      slug: `products-${randomUUID()}`,
      schema: createSchema(),
    });
    cleanupContentTypeIds.add(contentType.id);

    const created = await createDetailPageDocument({
      document: buildDetailPageDocumentInput(contentType.id, "stale-products"),
    });
    cleanupDetailPageIds.add(created.record.id);

    expect(created.record.currentDocument.contentTypeSlug).toBe(contentType.slug);
    expect(created.record.publishedDocument).toBeNull();

    const filtered = await listDetailPageDocuments({ contentTypeId: contentType.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(created.record.id);

    const updated = await updateDetailPageDocument(created.record.id, {
      document: {
        ...buildDetailPageDocumentInput(contentType.id, "another-stale-products"),
        name: "Products detail template updated",
        status: "published",
      },
    });

    expect(updated.record.name).toBe("Products detail template updated");
    expect(updated.record.currentDocument.contentTypeSlug).toBe(contentType.slug);
    expect(updated.record.publishedDocument?.contentTypeSlug).toBe(contentType.slug);

    const readBack = await getDetailPageDocument(created.record.id);
    expect(readBack?.status).toBe("published");

    const deleted = await deleteDetailPageDocument(created.record.id);
    expect(deleted.id).toBe(created.record.id);
    cleanupDetailPageIds.delete(created.record.id);

    const missing = await getDetailPageDocument(created.record.id);
    expect(missing).toBeNull();
  }
);

testIfDb(
  "detail page document service rejects delete while a content route is still linked",
  async () => {
    originalContentRoutes =
      originalContentRoutes ??
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ??
      [];

    const contentType = await createContentType({
      name: `Linked Products ${randomUUID()}`,
      slug: `linked-products-${randomUUID()}`,
      schema: createSchema(),
    });
    cleanupContentTypeIds.add(contentType.id);

    const created = await createDetailPageDocument({
      document: buildDetailPageDocumentInput(contentType.id, contentType.slug),
    });
    cleanupDetailPageIds.add(created.record.id);

    await setSetting("site.contentRoutes", [
      ...originalContentRoutes,
      {
        type: contentType.slug,
        listPath: `/${contentType.slug}`,
        detailPath: `/${contentType.slug}/:slug`,
        enabled: true,
        detailPageId: created.record.id,
      },
    ]);

    await expect(deleteDetailPageDocument(created.record.id)).rejects.toThrow(
      "detail_page_route_conflict"
    );

    await setSetting("site.contentRoutes", originalContentRoutes);
  }
);

testIfDb(
  "detail page document service publishes, autosaves, and unpublishes through lifecycle helpers",
  async () => {
    const actor = await createLifecycleActor();
    const contentType = await createContentType({
      name: `Lifecycle Products ${randomUUID()}`,
      slug: `lifecycle-products-${randomUUID()}`,
      schema: createSchema(),
    });
    cleanupContentTypeIds.add(contentType.id);

    const created = await createDetailPageDocument({
      document: buildDetailPageDocumentInput(contentType.id, contentType.slug),
    });
    cleanupDetailPageIds.add(created.record.id);

    const published = await publishDetailPageDocument(created.record.id, actor.id);
    expect(published.status).toBe("published");
    expect(published.publishedDocument?.status).toBe("published");

    const autosave = await autosaveDetailPageDocument(
      created.record.id,
      {
        document: {
          ...buildDetailPageDocumentInput(contentType.id, contentType.slug),
          id: created.record.id,
          name: "Lifecycle products autosave",
        },
      },
      actor.id
    );
    expect(autosave.revision.kind).toBe("autosave");
    expect(autosave.reusedRevision).toBe(false);

    const revisions = await db
      .select()
      .from(detailPageRevisions)
      .where(eq(detailPageRevisions.detailPageId, created.record.id));
    expect(revisions.some((row) => row.kind === "publish")).toBe(true);
    expect(revisions.some((row) => row.kind === "autosave")).toBe(true);

    const unpublished = await unpublishDetailPageDocument(created.record.id);
    expect(unpublished.status).toBe("draft");
    expect(unpublished.publishedDocument).toBeNull();
  }
);
