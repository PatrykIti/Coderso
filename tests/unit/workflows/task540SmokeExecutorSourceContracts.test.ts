import { expect, test } from "bun:test";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isCallExpression,
  isExportDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isObjectBindingPattern,
  isReturnStatement,
  isStringLiteral,
  isVariableStatement,
  type Node,
} from "typescript";

const root = path.resolve(import.meta.dir, "../../..");

const workflowPaths = Object.freeze({
  adminApiSession: "_docs/_workflows/task-540-smoke/runtime/admin-api-session.mjs",
  bootstrapBridgeSources: "_docs/_workflows/task-540-smoke/executor/bridge-sources/bootstrap.mjs",
  bootstrapRestoration:
    "_docs/_workflows/task-540-smoke/executor/self-test/bootstrap-restoration.mjs",
  boundedStream: "_docs/_workflows/task-540-smoke/runtime/bounded-stream.mjs",
  browserOutputAuthority: "_docs/_workflows/task-540-smoke/executor/browser-output-authority.mjs",
  bunBridgeContracts: "_docs/_workflows/task-540-smoke/executor/self-test/bun-bridge-contracts.mjs",
  bunBridgeResourceSources:
    "_docs/_workflows/task-540-smoke/executor/bun-bridge-resource-sources.mjs",
  bunBridgeValidationPrimitives:
    "_docs/_workflows/task-540-smoke/executor/bun-bridge-validation-primitives.mjs",
  buttonImage: "_docs/_workflows/task-540-smoke/browser/scenarios/button-image.mjs",
  config: "_docs/_workflows/task-540-smoke/executor/config.mjs",
  dirtyGuards: "_docs/_workflows/task-540-smoke/browser/scenarios/dirty-guards.mjs",
  environment: "_docs/_workflows/task-540-smoke/executor/environment.mjs",
  executor: "_docs/_workflows/task-540-smoke-executor.mjs",
  genericInvocations: "_docs/_workflows/task-540-smoke/browser/generic-invocations.mjs",
  observationSources: "_docs/_workflows/task-540-smoke/browser/observation-sources.mjs",
  planExecution: "_docs/_workflows/task-540-smoke/executor/plan-execution.mjs",
  platformRuntimeOperations:
    "_docs/_workflows/task-540-smoke/executor/runtime-operations/platform.mjs",
  processRuntime: "_docs/_workflows/task-540-smoke/runtime/process-runtime.mjs",
  relatedCache: "_docs/_workflows/task-540-smoke/browser/scenarios/related-cache.mjs",
  resourceBridgeOutputValidators:
    "_docs/_workflows/task-540-smoke/executor/bridge-output-validators/resources.mjs",
  routeAndActionSources: "_docs/_workflows/task-540-smoke/browser/route-and-action-sources.mjs",
  runCode: "_docs/_workflows/task-540-smoke/browser/run-code.mjs",
  settlementDiagnosticCases:
    "_docs/_workflows/task-540-smoke/executor/self-test/settlement-diagnostic-cases.mjs",
  simpleInvocations: "_docs/_workflows/task-540-smoke/browser/simple-invocations.mjs",
  smokeHost: "_docs/_workflows/task-540-smoke-host.mjs",
  storageManifest: "_docs/_workflows/task-540-smoke/runtime/storage-manifest.mjs",
});

const EXPECTED_EXECUTOR_MODULE_PATHS = Object.freeze([
  "_docs/_workflows/task-540-smoke-contract.mjs",
  "_docs/_workflows/task-540-smoke-executor.mjs",
  "_docs/_workflows/task-540-smoke/browser/expression-and-capture-sources.mjs",
  "_docs/_workflows/task-540-smoke/browser/generic-invocations.mjs",
  "_docs/_workflows/task-540-smoke/browser/observation-sources.mjs",
  "_docs/_workflows/task-540-smoke/browser/route-and-action-sources.mjs",
  "_docs/_workflows/task-540-smoke/browser/run-code.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/button-image.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/dirty-guards.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/ownership.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/related-cache.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/responsive-users.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/space-selection.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/tabs-content.mjs",
  "_docs/_workflows/task-540-smoke/browser/scenarios/tabs-keyboard.mjs",
  "_docs/_workflows/task-540-smoke/browser/simple-invocations.mjs",
  "_docs/_workflows/task-540-smoke/browser/visible-assertion-sources.mjs",
  "_docs/_workflows/task-540-smoke/cleanup/construction-authority.mjs",
  "_docs/_workflows/task-540-smoke/cleanup/diagnostics.mjs",
  "_docs/_workflows/task-540-smoke/cleanup/final-baselines.mjs",
  "_docs/_workflows/task-540-smoke/cleanup/subject-authority.mjs",
  "_docs/_workflows/task-540-smoke/contract/action-rows.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/button-image.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/dirty-guard.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/recovery-cache.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/retention-user.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/setup.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/space-selection.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/tabs-content.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/tabs-keyboard.mjs",
  "_docs/_workflows/task-540-smoke/contract/actions/terminal.mjs",
  "_docs/_workflows/task-540-smoke/contract/assertion-registries.mjs",
  "_docs/_workflows/task-540-smoke/contract/contract-dsl.mjs",
  "_docs/_workflows/task-540-smoke/contract/core.mjs",
  "_docs/_workflows/task-540-smoke/contract/fixtures.mjs",
  "_docs/_workflows/task-540-smoke/contract/manifest.mjs",
  "_docs/_workflows/task-540-smoke/contract/metadata.mjs",
  "_docs/_workflows/task-540-smoke/contract/output-contracts.mjs",
  "_docs/_workflows/task-540-smoke/contract/plan.mjs",
  "_docs/_workflows/task-540-smoke/contract/references.mjs",
  "_docs/_workflows/task-540-smoke/contract/registries.mjs",
  "_docs/_workflows/task-540-smoke/contract/requirements.mjs",
  "_docs/_workflows/task-540-smoke/contract/selectors.mjs",
  "_docs/_workflows/task-540-smoke/contract/self-test/helpers.mjs",
  "_docs/_workflows/task-540-smoke/contract/self-test/index.mjs",
  "_docs/_workflows/task-540-smoke/contract/self-test/loop-integrity.mjs",
  "_docs/_workflows/task-540-smoke/contract/self-test/manifest-fail-closed.mjs",
  "_docs/_workflows/task-540-smoke/contract/self-test/plan-contract.mjs",
  "_docs/_workflows/task-540-smoke/contract/self-test/registries-fixtures.mjs",
  "_docs/_workflows/task-540-smoke/contract/visible-assertion-predicates.mjs",
  "_docs/_workflows/task-540-smoke/contract/visible-assertion-schemas.mjs",
  "_docs/_workflows/task-540-smoke/executor/action-resources.mjs",
  "_docs/_workflows/task-540-smoke/executor/auth-challenge-authority.mjs",
  "_docs/_workflows/task-540-smoke/executor/bootstrap-contracts.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-descriptors.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-input-validators.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-output-validators/resources.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-output-validators/response-lost.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-sources/bootstrap.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-sources/platform.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-sources/response-lost.mjs",
  "_docs/_workflows/task-540-smoke/executor/bridge-sources/user-preference.mjs",
  "_docs/_workflows/task-540-smoke/executor/browser-output-authority.mjs",
  "_docs/_workflows/task-540-smoke/executor/bun-bridge-resource-sources.mjs",
  "_docs/_workflows/task-540-smoke/executor/bun-bridge-validation-primitives.mjs",
  "_docs/_workflows/task-540-smoke/executor/canonical-evidence.mjs",
  "_docs/_workflows/task-540-smoke/executor/captures.mjs",
  "_docs/_workflows/task-540-smoke/executor/config.mjs",
  "_docs/_workflows/task-540-smoke/executor/diagnostic-sink.mjs",
  "_docs/_workflows/task-540-smoke/executor/environment.mjs",
  "_docs/_workflows/task-540-smoke/executor/execution-contract.mjs",
  "_docs/_workflows/task-540-smoke/executor/failure-boundary.mjs",
  "_docs/_workflows/task-540-smoke/executor/fake-capabilities.mjs",
  "_docs/_workflows/task-540-smoke/executor/foundation.mjs",
  "_docs/_workflows/task-540-smoke/executor/json-schema.mjs",
  "_docs/_workflows/task-540-smoke/executor/output-parser.mjs",
  "_docs/_workflows/task-540-smoke/executor/plan-execution.mjs",
  "_docs/_workflows/task-540-smoke/executor/private-workspace.mjs",
  "_docs/_workflows/task-540-smoke/executor/ref-dsl.mjs",
  "_docs/_workflows/task-540-smoke/executor/resource-bun-authority.mjs",
  "_docs/_workflows/task-540-smoke/executor/resource-contracts.mjs",
  "_docs/_workflows/task-540-smoke/executor/resource-ledger.mjs",
  "_docs/_workflows/task-540-smoke/executor/runtime-operations/overrides.mjs",
  "_docs/_workflows/task-540-smoke/executor/runtime-operations/platform.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/api-context.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/auth-challenge.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/bootstrap-restoration.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-auth-settlement-source.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-capture-frontier.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-dirty-navigation-source.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-run-code-source-ownership.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-source-context.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-tone-content-fill-source.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/browser-tone-flow-source.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/bun-bridge-contracts.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/bun-response-contracts.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/cleanup-pca-authority.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/cleanup-stages.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/construction-cleanup.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/failure-action-classification.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/failure-action-execution.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/failure-action-sinks.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/failure-frames.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/host-readiness-policy.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/media-isolation.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/media-upload.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/nominal-evidence.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/parser-ref-native-output.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/response-lost-discovery.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/seo-entry-cleanup.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/settlement-diagnostic-cases.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/settlement-diagnostic-harness.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/source-ownership-auth-rate.mjs",
  "_docs/_workflows/task-540-smoke/executor/self-test/terminal-resource-graph.mjs",
  "_docs/_workflows/task-540-smoke/executor/task-traffic.mjs",
  "_docs/_workflows/task-540-smoke/executor/terminal-resource-graph.mjs",
  "_docs/_workflows/task-540-smoke/runtime/admin-api-session.mjs",
  "_docs/_workflows/task-540-smoke/runtime/bootstrap-login.mjs",
  "_docs/_workflows/task-540-smoke/runtime/bounded-stream.mjs",
  "_docs/_workflows/task-540-smoke/runtime/bun-bridge-transport.mjs",
  "_docs/_workflows/task-540-smoke/runtime/bun-child-protocol.mjs",
  "_docs/_workflows/task-540-smoke/runtime/command-authority.mjs",
  "_docs/_workflows/task-540-smoke/runtime/media-operations.mjs",
  "_docs/_workflows/task-540-smoke/runtime/media-storage-ownership.mjs",
  "_docs/_workflows/task-540-smoke/runtime/missing-media-proof.mjs",
  "_docs/_workflows/task-540-smoke/runtime/operation-router.mjs",
  "_docs/_workflows/task-540-smoke/runtime/owned-host.mjs",
  "_docs/_workflows/task-540-smoke/runtime/process-runtime.mjs",
  "_docs/_workflows/task-540-smoke/runtime/response-lost-baselines.mjs",
  "_docs/_workflows/task-540-smoke/runtime/response-lost-discovery.mjs",
  "_docs/_workflows/task-540-smoke/runtime/response-lost-registry.mjs",
  "_docs/_workflows/task-540-smoke/runtime/storage-manifest.mjs",
  "_docs/_workflows/task-540-smoke/runtime/storage-preflight.mjs",
]);

function readWorkflowSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function localStaticModuleSpecifiers(absolutePath: string, source: string): string[] {
  const sourceFile = createSourceFile(
    absolutePath,
    source,
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
  const specifiers: string[] = [];
  for (const statement of sourceFile.statements) {
    const declaration =
      isImportDeclaration(statement) || isExportDeclaration(statement) ? statement : null;
    const moduleSpecifier = declaration?.moduleSpecifier;
    if (
      moduleSpecifier &&
      isStringLiteral(moduleSpecifier) &&
      moduleSpecifier.text.startsWith(".")
    ) {
      specifiers.push(moduleSpecifier.text);
    }
  }
  return specifiers;
}

function readExecutorModuleGraph(): ReadonlyMap<string, string> {
  const pending: string[] = [workflowPaths.executor];
  const sources = new Map<string, string>();
  while (pending.length > 0) {
    const relativePath = pending.shift()!;
    if (sources.has(relativePath)) {
      continue;
    }
    expect(EXPECTED_EXECUTOR_MODULE_PATHS).toContain(relativePath);
    const absolutePath = path.join(root, relativePath);
    const info = lstatSync(absolutePath);
    expect(info.isFile()).toBe(true);
    expect(info.isSymbolicLink()).toBe(false);
    expect(realpathSync(absolutePath)).toBe(absolutePath);
    const source = readFileSync(absolutePath, "utf8");
    sources.set(relativePath, source);
    for (const specifier of localStaticModuleSpecifiers(absolutePath, source)) {
      expect(specifier.endsWith(".mjs")).toBe(true);
      pending.push(
        path
          .relative(root, path.resolve(path.dirname(absolutePath), specifier))
          .split(path.sep)
          .join("/")
      );
    }
  }
  expect(EXPECTED_EXECUTOR_MODULE_PATHS).toHaveLength(133);
  expect([...sources.keys()].sort()).toEqual(EXPECTED_EXECUTOR_MODULE_PATHS);
  return sources;
}

function expectGraphTokenAbsent(sources: ReadonlyMap<string, string>, token: string): void {
  const offenders = [...sources]
    .filter(([, source]) => source.includes(token))
    .map(([relativePath]) => relativePath);
  expect(offenders).toEqual([]);
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
    new RegExp(
      `(?:export )?const ${name} = (?:Object\\.freeze|deepFreezeExact)\\(\\[([\\s\\S]*?)\\]\\);`,
      "u"
    )
  );
  expect(match).not.toBeNull();
  return [...match![1].matchAll(/"([^"]+)"/gu)].map((entry) => entry[1]);
}

test("process runtime is the sole owner of process and host composition", () => {
  const executor = readWorkflowSource(workflowPaths.executor);
  const processRuntime = readWorkflowSource(workflowPaths.processRuntime);
  const processRuntimePath = path.join(root, workflowPaths.processRuntime);
  const processRuntimeSourceFile = createSourceFile(
    processRuntimePath,
    processRuntime,
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
  const runtimeDeclarations = processRuntimeSourceFile.statements.filter(
    (statement) => !isImportDeclaration(statement)
  );
  expect(runtimeDeclarations).toHaveLength(1);
  const [factoryDeclaration] = runtimeDeclarations;
  expect(isFunctionDeclaration(factoryDeclaration)).toBe(true);
  if (!isFunctionDeclaration(factoryDeclaration)) {
    throw new Error("process runtime factory declaration is absent");
  }
  expect(factoryDeclaration.name?.text).toBe("createProcessRuntime");
  expect(factoryDeclaration.parameters).toHaveLength(0);
  expect(factoryDeclaration.modifiers?.map((modifier) => modifier.getText())).toEqual(["export"]);

  const exactRuntimeKeys = [
    "PROCESS_ABSENCE_STABILITY_MS",
    "PROCESS_KILL_GRACE_MS",
    "PROCESS_TERM_GRACE_MS",
    "SMOKE_PORTS",
    "appendRetainedGroupMembers",
    "delayMilliseconds",
    "portsAreAbsent",
    "readHostReadyLine",
    "readHostReadyLineWithTimerAuthority",
    "readProcIdentity",
    "resolveValidatedBundledPlaywrightRequest",
    "runPrivateProcess",
    "runRetainedProcessGroup",
    "startOwnedHost",
    "stopOwnedHost",
  ];
  const frozenReturn = processRuntime.match(
    /  return Object\.freeze\(\{\n((?:    [A-Za-z][A-Za-z0-9_]*,\n)+)  \}\);\n\}\n?$/u
  );
  expect(frozenReturn).not.toBeNull();
  expect(
    frozenReturn![1]
      .trim()
      .split("\n")
      .map((line) => line.trim().replace(/,$/u, ""))
  ).toEqual(exactRuntimeKeys);

  const facadeBinding = executor.match(
    /const \{\n((?:  [A-Za-z][A-Za-z0-9_]*,\n)+)\} = createProcessRuntime\(\);/u
  );
  expect(facadeBinding).not.toBeNull();
  expect(
    facadeBinding![1]
      .trim()
      .split("\n")
      .map((line) => line.trim().replace(/,$/u, ""))
  ).toEqual(exactRuntimeKeys);
  expect(countToken(executor, "createProcessRuntime()")).toBe(1);
  expect(countToken(processRuntime, "createBoundedStreamRuntime({")).toBe(1);
  expect(countToken(processRuntime, "createOwnedHostRuntime({")).toBe(1);

  const movedDeclarationTokens = [
    "function parseProcIdentity(",
    "async function readProcIdentity(",
    "function sameProcessIdentity(",
    "async function readProcessGroupMembers(",
    "const PROCESS_TERM_GRACE_MS =",
    "const PROCESS_ABSENCE_STABILITY_MS =",
    "function delayMilliseconds(",
    "async function readFreshProcessIdentityWithRetry(",
    "function appendRetainedGroupMembers(",
    "async function waitForOwnedGroupAbsence(",
    "async function proveOwnedGroupAbsentStable(",
    "async function terminateRetainedProcessGroup(",
    "async function resolveValidatedBundledPlaywrightRequest(",
    "async function runPrivateProcess(",
  ];
  for (const token of movedDeclarationTokens) {
    expect(countToken(processRuntime, token)).toBe(1);
    expect(executor).not.toContain(token);
  }
  for (const removedFacadeToken of [
    "createBoundedStreamRuntime",
    "createOwnedHostRuntime",
    "pathToFileURL",
    "readdir",
  ]) {
    expect(executor).not.toContain(removedFacadeToken);
  }
});

test("plan execution has one focused owner and exact injected authority", () => {
  const dependencyKeys = [
    "SMOKE_PORTS",
    "beginPrivateFailureAction",
    "completePrivateFailureAction",
    "retainPrivateAuthSettlementFailureClassNeverThrow",
    "retainPrivateDirtyNavigationFailureClassNeverThrow",
    "retainPrivateToneOpenFailureClassNeverThrow",
    "retainPrivateToneSelectFailureClassNeverThrow",
    "sealPrivateFailureActionTracker",
  ];
  const planExecution = readWorkflowSource(workflowPaths.planExecution);
  const planExecutionPath = path.join(root, workflowPaths.planExecution);
  const planExecutionSourceFile = createSourceFile(
    planExecutionPath,
    planExecution,
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
  const planExecutionImports = planExecutionSourceFile.statements.filter(isImportDeclaration);
  expect(
    planExecutionImports.map((declaration) => declaration.getText(planExecutionSourceFile))
  ).toEqual([
    `import {
  acquiredSubjects,
  assertCanonicalFinalization as assertCanonicalFinalizationCore,
  assertCanonicalMediaRaceProjection,
  assertCanonicalMediaRuntimeReceipts,
  assertCanonicalPrimaryRuntimeInventory,
  assertCleanupReceiptBijection,
  buildCanonicalRouteEvidence,
  buildCanonicalScenarioEvidence,
  validateCapabilityResult,
} from "./canonical-evidence.mjs";`,
    'import { SingleAssignmentCaptureMap } from "./captures.mjs";',
    'import { TASK_FAILURE } from "./config.mjs";',
    'import { assertRegisteredExecutable } from "./execution-contract.mjs";',
    `import {
  assertRecursivelyFrozen,
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";`,
    'import { ResourceCleanupPlanner, ResourceLedgerBuilder } from "./resource-ledger.mjs";',
  ]);

  const planExecutionDeclarations = planExecutionSourceFile.statements.filter(
    (statement) => !isImportDeclaration(statement)
  );
  expect(planExecutionDeclarations).toHaveLength(1);
  const [factoryDeclaration] = planExecutionDeclarations;
  expect(isFunctionDeclaration(factoryDeclaration)).toBe(true);
  if (!isFunctionDeclaration(factoryDeclaration)) {
    throw new Error("plan execution factory declaration is absent");
  }
  expect(factoryDeclaration.name?.text).toBe("createPlanExecutionRuntime");
  expect(factoryDeclaration.modifiers?.map((modifier) => modifier.getText())).toEqual(["export"]);
  expect(factoryDeclaration.parameters).toHaveLength(1);
  const dependencyBinding = factoryDeclaration.parameters[0].name;
  expect(isObjectBindingPattern(dependencyBinding)).toBe(true);
  if (!isObjectBindingPattern(dependencyBinding)) {
    throw new Error("plan execution dependency binding is absent");
  }
  expect(
    dependencyBinding.elements.map((element) => element.name.getText(planExecutionSourceFile))
  ).toEqual(dependencyKeys);

  const factoryStatements = factoryDeclaration.body?.statements ?? [];
  expect(factoryStatements).toHaveLength(4);
  expect(isVariableStatement(factoryStatements[0])).toBe(true);
  expect(factoryStatements[0].getText(planExecutionSourceFile)).toBe(
    "const PRIVATE_CORE = new WeakMap();"
  );
  expect(isFunctionDeclaration(factoryStatements[1])).toBe(true);
  expect(isFunctionDeclaration(factoryStatements[2])).toBe(true);
  expect(isReturnStatement(factoryStatements[3])).toBe(true);
  if (
    !isFunctionDeclaration(factoryStatements[1]) ||
    !isFunctionDeclaration(factoryStatements[2])
  ) {
    throw new Error("plan execution owned functions are absent");
  }
  expect(factoryStatements[1].name?.text).toBe("assertCanonicalFinalization");
  expect(factoryStatements[2].name?.text).toBe("executeSmokePlanCore");

  expect(countToken(planExecution, "const PRIVATE_CORE = new WeakMap();")).toBe(1);
  expect(countToken(planExecution, "PRIVATE_CORE.set(")).toBe(1);
  expect(countToken(planExecution, "PRIVATE_CORE.get(")).toBe(1);
  expect(countToken(planExecution, "function assertCanonicalFinalization(")).toBe(1);
  expect(countToken(planExecution, "async function executeSmokePlanCore(")).toBe(1);
  expect(planExecution).toMatch(
    /  return Object\.freeze\(\{\n    assertCanonicalFinalization,\n    executeSmokePlanCore,\n  \}\);\n\}\n?$/u
  );

  const executor = readWorkflowSource(workflowPaths.executor);
  const executorSourceFile = createSourceFile(
    path.join(root, workflowPaths.executor),
    executor,
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
  const planExecutionFacadeImports = executorSourceFile.statements
    .filter(isImportDeclaration)
    .filter(
      (declaration) =>
        isStringLiteral(declaration.moduleSpecifier) &&
        declaration.moduleSpecifier.text === "./task-540-smoke/executor/plan-execution.mjs"
    );
  expect(planExecutionFacadeImports).toHaveLength(1);
  expect(planExecutionFacadeImports[0].getText(executorSourceFile)).toBe(
    'import { createPlanExecutionRuntime } from "./task-540-smoke/executor/plan-execution.mjs";'
  );
  expect(executor).toContain(
    `const { assertCanonicalFinalization, executeSmokePlanCore } = createPlanExecutionRuntime({
  SMOKE_PORTS,
  beginPrivateFailureAction,
  completePrivateFailureAction,
  retainPrivateAuthSettlementFailureClassNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  retainPrivateToneOpenFailureClassNeverThrow,
  retainPrivateToneSelectFailureClassNeverThrow,
  sealPrivateFailureActionTracker,
});`
  );
  let planExecutionFactoryCalls = 0;
  let planExecutionFactoryIdentifiers = 0;
  function visitExecutorNode(node: Node): void {
    if (isIdentifier(node) && node.text === "createPlanExecutionRuntime") {
      planExecutionFactoryIdentifiers += 1;
    }
    if (
      isCallExpression(node) &&
      isIdentifier(node.expression) &&
      node.expression.text === "createPlanExecutionRuntime"
    ) {
      planExecutionFactoryCalls += 1;
    }
    forEachChild(node, visitExecutorNode);
  }
  visitExecutorNode(executorSourceFile);
  expect(planExecutionFactoryCalls).toBe(1);
  expect(planExecutionFactoryIdentifiers).toBe(2);
  expect(countToken(executor, "executeSmokePlanCore")).toBe(6);
  expect(countToken(executor, "assertCanonicalFinalization")).toBe(2);
  expect(executor).not.toContain("const PRIVATE_CORE = new WeakMap();");
  expect(executor).not.toContain("function assertCanonicalFinalization(");
  expect(executor).not.toContain("async function executeSmokePlanCore(");
});

test("Bun bridge validation primitives have one focused owner", () => {
  const primitiveNames = [
    "validateExactBridgeKeys",
    "validateBridgeNullableUuid",
    "validateBridgeNullableString",
    "validateBridgeJsonObject",
    "validateBridgeStringArray",
    "requireBoundedBridgeString",
    "requireBridgeUuid",
  ];
  const primitivesPath = path.join(root, workflowPaths.bunBridgeValidationPrimitives);
  const primitives = readWorkflowSource(workflowPaths.bunBridgeValidationPrimitives);
  const primitivesSourceFile = createSourceFile(
    primitivesPath,
    primitives,
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
  const primitiveImports = primitivesSourceFile.statements.filter(isImportDeclaration);
  const primitiveDeclarations = primitivesSourceFile.statements.filter(isFunctionDeclaration);

  expect(primitiveImports.map((declaration) => declaration.getText(primitivesSourceFile))).toEqual([
    'import { exactOwnKeys, invariant } from "./foundation.mjs";',
    'import { assertPlainJsonValue } from "./json-schema.mjs";',
  ]);
  expect(primitiveDeclarations.map((declaration) => declaration.name?.text)).toEqual(
    primitiveNames
  );
  expect(
    primitiveDeclarations.map((declaration) =>
      declaration.modifiers?.map((modifier) => modifier.getText(primitivesSourceFile))
    )
  ).toEqual(primitiveNames.map(() => ["export"]));
  expect(primitivesSourceFile.statements).toHaveLength(9);

  const executor = readWorkflowSource(workflowPaths.executor);
  const executorSourceFile = createSourceFile(
    path.join(root, workflowPaths.executor),
    executor,
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
  const primitiveFacadeImports = executorSourceFile.statements
    .filter(isImportDeclaration)
    .filter(
      (declaration) =>
        isStringLiteral(declaration.moduleSpecifier) &&
        declaration.moduleSpecifier.text ===
          "./task-540-smoke/executor/bun-bridge-validation-primitives.mjs"
    );
  expect(primitiveFacadeImports).toHaveLength(1);
  expect(primitiveFacadeImports[0].getText(executorSourceFile)).toBe(
    `import { requireBridgeUuid } from "./task-540-smoke/executor/bun-bridge-validation-primitives.mjs";`
  );
  const facadeFunctionNames = executorSourceFile.statements
    .filter(isFunctionDeclaration)
    .map((declaration) => declaration.name?.text);
  for (const primitiveName of primitiveNames) {
    expect(facadeFunctionNames).not.toContain(primitiveName);
  }
});

test("flagged run-code values cross the source boundary only as bounded data", () => {
  const runCode = readWorkflowSource(workflowPaths.runCode);
  const simpleInvocations = readWorkflowSource(workflowPaths.simpleInvocations);
  const genericInvocations = readWorkflowSource(workflowPaths.genericInvocations);
  const executorGraph = readExecutorModuleGraph();

  expect(runCode).toContain("function buildDataBearingRunCodeSource(operation, input)");
  expect(runCode).toContain("canonicalRunCodePayloadEncoding(operation, input)");
  expect(simpleInvocations).toContain('return buildDataBearingRunCodeInvocation("goto-ready"');
  expect(simpleInvocations).toContain('return buildDataBearingRunCodeInvocation("fill"');
  expect(simpleInvocations).toContain('return buildDataBearingRunCodeInvocation("type"');
  expect(simpleInvocations).toContain('return buildDataBearingRunCodeInvocation("press"');
  expect(simpleInvocations).toContain('return buildDataBearingRunCodeInvocation("focus"');
  expect(runCode).toContain("unitResultAlreadyNormalized: true");
  expect(genericInvocations).toContain("const unitResultAlreadyNormalized =");
  expect(runCode).toContain('const legacySelector = "[data-" + "screen-runtime-root]";');
  for (const forbiddenToken of [
    '.replace("related-failure", "related-failure")',
    "frameSha256: hashBytes(frame)",
    "stdoutSha256: hashBytes(outcome.stdoutBytes)",
    "stderrSha256: hashBytes(outcome.stderrBytes)",
    "runCode(`(page) => page.locator(${JSON.stringify(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR)})`)",
  ]) {
    expectGraphTokenAbsent(executorGraph, forbiddenToken);
  }
});

test("credential evidence avoids fast digests while secret-free evidence stays bound", () => {
  const config = readWorkflowSource(workflowPaths.config);
  const bunBridgeContracts = readWorkflowSource(workflowPaths.bunBridgeContracts);
  const settlementDiagnosticCases = readWorkflowSource(workflowPaths.settlementDiagnosticCases);
  const executorGraph = readExecutorModuleGraph();

  expect(config).toContain('const LF_SHA256 = "01ba4719');
  expect(config).toContain('const EMPTY_SHA256 = "e3b0c442');
  expectGraphTokenAbsent(executorGraph, "projection.frameSha256 =");
  expect(settlementDiagnosticCases).toContain("credentialReceiptDigestCalls === 0");
  expect(bunBridgeContracts).toContain('"secret-free Bun frame projection drift"');
  expect(settlementDiagnosticCases).toContain("ordinaryReceiptDigestCalls === 2");
  expect(settlementDiagnosticCases).toContain("normalizedCredentialOutput.equals");
});

test("dg022 teardown and dg024 dirty navigation use same-action visible-effect proofs", () => {
  const observationSources = readWorkflowSource(workflowPaths.observationSources);
  const simpleInvocations = readWorkflowSource(workflowPaths.simpleInvocations);
  const dirtyGuards = readWorkflowSource(workflowPaths.dirtyGuards);

  const draftSnapshot = sourceSection(
    observationSources,
    '} else if (config.name === "entry-drafts-url-before-cancel") {',
    '} else if (config.name === "entry-save-failure-ui-settled") {'
  );
  expect(countToken(draftSnapshot, "output = await entryDraftSample();")).toBe(1);
  expect(draftSnapshot).not.toContain("lockOwnerTimeline");
  expect(draftSnapshot).not.toContain("slot.observer");

  const toneTeardown = sourceSection(
    simpleInvocations,
    '        invariant(\n          toneFlowConfig.phase === "select"',
    "      const authPhase = EXPECTED_AUTH_CHALLENGE_PHASES.find("
  );
  for (const token of [
    "const sampleAtomicTeardown = () => page.evaluate(",
    "return { interactionHandoff, structuralClosed };",
    "const stabilityHorizonMs = 600;",
    "const teardownSample = await sampleAtomicTeardown();",
    "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
    "!finalAtomicTeardownSample.structuralClosed",
    "!finalAtomicTeardownSample.interactionHandoff",
  ]) {
    expect(toneTeardown).toContain(token);
  }
  expect(toneTeardown).not.toContain("MutationObserver");
  expect(toneTeardown).not.toContain("__wf540LockOwnerTimeline_");
  expect(toneTeardown).not.toContain("timelineInstalled");

  const dirtyNavigation = sourceSection(
    dirtyGuards,
    "      const dirtyNavigationConfig = DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG[action.id];",
    '    if (action.executable.type === "browser-screenshot") {'
  );
  for (const token of [
    'const body = page.locator("body");',
    "const bodyInteraction = await body.count() === 1",
    'scrollLocked: node.hasAttribute("data-scroll-locked"),',
    "bodyInteraction.scrollLocked === true",
    'bodyInteraction.inlinePointerEvents === "none"',
    'bodyInteraction.computedPointerEvents === "none"',
    "if (await candidate.isVisible() && positive(rect))",
    "await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });",
    "const candidateStillVisible = await candidate.isVisible();",
    "const receivesPointerAtCenter = await candidate.evaluate(",
    "document.elementFromPoint(",
    "if (receivesPointerAtCenter) {",
    "await links.nth(visibleLinkIndex).click({ timeout: 30000, noWaitAfter: true });",
    "const urlStable = page.url() === urlBefore;",
    "const navigationStable = page.__wf540ReadNavigationCount() === navigationCountBefore;",
    'const keepEditing = dialog.getByRole("button", { name: "Keep editing", exact: true });',
    'const discard = dialog.getByRole("button", { name: "Discard and continue", exact: true });',
  ]) {
    expect(dirtyNavigation).toContain(token);
  }
  const targetInteractionOrder = [
    "const receivesPointerAtCenter = await candidate.evaluate(",
    "if (receivesPointerAtCenter) {",
    "visibleLinkIndex = nextVisibleLinkIndex;",
    '} else if (bodyInteraction.inlinePointerEvents === "none") {',
    '} else if (bodyInteraction.computedPointerEvents === "none") {',
    "} else if (bodyInteraction.scrollLocked === true) {",
    "pollTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7])};",
  ];
  let previousInteractionIndex = -1;
  for (const token of targetInteractionOrder) {
    const interactionIndex = dirtyNavigation.indexOf(token);
    expect(interactionIndex).toBeGreaterThan(previousInteractionIndex);
    previousInteractionIndex = interactionIndex;
  }
  const finalTargetProof = [
    "const candidate = links.nth(nextVisibleLinkIndex);",
    "await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });",
    "const rect = await candidate.boundingBox();",
    "const candidateStillVisible = await candidate.isVisible();",
  ].join("\n                ");
  expect(dirtyNavigation).toContain(finalTargetProof);
  expect(countToken(dirtyNavigation, ".scrollIntoViewIfNeeded({ timeout: 30000 });")).toBe(1);
  expect(dirtyNavigation).not.toContain("sampleLockOwnerState");
  expect(dirtyNavigation).not.toContain("cleanupLockOwnerTimeline");
  expect(dirtyNavigation).not.toContain("__wf540LockOwnerTimeline_");
  expect(dirtyNavigation).not.toContain("force: true");
});

test("phase-eight bootstrap restore is one typed nullable-safe CAS", () => {
  const config = readWorkflowSource(workflowPaths.config);
  const executor = readWorkflowSource(workflowPaths.executor);
  const bootstrapRestoration = readWorkflowSource(workflowPaths.bootstrapRestoration);
  const bootstrapBridgeSources = readWorkflowSource(workflowPaths.bootstrapBridgeSources);
  const resourceBridgeOutputValidators = readWorkflowSource(
    workflowPaths.resourceBridgeOutputValidators
  );

  expect(frozenStringArray(config, "PHASE_EIGHT_CLEANUP_FAILURE_CLASSES")).toEqual([
    "bootstrap_reconciliation_failed",
    "bootstrap_cas_failed",
    "bootstrap_uncertain_baseline_failed",
    "bootstrap_post_restore_proof_failed",
    "bootstrap_restore_receipt_failed",
  ]);

  const baselineRead = sourceSection(
    bootstrapBridgeSources,
    "const BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE =",
    "const BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE ="
  );
  expect(baselineRead).toContain(".limit(2)");
  expect(baselineRead).toContain("rawUserRow");
  expect(baselineRead).toContain("roleTuples");
  expect(baselineRead).not.toContain(".update(");
  expect(baselineRead).not.toContain(".insert(");
  expect(baselineRead).not.toContain(".delete(");

  const casSource = sourceSection(
    bootstrapBridgeSources,
    "const BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE =",
    "export {"
  );
  const predicateTokens = [
    "notDistinct(users.id,input.userId)",
    "notDistinct(users.email,input.baseline.rawUserRow.email)",
    "notDistinct(users.emailHash,input.baseline.rawUserRow.emailHash)",
    "notDistinct(users.emailEncrypted,input.baseline.rawUserRow.emailEncrypted)",
    "notDistinct(users.passwordHash,input.baseline.rawUserRow.passwordHash)",
    "notDistinct(users.name,input.baseline.rawUserRow.name)",
    "notDistinct(users.status,input.baseline.rawUserRow.status)",
    "notDistinct(users.createdAt,new Date(input.baseline.rawUserRow.createdAt))",
    "notDistinct(users.updatedAt,new Date(input.newestOwnedPair.updatedAt))",
    "notDistinct(users.lastLoginAt,timestamp(input.newestOwnedPair.lastLoginAt))",
  ];
  for (const predicate of predicateTokens) {
    expect(countToken(casSource, predicate)).toBe(1);
  }
  expect(countToken(casSource, "await tx.update(users)")).toBe(1);
  expect(casSource).toContain('.for("update")');
  expect(casSource).toContain('.for("share")');
  expect(casSource).toContain(".where(and(...predicates))");
  expect(casSource).toContain("inTransactionByteIdentical");
  expect(casSource).toContain("afterCommitByteIdentical");
  expect(casSource).toContain('kind:"rolled-back"');
  expect(casSource).toContain('"committed-proof-failed"');

  const typedOutput = sourceSection(
    resourceBridgeOutputValidators,
    "function validateBootstrapRestoreBridgeOutput",
    "function validateBootstrapBaselineReadBridgeOutput"
  );
  expect(typedOutput).toContain(
    '["committed", "committed-proof-failed", "rolled-back"].includes(value.kind)'
  );
  for (const key of [
    "afterCommitByteIdentical",
    "completeRowByteIdentical",
    "conditionalUpdateAffectedOne",
    "inTransactionByteIdentical",
    "restored",
    "roleTuplesByteIdentical",
    "rolesInTransactionByteIdentical",
    "rolesShareLocked",
    "transactionLocked",
  ]) {
    expect(typedOutput).toContain(`"${key}"`);
  }
  expect(typedOutput).toContain(
    'validateExactBridgeKeys(value.proof, proofKeys, descriptor.operationId + " proof")'
  );

  const protocol = sourceSection(
    executor,
    "async function executeBootstrapRestorationProtocol",
    "async function restoreBootstrapLoginState"
  );
  expect(countToken(protocol, "operations.runCasOnce(input)")).toBe(1);
  expect(countToken(protocol, "operations.readBaselineOnce({")).toBe(1);
  expect(protocol).toContain("const latestSettledAttempt = authority.attempts.at(-1)");
  expect(protocol).toContain(
    "deepEqualJson(authority.newestOwnedPair, latestSettledAttempt.afterPair)"
  );
  expect(protocol).toContain("newestOwnedPair: authority.sealedNewestOwnedPair");
  expect(protocol).toContain('casAttempt.kind === "post-restore-proof-failed"');
  expect(protocol).toContain('casAttempt.kind === "outcome-uncertain"');
  expect(protocol).toContain("authority.casAttempts === 1");
  expect(protocol).toContain("authority.uncertainReads === 1");
  expect(bootstrapRestoration).toContain("bootstrapProtocolPairOne");
  expect(bootstrapRestoration).toContain("bootstrapProtocolPairTwo");
  expect(bootstrapRestoration).toContain("first settlement selected for seal");
  expect(bootstrapRestoration).toContain("latest settlement correlation removed");
  expect(bootstrapRestoration).toContain(
    "for (const [index, predicate] of bootstrapCasPredicateTokens.entries())"
  );
  expect(bootstrapRestoration).toContain(
    '["deletion", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace'
  );
  expect(bootstrapRestoration).toContain(
    '["substitution", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace'
  );
  expect(bootstrapRestoration).toContain('"duplication",');
});

test("TASK-540 smoke boundaries retain enlarged nested budgets without retries", () => {
  const executor = readWorkflowSource(workflowPaths.executor);
  const processRuntime = readWorkflowSource(workflowPaths.processRuntime);
  const smokeHost = readWorkflowSource(workflowPaths.smokeHost);
  const config = readWorkflowSource(workflowPaths.config);
  const environment = readWorkflowSource(workflowPaths.environment);
  const platformRuntimeOperations = readWorkflowSource(workflowPaths.platformRuntimeOperations);
  const browserOutputAuthority = readWorkflowSource(workflowPaths.browserOutputAuthority);
  const adminApiSession = readWorkflowSource(workflowPaths.adminApiSession);
  const simpleInvocations = readWorkflowSource(workflowPaths.simpleInvocations);
  const relatedCache = readWorkflowSource(workflowPaths.relatedCache);
  const dirtyGuards = readWorkflowSource(workflowPaths.dirtyGuards);
  const buttonImage = readWorkflowSource(workflowPaths.buttonImage);
  const routeAndActionSources = readWorkflowSource(workflowPaths.routeAndActionSources);
  const runCode = readWorkflowSource(workflowPaths.runCode);
  const observationSources = readWorkflowSource(workflowPaths.observationSources);
  const storageManifest = readWorkflowSource(workflowPaths.storageManifest);
  const boundedStream = readWorkflowSource(workflowPaths.boundedStream);

  expect(config).toContain("const DATABASE_OPERATION_TIMEOUT_MS = 540_000;");
  expect(config).toContain("const COMMAND_TIMEOUT_MS = 1_200_000;");
  expect(config).toContain("const HOST_READY_TIMEOUT_MS = 540_000;");
  expect(smokeHost).toContain("const READY_TIMEOUT_MS = 360_000;");
  expect(smokeHost).toContain("const STOP_TIMEOUT_MS = 15_000;");
  expect(environment).toContain('PLAYWRIGHT_MCP_TIMEOUT_ACTION: "90000",');
  expect(environment).toContain('PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION: "540000",');
  expect(environment).toContain("fixed inherited browser timeout environment conflict: ");
  expect(environment).toContain("fixed repo browser timeout environment conflict: ");
  expect(countToken(config, "timeoutMs: DATABASE_OPERATION_TIMEOUT_MS")).toBe(1);
  expect(countToken(adminApiSession, "timeout: DATABASE_OPERATION_TIMEOUT_MS")).toBe(4);
  expect(processRuntime).toContain("timeoutMs = 90_000");
  expect(countToken(executor, "timeoutMs: 90_000")).toBe(0);
  expect(countToken(browserOutputAuthority, "timeoutMs: 90_000")).toBe(3);
  expect(countToken(platformRuntimeOperations, "timeoutMs: 90_000")).toBe(1);
  expect(countToken(simpleInvocations, "{ timeout: 270000 }")).toBe(1);
  expect(countToken(relatedCache, "{ timeout: 270000 }")).toBe(1);
  expect(countToken(dirtyGuards, "{ timeout: 270000 }")).toBe(1);
  expect(countToken(buttonImage, "{ timeout: 270000 }")).toBe(1);
  expect(routeAndActionSources).toContain("timeout: ${DATABASE_OPERATION_TIMEOUT_MS},");
  expect(countToken(runCode, "{ timeout: ${DATABASE_OPERATION_TIMEOUT_MS} }")).toBe(1);
  expect(countToken(simpleInvocations, "{ timeout: ${DATABASE_OPERATION_TIMEOUT_MS} }")).toBe(2);
  expect(countToken(dirtyGuards, "{ timeout: ${DATABASE_OPERATION_TIMEOUT_MS} }")).toBe(1);
  expect(routeAndActionSources).toContain(
    'page.waitForTimeout(540000).then(() => { throw new Error("wf540_capture_timeout"); });'
  );
  expect(routeAndActionSources).toContain(
    'page.waitForTimeout(540000).then(() => { throw new Error("wf540_settlement_timeout"); });'
  );
  expect(observationSources).toContain("const deadline = Date.now() + 180000;");
  expect(executor).toContain("{ timeout: 15_000 }");
  expect(countToken(storageManifest, "Date.now() - startedAt <= 30_000")).toBe(3);
  expect(processRuntime).toContain("const PROCESS_TERM_GRACE_MS = 40_000;");
  expect(boundedStream).toContain("const PROCESS_KILL_GRACE_MS = 3_000;");
  expect(countToken(adminApiSession, "maxRetries: 0")).toBe(2);
  expect(adminApiSession).not.toMatch(/maxRetries:\s*[1-9]/u);
});
