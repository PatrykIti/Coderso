import { desc, eq, max } from "drizzle-orm";
import { db } from "../../db/client";
import { pageRevisions, pages } from "../../db/schema";

export type RevisionData = Record<string, unknown>;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

export async function listRevisions(pageId: string) {
  return db
    .select()
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.version));
}

export async function createRevision(
  pageId: string,
  data: RevisionData,
  userId: string
) {
  return createRevisionTx(db, pageId, data, userId);
}

export async function createRevisionTx(
  tx: DbClient,
  pageId: string,
  data: RevisionData,
  userId: string
) {
  const [{ value }] = await tx
    .select({ value: max(pageRevisions.version) })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId));

  const nextVersion = (value ?? 0) + 1;

  const [revision] = await tx
    .insert(pageRevisions)
    .values({
      pageId,
      version: nextVersion,
      data,
      createdBy: userId,
    })
    .returning();

  return revision ?? null;
}

export async function restoreRevision(revisionId: string) {
  const [revision] = await db
    .select()
    .from(pageRevisions)
    .where(eq(pageRevisions.id, revisionId));

  if (!revision) throw new Error("revision_not_found");

  await db
    .update(pages)
    .set({
      currentData: revision.data,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(pages.id, revision.pageId));

  return revision;
}
