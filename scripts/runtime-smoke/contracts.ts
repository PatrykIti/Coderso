import { isAbsolute, relative, resolve } from "node:path";

export const SUITE_IDS = ["task-540", "widget-contract", "production-boundary"] as const;
export const PROFILE_IDS = ["fast", "certification"] as const;

export type SmokeSuiteId = (typeof SUITE_IDS)[number];
export type SmokeProfileId = (typeof PROFILE_IDS)[number];

export interface SmokeInput {
  readonly command: "run";
  readonly suite: SmokeSuiteId;
  readonly profile: SmokeProfileId;
  readonly session: string;
}

export type SmokeErrorCode =
  | "smoke_adapter_unavailable"
  | "smoke_argument_invalid"
  | "smoke_cleanup_failed"
  | "smoke_output_invalid"
  | "smoke_poll_timeout"
  | "smoke_process_failed"
  | "smoke_process_spawn_failed"
  | "smoke_process_timeout"
  | "smoke_repository_changed"
  | "smoke_repository_invalid";

export class SmokeError extends Error {
  readonly code: SmokeErrorCode;

  constructor(code: SmokeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SmokeError";
    this.code = code;
  }
}

export function mapSmokeError(error: unknown): SmokeError {
  if (error instanceof SmokeError) return error;
  return new SmokeError("smoke_output_invalid", "runtime smoke failed", {
    cause: error,
  });
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new SmokeError("smoke_output_invalid", `${label} has unknown or missing fields`);
  }
}

export function assertLocalOrigin(value: string): URL {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch (error) {
    throw new SmokeError("smoke_argument_invalid", "origin is invalid", { cause: error });
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(origin.hostname) && !origin.hostname.endsWith(".localhost")) {
    throw new SmokeError("smoke_argument_invalid", "origin must be local");
  }
  if (!new Set(["http:", "https:"]).has(origin.protocol) || origin.username || origin.password) {
    throw new SmokeError("smoke_argument_invalid", "origin protocol or credentials are invalid");
  }
  if (origin.pathname !== "/" || origin.search || origin.hash) {
    throw new SmokeError("smoke_argument_invalid", "origin must not contain a path or query");
  }
  return origin;
}

export function assertOwnedPort(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1024 || value > 65_535) {
    throw new SmokeError("smoke_argument_invalid", "owned port is outside the allowed range");
  }
  return value;
}

export function resolveInsideRoot(root: string, candidate: string, label: string): string {
  if (candidate.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", `${label} contains a NUL byte`);
  }
  const absolute = resolve(root, candidate);
  const rel = relative(root, absolute);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return absolute;
  throw new SmokeError("smoke_argument_invalid", `${label} escapes the repository root`);
}
