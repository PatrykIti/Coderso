import type {
  AssistantActionPlan,
  AssistantActionPlanStatus,
  AssistantExecutableActionType,
  AssistantIntentFamily,
  AssistantActionPlanMetadata,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "./actionPlanTypes";
import { assistantActionTypes } from "./actionRegistry";
import {
  normalizeFormActionInput,
  type FormActionInput,
  type FormActionType,
} from "../forms/formActionsContract";

type JsonRecord = Record<string, unknown>;

const planKeys = new Set([
  "id",
  "status",
  "intentId",
  "promptKind",
  "intentFamily",
  "metadata",
  "title",
  "answer",
  "summary",
  "confidence",
  "assumptions",
  "questions",
  "actions",
]);

const promptKinds = new Set<AssistantPromptKind>([
  "docs_question",
  "setup_request",
  "refinement_request",
  "unknown",
]);

const intentFamilies = new Set<AssistantIntentFamily>([
  "catalog_showcase",
  "product_catalog",
  "portfolio_projects",
  "services_directory",
  "lead_capture_site",
  "booking_service",
  "editorial_content_hub",
  "site_kit",
  "unknown",
]);

const safeFormAutomationActionTypes = new Set<FormActionType>([
  "email",
  "entry_sync",
  "redirect",
  "success_message",
]);

const actionTypes = new Set<AssistantExecutableActionType>(assistantActionTypes);

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fail = (): never => {
  throw new Error("assistant_action_plan_invalid");
};

const assertRecord = (value: unknown): JsonRecord =>
  isRecord(value) ? value : fail();

const assertKeys = (value: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail();
  }
};

const readText = (value: unknown) => {
  if (typeof value !== "string") {
    fail();
  }
  const text = value as string;
  const trimmed = text.trim();
  if (!trimmed) fail();
  return trimmed;
};

const readOptionalText = (value: unknown) => {
  if (value === undefined || value === null) return null;
  return readText(value);
};

const readBoolean = (value: unknown) => (typeof value === "boolean" ? value : fail());

const readOptionalBoolean = (value: unknown) => {
  if (value === undefined) return undefined;
  return readBoolean(value);
};

const readFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : fail();

const readOptionalFiniteNumber = (value: unknown) => {
  if (value === undefined) return undefined;
  return readFiniteNumber(value);
};

const readOptionalRecord = (value: unknown) => {
  if (value === undefined) return undefined;
  return assertRecord(value);
};

const readStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => readText(item)) : fail();

const readOptionalStringArray = (value: unknown) => {
  if (value === undefined) return undefined;
  return readStringArray(value);
};

const readRecordArray = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(assertRecord) : fail();

const readEnum = <T extends string>(value: unknown, allowed: Set<T>): T => {
  if (typeof value !== "string" || !allowed.has(value as T)) fail();
  return value as T;
};

const readOptionalEnum = <T extends string>(value: unknown, allowed: Set<T>) => {
  if (value === undefined) return undefined;
  return readEnum(value, allowed);
};

const normalizeConfidence = (value: unknown) =>
  Math.max(0, Math.min(1, readFiniteNumber(value)));

const normalizeQuestions = (value: unknown) =>
  readRecordArray(value).map((question) => {
    assertKeys(question, new Set(["id", "label", "description", "required"]));
    return {
      id: readText(question.id),
      label: readText(question.label),
      description: readText(question.description),
      required: readBoolean(question.required),
    };
  });

const normalizePlanMetadata = (value: unknown): AssistantActionPlanMetadata | undefined => {
  if (value === undefined) return undefined;
  const input = assertRecord(value);
  assertKeys(input, new Set(["planner", "providerDraftUsed", "providerId"]));
  return {
    planner: readEnum(input.planner, new Set(["local", "provider", "fallback"])),
    providerDraftUsed: readBoolean(input.providerDraftUsed),
    ...(input.providerId !== undefined ? { providerId: readOptionalText(input.providerId) } : {}),
  };
};

const normalizeSort = (value: unknown) =>
  readRecordArray(value).map((item) => {
    assertKeys(item, new Set(["field", "dir"]));
    return {
      field: readText(item.field),
      dir: readEnum(item.dir, new Set(["asc", "desc"])),
    };
  });

const normalizeContentRouteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["typeSlug", "listPath", "detailPath", "enabled"]));
  return {
    typeSlug: readText(input.typeSlug),
    listPath: readText(input.listPath),
    detailPath: readText(input.detailPath),
    enabled: readBoolean(input.enabled),
  };
};

const normalizeContentTypeInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["slug", "name", "schema"]));
  return {
    slug: readText(input.slug),
    name: readText(input.name),
    schema: assertRecord(input.schema),
  };
};

const normalizeContentTypeDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedEntryCount"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedEntryCount !== undefined
      ? { expectedEntryCount: readOptionalFiniteNumber(input.expectedEntryCount) }
      : {}),
  };
};

const normalizeCustomScreenInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "name",
      "contentTypeSlug",
      "status",
      "showInSidebar",
      "sidebarLabel",
      "blocks",
      "bindings",
    ])
  );
  return {
    name: readText(input.name),
    contentTypeSlug: readText(input.contentTypeSlug),
    status: readEnum(input.status, new Set(["draft", "active"])),
    showInSidebar: readBoolean(input.showInSidebar),
    sidebarLabel: readOptionalText(input.sidebarLabel),
    blocks: readRecordArray(input.blocks),
    bindings: readRecordArray(input.bindings),
  };
};

const normalizeCustomScreenDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedNamePrefix"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedNamePrefix !== undefined
      ? { expectedNamePrefix: readOptionalText(input.expectedNamePrefix) }
      : {}),
  };
};

const normalizeListingQueryInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "name",
      "description",
      "contentTypeSlug",
      "fields",
      "includeDrafts",
      "limit",
      "sort",
    ])
  );
  return {
    name: readText(input.name),
    description: readOptionalText(input.description),
    contentTypeSlug: readText(input.contentTypeSlug),
    fields: readStringArray(input.fields),
    includeDrafts: readBoolean(input.includeDrafts),
    limit: readFiniteNumber(input.limit),
    sort: normalizeSort(input.sort),
  };
};

const normalizeListingQueryDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
  };
};

const normalizeListingTemplateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["name", "slug", "description", "layout", "config"]));
  return {
    name: readText(input.name),
    slug: readText(input.slug),
    description: readOptionalText(input.description),
    layout: readEnum(input.layout, new Set(["grid", "list", "table", "calendar", "map"])),
    config: assertRecord(input.config),
  };
};

const normalizeListingTemplateDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedLayout"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedLayout !== undefined
      ? { expectedLayout: readOptionalText(input.expectedLayout) }
      : {}),
  };
};

const normalizeFormInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "name",
      "slug",
      "status",
      "description",
      "successMessage",
      "submissionAccess",
      "fields",
    ])
  );
  return {
    name: readText(input.name),
    slug: readText(input.slug),
    status: readEnum(input.status, new Set(["draft", "published", "archived"])),
    description: readOptionalText(input.description),
    successMessage: readOptionalText(input.successMessage),
    submissionAccess: readEnum(input.submissionAccess, new Set(["public", "internal"])),
    fields: readRecordArray(input.fields),
  };
};

const normalizeFormDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedStatus"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
  };
};

const normalizeEntryUpsertDraftInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["contentTypeSlug", "title", "slug", "values"]));
  return {
    contentTypeSlug: readText(input.contentTypeSlug),
    title: readText(input.title),
    slug: readText(input.slug),
    values: assertRecord(input.values),
  };
};

const normalizeEntryDeleteInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "contentTypeSlug", "expectedTitle", "expectedSlug", "expectedStatus"])
  );
  return {
    id: readText(input.id),
    ...(input.contentTypeSlug !== undefined
      ? { contentTypeSlug: readOptionalText(input.contentTypeSlug) }
      : {}),
    ...(input.expectedTitle !== undefined
      ? { expectedTitle: readOptionalText(input.expectedTitle) }
      : {}),
    ...(input.expectedSlug !== undefined
      ? { expectedSlug: readOptionalText(input.expectedSlug) }
      : {}),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
  };
};

const readSafeRelativeHref = (value: unknown) => {
  const href = readText(value);
  const hasControlChar = Array.from(href).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("://") ||
    href.includes("\\") ||
    hasControlChar
  ) {
    fail();
  }
  return href;
};

const normalizeMenuItemUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["menuId", "label", "href", "parentId", "orderIndex", "settings"]));
  return {
    menuId: readText(input.menuId),
    label: readText(input.label),
    href: readSafeRelativeHref(input.href),
    ...(input.parentId !== undefined ? { parentId: readOptionalText(input.parentId) } : {}),
    ...(input.orderIndex !== undefined
      ? { orderIndex: readOptionalFiniteNumber(input.orderIndex) }
      : {}),
    ...(input.settings !== undefined ? { settings: assertRecord(input.settings) } : {}),
  };
};

const normalizeMenuItemDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["menuId", "itemId", "label", "expectedHref", "expectedParentId"]));
  return {
    menuId: readText(input.menuId),
    itemId: readText(input.itemId),
    label: readText(input.label),
    ...(input.expectedHref !== undefined
      ? { expectedHref: readOptionalText(input.expectedHref) }
      : {}),
    ...(input.expectedParentId !== undefined
      ? { expectedParentId: readOptionalText(input.expectedParentId) }
      : {}),
  };
};

const normalizeSeoPayload = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["slug", "title", "description", "canonicalUrl", "robots"]));
  return {
    ...(input.slug !== undefined ? { slug: readOptionalText(input.slug) } : {}),
    ...(input.title !== undefined ? { title: readOptionalText(input.title) } : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.canonicalUrl !== undefined
      ? { canonicalUrl: readOptionalText(input.canonicalUrl) }
      : {}),
    ...(input.robots !== undefined ? { robots: readOptionalText(input.robots) } : {}),
  };
};

const normalizeSeoDocumentUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["targetType", "targetId", "seo"]));
  return {
    targetType: readEnum(input.targetType, new Set(["page", "entry"])),
    targetId: readText(input.targetId),
    seo: normalizeSeoPayload(input.seo),
  };
};

const normalizeSeoDocumentDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "targetType", "targetId", "expectedSlug", "expectedTitle"]));
  return {
    id: readText(input.id),
    targetType: readEnum(input.targetType, new Set(["page", "entry"])),
    targetId: readText(input.targetId),
    ...(input.expectedSlug !== undefined
      ? { expectedSlug: readOptionalText(input.expectedSlug) }
      : {}),
    ...(input.expectedTitle !== undefined
      ? { expectedTitle: readOptionalText(input.expectedTitle) }
      : {}),
  };
};

const normalizeMediaReferenceAttachInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["mediaId", "targetType", "targetId", "field"]));
  return {
    mediaId: readText(input.mediaId),
    targetType: readEnum(input.targetType, new Set(["entry"])),
    targetId: readText(input.targetId),
    field: readText(input.field),
  };
};

const normalizeListingQueryFiltersPatchInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["listingQueryName", "filters"]));
  return {
    listingQueryName: readText(input.listingQueryName),
    filters: readRecordArray(input.filters),
  };
};

const normalizeListingTemplateCardPatchInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["listingTemplateSlug", "card"]));
  return {
    listingTemplateSlug: readText(input.listingTemplateSlug),
    card: assertRecord(input.card),
  };
};

const normalizePageWidgetPatchBlock = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["id", "type", "variant", "data", "layout", "visibility", "editor"]));
  return {
    id: readText(input.id),
    type: readText(input.type),
    ...(input.variant !== undefined ? { variant: readText(input.variant) } : {}),
    data: assertRecord(input.data),
    ...(input.layout !== undefined ? { layout: assertRecord(input.layout) } : {}),
    ...(input.visibility !== undefined ? { visibility: assertRecord(input.visibility) } : {}),
    ...(input.editor !== undefined ? { editor: assertRecord(input.editor) } : {}),
  };
};

const unsafePatchPathSegments = new Set(["__proto__", "prototype", "constructor"]);

const normalizeDataPath = (value: unknown) => {
  const path = readStringArray(value);
  if (path.length === 0 || path.length > 6) fail();
  for (const segment of path) {
    if (
      !/^[a-zA-Z0-9_-]+$/.test(segment) ||
      unsafePatchPathSegments.has(segment)
    ) {
      fail();
    }
  }
  return path;
};

const normalizePatchValue = (value: unknown) => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) fail();
    return value;
  }
  fail();
};

const normalizePageWidgetPatchInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "pageSlug",
      "operation",
      "block",
      "blockId",
      "expectedBlockType",
      "dataPath",
      "value",
    ])
  );
  const operation = readEnum(input.operation, new Set(["upsert-block", "patch-data"]));
  if (operation === "upsert-block") {
    return {
      pageSlug: readText(input.pageSlug),
      operation,
      block: normalizePageWidgetPatchBlock(input.block),
    };
  }
  return {
    pageSlug: readText(input.pageSlug),
    operation,
    blockId: readText(input.blockId),
    ...(input.expectedBlockType !== undefined
      ? { expectedBlockType: readOptionalText(input.expectedBlockType) }
      : {}),
    dataPath: normalizeDataPath(input.dataPath),
    value: normalizePatchValue(input.value),
  };
};

const normalizeFormAutomationActionInput = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "id",
      "type",
      "label",
      "enabled",
      "continueOnError",
      "condition",
      "config",
      "orderIndex",
    ])
  );
  const type = readText(input.type);
  if (!safeFormAutomationActionTypes.has(type as FormActionType)) fail();
  if (input.id === undefined) fail();
  return normalizeFormActionInput(input as FormActionInput, 0);
};

const normalizeFormAutomationUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["formId", "action"]));
  return {
    formId: readText(input.formId),
    action: normalizeFormAutomationActionInput(input.action),
  };
};

const normalizeContentListStyle = (value: unknown) => {
  if (value === undefined) return undefined;
  const input = assertRecord(value);
  assertKeys(input, new Set(["columns", "cardStyle"]));
  return {
    ...(input.columns !== undefined
      ? { columns: readEnum(input.columns, new Set(["1", "2", "3"])) }
      : {}),
    ...(input.cardStyle !== undefined
      ? { cardStyle: readEnum(input.cardStyle, new Set(["outlined", "elevated", "minimal"])) }
      : {}),
  };
};

const normalizeListingFilters = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "title",
      "description",
      "autoApply",
      "showSearch",
      "searchPlaceholder",
      "searchLabel",
      "applyLabel",
      "facets",
    ])
  );
  return {
    title: readText(input.title),
    description: readText(input.description),
    autoApply: readBoolean(input.autoApply),
    showSearch: readBoolean(input.showSearch),
    searchPlaceholder: readText(input.searchPlaceholder),
    searchLabel: readText(input.searchLabel),
    applyLabel: readText(input.applyLabel),
    facets: readRecordArray(input.facets),
  };
};

const normalizeFormEmbed = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const input = assertRecord(value);
  assertKeys(input, new Set(["formName", "title", "description", "submitLabel", "successMessage"]));
  return {
    formName: readText(input.formName),
    title: readText(input.title),
    description: readText(input.description),
    submitLabel: readText(input.submitLabel),
    successMessage: readText(input.successMessage),
  };
};

const normalizePageInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "title",
      "slug",
      "status",
      "listingQueryName",
      "listingTemplateSlug",
      "introTitle",
      "introBody",
      "ctaLabel",
      "blocks",
      "contentListStyle",
      "listingFilters",
      "formEmbed",
    ])
  );
  return {
    title: readText(input.title),
    slug: readText(input.slug),
    status: readEnum(input.status, new Set(["draft", "published"])),
    ...(input.listingQueryName !== undefined
      ? { listingQueryName: readText(input.listingQueryName) }
      : {}),
    ...(input.listingTemplateSlug !== undefined
      ? { listingTemplateSlug: readText(input.listingTemplateSlug) }
      : {}),
    introTitle: readText(input.introTitle),
    introBody: readText(input.introBody),
    ...(input.ctaLabel !== undefined ? { ctaLabel: readText(input.ctaLabel) } : {}),
    ...(input.blocks !== undefined
      ? { blocks: readRecordArray(input.blocks).map(normalizePageWidgetPatchBlock) }
      : {}),
    ...(input.contentListStyle !== undefined
      ? { contentListStyle: normalizeContentListStyle(input.contentListStyle) }
      : {}),
    ...(input.listingFilters !== undefined
      ? { listingFilters: normalizeListingFilters(input.listingFilters) }
      : {}),
    ...(input.formEmbed !== undefined
      ? { formEmbed: normalizeFormEmbed(input.formEmbed) }
      : {}),
  };
};

const normalizePageUpdateSettingsPatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["template", "showInNav", "revisionRetention", "seo"]));
  const seo = input.seo === undefined ? undefined : assertRecord(input.seo);
  if (seo) assertKeys(seo, new Set(["title", "description"]));
  return {
    ...(input.template !== undefined ? { template: readText(input.template) } : {}),
    ...(input.showInNav !== undefined ? { showInNav: readBoolean(input.showInNav) } : {}),
    ...(input.revisionRetention !== undefined
      ? { revisionRetention: readFiniteNumber(input.revisionRetention) }
      : {}),
    ...(seo
      ? {
          seo: {
            ...(seo.title !== undefined ? { title: readOptionalText(seo.title) } : {}),
            ...(seo.description !== undefined
              ? { description: readOptionalText(seo.description) }
              : {}),
          },
        }
      : {}),
  };
};

const normalizePageUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["title", "slug", "status", "settings"]));
  return {
    ...(input.title !== undefined ? { title: readText(input.title) } : {}),
    ...(input.slug !== undefined ? { slug: readSafeRelativeHref(input.slug) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "published"])) }
      : {}),
    ...(input.settings !== undefined
      ? { settings: normalizePageUpdateSettingsPatch(input.settings) }
      : {}),
  };
};

const normalizePageUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "title", "slug", "expectedStatus", "patch"]));
  return {
    id: readText(input.id),
    title: readText(input.title),
    slug: readSafeRelativeHref(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    patch: normalizePageUpdatePatch(input.patch),
  };
};

const normalizePageDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "title", "slug", "expectedStatus"]));
  return {
    id: readText(input.id),
    title: readText(input.title),
    slug: readText(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
  };
};

const normalizeWidgetTemplateDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedStatus", "expectedCategory"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    ...(input.expectedCategory !== undefined
      ? { expectedCategory: readOptionalText(input.expectedCategory) }
      : {}),
  };
};

const normalizeWidgetTemplateUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["name", "description", "category", "status", "settings"]));
  const settings = input.settings === undefined ? undefined : assertRecord(input.settings);
  if (settings) assertKeys(settings, new Set(["wrapperContainer", "sectionGap"]));
  return {
    ...(input.name !== undefined ? { name: readText(input.name) } : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.category !== undefined ? { category: readText(input.category) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "published"])) }
      : {}),
    ...(settings
      ? {
          settings: {
            ...(settings.wrapperContainer !== undefined
              ? {
                  wrapperContainer: readEnum(
                    settings.wrapperContainer,
                    new Set(["default", "narrow", "full"])
                  ),
                }
              : {}),
            ...(settings.sectionGap !== undefined
              ? {
                  sectionGap: readEnum(
                    settings.sectionGap,
                    new Set(["none", "xs", "sm", "md", "lg", "xl", "2xl"])
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
};

const normalizeWidgetTemplateUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedStatus", "expectedCategory", "patch"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    ...(input.expectedCategory !== undefined
      ? { expectedCategory: readOptionalText(input.expectedCategory) }
      : {}),
    patch: normalizeWidgetTemplateUpdatePatch(input.patch),
  };
};

const normalizeWidgetTemplateBlockPatchInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "name", "expectedStatus", "blockId", "expectedBlockType", "dataPath", "value"])
  );
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    blockId: readText(input.blockId),
    ...(input.expectedBlockType !== undefined
      ? { expectedBlockType: readOptionalText(input.expectedBlockType) }
      : {}),
    dataPath: normalizeDataPath(input.dataPath),
    value: normalizePatchValue(input.value),
  };
};

const normalizeSiteKitPlanBase = (input: JsonRecord) => ({
  businessType: readText(input.businessType),
  goals: readStringArray(input.goals),
  locale: readText(input.locale),
  ...(input.region !== undefined ? { region: readOptionalText(input.region) } : {}),
  ...(input.siteName !== undefined ? { siteName: readOptionalText(input.siteName) } : {}),
  ...(input.preferredKitId !== undefined
    ? { preferredKitId: readOptionalText(input.preferredKitId) }
    : {}),
  ...(input.selectedKitId !== undefined
    ? { selectedKitId: readOptionalText(input.selectedKitId) }
    : {}),
  ...(input.enabledStepIds !== undefined
    ? { enabledStepIds: readOptionalStringArray(input.enabledStepIds) }
    : {}),
});

const siteKitPlanKeys = [
  "businessType",
  "goals",
  "locale",
  "region",
  "siteName",
  "preferredKitId",
  "selectedKitId",
  "enabledStepIds",
  "preview",
];

const normalizeSiteKitRecommendInput = (input: JsonRecord) => {
  assertKeys(input, new Set(siteKitPlanKeys));
  return {
    ...normalizeSiteKitPlanBase(input),
    preview: assertRecord(input.preview),
  };
};

const normalizeSiteKitInstallInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      ...siteKitPlanKeys,
      "dryRun",
      "continueOnError",
      "settingsPatch",
      "notes",
    ])
  );
  return {
    ...normalizeSiteKitPlanBase(input),
    ...(input.dryRun !== undefined ? { dryRun: readOptionalBoolean(input.dryRun) } : {}),
    ...(input.continueOnError !== undefined
      ? { continueOnError: readOptionalBoolean(input.continueOnError) }
      : {}),
    ...(input.settingsPatch !== undefined
      ? { settingsPatch: readOptionalRecord(input.settingsPatch) }
      : {}),
    ...(input.notes !== undefined ? { notes: readOptionalStringArray(input.notes) } : {}),
    preview: assertRecord(input.preview),
  };
};

const normalizeSiteKitValidateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["runId"]));
  return { runId: readText(input.runId) };
};

const normalizeActionInput = (
  type: AssistantPlannedAction["type"],
  input: unknown
) => {
  const record = assertRecord(input);
  switch (type) {
    case "setting.content-route.upsert":
      return normalizeContentRouteInput(record);
    case "content-type.upsert":
      return normalizeContentTypeInput(record);
    case "content-type.delete":
      return normalizeContentTypeDeleteInput(record);
    case "custom-screen.upsert":
      return normalizeCustomScreenInput(record);
    case "custom-screen.delete":
      return normalizeCustomScreenDeleteInput(record);
    case "listing-query.upsert":
      return normalizeListingQueryInput(record);
    case "listing-query.delete":
      return normalizeListingQueryDeleteInput(record);
    case "listing-template.upsert":
      return normalizeListingTemplateInput(record);
    case "listing-template.delete":
      return normalizeListingTemplateDeleteInput(record);
    case "form.upsert":
      return normalizeFormInput(record);
    case "form.delete":
    case "form.archive":
      return normalizeFormDeleteInput(record);
    case "entry.upsert-draft":
      return normalizeEntryUpsertDraftInput(record);
    case "entry.delete":
      return normalizeEntryDeleteInput(record);
    case "menu.item.upsert":
      return normalizeMenuItemUpsertInput(record);
    case "menu.item.delete":
      return normalizeMenuItemDeleteInput(record);
    case "seo.document.upsert":
      return normalizeSeoDocumentUpsertInput(record);
    case "seo.document.delete":
      return normalizeSeoDocumentDeleteInput(record);
    case "media.reference.attach":
      return normalizeMediaReferenceAttachInput(record);
    case "listing-query.filters.patch":
      return normalizeListingQueryFiltersPatchInput(record);
    case "listing-template.card.patch":
      return normalizeListingTemplateCardPatchInput(record);
    case "page.widget.patch":
      return normalizePageWidgetPatchInput(record);
    case "form.automation.upsert":
      return normalizeFormAutomationUpsertInput(record);
    case "page.upsert":
      return normalizePageInput(record);
    case "page.update":
      return normalizePageUpdateInput(record);
    case "page.delete":
      return normalizePageDeleteInput(record);
    case "widget-template.delete":
      return normalizeWidgetTemplateDeleteInput(record);
    case "widget-template.update":
      return normalizeWidgetTemplateUpdateInput(record);
    case "widget-template.block.patch":
      return normalizeWidgetTemplateBlockPatchInput(record);
    case "site-kit.recommend":
      return normalizeSiteKitRecommendInput(record);
    case "site-kit.install":
      return normalizeSiteKitInstallInput(record);
    case "site-kit.validate":
      return normalizeSiteKitValidateInput(record);
  }
};

const normalizeActions = (value: unknown): AssistantPlannedAction[] =>
  readRecordArray(value).map((action) => {
    assertKeys(action, new Set(["id", "type", "title", "description", "input"]));
    const type = readEnum(action.type, actionTypes);
    return {
      id: readText(action.id),
      type,
      title: readText(action.title),
      description: readText(action.description),
      input: normalizeActionInput(type, action.input),
    } as AssistantPlannedAction;
  });

export const normalizeAssistantActionPlan = (value: unknown): AssistantActionPlan => {
  const input = assertRecord(value);
  assertKeys(input, planKeys);
  const status = readEnum(input.status, new Set<AssistantActionPlanStatus>(["ready", "needs_input"]));
  const questions = normalizeQuestions(input.questions);
  const actions = normalizeActions(input.actions);

  if (status === "ready" && questions.length > 0) fail();
  if (status === "needs_input" && questions.length === 0) fail();

  return {
    id: readText(input.id),
    status,
    intentId: readText(input.intentId),
    ...(input.promptKind !== undefined
      ? { promptKind: readOptionalEnum(input.promptKind, promptKinds) }
      : {}),
    ...(input.intentFamily !== undefined
      ? { intentFamily: readOptionalEnum(input.intentFamily, intentFamilies) }
      : {}),
    ...(input.metadata !== undefined ? { metadata: normalizePlanMetadata(input.metadata) } : {}),
    title: readText(input.title),
    answer: readText(input.answer),
    summary: readText(input.summary),
    confidence: normalizeConfidence(input.confidence),
    assumptions: readStringArray(input.assumptions),
    questions,
    actions,
  };
};

export const assertAssistantActionPlanStrict = normalizeAssistantActionPlan;

export const isAssistantActionPlanStrict = (value: unknown): value is AssistantActionPlan => {
  try {
    normalizeAssistantActionPlan(value);
    return true;
  } catch {
    return false;
  }
};
