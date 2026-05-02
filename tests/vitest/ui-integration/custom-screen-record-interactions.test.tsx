// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
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
      headline: {
        type: "string" as const,
        title: "Headline",
        xFieldType: "text",
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const screenRecord = {
  id: "screen-1",
  name: "Project Screen",
  contentTypeId: "type-1",
  status: "active" as const,
  showInSidebar: true,
  sidebarLabel: "Projects",
  schemaVersion: 3,
  definition: {
    schemaVersion: 3,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" as const },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry" as const,
      interactionMode: "inline" as const,
      blocks: [
        {
          id: "group-1",
          type: "screen-field-group",
          variant: "card",
          data: {
            title: "Details",
            description: "Main project fields",
          },
          slots: {
            content: [
              {
                id: "field-1",
                type: "screen-field-value",
                variant: "stacked",
                data: {
                  label: "Headline",
                  value: "Fallback headline",
                },
              },
            ],
          },
        },
      ],
      bindings: [
        {
          id: "binding-1",
          widgetId: "field-1",
          propPath: "value",
          field: "headline",
          mode: "readwrite" as const,
        },
      ],
    },
  },
  blocks: [
    {
      id: "group-1",
      type: "screen-field-group",
      variant: "card",
      data: {
        title: "Details",
        description: "Main project fields",
      },
      slots: {
        content: [
          {
            id: "field-1",
            type: "screen-field-value",
            variant: "stacked",
            data: {
              label: "Headline",
              value: "Fallback headline",
            },
          },
        ],
      },
    },
  ],
  bindings: [
    {
      id: "binding-1",
      widgetId: "field-1",
      propPath: "value",
      field: "headline",
      mode: "readwrite" as const,
    },
  ],
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const entryDetail = {
  id: "entry-1",
  typeId: "type-1",
  title: "Project Aurora",
  slug: "project-aurora",
  status: "draft" as const,
  data: {
    headline: "Project Aurora",
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

let cacheListener: ((event: { key: string }) => void) | null = null;

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: vi.fn(() => [screenRecord]),
  listCustomScreensCached: vi.fn(async () => [screenRecord]),
  getCachedCustomScreen: vi.fn(() => screenRecord),
  getCustomScreenCached: vi.fn(async () => screenRecord),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [contentType]),
  listContentTypesCached: vi.fn(async () => [contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  getCachedEntryDetail: vi.fn(() => entryDetail),
  getEntryCached: vi.fn(async () => entryDetail),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((handler: (event: { key: string }) => void) => {
    cacheListener = handler;
    return () => {
      cacheListener = null;
    };
  }),
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

  act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CustomScreenEntryEditor />
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
};

const findButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  ) as HTMLButtonElement | undefined;

beforeEach(() => {
  cacheListener = null;
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1/entries/entry-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("record editor keeps child selection scoped and preserves it across refresh", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    const parent = view.container.querySelector('[data-selected-block-id="group-1"]');
    const child = view.container.querySelector('[data-selected-block-id="field-1"]');
    expect(parent?.getAttribute("data-selected")).toBe("true");
    expect(child?.getAttribute("data-selected")).toBe("false");

    act(() => {
      child?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(parent?.getAttribute("data-selected")).toBe("false");
    expect(child?.getAttribute("data-selected")).toBe("true");
    expect(findButton(view.container, "Selected Element")?.getAttribute("data-state")).toBe(
      "active"
    );
    expect(view.container.textContent).toContain("Headline");

    const childEditButton = child?.querySelector("button");
    expect(childEditButton).not.toBeNull();
    act(() => {
      childEditButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(findButton(view.container, "Selected Element")?.getAttribute("data-state")).toBe(
      "active"
    );

    await act(async () => {
      cacheListener?.({ key: cacheKeys.customScreenDetail("screen-1") });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      view.container
        .querySelector('[data-selected-block-id="field-1"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});
