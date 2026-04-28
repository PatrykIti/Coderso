import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "../../../db/client";
import {
  contentEntries,
  contentRevisions,
  contentTermAssignments,
  contentTypes,
  media,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
  previewTokens,
  seoDocuments,
} from "../../../db/schema";
import { ensurePostDocumentForWrite } from "../editor/postBlockLegacyAdapter";
import {
  createPostsBackfillReport,
  finalizePostsBackfillReport,
  markLegacyPost,
  markPostFailed,
  markPostInsert,
  markPostSkipped,
  markPostUpdate,
  mergeSyncStats,
  recordBackfillMismatch,
  type PostsBackfillReport,
  type PostsBackfillSyncStats,
} from "./postsBackfillReport";

const LEGACY_POST_TYPE_SLUGS = ["post", "posts"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const trimOptional = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toIso = (value: Date | null) => {
  if (!value) return null;
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

const parseUuidCandidate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(trimmed) ? trimmed : null;
};

const readFeaturedMediaCandidate = (data: Record<string, unknown>) => {
  const direct = parseUuidCandidate(data.featuredImage);
  if (direct) return direct;
  if (Array.isArray(data.featuredImage)) {
    for (const candidate of data.featuredImage) {
      const parsed = parseUuidCandidate(candidate);
      if (parsed) return parsed;
    }
  }
  return null;
};

type LegacyPostRow = {
  entryId: string;
  typeId: string;
  typeSlug: string;
  authorId: string | null;
  slug: string;
  title: string;
  status: string;
  tags: unknown;
  data: unknown;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonicalUrl: string | null;
  seoRobots: string | null;
};

export type RunPostsBackfillOptions = {
  dryRun?: boolean;
  shadowRead?: boolean;
  entryIds?: string[];
};

const buildSeoPayload = (row: LegacyPostRow) => {
  const next: {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    robots?: string | null;
  } = {};

  if (row.seoTitle) next.title = row.seoTitle;
  if (row.seoDescription) next.description = row.seoDescription;
  if (row.seoCanonicalUrl) next.canonicalUrl = row.seoCanonicalUrl;
  if (row.seoRobots) next.robots = row.seoRobots;

  return Object.keys(next).length > 0 ? next : {};
};

const normalizeLegacyData = (value: unknown) => {
  if (!isRecord(value)) throw new Error("legacy_post_data_invalid");
  return ensurePostDocumentForWrite(value);
};

const normalizeEntryIds = (value: string[] | undefined) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));

const loadLegacyPosts = async (entryIds: string[]): Promise<LegacyPostRow[]> => {
  const conditions = [
    inArray(contentTypes.slug, [...LEGACY_POST_TYPE_SLUGS]),
    ...(entryIds.length > 0 ? [inArray(contentEntries.id, entryIds)] : []),
  ];

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  return db
    .select({
      entryId: contentEntries.id,
      typeId: contentEntries.typeId,
      typeSlug: contentTypes.slug,
      authorId: contentEntries.authorId,
      slug: contentEntries.slug,
      title: contentEntries.title,
      status: contentEntries.status,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
      seoTitle: seoDocuments.title,
      seoDescription: seoDocuments.description,
      seoCanonicalUrl: seoDocuments.canonicalUrl,
      seoRobots: seoDocuments.robots,
    })
    .from(contentEntries)
    .innerJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .leftJoin(
      seoDocuments,
      and(
        eq(seoDocuments.targetType, "entry"),
        eq(seoDocuments.targetId, contentEntries.id)
      )
    )
    .where(whereClause)
    .orderBy(asc(contentEntries.createdAt));
};

const resolveFeaturedMediaId = async (
  data: Record<string, unknown>,
  cache: Map<string, boolean>
) => {
  const candidate = readFeaturedMediaCandidate(data);
  if (!candidate) return null;

  if (cache.has(candidate)) {
    return cache.get(candidate) ? candidate : null;
  }

  const [row] = await db
    .select({ id: media.id })
    .from(media)
    .where(eq(media.id, candidate));
  const exists = Boolean(row);
  cache.set(candidate, exists);
  return exists ? candidate : null;
};

const syncLegacyRevisions = async (
  legacyEntryId: string,
  normalizedDataFallback: Record<string, unknown>,
  dryRun: boolean,
  report: PostsBackfillReport
): Promise<PostsBackfillSyncStats> => {
  const legacyRows = await db
    .select({
      id: contentRevisions.id,
      version: contentRevisions.version,
      data: contentRevisions.data,
      createdAt: contentRevisions.createdAt,
      createdBy: contentRevisions.createdBy,
    })
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, legacyEntryId))
    .orderBy(asc(contentRevisions.version));

  const existingRows = await db
    .select({
      id: postRevisions.id,
      version: postRevisions.version,
    })
    .from(postRevisions)
    .where(eq(postRevisions.postId, legacyEntryId));

  const existingIds = new Set(existingRows.map((row) => row.id));
  const existingVersionToId = new Map(existingRows.map((row) => [row.version, row.id]));

  const stats: PostsBackfillSyncStats = {
    legacy: legacyRows.length,
    inserted: 0,
    updated: 0,
    existing: 0,
  };

  for (const row of legacyRows) {
    const conflictByVersion = existingVersionToId.get(row.version);
    if (conflictByVersion && conflictByVersion !== row.id) {
      stats.existing += 1;
      recordBackfillMismatch(report, {
        legacyEntryId,
        code: "revision_version_conflict",
        message: `Revision version ${row.version} already mapped to ${conflictByVersion}.`,
      });
      continue;
    }

    const normalizedRevisionData = isRecord(row.data)
      ? ensurePostDocumentForWrite(row.data)
      : normalizedDataFallback;

    if (existingIds.has(row.id)) {
      stats.updated += 1;
    } else {
      stats.inserted += 1;
    }

    if (dryRun) continue;

    await db
      .insert(postRevisions)
      .values({
        id: row.id,
        postId: legacyEntryId,
        version: row.version,
        data: normalizedRevisionData,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      })
      .onConflictDoUpdate({
        target: postRevisions.id,
        set: {
          postId: legacyEntryId,
          version: row.version,
          data: normalizedRevisionData,
          createdAt: row.createdAt,
          createdBy: row.createdBy,
        },
      });
  }

  return stats;
};

const syncLegacyPreviewTokens = async (
  legacyEntryId: string,
  dryRun: boolean
): Promise<PostsBackfillSyncStats> => {
  const legacyRows = await db
    .select({
      tokenHash: previewTokens.tokenHash,
      expiresAt: previewTokens.expiresAt,
      createdAt: previewTokens.createdAt,
    })
    .from(previewTokens)
    .where(
      and(
        eq(previewTokens.targetType, "content"),
        eq(previewTokens.targetId, legacyEntryId)
      )
    );

  const existingRows = await db
    .select({ tokenHash: postPreviewTokens.tokenHash })
    .from(postPreviewTokens)
    .where(eq(postPreviewTokens.postId, legacyEntryId));

  const existingHashes = new Set(existingRows.map((row) => row.tokenHash));

  const stats: PostsBackfillSyncStats = {
    legacy: legacyRows.length,
    inserted: 0,
    updated: 0,
    existing: 0,
  };

  for (const row of legacyRows) {
    if (existingHashes.has(row.tokenHash)) {
      stats.existing += 1;
      continue;
    }

    stats.inserted += 1;
    if (dryRun) continue;

    await db
      .insert(postPreviewTokens)
      .values({
        postId: legacyEntryId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      })
      .onConflictDoNothing({ target: postPreviewTokens.tokenHash });
  }

  return stats;
};

const syncLegacyTermAssignments = async (
  legacyEntryId: string,
  dryRun: boolean
): Promise<PostsBackfillSyncStats> => {
  const legacyRows = await db
    .select({
      termId: contentTermAssignments.termId,
      createdAt: contentTermAssignments.createdAt,
    })
    .from(contentTermAssignments)
    .where(eq(contentTermAssignments.entryId, legacyEntryId));

  const existingRows = await db
    .select({ termId: postTermAssignments.termId })
    .from(postTermAssignments)
    .where(eq(postTermAssignments.postId, legacyEntryId));

  const existingTermIds = new Set(existingRows.map((row) => row.termId));

  const stats: PostsBackfillSyncStats = {
    legacy: legacyRows.length,
    inserted: 0,
    updated: 0,
    existing: 0,
  };

  for (const row of legacyRows) {
    if (existingTermIds.has(row.termId)) {
      stats.existing += 1;
      continue;
    }

    stats.inserted += 1;
    if (dryRun) continue;

    await db
      .insert(postTermAssignments)
      .values({
        postId: legacyEntryId,
        termId: row.termId,
        createdAt: row.createdAt,
      })
      .onConflictDoNothing({
        target: [postTermAssignments.postId, postTermAssignments.termId],
      });
  }

  return stats;
};

const countRows = async (
  query: "revisions" | "preview_tokens" | "term_assignments",
  postId: string
) => {
  if (query === "revisions") {
    const [row] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postRevisions)
      .where(eq(postRevisions.postId, postId));
    return row?.count ?? 0;
  }

  if (query === "preview_tokens") {
    const [row] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(postPreviewTokens)
      .where(eq(postPreviewTokens.postId, postId));
    return row?.count ?? 0;
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(postTermAssignments)
    .where(eq(postTermAssignments.postId, postId));
  return row?.count ?? 0;
};

const compareStringArrays = (left: string[], right: string[]) => {
  const a = [...left].sort();
  const b = [...right].sort();
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

export async function runPostsBackfill(
  options: RunPostsBackfillOptions = {}
): Promise<PostsBackfillReport> {
  const dryRun = options.dryRun === true;
  const shadowRead = options.shadowRead !== false;
  const entryIds = normalizeEntryIds(options.entryIds);
  const report = createPostsBackfillReport(dryRun);

  const legacyRows = await loadLegacyPosts(entryIds);
  const mediaExistsCache = new Map<string, boolean>();

  for (const legacy of legacyRows) {
    markLegacyPost(report);

    try {
      const normalizedData = normalizeLegacyData(legacy.data);
      const seoPayload = buildSeoPayload(legacy);
      const legacyTags = toStringArray(legacy.tags);
      const featuredMediaId = await resolveFeaturedMediaId(normalizedData, mediaExistsCache);

      const [existingPostById] = await db
        .select({
          id: posts.id,
          slug: posts.slug,
          updatedAt: posts.updatedAt,
          metadata: posts.metadata,
        })
        .from(posts)
        .where(eq(posts.id, legacy.entryId));

      const [slugConflict] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.slug, legacy.slug), ne(posts.id, legacy.entryId)));

      if (slugConflict) {
        markPostSkipped(report);
        recordBackfillMismatch(report, {
          legacyEntryId: legacy.entryId,
          code: "slug_conflict",
          message: `Slug "${legacy.slug}" is already used by post ${slugConflict.id}.`,
        });
        continue;
      }

      if (
        existingPostById &&
        existingPostById.updatedAt.getTime() > legacy.updatedAt.getTime()
      ) {
        markPostSkipped(report);
        recordBackfillMismatch(report, {
          legacyEntryId: legacy.entryId,
          code: "post_newer_than_legacy",
          message: `Post ${legacy.entryId} has newer updatedAt than legacy entry and was skipped.`,
        });
        continue;
      }

      const metadataBase = isRecord(existingPostById?.metadata)
        ? { ...existingPostById.metadata }
        : {};

      const migrationStamp = {
        source: "content_entries",
        legacyEntryId: legacy.entryId,
        legacyTypeId: legacy.typeId,
        legacyTypeSlug: legacy.typeSlug,
        migratedAt: new Date().toISOString(),
        backfillVersion: 1,
      };

      const insertPayload = {
        id: legacy.entryId,
        authorId: legacy.authorId,
        featuredMediaId,
        slug: legacy.slug,
        title: legacy.title,
        status: legacy.status,
        excerpt: trimOptional(normalizedData.excerpt),
        tags: legacyTags,
        data: normalizedData,
        metadata: {
          ...metadataBase,
          migration: migrationStamp,
        },
        seo: seoPayload,
        publishedAt: legacy.publishedAt,
        scheduledAt: legacy.scheduledAt,
        createdAt: legacy.createdAt,
        updatedAt: legacy.updatedAt,
      };

      if (existingPostById) {
        markPostUpdate(report);
      } else {
        markPostInsert(report);
      }

      if (!dryRun) {
        if (existingPostById) {
          await db
            .update(posts)
            .set({
              authorId: insertPayload.authorId,
              featuredMediaId: insertPayload.featuredMediaId,
              slug: insertPayload.slug,
              title: insertPayload.title,
              status: insertPayload.status,
              excerpt: insertPayload.excerpt,
              tags: insertPayload.tags,
              data: insertPayload.data,
              metadata: insertPayload.metadata,
              seo: insertPayload.seo,
              publishedAt: insertPayload.publishedAt,
              scheduledAt: insertPayload.scheduledAt,
              updatedAt: insertPayload.updatedAt,
            })
            .where(eq(posts.id, legacy.entryId));
        } else {
          await db.insert(posts).values(insertPayload);
        }
      }

      const revisionStats = await syncLegacyRevisions(
        legacy.entryId,
        normalizedData,
        dryRun,
        report
      );
      const previewTokenStats = await syncLegacyPreviewTokens(legacy.entryId, dryRun);
      const termAssignmentStats = await syncLegacyTermAssignments(legacy.entryId, dryRun);

      mergeSyncStats(report, "revisions", revisionStats);
      mergeSyncStats(report, "previewTokens", previewTokenStats);
      mergeSyncStats(report, "termAssignments", termAssignmentStats);

      if (!dryRun && shadowRead) {
        const [postRow] = await db
          .select({
            slug: posts.slug,
            title: posts.title,
            status: posts.status,
            tags: posts.tags,
            seo: posts.seo,
            publishedAt: posts.publishedAt,
            scheduledAt: posts.scheduledAt,
          })
          .from(posts)
          .where(eq(posts.id, legacy.entryId));

        if (!postRow) {
          recordBackfillMismatch(report, {
            legacyEntryId: legacy.entryId,
            code: "missing_post_after_upsert",
            message: "Post row is missing after backfill upsert.",
          });
          continue;
        }

        const postTags = toStringArray(postRow.tags);
        const fieldsMatch =
          postRow.slug === legacy.slug &&
          postRow.title === legacy.title &&
          postRow.status === legacy.status &&
          compareStringArrays(postTags, legacyTags) &&
          toIso(postRow.publishedAt) === toIso(legacy.publishedAt) &&
          toIso(postRow.scheduledAt) === toIso(legacy.scheduledAt);

        if (!fieldsMatch) {
          recordBackfillMismatch(report, {
            legacyEntryId: legacy.entryId,
            code: "field_parity_mismatch",
            message: "Post fields differ from legacy entry after backfill.",
          });
        }

        const seoRecord = isRecord(postRow.seo) ? postRow.seo : {};
        if (
          trimOptional(seoRecord.description) !== legacy.seoDescription ||
          trimOptional(seoRecord.title) !== legacy.seoTitle
        ) {
          recordBackfillMismatch(report, {
            legacyEntryId: legacy.entryId,
            code: "seo_parity_mismatch",
            message: "SEO payload differs from legacy entry SEO document.",
          });
        }

        const [postRevisionCount, postPreviewTokenCount, postTermAssignmentCount] =
          await Promise.all([
            countRows("revisions", legacy.entryId),
            countRows("preview_tokens", legacy.entryId),
            countRows("term_assignments", legacy.entryId),
          ]);

        if (postRevisionCount < revisionStats.legacy) {
          recordBackfillMismatch(report, {
            legacyEntryId: legacy.entryId,
            code: "revision_count_mismatch",
            message: `Expected at least ${revisionStats.legacy} revisions, got ${postRevisionCount}.`,
          });
        }

        if (postPreviewTokenCount < previewTokenStats.legacy) {
          recordBackfillMismatch(report, {
            legacyEntryId: legacy.entryId,
            code: "preview_token_count_mismatch",
            message: `Expected at least ${previewTokenStats.legacy} preview tokens, got ${postPreviewTokenCount}.`,
          });
        }

        if (postTermAssignmentCount < termAssignmentStats.legacy) {
          recordBackfillMismatch(report, {
            legacyEntryId: legacy.entryId,
            code: "term_assignment_count_mismatch",
            message: `Expected at least ${termAssignmentStats.legacy} term assignments, got ${postTermAssignmentCount}.`,
          });
        }
      }
    } catch (error) {
      markPostFailed(report, {
        legacyEntryId: legacy.entryId,
        error: error instanceof Error ? error.message : "posts_backfill_failed",
      });
    }
  }

  return finalizePostsBackfillReport(report);
}
