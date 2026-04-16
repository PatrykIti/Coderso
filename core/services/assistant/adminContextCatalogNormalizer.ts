import type {
  AssistantContentTypeSummary,
  AssistantCustomScreenBindingSummary,
  AssistantCustomScreenSummary,
  AssistantFormSummary,
  AssistantListingQuerySummary,
  AssistantListingSortSummary,
  AssistantListingTemplateSummary,
  AssistantMenuItemSummary,
  AssistantMenuSummary,
  AssistantPageSummary,
  AssistantReferencedWidgetTemplateBlockSummary,
  AssistantReferencedWidgetTemplateSummary,
  AssistantResourceCatalogBudget,
  AssistantResourceCatalogSnapshot,
  AssistantResourceFieldSummary,
  AssistantSeoDocumentSummary,
  AssistantTemplateSectionReferenceSummary,
  AssistantWidgetSlotSummary,
  AssistantWidgetSummary,
} from "./adminContextTypes";
import { normalizeWidgetTemplateSettings } from "../widgets/widgetTemplateSettings";

export type AssistantResourceCatalogRawInput = {
  pages?: unknown;
  contentTypes?: unknown;
  customScreens?: unknown;
  listingQueries?: unknown;
  listingTemplates?: unknown;
  forms?: unknown;
  menus?: unknown;
  seoDocuments?: unknown;
  widgets?: unknown;
};

export type AssistantResourceCatalogNormalizeOptions = {
  generatedAt?: string;
  maxItemsPerGroup?: number;
  maxFieldsPerResource?: number;
};

export type AssistantTemplateReferenceNormalizeOptions = {
  maxTemplateReferences?: number;
  maxBlocksPerTemplate?: number;
  maxDataKeysPerBlock?: number;
};

const DEFAULT_MAX_ITEMS_PER_GROUP = 50;
const DEFAULT_MAX_FIELDS_PER_RESOURCE = 24;
const DEFAULT_MAX_TEMPLATE_REFERENCES = 20;
const DEFAULT_MAX_TEMPLATE_BLOCKS = 40;
const DEFAULT_MAX_TEMPLATE_BLOCK_DATA_KEYS = 20;
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

const readSafeString = (value: unknown) => {
  const text = readString(value);
  if (!text || isSecretLike(text)) return null;
  return text;
};

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

const normalizePage = (value: Record<string, unknown>): AssistantPageSummary | null => {
  const id = readString(value.id);
  const title = readString(value.title);
  const slug = readString(value.slug);
  if (!id || !title || !slug) return null;
  return {
    id,
    title,
    slug,
    status: readString(value.status) ?? "unknown",
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

const normalizeMenuItems = (
  value: unknown,
  depth = 0
): AssistantMenuItemSummary[] =>
  readRecordArray(value)
    .flatMap((item): AssistantMenuItemSummary[] => {
      const id = readString(item.id);
      const label = readString(item.label);
      if (!id || !label) return [];
      const normalized: AssistantMenuItemSummary = {
        id,
        label,
        href: readString(item.href),
        pageId: readString(item.pageId),
        parentId: readString(item.parentId),
        orderIndex: readNumber(item.orderIndex) ?? 0,
        depth,
      };
      return [normalized, ...normalizeMenuItems(item.children, depth + 1)];
    })
    .sort((left, right) => {
      if (left.depth !== right.depth) return left.depth - right.depth;
      if (left.orderIndex !== right.orderIndex) return left.orderIndex - right.orderIndex;
      return left.label.localeCompare(right.label);
    });

const normalizeMenu = (value: Record<string, unknown>): AssistantMenuSummary | null => {
  const menu = isRecord(value.menu) ? value.menu : value;
  const id = readString(menu.id);
  const name = readString(menu.name);
  if (!id || !name) return null;
  const items = normalizeMenuItems(value.items ?? menu.items);
  return {
    id,
    name,
    location: readString(menu.location),
    itemCount: items.length,
    items,
  };
};

const normalizeSeoDocument = (value: Record<string, unknown>): AssistantSeoDocumentSummary | null => {
  const id = readString(value.id);
  const targetType = readString(value.targetType);
  const targetId = readString(value.targetId);
  if (!id || (targetType !== "page" && targetType !== "entry") || !targetId) return null;
  return {
    id,
    targetType,
    targetId,
    targetTitle: readString(value.targetTitle),
    slug: readString(value.slug),
    title: readString(value.title),
    status: readString(value.status) ?? "unknown",
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

const clampTemplateReferenceOptions = (
  options: AssistantTemplateReferenceNormalizeOptions = {}
) => ({
  maxTemplateReferences: Math.max(
    1,
    Math.floor(options.maxTemplateReferences ?? DEFAULT_MAX_TEMPLATE_REFERENCES)
  ),
  maxBlocksPerTemplate: Math.max(
    1,
    Math.floor(options.maxBlocksPerTemplate ?? DEFAULT_MAX_TEMPLATE_BLOCKS)
  ),
  maxDataKeysPerBlock: Math.max(
    1,
    Math.floor(options.maxDataKeysPerBlock ?? DEFAULT_MAX_TEMPLATE_BLOCK_DATA_KEYS)
  ),
});

const readBlockDataValue = (block: Record<string, unknown>, key: string) => {
  const data = isRecord(block.data) ? block.data : {};
  return data[key] ?? block[key];
};

const readBlockTemplateText = (block: Record<string, unknown>, key: string) =>
  readSafeString(readBlockDataValue(block, key));

const addUnique = (items: string[], value: string) => {
  if (!items.includes(value)) items.push(value);
};

export function mergeAssistantTemplateSectionReferences(
  references: AssistantTemplateSectionReferenceSummary[],
  options: AssistantTemplateReferenceNormalizeOptions = {}
): AssistantTemplateSectionReferenceSummary[] {
  const limits = clampTemplateReferenceOptions(options);
  const byTemplateId = new Map<string, AssistantTemplateSectionReferenceSummary>();

  for (const reference of references) {
    const templateId = readSafeString(reference.templateId);
    if (!templateId) continue;
    const existing = byTemplateId.get(templateId);
    const next =
      existing ??
      ({
        templateId,
        templateName: readSafeString(reference.templateName) ?? null,
        blockIds: [],
        paths: [],
        count: 0,
      } satisfies AssistantTemplateSectionReferenceSummary);

    for (const blockId of readArray(reference.blockIds)) {
      const safeBlockId = readSafeString(blockId);
      if (safeBlockId) addUnique(next.blockIds, safeBlockId);
    }
    for (const path of readArray(reference.paths)) {
      const safePath = readSafeString(path);
      if (safePath) addUnique(next.paths, safePath);
    }
    next.count += Math.max(1, Math.floor(readNumber(reference.count) ?? 1));
    byTemplateId.set(templateId, next);
  }

  return [...byTemplateId.values()]
    .sort((left, right) => left.templateId.localeCompare(right.templateId))
    .slice(0, limits.maxTemplateReferences);
}

export function extractAssistantTemplateSectionReferences(
  blocks: unknown,
  options: AssistantTemplateReferenceNormalizeOptions = {}
): AssistantTemplateSectionReferenceSummary[] {
  const limits = clampTemplateReferenceOptions(options);
  const references: AssistantTemplateSectionReferenceSummary[] = [];
  let visited = 0;

  const visit = (items: unknown, pathPrefix: string) => {
    for (const [index, block] of readArray(items).entries()) {
      if (visited >= limits.maxBlocksPerTemplate) return;
      if (!isRecord(block)) continue;
      visited += 1;
      const type = readSafeString(block.type);
      const path =
        readSafeString(block.path) ?? (pathPrefix ? `${pathPrefix}.${index}` : String(index));
      const id = readSafeString(block.id) ?? path;
      if (type === "template-section") {
        const templateId = readBlockTemplateText(block, "templateId");
        if (templateId) {
          references.push({
            templateId,
            templateName: readBlockTemplateText(block, "templateName"),
            blockIds: [id],
            paths: [path],
            count: 1,
          });
        }
      }

      const childBlocks = Array.isArray(block.children) ? block.children : [];
      if (childBlocks.length > 0) visit(childBlocks, `${path}.children`);

      const slots = isRecord(block.slots) ? block.slots : {};
      for (const [slotId, value] of Object.entries(slots)) {
        if (visited >= limits.maxBlocksPerTemplate) break;
        if (Array.isArray(value)) visit(value, `${path}.slots.${slotId}`);
      }
    }
  };

  visit(blocks, "");
  return mergeAssistantTemplateSectionReferences(references, options);
}

const readTemplateBlockDataKeys = (
  data: unknown,
  warnings: string[],
  group: string,
  maxKeys: number
) => {
  if (!isRecord(data)) return [];
  const keys: string[] = [];
  for (const key of Object.keys(data).sort((left, right) => left.localeCompare(right))) {
    if (isSecretLike(key)) {
      warnings.push(`${group}_block_data_key_redacted`);
      continue;
    }
    keys.push(key);
    if (keys.length >= maxKeys) {
      if (Object.keys(data).length > maxKeys) warnings.push(`${group}_block_data_keys_truncated`);
      break;
    }
  }
  return keys;
};

const normalizeReferencedTemplateBlocks = (
  blocks: unknown,
  options: Required<AssistantTemplateReferenceNormalizeOptions>,
  warnings: string[],
  group: string
) => {
  const summaries: AssistantReferencedWidgetTemplateBlockSummary[] = [];
  let visited = 0;

  const visit = (items: unknown, pathPrefix: string) => {
    for (const [index, block] of readArray(items).entries()) {
      if (summaries.length >= options.maxBlocksPerTemplate) return;
      if (!isRecord(block)) continue;
      visited += 1;
      const path =
        readSafeString(block.path) ?? (pathPrefix ? `${pathPrefix}.${index}` : String(index));
      const id = readSafeString(block.id);
      const type = readSafeString(block.type);
      if (!id || !type) {
        warnings.push(`${group}_block_redacted`);
        continue;
      }

      const data = isRecord(block.data) ? block.data : null;
      const childBlocks = Array.isArray(block.children) ? block.children : [];
      const slotEntries = isRecord(block.slots) ? Object.entries(block.slots) : [];
      const slotChildCount = slotEntries.reduce(
        (count, [, value]) => count + (Array.isArray(value) ? value.length : 0),
        0
      );
      const slotKeys =
        slotEntries.length > 0
          ? slotEntries
              .map(([key]) => readSafeString(key))
              .filter((key): key is string => Boolean(key))
              .sort((left, right) => left.localeCompare(right))
          : readStringArray(block.slotKeys);
      const childCount = readNumber(block.childCount) ?? childBlocks.length + slotChildCount;
      const dataKeys = data
        ? readTemplateBlockDataKeys(data, warnings, group, options.maxDataKeysPerBlock)
        : readStringArray(block.dataKeys).slice(0, options.maxDataKeysPerBlock);

      summaries.push({
        id,
        type,
        label:
          readSafeString(data?.title) ??
          readSafeString(data?.headline) ??
          readSafeString(block.label),
        path,
        childCount,
        slotKeys,
        dataKeys,
        templateId: type === "template-section" ? readBlockTemplateText(block, "templateId") : null,
        templateName:
          type === "template-section" ? readBlockTemplateText(block, "templateName") : null,
      });

      if (summaries.length >= options.maxBlocksPerTemplate) return;
      if (childBlocks.length > 0) visit(childBlocks, `${path}.children`);
      for (const [slotId, value] of slotEntries) {
        if (summaries.length >= options.maxBlocksPerTemplate) break;
        if (Array.isArray(value)) visit(value, `${path}.slots.${slotId}`);
      }
    }
  };

  visit(blocks, "");
  if (summaries.length >= options.maxBlocksPerTemplate && visited > summaries.length) {
    warnings.push(`${group}_blocks_truncated`);
  }
  return {
    blockCount: visited,
    blocks: summaries,
  };
};

export function normalizeAssistantReferencedWidgetTemplate(
  value: Record<string, unknown>,
  options: AssistantTemplateReferenceNormalizeOptions = {}
): AssistantReferencedWidgetTemplateSummary | null {
  const id = readSafeString(value.id);
  const name = readSafeString(value.name);
  const status = readSafeString(value.status);
  const category = readSafeString(value.category);
  if (!id || !name || !status || !category) return null;

  const limits = clampTemplateReferenceOptions(options);
  const warnings: string[] = [];
  const group = `widget_template_${id}`;
  const settings = normalizeWidgetTemplateSettings(value.settings);
  const settingsSummary = isRecord(value.settings) ? value.settings : {};
  const blockSummary = normalizeReferencedTemplateBlocks(
    value.blocks,
    limits,
    warnings,
    group
  );

  return {
    id,
    name,
    status,
    category,
    description: readSafeString(value.description),
    blockCount: readNumber(value.blockCount) ?? blockSummary.blockCount,
    blocks: blockSummary.blocks,
    settings: {
      wrapperContainer:
        readSafeString(settingsSummary.wrapperContainer) ?? settings.layout.wrapper.container,
      sectionGap: readSafeString(settingsSummary.sectionGap) ?? settings.layout.sections.gap,
      hasBackgroundMedia:
        typeof settingsSummary.hasBackgroundMedia === "boolean"
          ? settingsSummary.hasBackgroundMedia
          : settings.layout.wrapper.background.media.type !== "none",
    },
    warnings: [...new Set([...warnings, ...readStringArray(value.warnings)])].sort((left, right) =>
      left.localeCompare(right)
    ),
  };
}

export function normalizeAssistantReferencedWidgetTemplates(
  value: unknown,
  options: AssistantTemplateReferenceNormalizeOptions = {}
): AssistantReferencedWidgetTemplateSummary[] {
  const limits = clampTemplateReferenceOptions(options);
  return sortByKey(
    readRecordArray(value)
      .map((entry) => normalizeAssistantReferencedWidgetTemplate(entry, options))
      .filter((entry): entry is AssistantReferencedWidgetTemplateSummary => Boolean(entry)),
    (entry) => entry.id
  ).slice(0, limits.maxTemplateReferences);
}

export function normalizeAssistantResourceCatalog(
  raw: AssistantResourceCatalogRawInput,
  options: AssistantResourceCatalogNormalizeOptions = {}
): AssistantResourceCatalogSnapshot {
  const warnings: string[] = [];
  const budget = normalizeBudget(options);
  const clamp = createClamp(budget, warnings);

  const pages = clamp(
    sortByKey(
      readRecordArray(raw.pages)
        .map(normalizePage)
        .filter((entry): entry is AssistantPageSummary => Boolean(entry)),
      (entry) => entry.slug
    ),
    "pages"
  );
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
  const menus = clamp(
    sortByKey(
      readRecordArray(raw.menus)
        .map(normalizeMenu)
        .filter((entry): entry is AssistantMenuSummary => Boolean(entry)),
      (entry) => entry.name
    ),
    "menus"
  ).map((menu) => ({
    ...menu,
    items: clamp(menu.items, `menu_${menu.id}_items`, budget.maxFieldsPerResource),
    itemCount: menu.itemCount,
  }));
  const seoDocuments = clamp(
    sortByKey(
      readRecordArray(raw.seoDocuments)
        .map(normalizeSeoDocument)
        .filter((entry): entry is AssistantSeoDocumentSummary => Boolean(entry)),
      (entry) => `${entry.targetType}:${entry.slug ?? entry.targetId}`
    ),
    "seo_documents"
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
    pages,
    contentTypes,
    customScreens,
    listings: {
      queries,
      templates,
    },
    forms,
    menus,
    seoDocuments,
    widgets,
    warnings: [...new Set(warnings)].sort((left, right) => left.localeCompare(right)),
  };
}
