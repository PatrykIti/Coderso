import { and, desc, eq, max, ne } from "drizzle-orm";
import { db } from "../../db/client";
import { contentEntries, contentRevisions, contentTypes, users } from "../../db/schema";
import { createPreviewToken } from "../pages/previewService";
import {
  type ContentSchema,
  validateEntryData,
} from "./validation";

export type EntryStatus = "draft" | "published";
export type EntryData = Record<string, unknown>;

export type CreateEntryInput = {
  title: string;
  slug: string;
  data: EntryData;
  authorId?: string | null;
};

export type UpdateEntryInput = {
  title?: string;
  slug?: string;
  data?: EntryData;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

async function getContentSchema(typeId: string) {
  const [row] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.id, typeId));
  return row ?? null;
}

async function ensureEntrySlugAvailable(
  typeId: string,
  slug: string,
  excludeEntryId?: string
) {
  const rows = await db
    .select()
    .from(contentEntries)
    .where(
      excludeEntryId
        ? and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug), ne(contentEntries.id, excludeEntryId))
        : and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug))
    );

  if (rows.length > 0) {
    throw new Error("entry_slug_conflict");
  }
}

export async function listEntries(typeId: string) {
  const rows = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(eq(contentEntries.typeId, typeId))
    .orderBy(desc(contentEntries.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    typeId: row.typeId,
    title: row.title,
    slug: row.slug,
    status: row.status,
    data: row.data,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName ?? null,
          email: row.authorEmail ?? "",
        }
      : null,
  }));
}

export async function getEntry(id: string) {
  const [row] = await db.select().from(contentEntries).where(eq(contentEntries.id, id));
  return row ?? null;
}

export async function getEntryBySlug(typeId: string, slug: string) {
  const [row] = await db
    .select()
    .from(contentEntries)
    .where(and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug)));
  return row ?? null;
}

export async function createEntry(typeId: string, input: CreateEntryInput) {
  const contentType = await getContentSchema(typeId);
  if (!contentType) throw new Error("content_type_not_found");

  await ensureEntrySlugAvailable(typeId, input.slug);
  validateEntryData(typeId, contentType.schema as ContentSchema, input.data);

  const [row] = await db
    .insert(contentEntries)
    .values({
      typeId,
      authorId: input.authorId ?? null,
      title: input.title,
      slug: input.slug,
      status: "draft",
      data: input.data,
    })
    .returning();

  return row ?? null;
}

export async function updateEntry(id: string, input: UpdateEntryInput) {
  const entry = await getEntry(id);
  if (!entry) throw new Error("entry_not_found");

  const contentType = await getContentSchema(entry.typeId);
  if (!contentType) throw new Error("content_type_not_found");

  const nextSlug = input.slug ?? entry.slug;
  await ensureEntrySlugAvailable(entry.typeId, nextSlug, entry.id);

  const nextData = input.data ?? (entry.data as EntryData);
  validateEntryData(entry.typeId, contentType.schema as ContentSchema, nextData);

  const [row] = await db
    .update(contentEntries)
    .set({
      title: input.title ?? entry.title,
      slug: nextSlug,
      data: nextData,
      updatedAt: new Date(),
    })
    .where(eq(contentEntries.id, entry.id))
    .returning();

  return row ?? null;
}

export async function publishEntry(entryId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select()
      .from(contentEntries)
      .where(eq(contentEntries.id, entryId));

    if (!entry) throw new Error("entry_not_found");

    const contentType = await getContentSchema(entry.typeId);
    if (!contentType) throw new Error("content_type_not_found");
    validateEntryData(
      entry.typeId,
      contentType.schema as ContentSchema,
      entry.data
    );

    await createEntryRevisionTx(tx, entry.id, entry.data as EntryData, userId);

    const [updated] = await tx
      .update(contentEntries)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentEntries.id, entry.id))
      .returning();

    return updated ?? null;
  });
}

export async function unpublishEntry(entryId: string) {
  const [row] = await db
    .update(contentEntries)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(contentEntries.id, entryId))
    .returning();

  return row ?? null;
}

export async function listEntryRevisions(entryId: string) {
  return db
    .select()
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, entryId))
    .orderBy(desc(contentRevisions.version));
}

export async function createEntryRevision(
  entryId: string,
  data: EntryData,
  userId: string
) {
  return createEntryRevisionTx(db, entryId, data, userId);
}

export async function createEntryRevisionTx(
  tx: DbClient,
  entryId: string,
  data: EntryData,
  userId: string
) {
  const [{ value }] = await tx
    .select({ value: max(contentRevisions.version) })
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, entryId));

  const nextVersion = (value ?? 0) + 1;

  const [row] = await tx
    .insert(contentRevisions)
    .values({
      entryId,
      version: nextVersion,
      data,
      createdBy: userId,
    })
    .returning();

  return row ?? null;
}

export async function createEntryPreview(entryId: string, ttlMinutes?: number) {
  return createPreviewToken({
    targetType: "content",
    targetId: entryId,
    ttlMinutes,
  });
}
