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

const findButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  ) as HTMLButtonElement | undefined;

beforeEach(() => {
  currentScreenRecord = createScreenRecord();
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("Editor View library exposes screen blocks and content fields without page widgets", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    React.act(() => {
      findButton(view.container, "Editor View")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();

    expect(view.container.textContent).toContain("Screen Blocks");
    expect(view.container.textContent).toContain("Record header");
    expect(view.container.textContent).toContain("Field group");
    expect(view.container.textContent).toContain("Two columns");
    expect(view.container.textContent).toContain("Title");
    expect(view.container.textContent).not.toContain("Hero");
    expect(view.container.textContent).not.toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});

test("Editor View keeps legacy blocks visible without exposing page widgets in the library", async () => {
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
      findButton(view.container, "Editor View")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();

    expect(view.container.textContent).toContain("Legacy block placeholder");
    expect(view.container.textContent).toContain("hero");
    expect(view.container.textContent).toContain("Record header");
    expect(view.container.textContent).not.toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});

test("Editor View field library stays empty until a content type is selected", async () => {
  currentScreenRecord = {
    ...createScreenRecord(),
    contentTypeId: "",
  };

  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    React.act(() => {
      findButton(view.container, "Editor View")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();

    expect(view.container.textContent).toContain("Select a content type to add fields.");
    expect(view.container.textContent).toContain("Record header");
    expect(view.container.textContent).not.toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});
