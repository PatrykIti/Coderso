// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor, resolveToolbarTargetLabel } from "../../../core/admin/ui/pages/PageEditor";
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
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { toPageTypographyCssVariableMap } from "../../../core/ui/theme/tokenCss";

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

const mediaLibraryState = vi.hoisted(() => ({
  items: [
    { id: "asset-hero", url: "/hero.jpg", type: "image", mimeType: "image/jpeg" },
    { id: "asset-card", url: "/card.jpg", type: "image", mimeType: "image/jpeg" },
  ],
}));

// Admin settings payload backing the canvas site-token variables ("design.tokens").
const siteSettingsState = vi.hoisted(() => ({
  settings: null as Record<string, unknown> | null,
  reset() {
    siteSettingsState.settings = null;
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
    settingsRedacted: "settings:redacted",
  },
  cacheTtlMs: {
    list: 300_000,
    detail: 300_000,
  },
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: () => siteSettingsState.settings,
  getSettingsCached: async () => siteSettingsState.settings ?? {},
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

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: () => mediaLibraryState.items,
  listMediaCached: async () => mediaLibraryState.items,
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value, onChange }: { value: unknown; onChange: (next: unknown) => void }) => (
    <div
      data-shared-media-picker="true"
      data-media-picker-value={value == null ? "" : String(value)}
    >
      {mediaLibraryState.items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-media-picker-option={item.id}
          onClick={() => onChange(item.id)}
        >
          {item.id}
        </button>
      ))}
      <button type="button" data-media-picker-clear="true" onClick={() => onChange(null)}>
        Clear media
      </button>
    </div>
  ),
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: (props: {
    open: boolean;
    title: string;
    subtitle?: string;
    canPreview: boolean;
    previewUrl: string | null;
    probeResult?: { ok: boolean; targetLabel?: string } | null;
    device?: string;
    onFixPreviewTarget?: () => void;
    fixPreviewTargetLabel?: string;
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

/**
 * Toolbar icon buttons carry their metadata label as `aria-label`; the hover
 * description renders through the shared tooltip component, not `title`.
 */
const clickButtonByLabel = (container: ParentNode, label: string) => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
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
  const field = Array.from(container.querySelectorAll("[data-page-editor-responsive-field]")).find(
    (entry) =>
      entry.querySelector(`[aria-label="${labelText}"]`) ||
      Array.from(entry.querySelectorAll("label, span")).some(
        (node) => node.textContent === labelText
      )
  );
  expect(field).toBeTruthy();
  return field as HTMLElement;
};

const findSegmentedGroup = (container: ParentNode, label: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="segmented"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group).toBeTruthy();
  return group as HTMLElement;
};

const clickSegmentedOption = (container: ParentNode, label: string, option: string) => {
  const group = findSegmentedGroup(container, label);
  const button = group.querySelector(`[data-page-editor-segmented-option="${option}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findColorSwatchGroup = (container: ParentNode, label: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="color-swatch"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group).toBeTruthy();
  return group as HTMLElement;
};

const clickColorSwatch = (container: ParentNode, label: string, swatchId: string) => {
  const swatch = findColorSwatchGroup(container, label).querySelector(
    `[data-page-editor-color-swatch="${swatchId}"]`
  );
  expect(swatch).toBeTruthy();
  React.act(() => {
    swatch?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setToggleField = (container: ParentNode, label: string, next: boolean) => {
  const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
    (entry) => entry.getAttribute("aria-label") === label
  );
  expect(toggle).toBeTruthy();
  if (toggle?.getAttribute("aria-checked") === String(next)) return;
  React.act(() => {
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setSliderField = (container: ParentNode, label: string, value: string) => {
  const slider = container.querySelector(
    `input[type="range"][data-page-editor-slider="${label}"]`
  ) as HTMLInputElement | null;
  expect(slider).toBeTruthy();
  React.act(() => {
    if (!slider) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(slider, value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const commitColorHex = (container: ParentNode, label: string, hex: string) => {
  const input = container.querySelector(
    `input[data-page-editor-color-hex="${label}"]`
  ) as HTMLInputElement | null;
  expect(input).toBeTruthy();
  React.act(() => {
    if (!input) return;
    input.value = hex;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
};

const selectMediaAsset = (container: ParentNode, label: string, assetId: string) => {
  const control = container.querySelector(`[data-page-editor-media-control="${label}"]`);
  const option = control?.querySelector(`[data-media-picker-option="${assetId}"]`);
  expect(option).toBeTruthy();
  React.act(() => {
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
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
  siteSettingsState.reset();
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
    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "2");
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

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "2");
    setSliderField(view.container, "Max width", "900");
    await flush();

    const columnsField = findResponsiveField(view.container, "Columns");
    expect(columnsField.dataset.pageEditorResponsiveField).toBe("override");
    expect(findResponsiveField(view.container, "Max width").dataset.pageEditorResponsiveField).toBe(
      "override"
    );
    expect(
      view.container
        .querySelector('[data-page-editor-section="hero"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("override");

    // The override badge and per-control reset affordance carry tooltip
    // metadata and an accessible reset-to-inherited name.
    const overrideBadge = columnsField.querySelector(
      '[data-page-editor-responsive-badge="override"]'
    );
    expect(overrideBadge?.textContent).toBe("Override");
    expect(overrideBadge?.getAttribute("data-slot")).toBe("tooltip-trigger");
    const resetButton = columnsField.querySelector(
      'button[aria-label="Reset Columns to inherited"]'
    );
    expect(resetButton?.getAttribute("data-slot")).toBe("tooltip-trigger");
    expect(resetButton?.textContent).toContain("Reset");

    clickResponsiveReset(view.container, "Columns");
    await flush();

    const resetColumnsField = findResponsiveField(view.container, "Columns");
    expect(resetColumnsField.dataset.pageEditorResponsiveField).toBe("inherited");
    expect(
      resetColumnsField.querySelector('[data-page-editor-responsive-badge="inherited"]')
        ?.textContent
    ).toBe("Inherited");
    expect(
      resetColumnsField.querySelector('button[aria-label="Reset Columns to inherited"]')
    ).toBeNull();
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

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "3");
    clickSegmentedOption(view.container, "Justify", "between");
    await flush();

    let content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.dataset.pageSectionLayoutMode).toBe("canvas-device");
    expect(content.className).toContain("grid-cols-3");
    expect(content.className).not.toContain("md:grid-cols-3");
    expect(content.className).toContain("justify-between");

    clickButtonByLabel(view.container, "Style panel");
    clickSegmentedOption(view.container, "Shadow", "lg");
    await flush();

    content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.style.boxShadow).toBe("0 22px 60px rgba(15, 23, 42, 0.16)");

    clickButtonByLabel(view.container, "Background panel");
    clickSegmentedOption(view.container, "Background type", "image");
    selectMediaAsset(view.container, "Background image", "asset-hero");
    await flush();

    content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.style.backgroundImage).toContain("/hero.jpg");

    clickButtonByLabel(view.container, "Visibility panel");
    setToggleField(view.container, "Auth only", true);
    changeField(view.container, "Anchor", "hero-top");
    setToggleField(view.container, "Date range", true);
    await flush();
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

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Justify", "between");
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

    clickButtonByLabel(view.container, "Visibility panel");
    setToggleField(view.container, "Visible", false);
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

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Width", "full");
    clickSegmentedOption(view.container, "Align", "center");
    await flush();

    clickButtonByLabel(view.container, "Style panel");
    commitColorHex(view.container, "Text color", "#123456");
    setSliderField(view.container, "Opacity", "0.5");
    setSliderField(view.container, "Radius", "18");
    clickSegmentedOption(view.container, "Shadow", "md");
    commitColorHex(view.container, "Border color", "#334155");
    await flush();

    clickButtonByLabel(view.container, "Background panel");
    clickSegmentedOption(view.container, "Background type", "color");
    commitColorHex(view.container, "Background", "#fef3c7");
    await flush();

    clickButtonByLabel(view.container, "Spacing panel");
    setSliderField(view.container, "Padding top", "12");
    setSliderField(view.container, "Padding right", "14");
    setSliderField(view.container, "Margin bottom", "10");
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

test("PageEditor wide segmented option sets scroll inside their panel cell", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Section Layout panel: Align/Justify strips must scroll horizontally
    // instead of widening the auto-fit grid cell over the neighbor column.
    clickButtonByLabel(view.container, "Layout panel");
    for (const label of ["Align", "Justify"]) {
      const group = findSegmentedGroup(view.container, label);
      expect(group.className, label).toContain("overflow-x-auto");
      expect(group.className, label).toContain("flex-nowrap");
      expect(group.className, label).toContain("snap-x");
      const cell = group.closest("[data-page-editor-responsive-field]");
      expect(cell?.className, label).toContain("min-w-0");
    }

    // Heading Content panel: the Level set (h1-h6) renders as the same
    // scrollable segmented strip with every option reachable.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Content panel");
    const level = findSegmentedGroup(view.container, "Level");
    expect(
      Array.from(level.querySelectorAll("[data-page-editor-segmented-option]")).map(
        (option) => (option as HTMLElement).dataset.pageEditorSegmentedOption
      )
    ).toEqual(["h1", "h2", "h3", "h4", "h5", "h6"]);
    expect(level.className).toContain("overflow-x-auto");
    expect(level.className).toContain("flex-nowrap");
    expect(level.closest("[data-page-editor-responsive-field]")?.className).toContain("min-w-0");
    for (const option of Array.from(
      level.querySelectorAll<HTMLButtonElement>("[data-page-editor-segmented-option]")
    )) {
      expect(option.className).toContain("shrink-0");
      expect(option.className).toContain("snap-start");
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor transparent swatch clears stored block colors but stays off for sections", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Base section colors are non-nullable in pageDocumentV2, so section
    // color controls must not offer the transparent swatch.
    clickButtonByLabel(view.container, "Style panel");
    expect(
      findColorSwatchGroup(view.container, "Accent").querySelector(
        '[data-page-editor-color-swatch="transparent"]'
      )
    ).toBeNull();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    commitColorHex(view.container, "Text color", "#123456");
    await flush();
    expect(
      findEditorBlock(view.container, "blk-copy").style.getPropertyValue("--coderso-block-text")
    ).toBe("#123456");

    clickColorSwatch(view.container, "Text color", "transparent");
    await flush();

    const block = findEditorBlock(view.container, "blk-copy");
    expect(block.style.getPropertyValue("--coderso-block-text")).toBe("");
    expect(block.style.color).toBe("");
    expect(
      findColorSwatchGroup(view.container, "Text color")
        .querySelector('[data-page-editor-color-swatch="transparent"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find((entry) => entry.id === "blk-copy");
    // The cleared color is stored as the explicit null the normalizer keeps.
    expect(savedBlock?.style?.textColor).toBeNull();
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
    clickButtonByLabel(view.container, "Visibility panel");
    setToggleField(view.container, "Visible", false);
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

    clickButtonByLabel(view.container, "Add block to Column 1");
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
    clickButtonByLabel(view.container, "Move selected block to Column 2");
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
    clickButtonByLabel(view.container, "Duplicate section");
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

    clickButtonByLabel(view.container, "Layout panel");
    const variantControl = view.container.querySelector(
      '[data-page-editor-section-variant-control="base"]'
    );
    expect(variantControl).toBeTruthy();
    // The variant preset renders segmented pills, never a native select.
    expect(variantControl?.querySelector("select")).toBeNull();
    expect(
      Array.from(
        variantControl?.querySelectorAll<HTMLButtonElement>(
          "[data-page-editor-segmented-option]"
        ) ?? []
      ).map((button) => button.dataset.pageEditorSegmentedOption)
    ).toEqual(["default", "split", "centered", "full-width"]);

    clickSegmentedOption(view.container, "Variant", "split");
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

test("PageEditor hero and button inspector panels render dedicated widgets with no native selects", async () => {
  const buttonPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-button",
              props: { label: "Go", href: "/go", target: "self", variant: "primary", size: "md" },
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

    const panelEl = () => {
      const panel = view.container.querySelector("[data-page-editor-toolbar-panel]");
      expect(panel).toBeTruthy();
      return panel as HTMLElement;
    };
    const countWidgets = (kind: string) =>
      panelEl().querySelectorAll(`[data-page-editor-control="${kind}"]`).length;

    // Section panels (hero selected, no block selection).
    clickButtonByLabel(view.container, "Layout panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("segmented")).toBeGreaterThan(0); // columns, align, justify, variant
    expect(countWidgets("slider-stepper")).toBeGreaterThan(0); // max width

    clickButtonByLabel(view.container, "Style panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("color-swatch")).toBeGreaterThan(0); // accent
    expect(countWidgets("slider")).toBeGreaterThan(0); // radius
    expect(countWidgets("segmented")).toBeGreaterThan(0); // shadow

    clickButtonByLabel(view.container, "Background panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("segmented")).toBeGreaterThan(0); // background type
    expect(countWidgets("color-swatch")).toBeGreaterThan(0); // background color
    expect(countWidgets("media")).toBeGreaterThan(0); // background image

    clickButtonByLabel(view.container, "Spacing panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("slider-stepper")).toBeGreaterThan(0); // paddings, gap

    clickButtonByLabel(view.container, "Visibility panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("toggle")).toBeGreaterThan(0); // visible, auth only, date range

    // The Responsive panel renders its dedicated control content (TASK-425):
    // the breakpoint-state readout, per-breakpoint hide toggles, and the
    // section vertical-layout toggle — all role="switch" widgets, no natives.
    clickButtonByLabel(view.container, "Responsive panel");
    expect(panelEl().querySelector("[data-page-editor-responsive-target-state]")).toBeTruthy();
    expect(countWidgets("toggle")).toBe(4); // hide desktop/tablet/mobile + stack vertically
    expect(panelEl().querySelectorAll('[role="switch"]')).toHaveLength(4);
    expect(panelEl().querySelector("[data-page-editor-responsive-override-list]")).toBeTruthy();
    expect(panelEl().querySelectorAll("input, select")).toHaveLength(0);

    // Button block panels.
    clickSelector(view.container, '[data-page-editor-block-id="blk-button"]');
    await flush();
    clickButtonByLabel(view.container, "Content panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("segmented")).toBeGreaterThan(0); // target, variant, size
    expect(countWidgets("text")).toBeGreaterThan(0); // label and href stay free-form text

    clickButtonByLabel(view.container, "Style panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("color-swatch")).toBeGreaterThan(0); // text color, border color
    expect(countWidgets("slider")).toBeGreaterThan(0); // opacity, radius
    expect(countWidgets("segmented")).toBeGreaterThan(0); // shadow

    clickButtonByLabel(view.container, "Visibility panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("toggle")).toBeGreaterThan(0); // visible
  } finally {
    view.cleanup();
  }
});

test("PageEditor typography panel appears only for text-capable block selections", async () => {
  const mixedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-typo-matrix",
          name: "Typography matrix",
          blocks: [
            createPageBlockV2("heading", { id: "blk-h" }),
            createPageBlockV2("text", { id: "blk-t" }),
            createPageBlockV2("button", { id: "blk-b" }),
            createPageBlockV2("quote", { id: "blk-q", props: { text: "Quoted", cite: "" } }),
            createPageBlockV2("statistic", { id: "blk-s" }),
            createPageBlockV2("list", { id: "blk-l", props: { items: ["One"], ordered: false } }),
            createPageBlockV2("card", { id: "blk-c" }),
            createPageBlockV2("image", { id: "blk-i" }),
            createPageBlockV2("divider", { id: "blk-d" }),
            createPageBlockV2("spacer", { id: "blk-sp" }),
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

    const typographyButton = () =>
      view.container.querySelector('button[aria-label="Typography panel"]');

    // Section selections never expose the Typography panel (no consolidated
    // section text surface by owner contract).
    expect(typographyButton()).toBeNull();

    for (const blockId of ["blk-h", "blk-t", "blk-b", "blk-q", "blk-s", "blk-l", "blk-c"]) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();
      expect(typographyButton(), blockId).toBeTruthy();
    }

    for (const blockId of ["blk-i", "blk-d", "blk-sp"]) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();
      expect(typographyButton(), blockId).toBeNull();
    }

    // An open Typography panel closes when the selection moves to a target
    // that does not support it, instead of rendering invalid controls.
    clickSelector(view.container, '[data-page-editor-block-id="blk-h"]');
    await flush();
    clickButtonByLabel(view.container, "Typography panel");
    expect(
      view.container.querySelector('[data-page-editor-toolbar-panel="typography"]')
    ).toBeTruthy();
    clickSelector(view.container, '[data-page-editor-block-id="blk-i"]');
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-toolbar-panel="typography"]')
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor typography panel renders dedicated widgets, paints the text node, and saves token values", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Typography panel");

    const panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    expect(panel).toBeTruthy();

    // Dedicated widgets only: no native selects, no raw text inputs.
    expect(panel.querySelectorAll("select")).toHaveLength(0);
    expect(panel.querySelectorAll('[data-page-editor-control="text"]')).toHaveLength(0);
    expect(panel.querySelectorAll('input[type="number"]')).toHaveLength(0);
    for (const label of ["Font family", "Font size", "Font weight", "Text align"]) {
      expect(findSegmentedGroup(panel, label)).toBeTruthy();
    }
    for (const label of ["Line height", "Letter spacing"]) {
      expect(
        panel.querySelector(`[data-page-editor-slider-stepper="${label}"]`),
        label
      ).toBeTruthy();
    }

    clickSegmentedOption(panel, "Font family", "display");
    clickSegmentedOption(panel, "Font size", "2xl");
    clickSegmentedOption(panel, "Font weight", "bold");
    clickSegmentedOption(panel, "Text align", "right");
    setSliderField(view.container, "Line height", "1.4");
    setSliderField(view.container, "Letter spacing", "2");
    await flush();

    // The canvas paints the values inline on the same heading node the front
    // renders, beating the baked level classes.
    const heading = findEditorBlock(view.container, "blk-heading").querySelector(
      "h1"
    ) as HTMLElement;
    expect(heading).toBeTruthy();
    expect(heading.style.fontFamily).toContain("var(--font-display");
    expect(heading.style.fontWeight).toBe("700");
    expect(heading.style.lineHeight).toBe("1.4");
    expect(heading.style.letterSpacing).toBe("2px");
    expect(heading.className).toContain("text-right");
    // happy-dom's CSS validator drops `var()` values for font-size, so the
    // inline font-size paint is asserted by the shared-renderer suite
    // (page-renderer-v2.test.tsx) which covers the same node markup; here the
    // stored token is asserted through the save payload below.

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find(
      (block) => block.id === "blk-heading"
    );
    // Token values persist in the schema-owned style fields.
    expect(savedBlock?.style).toMatchObject({
      fontFamily: "display",
      fontSize: "2xl",
      fontWeight: "bold",
      lineHeight: 1.4,
      letterSpacing: 2,
    });
    // The relocated Text align presentation keeps the legacy stored path:
    // heading text alignment stays in props.align, not style.align.
    expect(savedBlock?.props.align).toBe("right");
    expect(savedBlock?.style?.align).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor typography Text align edited on tablet writes a tablet props override, not the base", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Smoke repro (phase2 anomaly #1): select the heading, switch the canvas
    // device to Tablet, then set Text align — the edit must create a
    // responsive.tablet props override exactly like Font size does, never a
    // base write.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    clickButtonByLabel(view.container, "Typography panel");

    let panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    expect(panel).toBeTruthy();
    const alignFieldOf = (root: HTMLElement) =>
      findSegmentedGroup(root, "Text align").closest(
        "[data-page-editor-responsive-field]"
      ) as HTMLElement;
    expect(alignFieldOf(panel).getAttribute("data-page-editor-responsive-field")).toBe("inherited");

    // The exact smoke gesture: the base align IS "center", and the operator
    // clicks "center" on tablet. The explicit choice must PIN the inherited
    // value as a tablet override (the same gesture on Font size created one),
    // never no-op and never write the base.
    clickSegmentedOption(panel, "Text align", "center");
    await flush();

    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    let alignField = alignFieldOf(panel);
    // Badge flips Inherited -> Override and exposes the reset affordance.
    expect(alignField.getAttribute("data-page-editor-responsive-field")).toBe("override");
    expect(alignField.querySelector('[data-page-editor-responsive-badge="override"]')).toBeTruthy();
    expect(
      alignField.querySelector('button[aria-label="Reset Text align to inherited"]')
    ).toBeTruthy();

    clickButton(view.container, "Save");
    await flush();
    let saved = lastSavedDocument();
    let heading = saved.sections[0]?.blocks[0];
    // Base align untouched; the tablet override container carries the edit.
    expect(heading?.props.align).toBe("center");
    expect(heading?.responsive?.tablet?.props).toEqual({ align: "center" });

    // Reset restores inheritance and removes the override container.
    clickSelector(view.container, 'button[aria-label="Reset Text align to inherited"]');
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    heading = saved.sections[0]?.blocks[0];
    expect(heading?.props.align).toBe("center");
    expect(heading?.responsive?.tablet).toBeUndefined();

    // A diverging value follows the same device-scoped props container.
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    clickSegmentedOption(panel, "Text align", "left");
    await flush();
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    alignField = alignFieldOf(panel);
    expect(alignField.getAttribute("data-page-editor-responsive-field")).toBe("override");
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    heading = saved.sections[0]?.blocks[0];
    expect(heading?.props.align).toBe("center");
    expect(heading?.responsive?.tablet?.props).toEqual({ align: "left" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas frame anchors site typography token variables for WYSIWYG parity with the front", async () => {
  // No cached/fetched settings: the canvas must carry the documented
  // DEFAULT_TOKENS fallbacks so `var(--text-*)` resolves the same values the
  // front emits for a default token set — never the admin-theme `--text-*`
  // scale painted on the admin `:root`.
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame).toBeTruthy();
    for (const [variable, value] of Object.entries(
      toPageTypographyCssVariableMap(DEFAULT_TOKENS)
    )) {
      expect(frame.style.getPropertyValue(variable), variable).toBe(value);
    }
    expect(frame.style.getPropertyValue("--text-sm")).toBe("0.875rem");
    expect(frame.style.getPropertyValue("--text-5xl")).toBe("3rem");
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas frame paints the resolved site design.tokens typography over the defaults", async () => {
  siteSettingsState.settings = {
    "design.tokens": {
      typography: { sm: "1.125rem", "5xl": "3.5rem" },
    },
  };
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame.style.getPropertyValue("--text-sm")).toBe("1.125rem");
    expect(frame.style.getPropertyValue("--text-5xl")).toBe("3.5rem");
    // Untouched tokens keep the DEFAULT_TOKENS anchor.
    expect(frame.style.getPropertyValue("--text-md")).toBe("1rem");
    expect(frame.style.getPropertyValue("--font-sans")).toBe(DEFAULT_TOKENS.typography.sans);
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

    clickButtonByLabel(view.container, "Style panel");
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
    // Type display name only — block content ("Existing page copy.") must not
    // leak into the toolbar aria text (TASK-451-02-L01 label contract).
    expect(toolbar?.getAttribute("aria-label")).toBe("Text tools");

    clickButtonByLabel(view.container, "Collapse toolbar");
    await flush();
    toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("true");
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();

    clickButtonByLabel(view.container, "Expand toolbar");
    await flush();
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");

    const dragHandle = view.container.querySelector('button[aria-label="Drag toolbar"]');
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

test("resolveToolbarTargetLabel resolves type display names and never block content", () => {
  expect(resolveToolbarTargetLabel({ kind: "block", type: "text" })).toBe("Text");
  expect(resolveToolbarTargetLabel({ kind: "block", type: "statistic" })).toBe("Statistic");
  expect(resolveToolbarTargetLabel({ kind: "block", type: "quote" })).toBe("Quote");
  expect(resolveToolbarTargetLabel({ kind: "section", type: "hero" })).toBe("Hero");
  expect(
    resolveToolbarTargetLabel(
      { kind: "section", type: "feature-grid" },
      {
        fallbackToTypeName: true,
      }
    )
  ).toBe("Feature grid");
  expect(resolveToolbarTargetLabel(null)).toBe("Page");
});

test("PageEditor toolbar aria labels use type names for text, statistic, and quote blocks", async () => {
  pageEditorState.cachedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("text", {
              id: "blk-text",
              props: { text: "Write the section copy here.", format: "plain" },
            }),
            createPageBlockV2("statistic", {
              id: "blk-stat",
              props: { value: "0" },
            }),
            createPageBlockV2("quote", {
              id: "blk-quote",
              props: { text: "Customer praise quote." },
            }),
          ],
        }),
      ],
    }),
  });
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const toolbarLabel = () =>
      view.container
        .querySelector('[data-page-editor-floating-toolbar="true"]')
        ?.getAttribute("aria-label");

    clickSelector(view.container, '[data-page-editor-section="hero"]');
    await flush();
    expect(toolbarLabel()).toBe("Hero tools");

    const expectations: Array<[string, string]> = [
      ["blk-text", "Text tools"],
      ["blk-stat", "Statistic tools"],
      ["blk-quote", "Quote tools"],
    ];
    for (const [blockId, expected] of expectations) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();
      expect(toolbarLabel()).toBe(expected);
    }

    // Placeholder/user copy never leaks into the toolbar aria text.
    expect(toolbarLabel()).not.toContain("Customer praise quote.");
    const toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(toolbar?.getAttribute("aria-label")).not.toContain("Write the section copy here.");
    expect(toolbar?.getAttribute("aria-label")).not.toBe("0 tools");
  } finally {
    view.cleanup();
  }
});

test("PageEditor per-gap insert zones open the palette pre-targeted and insert at the gap index", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // The persistent top-of-canvas button stays alongside the per-gap zones.
    expect(findButton(view.container, "Add section")).toBeTruthy();
    // One section renders a gap above (0) and below (1).
    expect(view.container.querySelector('[data-page-editor-section-gap="0"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-editor-section-gap="1"]')).toBeTruthy();

    // Insert at the gap ABOVE the existing hero section.
    clickButtonByLabel(view.container, "Add section at position 1");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickButton(view.container, "FAQ");
    await flush();

    // Insert at the trailing gap (now index 2) below the last section.
    clickButtonByLabel(view.container, "Add section at position 3");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    // The top button still appends (gap pre-targeting resets between opens).
    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections.map((section) => section.type)).toEqual([
      "faq",
      "hero",
      "cta",
      "content",
    ]);
    expect(savedDocument.sections[1]?.id).toBe("sec-hero");
  } finally {
    view.cleanup();
  }
});

test("PageEditor toolbar panel icons expose metadata tooltips and toggle a single subpanel", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Every category icon renders through the shared tooltip component with a
    // metadata-driven accessible name; no ad hoc `title` strings remain.
    const panelLabels = [
      "Layout panel",
      "Content panel",
      "Style panel",
      "Background panel",
      "Spacing panel",
      "Responsive panel",
      "Visibility panel",
    ];
    for (const label of panelLabels) {
      const button = view.container.querySelector(`button[aria-label="${label}"]`);
      expect(button).toBeTruthy();
      expect(button?.getAttribute("data-slot")).toBe("tooltip-trigger");
      expect(button?.hasAttribute("title")).toBe(false);
    }
    for (const label of ["Drag toolbar", "Collapse toolbar", "Duplicate section"]) {
      expect(
        view.container.querySelector(`button[aria-label="${label}"]`)?.getAttribute("data-slot")
      ).toBe("tooltip-trigger");
    }

    // Focus (keyboard hover) reveals the metadata description in the tooltip.
    const layoutButton = view.container.querySelector('button[aria-label="Layout panel"]');
    React.act(() => {
      (layoutButton as HTMLButtonElement).focus();
      layoutButton?.dispatchEvent(new FocusEvent("focus"));
    });
    await flush();
    const tooltipContent = document.querySelector('[data-slot="tooltip-content"]');
    expect(tooltipContent?.textContent).toContain(
      "Variant, columns, alignment, and max width presets."
    );

    // Content opens by default and only one subpanel exists at a time.
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    const panelExpanded = (label: string) =>
      view.container.querySelector(`button[aria-label="${label}"]`)?.getAttribute("aria-expanded");
    expect(panelExpanded("Content panel")).toBe("true");
    expect(panelExpanded("Layout panel")).toBe("false");

    // Clicking the active icon closes its subpanel.
    clickButtonByLabel(view.container, "Content panel");
    await flush();
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();
    expect(panelExpanded("Content panel")).toBe("false");

    // Clicking another icon opens exactly one subpanel for that category.
    clickButtonByLabel(view.container, "Visibility panel");
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    expect(
      view.container
        .querySelector("[data-page-editor-toolbar-panel]")
        ?.getAttribute("data-page-editor-toolbar-panel")
    ).toBe("visibility");
    expect(panelExpanded("Visibility panel")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("PageEditor subpanel stays viewport-bounded with a sticky header and close action", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    await flush();

    const subpanel = view.container.querySelector('[data-page-editor-subpanel="viewport-safe"]');
    expect(subpanel).toBeTruthy();
    expect(subpanel?.className).toContain("max-h-[min(72vh,calc(100dvh-8rem))]");
    expect(subpanel?.className).toContain("overflow-hidden");

    const header = subpanel?.querySelector('[data-page-editor-subpanel-header="true"]');
    expect(header?.className).toContain("shrink-0");
    expect(header?.textContent).toContain("Layout");
    expect(header?.textContent).toContain("Variant, columns, alignment, and max width presets.");

    const scrollBody = subpanel?.querySelector('[data-page-editor-subpanel-scroll="true"]');
    expect(scrollBody?.className).toContain("overflow-y-auto");
    expect(scrollBody?.querySelectorAll("[data-page-editor-control]").length).toBeGreaterThan(0);

    // The close action lives in the sticky header, outside the scroll body.
    const closeButton = subpanel?.querySelector('button[aria-label="Close panel"]');
    expect(closeButton).toBeTruthy();
    expect(header?.contains(closeButton ?? null)).toBe(true);
    expect(scrollBody?.contains(closeButton ?? null)).toBe(false);

    clickButtonByLabel(view.container, "Close panel");
    await flush();
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
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
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    clickButtonByLabel(view.container, "Duplicate block");
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

    clickButtonByLabel(view.container, "Delete block");
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
    clickSegmentedOption(view.container, "Target", "blank");
    clickSegmentedOption(view.container, "Variant", "secondary");
    clickSegmentedOption(view.container, "Size", "lg");
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

    selectMediaAsset(view.container, "Source", "asset-hero");
    await flush();
    changeField(view.container, "Alt text", "Hero image");
    changeField(view.container, "Caption", "Hero caption");
    clickSegmentedOption(view.container, "Fit", "contain");
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
    setToggleField(view.container, "Ordered", true);
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

// TASK-442-01-L01 empty-list persistence pin at the editor flow layer: the
// audited UX trap was a freshly inserted (still empty) list vanishing from the
// saved document. Schema-layer pins live in page-document-v2-block-roundtrip;
// this pin proves the editor save payload keeps the default `items: []` block.
test("PageEditor save keeps a freshly inserted empty list block in the document", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    const listEntry = getCommandGroupButtons(view.container, "Blocks").find(
      (button) => button.querySelector("span")?.textContent === "List"
    );
    expect(listEntry).toBeTruthy();
    React.act(() => {
      listEntry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // Save immediately, before the author types any items.
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedList = savedDocument.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.type === "list");
    expect(savedList?.props).toMatchObject({ items: [], ordered: false });
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
    selectMediaAsset(view.container, "Image", "asset-card");
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
    clickSegmentedOption(view.container, "Tone", "accent");
    setSliderField(view.container, "Thickness", "4");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-spacer"]');
    await flush();
    setSliderField(view.container, "Size", "72");
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
      subtitle: "Runtime preview of the saved draft (read-only, site theme).",
      canPreview: true,
      previewUrl: "https://preview.test/page-1",
      device: "desktop",
      fixPreviewTargetLabel: "Retry preview",
    });
    // The unavailable placeholder exposes a retry affordance that re-runs the
    // preview issuance flow instead of leaving a dead end.
    const previewCallsBeforeRetry = pageEditorState.previewPage.mock.calls.length;
    const latestDialogProps = previewDialogState.latest as {
      onFixPreviewTarget?: () => void;
    };
    expect(typeof latestDialogProps.onFixPreviewTarget).toBe("function");
    await React.act(async () => {
      latestDialogProps.onFixPreviewTarget?.();
      await Promise.resolve();
    });
    await flush();
    expect(pageEditorState.previewPage.mock.calls.length).toBe(previewCallsBeforeRetry + 1);

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

const findInlineEditRegion = (container: ParentNode, blockId: string, propPath: string) => {
  const region = container.querySelector(
    `[data-page-editor-block-id="${blockId}"] [data-page-editor-inline-edit-prop="${propPath}"]`
  );
  expect(region).toBeTruthy();
  return region as HTMLElement;
};

const dblClickElement = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });
};

const blurElement = (element: HTMLElement) => {
  React.act(() => {
    element.blur();
  });
};

const setInlineRegionText = (element: HTMLElement, value: string) => {
  React.act(() => {
    element.textContent = value;
  });
};

test("PageEditor canvas dblclick enters inline edit and typing plus blur updates the panel field", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Without a selection, double-click stays idle: single click only selects.
    const idleRegion = findInlineEditRegion(view.container, "blk-heading", "text");
    expect(idleRegion.getAttribute("data-page-editor-inline-edit")).toBe("idle");
    expect(idleRegion.getAttribute("contenteditable")).toBeNull();
    dblClickElement(idleRegion);
    await flush();
    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const activeRegion = findInlineEditRegion(view.container, "blk-heading", "text");
    expect(activeRegion.getAttribute("data-page-editor-inline-edit")).toBe("active");
    expect(activeRegion.getAttribute("contenteditable")).toBe("true");
    expect(document.activeElement).toBe(activeRegion);

    setInlineRegionText(activeRegion, "Inline headline");
    blurElement(activeRegion);
    await flush();

    // Panel and canvas re-render from the same document state: no refetch.
    expect(findFieldControl(view.container, "Primary text").value).toBe("Inline headline");
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-heading"]')?.textContent
    ).toContain("Inline headline");
    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");
    expect(view.container.textContent).toContain("Unsaved");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props).toMatchObject({
      text: "Inline headline",
      level: "h1",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit commits on Escape and keeps the block selected", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-copy", "text");
    setInlineRegionText(region, "Escape committed copy");
    dispatchElementKey(region, "Escape");
    await flush();

    const committedRegion = findInlineEditRegion(view.container, "blk-copy", "text");
    expect(committedRegion.getAttribute("data-page-editor-inline-edit")).toBe("idle");
    expect(committedRegion.textContent).toBe("Escape committed copy");
    expect(findFieldControl(view.container, "Primary text").value).toBe("Escape committed copy");

    // Escape inside the region commits only: block stays selected, toolbar open.
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-copy"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("PageEditor single-line inline edit commits on Enter without inserting newlines", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    setInlineRegionText(region, "Enter committed headline");
    dispatchElementKey(region, "Enter");
    await flush();

    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props.text).toBe("Enter committed headline");
  } finally {
    view.cleanup();
  }
});

test("PageEditor Enter on a selected block opens inline edit on its first text target", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dispatchDocumentKey("Enter");
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    expect(region.getAttribute("data-page-editor-inline-edit")).toBe("active");
    expect(region.getAttribute("contenteditable")).toBe("true");
    expect(document.activeElement).toBe(region);

    setInlineRegionText(region, "Keyboard entered headline");
    blurElement(region);
    await flush();
    expect(findFieldControl(view.container, "Primary text").value).toBe(
      "Keyboard entered headline"
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor suppresses Delete, Backspace, and Ctrl+K hotkeys while inline editing", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    dispatchElementKey(region, "Delete");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeNull();

    dispatchElementKey(region, "Backspace");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeNull();

    dispatchElementKey(region, "k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();

    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("active");
  } finally {
    view.cleanup();
  }
});

test("PageEditor never renders contentEditable for image, divider, or spacer blocks", async () => {
  const mediaPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-media",
          name: "Media",
          blocks: [
            createPageBlockV2("image", {
              id: "blk-image",
              props: { src: "https://cdn.test/a.jpg", alt: "Alt", caption: "Caption" },
            }),
            createPageBlockV2("divider", { id: "blk-divider" }),
            createPageBlockV2("spacer", { id: "blk-spacer" }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = mediaPage;
  pageEditorState.currentPage = mediaPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={mediaPage} />);

  try {
    await flush();

    for (const blockId of ["blk-image", "blk-divider", "blk-spacer"]) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();

      const frame = findEditorBlock(view.container, blockId);
      expect(frame.querySelector("[contenteditable]")).toBeNull();
      expect(frame.querySelector("[data-page-editor-inline-edit]")).toBeNull();

      dispatchDocumentKey("Enter");
      await flush();
      expect(view.container.querySelector('[data-page-editor-inline-edit="active"]')).toBeNull();
      expect(view.container.querySelector("[contenteditable='true']")).toBeNull();
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit blur without changes is a no-op for dirty state", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    blurElement(region);
    await flush();

    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");
    expect(view.container.textContent).not.toContain("Unsaved");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit commits sanitized plain text and never writes markup", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-copy", "text");
    React.act(() => {
      region.innerHTML = "Pasted <b>rich</b> content";
    });
    blurElement(region);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const committed = savedDocument.sections[0]?.blocks[1]?.props.text;
    expect(committed).toBe("Pasted rich content");
    expect(String(committed)).not.toContain("<");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit commit follows moved blocks by id and skips deleted blocks", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-copy", "text");
    setInlineRegionText(region, "Moved inline copy");
    // Programmatic click does not blur, so the block moves while still editing.
    clickButtonByLabel(view.container, "Move block up");
    await flush();

    const movedRegion = findInlineEditRegion(view.container, "blk-copy", "text");
    expect(movedRegion.getAttribute("data-page-editor-inline-edit")).toBe("active");
    blurElement(movedRegion);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.id).toBe("blk-copy");
    expect(savedDocument.sections[0]?.blocks[0]?.props.text).toBe("Moved inline copy");
    expect(savedDocument.sections[0]?.blocks[1]?.props.text).toBe("Welcome to Coderso");

    // Delete the heading while an inline edit on it is still open: the commit
    // path must fail closed on the missing block id and never write.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();
    const headingRegion = findInlineEditRegion(view.container, "blk-heading", "text");
    setInlineRegionText(headingRegion, "Half typed heading");
    clickButtonByLabel(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Delete block");
    await flush();

    clickButton(view.container, "Save");
    await flush();
    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.id)).toEqual(["blk-copy"]);
    expect(JSON.stringify(savedDocument)).not.toContain("Half typed heading");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edits write device-scoped overrides off desktop", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    setInlineRegionText(region, "Mobile inline headline");
    blurElement(region);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const heading = savedDocument.sections[0]?.blocks[0];
    expect(heading?.props).toMatchObject({ text: "Welcome to Coderso", level: "h1" });
    expect(heading?.responsive?.mobile?.props).toEqual({ text: "Mobile inline headline" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edits list items and statistic fields through their prop paths", async () => {
  const richPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-rich",
          name: "Rich",
          blocks: [
            createPageBlockV2("list", {
              id: "blk-list",
              props: { items: ["First", "Second"], ordered: false },
            }),
            createPageBlockV2("statistic", {
              id: "blk-stat",
              props: { value: "42", label: "Answers", caption: "" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = richPage;
  pageEditorState.currentPage = richPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={richPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-list"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-list", "items.1"));
    await flush();
    const itemRegion = findInlineEditRegion(view.container, "blk-list", "items.1");
    expect(itemRegion.getAttribute("data-page-editor-inline-edit")).toBe("active");
    setInlineRegionText(itemRegion, "Second updated");
    blurElement(itemRegion);
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-stat"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-stat", "value"));
    await flush();
    const valueRegion = findInlineEditRegion(view.container, "blk-stat", "value");
    setInlineRegionText(valueRegion, "1337");
    blurElement(valueRegion);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props.items).toEqual(["First", "Second updated"]);
    expect(savedDocument.sections[0]?.blocks[1]?.props).toMatchObject({
      value: "1337",
      label: "Answers",
    });
  } finally {
    view.cleanup();
  }
});

// --- TASK-425: Responsive panel content, hide/stack toggles, override list ---

const openResponsivePanel = (container: ParentNode) => {
  clickButtonByLabel(container, "Responsive panel");
  const panel = container.querySelector('[data-page-editor-toolbar-panel="responsive"]');
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

const lastSavedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

test("PageEditor Responsive panel hide toggles write per-breakpoint visibility and reset restores inheritance", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const panel = openResponsivePanel(view.container);
    // All three per-breakpoint hide toggles render as real switches.
    const switches = Array.from(panel.querySelectorAll('[role="switch"]')).map((node) =>
      node.getAttribute("aria-label")
    );
    expect(switches).toEqual([
      "Hide on desktop",
      "Hide on tablet",
      "Hide on mobile",
      "Stack vertically",
    ]);
    expect(
      panel
        .querySelector('[data-page-editor-responsive-hide="desktop"]')
        ?.getAttribute("data-page-editor-responsive-hide-state")
    ).toBe("base");
    expect(
      panel
        .querySelector('[data-page-editor-responsive-hide="mobile"]')
        ?.getAttribute("data-page-editor-responsive-hide-state")
    ).toBe("inherited");

    // Hide on mobile writes the EXISTING responsive.mobile.visibility.visible
    // override path while the active canvas device stays desktop.
    setToggleField(panel, "Hide on mobile", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    let saved = lastSavedDocument();
    expect(saved.sections[0]?.visibility.visible).toBe(true);
    expect(saved.sections[0]?.responsive.mobile?.visibility).toEqual({ visible: false });

    // The toggle row now reports an override and exposes the reset action.
    const mobileRow = view.container.querySelector(
      '[data-page-editor-responsive-hide="mobile"]'
    ) as HTMLElement;
    expect(mobileRow.getAttribute("data-page-editor-responsive-hide-state")).toBe("override");
    clickSelector(mobileRow, 'button[aria-label="Reset Hide on mobile to inherited"]');
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();

    // Hide on desktop writes the BASE visibility, not an override container.
    const refreshedPanel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    setToggleField(refreshedPanel, "Hide on desktop", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.visibility.visible).toBe(false);
    expect(saved.sections[0]?.responsive.tablet).toBeUndefined();
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor Responsive panel stack toggle writes layout.stackVertical per device and the override list resets it", async () => {
  const twoColumnPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
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
    }),
  });
  pageEditorState.cachedPage = twoColumnPage;
  pageEditorState.currentPage = twoColumnPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={twoColumnPage} />);

  try {
    await flush();
    expect(findEditorSectionContent(view.container, "sec-hero").className).toContain("grid-cols-2");

    // Desktop context writes the base field.
    let panel = openResponsivePanel(view.container);
    expect(
      panel.querySelector('[data-page-editor-responsive-override-list="desktop"]')?.textContent
    ).toContain("Desktop is the base");
    setToggleField(panel, "Stack vertically", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    let saved = lastSavedDocument();
    expect(saved.sections[0]?.layout.stackVertical).toBe(true);
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    setToggleField(panel, "Stack vertically", false);
    await flush();

    // Mobile context writes the responsive.mobile.layout override.
    clickButtonByLabel(view.container, "Mobile");
    await flush();
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    setToggleField(panel, "Stack vertically", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.layout.stackVertical).toBe(false);
    expect(saved.sections[0]?.responsive.mobile?.layout).toEqual({ stackVertical: true });

    // The canvas section grid visibly stacks at the mobile context.
    const stackedContent = findEditorSectionContent(view.container, "sec-hero");
    expect(stackedContent.className).toContain("grid-cols-1");
    expect(stackedContent.className).not.toContain("grid-cols-2");

    // The per-field override list shows the override entry with a reset action.
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    const entry = panel.querySelector(
      '[data-page-editor-override-entry="section.layout.stackVertical"]'
    ) as HTMLElement;
    expect(entry.getAttribute("data-page-editor-override-state")).toBe("override");
    expect(
      panel.querySelectorAll('[data-page-editor-override-state="inherited"]').length
    ).toBeGreaterThan(0);
    clickSelector(entry, '[data-page-editor-override-reset="section.layout.stackVertical"]');
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor Responsive panel targets the selected block and projects its override list", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    const panel = openResponsivePanel(view.container);
    expect(
      panel
        .querySelector("[data-page-editor-responsive-panel]")
        ?.getAttribute("data-page-editor-responsive-panel")
    ).toBe("block");
    // Block targets expose the hide toggles but no section stacking surface.
    const switches = Array.from(panel.querySelectorAll('[role="switch"]')).map((node) =>
      node.getAttribute("aria-label")
    );
    expect(switches).toEqual(["Hide on desktop", "Hide on tablet", "Hide on mobile"]);

    setToggleField(panel, "Hide on tablet", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    const saved = lastSavedDocument();
    const heading = saved.sections[0]?.blocks[0];
    expect(heading?.visibility.visible).toBe(true);
    expect(heading?.responsive?.tablet?.visibility).toEqual({ visible: false });

    // The override list projects block fields at the tablet context.
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    const tabletPanel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    const visibilityEntry = tabletPanel.querySelector(
      '[data-page-editor-override-entry="block.visibility.visible"]'
    );
    expect(visibilityEntry?.getAttribute("data-page-editor-override-state")).toBe("override");
    expect(
      tabletPanel
        .querySelector('[data-page-editor-override-entry="block.heading.props.text"]')
        ?.getAttribute("data-page-editor-override-state")
    ).toBe("inherited");
  } finally {
    view.cleanup();
  }
});

test("PageEditor breakpoint switcher shows labels with width readouts and the editing-scope pill follows the device", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Visible labels + canonical px readouts on the switcher (not icon-only).
    for (const [label, width] of [
      ["Desktop", "1080"],
      ["Tablet", "744"],
      ["Mobile", "390"],
    ] as const) {
      const button = view.container.querySelector(`button[aria-label="${label}"]`);
      expect(button?.textContent).toContain(label);
      expect(button?.textContent).toContain(width);
    }

    // Canvas context bar and the floating-panel scope pill share the readout.
    expect(
      view.container.querySelector('[data-page-editor-canvas-context="desktop"]')?.textContent
    ).toBe("Desktop · 1080px · base view");
    expect(
      view.container.querySelector('[data-page-editor-editing-scope="desktop"]')?.textContent
    ).toBe("Editing: Desktop · 1080px (base)");

    clickButtonByLabel(view.container, "Mobile");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-canvas-context="mobile"]')?.textContent
    ).toBe("Mobile · 390px · override context");
    expect(
      view.container.querySelector('[data-page-editor-editing-scope="mobile"]')?.textContent
    ).toBe("Editing: Mobile · 390px (overrides)");
  } finally {
    view.cleanup();
  }
});
