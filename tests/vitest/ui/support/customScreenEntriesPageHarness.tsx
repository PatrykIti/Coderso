// @vitest-environment happy-dom
//
// TASK-105-08-04: client harness for CustomScreenEntriesPage interactive
// flows (load/error, search/filters, selection, bulk actions, delete dialog,
// inline row commits, view switching, customize-view, cache events).

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, type MockInstance, vi } from "vitest";

import * as contentTypesClient from "../../../../core/admin/services/contentTypesClient";
import * as customScreensClient from "../../../../core/admin/services/customScreensClient";
import * as entriesClient from "../../../../core/admin/services/entriesClient";
import { cacheKeys } from "../../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../../core/admin/utils/cacheBus";
import type { CustomScreenSummaryRecord } from "../../../../core/services/customScreens/customScreenSummaryContract";
import type { EntrySummary } from "../../../../core/admin/services/entriesClient";
import type { ContentTypeSummary } from "../../../../core/admin/services/contentTypesClient";
import { CustomScreenEntriesPage } from "../../../../core/admin/ui/custom-screens/CustomScreenEntriesPage";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../../core/admin/ui/contexts/AdminRouterContext";

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

export const deferred = <T,>(): Deferred<T> => {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const buildMountedContentType = (): ContentTypeSummary => ({
  id: "type-projects",
  name: "Projects",
  slug: "projects",
  status: "published",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", title: "Title", xFieldType: "text" },
      headline: { type: "string", title: "Headline", xFieldType: "text" },
      price: { type: "number", title: "Price", xFieldType: "number" },
      featured: { type: "boolean", title: "Featured", xFieldType: "boolean" },
      status: { type: "string", title: "Status", xFieldType: "select" },
    },
  },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

const makeListColumn = (
  id: string,
  field: string,
  label: string,
  formatter: "text" | "number" | "boolean" | "select",
  source: "field" | "system" = "field"
) => ({
  id,
  source,
  field,
  label,
  formatter,
  visible: true,
});

export const buildScreen = (id: string, name: string): CustomScreenSummaryRecord => ({
  id,
  name,
  contentTypeId: buildMountedContentType().id,
  status: "active",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: name,
  schemaVersion: 4,
  definition: {
    schemaVersion: 4,
    listView: {
      columns: [
        makeListColumn("title", "title", "Record", "text", "system"),
        makeListColumn("headline", "headline", "Headline", "text"),
        makeListColumn("price", "price", "Price", "number"),
        makeListColumn("featured", "featured", "Featured", "boolean"),
      ],
      filters: [
        {
          id: "status-filter",
          source: "system",
          field: "status",
          label: "Status",
          operator: "eq",
          enabled: true,
        },
      ],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row-section",
              type: "section",
              data: { title: "Row" },
              blocks: [
                { id: "row-title", type: "field", data: { field: "title" } },
                { id: "row-headline", type: "field", data: { field: "headline" } },
                { id: "row-price", type: "field", data: { field: "price" } },
                { id: "row-featured", type: "field", data: { field: "featured" } },
              ],
            },
          ],
        },
        bindings: [
          {
            id: "b-title",
            blockId: "row-title",
            propPath: "value",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
          {
            id: "b-headline",
            blockId: "row-headline",
            propPath: "value",
            source: "entry",
            field: "headline",
            mode: "readwrite",
          },
          {
            id: "b-price",
            blockId: "row-price",
            propPath: "value",
            source: "entry",
            field: "price",
            mode: "readwrite",
          },
          {
            id: "b-featured",
            blockId: "row-featured",
            propPath: "value",
            source: "entry",
            field: "featured",
            mode: "readwrite",
          },
        ],
      },
    },
    editorView: {
      saveMode: "entry",
      interactionMode: "inline",
      document: {
        schemaVersion: 1,
        sections: [],
      },
      bindings: [],
    },
  },
  blocks: [],
  bindings: [],
  capabilities: {
    mode: "editor",
    hasBlocks: true,
    hasBindings: true,
    hasReadableBindings: true,
    hasWritableBindings: true,
    supportsDedicatedPreview: true,
    supportsDedicatedEditor: true,
    bindingCounts: { total: 4, readable: 4, writable: 4 },
  },
  revision: 1,
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

export const makeEntry = (id: string, overrides: Partial<EntrySummary> = {}): EntrySummary => ({
  id,
  typeId: buildMountedContentType().id,
  title: `Entry ${id}`,
  slug: `entry-${id}`,
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data: {
    headline: `Headline ${id}`,
    price: 100 + Number(id.replace(/\D/g, "") || 0),
    featured: false,
    status: "draft",
  },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
  ...overrides,
});

function RouterProbe() {
  const { navigate, path } = useAdminRouter();
  return (
    <div data-router-probe>
      <output data-current-path>{path}</output>
      <button
        type="button"
        data-navigate-workspace
        onClick={() => navigate("/advanced/custom-screens/screen-1/entries/new")}
      >
        New workspace
      </button>
    </div>
  );
}

const flushMountedPage = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const clickElement = (element: Element | null | undefined) => {
  expect(element, "expected element to exist").toBeTruthy();
  if (!element) throw new Error("expected element to exist");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const pointerClick = (element: Element | null | undefined) => {
  expect(element, "pointer click target missing").not.toBeNull();
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

export type EntriesPageHarness = {
  container: HTMLElement;
  cleanup: () => void;
};

export function createCustomScreenEntriesPageHarness() {
  const mountedContentType = buildMountedContentType();
  let cachedScreen: CustomScreenSummaryRecord | null = null;
  let remoteScreen: CustomScreenSummaryRecord | null = null;
  let cachedEntries: EntrySummary[] = [];
  let remoteEntries: EntrySummary[] = [];
  let loadQueue: Array<{
    screenId: string;
    request: Promise<CustomScreenSummaryRecord | null>;
  }> = [];
  let entriesLoadQueue: Array<{
    slug: string;
    request: Promise<EntrySummary[]>;
  }> = [];
  let contentTypesLoadQueue: Array<Promise<ContentTypeSummary[]>> = [];
  let screenReadSpy: MockInstance<typeof customScreensClient.getCustomScreenRawCached> | null =
    null;
  let entriesReadSpy: MockInstance<typeof entriesClient.listEntriesCached> | null = null;
  let deleteSpy: MockInstance<typeof entriesClient.deleteEntry> | null = null;
  let publishSpy: MockInstance<typeof entriesClient.publishEntry> | null = null;
  let unpublishSpy: MockInstance<typeof entriesClient.unpublishEntry> | null = null;
  let updateSpy: MockInstance<typeof entriesClient.updateEntry> | null = null;
  let active = false;

  const setup = () => {
    if (active) throw new Error("entries page harness setup must be paired with cleanup");
    active = true;
    cachedScreen = buildScreen("screen-1", "Projects");
    remoteScreen = buildScreen("screen-1", "Projects");
    cachedEntries = [
      makeEntry("1", { title: "Alpha", status: "draft" }),
      makeEntry("2", { title: "Beta", status: "published" }),
    ];
    remoteEntries = [...cachedEntries];
    loadQueue = [];
    entriesLoadQueue = [];
    contentTypesLoadQueue = [];

    vi.spyOn(contentTypesClient, "getCachedContentTypes").mockReturnValue([mountedContentType]);
    vi.spyOn(contentTypesClient, "listContentTypesCached").mockImplementation(async (options) => {
      if (!options?.force) return [mountedContentType];
      const queued = contentTypesLoadQueue.shift();
      return queued ? await queued : [mountedContentType];
    });
    vi.spyOn(customScreensClient, "getCachedCustomScreen").mockImplementation((id) =>
      id === cachedScreen?.id ? cachedScreen : null
    );
    screenReadSpy = vi
      .spyOn(customScreensClient, "getCustomScreenRawCached")
      .mockImplementation(async (id, options) => {
        if (!options?.force && id === cachedScreen?.id) return cachedScreen;
        const queuedIndex = loadQueue.findIndex((item) => item.screenId === id);
        const queued = queuedIndex === -1 ? null : loadQueue.splice(queuedIndex, 1)[0];
        if (queued) return await queued.request;
        return remoteScreen;
      });
    vi.spyOn(entriesClient, "getCachedEntries").mockImplementation((slug) =>
      slug === mountedContentType.slug ? cachedEntries : []
    );
    entriesReadSpy = vi
      .spyOn(entriesClient, "listEntriesCached")
      .mockImplementation(async (slug, options) => {
        if (!options?.force && slug === mountedContentType.slug) return cachedEntries;
        const queuedIndex = entriesLoadQueue.findIndex((item) => item.slug === slug);
        const queued = queuedIndex === -1 ? null : entriesLoadQueue.splice(queuedIndex, 1)[0];
        if (queued) return await queued.request;
        return remoteEntries;
      });

    deleteSpy = vi.spyOn(entriesClient, "deleteEntry").mockResolvedValue({ ok: true });
    publishSpy = vi.spyOn(entriesClient, "publishEntry").mockResolvedValue({ ok: true });
    unpublishSpy = vi.spyOn(entriesClient, "unpublishEntry").mockResolvedValue({ ok: true });
    updateSpy = vi
      .spyOn(entriesClient, "updateEntry")
      .mockImplementation(async (_slug, id, payload) => ({
        ...(cachedEntries.find((entry) => entry.id === id) ?? makeEntry(id)),
        ...payload,
        data: {
          ...(cachedEntries.find((entry) => entry.id === id)?.data ?? {}),
          ...("data" in payload ? (payload.data ?? {}) : {}),
        },
      }));
  };

  const requireDeleteSpy = () => {
    if (!deleteSpy) throw new Error("entries page harness is not set up");
    return deleteSpy;
  };
  const requireScreenReadSpy = () => {
    if (!screenReadSpy) throw new Error("entries page harness is not set up");
    return screenReadSpy;
  };
  const requireEntriesReadSpy = () => {
    if (!entriesReadSpy) throw new Error("entries page harness is not set up");
    return entriesReadSpy;
  };
  const requirePublishSpy = () => {
    if (!publishSpy) throw new Error("entries page harness is not set up");
    return publishSpy;
  };
  const requireUnpublishSpy = () => {
    if (!unpublishSpy) throw new Error("entries page harness is not set up");
    return unpublishSpy;
  };
  const requireUpdateSpy = () => {
    if (!updateSpy) throw new Error("entries page harness is not set up");
    return updateSpy;
  };

  const queueScreenLoad = (
    screenId: string,
    request: Deferred<CustomScreenSummaryRecord | null>
  ) => {
    loadQueue.push({ screenId, request: request.promise });
  };

  const queueEntriesLoad = (slug: string, request: Deferred<EntrySummary[]>) => {
    entriesLoadQueue.push({ slug, request: request.promise });
  };

  const queueContentTypesLoad = (request: Deferred<ContentTypeSummary[]>) => {
    contentTypesLoadQueue.push(request.promise);
  };

  const mount = (path: string): EntriesPageHarness => {
    window.history.replaceState({}, "", path);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    React.act(() => {
      root.render(
        <AdminRouterProvider initialPath={path}>
          <RouterProbe />
          <CustomScreenEntriesPage />
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

  const setCachedScreen = (screen: CustomScreenSummaryRecord | null) => {
    cachedScreen = screen;
  };
  const setRemoteScreen = (screen: CustomScreenSummaryRecord | null) => {
    remoteScreen = screen;
  };
  const setCachedEntries = (entries: EntrySummary[]) => {
    cachedEntries = entries;
  };
  const setRemoteEntries = (entries: EntrySummary[]) => {
    remoteEntries = entries;
  };
  const getCachedEntries = () => cachedEntries;

  const findButton = (root: ParentNode, text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === text
    ) ?? null;

  const findByText = (root: ParentNode, text: string) =>
    Array.from(root.querySelectorAll<HTMLElement>("*")).find(
      (node) => node.childElementCount === 0 && node.textContent?.trim() === text
    ) ?? null;

  const setInputValue = (input: HTMLInputElement | null, value: string) => {
    expect(input, "expected input to exist").not.toBeNull();
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

  const searchRecords = (container: ParentNode, value: string) => {
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search records"]');
    setInputValue(input, value);
  };

  const emitCacheEvent = (key: string) => {
    React.act(() => {
      broadcastCacheEvent({ key, action: "update" });
    });
  };

  const currentPath = (container: ParentNode) =>
    container.querySelector("[data-current-path]")?.textContent ?? "";

  const cleanup = () => {
    if (!active) return;
    active = false;
    vi.restoreAllMocks();
  };

  return {
    setup,
    cleanup,
    mount,
    flushMountedPage,
    findButton,
    findByText,
    searchRecords,
    emitCacheEvent,
    currentPath,
    clickElement,
    pointerClick,
    setInputValue,
    setCachedScreen,
    setRemoteScreen,
    setCachedEntries,
    setRemoteEntries,
    getCachedEntries,
    queueScreenLoad,
    queueEntriesLoad,
    queueContentTypesLoad,
    requireScreenReadSpy,
    requireEntriesReadSpy,
    requireDeleteSpy,
    requirePublishSpy,
    requireUnpublishSpy,
    requireUpdateSpy,
    deferred,
    buildScreen,
    makeEntry,
    mountedContentType,
    cacheKeys,
  };
}
