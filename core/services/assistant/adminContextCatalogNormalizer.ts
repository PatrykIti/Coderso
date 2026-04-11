import type {
  AssistantContentTypeSummary,
  AssistantCustomScreenBindingSummary,
  AssistantCustomScreenSummary,
  AssistantFormSummary,
  AssistantListingQuerySummary,
  AssistantListingSortSummary,
  AssistantListingTemplateSummary,
  AssistantResourceCatalogBudget,
  AssistantResourceCatalogSnapshot,
  AssistantResourceFieldSummary,
  AssistantWidgetSlotSummary,
  AssistantWidgetSummary,
} from "./adminContextTypes";

export type AssistantResourceCatalogRawInput = {
  contentTypes?: unknown;
  customScreens?: unknown;
  listingQueries?: unknown;
  listingTemplates?: unknown;
  forms?: unknown;
  widgets?: unknown;
};

export type AssistantResourceCatalogNormalizeOptions = {
  generatedAt?: string;
  maxItemsPerGroup?: number;
  maxFieldsPerResource?: number;
};

const DEFAULT_MAX_ITEMS_PER_GROUP = 50;
const DEFAULT_MAX_FIELDS_PER_RESOURCE = 24;
const secretKeyPattern = /(token|secret|password|api[-_]?key|credential|webhook)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const readRecordArray = (value: unknown) => readArray(value).filter(isRecord);

const isSecretLike = (value: string) => secretKeyPattern.test(value);

const readStringArray = (value: unknown) =>
  readArray(value)
    .map(readString)
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry) => !isSecretLike(entry))
    .sort((left, right) => left.localeCompare(right));

const normalizeBudget = (
  options: AssistantResourceCatalogNormalizeOptions
): AssistantResourceCatalogBudget => ({
  maxItemsPerGroup: Math.max(
    1,
    Math.floor(options.maxItemsPerGroup ?? DEFAULT_MAX_ITEMS_PER_GROUP)
  ),
  maxFieldsPerResource: Math.max(
    1,
    Math.floor(options.maxFieldsPerResource ?? DEFAULT_MAX_FIELDS_PER_RESOURCE)
  ),
  truncated: false,
});

const createClamp = (budget: AssistantResourceCatalogBudget, warnings: string[]) => {
  const clamp = <T>(items: T[], group: string, max = budget.maxItemsPerGroup) => {
    if (items.length <= max) return items;
    budget.truncated = true;
    warnings.push(`${group}_truncated`);
    return items.slice(0, max);
  };
  return clamp;
};

const sortByKey = <T>(items: T[], key: (item: T) => string) =>
  [...items].sort((left, right) => key(left).localeCompare(key(right)));

const readSchemaFields = (
  schema: unknown,
  budget: AssistantResourceCatalogBudget,
  warnings: string[],
  group: string
): AssistantResourceFieldSummary[] => {
  if (!isRecord(schema)) return [];
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = new Set(readStringArray(schema.required));
  const fields: AssistantResourceFieldSummary[] = [];

  for (const [fieldName, definition] of Object.entries(properties)) {
    if (!fieldName.trim() || isSecretLike(fieldName)) {
      warnings.push(`${group}_field_redacted`);
      continue;
    }
    const def = isRecord(definition) ? definition : {};
    const typeValue = Array.isArray(def.type)
      ? def.type.map(readString).filter(Boolean).join("|")
      : readString(def.type);
    fields.push({
      name: fieldName,
      type: typeValue || "unknown",
      required: required.has(fieldName),
      label: readString(def.title) ?? readString(def.label),
      orderIndex: readNumber(def.orderIndex),
    });
  }

  return createClamp(budget, warnings)(
    sortByKey(fields, (field) => field.name),
    `${group}_fields`,
    budget.maxFieldsPerResource
  );
};

const normalizeContentType = (
  value: Record<string, unknown>,
  budget: AssistantResourceCatalogBudget,
  warnings: string[]
): AssistantContentTypeSummary | null => {
  const id = readString(value.id);
  const slug = readString(value.slug);
  const name = readString(value.name);
  if (!id || !slug || !name) return null;

  return {
    id,
    slug,
    name,
    entryCount: readNumber(value.entryCount),
    fields: readSchemaFields(value.schema, budget, warnings, `content_type_${slug}`),
  };
};

const normalizeBindingMode = (value: unknown): AssistantCustomScreenBindingSummary["mode"] => {
  if (value === "read" || value === "write" || value === "readwrite") return value;
  return "readwrite";
};

const normalizeCustomScreen = (value: Record<string, unknown>): AssistantCustomScreenSummary | null => {
  const id = readString(value.id);
  const name = readString(value.name);
  const contentTypeId = readString(value.contentTypeId);
  if (!id || !name || !contentTypeId) return null;

  const bindings = readRecordArray(value.bindings)
    .map((binding): AssistantCustomScreenBindingSummary | null => {
      const widgetId = readString(binding.widgetId);
      const field = readString(binding.field);
      const propPath = readString(binding.propPath);
      if (!widgetId || !field || !propPath || isSecretLike(field) || isSecretLike(propPath)) {
        return null;
      }
      return {
        widgetId,
        field,
        propPath,
        mode: normalizeBindingMode(binding.mode),
      };
    })
    .filter((binding): binding is AssistantCustomScreenBindingSummary => Boolean(binding))
    .sort((left, right) => `${left.widgetId}:${left.field}`.localeCompare(`${right.widgetId}:${right.field}`));
  const writableBindingFields = [
    ...new Set(
      bindings
        .filter((binding) => binding.mode === "write" || binding.mode === "readwrite")
        .map((binding) => binding.field)
    ),
  ].sort((left, right) => left.localeCompare(right));

  return {
    id,
    name,
    contentTypeId,
    status: value.status === "draft" || value.status === "active" ? value.status : "unknown",
    showInSidebar: readBoolean(value.showInSidebar),
    sidebarLabel: readString(value.sidebarLabel),
    writableBindingFields,
    bindings,
  };
};

const normalizeListingSort = (value: unknown) =>
  readRecordArray(value)
    .map((entry): AssistantListingSortSummary | null => {
      const field = readString(entry.field);
      const dir = entry.dir === "desc" ? "desc" : "asc";
      if (!field || isSecretLike(field)) return null;
      return { field, dir };
    })
    .filter((entry): entry is AssistantListingSortSummary => Boolean(entry));

const normalizeListingQuery = (value: Record<string, unknown>): AssistantListingQuerySummary | null => {
  const id = readString(value.id);
  const name = readString(value.name);
  if (!id || !name) return null;
  const query = isRecord(value.query) ? value.query : {};
  const sourceConfig = isRecord(query.sourceConfig) ? query.sourceConfig : {};
  const pagination = isRecord(query.pagination) ? query.pagination : {};
  const source = readString(query.source) ?? "unknown";

  return {
    id,
    name,
    description: readString(value.description),
    source,
    contentTypeId: readString(sourceConfig.contentTypeId),
    taxonomyId: readString(sourceConfig.taxonomyId),
    includeDrafts: readBoolean(sourceConfig.includeDrafts),
    fields: readStringArray(query.fields),
    sort: normalizeListingSort(query.sort),
    limit: readNumber(pagination.limit),
  };
};

const readSafeConfigKeys = (value: unknown, warnings: string[], group: string) => {
  if (!isRecord(value)) return [];
  const keys: string[] = [];
  for (const key of Object.keys(value)) {
    if (isSecretLike(key)) {
      warnings.push(`${group}_config_key_redacted`);
      continue;
    }
    keys.push(key);
  }
  return keys.sort((left, right) => left.localeCompare(right));
};

const normalizeListingTemplate = (
  value: Record<string, unknown>,
  warnings: string[]
): AssistantListingTemplateSummary | null => {
  const id = readString(value.id);
  const name = readString(value.name);
  const slug = readString(value.slug);
  if (!id || !name || !slug) return null;
  return {
    id,
    name,
    slug,
    description: readString(value.description),
    layout: readString(value.layout) ?? "unknown",
    configKeys: readSafeConfigKeys(value.config, warnings, `listing_template_${slug}`),
  };
};

const normalizeForm = (
  value: Record<string, unknown>,
  budget: AssistantResourceCatalogBudget,
  warnings: string[]
): AssistantFormSummary | null => {
  const form = isRecord(value.form) ? value.form : value;
  const id = readString(form.id);
  const name = readString(form.name);
  if (!id || !name) return null;
  const fields = readRecordArray(value.fields ?? form.fields)
    .map((field): AssistantResourceFieldSummary | null => {
      const fieldName = readString(field.name);
      if (!fieldName || isSecretLike(fieldName)) {
        warnings.push(`form_${id}_field_redacted`);
        return null;
      }
      return {
        name: fieldName,
        type: readString(field.type) ?? "unknown",
        required: readBoolean(field.required),
        label: readString(field.label),
        orderIndex: readNumber(field.orderIndex),
      };
    })
    .filter((field): field is AssistantResourceFieldSummary => Boolean(field));

  return {
    id,
    name,
    slug: readString(form.slug),
    status: readString(form.status) ?? "unknown",
    submissionAccess: readString(form.submissionAccess) ?? "unknown",
    fields: createClamp(budget, warnings)(
      sortByKey(fields, (field) => `${field.orderIndex ?? 9999}:${field.name}`),
      `form_${id}_fields`,
      budget.maxFieldsPerResource
    ),
  };
};

const normalizeVariantIds = (value: unknown) =>
  readArray(value)
    .map((entry) => {
      if (typeof entry === "string") return readString(entry);
      if (isRecord(entry)) return readString(entry.id);
      return null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .sort((left, right) => left.localeCompare(right));

const normalizeWidgetSlots = (value: unknown): AssistantWidgetSlotSummary[] =>
  readRecordArray(value)
    .map((slot): AssistantWidgetSlotSummary | null => {
      const id = readString(slot.id);
      if (!id) return null;
      return {
        id,
        label: readString(slot.label) ?? id,
        kind: slot.kind === "repeatable" ? "repeatable" : "fixed",
        allowedTypes: readStringArray(slot.allowedTypes),
        minItems: readNumber(slot.minItems),
        maxItems: readNumber(slot.maxItems),
      };
    })
    .filter((slot): slot is AssistantWidgetSlotSummary => Boolean(slot))
    .sort((left, right) => left.id.localeCompare(right.id));

const normalizeWidget = (value: Record<string, unknown>): AssistantWidgetSummary | null => {
  const source = value.source === "template" ? "template" : "core";
  const id = readString(value.id) ?? readString(value.type);
  const name = readString(value.name) ?? readString(value.title);
  if (!id || !name) return null;

  return {
    id,
    source,
    name,
    description: readString(value.description),
    category: readString(value.category) ?? "uncategorized",
    module: readString(value.module) ?? (source === "template" ? "templates" : "general"),
    complexity: readString(value.complexity) ?? "composite",
    audience: readString(value.audience) ?? "beginner",
    variants: normalizeVariantIds(value.variants),
    slots: normalizeWidgetSlots(value.slots),
    surfaces: readStringArray(value.surfaces),
    requires: readStringArray(value.requires),
    status: value.status === "draft" ? "draft" : "published",
  };
};

export function normalizeAssistantResourceCatalog(
  raw: AssistantResourceCatalogRawInput,
  options: AssistantResourceCatalogNormalizeOptions = {}
): AssistantResourceCatalogSnapshot {
  const warnings: string[] = [];
  const budget = normalizeBudget(options);
  const clamp = createClamp(budget, warnings);

  const contentTypes = clamp(
    sortByKey(
      readRecordArray(raw.contentTypes)
        .map((entry) => normalizeContentType(entry, budget, warnings))
        .filter((entry): entry is AssistantContentTypeSummary => Boolean(entry)),
      (entry) => entry.slug
    ),
    "content_types"
  );
  const customScreens = clamp(
    sortByKey(
      readRecordArray(raw.customScreens)
        .map(normalizeCustomScreen)
        .filter((entry): entry is AssistantCustomScreenSummary => Boolean(entry)),
      (entry) => entry.name
    ),
    "custom_screens"
  );
  const queries = clamp(
    sortByKey(
      readRecordArray(raw.listingQueries)
        .map(normalizeListingQuery)
        .filter((entry): entry is AssistantListingQuerySummary => Boolean(entry)),
      (entry) => entry.name
    ),
    "listing_queries"
  );
  const templates = clamp(
    sortByKey(
      readRecordArray(raw.listingTemplates)
        .map((entry) => normalizeListingTemplate(entry, warnings))
        .filter((entry): entry is AssistantListingTemplateSummary => Boolean(entry)),
      (entry) => entry.slug
    ),
    "listing_templates"
  );
  const forms = clamp(
    sortByKey(
      readRecordArray(raw.forms)
        .map((entry) => normalizeForm(entry, budget, warnings))
        .filter((entry): entry is AssistantFormSummary => Boolean(entry)),
      (entry) => entry.slug ?? entry.name
    ),
    "forms"
  );
  const widgets = clamp(
    sortByKey(
      readRecordArray(raw.widgets)
        .map(normalizeWidget)
        .filter((entry): entry is AssistantWidgetSummary => Boolean(entry)),
      (entry) => `${entry.source}:${entry.id}`
    ),
    "widgets"
  );

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    budget,
    contentTypes,
    customScreens,
    listings: {
      queries,
      templates,
    },
    forms,
    widgets,
    warnings: [...new Set(warnings)].sort((left, right) => left.localeCompare(right)),
  };
}
