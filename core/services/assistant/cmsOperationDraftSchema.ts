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
  "page",
  "entry",
  "content-type",
  "custom-screen",
  "widget-template",
  "listing-query",
  "listing-template",
  "form",
  "menu-item",
  "seo-document",
  "media",
  "settings-surface",
  "solution-kit",
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
  targetQuery?: CmsOperationTargetQuery;
  mutation?: CmsOperationMutation;
  constraints?: CmsOperationConstraints;
};

type JsonRecord = Record<string, unknown>;

const operationSet = new Set<string>(cmsOperationValues);
const resourceKindSet = new Set<string>(cmsResourceKindValues);
const targetQueryKeys = new Set(["text", "exactName", "prefix", "slug", "route", "active"]);
const mutationKeys = new Set(["fieldIntent", "value", "patch"]);
const constraintsKeys = new Set(["expectedCount", "destructive", "requiresConfirmation"]);
const draftKeys = new Set(["operation", "resourceKind", "targetQuery", "mutation", "constraints"]);
const secretKeyPattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

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

const normalizeMutation = (value: unknown): CmsOperationMutation | undefined => {
  if (value === undefined || value === null) return undefined;
  const input = assertRecord(value);
  assertKeys(input, mutationKeys);
  return {
    ...(input.fieldIntent !== undefined ? { fieldIntent: readOptionalText(input.fieldIntent) } : {}),
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
    ...(input.targetQuery !== undefined
      ? { targetQuery: normalizeTargetQuery(input.targetQuery) }
      : {}),
    ...(input.mutation !== undefined ? { mutation: normalizeMutation(input.mutation) } : {}),
    ...(input.constraints !== undefined
      ? { constraints: normalizeConstraints(input.constraints) }
      : {}),
  };
};

export const isCmsOperationDraft = (value: unknown): value is CmsOperationDraft => {
  try {
    normalizeCmsOperationDraft(value);
    return true;
  } catch {
    return false;
  }
};

const containsSecretLikeKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsSecretLikeKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => {
    if (secretKeyPattern.test(key)) return true;
    return containsSecretLikeKey(nested);
  });
};

const pickRecord = (value: unknown, allowed: Set<string>) => {
  if (!isRecord(value)) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (allowed.has(key)) result[key] = nested;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const repairCmsOperationDraft = (value: unknown): CmsOperationDraft | null => {
  if (!isRecord(value) || containsSecretLikeKey(value)) return null;
  const targetQuery = pickRecord(value.targetQuery ?? value["optional targetQuery"], targetQueryKeys);
  const mutation = pickRecord(value.mutation ?? value["optional mutation"], mutationKeys);
  const constraints = pickRecord(value.constraints ?? value["optional constraints"], constraintsKeys);
  try {
    return normalizeCmsOperationDraft({
      operation: value.operation,
      resourceKind: value.resourceKind,
      ...(targetQuery ? { targetQuery } : {}),
      ...(mutation ? { mutation } : {}),
      ...(constraints ? { constraints } : {}),
    });
  } catch {
    return null;
  }
};

export const buildCmsOperationDraftJsonSchema = (): Record<string, unknown> => ({
  type: "object",
  additionalProperties: false,
  required: ["operation", "resourceKind", "targetQuery", "mutation", "constraints"],
  properties: {
    operation: {
      type: "string",
      enum: cmsOperationValues,
    },
    resourceKind: {
      type: "string",
      enum: cmsResourceKindValues,
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
});
