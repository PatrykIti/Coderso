import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../..");
const smokeContractRelative = "_docs/_workflows/task-540-smoke-contract.mjs";
const executorRelative = "_docs/_workflows/task-540-smoke-executor.mjs";
const smokeHostRelative = "_docs/_workflows/task-540-smoke-host.mjs";
const bridgeRelative = "_docs/_workflows/task-540-codex-agent-bridge.mjs";
const implementRelative = "_docs/_workflows/task-540-implement.mjs";
const localOrchestratorRelative = "_docs/_workflows/task-540-local-orchestrator.mjs";
const testNameContractRelative = "_docs/_workflows/task-540-test-name-contract.mjs";
const helperRelatives = Object.freeze([
  smokeContractRelative,
  executorRelative,
  smokeHostRelative,
  bridgeRelative,
  localOrchestratorRelative,
  implementRelative,
  testNameContractRelative,
]);
const smokeContractPath = path.join(root, smokeContractRelative);
const executorPath = path.join(root, executorRelative);
const smokeHostPath = path.join(root, smokeHostRelative);
const bridgePath = path.join(root, bridgeRelative);
const implementPath = path.join(root, implementRelative);
const localOrchestratorPath = path.join(root, localOrchestratorRelative);
const testNameContractPath = path.join(root, testNameContractRelative);
const MASKED_IMPLEMENT_SHA256 = "480c326a4f95386fa680bb21720df6748e85d50843c0e7a528b466a3431c2f0d";
const FROZEN_HELPER_SHA256 = Object.freeze({
  [smokeContractRelative]: "33da5a759d69ed00d41dc364dd918660c665591db34bd411b1f174c7b9e142b2",
  [executorRelative]: "58849105ec38b038974cb46493309bc7d6d3ae4f38aaeef74ee0e00675456c47",
  [smokeHostRelative]: "82accfe7b9ada4ca02853c691b315fec5817a54b600912a081d5495ade6c8d61",
  [bridgeRelative]: "c3c594a17cb63943beab29e7f621f6e1ca46cb3b5abb67625edcddb900788341",
  [localOrchestratorRelative]: "e06c7be9652554111c111c2e8210b733db908a4f272bcbd4a11781174e132da4",
  [implementRelative]: "10342a946482ef4a60b6f67b4259225a8b3d587cdab575446b81f2807dd2124e",
  [testNameContractRelative]: "ce052b4245c8c384d0405c32cf9d1df146a2f83a409994a6a2822de5422fc4f5",
});

function readSources() {
  return {
    smokeContract: readFileSync(smokeContractPath, "utf8"),
    executor: readFileSync(executorPath, "utf8"),
    smokeHost: readFileSync(smokeHostPath, "utf8"),
    bridge: readFileSync(bridgePath, "utf8"),
    implement: readFileSync(implementPath, "utf8"),
    localOrchestrator: readFileSync(localOrchestratorPath, "utf8"),
    testNameContract: readFileSync(testNameContractPath, "utf8"),
  };
}

function sourceSection(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

function countToken(source: string, token: string): number {
  return source.split(token).length - 1;
}

function frozenStringArray(source: string, name: string): string[] {
  const match = source.match(
    new RegExp(`const ${name} = (?:Object\\.freeze|deepFreezeExact)\\(\\[([\\s\\S]*?)\\]\\);`, "u")
  );
  expect(match).not.toBeNull();
  return [...match![1].matchAll(/"([^"]+)"/gu)].map((entry) => entry[1]);
}

function frozenExecutorSha256(source: string): string {
  const match = source.match(/const FROZEN_SMOKE_EXECUTOR_SHA256 =\s*\n\s*"([a-f0-9]{64})";/u);
  expect(match).not.toBeNull();
  return match![1];
}

function maskFrozenExecutorSha256(source: string): string {
  return source.replace(
    /(const FROZEN_SMOKE_EXECUTOR_SHA256 =\s*\n\s*")[a-f0-9]{64}(";)/u,
    "$1<FROZEN_EXECUTOR_SHA256>$2"
  );
}

test("TASK-540 executor security self-test passes", () => {
  const result = spawnSync("node", [executorPath, "--self-test"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject({
    pass: true,
    actions: 496,
    runtimeReceipts: 177,
    cleanupActions: 72,
    captures: 26,
  });
}, 120_000);

test("TASK-540 Codex bridge exposes only seven armed CLI modes", () => {
  const { bridge } = readSources();
  const result = spawnSync("node", [bridgePath, "--self-test"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toEqual({
    pass: true,
    cliModes: 7,
    canonicalCases: 5,
    schemaCases: 8,
    recoveryExport: "sweepPriorBridgeLaunchesForRecovery",
  });
  expect(frozenStringArray(bridge, "REQUEST_MODES")).toEqual([
    "inspect",
    "respond",
    "status",
    "wait",
    "procedure",
  ]);
  expect(bridge).toContain(
    'const SPAWNED_MODES = Object.freeze([...REQUEST_MODES, "recover-review"]);'
  );
  expect(bridge).toContain('const CLI_MODES = Object.freeze(["self-test", ...SPAWNED_MODES]);');
  expect(countToken(bridge, "export async function ")).toBe(1);
  expect(bridge).toContain("export async function sweepPriorBridgeLaunchesForRecovery(caller)");
  expect(bridge).toContain(
    "const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;"
  );
  expect(bridge.trimEnd().split("\n").length).toBeLessThanOrEqual(1_000);
  const derive = sourceSection(
    bridge,
    "async function deriveTask540WorktreeRoot(moduleUrl)",
    "function parseProcStat"
  );
  for (const token of [
    "fileURLToPath(moduleUrl)",
    '"--show-toplevel"',
    '"--path-format=absolute"',
    '"--git-dir"',
    '"--git-common-dir"',
    '"branch", "--show-current"',
    'dirname(gitDir) === gitCommonDir + "/worktrees"',
    "branch === EXPECTED_BRANCH",
  ]) {
    expect(derive).toContain(token);
  }
  expect(derive).not.toContain("process.cwd");
  expect(derive).not.toContain("process.argv");
  expect(derive).not.toContain("process.env");
});

test("TASK-540 continuous host is Codex-only and owns every bridge launch", () => {
  const { bridge, implement, localOrchestrator } = readSources();
  for (const source of [bridge, localOrchestrator, implement]) {
    expect(source).not.toMatch(/claude|anthropic/iu);
  }

  expect(frozenStringArray(localOrchestrator, "CONTROL_COMMANDS")).toEqual([
    "inspect",
    "respond",
    "status",
    "wait",
    "procedure",
    "recover-review",
    "abort",
  ]);
  expect(frozenStringArray(localOrchestrator, "BRIDGE_COMMANDS")).toEqual([
    "inspect",
    "respond",
    "status",
    "wait",
    "procedure",
    "recover-review",
  ]);
  const launch = sourceSection(
    localOrchestrator,
    "async function launchBridge(mode, authority, payload = null, priorHelperSweep = null)",
    "async function readCanonicalPath"
  );
  for (const token of [
    "BRIDGE_COMMANDS.includes(mode)",
    'const args = [BRIDGE, "--" + mode];',
    "if (authority) args.push(authority.requestDir);",
    "const child = spawn(process.execPath, args",
    "cwd: ROOT",
    "detached: false",
    "env: SAFE_CHILD_ENVIRONMENT",
    "shell: false",
    'stdio: ["pipe", "pipe", "pipe", "pipe"]',
    "child.stdio[3].end(Buffer.concat([frame(bootstrap), frame(go)]));",
    "stderr.length === 0",
    "const absent = await processIdentity(child.pid);",
  ]) {
    expect(launch).toContain(token);
  }
  expect(launch).not.toContain("abort");
  expect(launch).not.toContain("spawn_agent");
  expect(localOrchestrator).toContain(
    'argv.length === 1 &&\n      (argv[0] === "--self-test" || argv[0] === "--run")'
  );
  expect(localOrchestrator).toContain("invariant(!controlInFlight");
  expect(localOrchestrator).toContain("control pipelining or trailing bytes rejected");
  expect(localOrchestrator).toContain('if (control.command === "abort")');
  expect(localOrchestrator).toContain("await sealAbortedRun(control.payload.reason");
  expect(localOrchestrator).toContain("rawRootLoss = true;");
});

test("TASK-540 schemas, per-request finalization, and permanent freeze are host-owned", () => {
  const { implement, localOrchestrator } = readSources();
  const registration = sourceSection(
    localOrchestrator,
    "function registerSchemas(value)",
    "function requireRegisteredSchema"
  );
  for (const token of [
    'exactKeys(value, ["audit", "gate", "mutation", "result"]',
    'audit: "read-only"',
    'gate: "rejected"',
    'mutation: "mutating"',
    'result: "read-only"',
    "SCHEMA_AUTHORITY.set(schema",
    "REGISTERED_SCHEMAS.set(name, schema)",
  ]) {
    expect(registration).toContain(token);
  }
  const registered = sourceSection(
    localOrchestrator,
    "function requireRegisteredSchema(schema)",
    "function launchPath"
  );
  expect(registered).toContain('authority.accessClass !== "rejected"');
  expect(registered).toContain('digest("schema"');
  expect(registered).toContain("authority.sha256");

  expect(countToken(implement, "agent.registerSchemas({")).toBe(1);
  const registrationIndex = implement.indexOf("agent.registerSchemas({");
  const runtimeIndex = implement.indexOf(
    "await requireTask540LocalRuntimeAuthority(ROOT_AUTHORITY);",
    registrationIndex
  );
  expect(registrationIndex).toBeGreaterThan(implement.lastIndexOf("process.exit(0);"));
  expect(runtimeIndex).toBeGreaterThan(registrationIndex);
  expect(implement).toContain(
    'await agent.finalize(boundaryErrors.length === 0 ? "accepted" : "rejected_rolled_back")'
  );
  expect(countToken(implement, "agent.freeze();")).toBe(1);
  expect(implement.indexOf("agent.freeze();")).toBeGreaterThan(
    implement.indexOf("const findings = await runFinalAudit(round);")
  );
  for (const property of [
    "registerSchemas",
    "finalize",
    "commitStatusClosure",
    "verifyStatusClosure",
    "rollbackClosureTransactions",
    "freeze",
  ]) {
    const descriptor = sourceSection(
      localOrchestrator,
      `Object.defineProperty(runAgent, "${property}"`,
      property === "freeze" ? "function reportPhase" : "Object.defineProperty(runAgent,"
    );
    expect(descriptor).toContain("configurable: false");
    expect(descriptor).toContain("enumerable: false");
    expect(descriptor).toContain("writable: false");
  }
});

test("TASK-540 terminal ledger is a five-target index-last transaction", () => {
  const { localOrchestrator } = readSources();
  expect(frozenStringArray(localOrchestrator, "TERMINAL_TARGET_RELATIVE_PATHS")).toEqual([
    "_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md",
    "_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
    "_docs/_TASKS/TASK-540-06-Tests-Smoke-And-Closure.md",
    "_docs/_TASKS/TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
    "_docs/_CHANGELOG/README.md",
  ]);
  const freeze = sourceSection(
    localOrchestrator,
    "async function freezeDispatch()",
    "async function snapshotTerminalTarget"
  );
  expect(freeze).toContain("dispatchFrozen = true;");
  expect(freeze).toContain("entries.slice(0, preClosureCount)");
  expect(freeze).toContain("await commitTerminalLedger(entries, terminalReceipt)");

  const commit = sourceSection(
    localOrchestrator,
    "async function commitTerminalLedger(entries, terminalReceipt)",
    "async function removeCurrentJournal"
  );
  for (const token of [
    '"terminal.manifest.json"',
    '"terminal.prepared.json"',
    "for (let index = 0; index < targets.length; index += 1)",
    "await replaceTerminalTarget(",
    '"committed.json"',
    "indexNewSha256: targets.at(-1).newSha256",
    '"terminal.rollback-prepared.json"',
  ]) {
    expect(commit).toContain(token);
  }
  expect(commit.indexOf('"terminal.prepared.json"')).toBeLessThan(
    commit.indexOf("await replaceTerminalTarget(")
  );
  expect(commit.indexOf('"committed.json"')).toBeGreaterThan(
    commit.indexOf("await replaceTerminalTarget(")
  );

  const cleanup = sourceSection(
    localOrchestrator,
    "async function cleanupRun()",
    "function requireControl"
  );
  expect(cleanup).toContain("await verifyCommittedTerminal(terminalTransaction)");
  expect(cleanup).toContain("await cleanupLedgerArtifacts(");
  expect(cleanup).toContain("await removeCurrentJournal();");
  expect(cleanup).not.toContain("commitTerminalLedger");
});

test("TASK-540 status closure is an 18-target board-last durable transaction", () => {
  const { implement, localOrchestrator } = readSources();
  expect(frozenStringArray(localOrchestrator, "STATUS_TARGET_RELATIVE_PATHS")).toEqual([
    "_docs/_TASKS/TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md",
    "_docs/_TASKS/TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md",
    "_docs/_TASKS/TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md",
    "_docs/_TASKS/TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
    "_docs/_TASKS/TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md",
    "_docs/_TASKS/TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
    "_docs/_TASKS/TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
    "_docs/_TASKS/TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md",
    "_docs/_TASKS/TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
    "_docs/_TASKS/TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
    "_docs/_TASKS/TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md",
    "_docs/_TASKS/TASK-540-02-Button-Binding-And-Tabs-Authoring.md",
    "_docs/_TASKS/TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md",
    "_docs/_TASKS/TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md",
    "_docs/_TASKS/TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md",
    "_docs/_TASKS/TASK-540-06-Tests-Smoke-And-Closure.md",
    "_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
    "_docs/_TASKS/README.md",
  ]);
  const commit = sourceSection(
    localOrchestrator,
    "async function commitStatusClosure(rawInput)",
    "async function rollbackStatusClosure()"
  );
  for (const token of [
    '"status.manifest.json"',
    '"status.prepared.json"',
    '"status.committed.json"',
    "for (let index = 0; index < 18; index += 1)",
    'await convergeStatusTransaction(transaction, "new")',
    "boardNewSha256: targets.at(-1).newSha256",
  ]) {
    expect(commit).toContain(token);
  }
  expect(commit.indexOf('"status.prepared.json"')).toBeLessThan(
    commit.indexOf('await convergeStatusTransaction(transaction, "new")')
  );
  expect(implement).toContain("await agent.commitStatusClosure(transactionInput);");
  expect(implement).toContain("await agent.verifyStatusClosure();");
  expect(implement).toContain("await agent.rollbackClosureTransactions();");
  expect(implement).not.toContain(". TASK-540 atomic status closure ");
});

test("TASK-540 smoke execution is local and agents only audit sealed evidence afterward", () => {
  const { implement } = readSources();
  const execution = sourceSection(
    implement,
    "async function executeAndAuditSmokeEvidenceOnce({",
    "async function runSmokeEvidenceOnce"
  );
  const executorCall = execution.indexOf("await controller.execute({");
  const auditCall = execution.indexOf("await auditRunner(");
  expect(executorCall).toBeGreaterThanOrEqual(0);
  expect(auditCall).toBeGreaterThan(executorCall);
  expect(execution.slice(0, auditCall)).not.toContain("runReadOnlyAgent(");
  expect(execution).toContain("Do not edit, start runtime, execute browser commands, recover,");
  expect(execution).toContain("retry, or request a fixer.");
  expect(implement).toContain(
    "const smokeExecutionController = createSmokeExecutionController(executeTask540SmokePlan);"
  );
  expect(countToken(implement, "const smokeCycle = await runSmokeEvidenceOnce(")).toBe(1);
  expect(implement).not.toMatch(/agent[^\n]{0,80}(?:runSmoke|executeTask540SmokePlan)/u);
});

test("TASK-540 closure embeds the collaboration prefix before an index-last terminal freeze", () => {
  const { implement } = readSources();
  expect(frozenStringArray(implement, "CLOSURE_CONTROL_KEYS")).toEqual([
    "schemaVersion",
    "generation",
    "boardBaseline",
    "changelogPath",
    "gateReceipt",
    "collaborationLedger",
  ]);
  expect(frozenStringArray(implement, "CLOSURE_COLLABORATION_LEDGER_KEYS")).toEqual([
    "preClosureCount",
    "preClosureSha256",
    "terminalCount",
    "terminalSha256",
  ]);
  expect(frozenStringArray(implement, "CLOSURE_ANCHOR_KEYS")).toEqual([
    "schemaVersion",
    "evidenceSha256",
    "closureControl",
    "collaborationLedgerPrefix",
    "terminalCollaborationReceipt",
    "repairAuthorization",
  ]);
  const closure = sourceSection(implement, "async function runClosure(", "const FINAL_LENSES");
  const prefixIndex = closure.indexOf("await agent.capturePrefix()");
  const evidenceIndex = closure.indexOf("const evidenceBlock = smokeEvidenceBlock(");
  const statusIndex = closure.indexOf("await agent.commitStatusClosure(transactionInput);");
  expect(prefixIndex).toBeGreaterThanOrEqual(0);
  expect(evidenceIndex).toBeGreaterThan(prefixIndex);
  expect(statusIndex).toBeGreaterThan(evidenceIndex);
  const terminal = sourceSection(implement, "if (!finalDriftClean)", "} catch (error) {");
  expect(terminal).toContain("await agent.freeze();");
  expect(terminal).toContain("await verifyTerminalCollaborationState();");
  expect(terminal.indexOf("await verifyTerminalCollaborationState();")).toBeGreaterThan(
    terminal.indexOf("await agent.freeze();")
  );
  expect(terminal.indexOf('phase("Final gate")')).toBeGreaterThan(
    terminal.indexOf("await verifyTerminalCollaborationState();")
  );
  expect(implement).toContain(
    '"coderso.task540.bridge." + domain + ".v1\\0" + canonicalCollaborationJson(core)'
  );
  expect(implement).toContain('collaborationDigest("ledger-entry", core)');
  expect(implement).toContain('collaborationDigest("ledger-prefix", { entries })');
  expect(implement).toContain('collaborationDigest("terminal-ledger", {');
});

test("TASK-540 workflow roots and runtime resources are independently fail-closed", () => {
  const { implement, localOrchestrator, testNameContract } = readSources();
  const cases = [
    {
      source: implement,
      runtimeMarker:
        "const ROOT_RUNTIME_AUTHORITY = await requireTask540LocalRuntimeAuthority(ROOT_AUTHORITY);",
      dynamicImportMarker: "import(pathToFileURL(TYPESCRIPT_MODULE_PATH).href)",
    },
    {
      source: testNameContract,
      runtimeMarker:
        "const ROOT_RUNTIME_AUTHORITY = await requireTask540LocalRuntimeAuthority(ROOT_AUTHORITY);",
      dynamicImportMarker: "import(pathToFileURL(TYPESCRIPT_MODULE_PATH).href)",
    },
  ];

  for (const { source, runtimeMarker, dynamicImportMarker } of cases) {
    const derive = sourceSection(
      source,
      "async function deriveTask540WorktreeRoot(moduleUrl, deps = ROOT_LIVE_DEPS)",
      "async function requireTask540LocalRuntimeAuthority"
    );
    const runtime = sourceSection(
      source,
      "async function requireTask540LocalRuntimeAuthority",
      "function createTask540RootAuthorityFixture"
    );
    const bootstrapPrefix = source.slice(0, source.indexOf("const ROOT_AUTHORITY ="));
    const staticImportSpecifiers = [...bootstrapPrefix.matchAll(/from "([^"]+)";/gu)].map(
      (match) => match[1]
    );

    expect(staticImportSpecifiers.length).toBeGreaterThan(0);
    expect(staticImportSpecifiers.every((specifier) => specifier.startsWith("node:"))).toBe(true);
    expect(derive).toContain("fileURLToPath(moduleUrl)");
    expect(derive).toContain("authorityDeps.lstat");
    expect(derive).toContain("authorityDeps.realpath");
    expect(derive).toContain('"--show-toplevel"');
    expect(derive).toContain('"--path-format=absolute"');
    expect(derive).toContain('"--git-dir"');
    expect(derive).toContain('"--git-common-dir"');
    expect(derive).toContain('"branch", "--show-current"');
    expect(derive).not.toContain("process.cwd");
    expect(derive).not.toContain("process.argv");
    expect(derive).not.toContain("process.env");
    expect(derive).not.toContain("globalThis");
    expect(source).toContain('"/Coderso/.git"');
    expect(source).toContain('"feature/tasks-fixes"');
    expect(source).toMatch(/gitCommonDir:\s*(?:ROOT_)?PROJECT_PARENT \+ "\/Elsewhere\/\.git"/u);
    expect(runtime).toContain('verifiedRoot + "/.env"');
    expect(runtime).toContain('verifiedRoot + "/node_modules"');
    expect(runtime).toContain('Object.getOwnPropertyDescriptor(info, "nlink")');
    expect(runtime).toContain("linkDescriptor.value === 1");
    expect(runtime).toContain("!info.isSymbolicLink()");
    expect(runtime).toContain("authorityDeps.realpath(resource.path)");
    expect(source).toContain("runtimeRejected === 9");

    const rootIndex = source.indexOf(
      "const ROOT_AUTHORITY = await deriveTask540WorktreeRoot(import.meta.url);"
    );
    const runtimeIndex = source.lastIndexOf(runtimeMarker);
    const dynamicImportIndex = source.indexOf(dynamicImportMarker, rootIndex);
    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(runtimeIndex).toBeGreaterThan(rootIndex);
    expect(dynamicImportIndex).toBeGreaterThan(runtimeIndex);
  }

  const hostDerive = sourceSection(
    localOrchestrator,
    "async function deriveRoot(moduleUrl)",
    "async function requireRuntimeAuthority"
  );
  const hostRuntime = sourceSection(
    localOrchestrator,
    "async function requireRuntimeAuthority",
    "function parseProcStat"
  );
  const hostBootstrap = localOrchestrator.slice(
    0,
    localOrchestrator.indexOf("const ROOT_AUTHORITY =")
  );
  const hostImportSpecifiers = [...hostBootstrap.matchAll(/from "([^"]+)";/gu)].map(
    (match) => match[1]
  );
  expect(hostImportSpecifiers).toEqual([
    "node:child_process",
    "node:crypto",
    "node:fs",
    "node:fs/promises",
    "node:path",
    "node:url",
    "node:util",
    "./task-540-codex-agent-bridge.mjs",
  ]);
  for (const token of [
    "fileURLToPath(moduleUrl)",
    '"--show-toplevel"',
    '"--path-format=absolute"',
    '"--git-dir"',
    '"--git-common-dir"',
    '"branch", "--show-current"',
    'dirname(gitDir) === gitCommonDir + "/worktrees"',
    "branch === EXPECTED_BRANCH",
  ]) {
    expect(hostDerive).toContain(token);
  }
  expect(hostDerive).not.toContain("process.cwd");
  expect(hostDerive).not.toContain("process.argv");
  expect(hostDerive).not.toContain("globalThis");
  expect(hostRuntime).toContain('root + "/.env"');
  expect(hostRuntime).toContain('root + "/node_modules"');
  expect(hostRuntime).toContain("!info.isSymbolicLink()");
  expect(hostRuntime).toContain("(await realpath(path)) === path");
  const hostRootIndex = localOrchestrator.indexOf(
    "const ROOT_AUTHORITY = await deriveRoot(import.meta.url);"
  );
  const hostRuntimeIndex = localOrchestrator.lastIndexOf("await requireRuntimeAuthority(ROOT);");
  const hostDynamicImportIndex = localOrchestrator.indexOf(
    "await import(pathToFileURL(IMPLEMENTER).href);",
    hostRootIndex
  );
  expect(hostRootIndex).toBeGreaterThanOrEqual(0);
  expect(hostRuntimeIndex).toBeGreaterThan(hostRootIndex);
  expect(hostDynamicImportIndex).toBeGreaterThan(hostRuntimeIndex);
});

test("strict security and full-validation receipts have exact zero-finding schemas", () => {
  const { implement } = readSources();
  const scanners = [
    "semgrep-sast",
    "bun-audit",
    "trivy-vuln",
    "trivy-config",
    "trivy-secret",
    "gitleaks-history",
    "gitleaks-worktree",
  ];

  expect(frozenStringArray(implement, "STRICT_SCAN_SCANNER_IDS")).toEqual(scanners);
  expect(frozenStringArray(implement, "STRICT_SCAN_CLASSIFIER_INPUT_KEYS")).toEqual([
    "command",
    "containsSensitiveOutput",
    "outputLimitExceeded",
    "repositoryUnchanged",
    "spawnError",
    "status",
    "stderr",
    "stderrTruncated",
    "stdout",
    "stdoutTruncated",
    "timedOut",
  ]);
  expect(frozenStringArray(implement, "STRICT_SCAN_RECEIPT_KEYS")).not.toContain("spawnError");

  const exactShape = sourceSection(
    implement,
    "function requireExactStrictScanObjectKeys",
    "function classifyZeroFindingStrictScanOutput"
  );
  expect(exactShape).toContain("Reflect.ownKeys(value)");
  expect(exactShape).toContain("Object.getOwnPropertyDescriptor");
  expect(exactShape).toContain("descriptor.enumerable !== true");
  expect(exactShape).toContain("requireExactStrictScanArray");

  const classifier = sourceSection(
    implement,
    "function classifyZeroFindingStrictScanOutput",
    "function requireStrictScanReceiptShape"
  );
  for (const token of [
    'command === "bun run scan:security:strict"',
    "status === 0",
    "timedOut === false",
    "spawnError === false",
    "outputLimitExceeded === false",
    "stdoutTruncated === false",
    "stderrTruncated === false",
    "repositoryUnchanged === true",
    "containsSensitiveOutput === false",
    "exactWrapperPreamble",
    "orderedSummary",
    "reservedStderrAuthority",
    "forbiddenStderrDeclaration",
  ]) {
    expect(classifier).toContain(token);
  }
  expect(classifier).toContain("/^[\\t ]*\\[security-scan\\][^\\0\\r\\n]*$/gmu");
  expect(classifier).not.toContain("KNOWN_STRICT_FINDING");

  const receiptBoundary = sourceSection(
    implement,
    "function requireZeroFindingStrictScanReceipt",
    "function parseDatabasePreflightReceipt"
  );
  expect(receiptBoundary).toContain("const authority = localCommandAuthority");
  expect(receiptBoundary).toContain("spawnError: authority.spawnError");

  const fullValidation = sourceSection(
    implement,
    "const FULL_VALIDATION_RESULT_KEYS",
    "const POST_AUDIT_LENSES"
  );
  expect(fullValidation).toContain("requireExactFullValidationResultShape");
  expect(fullValidation).toContain("requireExactStrictScanObjectKeys");
  expect(fullValidation).toContain("requireExactStrictScanArray");
  expect(fullValidation).toContain('typeof fingerprint.head !== "string"');
  expect(fullValidation).toContain('typeof fingerprint.worktreeSha256 !== "string"');
  expect(fullValidation).toContain('typeof receipt.stdoutSha256 !== "string"');
  expect(fullValidation).toContain('typeof receipt.stderrSha256 !== "string"');
  expect(fullValidation).toContain("result.pass !== true");
  expect(implement).toContain("strictScanMutationRejections === 60");
  expect(implement).toContain("strictScanProjectionMutationRejections === 6");
  expect(implement).toContain("strictScanReceiptUnknownKeyRejections === 5");
  expect(implement).toContain("fullValidationShapeMutationRejections === 10");
});

test("TASK-540 changelog projection preserves independent reservations fail-closed", () => {
  const { implement } = readSources();
  const projection = sourceSection(
    implement,
    "function canonicalProsePattern",
    "function projectTask540AnchorSlot"
  );
  const mutants = sourceSection(
    implement,
    "const canonicalClosureIndex = closureIndexTransactionFixture(closureAnchor);",
    "const malformedAnchorSnapshot"
  );

  expect(implement).toContain(
    '"Changelogs 1260 and 1261 are reserved for the implementation closure of\\n"'
  );
  expect(implement).toContain('"Use 1262 for the next unreserved changelog entry."');
  expect(projection).toContain("readCanonicalTask540IndexProseSlot");
  expect(projection).toContain("policyMarkers.length !== 1");
  expect(projection).toContain("policyMarkers[0].start <= slot.end");
  expect(projection).not.toContain("prose.indexOf(TASK_540_INDEX_SLOT_END");
  expect(implement).toContain("one adjacent ordered prose pair");
  expect(implement).toContain("including line wrapping and blank lines");
  expect(implement).toContain("do not reflow, reorder, ");
  expect(implement).toContain("or rewrite it.");
  for (const token of [
    "preserves the independent TASK-547/TASK-548 reservation",
    "projectedReservedClosureIndex === projectedCanonicalClosureIndex",
    "an independent reservation interposed inside the atomic TASK-540 consumed slot",
    "a duplicated TASK-540 reserved prose slot",
    "a missing reservation-policy marker",
    "a reservation-policy marker before the TASK-540 slot",
    "a duplicated reservation-policy marker",
    'canonicalClosureIndex.replace("1261", "1262")',
    'canonicalClosureIndex.replace("TASK-548", "TASK-549")',
    "normalizeProse(TASK_540_FOLLOWING_RESERVATION_PROSE)",
    'canonicalClosureIndex.replace("Use 1262", "Use 1263")',
  ]) {
    expect(mutants).toContain(token);
  }
});

test("TASK-540 seven frozen helpers are regular tracked files with exact bytes", () => {
  expect(Object.keys(FROZEN_HELPER_SHA256)).toEqual(helperRelatives);
  for (const relativePath of helperRelatives) {
    const absolutePath = path.join(root, relativePath);
    const info = lstatSync(absolutePath);
    expect(info.isFile()).toBe(true);
    expect(info.isSymbolicLink()).toBe(false);
    expect(createHash("sha256").update(readFileSync(absolutePath)).digest("hex")).toBe(
      FROZEN_HELPER_SHA256[relativePath as keyof typeof FROZEN_HELPER_SHA256]
    );
    const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "--", relativePath], {
      cwd: root,
      encoding: "utf8",
    });
    expect(tracked.status).toBe(0);
    expect(tracked.stderr).toBe("");
    expect(tracked.stdout.trim()).toBe(relativePath);
  }
});

test("frozen executor pin matches and is the implement workflow's only dirty byte range", () => {
  const { executor, implement } = readSources();
  const actualSha256 = createHash("sha256").update(executor).digest("hex");

  expect(frozenExecutorSha256(implement)).toBe(actualSha256);
  expect(createHash("sha256").update(maskFrozenExecutorSha256(implement)).digest("hex")).toBe(
    MASKED_IMPLEMENT_SHA256
  );
});
