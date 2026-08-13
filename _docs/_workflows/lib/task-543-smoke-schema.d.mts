// Type declarations for _docs/_workflows/lib/task-543-smoke-schema.mjs (single
// owner: TASK-545-02-L02). Environment-neutral ESM constants and recursively
// strict result, lifecycle, fixture, scenario, and evidence schemas.

export type SmokeKind =
  | "clean-close"
  | "dirty-delayed-close"
  | "pending-revert-restoration"
  | "failure-retry"
  | "double-close"
  | "table-keyboard"
  | "mid-viewport-metadata";

export const SMOKE_KINDS: readonly SmokeKind[];
export const TRANSIENT_SCREENSHOT_KINDS: readonly SmokeKind[];
export const SMOKE_SESSION_PREFIX: string;
export const RUN_CODE_PAYLOAD_MAX_BYTES: number;
export const RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH: number;
export const RUN_CODE_COMMAND_MAX_BYTES: number;
export const EMPTY_SHA256: string;
export const SMOKE_SCREENSHOT_ROOT: string;
export const POSTS_LIST_URL: string;
export const ADMIN_ORIGIN: string;
export const POST_TITLE_SELECTOR: string;
export const POST_CLOSE_SELECTOR: string;
export const SMOKE_PASSWORD_FILL_COMMAND: string;
export const SMOKE_SETUP_STORAGE_KEY: string;
export const FAILURE_BASE_OWNED_PORTS: readonly number[];
export const ADMIN_HEALTH_COMMAND: string;
export const FRONT_HEALTH_COMMAND: string;
export const NONCE_GENERATION_COMMAND: string;
export const RESPONSIVE_WIDTHS: readonly number[];
export const RESPONSIVE_HEIGHT: number;
export const SMOKE_CLI_COMMAND_SCHEMA: Readonly<Record<string, unknown>>;
export const SMOKE_RUN_CODE_COMMAND_SCHEMA: Readonly<Record<string, unknown>>;
export const RAW_VALUE_SCHEMA: Readonly<Record<string, unknown>>;
export const STRING_ARRAY_SCHEMA: Readonly<Record<string, unknown>>;
export const POST_PAYLOAD_SCHEMA: Readonly<Record<string, unknown>>;
export const SAFE_SENTINEL_SCHEMA: Readonly<Record<string, unknown>>;
export const THEME_APPLIED_STATE_SCHEMA: Readonly<Record<string, unknown>>;
export const THEME_RESTORE_STATE_SCHEMA: Readonly<Record<string, unknown>>;
export const SETUP_STATE_SCHEMA: Readonly<Record<string, unknown>>;
export const SMOKE_LOG_OBSERVATION_START: string;
export const SMOKE_LOG_RESET: string;
export const SMOKE_CONSOLE_ERROR_READ: string;
export const SMOKE_CONSOLE_WARNING_READ: string;
export const SMOKE_PAGE_ERROR_READ: string;
export const SMOKE_LOGIN_SUBMIT: string;
export const SMOKE_RECEIPT_REQUIRED: readonly string[];
export const LOG_READ_SET_SCHEMA: Readonly<Record<string, unknown>>;
export const OPTIONAL_LOG_READ_SET_SCHEMA: Readonly<Record<string, unknown>>;
export const COMMAND_TIMELINE_RECORD_SCHEMA: Readonly<Record<string, unknown>>;

export function commandResultSchema(
  commandSchema?: Readonly<Record<string, unknown>>,
  parsedOutputSchema?: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>>;
