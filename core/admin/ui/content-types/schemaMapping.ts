import type { ContentField, FieldType } from "./SchemaBuilder";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "boolean" | "array";
  items?: { type?: "string" };
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean | string[];
  maxItems?: number;
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

const readRelationMultiple = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const relation = value.relation;
  if (!isRecord(relation)) return undefined;
  const multiple = relation.multiple;
  if (typeof multiple !== "boolean") return undefined;
  return multiple;
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

const readMediaConfig = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const media = isRecord(value.media) ? value.media : value;
  if (!isRecord(media)) return undefined;
  const multiple = media.multiple === true;
  const accept = Array.isArray(media.accept)
    ? media.accept
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;
  const maxItems =
    typeof media.maxItems === "number" && Number.isFinite(media.maxItems)
      ? media.maxItems
      : undefined;
  return {
    multiple,
    accept: accept?.length ? accept : undefined,
    maxItems,
  };
};

const readLayoutConfig = (
  value: unknown
): ContentField["layout"] | undefined => {
  if (!isRecord(value)) return undefined;
  const layout = isRecord(value.layout) ? value.layout : undefined;
  if (!layout) return undefined;
  const tab = typeof layout.tab === "string" ? layout.tab.trim() : undefined;
  const section =
    typeof layout.section === "string" ? layout.section.trim() : undefined;
  const width =
    layout.width === "full" || layout.width === "half"
      ? layout.width
      : undefined;
  const display =
    layout.display === "default" || layout.display === "compact"
      ? layout.display
      : undefined;
  if (!tab && !section && !width && !display) return undefined;
  return {
    ...(tab ? { tab } : {}),
    ...(section ? { section } : {}),
    ...(width ? { width } : {}),
    ...(display ? { display } : {}),
  };
};

export function buildSchemaFromFields(fields: ContentField[]): ContentSchema {
  const required = fields
    .filter((field) => field.required)
    .map((field) => field.name);

  const properties = fields.reduce<Record<string, ContentSchemaProperty>>(
    (acc, field) => {
      const definition: ContentSchemaProperty = {
        xFieldType: field.type,
      };
      const fieldConfig: Record<string, unknown> = {};
      if (
        (field.type === "relation" && field.relation?.multiple) ||
        (field.type === "media" && field.media?.multiple)
      ) {
        definition.type = "array";
        definition.items = { type: "string" };
      } else {
        definition.type = fieldTypeMap[field.type];
      }

      if (field.label) definition.title = field.label;
      if (field.help) definition.description = field.help;
      if (field.type === "select" && field.options?.length) {
        definition.enum = field.options;
        fieldConfig.select = { options: field.options };
      }
      if (field.type === "relation" && field.relation?.target) {
        definition.xRelationTarget = field.relation.target;
        fieldConfig.relation = {
          target: field.relation.target,
          ...(field.relation.multiple ? { multiple: true } : {}),
        };
      }
      if (field.type === "media") {
        const config = field.media;
        const mediaConfig = {
          ...(config?.multiple ? { multiple: true } : {}),
          ...(config?.accept?.length ? { accept: config.accept } : {}),
          ...(typeof config?.maxItems === "number"
            ? { maxItems: config.maxItems }
            : {}),
        };
        if (Object.keys(mediaConfig).length > 0) {
          fieldConfig.media = mediaConfig;
        }
        if (config?.multiple && typeof config.maxItems === "number") {
          definition.maxItems = config.maxItems;
        }
      }
      if (field.layout) {
        const layoutConfig = {
          ...(field.layout.tab ? { tab: field.layout.tab } : {}),
          ...(field.layout.section ? { section: field.layout.section } : {}),
          ...(field.layout.width ? { width: field.layout.width } : {}),
          ...(field.layout.display ? { display: field.layout.display } : {}),
        };
        if (Object.keys(layoutConfig).length > 0) {
          fieldConfig.layout = layoutConfig;
        }
      }

      const defaultValue = normalizeDefaultValue(field);
      if (defaultValue !== undefined) definition.default = defaultValue;
      if (Object.keys(fieldConfig).length > 0) {
        definition.xFieldConfig = fieldConfig;
      }

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
  const mediaConfig = readMediaConfig(definition.xFieldConfig);
  if (mediaConfig?.accept?.length || mediaConfig?.multiple) return "media";
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
    layout: readLayoutConfig(definition.xFieldConfig),
    relation:
      (definition.xFieldType === "relation" || definition.xRelationTarget) &&
      (definition.xRelationTarget ??
        readRelationTarget(definition.xFieldConfig))
        ? {
            target:
              definition.xRelationTarget ??
              (readRelationTarget(definition.xFieldConfig) as string),
            multiple:
              definition.type === "array" ||
              readRelationMultiple(definition.xFieldConfig) === true,
          }
        : undefined,
    media: (() => {
      const mediaConfig = readMediaConfig(definition.xFieldConfig);
      if (!(definition.xFieldType === "media" || mediaConfig)) return undefined;
      return {
        multiple: definition.type === "array" || mediaConfig?.multiple === true,
        ...(mediaConfig?.accept?.length ? { accept: mediaConfig.accept } : {}),
        ...(typeof mediaConfig?.maxItems === "number"
          ? { maxItems: mediaConfig.maxItems }
          : definition.maxItems !== undefined
            ? { maxItems: definition.maxItems }
            : {}),
      };
    })(),
  }));
}

export function countSchemaFields(schema?: ContentSchema | null) {
  if (!schema?.properties) return 0;
  return Object.keys(schema.properties).length;
}
