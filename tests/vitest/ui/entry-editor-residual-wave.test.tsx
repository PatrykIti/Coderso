// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, expect, test, vi } from "vitest";

import type {
  EntryDetail,
  EntryMetadataPayload,
  EntryPayload,
} from "../../../core/admin/services/entriesClient";
import type {
  ContentTaxonomy,
  ContentTerm,
  TaxonomyOverview,
} from "../../../core/admin/services/taxonomyClient";

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

  const dates = {
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-27T10:00:00Z",
  };
  const taxonomy = (id: string, kind: "category" | "tag", name: string): ContentTaxonomy => ({
    id,
    typeId: "type-1",
    name,
    slug: name.toLowerCase(),
    kind,
    ...dates,
  });
  const term = (id: string, taxonomyId: string, name: string): ContentTerm => ({
    id,
    taxonomyId,
    name,
    slug: name.toLowerCase(),
    ...dates,
  });
  const entry: EntryDetail = {
    id: "entry-1",
    typeId: "type-1",
    title: "Hello",
    slug: "hello",
    status: "draft",
    visibility: "public",
    hasPassword: false,
    ...dates,
    scheduledAt: null,
    seo: { description: "Meta" },
    taxonomy: {
      category: { id: "cat-1", name: "News", slug: "news" },
      tags: [{ id: "tag-1", name: "Launch", slug: "launch" }],
    },
    author: { id: "author-1", name: "Alex Doe", email: "alex@example.com" },
    data: {
      title: "Hello",
      summary: "Summary",
    },
  };

  const taxonomyOverview: TaxonomyOverview = {
    taxonomies: {
      category: taxonomy("cat-taxonomy", "category", "Categories"),
      tag: taxonomy("tag-taxonomy", "tag", "Tags"),
    },
    terms: {
      categories: [term("cat-1", "cat-taxonomy", "News")],
      tags: [term("tag-1", "tag-taxonomy", "Launch")],
    },
  };

  return {
    apiError,
    contentType,
    entry,
    taxonomyOverview,
    previewUrl: "https://preview.test/entry",
    subscribers: new Set<(event: { key: string }) => void>(),
    updateEntryCalls: [] as Array<Partial<EntryPayload>>,
    publishEntryCalls: [] as Array<{ type: string; id: string }>,
    updateMetadataCalls: [] as EntryMetadataPayload[],
    deleteEntryCalls: [] as Array<{ type: string; id: string }>,
    navigateCalls: [] as string[],
    previewCalls: [] as Array<{ type: string; id: string }>,
    createTermCalls: [] as Array<{
      taxonomyId: string;
      input: { name: string; slug?: string | null };
    }>,
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
    <div
      data-sheet-open={String(Boolean(open))}
      data-has-open-change={String(Boolean(onOpenChange))}
    >
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
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
  getEntryCached: vi.fn(async (type: string, id: string, options?: { force?: boolean }) => {
    entryEditorState.getEntryCalls.push({ type, id, force: options?.force });
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
  updateEntry: vi.fn(async (_type: string, _id: string, input: Partial<EntryPayload>) => {
    entryEditorState.updateEntryCalls.push(input);
    return {
      ...entryEditorState.entry,
      title: input.title ?? entryEditorState.entry.title,
      slug: input.slug ?? entryEditorState.entry.slug,
      data: input.data ?? entryEditorState.entry.data,
    };
  }),
  updateEntryMetadata: vi.fn(
    async (_type: string, _id: string, input: EntryMetadataPayload): Promise<EntryDetail> => {
      entryEditorState.updateMetadataCalls.push(input);
      if (entryEditorState.metadataError) throw entryEditorState.metadataError;
      return {
        ...entryEditorState.entry,
        status: input.status ?? entryEditorState.entry.status,
        scheduledAt:
          input.scheduledAt === undefined ? entryEditorState.entry.scheduledAt : input.scheduledAt,
        seo: { ...(entryEditorState.entry.seo ?? {}), ...(input.seo ?? {}) },
        taxonomy: input.taxonomy
          ? {
              category: input.taxonomy.categoryId
                ? {
                    id: input.taxonomy.categoryId,
                    name: "Updated category",
                    slug: "updated-category",
                  }
                : null,
              tags: (input.taxonomy.tagIds ?? []).map((id) => ({
                id,
                name: `Tag ${id}`,
                slug: `tag-${id}`,
              })),
            }
          : entryEditorState.entry.taxonomy,
      };
    }
  ),
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
    settings: {
      publicBaseUrl: string | null;
      contentRoutes: Array<{ type: string; detailPath: string; enabled: boolean }>;
    } | null,
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
  getTaxonomyOverview: vi.fn(
    async (): Promise<TaxonomyOverview> => entryEditorState.taxonomyOverview
  ),
  createTaxonomyTerm: vi.fn(
    async (
      taxonomyId: string,
      input: { name: string; slug?: string | null }
    ): Promise<ContentTerm> => {
      entryEditorState.createTermCalls.push({ taxonomyId, input });
      if (entryEditorState.createTermError) throw entryEditorState.createTermError;
      return {
        id: `${taxonomyId}-new`,
        taxonomyId,
        name: input.name,
        slug: input.slug ?? input.name.toLowerCase(),
        createdAt: "2026-06-18T10:00:00Z",
        updatedAt: "2026-06-27T10:00:00Z",
      };
    }
  ),
}));

// The dirty-navigation guard's confirm dialog is real Radix and is never opened here; the
// stub keeps this suite's import cost off that graph. Opening it is owned by
// tests/vitest/ui-integration/entry-editor-navigation-guard.test.tsx.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => {
      entryEditorState.navigateCalls.push(href);
    },
  }),
  // See entry-editor-restyle.test.tsx: no router means the dirty-navigation guard registers
  // no blocker, and the dedicated navigation-guard lane owns that behaviour.
  useOptionalAdminRouter: () => null,
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

// TASK-514-03: EntryEditorHeader was repurposed into the PageHeader actions
// cluster (`EntryEditorHeaderActions`), now imported + rendered by EntryEditor.
// The real presentational component (badges + Runtime preview / History / Save
// draft / Publish buttons) renders here so the action buttons stay assertable —
// no mock needed.
vi.mock("../../../core/admin/ui/entries/EntryDeleteDialog", () => ({
  EntryDeleteDialog: ({
    open,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-entry-delete-dialog="true">
        <button type="button" data-entry-delete-confirm="true" onClick={onConfirm}>
          confirm-delete
        </button>
        <button type="button" data-entry-delete-close="true" onClick={() => onOpenChange?.(false)}>
          close-delete
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    onStatusChange,
    onScheduledAtChange,
    onSeoDescriptionChange,
    onSeoTitleChange,
    onSeoCanonicalUrlChange,
    onSeoRobotsChange,
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
    onSeoTitleChange?: (value: string) => void;
    onSeoCanonicalUrlChange?: (value: string) => void;
    onSeoRobotsChange?: (value: string) => void;
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
      <button type="button" onClick={() => onScheduledAtChange("not-a-date")}>
        metadata-bad-schedule
      </button>
      <button type="button" onClick={() => onSeoDescriptionChange("New meta")}>
        metadata-seo
      </button>
      <button type="button" onClick={() => onSeoTitleChange?.("New SEO title")}>
        metadata-seo-title
      </button>
      <button
        type="button"
        onClick={() => onSeoCanonicalUrlChange?.("https://site.test/canonical")}
      >
        metadata-seo-canonical
      </button>
      <button type="button" onClick={() => onSeoRobotsChange?.("noindex")}>
        metadata-seo-robots
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  entryEditorState.reset();
  window.history.replaceState({}, "", "/");
});

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

test("rejects an invalid scheduled date before sending the metadata patch", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "metadata-status")?.click();
    });
    await flush();
    React.act(() => {
      buttons.find((button) => button.textContent === "metadata-bad-schedule")?.click();
    });
    await flush();
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("Schedule date must be a valid ISO timestamp.");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Schedule date must be a valid ISO timestamp."
    );
    expect(entryEditorState.updateMetadataCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("surfaces a failed metadata save through the error banner and toast", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");
  entryEditorState.metadataError = entryEditorState.apiError("metadata down");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("metadata down");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("metadata down");
  } finally {
    view.cleanup();
  }
});

test("surfaces a failed delete and drops a superseded second delete", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");
  entryEditorState.deleteError = entryEditorState.apiError("delete down");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { deleteEntry } = await import("@/services/entriesClient");
  let releaseDelete!: () => void;
  const deleteGate = new Promise<void>((resolve) => {
    releaseDelete = resolve;
  });
  let deleteCount = 0;
  vi.mocked(deleteEntry).mockImplementation(async (type: string, id: string) => {
    entryEditorState.deleteEntryCalls.push({ type, id });
    deleteCount += 1;
    if (deleteCount === 1) await deleteGate;
    throw entryEditorState.deleteError;
  });

  const view = mount(<EntryEditor />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "delete-entry")?.click();
    });
    React.act(() => {
      view.container
        .querySelector("button[data-entry-delete-confirm='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // The first delete is parked; a second confirm supersedes it.
    React.act(() => {
      view.container
        .querySelector("button[data-entry-delete-confirm='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("delete down");

    React.act(() => releaseDelete());
    await flush();

    expect(entryEditorState.deleteEntryCalls).toHaveLength(2);
    expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1);
    expect(entryEditorState.navigateCalls).toHaveLength(0);
  } finally {
    vi.mocked(deleteEntry).mockRestore();
    view.cleanup();
  }
});

test("records SEO title, canonical URL, and robots changes in the metadata payload", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "metadata-seo-title")?.click();
    });
    await flush();
    React.act(() => {
      buttons.find((button) => button.textContent === "metadata-seo-canonical")?.click();
    });
    await flush();
    React.act(() => {
      buttons.find((button) => button.textContent === "metadata-seo-robots")?.click();
    });
    await flush();
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    const payload = entryEditorState.updateMetadataCalls.at(-1) as {
      seo: { title?: string; canonicalUrl?: string; robots?: string };
    };
    expect(payload.seo.title).toBe("New SEO title");
    expect(payload.seo.canonicalUrl).toBe("https://site.test/canonical");
    expect(payload.seo.robots).toBe("noindex");
  } finally {
    view.cleanup();
  }
});

test("tolerates a site settings read failure without blocking the editor", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { getSiteSettings } = await import("@/services/siteSettingsClient");
  vi.mocked(getSiteSettings).mockRejectedValueOnce(new Error("settings down"));

  const view = mount(<EntryEditor />);

  try {
    await flush();

    expect(vi.mocked(getSiteSettings)).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Edit Article");
  } finally {
    view.cleanup();
  }
});

test("tolerates a taxonomy overview read failure and keeps the editor usable", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { getTaxonomyOverview } = await import("@/services/taxonomyClient");
  vi.mocked(getTaxonomyOverview).mockRejectedValueOnce(new Error("taxonomy down"));

  const view = mount(<EntryEditor />);

  try {
    await flush();

    expect(vi.mocked(getTaxonomyOverview)).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Edit Article");
  } finally {
    view.cleanup();
  }
});

test("drops a baseline taxonomy overview that resolves after a newer read claimed the snapshot", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { getTaxonomyOverview } = await import("@/services/taxonomyClient");
  let releaseTaxonomy!: () => void;
  const taxonomyGate = new Promise<void>((resolve) => {
    releaseTaxonomy = resolve;
  });
  vi.mocked(getTaxonomyOverview).mockReturnValue(
    taxonomyGate.then(() => entryEditorState.taxonomyOverview)
  );

  const view = mount(<EntryEditor />);

  try {
    await flush();

    // The baseline read parked on the taxonomy gate after hydrating; a cache-bus
    // read starts while it is still parked and claims the snapshot.
    React.act(() => {
      for (const subscriber of entryEditorState.subscribers) {
        subscriber({ key: "entry:articles:entry-1" });
      }
    });
    await flush();

    React.act(() => releaseTaxonomy());
    await flush();

    expect(vi.mocked(getTaxonomyOverview)).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).toContain("Edit Article");
  } finally {
    vi.mocked(getTaxonomyOverview).mockRestore();
    view.cleanup();
  }
});

test("drops a failed read whose ticket was superseded by a newer hydration", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { getEntryCached } = await import("@/services/entriesClient");
  let rejectRead!: (error: unknown) => void;
  const failingRead = new Promise<never>((_, reject) => {
    rejectRead = reject;
  });
  vi.mocked(getEntryCached)
    .mockReturnValueOnce(failingRead)
    .mockImplementation(async (type: string, id: string, options?: { force?: boolean }) => {
      entryEditorState.getEntryCalls.push({ type, id, force: options?.force });
      return entryEditorState.entry;
    });

  const view = mount(<EntryEditor />);

  try {
    await flush();

    // A newer cache-bus read hydrates the editor while the baseline is still failing.
    React.act(() => {
      for (const subscriber of entryEditorState.subscribers) {
        subscriber({ key: "entry:articles:entry-1" });
      }
    });
    await flush();

    React.act(() => rejectRead(new Error("network down")));
    await flush();

    expect(view.container.textContent).not.toContain("Unable to load entry");
    expect(view.container.textContent).toContain("Edit Article");
  } finally {
    vi.mocked(getEntryCached).mockRestore();
    view.cleanup();
  }
});

test("a superseded metadata save response does not settle the mutation or toast twice", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { updateEntryMetadata } = await import("@/services/entriesClient");
  let releaseMetadata!: () => void;
  const metadataGate = new Promise<void>((resolve) => {
    releaseMetadata = resolve;
  });
  let metadataCount = 0;
  vi.mocked(updateEntryMetadata).mockImplementation(
    async (_type: string, _id: string, input: EntryMetadataPayload) => {
      entryEditorState.updateMetadataCalls.push(input);
      metadataCount += 1;
      if (metadataCount === 1) await metadataGate;
      return entryEditorState.entry;
    }
  );

  const view = mount(<EntryEditor />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    // A second metadata save starts and completes while the first is parked.
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Metadata saved.");

    React.act(() => releaseMetadata());
    await flush();

    expect(entryEditorState.updateMetadataCalls).toHaveLength(2);
    expect(vi.mocked(toast.success)).toHaveBeenCalledTimes(1);
  } finally {
    vi.mocked(updateEntryMetadata).mockRestore();
    view.cleanup();
  }
});

test("drops a superseded metadata save failure without an error toast", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");

  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const { updateEntryMetadata } = await import("@/services/entriesClient");
  let rejectMetadata!: (error: unknown) => void;
  const failingMeta = new Promise<never>((_, reject) => {
    rejectMetadata = reject;
  });
  let metadataCount = 0;
  vi.mocked(updateEntryMetadata).mockImplementation(
    async (_type: string, _id: string, input: EntryMetadataPayload) => {
      entryEditorState.updateMetadataCalls.push(input);
      metadataCount += 1;
      if (metadataCount === 1) return failingMeta;
      return entryEditorState.entry;
    }
  );

  const view = mount(<EntryEditor />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    // A second save completes and supersedes the parked first one.
    React.act(() => {
      buttons.find((button) => button.textContent === "save-metadata")?.click();
    });
    await flush();

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Metadata saved.");

    React.act(() => rejectMetadata(new Error("late failure")));
    await flush();

    expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    expect(entryEditorState.updateMetadataCalls).toHaveLength(2);
  } finally {
    vi.mocked(updateEntryMetadata).mockRestore();
    view.cleanup();
  }
});
