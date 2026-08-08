import { SmokeError } from "../../../../contracts";
import { requireTask540OperationAlias } from "../../operations/aliases";
import type { Task540OperationParityRow } from "../../operations/contracts";

export interface Task540RoutableOperation {
  readonly envProfileId: string;
  readonly operationId: string;
  readonly inputSchemaId?: string;
  readonly outputSchemaId?: string;
  readonly resourceKind?: string;
  readonly resourceSlot?: "provenance" | "cleanup" | "absence";
  readonly acquisitionChannel?: string;
}

export function routeTask540Operation(
  descriptor: Task540RoutableOperation
): Task540OperationParityRow {
  let operationId = descriptor.operationId;
  try {
    requireTask540OperationAlias(operationId);
  } catch {
    if (
      descriptor.resourceKind === undefined ||
      descriptor.resourceSlot === undefined ||
      (descriptor.resourceSlot === "provenance" && descriptor.acquisitionChannel === undefined)
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 operation is not allowlisted");
    }
    operationId =
      descriptor.resourceSlot === "provenance"
        ? `${descriptor.resourceKind}/provenance/${descriptor.acquisitionChannel}`
        : `${descriptor.resourceKind}/${descriptor.resourceSlot}`;
  }
  const row = requireTask540OperationAlias(operationId);
  if (
    row.profileId !== descriptor.envProfileId ||
    (descriptor.inputSchemaId !== undefined && descriptor.inputSchemaId !== row.inputSchemaId) ||
    (descriptor.outputSchemaId !== undefined && descriptor.outputSchemaId !== row.outputSchemaId)
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 operation authority drifted");
  }
  return row;
}
