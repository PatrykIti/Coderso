import {
  MAX_WORKER_FRAME_BYTES,
  WorkerProtocolError,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationContext,
  type WorkerOperationDefinition,
  type WorkerOperationDescriptor,
} from "../../../workers/contracts";
import {
  WorkerOperationRegistry,
  type WorkerRegistryHooks,
} from "../../../workers/operation-registry";
import { TASK540_OPERATION_ALIASES, assertTask540OperationParity } from "./aliases";
import {
  validateTask540OperationInput,
  validateTask540OperationOutput,
  type Task540OperationParityRow,
  type Task540TypedHandler,
} from "./contracts";
import {
  createTask540TypedHandlers,
  executeTask540TypedHandler,
  requireTask540TypedHandler,
} from "./handlers";

export function task540OperationDescriptor(
  row: Task540OperationParityRow
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId: row.operationId,
    profileId: row.profileId,
    inputSchemaId: row.inputSchemaId,
    outputSchemaId: row.outputSchemaId,
    sourceSha256: row.handlerArtifactSha256,
    retryClass: row.retryClass,
    maxInputBytes: MAX_WORKER_FRAME_BYTES,
    maxOutputBytes: MAX_WORKER_FRAME_BYTES,
  });
}

export function createTask540OperationDefinitions(
  rows: readonly Task540OperationParityRow[] = TASK540_OPERATION_ALIASES,
  handlers: ReadonlyMap<string, Task540TypedHandler> = createTask540TypedHandlers()
): readonly WorkerOperationDefinition[] {
  if (rows.length !== 160 || handlers.size !== 57) {
    throw new WorkerProtocolError("TASK-540 operation registry cardinality drifted");
  }
  assertTask540OperationParity(rows);
  const reachableHandlers = new Set<string>();
  const operationIds = new Set<string>();
  const definitions = rows.map((row): WorkerOperationDefinition => {
    if (operationIds.has(row.operationId)) {
      throw new WorkerProtocolError("TASK-540 operation ID is duplicated");
    }
    operationIds.add(row.operationId);
    const handler = requireTask540TypedHandler(handlers, row.handlerId);
    if (handler.handlerArtifactSha256 !== row.handlerArtifactSha256) {
      throw new WorkerProtocolError("TASK-540 handler artifact authority drifted");
    }
    reachableHandlers.add(row.handlerId);
    return Object.freeze({
      ...task540OperationDescriptor(row),
      validateInput(value: unknown): PlainJsonObject {
        return validateTask540OperationInput(row.inputSchemaId, value);
      },
      validateOutput(value: unknown): PlainJsonValue {
        return validateTask540OperationOutput(row, null, value);
      },
      async execute(
        input: PlainJsonObject,
        context: WorkerOperationContext
      ): Promise<PlainJsonValue> {
        if (context.profileId !== row.profileId) {
          throw new WorkerProtocolError("TASK-540 handler profile authority drifted");
        }
        const output = await executeTask540TypedHandler(handler, input, context);
        return validateTask540OperationOutput(row, input, output);
      },
    });
  });
  if (reachableHandlers.size !== handlers.size) {
    throw new WorkerProtocolError("TASK-540 handler is unreachable from its aliases");
  }
  return Object.freeze(definitions);
}

export function createTask540OperationRegistry(
  hooks: WorkerRegistryHooks = {},
  rows: readonly Task540OperationParityRow[] = TASK540_OPERATION_ALIASES,
  handlers: ReadonlyMap<string, Task540TypedHandler> = createTask540TypedHandlers()
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(createTask540OperationDefinitions(rows, handlers), hooks);
}
