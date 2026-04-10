export type AssistantActionPlanStatus = "ready" | "needs_input";

export type AssistantActionContext = {
  page?: string;
  locale?: string;
};

export type AssistantAdminContext = {
  route: string | null;
  locale: string | null;
  area: "dashboard" | "pages" | "posts" | "coderso" | "settings" | "other";
  codersoModule:
    | "engine"
    | "entries"
    | "custom-screens"
    | "widgets"
    | "forms"
    | "listings"
    | "booking"
    | "commerce"
    | "other"
    | null;
};

export type AssistantPlanQuestion = {
  id: string;
  label: string;
  description: string;
  required: boolean;
};

export type AssistantContentRouteUpsertAction = {
  id: string;
  type: "setting.content-route.upsert";
  title: string;
  description: string;
  input: {
    typeSlug: string;
    listPath: string;
    detailPath: string;
    enabled: boolean;
  };
};

export type AssistantContentTypeUpsertAction = {
  id: string;
  type: "content-type.upsert";
  title: string;
  description: string;
  input: {
    slug: string;
    name: string;
    schema: Record<string, unknown>;
  };
};

export type AssistantCustomScreenUpsertAction = {
  id: string;
  type: "custom-screen.upsert";
  title: string;
  description: string;
  input: {
    name: string;
    contentTypeSlug: string;
    status: "draft" | "active";
    showInSidebar: boolean;
    sidebarLabel: string | null;
    blocks: Array<Record<string, unknown>>;
    bindings: Array<Record<string, unknown>>;
  };
};

export type AssistantListingQueryUpsertAction = {
  id: string;
  type: "listing-query.upsert";
  title: string;
  description: string;
  input: {
    name: string;
    description: string | null;
    contentTypeSlug: string;
    fields: string[];
    includeDrafts: boolean;
    limit: number;
    sort: Array<{ field: string; dir: "asc" | "desc" }>;
  };
};

export type AssistantListingTemplateUpsertAction = {
  id: string;
  type: "listing-template.upsert";
  title: string;
  description: string;
  input: {
    name: string;
    slug: string;
    description: string | null;
    layout: "grid" | "list" | "table" | "calendar" | "map";
    config: Record<string, unknown>;
  };
};

export type AssistantPageUpsertAction = {
  id: string;
  type: "page.upsert";
  title: string;
  description: string;
  input: {
    title: string;
    slug: string;
    status: "draft" | "published";
    listingQueryName: string;
    listingTemplateSlug: string;
    introTitle: string;
    introBody: string;
    ctaLabel: string;
  };
};

export type AssistantPlannedAction =
  | AssistantContentRouteUpsertAction
  | AssistantContentTypeUpsertAction
  | AssistantCustomScreenUpsertAction
  | AssistantListingQueryUpsertAction
  | AssistantListingTemplateUpsertAction
  | AssistantPageUpsertAction;

export type AssistantActionPlan = {
  id: string;
  status: AssistantActionPlanStatus;
  intentId: "house-projects-catalog";
  title: string;
  answer: string;
  summary: string;
  confidence: number;
  assumptions: string[];
  questions: AssistantPlanQuestion[];
  actions: AssistantPlannedAction[];
};

export type AssistantActionOperation = "create" | "update" | "noop";

export type AssistantActionPreviewChange = {
  actionId: string;
  type: AssistantPlannedAction["type"];
  targetType: string;
  targetKey: string;
  operation: AssistantActionOperation;
  summary: string;
  warnings: string[];
};

export type AssistantActionDryRunResult = {
  plan: AssistantActionPlan;
  changes: AssistantActionPreviewChange[];
  warnings: string[];
  readyToExecute: boolean;
};

export type AssistantActionExecutionStatus = "success" | "failed";

export type AssistantActionExecutionItem = {
  actionId: string;
  type: AssistantPlannedAction["type"];
  targetType: string;
  targetKey: string;
  operation: AssistantActionOperation;
  status: AssistantActionExecutionStatus;
  resourceId: string | null;
  adminHref: string | null;
  publicHref: string | null;
  message: string;
  errorCode?: string;
};

export type AssistantActionExecuteResult = {
  plan: AssistantActionPlan;
  preview: AssistantActionDryRunResult;
  results: AssistantActionExecutionItem[];
  summary: {
    create: number;
    update: number;
    noop: number;
    failed: number;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isActionType = (value: unknown): value is AssistantPlannedAction["type"] =>
  value === "setting.content-route.upsert" ||
  value === "content-type.upsert" ||
  value === "custom-screen.upsert" ||
  value === "listing-query.upsert" ||
  value === "listing-template.upsert" ||
  value === "page.upsert";

export const isAssistantActionPlan = (
  value: unknown
): value is AssistantActionPlan => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (value.intentId !== "house-projects-catalog") return false;
  if (value.status !== "ready" && value.status !== "needs_input") return false;
  if (typeof value.title !== "string") return false;
  if (typeof value.answer !== "string") return false;
  if (typeof value.summary !== "string") return false;
  if (typeof value.confidence !== "number") return false;
  if (!isStringArray(value.assumptions)) return false;
  if (!Array.isArray(value.questions)) return false;
  if (!Array.isArray(value.actions)) return false;

  return value.actions.every((action) => {
    if (!isRecord(action)) return false;
    if (typeof action.id !== "string") return false;
    if (!isActionType(action.type)) return false;
    if (typeof action.title !== "string") return false;
    if (typeof action.description !== "string") return false;
    return isRecord(action.input);
  });
};
