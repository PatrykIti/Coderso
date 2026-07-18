import { expect } from "bun:test";

export type AccessLogIdentity = Readonly<{
  userId: string | null;
  sessionId: string | null;
}>;

export type ExpectedAccessLog = Readonly<{
  method: string;
  path: string;
  status: number;
  identity: AccessLogIdentity;
}>;

export type AccessLogCandidate = Readonly<{
  id: string;
  userAgent: string | null;
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}>;

export type PollDeps = Readonly<{
  query: () => Promise<readonly AccessLogCandidate[]>;
  deleteExactIds: (ids: readonly string[]) => Promise<void>;
  now: () => number;
  wait: (ms: number) => Promise<void>;
}>;

export type AccessLogScope = Readonly<{
  marker: string;
  userIds: ReadonlySet<string>;
  sessionIds: ReadonlySet<string>;
}>;

export type StableAccessLogInventory = Readonly<{
  ids: readonly string[];
  behaviorError:
    | "access_log_missing"
    | "access_log_extra"
    | "access_log_late"
    | "access_log_unstable"
    | null;
  scopeInvalid: boolean;
}>;

export const ACCESS_LOG_POLL_CADENCE_MS = 50;
export const ACCESS_LOG_MIN_QUIET_MS = 250;
export const ACCESS_LOG_POLL_TIMEOUT_MS = 5_000;
export const ACCESS_LOG_REQUIRED_STABLE_POLLS = 3;

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isSubmultiset(actual: readonly string[], expected: readonly string[]): boolean {
  const remaining = new Map<string, number>();
  for (const value of expected) {
    remaining.set(value, (remaining.get(value) ?? 0) + 1);
  }
  for (const value of actual) {
    const count = remaining.get(value) ?? 0;
    if (count === 0) return false;
    remaining.set(value, count - 1);
  }
  return true;
}

export function accessLogSignature(value: AccessLogCandidate): string {
  return JSON.stringify([value.method, value.path, value.status, value.userId, value.sessionId]);
}

export function expectedAccessLogSignature(value: ExpectedAccessLog): string {
  return JSON.stringify([
    value.method,
    value.path,
    value.status,
    value.identity.userId,
    value.identity.sessionId,
  ]);
}

export function isOwnedAccessLogCandidate(row: AccessLogCandidate, scope: AccessLogScope): boolean {
  return (
    row.userAgent === scope.marker ||
    (row.userId !== null && scope.userIds.has(row.userId)) ||
    (row.sessionId !== null && scope.sessionIds.has(row.sessionId))
  );
}

export async function observeStableAccessLogInventory(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[]
): Promise<StableAccessLogInventory> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  const expected = [...expectedSignatures].sort();
  let stableObservation: readonly string[] | null = null;
  let stableIds: readonly string[] = [];
  let previousObservationCompletedAt: number | null = null;
  let quietDuration = 0;
  let stablePolls = 0;
  let everExact = false;
  let changedAfterExact = false;
  let scopeInvalid = false;

  while (deps.now() <= deadline) {
    const queryStartedAt = deps.now();
    const rows = await deps.query();
    const observationCompletedAt = deps.now();
    const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
    scopeInvalid ||= ownedRows.length !== rows.length;
    const rawIds = ownedRows.map((row) => row.id);
    scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
    const ids = [...new Set(rawIds)].sort();
    const actual = ownedRows.map(accessLogSignature).sort();
    const observation = ownedRows
      .map((row) => JSON.stringify([row.id, accessLogSignature(row)]))
      .sort();
    const exact = ownedRows.length === expected.length && sameArray(actual, expected);

    if (stableObservation === null || !sameArray(observation, stableObservation)) {
      if (everExact) changedAfterExact = true;
      stableObservation = observation;
      stableIds = ids;
      quietDuration = 0;
      stablePolls = 1;
    } else {
      quietDuration += Math.max(
        0,
        queryStartedAt - (previousObservationCompletedAt ?? queryStartedAt)
      );
      stablePolls += 1;
    }
    if (exact) everExact = true;
    previousObservationCompletedAt = observationCompletedAt;

    if (observationCompletedAt > deadline) {
      return {
        ids: stableIds,
        behaviorError: "access_log_unstable",
        scopeInvalid,
      };
    }
    if (
      stablePolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
      quietDuration >= ACCESS_LOG_MIN_QUIET_MS
    ) {
      return {
        ids: stableIds,
        behaviorError: changedAfterExact
          ? "access_log_late"
          : exact
            ? null
            : isSubmultiset(actual, expected)
              ? "access_log_missing"
              : "access_log_extra",
        scopeInvalid,
      };
    }
    if (deps.now() >= deadline) {
      return {
        ids: stableIds,
        behaviorError: "access_log_unstable",
        scopeInvalid,
      };
    }
    await deps.wait(Math.max(0, Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())));
  }
  return {
    ids: stableIds,
    behaviorError: "access_log_unstable",
    scopeInvalid,
  };
}

export async function drainExactAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  initialIds: readonly string[]
): Promise<{
  lateAfterDelete: boolean;
  scopeInvalid: boolean;
  cleanupError: Error | null;
}> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  let pendingIds = [...initialIds];
  let previousEmptyObservationCompletedAt: number | null = null;
  let quietDuration = 0;
  let emptyPolls = 0;
  let lateAfterDelete = false;
  let scopeInvalid = false;
  const cleanupErrors: Error[] = [];
  try {
    while (deps.now() <= deadline) {
      if (pendingIds.length > 0) {
        await deps.deleteExactIds(pendingIds);
        pendingIds = [];
      }
      const queryStartedAt = deps.now();
      const rows = await deps.query();
      const observationCompletedAt = deps.now();
      const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
      scopeInvalid ||= ownedRows.length !== rows.length;
      const rawIds = ownedRows.map((row) => row.id);
      scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
      const ids = [...new Set(rawIds)].sort();
      if (ids.length > 0) {
        lateAfterDelete = true;
        pendingIds = ids;
        previousEmptyObservationCompletedAt = null;
        quietDuration = 0;
        emptyPolls = 0;
        continue;
      }
      if (observationCompletedAt > deadline) break;
      if (previousEmptyObservationCompletedAt !== null) {
        quietDuration += Math.max(0, queryStartedAt - previousEmptyObservationCompletedAt);
      }
      previousEmptyObservationCompletedAt = observationCompletedAt;
      emptyPolls += 1;
      if (
        emptyPolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
        quietDuration >= ACCESS_LOG_MIN_QUIET_MS
      ) {
        return { lateAfterDelete, scopeInvalid, cleanupError: null };
      }
      if (deps.now() >= deadline) break;
      await deps.wait(Math.max(0, Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())));
    }
  } catch (error) {
    cleanupErrors.push(error instanceof Error ? error : new Error("access_log_drain_failed"));
  }
  if (pendingIds.length > 0) {
    try {
      await deps.deleteExactIds(pendingIds);
    } catch (error) {
      cleanupErrors.push(
        error instanceof Error ? error : new Error("access_log_exact_delete_failed")
      );
    }
  }
  cleanupErrors.push(new Error("access_log_absence_unstable"));
  return {
    lateAfterDelete,
    scopeInvalid,
    cleanupError:
      cleanupErrors.length === 1
        ? cleanupErrors[0]
        : new AggregateError(cleanupErrors, "access_log_drain_failed"),
  };
}

export async function validateAndCleanupAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[],
  cleanupExactSettingsSessionsAndUsers: () => Promise<void>
): Promise<void> {
  const deferredErrors: Error[] = [];
  let initialIds: readonly string[] = [];
  try {
    const inventory = await observeStableAccessLogInventory(deps, scope, expectedSignatures);
    initialIds = inventory.ids;
    if (inventory.behaviorError) {
      deferredErrors.push(new Error(inventory.behaviorError));
    }
    if (inventory.scopeInvalid) {
      deferredErrors.push(new Error("access_log_scope_invalid"));
    }
  } catch (error) {
    deferredErrors.push(error instanceof Error ? error : new Error("access_log_inventory_failed"));
  }

  const drained = await drainExactAccessLogs(deps, scope, initialIds);
  if (
    drained.scopeInvalid &&
    !deferredErrors.some(({ message }) => message === "access_log_scope_invalid")
  ) {
    deferredErrors.push(new Error("access_log_scope_invalid"));
  }
  if (drained.lateAfterDelete) {
    deferredErrors.push(new Error("access_log_late_after_delete"));
  }
  if (drained.cleanupError) {
    deferredErrors.push(drained.cleanupError);
  } else {
    try {
      await cleanupExactSettingsSessionsAndUsers();
    } catch (error) {
      deferredErrors.push(error instanceof Error ? error : new Error("access_log_cleanup_failed"));
    }
  }

  if (deferredErrors.length === 1) throw deferredErrors[0];
  if (deferredErrors.length > 1) {
    throw new AggregateError(deferredErrors, "access_log_validation_failed");
  }
}

export async function trackedFetch(
  input: string | URL,
  init: RequestInit,
  expected: ExpectedAccessLog,
  marker: string,
  ledger: ExpectedAccessLog[],
  transport: typeof fetch = fetch
): Promise<Response> {
  const request = new Request(input, init);
  if (
    request.method.toUpperCase() !== expected.method ||
    new URL(request.url).pathname !== expected.path ||
    request.headers.get("user-agent") !== marker
  ) {
    throw new Error("access_log_request_ledger_invalid");
  }
  const response = await transport(request);
  ledger.push(expected);
  expect(response.status).toBe(expected.status);
  return response;
}
