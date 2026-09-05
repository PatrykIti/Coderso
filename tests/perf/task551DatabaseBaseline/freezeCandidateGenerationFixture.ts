import type { Task551ReviewableFreezeReceiptV1 } from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  parseTask551FreezeCandidateGenerationStateV2,
  type Task551FreezeCandidateGenerationStateV2,
} from "./freezeCandidateGenerationState";

// This fixture module is the only consumer surface for validated reviewed
// receipts of the active v2 generation. It never exposes candidate slots, the
// raw state, a store, a path, or any writer. Every export either accepts an
// already-validated reviewed state or re-validates one, and fails closed on
// anything else.

export type Task551ReviewedPairV2 = Readonly<{
  small: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
  large: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
}>;

function reviewedPairFromState(
  state: Task551FreezeCandidateGenerationStateV2
): Task551ReviewedPairV2 {
  if (state.state !== "reviewed") {
    throw new Error("database_baseline_invalid");
  }
  const [small, large] = state.receipts;
  if (small === undefined || large === undefined) {
    throw new Error("database_baseline_invalid");
  }
  return Object.freeze({
    small: small.receipt as Task551ReviewableFreezeReceiptV1 &
      Readonly<{ reviewState: "reviewed" }>,
    large: large.receipt as Task551ReviewableFreezeReceiptV1 &
      Readonly<{ reviewState: "reviewed" }>,
  });
}

// Re-validates a parsed reviewed state before exposing its reviewed receipts.
export function parseTask551ReviewedPairV2(
  value: unknown,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewedPairV2 {
  return reviewedPairFromState(parseTask551FreezeCandidateGenerationStateV2(value, sha256Bytes));
}

// Narrows an already-validated state to its reviewed receipts without re-parsing.
export function task551ReviewedPairV2FromState(
  state: Task551FreezeCandidateGenerationStateV2
): Task551ReviewedPairV2 {
  return reviewedPairFromState(state);
}

export function assertTask551ReviewedStateV2(
  state: Task551FreezeCandidateGenerationStateV2
): Task551FreezeCandidateGenerationStateV2 {
  if (state.state !== "reviewed") throw new Error("database_baseline_invalid");
  return state;
}
