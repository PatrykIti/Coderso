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

const createSubscribeThroughHarness = <Handler>(
  subscribe: (handler: Handler) => () => void,
  assertChannelNames: (names: string[]) => void
) => {
  return (harness: BroadcastHarness, handler: Handler) => {
    const before = harness.instances.length;
    const unsubscribe = subscribe(handler);
    const channels = harness.instances.slice(before);
    assertChannelNames(channels.map(({ name }) => name));
    return {
      canonical: channels[0]!,
      legacy: channels[1]!,
      unsubscribe,
    };
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
  subscription: {
    canonical: BroadcastChannelHarness;
    legacy: BroadcastChannelHarness;
  },
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

export {
  BroadcastChannelHarness,
  createLocalStorage,
  createSubscribeThroughHarness,
  emitTransportSequence,
  installBroadcastHarness,
  installStorageWindowHarness,
  remoteEvent,
};
export type { BroadcastHarness, RemoteCacheEvent, StorageEntry };
