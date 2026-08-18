// @vitest-environment happy-dom

// TASK-514-03: locks the new visibility wiring (end-to-end metadata payload
// across the three accessPassword states) and the field-grouping decision
// (every authored group renders as its own SectionCard — no two-card flatten,
// no dropped field). Harness mirrors entry-editor-restyle.test.tsx (createRoot +
// React.act + hoisted state), mocking the metadata panel with explicit
// visibility controls so the payload branch is directly assertable.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => {
  const contentType = {
    id: "type-1",
    slug: "articles",
    name: "Articles",
    schema: { type: "object" },
  };

  const entry = {
    id: "entry-42",
    title: "Hello",
    slug: "hello",
    status: "draft" as const,
    visibility: "public" as const,
    hasPassword: false,
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-27T10:00:00Z",
    scheduledAt: null,
    seo: {
      title: "Hello SEO",
      description: "Meta",
      canonicalUrl: "https://site.test/hello",
      robots: "index,follow",
    },
    taxonomy: { category: null, tags: [] },
    author: { name: "Maria Nowak", email: "maria@example.com" },
    data: { title: "Hello", summary: "Summary" },
  };

  const revisions = [
    {
      id: "rev-1",
      entryId: "entry-42",
      version: 1,
      createdAt: "2026-06-18T10:00:00Z",
      createdBy: { id: "user-1", name: "Maria Nowak", email: "maria@example.com" },
    },
    {
      id: "rev-2",
      entryId: "entry-42",
      version: 2,
      createdAt: "2026-06-27T10:00:00Z",
      createdBy: { id: "user-1", name: "Maria Nowak", email: "maria@example.com" },
    },
  ];

  const restoredEntry = {
    ...entry,
    title: "Restored Title",
    slug: "restored-slug",
    data: { title: "Restored Title", summary: "Restored summary" },
  };

  return {
    contentType,
    entry,
    revisions,
    restoredEntry,
    updateMetadataCalls: [] as Array<Record<string, unknown>>,
    subscribers: new Set<(event: { key: string }) => void>(),
    reset() {
      this.updateMetadataCalls = [];
      this.subscribers.clear();
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
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    return <textarea ref={ref} value={value} onChange={onChange} {...props} />;
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/services/apiClient", () => ({ isApiClientError: () => false }));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    entryDetail: (type: string, id: string) => `entry:${type}:${id}`,
    contentTypesList: "contentTypesList",
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => [state.contentType],
  listContentTypesCached: vi.fn(async () => [state.contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  deleteEntry: vi.fn(async () => ({ ok: true })),
  getCachedEntryDetail: () => state.entry,
  getCachedEntryRevisions: () => null,
  getEntryCached: vi.fn(async () => state.entry),
  getEntryRevisionData: vi.fn(async (_type: string, _id: string, revisionId: string) => ({
    ...state.revisions.find((revision) => revision.id === revisionId),
    data: { title: "Hello", summary: "Preview summary" },
  })),
  listEntryRevisionsCached: vi.fn(async () => state.revisions),
  previewEntry: vi.fn(async () => ({ previewUrl: "https://preview.test/entry" })),
  publishEntry: vi.fn(async () => ({ ok: true })),
  restoreEntryRevision: vi.fn(async () => ({ entry: state.restoredEntry })),
  updateEntry: vi.fn(async (_type: string, _id: string, input) => ({ ...state.entry, ...input })),
  updateEntryMetadata: vi.fn(async (_type: string, _id: string, input) => {
    state.updateMetadataCalls.push(input);
    return {
      ...state.entry,
      status: input.status,
      visibility: input.visibility ?? state.entry.visibility,
      hasPassword: input.visibility === "password" ? true : false,
      scheduledAt: input.scheduledAt,
      seo: {
        title: input.seo?.title ?? "",
        description: input.seo?.description ?? "",
        canonicalUrl: input.seo?.canonicalUrl ?? "",
        robots: input.seo?.robots ?? "",
      },
    };
  }),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => ({ publicBaseUrl: "https://site.test", contentRoutes: [] })),
  resolveContentSlugRouteContext: () => ({
    publicBaseUrl: "https://site.test",
    contentTypeSlug: "articles",
    detailPathPattern: "/articles/:slug",
    routeEnabled: true,
  }),
  resolveContentSlugDisplay: () => ({
    label: "Public URL",
    value: "https://site.test/articles/hello",
    concrete: true,
  }),
}));

vi.mock("@/services/taxonomyClient", () => ({
  getTaxonomyOverview: vi.fn(async () => null),
  createTaxonomyTerm: vi.fn(async () => ({ id: "term-new", name: "New", slug: "new" })),
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
  useAdminRouter: () => ({ navigate: vi.fn() }),
  // See entry-editor-restyle.test.tsx: no router means the dirty-navigation guard registers
  // no blocker, and the dedicated navigation-guard lane owns that behaviour.
  useOptionalAdminRouter: () => null,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    state.subscribers.add(handler);
    return () => state.subscribers.delete(handler);
  },
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({ open }: { open: boolean }) => (
    <div>{`preview:${open ? "open" : "closed"}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/entries/EntryDeleteDialog", () => ({
  EntryDeleteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-delete-dialog="true" /> : null,
}));

// Panel mock with explicit visibility controls so the EntryEditor payload branch
// is directly assertable (the real Radix Select is impractical in happy-dom).
vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    visibility,
    onVisibilityChange,
    onAccessPasswordChange,
    hasPassword,
    createdAt,
    updatedAt,
    entryId,
    seoTitle,
    seoCanonicalUrl,
    seoRobots,
    onSave,
  }: {
    visibility?: string;
    onVisibilityChange?: (value: "public" | "private" | "password") => void;
    onAccessPasswordChange?: (value: string) => void;
    hasPassword?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    entryId?: string | null;
    seoTitle?: string;
    seoCanonicalUrl?: string;
    seoRobots?: string;
    onSave?: () => void;
  }) => (
    <div data-metadata-panel="true">
      <span>{`visibility:${visibility}`}</span>
      <span>{`hasPassword:${String(hasPassword)}`}</span>
      <span>{`created:${createdAt ?? "—"}`}</span>
      <span>{`updated:${updatedAt ?? "—"}`}</span>
      <span>{`entryId:${entryId ?? "—"}`}</span>
      <span>{`seoTitle:${seoTitle ?? ""}`}</span>
      <span>{`seoCanonicalUrl:${seoCanonicalUrl ?? ""}`}</span>
      <span>{`seoRobots:${seoRobots ?? ""}`}</span>
      <button type="button" onClick={() => onVisibilityChange?.("password")}>
        vis-password
      </button>
      <button type="button" onClick={() => onVisibilityChange?.("public")}>
        vis-public
      </button>
      <button type="button" onClick={() => onAccessPasswordChange?.("secret")}>
        set-password
      </button>
      <button type="button" onClick={onSave}>
        save-metadata
      </button>
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    isConfirming,
    onConfirm,
    children,
  }: {
    open: boolean;
    title: React.ReactNode;
    description?: React.ReactNode;
    confirmLabel: string;
    isConfirming?: boolean;
    onConfirm: () => void;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog">
        <p>{title}</p>
        {description ? <p>{description}</p> : null}
        {children}
        <button type="button" onClick={onConfirm} disabled={Boolean(isConfirming)}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/entries/FieldRenderer", () => ({
  FieldRenderer: ({ field }: { field: { name: string } }) => <div>{`field:${field.name}`}</div>,
}));

vi.mock("../../../core/admin/ui/content-types/schemaMapping", () => ({
  fieldsFromSchema: () => [
    { id: "f1", name: "title", label: "Title", type: "text" },
    { id: "f2", name: "summary", label: "Summary", type: "text" },
    { id: "f3", name: "cover", label: "Cover", type: "media" },
    { id: "f4", name: "related", label: "Related", type: "relation" },
  ],
  buildSchemaFromFields: () => ({
    properties: { title: {}, summary: {}, cover: {}, related: {} },
  }),
}));

vi.mock("../../../core/admin/ui/entries/contentTypeLabels", () => ({
  getContentTypeLabels: () => ({ singular: "Article", plural: "Articles" }),
}));

vi.mock("../../../core/admin/ui/entries/entryChecklist", () => ({
  buildEntryChecklist: ({ title }: { title: string }) => ({
    items: [],
    blockingIssues: title ? [] : ["Title is required"],
    missingRequiredFields: [],
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

async function flushAsync() {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const clickButton = (container: HTMLElement, label: string) => {
  React.act(() => {
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === label)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  state.reset();
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = "";
});

test("every authored group renders as its own SectionCard and no field is dropped", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    const text = view.container.textContent ?? "";
    // Content card (Title/Slug + text fields), plus Media and Relations cards.
    expect(text).toContain("Content");
    expect(text).toContain("Media");
    expect(text).toContain("Relations");
    // No field dropped by the grouping (guards the two-card flatten).
    expect(text).toContain("field:summary");
    expect(text).toContain("field:cover");
    expect(text).toContain("field:related");
    // History revisions seam present.
    const labels = Array.from(view.container.querySelectorAll("button")).map((b) => b.textContent);
    expect(labels).toContain("History");
    // Metadata card fed real created/updated/id.
    expect(text).toContain("created:2026-06-18T10:00:00Z");
    expect(text).toContain("updated:2026-06-27T10:00:00Z");
    expect(text).toContain("entryId:entry-42");
  } finally {
    view.cleanup();
  }
});

test("password visibility with an untouched field omits accessPassword (keeps hash)", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    expect(view.container.textContent).not.toContain("Unsaved changes");

    clickButton(view.container, "vis-password");
    // Switching visibility marks metadata-unsaved.
    expect(view.container.textContent).toContain("Unsaved changes");

    clickButton(view.container, "save-metadata");
    await flushAsync();

    expect(state.updateMetadataCalls).toHaveLength(1);
    const payload = state.updateMetadataCalls[0];
    expect(payload.visibility).toBe("password");
    // Untouched "" while password → key omitted (undefined = keep existing hash).
    expect(payload.accessPassword).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("password visibility with a typed value sends that value", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    clickButton(view.container, "vis-password");
    clickButton(view.container, "set-password");
    clickButton(view.container, "save-metadata");
    await flushAsync();

    const payload = state.updateMetadataCalls[0];
    expect(payload.visibility).toBe("password");
    expect(payload.accessPassword).toBe("secret");
  } finally {
    view.cleanup();
  }
});

test("switching away from password clears the hash (accessPassword: null)", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    clickButton(view.container, "vis-password");
    clickButton(view.container, "set-password");
    // Leaving password mode discards the typed value and clears the stored hash.
    clickButton(view.container, "vis-public");
    clickButton(view.container, "save-metadata");
    await flushAsync();

    const payload = state.updateMetadataCalls[0];
    expect(payload.visibility).toBe("public");
    expect(payload.accessPassword).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("loading an entry hydrates the SEO title/canonical/robots into the metadata panel", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    const text = view.container.textContent ?? "";
    // All three new fields come from entry.seo, not from panel defaults.
    expect(text).toContain("seoTitle:Hello SEO");
    expect(text).toContain("seoCanonicalUrl:https://site.test/hello");
    expect(text).toContain("seoRobots:index,follow");
  } finally {
    view.cleanup();
  }
});

test("saving metadata sends the full seo object with all four fields", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    clickButton(view.container, "save-metadata");
    await flushAsync();

    const payload = state.updateMetadataCalls[0];
    expect(payload.seo).toEqual({
      title: "Hello SEO",
      description: "Meta",
      canonicalUrl: "https://site.test/hello",
      robots: "index,follow",
    });
  } finally {
    view.cleanup();
  }
});

test("History opens the revision drawer and revalidates through the client", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    expect(view.container.textContent).not.toContain("Version 2");
    clickButton(view.container, "History");
    await flushAsync();

    // No cached revisions (getCachedEntryRevisions -> null), so the drawer
    // fetches without force and lists both revisions.
    const listMock = (await import("@/services/entriesClient")).listEntryRevisionsCached;
    expect(listMock).toHaveBeenCalledWith("articles", "entry-42", { force: false });
    expect(view.container.textContent).toContain("Version 2");
  } finally {
    view.cleanup();
  }
});

test("restoring a revision re-hydrates title, slug and field values", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const entriesClient = await import("@/services/entriesClient");
  // One revision in the drawer so the Restore action is unambiguous.
  (entriesClient.listEntryRevisionsCached as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
    state.revisions[1],
  ]);
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    clickButton(view.container, "History");
    await flushAsync();

    // The restored snapshot replaces the editor's title and slug columns.
    const titleInput = view.container.querySelector('textarea[placeholder="Enter post title..."]');
    const slugInput = view.container.querySelector("input");
    expect((titleInput as HTMLTextAreaElement | null)?.value).toBe("Hello");
    expect((slugInput as HTMLInputElement | null)?.value).toBe("hello");

    clickButton(view.container, "Restore");
    // Confirm-gated: nothing happens until the dialog confirm is clicked.
    expect((await import("@/services/entriesClient")).restoreEntryRevision).not.toHaveBeenCalled();

    const dialog = view.container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Restore revision?");
    React.act(() => {
      Array.from(dialog?.querySelectorAll("button") ?? []).forEach((button) => {
        if (button.textContent === "Restore") {
          button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      });
    });
    await flushAsync();

    const restoreMock = (await import("@/services/entriesClient")).restoreEntryRevision;
    expect(restoreMock).toHaveBeenCalledWith("articles", "entry-42", "rev-2");
    expect((titleInput as HTMLTextAreaElement | null)?.value).toBe("Restored Title");
    expect((slugInput as HTMLInputElement | null)?.value).toBe("restored-slug");
  } finally {
    view.cleanup();
  }
});

test("restore failure renders the error and keeps the editor mounted", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-42");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
  const entriesClient = await import("@/services/entriesClient");
  (entriesClient.restoreEntryRevision as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
    new Error("entry_validation_failed")
  );
  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    clickButton(view.container, "History");
    await flushAsync();
    clickButton(view.container, "Restore");
    React.act(() => {
      const dialog = view.container.querySelector('[role="dialog"]');
      Array.from(dialog?.querySelectorAll("button") ?? []).forEach((button) => {
        if (button.textContent === "Restore") {
          button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      });
    });
    await flushAsync();

    expect(view.container.textContent).toContain("entry_validation_failed");
    // The editor shell is still mounted and interactive.
    expect(view.container.querySelector('[data-metadata-panel="true"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});
