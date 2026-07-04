import React from "react";
import { afterEach, expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearReviewsCache, type ReviewRecord } from "../../../core/admin/services/reviewsClient";
import { ReviewsModerationPage } from "../../../core/admin/ui/reviews/ReviewsModerationPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

let originalLocal: unknown;
let localOverridden = false;

const buildReview = (record: Partial<ReviewRecord>, index: number): ReviewRecord => ({
  id: `r${index}`,
  entityType: "service",
  entityId: "svc-1",
  status: "pending",
  rating: 5,
  title: null,
  body: "Body text",
  authorName: "Alice",
  authorEmail: "a@x.com",
  metadata: {},
  moderatedBy: null,
  moderatedAt: null,
  createdAt: "2026-02-19T00:00:00.000Z",
  updatedAt: "2026-02-19T00:00:00.000Z",
  publishedAt: null,
  ...record,
});

function seedReviews(records: Partial<ReviewRecord>[]) {
  const storage = createLocalStorage();
  originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  localOverridden = true;
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  storage.setItem(
    cacheKeys.reviewsList,
    JSON.stringify({
      value: records.map((record, index) => buildReview(record, index)),
      savedAt: Date.now(),
    })
  );
}

afterEach(() => {
  // reset the module-level reviews cache so tests stay order-independent
  clearReviewsCache();
  if (localOverridden) {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    localOverridden = false;
    originalLocal = undefined;
  }
});

test("stat row shows a derived average rating + real counts (no fabricated numbers)", () => {
  seedReviews([
    { rating: 5, status: "approved" },
    { rating: 3, status: "pending" },
  ]);
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });

  expect(html).toContain("Average rating");
  expect(html).toContain("4.0"); // (5 + 3) / 2 derived from real items
  // Guard against the prototype's fabricated stat content. ("4.6" itself is too
  // brittle to assert on — the lucide Star icon's SVG path data contains "4.679";
  // the prototype's unique fabricated strings are the reliable signal.)
  expect(html).not.toContain("across 218 reviews");
  expect(html).not.toContain("This week");
  expect(html).not.toContain("+9.2%"); // no fake trend delta
});

test("status tabs keep all four statuses plus 'all' with live counts", () => {
  seedReviews([
    { status: "pending" },
    { status: "approved" },
    { status: "rejected" },
    { status: "spam" },
  ]);
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });

  for (const label of ["All", "Pending", "Approved", "Rejected", "Spam"]) {
    expect(html).toContain(label);
  }
  // live counts wired through the real counts map (four-status model, prototype had
  // only three). Strip SSR comment markers React inserts between adjacent text nodes.
  const stripped = html.replace(/<!-- -->/g, "");
  expect(stripped).toContain("All (4)");
  expect(stripped).toContain("Spam (1)");
});

test("review cards render author, body precedence, and status per record", () => {
  seedReviews([
    {
      authorName: "Bob",
      title: "Loved it",
      body: "ignored when title set",
      status: "pending",
    },
  ]);
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });

  expect(html).toContain("Bob");
  expect(html).toContain("Loved it"); // title wins over body
  expect(html).not.toContain("ignored when title set");
});

test("renders empty/loading state without crashing when cache is absent", () => {
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });

  expect(html).toContain("Reviews");
  expect(html).toContain("Loading reviews");
});
