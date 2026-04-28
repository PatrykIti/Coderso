import { afterEach, expect, test, vi } from "vitest";

import {
  createMemoryBackedStorageCache,
  readStorageCache,
  writeStorageCache,
} from "../../../core/admin/utils/storageCache";

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

afterEach(() => {
  vi.useRealTimers();
});

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

test("memory-backed storage cache reuses fresh memory when storage is missing", () => {
  const storage = createStorage();
  const key = "cache:memory";
  const cache = createMemoryBackedStorageCache({
    key,
    ttlMs: 1000,
    validate: (value): value is { ok: boolean } =>
      Boolean(value && typeof value === "object" && "ok" in value),
    storage: () => storage,
  });

  cache.write({ ok: true });
  storage.removeItem(key);

  expect(cache.read()).toEqual({ ok: true });
});

test("memory-backed storage cache expires in-memory values", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-24T10:00:00.000Z"));

  const storage = createStorage();
  const cache = createMemoryBackedStorageCache({
    key: "cache:expired-memory",
    ttlMs: 1000,
    validate: (value): value is { ok: boolean } =>
      Boolean(value && typeof value === "object" && "ok" in value),
    storage: () => storage,
  });

  cache.write({ ok: true });
  vi.setSystemTime(new Date("2026-04-24T10:00:02.000Z"));

  expect(cache.read()).toBeNull();
});

test("memory-backed storage cache can read storage before memory for event consumers", () => {
  const storage = createStorage();
  const key = "cache:storage-first";
  const cache = createMemoryBackedStorageCache({
    key,
    ttlMs: 1000,
    validate: (value): value is { value: string } =>
      Boolean(value && typeof value === "object" && "value" in value),
    storage: () => storage,
  });

  cache.write({ value: "memory" });
  writeStorageCache(key, { value: "storage" }, storage);

  expect(cache.readStorageFirst()).toEqual({ value: "storage" });
});
