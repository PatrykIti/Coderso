import type { RuntimeSmokeContext } from "../lifecycle";
import type { SmokeInput, SmokeProfileId, SmokeSuiteId } from "../contracts";

export interface SmokeAdapterResult {
  readonly pass: true;
  readonly serverUp: boolean;
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: readonly SmokeScreenshotResult[];
  readonly consoleErrors: readonly string[];
  readonly cleanup: Readonly<Record<string, boolean | number | string>>;
}

/** Closed declaration that the real driver reached every suite-owned resource. */
export type Task105L05LifecycleRegistrationAttestation = Readonly<
  Record<string, boolean | number | string>
> &
  Readonly<{
    readonly contract: "task-105-l05-runtime-v1";
    readonly workerPool: "registered";
    readonly devHost: "registered";
    readonly browserDispatch: "registered";
    readonly workspace: "registered";
    readonly fixtureCleanup: "registered";
  }>;

/** Bounded receipt summary retained in the terminal shared runner report. */
export type Task105L05LifecycleAttestation = Task105L05LifecycleRegistrationAttestation &
  Readonly<{
    readonly receiptDigest: string;
    readonly receiptConsoleErrors: 0;
    readonly receiptPageErrors: 0;
  }>;

export const TASK105_L05_LIFECYCLE_REGISTRATION_ATTESTATION: Task105L05LifecycleRegistrationAttestation =
  Object.freeze({
    contract: "task-105-l05-runtime-v1",
    workerPool: "registered",
    devHost: "registered",
    browserDispatch: "registered",
    workspace: "registered",
    fixtureCleanup: "registered",
  });

export function createTask105L05LifecycleAttestation(
  receiptDigest: string
): Task105L05LifecycleAttestation {
  if (!/^[a-f0-9]{64}$/u.test(receiptDigest)) {
    throw new Error("TASK-105 L05 receipt digest is invalid");
  }
  return Object.freeze({
    ...TASK105_L05_LIFECYCLE_REGISTRATION_ATTESTATION,
    receiptDigest,
    receiptConsoleErrors: 0 as const,
    receiptPageErrors: 0 as const,
  });
}

export function isTask105L05LifecycleAttestation(
  value: Readonly<Record<string, boolean | number | string>>
): value is Task105L05LifecycleAttestation {
  const expected = TASK105_L05_LIFECYCLE_REGISTRATION_ATTESTATION;
  return (
    Object.keys(value).length === Object.keys(expected).length + 3 &&
    Object.entries(expected).every(([key, expectedValue]) => value[key] === expectedValue) &&
    typeof value.receiptDigest === "string" &&
    /^[a-f0-9]{64}$/u.test(value.receiptDigest) &&
    value.receiptConsoleErrors === 0 &&
    value.receiptPageErrors === 0
  );
}

// Visible-evidence result extension (TASK-545-03-L01). The generic
// SmokeScenarioResult gains optional strict `title`, `variants`, and
// `screenshots` fields so existing non-manifest adapters remain
// source-compatible. Any suite entering the smoke-evidence manifest lifecycle
// must provide all three; every new or substantially changed UI adapter must
// do so. `scripts/runtime-smoke/visible-evidence.ts` owns the bounded
// recursive normalizer/builders; task-local copies or report postprocessors
// are forbidden.
export type SmokeVisibleAssertionKind = "computed-style" | "geometry" | "dom-state" | "aria";

export interface SmokeVisibleAssertionResult {
  readonly kind: SmokeVisibleAssertionKind;
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly actual: string;
  readonly pass: boolean;
}

export interface SmokeScenarioVariantResult {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly assertions: readonly SmokeVisibleAssertionResult[];
  readonly consoleErrors: readonly string[];
}

export interface SmokeScenarioResult {
  readonly id: string;
  readonly pass: boolean;
  readonly elapsedMs: number;
  readonly title?: string;
  readonly variants?: readonly SmokeScenarioVariantResult[];
  readonly screenshots?: readonly SmokeScreenshotResult[];
}

export interface SmokeScreenshotResult {
  readonly path: string;
  readonly sha256: string;
}

export interface SmokeAdapter {
  readonly suiteId: SmokeSuiteId;
  readonly supportedProfiles: readonly SmokeProfileId[];
  run(context: RuntimeSmokeContext): Promise<SmokeAdapterResult>;
  readonly evidenceSessionPolicy?: "exclusive";
  /**
   * Optional absolute evidence session directory for the suite. When set, the
   * shared runner pre-creates report.json there before the adapter runs (so
   * exact-set evidence validation sees the file) and rewrites it with the
   * final report after the run, making the runner the single owner of the
   * evidence report. Suites without an evidence contract return null.
   */
  readonly evidenceDirectory?: (input: SmokeInput, root: string) => string | null;
}

export function isSmokeAdapter(value: unknown): value is SmokeAdapter {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<SmokeAdapter>;
  return (
    typeof candidate.suiteId === "string" &&
    Array.isArray(candidate.supportedProfiles) &&
    typeof candidate.run === "function"
  );
}
