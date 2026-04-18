import { expect, test } from "vitest";

import {
  broadcastCacheEvent,
  subscribeCacheEvents,
} from "../../../core/admin/utils/cacheBus";

type StorageEntry = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  data?: Map<string, string>;
};

const createLocalStorage = (): StorageEntry => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    data: store,
  };
};

test("broadcastCacheEvent writes to localStorage when BroadcastChannel is unavailable", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown })
    .BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    broadcastCacheEvent({ key: "pages:list", action: "update" });
    const stored = storage.data?.get("nextless.admin.cache.event");
    expect(stored).toBeTruthy();
  } finally {
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("broadcastCacheEvent notifies same-tab subscribers", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown })
    .BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  const events: Array<{ key: string; action: string }> = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action });
  });

  try {
    broadcastCacheEvent({ key: "pages:list", action: "update" });
    expect(events).toEqual([{ key: "pages:list", action: "update" }]);
  } finally {
    unsubscribe?.();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("subscribeCacheEvents handles storage events", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown })
    .BroadcastChannel;
  const originalWindow = (globalThis as { window?: unknown }).window;

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;

  const listeners: Array<(event: StorageEvent) => void> = [];
  const windowStub = {
    addEventListener: (_type: string, cb: (event: StorageEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_type: string, cb: (event: StorageEvent) => void) => {
      const index = listeners.indexOf(cb);
      if (index >= 0) listeners.splice(index, 1);
    },
  };

  (globalThis as { window?: unknown }).window = windowStub as unknown;

  let calls = 0;
  const unsubscribe = subscribeCacheEvents(() => {
    calls += 1;
  });

  try {
    const payload = JSON.stringify({
      key: "pages:list",
      action: "update",
      sourceId: "other-tab",
      ts: Date.now(),
    });
    listeners.forEach((listener) =>
      listener({
        key: "nextless.admin.cache.event",
        newValue: payload,
      } as StorageEvent)
    );
    expect(calls).toBe(1);
  } finally {
    unsubscribe?.();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        originalBroadcast;
    }
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  }
});
