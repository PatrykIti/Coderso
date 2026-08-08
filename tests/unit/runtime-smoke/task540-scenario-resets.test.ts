import { expect, test } from "bun:test";
import path from "node:path";
import {
  buildTask540ScenarioResetContracts,
  type Task540ScenarioPlanSource,
} from "../../../scripts/runtime-smoke/adapters/task-540/scenario-resets";

interface PlanModule {
  readonly buildTask540SmokePlan: (input: { readonly nonce: string }) => Task540ScenarioPlanSource;
}

test("TASK-540 reset contracts cover seven scenarios and all 13 screenshots", async () => {
  const root = path.resolve(import.meta.dir, "../../..");
  const module: PlanModule = await import(
    path.join(root, "scripts/runtime-smoke/adapters/task-540/suite/contract/plan.mjs")
  );
  const plan = module.buildTask540SmokePlan({ nonce: "0123456789ab" });
  const contracts = buildTask540ScenarioResetContracts(plan);
  expect(contracts.map(({ scenarioId }) => scenarioId)).toEqual(plan.requiredScenarios);
  expect(contracts.flatMap(({ screenshotPaths }) => screenshotPaths)).toEqual(
    Object.values(plan.registries.screenshotPaths)
  );
  expect(contracts.flatMap(({ actionIds }) => actionIds)).toEqual(
    plan.actionManifest
      .filter(({ scenario }) => plan.requiredScenarios.includes(scenario))
      .map(({ id }) => id)
  );
  expect(
    contracts.every(
      ({ scenarioId, prepareProofId, verificationProofId, resetProofId }) =>
        prepareProofId === `task-540/${scenarioId}/prepare` &&
        verificationProofId === `task-540/${scenarioId}/verify` &&
        resetProofId === `task-540/${scenarioId}/reset`
    )
  ).toBe(true);
});
