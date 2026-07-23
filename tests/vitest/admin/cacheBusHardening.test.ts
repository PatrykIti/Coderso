import { expect, test } from "vitest";

import { broadcastCacheEvent, subscribeCacheEvents } from "../../../core/admin/utils/cacheBus";
import {
  createLocalStorage,
  createSubscribeThroughHarness,
  installBroadcastHarness,
  installStorageWindowHarness,
  remoteEvent,
  type RemoteCacheEvent,
} from "./support/cacheBusTestHarness";

const subscribeThroughHarness = createSubscribeThroughHarness(subscribeCacheEvents, (names) => {
  expect(names).toEqual(["coderso.admin.cache", "nextless.admin.cache"]);
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
