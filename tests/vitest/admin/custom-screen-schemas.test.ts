import { expect, test } from "vitest";

import {
  buildDefaultListViewDefinition,
  customScreenCreateSchema,
  customScreenDefinitionSchema,
  customScreenUpdateSchema,
  getCustomScreenEditorViewCompat,
  normalizeCustomScreenCollectionLink,
  normalizeCustomScreenBindings,
  normalizeCustomScreenDefinition,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  normalizeCustomScreenSidebarConfig,
  normalizeScreenDocumentV1,
  normalizeScreenDocumentV1ForRead,
  screenBlockAligns,
  screenBlockBoxSides,
  screenBlockWidths,
  screenImageRatios,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  screenSectionColumnPresets,
  screenSectionColumnTemplate,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  type ScreenBindingWarningSink,
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
