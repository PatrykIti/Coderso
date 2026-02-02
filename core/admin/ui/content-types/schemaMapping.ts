import type { ContentField, FieldType } from "./SchemaBuilder";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "boolean";
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean;
  xFieldType?: FieldType | string;
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
      }
      if (field.type === "relation" && field.relation?.target) {
        definition.xRelationTarget = field.relation.target;
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
    options: definition.enum,
    defaultValue: parseDefaultValue(definition.default),
    relation:
      definition.xFieldType === "relation" && definition.xRelationTarget
        ? { target: definition.xRelationTarget }
        : undefined,
  }));
}

export function countSchemaFields(schema?: ContentSchema | null) {
  if (!schema?.properties) return 0;
  return Object.keys(schema.properties).length;
}
