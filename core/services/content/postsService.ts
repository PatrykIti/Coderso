import {
  createEntry,
  createEntryRevision,
  createEntryPreview,
  deleteEntry,
  getEntry,
  listEntries,
  publishEntry,
  unpublishEntry,
  updateEntry,
  updateEntryMetadata,
  type CreateEntryInput,
  type EntryData,
  type UpdateEntryInput,
  type UpdateEntryMetadataInput,
} from "./entryService";
import {
  createContentType,
  getContentTypeBySlug,
  updateContentType,
} from "./typeService";
import type { ContentSchema } from "./validation";
import { POST_BLOCK_TYPES } from "../posts/editor/postBlockDocument";
import {
  ensurePostDocumentForRead,
  ensurePostDocumentForWrite,
} from "../posts/editor/postBlockLegacyAdapter";
import { db } from "../../db/client";
import { contentRevisions, users } from "../../db/schema";
import { desc, eq } from "drizzle-orm";

export const POST_CONTENT_TYPE_SLUG = "post";
export const POST_CONTENT_TYPE_NAME = "Post";

const POST_DOCUMENT_SCHEMA_PROPERTY: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["version", "blocks"],
  properties: {
    version: { type: "number", const: 1 },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "attrs", "content"],
        properties: {
          id: { type: "string", minLength: 1 },
          type: {
            type: "string",
            enum: [...POST_BLOCK_TYPES],
          },
          attrs: { type: "object" },
          content: {},
        },
      },
    },
    meta: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", maxLength: 200 },
        excerpt: { type: "string", maxLength: 320 },
        readingTimeMinutes: { type: "number", minimum: 0 },
      },
    },
  },
};

export const DEFAULT_POST_CONTENT_SCHEMA: ContentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    excerpt: {
      type: "string",
      xFieldType: "textarea",
      xFieldConfig: {
        placeholder: "Short summary shown in post listings.",
      },
    },
    content: {
      type: "string",
      xFieldType: "richtext",
      xFieldConfig: {
        placeholder: "Write your post body here.",
      },
    },
    featuredImage: {
      type: "string",
      xFieldType: "media",
      xFieldConfig: {
        media: {
          multiple: false,
          accept: ["image/*"],
        },
      },
    },
    featured: {
      type: "boolean",
      xFieldType: "checkbox",
      xFieldConfig: {
        label: "Featured post",
      },
    },
    document: POST_DOCUMENT_SCHEMA_PROPERTY,
  },
};

export type PostSummary = Awaited<ReturnType<typeof listEntries>>[number];
export type PostDetail = NonNullable<Awaited<ReturnType<typeof getEntry>>>;

export type CreatePostInput = {
  title: string;
  slug?: string;
  data?: EntryData;
  authorId?: string | null;
};

export type UpdatePostInput = {
  title?: string;
  slug?: string;
  data?: EntryData;
};

export type PostRevisionAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PostRevision = {
  id: string;
  postId: string;
  version: number;
  data: EntryData;
  createdAt: Date;
  createdBy: PostRevisionAuthor | null;
};

export type PostAutosaveInput = {
  title?: string;
  slug?: string;
  data?: EntryData;
  tags?: string[];
  taxonomy?: UpdateEntryMetadataInput["taxonomy"];
  seo?: UpdateEntryMetadataInput["seo"];
};

export type PostAutosaveResult = {
  post: PostDetail;
  revision: PostRevision;
  savedAt: string;
  reusedRevision: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizePostTitle = (value: unknown) => {
  if (typeof value !== "string") throw new Error("post_title_invalid");
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) throw new Error("post_title_invalid");
  return normalized;
};

const normalizeOptionalPostSlug = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("post_slug_invalid");
  const normalized = slugify(value);
  if (!normalized) throw new Error("post_slug_invalid");
  return normalized;
};

const normalizePostData = (value: unknown): EntryData => {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error("post_data_invalid");
  return value;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const resolvePostSlug = (title: string, slug?: string) => {
  if (slug) return slug;
  const fromTitle = slugify(title);
  if (fromTitle.length > 0) return fromTitle;
  return `post-${Date.now().toString(36)}`;
};

const schemaHasField = (schema: unknown, fieldName: string) => {
  if (!isRecord(schema)) return false;
  if (!isRecord(schema.properties)) return false;
  return Object.prototype.hasOwnProperty.call(schema.properties, fieldName);
};

const withSchemaSyncedFields = (
  schema: unknown,
  data: EntryData,
  title: string,
  slug: string
) => {
  const next = { ...data };
  if (schemaHasField(schema, "title")) {
    next.title = title;
  }
  if (schemaHasField(schema, "slug")) {
    next.slug = slug;
  }
  return next;
};

const withNormalizedReadData = <T extends { data: EntryData }>(entry: T): T =>
  ({
    ...entry,
    data: ensurePostDocumentForRead(entry.data),
  }) as T;

const getPostFromEntry = async (
  postTypeId: string,
  entryId: string
): Promise<PostDetail | null> => {
  const entry = await getEntry(entryId);
  if (!entry || entry.typeId !== postTypeId) return null;
  return withNormalizedReadData(entry);
};

const resolveDuplicateTitle = (sourceTitle: string, index: number) => {
  if (index === 0) return `${sourceTitle} (Copy)`;
  return `${sourceTitle} (Copy ${index + 1})`;
};

const resolveDuplicateSlug = (sourceSlug: string, index: number) => {
  if (index === 0) return `${sourceSlug}-copy`;
  return `${sourceSlug}-copy-${index + 1}`;
};

const createDuplicatedEntry = async (
  postTypeId: string,
  source: PostDetail,
  actorId?: string | null
) => {
  const sourceData = ensurePostDocumentForWrite(normalizePostData(source.data));
  for (let index = 0; index < 100; index += 1) {
    const nextTitle = resolveDuplicateTitle(source.title, index);
    const nextSlug = resolveDuplicateSlug(source.slug, index);
    const payload: CreateEntryInput = {
      title: nextTitle,
      slug: nextSlug,
      data: sourceData,
      authorId: actorId ?? null,
    };
    try {
      const created = await createEntry(postTypeId, payload);
      if (!created) throw new Error("post_duplicate_failed");
      return created;
    } catch (error) {
      if (error instanceof Error && error.message === "entry_slug_conflict") {
        continue;
      }
      throw error;
    }
  }
  throw new Error("post_duplicate_failed");
};

const serializeRevisionData = (data: EntryData) => JSON.stringify(data);

const mapPostRevision = (
  row: {
    id: string;
    entryId: string;
    version: number;
    data: EntryData;
    createdAt: Date;
    createdById: string | null;
    createdByName: string | null;
    createdByEmail: string | null;
  }
): PostRevision => ({
  id: row.id,
  postId: row.entryId,
  version: row.version,
  data: row.data,
  createdAt: row.createdAt,
  createdBy:
    row.createdById && row.createdByEmail
      ? {
          id: row.createdById,
          name: row.createdByName,
          email: row.createdByEmail,
        }
      : null,
});

const listPostRevisionsInternal = async (postId: string) => {
  const rows = await db
    .select({
      id: contentRevisions.id,
      entryId: contentRevisions.entryId,
      version: contentRevisions.version,
      data: contentRevisions.data,
      createdAt: contentRevisions.createdAt,
      createdById: users.id,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(contentRevisions)
    .leftJoin(users, eq(contentRevisions.createdBy, users.id))
    .where(eq(contentRevisions.entryId, postId))
    .orderBy(desc(contentRevisions.version));

  return rows.map((row) =>
    mapPostRevision({
      ...row,
      data: row.data as EntryData,
    })
  );
};

const createOrReuseRevision = async (
  postId: string,
  data: EntryData,
  actorId: string
) => {
  const revisions = await listPostRevisionsInternal(postId);
  const latest = revisions[0] ?? null;
  const serialized = serializeRevisionData(data);
  if (latest && serializeRevisionData(latest.data) === serialized) {
    return { revision: latest, reused: true };
  }

  const created = await createEntryRevision(postId, data, actorId);
  if (!created) throw new Error("post_revision_create_failed");

  const fresh = (await listPostRevisionsInternal(postId))[0];
  if (!fresh) throw new Error("post_revision_create_failed");
  return { revision: fresh, reused: false };
};

export async function ensurePostContentType() {
  const existing = await getContentTypeBySlug(POST_CONTENT_TYPE_SLUG);
  if (existing) {
    if (schemaHasField(existing.schema, "document")) return existing;
    const nextSchema = {
      ...(isRecord(existing.schema) ? existing.schema : {}),
      type: "object",
      additionalProperties: false,
      properties: {
        ...(isRecord(existing.schema) && isRecord(existing.schema.properties)
          ? existing.schema.properties
          : {}),
        document: POST_DOCUMENT_SCHEMA_PROPERTY,
      },
    } satisfies ContentSchema;
    const updated = await updateContentType(existing.id, { schema: nextSchema });
    return updated ?? { ...existing, schema: nextSchema };
  }

  try {
    return await createContentType({
      name: POST_CONTENT_TYPE_NAME,
      slug: POST_CONTENT_TYPE_SLUG,
      schema: DEFAULT_POST_CONTENT_SCHEMA,
    });
  } catch {
    const concurrent = await getContentTypeBySlug(POST_CONTENT_TYPE_SLUG);
    if (concurrent) return concurrent;
    throw new Error("post_type_create_failed");
  }
}

export async function listPosts() {
  const postType = await ensurePostContentType();
  const items = await listEntries(postType.id);
  return items.map((item) => withNormalizedReadData(item));
}

export async function getPost(id: string) {
  const postType = await ensurePostContentType();
  return getPostFromEntry(postType.id, id);
}

export async function createPost(input: CreatePostInput) {
  const postType = await ensurePostContentType();
  const title = normalizePostTitle(input.title);
  const requestedSlug = normalizeOptionalPostSlug(input.slug);
  const slug = resolvePostSlug(title, requestedSlug);
  const data = withSchemaSyncedFields(
    postType.schema,
    ensurePostDocumentForWrite(normalizePostData(input.data)),
    title,
    slug
  );

  const created = await createEntry(postType.id, {
    title,
    slug,
    data,
    authorId: input.authorId ?? null,
  });
  if (!created) throw new Error("post_create_failed");
  return getPostFromEntry(postType.id, created.id);
}

export async function updatePost(id: string, input: UpdatePostInput) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");

  const title = input.title !== undefined ? normalizePostTitle(input.title) : existing.title;
  const slugInput =
    input.slug !== undefined ? normalizeOptionalPostSlug(input.slug) : undefined;
  const slug = slugInput ?? existing.slug;
  const incomingData =
    input.data !== undefined
      ? ensurePostDocumentForWrite(normalizePostData(input.data))
      : ensurePostDocumentForWrite(normalizePostData(existing.data));
  const data = withSchemaSyncedFields(postType.schema, incomingData, title, slug);

  const payload: UpdateEntryInput = {
    ...(input.title !== undefined ? { title } : {}),
    ...(input.slug !== undefined ? { slug } : {}),
    ...(input.data !== undefined || input.title !== undefined || input.slug !== undefined
      ? { data }
      : {}),
  };
  const updated = await updateEntry(id, payload);
  return updated ? withNormalizedReadData(updated) : null;
}

export async function updatePostMetadata(
  id: string,
  input: UpdateEntryMetadataInput,
  actorId?: string
) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  const updated = await updateEntryMetadata(id, input, actorId);
  return updated ? withNormalizedReadData(updated) : null;
}

export async function publishPost(id: string, actorId: string) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  return publishEntry(id, actorId);
}

export async function unpublishPost(id: string) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  return unpublishEntry(id);
}

export async function createPostPreview(id: string, ttlMinutes?: number) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  return createEntryPreview(id, ttlMinutes);
}

export async function deletePost(id: string) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  await deleteEntry(id);
  return { ok: true };
}

export async function duplicatePost(id: string, actorId?: string | null) {
  const postType = await ensurePostContentType();
  const source = await getPostFromEntry(postType.id, id);
  if (!source) throw new Error("post_not_found");

  const duplicated = await createDuplicatedEntry(postType.id, source, actorId);
  const categoryId = source.taxonomy?.category?.id ?? null;
  const tagIds = source.taxonomy?.tags?.map((term) => term.id) ?? [];
  const hasAssignedTaxonomy = Boolean(categoryId) || tagIds.length > 0;

  await updateEntryMetadata(duplicated.id, {
    tags: source.tags ?? [],
    ...(hasAssignedTaxonomy
      ? {
          taxonomy: {
            categoryId,
            tagIds,
          },
        }
      : {}),
    seo: {
      title: source.seo?.title ?? undefined,
      description: source.seo?.description ?? undefined,
      canonicalUrl: source.seo?.canonicalUrl ?? undefined,
      robots: source.seo?.robots ?? undefined,
    },
  });

  return getPostFromEntry(postType.id, duplicated.id);
}

export async function listPostRevisions(id: string) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  return listPostRevisionsInternal(id);
}

export async function autosavePost(
  id: string,
  input: PostAutosaveInput,
  actorId?: string | null
): Promise<PostAutosaveResult> {
  if (!actorId) throw new Error("auth_required");

  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");

  let next = existing;

  if (input.title !== undefined || input.slug !== undefined || input.data !== undefined) {
    const updated = await updatePost(id, {
      title: input.title,
      slug: input.slug,
      data: input.data,
    });
    if (!updated) throw new Error("post_not_found");
    next = updated;
  }

  if (input.tags !== undefined || input.taxonomy !== undefined || input.seo !== undefined) {
    const updated = await updatePostMetadata(
      id,
      {
        tags: input.tags,
        taxonomy: input.taxonomy,
        seo: input.seo,
      },
      actorId
    );
    if (!updated) throw new Error("post_not_found");
    next = updated;
  }

  const normalizedData = ensurePostDocumentForWrite(normalizePostData(next.data));
  const { revision, reused } = await createOrReuseRevision(id, normalizedData, actorId);

  return {
    post: withNormalizedReadData(next),
    revision,
    savedAt: new Date().toISOString(),
    reusedRevision: reused,
  };
}

export async function restorePostRevision(
  id: string,
  revisionId: string,
  actorId?: string | null
) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");

  const revisions = await listPostRevisionsInternal(id);
  const revision = revisions.find((item) => item.id === revisionId);
  if (!revision) throw new Error("post_revision_not_found");

  const currentData = ensurePostDocumentForWrite(normalizePostData(existing.data));
  const targetData = ensurePostDocumentForWrite(normalizePostData(revision.data));

  const isSameSnapshot =
    serializeRevisionData(currentData) === serializeRevisionData(targetData);

  if (isSameSnapshot) {
    return {
      restored: false,
      revision,
      post: withNormalizedReadData(existing),
    };
  }

  if (actorId) {
    await createOrReuseRevision(id, currentData, actorId);
  }

  const updated = await updatePost(id, { data: targetData });
  if (!updated) throw new Error("post_not_found");

  return {
    restored: true,
    revision,
    post: updated,
  };
}
