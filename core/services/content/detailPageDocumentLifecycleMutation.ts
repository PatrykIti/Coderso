import { asc, desc, eq } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentTypes, detailPageDocuments, detailPageRevisions, settings } from "../../db/schema";
import { clearSiteCache } from "../../site/cache/siteCache";
import { normalizeDetailPageDocument } from "./detailPageSchema";
import type { DetailPageDocument, DetailPageRevisionKind } from "./detailPageTypes";

export const DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT = 100;

export type DetailPageLifecycleRevisionSnapshot = Readonly<{
  id: string;
  version: number;
  kind: DetailPageRevisionKind;
  document: DetailPageDocument;
  createdAt: string;
  createdBy: string | null;
}>;

export type DetailPageDocumentLifecycleNativeDesired = Readonly<{
  name: string;
  contentTypeId: string;
  status: "draft" | "published";
  currentDocument: DetailPageDocument;
  publishedDocument: DetailPageDocument | null;
  publishedAt: string | null;
  revisions: readonly DetailPageLifecycleRevisionSnapshot[];
}>;

export type DetailPageDocumentLifecycleNativeSnapshot = Readonly<{
  id: string;
  desired: DetailPageDocumentLifecycleNativeDesired;
}>;

export type DetailPageDocumentLifecycleAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: DetailPageDocumentLifecycleNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: DetailPageDocumentLifecycleNativeDesired;
      expectedCurrent: DetailPageDocumentLifecycleNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: DetailPageDocumentLifecycleNativeSnapshot;
      actorId: string;
    }>;

export type DetailPageDocumentLifecycleAtomicMutationResult = Readonly<{
  id: string;
  snapshot: DetailPageDocumentLifecycleNativeSnapshot | null;
}>;

type DetailPageLifecycleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const isDirectPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertExactKeys = (value: Record<string, unknown>, keys: readonly string[]): void => {
  const ownKeys = Object.keys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => !keys.includes(key))) {
    throw new Error("detail_page_invalid");
  }
};

const normalizeTimestamp = (value: unknown): string => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("detail_page_invalid");
  }
  return new Date(value).toISOString();
};

const normalizeJsonSafeDetailPageDocument = (value: unknown): DetailPageDocument =>
  JSON.parse(JSON.stringify(normalizeDetailPageDocument(value))) as DetailPageDocument;

const normalizeRevision = (value: unknown): DetailPageLifecycleRevisionSnapshot => {
  if (!isDirectPlainObject(value)) throw new Error("detail_page_invalid");
  assertExactKeys(value, ["id", "version", "kind", "document", "createdAt", "createdBy"]);
  if (
    typeof value.id !== "string" ||
    !value.id ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    (value.kind !== "publish" && value.kind !== "autosave") ||
    (value.createdBy !== null && typeof value.createdBy !== "string")
  ) {
    throw new Error("detail_page_invalid");
  }
  return {
    id: value.id,
    version: value.version as number,
    kind: value.kind,
    document: normalizeJsonSafeDetailPageDocument(value.document),
    createdAt: normalizeTimestamp(value.createdAt),
    createdBy: value.createdBy as string | null,
  };
};

export const normalizeDetailPageDocumentLifecycleNativeDesired = (
  value: unknown
): DetailPageDocumentLifecycleNativeDesired => {
  if (!isDirectPlainObject(value)) throw new Error("detail_page_invalid");
  assertExactKeys(value, [
    "name",
    "contentTypeId",
    "status",
    "currentDocument",
    "publishedDocument",
    "publishedAt",
    "revisions",
  ]);
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.contentTypeId !== "string" ||
    !value.contentTypeId ||
    (value.status !== "draft" && value.status !== "published") ||
    !Array.isArray(value.revisions)
  ) {
    throw new Error("detail_page_invalid");
  }
  const currentDocument = normalizeJsonSafeDetailPageDocument(value.currentDocument);
  const publishedDocument =
    value.publishedDocument === null
      ? null
      : normalizeJsonSafeDetailPageDocument(value.publishedDocument);
  if (
    currentDocument.id === "" ||
    currentDocument.contentTypeId !== value.contentTypeId ||
    currentDocument.status !== value.status ||
    (value.status === "draft" && (publishedDocument !== null || value.publishedAt !== null)) ||
    (value.status === "published" &&
      (publishedDocument === null ||
        publishedDocument.status !== "published" ||
        publishedDocument.id !== currentDocument.id ||
        value.publishedAt === null))
  ) {
    throw new Error("detail_page_invalid");
  }
  const revisions = value.revisions
    .map(normalizeRevision)
    .sort((left, right) => right.version - left.version || left.id.localeCompare(right.id));
  if (
    revisions.length > DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT ||
    new Set(revisions.map((revision) => revision.id)).size !== revisions.length ||
    new Set(revisions.map((revision) => revision.version)).size !== revisions.length
  ) {
    throw new Error("detail_page_revision_snapshot_too_large");
  }
  return {
    name: value.name.trim(),
    contentTypeId: value.contentTypeId,
    status: value.status,
    currentDocument,
    publishedDocument,
    publishedAt: value.publishedAt === null ? null : normalizeTimestamp(value.publishedAt),
    revisions: Object.freeze(revisions),
  };
};

export const prepareDetailPageDocumentLifecycleNativeTargets = (
  input: Readonly<{
    id: string;
    desired: Record<string, unknown>;
    actorId: string;
    expectedCurrent: DetailPageDocumentLifecycleNativeSnapshot | null;
    revisionId: string;
    publicationTimestamp: string;
  }>
): Readonly<{
  staged: DetailPageDocumentLifecycleNativeSnapshot | null;
  complete: DetailPageDocumentLifecycleNativeSnapshot;
}> => {
  const draftDocument = normalizeDetailPageDocument(input.desired, {
    id: input.id,
    status: "draft",
  });
  const stagedDesired = normalizeDetailPageDocumentLifecycleNativeDesired({
    name: draftDocument.name,
    contentTypeId: draftDocument.contentTypeId,
    status: "draft",
    currentDocument: draftDocument,
    publishedDocument: null,
    publishedAt: null,
    revisions: input.expectedCurrent?.desired.revisions ?? [],
  });
  if (input.desired.status === "draft") {
    return { staged: null, complete: { id: input.id, desired: stagedDesired } };
  }
  const publishedDocument = normalizeDetailPageDocument(input.desired, {
    id: input.id,
    status: "published",
  });
  const nextVersion = Math.max(0, ...stagedDesired.revisions.map((row) => row.version)) + 1;
  const completeDesired = normalizeDetailPageDocumentLifecycleNativeDesired({
    name: publishedDocument.name,
    contentTypeId: publishedDocument.contentTypeId,
    status: "published",
    currentDocument: publishedDocument,
    publishedDocument,
    publishedAt: input.publicationTimestamp,
    revisions: [
      {
        id: input.revisionId,
        version: nextVersion,
        kind: "publish",
        document: publishedDocument,
        createdAt: input.publicationTimestamp,
        createdBy: input.actorId,
      },
      ...stagedDesired.revisions,
    ],
  });
  return {
    staged: { id: input.id, desired: stagedDesired },
    complete: { id: input.id, desired: completeDesired },
  };
};

const rowsToSnapshot = (
  row: typeof detailPageDocuments.$inferSelect,
  revisions: readonly (typeof detailPageRevisions.$inferSelect)[]
): DetailPageDocumentLifecycleNativeSnapshot => ({
  id: row.id,
  desired: normalizeDetailPageDocumentLifecycleNativeDesired({
    name: row.name,
    contentTypeId: row.contentTypeId,
    status: row.status,
    currentDocument: row.currentDocument,
    publishedDocument: row.publishedDocument,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    revisions: revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      kind: revision.kind,
      document: revision.document,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
    })),
  }),
});

const readDetailPageTx = async (
  tx: DetailPageLifecycleTransaction,
  id: string,
  lock: boolean
): Promise<DetailPageDocumentLifecycleNativeSnapshot | null> => {
  const rootSelect = tx.select().from(detailPageDocuments).where(eq(detailPageDocuments.id, id));
  const [row] = lock ? await rootSelect.for("update") : await rootSelect;
  if (!row) return null;
  const revisionSelect = tx
    .select()
    .from(detailPageRevisions)
    .where(eq(detailPageRevisions.detailPageId, id))
    .orderBy(desc(detailPageRevisions.version), asc(detailPageRevisions.id))
    .limit(DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT + 1);
  const revisions = lock ? await revisionSelect.for("update") : await revisionSelect;
  if (revisions.length > DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT) {
    throw new Error("detail_page_revision_snapshot_too_large");
  }
  return rowsToSnapshot(row, revisions);
};

const lockContentTypeTx = async (tx: DetailPageLifecycleTransaction, id: string): Promise<void> => {
  const [row] = await tx
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(eq(contentTypes.id, id))
    .for("key share");
  if (!row) throw new Error("detail_page_invalid");
};

const writeRevisionsTx = async (
  tx: DetailPageLifecycleTransaction,
  detailPageId: string,
  revisions: readonly DetailPageLifecycleRevisionSnapshot[]
): Promise<void> => {
  await tx.delete(detailPageRevisions).where(eq(detailPageRevisions.detailPageId, detailPageId));
  if (revisions.length === 0) return;
  await tx.insert(detailPageRevisions).values(
    revisions.map((revision) => ({
      id: revision.id,
      detailPageId,
      version: revision.version,
      kind: revision.kind,
      document: revision.document,
      createdAt: new Date(revision.createdAt),
      createdBy: revision.createdBy,
    }))
  );
};

const assertNoContentRouteTx = async (
  tx: DetailPageLifecycleTransaction,
  detailPageId: string
): Promise<void> => {
  const [row] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "site.contentRoutes"))
    .for("update");
  if (
    Array.isArray(row?.value) &&
    row.value.some(
      (route) =>
        isDirectPlainObject(route) &&
        Object.prototype.hasOwnProperty.call(route, "detailPageId") &&
        route.detailPageId === detailPageId
    )
  ) {
    throw new Error("site_package_state_changed");
  }
};

export const captureDetailPageDocumentLifecycleNativeSnapshot = async (
  id: string
): Promise<DetailPageDocumentLifecycleNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    return readDetailPageTx(tx, id, false);
  });

export const mutateDetailPageDocumentLifecycleAtomic = async (
  input: DetailPageDocumentLifecycleAtomicMutation
): Promise<DetailPageDocumentLifecycleAtomicMutationResult> => {
  let invalidate = false;
  const result = await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    if (input.operation === "create") {
      const desired = normalizeDetailPageDocumentLifecycleNativeDesired(input.desired);
      await lockContentTypeTx(tx, desired.contentTypeId);
      await tx.insert(detailPageDocuments).values({
        id: input.id,
        name: desired.name,
        contentTypeId: desired.contentTypeId,
        status: desired.status,
        currentDocument: desired.currentDocument,
        publishedDocument: desired.publishedDocument,
        publishedAt: desired.publishedAt ? new Date(desired.publishedAt) : null,
      });
      await writeRevisionsTx(tx, input.id, desired.revisions);
      const snapshot = await readDetailPageTx(tx, input.id, false);
      if (!snapshot) throw new Error("detail_page_invalid");
      return { id: input.id, snapshot };
    }
    const current = await readDetailPageTx(tx, input.id, true);
    if (
      !current ||
      input.expectedCurrent.id !== input.id ||
      !isDeepStrictEqual(current, input.expectedCurrent)
    ) {
      throw new Error("site_package_state_changed");
    }
    invalidate = true;
    if (input.operation === "delete") {
      await assertNoContentRouteTx(tx, input.id);
      const [deleted] = await tx
        .delete(detailPageDocuments)
        .where(eq(detailPageDocuments.id, input.id))
        .returning({ id: detailPageDocuments.id });
      if (!deleted) throw new Error("site_package_state_changed");
      return { id: input.id, snapshot: null };
    }
    const desired = normalizeDetailPageDocumentLifecycleNativeDesired(input.desired);
    await lockContentTypeTx(tx, desired.contentTypeId);
    const [updated] = await tx
      .update(detailPageDocuments)
      .set({
        name: desired.name,
        contentTypeId: desired.contentTypeId,
        status: desired.status,
        currentDocument: desired.currentDocument,
        publishedDocument: desired.publishedDocument,
        publishedAt: desired.publishedAt ? new Date(desired.publishedAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(detailPageDocuments.id, input.id))
      .returning({ id: detailPageDocuments.id });
    if (!updated) throw new Error("site_package_state_changed");
    await writeRevisionsTx(tx, input.id, desired.revisions);
    const snapshot = await readDetailPageTx(tx, input.id, false);
    if (!snapshot) throw new Error("site_package_state_changed");
    return { id: input.id, snapshot };
  });
  if (invalidate) clearSiteCache();
  return result;
};
