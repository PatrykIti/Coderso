import { SmokeError } from "../../contracts";
import {
  createTask105L05RecoveryReceipt,
  receiptFixtureIsComplete,
  transitionReceipt,
  validateTask105L05RecoveryAuthority,
  validateTask105L05RecoveryReceipt,
  type Task105L05ReceiptPatch,
  type Task105L05ReceiptPhase,
  type Task105L05RecoveryAuthority,
  type Task105L05RecoveryReceipt,
} from "./recovery-receipt";

interface ReceiptTransitionInput {
  readonly authority: Task105L05RecoveryAuthority;
  readonly expectedPhase: Task105L05ReceiptPhase;
  readonly expectedVersion: number;
  readonly nextPhase: Task105L05ReceiptPhase;
  readonly patch: Task105L05ReceiptPatch;
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

/**
 * Deterministic private test seam for CAS and parent-authority recovery tests.
 * Production callers use the database API; no generic recovery endpoint exists.
 */
export function createTask105L05RecoveryDbTestSeam(): {
  initialize(authority: Task105L05RecoveryAuthority): Task105L05RecoveryReceipt;
  transition(
    input: Omit<ReceiptTransitionInput, "authority"> & {
      readonly authority: Task105L05RecoveryAuthority;
    }
  ): Task105L05RecoveryReceipt;
  recover(input: {
    readonly authority: Task105L05RecoveryAuthority;
    readonly parentAuthorityLive: boolean;
    readonly namespacedFixtureAbsent: boolean;
  }): Readonly<{ readonly recovered: true }>;
  inspect(): Task105L05RecoveryReceipt | null;
  committedWrites(): number;
} {
  let receipt: Task105L05RecoveryReceipt | null = null;
  let writes = 0;
  return Object.freeze({
    initialize(authority) {
      if (receipt !== null) cleanupFailure("TASK-105 L05 recovery receipt already exists");
      receipt = createTask105L05RecoveryReceipt({ authority });
      writes += 1;
      return receipt;
    },
    transition(input) {
      if (receipt === null) cleanupFailure("TASK-105 L05 recovery receipt is absent");
      const next = transitionReceipt({ ...input, current: receipt });
      if (next.version !== receipt.version) {
        receipt = next;
        writes += 1;
      }
      return receipt;
    },
    recover(input) {
      const authority = validateTask105L05RecoveryAuthority(input.authority);
      if (!input.parentAuthorityLive) {
        cleanupFailure("TASK-105 L05 recovery requires live parent authority");
      }
      if (receipt === null) return Object.freeze({ recovered: true });
      validateTask105L05RecoveryReceipt(receipt, authority);
      if (receipt.phase === "fixture-intent") {
        if (!input.namespacedFixtureAbsent) {
          cleanupFailure("TASK-105 L05 fixture intent cannot be proven empty");
        }
        receipt = null;
        writes += 1;
        return Object.freeze({ recovered: true });
      }
      if (receipt.phase === "fixture-installing" && !receiptFixtureIsComplete(receipt.fixture)) {
        cleanupFailure("TASK-105 L05 incomplete fixture requires manual cleanup");
      }
      if (!input.namespacedFixtureAbsent) {
        cleanupFailure("TASK-105 L05 recovery test seam requires exact fixture proof");
      }
      receipt = null;
      writes += 1;
      return Object.freeze({ recovered: true });
    },
    inspect: () => receipt,
    committedWrites: () => writes,
  });
}
