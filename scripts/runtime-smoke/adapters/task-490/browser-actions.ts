// TASK-490 browser actions: five real-flow scenarios over the forms submissions
// export surface (login, Forms -> Submissions navigation, CSV export, JSON
// export, dark-mode parity) with strict visible-effect receipts. The exported
// file content is captured from the export network response (the UI builds the
// Blob download from it), and the blob download event itself is witnessed via
// `page.waitForEvent("download")` + `suggestedFilename()`.

import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";

export const TASK490_SCENARIO_IDS = Object.freeze([
  "admin-login",
  "forms-submissions-nav",
  "export-csv",
  "export-json",
  "dark-parity",
] as const);

export type Task490ScenarioId = (typeof TASK490_SCENARIO_IDS)[number];
export type Task490ScenarioKind = "login" | "nav" | "csv" | "json" | "dark";
export type Task490VariantId = "light-1440x900" | "dark-390x844";

export interface Task490Variant {
  readonly id: Task490VariantId;
  readonly colorScheme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: 1440 | 390; readonly height: 900 | 844 }>;
}

export interface Task490ScenarioExpected {
  readonly formRowName: string;
  readonly statTotal: string;
  readonly payloadValues: readonly string[];
  readonly statusBadge: string;
  readonly csvHeader: string;
  readonly rawMessage: string;
  readonly guardedMessage: string;
  readonly fullName: string;
  readonly email: string;
  readonly exportContentType: string;
  readonly exportFileExtension: ".csv" | ".json";
  readonly piiOmittedValues: readonly string[];
  readonly piiOmittedKeys: readonly string[];
}

export interface Task490ScenarioDescriptor {
  readonly id: Task490ScenarioId;
  readonly kind: Task490ScenarioKind;
  readonly expected: Task490ScenarioExpected;
  readonly canonicalVariant: Task490VariantId;
}

export interface Task490FixtureSpec {
  readonly scenarioId: Task490ScenarioId;
  readonly variantId: Task490VariantId;
}

export interface Task490BrowserFixture extends PlainJsonObject {
  readonly scenarioId: Task490ScenarioId;
  readonly variantId: Task490VariantId;
  readonly formId: string;
  readonly submissionId: string;
  readonly adminPath: string;
  readonly runMarker: string;
}

export const TASK490_VARIANTS: readonly Task490Variant[] = Object.freeze([
  Object.freeze({
    id: "light-1440x900",
    colorScheme: "light",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "dark-390x844",
    colorScheme: "dark",
    viewport: Object.freeze({ width: 390, height: 844 }),
  }),
]);

const SHARED_EXPECTED: Task490ScenarioExpected = Object.freeze({
  formRowName: "TASK-490 Smoke Form",
  statTotal: "1",
  payloadValues: Object.freeze([
    "TASK-490 Smoke Tester",
    "smoke490@example.test",
    "=TASK-490 export receipt marker",
  ]),
  statusBadge: "new",
  csvHeader: "Submission ID,Received At,Status,Full name,Email,Message",
  rawMessage: "=TASK-490 export receipt marker",
  guardedMessage: "'=TASK-490 export receipt marker",
  fullName: "TASK-490 Smoke Tester",
  email: "smoke490@example.test",
  exportContentType: "text/csv",
  exportFileExtension: ".csv",
  // The export contract deliberately omits the only PII-ish columns on the
  // form_submissions row; the seeded row carries them so the suite can prove
  // both downloads never leak them.
  piiOmittedValues: Object.freeze(["203.0.113.10", "task490-smoke-agent/1.0"]),
  piiOmittedKeys: Object.freeze(["ip", "userAgent"]),
});

const JSON_EXPECTED: Task490ScenarioExpected = Object.freeze({
  ...SHARED_EXPECTED,
  exportContentType: "application/json",
  exportFileExtension: ".json",
});

export const TASK490_SCENARIOS: readonly Task490ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    id: "admin-login",
    kind: "login",
    expected: SHARED_EXPECTED,
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "forms-submissions-nav",
    kind: "nav",
    expected: SHARED_EXPECTED,
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "export-csv",
    kind: "csv",
    expected: SHARED_EXPECTED,
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "export-json",
    kind: "json",
    expected: JSON_EXPECTED,
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "dark-parity",
    kind: "dark",
    expected: SHARED_EXPECTED,
    canonicalVariant: "dark-390x844",
  }),
]);

const byScenario = new Map(TASK490_SCENARIOS.map((descriptor) => [descriptor.id, descriptor]));

export function task490ScenarioDescriptor(id: string): Task490ScenarioDescriptor {
  const descriptor = byScenario.get(id as Task490ScenarioId);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 scenario is not registered");
  }
  return descriptor;
}

export function task490VariantsFor(
  profile: "fast" | "certification",
  scenarioId: Task490ScenarioId
): readonly Task490Variant[] {
  if (profile === "certification") return TASK490_VARIANTS;
  if (profile !== "fast") {
    throw new SmokeError("smoke_argument_invalid", "TASK-490 profile is unsupported");
  }
  const ordinal = TASK490_SCENARIO_IDS.indexOf(scenarioId);
  if (ordinal < 0)
    throw new SmokeError("smoke_output_invalid", "TASK-490 scenario is not registered");
  return Object.freeze([TASK490_VARIANTS[ordinal % TASK490_VARIANTS.length]!]);
}

export function buildTask490FixtureSpecs(
  profile: "fast" | "certification"
): readonly Task490FixtureSpec[] {
  return Object.freeze(
    TASK490_SCENARIOS.flatMap((descriptor) =>
      task490VariantsFor(profile, descriptor.id).map((variant) =>
        Object.freeze({
          scenarioId: descriptor.id,
          variantId: variant.id,
        })
      )
    )
  );
}

function encoded(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

export function materializeTask490BrowserAction(input: {
  readonly descriptor: Task490ScenarioDescriptor;
  readonly fixture: Task490BrowserFixture;
  readonly variant: Task490Variant;
  readonly screenshotPath: string | null;
}): string {
  if (
    input.fixture.scenarioId !== input.descriptor.id ||
    input.fixture.variantId !== input.variant.id ||
    !/^[0-9a-f-]{36}$/iu.test(input.fixture.formId) ||
    !/^[0-9a-f-]{36}$/iu.test(input.fixture.submissionId) ||
    !/^\/[A-Za-z0-9._~/-]{0,127}$/u.test(input.fixture.adminPath) ||
    !/^[a-f0-9]{12,32}$/u.test(input.fixture.runMarker) ||
    (input.screenshotPath !== null &&
      (!input.screenshotPath.endsWith(".png") || input.screenshotPath.includes("..")))
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 browser action materialization drifted");
  }
  const config = encoded({
    scenarioId: input.descriptor.id,
    kind: input.descriptor.kind,
    formId: input.fixture.formId,
    submissionId: input.fixture.submissionId,
    adminPath: input.fixture.adminPath,
    runMarker: input.fixture.runMarker,
    variant: input.variant,
    expected: input.descriptor.expected,
    screenshotPath: input.screenshotPath,
  });
  return `async (page) => {
    const cfg = ${config};
    const consoleErrors = [];
    const pageErrors = [];
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 512);
      // The shared page session navigates the Admin app once per scenario and
      // every boot calls the auth bootstrap endpoints; the admin auth
      // rate-limit bucket (10 req/60s) can therefore 429 them during the
      // suite. The app converges and the scenario receipts still fail closed.
      if (/Failed to load resource: the server responded with a status of 429/.test(text)) return;
      consoleErrors.push(text);
    };
    const onPageError = (error) => pageErrors.push(String(error?.message ?? "pageerror").slice(0, 512));
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
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
    const readStatTotal = () => page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node !== null) {
        if (node.textContent?.trim() === "Total") {
          const value = node.parentElement?.parentElement?.querySelector('[class*="text-3xl"]')?.textContent?.trim();
          if (value !== undefined && value !== null && value !== "") return value;
        }
        node = walker.nextNode();
      }
      return null;
    });
    const readTableProof = () => page.evaluate((expectedValues, badge, piiValues) => {
      const table = document.querySelector("table");
      const text = table ? table.innerText : "";
      const rows = table ? Array.from(table.querySelectorAll("tbody tr")) : [];
      const firstRow = rows[0]?.innerText ?? "";
      return {
        rowPayloadMatches:
          rows.length === 1 &&
          expectedValues.every((value) => text.includes(value)) &&
          !piiValues.some((value) => text.includes(value)),
        statusBadgeMatches: firstRow.toLowerCase().includes(badge.toLowerCase()),
      };
    }, [...cfg.expected.payloadValues], cfg.expected.statusBadge, [...cfg.expected.piiOmittedValues]);
    const waitSubmissionsVisible = async () => {
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        const table = document.querySelector("table");
        return (
          text.includes("Form submissions") &&
          table !== null &&
          Array.from(table.querySelectorAll("tbody tr")).length === 1
        );
      }, { timeout: 120000 }).catch(async (error) => {
        throw new Error("task490_submissions_visible_timeout: " + String(error?.message ?? error).slice(0, 200));
      });
      // The single seeded row renders after hydration; wait for the payload
      // values so the table proof reads committed DOM.
      await page.waitForFunction((values) => {
        const table = document.querySelector("table");
        const text = table ? table.innerText : "";
        return values.every((value) => text.includes(value));
      }, [...cfg.expected.payloadValues], { timeout: 120000 }).catch(async (error) => {
        throw new Error("task490_payload_visible_timeout: " + String(error?.message ?? error).slice(0, 200));
      });
    };
    const runExportCheck = async (format) => {
      const label = format === "csv" ? "Export CSV" : "Export JSON";
      const button = page.getByRole("button", { name: label, exact: true });
      await button.waitFor({ state: "visible", timeout: 120000 });
      await page.waitForFunction((name) => {
        const target = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === name);
        return target !== undefined && !target.disabled;
      }, label, { timeout: 120000 }).catch(async (error) => {
        throw new Error("task490_export_enabled_timeout: " + String(error?.message ?? error).slice(0, 200));
      });
      const exportPath = cfg.adminPath + "/api/forms/" + cfg.formId + "/submissions/export";
      const responsePromise = page.waitForResponse(
        (response) => {
          const request = response.request();
          return (
            request.method() === "GET" &&
            pathnameOf(response.url()) === exportPath &&
            response.url().includes("format=" + format)
          );
        },
        { timeout: 60000 }
      );
      const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
      await button.click();
      const [response, download] = await Promise.all([responsePromise, downloadPromise]);
      const body = await response.json();
      const content = typeof body?.content === "string" ? body.content : "";
      const contentType = typeof body?.contentType === "string" ? body.contentType : "";
      const totalRows = Number.isSafeInteger(body?.totalRows) ? body.totalRows : -1;
      const fileName = typeof body?.fileName === "string" ? body.fileName : "";
      const expectedPrefix = "coderso-form-task490-" + cfg.runMarker + "-form-submissions-";
      const expectedSuffix = /^\\d{4}-\\d{2}-\\d{2}$/;
      const exportFileNameMatches =
        fileName.startsWith(expectedPrefix) &&
        expectedSuffix.test(fileName.slice(expectedPrefix.length, expectedPrefix.length + 10)) &&
        fileName.endsWith(cfg.expected.exportFileExtension) &&
        download.suggestedFilename() === fileName;
      let exportContentMatches = false;
      let exportPiiOmitted = false;
      if (format === "csv") {
        const lines = content.split("\\n");
        const header = lines[0] ?? "";
        const bodyRow = lines[1] ?? "";
        exportContentMatches =
          header === cfg.expected.csvHeader &&
          bodyRow.includes(cfg.expected.guardedMessage) &&
          !bodyRow.includes("," + cfg.expected.rawMessage) &&
          bodyRow.includes(cfg.expected.fullName) &&
          bodyRow.includes(cfg.expected.email) &&
          bodyRow.includes(cfg.formId) === false &&
          bodyRow.includes(cfg.submissionId);
        exportPiiOmitted = !cfg.expected.piiOmittedValues.some((value) => content.includes(value));
      } else {
        let rows = [];
        try {
          const parsed = JSON.parse(content);
          rows = Array.isArray(parsed) ? parsed : [];
        } catch {}
        const row = rows[0] ?? null;
        const data = row !== null && typeof row === "object" ? row.data : null;
        exportContentMatches =
          rows.length === 1 &&
          row !== null &&
          row.id === cfg.submissionId &&
          row.status === cfg.expected.statusBadge &&
          typeof row.createdAt === "string" &&
          !Number.isNaN(Date.parse(row.createdAt)) &&
          data !== null &&
          typeof data === "object" &&
          data.full_name === cfg.expected.fullName &&
          data.email === cfg.expected.email &&
          data.message === cfg.expected.rawMessage;
        exportPiiOmitted =
          !cfg.expected.piiOmittedKeys.some((key) => Object.hasOwn(data ?? {}, key)) &&
          !cfg.expected.piiOmittedValues.some((value) => content.includes(value));
      }
      return {
        responseStatus: response.status(),
        contentType,
        totalRows,
        exportFileNameMatches,
        exportContentMatches,
        exportPiiOmitted,
        downloadEventFired: true,
        downloadFileName: download.suggestedFilename(),
      };
    };
    const darkToggle = () => page.getByRole("button", { name: "Toggle dark mode", exact: true });
    try {
      await page.emulateMedia({ colorScheme: cfg.variant.colorScheme });
      await page.setViewportSize(cfg.variant.viewport);
      if (cfg.kind === "login") {
        await page.goto(cfg.adminPath + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForFunction(() => document.body.innerText.includes("Search or jump to"), { timeout: 120000 }).catch(async (error) => {
          throw new Error("task490_admin_shell_timeout: " + String(error?.message ?? error).slice(0, 200));
        });
        const loginFormAbsent = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const password = inputs.find((input) => input.type === "password");
          return password === undefined && !document.body.innerText.includes("Sign in");
        });
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        return {
          scenarioId: cfg.scenarioId,
          formId: cfg.formId,
          loginFormAbsent,
          submissionsTitleVisible: false,
          formRowFound: false,
          statTotalValue: "",
          rowPayloadMatches: false,
          statusBadgeMatches: false,
          exportResponseStatus: 0,
          exportContentType: "",
          exportTotalRows: 0,
          exportContentMatches: false,
          exportPiiOmitted: false,
          exportFileNameMatches: false,
          downloadEventFired: false,
          downloadFileName: "",
          themeToggledDark: false,
          ariaPressedAfterToggle: false,
          backgroundChanged: false,
          toggleRestored: false,
          colorScheme: await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
          viewportMatches: (await page.evaluate(() => [window.innerWidth, window.innerHeight])).join("x") === cfg.variant.viewport.width + "x" + cfg.variant.viewport.height,
          consoleErrors,
          pageErrors,
        };
      }
      if (cfg.kind === "nav") {
        await page.goto(cfg.adminPath + "/advanced/forms", { waitUntil: "domcontentloaded", timeout: 120000 });
        const row = page.locator("tr").filter({ hasText: cfg.expected.formRowName }).first();
        await row.waitFor({ state: "visible", timeout: 120000 }).catch(async (error) => {
          throw new Error("task490_form_row_timeout: " + String(error?.message ?? error).slice(0, 200));
        });
        const formRowFound = (await row.count()) === 1 && (await row.isVisible());
        const trigger = row.locator("td").last().locator("button").first();
        await trigger.waitFor({ state: "visible", timeout: 60000 }).catch(async (error) => {
          throw new Error("task490_row_actions_timeout: " + String(error?.message ?? error).slice(0, 200));
        });
        await trigger.click();
        const submissionsItem = page.getByRole("menuitem", { name: "Submissions", exact: true });
        await submissionsItem.waitFor({ state: "visible", timeout: 30000 }).catch(async (error) => {
          throw new Error("task490_submissions_menu_timeout: " + String(error?.message ?? error).slice(0, 200));
        });
        await submissionsItem.click();
        await waitSubmissionsVisible();
        const tableProof = await readTableProof();
        const statTotalValue = await readStatTotal();
        const submissionsTitleVisible = await page.evaluate(() => document.body.innerText.includes("Form submissions"));
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        return {
          scenarioId: cfg.scenarioId,
          formId: cfg.formId,
          loginFormAbsent: false,
          submissionsTitleVisible,
          formRowFound,
          statTotalValue: statTotalValue ?? "",
          rowPayloadMatches: tableProof.rowPayloadMatches,
          statusBadgeMatches: tableProof.statusBadgeMatches,
          exportResponseStatus: 0,
          exportContentType: "",
          exportTotalRows: 0,
          exportContentMatches: false,
          exportPiiOmitted: false,
          exportFileNameMatches: false,
          downloadEventFired: false,
          downloadFileName: "",
          themeToggledDark: false,
          ariaPressedAfterToggle: false,
          backgroundChanged: false,
          toggleRestored: false,
          colorScheme: await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
          viewportMatches: (await page.evaluate(() => [window.innerWidth, window.innerHeight])).join("x") === cfg.variant.viewport.width + "x" + cfg.variant.viewport.height,
          consoleErrors,
          pageErrors,
        };
      }
      if (cfg.kind === "csv" || cfg.kind === "json") {
        await page.goto(cfg.adminPath + "/advanced/forms/" + cfg.formId + "/submissions", { waitUntil: "domcontentloaded", timeout: 120000 });
        await waitSubmissionsVisible();
        const tableProof = await readTableProof();
        const statTotalValue = await readStatTotal();
        const submissionsTitleVisible = await page.evaluate(() => document.body.innerText.includes("Form submissions"));
        const exportCheck = await runExportCheck(cfg.kind);
        const exportContentMatches = exportCheck.exportContentMatches;
        const exportPiiOmitted = exportCheck.exportPiiOmitted;
        if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
        return {
          scenarioId: cfg.scenarioId,
          formId: cfg.formId,
          loginFormAbsent: false,
          submissionsTitleVisible,
          formRowFound: false,
          statTotalValue: statTotalValue ?? "",
          rowPayloadMatches: tableProof.rowPayloadMatches,
          statusBadgeMatches: tableProof.statusBadgeMatches,
          exportResponseStatus: exportCheck.responseStatus,
          exportContentType: exportCheck.contentType,
          exportTotalRows: exportCheck.totalRows,
          exportContentMatches,
          exportPiiOmitted,
          exportFileNameMatches: exportCheck.exportFileNameMatches,
          downloadEventFired: exportCheck.downloadEventFired,
          downloadFileName: exportCheck.downloadFileName,
          themeToggledDark: false,
          ariaPressedAfterToggle: false,
          backgroundChanged: false,
          toggleRestored: false,
          colorScheme: await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
          viewportMatches: (await page.evaluate(() => [window.innerWidth, window.innerHeight])).join("x") === cfg.variant.viewport.width + "x" + cfg.variant.viewport.height,
          consoleErrors,
          pageErrors,
        };
      }
      // dark-parity: the only scenario that mutates the actual color mode.
      await page.goto(cfg.adminPath + "/advanced/forms/" + cfg.formId + "/submissions", { waitUntil: "domcontentloaded", timeout: 120000 });
      await waitSubmissionsVisible();
      const tableProof = await readTableProof();
      const statTotalValue = await readStatTotal();
      const submissionsTitleVisible = await page.evaluate(() => document.body.innerText.includes("Form submissions"));
      const toggle = darkToggle();
      await toggle.waitFor({ state: "visible", timeout: 60000 }).catch(async (error) => {
        throw new Error("task490_dark_toggle_timeout: " + String(error?.message ?? error).slice(0, 200));
      });
      const initialDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      await toggle.click();
      await page.waitForFunction((initial) => document.documentElement.classList.contains("dark") === !initial, initialDark, { timeout: 30000 }).catch(async (error) => {
        throw new Error("task490_dark_flip_timeout: " + String(error?.message ?? error).slice(0, 200));
      });
      const themeToggledDark = (await page.evaluate(() => document.documentElement.classList.contains("dark"))) === !initialDark;
      const ariaPressedAfterToggle = (await toggle.getAttribute("aria-pressed")) === String(!initialDark);
      const bgAfterFlip = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const backgroundChanged = bgAfterFlip !== bgBefore;
      // Always end the flip in dark so the screenshot shows the parity state.
      if (!(await page.evaluate(() => document.documentElement.classList.contains("dark")))) {
        await toggle.click();
        await page.waitForFunction(() => document.documentElement.classList.contains("dark"), { timeout: 30000 }).catch(async (error) => {
          throw new Error("task490_dark_screenshot_timeout: " + String(error?.message ?? error).slice(0, 200));
        });
      }
      if (cfg.screenshotPath !== null) await page.screenshot({ path: cfg.screenshotPath, fullPage: false });
      // Restore the initial mode so the shared page session stays neutral.
      if (initialDark !== (await page.evaluate(() => document.documentElement.classList.contains("dark")))) {
        await toggle.click();
      }
      await page.waitForFunction((initial) => document.documentElement.classList.contains("dark") === initial, initialDark, { timeout: 30000 }).catch(async (error) => {
        throw new Error("task490_dark_restore_timeout: " + String(error?.message ?? error).slice(0, 200));
      });
      const toggleRestored = (await page.evaluate(() => document.documentElement.classList.contains("dark"))) === initialDark;
      return {
        scenarioId: cfg.scenarioId,
        formId: cfg.formId,
        loginFormAbsent: false,
        submissionsTitleVisible,
        formRowFound: false,
        statTotalValue: statTotalValue ?? "",
        rowPayloadMatches: tableProof.rowPayloadMatches,
        statusBadgeMatches: tableProof.statusBadgeMatches,
        exportResponseStatus: 0,
        exportContentType: "",
        exportTotalRows: 0,
        exportContentMatches: false,
        exportPiiOmitted: false,
        exportFileNameMatches: false,
        downloadEventFired: false,
        downloadFileName: "",
        themeToggledDark,
        ariaPressedAfterToggle,
        backgroundChanged,
        toggleRestored,
        colorScheme: await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
        viewportMatches: (await page.evaluate(() => [window.innerWidth, window.innerHeight])).join("x") === cfg.variant.viewport.width + "x" + cfg.variant.viewport.height,
        consoleErrors,
        pageErrors,
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
  }`;
}

export interface Task490BrowserReceipt extends PlainJsonObject {
  readonly scenarioId: string;
  readonly formId: string;
  readonly loginFormAbsent: boolean;
  readonly submissionsTitleVisible: boolean;
  readonly formRowFound: boolean;
  readonly statTotalValue: string;
  readonly rowPayloadMatches: boolean;
  readonly statusBadgeMatches: boolean;
  readonly exportResponseStatus: number;
  readonly exportContentType: string;
  readonly exportTotalRows: number;
  readonly exportContentMatches: boolean;
  readonly exportPiiOmitted: boolean;
  readonly exportFileNameMatches: boolean;
  readonly downloadEventFired: boolean;
  readonly downloadFileName: string;
  readonly themeToggledDark: boolean;
  readonly ariaPressedAfterToggle: boolean;
  readonly backgroundChanged: boolean;
  readonly toggleRestored: boolean;
  readonly colorScheme: string;
  readonly viewportMatches: boolean;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

const RECEIPT_KEYS = Object.freeze(
  [
    "ariaPressedAfterToggle",
    "backgroundChanged",
    "colorScheme",
    "consoleErrors",
    "downloadEventFired",
    "downloadFileName",
    "exportContentMatches",
    "exportContentType",
    "exportFileNameMatches",
    "exportPiiOmitted",
    "exportResponseStatus",
    "exportTotalRows",
    "formId",
    "formRowFound",
    "loginFormAbsent",
    "pageErrors",
    "rowPayloadMatches",
    "scenarioId",
    "statTotalValue",
    "statusBadgeMatches",
    "submissionsTitleVisible",
    "themeToggledDark",
    "toggleRestored",
    "viewportMatches",
  ].sort()
);

function receipt(value: unknown): Task490BrowserReceipt {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== RECEIPT_KEYS.join(",")
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 browser receipt shape is invalid");
  }
  return value as Task490BrowserReceipt;
}

export function assertTask490BrowserReceipt(
  value: unknown,
  descriptor: Task490ScenarioDescriptor,
  fixture: Task490BrowserFixture,
  variant: Task490Variant
): asserts value is Task490BrowserReceipt {
  const result = receipt(value);
  const expected = descriptor.expected;
  // A field must be non-neutral ONLY in its owning scenario kinds; everywhere
  // else it must sit at its neutral default (false / 0 / "" / []).
  const ownedBy = (kinds: readonly Task490ScenarioKind[], actual: unknown): boolean => {
    if (kinds.includes(descriptor.kind)) return true;
    if (typeof actual === "boolean") return actual === false;
    if (typeof actual === "number") return actual === 0;
    if (typeof actual === "string") return actual === "";
    if (Array.isArray(actual)) return actual.length === 0;
    return actual === null;
  };
  if (
    result.scenarioId !== descriptor.id ||
    result.formId !== fixture.formId ||
    result.viewportMatches !== true ||
    result.colorScheme !== variant.colorScheme ||
    !Array.isArray(result.consoleErrors) ||
    !Array.isArray(result.pageErrors) ||
    result.consoleErrors.length !== 0 ||
    result.pageErrors.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 browser receipt environment is invalid");
  }
  const checks: ReadonlyArray<readonly [boolean, string]> = [
    [ownedBy(["login"], result.loginFormAbsent), "loginFormAbsent leaked"],
    [ownedBy(["nav", "csv", "json", "dark"], result.formRowFound), "formRowFound leaked"],
    [
      ownedBy(["nav", "csv", "json", "dark"], result.submissionsTitleVisible),
      "submissionsTitleVisible leaked",
    ],
    [ownedBy(["nav", "csv", "json", "dark"], result.statTotalValue), "statTotalValue leaked"],
    [ownedBy(["nav", "csv", "json", "dark"], result.rowPayloadMatches), "rowPayloadMatches leaked"],
    [
      ownedBy(["nav", "csv", "json", "dark"], result.statusBadgeMatches),
      "statusBadgeMatches leaked",
    ],
    [ownedBy(["csv", "json"], result.exportResponseStatus), "exportResponseStatus leaked"],
    [ownedBy(["csv", "json"], result.exportContentType), "exportContentType leaked"],
    [ownedBy(["csv", "json"], result.exportTotalRows), "exportTotalRows leaked"],
    [ownedBy(["csv", "json"], result.exportContentMatches), "exportContentMatches leaked"],
    [ownedBy(["csv", "json"], result.exportPiiOmitted), "exportPiiOmitted leaked"],
    [ownedBy(["csv", "json"], result.exportFileNameMatches), "exportFileNameMatches leaked"],
    [ownedBy(["csv", "json"], result.downloadEventFired), "downloadEventFired leaked"],
    [ownedBy(["csv", "json"], result.downloadFileName), "downloadFileName leaked"],
    [ownedBy(["dark"], result.themeToggledDark), "themeToggledDark leaked"],
    [ownedBy(["dark"], result.ariaPressedAfterToggle), "ariaPressedAfterToggle leaked"],
    [ownedBy(["dark"], result.backgroundChanged), "backgroundChanged leaked"],
    [ownedBy(["dark"], result.toggleRestored), "toggleRestored leaked"],
  ];
  for (const [pass, label] of checks) {
    if (!pass) throw new SmokeError("smoke_output_invalid", `TASK-490 ${label}`);
  }
  if (descriptor.kind === "login") {
    if (result.loginFormAbsent !== true) {
      throw new SmokeError("smoke_output_invalid", "TASK-490 login form remained present");
    }
    return;
  }
  if (
    result.submissionsTitleVisible !== true ||
    result.statTotalValue !== expected.statTotal ||
    result.rowPayloadMatches !== true ||
    result.statusBadgeMatches !== true
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 submissions surface drifted");
  }
  if (descriptor.kind === "nav") {
    if (result.formRowFound !== true) {
      throw new SmokeError("smoke_output_invalid", "TASK-490 form row was not found");
    }
    return;
  }
  if (descriptor.kind === "csv" || descriptor.kind === "json") {
    const format = descriptor.kind;
    if (
      result.exportResponseStatus !== 200 ||
      result.exportContentType !== expected.exportContentType ||
      result.exportTotalRows !== 1 ||
      result.exportContentMatches !== true ||
      result.exportPiiOmitted !== true ||
      result.exportFileNameMatches !== true ||
      result.downloadEventFired !== true ||
      !result.downloadFileName.endsWith(expected.exportFileExtension)
    ) {
      throw new SmokeError("smoke_output_invalid", `TASK-490 ${format} export receipt is invalid`);
    }
    return;
  }
  if (
    result.themeToggledDark !== true ||
    result.ariaPressedAfterToggle !== true ||
    result.backgroundChanged !== true ||
    result.toggleRestored !== true
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 dark parity receipt is invalid");
  }
}
