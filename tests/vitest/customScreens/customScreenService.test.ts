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
  showInSidebar: true,
  sidebarLabel: " Catalog ",
  schemaVersion: 1,
  blocks: [{ id: "section-1", type: "section", data: {} }],
  bindings: [
    {
      widgetId: "section-1",
      propPath: "title",
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
  expect(result[0]?.bindings[0]?.id).toBe("section-1-title");
  expect(result[0]?.sidebarLabel).toBe(" Catalog ");
});

test("getCustomScreen returns null when the row is missing", async () => {
  await expect(getCustomScreen("missing")).resolves.toBeNull();
});

test("createCustomScreen normalizes defaults, sidebar config, and definitions", async () => {
  mockDb.state.insertRows = [createRow({ status: "draft", showInSidebar: true, sidebarLabel: "Catalog Tools" })];

  const result = await createCustomScreen({
    name: "  Catalog Tools  ",
    contentTypeId: "  products  ",
    showInSidebar: true,
    sidebarLabel: "  Catalog Tools  ",
    blocks: [{ id: "section-1", type: "section", data: {} }],
    bindings: [
      {
        widgetId: "section-1",
        propPath: "title",
        field: "name",
      },
    ],
  });

  expect(mockDb.state.lastInsertValues).toMatchObject({
    name: "Catalog Tools",
    contentTypeId: "products",
    status: "draft",
    showInSidebar: true,
    sidebarLabel: "Catalog Tools",
    schemaVersion: 1,
  });
  expect(mockDb.state.lastInsertValues?.createdAt).toBeInstanceOf(Date);
  expect(mockDb.state.lastInsertValues?.updatedAt).toBeInstanceOf(Date);
  expect(result.status).toBe("draft");
  expect(result.bindings[0]?.id).toBe("section-1-title");
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
    sidebarLabel: "   ",
  });

  expect(mockDb.state.lastUpdateValues).toMatchObject({
    name: "Updated catalog",
    contentTypeId: "products",
    status: "active",
    showInSidebar: false,
    sidebarLabel: null,
    schemaVersion: 1,
  });
  expect(mockDb.state.lastUpdateValues?.updatedAt).toBeInstanceOf(Date);
  expect(result?.name).toBe("Updated catalog");
  expect(result?.sidebarLabel).toBeNull();
});

test("deleteCustomScreen returns the normalized deleted record or null", async () => {
  mockDb.state.deleteRows = [createRow()];

  const deleted = await deleteCustomScreen("screen-1");
  expect(deleted?.id).toBe("screen-1");

  mockDb.state.deleteRows = [];
  await expect(deleteCustomScreen("screen-2")).resolves.toBeNull();
});
