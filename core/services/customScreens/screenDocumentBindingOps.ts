import type { ScreenBlockV1, ScreenDocumentV1, ScreenFieldBinding } from "./customScreenContracts";
import { buildScreenFieldBindingId } from "./customScreenNormalizationPrimitives";
import type { ScreenBindingReconcileResult } from "./screenDocumentContracts";
import { duplicateScreenBlockWithIdMap } from "./screenDocumentMutations";
import { collectScreenBlockIds } from "./screenDocumentTree";

export function duplicateScreenBlockWithBindings(
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[],
  blockId: string
): {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  duplicatedBlockId: string | null;
} {
  const duplicate = duplicateScreenBlockWithIdMap(document, blockId);
  const duplicatedBindings = bindings.flatMap((binding) => {
    const nextBlockId = duplicate.idMap.get(binding.blockId);
    if (!nextBlockId) return [];
    return [
      {
        ...binding,
        id: buildScreenFieldBindingId(nextBlockId, binding.propPath),
        blockId: nextBlockId,
      },
    ];
  });
  return {
    document: duplicate.document,
    bindings: [...bindings, ...duplicatedBindings],
    duplicatedBlockId: duplicate.duplicatedBlockId,
  };
}

export function removeScreenBindingsForBlock(bindings: ScreenFieldBinding[], blockId: string) {
  return bindings.filter((binding) => binding.blockId !== blockId);
}

export function removeScreenBindingsForBlockTree(
  bindings: ScreenFieldBinding[],
  block: ScreenBlockV1 | null
) {
  if (!block) return bindings;
  const removedIds = new Set(collectScreenBlockIds(block));
  return bindings.filter((binding) => !removedIds.has(binding.blockId));
}

export function reconcileScreenBindings(
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[]
): ScreenBindingReconcileResult {
  const liveIds = new Set(
    document.sections.flatMap((section) =>
      section.blocks.flatMap((block) => collectScreenBlockIds(block))
    )
  );
  const kept: ScreenFieldBinding[] = [];
  const removedBlockOrphans: string[] = [];
  for (const binding of bindings) {
    if (liveIds.has(binding.blockId)) kept.push(binding);
    else removedBlockOrphans.push(binding.field);
  }
  return { bindings: kept, removedBlockOrphans };
}
