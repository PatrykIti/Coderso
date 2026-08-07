import { SmokeError } from "../../../../contracts";
import type { PlainJsonValue } from "../../../../workers/contracts";
import { deepFreezeExact } from "../executor/foundation.mjs";
import { validateExactJsonSchema } from "../executor/json-schema.mjs";
import { assertExactOutputContractDescriptor } from "../executor/output-parser.mjs";
import { evaluateExactPredicate } from "../executor/ref-dsl.mjs";
import type { Task540NativeAction, Task540NativePlan } from "./contracts";
import type { Task540ExecutionMemory } from "./memory";

export function validateTask540ActionOutput(input: {
  readonly root: string;
  readonly plan: Task540NativePlan;
  readonly action: Task540NativeAction;
  readonly memory: Task540ExecutionMemory;
  readonly output: PlainJsonValue;
}): PlainJsonValue {
  const contract = input.plan.registries.outputs[input.action.outputSchemaId];
  if (contract === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 output contract is absent");
  }
  try {
    assertExactOutputContractDescriptor(contract, `TASK-540 ${input.action.id} output contract`);
    validateExactJsonSchema(contract.schema, input.output, `TASK-540 ${input.action.id} output`);
    if (
      contract.predicate !== null &&
      !evaluateExactPredicate(
        contract.predicate,
        {
          root: input.root,
          plan: input.plan,
          captures: input.memory.captures,
          priorOutputs: input.memory.priorOutputs,
          variables: input.memory.variables,
          currentOutput: input.output,
        },
        `TASK-540 ${input.action.id} output predicate`
      )
    ) {
      throw new Error("TASK-540 output predicate failed");
    }
    return deepFreezeExact(input.output) as PlainJsonValue;
  } catch (error) {
    throw new SmokeError(
      "smoke_output_invalid",
      `TASK-540 action output contract failed: ${input.action.id}`,
      { cause: error }
    );
  }
}
