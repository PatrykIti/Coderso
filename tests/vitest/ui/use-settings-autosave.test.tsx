// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  SettingsDirtyNavigationProvider,
  useRegisterSettingsDirty,
  useSettingsDirtyNavigation,
} from "../../../core/admin/ui/settings/SettingsDirtyNavigation";
import {
  useAutoSaveEffect,
  useSettingsAutoSave,
} from "../../../core/admin/ui/settings/useSettingsAutoSave";

const STORAGE_KEY = "coderso.settings.autosave";
const LEGACY_STORAGE_KEY = "nextless.settings.autosave";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

function AutoSaveToggleHarness() {
  const { enabled, setEnabled } = useSettingsAutoSave();
  return (
    <div>
      <span data-testid="autosave-enabled">{String(enabled)}</span>
      <button type="button" onClick={() => setEnabled(!enabled)}>
        toggle-autosave
      </button>
    </div>
  );
}

type AutoSaveEffectHarnessProps = {
  value: string;
  enabled?: boolean;
  isReady?: boolean;
  hasErrors?: boolean;
  savedValue?: string;
  syncSnapshotWhenBlocked?: boolean;
  onSave: () => Promise<boolean> | boolean;
  delayMs?: number;
};

function AutoSaveEffectHarness({
  value,
  enabled = true,
  isReady = true,
  hasErrors = false,
  savedValue,
  syncSnapshotWhenBlocked = false,
  onSave,
  delayMs = 800,
}: AutoSaveEffectHarnessProps) {
  useAutoSaveEffect({
    enabled,
    isReady,
    hasErrors,
    value,
    savedValue,
    onSave,
    delayMs,
    syncSnapshotWhenBlocked,
  });
  return <span data-testid="autosave-value">{value}</span>;
}

const advanceTimers = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

type EffectHarnessProps = Omit<AutoSaveEffectHarnessProps, "onSave">;

function mountEffect(initial: EffectHarnessProps, onSave: AutoSaveEffectHarnessProps["onSave"]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (props: EffectHarnessProps) =>
    act(() => {
      root.render(<AutoSaveEffectHarness {...props} onSave={onSave} />);
    });
  render(initial);
  mountedRoots.push({ root, container });
  return {
    rerender: render,
    cleanup: () => cleanupRoot(root, container),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

test("useSettingsAutoSave defaults to disabled without stored preference", () => {
  const view = mount(<AutoSaveToggleHarness />);
  try {
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "false"
    );
  } finally {
    view.cleanup();
  }
});

test("useSettingsAutoSave reads the current and legacy storage keys", () => {
  window.localStorage.setItem(STORAGE_KEY, "true");
  const current = mount(<AutoSaveToggleHarness />);
  try {
    expect(current.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "true"
    );
  } finally {
    current.cleanup();
  }

  window.localStorage.clear();
  window.localStorage.setItem(LEGACY_STORAGE_KEY, "true");
  const legacy = mount(<AutoSaveToggleHarness />);
  try {
    expect(legacy.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "true"
    );
  } finally {
    legacy.cleanup();
  }
});

test("useSettingsAutoSave persists toggles and broadcasts the custom event", () => {
  const listener = vi.fn<(event: Event) => void>();
  window.addEventListener("settings:autosave", listener);
  const view = mount(<AutoSaveToggleHarness />);
  try {
    const button = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "toggle-autosave"
    );
    listener.mockClear();
    act(() => {
      button?.click();
    });
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "true"
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0][0] as CustomEvent<{ enabled: boolean }>).detail;
    expect(detail.enabled).toBe(true);

    act(() => {
      button?.click();
    });
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "false"
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  } finally {
    view.cleanup();
  }
  window.removeEventListener("settings:autosave", listener);
});

test("useSettingsAutoSave reacts to cross-tab storage and custom events", () => {
  const view = mount(<AutoSaveToggleHarness />);
  try {
    const makeStorageEvent = (key: string, newValue: string | null) => {
      const event = new Event("storage");
      Object.defineProperty(event, "key", { value: key });
      Object.defineProperty(event, "newValue", { value: newValue });
      window.dispatchEvent(event);
    };

    act(() => {
      makeStorageEvent("unrelated.key", "true");
    });
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "false"
    );

    act(() => {
      makeStorageEvent(STORAGE_KEY, "true");
    });
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "true"
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("settings:autosave", { detail: { enabled: false } }));
    });
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "false"
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("settings:autosave", { detail: {} }));
    });
    expect(view.container.querySelector('[data-testid="autosave-enabled"]')?.textContent).toBe(
      "false"
    );
  } finally {
    view.cleanup();
  }
});

test("useAutoSaveEffect never saves while disabled or not ready", async () => {
  const onSave = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const disabled = mount(<AutoSaveEffectHarness value="a" enabled={false} onSave={onSave} />);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    disabled.cleanup();
  }

  const notReady = mount(<AutoSaveEffectHarness value="a" isReady={false} onSave={onSave} />);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    notReady.cleanup();
  }
});

test("useAutoSaveEffect treats a matching saved snapshot as synced", async () => {
  const onSave = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const view = mountEffect({ value: "a", savedValue: "a" }, onSave);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "b", savedValue: "a" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender({ value: "b", savedValue: "b" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("useAutoSaveEffect skips a save while errors are present and cancels pending ones", async () => {
  const onSave = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const view = mountEffect({ value: "a", hasErrors: true }, onSave);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "b", hasErrors: true });
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.cleanup();
    const pending = mountEffect({ value: "a" }, onSave);
    try {
      await advanceTimers(5000);
      pending.rerender({ value: "b" });
      await advanceTimers(100);
      pending.rerender({ value: "b", hasErrors: true });
      await advanceTimers(5000);
      expect(onSave).not.toHaveBeenCalled();
    } finally {
      pending.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("useAutoSaveEffect syncs the baseline snapshot when blocked by errors", async () => {
  const onSave = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const view = mountEffect({ value: "a", hasErrors: true, syncSnapshotWhenBlocked: true }, onSave);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "a" });
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "b" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("useAutoSaveEffect saves only after the second distinct value", async () => {
  const onSave = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const view = mountEffect({ value: "a" }, onSave);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "b" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender({ value: "b", isReady: false });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender({ value: "b" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("useAutoSaveEffect does not advance lastSaved when the save reports false", async () => {
  const onSave = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
  const view = mountEffect({ value: "a" }, onSave);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "b" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender({ value: "c" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }
});

test("useAutoSaveEffect retries after a save throws", async () => {
  const onSave = vi
    .fn<() => Promise<boolean>>()
    .mockRejectedValueOnce(new Error("save failed"))
    .mockResolvedValue(true);
  const view = mountEffect({ value: "a" }, onSave);
  try {
    await advanceTimers(5000);
    expect(onSave).not.toHaveBeenCalled();

    view.rerender({ value: "b" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender({ value: "c" });
    await advanceTimers(5000);
    expect(onSave).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }
});

test("useSettingsDirtyNavigation falls back to a permissive guard outside the provider", () => {
  const view = mount(<DirtyFallbackProbe />);
  try {
    expect(view.container.textContent).toContain("fallback-dirty:false");
    expect(view.container.textContent).toContain("fallback-allowed:true");
  } finally {
    view.cleanup();
  }
});

test("SettingsDirtyNavigation registers, clears, and emits dirty state changes", () => {
  const view = mount(
    <SettingsDirtyNavigationProvider>
      <DirtyProbe initialDirty={false} />
    </SettingsDirtyNavigationProvider>
  );
  try {
    expect(view.container.textContent).toContain("dirty:false");
    view.cleanup();
    const dirty = mount(
      <SettingsDirtyNavigationProvider>
        <DirtyProbe initialDirty={true} />
      </SettingsDirtyNavigationProvider>
    );
    try {
      expect(dirty.container.textContent).toContain("dirty:true");
      dirty.cleanup();
      const toggled = mount(
        <SettingsDirtyNavigationProvider>
          <DirtyProbe initialDirty={true} setToClean />
        </SettingsDirtyNavigationProvider>
      );
      try {
        const makeClean = Array.from(toggled.container.querySelectorAll("button")).find(
          (candidate) => candidate.textContent?.trim() === "make-clean"
        );
        act(() => {
          makeClean?.click();
        });
        expect(toggled.container.textContent).toContain("dirty:false");
      } finally {
        toggled.cleanup();
      }
    } finally {
      dirty.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

function DirtyFallbackProbe() {
  const { isDirty, requestNavigation } = useSettingsDirtyNavigation();
  return (
    <div>
      <span>{`fallback-dirty:${isDirty}`}</span>
      <span>{`fallback-allowed:${String(requestNavigation("/admin/settings"))}`}</span>
    </div>
  );
}

function DirtyProbe({
  initialDirty,
  setToClean = false,
}: {
  initialDirty: boolean;
  setToClean?: boolean;
}) {
  const [dirty, setDirty] = React.useState(initialDirty);
  const { isDirty } = useSettingsDirtyNavigation();
  useRegisterSettingsDirty(dirty);
  return (
    <div>
      <span>{`dirty:${isDirty}`}</span>
      {setToClean ? (
        <button type="button" onClick={() => setDirty(false)}>
          make-clean
        </button>
      ) : null}
    </div>
  );
}
