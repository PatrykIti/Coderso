import { SmokeError } from "../../contracts";
import type { SmokeScenarioResult, SmokeScreenshotResult } from "../types";
import {
  TASK511_VARIANTS,
  type Task511BrowserReceipt,
  type Task511ScenarioDescriptor,
  type Task511SessionConfig,
  type Task511VariantId,
} from "./browser-actions";

export interface Task511ScreenshotRecord {
  readonly path: string;
  readonly sha256: string;
}

export interface Task511ScenarioInput {
  readonly receipt: Task511BrowserReceipt;
  readonly descriptor: Task511ScenarioDescriptor;
  readonly variantId: Task511VariantId;
  readonly config: Task511SessionConfig;
  readonly screenshot: Task511ScreenshotRecord | null;
  readonly elapsedMs: number;
}

type Task511Assertion = Readonly<{
  readonly kind: "computed-style" | "geometry" | "dom-state" | "aria";
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly actual: string;
  readonly pass: boolean;
}>;

function assertion(
  kind: Task511Assertion["kind"],
  target: string,
  property: string,
  expected: string,
  actual: string,
  pass: boolean
): Task511Assertion {
  return Object.freeze({ kind, target, property, expected, actual, pass });
}

function exact(
  kind: Task511Assertion["kind"],
  target: string,
  property: string,
  expected: string,
  actual: string
): Task511Assertion {
  return assertion(kind, target, property, expected, actual, actual === expected);
}

function positive(
  kind: Task511Assertion["kind"],
  target: string,
  property: string,
  actual: number
): Task511Assertion {
  return assertion(
    kind,
    target,
    property,
    ">0",
    String(actual),
    Number.isSafeInteger(actual) && actual > 0
  );
}

function colorAssertions(receipt: Task511BrowserReceipt): readonly Task511Assertion[] {
  const expectedDark = String(receipt.colorScheme === "dark");
  return Object.freeze([
    exact("computed-style", "html", "class-dark", expectedDark, String(receipt.darkClassActive)),
    exact("computed-style", "html", "prefers-dark", expectedDark, String(receipt.prefersDark)),
  ]);
}

function loginAssertions(receipt: Task511BrowserReceipt): readonly Task511Assertion[] {
  return Object.freeze([
    exact("dom-state", "#email", "visible", "true", String(receipt.loginFormVisible)),
    positive("geometry", "Sign in button", "width", receipt.submitButtonWidth),
    exact("dom-state", "[data-app-scroll]", "visible", "true", String(receipt.adminShellVisible)),
    exact(
      "dom-state",
      "location",
      "redirected-from-login",
      "true",
      String(receipt.loginRedirected)
    ),
    ...colorAssertions(receipt),
  ]);
}

function scheduleCardAssertions(
  receipt: Task511BrowserReceipt,
  config: Task511SessionConfig
): readonly Task511Assertion[] {
  return Object.freeze([
    exact(
      "dom-state",
      "Automatic backups card",
      "visible",
      "true",
      String(receipt.scheduleCardVisible)
    ),
    positive("geometry", "Automatic backups card", "width", receipt.scheduleCardWidth),
    exact("dom-state", "frequency buttons", "count", "3", String(receipt.frequencyButtonCount)),
    exact("dom-state", "include checkboxes", "count", "4", String(receipt.includeCheckboxCount)),
    exact(
      "dom-state",
      "schedule badge",
      "text",
      config.expectedScheduleBadge,
      receipt.scheduleBadgeText
    ),
    exact(
      "dom-state",
      "Update Schedule button",
      "visible",
      "true",
      String(receipt.updateScheduleButtonVisible)
    ),
    ...colorAssertions(receipt),
  ]);
}

function createBackupAssertions(receipt: Task511BrowserReceipt): readonly Task511Assertion[] {
  const cbkSuffix = receipt.downloadFileName === null ? "" : receipt.downloadFileName;
  return Object.freeze([
    exact(
      "dom-state",
      "Create Backup dialog",
      "visible",
      "true",
      String(receipt.createDialogVisible)
    ),
    positive("geometry", "Create Backup dialog", "width", receipt.createDialogWidth),
    exact("dom-state", "create response", "status", "200", String(receipt.createResponseStatus)),
    exact(
      "dom-state",
      "created backup",
      "status",
      "complete",
      String(receipt.createdBackupStatus ?? "")
    ),
    exact("dom-state", "created row", "visible", "true", String(receipt.createdRowVisible)),
    exact("dom-state", "create toast", "visible", "true", String(receipt.createToastVisible)),
    exact("aria", "row restore button", "disabled", "true", String(receipt.restoreButtonDisabled)),
    exact("dom-state", "download button", "visible", "true", String(receipt.downloadButtonVisible)),
    exact(
      "dom-state",
      "download response",
      "status",
      "200",
      String(receipt.downloadResponseStatus)
    ),
    exact("dom-state", "download file name", "cbk-suffix", ".cbk", cbkSuffix),
    exact("dom-state", "download encoding", "base64", "base64", String(receipt.downloadEncoding)),
    positive("geometry", "download content", "decoded-bytes", receipt.downloadDecodedBytes),
    exact("dom-state", "download toast", "visible", "true", String(receipt.downloadToastVisible)),
    ...colorAssertions(receipt),
  ]);
}

function importDialogAssertions(receipt: Task511BrowserReceipt): readonly Task511Assertion[] {
  return Object.freeze([
    exact(
      "dom-state",
      "Import Backup dialog",
      "visible",
      "true",
      String(receipt.importDialogVisible)
    ),
    positive("geometry", "Import Backup dialog", "width", receipt.importDialogWidth),
    exact("aria", "Import button", "disabled", "true", String(receipt.importSubmitDisabled)),
    exact("dom-state", "import warning", "visible", "true", String(receipt.importWarningVisible)),
    exact(
      "dom-state",
      "restore users checkbox",
      "visible",
      "true",
      String(receipt.importUsersCheckboxVisible)
    ),
    ...colorAssertions(receipt),
  ]);
}

function updateScheduleAssertions(
  receipt: Task511BrowserReceipt,
  config: Task511SessionConfig
): readonly Task511Assertion[] {
  return Object.freeze([
    exact("dom-state", "patch response", "status", "200", String(receipt.patchResponseStatus)),
    exact(
      "dom-state",
      "patch frequency",
      "weekly",
      "weekly",
      String(receipt.patchResponseFrequency)
    ),
    exact("dom-state", "Weekly button", "active", "true", String(receipt.weeklyButtonActive)),
    exact("dom-state", "update toast", "visible", "true", String(receipt.updateToastVisible)),
    exact(
      "dom-state",
      "schedule badge",
      "text",
      config.expectedScheduleBadge,
      receipt.scheduleBadgeText
    ),
    ...colorAssertions(receipt),
  ]);
}

const TASK511_ASSERTION_BUILDERS: Readonly<
  Record<
    Task511BrowserReceipt["scenarioId"],
    (receipt: Task511BrowserReceipt, config: Task511SessionConfig) => readonly Task511Assertion[]
  >
> = Object.freeze({
  login: loginAssertions,
  "backups-schedule-card": scheduleCardAssertions,
  "create-encrypted-backup": createBackupAssertions,
  "import-restore-dialog": importDialogAssertions,
  "update-schedule": updateScheduleAssertions,
});

const TASK511_SCENARIO_TITLES: Readonly<Record<Task511BrowserReceipt["scenarioId"], string>> =
  Object.freeze({
    login: "Admin login with fixture credentials",
    "backups-schedule-card": "Backups schedule card renders frequency and include options",
    "create-encrypted-backup": "Encrypted .cbk create and download flow",
    "import-restore-dialog": "Import restore dialog confirm gate",
    "update-schedule": "Update schedule PATCH through the card",
  });

export function buildTask511ScenarioResult(input: Task511ScenarioInput): SmokeScenarioResult {
  if (input.receipt.consoleErrors.length > 0 || input.receipt.pageErrors.length > 0) {
    throw new SmokeError(
      "smoke_output_invalid",
      `TASK-511 scenario ${input.descriptor.id} observed console or page errors`
    );
  }
  const builder = TASK511_ASSERTION_BUILDERS[input.descriptor.id];
  if (builder === undefined)
    throw new SmokeError("smoke_output_invalid", "TASK-511 assertions are unregistered");
  const assertions = builder(input.receipt, input.config);
  const failed = assertions.find((entry) => !entry.pass);
  if (failed !== undefined) {
    throw new SmokeError(
      "smoke_output_invalid",
      `TASK-511 scenario ${input.descriptor.id} assertion failed: ${failed.target} ${failed.property} expected ${failed.expected} got ${failed.actual}`
    );
  }
  const variant = TASK511_VARIANTS.find((entry) => entry.id === input.variantId);
  if (variant === undefined)
    throw new SmokeError("smoke_output_invalid", "TASK-511 variant is unregistered");
  return Object.freeze({
    id: input.descriptor.id,
    pass: true,
    elapsedMs: input.elapsedMs,
    title: TASK511_SCENARIO_TITLES[input.descriptor.id],
    variants: Object.freeze([
      Object.freeze({
        id: variant.id,
        surface: "admin",
        theme: variant.colorScheme,
        viewport: Object.freeze({ width: 1440, height: 900 }),
        assertions,
        consoleErrors: Object.freeze([]),
      }),
    ]),
    screenshots:
      input.screenshot === null
        ? Object.freeze([])
        : Object.freeze([
            Object.freeze({
              path: input.screenshot.path,
              sha256: input.screenshot.sha256,
            } satisfies SmokeScreenshotResult),
          ]),
  });
}
