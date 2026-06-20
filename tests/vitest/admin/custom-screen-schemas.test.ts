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
  normalizeCustomScreenSidebarConfig,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

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
  expect(definition.editorView.document.sections[0]?.type).toBe("legacy-widget");
  expect(editorView.blocks[0]?.type).toBe("section");
  expect(definition.editorView.interactionMode).toBe("inline");
});

test("normalizeCustomScreenDefinition accepts writable header bindings", () => {
  expect(() =>
    normalizeCustomScreenDefinition(
      {
        definition: {
          schemaVersion: 3,
          listView: {
            columns: [],
            filters: [],
            defaultSort: { field: "updatedAt", direction: "desc" },
            bulkActions: { delete: true, publish: true, unpublish: true },
          },
          editorView: {
            blocks: [{ id: "header-1", type: "screen-record-header", data: {} }],
            bindings: [
              {
                id: "binding-1",
                widgetId: "header-1",
                propPath: "title",
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
            id: "field-title",
            type: "field",
            data: { label: "Title" },
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
        sections: [{ id: "field-title", type: "field" }],
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
