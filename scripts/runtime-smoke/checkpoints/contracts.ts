import { SmokeError, assertExactKeys, isPlainObject } from "../contracts";

export const CHECKPOINT_SCHEMA_VERSION = 1 as const;
export const MAX_CHECKPOINT_BYTES = 256 * 1024;
export const MAX_CHECKPOINT_ACTIONS = 10_000;
export const MAX_CHECKPOINT_EVIDENCE = 128;

const TOKEN = /^[a-z0-9][a-z0-9._/-]{0,159}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

export interface CheckpointIdentity {
  readonly schemaVersion: 1;
  readonly suiteId: string;
  readonly profileId: string;
  readonly runId: string;
  readonly revisionSha256: string;
  readonly workingTreeSha256: string;
  readonly harnessSha256: string;
  readonly manifestSha256: string;
  readonly fixtureNamespaceSha256: string;
  readonly fixtureLedgerSha256: string;
  readonly originSha256: string;
}

export interface ScenarioCheckpointProof {
  readonly scenarioId: string;
  readonly ordinal: number;
  readonly completedActionIds: readonly string[];
  readonly scenarioSha256: string;
  readonly resetSha256: string;
  readonly evidenceSha256: readonly string[];
  readonly cleanupProofSha256: string;
}

export interface ScenarioCheckpointContract {
  readonly scenarioId: string;
  readonly ordinal: number;
  readonly actionIds: readonly string[];
  readonly scenarioSha256: string;
  readonly resetSha256: string;
}

export interface ScenarioCheckpoint {
  readonly schemaVersion: 1;
  readonly identitySha256: string;
  readonly suiteId: string;
  readonly profileId: string;
  readonly runId: string;
  readonly scenarioId: string;
  readonly ordinal: number;
  readonly completedActionIds: readonly string[];
  readonly scenarioSha256: string;
  readonly resetSha256: string;
  readonly evidenceSha256: readonly string[];
  readonly cleanupProofSha256: string;
  readonly sealedSha256: string;
}

function invalid(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function token(value: unknown, label: string): string {
  if (typeof value !== "string" || !TOKEN.test(value)) invalid(`${label} is invalid`);
  return value as string;
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !SHA256.test(value)) invalid(`${label} is invalid`);
  return value as string;
}

function uniqueTokens(value: unknown, label: string, maximum: number): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximum ||
    value.some((entry) => typeof entry !== "string" || !TOKEN.test(entry)) ||
    new Set(value).size !== value.length
  ) {
    invalid(`${label} is invalid`);
  }
  return Object.freeze([...(value as string[])]);
}

function uniqueDigests(value: unknown, label: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_CHECKPOINT_EVIDENCE ||
    value.some((entry) => typeof entry !== "string" || !SHA256.test(entry)) ||
    new Set(value).size !== value.length
  ) {
    invalid(`${label} is invalid`);
  }
  return Object.freeze([...(value as string[])]);
}

export function validateCheckpointIdentity(value: unknown): CheckpointIdentity {
  if (!isPlainObject(value)) invalid("checkpoint identity is not a plain object");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "suiteId",
      "profileId",
      "runId",
      "revisionSha256",
      "workingTreeSha256",
      "harnessSha256",
      "manifestSha256",
      "fixtureNamespaceSha256",
      "fixtureLedgerSha256",
      "originSha256",
    ],
    "checkpoint identity"
  );
  if (value.schemaVersion !== CHECKPOINT_SCHEMA_VERSION)
    invalid("checkpoint identity version drifted");
  return Object.freeze({
    schemaVersion: 1,
    suiteId: token(value.suiteId, "checkpoint suite ID"),
    profileId: token(value.profileId, "checkpoint profile ID"),
    runId: token(value.runId, "checkpoint run ID"),
    revisionSha256: digest(value.revisionSha256, "checkpoint revision digest"),
    workingTreeSha256: digest(value.workingTreeSha256, "checkpoint worktree digest"),
    harnessSha256: digest(value.harnessSha256, "checkpoint harness digest"),
    manifestSha256: digest(value.manifestSha256, "checkpoint manifest digest"),
    fixtureNamespaceSha256: digest(
      value.fixtureNamespaceSha256,
      "checkpoint fixture namespace digest"
    ),
    fixtureLedgerSha256: digest(value.fixtureLedgerSha256, "checkpoint fixture ledger digest"),
    originSha256: digest(value.originSha256, "checkpoint origin digest"),
  });
}

export function validateScenarioCheckpointProof(value: unknown): ScenarioCheckpointProof {
  if (!isPlainObject(value)) invalid("scenario checkpoint proof is not a plain object");
  assertExactKeys(
    value,
    [
      "scenarioId",
      "ordinal",
      "completedActionIds",
      "scenarioSha256",
      "resetSha256",
      "evidenceSha256",
      "cleanupProofSha256",
    ],
    "scenario checkpoint proof"
  );
  if (!Number.isSafeInteger(value.ordinal) || (value.ordinal as number) <= 0) {
    invalid("scenario checkpoint ordinal is invalid");
  }
  return Object.freeze({
    scenarioId: token(value.scenarioId, "checkpoint scenario ID"),
    ordinal: value.ordinal as number,
    completedActionIds: uniqueTokens(
      value.completedActionIds,
      "checkpoint completed actions",
      MAX_CHECKPOINT_ACTIONS
    ),
    scenarioSha256: digest(value.scenarioSha256, "checkpoint scenario digest"),
    resetSha256: digest(value.resetSha256, "checkpoint reset digest"),
    evidenceSha256: uniqueDigests(value.evidenceSha256, "checkpoint evidence digests"),
    cleanupProofSha256: digest(value.cleanupProofSha256, "checkpoint cleanup proof digest"),
  });
}

export function validateScenarioCheckpointContract(value: unknown): ScenarioCheckpointContract {
  if (!isPlainObject(value)) invalid("scenario checkpoint contract is not a plain object");
  assertExactKeys(
    value,
    ["scenarioId", "ordinal", "actionIds", "scenarioSha256", "resetSha256"],
    "scenario checkpoint contract"
  );
  if (!Number.isSafeInteger(value.ordinal) || (value.ordinal as number) <= 0) {
    invalid("scenario checkpoint contract ordinal is invalid");
  }
  return Object.freeze({
    scenarioId: token(value.scenarioId, "checkpoint contract scenario ID"),
    ordinal: value.ordinal as number,
    actionIds: uniqueTokens(value.actionIds, "checkpoint contract actions", MAX_CHECKPOINT_ACTIONS),
    scenarioSha256: digest(value.scenarioSha256, "checkpoint contract scenario digest"),
    resetSha256: digest(value.resetSha256, "checkpoint contract reset digest"),
  });
}

export function validateScenarioCheckpoint(value: unknown): ScenarioCheckpoint {
  if (!isPlainObject(value)) invalid("scenario checkpoint is not a plain object");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "identitySha256",
      "suiteId",
      "profileId",
      "runId",
      "scenarioId",
      "ordinal",
      "completedActionIds",
      "scenarioSha256",
      "resetSha256",
      "evidenceSha256",
      "cleanupProofSha256",
      "sealedSha256",
    ],
    "scenario checkpoint"
  );
  if (value.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) invalid("checkpoint version drifted");
  const proof = validateScenarioCheckpointProof({
    scenarioId: value.scenarioId,
    ordinal: value.ordinal,
    completedActionIds: value.completedActionIds,
    scenarioSha256: value.scenarioSha256,
    resetSha256: value.resetSha256,
    evidenceSha256: value.evidenceSha256,
    cleanupProofSha256: value.cleanupProofSha256,
  });
  return Object.freeze({
    schemaVersion: 1,
    identitySha256: digest(value.identitySha256, "checkpoint identity digest"),
    suiteId: token(value.suiteId, "checkpoint suite ID"),
    profileId: token(value.profileId, "checkpoint profile ID"),
    runId: token(value.runId, "checkpoint run ID"),
    ...proof,
    sealedSha256: digest(value.sealedSha256, "checkpoint seal digest"),
  });
}
