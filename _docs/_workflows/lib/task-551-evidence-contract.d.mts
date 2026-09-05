import type {
  Task551EvidenceFaultPlanV1,
  Task551EvidenceRowId,
  Task551EvidenceWriteReceiptV1,
  Task551EvidenceWriteValueV1,
  Task551RecoverySummary,
} from "./task-551-contract.mjs";

type Task551EvidenceTestHarness = Readonly<{
  recover: () => Promise<Task551RecoverySummary>;
  write: (
    rowId: Task551EvidenceRowId,
    value: Task551EvidenceWriteValueV1
  ) => Promise<Task551EvidenceWriteReceiptV1>;
  stage: (
    rowId: Task551EvidenceRowId,
    value: Task551EvidenceWriteValueV1,
    count?: number
  ) => Promise<true>;
  restart: () => Promise<Task551EvidenceTestHarness>;
  faults: (faults: readonly string[] | Task551EvidenceFaultPlanV1) => Promise<unknown>;
}>;

export function createTask551EvidenceTestHarnessForTests(): Promise<Task551EvidenceTestHarness>;
