// @vitest-environment happy-dom

import React from "react";

import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const contentType = {
  id: "type-1",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      title: {
        type: "string" as const,
        title: "Title",
        xFieldType: "text",
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const createScreenRecord = (): CustomScreenRecord => ({
  id: "screen-1",
  name: "Project Screen",
  contentTypeId: "type-1",
  status: "active" as const,
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: "Projects",
  schemaVersion: 4,
  definition: {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" as const },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry" as const,
      interactionMode: "inline" as const,
      document: {
        schemaVersion: 1 as const,
        sections: [],
      },
      bindings: [],
    },
  },
  blocks: [],
  bindings: [],
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
});

let currentScreenRecord = createScreenRecord();

vi.mock("@/services/customScreensClient", () => ({
  createCustomScreen: vi.fn(),
  updateCustomScreen: vi.fn(),
  getCachedCustomScreens: vi.fn(() => [currentScreenRecord]),
  listCustomScreensCached: vi.fn(async () => [currentScreenRecord]),
  getCachedCustomScreen: vi.fn(() => currentScreenRecord),
  getCustomScreenCached: vi.fn(async () => currentScreenRecord),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [contentType]),
  listContentTypesCached: vi.fn(async () => [contentType]),
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
    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
    }
  });
};

const findButtonByLabel = (container: ParentNode, label: string) =>
  container.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;

beforeEach(() => {
  currentScreenRecord = createScreenRecord();
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("entry-view builder palette exposes screen blocks without page widgets", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // TASK-498-01: the List/Editor toggle is gone — the entry-view builder is
    // always on. Open the Insert palette from the (relocated) category rail.
    React.act(() => {
      findButtonByLabel(view.container, "Insert")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();

    expect(view.container.textContent).toContain("Screen Blocks");
    // The Insert subpanel mounts in the shared `CanvasEditor` docked panel.
    expect(view.container.querySelector("[data-screen-editor-panel]")).not.toBeNull();
    // A1: the 9-chip PaletteChip grid replaces the old per-field list. Assert the
    // rendered chip labels (they render as static text regardless of which kinds
    // TASK-498-02 has wired yet).
    expect(view.container.textContent).toContain("Heading");
    expect(view.container.textContent).toContain("Field");
    expect(view.container.textContent).toContain("Stat");
    expect(view.container.textContent).toContain("Related list");
    expect(view.container.textContent).not.toContain("Hero");
    expect(view.container.textContent).not.toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});

test("entry-view builder keeps legacy blocks visible without exposing page widgets in the library", async () => {
  const baseScreen = createScreenRecord();
  currentScreenRecord = {
    ...baseScreen,
    definition: {
      ...baseScreen.definition!,
      editorView: {
        ...baseScreen.definition!.editorView,
        document: {
          schemaVersion: 1 as const,
          sections: [
            {
              id: "section-1",
              type: "section",
              data: { title: "Details" },
              blocks: [
                {
                  id: "hero-1",
                  type: "legacy-widget",
                  legacyWidgetType: "hero",
                  variant: "centered",
                  data: {
                    headline: "Legacy hero",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        variant: "centered",
        data: {
          headline: "Legacy hero",
        },
      },
    ],
  };

  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    React.act(() => {
      findButtonByLabel(view.container, "Insert")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();

    expect(view.container.textContent).toContain("Legacy block placeholder");
    expect(view.container.textContent).toContain("hero");
    expect(view.container.textContent).toContain("Heading");
    expect(view.container.textContent).not.toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});

test("entry-view builder palette renders without a selected content type", async () => {
  currentScreenRecord = {
    ...createScreenRecord(),
    contentTypeId: "",
  };

  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    React.act(() => {
      findButtonByLabel(view.container, "Insert")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();

    // A1: the 9-chip palette is the sole insert surface — there is no per-field
    // "Fields" list, so no content-type-dependent field placeholder renders. The
    // chip labels render regardless of content-type selection.
    expect(view.container.textContent).toContain("Heading");
    expect(view.container.textContent).toContain("Field");
    expect(view.container.textContent).not.toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});
