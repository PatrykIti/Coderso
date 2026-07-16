export type CacheEventAction = "invalidate" | "update";

export type CacheEvent = {
  key: string;
  action: CacheEventAction;
  sourceId: string;
  ts: number;
};

export type CacheEventOrigin = "local" | "remote";

export type CacheEventOperationToken = symbol;

export type CacheEventBroadcastOptions = Readonly<{
  operationToken?: CacheEventOperationToken;
}>;

type CacheEventHandler = (
  event: CacheEvent,
  origin: CacheEventOrigin,
  operationToken?: CacheEventOperationToken
) => void;

type BroadcastChannelLike = {
  postMessage: (message: unknown) => void;
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  close: () => void;
};

const CHANNEL_NAME = "coderso.admin.cache";
const LEGACY_CHANNEL_NAME = "nextless.admin.cache";
const STORAGE_EVENT_KEY = "coderso.admin.cache.event";
const LEGACY_STORAGE_EVENT_KEY = "nextless.admin.cache.event";
const MAX_REMOTE_IDENTITIES = 128;
const MAX_KEY_CODE_UNITS = 1024;
const MAX_SOURCE_ID_CODE_UNITS = 128;
const MAX_STORAGE_PAYLOAD_CODE_UNITS = 2048;
const CACHE_EVENT_KEYS = Object.freeze(["action", "key", "sourceId", "ts"] as const);
const localHandlers = new Set<CacheEventHandler>();

type RemoteTransport = "canonical" | "legacy";

type RemoteCounts = {
  canonical: number;
  legacy: number;
  delivered: number;
};

const cacheBusId = (() => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cache-${Math.random().toString(36).slice(2)}`;
})();

export const createCacheEventOperationToken = (): CacheEventOperationToken => Symbol();

const getBroadcastChannel = (): BroadcastChannelLike | null => {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
};

const getLegacyBroadcastChannel = (): BroadcastChannelLike | null => {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(LEGACY_CHANNEL_NAME);
};

const emitStorageEvent = (event: CacheEvent) => {
  if (typeof localStorage === "undefined") return;
  const serialized = JSON.stringify(event);
  for (const key of [STORAGE_EVENT_KEY, LEGACY_STORAGE_EVENT_KEY]) {
    localStorage.removeItem(key);
    localStorage.setItem(key, serialized);
  }
};

const parseEvent = (payload: unknown): CacheEvent | null => {
  if (!payload || typeof payload !== "object") return null;
  let descriptors: PropertyDescriptorMap;
  try {
    descriptors = Object.getOwnPropertyDescriptors(payload);
  } catch {
    return null;
  }

  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.length !== CACHE_EVENT_KEYS.length ||
    !CACHE_EVENT_KEYS.every((key) => ownKeys.includes(key))
  ) {
    return null;
  }
  const values: Record<(typeof CACHE_EVENT_KEYS)[number], unknown> = {
    action: undefined,
    key: undefined,
    sourceId: undefined,
    ts: undefined,
  };
  for (const field of CACHE_EVENT_KEYS) {
    const descriptor = descriptors[field];
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) return null;
    values[field] = descriptor.value;
  }

  const { action, key, sourceId, ts } = values;
  if (action !== "invalidate" && action !== "update") return null;
  if (typeof key !== "string" || key.length === 0 || key.length > MAX_KEY_CODE_UNITS) {
    return null;
  }
  if (
    typeof sourceId !== "string" ||
    sourceId.length === 0 ||
    sourceId.length > MAX_SOURCE_ID_CODE_UNITS
  ) {
    return null;
  }
  if (typeof ts !== "number" || !Number.isSafeInteger(ts) || ts < 0) return null;
  return { action, key, sourceId, ts };
};

const parseStorageEvent = (serialized: string): CacheEvent | null => {
  if (serialized.length > MAX_STORAGE_PAYLOAD_CODE_UNITS) return null;
  try {
    return parseEvent(JSON.parse(serialized));
  } catch {
    return null;
  }
};

export const broadcastCacheEvent = (
  input: Omit<CacheEvent, "ts" | "sourceId">,
  options: CacheEventBroadcastOptions = {}
) => {
  const event: CacheEvent = {
    key: input.key,
    action: input.action,
    ts: Date.now(),
    sourceId: cacheBusId,
  };
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage(event);
    const legacyChannel = getLegacyBroadcastChannel();
    legacyChannel?.postMessage(event);
    legacyChannel?.close();
    channel.close();
  } else {
    emitStorageEvent(event);
  }
  for (const handler of localHandlers) {
    handler(event, "local", options.operationToken);
  }
};

export const subscribeCacheEvents = (handler: CacheEventHandler) => {
  localHandlers.add(handler);
  const remoteCounts = new Map<string, RemoteCounts>();

  const touchLruAndEvictOldestFailOpen = (identity: string, counts: RemoteCounts) => {
    remoteCounts.delete(identity);
    remoteCounts.set(identity, counts);
    if (remoteCounts.size <= MAX_REMOTE_IDENTITIES) return;
    const oldest = remoteCounts.keys().next().value;
    if (oldest !== undefined) remoteCounts.delete(oldest);
  };

  const deliverRemote = (payload: unknown, transport: RemoteTransport) => {
    const parsed = parseEvent(payload);
    if (!parsed || parsed.sourceId === cacheBusId) return;

    const identity = JSON.stringify([parsed.sourceId, parsed.ts, parsed.key, parsed.action]);
    const counts = remoteCounts.get(identity) ?? {
      canonical: 0,
      legacy: 0,
      delivered: 0,
    };
    counts[transport] += 1;
    const shouldDeliver = Math.max(counts.canonical, counts.legacy) > counts.delivered;
    if (shouldDeliver) counts.delivered += 1;

    const paired = Math.min(counts.canonical, counts.legacy);
    counts.canonical -= paired;
    counts.legacy -= paired;
    counts.delivered -= paired;
    if (counts.canonical === 0 && counts.legacy === 0) {
      remoteCounts.delete(identity);
    } else {
      touchLruAndEvictOldestFailOpen(identity, counts);
    }

    if (shouldDeliver) handler(parsed, "remote");
  };

  const channel = getBroadcastChannel();
  if (channel) {
    const legacyChannel = getLegacyBroadcastChannel();
    const canonicalListener = (event: MessageEvent) => deliverRemote(event.data, "canonical");
    const legacyListener = (event: MessageEvent) => deliverRemote(event.data, "legacy");
    channel.addEventListener("message", canonicalListener);
    legacyChannel?.addEventListener("message", legacyListener);
    return () => {
      localHandlers.delete(handler);
      channel.removeEventListener("message", canonicalListener);
      legacyChannel?.removeEventListener("message", legacyListener);
      channel.close();
      legacyChannel?.close();
      remoteCounts.clear();
    };
  }

  const storageListener = (event: StorageEvent) => {
    if (event.key !== STORAGE_EVENT_KEY && event.key !== LEGACY_STORAGE_EVENT_KEY) {
      return;
    }
    if (!event.newValue) return;
    const parsed = parseStorageEvent(event.newValue);
    if (!parsed) return;
    deliverRemote(parsed, event.key === STORAGE_EVENT_KEY ? "canonical" : "legacy");
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", storageListener);
  }

  return () => {
    localHandlers.delete(handler);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", storageListener);
    }
    remoteCounts.clear();
  };
};
