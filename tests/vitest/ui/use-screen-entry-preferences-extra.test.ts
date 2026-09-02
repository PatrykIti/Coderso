// @vitest-environment happy-dom

// TASK-105-08-04 (Item I): useScreenEntryPreferences residual branches —
// queued-write tails, prune re-entry while listeners/reads are active, and
// optimistic marker cleanup after a superseded write settles.

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AuthUser } from "../../../core/admin/services/authClient";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import {
  DEFAULT_SCREEN_ENTRY_PREFERENCES,
  useScreenEntryPreferences,
  type ScreenEntryPreferences,
} from "../../../core/admin/ui/custom-screens/hooks/useScreenEntryPreferences";
import { toScreenEntryPreferencesSetting } from "../../../core/services/settings/screenEntryPreferencesContract";

const clientMocks = vi.hoisted(() => ({
  getUserSettingIsolated: vi.fn(),
  setUserSettingIsolated: vi.fn(),
}));

vi.mock("@/services/userSettingsClient", () => clientMocks);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HookHandle = {
  current: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
};

const adminAuthProviderProps = (
  user: AuthUser | null,
  children: React.ReactNode
): React.ComponentProps<typeof AdminAuthProvider> => ({ user, children });

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
  });
};

const mountHook = (initialUser: AuthUser | null, initialVisible = true) => {
  const handle: HookHandle = {
    current: DEFAULT_SCREEN_ENTRY_PREFERENCES,
    setPreferences: () => undefined,
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  let mounted = true;

  function Probe() {
    const result = useScreenEntryPreferences();
    handle.current = result.preferences;
    handle.setPreferences = result.setPreferences;
    return null;
  }

  const render = (user: AuthUser | null, visible = true) => {
    const children = visible ? React.createElement(Probe) : null;
    React.act(() => {
      root.render(React.createElement(AdminAuthProvider, adminAuthProviderProps(user, children)));
    });
  };
  render(initialUser, initialVisible);

  return {
    handle,
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

test("rapid same-user writes queue on the previous tail", async () => {
  const user = makeUser();
  const view = mountHook(user);
  try {
    await flush();

    React.act(() => {
      view.handle.setPreferences({ showFieldMetadata: true });
      view.handle.setPreferences({ showFieldMetadata: false });
    });
    await flush();

    expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
    expect(toScreenEntryPreferencesSetting(view.handle.current)).toEqual({
      version: 1,
      showFieldMetadata: false,
    });
  } finally {
    view.unmount();
  }
});

test("prune timer defers while a coordinated read is still pending", async () => {
  vi.useFakeTimers();
  const user = makeUser();

  // First consumer hydrates normally, so the coordinator has published state.
  const view = mountHook(user);
  await flush();
  expect(view.handle.current).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);

  // Leaving with hydrated state schedules the prune timer.
  view.unmount();
  vi.advanceTimersByTime(10_000);

  // A second consumer resubscribes (cancelling that timer) with a read that
  // stays pending, then leaves again: the prune is rescheduled while the read
  // is still in flight, so firing it re-schedules instead of pruning (127-129).
  const readGate = deferred<unknown>();
  clientMocks.getUserSettingIsolated.mockImplementationOnce(() => readGate.promise);
  const second = mountHook(user);
  await flush();
  second.unmount();
  vi.advanceTimersByTime(30_000);
  await flush();
  vi.advanceTimersByTime(30_000);
  await flush();

  // Resolving the pending read lets its cleanup schedule the real prune.
  await React.act(async () => {
    readGate.resolve(setting(false));
  });
  vi.advanceTimersByTime(30_000);
  await flush();

  // A fresh consumer starts from defaults and performs a fresh GET.
  const third = mountHook(user);
  try {
    await flush();
    expect(clientMocks.getUserSettingIsolated).toHaveBeenCalledTimes(3);
    expect(third.handle.current).toEqual(DEFAULT_SCREEN_ENTRY_PREFERENCES);
  } finally {
    third.unmount();
  }
});

test("effect loop bails when a late consumer unmounts during a pending write", async () => {
  const user = makeUser();
  const writeGate = deferred<unknown>();
  clientMocks.setUserSettingIsolated.mockImplementationOnce(() => writeGate.promise);

  // Consumer A hydrates, then queues a write whose transport stays pending.
  const first = mountHook(user);
  try {
    await flush();
    React.act(() => {
      first.handle.setPreferences({ showFieldMetadata: true });
    });
    await flush();
    expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(1);

    // Consumer B mounts while the write tail is pending: its effect loop
    // awaits that tail. Unmounting B marks its loop inactive.
    const second = mountHook(user);
    second.unmount();
    await React.act(async () => {
      writeGate.resolve({
        key: "customScreens.entry.preferences",
        value: { version: 1, showFieldMetadata: true },
      });
    });
    await flush();
    // B's loop bailed (line 451); the settled write leaves A's optimistic
    // marker in place for the now-latest generation.
    expect(first.handle.current).toEqual({ showFieldMetadata: true });
  } finally {
    first.unmount();
  }
});

test("superseded write settles and clears its optimistic marker", async () => {
  const user = makeUser();
  const firstWrite = deferred<unknown>();
  clientMocks.setUserSettingIsolated.mockImplementationOnce(() => firstWrite.promise);

  const view = mountHook(user);
  try {
    await flush();

    React.act(() => {
      view.handle.setPreferences({ showFieldMetadata: true });
    });
    await flush();
    // First write is pending; a second write supersedes it.
    React.act(() => {
      view.handle.setPreferences({ showFieldMetadata: false });
    });
    await flush();

    await React.act(async () => {
      firstWrite.resolve({
        key: "customScreens.entry.preferences",
        value: { version: 1, showFieldMetadata: true },
      });
    });
    await flush();

    expect(clientMocks.setUserSettingIsolated).toHaveBeenCalledTimes(2);
    expect(view.handle.current).toEqual({ showFieldMetadata: false });
  } finally {
    view.unmount();
  }
});
