// TASK-482-07-L02: single canonical, dependency-free session-TTL resolver.
//
// This module is intentionally pure (no db/network imports) so BOTH the server
// session service (`sessionService.ts`, which re-exports it) and the admin
// setup wizard (the Advanced Security step) can share ONE implementation of the
// precedence + clamping rules. Extracting it here — rather than duplicating a
// mirror in the browser bundle — keeps the wizard's read-only "effective TTL"
// advisory in lock-step with what `createSession` actually resolves at runtime.
//
// The precedence pin lives in the Bun lane
// (`tests/unit/auth/sessionService.test.ts`), which imports these symbols via
// the `sessionService.ts` re-export; do NOT duplicate that pin in Vitest.

export const DEFAULT_SESSION_TTL_DAYS = 7;
export const MIN_SESSION_TTL_DAYS = 1;
export const MAX_SESSION_TTL_DAYS = 365;

// Coerce an arbitrary source value into a bounded, positive integer or `null`.
// `null` means "this source does not contribute" so the resolver falls through
// to the next source — this is deliberately NOT a plain `??` chain: `0`,
// negatives, NaN and non-numbers all fall through, while positive values are
// clamped into [min, max] (e.g. 400 -> 365).
const toBoundedInteger = (value: unknown, min: number, max: number): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized <= 0) return null;
  return Math.min(max, Math.max(min, normalized));
};

/**
 * Resolve the effective session TTL (in days) from the layered configuration
 * sources, in strict precedence order:
 *
 *   1. `inputTtlDays`            — per-create override (highest precedence)
 *   2. `authSettingTtlDays`      — `auth.sessionTtlDays` (canonical operator value)
 *   3. `securitySettingTtlDays`  — `security.session.ttlDays` (legacy/policy source)
 *   4. `DEFAULT_SESSION_TTL_DAYS` (7) — fallback
 *
 * Each source is passed through `toBoundedInteger(value, 1, 365)`: a non-numeric,
 * non-finite or non-positive value falls through to the next source; a positive
 * value clamps into [1, 365].
 */
export function resolveSessionTtlDaysFromSources(input: {
  inputTtlDays?: number; // per-create override (highest precedence)
  authSettingTtlDays?: unknown; // auth.sessionTtlDays (canonical operator value)
  securitySettingTtlDays?: unknown; // security.session.ttlDays (legacy/policy source)
}): number {
  const fromInput = toBoundedInteger(
    input.inputTtlDays,
    MIN_SESSION_TTL_DAYS,
    MAX_SESSION_TTL_DAYS
  );
  if (fromInput !== null) return fromInput;

  const fromAuthSettings = toBoundedInteger(
    input.authSettingTtlDays,
    MIN_SESSION_TTL_DAYS,
    MAX_SESSION_TTL_DAYS
  );
  if (fromAuthSettings !== null) return fromAuthSettings;

  const fromSecuritySettings = toBoundedInteger(
    input.securitySettingTtlDays,
    MIN_SESSION_TTL_DAYS,
    MAX_SESSION_TTL_DAYS
  );
  if (fromSecuritySettings !== null) return fromSecuritySettings;

  return DEFAULT_SESSION_TTL_DAYS;
}
