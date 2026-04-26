import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { CustomScreenListPage } from "../../../core/admin/ui/custom-screens/CustomScreenListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
    path: "/admin/coderso/custom-screens",
  });

  expect(html).toContain("Custom Screens");
  expect(html).toContain("New");
  expect(html).toContain("Loading custom screens");
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
      path: "/admin/coderso/custom-screens",
    });

    expect(html).toContain("Cached screen");
    expect(html).toContain("Sidebar label:");
    expect(html).toContain("Catalog");
    expect(html).not.toContain("Loading custom screens");
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
    path: "/admin/coderso/custom-screens/new",
  });

  expect(html).toContain("Create screen");
  expect(html).toContain("Bindings");
  expect(html).toContain("Sidebar shortcut");
  expect(html).toContain("Sidebar label");
  expect(html).toContain("Screen name");
  expect(html).toContain("Screen canvas");
  expect(html).toContain("Back to list");
  expect(html).toContain("Screen Record Header");
  expect(html).toContain("Screen Field Value");
  expect(html).toContain("Build your custom screen");
  expect(html).not.toContain(">Hero<");
});

test("CustomScreenListPage renders list shell", () => {
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/coderso/custom-screens",
  });

  expect(html).toContain("Custom Screens");
  expect(html).toContain("New");
});

test("CustomScreenEditorPage renders builder canvas and save action", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/coderso/custom-screens/new",
  });

  expect(html).toContain("Create screen");
  expect(html).toContain("Screen canvas");
  expect(html).toContain("Drag dedicated screen widgets");
  expect(html).toContain("Builder");
  expect(html).toContain("Preview");
});
