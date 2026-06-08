import { assertContentSchema, type ContentSchema } from "./validation";

export const contentTypeFieldAddTypes = [
  "text",
  "richtext",
  "number",
  "boolean",
  "select",
  "media",
] as const;

export type ContentTypeFieldAddType = (typeof contentTypeFieldAddTypes)[number];

export type ContentTypeFieldAddSpec = {
  name: string;
  label?: string | null;
  type: ContentTypeFieldAddType;
  required?: boolean;
  multiple?: boolean;
  options?: Array<{ label: string; value: string }>;
  mediaAccept?: string[];
  maxItems?: number | null;
  numberFormat?: "integer" | "decimal";
};

type ContentSchemaProperty = Record<string, unknown>;

const contentTypeFieldAddTypeSet = new Set<string>(contentTypeFieldAddTypes);
const fieldNamePattern = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const secretLikePattern =
  /\b[\w.-]*(?:token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer)[\w.-]*\b/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizePositiveInteger = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;

export const normalizeContentTypeFieldAddType = (value: unknown): ContentTypeFieldAddType => {
  const normalized = normalizeText(value);
  if (!normalized || !contentTypeFieldAddTypeSet.has(normalized)) {
    throw new Error("content_type_field_type_invalid");
  }
  return normalized as ContentTypeFieldAddType;
};

export const normalizeContentTypeFieldName = (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) throw new Error("content_type_field_name_required");
  if (!fieldNamePattern.test(normalized)) throw new Error("content_type_field_name_invalid");
  if (secretLikePattern.test(normalized)) throw new Error("content_type_field_name_secret_like");
  return normalized;
};

const normalizeSelectOptions = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const options = value.flatMap((entry): Array<{ label: string; value: string }> => {
    const option = typeof entry === "string" ? { label: entry, value: entry } : entry;
    if (!isRecord(option)) return [];
    const label = normalizeText(option.label);
    const rawValue = normalizeText(option.value);
    if (!label || !rawValue || seen.has(rawValue)) return [];
    seen.add(rawValue);
    return [{ label, value: rawValue }];
  });
  return options.length ? options : undefined;
};

const normalizeMediaAccept = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const accept = value
    .map(normalizeText)
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry) => !secretLikePattern.test(entry));
  return accept.length ? [...new Set(accept)] : undefined;
};

export const normalizeContentTypeFieldAddSpec = (input: unknown): ContentTypeFieldAddSpec => {
  if (!isRecord(input)) throw new Error("content_type_field_invalid");
  const name = normalizeContentTypeFieldName(input.name);
  const type = normalizeContentTypeFieldAddType(input.type);
  const label = normalizeText(input.label);
  const multiple = input.multiple === true;
  if (input.required === true) {
    throw new Error("content_type_field_required_additive_unsupported");
  }
  if (type === "select" && multiple && !normalizeSelectOptions(input.options)?.length) {
    throw new Error("content_type_field_select_options_required");
  }
  return {
    name,
    ...(label ? { label } : {}),
    type,
    ...(multiple ? { multiple } : {}),
    ...(input.options !== undefined
      ? { options: normalizeSelectOptions(input.options) ?? [] }
      : {}),
    ...(input.mediaAccept !== undefined
      ? { mediaAccept: normalizeMediaAccept(input.mediaAccept) ?? [] }
      : {}),
    ...(input.maxItems !== undefined
      ? { maxItems: normalizePositiveInteger(input.maxItems) ?? null }
      : {}),
    ...(input.numberFormat === "integer" || input.numberFormat === "decimal"
      ? { numberFormat: input.numberFormat }
      : {}),
  };
};

export const buildContentTypeFieldSchema = (
  spec: ContentTypeFieldAddSpec
): ContentSchemaProperty => {
  const field: ContentSchemaProperty = {
    xFieldType: spec.type,
  };
  const config: Record<string, unknown> = {};
  if (spec.label) field.title = spec.label;

  if (spec.type === "text" || spec.type === "richtext") {
    field.type = "string";
  }
  if (spec.type === "number") {
    field.type = spec.numberFormat === "integer" ? "integer" : "number";
    if (spec.numberFormat) config.number = { format: spec.numberFormat };
  }
  if (spec.type === "boolean") {
    field.type = "boolean";
  }
  if (spec.type === "select") {
    const options = spec.options ?? [];
    const values = options.map((option) => option.value);
    if (spec.multiple) {
      field.type = "array";
      field.items = values.length ? { type: "string", enum: values } : { type: "string" };
    } else {
      field.type = "string";
      if (values.length) field.enum = values;
    }
    if (options.length) {
      config.select = {
        options,
        ...(spec.multiple ? { multiple: true } : {}),
      };
    }
  }
  if (spec.type === "media") {
    const mediaConfig = {
      ...(spec.multiple ? { multiple: true } : {}),
      ...(spec.mediaAccept?.length ? { accept: spec.mediaAccept } : {}),
      ...(typeof spec.maxItems === "number" ? { maxItems: spec.maxItems } : {}),
    };
    if (spec.multiple) {
      field.type = "array";
      field.items = { type: "string" };
      if (typeof spec.maxItems === "number") field.maxItems = spec.maxItems;
    } else {
      field.type = "string";
    }
    if (Object.keys(mediaConfig).length > 0) config.media = mediaConfig;
  }
  if (Object.keys(config).length > 0) field.xFieldConfig = config;
  return field;
};

export const mergeContentTypeSchemaFields = (
  schema: ContentSchema,
  rawFields: ContentTypeFieldAddSpec[]
): ContentSchema => {
  assertContentSchema(schema);
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const nextProperties: Record<string, unknown> = { ...properties };
  const required = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === "string")
    : [];
  const nextRequired = new Set(required);
  const seen = new Set<string>();

  for (const rawField of rawFields) {
    const field = normalizeContentTypeFieldAddSpec(rawField);
    if (seen.has(field.name)) throw new Error("content_type_field_duplicate");
    seen.add(field.name);
    if (Object.prototype.hasOwnProperty.call(nextProperties, field.name)) {
      throw new Error("content_type_field_conflict");
    }
    nextProperties[field.name] = buildContentTypeFieldSchema(field);
    if (field.required) nextRequired.add(field.name);
  }

  const nextSchema: ContentSchema = {
    ...schema,
    type: "object",
    additionalProperties: false,
    properties: nextProperties,
    ...(nextRequired.size ? { required: [...nextRequired] } : {}),
  };
  assertContentSchema(nextSchema);
  return nextSchema;
};
