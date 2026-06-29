// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ReviewsModerationPage } from "../../../core/admin/ui/reviews/ReviewsModerationPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// vi.hoisted so the mock factory can reference the seed + spies (mocks hoist above imports).
const { pendingReview, updateSpy, listSpy } = vi.hoisted(() => {
  const pendingReview = {
    id: "rev-1",
    entityType: "service",
    entityId: "svc-1",
    status: "pending",
    rating: 5,
    title: "Great service",
    body: "Body text",
    authorName: "Cara",
    authorEmail: "c@x.com",
    metadata: {},
    moderatedBy: null,
    moderatedAt: null,
    createdAt: "2026-02-19T00:00:00.000Z",
    updatedAt: "2026-02-19T00:00:00.000Z",
    publishedAt: null,
  };
  return {
    pendingReview,
    updateSpy: vi.fn(async () => pendingReview),
    listSpy: vi.fn(async () => [pendingReview]),
  };
});

vi.mock("@/services/reviewsClient", () => ({
  getCachedReviews: () => [pendingReview],
  listReviewsCached: listSpy,
  updateReviewStatus: updateSpy,
  deleteReview: vi.fn(async () => undefined),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

test("Approve button calls updateReviewStatus with the approved status", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await React.act(async () => {
    root.render(
      <AdminRouterProvider initialPath="/admin/advanced/reviews">
        <ReviewsModerationPage />
      </AdminRouterProvider>
    );
    await flush(); // settle mount-time background revalidation
  });

  // Match the Approve action button exactly — note the "Approved (N)" status tab
  // also contains the substring "Approve".
  const approveButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.getAttribute("role") !== "tab" && button.textContent?.trim() === "Approve"
  );
  expect(approveButton).toBeTruthy();

  await React.act(async () => {
    approveButton?.click();
    await flush(); // settle handleModerate -> updateReviewStatus -> refresh
  });

  expect(updateSpy).toHaveBeenCalledWith("rev-1", "approved");

  await React.act(async () => {
    root.unmount();
  });
});
