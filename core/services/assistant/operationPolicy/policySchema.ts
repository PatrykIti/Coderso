import {
  assistantPolicyCoverageStates,
  assistantPolicyMutationModes,
  type AssistantFollowUpPolicy,
  type AssistantOperationPolicy,
  type AssistantPolicyAction,
  type AssistantPolicyCoverage,
  type AssistantPolicyDestructive,
  type AssistantPolicyField,
  type AssistantPolicyFilter,
  type AssistantPolicySecrets,
  type AssistantResourcePolicy,
  type AssistantSafetyDefaults,
} from "./policyTypes";
import {
  cmsOperationFilterOperatorValues,
  cmsOperationValues,
} from "../cmsOperationDraftSchema";
import { isAssistantActionType } from "../actionRegistry";

type JsonRecord = Record<string, unknown>;

const policyKeys = new Set(["schemaVersion", "resources", "followUp", "safetyDefaults"]);
const resourceKeys = new Set([
  "kind",
  "label",
  "aliases",
  "routes",
  "operations",
  "readPermissions",
  "executePermissions",
  "filters",
  "fields",
  "actions",
  "destructive",
  "secrets",
  "coverage",
]);
const filterKeys = new Set(["field", "aliases", "operators", "values", "defaultValue"]);
const fieldKeys = new Set(["field", "aliases", "valueType", "enumValues", "action"]);
const fieldActionKeys = new Set(["type", "patchPath"]);
const actionKeys = new Set(["operation", "type", "target", "mode"]);
const destructiveKeys = new Set([
  "requireReview",
  "allowAllWhenFiltered",
  "allowAllUnfiltered",
  "requireExpectedCountForPartialMatch",
]);
const secretsKeys = new Set(["redacted", "secretFields", "providerAllowed"]);
const coverageKeys = new Set(["state", "task", "routes", "notes"]);
const followUpKeys = new Set(["pronouns", "countWords"]);
const safetyDefaultsKeys = new Set(["destructive"]);

const operationSet = new Set<string>(cmsOperationValues);
const filterOperatorSet = new Set<string>(cmsOperationFilterOperatorValues);
const coverageStateSet = new Set<string>(assistantPolicyCoverageStates);
const mutationModeSet = new Set<string>(assistantPolicyMutationModes);
const actionTargetSet = new Set(["single", "multiple", "active", "explicit", "none"]);
const fieldValueTypeSet = new Set(["string", "number", "boolean", "enum", "record"]);

const fail = (message = "assistant_operation_policy_invalid"): never => {
  throw new Error(message);
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : fail());

const assertKeys = (record: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail();
  }
};

const readText = (value: unknown): string => {
  if (typeof value !== "string") fail();
  const text = value as string;
  const trimmed = text.trim();
  if (!trimmed) fail();
  return trimmed;
};

const readOptionalText = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : readText(value);

const readBoolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") fail();
  return value as boolean;
};

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) fail();
  return (value as unknown[]).map(readText);
};

const readStringRecord = (value: unknown): Record<string, string[]> => {
  const record = readRecord(value);
  const result: Record<string, string[]> = {};
  for (const [key, nested] of Object.entries(record)) {
    result[readText(key)] = readStringArray(nested);
  }
  return result;
};

const readNumberRecord = (value: unknown): Record<string, number> => {
  const record = readRecord(value);
  const result: Record<string, number> = {};
  for (const [key, nested] of Object.entries(record)) {
    if (typeof nested !== "number" || !Number.isInteger(nested) || nested <= 0) fail();
    result[readText(key)] = nested as number;
  }
  return result;
};

const readStringArrayRecord = <T>(
  value: unknown,
  normalize: (nested: unknown) => T
): Record<string, T> => {
  const record = readRecord(value);
  const result: Record<string, T> = {};
  for (const [key, nested] of Object.entries(record)) {
    result[readText(key)] = normalize(nested);
  }
  return result;
};

const normalizeDestructive = (value: unknown): AssistantPolicyDestructive => {
  const record = readRecord(value);
  assertKeys(record, destructiveKeys);
  return {
    requireReview: readBoolean(record.requireReview),
    allowAllWhenFiltered: readBoolean(record.allowAllWhenFiltered),
    allowAllUnfiltered: readBoolean(record.allowAllUnfiltered),
    requireExpectedCountForPartialMatch: readBoolean(record.requireExpectedCountForPartialMatch),
  };
};

const normalizeFilter = (value: unknown): AssistantPolicyFilter => {
  const record = readRecord(value);
  assertKeys(record, filterKeys);
  const operators = readStringArray(record.operators);
  for (const operator of operators) {
    if (!filterOperatorSet.has(operator)) fail();
  }
  const defaultValue = record.defaultValue;
  if (
    defaultValue !== undefined &&
    typeof defaultValue !== "string" &&
    typeof defaultValue !== "boolean" &&
    !Array.isArray(defaultValue)
  ) {
    fail();
  }
  return {
    field: readText(record.field),
    aliases: readStringArray(record.aliases),
    operators: operators as AssistantPolicyFilter["operators"],
    ...(record.values !== undefined ? { values: readStringRecord(record.values) } : {}),
    ...(defaultValue !== undefined
      ? { defaultValue: defaultValue as string | boolean | string[] }
      : {}),
  };
};

const normalizeField = (value: unknown): AssistantPolicyField => {
  const record = readRecord(value);
  assertKeys(record, fieldKeys);
  const valueType = readText(record.valueType);
  if (!fieldValueTypeSet.has(valueType)) fail();
  let action: AssistantPolicyField["action"] | undefined;
  if (record.action !== undefined) {
    const actionRecord = readRecord(record.action);
    assertKeys(actionRecord, fieldActionKeys);
    const type = readText(actionRecord.type);
    if (!isAssistantActionType(type)) fail();
    action = {
      type,
      ...(actionRecord.patchPath !== undefined
        ? { patchPath: readStringArray(actionRecord.patchPath) }
        : {}),
    } as AssistantPolicyField["action"];
  }
  return {
    field: readText(record.field),
    aliases: readStringArray(record.aliases),
    valueType: valueType as AssistantPolicyField["valueType"],
    ...(record.enumValues !== undefined ? { enumValues: readStringArray(record.enumValues) } : {}),
    ...(action ? { action } : {}),
  };
};

const normalizeAction = (value: unknown): AssistantPolicyAction => {
  const record = readRecord(value);
  assertKeys(record, actionKeys);
  const operation = readText(record.operation);
  if (!operationSet.has(operation)) fail();
  const type = readText(record.type);
  if (type !== "none" && !isAssistantActionType(type)) fail();
  const target = readText(record.target);
  if (!actionTargetSet.has(target)) fail();
  const mode = readText(record.mode);
  if (!mutationModeSet.has(mode)) fail();
  return {
    operation: operation as AssistantPolicyAction["operation"],
    type: type as AssistantPolicyAction["type"],
    target: target as AssistantPolicyAction["target"],
    mode: mode as AssistantPolicyAction["mode"],
  };
};

const normalizeSecrets = (value: unknown): AssistantPolicySecrets => {
  const record = readRecord(value);
  assertKeys(record, secretsKeys);
  return {
    redacted: readBoolean(record.redacted),
    secretFields: readStringArray(record.secretFields),
    providerAllowed: readBoolean(record.providerAllowed),
  };
};

const normalizeCoverage = (value: unknown): AssistantPolicyCoverage => {
  const record = readRecord(value);
  assertKeys(record, coverageKeys);
  const state = readText(record.state);
  if (!coverageStateSet.has(state)) fail();
  return {
    state: state as AssistantPolicyCoverage["state"],
    task: readText(record.task),
    routes: readStringArray(record.routes),
    ...(record.notes !== undefined ? { notes: readOptionalText(record.notes) } : {}),
  };
};

const normalizeResource = (value: unknown): AssistantResourcePolicy => {
  const record = readRecord(value);
  assertKeys(record, resourceKeys);
  const operations = readStringArray(record.operations);
  for (const operation of operations) {
    if (!operationSet.has(operation)) fail();
  }
  return {
    kind: readText(record.kind),
    label: readText(record.label),
    aliases: readStringArray(record.aliases),
    routes: readStringArray(record.routes),
    operations: operations as AssistantResourcePolicy["operations"],
    readPermissions: readStringArray(record.readPermissions),
    executePermissions: readStringArray(record.executePermissions),
    filters: readStringArrayRecord(record.filters ?? {}, normalizeFilter),
    fields: readStringArrayRecord(record.fields ?? {}, normalizeField),
    actions: readStringArrayRecord(record.actions ?? {}, normalizeAction),
    ...(record.destructive !== undefined ? { destructive: normalizeDestructive(record.destructive) } : {}),
    ...(record.secrets !== undefined ? { secrets: normalizeSecrets(record.secrets) } : {}),
    coverage: normalizeCoverage(record.coverage),
  };
};

const normalizeFollowUp = (value: unknown): AssistantFollowUpPolicy => {
  const record = readRecord(value);
  assertKeys(record, followUpKeys);
  return {
    pronouns: readStringArray(record.pronouns),
    countWords: readNumberRecord(record.countWords),
  };
};

const normalizeSafetyDefaults = (value: unknown): AssistantSafetyDefaults => {
  const record = readRecord(value);
  assertKeys(record, safetyDefaultsKeys);
  return {
    destructive: normalizeDestructive(record.destructive),
  };
};

export const normalizeAssistantOperationPolicy = (
  value: unknown
): AssistantOperationPolicy => {
  const record = readRecord(value);
  assertKeys(record, policyKeys);
  if (record.schemaVersion !== 1) fail();
  return {
    schemaVersion: 1,
    resources: readStringArrayRecord(record.resources, normalizeResource),
    followUp: normalizeFollowUp(record.followUp),
    safetyDefaults: normalizeSafetyDefaults(record.safetyDefaults),
  };
};

export function assertAssistantOperationPolicy(
  value: unknown
): asserts value is AssistantOperationPolicy {
  normalizeAssistantOperationPolicy(value);
}
