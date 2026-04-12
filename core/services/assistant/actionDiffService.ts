import { isDeepStrictEqual } from "node:util";

import type {
  AssistantActionFamilyContract,
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

const secretKeyPattern =
  /([A-Za-z0-9_-]*(?:token|secret|password|api[-_]?key|credential|cookie|session|csrf)[A-Za-z0-9_-]*\s*[:=]\s*)([^,\s;}]+)/gi;

export const redactAssistantPreviewText = (value: string) =>
  value.replace(secretKeyPattern, "$1[redacted]");

const normalizePreviewWarnings = (warnings: string[] | undefined) =>
  (warnings ?? []).map(redactAssistantPreviewText);

const normalizePreviewConflicts = (
  conflicts: AssistantActionPreviewChange["conflicts"] | undefined
): AssistantActionPreviewChange["conflicts"] =>
  (conflicts ?? []).map((conflict) => ({
    code: redactAssistantPreviewText(conflict.code),
    severity: conflict.severity,
    message: redactAssistantPreviewText(conflict.message),
  }));

const normalizePreviewDependencies = (
  dependencies: AssistantActionPreviewChange["dependencies"] | undefined
): AssistantActionPreviewChange["dependencies"] =>
  (dependencies ?? []).map((dependency) => ({
    actionId: dependency.actionId
      ? redactAssistantPreviewText(dependency.actionId)
      : null,
    targetType: redactAssistantPreviewText(dependency.targetType),
    targetKey: redactAssistantPreviewText(dependency.targetKey),
    optional: dependency.optional,
  }));

export const createPreviewChange = (input: {
  action: AssistantPlannedAction;
  targetType: string;
  targetKey: string;
  summary: string;
  warnings?: string[];
  conflicts?: AssistantActionPreviewChange["conflicts"];
  dependencies?: AssistantActionPreviewChange["dependencies"];
  beforeValue?: unknown;
  nextValue?: unknown;
  details?: AssistantActionPreviewChange["details"];
}): AssistantActionPreviewChange => ({
  actionId: input.action.id,
  type: input.action.type,
  targetType: input.targetType,
  targetKey: redactAssistantPreviewText(input.targetKey),
  operation: buildOperation(input.beforeValue, input.nextValue),
  summary: redactAssistantPreviewText(input.summary),
  warnings: normalizePreviewWarnings(input.warnings),
  conflicts: normalizePreviewConflicts(input.conflicts),
  dependencies: normalizePreviewDependencies(input.dependencies),
  details: input.details,
});

export const createContractOnlyActionPreviewMetadata = (
  contract: AssistantActionFamilyContract
) => ({
  warnings: [
    `${contract.type} is contract-only until preview and execute adapters land.`,
  ].map(redactAssistantPreviewText),
  conflicts: normalizePreviewConflicts([
    {
      code: "assistant_action_contract_only",
      severity: "error",
      message: `${contract.type} is documented but not executable yet.`,
    },
  ]),
  dependencies: normalizePreviewDependencies(
    contract.permissions.execute.map((permission) => ({
      actionId: null,
      targetType: "permission",
      targetKey: permission,
      optional: false,
    }))
  ),
});
