import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlocks } from "../../widgets/validator";
import type { WidgetBlock } from "../../widgets/types";

export type PageWidgetData = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function toWidgetBlocks(value: unknown): WidgetBlock[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every(isRecord)) {
    throw new Error("widget_schema_invalid: blocks_must_be_objects");
  }
  return value as WidgetBlock[];
}

export function normalizePageWidgetData(data: PageWidgetData): PageWidgetData {
  const blocks = toWidgetBlocks(data.blocks);
  if (!blocks) return data;

  ensureRuntimeWidgetsRegistered();
  return {
    ...data,
    blocks: normalizeWidgetBlocks(blocks),
  };
}
