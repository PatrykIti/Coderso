// @vitest-environment happy-dom

// TASK-479-16-L02 / L04: locks the Listing query EDITOR restyle (PageHeader with
// the real Back / Discard / Save-query actions — no Publish — plus the rounded-2xl
// editor frame: left Data/Filters rail, result-preview canvas, right inspector)
// while proving the query model + preview wiring is presentation-only. Dirty state
// is observed on the DISCARD button (Save query is always enabled and cannot prove
// dirty).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListingPreviewResult } from "../../../core/admin/services/listingsClient";

const previewState = vi.hoisted(() => ({
  result: {
    source: "entries",
    total: 0,
    limit: 12,
    offset: 0,
    rows: [],
  } as ListingPreviewResult,
}));

const stubPreview = (result: ListingPreviewResult) => {
  previewState.result = result;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/listingsClient", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/listingsClient");
  return {
    ...actual,
    previewListingQuery: vi.fn(async () => previewState.result),
    createListingQuery: vi.fn(async () => ({
      id: "created-id",
      name: "Created",
      description: null,
      query: previewState.result,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    })),
    updateListingQuery: vi.fn(async () => ({
      id: "created-id",
      name: "Created",
      description: null,
      query: previewState.result,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    })),
    getCachedListingTemplates: () => [],
    listListingTemplatesCached: vi.fn(async () => []),
    getCachedListingQueries: () => [],
    listListingQueriesCached: vi.fn(async () => []),
  };
});

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => [],
  listContentTypesCached: vi.fn(async () => []),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
  broadcastCacheEvent: () => undefined,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ListingEditorPage } from "../../../core/admin/ui/listings/ListingEditorPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const mount = (node: React.ReactNode, path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const click = (el: Element | null | undefined) =>
  React.act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

const findButton = (container: HTMLElement, re: RegExp) =>
  Array.from(container.querySelectorAll("button")).find(
    (b) => re.test(b.textContent || "") || re.test(b.getAttribute("aria-label") || "")
  );

beforeEach(() => {
  previewState.result = { source: "entries", total: 0, limit: 12, offset: 0, rows: [] };
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("Listing editor restyle", () => {
  it("renders the editor frame: left rail, canvas, inspector", async () => {
    const view = mount(<ListingEditorPage />, "/admin/advanced/listings/new");
    try {
      await flush();
      expect(view.container.textContent).toMatch(/source/i); // left rail "Source"
      expect(view.container.textContent).toMatch(/filters/i);
      const runPreview = findButton(view.container, /run preview/i);
      expect(runPreview).toBeTruthy();
      expect(runPreview?.closest("[class*='rounded-2xl']")).toBeTruthy(); // editor frame
      // No Publish action exists; Save query is the primary.
      expect(findButton(view.container, /publish/i)).toBeFalsy();
      expect(findButton(view.container, /save query/i)).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  it("a model edit marks dirty — proven via the DISCARD button (Save is always enabled)", async () => {
    const view = mount(<ListingEditorPage />, "/admin/advanced/listings/new");
    try {
      await flush();
      const discard = findButton(view.container, /discard/i);
      expect(discard?.hasAttribute("disabled")).toBe(true); // not dirty yet
      await click(findButton(view.container, /add filter/i));
      expect(discard?.hasAttribute("disabled")).toBe(false); // dirty now
      // Save query stays enabled regardless (disabled={isSaving}); it cannot prove dirty.
      expect(findButton(view.container, /save query/i)?.hasAttribute("disabled")).toBe(false);
    } finally {
      view.cleanup();
    }
  });

  it("Run preview calls previewListingQuery and renders the bound-query canvas", async () => {
    stubPreview({
      source: "entries",
      total: 1,
      limit: 12,
      offset: 0,
      rows: [{ id: "1", title: "A" }],
    });
    const view = mount(<ListingEditorPage />, "/admin/advanced/listings/new");
    try {
      await flush();
      await React.act(async () => {
        findButton(view.container, /run preview/i)?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });
      await flush();
      expect(view.container.textContent).toMatch(/bound query/i);
      expect(view.container.textContent).toContain("1 results");
    } finally {
      view.cleanup();
    }
  });
});
