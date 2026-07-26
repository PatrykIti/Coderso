// @vitest-environment happy-dom

// TASK-540 (recovery-cache lane, rc-020 -> rc-021): the entry editor exposes a
// writable Title/Slug block while the entry GET is still in flight. A keystroke
// that lands before hydration used to make the mount effect treat the fetched
// entry as a "remote update" and DISCARD it, leaving `slug` empty and every
// field value unpopulated — and the next Save draft persisted that emptiness
// (PATCH `{ slug: "", data: {} }`). Hydration is the baseline the local edit is
// based on, so it must always be applied, with the typed value kept on top.
//
// Local edits arrive through TWO channels and hydration must respect both: the
// content channel (title/slug/field values, "Save draft") and the metadata channel
// (status/visibility/schedule/SEO, the metadata panel's own Save). The metadata
// panel also renders outside the isLoading gate, so a pre-hydration metadata edit
// is just as reachable — and preserving only the content channel silently reverted
// it and cleared its unsaved-changes warning. Preserving the metadata channel is
// per FIELD: an untouched control must still hydrate from the snapshot, otherwise
// the panel's all-in-one PATCH would push its pristine mount default (draft,
// public, no schedule, empty SEO) over the server's real state.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { EntryVisibility } from "../../../core/admin/services/entriesClient";
import type { EntryStatus } from "../../../core/admin/ui/entries/EntryMetadataPanel";

type UpdateEntryPayload = {
  title: string;
  slug: string;
  data: Record<string, string>;
};

// Only the props the stub panel below actually exercises; the editor passes more.
type MetadataPanelStubProps = {
  status: EntryStatus;
  onStatusChange: (status: EntryStatus) => void;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
};

type UpdateEntryMetadataPayload = {
  status: EntryStatus;
  visibility: EntryVisibility;
  accessPassword: string | null | undefined;
  scheduledAt: string | null;
  taxonomy: { categoryId: string | null; tagIds: string[] } | undefined;
  seo: { description: string };
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
    status: "draft" as EntryStatus,
    visibility: "public" as EntryVisibility,
    scheduledAt: null,
    seo: { description: "Meta" },
    taxonomy: { category: null, tags: [] as [] },
    author: { name: "Alex Doe", email: "alex@example.com" },
    data: { title: "Hello", summary: "Summary" },
  };

  type EntryFixture = typeof entry;

  let resolveEntry: (value: EntryFixture) => void = () => undefined;
  let pendingEntryRead = new Promise<EntryFixture>((resolve) => {
    resolveEntry = resolve;
  });

  return {
    contentType,
    entry,
    taxonomyOverview: {
      taxonomies: { category: { id: "cat-taxonomy" }, tag: { id: "tag-taxonomy" } },
      terms: { categories: [], tags: [] },
    },
    // Each test needs its own pending read, otherwise a later test inherits an
    // already-resolved promise and can no longer type BEFORE hydration.
    readEntry: () => pendingEntryRead,
    resolveEntry: (value: EntryFixture) => resolveEntry(value),
    resetEntryRead: () => {
      pendingEntryRead = new Promise<EntryFixture>((resolve) => {
        resolveEntry = resolve;
      });
    },
    updatePayloads: [] as UpdateEntryPayload[],
    metadataPayloads: [] as UpdateEntryMetadataPayload[],
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
  getEntryCached: vi.fn(() => editorState.readEntry()),
  previewEntry: vi.fn(async () => ({ previewUrl: "https://preview.test/entry" })),
  publishEntry: vi.fn(async () => ({ ok: true })),
  updateEntry: vi.fn(async (_type: string, _id: string, payload: UpdateEntryPayload) => {
    editorState.updatePayloads.push(payload);
    return { ...editorState.entry, ...payload };
  }),
  updateEntryMetadata: vi.fn(
    async (_type: string, _id: string, payload: UpdateEntryMetadataPayload) => {
      editorState.metadataPayloads.push(payload);
      return {
        ...editorState.entry,
        status: payload.status,
        visibility: payload.visibility,
        scheduledAt: payload.scheduledAt,
        seo: payload.seo,
      };
    }
  ),
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

// The real panel renders outside the isLoading gate, so its controls are live while
// the entry GET is in flight. The stub keeps exactly that surface: the status control
// and the SEO textarea call the same props the real Select/Textarea call, its Save
// button is the panel's own metadata Save, and the resolved values are mirrored as
// text so assertions read React state instead of an uncontrolled DOM value.
vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    status,
    onStatusChange,
    seoDescription,
    onSeoDescriptionChange,
    onSave,
    isSaving,
  }: MetadataPanelStubProps) => (
    <div data-metadata-panel="true">
      <span data-metadata-status-value="true">{status}</span>
      <span data-metadata-seo-value="true">{seoDescription}</span>
      <button
        type="button"
        data-metadata-publish="true"
        onClick={() => onStatusChange("published")}
      >
        Set published
      </button>
      <textarea
        data-metadata-seo-input="true"
        defaultValue={seoDescription}
        onChange={(event) => onSeoDescriptionChange(event.target.value)}
      />
      <button type="button" data-metadata-save="true" disabled={isSaving} onClick={onSave}>
        Save metadata
      </button>
    </div>
  ),
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

const typeIntoTextarea = (area: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(area, value);
  area.dispatchEvent(new Event("input", { bubbles: true }));
};

const typeTitle = (container: HTMLElement, value: string) => {
  const titleArea = container.querySelector("textarea");
  if (!(titleArea instanceof HTMLTextAreaElement)) throw new Error("title textarea is absent");
  typeIntoTextarea(titleArea, value);
};

const typeSeoDescription = (container: HTMLElement, value: string) => {
  const area = container.querySelector('textarea[data-metadata-seo-input="true"]');
  if (!(area instanceof HTMLTextAreaElement)) throw new Error("SEO description textarea is absent");
  typeIntoTextarea(area, value);
};

// The editor renders the metadata panel twice (sidebar + details sheet); both are fed
// from the same state, so every copy must agree and either one can be driven.
const readMetadataState = (container: HTMLElement): { status: string; seoDescription: string } => {
  const readValue = (panel: Element, selector: string) =>
    panel.querySelector(selector)?.textContent ?? "";
  const states = Array.from(container.querySelectorAll('[data-metadata-panel="true"]')).map(
    (panel) => ({
      status: readValue(panel, '[data-metadata-status-value="true"]'),
      seoDescription: readValue(panel, '[data-metadata-seo-value="true"]'),
    })
  );
  const first = states[0];
  if (!first) throw new Error("metadata panel is absent");
  states.forEach((state) => expect(state).toEqual(first));
  return first;
};

const clickMetadataAction = (container: HTMLElement, marker: string) => {
  const action = container.querySelector(`button[${marker}="true"]`);
  if (!(action instanceof HTMLButtonElement)) throw new Error(`${marker} button is absent`);
  expect(action.disabled).toBe(false);
  action.click();
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

beforeEach(() => {
  editorState.resetEntryRead();
  editorState.updatePayloads.length = 0;
  editorState.metadataPayloads.length = 0;
});

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

test("a metadata edit made before hydration survives it and is what the metadata save sends", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // The mount read is still pending: the metadata panel is already writable.
    expect(view.container.textContent).toContain("Loading entry fields");

    // Metadata only — the content channel (title/slug/fields) is never touched here.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-publish");
    });
    React.act(() => {
      typeSeoDescription(view.container, "Edited before hydration");
    });
    expect(view.container.textContent).toContain("Unsaved changes");

    // Hydration lands AFTER the metadata edit.
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // The edit is still there, and it is still flagged as unsaved.
    expect(readMetadataState(view.container)).toEqual({
      status: "published",
      seoDescription: "Edited before hydration",
    });
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).not.toContain("Updated in another tab");

    // ...and the content channel still hydrated normally.
    const slugInput = view.container.querySelector('[data-slug-input="true"]');
    if (!(slugInput instanceof HTMLInputElement)) throw new Error("slug input is absent");
    expect(slugInput.value).toBe("hello");
    expect(view.container.textContent).toContain("field:summary");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads).toEqual([
      {
        status: "published",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: null, tagIds: [] },
        seo: { description: "Edited before hydration" },
      },
    ]);
    // Saving the channel clears its warning; nothing was written through the content channel.
    expect(view.container.textContent).not.toContain("Unsaved changes");
    expect(editorState.updatePayloads).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("hydration still overwrites the metadata fields the user did not touch", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    // Only the SEO description is edited; `status` keeps its pristine mount default.
    React.act(() => {
      typeSeoDescription(view.container, "Edited before hydration");
    });

    await React.act(async () => {
      editorState.resolveEntry({ ...editorState.entry, status: "published" });
      await flushMicrotasks();
    });

    // The untouched control takes the server value — a preserved "draft" default would
    // unpublish the entry on the panel's next all-in-one metadata PATCH.
    expect(readMetadataState(view.container)).toEqual({
      status: "published",
      seoDescription: "Edited before hydration",
    });

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads).toEqual([
      {
        status: "published",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: null, tagIds: [] },
        seo: { description: "Edited before hydration" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});
