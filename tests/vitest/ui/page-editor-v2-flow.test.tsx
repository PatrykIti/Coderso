// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

type CacheEvent = {
  key: string;
  action: "update";
};

const pageEditorState = vi.hoisted(() => {
  const state = {
    cachedPage: null as PageDetail | null,
    currentPage: null as PageDetail | null,
    revisions: [] as PageRevision[],
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedPageDetail: vi.fn((id: string) =>
      state.cachedPage && state.cachedPage.id === id ? state.cachedPage : null
    ),
    getPageCached: vi.fn(async () => state.currentPage),
    listPageRevisions: vi.fn(async () => state.revisions),
    previewPage: vi.fn(async (pageId: string) => ({
      token: "preview-token",
      previewUrl: `https://preview.test/${pageId}`,
      expiresAt: "2026-03-08T10:20:00.000Z",
      probe: {
        ok: true,
        status: 200,
        targetLabel: `https://preview.test/${pageId}`,
      },
    })),
    updatePage: vi.fn(
      async (id: string, payload: Partial<PageDetail> & { data?: Record<string, unknown> }) => {
        const current =
          state.currentPage ??
          ({
            id,
            title: "Homepage",
            slug: "homepage",
            status: "draft",
            currentData: createDocument(),
            updatedAt: "2026-03-08T09:00:00.000Z",
          } satisfies PageDetail);
        const updated = {
          ...current,
          title: typeof payload.title === "string" ? payload.title : current.title,
          slug: typeof payload.slug === "string" ? payload.slug : current.slug,
          currentData: payload.data ?? current.currentData,
        } satisfies PageDetail;
        state.currentPage = updated;
        state.cachedPage = updated;
        return updated;
      }
    ),
    autosavePage: vi.fn(async () => ({ ok: true })),
    publishPage: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const current = state.currentPage ?? createPage({ id });
      state.currentPage = {
        ...current,
        status: "published",
        currentData: data,
      };
    }),
    restorePageRevision: vi.fn(async (_pageId: string, revisionId: string) => {
      const restored = createPage({
        title: "Restored Homepage",
        currentData: createDocument({
          sections: [
            createPageSectionV2("cta", {
              id: "sec-restored",
              name: "Restored CTA",
              blocks: [
                createPageBlockV2("heading", {
                  id: "blk-restored",
                  props: { text: `Restored ${revisionId}`, level: "h2", align: "center" },
                }),
              ],
            }),
          ],
        }),
      });
      state.currentPage = restored;
      state.cachedPage = restored;
      return { page: restored };
    }),
    discardPageRevision: vi.fn(async () => undefined),
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
      state.cachedPage = null;
      state.currentPage = null;
      state.revisions = [];
      state.cacheListener = null;
      state.getCachedPageDetail.mockClear();
      state.getPageCached.mockClear();
      state.listPageRevisions.mockClear();
      state.previewPage.mockClear();
      state.updatePage.mockClear();
      state.autosavePage.mockClear();
      state.publishPage.mockClear();
      state.restorePageRevision.mockClear();
      state.discardPageRevision.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };

  return state;
});

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const activeSurfaceState = vi.hoisted(() => ({
  contexts: [] as Array<Record<string, unknown>>,
  clears: 0,
  reset() {
    activeSurfaceState.contexts = [];
    activeSurfaceState.clears = 0;
  },
}));

const previewDialogState = vi.hoisted(() => ({
  latest: null as null | {
    open: boolean;
    title: string;
    canPreview: boolean;
    previewUrl: string | null;
    probeResult?: { ok: boolean; targetLabel?: string } | null;
    device?: string;
  },
  reset() {
    previewDialogState.latest = null;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
    error: toastState.error,
  },
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    title,
    "aria-label": ariaLabel,
    className,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ side, children }: { side?: "left" | "right"; children: React.ReactNode }) => (
    <div>
      {side ? `sheet:${side}` : null}
      {children}
    </div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error && error.kind === "api",
  isSessionExpiredApiError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    error.kind === "api" &&
    "sharedFailureKind" in error &&
    (error as { sharedFailureKind?: string }).sharedFailureKind === "session_expired",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `page-detail:${id}`,
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
  listPageRevisions: pageEditorState.listPageRevisions,
  previewPage: pageEditorState.previewPage,
  publishPage: pageEditorState.publishPage,
  restorePageRevision: pageEditorState.restorePageRevision,
  updatePage: pageEditorState.updatePage,
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    breadcrumbs,
    topbarActions,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    topbarActions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{topbarActions}</div>
      <main>{children}</main>
    </div>
  ),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: () => {
    activeSurfaceState.clears += 1;
  },
  setActiveAssistantSurfaceContext: (context: Record<string, unknown>) => {
    activeSurfaceState.contexts.push(context);
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: pageEditorState.subscribeCacheEvents,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: (props: {
    open: boolean;
    title: string;
    canPreview: boolean;
    previewUrl: string | null;
    probeResult?: { ok: boolean; targetLabel?: string } | null;
    device?: string;
  }) => {
    previewDialogState.latest = props;
    return props.open ? (
      <div data-runtime-preview-dialog="true">{props.previewUrl ?? "no-preview"}</div>
    ) : null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createDocument = (overrides: Partial<PageDocumentV2> = {}): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
    revisionRetention: 10,
  },
  sections: [
    createPageSectionV2("hero", {
      id: "sec-hero",
      name: "Hero",
      variant: "centered",
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-heading",
          props: { text: "Welcome to Coderso", level: "h1", align: "center" },
        }),
        createPageBlockV2("text", {
          id: "blk-copy",
          props: { text: "Existing page copy.", format: "plain", align: "center" },
        }),
      ],
    }),
  ],
  ...overrides,
});

const createPage = (overrides: Partial<PageDetail> = {}): PageDetail => ({
  id: "page-1",
  title: "Homepage",
  slug: "homepage",
  status: "draft",
  currentData: createDocument(),
  updatedAt: "2026-03-08T09:00:00.000Z",
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
  });
};

const findButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );

const clickButton = (container: ParentNode, text: string) => {
  const button = findButton(container, text);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickButtonByTitle = (container: ParentNode, title: string) => {
  const button = container.querySelector(`button[title="${title}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const changeField = (container: ParentNode, labelText: string, value: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((entry) =>
    entry.textContent?.includes(labelText)
  );
  const field = label?.querySelector("input,select") as HTMLInputElement | HTMLSelectElement | null;
  expect(field).toBeTruthy();
  React.act(() => {
    if (!field) return;
    const setterOwner =
      field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(setterOwner, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

beforeEach(() => {
  pageEditorState.reset();
  activeSurfaceState.reset();
  previewDialogState.reset();
  toastState.success.mockClear();
  toastState.error.mockClear();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("PageEditor loads v2 documents, subscribes to cache updates, and exposes section context", async () => {
  pageEditorState.cachedPage = null;
  pageEditorState.currentPage = createPage();
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    await flush();

    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1");
    expect(view.container.textContent).toContain("Welcome to Coderso");
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: null,
    });

    pageEditorState.cachedPage = createPage({
      currentData: createDocument({
        sections: [
          createPageSectionV2("content", {
            id: "sec-remote",
            name: "Remote Update",
            blocks: [
              createPageBlockV2("heading", {
                id: "blk-remote",
                props: { text: "Remote headline", level: "h2", align: "left" },
              }),
            ],
          }),
        ],
      }),
    });

    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });

    expect(view.container.textContent).toContain("Remote headline");
  } finally {
    view.cleanup();
  }
});

test("PageEditor adds sections and atomic blocks, stores responsive overrides, and saves v2 data", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "FAQ");
    await flush();

    expect(view.container.textContent).toContain("faq section");
    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Divider");
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    clickButtonByTitle(view.container, "layout");
    changeField(view.container, "Columns", "2");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(savedPayload?.data).toMatchObject({
      schemaVersion: 2,
      sections: [
        { id: "sec-hero", type: "hero" },
        {
          type: "faq",
          responsive: {
            mobile: {
              layout: {
                columns: 2,
              },
            },
          },
        },
      ],
    });
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[1]?.blocks.some((block) => block.type === "divider")).toBe(true);
    expect(savedDocument).not.toHaveProperty("blocks");
  } finally {
    view.cleanup();
  }
});

test("PageEditor autosaves dirty v2 section data", async () => {
  vi.useFakeTimers();
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    await React.act(async () => {
      vi.advanceTimersByTime(1600);
      await Promise.resolve();
    });

    expect(pageEditorState.autosavePage).toHaveBeenCalledWith("page-1", {
      data: expect.objectContaining({
        schemaVersion: 2,
        sections: expect.arrayContaining([expect.objectContaining({ type: "cta" })]),
      }),
    });
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});

test("PageEditor previews, publishes, updates settings, and manages revisions with v2 payloads", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-1",
      pageId: "page-1",
      version: 1,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-2",
      pageId: "page-1",
      version: 2,
      kind: "publish",
      title: "Published",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:20:00.000Z",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      warnings: ["page_has_unsaved_changes"],
    });

    clickButton(view.container, "Preview");
    await flush();
    expect(pageEditorState.updatePage.mock.invocationCallOrder[0]).toBeLessThan(
      pageEditorState.previewPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    const previewSyncPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(previewSyncPayload?.data).toMatchObject({
      schemaVersion: 2,
      sections: [{ id: "sec-hero", type: "hero" }, { type: "content" }],
    });
    expect(pageEditorState.previewPage).toHaveBeenCalledWith("page-1", {
      ttlMinutes: 15,
      probe: true,
    });
    expect(previewDialogState.latest).toMatchObject({
      open: true,
      title: "Page preview",
      canPreview: true,
      previewUrl: "https://preview.test/page-1",
      device: "desktop",
    });

    clickButton(view.container, "Page settings");
    await flush();
    changeField(view.container, "Title", "Landing Page");
    changeField(view.container, "Slug", "landing");
    changeField(view.container, "Show in navigation", "no");
    changeField(view.container, "Revision retention", "25");
    clickButton(view.container, "Save settings");
    await flush();

    const settingsPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(settingsPayload).toMatchObject({
      title: "Landing Page",
      slug: "/landing",
      data: {
        schemaVersion: 2,
        settings: {
          showInNav: false,
          revisionRetention: 25,
        },
      },
    });

    clickButton(view.container, "History");
    await flush();
    expect(view.container.textContent).toContain("Draft version");
    expect(view.container.textContent).toContain("Version 2");
    clickButton(view.container, "Discard");
    await flush();
    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith("page-1", "rev-1");
    clickButton(view.container, "Restore");
    await flush();
    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith("page-1", "rev-1");
    expect(view.container.textContent).toContain("Restored rev-1");

    clickButton(view.container, "Publish");
    await flush();
    expect(pageEditorState.publishPage.mock.calls.at(-1)?.[1]).toMatchObject({
      schemaVersion: 2,
      sections: expect.any(Array),
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor resets legacy widget page data to an empty v2 document before saving", async () => {
  const legacyPage = createPage({
    currentData: {
      blocks: [{ id: "legacy-hero", type: "hero", props: { title: "Legacy" } }],
    },
  });
  pageEditorState.cachedPage = legacyPage;
  pageEditorState.currentPage = legacyPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={legacyPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("This page has no sections yet.");
    clickButton(view.container, "Save");
    await flush();

    expect(pageEditorState.updatePage.mock.calls.at(-1)?.[1].data).toEqual({
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: {
        template: "page-v2",
        showInNav: true,
      },
      sections: [],
    });
  } finally {
    view.cleanup();
  }
});
