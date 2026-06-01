import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import type { WidgetBlock } from "../../widgets/types";
import { normalizeWidgetBlocks } from "../../widgets/validator";

export function normalizeWidgetTemplateBlocksForRead(blocks?: WidgetBlock[] | null): WidgetBlock[] {
  return Array.isArray(blocks) ? blocks : [];
}

export function normalizeWidgetTemplateBlocksForWrite(
  blocks?: WidgetBlock[] | null
): WidgetBlock[] {
  if (!Array.isArray(blocks)) return [];
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlocks(blocks);
}
