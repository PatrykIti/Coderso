import type { ReviewStatus } from "./reviewTypes";
import { reviewStatuses } from "./reviewTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const entityTypePattern = /^[a-z0-9_-]{2,64}$/;

export const normalizeReviewStatus = (
  value: unknown,
  fallback: ReviewStatus = "pending"
): ReviewStatus => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error("review_status_invalid");
  const normalized = value.trim().toLowerCase();
  if ((reviewStatuses as readonly string[]).includes(normalized)) {
    return normalized as ReviewStatus;
  }
  throw new Error("review_status_invalid");
};

export const normalizeReviewEntityType = (value: unknown) => {
  if (typeof value !== "string") throw new Error("review_entity_type_invalid");
  const normalized = value.trim().toLowerCase();
  if (!entityTypePattern.test(normalized)) {
    throw new Error("review_entity_type_invalid");
  }
  return normalized;
};

export const normalizeReviewEntityId = (value: unknown) => {
  if (typeof value !== "string") throw new Error("review_entity_id_invalid");
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) throw new Error("review_entity_id_invalid");
  return normalized;
};

export const normalizeReviewRating = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("review_rating_invalid");
  const normalized = Math.floor(parsed);
  if (normalized < 1 || normalized > 5) throw new Error("review_rating_invalid");
  return normalized;
};

export const normalizeReviewAuthorName = (value: unknown) => {
  if (typeof value !== "string") throw new Error("review_author_name_invalid");
  const normalized = value.trim();
  if (!normalized || normalized.length > 160) throw new Error("review_author_name_invalid");
  return normalized;
};

export const normalizeReviewOptionalText = (value: unknown, maxLength: number) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("review_text_invalid");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("review_text_invalid");
  return normalized;
};

export const normalizeReviewMetadata = (value: unknown) => {
  if (value === undefined || value === null) return {} as Record<string, unknown>;
  if (!isRecord(value)) throw new Error("review_metadata_invalid");
  return value;
};
