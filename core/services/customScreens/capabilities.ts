import type { WidgetBlock } from "../../widgets/types";

import type { CustomScreenBinding, CustomScreenDefinition } from "./customScreenSchemas";
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
  editorView?: CustomScreenDefinition["editorView"] | null;
}): CustomScreenCapabilities {
  const editorView = input.definition?.editorView ?? input.editorView ?? null;
  const blocks = Array.isArray(input.blocks)
    ? input.blocks
    : Array.isArray(editorView?.blocks)
      ? editorView.blocks
      : [];
  const bindings = Array.isArray(input.bindings)
    ? input.bindings
    : Array.isArray(editorView?.bindings)
      ? editorView.bindings
      : [];
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
