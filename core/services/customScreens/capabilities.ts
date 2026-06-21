import type { WidgetBlock } from "../../widgets/types";

import { type CustomScreenBinding, type CustomScreenDefinition } from "./customScreenSchemas";
import { isBindingWriteAllowed, resolveCustomScreenBindingContracts } from "./bindingResolver";

export type CustomScreenMode = "collection-only" | "dashboard" | "editor";

export type CustomScreenCapabilities = {
  mode: CustomScreenMode;
  hasBlocks: boolean;
  hasBindings: boolean;
  hasReadableBindings: boolean;
  hasWritableBindings: boolean;
  supportsDedicatedPreview: boolean;
  supportsDedicatedEditor: boolean;
  bindingCounts: {
    total: number;
    readable: number;
    writable: number;
  };
};

export function resolveCustomScreenCapabilities(input: {
  blocks?: WidgetBlock[] | null;
  bindings?: CustomScreenBinding[] | null;
  definition?: CustomScreenDefinition | null;
  listView?: CustomScreenDefinition["listView"] | null;
  editorView?: unknown;
}): CustomScreenCapabilities {
  const definition = input.definition ?? null;
  if (definition) {
    const blocks = definition.editorView.document.sections;
    const bindings = definition.editorView.bindings;
    const blockTypesById = new Map<string, string>();
    const visit = (items: typeof blocks) => {
      items.forEach((block) => {
        blockTypesById.set(block.id, block.type);
        if (block.children) visit(block.children);
        if (block.slots) {
          Object.values(block.slots).forEach((slotBlocks) => visit(slotBlocks));
        }
      });
    };
    visit(blocks);
    const readable = bindings.filter((binding) => binding.mode !== "write").length;
    const writable = bindings.filter(
      (binding) =>
        binding.mode !== "read" && blockTypesById.get(binding.blockId) !== "legacy-widget"
    ).length;
    const hasBlocks = blocks.length > 0;
    const hasBindings = bindings.length > 0;
    const hasReadableBindings = readable > 0;
    const hasWritableBindings = writable > 0;
    let mode: CustomScreenMode = "collection-only";
    if (hasBlocks && (hasReadableBindings || hasWritableBindings)) {
      mode = hasWritableBindings ? "editor" : "dashboard";
    }

    return {
      mode,
      hasBlocks,
      hasBindings,
      hasReadableBindings,
      hasWritableBindings,
      supportsDedicatedPreview: hasBlocks && hasReadableBindings,
      supportsDedicatedEditor: mode === "editor",
      bindingCounts: {
        total: bindings.length,
        readable,
        writable,
      },
    };
  }

  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const bindings = Array.isArray(input.bindings) ? input.bindings : [];
  const readable = bindings.filter((binding) => binding.mode !== "write").length;
  const contracts = blocks.length > 0 ? resolveCustomScreenBindingContracts(blocks) : null;
  const writable = bindings.filter((binding) =>
    isBindingWriteAllowed(binding, {
      contracts,
      fallbackToModeOnly: blocks.length === 0,
    })
  ).length;
  const hasBlocks = blocks.length > 0;
  const hasBindings = bindings.length > 0;
  const hasReadableBindings = readable > 0;
  const hasWritableBindings = writable > 0;

  let mode: CustomScreenMode = "collection-only";
  if (hasBlocks && (hasReadableBindings || hasWritableBindings)) {
    mode = hasWritableBindings ? "editor" : "dashboard";
  }

  return {
    mode,
    hasBlocks,
    hasBindings,
    hasReadableBindings,
    hasWritableBindings,
    supportsDedicatedPreview: hasBlocks && hasReadableBindings,
    supportsDedicatedEditor: mode === "editor",
    bindingCounts: {
      total: bindings.length,
      readable,
      writable,
    },
  };
}
