import { createActionExecutorContentDeps } from "./actionExecutorContentDeps";
import { createActionExecutorEngagementDeps } from "./actionExecutorEngagementDeps";
import {
  createActionExecutorTestState,
  type ActionExecutorTestState,
} from "./actionExecutorTestState";

type ExecutorDeps = NonNullable<
  Parameters<
    (typeof import("../../../../core/services/assistant/actionExecutorService"))["dryRunAssistantActionPlan"]
  >[1]
>;

export const createActionExecutorTestDeps = () => {
  const state = createActionExecutorTestState();
  const testDeps = Object.assign(
    {
      ...createActionExecutorContentDeps(state),
      ...createActionExecutorEngagementDeps(state),
      logAudit: async () => ({
        id: "audit-1",
        actorId: "user-1",
        action: "assistant.actions.execute",
        targetType: "assistant-action-plan",
        targetId: "plan-house-projects-catalog",
        metadata: {},
        createdAt: new Date("2026-04-10T12:00:00.000Z"),
      }),
    },
    { __state: state }
  );
  const deps = testDeps as unknown as typeof testDeps &
    ExecutorDeps & {
      __state: ActionExecutorTestState;
    };

  return { deps, state };
};

export type ActionExecutorTestDepsResult = ReturnType<typeof createActionExecutorTestDeps>;
