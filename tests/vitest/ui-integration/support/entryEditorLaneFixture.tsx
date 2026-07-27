import React from "react";
import { vi } from "vitest";

import type { EntryVisibility } from "../../../../core/admin/services/entriesClient";
import type { EntryStatus } from "../../../../core/admin/ui/entries/EntryMetadataPanel";
import {
  EntryMetadataPanelStub,
  type UpdateEntryMetadataPayload,
  type UpdateEntryPayload,
} from "./entryEditorHarness";

/**
 * The service fixture and the ready-made mock modules for the entry-editor integration
 * lanes. Two lanes now mount the same editor against the same fake server — the hydration
 * races and the submit authority — so the fixture lives here and each lane registers a mock
 * in a single `vi.mock` line, keeping every lane file's own value in its scenarios.
 *
 * `vi.mock` is hoisted to the top of the lane file, so the mock PATHS have to stay there:
 * they resolve relative to the file that calls `vi.mock`. Only the module bodies move here,
 * which is safe because a `vi.mock` factory is lazy — it may import this module even though
 * the call around it is hoisted.
 */

type TermFixture = { id: string; name: string; slug: string };

// The mocks that block: `holdNext` makes the NEXT call to one of them wait, which is how
// a test provably lands an edit WHILE that request is in flight.
type GateName = "updateEntry" | "updateEntryMetadata" | "taxonomyOverview";

const ENTRY_DETAIL_CACHE_KEY = "entry:articles:entry-1";

export const editorState = (() => {
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
})();

export const dispatchEntryCacheEvent = () => {
  editorState.subscribers.forEach((handler) => handler({ key: ENTRY_DETAIL_CACHE_KEY }));
};

/** What every lane's `beforeEach` / `afterEach` does: one fake server per test, one DOM. */
export const resetEntryEditorLane = () => {
  editorState.resetEntryRead();
  editorState.resetGates();
  editorState.resetServerEntry();
  editorState.resetContentTypeVisibility();
  editorState.updatePayloads.length = 0;
  editorState.metadataPayloads.length = 0;
  editorState.publishCalls.length = 0;
};

export const resetEntryEditorDom = () => {
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = "";
};

export const sonnerModule = { toast: { success: vi.fn(), error: vi.fn() } };

export const apiClientModule = { isApiClientError: () => false };

export const cachePolicyModule = {
  cacheKeys: {
    entryDetail: (type: string, id: string) => `entry:${type}:${id}`,
    contentTypesList: "contentTypesList",
  },
};

export const contentTypesClientModule = {
  getCachedContentTypes: () => editorState.contentTypes(),
  listContentTypesCached: vi.fn(async () => editorState.contentTypes()),
};

export const entriesClientModule = {
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
};

export const siteSettingsClientModule = {
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
};

export const taxonomyClientModule = {
  getTaxonomyOverview: vi.fn(async () => {
    await editorState.passGate("taxonomyOverview");
    return editorState.taxonomyOverview;
  }),
  createTaxonomyTerm: vi.fn(async () => ({ id: "term-new", name: "New", slug: "new" })),
};

// The editor derives the entry it is editing from the router path; the window location is
// only the fallback for a mount without a router value.
export const adminRouterModule = {
  useAdminRouter: () => ({ navigate: vi.fn(), path: window.location.pathname }),
};

export const adminShellModule = {
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
};

export const cacheBusModule = {
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    editorState.subscribers.add(handler);
    return () => editorState.subscribers.delete(handler);
  },
};

export const runtimePreviewDialogModule = {
  RuntimePreviewDialog: () => <div />,
};

export const entryDeleteDialogModule = {
  EntryDeleteDialog: () => null,
};

// The panel stub lives in the harness module beside the `data-metadata-*` markers it
// defines; this re-export only saves each lane the import.
export const entryMetadataPanelModule = { EntryMetadataPanel: EntryMetadataPanelStub };

export const fieldRendererModule = {
  FieldRenderer: ({ field }: { field: { name: string } }) => <div>{`field:${field.name}`}</div>,
};

export const schemaMappingModule = {
  fieldsFromSchema: () => [
    { id: "field-1", name: "title", label: "Title", type: "text" },
    { id: "field-2", name: "summary", label: "Summary", type: "text" },
  ],
  buildSchemaFromFields: () => ({ properties: { title: {}, summary: {} } }),
};

export const contentTypeLabelsModule = {
  getContentTypeLabels: () => ({ singular: "Article", plural: "Articles" }),
};

export const entryChecklistModule = {
  buildEntryChecklist: () => ({ items: [], blockingIssues: [], missingRequiredFields: [] }),
};
