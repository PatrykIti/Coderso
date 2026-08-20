// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor, resolveToolbarTargetLabel } from "../../../core/admin/ui/pages/PageEditor";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
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
import {
  getPageEditorControlsForTarget,
  type PageEditorControlDefinition,
  type PageEditorControlPanel,
} from "../../../core/services/pages/pageEditorControlRegistry";
import {
  editorCanvasCtaButtonClass,
  editorDarkButtonClass,
  editorDarkGhostButtonClass,
  editorPanelButtonClass,
  editorPanelGhostButtonClass,
  editorPanelSegmentTrackClass,
} from "../../../core/admin/ui/pages/editorControls/controlChrome";
import { resolvePageEditorControlUiModel } from "../../../core/services/pages/pageEditorControlUiModel";
import { getPageBlockRenderDefault } from "../../../core/services/pages/pageBlockRenderDefaults";
import { PageSectionRender } from "../../../core/services/pages/pageRendererV2";
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
      // Mirror the real pagesClient/route contract: publish persists the
      // published document as the draft too, merges the post-publish detail
      // into the cached detail, and returns it alongside `ok`.
      const published: PageDetail = {
        ...current,
        status: "published",
        currentData: data,
        updatedAt: "2026-03-08T09:30:00.000Z",
      };
      state.currentPage = published;
      state.cachedPage = published;
      return { ok: true, page: published };
    }),
    restorePageRevision: vi.fn(async (_pageId: string, revisionId: string) => {
      const restored = createPage({
        title: "Restored Homepage",
        updatedAt: "2026-03-08T09:15:00.000Z",
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

// Admin forms client backing the form-block combobox + canvas preview
// (TASK-456): two published forms plus one detail with real fields.
const formsClientState = vi.hoisted(() => {
  const buildForm = (id: string, name: string) => ({
    id,
    name,
    slug: id,
    status: "published",
    description: null,
    successMessage: "Thanks!",
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    settings: { layoutMode: "single", saveProgress: false, stepTitles: [] },
    createdAt: "2026-03-08T09:00:00.000Z",
    updatedAt: "2026-03-08T09:00:00.000Z",
  });
  const state = {
    forms: [buildForm("form-contact", "Contact"), buildForm("form-quote", "Quote request")],
    detailRequests: [] as string[],
    listForms: vi.fn(async () => state.forms),
    getFormDetail: vi.fn(async (id: string) => {
      state.detailRequests.push(id);
      const form = state.forms.find((candidate) => candidate.id === id);
      if (!form) return null;
      return {
        form,
        fields: [
          {
            id: `${id}-email`,
            type: "email",
            label: "Email address",
            name: "email",
            required: true,
            settings: {},
            orderIndex: 0,
          },
        ],
      };
    }),
    reset() {
      state.forms = [
        buildForm("form-contact", "Contact"),
        buildForm("form-quote", "Quote request"),
      ];
      state.detailRequests = [];
      state.listForms.mockClear();
      state.getFormDetail.mockClear();
    },
  };
  return state;
});

// Admin content/listings clients backing the collection-block comboboxes +
// canvas preview (TASK-457): two content types with published entries, saved
// queries scoped per type, and one listing template.
const collectionClientsState = vi.hoisted(() => {
  const buildContentTypes = () => [
    { id: "ct-services", name: "Services", slug: "services" },
    { id: "ct-projects", name: "Projects", slug: "projects" },
  ];
  const buildEntries = (): Record<string, unknown[]> => ({
    services: [
      {
        id: "entry-audit",
        title: "Site audit",
        slug: "site-audit",
        status: "published",
        data: { summary: "We review your whole site." },
        updatedAt: "2026-05-01T09:00:00.000Z",
        publishedAt: "2026-05-01T09:00:00.000Z",
      },
      {
        id: "entry-care",
        title: "Care plan",
        slug: "care-plan",
        status: "published",
        data: {},
        updatedAt: "2026-04-01T09:00:00.000Z",
        publishedAt: "2026-04-01T09:00:00.000Z",
      },
      {
        id: "entry-draft",
        title: "Unpublished service",
        slug: "unpublished-service",
        status: "draft",
        data: {},
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ],
    projects: [],
  });
  const buildQueries = () => [
    {
      id: "query-services",
      name: "Featured services",
      description: null,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: "ct-services" },
        filters: [],
        sort: [],
        pagination: { limit: 10, offset: 0 },
        fields: [],
      },
      createdAt: "2026-03-08T09:00:00.000Z",
      updatedAt: "2026-03-08T09:00:00.000Z",
    },
    {
      id: "query-projects",
      name: "Projects feed",
      description: null,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: "ct-projects" },
        filters: [],
        sort: [],
        pagination: { limit: 10, offset: 0 },
        fields: [],
      },
      createdAt: "2026-03-08T09:00:00.000Z",
      updatedAt: "2026-03-08T09:00:00.000Z",
    },
  ];
  const buildTemplates = () => [
    {
      id: "tpl-grid",
      name: "Service grid",
      slug: "service-grid",
      description: null,
      layout: "grid",
      createdAt: "2026-03-08T09:00:00.000Z",
      updatedAt: "2026-03-08T09:00:00.000Z",
    },
  ];
  const state = {
    contentTypes: buildContentTypes(),
    entriesBySlug: buildEntries(),
    listingQueries: buildQueries(),
    listingTemplates: buildTemplates(),
    listContentTypes: vi.fn(async () => state.contentTypes),
    listEntries: vi.fn(async (slug: string) => state.entriesBySlug[slug] ?? []),
    listListingQueries: vi.fn(async () => state.listingQueries),
    listListingTemplates: vi.fn(async () => state.listingTemplates),
    reset() {
      state.contentTypes = buildContentTypes();
      state.entriesBySlug = buildEntries();
      state.listingQueries = buildQueries();
      state.listingTemplates = buildTemplates();
      state.listContentTypes.mockClear();
      state.listEntries.mockClear();
      state.listListingQueries.mockClear();
      state.listListingTemplates.mockClear();
    },
  };
  return state;
});

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

vi.mock("@/services/formsClient", () => ({
  getCachedForms: () => null,
  listFormsCached: formsClientState.listForms,
  getFormDetailCached: formsClientState.getFormDetail,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => null,
  listContentTypesCached: collectionClientsState.listContentTypes,
}));

vi.mock("@/services/entriesClient", () => ({
  listEntriesCached: collectionClientsState.listEntries,
}));

vi.mock("@/services/listingsClient", () => ({
  getCachedListingQueries: () => null,
  getCachedListingTemplates: () => null,
  listListingQueriesCached: collectionClientsState.listListingQueries,
  listListingTemplatesCached: collectionClientsState.listListingTemplates,
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

export const createDocument = (overrides: Partial<PageDocumentV2> = {}): PageDocumentV2 => ({
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

export const createPage = (overrides: Partial<PageDetail> = {}): PageDetail => ({
  id: "page-1",
  title: "Homepage",
  slug: "homepage",
  status: "draft",
  currentData: createDocument(),
  updatedAt: "2026-03-08T09:00:00.000Z",
  ...overrides,
});

export const mount = (node: React.ReactNode) => {
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

export function PageEditorNavigationHarness() {
  const router = useAdminRouter();

  return (
    <div>
      <span data-testid="admin-path">{router.path}</span>
      <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
      <button type="button" onClick={() => router.navigate("/admin/pages")}>
        Go pages
      </button>
    </div>
  );
}

export const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

export const findButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );

export const clickButton = (container: ParentNode, text: string) => {
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
export const clickButtonByLabel = (container: ParentNode, label: string) => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const dispatchDocumentKey = (key: string, init: KeyboardEventInit = {}) => {
  React.act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
};

export const dispatchElementKey = (
  element: Element | null,
  key: string,
  init: KeyboardEventInit = {}
) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
};

export const clickSelector = (container: ParentNode, selector: string) => {
  const element = container.querySelector(selector);
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const pageEditorBlockLabels: Record<PageBlockType, string> = {
  heading: "Heading",
  text: "Text",
  badge: "Badge",
  button: "Button",
  image: "Image",
  video: "Video",
  gallery: "Gallery",
  form: "Form",
  list: "List",
  card: "Card",
  collection: "Collection",
  filters: "Filters",
  embed: "Embed",
  divider: "Divider",
  spacer: "Spacer",
  statistic: "Statistic",
  icon: "Icon",
  quote: "Quote",
  container: "Container",
  columns: "Columns",
  group: "Group",
  // TASK-522-01-L01: the custom-SVG block is editor-insertable — its palette
  // label mirrors blockOptionCopy.customSvg.
  customSvg: "Custom SVG",
  // ── TASK-534 ── switcher + scrollHint palette labels (mirror blockOptionCopy).
  switcher: "Switcher",
  scrollHint: "Scroll hint",
};

export const pageEditorSectionLabels: Record<PageSectionType, string> = {
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

export const getCommandGroupButtons = (container: ParentNode, title: string) => {
  const heading = Array.from(container.querySelectorAll("p")).find(
    (entry) => entry.textContent === title
  );
  expect(heading).toBeTruthy();
  return Array.from(heading?.parentElement?.querySelectorAll("button") ?? []);
};

export const changeField = (container: ParentNode, labelText: string, value: string) => {
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

/** Structured list-items rows label their inputs via aria-label, not <label>. */
export const changeInputByAriaLabel = (container: ParentNode, ariaLabel: string, value: string) => {
  const field = container.querySelector(
    `input[aria-label="${ariaLabel}"]`
  ) as HTMLInputElement | null;
  expect(field).toBeTruthy();
  React.act(() => {
    if (!field) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

export const findFieldControl = (container: ParentNode, labelText: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((entry) =>
    entry.textContent?.includes(labelText)
  );
  const field = label?.querySelector("input,select,textarea");
  expect(field).toBeTruthy();
  return field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

export const findResponsiveField = (container: ParentNode, labelText: string) => {
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

export const findSegmentedGroup = (container: ParentNode, label: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="segmented"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group).toBeTruthy();
  return group as HTMLElement;
};

export const clickSegmentedOption = (container: ParentNode, label: string, option: string) => {
  const group = findSegmentedGroup(container, label);
  const button = group.querySelector(`[data-page-editor-segmented-option="${option}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const findColorSwatchGroup = (container: ParentNode, label: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="color-swatch"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group).toBeTruthy();
  return group as HTMLElement;
};

export const clickColorSwatch = (container: ParentNode, label: string, swatchId: string) => {
  const swatch = findColorSwatchGroup(container, label).querySelector(
    `[data-page-editor-color-swatch="${swatchId}"]`
  );
  expect(swatch).toBeTruthy();
  React.act(() => {
    swatch?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const setToggleField = (container: ParentNode, label: string, next: boolean) => {
  const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
    (entry) => entry.getAttribute("aria-label") === label
  );
  expect(toggle).toBeTruthy();
  if (toggle?.getAttribute("aria-checked") === String(next)) return;
  React.act(() => {
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const setSliderField = (container: ParentNode, label: string, value: string) => {
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

export const commitColorHex = (container: ParentNode, label: string, hex: string) => {
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

export const selectMediaAsset = (container: ParentNode, label: string, assetId: string) => {
  const control = container.querySelector(`[data-page-editor-media-control="${label}"]`);
  const option = control?.querySelector(`[data-media-picker-option="${assetId}"]`);
  expect(option).toBeTruthy();
  React.act(() => {
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const clickResponsiveReset = (container: ParentNode, labelText: string) => {
  const field = findResponsiveField(container, labelText);
  const button = Array.from(field.querySelectorAll("button")).find((entry) =>
    entry.textContent?.includes("Reset")
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const findEditorSectionContent = (container: ParentNode, sectionId: string) => {
  const section = container.querySelector(
    `[data-page-editor-section][data-section-id="${sectionId}"]`
  );
  const content = section?.querySelector("[data-page-section-content]");
  expect(content).toBeTruthy();
  return content as HTMLElement;
};

export const findEditorBlock = (container: ParentNode, blockId: string) => {
  const block = container.querySelector(`[data-page-editor-block-id="${blockId}"]`);
  expect(block).toBeTruthy();
  return block as HTMLElement;
};

export const collectPageBlockIds = (blocks: readonly PageBlockV2[]): string[] =>
  blocks.flatMap((block) => [
    block.id,
    ...Object.values(block.slots ?? {}).flatMap((children) => collectPageBlockIds(children ?? [])),
  ]);

export const harnessState = {
  pageEditorState,
  toastState,
  activeSurfaceState,
  previewDialogState,
  mediaLibraryState,
  formsClientState,
  collectionClientsState,
  siteSettingsState,
};

/**
 * Shared document read used by the persistence and responsive suites: the
 * last payload handed to the mocked updatePage client.
 */
export const lastSavedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

/**
 * Shared per-suite lifecycle. Because this module is imported by every flow
 * suite, the hooks register on the importing test file (Vitest collects hooks
 * from the module graph of the running file). The mocks above are hoisted to
 * this module's top, so they apply before any suite imports the mocked
 * clients.
 */
beforeEach(() => {
  pageEditorState.reset();
  activeSurfaceState.reset();
  previewDialogState.reset();
  toastState.success.mockClear();
  toastState.error.mockClear();
  siteSettingsState.reset();
  formsClientState.reset();
  collectionClientsState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});
