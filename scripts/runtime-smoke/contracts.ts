import { isAbsolute, relative, resolve } from "node:path";

export const SUITE_IDS = [
  "task-540",
  "task-547",
  "task-554",
  "widget-contract",
  "production-boundary",
  "task-487",
  "task-488",
  "task-490",
  "task-491",
  "task-492",
  "task-511",
  "task-517",
  "task-493",
  "detail-page-v2",
  "task-105-l05",
] as const;
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
  | "smoke_authentication_failed"
  | "smoke_argument_invalid"
  | "smoke_cleanup_failed"
  | "smoke_output_invalid"
  | "smoke_poll_timeout"
  | "smoke_process_failed"
  | "smoke_process_spawn_failed"
  | "smoke_process_timeout"
  | "smoke_repository_changed"
  | "smoke_repository_invalid"
  | "smoke_server_unexpected_exit";

/**
 * Closed, public-only TASK-105 L05 failure vocabulary.
 *
 * Callers must classify a private failure before it reaches this serializer.
 * In particular, this input intentionally has no Error, message, cause,
 * stack, environment, worker-frame, or process fields.
 */
export type Task105L05WorkerFailurePhase =
  "spawn" | "protocol" | "install" | "settings_apply" | "settings_restore" | "close";

export type Task105L05WorkerFailureCode =
  | "worker_dispatch_failed"
  | "worker_protocol_failed"
  | "worker_unavailable"
  | "worker_close_failed";

export type Task105L05PublicSmokeFailure =
  | { readonly boundary: "runner"; readonly stableCode: "runner_failed" }
  | { readonly boundary: "lifecycle"; readonly stableCode: "lifecycle_failed" }
  | {
      readonly boundary: "worker";
      readonly phase: Task105L05WorkerFailurePhase;
      readonly stableCode: Task105L05WorkerFailureCode;
    };

export interface Task105L05PublicSmokeFailureProjection {
  readonly code: "smoke_process_failed";
  readonly message: string;
}

const TASK105_L05_WORKER_FAILURE_PHASES = new Set<Task105L05WorkerFailurePhase>([
  "spawn",
  "protocol",
  "install",
  "settings_apply",
  "settings_restore",
  "close",
]);

const TASK105_L05_WORKER_FAILURE_CODES = new Set<Task105L05WorkerFailureCode>([
  "worker_dispatch_failed",
  "worker_protocol_failed",
  "worker_unavailable",
  "worker_close_failed",
]);

function invalidTask105L05PublicSmokeFailure(): never {
  throw new SmokeError("smoke_output_invalid", "TASK-105 L05 public failure is invalid");
}

/**
 * Projects only pre-classified TASK-105 L05 failures into public output.
 *
 * The runtime checks are deliberate: this module is also called from worker
 * boundaries, where JavaScript callers must not be able to smuggle an
 * arbitrary value into a report, diagnostic, stdout, or stderr projection.
 */
export function serializePublicSmokeFailure(
  input: Task105L05PublicSmokeFailure
): Task105L05PublicSmokeFailureProjection {
  if (input.boundary === "runner") {
    if (input.stableCode !== "runner_failed") invalidTask105L05PublicSmokeFailure();
    return Object.freeze({
      code: "smoke_process_failed",
      message: "TASK-105 L05 runner failed (runner_failed)",
    });
  }
  if (input.boundary === "lifecycle") {
    if (input.stableCode !== "lifecycle_failed") invalidTask105L05PublicSmokeFailure();
    return Object.freeze({
      code: "smoke_process_failed",
      message: "TASK-105 L05 lifecycle failed (lifecycle_failed)",
    });
  }
  if (
    input.boundary !== "worker" ||
    !TASK105_L05_WORKER_FAILURE_PHASES.has(input.phase) ||
    !TASK105_L05_WORKER_FAILURE_CODES.has(input.stableCode)
  ) {
    invalidTask105L05PublicSmokeFailure();
  }
  return Object.freeze({
    code: "smoke_process_failed",
    message: `TASK-105 L05 worker ${input.phase} failed (${input.stableCode})`,
  });
}

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
