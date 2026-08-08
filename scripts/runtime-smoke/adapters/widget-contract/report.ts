import { assertExactKeys, isPlainObject, SmokeError } from "../../contracts";
import {
  type AdminModeResult,
  type AdminWidgetResult,
  type CssCheck,
  type EditorMode,
  type PublicWidgetResult,
  type SmokeReport,
  type WidgetSmokeCase,
} from "./contracts";

export const LEGACY_SCREENSHOT_PATH =
  ".tmp/playwright-widget-contract-smoke/screenshots/public-gallery-mosaic.png";
const GALLERY_WIDGET_TYPE = "gallery-mosaic";
const GALLERY_PUBLIC_PATH = "/gallery-mosaic-test-0516";
const ADMIN_URL = "http://localhost:5173/admin";
const FRONT_URL = "http://localhost:3000";

export interface WidgetContractReportProof {
  readonly screenshotPath: typeof LEGACY_SCREENSHOT_PATH;
  readonly adminPassed: true;
  readonly publicPassed: true;
  readonly mediaPassed: true;
}

function invalid(message: string, cause?: unknown): never {
  throw new SmokeError(
    "smoke_output_invalid",
    message,
    cause === undefined ? undefined : { cause }
  );
}

function boundedString(value: unknown, label: string, maximum = 512): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.includes("\0")
  ) {
    return invalid(`${label} is invalid`);
  }
  return value;
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    invalid(`${label} has unknown or missing fields`);
  }
}

function assertLegacyEnvironment(value: unknown): void {
  if (!isPlainObject(value)) invalid("widget report environment is invalid");
  assertExactKeys(
    value,
    [
      "adminUrl",
      "frontUrl",
      "resolvedPlaywrightSession",
      "adminReachable",
      "frontReachable",
      "playwrightCliAvailable",
    ],
    "widget report environment"
  );
  if (
    value.adminUrl !== ADMIN_URL ||
    value.frontUrl !== FRONT_URL ||
    value.adminReachable !== true ||
    value.frontReachable !== true ||
    value.playwrightCliAvailable !== true
  ) {
    invalid("widget report environment did not prove readiness");
  }
  boundedString(value.resolvedPlaywrightSession, "widget Playwright session", 64);
}

function assertLegacyAdmin(value: unknown): void {
  if (!isPlainObject(value)) invalid("widget admin report is invalid");
  assertAllowedKeys(
    value,
    ["skipped", "loginAttempted", "authenticated", "results"],
    ["error"],
    "widget admin report"
  );
  if (
    value.skipped !== false ||
    value.loginAttempted !== true ||
    value.authenticated !== true ||
    value.error !== undefined ||
    !Array.isArray(value.results) ||
    value.results.length !== 1 ||
    !isPlainObject(value.results[0])
  ) {
    invalid("widget admin contract failed");
  }
  const result = value.results[0];
  assertAllowedKeys(
    result,
    [
      "widgetType",
      "status",
      "pageId",
      "adminPath",
      "modes",
      "duplicateWritablePaths",
      "mediaProof",
    ],
    [
      "contentProof",
      "postsProof",
      "entryTeaserProof",
      "productGalleryProof",
      "productCompareProof",
      "productTableProof",
      "error",
    ],
    "widget admin result"
  );
  if (
    result.widgetType !== GALLERY_WIDGET_TYPE ||
    result.status !== "passed" ||
    result.error !== undefined ||
    !Array.isArray(result.duplicateWritablePaths) ||
    result.duplicateWritablePaths.length !== 0 ||
    !Array.isArray(result.modes) ||
    result.modes.length < 2
  ) {
    invalid("widget admin result did not pass");
  }
  const modes = new Map<string, Record<string, unknown>>();
  for (const mode of result.modes) {
    if (!isPlainObject(mode) || typeof mode.mode !== "string" || modes.has(mode.mode)) {
      invalid("widget admin mode result is invalid");
    }
    modes.set(mode.mode, mode);
  }
  for (const expected of ["visual", "advanced"]) {
    const mode = modes.get(expected);
    if (
      mode === undefined ||
      mode.status !== "passed" ||
      mode.rootCount !== 1 ||
      typeof mode.visibleSectionCount !== "number" ||
      mode.visibleSectionCount <= 0 ||
      mode.controlsWithoutPath !== 0
    ) {
      invalid(`widget ${expected} mode did not pass`);
    }
  }
  if (!isPlainObject(result.mediaProof)) invalid("widget media proof is absent");
  const media = result.mediaProof;
  assertAllowedKeys(
    media,
    [
      "status",
      "adminHasImage",
      "publicHasImage",
      "publicPath",
      "adminAlt",
      "publicAlt",
      "publicLightboxOpened",
      "publicLightboxClosed",
    ],
    ["adminSrc", "publicSrc", "error"],
    "widget media proof"
  );
  if (
    media.status !== "passed" ||
    media.adminHasImage !== true ||
    media.publicHasImage !== true ||
    media.publicPath !== GALLERY_PUBLIC_PATH ||
    media.publicLightboxOpened !== true ||
    media.publicLightboxClosed !== true ||
    media.error !== undefined
  ) {
    invalid("widget media proof did not pass");
  }
}

function assertLegacyPublic(value: unknown): void {
  if (!isPlainObject(value)) invalid("widget public report is invalid");
  assertAllowedKeys(value, ["skipped", "results"], ["error"], "widget public report");
  if (
    value.skipped !== false ||
    value.error !== undefined ||
    !Array.isArray(value.results) ||
    value.results.length !== 1 ||
    !isPlainObject(value.results[0])
  ) {
    invalid("widget public contract failed");
  }
  const result = value.results[0];
  assertAllowedKeys(
    result,
    [
      "widgetType",
      "publicPath",
      "statusCode",
      "status",
      "emptyFixture",
      "bodyOverflow",
      "viewportWidth",
      "documentWidth",
      "screenshotPath",
      "unmarkedOverflowOwners",
    ],
    ["error"],
    "widget public result"
  );
  if (
    result.widgetType !== GALLERY_WIDGET_TYPE ||
    result.publicPath !== GALLERY_PUBLIC_PATH ||
    result.statusCode !== 200 ||
    result.status !== "passed" ||
    result.emptyFixture !== false ||
    result.bodyOverflow !== false ||
    result.screenshotPath !== LEGACY_SCREENSHOT_PATH ||
    !Array.isArray(result.unmarkedOverflowOwners) ||
    result.unmarkedOverflowOwners.length !== 0 ||
    result.error !== undefined
  ) {
    invalid("widget public result did not pass");
  }
}

export function validateWidgetContractReport(value: unknown): WidgetContractReportProof {
  if (!isPlainObject(value)) invalid("widget contract report is invalid");
  assertExactKeys(
    value,
    ["generatedAt", "command", "dryRun", "inventory", "environment", "admin", "public", "summary"],
    "widget contract report"
  );
  boundedString(value.generatedAt, "widget report timestamp", 64);
  boundedString(value.command, "widget report command", 16_384);
  if (value.dryRun !== false || !isPlainObject(value.inventory) || !isPlainObject(value.summary)) {
    invalid("widget contract report header is invalid");
  }
  assertExactKeys(
    value.inventory,
    [
      "expectedWidgetCount",
      "actualWidgetCount",
      "excludedScreenOnlyWidgets",
      "selectedWidgetTypes",
    ],
    "widget report inventory"
  );
  if (
    value.inventory.expectedWidgetCount !== 1 ||
    value.inventory.actualWidgetCount !== 1 ||
    !Array.isArray(value.inventory.selectedWidgetTypes) ||
    value.inventory.selectedWidgetTypes.length !== 1 ||
    value.inventory.selectedWidgetTypes[0] !== GALLERY_WIDGET_TYPE
  ) {
    invalid("widget report inventory drifted");
  }
  assertExactKeys(
    value.summary,
    ["adminFailures", "publicFailures", "fixtureGaps", "metadataGaps"],
    "widget report summary"
  );
  if (Object.values(value.summary).some((count) => count !== 0)) {
    invalid("widget report summary contains a failure");
  }
  assertLegacyEnvironment(value.environment);
  assertLegacyAdmin(value.admin);
  assertLegacyPublic(value.public);
  return Object.freeze({
    screenshotPath: LEGACY_SCREENSHOT_PATH,
    adminPassed: true,
    publicPassed: true,
    mediaPassed: true,
  });
}

export function extractCliJson<T>(stdout: string): T {
  const marker = "### Result";
  const markerIndex = stdout.indexOf(marker);
  let raw = stdout.trim();
  if (markerIndex >= 0) {
    const afterMarker = stdout.slice(markerIndex + marker.length).trimStart();
    const nextSectionIndex = afterMarker.search(/\r?\n###\s/);
    raw = (nextSectionIndex >= 0 ? afterMarker.slice(0, nextSectionIndex) : afterMarker).trim();
  } else {
    throw new Error("playwright_cli_result_missing");
  }
  const first = JSON.parse(raw) as unknown;
  const parsed = typeof first === "string" ? (JSON.parse(first) as unknown) : first;
  return parsed as T;
}
export function summarize(report: SmokeReport): SmokeReport["summary"] {
  const adminFailures =
    report.admin.results.filter((item) => item.status === "failed").length +
    (report.admin.error ? 1 : 0);
  const publicFailures =
    report.public.results.filter((item) => item.status === "failed").length +
    (report.public.error ? 1 : 0);
  const fixtureGaps =
    report.admin.results.filter(
      (item) =>
        item.status === "fixture-gap" || item.modes.some((mode) => mode.status === "fixture-gap")
    ).length + report.public.results.filter((item) => item.status === "fixture-gap").length;
  const metadataGaps = report.admin.results.filter(
    (item) =>
      item.status === "metadata-gap" || item.modes.some((mode) => mode.controlsWithoutPath > 0)
  ).length;
  return { adminFailures, publicFailures, fixtureGaps, metadataGaps };
}

export function renderMarkdown(report: SmokeReport): string {
  const lines = [
    "# Widget Contract Smoke Results",
    "",
    `- **Generated:** ${report.generatedAt}`,
    `- **Dry run:** ${report.dryRun ? "yes" : "no"}`,
    `- **Inventory:** ${report.inventory.actualWidgetCount}/${report.inventory.expectedWidgetCount} widgets`,
    `- **Admin:** ${report.admin.skipped ? "skipped" : report.environment.adminUrl}`,
    `- **Frontend:** ${report.public.skipped ? "skipped" : report.environment.frontUrl}`,
    report.environment.resolvedPlaywrightSession
      ? `- **Playwright session:** ${report.environment.resolvedPlaywrightSession}`
      : undefined,
    "",
    "## Run Health",
    "",
    `- Playwright CLI: ${report.environment.playwrightCliAvailable ? "available" : "unavailable"}`,
    `- Admin reachable: ${report.environment.adminReachable === null ? "not checked" : report.environment.adminReachable ? "yes" : "no"}`,
    `- Frontend reachable: ${report.environment.frontReachable === null ? "not checked" : report.environment.frontReachable ? "yes" : "no"}`,
    `- Admin auth: ${report.admin.authenticated === null ? "not checked" : report.admin.authenticated ? "authenticated" : "failed"}`,
    "",
    "## Summary",
    "",
    `- Admin failures: ${report.summary.adminFailures}`,
    `- Public failures: ${report.summary.publicFailures}`,
    `- Fixture gaps: ${report.summary.fixtureGaps}`,
    `- Metadata gaps: ${report.summary.metadataGaps}`,
    "",
    "## Admin Mode Contract",
    "",
    "| Widget | Status | Modes | Duplicate paths | Notes |",
    "|---|---|---|---|---|",
    ...report.admin.results.map((item) => {
      const modes = item.modes
        .map((mode) => {
          const error = mode.error ? ` (${mode.error})` : "";
          return `${mode.mode}:${mode.status} r${mode.rootCount}/s${mode.sectionCount}/v${mode.visibleSectionCount}${error}`;
        })
        .join("<br>");
      const mediaProof = item.mediaProof
        ? `media proof: ${item.mediaProof.status}${item.mediaProof.error ? ` (${item.mediaProof.error})` : ""}`
        : undefined;
      const productGalleryProof = item.productGalleryProof
        ? `product gallery proof: ${item.productGalleryProof.status}${
            item.productGalleryProof.error ? ` (${item.productGalleryProof.error})` : ""
          }`
        : undefined;
      const productCompareProof = item.productCompareProof
        ? `product compare proof: ${item.productCompareProof.status}${
            item.productCompareProof.error ? ` (${item.productCompareProof.error})` : ""
          }`
        : undefined;
      const productTableProof = item.productTableProof
        ? `product table proof: ${item.productTableProof.status}${
            item.productTableProof.error ? ` (${item.productTableProof.error})` : ""
          }`
        : undefined;
      const contentProof = item.contentProof
        ? `content proof: ${item.contentProof.status}${item.contentProof.error ? ` (${item.contentProof.error})` : ""}`
        : undefined;
      const postsProof = item.postsProof
        ? `posts proof: ${item.postsProof.status}${item.postsProof.error ? ` (${item.postsProof.error})` : ""}`
        : undefined;
      const entryTeaserProof = item.entryTeaserProof
        ? `entry teaser proof: ${item.entryTeaserProof.status}${
            item.entryTeaserProof.error ? ` (${item.entryTeaserProof.error})` : ""
          }`
        : undefined;
      const notes = [
        item.error,
        mediaProof,
        productGalleryProof,
        productCompareProof,
        productTableProof,
        contentProof,
        postsProof,
        entryTeaserProof,
      ]
        .filter(Boolean)
        .join("; ");
      return `| \`${item.widgetType}\` | ${item.status} | ${modes || "-"} | ${item.duplicateWritablePaths.join(", ") || "-"} | ${notes || "-"} |`;
    }),
    "",
    "## Public CSS Smoke",
    "",
    "| Widget | Status | Path | HTTP | Overflow | Notes |",
    "|---|---|---|---|---|---|",
    ...report.public.results.map((item) => {
      const overflow = item.bodyOverflow === undefined ? "-" : item.bodyOverflow ? "yes" : "no";
      const notes = [
        item.error,
        item.emptyFixture ? "empty fixture" : undefined,
        item.screenshotPath ? `screenshot: ${item.screenshotPath}` : undefined,
      ]
        .filter(Boolean)
        .join("; ");
      return `| \`${item.widgetType}\` | ${item.status} | ${item.publicPath ?? "-"} | ${item.statusCode ?? "-"} | ${overflow} | ${notes || "-"} |`;
    }),
  ].filter((line): line is string => typeof line === "string");
  return `${lines.join("\n")}\n`;
}

export function createFailedAdminMode(mode: EditorMode, error: string): AdminModeResult {
  return {
    mode,
    status: "failed",
    rootCount: 0,
    sectionCount: 0,
    visibleSectionCount: 0,
    writablePaths: [],
    controlsWithoutPath: 0,
    error,
  };
}

export function createAdminFixtureGapMode(mode: EditorMode, error: string): AdminModeResult {
  return {
    mode,
    status: "fixture-gap",
    rootCount: 0,
    sectionCount: 0,
    visibleSectionCount: 0,
    writablePaths: [],
    controlsWithoutPath: 0,
    error: `admin_fixture_unopenable:${error}`,
  };
}

export function isAdminFixtureUnopenableError(error: string | undefined): boolean {
  return error === "block_select_missing" || error === "widget_block_type_missing";
}

export function findDuplicateWritablePaths(
  modes: AdminModeResult[],
  allowedDuplicateWritablePaths: WidgetSmokeCase["allowedDuplicateWritablePaths"] = []
): string[] {
  const allowed = new Set(allowedDuplicateWritablePaths.map((entry) => entry.path));
  const owners = new Map<string, Set<EditorMode>>();
  for (const mode of modes) {
    for (const path of mode.writablePaths) {
      const current = owners.get(path) ?? new Set<EditorMode>();
      current.add(mode.mode);
      owners.set(path, current);
    }
  }
  return Array.from(owners.entries())
    .filter(([path, modeOwners]) => modeOwners.size > 1 && !allowed.has(path))
    .map(([path]) => path);
}

export function finalizeAdminResult(
  item: WidgetSmokeCase,
  partial: Omit<AdminWidgetResult, "status" | "duplicateWritablePaths">
): AdminWidgetResult {
  if (partial.modes.length === 0 && !partial.error) {
    return {
      ...partial,
      status: "failed",
      duplicateWritablePaths: [],
      error: "admin_modes_missing",
    };
  }
  if (partial.error) {
    return {
      ...partial,
      status: "failed",
      duplicateWritablePaths: [],
    };
  }
  const hasMetadataGap = partial.modes.some((mode) => mode.controlsWithoutPath > 0);
  const hasFixtureGap = partial.modes.some((mode) => mode.status === "fixture-gap");
  const duplicates =
    hasMetadataGap || hasFixtureGap
      ? []
      : findDuplicateWritablePaths(partial.modes, item.allowedDuplicateWritablePaths);
  const hasFailure =
    partial.modes.some((mode) => mode.status === "failed") || duplicates.length > 0;
  return {
    ...partial,
    status: hasFailure
      ? "failed"
      : hasFixtureGap
        ? "fixture-gap"
        : hasMetadataGap
          ? "metadata-gap"
          : "passed",
    duplicateWritablePaths: duplicates,
  };
}

export function classifyPublicStatus(input: {
  cssChecks: CssCheck[];
  statusCode: number | null;
  emptyFixture: boolean;
  bodyOverflow: boolean;
  unmarkedOverflowOwnerCount: number;
}): Pick<PublicWidgetResult, "status" | "error"> {
  const hasHttpFailure = !input.statusCode || input.statusCode < 200 || input.statusCode >= 400;
  const hasBodyOverflowFailure =
    input.cssChecks.includes("body-overflow") &&
    input.bodyOverflow &&
    input.unmarkedOverflowOwnerCount > 0;
  const hasCardOverflowFailure =
    input.cssChecks.includes("card-overflow") && input.unmarkedOverflowOwnerCount > 0;
  if (input.emptyFixture) return { status: "fixture-gap", error: "public_fixture_empty" };
  if (hasHttpFailure) return { status: "failed", error: "public_http_failed" };
  if (hasBodyOverflowFailure) return { status: "failed", error: "body_overflow_unmarked" };
  if (hasCardOverflowFailure) return { status: "failed", error: "card_overflow_unmarked" };
  return { status: "passed", error: undefined };
}

export function shouldCountOverflowOwner(input: {
  className?: string;
  ariaHidden?: string | null;
  hidden?: boolean;
  hasIntentionalOverflowAncestor?: boolean;
  hasApprovedIntentionalOverflowAncestor?: boolean;
  display?: string;
  visibility?: string;
  width?: number;
  height?: number;
  clip?: string;
  clipPath?: string;
  scrollWidth: number;
  clientWidth: number;
}): boolean {
  if (input.hasApprovedIntentionalOverflowAncestor) return false;
  if (input.ariaHidden === "true" || input.hidden) return false;
  if (input.className && /\bsr-only\b/.test(input.className)) return false;
  if (input.display === "none" || input.visibility === "hidden") return false;
  if ((input.width ?? 0) <= 1 || (input.height ?? 0) <= 1) return false;
  if (input.clip === "rect(0px, 0px, 0px, 0px)" || input.clipPath === "inset(50%)") {
    return false;
  }
  return input.scrollWidth > input.clientWidth + 1 && input.clientWidth > 0;
}

export function hasStrictFailure(report: SmokeReport): boolean {
  return (
    report.summary.adminFailures > 0 ||
    report.summary.publicFailures > 0 ||
    report.summary.fixtureGaps > 0 ||
    report.summary.metadataGaps > 0 ||
    Boolean(report.admin.error || report.public.error)
  );
}
