import {
  isScreenEntryPresentationSingleMediaField,
  screenEntryPresentationTextEmphasisValues,
  screenEntryPresentationTextSizes,
  screenEntryPresentationToneValues,
  type ScreenEntryPresentationOverrideDraft,
  type ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import { collectScreenDocumentBlocks } from "../../../services/customScreens/screenDocumentOps";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";

export type ScreenEntryPresentationField = Readonly<{
  name: string;
  label: string;
  type: string;
  multiple?: boolean;
  media?: Readonly<{ multiple?: boolean; accept?: string[] }>;
}>;

export type PresentationTarget = {
  block: ScreenBlockV1;
  label: string;
  supportsText: boolean;
  mediaField: ScreenEntryPresentationField | null;
  supportsDirectImage: boolean;
};

export const inheritPresentationValue = "__inherit__";
const recordHeaderPresentationBindingPaths = new Set([
  "title",
  "eyebrow",
  "subtitle",
  "description",
  "badge",
]);
const systemPresentationFieldNames = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

export const presentationTextSizeOptions = screenEntryPresentationTextSizes.map((value) => ({
  value,
  label: value.toUpperCase(),
}));
export const presentationTextEmphasisOptions = screenEntryPresentationTextEmphasisValues.map(
  (value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })
);
export const presentationToneOptions = screenEntryPresentationToneValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const presentationOverrideSort = (
  left: ScreenEntryPresentationOverrideDraft,
  right: ScreenEntryPresentationOverrideDraft
) => {
  const blockCompare = left.blockId.localeCompare(right.blockId);
  return blockCompare === 0 ? left.propPath.localeCompare(right.propPath) : blockCompare;
};

export const normalizePresentationOverrideOrder = (
  overrides: readonly ScreenEntryPresentationOverrideDraft[]
) => [...overrides].sort(presentationOverrideSort);

export const serializePresentationOverrides = (
  overrides: readonly ScreenEntryPresentationOverrideDraft[]
) => JSON.stringify(normalizePresentationOverrideOrder(overrides));

export function resolvePresentationDraftTransition(input: {
  saved: readonly ScreenEntryPresentationOverrideDraft[];
  current: readonly ScreenEntryPresentationOverrideDraft[];
  update: (
    current: readonly ScreenEntryPresentationOverrideDraft[]
  ) => ScreenEntryPresentationOverrideDraft[];
}) {
  const nextDraft = normalizePresentationOverrideOrder(input.update(input.current));
  return {
    nextDraft,
    dirty:
      serializePresentationOverrides(input.saved) !== serializePresentationOverrides(nextDraft),
  };
}

export const isDraftAuthorityClean = (input: {
  capturedGeneration: number;
  currentGeneration: number;
  contentDirty: boolean;
  presentationDirty: boolean;
}) =>
  input.capturedGeneration === input.currentGeneration &&
  !input.contentDirty &&
  !input.presentationDirty;

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const findBinding = (bindings: readonly ScreenFieldBinding[], blockId: string, propPath: string) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;
const findContentField = (fields: readonly ScreenEntryPresentationField[], fieldName: string) =>
  fields.find((field) => field.name === fieldName) ?? null;
const isResolvablePresentationField = (
  fields: readonly ScreenEntryPresentationField[],
  fieldName: string
) => systemPresentationFieldNames.has(fieldName) || Boolean(findContentField(fields, fieldName));
const resolveFieldBlockFieldName = (
  block: ScreenBlockV1,
  bindings: readonly ScreenFieldBinding[]
) => findBinding(bindings, block.id, "value")?.field ?? readString(block.data.field);

const resolveBlockLabel = (
  block: ScreenBlockV1,
  fields: readonly ScreenEntryPresentationField[]
) => {
  const dataLabel =
    readString(block.data.label) ||
    readString(block.data.title) ||
    readString(block.data.content) ||
    readString(block.label);
  if (dataLabel) return dataLabel;
  if (block.type === "field") {
    return findContentField(fields, readString(block.data.field))?.label ?? "Field";
  }
  if (block.type === "record-header") return "Record header";
  if (block.type === "rich-text") return "Shared text";
  return "Selected block";
};

export const resolvePresentationTarget = (input: {
  block: ScreenBlockV1 | null;
  bindings: readonly ScreenFieldBinding[];
  fields: readonly ScreenEntryPresentationField[];
}): PresentationTarget | null => {
  const { block, bindings, fields } = input;
  if (!block) return null;
  if (block.type === "rich-text") {
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: true,
      mediaField: null,
      supportsDirectImage: false,
    };
  }
  if (block.type === "record-header") {
    const bindingsForHeader = bindings.filter(
      (binding) =>
        binding.blockId === block.id && recordHeaderPresentationBindingPaths.has(binding.propPath)
    );
    if (
      !bindingsForHeader.every((binding) => isResolvablePresentationField(fields, binding.field))
    ) {
      return null;
    }
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: true,
      mediaField: null,
      supportsDirectImage: false,
    };
  }
  if (block.type === "image") {
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: false,
      mediaField: null,
      supportsDirectImage: true,
    };
  }
  if (block.type !== "field") return null;
  const fieldName = resolveFieldBlockFieldName(block, bindings);
  if (!fieldName || !isResolvablePresentationField(fields, fieldName)) return null;
  const field = findContentField(fields, fieldName);
  return {
    block,
    label: resolveBlockLabel(block, fields),
    supportsText: true,
    mediaField: isScreenEntryPresentationSingleMediaField(field) ? field : null,
    supportsDirectImage: false,
  };
};

export const filterRenderableScreenEntryPresentationOverrides = (input: {
  document: ScreenDocumentV1;
  bindings: readonly ScreenFieldBinding[];
  fields: readonly ScreenEntryPresentationField[];
  overrides: readonly ScreenEntryPresentationOverrideDraft[];
}): ScreenEntryPresentationOverrideDraft[] => {
  const multipleMediaBlockIds = new Set<string>();
  for (const block of collectScreenDocumentBlocks(input.document)) {
    if (block.type !== "field") continue;
    const fieldName = resolveFieldBlockFieldName(block, input.bindings);
    const field = fieldName ? findContentField(input.fields, fieldName) : null;
    if (field?.type === "media" && !isScreenEntryPresentationSingleMediaField(field)) {
      multipleMediaBlockIds.add(block.id);
    }
  }
  return input.overrides.filter(
    (override) =>
      !multipleMediaBlockIds.has(override.blockId) ||
      (override.propPath !== "mediaAssetId" && override.propPath !== "image")
  );
};

export const upsertPresentationOverride = (
  overrides: readonly ScreenEntryPresentationOverrideDraft[],
  blockId: string,
  propPath: ScreenEntryPresentationOverridePropPath,
  value: string | null
) => {
  const withoutTarget = overrides.filter((override) => {
    if (override.blockId !== blockId) return true;
    if (propPath === "mediaAssetId") {
      return override.propPath !== "mediaAssetId" && override.propPath !== "image";
    }
    return override.propPath !== propPath;
  });
  if (!value) return normalizePresentationOverrideOrder(withoutTarget);
  return normalizePresentationOverrideOrder([...withoutTarget, { blockId, propPath, value }]);
};

export const removePresentationOverridesForBlock = (
  overrides: readonly ScreenEntryPresentationOverrideDraft[],
  blockId: string
) => overrides.filter((override) => override.blockId !== blockId);
