// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import type { ContentTypeCollectionWorkspaceSummary } from "../../../core/admin/services/contentTypesClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

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
  linkedSecondary: { pages: [], adminScreens: [] },
  unresolved: [],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
} satisfies ContentTypeCollectionWorkspaceSummary;

const wsState = vi.hoisted(() => ({
  cachedSummary: null as ContentTypeCollectionWorkspaceSummary | null,
  remoteSummary: null as ContentTypeCollectionWorkspaceSummary | null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypeCollectionWorkspace: (id: string) =>
    wsState.cachedSummary?.contentType.id === id ? wsState.cachedSummary : null,
  getContentTypeCollectionWorkspaceCached: vi.fn(async (id: string) => {
    if (wsState.remoteSummary?.contentType.id === id) return wsState.remoteSummary;
    throw new Error("not_found");
  }),
}));

vi.mock("@/services/detailPagesClient", () => ({
  createDetailPage: vi.fn(),
  deleteDetailPage: vi.fn(),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(),
  updateSiteSettings: vi.fn(),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { CollectionWorkspacePage } =
  await import("../../../core/admin/ui/content-types/CollectionWorkspacePage");

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
  });
};

const mount = (path: string) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CollectionWorkspacePage />
      </AdminRouterProvider>
    );
  });
  return {
    host,
    cleanup: () => {
      React.act(() => root.unmount());
      host.remove();
    },
  };
};

beforeEach(() => {
  wsState.cachedSummary = null;
  wsState.remoteSummary = null;
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

test("collection workspace renders the three tabs + refresh", () => {
  const html = renderAdminUi(<CollectionWorkspacePage />, {
    path: "/admin/advanced/engine/sample/collection",
  });
  for (const label of ["Entries", "Detail template", "Settings"]) {
    expect(html).toContain(label);
  }
  expect(html).toContain("Refresh");
});

test("collection workspace entries tab keeps overview + canonical-routed detail-template link", async () => {
  wsState.cachedSummary = workspaceSummary;
  wsState.remoteSummary = workspaceSummary;
  const view = mount("/admin/advanced/engine/ct-products/collection");
  try {
    await flush();

    // Overview content survives under the entries tab.
    expect(view.host.textContent).toContain("Canonical resources");
    expect(view.host.textContent).toContain("Product Grid");
    expect(view.host.textContent).toContain("Ready");

    // "Edit detail template" link resolves through AdminLink to the admin-prefixed canonical route.
    const editLink = Array.from(view.host.querySelectorAll("a")).find((anchor) =>
      anchor.textContent?.includes("Edit detail template")
    );
    expect(editLink).toBeTruthy();
    expect(editLink?.getAttribute("href")).toBe(
      "/admin/advanced/engine/ct-products/collection/detail-template/detail-products"
    );
  } finally {
    view.cleanup();
  }
});

test("collection workspace settings tab surfaces the readiness checklist", async () => {
  wsState.cachedSummary = workspaceSummary;
  wsState.remoteSummary = workspaceSummary;
  const view = mount("/admin/advanced/engine/ct-products/collection");
  try {
    await flush();
    expect(view.host.textContent).not.toContain("Readiness");

    const settingsTab = Array.from(view.host.querySelectorAll("button")).find(
      (button) => button.textContent === "Settings"
    );
    expect(settingsTab).toBeTruthy();
    React.act(() => {
      settingsTab?.focus();
      settingsTab?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      settingsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.host.textContent).toContain("Readiness");
  } finally {
    view.cleanup();
  }
});
