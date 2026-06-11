// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
  pageBlockCapabilities,
  pageBlockTypes,
  pageSectionCapabilities,
  pageSectionTypes,
  type PageBlockV2,
  type PageBlockType,
  type PageDocumentV2,
  type PageSectionType,
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
    onPointerDown,
    title,
    "aria-label": ariaLabel,
    className,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
    title?: string;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      title={title}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    targetLabel,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    targetLabel?: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{description}</p>
        {targetLabel ? <p>{targetLabel}</p> : null}
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </button>
      </div>
    ) : null,
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

const dispatchDocumentKey = (key: string, init: KeyboardEventInit = {}) => {
  React.act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
};

const dispatchElementKey = (element: Element | null, key: string, init: KeyboardEventInit = {}) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
};

const clickSelector = (container: ParentNode, selector: string) => {
  const element = container.querySelector(selector);
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const pageEditorBlockLabels: Record<PageBlockType, string> = {
  heading: "Heading",
  text: "Text",
  button: "Button",
  image: "Image",
  video: "Video",
  gallery: "Gallery",
  form: "Form",
  list: "List",
  card: "Card",
  collection: "Collection",
  embed: "Embed",
  divider: "Divider",
  spacer: "Spacer",
  statistic: "Statistic",
  icon: "Icon",
  quote: "Quote",
  container: "Container",
  columns: "Columns",
  group: "Group",
};

const pageEditorSectionLabels: Record<PageSectionType, string> = {
  template: "Template",
  navigation: "Navigation",
  hero: "Hero",
  content: "Content",
  "feature-grid": "Feature grid",
  "media-split": "Media split",
  timeline: "Timeline",
  gallery: "Gallery",
  collection: "Collection",
  comparison: "Comparison",
  filters: "Filters",
  "lead-form": "Lead form",
  faq: "FAQ",
  testimonials: "Testimonials",
  cta: "CTA",
  embed: "Embed",
  custom: "Custom",
};

const getCommandGroupButtons = (container: ParentNode, title: string) => {
  const heading = Array.from(container.querySelectorAll("p")).find(
    (entry) => entry.textContent === title
  );
  expect(heading).toBeTruthy();
  return Array.from(heading?.parentElement?.querySelectorAll("button") ?? []);
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

const findFieldControl = (container: ParentNode, labelText: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((entry) =>
    entry.textContent?.includes(labelText)
  );
  const field = label?.querySelector("input,select,textarea");
  expect(field).toBeTruthy();
  return field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

const findResponsiveField = (container: ParentNode, labelText: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((entry) =>
    entry.textContent?.includes(labelText)
  );
  const field = label?.closest("[data-page-editor-responsive-field]");
  expect(field).toBeTruthy();
  return field as HTMLElement;
};

const clickResponsiveReset = (container: ParentNode, labelText: string) => {
  const field = findResponsiveField(container, labelText);
  const button = Array.from(field.querySelectorAll("button")).find((entry) =>
    entry.textContent?.includes("Reset")
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findEditorSectionContent = (container: ParentNode, sectionId: string) => {
  const section = container.querySelector(
    `[data-page-editor-section][data-section-id="${sectionId}"]`
  );
  const content = section?.querySelector("[data-page-section-content]");
  expect(content).toBeTruthy();
  return content as HTMLElement;
};

const findEditorBlock = (container: ParentNode, blockId: string) => {
  const block = container.querySelector(`[data-page-editor-block-id="${blockId}"]`);
  expect(block).toBeTruthy();
  return block as HTMLElement;
};

const collectPageBlockIds = (blocks: readonly PageBlockV2[]): string[] =>
  blocks.flatMap((block) => [
    block.id,
    ...Object.values(block.slots ?? {}).flatMap((children) => collectPageBlockIds(children ?? [])),
  ]);

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
      updatedAt: "2026-03-08T09:05:00.000Z",
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

test("PageEditor ignores stale pageDetail cache events instead of wiping the loaded document", async () => {
  pageEditorState.cachedPage = null;
  pageEditorState.currentPage = createPage();
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Welcome to Coderso");

    // Older cached record with an empty document (the TASK-449/TASK-442 audit
    // data-loss path): must NOT replace the newer loaded document.
    pageEditorState.cachedPage = createPage({
      updatedAt: "2026-03-08T08:00:00.000Z",
      currentData: createDocument({ sections: [] }),
    });
    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    expect(view.container.textContent).toContain("Welcome to Coderso");

    // Same-timestamp replays are also ignored (no rehydration churn).
    pageEditorState.cachedPage = createPage({
      currentData: createDocument({ sections: [] }),
    });
    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    expect(view.container.textContent).toContain("Welcome to Coderso");

    // Unparsable timestamps fail closed.
    pageEditorState.cachedPage = createPage({
      updatedAt: "not-a-date",
      currentData: createDocument({ sections: [] }),
    });
    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    expect(view.container.textContent).toContain("Welcome to Coderso");
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

    clickSelector(view.container, '[data-page-editor-section="faq"]');
    await flush();
    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    clickButtonByTitle(view.container, "Layout panel");
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

test("PageEditor content edits are block-type-aware and breakpoint-aware", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    changeField(view.container, "Primary text", "Mobile headline");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const heading = savedDocument.sections[0]?.blocks[0];

    expect(heading?.props).toMatchObject({ text: "Welcome to Coderso", level: "h1" });
    expect(heading?.props).not.toHaveProperty("label");
    expect(heading?.responsive?.mobile?.props).toEqual({ text: "Mobile headline" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor marks and resets section responsive overrides per field", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickButtonByTitle(view.container, "Layout panel");
    changeField(view.container, "Columns", "2");
    changeField(view.container, "Max width", "900");
    await flush();

    expect(findResponsiveField(view.container, "Columns").dataset.pageEditorResponsiveField).toBe(
      "override"
    );
    expect(findResponsiveField(view.container, "Max width").dataset.pageEditorResponsiveField).toBe(
      "override"
    );
    expect(
      view.container
        .querySelector('[data-page-editor-section="hero"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("override");

    clickResponsiveReset(view.container, "Columns");
    await flush();

    expect(findResponsiveField(view.container, "Columns").dataset.pageEditorResponsiveField).toBe(
      "inherited"
    );
    expect(findResponsiveField(view.container, "Max width").dataset.pageEditorResponsiveField).toBe(
      "override"
    );

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.responsive.mobile?.layout).toEqual({ maxWidth: 900 });
  } finally {
    view.cleanup();
  }
});

test("PageEditor section registry controls update visible canvas style and saved data", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButtonByTitle(view.container, "Layout panel");
    changeField(view.container, "Columns", "3");
    changeField(view.container, "Justify", "between");
    await flush();

    let content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.dataset.pageSectionLayoutMode).toBe("canvas-device");
    expect(content.className).toContain("grid-cols-3");
    expect(content.className).not.toContain("md:grid-cols-3");
    expect(content.className).toContain("justify-between");

    clickButtonByTitle(view.container, "Style panel");
    changeField(view.container, "Shadow", "lg");
    await flush();

    content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.style.boxShadow).toBe("0 22px 60px rgba(15, 23, 42, 0.16)");

    clickButtonByTitle(view.container, "Background panel");
    changeField(view.container, "Background type", "image");
    changeField(view.container, "Background image", "/hero.jpg");
    await flush();

    content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.style.backgroundImage).toContain("/hero.jpg");

    clickButtonByTitle(view.container, "Visibility panel");
    changeField(view.container, "Auth only", "yes");
    changeField(view.container, "Anchor", "hero-top");
    changeField(view.container, "Starts at", "2026-06-10T10:00:00Z");
    changeField(view.container, "Ends at", "2026-06-11T10:00:00Z");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const section = savedDocument.sections[0];
    expect(section?.layout).toMatchObject({ columns: 3, justify: "between" });
    expect(section?.style).toMatchObject({
      shadow: "lg",
      backgroundType: "image",
      backgroundImage: "/hero.jpg",
    });
    expect(section?.visibility).toMatchObject({
      authOnly: true,
      anchor: "hero-top",
      startsAt: "2026-06-10T10:00:00Z",
      endsAt: "2026-06-11T10:00:00Z",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor keeps universal section controls for stored non-insertable sections", async () => {
  const navigationPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("navigation", {
          id: "sec-navigation",
          name: "Navigation",
          blocks: [],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = navigationPage;
  pageEditorState.currentPage = navigationPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={navigationPage} />);

  try {
    await flush();

    clickButtonByTitle(view.container, "Layout panel");
    changeField(view.container, "Justify", "between");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.type).toBe("navigation");
    expect(savedDocument.sections[0]?.layout.justify).toBe("between");
  } finally {
    view.cleanup();
  }
});

test("PageEditor hidden sections render editor ghost state while saving visibility", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButtonByTitle(view.container, "Visibility panel");
    changeField(view.container, "Visible", "no");
    await flush();

    const section = view.container.querySelector('[data-page-editor-section="hero"]');
    expect(section?.getAttribute("data-page-editor-visibility")).toBe("hidden");
    expect(section?.textContent).toContain("Hidden");
    expect(findEditorSectionContent(view.container, "sec-hero").textContent).toContain(
      "Welcome to Coderso"
    );

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.visibility.visible).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PageEditor block style controls update visible canvas style and saved data", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    clickButtonByTitle(view.container, "Layout panel");
    changeField(view.container, "Width", "full");
    changeField(view.container, "Align", "center");
    await flush();

    clickButtonByTitle(view.container, "Style panel");
    changeField(view.container, "Text color", "#123456");
    changeField(view.container, "Opacity", "0.5");
    changeField(view.container, "Radius", "18");
    changeField(view.container, "Shadow", "md");
    changeField(view.container, "Border color", "#334155");
    await flush();

    clickButtonByTitle(view.container, "Background panel");
    changeField(view.container, "Background type", "color");
    changeField(view.container, "Background", "#fef3c7");
    await flush();

    clickButtonByTitle(view.container, "Spacing panel");
    changeField(view.container, "Padding top", "12");
    changeField(view.container, "Padding right", "14");
    changeField(view.container, "Margin bottom", "10");
    await flush();

    const block = findEditorBlock(view.container, "blk-copy");
    expect(block.className).toContain("w-full");
    expect(block.className).toContain("justify-self-center");
    expect(block.style.getPropertyValue("--coderso-block-text")).toBe("#123456");
    expect(block.style.getPropertyValue("--coderso-block-surface")).toBe("#fef3c7");
    expect(block.style.opacity).toBe("0.5");
    expect(block.style.borderRadius).toBe("18px");
    expect(block.style.boxShadow).toBe("0 14px 40px rgba(15, 23, 42, 0.12)");
    expect(block.style.padding).toBe("12px 14px 0px 0px");
    expect(block.style.marginBottom).toBe("10px");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.style).toMatchObject({
      width: "full",
      align: "center",
      textColor: "#123456",
      background: "#fef3c7",
      backgroundType: "color",
      opacity: 0.5,
      radius: 18,
      shadow: "md",
      borderColor: "#334155",
      padding: { top: 12, right: 14 },
      margin: { bottom: 10 },
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor hidden blocks render selectable ghost state while saving visibility", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButtonByTitle(view.container, "Visibility panel");
    changeField(view.container, "Visible", "no");
    await flush();

    const block = findEditorBlock(view.container, "blk-copy");
    expect(block.dataset.pageEditorVisibility).toBe("hidden");
    expect(block.dataset.selected).toBe("true");
    expect(block.querySelector("[data-page-editor-hidden-block-ghost]")).toBeTruthy();
    expect(block.querySelector("p")).toBeNull();

    React.act(() => {
      block.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: "blk-copy",
      selectedBlockPath: "sections.0.blocks.1",
    });

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.visibility.visible).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PageEditor empty section placeholder opens the block inserter", async () => {
  const emptyPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-empty",
          name: "Empty section",
          blocks: [],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = emptyPage;
  pageEditorState.currentPage = emptyPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={emptyPage} />);

  try {
    await flush();

    clickButton(view.container, "Add the first block");
    await flush();

    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    expect(view.container.textContent).toContain("Blocks");
  } finally {
    view.cleanup();
  }
});

test("PageEditor marks and resets selected block responsive overrides per field", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    changeField(view.container, "Primary text", "Mobile headline");
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-heading"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("override");
    expect(
      findResponsiveField(view.container, "Primary text").dataset.pageEditorResponsiveField
    ).toBe("override");

    clickResponsiveReset(view.container, "Primary text");
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-heading"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("inherited");
    expect(
      findResponsiveField(view.container, "Primary text").dataset.pageEditorResponsiveField
    ).toBe("inherited");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.responsive).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor block selection updates layers and assistant context", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: "blk-copy",
    });

    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-block-id="blk-heading"]');
    await flush();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: "blk-heading",
      selectedBlockPath: "sections.0.blocks.0",
    });

    clickSelector(view.container, '[data-page-editor-layer-section-id="sec-hero"]');
    await flush();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: null,
      selectedBlockPath: null,
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor selected block content edits patch the selected block only", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    changeField(view.container, "Primary text", "Updated selected copy");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const heading = savedDocument.sections[0]?.blocks[0];
    const copy = savedDocument.sections[0]?.blocks[1];

    expect(heading?.props).toMatchObject({ text: "Welcome to Coderso", level: "h1" });
    expect(copy?.props).toMatchObject({ text: "Updated selected copy", format: "plain" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor creates a section with the chosen block when no selection is active", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-canvas-scroller="true"]');
    await flush();
    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Button");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const insertedSection = savedDocument.sections[1];

    expect(insertedSection?.type).toBe("content");
    expect(insertedSection?.blocks).toHaveLength(1);
    expect(insertedSection?.blocks[0]?.type).toBe("button");
  } finally {
    view.cleanup();
  }
});

test("PageEditor block inserter follows owner insertable block capabilities", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();

    const blockButtons = getCommandGroupButtons(view.container, "Blocks");
    const blockButtonLabels = new Set(
      blockButtons.map((button) => button.querySelector("span")?.textContent ?? "")
    );
    for (const type of pageBlockTypes) {
      const hasButton = blockButtonLabels.has(pageEditorBlockLabels[type]);
      if (pageBlockCapabilities[type].editorInsertable) {
        expect(hasButton).toBe(true);
      } else {
        expect(pageBlockCapabilities[type].reason).toBeTruthy();
        expect(hasButton).toBe(false);
      }
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts and edits nested layout block slots from Layers", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Columns");
    await flush();

    clickButton(view.container, "Layers");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-layer-block-path="root:2"]')
    ).toBeTruthy();

    clickButtonByTitle(view.container, "Add block to Column 1");
    await flush();
    clickButton(view.container, "Heading");
    await flush();

    const nestedCanvasBlock = view.container.querySelector(
      '[data-page-editor-block-path="root:2/column:1:0"]'
    );
    expect(nestedCanvasBlock).toBeTruthy();
    expect(nestedCanvasBlock?.getAttribute("data-page-editor-block-depth")).toBe("2");
    expect(nestedCanvasBlock?.getAttribute("data-page-editor-block-slot-key")).toBe("column:1");
    React.act(() => {
      nestedCanvasBlock?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const nestedRow = view.container.querySelector(
      '[data-page-editor-layer-block-path="root:2/column:1:0"]'
    );
    expect(nestedRow).toBeTruthy();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockPath: "sections.0.blocks.2.slots.column:1.0",
    });
    expect(activeSurfaceState.contexts.at(-1)?.selectedBlockId).toMatch(/^blk_/);

    changeField(view.container, "Primary text", "Nested slot heading");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const columnsBlock = savedDocument.sections[0]?.blocks[2];
    expect(columnsBlock).toMatchObject({ type: "columns" });
    expect(columnsBlock?.slots?.["column:1"]?.[0]).toMatchObject({
      type: "heading",
      props: { text: "Nested slot heading" },
    });
    expect(columnsBlock?.slots?.["column:2"]).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor moves nested blocks between slots and duplicates sections with fresh nested ids", async () => {
  const nestedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-nested",
          name: "Nested section",
          blocks: [
            createPageBlockV2("columns", {
              id: "blk-columns",
              props: { count: 2, gap: 24, distribution: "equal" },
              slots: {
                "column:1": [
                  createPageBlockV2("heading", {
                    id: "blk-left",
                    props: { text: "Left nested", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = nestedPage;
  pageEditorState.currentPage = nestedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={nestedPage} />);

  try {
    await flush();

    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-block-path="root:0/column:1:0"]');
    await flush();
    clickButtonByTitle(view.container, "Move selected block to Column 2");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    let columnsBlock = savedDocument.sections[0]?.blocks[0];
    expect(columnsBlock?.slots?.["column:1"]).toEqual([]);
    expect(columnsBlock?.slots?.["column:2"]?.[0]).toMatchObject({
      id: "blk-left",
      props: { text: "Left nested" },
    });

    clickSelector(view.container, '[data-page-editor-layer-section-id="sec-nested"]');
    await flush();
    clickButtonByTitle(view.container, "Duplicate section");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections).toHaveLength(2);
    const allBlockIds = savedDocument.sections.flatMap((section) =>
      collectPageBlockIds(section.blocks)
    );
    expect(new Set(allBlockIds).size).toBe(allBlockIds.length);
    expect(savedDocument.sections[1]?.blocks[0]?.slots?.["column:2"]?.[0]?.id).not.toBe("blk-left");
  } finally {
    view.cleanup();
  }
});

test("PageEditor disables slot moves that would exceed nested subtree depth", async () => {
  const nestedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-depth-gate",
          name: "Depth gate",
          blocks: [
            createPageBlockV2("group", {
              id: "blk-source-owner",
              props: { direction: "column", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("heading", {
                    id: "blk-source-child",
                    props: { text: "Source child", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
            createPageBlockV2("group", {
              id: "blk-target-depth-1",
              props: { direction: "column", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("group", {
                    id: "blk-target-depth-2",
                    props: { direction: "column", wrap: false, gap: 16 },
                    slots: {
                      children: [
                        createPageBlockV2("group", {
                          id: "blk-target-depth-3",
                          props: { direction: "column", wrap: false, gap: 16 },
                        }),
                      ],
                    },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = nestedPage;
  pageEditorState.currentPage = nestedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={nestedPage} />);

  try {
    await flush();

    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-block-path="root:0"]');
    await flush();

    const tooDeepSlot = view.container.querySelector(
      '[data-page-editor-layer-slot-owner-path="root:1/children:0/children:0"][data-page-editor-layer-slot-key="children"]'
    );
    const moveButton = tooDeepSlot?.querySelector(
      'button[title="Move selected block to Children"]'
    ) as HTMLButtonElement | null;

    expect(moveButton).toBeTruthy();
    expect(moveButton?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("PageEditor section inserter follows owner insertable section capabilities", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();

    const sectionButtons = getCommandGroupButtons(view.container, "Sections");
    const sectionButtonLabels = new Set(
      sectionButtons.map((button) => button.querySelector("span")?.textContent ?? "")
    );
    for (const type of pageSectionTypes) {
      const hasButton = sectionButtonLabels.has(pageEditorSectionLabels[type]);
      if (pageSectionCapabilities[type].insertable) {
        expect(hasButton).toBe(true);
      } else {
        expect(pageSectionCapabilities[type].reason).toBeTruthy();
        expect(hasButton).toBe(false);
      }
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor command palette catalog is frozen to 11 sections plus 14 blocks with gated titles absent", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();

    // Read the per-button title node (first span), never dialog innerText:
    // gated words like "collection"/"embed" legitimately appear in entry
    // description copy and would produce substring false positives.
    const readEntryTitles = (groupTitle: string) =>
      getCommandGroupButtons(view.container, groupTitle).map(
        (button) => button.querySelector("span")?.textContent ?? ""
      );
    const sectionPaletteTitles = readEntryTitles("Sections");
    const blockPaletteTitles = readEntryTitles("Blocks");

    expect(sectionPaletteTitles).toEqual([
      "Hero",
      "Content",
      "Feature grid",
      "Media split",
      "Timeline",
      "Gallery",
      "Comparison",
      "FAQ",
      "Testimonials",
      "CTA",
      "Custom",
    ]);
    expect(blockPaletteTitles).toEqual([
      "Heading",
      "Text",
      "Button",
      "Image",
      "Video",
      "List",
      "Card",
      "Divider",
      "Spacer",
      "Statistic",
      "Quote",
      "Container",
      "Columns",
      "Group",
    ]);
    expect(sectionPaletteTitles.length + blockPaletteTitles.length).toBe(25);

    expect(sectionPaletteTitles).not.toContain("Template");
    expect(sectionPaletteTitles).not.toContain("Navigation");
    expect(sectionPaletteTitles).not.toContain("Collection");
    expect(sectionPaletteTitles).not.toContain("Filters");
    expect(sectionPaletteTitles).not.toContain("Lead form");
    expect(sectionPaletteTitles).not.toContain("Embed");

    expect(blockPaletteTitles).not.toContain("Gallery");
    expect(blockPaletteTitles).not.toContain("Form");
    expect(blockPaletteTitles).not.toContain("Collection");
    expect(blockPaletteTitles).not.toContain("Embed");
    expect(blockPaletteTitles).not.toContain("Icon");

    // The icon placeholder runtime path stays unreachable from authoring:
    // it is gated out of the palette above and stays non-insertable here.
    expect(pageBlockCapabilities.icon.insertable).toBe(false);
    expect(pageBlockCapabilities.icon.editorInsertable).toBe(false);
    expect(pageBlockCapabilities.icon.runtimeRenderer).toBe("placeholder");
  } finally {
    view.cleanup();
  }
});

test("PageEditor section variant control is type-scoped and base-only", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickButtonByTitle(view.container, "Layout panel");
    const variantField = findFieldControl(view.container, "Variant") as HTMLSelectElement;
    expect(Array.from(variantField.options).map((option) => option.value)).toEqual([
      "default",
      "split",
      "centered",
      "full-width",
    ]);
    expect(
      variantField
        .closest("[data-page-editor-section-variant-control]")
        ?.getAttribute("data-page-editor-section-variant-control")
    ).toBe("base");

    changeField(view.container, "Variant", "split");
    await flush();

    const content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.className).toContain("page-section-template-hero-split");
    expect(content.className).toContain("grid-cols-2");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.variant).toBe("split");
    expect(savedDocument.sections[0]?.responsive.mobile).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating toolbar labels selection, switches one panel, collapses, and tracks drag state", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    let toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("aria-label")).toBe("Hero tools");
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    expect(
      view.container
        .querySelector("[data-page-editor-toolbar-panel]")
        ?.getAttribute("data-page-editor-toolbar-panel")
    ).toBe("content");

    clickButtonByTitle(view.container, "Style panel");
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    expect(
      view.container
        .querySelector("[data-page-editor-toolbar-panel]")
        ?.getAttribute("data-page-editor-toolbar-panel")
    ).toBe("style");

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(toolbar?.getAttribute("aria-label")).toBe("Existing page copy. tools");

    clickButtonByTitle(view.container, "Collapse toolbar");
    await flush();
    toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("true");
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();

    clickButtonByTitle(view.container, "Expand toolbar");
    await flush();
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");

    const dragHandle = view.container.querySelector('button[title="Drag toolbar"]');
    React.act(() => {
      dragHandle?.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 20 })
      );
    });
    await flush();
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("data-page-editor-toolbar-dragging")).toBe("true");

    React.act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", { bubbles: true, clientX: 55, clientY: 42 })
      );
    });
    await flush();
    expect(toolbar?.style.transform).toContain("35px");
    expect(toolbar?.style.transform).toContain("22px");

    React.act(() => {
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-floating-toolbar="true"]')
        ?.getAttribute("data-page-editor-toolbar-dragging")
    ).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("PageEditor shortcuts open and close overlays, clear selection, and ignore editable fields", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    dispatchDocumentKey("k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    const commandDialog = view.container.querySelector(
      '[data-page-editor-command-dialog="viewport-safe"]'
    );
    expect(commandDialog?.className).toContain("max-h-[calc(100dvh_-_8rem)]");
    expect(commandDialog?.className).toContain("overflow-hidden");
    const commandResults = view.container.querySelector(
      '[data-page-editor-command-results-scroll="true"]'
    );
    expect(commandResults).toBeTruthy();
    expect(commandResults?.className).toContain("overflow-y-auto");
    const closeButton = Array.from(commandDialog?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.trim() === "Close"
    );
    expect(closeButton?.parentElement?.className).toContain("shrink-0");
    expect(commandResults?.contains(closeButton ?? null)).toBe(false);

    const commandSearch = view.container.querySelector(
      'input[aria-label="Search sections and blocks"]'
    );
    expect(
      view.container.querySelector('[data-page-editor-command-active="true"] span')?.textContent
    ).toBe("Hero");
    dispatchElementKey(commandSearch, "ArrowDown");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-command-active="true"] span')?.textContent
    ).toBe("Content");
    dispatchElementKey(commandSearch, "Enter");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();
    expect(view.container.textContent).toContain("content section");

    dispatchDocumentKey("k", { ctrlKey: true });
    await flush();
    const reopenedCommandSearch = view.container.querySelector(
      'input[aria-label="Search sections and blocks"]'
    );
    dispatchElementKey(reopenedCommandSearch, "Escape");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();

    const field = findFieldControl(view.container, "Primary text");
    React.act(() => {
      field.focus();
    });
    dispatchElementKey(field, "k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();
    dispatchElementKey(field, "Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor duplicate and delete shortcuts target the selected block through confirmation", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dispatchDocumentKey("d", { metaKey: true });
    await flush();
    dispatchDocumentKey("Delete");
    await flush();

    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeTruthy();
    clickButton(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks[1]?.id).toBe("blk-copy");
  } finally {
    view.cleanup();
  }
});

test("PageEditor selected block actions insert, move, duplicate, and delete only that block", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Button");
    await flush();
    clickButtonByTitle(view.container, "Move block up");
    await flush();
    clickButtonByTitle(view.container, "Duplicate block");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "button",
      "button",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks[1]?.id).not.toBe(
      savedDocument.sections[0]?.blocks[2]?.id
    );

    clickButtonByTitle(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "button",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks[2]?.id).toBe("blk-copy");
  } finally {
    view.cleanup();
  }
});

test("PageEditor button content edits write button props only", async () => {
  const buttonPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("cta", {
          id: "sec-button",
          name: "Button CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-button",
              props: {
                label: "Old label",
                href: "/old",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = buttonPage;
  pageEditorState.currentPage = buttonPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={buttonPage} />);

  try {
    await flush();

    changeField(view.container, "Primary text", "Start now");
    changeField(view.container, "Button URL", "/start");
    changeField(view.container, "Target", "blank");
    changeField(view.container, "Variant", "secondary");
    changeField(view.container, "Size", "lg");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const button = savedDocument.sections[0]?.blocks[0];

    expect(button?.props).toMatchObject({
      label: "Start now",
      href: "/start",
      target: "blank",
      variant: "secondary",
      size: "lg",
    });
    expect(button?.props).not.toHaveProperty("text");
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas button anchors select blocks without navigating", async () => {
  const buttonPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("cta", {
          id: "sec-button",
          name: "Button CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-button",
              props: {
                label: "Open link",
                href: "/old",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = buttonPage;
  pageEditorState.currentPage = buttonPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={buttonPage} />);

  try {
    await flush();

    const anchor = view.container.querySelector(
      '[data-page-editor-block-id="blk-button"] a[href="/old"]'
    );
    expect(anchor).toBeTruthy();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    let dispatchResult = true;
    React.act(() => {
      dispatchResult = anchor?.dispatchEvent(click) ?? true;
    });
    await flush();

    expect(dispatchResult).toBe(false);
    expect(click.defaultPrevented).toBe(true);
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-button",
      selectedBlockId: "blk-button",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor image controls round-trip selected block props", async () => {
  const imagePage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-image",
          name: "Image section",
          blocks: [
            createPageBlockV2("image", {
              id: "blk-image",
              props: {
                assetId: null,
                src: "/old.jpg",
                alt: "Old alt",
                caption: "Old caption",
                fit: "cover",
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = imagePage;
  pageEditorState.currentPage = imagePage;
  const view = mount(<PageEditor pageId="page-1" initialPage={imagePage} />);

  try {
    await flush();

    changeField(view.container, "Source", "/hero.jpg");
    changeField(view.container, "Alt text", "Hero image");
    changeField(view.container, "Caption", "Hero caption");
    changeField(view.container, "Fit", "contain");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const image = savedDocument.sections[0]?.blocks[0];

    expect(image?.props).toMatchObject({
      src: "/hero.jpg",
      alt: "Hero image",
      caption: "Hero caption",
      fit: "contain",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor list controls round-trip items and ordered mode", async () => {
  const listPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-list",
          name: "List section",
          blocks: [
            createPageBlockV2("list", {
              id: "blk-list",
              props: { items: ["Old"], ordered: false },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = listPage;
  pageEditorState.currentPage = listPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={listPage} />);

  try {
    await flush();

    changeField(view.container, "Items", "Discovery, Build, Launch");
    changeField(view.container, "Ordered", "yes");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const list = savedDocument.sections[0]?.blocks[0];

    expect(list?.props).toMatchObject({
      items: ["Discovery", "Build", "Launch"],
      ordered: true,
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor card, statistic, quote, divider, and spacer controls round-trip", async () => {
  const mixedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-mixed",
          name: "Mixed blocks",
          blocks: [
            createPageBlockV2("card", {
              id: "blk-card",
              props: { title: "Old card", text: "Old body", image: null, href: null },
            }),
            createPageBlockV2("statistic", {
              id: "blk-stat",
              props: { value: "1", label: "Old metric", caption: "Old caption" },
            }),
            createPageBlockV2("quote", {
              id: "blk-quote",
              props: { text: "Old quote", cite: "Old cite" },
            }),
            createPageBlockV2("divider", {
              id: "blk-divider",
              props: { tone: "neutral", thickness: 1 },
            }),
            createPageBlockV2("spacer", {
              id: "blk-spacer",
              props: { size: 32 },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = mixedPage;
  pageEditorState.currentPage = mixedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={mixedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-card"]');
    await flush();
    changeField(view.container, "Title", "Launch card");
    changeField(view.container, "Body", "Launch body");
    changeField(view.container, "Image", "/card.jpg");
    changeField(view.container, "Link URL", "/card");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-stat"]');
    await flush();
    changeField(view.container, "Value", "42");
    changeField(view.container, "Label", "Deployments");
    changeField(view.container, "Caption", "This month");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-quote"]');
    await flush();
    changeField(view.container, "Quote", "Ship the smallest useful thing.");
    changeField(view.container, "Cite", "Coderso");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-divider"]');
    await flush();
    changeField(view.container, "Tone", "accent");
    changeField(view.container, "Thickness", "4");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-spacer"]');
    await flush();
    changeField(view.container, "Size", "72");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const [card, statistic, quote, divider, spacer] = savedDocument.sections[0]?.blocks ?? [];

    expect(card?.props).toMatchObject({
      title: "Launch card",
      text: "Launch body",
      image: "/card.jpg",
      href: "/card",
    });
    expect(statistic?.props).toMatchObject({
      value: "42",
      label: "Deployments",
      caption: "This month",
    });
    expect(quote?.props).toMatchObject({
      text: "Ship the smallest useful thing.",
      cite: "Coderso",
    });
    expect(divider?.props).toMatchObject({ tone: "accent", thickness: 4 });
    expect(spacer?.props).toMatchObject({ size: 72 });
  } finally {
    view.cleanup();
  }
});

test("PageEditor surfaces bounded autosave errors", async () => {
  vi.useFakeTimers();
  pageEditorState.autosavePage.mockRejectedValueOnce({
    kind: "api",
    message: "Autosave rejected",
  });
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
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Autosave paused");
    expect(view.container.textContent).toContain("Autosave rejected");
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
