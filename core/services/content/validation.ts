import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

const ajv = new Ajv({ allErrors: true, strict: true });
const validatorCache = new Map<string, ValidateFunction>();

export type ContentSchema = Record<string, unknown>;

export class ContentValidationError extends Error {
  public readonly details?: ErrorObject[];

  constructor(message: string, details?: ErrorObject[]) {
    super(message);
    this.name = "ContentValidationError";
    this.details = details;
  }
}

export function assertContentSchema(schema: unknown): asserts schema is ContentSchema {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new ContentValidationError("schema_invalid");
  }

  const typed = schema as Record<string, unknown>;
  if (typed.type !== "object") {
    throw new ContentValidationError("schema_type_must_be_object");
  }

  if (typed.additionalProperties !== false) {
    throw new ContentValidationError("schema_additional_properties_required");
  }

  if (typed.properties && typeof typed.properties !== "object") {
    throw new ContentValidationError("schema_properties_invalid");
  }

  try {
    ajv.compile(typed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "schema_compile_failed";
    throw new ContentValidationError(message);
  }
}

export function invalidateValidator(typeId: string) {
  validatorCache.delete(typeId);
}

export function getEntryValidator(typeId: string, schema: ContentSchema) {
  const cached = validatorCache.get(typeId);
  if (cached) return cached;

  const validator = ajv.compile(schema);
  validatorCache.set(typeId, validator);
  return validator;
}

export function validateEntryData(
  typeId: string,
  schema: ContentSchema,
  data: unknown
) {
  const validator = getEntryValidator(typeId, schema);

  if (!validator(data)) {
    throw new ContentValidationError("entry_validation_failed", validator.errors ?? []);
  }
}
