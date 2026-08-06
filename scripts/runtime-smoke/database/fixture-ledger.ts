import {
  WorkerProtocolError,
  assertPlainJson,
  assertSha256,
  assertWorkerToken,
  type PlainJsonValue,
} from "../workers/contracts";

export const MAX_FIXTURE_LEDGER_ENTRIES = 256;

export interface FixtureLedgerEntry {
  readonly resourceKey: string;
  readonly logicalId: string;
  readonly kind: string;
  readonly profileId: string;
  readonly wave: number;
  readonly ordinal: number;
  readonly identifier: PlainJsonValue;
  readonly ownershipSha256: string;
  readonly dependsOn: readonly string[];
}

export interface FrozenFixtureLedger {
  readonly schemaVersion: 1;
  readonly entries: readonly FixtureLedgerEntry[];
}

function assertResourceKey(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > 512 ||
    value.includes("\0") ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
}

function freezeJson(value: PlainJsonValue): PlainJsonValue {
  if (Array.isArray(value)) return Object.freeze(value.map((nested) => freezeJson(nested)));
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, freezeJson(nested)]))
    );
  }
  return value;
}

export function validateFixtureLedgerEntry(entry: FixtureLedgerEntry): void {
  assertResourceKey(entry.resourceKey, "fixture resource key");
  assertWorkerToken(entry.logicalId, "fixture logical ID");
  assertWorkerToken(entry.kind, "fixture resource kind");
  assertWorkerToken(entry.profileId, "fixture worker profile ID");
  if (
    !Number.isSafeInteger(entry.wave) ||
    entry.wave < 0 ||
    entry.wave > 64 ||
    !Number.isSafeInteger(entry.ordinal) ||
    entry.ordinal < 0 ||
    entry.ordinal >= MAX_FIXTURE_LEDGER_ENTRIES
  ) {
    throw new WorkerProtocolError("fixture ledger ordering is invalid");
  }
  assertPlainJson(entry.identifier, "fixture identifier");
  assertSha256(entry.ownershipSha256, "fixture ownership digest");
  if (
    !Array.isArray(entry.dependsOn) ||
    entry.dependsOn.length > 32 ||
    new Set(entry.dependsOn).size !== entry.dependsOn.length
  ) {
    throw new WorkerProtocolError("fixture dependency list is invalid");
  }
  for (const dependency of entry.dependsOn) {
    assertResourceKey(dependency, "fixture dependency key");
    if (dependency === entry.resourceKey) {
      throw new WorkerProtocolError("fixture cannot depend on itself");
    }
  }
}

export class RunFixtureLedger {
  readonly #entries = new Map<string, FixtureLedgerEntry>();
  #frozen: FrozenFixtureLedger | null = null;

  append(entry: FixtureLedgerEntry): void {
    if (this.#frozen !== null) throw new WorkerProtocolError("fixture ledger is already frozen");
    validateFixtureLedgerEntry(entry);
    if (
      this.#entries.size >= MAX_FIXTURE_LEDGER_ENTRIES ||
      this.#entries.has(entry.resourceKey) ||
      [...this.#entries.values()].some(
        (existing) => existing.logicalId === entry.logicalId || existing.ordinal === entry.ordinal
      )
    ) {
      throw new WorkerProtocolError("fixture ledger identity is duplicated or over bound");
    }
    this.#entries.set(
      entry.resourceKey,
      Object.freeze({
        ...entry,
        identifier: freezeJson(entry.identifier),
        dependsOn: Object.freeze([...entry.dependsOn].sort()),
      })
    );
  }

  freeze(): FrozenFixtureLedger {
    if (this.#frozen !== null) return this.#frozen;
    if (this.#entries.size === 0) throw new WorkerProtocolError("fixture ledger is empty");
    const entries = [...this.#entries.values()].sort((left, right) => left.ordinal - right.ordinal);
    const byKey = this.#entries;
    for (const entry of entries) {
      for (const dependencyKey of entry.dependsOn) {
        const dependency = byKey.get(dependencyKey);
        if (dependency === undefined) {
          throw new WorkerProtocolError("fixture dependency is absent from the ledger");
        }
        if (entry.wave >= dependency.wave) {
          throw new WorkerProtocolError("fixture delete waves are not foreign-key safe");
        }
      }
    }
    this.#frozen = Object.freeze({ schemaVersion: 1, entries: Object.freeze(entries) });
    return this.#frozen;
  }
}
