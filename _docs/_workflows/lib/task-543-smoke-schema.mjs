// TASK-543 smoke-schema (single owner: TASK-545-02-L02). Environment-neutral ESM.


const ROOT = "/home/coder/project/Coderso";

export const SMOKE_KINDS = Object.freeze([
  "clean-close",
  "dirty-delayed-close",
  "pending-revert-restoration",
  "failure-retry",
  "double-close",
  "table-keyboard",
  "mid-viewport-metadata",
]);
export const TRANSIENT_SCREENSHOT_KINDS = Object.freeze([
  "dirty-delayed-close",
  "pending-revert-restoration",
  "failure-retry",
  "double-close",
]);

export const SMOKE_SESSION_PREFIX = "playwright-cli -s=wf543smoke --raw ";
export const RUN_CODE_PAYLOAD_MAX_BYTES = 65_536;
export const RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH = 87_384;
export const RUN_CODE_COMMAND_MAX_BYTES = 10_000;
export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export const SMOKE_SCREENSHOT_ROOT = `${ROOT}/_docs/_workflows/_smoke`;
export const POSTS_LIST_URL = "http://coderso-a.localhost:5173/admin/posts";
export const ADMIN_ORIGIN = "http://coderso-a.localhost:5173";
export const POST_TITLE_SELECTOR = '[data-post-editor-title-input="true"]';
export const POST_CLOSE_SELECTOR = '[data-post-editor-header-close="true"]';
export const SMOKE_PASSWORD_FILL_COMMAND =
  'playwright-cli -s=wf543smoke --raw fill \'input[type="password"]\' "$ADMIN_PASSWORD" >/dev/null';
export const SMOKE_SETUP_STORAGE_KEY = "wf543smoke-setup";
export const FAILURE_BASE_OWNED_PORTS = Object.freeze([3000, 5173]);
export const ADMIN_HEALTH_COMMAND =
  "curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}' " +
  "http://coderso-a.localhost:5173/admin/";
export const FRONT_HEALTH_COMMAND =
  "curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}' " +
  "http://coderso-a.localhost:3000";
export const NONCE_GENERATION_COMMAND =
  'node --eval \'const crypto=require("node:crypto"); ' +
  'process.stdout.write("wf543-"+crypto.randomBytes(16).toString("hex"))\'';
export const RESPONSIVE_WIDTHS = Object.freeze([390, 768, 900, 1024]);
export const RESPONSIVE_HEIGHT = 900;
export const SMOKE_CLI_COMMAND_SCHEMA = {
  type: "string",
  pattern: "^playwright-cli -s=wf543smoke --raw [^\\n]+$",
};
export const SMOKE_RUN_CODE_COMMAND_SCHEMA = {
  type: "string",
  pattern: "^playwright-cli -s=wf543smoke --raw run-code [^\\n]+$",
};
export const RAW_VALUE_SCHEMA = {
  anyOf: [
    { type: "null" },
    { type: "boolean" },
    { type: "number" },
    { type: "string" },
    { type: "array" },
    { type: "object" },
  ],
};
export const STRING_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };
export const POST_PAYLOAD_SCHEMA = { type: "object", minProperties: 1 };
export const SAFE_SENTINEL_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: 120,
  pattern: "^[A-Za-z0-9 _.-]+$",
};
export const THEME_APPLIED_STATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["url", "preference", "resolved"],
  properties: {
    url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
    preference: { enum: ["light", "dark"] },
    resolved: { enum: ["light", "dark"] },
  },
};
export const THEME_RESTORE_STATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["url", "storedPreference", "darkClass", "lightClass"],
  properties: {
    url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
    storedPreference: { anyOf: [{ type: "null" }, { enum: ["light", "dark"] }] },
    darkClass: { type: "boolean" },
    lightClass: { type: "boolean" },
  },
};
export const SETUP_STATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["url", "value"],
  properties: {
    url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
    value: { anyOf: [{ type: "null" }, { type: "string" }] },
  },
};
export const SMOKE_LOG_OBSERVATION_START =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => { " +
  "const previous = page.__wf543LogListeners; if (previous) { " +
  'page.off("console", previous.console); page.off("pageerror", previous.pageerror); } ' +
  "page.__wf543ConsoleErrors = []; page.__wf543ConsoleWarnings = []; " +
  "page.__wf543PageErrors = []; const onConsole = (message) => { " +
  'if (message.type() === "error") page.__wf543ConsoleErrors.push(message.text()); ' +
  'if (message.type() === "warning") page.__wf543ConsoleWarnings.push(message.text()); }; ' +
  "const onPageError = (error) => page.__wf543PageErrors.push(String(error)); " +
  'page.on("console", onConsole); page.on("pageerror", onPageError); ' +
  "page.__wf543LogListeners = { console: onConsole, pageerror: onPageError }; return true; }'";
export const SMOKE_LOG_RESET =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => { page.__wf543ConsoleErrors = []; " +
  "page.__wf543ConsoleWarnings = []; page.__wf543PageErrors = []; return true; }'";
export const SMOKE_CONSOLE_ERROR_READ =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => page.__wf543ConsoleErrors ?? []'";
export const SMOKE_CONSOLE_WARNING_READ =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => page.__wf543ConsoleWarnings ?? []'";
export const SMOKE_PAGE_ERROR_READ =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => page.__wf543PageErrors ?? []'";
export const SMOKE_LOGIN_SUBMIT =
  "playwright-cli -s=wf543smoke --raw run-code 'async (page) => { " +
  'const button = page.getByRole("button", { name: "Sign in", exact: true }); ' +
  "await button.click(); await page.waitForURL((url) => " +
  'url.pathname.startsWith("/admin/") && !url.pathname.includes("/login")); ' +
  "return { signedIn: true, url: page.url() }; }'";
export const SMOKE_RECEIPT_REQUIRED = Object.freeze([
  "command",
  "status",
  "stdout",
  "stderr",
  "stdoutSha256",
  "stderrSha256",
  "parsedOutput",
]);

export function commandResultSchema(
  commandSchema = SMOKE_CLI_COMMAND_SCHEMA,
  parsedOutputSchema = RAW_VALUE_SCHEMA
) {
  return {
    type: "object",
    additionalProperties: false,
    required: [...SMOKE_RECEIPT_REQUIRED],
    properties: {
      command: commandSchema,
      status: { type: "integer" },
      stdout: { type: "string" },
      stderr: { type: "string" },
      stdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
      stderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
      parsedOutput: parsedOutputSchema,
    },
  };
}

export const LOG_READ_SET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["consoleErrors", "consoleWarnings", "pageErrors"],
  properties: {
    consoleErrors: commandResultSchema({ const: SMOKE_CONSOLE_ERROR_READ }, STRING_ARRAY_SCHEMA),
    consoleWarnings: commandResultSchema(
      { const: SMOKE_CONSOLE_WARNING_READ },
      STRING_ARRAY_SCHEMA
    ),
    pageErrors: commandResultSchema({ const: SMOKE_PAGE_ERROR_READ }, STRING_ARRAY_SCHEMA),
  },
};

export const OPTIONAL_LOG_READ_SET_SCHEMA = {
  anyOf: [{ type: "null" }, LOG_READ_SET_SCHEMA],
};

export const COMMAND_TIMELINE_RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "sequence",
    "scope",
    "command",
    "status",
    "stdout",
    "stderr",
    "stdoutSha256",
    "stderrSha256",
    "parsedOutput",
  ],
  properties: {
    sequence: { type: "integer", minimum: 1 },
    scope: { type: "string", minLength: 1 },
    command: { type: "string", minLength: 1 },
    status: { type: "integer" },
    stdout: { type: "string" },
    stderr: { type: "string" },
    stdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    stderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    parsedOutput: RAW_VALUE_SCHEMA,
  },
};

