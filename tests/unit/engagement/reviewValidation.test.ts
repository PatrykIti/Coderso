import { expect, test } from "bun:test";

import {
  normalizeReviewAuthorName,
  normalizeReviewEntityId,
  normalizeReviewEntityType,
  normalizeReviewRating,
  normalizeReviewStatus,
} from "../../../core/services/reviews/reviewValidation";

test("normalizeReviewStatus uses fallback and accepts known values", () => {
  expect(normalizeReviewStatus(undefined, "pending")).toBe("pending");
  expect(normalizeReviewStatus("approved", "pending")).toBe("approved");
});

test("normalizeReviewStatus rejects invalid value", () => {
  expect(() => normalizeReviewStatus("bad", "pending")).toThrow("review_status_invalid");
});

test("normalizeReviewEntityType validates identifier format", () => {
  expect(normalizeReviewEntityType("product")).toBe("product");
  expect(() => normalizeReviewEntityType("Product With Space")).toThrow(
    "review_entity_type_invalid"
  );
});

test("normalizeReviewEntityId validates non-empty values", () => {
  expect(normalizeReviewEntityId("item-1")).toBe("item-1");
  expect(() => normalizeReviewEntityId("")).toThrow("review_entity_id_invalid");
});

test("normalizeReviewRating enforces 1..5 range", () => {
  expect(normalizeReviewRating(5)).toBe(5);
  expect(() => normalizeReviewRating(0)).toThrow("review_rating_invalid");
});

test("normalizeReviewAuthorName requires readable label", () => {
  expect(normalizeReviewAuthorName("Jane Doe")).toBe("Jane Doe");
  expect(() => normalizeReviewAuthorName("")).toThrow("review_author_name_invalid");
});
