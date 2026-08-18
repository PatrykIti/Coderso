// Action-executor custom-screen document operations (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import type { getCustomScreen } from "../customScreens/customScreenService";
import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../customScreens/customScreenSchemas";
import {
  addScreenBlock,
  findScreenBlockById,
  updateScreenBlock,
} from "../customScreens/screenDocumentOps";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlock } from "../../widgets/validator";
import type { WidgetBlock } from "../../widgets/types";
import type { AssistantCustomScreenUpdateAction } from "./actionPlanTypes";
import type { ScreenBlockDataPatchResult } from "./actionExecutorTypes";

export const getExistingCustomScreenDefinition = (
  existing: Awaited<ReturnType<typeof getCustomScreen>>
): CustomScreenDefinition | null => {
  if (!existing) return null;
  return normalizeCustomScreenDefinitionForRead({
    definition: existing.definition,
    schemaVersion: existing.schemaVersion,
    blocks: existing.blocks,
    bindings: existing.bindings,
  });
};

export const customScreenTargetMatches = (
  existing: Awaited<ReturnType<typeof getCustomScreen>>,
  input: { name: string; expectedStatus?: string | null }
) => {
  const expectedStatus = input.expectedStatus?.trim() ?? "";
  return Boolean(
    existing &&
    existing.name === input.name &&
    (!expectedStatus || existing.status === expectedStatus)
  );
};

export const customScreenMissingConflict = (existing: unknown, message?: string) => ({
  code: "assistant_action_dependency_missing",
  severity: "error" as const,
  message:
    message ??
    (existing
      ? "Custom screen no longer matches the planned target."
      : "Custom screen was not found."),
});

export const withCustomScreenDefinition = (
  definition: CustomScreenDefinition,
  patch: Partial<CustomScreenDefinition>
): CustomScreenDefinition => ({
  ...definition,
  ...patch,
  editorView: patch.editorView ?? definition.editorView,
  listView: patch.listView ?? definition.listView,
});

export const addBlockToScreenSection = (
  document: ScreenDocumentV1,
  sectionId: string | null | undefined,
  block: ScreenBlockV1
): ScreenDocumentV1 => {
  if (!sectionId) return addScreenBlock(document, block);
  let inserted = false;
  const sections = document.sections.map((section) => {
    if (section.id !== sectionId) return section;
    inserted = true;
    return {
      ...section,
      blocks: [...section.blocks, block],
    };
  });
  return inserted ? { ...document, sections } : document;
};

export const setCustomScreenBinding = (
  bindings: ScreenFieldBinding[],
  binding: ScreenFieldBinding
): ScreenFieldBinding[] => {
  const index = bindings.findIndex(
    (item) =>
      item.id === binding.id ||
      (item.blockId === binding.blockId &&
        item.propPath === binding.propPath &&
        item.field === binding.field)
  );
  if (index < 0) return [...bindings, binding];
  const next = [...bindings];
  next[index] = binding;
  return next;
};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readScreenDataPath = (data: Record<string, unknown>, path: string[]) => {
  let cursor: unknown = data;
  for (const segment of path) {
    if (!isRecordValue(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return { found: false, value: undefined };
    }
    cursor = cursor[segment];
  }
  return { found: true, value: cursor };
};

const setScreenDataPath = (
  data: Record<string, unknown>,
  path: string[],
  value: string | number | boolean | null
): Record<string, unknown> | null => {
  const [head, ...tail] = path;
  if (!head || !Object.prototype.hasOwnProperty.call(data, head)) return null;
  if (tail.length === 0) return { ...data, [head]: value };
  const nested = data[head];
  if (!isRecordValue(nested)) return null;
  const nextNested = setScreenDataPath(nested, tail, value);
  return nextNested ? { ...data, [head]: nextNested } : null;
};

export const applyScreenBlockDataPatch = (
  document: ScreenDocumentV1,
  input: {
    blockId: string;
    expectedBlockType?: string | null;
    dataPath: string[];
    value: string | number | boolean | null;
  }
): ScreenBlockDataPatchResult => {
  const block = findScreenBlockById(document, input.blockId);
  if (!block) {
    return {
      status: "missing_block",
      document,
      beforeValue: undefined,
      nextValue: undefined,
      block: null,
    };
  }
  if (input.expectedBlockType && block.type !== input.expectedBlockType) {
    return {
      status: "type_mismatch",
      document,
      beforeValue: undefined,
      nextValue: undefined,
      block,
    };
  }
  const current = readScreenDataPath(block.data, input.dataPath);
  if (!current.found) {
    return {
      status: "missing_path",
      document,
      beforeValue: undefined,
      nextValue: undefined,
      block,
    };
  }
  const nextData = setScreenDataPath(block.data, input.dataPath, input.value);
  if (!nextData) {
    return {
      status: "missing_path",
      document,
      beforeValue: current.value,
      nextValue: undefined,
      block,
    };
  }
  const nextDocument = updateScreenBlock(document, input.blockId, { data: nextData });
  return {
    status: "ok",
    document: nextDocument,
    beforeValue: current.value,
    nextValue: input.value,
    block: findScreenBlockById(nextDocument, input.blockId),
  };
};

export const applyCustomScreenUpdatePatch = (
  existing: Awaited<ReturnType<typeof getCustomScreen>>,
  patch: AssistantCustomScreenUpdateAction["input"]["patch"]
) => {
  if (!existing) return null;
  return {
    name: patch.name ?? existing.name,
    status: patch.status ?? existing.status,
    collectionRole:
      patch.collectionRole !== undefined ? patch.collectionRole : existing.collectionRole,
    compositionKey:
      patch.compositionKey !== undefined ? patch.compositionKey : existing.compositionKey,
    showInSidebar: patch.showInSidebar !== undefined ? patch.showInSidebar : existing.showInSidebar,
    sidebarLabel: patch.sidebarLabel !== undefined ? patch.sidebarLabel : existing.sidebarLabel,
  };
};

export const normalizeAssistantPagePatchBlock = (block: WidgetBlock) => {
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlock(block);
};
