import type { LegacyWidgetBlock } from "../renderContracts/legacyWidgetBlock";

export function normalizeWidgetTemplateBlocksForRead(
  blocks?: LegacyWidgetBlock[] | null
): LegacyWidgetBlock[] {
  return Array.isArray(blocks) ? blocks : [];
}
