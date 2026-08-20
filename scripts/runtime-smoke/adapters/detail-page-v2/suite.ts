// TASK-580-03-L07 detail-page-v2 smoke suite orchestration.
// Uses the shared lifecycle/processes/repository/timing primitives, the shared
// supervised dev host, shared admin auth, and the shared Playwright dispatcher.
// Five independently checkpointed scenarios with visible-effect assertions.
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { createAdminAuthStorageState } from "../../browser/admin-auth";
import type { SupervisedServerResource } from "../../server/supervised-server";
import { startDetailPageV2DevHost } from "./host";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import { WidgetWorkspace } from "../widget-contract/environment";
import type { SmokeScreenshotResult } from "../types";
import {
  ADMIN_URL,
  FRONT_URL,
  MAX_SCREENSHOT_BYTES,
  PNG_SIGNATURE,
  SMOKE_EVIDENCE_ROOT,
  assertDetailPageV2SuiteReport,
  type DetailPageV2ScenarioResult,
  type DetailPageV2SuiteReport,
} from "./contracts";
import {
  createDetailPagePreviewToken,
  createFixtureSet,
  runCatalogFamilyBlueprintActions,
  seedCatalogFamilyDetailPage,
} from "./fixtures";
import { fetchAdminCsrfToken, requestAdminJson } from "../widget-contract/auth";
import type { DetailPageV2FixturePlan } from "./fixtures";
import {
  assertStrictEvidence,
  buildAssistantGeneratedProbeSource,
  buildDetailPageV2PlanFilter,
  buildEditorRoundtripProbeSource,
  buildLegacyPlaceholderProbeSource,
  buildPreviewTokenProbeSource,
  buildPublicConvertedProbeSource,
  runDetailPageV2BrowserProbe,
  type DetailPageV2ProbeEvidence,
} from "./browser-plan";

const ADMIN_BASE = "http://127.0.0.1:5173";

function sessionName(session: string): string {
  return session
    .toLowerCase()
    .replace(/[^a-z0-9-]/gu, "-")
    .slice(0, 47);
}

async function persistScreenshot(
  context: RuntimeSmokeContext,
  sourcePath: string,
  scenario: string
): Promise<SmokeScreenshotResult> {
  const source = resolveInsideRoot(context.root, sourcePath, "detail-page-v2 screenshot source");
  const bytes = await readFile(source);
  if (
    bytes.byteLength <= PNG_SIGNATURE.length / 2 ||
    bytes.byteLength > MAX_SCREENSHOT_BYTES ||
    bytes.subarray(0, PNG_SIGNATURE.length / 2).toString("hex") !== PNG_SIGNATURE
  ) {
    throw new SmokeError("smoke_output_invalid", `${scenario} screenshot is not a bounded PNG`);
  }
  const relativeEvidencePath = `${SMOKE_EVIDENCE_ROOT}/detail-page-v2-${context.input.session}-${scenario}.png`;
  const evidencePath = resolveInsideRoot(
    context.root,
    relativeEvidencePath,
    "detail-page-v2 evidence path"
  );
  await mkdir(dirname(evidencePath), { recursive: true, mode: 0o700 });
  const staged = resolve(dirname(source), `${scenario}-evidence.png`);
  await writeFile(staged, bytes, { mode: 0o600 });
  await rename(staged, evidencePath);
  return Object.freeze({
    path: relativeEvidencePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

async function readCurrentDetailPageDocument(input: {
  sessionValue: string;
  detailPageId: string;
}): Promise<Record<string, unknown>> {
  const record = await requestAdminJson<{
    currentDocument?: unknown;
    status?: string;
  }>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: `/api/detail-pages/${input.detailPageId}`,
  });
  if (
    record.currentDocument === null ||
    typeof record.currentDocument !== "object" ||
    Array.isArray(record.currentDocument)
  ) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 current document is invalid");
  }
  return record.currentDocument as Record<string, unknown>;
}

async function addPreviewMarkerToDraft(input: {
  sessionValue: string;
  detailPageId: string;
  marker: string;
  runId: string;
}): Promise<void> {
  const document = await readCurrentDetailPageDocument(input);
  const markerSection = {
    id: `l07-preview-${input.runId}`,
    type: "content",
    name: "Preview Only",
    variant: "default",
    layout: {
      columns: 1,
      align: "start",
      justify: "start",
      maxWidth: 1080,
      stackVertical: false,
    },
    style: {
      background: "#ffffff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
    },
    spacing: {
      paddingTop: 64,
      paddingBottom: 64,
      paddingLeft: 40,
      paddingRight: 40,
      gap: 24,
    },
    visibility: {
      visible: true,
      authOnly: false,
      anchor: null,
      startsAt: null,
      endsAt: null,
    },
    responsive: {},
    blocks: [
      {
        id: `l07-preview-${input.runId}-marker`,
        type: "text",
        props: { text: input.marker },
        visibility: { visible: true },
      },
    ],
  };
  const sections = Array.isArray(document.sections) ? (document.sections as unknown[]) : [];
  const csrfToken = await fetchAdminCsrfToken(ADMIN_URL, input.sessionValue);
  await requestAdminJson<{ id: string }>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: `/api/detail-pages/${input.detailPageId}`,
    method: "PATCH",
    body: {
      document: {
        ...document,
        id: input.detailPageId,
        status: "draft",
        sections: [...sections, markerSection],
      },
    },
    csrfToken,
  });
}

async function createCatalogEntry(input: {
  sessionValue: string;
  slug: string;
  title: string;
}): Promise<{ id: string }> {
  const entry = await requestAdminJson<{ id: string }>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: `/api/content/house-projects/entries`,
    method: "POST",
    body: {
      title: input.title,
      slug: input.slug,
      data: {
        title: input.title,
        slug: input.slug,
        summary: "Entry generated by the catalog-family blueprint smoke.",
        areaM2: 180,
        rooms: 5,
        projectStatus: "available",
      },
    },
    csrfToken: await fetchAdminCsrfToken(ADMIN_URL, input.sessionValue),
  });
  return entry;
}

function buildPublicDetailUrl(plan: DetailPageV2FixturePlan): string {
  return `${FRONT_URL}/${plan.slug}/demo-home-${plan.runId}`;
}

function asRecordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry) => entry !== null && typeof entry === "object")
    : [];
}

async function findAndDelete(input: {
  sessionValue: string;
  csrf: string;
  listPath: string;
  listShape: "array" | "items";
  match: (record: Record<string, unknown>) => boolean;
  deletePath: (id: string) => string;
}): Promise<boolean> {
  const list = await requestAdminJson<unknown>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: input.listPath,
  }).catch(() => null);
  if (list === null) return false;
  const records =
    input.listShape === "items" && list !== null ? (list as { items?: unknown }).items : list;
  const record = asRecordList(records).find(input.match);
  if (record === undefined) return false;
  const id = record.id;
  if (typeof id !== "string") return false;
  await requestAdminJson<{ ok: boolean }>({
    adminUrl: ADMIN_URL,
    sessionValue: input.sessionValue,
    path: input.deletePath(id),
    method: "DELETE",
    body: {},
    csrfToken: input.csrf,
  }).catch(() => undefined);
  return true;
}

// Deletes every artifact the catalog-family blueprint plan created for the
// house-projects preset (detail page, content type, custom screen, listing
// query, listing template, catalog page). Scoped by the preset's stable ids,
// slugs, and names; content-type delete cascades the created entry.
async function cleanupCatalogFamilyArtifacts(sessionValue: string): Promise<void> {
  const csrf = await fetchAdminCsrfToken(ADMIN_URL, sessionValue);
  await requestAdminJson<{ ok: boolean }>({
    adminUrl: ADMIN_URL,
    sessionValue,
    path: "/api/detail-pages/5f9c2ed6-4df0-55ef-8c8f-7ab7f6b7f301",
    method: "DELETE",
    body: {},
    csrfToken: csrf,
  }).catch(() => undefined);
  await findAndDelete({
    sessionValue,
    csrf,
    listPath: "/api/custom-screens",
    listShape: "items",
    match: (record) => record.name === "House Projects",
    deletePath: (id) => `/api/custom-screens/${id}`,
  });
  await findAndDelete({
    sessionValue,
    csrf,
    listPath: "/api/listings/queries",
    listShape: "items",
    match: (record) => record.name === "House Projects Catalog Query",
    deletePath: (id) => `/api/listings/queries/${id}`,
  });
  await findAndDelete({
    sessionValue,
    csrf,
    listPath: "/api/listings/templates",
    listShape: "items",
    match: (record) => record.slug === "house-projects-catalog-grid",
    deletePath: (id) => `/api/listings/templates/${id}`,
  });
  await findAndDelete({
    sessionValue,
    csrf,
    listPath: "/api/pages",
    listShape: "array",
    match: (record) => record.slug === "/projekty-domow",
    deletePath: (id) => `/api/pages/${id}`,
  });
  await findAndDelete({
    sessionValue,
    csrf,
    listPath: "/api/content-types",
    listShape: "array",
    match: (record) => record.slug === "house-projects",
    deletePath: (id) => `/api/content-types/${id}`,
  });
}

export async function runDetailPageV2Suite(
  context: RuntimeSmokeContext
): Promise<DetailPageV2SuiteReport> {
  const session = sessionName(context.input.session);
  const workspace = await WidgetWorkspace.create(context);
  context.lifecycle.register(workspace);
  const screenshotsDir = resolve(workspace.paths.screenshots);
  await mkdir(screenshotsDir, { recursive: true, mode: 0o700 });

  let server: SupervisedServerResource | null = null;
  let fixture: Awaited<ReturnType<typeof createFixtureSet>> | null = null;
  let sessionValue: string | null = null;
  let primary: unknown = null;
  const scenarioResults: DetailPageV2ScenarioResult[] = [];
  const screenshots: SmokeScreenshotResult[] = [];

  try {
    server = await context.timing.measure("phase", "detail-page-v2-host", () =>
      startDetailPageV2DevHost(context)
    );

    const auth = await context.timing.measure("phase", "detail-page-v2-auth", () =>
      createAdminAuthStorageState({
        adminUrl: ADMIN_URL,
        workspace: workspace.paths.root,
        storageStatePath: workspace.paths.authState,
        environment: process.env,
      })
    );
    if (!auth.authenticated || auth.sessionValue === undefined) {
      throw new SmokeError(
        "smoke_authentication_failed",
        `detail-page-v2 admin auth failed: ${auth.error ?? "unknown"}`
      );
    }
    sessionValue = auth.sessionValue;

    const dispatcher = new PlaywrightCliDispatcher({
      context,
      session,
      workspace: workspace.paths.root,
      runCodeTimeoutMs: 300_000,
      segments: Object.freeze([
        "public-detail-converted",
        "preview-token",
        "editor-roundtrip",
        "legacy-placeholder",
        "assistant-generated",
      ]),
    });
    context.lifecycle.register(dispatcher);
    await dispatcher.loadStorageState(workspace.paths.authState);

    fixture = await context.timing.measure("phase", "detail-page-v2-fixtures", () =>
      createFixtureSet(context, sessionValue!)
    );
    const plan = fixture.plan;
    const publicDetailUrl = buildPublicDetailUrl(plan);

    // Scenario 1: public detail page (converted FormaDom v2 document)
    const publicScreenshotPath = `${screenshotsDir}/public-detail-converted.png`;
    const scenario1 = await context.timing.measure("scenario", "public-detail-converted", () =>
      runDetailPageV2BrowserProbe({
        context,
        session,
        workspace: workspace.paths.root,
        segmentId: "public-detail-converted",
        source: buildPublicConvertedProbeSource({
          frontUrl: FRONT_URL,
          detailUrl: publicDetailUrl,
          expectedTitle: plan.entryTitle,
          screenshotPath: publicScreenshotPath,
        }),
        dispatcher,
        storageStateLoaded: true,
      })
    );
    const evidence1 = assertStrictEvidence(scenario1.output, "public-detail-converted");
    if (evidence1.pass && evidence1.screenshotPath !== null) {
      screenshots.push(
        await persistScreenshot(context, evidence1.screenshotPath, "public-detail-converted")
      );
    }
    scenarioResults.push(
      Object.freeze({
        id: "public-detail-converted" as const,
        pass: evidence1.pass,
        elapsedMs: scenario1.elapsedMs,
        screenshot: screenshots.at(-1) ?? null,
        consoleErrors: evidence1.consoleErrors,
        variant: "light" as const,
      })
    );
    if (!evidence1.pass) throw new SmokeError("smoke_process_failed", evidence1.message);

    // Scenario 2: detail-page preview token renders the CURRENT draft
    const previewMarker = `L07-PREVIEW-ONLY-${plan.runId}`;
    await context.timing.measure("phase", "detail-page-v2-preview-draft", () =>
      addPreviewMarkerToDraft({
        sessionValue: sessionValue!,
        detailPageId: plan.detailPageId,
        marker: previewMarker,
        runId: plan.runId,
      })
    );
    const preview = await context.timing.measure("phase", "detail-page-v2-preview-token", () =>
      createDetailPagePreviewToken({
        sessionValue: sessionValue!,
        detailPageId: plan.detailPageId,
        sampleEntryId: plan.entryId,
      })
    );
    const previewScreenshotPath = `${screenshotsDir}/preview-token.png`;
    const scenario2 = await context.timing.measure("scenario", "preview-token", () =>
      runDetailPageV2BrowserProbe({
        context,
        session,
        workspace: workspace.paths.root,
        segmentId: "preview-token",
        source: buildPreviewTokenProbeSource({
          previewUrl: preview.previewUrl,
          marker: previewMarker,
          screenshotPath: previewScreenshotPath,
        }),
        dispatcher,
        storageStateLoaded: true,
      })
    );
    const evidence2 = assertStrictEvidence(scenario2.output, "preview-token");
    if (evidence2.pass && evidence2.screenshotPath !== null) {
      screenshots.push(await persistScreenshot(context, evidence2.screenshotPath, "preview-token"));
    }
    scenarioResults.push(
      Object.freeze({
        id: "preview-token" as const,
        pass: evidence2.pass,
        elapsedMs: scenario2.elapsedMs,
        screenshot: screenshots.at(-1) ?? null,
        consoleErrors: evidence2.consoleErrors,
        variant: "light" as const,
      })
    );
    if (!evidence2.pass) throw new SmokeError("smoke_process_failed", evidence2.message);

    // Scenario 3: editor round-trip (add section+block, save, dark mode, publish, front parity)
    const editorUrl =
      `${ADMIN_BASE}/admin/advanced/engine/${plan.contentTypeId}/` +
      `collection/detail-template/${plan.detailPageId}`;
    const editorScreenshotPath = `${screenshotsDir}/editor-light.png`;
    const editorDarkScreenshotPath = `${screenshotsDir}/editor-dark.png`;
    const editorPublicScreenshotPath = `${screenshotsDir}/editor-public.png`;
    const scenario3 = await context.timing.measure("scenario", "editor-roundtrip", () =>
      runDetailPageV2BrowserProbe({
        context,
        session,
        workspace: workspace.paths.root,
        segmentId: "editor-roundtrip",
        source: buildEditorRoundtripProbeSource({
          adminUrl: ADMIN_URL,
          editorUrl,
          frontUrl: FRONT_URL,
          detailUrl: publicDetailUrl,
          detailPageId: plan.detailPageId,
          runId: plan.runId,
          lightScreenshotPath: editorScreenshotPath,
          darkScreenshotPath: editorDarkScreenshotPath,
          publicScreenshotPath: editorPublicScreenshotPath,
        }),
        dispatcher,
        storageStateLoaded: true,
      })
    );
    const evidence3 = assertStrictEvidence(scenario3.output, "editor-roundtrip");
    if (evidence3.pass) {
      for (const editorShot of [
        editorScreenshotPath,
        editorDarkScreenshotPath,
        editorPublicScreenshotPath,
      ]) {
        screenshots.push(await persistScreenshot(context, editorShot, "editor-roundtrip"));
      }
    }
    scenarioResults.push(
      Object.freeze({
        id: "editor-roundtrip" as const,
        pass: evidence3.pass,
        elapsedMs: scenario3.elapsedMs,
        screenshot: screenshots.at(-1) ?? null,
        consoleErrors: evidence3.consoleErrors,
        variant: "dark" as const,
      })
    );
    if (!evidence3.pass) throw new SmokeError("smoke_process_failed", evidence3.message);

    // Scenario 4: legacy placeholder (booking-calendar unmapped widget)
    const legacyDetailUrl = `${FRONT_URL}/${plan.legacySlug}/legacy-booking-${plan.runId}`;
    const legacyScreenshotPath = `${screenshotsDir}/legacy-placeholder.png`;
    const scenario4 = await context.timing.measure("scenario", "legacy-placeholder", () =>
      runDetailPageV2BrowserProbe({
        context,
        session,
        workspace: workspace.paths.root,
        segmentId: "legacy-placeholder",
        source: buildLegacyPlaceholderProbeSource({
          frontUrl: FRONT_URL,
          detailUrl: legacyDetailUrl,
          marker: plan.legacyMarker,
          screenshotPath: legacyScreenshotPath,
        }),
        dispatcher,
        storageStateLoaded: true,
      })
    );
    const evidence4 = assertStrictEvidence(scenario4.output, "legacy-placeholder");
    if (evidence4.pass && evidence4.screenshotPath !== null) {
      screenshots.push(
        await persistScreenshot(context, evidence4.screenshotPath, "legacy-placeholder")
      );
    }
    scenarioResults.push(
      Object.freeze({
        id: "legacy-placeholder" as const,
        pass: evidence4.pass,
        elapsedMs: scenario4.elapsedMs,
        screenshot: screenshots.at(-1) ?? null,
        consoleErrors: evidence4.consoleErrors,
        variant: "light" as const,
      })
    );
    if (!evidence4.pass) throw new SmokeError("smoke_process_failed", evidence4.message);

    // Scenario 5: assistant catalog-family blueprint generates the detail page
    const blueprintModule =
      await import("../../../../core/services/assistant/blueprints/catalogFamilyBlueprint");
    const presetModule =
      await import("../../../../core/services/assistant/blueprints/catalogFamilyPresets");
    const fullPlan = blueprintModule.buildCatalogFamilyPlan(
      presetModule.HOUSE_PROJECTS_CATALOG_PRESET
    );
    // Re-provision the deterministic detail template the plan pins through
    // expectedExistingId (normally seeded by the full-site install kit and
    // removed by this suite's own cleanup), so the plan's detail-page.upsert
    // takes the update path instead of failing with detail_page_not_found.
    await context.timing.measure("phase", "detail-page-v2-catalog-seed", () =>
      seedCatalogFamilyDetailPage({
        sessionValue: sessionValue!,
        plan: fullPlan,
      })
    );
    const planActions = buildDetailPageV2PlanFilter(fullPlan);
    const execution = await context.timing.measure("phase", "detail-page-v2-catalog-plan", () =>
      runCatalogFamilyBlueprintActions({
        sessionValue: sessionValue!,
        slug: "house-projects",
        idempotencyKey: `l07-catalog-house-projects-${plan.runId}`,
        plan: { ...fullPlan, actions: planActions },
      })
    );
    const summary =
      execution !== null &&
      typeof execution === "object" &&
      !Array.isArray(execution) &&
      (execution as { summary?: unknown }).summary !== null &&
      typeof (execution as { summary?: unknown }).summary === "object" &&
      !Array.isArray((execution as { summary?: unknown }).summary)
        ? ((execution as { summary?: unknown }).summary as { failed?: unknown })
        : null;
    if (summary === null || typeof summary.failed !== "number" || summary.failed !== 0) {
      throw new SmokeError(
        "smoke_process_failed",
        `catalog blueprint execution failed: ${JSON.stringify(execution).slice(0, 400)}`
      );
    }
    const catalogEntryTitle = `Catalog Demo House ${plan.runId}`;
    const catalogEntry = await context.timing.measure("phase", "detail-page-v2-catalog-entry", () =>
      createCatalogEntry({
        sessionValue: sessionValue!,
        slug: `catalog-demo-${plan.runId}`,
        title: catalogEntryTitle,
      })
    );
    await requestAdminJson<{ ok: boolean }>({
      adminUrl: ADMIN_URL,
      sessionValue: sessionValue!,
      path: `/api/content/house-projects/entries/${catalogEntry.id}/publish`,
      method: "POST",
      body: {},
      csrfToken: await fetchAdminCsrfToken(ADMIN_URL, sessionValue!),
    });
    const catalogDetailUrl = `${FRONT_URL}/projekty-domow/catalog-demo-${plan.runId}`;
    const catalogScreenshotPath = `${screenshotsDir}/assistant-generated.png`;
    const scenario5 = await context.timing.measure("scenario", "assistant-generated", () =>
      runDetailPageV2BrowserProbe({
        context,
        session,
        workspace: workspace.paths.root,
        segmentId: "assistant-generated",
        source: buildAssistantGeneratedProbeSource({
          frontUrl: FRONT_URL,
          detailUrl: catalogDetailUrl,
          expectedTitle: catalogEntryTitle,
          screenshotPath: catalogScreenshotPath,
        }),
        dispatcher,
        storageStateLoaded: true,
      })
    );
    const evidence5 = assertStrictEvidence(scenario5.output, "assistant-generated");
    if (evidence5.pass && evidence5.screenshotPath !== null) {
      screenshots.push(
        await persistScreenshot(context, evidence5.screenshotPath, "assistant-generated")
      );
    }
    scenarioResults.push(
      Object.freeze({
        id: "assistant-generated" as const,
        pass: evidence5.pass,
        elapsedMs: scenario5.elapsedMs,
        screenshot: screenshots.at(-1) ?? null,
        consoleErrors: evidence5.consoleErrors,
        variant: "light" as const,
      })
    );
    if (!evidence5.pass) throw new SmokeError("smoke_process_failed", evidence5.message);

    // Cleanup (scoped fixtures only): restore routes first so the S5 route
    // entries leave, then delete catalog artifacts and S1 fixtures.
    await context.timing.measure("cleanup", "detail-page-v2-routes", () =>
      fixture!.restoreContentRoutes()
    );
    await context.timing.measure("cleanup", "detail-page-v2-catalog", () =>
      cleanupCatalogFamilyArtifacts(sessionValue!)
    );
    await context.timing.measure("cleanup", "detail-page-v2-fixtures", () => fixture!.cleanup());
  } catch (error) {
    primary = error;
  } finally {
    if (fixture !== null && primary !== null && sessionValue !== null) {
      try {
        await fixture.restoreContentRoutes();
      } catch {
        // Preserve the primary failure.
      }
      try {
        await fixture.cleanup();
      } catch {
        // Preserve the primary failure.
      }
    }
    if (server !== null) {
      await server.close().catch(() => undefined);
    }
  }

  if (primary !== null) throw primary;
  const report: DetailPageV2SuiteReport = Object.freeze({
    scenarios: Object.freeze(scenarioResults),
    screenshots: Object.freeze(screenshots),
    serverUp: true,
  });
  assertDetailPageV2SuiteReport(report);
  return report;
}
