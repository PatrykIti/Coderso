import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
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

test("ReviewsModerationPage renders shell and loading state", () => {
  const html = renderAdminUi(<ReviewsModerationPage />, {
    path: "/admin/coderso/reviews",
  });

  expect(html).toContain("Reviews");
  expect(html).toContain("Review details");
  expect(html).toContain("Loading reviews");
});

test("ReviewsModerationPage renders cached reviews", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.reviewsList,
      JSON.stringify({
        value: [
          {
            id: "review-1",
            entityType: "service",
            entityId: "svc-1",
            status: "pending",
            rating: 5,
            title: "Great service",
            body: "Fast and professional",
            authorName: "Alice",
            authorEmail: "alice@example.com",
            metadata: {},
            moderatedBy: null,
            moderatedAt: null,
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
            publishedAt: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<ReviewsModerationPage />, {
      path: "/admin/coderso/reviews",
    });

    expect(html).toContain("Alice");
    expect(html).toContain("Great service");
    expect(html).not.toContain("Loading reviews");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
