import { assertContentSchema, type ContentSchema } from "../../content/validation";

type JsonRecord = Record<string, unknown>;

export type BlueprintSchemaMergeErrorCode =
  | "field_type_conflict"
  | "schema_merge_conflict"
  | "secret_default";

export class BlueprintSchemaMergeError extends Error {
  public readonly code: BlueprintSchemaMergeErrorCode;
  public readonly fieldName?: string;
  public readonly leftType?: string;
  public readonly rightType?: string;

  constructor(
    code: BlueprintSchemaMergeErrorCode,
    message: string,
    options?: {
      fieldName?: string;
      leftType?: string;
      rightType?: string;
    }
  ) {
    super(message);
    this.name = "BlueprintSchemaMergeError";
    this.code = code;
    this.fieldName = options?.fieldName;
    this.leftType = options?.leftType;
    this.rightType = options?.rightType;
  }
}

const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const clone = <T>(value: T): T => structuredClone(value);

const readOptionalText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readFieldType = (value: JsonRecord) =>
  readOptionalText(value.xFieldType) ?? readOptionalText(value.type);

const ensureSafeFieldDefault = (fieldName: string, definition: JsonRecord) => {
  if (!Object.hasOwn(definition, "default") || definition.default === undefined) return;
  if (
    secretLikePattern.test(fieldName) ||
    (typeof definition.default === "string" && secretLikePattern.test(definition.default))
  ) {
    throw new BlueprintSchemaMergeError(
      "secret_default",
      `Field "${fieldName}" cannot define a secret-like default value.`,
      { fieldName }
    );
  }
};

const mergeEnumValues = (left: unknown, right: unknown, fieldName: string) => {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    throw new BlueprintSchemaMergeError(
      "schema_merge_conflict",
      `Field "${fieldName}" has an invalid enum definition.`,
      { fieldName }
    );
  }

  const values = [...left, ...right];
  const merged: Array<string | number | boolean | null> = [];
  for (const value of values) {
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new BlueprintSchemaMergeError(
        "schema_merge_conflict",
        `Field "${fieldName}" uses an unsupported enum value.`,
        { fieldName }
      );
    }
    if (!merged.some((entry) => Object.is(entry, value))) {
      merged.push(value);
    }
  }
  return merged;
};

const mergeRequiredValues = (left: unknown, right: unknown, fieldName: string) => {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    throw new BlueprintSchemaMergeError(
      "schema_merge_conflict",
      `Field "${fieldName}" has an invalid nested required contract.`,
      { fieldName }
    );
  }

  const merged = new Set<string>();
  for (const value of [...left, ...right]) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BlueprintSchemaMergeError(
        "schema_merge_conflict",
        `Field "${fieldName}" has an invalid required entry.`,
        { fieldName }
      );
    }
    merged.add(value);
  }
  return [...merged];
};

const mergeUnknownValue = (
  left: unknown,
  right: unknown,
  fieldName: string,
  keyPath: string[]
): unknown => {
  if (left === undefined) return clone(right);
  if (right === undefined) return clone(left);

  const currentKey = keyPath[keyPath.length - 1] ?? "";
  if (currentKey === "title" || currentKey === "description") {
    return clone(left);
  }
  if (currentKey === "enum") {
    return mergeEnumValues(left, right, fieldName);
  }
  if (currentKey === "required") {
    return mergeRequiredValues(left, right, fieldName);
  }

  if (isRecord(left) && isRecord(right)) {
    return mergeRecordValue(left, right, fieldName, keyPath);
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (JSON.stringify(left) === JSON.stringify(right)) {
      return clone(left);
    }
    throw new BlueprintSchemaMergeError(
      "schema_merge_conflict",
      `Field "${fieldName}" has incompatible array config at "${keyPath.join(".")}".`,
      { fieldName }
    );
  }

  if (Object.is(left, right)) {
    return clone(left);
  }

  throw new BlueprintSchemaMergeError(
    "schema_merge_conflict",
    `Field "${fieldName}" has incompatible config at "${keyPath.join(".")}".`,
    { fieldName }
  );
};

const mergeRecordValue = (
  left: JsonRecord,
  right: JsonRecord,
  fieldName: string,
  keyPath: string[]
): JsonRecord => {
  const merged: JsonRecord = {};
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    merged[key] = mergeUnknownValue(left[key], right[key], fieldName, [...keyPath, key]);
  }
  return merged;
};

export const mergeBlueprintFieldDefinition = (
  fieldName: string,
  left: JsonRecord,
  right: JsonRecord
): JsonRecord => {
  ensureSafeFieldDefault(fieldName, left);
  ensureSafeFieldDefault(fieldName, right);

  const leftType = readFieldType(left);
  const rightType = readFieldType(right);
  if (leftType && rightType && leftType !== rightType) {
    throw new BlueprintSchemaMergeError(
      "field_type_conflict",
      `Conflicting field "${fieldName}" uses incompatible types (${leftType} vs ${rightType}).`,
      { fieldName, leftType, rightType }
    );
  }

  const merged = mergeRecordValue(left, right, fieldName, []);
  ensureSafeFieldDefault(fieldName, merged);
  return merged;
};

const createBaseSchema = (): ContentSchema => ({
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {},
});

const readProperties = (schema: ContentSchema) =>
  isRecord((schema as JsonRecord).properties)
    ? ((schema as JsonRecord).properties as JsonRecord)
    : {};

const readRequired = (schema: ContentSchema) => {
  const required = (schema as JsonRecord).required;
  if (!Array.isArray(required)) return [];
  return required.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
};

export const mergeBlueprintSchemas = (schemas: ContentSchema[]): ContentSchema => {
  const result = createBaseSchema() as JsonRecord;
  const mergedProperties = result.properties as JsonRecord;
  const mergedRequired = new Set<string>();

  for (const schema of schemas) {
    assertContentSchema(schema);

    for (const requiredField of readRequired(schema)) {
      mergedRequired.add(requiredField);
    }

    for (const [fieldName, definition] of Object.entries(readProperties(schema))) {
      if (!isRecord(definition)) {
        throw new BlueprintSchemaMergeError(
          "schema_merge_conflict",
          `Field "${fieldName}" must be a JSON schema object.`,
          { fieldName }
        );
      }
      ensureSafeFieldDefault(fieldName, definition);

      const previous = mergedProperties[fieldName];
      mergedProperties[fieldName] =
        previous && isRecord(previous)
          ? mergeBlueprintFieldDefinition(fieldName, previous, definition)
          : clone(definition);
    }
  }

  result.required = [...mergedRequired];
  assertContentSchema(result);
  return result;
};
