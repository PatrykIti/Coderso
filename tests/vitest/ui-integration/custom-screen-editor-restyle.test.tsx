// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { renderAdminUi } from "../../utils/adminRouterRender";

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => []),
  listContentTypesCached: vi.fn(async () => []),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn(() => () => undefined),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: vi.fn(),
  setActiveAssistantSurfaceContext: vi.fn(),
  useActiveAssistantSurfaceContext: vi.fn(() => null),
}));

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

/**
 * TASK-479-14-L05: presentation guard for the Custom Screen editor restyle
 * (TASK-479-14-L02). Confirms the soft segmented List/Editor view control plus
 * the floating-panel authoring canvas, while the existing builder behaviour
 * (tab switching into the entry-view authoring canvas) stays wired.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CustomScreenEditorPage />
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

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
};

const findButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === label
  );

afterEach(() => {
  document.body.innerHTML = "";
});

test("renders the soft segmented view control and the floating-panel canvas", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  expect(html).toContain("List View");
  expect(html).toContain("Editor View");
  expect(html).toContain("aria-pressed");
  expect(html).toContain("Save");
  expect(html).toContain("Preview");
  expect(html).toContain('data-authoring-floating-toolbar="true"');
  // Restyle regression: the legacy hardcoded amber unsaved pill is gone.
  expect(html).not.toContain("bg-amber-100");
});

test("switching to the Editor View tab reveals the entry-view authoring canvas", async () => {
  const view = mount("/admin/advanced/custom-screens/new");

  try {
    await flush();
    expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();

    React.act(() => {
      findButton(view.container, "Editor View")?.click();
    });
    await flush();

    expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});
