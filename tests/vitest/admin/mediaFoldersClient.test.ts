import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mockApiRequest = vi.fn();
const mockBroadcastCacheEvent = vi.fn();

vi.mock("../../../core/admin/services/apiClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

vi.mock("../../../core/admin/utils/cacheBus", () => ({
  broadcastCacheEvent: (...args: unknown[]) => mockBroadcastCacheEvent(...args),
}));

import {
  clearMediaFoldersCache,
  createMediaFolder,
  deleteMediaFolder,
  getCachedMediaFolders,
  getCachedMediaFoldersForEvent,
  listMediaFolders,
  listMediaFoldersCached,
  MediaFoldersResponseError,
  reorderMediaFolders,
  updateMediaFolder,
  type MediaFolder,
  type MediaFolderOrder,
} from "../../../core/admin/services/mediaFoldersClient";

const folder: MediaFolder = {
  id: "folder-1",
  name: "Brand",
  slug: "brand",
  parentId: null,
  orderIndex: 0,
  createdAt: "2026-04-23T00:00:00.000Z",
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const canonicalFolder = (overrides: Partial<MediaFolder> = {}): MediaFolder => ({
  ...folder,
  ...overrides,
});

const createStorage = () => {
  const values = new Map<string, string>();
  const setCalls: Array<readonly [string, string]> = [];
  return {
    values,
    setCalls,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      setCalls.push([key, value]);
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
let storage = createStorage();

const installStorage = () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
    writable: true,
  });
};

const restoreStorage = () => {
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorageDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
};

const readStoredFolders = () => {
  const raw = storage.getItem("media:folders");
  return raw ? (JSON.parse(raw) as { value: unknown; savedAt: number }) : null;
};

const expectInvalidResponse = async (request: Promise<unknown>) => {
  let caught: unknown;
  try {
    await request;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(MediaFoldersResponseError);
  expect(caught).toMatchObject({
    code: "media_folders_response_invalid",
    message: "Invalid media folders response",
    name: "MediaFoldersResponseError",
  });
};

const mutationCases = [
  {
    name: "create",
    response: canonicalFolder({ id: "created" }),
    run: () => createMediaFolder({ name: "Created" }),
    events: [{ key: "media:folders", action: "update" }],
  },
  {
    name: "update",
    response: canonicalFolder({ name: "Updated" }),
    run: () => updateMediaFolder("folder-1", { name: "Updated" }),
    events: [{ key: "media:folders", action: "update" }],
  },
  {
    name: "reorder",
    response: { ok: true },
    run: () => reorderMediaFolders([{ id: "folder-1", orderIndex: 1 }]),
    events: [{ key: "media:folders", action: "update" }],
  },
  {
    name: "delete",
    response: { ok: true },
    run: () => deleteMediaFolder("folder-1"),
    events: [
      { key: "media:folders", action: "update" },
      { key: "media:list", action: "update" },
    ],
  },
] as const;

const primeFolderCacheForMutation = async () => {
  mockApiRequest.mockResolvedValueOnce([canonicalFolder()]);
  await listMediaFoldersCached();
  expect(getCachedMediaFolders()).toEqual([canonicalFolder()]);
  mockApiRequest.mockReset();
  mockBroadcastCacheEvent.mockReset();
};

beforeEach(() => {
  storage = createStorage();
  installStorage();
  mockApiRequest.mockReset();
  mockBroadcastCacheEvent.mockReset();
  clearMediaFoldersCache();
});

afterEach(() => {
  clearMediaFoldersCache();
  restoreStorage();
});

test("listMediaFolders GETs /media/folders (no CSRF)", async () => {
  mockApiRequest.mockResolvedValue([folder]);
  const result = await listMediaFolders();
  expect(result).toEqual([folder]);
  const [path, init] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders");
  expect((init as { method: string }).method).toBe("GET");
});

test("cached folder reads dedupe, canonically project transport rows, persist once, and reuse cache", async () => {
  let unknownGetterCalls = 0;
  const transportRow = Object.assign(
    Object.create(null) as Record<PropertyKey, unknown>,
    canonicalFolder(),
    { createdBy: "backend-user" }
  );
  Object.defineProperty(transportRow, "futureField", {
    enumerable: true,
    get: () => {
      unknownGetterCalls += 1;
      return "not-for-the-browser";
    },
  });
  const pending = deferred<unknown>();
  mockApiRequest.mockReturnValueOnce(pending.promise);

  const first = listMediaFoldersCached();
  const concurrent = listMediaFoldersCached();
  expect(mockApiRequest).toHaveBeenCalledTimes(1);
  pending.resolve([transportRow]);

  const [firstRows, concurrentRows] = await Promise.all([first, concurrent]);
  const expected = [canonicalFolder()];
  expect(firstRows).toEqual(expected);
  expect(concurrentRows).toEqual(expected);
  expect(Reflect.ownKeys(firstRows[0])).toEqual([
    "id",
    "name",
    "slug",
    "parentId",
    "orderIndex",
    "createdAt",
  ]);
  expect(unknownGetterCalls).toBe(0);

  const stored = readStoredFolders();
  expect(stored?.value).toEqual(expected);
  expect(storage.setCalls).toHaveLength(1);
  expect(storage.setCalls[0]?.[0]).toBe("media:folders");
  expect(Reflect.ownKeys((stored?.value as MediaFolder[])[0])).toEqual(
    Reflect.ownKeys(expected[0])
  );
  expect(await listMediaFoldersCached()).toEqual(expected);
  expect(mockApiRequest).toHaveBeenCalledTimes(1);
});

test("a rejected cached request propagates unchanged and the next call retries", async () => {
  const original = new Error("network unavailable");
  mockApiRequest.mockRejectedValueOnce(original).mockResolvedValueOnce([canonicalFolder()]);

  await expect(listMediaFoldersCached()).rejects.toBe(original);
  expect(getCachedMediaFolders()).toBeNull();
  expect(storage.getItem("media:folders")).toBeNull();

  await expect(listMediaFoldersCached()).resolves.toEqual([canonicalFolder()]);
  expect(mockApiRequest).toHaveBeenCalledTimes(2);
});

test("an older request cannot prime cache or clear a newer forced request", async () => {
  const oldRequest = deferred<unknown>();
  const forcedRequest = deferred<unknown>();
  mockApiRequest.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(forcedRequest.promise);

  const oldCaller = listMediaFoldersCached();
  const forcedCaller = listMediaFoldersCached({ force: true });
  oldRequest.resolve([canonicalFolder({ id: "old", slug: "old", name: "Old" })]);
  await expect(oldCaller).resolves.toEqual([
    canonicalFolder({ id: "old", slug: "old", name: "Old" }),
  ]);
  expect(getCachedMediaFolders()).toBeNull();

  const joinsForcedRequest = listMediaFoldersCached();
  expect(mockApiRequest).toHaveBeenCalledTimes(2);
  forcedRequest.resolve([canonicalFolder({ id: "new", slug: "new", name: "New" })]);
  const expected = [canonicalFolder({ id: "new", slug: "new", name: "New" })];
  await expect(forcedCaller).resolves.toEqual(expected);
  await expect(joinsForcedRequest).resolves.toEqual(expected);
  expect(getCachedMediaFolders()).toEqual(expected);
});

test("clear invalidates an older completion without letting it clear or overwrite the replacement", async () => {
  const staleRequest = deferred<unknown>();
  const replacementRequest = deferred<unknown>();
  mockApiRequest
    .mockReturnValueOnce(staleRequest.promise)
    .mockReturnValueOnce(replacementRequest.promise);

  const staleCaller = listMediaFoldersCached();
  clearMediaFoldersCache();
  const replacementCaller = listMediaFoldersCached();
  staleRequest.resolve([canonicalFolder({ id: "stale", slug: "stale", name: "Stale" })]);
  await staleCaller;
  expect(getCachedMediaFolders()).toBeNull();

  const joinsReplacement = listMediaFoldersCached();
  expect(mockApiRequest).toHaveBeenCalledTimes(2);
  replacementRequest.resolve([
    canonicalFolder({ id: "replacement", slug: "replacement", name: "Replacement" }),
  ]);
  const expected = [
    canonicalFolder({ id: "replacement", slug: "replacement", name: "Replacement" }),
  ];
  await expect(replacementCaller).resolves.toEqual(expected);
  await expect(joinsReplacement).resolves.toEqual(expected);
  expect(getCachedMediaFolders()).toEqual(expected);
});

test("malformed network arrays and rows reject with the stable typed error without invoking getters", async () => {
  let getterCalls = 0;
  const requiredAccessor = canonicalFolder() as Record<PropertyKey, unknown>;
  Object.defineProperty(requiredAccessor, "name", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return "Accessor name";
    },
  });

  const indexAccessor: unknown[] = [];
  Object.defineProperty(indexAccessor, "0", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return canonicalFolder();
    },
  });

  const throwingRowProxy = new Proxy(canonicalFolder(), {
    getOwnPropertyDescriptor: () => {
      throw new Error("row descriptor trap");
    },
  });
  const throwingArrayProxy = new Proxy([canonicalFolder()], {
    getOwnPropertyDescriptor: (target, key) => {
      if (key === "0") throw new Error("array descriptor trap");
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const revokedRow = Proxy.revocable(canonicalFolder(), {});
  revokedRow.revoke();
  const missingCreatedAt: Partial<MediaFolder> = canonicalFolder();
  delete missingCreatedAt.createdAt;

  const malformed: unknown[] = [
    null,
    {},
    new Array(1),
    [missingCreatedAt],
    [{ ...canonicalFolder(), name: undefined }],
    [{ ...canonicalFolder(), parentId: 1 }],
    [{ ...canonicalFolder(), orderIndex: -1 }],
    [{ ...canonicalFolder(), orderIndex: 1.5 }],
    [Object.assign(Object.create({ inherited: true }), canonicalFolder())],
    [requiredAccessor],
    [throwingRowProxy],
    [revokedRow.proxy],
    indexAccessor,
    throwingArrayProxy,
  ];

  for (const payload of malformed) {
    clearMediaFoldersCache();
    mockApiRequest.mockResolvedValueOnce(payload);
    await expectInvalidResponse(listMediaFoldersCached());
    expect(getCachedMediaFolders()).toBeNull();
    expect(storage.getItem("media:folders")).toBeNull();
  }
  expect(getterCalls).toBe(0);
});

test("persisted cache accepts only exact canonical rows and evicts malformed envelopes", async () => {
  const canonical = canonicalFolder();
  storage.setItem("media:folders", JSON.stringify({ value: [canonical], savedAt: Date.now() }));
  await expect(listMediaFoldersCached()).resolves.toEqual([canonical]);
  expect(mockApiRequest).not.toHaveBeenCalled();

  const invalidValues: unknown[] = [
    [{ ...canonical, createdBy: "backend-user" }],
    [{ ...canonical, createdAt: undefined }],
    [{ ...canonical, orderIndex: -1 }],
    [null],
  ];
  for (let index = 0; index < invalidValues.length; index += 1) {
    clearMediaFoldersCache();
    storage.setItem(
      "media:folders",
      JSON.stringify({ value: invalidValues[index], savedAt: Date.now() })
    );
    expect(getCachedMediaFoldersForEvent()).toBeNull();
    expect(storage.getItem("media:folders")).toBeNull();

    const networkRow = canonicalFolder({
      id: `network-${index}`,
      name: `Network ${index}`,
      slug: `network-${index}`,
    });
    mockApiRequest.mockResolvedValueOnce([networkRow]);
    await expect(listMediaFoldersCached()).resolves.toEqual([networkRow]);
  }
  expect(mockApiRequest).toHaveBeenCalledTimes(invalidValues.length);
});

test("createMediaFolder POSTs with CSRF", async () => {
  mockApiRequest.mockResolvedValue(folder);
  await createMediaFolder({ name: "Brand" });
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders");
  expect((init as { method: string }).method).toBe("POST");
  expect(JSON.parse((init as { body: string }).body)).toEqual({ name: "Brand" });
  expect(opts).toEqual({ withCsrf: true });
  expect(mockBroadcastCacheEvent).toHaveBeenCalledWith({
    key: "media:folders",
    action: "update",
  });
});

test("updateMediaFolder PATCHes the folder id with CSRF", async () => {
  mockApiRequest.mockResolvedValue(folder);
  await updateMediaFolder("folder-1", { name: "Renamed" });
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders/folder-1");
  expect((init as { method: string }).method).toBe("PATCH");
  expect(JSON.parse((init as { body: string }).body)).toEqual({ name: "Renamed" });
  expect(opts).toEqual({ withCsrf: true });
  expect(mockBroadcastCacheEvent).toHaveBeenCalledWith({
    key: "media:folders",
    action: "update",
  });
});

test("reorderMediaFolders serializes to the { orders } wrapper (never a bare array)", async () => {
  mockApiRequest.mockResolvedValue({ ok: true });
  const orders: MediaFolderOrder[] = [
    { id: "a", orderIndex: 0 },
    { id: "b", orderIndex: 1, parentId: "a" },
  ];
  await reorderMediaFolders(orders);
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders/reorder");
  expect((init as { method: string }).method).toBe("POST");
  const parsed = JSON.parse((init as { body: string }).body);
  expect(parsed).toEqual({ orders });
  expect(Array.isArray(parsed)).toBe(false);
  expect(opts).toEqual({ withCsrf: true });
  expect(mockBroadcastCacheEvent).toHaveBeenCalledWith({
    key: "media:folders",
    action: "update",
  });
});

test("deleteMediaFolder DELETEs the folder id with CSRF", async () => {
  mockApiRequest.mockResolvedValue({ ok: true });
  await deleteMediaFolder("folder-1");
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders/folder-1");
  expect((init as { method: string }).method).toBe("DELETE");
  expect(opts).toEqual({ withCsrf: true });
  expect(mockBroadcastCacheEvent).toHaveBeenCalledWith({
    key: "media:folders",
    action: "update",
  });
  expect(mockBroadcastCacheEvent).toHaveBeenCalledWith({
    key: "media:list",
    action: "update",
  });
});

test.each(mutationCases)(
  "$name success evicts a primed cache and broadcasts only the exact ordered events",
  async ({ response, run, events }) => {
    await primeFolderCacheForMutation();
    mockApiRequest.mockResolvedValueOnce(response);

    await run();

    expect(getCachedMediaFolders()).toBeNull();
    expect(mockBroadcastCacheEvent.mock.calls.map(([event]) => event)).toEqual(events);
    expect(mockBroadcastCacheEvent).toHaveBeenCalledTimes(events.length);
  }
);

test.each(mutationCases)(
  "$name failure preserves the primed cache, original error identity, and zero broadcasts",
  async ({ name, run }) => {
    await primeFolderCacheForMutation();
    const original = new Error(`${name} failed`);
    mockApiRequest.mockRejectedValueOnce(original);

    await expect(run()).rejects.toBe(original);

    expect(getCachedMediaFolders()).toEqual([canonicalFolder()]);
    expect(mockBroadcastCacheEvent).not.toHaveBeenCalled();
  }
);

test("createMediaFolder encodes the folder id path segment on update/delete", async () => {
  mockApiRequest.mockResolvedValue(folder);
  await updateMediaFolder("a/b", { name: "x" });
  expect(mockApiRequest.mock.calls[0][0]).toBe("/media/folders/a%2Fb");
});
