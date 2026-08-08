export const PACKAGE_RESOURCE_KINDS = Object.freeze([
  "content_type",
  "form",
  "page_template",
  "listing_template",
  "content_entry",
  "listing_query",
  "detail_page",
  "page",
  "menu",
  "setting",
] as const);

export type PackageResourceKind = (typeof PACKAGE_RESOURCE_KINDS)[number];

export const PACKAGE_RESOURCE_COLLECTIONS = Object.freeze([
  "contentTypes",
  "forms",
  "pageTemplates",
  "listingTemplates",
  "entries",
  "listingQueries",
  "detailPages",
  "pages",
  "menus",
  "settings",
] as const);

export type PackageResourceCollection = (typeof PACKAGE_RESOURCE_COLLECTIONS)[number];

export const PACKAGE_RESOURCE_KIND_BY_COLLECTION = Object.freeze({
  contentTypes: "content_type",
  forms: "form",
  pageTemplates: "page_template",
  listingTemplates: "listing_template",
  entries: "content_entry",
  listingQueries: "listing_query",
  detailPages: "detail_page",
  pages: "page",
  menus: "menu",
  settings: "setting",
} as const satisfies Record<PackageResourceCollection, PackageResourceKind>);

export const PACKAGE_LIMITS = Object.freeze({
  fileBytes: 8 * 1024 * 1024,
  resourcesTotal: 512,
  resourcesPerCollection: 256,
  referenceEdges: 4_096,
  depth: 64,
  diagnostics: 100,
  keyLength: 128,
  metadataNameLength: 200,
  metadataLocaleLength: 35,
  metadataDescriptionLength: 2_000,
  residualIdLength: 128,
  residualTextLength: 2_000,
  verificationScenarios: 100,
  stringLength: 100_000,
} as const);

export const FULL_SITE_PACKAGE_SETTING_KEYS = Object.freeze([
  "site.name",
  "site.locale",
  "site.homepageId",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.contentRoutes",
  "design.tokens",
] as const);

export type FullSitePackageSettingKey = (typeof FULL_SITE_PACKAGE_SETTING_KEYS)[number];

export type PackageRef = Readonly<{
  ref: PackageResourceKind;
  key: string;
}>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ResourceSeed<TDesired extends JsonObject = JsonObject> = {
  key: string;
  desired: TDesired;
};

export type FullSitePackageResources = {
  contentTypes: ResourceSeed[];
  forms: ResourceSeed[];
  pageTemplates: ResourceSeed[];
  listingTemplates: ResourceSeed[];
  entries: ResourceSeed[];
  listingQueries: ResourceSeed[];
  detailPages: ResourceSeed[];
  pages: ResourceSeed[];
  menus: ResourceSeed[];
  settings: ResourceSeed[];
};

export type VisualResidualImpact = {
  functional: false;
  accessibility: false;
  data: false;
  security: false;
  testIntegrity: false;
};

export type VisualResidual = {
  id: string;
  prototypeEvidence: string;
  cmsConstraint: string;
  installedApproximation: string;
  userVisibleDifference: string;
  impact: VisualResidualImpact;
  postInstallRemediation: string;
};

export type FullSitePackageCompatibility = {
  unresolvedVisuals: VisualResidual[];
};

export type VerificationPlan = {
  scenarioIds: string[];
};

export type FullSitePackageV1 = {
  schemaVersion: 1;
  key: string;
  metadata: {
    name: string;
    locale: string;
    description?: string;
  };
  resources: FullSitePackageResources;
  compatibility?: FullSitePackageCompatibility;
  verification?: VerificationPlan;
};

export type FullSitePackageErrorCode =
  | "site_package_invalid"
  | "site_package_too_large"
  | "site_package_too_complex"
  | "site_package_setting_forbidden";

export type FullSitePackageDiagnostic = Readonly<{
  path: string;
  reason: string;
}>;

export class FullSitePackageError extends Error {
  readonly code: FullSitePackageErrorCode;
  readonly diagnostics: readonly FullSitePackageDiagnostic[];

  constructor(
    code: FullSitePackageErrorCode,
    diagnostics: readonly FullSitePackageDiagnostic[] = []
  ) {
    super(code);
    this.name = "FullSitePackageError";
    this.code = code;
    this.diagnostics = Object.freeze(
      diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic }))
    );
  }
}
