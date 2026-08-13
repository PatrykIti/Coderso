import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  NONCE_GENERATION_COMMAND,
  RUN_CODE_COMMAND_MAX_BYTES,
  RUN_CODE_PAYLOAD_MAX_BYTES,
  SMOKE_SESSION_PREFIX,
  SMOKE_KINDS,
} from "../../../_docs/_workflows/lib/task-543-smoke-schema.mjs";
import {
  receiptIntegrityValid,
  uniqueNumbers,
} from "../../../_docs/_workflows/lib/task-543-gate-contracts.mjs";
import {
  expectedPortCheckCommand,
  expectedProcessCheckCommand,
  rawPlaywrightReceiptValid,
  smokeRunCode,
} from "../../../_docs/_workflows/lib/task-543-smoke-command-builders.mjs";
import { runTask543CodeQlSelfTest } from "../../../_docs/_workflows/lib/task-543-codeql-self-test.mjs";

const root = path.resolve(import.meta.dir, "../../..");
const libDir = path.join(root, "_docs/_workflows/lib");
const workflowPath = path.join(root, "_docs/_workflows/task-543-implement.mjs");

const LIB_FILES = Object.freeze([
  "task-543-codeql-self-test.mjs",
  "task-543-gate-contracts.mjs",
  "task-543-prompts-and-closure.mjs",
  "task-543-smoke-cleanup-validation.mjs",
  "task-543-smoke-command-builders.mjs",
  "task-543-smoke-evidence-schemas.mjs",
  "task-543-smoke-failure-prefix.mjs",
  "task-543-smoke-failure-schema.mjs",
  "task-543-smoke-kind-evidence-schemas.mjs",
  "task-543-smoke-operation-code.mjs",
  "task-543-smoke-scenario-validation.mjs",
  "task-543-smoke-schema.mjs",
  "task-543-smoke-success-schema.mjs",
  "task-543-smoke-timeline.mjs",
]);

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function staticImports(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/from "\.\/(task-543-[a-z0-9-]+\.mjs)"/gu)) {
    out.push(match[1]);
  }
  return out;
}

test("all task-543 libs are acyclic, owner-marked, and under the line gate", () => {
  for (const file of LIB_FILES) {
    const source = read(path.join(libDir, file));
    expect(source.startsWith(`// TASK-543 ${file.slice("task-543-".length, -4)}`)).toBe(true);
    expect(source).toContain("(single owner: TASK-545-02-L02)");
    expect(source).toContain("Environment-neutral ESM");
    const lines = source.split("\n").length;
    expect(lines).toBeLessThanOrEqual(1_000);
  }

  const graph = new Map<string, string[]>();
  for (const file of LIB_FILES) {
    graph.set(file, staticImports(read(path.join(libDir, file))));
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const visit = (file: string): boolean => {
    if (visiting.has(file)) {
      const cycleStart = stack.indexOf(file);
      throw new Error(`TASK-543 lib import cycle: ${[...stack.slice(cycleStart), file].join(" -> ")}`);
    }
    if (visited.has(file)) return true;
    visiting.add(file);
    stack.push(file);
    for (const dep of graph.get(file) ?? []) {
      if (dep === file) throw new Error(`TASK-543 lib self-import: ${file}`);
      if (!graph.has(dep)) throw new Error(`TASK-543 lib unknown dependency: ${file} -> ${dep}`);
      visit(dep);
    }
    stack.pop();
    visiting.delete(file);
    visited.add(file);
    return true;
  };
  for (const file of LIB_FILES) visit(file);
  expect(visited.size).toBe(LIB_FILES.length);
});

test("owner/export inventory is exact per lib", () => {
  const expectedExports: Record<string, string[]> = {
    "task-543-codeql-self-test.mjs": ["extractSmokeRunCodeSource", "runTask543CodeQlSelfTest"],
    "task-543-gate-contracts.mjs": [
      "ENV_PREFIX",
      "TARGETED_VITEST_COMMAND",
      "DB_PREFLIGHT_COMMAND",
      "TASK_SEMGREP_COMMAND",
      "STRICT_SEMGREP_JSON_ARGS",
      "STRICT_SEMGREP_JSON_COMMAND",
      "FULL_GATE_COMMANDS",
      "STRICT_COMPONENTS",
      "KNOWN_STRICT_FINDING",
      "FIXER_RESULT_SCHEMA",
      "RESULT_SCHEMA",
      "COMMAND_RECEIPT_SCHEMA",
      "STRICT_FINDING_SCHEMA",
      "FULL_GATE_SCHEMA",
      "FINGERPRINT_SCHEMA",
      "AUDIT_SCHEMA",
      "validatePassErrorContract",
      "requirePassingResult",
      "sha256Text",
      "receiptIntegrityValid",
      "uniqueNumbers",
      "receiptMatches",
      "strictComponentSections",
      "strictSummaryExitCode",
      "parseStrictSemgrepJson",
      "validateFullGates",
      "sameUniqueSet",
      "sameSequence",
      "stableSerialize",
      "sameRawValue",
    ],
    "task-543-prompts-and-closure.mjs": [
      "CHANGELOG",
      "POST_LENSES",
      "FINAL_LENSES",
      "CLOSURE_ALLOWED",
      "startGatePrompt",
      "crossLaneGatePrompt",
      "postAuditFixPrompt",
      "fullGatesPrompt",
      "fingerprintPrompt",
      "smokePrompt",
      "smokeAuditPrompt",
      "closurePrompt",
      "finalDriftFixPrompt",
      "finalMetadataGatePrompt",
    ],
    "task-543-smoke-cleanup-validation.mjs": [
      "failureNeedsProvenanceCleanupLogs",
      "failureCleanupCommandValid",
      "expectedLogReadPlan",
      "expectedFailureScenarioPlan",
      "expectedFailureLaterPlan",
      "failureLaterPrefixValid",
      "validateFailureCleanup",
    ],
    "task-543-smoke-command-builders.mjs": [
      "rawPlaywrightReceiptValid",
      "expectedProcessCheckCommand",
      "expectedPortCheckCommand",
      "expectedHelperLaunchCommand",
      "expectedHelperIdentityCommands",
      "expectedHelperStopCommand",
      "expectedPidTreeDiscoveryCommand",
      "expectedPortOwnershipDiscoveryCommand",
      "expectedScreenshotStatCommand",
      "expectedScreenshotHashCommand",
      "expectedScreenshotSignatureCommand",
      "expectedScreenshotCaptureCommand",
      "repoRelativePath",
      "expectedScreenshotStdout",
      "smokeRunCode",
      "expectedResponsiveProbeCommand",
      "expectedThemeStateReadCommand",
      "expectedThemeStateRestoreCommand",
      "expectedThemeApplyCommand",
      "expectedSetupStateReadCommand",
      "expectedSetupStateRestoreCommand",
      "expectedFixtureCreatePayload",
      "expectedFixtureCleanPayload",
      "expectedFixtureCreateCommand",
      "expectedFixtureProvenanceCommand",
      "expectedFixtureDeleteCommand",
      "expectedFixtureAbsenceCommand",
      "expectedScenarioSpec",
      "expectedAutosavePayload",
      "expectedManualPayload",
      "expectedMetadataPayload",
      "scenarioTargetUrl",
      "expectedScenarioSetupCommand",
      "expectedRouteInstallCommand",
      "expectedRouteRemovalCommand",
      "titleFillCommand",
      "closeClickCommand",
      "expectedScenarioActionCommands",
      "sessionListContains",
      "parseSessionListOutput",
      "parsedSessionNames",
      "sessionListOutputValid",
      "parsePstreePids",
      "parseLsofOwnerPids",
      "parseLsofPorts",
      "parseLsofMappings",
    ],
    "task-543-smoke-evidence-schemas.mjs": [
      "RESPONSIVE_OUTPUT_SCHEMA",
      "MUTATION_RECORD_SCHEMA",
      "MUTATION_ARRAY_SCHEMA",
      "NAVIGATION_ARRAY_SCHEMA",
    ],
    "task-543-smoke-failure-prefix.mjs": [
      "failurePhaseMatchesScope",
      "failureEarlyPrefixValid",
      "failureIdentityReceiptValid",
      "failurePrefixReceiptsValid",
      "failedReceiptShowsFailure",
      "failureStateReceiptValid",
      "failureHelperReceiptValid",
      "canonicalFixtureCreateCommandValid",
      "failureScenarioCommandValid",
      "failureFixtureReceiptValid",
      "failureResponsiveEvidence",
      "failureScenarioReceiptValid",
      "failureHelperOwnershipMatchesTimeline",
      "failureInventoryMatchesTimeline",
    ],
    "task-543-smoke-failure-schema.mjs": ["SMOKE_FAILURE_SCHEMA", "SMOKE_SCHEMA"],
    "task-543-smoke-kind-evidence-schemas.mjs": ["KIND_EVIDENCE_SCHEMAS"],
    "task-543-smoke-operation-code.mjs": [
      "requireExactPlainObject",
      "requireBoundedRunCodeString",
      "evidenceOperationKind",
      "validateEvidenceOperationPayload",
      "canonicalEvidenceOperationEncoding",
      "codeQlSafeJavaScriptStringLiteral",
      "buildEvidenceOperationRunCodeSource",
      "smokeRunOperation",
    ],
    "task-543-smoke-scenario-validation.mjs": [
      "expectedTransientAssertionCommands",
      "transientEvidenceValid",
      "expectedEvidenceAssertionCommand",
      "expectedScenarioResetCommand",
      "resetEvidenceValid",
      "isFullSmokeCliCommand",
      "isUserActionCommand",
      "commandResultsMatch",
      "logReadSetValid",
      "pushLogReadSet",
      "aggregateLogReadSets",
      "lifecycleLogCommandValid",
      "lifecycleLogReceiptValid",
      "sessionListReceiptValid",
      "browserOpenReceiptValid",
      "browserCloseReceiptValid",
      "emptyRouteListOutput",
      "computedNodeValid",
      "responsiveEvidenceValid",
      "expectedMutationSequence",
      "expectedNavigationSequence",
      "validateScenarioByKind",
      "expectedScenarioRouteMode",
      "expectedScenarioRoutePattern",
      "scenarioCommandEvidenceValid",
      "stateRestored",
      "screenshotReceiptValid",
      "expectedScreenshotPhases",
      "urlPathMatches",
      "fixtureCreateOutputValid",
      "fixtureProvenanceOutputValid",
    ],
    "task-543-smoke-schema.mjs": [
      "SMOKE_KINDS",
      "TRANSIENT_SCREENSHOT_KINDS",
      "SMOKE_SESSION_PREFIX",
      "RUN_CODE_PAYLOAD_MAX_BYTES",
      "RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH",
      "RUN_CODE_COMMAND_MAX_BYTES",
      "EMPTY_SHA256",
      "SMOKE_SCREENSHOT_ROOT",
      "POSTS_LIST_URL",
      "ADMIN_ORIGIN",
      "POST_TITLE_SELECTOR",
      "POST_CLOSE_SELECTOR",
      "SMOKE_PASSWORD_FILL_COMMAND",
      "SMOKE_SETUP_STORAGE_KEY",
      "FAILURE_BASE_OWNED_PORTS",
      "ADMIN_HEALTH_COMMAND",
      "FRONT_HEALTH_COMMAND",
      "NONCE_GENERATION_COMMAND",
      "RESPONSIVE_WIDTHS",
      "RESPONSIVE_HEIGHT",
      "SMOKE_CLI_COMMAND_SCHEMA",
      "SMOKE_RUN_CODE_COMMAND_SCHEMA",
      "RAW_VALUE_SCHEMA",
      "STRING_ARRAY_SCHEMA",
      "POST_PAYLOAD_SCHEMA",
      "SAFE_SENTINEL_SCHEMA",
      "THEME_APPLIED_STATE_SCHEMA",
      "THEME_RESTORE_STATE_SCHEMA",
      "SETUP_STATE_SCHEMA",
      "SMOKE_LOG_OBSERVATION_START",
      "SMOKE_LOG_RESET",
      "SMOKE_CONSOLE_ERROR_READ",
      "SMOKE_CONSOLE_WARNING_READ",
      "SMOKE_PAGE_ERROR_READ",
      "SMOKE_LOGIN_SUBMIT",
      "SMOKE_RECEIPT_REQUIRED",
      "commandResultSchema",
      "LOG_READ_SET_SCHEMA",
      "OPTIONAL_LOG_READ_SET_SCHEMA",
      "COMMAND_TIMELINE_RECORD_SCHEMA",
    ],
    "task-543-smoke-success-schema.mjs": ["SMOKE_SUCCESS_SCHEMA"],
    "task-543-smoke-timeline.mjs": [
      "credentialReceiptValidWithoutDigest",
      "bootstrapPasswordReceiptValid",
      "timelineReceiptIntegrityValid",
      "successTimelineReceiptIntegrityValid",
      "failurePrefixTimelineReceiptIntegrityValid",
      "prefixedReceipt",
      "expectedSuccessCommandTimeline",
      "successCommandTimelineValid",
      "validateSmoke",
    ],
  };
  expect(Object.keys(expectedExports).sort()).toEqual([...LIB_FILES].sort());

  for (const [file, expected] of Object.entries(expectedExports)) {
    const source = read(path.join(libDir, file));
    const actual = [
      ...source.matchAll(/^export (?:async )?(?:function|const|class) ([A-Za-z0-9_]+)/gmu),
    ].map((match) => match[1]);
    expect(actual).toEqual(expected);
  }
});

test("entry stays thin and orchestrates through the libs", () => {
  const entry = read(workflowPath);
  const entryLines = entry.split("\n").length;
  expect(entryLines).toBeLessThanOrEqual(1_000);
  expect(entry).toContain('import { runCanonicalPostAudit } from "./lib/post-audit.mjs"');
  expect(entry).toContain('from "./lib/task-543-gate-contracts.mjs"');
  expect(entry).toContain('from "./lib/task-543-smoke-schema.mjs"');
  expect(entry).toContain('from "./lib/task-543-smoke-timeline.mjs"');
  expect(entry).toContain('from "./lib/task-543-codeql-self-test.mjs"');
  expect(entry).toContain('from "./lib/task-543-prompts-and-closure.mjs"');
  expect(entry).not.toContain("function validateEvidenceOperationPayload(");
  expect(entry).not.toContain("function expectedSuccessCommandTimeline(");
  expect(entry).not.toContain("function validateFailureCleanup(");
  expect(entry).toContain('const { createResumeCheckpoint } = await import("./lib/smoke-evidence.mjs")');
  expect(entry).toContain(
    'const { openWorkflowClosureResume } = await import("./lib/smoke-evidence.mjs")'
  );
});

test("byte-equivalent golden commands and schema bounds", () => {
  expect(expectedProcessCheckCommand(1234)).toBe(
    "bash -lc 'if kill -0 -- 1234 2>/dev/null; then exit 1; fi'"
  );
  expect(expectedPortCheckCommand(3000)).toBe("/usr/bin/lsof -nP -iTCP:3000 -sTCP:LISTEN -t");
  expect(smokeRunCode("page.evaluate(1)")).toBe(
    "playwright-cli -s=wf543smoke --raw run-code 'page.evaluate(1)'"
  );
  expect(SMOKE_SESSION_PREFIX).toBe("playwright-cli -s=wf543smoke --raw ");
  expect(NONCE_GENERATION_COMMAND).toBe(
    'node --eval \'const crypto=require("node:crypto"); ' +
      'process.stdout.write("wf543-"+crypto.randomBytes(16).toString("hex"))\''
  );
  expect(RUN_CODE_COMMAND_MAX_BYTES).toBe(10_000);
  expect(RUN_CODE_PAYLOAD_MAX_BYTES).toBe(65_536);
  expect(SMOKE_KINDS).toEqual([
    "clean-close",
    "dirty-delayed-close",
    "pending-revert-restoration",
    "failure-retry",
    "double-close",
    "table-keyboard",
    "mid-viewport-metadata",
  ]);
  expect(uniqueNumbers([3, 1, 3, 2])).toEqual([3, 1, 2]);

  const validReceipt = {
    command: "playwright-cli --raw list",
    status: 0,
    stdout: "",
    stderr: "",
    stdoutSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    stderrSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    parsedOutput: null,
  };
  expect(receiptIntegrityValid(validReceipt)).toBe(true);
  expect(rawPlaywrightReceiptValid(validReceipt)).toBe(true);
  expect(receiptIntegrityValid({ ...validReceipt, status: "0" })).toBe(false);
  expect(receiptIntegrityValid({ ...validReceipt, stdoutSha256: "0".repeat(64) })).toBe(false);
});

test("codeql self-test reports the pinned operation/digest cardinality", async () => {
  const result = await runTask543CodeQlSelfTest();
  expect(result).toMatchObject({
    pass: true,
    evidenceOperations: 7,
    transientOperations: 4,
    zeroTransientKinds: 3,
    resetOperations: 1,
    compiledOperations: 12,
    credentialDigestCalls: 0,
    ordinaryDigestCalls: 2,
    negativeCases: 26,
  });
  expect(result.maximumCommandBytes).toBeGreaterThan(0);
  expect(result.maximumCommandBytes).toBeLessThanOrEqual(RUN_CODE_COMMAND_MAX_BYTES);
});

test("security suite contract still asserts against the extracted libs", () => {
  const securitySource = read(path.join(root, "tests/unit/workflows/task543ImplementSecurity.test.ts"));
  expect(securitySource).toContain("task-543-smoke-operation-code.mjs");
  expect(securitySource).toContain("task-543-smoke-timeline.mjs");
  expect(securitySource).toContain("task-543-smoke-scenario-validation.mjs");
  expect(securitySource).toContain("task-543-codeql-self-test.mjs");
  expect(securitySource).toContain("task-543-smoke-schema.mjs");
  expect(securitySource).toContain("task-543-smoke-cleanup-validation.mjs");
  expect(securitySource).toContain("--codeql-self-test");
});
