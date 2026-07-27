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
// (status/visibility/schedule/SEO/taxonomy, the metadata panel's own Save). The metadata
// panel also renders outside the isLoading gate, so a pre-hydration metadata edit
// is just as reachable — and preserving only the content channel silently reverted
// it and cleared its unsaved-changes warning. Preserving the metadata channel is
// per FIELD: an untouched control must still hydrate from the snapshot, otherwise
// the panel's all-in-one PATCH would push its pristine mount default (draft,
// public, no schedule, empty SEO) over the server's real state.
//
// rc-021 pins the four remaining ways the editor lost or misplaced an edit, all of
// which came from the same root cause — "has the user touched this?" was inferred from
// the VALUE in some places, tracked explicitly in others and not at all for taxonomy:
//   (a) NOTHING is disabled while a save is in flight, so an edit made during the
//       request was either falsely marked saved (content) or visibly reverted from the
//       response (metadata);
//   (b) no read carried any authority, and `getEntryCached` hands the loser of two
//       concurrent reads back to its caller, so an older snapshot could overwrite a
//       newer one;
//   (c) the taxonomy overview read restored category/tags from its OWN older entry
//       snapshot, long after the user could see and use the control;
//   (d) a title or slug the user CLEARED read as pristine, so hydration put the stored
//       value back — including the `slugify()` case, which returns "" for an
//       all-non-ASCII title.
// The last case here is a guard rather than a regression: hydrating from a mutation
// response now covers visibility and the access password too, which no earlier case
// exercised.

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { EntryVisibility } from "../../../core/admin/services/entriesClient";
import type { EntryStatus } from "../../../core/admin/ui/entries/EntryMetadataPanel";
import {
  beforeUnloadIsGuarded,
  clickMetadataAction,
  findHeaderButton,
  findMetadataButton,
  findSaveDraft,
  flushMicrotasks,
  mount,
  readMetadataState,
  readPanelValue,
  typeAccessPassword,
  typeSeoDescription,
  typeSlug,
  typeTitle,
  type UpdateEntryMetadataPayload,
  type UpdateEntryPayload,
} from "./support/entryEditorHarness";

type TermFixture = { id: string; name: string; slug: string };

// The mocks that block: `holdNext` makes the NEXT call to one of them wait, which is how
// a test provably lands an edit WHILE that request is in flight.
type GateName = "updateEntry" | "updateEntryMetadata" | "taxonomyOverview";

const ENTRY_DETAIL_CACHE_KEY = "entry:articles:entry-1";

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
    scheduledAt: null as string | null,
    seo: { description: "Meta" },
    taxonomy: { category: null as TermFixture | null, tags: [] as TermFixture[] },
    author: { name: "Alex Doe", email: "alex@example.com" },
    data: { title: "Hello", summary: "Summary" },
  };

  type EntryFixture = typeof entry;

  // One deferred per GET rather than one per test: that is what lets a test resolve a
  // NEWER read before an older one, which is the only way to observe read authority.
  const entryReads: Array<(value: EntryFixture) => void> = [];
  const resolveEntryRead = (index: number, value: EntryFixture) => {
    const resolve = entryReads[index];
    if (!resolve) throw new Error(`entry read #${index} has not started`);
    resolve(value);
  };

  const gateReleases = new Map<GateName, () => void>();
  const gatePromises = new Map<GateName, Promise<void>>();

  // A content type the editor cannot resolve is the other way a read finishes without
  // hydrating: the entry snapshot arrives, `applyEntry` is never reached.
  let contentTypeVisible = true;

  // The server the mutation mocks model: the metadata route commits what it was given
  // and BOTH routes answer with a fresh full read (`entryService.getEntry`). Modelling
  // that matters for the visibility guard — a mock that always echoed the fixture could
  // not tell a correct hydration from a stale one.
  let committed: Partial<EntryFixture> = {};

  return {
    contentType,
    contentTypes: () => (contentTypeVisible ? [contentType] : []),
    hideContentType: () => {
      contentTypeVisible = false;
    },
    resetContentTypeVisibility: () => {
      contentTypeVisible = true;
    },
    entry,
    taxonomyOverview: {
      taxonomies: { category: { id: "cat-taxonomy" }, tag: { id: "tag-taxonomy" } },
      terms: { categories: [], tags: [] },
    },
    readEntry: () =>
      new Promise<EntryFixture>((resolve) => {
        entryReads.push(resolve);
      }),
    resolveEntryRead,
    resolveEntry: (value: EntryFixture) => resolveEntryRead(0, value),
    startedEntryReads: () => entryReads.length,
    resetEntryRead: () => {
      entryReads.length = 0;
    },
    holdNext: (name: GateName) => {
      gatePromises.set(
        name,
        new Promise<void>((resolve) => {
          gateReleases.set(name, () => resolve());
        })
      );
    },
    passGate: async (name: GateName) => {
      const gate = gatePromises.get(name);
      if (!gate) return;
      gatePromises.delete(name);
      await gate;
    },
    release: (name: GateName) => {
      const release = gateReleases.get(name);
      gateReleases.delete(name);
      release?.();
    },
    resetGates: () => {
      gateReleases.clear();
      gatePromises.clear();
    },
    serverEntry: (): EntryFixture => ({ ...entry, ...committed }),
    commitMetadata: (patch: Partial<EntryFixture>) => {
      committed = { ...committed, ...patch };
    },
    resetServerEntry: () => {
      committed = {};
    },
    updatePayloads: [] as UpdateEntryPayload[],
    metadataPayloads: [] as UpdateEntryMetadataPayload[],
    publishCalls: [] as string[],
    subscribers: new Set<(event: { key: string }) => void>(),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The shadcn primitives are stubbed in the harness module beside the DOM plumbing that
// reads them; a `vi.mock` factory is lazy, so it may import it even though the call is
// hoisted.
const harness = () => import("./support/entryEditorHarness");

vi.mock("@/components/ui/alert", async () => (await harness()).alertModule);
vi.mock("@/components/ui/badge", async () => (await harness()).badgeModule);
vi.mock("@/components/ui/button", async () => (await harness()).buttonModule);
vi.mock("@/components/ui/card", async () => (await harness()).cardModule);
vi.mock("@/components/ui/input", async () => (await harness()).inputModule);
vi.mock("@/components/ui/scroll-area", async () => (await harness()).scrollAreaModule);
vi.mock("@/components/ui/sheet", async () => (await harness()).sheetModule);
vi.mock("@/components/ui/tabs", async () => (await harness()).tabsModule);
vi.mock("@/components/ui/textarea", async () => (await harness()).textareaModule);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/services/apiClient", () => ({ isApiClientError: () => false }));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    entryDetail: (type: string, id: string) => `entry:${type}:${id}`,
    contentTypesList: "contentTypesList",
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => editorState.contentTypes(),
  listContentTypesCached: vi.fn(async () => editorState.contentTypes()),
}));

vi.mock("@/services/entriesClient", () => ({
  deleteEntry: vi.fn(async () => ({ ok: true })),
  getCachedEntryDetail: () => null,
  // The mount read stays pending until the test resolves it, so the keystroke
  // provably lands first.
  getEntryCached: vi.fn(() => editorState.readEntry()),
  previewEntry: vi.fn(async () => ({ previewUrl: "https://preview.test/entry" })),
  publishEntry: vi.fn(async (type: string, id: string) => {
    editorState.publishCalls.push(`${type}/${id}`);
    return { ok: true };
  }),
  updateEntry: vi.fn(async (_type: string, _id: string, payload: UpdateEntryPayload) => {
    // Recorded before the gate: a test asserts what the request carried while it is
    // still open.
    editorState.updatePayloads.push(payload);
    await editorState.passGate("updateEntry");
    return { ...editorState.serverEntry(), ...payload };
  }),
  updateEntryMetadata: vi.fn(
    async (_type: string, _id: string, payload: UpdateEntryMetadataPayload) => {
      editorState.metadataPayloads.push(payload);
      await editorState.passGate("updateEntryMetadata");
      editorState.commitMetadata({
        status: payload.status,
        visibility: payload.visibility,
        scheduledAt: payload.scheduledAt,
        seo: payload.seo,
      });
      return editorState.serverEntry();
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
  getTaxonomyOverview: vi.fn(async () => {
    await editorState.passGate("taxonomyOverview");
    return editorState.taxonomyOverview;
  }),
  createTaxonomyTerm: vi.fn(async () => ({ id: "term-new", name: "New", slug: "new" })),
}));

// The editor derives the entry it is editing from the router path; the window location is
// only the fallback for a mount without a router value.
vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: vi.fn(), path: window.location.pathname }),
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

// The stub lives in the harness module beside the `data-metadata-*` markers it defines;
// a `vi.mock` factory is lazy, so it may import it even though the call is hoisted.
vi.mock("../../../core/admin/ui/entries/EntryMetadataPanel", async () => ({
  EntryMetadataPanel: (await import("./support/entryEditorHarness")).EntryMetadataPanelStub,
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

const dispatchEntryCacheEvent = () => {
  editorState.subscribers.forEach((handler) => handler({ key: ENTRY_DETAIL_CACHE_KEY }));
};

beforeEach(() => {
  editorState.resetEntryRead();
  editorState.resetGates();
  editorState.resetServerEntry();
  editorState.resetContentTypeVisibility();
  editorState.updatePayloads.length = 0;
  editorState.metadataPayloads.length = 0;
  editorState.publishCalls.length = 0;
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

// (a) content channel: only the Save buttons are disabled during a save, so the title
// stays editable while its PATCH is in flight.
test("a title typed while Save draft is in flight stays dirty and is what the next save sends", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    React.act(() => {
      typeTitle(view.container, "Saved title");
    });

    editorState.holdNext("updateEntry");
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });
    // The request left with the title as it was; it cannot persist what comes next.
    expect(editorState.updatePayloads).toEqual([
      {
        title: "Saved title",
        slug: "hello",
        data: { title: "Saved title", summary: "Summary" },
      },
    ]);

    // The user keeps typing while the PATCH is still open.
    React.act(() => {
      typeTitle(view.container, "Typed during save");
    });

    await React.act(async () => {
      editorState.release("updateEntry");
      await flushMicrotasks();
    });

    // The response is authoritative only for what it persisted: the newer title is kept
    // and STILL dirty, so navigating away is guarded...
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Typed during save");
    expect(beforeUnloadIsGuarded()).toBe(true);
    expect(view.container.textContent).toContain("Unsaved changes");

    // ...and a background read that arrives before the next save cannot apply the server
    // snapshot over it. A falsely "saved" title is lost in place, not only on navigation.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, editorState.entry);
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Typed during save");
    expect(view.container.textContent).toContain("Updated in another tab");

    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    expect(editorState.updatePayloads[1]).toEqual({
      title: "Typed during save",
      slug: "hello",
      data: { title: "Typed during save", summary: "Summary" },
    });
    expect(view.container.textContent).not.toContain("Unsaved changes");
    expect(beforeUnloadIsGuarded()).toBe(false);
  } finally {
    view.cleanup();
  }
});

// (a) metadata channel: the completion used to rewrite every control from the response,
// so an edit made during the request was visibly reverted.
test("a metadata edit made while the metadata save is in flight is not reverted by the response", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-publish");
    });

    editorState.holdNext("updateEntryMetadata");
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
        seo: { description: "Meta" },
      },
    ]);

    // The SEO field is not disabled while the PATCH is open.
    React.act(() => {
      typeSeoDescription(view.container, "Typed during save");
    });

    await React.act(async () => {
      editorState.release("updateEntryMetadata");
      await flushMicrotasks();
    });

    // `status` was persisted, so it takes the response; the SEO edit was not, so it
    // survives and keeps the channel dirty.
    expect(readMetadataState(view.container)).toEqual({
      status: "published",
      seoDescription: "Typed during save",
    });
    expect(view.container.textContent).toContain("Unsaved changes");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads[1]).toEqual({
      status: "published",
      visibility: "public",
      accessPassword: null,
      scheduledAt: null,
      taxonomy: { categoryId: null, tagIds: [] },
      seo: { description: "Typed during save" },
    });
  } finally {
    view.cleanup();
  }
});

// (b) read authority: `getEntryCached` hands the loser of two concurrent reads back to
// its caller, so the editor itself has to reject it.
test("an entry read that resolves after a newer one does not overwrite it", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(1);

    // A cache event starts a second read while the first is still open.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(2);

    // The NEWER read resolves first and is applied.
    await React.act(async () => {
      editorState.resolveEntryRead(1, { ...editorState.entry, title: "Newer title" });
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Newer title");

    // The older read resolves last and must be discarded, not applied.
    await React.act(async () => {
      editorState.resolveEntryRead(0, { ...editorState.entry, title: "Older title" });
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("Newer title");
  } finally {
    view.cleanup();
  }
});

// (c) taxonomy: the overview read used to restore category/tags from its own older entry
// snapshot, so a pick made while it was in flight was silently reverted — and the save
// then submitted the reverted value.
test("a category picked while the taxonomy overview is in flight is not restored to the old one", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const categorized = {
    ...editorState.entry,
    taxonomy: { category: { id: "cat-1", name: "First", slug: "first" }, tags: [] },
  };

  const view = mount(<EntryEditor />);
  try {
    // First load: the overview resolves, so the category control is live from now on.
    await React.act(async () => {
      editorState.resolveEntry(categorized);
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-category-value")).toBe("cat-1");

    // A background refresh: its entry read lands, its overview read is still open.
    editorState.holdNext("taxonomyOverview");
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, categorized);
      await flushMicrotasks();
    });

    // The user picks a different category while that overview read is in flight.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-category");
    });
    expect(readPanelValue(view.container, "data-metadata-category-value")).toBe("cat-2");

    await React.act(async () => {
      editorState.release("taxonomyOverview");
      await flushMicrotasks();
    });

    expect(readPanelValue(view.container, "data-metadata-category-value")).toBe("cat-2");

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads).toEqual([
      {
        status: "draft",
        visibility: "public",
        accessPassword: null,
        scheduledAt: null,
        taxonomy: { categoryId: "cat-2", tagIds: [] },
        seo: { description: "Meta" },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

// (d) editedness is a fact about the user's action, not about the value: clearing a
// title or a slug is an edit, and `slugify()` returns "" for an all-non-ASCII title.
test("a title and slug cleared before hydration stay cleared and are what the save sends", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Loading entry fields");

    // Typed, then cleared again — both before the entry read resolves.
    React.act(() => {
      typeTitle(view.container, "Draft title");
    });
    React.act(() => {
      typeTitle(view.container, "");
    });
    React.act(() => {
      typeSlug(view.container, "draft-slug");
    });
    React.act(() => {
      typeSlug(view.container, "");
    });

    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // Hydration must not read "" as "never touched" and put the stored values back.
    expect(readPanelValue(view.container, "data-metadata-title-value")).toBe("");
    expect(readPanelValue(view.container, "data-metadata-slug-value")).toBe("");
    expect(view.container.textContent).toContain("Unsaved changes");

    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    expect(editorState.updatePayloads).toEqual([
      { title: "", slug: "", data: { title: "", summary: "Summary" } },
    ]);
  } finally {
    view.cleanup();
  }
});

// Guard, not a regression: hydrating from a mutation response now covers visibility and
// the access password, which "Save draft" does not submit. Unsaved edits to them must
// survive it, and once the metadata save HAS persisted them, what the content response
// reports back is the persisted value — both routes answer with a fresh full read.
test("a draft save keeps an unsaved visibility edit and reports the persisted one", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });

    // Visibility and the password are edited and NOT saved; "Save draft" submits neither.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-password-mode");
    });
    React.act(() => {
      typeAccessPassword(view.container, "a-new-password");
    });
    React.act(() => {
      typeTitle(view.container, "Draft body");
    });

    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    expect(readPanelValue(view.container, "data-metadata-visibility-value")).toBe("password");
    expect(readPanelValue(view.container, "data-metadata-password-value")).toBe("a-new-password");
    // The content channel is saved; the metadata channel is still dirty.
    expect(view.container.textContent).toContain("Unsaved changes");

    // Now the metadata save persists "private", so the value stops being the user's.
    React.act(() => {
      clickMetadataAction(view.container, "data-metadata-private");
    });
    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });
    expect(readPanelValue(view.container, "data-metadata-visibility-value")).toBe("private");

    React.act(() => {
      typeTitle(view.container, "Draft body, again");
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // The content response may write visibility now, and what it writes is what the
    // server holds — not the value the editor was loaded with.
    expect(readPanelValue(view.container, "data-metadata-visibility-value")).toBe("private");
    expect(readPanelValue(view.container, "data-metadata-password-value")).toBe("");
    expect(editorState.updatePayloads).toHaveLength(2);

    await React.act(async () => {
      clickMetadataAction(view.container, "data-metadata-save");
      await flushMicrotasks();
    });

    expect(editorState.metadataPayloads[1].visibility).toBe("private");
  } finally {
    view.cleanup();
  }
});

// (e) rc-022: the register commit closed (a)-(d) and opened a fifth instance of the same
// class, a worse one — it can empty an entry instead of losing one field. `applyEntry` is
// the ONLY path that populates `fields` and `values`, and only the read that survives
// `isCurrentLoad` reaches it, while the baseline read's own `finally` switches the page
// spinner off whether or not it hydrated. A read superseded before hydration therefore left
// a fieldless form with a live "Save draft", and that PATCH carries `data: {}` — which
// REPLACES the entry's stored data. The invariant the three cases below pin: until the
// editor has hydrated for the entry it addresses, every snapshot that arrives is its
// baseline (applied whatever superseded it, with the user's registered edits kept on top),
// and no save may fire at all.

test("a baseline read superseded before it hydrates is still applied, so the save carries the entry", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // A cache event supersedes the baseline read before it resolves...
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
    });
    expect(editorState.startedEntryReads()).toBe(2);

    // ...and that superseded read is the only snapshot that ever arrives. Nothing else can
    // populate the fields: a mutation response carries no content type.
    await React.act(async () => {
      editorState.resolveEntryRead(0, editorState.entry);
      await flushMicrotasks();
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // The PATCH replaces `data` wholesale, so what the client was called with is the harm:
    // discarding this snapshot sent `{ title: "", slug: "", data: {} }`.
    expect(editorState.updatePayloads).toEqual([
      { title: "Hello", slug: "hello", data: { title: "Hello", summary: "Summary" } },
    ]);
    expect(view.container.textContent).toContain("field:summary");
  } finally {
    view.cleanup();
  }
});

test("a cache-bus read arriving before any hydration is applied, not merely offered", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // The user types while the baseline read is still open, so the editor has edits.
    React.act(() => {
      typeTitle(view.container, "Typed before hydration");
    });

    // A cache event starts a second read, and that one resolves first.
    await React.act(async () => {
      dispatchEntryCacheEvent();
      await flushMicrotasks();
      editorState.resolveEntryRead(1, { ...editorState.entry, slug: "newer-slug" });
      await flushMicrotasks();
    });

    // The baseline read lands last. It is superseded AND there is a baseline now, so it is
    // discarded rather than applied — (b) stays closed, its older slug never appears.
    await React.act(async () => {
      editorState.resolveEntryRead(0, { ...editorState.entry, slug: "older-slug" });
      await flushMicrotasks();
    });
    await React.act(async () => {
      findSaveDraft(view.container).click();
      await flushMicrotasks();
    });

    // With no baseline yet there was no local state for "someone else's change" to conflict
    // with: that snapshot IS the baseline, and the typed title stays on top of it. Offering it
    // instead left the editor fieldless and sent `data: {}` with an empty slug.
    expect(editorState.updatePayloads).toEqual([
      {
        title: "Typed before hydration",
        slug: "newer-slug",
        data: { title: "Typed before hydration", summary: "Summary" },
      },
    ]);
    expect(view.container.textContent).not.toContain("Updated in another tab");
    expect(view.container.textContent).toContain("field:summary");
  } finally {
    view.cleanup();
  }
});

test("an entry that never hydrated can be saved or published through no channel at all", async () => {
  window.history.replaceState({}, "", "/admin/advanced/entries/articles/entry-1");
  editorState.hideContentType();
  const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");

  const view = mount(<EntryEditor />);
  try {
    // The entry read succeeds and the spinner goes off, but nothing hydrated: the schema
    // never arrived, so `fields` and `values` are still empty.
    await React.act(async () => {
      editorState.resolveEntry(editorState.entry);
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Content type not found.");

    const save = findSaveDraft(view.container);
    const publish = findHeaderButton(view.container, "Publish");
    const metadataSave = findMetadataButton(view.container, "data-metadata-save");
    await React.act(async () => {
      save.click();
      publish.click();
      metadataSave.click();
      // The probe calls the panel's own `onSave` with no gate: what refuses it is the editor.
      findMetadataButton(view.container, "data-metadata-save-ungated").click();
      await flushMicrotasks();
    });

    // `data: {}` would replace the entry's content, the metadata PATCH would push the panel's
    // mount defaults (draft, public, no schedule, empty SEO) over the server's, and publish
    // would flip the stored status. Asserted together, so a failure names every leak.
    expect({
      updates: editorState.updatePayloads,
      metadata: editorState.metadataPayloads,
      published: editorState.publishCalls,
    }).toEqual({ updates: [], metadata: [], published: [] });
    expect([save.disabled, publish.disabled, metadataSave.disabled]).toEqual([true, true, true]);
  } finally {
    view.cleanup();
  }
});
