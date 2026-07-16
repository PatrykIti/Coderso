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

type RemoteCacheEvent = {
  action: "invalidate" | "update";
  key: string;
  sourceId: string;
  ts: number;
};

type BroadcastHarness = {
  instances: BroadcastChannelHarness[];
  restore: () => void;
};

class BroadcastChannelHarness {
  readonly listeners = new Set<(event: MessageEvent) => void>();
  readonly messages: unknown[] = [];
  readonly removedListeners: Array<(event: MessageEvent) => void> = [];
  closed = false;

  constructor(
    readonly name: string,
    instances: BroadcastChannelHarness[]
  ) {
    instances.push(this);
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  addEventListener(_type: "message", listener: (event: MessageEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "message", listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener);
    this.removedListeners.push(listener);
  }

  close() {
    this.closed = true;
  }

  emit(data: unknown) {
    for (const listener of this.listeners) listener({ data } as MessageEvent);
  }
}

const installBroadcastHarness = (): BroadcastHarness => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const instances: BroadcastChannelHarness[] = [];
  class BroadcastChannelStub extends BroadcastChannelHarness {
    constructor(name: string) {
      super(name, instances);
    }
  }
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = BroadcastChannelStub as unknown;
  return {
    instances,
    restore: () => {
      if (originalBroadcast === undefined) {
        delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
      } else {
        (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
      }
    },
  };
};

const subscribeThroughHarness = (
  harness: BroadcastHarness,
  handler: Parameters<typeof subscribeCacheEvents>[0]
) => {
  const before = harness.instances.length;
  const unsubscribe = subscribeCacheEvents(handler);
  const channels = harness.instances.slice(before);
  expect(channels.map(({ name }) => name)).toEqual(["coderso.admin.cache", "nextless.admin.cache"]);
  return {
    canonical: channels[0],
    legacy: channels[1],
    unsubscribe,
  };
};

const remoteEvent = (overrides: Partial<RemoteCacheEvent> = {}): RemoteCacheEvent => ({
  action: "update",
  key: "pages:list",
  sourceId: "remote-context",
  ts: 1,
  ...overrides,
});

const emitTransportSequence = (
  subscription: ReturnType<typeof subscribeThroughHarness>,
  sequence: string,
  event: RemoteCacheEvent,
  afterEach?: (prefix: string) => void
) => {
  let prefix = "";
  for (const transport of sequence) {
    prefix += transport;
    (transport === "C" ? subscription.canonical : subscription.legacy).emit(event);
    afterEach?.(prefix);
  }
};

const installStorageWindowHarness = () => {
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const listeners = new Set<(event: StorageEvent) => void>();
  const removedListeners: Array<(event: StorageEvent) => void> = [];
  (globalThis as { window?: unknown }).window = {
    addEventListener: (_type: string, listener: (event: StorageEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: StorageEvent) => void) => {
      listeners.delete(listener);
      removedListeners.push(listener);
    },
  } as unknown;
  return {
    emit: (key: string, newValue: string | null) => {
      for (const listener of listeners) listener({ key, newValue } as StorageEvent);
    },
    emitRemoved: (index: number, key: string, newValue: string | null) => {
      const listener = removedListeners[index];
      if (!listener) throw new Error("missing removed storage listener");
      listener({ key, newValue } as StorageEvent);
    },
    listenerCount: () => listeners.size,
    removedListenerCount: () => removedListeners.length,
    restore: () => {
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
    },
  };
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

test("subscribeCacheEvents commits correlation before a reentrant throwing handler and tears down exactly", () => {
  const harness = installBroadcastHarness();
  const delivered: string[] = [];
  const throwing = remoteEvent({ key: "throw" });
  let reentered = false;
  let subscription: ReturnType<typeof subscribeThroughHarness>;
  subscription = subscribeThroughHarness(harness, (event) => {
    delivered.push(event.key);
    if (event.key === "throw") {
      if (!reentered) {
        reentered = true;
        subscription.legacy.emit(event);
      }
      throw new Error("expected handler failure");
    }
  });
  try {
    expect(() => subscription.canonical.emit(throwing)).toThrow("expected handler failure");
    expect(delivered).toEqual(["throw"]);
    subscription.canonical.emit(remoteEvent({ key: "unrelated" }));
    expect(delivered).toEqual(["throw", "unrelated"]);

    const teardownResidual = remoteEvent({ key: "teardown-residual" });
    subscription.canonical.emit(teardownResidual);
    expect(delivered).toEqual(["throw", "unrelated", "teardown-residual"]);

    subscription.unsubscribe();
    expect(subscription.canonical.listeners.size).toBe(0);
    expect(subscription.legacy.listeners.size).toBe(0);
    expect(subscription.canonical.removedListeners).toHaveLength(1);
    expect(subscription.legacy.removedListeners).toHaveLength(1);
    expect(subscription.canonical.closed).toBe(true);
    expect(subscription.legacy.closed).toBe(true);
    subscription.legacy.removedListeners[0]({ data: teardownResidual } as MessageEvent);
    expect(delivered).toEqual(["throw", "unrelated", "teardown-residual", "teardown-residual"]);

    let freshDeliveries = 0;
    const fresh = subscribeThroughHarness(harness, () => {
      freshDeliveries += 1;
    });
    fresh.legacy.emit(remoteEvent({ key: "unrelated" }));
    expect(freshDeliveries).toBe(1);
    fresh.unsubscribe();
  } finally {
    harness.restore();
  }
});

test("subscribeCacheEvents enforces an exact 128-entry LRU with fail-open eviction", () => {
  const harness = installBroadcastHarness();
  try {
    let exactCapDeliveries = 0;
    const exactCap = subscribeThroughHarness(harness, () => {
      exactCapDeliveries += 1;
    });
    for (let index = 0; index < 128; index += 1) {
      exactCap.canonical.emit(remoteEvent({ key: `key-${index}` }));
    }
    expect(exactCapDeliveries).toBe(128);
    exactCap.legacy.emit(remoteEvent({ key: "key-0" }));
    expect(exactCapDeliveries).toBe(128);
    exactCap.unsubscribe();

    let lruDeliveries = 0;
    const lru = subscribeThroughHarness(harness, () => {
      lruDeliveries += 1;
    });
    for (let index = 0; index < 128; index += 1) {
      lru.canonical.emit(remoteEvent({ key: `key-${index}` }));
    }
    lru.canonical.emit(remoteEvent({ key: "key-0" }));
    lru.canonical.emit(remoteEvent({ key: "key-128" }));
    expect(lruDeliveries).toBe(130);
    lru.legacy.emit(remoteEvent({ key: "key-1" }));
    expect(lruDeliveries).toBe(131);
    lru.legacy.emit(remoteEvent({ key: "key-0" }));
    expect(lruDeliveries).toBe(131);
    lru.unsubscribe();
  } finally {
    harness.restore();
  }
});

test("subscribeCacheEvents rejects unknown and invalid remote payloads before correlation", () => {
  const harness = installBroadcastHarness();
  const remoteDeliveries: RemoteCacheEvent[] = [];
  const subscription = subscribeThroughHarness(harness, (event, origin) => {
    if (origin === "remote") remoteDeliveries.push(event);
  });
  try {
    const withSymbol = remoteEvent() as RemoteCacheEvent & Record<symbol, string>;
    withSymbol[Symbol("extra")] = "no";
    const withNonEnumerable = remoteEvent();
    Object.defineProperty(withNonEnumerable, "extra", { value: true, enumerable: false });
    let getterCalls = 0;
    const throwingAccessor = remoteEvent() as RemoteCacheEvent;
    Object.defineProperty(throwingAccessor, "action", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error("must not read remote accessors");
      },
    });
    const inheritedKeyAfterMutation = Object.create({ key: "inherited-after-check" }) as Record<
      string,
      unknown
    >;
    Object.defineProperties(inheritedKeyAfterMutation, {
      action: {
        enumerable: true,
        get: () => {
          getterCalls += 1;
          delete inheritedKeyAfterMutation.key;
          return "update";
        },
      },
      key: { configurable: true, enumerable: true, value: "own-before-check" },
      sourceId: { enumerable: true, value: "remote-context" },
      ts: { enumerable: true, value: 1 },
    });
    const nonEnumerableRequired = remoteEvent();
    Object.defineProperty(nonEnumerableRequired, "key", {
      enumerable: false,
      value: nonEnumerableRequired.key,
    });
    const throwingDescriptorProxy = new Proxy(remoteEvent(), {
      getOwnPropertyDescriptor: () => {
        throw new Error("must fail closed");
      },
    });
    for (const payload of [
      { ...remoteEvent(), extra: true },
      withSymbol,
      withNonEnumerable,
      throwingAccessor,
      inheritedKeyAfterMutation,
      nonEnumerableRequired,
      throwingDescriptorProxy,
      remoteEvent({ ts: -1 }),
      remoteEvent({ ts: 0.5 }),
      remoteEvent({ ts: Number.NaN }),
      remoteEvent({ ts: Number.POSITIVE_INFINITY }),
      remoteEvent({ ts: Number.MAX_SAFE_INTEGER + 1 }),
      { ...remoteEvent(), action: "delete" },
      { ...remoteEvent(), action: 42 },
      { ...remoteEvent(), key: 42 },
      { ...remoteEvent(), sourceId: 42 },
      remoteEvent({ key: "" }),
      remoteEvent({ key: "k".repeat(1025) }),
      remoteEvent({ key: "😀".repeat(513) }),
      remoteEvent({ sourceId: "" }),
      remoteEvent({ sourceId: "s".repeat(129) }),
      remoteEvent({ sourceId: "😀".repeat(65) }),
    ]) {
      subscription.canonical.emit(payload);
    }
    expect(remoteDeliveries).toEqual([]);
    expect(getterCalls).toBe(0);

    const accepted = [
      remoteEvent({ ts: 0, key: "k".repeat(1024), sourceId: "s".repeat(128) }),
      remoteEvent({ ts: Number.MAX_SAFE_INTEGER, key: "boundary-two" }),
      remoteEvent({ ts: 2, key: "😀".repeat(512), sourceId: "astral-key" }),
      remoteEvent({ ts: 3, key: "astral-source", sourceId: "😀".repeat(64) }),
    ];
    for (const event of accepted) subscription.canonical.emit(event);
    expect(remoteDeliveries).toEqual(accepted);

    for (let index = 0; index < 128; index += 1) {
      subscription.canonical.emit(remoteEvent({ key: `stable-${index}`, ts: 10 }));
    }
    broadcastCacheEvent({ key: "source-probe", action: "update" });
    const ownPayload = harness.instances
      .flatMap(({ messages }) => messages)
      .find((message) =>
        Boolean(message && typeof message === "object" && "sourceId" in message)
      ) as RemoteCacheEvent;
    expect(ownPayload).toBeDefined();
    const beforeMalformedAndOwnSource = remoteDeliveries.length;
    for (let index = 0; index < 160; index += 1) {
      const atCapAccessor = remoteEvent({ key: `accessor-${index}`, ts: 30 + index });
      Object.defineProperty(atCapAccessor, "action", {
        enumerable: true,
        get: () => {
          getterCalls += 1;
          return "update";
        },
      });
      const atCapMutatingAccessor = remoteEvent({
        key: `mutating-accessor-${index}`,
        ts: 200 + index,
      });
      Object.defineProperty(atCapMutatingAccessor, "action", {
        enumerable: true,
        get: () => {
          getterCalls += 1;
          delete (atCapMutatingAccessor as Partial<RemoteCacheEvent>).key;
          return "update";
        },
      });
      const atCapDescriptorProxy = new Proxy(
        remoteEvent({ key: `proxy-${index}`, ts: 400 + index }),
        {
          getOwnPropertyDescriptor: () => {
            throw new Error("at-cap descriptor trap must fail closed");
          },
        }
      );
      subscription.canonical.emit({ ...remoteEvent({ key: `bad-${index}` }), extra: index });
      subscription.canonical.emit(atCapAccessor);
      subscription.canonical.emit(atCapMutatingAccessor);
      subscription.canonical.emit(atCapDescriptorProxy);
      subscription.canonical.emit({
        ...remoteEvent({ key: `invalid-action-${index}`, ts: 600 + index }),
        action: "delete",
      });
      subscription.canonical.emit({
        ...remoteEvent({ key: `invalid-action-type-${index}`, ts: 800 + index }),
        action: index,
      });
      subscription.canonical.emit({
        ...remoteEvent({ key: `invalid-key-type-${index}`, ts: 1_000 + index }),
        key: index,
      });
      subscription.canonical.emit({
        ...remoteEvent({ key: `invalid-source-type-${index}`, ts: 1_200 + index }),
        sourceId: index,
      });
      subscription.canonical.emit(
        remoteEvent({ key: `invalid-bound-${index}`, ts: Number.MAX_SAFE_INTEGER + 1 })
      );
      subscription.canonical.emit({ ...ownPayload, key: `own-${index}`, ts: 20 + index });
    }
    expect(remoteDeliveries).toHaveLength(beforeMalformedAndOwnSource);
    expect(getterCalls).toBe(0);
    const beforeOldestTwin = remoteDeliveries.length;
    subscription.legacy.emit(remoteEvent({ key: "stable-0", ts: 10 }));
    expect(remoteDeliveries).toHaveLength(beforeOldestTwin);
  } finally {
    subscription.unsubscribe();
    harness.restore();
  }
});

test("subscribeCacheEvents keeps malformed storage and removal inputs state-neutral at capacity", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const windowHarness = installStorageWindowHarness();
  const remoteDeliveries: RemoteCacheEvent[] = [];
  let ownPayload: RemoteCacheEvent | null = null;
  const unsubscribe = subscribeCacheEvents((event, origin) => {
    if (origin === "local") ownPayload = event;
    else remoteDeliveries.push(event);
  });
  try {
    broadcastCacheEvent({ key: "own-source-capture", action: "update" });
    const capturedOwnPayload = ownPayload as RemoteCacheEvent | null;
    if (!capturedOwnPayload) throw new Error("missing same-context cache event");

    for (let index = 0; index < 128; index += 1) {
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify(remoteEvent({ key: `storage-stable-${index}`, ts: 100 }))
      );
    }
    expect(remoteDeliveries).toHaveLength(128);

    for (let index = 0; index < 160; index += 1) {
      windowHarness.emit("coderso.admin.cache.event", `{"index":${index}`);
      windowHarness.emit("coderso.admin.cache.event", null);
      windowHarness.emit("nextless.admin.cache.event", null);
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify({
          ...remoteEvent({ key: `storage-invalid-action-${index}`, ts: 300 + index }),
          action: "delete",
        })
      );
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify({
          ...remoteEvent({ key: `storage-invalid-action-type-${index}`, ts: 500 + index }),
          action: index,
        })
      );
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify({
          ...remoteEvent({ key: `storage-invalid-key-${index}`, ts: 700 + index }),
          key: index,
        })
      );
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify({
          ...remoteEvent({ key: `storage-invalid-source-${index}`, ts: 900 + index }),
          sourceId: index,
        })
      );
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify(
          remoteEvent({
            key: `storage-invalid-bound-${index}`,
            ts: Number.MAX_SAFE_INTEGER + 1,
          })
        )
      );
      windowHarness.emit(
        "coderso.admin.cache.event",
        JSON.stringify({
          ...capturedOwnPayload,
          key: `storage-own-${index}`,
          ts: 1_100 + index,
        })
      );
      windowHarness.emit(
        "unrelated.cache.event",
        JSON.stringify(remoteEvent({ key: `storage-unrelated-${index}`, ts: 1_300 + index }))
      );
    }
    expect(remoteDeliveries).toHaveLength(128);

    windowHarness.emit(
      "nextless.admin.cache.event",
      JSON.stringify(remoteEvent({ key: "storage-stable-0", ts: 100 }))
    );
    expect(remoteDeliveries).toHaveLength(128);
  } finally {
    unsubscribe();
    windowHarness.restore();
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("subscribeCacheEvents bounds storage JSON before parsing and accepts exact boundaries", () => {
  const windowHarness = installStorageWindowHarness();
  const deliveries: RemoteCacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => deliveries.push(event));
  const originalParse = JSON.parse;
  let parseCalls = 0;
  JSON.parse = ((
    text: string,
    reviver?: (this: unknown, key: string, value: unknown) => unknown
  ) => {
    parseCalls += 1;
    return originalParse(text, reviver);
  }) as typeof JSON.parse;
  try {
    windowHarness.emit("coderso.admin.cache.event", "x".repeat(2049));
    expect(parseCalls).toBe(0);
    expect(deliveries).toEqual([]);

    const boundaryEvent = remoteEvent({ key: "😀".repeat(512), ts: 0 });
    const boundaryPayload = JSON.stringify(boundaryEvent).padEnd(2048, " ");
    expect(boundaryPayload).toHaveLength(2048);
    expect([...boundaryPayload]).toHaveLength(1536);
    windowHarness.emit("coderso.admin.cache.event", boundaryPayload);
    expect(parseCalls).toBe(1);
    expect(deliveries).toEqual([boundaryEvent]);

    const overBoundaryPayload = boundaryPayload + "😀";
    expect(overBoundaryPayload).toHaveLength(2050);
    expect([...overBoundaryPayload]).toHaveLength(1537);
    windowHarness.emit("coderso.admin.cache.event", overBoundaryPayload);
    expect(parseCalls).toBe(1);
    expect(deliveries).toEqual([boundaryEvent]);

    windowHarness.emit("coderso.admin.cache.event", null);
    windowHarness.emit("unknown.cache.event", JSON.stringify(remoteEvent({ ts: 2 })));
    expect(parseCalls).toBe(1);
  } finally {
    JSON.parse = originalParse;
    unsubscribe();
    windowHarness.restore();
  }
});
