import type { AssistantOperationPolicy } from "./operationPolicy/policyTypes";

export const cmsOperationValues = [
  "inspect",
  "find",
  "create",
  "update",
  "delete",
  "archive",
  "publish",
  "configure",
  "refine",
] as const;

export type CmsOperation = (typeof cmsOperationValues)[number];

export const cmsResourceKindValues = [
  "access-log",
  "admin-search",
  "analytics",
  "appointments",
  "audit-log",
  "backup",
  "booking",
  "advanced-filters",
  "advanced-search",
  "commerce",
  "page",
  "detail-page",
  "entry",
  "content-type",
  "custom-screen",
  "widget-template",
  "listing-query",
  "listing-template",
  "form",
  "menu",
  "menu-item",
  "seo-document",
  "media",
  "dashboard",
  "i18n",
  "import-export",
  "mega-menu",
  "plugin-store",
  "popup",
  "portal",
  "post",
  "redirect",
  "reviews",
  "role",
  "settings-surface",
  "solution-kit",
  "theme",
  "user",
] as const;

export type CmsResourceKind = (typeof cmsResourceKindValues)[number];

export type CmsOperationTargetQuery = {
  text?: string;
  exactName?: string;
  prefix?: string;
  slug?: string;
  route?: string;
  active?: boolean;
};

export const cmsOperationFilterFieldValues = ["status", "visibility", "showInSidebar"] as const;

export type CmsOperationFilterField = (typeof cmsOperationFilterFieldValues)[number];

export const cmsOperationFilterOperatorValues = ["eq", "in"] as const;

export type CmsOperationFilterOperator = (typeof cmsOperationFilterOperatorValues)[number];

export type CmsOperationFilter = {
  field: CmsOperationFilterField;
  operator: CmsOperationFilterOperator;
  value: string | boolean | string[];
};

export type CmsOperationMutation = {
  fieldIntent?: string;
  value?: string | number | boolean | null;
  patch?: Record<string, unknown>;
};

export type CmsOperationConstraints = {
  expectedCount?: number;
  destructive?: boolean;
  requiresConfirmation?: boolean;
};

export type CmsOperationDraft = {
  operation: CmsOperation;
  resourceKind: CmsResourceKind;
  resourceKey?: string;
  surfaceHint?: string;
  filters?: CmsOperationFilter[];
  targetQuery?: CmsOperationTargetQuery;
  mutation?: CmsOperationMutation;
  constraints?: CmsOperationConstraints;
};

type JsonRecord = Record<string, unknown>;

const operationSet = new Set<string>(cmsOperationValues);
const resourceKindSet = new Set<string>(cmsResourceKindValues);
const filterFieldSet = new Set<string>(cmsOperationFilterFieldValues);
const filterOperatorSet = new Set<string>(cmsOperationFilterOperatorValues);
const targetQueryKeys = new Set(["text", "exactName", "prefix", "slug", "route", "active"]);
const filterKeys = new Set(["field", "operator", "value"]);
const mutationKeys = new Set(["fieldIntent", "value", "patch"]);
const constraintsKeys = new Set(["expectedCount", "destructive", "requiresConfirmation"]);
const draftKeys = new Set([
  "operation",
  "resourceKind",
  "resourceKey",
  "surfaceHint",
  "filters",
  "targetQuery",
  "mutation",
  "constraints",
]);
const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fail = (): never => {
  throw new Error("cms_operation_draft_invalid");
};

const assertRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : fail());

const assertKeys = (value: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail();
  }
};

const readText = (value: unknown): string => {
  if (typeof value !== "string") fail();
  const trimmed = (value as string).trim();
  if (!trimmed) fail();
  return trimmed;
};

const readOptionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return readText(value);
};

const readOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") fail();
  return value as boolean;
};

const readOptionalPositiveInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) fail();
  return value as number;
};

const readMutationValue = (value: unknown) => {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value as string | number | boolean | null | undefined;
  }
  fail();
};

const readFilterValue = (value: unknown): string | boolean | string[] => {
  if (typeof value === "string") return readText(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(readText);
  return fail();
};

const readOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) return undefined;
  return assertRecord(value);
};

const normalizeTargetQuery = (value: unknown): CmsOperationTargetQuery | undefined => {
  if (value === undefined || value === null) return undefined;
  const input = assertRecord(value);
  assertKeys(input, targetQueryKeys);
  const result: CmsOperationTargetQuery = {};
  if (input.text !== undefined) result.text = readOptionalText(input.text);
  if (input.exactName !== undefined) result.exactName = readOptionalText(input.exactName);
  if (input.prefix !== undefined) result.prefix = readOptionalText(input.prefix);
  if (input.slug !== undefined) result.slug = readOptionalText(input.slug);
  if (input.route !== undefined) result.route = readOptionalText(input.route);
  if (input.active !== undefined) result.active = readOptionalBoolean(input.active);
  return result;
};

const normalizeFilter = (value: unknown): CmsOperationFilter => {
  const input = assertRecord(value);
  assertKeys(input, filterKeys);
  const field = readText(input.field);
  const operator = readText(input.operator);
  if (!filterFieldSet.has(field) || !filterOperatorSet.has(operator)) fail();
  const normalizedValue = readFilterValue(input.value);
  if (operator === "eq" && Array.isArray(normalizedValue)) fail();
  if (operator === "in" && !Array.isArray(normalizedValue)) fail();
  return {
    field: field as CmsOperationFilterField,
    operator: operator as CmsOperationFilterOperator,
    value: normalizedValue,
  };
};

const normalizeFilters = (value: unknown): CmsOperationFilter[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail();
  return (value as unknown[]).map(normalizeFilter);
};

const normalizeMutation = (value: unknown): CmsOperationMutation | undefined => {
  if (value === undefined || value === null) return undefined;
  const input = assertRecord(value);
  assertKeys(input, mutationKeys);
  return {
    ...(input.fieldIntent !== undefined
      ? { fieldIntent: readOptionalText(input.fieldIntent) }
      : {}),
    ...(input.value !== undefined ? { value: readMutationValue(input.value) } : {}),
    ...(input.patch !== undefined ? { patch: readOptionalRecord(input.patch) } : {}),
  };
};

const normalizeConstraints = (value: unknown): CmsOperationConstraints | undefined => {
  if (value === undefined || value === null) return undefined;
  const input = assertRecord(value);
  assertKeys(input, constraintsKeys);
  const result: CmsOperationConstraints = {};
  if (input.expectedCount !== undefined) {
    result.expectedCount = readOptionalPositiveInteger(input.expectedCount);
  }
  if (input.destructive !== undefined) result.destructive = readOptionalBoolean(input.destructive);
  if (input.requiresConfirmation !== undefined) {
    result.requiresConfirmation = readOptionalBoolean(input.requiresConfirmation);
  }
  return result;
};

export const normalizeCmsOperationDraft = (value: unknown): CmsOperationDraft => {
  const input = assertRecord(value);
  assertKeys(input, draftKeys);
  const operation = readText(input.operation);
  const resourceKind = readText(input.resourceKind);
  if (!operationSet.has(operation) || !resourceKindSet.has(resourceKind)) fail();

  return {
    operation: operation as CmsOperation,
    resourceKind: resourceKind as CmsResourceKind,
    ...(input.resourceKey !== undefined
      ? { resourceKey: readOptionalText(input.resourceKey) }
      : {}),
    ...(input.surfaceHint !== undefined
      ? { surfaceHint: readOptionalText(input.surfaceHint) }
      : {}),
    ...(input.filters !== undefined ? { filters: normalizeFilters(input.filters) } : {}),
    ...(input.targetQuery !== undefined
      ? { targetQuery: normalizeTargetQuery(input.targetQuery) }
      : {}),
    ...(input.mutation !== undefined ? { mutation: normalizeMutation(input.mutation) } : {}),
    ...(input.constraints !== undefined
      ? { constraints: normalizeConstraints(input.constraints) }
      : {}),
  };
};

export const normalizeCmsOperationDraftWithPolicy = (
  value: unknown,
  policy: AssistantOperationPolicy
): CmsOperationDraft => {
  const draft = normalizeCmsOperationDraft(value);
  const resourceEntries = Object.entries(policy.resources).filter(
    ([, resource]) =>
      resource.coverage.state !== "not-applicable" && resource.kind === draft.resourceKind
  );
  const resolvedKey =
    draft.resourceKey ?? (resourceEntries.length === 1 ? resourceEntries[0]?.[0] : undefined);
  if (!resolvedKey) fail();
  const resourceKey = resolvedKey as string;
  const resource = policy.resources[resourceKey];
  if (!resource || resource.coverage.state === "not-applicable") fail();
  if (resource.kind !== draft.resourceKind) fail();
  return { ...draft, resourceKey };
};

export const isCmsOperationDraft = (value: unknown): value is CmsOperationDraft => {
  try {
    normalizeCmsOperationDraft(value);
    return true;
  } catch {
    return false;
  }
};

const policyEnum = <T extends string>(
  policy: AssistantOperationPolicy | undefined,
  allowedValues: readonly T[],
  selectValues: (resource: AssistantOperationPolicy["resources"][string]) => string[]
): T[] => {
  if (!policy) return [...allowedValues];
  const allowed = new Set<string>(allowedValues);
  const selected = new Set<string>();
  for (const resource of Object.values(policy.resources)) {
    if (resource.coverage.state === "not-applicable") continue;
    for (const value of selectValues(resource)) {
      if (allowed.has(value)) selected.add(value);
    }
  }
  const result = allowedValues.filter((value) => selected.has(value));
  return result.length > 0 ? result : [...allowedValues];
};

export const buildCmsOperationDraftJsonSchema = (
  policy?: AssistantOperationPolicy
): Record<string, unknown> => {
  const operationEnum = policyEnum(policy, cmsOperationValues, (resource) => resource.operations);
  const resourceKindEnum = policyEnum(policy, cmsResourceKindValues, (resource) => [resource.kind]);
  const resourceKeyEnum = policy
    ? Object.entries(policy.resources)
        .filter(([, resource]) => resource.coverage.state !== "not-applicable")
        .map(([key]) => key)
        .sort()
    : [];
  const filterFieldEnum = policyEnum(policy, cmsOperationFilterFieldValues, (resource) =>
    Object.values(resource.filters).map((filter) => filter.field)
  );

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "operation",
      "resourceKind",
      "resourceKey",
      "surfaceHint",
      "filters",
      "targetQuery",
      "mutation",
      "constraints",
    ],
    properties: {
      operation: {
        type: "string",
        enum: operationEnum,
      },
      resourceKind: {
        type: "string",
        enum: resourceKindEnum,
      },
      resourceKey:
        resourceKeyEnum.length > 0 ? { type: "string", enum: resourceKeyEnum } : { type: "string" },
      surfaceHint: { type: ["string", "null"] },
      filters: {
        anyOf: [
          {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["field", "operator", "value"],
              properties: {
                field: {
                  type: "string",
                  enum: filterFieldEnum,
                },
                operator: {
                  type: "string",
                  enum: cmsOperationFilterOperatorValues,
                },
                value: {
                  anyOf: [
                    { type: "string" },
                    { type: "boolean" },
                    {
                      type: "array",
                      items: { type: "string" },
                    },
                  ],
                },
              },
            },
          },
          { type: "null" },
        ],
      },
      targetQuery: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["text", "exactName", "prefix", "slug", "route", "active"],
            properties: {
              text: { type: ["string", "null"] },
              exactName: { type: ["string", "null"] },
              prefix: { type: ["string", "null"] },
              slug: { type: ["string", "null"] },
              route: { type: ["string", "null"] },
              active: { type: ["boolean", "null"] },
            },
          },
          { type: "null" },
        ],
      },
      mutation: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["fieldIntent", "value", "patch"],
            properties: {
              fieldIntent: { type: ["string", "null"] },
              value: {
                anyOf: [
                  { type: "string" },
                  { type: "number" },
                  { type: "boolean" },
                  { type: "null" },
                ],
              },
              patch: {
                anyOf: [
                  {
                    type: "object",
                    additionalProperties: false,
                    properties: {},
                    required: [],
                  },
                  { type: "null" },
                ],
              },
            },
          },
          { type: "null" },
        ],
      },
      constraints: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["expectedCount", "destructive", "requiresConfirmation"],
            properties: {
              expectedCount: {
                type: ["integer", "null"],
                minimum: 1,
              },
              destructive: { type: ["boolean", "null"] },
              requiresConfirmation: { type: ["boolean", "null"] },
            },
          },
          { type: "null" },
        ],
      },
    },
  };
};
