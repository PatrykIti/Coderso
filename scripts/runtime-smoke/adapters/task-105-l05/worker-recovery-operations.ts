import { SmokeError, assertExactKeys } from "../../contracts";
import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
  WorkerOperationDefinition,
  WorkerOperationDescriptor,
} from "../../workers/contracts";
import { proveTask105L05Recovery, recoverTask105L05 } from "./recovery-db";
import {
  validateTask105L05RecoveryAuthority,
  type Task105L05RecoveryAuthority,
} from "./recovery-receipt";

/** Private recovery/absence worker operations; no record fields cross output. */

export interface Task105L05RecoveryWorkerDescriptors {
  readonly recover: WorkerOperationDescriptor;
  readonly proveAbsent: WorkerOperationDescriptor;
}

interface RecoveryAuthorityInput extends PlainJsonObject {
  readonly authority: Task105L05RecoveryAuthority;
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new SmokeError("smoke_output_invalid", `${label} is not a plain object`);
  }
  return value as Record<string, unknown>;
}

export function validateTask105L05RecoveryAuthorityInput(value: unknown): RecoveryAuthorityInput {
  const record = plainObject(value, "TASK-105 L05 recovery operation input");
  assertExactKeys(record, ["authority"], "TASK-105 L05 recovery operation input");
  return Object.freeze({ authority: validateTask105L05RecoveryAuthority(record.authority) });
}

function validateRecoveredOutput(value: unknown): Readonly<{ readonly recovered: true }> {
  const record = plainObject(value, "TASK-105 L05 recovery output");
  assertExactKeys(record, ["recovered"], "TASK-105 L05 recovery output");
  if (record.recovered !== true)
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 recovery output is invalid");
  return Object.freeze({ recovered: true });
}

function validateAbsentOutput(value: unknown): Readonly<{ readonly absent: true }> {
  const record = plainObject(value, "TASK-105 L05 recovery absence output");
  assertExactKeys(record, ["absent"], "TASK-105 L05 recovery absence output");
  if (record.absent !== true)
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 recovery absence output is invalid");
  return Object.freeze({ absent: true });
}

function definition<TOutput extends PlainJsonValue>(
  descriptor: WorkerOperationDescriptor,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: RecoveryAuthorityInput) => Promise<TOutput>
): WorkerOperationDefinition<RecoveryAuthorityInput, TOutput> {
  return Object.freeze({
    ...descriptor,
    validateInput: validateTask105L05RecoveryAuthorityInput,
    validateOutput,
    execute: (input: RecoveryAuthorityInput, _context: WorkerOperationContext) => execute(input),
  });
}

export function createTask105L05RecoveryWorkerDefinitions(
  descriptors: Task105L05RecoveryWorkerDescriptors
): readonly WorkerOperationDefinition[] {
  return Object.freeze([
    definition(descriptors.recover, validateRecoveredOutput, ({ authority }) =>
      recoverTask105L05(authority)
    ),
    definition(descriptors.proveAbsent, validateAbsentOutput, ({ authority }) =>
      proveTask105L05Recovery(authority)
    ),
  ]);
}
