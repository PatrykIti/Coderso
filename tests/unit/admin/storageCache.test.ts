import { expect, test } from "bun:test";

import { readStorageCache, writeStorageCache } from "../../../core/admin/utils/storageCache";

type StorageEntry = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void };

const createStorage = (): StorageEntry => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};

test("storage cache writes and reads values", () => {
  const storage = createStorage();
  const key = "cache:key";
  writeStorageCache(key, { ok: true }, storage);
  const result = readStorageCache(
    key,
    1000,
    (value): value is { ok: boolean } => Boolean(value && typeof value === "object"),
    storage
  );
  expect(result).toEqual({ ok: true });
});

test("storage cache expires and clears stale values", () => {
  const storage = createStorage();
  const key = "cache:stale";
  storage.setItem(
    key,
    JSON.stringify({ value: { ok: true }, savedAt: Date.now() - 10_000 })
  );
  const result = readStorageCache(
    key,
    1000,
    (value): value is { ok: boolean } => Boolean(value && typeof value === "object"),
    storage
  );
  expect(result).toBeNull();
  expect(storage.getItem(key)).toBeNull();
});
