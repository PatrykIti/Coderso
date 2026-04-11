import type {
  SiteBuilderBusinessType,
  SiteBuilderGoal,
  SiteBuilderPlanStepId,
  SolutionKitId,
} from "../kits/solutionKitTypes";
import type {
  GuidedSiteBuilderExecuteResult,
  GuidedSiteBuilderPlanResult,
  GuidedSiteBuilderValidationResult,
} from "./siteBuilderExecutor";

export type AssistantActionPlanStatus = "ready" | "needs_input";
export type AssistantPromptKind =
  | "docs_question"
  | "setup_request"
  | "refinement_request"
  | "unknown";
export type AssistantIntentFamily =
  | "catalog_showcase"
  | "product_catalog"
  | "portfolio_projects"
  | "services_directory"
  | "lead_capture_site"
  | "site_kit"
  | "unknown";

export type AssistantSiteKitPlanInput = {
  businessType: SiteBuilderBusinessType;
  goals: SiteBuilderGoal[];
  locale: string;
  region?: string | null;
  siteName?: string | null;
  preferredKitId?: SolutionKitId | null;
  selectedKitId?: SolutionKitId | null;
  enabledStepIds?: SiteBuilderPlanStepId[];
};

export type AssistantSiteKitInstallInput = AssistantSiteKitPlanInput & {
  dryRun?: boolean;
  continueOnError?: boolean;
  settingsPatch?: Record<string, unknown>;
  notes?: string[];
  preview: GuidedSiteBuilderPlanResult;
};

export type AssistantSiteKitPreviewDetails = {
  siteKit?: {
    plan?: GuidedSiteBuilderPlanResult;
  };
};

export type AssistantSiteKitExecutionDetails = {
  siteKit?: {
    plan?: GuidedSiteBuilderPlanResult;
    execution?: GuidedSiteBuilderExecuteResult;
    validation?: GuidedSiteBuilderValidationResult;
  };
};

export type AssistantActionContext = {
  page?: string;
  locale?: string;
  siteKit?: AssistantSiteKitPlanInput;
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

export type AssistantFormUpsertAction = {
  id: string;
  type: "form.upsert";
  title: string;
  description: string;
  input: {
    name: string;
    slug: string;
    status: "draft" | "published" | "archived";
    description: string | null;
    successMessage: string | null;
    submissionAccess: "public" | "internal";
    fields: Array<Record<string, unknown>>;
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
    contentListStyle?: {
      columns?: "1" | "2" | "3";
      cardStyle?: "outlined" | "elevated" | "minimal";
    };
    listingFilters?: {
      title: string;
      description: string;
      autoApply: boolean;
      showSearch: boolean;
      searchPlaceholder: string;
      searchLabel: string;
      applyLabel: string;
      facets: Array<Record<string, unknown>>;
    } | null;
    formEmbed?: {
      formName: string;
      title: string;
      description: string;
      submitLabel: string;
      successMessage: string;
    } | null;
  };
};

export type AssistantSiteKitRecommendAction = {
  id: string;
  type: "site-kit.recommend";
  title: string;
  description: string;
  input: AssistantSiteKitPlanInput & {
    preview: GuidedSiteBuilderPlanResult;
  };
};

export type AssistantSiteKitInstallAction = {
  id: string;
  type: "site-kit.install";
  title: string;
  description: string;
  input: AssistantSiteKitInstallInput;
};

export type AssistantSiteKitValidateAction = {
  id: string;
  type: "site-kit.validate";
  title: string;
  description: string;
  input: {
    runId: string;
  };
};

export type AssistantPlannedAction =
  | AssistantContentRouteUpsertAction
  | AssistantContentTypeUpsertAction
  | AssistantCustomScreenUpsertAction
  | AssistantListingQueryUpsertAction
  | AssistantListingTemplateUpsertAction
  | AssistantFormUpsertAction
  | AssistantPageUpsertAction
  | AssistantSiteKitRecommendAction
  | AssistantSiteKitInstallAction
  | AssistantSiteKitValidateAction;

export type AssistantActionPlan = {
  id: string;
  status: AssistantActionPlanStatus;
  intentId: string;
  promptKind?: AssistantPromptKind;
  intentFamily?: AssistantIntentFamily;
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
  details?: AssistantSiteKitPreviewDetails;
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
  details?: AssistantSiteKitExecutionDetails;
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
  value === "form.upsert" ||
  value === "page.upsert" ||
  value === "site-kit.recommend" ||
  value === "site-kit.install" ||
  value === "site-kit.validate";

export const isAssistantActionPlan = (
  value: unknown
): value is AssistantActionPlan => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.intentId !== "string") return false;
  if (value.status !== "ready" && value.status !== "needs_input") return false;
  if (
    value.promptKind !== undefined &&
    value.promptKind !== "docs_question" &&
    value.promptKind !== "setup_request" &&
    value.promptKind !== "refinement_request" &&
    value.promptKind !== "unknown"
  ) {
    return false;
  }
  if (
    value.intentFamily !== undefined &&
    value.intentFamily !== "catalog_showcase" &&
    value.intentFamily !== "product_catalog" &&
    value.intentFamily !== "portfolio_projects" &&
    value.intentFamily !== "services_directory" &&
    value.intentFamily !== "lead_capture_site" &&
    value.intentFamily !== "site_kit" &&
    value.intentFamily !== "unknown"
  ) {
    return false;
  }
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
