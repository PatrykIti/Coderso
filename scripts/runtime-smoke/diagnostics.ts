import { appendFileSync, closeSync, constants, lstatSync, mkdirSync, openSync } from "node:fs";
import { resolve } from "node:path";
import { SmokeError } from "./contracts";

/**
 * Shared bounded diagnostics log for runtime smoke runs.
 *
 * Every suite run appends its full progress and failure detail to
 * `.tmp/runtime-smoke/<session>.diag.log` (0o600) so operators always have
 * black-on-white run history: server log tails, primary failures, timings,
 * process counters, and scenario summaries. The file is bounded by a maximum
 * byte budget and per-write limits; oversized state is truncated best-effort
 * so the log can never grow unbounded.
 */

const DIAG_ROOT = ".tmp/runtime-smoke";
const MAXIMUM_DIAG_BYTES = 4 * 1024 * 1024;
const MAXIMUM_WRITE_BYTES = 64 * 1024;

export function diagnosticsPath(root: string, session: string): string {
  if (!/^[a-z][a-z0-9-]{2,63}$/u.test(session) || /[./\\]/u.test(session)) {
    throw new SmokeError("smoke_argument_invalid", "diagnostics session is invalid");
  }
  return resolve(root, DIAG_ROOT, `${session}.diag.log`);
}

function boundedTruncate(absolute: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(absolute, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function appendDiagnostics(root: string, session: string, lines: readonly string[]): void {
  const absolute = diagnosticsPath(root, session);
  mkdirSync(resolve(root, DIAG_ROOT), { recursive: true, mode: 0o700 });
  try {
    const existing = lstatSync(absolute);
    if (existing.isSymbolicLink() || !existing.isFile() || existing.size > MAXIMUM_DIAG_BYTES) {
      boundedTruncate(absolute);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code !== "ENOENT") return;
  }
  let payload = lines
    .map((line) => (typeof line === "string" ? line : String(line)))
    .join("\n")
    .concat("\n");
  if (Buffer.byteLength(payload) > MAXIMUM_WRITE_BYTES) {
    payload = payload.slice(0, MAXIMUM_WRITE_BYTES);
  }
  try {
    appendFileSync(absolute, payload, { encoding: "utf8", mode: 0o600, flag: "a" });
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || stats.size > MAXIMUM_DIAG_BYTES) boundedTruncate(absolute);
  } catch {
    // Diagnostics are best-effort and must never break the smoke run itself.
  }
}
