import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../..");
const executorRelative = "_docs/_workflows/task-540-smoke-executor.mjs";
const implementRelative = "_docs/_workflows/task-540-implement.mjs";
const localOrchestratorRelative = "_docs/_workflows/task-540-local-orchestrator.mjs";
const testNameContractRelative = "_docs/_workflows/task-540-test-name-contract.mjs";
const executorPath = path.join(root, executorRelative);
const implementPath = path.join(root, implementRelative);
const localOrchestratorPath = path.join(root, localOrchestratorRelative);
const testNameContractPath = path.join(root, testNameContractRelative);
const MASKED_IMPLEMENT_SHA256 = "14c1084ab79605acb0b4415d62f43807e275ed19a512558da654124443295d90";

function readSources() {
  return {
    executor: readFileSync(executorPath, "utf8"),
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

test("TASK-540 workflow roots and runtime resources are independently fail-closed", () => {
  const { implement, localOrchestrator, testNameContract } = readSources();
  const cases = [
    {
      source: localOrchestrator,
      runtimeMarker: "await requireTask540LocalRuntimeAuthority(ROOT_AUTHORITY);",
      dynamicImportMarker: "await import(pathToFileURL(IMPLEMENTER).href);",
    },
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

test("flagged run-code values cross the source boundary only as bounded data", () => {
  const { executor } = readSources();

  expect(executor).toContain("function buildDataBearingRunCodeSource(operation, input)");
  expect(executor).toContain("canonicalRunCodePayloadEncoding(operation, input)");
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("goto-ready"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("fill"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("type"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("press"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("focus"');
  expect(executor).toContain("unitResultAlreadyNormalized: true");
  expect(executor).toContain("const unitResultAlreadyNormalized =");
  expect(executor).toContain('const legacySelector = "[data-" + "screen-runtime-root]";');
  expect(executor).not.toContain('.replace("related-failure", "related-failure")');
  expect(executor).not.toContain("frameSha256: hashBytes(frame)");
  expect(executor).not.toContain("stdoutSha256: hashBytes(outcome.stdoutBytes)");
  expect(executor).not.toContain("stderrSha256: hashBytes(outcome.stderrBytes)");
  expect(executor).not.toContain(
    "runCode(`(page) => page.locator(${JSON.stringify(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR)})`)"
  );
});

test("credential evidence avoids fast digests while secret-free evidence stays bound", () => {
  const { executor } = readSources();

  expect(executor).toContain('const LF_SHA256 = "01ba4719');
  expect(executor).toContain('const EMPTY_SHA256 = "e3b0c442');
  expect(executor).not.toContain("projection.frameSha256 =");
  expect(executor).toContain("credentialReceiptDigestCalls === 0");
  expect(executor).toContain('"secret-free Bun frame projection drift"');
  expect(executor).toContain("ordinaryReceiptDigestCalls === 2");
  expect(executor).toContain("normalizedCredentialOutput.equals");
});

test("dg022 through dg024 retain only the bounded final lock-owner projection", () => {
  const { executor } = readSources();

  expect(frozenStringArray(executor, "LOCK_OWNER_FORBIDDEN_RAW_FIELD_NAMES")).toEqual([
    "lockDomText",
    "lockSelectorResult",
    "rawLockValue",
    "lockTimestamp",
    "lockNode",
    "lockHtml",
    "lockUrl",
    "lockStack",
  ]);
  expect(frozenStringArray(executor, "LOCK_OWNER_BROWSER_FAILURE_CLASSES")).toEqual([
    "scroll_locked_select_owned",
    "scroll_locked_dialog_owned",
    "scroll_locked_ownerless",
    "scroll_locked_malformed_value",
    "scroll_locked_owner_ambiguous",
    "scroll_lock_timeline_missing",
    "scroll_lock_timeline_overflow",
  ]);

  const lockContract = sourceSection(
    executor,
    'const LOCK_OWNER_INSTALL_ACTION_ID = "dg-022-tone-muted";',
    "const OPEN_SELECT_CONTENT_SELECTOR"
  );
  expect(lockContract).toContain('const LOCK_OWNER_READ_ACTION_ID = "dg-023-entry-before-cancel"');
  expect(lockContract).toContain('const LOCK_OWNER_CONSUME_ACTION_ID = "dg-024-entry-nav-cancel"');
  expect(lockContract).toContain("const LOCK_OWNER_TIMELINE_MAX_PROJECTIONS = 16");
  expect(lockContract).toContain("const LOCK_OWNER_TIMELINE_MAX_OWNER_COUNT = 8");
  expect(lockContract).toContain('failureClass !== "scroll_locked"');
  expect(lockContract).toContain('if (slot.overflow) return "scroll_lock_timeline_overflow"');
  expect(lockContract).toContain("finalProjection.ordinal !== finalSampleOrdinal");

  expect(executor).toMatch(
    /observer\.observe\(body,\s*\{\s*attributes: true,\s*attributeFilter: \["data-scroll-locked"\],\s*childList: true,\s*subtree: true,\s*\}\s*\);/u
  );
  for (const token of [
    "slot.observer.takeRecords();",
    "const finalProjection = slot.timeline.at(-1);",
    "const finalSampleOrdinal = finalProjection.ordinal;",
    'lockFailureClass = "scroll_lock_timeline_overflow";',
    "} else if (selectCount === 1 && overlayCount === 0 && contentCount === 0) {",
    "} else if (selectCount === 0 && overlayCount === 1 && contentCount === 1) {",
    "} else if (selectCount === 0 && overlayCount === 0 && contentCount === 0) {",
    "slot.observer.disconnect();",
    "Reflect.deleteProperty(globalThis, slotKey);",
    "if ((await cleanupLockOwnerTimeline()) !== true)",
    "select-owned count widened",
    "dialog-owned count widened",
    "ownerless count widened",
    "select/dialog predicates swapped",
    "absent ambiguity condition narrowed",
    "independentlyConstructedDg024MissingKeyFrames",
  ]) {
    expect(executor).toContain(token);
  }
  expect(executor).toContain("classifiedDirtyNavigationFramePairs === 66");
  expect(executor).toContain(
    'Buffer.from(\'{"failureClass":"scroll_locked_select_owned"}\\n\', "utf8")'
  );
});

test("phase-eight bootstrap restore is one typed nullable-safe CAS", () => {
  const { executor } = readSources();
  expect(frozenStringArray(executor, "PHASE_EIGHT_CLEANUP_FAILURE_CLASSES")).toEqual([
    "bootstrap_reconciliation_failed",
    "bootstrap_cas_failed",
    "bootstrap_uncertain_baseline_failed",
    "bootstrap_post_restore_proof_failed",
    "bootstrap_restore_receipt_failed",
  ]);

  const baselineRead = sourceSection(
    executor,
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
    executor,
    "const BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE =",
    "function validateExactBridgeKeys"
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
    executor,
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
  expect(executor).toContain("bootstrapProtocolPairOne");
  expect(executor).toContain("bootstrapProtocolPairTwo");
  expect(executor).toContain("first settlement selected for seal");
  expect(executor).toContain("latest settlement correlation removed");
  expect(executor).toContain(
    "for (const [index, predicate] of bootstrapCasPredicateTokens.entries())"
  );
  expect(executor).toContain('["deletion", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace');
  expect(executor).toContain('["substitution", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace');
  expect(executor).toContain('"duplication",');
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

test("frozen executor pin matches and is the implement workflow's only dirty byte range", () => {
  const { executor, implement } = readSources();
  const actualSha256 = createHash("sha256").update(executor).digest("hex");

  expect(frozenExecutorSha256(implement)).toBe(actualSha256);
  expect(createHash("sha256").update(maskFrozenExecutorSha256(implement)).digest("hex")).toBe(
    MASKED_IMPLEMENT_SHA256
  );
});
