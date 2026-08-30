import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { SmokeError } from "../../contracts";
import type { Task105L05SettingRowIdentity } from "./settings-lease";
import {
  createTask105L05RecoveryReceipt,
  receiptFixtureIsComplete,
  task105L05RecoveryReceiptKey,
  transitionReceipt,
  validateTask105L05RecoveryAuthority,
  validateTask105L05RecoveryReceipt,
  type Task105L05ReceiptPatch,
  type Task105L05ReceiptRecord,
  type Task105L05ReceiptSettings,
  type Task105L05ReceiptPhase,
  type Task105L05RecoveryAuthority,
  type Task105L05RecoveryReceipt,
} from "./recovery-receipt";
import {
  TASK105_L05_CANONICAL_PERMISSIONS,
  task105L05RoleName,
  task105L05UserEmail,
} from "./fixture";
import { requireExactTask105L05ApplyRows } from "./recovery-settings-input";

export { createTask105L05RecoveryDbTestSeam } from "./recovery-db-test-seam";

/**
 * Worker-owned durable receipt persistence and recovery.
 *
 * All receipt changes use a locked settings-row transaction and the pure
 * `transitionReceipt` compare-and-version contract. This module deliberately
 * returns only bounded booleans to worker handlers; receipt records, setting
 * JSON, IDs, and token hashes never leave the worker boundary.
 */

const ALL_SETTING_KEYS = Object.freeze([
  "assistant.enabled",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "site.homepageId",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.adminPath",
] as const);

const USER_AGENT_PREFIX = "coderso-runtime-smoke/task-105-l05";

type Db = typeof import("../../../../core/db/client").db;
type Schema = typeof import("../../../../core/db/schema");
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

interface Core {
  readonly db: Db;
  readonly schema: Schema;
  readonly fence: (tx: Tx) => Promise<void>;
}

interface ReceiptTransitionInput {
  readonly authority: Task105L05RecoveryAuthority;
  readonly expectedPhase: Task105L05ReceiptPhase;
  readonly expectedVersion: number;
  readonly nextPhase: Task105L05ReceiptPhase;
  readonly patch: Task105L05ReceiptPatch;
}

async function core(): Promise<Core> {
  const [client, schema, fence] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
    import("../../../../core/db/nativeCmsWriterFence"),
  ]);
  return { db: client.db, schema, fence: fence.acquireNativeCmsWriterFence };
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

function outputFailure(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function rowIdentity(row: {
  readonly key: string;
  readonly valueJson: string;
  readonly updatedAt: string;
  readonly xmin: string;
}): Task105L05SettingRowIdentity {
  return Object.freeze({
    key: row.key,
    valueJson: row.valueJson,
    updatedAt: row.updatedAt,
    xmin: row.xmin,
  });
}

function receiptRecord(row: Task105L05SettingRowIdentity): Task105L05ReceiptRecord {
  if (!(ALL_SETTING_KEYS as readonly string[]).includes(row.key)) {
    outputFailure("TASK-105 L05 recovery setting key is invalid");
  }
  return Object.freeze({
    key: row.key as Task105L05ReceiptRecord["key"],
    valueJson: row.valueJson,
    updatedAt: row.updatedAt,
    xmin: row.xmin,
  });
}

function sameSettingIdentity(
  actual: Task105L05SettingRowIdentity | undefined,
  expected: Task105L05ReceiptRecord
): boolean {
  return (
    actual !== undefined &&
    actual.key === expected.key &&
    actual.valueJson === expected.valueJson &&
    actual.updatedAt === expected.updatedAt &&
    actual.xmin === expected.xmin
  );
}

function parseJsonValue(valueJson: string, label: string): unknown {
  try {
    return JSON.parse(valueJson) as unknown;
  } catch {
    outputFailure(`${label} JSON is invalid`);
  }
}

async function lockSettings(tx: Tx, schema: Schema): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${schema.settings} IN SHARE ROW EXCLUSIVE MODE`);
}

async function readSettingRows(
  tx: Tx,
  schema: Schema,
  keys: readonly string[]
): Promise<ReadonlyMap<string, Task105L05SettingRowIdentity>> {
  const rows = await tx
    .select({
      key: schema.settings.key,
      valueJson: sql<string>`${schema.settings.value}::text`.as("value_json"),
      updatedAt: sql<string>`${schema.settings.updatedAt}::text`.as("updated_at"),
      xmin: sql<string>`xmin::text`.as("xmin"),
    })
    .from(schema.settings)
    .where(inArray(schema.settings.key, keys))
    .for("update");
  return new Map(rows.map((row) => [row.key, rowIdentity(row)]));
}

async function upsertSetting(
  tx: Tx,
  schema: Schema,
  row: Readonly<{ readonly key: string; readonly valueJson: string; readonly updatedAt?: string }>
): Promise<void> {
  const value = parseJsonValue(row.valueJson, "TASK-105 L05 recovery setting");
  await tx
    .insert(schema.settings)
    .values({
      key: row.key,
      value,
      updatedAt:
        row.updatedAt === undefined ? sql`clock_timestamp()` : sql`${row.updatedAt}::timestamp`,
    })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: {
        value,
        updatedAt:
          row.updatedAt === undefined ? sql`clock_timestamp()` : sql`${row.updatedAt}::timestamp`,
      },
    });
}

async function receiptForUpdate(
  tx: Tx,
  schema: Schema,
  authority: Task105L05RecoveryAuthority
): Promise<Task105L05RecoveryReceipt | null> {
  const [row] = await tx
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, task105L05RecoveryReceiptKey(authority.runMarker)))
    .for("update");
  return row === undefined ? null : validateTask105L05RecoveryReceipt(row.value, authority);
}

async function writeReceipt(
  tx: Tx,
  schema: Schema,
  receipt: Task105L05RecoveryReceipt
): Promise<void> {
  await tx
    .insert(schema.settings)
    .values({
      key: task105L05RecoveryReceiptKey(receipt.runMarker),
      value: receipt,
      updatedAt: sql`clock_timestamp()`,
    })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: receipt, updatedAt: sql`clock_timestamp()` },
    });
}

async function transitionLocked(
  tx: Tx,
  handles: Core,
  input: ReceiptTransitionInput
): Promise<Task105L05RecoveryReceipt> {
  const current = await receiptForUpdate(tx, handles.schema, input.authority);
  if (current === null) cleanupFailure("TASK-105 L05 recovery receipt is absent");
  const next = transitionReceipt({ ...input, current });
  // An exact retry has the same committed version and canonical patch digest.
  // Do not emit another database write merely because validation returned a
  // fresh immutable object instance.
  if (next.version !== current.version) await writeReceipt(tx, handles.schema, next);
  return next;
}

/** Persists the one required pre-mutation `fixture-intent` receipt. */
export async function persistTask105L05RecoveryReceipt(input: {
  readonly authority: Task105L05RecoveryAuthority;
}): Promise<Task105L05RecoveryReceipt> {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  const handles = await core();
  return handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const existing = await receiptForUpdate(tx, handles.schema, authority);
    if (existing !== null) cleanupFailure("TASK-105 L05 recovery receipt already exists");
    const receipt = createTask105L05RecoveryReceipt({ authority });
    await writeReceipt(tx, handles.schema, receipt);
    return receipt;
  });
}

export const initializeTask105L05RecoveryReceipt = persistTask105L05RecoveryReceipt;

export async function transitionTask105L05RecoveryReceipt(
  input: ReceiptTransitionInput
): Promise<Task105L05RecoveryReceipt> {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  const handles = await core();
  return handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    return transitionLocked(tx, handles, { ...input, authority });
  });
}

export async function inspectTask105L05RecoveryReceipt(
  authority: Task105L05RecoveryAuthority
): Promise<Task105L05RecoveryReceipt | null> {
  const parsedAuthority = validateTask105L05RecoveryAuthority(authority);
  const handles = await core();
  const [row] = await handles.db
    .select({ value: handles.schema.settings.value })
    .from(handles.schema.settings)
    .where(eq(handles.schema.settings.key, task105L05RecoveryReceiptKey(parsedAuthority.runMarker)))
    .limit(1);
  return row === undefined ? null : validateTask105L05RecoveryReceipt(row.value, parsedAuthority);
}

function settingsFromRows(
  baselineRows: ReadonlyMap<string, Task105L05SettingRowIdentity>,
  ownedRows: ReadonlyMap<string, Task105L05SettingRowIdentity>
): Task105L05ReceiptSettings {
  const owned = [...ownedRows.values()].map(receiptRecord);
  return Object.freeze({
    baseline: Object.freeze(
      ALL_SETTING_KEYS.map((key) => {
        const row = baselineRows.get(key);
        return row === undefined ? null : receiptRecord(row);
      })
    ),
    owned: Object.freeze(owned),
  });
}

/** Applies the worker-owned five-key setup lease and records no raw output. */
export async function applyTask105L05Settings(input: {
  readonly authority: Task105L05RecoveryAuthority;
  readonly rows: readonly Readonly<{ readonly key: string; readonly valueJson: string }>[];
}): Promise<Readonly<{ readonly applied: true }>> {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  const rows = requireExactTask105L05ApplyRows(input.rows);
  const handles = await core();
  return handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const current = await receiptForUpdate(tx, handles.schema, authority);
    if (current === null || current.phase !== "fixture-installed") {
      cleanupFailure("TASK-105 L05 recovery receipt is not ready for settings apply");
    }
    const baseline = await readSettingRows(tx, handles.schema, ALL_SETTING_KEYS);
    for (const row of rows) await upsertSetting(tx, handles.schema, row);
    const live = await readSettingRows(tx, handles.schema, ALL_SETTING_KEYS);
    const ownedRows = new Map<string, Task105L05SettingRowIdentity>();
    for (const row of rows) {
      const owned = live.get(row.key);
      if (owned === undefined)
        cleanupFailure("TASK-105 L05 recovery setting ownership was not persisted");
      ownedRows.set(row.key, owned);
    }
    const settings = settingsFromRows(baseline, ownedRows);
    const next = transitionReceipt({
      authority,
      current,
      expectedPhase: "fixture-installed",
      expectedVersion: current.version,
      nextPhase: "settings-applied",
      patch: Object.freeze({ settings }),
    });
    await writeReceipt(tx, handles.schema, next);
    return Object.freeze({ applied: true });
  });
}

/** Records intent immediately before the browser performs its Site Shell PATCH. */
export async function beginTask105L05SiteShellClaim(
  authority: Task105L05RecoveryAuthority
): Promise<Readonly<{ readonly prepared: true }>> {
  const parsedAuthority = validateTask105L05RecoveryAuthority(authority);
  const handles = await core();
  await handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const current = await receiptForUpdate(tx, handles.schema, parsedAuthority);
    if (current === null || current.phase !== "settings-applied") {
      cleanupFailure("TASK-105 L05 recovery receipt is not ready for Site Shell intent");
    }
    const next = transitionReceipt({
      authority: parsedAuthority,
      current,
      expectedPhase: "settings-applied",
      expectedVersion: current.version,
      nextPhase: "site-shell-intent",
      patch: Object.freeze({}),
    });
    await writeReceipt(tx, handles.schema, next);
  });
  return Object.freeze({ prepared: true });
}

/** Claims exact post-UI Site Shell ownership without returning row identities. */
export async function claimTask105L05SiteShell(input: {
  readonly authority: Task105L05RecoveryAuthority;
  readonly navigationMenuId: string;
}): Promise<Readonly<{ readonly claimed: true }>> {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  if (
    typeof input.navigationMenuId !== "string" ||
    input.navigationMenuId.length === 0 ||
    input.navigationMenuId.length > 4096
  ) {
    outputFailure("TASK-105 L05 Site Shell menu identity is invalid");
  }
  const handles = await core();
  return handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const current = await receiptForUpdate(tx, handles.schema, authority);
    if (current === null || current.phase !== "site-shell-intent" || current.settings === null) {
      cleanupFailure("TASK-105 L05 recovery receipt is not ready for Site Shell claim");
    }
    const live = await readSettingRows(tx, handles.schema, [
      "site.navigationMenuId",
      "site.footerTemplateId",
    ]);
    const navigation = live.get("site.navigationMenuId");
    const footer = live.get("site.footerTemplateId");
    const baselineFooter =
      current.settings.baseline.find((row) => row?.key === "site.footerTemplateId") ?? null;
    const expectedFooter = baselineFooter === null ? "null" : baselineFooter.valueJson;
    if (
      navigation === undefined ||
      footer === undefined ||
      parseJsonValue(navigation.valueJson, "TASK-105 L05 Site Shell navigation") !==
        input.navigationMenuId ||
      footer.valueJson !== expectedFooter
    ) {
      cleanupFailure("TASK-105 L05 Site Shell ownership drifted");
    }
    const owned = new Map(current.settings.owned.map((row) => [row.key, row] as const));
    owned.set("site.navigationMenuId", receiptRecord(navigation));
    owned.set("site.footerTemplateId", receiptRecord(footer));
    const settings: Task105L05ReceiptSettings = Object.freeze({
      baseline: current.settings.baseline,
      owned: Object.freeze([...owned.values()]),
    });
    const next = transitionReceipt({
      authority,
      current,
      expectedPhase: "site-shell-intent",
      expectedVersion: current.version,
      nextPhase: "site-shell-claimed",
      patch: Object.freeze({
        settings,
        siteShell: Object.freeze({ navigationMenuId: input.navigationMenuId }),
      }),
    });
    await writeReceipt(tx, handles.schema, next);
    return Object.freeze({ claimed: true });
  });
}

async function transitionToRecoveringLocked(
  tx: Tx,
  handles: Core,
  authority: Task105L05RecoveryAuthority,
  current: Task105L05RecoveryReceipt
): Promise<Task105L05RecoveryReceipt> {
  if (["recovering", "settings-restored", "fixtures-removed"].includes(current.phase))
    return current;
  const next = transitionReceipt({
    authority,
    current,
    expectedPhase: current.phase,
    expectedVersion: current.version,
    nextPhase: "recovering",
    patch: Object.freeze({}),
  });
  await writeReceipt(tx, handles.schema, next);
  return next;
}

async function restoreSettingsInTransaction(
  handles: Core,
  authority: Task105L05RecoveryAuthority
): Promise<Task105L05RecoveryReceipt | null> {
  return handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const receipt = await receiptForUpdate(tx, handles.schema, authority);
    if (receipt === null) return null;
    const current = await transitionToRecoveringLocked(tx, handles, authority, receipt);
    if (
      current.settings === null ||
      current.phase === "fixtures-removed" ||
      current.phase === "settings-restored"
    ) {
      return current;
    }
    const live = await readSettingRows(tx, handles.schema, ALL_SETTING_KEYS);
    for (const owned of current.settings.owned) {
      if (!sameSettingIdentity(live.get(owned.key), owned)) {
        cleanupFailure("TASK-105 L05 recovery setting ownership drifted");
      }
    }
    for (const owned of current.settings.owned) {
      const baseline = current.settings.baseline.find((row) => row?.key === owned.key) ?? null;
      if (baseline === null) {
        await tx.delete(handles.schema.settings).where(eq(handles.schema.settings.key, owned.key));
      } else {
        await upsertSetting(tx, handles.schema, baseline);
      }
    }
    const after = await readSettingRows(tx, handles.schema, ALL_SETTING_KEYS);
    for (const owned of current.settings.owned) {
      const baseline = current.settings.baseline.find((row) => row?.key === owned.key) ?? null;
      const actual = after.get(owned.key);
      if (baseline === null ? actual !== undefined : actual?.valueJson !== baseline.valueJson) {
        cleanupFailure("TASK-105 L05 recovery setting restore proof failed");
      }
    }
    const next = transitionReceipt({
      authority,
      current,
      expectedPhase: "recovering",
      expectedVersion: current.version,
      nextPhase: "settings-restored",
      patch: Object.freeze({}),
    });
    await writeReceipt(tx, handles.schema, next);
    return next;
  });
}

/** Restores receipt-owned settings only; fixture deletion remains recovery-owned. */
export async function restoreTask105L05Settings(
  authority: Task105L05RecoveryAuthority
): Promise<Readonly<{ readonly restored: true }>> {
  const parsedAuthority = validateTask105L05RecoveryAuthority(authority);
  const handles = await core();
  const receipt = await restoreSettingsInTransaction(handles, parsedAuthority);
  if (receipt === null) cleanupFailure("TASK-105 L05 recovery receipt is absent");
  return Object.freeze({ restored: true });
}

async function namespaceRowsPresent(
  tx: Tx,
  handles: Core,
  authority: Task105L05RecoveryAuthority
): Promise<boolean> {
  const { hashEmail } = await import("../../../../core/services/security/piiEmail");
  const emailHash = hashEmail(task105L05UserEmail(authority.session));
  const [users, roles, pages, menus, sessions] = await Promise.all([
    tx
      .select({ id: handles.schema.users.id })
      .from(handles.schema.users)
      .where(eq(handles.schema.users.emailHash, emailHash))
      .limit(1),
    tx
      .select({ id: handles.schema.roles.id })
      .from(handles.schema.roles)
      .where(eq(handles.schema.roles.name, task105L05RoleName(authority.session)))
      .limit(1),
    tx
      .select({ id: handles.schema.pages.id })
      .from(handles.schema.pages)
      .where(eq(handles.schema.pages.slug, `task-105-l05-${authority.session}-home`))
      .limit(1),
    tx
      .select({ id: handles.schema.menus.id })
      .from(handles.schema.menus)
      .where(eq(handles.schema.menus.name, `TASK-105 L05 navigation ${authority.session}`))
      .limit(1),
    tx
      .select({ id: handles.schema.sessions.id })
      .from(handles.schema.sessions)
      .where(eq(handles.schema.sessions.userAgent, `${USER_AGENT_PREFIX} (${authority.session})`))
      .limit(1),
  ]);
  return (
    users.length > 0 ||
    roles.length > 0 ||
    pages.length > 0 ||
    menus.length > 0 ||
    sessions.length > 0
  );
}

async function removeProvenEmptyIntent(
  handles: Core,
  authority: Task105L05RecoveryAuthority
): Promise<boolean> {
  return handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const receipt = await receiptForUpdate(tx, handles.schema, authority);
    if (receipt === null) return true;
    if (receipt.phase !== "fixture-intent") return false;
    if (await namespaceRowsPresent(tx, handles, authority)) {
      cleanupFailure("TASK-105 L05 fixture intent cannot be proven empty");
    }
    await tx
      .delete(handles.schema.settings)
      .where(eq(handles.schema.settings.key, task105L05RecoveryReceiptKey(authority.runMarker)));
    return true;
  });
}

type Task105L05CompleteFixture = Readonly<{
  readonly roleId: string;
  readonly roleDescription: string;
  readonly roleXmin: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly fixturePageId: string;
}>;

function assertCompleteFixture(
  receipt: Task105L05RecoveryReceipt
): asserts receipt is Task105L05RecoveryReceipt & {
  readonly fixture: Task105L05CompleteFixture;
} {
  if (!receiptFixtureIsComplete(receipt.fixture)) {
    cleanupFailure("TASK-105 L05 recovery fixture is incomplete");
  }
}

/**
 * A dispatched install can lose its response between a fixture service call
 * and its checkpoint write. Rebuild only deterministic, namespaced identities
 * that can still be proven exactly. A missing session token hash is never
 * guessed: that case remains fail-closed for an operator.
 */
async function reconstructIncompleteFixtureLocked(
  tx: Tx,
  handles: Core,
  authority: Task105L05RecoveryAuthority,
  receipt: Task105L05RecoveryReceipt
): Promise<Task105L05RecoveryReceipt> {
  if (receipt.phase !== "fixture-installing") return receipt;
  let current = receipt;
  const { hashEmail } = await import("../../../../core/services/security/piiEmail");
  const emailHash = hashEmail(task105L05UserEmail(authority.session));
  const fixture = current.fixture;
  if (fixture.roleId === null || fixture.roleDescription === null || fixture.roleXmin === null) {
    const roleRows = await tx
      .select({
        id: handles.schema.roles.id,
        name: handles.schema.roles.name,
        description: handles.schema.roles.description,
        permissions: handles.schema.roles.permissions,
        xmin: sql<string>`xmin::text`.as("xmin"),
      })
      .from(handles.schema.roles)
      .where(eq(handles.schema.roles.name, task105L05RoleName(authority.session)))
      .for("update");
    const role = roleRows.length === 1 ? roleRows[0] : undefined;
    if (
      role === undefined ||
      role.description !== `TASK-105 L05 synthetic role for ${authority.session}` ||
      JSON.stringify(role.permissions) !== JSON.stringify([...TASK105_L05_CANONICAL_PERMISSIONS])
    ) {
      cleanupFailure("TASK-105 L05 incomplete role ownership cannot be re-established");
    }
    current = transitionReceipt({
      authority,
      current,
      expectedPhase: "fixture-installing",
      expectedVersion: current.version,
      nextPhase: "fixture-installing",
      patch: Object.freeze({
        fixture: Object.freeze({
          roleId: role.id,
          roleDescription: role.description,
          roleXmin: role.xmin,
        }),
      }),
    });
    await writeReceipt(tx, handles.schema, current);
  }
  if (current.fixture.userId === null) {
    const userRows = await tx
      .select({
        id: handles.schema.users.id,
        emailHash: handles.schema.users.emailHash,
        status: handles.schema.users.status,
      })
      .from(handles.schema.users)
      .where(eq(handles.schema.users.emailHash, emailHash))
      .for("update");
    const user = userRows.length === 1 ? userRows[0] : undefined;
    if (user === undefined || user.status !== "active" || user.emailHash !== emailHash) {
      cleanupFailure("TASK-105 L05 incomplete user ownership cannot be re-established");
    }
    const links = await tx
      .select({ userId: handles.schema.userRoles.userId, roleId: handles.schema.userRoles.roleId })
      .from(handles.schema.userRoles)
      .where(eq(handles.schema.userRoles.userId, user.id))
      .for("update");
    if (links.length !== 1 || links[0]?.roleId !== current.fixture.roleId) {
      cleanupFailure("TASK-105 L05 incomplete user-role ownership cannot be re-established");
    }
    current = transitionReceipt({
      authority,
      current,
      expectedPhase: "fixture-installing",
      expectedVersion: current.version,
      nextPhase: "fixture-installing",
      patch: Object.freeze({ fixture: Object.freeze({ userId: user.id }) }),
    });
    await writeReceipt(tx, handles.schema, current);
  }
  if (current.fixture.sessionId === null || current.fixture.tokenHash === null) {
    cleanupFailure("TASK-105 L05 incomplete session ownership requires manual cleanup");
  }
  if (current.fixture.fixturePageId === null) {
    const pageRows = await tx
      .select({
        id: handles.schema.pages.id,
        slug: handles.schema.pages.slug,
        title: handles.schema.pages.title,
        status: handles.schema.pages.status,
        authorId: handles.schema.pages.authorId,
      })
      .from(handles.schema.pages)
      .where(eq(handles.schema.pages.slug, `task-105-l05-${authority.session}-home`))
      .for("update");
    const page = pageRows.length === 1 ? pageRows[0] : undefined;
    if (
      page === undefined ||
      page.title !== `TASK-105 L05 homepage ${authority.session}` ||
      page.status !== "published" ||
      page.authorId !== current.fixture.userId
    ) {
      cleanupFailure("TASK-105 L05 incomplete page ownership cannot be re-established");
    }
    current = transitionReceipt({
      authority,
      current,
      expectedPhase: "fixture-installing",
      expectedVersion: current.version,
      nextPhase: "fixture-installing",
      patch: Object.freeze({ fixture: Object.freeze({ fixturePageId: page.id }) }),
    });
    await writeReceipt(tx, handles.schema, current);
  }
  if (!receiptFixtureIsComplete(current.fixture)) {
    cleanupFailure("TASK-105 L05 incomplete fixture ownership cannot be re-established");
  }
  const installed = transitionReceipt({
    authority,
    current,
    expectedPhase: "fixture-installing",
    expectedVersion: current.version,
    nextPhase: "fixture-installed",
    patch: Object.freeze({}),
  });
  await writeReceipt(tx, handles.schema, installed);
  return installed;
}

async function reconstructIncompleteFixtureForRecovery(
  handles: Core,
  authority: Task105L05RecoveryAuthority
): Promise<void> {
  await handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const receipt = await receiptForUpdate(tx, handles.schema, authority);
    if (receipt === null) cleanupFailure("TASK-105 L05 recovery receipt is absent");
    if (receipt.phase !== "fixture-installing" || receiptFixtureIsComplete(receipt.fixture)) return;
    await reconstructIncompleteFixtureLocked(tx, handles, authority, receipt);
  });
}

async function removeFixtureInTransaction(
  handles: Core,
  authority: Task105L05RecoveryAuthority
): Promise<void> {
  await handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const current = await receiptForUpdate(tx, handles.schema, authority);
    if (current === null || current.phase === "fixtures-removed") return;
    const reconstructed = await reconstructIncompleteFixtureLocked(tx, handles, authority, current);
    const active = await transitionToRecoveringLocked(tx, handles, authority, reconstructed);
    if (!["recovering", "settings-restored"].includes(active.phase)) {
      cleanupFailure("TASK-105 L05 recovery phase is incomplete");
    }
    assertCompleteFixture(active);
    const fixture = active.fixture;
    const { hashEmail } = await import("../../../../core/services/security/piiEmail");
    const emailHash = hashEmail(task105L05UserEmail(authority.session));
    const roleRows = await tx
      .select({
        id: handles.schema.roles.id,
        name: handles.schema.roles.name,
        description: handles.schema.roles.description,
        permissions: handles.schema.roles.permissions,
        xmin: sql<string>`xmin::text`.as("xmin"),
      })
      .from(handles.schema.roles)
      .where(eq(handles.schema.roles.id, fixture.roleId))
      .for("update");
    const userRows = await tx
      .select({
        id: handles.schema.users.id,
        emailHash: handles.schema.users.emailHash,
        status: handles.schema.users.status,
      })
      .from(handles.schema.users)
      .where(eq(handles.schema.users.id, fixture.userId))
      .for("update");
    if (roleRows.length !== 1 || userRows.length !== 1) {
      cleanupFailure("TASK-105 L05 recovery fixture identity is incomplete");
    }
    const role = roleRows[0]!;
    const user = userRows[0]!;
    if (
      role.name !== task105L05RoleName(authority.session) ||
      role.description !== fixture.roleDescription ||
      role.xmin !== fixture.roleXmin ||
      JSON.stringify(role.permissions) !== JSON.stringify([...TASK105_L05_CANONICAL_PERMISSIONS]) ||
      user.emailHash !== emailHash ||
      user.status !== "active"
    ) {
      cleanupFailure("TASK-105 L05 recovery fixture identity drifted");
    }
    const links = await tx
      .select({ userId: handles.schema.userRoles.userId, roleId: handles.schema.userRoles.roleId })
      .from(handles.schema.userRoles)
      .where(eq(handles.schema.userRoles.userId, fixture.userId))
      .for("update");
    if (links.length !== 1 || links[0]?.roleId !== fixture.roleId) {
      cleanupFailure("TASK-105 L05 recovery user-role identity drifted");
    }
    const sessions = await tx
      .select({
        id: handles.schema.sessions.id,
        userId: handles.schema.sessions.userId,
        tokenHash: handles.schema.sessions.tokenHash,
        userAgent: handles.schema.sessions.userAgent,
        revokedAt: handles.schema.sessions.revokedAt,
      })
      .from(handles.schema.sessions)
      .where(eq(handles.schema.sessions.id, fixture.sessionId))
      .for("update");
    if (
      sessions.length !== 1 ||
      sessions[0]?.userId !== fixture.userId ||
      sessions[0]?.tokenHash !== fixture.tokenHash ||
      sessions[0]?.userAgent !== `${USER_AGENT_PREFIX} (${authority.session})`
    ) {
      cleanupFailure("TASK-105 L05 recovery session identity drifted");
    }
    const pageRows = await tx
      .select({
        id: handles.schema.pages.id,
        slug: handles.schema.pages.slug,
        title: handles.schema.pages.title,
        status: handles.schema.pages.status,
        authorId: handles.schema.pages.authorId,
      })
      .from(handles.schema.pages)
      .where(eq(handles.schema.pages.id, fixture.fixturePageId))
      .for("update");
    if (
      pageRows.length !== 1 ||
      pageRows[0]?.slug !== `task-105-l05-${authority.session}-home` ||
      pageRows[0]?.title !== `TASK-105 L05 homepage ${authority.session}` ||
      pageRows[0]?.status !== "published" ||
      pageRows[0]?.authorId !== fixture.userId
    ) {
      cleanupFailure("TASK-105 L05 recovery page identity drifted");
    }
    if (active.siteShell !== null) {
      const menus = await tx
        .select({
          id: handles.schema.menus.id,
          name: handles.schema.menus.name,
          status: handles.schema.menus.status,
        })
        .from(handles.schema.menus)
        .where(eq(handles.schema.menus.id, active.siteShell.navigationMenuId))
        .for("update");
      const items = await tx
        .select({ id: handles.schema.menuItems.id, pageId: handles.schema.menuItems.pageId })
        .from(handles.schema.menuItems)
        .where(eq(handles.schema.menuItems.menuId, active.siteShell.navigationMenuId))
        .for("update");
      if (
        menus.length !== 1 ||
        menus[0]?.name !== `TASK-105 L05 navigation ${authority.session}` ||
        menus[0]?.status !== "published" ||
        items.length !== 1 ||
        items[0]?.pageId !== fixture.fixturePageId
      ) {
        cleanupFailure("TASK-105 L05 recovery menu identity drifted");
      }
      await tx
        .delete(handles.schema.menuItems)
        .where(eq(handles.schema.menuItems.menuId, active.siteShell.navigationMenuId));
      await tx
        .delete(handles.schema.menus)
        .where(eq(handles.schema.menus.id, active.siteShell.navigationMenuId));
    }
    if (sessions[0]?.revokedAt === null) {
      await tx
        .update(handles.schema.sessions)
        .set({ revokedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(handles.schema.sessions.id, fixture.sessionId),
            eq(handles.schema.sessions.userId, fixture.userId),
            eq(handles.schema.sessions.tokenHash, fixture.tokenHash),
            isNull(handles.schema.sessions.revokedAt)
          )
        );
    }
    const revoked = await tx
      .select({ id: handles.schema.sessions.id, revokedAt: handles.schema.sessions.revokedAt })
      .from(handles.schema.sessions)
      .where(eq(handles.schema.sessions.id, fixture.sessionId))
      .for("update");
    if (revoked.length !== 1 || revoked[0]?.revokedAt === null) {
      cleanupFailure("TASK-105 L05 recovery session revocation proof failed");
    }
    await tx.delete(handles.schema.pages).where(eq(handles.schema.pages.id, fixture.fixturePageId));
    await tx
      .delete(handles.schema.sessions)
      .where(
        and(
          eq(handles.schema.sessions.id, fixture.sessionId),
          eq(handles.schema.sessions.userId, fixture.userId),
          eq(handles.schema.sessions.tokenHash, fixture.tokenHash)
        )
      );
    await tx
      .delete(handles.schema.userRoles)
      .where(eq(handles.schema.userRoles.userId, fixture.userId));
    await tx.delete(handles.schema.users).where(eq(handles.schema.users.id, fixture.userId));
    const deletedRole = await tx
      .delete(handles.schema.roles)
      .where(and(eq(handles.schema.roles.id, fixture.roleId), sql`xmin = ${fixture.roleXmin}::xid`))
      .returning({ id: handles.schema.roles.id });
    if (deletedRole.length !== 1) cleanupFailure("TASK-105 L05 recovery role CAS delete failed");
    const next = transitionReceipt({
      authority,
      current: active,
      expectedPhase: active.phase,
      expectedVersion: active.version,
      nextPhase: "fixtures-removed",
      patch: Object.freeze({}),
    });
    await writeReceipt(tx, handles.schema, next);
    if (await namespaceRowsPresent(tx, handles, authority)) {
      cleanupFailure("TASK-105 L05 recovery absence proof failed");
    }
  });
}

async function deleteTerminalReceipt(
  handles: Core,
  authority: Task105L05RecoveryAuthority
): Promise<void> {
  await handles.db.transaction(async (tx) => {
    await handles.fence(tx);
    await lockSettings(tx, handles.schema);
    const current = await receiptForUpdate(tx, handles.schema, authority);
    if (current === null) return;
    if (current.phase !== "fixtures-removed") {
      cleanupFailure("TASK-105 L05 recovery receipt is not terminal");
    }
    if (await namespaceRowsPresent(tx, handles, authority)) {
      cleanupFailure("TASK-105 L05 recovery absence proof failed");
    }
    await tx
      .delete(handles.schema.settings)
      .where(eq(handles.schema.settings.key, task105L05RecoveryReceiptKey(authority.runMarker)));
  });
}

/**
 * In-process response-unknown recovery. The caller must still own the exact
 * authority; no persisted value makes a later process eligible to call this.
 */
export async function recoverTask105L05(
  authority: Task105L05RecoveryAuthority
): Promise<Readonly<{ readonly recovered: true }>> {
  const parsedAuthority = validateTask105L05RecoveryAuthority(authority);
  const handles = await core();
  const initial = await inspectTask105L05RecoveryReceipt(parsedAuthority);
  if (initial === null) return Object.freeze({ recovered: true });
  if (initial.phase === "fixture-intent") {
    await removeProvenEmptyIntent(handles, parsedAuthority);
    return Object.freeze({ recovered: true });
  }
  if (initial.phase === "fixture-installing" && !receiptFixtureIsComplete(initial.fixture)) {
    await reconstructIncompleteFixtureForRecovery(handles, parsedAuthority);
  }
  await restoreSettingsInTransaction(handles, parsedAuthority);
  await removeFixtureInTransaction(handles, parsedAuthority);
  await deleteTerminalReceipt(handles, parsedAuthority);
  return Object.freeze({ recovered: true });
}

/** Terminal namespaced absence proof; it returns no fixture identity. */
export async function proveTask105L05Recovery(
  authority: Task105L05RecoveryAuthority
): Promise<Readonly<{ readonly absent: true }>> {
  const parsedAuthority = validateTask105L05RecoveryAuthority(authority);
  const handles = await core();
  const receipt = await inspectTask105L05RecoveryReceipt(parsedAuthority);
  if (receipt !== null) cleanupFailure("TASK-105 L05 recovery receipt survived proof");
  const present = await handles.db.transaction(async (tx) =>
    namespaceRowsPresent(tx, handles, parsedAuthority)
  );
  if (present) cleanupFailure("TASK-105 L05 recovery absence proof failed");
  return Object.freeze({ absent: true });
}
