// Type declarations for _docs/_workflows/lib/task-543-gate-contracts.mjs
// (single owner: TASK-545-02-L02). Command allowlists, gate schemas,
// strict-scan projections, and gate receipt validation.

export const ENV_PREFIX: string;
export const TARGETED_VITEST_COMMAND: string;
export const DB_PREFLIGHT_COMMAND: string;
export const TASK_SEMGREP_COMMAND: string;
export const STRICT_SEMGREP_JSON_ARGS: readonly string[];
export const STRICT_SEMGREP_JSON_COMMAND: string;
export const FULL_GATE_COMMANDS: Readonly<{ id: string; command: string }[]>;
export const STRICT_COMPONENTS: Readonly<{ id: string; [key: string]: unknown }[]>;
export const KNOWN_STRICT_FINDING: Readonly<Record<string, unknown>>;
export const FIXER_RESULT_SCHEMA: Readonly<Record<string, unknown>>;
export const RESULT_SCHEMA: Readonly<Record<string, unknown>>;
export const COMMAND_RECEIPT_SCHEMA: Readonly<Record<string, unknown>>;
export const STRICT_FINDING_SCHEMA: Readonly<Record<string, unknown>>;
export const FULL_GATE_SCHEMA: Readonly<Record<string, unknown>>;
export const FINGERPRINT_SCHEMA: Readonly<Record<string, unknown>>;
export const AUDIT_SCHEMA: Readonly<Record<string, unknown>>;

export function validatePassErrorContract(result: unknown, label: string): void;
export function requirePassingResult(result: unknown, label: string): void;
export function sha256Text(value: string): string;
export function receiptIntegrityValid(
  receipt: unknown,
  digest?: (value: string) => string
): boolean;
export function uniqueNumbers<T>(values: readonly T[]): T[];
export function receiptMatches(
  receipt: unknown,
  expected: unknown,
  allowedStatuses?: readonly number[]
): boolean;
export function strictComponentSections(rawOutput: string): unknown;
export function strictSummaryExitCode(rawOutput: string, id: string): number;
export function parseStrictSemgrepJson(rawOutput: string): unknown;
export function validateFullGates(result: unknown): void;
export function sameUniqueSet(left: readonly unknown[], right: readonly unknown[]): boolean;
export function sameSequence(left: readonly unknown[], right: readonly unknown[]): boolean;
export function stableSerialize(value: unknown): string;
export function sameRawValue(left: unknown, right: unknown): boolean;
