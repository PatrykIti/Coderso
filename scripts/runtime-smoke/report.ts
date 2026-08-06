import type { SmokeAdapterResult } from "./adapters/types";
import type { CleanupResult } from "./lifecycle";
import type { SmokeError, SmokeInput } from "./contracts";
import { redactValue } from "./redaction";
import type { SmokeTimingReceipt } from "./timing";

export interface RuntimeSmokeReport {
  readonly schemaVersion: 1;
  readonly suiteId: string;
  readonly profile: string;
  readonly session: string;
  readonly pass: boolean;
  readonly serverUp: boolean;
  readonly timings: readonly SmokeTimingReceipt[];
  readonly processes: Readonly<Record<string, number>>;
  readonly snapshots: number;
  readonly scenarios: readonly unknown[];
  readonly screenshots: readonly unknown[];
  readonly consoleErrors: readonly unknown[];
  readonly suiteCleanup: Readonly<Record<string, boolean | number | string>>;
  readonly cleanup: CleanupResult;
  readonly failures: readonly { readonly code: string }[];
}

export function createRuntimeSmokeReport(input: {
  readonly request: SmokeInput;
  readonly adapter: SmokeAdapterResult | null;
  readonly primary: SmokeError | null;
  readonly cleanup: CleanupResult;
  readonly timings: readonly SmokeTimingReceipt[];
  readonly processCounters: Readonly<Record<string, number>>;
  readonly snapshots: number;
}): RuntimeSmokeReport {
  const pass = input.primary === null && input.cleanup.pass && input.adapter?.pass === true;
  const safe = redactValue({
    schemaVersion: 1,
    suiteId: input.request.suite,
    profile: input.request.profile,
    session: input.request.session,
    pass,
    serverUp: input.adapter?.serverUp ?? false,
    timings: input.timings,
    processes: input.processCounters,
    snapshots: input.snapshots,
    scenarios: input.adapter?.scenarios ?? [],
    screenshots: input.adapter?.screenshots ?? [],
    consoleErrors: input.adapter?.consoleErrors ?? [],
    suiteCleanup: input.adapter?.cleanup ?? {},
    cleanup: input.cleanup,
    failures: input.primary === null ? [] : [{ code: input.primary.code }],
  });
  return safe as RuntimeSmokeReport;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

export function encodeReportJson(report: RuntimeSmokeReport): string {
  const encoded = `${JSON.stringify(canonicalize(report))}\n`;
  if (Buffer.byteLength(encoded) > 1_048_576) throw new Error("runtime smoke report is too large");
  return encoded;
}

export function encodeReportMarkdown(report: RuntimeSmokeReport): string {
  return [
    `# Runtime smoke: ${report.suiteId}`,
    "",
    `- Profile: ${report.profile}`,
    `- Session: ${report.session}`,
    `- Result: ${report.pass ? "PASS" : "FAIL"}`,
    `- Cleanup: ${report.cleanup.pass ? "PASS" : "FAIL"}`,
    "",
  ].join("\n");
}
