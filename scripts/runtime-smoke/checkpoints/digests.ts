import { createHash } from "node:crypto";
import { SmokeError } from "../contracts";
import type {
  CheckpointIdentity,
  ScenarioCheckpoint,
  ScenarioCheckpointContract,
  ScenarioCheckpointProof,
} from "./contracts";
import {
  validateCheckpointIdentity,
  validateScenarioCheckpoint,
  validateScenarioCheckpointContract,
  validateScenarioCheckpointProof,
} from "./contracts";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function checkpointDigest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function checkpointIdentityDigest(identity: CheckpointIdentity): string {
  return checkpointDigest(validateCheckpointIdentity(identity));
}

export function sealScenarioCheckpoint(
  identityInput: CheckpointIdentity,
  proofInput: ScenarioCheckpointProof
): ScenarioCheckpoint {
  const identity = validateCheckpointIdentity(identityInput);
  const proof = validateScenarioCheckpointProof(proofInput);
  const unsealed = {
    schemaVersion: 1 as const,
    identitySha256: checkpointIdentityDigest(identity),
    suiteId: identity.suiteId,
    profileId: identity.profileId,
    runId: identity.runId,
    ...proof,
  };
  return Object.freeze({ ...unsealed, sealedSha256: checkpointDigest(unsealed) });
}

export function assertCheckpointCompatible(
  value: ScenarioCheckpoint,
  identityInput: CheckpointIdentity,
  contractsInput: readonly ScenarioCheckpointContract[]
): ScenarioCheckpoint {
  const checkpoint = validateScenarioCheckpoint(value);
  const identity = validateCheckpointIdentity(identityInput);
  if (!Array.isArray(contractsInput) || contractsInput.length === 0) {
    throw new SmokeError("smoke_output_invalid", "scenario checkpoint contracts are absent");
  }
  const contracts = contractsInput.map(validateScenarioCheckpointContract);
  const expected = contracts.find(({ ordinal }) => ordinal === checkpoint.ordinal);
  const { sealedSha256, ...unsealed } = checkpoint;
  if (
    expected === undefined ||
    expected.scenarioId !== checkpoint.scenarioId ||
    expected.scenarioSha256 !== checkpoint.scenarioSha256 ||
    expected.resetSha256 !== checkpoint.resetSha256 ||
    expected.actionIds.length !== checkpoint.completedActionIds.length ||
    expected.actionIds.some(
      (actionId, index) => actionId !== checkpoint.completedActionIds[index]
    ) ||
    checkpoint.identitySha256 !== checkpointIdentityDigest(identity) ||
    checkpoint.suiteId !== identity.suiteId ||
    checkpoint.profileId !== identity.profileId ||
    checkpoint.runId !== identity.runId ||
    checkpointDigest(unsealed) !== sealedSha256
  ) {
    throw new SmokeError("smoke_output_invalid", "scenario checkpoint is stale or tampered");
  }
  return checkpoint;
}

export function encodeCheckpoint(checkpoint: ScenarioCheckpoint): string {
  const validated = validateScenarioCheckpoint(checkpoint);
  const { sealedSha256, ...unsealed } = validated;
  if (checkpointDigest(unsealed) !== sealedSha256) {
    throw new SmokeError("smoke_output_invalid", "scenario checkpoint seal is invalid");
  }
  return `${canonical(validated)}\n`;
}
