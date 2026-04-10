import { isDeepStrictEqual } from "node:util";

import type {
  AssistantActionOperation,
  AssistantActionPreviewChange,
  AssistantPlannedAction,
} from "./actionPlanTypes";

const buildOperation = (
  beforeValue: unknown,
  nextValue: unknown
): AssistantActionOperation => {
  if (beforeValue === null || beforeValue === undefined) return "create";
  if (isDeepStrictEqual(beforeValue, nextValue)) return "noop";
  return "update";
};

export const createPreviewChange = (input: {
  action: AssistantPlannedAction;
  targetType: string;
  targetKey: string;
  summary: string;
  warnings?: string[];
  beforeValue?: unknown;
  nextValue?: unknown;
}): AssistantActionPreviewChange => ({
  actionId: input.action.id,
  type: input.action.type,
  targetType: input.targetType,
  targetKey: input.targetKey,
  operation: buildOperation(input.beforeValue, input.nextValue),
  summary: input.summary,
  warnings: [...(input.warnings ?? [])],
});
