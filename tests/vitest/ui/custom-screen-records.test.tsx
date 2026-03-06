import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CustomScreenEntriesPage } from "../../../core/admin/ui/custom-screens/CustomScreenEntriesPage";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
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

const seedCache = (storage: ReturnType<typeof createLocalStorage>) => {
  const savedAt = Date.now();
  storage.setItem(
    cacheKeys.contentTypesList,
    JSON.stringify({
      value: [
        {
          id: "type-1",
          name: "Properties",
          slug: "properties",
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
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z",
          entryCount: 1,
        },
      ],
      savedAt,
    })
  );
  storage.setItem(
    cacheKeys.customScreenDetail("screen-1"),
    JSON.stringify({
      value: {
        id: "screen-1",
        name: "Property Catalog",
        contentTypeId: "type-1",
        status: "active",
        showInSidebar: true,
        sidebarLabel: "Catalog",
        schemaVersion: 1,
        blocks: [],
        bindings: [
          {
            id: "binding-1",
            widgetId: "hero-1",
            propPath: "heading.title",
            field: "headline",
            mode: "readwrite",
          },
        ],
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: "2026-03-05T00:00:00.000Z",
      },
      savedAt,
    })
  );
  storage.setItem(
    cacheKeys.entriesList("properties"),
    JSON.stringify({
      value: [
        {
          id: "entry-1",
          typeId: "type-1",
          title: "Ocean View",
          slug: "ocean-view",
          status: "draft",
          data: {
            headline: "Ocean View",
          },
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z",
        },
      ],
      savedAt,
    })
  );
  storage.setItem(
    cacheKeys.entryDetail("properties", "entry-1"),
    JSON.stringify({
      value: {
        id: "entry-1",
        typeId: "type-1",
        title: "Ocean View",
        slug: "ocean-view",
        status: "draft",
        data: {
          headline: "Ocean View",
        },
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: "2026-03-05T00:00:00.000Z",
      },
      savedAt,
    })
  );
};

test("CustomScreenEntriesPage renders cached records", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    seedCache(storage);

    const html = renderAdminUi(<CustomScreenEntriesPage />, {
      path: "/admin/coderso/custom-screens/screen-1/entries",
    });

    expect(html).toContain("Property Catalog Records");
    expect(html).toContain("Ocean View");
    expect(html).toContain("New record");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CustomScreenEntryEditor renders bound field editor from cached data", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    seedCache(storage);

    const html = renderAdminUi(<CustomScreenEntryEditor />, {
      path: "/admin/coderso/custom-screens/screen-1/entries/entry-1",
    });

    expect(html).toContain("Bound fields");
    expect(html).toContain("Headline");
    expect(html).toContain("Classic editor");
    expect(html).toContain("Ocean View");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
