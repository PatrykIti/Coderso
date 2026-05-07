export type ListingLayout = "grid" | "list" | "table" | "calendar" | "map";
export type ListingFieldFormat = "text" | "date" | "badge" | "currency";
export type ListingActionKind = "view" | "edit" | "custom";
export type ListingGapScale = "xs" | "sm" | "md" | "lg" | "xl";
export type ListingCardVariant = "default" | "compact" | "minimal";
export type ListingTemplateConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "contains"
  | "exists"
  | "gt"
  | "gte"
  | "lt"
  | "lte";
export type ListingTemplateConditionPrimitive = string | number | boolean | null;
export type ListingTemplateConditionValue =
  | ListingTemplateConditionPrimitive
  | ListingTemplateConditionPrimitive[];

export type ListingTemplateCondition = {
  id: string;
  field: string;
  op: ListingTemplateConditionOperator;
  value?: ListingTemplateConditionValue;
};

export type ListingTemplateFieldBinding = {
  key: string;
  source: string;
  label: string | null;
  fallback: string | null;
  format: ListingFieldFormat;
  conditions: ListingTemplateCondition[];
};

export type ListingTemplateItemAction = {
  id: string;
  label: string;
  kind: ListingActionKind;
  href: string | null;
  opensInNewTab: boolean;
};

export type ListingTemplateEmptyState = {
  title: string;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type ListingTemplateStyle = {
  columns: number;
  gap: ListingGapScale;
  cardVariant: ListingCardVariant;
};

export type ListingTemplateConfig = {
  fields: ListingTemplateFieldBinding[];
  itemActions: ListingTemplateItemAction[];
  emptyState: ListingTemplateEmptyState;
  style: ListingTemplateStyle;
};

const fieldFormats = new Set<ListingFieldFormat>(["text", "date", "badge", "currency"]);
const actionKinds = new Set<ListingActionKind>(["view", "edit", "custom"]);
const gapScale = new Set<ListingGapScale>(["xs", "sm", "md", "lg", "xl"]);
const cardVariants = new Set<ListingCardVariant>(["default", "compact", "minimal"]);
const conditionOperators = new Set<ListingTemplateConditionOperator>([
  "eq",
  "neq",
  "in",
  "contains",
  "exists",
  "gt",
  "gte",
  "lt",
  "lte",
]);
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

const defaultConfig = (): ListingTemplateConfig => ({
  fields: [],
  itemActions: [],
  emptyState: {
    title: "No items found",
    description: null,
    ctaLabel: null,
    ctaHref: null,
  },
  style: {
    columns: 3,
    gap: "md",
    cardVariant: "default",
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableText = (value: unknown) => normalizeText(value) ?? null;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeFieldPath = (value: unknown) => {
  const text = normalizeText(value);
  if (!text || !/^[a-zA-Z0-9_.-]+$/.test(text)) {
    throw new Error("listing_template_config_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw new Error("listing_template_config_invalid");
  }
  return text;
};

const normalizeHref = (value: unknown) => {
  const href = normalizeText(value);
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  throw new Error("listing_template_config_invalid");
};

const isPrimitiveConditionValue = (value: unknown): value is ListingTemplateConditionPrimitive =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === null;

const normalizeConditionPrimitive = (value: unknown): ListingTemplateConditionPrimitive => {
  if (!isPrimitiveConditionValue(value)) {
    throw new Error("listing_template_config_invalid");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
};

const normalizeConditionValue = (
  op: ListingTemplateConditionOperator,
  value: unknown
): ListingTemplateConditionValue | undefined => {
  if (op === "exists") {
    if (value === undefined) return true;
    if (typeof value === "boolean") return value;
    throw new Error("listing_template_config_invalid");
  }

  if (op === "in") {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("listing_template_config_invalid");
    }
    return value.map((item) => normalizeConditionPrimitive(item));
  }

  if (op === "contains") {
    if (Array.isArray(value)) {
      if (value.length === 0) throw new Error("listing_template_config_invalid");
      return value.map((item) => normalizeConditionPrimitive(item));
    }
    if (value === undefined) throw new Error("listing_template_config_invalid");
    return normalizeConditionPrimitive(value);
  }

  if (value === undefined) {
    throw new Error("listing_template_config_invalid");
  }
  if (Array.isArray(value)) {
    throw new Error("listing_template_config_invalid");
  }
  return normalizeConditionPrimitive(value);
};

const normalizeConditions = (value: unknown): ListingTemplateCondition[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error("listing_template_config_invalid");
  }

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("listing_template_config_invalid");
    const field = normalizeFieldPath(item.field);
    const opRaw = normalizeText(item.op);
    if (!opRaw || !conditionOperators.has(opRaw as ListingTemplateConditionOperator)) {
      throw new Error("listing_template_config_invalid");
    }
    const op = opRaw as ListingTemplateConditionOperator;
    const id = slugify(normalizeText(item.id) ?? `${field}-${op}`) || `condition-${index + 1}`;

    return {
      id,
      field,
      op,
      value: normalizeConditionValue(op, item.value),
    };
  });

  const ids = new Set<string>();
  normalized.forEach((condition) => {
    if (ids.has(condition.id)) {
      throw new Error("listing_template_config_invalid");
    }
    ids.add(condition.id);
  });

  return normalized;
};

const normalizeFields = (value: unknown) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 40) {
    throw new Error("listing_template_config_invalid");
  }

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("listing_template_config_invalid");
    const key = normalizeText(item.key) ?? `field_${index + 1}`;
    const source = normalizeFieldPath(item.source);
    const formatRaw = normalizeText(item.format) ?? "text";
    if (!fieldFormats.has(formatRaw as ListingFieldFormat)) {
      throw new Error("listing_template_config_invalid");
    }
    return {
      key,
      source,
      label: normalizeNullableText(item.label),
      fallback: normalizeNullableText(item.fallback),
      format: formatRaw as ListingFieldFormat,
      conditions: normalizeConditions(item.conditions),
    };
  });

  const keys = new Set<string>();
  normalized.forEach((field) => {
    if (keys.has(field.key)) {
      throw new Error("listing_template_config_invalid");
    }
    keys.add(field.key);
  });

  return normalized;
};

const normalizeItemActions = (value: unknown) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 12) {
    throw new Error("listing_template_config_invalid");
  }

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("listing_template_config_invalid");
    const label = normalizeText(item.label);
    if (!label) throw new Error("listing_template_config_invalid");

    const id = slugify(normalizeText(item.id) ?? label) || `action-${index + 1}`;
    const kindRaw = normalizeText(item.kind) ?? "custom";
    if (!actionKinds.has(kindRaw as ListingActionKind)) {
      throw new Error("listing_template_config_invalid");
    }

    const href = normalizeHref(item.href);
    const kind = kindRaw as ListingActionKind;
    if (kind === "custom" && !href) {
      throw new Error("listing_template_config_invalid");
    }

    return {
      id,
      label,
      kind,
      href,
      opensInNewTab: item.opensInNewTab === true,
    };
  });

  const ids = new Set<string>();
  normalized.forEach((action) => {
    if (ids.has(action.id)) {
      throw new Error("listing_template_config_invalid");
    }
    ids.add(action.id);
  });

  return normalized;
};

const normalizeEmptyState = (value: unknown): ListingTemplateEmptyState => {
  const fallback = defaultConfig().emptyState;
  if (value === undefined || value === null) return fallback;
  if (!isRecord(value)) throw new Error("listing_template_config_invalid");

  const title = normalizeText(value.title) ?? fallback.title;
  const ctaLabel = normalizeNullableText(value.ctaLabel);
  const ctaHref = normalizeHref(value.ctaHref);
  if ((ctaLabel && !ctaHref) || (!ctaLabel && ctaHref)) {
    throw new Error("listing_template_config_invalid");
  }

  return {
    title,
    description: normalizeNullableText(value.description),
    ctaLabel,
    ctaHref,
  };
};

const normalizeStyle = (value: unknown): ListingTemplateStyle => {
  const fallback = defaultConfig().style;
  if (value === undefined || value === null) return fallback;
  if (!isRecord(value)) throw new Error("listing_template_config_invalid");

  const columnsRaw = value.columns;
  const columns =
    typeof columnsRaw === "number" && Number.isFinite(columnsRaw)
      ? Math.trunc(columnsRaw)
      : fallback.columns;
  if (columns < 1 || columns > 6) {
    throw new Error("listing_template_config_invalid");
  }

  const gapRaw = normalizeText(value.gap) ?? fallback.gap;
  if (!gapScale.has(gapRaw as ListingGapScale)) {
    throw new Error("listing_template_config_invalid");
  }

  const variantRaw = normalizeText(value.cardVariant) ?? fallback.cardVariant;
  if (!cardVariants.has(variantRaw as ListingCardVariant)) {
    throw new Error("listing_template_config_invalid");
  }

  return {
    columns,
    gap: gapRaw as ListingGapScale,
    cardVariant: variantRaw as ListingCardVariant,
  };
};

export function normalizeListingTemplateConfig(value: unknown): ListingTemplateConfig {
  if (value === undefined || value === null) return defaultConfig();
  if (!isRecord(value)) throw new Error("listing_template_config_invalid");

  return {
    fields: normalizeFields(value.fields),
    itemActions: normalizeItemActions(value.itemActions),
    emptyState: normalizeEmptyState(value.emptyState),
    style: normalizeStyle(value.style),
  };
}
