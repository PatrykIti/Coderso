import {
  createEntry,
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
import { createContentType, getContentTypeBySlug } from "./typeService";
import type { ContentSchema } from "./validation";

export const POST_CONTENT_TYPE_SLUG = "post";
export const POST_CONTENT_TYPE_NAME = "Post";

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

const getPostFromEntry = async (
  postTypeId: string,
  entryId: string
): Promise<PostDetail | null> => {
  const entry = await getEntry(entryId);
  if (!entry || entry.typeId !== postTypeId) return null;
  return entry;
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
  const sourceData = normalizePostData(source.data);
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

export async function ensurePostContentType() {
  const existing = await getContentTypeBySlug(POST_CONTENT_TYPE_SLUG);
  if (existing) return existing;

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
  return listEntries(postType.id);
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
    normalizePostData(input.data),
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
  const incomingData = input.data !== undefined ? normalizePostData(input.data) : existing.data;
  const data = withSchemaSyncedFields(postType.schema, incomingData, title, slug);

  const payload: UpdateEntryInput = {
    ...(input.title !== undefined ? { title } : {}),
    ...(input.slug !== undefined ? { slug } : {}),
    ...(input.data !== undefined || input.title !== undefined || input.slug !== undefined
      ? { data }
      : {}),
  };
  return updateEntry(id, payload);
}

export async function updatePostMetadata(
  id: string,
  input: UpdateEntryMetadataInput,
  actorId?: string
) {
  const postType = await ensurePostContentType();
  const existing = await getPostFromEntry(postType.id, id);
  if (!existing) throw new Error("post_not_found");
  return updateEntryMetadata(id, input, actorId);
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
  await updateEntryMetadata(duplicated.id, {
    taxonomy: {
      categoryId: source.taxonomy?.category?.id ?? null,
      tagIds: source.taxonomy?.tags?.map((term) => term.id) ?? [],
    },
    seo: {
      title: source.seo?.title ?? undefined,
      description: source.seo?.description ?? undefined,
      canonicalUrl: source.seo?.canonicalUrl ?? undefined,
      robots: source.seo?.robots ?? undefined,
    },
  });

  return getPostFromEntry(postType.id, duplicated.id);
}
