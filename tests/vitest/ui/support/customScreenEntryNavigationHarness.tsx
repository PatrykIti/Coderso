import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import type { EntryDetail } from "@/services/entriesClient";
import type { MediaRecord } from "@/services/mediaClient";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../../core/admin/ui/contexts/AdminRouterContext";

export const MEDIA_ID = "11111111-1111-4111-8111-111111111111";

export const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const contentType = {
  id: "type-1",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      title: { type: "string" as const, title: "Title", xFieldType: "text" },
      slug: { type: "string" as const, title: "Slug", xFieldType: "text" },
      headline: { type: "string" as const, title: "Headline", xFieldType: "text" },
      related: {
        type: "array" as const,
        items: { type: "string" as const },
        title: "Related",
        xFieldType: "relation",
        xRelationTarget: "projects",
      },
    },
  },
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

export const makeScreen = (id: string) => ({
  id,
  name: id === "screen-1" ? "Projects" : "Archive",
  contentTypeId: contentType.id,
  status: "active" as const,
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: "Projects",
  schemaVersion: 4,
  definition: {
    schemaVersion: 4 as const,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" as const },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry" as const,
      interactionMode: "inline" as const,
      document: {
        schemaVersion: 1 as const,
        sections: [
          {
            id: "section-1",
            type: "section" as const,
            data: { title: "Details" },
            blocks: [
              { id: "image-1", type: "image" as const, data: { label: "Cover" } },
              { id: "title-field", type: "field" as const, data: { field: "title" } },
              { id: "slug-field", type: "field" as const, data: { field: "slug" } },
              {
                id: "headline-field",
                type: "field" as const,
                data: { field: "headline" },
              },
              {
                id: "related-list",
                type: "related-list" as const,
                data: { label: "Related", target: "projects" },
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "title-binding",
          blockId: "title-field",
          propPath: "value",
          source: "entry" as const,
          field: "title",
          mode: "readwrite" as const,
        },
        {
          id: "slug-binding",
          blockId: "slug-field",
          propPath: "value",
          source: "entry" as const,
          field: "slug",
          mode: "readwrite" as const,
        },
        {
          id: "headline-binding",
          blockId: "headline-field",
          propPath: "value",
          source: "entry" as const,
          field: "headline",
          mode: "readwrite" as const,
        },
        {
          id: "related-binding",
          blockId: "related-list",
          propPath: "items",
          source: "entry" as const,
          field: "related",
          mode: "read" as const,
        },
      ],
    },
  },
  blocks: [],
  bindings: [],
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
});

export const makeEntry = (id: string, title = `Entry ${id}`): EntryDetail => ({
  id,
  typeId: contentType.id,
  title,
  slug: `entry-${id}`,
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data: {
    title,
    slug: `entry-${id}`,
    headline: `${title} headline`,
    related: [`related-${id}`],
  },
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
});

export const createNavigationFixtureState = () => ({
  screens: new Map([
    ["screen-1", makeScreen("screen-1")],
    ["screen-2", makeScreen("screen-2")],
  ]),
  entries: new Map([
    ["1", makeEntry("1")],
    ["2", makeEntry("2")],
  ]),
});

export type PresentationOverride = {
  blockId: string;
  propPath: "mediaAssetId";
  value: string;
};

export type CachedEntryReader = (slug: string, id: string) => EntryDetail | null;
export type EntryLoader = (
  slug: string,
  id: string,
  options?: { force?: boolean }
) => Promise<EntryDetail | null>;
export type CachedOverrideReader = (
  screenId: string,
  entryId: string
) => PresentationOverride[] | null;
export type OverrideLoader = (
  screenId: string,
  entryId: string,
  options?: { force?: boolean }
) => Promise<PresentationOverride[]>;

export type RelatedEntriesLoader = (
  slug: string,
  options?: { force?: boolean }
) => Promise<EntryDetail[]>;

export type CacheListener = (event: { key: string; action?: string }) => void;

export type NavigationMockAdapter = Readonly<{
  getScreen: (id: string) => ReturnType<typeof makeScreen> | null;
  getDeferredScreenTwo: () => Promise<ReturnType<typeof makeScreen>> | null;
  readCachedEntry: CachedEntryReader;
  loadEntry: EntryLoader;
  readCachedOverrides: CachedOverrideReader;
  loadOverrides: OverrideLoader;
  loadMedia: (options?: { force?: boolean }) => Promise<MediaRecord[]>;
  loadRelatedEntries: RelatedEntriesLoader;
  getCacheListeners: () => CacheListener[];
  setCacheListeners: (listeners: CacheListener[]) => void;
}>;

let activeMockAdapter: NavigationMockAdapter | null = null;

const requireMockAdapter = () => {
  if (!activeMockAdapter) {
    throw new Error("Navigation mock adapter is not installed for this test suite");
  }
  return activeMockAdapter;
};

export const installNavigationMockAdapter = (adapter: NavigationMockAdapter) => {
  if (activeMockAdapter) {
    throw new Error("Navigation mock adapter is already installed");
  }
  activeMockAdapter = adapter;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (activeMockAdapter === adapter) activeMockAdapter = null;
  };
};

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreen: vi.fn((id: string) => requireMockAdapter().getScreen(id)),
  getCustomScreenCached: vi.fn(async (id: string) => {
    const adapter = requireMockAdapter();
    const pendingScreen = adapter.getDeferredScreenTwo();
    if (id === "screen-2" && pendingScreen) return pendingScreen;
    return adapter.getScreen(id);
  }),
  getCachedScreenEntryOverrides: vi.fn((screenId: string, entryId: string) =>
    requireMockAdapter().readCachedOverrides(screenId, entryId)
  ),
  getScreenEntryOverridesCached: vi.fn(
    (screenId: string, entryId: string, options?: { force?: boolean }) =>
      requireMockAdapter().loadOverrides(screenId, entryId, options)
  ),
  replaceScreenEntryOverrides: vi.fn(async (_screenId, _entryId, overrides) => overrides),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [contentType]),
  listContentTypesCached: vi.fn(async () => [contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  getCachedEntryDetail: vi.fn((slug: string, id: string) =>
    requireMockAdapter().readCachedEntry(slug, id)
  ),
  getEntryCached: vi.fn((slug: string, id: string, options?: { force?: boolean }) =>
    requireMockAdapter().loadEntry(slug, id, options)
  ),
  listEntriesCached: vi.fn((slug: string, options?: { force?: boolean }) =>
    requireMockAdapter().loadRelatedEntries(slug, options)
  ),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn((options?: { force?: boolean }) =>
    requireMockAdapter().loadMedia(options)
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((listener: CacheListener) => {
    const adapter = requireMockAdapter();
    adapter.getCacheListeners().push(listener);
    return () => {
      adapter.setCacheListeners(
        adapter.getCacheListeners().filter((candidate) => candidate !== listener)
      );
    };
  }),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ onChange }: { onChange: (value: unknown) => void }) => (
    <>
      <button
        type="button"
        data-testid="choose-presentation-media"
        onClick={() => onChange(MEDIA_ID)}
      >
        Choose presentation media
      </button>
      <button type="button" data-testid="clear-presentation-media" onClick={() => onChange(null)}>
        Clear presentation media
      </button>
    </>
  ),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: vi.fn(),
  setActiveAssistantSurfaceContext: vi.fn(),
  useActiveAssistantSurfaceContext: vi.fn(() => null),
}));

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

export const installReactActEnvironment = () => {
  const target = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const hadOwnValue = Object.prototype.hasOwnProperty.call(target, "IS_REACT_ACT_ENVIRONMENT");
  const previousValue = target.IS_REACT_ACT_ENVIRONMENT;
  target.IS_REACT_ACT_ENVIRONMENT = true;
  return () => {
    if (hadOwnValue) target.IS_REACT_ACT_ENVIRONMENT = previousValue;
    else delete target.IS_REACT_ACT_ENVIRONMENT;
  };
};

export const installNavigationSuiteEnvironment = (adapter: NavigationMockAdapter) => {
  const releases = [installNavigationMockAdapter(adapter), installReactActEnvironment()] as const;
  return () => releases.forEach((release) => release());
};

function RouterProbe() {
  const { navigate, path } = useAdminRouter();
  return (
    <div>
      <output data-testid="router-path">{path}</output>
      <button
        type="button"
        data-testid="navigate-entry-2"
        onClick={() => navigate("/advanced/custom-screens/screen-1/entries/2")}
      >
        Go to entry 2
      </button>
      <button
        type="button"
        data-testid="navigate-screen-2"
        onClick={() => navigate("/advanced/custom-screens/screen-2/entries/1")}
      >
        Go to screen 2
      </button>
      <button
        type="button"
        data-testid="navigate-entry-1"
        onClick={() => navigate("/advanced/custom-screens/screen-1/entries/1")}
      >
        Return to entry 1
      </button>
      <button
        type="button"
        data-testid="navigate-create-screen-1"
        onClick={() => navigate("/advanced/custom-screens/screen-1/entries/new")}
      >
        Create on screen 1
      </button>
      <button
        type="button"
        data-testid="navigate-create-screen-2"
        onClick={() => navigate("/advanced/custom-screens/screen-2/entries/new")}
      >
        Create on screen 2
      </button>
    </div>
  );
}

type NavigationHarnessOptions = Readonly<{
  EntryEditor: React.ComponentType;
  assertPresent: (element: Element | null) => void;
  getCacheListeners: () => CacheListener[];
}>;

export const createCustomScreenEntryNavigationHarness = ({
  EntryEditor,
  assertPresent,
  getCacheListeners,
}: NavigationHarnessOptions) => {
  const mount = (path: string) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    React.act(() => {
      root.render(
        <AdminRouterProvider initialPath={path}>
          <RouterProbe />
          <EntryEditor />
        </AdminRouterProvider>
      );
    });
    return {
      container,
      cleanup: () => {
        React.act(() => root.unmount());
        container.remove();
      },
    };
  };

  const flush = async () => {
    await React.act(async () => {
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    });
  };

  const click = (element: Element | null) => {
    assertPresent(element);
    React.act(() => {
      element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  const editTextbox = (container: HTMLElement, label: string, value: string) => {
    const textbox = container.querySelector(`[role="textbox"][aria-label="${label}"]`);
    assertPresent(textbox);
    React.act(() => {
      (textbox as HTMLElement).textContent = value;
      textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
  };

  const findButton = (container: HTMLElement, label: string) =>
    [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === label
    ) ?? null;

  const emitCacheEvent = (key: string, action = "update") => {
    React.act(() => {
      getCacheListeners().forEach((listener) => listener({ key, action }));
    });
  };

  const choosePresentationMedia = async (container: HTMLElement) => {
    click(container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    click(container.querySelector('[data-testid="choose-presentation-media"]'));
    await flush();
  };

  const confirmDiscard = async () => {
    await flush();
    click(findButton(document.body, "Discard and continue"));
    await flush();
  };

  return {
    mount,
    flush,
    click,
    editTextbox,
    findButton,
    emitCacheEvent,
    choosePresentationMedia,
    confirmDiscard,
  };
};
