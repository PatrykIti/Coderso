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
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";
import { isAssistantActionPlanStrict } from "./actionPlanSchema";

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
  includeResourceCatalog?: boolean;
  resourceCatalog?: AssistantResourceCatalogSnapshot;
  runtimeSnapshot?: AssistantAdminRuntimeSnapshot;
};

export type AssistantAdminRuntimeActionKind =
  | "navigate"
  | "create"
  | "edit"
  | "publish"
  | "delete"
  | "execute"
  | "configure";

export type AssistantAdminRuntimeSelectedResource = {
  kind: string;
  id: string;
};

export type AssistantAdminRuntimeVisibleAction = {
  id: string;
  label: string;
  kind: AssistantAdminRuntimeActionKind;
  href: string | null;
  requiredPermission: string | null;
};

export type AssistantAdminRuntimePermissionHints = {
  known: boolean;
  requiredForVisibleActions: string[];
  reason: "frontend_user_has_no_permissions" | "server_enriched" | "not_available";
};

export type AssistantAdminRuntimeSnapshot = {
  schemaVersion: 1;
  route: string | null;
  activeHref: string | null;
  area: AssistantAdminContext["area"];
  codersoModule: AssistantAdminContext["codersoModule"];
  selectedResource: AssistantAdminRuntimeSelectedResource | null;
  visibleActions: AssistantAdminRuntimeVisibleAction[];
  permissionHints: AssistantAdminRuntimePermissionHints;
};

export type AssistantAdminContext = {
  route: string | null;
  locale: string | null;
  resourceCatalog: AssistantResourceCatalogSnapshot | null;
  runtimeSnapshot: AssistantAdminRuntimeSnapshot | null;
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

export const isAssistantActionPlan = (
  value: unknown
): value is AssistantActionPlan => isAssistantActionPlanStrict(value);
