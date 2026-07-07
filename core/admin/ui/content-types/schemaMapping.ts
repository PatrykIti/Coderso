import type { ContentField, FieldType, NumberFieldConfig, SelectOption } from "./SchemaBuilder";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "integer" | "boolean" | "array";
  items?: { type?: "string"; enum?: string[] };
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean | string[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
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
  date: "string",
  slug: "string",
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
  const normalized = options.flatMap((entry, index): SelectOption[] => {
    if (typeof entry === "string") {
      const value = entry.trim();
      return value ? [{ id: `option-${index}-${value}`, label: value, value }] : [];
    }
    if (!isRecord(entry)) return [];
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const value = typeof entry.value === "string" ? entry.value.trim() : "";
    if (!label || !value) return [];
    return [
      {
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id.trim()
            : `option-${index}-${value}`,
        label,
        value,
        ...(entry.valueLocked === true ? { valueLocked: true } : {}),
      },
    ];
  });
  return normalized.length ? normalized : undefined;
};

const readSelectMultiple = (value: unknown) => {
  if (!isRecord(value)) return false;
  const select = value.select;
  if (!isRecord(select)) return false;
  return select.multiple === true;
};

const readNumberConfig = (value: unknown): NumberFieldConfig | undefined => {
  if (!isRecord(value)) return undefined;
  const number = isRecord(value.number) ? value.number : undefined;
  if (!number) return undefined;
  const format =
    number.format === "integer" || number.format === "decimal" ? number.format : undefined;
  const min =
    typeof number.min === "number" && Number.isFinite(number.min) ? number.min : undefined;
  const max =
    typeof number.max === "number" && Number.isFinite(number.max) ? number.max : undefined;
  const step =
    typeof number.step === "number" && Number.isFinite(number.step) && number.step > 0
      ? number.step
      : undefined;
  if (!format && min === undefined && max === undefined && step === undefined) {
    return undefined;
  }
  return { ...(format ? { format } : {}), min, max, step };
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

const readDateConfig = (value: unknown): ContentField["date"] | undefined => {
  if (!isRecord(value)) return undefined;
  const date = isRecord(value.date) ? value.date : undefined;
  if (!date) return undefined;
  if (date.includeTime === true) return { includeTime: true };
  return undefined;
};

const readSlugConfig = (value: unknown): ContentField["slug"] | undefined => {
  if (!isRecord(value)) return undefined;
  const slug = isRecord(value.slug) ? value.slug : undefined;
  if (!slug) return undefined;
  const source =
    typeof slug.source === "string" && slug.source.trim() ? slug.source.trim() : undefined;
  const editable = slug.editable === false ? false : undefined;
  if (source === undefined && editable === undefined) return undefined;
  return {
    ...(source ? { source } : {}),
    ...(editable === false ? { editable: false } : {}),
  };
};

const readLayoutConfig = (value: unknown): ContentField["layout"] | undefined => {
  if (!isRecord(value)) return undefined;
  const layout = isRecord(value.layout) ? value.layout : undefined;
  if (!layout) return undefined;
  const tab = typeof layout.tab === "string" ? layout.tab.trim() : undefined;
  const section = typeof layout.section === "string" ? layout.section.trim() : undefined;
  const width = layout.width === "full" || layout.width === "half" ? layout.width : undefined;
  const display =
    layout.display === "default" || layout.display === "compact" ? layout.display : undefined;
  if (!tab && !section && !width && !display) return undefined;
  return {
    ...(tab ? { tab } : {}),
    ...(section ? { section } : {}),
    ...(width ? { width } : {}),
    ...(display ? { display } : {}),
  };
};

export function buildSchemaFromFields(fields: ContentField[]): ContentSchema {
  const required = fields.filter((field) => field.required).map((field) => field.name);

  const properties = fields.reduce<Record<string, ContentSchemaProperty>>((acc, field, index) => {
    const definition: ContentSchemaProperty = {
      xFieldType: field.type,
    };
    const fieldConfig: Record<string, unknown> = {};
    const selectOptions = field.type === "select" ? normalizeFieldSelectOptions(field.options) : [];
    if (
      (field.type === "relation" && field.relation?.multiple) ||
      (field.type === "media" && field.media?.multiple)
    ) {
      definition.type = "array";
      definition.items = { type: "string" };
    } else if (field.type === "select" && field.multiple) {
      const values = selectOptions.map((option) => option.value).filter(Boolean);
      definition.type = "array";
      definition.items = values.length ? { type: "string", enum: values } : { type: "string" };
    } else if (field.type === "number" && field.number?.format === "integer") {
      definition.type = "integer";
    } else {
      definition.type = fieldTypeMap[field.type];
    }

    if (field.label) definition.title = field.label;
    if (field.help) definition.description = field.help;
    if (field.type === "select" && selectOptions.length) {
      const options = selectOptions.map((option) => ({
        label: option.label,
        value: option.value,
      }));
      const values = options.map((option) => option.value);
      if (field.multiple) {
        definition.items = { type: "string", enum: values };
      } else {
        definition.enum = values;
      }
      fieldConfig.select = {
        options,
        ...(field.multiple ? { multiple: true } : {}),
      };
    }
    if (field.type === "number") {
      const numberConfig = field.number;
      if (typeof numberConfig?.min === "number") definition.minimum = numberConfig.min;
      if (typeof numberConfig?.max === "number") definition.maximum = numberConfig.max;
      if (typeof numberConfig?.step === "number") definition.multipleOf = numberConfig.step;
      if (numberConfig) {
        fieldConfig.number = {
          ...(numberConfig.format ? { format: numberConfig.format } : {}),
          ...(typeof numberConfig.min === "number" ? { min: numberConfig.min } : {}),
          ...(typeof numberConfig.max === "number" ? { max: numberConfig.max } : {}),
          ...(typeof numberConfig.step === "number" ? { step: numberConfig.step } : {}),
        };
      }
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
        ...(typeof config?.maxItems === "number" ? { maxItems: config.maxItems } : {}),
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
    if (field.type === "date" && field.date?.includeTime) {
      fieldConfig.date = { includeTime: true };
    }
    if (field.type === "slug") {
      const slugConfig = {
        ...(field.slug?.source ? { source: field.slug.source } : {}),
        ...(field.slug?.editable === false ? { editable: false } : {}),
      };
      if (Object.keys(slugConfig).length > 0) {
        fieldConfig.slug = slugConfig;
      }
    }
    if (field.unique) fieldConfig.unique = true;
    // Field-ORDER persistence (all types, NOT present-only): jsonb canonicalizes
    // object keys, so the authored order is stored as data on every property.
    fieldConfig.order = index;

    const defaultValue = normalizeDefaultValue(field);
    if (defaultValue !== undefined) definition.default = defaultValue;
    if (Object.keys(fieldConfig).length > 0) {
      definition.xFieldConfig = fieldConfig;
    }

    acc[field.name] = definition;
    return acc;
  }, {});

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
  const relationTarget = definition.xRelationTarget ?? readRelationTarget(definition.xFieldConfig);
  if (relationTarget) return "relation";
  const mediaConfig = readMediaConfig(definition.xFieldConfig);
  if (mediaConfig?.accept?.length || mediaConfig?.multiple) return "media";
  const selectOptions = readSelectOptions(definition.xFieldConfig);
  if (selectOptions?.length) return "select";
  if (definition.enum && definition.enum.length > 0) return "select";
  if (
    definition.type === "array" &&
    definition.items?.type === "string" &&
    (definition.items.enum?.length || readSelectMultiple(definition.xFieldConfig))
  ) {
    return "select";
  }
  if (definition.type === "integer") return "number";
  if (definition.type === "number") return "number";
  if (definition.type === "boolean") return "boolean";
  return "text";
};

const humanizeFieldLabel = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isMachineLabel = (name: string, label?: string) => {
  if (!label) return true;
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalizedName === normalizedLabel;
};

const optionsFromEnum = (values?: string[]): SelectOption[] | undefined => {
  if (!values?.length) return undefined;
  return values.map((value, index) => ({
    id: `option-${index}-${value}`,
    label: humanizeFieldLabel(value),
    value,
    valueLocked: true,
  }));
};

const normalizeFieldSelectOptions = (options: unknown): SelectOption[] => {
  if (!Array.isArray(options)) return [];
  return options.flatMap((entry, index): SelectOption[] => {
    if (typeof entry === "string") {
      const value = entry.trim();
      return value
        ? [{ id: `option-${index}-${value}`, label: humanizeFieldLabel(value), value }]
        : [];
    }
    if (!isRecord(entry)) return [];
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const value = typeof entry.value === "string" ? entry.value.trim() : "";
    if (!label || !value) return [];
    return [
      {
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id.trim()
            : `option-${index}-${value}`,
        label,
        value,
        ...(entry.valueLocked === true ? { valueLocked: true } : {}),
      },
    ];
  });
};

export function fieldsFromSchema(schema: ContentSchema): ContentField[] {
  const required = new Set(schema.required ?? []);
  const mapField = (name: string, definition: ContentSchemaProperty): ContentField => {
    const fieldType = resolveFieldType(definition);
    return {
      id: `field-${name}`,
      name,
      type: fieldType,
      label: isMachineLabel(name, definition.title)
        ? humanizeFieldLabel(name)
        : (definition.title as string),
      help: definition.description,
      required: required.has(name),
      options:
        readSelectOptions(definition.xFieldConfig) ??
        optionsFromEnum(definition.enum ?? definition.items?.enum),
      multiple:
        fieldType === "select" &&
        (definition.type === "array" || readSelectMultiple(definition.xFieldConfig)),
      number: (() => {
        const fromConfig = readNumberConfig(definition.xFieldConfig);
        if (definition.type !== "number" && definition.type !== "integer" && !fromConfig) {
          return undefined;
        }
        return {
          format: definition.type === "integer" ? "integer" : (fromConfig?.format ?? "decimal"),
          ...(typeof definition.minimum === "number" ? { min: definition.minimum } : {}),
          ...(typeof definition.maximum === "number" ? { max: definition.maximum } : {}),
          ...(typeof definition.multipleOf === "number" ? { step: definition.multipleOf } : {}),
          ...fromConfig,
        };
      })(),
      defaultValue: parseDefaultValue(definition.default),
      layout: readLayoutConfig(definition.xFieldConfig),
      relation:
        (definition.xFieldType === "relation" || definition.xRelationTarget) &&
        (definition.xRelationTarget ?? readRelationTarget(definition.xFieldConfig))
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
      date: readDateConfig(definition.xFieldConfig),
      slug: readSlugConfig(definition.xFieldConfig),
      unique: definition.xFieldConfig?.unique === true ? true : undefined,
    };
  };

  // Order-aware re-sort (field-ORDER persistence): read the ordinal from the raw
  // xFieldConfig.order (NEVER surfaced onto ContentField); stable-sort so fields
  // lacking an order keep their Object.entries position and sort AFTER ordered ones.
  return Object.entries(schema.properties)
    .map(([name, definition]) => ({
      order:
        typeof definition.xFieldConfig?.order === "number"
          ? (definition.xFieldConfig.order as number)
          : Number.POSITIVE_INFINITY,
      field: mapField(name, definition),
    }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.field);
}

export function countSchemaFields(schema?: ContentSchema | null) {
  if (!schema?.properties) return 0;
  return Object.keys(schema.properties).length;
}
