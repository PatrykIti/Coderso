// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { CustomScreenListPage } from "../../../core/admin/ui/custom-screens/CustomScreenListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("CustomScreenListPage renders shell and loading state", () => {
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toContain("Screens");
  expect(html).toContain("New screen");
  expect(html).toContain("Loading screens");
  expect(html).toContain("Search custom screens");
});

test("CustomScreenListPage renders cached screens without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.customScreensList,
      JSON.stringify({
        value: [
          {
            id: "screen-1",
            name: "Cached screen",
            contentTypeId: "type-1",
            status: "draft",
            showInSidebar: true,
            sidebarLabel: "Catalog",
            schemaVersion: 1,
            blocks: [],
            bindings: [],
            createdAt: "2026-03-05T00:00:00.000Z",
            updatedAt: "2026-03-05T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<CustomScreenListPage />, {
      path: "/admin/advanced/custom-screens",
    });

    expect(html).toContain("Cached screen");
    expect(html).toContain("Sidebar label:");
    expect(html).toContain("Catalog");
    expect(html).not.toContain("Loading screens");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CustomScreenEditorPage renders builder controls in create mode", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  expect(html).toContain("Save");
  // TASK-498-01: the List/Editor toggle + list-view editor surface are removed —
  // the editor is the always-on entry-view builder.
  expect(html).not.toContain("List View");
  expect(html).not.toContain("Editor View");
  expect(html).toContain('data-screen-authoring-canvas="true"');
  // TASK-496-02: shared `CanvasEditor` shell sub-toolbar (panel toggle + light
  // panel rail, relocated into the panel head) replaces the retired dark toolbar.
  expect(html).toContain('data-screen-toolbar-rail="true"');
  expect(html).toContain("Hide panel");
  // Screen-level settings stay reachable via the entry-view rail's Settings
  // category (aria-label="Settings"). The list-only "List settings" panel is gone.
  expect(html).not.toContain('aria-label="List settings"');
  expect(html).toContain('aria-label="Settings"');
  expect(html).toContain("Preview");
  expect(html).not.toContain("Selected Column");
});

test("CustomScreenListPage renders list shell", () => {
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toContain("Screens");
  expect(html).toContain("New screen");
});

test("CustomScreenEditorPage renders builder canvas and save action", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  expect(html).toContain("Save");
  // TASK-498-01: List/Editor toggle removed.
  expect(html).not.toContain("List View");
  expect(html).not.toContain("Editor View");
  expect(html).toContain("Preview");
  expect(html).not.toContain("Open records");
  expect(html).not.toContain("Back to list");
});

test("CustomScreenEditorPage tolerates cached stale screen bindings on read", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    const savedAt = Date.now();
    storage.setItem(
      cacheKeys.contentTypesList,
      JSON.stringify({
        value: [
          {
            id: "type-1",
            name: "Projects",
            slug: "projects",
            status: "published",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                headline: {
                  type: "string",
                  title: "Headline",
                  xFieldType: "text",
                },
              },
            },
            createdAt: "2026-05-03T00:00:00.000Z",
            updatedAt: "2026-05-03T00:00:00.000Z",
          },
        ],
        savedAt,
      })
    );
    storage.setItem(
      cacheKeys.customScreenDetail("screen-legacy"),
      JSON.stringify({
        value: {
          id: "screen-legacy",
          name: "Legacy Header Screen",
          contentTypeId: "type-1",
          status: "active",
          showInSidebar: true,
          sidebarLabel: "Projects",
          schemaVersion: 3,
          definition: {
            schemaVersion: 3,
            listView: {
              columns: [],
              filters: [],
              defaultSort: { field: "updatedAt", direction: "desc" },
              bulkActions: { delete: true, publish: true, unpublish: true },
            },
            editorView: {
              saveMode: "entry",
              interactionMode: "inline",
              blocks: [{ id: "header-1", type: "screen-record-header", data: {} }],
              bindings: [
                {
                  id: "binding-1",
                  widgetId: "header-1",
                  propPath: "title",
                  field: "headline",
                  mode: "readwrite",
                },
              ],
            },
          },
          blocks: [{ id: "header-1", type: "screen-record-header", data: {} }],
          bindings: [
            {
              id: "binding-1",
              widgetId: "header-1",
              propPath: "title",
              field: "headline",
              mode: "readwrite",
            },
          ],
          createdAt: "2026-05-03T00:00:00.000Z",
          updatedAt: "2026-05-03T00:00:00.000Z",
        },
        savedAt,
      })
    );

    const html = renderAdminUi(<CustomScreenEditorPage />, {
      path: "/admin/advanced/custom-screens/screen-legacy",
    });

    expect(html).toContain("Legacy Header Screen");
    expect(html).toContain("Preview");
    // TASK-498-01: List/Editor toggle removed (entry-view builder only).
    expect(html).not.toContain("List View");
    // TASK-496-02: shared `CanvasEditor` shell sub-toolbar replaces the retired
    // dark floating toolbar.
    expect(html).toContain('data-screen-toolbar-rail="true"');
    expect(html).not.toContain("Selected Column");
    expect(html).not.toContain("custom_screen_definition_invalid");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
