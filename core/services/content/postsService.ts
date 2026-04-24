import { and, asc, desc, eq, inArray, max, ne } from "drizzle-orm";

import { db } from "../../db/client";
import {
  contentTaxonomies,
  contentTerms,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
  users,
} from "../../db/schema";
import { createPreviewToken, hashPreviewToken } from "../pages/previewService";
import { resolveEmailValue } from "../security/piiEmail";
import { areRevisionSnapshotsEqual, serializeRevisionSnapshot } from "./revisionSnapshot";
import { POST_BLOCK_TYPES } from "../posts/editor/postBlockDocument";
import {
  ensurePostDocumentForRead,
  ensurePostDocumentForWrite,
} from "../posts/editor/postBlockLegacyAdapter";

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

export const DEFAULT_POST_CONTENT_SCHEMA = {
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
} as const;

export type EntryData = Record<string, unknown>;
export type EntryStatus = "draft" | "published" | "scheduled" | "archived";

export type PostTaxonomyTerm = {
  id: string;
  taxonomyId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PostTaxonomyAssignments = {
  category?: PostTaxonomyTerm | null;
  tags: PostTaxonomyTerm[];
};

export type PostDetail = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  data: EntryData;
  tags: string[];
  taxonomy?: PostTaxonomyAssignments;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string } | null;
  seo:
    | {
        title?: string | null;
        description?: string | null;
        canonicalUrl?: string | null;
        robots?: string | null;
      }
    | null;
};

export type PostSummary = Omit<PostDetail, "taxonomy">;

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

export type UpdatePostMetadataInput = {
  status?: EntryStatus;
  scheduledAt?: Date | null;
  tags?: string[];
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    robots?: string | null;
  };
};

export type PostAutosaveInput = {
  title?: string;
  slug?: string;
  data?: EntryData;
  tags?: string[];
  taxonomy?: UpdatePostMetadataInput["taxonomy"];
  seo?: UpdatePostMetadataInput["seo"];
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

const normalizeTags = (tags?: string[]) => {
  if (!tags) return null;
  const trimmed = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);
  return Array.from(new Set(trimmed)).slice(0, 20);
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

const withNormalizedReadData = <T extends { data: EntryData }>(entry: T): T =>
  ({
    ...entry,
    data: ensurePostDocumentForRead(entry.data),
  }) as T;

const normalizeSeo = (value: unknown) => {
  if (!isRecord(value)) return null;
  const next: {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    robots?: string | null;
  } = {};

  if (typeof value.title === "string") next.title = value.title;
  if (typeof value.description === "string") next.description = value.description;
  if (typeof value.canonicalUrl === "string") next.canonicalUrl = value.canonicalUrl;
  if (typeof value.robots === "string") next.robots = value.robots;

  return Object.keys(next).length > 0 ? next : null;
};

const selectPostBase = {
  id: posts.id,
  authorId: posts.authorId,
  title: posts.title,
  slug: posts.slug,
  status: posts.status,
  tags: posts.tags,
  data: posts.data,
  seo: posts.seo,
  publishedAt: posts.publishedAt,
  scheduledAt: posts.scheduledAt,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
  authorName: users.name,
  authorEmail: users.email,
  authorEmailEncrypted: users.emailEncrypted,
};

const mapPostBase = (row: {
  id: string;
  authorId: string | null;
  title: string;
  slug: string;
  status: string;
  tags: unknown;
  data: unknown;
  seo: unknown;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  authorEmail: string | null;
  authorEmailEncrypted: unknown;
}): PostSummary => {
  const seo = normalizeSeo(row.seo);
  return withNormalizedReadData({
    id: row.id,
    typeId: POST_CONTENT_TYPE_SLUG,
    title: row.title,
    slug: row.slug,
    status: row.status as EntryStatus,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    data: ensurePostDocumentForWrite(normalizePostData(row.data)),
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName ?? null,
          email:
            resolveEmailValue({
              emailEncrypted: row.authorEmailEncrypted,
              email: row.authorEmail,
            }) ?? "",
        }
      : null,
    seo,
  });
};

const mapTaxonomyTerm = (row: {
  termId: string;
  termName: string;
  termSlug: string;
  taxonomyId: string;
}): PostTaxonomyTerm => ({
  id: row.termId,
  taxonomyId: row.taxonomyId,
  name: row.termName,
  slug: row.termSlug,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const getPostTaxonomies = async (postId: string): Promise<PostTaxonomyAssignments> => {
  const rows = await db
    .select({
      termId: contentTerms.id,
      termName: contentTerms.name,
      termSlug: contentTerms.slug,
      taxonomyId: contentTerms.taxonomyId,
      kind: contentTaxonomies.kind,
    })
    .from(postTermAssignments)
    .innerJoin(contentTerms, eq(postTermAssignments.termId, contentTerms.id))
    .innerJoin(contentTaxonomies, eq(contentTerms.taxonomyId, contentTaxonomies.id))
    .where(eq(postTermAssignments.postId, postId))
    .orderBy(asc(contentTerms.name));

  const tags: PostTaxonomyTerm[] = [];
  let category: PostTaxonomyTerm | null = null;

  for (const row of rows) {
    const term = mapTaxonomyTerm(row);
    if (row.kind === "category") {
      if (!category) category = term;
    } else if (row.kind === "tag") {
      tags.push(term);
    }
  }

  return { category, tags };
};

const getPostById = async (id: string): Promise<PostDetail | null> => {
  const [row] = await db
    .select(selectPostBase)
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, id));

  if (!row) return null;

  const taxonomy = await getPostTaxonomies(row.id);
  return {
    ...mapPostBase(row),
    taxonomy,
  };
};

const getPostBySlugInternal = async (slug: string): Promise<PostDetail | null> => {
  const [row] = await db
    .select(selectPostBase)
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.slug, slug));

  if (!row) return null;

  const taxonomy = await getPostTaxonomies(row.id);
  return {
    ...mapPostBase(row),
    taxonomy,
  };
};

const ensurePostSlugAvailable = async (slug: string, excludePostId?: string) => {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      excludePostId
        ? and(eq(posts.slug, slug), ne(posts.id, excludePostId))
        : eq(posts.slug, slug)
    );

  if (rows.length > 0) {
    throw new Error("post_slug_conflict");
  }
};

const listPostRevisionsInternal = async (postId: string): Promise<PostRevision[]> => {
  const rows = await db
    .select({
      id: postRevisions.id,
      postId: postRevisions.postId,
      version: postRevisions.version,
      data: postRevisions.data,
      createdAt: postRevisions.createdAt,
      createdById: users.id,
      createdByName: users.name,
      createdByEmail: users.email,
      createdByEmailEncrypted: users.emailEncrypted,
    })
    .from(postRevisions)
    .leftJoin(users, eq(postRevisions.createdBy, users.id))
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.version));

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    version: row.version,
    data: ensurePostDocumentForRead(row.data as EntryData),
    createdAt: row.createdAt,
    createdBy:
      row.createdById && (row.createdByEmail || row.createdByEmailEncrypted)
        ? {
            id: row.createdById,
            name: row.createdByName ?? null,
            email:
              resolveEmailValue({
                emailEncrypted: row.createdByEmailEncrypted,
                email: row.createdByEmail,
              }) ?? "",
          }
        : null,
  }));
};

const createPostRevision = async (
  postId: string,
  data: EntryData,
  actorId: string
): Promise<PostRevision> => {
  const created = await db.transaction(async (tx) => {
    const [{ value }] = await tx
      .select({ value: max(postRevisions.version) })
      .from(postRevisions)
      .where(eq(postRevisions.postId, postId));

    const nextVersion = (value ?? 0) + 1;

    const [row] = await tx
      .insert(postRevisions)
      .values({
        postId,
        version: nextVersion,
        data,
        createdBy: actorId,
      })
      .returning();

    return row ?? null;
  });

  if (!created) throw new Error("post_revision_create_failed");
  const revisions = await listPostRevisionsInternal(postId);
  const revision = revisions.find((item) => item.id === created.id);
  if (!revision) throw new Error("post_revision_create_failed");
  return revision;
};

const createOrReuseRevision = async (
  postId: string,
  data: EntryData,
  actorId: string
) => {
  const revisions = await listPostRevisionsInternal(postId);
  const latest = revisions[0] ?? null;
  const serialized = serializeRevisionSnapshot(data);
  if (latest && serializeRevisionSnapshot(latest.data) === serialized) {
    return { revision: latest, reused: true };
  }

  const revision = await createPostRevision(postId, data, actorId);
  return { revision, reused: false };
};

const replacePostTaxonomies = async (
  postId: string,
  input: { categoryId?: string | null; tagIds?: string[] }
): Promise<PostTaxonomyAssignments> => {
  const shouldUpdateCategory = input.categoryId !== undefined;
  const shouldUpdateTags = input.tagIds !== undefined;
  const normalizedTagIds = shouldUpdateTags
    ? Array.from(new Set(input.tagIds ?? [])).filter(Boolean)
    : [];
  const termIds = [
    ...(shouldUpdateCategory && input.categoryId ? [input.categoryId] : []),
    ...(shouldUpdateTags ? normalizedTagIds : []),
  ];

  const termRows =
    termIds.length > 0
      ? await db
          .select({
            id: contentTerms.id,
            taxonomyId: contentTerms.taxonomyId,
            name: contentTerms.name,
            slug: contentTerms.slug,
            kind: contentTaxonomies.kind,
          })
          .from(contentTerms)
          .innerJoin(contentTaxonomies, eq(contentTerms.taxonomyId, contentTaxonomies.id))
          .where(inArray(contentTerms.id, termIds))
      : [];

  if (termIds.length > termRows.length) {
    throw new Error("taxonomy_term_missing");
  }

  if (shouldUpdateCategory && input.categoryId) {
    const category = termRows.find((term) => term.id === input.categoryId) ?? null;
    if (!category || category.kind !== "category") {
      throw new Error("taxonomy_term_invalid");
    }
  }

  if (shouldUpdateTags && normalizedTagIds.length > 0) {
    const tagTerms = termRows.filter((term) => normalizedTagIds.includes(term.id));
    const invalid = tagTerms.some((term) => term.kind !== "tag");
    if (invalid) throw new Error("taxonomy_term_invalid");
  }

  await db.transaction(async (tx) => {
    const existingAssignments = await tx
      .select({ termId: postTermAssignments.termId })
      .from(postTermAssignments)
      .where(eq(postTermAssignments.postId, postId));

    const assignedTermIds = existingAssignments.map((item) => item.termId);
    const clearKinds = [
      ...(shouldUpdateCategory ? ["category"] : []),
      ...(shouldUpdateTags ? ["tag"] : []),
    ];
    let clearIds: string[] = [];
    if (assignedTermIds.length > 0 && clearKinds.length > 0) {
      const clearRows = await tx
        .select({ id: contentTerms.id })
        .from(contentTerms)
        .innerJoin(contentTaxonomies, eq(contentTerms.taxonomyId, contentTaxonomies.id))
        .where(
          and(
            inArray(contentTerms.id, assignedTermIds),
            inArray(contentTaxonomies.kind, clearKinds)
          )
        );

      clearIds = clearRows.map((row) => row.id);
    }

    if (clearIds.length > 0) {
      await tx
        .delete(postTermAssignments)
        .where(
          and(
            eq(postTermAssignments.postId, postId),
            inArray(postTermAssignments.termId, clearIds)
          )
        );
    }

    const assignments: Array<{ postId: string; termId: string }> = [];
    if (shouldUpdateCategory && input.categoryId) {
      assignments.push({ postId, termId: input.categoryId });
    }
    if (shouldUpdateTags) {
      normalizedTagIds.forEach((id) => assignments.push({ postId, termId: id }));
    }
    if (assignments.length > 0) {
      await tx.insert(postTermAssignments).values(assignments);
    }
  });

  return getPostTaxonomies(postId);
};

const resolveDuplicateTitle = (sourceTitle: string, index: number) => {
  if (index === 0) return `${sourceTitle} (Copy)`;
  return `${sourceTitle} (Copy ${index + 1})`;
};

const resolveDuplicateSlug = (sourceSlug: string, index: number) => {
  if (index === 0) return `${sourceSlug}-copy`;
  return `${sourceSlug}-copy-${index + 1}`;
};

export async function ensurePostContentType() {
  return {
    id: POST_CONTENT_TYPE_SLUG,
    slug: POST_CONTENT_TYPE_SLUG,
    name: POST_CONTENT_TYPE_NAME,
    schema: DEFAULT_POST_CONTENT_SCHEMA,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export async function listPosts(): Promise<PostSummary[]> {
  const rows = await db
    .select(selectPostBase)
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.updatedAt));

  return rows.map((row) => mapPostBase(row));
}

export async function getPost(id: string): Promise<PostDetail | null> {
  return getPostById(id);
}

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  const normalized = slug.trim();
  if (!normalized) return null;
  return getPostBySlugInternal(normalized);
}

export async function createPost(input: CreatePostInput): Promise<PostDetail | null> {
  const title = normalizePostTitle(input.title);
  const requestedSlug = normalizeOptionalPostSlug(input.slug);
  const slug = resolvePostSlug(title, requestedSlug);
  await ensurePostSlugAvailable(slug);

  const data = ensurePostDocumentForWrite(normalizePostData(input.data));

  const [created] = await db
    .insert(posts)
    .values({
      authorId: input.authorId ?? null,
      title,
      slug,
      status: "draft",
      data,
    })
    .returning({ id: posts.id });

  if (!created) throw new Error("post_create_failed");
  return getPostById(created.id);
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<PostDetail | null> {
  const existing = await getPostById(id);
  if (!existing) throw new Error("post_not_found");

  const title = input.title !== undefined ? normalizePostTitle(input.title) : existing.title;
  const requestedSlug =
    input.slug !== undefined ? normalizeOptionalPostSlug(input.slug) : undefined;
  const slug = requestedSlug ?? existing.slug;

  await ensurePostSlugAvailable(slug, id);

  const nextData =
    input.data !== undefined
      ? ensurePostDocumentForWrite(normalizePostData(input.data))
      : ensurePostDocumentForWrite(normalizePostData(existing.data));

  const [updated] = await db
    .update(posts)
    .set({
      title,
      slug,
      data: nextData,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  if (!updated) throw new Error("post_not_found");
  return getPostById(updated.id);
}

export async function updatePostMetadata(
  id: string,
  input: UpdatePostMetadataInput,
  actorId?: string
): Promise<PostDetail | null> {
  const existing = await getPostById(id);
  if (!existing) throw new Error("post_not_found");

  if (input.scheduledAt && Number.isNaN(input.scheduledAt.getTime())) {
    throw new Error("scheduled_at_invalid");
  }

  let nextStatus = existing.status;
  let nextPublishedAt = existing.publishedAt ?? null;
  let nextScheduledAt = existing.scheduledAt ?? null;

  if (input.status === "published" && existing.status !== "published") {
    if (!actorId) throw new Error("auth_required");
    nextStatus = "published";
    nextPublishedAt = new Date();
    nextScheduledAt = null;
  } else if (input.status === "draft" && existing.status !== "draft") {
    nextStatus = "draft";
    nextPublishedAt = null;
    nextScheduledAt = null;
  } else if (input.status && input.status !== existing.status) {
    nextStatus = input.status;
    if (input.status !== "scheduled") {
      nextScheduledAt = null;
      if (input.status !== "published") {
        nextPublishedAt = null;
      }
    }
  }

  if (input.scheduledAt !== undefined) {
    nextScheduledAt = input.scheduledAt;
  }

  if (nextStatus === "scheduled" && !nextScheduledAt) {
    throw new Error("scheduled_at_required");
  }

  let nextTags = normalizeTags(input.tags) ?? existing.tags;

  if (input.taxonomy !== undefined) {
    const taxonomy = await replacePostTaxonomies(id, input.taxonomy);
    if (input.taxonomy.tagIds !== undefined) {
      nextTags = taxonomy.tags.map((term) => term.name);
    }
  }

  const currentSeo = normalizeSeo(existing.seo) ?? {};
  const incomingSeo = normalizeSeo(input.seo) ?? null;
  const nextSeo =
    incomingSeo === null
      ? currentSeo
      : {
          ...currentSeo,
          ...incomingSeo,
        };

  const [updated] = await db
    .update(posts)
    .set({
      status: nextStatus,
      publishedAt: nextPublishedAt,
      scheduledAt: nextScheduledAt,
      tags: nextTags,
      seo: nextSeo,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  if (!updated) throw new Error("post_not_found");
  return getPostById(updated.id);
}

export async function publishPost(id: string, actorId: string) {
  const existing = await getPostById(id);
  if (!existing) throw new Error("post_not_found");

  const normalizedData = ensurePostDocumentForWrite(normalizePostData(existing.data));
  await createOrReuseRevision(id, normalizedData, actorId);

  const [updated] = await db
    .update(posts)
    .set({
      status: "published",
      publishedAt: new Date(),
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  return updated ?? null;
}

export async function unpublishPost(id: string) {
  const [updated] = await db
    .update(posts)
    .set({
      status: "draft",
      publishedAt: null,
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  return updated ?? null;
}

export async function createPostPreview(id: string, ttlMinutes?: number) {
  const post = await getPostById(id);
  if (!post) throw new Error("post_not_found");

  const { token, expiresAt } = await createPreviewToken({
    targetType: "content",
    targetId: id,
    ttlMinutes,
  });

  await db
    .insert(postPreviewTokens)
    .values({
      postId: id,
      tokenHash: hashPreviewToken(token),
      expiresAt,
    })
    .onConflictDoNothing({ target: postPreviewTokens.tokenHash });

  return { token, expiresAt };
}

export async function deletePost(id: string) {
  const [deleted] = await db
    .delete(posts)
    .where(eq(posts.id, id))
    .returning({ id: posts.id });

  if (!deleted) throw new Error("post_not_found");
  return { ok: true };
}

export async function duplicatePost(id: string, actorId?: string | null) {
  const source = await getPostById(id);
  if (!source) throw new Error("post_not_found");

  let createdId: string | null = null;

  for (let index = 0; index < 100; index += 1) {
    const nextTitle = resolveDuplicateTitle(source.title, index);
    const nextSlug = resolveDuplicateSlug(source.slug, index);

    try {
      await ensurePostSlugAvailable(nextSlug);

      const [created] = await db
        .insert(posts)
        .values({
          authorId: actorId ?? source.author?.id ?? null,
          title: nextTitle,
          slug: nextSlug,
          status: "draft",
          tags: source.tags,
          data: ensurePostDocumentForWrite(normalizePostData(source.data)),
          seo: normalizeSeo(source.seo) ?? {},
          metadata: {},
          publishedAt: null,
          scheduledAt: null,
        })
        .returning({ id: posts.id });

      if (!created) throw new Error("post_duplicate_failed");
      createdId = created.id;
      break;
    } catch (error) {
      if (error instanceof Error && error.message === "post_slug_conflict") {
        continue;
      }
      throw error;
    }
  }

  if (!createdId) throw new Error("post_duplicate_failed");

  const sourceAssignments = await db
    .select({ termId: postTermAssignments.termId })
    .from(postTermAssignments)
    .where(eq(postTermAssignments.postId, id));

  if (sourceAssignments.length > 0) {
    await db.insert(postTermAssignments).values(
      sourceAssignments.map((assignment) => ({
        postId: createdId as string,
        termId: assignment.termId,
      }))
    );
  }

  return getPostById(createdId);
}

export async function listPostRevisions(id: string) {
  const existing = await getPostById(id);
  if (!existing) throw new Error("post_not_found");
  return listPostRevisionsInternal(id);
}

export async function autosavePost(
  id: string,
  input: PostAutosaveInput,
  actorId?: string | null
): Promise<PostAutosaveResult> {
  if (!actorId) throw new Error("auth_required");

  const existing = await getPostById(id);
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
  const existing = await getPostById(id);
  if (!existing) throw new Error("post_not_found");

  const revisions = await listPostRevisionsInternal(id);
  const revision = revisions.find((item) => item.id === revisionId);
  if (!revision) throw new Error("post_revision_not_found");

  const currentData = ensurePostDocumentForWrite(normalizePostData(existing.data));
  const targetData = ensurePostDocumentForWrite(normalizePostData(revision.data));

  const isSameSnapshot = areRevisionSnapshotsEqual(currentData, targetData);

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
