import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CheckpointStore } from "../../../scripts/runtime-smoke/checkpoints/store";
import {
  assertCheckpointCompatible,
  sealScenarioCheckpoint,
} from "../../../scripts/runtime-smoke/checkpoints/digests";
import type {
  CheckpointIdentity,
  ScenarioCheckpointContract,
  ScenarioCheckpointProof,
} from "../../../scripts/runtime-smoke/checkpoints/contracts";

const digest = (character: string): string => character.repeat(64);
const identity: CheckpointIdentity = {
  schemaVersion: 1,
  suiteId: "task-540",
  profileId: "fast",
  runId: "run-1",
  revisionSha256: digest("1"),
  workingTreeSha256: digest("2"),
  harnessSha256: digest("3"),
  manifestSha256: digest("4"),
  fixtureNamespaceSha256: digest("5"),
  fixtureLedgerSha256: digest("6"),
  originSha256: digest("7"),
};
const proof: ScenarioCheckpointProof = {
  scenarioId: "button-image",
  ordinal: 1,
  completedActionIds: ["bi-001", "bi-002"],
  scenarioSha256: digest("8"),
  resetSha256: digest("9"),
  evidenceSha256: [digest("a"), digest("b")],
  cleanupProofSha256: digest("c"),
};
const contract: ScenarioCheckpointContract = {
  scenarioId: proof.scenarioId,
  ordinal: proof.ordinal,
  actionIds: proof.completedActionIds,
  scenarioSha256: proof.scenarioSha256,
  resetSha256: proof.resetSha256,
};

test("scenario checkpoint binds every identity digest and rejects tampering", () => {
  const checkpoint = sealScenarioCheckpoint(identity, proof);
  expect(assertCheckpointCompatible(checkpoint, identity, [contract])).toEqual(checkpoint);
  expect(() =>
    assertCheckpointCompatible(checkpoint, { ...identity, harnessSha256: digest("d") }, [contract])
  ).toThrow();
  expect(() =>
    assertCheckpointCompatible({ ...checkpoint, resetSha256: digest("e") }, identity, [contract])
  ).toThrow();
  expect(() =>
    assertCheckpointCompatible({ ...checkpoint, unknown: true } as never, identity, [contract])
  ).toThrow();
});

test("checkpoint store writes atomically and loads only the newest compatible seal", async () => {
  const root = await mkdtemp(join(tmpdir(), "coderso-checkpoint-"));
  try {
    const store = new CheckpointStore(root, "checkpoints");
    const first = sealScenarioCheckpoint(identity, proof);
    const second = sealScenarioCheckpoint(identity, {
      ...proof,
      scenarioId: "tabs-content",
      ordinal: 2,
      completedActionIds: [...proof.completedActionIds, "tc-001"],
      scenarioSha256: digest("d"),
    });
    const secondContract: ScenarioCheckpointContract = {
      scenarioId: second.scenarioId,
      ordinal: second.ordinal,
      actionIds: second.completedActionIds,
      scenarioSha256: second.scenarioSha256,
      resetSha256: second.resetSha256,
    };
    await store.save(first);
    await store.save(second);
    expect(await store.loadLatestCompatible(identity, [contract, secondContract])).toEqual(second);
    await expect(
      store.loadLatestCompatible(identity, [
        contract,
        { ...secondContract, resetSha256: digest("f") },
      ])
    ).rejects.toThrow();
    const bytes = await readFile(join(root, "checkpoints", "2-tabs-content.json"));
    const parsed = JSON.parse(bytes.toString("utf8"));
    await writeFile(
      join(root, "checkpoints", "2-tabs-content.json"),
      `${JSON.stringify({ ...parsed, cleanupProofSha256: digest("e") })}\n`
    );
    await expect(
      store.loadLatestCompatible(identity, [contract, secondContract])
    ).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
