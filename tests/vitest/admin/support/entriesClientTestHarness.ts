import {
  clearAllEntriesCache,
  clearEntriesCache,
} from "../../../../core/admin/services/entriesClient";
import type {
  EntryDetail,
  EntryListItem,
  EntryStatus,
  EntrySummary,
} from "../../../../core/admin/services/entriesClient";

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

const installLocalStorage = () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return {
    restore: () => {
      if (original === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = original;
      }
    },
    storage,
  };
};

const resetCaches = (typeSlug: string) => {
  clearEntriesCache(typeSlug);
  clearAllEntriesCache();
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const entrySummary = (id: string, title = id, status: EntryStatus = "draft"): EntrySummary => ({
  id,
  typeId: "type-cache-authority",
  title,
  slug: id,
  status,
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
});

const entryDetail = (id: string, title = id, status: EntryStatus = "draft"): EntryDetail => ({
  ...entrySummary(id, title, status),
  taxonomy: null,
});

const allEntryItem = (id: string, title = id): EntryListItem => ({
  ...entrySummary(id, title),
  contentType: {
    id: "type-cache-authority",
    slug: "cache-authority",
    name: "Cache authority",
    status: "published",
  },
});

export {
  allEntryItem,
  createDeferred,
  createLocalStorage,
  entryDetail,
  entrySummary,
  installLocalStorage,
  jsonResponse,
  resetCaches,
};
