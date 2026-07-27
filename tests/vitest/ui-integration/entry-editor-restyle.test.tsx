// @vitest-environment happy-dom

// TASK-479-13-L03 (updated TASK-514-03): locks the prototype-fidelity Entry
// editor — in-page PageHeader (breadcrumbs + title + actions cluster), the
// [1fr_320px] SectionCard grid with the metadata panel in the right column, the
// bound Title/Slug (typing flips the Unsaved changes badge), and the
// schema-driven fields rendered via FieldRenderer. Harness mirrors
// tests/vitest/ui/entry-editor-shell-wave.test.tsx (createRoot + React.act +
// hoisted cache state). Actions moved off the AdminShell topbar into the
// in-page PageHeader (prototype match), so the dirty badge is asserted there.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const editorState = vi.hoisted(() => {
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
    taxonomy: { category: null, tags: [] },
    author: { name: "Alex Doe", email: "alex@example.com" },
    data: { title: "Hello", summary: "Summary" },
  };

  const taxonomyOverview = {
    taxonomies: { category: { id: "cat-taxonomy" }, tag: { id: "tag-taxonomy" } },
    terms: { categories: [], tags: [] },
  };

  return {
    contentType,
    entry,
    taxonomyOverview,
    subscribers: new Set<(event: { key: string }) => void>(),
    reset() {
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
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/services/apiClient", () => ({ isApiClientError: () => false }));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    entryDetail: (type: string, id: string) => `entry:${type}:${id}`,
    contentTypesList: "contentTypesList",
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => [editorState.contentType],
  listContentTypesCached: vi.fn(async () => [editorState.contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  deleteEntry: vi.fn(async () => ({ ok: true })),
  getCachedEntryDetail: () => editorState.entry,
  getEntryCached: vi.fn(async () => editorState.entry),
  previewEntry: vi.fn(async () => ({ previewUrl: "https://preview.test/entry" })),
  publishEntry: vi.fn(async () => ({ ok: true })),
  updateEntry: vi.fn(async (_type: string, _id: string, input) => ({
    ...editorState.entry,
    title: input.title,
    slug: input.slug,
    data: input.data,
  })),
  updateEntryMetadata: vi.fn(async () => editorState.entry),
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
  getTaxonomyOverview: vi.fn(async () => editorState.taxonomyOverview),
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
  // The dirty-navigation guard asks for the router optionally; a mocked module honestly has
  // none, so it registers no blocker here. Leaving the editor is owned by
  // tests/vitest/ui-integration/entry-editor-navigation-guard.test.tsx, which mounts the real
  // provider.
  useOptionalAdminRouter: () => null,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    topbarActions,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div data-topbar-actions="true">{topbarActions}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    editorState.subscribers.add(handler);
    return () => editorState.subscribers.delete(handler);
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

vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    status,
    onStatusChange,
    onSave,
    onDelete,
  }: {
    status: string;
    onStatusChange: (status: "draft" | "published" | "scheduled" | "archived") => void;
    onSave?: () => void;
    onDelete?: () => void;
  }) => (
    <div data-metadata-panel="true">
      <select
        aria-label="Publish status"
        value={status}
        onChange={(event) =>
          onStatusChange(event.target.value as "draft" | "published" | "scheduled" | "archived")
        }
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="scheduled">Scheduled</option>
        <option value="archived">Archived</option>
      </select>
      <button type="button" onClick={onSave}>
        Save metadata
      </button>
      <button type="button" onClick={onDelete}>
        Delete entry
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
  buildSchemaFromFields: () => ({ properties: { title: {}, summary: {} } }),
}));

vi.mock("../../../core/admin/ui/entries/contentTypeLabels", () => ({
  getContentTypeLabels: () => ({ singular: "Article", plural: "Articles" }),
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

async function flushAsync() {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  editorState.reset();
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = "";
});

test("editor renders the in-page PageHeader + [1fr_320px] SectionCard grid", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await flushAsync();

    // prototype grid: 1fr content column + 320px right column
    expect(view.container.innerHTML).toContain("lg:grid-cols-[1fr_320px]");
    // in-page PageHeader title (breadcrumb Entries › Articles + "Edit Article")
    expect(view.container.textContent).toContain("Edit Article");
    // metadata panel mounted in the right column
    expect(view.container.querySelector('[data-metadata-panel="true"]')).not.toBeNull();

    // Publish status Select + Save metadata / Delete still live in the panel
    expect(view.container.querySelector("select[aria-label='Publish status']")).not.toBeNull();
    expect(view.container.textContent).toContain("Save metadata");
    expect(view.container.textContent).toContain("Delete entry");

    // PageHeader action cluster stays wired (History seam included)
    const buttonText = Array.from(view.container.querySelectorAll("button")).map(
      (b) => b.textContent
    );
    expect(buttonText).toContain("Runtime preview");
    expect(buttonText).toContain("Save draft");
    expect(buttonText).toContain("Publish");
    expect(buttonText).toContain("History");
  } finally {
    view.cleanup();
  }
});

test("title/slug stay bound: typing flips the Unsaved changes badge", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    expect(view.container.textContent).not.toContain("Unsaved changes");

    React.act(() => {
      const titleArea = view.container.querySelector("textarea");
      if (titleArea instanceof HTMLTextAreaElement) {
        // Use the native prototype setter so React's value tracker still sees a
        // change and fires onChange (setting `.value` directly is swallowed).
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
        descriptor?.set?.call(titleArea, "Updated title");
        titleArea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("schema-driven field cards still render via FieldRenderer", async () => {
  window.history.replaceState({}, "", "/admin/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await flushAsync();
    // field Card label + renderer for the schema "summary" field
    expect(view.container.textContent).toContain("Summary");
    expect(view.container.textContent).toContain("field:summary");
  } finally {
    view.cleanup();
  }
});
