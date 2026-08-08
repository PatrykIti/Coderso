import { SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import { ADMIN_PROBE_SOURCE_A } from "./admin-probe-source-a";
import { ADMIN_PROBE_SOURCE_B } from "./admin-probe-source-b";
import { runWidgetBrowserProbe } from "./browser-session";
import { isRecord, type AdminWidgetResult, type WidgetSmokeCase } from "./contracts";
import { mediaFixtureSeeds, productGalleryFixtureMediaOriginalName } from "./fixture-data";
import { resolveWidgetAdminSession } from "./environment";
import { resolveWidgetMediaProofPublicPath } from "./fixture-selection";

export interface AdminProbeOutput {
  readonly login: {
    readonly attempted: boolean;
    readonly authenticated: boolean | null;
    readonly error?: string | null;
  };
  readonly results: AdminWidgetResult[];
  readonly error?: string;
}

export function buildAdminProbeCode(
  adminUrl: string,
  frontUrl: string,
  cases: WidgetSmokeCase[]
): string {
  const probeCases = cases.map((item) => ({
    ...item,
    mediaProofPublicPath: resolveWidgetMediaProofPublicPath(item),
  }));
  return `async (page) => {
  const adminUrl = ${JSON.stringify(adminUrl.replace(/\/$/u, ""))};
  const frontUrl = ${JSON.stringify(frontUrl.replace(/\/$/u, ""))};
  const cases = ${JSON.stringify(probeCases)};
  const productGalleryMediaFixture = ${JSON.stringify(
    mediaFixtureSeeds.find((seed) => seed.originalName === productGalleryFixtureMediaOriginalName)
  )};
  const commerceProductMediaFixture = productGalleryMediaFixture;
  const logoCloudMediaFixture = ${JSON.stringify(
    mediaFixtureSeeds.find((seed) => seed.originalName === "widget-fixture-logo-cloud-acme.svg")
  )};
  const galleryMosaicImageFixture = ${JSON.stringify(
    mediaFixtureSeeds.find(
      (seed) => seed.originalName === "widget-fixture-gallery-mosaic-image.svg"
    )
  )};
  const teamPhotoFixture = ${JSON.stringify(
    mediaFixtureSeeds.find((seed) => seed.originalName === "widget-fixture-team-photo.svg")
  )};
  const richTextSectionImageFixture = ${JSON.stringify(
    mediaFixtureSeeds.find(
      (seed) => seed.originalName === "widget-fixture-rich-text-section-image.svg"
    )
  )};
  const richTextSectionDocumentFixture = ${JSON.stringify(
    mediaFixtureSeeds.find(
      (seed) => seed.originalName === "widget-fixture-rich-text-section-document.pdf"
    )
  )};
  const requiredLogin = { attempted: false, authenticated: null, error: null };
  const consoleErrors = [];
  page.on("dialog", async (dialog) => {
    await dialog.accept().catch(() => undefined);
  });
${ADMIN_PROBE_SOURCE_A}
${ADMIN_PROBE_SOURCE_B}
}`;
}

function validateAdminProbeOutput(value: unknown): AdminProbeOutput {
  if (
    !isRecord(value) ||
    !isRecord(value.login) ||
    !Array.isArray(value.results) ||
    value.results.some((result) => !isRecord(result)) ||
    typeof value.login.attempted !== "boolean" ||
    (value.login.authenticated !== null && typeof value.login.authenticated !== "boolean") ||
    (value.error !== undefined && typeof value.error !== "string")
  ) {
    throw new SmokeError("smoke_output_invalid", "widget Admin probe output is invalid");
  }
  return value as unknown as AdminProbeOutput;
}

export async function runAdminProbe(input: {
  readonly context: RuntimeSmokeContext;
  readonly workspace: string;
  readonly authStatePath: string;
  readonly baseSession: string;
  readonly adminUrl: string;
  readonly frontUrl: string;
  readonly item: WidgetSmokeCase;
}): Promise<{ readonly output: AdminProbeOutput; readonly elapsedMs: number }> {
  const segmentId = `admin-${input.item.widgetType}`;
  const result = await runWidgetBrowserProbe({
    context: input.context,
    session: resolveWidgetAdminSession(input.baseSession, input.item.widgetType),
    workspace: input.workspace,
    segmentId,
    source: buildAdminProbeCode(input.adminUrl, input.frontUrl, [input.item]),
    storageStatePath: input.authStatePath,
  });
  return Object.freeze({
    output: validateAdminProbeOutput(result.output),
    elapsedMs: result.elapsedMs,
  });
}
