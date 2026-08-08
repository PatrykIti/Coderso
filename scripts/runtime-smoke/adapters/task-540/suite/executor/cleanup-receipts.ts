export {
  TASK540_BASELINE_LOGICAL_RECEIPTS,
  TASK540_CLEANUP_DB_OPERATIONS,
  TASK540_CLEANUP_LOGICAL_RECEIPTS,
  TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS,
  TASK540_CLEANUP_SEO_MAX_RESOURCES,
  assertTask540SeoBatchBudget,
  buildTask540BaselineDispatches,
  buildTask540CleanupDispatches,
  preserveTask540CanonicalCleanupReceipts,
  isTask540CleanupLogicalReceiptCount,
  task540CleanupCardinality,
  type Task540BaselineDispatch,
  type Task540CleanupDispatch,
  type Task540DbCleanupOperation,
} from "../../cleanup-batches";

export const TASK540_CLEANUP_API_NODE_OPERATIONS = 40;
