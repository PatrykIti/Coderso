// @vitest-environment happy-dom
//
// TASK-105-08-09 (L09) shared-a: storage-fallback branches for the admin color
// mode toggle. The happy paths (class flip, persistence, pre-paint seeding) are
// covered by `tests/vitest/ui-integration/admin-color-mode-toggle.test.tsx` and
// the SSR guard by `admin-color-mode-ssr.test.ts`; this suite pins what happens
// when browser storage is unavailable or broken: private-mode access throwing,
// getItem/setItem failures — the mode must still apply visibly and never crash.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";

import {
  ADMIN_COLOR_MODE_STORAGE_KEY,
  AdminColorModeToggle,
  applyStoredColorMode,
  readInitialMode,
} from "../../../core/admin/ui/shared/AdminColorModeToggle";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Restore = () => void;

const resetMode = () => {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
};

beforeEach(resetMode);
afterEach(resetMode);

const mountToggle = (className?: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<AdminColorModeToggle className={className} />);
  });

  return {
    container,
    button: () => container.querySelector<HTMLButtonElement>("button"),
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const clickToggle = (view: ReturnType<typeof mountToggle>) => {
  const button = view.button();
  if (!button) throw new Error("Missing color mode toggle");
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

/** Replace `window.localStorage` wholesale; the restore fn puts back whatever was there. */
const stubStorage = (storage: Partial<Storage>): Restore => {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  const shim = storage as Storage;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => shim,
  });
  return () => {
    if (original) {
      Object.defineProperty(window, "localStorage", original);
    } else {
      Reflect.deleteProperty(window, "localStorage");
    }
  };
};

/** Make even READING `window.localStorage` throw (private-mode / disabled storage). */
const blockStorageAccess = (): Restore => {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage blocked");
    },
  });
  return () => {
    if (original) {
      Object.defineProperty(window, "localStorage", original);
    } else {
      Reflect.deleteProperty(window, "localStorage");
    }
  };
};

test("with storage access blocked, modes still resolve to light and toggling stays in-memory", () => {
  const restore = blockStorageAccess();
  try {
    // Readers fall back instead of crashing on the inaccessible accessor.
    expect(readInitialMode()).toBe("light");
    expect(applyStoredColorMode()).toBe("light");

    const view = mountToggle("mx-2");
    try {
      expect(view.button()?.getAttribute("aria-pressed")).toBe("false");

      clickToggle(view);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
      expect(view.button()?.getAttribute("aria-pressed")).toBe("true");
      expect(view.button()?.className).toContain("mx-2");

      clickToggle(view);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    } finally {
      view.cleanup();
    }
  } finally {
    restore();
  }
});

test("a throwing getItem reads as light for both the hook init and the pre-paint twin", () => {
  let getItemAttempts = 0;
  const restore = stubStorage({
    getItem(key: string) {
      if (key === ADMIN_COLOR_MODE_STORAGE_KEY) {
        getItemAttempts += 1;
        throw new Error("getItem denied");
      }
      return null;
    },
    setItem: () => undefined,
  });

  try {
    expect(readInitialMode()).toBe("light");
    expect(applyStoredColorMode()).toBe("light");
    expect(getItemAttempts).toBeGreaterThanOrEqual(2);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  } finally {
    restore();
  }
});

test("a failing setItem does not prevent the visible dark/light flip", () => {
  let setItemAttempts = 0;
  const restore = stubStorage({
    getItem: (key: string) => (key === ADMIN_COLOR_MODE_STORAGE_KEY ? null : null),
    setItem() {
      setItemAttempts += 1;
      throw new Error("quota exceeded");
    },
  });

  try {
    const view = mountToggle();
    try {
      // The mount effect syncs the initial "light" mode to storage (1 attempt),
      // so the first toggle is the second write. All writes fail without
      // preventing the visible flip.
      clickToggle(view);
      expect(setItemAttempts).toBe(2);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(view.button()?.getAttribute("aria-pressed")).toBe("true");

      clickToggle(view);
      expect(setItemAttempts).toBe(3);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    } finally {
      view.cleanup();
    }
  } finally {
    restore();
  }
});

test("the DOM dark class wins as the initial mode at mount", () => {
  // Pre-paint seeding: the html class reflects persisted storage before React
  // mounts, so readInitialMode must honor it as the source of truth.
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");

  try {
    expect(readInitialMode()).toBe("dark");

    const view = mountToggle();
    try {
      expect(view.button()?.getAttribute("aria-pressed")).toBe("true");
      // The mount effect re-applies the dark class (idempotent), keeping the
      // whole shell recolored through the injected :root.dark tokens.
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      view.cleanup();
    }
  } finally {
    resetMode();
  }
});

test("applyStoredColorMode seeds the dark class from a persisted value without writing back", () => {
  const writes: string[] = [];
  const restore = stubStorage({
    getItem: (key: string) => (key === ADMIN_COLOR_MODE_STORAGE_KEY ? "dark" : null),
    setItem(_key: string, value: string) {
      writes.push(value);
    },
  });

  try {
    document.documentElement.classList.remove("light");
    const resolved = applyStoredColorMode();

    expect(resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    // Read-only by contract: seeding must not persist anything itself.
    expect(writes).toEqual([]);
  } finally {
    restore();
  }
});
