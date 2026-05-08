import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../../db/client";
import { detailPageDocuments } from "../../db/schema";
import { invalidateContentRouteCache } from "../../site/cache/siteCache";
import { getSetting, type ContentRouteSetting } from "../settings/settingsService";
import { getContentType, type ContentTypeRecord } from "./typeService";
import { normalizeDetailPageDocument } from "./detailPageSchema";
import type { DetailPageDocument } from "./detailPageTypes";

export type DetailPageDocumentRecord = Omit<
  typeof detailPageDocuments.$inferSelect,
  "currentDocument" | "publishedDocument"
> & {
  currentDocument: DetailPageDocument;
  publishedDocument: DetailPageDocument | null;
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
