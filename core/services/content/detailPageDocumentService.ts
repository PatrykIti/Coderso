import { and, desc, eq, inArray, max } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  detailPageRevisions,
  previewTokens,
  settings,
} from "../../db/schema";
import { invalidateContentRouteCache } from "../../site/cache/siteCache";
import { areRevisionSnapshotsEqual } from "./revisionSnapshot";
import { getSetting } from "../settings/settingsService";
import type { ContentRouteSetting } from "../settings/settingsContracts";
import { getContentType, type ContentTypeRecord } from "./typeService";
import { normalizeDetailPageDocument } from "./detailPageSchema";
import type { DetailPageDocument, DetailPageRevisionKind } from "./detailPageTypes";
import { hashPreviewToken } from "../pages/previewService";

export {
  DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT,
  captureDetailPageDocumentLifecycleNativeSnapshot,
  mutateDetailPageDocumentLifecycleAtomic,
  normalizeDetailPageDocumentLifecycleNativeDesired,
  prepareDetailPageDocumentLifecycleNativeTargets,
  type DetailPageDocumentLifecycleAtomicMutation,
  type DetailPageDocumentLifecycleAtomicMutationResult,
  type DetailPageDocumentLifecycleNativeDesired,
  type DetailPageDocumentLifecycleNativeSnapshot,
  type DetailPageLifecycleRevisionSnapshot,
} from "./detailPageDocumentLifecycleMutation";

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

export type DetailPagePreviewResult = {
  token: string;
  expiresAt: Date;
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
  if (row.status === "published" && !publishedDocument) {
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

const ensureDraftCrudDocument = (document: DetailPageDocument) => {
  if (document.status !== "draft") {
    throw new Error("detail_page_status_requires_lifecycle");
  }
  return document;
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
  return persistDetailPageDocument({ document, mode: "create", lifecycle: "full" });
}

export async function createDetailPageDraftDocument(input: { document: unknown }): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> {
  const document = ensureDraftCrudDocument(
    normalizeDocumentWithResolvedId(input.document, randomUUID())
  );
  return persistDetailPageDocument({ document, mode: "create", lifecycle: "draft" });
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

  return persistDetailPageDocument({ document, mode: "update", lifecycle: "full" });
}

export async function updateDetailPageDraftDocument(
  id: string,
  input: {
    document: unknown;
  }
): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> {
  const document = ensureDraftCrudDocument(normalizeDocumentWithResolvedId(input.document, id));
  if (document.id !== id) {
    throw new Error("detail_page_conflict");
  }

  return persistDetailPageDocument({ document, mode: "update", lifecycle: "draft" });
}

type DetailPageWriteMode = "create" | "update" | "upsert";
type DetailPageLifecycleWriteMode = "full" | "draft";

const persistDetailPageDocument = async (input: {
  document: DetailPageDocument;
  mode: DetailPageWriteMode;
  lifecycle: DetailPageLifecycleWriteMode;
  expectedExistingId?: string | null;
}): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> => {
  const normalized = normalizeDetailPageDocument(input.document);
  if (input.expectedExistingId && input.expectedExistingId !== normalized.id) {
    throw new Error("detail_page_conflict");
  }
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [contentType] = await tx
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, normalized.contentTypeId))
        .for("key share");
      if (!contentType) throw new Error("detail_page_invalid");
      const document = normalizeDetailPageDocument({
        ...normalized,
        contentTypeSlug: contentType.slug,
      });
      const [existingRow] = await tx
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, document.id))
        .for("update");
      if (existingRow && existingRow.contentTypeId !== contentType.id) {
        throw new Error("detail_page_content_type_mismatch");
      }
      if (input.mode === "create" && existingRow) throw new Error("detail_page_conflict");
      if (input.mode === "update" && !existingRow) throw new Error("detail_page_not_found");
      if (input.expectedExistingId && !existingRow) throw new Error("detail_page_not_found");

      const existing = existingRow ? mapDetailPageRow(existingRow) : null;
      const now = new Date();
      const keepPublished =
        input.lifecycle === "draft" &&
        existing?.status === "published" &&
        existing.publishedDocument !== null;
      const status = keepPublished ? "published" : document.status;
      const publishedDocument = keepPublished
        ? existing!.publishedDocument
        : input.lifecycle === "full" && document.status === "published"
          ? document
          : null;
      const publishedAt = keepPublished ? existing!.publishedAt : publishedDocument ? now : null;
      const values = {
        name: document.name,
        status,
        currentDocument: document,
        publishedDocument,
        publishedAt,
        updatedAt: now,
      };
      const [row] = existingRow
        ? await tx
            .update(detailPageDocuments)
            .set(values)
            .where(eq(detailPageDocuments.id, document.id))
            .returning()
        : await tx
            .insert(detailPageDocuments)
            .values({
              id: document.id,
              contentTypeId: contentType.id,
              ...values,
              createdAt: now,
            })
            .returning();
      if (!row) throw new Error("detail_page_invalid");
      return {
        record: mapDetailPageRow(row),
        contentType: contentType as ContentTypeRecord,
      };
    },
    { isolationLevel: "read committed" }
  );
  await invalidateLinkedDetailPageCaches(result.record.id, result.contentType.slug);
  return result;
};

export async function upsertDetailPageDocument(input: {
  document: DetailPageDocument;
  expectedExistingId?: string | null;
}): Promise<{
  record: DetailPageDocumentRecord;
  contentType: ContentTypeRecord;
}> {
  return persistDetailPageDocument({
    document: input.document,
    mode: "upsert",
    lifecycle: "full",
    expectedExistingId: input.expectedExistingId,
  });
}

export async function deleteDetailPageDocument(id: string) {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, id))
        .for("update");
      if (!existing) throw new Error("detail_page_not_found");
      const [routeSetting] = await tx
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, "site.contentRoutes"))
        .for("update");
      if (
        Array.isArray(routeSetting?.value) &&
        routeSetting.value.some((route) => isRecord(route) && (route.detailPageId ?? null) === id)
      ) {
        throw new Error("detail_page_route_conflict");
      }
      const [deleted] = await tx
        .delete(detailPageDocuments)
        .where(eq(detailPageDocuments.id, id))
        .returning();
      if (!deleted) throw new Error("detail_page_not_found");
      return {
        row: deleted,
        contentTypeSlug: normalizeDetailPageDocument(existing.currentDocument).contentTypeSlug,
      };
    },
    { isolationLevel: "read committed" }
  );
  await invalidateLinkedDetailPageCaches(id, result.contentTypeSlug);
  return mapDetailPageRow(result.row);
}

export async function issueDetailPagePreview(input: {
  detailPageId: string;
  sampleEntryId: string;
  ttlMinutes?: number;
}): Promise<DetailPagePreviewResult> {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [detailPage] = await tx
        .select({ id: detailPageDocuments.id, contentTypeId: detailPageDocuments.contentTypeId })
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, input.detailPageId))
        .for("key share");
      if (!detailPage) throw new Error("detail_page_not_found");
      const [entry] = await tx
        .select({
          id: contentEntries.id,
          typeId: contentEntries.typeId,
          status: contentEntries.status,
        })
        .from(contentEntries)
        .where(eq(contentEntries.id, input.sampleEntryId))
        .for("key share");
      if (!entry || entry.status !== "published") throw new Error("detail_page_invalid");
      if (entry.typeId !== detailPage.contentTypeId) {
        throw new Error("detail_page_content_type_mismatch");
      }
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 60) * 60_000);
      await tx.insert(previewTokens).values({
        targetType: "detail-page",
        targetId: detailPage.id,
        tokenHash: hashPreviewToken(token),
        context: { kind: "detail-page", sampleEntryId: entry.id },
        expiresAt,
      });
      return { token, expiresAt };
    },
    { isolationLevel: "read committed" }
  );
}

export async function publishDetailPageDocument(id: string, userId: string) {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, id))
        .for("update");
      if (!existing) throw new Error("detail_page_not_found");
      const [contentType] = await tx
        .select({ slug: contentTypes.slug })
        .from(contentTypes)
        .where(eq(contentTypes.id, existing.contentTypeId))
        .for("key share");
      if (!contentType) throw new Error("detail_page_invalid");
      const publishedDocument = normalizeDetailPageDocument({
        ...normalizeDetailPageDocument(existing.currentDocument),
        contentTypeSlug: contentType.slug,
        status: "published",
      });
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
      if (!updated) throw new Error("detail_page_not_found");
      return { row: updated, contentTypeSlug: contentType.slug };
    },
    { isolationLevel: "read committed" }
  );
  await invalidateLinkedDetailPageCaches(id, result.contentTypeSlug);
  return mapDetailPageRow(result.row);
}

export async function unpublishDetailPageDocument(id: string) {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, id))
        .for("update");
      if (!existing) throw new Error("detail_page_not_found");
      const [contentType] = await tx
        .select({ slug: contentTypes.slug })
        .from(contentTypes)
        .where(eq(contentTypes.id, existing.contentTypeId))
        .for("key share");
      if (!contentType) throw new Error("detail_page_invalid");
      const draftDocument = normalizeDetailPageDocument({
        ...normalizeDetailPageDocument(existing.currentDocument),
        contentTypeSlug: contentType.slug,
        status: "draft",
      });
      const [updated] = await tx
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
      if (!updated) throw new Error("detail_page_not_found");
      return { row: updated, contentTypeSlug: contentType.slug };
    },
    { isolationLevel: "read committed" }
  );
  await invalidateLinkedDetailPageCaches(id, result.contentTypeSlug);
  return mapDetailPageRow(result.row);
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

  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [contentType] = await tx
        .select({ id: contentTypes.id, slug: contentTypes.slug })
        .from(contentTypes)
        .where(eq(contentTypes.id, document.contentTypeId))
        .for("key share");
      if (!contentType) throw new Error("detail_page_invalid");
      const [existing] = await tx
        .select({ id: detailPageDocuments.id, contentTypeId: detailPageDocuments.contentTypeId })
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, id))
        .for("update");
      if (!existing) throw new Error("detail_page_not_found");
      if (existing.contentTypeId !== contentType.id) {
        throw new Error("detail_page_content_type_mismatch");
      }
      const refreshed = normalizeDetailPageDocument({
        ...document,
        contentTypeSlug: contentType.slug,
      });
      return createOrReplaceDetailPageAutosaveRevisionTx(tx, id, refreshed, userId);
    },
    { isolationLevel: "read committed" }
  );

  return {
    ...result,
    savedAt: new Date().toISOString(),
  };
}
