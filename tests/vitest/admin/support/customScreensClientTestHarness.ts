import type { CustomScreenSummaryRecord } from "../../../../core/admin/services/customScreensClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const makeScreen = (
  overrides: Partial<CustomScreenSummaryRecord> = {}
): CustomScreenSummaryRecord => ({
  id: "screen-1",
  name: "Catalog screen",
  contentTypeId: "ct-1",
  status: "draft",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 1,
  blocks: [],
  bindings: [],
  createdAt: "2026-03-05T00:00:00.000Z",
  updatedAt: "2026-03-05T00:00:00.000Z",
  ...overrides,
});

const transportOverride = (overrides: Record<string, unknown> = {}) => ({
  screenId: "screen-1",
  entryId: "entry-1",
  blockId: "field-1",
  propPath: "textSize",
  value: "xl",
  updatedBy: null,
  createdAt: "2026-06-25T00:00:00.000Z",
  updatedAt: "2026-06-25T00:00:00.000Z",
  ...overrides,
});

type ClientCleanupDependencies = Readonly<{
  clearCustomScreensCache: () => void;
  invalidateScreenEntryOverrides: (screenId: string, entryId: string) => void;
  restoreRealTimers: () => void;
}>;

const resetCustomScreensClientTestState = ({
  clearCustomScreensCache,
  invalidateScreenEntryOverrides,
  restoreRealTimers,
}: ClientCleanupDependencies) => {
  clearCustomScreensCache();
  invalidateScreenEntryOverrides("screen-1", "entry-1");
  restoreRealTimers();
};

export {
  createLocalStorage,
  deferred,
  jsonResponse,
  makeScreen,
  resetCustomScreensClientTestState,
  transportOverride,
};
