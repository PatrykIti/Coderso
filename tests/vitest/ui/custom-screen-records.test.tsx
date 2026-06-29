import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CustomScreenEntriesPage } from "../../../core/admin/ui/custom-screens/CustomScreenEntriesPage";
import { CustomScreenEntriesTable } from "../../../core/admin/ui/custom-screens/CustomScreenEntriesTable";
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
        blocks: [
          {
            id: "field-1",
            type: "screen-field-value",
            data: {
              label: "Headline",
              value: "Ocean View",
            },
          },
        ],
        bindings: [
          {
            id: "binding-1",
            widgetId: "field-1",
            propPath: "value",
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

const seedCollectionOnlyCache = (storage: ReturnType<typeof createLocalStorage>) => {
  seedCache(storage);
  const savedAt = Date.now();
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
        bindings: [],
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
      path: "/admin/advanced/custom-screens/screen-1/entries",
    });

    expect(html).toContain("Property Catalog");
    expect(html).toContain("Ocean View");
    expect(html).toContain("New");
    expect(html).not.toContain("Open builder");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CustomScreenEntriesTable exposes inline row editing only for writable row bindings", () => {
  const html = renderAdminUi(
    <CustomScreenEntriesTable
      items={[
        {
          id: "entry-1",
          typeId: "type-1",
          title: "Ocean View",
          slug: "ocean-view",
          status: "draft",
          data: { headline: "Ocean View" },
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z",
        },
      ]}
      listView={{
        columns: [
          {
            id: "headline",
            source: "field",
            field: "headline",
            label: "Headline",
            formatter: "text",
            visible: true,
          },
          {
            id: "status",
            source: "system",
            field: "status",
            label: "Status",
            formatter: "text",
            visible: true,
          },
        ],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
        bulkActions: { delete: true, publish: true, unpublish: true },
        rowTemplate: {
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: "row-template",
                type: "section",
                data: { title: "Row" },
                blocks: [
                  { id: "row-headline", type: "field", data: { label: "Headline" } },
                  { id: "row-status", type: "field", data: { label: "Status" } },
                ],
              },
            ],
          },
          bindings: [
            {
              id: "row-headline-value",
              blockId: "row-headline",
              propPath: "value",
              source: "entry",
              field: "headline",
              mode: "readwrite",
            },
            {
              id: "row-status-value",
              blockId: "row-status",
              propPath: "value",
              source: "entry",
              field: "status",
              mode: "read",
            },
          ],
        },
      }}
      buildRowHref={() => "/advanced/custom-screens/screen-1/entries/entry-1"}
      onDelete={() => undefined}
      onCommitRowField={() => undefined}
    />,
    { path: "/admin/advanced/custom-screens/screen-1/entries" }
  );

  expect(html.match(/role="textbox"/g)).toHaveLength(1);
  expect(html).toContain("Ocean View");
  expect(html).toContain("draft");
});

test("CustomScreenEntryEditor renders bound field editor from cached data", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    seedCache(storage);

    const html = renderAdminUi(<CustomScreenEntryEditor />, {
      path: "/admin/advanced/custom-screens/screen-1/entries/entry-1",
    });

    expect(html).toContain("Headline");
    expect(html).toContain("Screen-owned record editor");
    expect(html).toContain("Ocean View");
    expect(html).not.toContain("Bound fields");
    expect(html).not.toContain("Back to records");
    expect(html).not.toContain("Workspace details");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CustomScreenEntriesPage blocks non-ready screens from the active workspace flow", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    seedCollectionOnlyCache(storage);

    const html = renderAdminUi(<CustomScreenEntriesPage />, {
      path: "/admin/advanced/custom-screens/screen-1/entries",
    });

    expect(html).toContain("Workspace upgrade required");
    expect(html).toContain("not yet ready for the dedicated editor workflow");
    expect(html).toContain("/admin/advanced/custom-screens/screen-1/entries/entry-1");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CustomScreenEntryEditor shows upgrade-required state for non-ready screens", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    seedCollectionOnlyCache(storage);

    const html = renderAdminUi(<CustomScreenEntryEditor />, {
      path: "/admin/advanced/custom-screens/screen-1/entries/entry-1",
    });

    expect(html).toContain("Workspace upgrade required");
    expect(html).not.toContain("Save");
    expect(html).not.toContain("Classic editor");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
