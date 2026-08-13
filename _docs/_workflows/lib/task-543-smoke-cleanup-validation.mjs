// TASK-543 smoke-cleanup-validation (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  browserCloseReceiptValid,
  emptyRouteListOutput,
  expectedEvidenceAssertionCommand,
  expectedScenarioResetCommand,
  expectedScenarioRouteMode,
  expectedScenarioRoutePattern,
  expectedTransientAssertionCommands,
  lifecycleLogCommandValid,
  lifecycleLogReceiptValid,
  sessionListReceiptValid,
} from "./task-543-smoke-scenario-validation.mjs";
import {
  expectedFixtureAbsenceCommand,
  expectedFixtureCreateCommand,
  expectedFixtureDeleteCommand,
  expectedFixtureProvenanceCommand,
  expectedHelperLaunchCommand,
  expectedHelperStopCommand,
  expectedPidTreeDiscoveryCommand,
  expectedPortCheckCommand,
  expectedPortOwnershipDiscoveryCommand,
  expectedProcessCheckCommand,
  expectedResponsiveProbeCommand,
  expectedRouteInstallCommand,
  expectedRouteRemovalCommand,
  expectedScenarioActionCommands,
  expectedScenarioSetupCommand,
  expectedScreenshotCaptureCommand,
  expectedScreenshotHashCommand,
  expectedScreenshotSignatureCommand,
  expectedScreenshotStatCommand,
  expectedSetupStateReadCommand,
  expectedSetupStateRestoreCommand,
  expectedThemeApplyCommand,
  expectedThemeStateReadCommand,
  expectedThemeStateRestoreCommand,
  sessionListContains,
  rawPlaywrightReceiptValid,
} from "./task-543-smoke-command-builders.mjs";
import {
  FAILURE_BASE_OWNED_PORTS,
  NONCE_GENERATION_COMMAND,
  POSTS_LIST_URL,
  RESPONSIVE_HEIGHT,
  RESPONSIVE_WIDTHS,
  SMOKE_CONSOLE_ERROR_READ,
  SMOKE_CONSOLE_WARNING_READ,
  SMOKE_LOG_RESET,
  SMOKE_PAGE_ERROR_READ,
  SMOKE_SCREENSHOT_ROOT,
  SMOKE_SETUP_STORAGE_KEY,
  TRANSIENT_SCREENSHOT_KINDS,
} from "./task-543-smoke-schema.mjs";
import {
  canonicalFixtureCreateCommandValid,
  failedReceiptShowsFailure,
  failureEarlyPrefixValid,
  failureInventoryMatchesTimeline,
  failurePhaseMatchesScope,
  failurePrefixReceiptsValid,
  failureScenarioCommandValid,
} from "./task-543-smoke-failure-prefix.mjs";
import {
  failurePrefixTimelineReceiptIntegrityValid,
} from "./task-543-smoke-timeline.mjs";
import {
  receiptIntegrityValid,
  sameRawValue,
  sameUniqueSet,
} from "./task-543-gate-contracts.mjs";

const ROOT = "/home/coder/project/Coderso";

export function failureNeedsProvenanceCleanupLogs(smoke) {
  const attempted = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const provenanceIndex = attempted.findIndex(({ scope }) =>
    /^fixture:[^:]+:provenance$/u.test(scope)
  );
  if (provenanceIndex < 0) return false;
  const expectedScopes = [
    "lifecycle:after-provenance:console-errors",
    "lifecycle:after-provenance:console-warnings",
    "lifecycle:after-provenance:page-errors",
  ];
  const boundary = attempted.slice(provenanceIndex + 1, provenanceIndex + 4);
  return !expectedScopes.every(
    (scope, index) => boundary[index]?.scope === scope && lifecycleLogReceiptValid(boundary[index])
  );
}

export function failureCleanupCommandValid(record, smoke) {
  const expected = new Map();
  const addLogCommands = (resourceId) => {
    for (const entry of expectedLogReadPlan(`cleanup:log:${resourceId}`)) {
      expected.set(entry.scope, entry.command);
    }
  };
  if (failureNeedsProvenanceCleanupLogs(smoke)) {
    addLogCommands("after-provenance");
  }
  for (const route of smoke.acquired.routes) {
    expected.set(`cleanup:route:${route.pattern}`, expectedRouteRemovalCommand(route.pattern));
    addLogCommands(`route:${route.pattern}:after-unroute`);
  }
  for (const fixture of smoke.acquired.fixtures) {
    expected.set(`cleanup:fixture-delete:${fixture.id}`, expectedFixtureDeleteCommand(fixture));
    addLogCommands(`fixture:${fixture.id}:after-delete`);
    expected.set(`cleanup:fixture-absence:${fixture.id}`, expectedFixtureAbsenceCommand(fixture));
    addLogCommands(`fixture:${fixture.id}:after-absence`);
  }
  if (smoke.acquired.themeBefore) {
    expected.set(
      "cleanup:theme:admin-theme",
      expectedThemeStateRestoreCommand(smoke.acquired.themeBefore)
    );
  }
  if (smoke.acquired.setupBefore) {
    expected.set(
      `cleanup:setup:${SMOKE_SETUP_STORAGE_KEY}`,
      expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value)
    );
  }
  if (smoke.acquired.browserSession) {
    addLogCommands("final");
    expected.set("cleanup:route:route-list", "playwright-cli -s=wf543smoke --raw route-list");
    expected.set("cleanup:browser:wf543smoke", "playwright-cli -s=wf543smoke --raw close");
    expected.set("cleanup:browser:session-list", "playwright-cli --raw list");
  }
  const helper = smoke.acquired.helper;
  if (helper?.identityComplete === true) {
    expected.set(`cleanup:helper:${helper.rootPid}`, expectedHelperStopCommand(helper));
  }
  for (const pid of helper?.ownedPids ?? []) {
    expected.set(`cleanup:pid:${pid}`, expectedProcessCheckCommand(pid));
  }
  for (const port of helper?.ownedPorts ?? []) {
    expected.set(`cleanup:port:${port}`, expectedPortCheckCommand(port));
  }
  return record.command === expected.get(record.scope);
}

export function expectedLogReadPlan(scope) {
  return [
    { scope: `${scope}:console-errors`, command: SMOKE_CONSOLE_ERROR_READ },
    { scope: `${scope}:console-warnings`, command: SMOKE_CONSOLE_WARNING_READ },
    { scope: `${scope}:page-errors`, command: SMOKE_PAGE_ERROR_READ },
  ];
}

export function expectedFailureScenarioPlan(scenario, fixture) {
  const scope = `scenario:${scenario.id}`;
  const plan = [
    { scope: `${scope}:log-reset`, command: SMOKE_LOG_RESET },
    { scope: `${scope}:theme`, command: expectedThemeApplyCommand(scenario.theme) },
    { scope: `${scope}:setup`, command: expectedScenarioSetupCommand(scenario, fixture) },
  ];
  const routeMode = expectedScenarioRouteMode(scenario.kind);
  if (routeMode !== null) {
    plan.push({
      scope: `${scope}:route`,
      command: expectedRouteInstallCommand(expectedScenarioRoutePattern(fixture), routeMode),
    });
  }
  for (const command of expectedScenarioActionCommands(scenario, fixture)) {
    plan.push({ scope: `${scope}:action`, command });
  }
  for (const command of expectedTransientAssertionCommands(scenario)) {
    plan.push({ scope: `${scope}:transient-assertion`, command });
  }
  const screenshotEntries = (phase) => {
    const path = `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-${phase}.png`;
    return [
      { scope: `${scope}:${phase}-screenshot`, command: expectedScreenshotCaptureCommand(path) },
      { scope: `${scope}:${phase}-screenshot-stat`, command: expectedScreenshotStatCommand(path) },
      { scope: `${scope}:${phase}-screenshot-hash`, command: expectedScreenshotHashCommand(path) },
      {
        scope: `${scope}:${phase}-screenshot-signature`,
        command: expectedScreenshotSignatureCommand(path),
      },
    ];
  };
  if (TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) {
    plan.push(...screenshotEntries("transient"));
  }
  if (scenario.kind === "mid-viewport-metadata") {
    for (const width of RESPONSIVE_WIDTHS) {
      plan.push(
        {
          scope: `${scope}:resize:${width}`,
          command: `playwright-cli -s=wf543smoke --raw resize ${width} ${RESPONSIVE_HEIGHT}`,
        },
        { scope: `${scope}:probe:${width}`, command: expectedResponsiveProbeCommand(fixture) }
      );
    }
  }
  plan.push(
    { scope: `${scope}:assertion`, command: expectedEvidenceAssertionCommand(scenario) },
    { scope: `${scope}:console-errors`, command: SMOKE_CONSOLE_ERROR_READ },
    { scope: `${scope}:console-warnings`, command: SMOKE_CONSOLE_WARNING_READ },
    { scope: `${scope}:page-errors`, command: SMOKE_PAGE_ERROR_READ },
    ...screenshotEntries("final")
  );
  if (routeMode !== null) {
    plan.push({
      scope: `${scope}:unroute`,
      command: expectedRouteRemovalCommand(expectedScenarioRoutePattern(fixture)),
    });
    plan.push(...expectedLogReadPlan(`${scope}:after-unroute`));
  }
  plan.push(
    { scope: `${scope}:reset`, command: expectedScenarioResetCommand(scenario, fixture) },
    ...expectedLogReadPlan(`${scope}:after-reset`)
  );
  return plan;
}

export function expectedFailureLaterPlan(smoke) {
  const plan = [];
  for (const fixture of smoke.acquired.fixtures) {
    plan.push(
      {
        scope: `fixture:${fixture.id}:create`,
        command: expectedFixtureCreateCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-create"),
      {
        scope: `fixture:${fixture.id}:provenance`,
        command: expectedFixtureProvenanceCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-provenance")
    );
  }
  for (const scenario of smoke.acquired.scenarios) {
    const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario.fixtureId);
    if (!fixture) return [];
    plan.push(...expectedFailureScenarioPlan(scenario, fixture));
  }
  for (const fixture of smoke.acquired.fixtures) {
    plan.push(
      {
        scope: `fixture:${fixture.id}:delete`,
        command: expectedFixtureDeleteCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-delete"),
      {
        scope: `fixture:${fixture.id}:absence`,
        command: expectedFixtureAbsenceCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-absence")
    );
  }
  if (smoke.acquired.themeBefore !== null) {
    plan.push(
      {
        scope: "state:theme-restore",
        command: expectedThemeStateRestoreCommand(smoke.acquired.themeBefore),
      },
      { scope: "state:theme-after", command: expectedThemeStateReadCommand() }
    );
  }
  if (smoke.acquired.setupBefore !== null) {
    plan.push(
      {
        scope: "state:setup-restore",
        command: expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value),
      },
      { scope: "state:setup-after", command: expectedSetupStateReadCommand() }
    );
  }
  if (smoke.acquired.helper?.rootPid !== null && smoke.acquired.helper !== null) {
    plan.push(
      {
        scope: "helper:pid-tree",
        command: expectedPidTreeDiscoveryCommand(smoke.acquired.helper.rootPid),
      },
      {
        scope: "helper:port-ownership",
        command: expectedPortOwnershipDiscoveryCommand(smoke.acquired.helper.ownedPids),
      }
    );
  }
  if (smoke.acquired.browserSession) {
    plan.push(...expectedLogReadPlan("lifecycle:final"));
  }
  if (failureNeedsProvenanceCleanupLogs(smoke)) {
    plan.push(...expectedLogReadPlan("cleanup:log:after-provenance"));
  }
  for (const route of smoke.acquired.routes) {
    plan.push(
      {
        scope: `cleanup:route:${route.pattern}`,
        command: expectedRouteRemovalCommand(route.pattern),
      },
      ...expectedLogReadPlan(`cleanup:log:route:${route.pattern}:after-unroute`)
    );
  }
  for (const fixture of smoke.acquired.fixtures) {
    plan.push(
      {
        scope: `cleanup:fixture-delete:${fixture.id}`,
        command: expectedFixtureDeleteCommand(fixture),
      },
      ...expectedLogReadPlan(`cleanup:log:fixture:${fixture.id}:after-delete`),
      {
        scope: `cleanup:fixture-absence:${fixture.id}`,
        command: expectedFixtureAbsenceCommand(fixture),
      },
      ...expectedLogReadPlan(`cleanup:log:fixture:${fixture.id}:after-absence`)
    );
  }
  if (smoke.acquired.themeBefore !== null) {
    plan.push({
      scope: "cleanup:theme:admin-theme",
      command: expectedThemeStateRestoreCommand(smoke.acquired.themeBefore),
    });
  }
  if (smoke.acquired.setupBefore !== null) {
    plan.push({
      scope: `cleanup:setup:${SMOKE_SETUP_STORAGE_KEY}`,
      command: expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value),
    });
  }
  if (smoke.acquired.browserSession) {
    plan.push(
      ...expectedLogReadPlan("cleanup:log:final"),
      {
        scope: "cleanup:route:route-list",
        command: "playwright-cli -s=wf543smoke --raw route-list",
      },
      {
        scope: "cleanup:browser:wf543smoke",
        command: "playwright-cli -s=wf543smoke --raw close",
      },
      { scope: "cleanup:browser:session-list", command: "playwright-cli --raw list" }
    );
  }
  const helper = smoke.acquired.helper;
  if (helper?.identityComplete === true) {
    plan.push({
      scope: `cleanup:helper:${helper.rootPid}`,
      command: expectedHelperStopCommand(helper),
    });
  }
  for (const pid of helper?.ownedPids ?? []) {
    plan.push({ scope: `cleanup:pid:${pid}`, command: expectedProcessCheckCommand(pid) });
  }
  for (const port of helper?.ownedPorts ?? []) {
    plan.push({ scope: `cleanup:port:${port}`, command: expectedPortCheckCommand(port) });
  }
  return plan;
}

export function failureLaterPrefixValid(smoke) {
  const attempted = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const later = attempted.filter(
    ({ scope }) =>
      !/^(?:browser:preflight|bootstrap:|health:|browser:(?:open|email|password|login|logs)|state:(?:theme|setup)-before)/u.test(
        scope
      )
  );
  const recordsValid = later.every((record) => {
    if (
      /^(?:browser:preflight|bootstrap:|health:|browser:(?:open|email|password|login|logs)|state:(?:theme|setup)-before)/u.test(
        record.scope
      )
    ) {
      return true;
    }
    const fixtureMatch = /^fixture:([^:]+):(create|provenance|delete|absence)$/u.exec(record.scope);
    if (fixtureMatch) {
      const fixture = smoke.acquired.fixtures.find(({ id }) => id === fixtureMatch[1]);
      if (fixtureMatch[2] === "create") {
        return fixture
          ? record.command === expectedFixtureCreateCommand(fixture)
          : canonicalFixtureCreateCommandValid(record.command);
      }
      if (!fixture) return false;
      if (fixtureMatch[2] === "provenance") {
        return record.command === expectedFixtureProvenanceCommand(fixture);
      }
      return (
        record.command ===
        (fixtureMatch[2] === "delete"
          ? expectedFixtureDeleteCommand(fixture)
          : expectedFixtureAbsenceCommand(fixture))
      );
    }
    if (
      /^lifecycle:(?:after-create|after-provenance|after-delete|after-absence|final):/u.test(
        record.scope
      )
    ) {
      return record.sequence === smoke.failedAtSequence
        ? lifecycleLogCommandValid(record)
        : lifecycleLogReceiptValid(record);
    }
    if (record.scope.startsWith("scenario:")) {
      return failureScenarioCommandValid(record, smoke);
    }
    if (record.scope === "state:theme-restore") {
      return (
        smoke.acquired.themeBefore !== null &&
        record.command === expectedThemeStateRestoreCommand(smoke.acquired.themeBefore)
      );
    }
    if (record.scope === "state:theme-after") {
      return record.command === expectedThemeStateReadCommand();
    }
    if (record.scope === "state:setup-restore") {
      return (
        smoke.acquired.setupBefore !== null &&
        record.command === expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value)
      );
    }
    if (record.scope === "state:setup-after") {
      return record.command === expectedSetupStateReadCommand();
    }
    if (record.scope === "helper:pid-tree") {
      return (
        smoke.acquired.helper?.rootPid !== null &&
        record.command === expectedPidTreeDiscoveryCommand(smoke.acquired.helper.rootPid)
      );
    }
    if (record.scope === "helper:port-ownership") {
      return (
        smoke.acquired.helper !== null &&
        record.command === expectedPortOwnershipDiscoveryCommand(smoke.acquired.helper.ownedPids)
      );
    }
    if (record.scope.startsWith("cleanup:")) {
      return failureCleanupCommandValid(record, smoke);
    }
    return false;
  });
  if (!recordsValid) return false;
  const expected = expectedFailureLaterPlan(smoke);
  return later.every((record, index) => {
    if (record.scope === expected[index]?.scope && record.command === expected[index]?.command) {
      return true;
    }
    return (
      index === later.length - 1 &&
      record.sequence === smoke.failedAtSequence &&
      /^fixture:[^:]+:create$/u.test(record.scope) &&
      canonicalFixtureCreateCommandValid(record.command) &&
      index === smoke.acquired.fixtures.length
    );
  });
}


export function validateFailureCleanup(smoke) {
  const failedReceipt = smoke.commandTimeline[smoke.failedAtSequence - 1];
  const timelineValid =
    smoke.commandTimeline.length === smoke.failedAtSequence + smoke.cleanup.records.length &&
    smoke.commandTimeline.every(
      (record, index) =>
        record.sequence === index + 1 && failurePrefixTimelineReceiptIntegrityValid(record, smoke)
    ) &&
    failedReceipt?.scope === smoke.failedScope &&
    failedReceiptShowsFailure(failedReceipt) &&
    failurePhaseMatchesScope(smoke.failurePhase, smoke.failedScope) &&
    failureEarlyPrefixValid(smoke) &&
    failurePrefixReceiptsValid(smoke) &&
    failureLaterPrefixValid(smoke) &&
    failureInventoryMatchesTimeline(smoke);
  if (!timelineValid) return false;

  const expected = [];
  const resourceResults = new Map();
  const addExpected = (item, resource) => {
    expected.push({ ...item, resource });
    if (!resourceResults.has(resource)) resourceResults.set(resource, true);
  };
  const addExpectedLogReads = (resourceId, resource) => {
    const reads = [
      ["console-errors", SMOKE_CONSOLE_ERROR_READ],
      ["console-warnings", SMOKE_CONSOLE_WARNING_READ],
      ["page-errors", SMOKE_PAGE_ERROR_READ],
    ];
    for (const [suffix, command] of reads) {
      addExpected(
        {
          kind: "log",
          resourceId: `${resourceId}:${suffix}`,
          command,
          proof: false,
          succeeded: (record) =>
            lifecycleLogReceiptValid({
              ...record,
              scope: `cleanup:log:${resourceId}:${suffix}`,
            }),
        },
        resource
      );
    }
  };
  if (failureNeedsProvenanceCleanupLogs(smoke)) {
    addExpectedLogReads("after-provenance", "browser:wf543smoke");
  }
  for (const route of smoke.acquired.routes) {
    addExpected(
      {
        kind: "route",
        resourceId: route.pattern,
        command: expectedRouteRemovalCommand(route.pattern),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.pattern === route.pattern &&
          record.parsedOutput?.removed === true &&
          Number.isInteger(record.parsedOutput?.releasedPending) &&
          record.parsedOutput.releasedPending >= 0,
      },
      `route:${route.pattern}`
    );
    addExpectedLogReads(`route:${route.pattern}:after-unroute`, `route:${route.pattern}`);
  }
  for (const fixture of smoke.acquired.fixtures) {
    const resource = `fixture:${fixture.id}`;
    addExpected(
      {
        kind: "fixture-delete",
        resourceId: fixture.id,
        command: expectedFixtureDeleteCommand(fixture),
        proof: false,
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.id === fixture.id &&
          record.parsedOutput?.deleted === true &&
          typeof record.parsedOutput?.rowTitleAccessibleName === "string" &&
          record.parsedOutput.rowTitleAccessibleName.startsWith("Edit post: ") &&
          record.parsedOutput?.domHref === `/admin/posts/${encodeURIComponent(fixture.id)}` &&
          record.parsedOutput?.actionAccessibleName ===
            `Actions for ${record.parsedOutput.rowTitleAccessibleName.slice("Edit post: ".length)}` &&
          record.parsedOutput?.menuItemName === "Delete" &&
          record.parsedOutput?.dialogTitle === "Delete post?" &&
          record.parsedOutput?.confirmButtonName === "Delete post" &&
          record.parsedOutput?.domLinkCount === 0,
      },
      resource
    );
    addExpectedLogReads(`fixture:${fixture.id}:after-delete`, resource);
    addExpected(
      {
        kind: "fixture-absence",
        resourceId: fixture.id,
        command: expectedFixtureAbsenceCommand(fixture),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.id === fixture.id &&
          record.parsedOutput?.absent === true &&
          record.parsedOutput?.listUrl === POSTS_LIST_URL &&
          record.parsedOutput?.reloaded === true &&
          record.parsedOutput?.domLinkCount === 0,
      },
      resource
    );
    addExpectedLogReads(`fixture:${fixture.id}:after-absence`, resource);
  }
  if (smoke.acquired.themeBefore) {
    addExpected(
      {
        kind: "theme",
        resourceId: "admin-theme",
        command: expectedThemeStateRestoreCommand(smoke.acquired.themeBefore),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.storedPreference === smoke.acquired.themeBefore.storedPreference &&
          record.parsedOutput?.darkClass === smoke.acquired.themeBefore.darkClass &&
          record.parsedOutput?.lightClass === smoke.acquired.themeBefore.lightClass,
      },
      "theme:admin-theme"
    );
  }
  if (smoke.acquired.setupBefore) {
    addExpected(
      {
        kind: "setup",
        resourceId: SMOKE_SETUP_STORAGE_KEY,
        command: expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.value === smoke.acquired.setupBefore.value,
      },
      `setup:${SMOKE_SETUP_STORAGE_KEY}`
    );
  }
  if (smoke.acquired.browserSession) {
    addExpectedLogReads("final", "browser:wf543smoke");
    addExpected(
      {
        kind: "route",
        resourceId: "route-list",
        command: "playwright-cli -s=wf543smoke --raw route-list",
        proof: false,
        succeeded: (record) =>
          record.status === 0 &&
          receiptIntegrityValid(record) &&
          emptyRouteListOutput(record.stdout) &&
          sameRawValue(record.parsedOutput, { patterns: [] }),
      },
      "browser:wf543smoke"
    );
    addExpected(
      {
        kind: "browser",
        resourceId: "wf543smoke",
        command: "playwright-cli -s=wf543smoke --raw close",
        proof: false,
        succeeded: (record) => browserCloseReceiptValid(record),
      },
      "browser:wf543smoke"
    );
    addExpected(
      {
        kind: "browser",
        resourceId: "session-list",
        command: "playwright-cli --raw list",
        succeeded: (record) =>
          record.status === 0 &&
          sessionListReceiptValid(record) &&
          !sessionListContains(record.stdout, "wf543smoke"),
      },
      "browser:wf543smoke"
    );
  }
  const helper = smoke.acquired.helper;
  if (helper?.identityComplete === true) {
    addExpected(
      {
        kind: "helper",
        resourceId: String(helper.rootPid),
        command: expectedHelperStopCommand(helper),
        proof: false,
        succeeded: (record) =>
          record.status === 0 &&
          receiptIntegrityValid(record) &&
          record.stdout === "" &&
          record.parsedOutput === null,
      },
      `helper:${helper.rootPid}`
    );
    for (const pid of helper.ownedPids) {
      addExpected(
        {
          kind: "pid",
          resourceId: String(pid),
          command: expectedProcessCheckCommand(pid),
          succeeded: (record) =>
            record.status === 0 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        `helper:${helper.rootPid}`
      );
    }
    for (const port of helper.ownedPorts) {
      addExpected(
        {
          kind: "port",
          resourceId: String(port),
          command: expectedPortCheckCommand(port),
          succeeded: (record) =>
            record.status === 1 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        `helper:${helper.rootPid}`
      );
    }
  } else if (helper) {
    const resource = `helper:${helper.rootPid ?? helper.launchNonce}`;
    resourceResults.set(
      resource,
      helper.rootPid !== null && helper.ownedPids.includes(helper.rootPid)
    );
    for (const pid of helper.ownedPids) {
      addExpected(
        {
          kind: "pid",
          resourceId: String(pid),
          command: expectedProcessCheckCommand(pid),
          succeeded: (record) =>
            record.status === 0 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        resource
      );
    }
    for (const port of helper.ownedPorts) {
      addExpected(
        {
          kind: "port",
          resourceId: String(port),
          command: expectedPortCheckCommand(port),
          succeeded: (record) =>
            record.status === 1 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        resource
      );
    }
  }
  const recordsValid =
    smoke.cleanup.records.length === expected.length &&
    smoke.cleanup.records.every((record, index) => {
      const item = expected[index];
      const matches =
        record.sequence === smoke.failedAtSequence + index + 1 &&
        record.kind === item.kind &&
        record.resourceId === item.resourceId &&
        record.command === item.command &&
        receiptIntegrityValid(record) &&
        (item.kind !== "log" || record.status !== 0 || item.succeeded(record)) &&
        sameRawValue(smoke.commandTimeline[smoke.failedAtSequence + index], {
          sequence: record.sequence,
          scope: `cleanup:${record.kind}:${record.resourceId}`,
          command: record.command,
          status: record.status,
          stdout: record.stdout,
          stderr: record.stderr,
          stdoutSha256: record.stdoutSha256,
          stderrSha256: record.stderrSha256,
          parsedOutput: record.parsedOutput,
        });
      if (item.proof !== false) {
        resourceResults.set(
          item.resource,
          resourceResults.get(item.resource) === true && matches && item.succeeded(record)
        );
      }
      return matches;
    });
  if (resourceResults.get("browser:wf543smoke") === true) {
    for (const resource of resourceResults.keys()) {
      if (resource.startsWith("route:")) resourceResults.set(resource, true);
    }
  }
  const expectedRemaining = [...resourceResults]
    .filter(([, cleared]) => !cleared)
    .map(([resource]) => {
      const separator = resource.indexOf(":");
      return { kind: resource.slice(0, separator), resourceId: resource.slice(separator + 1) };
    });
  const actualRemaining = smoke.cleanup.remainingResources.map(
    ({ kind, resourceId }) => `${kind}:${resourceId}`
  );
  const expectedRemainingKeys = expectedRemaining.map(
    ({ kind, resourceId }) => `${kind}:${resourceId}`
  );
  const nonceReceipts = smoke.commandTimeline.filter(
    ({ command }) => command === NONCE_GENERATION_COMMAND
  );
  const nonceReceipt = nonceReceipts[0];
  const helperAttempt = helper
    ? smoke.commandTimeline.find((record) => record.scope === "bootstrap:helper")
    : null;
  const helperNonceValid =
    !helper ||
    (nonceReceipts.length === 1 &&
      nonceReceipt !== undefined &&
      nonceReceipt.status === 0 &&
      receiptIntegrityValid(nonceReceipt) &&
      nonceReceipt.stdout === helper.launchNonce &&
      nonceReceipt.parsedOutput === helper.launchNonce &&
      !/^wf543-0{32}$/u.test(helper.launchNonce) &&
      helperAttempt !== null &&
      helperAttempt.command === expectedHelperLaunchCommand(helper.launchNonce) &&
      receiptIntegrityValid(helperAttempt) &&
      ((helper.identityComplete === false &&
        helperAttempt.status !== 0 &&
        helper.rootPid === null) ||
        (helper.rootPid !== null &&
          helperAttempt.status === 0 &&
          helperAttempt.stdout === `${helper.rootPid}\n` &&
          String(helperAttempt.parsedOutput).trim() === String(helper.rootPid))));
  return (
    smoke.cleanup.attempted === true &&
    new Set(smoke.acquired.routes.map(({ pattern }) => pattern)).size ===
      smoke.acquired.routes.length &&
    new Set(smoke.acquired.fixtures.map(({ id }) => id)).size === smoke.acquired.fixtures.length &&
    (!helper || helper.identityComplete === false || helper.ownedPids.includes(helper.rootPid)) &&
    (!helper || FAILURE_BASE_OWNED_PORTS.every((port) => helper.ownedPorts.includes(port))) &&
    helperNonceValid &&
    recordsValid &&
    sameUniqueSet(actualRemaining, expectedRemainingKeys)
  );
}

