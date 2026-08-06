import { SmokeError } from "./contracts";

export type SmokeTimingKind = "suite" | "phase" | "scenario" | "process" | "snapshot" | "cleanup";

export interface SmokeTimingReceipt {
  readonly kind: SmokeTimingKind;
  readonly name: string;
  readonly count: number;
  readonly failed: number;
  readonly elapsedMs: number;
}

type Clock = () => number;
interface MutableReceipt {
  count: number;
  failed: number;
  elapsedMs: number;
}

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

export class TimingRecorder {
  readonly #clock: Clock;
  readonly #receipts = new Map<string, MutableReceipt>();

  constructor(clock: Clock = performance.now.bind(performance)) {
    this.#clock = clock;
  }

  async measure<T>(kind: SmokeTimingKind, name: string, operation: () => Promise<T>): Promise<T> {
    if (!NAME_PATTERN.test(name)) {
      throw new SmokeError("smoke_output_invalid", "timing name is invalid");
    }
    const started = this.#clock();
    let failed = false;
    try {
      return await operation();
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      const elapsed = this.#clock() - started;
      if (!Number.isFinite(elapsed) || elapsed < 0) {
        throw new SmokeError("smoke_output_invalid", "monotonic timing is invalid");
      }
      const key = `${kind}\0${name}`;
      const current = this.#receipts.get(key) ?? { count: 0, failed: 0, elapsedMs: 0 };
      current.count = Math.min(Number.MAX_SAFE_INTEGER, current.count + 1);
      current.failed = Math.min(Number.MAX_SAFE_INTEGER, current.failed + Number(failed));
      current.elapsedMs = Math.min(Number.MAX_SAFE_INTEGER, current.elapsedMs + Math.ceil(elapsed));
      this.#receipts.set(key, current);
    }
  }

  snapshot(): readonly SmokeTimingReceipt[] {
    return Object.freeze(
      [...this.#receipts.entries()]
        .map(([key, value]) => {
          const [kind, name] = key.split("\0") as [SmokeTimingKind, string];
          return Object.freeze({ kind, name, ...value });
        })
        .sort(
          (left, right) =>
            left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name)
        )
    );
  }
}
