// TASK-543 smoke-timeline (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  receiptIntegrityValid,
  sameRawValue,
  sameSequence,
  sameUniqueSet,
  sha256Text,
  uniqueNumbers,
  validatePassErrorContract,
} from "./task-543-gate-contracts.mjs";
import {
  ADMIN_ORIGIN,
  EMPTY_SHA256,
  NONCE_GENERATION_COMMAND,
  POSTS_LIST_URL,
  SMOKE_KINDS,
  SMOKE_PASSWORD_FILL_COMMAND,
  SMOKE_SCREENSHOT_ROOT,
  TRANSIENT_SCREENSHOT_KINDS,
} from "./task-543-smoke-schema.mjs";
import {
  aggregateLogReadSets,
  browserCloseReceiptValid,
  browserOpenReceiptValid,
  emptyRouteListOutput,
  expectedScreenshotPhases,
  fixtureCreateOutputValid,
  fixtureProvenanceOutputValid,
  isUserActionCommand,
  logReadSetValid,
  pushLogReadSet,
  scenarioCommandEvidenceValid,
  screenshotReceiptValid,
  sessionListReceiptValid,
  stateRestored,
} from "./task-543-smoke-scenario-validation.mjs";
import {
  expectedFixtureAbsenceCommand,
  expectedFixtureCleanPayload,
  expectedFixtureCreateCommand,
  expectedFixtureCreatePayload,
  expectedFixtureDeleteCommand,
  expectedFixtureProvenanceCommand,
  expectedHelperIdentityCommands,
  expectedHelperLaunchCommand,
  expectedHelperStopCommand,
  expectedPidTreeDiscoveryCommand,
  expectedPortCheckCommand,
  expectedPortOwnershipDiscoveryCommand,
  expectedProcessCheckCommand,
  parseLsofMappings,
  parseLsofOwnerPids,
  parseLsofPorts,
  parsePstreePids,
  rawPlaywrightReceiptValid,
  sessionListContains,
} from "./task-543-smoke-command-builders.mjs";

const ROOT = "/home/coder/project/Coderso";

export function credentialReceiptValidWithoutDigest(receipt, context, exactCommand) {
  const scopeValid =
    context === "bootstrap.passwordFill"
      ? !Object.prototype.hasOwnProperty.call(receipt ?? {}, "scope")
      : context === "timeline.browserPassword" && receipt?.scope === "browser:password";
  return (
    scopeValid &&
    exactCommand === SMOKE_PASSWORD_FILL_COMMAND &&
    receipt?.command === exactCommand &&
    receipt.status === 0 &&
    receipt.stdout === "" &&
    receipt.stderr === "" &&
    receipt.stdoutSha256 === EMPTY_SHA256 &&
    receipt.stderrSha256 === EMPTY_SHA256 &&
    Object.prototype.hasOwnProperty.call(receipt, "parsedOutput") &&
    receipt.parsedOutput === null
  );
}

export function bootstrapPasswordReceiptValid(smoke) {
  return credentialReceiptValidWithoutDigest(
    smoke?.bootstrap?.passwordFill,
    "bootstrap.passwordFill",
    smoke?.commands?.passwordFill
  );
}

export function timelineReceiptIntegrityValid(record, exactPasswordCommand, digest = sha256Text) {
  const hasCredentialSignal =
    record?.scope === "browser:password" || record?.command === SMOKE_PASSWORD_FILL_COMMAND;
  if (hasCredentialSignal) {
    return credentialReceiptValidWithoutDigest(
      record,
      "timeline.browserPassword",
      exactPasswordCommand
    );
  }
  return receiptIntegrityValid(record, digest);
}

export function successTimelineReceiptIntegrityValid(record, smoke, digest = sha256Text) {
  return timelineReceiptIntegrityValid(record, smoke?.commands?.passwordFill, digest);
}

export function failurePrefixTimelineReceiptIntegrityValid(record, _smoke, digest = sha256Text) {
  return timelineReceiptIntegrityValid(record, SMOKE_PASSWORD_FILL_COMMAND, digest);
}

export function prefixedReceipt(value, prefix) {
  return {
    command: value[`${prefix}Command`],
    status: value[`${prefix}Status`],
    stdout: value[`${prefix}Stdout`],
    stderr: value[`${prefix}Stderr`],
    stdoutSha256: value[`${prefix}StdoutSha256`],
    stderrSha256: value[`${prefix}StderrSha256`],
    parsedOutput: value[`${prefix}ParsedOutput`],
  };
}


export function expectedSuccessCommandTimeline(smoke) {
  const expected = [];
  const push = (scope, record) => {
    expected.push({
      sequence: expected.length + 1,
      scope,
      command: record.command,
      status: record.status,
      stdout: record.stdout,
      stderr: record.stderr,
      stdoutSha256: record.stdoutSha256,
      stderrSha256: record.stderrSha256,
      parsedOutput: record.parsedOutput,
    });
  };
  push("browser:preflight", smoke.preflightSessionList);
  for (const check of smoke.bootstrap.preLaunchPortChecks) push("bootstrap:port", check);
  push("bootstrap:nonce", smoke.bootstrap.nonceGeneration);
  push("bootstrap:timestamp", smoke.helper.serverStartTimestampReceipt);
  push("bootstrap:helper", smoke.bootstrap.helperStart);
  for (const key of ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"]) {
    push(`bootstrap:identity:${key}`, smoke.helper.identityReceipts[key]);
  }
  push("health:admin", smoke.health.admin);
  push("health:front", smoke.health.front);
  push("browser:open", smoke.bootstrap.browserOpen);
  push("browser:email", smoke.bootstrap.emailFill);
  push("browser:password", smoke.bootstrap.passwordFill);
  push("browser:login", smoke.bootstrap.loginSubmit);
  push("browser:logs", smoke.bootstrap.consoleObservationStart);
  push("state:theme-before", smoke.state.theme.before);
  push("state:setup-before", smoke.state.setup.before);
  for (const fixture of smoke.fixtures) {
    push(`fixture:${fixture.id}:create`, prefixedReceipt(fixture, "create"));
  }
  pushLogReadSet(push, "lifecycle:after-create", smoke.lifecycleLogReads.afterCreate);
  for (const fixture of smoke.fixtures) {
    push(`fixture:${fixture.id}:provenance`, prefixedReceipt(fixture, "provenance"));
  }
  pushLogReadSet(push, "lifecycle:after-provenance", smoke.lifecycleLogReads.afterProvenance);
  for (const scenario of smoke.scenarios) {
    const scope = `scenario:${scenario.id}`;
    push(`${scope}:log-reset`, scenario.commandResults.logReset);
    push(`${scope}:theme`, scenario.commandResults.theme);
    for (const record of scenario.commandResults.setup) push(`${scope}:setup`, record);
    for (const record of scenario.routes.installed) push(`${scope}:route`, record);
    for (const record of scenario.commandResults.action) push(`${scope}:action`, record);
    for (const record of scenario.commandResults.transientAssertion) {
      push(`${scope}:transient-assertion`, record);
    }
    const transientScreenshot = smoke.screenshots.find(
      ({ scenarioId, phase }) => scenarioId === scenario.id && phase === "transient"
    );
    if (TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) {
      if (!transientScreenshot) return [];
      push(`${scope}:transient-screenshot`, transientScreenshot.captureReceipt);
      push(`${scope}:transient-screenshot-stat`, transientScreenshot.statReceipt);
      push(`${scope}:transient-screenshot-hash`, transientScreenshot.hashReceipt);
      push(`${scope}:transient-screenshot-signature`, transientScreenshot.signatureReceipt);
    } else if (transientScreenshot) {
      return [];
    }
    for (const width of scenario.responsive?.widths ?? []) {
      push(`${scope}:resize:${width.width}`, width.resizeReceipt);
      push(`${scope}:probe:${width.width}`, width.probeReceipt);
    }
    for (const record of scenario.commandResults.assertion) push(`${scope}:assertion`, record);
    push(`${scope}:console-errors`, scenario.commandResults.logReads.consoleErrors);
    push(`${scope}:console-warnings`, scenario.commandResults.logReads.consoleWarnings);
    push(`${scope}:page-errors`, scenario.commandResults.logReads.pageErrors);
    const screenshot = smoke.screenshots.find(
      ({ scenarioId, phase }) => scenarioId === scenario.id && phase === "final"
    );
    if (!screenshot) return [];
    push(`${scope}:final-screenshot`, screenshot.captureReceipt);
    push(`${scope}:final-screenshot-stat`, screenshot.statReceipt);
    push(`${scope}:final-screenshot-hash`, screenshot.hashReceipt);
    push(`${scope}:final-screenshot-signature`, screenshot.signatureReceipt);
    for (const record of scenario.routes.removed) push(`${scope}:unroute`, record);
    if (scenario.routes.removed.length > 0) {
      pushLogReadSet(
        push,
        `${scope}:after-unroute`,
        scenario.commandResults.boundaryLogReads.afterUnroute
      );
    }
    for (const record of scenario.commandResults.reset) push(`${scope}:reset`, record);
    pushLogReadSet(
      push,
      `${scope}:after-reset`,
      scenario.commandResults.boundaryLogReads.afterReset
    );
  }
  for (const fixture of smoke.fixtures) {
    push(`fixture:${fixture.id}:delete`, prefixedReceipt(fixture, "delete"));
    pushLogReadSet(push, "lifecycle:after-delete", smoke.lifecycleLogReads.afterDelete);
    push(`fixture:${fixture.id}:absence`, prefixedReceipt(fixture, "absence"));
    pushLogReadSet(push, "lifecycle:after-absence", smoke.lifecycleLogReads.afterAbsence);
  }
  push("state:theme-restore", smoke.state.theme.restore);
  push("state:theme-after", smoke.state.theme.after);
  push("state:setup-restore", smoke.state.setup.restore);
  push("state:setup-after", smoke.state.setup.after);
  push("helper:pid-tree", smoke.helper.pidTreeDiscovery);
  push("helper:port-ownership", smoke.helper.portOwnershipDiscovery);
  pushLogReadSet(push, "lifecycle:final", smoke.lifecycleLogReads.final);
  push("cleanup:route-list", smoke.cleanup.routeList);
  push("cleanup:browser-close", smoke.cleanup.browserClose);
  push("cleanup:session-list", smoke.cleanup.sessionList);
  push("cleanup:helper-stop", smoke.cleanup.helperStop);
  for (const record of smoke.cleanup.processChecks) push(`cleanup:pid:${record.pid}`, record);
  for (const record of smoke.cleanup.portChecks) push(`cleanup:port:${record.port}`, record);
  return expected;
}

export function successCommandTimelineValid(smoke) {
  const expected = expectedSuccessCommandTimeline(smoke);
  return (
    expected.length > 0 &&
    smoke.commandTimeline.length === expected.length &&
    smoke.commandTimeline.every(
      (record, index) =>
        record.sequence === index + 1 &&
        record.scope === expected[index].scope &&
        record.command === expected[index].command &&
        record.status === expected[index].status &&
        record.stdout === expected[index].stdout &&
        record.stderr === expected[index].stderr &&
        record.stdoutSha256 === expected[index].stdoutSha256 &&
        record.stderrSha256 === expected[index].stderrSha256 &&
        successTimelineReceiptIntegrityValid(record, smoke) &&
        sameRawValue(record.parsedOutput, expected[index].parsedOutput)
    )
  );
}

export async function validateSmoke(smoke) {
  validatePassErrorContract(smoke, "TASK-543 smoke");
  if (smoke.pass !== true) {
    const { validateFailureCleanup } = await import("./task-543-smoke-cleanup-validation.mjs");
    if (!validateFailureCleanup(smoke)) {
      throw new Error("TASK-543 smoke failure cleanup evidence is incomplete");
    }
    throw new Error(`TASK-543 smoke failed: ${smoke.errors.join("; ")}`);
  }

  const kinds = smoke.scenarios.map(({ kind }) => kind);
  const scenarioIds = smoke.scenarios.map(({ id }) => id);
  const themes = smoke.scenarios.map(({ theme }) => theme);
  const fixtureIds = smoke.fixtures.map(({ id }) => id);
  const scenarioFixtureIds = smoke.scenarios.map(({ fixtureId }) => fixtureId);
  const fixturesById = new Map(smoke.fixtures.map((fixture) => [fixture.id, fixture]));
  const scenariosById = new Map(smoke.scenarios.map((scenario) => [scenario.id, scenario]));
  const sharedFixture = smoke.fixtures[0];
  const fixtureTitles = smoke.fixtures.map(({ title }) => title);
  const fixtureSlugs = smoke.fixtures.map(({ slug }) => slug);
  const draftTitlesA = smoke.fixtures.map(({ draftTitleA }) => draftTitleA);
  const independentSentinels = [...fixtureTitles, ...fixtureSlugs, ...draftTitlesA];
  const ownedPids = [smoke.helper.rootPid, ...smoke.helper.childPids];
  const checkedPids = smoke.cleanup.processChecks.map(({ pid }) => pid);
  const checkedPorts = smoke.cleanup.portChecks.map(({ port }) => port);
  const declaredPorts = smoke.helper.ownedPorts;
  const discoveredPorts = smoke.helper.portOwnershipDiscovery.mappings.map(({ port }) => port);
  const rawDiscoveredPorts = parseLsofPorts(smoke.helper.portOwnershipDiscovery.stdout);
  const rawOwnerPids = parseLsofOwnerPids(smoke.helper.portOwnershipDiscovery.stdout);
  const rawPortMappings = parseLsofMappings(smoke.helper.portOwnershipDiscovery.stdout);
  const mappedOwnerPids = uniqueNumbers(
    smoke.helper.portOwnershipDiscovery.mappings.flatMap(({ ownerPids }) => ownerPids)
  );
  const allOwnedPids = new Set(ownedPids);
  const helperIdentity = {
    launchNonce: smoke.helper.launchNonce,
    rootPid: smoke.helper.rootPid,
    ppid: smoke.helper.ppid,
    startTicks: smoke.helper.startTicks,
    cmdlineSha256: smoke.helper.cmdlineSha256,
    cwd: smoke.helper.cwd,
  };
  const helperIdentityCommands = expectedHelperIdentityCommands(helperIdentity);
  const urlPathEquals = (value, expected) => {
    try {
      return new URL(value).pathname === expected;
    } catch {
      return false;
    }
  };
  const fixturesValid = smoke.fixtures.every((fixture) => {
    const create = prefixedReceipt(fixture, "create");
    const provenance = prefixedReceipt(fixture, "provenance");
    const deletion = prefixedReceipt(fixture, "delete");
    const absence = prefixedReceipt(fixture, "absence");
    return (
      create.status === 0 &&
      provenance.status === 0 &&
      deletion.status === 0 &&
      absence.status === 0 &&
      rawPlaywrightReceiptValid(create) &&
      rawPlaywrightReceiptValid(provenance) &&
      rawPlaywrightReceiptValid(deletion) &&
      rawPlaywrightReceiptValid(absence) &&
      fixture.createdId === fixture.id &&
      fixture.provenanceId === fixture.id &&
      fixture.deletedId === fixture.id &&
      fixture.absenceId === fixture.id &&
      fixture.absent === true &&
      sameRawValue(fixture.createPayload, expectedFixtureCreatePayload(fixture)) &&
      sameRawValue(fixture.cleanPayload, expectedFixtureCleanPayload(fixture)) &&
      fixture.createCommand === expectedFixtureCreateCommand(fixture) &&
      fixture.provenanceCommand === expectedFixtureProvenanceCommand(fixture) &&
      fixture.deleteCommand === expectedFixtureDeleteCommand(fixture) &&
      fixture.absenceCommand === expectedFixtureAbsenceCommand(fixture) &&
      fixtureCreateOutputValid(fixture.createParsedOutput, fixture) &&
      fixtureProvenanceOutputValid(fixture.provenanceParsedOutput, fixture) &&
      fixture.draftTitleA !== fixture.title &&
      fixture.draftTitleB === fixture.title &&
      fixture.editorUrl === `${POSTS_LIST_URL}/${encodeURIComponent(fixture.id)}` &&
      fixture.deleteParsedOutput.id === fixture.id &&
      fixture.deleteParsedOutput.deleted === true &&
      fixture.deleteParsedOutput.responseStatus >= 200 &&
      fixture.deleteParsedOutput.responseStatus < 300 &&
      urlPathEquals(
        fixture.deleteParsedOutput.responseUrl,
        `/admin/api/posts/${encodeURIComponent(fixture.id)}`
      ) &&
      fixture.deleteParsedOutput.rowTitleAccessibleName === `Edit post: ${fixture.title}` &&
      fixture.deleteParsedOutput.domHref === `/admin/posts/${encodeURIComponent(fixture.id)}` &&
      fixture.deleteParsedOutput.actionAccessibleName === `Actions for ${fixture.title}` &&
      fixture.deleteParsedOutput.menuItemName === "Delete" &&
      fixture.deleteParsedOutput.dialogTitle === "Delete post?" &&
      fixture.deleteParsedOutput.confirmButtonName === "Delete post" &&
      fixture.deleteParsedOutput.domLinkCount === 0 &&
      fixture.absenceParsedOutput.id === fixture.id &&
      fixture.absenceParsedOutput.absent === true &&
      fixture.absenceParsedOutput.listUrl === POSTS_LIST_URL &&
      fixture.absenceParsedOutput.reloaded === true &&
      fixture.absenceParsedOutput.domLinkCount === 0
    );
  });

  const expectedScreenshotKeys = smoke.scenarios.flatMap((scenario) =>
    expectedScreenshotPhases(scenario.kind).map((phase) => `${scenario.id}:${phase}`)
  );
  const actualScreenshotKeys = smoke.screenshots.map(
    ({ scenarioId, phase }) => `${scenarioId}:${phase}`
  );
  const screenshotPaths = smoke.screenshots.map(({ path }) => path);
  const screenshotInodes = smoke.screenshots.map(({ inode }) => inode);
  const screenshotHashes = smoke.screenshots.map(({ sha256 }) => sha256);
  const scenarioScreenshotPathsValid = smoke.scenarios.every((scenario) => {
    const expectedTransient = TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)
      ? `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-transient.png`
      : null;
    const expectedFinal = `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-final.png`;
    return (
      scenario.screenshotPaths.transient === expectedTransient &&
      scenario.screenshotPaths.final === expectedFinal
    );
  });
  const screenshotsValid = smoke.screenshots.every((screenshot) => {
    const scenario = scenariosById.get(screenshot.scenarioId);
    return (
      scenario !== undefined &&
      expectedScreenshotPhases(scenario.kind).includes(screenshot.phase) &&
      screenshotReceiptValid(screenshot, scenario, smoke.helper.serverStartedAtEpochMs)
    );
  });
  const lifecycleLogSets = [
    smoke.lifecycleLogReads.afterCreate,
    smoke.lifecycleLogReads.afterProvenance,
    ...smoke.scenarios.flatMap((scenario) => [
      scenario.commandResults.logReads,
      ...(scenario.commandResults.boundaryLogReads.afterUnroute
        ? [scenario.commandResults.boundaryLogReads.afterUnroute]
        : []),
      scenario.commandResults.boundaryLogReads.afterReset,
    ]),
    smoke.lifecycleLogReads.afterDelete,
    smoke.lifecycleLogReads.afterAbsence,
    smoke.lifecycleLogReads.final,
  ];
  const lifecycleLogsValid = lifecycleLogSets.every(logReadSetValid);
  const derivedConsoleErrors = aggregateLogReadSets(lifecycleLogSets, "consoleErrors");
  const derivedConsoleWarnings = aggregateLogReadSets(lifecycleLogSets, "consoleWarnings");
  const derivedPageErrors = aggregateLogReadSets(lifecycleLogSets, "pageErrors");

  const timestamp = smoke.helper.serverStartTimestampReceipt;
  const nonce = smoke.bootstrap.nonceGeneration;
  const helperStart = smoke.bootstrap.helperStart;
  const helperIdentityValid =
    smoke.commands.nonceGeneration === NONCE_GENERATION_COMMAND &&
    nonce.command === NONCE_GENERATION_COMMAND &&
    nonce.status === 0 &&
    receiptIntegrityValid(nonce) &&
    nonce.stdout === smoke.helper.launchNonce &&
    nonce.parsedOutput === smoke.helper.launchNonce &&
    !/^wf543-0{32}$/u.test(smoke.helper.launchNonce) &&
    timestamp.command === "/usr/bin/date +%s%3N" &&
    timestamp.status === 0 &&
    receiptIntegrityValid(timestamp) &&
    timestamp.stdout === `${smoke.helper.serverStartedAtEpochMs}\n` &&
    sameRawValue(timestamp.parsedOutput, {
      epochMs: smoke.helper.serverStartedAtEpochMs,
    }) &&
    smoke.commands.helper === expectedHelperLaunchCommand(smoke.helper.launchNonce) &&
    helperStart.command === smoke.commands.helper &&
    helperStart.status === 0 &&
    receiptIntegrityValid(helperStart) &&
    helperStart.stdout === `${smoke.helper.rootPid}\n` &&
    String(helperStart.parsedOutput).trim() === String(smoke.helper.rootPid) &&
    smoke.helper.identityReceipts.ppid.command === helperIdentityCommands.ppid &&
    smoke.helper.identityReceipts.ppid.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.ppid) &&
    smoke.helper.identityReceipts.ppid.stdout === String(smoke.helper.ppid) &&
    String(smoke.helper.identityReceipts.ppid.parsedOutput) === String(smoke.helper.ppid) &&
    smoke.helper.identityReceipts.startTicks.command === helperIdentityCommands.startTicks &&
    smoke.helper.identityReceipts.startTicks.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.startTicks) &&
    smoke.helper.identityReceipts.startTicks.stdout === smoke.helper.startTicks &&
    smoke.helper.identityReceipts.startTicks.parsedOutput === smoke.helper.startTicks &&
    smoke.helper.identityReceipts.cmdline.command === helperIdentityCommands.cmdline &&
    smoke.helper.identityReceipts.cmdline.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.cmdline) &&
    smoke.helper.identityReceipts.cmdline.stdout.trim() === smoke.helper.cmdline.trim() &&
    String(smoke.helper.identityReceipts.cmdline.parsedOutput).trim() ===
      smoke.helper.cmdline.trim() &&
    smoke.helper.identityReceipts.cwd.command === helperIdentityCommands.cwd &&
    smoke.helper.identityReceipts.cwd.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.cwd) &&
    smoke.helper.identityReceipts.cwd.stdout === `${smoke.helper.cwd}\n` &&
    smoke.helper.identityReceipts.cwd.parsedOutput === smoke.helper.cwd &&
    smoke.helper.identityReceipts.cmdlineHash.command === helperIdentityCommands.cmdlineHash &&
    smoke.helper.identityReceipts.cmdlineHash.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.cmdlineHash) &&
    smoke.helper.identityReceipts.cmdlineHash.stdout ===
      `${smoke.helper.cmdlineSha256}  /proc/${smoke.helper.rootPid}/cmdline\n` &&
    smoke.helper.identityReceipts.cmdlineHash.parsedOutput === smoke.helper.cmdlineSha256 &&
    smoke.helper.identityReceipts.nonce.command === helperIdentityCommands.nonce &&
    smoke.helper.identityReceipts.nonce.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.nonce) &&
    smoke.helper.identityReceipts.nonce.stdout === "" &&
    sameRawValue(smoke.helper.identityReceipts.nonce.parsedOutput, {
      present: true,
      nonce: smoke.helper.launchNonce,
    });

  const preLaunchValid =
    sameSequence(
      smoke.bootstrap.preLaunchPortChecks.map(({ port }) => port),
      [3000, 5173]
    ) &&
    smoke.bootstrap.preLaunchPortChecks.every(
      (record) =>
        record.command === expectedPortCheckCommand(record.port) &&
        record.status === 1 &&
        receiptIntegrityValid(record) &&
        record.stdout === "" &&
        record.absent === true &&
        sameRawValue(record.parsedOutput, { absent: true })
    );
  const bootstrapBrowserValid =
    smoke.bootstrap.browserOpen.command === smoke.commands.browserOpen &&
    browserOpenReceiptValid(smoke.bootstrap.browserOpen) &&
    smoke.bootstrap.emailFill.command === smoke.commands.emailFill &&
    smoke.bootstrap.emailFill.status === 0 &&
    receiptIntegrityValid(smoke.bootstrap.emailFill) &&
    smoke.bootstrap.emailFill.stdout === "" &&
    smoke.bootstrap.emailFill.parsedOutput === null &&
    bootstrapPasswordReceiptValid(smoke) &&
    smoke.bootstrap.loginSubmit.command === smoke.commands.loginSubmit &&
    smoke.bootstrap.loginSubmit.status === 0 &&
    rawPlaywrightReceiptValid(smoke.bootstrap.loginSubmit) &&
    smoke.bootstrap.loginSubmit.parsedOutput.signedIn === true &&
    smoke.bootstrap.loginSubmit.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    smoke.bootstrap.consoleObservationStart.command === smoke.commands.consoleObservationStart &&
    smoke.bootstrap.consoleObservationStart.status === 0 &&
    rawPlaywrightReceiptValid(smoke.bootstrap.consoleObservationStart) &&
    smoke.bootstrap.consoleObservationStart.parsedOutput === true;

  const healthValid = [
    [smoke.health.admin, smoke.commands.adminProbe],
    [smoke.health.front, smoke.commands.frontProbe],
  ].every(
    ([receipt, command]) =>
      receipt.command === command &&
      receipt.status === 0 &&
      receiptIntegrityValid(receipt) &&
      receipt.stdout === "200" &&
      sameRawValue(receipt.parsedOutput, { httpStatus: 200 })
  );
  const pidTreeValid =
    smoke.helper.pidTreeDiscovery.command ===
      expectedPidTreeDiscoveryCommand(smoke.helper.rootPid) &&
    smoke.helper.pidTreeDiscovery.status === 0 &&
    receiptIntegrityValid(smoke.helper.pidTreeDiscovery) &&
    smoke.helper.pidTreeDiscovery.stdout.length > 0 &&
    sameUniqueSet(smoke.helper.pidTreeDiscovery.discoveredPids, ownedPids) &&
    sameRawValue(smoke.helper.pidTreeDiscovery.parsedOutput, {
      discoveredPids: smoke.helper.pidTreeDiscovery.discoveredPids,
    }) &&
    sameUniqueSet(parsePstreePids(smoke.helper.pidTreeDiscovery.stdout), ownedPids);
  const portOwnershipValid =
    smoke.helper.portOwnershipDiscovery.command ===
      expectedPortOwnershipDiscoveryCommand(ownedPids) &&
    smoke.helper.portOwnershipDiscovery.status === 0 &&
    receiptIntegrityValid(smoke.helper.portOwnershipDiscovery) &&
    smoke.helper.portOwnershipDiscovery.stdout.length > 0 &&
    sameRawValue(smoke.helper.portOwnershipDiscovery.parsedOutput, {
      mappings: smoke.helper.portOwnershipDiscovery.mappings,
    }) &&
    sameUniqueSet(discoveredPorts, declaredPorts) &&
    sameUniqueSet(rawDiscoveredPorts, declaredPorts) &&
    sameUniqueSet(rawOwnerPids, mappedOwnerPids) &&
    smoke.helper.portOwnershipDiscovery.mappings.every(
      ({ port, ownerPids }) =>
        smoke.helper.portOwnershipDiscovery.stdout.includes(`:${port}`) &&
        sameUniqueSet(rawPortMappings.get(port) ?? [], ownerPids) &&
        ownerPids.every(
          (pid) =>
            allOwnedPids.has(pid) && smoke.helper.portOwnershipDiscovery.stdout.includes(`p${pid}`)
        )
    );
  const cleanupChecksValid =
    sameUniqueSet(ownedPids, checkedPids) &&
    sameUniqueSet(smoke.helper.ownedPorts, checkedPorts) &&
    smoke.cleanup.processChecks.every(
      (record) =>
        record.command === expectedProcessCheckCommand(record.pid) &&
        record.status === 0 &&
        receiptIntegrityValid(record) &&
        record.stdout === "" &&
        record.absent === true &&
        sameRawValue(record.parsedOutput, { absent: true })
    ) &&
    smoke.cleanup.portChecks.every(
      (record) =>
        record.command === expectedPortCheckCommand(record.port) &&
        record.status === 1 &&
        receiptIntegrityValid(record) &&
        record.stdout === "" &&
        record.absent === true &&
        sameRawValue(record.parsedOutput, { absent: true })
    );
  const finalCleanupValid =
    smoke.cleanup.routeList.command === smoke.commands.finalRouteList &&
    smoke.cleanup.routeList.status === 0 &&
    receiptIntegrityValid(smoke.cleanup.routeList) &&
    emptyRouteListOutput(smoke.cleanup.routeList.stdout) &&
    sameRawValue(smoke.cleanup.routeList.parsedOutput, { patterns: [] }) &&
    smoke.cleanup.browserClose.command === smoke.commands.browserClose &&
    browserCloseReceiptValid(smoke.cleanup.browserClose) &&
    smoke.cleanup.sessionList.command === smoke.commands.sessionList &&
    sessionListReceiptValid(smoke.cleanup.sessionList) &&
    !sessionListContains(smoke.cleanup.sessionList.stdout, "wf543smoke") &&
    smoke.commands.helperStop === expectedHelperStopCommand(helperIdentity) &&
    smoke.cleanup.helperStop.command === smoke.commands.helperStop &&
    smoke.cleanup.helperStop.status === 0 &&
    receiptIntegrityValid(smoke.cleanup.helperStop) &&
    smoke.cleanup.helperStop.stdout === "" &&
    smoke.cleanup.helperStop.parsedOutput === null;

  if (
    smoke.serverUp !== true ||
    smoke.errors.length !== 0 ||
    smoke.failures.length !== 0 ||
    smoke.preflightSessionList.command !== smoke.commands.sessionList ||
    !sessionListReceiptValid(smoke.preflightSessionList) ||
    sessionListContains(smoke.preflightSessionList.stdout, "wf543smoke") ||
    !healthValid ||
    !preLaunchValid ||
    !helperIdentityValid ||
    !bootstrapBrowserValid ||
    !sameSequence(kinds, SMOKE_KINDS) ||
    new Set(scenarioIds).size !== scenarioIds.length ||
    !themes.includes("light") ||
    !themes.includes("dark") ||
    !smoke.scenarios.every((scenario) =>
      scenarioCommandEvidenceValid(scenario, fixturesById.get(scenario.fixtureId))
    ) ||
    !sameUniqueSet(expectedScreenshotKeys, actualScreenshotKeys) ||
    !scenarioScreenshotPathsValid ||
    new Set(screenshotPaths).size !== screenshotPaths.length ||
    new Set(screenshotInodes).size !== screenshotInodes.length ||
    new Set(screenshotHashes).size !== screenshotHashes.length ||
    !screenshotsValid ||
    !lifecycleLogsValid ||
    !sameRawValue(smoke.consoleErrors, derivedConsoleErrors) ||
    !sameRawValue(smoke.consoleWarnings, derivedConsoleWarnings) ||
    !sameRawValue(smoke.pageErrors, derivedPageErrors) ||
    !successCommandTimelineValid(smoke) ||
    smoke.fixtures.length !== 1 ||
    new Set(fixtureIds).size !== smoke.fixtures.length ||
    new Set(independentSentinels).size !== independentSentinels.length ||
    !scenarioFixtureIds.every((fixtureId) => fixtureId === sharedFixture?.id) ||
    !fixturesValid ||
    !stateRestored(smoke.state.theme, "theme") ||
    !stateRestored(smoke.state.setup, "setup") ||
    !isUserActionCommand(smoke.commands.loginSubmit) ||
    !smoke.helper.ownedPorts.includes(3000) ||
    !smoke.helper.ownedPorts.includes(5173) ||
    smoke.helper.childPids.includes(smoke.helper.rootPid) ||
    !pidTreeValid ||
    !portOwnershipValid ||
    !cleanupChecksValid ||
    !finalCleanupValid ||
    smoke.consoleErrors.length !== 0 ||
    smoke.consoleWarnings.length !== 0 ||
    smoke.pageErrors.length !== 0
  ) {
    throw new Error("TASK-543 smoke invariant failed");
  }
}

