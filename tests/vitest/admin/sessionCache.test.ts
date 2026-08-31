import { afterEach, expect, test, vi } from "vitest";

import {
  clearSessionCache,
  readSessionCache,
  writeSessionCache,
} from "../../../core/admin/utils/sessionCache";

const createSessionStorage = () => {
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

const setSessionStorage = (value?: unknown) => {
  if (value === undefined) {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    return;
  }

  (globalThis as { sessionStorage?: unknown }).sessionStorage = value;
};

afterEach(() => {
  vi.useRealTimers();
  setSessionStorage();
});

test("readSessionCache returns null when sessionStorage is unavailable", () => {
  expect(
    readSessionCache("missing", 1_000, (value): value is string => typeof value === "string")
  ).toBeNull();
});

test("readSessionCache removes invalid, expired, and failed-validation entries", () => {
  const storage = createSessionStorage();
  setSessionStorage(storage as unknown);

  storage.setItem("broken", "{");
  expect(
    readSessionCache("broken", 1_000, (value): value is string => typeof value === "string")
  ).toBeNull();
  expect(storage.getItem("broken")).toBeNull();

  storage.setItem("expired", JSON.stringify({ value: "cached", savedAt: Date.now() - 5_000 }));
  expect(
    readSessionCache("expired", 1_000, (value): value is string => typeof value === "string")
  ).toBeNull();
  expect(storage.getItem("expired")).toBeNull();

  storage.setItem("invalid", JSON.stringify({ value: 42, savedAt: Date.now() }));
  expect(
    readSessionCache("invalid", 1_000, (value): value is string => typeof value === "string")
  ).toBeNull();
  expect(storage.getItem("invalid")).toBeNull();
});

test("readSessionCache returns the cached value for a valid entry", () => {
  const storage = createSessionStorage();
  setSessionStorage(storage as unknown);

  storage.setItem("valid", JSON.stringify({ value: { id: "entry-1" }, savedAt: Date.now() }));

  const result = readSessionCache(
    "valid",
    1_000,
    (value): value is { id: string } =>
      typeof value === "object" && value !== null && "id" in value && typeof value.id === "string"
  );

  expect(result).toEqual({ id: "entry-1" });
});

test("writeSessionCache persists the value envelope and clearSessionCache removes it", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

  const storage = createSessionStorage();
  setSessionStorage(storage as unknown);

  writeSessionCache("entry", { ok: true });

  expect(JSON.parse(String(storage.getItem("entry")))).toEqual({
    value: { ok: true },
    savedAt: new Date("2026-03-06T12:00:00.000Z").getTime(),
  });

  clearSessionCache("entry");
  expect(storage.getItem("entry")).toBeNull();
});

test("readSessionCache evicts malformed envelopes", () => {
  const storage = createSessionStorage();
  setSessionStorage(storage);
  storage.setItem("bad-null", JSON.stringify(null));
  storage.setItem("bad-shape", JSON.stringify({ value: "x" }));

  const validate = (value: unknown): value is string => typeof value === "string";
  expect(readSessionCache("bad-null", 1_000, validate)).toBeNull();
  expect(readSessionCache("bad-shape", 1_000, validate)).toBeNull();
  expect(storage.getItem("bad-null")).toBeNull();
  expect(storage.getItem("bad-shape")).toBeNull();
});
