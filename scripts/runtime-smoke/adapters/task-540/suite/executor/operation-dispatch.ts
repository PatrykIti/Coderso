import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";
import type { WorkerPool } from "../../../../workers/pool";
import { requireTask540OperationAlias } from "../../operations/aliases";
import { validateTask540OperationInput } from "../../operations/contracts";
import { task540OperationDescriptor } from "../../operations/registry";

export interface Task540OperationDispatch {
  readonly operationId: string;
  readonly input: PlainJsonObject;
  readonly executionBoundaryObserver?: (() => void | Promise<void>) | null;
}

export async function dispatchTask540Operation(
  pool: WorkerPool,
  request: Task540OperationDispatch
): Promise<PlainJsonValue> {
  const alias = requireTask540OperationAlias(request.operationId);
  const input = validateTask540OperationInput(alias.inputSchemaId, request.input);
  return pool.dispatch(
    task540OperationDescriptor(alias),
    input,
    request.executionBoundaryObserver ?? null
  );
}
