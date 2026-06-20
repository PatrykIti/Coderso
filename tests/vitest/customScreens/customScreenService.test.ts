import { afterEach, expect, test, vi } from "vitest";

const mockDb = vi.hoisted(() => {
  const state = {
    selectRows: [] as Array<Record<string, unknown>>,
    insertRows: [] as Array<Record<string, unknown>>,
    updateRows: [] as Array<Record<string, unknown>>,
    deleteRows: [] as Array<Record<string, unknown>>,
    lastInsertValues: null as Record<string, unknown> | null,
    lastUpdateValues: null as Record<string, unknown> | null,
  };

  return {
    state,
    reset() {
      state.selectRows = [];
      state.insertRows = [];
      state.updateRows = [];
      state.deleteRows = [];
      state.lastInsertValues = null;
      state.lastUpdateValues = null;
    },
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(async () => mockDb.state.selectRows),
          where: vi.fn(async () => mockDb.state.selectRows),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((input: Record<string, unknown>) => {
          mockDb.state.lastInsertValues = input;
          return {
            returning: vi.fn(async () => mockDb.state.insertRows),
          };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn((input: Record<string, unknown>) => {
          mockDb.state.lastUpdateValues = input;
          return {
            where: vi.fn(() => ({
              returning: vi.fn(async () => mockDb.state.updateRows),
            })),
          };
        }),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => mockDb.state.deleteRows),
        })),
      })),
    },
  };
});

vi.mock("../../../core/db/client", () => ({
  db: mockDb.db,
}));

import {
  createCustomScreen,
  deleteCustomScreen,
  getCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../../../core/services/customScreens/customScreenService";

const createRow = (overrides: Record<string, unknown> = {}) => ({
  id: "screen-1",
  name: "Catalog",
  contentTypeId: "products",
  status: "active",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: " Catalog ",
  schemaVersion: 1,
  blocks: [{ id: "field-1", type: "screen-field-value", data: {} }],
  bindings: [
    {
      widgetId: "field-1",
      propPath: "value",
      field: "name",
      mode: "readwrite",
    },
  ],
  createdAt: new Date("2026-03-06T10:00:00.000Z"),
  updatedAt: new Date("2026-03-06T11:00:00.000Z"),
  ...overrides,
});

afterEach(() => {
  mockDb.reset();
});

test("listCustomScreens maps normalized custom screen records", async () => {
  mockDb.state.selectRows = [createRow()];

  const result = await listCustomScreens();

  expect(result).toHaveLength(1);
  expect(result[0]?.id).toBe("screen-1");
  expect(result[0]?.bindings[0]?.id).toBe("field-1-value");
  expect(result[0]?.sidebarLabel).toBe(" Catalog ");
  expect(result[0]?.capabilities.mode).toBe("editor");
});

test("listCustomScreens falls back to legacy blocks and bindings when persisted definition is unreadable", async () => {
  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 2,
      definition: null,
      blocks: [{ id: "section-1", type: "section", data: {} }],
      bindings: [
        {
          widgetId: "section-1",
          propPath: "title",
          field: "name",
          mode: "readwrite",
        },
      ],
    }),
  ];

  const result = await listCustomScreens();

  expect(result).toHaveLength(1);
  expect(result[0]?.schemaVersion).toBe(4);
  expect(result[0]?.blocks[0]).toMatchObject({
    id: "section-1",
    type: "section",
  });
  expect(result[0]?.definition.editorView.document.sections[0]).toMatchObject({
    id: "section-1",
    type: "legacy-widget",
    legacyWidgetType: "section",
  });
  expect(result[0]?.capabilities.mode).toBe("dashboard");
});

test("getCustomScreen returns null when the row is missing", async () => {
  await expect(getCustomScreen("missing")).resolves.toBeNull();
});

test("createCustomScreen normalizes defaults, sidebar config, and definitions", async () => {
  mockDb.state.insertRows = [
    createRow({ status: "draft", showInSidebar: true, sidebarLabel: "Catalog Tools" }),
  ];

  const result = await createCustomScreen({
    name: "  Catalog Tools  ",
    contentTypeId: "  products  ",
    showInSidebar: true,
    sidebarLabel: "  Catalog Tools  ",
    collectionRole: "canonical-admin-screen",
    compositionKey: "catalog-tools",
    blocks: [{ id: "section-1", type: "section", data: {} }],
    bindings: [
      {
        id: "binding-1",
        widgetId: "section-1",
        propPath: "title",
        field: "name",
        mode: "read",
      },
    ],
  });

  expect(mockDb.state.lastInsertValues).toMatchObject({
    name: "Catalog Tools",
    contentTypeId: "products",
    status: "draft",
    collectionRole: "canonical-admin-screen",
    compositionKey: "catalog-tools",
    showInSidebar: true,
    sidebarLabel: "Catalog Tools",
    schemaVersion: 4,
    definition: {
      schemaVersion: 4,
      editorView: {
        document: {
          schemaVersion: 1,
          sections: [
            expect.objectContaining({
              id: "section-1",
              type: "legacy-widget",
              legacyWidgetType: "section",
            }),
          ],
        },
        bindings: [
          {
            id: "binding-1",
            blockId: "section-1",
            propPath: "title",
            source: "entry",
            field: "name",
            mode: "read",
          },
        ],
        saveMode: "entry",
        interactionMode: "inline",
      },
      listView: expect.objectContaining({
        defaultSort: { field: "updatedAt", direction: "desc" },
      }),
    },
    blocks: [expect.objectContaining({ id: "section-1", type: "section" })],
    bindings: [
      {
        id: "binding-1",
        widgetId: "section-1",
        propPath: "title",
        field: "name",
        mode: "read",
      },
    ],
  });
  expect(mockDb.state.lastInsertValues?.createdAt).toBeInstanceOf(Date);
  expect(mockDb.state.lastInsertValues?.updatedAt).toBeInstanceOf(Date);
  expect(result.status).toBe("draft");
  expect(result.collectionRole).toBeNull();
  expect(result.schemaVersion).toBe(4);
  expect(result.bindings[0]?.id).toBe("field-1-value");
  expect(result.capabilities.mode).toBe("editor");
});

test("createCustomScreen rejects invalid payloads", async () => {
  await expect(
    createCustomScreen({
      name: "",
      contentTypeId: "products",
    })
  ).rejects.toThrow("custom_screen_invalid");

  await expect(
    createCustomScreen({
      name: "Catalog",
      contentTypeId: "products",
      status: "archived" as never,
    })
  ).rejects.toThrow("custom_screen_status_invalid");

  await expect(
    createCustomScreen({
      name: "Catalog",
      contentTypeId: "products",
      collectionRole: "unknown" as never,
    })
  ).rejects.toThrow("custom_screen_invalid");
});

test("updateCustomScreen returns null when the record is missing", async () => {
  await expect(updateCustomScreen("missing", { name: "Updated" })).resolves.toBeNull();
});

test("updateCustomScreen preserves existing values and normalizes changed fields", async () => {
  mockDb.state.selectRows = [
    createRow({
      name: "Catalog",
      sidebarLabel: "Catalog",
      showInSidebar: false,
      status: "draft",
      blocks: [{ id: "section-1", type: "section", data: {} }],
      bindings: [],
    }),
  ];
  mockDb.state.updateRows = [
    createRow({
      name: "Updated catalog",
      sidebarLabel: null,
      showInSidebar: false,
      status: "active",
      bindings: [],
    }),
  ];

  const result = await updateCustomScreen("screen-1", {
    name: "  Updated catalog  ",
    status: "active",
    collectionRole: "secondary-admin-screen",
    compositionKey: "catalog-secondary",
    sidebarLabel: "   ",
  });

  expect(mockDb.state.lastUpdateValues).toMatchObject({
    name: "Updated catalog",
    contentTypeId: "products",
    status: "active",
    collectionRole: "secondary-admin-screen",
    compositionKey: "catalog-secondary",
    showInSidebar: false,
    sidebarLabel: null,
    schemaVersion: 4,
    definition: expect.objectContaining({
      schemaVersion: 4,
      editorView: expect.objectContaining({
        document: expect.objectContaining({
          sections: [
            expect.objectContaining({
              id: "section-1",
              type: "legacy-widget",
              legacyWidgetType: "section",
            }),
          ],
        }),
        bindings: [],
        saveMode: "entry",
        interactionMode: "inline",
      }),
    }),
  });
  expect(mockDb.state.lastUpdateValues?.updatedAt).toBeInstanceOf(Date);
  expect(result?.name).toBe("Updated catalog");
  expect(result?.collectionRole).toBeNull();
  expect(result?.sidebarLabel).toBeNull();
  expect(result?.capabilities.mode).toBe("collection-only");
});

test("updateCustomScreen migrates v3 definition to v4 when blocks are patched", async () => {
  const existingDefinition = {
    schemaVersion: 3,
    listView: {
      columns: [
        {
          id: "title",
          source: "system",
          field: "title",
          label: "Title",
          formatter: "text",
          visible: true,
        },
      ],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: {
        delete: true,
        publish: true,
        unpublish: true,
      },
    },
    editorView: {
      blocks: [{ id: "section-1", type: "section", data: {} }],
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };

  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 3,
      definition: existingDefinition,
      blocks: existingDefinition.editorView.blocks,
      bindings: existingDefinition.editorView.bindings,
    }),
  ];
  mockDb.state.updateRows = [
    createRow({
      schemaVersion: 3,
      definition: {
        ...existingDefinition,
        editorView: {
          ...existingDefinition.editorView,
          blocks: [{ id: "section-2", type: "section", data: {} }],
        },
      },
      blocks: [{ id: "section-2", type: "section", data: {} }],
      bindings: [],
    }),
  ];

  const result = await updateCustomScreen("screen-1", {
    blocks: [{ id: "section-2", type: "section", data: {} }],
  });

  expect(mockDb.state.lastUpdateValues).toMatchObject({
    schemaVersion: 4,
    definition: {
      schemaVersion: 4,
      listView: existingDefinition.listView,
      editorView: {
        document: {
          schemaVersion: 1,
          sections: [
            expect.objectContaining({
              id: "section-2",
              type: "legacy-widget",
              legacyWidgetType: "section",
            }),
          ],
        },
        bindings: [],
        saveMode: "entry",
        interactionMode: "inline",
      },
    },
    blocks: [{ id: "section-2", type: "section", data: {} }],
    bindings: [],
  });
  expect(result?.definition.listView).toEqual(existingDefinition.listView);
  expect(result?.blocks[0]).toMatchObject({
    id: "section-2",
    type: "section",
  });
});

test("deleteCustomScreen returns the normalized deleted record or null", async () => {
  mockDb.state.deleteRows = [createRow()];

  const deleted = await deleteCustomScreen("screen-1");
  expect(deleted?.id).toBe("screen-1");

  mockDb.state.deleteRows = [];
  await expect(deleteCustomScreen("screen-2")).resolves.toBeNull();
});
