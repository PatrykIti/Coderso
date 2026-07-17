import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import type { WidgetBlock } from "../../widgets/types";
import { normalizeWidgetBlock } from "../../widgets/validator";
import {
  migrateCustomScreenBindingToScreenFieldBinding,
  projectScreenFieldBindingToCustomScreenBinding,
} from "./customScreenBindingNormalizer";
import type {
  CustomScreenBinding,
  CustomScreenDefinition,
  CustomScreenEditorViewDefinition,
  ScreenBlockV1,
  ScreenDocumentV1,
} from "./customScreenContracts";
import { normalizeScreenData } from "./screenDocumentDataNormalizer";
import { createDefaultScreenSection } from "./screenDocumentNormalizer";
import { isRecord, normalizeJsonValue, normalizeText } from "./customScreenNormalizationPrimitives";

export const retiredScreenWidgetTypes = new Set([
  "screen-record-header",
  "screen-field-value",
  "screen-field-group",
  "screen-two-column",
]);

export const normalizeLegacyScreenWidgetBlock = (value: unknown): WidgetBlock | null => {
  if (!isRecord(value)) return null;
  const type = normalizeText(value.type);
  if (!type || !retiredScreenWidgetTypes.has(type)) return null;
  const id = normalizeText(value.id);
  if (!id) throw new Error("custom_screen_definition_invalid");
  const data = normalizeJsonValue(value.data ?? {});
  if (!isRecord(data)) throw new Error("custom_screen_definition_invalid");
  const variant = normalizeText(value.variant);
  const slots = isRecord(value.slots)
    ? Object.fromEntries(
        Object.entries(value.slots).map(([slotId, items]) => {
          if (!Array.isArray(items)) return [slotId, []];
          return [slotId, items.map((item) => normalizeLegacyScreenWidgetBlock(item) ?? item)];
        })
      )
    : undefined;
  const children = Array.isArray(value.children)
    ? value.children.map((item) => normalizeLegacyScreenWidgetBlock(item) ?? item)
    : undefined;

  return {
    id,
    type,
    ...(variant ? { variant } : {}),
    data,
    ...(isRecord(value.layout) ? { layout: value.layout as WidgetBlock["layout"] } : {}),
    ...(isRecord(value.visibility)
      ? { visibility: value.visibility as WidgetBlock["visibility"] }
      : {}),
    ...(isRecord(value.editor) ? { editor: value.editor as WidgetBlock["editor"] } : {}),
    ...(children ? { children: children as WidgetBlock[] } : {}),
    ...(slots ? { slots: slots as Record<string, WidgetBlock[]> } : {}),
  };
};

export function normalizeCustomScreenBlocks(value: unknown): WidgetBlock[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }
  ensureRuntimeWidgetsRegistered();
  return value.map((item) => normalizeLegacyScreenWidgetBlock(item) ?? normalizeWidgetBlock(item));
}

export const screenBlockTypeFromWidgetType = (type: string) => {
  switch (type) {
    case "screen-field-value":
      return "field";
    case "screen-field-group":
      return "field-group";
    case "screen-record-header":
      return "record-header";
    case "screen-two-column":
      return "columns";
    default:
      return "legacy-widget";
  }
};

export const widgetTypeFromScreenBlock = (block: ScreenBlockV1) => {
  if (block.legacyWidgetType) return block.legacyWidgetType;
  switch (block.type) {
    case "field":
      return "screen-field-value";
    case "field-group":
      return "screen-field-group";
    case "record-header":
      return "screen-record-header";
    case "columns":
      return "screen-two-column";
    default:
      return block.type;
  }
};

export const migrateWidgetBlockToScreenBlock = (block: WidgetBlock): ScreenBlockV1 => {
  const slots =
    block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
      ? Object.fromEntries(
          Object.entries(block.slots).map(([slotId, items]) => [
            slotId,
            Array.isArray(items) ? items.map(migrateWidgetBlockToScreenBlock) : [],
          ])
        )
      : undefined;
  const children = Array.isArray(block.children)
    ? block.children.map(migrateWidgetBlockToScreenBlock)
    : undefined;
  const screenType = screenBlockTypeFromWidgetType(block.type);
  return {
    id: block.id,
    type: screenType,
    ...(typeof block.variant === "string" && block.variant.trim()
      ? { variant: block.variant.trim() }
      : {}),
    data: normalizeScreenData(block.data ?? {}),
    ...(block.layout ? { layout: block.layout } : {}),
    ...(block.visibility ? { visibility: block.visibility } : {}),
    ...(block.editor ? { editor: block.editor } : {}),
    ...(screenType === "legacy-widget" ? { legacyWidgetType: block.type } : {}),
    ...(children ? { children } : {}),
    ...(slots ? { slots } : {}),
  };
};

export const projectScreenBlockToWidgetBlock = (block: ScreenBlockV1): WidgetBlock => {
  const slots = block.slots
    ? Object.fromEntries(
        Object.entries(block.slots).map(([slotId, items]) => [
          slotId,
          items.map(projectScreenBlockToWidgetBlock),
        ])
      )
    : undefined;
  const children = block.children ? block.children.map(projectScreenBlockToWidgetBlock) : undefined;
  return {
    id: block.id,
    type: widgetTypeFromScreenBlock(block),
    ...(block.variant ? { variant: block.variant } : {}),
    data: block.data,
    ...(block.layout ? { layout: block.layout } : {}),
    ...(block.visibility ? { visibility: block.visibility } : {}),
    ...(block.editor ? { editor: block.editor } : {}),
    ...(children ? { children } : {}),
    ...(slots ? { slots } : {}),
  };
};

export const migrateWidgetBlocksToScreenDocument = (blocks: WidgetBlock[]): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections:
    blocks.length > 0
      ? [createDefaultScreenSection(blocks.map(migrateWidgetBlockToScreenBlock))]
      : [],
});

export function getCustomScreenEditorViewBlocks(definition: CustomScreenDefinition): WidgetBlock[] {
  return definition.editorView.document.sections.flatMap((section) =>
    section.blocks.map(projectScreenBlockToWidgetBlock)
  );
}

export function getCustomScreenEditorViewBindings(
  definition: CustomScreenDefinition
): CustomScreenBinding[] {
  return definition.editorView.bindings.map(projectScreenFieldBindingToCustomScreenBinding);
}

export function getCustomScreenEditorViewCompat(
  definition: CustomScreenDefinition
): CustomScreenEditorViewDefinition {
  return {
    blocks: getCustomScreenEditorViewBlocks(definition),
    bindings: getCustomScreenEditorViewBindings(definition),
    saveMode: "entry",
    interactionMode: "inline",
  };
}

export function withCustomScreenEditorViewCompat(
  definition: CustomScreenDefinition,
  editorView: CustomScreenEditorViewDefinition
): CustomScreenDefinition {
  return {
    ...definition,
    editorView: {
      document: migrateWidgetBlocksToScreenDocument(editorView.blocks),
      bindings: editorView.bindings.map(migrateCustomScreenBindingToScreenFieldBinding),
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}
