import { expect, test, vi } from "vitest";

import {
  buildScreenFieldBindingId,
  buildDefaultListViewDefinition,
  customScreenCreateSchema,
  customScreenDefinitionSchema,
  customScreenUpdateSchema,
  CustomScreenDefinitionError,
  getCustomScreenEditorViewCompat,
  isScreenMediaAssetUuid,
  normalizeCustomScreenCollectionLink,
  normalizeCustomScreenBindings,
  normalizeCustomScreenDefinition,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  normalizeCustomScreenSidebarConfig,
  normalizeScreenDocumentV1,
  normalizeScreenDocumentV1ForRead,
  normalizeScreenFieldBindings,
  SCREEN_BLOCK_COLLECTION_MAX,
  SCREEN_DOCUMENT_SECTIONS_MAX,
  SCREEN_TAB_ID,
  SCREEN_TAB_LABEL_MAX,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  screenBlockAligns,
  screenBlockBoxSides,
  screenBlockWidths,
  screenImageRatios,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  screenSectionColumnPresets,
  screenSectionColumnTemplate,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  type ScreenBindingWarningSink,
  type CustomScreenListRowTemplate,
  type ScreenFieldBinding,
  type ScreenTabItem,
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

test("normalizeCustomScreenDefinitionForRead repairs legacy V1/V2/V3 editor IDs and binding references once", () => {
  const defaults = buildDefaultListViewDefinition();
  const legacyListView = {
    columns: defaults.columns,
    filters: defaults.filters,
    defaultSort: defaults.defaultSort,
    bulkActions: defaults.bulkActions,
  };
  const versions = [1, 2, 3] as const;
  const variants = ["binding-id", "block-id", "prop-path", "field"] as const;

  for (const version of versions) {
    for (const variant of variants) {
      const label = `V${version}:${variant}`;
      const editorBlockId =
        variant === "block-id"
          ? `legacy-editor-${"b".repeat(170)}`
          : `legacy-editor-${version}-${variant}`;
      const siblingBlockId = `legacy-sibling-${version}-${variant}`;
      const editorBlocks = [
        {
          id: editorBlockId,
          type: "screen-record-header",
          data: { marker: "primary-marker", variant },
        },
        {
          id: siblingBlockId,
          type: "screen-record-header",
          data: { marker: "sibling-marker" },
        },
      ];
      const primaryBinding = {
        id: variant === "binding-id" ? "e".repeat(121) : `primary-binding-${version}-${variant}`,
        widgetId: editorBlockId,
        propPath: variant === "prop-path" ? "p".repeat(161) : "title",
        field: variant === "field" ? "f".repeat(161) : "primaryTitle",
        mode: "read",
      };
      const siblingBinding = {
        id: `sibling-binding-${version}-${variant}`,
        widgetId: siblingBlockId,
        propPath: "title",
        field: "siblingTitle",
        mode: "read",
      };
      const editorBindings = [primaryBinding, siblingBinding];
      const definition =
        version === 1
          ? { schemaVersion: 1, blocks: editorBlocks, bindings: editorBindings }
          : version === 2
            ? {
                schemaVersion: 2,
                listView: {
                  ...legacyListView,
                  rowClick: "editor-view",
                  createMode: "editor-view",
                },
                editorView: { blocks: editorBlocks, bindings: editorBindings, saveMode: "entry" },
              }
            : {
                schemaVersion: 3,
                listView: legacyListView,
                editorView: {
                  blocks: editorBlocks,
                  bindings: editorBindings,
                  saveMode: "entry",
                  interactionMode: "inline",
                },
              };

      const before = JSON.stringify(definition);
      const migrated = normalizeCustomScreenDefinitionForRead({ definition });
      expect(JSON.stringify(definition), `${label}:immutable`).toBe(before);

      const [editorBlock, siblingBlock] = migrated.editorView.document.sections[0]?.blocks ?? [];
      const [editorBinding, migratedSiblingBinding] = migrated.editorView.bindings;
      expect(editorBlock, `${label}:editor-block`).toBeDefined();
      expect(editorBinding, `${label}:editor-binding`).toBeDefined();
      expect(editorBlock!.data).toMatchObject({ marker: "primary-marker", variant });
      expect(editorBlock!.id.length).toBeLessThanOrEqual(160);
      expect(editorBinding!.id.length).toBeLessThanOrEqual(120);
      expect(editorBinding!.blockId).toBe(editorBlock!.id);
      expect(editorBinding!.propPath.length).toBeLessThanOrEqual(160);
      expect(editorBinding!.field.length).toBeLessThanOrEqual(160);
      expect(editorBlock!.id === editorBlockId, `${label}:block-repair`).toBe(
        variant !== "block-id"
      );
      expect(editorBinding!.id === primaryBinding.id, `${label}:binding-id-repair`).toBe(
        variant !== "binding-id"
      );
      expect(editorBinding!.propPath === primaryBinding.propPath, `${label}:prop-path-repair`).toBe(
        variant !== "prop-path"
      );
      expect(editorBinding!.field === primaryBinding.field, `${label}:field-repair`).toBe(
        variant !== "field"
      );

      expect(siblingBlock).toMatchObject({
        id: siblingBlockId,
        data: { marker: "sibling-marker" },
      });
      expect(migratedSiblingBinding).toEqual({
        id: siblingBinding.id,
        blockId: siblingBlockId,
        propPath: "title",
        source: "entry",
        field: "siblingTitle",
        mode: "read",
      });
      expect(() => validate(customScreenDefinitionSchema, migrated), label).not.toThrow();
      expect(normalizeCustomScreenDefinitionForWrite({ definition: migrated }), label).toEqual(
        migrated
      );
      expect(normalizeCustomScreenDefinitionForRead({ definition: migrated }), label).toEqual(
        migrated
      );
    }
  }
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
  // …and maps an unsupported legacy action to the reserved safe-disabled pair.
  expect(readBlock?.data).toEqual({
    label: "Publish",
    action: "link",
    variant: "primary",
  });

  // `actions` is stored-read compatibility only; every new direct or route write rejects it.
  expect(() =>
    normalizeCustomScreenDefinition({ definition: buildV4WithBlocks([storedActions]) })
  ).toThrow("custom_screen_definition_invalid");
  expect(() => validate(customScreenDefinitionSchema, buildV4WithBlocks([storedActions]))).toThrow(
    "Invalid payload"
  );
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

// ---------------------------------------------------------------------------
// TASK-503-01: ScreenBlockStyleV1 validator + Ajv layer + exported constants
// ---------------------------------------------------------------------------

const buildScreenDoc = (block: Record<string, unknown>) => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "section-default",
      type: "section" as const,
      data: { title: "Details" },
      blocks: [block],
    },
  ],
});

const fieldBlock = (extra: Record<string, unknown>) => ({
  id: "field-1",
  type: "field",
  data: { label: "Name" },
  ...extra,
});

const styledBlockData = (block: Record<string, unknown>) =>
  normalizeScreenDocumentV1(buildScreenDoc(block)).sections[0]?.blocks[0] as Record<
    string,
    unknown
  >;

test("TASK-503-01 valid style subset round-trips byte-stable + idempotent (write + read)", () => {
  const block = fieldBlock({
    style: {
      width: "half",
      minHeight: 240,
      margin: { top: 24 },
      padding: { top: 16, bottom: 16 },
      align: "center",
    },
  });
  const doc = buildScreenDoc(block);
  const once = normalizeScreenDocumentV1(doc);
  expect(once).toEqual(doc);
  // Idempotent: normalizing the output changes nothing (bytes stable).
  expect(normalizeScreenDocumentV1(once)).toEqual(once);
  // Read path funnels through the same normalizer.
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  // Byte-stability of the normalized form: re-normalizing is stringify-identical.
  expect(JSON.stringify(normalizeScreenDocumentV1(once))).toBe(JSON.stringify(once));
});

test("TASK-503-01 absent style key stays absent (byte-stability guard, write + read)", () => {
  const doc = buildScreenDoc(fieldBlock({}));
  const outBlock = styledBlockData(fieldBlock({}));
  expect("style" in outBlock).toBe(false);
  expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
});

test("TASK-503-01 unknown style / box keys throw on write AND read", () => {
  const unknownStyleKey = buildScreenDoc(
    fieldBlock({ style: { width: "half", background: "red" } })
  );
  const unknownBoxKey = buildScreenDoc(fieldBlock({ style: { margin: { top: 1, inline: 2 } } }));
  expect(() => normalizeScreenDocumentV1(unknownStyleKey)).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenDocumentV1ForRead(unknownStyleKey)).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenDocumentV1(unknownBoxKey)).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenDocumentV1ForRead(unknownBoxKey)).toThrow(
    "custom_screen_definition_invalid"
  );
});

test("TASK-503-01 invalid style values coerce / clamp (never throw)", () => {
  const style = (styledBlockData(
    fieldBlock({
      style: {
        width: "huge",
        align: 7,
        minHeight: 99999,
        margin: { top: "12" },
      },
    })
  ).style ?? {}) as Record<string, unknown>;
  expect(style.width).toBe("auto"); // not-in-enum → fallback
  expect(style.align).toBe("start"); // non-string → fallback
  expect(style.minHeight).toBe(SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max); // 640
  expect(style.margin).toEqual({ top: 0 }); // non-number → min

  const low = (styledBlockData(fieldBlock({ style: { minHeight: -5 } })).style ?? {}) as Record<
    string,
    unknown
  >;
  expect(low.minHeight).toBe(0);
  const floor = (styledBlockData(fieldBlock({ style: { minHeight: 24.9 } })).style ?? {}) as Record<
    string,
    unknown
  >;
  expect(floor.minHeight).toBe(24);
  const nan = (styledBlockData(fieldBlock({ style: { minHeight: Number.NaN } })).style ??
    {}) as Record<string, unknown>;
  expect(nan.minHeight).toBe(0);
});

test("TASK-503-01 empty / junk style prunes to an absent style key (no throw)", () => {
  expect("style" in styledBlockData(fieldBlock({ style: {} }))).toBe(false);
  expect("style" in styledBlockData(fieldBlock({ style: { margin: {} } }))).toBe(false);
  // non-record style container drops silently, never throws.
  expect(() => styledBlockData(fieldBlock({ style: "junk" }))).not.toThrow();
  expect("style" in styledBlockData(fieldBlock({ style: "junk" }))).toBe(false);
});

test("TASK-503-01 variant regression: still round-trips byte-stable + validates (decision 1)", () => {
  const doc = buildScreenDoc(fieldBlock({ variant: "anything" }));
  expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  const definition = buildV4WithBlocks([fieldBlock({ variant: "anything" })]);
  expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
});

test("TASK-503-01 Ajv layer accepts valid style + rejects unknown key / out-of-range / junk", () => {
  const withValidStyle = buildV4WithBlocks([
    fieldBlock({
      style: { width: "half", minHeight: 240, margin: { top: 24 }, align: "center" },
    }),
  ]);
  expect(() => validate(customScreenDefinitionSchema, withValidStyle)).not.toThrow();

  // A definition WITHOUT any style still validates (no new required member).
  expect(() =>
    validate(customScreenDefinitionSchema, buildV4WithBlocks([fieldBlock({})]))
  ).not.toThrow();

  for (const badStyle of [
    { width: "half", background: "red" }, // unknown key
    { minHeight: 10000 }, // out of range
    "junk", // non-object
  ]) {
    expect(() =>
      validate(customScreenDefinitionSchema, buildV4WithBlocks([fieldBlock({ style: badStyle })]))
    ).toThrow();
  }
});

test("TASK-503-01 image ratio is NOT schema-coerced: legacy / '' free text round-trips byte-stable (decision 3)", () => {
  const imageBlock = (data: Record<string, unknown>) => ({ id: "image-1", type: "image", data });
  for (const ratio of ["16/9", "16:9", ""]) {
    const doc = buildScreenDoc(imageBlock({ label: "Image", fit: "cover", ratio }));
    expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
    expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  }
  // Image WITHOUT ratio stays absent.
  const noRatio = styledBlockData({
    id: "image-1",
    type: "image",
    data: { label: "Image", fit: "cover" },
  } as Record<string, unknown>);
  expect("ratio" in (noRatio.data as Record<string, unknown>)).toBe(false);
});

test("TASK-503-01 exported style constants are pinned (renderer/inspector class maps depend on them)", () => {
  expect(screenBlockWidths).toEqual(["auto", "full", "half", "third", "two-thirds"]);
  expect(screenBlockAligns).toEqual(["start", "center", "end", "stretch"]);
  expect(screenImageRatios).toEqual(["auto", "1/1", "4/3", "16/9", "3/2"]);
  expect(SCREEN_BLOCK_MIN_HEIGHT_CLAMP).toEqual({ min: 0, max: 640 });
  expect(screenBlockBoxSides).toEqual(["top", "right", "bottom", "left"]);
});

// ---------------------------------------------------------------------------
// TASK-505-01 Item A: ScreenSectionStyleV1 section-style channel
// ---------------------------------------------------------------------------

const sectionWithStyle = (style: unknown) => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "section-default",
      type: "section" as const,
      data: { title: "Details" },
      ...(style !== undefined ? { style } : {}),
      blocks: [] as unknown[],
    },
  ],
});

const normalizedSection = (style: unknown) =>
  normalizeScreenDocumentV1(sectionWithStyle(style)).sections[0] as Record<string, unknown>;

test("TASK-505-01 valid section style round-trips byte-stable + idempotent (write + read)", () => {
  const doc = sectionWithStyle({ columns: "3-1", columnGap: 24 });
  const once = normalizeScreenDocumentV1(doc);
  expect(once).toEqual(doc);
  expect(normalizeScreenDocumentV1(once)).toEqual(once);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  expect(JSON.stringify(normalizeScreenDocumentV1(once))).toBe(JSON.stringify(once));
});

test("TASK-505-01 absent section style stays absent (byte-stable, no grid — vertical stack)", () => {
  const doc = sectionWithStyle(undefined);
  expect("style" in normalizedSection(undefined)).toBe(false);
  expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
});

test("TASK-505-01 unknown section-style KEY throws (write + read)", () => {
  const bad = sectionWithStyle({ columns: "2", rows: 3 });
  expect(() => normalizeScreenDocumentV1(bad)).toThrow("custom_screen_definition_invalid");
  expect(() => normalizeScreenDocumentV1ForRead(bad)).toThrow("custom_screen_definition_invalid");
});

test("TASK-505-01 section-style values coerce / clamp (never throw)", () => {
  const junkColumns = normalizedSection({ columns: "9-9" }).style as Record<string, unknown>;
  expect(junkColumns.columns).toBe("1"); // not-in-enum → single column (stack, harmless)
  const nonString = normalizedSection({ columns: 4 }).style as Record<string, unknown>;
  expect(nonString.columns).toBe("1");
  const overMax = normalizedSection({ columnGap: 9999 }).style as Record<string, unknown>;
  expect(overMax.columnGap).toBe(SCREEN_SECTION_COLUMN_GAP_CLAMP.max); // 64
  const under = normalizedSection({ columnGap: -10 }).style as Record<string, unknown>;
  expect(under.columnGap).toBe(0);
  const floored = normalizedSection({ columnGap: 12.9 }).style as Record<string, unknown>;
  expect(floored.columnGap).toBe(12);
  const junkGap = normalizedSection({ columnGap: "wide" }).style as Record<string, unknown>;
  expect(junkGap.columnGap).toBe(0); // junk → min
});

test("TASK-505-01 empty / junk section style prunes to an absent style key (no throw)", () => {
  expect("style" in normalizedSection({})).toBe(false);
  expect(() => normalizedSection("junk")).not.toThrow();
  expect("style" in normalizedSection("junk")).toBe(false);
});

test("TASK-505-01 screenSectionColumnTemplate exports all 13 presets → correct fr strings", () => {
  expect(screenSectionColumnPresets).toEqual([
    "1",
    "2",
    "3",
    "4",
    "1-1",
    "1-2",
    "2-1",
    "1-3",
    "3-1",
    "2-3",
    "3-2",
    "1-1-1",
    "1-1-1-1",
  ]);
  expect(screenSectionColumnTemplate["3-1"]).toBe("3fr 1fr");
  expect(screenSectionColumnTemplate["1-3"]).toBe("1fr 3fr");
  expect(screenSectionColumnTemplate["2"]).toBe("1fr 1fr");
  expect(screenSectionColumnTemplate["1-1-1-1"]).toBe("1fr 1fr 1fr 1fr");
  // Every preset has a template (no drift).
  for (const preset of screenSectionColumnPresets) {
    expect(typeof screenSectionColumnTemplate[preset]).toBe("string");
  }
});

test("TASK-505-01 Ajv screenSectionV1Schema accepts valid style, rejects unknown key + out-of-range gap", () => {
  const withStyle = (style: unknown) => ({
    schemaVersion: 4,
    listView: buildDefaultListViewDefinition(),
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [{ id: "s1", type: "section", data: { title: "D" }, style, blocks: [] }],
      },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    },
  });
  expect(() =>
    validate(customScreenDefinitionSchema, withStyle({ columns: "3-1", columnGap: 24 }))
  ).not.toThrow();
  expect(() => validate(customScreenDefinitionSchema, withStyle({ rows: 3 }))).toThrow();
  expect(() => validate(customScreenDefinitionSchema, withStyle({ columnGap: 999 }))).toThrow();
  expect(() => validate(customScreenDefinitionSchema, withStyle({ columns: "5-5" }))).toThrow();
});

// ---------------------------------------------------------------------------
// TASK-505-01 Item B: binding-integrity GC (field-orphan prune-with-warning)
// ---------------------------------------------------------------------------

const houseProjectsContext = {
  contentType: {
    id: "house-projects",
    slug: "house-projects",
    name: "House Projects",
    schema: {
      properties: {
        projectStatus: { type: "string", enum: ["planned", "active"] },
      },
    },
  },
};

const editorDefWithBindings = (bindings: unknown[], blocks: unknown[]) => ({
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
        sections: [{ id: "section-1", type: "section", data: {}, blocks }],
      },
      bindings,
      saveMode: "entry",
      interactionMode: "inline",
    },
  },
});

test("TASK-505-01 field-orphan binding is pruned + recorded in the sink (write path, recoverable)", () => {
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const definition = normalizeCustomScreenDefinitionForWrite(
    editorDefWithBindings(
      [
        {
          id: "binding-1",
          blockId: "header-1",
          propPath: "title",
          source: "entry",
          field: "projectStatus",
          mode: "readwrite",
        },
        {
          id: "binding-2",
          blockId: "header-1",
          propPath: "sub",
          source: "entry",
          field: "bathrooms",
          mode: "readwrite",
        },
      ],
      [{ id: "header-1", type: "record-header", data: {} }]
    ),
    houseProjectsContext,
    sink
  );
  const bindings = definition.editorView.bindings;
  expect(bindings.map((b) => b.field)).toEqual(["projectStatus"]); // orphan pruned, order kept
  expect(sink.removedFieldOrphans).toEqual(["bathrooms"]);
  expect(sink.removedBlockOrphans).toEqual([]);
});

test("TASK-505-01 block-orphan binding is pruned inline (not hard-throw) when a sink is threaded", () => {
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const definition = normalizeCustomScreenDefinitionForWrite(
    editorDefWithBindings(
      [
        {
          id: "binding-1",
          blockId: "ghost-block",
          propPath: "title",
          source: "entry",
          field: "projectStatus",
          mode: "readwrite",
        },
      ],
      [{ id: "header-1", type: "record-header", data: {} }]
    ),
    houseProjectsContext,
    sink
  );
  expect(definition.editorView.bindings).toEqual([]);
  expect(sink.removedBlockOrphans).toEqual(["projectStatus"]);
});

test("TASK-505-01 without a sink the field-orphan case STILL hard-throws (read/fallback path preserved)", () => {
  expect(() =>
    normalizeCustomScreenDefinition(
      editorDefWithBindings(
        [
          {
            id: "binding-1",
            blockId: "header-1",
            propPath: "title",
            source: "entry",
            field: "bathrooms",
            mode: "readwrite",
          },
        ],
        [{ id: "header-1", type: "record-header", data: {} }]
      ),
      houseProjectsContext
    )
  ).toThrow("custom_screen_definition_invalid");
});

test("TASK-505-01 a fully-valid binding set is byte-identical with OR without a sink (non-destructive)", () => {
  const validDef = editorDefWithBindings(
    [
      {
        id: "binding-1",
        blockId: "header-1",
        propPath: "title",
        source: "entry",
        field: "projectStatus",
        mode: "readwrite",
      },
    ],
    [{ id: "header-1", type: "record-header", data: {} }]
  );
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const withSink = normalizeCustomScreenDefinitionForWrite(validDef, houseProjectsContext, sink);
  const noSink = normalizeCustomScreenDefinition(validDef, houseProjectsContext);
  expect(withSink.editorView.bindings).toEqual(noSink.editorView.bindings);
  expect(sink.removedFieldOrphans).toEqual([]);
  expect(sink.removedBlockOrphans).toEqual([]);
});

test("TASK-505-01 malformed binding (non-record / missing blockId) still throws even with a sink", () => {
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  expect(() =>
    normalizeCustomScreenDefinitionForWrite(
      editorDefWithBindings(["junk"], [{ id: "header-1", type: "record-header", data: {} }]),
      houseProjectsContext,
      sink
    )
  ).toThrow("custom_screen_definition_invalid");
  expect(() =>
    normalizeCustomScreenDefinitionForWrite(
      editorDefWithBindings(
        [{ id: "b", propPath: "x", source: "entry", field: "projectStatus", mode: "read" }],
        [{ id: "header-1", type: "record-header", data: {} }]
      ),
      houseProjectsContext,
      sink
    )
  ).toThrow("custom_screen_definition_invalid");
});

test("TASK-505-01 stored field-orphan doc READS non-fatally and RETAINS the orphan for reopen recovery", () => {
  const stored = editorDefWithBindings(
    [
      {
        id: "binding-1",
        blockId: "header-1",
        propPath: "title",
        source: "entry",
        field: "bathrooms",
        mode: "readwrite",
      },
    ],
    [{ id: "header-1", type: "record-header", data: {} }]
  );
  const read = normalizeCustomScreenDefinitionForRead(stored, houseProjectsContext);
  expect(read.schemaVersion).toBe(4);
  // TASK-505-03: the editor-view read RETAINS the field-orphan (binding → LIVE block, dead
  // content-type field) so the reopen recovery UX (detectScreenBindingOrphans → amber notice)
  // can NAME the deleted field. The read is non-fatal (screen still opens); the WRITE path
  // prunes it on Save. Pruning on read would make the reopen notice unreachable (505-03 #5/#6).
  expect(read.editorView.bindings.map((b) => b.field)).toContain("bathrooms");
});

// ---------------------------------------------------------------------------
// TASK-540-01-L01: exact fixed-kind schemas, Tabs identity, and binding GC
// ---------------------------------------------------------------------------

const fixedKindDataCases = {
  heading: { label: "", text: "", level: 3, align: "right", field: "headline" },
  text: { content: "", tone: "muted", label: " " },
  stat: {
    label: "Total",
    format: "money",
    trend: "flat",
    deltaField: "",
    field: "amount",
  },
  divider: { variant: "label", label: "" },
  image: {
    label: "Image",
    fit: "contain",
    ratio: "16:9",
    field: "heroImage",
    src: "/media/hero.jpg",
  },
  "related-list": {
    label: "Related",
    target: "",
    displayField: "title",
    variant: "cards",
    limit: 50,
    field: "relatedItems",
  },
  tabs: {
    label: "Tabs",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "details", label: "Details" },
    ],
  },
  button: {
    label: "Open",
    action: "link",
    variant: "secondary",
    href: "/catalog",
    field: "targetUrl",
  },
} as const;

const fixedKindBlock = (
  type: keyof typeof fixedKindDataCases,
  data: Record<string, unknown> = fixedKindDataCases[type]
) => ({
  id: `${type}-strict`,
  type,
  data,
  ...(type === "tabs" ? { slots: { overview: [], details: [] } } : {}),
});

test("TASK-540-01 fixed-kind schemas and direct write normalization share one exact contract", () => {
  for (const [type, data] of Object.entries(fixedKindDataCases)) {
    const block = fixedKindBlock(type as keyof typeof fixedKindDataCases, { ...data });
    const definition = buildV4WithBlocks([block]);
    expect(() => validate(customScreenDefinitionSchema, definition), type).not.toThrow();
    expect(
      normalizeCustomScreenDefinitionForWrite({ definition }).editorView.document.sections[0]
        ?.blocks[0],
      type
    ).toEqual(block);

    const withUnknown = fixedKindBlock(type as keyof typeof fixedKindDataCases, {
      ...data,
      rejectedNestedKey: true,
    });
    expect(
      () => validate(customScreenDefinitionSchema, buildV4WithBlocks([withUnknown])),
      type
    ).toThrow("Invalid payload");
    expect(
      () =>
        normalizeCustomScreenDefinitionForWrite({
          definition: buildV4WithBlocks([withUnknown]),
        }),
      type
    ).toThrow("custom_screen_definition_invalid");
  }
  for (const data of [undefined, null, [], "not-an-object"]) {
    const block = { id: "heading-data-shape", type: "heading", data };
    expect(() => validate(customScreenDefinitionSchema, buildV4WithBlocks([block]))).toThrow(
      "Invalid payload"
    );
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: buildV4WithBlocks([block]) })
    ).toThrow(CustomScreenDefinitionError);
  }
});

test("TASK-540-01 writes allow only fixed and explicit compatibility block types at every depth", () => {
  for (const type of [
    "field",
    "field-group",
    "record-header",
    "columns",
    "rich-text",
    "legacy-widget",
  ]) {
    const block = { id: `${type}-compat`, type, data: { legacyExtra: true } };
    const definition = buildV4WithBlocks([block]);
    expect(() => validate(customScreenDefinitionSchema, definition), type).not.toThrow();
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition }), type).not.toThrow();
  }

  const unsupportedDefinitions = [
    buildV4WithBlocks([{ id: "actions-root", type: "actions", data: {} }]),
    buildV4WithBlocks([
      {
        id: "compat-parent",
        type: "field-group",
        data: {},
        children: [{ id: "plugin-child", type: "plugin-card", data: {} }],
      },
    ]),
    buildV4WithBlocks([
      {
        id: "compat-slot-parent",
        type: "columns",
        data: {},
        slots: { left: [{ id: "unknown-slot", type: "unknown-block", data: {} }] },
      },
    ]),
  ];
  for (const definition of unsupportedDefinitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      CustomScreenDefinitionError
    );
  }
});

test("TASK-540-01 every fixed path field shares the route max-160 write boundary", () => {
  const boundary = "a".repeat(160);
  const overflow = "a".repeat(161);
  const cases: Array<{
    type: "heading" | "stat" | "image" | "related-list" | "button";
    key: string;
    base?: Record<string, unknown>;
  }> = [
    { type: "heading", key: "field" },
    { type: "stat", key: "deltaField" },
    { type: "stat", key: "field" },
    { type: "image", key: "field" },
    { type: "related-list", key: "target" },
    { type: "related-list", key: "displayField" },
    { type: "related-list", key: "field" },
    { type: "button", key: "field", base: { action: "link" } },
  ];
  for (const [index, pathCase] of cases.entries()) {
    const block = (value: string) => ({
      id: `path-${index}`,
      type: pathCase.type,
      data: { ...pathCase.base, [pathCase.key]: value },
    });
    const boundaryDefinition = buildV4WithBlocks([block(boundary)]);
    expect(() => validate(customScreenDefinitionSchema, boundaryDefinition)).not.toThrow();
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: boundaryDefinition })
    ).not.toThrow();

    const overflowDefinition = buildV4WithBlocks([block(overflow)]);
    expect(() => validate(customScreenDefinitionSchema, overflowDefinition)).toThrow(
      "Invalid payload"
    );
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: overflowDefinition })
    ).toThrow(CustomScreenDefinitionError);
  }
});

test("TASK-540-01 fixed data labels stay optional and clearable while image ratio stays opaque", () => {
  for (const label of [undefined, "", "   "] as const) {
    const data = {
      text: "",
      ...(label === undefined ? {} : { label }),
    };
    const definition = buildV4WithBlocks([{ id: "heading-label", type: "heading", data }]);
    expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
    expect(
      normalizeCustomScreenDefinitionForWrite({ definition }).editorView.document.sections[0]
        ?.blocks[0]?.data
    ).toEqual(data);
  }

  for (const ratio of ["16/9", "16:9", "", "legacy-free-text"]) {
    const block = {
      id: "image-ratio",
      type: "image",
      data: { label: "Image", ratio },
    };
    const definition = buildV4WithBlocks([block]);
    expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
    expect(normalizeCustomScreenDefinitionForWrite({ definition })).toEqual(definition);
    expect(normalizeCustomScreenDefinitionForRead({ definition })).toEqual(definition);
  }
});

test("TASK-540-01 recursive fixed-kind validation has no root, children, or slot bypass", () => {
  const invalidHeading = (id: string) => ({
    id,
    type: "heading",
    data: { text: "Nested", rejectedNestedKey: "must-not-pass" },
  });
  const definitions = [
    buildV4WithBlocks([invalidHeading("root-invalid")]),
    buildV4WithBlocks([
      {
        id: "child-level-1",
        type: "field-group",
        data: {},
        children: [
          {
            id: "child-level-2",
            type: "field-group",
            data: {},
            children: [invalidHeading("child-invalid")],
          },
        ],
      },
    ]),
    buildV4WithBlocks([
      {
        id: "slot-level-1",
        type: "columns",
        data: {},
        slots: {
          left: [
            {
              id: "slot-level-2",
              type: "columns",
              data: {},
              slots: { right: [invalidHeading("slot-invalid")] },
            },
          ],
        },
      },
    ]),
  ];
  for (const definition of definitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
  }
});

test("TASK-540-01 recursive collection bounds remain sections=120 and block arrays=500", () => {
  expect(SCREEN_DOCUMENT_SECTIONS_MAX).toBe(120);
  expect(SCREEN_BLOCK_COLLECTION_MAX).toBe(500);

  const compatBlock = (id: string) => ({ id, type: "field", data: {} });
  const section = (index: number, blocks: unknown[] = []) => ({
    id: `section-${index}`,
    type: "section",
    data: {},
    blocks,
  });
  const withSections = (sections: unknown[]) => ({
    ...buildV4WithBlocks([]),
    editorView: {
      ...buildV4WithBlocks([]).editorView,
      document: { schemaVersion: 1, sections },
    },
  });
  const expectWritePass = (definition: unknown) => {
    expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).not.toThrow();
  };
  const expectWriteReject = (definition: unknown) => {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      CustomScreenDefinitionError
    );
  };

  expectWritePass(
    withSections(Array.from({ length: SCREEN_DOCUMENT_SECTIONS_MAX }, (_, index) => section(index)))
  );
  expectWriteReject(
    withSections(
      Array.from({ length: SCREEN_DOCUMENT_SECTIONS_MAX + 1 }, (_, index) => section(index))
    )
  );

  const fiveHundred = Array.from({ length: SCREEN_BLOCK_COLLECTION_MAX }, (_, index) =>
    compatBlock(`block-${index}`)
  );
  expectWritePass(withSections([section(1, fiveHundred)]));
  expectWriteReject(withSections([section(1, [...fiveHundred, compatBlock("overflow")])]));
  for (const nested of [{ children: fiveHundred }, { slots: { content: fiveHundred } }]) {
    expectWritePass(
      withSections([section(1, [{ id: "container", type: "field-group", data: {}, ...nested }])])
    );
  }
  for (const nested of [
    { children: [...fiveHundred, compatBlock("child-overflow")] },
    { slots: { content: [...fiveHundred, compatBlock("slot-overflow")] } },
  ]) {
    expectWriteReject(
      withSections([
        section(1, [{ id: "overflow-container", type: "field-group", data: {}, ...nested }]),
      ])
    );
  }
});

test("TASK-540-01 Tabs enforce exact items, unique IDs, label bounds, and matching slots", () => {
  expect(SCREEN_TABS_MIN).toBe(1);
  expect(SCREEN_TABS_MAX).toBe(24);
  expect(SCREEN_TAB_LABEL_MAX).toBe(120);
  expect(SCREEN_TAB_ID.source).toBe("^[a-z][a-z0-9_-]{0,63}$");

  const invalidSchemaTabs = [
    [],
    [{ id: "", label: "Blank" }],
    [{ id: "UPPER", label: "Upper" }],
    [{ id: "valid", label: "   " }],
    [{ id: "valid", label: "x".repeat(SCREEN_TAB_LABEL_MAX + 1) }],
    [{ id: "valid", label: "Valid", extra: true }],
    Array.from({ length: SCREEN_TABS_MAX + 1 }, (_, index) => ({
      id: `tab-${index}`,
      label: `Tab ${index}`,
    })),
  ];
  for (const tabs of invalidSchemaTabs) {
    const block = { id: "tabs-invalid", type: "tabs", data: { tabs }, slots: {} };
    expect(() => validate(customScreenDefinitionSchema, buildV4WithBlocks([block]))).toThrow(
      "Invalid payload"
    );
  }

  const duplicate = {
    id: "tabs-duplicate",
    type: "tabs",
    data: {
      tabs: [
        { id: "same", label: " First " },
        { id: "same", label: "Second" },
      ],
    },
    slots: { same: [] },
  };
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({ definition: buildV4WithBlocks([duplicate]) })
  ).toThrow(CustomScreenDefinitionError);

  const mismatch = {
    id: "tabs-mismatch",
    type: "tabs",
    data: { tabs: [{ id: "expected", label: "Expected" }] },
    slots: { other: [] },
  };
  try {
    normalizeCustomScreenDefinitionForWrite({ definition: buildV4WithBlocks([mismatch]) });
    throw new Error("expected tab/slot mismatch");
  } catch (error) {
    expect(error).toBeInstanceOf(CustomScreenDefinitionError);
    expect((error as CustomScreenDefinitionError).fields).toEqual([
      "definition.editorView.document.sections.0.blocks.0.data.tabs",
      "definition.editorView.document.sections.0.blocks.0.slots",
    ]);
  }

  const trimmed = {
    id: "tabs-trimmed",
    type: "tabs",
    data: { tabs: [{ id: "overview", label: "  Overview  " }] },
    slots: { overview: [] },
  };
  expect(
    normalizeCustomScreenDefinitionForWrite({
      definition: buildV4WithBlocks([trimmed]),
    }).editorView.document.sections[0]?.blocks[0]?.data.tabs
  ).toEqual([{ id: "overview", label: "Overview" }]);
});

test("TASK-540-01 Tabs label limits use Unicode code points without splitting surrogates", () => {
  const unicodeLabel = "😀".repeat(SCREEN_TAB_LABEL_MAX);
  const unicodeBlock = (label: string) => ({
    id: "unicode-tabs",
    type: "tabs",
    data: { tabs: [{ id: "unicode", label }] },
    slots: { unicode: [] },
  });
  const boundaryDefinition = buildV4WithBlocks([unicodeBlock(unicodeLabel)]);
  expect(() => validate(customScreenDefinitionSchema, boundaryDefinition)).not.toThrow();
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({ definition: boundaryDefinition })
  ).not.toThrow();

  const overflowDefinition = buildV4WithBlocks([unicodeBlock(`${unicodeLabel}😀`)]);
  expect(() => validate(customScreenDefinitionSchema, overflowDefinition)).toThrow(
    "Invalid payload"
  );
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: overflowDefinition })).toThrow(
    CustomScreenDefinitionError
  );

  const repaired = normalizeCustomScreenDefinitionForRead({
    definition: overflowDefinition,
  }).editorView.document.sections[0]?.blocks[0]?.data.tabs as ScreenTabItem[];
  expect(Array.from(repaired[0]?.label ?? "")).toHaveLength(SCREEN_TAB_LABEL_MAX);
  expect(repaired[0]?.label.endsWith("😀")).toBe(true);
  expect(repaired[0]?.label).not.toContain("�");
});

test("TASK-540-01 canonical Tabs preserve tab and slot key insertion order byte-identically", () => {
  const block = {
    id: "ordered-tabs",
    type: "tabs",
    data: {
      tabs: [
        { label: "Overview", id: "overview" },
        { label: "Details", id: "details" },
      ],
    },
    slots: { details: [], overview: [] },
  };
  const definition = buildV4WithBlocks([block]);
  const before = JSON.stringify({ data: block.data, slots: block.slots });
  const writtenBlock = normalizeCustomScreenDefinitionForWrite({ definition }).editorView.document
    .sections[0]?.blocks[0];
  const readBlock = normalizeCustomScreenDefinitionForRead({ definition }).editorView.document
    .sections[0]?.blocks[0];

  expect(JSON.stringify({ data: writtenBlock?.data, slots: writtenBlock?.slots })).toBe(before);
  expect(JSON.stringify({ data: readBlock?.data, slots: readBlock?.slots })).toBe(before);
});

test("TASK-540-01 stored Tabs repair is deterministic and never duplicates slot content", () => {
  const slotContent = [{ id: "inside-first", type: "field", data: { label: "First" } }];
  const stored = {
    id: "legacy-tabs",
    type: "tabs",
    data: {
      tabs: [
        { id: "same", label: " First " },
        { id: "same", label: "Second" },
        { id: "not valid", label: "" },
      ],
    },
    slots: { same: slotContent, "not valid": [{ id: "inside-third", type: "field", data: {} }] },
  };
  const read = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([stored]),
  });
  const repaired = read.editorView.document.sections[0]?.blocks[0];
  expect(repaired?.data.tabs).toEqual([
    { id: "same", label: "First" },
    { id: "tab-2", label: "Second" },
    { id: "tab-3", label: "Tab 3" },
  ]);
  expect(repaired?.slots?.same).toEqual(slotContent);
  expect(repaired?.slots?.["tab-2"]).toEqual([]);
  expect(repaired?.slots?.["tab-3"]?.[0]?.id).toBe("inside-third");
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
});

test("TASK-540-01 stored Tabs with non-record data repair locally without dropping sibling or slot content", () => {
  const overviewContent = [
    { id: "overview-copy", type: "text", data: { content: "Keep overview" } },
  ];
  const detailsContent = [{ id: "details-copy", type: "text", data: { content: "Keep details" } }];
  const sibling = { id: "sibling-copy", type: "text", data: { content: "Keep sibling" } };
  const storedEditor = buildV4WithBlocks([
    {
      id: "legacy-tabs-data",
      type: "tabs",
      data: "malformed-stored-data",
      slots: { overview: overviewContent, details: detailsContent },
    },
    sibling,
  ]);
  const stored = {
    ...storedEditor,
    listView: {
      ...storedEditor.listView,
      rowTemplate: {
        document: storedEditor.editorView.document,
        bindings: [],
      },
    },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  for (const blocks of [
    read.editorView.document.sections[0]?.blocks ?? [],
    read.listView.rowTemplate?.document.sections[0]?.blocks ?? [],
  ]) {
    const repairedTabs = blocks[0];
    expect(blocks[1]).toEqual(sibling);
    expect(repairedTabs?.data.tabs).toEqual([
      { id: "details", label: "Tab 1" },
      { id: "overview", label: "Tab 2" },
    ]);
    expect(repairedTabs?.slots?.overview).toEqual(overviewContent);
    expect(repairedTabs?.slots?.details).toEqual(detailsContent);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
});

test("TASK-540-01 strict V4 ID and path writes reject the same non-canonical values in Ajv and the normalizer", () => {
  const invalidDefinitions = [
    buildV4WithBlocks([{ id: " padded-block ", type: "heading", data: { text: "Title" } }]),
    buildV4WithBlocks([{ id: "__proto__.polluted", type: "heading", data: { text: "Title" } }]),
    buildV4WithBlocks([{ id: "b".repeat(161), type: "heading", data: { text: "Title" } }]),
    ...[".leading", "trailing.", "a..b"].map((id) =>
      buildV4WithBlocks([{ id, type: "heading", data: { text: "Title" } }])
    ),
    {
      ...buildV4WithBlocks([]),
      editorView: {
        ...buildV4WithBlocks([]).editorView,
        document: {
          schemaVersion: 1,
          sections: [{ id: " padded-section ", type: "section", data: {}, blocks: [] }],
        },
      },
    },
    ...[".leading", "trailing.", "a..b"].map((id) => {
      const definition = buildV4WithBlocks([]);
      return {
        ...definition,
        editorView: {
          ...definition.editorView,
          document: {
            schemaVersion: 1,
            sections: [{ id, type: "section", data: {}, blocks: [] }],
          },
        },
      };
    }),
    buildV4WithBlocks([{ id: "path-whitespace", type: "heading", data: { field: " title " } }]),
    buildV4WithBlocks([
      { id: "path-unsafe", type: "heading", data: { field: "constructor.value" } },
    ]),
    buildV4WithBlocks([{ id: "path-overflow", type: "heading", data: { field: "f".repeat(161) } }]),
    buildV4WithBlocks([
      { id: "path-empty-segment", type: "heading", data: { field: "content..title" } },
    ]),
  ];

  for (const definition of invalidDefinitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      "custom_screen_definition_invalid"
    );
  }

  const definitionWithBinding = (overrides: Record<string, unknown>) => {
    const definition = buildV4WithBlocks([
      { id: "binding-target", type: "field", data: { label: "Title" } },
    ]);
    return {
      ...definition,
      editorView: {
        ...definition.editorView,
        bindings: [
          {
            id: "binding-1",
            blockId: "binding-target",
            propPath: "value",
            source: "entry",
            field: "title",
            mode: "read",
            ...overrides,
          },
        ],
      },
    };
  };
  for (const key of ["blockId", "propPath", "field"] as const) {
    for (const value of [
      " padded ",
      "constructor.value",
      "x".repeat(161),
      ".leading",
      "trailing.",
      "a..b",
    ]) {
      const definition = definitionWithBinding({ [key]: value });
      expect(
        () => validate(customScreenDefinitionSchema, definition),
        `${key}:${value.length}`
      ).toThrow("Invalid payload");
      expect(
        () => normalizeCustomScreenDefinitionForWrite({ definition }),
        `${key}:${value.length}`
      ).toThrow("custom_screen_definition_invalid");
    }
  }

  const dottedBase = buildV4WithBlocks([
    { id: "binding.target", type: "heading", data: { field: "content.title" } },
  ]);
  const validDottedDefinition = {
    ...dottedBase,
    editorView: {
      ...dottedBase.editorView,
      document: {
        ...dottedBase.editorView.document,
        sections: dottedBase.editorView.document.sections.map((section) => ({
          ...section,
          id: "section.details",
        })),
      },
      bindings: [
        {
          id: "binding-dotted",
          blockId: "binding.target",
          propPath: "content.value",
          source: "entry",
          field: "content.title",
          mode: "read",
        },
      ],
    },
  };
  expect(() => validate(customScreenDefinitionSchema, validDottedDefinition)).not.toThrow();
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({ definition: validDottedDefinition })
  ).not.toThrow();

  const missingSource = definitionWithBinding({});
  Reflect.deleteProperty(missingSource.editorView.bindings[0]!, "source");
  const invalidSourceAndModeDefinitions = [
    missingSource,
    definitionWithBinding({ source: " entry " }),
    definitionWithBinding({ source: 42 }),
    definitionWithBinding({ mode: "invalid" }),
    definitionWithBinding({ mode: null }),
    definitionWithBinding({ mode: " read " }),
  ];
  for (const definition of invalidSourceAndModeDefinitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      "custom_screen_definition_invalid"
    );
  }

  const missingMode = definitionWithBinding({});
  Reflect.deleteProperty(missingMode.editorView.bindings[0]!, "mode");
  expect(() => validate(customScreenDefinitionSchema, missingMode)).not.toThrow();
  expect(
    normalizeCustomScreenDefinitionForWrite({ definition: missingMode }).editorView.bindings[0]
      ?.mode
  ).toBe("readwrite");

  const stored = buildV4WithBlocks([
    { id: " repaired-block ", type: "heading", data: { field: " title " } },
  ]);
  const repaired = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(repaired.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "repaired-block",
    data: { field: "title" },
  });
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repaired })).toEqual(repaired);

  const storedBinding = definitionWithBinding({
    blockId: " binding-target ",
    propPath: " value ",
    field: " title ",
  });
  const repairedBinding = normalizeCustomScreenDefinitionForRead({ definition: storedBinding });
  expect(repairedBinding.editorView.bindings).toEqual([
    {
      id: "binding-1",
      blockId: "binding-target",
      propPath: "value",
      source: "entry",
      field: "title",
      mode: "read",
    },
  ]);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repairedBinding })).toEqual(
    repairedBinding
  );
});

test("TASK-540-01 widgetId is compatibility-only and canonicalizes to blockId in editor and row bindings", () => {
  const target = { id: "legacy-binding-target", type: "field", data: { label: "Title" } };
  const aliasBinding = {
    id: "legacy-binding",
    widgetId: target.id,
    propPath: "value",
    field: "title",
  };
  const storedEditor = buildV4WithBlocks([target]);
  const stored = {
    ...storedEditor,
    listView: {
      ...storedEditor.listView,
      rowTemplate: {
        document: storedEditor.editorView.document,
        bindings: [aliasBinding],
      },
    },
    editorView: {
      ...storedEditor.editorView,
      bindings: [aliasBinding],
    },
  };
  const before = JSON.stringify(stored);

  expect(normalizeScreenFieldBindings([aliasBinding])).toEqual([
    {
      id: "legacy-binding",
      blockId: target.id,
      propPath: "value",
      source: "entry",
      field: "title",
      mode: "readwrite",
    },
  ]);

  expect(() => validate(customScreenDefinitionSchema, stored)).toThrow("Invalid payload");
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: stored })).toThrow(
    "custom_screen_definition_invalid"
  );

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(JSON.stringify(stored)).toBe(before);
  for (const bindings of [read.editorView.bindings, read.listView.rowTemplate?.bindings ?? []]) {
    expect(bindings).toEqual([
      {
        id: "legacy-binding",
        blockId: target.id,
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
    ]);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);

  const withBothIds = {
    ...storedEditor,
    editorView: {
      ...storedEditor.editorView,
      bindings: [{ ...aliasBinding, blockId: target.id }],
    },
  };
  expect(() => validate(customScreenDefinitionSchema, withBothIds)).toThrow("Invalid payload");
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: withBothIds })).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(
    normalizeCustomScreenDefinitionForRead({ definition: withBothIds }).editorView.bindings
  ).toEqual([
    {
      id: "legacy-binding",
      blockId: target.id,
      propPath: "value",
      source: "entry",
      field: "title",
      mode: "readwrite",
    },
  ]);

  expect(() => normalizeScreenFieldBindings([{ ...aliasBinding, blockId: target.id }])).toThrow(
    "custom_screen_definition_invalid"
  );
  const missingCompatibilityTarget = { ...aliasBinding };
  Reflect.deleteProperty(missingCompatibilityTarget, "widgetId");
  expect(() => normalizeScreenFieldBindings([missingCompatibilityTarget])).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenFieldBindings([{ ...aliasBinding, widgetId: undefined }])).toThrow(
    "custom_screen_definition_invalid"
  );

  const compatibilityInvalidBindings = [
    { ...aliasBinding, widgetId: " legacy-binding-target " },
    { ...aliasBinding, propPath: " value " },
    { ...aliasBinding, field: "f".repeat(161) },
    { ...aliasBinding, id: " Non Canonical " },
    { ...aliasBinding, id: "x".repeat(121) },
    { ...aliasBinding, source: " entry " },
    { ...aliasBinding, source: null },
    { ...aliasBinding, mode: "invalid" },
    { ...aliasBinding, mode: null },
    { ...aliasBinding, mode: " read " },
  ];
  for (const binding of compatibilityInvalidBindings) {
    expect(() => normalizeScreenFieldBindings([binding])).toThrow(
      "custom_screen_definition_invalid"
    );
  }

  expect(
    normalizeScreenFieldBindings([{ ...aliasBinding, source: "entry", mode: "read" }])[0]
  ).toMatchObject({ blockId: target.id, source: "entry", mode: "read" });
});

test("TASK-540-01 binding IDs stay canonical and bounded across strict writes and stored reads", () => {
  const shortSeparatorTupleIds = [
    buildScreenFieldBindingId("a-b", "c"),
    buildScreenFieldBindingId("a", "b-c"),
  ];
  const shortCaseTupleIds = [
    buildScreenFieldBindingId("A", "value"),
    buildScreenFieldBindingId("a", "value"),
  ];
  for (const id of [...shortSeparatorTupleIds, ...shortCaseTupleIds]) {
    expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{13}$/);
    expect(id.length).toBeLessThanOrEqual(120);
  }
  expect(shortSeparatorTupleIds[0]).not.toBe(shortSeparatorTupleIds[1]);
  expect(shortCaseTupleIds[0]).not.toBe(shortCaseTupleIds[1]);
  expect(buildScreenFieldBindingId("a-b", "c")).toBe(shortSeparatorTupleIds[0]);
  expect(buildScreenFieldBindingId("___", "___")).toMatch(/^binding-[a-z0-9]{13}$/);

  const ambiguousBase = buildV4WithBlocks([
    { id: "a-b", type: "field", data: { label: "First" } },
    { id: "a", type: "field", data: { label: "Second" } },
  ]);
  const ambiguousDefinition = {
    ...ambiguousBase,
    editorView: {
      ...ambiguousBase.editorView,
      bindings: [
        {
          blockId: "a-b",
          propPath: "c",
          source: "entry",
          field: "firstField",
          mode: "read",
        },
        {
          blockId: "a",
          propPath: "b-c",
          source: "entry",
          field: "secondField",
          mode: "read",
        },
      ],
    },
  };
  expect(() => validate(customScreenDefinitionSchema, ambiguousDefinition)).not.toThrow();
  const normalizedAmbiguous = normalizeCustomScreenDefinitionForWrite({
    definition: ambiguousDefinition,
  });
  expect(normalizedAmbiguous.editorView.bindings.map(({ id }) => id)).toEqual(
    shortSeparatorTupleIds
  );
  expect(() => validate(customScreenDefinitionSchema, normalizedAmbiguous)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: normalizedAmbiguous })).toEqual(
    normalizedAmbiguous
  );

  const blockId = "b".repeat(160);
  const propPaths = [`${"p".repeat(159)}1`, `${"p".repeat(159)}2`];
  const base = buildV4WithBlocks([{ id: blockId, type: "field", data: { label: "Title" } }]);
  const definitionWithBindings = (bindings: Array<Record<string, unknown>>) => ({
    ...base,
    editorView: {
      ...base.editorView,
      bindings,
    },
  });
  const binding = (overrides: Record<string, unknown> = {}) => ({
    blockId,
    propPath: propPaths[0],
    source: "entry",
    field: "title",
    mode: "read",
    ...overrides,
  });

  for (const id of [" Non Canonical ", "x".repeat(121)]) {
    const invalidDefinition = definitionWithBindings([binding({ id })]);
    expect(() => validate(customScreenDefinitionSchema, invalidDefinition)).toThrow(
      "Invalid payload"
    );
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: invalidDefinition })
    ).toThrow("custom_screen_definition_invalid");
  }

  const generatedDefinition = definitionWithBindings([
    binding(),
    binding({ propPath: propPaths[1] }),
  ]);
  const generated = normalizeCustomScreenDefinitionForWrite({ definition: generatedDefinition });
  expect(generated.editorView.bindings).toHaveLength(2);
  expect(new Set(generated.editorView.bindings.map(({ id }) => id)).size).toBe(2);
  for (const { id } of generated.editorView.bindings) {
    expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(id.length).toBeLessThanOrEqual(120);
  }
  expect(() => validate(customScreenDefinitionSchema, generated)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: generated })).toEqual(generated);

  const stored = definitionWithBindings([binding({ id: ` Legacy ${"I".repeat(121)} ` })]);
  const repaired = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(repaired.editorView.bindings[0]?.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(repaired.editorView.bindings[0]?.id.length).toBeLessThanOrEqual(120);
  expect(normalizeCustomScreenDefinitionForRead({ definition: repaired })).toEqual(repaired);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repaired })).toEqual(repaired);

  const tuplePrefix = "a".repeat(140);
  const separatorTupleIds = [
    buildScreenFieldBindingId(`${tuplePrefix}-b`, "c"),
    buildScreenFieldBindingId(tuplePrefix, "b-c"),
  ];
  expect(separatorTupleIds[0]).not.toBe(separatorTupleIds[1]);
  expect(separatorTupleIds.every((id) => id.length <= 120)).toBe(true);

  const caseTupleIds = [
    buildScreenFieldBindingId("A".repeat(140), "value"),
    buildScreenFieldBindingId("a".repeat(140), "value"),
  ];
  expect(caseTupleIds[0]).not.toBe(caseTupleIds[1]);
  expect(buildScreenFieldBindingId(blockId, propPaths[0])).toBe(
    buildScreenFieldBindingId(blockId, propPaths[0])
  );

  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: definitionWithBindings([binding(), binding()]),
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("TASK-540-01 stored-read canonicalizes overlong IDs and paths without losing binding identity", () => {
  const longSectionId = `section-${"s".repeat(170)}`;
  const longBlockPrefix = `block-${"b".repeat(170)}`;
  const longBlockIds = [`${longBlockPrefix}-first`, `${longBlockPrefix}-second`];
  const longPropPaths = [`value.${"p".repeat(170)}.first`, `value.${"p".repeat(170)}.second`];
  const longFields = [`field.${"f".repeat(170)}.first`, `field.${"f".repeat(170)}.second`];
  const blocks = longBlockIds.map((id, index) => ({
    id,
    type: "field",
    data: { label: `Field ${index + 1}` },
  }));
  const bindings = longBlockIds.map((blockId, index) => ({
    id: `long-binding-${index + 1}`,
    blockId,
    propPath: longPropPaths[index],
    source: "entry",
    field: longFields[index],
    mode: "read",
  }));
  const document = {
    schemaVersion: 1,
    sections: [{ id: longSectionId, type: "section", data: {}, blocks }],
  };
  const base = buildV4WithBlocks([]);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: { document, bindings },
    },
    editorView: {
      ...base.editorView,
      document,
      bindings,
    },
  };
  const before = JSON.stringify(stored);

  expect(() => validate(customScreenDefinitionSchema, stored)).toThrow("Invalid payload");
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: stored })).toThrow(
    "custom_screen_definition_invalid"
  );

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(JSON.stringify(stored)).toBe(before);
  const scopes = [
    {
      document: read.editorView.document,
      bindings: read.editorView.bindings,
    },
    {
      document: read.listView.rowTemplate!.document,
      bindings: read.listView.rowTemplate!.bindings,
    },
  ];
  for (const scope of scopes) {
    const section = scope.document.sections[0]!;
    expect(section.id).toMatch(/^[a-zA-Z0-9_.-]+$/);
    expect(section.id.length).toBeLessThanOrEqual(160);
    expect(section.blocks).toHaveLength(2);
    expect(section.blocks[0]?.id).not.toBe(section.blocks[1]?.id);
    for (const [index, block] of section.blocks.entries()) {
      expect(block.id).toMatch(/^[a-zA-Z0-9_.-]+$/);
      expect(block.id.length).toBeLessThanOrEqual(160);
      expect(scope.bindings[index]?.blockId).toBe(block.id);
      expect(scope.bindings[index]?.propPath.length).toBeLessThanOrEqual(160);
      expect(scope.bindings[index]?.field.length).toBeLessThanOrEqual(160);
    }
  }
  expect(scopes[0]?.document).toEqual(scopes[1]?.document);
  expect(scopes[0]?.bindings).toEqual(scopes[1]?.bindings);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);

  const fixedDataRead = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([
      { id: "fixed-data-path", type: "heading", data: { field: "f".repeat(161) } },
    ]),
  });
  expect(fixedDataRead.editorView.document.sections[0]?.blocks[0]?.data).not.toHaveProperty(
    "field"
  );
});

test("TASK-540-01 legacy unsupported Buttons are independently disabled in editor and row documents", () => {
  const unsupportedBlock = (type: "button" | "actions") => ({
    id: "same-legacy-id",
    type,
    data: {
      label: "Legacy",
      action: type === "actions" ? "publish" : "custom",
      href: "/must-not-survive",
      ...(type === "actions" ? { legacyOnly: true } : {}),
    },
  });
  const bindings = [
    {
      id: "legacy-href",
      blockId: "same-legacy-id",
      propPath: "href",
      source: "entry",
      field: "targetUrl",
      mode: "read",
    },
    {
      id: "legacy-label",
      blockId: "same-legacy-id",
      propPath: "label",
      source: "entry",
      field: "title",
      mode: "read",
    },
  ] satisfies ScreenFieldBinding[];
  const base = buildV4WithBlocks([unsupportedBlock("actions")]);
  const rowTemplate = {
    document: {
      schemaVersion: 1,
      sections: [{ id: "row", type: "section", data: {}, blocks: [unsupportedBlock("button")] }],
    },
    bindings,
  } satisfies CustomScreenListRowTemplate;
  const stored = {
    ...base,
    listView: { ...base.listView, rowTemplate },
    editorView: { ...base.editorView, bindings },
  };
  const before = JSON.stringify(stored);
  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(JSON.stringify(stored)).toBe(before);

  const editorButton = read.editorView.document.sections[0]?.blocks[0];
  const rowButton = read.listView.rowTemplate?.document.sections[0]?.blocks[0];
  for (const button of [editorButton, rowButton]) {
    expect(button?.type).toBe("button");
    expect(button?.data).toMatchObject({ action: "link", label: "Legacy" });
    expect(button?.data.href).toBeUndefined();
    expect(button?.data.disabled).toBeUndefined();
  }
  expect(read.editorView.bindings.map((binding) => binding.propPath)).toEqual(["label"]);
  expect(read.listView.rowTemplate?.bindings.map((binding) => binding.propPath)).toEqual(["label"]);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 every present non-link Button action prunes href bindings on stored read", () => {
  const unsupportedButtons = (scope: "editor" | "row") => [
    {
      id: `${scope}-unknown-action`,
      type: "button",
      data: {
        label: "Unknown action",
        action: "unexpected-action",
        href: "/must-not-survive",
      },
    },
    {
      id: `${scope}-non-string-action`,
      type: "button",
      data: {
        label: "Non-string action",
        action: { legacy: true },
        href: "/must-not-survive-either",
      },
    },
  ];
  const bindingsFor = (scope: "editor" | "row") =>
    unsupportedButtons(scope).flatMap((block, index) => [
      {
        id: `${scope}-href-${index}`,
        blockId: block.id,
        propPath: "href",
        source: "entry" as const,
        field: "targetUrl",
        mode: "read" as const,
      },
      {
        id: `${scope}-label-${index}`,
        blockId: block.id,
        propPath: "label",
        source: "entry" as const,
        field: "title",
        mode: "read" as const,
      },
    ]);
  const base = buildV4WithBlocks(unsupportedButtons("editor"));
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row",
              type: "section",
              data: {},
              blocks: unsupportedButtons("row"),
            },
          ],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const editorButtons = read.editorView.document.sections[0]?.blocks ?? [];
  const rowButtons = read.listView.rowTemplate?.document.sections[0]?.blocks ?? [];
  for (const button of [...editorButtons, ...rowButtons]) {
    expect(button.data).toMatchObject({ action: "link" });
    expect(button.data.href).toBeUndefined();
  }
  expect(read.editorView.bindings.map((binding) => binding.propPath)).toEqual(["label", "label"]);
  expect(read.listView.rowTemplate?.bindings.map((binding) => binding.propPath)).toEqual([
    "label",
    "label",
  ]);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
});

test("TASK-540-01 generated stored-read Button IDs cannot retain unsupported href bindings", () => {
  const unsupportedButtons = [
    {
      type: "actions",
      data: { label: "Missing ID", action: "publish", href: "/must-not-survive" },
    },
    {
      id: null,
      type: "button",
      data: { label: "Null ID", action: { legacy: true }, href: "/must-not-survive-either" },
    },
    {
      id: "safe-button",
      type: "button",
      data: { label: "Safe", action: "link" },
    },
  ];
  const bindings = (scope: "editor" | "row") => [
    ...["block-1", "block-2"].map((blockId, index) => ({
      id: `${scope}-unsafe-${index}`,
      blockId,
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    })),
    {
      id: `${scope}-safe`,
      blockId: "safe-button",
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
  ];
  const base = buildV4WithBlocks(unsupportedButtons);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row",
              type: "section",
              data: {},
              blocks: unsupportedButtons,
            },
          ],
        },
        bindings: bindings("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindings("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const editorButtons = read.editorView.document.sections[0]?.blocks ?? [];
  const rowButtons = read.listView.rowTemplate?.document.sections[0]?.blocks ?? [];
  for (const button of [...editorButtons, ...rowButtons].slice(0, 2)) {
    expect(button.data).toMatchObject({ action: "link" });
    expect(button.data.href).toBeUndefined();
  }
  expect(read.editorView.bindings).toEqual([expect.objectContaining({ blockId: "safe-button" })]);
  expect(read.listView.rowTemplate?.bindings).toEqual([
    expect.objectContaining({ blockId: "safe-button" }),
  ]);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 removed orphan Tabs slots preserve both stored-read documents", () => {
  const tabsWithOrphanSlot = (scope: "editor" | "row", nullId: boolean) => ({
    id: `${scope}-tabs`,
    type: "tabs",
    data: {
      tabs: [
        { id: "kept", label: "Kept" },
        { id: "kept", label: "Duplicate" },
      ],
    },
    slots: {
      kept: [
        {
          id: `${scope}-survivor`,
          type: "button",
          data: { label: "Survivor", action: "link", href: "/safe" },
        },
      ],
      orphan: [
        {
          ...(nullId ? { id: null } : {}),
          type: "button",
          data: { label: "Removed", action: "unsupported", href: "/must-not-survive" },
        },
      ],
    },
  });
  const bindingsFor = (scope: "editor" | "row") => [
    {
      id: `${scope}-removed-href`,
      blockId: "block-1",
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
    {
      id: `${scope}-survivor-href`,
      blockId: `${scope}-survivor`,
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
  ];
  const editorTabs = tabsWithOrphanSlot("editor", false);
  const rowTabs = tabsWithOrphanSlot("row", true);
  const base = buildV4WithBlocks([editorTabs]);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "row", type: "section", data: {}, blocks: [rowTabs] }],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const repairedViews = [
    {
      scope: "editor",
      tabs: read.editorView.document.sections[0]?.blocks[0],
      bindings: read.editorView.bindings,
    },
    {
      scope: "row",
      tabs: read.listView.rowTemplate?.document.sections[0]?.blocks[0],
      bindings: read.listView.rowTemplate?.bindings ?? [],
    },
  ] as const;
  for (const { scope, tabs, bindings } of repairedViews) {
    expect(tabs?.type).toBe("tabs");
    expect(Object.keys(tabs?.slots ?? {})).toEqual(["kept", "tab-2"]);
    expect(tabs?.slots?.kept?.map((block) => block.id)).toEqual([`${scope}-survivor`]);
    expect(tabs?.slots?.["tab-2"]).toEqual([]);
    expect(bindings.map((binding) => binding.id)).toEqual([`${scope}-survivor-href`]);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 reordered Tabs slots keep Button action provenance structural", () => {
  const tabsWithReorderedSlots = (scope: "editor" | "row", nullId: boolean) => ({
    id: `${scope}-tabs`,
    type: "tabs",
    data: {
      tabs: [
        { id: "first", label: " First " },
        { id: "second", label: "Second" },
      ],
    },
    slots: {
      second: [
        {
          id: `${scope}-safe`,
          type: "button",
          data: { label: "Safe", action: "link", href: "/safe" },
        },
      ],
      first: [
        {
          ...(nullId ? { id: null } : {}),
          type: "button",
          data: {
            label: "Unsupported",
            action: nullId ? { legacy: true } : "unexpected-action",
            href: "/must-not-survive",
          },
        },
      ],
    },
  });
  const bindingsFor = (scope: "editor" | "row") => [
    {
      id: `${scope}-unsupported-href`,
      blockId: "block-1",
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
    {
      id: `${scope}-unsupported-label`,
      blockId: "block-1",
      propPath: "label",
      source: "entry" as const,
      field: "title",
      mode: "read" as const,
    },
    {
      id: `${scope}-safe-href`,
      blockId: `${scope}-safe`,
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
  ];
  const editorTabs = tabsWithReorderedSlots("editor", false);
  const rowTabs = tabsWithReorderedSlots("row", true);
  const base = buildV4WithBlocks([editorTabs]);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "row", type: "section", data: {}, blocks: [rowTabs] }],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const repairedViews = [
    {
      scope: "editor",
      tabs: read.editorView.document.sections[0]?.blocks[0],
      bindings: read.editorView.bindings,
    },
    {
      scope: "row",
      tabs: read.listView.rowTemplate?.document.sections[0]?.blocks[0],
      bindings: read.listView.rowTemplate?.bindings ?? [],
    },
  ] as const;
  for (const { scope, tabs, bindings } of repairedViews) {
    expect(Object.keys(tabs?.slots ?? {})).toEqual(["first", "second"]);
    const unsupported = tabs?.slots?.first?.[0];
    const safe = tabs?.slots?.second?.[0];
    expect(unsupported).toMatchObject({ id: "block-1", data: { action: "link" } });
    expect(unsupported?.data.href).toBeUndefined();
    expect(safe).toMatchObject({
      id: `${scope}-safe`,
      data: { action: "link", href: "/safe" },
    });
    expect(bindings.map((binding) => binding.id)).toEqual([
      `${scope}-unsupported-label`,
      `${scope}-safe-href`,
    ]);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 empty editor and row documents prune every block ghost into one sink", () => {
  const ghostBinding = (id: string, field: string): ScreenFieldBinding => ({
    id,
    blockId: "missing-block",
    propPath: "value",
    source: "entry",
    field,
    mode: "read",
  });
  const base = buildV4WithBlocks([]);
  const editorBindings = [ghostBinding("editor-a", "title"), ghostBinding("editor-b", "title")];
  const rowTemplate = {
    document: { schemaVersion: 1, sections: [] },
    bindings: [ghostBinding("row-a", "slug")],
  } satisfies CustomScreenListRowTemplate;
  const definition = {
    ...base,
    listView: { ...base.listView, rowTemplate },
    editorView: { ...base.editorView, bindings: editorBindings },
  };
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const normalized = normalizeCustomScreenDefinitionForWrite({ definition }, undefined, sink);
  expect(normalized.editorView.bindings).toEqual([]);
  expect(normalized.listView.rowTemplate?.bindings).toEqual([]);
  expect(sink.removedBlockOrphans).toEqual(["slug", "title", "title"]);

  const storedRead = normalizeCustomScreenDefinitionForRead({ definition });
  expect(storedRead.editorView.bindings).toEqual([]);
  expect(storedRead.listView.rowTemplate?.bindings).toEqual([]);
});

test("TASK-540-01 valid V4 input is byte-stable through write and stored-read", () => {
  const definition = buildV4WithBlocks(
    Object.keys(fixedKindDataCases).map((type) =>
      fixedKindBlock(type as keyof typeof fixedKindDataCases, {
        ...fixedKindDataCases[type as keyof typeof fixedKindDataCases],
      })
    )
  );
  expect(normalizeCustomScreenDefinitionForWrite({ definition })).toEqual(definition);
  expect(normalizeCustomScreenDefinitionForRead({ definition })).toEqual(definition);
  expect(JSON.stringify(normalizeCustomScreenDefinitionForWrite({ definition }))).toBe(
    JSON.stringify(definition)
  );
});

test("TASK-540-01 shared Ajv compiles create/update in both orders without schema-ID collisions", async () => {
  const definition = buildV4WithBlocks([fixedKindBlock("tabs")]);
  const createPayload = { name: "Catalog", contentTypeId: "type-1", definition };
  const updatePayload = { definition };

  vi.resetModules();
  const createFirst = await import("../../../core/server/validation/schemaValidator");
  expect(() => createFirst.validate(customScreenCreateSchema, createPayload)).not.toThrow();
  expect(() => createFirst.validate(customScreenUpdateSchema, updatePayload)).not.toThrow();

  vi.resetModules();
  const updateFirst = await import("../../../core/server/validation/schemaValidator");
  expect(() => updateFirst.validate(customScreenUpdateSchema, updatePayload)).not.toThrow();
  expect(() => updateFirst.validate(customScreenCreateSchema, createPayload)).not.toThrow();
});

test("TASK-540-01 fresh PATCH schema validation and direct writes reject every unsupported Button action", async () => {
  for (const action of ["publish", "custom"] as const) {
    const definition = buildV4WithBlocks([
      {
        id: `unsupported-${action}`,
        type: "button",
        data: { label: "Unsupported", action, href: "/must-not-persist" },
      },
    ]);

    vi.resetModules();
    const freshValidator = await import("../../../core/server/validation/schemaValidator");
    expect(() => freshValidator.validate(customScreenUpdateSchema, { definition })).toThrow(
      "Invalid payload"
    );
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      "custom_screen_definition_invalid"
    );
  }
});

test("TASK-540-01 media identity predicate has one exact UUID contract", () => {
  for (const value of [
    "123e4567-e89b-12d3-a456-426614174000",
    "123E4567-E89B-12D3-A456-426614174ABC",
  ]) {
    expect(isScreenMediaAssetUuid(value)).toBe(true);
  }
  for (const value of [
    "",
    "123e4567-e89b-12d3-a456-42661417400",
    "/media/123e4567-e89b-12d3-a456-426614174000",
    "https://example.com/123e4567-e89b-12d3-a456-426614174000",
    42,
    null,
  ]) {
    expect(isScreenMediaAssetUuid(value)).toBe(false);
  }
});
