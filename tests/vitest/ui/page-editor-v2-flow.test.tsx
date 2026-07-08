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

function PageEditorNavigationHarness() {
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
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

/** Structured list-items rows label their inputs via aria-label, not <label>. */
const changeInputByAriaLabel = (container: ParentNode, ariaLabel: string, value: string) => {
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
  formsClientState.reset();
  collectionClientsState.reset();
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

    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1", { force: true });
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

test("PageEditor treats initial cached detail as provisional and applies forced fresh detail", async () => {
  pageEditorState.cachedPage = createPage({
    updatedAt: "2026-03-08T09:00:00.000Z",
    currentData: createDocument({ sections: [] }),
  });
  pageEditorState.currentPage = createPage({
    updatedAt: "2026-03-08T09:05:00.000Z",
  });
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    expect(view.container.textContent).toContain("This page has no sections yet.");
    expect(view.container.textContent).not.toContain("Welcome to Coderso");

    await flush();

    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1", { force: true });
    expect(view.container.textContent).toContain("Welcome to Coderso");
  } finally {
    view.cleanup();
  }
});

test("PageEditor rejects non-newer forced detail for timestamp-authoritative hosts", async () => {
  const candidates = [
    createPage({
      updatedAt: "2026-03-08T08:00:00.000Z",
      currentData: createDocument({ sections: [] }),
    }),
    createPage({
      updatedAt: "2026-03-08T09:00:00.000Z",
      currentData: createDocument({ sections: [] }),
    }),
    createPage({
      updatedAt: "not-a-date",
      currentData: createDocument({ sections: [] }),
    }),
  ];

  for (const candidate of candidates) {
    pageEditorState.reset();
    pageEditorState.cachedPage = createPage({ updatedAt: "2026-03-08T09:00:00.000Z" });
    pageEditorState.currentPage = candidate;
    const view = mount(<PageEditor pageId="page-1" />);

    try {
      await flush();
      expect(view.container.textContent).toContain("Welcome to Coderso");
      expect(view.container.textContent).not.toContain("This page has no sections yet.");
    } finally {
      view.cleanup();
    }
  }
});

test("PageEditor forced revalidation never overwrites dirty local edits", async () => {
  let resolveLoad: (detail: PageDetail | null) => void = () => undefined;
  pageEditorState.getPageCached.mockImplementationOnce(
    () =>
      new Promise<PageDetail | null>((resolve) => {
        resolveLoad = resolve;
      })
  );
  pageEditorState.cachedPage = createPage({
    updatedAt: "2026-03-08T09:00:00.000Z",
  });
  const freshEmpty = createPage({
    updatedAt: "2026-03-08T09:05:00.000Z",
    currentData: createDocument({ sections: [] }),
  });
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    expect(view.container.textContent).toContain("Welcome to Coderso");

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "FAQ");
    await flush();
    expect(view.container.textContent).toContain("faq section");

    await React.act(async () => {
      resolveLoad(freshEmpty);
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    expect(view.container.textContent).toContain("Welcome to Coderso");
    expect(view.container.textContent).toContain("faq section");
    expect(view.container.textContent).not.toContain("This page has no sections yet.");
  } finally {
    view.cleanup();
  }
});

test("PageEditor dirty state blocks SPA, popstate, and hard navigation until confirmed", async () => {
  window.history.replaceState({}, "", "/admin/pages/page-1");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/pages/page-1">
      <PageEditorNavigationHarness />
    </AdminRouterProvider>
  );

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    const unloadEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(unloadEvent)).toBe(false);
    expect(unloadEvent.defaultPrevented).toBe(true);

    window.history.replaceState({}, "", "/admin/pages");
    React.act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(window.location.pathname).toBe("/admin/pages/page-1");
    expect(document.body.textContent).toContain(
      "Cancel to keep editing, or discard local changes and continue."
    );

    clickButton(document.body, "Cancel");
    await flush();

    clickButton(view.container, "Go pages");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(document.body.textContent).toContain(
      "Cancel to keep editing, or discard local changes and continue."
    );

    clickButton(document.body, "Discard and continue");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages"
    );
    expect(window.location.pathname).toBe("/admin/pages");
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
    expect(block.className).toContain("w-fit");
    expect(block.classList.contains("w-full")).toBe(false);
    expect(block.className).toContain("justify-self-center");
    expect(block.className).toContain("mx-auto");
    expect(block.style.getPropertyValue("--coderso-block-text")).toBe("#123456");
    expect(block.style.getPropertyValue("--coderso-block-surface")).toBe("#fef3c7");
    expect(block.style.opacity).toBe("0.5");
    expect(block.style.borderRadius).toBe("18px");
    expect(block.style.boxShadow).toBe("0 14px 40px rgba(15, 23, 42, 0.12)");
    expect(block.style.padding).toBe("12px 14px 0px 0px");
    expect(block.style.marginBottom).toBe("10px");
    expect(block.style.marginLeft).toBe("auto");
    expect(block.style.marginRight).toBe("auto");

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

test("PageEditor background panel edits block gradients and background images", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    clickButtonByLabel(view.container, "Background panel");
    clickSegmentedOption(view.container, "Background type", "gradient");
    await flush();
    setSliderField(view.container, "Angle", "90");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    let savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.style?.backgroundType).toBe("gradient");
    expect(savedBlock?.style?.background).toBe(
      "linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)"
    );

    if (
      !view.container.querySelector(
        '[data-page-editor-control="segmented"] [role="group"][aria-label="Background type"]'
      )
    ) {
      clickButtonByLabel(view.container, "Background panel");
    }
    clickSegmentedOption(view.container, "Background type", "image");
    await flush();
    selectMediaAsset(view.container, "Background image", "asset-hero");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.style).toMatchObject({
      backgroundType: "image",
      backgroundImage: "/hero.jpg",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor undo redo and session clipboard duplicate selected blocks", async () => {
  window.sessionStorage.clear();
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    clickButtonByLabel(view.container, "Style panel");
    clickColorSwatch(view.container, "Text color", "primary");
    await flush();

    clickButtonByLabel(view.container, "Undo");
    clickButtonByLabel(view.container, "Redo");
    await flush();

    clickButtonByLabel(view.container, "Copy selection");
    await flush();
    expect(window.sessionStorage.getItem("coderso.pageEditor.clipboard")).toContain(
      "coderso/page-fragment@v1"
    );

    clickButtonByLabel(view.container, "Paste");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const blocks = savedDocument.sections[0]?.blocks ?? [];
    expect(blocks).toHaveLength(3);
    expect(blocks[1]?.id).toBe("blk-copy");
    expect(blocks[1]?.style?.textColor).toBe("var(--color-primary)");
    expect(blocks[2]?.id).not.toBe("blk-copy");
    expect(blocks[2]?.type).toBe("text");
    expect(blocks[2]?.props.text).toBe("Existing page copy.");
    expect(blocks[2]?.style?.textColor).toBe("var(--color-primary)");
  } finally {
    view.cleanup();
    window.sessionStorage.clear();
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

    // Empty-state CTA keeps the dashed affordance on the shared canvas chrome.
    const firstBlockCta = findButton(view.container, "Add the first block");
    expect(firstBlockCta?.className).toContain(editorCanvasCtaButtonClass);
    expect(firstBlockCta?.className).toContain("border-dashed");

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

test("PageEditor command palette catalog is frozen to 11 sections plus 19 blocks with gated titles absent", async () => {
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
    // TASK-456 amendment: "Form" joined the block palette; TASK-457
    // amendment: "Collection" joined it; TASK-459-02 amendment: "Filters";
    // TASK-471-04 amendment: native "Badge" block; TASK-521-04 amendment:
    // the animated "Icon" block (implements the formerly-placeholder icon block).
    // TASK-522-01 amendment: the "Custom SVG" block (sanitized inline SVG).
    expect(blockPaletteTitles).toEqual([
      "Heading",
      "Text",
      "Badge",
      "Button",
      "Image",
      "Video",
      "Form",
      "List",
      "Card",
      "Collection",
      "Filters",
      "Divider",
      "Spacer",
      "Statistic",
      "Icon",
      "Quote",
      "Container",
      "Columns",
      "Group",
      "Custom SVG",
    ]);
    expect(sectionPaletteTitles.length + blockPaletteTitles.length).toBe(31);

    expect(sectionPaletteTitles).not.toContain("Template");
    expect(sectionPaletteTitles).not.toContain("Navigation");
    // The collection SECTION stays gated: a listing layout is a section
    // composed with the now-insertable collection BLOCK (composite-first).
    expect(sectionPaletteTitles).not.toContain("Collection");
    expect(sectionPaletteTitles).not.toContain("Filters");
    // The lead-form SECTION stays gated: a lead-form layout is a section
    // composed with the now-insertable form BLOCK (composite-first rule).
    expect(sectionPaletteTitles).not.toContain("Lead form");
    expect(sectionPaletteTitles).not.toContain("Embed");

    expect(blockPaletteTitles).not.toContain("Gallery");
    expect(blockPaletteTitles).not.toContain("Embed");

    // TASK-521-04: the icon block is now a real, insertable runtime renderer
    // (animated inline-SVG glyph) — it is reachable from authoring via the palette.
    expect(blockPaletteTitles).toContain("Icon");
    expect(pageBlockCapabilities.icon.insertable).toBe(true);
    expect(pageBlockCapabilities.icon.editorInsertable).toBe(true);
    expect(pageBlockCapabilities.icon.runtimeRenderer).toBe("real");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts a form block, picks a form through the combobox, previews it inert, and saves the formId", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Form");
    await flush();

    // Default props: formId null -> the canvas shows the pick-a-form state.
    const canvasFormBlock = view.container.querySelector('[data-page-editor-block="form"]');
    expect(canvasFormBlock).toBeTruthy();
    expect(canvasFormBlock?.textContent).toContain(
      "Pick a form in the Content panel to preview it here."
    );

    // The Content panel renders the dynamic combobox with options resolved
    // from the cached admin forms client (id -> name).
    const trigger = view.container.querySelector(
      'button[data-page-editor-combobox-trigger="Form"]'
    );
    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain("Pick a form");
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(formsClientState.listForms).toHaveBeenCalled();

    const optionValues = Array.from(
      view.container.querySelectorAll("[data-page-editor-combobox-option]")
    ).map((option) => option.getAttribute("data-page-editor-combobox-option"));
    // Nullable schema (formId: null) surfaces the explicit "None" row.
    expect(optionValues).toEqual(["none", "form-contact", "form-quote"]);

    clickSelector(view.container, '[data-page-editor-combobox-option="form-contact"] button');
    await flush();
    await flush();

    // Canvas preview: the shared form markup, inert (disabled fieldset) and
    // fed by the cached form detail; the trigger now shows the form name.
    expect(formsClientState.detailRequests).toContain("form-contact");
    const preview = view.container.querySelector('[data-page-editor-form-preview="inert"]');
    expect(preview).toBeTruthy();
    expect(preview?.hasAttribute("disabled")).toBe(true);
    expect(preview?.textContent).toContain("Email address");
    expect(
      view.container.querySelector('button[data-page-editor-combobox-trigger="Form"]')?.textContent
    ).toContain("Contact");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedFormBlock = savedDocument.sections[0]?.blocks.at(-1);
    expect(savedFormBlock).toMatchObject({
      type: "form",
      props: { formId: "form-contact", title: "" },
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts a collection block, binds type/query/template through scoped comboboxes, previews entries inert, and clears the query on type change", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  const comboboxTrigger = (label: string) =>
    view.container.querySelector(`button[data-page-editor-combobox-trigger="${label}"]`);
  const openCombobox = async (label: string) => {
    const trigger = comboboxTrigger(label);
    expect(trigger).toBeTruthy();
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
  };
  const readOptionValues = () =>
    Array.from(view.container.querySelectorAll("[data-page-editor-combobox-option]")).map(
      (option) => option.getAttribute("data-page-editor-combobox-option")
    );
  const pickOption = async (value: string) => {
    clickSelector(view.container, `[data-page-editor-combobox-option="${value}"] button`);
    await flush();
    await flush();
  };

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Collection");
    await flush();

    // Default props: contentTypeId null -> the canvas shows the pick-a-type
    // empty state (the fail-closed authoring entry point).
    const canvasCollectionBlock = view.container.querySelector(
      '[data-page-editor-block="collection"]'
    );
    expect(canvasCollectionBlock).toBeTruthy();
    expect(canvasCollectionBlock?.textContent).toContain(
      "Pick a content type in the Content panel to preview entries here."
    );

    // The Content panel renders the three comboboxes plus the limit slider
    // (bounded-number upgrade of the unified owner clamp 1..24, TASK-459-03).
    expect(comboboxTrigger("Content type")?.textContent).toContain("Pick a content type");
    expect(comboboxTrigger("Saved query")?.textContent).toContain("Pick a saved query");
    expect(comboboxTrigger("Listing template")?.textContent).toContain("Pick a listing template");
    const limitSlider = view.container.querySelector<HTMLInputElement>(
      'input[data-page-editor-slider="Limit"]'
    );
    expect(limitSlider).toBeTruthy();
    expect(limitSlider?.min).toBe("1");
    expect(limitSlider?.max).toBe("24");
    // TASK-459-03 visitor pagination controls ride the same panel: the mode
    // strip and the page-size slider with the same owner clamp.
    const pageSizeSlider = view.container.querySelector<HTMLInputElement>(
      'input[data-page-editor-slider="Page size"]'
    );
    expect(pageSizeSlider).toBeTruthy();
    expect(pageSizeSlider?.min).toBe("1");
    expect(pageSizeSlider?.max).toBe("24");

    // With no content type picked, the scoped saved-query source is honestly
    // empty: only the "None" row of the nullable schema remains.
    await openCombobox("Saved query");
    expect(readOptionValues()).toEqual(["none"]);
    await openCombobox("Saved query"); // close again

    // Pick the content type through the dynamic combobox (id -> name).
    await openCombobox("Content type");
    expect(collectionClientsState.listContentTypes).toHaveBeenCalled();
    expect(readOptionValues()).toEqual(["none", "ct-services", "ct-projects"]);
    await pickOption("ct-services");

    // Canvas preview: the shared content-list markup fed by the cached
    // clients, inert (pointer events off); published entries only, limit
    // respected by the runtime-parity mapper.
    expect(collectionClientsState.listEntries).toHaveBeenCalledWith("services");
    const preview = view.container.querySelector('[data-page-editor-collection-preview="inert"]');
    expect(preview).toBeTruthy();
    expect(preview?.textContent).toContain("Site audit");
    expect(preview?.textContent).toContain("Care plan");
    expect(preview?.textContent).not.toContain("Unpublished service");
    expect(comboboxTrigger("Content type")?.textContent).toContain("Services");

    // The saved-query combobox is now scoped to the picked content type.
    await openCombobox("Saved query");
    expect(readOptionValues()).toEqual(["none", "query-services"]);
    await pickOption("query-services");
    expect(comboboxTrigger("Saved query")?.textContent).toContain("Featured services");

    // Listing template picker resolves through the cached listings client.
    await openCombobox("Listing template");
    expect(readOptionValues()).toEqual(["none", "tpl-grid"]);
    await pickOption("tpl-grid");
    expect(comboboxTrigger("Listing template")?.textContent).toContain("Service grid");

    // Switching the content type clears the scoped saved query in the same
    // write: queries belong to one content type and must never dangle.
    await openCombobox("Content type");
    await pickOption("ct-projects");
    expect(comboboxTrigger("Saved query")?.textContent).toContain("Pick a saved query");
    await openCombobox("Saved query");
    expect(readOptionValues()).toEqual(["none", "query-projects"]);
    await openCombobox("Saved query"); // close again

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedCollectionBlock = savedDocument.sections[0]?.blocks.at(-1);
    expect(savedCollectionBlock).toMatchObject({
      type: "collection",
      props: {
        contentTypeId: "ct-projects",
        queryId: null,
        limit: 6,
        templateId: "tpl-grid",
      },
    });
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
    // TASK-495-03 P1a: the frame is an adaptive `bg-card` surface (the dark-mode
    // fix) — never the hardcoded `bg-white` slab that stayed bright in dark mode.
    expect(frame.className).toContain("bg-card");
    expect(frame.className).not.toContain("bg-white");
    for (const [variable, value] of Object.entries(
      toPageTypographyCssVariableMap(DEFAULT_TOKENS)
    )) {
      expect(frame.style.getPropertyValue(variable), variable).toBe(value);
    }
    expect(frame.style.getPropertyValue("--text-2xs")).toBe("0.625rem");
    expect(frame.style.getPropertyValue("--text-xs")).toBe("0.75rem");
    expect(frame.style.getPropertyValue("--text-sm")).toBe("0.875rem");
    expect(frame.style.getPropertyValue("--text-5xl")).toBe("3rem");
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas frame paints the resolved site design.tokens typography over the defaults", async () => {
  siteSettingsState.settings = {
    "design.tokens": {
      typography: { xs: "0.8rem", sm: "1.125rem", "5xl": "3.5rem" },
    },
  };
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame.style.getPropertyValue("--text-xs")).toBe("0.8rem");
    expect(frame.style.getPropertyValue("--text-sm")).toBe("1.125rem");
    expect(frame.style.getPropertyValue("--text-5xl")).toBe("3.5rem");
    // Untouched tokens keep the DEFAULT_TOKENS anchor.
    expect(frame.style.getPropertyValue("--text-2xs")).toBe("0.625rem");
    expect(frame.style.getPropertyValue("--text-md")).toBe("1rem");
    expect(frame.style.getPropertyValue("--font-sans")).toBe(DEFAULT_TOKENS.typography.sans);
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas + block color swatches reflect the live site neutral tokens (TASK-477-02)", async () => {
  siteSettingsState.settings = {
    "design.tokens": {
      neutrals: { bg: "#abcdef" },
    },
  };
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Part A: the canvas frame now carries the site neutral var so neutral block
    // colors are WYSIWYG in-editor; brand vars are NOT re-emitted (chrome-safe).
    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame.style.getPropertyValue("--color-bg")).toBe("#abcdef");
    expect(frame.style.getPropertyValue("--color-primary")).toBe("");

    // Part B: the block color swatch previews the resolved site token (#abcdef),
    // threaded from the hook through the palette context — not the DEFAULT token.
    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButtonByLabel(view.container, "Style panel");
    const bgSwatch = findColorSwatchGroup(view.container, "Text color").querySelector(
      '[data-page-editor-color-swatch="bg"]'
    ) as HTMLElement | null;
    expect(bgSwatch).toBeTruthy();
    const style = bgSwatch?.getAttribute("style") ?? "";
    expect(style.includes("#abcdef") || style.includes("rgb(171, 205, 239)")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating toolbar labels selection, switches one panel, collapses, and right-docks (builder chrome)", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    let toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("aria-label")).toBe("Hero tools");
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");

    // Owner finding #3: two-row head structure. Row 1 = identity + editing
    // scope pill on the left with the right-aligned action cluster; row 2 =
    // the panel category icons on their own line so they never collide with
    // the scope pill.
    const headRow = toolbar?.querySelector('[data-page-editor-toolbar-row="head"]');
    const panelsRow = toolbar?.querySelector('[data-page-editor-toolbar-row="panels"]');
    expect(headRow).toBeTruthy();
    expect(panelsRow).toBeTruthy();
    expect(headRow?.querySelector("[data-page-editor-editing-scope]")).toBeTruthy();
    expect(headRow?.querySelector("[data-page-editor-toolbar-icon]")).toBeNull();
    expect(panelsRow?.querySelector("[data-page-editor-editing-scope]")).toBeNull();
    const panelIcons = Array.from(
      toolbar?.querySelectorAll("[data-page-editor-toolbar-icon]") ?? []
    );
    expect(panelIcons.length).toBeGreaterThan(0);
    for (const icon of panelIcons) {
      expect(icon.closest('[data-page-editor-toolbar-row="panels"]')).toBe(panelsRow);
    }
    const actionCluster = headRow?.querySelector('[data-page-editor-toolbar-actions="true"]');
    expect(actionCluster).toBeTruthy();
    expect(actionCluster?.className).toContain("ml-auto");
    for (const label of [
      "Collapse toolbar",
      "Move section up",
      "Move section down",
      "Duplicate section",
      "Delete section",
    ]) {
      expect(actionCluster?.querySelector(`button[aria-label="${label}"]`)).toBeTruthy();
    }
    expect(panelsRow?.querySelector('button[aria-label="Duplicate section"]')).toBeNull();

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
    // Collapsed: the panels row disappears entirely; the action cluster keeps
    // only the expand control.
    expect(toolbar?.querySelector('[data-page-editor-toolbar-row="panels"]')).toBeNull();
    const collapsedActions = toolbar?.querySelector('[data-page-editor-toolbar-actions="true"]');
    expect(collapsedActions?.querySelector('button[aria-label="Expand toolbar"]')).toBeTruthy();
    expect(collapsedActions?.querySelector('button[aria-label="Duplicate block"]')).toBeNull();
    expect(collapsedActions?.querySelector('button[aria-label="Delete block"]')).toBeNull();

    clickButtonByLabel(view.container, "Expand toolbar");
    await flush();
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");

    // TASK-495-02: the builder chrome (page host) right-docks the panel — it is
    // NOT draggable. The legacy bottom-center draggable panel (drag handle +
    // data-page-editor-toolbar-dragging + transform) is exercised only on the
    // menu host (see menu-design-editor-flow.test.tsx). Assert the right-dock
    // position classes and that no drag affordances are present here.
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.className).toContain("right-4");
    expect(toolbar?.className).toContain("top-4");
    // TASK-495-03 P3a: the builder rail is narrowed to the proto 280px width.
    expect(toolbar?.className).toContain("w-[min(280px,calc(100%-2rem))]");
    expect(toolbar?.className).not.toContain("w-[min(340px,calc(100%-2rem))]");
    expect(toolbar?.className).not.toContain("bottom-6");
    expect(toolbar?.className).not.toContain("left-1/2");
    expect(toolbar?.style.transform).toBe("");
    expect(toolbar?.hasAttribute("data-page-editor-toolbar-dragging")).toBe(false);
    expect(view.container.querySelector('button[aria-label="Drag toolbar"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor builder wraps the sub-toolbar and canvas region in one separated card (TASK-495-03 P2a)", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // The dotted canvas region sits inside ONE rounded/bordered/shadowed card
    // (proto CanvasEditor card — CanvasEditor.tsx:53).
    const scroller = view.container.querySelector(
      '[data-page-editor-canvas-scroller="true"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();
    const canvasCard = scroller.closest(".rounded-2xl.border.bg-card.shadow-card");
    expect(canvasCard).toBeTruthy();

    // The page-builder sub-toolbar ("Page builder") shares that SAME card
    // ancestor — the chrome bar + the canvas are blended into one card.
    const builderLabel = Array.from(view.container.querySelectorAll("span")).find(
      (el) => el.textContent === "Page builder"
    );
    expect(builderLabel).toBeTruthy();
    expect(builderLabel?.closest(".rounded-2xl.border.bg-card.shadow-card")).toBe(canvasCard);
  } finally {
    view.cleanup();
  }
});

test("PageEditor builder panel buttons and canvas CTAs use the shared non-inverting chrome", async () => {
  const chromePage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          // External background URL (not in the media library) so the
          // Background panel renders the clearable readout.
          style: {
            background: "#ffffff",
            backgroundType: "image",
            backgroundImage: "https://cdn.example.com/external-bg.png",
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome to Coderso", level: "h1", align: "center" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = chromePage;
  pageEditorState.currentPage = chromePage;
  const view = mount(<PageEditor pageId="page-1" initialPage={chromePage} />);

  try {
    await flush();

    // Canvas CTAs use the explicit neutral light chrome (always-white canvas)
    // instead of admin-theme outline variables that can invert.
    const addSection = findButton(view.container, "Add section");
    expect(addSection?.className).toContain(editorCanvasCtaButtonClass);
    const gapCta = view.container.querySelector('button[aria-label="Add section at position 1"]');
    expect(gapCta?.className).toContain(editorCanvasCtaButtonClass);

    // Mode-agnostic CONSTANT-value (shape) checks — the dark constants stay LIVE
    // (the menu branch renders them), and the light siblings now back the
    // builder rail. Owner finding #4 contract: idle subtle fill, hover only a
    // slightly lighter fill — never the inverted white-bg/black-text jump.
    expect(editorDarkButtonClass).toContain("bg-white/10");
    expect(editorDarkButtonClass).toContain("hover:bg-white/20");
    expect(editorDarkGhostButtonClass).toContain("text-slate-200");
    expect(editorDarkGhostButtonClass).toContain("hover:bg-white/10");
    expect(editorPanelButtonClass).toContain("bg-muted");
    expect(editorPanelGhostButtonClass).toContain("text-muted-foreground");
    expect(editorCanvasCtaButtonClass).toContain("bg-card");
    expect(editorCanvasCtaButtonClass).toContain("hover:bg-muted");

    // TASK-495-02: the page host is now the light builder rail. "Add block"
    // inside the (default-open) Content panel carries the LIGHT panel chrome.
    const addBlock = findButton(view.container, "Add block");
    expect(addBlock?.className).toContain(editorPanelButtonClass);

    // The Background panel's external URL readout "Clear" carries the light
    // ghost chrome on the builder rail (the in-file ToolbarMediaUrlField).
    clickButtonByLabel(view.container, "Background panel");
    await flush();
    const externalReadout = view.container.querySelector(
      '[data-page-editor-media-external="Background image"]'
    );
    expect(externalReadout).toBeTruthy();
    expect(externalReadout?.querySelector("button")?.className).toContain(
      editorPanelGhostButtonClass
    );

    // INTEGRATION-level non-button relight guard (TASK-495-02): a NON-button
    // registry control rendered through the real page-host rail must carry the
    // LIGHT token via the EditorControlToneContext path (NO explicit `tone`
    // prop — the per-primitive test covers the explicit-prop case). The
    // Background panel's "Background type" SegmentedControl track resolves
    // `tone="light"` from the rail provider, so it carries
    // `editorPanelSegmentTrackClass` and NEVER the dark `bg-white/10`. Guards
    // the "silent button-only" regression where a registry control stops
    // consuming the tone context yet every button assertion stays green.
    const bgTypeTrack = findSegmentedGroup(view.container, "Background type");
    expect(bgTypeTrack.className).toContain(editorPanelSegmentTrackClass);
    expect(bgTypeTrack.className).not.toContain("bg-white/10");
  } finally {
    view.cleanup();
  }
});

test("PageEditor builder chrome renders the in-content PageHeader and page-builder sub-toolbar (TASK-495-02)", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // PageHeader actions in order: Page settings → History → Preview → Save
    // draft → Publish.
    const buttonTexts = Array.from(view.container.querySelectorAll("button")).map(
      (button) => button.textContent ?? ""
    );
    const indexOfText = (label: string) => buttonTexts.findIndex((text) => text.includes(label));
    const settingsIdx = indexOfText("Page settings");
    const historyIdx = indexOfText("History");
    const previewIdx = indexOfText("Preview");
    const saveDraftIdx = indexOfText("Save draft");
    const publishIdx = indexOfText("Publish");
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    expect(historyIdx).toBeGreaterThan(settingsIdx);
    expect(previewIdx).toBeGreaterThan(historyIdx);
    expect(saveDraftIdx).toBeGreaterThan(previewIdx);
    expect(publishIdx).toBeGreaterThan(saveDraftIdx);

    // Save relabeled to "Save draft"; Publish carries the Rocket icon.
    const publishButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      (button.textContent ?? "").includes("Publish")
    );
    expect(publishButton?.querySelector("svg")?.getAttribute("class")).toContain("lucide-rocket");

    // The DeviceSwitcher relocated into the sub-toolbar (top-bar {actions} are
    // drained — the topbar-slot drainage is asserted in menu-design-editor-flow).
    // Exactly ONE device switcher group renders (no duplicate in a drained top
    // bar): one button per device, by accessible name.
    expect(view.container.querySelectorAll('button[aria-label="Desktop"]').length).toBe(1);
    expect(view.container.querySelector('button[aria-label="Tablet"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Mobile"]')).toBeTruthy();

    // Sub-toolbar: "Page builder" label + relocated controls.
    expect(view.container.textContent).toContain("Page builder");
    expect(view.container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Redo"]')).toBeTruthy();
    // Panel toggle, open by default (label "Hide panel"). Its aria-pressed
    // state is asserted with the real Button in page-editor.test.tsx.
    const panelToggle = view.container.querySelector('button[aria-label="Hide panel"]');
    expect(panelToggle).toBeTruthy();

    // The page host provides publish, so NO "Save only" capability badge.
    const badges = Array.from(view.container.querySelectorAll('[data-slot="badge"]'));
    expect(badges.some((badge) => (badge.textContent ?? "").includes("Save only"))).toBe(false);

    // Hide the panel: the toggle flips and the reopen chip appears top-right.
    // (After hiding, both the sub-toolbar toggle and the chip carry
    // aria-label="Show panel"; the chip is the absolutely-positioned one.)
    clickButtonByLabel(view.container, "Hide panel");
    await flush();
    const reopenChip = Array.from(
      view.container.querySelectorAll('button[aria-label="Show panel"]')
    ).find((button) => button.className.includes("right-4") && button.className.includes("top-4"));
    expect(reopenChip).toBeTruthy();
    expect(reopenChip?.className).not.toContain("bottom-6");
    expect(reopenChip?.className).not.toContain("left-1/2");
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
    // TASK-495-02 added a header "Hide options panel" close button in place of
    // the legacy drag handle; TASK-500-03 removed that redundant closer again —
    // the sub-toolbar Hide/Show toggle is the sole hide surface. The surviving
    // head-row actions are still ToolbarIconButton tooltip-triggers.
    for (const label of ["Collapse toolbar", "Duplicate section"]) {
      expect(
        view.container.querySelector(`button[aria-label="${label}"]`)?.getAttribute("data-slot")
      ).toBe("tooltip-trigger");
    }
    // The removed TASK-500-03 closer must not resurface.
    expect(view.container.querySelector('button[aria-label="Hide options panel"]')).toBeNull();

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

    // Structured items rows (client-readiness FIX 1): edit the existing row,
    // add a second plain row and a third row carrying a link target.
    changeInputByAriaLabel(view.container, "Item 1 label", "Discovery");
    clickButton(view.container, "Add item");
    await flush();
    changeInputByAriaLabel(view.container, "Item 2 label", "Build");
    clickButton(view.container, "Add item");
    await flush();
    changeInputByAriaLabel(view.container, "Item 3 label", "Launch");
    changeInputByAriaLabel(view.container, "Item 3 link URL", "/launch");
    setToggleField(view.container, "Ordered", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const list = savedDocument.sections[0]?.blocks[0];

    // Stored shapes are exact: plain rows stay strings, the linked row stores
    // the `{ label, href }` link-item contract the renderer turns into <a>.
    expect(list?.props).toMatchObject({
      items: ["Discovery", "Build", { label: "Launch", href: "/launch" }],
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

test("PageEditor surfaces recoverable autosave drafts after mount revalidation", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(pageEditorState.listPageRevisions).toHaveBeenCalledWith("page-1");
    expect(view.container.textContent).toContain("Recover draft version");
    expect(view.container.textContent).toContain("Restore draft");
    expect(view.container.textContent).toContain("Discard draft");

    clickButton(view.container, "Keep current");
    await flush();

    expect(view.container.textContent).not.toContain("Recover draft version");
    expect(pageEditorState.restorePageRevision).not.toHaveBeenCalled();
    expect(pageEditorState.discardPageRevision).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PageEditor ignores non-recoverable autosave candidates", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-old",
      pageId: "page-1",
      version: 1,
      kind: "autosave",
      title: "Old draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T08:50:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-same",
      pageId: "page-1",
      version: 2,
      kind: "autosave",
      title: "Same draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:00:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-invalid",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Invalid draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "not-a-date",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(view.container.textContent).not.toContain("Recover draft version");
  } finally {
    view.cleanup();
  }
});

test("PageEditor recoverable autosave prompt restores and discards through revision actions", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const restoreView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );

  try {
    await flush();
    clickButton(restoreView.container, "Restore draft");
    await flush();

    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith("page-1", "rev-autosave");
    expect(restoreView.container.textContent).toContain("Restored rev-autosave");
    expect(restoreView.container.textContent).not.toContain("Recover draft version");
  } finally {
    restoreView.cleanup();
  }

  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const discardView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );

  try {
    await flush();
    clickButton(discardView.container, "Discard draft");
    await flush();

    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith("page-1", "rev-autosave");
    expect(discardView.container.textContent).not.toContain("Recover draft version");
  } finally {
    discardView.cleanup();
  }
});

test("PageEditor recoverable autosave blocks navigation without deleting the revision", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  window.history.replaceState({}, "", "/admin/pages/page-1");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/pages/page-1">
      <PageEditorNavigationHarness />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("Recover draft version");

    clickButton(view.container, "Go pages");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(document.body.textContent).toContain(
      "A saved draft version is available. Cancel to recover it, or continue and leave it in history."
    );

    clickButton(document.body, "Discard and continue");
    await flush();

    expect(pageEditorState.discardPageRevision).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages"
    );
  } finally {
    view.cleanup();
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
      createdAt: "2026-03-08T08:50:00.000Z",
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

const readCanvasSectionTypes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-section]")).map((element) =>
    element.getAttribute("data-page-editor-section")
  );

test("Publish persists unsaved sections through the draft-save path so an editor reload keeps them", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      warnings: ["page_has_unsaved_changes"],
    });

    clickButton(view.container, "Publish");
    await flush();

    // Draft/published coherence: the unsaved document is saved through the
    // same draft-save path as Save/Preview, strictly before publishing.
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    expect(pageEditorState.updatePage.mock.invocationCallOrder[0]).toBeLessThan(
      pageEditorState.publishPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    const savedDocument = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as
      | PageDocumentV2
      | undefined;
    expect(savedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);
    const publishedDocument = pageEditorState.publishPage.mock.calls.at(-1)?.[1] as
      | PageDocumentV2
      | undefined;
    expect(publishedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);

    // The dirty flag is cleared by the draft save, not by publish.
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({ warnings: [] });
    expect(toastState.success).toHaveBeenCalledWith("Page published.");
  } finally {
    view.cleanup();
  }

  // Owner gesture: reload the editor. The stored draft is whatever the save
  // produced, so the canvas must still contain the published section.
  expect(pageEditorState.cachedPage?.status).toBe("published");
  const reloaded = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    expect(readCanvasSectionTypes(reloaded.container)).toEqual(["hero", "content"]);
  } finally {
    reloaded.cleanup();
  }
});

test("Publish failure after a successful draft save keeps the saved draft and shows the publish error", async () => {
  pageEditorState.publishPage.mockRejectedValueOnce(new Error("publish_failed"));
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Publish");
    await flush();

    // The draft save committed before the publish failure...
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    const savedDocument = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as
      | PageDocumentV2
      | undefined;
    expect(savedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);

    // ...the publish failure is surfaced (no silent state)...
    expect(view.container.textContent).toContain("Failed to publish page.");
    expect(toastState.error).toHaveBeenCalledWith("Failed to publish page.");
    expect(toastState.success).not.toHaveBeenCalledWith("Page published.");

    // ...and the saved draft is kept: no unsaved-changes warning, canvas intact.
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({ warnings: [] });
    expect(readCanvasSectionTypes(view.container)).toEqual(["hero", "content"]);
  } finally {
    view.cleanup();
  }

  // The saved draft also survives an editor reload even though publish failed.
  expect(pageEditorState.cachedPage?.status).toBe("draft");
  const reloaded = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    expect(readCanvasSectionTypes(reloaded.container)).toEqual(["hero", "content"]);
  } finally {
    reloaded.cleanup();
  }
});

test("Publish aborts when the pre-publish draft save fails and keeps the unsaved state visible", async () => {
  pageEditorState.updatePage.mockRejectedValueOnce(new Error("save_failed"));
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Publish");
    await flush();

    // Failure ordering: the published site never gets ahead of a draft that
    // could not be persisted.
    expect(pageEditorState.publishPage).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Failed to save draft.");
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      warnings: ["page_has_unsaved_changes"],
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

const setInlineRegionHtml = (element: HTMLElement, value: string) => {
  React.act(() => {
    element.innerHTML = value;
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

test("PageEditor rich inline edit preserves sanitized markup and updates the panel field", async () => {
  const richPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-rich-inline",
          name: "Rich inline",
          blocks: [
            createPageBlockV2("text", {
              id: "blk-rich-inline",
              props: {
                text: "<p>Existing <strong>rich</strong> copy</p>",
                format: "rich",
                align: "left",
              },
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

    clickSelector(view.container, '[data-page-editor-block-id="blk-rich-inline"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-rich-inline", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-rich-inline", "text");
    expect(region.getAttribute("data-page-editor-inline-edit")).toBe("active");
    expect(region.querySelector("strong")?.textContent).toBe("rich");

    setInlineRegionHtml(
      region,
      '<p>Edited <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a><script>alert(1)</script></p>'
    );
    blurElement(region);
    await flush();

    const expected =
      '<p>Edited <strong>rich</strong> <a href="/safe" rel="nofollow noreferrer">safe</a></p>';
    expect(findFieldControl(view.container, "Primary text").value).toBe(expected);
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-rich-inline"] strong')
        ?.textContent
    ).toBe("rich");
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-rich-inline"] a')
        ?.getAttribute("href")
    ).toBe("/safe");
    expect(view.container.textContent).not.toContain("alert(1)");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props.text).toBe(expected);
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

/**
 * Effective-value display contract (TASK-449 owner bug #9, round 3): every
 * floating-panel control must PRESENT the document's effective value for the
 * active breakpoint — the stored value, the effective render default from
 * `pageBlockRenderDefaults` when unset (what the renderer actually paints:
 * baked text classes, grid-stretch frame width), the registry schema fallback
 * next, and an honest empty state (no active option / slider at minimum) only
 * when no single effective rendered value exists. The helpers below are
 * shared by the targeted tests and the full panel sweep.
 */

const floatingPanelButtonLabels: Partial<Record<PageEditorControlPanel, string>> = {
  layout: "Layout panel",
  content: "Content panel",
  typography: "Typography panel",
  style: "Style panel",
  spacing: "Spacing panel",
  background: "Background panel",
  responsive: "Responsive panel",
  visibility: "Visibility panel",
};

const openFloatingPanel = async (container: ParentNode, panel: PageEditorControlPanel) => {
  if (container.querySelector(`[data-page-editor-toolbar-panel="${panel}"]`)) return;
  clickButtonByLabel(container, floatingPanelButtonLabels[panel] ?? `${panel} panel`);
  await flush();
};

/** Reads the value a rendered floating-panel control currently presents. */
const readControlDisplayValue = (
  container: ParentNode,
  control: PageEditorControlDefinition
): string => {
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "segmented") {
    const group = findSegmentedGroup(container, control.label);
    const active = group.querySelector(
      '[data-page-editor-segmented-option][aria-pressed="true"]'
    ) as HTMLElement | null;
    return active?.dataset.pageEditorSegmentedOption ?? "";
  }
  if (model.kind === "select") {
    const select = Array.from(container.querySelectorAll('[data-page-editor-control="select"]'))
      .find((entry) => entry.textContent?.includes(control.label))
      ?.querySelector("select");
    expect(select, control.id).toBeTruthy();
    return (select as HTMLSelectElement).value;
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const slider = container.querySelector(
      `input[type="range"][data-page-editor-slider="${control.label}"]`
    );
    expect(slider, control.id).toBeTruthy();
    return (slider as HTMLInputElement).value;
  }
  if (model.kind === "toggle") {
    const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === control.label
    );
    expect(toggle, control.id).toBeTruthy();
    return toggle?.getAttribute("aria-checked") === "true" ? "yes" : "no";
  }
  if (model.kind === "swatch") {
    const group = findColorSwatchGroup(container, control.label);
    const transparent = group.querySelector('[data-page-editor-color-swatch="transparent"]');
    if (transparent?.getAttribute("aria-pressed") === "true") return "";
    const hex = group.querySelector(`input[data-page-editor-color-hex="${control.label}"]`);
    expect(hex, control.id).toBeTruthy();
    return (hex as HTMLInputElement).value;
  }
  if (model.kind === "media") {
    const host = container.querySelector(
      `[data-page-editor-media-control="${control.label}"] [data-media-picker-value]`
    );
    expect(host, control.id).toBeTruthy();
    return host?.getAttribute("data-media-picker-value") ?? "";
  }
  const field = Array.from(container.querySelectorAll('[data-page-editor-control="text"]'))
    .find((entry) => entry.textContent?.includes(control.label))
    ?.querySelector("input");
  expect(field, control.id).toBeTruthy();
  return (field as HTMLInputElement).value;
};

const readDocumentPath = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    source
  );

/**
 * The expected display: the document's stored value at the control path,
 * falling back to the effective render default (`pageBlockRenderDefaults`,
 * for block targets), then to the registry schema default, with the
 * per-widget honest empty states (no pressed option, slider at clamp
 * minimum, transparent swatch for null colors).
 */
const expectedControlDisplayValue = (
  target: unknown,
  control: PageEditorControlDefinition,
  renderDefault?: string | number
): string => {
  const stored = readDocumentPath(target, control.path);
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "toggle") {
    const effective = typeof stored === "boolean" ? stored : control.fallback === true;
    return effective ? "yes" : "no";
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const effective =
      typeof stored === "number"
        ? stored
        : typeof renderDefault === "number"
          ? renderDefault
          : typeof control.fallback === "number"
            ? control.fallback
            : model.min;
    return String(Math.min(model.max, Math.max(model.min, effective)));
  }
  if (model.kind === "swatch") return typeof stored === "string" ? stored : "";
  if (model.kind === "media") {
    if (typeof stored !== "string" || stored.length === 0) return "";
    return mediaLibraryState.items.find((item) => item.url === stored)?.id ?? "";
  }
  if (typeof stored === "string") return stored;
  if (typeof stored === "number" || typeof stored === "boolean") return String(stored);
  if (typeof renderDefault === "string") return renderDefault;
  return typeof control.fallback === "string" ? control.fallback : "";
};

test("PageEditor floating panel marks the stored heading level and shows effective render defaults", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  const pressedOption = (label: string) =>
    (
      findSegmentedGroup(view.container, label).querySelector(
        '[data-page-editor-segmented-option][aria-pressed="true"]'
      ) as HTMLElement | null
    )?.dataset.pageEditorSegmentedOption;

  try {
    await flush();

    // Stored level h1 must be the pressed Level option (owner bug #9).
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    await openFloatingPanel(view.container, "content");
    expect(pressedOption("Level")).toBe("h1");

    // Unset opacity renders fully opaque: the slider must present the schema
    // default 1, never the zero-value lie.
    await openFloatingPanel(view.container, "style");
    const opacity = view.container.querySelector(
      'input[type="range"][data-page-editor-slider="Opacity"]'
    ) as HTMLInputElement;
    expect(opacity.value).toBe("1");
    expect(
      opacity.closest('[data-page-editor-control="slider"]')?.querySelector("output")?.textContent
    ).toBe("1");
    // Unset radius/shadow display their schema defaults.
    expect(
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Radius"]'
        ) as HTMLInputElement
      ).value
    ).toBe("0");
    expect(pressedOption("Shadow")).toBe("none");

    // Owner finding #9 (round 3): unset block width/align display the
    // EFFECTIVE RENDERED default as active — the grid-stretch frame spans the
    // full column ("full") and the content text flows left ("left").
    await openFloatingPanel(view.container, "layout");
    expect(pressedOption("Width")).toBe("full");
    expect(pressedOption("Align")).toBe("left");

    // Unset typography tokens display the h1's baked styling as active:
    // sans page font, text-5xl, font-semibold, leading-tight (1.25).
    await openFloatingPanel(view.container, "typography");
    expect(pressedOption("Font family")).toBe("sans");
    expect(pressedOption("Font size")).toBe("5xl");
    expect(pressedOption("Font weight")).toBe("semibold");
    expect(
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Line height"]'
        ) as HTMLInputElement
      ).value
    ).toBe("1.25");
    // The hero-starter heading STORES props.align center: Text align must
    // present the stored value, not a render default.
    expect(pressedOption("Text align")).toBe("center");
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating panel presents stored values and tablet overrides per breakpoint", async () => {
  const page = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Breakpoint heading", level: "h1", align: "center" },
              style: { opacity: 0.4 },
              responsive: {
                tablet: { props: { level: "h3" }, style: { opacity: 0.6 } },
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();

    const pressedLevel = () =>
      (
        findSegmentedGroup(view.container, "Level").querySelector(
          '[data-page-editor-segmented-option][aria-pressed="true"]'
        ) as HTMLElement | null
      )?.dataset.pageEditorSegmentedOption;
    const opacityValue = () =>
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Opacity"]'
        ) as HTMLInputElement
      ).value;

    // Desktop presents the base values.
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h1");
    await openFloatingPanel(view.container, "style");
    expect(opacityValue()).toBe("0.4");

    // Tablet presents the override values.
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    expect(opacityValue()).toBe("0.6");
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h3");

    // Mobile has no override: it presents the inherited base values.
    clickButtonByLabel(view.container, "Mobile");
    await flush();
    expect(pressedLevel()).toBe("h1");
    await openFloatingPanel(view.container, "style");
    expect(opacityValue()).toBe("0.4");

    // Back on desktop the base values are untouched.
    clickButtonByLabel(view.container, "Desktop");
    await flush();
    expect(opacityValue()).toBe("0.4");
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h1");
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating-panel sweep: every rendered control presents the document's effective value", async () => {
  const sweepSection = createPageSectionV2("hero", {
    id: "sec-sweep",
    name: "Sweep hero",
    variant: "centered",
    layout: { columns: 2, align: "center", justify: "between", maxWidth: 960 },
    style: {
      background: "#fef3c7",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#123456",
      radius: 12,
      shadow: "md",
    },
    spacing: { paddingTop: 32, paddingBottom: 48, paddingLeft: 24, paddingRight: 16, gap: 12 },
    blocks: [
      createPageBlockV2("text", {
        id: "blk-sweep",
        props: { text: "Sweep copy.", format: "plain", align: "center" },
        style: {
          width: "full",
          textColor: "#123456",
          opacity: 0.4,
          padding: { top: 8 },
          fontWeight: "bold",
          letterSpacing: 1.5,
        },
      }),
    ],
  });
  const page = createPage({
    currentData: createDocument({ sections: [sweepSection] }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);

  try {
    await flush();

    const sweptControlIds: string[] = [];
    const sweepTarget = async (
      target: unknown,
      controls: readonly PageEditorControlDefinition[],
      panels: readonly PageEditorControlPanel[],
      block?: PageBlockV2
    ) => {
      for (const panel of panels) {
        await openFloatingPanel(view.container, panel);
        const visibleControls = controls
          .filter((entry) => entry.panel === panel)
          .filter(
            (entry) =>
              entry.id !== "block.style.backgroundImage" || block?.style?.backgroundType === "image"
          );
        for (const control of visibleControls) {
          expect(readControlDisplayValue(view.container, control), control.id).toBe(
            expectedControlDisplayValue(
              target,
              control,
              block ? getPageBlockRenderDefault(block, control.path) : undefined
            )
          );
          sweptControlIds.push(control.id);
        }
      }
    };

    // Section sweep: the first section is selected by default.
    await sweepTarget(
      sweepSection,
      getPageEditorControlsForTarget({ kind: "section", type: "hero" }),
      ["layout", "style", "background", "spacing", "visibility", "responsive"]
    );

    // Block sweep: a text block with a partial style (stored + unset fields).
    // Unset fields with a baked render default (width/align/typography) must
    // display it; stored fields must beat it (owner finding #9 round 3).
    clickSelector(view.container, '[data-page-editor-block-id="blk-sweep"]');
    await flush();
    await sweepTarget(
      sweepSection.blocks[0],
      getPageEditorControlsForTarget({ kind: "block", type: "text" }),
      ["content", "typography", "layout", "style", "background", "spacing", "visibility"],
      sweepSection.blocks[0]
    );

    // The sweep must have exercised the full registry surface of both targets.
    expect(sweptControlIds.length).toBeGreaterThanOrEqual(40);
    expect(new Set(sweptControlIds).size).toBe(sweptControlIds.length);
  } finally {
    view.cleanup();
  }
});

// --- Multi-column canvas authoring UX (owner findings #5 #6 #7 #8) ---

const clickPaletteBlock = (container: ParentNode, label: string) => {
  const button = getCommandGroupButtons(container, "Blocks").find((entry) =>
    entry.textContent?.includes(label)
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const canvasBlockIdOrder = (container: ParentNode, sectionId: string) =>
  Array.from(
    container.querySelectorAll(`[data-section-id="${sectionId}"] [data-page-editor-block-id]`)
  ).map((element) => element.getAttribute("data-page-editor-block-id"));

test("PageEditor empty multi-column section paints one ghost tile per column and tiles append through the palette", async () => {
  const gridPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 3, align: "start", justify: "start", maxWidth: 1100 },
          blocks: [],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // Owner finding #5: empty 3-column section paints exactly three tiles.
    const emptyTiles = view.container.querySelectorAll('[data-page-editor-ghost="section-column"]');
    expect(emptyTiles).toHaveLength(3);
    expect(view.container.querySelector('button[aria-label="Add block to column 1"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Add block to column 3"]')).toBeTruthy();
    expect(findButton(view.container, "Add the first block")).toBeFalsy();

    // Round 3: the column-1 tile inserts WITH the column assignment, so the
    // block is pinned to column 1 instead of relying on auto-flow.
    clickSelector(view.container, 'button[aria-label="Add block to column 1"]');
    await flush();
    clickPaletteBlock(view.container, "Heading");
    await flush();

    expect(view.container.querySelector('[data-page-editor-block-path="root:0"]')).toBeTruthy();
    // Per-column composition is now active: EVERY column keeps its own
    // persistent add tile — a compact append tile under the filled column 1
    // stack, full-size tiles in the still-empty columns 2 and 3.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="section-column"]')
    ).toHaveLength(2);
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="section-column-append"]')
    ).toHaveLength(1);
    const wrapperColumns = view.container.querySelectorAll("[data-page-section-column]");
    expect(wrapperColumns).toHaveLength(3);

    // Column 3 starts empty and fills independently of columns 1 and 2.
    clickSelector(view.container, 'button[aria-label="Add block to column 3"]');
    await flush();
    clickPaletteBlock(view.container, "Text");
    await flush();

    expect(view.container.querySelector('[data-page-editor-block-path="root:1"]')).toBeTruthy();
    const columnThree = view.container.querySelector('[data-page-section-column="3"]');
    expect(columnThree?.querySelector('[data-page-editor-block="text"]')).toBeTruthy();
    expect(
      view.container
        .querySelector('[data-page-section-column="2"]')
        ?.querySelector("[data-page-editor-block]")
    ).toBeFalsy();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks.map((block) => block.style?.column)).toEqual([1, 3]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor multi-column left/right assign the block's column and up/down reorder within the column stack", async () => {
  const gridPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
          blocks: ["blk-b1", "blk-b2", "blk-b3", "blk-b4"].map((id, index) =>
            createPageBlockV2("heading", {
              id,
              props: { text: `Block ${index + 1}`, level: "h2", align: "left" },
            })
          ),
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // Auto-flow mode: every column keeps a persistent add tile.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="section-column-append"]')
    ).toHaveLength(2);

    clickSelector(view.container, '[data-page-editor-block-id="blk-b1"]');
    await flush();

    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block right"]')).toBeTruthy();

    // Right = SET column 2 on blk-b1 (owner finding #5 round 3): the block
    // moves into the column 2 stack while every sibling keeps its auto-flow
    // cell (blk-b3 stays alone in column 1). DOM order is column-grouped.
    clickButtonByLabel(view.container, "Move block right");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b1",
      "blk-b2",
      "blk-b4",
    ]);

    // Down = swap with the next block of the SAME column stack (blk-b2).
    clickButtonByLabel(view.container, "Move block down");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b2",
      "blk-b1",
      "blk-b4",
    ]);

    // Up = back to the top of the column 2 stack.
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b1",
      "blk-b2",
      "blk-b4",
    ]);

    // Stack-edge move is a strict no-op, never a clamp.
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b1",
      "blk-b2",
      "blk-b4",
    ]);

    // Left = assign back to column 1; blk-b1 interleaves by list order.
    clickButtonByLabel(view.container, "Move block left");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b1",
      "blk-b3",
      "blk-b2",
      "blk-b4",
    ]);

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.id)).toEqual([
      "blk-b1",
      "blk-b2",
      "blk-b3",
      "blk-b4",
    ]);
    // The vertical reorder pinned every block, so the composition is explicit.
    expect(savedDocument.sections[0]?.blocks.map((block) => block.style?.column)).toEqual([
      1, 2, 1, 2,
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor switching a section to two columns keeps existing blocks together in column 1", async () => {
  const heroPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero-columns",
          name: "Hero",
          layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-hero-heading",
              props: { text: "Welcome", level: "h1", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "blk-hero-copy",
              props: { text: "Hero copy.", format: "plain", align: "left" },
            }),
            createPageBlockV2("button", {
              id: "blk-hero-cta",
              props: { label: "Start", href: "/", target: "self", variant: "primary", size: "md" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    // Owner finding #5 (round 3) bridge: switching 1 -> 2 columns pins every
    // existing block to column 1 in the same write — the hero heading, copy,
    // and button stay stacked together instead of scattering across cells.
    clickSelector(view.container, '[data-section-id="sec-hero-columns"]');
    await flush();
    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "2");
    await flush();

    const columnOne = view.container.querySelector(
      '[data-page-section-column-owner="sec-hero-columns"][data-page-section-column="1"]'
    );
    expect(columnOne).toBeTruthy();
    expect(
      Array.from(columnOne!.querySelectorAll("[data-page-editor-block-id]")).map((element) =>
        element.getAttribute("data-page-editor-block-id")
      )
    ).toEqual(["blk-hero-heading", "blk-hero-copy", "blk-hero-cta"]);

    // Column 2 starts empty with its own persistent add tile.
    const columnTwo = view.container.querySelector(
      '[data-page-section-column-owner="sec-hero-columns"][data-page-section-column="2"]'
    );
    expect(columnTwo?.querySelector("[data-page-editor-block-id]")).toBeFalsy();
    expect(columnTwo?.querySelector('button[aria-label="Add block to column 2"]')).toBeTruthy();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.layout.columns).toBe(2);
    expect(savedDocument.sections[0]?.blocks.map((block) => block.style?.column)).toEqual([
      1, 1, 1,
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor hides left/right movers in single-column contexts and up/down inside row groups", async () => {
  const mixedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-mixed",
          name: "Mixed",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-single",
              props: { text: "Single column", level: "h2", align: "left" },
            }),
            createPageBlockV2("group", {
              id: "blk-row",
              props: { direction: "row", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("button", {
                    id: "blk-row-first",
                    props: {
                      label: "First",
                      href: "/a",
                      target: "self",
                      variant: "primary",
                      size: "md",
                    },
                  }),
                  createPageBlockV2("button", {
                    id: "blk-row-second",
                    props: {
                      label: "Second",
                      href: "/b",
                      target: "self",
                      variant: "primary",
                      size: "md",
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
  pageEditorState.cachedPage = mixedPage;
  pageEditorState.currentPage = mixedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={mixedPage} />);

  try {
    await flush();

    // Single-column section root: vertical movers only.
    clickSelector(view.container, '[data-page-editor-block-id="blk-single"]');
    await flush();
    expect(view.container.querySelector('button[aria-label="Move block up"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeFalsy();
    expect(view.container.querySelector('button[aria-label="Move block right"]')).toBeFalsy();

    // Row-direction group child: horizontal movers only (a single row has no
    // vertical axis).
    clickSelector(view.container, '[data-page-editor-block-id="blk-row-first"]');
    await flush();
    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block right"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block up"]')).toBeFalsy();
    expect(view.container.querySelector('button[aria-label="Move block down"]')).toBeFalsy();

    clickButtonByLabel(view.container, "Move block right");
    await flush();
    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[1]?.slots?.children?.map((child) => child.id)).toEqual(
      ["blk-row-second", "blk-row-first"]
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor Add block beside wraps the selection into a row group, then appends inside it", async () => {
  const ctaPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-cta",
          name: "CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-cta",
              props: {
                label: "Primary action",
                href: "/",
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
  pageEditorState.cachedPage = ctaPage;
  pageEditorState.currentPage = ctaPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={ctaPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-cta"]');
    await flush();
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    // Non-destructive wrap: the original block keeps its id/props as the row
    // group's first child; the new block lands beside it and gets selected.
    const wrappedFirst = view.container.querySelector(
      '[data-page-editor-block-path="root:0/children:0"]'
    );
    const insertedSecond = view.container.querySelector(
      '[data-page-editor-block-path="root:0/children:1"]'
    );
    expect(wrappedFirst?.getAttribute("data-page-editor-block-id")).toBe("blk-cta");
    expect(insertedSecond?.getAttribute("data-page-editor-block")).toBe("button");
    expect(insertedSecond?.getAttribute("data-selected")).toBe("true");

    // Canvas renders both buttons side by side inside the row-group slot.
    const rowSlot = view.container.querySelector('[data-page-block-slot="children"]');
    expect(rowSlot?.className).toContain("flex-row");
    expect(rowSlot?.querySelectorAll("[data-page-editor-block-id]")).toHaveLength(2);

    // Add beside again with the row group as parent: append, never re-wrap.
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const rootBlocks = savedDocument.sections[0]?.blocks ?? [];
    expect(rootBlocks).toHaveLength(1);
    expect(rootBlocks[0]).toMatchObject({
      type: "group",
      props: { direction: "row", wrap: false, gap: 16 },
    });
    const children = rootBlocks[0]?.slots?.children ?? [];
    expect(children.map((child) => child.type)).toEqual(["button", "button", "button"]);
    expect(children[0]?.id).toBe("blk-cta");
    expect(children[0]?.props.label).toBe("Primary action");

    // The Layers panel surfaces the same action for the selected block.
    clickButton(view.container, "Layers");
    await flush();
    expect(
      view.container.querySelectorAll('button[aria-label="Add block beside"]').length
    ).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});

test("PageEditor cancelling the Add block beside palette never wraps or dirties the document", async () => {
  const ctaPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-cta",
          name: "CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-cta",
              props: {
                label: "Primary action",
                href: "/",
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
  pageEditorState.cachedPage = ctaPage;
  pageEditorState.currentPage = ctaPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={ctaPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-cta"]');
    await flush();
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    clickButton(view.container, "Close");
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0"]')
        ?.getAttribute("data-page-editor-block")
    ).toBe("button");
    // No document write happened, so the dirty-state badge must stay absent.
    expect(view.container.textContent).not.toContain("Unsaved");

    // A later plain insert must not consume the stale beside target.
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-block-slot="children"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

test("PageEditor columns slot ghost tiles insert into the exact slot like Layers does", async () => {
  const columnsPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-columns",
          name: "Columns",
          blocks: [
            createPageBlockV2("columns", {
              id: "blk-columns",
              props: { count: 2, gap: 24, distribution: "equal" },
              slots: {
                "column:1": [
                  createPageBlockV2("heading", {
                    id: "blk-col-head",
                    props: { text: "Left heading", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = columnsPage;
  pageEditorState.currentPage = columnsPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={columnsPage} />);

  try {
    await flush();

    // Empty slot gets a full ghost tile; the non-empty slot gets the compact
    // trailing affordance — both labelled like the Layers insert path.
    expect(view.container.querySelectorAll('[data-page-editor-ghost="columns-slot"]')).toHaveLength(
      1
    );
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="columns-slot-append"]')
    ).toHaveLength(1);

    clickButtonByLabel(view.container, "Add block to Column 2");
    await flush();
    clickPaletteBlock(view.container, "Text");
    await flush();

    const insertedNested = view.container.querySelector(
      '[data-page-editor-block-path="root:0/column:2:0"]'
    );
    expect(insertedNested).toBeTruthy();
    expect(insertedNested?.getAttribute("data-page-editor-block")).toBe("text");
    expect(insertedNested?.getAttribute("data-page-editor-block-slot-key")).toBe("column:2");

    clickSelector(view.container, '[data-page-editor-ghost="columns-slot-append"]');
    await flush();
    clickPaletteBlock(view.container, "Heading");
    await flush();

    expect(
      view.container.querySelector('[data-page-editor-block-path="root:0/column:1:1"]')
    ).toBeTruthy();

    // Columns-slot children expose BOTH axes: up/down move ±1 inside the
    // vertical slot stack, left/right move across the adjacent column slot.
    clickSelector(view.container, '[data-page-editor-block-id="blk-col-head"]');
    await flush();
    expect(view.container.querySelector('button[aria-label="Move block up"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeTruthy();

    clickButtonByLabel(view.container, "Move block right");
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0/column:2:0"]')
        ?.getAttribute("data-page-editor-block-id")
    ).toBe("blk-col-head");

    clickButtonByLabel(view.container, "Move block left");
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0/column:1:0"]')
        ?.getAttribute("data-page-editor-block-id")
    ).toBe("blk-col-head");

    // Left at the first column is a strict no-op.
    clickButtonByLabel(view.container, "Move block left");
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0/column:1:0"]')
        ?.getAttribute("data-page-editor-block-id")
    ).toBe("blk-col-head");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const columnsBlock = savedDocument.sections[0]?.blocks[0];
    expect(columnsBlock?.slots?.["column:1"]?.map((child) => child.type)).toEqual([
      "heading",
      "heading",
    ]);
    expect(columnsBlock?.slots?.["column:1"]?.[0]?.id).toBe("blk-col-head");
    expect(columnsBlock?.slots?.["column:2"]?.map((child) => child.type)).toEqual(["text"]);
  } finally {
    view.cleanup();
  }
});

// --- "Add block beside" discoverability (owner finding #7, round 3) ---

const createDefaultHeroPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero-default",
          name: "Hero",
          variant: "default",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-hero-heading",
              props: { text: "Build with Coderso", level: "h1", align: "center" },
            }),
            createPageBlockV2("text", {
              id: "blk-hero-copy",
              props: {
                text: "Compose sections and atomic blocks directly on the canvas.",
                format: "plain",
                align: "center",
              },
            }),
            createPageBlockV2("button", {
              id: "blk-hero-cta",
              props: {
                label: "Primary action",
                href: "/",
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

test("PageEditor default hero button selection surfaces Add block beside in the toolbar AND as a canvas handle", async () => {
  const heroPage = createDefaultHeroPage();
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    // No block selected (section-level selection): neither the toolbar action
    // nor the canvas handle render.
    expect(view.container.querySelector('button[aria-label="Add block beside"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-editor-ghost="add-block-beside"]')).toBeFalsy();

    clickSelector(view.container, '[data-page-editor-block-id="blk-hero-cta"]');
    await flush();

    // The toolbar action is present and ENABLED in the head-row action cluster.
    const toolbarBeside = view.container.querySelector(
      '[data-page-editor-toolbar-actions="true"] button[aria-label="Add block beside"]'
    ) as HTMLButtonElement | null;
    expect(toolbarBeside).toBeTruthy();
    expect(toolbarBeside?.disabled).toBe(false);

    // The canvas renders the compact ghost "+" handle inside the selected
    // block's frame — the discoverable on-canvas mirror of the same action.
    const handle = view.container.querySelector(
      'button[data-page-editor-ghost="add-block-beside"]'
    ) as HTMLButtonElement | null;
    expect(handle).toBeTruthy();
    expect(handle?.getAttribute("aria-label")).toBe("Add block beside");
    expect(handle?.closest('[data-page-editor-block-id="blk-hero-cta"]')).toBeTruthy();

    // Activating the handle opens the palette pre-targeted beside the button;
    // picking a block wraps the selection into a row group and selects the
    // new block (same contract as the toolbar action).
    clickSelector(view.container, 'button[data-page-editor-ghost="add-block-beside"]');
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    const wrappedFirst = view.container.querySelector(
      '[data-page-editor-block-path="root:2/children:0"]'
    );
    const insertedSecond = view.container.querySelector(
      '[data-page-editor-block-path="root:2/children:1"]'
    );
    expect(wrappedFirst?.getAttribute("data-page-editor-block-id")).toBe("blk-hero-cta");
    expect(insertedSecond?.getAttribute("data-page-editor-block")).toBe("button");
    expect(insertedSecond?.getAttribute("data-selected")).toBe("true");

    // Exactly one handle: it follows the (new) selection, never duplicates.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="add-block-beside"]')
    ).toHaveLength(1);
    expect(
      view.container
        .querySelector('[data-page-editor-ghost="add-block-beside"]')
        ?.closest('[data-page-editor-block-path="root:2/children:1"]')
    ).toBeTruthy();

    // The published front HTML of the persisted document stays free of the
    // canvas handle (and of any editor ghost chrome).
    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const front = renderToStaticMarkup(<PageSectionRender section={savedDocument.sections[0]!} />);
    expect(front).not.toContain("data-page-editor-ghost");
    expect(front).not.toContain("Add block beside");
    // The row group renders both buttons on the front.
    expect(front.match(/<a\s/g) ?? []).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas beside handle clears with the selection and respects action validity", async () => {
  const heroPage = createDefaultHeroPage();
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-hero-cta"]');
    await flush();
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="add-block-beside"]')
    ).toHaveLength(1);

    // Escape clears the block selection back to the section: both the toolbar
    // action and the canvas handle disappear.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('button[aria-label="Add block beside"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-editor-ghost="add-block-beside"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

// --- Round-3 friction A: single-click flow while another block is selected ---

const createTwoColumnPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-left",
              props: { text: "Left heading", level: "h2", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "blk-right",
              props: { text: "Right copy.", format: "plain", align: "left" },
            }),
          ],
        }),
      ],
    }),
  });

test("PageEditor first click acts while another block is selected: ghost tile inserts, other block takes selection", async () => {
  const gridPage = createTwoColumnPage();
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // A block is selected and the floating toolbar (expanded panel) is open.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-left"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    // The FIRST click on a column ghost tile opens the pre-targeted palette —
    // no Escape/deselect step in between.
    clickSelector(view.container, 'button[aria-label="Add block to column 2"]');
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickPaletteBlock(view.container, "Quote");
    await flush();

    const inserted = view.container.querySelector('[data-page-editor-block="quote"]');
    expect(inserted).toBeTruthy();
    expect(inserted?.closest('[data-page-section-column="2"]')).toBeTruthy();

    // Re-select the first block; a single click on ANOTHER block hands the
    // selection over directly, without a prior deselect.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-right"]');
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-right"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-left"]')
        ?.getAttribute("data-selected")
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline-edit blur commits first and the same gesture's click target still acts", async () => {
  const gridPage = createTwoColumnPage();
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-left", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-left", "text");
    expect(region.getAttribute("data-page-editor-inline-edit")).toBe("active");
    setInlineRegionText(region, "Committed before insert");

    // Browser event order for a click outside an active contenteditable:
    // blur (commit) fires before the click reaches its target. The commit
    // must land AND the clicked ghost tile must still run its action — one
    // gesture, no third click.
    blurElement(region);
    clickSelector(view.container, 'button[aria-label="Add block to column 2"]');
    await flush();

    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickPaletteBlock(view.container, "Text");
    await flush();

    // The inline-edit commit persisted through the insert.
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-left"]')?.textContent
    ).toContain("Committed before insert");

    // Same contract when the click target is another block: commit, then the
    // clicked block takes the selection.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-left", "text"));
    await flush();
    const secondRegion = findInlineEditRegion(view.container, "blk-left", "text");
    setInlineRegionText(secondRegion, "Committed before reselect");
    blurElement(secondRegion);
    clickSelector(view.container, '[data-page-editor-block-id="blk-right"]');
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-right"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-left"]')?.textContent
    ).toContain("Committed before reselect");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props).toMatchObject({
      text: "Committed before reselect",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor reserves right-rail padding on the canvas scroller while a selection is active (builder chrome)", async () => {
  // TASK-495-02: the builder chrome (page host) docks the panel into a light
  // right rail, so the canvas reserves RIGHT padding (not bottom clearance) so
  // the centered frame is not occluded by the overlay. The legacy bottom
  // clearance (ResizeObserver + --page-editor-toolbar-clearance) is retained
  // for the menu host only.
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const scroller = view.container.querySelector(
      '[data-page-editor-canvas-scroller="true"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();

    // The editor auto-selects the first section, so the right rail is visible
    // and right padding is reserved from the start.
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
    expect(scroller.style.paddingRight).toBe("300px");
    // The builder branch never sets the legacy bottom-clearance var.
    expect(scroller.style.paddingBottom).toBe("");
    expect(scroller.style.getPropertyValue("--page-editor-toolbar-clearance")).toBe("");

    // Escape clears the selection: the rail unmounts and the padding is
    // released with it.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeFalsy();
    expect(scroller.style.paddingRight).toBe("");

    // Selecting a block restores the right padding.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    expect(scroller.style.paddingRight).toBe("300px");
  } finally {
    view.cleanup();
  }
});

// ---------------------------------------------------------------------------
// TASK-521-05-L01/L02 — compact page-settings side panel relocation + Effects.
// (Uses the shared flow harness above; the default page host has no
// `renderSettings`, so the compact panel — not the full-height Sheet — is the
// settings surface.)
// ---------------------------------------------------------------------------

const openPageSettingsPanel = (container: ParentNode) => {
  const trigger = container.querySelector('button[aria-label="Page settings"]');
  expect(trigger).toBeTruthy();
  React.act(() => {
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const panel = container.querySelector(
    '[data-page-editor-settings-panel="true"]'
  ) as HTMLElement | null;
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

test("TASK-521-05: page settings open in the COMPACT rail panel (not a Sheet) with all fields + Effects", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    // Not the full-height drawer: the mocked Sheet renders "sheet:right".
    expect(view.container.textContent).not.toContain("sheet:right");
    const labelTexts = Array.from(panel.querySelectorAll("label")).map((l) => l.textContent ?? "");
    expect(labelTexts.some((t) => t.includes("Title"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Slug"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Show in navigation"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Revision retention"))).toBe(true);
    expect(panel.querySelector('[data-page-editor-effects-section="true"]')).toBeTruthy();
    expect(findButton(panel, "Save settings")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: Title + Slug + Show-in-nav + Revision-retention persist through the explicit Save", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    changeField(panel, "Title", "Renamed Page");
    changeField(panel, "Slug", "/renamed");
    changeField(panel, "Show in navigation", "no");
    changeField(panel, "Revision retention", "25");
    clickButton(panel, "Save settings");
    await flush();
    expect(pageEditorState.updatePage).toHaveBeenCalled();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ title: "Renamed Page", slug: "/renamed" });
    const savedSettings = (call?.[1] as { data: PageDocumentV2 }).data.settings;
    expect(savedSettings.showInNav).toBe(false);
    expect(savedSettings.revisionRetention).toBe(25);
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: Effects toggle + size edit the live draft and persist on a normal Save draft", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    setToggleField(panel, "Cursor spotlight", true);
    setSliderField(panel, "Spotlight size", "600");
    clickButton(view.container, "Save draft");
    await flush();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    const effects = (call?.[1] as { data: PageDocumentV2 }).data.settings.effects;
    expect(effects?.cursorSpotlight).toBe(true);
    expect(effects?.spotlightSize).toBe(600);
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: disabling spotlight drops settings.effects (present-only)", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    setToggleField(panel, "Cursor spotlight", true);
    setToggleField(panel, "Cursor spotlight", false);
    clickButton(view.container, "Save draft");
    await flush();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: reload rehydrates the Effects controls from saved settings.effects", async () => {
  pageEditorState.cachedPage = createPage({
    currentData: createDocument({
      settings: {
        template: "page-v2",
        showInNav: true,
        revisionRetention: 10,
        effects: { cursorSpotlight: true, spotlightSize: 500 },
      },
    }),
  });
  pageEditorState.currentPage = pageEditorState.cachedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    const toggle = Array.from(panel.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Cursor spotlight"
    );
    expect(toggle?.getAttribute("aria-checked")).toBe("true");
    const range = panel.querySelector(
      'input[type="range"][data-page-editor-slider="Spotlight size"]'
    ) as HTMLInputElement | null;
    expect(range?.value).toBe("500");
  } finally {
    view.cleanup();
  }
});
