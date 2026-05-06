import type {
  AssistantActionPlan,
  AssistantExecutableActionType,
  AssistantIntentFamily,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";

export type BlueprintProvideKind =
  | "catalog"
  | "lead-capture"
  | "product-inquiry"
  | "editorial-content-hub"
  | "booking"
  | "checkout-payment"
  | "public-detail-page";

export type BlueprintRequirementKind = "capability" | "resource" | "permission";

export type BlueprintResourceKind =
  | "content-type"
  | "content-route"
  | "entry"
  | "custom-screen"
  | "listing-query"
  | "listing-template"
  | "page"
  | "detail-page"
  | "media"
  | "form"
  | "menu"
  | "seo"
  | "widget-template"
  | "site-kit";

export type BlueprintPageSectionKind =
  | "catalog-landing"
  | "form-embed"
  | "lead-capture-landing"
  | "editorial-hub"
  | "content-list";

export type BlueprintAdminSurfaceKind =
  | "custom-screen"
  | "entries"
  | "pages"
  | "forms"
  | "listings";

export type BlueprintGatedKind = "booking" | "checkout-payment" | "detail-page" | "media-import";

export type BlueprintCapabilityRole = "primary" | "adjunct" | "gated";

export type BlueprintProvide = {
  kind: BlueprintProvideKind;
  key: string;
  label: string;
  aliases?: string[];
};

export type BlueprintRequirement = {
  kind: BlueprintRequirementKind;
  key: string;
  label: string;
  optional?: boolean;
};

export type BlueprintMediaResourceMetadata = {
  mode: "existing-asset-reference";
  targetKinds: Array<"entry" | "page" | "widget">;
  field?: string | null;
};

export type BlueprintResourceContribution = {
  key: string;
  kind: BlueprintResourceKind;
  label: string;
  executable: boolean;
  actionTypes: AssistantExecutableActionType[];
  stableTarget: string;
  owner: string;
  metadata?: BlueprintMediaResourceMetadata | Record<string, unknown>;
};

export type BlueprintPageSectionContribution = {
  key: string;
  label: string;
  slot: string;
  kind: BlueprintPageSectionKind;
};

export type BlueprintAdminContribution = {
  key: string;
  label: string;
  surface: BlueprintAdminSurfaceKind;
  routeHint?: string | null;
};

export type BlueprintGatedContribution = {
  key: string;
  kind: BlueprintGatedKind;
  label: string;
  reason: string;
  blocking?: boolean;
};

export type BlueprintMergePolicy = {
  role: BlueprintCapabilityRole;
  resourceStrategy: "dedupe-by-key" | "primary-over-adjunct";
  pageStrategy: "merge-page-upsert" | "keep-separate";
  gatedStrategy: "metadata-only" | "needs-input";
  priority: number;
};

export type BlueprintCapability = {
  id: string;
  version: 1;
  label: string;
  family: string;
  description?: string | null;
  aliases?: string[];
  provides: BlueprintProvide[];
  requires: BlueprintRequirement[];
  resources: BlueprintResourceContribution[];
  pageSections: BlueprintPageSectionContribution[];
  adminSurfaces: BlueprintAdminContribution[];
  gated: BlueprintGatedContribution[];
  merge: BlueprintMergePolicy;
  defaults?: Record<string, unknown>;
};

export type BlueprintCapabilityPlanBuilder = (options?: {
  promptKind?: AssistantPromptKind;
  intentFamily?: AssistantIntentFamily;
}) => AssistantActionPlan;

export type BlueprintCapabilityRegistration = {
  capability: BlueprintCapability;
  buildPlan: BlueprintCapabilityPlanBuilder;
  primaryIntentFamilies: AssistantIntentFamily[];
};

export type BlueprintPromptSignals = {
  normalizedPrompt: string;
  intentFamily: AssistantIntentFamily;
  promptKind: AssistantPromptKind;
  wantsLeadCapture: boolean;
  wantsProductInquiry: boolean;
  wantsEditorialHub: boolean;
  wantsBooking: boolean;
  wantsCheckout: boolean;
  wantsMedia: boolean;
  contextualIntentFamily: AssistantIntentFamily;
};

export type BlueprintCandidate = {
  capabilityId: string;
  role: BlueprintCapabilityRole;
  score: number;
  matchedSignals: string[];
  reasons: string[];
};

export type BlueprintConflict = {
  code: string;
  severity: "warning" | "error";
  message: string;
  capabilityId?: string | null;
  resourceKey?: string | null;
  actionType?: AssistantExecutableActionType | null;
};

export type BlueprintActionFragment = {
  capabilityId: string;
  planId: string;
  title: string;
  assumptions: string[];
  actions: AssistantPlannedAction[];
};

export type BlueprintCompositionNode = BlueprintCandidate & {
  capability: BlueprintCapability;
};

export type BlueprintCompositionGraph = {
  primary: BlueprintCompositionNode | null;
  adjuncts: BlueprintCompositionNode[];
  gated: BlueprintCompositionNode[];
  resources: BlueprintResourceContribution[];
  conflicts: BlueprintConflict[];
  fragments: BlueprintActionFragment[];
  selectedCapabilityIds: string[];
};
