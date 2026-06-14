// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import type { DetailPageRecord } from "../../../core/admin/services/detailPagesClient";
import type { ContentTypeCollectionWorkspaceSummary } from "../../../core/admin/services/contentTypesClient";
import type { SiteSettingsResponse } from "../../../core/admin/services/siteSettingsClient";
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

const workspaceSummaryWithoutDetailTemplate = {
  ...workspaceSummary,
  canonical: {
    ...workspaceSummary.canonical,
    contentRoute: null,
    detailPage: null,
  },
  unresolved: [
    { resource: "contentRoute", reason: "missing_content_route" },
    { resource: "detailPage", reason: "explicit_link_missing" },
  ],
  candidates: {
    ...workspaceSummary.candidates,
    detailPages: [],
  },
} satisfies ContentTypeCollectionWorkspaceSummary;

const workspaceSummaryWithoutCanonicalResources = {
  ...workspaceSummary,
  canonical: {
    ...workspaceSummary.canonical,
    listPage: null,
    listingQuery: null,
    listingTemplate: null,
    adminScreen: null,
  },
  unresolved: [
    { resource: "listPage", reason: "explicit_link_missing" },
    { resource: "listingQuery", reason: "explicit_link_missing" },
    { resource: "listingTemplate", reason: "explicit_link_missing" },
    { resource: "adminScreen", reason: "explicit_link_missing" },
  ],
} satisfies ContentTypeCollectionWorkspaceSummary;

const collectionWorkspaceState = vi.hoisted(() => {
  const defaultSiteSettings = (): SiteSettingsResponse => ({
    adminBaseUrl: null,
    publicBaseUrl: null,
    adminPath: "/admin",
    adminRedirectEnabled: false,
    homepageId: null,
    notFoundPageId: null,
    navigationMenuId: null,
    footerTemplateId: null,
    previewEnabled: true,
    cacheTtlSeconds: 30,
    contentRoutes: [
      {
        type: "products",
        listPath: "/products",
        detailPath: "/products/:slug",
        enabled: true,
        detailPageId: "detail-products",
      },
    ],
  });
  const state = {
    cachedSummary: null as ContentTypeCollectionWorkspaceSummary | null,
    remoteSummary: null as ContentTypeCollectionWorkspaceSummary | null,
    remoteError: null as unknown,
    cacheListener: null as ((event: CacheEvent) => void) | null,
    siteSettings: defaultSiteSettings(),
    createdDetailPage: null as DetailPageRecord | null,
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
    createDetailPage: vi.fn(async (document: DetailPageDocument) => {
      const now = "2026-05-12T08:00:00.000Z";
      const created: DetailPageRecord = {
        id: document.id,
        contentTypeId: document.contentTypeId,
        contentTypeSlug: document.contentTypeSlug,
        name: document.name,
        status: document.status,
        currentDocument: document,
        publishedDocument: null,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        authorId: null,
      };
      state.createdDetailPage = created;
      return created;
    }),
    deleteDetailPage: vi.fn(async () => ({ ok: true })),
    getSiteSettings: vi.fn(async () => state.siteSettings),
    updateSiteSettings: vi.fn(async (update: Partial<SiteSettingsResponse>) => {
      state.siteSettings = {
        ...state.siteSettings,
        ...update,
      };
      return state.siteSettings;
    }),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    triggerCacheEvent(key: string) {
      state.cacheListener?.({ key, action: "update" });
    },
    reset() {
      state.cachedSummary = null;
      state.remoteSummary = null;
      state.remoteError = null;
      state.cacheListener = null;
      state.siteSettings = defaultSiteSettings();
      state.createdDetailPage = null;
      state.getCachedContentTypeCollectionWorkspace.mockClear();
      state.getContentTypeCollectionWorkspaceCached.mockClear();
      state.subscribeCacheEvents.mockClear();
      state.createDetailPage.mockClear();
      state.deleteDetailPage.mockClear();
      state.getSiteSettings.mockClear();
      state.updateSiteSettings.mockClear();
      state.toastSuccess.mockClear();
      state.toastError.mockClear();
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

vi.mock("@/services/detailPagesClient", () => ({
  createDetailPage: collectionWorkspaceState.createDetailPage,
  deleteDetailPage: collectionWorkspaceState.deleteDetailPage,
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: collectionWorkspaceState.getSiteSettings,
  updateSiteSettings: collectionWorkspaceState.updateSiteSettings,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: collectionWorkspaceState.subscribeCacheEvents,
}));

vi.mock("sonner", () => ({
  toast: {
    success: collectionWorkspaceState.toastSuccess,
    error: collectionWorkspaceState.toastError,
  },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    activeHref,
    breadcrumbs,
    children,
  }: {
    activeHref?: string;
    breadcrumbs?: React.ReactNode | Array<string | { label: string; href?: string | null }>;
    children: React.ReactNode;
  }) => (
    <div data-active-href={activeHref}>
      <div>
        {Array.isArray(breadcrumbs)
          ? breadcrumbs.map((item) => {
              const label = typeof item === "string" ? item : item.label;
              return <span key={label}>{label}</span>;
            })
          : breadcrumbs}
      </div>
      {children}
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div role="dialog">
        <p>{title}</p>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
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
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
  });
};

const clickButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const getLinkByText = (container: HTMLElement, label: string) => {
  const link = Array.from(container.querySelectorAll("a")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  expect(link).toBeTruthy();
  return link as HTMLAnchorElement;
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
    expect(getLinkByText(view.container, "Edit page").getAttribute("href")).toBe(
      "/admin/pages/page-products"
    );
    expect(getLinkByText(view.container, "Edit query").getAttribute("href")).toBe(
      "/admin/advanced/listings/query-products"
    );
    expect(getLinkByText(view.container, "Open templates").getAttribute("href")).toBe(
      "/admin/advanced/listings?tab=templates"
    );
    expect(getLinkByText(view.container, "Edit screen").getAttribute("href")).toBe(
      "/admin/advanced/custom-screens/screen-products"
    );
  } finally {
    view.cleanup();
  }
});

test("collection workspace links missing canonical resources to owner surfaces", async () => {
  collectionWorkspaceState.cachedSummary = workspaceSummaryWithoutCanonicalResources;
  collectionWorkspaceState.remoteSummary = workspaceSummaryWithoutCanonicalResources;
  const view = mount("/admin/advanced/engine/ct-products/collection");

  try {
    await flush();

    expect(getLinkByText(view.container, "Open Pages").getAttribute("href")).toBe("/admin/pages");
    expect(getLinkByText(view.container, "Create query").getAttribute("href")).toBe(
      "/admin/advanced/listings/new?contentTypeId=ct-products"
    );
    expect(getLinkByText(view.container, "Open templates").getAttribute("href")).toBe(
      "/admin/advanced/listings?tab=templates"
    );
    expect(getLinkByText(view.container, "Open Screens").getAttribute("href")).toBe(
      "/admin/advanced/custom-screens"
    );
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

test("collection workspace creates and route-links a missing detail template", async () => {
  collectionWorkspaceState.cachedSummary = workspaceSummaryWithoutDetailTemplate;
  collectionWorkspaceState.remoteSummary = workspaceSummaryWithoutDetailTemplate;
  collectionWorkspaceState.siteSettings = {
    ...collectionWorkspaceState.siteSettings,
    contentRoutes: [],
  };
  const view = mount("/admin/advanced/engine/ct-products/collection");

  try {
    await flush();
    expect(view.container.textContent).toContain("Create detail template");

    clickButton(view.container, "Create detail template");
    await flush();

    expect(collectionWorkspaceState.createDetailPage).toHaveBeenCalledTimes(1);
    const createdDocument = collectionWorkspaceState.createDetailPage.mock.calls[0]?.[0];
    expect(createdDocument).toMatchObject({
      name: "Products detail template",
      contentTypeId: "ct-products",
      contentTypeSlug: "products",
      status: "draft",
      titlePattern: "{title}",
      blocks: [],
      bindings: [],
    });
    expect(collectionWorkspaceState.updateSiteSettings).toHaveBeenCalledWith({
      contentRoutes: [
        {
          type: "products",
          listPath: "/products",
          detailPath: "/products/:slug",
          enabled: true,
          detailPageId: createdDocument?.id,
        },
      ],
    });
    expect(collectionWorkspaceState.toastSuccess).toHaveBeenCalledWith(
      'Detail template "Products detail template" created.'
    );
  } finally {
    view.cleanup();
  }
});

test("collection workspace unlinks a route before deleting its detail template", async () => {
  collectionWorkspaceState.cachedSummary = workspaceSummary;
  collectionWorkspaceState.remoteSummary = workspaceSummary;
  const view = mount("/admin/advanced/engine/ct-products/collection");

  try {
    await flush();
    clickButton(view.container, "Delete");
    expect(view.container.textContent).toContain("Delete detail template?");

    clickButton(view.container, "Delete detail template");
    await flush();

    expect(collectionWorkspaceState.updateSiteSettings).toHaveBeenCalledWith({
      contentRoutes: [
        {
          type: "products",
          listPath: "/products",
          detailPath: "/products/:slug",
          enabled: true,
          detailPageId: null,
        },
      ],
    });
    expect(collectionWorkspaceState.deleteDetailPage).toHaveBeenCalledWith("detail-products", {
      contentTypeId: "ct-products",
    });
    expect(collectionWorkspaceState.toastSuccess).toHaveBeenCalledWith(
      'Detail template "Product Detail" deleted.'
    );
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
