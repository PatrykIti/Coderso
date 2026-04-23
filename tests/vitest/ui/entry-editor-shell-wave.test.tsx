// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const entryEditorState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const contentType = {
    id: "type-1",
    slug: "articles",
    name: "Articles",
    schema: { type: "object" },
  };

  const entry = {
    id: "entry-1",
    title: "Hello",
    slug: "hello",
    status: "draft" as const,
    scheduledAt: null,
    seo: { description: "Meta" },
    taxonomy: {
      category: { id: "cat-1", name: "News" },
      tags: [{ id: "tag-1", name: "Launch" }],
    },
    author: { name: "Alex Doe", email: "alex@example.com" },
    data: {
      title: "Hello",
      summary: "Summary",
    },
  };

  const taxonomyOverview = {
    taxonomies: {
      category: { id: "cat-taxonomy" },
      tag: { id: "tag-taxonomy" },
    },
    terms: {
      categories: [{ id: "cat-1", name: "News", slug: "news" }],
      tags: [{ id: "tag-1", name: "Launch", slug: "launch" }],
    },
  };

  return {
    apiError,
    contentType,
    entry,
    taxonomyOverview,
    previewUrl: "https://preview.test/entry",
    subscribers: new Set<(event: { key: string }) => void>(),
    updateEntryCalls: [] as Array<Record<string, unknown>>,
    publishEntryCalls: [] as Array<{ type: string; id: string }>,
    updateMetadataCalls: [] as Array<Record<string, unknown>>,
    deleteEntryCalls: [] as Array<{ type: string; id: string }>,
    navigateCalls: [] as string[],
    previewCalls: [] as Array<{ type: string; id: string }>,
    createTermCalls: [] as Array<{ taxonomyId: string; input: Record<string, unknown> }>,
    getEntryCalls: [] as Array<{ type: string; id: string; force?: boolean }>,
    detailError: null as unknown,
    previewError: null as unknown,
    publishError: null as unknown,
    metadataError: null as unknown,
    deleteError: null as unknown,
    createTermError: null as unknown,
    reset() {
      this.previewUrl = "https://preview.test/entry";
      this.subscribers.clear();
      this.updateEntryCalls = [];
      this.publishEntryCalls = [];
      this.updateMetadataCalls = [];
      this.deleteEntryCalls = [];
      this.navigateCalls = [];
      this.previewCalls = [];
      this.createTermCalls = [];
      this.getEntryCalls = [];
      this.detailError = null;
      this.previewError = null;
      this.publishError = null;
      this.metadataError = null;
      this.deleteError = null;
      this.createTermError = null;
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: React.forwardRef(function MockTextarea(
    {
      value,
      onChange,
      ...props
    }: {
      value?: string;
      onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
      [key: string]: unknown;
    },
    ref: React.Ref<HTMLTextAreaElement>
  ) {
    return <textarea ref={ref} defaultValue={value} onChange={onChange} {...props} />;
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    entryDetail: (type: string, id: string) => `entry:${type}:${id}`,
    contentTypesList: "contentTypesList",
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => [entryEditorState.contentType],
  listContentTypesCached: vi.fn(async () => [entryEditorState.contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  deleteEntry: vi.fn(async (type: string, id: string) => {
    entryEditorState.deleteEntryCalls.push({ type, id });
    if (entryEditorState.deleteError) throw entryEditorState.deleteError;
    return { ok: true };
  }),
  getCachedEntryDetail: () => entryEditorState.entry,
  getEntryCached: vi.fn(async (type: string, id: string, { force }: { force?: boolean } = {}) => {
    entryEditorState.getEntryCalls.push({ type, id, force });
    if (entryEditorState.detailError) throw entryEditorState.detailError;
    return entryEditorState.entry;
  }),
  previewEntry: vi.fn(async (type: string, id: string) => {
    entryEditorState.previewCalls.push({ type, id });
    if (entryEditorState.previewError) throw entryEditorState.previewError;
    return { previewUrl: entryEditorState.previewUrl };
  }),
  publishEntry: vi.fn(async (type: string, id: string) => {
    entryEditorState.publishEntryCalls.push({ type, id });
    if (entryEditorState.publishError) throw entryEditorState.publishError;
    return { ok: true };
  }),
  updateEntry: vi.fn(async (_type: string, _id: string, input) => {
    entryEditorState.updateEntryCalls.push(input);
    return {
      ...entryEditorState.entry,
      title: input.title,
      slug: input.slug,
      data: input.data,
    };
  }),
  updateEntryMetadata: vi.fn(async (_type: string, _id: string, input) => {
    entryEditorState.updateMetadataCalls.push(input);
    if (entryEditorState.metadataError) throw entryEditorState.metadataError;
    return {
      ...entryEditorState.entry,
      status: input.status,
      scheduledAt: input.scheduledAt,
      seo: { description: input.seo.description },
      taxonomy: {
        category: input.taxonomy?.categoryId
          ? { id: input.taxonomy.categoryId, name: "Updated category" }
          : null,
        tags: (input.taxonomy?.tagIds ?? []).map((id: string) => ({
          id,
          name: `Tag ${id}`,
        })),
      },
    };
  }),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => ({
    publicBaseUrl: "https://site.test",
    contentRoutes: [
      {
        type: "articles",
        listPath: "/articles",
        detailPath: "/articles/:slug",
        enabled: true,
      },
    ],
  })),
  resolveContentSlugRouteContext: (
    settings: { publicBaseUrl: string | null; contentRoutes: Array<{ type: string; detailPath: string; enabled: boolean }> } | null,
    contentTypeSlug: string
  ) => ({
    publicBaseUrl: settings?.publicBaseUrl ?? null,
    contentTypeSlug,
    detailPathPattern:
      settings?.contentRoutes.find((route) => route.type === contentTypeSlug && route.enabled)
        ?.detailPath ?? `/${contentTypeSlug}/:slug`,
    routeEnabled: true,
  }),
  resolveContentSlugDisplay: (
    context: { publicBaseUrl: string | null; detailPathPattern: string },
    slug: string
  ) => ({
    label: context.publicBaseUrl ? "Public URL" : "Route hint",
    value: `${context.publicBaseUrl ?? ""}${context.detailPathPattern.replace(":slug", slug)}`,
    concrete: Boolean(context.publicBaseUrl),
  }),
}));

vi.mock("@/services/taxonomyClient", () => ({
  getTaxonomyOverview: vi.fn(async () => entryEditorState.taxonomyOverview),
  createTaxonomyTerm: vi.fn(async (taxonomyId: string, input: Record<string, unknown>) => {
    entryEditorState.createTermCalls.push({ taxonomyId, input });
    if (entryEditorState.createTermError) throw entryEditorState.createTermError;
    return {
      id: `${taxonomyId}-new`,
      name: input.name,
      slug: String(input.name).toLowerCase(),
    };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => {
      entryEditorState.navigateCalls.push(href);
    },
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    entryEditorState.subscribers.add(handler);
    return () => entryEditorState.subscribers.delete(handler);
  },
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    previewUrl,
    error,
  }: {
    open: boolean;
    previewUrl: string | null;
    error: string | null;
  }) => <div>{`preview:${open ? "open" : "closed"}:${previewUrl ?? "none"}:${error ?? "ok"}`}</div>,
}));

vi.mock("../../../core/admin/ui/entries/EntryEditorHeader", () => ({
  EntryEditorHeader: ({
    entryLabel,
    status,
  }: {
    entryLabel: string;
    status: string;
  }) => <div>{`${entryLabel}:${status}`}</div>,
}));

vi.mock("../../../core/admin/ui/entries/EntryDeleteDialog", () => ({
  EntryDeleteDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-entry-delete-dialog="true">
        <button type="button" data-entry-delete-confirm="true" onClick={onConfirm}>
          confirm-delete
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    onStatusChange,
    onScheduledAtChange,
    onSeoDescriptionChange,
    onCategoryChange,
    onTagIdsChange,
    onCreateCategory,
    onCreateTag,
    onSave,
    onDelete,
  }: {
    onStatusChange: (status: "draft" | "published" | "scheduled" | "archived") => void;
    onScheduledAtChange: (value: string) => void;
    onSeoDescriptionChange: (value: string) => void;
    onCategoryChange?: (id: string | null) => void;
    onTagIdsChange?: (ids: string[]) => void;
    onCreateCategory?: (name: string) => Promise<unknown>;
    onCreateTag?: (name: string) => Promise<unknown>;
    onSave?: () => void;
    onDelete?: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onStatusChange("scheduled")}>
        metadata-status
      </button>
      <button type="button" onClick={() => onScheduledAtChange("2026-03-09T10:00:00Z")}>
        metadata-schedule
      </button>
      <button type="button" onClick={() => onSeoDescriptionChange("New meta")}>
        metadata-seo
      </button>
      <button type="button" onClick={() => onCategoryChange?.("cat-2")}>
        metadata-category
      </button>
      <button type="button" onClick={() => onTagIdsChange?.(["tag-1", "tag-2"])}>
        metadata-tags
      </button>
      <button type="button" onClick={() => void onCreateCategory?.("Updates")}>
        create-category
      </button>
      <button type="button" onClick={() => void onCreateTag?.("Featured")}>
        create-tag
      </button>
      <button type="button" onClick={onSave}>
        save-metadata
      </button>
      <button type="button" onClick={onDelete}>
        delete-entry
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/entries/FieldRenderer", () => ({
  FieldRenderer: ({
    field,
    onChange,
  }: {
    field: { name: string };
    onChange: (value: unknown) => void;
  }) => (
    <button type="button" onClick={() => onChange(`${field.name}-updated`)}>
      {`field:${field.name}`}
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/content-types/schemaMapping", () => ({
  fieldsFromSchema: () => [
    { id: "field-1", name: "title", label: "Title", type: "text" },
    { id: "field-2", name: "summary", label: "Summary", type: "text" },
  ],
  buildSchemaFromFields: () => ({
    properties: {
      title: {},
      summary: {},
    },
  }),
}));

vi.mock("../../../core/admin/ui/entries/contentTypeLabels", () => ({
  getContentTypeLabels: () => ({
    singular: "Article",
    plural: "Articles",
  }),
}));

vi.mock("../../../core/admin/ui/entries/entryChecklist", () => ({
  buildEntryChecklist: ({ title }: { title: string }) => ({
    items: [{ id: "seo", label: "SEO", status: "warning", detail: title }],
    blockingIssues: title ? [] : ["Title is required"],
    missingRequiredFields: title ? [] : [{ name: "title" }],
  }),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  entryEditorState.reset();
  window.history.replaceState({}, "", "/");
});

test("EntryEditor loads cached data and drives preview, save, publish, metadata, and refresh flows", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import(
    "../../../core/admin/ui/entries/EntryEditor"
  );

  const view = mount(<EntryEditor />);

  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Hello:draft");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const slugInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => !input.getAttribute("type")
    );

    act(() => {
      const titleArea = textareas[0];
      titleArea && (titleArea.value = "Updated title");
      titleArea?.dispatchEvent(new Event("input", { bubbles: true }));
      slugInput && ((slugInput as HTMLInputElement).value = "updated-title");
      slugInput?.dispatchEvent(new Event("input", { bubbles: true }));
      buttons.find((button) => button.textContent === "field:summary")?.click();
      buttons.find((button) => button.textContent === "Runtime preview")?.click();
      buttons.find((button) => button.textContent === "Save draft")?.click();
      buttons.find((button) => button.textContent === "Publish")?.click();
      buttons.find((button) => button.textContent === "Details")?.click();
      buttons.find((button) => button.textContent === "metadata-status")?.click();
      buttons.find((button) => button.textContent === "metadata-schedule")?.click();
      buttons.find((button) => button.textContent === "metadata-seo")?.click();
      buttons.find((button) => button.textContent === "metadata-category")?.click();
      buttons.find((button) => button.textContent === "metadata-tags")?.click();
      buttons.find((button) => button.textContent === "create-category")?.click();
      buttons.find((button) => button.textContent === "create-tag")?.click();
      buttons.find((button) => button.textContent === "save-metadata")?.click();
      buttons.find((button) => button.textContent === "delete-entry")?.click();
    });
    act(() => {
      view.container
        .querySelector("button[data-entry-delete-confirm='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(entryEditorState.previewCalls[0]).toEqual({
      type: "articles",
      id: "entry-1",
    });
    expect(entryEditorState.updateEntryCalls.length).toBeGreaterThan(0);
    expect(entryEditorState.publishEntryCalls[0]).toEqual({
      type: "articles",
      id: "entry-1",
    });
    expect(entryEditorState.updateMetadataCalls.length).toBeGreaterThan(0);
    expect(entryEditorState.createTermCalls).toEqual([
      { taxonomyId: "cat-taxonomy", input: { name: "Updates" } },
      { taxonomyId: "tag-taxonomy", input: { name: "Featured" } },
    ]);
    expect(entryEditorState.deleteEntryCalls).toEqual([
      { type: "articles", id: "entry-1" },
    ]);
    expect(entryEditorState.navigateCalls).toContain("/entries");
    expect(view.container.textContent).toContain("preview:open:");

    act(() => {
      buttons.find((button) => button.textContent === "field:summary")?.click();
    });

    await act(async () => {
      for (const subscriber of entryEditorState.subscribers) {
        subscriber({ key: "entry:articles:entry-1" });
      }
      await Promise.resolve();
    });

    act(() => {
      buttons.find((button) => button.textContent === "Refresh")?.click();
    });

    expect(entryEditorState.getEntryCalls.length).toBeGreaterThan(1);
  } finally {
    view.cleanup();
  }
});
