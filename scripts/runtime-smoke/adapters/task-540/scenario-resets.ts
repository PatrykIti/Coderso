import { SmokeError } from "../../contracts";

interface Task540ScenarioAction {
  readonly id: string;
  readonly scenario: string;
  readonly executable: {
    readonly type: string;
    readonly screenshotId?: string;
  };
}

export interface Task540ScenarioPlanSource {
  readonly actionManifest: readonly Task540ScenarioAction[];
  readonly requiredScenarios: readonly string[];
  readonly registries: {
    readonly screenshotPaths: Readonly<Record<string, string>>;
  };
}

export interface Task540ScenarioResetContract {
  readonly schemaVersion: 1;
  readonly ordinal: number;
  readonly scenarioId: string;
  readonly actionIds: readonly string[];
  readonly screenshotPaths: readonly string[];
  readonly prepareProofId: string;
  readonly verificationProofId: string;
  readonly resetProofId: string;
}

export function buildTask540ScenarioResetContracts(
  plan: Task540ScenarioPlanSource
): readonly Task540ScenarioResetContract[] {
  if (
    plan.requiredScenarios.length !== 7 ||
    new Set(plan.requiredScenarios).size !== plan.requiredScenarios.length
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 scenario registry drifted");
  }
  return Object.freeze(
    plan.requiredScenarios.map((scenarioId, index) => {
      const actions = plan.actionManifest.filter((action) => action.scenario === scenarioId);
      if (actions.length === 0) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 scenario action set is empty");
      }
      const screenshots = actions.flatMap((action) => {
        if (action.executable.type !== "browser-screenshot") return [];
        const screenshotId = action.executable.screenshotId;
        const path = screenshotId && plan.registries.screenshotPaths[screenshotId];
        if (typeof path !== "string") {
          throw new SmokeError("smoke_output_invalid", "TASK-540 screenshot registry drifted");
        }
        return [path];
      });
      return Object.freeze({
        schemaVersion: 1,
        ordinal: index + 1,
        scenarioId,
        actionIds: Object.freeze(actions.map(({ id }) => id)),
        screenshotPaths: Object.freeze(screenshots),
        prepareProofId: `task-540/${scenarioId}/prepare`,
        verificationProofId: `task-540/${scenarioId}/verify`,
        resetProofId: `task-540/${scenarioId}/reset`,
      });
    })
  );
}
