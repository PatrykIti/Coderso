// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AuthUser } from "../../../core/admin/services/authClient";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import {
  DEFAULT_SCREEN_ENTRY_PREFERENCES,
  normalizeScreenEntryPreferences,
  useScreenEntryPreferences,
  type ScreenEntryPreferences,
} from "../../../core/admin/ui/custom-screens/hooks/useScreenEntryPreferences";
import {
  normalizeScreenEntryPreferencesSetting,
  toScreenEntryPreferencesSetting,
} from "../../../core/services/settings/screenEntryPreferencesContract";

const clientMocks = vi.hoisted(() => ({
  getUserSettingIsolated: vi.fn(),
  setUserSettingIsolated: vi.fn(),
}));

const externalStoreObserver = vi.hoisted(() => ({
  notifications: 0,
  subscriptions: 0,
  unsubscriptions: 0,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useSyncExternalStore<T>(
      subscribe: (onStoreChange: () => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T
    ): T {
      return actual.useSyncExternalStore(
        (listener) => {
          externalStoreObserver.subscriptions += 1;
          const unsubscribe = subscribe(() => {
            externalStoreObserver.notifications += 1;
            listener();
          });
          return () => {
            externalStoreObserver.unsubscriptions += 1;
            unsubscribe();
          };
        },
        getSnapshot,
        getServerSnapshot
      );
    },
  };
});

vi.mock("@/services/userSettingsClient", () => clientMocks);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HookHandle = {
  current: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const roots = new Set<Root>();
let userSequence = 0;

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const makeUser = (prefix = "user"): AuthUser => {
  userSequence += 1;
  const id = `${prefix}-${userSequence}`;
  return {
    id,
    email: `${id}@example.test`,
    permissionSnapshot: null,
  };
};

const setting = (showFieldMetadata: boolean) => ({
  key: "customScreens.entry.preferences" as const,
  value: { version: 1 as const, showFieldMetadata },
});

const flush = async (): Promise<void> => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const mountHook = (
  initialUser: AuthUser | null,
  initialVisible = true,
  onLayoutUnmount?: () => void,
  onIdentityLayoutCommit?: (userId: string | null) => void
) => {
  const handle: HookHandle = {
    current: DEFAULT_SCREEN_ENTRY_PREFERENCES,
    setPreferences: () => undefined,
  };
  let renderCount = 0;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  let mounted = true;

  function Probe() {
    const result = useScreenEntryPreferences();
    renderCount += 1;
    handle.current = result.preferences;
    handle.setPreferences = result.setPreferences;
    return null;
  }

  function ReleaseOnLayoutUnmount() {
    React.useLayoutEffect(
      () => () => {
        onLayoutUnmount?.();
      },
      [onLayoutUnmount]
    );
    return null;
  }

  function ObserveIdentityLayoutCommit({ userId }: { userId: string | null }) {
    React.useLayoutEffect(() => {
      onIdentityLayoutCommit?.(userId);
    }, [userId, onIdentityLayoutCommit]);
    return null;
  }

  const render = (user: AuthUser | null, visible = true) => {
    React.act(() => {
      root.render(
        React.createElement(AdminAuthProvider, {
          user,
          children: visible
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(Probe),
                onLayoutUnmount ? React.createElement(ReleaseOnLayoutUnmount) : null,
                onIdentityLayoutCommit
                  ? React.createElement(ObserveIdentityLayoutCommit, {
                      userId: user?.id ?? null,
                    })
                  : null
              )
            : null,
        })
      );
    });
  };
  render(initialUser, initialVisible);

  return {
    handle,
    getRenderCount: () => renderCount,
    render,
    unmount: () => {
      if (!mounted) return;
      mounted = false;
      roots.delete(root);
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const mountHookPair = (initialUser: AuthUser) => {
  const handles: [HookHandle, HookHandle] = [
    {
      current: DEFAULT_SCREEN_ENTRY_PREFERENCES,
      setPreferences: () => undefined,
    },
    {
      current: DEFAULT_SCREEN_ENTRY_PREFERENCES,
      setPreferences: () => undefined,
    },
  ];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  let mounted = true;

  function Probe({ index }: { index: 0 | 1 }) {
    const result = useScreenEntryPreferences();
    handles[index].current = result.preferences;
    handles[index].setPreferences = result.setPreferences;
    return null;
  }

  const render = (user: AuthUser) => {
    React.act(() => {
      root.render(
        React.createElement(AdminAuthProvider, {
          user,
          children: React.createElement(
            React.Fragment,
            null,
            React.createElement(Probe, { key: "h1", index: 0 }),
            React.createElement(Probe, { key: "h2", index: 1 })
          ),
        })
      );
    });
  };
  render(initialUser);

  return {
    handles,
    render,
    unmount: () => {
      if (!mounted) return;
      mounted = false;
      roots.delete(root);
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

beforeEach(() => {
  externalStoreObserver.notifications = 0;
  externalStoreObserver.subscriptions = 0;
  externalStoreObserver.unsubscriptions = 0;
  clientMocks.getUserSettingIsolated.mockReset();
  clientMocks.setUserSettingIsolated.mockReset();
  clientMocks.getUserSettingIsolated.mockResolvedValue(setting(false));
  clientMocks.setUserSettingIsolated.mockImplementation(
    async (_key: string, value: { version: 1; showFieldMetadata: boolean }) => ({
      key: "customScreens.entry.preferences",
      value,
    })
  );
  window.localStorage.clear();
});

afterEach(() => {
  for (const root of roots) React.act(() => root.unmount());
  roots.clear();
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("keeps the public view normalizer separate from the strict stored contract", () => {
  expect(normalizeScreenEntryPreferences({ showFieldMetadata: true })).toEqual({
    showFieldMetadata: true,
  });
  expect(normalizeScreenEntryPreferences({ showFieldMetadata: "yes" })).toEqual(
    DEFAULT_SCREEN_ENTRY_PREFERENCES
  );
  expect(() => normalizeScreenEntryPreferencesSetting({ showFieldMetadata: true })).toThrow(
    "user_settings_value_invalid"
  );
  expect(() =>
    normalizeScreenEntryPreferencesSetting({
      version: 1,
      showFieldMetadata: true,
      extra: true,
    })
  ).toThrow("user_settings_value_invalid");
  expect(toScreenEntryPreferencesSetting({ showFieldMetadata: true })).toEqual({
    version: 1,
    showFieldMetadata: true,
  });
});

test("no-user preferences are mount-local and never touch transport or storage", () => {
  const storageRead = vi.spyOn(Storage.prototype, "getItem");
  const storageWrite = vi.spyOn(Storage.prototype, "setItem");
  const first = mountHook(null);
  expect(first.handle.current).toEqual({ showFieldMetadata: false });
  React.act(() => {
    first.handle.setPreferences({ showFieldMetadata: true });
  });
  expect(first.handle.current).toEqual({ showFieldMetadata: true });
  first.unmount();

  const second = mountHook(null);
  expect(second.handle.current).toEqual({ showFieldMetadata: false });
  expect(clientMocks.getUserSettingIsolated).not.toHaveBeenCalled();
  expect(clientMocks.setUserSettingIsolated).not.toHaveBeenCalled();
  expect(storageRead).not.toHaveBeenCalled();
  expect(storageWrite).not.toHaveBeenCalled();
  second.unmount();
});

test("hydrates and writes only the authenticated user's strict setting", async () => {
  const user = makeUser("hydrate");
  clientMocks.getUserSettingIsolated.mockResolvedValue(setting(true));
  const mounted = mountHook(user);
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });

  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: false });
  });
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledWith(
    "customScreens.entry.preferences",
    { version: 1, showFieldMetadata: false },
    expect.objectContaining({ expectedUserId: user.id, signal: expect.any(AbortSignal) })
  );
  mounted.unmount();
});

test("a malformed GET fails closed without an in-mount loop and a remount retries", async () => {
  const user = makeUser("malformed-get");
  clientMocks.getUserSettingIsolated
    .mockResolvedValueOnce({
      key: "customScreens.entry.preferences",
      value: { version: 2, showFieldMetadata: true },
    })
    .mockResolvedValueOnce(setting(true));
  const first = mountHook(user);
  await flush();
  expect(first.handle.current).toEqual({ showFieldMetadata: false });
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);
  first.unmount();

  const second = mountHook(user);
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(second.handle.current).toEqual({ showFieldMetadata: true });
  second.unmount();
});

test("a malformed PATCH keeps exact local intent unsynced until an explicit retry", async () => {
  const user = makeUser("malformed-patch");
  clientMocks.setUserSettingIsolated
    .mockResolvedValueOnce({
      key: "customScreens.entry.preferences",
      value: { version: 1, showFieldMetadata: "invalid" },
    })
    .mockResolvedValueOnce(setting(true));
  const mounted = mountHook(user);
  await flush();

  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
  });
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });
  mounted.unmount();
});

test("an invalid truthy setter input follows the public defaulting normalizer", async () => {
  const user = makeUser("invalid-setter");
  const mounted = mountHook(user);
  await flush();
  React.act(() => {
    mounted.handle.setPreferences({
      showFieldMetadata: "yes",
    } as unknown as ScreenEntryPreferences);
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledWith(
    "customScreens.entry.preferences",
    { version: 1, showFieldMetadata: false },
    expect.objectContaining({ expectedUserId: user.id })
  );
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  mounted.unmount();
});

test("rapid same-user writes serialize and retain UI order", async () => {
  const user = makeUser("serial");
  const firstWrite = deferred<ReturnType<typeof setting>>();
  clientMocks.setUserSettingIsolated
    .mockImplementationOnce(() => firstWrite.promise)
    .mockResolvedValueOnce(setting(false));
  const mounted = mountHook(user);
  await flush();

  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
    mounted.handle.setPreferences({ showFieldMetadata: false });
  });
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  await React.act(async () => {
    firstWrite.resolve(setting(true));
    await firstWrite.promise;
    await Promise.resolve();
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  mounted.unmount();
});

test("an earlier transport failure releases the later queued same-user action", async () => {
  const user = makeUser("release-after-failure");
  clientMocks.setUserSettingIsolated
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(setting(false));
  const mounted = mountHook(user);
  await flush();
  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
    mounted.handle.setPreferences({ showFieldMetadata: false });
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  mounted.unmount();
});

test("a same-user Screen remount renders pending state and does not read before settlement", async () => {
  const user = makeUser("pending-remount");
  const write = deferred<ReturnType<typeof setting>>();
  clientMocks.setUserSettingIsolated.mockImplementationOnce(() => write.promise);
  const mounted = mountHook(user);
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);
  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
  });
  await flush();

  mounted.render(user, false);
  mounted.render(user, true);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);

  await React.act(async () => {
    write.resolve(setting(true));
    await write.promise;
    await Promise.resolve();
  });
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);
  mounted.unmount();
});

test("two same-user consumers join one GET and discard only a superseded failed marker", async () => {
  const userA = makeUser("pair-a");
  const userB = makeUser("pair-b");
  const initialRead = deferred<ReturnType<typeof setting>>();
  clientMocks.getUserSettingIsolated
    .mockImplementationOnce(() => initialRead.promise)
    .mockResolvedValueOnce(setting(false))
    .mockResolvedValueOnce(setting(true));
  const pair = mountHookPair(userA);
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);

  await React.act(async () => {
    initialRead.resolve(setting(false));
    await initialRead.promise;
    await Promise.resolve();
  });
  await flush();
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: false });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: false });

  clientMocks.setUserSettingIsolated
    .mockRejectedValueOnce(new Error("h1-offline"))
    .mockResolvedValueOnce(setting(false));
  React.act(() => {
    pair.handles[0].setPreferences({ showFieldMetadata: true });
    pair.handles[1].setPreferences({ showFieldMetadata: false });
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: false });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: false });

  pair.render(userB);
  await flush();
  pair.render(userA);
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(3);
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: true });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: true });
  pair.unmount();
});

test("H1 rejects its old OFF fallback after H2 alone publishes ON and A is pruned", async () => {
  vi.useFakeTimers();
  const userA = makeUser("asymmetric-a");
  const userB = makeUser("asymmetric-b");
  const returningA = deferred<ReturnType<typeof setting>>();
  clientMocks.getUserSettingIsolated
    .mockResolvedValueOnce(setting(false))
    .mockResolvedValueOnce(setting(false))
    .mockImplementationOnce(() => returningA.promise);
  const pair = mountHookPair(userA);
  await flush();
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: false });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: false });

  React.act(() => {
    pair.handles[1].setPreferences({ showFieldMetadata: true });
  });
  await flush();
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: true });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: true });

  pair.render(userB);
  await flush();
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: false });
  React.act(() => {
    vi.advanceTimersByTime(30_000);
  });

  pair.render(userA);
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: true });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: true });
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(3);
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: true });

  await React.act(async () => {
    returningA.resolve(setting(false));
    await returningA.promise;
    await Promise.resolve();
  });
  await flush();
  expect(pair.handles[0].current).toEqual({ showFieldMetadata: false });
  expect(pair.handles[1].current).toEqual({ showFieldMetadata: false });
  pair.unmount();
});

test("settlement between layout unmount and passive unsubscribe emits no setter, render, or warning", async () => {
  const user = makeUser("layout-settlement");
  const pending = deferred<ReturnType<typeof setting>>();
  let unsubscriptionsBeforeLayout = -1;
  let unsubscriptionsAtRelease = -1;
  clientMocks.setUserSettingIsolated.mockImplementationOnce(() => pending.promise);
  const mounted = mountHook(user, true, () => {
    unsubscriptionsAtRelease = externalStoreObserver.unsubscriptions;
    pending.resolve(setting(true));
  });
  await flush();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);
  const rendersBeforeLayoutUnmount = mounted.getRenderCount();
  const notificationsBeforeLayoutUnmount = externalStoreObserver.notifications;
  unsubscriptionsBeforeLayout = externalStoreObserver.unsubscriptions;

  mounted.render(user, false);
  await flush();
  expect(unsubscriptionsAtRelease).toBe(unsubscriptionsBeforeLayout);
  expect(externalStoreObserver.unsubscriptions).toBeGreaterThan(unsubscriptionsBeforeLayout);
  expect(externalStoreObserver.notifications).toBe(notificationsBeforeLayoutUnmount);
  expect(mounted.getRenderCount()).toBe(rendersBeforeLayoutUnmount);
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);
  expect(consoleError).not.toHaveBeenCalled();
  mounted.unmount();
});

test("provider A to B aborts active A work and drops its queued PATCH without a Screen consumer", async () => {
  const userA = makeUser("identity-a");
  const userB = makeUser("identity-b");
  const firstWrite = deferred<ReturnType<typeof setting>>();
  let activeSignal: AbortSignal | undefined;
  clientMocks.setUserSettingIsolated.mockImplementationOnce(
    (_key: string, _value: unknown, options: { signal?: AbortSignal }) => {
      activeSignal = options.signal;
      return firstWrite.promise;
    }
  );
  const mounted = mountHook(userA);
  await flush();
  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
    mounted.handle.setPreferences({ showFieldMetadata: false });
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  mounted.render(userA, false);
  mounted.render(userB, false);
  expect(activeSignal?.aborted).toBe(true);
  await React.act(async () => {
    firstWrite.resolve(setting(true));
    await firstWrite.promise;
    await Promise.resolve();
  });
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  mounted.render(userB, true);
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

  mounted.render(userA, true);
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);
  React.act(() => {
    mounted.handle.setPreferences({ showFieldMetadata: true });
  });
  await flush();
  expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(clientMocks.setUserSettingIsolated.mock.calls[1]?.[2]).toEqual(
    expect.objectContaining({ expectedUserId: userA.id })
  );
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });
  mounted.unmount();
});

test("a delayed A read settles in B layout before passive cleanup without stale publication", async () => {
  const userA = makeUser("read-a");
  const userB = makeUser("read-b");
  const readA = deferred<ReturnType<typeof setting>>();
  const readB = deferred<ReturnType<typeof setting>>();
  let unsubscriptionsBeforeBLayout = -1;
  let unsubscriptionsAtBLayout = -1;
  clientMocks.getUserSettingIsolated
    .mockImplementationOnce(() => readA.promise)
    .mockImplementationOnce(() => readB.promise)
    .mockResolvedValueOnce(setting(true));
  const mounted = mountHook(userA, true, undefined, (userId) => {
    if (userId !== userB.id) return;
    unsubscriptionsAtBLayout = externalStoreObserver.unsubscriptions;
    readA.resolve(setting(true));
  });
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(1);
  const rendersBeforeB = mounted.getRenderCount();
  const notificationsBeforeB = externalStoreObserver.notifications;
  unsubscriptionsBeforeBLayout = externalStoreObserver.unsubscriptions;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  mounted.render(userB);
  await flush();
  expect(unsubscriptionsAtBLayout).toBe(unsubscriptionsBeforeBLayout);
  expect(externalStoreObserver.unsubscriptions).toBeGreaterThan(unsubscriptionsBeforeBLayout);
  expect(externalStoreObserver.notifications).toBe(notificationsBeforeB);
  expect(mounted.getRenderCount()).toBe(rendersBeforeB + 1);
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });

  await React.act(async () => {
    readB.resolve(setting(false));
    await readB.promise;
    await Promise.resolve();
  });
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });

  mounted.render(userA);
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(3);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });
  expect(consoleError).not.toHaveBeenCalled();
  mounted.unmount();
});

test("same-mounted A to B to A keeps only the exact pruned A view during refresh", async () => {
  vi.useFakeTimers();
  const userA = makeUser("prune-a");
  const userB = makeUser("prune-b");
  const returningRead = deferred<ReturnType<typeof setting>>();
  clientMocks.getUserSettingIsolated
    .mockResolvedValueOnce(setting(true))
    .mockResolvedValueOnce(setting(false))
    .mockImplementationOnce(() => returningRead.promise);
  const mounted = mountHook(userA);
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });

  mounted.render(userB);
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  React.act(() => {
    vi.advanceTimersByTime(30_000);
  });

  mounted.render(userA);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(3);
  expect(mounted.handle.current).toEqual({ showFieldMetadata: true });

  await React.act(async () => {
    returningRead.resolve(setting(false));
    await returningRead.promise;
    await Promise.resolve();
  });
  await flush();
  expect(mounted.handle.current).toEqual({ showFieldMetadata: false });
  mounted.unmount();
});

test("a brand-new hook after global prune starts default and performs a fresh GET", async () => {
  vi.useFakeTimers();
  const user = makeUser("fresh-after-prune");
  const freshRead = deferred<ReturnType<typeof setting>>();
  clientMocks.getUserSettingIsolated
    .mockResolvedValueOnce(setting(true))
    .mockImplementationOnce(() => freshRead.promise);
  const first = mountHook(user);
  await flush();
  expect(first.handle.current).toEqual({ showFieldMetadata: true });
  first.unmount();
  React.act(() => {
    vi.advanceTimersByTime(30_000);
  });

  const second = mountHook(user);
  expect(second.handle.current).toEqual({ showFieldMetadata: false });
  await flush();
  expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(2);
  await React.act(async () => {
    freshRead.resolve(setting(true));
    await freshRead.promise;
    await Promise.resolve();
  });
  await flush();
  expect(second.handle.current).toEqual({ showFieldMetadata: true });
  second.unmount();
});
