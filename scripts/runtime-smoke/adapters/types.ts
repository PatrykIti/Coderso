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
