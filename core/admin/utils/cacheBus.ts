export type CacheEventAction = "invalidate" | "update";

export type CacheEvent = {
  key: string;
  action: CacheEventAction;
  sourceId: string;
  ts: number;
};

type CacheEventHandler = (event: CacheEvent) => void;

type BroadcastChannelLike = {
  postMessage: (message: unknown) => void;
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  close: () => void;
};

const CHANNEL_NAME = "nextless.admin.cache";
const STORAGE_EVENT_KEY = "nextless.admin.cache.event";
const localHandlers = new Set<CacheEventHandler>();

const cacheBusId = (() => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cache-${Math.random().toString(36).slice(2)}`;
})();

const getBroadcastChannel = (): BroadcastChannelLike | null => {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
};

const emitStorageEvent = (event: CacheEvent) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(event));
};

const parseEvent = (payload: unknown): CacheEvent | null => {
  if (!payload || typeof payload !== "object") return null;
  const event = payload as CacheEvent;
  if (!event.key || typeof event.key !== "string") return null;
  if (!event.action || (event.action !== "invalidate" && event.action !== "update")) return null;
  if (!event.sourceId || typeof event.sourceId !== "string") return null;
  if (typeof event.ts !== "number") return null;
  return event;
};

export const broadcastCacheEvent = (input: Omit<CacheEvent, "ts" | "sourceId">) => {
  const event: CacheEvent = { ...input, ts: Date.now(), sourceId: cacheBusId };
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage(event);
    channel.close();
  } else {
    emitStorageEvent(event);
  }
  for (const handler of localHandlers) {
    handler(event);
  }
};

export const subscribeCacheEvents = (handler: CacheEventHandler) => {
  localHandlers.add(handler);
  const channel = getBroadcastChannel();
  if (channel) {
    const listener = (event: MessageEvent) => {
      const parsed = parseEvent(event.data);
      if (!parsed || parsed.sourceId === cacheBusId) return;
      handler(parsed);
    };
    channel.addEventListener("message", listener);
    return () => {
      localHandlers.delete(handler);
      channel.removeEventListener("message", listener);
      channel.close();
    };
  }

  const storageListener = (event: StorageEvent) => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
    try {
      const parsed = parseEvent(JSON.parse(event.newValue));
      if (!parsed || parsed.sourceId === cacheBusId) return;
      handler(parsed);
    } catch {
      // ignore
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", storageListener);
  }

  return () => {
    localHandlers.delete(handler);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", storageListener);
    }
  };
};
