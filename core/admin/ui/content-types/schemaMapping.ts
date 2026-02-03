import type { ContentField, FieldType } from "./SchemaBuilder";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "boolean";
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean;
  xFieldType?: FieldType | string;
  xFieldConfig?: Record<string, unknown>;
  xRelationTarget?: string;
};

export type ContentSchema = {
  type: "object";
  additionalProperties: false;
  required?: string[];
  properties: Record<string, ContentSchemaProperty>;
};

const fieldTypeMap: Record<FieldType, "string" | "number" | "boolean"> = {
  text: "string",
  richtext: "string",
  number: "number",
  boolean: "boolean",
  select: "string",
  media: "string",
  relation: "string",
};

const normalizeDefaultValue = (field: ContentField) => {
  if (field.defaultValue === undefined || field.defaultValue === "") return undefined;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (field.type === "boolean") {
    return field.defaultValue === "true";
  }
  return field.defaultValue;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRelationTarget = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const relation = value.relation;
  if (!isRecord(relation)) return undefined;
  const target = relation.target;
  if (typeof target !== "string") return undefined;
  const trimmed = target.trim();
  return trimmed ? trimmed : undefined;
};

const readSelectOptions = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const select = value.select;
  if (!isRecord(select)) return undefined;
  const options = select.options;
  if (!Array.isArray(options)) return undefined;
  const normalized = options
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return normalized.length ? normalized : undefined;
};

export function buildSchemaFromFields(fields: ContentField[]): ContentSchema {
  const required = fields
    .filter((field) => field.required)
    .map((field) => field.name);

  const properties = fields.reduce<Record<string, ContentSchemaProperty>>(
    (acc, field) => {
      const definition: ContentSchemaProperty = {
        type: fieldTypeMap[field.type],
        xFieldType: field.type,
      };

      if (field.label) definition.title = field.label;
      if (field.help) definition.description = field.help;
      if (field.type === "select" && field.options?.length) {
        definition.enum = field.options;
        definition.xFieldConfig = {
          select: { options: field.options },
        };
      }
      if (field.type === "relation" && field.relation?.target) {
        definition.xRelationTarget = field.relation.target;
        definition.xFieldConfig = {
          relation: { target: field.relation.target },
        };
      }

      const defaultValue = normalizeDefaultValue(field);
      if (defaultValue !== undefined) definition.default = defaultValue;

      acc[field.name] = definition;
      return acc;
    },
    {}
  );

  return {
    type: "object",
    additionalProperties: false,
    ...(required.length ? { required } : {}),
    properties,
  };
}

const parseDefaultValue = (value: unknown) => {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return undefined;
};

const resolveFieldType = (definition: ContentSchemaProperty): FieldType => {
  if (definition.xFieldType) {
    const candidate = String(definition.xFieldType) as FieldType;
    if (candidate in fieldTypeMap) return candidate;
  }
  const relationTarget =
    definition.xRelationTarget ?? readRelationTarget(definition.xFieldConfig);
  if (relationTarget) return "relation";
  const selectOptions = readSelectOptions(definition.xFieldConfig);
  if (selectOptions?.length) return "select";
  if (definition.enum && definition.enum.length > 0) return "select";
  if (definition.type === "number") return "number";
  if (definition.type === "boolean") return "boolean";
  return "text";
};

export function fieldsFromSchema(schema: ContentSchema): ContentField[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, definition]) => ({
    id: `field-${name}`,
    name,
    type: resolveFieldType(definition),
    label: definition.title ?? name,
    help: definition.description,
    required: required.has(name),
    options: definition.enum ?? readSelectOptions(definition.xFieldConfig),
    defaultValue: parseDefaultValue(definition.default),
    relation:
      (definition.xFieldType === "relation" || definition.xRelationTarget) &&
      (definition.xRelationTarget ??
        readRelationTarget(definition.xFieldConfig))
        ? {
            target:
              definition.xRelationTarget ??
              (readRelationTarget(definition.xFieldConfig) as string),
          }
        : undefined,
  }));
}

export function countSchemaFields(schema?: ContentSchema | null) {
  if (!schema?.properties) return 0;
  return Object.keys(schema.properties).length;
}
