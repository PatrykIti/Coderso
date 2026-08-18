import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSourceFile,
  isExportDeclaration,
  isNamedExports,
  isStringLiteral,
  ScriptKind,
  ScriptTarget,
} from "typescript";
import { expect, test } from "vitest";

import * as facade from "../../../core/services/customScreens/customScreenSchemas";
import {
  buildScreenFieldBindingId,
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
} from "../../../core/services/customScreens/customScreenSchemas";
import * as bindingNormalizer from "../../../core/services/customScreens/customScreenBindingNormalizer";
import * as contracts from "../../../core/services/customScreens/customScreenContracts";
import * as definitionNormalizer from "../../../core/services/customScreens/customScreenDefinitionNormalizer";
import * as editorViewNormalizer from "../../../core/services/customScreens/customScreenEditorViewNormalizer";
import * as jsonSchemas from "../../../core/services/customScreens/customScreenJsonSchemas";
import * as legacyAdapters from "../../../core/services/customScreens/customScreenLegacyAdapters";
import * as listViewNormalizer from "../../../core/services/customScreens/customScreenListViewNormalizer";
import * as normalizationPrimitives from "../../../core/services/customScreens/customScreenNormalizationPrimitives";
import * as documentDataNormalizer from "../../../core/services/customScreens/screenDocumentDataNormalizer";
import * as documentNormalizer from "../../../core/services/customScreens/screenDocumentNormalizer";
import * as documentReadNormalizer from "../../../core/services/customScreens/screenDocumentReadNormalizer";
import * as mediaIdentity from "../../../core/services/customScreens/screenMediaIdentity";
import { validate } from "../../../core/server/validation/schemaValidator";

const expectedRuntimeExports = `
CUSTOM_SCREEN_ERROR_FIELDS_MAX,CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX,CustomScreenDefinitionError,SCREEN_BLOCK_COLLECTION_MAX,SCREEN_BLOCK_MIN_HEIGHT_CLAMP,SCREEN_DOCUMENT_SECTIONS_MAX,SCREEN_SECTION_COLUMN_GAP_CLAMP,SCREEN_TABS_MAX,SCREEN_TABS_MIN,SCREEN_TAB_ID,SCREEN_TAB_LABEL_MAX,
buildDefaultListRowTemplate,buildDefaultListViewDefinition,buildScreenFieldBindingId,customScreenBindingModes,customScreenBindingSchema,customScreenCollectionRoleValues,customScreenCreateModes,customScreenCreateSchema,customScreenDefinitionSchema,customScreenListColumnSources,customScreenListFilterOperators,customScreenListFormatters,customScreenRowClickModes,customScreenSortDirections,customScreenStatusValues,customScreenUpdateSchema,defaultScreenSectionId,
getCustomScreenEditorViewBindings,getCustomScreenEditorViewBlocks,getCustomScreenEditorViewCompat,isScreenMediaAssetUuid,migrateV1DefinitionToV3,migrateV1DefinitionToV4,migrateV2DefinitionToV3,migrateV2DefinitionToV4,migrateV3DefinitionToV4,normalizeCustomScreenBindings,normalizeCustomScreenBlocks,normalizeCustomScreenCollectionLink,normalizeCustomScreenDefinition,normalizeCustomScreenDefinitionForRead,normalizeCustomScreenDefinitionForWrite,normalizeCustomScreenEditorViewDefinition,normalizeCustomScreenEditorViewDefinitionV4,normalizeCustomScreenEditorViewDefinitionV4ForRead,normalizeCustomScreenListViewDefinition,normalizeCustomScreenSchemaVersion,normalizeCustomScreenSidebarConfig,normalizeCustomScreenV1Definition,
normalizeScreenDocumentV1,normalizeScreenDocumentV1ForRead,normalizeScreenFieldBindings,normalizeScreenImageSrc,sanitizeScreenAuthoringUrl,screenBlockAligns,screenBlockBoxSides,screenBlockWidths,screenImageRatios,screenSectionColumnPresets,screenSectionColumnTemplate,withCustomScreenEditorViewCompat
`
  .trim()
  .split(/\s*,\s*/)
  .sort();

const expectedTypeExports = `
CustomScreenBinding,CustomScreenBindingMode,CustomScreenBindingWarning,CustomScreenCollectionLink,CustomScreenCollectionRole,CustomScreenDefinition,CustomScreenDefinitionContext,CustomScreenDefinitionV1,CustomScreenDefinitionV2,CustomScreenDefinitionV3,CustomScreenDefinitionV4,CustomScreenDefinitionVersion,CustomScreenEditorViewDefinition,CustomScreenEditorViewDefinitionV4,CustomScreenLegacyDefinition,CustomScreenListColumn,CustomScreenListColumnSource,CustomScreenListFilter,CustomScreenListFilterOperator,CustomScreenListFormatter,
CustomScreenListRowTemplate,CustomScreenListViewDefinition,CustomScreenListViewDefinitionV2,CustomScreenSidebarConfig,CustomScreenSortDirection,CustomScreenStatus,ScreenBindingWarningSink,ScreenBlockAlign,ScreenBlockBoxSpacingV1,ScreenBlockStyleV1,ScreenBlockV1,ScreenBlockWidth,ScreenDocumentV1,ScreenFieldBinding,ScreenImageRatio,ScreenSectionColumnPreset,ScreenSectionStyleV1,ScreenSectionV1,ScreenTabItem
`
  .trim()
  .split(/\s*,\s*/)
  .sort();

test("customScreenSchemas facade pins its exact public export and owner identity contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "core/services/customScreens/customScreenSchemas.ts"),
    "utf8"
  );
  const sourceFile = createSourceFile(
    "customScreenSchemas.ts",
    source,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS
  );
  const declarations = sourceFile.statements.filter(isExportDeclaration);
  const runtimeNames: string[] = [];
  const typeNames: string[] = [];
  const moduleOwners: Record<string, Record<string, unknown>> = {
    "./customScreenBindingNormalizer": bindingNormalizer,
    "./customScreenContracts": contracts,
    "./customScreenDefinitionNormalizer": definitionNormalizer,
    "./customScreenEditorViewNormalizer": editorViewNormalizer,
    "./customScreenJsonSchemas": jsonSchemas,
    "./customScreenLegacyAdapters": legacyAdapters,
    "./customScreenListViewNormalizer": listViewNormalizer,
    "./customScreenNormalizationPrimitives": normalizationPrimitives,
    "./screenDocumentDataNormalizer": documentDataNormalizer,
    "./screenDocumentNormalizer": documentNormalizer,
    "./screenDocumentReadNormalizer": documentReadNormalizer,
    "./screenMediaIdentity": mediaIdentity,
  };
  const facadeValues = facade as Record<string, unknown>;

  for (const declaration of declarations) {
    if (!declaration.exportClause || !isNamedExports(declaration.exportClause)) {
      throw new Error("customScreenSchemas must use explicit named exports");
    }
    if (!declaration.moduleSpecifier || !isStringLiteral(declaration.moduleSpecifier)) {
      throw new Error("customScreenSchemas exports must reference one explicit owner");
    }

    const owner = moduleOwners[declaration.moduleSpecifier.text];
    expect(owner, declaration.moduleSpecifier.text).toBeDefined();

    for (const element of declaration.exportClause.elements) {
      const exportedName = element.name.text;
      if (declaration.isTypeOnly || element.isTypeOnly) {
        typeNames.push(exportedName);
        continue;
      }

      const ownerName = element.propertyName?.text ?? exportedName;
      runtimeNames.push(exportedName);
      expect(facadeValues[exportedName], exportedName).toBe(owner?.[ownerName]);
    }
  }

  expect(runtimeNames.sort()).toEqual(expectedRuntimeExports);
  expect(typeNames.sort()).toEqual(expectedTypeExports);
  expect(Object.keys(facade).sort()).toEqual(expectedRuntimeExports);
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

test("customScreenUpdateSchema accepts expectedRevision on the reject-unknown allowlist (TASK-569)", () => {
  expect(() =>
    validate(customScreenUpdateSchema, { status: "active", expectedRevision: 1 })
  ).not.toThrow();
  expect(() =>
    validate(customScreenUpdateSchema, { name: "Catalog", expectedRevision: 42 })
  ).not.toThrow();
  // The allowlist stays strict: non-integer, zero, and unknown keys still reject.
  expect(() => validate(customScreenUpdateSchema, { expectedRevision: 0 })).toThrow(
    "Invalid payload"
  );
  expect(() => validate(customScreenUpdateSchema, { expectedRevision: 1.5 })).toThrow(
    "Invalid payload"
  );
  expect(() => validate(customScreenUpdateSchema, { expectedRevision: "1" })).toThrow(
    "Invalid payload"
  );
  expect(() => validate(customScreenUpdateSchema, { expectedUpdatedAt: 1 })).toThrow(
    "Invalid payload"
  );
  // The create schema never exposes the precondition key.
  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      expectedRevision: 1,
    })
  ).toThrow("Invalid payload");
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
      const orphanBinding = {
        id: `orphan-binding-${version}-${variant}`,
        widgetId: `missing-block-${version}-${variant}`,
        propPath: "title",
        field: "orphanTitle",
        mode: "read",
      };
      const editorBindings = [primaryBinding, siblingBinding, orphanBinding];
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
      expect(migrated.editorView.bindings, `${label}:block-orphan-prune`).toHaveLength(2);
      expect(
        migrated.editorView.bindings.some(({ id }) => id === orphanBinding.id),
        `${label}:block-orphan-id`
      ).toBe(false);
      expect(() => validate(customScreenDefinitionSchema, migrated), label).not.toThrow();
      expect(normalizeCustomScreenDefinitionForWrite({ definition: migrated }), label).toEqual(
        migrated
      );
      expect(normalizeCustomScreenDefinitionForRead({ definition: migrated }), label).toEqual(
        migrated
      );
    }
  }

  const longLegacyBlockId = `legacy-${"l".repeat(153)}`;
  const longLegacyPropPath = `value.${"p".repeat(154)}`;
  const ambiguousLegacyBlocks = [
    { id: "a-b", type: "screen-record-header", data: { marker: "separator-left" } },
    { id: "a", type: "screen-record-header", data: { marker: "separator-right" } },
    { id: "A", type: "screen-record-header", data: { marker: "case-upper" } },
    {
      id: longLegacyBlockId,
      type: "screen-record-header",
      data: { marker: "bounded-id" },
    },
  ];
  const ambiguousLegacyBindings = [
    { widgetId: "a-b", propPath: "c", field: "firstField", mode: "read" },
    { widgetId: "a", propPath: "b-c", field: "secondField", mode: "read" },
    { widgetId: "A", propPath: "value", field: "upperCaseField", mode: "read" },
    { widgetId: "a", propPath: "value", field: "lowerCaseField", mode: "read" },
    {
      widgetId: longLegacyBlockId,
      propPath: longLegacyPropPath,
      field: "longField",
      mode: "read",
    },
  ];
  const expectedLegacyBindingIds = ambiguousLegacyBindings.map(({ widgetId, propPath }) =>
    buildScreenFieldBindingId(widgetId, propPath)
  );

  for (const version of versions) {
    const definition =
      version === 1
        ? {
            schemaVersion: 1,
            blocks: ambiguousLegacyBlocks,
            bindings: ambiguousLegacyBindings,
          }
        : version === 2
          ? {
              schemaVersion: 2,
              listView: {
                ...legacyListView,
                rowClick: "editor-view",
                createMode: "editor-view",
              },
              editorView: {
                blocks: ambiguousLegacyBlocks,
                bindings: ambiguousLegacyBindings,
                saveMode: "entry",
              },
            }
          : {
              schemaVersion: 3,
              listView: legacyListView,
              editorView: {
                blocks: ambiguousLegacyBlocks,
                bindings: ambiguousLegacyBindings,
                saveMode: "entry",
                interactionMode: "inline",
              },
            };
    const label = `V${version}:generated-binding-ids`;
    const migrated = normalizeCustomScreenDefinitionForRead({ definition });
    const generatedIds = migrated.editorView.bindings.map(({ id }) => id);

    expect(generatedIds, label).toEqual(expectedLegacyBindingIds);
    expect(new Set(generatedIds).size, `${label}:distinct`).toBe(generatedIds.length);
    for (const id of generatedIds) {
      expect(id, `${label}:non-empty`).not.toBe("");
      expect(id, `${label}:canonical`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(id.length, `${label}:bounded`).toBeLessThanOrEqual(120);
    }
    expect(() => validate(customScreenDefinitionSchema, migrated), label).not.toThrow();
    expect(normalizeCustomScreenDefinitionForWrite({ definition: migrated }), label).toEqual(
      migrated
    );
    expect(normalizeCustomScreenDefinitionForRead({ definition: migrated }), label).toEqual(
      migrated
    );
  }
});

test("normalizeCustomScreenDefinitionForRead drops one malformed legacy binding without losing siblings", () => {
  const defaults = buildDefaultListViewDefinition();
  const listView = {
    ...defaults,
    bulkActions: { ...defaults.bulkActions, delete: false },
  };
  const blocks = [
    {
      id: "legacy-primary",
      type: "screen-record-header",
      data: { marker: "keep-primary" },
    },
    {
      id: "legacy-sibling",
      type: "screen-record-header",
      data: { marker: "keep-sibling" },
    },
  ];
  const malformedBinding = {
    id: "legacy-malformed-binding",
    widgetId: "legacy-primary",
    propPath: "title",
    field: "title",
    mode: "invalid",
  };
  const siblingBinding = {
    id: "legacy-sibling-binding",
    widgetId: "legacy-sibling",
    propPath: "title",
    field: "summary",
    mode: "read",
  };

  for (const version of [1, 2, 3] as const) {
    const definition =
      version === 1
        ? {
            schemaVersion: 1,
            blocks,
            bindings: [malformedBinding, siblingBinding],
          }
        : version === 2
          ? {
              schemaVersion: 2,
              listView: {
                ...listView,
                rowClick: "editor-view",
                createMode: "editor-view",
              },
              editorView: {
                blocks,
                bindings: [malformedBinding, siblingBinding],
                saveMode: "entry",
              },
            }
          : {
              schemaVersion: 3,
              listView,
              editorView: {
                blocks,
                bindings: [malformedBinding, siblingBinding],
                saveMode: "entry",
                interactionMode: "inline",
              },
            };
    const before = JSON.stringify(definition);

    const read = normalizeCustomScreenDefinitionForRead({ definition });

    expect(JSON.stringify(definition), `V${version}:immutable`).toBe(before);
    expect(
      read.editorView.document.sections[0]?.blocks.map(({ id }) => id),
      `V${version}:blocks`
    ).toEqual(["legacy-primary", "legacy-sibling"]);
    expect(read.editorView.document.sections[0]?.blocks[0]?.data, `V${version}:primary`).toEqual({
      marker: "keep-primary",
    });
    expect(read.editorView.document.sections[0]?.blocks[1]?.data, `V${version}:sibling`).toEqual({
      marker: "keep-sibling",
    });
    expect(read.editorView.bindings, `V${version}:bindings`).toEqual([
      {
        id: "legacy-sibling-binding",
        blockId: "legacy-sibling",
        propPath: "title",
        source: "entry",
        field: "summary",
        mode: "read",
      },
    ]);
    expect(read.listView.bulkActions.delete, `V${version}:list`).toBe(version === 1);
    expect(() => validate(customScreenDefinitionSchema, read), `V${version}:schema`).not.toThrow();
    expect(
      normalizeCustomScreenDefinitionForRead({ definition: read }),
      `V${version}:reread`
    ).toEqual(read);
    expect(
      normalizeCustomScreenDefinitionForWrite({ definition: read }),
      `V${version}:write`
    ).toEqual(read);
  }
});

test("normalizeCustomScreenDefinitionForRead falls back safely and prunes impossible block bindings", () => {
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
  expect(editorView.bindings).toEqual([]);
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
