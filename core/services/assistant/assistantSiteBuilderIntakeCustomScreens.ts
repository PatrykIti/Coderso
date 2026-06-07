import type {
  AssistantSiteBuilderContentEngineDecision,
  AssistantSiteBuilderContentEngineDecisionResult,
} from "./assistantSiteBuilderIntakeContentEngines";
import type { AssistantSiteBuilderContentEngineId } from "./assistantSiteBuilderIntakeTypes";
import type { CustomScreenCollectionRole } from "../customScreens/customScreenSchemas";

export type AssistantSiteBuilderCustomScreenPermission = "content:read" | "content:write";

export type AssistantSiteBuilderCustomScreenCandidate = {
  engineId: AssistantSiteBuilderContentEngineId;
  engineLabel: string;
  screenKey: string;
  name: string;
  contentTypeSlug: string;
  adminPath: string;
  status: "supported";
  actionFamily: "custom-screen.upsert";
  collectionRole: CustomScreenCollectionRole;
  compositionKey: string;
  showInSidebar: true;
  sidebarLabel: string;
  audience: "beginner";
  permissions: AssistantSiteBuilderCustomScreenPermission[];
  routeMode: "internal-admin";
  createMode: "editor-view";
  rowClickMode: "editor-view";
  writeMode: "entry";
  requiresPublicWriteEndpoint: false;
  summary: string;
};

export type AssistantSiteBuilderCustomScreenGate = {
  code:
    | "custom_screen_unsupported"
    | "custom_screen_route_invalid"
    | "custom_screen_permission_invalid";
  severity: "error";
  engineId: AssistantSiteBuilderContentEngineId;
  message: string;
};

export type AssistantSiteBuilderCustomScreenDecisionResult = {
  schemaVersion: 1;
  candidates: AssistantSiteBuilderCustomScreenCandidate[];
  gates: AssistantSiteBuilderCustomScreenGate[];
  summary: string;
};

export type AssistantSiteBuilderCustomScreenDecisionOptions = {
  supportedEngineIds?: readonly AssistantSiteBuilderContentEngineId[];
  routeOverrides?: Partial<Record<AssistantSiteBuilderContentEngineId, string>>;
  permissionOverrides?: Partial<Record<AssistantSiteBuilderContentEngineId, readonly string[]>>;
};

const defaultSupportedEngineIds = new Set<AssistantSiteBuilderContentEngineId>([
  "services",
  "products",
  "portfolio",
  "case-studies",
  "blog",
  "team",
  "locations",
  "faq",
  "testimonials",
]);

const engineProfiles = Object.freeze({
  services: {
    screenKey: "services-workspace",
    name: "Services workspace",
    contentTypeSlug: "service",
    sidebarLabel: "Services",
    summary: "Beginners will edit service offers, categories, and service details.",
  },
  products: {
    screenKey: "products-workspace",
    name: "Products workspace",
    contentTypeSlug: "product",
    sidebarLabel: "Products",
    summary: "Beginners will edit product records, listing fields, and product details.",
  },
  portfolio: {
    screenKey: "portfolio-workspace",
    name: "Portfolio workspace",
    contentTypeSlug: "project",
    sidebarLabel: "Portfolio",
    summary: "Beginners will edit project records, proof points, and project details.",
  },
  "case-studies": {
    screenKey: "case-studies-workspace",
    name: "Case studies workspace",
    contentTypeSlug: "case-study",
    sidebarLabel: "Case studies",
    summary: "Beginners will edit case-study records, outcomes, and story details.",
  },
  blog: {
    screenKey: "blog-workspace",
    name: "Blog workspace",
    contentTypeSlug: "post",
    sidebarLabel: "Blog",
    summary: "Beginners will edit posts, resources, and editorial records.",
  },
  team: {
    screenKey: "team-workspace",
    name: "Team workspace",
    contentTypeSlug: "team-member",
    sidebarLabel: "Team",
    summary: "Beginners will edit people, roles, and contributor records.",
  },
  locations: {
    screenKey: "locations-workspace",
    name: "Locations workspace",
    contentTypeSlug: "location",
    sidebarLabel: "Locations",
    summary: "Beginners will edit branches, venues, service areas, and location details.",
  },
  faq: {
    screenKey: "faq-workspace",
    name: "FAQ workspace",
    contentTypeSlug: "faq",
    sidebarLabel: "FAQ",
    summary: "Beginners will edit reusable questions and answers.",
  },
  testimonials: {
    screenKey: "testimonials-workspace",
    name: "Testimonials workspace",
    contentTypeSlug: "testimonial",
    sidebarLabel: "Testimonials",
    summary: "Beginners will edit reviews, quotes, references, and proof records.",
  },
} satisfies Record<
  AssistantSiteBuilderContentEngineId,
  {
    screenKey: string;
    name: string;
    contentTypeSlug: string;
    sidebarLabel: string;
    summary: string;
  }
>);

const stablePathSegmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const requiredPermissions = ["content:read", "content:write"] as const;
const allowedPermissions = new Set<AssistantSiteBuilderCustomScreenPermission>(requiredPermissions);

const buildAdminPath = (screenKey: string) => `/admin/advanced/custom-screens/${screenKey}/entries`;

const isSafeAdminPath = (path: string, screenKey: string) =>
  path === buildAdminPath(screenKey) &&
  !path.includes("://") &&
  !path.includes("//") &&
  !path.includes("..") &&
  !path.includes("?") &&
  !path.includes("#") &&
  path
    .split("/")
    .filter(Boolean)
    .every((segment) => /^[a-z0-9-]+$/.test(segment));

const isAllowedPermission = (
  permission: string
): permission is AssistantSiteBuilderCustomScreenPermission =>
  allowedPermissions.has(permission as AssistantSiteBuilderCustomScreenPermission);

const isExactRequiredPermissionSet = (
  permissions: readonly string[]
): permissions is AssistantSiteBuilderCustomScreenPermission[] =>
  permissions.length === requiredPermissions.length &&
  permissions.every(isAllowedPermission) &&
  requiredPermissions.every((permission) => permissions.includes(permission));

const getSupportedEngineIds = (
  values: readonly AssistantSiteBuilderContentEngineId[] | undefined
) => (values ? new Set(values) : defaultSupportedEngineIds);

const buildGate = (
  engineId: AssistantSiteBuilderContentEngineId,
  code: AssistantSiteBuilderCustomScreenGate["code"],
  message: string
): AssistantSiteBuilderCustomScreenGate => ({
  code,
  severity: "error",
  engineId,
  message,
});

const buildCandidate = (
  decision: AssistantSiteBuilderContentEngineDecision,
  options: AssistantSiteBuilderCustomScreenDecisionOptions
): {
  candidate: AssistantSiteBuilderCustomScreenCandidate | null;
  gates: AssistantSiteBuilderCustomScreenGate[];
} => {
  const profile = engineProfiles[decision.id];
  const adminPath = options.routeOverrides?.[decision.id] ?? buildAdminPath(profile.screenKey);
  const requestedPermissions = [
    ...(options.permissionOverrides?.[decision.id] ?? ["content:read", "content:write"]),
  ];
  const gates: AssistantSiteBuilderCustomScreenGate[] = [];

  if (!stablePathSegmentPattern.test(profile.screenKey)) {
    gates.push(
      buildGate(
        decision.id,
        "custom_screen_route_invalid",
        "Custom screen keys must be stable backend-owned path segments."
      )
    );
  }
  if (!isSafeAdminPath(adminPath, profile.screenKey)) {
    gates.push(
      buildGate(
        decision.id,
        "custom_screen_route_invalid",
        "Custom screen admin paths must stay inside the internal custom-screens area."
      )
    );
  }
  if (!isExactRequiredPermissionSet(requestedPermissions)) {
    gates.push(
      buildGate(
        decision.id,
        "custom_screen_permission_invalid",
        "Custom screen decisions may only request content read/write permissions."
      )
    );
  }
  if (gates.length > 0) return { candidate: null, gates };

  return {
    gates: [],
    candidate: {
      engineId: decision.id,
      engineLabel: decision.label,
      screenKey: profile.screenKey,
      name: profile.name,
      contentTypeSlug: profile.contentTypeSlug,
      adminPath,
      status: "supported",
      actionFamily: "custom-screen.upsert",
      collectionRole: "canonical-admin-screen",
      compositionKey: `guided-${decision.id}`,
      showInSidebar: true,
      sidebarLabel: profile.sidebarLabel,
      audience: "beginner",
      permissions: [...requiredPermissions],
      routeMode: "internal-admin",
      createMode: "editor-view",
      rowClickMode: "editor-view",
      writeMode: "entry",
      requiresPublicWriteEndpoint: false,
      summary: profile.summary,
    },
  };
};

export const resolveSiteBuilderIntakeCustomScreens = (
  contentEngines: AssistantSiteBuilderContentEngineDecisionResult,
  options: AssistantSiteBuilderCustomScreenDecisionOptions = {}
): AssistantSiteBuilderCustomScreenDecisionResult => {
  const supported = getSupportedEngineIds(options.supportedEngineIds);
  const candidates: AssistantSiteBuilderCustomScreenCandidate[] = [];
  const gates: AssistantSiteBuilderCustomScreenGate[] = [];

  for (const decision of contentEngines.decisions) {
    if (!decision.requiresCustomScreen) continue;
    if (!supported.has(decision.id)) {
      gates.push(
        buildGate(
          decision.id,
          "custom_screen_unsupported",
          `The ${decision.label} engine does not have a supported beginner editing surface yet.`
        )
      );
      continue;
    }

    const result = buildCandidate(decision, options);
    gates.push(...result.gates);
    if (result.candidate) candidates.push(result.candidate);
  }

  return {
    schemaVersion: 1,
    candidates,
    gates,
    summary:
      candidates.length > 0
        ? `Beginner editing surfaces: ${candidates.map((candidate) => candidate.sidebarLabel).join(", ")}.`
        : "No beginner custom-screen surfaces are needed for static-only pages.",
  };
};
