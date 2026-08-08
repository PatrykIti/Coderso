import { WorkerProtocolError, type PlainJsonObject } from "../../../../workers/contracts";
import { TASK540_OPERATION_ALIASES } from "../../operations/aliases";
import type { Task540OperationParityRow } from "../../operations/contracts";

export const TASK540_RESPONSE_LOST_BASELINE_COUNT = 18;

export const TASK540_RESPONSE_LOST_BASELINE_OPERATIONS: readonly Task540OperationParityRow[] =
  Object.freeze(
    TASK540_OPERATION_ALIASES.filter(({ operationId }) =>
      operationId.startsWith("response-lost/preflight/")
    )
  );

if (TASK540_RESPONSE_LOST_BASELINE_OPERATIONS.length !== TASK540_RESPONSE_LOST_BASELINE_COUNT) {
  throw new WorkerProtocolError("TASK-540 response-lost baseline registry drifted");
}

export interface Task540ResponseLostBaselineInput {
  readonly operationId: string;
  readonly logicalId: string;
  readonly input: PlainJsonObject;
}

export function bindTask540ResponseLostBaselines(
  inputs: readonly Task540ResponseLostBaselineInput[]
): readonly Readonly<{
  logicalId: string;
  operation: Task540OperationParityRow;
  input: PlainJsonObject;
}>[] {
  if (
    inputs.length !== TASK540_RESPONSE_LOST_BASELINE_COUNT ||
    new Set(inputs.map(({ logicalId }) => logicalId)).size !== inputs.length
  ) {
    throw new WorkerProtocolError("TASK-540 response-lost baseline receipts drifted");
  }
  const expectedIds = new Set(
    TASK540_RESPONSE_LOST_BASELINE_OPERATIONS.map(({ operationId }) => operationId)
  );
  const bound = inputs.map(({ operationId, logicalId, input }) => {
    const operation = TASK540_RESPONSE_LOST_BASELINE_OPERATIONS.find(
      (candidate) => candidate.operationId === operationId
    );
    if (operation === undefined || !expectedIds.delete(operationId)) {
      throw new WorkerProtocolError("TASK-540 response-lost baseline operation drifted");
    }
    return Object.freeze({ logicalId, operation, input });
  });
  if (expectedIds.size !== 0) {
    throw new WorkerProtocolError("TASK-540 response-lost baseline operation is absent");
  }
  return Object.freeze(bound);
}
