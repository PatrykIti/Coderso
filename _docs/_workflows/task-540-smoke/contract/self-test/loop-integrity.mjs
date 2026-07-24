import { runHermeticOneLoopExecutorSelfTest } from "./helpers.mjs";

export function runLoopIntegritySelfTestSuite(plan, negative, runtimeIndex) {
  const reorderedPlan = {
    ...plan,
    actionManifest: Object.freeze([
      plan.actionManifest[1],
      plan.actionManifest[0],
      ...plan.actionManifest.slice(2),
    ]),
  };
  negative(() => runHermeticOneLoopExecutorSelfTest(reorderedPlan), "reordered ordinal loop");
  const corruptLoopRegistries = {
    ...plan.registries,
    runtimeOperations: {
      ...plan.registries.runtimeOperations,
      [plan.actionManifest[runtimeIndex].executable.operationId]: {
        actionId: "wrong-action",
        refCount: 999,
      },
    },
  };
  negative(
    () =>
      runHermeticOneLoopExecutorSelfTest({
        ...plan,
        registries: corruptLoopRegistries,
      }),
    "one-loop corrupt executable registry lookup"
  );
  const replayedPlan = {
    ...plan,
    actionManifest: Object.freeze([
      plan.actionManifest[0],
      plan.actionManifest[0],
      ...plan.actionManifest.slice(2),
    ]),
  };
  negative(() => runHermeticOneLoopExecutorSelfTest(replayedPlan), "replayed ordinal loop");
  return undefined;
}
