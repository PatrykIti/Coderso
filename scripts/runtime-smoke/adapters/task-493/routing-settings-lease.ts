import { createHmac, timingSafeEqual } from "node:crypto";

import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../../core/db/nativeCmsWriterFence";
import { settings } from "../../../../core/db/schema";
import { invalidateSiteShellCachesForKeys } from "../../../../core/services/settings/settingsService";
import { isPlainObject, SmokeError } from "../../contracts";
import type { Task493RecoveryAuthority } from "./worker-operations";

export const TASK493_ROUTING_SETTING_KEYS = Object.freeze([
  "site.adminPath",
  "site.adminBaseUrl",
  "site.publicBaseUrl",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
] as const);

export type Task493RoutingSettingKey = (typeof TASK493_ROUTING_SETTING_KEYS)[number];

/**
 * PostgreSQL's canonical text forms stay private to the worker lease. They
 * preserve JSONB representation and timestamp microseconds across restoration.
 */
export type Task493RoutingSettingRecord = Readonly<{
  readonly key: Task493RoutingSettingKey;
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

export type Task493RoutingSettingsOwnedRecord = Readonly<{
  readonly record: Task493RoutingSettingRecord;
  readonly version: string;
}>;

export type Task493RoutingSettingsSnapshot = Readonly<
  Record<Task493RoutingSettingKey, Task493RoutingSettingRecord | null>
>;

export type Task493RoutingSettingsLeaseState = Readonly<{
  readonly owned: Readonly<Record<Task493RoutingSettingKey, Task493RoutingSettingsOwnedRecord>>;
  readonly snapshot: Task493RoutingSettingsSnapshot;
}>;

type Task493ReceiptRecord = Readonly<{
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

type Task493ReceiptOwnedRecord = Task493ReceiptRecord & Readonly<{ readonly version: string }>;

type Task493RecoveryReceiptPayload = Readonly<{
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly snapshot: Readonly<Record<Task493RoutingSettingKey, Task493ReceiptRecord | null>>;
  readonly owned: Readonly<Record<Task493RoutingSettingKey, Task493ReceiptOwnedRecord>>;
}>;

export type Task493RecoveryReceipt = Task493RecoveryReceiptPayload &
  Readonly<{ readonly receiptHmac: string }>;

export interface Task493RoutingSettingsPersistence {
  applyTargets(authority: Task493RecoveryAuthority): Promise<void>;
  inspectRecovery(authority: Task493RecoveryAuthority): Promise<"absent" | "recoverable">;
  invalidate(): void;
  restoreIfOwned(authority: Task493RecoveryAuthority): Promise<"absent" | "restored">;
  proveReceiptAbsent(authority: Task493RecoveryAuthority): Promise<boolean>;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Task493RoutingSettingRow = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version?: string;
}>;

const TASK493_ROUTING_TARGETS: Readonly<Record<Task493RoutingSettingKey, string>> = Object.freeze({
  "site.adminPath": JSON.stringify("/admin"),
  "site.adminBaseUrl": "null",
  "site.publicBaseUrl": "null",
  "assistant.launcher.avatarEnabled": "false",
  "assistant.launcher.avatarAsset": JSON.stringify(""),
});
const TASK493_RECEIPT_PREFIX = "runtimeSmoke.task493.";
const MAX_RECEIPT_BYTES = 16 * 1024;
const RECEIPT_HMAC = /^[a-f0-9]{64}$/u;

export function task493RecoveryReceiptKey(runMarker: string): string {
  return `${TASK493_RECEIPT_PREFIX}${runMarker}`;
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  label: string
): Record<string, unknown> {
  if (!isPlainObject(value)) cleanupFailure(`${label} is invalid`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    cleanupFailure(`${label} has unknown or missing fields`);
  }
  return value;
}

function safeText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    cleanupFailure(`${label} is invalid`);
  }
  return value;
}

function canonicalReceiptRecord(
  value: unknown,
  key: Task493RoutingSettingKey,
  owned: false
): Task493ReceiptRecord | null;
function canonicalReceiptRecord(
  value: unknown,
  key: Task493RoutingSettingKey,
  owned: true
): Task493ReceiptOwnedRecord;
function canonicalReceiptRecord(
  value: unknown,
  key: Task493RoutingSettingKey,
  owned: boolean
): Task493ReceiptRecord | Task493ReceiptOwnedRecord | null {
  if (!owned && value === null) return null;
  const record = exactRecord(
    value,
    owned ? ["valueJson", "updatedAt", "version"] : ["valueJson", "updatedAt"],
    `TASK-493 recovery receipt ${key}`
  );
  const canonical = {
    valueJson: safeText(record.valueJson, "TASK-493 recovery receipt JSON"),
    updatedAt: safeText(record.updatedAt, "TASK-493 recovery receipt timestamp"),
  };
  return Object.freeze(
    owned
      ? {
          ...canonical,
          version: safeText(record.version, "TASK-493 recovery receipt version"),
        }
      : canonical
  );
}

function canonicalReceiptPayload(value: unknown): Task493RecoveryReceiptPayload {
  const receipt = exactRecord(
    value,
    ["schemaVersion", "runMarker", "profile", "snapshot", "owned", "receiptHmac"],
    "TASK-493 recovery receipt"
  );
  if (
    receipt.schemaVersion !== 1 ||
    typeof receipt.runMarker !== "string" ||
    (receipt.profile !== "fast" && receipt.profile !== "certification")
  ) {
    cleanupFailure("TASK-493 recovery receipt authority is invalid");
  }
  const snapshot = exactRecord(
    receipt.snapshot,
    TASK493_ROUTING_SETTING_KEYS,
    "TASK-493 recovery receipt snapshot"
  );
  const owned = exactRecord(
    receipt.owned,
    TASK493_ROUTING_SETTING_KEYS,
    "TASK-493 recovery receipt ownership"
  );
  return Object.freeze({
    schemaVersion: 1,
    runMarker: receipt.runMarker,
    profile: receipt.profile,
    snapshot: Object.freeze(
      Object.fromEntries(
        TASK493_ROUTING_SETTING_KEYS.map((key) => [
          key,
          canonicalReceiptRecord(snapshot[key], key, false),
        ])
      ) as Record<Task493RoutingSettingKey, Task493ReceiptRecord | null>
    ),
    owned: Object.freeze(
      Object.fromEntries(
        TASK493_ROUTING_SETTING_KEYS.map((key) => [
          key,
          canonicalReceiptRecord(owned[key], key, true),
        ])
      ) as Record<Task493RoutingSettingKey, Task493ReceiptOwnedRecord>
    ),
  });
}

function canonicalReceiptJson(payload: Task493RecoveryReceiptPayload): string {
  return JSON.stringify(payload);
}

function receiptHmac(payload: Task493RecoveryReceiptPayload, recoveryKey: string): string {
  return createHmac("sha256", Buffer.from(recoveryKey, "base64url"))
    .update(canonicalReceiptJson(payload))
    .digest("hex");
}

export function createTask493RecoveryReceipt(
  authority: Task493RecoveryAuthority,
  state: Task493RoutingSettingsLeaseState
): Task493RecoveryReceipt {
  const payload = canonicalReceiptPayload({
    schemaVersion: 1,
    runMarker: authority.runMarker,
    profile: authority.profile,
    snapshot: Object.fromEntries(
      TASK493_ROUTING_SETTING_KEYS.map((key) => {
        const record = state.snapshot[key];
        return [
          key,
          record === null ? null : { valueJson: record.valueJson, updatedAt: record.updatedAt },
        ];
      })
    ),
    owned: Object.fromEntries(
      TASK493_ROUTING_SETTING_KEYS.map((key) => {
        const record = state.owned[key];
        return [
          key,
          {
            valueJson: record.record.valueJson,
            updatedAt: record.record.updatedAt,
            version: record.version,
          },
        ];
      })
    ),
    receiptHmac: "0".repeat(64),
  });
  const receipt = Object.freeze({
    ...payload,
    receiptHmac: receiptHmac(payload, authority.recoveryKey),
  });
  if (Buffer.byteLength(JSON.stringify(receipt)) > MAX_RECEIPT_BYTES) {
    cleanupFailure("TASK-493 recovery receipt is too large");
  }
  return receipt;
}

function validateRecoveryReceipt(
  value: unknown,
  authority: Task493RecoveryAuthority
): Task493RecoveryReceiptPayload {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string" || Buffer.byteLength(serialized) > MAX_RECEIPT_BYTES) {
    cleanupFailure("TASK-493 recovery receipt is too large");
  }
  const raw = exactRecord(
    value,
    ["schemaVersion", "runMarker", "profile", "snapshot", "owned", "receiptHmac"],
    "TASK-493 recovery receipt"
  );
  const payload = canonicalReceiptPayload(raw);
  if (payload.runMarker !== authority.runMarker || payload.profile !== authority.profile) {
    cleanupFailure("TASK-493 recovery receipt authority drifted");
  }
  if (typeof raw.receiptHmac !== "string" || !RECEIPT_HMAC.test(raw.receiptHmac)) {
    cleanupFailure("TASK-493 recovery receipt HMAC is invalid");
  }
  const expected = Buffer.from(receiptHmac(payload, authority.recoveryKey), "hex");
  const actual = Buffer.from(raw.receiptHmac, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    cleanupFailure("TASK-493 recovery receipt HMAC is invalid");
  }
  return payload;
}

export function assertTask493RecoveryReceipt(
  value: unknown,
  authority: Task493RecoveryAuthority
): void {
  validateRecoveryReceipt(value, authority);
}

function receiptPayloadState(
  payload: Task493RecoveryReceiptPayload
): Task493RoutingSettingsLeaseState {
  return Object.freeze({
    snapshot: Object.freeze(
      Object.fromEntries(
        TASK493_ROUTING_SETTING_KEYS.map((key) => {
          const record = payload.snapshot[key];
          return [key, record === null ? null : Object.freeze({ key, ...record })];
        })
      ) as Record<Task493RoutingSettingKey, Task493RoutingSettingRecord | null>
    ),
    owned: Object.freeze(
      Object.fromEntries(
        TASK493_ROUTING_SETTING_KEYS.map((key) => {
          const record = payload.owned[key];
          return [
            key,
            Object.freeze({
              record: Object.freeze({
                key,
                valueJson: record.valueJson,
                updatedAt: record.updatedAt,
              }),
              version: record.version,
            }),
          ];
        })
      ) as Record<Task493RoutingSettingKey, Task493RoutingSettingsOwnedRecord>
    ),
  });
}

function isRoutingSettingKey(value: string): value is Task493RoutingSettingKey {
  return (TASK493_ROUTING_SETTING_KEYS as readonly string[]).includes(value);
}

function freezeRecord(input: Task493RoutingSettingRow): Task493RoutingSettingRecord {
  if (
    !isRoutingSettingKey(input.key) ||
    typeof input.valueJson !== "string" ||
    input.valueJson.length === 0 ||
    typeof input.updatedAt !== "string" ||
    input.updatedAt.length === 0
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 routing setting row is invalid");
  }
  return Object.freeze({
    key: input.key,
    updatedAt: input.updatedAt,
    valueJson: input.valueJson,
  });
}

function recordMatches(
  current: Task493RoutingSettingRecord | null,
  expected: Task493RoutingSettingRecord
): boolean {
  return (
    current !== null &&
    current.key === expected.key &&
    current.updatedAt === expected.updatedAt &&
    current.valueJson === expected.valueJson
  );
}

function ownedRecordMatches(
  current: Task493RoutingSettingsOwnedRecord | null,
  expected: Task493RoutingSettingsOwnedRecord
): boolean {
  return (
    current !== null &&
    current.version === expected.version &&
    recordMatches(current.record, expected.record)
  );
}

function snapshotMatches(
  current: Task493RoutingSettingsSnapshot,
  expected: Task493RoutingSettingsSnapshot
): boolean {
  return TASK493_ROUTING_SETTING_KEYS.every((key) => {
    const currentRecord = current[key];
    const expectedRecord = expected[key];
    return (
      (currentRecord === null && expectedRecord === null) ||
      (currentRecord !== null &&
        expectedRecord !== null &&
        recordMatches(currentRecord, expectedRecord))
    );
  });
}

function freezeSnapshot(rows: readonly Task493RoutingSettingRow[]): Task493RoutingSettingsSnapshot {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  if (byKey.size !== rows.length || rows.some((row) => !isRoutingSettingKey(row.key))) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 routing setting rows are invalid");
  }
  return Object.freeze(
    Object.fromEntries(
      TASK493_ROUTING_SETTING_KEYS.map((key) => {
        const row = byKey.get(key);
        return [key, row === undefined ? null : freezeRecord(row)];
      })
    ) as Record<Task493RoutingSettingKey, Task493RoutingSettingRecord | null>
  );
}

function requireCompleteOwnedRecords(
  rows: readonly Task493RoutingSettingRow[]
): Readonly<Record<Task493RoutingSettingKey, Task493RoutingSettingsOwnedRecord>> {
  const snapshot = freezeSnapshot(rows);
  const versions = new Map(rows.map((row) => [row.key, row.version]));
  if (
    TASK493_ROUTING_SETTING_KEYS.some(
      (key) => snapshot[key] === null || typeof versions.get(key) !== "string" || !versions.get(key)
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-493 routing targets are incomplete");
  }
  return Object.freeze(
    Object.fromEntries(
      TASK493_ROUTING_SETTING_KEYS.map(
        (key) =>
          [key, Object.freeze({ record: snapshot[key]!, version: versions.get(key)! })] as const
      )
    ) as Record<Task493RoutingSettingKey, Task493RoutingSettingsOwnedRecord>
  );
}

async function readRoutingSettingsForUpdate(
  tx: DbTransaction
): Promise<readonly Task493RoutingSettingRow[]> {
  return await tx
    .select({
      key: settings.key,
      updatedAt: sql<string>`${settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${settings.value}::text`.as("value_json"),
      version: sql<string>`xmin::text`.as("version"),
    })
    .from(settings)
    .where(inArray(settings.key, TASK493_ROUTING_SETTING_KEYS))
    .orderBy(asc(settings.key))
    .for("update");
}

async function lockRoutingSettingsTable(tx: DbTransaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${settings} IN SHARE ROW EXCLUSIVE MODE`);
}

async function writeSnapshotRecords(
  tx: DbTransaction,
  records: readonly Task493RoutingSettingRecord[]
): Promise<void> {
  if (records.length === 0) return;
  await tx
    .insert(settings)
    .values(
      records.map((record) => ({
        key: record.key,
        updatedAt: sql`${record.updatedAt}::timestamp`,
        value: sql`${record.valueJson}::jsonb`,
      }))
    )
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

async function writeRoutingTargets(tx: DbTransaction): Promise<void> {
  await tx
    .insert(settings)
    .values(
      TASK493_ROUTING_SETTING_KEYS.map((key) => ({
        key,
        updatedAt: sql`clock_timestamp()`,
        value: sql`${TASK493_ROUTING_TARGETS[key]}::jsonb`,
      }))
    )
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

export class Task493DatabaseRoutingSettingsPersistence implements Task493RoutingSettingsPersistence {
  async applyTargets(authority: Task493RecoveryAuthority): Promise<void> {
    await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockRoutingSettingsTable(tx);
        const receiptKey = task493RecoveryReceiptKey(authority.runMarker);
        const [existingReceipt] = await tx
          .select({ key: settings.key })
          .from(settings)
          .where(eq(settings.key, receiptKey));
        if (existingReceipt !== undefined) {
          cleanupFailure("TASK-493 recovery receipt already exists");
        }
        const snapshot = freezeSnapshot(await readRoutingSettingsForUpdate(tx));
        await writeRoutingTargets(tx);
        const owned = requireCompleteOwnedRecords(await readRoutingSettingsForUpdate(tx));
        const receipt = createTask493RecoveryReceipt(authority, Object.freeze({ snapshot, owned }));
        await tx.insert(settings).values({ key: receiptKey, value: receipt });
      },
      { isolationLevel: "read committed" }
    );
  }

  async inspectRecovery(authority: Task493RecoveryAuthority): Promise<"absent" | "recoverable"> {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, task493RecoveryReceiptKey(authority.runMarker)))
      .limit(1);
    if (row === undefined) return "absent";
    validateRecoveryReceipt(row.value, authority);
    return "recoverable";
  }

  invalidate(): void {
    invalidateSiteShellCachesForKeys(TASK493_ROUTING_SETTING_KEYS);
  }

  async restoreIfOwned(authority: Task493RecoveryAuthority): Promise<"absent" | "restored"> {
    return await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockRoutingSettingsTable(tx);
        const receiptKey = task493RecoveryReceiptKey(authority.runMarker);
        const [receiptRow] = await tx
          .select({ value: settings.value })
          .from(settings)
          .where(eq(settings.key, receiptKey))
          .for("update");
        if (receiptRow === undefined) return "absent" as const;
        const state = receiptPayloadState(validateRecoveryReceipt(receiptRow.value, authority));
        const currentRows = await readRoutingSettingsForUpdate(tx);
        let currentOwned: Readonly<
          Record<Task493RoutingSettingKey, Task493RoutingSettingsOwnedRecord>
        >;
        try {
          currentOwned = requireCompleteOwnedRecords(currentRows);
        } catch {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-493 routing setting ownership drifted"
          );
        }
        if (
          TASK493_ROUTING_SETTING_KEYS.some(
            (key) => !ownedRecordMatches(currentOwned[key], state.owned[key])
          )
        ) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-493 routing setting ownership drifted"
          );
        }
        await writeSnapshotRecords(
          tx,
          TASK493_ROUTING_SETTING_KEYS.flatMap((key) => {
            const baseline = state.snapshot[key];
            return baseline === null ? [] : [baseline];
          })
        );
        const absentKeys = TASK493_ROUTING_SETTING_KEYS.filter(
          (key) => state.snapshot[key] === null
        );
        if (absentKeys.length > 0) {
          await tx.delete(settings).where(inArray(settings.key, absentKeys));
        }
        const restored = freezeSnapshot(await readRoutingSettingsForUpdate(tx));
        if (!snapshotMatches(restored, state.snapshot)) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-493 routing setting restoration proof failed"
          );
        }
        const removed = await tx
          .delete(settings)
          .where(eq(settings.key, receiptKey))
          .returning({ key: settings.key });
        if (removed.length !== 1 || removed[0]?.key !== receiptKey) {
          cleanupFailure("TASK-493 recovery receipt deletion failed");
        }
        return "restored" as const;
      },
      { isolationLevel: "read committed" }
    );
  }

  async proveReceiptAbsent(authority: Task493RecoveryAuthority): Promise<boolean> {
    const [row] = await db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, task493RecoveryReceiptKey(authority.runMarker)))
      .limit(1);
    return row === undefined;
  }
}

export class Task493RoutingSettingsLease {
  #active = false;
  #applyPromise: Promise<void> | null = null;
  #authority: Task493RecoveryAuthority | null = null;
  #restored = false;
  #restorePromise: Promise<void> | null = null;
  #wasApplied = false;

  constructor(private readonly persistence: Task493RoutingSettingsPersistence) {}

  get active(): boolean {
    return this.#active;
  }

  get restored(): boolean {
    return this.#restored;
  }

  get wasApplied(): boolean {
    return this.#wasApplied;
  }

  async apply(authority: Task493RecoveryAuthority): Promise<void> {
    if (this.#applyPromise !== null || this.#authority !== null || this.#restored) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-493 routing settings lease cannot be replayed"
      );
    }
    this.#authority = authority;
    this.#applyPromise = this.#applyOnce(authority);
    await this.#applyPromise;
  }

  async #applyOnce(authority: Task493RecoveryAuthority): Promise<void> {
    await this.persistence.applyTargets(authority);
    this.#active = true;
    this.#wasApplied = true;
    this.persistence.invalidate();
  }

  inspectRecovery(authority: Task493RecoveryAuthority): Promise<"absent" | "recoverable"> {
    return this.persistence.inspectRecovery(authority);
  }

  async recover(authority: Task493RecoveryAuthority): Promise<"absent" | "restored"> {
    if (
      this.#authority !== null &&
      (this.#authority.schemaVersion !== authority.schemaVersion ||
        this.#authority.runMarker !== authority.runMarker ||
        this.#authority.profile !== authority.profile ||
        this.#authority.recoveryKey !== authority.recoveryKey)
    ) {
      cleanupFailure("TASK-493 routing settings authority drifted");
    }
    this.#authority = authority;
    const outcome = await this.persistence.restoreIfOwned(authority);
    if (outcome === "restored") {
      this.#active = false;
      this.#restored = true;
      this.#wasApplied = true;
      this.persistence.invalidate();
    }
    return outcome;
  }

  proveReceiptAbsent(authority: Task493RecoveryAuthority): Promise<boolean> {
    return this.persistence.proveReceiptAbsent(authority);
  }

  async restore(): Promise<void> {
    if (this.#applyPromise !== null) {
      try {
        await this.#applyPromise;
      } catch {
        if (!this.#active) return;
      }
    }
    if (!this.#active) {
      if (this.#restorePromise !== null) await this.#restorePromise;
      return;
    }
    this.#restorePromise ??= this.#restoreOnce();
    await this.#restorePromise;
  }

  async #restoreOnce(): Promise<void> {
    const authority = this.#authority;
    if (authority === null) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 routing settings lease is absent");
    }
    const outcome = await this.persistence.restoreIfOwned(authority);
    if (outcome !== "restored") {
      throw new SmokeError("smoke_cleanup_failed", "TASK-493 recovery receipt is absent");
    }
    this.#active = false;
    this.#restored = true;
    this.persistence.invalidate();
  }
}
