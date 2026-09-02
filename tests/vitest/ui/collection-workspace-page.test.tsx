// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  CollectionWorkspaceCandidate,
  CollectionWorkspaceUnresolved,
  ContentTypeCollectionWorkspaceSummary,
} from "../../../core/admin/services/contentTypesClient";
import type { DetailPageRecord } from "../../../core/admin/services/detailPagesClient";
import type { SiteSettingsResponse } from "../../../core/admin/services/siteSettingsClient";
import { buildDefaultDetailTemplateDocument } from "../../../core/admin/ui/content-types/detailTemplateEditorModel";
import { flush } from "./contentListWaveTestUtils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type CacheEvent = { key: string; action: "invalidate" | "update" };

const candidate = (
  overrides: Partial<CollectionWorkspaceCandidate> = {}
): CollectionWorkspaceCandidate => ({
  id: "res-1",
  label: "Product detail",
  status: "published",
  slug: "products",
  role: "primary",
  updatedAt: "2025-01-15T10:00:00Z",
  ...overrides,
});

const makeSummary = (overrides?: {
  detailPage?: CollectionWorkspaceCandidate | null;
  unresolved?: CollectionWorkspaceUnresolved[];
}): ContentTypeCollectionWorkspaceSummary => ({
  contentType: {
    id: "ct-1",
    name: "Products",
    slug: "products",
    status: "published",
    fieldCount: 4,
    updatedAt: "2025-01-15T10:00:00Z",
  },
  canonical: {
    contentRoute: {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
    },
    detailPage:
      overrides?.detailPage === undefined ? candidate({ id: "dp-1" }) : overrides.detailPage,
    listPage: candidate({ id: "lp-1" }),
    listingQuery: null,
    listingTemplate: null,
    adminScreen: null,
  },
  linkedSecondary: { pages: [], adminScreens: [] },
  unresolved: overrides?.unresolved ?? [],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
});

const makeCreatedDetailPage = (): DetailPageRecord => ({
  id: "dp-new",
  contentTypeId: "ct-1",
  contentTypeSlug: "products",
  name: "Products detail template",
  status: "draft",
  currentDocument: buildDefaultDetailTemplateDocument({
    contentTypeId: "ct-1",
    contentTypeSlug: "products",
    contentTypeName: "Products",
  }),
  publishedAt: null,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
});

const wsState = vi.hoisted(() => {
  const makeSiteSettings = (
    contentRoutes: SiteSettingsResponse["contentRoutes"]
  ): SiteSettingsResponse => ({
    adminBaseUrl: null,
    publicBaseUrl: "https://example.test",
    adminPath: "/admin",
    adminRedirectEnabled: true,
    homepageId: null,
    notFoundPageId: null,
    navigationMenuId: null,
    footerTemplateId: null,
    previewEnabled: true,
    cacheTtlSeconds: 300,
    contentRoutes,
  });
  const state = {
    cachedSummary: null as ContentTypeCollectionWorkspaceSummary | null,
    remoteSummaries: [] as ContentTypeCollectionWorkspaceSummary[],
    fetchError: null as unknown,
    pending: false,
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedContentTypeCollectionWorkspace: vi.fn((id: string) =>
      state.cachedSummary?.contentType.id === id ? state.cachedSummary : null
    ),
    getContentTypeCollectionWorkspaceCached: vi.fn(async () => {
      if (state.pending) return new Promise<ContentTypeCollectionWorkspaceSummary>(() => {});
      if (state.fetchError) throw state.fetchError;
      const next = state.remoteSummaries[0];
      if (!next) throw new Error("workspace_not_found");
      state.remoteSummaries = state.remoteSummaries.slice(1);
      return next;
    }),
    subscribeCacheEvents: vi.fn((listener: (event: CacheEvent) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) state.cacheListener = null;
      };
    }),
    createDetailPage: vi.fn(async (): Promise<DetailPageRecord> => {
      throw new Error("create_not_configured");
    }),
    deleteDetailPage: vi.fn(async () => ({ ok: true })),
    makeSiteSettings,
    getSiteSettings: vi.fn(async (): Promise<SiteSettingsResponse> =>
      makeSiteSettings([
        { type: "products", listPath: "/products", detailPath: "/products/:slug", enabled: true },
      ])
    ),
    updateSiteSettings: vi.fn(async (): Promise<SiteSettingsResponse> => makeSiteSettings([])),
  };
  return state;
});

const routerState = vi.hoisted(() => ({
  path: "/admin/advanced/engine/ct-1",
  navigate: vi.fn(),
}));

const tabState = vi.hoisted(() => ({
  onValueChange: null as ((value: string) => void) | null,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypeCollectionWorkspace: wsState.getCachedContentTypeCollectionWorkspace,
  getContentTypeCollectionWorkspaceCached: wsState.getContentTypeCollectionWorkspaceCached,
}));

vi.mock("@/services/detailPagesClient", () => ({
  createDetailPage: wsState.createDetailPage,
  deleteDetailPage: wsState.deleteDetailPage,
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: wsState.getSiteSettings,
  updateSiteSettings: wsState.updateSiteSettings,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    contentTypesList: "contentTypes:list",
    contentTypeDetail: (id: string) => `contentTypes:detail:${id}`,
    contentTypeCollectionWorkspace: (id: string) => `contentTypes:collectionWorkspace:${id}`,
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: wsState.subscribeCacheEvents,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ path: routerState.path, navigate: routerState.navigate }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="admin-shell">{children}</div>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ href, children }: { href: string; children?: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1 data-slot="page-title">{title}</h1>
      <p data-slot="page-description">{description}</p>
      <div data-slot="page-actions">{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    confirmLabel,
    confirmingLabel,
    isConfirming,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    confirmLabel: string;
    confirmingLabel: string;
    isConfirming?: boolean;
    onConfirm: () => void;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-slot="confirm-dialog">
        <button type="button" onClick={onConfirm}>
          {isConfirming ? confirmingLabel : confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Cancel detail template deletion
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/shared/listActionToasts", () => ({
  createListActionToastAdapter: () => ({
    success: vi.fn(),
    error: (_action: string, error: unknown) =>
      error instanceof Error ? error.message : "toast_failure",
  }),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-slot="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-title">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-description">{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-slot="badge">{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    tabState.onValueChange = onValueChange ?? null;
    return <div data-tabs-value={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button type="button" data-tab={value} onClick={() => tabState.onValueChange?.(value)}>
      {children}
    </button>
  ),
}));

import { CollectionWorkspacePage } from "../../../core/admin/ui/content-types/CollectionWorkspacePage";

let container: HTMLDivElement | null = null;
let mountedRoot: ReturnType<typeof createRoot> | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  wsState.cachedSummary = null;
  wsState.remoteSummaries = [];
  wsState.fetchError = null;
  wsState.pending = false;
  wsState.cacheListener = null;
  wsState.deleteDetailPage.mockClear();
  wsState.updateSiteSettings.mockClear();
  routerState.path = "/admin/advanced/engine/ct-1";
  routerState.navigate.mockClear();
  wsState.createDetailPage.mockImplementation(async () => {
    throw new Error("create_not_configured");
  });
  wsState.getSiteSettings.mockResolvedValue(
    wsState.makeSiteSettings([
      {
        type: "products",
        listPath: "/products",
        detailPath: "/products/:slug",
        enabled: true,
        detailPageId: "dp-1",
      },
    ])
  );
});

afterEach(() => {
  const root = mountedRoot;
  if (root) {
    React.act(() => {
      root.unmount();
    });
    mountedRoot = null;
  }
  container?.remove();
  container = null;
});

function mount() {
  const root = createRoot(container!);
  mountedRoot = root;
  React.act(() => {
    root.render(<CollectionWorkspacePage />);
  });
  return root;
}

describe("CollectionWorkspacePage", () => {
  test("renders the loading placeholder while the workspace is pending", async () => {
    wsState.pending = true;
    mount();
    expect(container!.textContent).toContain("Loading collection workspace...");
    wsState.pending = false;
    await flush();
  });

  test("loads the workspace and renders the summary header", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    expect(container!.textContent).toContain("Products");
    expect(container!.textContent).toContain("/products");
    expect(container!.textContent).toContain("Ready");
    expect(container!.textContent).toContain("Refresh");
    expect(container!.textContent).toContain("Entries");
    expect(container!.textContent).toContain("Detail template");
    expect(container!.textContent).toContain("Settings");
    expect(container!.textContent).toContain("Edit detail template");
  });

  test("renders the edit detail template link when a canonical detail page exists", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    const link = container!.querySelector<HTMLAnchorElement>(
      'a[href="/advanced/engine/ct-1/collection/detail-template/dp-1"]'
    );
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain("Edit detail template");
  });

  test("shows the refreshing state while the refresh button re-fetches", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    wsState.pending = true;
    const buttons = Array.from(container!.querySelectorAll("button"));
    const refresh = buttons.find((button) => button.textContent === "Refresh");
    React.act(() => {
      refresh!.click();
    });
    expect(container!.textContent).toContain("Refreshing...");
    wsState.pending = false;
    await flush();
    expect(container!.textContent).toContain("Refresh");
  });

  test("renders an api client error message from the fetch failure", async () => {
    wsState.fetchError = { kind: "api", message: "workspace exploded" };
    mount();
    await flush();
    expect(container!.textContent).toContain("Unable to load collection workspace");
    expect(container!.textContent).toContain("workspace exploded");
  });

  test("renders the generic failure message for a non-api fetch error", async () => {
    wsState.fetchError = new Error("raw failure");
    mount();
    await flush();
    expect(container!.textContent).toContain("Failed to load collection workspace.");
  });

  test("surfaces a missing collection id state when the path has no id", async () => {
    routerState.path = "/admin/advanced/engine";
    mount();
    await flush();
    expect(container!.textContent).toContain("Missing collection id.");
    expect(container!.textContent).toContain("Collection");
  });

  test("shows the remote update banner and refreshes from it", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    React.act(() => {
      wsState.cacheListener?.({
        key: "contentTypes:collectionWorkspace:ct-1",
        action: "invalidate",
      });
    });
    expect(container!.textContent).toContain("Workspace changed");
    const buttons = Array.from(container!.querySelectorAll("button"));
    const refresh = buttons.find((button) => button.textContent === "Refresh");
    wsState.remoteSummaries = [makeSummary()];
    React.act(() => {
      refresh!.click();
    });
    await flush();
    expect(container!.textContent).not.toContain("Workspace changed");
  });

  test("refreshes through the remote-update alert action", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    React.act(() => {
      wsState.cacheListener?.({
        key: "contentTypes:collectionWorkspace:ct-1",
        action: "invalidate",
      });
    });
    const alert = container!.querySelector<HTMLElement>('[data-slot="alert"]');
    const refresh = Array.from(alert?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent === "Refresh"
    );
    expect(refresh).toBeDefined();
    wsState.remoteSummaries = [makeSummary()];
    React.act(() => {
      refresh!.click();
    });
    await flush();
    expect(wsState.getContentTypeCollectionWorkspaceCached).toHaveBeenLastCalledWith("ct-1", {
      force: true,
    });
    expect(container!.textContent).not.toContain("Workspace changed");
  });

  test("ignores cache events for unrelated keys", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    React.act(() => {
      wsState.cacheListener?.({ key: "some:other:key", action: "invalidate" });
    });
    expect(container!.textContent).not.toContain("Workspace changed");
  });

  test("creates a detail template, links the route and navigates to the editor", async () => {
    wsState.remoteSummaries = [makeSummary({ detailPage: null })];
    const created = makeCreatedDetailPage();
    wsState.createDetailPage.mockImplementation(async () => created);
    mount();
    await flush();
    const buttons = Array.from(container!.querySelectorAll("button"));
    const create = buttons.find((button) => button.textContent === "Create detail template");
    React.act(() => {
      create!.click();
    });
    await flush();
    expect(wsState.createDetailPage).toHaveBeenCalledTimes(1);
    expect(wsState.updateSiteSettings).toHaveBeenCalledWith({
      contentRoutes: expect.arrayContaining([
        expect.objectContaining({ type: "products", detailPageId: "dp-new", enabled: true }),
      ]),
    });
    expect(routerState.navigate).toHaveBeenCalledWith(
      "/advanced/engine/ct-1/collection/detail-template/dp-new"
    );
  });

  test("creates a detail template through the template tab", async () => {
    wsState.remoteSummaries = [makeSummary({ detailPage: null })];
    const created = makeCreatedDetailPage();
    wsState.createDetailPage.mockResolvedValue(created);
    mount();
    await flush();
    const templateTab = container!.querySelector<HTMLButtonElement>('[data-tab="template"]');
    React.act(() => {
      templateTab!.click();
    });
    const create = Array.from(container!.querySelectorAll("button")).find(
      (button) => button.textContent === "Create detail template"
    );
    expect(create).toBeDefined();
    React.act(() => {
      create!.click();
    });
    await flush();
    expect(wsState.createDetailPage).toHaveBeenCalled();
    expect(routerState.navigate).toHaveBeenCalledWith(
      "/advanced/engine/ct-1/collection/detail-template/dp-new"
    );
  });

  test("rolls back the created page when the route link fails", async () => {
    wsState.remoteSummaries = [makeSummary({ detailPage: null })];
    const created = makeCreatedDetailPage();
    wsState.createDetailPage.mockImplementation(async () => created);
    wsState.getSiteSettings.mockRejectedValue(new Error("settings_down"));
    mount();
    await flush();
    const buttons = Array.from(container!.querySelectorAll("button"));
    const create = buttons.find((button) => button.textContent === "Create detail template");
    React.act(() => {
      create!.click();
    });
    await flush();
    expect(wsState.deleteDetailPage).toHaveBeenCalledWith("dp-new", { contentTypeId: "ct-1" });
    expect(container!.textContent).toContain("settings_down");
  });

  test("keeps the workspace error visible when create fails before any page is created", async () => {
    wsState.remoteSummaries = [makeSummary({ detailPage: null })];
    wsState.createDetailPage.mockRejectedValue(new Error("creation_refused"));
    mount();
    await flush();
    const buttons = Array.from(container!.querySelectorAll("button"));
    const create = buttons.find((button) => button.textContent === "Create detail template");
    React.act(() => {
      create!.click();
    });
    await flush();
    expect(wsState.deleteDetailPage).not.toHaveBeenCalled();
    expect(container!.textContent).toContain("creation_refused");
  });

  test("deletes a detail template after confirmation and clears the route", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    const buttons = Array.from(container!.querySelectorAll("button"));
    const deleteButton = buttons.find((button) => button.textContent === "Delete");
    React.act(() => {
      deleteButton!.click();
    });
    expect(container!.querySelector('[data-slot="confirm-dialog"]')).not.toBeNull();
    const confirm = container!.querySelector<HTMLButtonElement>(
      '[data-slot="confirm-dialog"] button'
    );
    wsState.remoteSummaries = [makeSummary({ detailPage: null })];
    React.act(() => {
      confirm!.click();
    });
    await flush();
    expect(wsState.updateSiteSettings).toHaveBeenCalledWith({
      contentRoutes: [expect.objectContaining({ type: "products", detailPageId: null })],
    });
    expect(wsState.deleteDetailPage).toHaveBeenCalledWith("dp-1", { contentTypeId: "ct-1" });
    expect(container!.querySelector('[data-slot="confirm-dialog"]')).toBeNull();
  });

  test("dismisses a detail-template delete dialog through its open-change action", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    const deleteButton = Array.from(container!.querySelectorAll("button")).find(
      (button) => button.textContent === "Delete"
    );
    React.act(() => {
      deleteButton!.click();
    });
    const dismiss = Array.from(
      container!.querySelectorAll<HTMLButtonElement>('[data-slot="confirm-dialog"] button')
    ).find((button) => button.textContent === "Cancel detail template deletion");
    expect(dismiss).toBeDefined();
    React.act(() => {
      dismiss!.click();
    });
    expect(container!.querySelector('[data-slot="confirm-dialog"]')).toBeNull();
    expect(wsState.deleteDetailPage).not.toHaveBeenCalled();
  });

  test("restores the previous route when the delete fails", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    const buttons = Array.from(container!.querySelectorAll("button"));
    const deleteButton = buttons.find((button) => button.textContent === "Delete");
    React.act(() => {
      deleteButton!.click();
    });
    wsState.deleteDetailPage.mockRejectedValueOnce(new Error("delete_failed"));
    const confirm = container!.querySelector<HTMLButtonElement>(
      '[data-slot="confirm-dialog"] button'
    );
    React.act(() => {
      confirm!.click();
    });
    await flush();
    expect(wsState.updateSiteSettings).toHaveBeenLastCalledWith({
      contentRoutes: [expect.objectContaining({ type: "products", detailPageId: "dp-1" })],
    });
    expect(container!.textContent).toContain("delete_failed");
  });

  test("switches tabs to the readiness checklist and back to the overview", async () => {
    wsState.remoteSummaries = [makeSummary()];
    mount();
    await flush();
    const settingsTab = container!.querySelector<HTMLButtonElement>('[data-tab="settings"]');
    React.act(() => {
      settingsTab!.click();
    });
    expect(container!.textContent).toContain("Readiness");
    expect(container!.textContent).toContain("3 of 6 canonical resources linked");
    const templateTab = container!.querySelector<HTMLButtonElement>('[data-tab="template"]');
    React.act(() => {
      templateTab!.click();
    });
    expect(container!.textContent).toContain("Linked resources");
  });
});
