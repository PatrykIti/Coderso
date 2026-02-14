import { and, desc, eq, inArray, max, ne } from "drizzle-orm";
import { db } from "../../db/client";
import {
  contentEntries,
  contentRevisions,
  contentTypes,
  media,
  users,
} from "../../db/schema";
import { createPreviewToken } from "../pages/previewService";
import { invalidateContentEntryCache } from "../../site/cache/siteCache";
import { getContentType } from "./typeService";
import {
  getSeoDocumentByTarget,
  upsertSeoDocument,
} from "../seo/seoService";
import {
  getEntryTaxonomies,
  replaceEntryTaxonomies,
  resolveEntryTagsFromTaxonomy,
  type EntryTaxonomyAssignments,
} from "./taxonomyService";
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
  taxonomy?: EntryTaxonomyAssignments;
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
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: EntrySeo;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

type RelationFieldConfig = {
  name: string;
  targetSlug: string;
  multiple: boolean;
};

type MediaFieldConfig = {
  name: string;
  multiple: boolean;
  accept: string[] | undefined;
  maxItems: number | undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRelationConfig = (value: unknown) => {
  if (!isRecord(value)) return { target: undefined, multiple: false };
  const relation = value.relation;
  if (!isRecord(relation)) return { target: undefined, multiple: false };
  const target =
    typeof relation.target === "string" ? relation.target.trim() : undefined;
  const multiple = relation.multiple === true;
  return { target: target || undefined, multiple };
};

const readMediaConfig = (value: unknown) => {
  if (!isRecord(value)) return {};
  const mediaValue = isRecord(value.media) ? value.media : value;
  if (!isRecord(mediaValue)) return {};
  const multiple = mediaValue.multiple === true;
  const accept = Array.isArray(mediaValue.accept)
    ? mediaValue.accept
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;
  const maxItems =
    typeof mediaValue.maxItems === "number" && Number.isFinite(mediaValue.maxItems)
      ? mediaValue.maxItems
      : undefined;
  return {
    multiple,
    accept: accept?.length ? accept : undefined,
    maxItems,
  };
};

const extractRelationFields = (schema: ContentSchema) => {
  if (!schema || typeof schema !== "object") return [];
  const typed = schema as Record<string, unknown>;
  const properties = typed.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return [];
  }

  return Object.entries(properties)
    .map(([name, definition]) => {
      if (!isRecord(definition)) return null;
      const xFieldType = definition.xFieldType;
      const xRelationTarget =
        typeof definition.xRelationTarget === "string"
          ? definition.xRelationTarget.trim()
          : undefined;
      const { target, multiple } = readRelationConfig(definition.xFieldConfig);
      const resolvedTarget = xRelationTarget ?? target;
      const isRelation =
        xFieldType === "relation" || Boolean(resolvedTarget);
      if (!isRelation || !resolvedTarget) return null;
      const isArray = definition.type === "array";
      return {
        name,
        targetSlug: resolvedTarget,
        multiple: isArray || multiple,
      };
    })
    .filter((entry): entry is RelationFieldConfig => Boolean(entry));
};

const extractMediaFields = (schema: ContentSchema) => {
  if (!schema || typeof schema !== "object") return [];
  const typed = schema as Record<string, unknown>;
  const properties = typed.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return [];
  }

  return Object.entries(properties)
    .map(([name, definition]) => {
      if (!isRecord(definition)) return null;
      const xFieldType = definition.xFieldType;
      const mediaConfig = readMediaConfig(definition.xFieldConfig);
      const isMedia =
        xFieldType === "media" ||
        mediaConfig.multiple === true ||
        Boolean(mediaConfig.accept);
      if (!isMedia) return null;
      const multiple = definition.type === "array" || mediaConfig.multiple === true;
      return {
        name,
        multiple,
        accept: mediaConfig.accept,
        maxItems:
          typeof mediaConfig.maxItems === "number"
            ? mediaConfig.maxItems
            : typeof definition.maxItems === "number"
              ? definition.maxItems
              : undefined,
      };
    })
    .filter((entry): entry is MediaFieldConfig => Boolean(entry));
};

const matchesMimeAccept = (mimeType: string, accept?: string[]) => {
  if (!accept || accept.length === 0) return true;
  const normalized = accept.map((entry) => entry.toLowerCase());
  const candidate = mimeType.toLowerCase();
  return normalized.some((pattern) => {
    if (pattern === "*/*") return true;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, pattern.indexOf("/"));
      return candidate.startsWith(`${prefix}/`);
    }
    return candidate === pattern;
  });
};

async function validateMediaAssets(
  schema: ContentSchema,
  data: EntryData,
  client: DbClient
) {
  const mediaFields = extractMediaFields(schema);
  if (mediaFields.length === 0) return;

  const selectedIds = new Set<string>();
  const allowedById = new Map<string, string[][]>();

  for (const field of mediaFields) {
    const rawValue = data[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (field.multiple) {
      if (!Array.isArray(rawValue)) {
        throw new Error("media_value_invalid");
      }
      if (field.maxItems && rawValue.length > field.maxItems) {
        throw new Error("media_value_invalid");
      }
      for (const id of rawValue) {
        if (typeof id !== "string" || id.trim() === "") {
          throw new Error("media_value_invalid");
        }
        selectedIds.add(id);
        if (field.accept) {
          const bucket = allowedById.get(id) ?? [];
          bucket.push(field.accept);
          allowedById.set(id, bucket);
        }
      }
    } else {
      if (Array.isArray(rawValue)) {
        throw new Error("media_value_invalid");
      }
      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        throw new Error("media_value_invalid");
      }
      selectedIds.add(rawValue);
      if (field.accept) {
        const bucket = allowedById.get(rawValue) ?? [];
        bucket.push(field.accept);
        allowedById.set(rawValue, bucket);
      }
    }
  }

  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  const rows = await client
    .select({ id: media.id, mimeType: media.mimeType })
    .from(media)
    .where(inArray(media.id, ids));

  const found = new Map(rows.map((row) => [row.id, row.mimeType]));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error("media_asset_missing");
  }

  for (const [id, acceptLists] of allowedById.entries()) {
    const mimeType = found.get(id);
    if (!mimeType) continue;
    for (const accept of acceptLists) {
      if (!matchesMimeAccept(mimeType, accept)) {
        throw new Error("media_type_not_allowed");
      }
    }
  }
}

async function validateRelationEntries(
  schema: ContentSchema,
  data: EntryData,
  client: DbClient
) {
  const relationFields = extractRelationFields(schema);
  if (relationFields.length === 0) return;

  const idsByTarget = new Map<string, Set<string>>();
  const targetsBySlug = new Map<string, string>();
  const uniqueTargets = Array.from(
    new Set(relationFields.map((field) => field.targetSlug))
  );
  const targetRows = await client
    .select({ id: contentTypes.id, slug: contentTypes.slug })
    .from(contentTypes)
    .where(inArray(contentTypes.slug, uniqueTargets));
  for (const row of targetRows) {
    targetsBySlug.set(row.slug, row.id);
  }

  if (targetsBySlug.size !== uniqueTargets.length) {
    throw new Error("relation_target_not_found");
  }

  for (const field of relationFields) {

    const rawValue = data[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    const addId = (id: string) => {
      const bucket = idsByTarget.get(field.targetSlug) ?? new Set<string>();
      bucket.add(id);
      idsByTarget.set(field.targetSlug, bucket);
    };

    if (field.multiple) {
      if (!Array.isArray(rawValue)) {
        throw new Error("relation_value_invalid");
      }
      for (const entryId of rawValue) {
        if (typeof entryId !== "string" || entryId.trim() === "") {
          throw new Error("relation_value_invalid");
        }
        addId(entryId);
      }
    } else {
      if (Array.isArray(rawValue)) {
        throw new Error("relation_value_invalid");
      }
      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        throw new Error("relation_value_invalid");
      }
      addId(rawValue);
    }
  }

  for (const [targetSlug, ids] of idsByTarget.entries()) {
    const targetId = targetsBySlug.get(targetSlug);
    if (!targetId) continue;
    const idList = Array.from(ids);
    if (idList.length === 0) continue;

    const rows = await client
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(
        and(eq(contentEntries.typeId, targetId), inArray(contentEntries.id, idList))
      );

    const found = new Set(rows.map((row) => row.id));
    const missing = idList.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new Error("relation_entry_missing");
    }
  }
}

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
  const taxonomy = await getEntryTaxonomies(row.id);

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
    taxonomy,
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
  await validateRelationEntries(
    contentType.schema as ContentSchema,
    input.data,
    db
  );
  await validateMediaAssets(
    contentType.schema as ContentSchema,
    input.data,
    db
  );

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
  await validateRelationEntries(
    contentType.schema as ContentSchema,
    nextData,
    db
  );
  await validateMediaAssets(
    contentType.schema as ContentSchema,
    nextData,
    db
  );

  await db
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

  return getEntry(entry.id);
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
    await validateRelationEntries(
      contentType.schema as ContentSchema,
      entry.data as EntryData,
      tx
    );
    await validateMediaAssets(
      contentType.schema as ContentSchema,
      entry.data as EntryData,
      tx
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
  let resolvedTags: string[] | null = null;

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

  if (input.taxonomy !== undefined) {
    await replaceEntryTaxonomies(entry.id, entry.typeId, input.taxonomy);
    resolvedTags = await resolveEntryTagsFromTaxonomy(entry.id, entry.typeId);
  } else if (normalizedTags !== null) {
    resolvedTags = normalizedTags;
  }

  const metadataUpdate: Partial<typeof contentEntries.$inferInsert> = {};
  if (resolvedTags !== null) {
    metadataUpdate.tags = resolvedTags;
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
