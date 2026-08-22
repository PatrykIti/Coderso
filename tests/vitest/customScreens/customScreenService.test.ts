import { afterEach, expect, test, vi } from "vitest";

const mockDb = vi.hoisted(() => {
  const state = {
    selectRows: [] as Array<Record<string, unknown>>,
    insertRows: [] as Array<Record<string, unknown>>,
    updateRows: [] as Array<Record<string, unknown>>,
    deleteRows: [] as Array<Record<string, unknown>>,
    contentTypeRows: [
      {
        id: "products",
        name: "Products",
        slug: "products",
        schema: { type: "object", properties: { name: { type: "string" } } },
      },
    ] as Array<Record<string, unknown>>,
    lastInsertValues: null as Record<string, unknown> | null,
    lastUpdateValues: null as Record<string, unknown> | null,
    events: [] as string[],
  };

  const selectableRows = () => {
    const result = Promise.resolve(mockDb.state.selectRows);
    return {
      then: result.then.bind(result),
      for: vi.fn(async (lock: string) => {
        mockDb.state.events.push(`select:${lock}`);
        return lock === "key share" ? mockDb.state.contentTypeRows : mockDb.state.selectRows;
      }),
    };
  };

  const client = {
    select: vi.fn(() => {
      mockDb.state.events.push("select");
      return {
        from: vi.fn(() => ({
          orderBy: vi.fn(async () => mockDb.state.selectRows),
          where: vi.fn(() => selectableRows()),
        })),
      };
    }),
    insert: vi.fn(() => ({
      values: vi.fn((input: Record<string, unknown>) => {
        mockDb.state.events.push("insert");
        mockDb.state.lastInsertValues = input;
        return {
          returning: vi.fn(async () => mockDb.state.insertRows),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((input: Record<string, unknown>) => {
        mockDb.state.events.push("update");
        mockDb.state.lastUpdateValues = input;
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => mockDb.state.updateRows),
          })),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        mockDb.state.events.push("delete");
        return {
          returning: vi.fn(async () => mockDb.state.deleteRows),
        };
      }),
    })),
  };

  return {
    state,
    reset() {
      state.selectRows = [];
      state.insertRows = [];
      state.updateRows = [];
      state.deleteRows = [];
      state.contentTypeRows = [
        {
          id: "products",
          name: "Products",
          slug: "products",
          schema: { type: "object", properties: { name: { type: "string" } } },
        },
      ];
      state.lastInsertValues = null;
      state.lastUpdateValues = null;
      state.events = [];
    },
    db: {
      ...client,
      transaction: vi.fn(async (executeTransaction: (tx: unknown) => Promise<unknown>) => {
        let fenceStatement = 0;
        return executeTransaction({
          ...client,
          execute: vi.fn(async () => {
            mockDb.state.events.push("fence");
            fenceStatement += 1;
            return fenceStatement === 1 ? [{ acquired: true }] : [];
          }),
        });
      }),
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
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

function makeV4Definition(blockId = "field-1"): CustomScreenDefinition {
  return {
    schemaVersion: 4,
    listView: {
      columns: [
        {
          id: "system-title",
          source: "system",
          field: "title",
          label: "Record",
          formatter: "text",
          visible: true,
        },
      ],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-1",
            type: "section",
            label: "Details",
            data: { title: "Details" },
            blocks: [
              {
                id: blockId,
                type: "field",
                data: { label: "Name", value: "" },
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: `${blockId}-value`,
          blockId,
          propPath: "value",
          source: "entry",
          field: "name",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}

const createRow = (overrides: Record<string, unknown> = {}) => ({
  id: "screen-1",
  name: "Catalog",
  contentTypeId: "products",
  status: "active",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: " Catalog ",
  schemaVersion: 4,
  definition: makeV4Definition(),
  revision: 1,
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

test("listCustomScreens migrates legacy persisted definitions for reads", async () => {
  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 3,
      definition: {
        schemaVersion: 3,
        listView: makeV4Definition().listView,
        editorView: {
          blocks: [{ id: "section-1", type: "section", data: {} }],
          bindings: [
            {
              widgetId: "section-1",
              propPath: "title",
              field: "name",
              mode: "readwrite",
            },
          ],
          saveMode: "entry",
          interactionMode: "inline",
        },
      },
    }),
  ];

  const result = await listCustomScreens();

  expect(result).toHaveLength(1);
  expect(result[0]?.schemaVersion).toBe(4);
  expect(result[0]?.blocks[0]).toMatchObject({
    id: "section-1",
    type: "section",
  });
  expect(result[0]?.definition.editorView.document.sections[0]?.blocks[0]).toMatchObject({
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
  const definition = makeV4Definition("field-1");

  const result = await createCustomScreen({
    name: "  Catalog Tools  ",
    contentTypeId: "  products  ",
    showInSidebar: true,
    sidebarLabel: "  Catalog Tools  ",
    collectionRole: "canonical-admin-screen",
    compositionKey: "catalog-tools",
    definition,
  });

  expect(mockDb.state.events[0]).toBe("fence");
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
              type: "section",
              blocks: [
                expect.objectContaining({
                  id: "field-1",
                  type: "field",
                }),
              ],
            }),
          ],
        },
        bindings: [
          {
            id: "field-1-value",
            blockId: "field-1",
            propPath: "value",
            source: "entry",
            field: "name",
            mode: "readwrite",
          },
        ],
        saveMode: "entry",
        interactionMode: "inline",
      },
      listView: expect.objectContaining({
        defaultSort: { field: "updatedAt", direction: "desc" },
      }),
    },
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

  await expect(
    createCustomScreen({
      name: "Catalog",
      contentTypeId: "products",
      blocks: [],
      bindings: [],
    } as never)
  ).rejects.toThrow("custom_screen_legacy_write_unsupported");

  await expect(
    createCustomScreen({
      name: "Catalog",
      contentTypeId: "products",
      definition: {
        schemaVersion: 3,
        listView: makeV4Definition().listView,
        editorView: {
          blocks: [],
          bindings: [],
          saveMode: "entry",
          interactionMode: "inline",
        },
      } as never,
    })
  ).rejects.toThrow("custom_screen_legacy_write_unsupported");
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
      definition: makeV4Definition("field-1"),
    }),
  ];
  mockDb.state.updateRows = [
    createRow({
      name: "Updated catalog",
      sidebarLabel: null,
      showInSidebar: false,
      status: "active",
      definition: makeV4Definition("field-1"),
    }),
  ];

  const result = await updateCustomScreen("screen-1", {
    name: "  Updated catalog  ",
    status: "active",
    collectionRole: "secondary-admin-screen",
    compositionKey: "catalog-secondary",
    sidebarLabel: "   ",
  });

  expect(mockDb.state.events[0]).toBe("fence");
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
              type: "section",
              blocks: [expect.objectContaining({ id: "field-1", type: "field" })],
            }),
          ],
        }),
        bindings: [expect.objectContaining({ id: "field-1-value", mode: "readwrite" })],
        saveMode: "entry",
        interactionMode: "inline",
      }),
    }),
  });
  expect(mockDb.state.lastUpdateValues?.updatedAt).toBeInstanceOf(Date);
  expect(result?.name).toBe("Updated catalog");
  expect(result?.collectionRole).toBeNull();
  expect(result?.sidebarLabel).toBeNull();
  expect(result?.capabilities.mode).toBe("editor");
});

test("updateCustomScreen rejects legacy block patches on write", async () => {
  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 4,
      definition: makeV4Definition("field-1"),
    }),
  ];

  await expect(
    updateCustomScreen("screen-1", {
      blocks: [{ id: "section-2", type: "section", data: {} }],
    } as never)
  ).rejects.toThrow("custom_screen_legacy_write_unsupported");
  expect(mockDb.state.lastUpdateValues).toBeNull();
});

test("updateCustomScreen accepts V4 definition writes", async () => {
  const existingDefinition = makeV4Definition("field-1");
  const nextDefinition = makeV4Definition("field-2");

  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 4,
      definition: existingDefinition,
    }),
  ];
  mockDb.state.updateRows = [
    createRow({
      schemaVersion: 4,
      definition: nextDefinition,
    }),
  ];

  const result = await updateCustomScreen("screen-1", {
    definition: nextDefinition,
    expectedRevision: 1,
  });

  expect(mockDb.state.lastUpdateValues).toMatchObject({
    schemaVersion: 4,
    definition: expect.objectContaining({
      schemaVersion: 4,
      editorView: expect.objectContaining({
        document: expect.objectContaining({
          sections: [
            expect.objectContaining({
              blocks: [expect.objectContaining({ id: "field-2", type: "field" })],
            }),
          ],
        }),
      }),
    }),
  });
  expect(result?.definition.editorView.document.sections[0]?.blocks[0]?.id).toBe("field-2");
});

test("updateCustomScreen accepts a style-carrying V4 definition and preserves it (TASK-503)", async () => {
  const styledDefinition = makeV4Definition("field-1");
  const styledBlock = styledDefinition.editorView.document.sections[0]?.blocks[0] as Record<
    string,
    unknown
  >;
  styledBlock.style = {
    width: "half",
    minHeight: 120,
    margin: { top: 24, left: 8 },
    padding: { top: 16 },
    align: "center",
  };

  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 4,
      definition: makeV4Definition("field-1"),
    }),
  ];
  mockDb.state.updateRows = [
    createRow({
      schemaVersion: 4,
      definition: styledDefinition,
    }),
  ];

  const result = await updateCustomScreen("screen-1", {
    definition: styledDefinition,
    expectedRevision: 1,
  });

  // The write path (real normalizeCustomScreenDefinitionForWrite; only db is mocked)
  // preserves the validated style verbatim — clamped ints, allow-listed enums.
  const writtenBlock = (
    mockDb.state.lastUpdateValues?.definition as {
      editorView: { document: { sections: Array<{ blocks: Array<Record<string, unknown>> }> } };
    }
  ).editorView.document.sections[0]?.blocks[0];
  expect(writtenBlock?.style).toEqual({
    width: "half",
    minHeight: 120,
    margin: { top: 24, left: 8 },
    padding: { top: 16 },
    align: "center",
  });
  // Read-back round-trips the same style.
  expect(result?.definition.editorView.document.sections[0]?.blocks[0]?.style).toEqual({
    width: "half",
    minHeight: 120,
    margin: { top: 24, left: 8 },
    padding: { top: 16 },
    align: "center",
  });
});

test("updateCustomScreen rejects an unknown style key with custom_screen_definition_invalid (TASK-503)", async () => {
  const badDefinition = makeV4Definition("field-1");
  const badBlock = badDefinition.editorView.document.sections[0]?.blocks[0] as Record<
    string,
    unknown
  >;
  badBlock.style = { width: "half", bogus: 1 } as Record<string, unknown>;

  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 4,
      definition: makeV4Definition("field-1"),
    }),
  ];

  await expect(
    updateCustomScreen("screen-1", {
      definition: badDefinition,
      expectedRevision: 1,
    })
  ).rejects.toThrow("custom_screen_definition_invalid");
  expect(mockDb.state.lastUpdateValues).toBeNull();
});

test("TASK-505-01 updateCustomScreen accepts a section-style V4 definition and preserves it", async () => {
  const styledDefinition = makeV4Definition("field-1");
  const styledSection = styledDefinition.editorView.document.sections[0] as Record<string, unknown>;
  styledSection.style = { columns: "3-1", columnGap: 24 };

  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1") }),
  ];
  mockDb.state.updateRows = [createRow({ schemaVersion: 4, definition: styledDefinition })];

  const result = await updateCustomScreen("screen-1", {
    definition: styledDefinition,
    expectedRevision: 1,
  });

  // The real write normalizer preserves the validated section style (only db is mocked).
  const writtenSection = (
    mockDb.state.lastUpdateValues?.definition as {
      editorView: { document: { sections: Array<Record<string, unknown>> } };
    }
  ).editorView.document.sections[0];
  expect(writtenSection?.style).toEqual({ columns: "3-1", columnGap: 24 });
  expect(result?.definition.editorView.document.sections[0]?.style).toEqual({
    columns: "3-1",
    columnGap: 24,
  });
});

test("TASK-505-01 updateCustomScreen runs the normalize-time GC safety net: a block-orphan binding is pruned on write and its field name is surfaced", async () => {
  const orphanDefinition = makeV4Definition("field-1");
  orphanDefinition.editorView.bindings = [
    ...orphanDefinition.editorView.bindings,
    {
      id: "ghost-binding",
      blockId: "ghost", // no live block in the document → block-orphan
      propPath: "value",
      source: "entry",
      field: "name",
      mode: "readwrite",
    },
  ];

  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1") }),
  ];
  mockDb.state.updateRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1") }),
  ];

  const result = await updateCustomScreen("screen-1", {
    definition: orphanDefinition,
    expectedRevision: 1,
  });

  // The write safety-net inside normalizeCustomScreenEditorViewDefinitionV4 pruned the
  // block-orphan instead of hard-throwing custom_screen_definition_invalid.
  const writtenBindings = (
    mockDb.state.lastUpdateValues?.definition as {
      editorView: { bindings: Array<{ blockId: string; field: string }> };
    }
  ).editorView.bindings;
  expect(writtenBindings.map((b) => b.blockId)).toEqual(["field-1"]);
  // The pruned field name surfaces on the transient PATCH-200 warnings carry.
  expect(result?.warnings).toEqual([{ code: "binding_block_removed", fields: ["name"] }]);
});

test("TASK-505-01 a stored block-orphan definition READS non-fatally (getCustomScreen resolves, no throw)", async () => {
  const storedDefinition = makeV4Definition("field-1");
  storedDefinition.editorView.bindings = [
    ...storedDefinition.editorView.bindings,
    {
      id: "ghost-binding",
      blockId: "ghost",
      propPath: "value",
      source: "entry",
      field: "beds",
      mode: "readwrite",
    },
  ];

  mockDb.state.selectRows = [createRow({ schemaVersion: 4, definition: storedDefinition })];

  // normalizeCustomScreenDefinitionForRead's read-repair prunes the orphan silently — the
  // screen OPENS (200/non-null) rather than 400ing; recovery/saveability is the write path's job.
  const result = await getCustomScreen("screen-1");
  expect(result).not.toBeNull();
  expect(result?.definition.editorView.document.sections[0]?.blocks[0]?.id).toBe("field-1");
});

test("TASK-505-03 a stored field-orphan RETAINS the binding on read (real getCustomScreen, active content-type context) so the reopen recovery notice can name it", async () => {
  // Regression guard for the read-vs-recovery contradiction: field-orphans (binding →
  // LIVE block, but the content-type field was deleted AFTER save) are created by an
  // EXTERNAL schema change and never re-saved, so they can ONLY surface on reopen. If the
  // server read path pruned them (as an earlier draft did), CustomScreenEditorPage's
  // detectScreenBindingOrphans would see nothing and the amber "Orphaned field bindings"
  // notice (505-03 Acceptance #5/#6) could never fire in production. The row carries a real
  // `schema` so loadContentTypesById resolves an ACTIVE context (allowed roots = {title}) —
  // "bathrooms" is a genuine field-orphan under that context, yet the read must KEEP it.
  const storedDefinition = makeV4Definition("field-1");
  storedDefinition.editorView.bindings = [
    ...storedDefinition.editorView.bindings,
    {
      id: "orphan-binding",
      blockId: "field-1", // LIVE block → this is a FIELD-orphan, not a block-orphan
      propPath: "value",
      source: "entry",
      field: "bathrooms", // not on the (title-only) content-type schema
      mode: "readwrite",
    },
  ];

  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 4,
      definition: storedDefinition,
      schema: { properties: { title: { type: "string" } } },
    }),
  ];

  const result = await getCustomScreen("screen-1");
  expect(result).not.toBeNull();
  // The orphan survives the read (unpruned) so the editor can detect + NAME it; the WRITE
  // path prunes it on Save (recoverable Save + post-save binding_field_removed warning).
  expect(result?.definition.editorView.bindings.map((b) => b.field)).toContain("bathrooms");
});

test("deleteCustomScreen returns the normalized deleted record or null", async () => {
  mockDb.state.deleteRows = [createRow()];

  const deleted = await deleteCustomScreen("screen-1");
  expect(mockDb.state.events[0]).toBe("fence");
  expect(deleted?.id).toBe("screen-1");

  mockDb.state.deleteRows = [];
  await expect(deleteCustomScreen("screen-2")).resolves.toBeNull();
});

test("updateCustomScreen rejects a definition PATCH without expectedRevision (TASK-569)", async () => {
  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1"), revision: 1 }),
  ];

  await expect(
    updateCustomScreen("screen-1", { definition: makeV4Definition("field-2") })
  ).rejects.toThrow("custom_screen_revision_required");
  expect(mockDb.state.lastUpdateValues).toBeNull();
});

test("updateCustomScreen maps a revision mismatch to custom_screen_conflict (TASK-569)", async () => {
  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1"), revision: 1 }),
  ];
  // A concurrent writer bumped the revision; the conditional UPDATE matches zero rows.
  mockDb.state.updateRows = [];

  await expect(
    updateCustomScreen("screen-1", {
      definition: makeV4Definition("field-2"),
      expectedRevision: 1,
    })
  ).rejects.toThrow("custom_screen_conflict");
});

test("updateCustomScreen response carries the incremented revision (TASK-569)", async () => {
  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1"), revision: 1 }),
  ];
  mockDb.state.updateRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-2"), revision: 2 }),
  ];

  const result = await updateCustomScreen("screen-1", {
    definition: makeV4Definition("field-2"),
    expectedRevision: 1,
  });
  expect(result?.revision).toBe(2);
  expect(result?.definition.editorView.document.sections[0]?.blocks[0]?.id).toBe("field-2");
});

test("updateCustomScreen metadata PATCH proceeds without expectedRevision and keeps the revision (TASK-569)", async () => {
  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1"), revision: 3 }),
  ];
  mockDb.state.updateRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1"), revision: 3 }),
  ];

  const result = await updateCustomScreen("screen-1", { status: "active" });
  expect(result?.revision).toBe(3);
  expect(mockDb.state.lastUpdateValues?.status).toBe("active");
});

test("updateCustomScreen resolves the content type from the locked row when the payload omits it (N2, TASK-569)", async () => {
  // The locked row carries contentTypeId "products"; the payload changes only status.
  // The contentType context lock must target "products" (no spurious
  // custom_screen_invalid) and the write keeps the locked row's content type.
  mockDb.state.selectRows = [
    createRow({
      schemaVersion: 4,
      definition: makeV4Definition("field-1"),
      contentTypeId: "products",
    }),
  ];
  mockDb.state.updateRows = [
    createRow({
      schemaVersion: 4,
      definition: makeV4Definition("field-1"),
      contentTypeId: "products",
    }),
  ];

  const result = await updateCustomScreen("screen-1", { status: "active" });
  expect(mockDb.state.events).toContain("select:key share");
  expect(mockDb.state.lastUpdateValues?.contentTypeId).toBe("products");
  expect(result?.contentTypeId).toBe("products");
});

test("updateCustomScreen prunes a field-orphan binding and surfaces binding_field_removed (TASK-505-03)", async () => {
  const orphanDefinition = makeV4Definition("field-1");
  orphanDefinition.editorView.bindings = [
    ...orphanDefinition.editorView.bindings,
    {
      id: "field-1-bathrooms",
      blockId: "field-1", // LIVE block → field-orphan (field deleted from the content type)
      propPath: "value",
      source: "entry",
      field: "bathrooms",
      mode: "readwrite",
    },
  ];

  mockDb.state.selectRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1") }),
  ];
  mockDb.state.updateRows = [
    createRow({ schemaVersion: 4, definition: makeV4Definition("field-1") }),
  ];

  const result = await updateCustomScreen("screen-1", {
    definition: orphanDefinition,
    expectedRevision: 1,
  });

  const writtenBindings = (
    mockDb.state.lastUpdateValues?.definition as {
      editorView: { bindings: Array<{ field: string }> };
    }
  ).editorView.bindings;
  expect(writtenBindings.map((b) => b.field)).not.toContain("bathrooms");
  expect(result?.warnings).toEqual([{ code: "binding_field_removed", fields: ["bathrooms"] }]);
});
