import { and, desc, eq, inArray, max } from "drizzle-orm";

import { db } from "../../db/client";
import { pageRevisions, pages, users } from "../../db/schema";
import { areRevisionSnapshotsEqual } from "../content/revisionSnapshot";
import { resolveEmailValue } from "../security/piiEmail";
import { normalizeStoredPageDocumentV2ForRead } from "./pageDocumentV2";

export type RevisionData = Record<string, unknown>;
export type PageRevisionKind = "publish" | "autosave";

export type PageRevisionSnapshot = {
  title: string | null;
  slug: string | null;
  data: RevisionData;
};

export type PageRevisionAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageRevisionRecord = {
  id: string;
  pageId: string;
  version: number;
  kind: PageRevisionKind;
  title: string | null;
  slug: string | null;
  data: RevisionData;
  createdAt: Date;
  createdBy: PageRevisionAuthor | null;
};

export type PageRevisionRestoreResult = {
  restored: boolean;
  revision: PageRevisionRecord;
  page: typeof pages.$inferSelect;
};

export type PageAutosaveRevisionResult = {
  revision: PageRevisionRecord;
  reusedRevision: boolean;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRevisionKind = (value: unknown): PageRevisionKind =>
  value === "autosave" ? "autosave" : "publish";

const normalizeRevisionData = (value: unknown): RevisionData =>
  normalizeStoredPageDocumentV2ForRead(value) as unknown as RevisionData;

export function normalizePageRevisionSnapshot(value: unknown): PageRevisionSnapshot {
  if (isRecord(value) && isRecord(value.data)) {
    return {
      title: normalizeText(value.title),
      slug: normalizeText(value.slug),
      data: normalizeRevisionData(value.data),
    };
  }

  return {
    title: null,
    slug: null,
    data: normalizeRevisionData(value),
  };
}

const mapRevisionRow = (
  row:
    | {
        id: string;
        pageId: string;
        version: number;
        kind: string;
        data: unknown;
        createdAt: Date;
        createdBy: string | null;
        authorName: string | null;
        authorEmail: string | null;
        authorEmailEncrypted: unknown;
      }
    | typeof pageRevisions.$inferSelect
): PageRevisionRecord => {
  const snapshot = normalizePageRevisionSnapshot(row.data);
  const record = row as {
    id: string;
    pageId: string;
    version: number;
    kind?: string;
    createdAt: Date;
    createdBy?: string | null;
    authorName?: string | null;
    authorEmail?: string | null;
    authorEmailEncrypted?: unknown;
  };

  return {
    id: record.id,
    pageId: record.pageId,
    version: record.version,
    kind: normalizeRevisionKind(record.kind),
    title: snapshot.title,
    slug: snapshot.slug,
    data: snapshot.data,
    createdAt: record.createdAt,
    createdBy:
      record.createdBy && (record.authorEmail || record.authorEmailEncrypted)
        ? {
            id: record.createdBy,
            name: record.authorName ?? null,
            email:
              resolveEmailValue({
                email: record.authorEmail ?? null,
                emailEncrypted: record.authorEmailEncrypted ?? null,
              }) ?? "",
          }
        : null,
  };
};

const nextRevisionVersion = async (tx: DbClient, pageId: string) => {
  const [{ value }] = await tx
    .select({ value: max(pageRevisions.version) })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId));

  return (value ?? 0) + 1;
};

export async function listRevisions(pageId: string): Promise<PageRevisionRecord[]> {
  const rows = await db
    .select({
      id: pageRevisions.id,
      pageId: pageRevisions.pageId,
      version: pageRevisions.version,
      kind: pageRevisions.kind,
      data: pageRevisions.data,
      createdAt: pageRevisions.createdAt,
      createdBy: pageRevisions.createdBy,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(pageRevisions)
    .leftJoin(users, eq(pageRevisions.createdBy, users.id))
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.version));

  return rows.map(mapRevisionRow);
}

export async function createRevision(
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string,
  kind: PageRevisionKind = "publish"
) {
  return createRevisionTx(db, pageId, snapshot, userId, kind);
}

export async function createRevisionTx(
  tx: DbClient,
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string,
  kind: PageRevisionKind = "publish"
) {
  const nextVersion = await nextRevisionVersion(tx, pageId);
  const normalizedSnapshot = normalizePageRevisionSnapshot(snapshot);

  const [revision] = await tx
    .insert(pageRevisions)
    .values({
      pageId,
      version: nextVersion,
      kind,
      data: normalizedSnapshot,
      createdBy: userId,
    })
    .returning();

  if (!revision) return null;
  return mapRevisionRow({
    ...revision,
    kind: revision.kind ?? kind,
    authorName: null,
    authorEmail: null,
    authorEmailEncrypted: null,
  });
}

export async function createOrReplaceAutosaveRevision(
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string
) {
  return createOrReplaceAutosaveRevisionTx(db, pageId, snapshot, userId);
}

export async function createOrReplaceAutosaveRevisionTx(
  tx: DbClient,
  pageId: string,
  snapshot: PageRevisionSnapshot | RevisionData,
  userId: string
): Promise<PageAutosaveRevisionResult> {
  const normalizedSnapshot = normalizePageRevisionSnapshot(snapshot);
  const existingAutosaves = await tx
    .select()
    .from(pageRevisions)
    .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.kind, "autosave")))
    .orderBy(desc(pageRevisions.version));

  const latest = existingAutosaves[0];
  if (latest) {
    const latestSnapshot = normalizePageRevisionSnapshot(latest.data);
    if (areRevisionSnapshotsEqual(latestSnapshot, normalizedSnapshot)) {
      const staleAutosaveIds = existingAutosaves.slice(1).map((row) => row.id);
      if (staleAutosaveIds.length > 0) {
        await tx.delete(pageRevisions).where(inArray(pageRevisions.id, staleAutosaveIds));
      }

      return {
        revision: mapRevisionRow({
          ...latest,
          authorName: null,
          authorEmail: null,
          authorEmailEncrypted: null,
        }),
        reusedRevision: true,
      };
    }
  }

  const nextVersion = await nextRevisionVersion(tx, pageId);
  const [created] = await tx
    .insert(pageRevisions)
    .values({
      pageId,
      version: nextVersion,
      kind: "autosave",
      data: normalizedSnapshot,
      createdBy: userId,
    })
    .returning();

  if (!created) {
    throw new Error("page_revision_autosave_failed");
  }

  const staleAutosaveIds = existingAutosaves.map((row) => row.id);
  if (staleAutosaveIds.length > 0) {
    await tx.delete(pageRevisions).where(inArray(pageRevisions.id, staleAutosaveIds));
  }

  return {
    revision: mapRevisionRow({
      ...created,
      authorName: null,
      authorEmail: null,
      authorEmailEncrypted: null,
    }),
    reusedRevision: false,
  };
}

export async function pruneRevisions(pageId: string, keep: number) {
  return pruneRevisionsTx(db, pageId, keep);
}

export async function pruneRevisionsTx(tx: DbClient, pageId: string, keep: number) {
  if (!Number.isFinite(keep) || keep < 1) return;

  const excess = await tx
    .select({ id: pageRevisions.id })
    .from(pageRevisions)
    .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.kind, "publish")))
    .orderBy(desc(pageRevisions.version))
    .offset(keep);

  if (excess.length === 0) return;

  await tx.delete(pageRevisions).where(
    inArray(
      pageRevisions.id,
      excess.map((row) => row.id)
    )
  );
}

export async function discardAutosaveRevision(pageId: string, revisionId: string) {
  const [revision] = await db
    .select()
    .from(pageRevisions)
    .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.id, revisionId)));

  if (!revision) throw new Error("revision_not_found");
  if (normalizeRevisionKind(revision.kind) !== "autosave") {
    throw new Error("revision_delete_forbidden");
  }

  await db.delete(pageRevisions).where(eq(pageRevisions.id, revisionId));
  return mapRevisionRow({
    ...revision,
    authorName: null,
    authorEmail: null,
    authorEmailEncrypted: null,
  });
}

export async function restoreRevision(
  pageId: string,
  revisionId: string
): Promise<PageRevisionRestoreResult> {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!page) throw new Error("page_not_found");

  const [revision] = await db
    .select({
      id: pageRevisions.id,
      pageId: pageRevisions.pageId,
      version: pageRevisions.version,
      kind: pageRevisions.kind,
      data: pageRevisions.data,
      createdAt: pageRevisions.createdAt,
      createdBy: pageRevisions.createdBy,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(pageRevisions)
    .leftJoin(users, eq(pageRevisions.createdBy, users.id))
    .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.id, revisionId)));

  if (!revision) throw new Error("revision_not_found");

  const normalizedRevision = mapRevisionRow(revision);
  const currentSnapshot = normalizePageRevisionSnapshot({
    title: page.title,
    slug: page.slug,
    data: page.currentData,
  });
  const targetSnapshot = normalizePageRevisionSnapshot({
    title: normalizedRevision.title,
    slug: normalizedRevision.slug,
    data: normalizedRevision.data,
  });

  if (areRevisionSnapshotsEqual(currentSnapshot, targetSnapshot)) {
    return {
      restored: false,
      revision: normalizedRevision,
      page,
    };
  }

  const [updated] = await db
    .update(pages)
    .set({
      title: targetSnapshot.title ?? page.title,
      slug: targetSnapshot.slug ?? page.slug,
      currentData: targetSnapshot.data,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(pages.id, pageId))
    .returning();

  if (!updated) throw new Error("page_not_found");

  return {
    restored: true,
    revision: normalizedRevision,
    page: updated,
  };
}
