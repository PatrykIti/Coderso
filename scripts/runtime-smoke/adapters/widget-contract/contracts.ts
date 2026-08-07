export type EditorMode = "wizard" | "visual" | "advanced";
export type CssCheck = "body-overflow" | "card-overflow" | "empty-fixture";
export type SmokeStatus = "passed" | "failed" | "fixture-gap" | "metadata-gap" | "skipped";

export type WidgetSmokeCase = {
  widgetType: string;
  title: string;
  adminInsertLabel: string;
  adminFixtureSlug: string;
  publicPath?: string | null;
  publicFixtureStatus?: "published" | "draft-only" | "missing" | "shared-page";
  requiredModes: EditorMode[];
  cssChecks?: CssCheck[];
  priority?: "P0" | "P1" | "P2";
  notes?: string;
  allowedDuplicateWritablePaths?: Array<{
    path: string;
    reason: string;
    expiresWithTask: string;
  }>;
};

export type AdminProbeSmokeCase = WidgetSmokeCase & {
  mediaProofPublicPath?: string | null;
};

export type SmokeInventory = {
  version: 1;
  expectedWidgetCount: number;
  excludedScreenOnlyWidgets: string[];
  widgets: WidgetSmokeCase[];
};

export const APPROVED_INTENTIONAL_OVERFLOW_SELECTORS: Record<string, string[]> = {
  "pricing-plans": ['[data-pricing-comparison-scroll="true"]'],
  "product-compare": ['[data-product-compare-scroll-region="table"]'],
  "product-table": ['[data-product-table-scroll-region="table"]'],
  testimonials: ['[data-testimonials-list="slider-static"]'],
};

export type ParsedArgs = {
  session: string;
  adminUrl: string;
  frontUrl: string;
  inventoryPath: string;
  outputJsonPath: string;
  outputMarkdownPath: string;
  widgetType?: string;
  limit?: number;
  dryRun: boolean;
  skipAdmin: boolean;
  skipFront: boolean;
  strict: boolean;
  keepOpen: boolean;
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type AdminAuthStateResult = {
  attempted: boolean;
  authenticated: boolean;
  sessionValue?: string;
  error?: string;
};

export type AdminModeResult = {
  mode: EditorMode;
  status: SmokeStatus;
  rootCount: number;
  sectionCount: number;
  visibleSectionCount: number;
  writablePaths: string[];
  controlsWithoutPath: number;
  error?: string;
};

export type WidgetMediaProofResult = {
  status: SmokeStatus;
  adminHasImage: boolean;
  publicHasImage: boolean;
  publicPath?: string | null;
  adminAlt?: string | null;
  publicAlt?: string | null;
  adminSrc?: string | null;
  publicSrc?: string | null;
  adminHasAttachment?: boolean;
  publicHasAttachment?: boolean;
  adminAttachmentHref?: string | null;
  publicAttachmentHref?: string | null;
  sanitizerGuidanceShown?: boolean;
  unsafeHrefBlocked?: boolean;
  rawIframeBlocked?: boolean;
  publicLightboxOpened?: boolean;
  publicLightboxClosed?: boolean;
  error?: string;
};

export type WidgetContentListProofResult = {
  status: SmokeStatus;
  adminItemCount: number;
  publicItemCount: number;
  adminHasImage: boolean;
  publicHasImage: boolean;
  adminHasTags: boolean;
  publicHasTags: boolean;
  adminHasCta: boolean;
  publicHasCta: boolean;
  adminHasLoadMore: boolean;
  publicHasViewAll: boolean;
  publicPath?: string | null;
  error?: string;
};

export type WidgetPostsFeedProofResult = WidgetContentListProofResult;
export type WidgetEntryTeaserProofResult = WidgetContentListProofResult & {
  adminReadyCount: number;
  publicReadyCount: number;
  consoleErrors: string[];
};
export type WidgetProductGalleryProofResult = {
  status: SmokeStatus;
  adminItemCount: number;
  publicItemCount: number;
  adminHasImage: boolean;
  publicHasImage: boolean;
  adminHasReadyLinks: boolean;
  publicHasReadyLinks: boolean;
  adminHasViewAll: boolean;
  publicHasViewAll: boolean;
  publicPath?: string | null;
  error?: string;
};
export type WidgetProductCompareProofResult = {
  status: SmokeStatus;
  adminItemCount: number;
  publicItemCount: number;
  adminHasImage: boolean;
  publicHasImage: boolean;
  adminHasTitleLinks: boolean;
  publicHasTitleLinks: boolean;
  adminHasCta: boolean;
  publicHasCta: boolean;
  publicPath?: string | null;
  error?: string;
};
export type WidgetProductTableProofResult = WidgetProductCompareProofResult;

export type AdminWidgetResult = {
  widgetType: string;
  status: SmokeStatus;
  adminPath?: string;
  pageId?: string;
  modes: AdminModeResult[];
  duplicateWritablePaths: string[];
  mediaProof?: WidgetMediaProofResult;
  contentProof?: WidgetContentListProofResult;
  postsProof?: WidgetPostsFeedProofResult;
  entryTeaserProof?: WidgetEntryTeaserProofResult;
  productGalleryProof?: WidgetProductGalleryProofResult;
  productCompareProof?: WidgetProductCompareProofResult;
  productTableProof?: WidgetProductTableProofResult;
  error?: string;
};

export type PublicWidgetResult = {
  widgetType: string;
  status: SmokeStatus;
  publicPath?: string | null;
  statusCode?: number | null;
  emptyFixture?: boolean;
  bodyOverflow?: boolean;
  viewportWidth?: number;
  documentWidth?: number;
  screenshotPath?: string;
  consoleErrorCount?: number;
  pageErrorCount?: number;
  unmarkedOverflowOwners?: Array<{
    tag: string;
    className: string;
    text: string;
    scrollWidth: number;
    clientWidth: number;
  }>;
  error?: string;
};

export type SmokeReport = {
  generatedAt: string;
  command: string;
  dryRun: boolean;
  inventory: {
    expectedWidgetCount: number;
    actualWidgetCount: number;
    excludedScreenOnlyWidgets: string[];
    selectedWidgetTypes: string[];
  };
  environment: {
    adminUrl: string;
    frontUrl: string;
    resolvedPlaywrightSession?: string;
    adminReachable: boolean | null;
    frontReachable: boolean | null;
    playwrightCliAvailable: boolean;
  };
  admin: {
    skipped: boolean;
    loginAttempted: boolean;
    authenticated: boolean | null;
    results: AdminWidgetResult[];
    error?: string;
  };
  public: {
    skipped: boolean;
    results: PublicWidgetResult[];
    error?: string;
  };
  summary: {
    adminFailures: number;
    publicFailures: number;
    fixtureGaps: number;
    metadataGaps: number;
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
