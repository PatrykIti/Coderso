// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as assistantSurface from "../../../core/admin/ui/assistant/activeSurfaceContext";
import * as contentTypesClient from "../../../core/admin/services/contentTypesClient";
import * as customScreensClient from "../../../core/admin/services/customScreensClient";
import * as entriesClient from "../../../core/admin/services/entriesClient";
import { ApiClientError } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import {
  advanceBuilderDraftGeneration,
  CustomScreenEditorPage,
} from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { CustomScreenListPage } from "../../../core/admin/ui/custom-screens/CustomScreenListPage";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import { broadcastCacheEvent, subscribeCacheEvents } from "../../../core/admin/utils/cacheBus";
import { renderAdminUi } from "../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("CustomScreenListPage renders shell and loading state", () => {
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toContain("Screens");
  expect(html).toContain("New screen");
  expect(html).toContain("Loading screens");
  expect(html).toContain("Search custom screens");
});

test("CustomScreenListPage renders cached screens without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.customScreensList,
      JSON.stringify({
        value: [
          {
            id: "screen-1",
            name: "Cached screen",
            contentTypeId: "type-1",
            status: "draft",
            showInSidebar: true,
            sidebarLabel: "Catalog",
            schemaVersion: 1,
            blocks: [],
            bindings: [],
            createdAt: "2026-03-05T00:00:00.000Z",
            updatedAt: "2026-03-05T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<CustomScreenListPage />, {
      path: "/admin/advanced/custom-screens",
    });

    expect(html).toContain("Cached screen");
    expect(html).toContain("Sidebar label:");
    expect(html).toContain("Catalog");
    expect(html).not.toContain("Loading screens");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CustomScreenEditorPage renders builder controls in create mode", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  expect(html).toContain("Save");
  // TASK-498-01: the List/Editor toggle + list-view editor surface are removed —
  // the editor is the always-on entry-view builder.
  expect(html).not.toContain("List View");
  expect(html).not.toContain("Editor View");
  expect(html).toContain('data-screen-authoring-canvas="true"');
  // TASK-496-02: shared `CanvasEditor` shell sub-toolbar (panel toggle + light
  // panel rail, relocated into the panel head) replaces the retired dark toolbar.
  expect(html).toContain('data-screen-toolbar-rail="true"');
  expect(html).toContain("Hide panel");
  // Screen-level settings stay reachable via the entry-view rail's Settings
  // category (aria-label="Settings"). The list-only "List settings" panel is gone.
  expect(html).not.toContain('aria-label="List settings"');
  expect(html).toContain('aria-label="Settings"');
  expect(html).toContain("Preview");
  expect(html).not.toContain("Selected Column");
});

test("CustomScreenListPage renders list shell", () => {
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toContain("Screens");
  expect(html).toContain("New screen");
});

test("CustomScreenEditorPage renders builder canvas and save action", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  expect(html).toContain("Save");
  // TASK-498-01: List/Editor toggle removed.
  expect(html).not.toContain("List View");
  expect(html).not.toContain("Editor View");
  expect(html).toContain("Preview");
  expect(html).not.toContain("Open records");
  expect(html).not.toContain("Back to list");
});

test("CustomScreenEditorPage tolerates cached stale screen bindings on read", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    const savedAt = Date.now();
    storage.setItem(
      cacheKeys.contentTypesList,
      JSON.stringify({
        value: [
          {
            id: "type-1",
            name: "Projects",
            slug: "projects",
            status: "published",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                headline: {
                  type: "string",
                  title: "Headline",
                  xFieldType: "text",
                },
              },
            },
            createdAt: "2026-05-03T00:00:00.000Z",
            updatedAt: "2026-05-03T00:00:00.000Z",
          },
        ],
        savedAt,
      })
    );
    storage.setItem(
      cacheKeys.customScreenDetail("screen-legacy"),
      JSON.stringify({
        value: {
          id: "screen-legacy",
          name: "Legacy Header Screen",
          contentTypeId: "type-1",
          status: "active",
          showInSidebar: true,
          sidebarLabel: "Projects",
          schemaVersion: 3,
          definition: {
            schemaVersion: 3,
            listView: {
              columns: [],
              filters: [],
              defaultSort: { field: "updatedAt", direction: "desc" },
              bulkActions: { delete: true, publish: true, unpublish: true },
            },
            editorView: {
              saveMode: "entry",
              interactionMode: "inline",
              blocks: [{ id: "header-1", type: "screen-record-header", data: {} }],
              bindings: [
                {
                  id: "binding-1",
                  widgetId: "header-1",
                  propPath: "title",
                  field: "headline",
                  mode: "readwrite",
                },
              ],
            },
          },
          blocks: [{ id: "header-1", type: "screen-record-header", data: {} }],
          bindings: [
            {
              id: "binding-1",
              widgetId: "header-1",
              propPath: "title",
              field: "headline",
              mode: "readwrite",
            },
          ],
          createdAt: "2026-05-03T00:00:00.000Z",
          updatedAt: "2026-05-03T00:00:00.000Z",
        },
        savedAt,
      })
    );

    const html = renderAdminUi(<CustomScreenEditorPage />, {
      path: "/admin/advanced/custom-screens/screen-legacy",
    });

    expect(html).toContain("Legacy Header Screen");
    expect(html).toContain("Preview");
    // TASK-498-01: List/Editor toggle removed (entry-view builder only).
    expect(html).not.toContain("List View");
    // TASK-496-02: shared `CanvasEditor` shell sub-toolbar replaces the retired
    // dark floating toolbar.
    expect(html).toContain('data-screen-toolbar-rail="true"');
    expect(html).not.toContain("Selected Column");
    expect(html).not.toContain("custom_screen_definition_invalid");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const mountedContentType = {
  id: "type-projects",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      urlA: { type: "string" as const, title: "Primary URL", xFieldType: "text" },
      urlB: { type: "string" as const, title: "Secondary URL", xFieldType: "text" },
      title: { type: "string" as const, title: "Title", xFieldType: "text" },
    },
  },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

const makeMountedScreen = (id: string, name = `Screen ${id}`): CustomScreenRecord => ({
  id,
  name,
  contentTypeId: mountedContentType.id,
  status: "active",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 4,
  definition: {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry",
      interactionMode: "inline",
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: `section-${id}`,
            type: "section",
            label: "Details",
            data: { title: "Details" },
            blocks: [
              {
                id: "button-1",
                type: "button",
                data: {
                  label: "Call to action",
                  text: "Open",
                  action: "link",
                  href: "/static-target",
                },
              },
            ],
          },
        ],
      },
      bindings: [],
    },
  },
  blocks: [],
  bindings: [],
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

const recordFromPayload = (
  base: CustomScreenRecord,
  payload: Parameters<typeof customScreensClient.updateCustomScreen>[1]
): CustomScreenRecord => ({
  ...base,
  ...payload,
  definition: payload.definition ?? base.definition,
  sidebarLabel: payload.sidebarLabel ?? null,
  updatedAt: "2026-07-14T01:00:00.000Z",
});

function RouterProbe() {
  const { navigate, path } = useAdminRouter();
  return (
    <div data-router-probe>
      <output data-current-path>{path}</output>
      <button
        type="button"
        data-navigate-screen-one
        onClick={() => navigate("/advanced/custom-screens/screen-1")}
      >
        Screen one
      </button>
      <button
        type="button"
        data-navigate-screen-two
        onClick={() => navigate("/advanced/custom-screens/screen-2")}
      >
        Screen two
      </button>
      <button
        type="button"
        data-navigate-new-screen
        onClick={() => navigate("/advanced/custom-screens/new")}
      >
        New screen route
      </button>
      <button
        type="button"
        data-navigate-query
        onClick={() => navigate("/advanced/custom-screens/screen-1?panel=settings#name")}
      >
        Query and hash
      </button>
    </div>
  );
}

function LayoutRemovalCacheBroadcast({
  showEditor,
  broadcastAfterRemoval,
}: {
  showEditor: boolean;
  broadcastAfterRemoval: boolean;
}) {
  React.useLayoutEffect(() => {
    if (!showEditor && broadcastAfterRemoval) {
      broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
    }
  }, [broadcastAfterRemoval, showEditor]);

  return showEditor ? <CustomScreenEditorPage /> : null;
}

const mountEditor = (path: string) => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <RouterProbe />
        <CustomScreenEditorPage />
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

const mountLayoutRemovalRace = (path: string) => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (showEditor: boolean, broadcastAfterRemoval: boolean) => {
    React.act(() => {
      root.render(
        <AdminRouterProvider initialPath={path}>
          <LayoutRemovalCacheBroadcast
            showEditor={showEditor}
            broadcastAfterRemoval={broadcastAfterRemoval}
          />
        </AdminRouterProvider>
      );
    });
  };
  render(true, false);
  return {
    container,
    removeEditorAndBroadcast: () => render(false, true),
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flushMountedEditor = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const resolveDeferred = async <T,>(request: Deferred<T>, value: T) => {
  await React.act(async () => {
    request.resolve(value);
    await request.promise;
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const rejectDeferred = async <T,>(request: Deferred<T>, error: unknown) => {
  await React.act(async () => {
    request.reject(error);
    await request.promise.catch(() => undefined);
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const clickElement = (element: Element | null) => {
  expect(element).not.toBeNull();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findButton = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text
  ) ?? null;

const openScreenSettings = async (container: ParentNode) => {
  const settings = container.querySelector('button[aria-label="Settings"]');
  if (settings) clickElement(settings);
  await flushMountedEditor();
};

const getScreenNameInput = (container: ParentNode) =>
  container.querySelector<HTMLInputElement>('input[placeholder="Custom screen name"]');

const setInputValue = (input: HTMLInputElement | null, value: string) => {
  expect(input).not.toBeNull();
  React.act(() => {
    input?.focus();
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input as HTMLInputElement),
      "value"
    )?.set;
    setter?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const editScreenName = async (container: ParentNode, value: string) => {
  await openScreenSettings(container);
  setInputValue(getScreenNameInput(container), value);
  await flushMountedEditor();
};

const chooseScreenContentType = async (container: ParentNode, optionText = "Projects") => {
  await openScreenSettings(container);
  const label = Array.from(container.querySelectorAll("p")).find(
    (node) => node.textContent?.trim() === "Content type"
  );
  const trigger = label?.parentElement?.querySelector<HTMLElement>('[role="combobox"]') ?? null;
  expect(trigger).not.toBeNull();
  React.act(() => {
    trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (node) => node.textContent?.trim() === optionText
  );
  expect(option).toBeDefined();
  React.act(() => {
    option?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushMountedEditor();
};

const saveScreen = (container: ParentNode) => clickElement(findButton(container, "Save"));

const currentPath = (container: ParentNode) =>
  container.querySelector("[data-current-path]")?.textContent ?? "";

describe("CustomScreenEditorPage route, draft, hydration, and save authority", () => {
  let cachedScreens: Map<string, CustomScreenRecord>;
  let remoteScreens: Map<string, CustomScreenRecord>;
  let loadQueue: Array<{
    screenId: string;
    request: Promise<CustomScreenRecord | null>;
  }>;
  let createQueue: Array<Promise<CustomScreenRecord>>;
  let updateQueue: Array<Promise<CustomScreenRecord>>;
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let createSpy: ReturnType<typeof vi.spyOn>;
  let updateSpy: ReturnType<typeof vi.spyOn>;
  let assistantSetSpy: ReturnType<typeof vi.spyOn>;
  let assistantClearSpy: ReturnType<typeof vi.spyOn>;

  const queueScreenLoad = (screenId: string, request: Promise<CustomScreenRecord | null>) => {
    loadQueue.push({ screenId, request });
  };

  beforeEach(() => {
    const screenOne = makeMountedScreen("screen-1", "Screen one baseline");
    const screenTwo = makeMountedScreen("screen-2", "Screen two baseline");
    cachedScreens = new Map([
      [screenOne.id, screenOne],
      [screenTwo.id, screenTwo],
    ]);
    remoteScreens = new Map([
      [screenOne.id, screenOne],
      [screenTwo.id, screenTwo],
    ]);
    loadQueue = [];
    createQueue = [];
    updateQueue = [];

    vi.spyOn(contentTypesClient, "getCachedContentTypes").mockReturnValue([mountedContentType]);
    vi.spyOn(contentTypesClient, "listContentTypesCached").mockResolvedValue([mountedContentType]);
    vi.spyOn(entriesClient, "getCachedEntries").mockReturnValue([]);
    vi.spyOn(entriesClient, "listEntriesCached").mockResolvedValue([]);
    assistantSetSpy = vi
      .spyOn(assistantSurface, "setActiveAssistantSurfaceContext")
      .mockImplementation(() => undefined);
    assistantClearSpy = vi
      .spyOn(assistantSurface, "clearActiveAssistantSurfaceContext")
      .mockImplementation(() => undefined);
    vi.spyOn(customScreensClient, "getCachedCustomScreen").mockImplementation(
      (id) => cachedScreens.get(id) ?? null
    );
    loadSpy = vi
      .spyOn(customScreensClient, "getCustomScreenCached")
      .mockImplementation(async (id) => {
        const queuedIndex = loadQueue.findIndex((queued) => queued.screenId === id);
        const queued = queuedIndex === -1 ? null : loadQueue.splice(queuedIndex, 1)[0];
        return queued ? await queued.request : (remoteScreens.get(id) ?? null);
      });
    createSpy = vi
      .spyOn(customScreensClient, "createCustomScreen")
      .mockImplementation(async (payload) => {
        const queued = createQueue.shift();
        const created = queued
          ? await queued
          : recordFromPayload(makeMountedScreen("created-screen"), payload);
        cachedScreens.set(created.id, created);
        remoteScreens.set(created.id, created);
        broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail(created.id),
          action: "update",
        });
        return created;
      });
    updateSpy = vi
      .spyOn(customScreensClient, "updateCustomScreen")
      .mockImplementation(async (id, payload) => {
        const queued = updateQueue.shift();
        const updated = queued
          ? await queued
          : recordFromPayload(
              remoteScreens.get(id) ?? cachedScreens.get(id) ?? makeMountedScreen(id),
              payload
            );
        cachedScreens.set(updated.id, updated);
        remoteScreens.set(updated.id, updated);
        broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail(updated.id),
          action: "update",
        });
        return updated;
      });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  test("advanceBuilderDraftGeneration is the production monotonic transition", () => {
    expect(advanceBuilderDraftGeneration(0)).toBe(1);
    expect(advanceBuilderDraftGeneration(41)).toBe(42);
  });

  test("local Screen mutations have one static dirty-generation owner", () => {
    const source = readFileSync(
      resolve(process.cwd(), "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx"),
      "utf8"
    );
    const updateDefinitionSource = source.slice(
      source.indexOf("const updateDefinition = useCallback"),
      source.indexOf("const updateEditorView = useCallback")
    );
    expect(updateDefinitionSource.match(/markDirty\(/g)).toHaveLength(1);

    const documentAndBindingHandlers = source.slice(
      source.indexOf("const handleAddBlock"),
      source.indexOf("const mapBoundedScreenSaveError")
    );
    expect(documentAndBindingHandlers).toContain("updateEditorView({");
    expect(documentAndBindingHandlers).not.toContain("markDirty(");

    const metadataHandlers = source.slice(
      source.indexOf("const screenSettingsPanel"),
      source.indexOf("const previewOwnerKey")
    );
    expect(metadataHandlers.match(/markDirty\(\)/g)).toHaveLength(5);
  });

  test("clean navigation proceeds, while dirty navigation guards beforeunload and preserves cancel/confirm semantics", async () => {
    const clean = mountEditor("/admin/advanced/custom-screens/screen-1");
    await flushMountedEditor();
    clickElement(clean.container.querySelector("[data-navigate-screen-two]"));
    await flushMountedEditor();
    expect(currentPath(clean.container)).toBe("/admin/advanced/custom-screens/screen-2");
    expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    clean.cleanup();

    const dirty = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(dirty.container, "Locally edited Screen");
      expect(dirty.container.textContent).toContain("Unsaved changes");

      const beforeUnload = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(beforeUnload);
      expect(beforeUnload.defaultPrevented).toBe(true);

      clickElement(dirty.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      expect(currentPath(dirty.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(document.body.textContent).toContain("Discard unsaved Screen changes?");

      clickElement(findButton(document, "Keep editing"));
      await flushMountedEditor();
      expect(currentPath(dirty.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(getScreenNameInput(dirty.container)?.value).toBe("Locally edited Screen");

      clickElement(dirty.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Discard and continue"));
      await flushMountedEditor();
      expect(currentPath(dirty.container)).toBe("/admin/advanced/custom-screens/screen-2");
      expect(dirty.container.textContent).toContain("Screen two baseline");
      expect(dirty.container.textContent).not.toContain("Locally edited Screen");
    } finally {
      dirty.cleanup();
    }
  });

  test("query/hash-only navigation preserves the dirty draft and mounted visit without prompting", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Query-safe draft");
      const loadsBeforeNavigation = loadSpy.mock.calls.length;
      clickElement(view.container.querySelector("[data-navigate-query]"));
      await flushMountedEditor();
      expect(currentPath(view.container)).toBe(
        "/admin/advanced/custom-screens/screen-1?panel=settings#name"
      );
      expect(getScreenNameInput(view.container)?.value).toBe("Query-safe draft");
      expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeNavigation);
      expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    } finally {
      view.cleanup();
    }
  });

  test("existing update failure keeps the draft dirty and an exact retry clears it without self-cache hydration", async () => {
    const failedUpdate = deferred<CustomScreenRecord>();
    updateQueue.push(failedUpdate.promise);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Locally updated Screen");
      const loadsBeforeSave = loadSpy.mock.calls.length;

      saveScreen(view.container);
      await flushMountedEditor();
      expect(view.container.textContent).toContain("Saving...");

      await rejectDeferred(
        failedUpdate,
        new ApiClientError("custom_screen_invalid", "Screen save rejected", 422, {
          fields: ["name"],
        })
      );
      expect(view.container.textContent).toContain("Screen save rejected (field(s): name)");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(getScreenNameInput(view.container)?.value).toBe("Locally updated Screen");
      expect(updateSpy.mock.calls[0]?.[0]).toBe("screen-1");

      saveScreen(view.container);
      await flushMountedEditor();
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy.mock.calls[1]?.[0]).toBe("screen-1");
      expect(updateSpy.mock.calls[1]?.[1].name).toBe("Locally updated Screen");
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(view.container.textContent).not.toContain("Screen save rejected");
      expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeSave);
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
    } finally {
      view.cleanup();
    }
  });

  test("exact create saves once and opens the canonical encoded Screen editor without a discard prompt", async () => {
    const created = makeMountedScreen("created / screen", "Created Screen");
    createQueue.push(Promise.resolve(created));
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Created Screen");
      await chooseScreenContentType(view.container);
      expect(view.container.textContent).toContain("Unsaved changes");

      saveScreen(view.container);
      await flushMountedEditor();

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0]?.[0]).toMatchObject({
        name: "Created Screen",
        contentTypeId: mountedContentType.id,
      });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(currentPath(view.container)).toBe(
        "/admin/advanced/custom-screens/created%20%2F%20screen"
      );
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    } finally {
      view.cleanup();
    }
  });

  test("an edit during an existing update preserves the newer local draft and bounded notice", async () => {
    const pendingUpdate = deferred<CustomScreenRecord>();
    updateQueue.push(pendingUpdate.promise);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Server-bound update");
      saveScreen(view.container);
      await flushMountedEditor();
      const capturedPayload = updateSpy.mock.calls[0]?.[1];
      expect(capturedPayload).toBeDefined();
      if (!capturedPayload) throw new Error("Update payload was not captured");

      await editScreenName(view.container, "Newer local Screen draft");
      await resolveDeferred(
        pendingUpdate,
        recordFromPayload(makeMountedScreen("screen-1"), capturedPayload)
      );

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0]?.[0]).toBe("screen-1");
      expect(getScreenNameInput(view.container)?.value).toBe("Newer local Screen draft");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Saved server version; newer local changes remain unsaved."
      );
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
    } finally {
      view.cleanup();
    }
  });

  test("a stale create stores its ID and an exact retry PATCHes once before canonical navigation", async () => {
    const pendingCreate = deferred<CustomScreenRecord>();
    createQueue.push(pendingCreate.promise);
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "First create payload");
      await chooseScreenContentType(view.container);
      saveScreen(view.container);
      await flushMountedEditor();

      await editScreenName(view.container, "Newer create draft");
      await resolveDeferred(
        pendingCreate,
        makeMountedScreen("created-retry", "First create payload")
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).not.toHaveBeenCalled();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      expect(getScreenNameInput(view.container)?.value).toBe("Newer create draft");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Saved server version; newer local changes remain unsaved."
      );

      saveScreen(view.container);
      await flushMountedEditor();
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0]?.[0]).toBe("created-retry");
      expect(updateSpy.mock.calls[0]?.[1].name).toBe("Newer create draft");
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/created-retry");
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    } finally {
      view.cleanup();
    }
  });

  test("a failed stale-create PATCH retry stays dirty and never navigates", async () => {
    const pendingCreate = deferred<CustomScreenRecord>();
    createQueue.push(pendingCreate.promise);
    const failedRetry = deferred<CustomScreenRecord>();
    updateQueue.push(failedRetry.promise);
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Create before retry");
      await chooseScreenContentType(view.container);
      saveScreen(view.container);
      await flushMountedEditor();
      await editScreenName(view.container, "Retry remains local");
      await resolveDeferred(
        pendingCreate,
        makeMountedScreen("created-failed-retry", "Create before retry")
      );

      saveScreen(view.container);
      await flushMountedEditor();
      await rejectDeferred(
        failedRetry,
        new ApiClientError("custom_screen_conflict", "Retry rejected", 409)
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0]?.[0]).toBe("created-failed-retry");
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      expect(getScreenNameInput(view.container)?.value).toBe("Retry remains local");
      expect(view.container.textContent).toContain("Retry rejected");
      expect(view.container.textContent).toContain("Unsaved changes");
    } finally {
      view.cleanup();
    }
  });

  test("a hydration that resolves after a local edit preserves the draft and shows only the remote-update warning", async () => {
    const pendingLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", pendingLoad.promise);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Local draft during hydration");
      await resolveDeferred(pendingLoad, makeMountedScreen("screen-1", "Remote hydration result"));

      expect(getScreenNameInput(view.container)?.value).toBe("Local draft during hydration");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain("Updated in another tab");
      expect(view.container.textContent).not.toContain("Remote hydration result");
      expect(view.container.textContent).not.toContain("Failed to load custom screen.");
      expect(view.container.textContent).not.toContain("Loading custom screen...");
    } finally {
      view.cleanup();
    }
  });

  test("a hydration rejection after a local edit uses the bounded local-copy error", async () => {
    const pendingLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", pendingLoad.promise);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Local draft before rejection");
      await rejectDeferred(pendingLoad, new Error("remote transport detail"));

      expect(getScreenNameInput(view.container)?.value).toBe("Local draft before rejection");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Could not check for Screen updates. Local changes are unchanged."
      );
      expect(view.container.textContent).not.toContain("remote transport detail");
      expect(view.container.textContent).not.toContain("Loading custom screen...");
    } finally {
      view.cleanup();
    }
  });

  test("a refresh started while already dirty also uses the bounded local-copy error", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Dirty before refresh");
      const callsBeforeCacheEvent = loadSpy.mock.calls.length;
      React.act(() => {
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail("screen-1"),
          action: "update",
        });
      });
      await flushMountedEditor();
      expect(loadSpy).toHaveBeenCalledTimes(callsBeforeCacheEvent);
      expect(view.container.textContent).toContain("Updated in another tab");

      const pendingRefresh = deferred<CustomScreenRecord | null>();
      queueScreenLoad("screen-1", pendingRefresh.promise);
      clickElement(findButton(view.container, "Refresh"));
      await flushMountedEditor();
      await rejectDeferred(pendingRefresh, new Error("refresh failed privately"));

      expect(loadSpy).toHaveBeenCalledTimes(callsBeforeCacheEvent + 1);
      expect(getScreenNameInput(view.container)?.value).toBe("Dirty before refresh");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Could not check for Screen updates. Local changes are unchanged."
      );
      expect(view.container.textContent).not.toContain("refresh failed privately");
    } finally {
      view.cleanup();
    }
  });

  test("an uncached current visit shows loading then not-found without mounting old or default builder content", async () => {
    cachedScreens.delete("screen-1");
    const pendingLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", pendingLoad.promise);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      expect(view.container.textContent).toContain("Loading custom screen...");
      expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
      expect(findButton(view.container, "Save")).toBeNull();
      expect(findButton(view.container, "Preview")).toBeNull();
      expect(assistantSetSpy).not.toHaveBeenCalled();
      await flushMountedEditor();

      await resolveDeferred(pendingLoad, null);
      expect(view.container.textContent).toContain("Custom screen not found.");
      expect(view.container.textContent).not.toContain("Loading custom screen...");
      expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
      expect(assistantSetSpy).not.toHaveBeenCalled();
      expect(assistantClearSpy).toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("only a clean unchanged uncached visit receives API or generic load errors", async () => {
    const cases = [
      {
        screenId: "screen-1",
        error: new ApiClientError("custom_screen_unavailable", "API load unavailable", 503),
        message: "API load unavailable",
      },
      {
        screenId: "screen-2",
        error: new Error("private generic detail"),
        message: "Failed to load custom screen.",
      },
    ];

    for (const testCase of cases) {
      cachedScreens.delete(testCase.screenId);
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad(testCase.screenId, pendingLoad.promise);
      const view = mountEditor(`/admin/advanced/custom-screens/${testCase.screenId}`);
      try {
        expect(view.container.textContent).toContain("Loading custom screen...");
        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        await flushMountedEditor();
        await rejectDeferred(pendingLoad, testCase.error);
        expect(view.container.textContent).toContain(testCase.message);
        expect(view.container.textContent).not.toContain("Loading custom screen...");
        expect(view.container.textContent).not.toContain(
          "Could not check for Screen updates. Local changes are unchanged."
        );
        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        expect(assistantSetSpy).not.toHaveBeenCalled();
      } finally {
        view.cleanup();
      }
    }
  });

  test("an older hydration cannot erase or replace a newer save failure", async () => {
    const cases: Array<"resolve" | "reject"> = ["resolve", "reject"];

    for (const [index, outcome] of cases.entries()) {
      const screenId = `save-failure-${index}`;
      const baseline = makeMountedScreen(screenId, `Save failure ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad(screenId, pendingLoad.promise);
      const failedUpdate = deferred<CustomScreenRecord>();
      updateQueue.push(failedUpdate.promise);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Local save failure ${index}`);
        saveScreen(view.container);
        await flushMountedEditor();
        await rejectDeferred(
          failedUpdate,
          new ApiClientError("custom_screen_conflict", `Save failed visibly ${index}`, 409)
        );
        expect(view.container.textContent).toContain(`Save failed visibly ${index}`);

        if (outcome === "resolve") {
          await resolveDeferred(
            pendingLoad,
            makeMountedScreen(screenId, `Older hydration ${index}`)
          );
        } else {
          await rejectDeferred(pendingLoad, new Error(`Older load failure ${index}`));
        }

        expect(getScreenNameInput(view.container)?.value).toBe(`Local save failure ${index}`);
        expect(view.container.textContent).toContain(`Save failed visibly ${index}`);
        expect(view.container.textContent).toContain("Unsaved changes");
        expect(view.container.textContent).not.toContain(`Older hydration ${index}`);
        expect(view.container.textContent).not.toContain("Updated in another tab");
        expect(view.container.textContent).not.toContain(
          "Could not check for Screen updates. Local changes are unchanged."
        );
        expect(view.container.textContent).not.toContain("Failed to load custom screen.");
      } finally {
        view.cleanup();
      }
    }
  });

  test("pre-existing hydration settlements on either side of an exact save cannot publish stale state", async () => {
    const cases = [
      { outcome: "resolve" as const, hydrationFirst: true },
      { outcome: "reject" as const, hydrationFirst: true },
      { outcome: "resolve" as const, hydrationFirst: false },
      { outcome: "reject" as const, hydrationFirst: false },
    ];

    for (const [index, testCase] of cases.entries()) {
      const screenId = `save-hydration-${index}`;
      const baseline = makeMountedScreen(screenId, `Hydration baseline ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad(screenId, pendingLoad.promise);
      const pendingUpdate = deferred<CustomScreenRecord>();
      updateQueue.push(pendingUpdate.promise);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

      const settleHydration = async () => {
        if (testCase.outcome === "resolve") {
          await resolveDeferred(
            pendingLoad,
            makeMountedScreen(screenId, `Stale hydration ${index}`)
          );
        } else {
          await rejectDeferred(pendingLoad, new Error(`Stale hydration failure ${index}`));
        }
      };

      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Exact saved Screen ${index}`);
        saveScreen(view.container);
        await flushMountedEditor();
        const payload = updateSpy.mock.calls.at(-1)?.[1];
        if (!payload) throw new Error("Exact update payload was not captured");

        if (testCase.hydrationFirst) await settleHydration();
        await resolveDeferred(pendingUpdate, recordFromPayload(baseline, payload));
        if (!testCase.hydrationFirst) await settleHydration();

        expect(getScreenNameInput(view.container)?.value).toBe(`Exact saved Screen ${index}`);
        expect(view.container.textContent).not.toContain("Unsaved changes");
        expect(view.container.textContent).not.toContain("Updated in another tab");
        expect(view.container.textContent).not.toContain(
          "Could not check for Screen updates. Local changes are unchanged."
        );
        expect(view.container.textContent).not.toContain("Failed to load custom screen.");
        expect(view.container.textContent).not.toContain(
          "Saved server version; newer local changes remain unsaved."
        );
        expect(view.container.textContent).not.toContain(`Stale hydration ${index}`);
      } finally {
        view.cleanup();
      }
    }
  });

  test("A to B to A gives the second A an opaque visit in both stale settlement orders", async () => {
    const cases = [
      { oldOutcome: "resolve" as const, oldFirst: true },
      { oldOutcome: "reject" as const, oldFirst: true },
      { oldOutcome: "resolve" as const, oldFirst: false },
      { oldOutcome: "reject" as const, oldFirst: false },
    ];

    for (const [index, testCase] of cases.entries()) {
      const firstBaseline = makeMountedScreen("screen-1", `First A baseline ${index}`);
      const secondBaseline = makeMountedScreen("screen-2", `B baseline ${index}`);
      cachedScreens.set("screen-1", firstBaseline);
      cachedScreens.set("screen-2", secondBaseline);
      remoteScreens.set("screen-1", firstBaseline);
      remoteScreens.set("screen-2", secondBaseline);
      const oldA = deferred<CustomScreenRecord | null>();
      const newA = deferred<CustomScreenRecord | null>();
      queueScreenLoad("screen-1", oldA.promise);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");

      const settleOldA = async () => {
        if (testCase.oldOutcome === "resolve") {
          await resolveDeferred(oldA, makeMountedScreen("screen-1", `First A late ${index}`));
        } else {
          await rejectDeferred(oldA, new Error(`First A failure ${index}`));
        }
      };

      try {
        await flushMountedEditor();
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");
        expect(view.container.textContent).toContain(`B baseline ${index}`);

        cachedScreens.delete("screen-1");
        queueScreenLoad("screen-1", newA.promise);
        assistantSetSpy.mockClear();
        assistantClearSpy.mockClear();
        clickElement(view.container.querySelector("[data-navigate-screen-one]"));
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
        expect(view.container.textContent).toContain("Loading custom screen...");
        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        await flushMountedEditor();
        expect(assistantSetSpy).not.toHaveBeenCalled();

        if (testCase.oldFirst) {
          await settleOldA();
          expect(view.container.textContent).toContain("Loading custom screen...");
          expect(view.container.textContent).not.toContain(`First A late ${index}`);
          expect(view.container.textContent).not.toContain("Failed to load custom screen.");
          expect(view.container.textContent).not.toContain("Updated in another tab");
          expect(assistantSetSpy).not.toHaveBeenCalled();
        }

        await resolveDeferred(
          newA,
          makeMountedScreen("screen-1", `Second A authoritative ${index}`)
        );
        expect(view.container.textContent).not.toContain("Loading custom screen...");
        expect(
          view.container.querySelector('[data-screen-authoring-canvas="true"]')
        ).not.toBeNull();
        await openScreenSettings(view.container);
        expect(getScreenNameInput(view.container)?.value).toBe(`Second A authoritative ${index}`);
        const assistantCallsAfterCurrent = assistantSetSpy.mock.calls.length;

        if (!testCase.oldFirst) await settleOldA();

        expect(getScreenNameInput(view.container)?.value).toBe(`Second A authoritative ${index}`);
        expect(view.container.textContent).not.toContain(`First A late ${index}`);
        expect(view.container.textContent).not.toContain(`First A failure ${index}`);
        expect(view.container.textContent).not.toContain(`B baseline ${index}`);
        expect(view.container.textContent).not.toContain("Updated in another tab");
        expect(view.container.textContent).not.toContain(
          "Saved server version; newer local changes remain unsaved."
        );
        expect(view.container.textContent).not.toContain("Loading custom screen...");
        expect(assistantSetSpy.mock.calls.length).toBe(assistantCallsAfterCurrent);
        expect(JSON.stringify(assistantSetSpy.mock.calls)).toContain(
          `Second A authoritative ${index}`
        );
        expect(JSON.stringify(assistantSetSpy.mock.calls)).not.toContain(`First A late ${index}`);
      } finally {
        view.cleanup();
      }
    }
  });

  test("cancel keeps a pending hydration live while confirm invalidates all of its late outcomes", async () => {
    const cancelLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", cancelLoad.promise);
    const cancelView = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(cancelView.container, "Hydration cancel draft");
      clickElement(cancelView.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Keep editing"));
      await flushMountedEditor();
      await resolveDeferred(
        cancelLoad,
        makeMountedScreen("screen-1", "Remote after hydration cancel")
      );

      expect(currentPath(cancelView.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(getScreenNameInput(cancelView.container)?.value).toBe("Hydration cancel draft");
      expect(cancelView.container.textContent).toContain("Unsaved changes");
      expect(cancelView.container.textContent).toContain("Updated in another tab");
      expect(cancelView.container.textContent).not.toContain("Remote after hydration cancel");
    } finally {
      cancelView.cleanup();
    }

    for (const outcome of ["resolve", "reject"] as const) {
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad("screen-1", pendingLoad.promise);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");
      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Hydration confirm ${outcome}`);
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        clickElement(findButton(document, "Discard and continue"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

        if (outcome === "resolve") {
          await resolveDeferred(
            pendingLoad,
            makeMountedScreen("screen-1", "Discarded hydration result")
          );
        } else {
          await rejectDeferred(pendingLoad, new Error("discarded hydration failure"));
        }

        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");
        expect(view.container.textContent).toContain("Screen two baseline");
        expect(view.container.textContent).not.toContain(`Hydration confirm ${outcome}`);
        expect(view.container.textContent).not.toContain("Discarded hydration result");
        expect(view.container.textContent).not.toContain("discarded hydration failure");
        expect(view.container.textContent).not.toContain("Updated in another tab");
        expect(view.container.textContent).not.toContain("Loading custom screen...");
      } finally {
        view.cleanup();
      }
    }
  });

  test("cancel keeps a pending save authoritative while confirm invalidates success and failure", async () => {
    const cancelSave = deferred<CustomScreenRecord>();
    updateQueue.push(cancelSave.promise);
    const cancelView = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(cancelView.container, "Save cancel draft");
      saveScreen(cancelView.container);
      await flushMountedEditor();
      const payload = updateSpy.mock.calls.at(-1)?.[1];
      if (!payload) throw new Error("Cancel-save payload was not captured");
      clickElement(cancelView.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Keep editing"));
      await flushMountedEditor();
      await resolveDeferred(cancelSave, recordFromPayload(makeMountedScreen("screen-1"), payload));

      expect(currentPath(cancelView.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(getScreenNameInput(cancelView.container)?.value).toBe("Save cancel draft");
      expect(cancelView.container.textContent).not.toContain("Unsaved changes");
      expect(cancelView.container.textContent).not.toContain("Saving...");
    } finally {
      cancelView.cleanup();
    }

    for (const outcome of ["resolve", "reject"] as const) {
      const pendingSave = deferred<CustomScreenRecord>();
      updateQueue.push(pendingSave.promise);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");
      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Save confirm ${outcome}`);
        saveScreen(view.container);
        await flushMountedEditor();
        const payload = updateSpy.mock.calls.at(-1)?.[1];
        if (!payload) throw new Error("Confirm-save payload was not captured");
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        clickElement(findButton(document, "Discard and continue"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

        if (outcome === "resolve") {
          await resolveDeferred(pendingSave, {
            ...recordFromPayload(makeMountedScreen("screen-1"), payload),
            warnings: [
              {
                code: "binding_field_removed",
                fields: ["discarded-field"],
              },
            ],
          });
        } else {
          await rejectDeferred(pendingSave, new Error("discarded save failure"));
        }

        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");
        expect(view.container.textContent).toContain("Screen two baseline");
        expect(view.container.textContent).not.toContain(`Save confirm ${outcome}`);
        expect(view.container.textContent).not.toContain("discarded-field");
        expect(view.container.textContent).not.toContain("discarded save failure");
        expect(view.container.textContent).not.toContain("Saving...");
        expect(view.container.textContent).not.toContain("Unsaved changes");
      } finally {
        view.cleanup();
      }
    }
  });

  test("an old create response cannot seed the next create visit with a PATCH target", async () => {
    const oldCreate = deferred<CustomScreenRecord>();
    createQueue.push(oldCreate.promise);
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Create visit A");
      await chooseScreenContentType(view.container);
      saveScreen(view.container);
      await flushMountedEditor();
      clickElement(view.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Discard and continue"));
      await flushMountedEditor();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

      clickElement(view.container.querySelector("[data-navigate-new-screen]"));
      await flushMountedEditor();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      await editScreenName(view.container, "Create visit B");
      await chooseScreenContentType(view.container);

      await resolveDeferred(oldCreate, makeMountedScreen("old-create-a", "Create visit A"));
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      await openScreenSettings(view.container);
      expect(getScreenNameInput(view.container)?.value).toBe("Create visit B");

      saveScreen(view.container);
      await flushMountedEditor();
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy.mock.calls[1]?.[0].name).toBe("Create visit B");
      expect(updateSpy).not.toHaveBeenCalled();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/created-screen");
    } finally {
      view.cleanup();
    }
  });

  test("a cache event between layout removal and passive unsubscribe starts no old-visit work", async () => {
    let observedBroadcasts = 0;
    const unsubscribeObserver = subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.customScreensList) observedBroadcasts += 1;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = mountLayoutRemovalRace("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      const loadsBeforeRemoval = loadSpy.mock.calls.length;
      assistantSetSpy.mockClear();
      view.removeEditorAndBroadcast();
      await flushMountedEditor();

      expect(observedBroadcasts).toBe(1);
      expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeRemoval);
      expect(assistantSetSpy).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      unsubscribeObserver();
      view.cleanup();
      consoleError.mockRestore();
    }
  });

  test("late hydration and save settlements after unmount cannot commit or restart work", async () => {
    const cases = [
      { operation: "hydrate" as const, outcome: "resolve" as const },
      { operation: "hydrate" as const, outcome: "reject" as const },
      { operation: "save" as const, outcome: "resolve" as const },
      { operation: "save" as const, outcome: "reject" as const },
    ];

    for (const [index, testCase] of cases.entries()) {
      const screenId = `unmount-${testCase.operation}-${testCase.outcome}-${index}`;
      const baseline = makeMountedScreen(screenId, `Unmount baseline ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const hydration = deferred<CustomScreenRecord | null>();
      const save = deferred<CustomScreenRecord>();
      if (testCase.operation === "hydrate") {
        queueScreenLoad(screenId, hydration.promise);
      } else {
        updateQueue.push(save.promise);
      }
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);
      let mounted = true;

      try {
        await flushMountedEditor();
        let savePayload: Parameters<typeof customScreensClient.updateCustomScreen>[1] | null = null;
        if (testCase.operation === "save") {
          await editScreenName(view.container, `Unmount save ${index}`);
          saveScreen(view.container);
          await flushMountedEditor();
          savePayload = updateSpy.mock.calls.at(-1)?.[1] ?? null;
          if (!savePayload) throw new Error("Unmount-save payload was not captured");
        }

        view.cleanup();
        mounted = false;
        const assistantCallsAfterUnmount = assistantSetSpy.mock.calls.length;
        const loadCallsAfterUnmount = loadSpy.mock.calls.length;

        if (testCase.operation === "hydrate") {
          if (testCase.outcome === "resolve") {
            await resolveDeferred(
              hydration,
              makeMountedScreen(screenId, `Late hydration ${index}`)
            );
          } else {
            await rejectDeferred(hydration, new Error(`Late hydration failure ${index}`));
          }
        } else if (testCase.outcome === "resolve") {
          await resolveDeferred(save, recordFromPayload(baseline, savePayload));
        } else {
          await rejectDeferred(save, new Error(`Late save failure ${index}`));
        }

        expect(assistantSetSpy.mock.calls.length).toBe(assistantCallsAfterUnmount);
        expect(loadSpy.mock.calls.length).toBe(loadCallsAfterUnmount);
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        if (mounted) view.cleanup();
        consoleError.mockRestore();
      }
    }
  });
});
