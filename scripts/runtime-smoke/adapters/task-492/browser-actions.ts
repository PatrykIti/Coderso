import { SmokeError } from "../../contracts";

export const TASK492_SCENARIO_IDS = Object.freeze([
  "admin-login",
  "login-alerts-controls",
  "webhook-enable-fields",
  "edit-save",
  "dark-parity",
] as const);

export type Task492ScenarioId = (typeof TASK492_SCENARIO_IDS)[number];
export type Task492VariantId = "light-1440x900" | "dark-1440x900";

export interface Task492Variant {
  readonly id: Task492VariantId;
  readonly colorScheme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: 1440; readonly height: 900 }>;
}

export interface Task492ScenarioDescriptor {
  readonly id: Task492ScenarioId;
  readonly title: string;
  readonly variantId: Task492VariantId;
}

export const TASK492_VARIANTS = Object.freeze([
  Object.freeze({
    id: "light-1440x900",
    colorScheme: "light",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "dark-1440x900",
    colorScheme: "dark",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
] as const satisfies readonly Task492Variant[]);

export const TASK492_SCENARIOS: readonly Task492ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    id: "admin-login",
    title: "Admin signs in and reaches the authenticated shell",
    variantId: "light-1440x900",
  }),
  Object.freeze({
    id: "login-alerts-controls",
    title: "Login Alerts settings controls render with their visible state",
    variantId: "light-1440x900",
  }),
  Object.freeze({
    id: "webhook-enable-fields",
    title: "Webhook channel toggle reveals URL and secret fields",
    variantId: "light-1440x900",
  }),
  Object.freeze({
    id: "edit-save",
    title: "Save persists webhook settings; only { configured } is exposed",
    variantId: "light-1440x900",
  }),
  Object.freeze({
    id: "dark-parity",
    title: "Login Alerts settings render in dark mode with visible effect",
    variantId: "dark-1440x900",
  }),
]);

export interface Task492BrowserConfig {
  readonly scenarioId: Task492ScenarioId;
  readonly variant: Task492Variant;
  readonly adminPath: string;
  readonly origin: string;
  readonly email: string;
  readonly password: string;
  readonly webhookUrl: string;
  readonly webhookSecret: string;
  readonly screenshotPath: string;
}

export interface Task492BrowserReceipt {
  readonly scenarioId: string;
  readonly variantId: string;
  readonly colorScheme: string;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  // admin-login
  readonly loginFormVisible?: boolean;
  readonly loginFormBoxWidth?: number;
  readonly loginFormBoxHeight?: number;
  readonly authenticatedShellVisible?: boolean;
  readonly postLoginPath?: string;
  // login-alerts-controls
  readonly headingVisible?: boolean;
  readonly headingBoxWidth?: number;
  readonly headingBoxHeight?: number;
  readonly recipientsVisible?: boolean;
  readonly recipientsEnabled?: boolean;
  readonly emailChannelChecked?: boolean;
  readonly webhookChannelChecked?: boolean;
  readonly webhookFieldsAbsent?: boolean;
  // webhook-enable-fields
  readonly webhookSwitchChecked?: boolean;
  readonly webhookUrlVisible?: boolean;
  readonly webhookSecretVisible?: boolean;
  readonly webhookUrlValueMatches?: boolean;
  readonly webhookSecretValueMatches?: boolean;
  readonly webhookSwitchBoxWidth?: number;
  readonly webhookSwitchBoxHeight?: number;
  readonly webhookUrlBoxWidth?: number;
  readonly webhookUrlBoxHeight?: number;
  // edit-save
  readonly savePatchCount?: number;
  readonly patchResponseStatus?: number;
  readonly patchPathMatches?: boolean;
  readonly configuredOnlyInResponse?: boolean;
  readonly secretAbsentFromResponse?: boolean;
  readonly webhookUrlInResponse?: boolean;
  readonly successAlertVisible?: boolean;
  readonly configuredLabelVisible?: boolean;
  readonly secretAbsentFromDom?: boolean;
  readonly urlValuePersisted?: boolean;
  readonly secretInputEmptyAfterReload?: boolean;
  readonly configuredAfterReload?: boolean;
  readonly saveButtonWidth?: number;
  readonly saveButtonHeight?: number;
  readonly successAlertWidth?: number;
  readonly successAlertHeight?: number;
  // dark-parity
  readonly darkMediaMatches?: boolean;
  readonly darkBackgroundDiffers?: boolean;
  readonly headingColorLight?: string;
  readonly headingColorDark?: string;
  readonly configuredInDark?: boolean;
  readonly headingVisibleInDark?: boolean;
}

const SCENARIO_COMMON_KEYS = [
  "scenarioId",
  "variantId",
  "colorScheme",
  "consoleErrors",
  "pageErrors",
];
const SCENARIO_KEY_SETS: Readonly<Record<Task492ScenarioId, readonly string[]>> = Object.freeze({
  "admin-login": Object.freeze([
    ...SCENARIO_COMMON_KEYS,
    "loginFormVisible",
    "loginFormBoxWidth",
    "loginFormBoxHeight",
    "authenticatedShellVisible",
    "postLoginPath",
  ]),
  "login-alerts-controls": Object.freeze([
    ...SCENARIO_COMMON_KEYS,
    "headingVisible",
    "headingBoxWidth",
    "headingBoxHeight",
    "recipientsVisible",
    "recipientsEnabled",
    "emailChannelChecked",
    "webhookChannelChecked",
    "webhookFieldsAbsent",
  ]),
  "webhook-enable-fields": Object.freeze([
    ...SCENARIO_COMMON_KEYS,
    "webhookSwitchChecked",
    "webhookUrlVisible",
    "webhookSecretVisible",
    "webhookUrlValueMatches",
    "webhookSecretValueMatches",
    "webhookSwitchBoxWidth",
    "webhookSwitchBoxHeight",
    "webhookUrlBoxWidth",
    "webhookUrlBoxHeight",
  ]),
  "edit-save": Object.freeze([
    ...SCENARIO_COMMON_KEYS,
    "savePatchCount",
    "patchResponseStatus",
    "patchPathMatches",
    "configuredOnlyInResponse",
    "secretAbsentFromResponse",
    "webhookUrlInResponse",
    "successAlertVisible",
    "configuredLabelVisible",
    "secretAbsentFromDom",
    "urlValuePersisted",
    "secretInputEmptyAfterReload",
    "configuredAfterReload",
    "saveButtonWidth",
    "saveButtonHeight",
    "successAlertWidth",
    "successAlertHeight",
  ]),
  "dark-parity": Object.freeze([
    ...SCENARIO_COMMON_KEYS,
    "darkMediaMatches",
    "darkBackgroundDiffers",
    "headingColorLight",
    "headingColorDark",
    "configuredInDark",
    "headingVisibleInDark",
    "headingBoxWidth",
    "headingBoxHeight",
  ]),
});

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

function sameKeys(value: unknown, expected: readonly string[]): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function scenarioDescriptor(id: string): Task492ScenarioDescriptor {
  const descriptor = TASK492_SCENARIOS.find(({ id: scenarioId }) => scenarioId === id);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 scenario descriptor is absent");
  }
  return descriptor;
}

export function task492VariantFor(scenarioId: Task492ScenarioId): Task492Variant {
  const descriptor = scenarioDescriptor(scenarioId);
  const variant = TASK492_VARIANTS.find(({ id }) => id === descriptor.variantId);
  if (variant === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 scenario variant is absent");
  }
  return variant;
}

export function materializeTask492BrowserAction(input: Task492BrowserConfig): string {
  const variant = task492VariantFor(input.scenarioId);
  if (
    input.variant.id !== variant.id ||
    input.variant.colorScheme !== variant.colorScheme ||
    input.variant.viewport.width !== variant.viewport.width ||
    input.variant.viewport.height !== variant.viewport.height ||
    !/^\/[A-Za-z0-9._/-]+$/u.test(input.adminPath) ||
    !input.screenshotPath.endsWith(".png") ||
    input.screenshotPath.includes("..")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 browser action materialization drifted");
  }
  const config = encoded({
    scenarioId: input.scenarioId,
    variant: input.variant,
    adminPath: input.adminPath,
    origin: input.origin,
    email: input.email,
    password: input.password,
    webhookUrl: input.webhookUrl,
    webhookSecret: input.webhookSecret,
    screenshotPath: input.screenshotPath,
  });
  const commonPrelude = `
    const cfg = ${config};
    const consoleErrors = [];
    const pageErrors = [];
    const count = (value) => Math.min(value + 1, 2);
    const pathnameOf = (rawUrl) => {
      const value = String(rawUrl);
      const withoutFragment = value.split("#")[0];
      const withoutQuery = withoutFragment.split("?")[0];
      const schemeSeparator = withoutQuery.indexOf("://");
      if (schemeSeparator === -1) {
        return withoutQuery.startsWith("/") ? withoutQuery : "/" + withoutQuery;
      }
      const afterScheme = withoutQuery.slice(schemeSeparator + 3);
      const slashIndex = afterScheme.indexOf("/");
      return slashIndex === -1 ? "/" : afterScheme.slice(slashIndex);
    };
    const boxSize = async (locator) => {
      const box = await locator.boundingBox();
      return box === null ? [0, 0] : [Math.round(box.width), Math.round(box.height)];
    };
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      // Dev-host resource noise: a missing favicon or a transient 429 from a
      // shared rate-limit bucket logs "Failed to load resource" without any
      // URL in the message text, so it cannot be path-filtered. 404/429
      // resource-load errors are tolerated exactly like the reference
      // adapters; every other console error is real and fails the suite.
      if (/Failed to load resource: the server responded with a status of (404|429)/.test(text)) return;
      // The shared page session boots the Admin app once per scenario and
      // every boot calls the auth bootstrap endpoints. After login the shell
      // re-resolves /api/auth/me while the session cookie is being applied,
      // so a single 401 from that endpoint is expected and the app converges.
      // Every other console error is real and fails the suite.
      if (/Failed to load resource: the server responded with a status of 401/.test(text)) {
        const loc = message.location?.().url ?? "";
        if (loc === "" || loc.endsWith("/api/auth/me")) return;
      }
      consoleErrors.push(text);
    };
    const onPageError = (error) => pageErrors.push(String(error?.message ?? "pageerror").slice(0, 512));
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
  `;
  const commonEpilogue = `
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  `;
  const scenarioSource = task492ScenarioSource(input.scenarioId);
  return `async (page) => {${commonPrelude}
    try {
${scenarioSource}
    } finally {
${commonEpilogue}
    }
  }`;
}

function task492ScenarioSource(scenarioId: Task492ScenarioId): string {
  switch (scenarioId) {
    case "admin-login":
      return `      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      const loginUrl = cfg.origin + cfg.adminPath + "/login";
      await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 180000 });
      const emailInput = page.locator('input[type="email"]');
      await emailInput.waitFor({ state: "visible", timeout: 120000 });
      const [loginFormWidth, loginFormHeight] = await boxSize(emailInput);
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.waitFor({ state: "visible", timeout: 60000 });
      await emailInput.fill(cfg.email);
      await passwordInput.fill(cfg.password);
      const signIn = page.getByRole("button", { name: "Sign in", exact: true });
      await signIn.waitFor({ state: "visible", timeout: 60000 });
      await signIn.click();
      await page.waitForFunction((expected) => {
        const current = window.location.pathname;
        return !current.endsWith("/login") && current.startsWith(expected);
      }, cfg.adminPath, { timeout: 120000 }).catch((error) => {
        throw new Error("task492_login_redirect_timeout", { cause: error });
      });
      const shellLink = page.getByRole("link", { name: "Settings", exact: true });
      await shellLink.waitFor({ state: "visible", timeout: 90000 });
      const loginFormVisible = (await emailInput.count()) > 0;
      const authenticatedShellVisible = await shellLink.isVisible();
      const postLoginPath = await page.evaluate(() => window.location.pathname);
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      return {
        scenarioId: cfg.scenarioId,
        variantId: cfg.variant.id,
        colorScheme: cfg.variant.colorScheme,
        consoleErrors,
        pageErrors,
        loginFormVisible,
        loginFormBoxWidth: loginFormWidth,
        loginFormBoxHeight: loginFormHeight,
        authenticatedShellVisible,
        postLoginPath,
      };`;
    case "login-alerts-controls":
      return `      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      const settingsUrl = cfg.origin + cfg.adminPath + "/settings/security/login-alerts";
      await page.goto(settingsUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
      const heading = page.getByRole("heading", { name: "Login Alerts", exact: true });
      await heading.waitFor({ state: "visible", timeout: 90000 });
      const emailSwitch = page.getByRole("switch", { name: "Email login alerts channel", exact: true });
      await emailSwitch.waitFor({ state: "visible", timeout: 60000 });
      await page.waitForFunction(() => {
        const switches = Array.from(document.querySelectorAll('[role="switch"]'));
        return switches.some((node) => !node.disabled);
      }, { timeout: 60000 }).catch((error) => {
        throw new Error("task492_settings_hydration_timeout", { cause: error });
      });
      const [headingWidth, headingHeight] = await boxSize(heading);
      const recipients = page.getByLabel("Custom email list recipients");
      const recipientsVisible = await recipients.isVisible();
      const recipientsEnabled = !(await recipients.isDisabled());
      const emailChannelChecked = (await emailSwitch.getAttribute("aria-checked")) === "true";
      const webhookSwitch = page.getByRole("switch", { name: "Webhook login alerts channel", exact: true });
      const webhookChannelChecked = (await webhookSwitch.getAttribute("aria-checked")) === "true";
      const webhookFieldsAbsent =
        (await page.getByLabel("Webhook URL").count()) === 0 &&
        (await page.getByLabel("Webhook secret").count()) === 0;
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      return {
        scenarioId: cfg.scenarioId,
        variantId: cfg.variant.id,
        colorScheme: cfg.variant.colorScheme,
        consoleErrors,
        pageErrors,
        headingVisible: await heading.isVisible(),
        headingBoxWidth: headingWidth,
        headingBoxHeight: headingHeight,
        recipientsVisible,
        recipientsEnabled,
        emailChannelChecked,
        webhookChannelChecked,
        webhookFieldsAbsent,
      };`;
    case "webhook-enable-fields":
      return `      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      const webhookSwitch = page.getByRole("switch", { name: "Webhook login alerts channel", exact: true });
      await webhookSwitch.waitFor({ state: "visible", timeout: 60000 });
      await webhookSwitch.click();
      const urlInput = page.getByLabel("Webhook URL");
      await urlInput.waitFor({ state: "visible", timeout: 30000 });
      const secretInput = page.getByLabel("Webhook secret");
      await secretInput.waitFor({ state: "visible", timeout: 30000 });
      await urlInput.fill(cfg.webhookUrl);
      await secretInput.fill(cfg.webhookSecret);
      const webhookUrlValueMatches = (await urlInput.inputValue()) === cfg.webhookUrl;
      const webhookSecretValueMatches = (await secretInput.inputValue()) === cfg.webhookSecret;
      const [switchWidth, switchHeight] = await boxSize(webhookSwitch);
      const [urlWidth, urlHeight] = await boxSize(urlInput);
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      return {
        scenarioId: cfg.scenarioId,
        variantId: cfg.variant.id,
        colorScheme: cfg.variant.colorScheme,
        consoleErrors,
        pageErrors,
        webhookSwitchChecked: (await webhookSwitch.getAttribute("aria-checked")) === "true",
        webhookUrlVisible: await urlInput.isVisible(),
        webhookSecretVisible: await secretInput.isVisible(),
        webhookUrlValueMatches,
        webhookSecretValueMatches,
        webhookSwitchBoxWidth: switchWidth,
        webhookSwitchBoxHeight: switchHeight,
        webhookUrlBoxWidth: urlWidth,
        webhookUrlBoxHeight: urlHeight,
      };`;
    case "edit-save":
      return `      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      const apiPath = cfg.adminPath + "/api/settings/security";
      let savePatchCount = 0;
      let patchPathMatches = false;
      const onPatchRequest = (request) => {
        if (request.method() !== "PATCH") return;
        if (pathnameOf(request.url()) !== apiPath) return;
        savePatchCount = count(savePatchCount);
        patchPathMatches = true;
      };
      page.on("request", onPatchRequest);
      try {
        const save = page.getByRole("button", { name: "Save changes", exact: true });
        await save.waitFor({ state: "visible", timeout: 60000 });
        const [saveWidth, saveHeight] = await boxSize(save);
        const responsePromise = page.waitForResponse((response) => {
          const request = response.request();
          return request.method() === "PATCH" && pathnameOf(response.url()) === apiPath;
        }, { timeout: 60000 });
        await save.click();
        let response;
        try {
          response = await responsePromise;
        } catch (error) {
          const diag = await page.evaluate(() => ({
            url: window.location.pathname,
            bodyHasSave: Array.from(document.querySelectorAll("button")).some(
              (node) => node.textContent?.trim() === "Save changes"
            ),
          }));
          throw new Error(
            "task492_save_response_timeout url=" + diag.url + " bodyHasSave=" + String(diag.bodyHasSave),
            { cause: error }
          );
        }
        const patchResponseStatus = response.status();
        const responseText = (await response.text()).slice(0, 262144);
        let responseJson = null;
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          responseJson = null;
        }
        const webhookSecretField = responseJson?.loginAlerts?.webhookSecret;
        const configuredOnlyInResponse =
          webhookSecretField !== null &&
          typeof webhookSecretField === "object" &&
          !Array.isArray(webhookSecretField) &&
          Object.keys(webhookSecretField).length === 1 &&
          webhookSecretField.configured === true;
        const secretAbsentFromResponse = !responseText.includes(cfg.webhookSecret);
        const webhookUrlInResponse = responseJson?.loginAlerts?.webhookUrl === cfg.webhookUrl;
        const successAlert = page.getByText("Login alert settings updated.", { exact: true });
        await successAlert.waitFor({ state: "visible", timeout: 30000 });
        const [alertWidth, alertHeight] = await boxSize(successAlert);
        // The toast auto-dismisses and a reload clears it, so capture the
        // visible state while the alert is still on screen.
        const successAlertVisible = await successAlert.isVisible();
        const configuredLabel = page.getByText("Configured", { exact: true });
        const configuredLabelVisible =
          (await configuredLabel.count()) > 0 && (await configuredLabel.first().isVisible());
        const bodyText = (await page.locator("body").innerText()).slice(0, 262144);
        const secretAbsentFromDom = !bodyText.includes(cfg.webhookSecret);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
        const urlInput = page.getByLabel("Webhook URL");
        await urlInput.waitFor({ state: "visible", timeout: 90000 });
        const urlValuePersisted = (await urlInput.inputValue()) === cfg.webhookUrl;
        const secretInput = page.getByLabel("Webhook secret");
        const secretInputEmptyAfterReload = (await secretInput.inputValue()) === "";
        const configuredAfterReload =
          (await page.getByText("Configured", { exact: true }).count()) > 0;
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        return {
          scenarioId: cfg.scenarioId,
          variantId: cfg.variant.id,
          colorScheme: cfg.variant.colorScheme,
          consoleErrors,
          pageErrors,
          savePatchCount,
          patchResponseStatus,
          patchPathMatches,
          configuredOnlyInResponse,
          secretAbsentFromResponse,
          webhookUrlInResponse,
          successAlertVisible,
          configuredLabelVisible,
          secretAbsentFromDom,
          urlValuePersisted,
          secretInputEmptyAfterReload,
          configuredAfterReload,
          saveButtonWidth: saveWidth,
          saveButtonHeight: saveHeight,
          successAlertWidth: alertWidth,
          successAlertHeight: alertHeight,
        };
      } finally {
        page.off("request", onPatchRequest);
      }`;
    case "dark-parity":
      return `      await page.emulateMedia({ colorScheme: "dark" });
      await page.setViewportSize(cfg.variant.viewport);
      const heading = page.getByRole("heading", { name: "Login Alerts", exact: true });
      await heading.waitFor({ state: "visible", timeout: 90000 });
      const urlInput = page.getByLabel("Webhook URL");
      await urlInput.waitFor({ state: "visible", timeout: 90000 });
      // The admin chrome's dark mode is class-based (<html class="dark">
      // driven by the AdminColorModeToggle), not media-query based, so the
      // parity proof flips the real toggle instead of emulating the media.
      const toggle = page.getByRole("button", { name: "Toggle dark mode", exact: true });
      await toggle.waitFor({ state: "visible", timeout: 60000 });
      const initialDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );
      if (initialDark) {
        await toggle.click();
        await page.waitForFunction(
          () => !document.documentElement.classList.contains("dark"),
          undefined,
          { timeout: 30000 }
        );
      }
      const headingColorLight = await page.evaluate(() => {
        const node = document.querySelector("h1");
        return node === null ? "" : getComputedStyle(node).color;
      });
      await toggle.click();
      await page.waitForFunction(
        () => document.documentElement.classList.contains("dark"),
        undefined,
        { timeout: 30000 }
      );
      const darkMediaMatches = await page.evaluate(() =>
        matchMedia("(prefers-color-scheme: dark)").matches
      );
      const headingColorDark = await page.evaluate(() => {
        const node = document.querySelector("h1");
        return node === null ? "" : getComputedStyle(node).color;
      });
      const darkBackgroundDiffers =
        headingColorLight.length > 0 &&
        headingColorDark.length > 0 &&
        headingColorLight !== headingColorDark;
      const configuredInDark = (await page.getByText("Configured", { exact: true }).count()) > 0;
      const [headingWidth, headingHeight] = await boxSize(heading);
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      const headingVisibleInDark = await heading.isVisible();
      // Restore the initial mode so the shared page session stays neutral.
      if (
        initialDark !==
        (await page.evaluate(() => document.documentElement.classList.contains("dark")))
      ) {
        await toggle.click();
        await page.waitForFunction(
          (initial) => document.documentElement.classList.contains("dark") === initial,
          initialDark,
          { timeout: 30000 }
        );
      }
      return {
        scenarioId: cfg.scenarioId,
        variantId: cfg.variant.id,
        colorScheme: cfg.variant.colorScheme,
        consoleErrors,
        pageErrors,
        darkMediaMatches,
        darkBackgroundDiffers,
        headingColorLight,
        headingColorDark,
        configuredInDark,
        headingVisibleInDark,
        headingBoxWidth: headingWidth,
        headingBoxHeight: headingHeight,
      };`;
    default:
      throw new SmokeError("smoke_output_invalid", "TASK-492 scenario source is absent");
  }
}

function positiveBox(width: number, height: number): boolean {
  return width > 0 && height > 0;
}

export function assertTask492BrowserReceipt(
  value: unknown,
  scenarioId: Task492ScenarioId,
  input: Task492BrowserConfig
): asserts value is Task492BrowserReceipt {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !sameKeys(value, SCENARIO_KEY_SETS[scenarioId])
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 browser receipt keys are invalid");
  }
  const receipt = value as Task492BrowserReceipt;
  if (
    receipt.scenarioId !== scenarioId ||
    receipt.variantId !== task492VariantFor(scenarioId).id ||
    receipt.colorScheme !== task492VariantFor(scenarioId).colorScheme ||
    !Array.isArray(receipt.consoleErrors) ||
    !Array.isArray(receipt.pageErrors) ||
    receipt.consoleErrors.length !== 0 ||
    receipt.pageErrors.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-492 browser receipt envelope is invalid");
  }
  switch (scenarioId) {
    case "admin-login":
      if (
        receipt.loginFormVisible !== false ||
        !positiveBox(receipt.loginFormBoxWidth ?? 0, receipt.loginFormBoxHeight ?? 0) ||
        receipt.authenticatedShellVisible !== true ||
        typeof receipt.postLoginPath !== "string" ||
        !receipt.postLoginPath.startsWith(input.adminPath) ||
        receipt.postLoginPath.endsWith("/login")
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 login receipt is invalid");
      }
      return;
    case "login-alerts-controls":
      if (
        receipt.headingVisible !== true ||
        !positiveBox(receipt.headingBoxWidth ?? 0, receipt.headingBoxHeight ?? 0) ||
        receipt.recipientsVisible !== true ||
        receipt.recipientsEnabled !== true ||
        receipt.emailChannelChecked !== true ||
        receipt.webhookChannelChecked !== false ||
        receipt.webhookFieldsAbsent !== true
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 controls receipt is invalid");
      }
      return;
    case "webhook-enable-fields":
      if (
        receipt.webhookSwitchChecked !== true ||
        receipt.webhookUrlVisible !== true ||
        receipt.webhookSecretVisible !== true ||
        receipt.webhookUrlValueMatches !== true ||
        receipt.webhookSecretValueMatches !== true ||
        !positiveBox(receipt.webhookSwitchBoxWidth ?? 0, receipt.webhookSwitchBoxHeight ?? 0) ||
        !positiveBox(receipt.webhookUrlBoxWidth ?? 0, receipt.webhookUrlBoxHeight ?? 0)
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 webhook fields receipt is invalid");
      }
      return;
    case "edit-save":
      if (
        receipt.savePatchCount !== 1 ||
        receipt.patchResponseStatus !== 200 ||
        receipt.patchPathMatches !== true ||
        receipt.configuredOnlyInResponse !== true ||
        receipt.secretAbsentFromResponse !== true ||
        receipt.webhookUrlInResponse !== true ||
        receipt.successAlertVisible !== true ||
        receipt.configuredLabelVisible !== true ||
        receipt.secretAbsentFromDom !== true ||
        receipt.urlValuePersisted !== true ||
        receipt.secretInputEmptyAfterReload !== true ||
        receipt.configuredAfterReload !== true ||
        !positiveBox(receipt.saveButtonWidth ?? 0, receipt.saveButtonHeight ?? 0) ||
        !positiveBox(receipt.successAlertWidth ?? 0, receipt.successAlertHeight ?? 0)
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 save receipt is invalid");
      }
      return;
    case "dark-parity":
      if (
        receipt.darkMediaMatches !== true ||
        receipt.darkBackgroundDiffers !== true ||
        typeof receipt.headingColorLight !== "string" ||
        receipt.headingColorLight.length === 0 ||
        typeof receipt.headingColorDark !== "string" ||
        receipt.headingColorDark.length === 0 ||
        receipt.configuredInDark !== true ||
        receipt.headingVisibleInDark !== true ||
        !positiveBox(receipt.headingBoxWidth ?? 0, receipt.headingBoxHeight ?? 0)
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 dark parity receipt is invalid");
      }
      return;
    default:
      throw new SmokeError("smoke_output_invalid", "TASK-492 receipt scenario is unknown");
  }
}
