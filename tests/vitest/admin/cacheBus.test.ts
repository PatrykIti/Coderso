import { expect, test } from "vitest";

import {
  broadcastCacheEvent,
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
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
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    broadcastCacheEvent(
      { key: "pages:list", action: "update" },
      { operationToken: createCacheEventOperationToken() }
    );
    const stored = storage.data?.get("coderso.admin.cache.event");
    const legacyStored = storage.data?.get("nextless.admin.cache.event");
    expect(stored).toBeTruthy();
    expect(legacyStored).toBe(stored);
    expect(Object.keys(JSON.parse(stored ?? "{}")).sort()).toEqual([
      "action",
      "key",
      "sourceId",
      "ts",
    ]);
    expect(JSON.parse(stored ?? "{}")).not.toHaveProperty("origin");
    expect(JSON.parse(stored ?? "{}")).not.toHaveProperty("operationToken");
  } finally {
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("broadcastCacheEvent keeps operation tokens out of canonical and legacy channel payloads", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;

  class BroadcastChannelStub {
    static instances: BroadcastChannelStub[] = [];

    readonly listeners = new Set<(event: MessageEvent) => void>();
    readonly messages: unknown[] = [];

    constructor(readonly name: string) {
      BroadcastChannelStub.instances.push(this);
    }

    postMessage(message: unknown) {
      this.messages.push(message);
    }

    addEventListener(_type: "message", listener: (event: MessageEvent) => void) {
      this.listeners.add(listener);
    }

    removeEventListener(_type: "message", listener: (event: MessageEvent) => void) {
      this.listeners.delete(listener);
    }

    close() {}
  }

  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = BroadcastChannelStub as unknown;
  const unsubscribe = subscribeCacheEvents(() => {});

  try {
    broadcastCacheEvent(
      { key: "pages:list", action: "update" },
      { operationToken: createCacheEventOperationToken() }
    );

    const outgoing = BroadcastChannelStub.instances.filter(
      (instance) => instance.messages.length > 0
    );
    expect(outgoing.map(({ name }) => name).sort()).toEqual([
      "coderso.admin.cache",
      "nextless.admin.cache",
    ]);
    for (const channel of outgoing) {
      expect(channel.messages).toHaveLength(1);
      const payload = channel.messages[0] as Record<string, unknown>;
      expect(Object.keys(payload).sort()).toEqual(["action", "key", "sourceId", "ts"]);
      expect(payload).not.toHaveProperty("origin");
      expect(payload).not.toHaveProperty("operationToken");
    }
  } finally {
    unsubscribe();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
  }
});

test("createCacheEventOperationToken returns a unique symbol for every operation", () => {
  const first = createCacheEventOperationToken();
  const second = createCacheEventOperationToken();

  expect(typeof first).toBe("symbol");
  expect(typeof second).toBe("symbol");
  expect(first).not.toBe(second);
});

test("broadcastCacheEvent delivers the exact operation token only to same-context subscribers", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const operationToken = createCacheEventOperationToken();
  const deliveries: Array<{
    origin: CacheEventOrigin;
    operationToken?: CacheEventOperationToken;
  }> = [];

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const unsubscribe = subscribeCacheEvents((_event, origin, deliveredToken) => {
    deliveries.push({ origin, operationToken: deliveredToken });
  });

  try {
    broadcastCacheEvent({ key: "pages:list", action: "update" }, { operationToken });
    expect(deliveries).toEqual([{ origin: "local", operationToken }]);
  } finally {
    unsubscribe();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("broadcastCacheEvent notifies same-tab subscribers", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  const events: Array<{ key: string; action: string; origin: CacheEventOrigin }> = [];
  const unsubscribe = subscribeCacheEvents((event, origin) => {
    events.push({ key: event.key, action: event.action, origin });
  });

  try {
    broadcastCacheEvent({ key: "pages:list", action: "update" });
    expect(events).toEqual([{ key: "pages:list", action: "update", origin: "local" }]);
  } finally {
    unsubscribe?.();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("subscribeCacheEvents handles storage events", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
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

  const deliveries: Array<{
    origin: CacheEventOrigin;
    operationToken?: CacheEventOperationToken;
  }> = [];
  const unsubscribe = subscribeCacheEvents((_event, origin, operationToken) => {
    deliveries.push({ origin, operationToken });
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
        key: "coderso.admin.cache.event",
        newValue: payload,
      } as StorageEvent)
    );
    expect(deliveries).toEqual([{ origin: "remote", operationToken: undefined }]);
  } finally {
    unsubscribe?.();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  }
});

test("subscribeCacheEvents marks BroadcastChannel-shaped cross-context events as remote", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;

  class BroadcastChannelStub {
    static instances: BroadcastChannelStub[] = [];

    readonly listeners = new Set<(event: MessageEvent) => void>();

    constructor(readonly name: string) {
      BroadcastChannelStub.instances.push(this);
    }

    postMessage() {}

    addEventListener(_type: "message", listener: (event: MessageEvent) => void) {
      this.listeners.add(listener);
    }

    removeEventListener(_type: "message", listener: (event: MessageEvent) => void) {
      this.listeners.delete(listener);
    }

    close() {}

    emit(data: unknown) {
      for (const listener of this.listeners) listener({ data } as MessageEvent);
    }
  }

  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = BroadcastChannelStub as unknown;
  const deliveries: Array<{
    origin: CacheEventOrigin;
    operationToken?: CacheEventOperationToken;
  }> = [];
  const unsubscribe = subscribeCacheEvents((_event, origin, operationToken) => {
    deliveries.push({ origin, operationToken });
  });

  try {
    const channel = BroadcastChannelStub.instances.find(
      (instance) => instance.name === "coderso.admin.cache"
    );
    expect(channel).toBeDefined();
    channel?.emit({
      key: "pages:list",
      action: "invalidate",
      sourceId: "another-context",
      ts: Date.now(),
    });
    expect(deliveries).toEqual([{ origin: "remote", operationToken: undefined }]);
  } finally {
    unsubscribe();
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
  }
});
