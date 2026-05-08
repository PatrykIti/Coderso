import { and, desc, eq, inArray, max } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../../db/client";
import { detailPageDocuments, detailPageRevisions } from "../../db/schema";
import { invalidateContentRouteCache } from "../../site/cache/siteCache";
import { areRevisionSnapshotsEqual } from "./revisionSnapshot";
import { getSetting, type ContentRouteSetting } from "../settings/settingsService";
import { getContentType, type ContentTypeRecord } from "./typeService";
import { normalizeDetailPageDocument } from "./detailPageSchema";
import type { DetailPageDocument, DetailPageRevisionKind } from "./detailPageTypes";

export type DetailPageDocumentRecord = Omit<
  typeof detailPageDocuments.$inferSelect,
  "currentDocument" | "publishedDocument"
> & {
  currentDocument: DetailPageDocument;
  publishedDocument: DetailPageDocument | null;
};

export type DetailPageRevisionRecord = {
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  document: DetailPageDocument;
  createdAt: Date;
  createdBy: string | null;
};

export type DetailPageAutosaveResult = {
  revision: DetailPageRevisionRecord;
  reusedRevision: boolean;
  savedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mapDetailPageRow = (
  row: typeof detailPageDocuments.$inferSelect
): DetailPageDocumentRecord => {
  const currentDocument = normalizeDetailPageDocument(row.currentDocument);
  const publishedDocument = row.publishedDocument
    ? normalizeDetailPageDocument(row.publishedDocument)
    : null;

  if (currentDocument.id !== row.id || currentDocument.contentTypeId !== row.contentTypeId) {
    throw new Error("detail_page_invalid");
  }
  if (
    publishedDocument &&
    (publishedDocument.id !== row.id || publishedDocument.contentTypeId !== row.contentTypeId)
  ) {
    throw new Error("detail_page_invalid");
  }

  return {
    ...row,
    currentDocument,
    publishedDocument,
  };
};

const invalidateLinkedDetailPageCaches = async (detailPageId: string, contentTypeSlug: string) => {
  const contentRoutes = ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  for (const route of contentRoutes) {
    if (!route.enabled) continue;
    if (route.type !== contentTypeSlug) continue;
    if ((route.detailPageId ?? null) !== detailPageId) continue;
    invalidateContentRouteCache(route);
  }
};

const findLinkedRoute = async (detailPageId: string) => {
  const contentRoutes = ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  return contentRoutes.find((route) => (route.detailPageId ?? null) === detailPageId) ?? null;
};

const normalizeDocumentWithResolvedId = (value: unknown, resolvedId?: string) => {
  if (!isRecord(value)) {
    throw new Error("detail_page_invalid");
  }

  const inputWithId =
    resolvedId === undefined
      ? value
      : {
          ...value,
          id: value.id ?? resolvedId,
        };

  try {
    return normalizeDetailPageDocument(inputWithId);
  } catch {
    throw new Error("detail_page_invalid");
  }
};

const mapDetailPageRevisionRow = (
  row: typeof detailPageRevisions.$inferSelect
): DetailPageRevisionRecord => ({
  id: row.id,
  detailPageId: row.detailPageId,
  version: row.version,
  kind: (row.kind === "autosave" ? "autosave" : "publish") as DetailPageRevisionKind,
  document: normalizeDetailPageDocument(row.document),
  createdAt: row.createdAt,
  createdBy: row.createdBy ?? null,
});

const nextDetailPageRevisionVersion = async (
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  detailPageId: string
) => {
  const [{ value }] = await tx
    .select({ value: max(detailPageRevisions.version) })
    .from(detailPageRevisions)
    .where(eq(detailPageRevisions.detailPageId, detailPageId));

  return (value ?? 0) + 1;
};

const createDetailPageRevisionTx = async (
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  detailPageId: string,
  document: DetailPageDocument,
  userId: string,
  kind: DetailPageRevisionKind
) => {
  const nextVersion = await nextDetailPageRevisionVersion(tx, detailPageId);
  const [revision] = await tx
    .insert(detailPageRevisions)
    .values({
      detailPageId,
      version: nextVersion,
      kind,
      document,
      createdBy: userId,
    })
    .returning();

  if (!revision) {
    throw new Error("detail_page_invalid");
  }

  return mapDetailPageRevisionRow(revision);
};

const createOrReplaceDetailPageAutosaveRevisionTx = async (
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  detailPageId: string,
  document: DetailPageDocument,
  userId: string
): Promise<{
  revision: DetailPageRevisionRecord;
  reusedRevision: boolean;
}> => {
  const existingAutosaves = await tx
    .select()
    .from(detailPageRevisions)
    .where(
      and(
        eq(detailPageRevisions.detailPageId, detailPageId),
        eq(detailPageRevisions.kind, "autosave")
      )
    )
    .orderBy(desc(detailPageRevisions.version));

  const latest = existingAutosaves[0];
  if (latest) {
    if (areRevisionSnapshotsEqual(normalizeDetailPageDocument(latest.document), document)) {
      const staleAutosaveIds = existingAutosaves.slice(1).map((row) => row.id);
      if (staleAutosaveIds.length > 0) {
        await tx
          .delete(detailPageRevisions)
          .where(inArray(detailPageRevisions.id, staleAutosaveIds));
      }

      return {
        revision: mapDetailPageRevisionRow(latest),
        reusedRevision: true,
      };
    }
  }

  const created = await createDetailPageRevisionTx(tx, detailPageId, document, userId, "autosave");

  const staleAutosaveIds = existingAutosaves.map((row) => row.id);
  if (staleAutosaveIds.length > 0) {
    await tx.delete(detailPageRevisions).where(inArray(detailPageRevisions.id, staleAutosaveIds));
  }

  return {
    revision: created,
    reusedRevision: false,
  };
};

export async function getDetailPageDocument(id: string): Promise<DetailPageDocumentRecord | null> {
  const [row] = await db.select().from(detailPageDocuments).where(eq(detailPageDocuments.id, id));

  if (!row) return null;
  return mapDetailPageRow(row);
}

export async function listDetailPageDocuments(input?: {
  contentTypeId?: string | null;
}): Promise<DetailPageDocumentRecord[]> {
  const rows = input?.contentTypeId
    ? await db
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.contentTypeId, input.contentTypeId))
        .orderBy(desc(detailPageDocuments.updatedAt))
    : await db.select().from(detailPageDocuments).orderBy(desc(detailPageDocuments.updatedAt));

  return rows.map(mapDetailPageRow);
}

export async function prepareDetailPageDocumentUpsert(input: {
  document: DetailPageDocument;
  expectedExistingId?: string | null;
}): Promise<{
  contentType: ContentTypeRecord;
  existing: DetailPageDocumentRecord | null;
  document: DetailPageDocument;
}> {
  const normalized = normalizeDetailPageDocument(input.document);
  if (input.expectedExistingId && input.expectedExistingId !== normalized.id) {
    throw new Error("detail_page_conflict");
  }

  const contentType = await getContentType(normalized.contentTypeId);
  if (!contentType) {
    throw new Error("detail_page_invalid");
  }

  const refreshedDocument = normalizeDetailPageDocument({
    ...normalized,
    contentTypeSlug: contentType.slug,
  });
  const existing = await getDetailPageDocument(refreshedDocument.id);
  if (existing && existing.contentTypeId !== contentType.id) {
    throw new Error("detail_page_content_type_mismatch");
  }

  return {
    contentType,
    existing,
    document: refreshedDocument,
  };
}

export async function createDetailPageDocument(input: { document: unknown }): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> {
  const document = normalizeDocumentWithResolvedId(input.document, randomUUID());
  const prepared = await prepareDetailPageDocumentUpsert({
    document,
  });
  if (prepared.existing) {
    throw new Error("detail_page_conflict");
  }

  return upsertDetailPageDocument({
    document: prepared.document,
  });
}

export async function updateDetailPageDocument(
  id: string,
  input: {
    document: unknown;
  }
): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> {
  const document = normalizeDocumentWithResolvedId(input.document, id);
  if (document.id !== id) {
    throw new Error("detail_page_conflict");
  }

  const prepared = await prepareDetailPageDocumentUpsert({
    document,
  });
  if (!prepared.existing) {
    throw new Error("detail_page_not_found");
  }

  return upsertDetailPageDocument({
    document: prepared.document,
    expectedExistingId: id,
  });
}

export async function upsertDetailPageDocument(input: {
  document: DetailPageDocument;
  expectedExistingId?: string | null;
}): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> {
  const prepared = await prepareDetailPageDocumentUpsert(input);
  const now = new Date();
  const nextPublishedDocument = prepared.document.status === "published" ? prepared.document : null;
  const nextPublishedAt = prepared.document.status === "published" ? now : null;

  const [row] = prepared.existing
    ? await db
        .update(detailPageDocuments)
        .set({
          name: prepared.document.name,
          status: prepared.document.status,
          currentDocument: prepared.document,
          publishedDocument: nextPublishedDocument,
          publishedAt: nextPublishedAt,
          updatedAt: now,
        })
        .where(eq(detailPageDocuments.id, prepared.document.id))
        .returning()
    : await db
        .insert(detailPageDocuments)
        .values({
          id: prepared.document.id,
          name: prepared.document.name,
          contentTypeId: prepared.contentType.id,
          status: prepared.document.status,
          currentDocument: prepared.document,
          publishedDocument: nextPublishedDocument,
          createdAt: now,
          updatedAt: now,
          publishedAt: nextPublishedAt,
        })
        .returning();

  if (!row) {
    throw new Error("detail_page_invalid");
  }

  await invalidateLinkedDetailPageCaches(row.id, prepared.contentType.slug);

  return {
    record: mapDetailPageRow(row),
    contentType: prepared.contentType,
  };
}

export async function deleteDetailPageDocument(id: string) {
  const existing = await getDetailPageDocument(id);
  if (!existing) {
    throw new Error("detail_page_not_found");
  }

  const linkedRoute = await findLinkedRoute(id);
  if (linkedRoute) {
    throw new Error("detail_page_route_conflict");
  }

  const [row] = await db
    .delete(detailPageDocuments)
    .where(eq(detailPageDocuments.id, id))
    .returning();

  if (!row) {
    throw new Error("detail_page_not_found");
  }

  await invalidateLinkedDetailPageCaches(id, existing.currentDocument.contentTypeSlug);
  return mapDetailPageRow(row);
}

export async function publishDetailPageDocument(id: string, userId: string) {
  const existing = await getDetailPageDocument(id);
  if (!existing) {
    throw new Error("detail_page_not_found");
  }

  const contentType = await getContentType(existing.contentTypeId);
  if (!contentType) {
    throw new Error("detail_page_invalid");
  }

  const publishedDocument = normalizeDetailPageDocument({
    ...existing.currentDocument,
    contentTypeSlug: contentType.slug,
    status: "published",
  });

  const [row] = await db.transaction(async (tx) => {
    await createDetailPageRevisionTx(tx, id, publishedDocument, userId, "publish");
    const [updated] = await tx
      .update(detailPageDocuments)
      .set({
        name: publishedDocument.name,
        status: "published",
        currentDocument: publishedDocument,
        publishedDocument,
        updatedAt: new Date(),
        publishedAt: new Date(),
      })
      .where(eq(detailPageDocuments.id, id))
      .returning();

    return [updated];
  });

  if (!row) {
    throw new Error("detail_page_not_found");
  }

  await invalidateLinkedDetailPageCaches(id, contentType.slug);
  return mapDetailPageRow(row);
}

export async function unpublishDetailPageDocument(id: string) {
  const existing = await getDetailPageDocument(id);
  if (!existing) {
    throw new Error("detail_page_not_found");
  }

  const contentType = await getContentType(existing.contentTypeId);
  if (!contentType) {
    throw new Error("detail_page_invalid");
  }

  const draftDocument = normalizeDetailPageDocument({
    ...existing.currentDocument,
    contentTypeSlug: contentType.slug,
    status: "draft",
  });

  const [row] = await db
    .update(detailPageDocuments)
    .set({
      name: draftDocument.name,
      status: "draft",
      currentDocument: draftDocument,
      publishedDocument: null,
      updatedAt: new Date(),
      publishedAt: null,
    })
    .where(eq(detailPageDocuments.id, id))
    .returning();

  if (!row) {
    throw new Error("detail_page_not_found");
  }

  await invalidateLinkedDetailPageCaches(id, contentType.slug);
  return mapDetailPageRow(row);
}

export async function autosaveDetailPageDocument(
  id: string,
  input: {
    document: unknown;
  },
  userId: string
): Promise<DetailPageAutosaveResult> {
  const document = normalizeDocumentWithResolvedId(input.document, id);
  if (document.id !== id) {
    throw new Error("detail_page_conflict");
  }

  const prepared = await prepareDetailPageDocumentUpsert({
    document,
    expectedExistingId: id,
  });
  if (!prepared.existing) {
    throw new Error("detail_page_not_found");
  }

  const result = await db.transaction(async (tx) =>
    createOrReplaceDetailPageAutosaveRevisionTx(tx, id, prepared.document, userId)
  );

  return {
    ...result,
    savedAt: new Date().toISOString(),
  };
}
