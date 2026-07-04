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

test("renders the entry-view builder and the floating-panel canvas", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  // TASK-498-01: the List/Editor segmented toggle is removed — the screen editor
  // is the entry-view BUILDER only. The List/Editor view control is gone.
  expect(html).not.toContain("Editor View");
  expect(html).not.toContain("List View");
  expect(html).toContain("Save");
  expect(html).toContain("Preview");
  // The entry-view authoring canvas is present on initial render (no tab click).
  expect(html).toContain('data-screen-authoring-canvas="true"');
  // TASK-496-02 shell chrome: the panel Hide/Show toggle, the in-content
  // PageHeader title, and the light panel category rail (relocated into the head).
  expect(html).toContain("Hide panel");
  expect(html).toContain("New screen");
  expect(html).toContain('data-screen-toolbar-rail="true"');
  // Restyle regression: the legacy hardcoded amber unsaved pill is gone.
  expect(html).not.toContain("bg-amber-100");
});

test("the entry-view authoring canvas renders without switching a tab", async () => {
  const view = mount("/admin/advanced/custom-screens/new");

  try {
    await flush();
    // No tab click required — the entry-view builder is always on.
    expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).not.toBeNull();
    expect(findButton(view.container, "Editor View")).toBeUndefined();
  } finally {
    view.cleanup();
  }
});
