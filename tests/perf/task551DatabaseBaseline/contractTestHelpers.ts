import { createHash } from "node:crypto";
import {
  buildTask551ReviewedCandidateTransitionInput,
  canonicalizeTask551Rfc8785,
  computeTask551ReviewableReceiptDigest,
  type JsonValue,
  type Task551ReviewableFreezeReceiptV1,
  type Task551ReviewedCandidateTransitionInputV1,
  type Task551ReviewedCandidateTransitionResultV1,
} from "../../../scripts/task551DatabaseBaseline/digestContract";
import { TASK551_DATABASE_FREEZE_RECEIPT } from "../fixtures/task551DatabaseBudgets";

export const TEST_SHA256 = "a".repeat(64);
export const TEST_SOURCE_HASH = "b".repeat(64);

export const fakeSha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

// The requested review state stays in the returned type, so the exact
// "candidate"/"reviewed" receipt the active-v2 state builders require is
// produced here instead of being re-widened and cast at every call site.
export function makeReceipt<ReviewState extends "candidate" | "reviewed" = "candidate">(
  profile: "small" | "large",
  reviewState: ReviewState = "candidate" as ReviewState
): Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: ReviewState }> {
  const { reviewableReceiptDigest: _ignored, ...withoutDigest } = {
    ...cloneJson(TASK551_DATABASE_FREEZE_RECEIPT[profile]),
    reviewState,
  };
  const digest = computeTask551ReviewableReceiptDigest(withoutDigest, fakeSha256);
  return {
    ...withoutDigest,
    reviewableReceiptDigest: digest,
  } as Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: ReviewState }>;
}

export function makeCandidateTransitionInput(): Task551ReviewedCandidateTransitionInputV1 {
  return buildTask551ReviewedCandidateTransitionInput(
    [
      { profile: "small", candidateReceipt: makeReceipt("small") },
      { profile: "large", candidateReceipt: makeReceipt("large") },
    ],
    fakeSha256
  );
}

export function makeReviewedReceipt(profile: "small" | "large"): Task551ReviewableFreezeReceiptV1 {
  return makeReceipt(profile, "reviewed");
}

export function makeTransitionResult(
  input: Task551ReviewedCandidateTransitionInputV1 = makeCandidateTransitionInput()
): Task551ReviewedCandidateTransitionResultV1 {
  const reviewed = input.candidates.map((candidate) => {
    const { reviewableReceiptDigest: _ignored, ...reviewedWithoutDigest } = {
      ...candidate.candidateReceipt,
      reviewState: "reviewed" as const,
    };
    const reviewedReceipt = {
      ...reviewedWithoutDigest,
      reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(
        reviewedWithoutDigest,
        fakeSha256
      ),
    };
    const reviewedCanonicalReceiptDigest = fakeSha256(
      canonicalizeTask551Rfc8785(reviewedReceipt as unknown as JsonValue)
    );
    return {
      profile: candidate.profile,
      candidateCanonicalReceiptDigest: candidate.candidateCanonicalReceiptDigest,
      reviewedReceipt,
      reviewedCanonicalReceiptDigest,
    };
  }) as unknown as Task551ReviewedCandidateTransitionResultV1["reviewed"];
  return {
    schema: "coderso.task551.reviewed-candidate-transition-result@v1",
    capabilityReceipt: {
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: "c".repeat(64),
    },
    reviewed,
  };
}

export function validTask551SourceHashes(
  paths: readonly string[]
): Readonly<Record<string, string>> {
  return Object.fromEntries(paths.map((path) => [path, TEST_SOURCE_HASH]));
}
