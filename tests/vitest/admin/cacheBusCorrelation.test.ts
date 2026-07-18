import { expect, test } from "vitest";

import {
  broadcastCacheEvent,
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "../../../core/admin/utils/cacheBus";
import {
  createSubscribeThroughHarness,
  emitTransportSequence,
  installBroadcastHarness,
  installStorageWindowHarness,
  remoteEvent,
  type RemoteCacheEvent,
} from "./support/cacheBusTestHarness";

const subscribeThroughHarness = createSubscribeThroughHarness(subscribeCacheEvents, (names) => {
  expect(names).toEqual(["coderso.admin.cache", "nextless.admin.cache"]);
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

test("subscribeCacheEvents collapses canonical and legacy twins in either order", () => {
  const harness = installBroadcastHarness();
  try {
    for (const sequence of ["CL", "LC"]) {
      const deliveries: RemoteCacheEvent[] = [];
      const subscription = subscribeThroughHarness(harness, (event, origin, token) => {
        expect(origin).toBe("remote");
        expect(token).toBeUndefined();
        deliveries.push(event);
      });
      emitTransportSequence(subscription, sequence, remoteEvent());
      expect(deliveries).toEqual([remoteEvent()]);
      subscription.unsubscribe();
    }
  } finally {
    harness.restore();
  }
});

test("subscribeCacheEvents preserves the prefix maximum for identical interleavings", () => {
  const harness = installBroadcastHarness();
  try {
    for (const sequence of ["CCLL", "CLCL", "CLLC", "LCCL", "LCLC", "LLCC"]) {
      let deliveries = 0;
      const subscription = subscribeThroughHarness(harness, () => {
        deliveries += 1;
      });
      emitTransportSequence(subscription, sequence, remoteEvent(), (prefix) => {
        const canonicalCount = [...prefix].filter((value) => value === "C").length;
        const legacyCount = prefix.length - canonicalCount;
        expect(deliveries, `${sequence}:${prefix}`).toBe(Math.max(canonicalCount, legacyCount));
      });
      expect(deliveries, sequence).toBe(2);
      subscription.unsubscribe();
    }
  } finally {
    harness.restore();
  }
});

test("subscribeCacheEvents preserves canonical-only and legacy-only repeated occurrences", () => {
  const harness = installBroadcastHarness();
  try {
    for (const [sequence, twins] of [
      ["CCC", "LLL"],
      ["LLL", "CCC"],
    ] as const) {
      let deliveries = 0;
      const subscription = subscribeThroughHarness(harness, () => {
        deliveries += 1;
      });
      emitTransportSequence(subscription, sequence, remoteEvent());
      expect(deliveries).toBe(3);
      emitTransportSequence(subscription, twins, remoteEvent());
      expect(deliveries).toBe(3);
      subscription.unsubscribe();
    }
  } finally {
    harness.restore();
  }
});

test("subscribeCacheEvents correlates the full tuple without delimiter collisions", () => {
  const harness = installBroadcastHarness();
  const deliveries: RemoteCacheEvent[] = [];
  const subscription = subscribeThroughHarness(harness, (event) => deliveries.push(event));
  try {
    const corpus = [
      remoteEvent(),
      remoteEvent({ sourceId: "other-source" }),
      remoteEvent({ ts: 2 }),
      remoteEvent({ key: "pages:detail" }),
      remoteEvent({ action: "invalidate" }),
    ];
    for (const event of corpus) subscription.canonical.emit(event);

    const delimiterTupleA = remoteEvent({ sourceId: "a|1", ts: 1, key: "c" });
    const delimiterTupleB = remoteEvent({ sourceId: "a", ts: 1, key: "1|c" });
    expect(
      [
        delimiterTupleA.sourceId,
        delimiterTupleA.ts,
        delimiterTupleA.key,
        delimiterTupleA.action,
      ].join("|")
    ).toBe(
      [
        delimiterTupleB.sourceId,
        delimiterTupleB.ts,
        delimiterTupleB.key,
        delimiterTupleB.action,
      ].join("|")
    );
    subscription.canonical.emit(delimiterTupleA);
    subscription.legacy.emit(delimiterTupleB);

    expect(deliveries).toEqual([...corpus, delimiterTupleA, delimiterTupleB]);
    for (const event of [...corpus, delimiterTupleA]) subscription.legacy.emit(event);
    subscription.canonical.emit(delimiterTupleB);
    expect(deliveries).toHaveLength(corpus.length + 2);
  } finally {
    subscription.unsubscribe();
    harness.restore();
  }
});

test("subscribeCacheEvents keeps correlation state private to each subscription", () => {
  const harness = installBroadcastHarness();
  let deliveriesA = 0;
  let deliveriesB = 0;
  const subscriptionA = subscribeThroughHarness(harness, () => {
    deliveriesA += 1;
  });
  const subscriptionB = subscribeThroughHarness(harness, () => {
    deliveriesB += 1;
  });
  try {
    const first = remoteEvent();
    subscriptionA.canonical.emit(first);
    subscriptionB.legacy.emit(first);
    expect([deliveriesA, deliveriesB]).toEqual([1, 1]);
    subscriptionA.legacy.emit(first);
    subscriptionB.canonical.emit(first);
    expect([deliveriesA, deliveriesB]).toEqual([1, 1]);

    const second = remoteEvent({ ts: 2 });
    subscriptionA.canonical.emit(second);
    subscriptionB.canonical.emit(second);
    expect([deliveriesA, deliveriesB]).toEqual([2, 2]);
    subscriptionA.unsubscribe();
    subscriptionB.legacy.emit(second);
    expect(deliveriesB).toBe(2);

    const resubscribedA = subscribeThroughHarness(harness, () => {
      deliveriesA += 1;
    });
    resubscribedA.legacy.emit(second);
    expect(deliveriesA).toBe(3);
    resubscribedA.unsubscribe();
  } finally {
    subscriptionB.unsubscribe();
    harness.restore();
  }
});

test("subscribeCacheEvents collapses storage twins and accepts repeated identical occurrences", () => {
  const windowHarness = installStorageWindowHarness();
  let deliveries = 0;
  const unsubscribe = subscribeCacheEvents((_event, origin, token) => {
    expect(origin).toBe("remote");
    expect(token).toBeUndefined();
    deliveries += 1;
  });
  try {
    const payload = JSON.stringify(remoteEvent());
    for (const order of [
      ["coderso.admin.cache.event", "nextless.admin.cache.event"],
      ["nextless.admin.cache.event", "coderso.admin.cache.event"],
    ]) {
      for (const key of order) windowHarness.emit(key, payload);
    }
    expect(deliveries).toBe(2);
  } finally {
    unsubscribe();
    expect(windowHarness.listenerCount()).toBe(0);
    windowHarness.restore();
  }
});

test("subscribeCacheEvents keeps storage removal events state-neutral across identical broadcasts", () => {
  const windowHarness = installStorageWindowHarness();
  let deliveries = 0;
  const unsubscribe = subscribeCacheEvents(() => {
    deliveries += 1;
  });
  try {
    const payload = JSON.stringify(remoteEvent({ key: "storage-remove-before-set" }));
    for (let broadcast = 0; broadcast < 2; broadcast += 1) {
      for (const key of ["coderso.admin.cache.event", "nextless.admin.cache.event"]) {
        windowHarness.emit(key, null);
        windowHarness.emit(key, payload);
      }
      expect(deliveries).toBe(broadcast + 1);
    }
  } finally {
    unsubscribe();
    windowHarness.restore();
  }
});

test("subscribeCacheEvents clears storage correlation state during teardown", () => {
  const windowHarness = installStorageWindowHarness();
  let deliveries = 0;
  let unsubscribed = false;
  const unsubscribe = subscribeCacheEvents(() => {
    deliveries += 1;
  });
  try {
    const payload = JSON.stringify(remoteEvent({ key: "storage-teardown" }));
    windowHarness.emit("coderso.admin.cache.event", payload);
    expect(deliveries).toBe(1);

    unsubscribe();
    unsubscribed = true;
    expect(windowHarness.listenerCount()).toBe(0);
    expect(windowHarness.removedListenerCount()).toBe(1);
    windowHarness.emitRemoved(0, "nextless.admin.cache.event", payload);
    expect(deliveries).toBe(2);
  } finally {
    if (!unsubscribed) unsubscribe();
    windowHarness.restore();
  }
});

test("broadcastCacheEvent rearms both storage keys and preserves identical local tokens", () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const originalDateNow = Date.now;
  const operations: Array<["remove", string] | ["set", string, string]> = [];
  const values = new Map<string, string>();
  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      operations.push(["remove", key]);
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      operations.push(["set", key, value]);
      values.set(key, value);
    },
  } as unknown;
  Date.now = () => 17;
  const firstToken = createCacheEventOperationToken();
  const secondToken = createCacheEventOperationToken();
  const deliveries: Array<{ origin: CacheEventOrigin; token?: CacheEventOperationToken }> = [];
  const unsubscribe = subscribeCacheEvents((_event, origin, token) => {
    deliveries.push({ origin, token });
  });
  try {
    broadcastCacheEvent({ key: "pages:list", action: "update" }, { operationToken: firstToken });
    broadcastCacheEvent({ key: "pages:list", action: "update" }, { operationToken: secondToken });
    expect(deliveries).toEqual([
      { origin: "local", token: firstToken },
      { origin: "local", token: secondToken },
    ]);
    expect(operations.map(([operation, key]) => [operation, key])).toEqual([
      ["remove", "coderso.admin.cache.event"],
      ["set", "coderso.admin.cache.event"],
      ["remove", "nextless.admin.cache.event"],
      ["set", "nextless.admin.cache.event"],
      ["remove", "coderso.admin.cache.event"],
      ["set", "coderso.admin.cache.event"],
      ["remove", "nextless.admin.cache.event"],
      ["set", "nextless.admin.cache.event"],
    ]);
    const payloads = operations
      .filter((operation): operation is ["set", string, string] => operation[0] === "set")
      .map((operation) => operation[2]);
    expect(new Set(payloads).size).toBe(1);
    expect(Object.keys(JSON.parse(payloads[0])).sort()).toEqual([
      "action",
      "key",
      "sourceId",
      "ts",
    ]);
  } finally {
    unsubscribe();
    Date.now = originalDateNow;
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
