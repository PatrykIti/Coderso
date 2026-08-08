import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentTypes, detailPageDocuments, detailPageRevisions } from "../../db/schema";
import { clearSiteCache } from "../../site/cache/siteCache";
import { areRevisionSnapshotsEqual } from "./revisionSnapshot";
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

export type DetailPageRevisionSummaryRecord = {
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  createdAt: Date;
  createdBy: string | null;
};

export const summarizeDetailPageRevisionRecord = (
  record: DetailPageRevisionSummaryRecord | DetailPageRevisionRecord
): DetailPageRevisionSummaryRecord => ({
  id: record.id,
  detailPageId: record.detailPageId,
  version: record.version,
  kind: record.kind,
  createdAt: record.createdAt,
  createdBy: record.createdBy,
});

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

const mapDetailPageRevisionSummaryRow = (
  row: Pick<
    typeof detailPageRevisions.$inferSelect,
    "id" | "detailPageId" | "version" | "kind" | "createdAt" | "createdBy"
  >
): DetailPageRevisionSummaryRecord => ({
  id: row.id,
  detailPageId: row.detailPageId,
  version: row.version,
  kind: (row.kind === "autosave" ? "autosave" : "publish") as DetailPageRevisionKind,
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
): Promise<DetailPageRevisionSummaryRecord[]> {
  const rows = await db
    .select({
      id: detailPageRevisions.id,
      detailPageId: detailPageRevisions.detailPageId,
      version: detailPageRevisions.version,
      kind: detailPageRevisions.kind,
      createdAt: detailPageRevisions.createdAt,
      createdBy: detailPageRevisions.createdBy,
    })
    .from(detailPageRevisions)
    .where(eq(detailPageRevisions.detailPageId, detailPageId))
    .orderBy(desc(detailPageRevisions.version));

  return rows.map(mapDetailPageRevisionSummaryRow);
}

export async function discardDetailPageAutosaveRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRecord> {
  const revision = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [detailPage] = await tx
        .select({ id: detailPageDocuments.id })
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, detailPageId))
        .for("key share");
      if (!detailPage) throw new Error("detail_page_not_found");
      const [current] = await tx
        .select()
        .from(detailPageRevisions)
        .where(
          and(
            eq(detailPageRevisions.detailPageId, detailPageId),
            eq(detailPageRevisions.id, revisionId)
          )
        )
        .for("update");
      if (!current) throw new Error("detail_page_revision_not_found");
      if ((current.kind ?? "publish") !== "autosave") {
        throw new Error("detail_page_revision_delete_forbidden");
      }
      await tx.delete(detailPageRevisions).where(eq(detailPageRevisions.id, revisionId));
      return current;
    },
    { isolationLevel: "read committed" }
  );
  return mapDetailPageRevisionRow(revision);
}

export async function restoreDetailPageRevision(
  detailPageId: string,
  revisionId: string
): Promise<DetailPageRevisionRestoreResult> {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [detailPage] = await tx
        .select()
        .from(detailPageDocuments)
        .where(eq(detailPageDocuments.id, detailPageId))
        .for("update");
      if (!detailPage) throw new Error("detail_page_not_found");
      const [revision] = await tx
        .select()
        .from(detailPageRevisions)
        .where(
          and(
            eq(detailPageRevisions.detailPageId, detailPageId),
            eq(detailPageRevisions.id, revisionId)
          )
        )
        .for("update");
      if (!revision) throw new Error("detail_page_revision_not_found");
      const [contentType] = await tx
        .select({ slug: contentTypes.slug })
        .from(contentTypes)
        .where(eq(contentTypes.id, detailPage.contentTypeId))
        .for("key share");
      if (!contentType) throw new Error("detail_page_invalid");
      const currentDocument = normalizeDetailPageDocument(detailPage.currentDocument);
      const restoredDocument = normalizeRestoredDocumentForLifecycle(
        detailPage,
        normalizeDetailPageDocument(revision.document)
      );
      const restored = !areRevisionSnapshotsEqual(currentDocument, restoredDocument);
      if (!restored) {
        return {
          restored: false,
          revision: mapDetailPageRevisionRow(revision),
          detailPage,
        };
      }
      const [updated] = await tx
        .update(detailPageDocuments)
        .set({
          name: restoredDocument.name,
          currentDocument: { ...restoredDocument, contentTypeSlug: contentType.slug },
          updatedAt: new Date(),
        })
        .where(eq(detailPageDocuments.id, detailPageId))
        .returning();
      if (!updated) throw new Error("detail_page_not_found");
      return {
        restored: true,
        revision: mapDetailPageRevisionRow(revision),
        detailPage: updated,
      };
    },
    { isolationLevel: "read committed" }
  );
  if (result.restored) clearSiteCache();
  return result;
}
