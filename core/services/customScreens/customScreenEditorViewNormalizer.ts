import {
  isBindingWriteModeSupported,
  resolveCustomScreenBindingContracts,
} from "./bindingResolver";
import {
  isCustomScreenDefinitionInvalidError,
  migrateCustomScreenBindingToScreenFieldBinding,
  normalizeCustomScreenBindings,
  normalizeCustomScreenBindingsForRead,
  normalizeScreenFieldBindingsWithMode,
} from "./customScreenBindingNormalizer";
import type {
  CustomScreenDefinitionContext,
  CustomScreenEditorViewDefinition,
  CustomScreenEditorViewDefinitionV4,
  ScreenBindingWarningSink,
  ScreenFieldBinding,
} from "./customScreenContracts";
import {
  collectScreenDocumentBlockIds,
  normalizeScreenDocumentV1AtPath,
} from "./screenDocumentNormalizer";
import {
  migrateWidgetBlocksToScreenDocument,
  normalizeCustomScreenBlocks,
} from "./customScreenLegacyAdapters";
import { isRecord, normalizeText, rejectUnknownKeys } from "./customScreenNormalizationPrimitives";
import { normalizeScreenDocumentV1ForReadWithRepairAtPath } from "./screenDocumentReadNormalizer";

export function normalizeCustomScreenEditorViewDefinition(
  input: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinition {
  if (input === undefined || input === null) {
    return { blocks: [], bindings: [], saveMode: "entry", interactionMode: "inline" };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["blocks", "bindings", "saveMode", "interactionMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  const interactionMode = normalizeText(input.interactionMode) ?? "inline";
  if (interactionMode !== "inline") throw new Error("custom_screen_definition_invalid");
  const blocks = normalizeCustomScreenBlocks(input.blocks);
  const bindings = normalizeCustomScreenBindings(input.bindings, context);
  const contracts = resolveCustomScreenBindingContracts(blocks);
  if (
    bindings.some(
      (binding) =>
        !isBindingWriteModeSupported(binding, {
          contracts,
        })
    )
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    blocks,
    bindings,
    saveMode: "entry",
    interactionMode: "inline",
  };
}

export function normalizeCustomScreenEditorViewDefinitionV4(
  input: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): CustomScreenEditorViewDefinitionV4 {
  if (input === undefined || input === null) {
    return {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["document", "bindings", "saveMode", "interactionMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  const interactionMode = normalizeText(input.interactionMode) ?? "inline";
  if (interactionMode !== "inline") throw new Error("custom_screen_definition_invalid");
  const document = normalizeScreenDocumentV1AtPath(input.document, "write", [
    "definition",
    "editorView",
    "document",
  ]);
  const bindings = normalizeScreenFieldBindingsWithMode(input.bindings, context, sink, "write");
  const blockIds = collectScreenDocumentBlockIds(document);
  // TASK-505-01 (Item B): when a sink is threaded, PRUNE block-orphans inline (recoverable
  // Save) instead of hard-throwing; no reconcileScreenBindings import (schemas←ops layering).
  if (sink) {
    const kept: ScreenFieldBinding[] = [];
    for (const binding of bindings) {
      if (blockIds.has(binding.blockId)) kept.push(binding);
      else sink.removedBlockOrphans.push(binding.field);
    }
    return {
      document,
      bindings: kept,
      saveMode: "entry",
      interactionMode: "inline",
    };
  }
  if (bindings.some((binding) => !blockIds.has(binding.blockId))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return {
    document,
    bindings,
    saveMode: "entry",
    interactionMode: "inline",
  };
}

export function normalizeCustomScreenEditorViewDefinitionV4ForRead(
  input: unknown,
  _context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinitionV4 {
  if (input === undefined || input === null) {
    return {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["document", "bindings", "saveMode", "interactionMode"]);
  const saveMode = normalizeText(input.saveMode) ?? "entry";
  if (saveMode !== "entry") throw new Error("custom_screen_definition_invalid");
  const interactionMode = normalizeText(input.interactionMode) ?? "inline";
  if (interactionMode !== "inline") throw new Error("custom_screen_definition_invalid");
  const { document, unsupportedButtonIds } = normalizeScreenDocumentV1ForReadWithRepairAtPath(
    input.document,
    ["definition", "editorView", "document"]
  );
  // TASK-505-01/03 (Item B) — read-path RETAINS field-orphans so recovery UX can NAME them.
  // A field-orphan (binding → LIVE block, but its content-type field was deleted AFTER save)
  // is created by an EXTERNAL schema change, never re-saved, so it can only surface on
  // reopen. We therefore normalize bindings WITHOUT content-type context (skips field-root
  // validation → the orphan is kept, not pruned, not thrown) so the editor's
  // detectScreenBindingOrphans can raise the amber "Orphaned field bindings" notice naming
  // the dead field (505-03 Acceptance #5/#6, 505-04 SMOKE #4/#5). The WRITE path still prunes
  // field-orphans on Save (recoverable Save + post-save `binding_field_removed` warning).
  // Block-orphans (binding → a block that no longer exists) CANNOT be persisted — the write
  // path prunes them on Save — and a dead blockId can never render, so they are dropped on
  // read (structural, context-independent) exactly as before. A malformed binding is dropped
  // by the stored-read item boundary without losing valid siblings. Duplicate normalized IDs
  // and unrepairable outer shapes still throw and reach the outer fail-closed read fallback.
  const bindings = normalizeScreenFieldBindingsWithMode(
    input.bindings,
    undefined,
    undefined,
    "stored-read"
  );
  const blockIds = collectScreenDocumentBlockIds(document);
  const keptBindings = bindings.filter(
    (binding) =>
      blockIds.has(binding.blockId) &&
      !(unsupportedButtonIds.has(binding.blockId) && binding.propPath === "href")
  );
  return {
    document,
    bindings: keptBindings,
    saveMode: "entry",
    interactionMode: "inline",
  };
}

export const createEmptyCustomScreenEditorViewV4 = (): CustomScreenEditorViewDefinitionV4 => ({
  document: { schemaVersion: 1, sections: [] },
  bindings: [],
  saveMode: "entry",
  interactionMode: "inline",
});

export const normalizeLegacyCustomScreenEditorViewV4ForRead = (
  blocks: unknown,
  bindings: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinitionV4 =>
  normalizeCustomScreenEditorViewDefinitionV4ForRead(
    {
      document: migrateWidgetBlocksToScreenDocument(normalizeCustomScreenBlocks(blocks)),
      bindings: normalizeCustomScreenBindingsForRead(bindings, context).map(
        migrateCustomScreenBindingToScreenFieldBinding
      ),
      saveMode: "entry",
      interactionMode: "inline",
    },
    context
  );

export const normalizeLegacyCustomScreenEditorViewV4ForReadOrEmpty = (
  blocks: unknown,
  bindings: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenEditorViewDefinitionV4 => {
  try {
    return normalizeLegacyCustomScreenEditorViewV4ForRead(blocks, bindings, context);
  } catch (error) {
    if (!isCustomScreenDefinitionInvalidError(error)) throw error;
    return createEmptyCustomScreenEditorViewV4();
  }
};
