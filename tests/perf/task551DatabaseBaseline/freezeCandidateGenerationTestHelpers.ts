import type { Task551ReviewableFreezeReceiptV1 } from "../../../scripts/task551DatabaseBaseline/digestContract";
import { makeReceipt } from "./contractTestHelpers";
import {
  computeTask551ActiveGenerationStateDigestV2,
  initialTask551FreezeCandidateGenerationStateV2,
  type Task551ActiveGenerationStateDigestV2,
  type Task551FreezeCandidateGenerationStateV2,
} from "./freezeCandidateGenerationState";

// Builders and fakes for the focused active-v2 suites. Everything here is
// pure and in-memory: no store, path, archive, environment, or database is
// touched, and nothing here is reachable from production runner code.

type Task551ActiveGenerationStateName =
  "awaiting-small" | "awaiting-large" | "ready-for-review" | "reviewed";

export function makeTask551ActiveGenerationAwaitingSmallStateV2(): Task551FreezeCandidateGenerationStateV2 {
  return initialTask551FreezeCandidateGenerationStateV2;
}

export function makeTask551ActiveGenerationAwaitingLargeStateV2(
  receipt: Task551ReviewableFreezeReceiptV1 = makeReceipt("small")
): Task551FreezeCandidateGenerationStateV2 {
  return {
    ...initialTask551FreezeCandidateGenerationStateV2,
    state: "awaiting-large",
    receipts: [Object.freeze({ profile: "small" as const, receipt })] as readonly [
      { profile: "small"; receipt: Task551ReviewableFreezeReceiptV1 },
    ],
  } as Task551FreezeCandidateGenerationStateV2;
}

export function makeTask551ActiveGenerationReadyForReviewStateV2(
  small: Task551ReviewableFreezeReceiptV1 = makeReceipt("small"),
  large: Task551ReviewableFreezeReceiptV1 = makeReceipt("large")
): Task551FreezeCandidateGenerationStateV2 {
  return {
    ...initialTask551FreezeCandidateGenerationStateV2,
    state: "ready-for-review",
    receipts: [
      Object.freeze({ profile: "small" as const, receipt: small }),
      Object.freeze({ profile: "large" as const, receipt: large }),
    ],
  } as Task551FreezeCandidateGenerationStateV2;
}

export function makeTask551ActiveGenerationReviewedStateV2(
  small: Task551ReviewableFreezeReceiptV1 = makeReceipt("small", "reviewed"),
  large: Task551ReviewableFreezeReceiptV1 = makeReceipt("large", "reviewed")
): Task551FreezeCandidateGenerationStateV2 {
  return {
    ...initialTask551FreezeCandidateGenerationStateV2,
    state: "reviewed",
    receipts: [
      Object.freeze({ profile: "small" as const, receipt: small }),
      Object.freeze({ profile: "large" as const, receipt: large }),
    ],
  } as Task551FreezeCandidateGenerationStateV2;
}

export function makeTask551ActiveGenerationStateV2(
  state: Task551ActiveGenerationStateName,
  small?: Task551ReviewableFreezeReceiptV1,
  large?: Task551ReviewableFreezeReceiptV1
): Task551FreezeCandidateGenerationStateV2 {
  if (state === "awaiting-small") return makeTask551ActiveGenerationAwaitingSmallStateV2();
  if (state === "awaiting-large")
    return makeTask551ActiveGenerationAwaitingLargeStateV2(
      small ??
        (makeReceipt("small") as Task551ReviewableFreezeReceiptV1 & { reviewState: "candidate" })
    );
  if (state === "ready-for-review")
    return makeTask551ActiveGenerationReadyForReviewStateV2(
      small ??
        (makeReceipt("small") as Task551ReviewableFreezeReceiptV1 & { reviewState: "candidate" }),
      large ??
        (makeReceipt("large") as Task551ReviewableFreezeReceiptV1 & { reviewState: "candidate" })
    );
  return makeTask551ActiveGenerationReviewedStateV2(
    small ?? makeReceipt("small", "reviewed"),
    large ?? makeReceipt("large", "reviewed")
  );
}

export function task551ActiveGenerationStateDigestOrAbsentV2(
  state: Task551FreezeCandidateGenerationStateV2 | undefined,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ActiveGenerationStateDigestV2 {
  return state === undefined
    ? "absent"
    : computeTask551ActiveGenerationStateDigestV2(state, sha256Bytes);
}

// In-memory store fakes: a focused replacement for the private storage
// authority that records the exact mutation order a suite wants to pin.
export function makeTask551ActiveGenerationStateCellV2(
  initial: Task551FreezeCandidateGenerationStateV2
): {
  read: () => Task551FreezeCandidateGenerationStateV2;
  write: (next: Task551FreezeCandidateGenerationStateV2) => void;
  writes: () => number;
  reads: () => number;
  events: string[];
} {
  let current = initial;
  let writeCount = 0;
  let readCount = 0;
  const events: string[] = [];
  return {
    read: () => {
      readCount += 1;
      events.push("state-read");
      return current;
    },
    write: (next) => {
      writeCount += 1;
      events.push("state-write");
      current = next;
    },
    writes: () => writeCount,
    reads: () => readCount,
    events,
  };
}
