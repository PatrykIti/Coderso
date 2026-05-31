// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { createBookingCalendarWidget } from "../../../core/widgets/core/bookingCalendar";

const bookingPreviewState = vi.hoisted(() => ({
  resources: [
    {
      id: "resource-1",
      name: "Test Mechanic",
      slug: "test-mechanic",
      type: "staff" as const,
      status: "active" as const,
      timezone: "Europe/Warsaw",
      capacity: 1,
      settings: {},
      createdAt: "2026-05-17T00:00:00.000Z",
      updatedAt: "2026-05-17T00:00:00.000Z",
    },
  ],
  services: [
    {
      id: "service-1",
      name: "Oil Change Service",
      slug: "oil-change-service",
      status: "active" as const,
      description: "Fast service",
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      priceCents: 5000,
      currency: "PLN",
      settings: { submissionAccess: "public" },
      createdAt: "2026-05-17T00:00:00.000Z",
      updatedAt: "2026-05-17T00:00:00.000Z",
    },
  ],
  serviceResources: [
    {
      serviceId: "service-1",
      resourceId: "resource-1",
      isRequired: false,
      createdAt: "2026-05-17T00:00:00.000Z",
    },
  ],
  listBookingResourcesCached: vi.fn(async () => bookingPreviewState.resources),
  listBookingServicesCached: vi.fn(async () => bookingPreviewState.services),
  listBookingServiceResourcesCached: vi.fn(async () => bookingPreviewState.serviceResources),
  getCachedBookingResources: vi.fn(() => bookingPreviewState.resources),
  getCachedBookingServices: vi.fn(() => bookingPreviewState.services),
  reset() {
    bookingPreviewState.listBookingResourcesCached.mockClear();
    bookingPreviewState.listBookingServicesCached.mockClear();
    bookingPreviewState.listBookingServiceResourcesCached.mockClear();
    bookingPreviewState.getCachedBookingResources.mockClear();
    bookingPreviewState.getCachedBookingServices.mockClear();
  },
}));

const pageEditorState = vi.hoisted(() => {
  const state = {
    cachedPage: null as PageDetail | null,
    currentPage: null as PageDetail | null,
    revisions: [] as PageRevision[],
    getCachedPageDetail: vi.fn((id: string) =>
      state.cachedPage && state.cachedPage.id === id ? state.cachedPage : null
    ),
    getPageCached: vi.fn(async () => state.currentPage),
    getPageTemplateOptions: vi.fn(async () => ({
      themeName: "starter",
      templates: [{ key: "landing", label: "Landing" }],
    })),
    listPageRevisions: vi.fn(async () => state.revisions),
    previewPage: vi.fn(async (pageId: string) => ({
      previewUrl: `https://preview.test/${pageId}`,
    })),
    updatePage: vi.fn(async (_id: string, payload: { data?: Record<string, unknown> }) => ({
      ...(state.currentPage as PageDetail),
      currentData: payload.data ?? state.currentPage?.currentData ?? { blocks: [] },
    })),
    publishPage: vi.fn(async () => ({ ok: true })),
    autosavePage: vi.fn(async () => undefined),
    restorePageRevision: vi.fn(async () => undefined),
    discardPageRevision: vi.fn(async () => undefined),
    subscribeCacheEvents: vi.fn(() => () => undefined),
    reset() {
      state.cachedPage = null;
      state.currentPage = null;
      state.revisions = [];
      state.getCachedPageDetail.mockClear();
      state.getPageCached.mockClear();
      state.getPageTemplateOptions.mockClear();
      state.listPageRevisions.mockClear();
      state.previewPage.mockClear();
      state.updatePage.mockClear();
      state.publishPage.mockClear();
      state.autosavePage.mockClear();
      state.restorePageRevision.mockClear();
      state.discardPageRevision.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };

  return state;
});

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/bookingClient", () => ({
  getCachedBookingResources: bookingPreviewState.getCachedBookingResources,
  getCachedBookingServices: bookingPreviewState.getCachedBookingServices,
  listBookingResourcesCached: bookingPreviewState.listBookingResourcesCached,
  listBookingServiceResourcesCached: bookingPreviewState.listBookingServiceResourcesCached,
  listBookingServicesCached: bookingPreviewState.listBookingServicesCached,
  resolveBookingSubmissionAccess: (settings: Record<string, unknown>, fallback = "public") =>
    settings.submissionAccess === "internal" || settings.submissionAccess === "public"
      ? settings.submissionAccess
      : fallback,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `page-detail:${id}`,
    bookingResourcesList: "booking:resources:list",
    bookingServicesList: "booking:services:list",
    bookingServiceResources: (id: string) => `booking:services:${id}:resources`,
  },
  cacheTtlMs: {
    list: 300_000,
    detail: 300_000,
  },
}));

vi.mock("@/services/pagesClient", () => ({
  autosavePage: pageEditorState.autosavePage,
  discardPageRevision: pageEditorState.discardPageRevision,
  getCachedPageDetail: pageEditorState.getCachedPageDetail,
  getPageCached: pageEditorState.getPageCached,
  getPageTemplateOptions: pageEditorState.getPageTemplateOptions,
  listPageRevisions: pageEditorState.listPageRevisions,
  previewPage: pageEditorState.previewPage,
  publishPage: pageEditorState.publishPage,
  restorePageRevision: pageEditorState.restorePageRevision,
  updatePage: pageEditorState.updatePage,
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    leftPanel,
    rightPanel,
    children,
  }: {
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{leftPanel}</div>
      <div>{rightPanel}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: pageEditorState.subscribeCacheEvents,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: () => null,
}));

vi.mock("../../../core/admin/ui/pages/PageSettingsDrawer", () => ({
  PageSettingsDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/pages/PageRevisionDrawer", () => ({
  PageRevisionDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/pages/builder/LibraryPanel", () => ({
  LibraryPanel: () => <div>library</div>,
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({
    editorContext,
  }: {
    editorContext?: {
      widgetPreviewData?: Record<string, unknown>;
    };
  }) => {
    const resolved = editorContext?.widgetPreviewData?.bookingCalendarResolved as
      | { services?: Array<unknown>; resources?: Array<unknown> }
      | undefined;
    return (
      <div data-booking-preview-counts="true">
        {`settings-preview:${resolved?.services?.length ?? 0}:${resolved?.resources?.length ?? 0}`}
      </div>
    );
  },
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: () => undefined,
  setActiveAssistantSurfaceContext: () => undefined,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createPage = (): PageDetail => ({
  id: "page-1",
  title: "Booking page",
  slug: "booking-page",
  status: "draft",
  currentData: {
    blocks: [
      {
        id: "booking-1",
        type: "booking-calendar",
        variant: "default",
        data: {},
        editor: {
          mode: "advanced",
          wizardCompleted: true,
        },
      },
    ],
  },
  updatedAt: "2026-05-17T09:00:00.000Z",
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

beforeEach(() => {
  pageEditorState.reset();
  bookingPreviewState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  clearWidgets();
  registerWidget(
    createBookingCalendarWidget({
      wizard: () => null,
      visual: () => null,
      advanced: () => null,
    })
  );
});

afterEach(() => {
  clearWidgets();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("PageEditor hydrates booking-calendar preview data into BlockList and editor context", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(bookingPreviewState.listBookingServicesCached).toHaveBeenCalled();
    expect(bookingPreviewState.listBookingResourcesCached).toHaveBeenCalled();
    expect(bookingPreviewState.listBookingServiceResourcesCached).toHaveBeenCalledWith(
      "service-1",
      { force: false }
    );
    expect(view.container.textContent).toContain("Oil Change Service");
    expect(view.container.textContent).toContain("Test Mechanic");
    expect(view.container.textContent).toContain("settings-preview:1:1");
  } finally {
    view.cleanup();
  }
});
