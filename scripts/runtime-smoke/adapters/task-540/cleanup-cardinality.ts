import { WorkerProtocolError } from "../../workers/contracts";

export const TASK540_CLEANUP_SEO_MAX_RESOURCES = 6;
export const TASK540_CLEANUP_DB_BASE_OPERATIONS = 14;
export const TASK540_CLEANUP_DB_OPERATIONS = 32;
export const TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS = 54;
export const TASK540_CLEANUP_LOGICAL_RECEIPTS = 72;

export interface Task540CleanupCardinality {
  readonly seoResources: number;
  readonly dbOperations: number;
  readonly logicalReceipts: number;
}

export function task540CleanupCardinality(seoResources: number): Task540CleanupCardinality {
  if (
    !Number.isSafeInteger(seoResources) ||
    seoResources < 0 ||
    seoResources > TASK540_CLEANUP_SEO_MAX_RESOURCES
  ) {
    throw new WorkerProtocolError("TASK-540 SEO cleanup cardinality is invalid");
  }
  return Object.freeze({
    seoResources,
    dbOperations: TASK540_CLEANUP_DB_BASE_OPERATIONS + seoResources * 3,
    logicalReceipts: TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS + seoResources * 3,
  });
}

export function isTask540CleanupLogicalReceiptCount(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS &&
    value <= TASK540_CLEANUP_LOGICAL_RECEIPTS &&
    (value - TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS) % 3 === 0
  );
}
