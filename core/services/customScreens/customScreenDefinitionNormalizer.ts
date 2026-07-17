import {
  isCustomScreenDefinitionInvalidError,
  normalizeCustomScreenBindings,
  normalizeCustomScreenBindingsForRead,
} from "./customScreenBindingNormalizer";
import type {
  CustomScreenCollectionLink,
  CustomScreenCollectionRole,
  CustomScreenDefinition,
  CustomScreenDefinitionContext,
  CustomScreenDefinitionV1,
  CustomScreenDefinitionV2,
  CustomScreenDefinitionV3,
  CustomScreenDefinitionV4,
  CustomScreenEditorViewDefinitionV4,
  CustomScreenSidebarConfig,
  ScreenBindingWarningSink,
} from "./customScreenContracts";
import {
  createEmptyCustomScreenEditorViewV4,
  normalizeCustomScreenEditorViewDefinition,
  normalizeCustomScreenEditorViewDefinitionV4,
  normalizeCustomScreenEditorViewDefinitionV4ForRead,
  normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty,
} from "./customScreenEditorViewNormalizer";
import { normalizeCustomScreenBlocks } from "./customScreenLegacyAdapters";
import {
  buildDefaultListViewDefinition,
  normalizeCustomScreenListViewDefinition,
  normalizeCustomScreenListViewDefinitionForRead,
} from "./customScreenListViewNormalizer";
import {
  collectionRoles,
  isRecord,
  normalizeCustomScreenSchemaVersion,
  normalizePath,
  normalizeText,
  rejectUnknownKeys,
} from "./customScreenNormalizationPrimitives";

export function normalizeCustomScreenV1Definition(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV1 {
  const version = normalizeCustomScreenSchemaVersion(input.schemaVersion);
  if (version !== 1) throw new Error("custom_screen_definition_invalid");
  return {
    schemaVersion: 1,
    blocks: normalizeCustomScreenBlocks(input.blocks),
    bindings: normalizeCustomScreenBindings(input.bindings, context),
  };
}

export function migrateV1DefinitionToV3(
  definition: CustomScreenDefinitionV1,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV3 {
  return {
    schemaVersion: 3,
    listView: buildDefaultListViewDefinition(context?.contentType),
    editorView: {
      blocks: definition.blocks,
      bindings: definition.bindings,
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}

export function migrateV3DefinitionToV4(
  definition: CustomScreenDefinitionV3,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinitionForRead(definition.listView, context),
    editorView: normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty(
      definition.editorView.blocks,
      definition.editorView.bindings,
      context
    ),
  };
}

export function migrateV1DefinitionToV4(
  definition: CustomScreenDefinitionV1,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  return migrateV3DefinitionToV4(migrateV1DefinitionToV3(definition, context), context);
}

export function migrateV2DefinitionToV3(
  definition: CustomScreenDefinitionV2,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV3 {
  const { rowClick: _rowClick, createMode: _createMode, ...listViewInput } = definition.listView;
  return {
    schemaVersion: 3,
    listView: normalizeCustomScreenListViewDefinitionForRead(listViewInput, context),
    editorView: {
      blocks: normalizeCustomScreenBlocks(definition.editorView.blocks),
      bindings: normalizeCustomScreenBindingsForRead(definition.editorView.bindings, context),
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}

export function migrateV2DefinitionToV4(
  definition: CustomScreenDefinitionV2,
  context?: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  return migrateV3DefinitionToV4(migrateV2DefinitionToV3(definition, context), context);
}

export function normalizeCustomScreenDefinition(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
    definition?: unknown;
    listView?: unknown;
    editorView?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext
): CustomScreenDefinition {
  const rawInput = input.definition !== undefined ? input.definition : input;
  if (!isRecord(rawInput)) throw new Error("custom_screen_definition_invalid");
  if ("contentTypeId" in rawInput) {
    throw new Error("custom_screen_definition_invalid");
  }
  const hasV2ListViewKeys =
    isRecord(rawInput.listView) &&
    ("rowClick" in rawInput.listView || "createMode" in rawInput.listView);
  const hasV4EditorDocument = isRecord(rawInput.editorView) && "document" in rawInput.editorView;
  const version =
    "listView" in rawInput || "editorView" in rawInput
      ? hasV2ListViewKeys
        ? 2
        : hasV4EditorDocument
          ? 4
          : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? 3)
      : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion);

  if (version === 1) {
    return migrateV1DefinitionToV4(normalizeCustomScreenV1Definition(rawInput, context), context);
  }

  if (version === 2) {
    throw new Error("custom_screen_definition_invalid");
  }

  rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
  const schemaVersion = normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? version);
  if (schemaVersion === 3) {
    return migrateV3DefinitionToV4(
      {
        schemaVersion: 3,
        listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context),
        editorView: normalizeCustomScreenEditorViewDefinition(rawInput.editorView, context),
      },
      context
    );
  }
  if (schemaVersion !== 4) throw new Error("custom_screen_definition_invalid");
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context),
    editorView: normalizeCustomScreenEditorViewDefinitionV4(rawInput.editorView, context),
  };
}

export function normalizeCustomScreenDefinitionForWrite(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
    definition?: unknown;
    listView?: unknown;
    editorView?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): CustomScreenDefinition {
  if (input.blocks !== undefined || input.bindings !== undefined) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }
  if (
    input.schemaVersion !== undefined &&
    normalizeCustomScreenSchemaVersion(input.schemaVersion) !== 4
  ) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }

  const rawInput =
    input.definition !== undefined
      ? input.definition
      : {
          ...(input.schemaVersion !== undefined ? { schemaVersion: input.schemaVersion } : {}),
          ...(input.listView !== undefined ? { listView: input.listView } : {}),
          ...(input.editorView !== undefined ? { editorView: input.editorView } : {}),
        };
  if (!isRecord(rawInput)) throw new Error("custom_screen_definition_invalid");
  if ("contentTypeId" in rawInput) {
    throw new Error("custom_screen_definition_invalid");
  }
  if ("blocks" in rawInput || "bindings" in rawInput) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }

  const hasV4EditorDocument = isRecord(rawInput.editorView) && "document" in rawInput.editorView;
  const hasLegacyEditorView =
    isRecord(rawInput.editorView) &&
    ("blocks" in rawInput.editorView || !("document" in rawInput.editorView));
  const hasV2ListViewKeys =
    isRecord(rawInput.listView) &&
    ("rowClick" in rawInput.listView || "createMode" in rawInput.listView);
  const version =
    rawInput.schemaVersion === undefined && !("listView" in rawInput) && !("editorView" in rawInput)
      ? 4
      : normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? (hasV4EditorDocument ? 4 : 3));

  if (version !== 4 || hasLegacyEditorView || hasV2ListViewKeys) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }

  rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
  return {
    schemaVersion: 4,
    listView: normalizeCustomScreenListViewDefinition(rawInput.listView, context, sink),
    editorView: normalizeCustomScreenEditorViewDefinitionV4(rawInput.editorView, context, sink),
  };
}

export function normalizeCustomScreenDefinitionForRead(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
    definition?: unknown;
    listView?: unknown;
    editorView?: unknown;
  } = {},
  context?: CustomScreenDefinitionContext
): CustomScreenDefinition {
  const rawInput = input.definition !== undefined ? input.definition : input;
  const hasV4EditorDocument =
    isRecord(rawInput) && isRecord(rawInput.editorView) && "document" in rawInput.editorView;
  if (isRecord(rawInput)) {
    if (hasV4EditorDocument) {
      try {
        const version = normalizeCustomScreenSchemaVersion(rawInput.schemaVersion ?? 4);
        if (version !== 4) throw new Error("custom_screen_definition_invalid");
        rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
        const listView = normalizeCustomScreenListViewDefinitionForRead(rawInput.listView, context);
        let editorView: CustomScreenEditorViewDefinitionV4;
        try {
          editorView = normalizeCustomScreenEditorViewDefinitionV4ForRead(
            rawInput.editorView,
            context
          );
        } catch (error) {
          if (!isCustomScreenDefinitionInvalidError(error)) throw error;
          editorView = createEmptyCustomScreenEditorViewV4();
        }
        return {
          schemaVersion: 4,
          listView,
          editorView,
        };
      } catch {
        // Fall through to the broader legacy read-repair path below.
      }
    }
  }
  try {
    return normalizeCustomScreenDefinition(input, context);
  } catch {
    if (isRecord(rawInput)) {
      const version =
        "listView" in rawInput || "editorView" in rawInput
          ? isRecord(rawInput.listView) &&
            ("rowClick" in rawInput.listView || "createMode" in rawInput.listView)
            ? 2
            : hasV4EditorDocument
              ? 4
              : 3
          : typeof rawInput.schemaVersion === "number"
            ? rawInput.schemaVersion
            : null;

      if (version === 2) {
        const legacyListView = (() => {
          try {
            if (!isRecord(rawInput.listView)) {
              return {
                ...buildDefaultListViewDefinition(context?.contentType),
                rowClick: "editor-view" as const,
                createMode: "editor-view" as const,
              };
            }
            const columns =
              Array.isArray(rawInput.listView.columns) && rawInput.listView.columns.length > 0
                ? rawInput.listView.columns
                : buildDefaultListViewDefinition(context?.contentType).columns;
            const filters = Array.isArray(rawInput.listView.filters)
              ? rawInput.listView.filters
              : [];
            const defaultSort = isRecord(rawInput.listView.defaultSort)
              ? {
                  field:
                    typeof rawInput.listView.defaultSort.field === "string"
                      ? rawInput.listView.defaultSort.field
                      : buildDefaultListViewDefinition(context?.contentType).defaultSort.field,
                  direction:
                    rawInput.listView.defaultSort.direction === "asc" ||
                    rawInput.listView.defaultSort.direction === "desc"
                      ? rawInput.listView.defaultSort.direction
                      : buildDefaultListViewDefinition(context?.contentType).defaultSort.direction,
                }
              : buildDefaultListViewDefinition(context?.contentType).defaultSort;
            const bulkActions = isRecord(rawInput.listView.bulkActions)
              ? {
                  delete:
                    typeof rawInput.listView.bulkActions.delete === "boolean"
                      ? rawInput.listView.bulkActions.delete
                      : true,
                  publish:
                    typeof rawInput.listView.bulkActions.publish === "boolean"
                      ? rawInput.listView.bulkActions.publish
                      : true,
                  unpublish:
                    typeof rawInput.listView.bulkActions.unpublish === "boolean"
                      ? rawInput.listView.bulkActions.unpublish
                      : true,
                }
              : buildDefaultListViewDefinition(context?.contentType).bulkActions;
            return {
              columns,
              filters,
              defaultSort,
              rowClick:
                rawInput.listView.rowClick === "classic-editor" ||
                rawInput.listView.rowClick === "editor-view"
                  ? rawInput.listView.rowClick
                  : "editor-view",
              createMode:
                rawInput.listView.createMode === "drawer" ||
                rawInput.listView.createMode === "editor-view"
                  ? rawInput.listView.createMode
                  : "editor-view",
              bulkActions,
            } satisfies CustomScreenDefinitionV2["listView"];
          } catch {
            return {
              ...buildDefaultListViewDefinition(context?.contentType),
              rowClick: "editor-view" as const,
              createMode: "editor-view" as const,
            };
          }
        })();

        const legacyEditorView = isRecord(rawInput.editorView)
          ? {
              blocks: rawInput.editorView.blocks,
              bindings: rawInput.editorView.bindings,
            }
          : { blocks: input.blocks, bindings: input.bindings };
        const {
          rowClick: _rowClick,
          createMode: _createMode,
          ...legacyListViewForV4
        } = legacyListView;

        return {
          schemaVersion: 4,
          listView: normalizeCustomScreenListViewDefinitionForRead(legacyListViewForV4, context),
          editorView: normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty(
            legacyEditorView.blocks,
            legacyEditorView.bindings,
            context
          ),
        };
      }

      if (version === 3 && !hasV4EditorDocument && isRecord(rawInput.editorView)) {
        rejectUnknownKeys(rawInput, ["schemaVersion", "listView", "editorView"]);
        rejectUnknownKeys(rawInput.editorView, [
          "blocks",
          "bindings",
          "saveMode",
          "interactionMode",
        ]);
        const saveMode = normalizeText(rawInput.editorView.saveMode) ?? "entry";
        const interactionMode = normalizeText(rawInput.editorView.interactionMode) ?? "inline";
        if (saveMode !== "entry" || interactionMode !== "inline") {
          throw new Error("custom_screen_definition_invalid");
        }
        return {
          schemaVersion: 4,
          listView: normalizeCustomScreenListViewDefinitionForRead(rawInput.listView, context),
          editorView: normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty(
            rawInput.editorView.blocks,
            rawInput.editorView.bindings,
            context
          ),
        };
      }

      if (version === 1 && !("listView" in rawInput) && !("editorView" in rawInput)) {
        rejectUnknownKeys(rawInput, ["schemaVersion", "blocks", "bindings"]);
        return {
          schemaVersion: 4,
          listView: buildDefaultListViewDefinition(context?.contentType),
          editorView: normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty(
            rawInput.blocks,
            rawInput.bindings,
            context
          ),
        };
      }
    }

    try {
      return normalizeCustomScreenDefinition(input);
    } catch {
      return migrateV1DefinitionToV4(
        normalizeCustomScreenV1Definition({
          schemaVersion: 1,
          blocks: isRecord(rawInput) ? rawInput.blocks : input.blocks,
          bindings: isRecord(rawInput) ? rawInput.bindings : input.bindings,
        }),
        context
      );
    }
  }
}

export function normalizeCustomScreenSidebarConfig(
  input: {
    showInSidebar?: unknown;
    sidebarLabel?: unknown;
  } = {}
): CustomScreenSidebarConfig {
  const showInSidebar = input.showInSidebar === true;
  const label = normalizeText(input.sidebarLabel);
  return {
    showInSidebar,
    sidebarLabel: label,
  };
}

export const normalizeCollectionRole = (value: unknown): CustomScreenCollectionRole | null => {
  if (value === undefined || value === null) return null;
  const role = normalizeText(value);
  if (!role || !collectionRoles.has(role as CustomScreenCollectionRole)) {
    throw new Error("custom_screen_invalid");
  }
  return role as CustomScreenCollectionRole;
};

export const normalizeCompositionKey = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const key = normalizeText(value);
  if (!key) return null;
  if (key.length > 160) throw new Error("custom_screen_invalid");
  return normalizePath(key);
};

export function normalizeCustomScreenCollectionLink(
  input: {
    collectionRole?: unknown;
    compositionKey?: unknown;
  } = {}
): CustomScreenCollectionLink {
  return {
    collectionRole: normalizeCollectionRole(input.collectionRole),
    compositionKey: normalizeCompositionKey(input.compositionKey),
  };
}
