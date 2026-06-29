// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/ui/shared/AdminThemeSwitcher", () => ({
  AdminThemeSwitcher: () => <div data-testid="admin-theme-switcher">Theme</div>,
}));

import { TopBar } from "../../../core/admin/ui/shared/TopBar";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resetMode = () => {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
};

beforeEach(resetMode);
afterEach(resetMode);

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <TopBar />
      </AdminRouterProvider>
    );
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("TopBar mounts the color-mode toggle alongside the theme-profile switcher", () => {
  const view = mount();
  try {
    const switcher = view.container.querySelector("[data-testid='admin-theme-switcher']");
    const toggle = view.container.querySelector("button[aria-label='Toggle dark mode']");

    expect(switcher).not.toBeNull();
    expect(toggle).not.toBeNull();
    // The toggle starts in light mode (Moon shown, click → dark).
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");

    // It sits in the right-hand action cluster, after the profile switcher.
    const cluster = switcher?.parentElement;
    expect(cluster).not.toBeNull();
    expect(cluster?.contains(toggle ?? null)).toBe(true);
    const children = cluster ? Array.from(cluster.children) : [];
    expect(children.indexOf(toggle as Element)).toBeGreaterThan(
      children.indexOf(switcher as Element)
    );
  } finally {
    view.cleanup();
  }
});
