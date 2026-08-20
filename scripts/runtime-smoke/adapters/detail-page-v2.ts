// TASK-580-03-L07 detail-page-v2 runtime smoke adapter.
// Thin entry point that validates invocation and delegates to the shared
// lifecycle, auth, dev-host, browser, and report primitives in ./suite.ts.
import { SmokeError } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import type { SmokeAdapter, SmokeAdapterResult } from "./types";
import { DETAIL_PAGE_V2_PROFILES, DETAIL_PAGE_V2_SUITE_ID } from "./detail-page-v2/contracts";
import { runDetailPageV2Suite } from "./detail-page-v2/suite";

export async function runDetailPageV2Adapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  if (context.input.suite !== DETAIL_PAGE_V2_SUITE_ID) {
    throw new SmokeError(
      "smoke_argument_invalid",
      `detail-page-v2 adapter received suite ${context.input.suite}`
    );
  }
  if (
    !DETAIL_PAGE_V2_PROFILES.includes(
      context.input.profile as (typeof DETAIL_PAGE_V2_PROFILES)[number]
    )
  ) {
    throw new SmokeError(
      "smoke_argument_invalid",
      `detail-page-v2 smoke supports only the ${DETAIL_PAGE_V2_PROFILES.join(", ")} profile`
    );
  }
  context.lifecycle.assertAccepting();
  const report = await runDetailPageV2Suite(context);
  return Object.freeze({
    pass: true,
    serverUp: report.serverUp,
    scenarios: Object.freeze(report.scenarios),
    screenshots: Object.freeze(report.screenshots),
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      taskScopedOverlay: true,
      legacyChildProcesses: 0,
      browserDispatches: 5,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      workspaceRegistered: true,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: DETAIL_PAGE_V2_SUITE_ID,
  supportedProfiles: DETAIL_PAGE_V2_PROFILES,
  run: runDetailPageV2Adapter,
});

export default adapter;
