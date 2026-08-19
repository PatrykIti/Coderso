import React from "react";
import { createRoot } from "react-dom/client";
import { expect, vi } from "vitest";

import * as assistantSurface from "../../../../core/admin/ui/assistant/activeSurfaceContext";
import * as contentTypesClient from "../../../../core/admin/services/contentTypesClient";
import * as customScreensClient from "../../../../core/admin/services/customScreensClient";
import * as entriesClient from "../../../../core/admin/services/entriesClient";
import { cacheKeys } from "../../../../core/admin/services/cachePolicy";
import type { CustomScreenRecord } from "../../../../core/admin/services/customScreensEditorClient";
import type { CustomScreenDefinition } from "../../../../core/services/customScreens/customScreenSchemas";
import { CustomScreenEditorPage } from "../../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../../core/admin/ui/contexts/AdminRouterContext";
import {
  broadcastCacheEvent,
  type CacheEventOperationToken,
} from "../../../../core/admin/utils/cacheBus";

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  consumedBy: "screen-load" | "screen-create" | "screen-update" | null;
  assertOwningCall: (() => void) | null;
};

const buildMountedContentType = () => ({
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
  settleAfterRemoval,
}: {
  showEditor: boolean;
  broadcastAfterRemoval: boolean;
  settleAfterRemoval?: () => void;
}) {
  React.useLayoutEffect(() => {
    if (!showEditor) {
      if (broadcastAfterRemoval) {
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail("screen-1"),
          action: "update",
        });
      }
      settleAfterRemoval?.();
    }
  }, [broadcastAfterRemoval, settleAfterRemoval, showEditor]);

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

const mountLayoutRemovalRace = (path: string, settleAfterRemoval?: () => void) => {
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
            settleAfterRemoval={settleAfterRemoval}
          />
        </AdminRouterProvider>
      );
    });
  };
  render(true, false);
  return {
    container,
    removeEditor: (broadcastAfterRemoval = false) => render(false, broadcastAfterRemoval),
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

const assertDeferredOwningCall = <T,>(request: Deferred<T>) => {
  expect(request.assertOwningCall, "deferred promise must declare its owning call").not.toBeNull();
  request.assertOwningCall?.();
};

const resolveDeferred = async <T,>(request: Deferred<T>, value: T) => {
  assertDeferredOwningCall(request);
  await React.act(async () => {
    request.resolve(value);
    await request.promise;
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const rejectDeferred = async <T,>(request: Deferred<T>, error: unknown) => {
  assertDeferredOwningCall(request);
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

const emitRemoteScreenCacheEvent = (screenId: string) => {
  const event = {
    key: cacheKeys.customScreenDetail(screenId),
    action: "update" as const,
    sourceId: "remote-test-" + screenId,
    ts: Date.now(),
  };
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("coderso.admin.cache");
    channel.postMessage(event);
    channel.close();
    return;
  }
  React.act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "coderso.admin.cache.event",
        newValue: JSON.stringify(event),
      })
    );
  });
};

const emitLocalScreenCacheEvent = (screenId: string, operationToken?: CacheEventOperationToken) => {
  React.act(() => {
    broadcastCacheEvent(
      {
        key: cacheKeys.customScreenDetail(screenId),
        action: "update",
      },
      { operationToken }
    );
  });
};

const getAlertDescription = (container: ParentNode, title: string) => {
  const alert = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="alert"]')).find(
    (candidate) =>
      candidate.querySelector('[data-slot="alert-title"]')?.textContent?.trim() === title
  );
  return alert?.querySelector('[data-slot="alert-description"]')?.textContent?.trim() ?? null;
};

const getAlertMessage = (container: ParentNode, title: string) => {
  const alert = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="alert"]')).find(
    (candidate) =>
      candidate.querySelector('[data-slot="alert-title"]')?.textContent?.trim() === title
  );
  return (
    alert
      ?.querySelector<HTMLElement>('[data-slot="alert-description"] > span')
      ?.textContent?.trim() ?? null
  );
};

const currentPath = (container: ParentNode) =>
  container.querySelector("[data-current-path]")?.textContent ?? "";

export function createCustomScreenEditorPageHarness() {
  const mountedContentType = buildMountedContentType();
  const makeMountedScreen = (id: string, name = "Screen " + id): CustomScreenRecord => ({
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
              id: "section-" + id,
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
    capabilities: {
      mode: "editor",
      hasBlocks: true,
      hasBindings: false,
      hasReadableBindings: false,
      hasWritableBindings: false,
      supportsDedicatedPreview: true,
      supportsDedicatedEditor: true,
      bindingCounts: { total: 0, readable: 0, writable: 0 },
    },
    revision: 1,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  });

  const recordFromPayload = (
    base: CustomScreenRecord,
    payload: Parameters<typeof customScreensClient.updateCustomScreen>[1]
  ): CustomScreenRecord => {
    const { expectedRevision: _expectedRevision, ...rest } = payload;
    return {
      ...base,
      ...rest,
      definition: (payload.definition as CustomScreenDefinition | undefined) ?? base.definition,
      sidebarLabel: payload.sidebarLabel ?? null,
      // TASK-569: the server increments the revision on every definition save.
      revision: (base.revision ?? 0) + 1,
      updatedAt: "2026-07-14T01:00:00.000Z",
    };
  };

  const cachedScreens = new Map<string, CustomScreenRecord>();
  const remoteScreens = new Map<string, CustomScreenRecord>();
  const loadQueue: Array<{
    screenId: string;
    request: Promise<CustomScreenRecord | null>;
  }> = [];
  const createQueue: Array<Promise<CustomScreenRecord>> = [];
  const updateQueue: Array<Promise<CustomScreenRecord>> = [];
  let deferredByPromise = new WeakMap<Promise<unknown>, Deferred<unknown>>();
  let loadSpy: ReturnType<typeof vi.spyOn> | null = null;
  let createSpy: ReturnType<typeof vi.spyOn> | null = null;
  let updateSpy: ReturnType<typeof vi.spyOn> | null = null;
  let active = false;

  const markDeferredConsumed = (
    promise: Promise<unknown>,
    owner: Exclude<Deferred<unknown>["consumedBy"], null>
  ) => {
    const request = deferredByPromise.get(promise);
    if (request) request.consumedBy = owner;
  };

  const deferred = <T,>(): Deferred<T> => {
    let resolve!: Deferred<T>["resolve"];
    let reject!: Deferred<T>["reject"];
    const promise = new Promise<T>((nextResolve, nextReject) => {
      resolve = nextResolve;
      reject = nextReject;
    });
    const request: Deferred<T> = {
      promise,
      resolve,
      reject,
      consumedBy: null,
      assertOwningCall: null,
    };
    deferredByPromise.set(promise, request as Deferred<unknown>);
    return request;
  };

  const requireLoadSpy = () => {
    if (!loadSpy) throw new Error("Custom Screen editor harness is not set up");
    return loadSpy;
  };
  const requireCreateSpy = () => {
    if (!createSpy) throw new Error("Custom Screen editor harness is not set up");
    return createSpy;
  };
  const requireUpdateSpy = () => {
    if (!updateSpy) throw new Error("Custom Screen editor harness is not set up");
    return updateSpy;
  };

  const queueScreenLoad = (screenId: string, request: Deferred<CustomScreenRecord | null>) => {
    const spy = requireLoadSpy();
    const callIndex = spy.mock.calls.length;
    request.assertOwningCall = () => {
      expect(request.consumedBy).toBe("screen-load");
      expect(spy.mock.calls[callIndex]).toEqual([screenId, { force: true }]);
      expect(loadQueue.some((queued) => queued.request === request.promise)).toBe(false);
    };
    loadQueue.push({ screenId, request: request.promise });
  };

  const queueScreenCreate = (request: Deferred<CustomScreenRecord>) => {
    const spy = requireCreateSpy();
    const callIndex = spy.mock.calls.length;
    request.assertOwningCall = () => {
      expect(request.consumedBy).toBe("screen-create");
      expect(spy.mock.calls[callIndex]).toBeDefined();
      expect(createQueue.includes(request.promise)).toBe(false);
    };
    createQueue.push(request.promise);
  };

  const queueScreenUpdate = (request: Deferred<CustomScreenRecord>) => {
    const spy = requireUpdateSpy();
    const callIndex = spy.mock.calls.length;
    request.assertOwningCall = () => {
      expect(request.consumedBy).toBe("screen-update");
      expect(spy.mock.calls[callIndex]).toBeDefined();
      expect(updateQueue.includes(request.promise)).toBe(false);
    };
    updateQueue.push(request.promise);
  };

  const setup = () => {
    if (active) throw new Error("Custom Screen editor harness setup must be paired with cleanup");
    active = true;
    deferredByPromise = new WeakMap();
    cachedScreens.clear();
    remoteScreens.clear();
    loadQueue.length = 0;
    createQueue.length = 0;
    updateQueue.length = 0;

    const screenOne = makeMountedScreen("screen-1", "Screen one baseline");
    const screenTwo = makeMountedScreen("screen-2", "Screen two baseline");
    cachedScreens.set(screenOne.id, screenOne);
    cachedScreens.set(screenTwo.id, screenTwo);
    remoteScreens.set(screenOne.id, screenOne);
    remoteScreens.set(screenTwo.id, screenTwo);

    vi.spyOn(contentTypesClient, "getCachedContentTypes").mockReturnValue([mountedContentType]);
    vi.spyOn(contentTypesClient, "listContentTypesCached").mockResolvedValue([mountedContentType]);
    vi.spyOn(entriesClient, "getCachedEntries").mockReturnValue([]);
    vi.spyOn(entriesClient, "listEntriesCached").mockResolvedValue([]);

    const assistantSetSpy = vi
      .spyOn(assistantSurface, "setActiveAssistantSurfaceContext")
      .mockImplementation(() => undefined);
    const assistantClearSpy = vi
      .spyOn(assistantSurface, "clearActiveAssistantSurfaceContext")
      .mockImplementation(() => undefined);
    vi.spyOn(customScreensClient, "getCachedCustomScreen").mockImplementation(
      (id) => cachedScreens.get(id) ?? null
    );

    const nextLoadSpy = vi
      .spyOn(customScreensClient, "getCustomScreenRawCached")
      .mockImplementation(async (id) => {
        const queuedIndex = loadQueue.findIndex((queued) => queued.screenId === id);
        const queued = queuedIndex === -1 ? null : loadQueue.splice(queuedIndex, 1)[0];
        if (queued) markDeferredConsumed(queued.request, "screen-load");
        return queued ? await queued.request : (remoteScreens.get(id) ?? null);
      });
    const nextCreateSpy = vi
      .spyOn(customScreensClient, "createCustomScreen")
      .mockImplementation(async (payload, options) => {
        const queued = createQueue.shift();
        if (queued) markDeferredConsumed(queued, "screen-create");
        const created = queued
          ? await queued
          : recordFromPayload(makeMountedScreen("created-screen"), payload);
        cachedScreens.set(created.id, created);
        remoteScreens.set(created.id, created);
        const broadcastOptions = { operationToken: options?.cacheEventOperationToken };
        broadcastCacheEvent(
          { key: cacheKeys.customScreensList, action: "update" },
          broadcastOptions
        );
        broadcastCacheEvent(
          {
            key: cacheKeys.customScreenDetail(created.id),
            action: "update",
          },
          broadcastOptions
        );
        return created;
      });
    const nextUpdateSpy = vi
      .spyOn(customScreensClient, "updateCustomScreen")
      .mockImplementation(async (id, payload, options) => {
        const queued = updateQueue.shift();
        if (queued) markDeferredConsumed(queued, "screen-update");
        const updated = queued
          ? await queued
          : recordFromPayload(
              remoteScreens.get(id) ?? cachedScreens.get(id) ?? makeMountedScreen(id),
              payload
            );
        cachedScreens.set(updated.id, updated);
        remoteScreens.set(updated.id, updated);
        const broadcastOptions = { operationToken: options?.cacheEventOperationToken };
        broadcastCacheEvent(
          { key: cacheKeys.customScreensList, action: "update" },
          broadcastOptions
        );
        broadcastCacheEvent(
          {
            key: cacheKeys.customScreenDetail(updated.id),
            action: "update",
          },
          broadcastOptions
        );
        return updated;
      });

    loadSpy = nextLoadSpy;
    createSpy = nextCreateSpy;
    updateSpy = nextUpdateSpy;
    return {
      loadSpy: nextLoadSpy,
      createSpy: nextCreateSpy,
      updateSpy: nextUpdateSpy,
      assistantSetSpy,
      assistantClearSpy,
    };
  };

  const cleanup = () => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    cachedScreens.clear();
    remoteScreens.clear();
    loadQueue.length = 0;
    createQueue.length = 0;
    updateQueue.length = 0;
    deferredByPromise = new WeakMap();
    loadSpy = null;
    createSpy = null;
    updateSpy = null;
    active = false;
  };

  return {
    cachedScreens,
    remoteScreens,
    loadQueue,
    createQueue,
    updateQueue,
    queueScreenLoad,
    queueScreenCreate,
    queueScreenUpdate,
    mountedContentType,
    makeMountedScreen,
    recordFromPayload,
    mountEditor,
    mountLayoutRemovalRace,
    flushMountedEditor,
    deferred,
    assertDeferredOwningCall,
    resolveDeferred,
    rejectDeferred,
    clickElement,
    findButton,
    openScreenSettings,
    getScreenNameInput,
    editScreenName,
    chooseScreenContentType,
    saveScreen,
    emitRemoteScreenCacheEvent,
    emitLocalScreenCacheEvent,
    getAlertDescription,
    getAlertMessage,
    currentPath,
    setup,
    cleanup,
  };
}
