import {
  WorkerProtocolError,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationContext,
} from "../../../../workers/contracts";
import type { Task540TypedHandler } from "../contracts";
import { TASK540_ACCESS_LOG_HANDLERS } from "./access-log";
import { TASK540_BOOTSTRAP_HANDLERS } from "./bootstrap";
import { TASK540_PLATFORM_HANDLERS } from "./platform";
import { TASK540_RESOURCE_HANDLERS } from "./resources";
import { TASK540_RESPONSE_LOST_HANDLERS } from "./response-lost";
import { TASK540_USER_PREFERENCE_HANDLERS } from "./user-preference";

const HANDLER_GROUPS = Object.freeze([
  TASK540_ACCESS_LOG_HANDLERS,
  TASK540_BOOTSTRAP_HANDLERS,
  TASK540_PLATFORM_HANDLERS,
  TASK540_RESOURCE_HANDLERS,
  TASK540_RESPONSE_LOST_HANDLERS,
  TASK540_USER_PREFERENCE_HANDLERS,
]);

export function createTask540TypedHandlers(): ReadonlyMap<string, Task540TypedHandler> {
  const handlers = new Map<string, Task540TypedHandler>();
  for (const handler of HANDLER_GROUPS.flat()) {
    if (handlers.has(handler.handlerId)) {
      throw new WorkerProtocolError("TASK-540 handler ID is duplicated");
    }
    handlers.set(handler.handlerId, Object.freeze(handler));
  }
  if (handlers.size !== 57) {
    throw new WorkerProtocolError("TASK-540 handler registry cardinality drifted");
  }
  return handlers;
}

export function requireTask540TypedHandler(
  handlers: ReadonlyMap<string, Task540TypedHandler>,
  handlerId: string
): Task540TypedHandler {
  const handler = handlers.get(handlerId);
  if (handler === undefined) throw new WorkerProtocolError("TASK-540 handler is not registered");
  return handler;
}

export async function executeTask540TypedHandler(
  handler: Task540TypedHandler,
  input: PlainJsonObject,
  context: WorkerOperationContext
): Promise<PlainJsonValue> {
  return handler.execute(input, context);
}
