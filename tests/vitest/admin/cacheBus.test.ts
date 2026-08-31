import { expect, test, vi } from "vitest";

import {
  broadcastCacheEvent,
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "../../../core/admin/utils/cacheBus";
import {
  createLocalStorage,
  createSubscribeThroughHarness,
  installBroadcastHarness,
} from "./support/cacheBusTestHarness";

const subscribeThroughHarness = createSubscribeThroughHarness(subscribeCacheEvents, (names) => {
  expect(names).toEqual(["coderso.admin.cache", "nextless.admin.cache"]);
});

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

test("broadcastCacheEvent projects structurally typed inputs to the exact wire shape", () => {
  const harness = installBroadcastHarness();
  const localEvents: Array<Record<PropertyKey, unknown>> = [];
  const subscription = subscribeThroughHarness(harness, (event, origin) => {
    if (origin === "local") localEvents.push(event as Record<PropertyKey, unknown>);
  });
  try {
    const extraSymbol = Symbol("extra");
    const structurallyTypedInput = {
      key: "pages:list",
      action: "update" as const,
      extra: "must-not-cross",
      [extraSymbol]: "must-not-cross",
    };
    broadcastCacheEvent(structurallyTypedInput);

    const outgoing = harness.instances.filter(({ messages }) => messages.length === 1);
    expect(outgoing).toHaveLength(2);
    for (const channel of outgoing) {
      expect(Reflect.ownKeys(channel.messages[0] as object).sort()).toEqual([
        "action",
        "key",
        "sourceId",
        "ts",
      ]);
    }
    expect(localEvents).toHaveLength(1);
    expect(Reflect.ownKeys(localEvents[0]).sort()).toEqual(["action", "key", "sourceId", "ts"]);
  } finally {
    subscription.unsubscribe();
    harness.restore();
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

test("cacheBus id falls back to a random value when crypto is unavailable", async () => {
  const originalCrypto = (globalThis as { crypto?: unknown }).crypto;
  const originalModule = await import("../../../core/admin/utils/cacheBus");
  vi.resetModules();
  delete (globalThis as { crypto?: unknown }).crypto;
  try {
    const fresh = await import("../../../core/admin/utils/cacheBus");
    expect(typeof fresh.createCacheEventOperationToken()).toBe("symbol");
    expect(fresh.broadcastCacheEvent).toBeTypeOf("function");
  } finally {
    if (originalCrypto === undefined) {
      delete (globalThis as { crypto?: unknown }).crypto;
    } else {
      (globalThis as { crypto?: unknown }).crypto = originalCrypto;
    }
    vi.resetModules();
    await import("../../../core/admin/utils/cacheBus");
    void originalModule;
  }
});
