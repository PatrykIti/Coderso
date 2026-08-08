import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
} from "../../../../workers/contracts";
import {
  task540HandlerArtifactSha256,
  type Task540InputFor,
  type Task540TypedHandler,
} from "../contracts";

function requireAccessLogInput(
  inputValue: PlainJsonObject
): Task540InputFor<"identifier-uuid-input-v1"> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  ) {
    throw new Error("wf540_input");
  }
  return input;
}

export async function handleResourceAccessLogAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = requireAccessLogInput(inputValue);
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { accessLogs } = await import("../../../../../../core/db/schema");
  const [id] = input.identifier;
  const before = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(eq(accessLogs.id, id))
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(eq(accessLogs.id, id))
    .limit(2);
  if (after.length !== 0) throw new Error("wf540_terminal_absence");
  return { absent: true, affected, present: before.length === 1 };
}

export async function handleResourceAccessLogDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = requireAccessLogInput(inputValue);
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { accessLogs } = await import("../../../../../../core/db/schema");
  const [id] = input.identifier;
  const before = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(eq(accessLogs.id, id))
    .limit(2);
  const affected = (
    await db.delete(accessLogs).where(eq(accessLogs.id, id)).returning({ id: accessLogs.id })
  ).length;
  const after = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(eq(accessLogs.id, id))
    .limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_terminal_delete");
  return { absent: true, affected, present: before.length === 1 };
}

export async function handleResourceAccessLogProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = requireAccessLogInput(inputValue);
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { accessLogs } = await import("../../../../../../core/db/schema");
  const [id] = input.identifier;
  const before = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(eq(accessLogs.id, id))
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(eq(accessLogs.id, id))
    .limit(2);
  if (before.length !== 1) throw new Error("wf540_terminal_provenance");
  return { absent: after.length === 0, affected, present: true };
}

export const TASK540_ACCESS_LOG_HANDLERS: readonly Task540TypedHandler[] = Object.freeze([
  Object.freeze({
    handlerId: "source/resource/access-log/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/access-log/absence"),
    execute: handleResourceAccessLogAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/access-log/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/access-log/delete"),
    execute: handleResourceAccessLogDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/access-log/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/access-log/provenance"),
    execute: handleResourceAccessLogProvenance,
  }),
]);
