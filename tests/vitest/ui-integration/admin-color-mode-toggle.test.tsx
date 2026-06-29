// @vitest-environment happy-dom

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

const resetMode = () => {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
};

beforeEach(resetMode);
afterEach(resetMode);

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminColorModeToggle />);
  });
  return {
    container,
    button: () => container.querySelector("button"),
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("readInitialMode returns 'dark' when <html> already carries the dark class", () => {
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
  expect(readInitialMode()).toBe("dark");

  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
  expect(readInitialMode()).toBe("light");
});

test("readInitialMode falls back to stored value when no class is present", () => {
  document.documentElement.classList.remove("dark", "light");
  window.localStorage.setItem(ADMIN_COLOR_MODE_STORAGE_KEY, "dark");
  expect(readInitialMode()).toBe("dark");
});

test("lazy-inits from the pre-paint dark class without a flash to light", () => {
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
  const view = mount();
  try {
    // Sun icon is shown in dark mode (click would go to light); aria-pressed=true.
    expect(view.button()?.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("clicking the toggle flips the <html> dark/light class and persists the choice", () => {
  const view = mount();
  try {
    expect(view.button()?.getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    React.act(() => {
      view.button()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(view.button()?.getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem(ADMIN_COLOR_MODE_STORAGE_KEY)).toBe("dark");

    React.act(() => {
      view.button()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(window.localStorage.getItem(ADMIN_COLOR_MODE_STORAGE_KEY)).toBe("light");
  } finally {
    view.cleanup();
  }
});

test("applyStoredColorMode sets the dark class synchronously from a seeded value (no flash)", () => {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
  window.localStorage.setItem(ADMIN_COLOR_MODE_STORAGE_KEY, "dark");

  const resolved = applyStoredColorMode();

  expect(resolved).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(document.documentElement.classList.contains("light")).toBe(false);
});
