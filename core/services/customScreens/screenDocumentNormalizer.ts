import type { WidgetBlock } from "../../widgets/types";
import {
  SCREEN_BLOCK_COLLECTION_MAX,
  SCREEN_DOCUMENT_SECTIONS_MAX,
  defaultScreenSectionId,
} from "./customScreenContracts";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
  ScreenSectionV1,
} from "./customScreenContracts";
import {
  assertTabSlots,
  normalizeScreenBlockData,
  normalizeScreenBlockStyle,
  normalizeScreenData,
  normalizeScreenSectionStyle,
} from "./screenDocumentDataNormalizer";
import {
  generatedFieldPath,
  invalid,
  isRecord,
  normalizeJsonValue,
  normalizeScreenPath,
  normalizeText,
  normalizeUniqueIds,
  rejectUnknownKeys,
} from "./customScreenNormalizationPrimitives";
import type {
  ScreenFieldPathSegment,
  ScreenNormalizeMode,
} from "./customScreenNormalizationPrimitives";

export const normalizeScreenBlock = (
  value: unknown,
  mode: ScreenNormalizeMode,
  blockPath: readonly ScreenFieldPathSegment[],
  allocateStoredReadBlockId?: () => string
): ScreenBlockV1 => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, [
    "id",
    "type",
    "label",
    "variant",
    "style",
    "data",
    "layout",
    "visibility",
    "editor",
    "legacyWidgetType",
    "children",
    "slots",
  ]);
  const rawId =
    mode === "stored-read" && (value.id === undefined || value.id === null)
      ? allocateStoredReadBlockId?.()
      : value.id;
  const id = normalizeScreenPath(rawId, mode);
  const type = normalizeText(value.type);
  if (!type) throw new Error("custom_screen_definition_invalid");
  const label = normalizeText(value.label);
  const variant = normalizeText(value.variant);
  const style = normalizeScreenBlockStyle(value.style);
  const legacyWidgetType = normalizeText(value.legacyWidgetType);
  if (Array.isArray(value.children) && value.children.length > SCREEN_BLOCK_COLLECTION_MAX) {
    invalid(generatedFieldPath(...blockPath, "children"));
  }
  const children = Array.isArray(value.children)
    ? normalizeUniqueIds(
        value.children.map((item, childIndex) =>
          normalizeScreenBlock(
            item,
            mode,
            [...blockPath, "children", childIndex],
            allocateStoredReadBlockId
          )
        )
      )
    : undefined;
  const slots =
    value.slots === undefined || value.slots === null
      ? undefined
      : isRecord(value.slots)
        ? Object.fromEntries(
            Object.entries(value.slots).map(([slotId, items], slotGroupIndex) => {
              if (!normalizeText(slotId)) throw new Error("custom_screen_definition_invalid");
              if (!Array.isArray(items)) throw new Error("custom_screen_definition_invalid");
              if (items.length > SCREEN_BLOCK_COLLECTION_MAX) {
                invalid(generatedFieldPath(...blockPath, "slots", slotGroupIndex));
              }
              return [
                slotId,
                normalizeUniqueIds(
                  items.map((item, slotIndex) =>
                    normalizeScreenBlock(
                      item,
                      mode,
                      [...blockPath, "slots", slotGroupIndex, slotIndex],
                      allocateStoredReadBlockId
                    )
                  )
                ),
              ];
            })
          )
        : null;
  if (slots === null) throw new Error("custom_screen_definition_invalid");

  const block: ScreenBlockV1 = {
    id,
    type,
    ...(label ? { label } : {}),
    ...(variant ? { variant } : {}),
    ...(style ? { style } : {}),
    data: normalizeScreenBlockData(type, value.data, mode, blockPath),
    ...(value.layout !== undefined
      ? { layout: normalizeJsonValue(value.layout) as WidgetBlock["layout"] }
      : {}),
    ...(value.visibility !== undefined
      ? { visibility: normalizeJsonValue(value.visibility) as WidgetBlock["visibility"] }
      : {}),
    ...(value.editor !== undefined
      ? { editor: normalizeJsonValue(value.editor) as WidgetBlock["editor"] }
      : {}),
    ...(legacyWidgetType ? { legacyWidgetType } : {}),
    ...(children ? { children } : {}),
    ...(slots ? { slots } : {}),
  };
  assertTabSlots(block, blockPath);
  return block;
};

export const createDefaultScreenSection = (
  blocks: ScreenBlockV1[],
  id = defaultScreenSectionId
): ScreenSectionV1 => ({
  id,
  type: "section",
  label: "Details",
  data: { title: "Details" },
  blocks,
});

export const normalizeScreenSection = (
  value: unknown,
  index: number,
  mode: ScreenNormalizeMode,
  sectionPath: readonly ScreenFieldPathSegment[],
  allocateStoredReadBlockId?: () => string
): ScreenSectionV1 => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(value, [
    "id",
    "type",
    "label",
    "data",
    "layout",
    "visibility",
    "style",
    "blocks",
  ]);
  const id = normalizeScreenPath(
    mode === "write" ? value.id : (value.id ?? `section-${index + 1}`),
    mode
  );
  const type = normalizeText(value.type) ?? "section";
  if (type !== "section") throw new Error("custom_screen_definition_invalid");
  const label = normalizeText(value.label);
  const style = normalizeScreenSectionStyle(value.style);
  if (value.blocks !== undefined && !Array.isArray(value.blocks)) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (Array.isArray(value.blocks) && value.blocks.length > SCREEN_BLOCK_COLLECTION_MAX) {
    invalid(generatedFieldPath(...sectionPath, "blocks"));
  }
  return {
    id,
    type: "section",
    ...(label ? { label } : {}),
    data: normalizeScreenData(value.data),
    ...(value.layout !== undefined
      ? { layout: normalizeJsonValue(value.layout) as WidgetBlock["layout"] }
      : {}),
    ...(value.visibility !== undefined
      ? { visibility: normalizeJsonValue(value.visibility) as WidgetBlock["visibility"] }
      : {}),
    ...(style ? { style } : {}),
    blocks: normalizeUniqueIds(
      (value.blocks ?? []).map((item, blockIndex) =>
        normalizeScreenBlock(
          item,
          mode,
          [...sectionPath, "blocks", blockIndex],
          allocateStoredReadBlockId
        )
      )
    ),
  };
};

export const sectionsLookLikeLegacyBlockArray = (sections: unknown[]) =>
  sections.some((item) => isRecord(item) && !("blocks" in item));

export const normalizeScreenDocumentV1AtPath = (
  input: unknown,
  mode: ScreenNormalizeMode,
  documentPath: readonly ScreenFieldPathSegment[]
): ScreenDocumentV1 => {
  if (input === undefined || input === null) return { schemaVersion: 1, sections: [] };
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["schemaVersion", "sections"]);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (Array.isArray(input.sections) && input.sections.length > SCREEN_DOCUMENT_SECTIONS_MAX) {
    invalid(generatedFieldPath(...documentPath, "sections"));
  }
  return {
    schemaVersion: 1,
    sections: normalizeUniqueIds(
      (input.sections ?? []).map((item, index) =>
        normalizeScreenSection(item, index, mode, [...documentPath, "sections", index])
      )
    ),
  };
};

export function normalizeScreenDocumentV1(input: unknown): ScreenDocumentV1 {
  return normalizeScreenDocumentV1AtPath(input, "write", ["definition", "editorView", "document"]);
}

export const visitScreenBlocks = (
  blocks: ScreenBlockV1[],
  visitor: (block: ScreenBlockV1) => void
) => {
  blocks.forEach((block) => {
    visitor(block);
    if (Array.isArray(block.children) && block.children.length > 0) {
      visitScreenBlocks(block.children, visitor);
    }
    if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
      Object.values(block.slots).forEach((items) => {
        if (Array.isArray(items) && items.length > 0) {
          visitScreenBlocks(items, visitor);
        }
      });
    }
  });
};

export const collectScreenDocumentBlockIds = (document: ScreenDocumentV1) => {
  const ids = new Set<string>();
  document.sections.forEach((section) => {
    visitScreenBlocks(section.blocks, (block) => {
      if (ids.has(block.id)) throw new Error("custom_screen_definition_invalid");
      ids.add(block.id);
    });
  });
  return ids;
};

export const assertScreenFieldBindingsTargetDocument = (
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[]
) => {
  const blockIds = collectScreenDocumentBlockIds(document);
  if (bindings.some((binding) => !blockIds.has(binding.blockId))) {
    throw new Error("custom_screen_definition_invalid");
  }
};
