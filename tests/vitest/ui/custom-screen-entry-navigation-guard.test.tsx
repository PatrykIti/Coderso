// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createEntry, updateEntry, type EntryDetail } from "@/services/entriesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { replaceScreenEntryOverrides } from "@/services/customScreensClient";
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";

const MEDIA_ID = "11111111-1111-4111-8111-111111111111";

const deferred = <T,>() => {
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

const makeScreen = (id: string) => ({
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

const makeEntry = (id: string, title = `Entry ${id}`): EntryDetail => ({
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

const screens = new Map([
  ["screen-1", makeScreen("screen-1")],
  ["screen-2", makeScreen("screen-2")],
]);
const entries = new Map([
  ["1", makeEntry("1")],
  ["2", makeEntry("2")],
]);
type PresentationOverride = {
  blockId: string;
  propPath: "mediaAssetId";
  value: string;
};
type CachedEntryReader = (slug: string, id: string) => EntryDetail | null;
type EntryLoader = (
  slug: string,
  id: string,
  options?: { force?: boolean }
) => Promise<EntryDetail | null>;
type CachedOverrideReader = (screenId: string, entryId: string) => PresentationOverride[] | null;
type OverrideLoader = (
  screenId: string,
  entryId: string,
  options?: { force?: boolean }
) => Promise<PresentationOverride[]>;

let deferredScreenTwo: ReturnType<typeof deferred<ReturnType<typeof makeScreen>>> | null = null;
let cacheListeners: Array<(event: { key: string; action?: string }) => void> = [];
let readCachedEntry: CachedEntryReader = (_slug, id) => entries.get(id) ?? null;
let loadEntry: EntryLoader = async (_slug, id) => entries.get(id) ?? null;
let readCachedOverrides: CachedOverrideReader = () => [];
let loadOverrides: OverrideLoader = async () => [];
let loadMedia: (options?: { force?: boolean }) => Promise<MediaRecord[]> = async () => [];
let loadRelatedEntries: (
  slug: string,
  options?: { force?: boolean }
) => Promise<EntryDetail[]> = async () => [];

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreen: vi.fn((id: string) => screens.get(id) ?? null),
  getCustomScreenCached: vi.fn(async (id: string) => {
    if (id === "screen-2" && deferredScreenTwo) return deferredScreenTwo.promise;
    return screens.get(id) ?? null;
  }),
  getCachedScreenEntryOverrides: vi.fn((screenId: string, entryId: string) =>
    readCachedOverrides(screenId, entryId)
  ),
  getScreenEntryOverridesCached: vi.fn(
    (screenId: string, entryId: string, options?: { force?: boolean }) =>
      loadOverrides(screenId, entryId, options)
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
  getCachedEntryDetail: vi.fn((slug: string, id: string) => readCachedEntry(slug, id)),
  getEntryCached: vi.fn((slug: string, id: string, options?: { force?: boolean }) =>
    loadEntry(slug, id, options)
  ),
  listEntriesCached: vi.fn((slug: string, options?: { force?: boolean }) =>
    loadRelatedEntries(slug, options)
  ),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn((options?: { force?: boolean }) => loadMedia(options)),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((listener: (event: { key: string; action?: string }) => void) => {
    cacheListeners.push(listener);
    return () => {
      cacheListeners = cacheListeners.filter((candidate) => candidate !== listener);
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <RouterProbe />
        <CustomScreenEntryEditor />
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
  expect(element).not.toBeNull();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const editTextbox = (container: HTMLElement, label: string, value: string) => {
  const textbox = container.querySelector(`[role="textbox"][aria-label="${label}"]`);
  expect(textbox).not.toBeNull();
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
    cacheListeners.forEach((listener) => listener({ key, action }));
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

beforeEach(() => {
  deferredScreenTwo = null;
  cacheListeners = [];
  readCachedEntry = (_slug, id) => entries.get(id) ?? null;
  loadEntry = async (_slug, id) => entries.get(id) ?? null;
  readCachedOverrides = () => [];
  loadOverrides = async () => [];
  loadMedia = async () => [];
  loadRelatedEntries = async () => [];
  vi.mocked(createEntry).mockReset();
  vi.mocked(updateEntry).mockReset();
  vi.mocked(replaceScreenEntryOverrides).mockReset();
  vi.mocked(replaceScreenEntryOverrides).mockImplementation(
    async (_screen, _entry, overrides) => overrides
  );
  vi.mocked(updateEntry).mockImplementation(async (_slug, id) => entries.get(id) ?? makeEntry(id));
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("clean navigation proceeds without a dialog, while a content draft supports cancel and confirm", async () => {
  const clean = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(clean.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(clean.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
    expect(clean.container.textContent).not.toContain("Discard unsaved entry changes?");
  } finally {
    clean.cleanup();
  }

  const dirty = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(dirty.container, "Headline", "Local headline");
    await flush();
    expect(dirty.container.textContent).toContain("Unsaved changes");

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    click(dirty.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
    click(findButton(document.body, "Keep editing"));
    await flush();
    expect(dirty.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/1"
    );

    click(dirty.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    click(findButton(document.body, "Discard and continue"));
    await flush();
    expect(dirty.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
  } finally {
    dirty.cleanup();
  }
});

test("presentation-only changes activate the same navigation and beforeunload guard", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    click(view.container.querySelector('[data-testid="choose-presentation-media"]'));
    await flush();
    expect(view.container.textContent).toContain("Unsaved presentation");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
    click(findButton(document.body, "Keep editing"));
    await flush();
    click(findButton(view.container, "Clear selected presentation"));
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved presentation");
    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
  } finally {
    view.cleanup();
  }
});

test("a failed content save remains dirty and cannot bypass navigation blockers", async () => {
  vi.mocked(updateEntry).mockRejectedValueOnce(new Error("save failed"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Unsaved after failure");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.textContent).toContain("Failed to save record.");
    expect(view.container.textContent).toContain("Unsaved changes");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
  } finally {
    view.cleanup();
  }
});

test("a failed presentation save keeps its draft, global error, and navigation guard", async () => {
  vi.mocked(replaceScreenEntryOverrides).mockRejectedValueOnce(new Error("save failed"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    await choosePresentationMedia(view.container);
    click(findButton(view.container, "Save presentation"));
    await flush();
    expect(view.container.textContent).toContain("Failed to save presentation overrides.");
    expect(
      view.container.querySelector('[data-custom-screen-presentation-error="save"]')
    ).not.toBeNull();
    expect(view.container.textContent).toContain("Unsaved presentation");
    expect(findButton(view.container, "Retry presentation load")).toBeNull();

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
  } finally {
    view.cleanup();
  }
});

test("a superseded presentation save reconciles an equal baseline and suppresses its self-cache warning", async () => {
  const save = deferred<Array<{ blockId: string; propPath: "mediaAssetId"; value: string }>>();
  vi.mocked(replaceScreenEntryOverrides).mockImplementationOnce(async () => {
    cacheListeners.forEach((listener) =>
      listener({
        key: cacheKeys.customScreenEntryOverrides("screen-1", "1"),
        action: "update",
      })
    );
    return save.promise;
  });
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    click(view.container.querySelector('[data-testid="choose-presentation-media"]'));
    await flush();
    click(findButton(view.container, "Save presentation"));
    await flush();
    expect(replaceScreenEntryOverrides).toHaveBeenCalledWith("screen-1", "1", [
      { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
    ]);
    click(view.container.querySelector('[data-testid="clear-presentation-media"]'));
    await flush();

    save.resolve([]);
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved presentation");
    expect(view.container.textContent).not.toContain("newer local changes remain unsaved");
    expect(view.container.textContent).not.toContain("Presentation updated elsewhere");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
  } finally {
    view.cleanup();
  }
});

test("a stale create response keeps the newer draft, then retries with PATCH and bypasses only after success", async () => {
  const firstCreate = deferred<EntryDetail>();
  vi.mocked(createEntry).mockReturnValueOnce(firstCreate.promise);
  vi.mocked(updateEntry).mockResolvedValueOnce(makeEntry("created-1", "Final local title"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "First title");
    editTextbox(view.container, "Slug", "first-slug");
    click(findButton(view.container, "Save"));
    await flush();
    expect(createEntry).toHaveBeenCalledTimes(1);

    editTextbox(view.container, "Title", "Final local title");
    firstCreate.resolve(makeEntry("created-1", "First title"));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/new"
    );
    expect(view.container.textContent).toContain(
      "Saved server version; newer local changes remain unsaved."
    );

    click(findButton(view.container, "Save"));
    await flush();
    expect(createEntry).toHaveBeenCalledTimes(1);
    expect(updateEntry).toHaveBeenCalledWith(
      "projects",
      "created-1",
      expect.objectContaining({ title: "Final local title" })
    );
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/created-1"
    );
  } finally {
    view.cleanup();
  }
});

test("route gating hides entry A while screen B hydration is deferred", async () => {
  deferredScreenTwo = deferred<ReturnType<typeof makeScreen>>();
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    expect(view.container.textContent).toContain("Entry 1 headline");
    click(view.container.querySelector('[data-testid="navigate-screen-2"]'));
    await flush();
    expect(view.container.textContent).toContain("Loading custom screen record...");
    expect(view.container.textContent).not.toContain("Entry 1 headline");
    expect(findButton(view.container, "Save")).toBeNull();

    deferredScreenTwo.resolve(screens.get("screen-2")!);
    await flush();
    expect(view.container.textContent).toContain("Entry 1 headline");
  } finally {
    view.cleanup();
  }
});

test("presentation controls stay withheld until a failed load is retried successfully", async () => {
  const initialLoad = deferred<PresentationOverride[]>();
  const retryLoad = deferred<PresentationOverride[]>();
  let attempt = 0;
  readCachedOverrides = () => null;
  loadOverrides = () => (attempt++ === 0 ? initialLoad.promise : retryLoad.promise);
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();
    expect(view.container.querySelector('[data-testid="choose-presentation-media"]')).toBeNull();

    initialLoad.reject(new Error("override load failed"));
    await flush();
    expect(
      view.container.querySelector('[data-custom-screen-presentation-error="load"]')?.textContent
    ).toContain("Failed to load presentation overrides.");
    expect(findButton(view.container, "Retry presentation load")).not.toBeNull();

    click(view.container.querySelector('[data-screen-editor-canvas-scroller="true"]'));
    await flush();
    expect(view.container.textContent).toContain("Failed to load presentation overrides.");
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();

    click(findButton(view.container, "Retry presentation load"));
    await flush();
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();
    retryLoad.resolve([]);
    await flush();
    expect(view.container.querySelector("[data-custom-screen-presentation-error]")).toBeNull();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("content and presentation drafts share one both-dirty guard and discard invalidates the snapshot", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Both-dirty A snapshot");
    await choosePresentationMedia(view.container);
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("Unsaved presentation");

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    click(findButton(document.body, "Keep editing"));
    await flush();
    expect(view.container.textContent).toContain("Both-dirty A snapshot");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await confirmDiscard();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
    click(view.container.querySelector('[data-testid="navigate-entry-1"]'));
    await flush();
    expect(view.container.textContent).not.toContain("Both-dirty A snapshot");
    expect(view.container.textContent).not.toContain("Unsaved presentation");
  } finally {
    view.cleanup();
  }
});

test.each(["content", "presentation"] as const)(
  "a pending %s save from visit A cannot reactivate after A to B to A",
  async (channel) => {
    const contentSave = deferred<EntryDetail>();
    const presentationSave = deferred<PresentationOverride[]>();
    if (channel === "content") {
      vi.mocked(updateEntry).mockReturnValueOnce(contentSave.promise);
    } else {
      vi.mocked(replaceScreenEntryOverrides).mockReturnValueOnce(presentationSave.promise);
    }
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      if (channel === "content") {
        editTextbox(view.container, "Headline", "A1 pending content");
        click(findButton(view.container, "Save"));
      } else {
        await choosePresentationMedia(view.container);
        click(findButton(view.container, "Save presentation"));
      }
      await flush();
      expect(view.container.textContent).toContain("Saving...");

      click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
      await confirmDiscard();
      click(view.container.querySelector('[data-testid="navigate-entry-1"]'));
      await flush();
      expect(view.container.textContent).not.toContain("Saving...");
      expect(view.container.textContent).not.toContain("A1 pending content");

      if (channel === "content") {
        contentSave.resolve({
          ...makeEntry("1"),
          data: { ...makeEntry("1").data, headline: "stale saved content" },
        });
      } else {
        presentationSave.resolve([
          { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
        ]);
      }
      await flush();
      expect(view.container.textContent).not.toContain("Saving...");
      expect(view.container.textContent).not.toContain("newer local changes remain unsaved");
      expect(view.container.textContent).not.toContain("stale saved content");
    } finally {
      view.cleanup();
    }
  }
);

test.each(["entry-first", "override-first"] as const)(
  "overlapping entry and presentation hydration commits safely in %s order",
  async (order) => {
    const entryLoad = deferred<EntryDetail | null>();
    const overrideLoad = deferred<PresentationOverride[]>();
    readCachedEntry = () => null;
    readCachedOverrides = () => null;
    loadEntry = () => entryLoad.promise;
    loadOverrides = () => overrideLoad.promise;
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      expect(view.container.textContent).toContain("Loading custom screen record...");

      if (order === "entry-first") {
        entryLoad.resolve(makeEntry("1"));
        await flush();
        expect(view.container.textContent).toContain("Entry 1 headline");
        click(view.container.querySelector('[data-screen-block-id="image-1"]'));
        await flush();
        expect(
          view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
        ).toBeNull();
        overrideLoad.resolve([]);
      } else {
        overrideLoad.resolve([]);
        await flush();
        expect(view.container.textContent).toContain("Loading custom screen record...");
        entryLoad.resolve(makeEntry("1"));
      }
      await flush();
      click(view.container.querySelector('[data-screen-block-id="image-1"]'));
      await flush();
      expect(view.container.textContent).toContain("Entry 1 headline");
      expect(
        view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
      ).not.toBeNull();
    } finally {
      view.cleanup();
    }
  }
);

test.each(["dirty-before", "dirty-during"] as const)(
  "%s a rejected entry hydration preserves the local draft and ends loading",
  async (mode) => {
    const refreshLoad = deferred<EntryDetail | null>();
    let calls = 0;
    loadEntry = async (_slug, id) => {
      calls += 1;
      return calls === 1 ? (entries.get(id) ?? null) : refreshLoad.promise;
    };
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      const applyLocalEdit = () => editTextbox(view.container, "Headline", `${mode} local`);
      if (mode === "dirty-before") {
        applyLocalEdit();
        emitCacheEvent(cacheKeys.entryDetail("projects", "1"));
      } else {
        const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
        expect(textbox).not.toBeNull();
        React.act(() => {
          cacheListeners.forEach((listener) =>
            listener({ key: cacheKeys.entryDetail("projects", "1"), action: "update" })
          );
          (textbox as HTMLElement).textContent = `${mode} local`;
          textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
        });
      }
      refreshLoad.reject(new Error("refresh failed"));
      await flush();
      expect(view.container.textContent).toContain(`${mode} local`);
      expect(view.container.textContent).toContain(
        "Could not check for record updates. Local changes are unchanged."
      );
      expect(view.container.textContent).not.toContain("Loading custom screen record...");
      expect(findButton(view.container, "Save")).not.toBeNull();
    } finally {
      view.cleanup();
    }
  }
);

test("discarded visit hydration failure and stale finally cannot annotate the next visit", async () => {
  const staleRefresh = deferred<EntryDetail | null>();
  let calls = 0;
  loadEntry = async (_slug, id) => {
    calls += 1;
    return calls === 2 ? staleRefresh.promise : (entries.get(id) ?? null);
  };
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Discarded hydration snapshot");
    emitCacheEvent(cacheKeys.entryDetail("projects", "1"));
    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await confirmDiscard();
    staleRefresh.reject(new Error("stale failure"));
    await flush();
    expect(view.container.textContent).not.toContain("Discarded hydration snapshot");
    expect(view.container.textContent).not.toContain("Failed to load record.");
    expect(view.container.textContent).not.toContain("Loading custom screen record...");
  } finally {
    view.cleanup();
  }
});

test.each(["content", "presentation"] as const)(
  "an edit during a %s save preserves the newer local draft and bounded notice",
  async (channel) => {
    const contentSave = deferred<EntryDetail>();
    const presentationSave = deferred<PresentationOverride[]>();
    if (channel === "content") {
      vi.mocked(updateEntry).mockReturnValueOnce(contentSave.promise);
    } else {
      vi.mocked(replaceScreenEntryOverrides).mockReturnValueOnce(presentationSave.promise);
    }
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      if (channel === "content") {
        editTextbox(view.container, "Headline", "First content draft");
        click(findButton(view.container, "Save"));
        editTextbox(view.container, "Headline", "Newer content draft");
        contentSave.resolve({
          ...makeEntry("1"),
          data: { ...makeEntry("1").data, headline: "First content draft" },
        });
      } else {
        await choosePresentationMedia(view.container);
        click(findButton(view.container, "Save presentation"));
        click(view.container.querySelector('[data-testid="clear-presentation-media"]'));
        presentationSave.resolve([
          { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
        ]);
      }
      await flush();
      expect(view.container.textContent).toContain("newer local changes remain unsaved");
      expect(view.container.textContent).toContain(
        channel === "content" ? "Unsaved changes" : "Unsaved presentation"
      );
      if (channel === "content") {
        expect(view.container.textContent).toContain("Newer content draft");
      }
    } finally {
      view.cleanup();
    }
  }
);

test("an exact create waits for persistence before bypassing the guard", async () => {
  const create = deferred<EntryDetail>();
  vi.mocked(createEntry).mockReturnValueOnce(create.promise);
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "Exact create");
    editTextbox(view.container, "Slug", "exact-create");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/new"
    );
    create.resolve(makeEntry("created-exact", "Exact create"));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/created-exact"
    );
  } finally {
    view.cleanup();
  }
});

test("a failed stale-create PATCH retry stays dirty and does not navigate", async () => {
  const firstCreate = deferred<EntryDetail>();
  vi.mocked(createEntry).mockReturnValueOnce(firstCreate.promise);
  vi.mocked(updateEntry).mockRejectedValueOnce(new Error("retry failed"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "First create draft");
    editTextbox(view.container, "Slug", "first-create-draft");
    click(findButton(view.container, "Save"));
    editTextbox(view.container, "Title", "Retry create draft");
    firstCreate.resolve(makeEntry("created-retry", "First create draft"));
    await flush();
    click(findButton(view.container, "Save"));
    await flush();
    expect(updateEntry).toHaveBeenCalledWith(
      "projects",
      "created-retry",
      expect.objectContaining({ title: "Retry create draft" })
    );
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/new"
    );
    expect(view.container.textContent).toContain("Failed to save record.");
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("a late create A response cannot seed create B, which performs its own POST", async () => {
  const createA = deferred<EntryDetail>();
  vi.mocked(createEntry)
    .mockReturnValueOnce(createA.promise)
    .mockResolvedValueOnce(makeEntry("created-b", "Create B"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "Create A");
    editTextbox(view.container, "Slug", "create-a");
    click(findButton(view.container, "Save"));
    click(view.container.querySelector('[data-testid="navigate-create-screen-2"]'));
    await confirmDiscard();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "screen-2/entries/new"
    );

    createA.resolve(makeEntry("created-a", "Create A"));
    await flush();
    editTextbox(view.container, "Title", "Create B");
    editTextbox(view.container, "Slug", "create-b");
    click(findButton(view.container, "Save"));
    await flush();
    expect(createEntry).toHaveBeenCalledTimes(2);
    expect(updateEntry).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "screen-2/entries/created-b"
    );
  } finally {
    view.cleanup();
  }
});

test("forced media, relation, and assistant work is scoped to each keyed A to B to A visit", async () => {
  const staleForcedMedia = deferred<MediaRecord[]>();
  const staleRelated = deferred<EntryDetail[]>();
  let mediaCalls = 0;
  let relatedCalls = 0;
  const record = (url: string): MediaRecord => ({
    id: MEDIA_ID,
    key: url.slice(1),
    url,
    type: "image",
    mimeType: "image/jpeg",
    size: 10,
    createdAt: "2026-07-13T00:00:00.000Z",
  });
  readCachedOverrides = () => [{ blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID }];
  loadOverrides = async () => [{ blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID }];
  loadMedia = async () => {
    mediaCalls += 1;
    if (mediaCalls === 1) return [record("/media/a1.jpg")];
    if (mediaCalls === 2) return staleForcedMedia.promise;
    if (mediaCalls === 3) return [record("/media/b.jpg")];
    return [record("/media/a2.jpg")];
  };
  loadRelatedEntries = async () => {
    relatedCalls += 1;
    if (relatedCalls === 1) return staleRelated.promise;
    if (relatedCalls === 2) return [makeEntry("related-1", "Related B")];
    return [makeEntry("related-1", "Related A2")];
  };

  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/a1.jpg"
    );
    emitCacheEvent(cacheKeys.mediaList);
    await flush();
    expect(vi.mocked(listMediaCached).mock.calls.at(-1)?.[0]).toEqual({ force: true });

    const clearsBeforeRouteChange = vi.mocked(clearActiveAssistantSurfaceContext).mock.calls.length;
    click(view.container.querySelector('[data-testid="navigate-screen-2"]'));
    await flush();
    expect(vi.mocked(clearActiveAssistantSurfaceContext).mock.calls.length).toBeGreaterThan(
      clearsBeforeRouteChange
    );
    expect(view.container.innerHTML).not.toContain("/media/a1.jpg");
    expect(view.container.textContent).not.toContain("Related A");
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/b.jpg"
    );
    expect(view.container.textContent).toContain("Related B");
    expect(setActiveAssistantSurfaceContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ screen: expect.objectContaining({ id: "screen-2" }) })
    );
    expect(vi.mocked(listMediaCached).mock.calls.at(-1)?.[0]).toEqual({ force: false });

    click(view.container.querySelector('[data-testid="navigate-entry-1"]'));
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/a2.jpg"
    );
    expect(view.container.textContent).toContain("Related A2");
    expect(setActiveAssistantSurfaceContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ screen: expect.objectContaining({ id: "screen-1" }) })
    );

    staleForcedMedia.resolve([record("/media/stale-a1.jpg")]);
    staleRelated.resolve([makeEntry("related-1", "Related stale A1")]);
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/a2.jpg"
    );
    expect(view.container.textContent).not.toContain("Related stale A1");
  } finally {
    view.cleanup();
  }
});
