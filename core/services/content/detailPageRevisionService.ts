import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { detailPageDocuments, detailPageRevisions } from "../../db/schema";
import { areRevisionSnapshotsEqual } from "./revisionSnapshot";
import { getContentType } from "./typeService";
import { normalizeDetailPageDocument } from "./detailPageSchema";
import type { DetailPageDocument, DetailPageRevisionKind } from "./detailPageTypes";

export type DetailPageRevisionRecord = {
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  document: DetailPageDocument;
  createdAt: Date;
  createdBy: string | null;
};

export type DetailPageRevisionRestoreResult = {
  restored: boolean;
  revision: DetailPageRevisionRecord;
  detailPage: typeof detailPageDocuments.$inferSelect;
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

const normalizeRestoredDocumentForLifecycle = (
  existing: typeof detailPageDocuments.$inferSelect,
  revisionDocument: DetailPageDocument
) =>
  normalizeDetailPageDocument({
    ...revisionDocument,
    status: existing.status === "published" ? "published" : "draft",
    contentTypeSlug: normalizeDetailPageDocument(existing.currentDocument).contentTypeSlug,
  });

export async function listDetailPageRevisions(
  detailPageId: string
): Promise<DetailPageRevisionRecord[]> {
  const rows = await db
    .select()
    .from(detailPageRevisions)
    .where(eq(detailPageRevisions.detailPageId, detailPageId))
    .orderBy(desc(detailPageRevisions.version));

  return rows.map(mapDetailPageRevisionRow);
}

export async function discardDetailPageAutosaveRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRecord> {
  const [revision] = await db
    .select()
    .from(detailPageRevisions)
    .where(
      and(
        eq(detailPageRevisions.detailPageId, detailPageId),
        eq(detailPageRevisions.id, revisionId)
      )
    );

  if (!revision) {
    throw new Error("detail_page_revision_not_found");
  }
  if ((revision.kind ?? "publish") !== "autosave") {
    throw new Error("detail_page_revision_delete_forbidden");
  }

  await db.delete(detailPageRevisions).where(eq(detailPageRevisions.id, revisionId));
  return mapDetailPageRevisionRow(revision);
}

export async function restoreDetailPageRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRestoreResult> {
  const [detailPage] = await db
    .select()
    .from(detailPageDocuments)
    .where(eq(detailPageDocuments.id, detailPageId));
  if (!detailPage) {
    throw new Error("detail_page_not_found");
  }

  const [revision] = await db
    .select()
    .from(detailPageRevisions)
    .where(
      and(
        eq(detailPageRevisions.detailPageId, detailPageId),
        eq(detailPageRevisions.id, revisionId)
      )
    );
  if (!revision) {
    throw new Error("detail_page_revision_not_found");
  }

  const currentDocument = normalizeDetailPageDocument(detailPage.currentDocument);
  const restoredDocument = normalizeRestoredDocumentForLifecycle(
    detailPage,
    normalizeDetailPageDocument(revision.document)
  );
  const restored = !areRevisionSnapshotsEqual(currentDocument, restoredDocument);

  const contentType = await getContentType(detailPage.contentTypeId);
  if (!contentType) {
    throw new Error("detail_page_invalid");
  }

  const [updated] = await db
    .update(detailPageDocuments)
    .set({
      name: restoredDocument.name,
      currentDocument: {
        ...restoredDocument,
        contentTypeSlug: contentType.slug,
      },
      updatedAt: new Date(),
    })
    .where(eq(detailPageDocuments.id, detailPageId))
    .returning();

  if (!updated) {
    throw new Error("detail_page_not_found");
  }

  return {
    restored,
    revision: mapDetailPageRevisionRow(revision),
    detailPage: updated,
  };
}
