import type {
  CmsOperation,
  CmsOperationFilterField,
  CmsOperationFilterOperator,
  CmsResourceKind,
} from "../cmsOperationDraftSchema";
import type { AssistantPlannedAction } from "../actionPlanTypes";

export const assistantPolicyCoverageStates = [
  "live-execute",
  "live-read-only",
  "live-gated",
  "legacy-maintenance",
  "not-applicable",
] as const;

export type AssistantPolicyCoverageState = (typeof assistantPolicyCoverageStates)[number];

export const assistantPolicyMutationModes = [
  "executable",
  "read-only",
  "gated",
  "not-applicable",
] as const;

export type AssistantPolicyMutationMode = (typeof assistantPolicyMutationModes)[number];

export type AssistantPolicyFilterValueMap = Record<string, string[]>;

export type AssistantPolicyFilter = {
  field: CmsOperationFilterField | string;
  aliases: string[];
  operators: CmsOperationFilterOperator[];
  values?: AssistantPolicyFilterValueMap;
  defaultValue?: string | boolean | string[];
};

export type AssistantPolicyField = {
  field: string;
  aliases: string[];
  valueType: "string" | "number" | "boolean" | "enum" | "record";
  enumValues?: string[];
  action?: {
    type: AssistantPlannedAction["type"];
    patchPath?: string[];
  };
};

export type AssistantPolicyAction = {
  operation: CmsOperation | string;
  type: AssistantPlannedAction["type"] | "none";
  target: "single" | "multiple" | "active" | "explicit" | "none";
  mode: AssistantPolicyMutationMode;
};

export type AssistantPolicyDestructive = {
  requireReview: boolean;
  allowAllWhenFiltered: boolean;
  allowAllUnfiltered: boolean;
  requireExpectedCountForPartialMatch: boolean;
};

export type AssistantPolicySecrets = {
  redacted: boolean;
  secretFields: string[];
  providerAllowed: boolean;
};

export type AssistantPolicyCoverage = {
  state: AssistantPolicyCoverageState;
  task: string;
  routes: string[];
  notes?: string;
};

export type AssistantResourcePolicy = {
  kind: CmsResourceKind | string;
  label: string;
  aliases: string[];
  routes: string[];
  operations: CmsOperation[];
  readPermissions: string[];
  executePermissions: string[];
  filters: Record<string, AssistantPolicyFilter>;
  fields: Record<string, AssistantPolicyField>;
  actions: Record<string, AssistantPolicyAction>;
  destructive?: AssistantPolicyDestructive;
  secrets?: AssistantPolicySecrets;
  coverage: AssistantPolicyCoverage;
};

export type AssistantFollowUpPolicy = {
  pronouns: string[];
  countWords: Record<string, number>;
};

export type AssistantSafetyDefaults = {
  destructive: AssistantPolicyDestructive;
};

export type AssistantOperationPolicy = {
  schemaVersion: 1;
  resources: Record<string, AssistantResourcePolicy>;
  followUp: AssistantFollowUpPolicy;
  safetyDefaults: AssistantSafetyDefaults;
};
