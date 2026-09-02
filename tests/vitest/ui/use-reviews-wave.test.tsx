// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const reviewsState = vi.hoisted(() => ({
  cached: null as unknown,
  listResult: [] as unknown,
  listeners: [] as Array<(event: { key: string }) => void>,
  getCachedReviews: vi.fn(() => reviewsState.cached),
  listReviewsCached: vi.fn(async ({ force: _force }: { force?: boolean } = {}) => {
    if (reviewsState.listResult === "THROW_NON_ERROR") throw "string failure";
    if (reviewsState.listResult instanceof Error) throw reviewsState.listResult;
    return reviewsState.listResult as never[];
  }),
  updateReviewStatus: vi.fn(async (_id: string, _status: string) => undefined),
  deleteReview: vi.fn(async (_id: string) => undefined),
  broadcastCacheEvent: vi.fn(),
  subscribeCacheEvents: vi.fn((listener: (event: { key: string }) => void) => {
    reviewsState.listeners.push(listener);
    return () => {
      reviewsState.listeners = reviewsState.listeners.filter((entry) => entry !== listener);
    };
  }),
  reset() {
    reviewsState.cached = null;
    reviewsState.listResult = [];
    reviewsState.listeners = [];
    reviewsState.getCachedReviews.mockClear();
    reviewsState.listReviewsCached.mockClear();
    reviewsState.updateReviewStatus.mockClear();
    reviewsState.deleteReview.mockClear();
    reviewsState.broadcastCacheEvent.mockClear();
    reviewsState.subscribeCacheEvents.mockClear();
  },
}));

vi.mock("@/services/reviewsClient", () => ({
  getCachedReviews: reviewsState.getCachedReviews,
  listReviewsCached: reviewsState.listReviewsCached,
  updateReviewStatus: reviewsState.updateReviewStatus,
  deleteReview: reviewsState.deleteReview,
}));

vi.mock("@/utils/cacheBus", () => ({
  broadcastCacheEvent: reviewsState.broadcastCacheEvent,
  subscribeCacheEvents: reviewsState.subscribeCacheEvents,
}));

// cachePolicy is left real: cacheKeys.reviewsList is already "reviews:list", and
// the AdminShell render tree needs cacheTtlMs + createBoundedCacheKeySegment at
// module-eval time, so a partial mock would crash module evaluation.

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ReviewsModerationPage } from "../../../core/admin/ui/reviews/ReviewsModerationPage";
import { useReviews } from "../../../core/admin/ui/reviews/hooks/useReviews";

function Harness({ skip }: { skip?: boolean }) {
  const { items, isLoading, error, refresh } = useReviews({ skip });
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="items">{items.map((item) => item.id).join(",")}</div>
      <div data-testid="error">{error ?? ""}</div>
      <button type="button" onClick={() => void refresh()}>
        refresh
      </button>
    </div>
  );
}

const review = (id: string) => ({
  id,
  entityType: "post",
  entityId: "p1",
  status: "approved",
  rating: 5,
  title: null,
  body: null,
  authorName: "A",
  authorEmail: null,
  metadata: {},
  moderatedBy: null,
  moderatedAt: null,
  createdAt: "",
  updatedAt: "",
});

// Richer fixture for the moderation page: every field the card renders.
const makeReview = (overrides: Record<string, unknown>) => ({
  id: "rev-1",
  entityType: "service",
  entityId: "svc-1",
  status: "pending",
  rating: 5,
  title: null,
  body: null,
  authorName: "Cara",
  authorEmail: null,
  metadata: {},
  moderatedBy: null,
  moderatedAt: null,
  createdAt: "2026-02-19T00:00:00.000Z",
  updatedAt: "2026-02-19T00:00:00.000Z",
  publishedAt: null,
  ...overrides,
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const mountPage = async (reviews: unknown[]) => {
  reviewsState.cached = reviews;
  reviewsState.listResult = reviews;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(
      <AdminRouterProvider initialPath="/admin/advanced/reviews">
        <ReviewsModerationPage />
      </AdminRouterProvider>
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label
  )!;
  React.act(() => {
    button.click();
  });
};

// Radix primitives (tabs, dropdown) react to the full pointer sequence, not
// a bare click — mirror the pointer sequence the browser would dispatch.
const pointerClick = (element: Element | null | undefined) => {
  if (!element) throw new Error("pointer click target missing");
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

// The "Approved"/"Rejected" status tabs contain the action verb as a substring,
// so match buttons that are not tabs by exact text.
const findActionButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll("button")).find(
    (button) => button.getAttribute("role") !== "tab" && button.textContent?.trim() === label
  );

const findMoreActionsButton = (root: ParentNode) =>
  Array.from(root.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === "More review actions"
  );

const typeSearch = (root: ParentNode, value: string) => {
  const input = root.querySelector<HTMLInputElement>('input[aria-label="Search reviews"]');
  if (!input) throw new Error("search input missing");
  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const openMoreActionsMenu = async (root: ParentNode) => {
  pointerClick(findMoreActionsButton(root));
  await flushEffects();
};

const clickMenuItem = (label: string) => {
  const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((entry) =>
    entry.textContent?.includes(label)
  );
  pointerClick(item ?? undefined);
  return item ?? undefined;
};

afterEach(() => {
  reviewsState.reset();
  document.body.innerHTML = "";
});

describe("useReviews", () => {
  it("starts from the cached list then refreshes in the background", async () => {
    reviewsState.cached = [review("cached")];
    reviewsState.listResult = [review("fresh")];
    const view = mount(<Harness />);
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("false");
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("cached");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("fresh");
    view.unmount();
  });

  it("reports the loading state without a cache seed", async () => {
    const view = mount(<Harness />);
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("true");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("false");
    view.unmount();
  });

  it.each([
    [new ApiClientError("forbidden", "denied", 403), "denied"],
    [new Error("boom"), "boom"],
    ["THROW_NON_ERROR", "Failed to load reviews."],
  ])("maps failures %#", async (failure, expected) => {
    reviewsState.listResult = failure;
    const view = mount(<Harness />);
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe(expected);
    view.unmount();
  });

  it("manual refresh clears a resolved error and forwards force=false by default", async () => {
    reviewsState.listResult = new Error("first");
    const view = mount(<Harness />);
    await flushEffects();
    reviewsState.listResult = [review("ok")];
    clickButtonWithText(view.container, "refresh");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe("");
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("ok");
    expect(reviewsState.listReviewsCached).toHaveBeenLastCalledWith({ force: undefined });
    view.unmount();
  });

  it("manual refresh maps a load failure through the refresh catch", async () => {
    reviewsState.cached = [review("seed")];
    reviewsState.listResult = [review("seed")];
    const view = mount(<Harness />);
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe("");
    reviewsState.listResult = new Error("refresh boom");
    clickButtonWithText(view.container, "refresh");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe("refresh boom");
    expect(reviewsState.listReviewsCached).toHaveBeenLastCalledWith({ force: undefined });
    view.unmount();
  });

  it("skip mode neither fetches nor subscribes", async () => {
    const view = mount(<Harness skip />);
    await flushEffects();
    expect(reviewsState.listReviewsCached).not.toHaveBeenCalled();
    expect(reviewsState.subscribeCacheEvents).not.toHaveBeenCalled();
    view.unmount();
  });

  it("responds only to matching cache keys and unsubscribes on unmount", async () => {
    reviewsState.listResult = [review("one")];
    const view = mount(<Harness />);
    await flushEffects();

    reviewsState.listResult = [review("two"), review("three")];
    React.act(() => {
      reviewsState.listeners[0]({ key: "other:key" });
    });
    await flushEffects();
    const calls = reviewsState.listReviewsCached.mock.calls.length;

    React.act(() => {
      reviewsState.listeners[0]({ key: "reviews:list" });
    });
    await flushEffects();
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("two,three");
    expect(reviewsState.listReviewsCached.mock.calls.length).toBe(calls + 1);

    view.unmount();
    expect(reviewsState.listeners.length).toBe(0);
  });
});

describe("ReviewsModerationPage", () => {
  it("filters the list as the search box is typed", async () => {
    const alice = makeReview({ id: "r1", authorName: "Alice", title: "Great service", body: null });
    const bob = makeReview({ id: "r2", authorName: "Bob", title: "Other", body: null });
    const view = await mountPage([alice, bob]);

    expect(view.container.textContent).toContain("Alice");
    expect(view.container.textContent).toContain("Bob");

    typeSearch(view.container, "alice");

    expect(view.container.textContent).toContain("Alice");
    expect(view.container.textContent).not.toContain("Bob");
    view.unmount();
  });

  it("filters by status when a tab is selected", async () => {
    const pending = makeReview({ id: "r1", status: "pending", authorName: "Pend" });
    const approved = makeReview({ id: "r2", status: "approved", authorName: "Yana" });
    const view = await mountPage([pending, approved]);

    expect(view.container.textContent).toContain("Yana");
    const pendingTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find((tab) =>
      tab.textContent?.includes("Pending")
    )!;
    pointerClick(pendingTab);

    expect(view.container.textContent).toContain("Pend");
    expect(view.container.textContent).not.toContain("Yana");
    view.unmount();
  });

  it("reject button sends the rejected status", async () => {
    const review = makeReview({ id: "r1", status: "pending", authorName: "Cara" });
    const view = await mountPage([review]);

    pointerClick(findActionButton(view.container, "Reject"));
    await flushEffects();

    expect(reviewsState.updateReviewStatus).toHaveBeenCalledWith("r1", "rejected");
    view.unmount();
  });

  it("surfaces update-status failures in both error shapes", async () => {
    const pending = makeReview({ id: "r1", status: "pending", authorName: "Cara" });
    const view = await mountPage([pending]);

    reviewsState.updateReviewStatus.mockRejectedValueOnce(
      new ApiClientError("status", "denied", 403)
    );
    pointerClick(findActionButton(view.container, "Approve"));
    await flushEffects();
    expect(view.container.textContent).toContain("Review action failed");
    expect(view.container.textContent).toContain("denied");

    reviewsState.updateReviewStatus.mockRejectedValueOnce(new Error("boom"));
    pointerClick(findActionButton(view.container, "Approve"));
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to update review status.");
    view.unmount();
  });

  it("deletes a review through the overflow menu", async () => {
    const approved = makeReview({ id: "r1", status: "approved", authorName: "Cara" });
    const view = await mountPage([approved]);

    await openMoreActionsMenu(view.container);
    clickMenuItem("Delete");
    await flushEffects();

    expect(reviewsState.deleteReview).toHaveBeenCalledWith("r1");
    view.unmount();
  });

  it("surfaces delete failures in both error shapes", async () => {
    const approved = makeReview({ id: "r1", status: "approved", authorName: "Cara" });
    const view = await mountPage([approved]);

    reviewsState.deleteReview.mockRejectedValueOnce(new ApiClientError("gone", "forbidden", 403));
    await openMoreActionsMenu(view.container);
    clickMenuItem("Delete");
    await flushEffects();
    expect(view.container.textContent).toContain("Review action failed");
    expect(view.container.textContent).toContain("forbidden");

    reviewsState.deleteReview.mockRejectedValueOnce(new Error("boom"));
    await openMoreActionsMenu(view.container);
    clickMenuItem("Delete");
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to delete review.");
    view.unmount();
  });

  it("resets to pending and marks as spam from the overflow menu", async () => {
    const approved = makeReview({ id: "r1", status: "approved", authorName: "Cara" });
    const view = await mountPage([approved]);

    await openMoreActionsMenu(view.container);
    clickMenuItem("Reset to pending");
    await flushEffects();
    expect(reviewsState.updateReviewStatus).toHaveBeenCalledWith("r1", "pending");

    await openMoreActionsMenu(view.container);
    clickMenuItem("Mark as spam");
    await flushEffects();
    expect(reviewsState.updateReviewStatus).toHaveBeenCalledWith("r1", "spam");
    view.unmount();
  });
});
