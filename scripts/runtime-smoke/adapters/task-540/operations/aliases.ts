import { WorkerProtocolError } from "../../../workers/contracts";
import {
  materializeTask540OperationSeed,
  type Task540OperationCategory,
  type Task540OperationParityRow,
} from "./contracts";
import { TASK540_CANONICAL_OPERATION_SEEDS } from "./packs/canonical";
import { TASK540_EXPLICIT_OPERATION_SEEDS } from "./packs/explicit";
import { TASK540_RESOURCES_OPERATION_SEEDS } from "./packs/resources";
import { TASK540_RESPONSE_LOST_OPERATION_SEEDS } from "./packs/response-lost";

const EXPECTED_CATEGORY_COUNTS: Readonly<Record<Task540OperationCategory, number>> = Object.freeze({
  canonical: 57,
  "explicit-alias": 26,
  "response-lost-alias": 36,
  "resource-alias": 41,
});

export function createTask540OperationAliases(): readonly Task540OperationParityRow[] {
  const rows = [
    ...TASK540_CANONICAL_OPERATION_SEEDS,
    ...TASK540_EXPLICIT_OPERATION_SEEDS,
    ...TASK540_RESPONSE_LOST_OPERATION_SEEDS,
    ...TASK540_RESOURCES_OPERATION_SEEDS,
  ]
    .map(materializeTask540OperationSeed)
    .sort((left, right) => left.operationId.localeCompare(right.operationId));
  if (rows.length !== 160 || new Set(rows.map(({ operationId }) => operationId)).size !== 160) {
    throw new WorkerProtocolError("TASK-540 operation alias registry cardinality drifted");
  }
  for (const [category, expected] of Object.entries(EXPECTED_CATEGORY_COUNTS)) {
    if (rows.filter((row) => row.category === category).length !== expected) {
      throw new WorkerProtocolError("TASK-540 operation alias category drifted");
    }
  }
  const handlerIds = new Set(rows.map(({ handlerId }) => handlerId));
  if (handlerIds.size !== 57) {
    throw new WorkerProtocolError("TASK-540 operation handler reachability drifted");
  }
  return Object.freeze(rows);
}

export const TASK540_OPERATION_ALIASES = createTask540OperationAliases();

export function assertTask540OperationParity(
  rows: readonly Task540OperationParityRow[],
  expected: readonly Task540OperationParityRow[] = TASK540_OPERATION_ALIASES
): void {
  if (
    rows.length !== expected.length ||
    rows.some((row, index) => {
      const reference = expected[index];
      return (
        reference === undefined ||
        row.operationId !== reference.operationId ||
        row.handlerId !== reference.handlerId ||
        row.profileId !== reference.profileId ||
        row.inputSchemaId !== reference.inputSchemaId ||
        row.outputSchemaId !== reference.outputSchemaId ||
        row.retryClass !== reference.retryClass ||
        row.handlerArtifactSha256 !== reference.handlerArtifactSha256 ||
        row.category !== reference.category
      );
    })
  ) {
    throw new WorkerProtocolError("TASK-540 operation parity drifted");
  }
}

const TASK540_OPERATION_BY_ID = new Map(
  TASK540_OPERATION_ALIASES.map((row) => [row.operationId, row])
);

export function requireTask540OperationAlias(operationId: string): Task540OperationParityRow {
  const row = TASK540_OPERATION_BY_ID.get(operationId);
  if (row === undefined) throw new WorkerProtocolError("TASK-540 operation ID is not allowlisted");
  return row;
}
