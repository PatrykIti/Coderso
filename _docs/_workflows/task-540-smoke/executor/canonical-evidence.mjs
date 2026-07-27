import {
  assertRecursivelyFrozen,
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";
import { ORCHESTRATOR_EVIDENCE_RUNNER_VERSION, SESSION_NAME } from "./config.mjs";
import {
  BROWSER_RECEIPT_KEYS,
  CLEANUP_OPERATION_KINDS,
  RESOURCE_DELTA_KEYS,
  RUNTIME_RECEIPT_KEYS,
  deepEqualJson,
} from "./resource-contracts.mjs";
import { lengthPrefixedTuple } from "./resource-ledger.mjs";
import { PROVEN_RESOURCE_ACTIONS } from "./action-resources.mjs";
import { canonicalManifestRuntimeOperation } from "../runtime/operation-router.mjs";
import { parseBuilder, resolveLiteral } from "../browser/expression-and-capture-sources.mjs";
import { expandedRoute } from "../browser/route-and-action-sources.mjs";

export function validateCapabilityResult(result, action, executable, plan) {
  exactOwnKeys(
    result,
    ["receipt", "captureBindings", "acquisitionDelta", "settledCreateOrigin"],
    action.id + " result"
  );
  assertRecursivelyFrozen(result);
  invariant(result.receipt.status === 0, action.id + " receipt mismatch");
  if (executable.type === "runtime-operation") {
    exactOwnKeys(result.receipt, RUNTIME_RECEIPT_KEYS, action.id + " runtime receipt", {
      plain: true,
    });
    const expectedOperation = canonicalManifestRuntimeOperation(action);
    invariant(
      result.receipt.runnerVersion === ORCHESTRATOR_EVIDENCE_RUNNER_VERSION &&
        Number.isSafeInteger(result.receipt.sequence) &&
        result.receipt.sequence > 0 &&
        result.receipt.operation === expectedOperation &&
        typeof result.receipt.operationDescriptor === "string" &&
        result.receipt.operationDescriptor.length > 0 &&
        typeof result.receipt.evidenceSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(result.receipt.evidenceSha256) &&
        (result.receipt.subjectKind === null || typeof result.receipt.subjectKind === "string") &&
        (result.receipt.subjectIdentifier === null ||
          typeof result.receipt.subjectIdentifier === "string") &&
        typeof result.receipt.sanitizedOutput === "string" &&
        result.receipt.sanitizedOutput.length <= 4096,
      action.id + " runtime receipt contract drift"
    );
  } else {
    exactOwnKeys(result.receipt, BROWSER_RECEIPT_KEYS, action.id + " browser receipt", {
      plain: true,
    });
    invariant(
      result.receipt.runnerVersion === ORCHESTRATOR_EVIDENCE_RUNNER_VERSION &&
        Number.isSafeInteger(result.receipt.sequence) &&
        result.receipt.sequence > 0 &&
        result.receipt.kind === action.kind &&
        result.receipt.scenario === action.scenario &&
        typeof result.receipt.operation === "string" &&
        result.receipt.operation.length > 0 &&
        (result.receipt.routeKey === null || typeof result.receipt.routeKey === "string") &&
        (result.receipt.method === null || typeof result.receipt.method === "string") &&
        (result.receipt.pattern === null || typeof result.receipt.pattern === "string") &&
        (result.receipt.assertionName === null ||
          typeof result.receipt.assertionName === "string") &&
        typeof result.receipt.command === "string" &&
        result.receipt.command.length > 0 &&
        Number.isSafeInteger(result.receipt.stdoutBytes) &&
        result.receipt.stdoutBytes >= 0 &&
        Number.isSafeInteger(result.receipt.stderrBytes) &&
        result.receipt.stderrBytes >= 0 &&
        typeof result.receipt.stdoutSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(result.receipt.stdoutSha256) &&
        typeof result.receipt.stderrSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(result.receipt.stderrSha256) &&
        result.receipt.stdoutTruncated === false &&
        result.receipt.stderrTruncated === false &&
        typeof result.receipt.sanitizedOutput === "string" &&
        typeof result.receipt.stdoutDiscarded === "boolean" &&
        (result.receipt.pageId === null ||
          /^wf540-page-[1-9][0-9]*$/u.test(result.receipt.pageId)) &&
        (result.receipt.tabIndex === null ||
          (Number.isSafeInteger(result.receipt.tabIndex) && result.receipt.tabIndex >= 0)),
      action.id + " browser receipt contract drift"
    );
    invariant(
      executable.type === "browser-global-list"
        ? result.receipt.pageId === null && result.receipt.tabIndex === null
        : result.receipt.pageId !== null && result.receipt.tabIndex !== null,
      action.id + " browser page identity drift"
    );
    if (executable.type === "browser-global-list") {
      invariant(
        result.receipt.command === "playwright-cli --raw list" &&
          result.receipt.operation === "cleanup-session-absence",
        action.id + " global-list receipt command drift"
      );
    }
  }
  exactOwnKeys(
    result.captureBindings,
    Object.keys(result.captureBindings),
    action.id + " captures",
    {
      plain: true,
    }
  );
  const allowed = [
    ...(plan.fixtureCaptureBindings[action.id] ?? []),
    ...(plan.runtimeCaptureBindings[action.id] ?? []),
  ];
  invariant(
    Object.keys(result.captureBindings).length === allowed.length &&
      Object.keys(result.captureBindings).every((name) => allowed.includes(name)),
    action.id + " returned an unauthorized capture"
  );
  exactOwnKeys(result.acquisitionDelta, RESOURCE_DELTA_KEYS, action.id + " acquisition delta", {
    plain: true,
  });
  const expectedSettledOrigin = PROVEN_RESOURCE_ACTIONS[action.id]?.origin ?? null;
  invariant(
    result.settledCreateOrigin === expectedSettledOrigin,
    action.id + " response-lost settlement drift"
  );
}

export function acquiredSubjects(plan, captures) {
  return plan.requiredFixtureSubjectKeys.map((kind) => ({
    kind,
    id: captures.get(plan.fixtureSubjectCapture[kind]),
  }));
}

export function assertCanonicalMediaRaceProjection(mediaRace, plan, captures) {
  exactOwnKeys(
    mediaRace,
    [
      "acquiredMedia",
      "missingBoundMediaId",
      "screenId",
      "entryId",
      "directImageBlockId",
      "boundField",
      "override",
    ],
    "media-race projection",
    { plain: true }
  );
  exactOwnKeys(mediaRace.acquiredMedia, ["id", "canonicalSafeUrl"], "media-race acquired media", {
    plain: true,
  });
  exactOwnKeys(
    mediaRace.override,
    ["screenId", "entryId", "blockId", "propPath", "mediaId"],
    "media-race override",
    { plain: true }
  );
  for (const [label, value] of [
    ["acquired media", mediaRace.acquiredMedia.id],
    ["missing media", mediaRace.missingBoundMediaId],
    ["screen", mediaRace.screenId],
    ["entry", mediaRace.entryId],
    ["override media", mediaRace.override.mediaId],
  ]) {
    invariant(
      typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value),
      label + " UUID drift"
    );
  }
  invariant(
    mediaRace.acquiredMedia.id === captures.get("media.id") &&
      mediaRace.missingBoundMediaId === plan.fixtureBlueprint.media.missingBoundMediaId &&
      mediaRace.screenId === captures.get("screen.id") &&
      mediaRace.entryId === captures.get("entry.id") &&
      mediaRace.directImageBlockId === plan.fixtureBlueprint.screen.blockIds.raceImage &&
      mediaRace.boundField === "raceImageId" &&
      mediaRace.override.screenId === mediaRace.screenId &&
      mediaRace.override.entryId === mediaRace.entryId &&
      mediaRace.override.blockId === mediaRace.directImageBlockId &&
      mediaRace.override.propPath === "mediaAssetId" &&
      mediaRace.override.mediaId === mediaRace.acquiredMedia.id &&
      mediaRace.acquiredMedia.id !== mediaRace.missingBoundMediaId &&
      captures.get("retry-screen.id") !== mediaRace.screenId,
    "media-race projection cross-binding drift"
  );
  invariant(
    /^\/media\/[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$/u.test(
      mediaRace.acquiredMedia.canonicalSafeUrl
    ) &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("..") &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("\\") &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("?") &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("#"),
    "media-race canonical safe URL drift"
  );
  assertRecursivelyFrozen(mediaRace);
  return mediaRace;
}

export function assertCanonicalFinalization(finalization, plan, smokePorts) {
  exactOwnKeys(
    finalization,
    [
      "apiContexts",
      "browserSession",
      "privateRoot",
      "host",
      "bootstrap",
      "contentRoutes",
      "settings",
      "storage",
      "taskTraffic",
      "screenshots",
      "phaseProofReceipts",
      "phaseTrace",
    ],
    "canonical finalization",
    { plain: true }
  );
  exactOwnKeys(
    finalization.apiContexts,
    ["names", "closed", "absenceProven"],
    "final API contexts",
    { plain: true }
  );
  exactOwnKeys(
    finalization.browserSession,
    [
      "name",
      "closeReceiptSequence",
      "absenceReceiptSequence",
      "terminalListSha256",
      "closed",
      "absent",
    ],
    "final browser session",
    { plain: true }
  );
  exactOwnKeys(
    finalization.privateRoot,
    ["outsideRepository", "mode", "identityRemoved", "absent"],
    "final private root",
    { plain: true }
  );
  exactOwnKeys(
    finalization.host,
    [
      "runnerPid",
      "pgid",
      "children",
      "listeners",
      "ports",
      "listenerOwnershipStableObservations",
      "termSent",
      "killSent",
      "processesAbsent",
      "processAbsenceStableObservations",
      "portsAbsent",
      "portAbsenceStableObservations",
    ],
    "final host",
    { plain: true }
  );
  exactOwnKeys(
    finalization.bootstrap,
    [
      "id",
      "setupCompletedBeforeStart",
      "casRestored",
      "completeRowByteIdentical",
      "roleTuplesByteIdentical",
    ],
    "final bootstrap",
    { plain: true }
  );
  exactOwnKeys(
    finalization.contentRoutes,
    [
      "key",
      "taskSlugsAbsentAtBaseline",
      "byteIdenticalBeforeEachDelete",
      "byteIdenticalAfterCleanup",
    ],
    "final content routes",
    { plain: true }
  );
  exactOwnKeys(finalization.settings, ["userAAbsent", "userBAbsent"], "final settings", {
    plain: true,
  });
  exactOwnKeys(
    finalization.storage,
    [
      "driver",
      "rootIdentityByteIdentical",
      "baselineManifestEntriesIdentical",
      "acquiredMediaRowAbsent",
      "acquiredStorageKeyAbsent",
      "missingMedia",
    ],
    "final storage",
    { plain: true }
  );
  exactOwnKeys(
    finalization.storage.missingMedia,
    ["id", "rowCount", "storageMatches", "setupReceiptSequence", "cleanupReceiptSequence"],
    "final missing media",
    { plain: true }
  );
  exactOwnKeys(
    finalization.taskTraffic,
    [
      "baselineCounts",
      "deltaCounts",
      "deletedCounts",
      "stablePollsBeforeDelete",
      "stablePollsAfterDelete",
      "returnedToBaseline",
    ],
    "final task traffic",
    { plain: true }
  );
  for (const key of ["baselineCounts", "deltaCounts", "deletedCounts"]) {
    exactOwnKeys(
      finalization.taskTraffic[key],
      ["audit", "access", "session"],
      "final task traffic " + key,
      { plain: true }
    );
    invariant(
      Object.values(finalization.taskTraffic[key]).every(
        (value) => Number.isSafeInteger(value) && value >= 0
      ),
      "final task traffic count drift"
    );
  }
  for (const [index, row] of finalization.host.children.entries()) {
    exactOwnKeys(row, ["kind", "pid"], "final host child[" + index + "]", { plain: true });
  }
  for (const [index, row] of finalization.host.listeners.entries()) {
    exactOwnKeys(row, ["kind", "pid", "port"], "final host listener[" + index + "]", {
      plain: true,
    });
  }
  for (const [index, row] of finalization.screenshots.entries()) {
    exactOwnKeys(row, ["dev", "ino", "path", "sha256", "size"], "final screenshot[" + index + "]", {
      plain: true,
    });
  }
  for (const [index, row] of finalization.phaseTrace.entries()) {
    exactOwnKeys(row, ["completed", "phase"], "final phase trace[" + index + "]", { plain: true });
  }
  for (const [index, receipt] of finalization.phaseProofReceipts.entries()) {
    exactOwnKeys(receipt, RUNTIME_RECEIPT_KEYS, "final phase proof receipt[" + index + "]", {
      plain: true,
    });
  }
  invariant(
    deepEqualJson(finalization.apiContexts.names, ["bootstrap", "user-a"]) &&
      finalization.apiContexts.closed === true &&
      finalization.apiContexts.absenceProven === true &&
      finalization.browserSession.name === SESSION_NAME &&
      finalization.browserSession.closeReceiptSequence === 419 &&
      finalization.browserSession.absenceReceiptSequence === 420 &&
      finalization.browserSession.terminalListSha256 ===
        hashBytes(Buffer.from("  (no browsers)\n")) &&
      finalization.browserSession.closed === true &&
      finalization.browserSession.absent === true &&
      deepEqualJson(finalization.privateRoot, {
        outsideRepository: true,
        mode: "0700",
        identityRemoved: true,
        absent: true,
      }) &&
      finalization.bootstrap.setupCompletedBeforeStart === true &&
      finalization.bootstrap.casRestored === true &&
      finalization.bootstrap.completeRowByteIdentical === true &&
      finalization.bootstrap.roleTuplesByteIdentical === true &&
      finalization.contentRoutes.key === "site.contentRoutes" &&
      finalization.contentRoutes.taskSlugsAbsentAtBaseline === true &&
      finalization.contentRoutes.byteIdenticalBeforeEachDelete === true &&
      finalization.contentRoutes.byteIdenticalAfterCleanup === true &&
      finalization.settings.userAAbsent === true &&
      finalization.settings.userBAbsent === true &&
      finalization.storage.driver === "local" &&
      finalization.storage.rootIdentityByteIdentical === true &&
      finalization.storage.baselineManifestEntriesIdentical === true &&
      finalization.storage.acquiredMediaRowAbsent === true &&
      finalization.storage.acquiredStorageKeyAbsent === true &&
      finalization.storage.missingMedia.id === plan.fixtureBlueprint.media.missingBoundMediaId &&
      finalization.storage.missingMedia.rowCount === 0 &&
      finalization.storage.missingMedia.storageMatches === 0 &&
      deepEqualJson(finalization.taskTraffic.deltaCounts, finalization.taskTraffic.deletedCounts) &&
      Number.isSafeInteger(finalization.taskTraffic.stablePollsBeforeDelete) &&
      finalization.taskTraffic.stablePollsBeforeDelete >= 2 &&
      finalization.taskTraffic.stablePollsBeforeDelete <= 80 &&
      finalization.taskTraffic.stablePollsAfterDelete === 2 &&
      finalization.taskTraffic.returnedToBaseline === true,
    "canonical finalization proof drift"
  );
  const expectedChildren = ["backend", "admin", "site"];
  invariant(
    Number.isSafeInteger(finalization.host.runnerPid) &&
      finalization.host.runnerPid > 1 &&
      finalization.host.pgid === finalization.host.runnerPid &&
      finalization.host.children.length === 3 &&
      finalization.host.children.every(
        (row, index) =>
          row.kind === expectedChildren[index] && Number.isSafeInteger(row.pid) && row.pid > 1
      ) &&
      finalization.host.listeners.length === 3 &&
      finalization.host.listeners.every(
        (row, index) =>
          row.kind === expectedChildren[index] &&
          row.pid === finalization.host.children[index].pid &&
          row.port === smokePorts[index]
      ) &&
      deepEqualJson(finalization.host.ports, smokePorts) &&
      deepEqualJson(finalization.host.portsAbsent, smokePorts) &&
      finalization.host.listenerOwnershipStableObservations === 2 &&
      finalization.host.processesAbsent === true &&
      finalization.host.processAbsenceStableObservations === 2 &&
      finalization.host.portAbsenceStableObservations === 2 &&
      typeof finalization.host.termSent === "boolean" &&
      typeof finalization.host.killSent === "boolean",
    "canonical host finalization drift"
  );
  invariant(
    finalization.screenshots.length === plan.requiredScreenshotPaths.length &&
      finalization.phaseTrace.length === 10 &&
      finalization.phaseTrace.every(
        ({ phase, completed }, index) => phase === index + 1 && completed === true
      ),
    "canonical finalization matrix drift"
  );
  const expectedProcessSubjects = [
    String(finalization.host.runnerPid),
    ...finalization.host.children.map(({ kind, pid }) => kind + ":" + pid),
  ];
  const hostStopReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "host-runner-stop"
  );
  const lineageReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "pid-lineage"
  );
  const processAbsenceReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "process-absence"
  );
  const portAbsenceReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "port-absence"
  );
  invariant(
    hostStopReceipts.length === 1 &&
      hostStopReceipts[0].subjectIdentifier === String(finalization.host.runnerPid) &&
      deepEqualJson(
        lineageReceipts.map(({ subjectIdentifier }) => subjectIdentifier),
        expectedProcessSubjects
      ) &&
      deepEqualJson(
        processAbsenceReceipts.map(({ subjectIdentifier }) => subjectIdentifier),
        expectedProcessSubjects
      ) &&
      deepEqualJson(
        portAbsenceReceipts.map(({ subjectIdentifier }) => subjectIdentifier),
        smokePorts.map(String)
      ),
    "canonical host proof receipt set drift"
  );
  assertRecursivelyFrozen(finalization);
  return finalization;
}

export function assertCanonicalMediaRuntimeReceipts(runtimeReceipts, mediaRace, finalization) {
  const byOperation = (operation) =>
    runtimeReceipts.filter((receipt) => receipt.operation === operation);
  const setup = byOperation("media-race-missing-absence-setup");
  const projection = byOperation("media-race-projection-provenance");
  const cleanup = byOperation("media-race-missing-absence-cleanup");
  invariant(
    setup.length === 1 && projection.length === 1 && cleanup.length === 1,
    "media-race runtime receipt cardinality drift"
  );
  const expectedMissingOutput = canonicalJson({ rowCount: 0, storageMatches: 0 });
  invariant(
    setup[0].operationDescriptor === "db+storage:missing-media-absence" &&
      cleanup[0].operationDescriptor === "db+storage:missing-media-absence" &&
      setup[0].subjectKind === "media-race-missing-media" &&
      cleanup[0].subjectKind === "media-race-missing-media" &&
      setup[0].subjectIdentifier === mediaRace.missingBoundMediaId &&
      cleanup[0].subjectIdentifier === mediaRace.missingBoundMediaId &&
      setup[0].sanitizedOutput === expectedMissingOutput &&
      cleanup[0].sanitizedOutput === expectedMissingOutput &&
      setup[0].evidenceSha256 !== cleanup[0].evidenceSha256 &&
      projection[0].operationDescriptor === "admin-api:media-race-projection" &&
      projection[0].subjectKind === "screen" &&
      projection[0].subjectIdentifier === mediaRace.screenId &&
      projection[0].sanitizedOutput ===
        canonicalJson({
          bindingCount: 1,
          overrideCount: 1,
          entryValueMatches: true,
          safeUrlMatches: true,
        }) &&
      projection[0].evidenceSha256 !== hashBytes(Buffer.from(projection[0].sanitizedOutput)) &&
      finalization.storage.missingMedia.setupReceiptSequence === setup[0].sequence &&
      finalization.storage.missingMedia.cleanupReceiptSequence === cleanup[0].sequence &&
      setup[0].sequence < projection[0].sequence &&
      projection[0].sequence < cleanup[0].sequence,
    "media-race runtime receipt binding drift"
  );
}

export function assertCanonicalPrimaryRuntimeInventory(runtimeReceipts, finalization, finalPlan) {
  const byOperation = (operation) =>
    runtimeReceipts.filter((receipt) => receipt.operation === operation);
  for (const operation of [
    "fixture-setup",
    "host-runner-launch",
    "admin-health",
    "front-health",
    "host-runner-stop",
  ]) {
    invariant(
      byOperation(operation).length === 1,
      operation + " primary runtime receipt cardinality drift"
    );
  }
  for (const kind of ["audit", "access", "session"]) {
    const receipts = byOperation("terminal-" + kind + "-stable-poll");
    const before = receipts.filter(({ subjectIdentifier }) =>
      subjectIdentifier.startsWith("before-delete:")
    );
    const after = receipts.filter(({ subjectIdentifier }) =>
      subjectIdentifier.startsWith("after-delete:")
    );
    invariant(
      before.length === finalization.taskTraffic.stablePollsBeforeDelete &&
        after.length === 2 &&
        before.every(
          (receipt, index) => receipt.subjectIdentifier === "before-delete:" + (index + 1)
        ) &&
        after.every(
          (receipt, index) => receipt.subjectIdentifier === "after-delete:" + (index + 1)
        ),
      kind + " terminal poll runtime receipt drift"
    );
  }
  invariant(
    byOperation("cleanup-provenance").length === finalPlan.resourceKeys.length &&
      byOperation("cleanup-absence").length === finalPlan.resourceKeys.length &&
      runtimeReceipts.every(
        ({ sanitizedOutput, evidenceSha256 }) =>
          typeof sanitizedOutput === "string" &&
          sanitizedOutput.length <= 4096 &&
          evidenceSha256 !== hashBytes(Buffer.from(sanitizedOutput))
      ),
    "primary cleanup runtime receipt inventory/hash drift"
  );
}

export function assertCleanupReceiptBijection(finalPlan, cleanupReceipts) {
  invariant(
    cleanupReceipts.length === finalPlan.actionTuples.length,
    "cleanup receipt/final tuple cardinality drift"
  );
  const actual = cleanupReceipts.map((receipt) => {
    exactOwnKeys(receipt, RUNTIME_RECEIPT_KEYS, "cleanup receipt", { plain: true });
    invariant(
      receipt.runnerVersion === ORCHESTRATOR_EVIDENCE_RUNNER_VERSION &&
        receipt.status === 0 &&
        Number.isSafeInteger(receipt.sequence) &&
        receipt.sequence > 0 &&
        receipt.operation.startsWith("cleanup-") &&
        typeof receipt.subjectIdentifier === "string",
      "cleanup receipt contract drift"
    );
    const operationKind = receipt.operation.slice("cleanup-".length);
    invariant(CLEANUP_OPERATION_KINDS.includes(operationKind), "cleanup receipt operation drift");
    const operationField =
      operationKind === "provenance"
        ? "provenanceOpId"
        : operationKind === "delete"
          ? "cleanupOpId"
          : "absenceOpId";
    const matches = finalPlan.ledger.filter(
      (record) => record[operationField] === receipt.operationDescriptor
    );
    invariant(matches.length === 1, "cleanup receipt operation descriptor is not bijective");
    const [record] = matches;
    const expectedSubject =
      record.identifier.length === 1
        ? record.identifier[0]
        : lengthPrefixedTuple(record.identifier);
    invariant(
      receipt.subjectKind === record.kind && receipt.subjectIdentifier === expectedSubject,
      "cleanup receipt exact subject drift"
    );
    return [record.resourceKey, operationKind];
  });
  const encode = (tuple) => lengthPrefixedTuple(tuple);
  const expectedSet = new Set(finalPlan.actionTuples.map(encode));
  const actualKeys = actual.map(encode);
  invariant(
    new Set(actualKeys).size === actualKeys.length &&
      actualKeys.length === expectedSet.size &&
      actualKeys.every((key) => expectedSet.has(key)) &&
      deepEqualJson(actual, finalPlan.actionTuples),
    "cleanup receipt/final tuple bijection drift"
  );
}

export function buildCanonicalRouteEvidence(plan, actionReceiptPairs, captures) {
  const rows = [];
  for (const [routeKey, descriptor] of Object.entries(plan.registries.routes)) {
    const expected = expandedRoute(plan, routeKey, captures, {
      csrfHeaderName: "x-redacted-csrf-name",
    });
    const routePairs = actionReceiptPairs.filter(({ receipt }) => receipt.routeKey === routeKey);
    const pairs = routePairs.filter(({ receipt }) =>
      descriptor.operations.includes(receipt.operation)
    );
    invariant(
      pairs.length === descriptor.operations.length,
      routeKey + " route operation receipt set is not exact"
    );
    const requiredOperations = pairs;
    invariant(
      requiredOperations.length === descriptor.operations.length &&
        descriptor.operations.every(
          (operation) =>
            requiredOperations.filter(({ receipt }) => receipt.operation === operation).length === 1
        ),
      routeKey + " route operation set drift"
    );
    for (const { receipt } of routePairs) {
      invariant(
        receipt.method === expected.method && receipt.pattern === expected.pattern,
        routeKey + " route receipt metadata drift"
      );
    }
    const retryActionId =
      routeKey === "entry-save-failure"
        ? "dg-035-real-retry"
        : routeKey === "related-first-failure"
          ? "rc-011-visible-retry"
          : null;
    const retryPair =
      retryActionId === null
        ? null
        : actionReceiptPairs.find(({ action }) => action.id === retryActionId);
    invariant(
      retryActionId === null || retryPair !== undefined,
      routeKey + " real retry receipt is absent"
    );
    const operations = pairs.map(({ action, receipt }) =>
      deepFreezeExact({
        actionId: action.id,
        sequence: receipt.sequence,
        operation: receipt.operation,
        sanitizedOutput: receipt.sanitizedOutput,
      })
    );
    if (retryPair !== null) {
      operations.push(
        deepFreezeExact({
          actionId: retryPair.action.id,
          sequence: retryPair.receipt.sequence,
          operation: "real-retry",
          sanitizedOutput: retryPair.receipt.sanitizedOutput,
        })
      );
    }
    rows.push(
      deepFreezeExact({
        key: routeKey,
        mode: descriptor.mode,
        method: expected.method,
        pattern: expected.pattern,
        hitCount: 1,
        operations: deepFreezeExact(operations),
      })
    );
  }
  invariant(rows.length === 6, "route evidence cardinality drift");
  return deepFreezeExact(rows);
}

export function buildCanonicalScenarioEvidence(plan, actionReceiptPairs, finalization) {
  const screenshotByPath = new Map(finalization.screenshots.map((row) => [row.path, row]));
  const assertionsSeen = [];
  const themesByScenario = {
    "button-image": ["light"],
    "tabs-content": ["dark"],
    "tabs-keyboard-aria": ["light"],
    "space-selection": ["dark"],
    "dirty-guards": ["light", "dark"],
    "related-retry-cache": ["dark"],
    "responsive-users": ["light", "dark"],
  };
  const viewportReceiptBindings = {
    "button-image": [{ actionId: "bi-002-resize", width: 1280, height: 900 }],
    "tabs-content": [{ actionId: "tc-006-resize", width: 1280, height: 900 }],
    "tabs-keyboard-aria": [{ actionId: "tk-003-resize", width: 1024, height: 900 }],
    "space-selection": [{ actionId: "ss-010-resize", width: 1024, height: 900 }],
    "dirty-guards": [{ actionId: "dg-006-resize", width: 1280, height: 900 }],
    "related-retry-cache": [{ actionId: "dg-006-resize", width: 1280, height: 900 }],
    "responsive-users": [
      { actionId: "ru-008-resize-320", width: 320, height: 844 },
      { actionId: "ru-013-resize-390", width: 390, height: 844 },
      { actionId: "ru-018-resize-480", width: 480, height: 844 },
      { actionId: "ru-023-resize-1024", width: 1024, height: 900 },
      { actionId: "ru-028-resize-1280", width: 1280, height: 900 },
    ],
  };
  const scenarios = plan.requiredScenarios.map((scenarioId) => {
    const pairs = actionReceiptPairs.filter(({ action }) => action.scenario === scenarioId);
    const expectedAssertions = plan.requiredAssertions[scenarioId];
    invariant(Array.isArray(expectedAssertions), scenarioId + " assertion registry is absent");
    const visibleAssertions = expectedAssertions.map((assertionName) => {
      const matches = pairs.filter(({ receipt }) => receipt.assertionName === assertionName);
      invariant(
        matches.length === 1,
        scenarioId + ":" + assertionName + " receipt cardinality drift"
      );
      const [{ action, receipt }] = matches;
      assertionsSeen.push(assertionName);
      return deepFreezeExact({
        name: assertionName,
        actionId: action.id,
        sequence: receipt.sequence,
        sanitizedOutput: receipt.sanitizedOutput,
      });
    });
    const screenshots = pairs
      .filter(({ action }) => action.executable.type === "browser-screenshot")
      .map(({ action, receipt }) => {
        const relative = plan.registries.screenshotPaths[action.executable.screenshotId];
        const identity = screenshotByPath.get(relative);
        invariant(identity !== undefined, scenarioId + " screenshot identity is absent");
        return deepFreezeExact({ actionId: action.id, sequence: receipt.sequence, ...identity });
      });
    const logs = pairs
      .filter(({ action }) => action.kind === "logs")
      .map(({ action, receipt }) => {
        const ast = parseBuilder(action.builder);
        invariant(ast.callee === "logs" && ast.args.length === 2, action.id + " log builder drift");
        return deepFreezeExact({
          actionId: action.id,
          sequence: receipt.sequence,
          scope: ast.args[0],
          channel: ast.args[1],
          sanitizedOutput: receipt.sanitizedOutput,
        });
      });
    invariant(logs.length === 6, scenarioId + " log evidence cardinality drift");
    const linkedReceipts = pairs.map(({ action, receipt, lane }) =>
      deepFreezeExact({
        actionId: action.id,
        lane,
        sequence: receipt.sequence,
      })
    );
    const viewports = viewportReceiptBindings[scenarioId].map(({ actionId, width, height }) => {
      const matches = actionReceiptPairs.filter(({ action }) => action.id === actionId);
      invariant(matches.length === 1, scenarioId + " exact viewport receipt cardinality drift");
      const [pair] = matches;
      const ast = parseBuilder(pair.action.builder);
      invariant(
        pair.action.kind === "resize" &&
          ast.callee === "resize" &&
          deepEqualJson(ast.args.map(resolveLiteral), [width, height]) &&
          pair.receipt.operation === "resize" &&
          pair.action.executable.sourceId === "run-code/" + actionId &&
          (pair.action.scenario === scenarioId ||
            (scenarioId === "related-retry-cache" && pair.action.scenario === "dirty-guards")),
        scenarioId + " exact viewport receipt binding drift"
      );
      return deepFreezeExact({ actionId, width, height, sequence: pair.receipt.sequence });
    });
    const routeHits = pairs
      .filter(({ receipt }) => receipt.routeKey !== null && receipt.operation === "route-hit-read")
      .map(({ receipt }) =>
        deepFreezeExact({ key: receipt.routeKey, count: 1, sequence: receipt.sequence })
      );
    return deepFreezeExact({
      id: scenarioId,
      themes: deepFreezeExact(themesByScenario[scenarioId]),
      viewports: deepFreezeExact(viewports),
      linkedReceipts: deepFreezeExact(linkedReceipts),
      routeHits: deepFreezeExact(routeHits),
      visibleAssertions: deepFreezeExact(visibleAssertions),
      logs: deepFreezeExact(logs),
      screenshots: deepFreezeExact(screenshots),
    });
  });
  invariant(
    scenarios.length === 7 && assertionsSeen.length === 55 && new Set(assertionsSeen).size === 55,
    "scenario/assertion evidence cardinality drift"
  );
  return deepFreezeExact(scenarios);
}
