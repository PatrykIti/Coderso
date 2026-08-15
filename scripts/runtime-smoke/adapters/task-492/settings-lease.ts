import { createHmac, timingSafeEqual } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "../../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../../core/db/nativeCmsWriterFence";
import { settings } from "../../../../core/db/schema";
import { isPlainObject, SmokeError } from "../../contracts";
import type { Task492RecoveryAuthority } from "./worker-operations";

export const TASK492_SECURITY_SETTINGS_KEY = "security.settings";
const TASK492_RECEIPT_PREFIX = "runtimeSmoke.task492.";
const MAX_RECEIPT_BYTES = 32 * 1024;
const RECEIPT_HMAC = /^[a-f0-9]{64}$/u;

/**
 * One raw security.settings row in PostgreSQL's canonical text forms. The
 * value JSONB text preserves byte-exact equality semantics and the timestamp
 * text preserves microsecond precision across restoration.
 */
export type Task492SecuritySettingsRecord = Readonly<{
  readonly key: "security.settings";
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

export type Task492OwnedRecord = Task492SecuritySettingsRecord &
  Readonly<{ readonly version: string }>;

export type Task492SettingsSnapshot = Task492SecuritySettingsRecord | null;

export type Task492SettingsLeaseState = Readonly<{
  readonly snapshot: Task492SettingsSnapshot;
  readonly owned: Task492OwnedRecord | null;
}>;

type Task492ReceiptRecord = Readonly<{
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

type Task492RecoveryReceiptPayload = Readonly<{
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: "fast" | "certification";
  readonly snapshot: Task492ReceiptRecord | null;
  readonly owned: Task492ReceiptRecord | null;
}>;

export type Task492RecoveryReceipt = Task492RecoveryReceiptPayload &
  Readonly<{ readonly receiptHmac: string }>;

export interface Task492SettingsPersistence {
  applyTargets(authority: Task492RecoveryAuthority): Promise<void>;
  inspectRecovery(authority: Task492RecoveryAuthority): Promise<"absent" | "recoverable">;
  restoreIfOwned(authority: Task492RecoveryAuthority): Promise<"absent" | "restored">;
  proveReceiptAbsent(authority: Task492RecoveryAuthority): Promise<boolean>;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Task492SecuritySettingsRow = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version?: string;
}>;

export function task492RecoveryReceiptKey(runMarker: string): string {
  return `${TASK492_RECEIPT_PREFIX}${runMarker}`;
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

function canonicalReceiptRecord(value: unknown, owned: boolean): Task492ReceiptRecord | null {
  if (!owned && value === null) return null;
  const record = exactRecord(
    value,
    owned ? ["valueJson", "updatedAt", "version"] : ["valueJson", "updatedAt"],
    "TASK-492 recovery receipt record"
  );
  const canonical = Object.freeze({
    valueJson: safeText(record.valueJson, "TASK-492 recovery receipt JSON"),
    updatedAt: safeText(record.updatedAt, "TASK-492 recovery receipt timestamp"),
  });
  return Object.freeze(
    owned
      ? { ...canonical, version: safeText(record.version, "TASK-492 recovery receipt version") }
      : canonical
  );
}

function canonicalReceiptPayload(value: unknown): Task492RecoveryReceiptPayload {
  const receipt = exactRecord(
    value,
    ["schemaVersion", "runMarker", "profile", "snapshot", "owned", "receiptHmac"],
    "TASK-492 recovery receipt"
  );
  if (
    receipt.schemaVersion !== 1 ||
    typeof receipt.runMarker !== "string" ||
    (receipt.profile !== "fast" && receipt.profile !== "certification")
  ) {
    cleanupFailure("TASK-492 recovery receipt authority is invalid");
  }
  const snapshot = canonicalReceiptRecord(receipt.snapshot, false);
  const owned = canonicalReceiptRecord(receipt.owned, true);
  if (snapshot === null) cleanupFailure("TASK-492 recovery receipt snapshot is missing");
  return Object.freeze({
    schemaVersion: 1,
    runMarker: receipt.runMarker,
    profile: receipt.profile,
    snapshot,
    owned,
  });
}

function canonicalReceiptJson(payload: Task492RecoveryReceiptPayload): string {
  return JSON.stringify(payload);
}

function receiptHmac(payload: Task492RecoveryReceiptPayload, recoveryKey: string): string {
  return createHmac("sha256", Buffer.from(recoveryKey, "base64url"))
    .update(canonicalReceiptJson(payload))
    .digest("hex");
}

export function createTask492RecoveryReceipt(
  authority: Task492RecoveryAuthority,
  state: Task492SettingsLeaseState
): Task492RecoveryReceipt {
  if (state.snapshot === null || state.owned === null) {
    cleanupFailure("TASK-492 settings lease state is incomplete");
  }
  const payload = canonicalReceiptPayload({
    schemaVersion: 1,
    runMarker: authority.runMarker,
    profile: authority.profile,
    snapshot: {
      valueJson: state.snapshot.valueJson,
      updatedAt: state.snapshot.updatedAt,
    },
    owned: {
      valueJson: state.owned.valueJson,
      updatedAt: state.owned.updatedAt,
      version: state.owned.version,
    },
  });
  const receipt = Object.freeze({
    ...payload,
    receiptHmac: receiptHmac(payload, authority.recoveryKey),
  });
  if (Buffer.byteLength(JSON.stringify(receipt)) > MAX_RECEIPT_BYTES) {
    cleanupFailure("TASK-492 recovery receipt is too large");
  }
  return receipt;
}

function validateRecoveryReceipt(
  value: unknown,
  authority: Task492RecoveryAuthority
): Task492RecoveryReceiptPayload {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string" || Buffer.byteLength(serialized) > MAX_RECEIPT_BYTES) {
    cleanupFailure("TASK-492 recovery receipt is too large");
  }
  const raw = exactRecord(
    value,
    ["schemaVersion", "runMarker", "profile", "snapshot", "owned", "receiptHmac"],
    "TASK-492 recovery receipt"
  );
  const payload = canonicalReceiptPayload(raw);
  if (payload.runMarker !== authority.runMarker || payload.profile !== authority.profile) {
    cleanupFailure("TASK-492 recovery receipt authority drifted");
  }
  if (typeof raw.receiptHmac !== "string" || !RECEIPT_HMAC.test(raw.receiptHmac)) {
    cleanupFailure("TASK-492 recovery receipt HMAC is invalid");
  }
  const expected = Buffer.from(receiptHmac(payload, authority.recoveryKey), "hex");
  const actual = Buffer.from(raw.receiptHmac, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    cleanupFailure("TASK-492 recovery receipt HMAC is invalid");
  }
  return payload;
}

export function assertTask492RecoveryReceipt(
  value: unknown,
  authority: Task492RecoveryAuthority
): void {
  validateRecoveryReceipt(value, authority);
}

function isSecuritySettingsRow(
  input: Task492SecuritySettingsRow
): input is Task492SecuritySettingsRecord {
  return (
    input.key === TASK492_SECURITY_SETTINGS_KEY &&
    typeof input.valueJson === "string" &&
    input.valueJson.length > 0 &&
    typeof input.updatedAt === "string" &&
    input.updatedAt.length > 0
  );
}

function snapshotMatches(
  current: Task492SecuritySettingsRecord | null,
  expected: Task492ReceiptRecord | null
): boolean {
  return (
    (current === null && expected === null) ||
    (current !== null &&
      expected !== null &&
      current.updatedAt === expected.updatedAt &&
      current.valueJson === expected.valueJson)
  );
}

function freezeRecord(input: Task492SecuritySettingsRow): Task492SecuritySettingsRecord {
  if (!isSecuritySettingsRow(input)) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 security settings row is invalid");
  }
  return Object.freeze({ key: input.key, updatedAt: input.updatedAt, valueJson: input.valueJson });
}

function freezeOwnedRecord(input: Task492SecuritySettingsRow): Task492OwnedRecord {
  const record = freezeRecord(input);
  if (typeof input.version !== "string" || input.version.length === 0) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 security settings version is invalid");
  }
  return Object.freeze({ ...record, version: input.version });
}

/**
 * Ownership proof: the smoke run owns the security.settings row when every
 * part EXCEPT loginAlerts still matches the baseline we wrote. The browser's
 * own save rewrites loginAlerts (and the updatedAt timestamp), so only the
 * untouched contract sections are compared; any concurrent settings change
 * outside the touched area fails closed and blocks restoration.
 */
export function task492SettingsOwnershipStillValid(
  current: Task492SecuritySettingsRecord | null,
  baseline: Task492SecuritySettingsRecord
): boolean {
  if (current === null) return false;
  let baselineValue: unknown;
  let currentValue: unknown;
  try {
    baselineValue = JSON.parse(baseline.valueJson);
    currentValue = JSON.parse(current.valueJson);
  } catch {
    return false;
  }
  if (!isPlainObject(baselineValue) || !isPlainObject(currentValue)) return false;
  const baselineRest = { ...baselineValue };
  const currentRest = { ...currentValue };
  delete baselineRest.loginAlerts;
  delete currentRest.loginAlerts;
  return JSON.stringify(baselineRest) === JSON.stringify(currentRest);
}

function freezeSnapshot(rows: readonly Task492SecuritySettingsRow[]): Task492SettingsSnapshot {
  if (rows.length === 0) return null;
  if (rows.length !== 1) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 security settings row set is invalid");
  }
  return freezeRecord(rows[0]!);
}

async function readSecuritySettingsForUpdate(
  tx: DbTransaction
): Promise<readonly Task492SecuritySettingsRow[]> {
  return await tx
    .select({
      key: settings.key,
      updatedAt: sql<string>`${settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${settings.value}::text`.as("value_json"),
      version: sql<string>`xmin::text`.as("version"),
    })
    .from(settings)
    .where(eq(settings.key, TASK492_SECURITY_SETTINGS_KEY))
    .limit(1)
    .for("update");
}

async function lockSettingsTable(tx: DbTransaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${settings} IN SHARE ROW EXCLUSIVE MODE`);
}

async function writeSecuritySettingsRow(
  tx: DbTransaction,
  valueJson: string,
  updatedAt: string | null
): Promise<void> {
  await tx
    .insert(settings)
    .values({
      key: TASK492_SECURITY_SETTINGS_KEY,
      updatedAt: updatedAt === null ? sql`clock_timestamp()` : sql`${updatedAt}::timestamp`,
      value: sql`${valueJson}::jsonb`,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

/** The smoke baseline: the stored settings shape with only the touched contract changed. */
export function buildTask492BaselineSettings(storedValue: unknown): unknown {
  const baseline = isPlainObject(storedValue) ? { ...storedValue } : {};
  baseline.loginAlerts = {
    enabled: true,
    notifyOnNewDevice: true,
    notifyOnNewLocation: true,
    recipients: [],
    webhookUrl: null,
    webhookSecret: null,
    deliveryError: null,
  };
  if (isPlainObject(baseline.rateLimit)) {
    baseline.rateLimit = { ...baseline.rateLimit, enabled: false };
  } else {
    baseline.rateLimit = { enabled: false };
  }
  return baseline;
}

export class Task492DatabaseSettingsPersistence implements Task492SettingsPersistence {
  async applyTargets(authority: Task492RecoveryAuthority): Promise<void> {
    await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockSettingsTable(tx);
        const receiptKey = task492RecoveryReceiptKey(authority.runMarker);
        const [existingReceipt] = await tx
          .select({ key: settings.key })
          .from(settings)
          .where(eq(settings.key, receiptKey));
        if (existingReceipt !== undefined) {
          cleanupFailure("TASK-492 recovery receipt already exists");
        }
        const snapshot = freezeSnapshot(await readSecuritySettingsForUpdate(tx));
        const storedValue = snapshot === null ? null : JSON.parse(snapshot.valueJson);
        const baselineJson = JSON.stringify(buildTask492BaselineSettings(storedValue));
        await writeSecuritySettingsRow(tx, baselineJson, null);
        const ownedRows = await readSecuritySettingsForUpdate(tx);
        if (ownedRows.length !== 1) {
          cleanupFailure("TASK-492 security settings baseline is missing");
        }
        const owned = freezeOwnedRecord(ownedRows[0]!);
        const receipt = createTask492RecoveryReceipt(authority, Object.freeze({ snapshot, owned }));
        await tx.insert(settings).values({ key: receiptKey, value: receipt });
      },
      { isolationLevel: "read committed" }
    );
  }

  async inspectRecovery(authority: Task492RecoveryAuthority): Promise<"absent" | "recoverable"> {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, task492RecoveryReceiptKey(authority.runMarker)))
      .limit(1);
    if (row === undefined) return "absent";
    validateRecoveryReceipt(row.value, authority);
    return "recoverable";
  }

  async restoreIfOwned(authority: Task492RecoveryAuthority): Promise<"absent" | "restored"> {
    return await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockSettingsTable(tx);
        const receiptKey = task492RecoveryReceiptKey(authority.runMarker);
        const [receiptRow] = await tx
          .select({ value: settings.value })
          .from(settings)
          .where(eq(settings.key, receiptKey))
          .for("update");
        if (receiptRow === undefined) return "absent" as const;
        const payload = validateRecoveryReceipt(receiptRow.value, authority);
        const snapshot = payload.snapshot;
        const owned = payload.owned;
        if (snapshot === null) {
          cleanupFailure("TASK-492 recovery receipt snapshot is missing");
        }
        if (owned === null) {
          cleanupFailure("TASK-492 recovery receipt ownership is missing");
        }
        const currentRows = await readSecuritySettingsForUpdate(tx);
        const current = freezeSnapshot(currentRows);
        const baseline: Task492SecuritySettingsRecord = Object.freeze({
          key: TASK492_SECURITY_SETTINGS_KEY,
          updatedAt: owned.updatedAt,
          valueJson: owned.valueJson,
        });
        if (!task492SettingsOwnershipStillValid(current, baseline)) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-492 security settings ownership drifted"
          );
        }
        // The snapshot is guaranteed present (checked above); a snapshot of a
        // settings row that did not exist before the run cannot be produced by
        // the lease, so restoration always writes the original row back.
        await writeSecuritySettingsRow(tx, snapshot.valueJson, snapshot.updatedAt);
        const restored = freezeSnapshot(await readSecuritySettingsForUpdate(tx));
        if (!snapshotMatches(restored, snapshot)) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-492 security settings restoration proof failed"
          );
        }
        const removed = await tx
          .delete(settings)
          .where(eq(settings.key, receiptKey))
          .returning({ key: settings.key });
        if (removed.length !== 1 || removed[0]?.key !== receiptKey) {
          cleanupFailure("TASK-492 recovery receipt deletion failed");
        }
        return "restored" as const;
      },
      { isolationLevel: "read committed" }
    );
  }

  async proveReceiptAbsent(authority: Task492RecoveryAuthority): Promise<boolean> {
    const [row] = await db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, task492RecoveryReceiptKey(authority.runMarker)))
      .limit(1);
    return row === undefined;
  }
}

export class Task492SettingsLease {
  #active = false;
  #applyPromise: Promise<void> | null = null;
  #authority: Task492RecoveryAuthority | null = null;
  #restored = false;
  #restorePromise: Promise<void> | null = null;
  #wasApplied = false;

  constructor(private readonly persistence: Task492SettingsPersistence) {}

  get active(): boolean {
    return this.#active;
  }

  get restored(): boolean {
    return this.#restored;
  }

  get wasApplied(): boolean {
    return this.#wasApplied;
  }

  async apply(authority: Task492RecoveryAuthority): Promise<void> {
    if (this.#applyPromise !== null || this.#authority !== null || this.#restored) {
      throw new SmokeError("smoke_output_invalid", "TASK-492 settings lease cannot be replayed");
    }
    this.#authority = authority;
    this.#applyPromise = this.#applyOnce(authority);
    await this.#applyPromise;
  }

  async #applyOnce(authority: Task492RecoveryAuthority): Promise<void> {
    await this.persistence.applyTargets(authority);
    this.#active = true;
    this.#wasApplied = true;
  }

  inspectRecovery(authority: Task492RecoveryAuthority): Promise<"absent" | "recoverable"> {
    return this.persistence.inspectRecovery(authority);
  }

  async recover(authority: Task492RecoveryAuthority): Promise<"absent" | "restored"> {
    if (
      this.#authority !== null &&
      (this.#authority.schemaVersion !== authority.schemaVersion ||
        this.#authority.runMarker !== authority.runMarker ||
        this.#authority.profile !== authority.profile ||
        this.#authority.recoveryKey !== authority.recoveryKey)
    ) {
      cleanupFailure("TASK-492 settings authority drifted");
    }
    this.#authority = authority;
    const outcome = await this.persistence.restoreIfOwned(authority);
    if (outcome === "restored") {
      this.#active = false;
      this.#restored = true;
      this.#wasApplied = true;
    }
    return outcome;
  }

  proveReceiptAbsent(authority: Task492RecoveryAuthority): Promise<boolean> {
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
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 settings lease is absent");
    }
    const outcome = await this.persistence.restoreIfOwned(authority);
    if (outcome !== "restored") {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 recovery receipt is absent");
    }
    this.#active = false;
    this.#restored = true;
  }
}
