import type { RuntimeSmokeContext } from "../lifecycle";
import type { SmokeProfileId, SmokeSuiteId } from "../contracts";

export interface SmokeAdapterResult {
  readonly pass: true;
  readonly serverUp: boolean;
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly screenshots: readonly SmokeScreenshotResult[];
  readonly consoleErrors: readonly string[];
  readonly cleanup: Readonly<Record<string, boolean | number | string>>;
}

export interface SmokeScenarioResult {
  readonly id: string;
  readonly pass: boolean;
  readonly elapsedMs: number;
}

export interface SmokeScreenshotResult {
  readonly path: string;
  readonly sha256: string;
}

export interface SmokeAdapter {
  readonly suiteId: SmokeSuiteId;
  readonly supportedProfiles: readonly SmokeProfileId[];
  run(context: RuntimeSmokeContext): Promise<SmokeAdapterResult>;
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
