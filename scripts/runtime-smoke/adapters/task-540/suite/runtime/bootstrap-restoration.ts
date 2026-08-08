import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";
import type { WorkerPool } from "../../../../workers/pool";
import { requireTask540OperationAlias } from "../../operations/aliases";
import { validateTask540OperationInput } from "../../operations/contracts";
import { task540OperationDescriptor } from "../../operations/registry";
import { dispatchTask540Operation } from "../executor/operation-dispatch";
import {
  deepJsonEqual,
  runtimeInvariant,
  runtimeObject,
  runtimeString,
  runtimeUuid,
} from "./native-utils";

const TASK540_BOOTSTRAP_READ_OPERATION = requireTask540OperationAlias(
  "resource/bootstrap-baseline-read"
);
const TASK540_BOOTSTRAP_LOGIN_OBSERVATION_OPERATION = requireTask540OperationAlias(
  "resource/bootstrap-login-observation"
);
export const TASK540_BOOTSTRAP_RESTORE_OPERATION = requireTask540OperationAlias(
  "resource/bootstrap-cas-restore"
);

const RESTORE_PROOF_KEYS = Object.freeze([
  "afterCommitByteIdentical",
  "completeRowByteIdentical",
  "conditionalUpdateAffectedOne",
  "inTransactionByteIdentical",
  "restored",
  "roleTuplesByteIdentical",
  "rolesInTransactionByteIdentical",
  "rolesShareLocked",
  "transactionLocked",
] as const);

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function exactPair(rawUserRowValue: unknown): PlainJsonObject {
  const rawUserRow = runtimeObject(rawUserRowValue, "TASK-540 bootstrap user row");
  const lastLoginAt = rawUserRow.lastLoginAt;
  runtimeInvariant(
    lastLoginAt === null || isCanonicalIsoTimestamp(lastLoginAt),
    "TASK-540 bootstrap last-login timestamp is invalid"
  );
  const updatedAt = runtimeString(rawUserRow.updatedAt, "TASK-540 bootstrap updated timestamp", 64);
  runtimeInvariant(
    isCanonicalIsoTimestamp(updatedAt),
    "TASK-540 bootstrap updated timestamp is invalid"
  );
  return Object.freeze({ lastLoginAt, updatedAt });
}

function assertBaselineShape(value: unknown, label: string): PlainJsonObject {
  const baseline = runtimeObject(value, label);
  const id = runtimeUuid(baseline.id, `${label} ID`);
  const rawUserRow = runtimeObject(baseline.rawUserRow, `${label} user row`);
  runtimeInvariant(rawUserRow.id === id, `${label} user identity drifted`);
  runtimeInvariant(Array.isArray(baseline.roleTuples), `${label} roles are invalid`);
  exactPair(rawUserRow);
  return Object.freeze({ id, rawUserRow, roleTuples: baseline.roleTuples });
}

function assertOnlyOwnedTimestampsChanged(
  baseline: PlainJsonObject,
  observed: PlainJsonObject,
  label: string
): void {
  const baselineRaw = runtimeObject(baseline.rawUserRow, `${label} baseline user row`);
  const observedRaw = runtimeObject(observed.rawUserRow, `${label} observed user row`);
  runtimeInvariant(
    observed.id === baseline.id &&
      deepJsonEqual(
        Object.freeze({
          ...observedRaw,
          lastLoginAt: baselineRaw.lastLoginAt as PlainJsonValue,
          updatedAt: baselineRaw.updatedAt as PlainJsonValue,
        }),
        baselineRaw
      ) &&
      deepJsonEqual(observed.roleTuples as PlainJsonValue, baseline.roleTuples as PlainJsonValue),
    `${label} changed outside owned timestamps`
  );
}

export function captureTask540BootstrapBaseline(storagePreflightValue: unknown): PlainJsonObject {
  const preflight = runtimeObject(storagePreflightValue, "TASK-540 storage preflight");
  return assertBaselineShape(preflight.bootstrap, "TASK-540 bootstrap baseline");
}

export async function observeTask540BootstrapLogin(
  pool: WorkerPool,
  input: Readonly<{
    baseline: PlainJsonObject;
    userAgent: string;
    userId: string;
  }>
): Promise<PlainJsonObject> {
  runtimeInvariant(
    TASK540_BOOTSTRAP_LOGIN_OBSERVATION_OPERATION.retryClass === "idempotent-read",
    "TASK-540 bootstrap observation retry authority drifted"
  );
  const baseline = assertBaselineShape(input.baseline, "TASK-540 bootstrap baseline");
  const userId = runtimeUuid(input.userId, "TASK-540 bootstrap login user ID");
  runtimeInvariant(userId === baseline.id, "TASK-540 bootstrap login identity drifted");
  const observed = runtimeObject(
    await dispatchTask540Operation(pool, {
      operationId: TASK540_BOOTSTRAP_LOGIN_OBSERVATION_OPERATION.operationId,
      input: {
        userAgent: runtimeString(input.userAgent, "TASK-540 bootstrap login user agent", 512),
        userId,
      },
    }),
    "TASK-540 bootstrap login observation"
  );
  assertOnlyOwnedTimestampsChanged(baseline, observed, "TASK-540 bootstrap login");
  return exactPair(observed.rawUserRow);
}

export async function restoreTask540BootstrapBaseline(
  pool: WorkerPool,
  input: Readonly<{
    baseline: PlainJsonObject;
    newestOwnedPair: PlainJsonObject;
  }>
): Promise<PlainJsonObject> {
  const baseline = assertBaselineShape(input.baseline, "TASK-540 bootstrap baseline");
  const expectedPair = validateTask540OperationInput(
    TASK540_BOOTSTRAP_RESTORE_OPERATION.inputSchemaId,
    {
      baseline,
      newestOwnedPair: input.newestOwnedPair,
      userId: baseline.id as string,
    }
  ).newestOwnedPair as PlainJsonObject;
  const before = assertBaselineShape(
    await dispatchTask540Operation(pool, {
      operationId: TASK540_BOOTSTRAP_READ_OPERATION.operationId,
      input: { userId: baseline.id as string },
    }),
    "TASK-540 bootstrap pre-restore observation"
  );
  assertOnlyOwnedTimestampsChanged(baseline, before, "TASK-540 bootstrap pre-restore state");
  runtimeInvariant(
    deepJsonEqual(exactPair(before.rawUserRow), expectedPair),
    "TASK-540 bootstrap newest owned pair drifted"
  );

  const restoreInput = validateTask540OperationInput(
    TASK540_BOOTSTRAP_RESTORE_OPERATION.inputSchemaId,
    { baseline, newestOwnedPair: expectedPair, userId: baseline.id as string }
  );
  const result = runtimeObject(
    await pool.dispatch(
      task540OperationDescriptor(TASK540_BOOTSTRAP_RESTORE_OPERATION),
      restoreInput
    ),
    "TASK-540 bootstrap restore"
  );
  const proof = runtimeObject(result.proof, "TASK-540 bootstrap restore proof");
  runtimeInvariant(
    result.kind === "committed" &&
      result.reason === null &&
      Object.keys(proof).length === RESTORE_PROOF_KEYS.length &&
      RESTORE_PROOF_KEYS.every((key) => proof[key] === true),
    "TASK-540 bootstrap CAS restore failed"
  );

  const after = assertBaselineShape(
    await dispatchTask540Operation(pool, {
      operationId: TASK540_BOOTSTRAP_READ_OPERATION.operationId,
      input: { userId: baseline.id as string },
    }),
    "TASK-540 bootstrap post-restore observation"
  );
  runtimeInvariant(deepJsonEqual(after, baseline), "TASK-540 bootstrap restore proof drifted");
  return Object.freeze({ kind: "committed", restored: true });
}
