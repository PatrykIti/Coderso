import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { reviews } from "../../db/schema";
import type { Review, ReviewStatus } from "./reviewTypes";
import {
  normalizeReviewAuthorName,
  normalizeReviewEntityId,
  normalizeReviewEntityType,
  normalizeReviewMetadata,
  normalizeReviewOptionalText,
  normalizeReviewRating,
  normalizeReviewStatus,
} from "./reviewValidation";

type ReviewRow = typeof reviews.$inferSelect;

export type ReviewCreateInput = {
  entityType: unknown;
  entityId: unknown;
  status?: unknown;
  rating: unknown;
  title?: unknown;
  body?: unknown;
  authorName: unknown;
  authorEmail?: unknown;
  metadata?: unknown;
};

export type ReviewUpdateInput = Partial<{
  rating: unknown;
  title: unknown;
  body: unknown;
  authorName: unknown;
  authorEmail: unknown;
  metadata: unknown;
}>;

export type ListReviewsInput = {
  entityType?: string;
  entityId?: string;
  status?: ReviewStatus;
  limit?: number;
  offset?: number;
};

const toIso = (value: Date | null) => (value ? value.toISOString() : null);

const parseLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  const normalized = Math.floor(value as number);
  if (normalized < 1) return 1;
  if (normalized > 200) return 200;
  return normalized;
};

const parseOffset = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.floor(value as number);
  return normalized < 0 ? 0 : normalized;
};

const mapReview = (row: ReviewRow): Review => ({
  id: row.id,
  entityType: row.entityType,
  entityId: row.entityId,
  status: normalizeReviewStatus(row.status),
  rating: row.rating,
  title: row.title ?? null,
  body: row.body ?? null,
  authorName: row.authorName,
  authorEmail: row.authorEmail ?? null,
  metadata: normalizeReviewMetadata(row.metadata),
  moderatedBy: row.moderatedBy ?? null,
  moderatedAt: toIso(row.moderatedAt),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  publishedAt: toIso(row.publishedAt),
});

export async function listReviews(input: ListReviewsInput = {}) {
  const conditions = [];
  if (input.entityType) {
    conditions.push(eq(reviews.entityType, normalizeReviewEntityType(input.entityType)));
  }
  if (input.entityId) {
    conditions.push(eq(reviews.entityId, normalizeReviewEntityId(input.entityId)));
  }
  if (input.status) {
    conditions.push(eq(reviews.status, normalizeReviewStatus(input.status, "pending")));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(reviews)
    .where(where)
    .orderBy(desc(reviews.createdAt))
    .limit(parseLimit(input.limit))
    .offset(parseOffset(input.offset));

  return rows.map(mapReview);
}

export async function getReview(reviewId: string) {
  const [row] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  return row ? mapReview(row) : null;
}

export async function createReview(input: ReviewCreateInput) {
  const entityType = normalizeReviewEntityType(input.entityType);
  const entityId = normalizeReviewEntityId(input.entityId);
  const status = normalizeReviewStatus(input.status, "pending");
  const rating = normalizeReviewRating(input.rating);
  const title = normalizeReviewOptionalText(input.title, 240);
  const body = normalizeReviewOptionalText(input.body, 10000);
  const authorName = normalizeReviewAuthorName(input.authorName);
  const authorEmail = normalizeReviewOptionalText(input.authorEmail, 320);
  const metadata = normalizeReviewMetadata(input.metadata);
  const now = new Date();

  const [row] = await db
    .insert(reviews)
    .values({
      entityType,
      entityId,
      status,
      rating,
      title,
      body,
      authorName,
      authorEmail,
      metadata,
      publishedAt: status === "approved" ? now : null,
      moderatedAt: status === "approved" ? now : null,
      updatedAt: now,
    })
    .returning();

  return row ? mapReview(row) : null;
}

export async function updateReview(reviewId: string, input: ReviewUpdateInput) {
  const [existing] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!existing) return null;

  const rating =
    input.rating === undefined ? existing.rating : normalizeReviewRating(input.rating);
  const title =
    input.title === undefined
      ? existing.title
      : normalizeReviewOptionalText(input.title, 240);
  const body =
    input.body === undefined
      ? existing.body
      : normalizeReviewOptionalText(input.body, 10000);
  const authorName =
    input.authorName === undefined
      ? existing.authorName
      : normalizeReviewAuthorName(input.authorName);
  const authorEmail =
    input.authorEmail === undefined
      ? existing.authorEmail
      : normalizeReviewOptionalText(input.authorEmail, 320);
  const metadata =
    input.metadata === undefined
      ? normalizeReviewMetadata(existing.metadata)
      : normalizeReviewMetadata(input.metadata);

  const [row] = await db
    .update(reviews)
    .set({
      rating,
      title,
      body,
      authorName,
      authorEmail,
      metadata,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  return row ? mapReview(row) : null;
}

export async function moderateReviewStatus(
  reviewId: string,
  status: ReviewStatus,
  options?: { moderatedBy?: string | null }
) {
  const normalizedStatus = normalizeReviewStatus(status, "pending");
  const now = new Date();
  const [row] = await db
    .update(reviews)
    .set({
      status: normalizedStatus,
      moderatedBy: options?.moderatedBy ?? null,
      moderatedAt: now,
      publishedAt: normalizedStatus === "approved" ? now : null,
      updatedAt: now,
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  return row ? mapReview(row) : null;
}

export async function deleteReview(reviewId: string) {
  const [row] = await db.delete(reviews).where(eq(reviews.id, reviewId)).returning();
  return row ? mapReview(row) : null;
}
