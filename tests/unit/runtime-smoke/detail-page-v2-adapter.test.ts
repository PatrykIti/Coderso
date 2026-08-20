import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { RuntimeLifecycle } from "../../../scripts/runtime-smoke/lifecycle";
import { SmokeError, type SmokeInput } from "../../../scripts/runtime-smoke/contracts";
import type { RuntimeSmokeContext } from "../../../scripts/runtime-smoke/lifecycle";
import { runDetailPageV2Adapter } from "../../../scripts/runtime-smoke/adapters/detail-page-v2";
import {
  assertDetailPageV2ScenarioResult,
  assertDetailPageV2SuiteReport,
  assertExactDetailPageV2Invocation,
  DETAIL_PAGE_V2_SCENARIO_IDS,
} from "../../../scripts/runtime-smoke/adapters/detail-page-v2/contracts";
import { detailPageV2TimingPolicy } from "../../../scripts/runtime-smoke/adapters/detail-page-v2/host";
import { buildDetailPageV2PlanFilter } from "../../../scripts/runtime-smoke/adapters/detail-page-v2/browser-plan";
import { TimingRecorder } from "../../../scripts/runtime-smoke/timing";

function makeContext(
  overrides: {
    suite?: SmokeInput["suite"];
    profile?: SmokeInput["profile"];
  } = {}
): RuntimeSmokeContext {
  return {
    input: {
      command: "run",
      suite: overrides.suite ?? "detail-page-v2",
      profile: overrides.profile ?? "fast",
      session: "wf58003unit",
    },
    root: process.cwd(),
    lifecycle: new RuntimeLifecycle(),
    timing: new TimingRecorder(),
    processes: {} as never,
    repository: {} as never,
  };
}

function scenarioResult(
  id: (typeof DETAIL_PAGE_V2_SCENARIO_IDS)[number],
  overrides: { pass?: boolean; variant?: "light" | "dark"; screenshot?: unknown } = {}
) {
  return {
    id,
    pass: overrides.pass ?? true,
    elapsedMs: 42,
    screenshot: overrides.screenshot ?? null,
    consoleErrors: [],
    variant: overrides.variant ?? "light",
  };
}

test("detail-page-v2 adapter rejects an unsupported suite before running", async () => {
  const context = makeContext({ suite: "widget-contract" });
  await expect(runDetailPageV2Adapter(context)).rejects.toMatchObject({
    code: "smoke_argument_invalid",
  });
});

test("detail-page-v2 adapter rejects an unsupported profile before running", async () => {
  const context = makeContext({ profile: "certification" });
  await expect(runDetailPageV2Adapter(context)).rejects.toMatchObject({
    code: "smoke_argument_invalid",
  });
});

test("detail-page-v2 adapter rejects a non-accepting lifecycle", async () => {
  const context = makeContext();
  context.lifecycle.stopAdmission();
  await expect(runDetailPageV2Adapter(context)).rejects.toMatchObject({
    code: "smoke_cleanup_failed",
  });
});

test("exact invocation validator accepts the registered command shape", () => {
  expect(() =>
    assertExactDetailPageV2Invocation({
      command: "run",
      suite: "detail-page-v2",
      profile: "fast",
      session: "wf58003smoke",
    })
  ).not.toThrow();
  expect(() =>
    assertExactDetailPageV2Invocation({
      command: "run",
      suite: "detail-page-v2",
      profile: "certification",
      session: "wf58003smoke",
    })
  ).not.toThrow();
  expect(() =>
    assertExactDetailPageV2Invocation({
      command: "run",
      suite: "detail-page-v2",
      profile: "slow",
      session: "wf58003smoke",
    })
  ).toThrow(SmokeError);
  expect(() =>
    assertExactDetailPageV2Invocation({
      command: "run",
      suite: "widget-contract",
      profile: "fast",
      session: "wf58003smoke",
    })
  ).toThrow(SmokeError);
});

test("suite report validator requires exactly five checkpointed scenarios", () => {
  const screenshot = {
    path: "_docs/_workflows/_smoke/detail-page-v2-wf58003unit-s1.png",
    sha256: "a".repeat(64),
  };
  const report = {
    serverUp: true,
    screenshots: [screenshot],
    scenarios: [
      scenarioResult("public-detail-converted", { screenshot }),
      scenarioResult("preview-token"),
      scenarioResult("editor-roundtrip", { variant: "dark" }),
      scenarioResult("legacy-placeholder"),
      scenarioResult("assistant-generated"),
    ],
  };
  expect(() => assertDetailPageV2SuiteReport(report)).not.toThrow();
  expect(() =>
    assertDetailPageV2SuiteReport({ ...report, scenarios: report.scenarios.slice(0, 4) })
  ).toThrow(SmokeError);
  expect(() =>
    assertDetailPageV2ScenarioResult(
      scenarioResult("public-detail-converted", { pass: false, variant: "dark" })
    )
  ).not.toThrow();
  expect(() =>
    assertDetailPageV2ScenarioResult({ ...scenarioResult("public-detail-converted"), pass: "no" })
  ).toThrow(SmokeError);
});

test("plan filter keeps only detail-page-relevant blueprint actions", () => {
  const plan = {
    actions: [
      { id: "content-type-house-projects", type: "content-type.upsert" },
      { id: "detail-page-house-projects", type: "detail-page.upsert" },
      { id: "content-route-house-projects", type: "setting.content-route.upsert" },
      { id: "custom-screen-house-projects", type: "custom-screen.upsert" },
      { id: "listing-query-house-projects", type: "listing-query.upsert" },
      { id: "listing-template-house-projects", type: "listing-template.upsert" },
      { id: "page-house-projects", type: "page.upsert" },
    ],
  };
  expect(buildDetailPageV2PlanFilter(plan).map(({ type }) => type)).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
  ]);
});

test("timing policy is bounded per profile and rejects unknown profiles", () => {
  expect(detailPageV2TimingPolicy("fast")).toEqual({ healthTimeoutMs: 120_000 });
  expect(detailPageV2TimingPolicy("certification")).toEqual({ healthTimeoutMs: 240_000 });
  expect(() => detailPageV2TimingPolicy("slow" as never)).toThrow(SmokeError);
});

test("detail-page-v2 smoke composes shared primitives without task-local loops", async () => {
  const suiteSource = await readFile(
    join(process.cwd(), "scripts/runtime-smoke/adapters/detail-page-v2/suite.ts"),
    "utf8"
  );
  const browserSource = await readFile(
    join(process.cwd(), "scripts/runtime-smoke/adapters/detail-page-v2/browser-plan.ts"),
    "utf8"
  );
  const hostSource = await readFile(
    join(process.cwd(), "scripts/runtime-smoke/adapters/detail-page-v2/host.ts"),
    "utf8"
  );
  expect(suiteSource).toContain("startDetailPageV2DevHost");
  expect(suiteSource).toContain("createAdminAuthStorageState");
  expect(suiteSource).toContain("runDetailPageV2BrowserProbe");
  expect(suiteSource).not.toContain("setTimeout");
  expect(suiteSource).not.toContain("context.processes.start(");
  expect(suiteSource).not.toContain("createServer(");
  expect(suiteSource).not.toMatch(/new\s+Browser\s*\(/u);
  expect(browserSource).toContain("PlaywrightCliDispatcher");
  expect(browserSource).not.toContain("setTimeout");
  expect(browserSource).not.toContain("chromium.launch");
  expect(hostSource).toContain("startSupervisedServer");
  expect(hostSource).toContain("CODERSO_DEV_HOST_ENVIRONMENT_POLICY");
  expect(hostSource).not.toContain("context.processes.start(");
  expect(hostSource).not.toContain("createServer(");
});
