// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import type { ContentTypeCollectionWorkspaceSummary } from "../../../core/admin/services/contentTypesClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

type CacheEvent = {
  key: string;
  action: "invalidate" | "update";
};

const workspaceSummary = {
  contentType: {
    id: "ct-products",
    name: "Products",
    slug: "products",
    status: "published",
    fieldCount: 3,
    updatedAt: "2026-05-10T08:00:00.000Z",
  },
  canonical: {
    contentRoute: {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: "detail-products",
    },
    detailPage: {
      id: "detail-products",
      label: "Product Detail",
      status: "published",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listPage: {
      id: "page-products",
      label: "Products",
      slug: "products",
      status: "published",
      role: "canonical-list-page",
      compositionKey: "products",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listingQuery: {
      id: "query-products",
      label: "Products Query",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listingTemplate: {
      id: "template-products",
      label: "Product Grid",
      slug: "product-grid",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    adminScreen: {
      id: "screen-products",
      label: "Products Admin",
      status: "active",
      role: "canonical-admin-screen",
      compositionKey: "products",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
  },
  linkedSecondary: {
    pages: [],
    adminScreens: [],
  },
  unresolved: [],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
} satisfies ContentTypeCollectionWorkspaceSummary;

const collectionWorkspaceState = vi.hoisted(() => {
  const state = {
    cachedSummary: null as ContentTypeCollectionWorkspaceSummary | null,
    remoteSummary: null as ContentTypeCollectionWorkspaceSummary | null,
    remoteError: null as unknown,
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedContentTypeCollectionWorkspace: vi.fn((id: string) =>
      state.cachedSummary?.contentType.id === id ? state.cachedSummary : null
    ),
    getContentTypeCollectionWorkspaceCached: vi.fn(async (id: string) => {
      if (state.remoteError) throw state.remoteError;
      if (state.remoteSummary?.contentType.id === id) return state.remoteSummary;
      throw new Error("not_found");
    }),
    subscribeCacheEvents: vi.fn((listener: (event: CacheEvent) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) {
          state.cacheListener = null;
        }
      };
    }),
    triggerCacheEvent(key: string) {
      state.cacheListener?.({ key, action: "update" });
    },
    reset() {
      state.cachedSummary = null;
      state.remoteSummary = null;
      state.remoteError = null;
      state.cacheListener = null;
      state.getCachedContentTypeCollectionWorkspace.mockClear();
      state.getContentTypeCollectionWorkspaceCached.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };
  return state;
});

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypeCollectionWorkspace:
    collectionWorkspaceState.getCachedContentTypeCollectionWorkspace,
  getContentTypeCollectionWorkspaceCached:
    collectionWorkspaceState.getContentTypeCollectionWorkspaceCached,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: collectionWorkspaceState.subscribeCacheEvents,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    activeHref,
    breadcrumbs,
    children,
  }: {
    activeHref?: string;
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      {children}
    </div>
  ),
}));

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CollectionWorkspacePage } from "../../../core/admin/ui/content-types/CollectionWorkspacePage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  collectionWorkspaceState.reset();
});

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CollectionWorkspacePage />
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("collection workspace renders cached summary and refreshes route data", async () => {
  collectionWorkspaceState.cachedSummary = workspaceSummary;
  collectionWorkspaceState.remoteSummary = workspaceSummary;
  const view = mount("/admin/advanced/engine/ct-products/collection");

  try {
    expect(view.container.textContent).toContain("Products");
    expect(view.container.textContent).toContain("Product Grid");
    await flush();

    expect(
      view.container.querySelector("[data-active-href]")?.getAttribute("data-active-href")
    ).toBe("/admin/advanced/engine");
    expect(collectionWorkspaceState.getContentTypeCollectionWorkspaceCached).toHaveBeenCalledWith(
      "ct-products",
      { force: true }
    );
    expect(view.container.textContent).toContain("Ready");
  } finally {
    view.cleanup();
  }
});

test("collection workspace keeps cache bus pending state in the page shell", async () => {
  collectionWorkspaceState.cachedSummary = workspaceSummary;
  collectionWorkspaceState.remoteSummary = workspaceSummary;
  const view = mount("/admin/advanced/engine/ct-products/collection");

  try {
    await flush();
    React.act(() => {
      collectionWorkspaceState.triggerCacheEvent(
        cacheKeys.contentTypeCollectionWorkspace("ct-products")
      );
    });

    expect(view.container.textContent).toContain("Workspace changed");
    expect(view.container.textContent).toContain("New collection links are available.");
  } finally {
    view.cleanup();
  }
});

test("collection workspace reports API errors without losing the route shell", async () => {
  collectionWorkspaceState.remoteError = {
    kind: "api",
    message: "content_type_not_found",
  };
  const view = mount("/admin/advanced/engine/ct-missing/collection");

  try {
    await flush();
    expect(view.container.textContent).toContain("Unable to load collection workspace");
    expect(view.container.textContent).toContain("content_type_not_found");
  } finally {
    view.cleanup();
  }
});
