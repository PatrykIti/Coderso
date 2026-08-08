import { basename, join } from "node:path";
import { SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { resolveExecutableOnPath } from "../../process-supervisor";
import { runAdminProbe as runAdminProbeDefault } from "./admin-probe";
import { writeAdminAuthState } from "./auth";
import type {
  AdminWidgetResult,
  ParsedArgs,
  PublicWidgetResult,
  SmokeInventory,
  SmokeReport,
  WidgetSmokeCase,
} from "./contracts";
import {
  checkWidgetUrl,
  projectWidgetContractEnvironment,
  resolvePlaywrightCliSessionName,
  WidgetWorkspace,
} from "./environment";
import {
  ensureCommerceWidgetFixtures,
  ensureContentListWidgetFixtures,
  ensureEntryTeaserWidgetFixtures,
  ensureMediaWidgetFixtures,
  ensurePostsFeedWidgetFixtures,
} from "./fixtures";
import { selectCases, validateInventory } from "./inventory";
import {
  runFocusedPublicProbe as runFocusedPublicProbeDefault,
  runPublicProbe as runPublicProbeDefault,
  type WidgetPublicProbeProof,
} from "./public-probe";
import { createFailedAdminMode, finalizeAdminResult, summarize } from "./report";

const LEGACY_SCREENSHOT_DIRECTORY = ".tmp/playwright-widget-contract-smoke/screenshots";

export interface WidgetScreenshotArtifact {
  readonly widgetType: string;
  readonly sourcePath: string;
  readonly reportPath: string;
}

export interface WidgetContractSuiteResult {
  readonly report: SmokeReport;
  readonly screenshots: readonly WidgetScreenshotArtifact[];
  readonly contractElapsedMs: number;
  readonly focusedPublicElapsedMs: number;
  readonly focusedPublicProof: WidgetPublicProbeProof | null;
  readonly browserDispatches: number;
}

export interface WidgetContractSuiteDependencies {
  readonly environment?: NodeJS.ProcessEnv;
  readonly fetch?: typeof globalThis.fetch;
  readonly resolvePlaywrightExecutable?: (pathValue: string) => Promise<string>;
  readonly runAdminProbe?: typeof runAdminProbeDefault;
  readonly runPublicProbe?: typeof runPublicProbeDefault;
  readonly runFocusedPublicProbe?: typeof runFocusedPublicProbeDefault;
  readonly now?: () => number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function prepareFixtures(input: {
  readonly adminUrl: string;
  readonly frontEnabled: boolean;
  readonly sessionValue: string;
  readonly cases: WidgetSmokeCase[];
}): Promise<void> {
  await ensureMediaWidgetFixtures(input.adminUrl, input.sessionValue, input.cases);
  await ensureContentListWidgetFixtures(input.adminUrl, input.sessionValue, input.cases);
  await ensurePostsFeedWidgetFixtures(input.adminUrl, input.sessionValue, input.cases);
  await ensureEntryTeaserWidgetFixtures(input.adminUrl, input.sessionValue, input.cases);
  if (input.frontEnabled) {
    await ensureCommerceWidgetFixtures(input.adminUrl, input.sessionValue, input.cases);
  }
}

function failedAdminResult(item: WidgetSmokeCase, error: string): AdminWidgetResult {
  return finalizeAdminResult(item, {
    widgetType: item.widgetType,
    modes: item.requiredModes.map((mode) => createFailedAdminMode(mode, error)),
  });
}

function projectPublicResults(input: {
  readonly results: PublicWidgetResult[];
  readonly screenshotDirectory: string;
}): {
  readonly results: PublicWidgetResult[];
  readonly screenshots: WidgetScreenshotArtifact[];
} {
  const screenshots: WidgetScreenshotArtifact[] = [];
  const results = input.results.map((result) => {
    const { consoleErrorCount: _consoleCount, pageErrorCount: _pageCount, ...legacy } = result;
    if (result.screenshotPath === undefined) return legacy;
    const expectedName = `public-${result.widgetType.replace(/[^a-z0-9-]/giu, "-").toLowerCase()}.png`;
    const expectedSource = join(input.screenshotDirectory, expectedName);
    if (
      result.screenshotPath !== expectedSource ||
      basename(result.screenshotPath) !== expectedName
    ) {
      throw new SmokeError("smoke_output_invalid", "widget screenshot path drifted");
    }
    const reportPath = `${LEGACY_SCREENSHOT_DIRECTORY}/${expectedName}`;
    screenshots.push({
      widgetType: result.widgetType,
      sourcePath: expectedSource,
      reportPath,
    });
    return { ...legacy, screenshotPath: reportPath };
  });
  return { results, screenshots };
}

async function playwrightAvailable(
  environment: NodeJS.ProcessEnv,
  resolver: (pathValue: string) => Promise<string>
): Promise<boolean> {
  const path = environment.PATH;
  if (typeof path !== "string" || path.length === 0) return false;
  try {
    await resolver(path);
    return true;
  } catch {
    return false;
  }
}

export async function runWidgetContractSuite(input: {
  readonly context: RuntimeSmokeContext;
  readonly args: ParsedArgs;
  readonly inventory: SmokeInventory;
  readonly command: string;
  readonly dependencies?: WidgetContractSuiteDependencies;
}): Promise<WidgetContractSuiteResult> {
  validateInventory(input.inventory);
  const selectedCases = selectCases(input.inventory, input.args);
  const dependencies = input.dependencies ?? {};
  const environment = dependencies.environment ?? process.env;
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  const resolvePlaywright =
    dependencies.resolvePlaywrightExecutable ??
    ((pathValue: string) => resolveExecutableOnPath("playwright-cli", pathValue));
  const available = await playwrightAvailable(environment, resolvePlaywright);
  const adminReachable =
    input.args.dryRun || input.args.skipAdmin
      ? null
      : await checkWidgetUrl(input.args.adminUrl, fetchImpl);
  const frontReachable =
    input.args.dryRun || input.args.skipFront
      ? null
      : await checkWidgetUrl(input.args.frontUrl, fetchImpl);
  const report: SmokeReport = {
    generatedAt: new Date().toISOString(),
    command: input.command,
    dryRun: input.args.dryRun,
    inventory: {
      expectedWidgetCount: input.inventory.expectedWidgetCount,
      actualWidgetCount: input.inventory.widgets.length,
      excludedScreenOnlyWidgets: input.inventory.excludedScreenOnlyWidgets,
      selectedWidgetTypes: selectedCases.map((item) => item.widgetType),
    },
    environment: {
      adminUrl: input.args.adminUrl,
      frontUrl: input.args.frontUrl,
      resolvedPlaywrightSession: input.args.dryRun
        ? undefined
        : resolvePlaywrightCliSessionName(input.args.session),
      adminReachable,
      frontReachable,
      playwrightCliAvailable: available,
    },
    admin: {
      skipped: input.args.skipAdmin || input.args.dryRun,
      loginAttempted: false,
      authenticated: null,
      results: [],
    },
    public: {
      skipped: input.args.skipFront || input.args.dryRun,
      results: [],
    },
    summary: { adminFailures: 0, publicFailures: 0, fixtureGaps: 0, metadataGaps: 0 },
  };

  if (!input.args.dryRun && !available) {
    if (!input.args.skipAdmin) report.admin.error = "playwright_cli_unavailable";
    if (!input.args.skipFront) report.public.error = "playwright_cli_unavailable";
  }
  if (!input.args.dryRun && !input.args.skipAdmin && adminReachable === false) {
    report.admin.error = "admin_unreachable";
  }
  if (!input.args.dryRun && !input.args.skipFront && frontReachable === false) {
    report.public.error = "front_unreachable";
  }

  const now = dependencies.now ?? performance.now.bind(performance);
  const contractStarted = now();
  let focusedPublicElapsedMs = 0;
  let focusedPublicProof: WidgetPublicProbeProof | null = null;
  let browserDispatches = 0;
  let screenshots: WidgetScreenshotArtifact[] = [];

  if (!input.args.dryRun && available) {
    const workspace = await WidgetWorkspace.create(input.context);
    input.context.lifecycle.register(workspace);
    let sessionValue: string | undefined;
    if (!input.args.skipAdmin && adminReachable && !report.admin.error) {
      let projected: Readonly<Record<string, string>>;
      try {
        projected = projectWidgetContractEnvironment(environment);
        const auth = await writeAdminAuthState(
          input.args.adminUrl,
          workspace.paths.authState,
          projected,
          workspace.paths.root
        );
        report.admin.loginAttempted = auth.attempted;
        report.admin.authenticated = auth.authenticated;
        sessionValue = auth.sessionValue;
        if (!auth.authenticated || !sessionValue) {
          report.admin.error = auth.error ?? "login_failed";
        }
      } catch (error) {
        report.admin.error = errorMessage(error);
      }
      if (sessionValue && !report.admin.error) {
        try {
          await prepareFixtures({
            adminUrl: input.args.adminUrl,
            frontEnabled: !input.args.skipFront,
            sessionValue,
            cases: selectedCases,
          });
        } catch (error) {
          report.admin.error = errorMessage(error);
        }
      }
    }

    if (!input.args.skipAdmin && adminReachable && !report.admin.error && sessionValue) {
      const runAdmin = dependencies.runAdminProbe ?? runAdminProbeDefault;
      for (const item of selectedCases) {
        try {
          const probe = await input.context.timing.measure(
            "scenario",
            `widget-admin-${item.widgetType}`,
            () =>
              runAdmin({
                context: input.context,
                workspace: workspace.paths.root,
                authStatePath: workspace.paths.authState,
                baseSession: input.args.session,
                adminUrl: input.args.adminUrl,
                frontUrl: input.args.frontUrl,
                item,
              })
          );
          browserDispatches += 1;
          report.admin.loginAttempted ||= probe.output.login.attempted;
          report.admin.authenticated =
            report.admin.authenticated === false ? false : probe.output.login.authenticated;
          const result = probe.output.results[0];
          report.admin.results.push(
            probe.output.error || result === undefined
              ? failedAdminResult(item, probe.output.error ?? "admin_probe_result_missing")
              : result
          );
        } catch (error) {
          report.admin.results.push(failedAdminResult(item, errorMessage(error)));
        }
      }
    }

    if (!input.args.skipFront && frontReachable && !report.public.error) {
      const runPublic = dependencies.runPublicProbe ?? runPublicProbeDefault;
      try {
        const probe = await input.context.timing.measure("scenario", "widget-public-contract", () =>
          runPublic({
            context: input.context,
            workspace: workspace.paths.root,
            screenshotDirectory: workspace.paths.screenshots,
            baseSession: input.args.session,
            frontUrl: input.args.frontUrl,
            cases: selectedCases,
          })
        );
        browserDispatches += 1;
        const projected = projectPublicResults({
          results: probe.results,
          screenshotDirectory: workspace.paths.screenshots,
        });
        report.public.results = projected.results;
        screenshots = projected.screenshots;
      } catch (error) {
        report.public.error = errorMessage(error);
      }
    }

    const gallerySelected = selectedCases.some((item) => item.widgetType === "gallery-mosaic");
    if (!input.args.skipFront && frontReachable && !report.public.error && gallerySelected) {
      const runFocused = dependencies.runFocusedPublicProbe ?? runFocusedPublicProbeDefault;
      try {
        const focused = await input.context.timing.measure(
          "scenario",
          "gallery-public-error-probe",
          () =>
            runFocused({
              context: input.context,
              workspace: workspace.paths.root,
              baseSession: input.args.session,
              frontUrl: input.args.frontUrl,
            })
        );
        browserDispatches += 1;
        focusedPublicProof = focused.proof;
        focusedPublicElapsedMs = focused.elapsedMs;
      } catch (error) {
        report.public.error = errorMessage(error);
      }
    }
  }

  report.summary = summarize(report);
  const contractElapsedMs = Math.max(
    0,
    Math.ceil(now() - contractStarted - focusedPublicElapsedMs)
  );
  return Object.freeze({
    report,
    screenshots: Object.freeze(screenshots),
    contractElapsedMs,
    focusedPublicElapsedMs,
    focusedPublicProof,
    browserDispatches,
  });
}
