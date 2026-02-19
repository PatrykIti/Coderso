import { afterAll, beforeEach, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { reviews } from "../../../core/db/schema";
import {
  createReview,
  listReviews,
  moderateReviewStatus,
} from "../../../core/services/reviews/reviewService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(reviews);
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("createReview stores approved review with publishedAt timestamp", async () => {
  const created = await createReview({
    entityType: "product",
    entityId: "product-1",
    status: "approved",
    rating: 5,
    title: "Excellent",
    body: "Very good quality.",
    authorName: "Anna",
    authorEmail: "anna@example.com",
    metadata: { source: "form" },
  });

  expect(created?.status).toBe("approved");
  expect(created?.publishedAt).not.toBeNull();
});

testIfDb("listReviews filters by entity and status", async () => {
  await createReview({
    entityType: "product",
    entityId: "product-1",
    status: "approved",
    rating: 5,
    authorName: "Anna",
  });
  await createReview({
    entityType: "product",
    entityId: "product-1",
    status: "pending",
    rating: 4,
    authorName: "Mark",
  });

  const approved = await listReviews({
    entityType: "product",
    entityId: "product-1",
    status: "approved",
  });

  expect(approved.length).toBe(1);
  expect(approved[0]?.status).toBe("approved");
});

testIfDb("moderateReviewStatus updates moderation lifecycle fields", async () => {
  const created = await createReview({
    entityType: "page",
    entityId: "home",
    status: "pending",
    rating: 4,
    authorName: "Chris",
  });

  const moderated = await moderateReviewStatus(created!.id, "rejected");
  expect(moderated?.status).toBe("rejected");
  expect(moderated?.moderatedAt).not.toBeNull();
  expect(moderated?.publishedAt).toBeNull();
});
