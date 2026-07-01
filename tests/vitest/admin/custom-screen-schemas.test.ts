import { expect, test } from "vitest";

import {
  buildDefaultListViewDefinition,
  customScreenCreateSchema,
  customScreenUpdateSchema,
  getCustomScreenEditorViewCompat,
  normalizeCustomScreenCollectionLink,
  normalizeCustomScreenBindings,
  normalizeCustomScreenDefinition,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  normalizeCustomScreenSidebarConfig,
} from "../../../core/services/customScreens/customScreenSchemas";
import { createScreenBlock } from "../../../core/services/customScreens/screenDocumentOps";
import { validate } from "../../../core/server/validation/schemaValidator";

// TASK-498-02 B0: helper wrapping data-oriented blocks in a valid V4 definition.
const buildV4WithBlocks = (blocks: unknown[]) => ({
  schemaVersion: 4,
  listView: buildDefaultListViewDefinition(),
  editorView: {
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "section-default",
          type: "section",
          data: { title: "Details" },
          blocks,
        },
      ],
    },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  },
});

test("customScreenCreateSchema accepts minimal payload", () => {
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
    })
  ).not.toThrow();
});

test("customScreenUpdateSchema requires at least one property", () => {
  expect(() => validate(customScreenUpdateSchema, {})).toThrow("Invalid payload");
});

test("custom screen schemas accept nullable sidebarLabel", () => {
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      sidebarLabel: null,
    })
  ).not.toThrow();

  expect(() =>
    validate(customScreenUpdateSchema, {
      sidebarLabel: null,
    })
  ).not.toThrow();
});

test("custom screen write schemas reject legacy block projections", () => {
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      blocks: [],
      bindings: [],
    })
  ).toThrow("Invalid payload");

  expect(() =>
    validate(customScreenUpdateSchema, {
      blocks: [],
    })
  ).toThrow("Invalid payload");
});

test("custom screen schemas accept canonical collection metadata", () => {
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      collectionRole: "canonical-admin-screen",
      compositionKey: "catalog-canonical",
    })
  ).not.toThrow();

  expect(() =>
    validate(customScreenUpdateSchema, {
      collectionRole: null,
      compositionKey: null,
    })
  ).not.toThrow();

  expect(
    normalizeCustomScreenCollectionLink({
      collectionRole: "secondary-admin-screen",
      compositionKey: "catalog-secondary",
    })
  ).toEqual({
    collectionRole: "secondary-admin-screen",
    compositionKey: "catalog-secondary",
  });
});

test("custom screen schemas reject unknown canonical collection metadata", () => {
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      collectionRole: "primary",
    })
  ).toThrow("Invalid payload");

  expect(() =>
    normalizeCustomScreenCollectionLink({
      collectionRole: "primary",
    })
  ).toThrow("custom_screen_invalid");
});

test("normalizeCustomScreenDefinition returns defaults", () => {
  const definition = normalizeCustomScreenDefinition();
  const editorView = getCustomScreenEditorViewCompat(definition);
  expect(definition.schemaVersion).toBe(4);
  expect(definition.editorView.document).toEqual({ schemaVersion: 1, sections: [] });
  expect(editorView.blocks).toEqual([]);
  expect(editorView.bindings).toEqual([]);
  expect(definition.editorView.interactionMode).toBe("inline");
  expect(definition.listView).toMatchObject({
    defaultSort: { field: "updatedAt", direction: "desc" },
  });
  expect(definition.listView.rowTemplate?.document.sections[0]?.id).toBe("row-template");
  expect(definition.listView.rowTemplate?.bindings.map((binding) => binding.field)).toEqual(
    definition.listView.columns
      .filter((column) => column.visible !== false)
      .map((column) => column.field)
  );
});

test("normalizeCustomScreenBindings rejects unsafe paths", () => {
  expect(() =>
    normalizeCustomScreenBindings([
      {
        widgetId: "block-1",
        propPath: "__proto__.polluted",
        field: "title",
      },
    ])
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinition normalizes blocks", () => {
  const definition = normalizeCustomScreenDefinition({
    schemaVersion: 1,
    blocks: [{ id: "section-1", type: "section", data: {} }],
    bindings: [],
  });
  const editorView = getCustomScreenEditorViewCompat(definition);
  expect(definition.schemaVersion).toBe(4);
  expect(definition.editorView.document.sections[0]?.blocks[0]?.type).toBe("legacy-widget");
  expect(editorView.blocks[0]?.type).toBe("section");
  expect(definition.editorView.interactionMode).toBe("inline");
});

test("normalizeCustomScreenDefinitionForWrite accepts V4 and rejects legacy V1/V3 writes", () => {
  const v4Definition = {
    schemaVersion: 4,
    listView: buildDefaultListViewDefinition(),
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-1",
            type: "section",
            data: {},
            blocks: [{ id: "field-1", type: "field", data: { label: "Name" } }],
          },
        ],
      },
      bindings: [
        {
          id: "field-1-value",
          blockId: "field-1",
          propPath: "value",
          source: "entry",
          field: "title",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };

  expect(normalizeCustomScreenDefinitionForWrite({ definition: v4Definition })).toMatchObject({
    schemaVersion: 4,
    editorView: {
      document: {
        sections: [
          expect.objectContaining({
            blocks: [expect.objectContaining({ id: "field-1", type: "field" })],
          }),
        ],
      },
    },
  });

  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      schemaVersion: 1,
      blocks: [],
      bindings: [],
    })
  ).toThrow("custom_screen_legacy_write_unsupported");

  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: {
        schemaVersion: 3,
        listView: buildDefaultListViewDefinition(),
        editorView: {
          blocks: [],
          bindings: [],
          saveMode: "entry",
          interactionMode: "inline",
        },
      },
    })
  ).toThrow("custom_screen_legacy_write_unsupported");
});

test("normalizeCustomScreenDefinition accepts writable header bindings", () => {
  expect(() =>
    normalizeCustomScreenDefinition(
      {
        definition: {
          schemaVersion: 4,
          listView: {
            columns: [],
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
                  data: {},
                  blocks: [{ id: "header-1", type: "record-header", data: {} }],
                },
              ],
            },
            bindings: [
              {
                id: "binding-1",
                blockId: "header-1",
                propPath: "title",
                source: "entry",
                field: "projectStatus",
                mode: "readwrite",
              },
            ],
            saveMode: "entry",
            interactionMode: "inline",
          },
        },
      },
      {
        contentType: {
          id: "house-projects",
          slug: "house-projects",
          name: "House Projects",
          schema: {
            properties: {
              projectStatus: {
                type: "string",
                enum: ["planned", "active"],
              },
            },
          },
        },
      }
    )
  ).not.toThrow();
});

test("normalizeCustomScreenDefinition rejects explicit v2 write definitions", () => {
  expect(() =>
    normalizeCustomScreenDefinition(
      {
        definition: {
          schemaVersion: 2,
          listView: {
            columns: [
              {
                source: "field",
                field: "projectStatus",
                label: "Project status",
                formatter: "select",
                visible: true,
              },
            ],
            filters: [
              {
                source: "field",
                field: "projectStatus",
                label: "Project status",
                operator: "equals",
                enabled: true,
              },
            ],
            defaultSort: { field: "updatedAt", direction: "desc" },
            rowClick: "editor-view",
            createMode: "editor-view",
            bulkActions: { delete: true, publish: true, unpublish: true },
          },
          editorView: {
            blocks: [],
            bindings: [],
            saveMode: "entry",
          },
        },
      },
      {
        contentType: {
          id: "house-projects",
          slug: "house-projects",
          name: "House Projects",
          schema: {
            properties: {
              projectStatus: {
                type: "string",
                enum: ["planned", "active"],
              },
            },
          },
        },
      }
    )
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinitionForRead migrates strict v2 definitions to v4", () => {
  const definition = normalizeCustomScreenDefinitionForRead(
    {
      definition: {
        schemaVersion: 2,
        listView: {
          columns: [
            {
              source: "field",
              field: "projectStatus",
              label: "Project status",
              formatter: "select",
              visible: true,
            },
          ],
          filters: [
            {
              source: "field",
              field: "projectStatus",
              label: "Project status",
              operator: "equals",
              enabled: true,
            },
          ],
          defaultSort: { field: "updatedAt", direction: "desc" },
          rowClick: "editor-view",
          createMode: "editor-view",
          bulkActions: { delete: true, publish: true, unpublish: true },
        },
        editorView: {
          blocks: [],
          bindings: [],
          saveMode: "entry",
        },
      },
    },
    {
      contentType: {
        id: "house-projects",
        slug: "house-projects",
        name: "House Projects",
        schema: {
          properties: {
            projectStatus: {
              type: "string",
              enum: ["planned", "active"],
            },
          },
        },
      },
    }
  );

  expect(definition.schemaVersion).toBe(4);
  expect(definition.listView.columns[0]).toMatchObject({
    id: "field-projectstatus",
    field: "projectStatus",
    formatter: "select",
  });
  expect(definition.editorView.document).toEqual({ schemaVersion: 1, sections: [] });
  expect(definition.editorView.interactionMode).toBe("inline");
  expect(definition.listView.rowTemplate?.bindings[0]).toMatchObject({
    field: "projectStatus",
    mode: "readwrite",
    propPath: "value",
  });
});

test("normalizeCustomScreenDefinitionForRead tolerates stale field references and falls back to a safe v4 shape", () => {
  const definition = normalizeCustomScreenDefinitionForRead(
    {
      definition: {
        schemaVersion: 2,
        listView: {
          columns: [
            {
              source: "field",
              field: "removedField",
              label: "Removed field",
              formatter: "text",
              visible: true,
            },
          ],
          filters: [],
          defaultSort: { field: "removedField", direction: "desc" },
          rowClick: "editor-view",
          createMode: "editor-view",
          bulkActions: { delete: true, publish: true, unpublish: true },
        },
        editorView: {
          blocks: [],
          bindings: [
            {
              widgetId: "field-1",
              propPath: "value",
              field: "removedField",
              mode: "readwrite",
            },
          ],
          saveMode: "entry",
        },
      },
    },
    {
      contentType: {
        id: "house-projects",
        slug: "house-projects",
        name: "House Projects",
        schema: {
          properties: {
            projectStatus: {
              type: "string",
              enum: ["planned", "active"],
            },
          },
        },
      },
    }
  );

  const editorView = getCustomScreenEditorViewCompat(definition);
  expect(definition.schemaVersion).toBe(4);
  expect(definition.listView.defaultSort).toEqual({
    field: "updatedAt",
    direction: "desc",
  });
  expect(editorView.bindings[0]).toMatchObject({
    field: "removedField",
  });
});

test("normalizeCustomScreenDefinition rejects definition-owned content type ids and unknown keys", () => {
  expect(() =>
    normalizeCustomScreenDefinition({
      definition: {
        schemaVersion: 3,
        contentTypeId: "house-projects",
        listView: null,
        editorView: null,
      },
    })
  ).toThrow("custom_screen_definition_invalid");

  expect(() =>
    normalizeCustomScreenDefinition({
      definition: {
        schemaVersion: 3,
        listView: { extra: true },
        editorView: { blocks: [], bindings: [], saveMode: "entry", interactionMode: "inline" },
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("custom screen schemas accept v4 screen documents without definition-owned contentTypeId", () => {
  const definition = {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-default",
            type: "section",
            data: { title: "Details" },
            blocks: [
              {
                id: "field-title",
                type: "field",
                data: { label: "Title" },
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "field-title-value",
          blockId: "field-title",
          propPath: "value",
          source: "entry",
          field: "title",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };

  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      schemaVersion: 4,
      definition,
    })
  ).not.toThrow();

  expect(normalizeCustomScreenDefinition({ definition })).toMatchObject({
    schemaVersion: 4,
    editorView: {
      document: {
        sections: [
          {
            id: "section-default",
            type: "section",
            blocks: [{ id: "field-title", type: "field" }],
          },
        ],
      },
      bindings: [
        {
          blockId: "field-title",
          source: "entry",
          field: "title",
        },
      ],
    },
  });

  expect(() =>
    normalizeCustomScreenDefinition({
      definition: {
        ...definition,
        contentTypeId: "type-1",
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("custom screen schemas accept strict v4 row templates and reject unknown rowTemplate keys", () => {
  const definition = {
    schemaVersion: 4,
    listView: {
      columns: [
        {
          id: "field-headline",
          source: "field",
          field: "headline",
          label: "Headline",
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
              blocks: [{ id: "row-headline", type: "field", data: { label: "Headline" } }],
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
        ],
      },
    },
    editorView: {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };

  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      schemaVersion: 4,
      definition,
    })
  ).not.toThrow();

  expect(normalizeCustomScreenDefinitionForWrite({ definition })).toMatchObject({
    listView: {
      rowTemplate: {
        bindings: [expect.objectContaining({ field: "headline", mode: "readwrite" })],
      },
    },
  });

  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: {
        ...definition,
        listView: {
          ...definition.listView,
          rowTemplate: {
            ...definition.listView.rowTemplate,
            unsafe: true,
          },
        },
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinition rejects flat v4 screen document writes", () => {
  expect(() =>
    normalizeCustomScreenDefinition({
      definition: {
        schemaVersion: 4,
        listView: {
          columns: [],
          filters: [],
          defaultSort: { field: "updatedAt", direction: "desc" },
          bulkActions: { delete: true, publish: true, unpublish: true },
        },
        editorView: {
          document: {
            schemaVersion: 1,
            sections: [{ id: "field-title", type: "field", data: { label: "Title" } }],
          },
          bindings: [
            {
              id: "field-title-value",
              blockId: "field-title",
              propPath: "value",
              source: "entry",
              field: "title",
              mode: "readwrite",
            },
          ],
          saveMode: "entry",
          interactionMode: "inline",
        },
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinitionForRead wraps legacy flat v4 screen documents", () => {
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: {
      schemaVersion: 4,
      listView: {
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
        bulkActions: { delete: true, publish: true, unpublish: true },
      },
      editorView: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "field-title", type: "field", data: { label: "Title" } }],
        },
        bindings: [
          {
            id: "field-title-value",
            blockId: "field-title",
            propPath: "value",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
        ],
        saveMode: "entry",
        interactionMode: "inline",
      },
    },
  });

  expect(definition.editorView.document.sections).toHaveLength(1);
  expect(definition.editorView.document.sections[0]).toMatchObject({
    id: "section-default",
    type: "section",
  });
  expect(definition.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "field-title",
    type: "field",
  });
});

test("buildDefaultListViewDefinition derives columns from the selected content type", () => {
  const listView = buildDefaultListViewDefinition({
    id: "house-projects",
    slug: "house-projects",
    name: "House Projects",
    schema: {
      properties: {
        name: { type: "string", title: "Project name" },
        summary: { type: "string", title: "Summary" },
        projectStatus: {
          type: "string",
          enum: ["planned", "active"],
          title: "Project status",
        },
      },
    },
  });

  expect(listView.columns.map((column) => column.field)).toEqual([
    "title",
    "name",
    "summary",
    "projectStatus",
    "updatedAt",
  ]);
  expect(listView.filters[0]).toMatchObject({
    field: "projectStatus",
    label: "Project status",
    operator: "equals",
  });
});

test("normalizeScreenBlockData validates every new data-oriented kind byte-stable", () => {
  const kinds = [
    "heading",
    "text",
    "stat",
    "divider",
    "image",
    "related-list",
    "tabs",
    "button",
  ] as const;
  const blocks = kinds.map((kind) => createScreenBlock({ type: kind }).block);

  const definition = normalizeCustomScreenDefinition({ definition: buildV4WithBlocks(blocks) });
  expect(definition.schemaVersion).toBe(4);
  expect(definition.editorView.document.schemaVersion).toBe(1);
  // Every allow-listed new kind round-trips byte-stable (no key dropped, no throw).
  expect(definition.editorView.document.sections[0]?.blocks).toEqual(blocks);
});

test("normalizeScreenBlockData rejects unknown keys on new kinds but stays permissive on legacy kinds", () => {
  const headingWithUnknown = {
    id: "heading-1",
    type: "heading",
    data: { label: "H", text: "", level: 2, align: "left", bogus: true },
  };
  expect(() =>
    normalizeCustomScreenDefinition({ definition: buildV4WithBlocks([headingWithUnknown]) })
  ).toThrow("custom_screen_definition_invalid");

  // Legacy `field` keeps its permissive normalization (backward-compat).
  const fieldWithExtra = {
    id: "field-1",
    type: "field",
    data: { label: "F", legacyExtra: true },
  };
  expect(() =>
    normalizeCustomScreenDefinition({ definition: buildV4WithBlocks([fieldWithExtra]) })
  ).not.toThrow();
});

test("normalizeCustomScreenDefinitionForRead keeps chip-inserted heading + tabs (base label allow-listed)", () => {
  const heading = createScreenBlock({ type: "heading" }).block;
  const tabs = createScreenBlock({ type: "tabs" }).block;
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([heading, tabs]),
  });
  const outBlocks = definition.editorView.document.sections[0]?.blocks ?? [];
  // If "label" were omitted from the heading/tabs allow-list, save-time reject-unknown
  // would throw and ...ForRead would silently drop the block — assert survival.
  expect(outBlocks.map((block) => block.type)).toEqual(["heading", "tabs"]);
  expect(outBlocks[0]?.data.label).toBe(heading.data.label);
  expect(outBlocks[1]?.data.label).toBe(tabs.data.label);
});

test("normalizeCustomScreenDefinitionForRead repairs a stored `actions` block into a usable button", () => {
  // Disjoint fixture from the byte-stable / legacy-widget round-trip cases above:
  // a screen persisted before TASK-498-02 promoted `actions` → `button`.
  const storedActions = {
    id: "cta-1",
    type: "actions",
    data: {
      label: "Publish",
      action: "publish",
      variant: "primary",
      href: "/go",
      legacyOnly: "drop-me", // stray legacy key not in the button allow-list
    },
  };

  const readDefinition = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([storedActions]),
  });
  const readBlock = readDefinition.editorView.document.sections[0]?.blocks[0];
  // READ-PATH repair remaps the placeholder to the typed `button` kind (visual upgrade)…
  expect(readBlock?.type).toBe("button");
  // …intersecting data with the button allow-list so reject-unknown never throws.
  expect(readBlock?.data).toEqual({
    label: "Publish",
    action: "publish",
    variant: "primary",
    href: "/go",
  });

  // The WRITE path is untouched by the repair: a stored `actions` kind stays permissive
  // (unknown-but-typed, per TASK-498-02) and is NOT rewritten to `button`.
  const writeDefinition = normalizeCustomScreenDefinition({
    definition: buildV4WithBlocks([storedActions]),
  });
  expect(writeDefinition.editorView.document.sections[0]?.blocks[0]?.type).toBe("actions");
});

test("normalizeCustomScreenSidebarConfig normalizes sidebar flags", () => {
  expect(
    normalizeCustomScreenSidebarConfig({
      showInSidebar: true,
      sidebarLabel: "  Catalog  ",
    })
  ).toEqual({
    showInSidebar: true,
    sidebarLabel: "Catalog",
  });

  expect(normalizeCustomScreenSidebarConfig()).toEqual({
    showInSidebar: false,
    sidebarLabel: null,
  });
});
