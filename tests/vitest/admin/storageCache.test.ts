import { afterEach, expect, test, vi } from "vitest";

import {
  clearLocalCache,
  clearSessionCache,
  createMemoryBackedLocalCache,
  createMemoryBackedStorageCache,
  readLocalCache,
  readSessionCache,
  readStorageCache,
  writeLocalCache,
  writeSessionCache,
  writeStorageCache,
} from "../../../core/admin/utils/storageCache";

type StorageEntry = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

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
  storage.setItem(key, JSON.stringify({ value: { ok: true }, savedAt: Date.now() - 10_000 }));
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

test("session cache helpers no-op when sessionStorage is unavailable", () => {
  const original = (globalThis as { sessionStorage?: unknown }).sessionStorage;
  if (original !== undefined) {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  }

  try {
    expect(readSessionCache("cache:s", 1000, (value): value is { ok: boolean } => true)).toBeNull();
    expect(() => writeSessionCache("cache:s", { ok: true })).not.toThrow();
    expect(() => clearSessionCache("cache:s")).not.toThrow();
  } finally {
    if (original !== undefined) {
      (globalThis as { sessionStorage?: unknown }).sessionStorage = original;
    }
  }
});

test("session cache round-trips through sessionStorage", () => {
  const original = (globalThis as { sessionStorage?: unknown }).sessionStorage;
  const storage = createStorage();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = storage as unknown;

  try {
    writeSessionCache("cache:s", { ok: true });
    expect(
      readSessionCache("cache:s", 1000, (value): value is { ok: boolean } =>
        Boolean(value && typeof value === "object")
      )
    ).toEqual({ ok: true });

    clearSessionCache("cache:s");
    expect(
      readSessionCache("cache:s", 1000, (value): value is { ok: boolean } =>
        Boolean(value && typeof value === "object")
      )
    ).toBeNull();
  } finally {
    if (original === undefined) {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    } else {
      (globalThis as { sessionStorage?: unknown }).sessionStorage = original;
    }
  }
});

test("storage cache drops malformed and unvalidated envelopes", () => {
  const storage = createStorage();
  const key = "cache:malformed";
  const validate = (value: unknown): value is { ok: boolean } =>
    Boolean(value && typeof value === "object" && "ok" in value);

  // Non-JSON text: JSON.parse throws and the entry is removed.
  storage.setItem(key, "not-json{{");
  expect(readStorageCache(key, 1000, validate, storage)).toBeNull();
  expect(storage.getItem(key)).toBeNull();

  // JSON "null": not an envelope, removed.
  storage.setItem(key, "null");
  expect(readStorageCache(key, 1000, validate, storage)).toBeNull();
  expect(storage.getItem(key)).toBeNull();

  // JSON array: truthy but missing a numeric savedAt, removed.
  storage.setItem(key, JSON.stringify([1, 2, 3]));
  expect(readStorageCache(key, 1000, validate, storage)).toBeNull();
  expect(storage.getItem(key)).toBeNull();

  // Envelope with a non-numeric savedAt, removed.
  storage.setItem(key, JSON.stringify({ value: { ok: true }, savedAt: "soon" }));
  expect(readStorageCache(key, 1000, validate, storage)).toBeNull();
  expect(storage.getItem(key)).toBeNull();

  // Envelope whose value fails validation, removed.
  storage.setItem(key, JSON.stringify({ value: { nope: 1 }, savedAt: Date.now() }));
  expect(readStorageCache(key, 1000, validate, storage)).toBeNull();
  expect(storage.getItem(key)).toBeNull();
});

test("local cache helpers round-trip through localStorage", () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    writeLocalCache("cache:l", { ok: true });
    expect(
      readLocalCache("cache:l", 1000, (value): value is { ok: boolean } =>
        Boolean(value && typeof value === "object")
      )
    ).toEqual({ ok: true });

    clearLocalCache("cache:l");
    expect(
      readLocalCache("cache:l", 1000, (value): value is { ok: boolean } =>
        Boolean(value && typeof value === "object")
      )
    ).toBeNull();

    const cache = createMemoryBackedLocalCache({
      key: "cache:ml",
      ttlMs: 1000,
      validate: (value): value is { ok: boolean } =>
        Boolean(value && typeof value === "object" && "ok" in value),
    });
    cache.write({ ok: true });
    expect(cache.read()).toEqual({ ok: true });
    cache.clear();
    expect(cache.read()).toBeNull();
  } finally {
    if (original === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  }
});

test("local cache helpers no-op when localStorage is unavailable", () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  if (original !== undefined) {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }

  try {
    expect(readLocalCache("cache:l", 1000, (value): value is { ok: boolean } => true)).toBeNull();
    expect(() => writeLocalCache("cache:l", { ok: true })).not.toThrow();
    expect(() => clearLocalCache("cache:l")).not.toThrow();
  } finally {
    if (original !== undefined) {
      (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  }
});
