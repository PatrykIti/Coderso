// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";

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

test("TopBar mounts the color-mode toggle and no longer renders the theme switcher", () => {
  const view = mount();
  try {
    const switcher = view.container.querySelector("[data-testid='admin-theme-switcher']");
    const toggle = view.container.querySelector("button[aria-label='Toggle dark mode']");

    // TASK-495-01: AdminThemeSwitcher removed from the TopBar.
    expect(switcher).toBeNull();
    expect(toggle).not.toBeNull();
    // The toggle starts in light mode (Moon shown, click → dark).
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");

    // It still sits in the right-hand action cluster, AFTER the Create button.
    const cluster = toggle?.parentElement ?? null;
    expect(cluster).not.toBeNull();
    const createButton = Array.from(cluster?.querySelectorAll("button") ?? []).find((b) =>
      (b.textContent ?? "").includes("Create")
    );
    expect(createButton).toBeTruthy();
    const children = cluster ? Array.from(cluster.children) : [];
    expect(children.indexOf(toggle as Element)).toBeGreaterThan(
      children.indexOf(createButton as Element)
    );
  } finally {
    view.cleanup();
  }
});
