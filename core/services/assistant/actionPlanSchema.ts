import type {
  AssistantActionPlan,
  AssistantActionPlanStatus,
  AssistantExecutableActionType,
  AssistantIntentFamily,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "./actionPlanTypes";
import { assistantActionTypes } from "./actionRegistry";

type JsonRecord = Record<string, unknown>;

const planKeys = new Set([
  "id",
  "status",
  "intentId",
  "promptKind",
  "intentFamily",
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
  "site_kit",
  "unknown",
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
      "contentListStyle",
      "listingFilters",
      "formEmbed",
    ])
  );
  return {
    title: readText(input.title),
    slug: readText(input.slug),
    status: readEnum(input.status, new Set(["draft", "published"])),
    listingQueryName: readText(input.listingQueryName),
    listingTemplateSlug: readText(input.listingTemplateSlug),
    introTitle: readText(input.introTitle),
    introBody: readText(input.introBody),
    ctaLabel: readText(input.ctaLabel),
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
    case "custom-screen.upsert":
      return normalizeCustomScreenInput(record);
    case "listing-query.upsert":
      return normalizeListingQueryInput(record);
    case "listing-template.upsert":
      return normalizeListingTemplateInput(record);
    case "form.upsert":
      return normalizeFormInput(record);
    case "page.upsert":
      return normalizePageInput(record);
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
