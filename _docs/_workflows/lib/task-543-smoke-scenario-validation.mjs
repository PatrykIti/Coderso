// TASK-543 smoke-scenario-validation (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  smokeRunOperation,
} from "./task-543-smoke-operation-code.mjs";
import {
  ADMIN_ORIGIN,
  POSTS_LIST_URL,
  RESPONSIVE_HEIGHT,
  RESPONSIVE_WIDTHS,
  SMOKE_CONSOLE_ERROR_READ,
  SMOKE_CONSOLE_WARNING_READ,
  SMOKE_LOG_RESET,
  SMOKE_PAGE_ERROR_READ,
  SMOKE_SESSION_PREFIX,
  TRANSIENT_SCREENSHOT_KINDS,
} from "./task-543-smoke-schema.mjs";
import {
  expectedAutosavePayload,
  expectedFixtureCreatePayload,
  expectedManualPayload,
  expectedMetadataPayload,
  expectedResponsiveProbeCommand,
  expectedRouteInstallCommand,
  expectedRouteRemovalCommand,
  expectedScenarioActionCommands,
  expectedScenarioSetupCommand,
  expectedScreenshotCaptureCommand,
  expectedScreenshotHashCommand,
  expectedScreenshotSignatureCommand,
  expectedScreenshotStatCommand,
  expectedScreenshotStdout,
  expectedSetupStateReadCommand,
  expectedSetupStateRestoreCommand,
  expectedThemeApplyCommand,
  expectedThemeStateReadCommand,
  expectedThemeStateRestoreCommand,
  parsedSessionNames,
  rawPlaywrightReceiptValid,
  repoRelativePath,
  scenarioTargetUrl,
  sessionListOutputValid,
} from "./task-543-smoke-command-builders.mjs";
import {
  receiptIntegrityValid,
  sameRawValue,
  sameSequence,
} from "./task-543-gate-contracts.mjs";

export function expectedTransientAssertionCommands(scenario) {
  switch (scenario.kind) {
    case "dirty-delayed-close":
      return [smokeRunOperation("assert-transient-dirty-delayed-close", { kind: scenario.kind })];
    case "pending-revert-restoration":
      return [
        smokeRunOperation("assert-transient-pending-revert-restoration", {
          kind: scenario.kind,
        }),
      ];
    case "failure-retry":
      return [smokeRunOperation("assert-transient-failure-retry", { kind: scenario.kind })];
    case "double-close":
      return [smokeRunOperation("assert-transient-double-close", { kind: scenario.kind })];
    case "clean-close":
    case "table-keyboard":
    case "mid-viewport-metadata":
      return [];
    default:
      throw new Error("unknown TASK-543 smoke kind");
  }
}

export function transientEvidenceValid(scenario, fixture) {
  const results = scenario.commandResults.transientAssertion;
  if (!TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) return results.length === 0;
  if (results.length !== 1) return false;
  const output = results[0].parsedOutput;
  if (
    output?.kind !== scenario.kind ||
    output.navigationCount !== 0 ||
    output.draftText !==
      (scenario.kind === "pending-revert-restoration" ? fixture.draftTitleB : fixture.draftTitleA)
  ) {
    return false;
  }
  if (scenario.kind === "failure-retry") {
    return (
      output.phase === "failure" &&
      output.alertVisible === true &&
      typeof output.alertText === "string" &&
      output.alertText.trim().length > 0 &&
      output.retryFocused === true &&
      output.mutationCount === 1
    );
  }
  return (
    output.phase === "pending" &&
    output.pendingRoutes === 1 &&
    output.closeBusy === true &&
    output.closeDisabled === true &&
    output.nonCloseEditable === true &&
    (scenario.kind !== "double-close" ||
      (output.domClickEvents === 2 && output.closePendingData === true))
  );
}

export function expectedEvidenceAssertionCommand(scenario) {
  switch (scenario.kind) {
    case "clean-close":
      return smokeRunOperation("assert-clean-close", { kind: scenario.kind });
    case "dirty-delayed-close":
      return smokeRunOperation("assert-dirty-delayed-close", { kind: scenario.kind });
    case "pending-revert-restoration":
      return smokeRunOperation("assert-pending-revert-restoration", { kind: scenario.kind });
    case "failure-retry":
      return smokeRunOperation("assert-failure-retry", { kind: scenario.kind });
    case "double-close":
      return smokeRunOperation("assert-double-close", { kind: scenario.kind });
    case "table-keyboard":
      return smokeRunOperation("assert-table-keyboard", { kind: scenario.kind });
    case "mid-viewport-metadata":
      return smokeRunOperation("assert-mid-viewport-metadata", { kind: scenario.kind });
    default:
      throw new Error("unknown TASK-543 smoke kind");
  }
}

export function expectedScenarioResetCommand(scenario, fixture) {
  return smokeRunOperation("reset-scenario", {
    scenarioId: scenario.id,
    fixtureId: fixture.id,
    title: fixture.title,
    editorUrl: fixture.editorUrl,
  });
}

export function resetEvidenceValid(output, scenario, fixture) {
  if (
    output?.reset !== true ||
    output?.scenarioId !== scenario.id ||
    output?.fixtureId !== fixture.id ||
    output?.titleRestored !== true ||
    output?.rowAccessibleName !== `Edit post: ${fixture.title}` ||
    output?.url !== POSTS_LIST_URL
  ) {
    return false;
  }
  const requiresRestorationWrite = [
    "dirty-delayed-close",
    "failure-retry",
    "double-close",
  ].includes(scenario.kind);
  if (!requiresRestorationWrite) return output.restorationWrite === null;
  const write = output.restorationWrite;
  if (!Number.isInteger(write?.status) || write.status < 200 || write.status >= 300) {
    return false;
  }
  return (
    urlPathMatches(write.url, `/admin/api/posts/${encodeURIComponent(fixture.id)}`) ||
    urlPathMatches(write.url, `/admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`)
  );
}

export function isFullSmokeCliCommand(command) {
  return (
    typeof command === "string" &&
    command.startsWith(SMOKE_SESSION_PREFIX) &&
    !command.includes("\n")
  );
}

export function isUserActionCommand(command) {
  if (!isFullSmokeCliCommand(command)) return false;
  const action = command.slice(SMOKE_SESSION_PREFIX.length);
  return (
    /^(?:click|dblclick|fill|type|press|keydown|keyup|check|uncheck|goto|reload)\b/.test(action) ||
    (action.startsWith("run-code ") &&
      [".click(", ".fill(", ".press(", ".check(", ".uncheck(", ".goto(", ".reload("].some((token) =>
        action.includes(token)
      ))
  );
}

export function commandResultsMatch(commands, results) {
  return (
    commands.length === results.length &&
    results.every(
      (receipt, index) =>
        receipt.command === commands[index] &&
        receipt.status === 0 &&
        rawPlaywrightReceiptValid(receipt)
    )
  );
}

export function logReadSetValid(set) {
  if (!set) return false;
  return [
    [set.consoleErrors, SMOKE_CONSOLE_ERROR_READ],
    [set.consoleWarnings, SMOKE_CONSOLE_WARNING_READ],
    [set.pageErrors, SMOKE_PAGE_ERROR_READ],
  ].every(
    ([receipt, command]) =>
      receipt?.command === command &&
      receipt.status === 0 &&
      rawPlaywrightReceiptValid(receipt) &&
      Array.isArray(receipt.parsedOutput)
  );
}

export function pushLogReadSet(push, scope, set) {
  push(`${scope}:console-errors`, set.consoleErrors);
  push(`${scope}:console-warnings`, set.consoleWarnings);
  push(`${scope}:page-errors`, set.pageErrors);
}

export function aggregateLogReadSets(sets, key) {
  return sets.flatMap((set) => set[key].parsedOutput);
}

export function lifecycleLogCommandValid(record) {
  const expectedCommand = record.scope.endsWith(":console-errors")
    ? SMOKE_CONSOLE_ERROR_READ
    : record.scope.endsWith(":console-warnings")
      ? SMOKE_CONSOLE_WARNING_READ
      : record.scope.endsWith(":page-errors")
        ? SMOKE_PAGE_ERROR_READ
        : null;
  return expectedCommand !== null && record.command === expectedCommand;
}

export function lifecycleLogReceiptValid(record) {
  return (
    lifecycleLogCommandValid(record) &&
    record.status === 0 &&
    rawPlaywrightReceiptValid(record) &&
    Array.isArray(record.parsedOutput)
  );
}


export function sessionListReceiptValid(receipt) {
  return (
    receiptIntegrityValid(receipt) &&
    receipt.status === 0 &&
    sessionListOutputValid(receipt.stdout) &&
    sameRawValue(receipt.parsedOutput, {
      sessions: parsedSessionNames(receipt.stdout),
    })
  );
}

export function browserOpenReceiptValid(receipt) {
  if (!receiptIntegrityValid(receipt) || receipt.status !== 0) return false;
  const match =
    /^### Browser `wf543smoke` opened with pid (\d+)\.\n### Ran Playwright code\n```js\nawait page\.goto\('http:\/\/coderso-a\.localhost:5173\/admin\/'\);\n```\n### Page\n- Page URL: (http:\/\/coderso-a\.localhost:5173\/admin\/[^\n]*)\n(?:- Page Title: ([^\r\n]+)\n)?### Snapshot\n- \[Snapshot\]\((\.playwright-cli\/page-[A-Za-z0-9:._-]+\.yml)\)\n$/u.exec(
      receipt.stdout
    );
  return (
    match !== null &&
    sameRawValue(receipt.parsedOutput, {
      session: "wf543smoke",
      pid: Number(match[1]),
      pageUrl: match[2],
      pageTitle: match[3] ?? null,
      snapshotPath: match[4],
    })
  );
}

export function browserCloseReceiptValid(receipt) {
  return (
    receiptIntegrityValid(receipt) &&
    receipt.status === 0 &&
    receipt.stdout === "Browser 'wf543smoke' closed\n\n" &&
    sameRawValue(receipt.parsedOutput, { session: "wf543smoke", closed: true })
  );
}

export function emptyRouteListOutput(output) {
  return output === "No active routes\n";
}


export function computedNodeValid(node, expectedVisible) {
  const derivedVisible =
    node.exists === true &&
    node.display !== "none" &&
    node.visibility !== "hidden" &&
    node.visibility !== "collapse" &&
    node.opacity > 0 &&
    node.width > 0 &&
    node.height > 0;
  return (
    node.exists === true &&
    node.visible === derivedVisible &&
    node.visible === expectedVisible &&
    (expectedVisible ? node.text.length > 0 : true)
  );
}

export function responsiveEvidenceValid(responsive, evidence, fixture) {
  if (
    !responsive ||
    evidence.kind !== "mid-viewport-metadata" ||
    !sameSequence(
      responsive.widths.map(({ width }) => width),
      RESPONSIVE_WIDTHS
    ) ||
    !sameSequence(evidence.orderedWidths, RESPONSIVE_WIDTHS) ||
    evidence.visibleSemanticCopies.length !== RESPONSIVE_WIDTHS.length
  ) {
    return false;
  }
  return responsive.widths.every((record, index) => {
    const { width, resizeReceipt, probeReceipt } = record;
    const rawProbeOutput = probeReceipt.parsedOutput;
    const semantic = evidence.visibleSemanticCopies[index];
    const fallbackMetadataVisible = width < 1024;
    const fallbackStatusVisible = width < 768;
    const columnStatusVisible = width >= 768;
    const columnAuthorDateVisible = width >= 1024;
    return (
      resizeReceipt.command ===
        `playwright-cli -s=wf543smoke --raw resize ${width} ${RESPONSIVE_HEIGHT}` &&
      resizeReceipt.status === 0 &&
      rawPlaywrightReceiptValid(resizeReceipt) &&
      resizeReceipt.stdout === "\n" &&
      resizeReceipt.parsedOutput === null &&
      probeReceipt.command === expectedResponsiveProbeCommand(fixture) &&
      probeReceipt.status === 0 &&
      rawPlaywrightReceiptValid(probeReceipt) &&
      rawProbeOutput.width === width &&
      rawProbeOutput.matchedRowCount === 1 &&
      rawProbeOutput.rowPostId === fixture.id &&
      rawProbeOutput.fallbackMetadataVisible === fallbackMetadataVisible &&
      rawProbeOutput.fallbackStatusVisible === fallbackStatusVisible &&
      rawProbeOutput.fallbackAuthorVisible === fallbackMetadataVisible &&
      rawProbeOutput.fallbackDateVisible === fallbackMetadataVisible &&
      rawProbeOutput.columnStatusVisible === columnStatusVisible &&
      rawProbeOutput.columnAuthorVisible === columnAuthorDateVisible &&
      rawProbeOutput.columnDateVisible === columnAuthorDateVisible &&
      rawProbeOutput.visibleStatusCopies === 1 &&
      rawProbeOutput.visibleAuthorCopies === 1 &&
      rawProbeOutput.visibleDateCopies === 1 &&
      rawProbeOutput.titleAccessibleName === `Edit post: ${fixture.title}` &&
      rawProbeOutput.checkboxAccessibleName === `Select ${fixture.title}` &&
      rawProbeOutput.actionAccessibleName === `Actions for ${fixture.title}` &&
      computedNodeValid(rawProbeOutput.nodes.fallbackMetadata, fallbackMetadataVisible) &&
      computedNodeValid(rawProbeOutput.nodes.fallbackStatus, fallbackStatusVisible) &&
      computedNodeValid(rawProbeOutput.nodes.fallbackAuthor, fallbackMetadataVisible) &&
      computedNodeValid(rawProbeOutput.nodes.fallbackDate, fallbackMetadataVisible) &&
      computedNodeValid(rawProbeOutput.nodes.columnStatus, columnStatusVisible) &&
      computedNodeValid(rawProbeOutput.nodes.columnAuthor, columnAuthorDateVisible) &&
      computedNodeValid(rawProbeOutput.nodes.columnDate, columnAuthorDateVisible) &&
      computedNodeValid(rawProbeOutput.nodes.row, true) &&
      computedNodeValid(rawProbeOutput.nodes.table, true) &&
      rawProbeOutput.rowWidth > 0 &&
      rawProbeOutput.tableWidth > 0 &&
      semantic.width === width &&
      semantic.status === rawProbeOutput.visibleStatusCopies &&
      semantic.author === rawProbeOutput.visibleAuthorCopies &&
      semantic.date === rawProbeOutput.visibleDateCopies
    );
  });
}

export function expectedMutationSequence(kind, fixture) {
  const basePath = `/admin/api/posts/${encodeURIComponent(fixture.id)}`;
  const autosavePath = `${basePath}/autosave`;
  switch (kind) {
    case "clean-close":
    case "table-keyboard":
    case "mid-viewport-metadata":
      return [];
    case "dirty-delayed-close":
    case "double-close":
      return [
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleA),
        },
      ];
    case "pending-revert-restoration":
      return [
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleA),
        },
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleB),
        },
      ];
    case "failure-retry":
      return [
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleA),
        },
        {
          method: "PATCH",
          path: basePath,
          payload: expectedManualPayload(fixture, fixture.draftTitleA),
        },
        {
          method: "PATCH",
          path: `${basePath}/metadata`,
          payload: expectedMetadataPayload(fixture),
        },
      ];
    default:
      return [];
  }
}

export function expectedNavigationSequence(kind, fixture) {
  if (kind === "table-keyboard") return [fixture.editorUrl, POSTS_LIST_URL];
  if (kind === "mid-viewport-metadata") return [];
  return [POSTS_LIST_URL];
}

export function validateScenarioByKind(scenario, fixture) {
  const evidence = scenario.evidence;
  if (
    !fixture ||
    evidence.kind !== scenario.kind ||
    !sameRawValue(evidence.mutations, expectedMutationSequence(scenario.kind, fixture)) ||
    !sameSequence(evidence.navigationUrls, expectedNavigationSequence(scenario.kind, fixture))
  ) {
    return false;
  }
  switch (scenario.kind) {
    case "clean-close":
      return (
        evidence.cleanBeforeClose === true &&
        evidence.saveRequestCount === 0 &&
        evidence.navigationCount === 1 &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "dirty-delayed-close":
      return (
        evidence.saveRequestCount === 1 &&
        sameSequence(evidence.requestOrder, [
          `POST /admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`,
        ]) &&
        sameRawValue(
          evidence.requestPayload,
          expectedAutosavePayload(fixture, fixture.draftTitleA)
        ) &&
        evidence.closeBusy === true &&
        evidence.closeDisabled === true &&
        evidence.nonCloseEditable === true &&
        evidence.navigationBeforeRelease === 0 &&
        evidence.navigationAfterRelease === 1 &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "pending-revert-restoration":
      return (
        fixture.draftTitleB === fixture.title &&
        evidence.saveRequestCount === 2 &&
        sameSequence(evidence.requestOrder, [
          `A POST /admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`,
          `B POST /admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`,
        ]) &&
        sameRawValue(evidence.payloadA, expectedAutosavePayload(fixture, fixture.draftTitleA)) &&
        sameRawValue(evidence.payloadB, expectedAutosavePayload(fixture, fixture.draftTitleB)) &&
        !sameRawValue(evidence.payloadA, evidence.payloadB) &&
        evidence.navigationBeforeB === 0 &&
        evidence.navigationAfterB === 1 &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "failure-retry":
      return (
        evidence.autosavePostCount === 1 &&
        evidence.manualPatchCount === 1 &&
        evidence.metadataPatchCount === 1 &&
        evidence.mutationCountAfterRetry === 3 &&
        evidence.alertVisible === true &&
        evidence.alertText.trim().length > 0 &&
        evidence.draftText === fixture.draftTitleA &&
        evidence.retryFocused === true &&
        evidence.navigationAfterFailure === 0 &&
        evidence.navigationAfterRetry === 0 &&
        evidence.navigationAfterClose === 1 &&
        evidence.retrySucceeded === true &&
        evidence.metadataRetrySucceeded === true &&
        evidence.alertClearedAfterRetry === true &&
        evidence.editorUrlAfterRetry === fixture.editorUrl &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "double-close":
      return (
        evidence.domClickEvents === 2 &&
        evidence.saveRequestCount === 1 &&
        evidence.navigationCount === 1 &&
        evidence.closeBusy === true &&
        evidence.closeDisabled === true &&
        evidence.closePendingData === true &&
        evidence.nonCloseEditable === true &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "table-keyboard":
      return (
        evidence.titleKey === "Enter" &&
        evidence.titleNavigationCount === 1 &&
        evidence.titleUrl === fixture.editorUrl &&
        evidence.titleAccessibleName === `Edit post: ${fixture.title}` &&
        evidence.checkboxKey === "Space" &&
        evidence.checkboxToggled === true &&
        evidence.checkboxNavigationCount === 0 &&
        evidence.checkboxAccessibleName === `Select ${fixture.title}` &&
        evidence.actionKey === "Enter" &&
        evidence.actionMenuOpened === true &&
        evidence.actionNavigationCount === 0 &&
        evidence.actionAccessibleName === `Actions for ${fixture.title}`
      );
    case "mid-viewport-metadata":
      return responsiveEvidenceValid(scenario.responsive, evidence, fixture);
    default:
      return false;
  }
}

export function expectedScenarioRouteMode(kind) {
  if (["dirty-delayed-close", "pending-revert-restoration", "double-close"].includes(kind)) {
    return "delay";
  }
  return kind === "failure-retry" ? "failure" : null;
}

export function expectedScenarioRoutePattern(fixture) {
  return `**/admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`;
}

export function scenarioCommandEvidenceValid(scenario, fixture) {
  if (!fixture) return false;
  const { commands, commandResults, routes } = scenario;
  const installedPatterns = routes.installed.map(({ pattern }) => pattern);
  const removedPatterns = routes.removed.map(({ pattern }) => pattern);
  const expectedRouteMode = expectedScenarioRouteMode(scenario.kind);
  const expectedRoutePattern = expectedScenarioRoutePattern(fixture);
  const expectedActions = expectedScenarioActionCommands(scenario, fixture);
  const expectedTransientAssertions = expectedTransientAssertionCommands(scenario);
  const expectedAssertion = expectedEvidenceAssertionCommand(scenario);
  const expectedSetup = expectedScenarioSetupCommand(scenario, fixture);
  const expectedReset = expectedScenarioResetCommand(scenario, fixture);
  const assertionContainsTypedEvidence = commandResults.assertion.some(({ parsedOutput }) =>
    sameRawValue(parsedOutput, scenario.evidence)
  );
  return (
    fixture &&
    fixture.id === scenario.fixtureId &&
    scenario.pass === true &&
    scenario.errors.length === 0 &&
    commands.logReset === SMOKE_LOG_RESET &&
    commandResults.logReset.command === commands.logReset &&
    commandResults.logReset.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReset) &&
    commands.theme === expectedThemeApplyCommand(scenario.theme) &&
    commandResults.theme.command === commands.theme &&
    commandResults.theme.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.theme) &&
    commandResults.theme.parsedOutput.preference === scenario.theme &&
    commandResults.theme.parsedOutput.resolved === scenario.theme &&
    commandResults.theme.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    sameSequence(commands.setup, [expectedSetup]) &&
    commandResultsMatch(commands.setup, commandResults.setup) &&
    commandResults.setup[0]?.parsedOutput?.ready === true &&
    commandResults.setup[0]?.parsedOutput?.scenarioId === scenario.id &&
    commandResults.setup[0]?.parsedOutput?.fixtureId === fixture.id &&
    commandResults.setup[0]?.parsedOutput?.setupValue === scenario.id &&
    commandResults.setup[0]?.parsedOutput?.url === scenarioTargetUrl(scenario, fixture) &&
    sameSequence(commands.action, expectedActions) &&
    commandResultsMatch(commands.action, commandResults.action) &&
    sameSequence(commands.transientAssertion, expectedTransientAssertions) &&
    commandResultsMatch(commands.transientAssertion, commandResults.transientAssertion) &&
    transientEvidenceValid(scenario, fixture) &&
    sameSequence(commands.assertion, [expectedAssertion]) &&
    commandResultsMatch(commands.assertion, commandResults.assertion) &&
    assertionContainsTypedEvidence &&
    commandResults.logReads.consoleErrors.command === commands.consoleErrorRead &&
    commandResults.logReads.consoleErrors.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReads.consoleErrors) &&
    Array.isArray(commandResults.logReads.consoleErrors.parsedOutput) &&
    commandResults.logReads.consoleErrors.parsedOutput.length === 0 &&
    commandResults.logReads.consoleWarnings.command === commands.consoleWarningRead &&
    commandResults.logReads.consoleWarnings.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReads.consoleWarnings) &&
    Array.isArray(commandResults.logReads.consoleWarnings.parsedOutput) &&
    commandResults.logReads.consoleWarnings.parsedOutput.length === 0 &&
    commandResults.logReads.pageErrors.command === commands.pageErrorRead &&
    commandResults.logReads.pageErrors.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReads.pageErrors) &&
    Array.isArray(commandResults.logReads.pageErrors.parsedOutput) &&
    commandResults.logReads.pageErrors.parsedOutput.length === 0 &&
    (expectedRouteMode === null
      ? commandResults.boundaryLogReads.afterUnroute === null
      : logReadSetValid(commandResults.boundaryLogReads.afterUnroute)) &&
    logReadSetValid(commandResults.boundaryLogReads.afterReset) &&
    sameSequence(commands.reset, [expectedReset]) &&
    commandResultsMatch(commands.reset, commandResults.reset) &&
    resetEvidenceValid(commandResults.reset[0]?.parsedOutput, scenario, fixture) &&
    sameSequence(installedPatterns, removedPatterns) &&
    routes.installed.every(
      (receipt) =>
        rawPlaywrightReceiptValid(receipt) &&
        (({ pattern, command, status, parsedOutput }) =>
          status === 0 &&
          pattern === expectedRoutePattern &&
          command === expectedRouteInstallCommand(pattern, expectedRouteMode) &&
          parsedOutput.pattern === pattern &&
          parsedOutput.installed === true &&
          parsedOutput.mode === expectedRouteMode)(receipt)
    ) &&
    routes.removed.every(
      (receipt) =>
        rawPlaywrightReceiptValid(receipt) &&
        (({ pattern, command, status, parsedOutput }) =>
          status === 0 &&
          pattern === expectedRoutePattern &&
          command === expectedRouteRemovalCommand(pattern) &&
          parsedOutput.pattern === pattern &&
          parsedOutput.removed === true &&
          parsedOutput.releasedPending === 0)(receipt)
    ) &&
    (expectedRouteMode === null
      ? routes.installed.length === 0 && routes.removed.length === 0
      : routes.installed.length === 1 && routes.removed.length === 1) &&
    (scenario.kind === "mid-viewport-metadata"
      ? scenario.responsive !== null
      : scenario.responsive === null) &&
    validateScenarioByKind(scenario, fixture)
  );
}


export function stateRestored(record, kind) {
  const beforeCommand =
    kind === "theme" ? expectedThemeStateReadCommand() : expectedSetupStateReadCommand();
  const afterCommand = beforeCommand;
  const restoreCommand =
    kind === "theme"
      ? expectedThemeStateRestoreCommand(record.before.parsedOutput)
      : expectedSetupStateRestoreCommand(record.before.parsedOutput.value);
  const valuesRestored =
    kind === "theme"
      ? record.before.parsedOutput.storedPreference ===
          record.restore.parsedOutput.storedPreference &&
        record.before.parsedOutput.storedPreference ===
          record.after.parsedOutput.storedPreference &&
        record.before.parsedOutput.darkClass === record.restore.parsedOutput.darkClass &&
        record.before.parsedOutput.darkClass === record.after.parsedOutput.darkClass &&
        record.before.parsedOutput.lightClass === record.restore.parsedOutput.lightClass &&
        record.before.parsedOutput.lightClass === record.after.parsedOutput.lightClass
      : record.before.parsedOutput.value === record.restore.parsedOutput.value &&
        record.before.parsedOutput.value === record.after.parsedOutput.value;
  return (
    record.before.status === 0 &&
    record.restore.status === 0 &&
    record.after.status === 0 &&
    rawPlaywrightReceiptValid(record.before) &&
    rawPlaywrightReceiptValid(record.restore) &&
    rawPlaywrightReceiptValid(record.after) &&
    record.before.command === beforeCommand &&
    record.restore.command === restoreCommand &&
    record.after.command === afterCommand &&
    record.before.parsedOutput !== null &&
    record.before.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    record.restore.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    record.after.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    valuesRestored
  );
}

export function screenshotReceiptValid(screenshot, scenario, serverStartedAtEpochMs) {
  const relativePath = repoRelativePath(screenshot.path);
  const expectedPath = scenario.screenshotPaths[screenshot.phase];
  return (
    expectedPath === screenshot.path &&
    relativePath !== null &&
    screenshot.captureReceipt.command === expectedScreenshotCaptureCommand(screenshot.path) &&
    screenshot.captureReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.captureReceipt) &&
    screenshot.captureReceipt.stdout === expectedScreenshotStdout(screenshot.path) &&
    sameRawValue(screenshot.captureReceipt.parsedOutput, { reportedPath: relativePath }) &&
    screenshot.size > 45 &&
    screenshot.mtimeEpochMs > serverStartedAtEpochMs &&
    screenshot.signatureHex === "89504e470d0a1a0a" &&
    screenshot.statReceipt.command === expectedScreenshotStatCommand(screenshot.path) &&
    screenshot.statReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.statReceipt) &&
    screenshot.statReceipt.stdout ===
      JSON.stringify({
        size: screenshot.size,
        inode: screenshot.inode,
        mtimeEpochMs: screenshot.mtimeEpochMs,
      }) &&
    sameRawValue(screenshot.statReceipt.parsedOutput, {
      size: screenshot.size,
      inode: screenshot.inode,
      mtimeEpochMs: screenshot.mtimeEpochMs,
    }) &&
    screenshot.hashReceipt.command === expectedScreenshotHashCommand(screenshot.path) &&
    screenshot.hashReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.hashReceipt) &&
    screenshot.hashReceipt.stdout === `${screenshot.sha256}  ${screenshot.path}\n` &&
    sameRawValue(screenshot.hashReceipt.parsedOutput, {
      sha256: screenshot.sha256,
      path: screenshot.path,
    }) &&
    screenshot.signatureReceipt.command === expectedScreenshotSignatureCommand(screenshot.path) &&
    screenshot.signatureReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.signatureReceipt) &&
    screenshot.signatureReceipt.stdout === `${screenshot.signatureHex}\n` &&
    sameRawValue(screenshot.signatureReceipt.parsedOutput, {
      signatureHex: screenshot.signatureHex,
    })
  );
}

export function expectedScreenshotPhases(kind) {
  return TRANSIENT_SCREENSHOT_KINDS.includes(kind) ? ["transient", "final"] : ["final"];
}


export function urlPathMatches(value, expectedPath) {
  try {
    return new URL(value).pathname === expectedPath;
  } catch {
    return false;
  }
}

export function fixtureCreateOutputValid(output, fixture) {
  return (
    output?.id === fixture.id &&
    output?.responsePostId === fixture.id &&
    output?.title === fixture.title &&
    output?.slug === fixture.slug &&
    sameRawValue(output?.cleanPayload, fixture.cleanPayload) &&
    output?.newPostControlName === "New post" &&
    output?.drawerTitle === "Create New Post" &&
    output?.createButtonName === "Create Post" &&
    output?.openAfterCreateEnabled === fixture.openAfterCreateEnabled &&
    sameRawValue(output?.createRequestPayload, expectedFixtureCreatePayload(fixture)) &&
    Number.isInteger(output?.createResponseStatus) &&
    output.createResponseStatus >= 200 &&
    output.createResponseStatus < 300 &&
    urlPathMatches(output?.createResponseUrl, "/admin/api/posts")
  );
}

export function fixtureProvenanceOutputValid(output, fixture) {
  const expectedHref = `/admin/posts/${encodeURIComponent(fixture.id)}`;
  return (
    output?.id === fixture.id &&
    output?.responsePostId === fixture.id &&
    output?.postCreateRouteId === fixture.id &&
    output?.postCreateUrl ===
      (fixture.openAfterCreateEnabled ? fixture.editorUrl : POSTS_LIST_URL) &&
    output?.editorUrl === fixture.editorUrl &&
    output?.editorUrlId === fixture.id &&
    output?.editorTitle === fixture.title &&
    output?.domTitleAccessibleName === `Edit post: ${fixture.title}` &&
    output?.domHref === expectedHref &&
    output?.domHrefId === fixture.id
  );
}

