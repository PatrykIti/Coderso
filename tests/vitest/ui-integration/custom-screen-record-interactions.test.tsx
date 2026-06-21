// @vitest-environment happy-dom

import React from "react";

import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { setActiveAssistantSurfaceContext } from "../../../core/admin/ui/assistant/activeSurfaceContext";
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

const createScreenRecord = () => ({
  id: "screen-1",
  name: "Project Screen",
  contentTypeId: "type-1",
  status: "active" as const,
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
        sections: [
          {
            id: "section-1",
            type: "section",
            data: { title: "Details" },
            blocks: [
              {
                id: "group-1",
                type: "field-group",
                variant: "card",
                data: {
                  title: "Details",
                  description: "Main project fields",
                },
                slots: {
                  content: [
                    {
                      id: "field-1",
                      type: "field",
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
          },
        ],
      },
      bindings: [
        {
          id: "binding-1",
          blockId: "field-1",
          propPath: "value",
          source: "entry" as const,
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
});

let currentScreenRecord = createScreenRecord();

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
  getCachedCustomScreens: vi.fn(() => [currentScreenRecord]),
  listCustomScreensCached: vi.fn(async () => [currentScreenRecord]),
  getCachedCustomScreen: vi.fn(() => currentScreenRecord),
  getCustomScreenCached: vi.fn(async () => currentScreenRecord),
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

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CustomScreenEntryEditor />
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

beforeEach(() => {
  cacheListener = null;
  currentScreenRecord = createScreenRecord();
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

    const parent = view.container.querySelector('[data-screen-block-id="group-1"]');
    const child = view.container.querySelector('[data-screen-block-id="field-1"]');
    expect(parent?.getAttribute("data-selected")).toBe("true");
    expect(child?.getAttribute("data-selected")).toBe("false");

    React.act(() => {
      child?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(parent?.getAttribute("data-selected")).toBe("false");
    expect(child?.getAttribute("data-selected")).toBe("true");
    expect(vi.mocked(setActiveAssistantSurfaceContext).mock.calls.at(-1)?.[0]).toMatchObject({
      selectedBlockId: "field-1",
    });
    expect(view.container.textContent).toContain("Headline");

    expect(child?.querySelector("button")).toBeNull();
    expect(document.body.querySelector("[data-custom-screen-record-value-panel]")).not.toBeNull();
    expect(document.body.textContent).toContain("Value");

    await React.act(async () => {
      cacheListener?.({ key: cacheKeys.customScreenDetail("screen-1") });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      view.container
        .querySelector('[data-screen-block-id="field-1"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("assistant surface uses editorView blocks and bindings even when legacy root copies drift", async () => {
  currentScreenRecord = {
    ...createScreenRecord(),
    blocks: [],
    bindings: [],
  };

  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    expect(vi.mocked(setActiveAssistantSurfaceContext).mock.calls.at(-1)?.[0]).toMatchObject({
      selectedBlockId: "group-1",
      bindings: [
        {
          field: "headline",
          mode: "readwrite",
          propPath: "value",
          widgetId: "field-1",
        },
      ],
      blocks: expect.arrayContaining([
        expect.objectContaining({ id: "group-1", type: "field-group" }),
        expect.objectContaining({ id: "field-1", type: "field" }),
      ]),
    });
  } finally {
    view.cleanup();
  }
});
