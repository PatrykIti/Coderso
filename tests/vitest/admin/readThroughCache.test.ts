import { expect, test } from "vitest";

import { createReadThroughCache } from "../../../core/admin/utils/readThroughCache";

test("readThroughCache returns cached value within TTL", async () => {
  let now = 10_000;
  let callCount = 0;

  const cache = createReadThroughCache({
    ttlMs: 1_000,
    now: () => now,
    load: async () => {
      callCount += 1;
      return { count: callCount };
    },
  });

  const first = await cache.get();
  now += 200;
  const second = await cache.get();

  expect(first).toEqual({ count: 1 });
  expect(second).toEqual({ count: 1 });
  expect(callCount).toBe(1);
});

test("readThroughCache dedupes in-flight requests", async () => {
  let resolveLoader: ((value: string) => void) | null = null;
  let callCount = 0;

  const cache = createReadThroughCache({
    ttlMs: 1_000,
    load: () => {
      callCount += 1;
      return new Promise<string>((resolve) => {
        resolveLoader = resolve;
      });
    },
  });

  const firstPromise = cache.get();
  const secondPromise = cache.get();
  expect(callCount).toBe(1);

  const finishLoad = resolveLoader as unknown as ((value: string) => void) | null;
  if (finishLoad) {
    finishLoad("ok");
  }

  const first = await firstPromise;
  const second = await secondPromise;

  expect(first).toBe("ok");
  expect(second).toBe("ok");
  expect(callCount).toBe(1);
});

test("readThroughCache force bypasses freshness", async () => {
  let callCount = 0;

  const cache = createReadThroughCache({
    ttlMs: 60_000,
    load: async () => {
      callCount += 1;
      return callCount;
    },
  });

  const first = await cache.get();
  const second = await cache.get({ force: true });

  expect(first).toBe(1);
  expect(second).toBe(2);
  expect(callCount).toBe(2);
});

test("readThroughCache invalidate clears cached value", async () => {
  let callCount = 0;

  const cache = createReadThroughCache({
    ttlMs: 60_000,
    load: async () => {
      callCount += 1;
      return { callCount };
    },
  });

  const first = await cache.get();
  cache.invalidate();
  const second = await cache.get();

  expect(first).toEqual({ callCount: 1 });
  expect(second).toEqual({ callCount: 2 });
  expect(cache.peek()).toEqual({ callCount: 2 });
});
