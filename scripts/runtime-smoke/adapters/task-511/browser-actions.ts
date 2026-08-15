import { WorkerProtocolError, type PlainJsonObject } from "../../workers/contracts";

export const TASK511_SCENARIO_IDS = Object.freeze([
  "login",
  "backups-schedule-card",
  "create-encrypted-backup",
  "import-restore-dialog",
  "update-schedule",
] as const);

export type Task511ScenarioId = (typeof TASK511_SCENARIO_IDS)[number];

export const TASK511_VARIANTS: readonly Readonly<{
  readonly id: Task511VariantId;
  readonly colorScheme: "light" | "dark";
}>[] = Object.freeze([
  Object.freeze({ id: "light", colorScheme: "light" }),
  Object.freeze({ id: "dark", colorScheme: "dark" }),
]);

export type Task511VariantId = "light" | "dark";

export interface Task511ScenarioDescriptor extends PlainJsonObject {
  readonly id: Task511ScenarioId;
  readonly canonicalVariant: Task511VariantId;
}

export const TASK511_SCENARIOS: readonly Task511ScenarioDescriptor[] = Object.freeze([
  Object.freeze({ id: "login", canonicalVariant: "light" }),
  Object.freeze({ id: "backups-schedule-card", canonicalVariant: "light" }),
  Object.freeze({ id: "create-encrypted-backup", canonicalVariant: "light" }),
  Object.freeze({ id: "import-restore-dialog", canonicalVariant: "light" }),
  Object.freeze({ id: "update-schedule", canonicalVariant: "light" }),
]);

export interface Task511Variant extends PlainJsonObject {
  readonly id: Task511VariantId;
  readonly colorScheme: "light" | "dark";
}

export interface Task511SessionConfig extends PlainJsonObject {
  readonly adminOrigin: string;
  readonly adminPath: string;
  readonly email: string;
  readonly password: string;
  readonly passphrase: string;
  readonly expectedScheduleBadge: string;
}

export interface Task511BrowserReceipt extends PlainJsonObject {
  readonly scenarioId: Task511ScenarioId;
  readonly variantId: Task511VariantId;
  readonly colorScheme: "light" | "dark";
  readonly darkClassActive: boolean;
  readonly prefersDark: boolean;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly adminShellVisible: boolean;
  readonly loginFormVisible: boolean;
  readonly loginRedirected: boolean;
  readonly submitButtonWidth: number;
  readonly scheduleCardVisible: boolean;
  readonly scheduleCardWidth: number;
  readonly scheduleBadgeText: string;
  readonly frequencyButtonCount: number;
  readonly includeCheckboxCount: number;
  readonly updateScheduleButtonVisible: boolean;
  readonly createDialogVisible: boolean;
  readonly createDialogWidth: number;
  readonly createResponseStatus: number;
  readonly createdBackupId: string | null;
  readonly createdBackupStatus: string | null;
  readonly createdRowVisible: boolean;
  readonly createToastVisible: boolean;
  readonly restoreButtonDisabled: boolean;
  readonly downloadButtonVisible: boolean;
  readonly downloadResponseStatus: number;
  readonly downloadFileName: string | null;
  readonly downloadEncoding: string | null;
  readonly downloadContentBytes: number;
  readonly downloadDecodedBytes: number;
  readonly downloadToastVisible: boolean;
  readonly importDialogVisible: boolean;
  readonly importDialogWidth: number;
  readonly importSubmitDisabled: boolean;
  readonly importWarningVisible: boolean;
  readonly importUsersCheckboxVisible: boolean;
  readonly patchResponseStatus: number;
  readonly patchResponseFrequency: string | null;
  readonly weeklyButtonActive: boolean;
  readonly updateToastVisible: boolean;
}

const TASK511_RECEIPT_KEYS = Object.freeze([
  "adminShellVisible",
  "colorScheme",
  "consoleErrors",
  "createDialogVisible",
  "createDialogWidth",
  "createResponseStatus",
  "createToastVisible",
  "createdBackupId",
  "createdBackupStatus",
  "createdRowVisible",
  "darkClassActive",
  "downloadButtonVisible",
  "downloadContentBytes",
  "downloadDecodedBytes",
  "downloadEncoding",
  "downloadFileName",
  "downloadResponseStatus",
  "downloadToastVisible",
  "frequencyButtonCount",
  "importDialogVisible",
  "importDialogWidth",
  "importSubmitDisabled",
  "importUsersCheckboxVisible",
  "importWarningVisible",
  "includeCheckboxCount",
  "loginFormVisible",
  "loginRedirected",
  "pageErrors",
  "patchResponseFrequency",
  "patchResponseStatus",
  "prefersDark",
  "restoreButtonDisabled",
  "scheduleBadgeText",
  "scheduleCardVisible",
  "scheduleCardWidth",
  "scenarioId",
  "submitButtonWidth",
  "updateScheduleButtonVisible",
  "updateToastVisible",
  "variantId",
  "weeklyButtonActive",
]);

const TASK511_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function failure(message: string): never {
  throw new WorkerProtocolError(message);
}

function isScenarioId(value: unknown): value is Task511ScenarioId {
  return typeof value === "string" && (TASK511_SCENARIO_IDS as readonly string[]).includes(value);
}

function isVariantId(value: unknown): value is Task511VariantId {
  return value === "light" || value === "dark";
}

function requireCount(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) failure(message);
  return value;
}

function requireBoolean(value: unknown, message: string): boolean {
  if (typeof value !== "boolean") failure(message);
  return value;
}

function requireText(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length > 512) failure(message);
  return value;
}

function requireNullableText(value: unknown, message: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 512) failure(message);
  return value;
}

function requireStringList(value: unknown, message: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > 32 ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0 || entry.length > 512)
  ) {
    failure(message);
  }
  return Object.freeze([...value]);
}

export function assertTask511BrowserReceipt(
  value: unknown
): asserts value is Task511BrowserReceipt {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failure("task-511 browser receipt is invalid");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== TASK511_RECEIPT_KEYS.length) {
    failure("task-511 browser receipt keys are invalid");
  }
  for (const key of TASK511_RECEIPT_KEYS) {
    if (!Object.hasOwn(record, key)) failure("task-511 browser receipt keys are invalid");
  }
  if (!isScenarioId(record.scenarioId)) failure("task-511 receipt scenario id is invalid");
  if (!isVariantId(record.variantId)) failure("task-511 receipt variant id is invalid");
  if (record.colorScheme !== "light" && record.colorScheme !== "dark") {
    failure("task-511 receipt color scheme is invalid");
  }
  requireBoolean(record.darkClassActive, "task-511 receipt dark class drifted");
  requireBoolean(record.prefersDark, "task-511 receipt prefers dark drifted");
  requireStringList(record.consoleErrors, "task-511 receipt console errors are invalid");
  requireStringList(record.pageErrors, "task-511 receipt page errors are invalid");
  requireBoolean(record.adminShellVisible, "task-511 receipt admin shell drifted");
  requireBoolean(record.loginFormVisible, "task-511 receipt login form drifted");
  requireBoolean(record.loginRedirected, "task-511 receipt login redirect drifted");
  requireCount(record.submitButtonWidth, "task-511 receipt submit width drifted");
  requireBoolean(record.scheduleCardVisible, "task-511 receipt schedule card drifted");
  requireCount(record.scheduleCardWidth, "task-511 receipt schedule width drifted");
  requireText(record.scheduleBadgeText, "task-511 receipt schedule badge drifted");
  requireCount(record.frequencyButtonCount, "task-511 receipt frequency count drifted");
  requireCount(record.includeCheckboxCount, "task-511 receipt include count drifted");
  requireBoolean(record.updateScheduleButtonVisible, "task-511 receipt update button drifted");
  requireBoolean(record.createDialogVisible, "task-511 receipt create dialog drifted");
  requireCount(record.createDialogWidth, "task-511 receipt create dialog width drifted");
  requireCount(record.createResponseStatus, "task-511 receipt create status drifted");
  const createdBackupId = requireNullableText(
    record.createdBackupId,
    "task-511 receipt created id drifted"
  );
  if (createdBackupId !== null && !TASK511_UUID.test(createdBackupId)) {
    failure("task-511 receipt created backup id is invalid");
  }
  requireNullableText(record.createdBackupStatus, "task-511 receipt created status drifted");
  requireBoolean(record.createdRowVisible, "task-511 receipt created row drifted");
  requireBoolean(record.createToastVisible, "task-511 receipt create toast drifted");
  requireBoolean(record.restoreButtonDisabled, "task-511 receipt restore gate drifted");
  requireBoolean(record.downloadButtonVisible, "task-511 receipt download button drifted");
  requireCount(record.downloadResponseStatus, "task-511 receipt download status drifted");
  requireNullableText(record.downloadFileName, "task-511 receipt download name drifted");
  requireNullableText(record.downloadEncoding, "task-511 receipt download encoding drifted");
  requireCount(record.downloadContentBytes, "task-511 receipt download bytes drifted");
  requireCount(record.downloadDecodedBytes, "task-511 receipt download decoded bytes drifted");
  requireBoolean(record.downloadToastVisible, "task-511 receipt download toast drifted");
  requireBoolean(record.importDialogVisible, "task-511 receipt import dialog drifted");
  requireCount(record.importDialogWidth, "task-511 receipt import width drifted");
  requireBoolean(record.importSubmitDisabled, "task-511 receipt import gate drifted");
  requireBoolean(record.importWarningVisible, "task-511 receipt import warning drifted");
  requireBoolean(record.importUsersCheckboxVisible, "task-511 receipt import users drifted");
  requireCount(record.patchResponseStatus, "task-511 receipt patch status drifted");
  requireNullableText(record.patchResponseFrequency, "task-511 receipt patch frequency drifted");
  requireBoolean(record.weeklyButtonActive, "task-511 receipt weekly state drifted");
  requireBoolean(record.updateToastVisible, "task-511 receipt update toast drifted");
}

const COMMON_PRELUDE = `
async (page) => {
  const cfg = $CONFIG;
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (message) => {
    if (message.type() !== "error") return;
    consoleErrors.push(String(message.text()).slice(0, 512));
  };
  const onPageError = (error) => {
    pageErrors.push(String(error && error.message ? error.message : "pageerror").slice(0, 512));
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  const visible = async (locator) => {
    if ((await locator.count()) === 0) return false;
    return await locator.first().isVisible().catch(() => false);
  };
  const waitVisible = async (locator, ms) => {
    await locator.first().waitFor({ state: "visible", timeout: ms }).catch(() => undefined);
    return visible(locator);
  };
  const waitHidden = async (locator, ms) => {
    await locator.first().waitFor({ state: "hidden", timeout: ms }).catch(() => undefined);
    return !(await visible(locator));
  };
  const boxWidth = async (locator) => {
    if (!(await visible(locator))) return 0;
    const box = await locator.first().boundingBox().catch(() => null);
    return box === null ? 0 : Math.round(box.width);
  };
  const button = (name) => page.getByRole("button", { name });
  const setColorMode = async () => {
    await page.evaluate((mode) => {
      try { localStorage.setItem("coderso-admin-color-mode", mode); } catch (error) {}
    }, cfg.colorScheme);
  };
  const boot = async (pathname) => {
    await page.goto(cfg.adminOrigin + cfg.adminPath + pathname, { waitUntil: "domcontentloaded", timeout: 180000 });
    await setColorMode();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  };
  const darkClass = async () => page.evaluate(() => document.documentElement.classList.contains("dark"));
  const prefersDark = async () => page.evaluate(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const dialogContent = (title) => page.locator('[data-slot="dialog-content"]').filter({ hasText: title }).first();
  const card = () => page.locator('[data-slot="card"]').filter({ hasText: "Automatic backups" }).first();
  const receiptBase = () => ({
    scenarioId: cfg.scenarioId,
    variantId: cfg.variantId,
    colorScheme: cfg.colorScheme,
    darkClassActive: false,
    prefersDark: false,
    consoleErrors,
    pageErrors,
    adminShellVisible: false,
    loginFormVisible: false,
    loginRedirected: false,
    submitButtonWidth: 0,
    scheduleCardVisible: false,
    scheduleCardWidth: 0,
    scheduleBadgeText: "",
    frequencyButtonCount: 0,
    includeCheckboxCount: 0,
    updateScheduleButtonVisible: false,
    createDialogVisible: false,
    createDialogWidth: 0,
    createResponseStatus: 0,
    createdBackupId: null,
    createdBackupStatus: null,
    createdRowVisible: false,
    createToastVisible: false,
    restoreButtonDisabled: false,
    downloadButtonVisible: false,
    downloadResponseStatus: 0,
    downloadFileName: null,
    downloadEncoding: null,
    downloadContentBytes: 0,
    downloadDecodedBytes: 0,
    downloadToastVisible: false,
    importDialogVisible: false,
    importDialogWidth: 0,
    importSubmitDisabled: false,
    importWarningVisible: false,
    importUsersCheckboxVisible: false,
    patchResponseStatus: 0,
    patchResponseFrequency: null,
    weeklyButtonActive: false,
    updateToastVisible: false,
  });
  const finalize = async (receipt) => {
    receipt.darkClassActive = await darkClass();
    receipt.prefersDark = await prefersDark();
    if (cfg.screenshotPath !== null) {
      await page.screenshot({ path: cfg.screenshotPath, fullPage: false }).catch(() => undefined);
    }
    return receipt;
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: cfg.colorScheme });
  $BODY
}
`;

const LOGIN_BODY = `
  const receipt = receiptBase();
  await boot("/login");
  receipt.loginFormVisible = await waitVisible(page.locator("#email"), 120000);
  const signIn = button("Sign in");
  receipt.submitButtonWidth = await boxWidth(signIn);
  if (receipt.loginFormVisible) {
    await page.fill("#email", cfg.email);
    await page.fill("#password", cfg.password);
    await signIn.click();
  }
  receipt.adminShellVisible = await waitVisible(page.locator('[data-app-scroll]'), 120000);
  const pathname = await page.evaluate(() => window.location.pathname);
  receipt.loginRedirected = pathname.startsWith(cfg.adminPath) && pathname.indexOf("/login") === -1;
  return await finalize(receipt);
`;

const SCHEDULE_CARD_BODY = `
  const receipt = receiptBase();
  await boot("/backups");
  const scheduleCard = card();
  receipt.scheduleCardVisible = await waitVisible(scheduleCard, 120000);
  receipt.scheduleCardWidth = await boxWidth(scheduleCard);
  await page
    .waitForFunction(() => {
      const badge = document.querySelector('[data-slot="badge"]');
      return (
        badge !== null &&
        badge.textContent !== null &&
        badge.textContent.indexOf("Loading schedule") === -1
      );
    }, { timeout: 60000 })
    .catch(() => undefined);
  const badge = page.locator('[data-slot="badge"]').filter({ hasText: "Auto-backup" }).first();
  receipt.scheduleBadgeText = (await badge.textContent().catch(() => null)) ?? "";
  const frequencyCounts = await Promise.all(
    ["Daily", "Weekly", "Monthly"].map((name) => scheduleCard.getByRole("button", { name }).count())
  );
  receipt.frequencyButtonCount = frequencyCounts.reduce((sum, count) => sum + count, 0);
  receipt.includeCheckboxCount = await scheduleCard.locator('[data-slot="checkbox"]').count();
  receipt.updateScheduleButtonVisible = await visible(
    scheduleCard.getByRole("button", { name: "Update Schedule" })
  );
  return await finalize(receipt);
`;

const CREATE_BACKUP_BODY = `
  const receipt = receiptBase();
  await boot("/backups");
  const scheduleCard = card();
  await waitVisible(scheduleCard, 120000);
  await button("Create").click();
  receipt.createDialogVisible = await waitVisible(page.getByText("Create Backup", { exact: true }), 15000);
  receipt.createDialogWidth = await boxWidth(dialogContent("Create Backup"));
  await page.fill("#backup-passphrase", cfg.passphrase);
  const createResponsePromise = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === cfg.adminPath + "/api/backups",
      { timeout: 120000 }
    )
    .catch(() => null);
  await button("Start Backup").click();
  const createResponse = await createResponsePromise;
  if (createResponse !== null) {
    receipt.createResponseStatus = createResponse.status();
    const body = await createResponse.json().catch(() => null);
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      if (typeof body.id === "string") receipt.createdBackupId = body.id;
      if (typeof body.status === "string") receipt.createdBackupStatus = body.status;
    }
  }
  await waitHidden(page.getByText("Create Backup", { exact: true }), 15000);
  if (receipt.createdBackupId !== null) {
    const row = page.locator('[data-slot="table-row"]').filter({ hasText: receipt.createdBackupId }).first();
    receipt.createdRowVisible = await waitVisible(row, 120000);
    receipt.createToastVisible = await waitVisible(
      page.getByText("Backup created. Keep your passphrase safe.", { exact: true }),
      10000
    );
    const restoreButton = row.getByRole("button", { name: /Restore unavailable/ });
    receipt.restoreButtonDisabled = await restoreButton.isDisabled().catch(() => false);
    const downloadButton = row.getByRole("button", { name: "Download backup" });
    receipt.downloadButtonVisible = await visible(downloadButton);
    const downloadResponsePromise = page
      .waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname ===
            cfg.adminPath + "/api/backups/" + receipt.createdBackupId + "/download",
        { timeout: 120000 }
      )
      .catch(() => null);
    await downloadButton.click();
    const downloadResponse = await downloadResponsePromise;
    if (downloadResponse !== null) {
      receipt.downloadResponseStatus = downloadResponse.status();
      const payload = await downloadResponse.json().catch(() => null);
      if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
        if (typeof payload.fileName === "string") receipt.downloadFileName = payload.fileName;
        if (typeof payload.encoding === "string") receipt.downloadEncoding = payload.encoding;
        if (typeof payload.content === "string") {
          receipt.downloadContentBytes = payload.content.length;
          try {
            receipt.downloadDecodedBytes = atob(payload.content).length;
          } catch (error) {}
        }
      }
    }
    receipt.downloadToastVisible = await waitVisible(
      page.getByText("Backup downloaded.", { exact: true }),
      10000
    );
  }
  return await finalize(receipt);
`;

const IMPORT_DIALOG_BODY = `
  const receipt = receiptBase();
  await boot("/backups");
  const scheduleCard = card();
  await waitVisible(scheduleCard, 120000);
  await button("Import").click();
  receipt.importDialogVisible = await waitVisible(page.getByText("Import Backup", { exact: true }), 15000);
  receipt.importDialogWidth = await boxWidth(dialogContent("Import Backup"));
  const importButton = button("Import Backup");
  receipt.importSubmitDisabled = await importButton.isDisabled().catch(() => false);
  receipt.importWarningVisible = await visible(
    page.getByText(/Import replaces the selected content and settings/)
  );
  receipt.importUsersCheckboxVisible = await visible(
    page
      .locator("label")
      .filter({ hasText: "Restore users" })
      .locator('[data-slot="checkbox"]')
      .first()
  );
  return await finalize(receipt);
`;

const UPDATE_SCHEDULE_BODY = `
  const receipt = receiptBase();
  await boot("/backups");
  const scheduleCard = card();
  await waitVisible(scheduleCard, 120000);
  const weekly = scheduleCard.getByRole("button", { name: "Weekly" });
  await weekly.click();
  const patchResponsePromise = page
    .waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname === cfg.adminPath + "/api/backups/schedule",
      { timeout: 60000 }
    )
    .catch(() => null);
  await scheduleCard.getByRole("button", { name: "Update Schedule" }).click();
  const patchResponse = await patchResponsePromise;
  if (patchResponse !== null) {
    receipt.patchResponseStatus = patchResponse.status();
    const body = await patchResponse.json().catch(() => null);
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      if (typeof body.frequency === "string") receipt.patchResponseFrequency = body.frequency;
    }
  }
  receipt.weeklyButtonActive = await scheduleCard
    .getByRole("button", { name: "Weekly" })
    .evaluate((element) => element.classList.contains("bg-card"))
    .catch(() => false);
  receipt.updateToastVisible = await waitVisible(
    page.getByText("Backup schedule updated.", { exact: true }),
    10000
  );
  await page
    .waitForFunction(() => {
      const badge = document.querySelector('[data-slot="badge"]');
      return (
        badge !== null &&
        badge.textContent !== null &&
        badge.textContent.indexOf("Loading schedule") === -1
      );
    }, { timeout: 60000 })
    .catch(() => undefined);
  const badge = page.locator('[data-slot="badge"]').filter({ hasText: "Auto-backup" }).first();
  receipt.scheduleBadgeText = (await badge.textContent().catch(() => null)) ?? "";
  return await finalize(receipt);
`;

const TASK511_BODIES: Readonly<Record<Task511ScenarioId, string>> = Object.freeze({
  login: LOGIN_BODY,
  "backups-schedule-card": SCHEDULE_CARD_BODY,
  "create-encrypted-backup": CREATE_BACKUP_BODY,
  "import-restore-dialog": IMPORT_DIALOG_BODY,
  "update-schedule": UPDATE_SCHEDULE_BODY,
});

export function materializeTask511BrowserAction(input: {
  readonly descriptor: Task511ScenarioDescriptor;
  readonly variant: Task511Variant;
  readonly config: Task511SessionConfig;
  readonly screenshotPath: string | null;
}): string {
  const config = Object.freeze({
    scenarioId: input.descriptor.id,
    variantId: input.variant.id,
    colorScheme: input.variant.colorScheme,
    adminOrigin: input.config.adminOrigin,
    adminPath: input.config.adminPath,
    email: input.config.email,
    password: input.config.password,
    passphrase: input.config.passphrase,
    screenshotPath: input.screenshotPath,
  });
  const body = TASK511_BODIES[input.descriptor.id];
  if (body === undefined) failure("task-511 browser scenario is not registered");
  return COMMON_PRELUDE.replace("$CONFIG", JSON.stringify(config)).replace("$BODY", body);
}
