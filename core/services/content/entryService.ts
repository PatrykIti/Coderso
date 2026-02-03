import { and, desc, eq, max, ne } from "drizzle-orm";
import { db } from "../../db/client";
import { contentEntries, contentRevisions, contentTypes, users } from "../../db/schema";
import { createPreviewToken } from "../pages/previewService";
import { invalidateContentEntryCache } from "../../site/cache/siteCache";
import { getContentType } from "./typeService";
import {
  getSeoDocumentByTarget,
  upsertSeoDocument,
} from "../seo/seoService";
import {
  type ContentSchema,
  validateEntryData,
} from "./validation";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";
export type EntryData = Record<string, unknown>;
export type EntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type EntryDetail = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  data: EntryData;
  tags: string[];
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string } | null;
  seo: EntrySeo | null;
};

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

export type UpdateEntryMetadataInput = {
  status?: EntryStatus;
  scheduledAt?: Date | null;
  tags?: string[];
  seo?: EntrySeo;
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

const normalizeTags = (tags?: string[]) => {
  if (!tags) return null;
  const trimmed = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);
  return Array.from(new Set(trimmed)).slice(0, 20);
};

const normalizeSeoSlug = (slug: string | null) => {
  if (!slug) return null;
  return slug.startsWith("/") ? slug : `/${slug}`;
};

export async function listEntries(typeId: string) {
  const rows = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
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
    status: row.status as EntryStatus,
    tags: (row.tags ?? []) as string[],
    data: row.data as EntryData,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
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

export async function getEntry(id: string): Promise<EntryDetail | null> {
  const [row] = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(eq(contentEntries.id, id));

  if (!row) return null;

  const seo = await getSeoDocumentByTarget("entry", row.id);

  return {
    id: row.id,
    typeId: row.typeId,
    title: row.title,
    slug: row.slug,
    status: row.status as EntryStatus,
    tags: (row.tags ?? []) as string[],
    data: row.data as EntryData,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName ?? null,
          email: row.authorEmail ?? "",
        }
      : null,
    seo: seo
      ? {
          title: seo.title ?? null,
          description: seo.description ?? null,
          canonicalUrl: seo.canonicalUrl ?? null,
          robots: seo.robots ?? null,
        }
      : null,
  };
}

export async function deleteEntry(id: string) {
  const [row] = await db
    .delete(contentEntries)
    .where(eq(contentEntries.id, id))
    .returning();
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

  if (input.title || input.slug) {
    await upsertSeoDocument({
      targetType: "entry",
      targetId: entry.id,
      title: input.title ?? entry.title,
      slug: normalizeSeoSlug(nextSlug),
    });
  }

  return row ?? null;
}

export async function publishEntry(entryId: string, userId: string) {
  const updated = await db.transaction(async (tx) => {
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
        scheduledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(contentEntries.id, entry.id))
      .returning();

    return updated ?? null;
  });

  if (updated) {
    const contentType = await getContentType(updated.typeId);
    if (contentType) {
      await invalidateContentEntryCache({
        typeSlug: contentType.slug,
        entrySlug: updated.slug,
        entryId: updated.id,
      });
    }
  }

  return updated;
}

export async function unpublishEntry(entryId: string) {
  const [row] = await db
    .update(contentEntries)
    .set({
      status: "draft",
      publishedAt: null,
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(contentEntries.id, entryId))
    .returning();

  if (row) {
    const contentType = await getContentType(row.typeId);
    if (contentType) {
      await invalidateContentEntryCache({
        typeSlug: contentType.slug,
        entrySlug: row.slug,
        entryId: row.id,
      });
    }
  }

  return row ?? null;
}

export async function updateEntryMetadata(
  entryId: string,
  input: UpdateEntryMetadataInput,
  actorId?: string
) {
  const entry = await getEntry(entryId);
  if (!entry) throw new Error("entry_not_found");

  const nextStatus = input.status ?? entry.status;
  const normalizedTags = normalizeTags(input.tags);

  if (input.scheduledAt && Number.isNaN(input.scheduledAt.getTime())) {
    throw new Error("scheduled_at_invalid");
  }

  if (nextStatus === "scheduled") {
    if (!input.scheduledAt && !entry.scheduledAt) {
      throw new Error("scheduled_at_required");
    }
  }

  if (input.status === "published" && entry.status !== "published") {
    if (!actorId) throw new Error("auth_required");
    await publishEntry(entry.id, actorId);
  } else if (input.status === "draft" && entry.status !== "draft") {
    await unpublishEntry(entry.id);
  } else if (input.status && input.status !== entry.status) {
    await db
      .update(contentEntries)
      .set({
        status: input.status,
        scheduledAt: input.status === "scheduled" ? (input.scheduledAt ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(contentEntries.id, entry.id));
  }

  const metadataUpdate: Partial<typeof contentEntries.$inferInsert> = {};
  if (normalizedTags) {
    metadataUpdate.tags = normalizedTags;
  }
  if (input.scheduledAt !== undefined) {
    metadataUpdate.scheduledAt = input.scheduledAt;
  }
  if (input.status && input.status !== "scheduled") {
    metadataUpdate.scheduledAt = null;
  }

  if (Object.keys(metadataUpdate).length > 0) {
    await db
      .update(contentEntries)
      .set({ ...metadataUpdate, updatedAt: new Date() })
      .where(eq(contentEntries.id, entry.id));
  }

  if (input.seo) {
    await upsertSeoDocument({
      targetType: "entry",
      targetId: entry.id,
      title: input.seo.title ?? undefined,
      description: input.seo.description ?? undefined,
      canonicalUrl: input.seo.canonicalUrl ?? undefined,
      robots: input.seo.robots ?? undefined,
      slug: normalizeSeoSlug(entry.slug),
    });
  }

  return getEntry(entry.id);
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
