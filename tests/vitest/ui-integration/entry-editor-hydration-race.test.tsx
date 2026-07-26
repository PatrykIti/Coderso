// @vitest-environment happy-dom

// TASK-540 (recovery-cache lane, rc-020 -> rc-021): the entry editor exposes a
// writable Title/Slug block while the entry GET is still in flight. A keystroke
// that lands before hydration used to make the mount effect treat the fetched
// entry as a "remote update" and DISCARD it, leaving `slug` empty and every
// field value unpopulated — and the next Save draft persisted that emptiness
// (PATCH `{ slug: "", data: {} }`). Hydration is the baseline the local edit is
// based on, so it must always be applied, with the typed value kept on top.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

type UpdateEntryPayload = {
  title: string;
  slug: string;
  data: Record<string, string>;
};

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
    taxonomy: { category: null, tags: [] as [] },
    author: { name: "Alex Doe", email: "alex@example.com" },
    data: { title: "Hello", summary: "Summary" },
  };

  let resolveEntry: (value: typeof entry) => void = () => undefined;
  const entryPromise = new Promise<typeof entry>((resolve) => {
    resolveEntry = resolve;
  });

  return {
    contentType,
    entry,
    taxonomyOverview: {
      taxonomies: { category: { id: "cat-taxonomy" }, tag: { id: "tag-taxonomy" } },
      terms: { categories: [], tags: [] },
    },
    entryPromise,
    resolveEntry: (value: typeof entry) => resolveEntry(value),
    updatePayloads: [] as UpdateEntryPayload[],
    subscribers: new Set<(event: { key: string }) => void>(),
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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
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
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input data-slug-input="true" defaultValue={value} onChange={onChange} />,
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
      placeholder,
    }: {
      value?: string;
      onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
      placeholder?: string;
    },
    ref: React.Ref<HTMLTextAreaElement>
  ) {
    return (
      <textarea ref={ref} defaultValue={value} onChange={onChange} placeholder={placeholder} />
    );
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
  getCachedEntryDetail: () => null,
  // The mount read stays pending until the test resolves it, so the keystroke
  // provably lands first.
  getEntryCached: vi.fn(() => editorState.entryPromise),
  previewEntry: vi.fn(async () => ({ previewUrl: "https://preview.test/entry" })),
  publishEntry: vi.fn(async () => ({ ok: true })),
  updateEntry: vi.fn(async (_type: string, _id: string, payload: UpdateEntryPayload) => {
    editorState.updatePayloads.push(payload);
    return { ...editorState.entry, ...payload };
  }),
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

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    editorState.subscribers.add(handler);
    return () => editorState.subscribers.delete(handler);
  },
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: () => <div />,
}));

vi.mock("../../../core/admin/ui/entries/EntryDeleteDialog", () => ({
  EntryDeleteDialog: () => null,
}));

vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: () => <div data-metadata-panel="true" />,
}));

vi.mock("../../../core/admin/ui/entries/FieldRenderer", () => ({
  FieldRenderer: ({ field }: { field: { name: string } }) => <div>{`field:${field.name}`}</div>,
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
  buildEntryChecklist: () => ({ items: [], blockingIssues: [], missingRequiredFields: [] }),
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

const flushMicrotasks = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

const typeTitle = (container: HTMLElement, value: string) => {
  const titleArea = container.querySelector("textarea");
  if (!(titleArea instanceof HTMLTextAreaElement)) throw new Error("title textarea is absent");
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(titleArea, value);
  titleArea.dispatchEvent(new Event("input", { bubbles: true }));
};

const findSaveDraft = (container: HTMLElement) => {
  const matches = Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent === "Save draft"
  );
  expect(matches).toHaveLength(1);
  const save = matches[0];
  if (!(save instanceof HTMLButtonElement)) throw new Error("Save draft button is absent");
  return save;
};

afterEach(() => {
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = "";
});

test("a title typed before hydration keeps the loaded slug and field data on save", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // The mount read is still pending: the Title/Slug block is already writable.
    expect(view.container.textContent).toContain("Loading entry fields");

    React.act(() => {
      typeTitle(view.container, "Updated title");
    });

    // Hydration lands AFTER the keystroke.
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // Hydration must not be mistaken for a concurrent edit in another tab.
    expect(view.container.textContent).not.toContain("Updated in another tab");
    const slugInput = view.container.querySelector('[data-slug-input="true"]');
    if (!(slugInput instanceof HTMLInputElement)) throw new Error("slug input is absent");
    expect(slugInput.value).toBe("hello");

    const save = findSaveDraft(view.container);
    expect(save.disabled).toBe(false);

    await React.act(async () => {
      save.click();
      await flushMicrotasks();
    });

    expect(editorState.updatePayloads).toEqual([
      {
        title: "Updated title",
        slug: "hello",
        data: { title: "Updated title", summary: "Summary" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});
