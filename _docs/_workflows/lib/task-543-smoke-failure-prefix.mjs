// TASK-543 smoke-failure-prefix (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  expectedFixtureAbsenceCommand,
  expectedFixtureCleanPayload,
  expectedFixtureCreateCommand,
  expectedFixtureCreatePayload,
  expectedFixtureDeleteCommand,
  expectedFixtureProvenanceCommand,
  expectedHelperIdentityCommands,
  expectedHelperLaunchCommand,
  expectedPidTreeDiscoveryCommand,
  expectedPortCheckCommand,
  expectedPortOwnershipDiscoveryCommand,
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
  parseLsofMappings,
  parseLsofOwnerPids,
  parseLsofPorts,
  parsePstreePids,
  rawPlaywrightReceiptValid,
  repoRelativePath,
  scenarioTargetUrl,
  sessionListContains,
} from "./task-543-smoke-command-builders.mjs";
import {
  ADMIN_HEALTH_COMMAND,
  ADMIN_ORIGIN,
  FAILURE_BASE_OWNED_PORTS,
  FRONT_HEALTH_COMMAND,
  NONCE_GENERATION_COMMAND,
  POSTS_LIST_URL,
  RESPONSIVE_HEIGHT,
  RESPONSIVE_WIDTHS,
  SMOKE_CONSOLE_ERROR_READ,
  SMOKE_CONSOLE_WARNING_READ,
  SMOKE_KINDS,
  SMOKE_LOGIN_SUBMIT,
  SMOKE_LOG_OBSERVATION_START,
  SMOKE_LOG_RESET,
  SMOKE_PAGE_ERROR_READ,
  SMOKE_PASSWORD_FILL_COMMAND,
  SMOKE_SCREENSHOT_ROOT,
  TRANSIENT_SCREENSHOT_KINDS,
} from "./task-543-smoke-schema.mjs";
import {
  failurePrefixTimelineReceiptIntegrityValid,
} from "./task-543-smoke-timeline.mjs";
import {
  receiptIntegrityValid,
  sameRawValue,
  sameSequence,
  sameUniqueSet,
  sha256Text,
  uniqueNumbers,
} from "./task-543-gate-contracts.mjs";
import {
  browserOpenReceiptValid,
  expectedEvidenceAssertionCommand,
  expectedScenarioResetCommand,
  expectedScenarioRouteMode,
  expectedScenarioRoutePattern,
  expectedTransientAssertionCommands,
  fixtureCreateOutputValid,
  fixtureProvenanceOutputValid,
  lifecycleLogReceiptValid,
  resetEvidenceValid,
  sessionListReceiptValid,
  transientEvidenceValid,
  urlPathMatches,
  validateScenarioByKind,
} from "./task-543-smoke-scenario-validation.mjs";

const ROOT = "/home/coder/project/Coderso";

export function failurePhaseMatchesScope(phase, scope) {
  const prefix = scope.split(":", 1)[0];
  if (phase === "bootstrap") return prefix === "bootstrap" || scope === "browser:preflight";
  return prefix === phase;
}

export function failureEarlyPrefixValid(smoke) {
  const attempted = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const nonceReceipt = attempted.find(({ scope }) => scope === "bootstrap:nonce");
  const helperReceipt = attempted.find(({ scope }) => scope === "bootstrap:helper");
  const nonce = typeof nonceReceipt?.parsedOutput === "string" ? nonceReceipt.parsedOutput : null;
  const rootPid =
    smoke.acquired.helper?.rootPid ??
    (Number.isInteger(Number(helperReceipt?.parsedOutput))
      ? Number(helperReceipt.parsedOutput)
      : null);
  const expected = [
    { scope: "browser:preflight", command: "playwright-cli --raw list" },
    { scope: "bootstrap:port", command: expectedPortCheckCommand(3000) },
    { scope: "bootstrap:port", command: expectedPortCheckCommand(5173) },
    { scope: "bootstrap:nonce", command: NONCE_GENERATION_COMMAND },
    { scope: "bootstrap:timestamp", command: "/usr/bin/date +%s%3N" },
  ];
  if (nonce !== null) {
    expected.push({ scope: "bootstrap:helper", command: expectedHelperLaunchCommand(nonce) });
  }
  if (Number.isInteger(rootPid) && rootPid >= 2 && nonce !== null) {
    const commands = expectedHelperIdentityCommands({ rootPid, launchNonce: nonce });
    for (const key of ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"]) {
      expected.push({ scope: `bootstrap:identity:${key}`, command: commands[key] });
    }
    expected.push(
      { scope: "health:admin", command: ADMIN_HEALTH_COMMAND },
      { scope: "health:front", command: FRONT_HEALTH_COMMAND },
      {
        scope: "browser:open",
        command: "playwright-cli -s=wf543smoke --raw open http://coderso-a.localhost:5173/admin/",
      },
      {
        scope: "browser:email",
        command:
          'playwright-cli -s=wf543smoke --raw fill \'input[type="email"]\' "$ADMIN_EMAIL" >/dev/null',
      },
      {
        scope: "browser:password",
        command: SMOKE_PASSWORD_FILL_COMMAND,
      },
      { scope: "browser:login", command: SMOKE_LOGIN_SUBMIT },
      { scope: "browser:logs", command: SMOKE_LOG_OBSERVATION_START },
      { scope: "state:theme-before", command: expectedThemeStateReadCommand() },
      { scope: "state:setup-before", command: expectedSetupStateReadCommand() }
    );
  }
  const earlyScope =
    /^(?:browser:preflight|bootstrap:|health:|browser:(?:open|email|password|login|logs)|state:(?:theme|setup)-before)/u;
  const firstLaterIndex = attempted.findIndex((record) => !earlyScope.test(record.scope));
  const earlyAttempted = firstLaterIndex === -1 ? attempted : attempted.slice(0, firstLaterIndex);
  if (firstLaterIndex !== -1 && earlyAttempted.length !== expected.length) return false;
  if (earlyAttempted.length > expected.length) return false;
  return earlyAttempted.every(
    (record, index) =>
      record.scope === expected[index].scope && record.command === expected[index].command
  );
}

export function failureIdentityReceiptValid(record, helper) {
  if (!helper || helper.rootPid === null) return false;
  const match = /^bootstrap:identity:(ppid|startTicks|cmdline|cwd|cmdlineHash|nonce)$/u.exec(
    record.scope
  );
  if (!match || record.command !== expectedHelperIdentityCommands(helper)[match[1]]) {
    return false;
  }
  if (record.status !== 0 || !receiptIntegrityValid(record)) return false;
  switch (match[1]) {
    case "ppid":
      return (
        helper.ppid !== null &&
        record.stdout === String(helper.ppid) &&
        String(record.parsedOutput) === String(helper.ppid)
      );
    case "startTicks":
      return (
        helper.startTicks !== null &&
        record.stdout === helper.startTicks &&
        record.parsedOutput === helper.startTicks
      );
    case "cmdline":
      return (
        helper.cmdline !== null &&
        record.stdout.trim() === helper.cmdline.trim() &&
        String(record.parsedOutput).trim() === helper.cmdline.trim()
      );
    case "cwd":
      return (
        helper.cwd !== null &&
        record.stdout === `${helper.cwd}\n` &&
        record.parsedOutput === helper.cwd
      );
    case "cmdlineHash":
      return (
        helper.cmdlineSha256 !== null &&
        record.stdout === `${helper.cmdlineSha256}  /proc/${helper.rootPid}/cmdline\n` &&
        record.parsedOutput === helper.cmdlineSha256
      );
    case "nonce":
      return (
        record.stdout === "" &&
        sameRawValue(record.parsedOutput, {
          present: true,
          nonce: helper.launchNonce,
        })
      );
    default:
      return false;
  }
}

export function failurePrefixReceiptsValid(smoke, digest = sha256Text) {
  return smoke.commandTimeline.slice(0, smoke.failedAtSequence - 1).every((record) => {
    if (!failurePrefixTimelineReceiptIntegrityValid(record, smoke, digest)) return false;
    if (record.scope === "browser:preflight") {
      return sessionListReceiptValid(record) && !sessionListContains(record.stdout, "wf543smoke");
    }
    if (record.scope === "bootstrap:port") {
      return (
        record.status === 1 &&
        record.stdout === "" &&
        sameRawValue(record.parsedOutput, { absent: true })
      );
    }
    if (record.scope === "bootstrap:nonce") {
      return (
        record.status === 0 &&
        /^wf543-[a-f0-9]{32}$/u.test(record.stdout) &&
        record.stdout === record.parsedOutput &&
        !/^wf543-0{32}$/u.test(record.stdout)
      );
    }
    if (record.scope === "bootstrap:timestamp") {
      const epochMs = Number(record.stdout.trim());
      return (
        record.status === 0 &&
        /^\d+\n$/u.test(record.stdout) &&
        Number.isInteger(epochMs) &&
        epochMs >= 1 &&
        sameRawValue(record.parsedOutput, { epochMs })
      );
    }
    if (record.scope.startsWith("bootstrap:identity:")) {
      return failureIdentityReceiptValid(record, smoke.acquired.helper);
    }
    if (record.scope === "health:admin" || record.scope === "health:front") {
      return (
        record.status === 0 &&
        record.stdout === "200" &&
        sameRawValue(record.parsedOutput, { httpStatus: 200 })
      );
    }
    if (record.scope === "browser:open") return browserOpenReceiptValid(record);
    if (record.scope === "browser:password") return true;
    if (record.scope === "browser:email") {
      return record.status === 0 && record.stdout === "" && record.parsedOutput === null;
    }
    if (record.scope === "browser:login") {
      return (
        record.status === 0 &&
        rawPlaywrightReceiptValid(record) &&
        record.parsedOutput?.signedIn === true &&
        typeof record.parsedOutput?.url === "string" &&
        record.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
        !record.parsedOutput.url.includes("/login")
      );
    }
    if (record.scope === "browser:logs") {
      return (
        record.status === 0 && rawPlaywrightReceiptValid(record) && record.parsedOutput === true
      );
    }
    if (record.scope.startsWith("state:")) return failureStateReceiptValid(record, smoke);
    if (record.scope.startsWith("helper:")) return failureHelperReceiptValid(record, smoke);
    if (/^fixture:[^:]+:(?:create|provenance|delete|absence)$/u.test(record.scope)) {
      return failureFixtureReceiptValid(record, smoke);
    }
    if (/^(?:lifecycle:|scenario:[^:]+:after-(?:unroute|reset):)/u.test(record.scope)) {
      return lifecycleLogReceiptValid(record);
    }
    if (record.scope.startsWith("scenario:")) {
      return failureScenarioReceiptValid(record, smoke);
    }
    return (
      record.status === 0 &&
      (!record.command.startsWith("playwright-cli ") || rawPlaywrightReceiptValid(record))
    );
  });
}

export function failedReceiptShowsFailure(receipt) {
  if (receipt.scope === "bootstrap:port") {
    return (
      receipt.status > 1 ||
      (receipt.status === 0 &&
        receipt.stdout.trim().length > 0 &&
        sameRawValue(receipt.parsedOutput, { absent: false }))
    );
  }
  return receipt.status !== 0;
}

export function failureStateReceiptValid(record, smoke) {
  if (record.status !== 0 || !rawPlaywrightReceiptValid(record)) return false;
  const output = record.parsedOutput;
  if (record.scope === "state:theme-before") {
    return (
      record.command === expectedThemeStateReadCommand() &&
      sameRawValue(output, smoke.acquired.themeBefore)
    );
  }
  if (record.scope === "state:setup-before") {
    return (
      record.command === expectedSetupStateReadCommand() &&
      sameRawValue(output, smoke.acquired.setupBefore)
    );
  }
  if (record.scope === "state:theme-restore" || record.scope === "state:theme-after") {
    const before = smoke.acquired.themeBefore;
    if (!before) return false;
    return (
      record.command ===
        (record.scope.endsWith("restore")
          ? expectedThemeStateRestoreCommand(before)
          : expectedThemeStateReadCommand()) &&
      output?.storedPreference === before.storedPreference &&
      output?.darkClass === before.darkClass &&
      output?.lightClass === before.lightClass &&
      typeof output?.url === "string" &&
      output.url.startsWith(`${ADMIN_ORIGIN}/admin/`)
    );
  }
  if (record.scope === "state:setup-restore" || record.scope === "state:setup-after") {
    const before = smoke.acquired.setupBefore;
    if (!before) return false;
    return (
      record.command ===
        (record.scope.endsWith("restore")
          ? expectedSetupStateRestoreCommand(before.value)
          : expectedSetupStateReadCommand()) &&
      output?.value === before.value &&
      typeof output?.url === "string" &&
      output.url.startsWith(`${ADMIN_ORIGIN}/admin/`)
    );
  }
  return false;
}

export function failureHelperReceiptValid(record, smoke) {
  const helper = smoke.acquired.helper;
  if (!helper || helper.rootPid === null || record.status !== 0 || !receiptIntegrityValid(record)) {
    return false;
  }
  if (record.scope === "helper:pid-tree") {
    const discoveredPids = parsePstreePids(record.stdout);
    return (
      record.command === expectedPidTreeDiscoveryCommand(helper.rootPid) &&
      sameUniqueSet(discoveredPids, helper.ownedPids) &&
      sameRawValue(record.parsedOutput, { discoveredPids })
    );
  }
  if (record.scope !== "helper:port-ownership") return false;
  const rawMappings = parseLsofMappings(record.stdout);
  const parsedMappings = record.parsedOutput?.mappings;
  const mappedOwnerPids = Array.isArray(parsedMappings)
    ? uniqueNumbers(parsedMappings.flatMap(({ ownerPids }) => ownerPids ?? []))
    : [];
  return (
    record.command === expectedPortOwnershipDiscoveryCommand(helper.ownedPids) &&
    Array.isArray(parsedMappings) &&
    sameUniqueSet(parseLsofOwnerPids(record.stdout), mappedOwnerPids) &&
    mappedOwnerPids.every((pid) => helper.ownedPids.includes(pid)) &&
    sameUniqueSet(parseLsofPorts(record.stdout), helper.ownedPorts) &&
    parsedMappings.every(
      ({ port, ownerPids }) =>
        Number.isInteger(port) &&
        Array.isArray(ownerPids) &&
        sameUniqueSet(ownerPids, rawMappings.get(port) ?? []) &&
        ownerPids.every((pid) => helper.ownedPids.includes(pid)) &&
        helper.ownedPorts.includes(port)
    ) &&
    parsedMappings.length === helper.ownedPorts.length
  );
}

export function canonicalFixtureCreateCommandValid(command) {
  const startMarker = "const seed = ";
  const endMarker = `; await page.goto(${JSON.stringify(POSTS_LIST_URL)})`;
  const start = command.indexOf(startMarker);
  const end = command.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return false;
  let seed;
  try {
    seed = JSON.parse(command.slice(start + startMarker.length, end));
  } catch {
    return false;
  }
  if (
    typeof seed?.title !== "string" ||
    !/^[A-Za-z0-9 _.-]{1,120}$/u.test(seed.title) ||
    typeof seed?.slug !== "string" ||
    !/^[a-z0-9-]{1,120}$/u.test(seed.slug)
  ) {
    return false;
  }
  const fixture = { title: seed.title, slug: seed.slug };
  return (
    sameRawValue(seed.createPayload, expectedFixtureCreatePayload(fixture)) &&
    sameRawValue(seed.cleanPayload, expectedFixtureCleanPayload(fixture)) &&
    command === expectedFixtureCreateCommand(fixture)
  );
}

export function failureScenarioCommandValid(record, smoke) {
  const match = /^scenario:([^:]+):(.+)$/u.exec(record.scope);
  if (!match) return false;
  const scenario = smoke.acquired.scenarios.find(({ id }) => id === match[1]);
  if (!scenario) return false;
  const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario.fixtureId);
  if (!fixture) return false;
  const suffix = match[2];
  const screenshotPath = (phase) =>
    `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-${phase}.png`;
  const simple = new Map([
    ["log-reset", SMOKE_LOG_RESET],
    ["theme", expectedThemeApplyCommand(scenario.theme)],
    ["setup", expectedScenarioSetupCommand(scenario, fixture)],
    ["assertion", expectedEvidenceAssertionCommand(scenario)],
    ["console-errors", SMOKE_CONSOLE_ERROR_READ],
    ["console-warnings", SMOKE_CONSOLE_WARNING_READ],
    ["page-errors", SMOKE_PAGE_ERROR_READ],
    ["reset", expectedScenarioResetCommand(scenario, fixture)],
  ]);
  if (simple.has(suffix)) return record.command === simple.get(suffix);
  if (suffix === "action") {
    return expectedScenarioActionCommands(scenario, fixture).includes(record.command);
  }
  if (suffix === "transient-assertion") {
    return expectedTransientAssertionCommands(scenario).includes(record.command);
  }
  if (suffix === "route") {
    const mode = expectedScenarioRouteMode(scenario.kind);
    return (
      mode !== null &&
      record.command === expectedRouteInstallCommand(expectedScenarioRoutePattern(fixture), mode)
    );
  }
  if (suffix === "unroute") {
    return record.command === expectedRouteRemovalCommand(expectedScenarioRoutePattern(fixture));
  }
  if (/^after-(?:unroute|reset):console-errors$/u.test(suffix)) {
    return record.command === SMOKE_CONSOLE_ERROR_READ;
  }
  if (/^after-(?:unroute|reset):console-warnings$/u.test(suffix)) {
    return record.command === SMOKE_CONSOLE_WARNING_READ;
  }
  if (/^after-(?:unroute|reset):page-errors$/u.test(suffix)) {
    return record.command === SMOKE_PAGE_ERROR_READ;
  }
  const responsiveMatch = /^(resize|probe):(390|768|900|1024)$/u.exec(suffix);
  if (responsiveMatch) {
    const width = Number(responsiveMatch[2]);
    return responsiveMatch[1] === "resize"
      ? record.command === `playwright-cli -s=wf543smoke --raw resize ${width} ${RESPONSIVE_HEIGHT}`
      : record.command === expectedResponsiveProbeCommand(fixture);
  }
  const screenshotMatch = /^(transient|final)-screenshot(?:-(stat|hash|signature))?$/u.exec(suffix);
  if (screenshotMatch) {
    const path = screenshotPath(screenshotMatch[1]);
    if (screenshotMatch[1] === "transient" && !TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) {
      return false;
    }
    if (!screenshotMatch[2]) return record.command === expectedScreenshotCaptureCommand(path);
    if (screenshotMatch[2] === "stat")
      return record.command === expectedScreenshotStatCommand(path);
    if (screenshotMatch[2] === "hash")
      return record.command === expectedScreenshotHashCommand(path);
    return record.command === expectedScreenshotSignatureCommand(path);
  }
  return false;
}


export function failureFixtureReceiptValid(record, smoke) {
  const match = /^fixture:([^:]+):(create|provenance|delete|absence)$/u.exec(record.scope);
  if (!match || record.status !== 0 || !rawPlaywrightReceiptValid(record)) return false;
  const fixture = smoke.acquired.fixtures.find(({ id }) => id === match[1]);
  if (!fixture || !sameRawValue(fixture.cleanPayload, expectedFixtureCleanPayload(fixture))) {
    return false;
  }
  const output = record.parsedOutput;
  if (match[2] === "create") {
    return (
      record.command === expectedFixtureCreateCommand(fixture) &&
      fixtureCreateOutputValid(output, fixture)
    );
  }
  if (match[2] === "provenance") {
    return (
      record.command === expectedFixtureProvenanceCommand(fixture) &&
      fixtureProvenanceOutputValid(output, fixture)
    );
  }
  if (match[2] === "delete") {
    return (
      record.command === expectedFixtureDeleteCommand(fixture) &&
      output?.id === fixture.id &&
      output?.deleted === true &&
      Number.isInteger(output?.responseStatus) &&
      output.responseStatus >= 200 &&
      output.responseStatus < 300 &&
      urlPathMatches(output?.responseUrl, `/admin/api/posts/${encodeURIComponent(fixture.id)}`) &&
      output?.rowTitleAccessibleName === `Edit post: ${fixture.title}` &&
      output?.domHref === `/admin/posts/${encodeURIComponent(fixture.id)}` &&
      output?.actionAccessibleName === `Actions for ${fixture.title}` &&
      output?.menuItemName === "Delete" &&
      output?.dialogTitle === "Delete post?" &&
      output?.confirmButtonName === "Delete post" &&
      output?.domLinkCount === 0
    );
  }
  return (
    record.command === expectedFixtureAbsenceCommand(fixture) &&
    output?.id === fixture.id &&
    output?.absent === true &&
    output?.listUrl === POSTS_LIST_URL &&
    output?.reloaded === true &&
    output?.domLinkCount === 0
  );
}

export function failureResponsiveEvidence(smoke, scenario, fixture) {
  const prefix = `scenario:${scenario.id}:`;
  const records = smoke.commandTimeline.slice(0, smoke.failedAtSequence - 1);
  const widths = RESPONSIVE_WIDTHS.map((width) => ({
    width,
    resizeReceipt: records.find(({ scope }) => scope === `${prefix}resize:${width}`),
    probeReceipt: records.find(({ scope }) => scope === `${prefix}probe:${width}`),
  }));
  if (widths.some(({ resizeReceipt, probeReceipt }) => !resizeReceipt || !probeReceipt)) {
    return null;
  }
  return { widths };
}

export function failureScenarioReceiptValid(record, smoke) {
  if (
    record.status !== 0 ||
    !rawPlaywrightReceiptValid(record) ||
    !failureScenarioCommandValid(record, smoke)
  ) {
    return false;
  }
  const match = /^scenario:([^:]+):(.+)$/u.exec(record.scope);
  const scenario = smoke.acquired.scenarios.find(({ id }) => id === match?.[1]);
  const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario?.fixtureId);
  if (!match || !scenario || !fixture) return false;
  const suffix = match[2];
  const output = record.parsedOutput;
  if (suffix === "log-reset") return output === true;
  if (suffix === "theme") {
    return (
      output?.preference === scenario.theme &&
      output?.resolved === scenario.theme &&
      typeof output?.url === "string" &&
      output.url.startsWith(`${ADMIN_ORIGIN}/admin/`)
    );
  }
  if (suffix === "setup") {
    return (
      output?.ready === true &&
      output?.scenarioId === scenario.id &&
      output?.fixtureId === fixture.id &&
      output?.setupValue === scenario.id &&
      output?.url === scenarioTargetUrl(scenario, fixture)
    );
  }
  if (suffix === "route") {
    return (
      output?.pattern === expectedScenarioRoutePattern(fixture) &&
      output?.installed === true &&
      output?.mode === expectedScenarioRouteMode(scenario.kind)
    );
  }
  if (suffix === "unroute") {
    return (
      output?.pattern === expectedScenarioRoutePattern(fixture) &&
      output?.removed === true &&
      output?.releasedPending === 0
    );
  }
  if (suffix === "transient-assertion") {
    return transientEvidenceValid(
      { ...scenario, commandResults: { transientAssertion: [record] } },
      fixture
    );
  }
  if (suffix === "assertion") {
    const responsive =
      scenario.kind === "mid-viewport-metadata"
        ? failureResponsiveEvidence(smoke, scenario, fixture)
        : null;
    return validateScenarioByKind({ ...scenario, evidence: output, responsive }, fixture);
  }
  if (["console-errors", "console-warnings", "page-errors"].includes(suffix)) {
    return Array.isArray(output) && output.length === 0;
  }
  if (/^after-(?:unroute|reset):(?:console-errors|console-warnings|page-errors)$/u.test(suffix)) {
    return lifecycleLogReceiptValid(record);
  }
  if (suffix === "reset") {
    return resetEvidenceValid(output, scenario, fixture);
  }
  const responsiveMatch = /^(resize|probe):(390|768|900|1024)$/u.exec(suffix);
  if (responsiveMatch?.[1] === "resize") {
    return record.stdout === "\n" && output === null;
  }
  if (responsiveMatch?.[1] === "probe") {
    const width = Number(responsiveMatch[2]);
    const nodeKeys = [
      "fallbackMetadata",
      "fallbackStatus",
      "fallbackAuthor",
      "fallbackDate",
      "columnStatus",
      "columnAuthor",
      "columnDate",
      "row",
      "table",
    ];
    return (
      output?.width === width &&
      output?.matchedRowCount === 1 &&
      output?.rowPostId === fixture.id &&
      output?.titleAccessibleName === `Edit post: ${fixture.title}` &&
      output?.checkboxAccessibleName === `Select ${fixture.title}` &&
      output?.actionAccessibleName === `Actions for ${fixture.title}` &&
      output?.rowWidth > 0 &&
      output?.tableWidth > 0 &&
      nodeKeys.every((key) => output?.nodes?.[key]?.exists === true)
    );
  }
  const screenshotMatch = /^(transient|final)-screenshot(?:-(stat|hash|signature))?$/u.exec(suffix);
  if (screenshotMatch) {
    const path = `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-${screenshotMatch[1]}.png`;
    if (!screenshotMatch[2]) {
      return (
        record.stdout === expectedScreenshotStdout(path) &&
        sameRawValue(output, { reportedPath: repoRelativePath(path) })
      );
    }
    if (screenshotMatch[2] === "stat") {
      return (
        Number.isInteger(output?.size) &&
        output.size > 45 &&
        typeof output?.inode === "string" &&
        Number.isFinite(output?.mtimeEpochMs) &&
        record.stdout === JSON.stringify(output)
      );
    }
    if (screenshotMatch[2] === "hash") {
      return (
        /^[a-f0-9]{64}$/u.test(output?.sha256 ?? "") &&
        output?.path === path &&
        record.stdout === `${output.sha256}  ${path}\n`
      );
    }
    return output?.signatureHex === "89504e470d0a1a0a" && record.stdout === "89504e470d0a1a0a\n";
  }
  if (suffix !== "action") return false;
  const actionIndex =
    smoke.commandTimeline
      .slice(0, record.sequence)
      .filter(({ scope }) => scope === `scenario:${scenario.id}:action`).length - 1;
  if (actionIndex < 0) return false;
  if (
    ["clean-close", "dirty-delayed-close", "failure-retry"].includes(scenario.kind) ||
    (scenario.kind === "double-close" && actionIndex === 0) ||
    (scenario.kind === "pending-revert-restoration" && actionIndex === 0)
  ) {
    return record.stdout === "\n" && output === null;
  }
  if (scenario.kind === "pending-revert-restoration") {
    return output?.edited === true && output?.closeActivated === true;
  }
  if (scenario.kind === "double-close") return output?.domClickEvents === 2;
  if (scenario.kind === "table-keyboard") {
    if (actionIndex === 0) return output?.key === "Enter" && output?.url === fixture.editorUrl;
    if (actionIndex === 1) return output?.key === "Space" && output?.toggled === true;
    return (
      actionIndex === 2 &&
      output?.key === "Enter" &&
      output?.menuOpened === true &&
      output?.dismissed === true
    );
  }
  return (
    scenario.kind === "mid-viewport-metadata" &&
    output?.ariaLabel === `Edit post: ${fixture.title}` &&
    output?.href === `/admin/posts/${encodeURIComponent(fixture.id)}`
  );
}


export function failureHelperOwnershipMatchesTimeline(prefix, helper, helperAttempts) {
  const firstCleanupIndex = prefix.findIndex(({ scope }) => scope.startsWith("cleanup:"));
  const evidencePrefix = firstCleanupIndex < 0 ? prefix : prefix.slice(0, firstCleanupIndex);
  if (
    firstCleanupIndex >= 0 &&
    prefix
      .slice(firstCleanupIndex)
      .some(({ scope }) => scope === "helper:pid-tree" || scope === "helper:port-ownership")
  ) {
    return false;
  }
  const successfulPidTreeReceipts = evidencePrefix.filter(
    ({ scope, status }) => scope === "helper:pid-tree" && status === 0
  );
  const successfulPortReceipts = evidencePrefix.filter(
    ({ scope, status }) => scope === "helper:port-ownership" && status === 0
  );
  if (helper === null) {
    return (
      helperAttempts.length === 0 &&
      successfulPidTreeReceipts.length === 0 &&
      successfulPortReceipts.length === 0
    );
  }
  if (
    helperAttempts.length !== 1 ||
    successfulPidTreeReceipts.length > 1 ||
    successfulPortReceipts.length > 1
  ) {
    return false;
  }

  const launch = helperAttempts[0];
  const launchedRootPid =
    launch.status === 0 && /^\d+\n$/u.test(launch.stdout) ? Number(launch.stdout.trim()) : null;
  if (
    (launchedRootPid === null && helper.rootPid !== null) ||
    (launchedRootPid !== null &&
      (helper.rootPid !== launchedRootPid ||
        String(launch.parsedOutput).trim() !== String(launchedRootPid)))
  ) {
    return false;
  }

  let evidencedPids = launchedRootPid === null ? [] : [launchedRootPid];
  const pidTreeReceipt = successfulPidTreeReceipts[0];
  if (pidTreeReceipt && helper.identityComplete !== true) return false;
  if (pidTreeReceipt) {
    const rawPids = parsePstreePids(pidTreeReceipt.stdout);
    if (
      launchedRootPid === null ||
      pidTreeReceipt.command !== expectedPidTreeDiscoveryCommand(launchedRootPid) ||
      !receiptIntegrityValid(pidTreeReceipt) ||
      !rawPids.includes(launchedRootPid) ||
      !sameUniqueSet(rawPids, pidTreeReceipt.parsedOutput?.discoveredPids ?? [])
    ) {
      return false;
    }
    evidencedPids = rawPids;
  }

  let evidencedPorts = [...FAILURE_BASE_OWNED_PORTS];
  const portReceipt = successfulPortReceipts[0];
  if (portReceipt && !pidTreeReceipt) return false;
  if (portReceipt) {
    const rawMappings = parseLsofMappings(portReceipt.stdout);
    const rawOwnerPids = parseLsofOwnerPids(portReceipt.stdout);
    const rawPorts = parseLsofPorts(portReceipt.stdout);
    const parsedMappings = portReceipt.parsedOutput?.mappings;
    const parsedPorts = Array.isArray(parsedMappings) ? parsedMappings.map(({ port }) => port) : [];
    const parsedOwnerPids = Array.isArray(parsedMappings)
      ? uniqueNumbers(parsedMappings.flatMap(({ ownerPids }) => ownerPids ?? []))
      : [];
    if (
      portReceipt.command !== expectedPortOwnershipDiscoveryCommand(evidencedPids) ||
      !receiptIntegrityValid(portReceipt) ||
      !Array.isArray(parsedMappings) ||
      !FAILURE_BASE_OWNED_PORTS.every((port) => rawPorts.includes(port)) ||
      !sameUniqueSet(rawPorts, parsedPorts) ||
      !sameUniqueSet(rawOwnerPids, parsedOwnerPids) ||
      !parsedOwnerPids.every((pid) => evidencedPids.includes(pid)) ||
      !parsedMappings.every(
        ({ port, ownerPids }) =>
          Number.isInteger(port) &&
          Array.isArray(ownerPids) &&
          sameUniqueSet(ownerPids, rawMappings.get(port) ?? []) &&
          ownerPids.every((pid) => evidencedPids.includes(pid))
      )
    ) {
      return false;
    }
    evidencedPorts = rawPorts;
  }

  return (
    sameUniqueSet(helper.ownedPids, evidencedPids) &&
    sameUniqueSet(helper.ownedPorts, evidencedPorts)
  );
}

export function failureInventoryMatchesTimeline(smoke) {
  const prefix = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const helperAttempts = prefix.filter((record) => record.scope === "bootstrap:helper");
  const browserOpened = prefix.some(
    (record) => record.scope === "browser:open" && record.status === 0
  );
  const createdIds = prefix
    .filter(
      (record) =>
        /^fixture:[^:]+:create$/u.test(record.scope) &&
        record.status === 0 &&
        typeof record.parsedOutput?.id === "string"
    )
    .map((record) => record.parsedOutput.id);
  const installedRouteRecords = prefix
    .filter(
      (record) =>
        /^scenario:[^:]+:route$/u.test(record.scope) &&
        record.status === 0 &&
        record.parsedOutput?.installed === true
    )
    .map((record) => ({
      pattern: record.parsedOutput.pattern,
      mode: record.parsedOutput.mode,
    }));
  const installedRoutePatterns = [...new Set(installedRouteRecords.map(({ pattern }) => pattern))];
  const attemptedScenarioIds = [
    ...new Set(
      prefix.flatMap((record) => {
        const match = /^scenario:([^:]+):/u.exec(record.scope);
        return match ? [match[1]] : [];
      })
    ),
  ];
  const themeBefore = prefix.find(
    (record) => record.scope === "state:theme-before" && record.status === 0
  );
  const setupBefore = prefix.find(
    (record) => record.scope === "state:setup-before" && record.status === 0
  );
  const helper = smoke.acquired.helper;
  const helperLaunchValid =
    helper === null
      ? helperAttempts.length === 0
      : helperAttempts.length === 1 &&
        helperAttempts[0].command === expectedHelperLaunchCommand(helper.launchNonce) &&
        ((helper.identityComplete === false &&
          helperAttempts[0].status !== 0 &&
          helper.rootPid === null) ||
          (helper.rootPid !== null &&
            helperAttempts[0].status === 0 &&
            helperAttempts[0].stdout === `${helper.rootPid}\n` &&
            String(helperAttempts[0].parsedOutput).trim() === String(helper.rootPid)));
  const identityKeys = ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"];
  const successfulIdentityKeys = prefix
    .filter((record) => record.status === 0 && record.scope.startsWith("bootstrap:identity:"))
    .map((record) => record.scope.slice("bootstrap:identity:".length));
  const identityInventoryValid =
    helper === null
      ? successfulIdentityKeys.length === 0
      : sameSequence(
          successfulIdentityKeys,
          identityKeys.slice(0, successfulIdentityKeys.length)
        ) &&
        helper.identityComplete === (successfulIdentityKeys.length === identityKeys.length) &&
        (helper.ppid !== null) === successfulIdentityKeys.includes("ppid") &&
        (helper.startTicks !== null) === successfulIdentityKeys.includes("startTicks") &&
        (helper.cmdline !== null) === successfulIdentityKeys.includes("cmdline") &&
        (helper.cwd !== null) === successfulIdentityKeys.includes("cwd") &&
        (helper.cmdlineSha256 !== null) === successfulIdentityKeys.includes("cmdlineHash");
  const acquiredFixtureIds = smoke.acquired.fixtures.map(({ id }) => id);
  const acquiredRoutePatterns = smoke.acquired.routes.map(({ pattern }) => pattern);
  const acquiredScenarioIds = smoke.acquired.scenarios.map(({ id }) => id);
  const acquiredScenarioKinds = smoke.acquired.scenarios.map(({ kind }) => kind);
  const acquiredScenariosValid =
    new Set(acquiredScenarioIds).size === acquiredScenarioIds.length &&
    sameUniqueSet(attemptedScenarioIds, acquiredScenarioIds) &&
    sameSequence(acquiredScenarioKinds, SMOKE_KINDS.slice(0, acquiredScenarioKinds.length)) &&
    smoke.acquired.scenarios.every((scenario) => {
      const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario.fixtureId);
      return fixture?.id === scenario.fixtureId;
    });
  const acquiredFixturesValid = smoke.acquired.fixtures.every(
    (fixture) =>
      fixture.editorUrl === `${POSTS_LIST_URL}/${encodeURIComponent(fixture.id)}` &&
      sameRawValue(fixture.cleanPayload, expectedFixtureCleanPayload(fixture)) &&
      fixture.draftTitleA !== fixture.title &&
      fixture.draftTitleB === fixture.title
  );
  const acquiredRoutesValid = smoke.acquired.routes.every((route) => {
    const latest = installedRouteRecords.findLast(({ pattern }) => pattern === route.pattern);
    return latest?.mode === route.mode;
  });
  return (
    helperLaunchValid &&
    identityInventoryValid &&
    failureHelperOwnershipMatchesTimeline(prefix, helper, helperAttempts) &&
    acquiredScenariosValid &&
    acquiredFixturesValid &&
    acquiredRoutesValid &&
    browserOpened === smoke.acquired.browserSession &&
    sameUniqueSet(createdIds, acquiredFixtureIds) &&
    sameUniqueSet(installedRoutePatterns, acquiredRoutePatterns) &&
    (themeBefore
      ? sameRawValue(themeBefore.parsedOutput, smoke.acquired.themeBefore)
      : smoke.acquired.themeBefore === null) &&
    (setupBefore
      ? sameRawValue(setupBefore.parsedOutput, smoke.acquired.setupBefore)
      : smoke.acquired.setupBefore === null)
  );
}

