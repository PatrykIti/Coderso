import { and, eq } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import {
  accessLogs,
  auditLogs,
  roles,
  sessions,
  settings,
  userRoles,
  users,
} from "../../../../core/db/schema";
import { hashPassword } from "../../../../core/services/auth/password";
import { buildEmailFields, hashEmail } from "../../../../core/services/security/piiEmail";
import { isEncryptedSecret } from "../../../../core/services/security/secretStore";
import { getSetting } from "../../../../core/services/settings/settingsService";
import { isPlainObject, SmokeError } from "../../contracts";
import {
  Task492DatabaseSettingsPersistence,
  Task492SettingsLease,
  type Task492SettingsPersistence,
} from "./settings-lease";
import type {
  Task492BootstrapInput,
  Task492BootstrapOutput,
  Task492CleanupOutput,
  Task492ProofOutput,
  Task492ReadInput,
  Task492ReadOutput,
  Task492RecoveryAuthority,
  Task492WorkerHandlers,
} from "./worker-operations";

export const TASK492_ADMIN_ROLE_PERMISSIONS = Object.freeze([
  "content:read",
  "settings:read",
  "settings:write",
] as const);

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Task492FixtureIdentity = Readonly<{
  readonly userId: string;
  readonly roleId: string;
}>;

type Task492InstalledState = Readonly<{
  readonly marker: string;
  readonly identity: Task492FixtureIdentity;
}>;

type Task492RecoveryState = Readonly<
  { readonly kind: "absent" } | { readonly kind: "complete"; readonly state: Task492InstalledState }
>;

export interface Task492ProductionHandlerDependencies {
  readonly closeDatabase: () => Promise<void>;
  readonly hashPassword: (password: string) => Promise<string>;
  readonly readAdminPath: () => Promise<string>;
  readonly settingsPersistence: Task492SettingsPersistence;
}

const TASK492_PRODUCTION_HANDLER_DEPENDENCIES: Task492ProductionHandlerDependencies = Object.freeze(
  {
    closeDatabase,
    hashPassword,
    readAdminPath: () => getSetting("site.adminPath") as Promise<string>,
    settingsPersistence: new Task492DatabaseSettingsPersistence(),
  }
);

type Task492ProductionHandlerDependencyOverrides = Readonly<
  Partial<Task492ProductionHandlerDependencies>
>;

function expectedAdminEmail(marker: string): string {
  return `task492-${marker}-admin@smoke.invalid`;
}

function expectedRoleName(marker: string): string {
  return `task492-${marker}-admin`;
}

function expectedRoleDescription(): string {
  return "TASK-492 synthetic runtime smoke role";
}

function expectedPermissions(): readonly string[] {
  return TASK492_ADMIN_ROLE_PERMISSIONS;
}

async function reconstructTask492RecoveryState(
  tx: DbTransaction,
  authority: Task492RecoveryAuthority
): Promise<Task492RecoveryState> {
  const emailHash = hashEmail(expectedAdminEmail(authority.runMarker));
  const roleName = expectedRoleName(authority.runMarker);
  const [userRows, roleRows] = await Promise.all([
    tx
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(eq(users.email, emailHash)),
    tx
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
      })
      .from(roles)
      .where(eq(roles.name, roleName)),
  ]);
  if (userRows.length === 0 && roleRows.length === 0) {
    return Object.freeze({ kind: "absent" });
  }
  if (userRows.length !== 1 || roleRows.length !== 1) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 recovery matrix is partial");
  }
  const user = userRows[0]!;
  const role = roleRows[0]!;
  if (
    user.name !== "TASK-492 smoke admin" ||
    user.status !== "active" ||
    role.description !== expectedRoleDescription() ||
    JSON.stringify(role.permissions) !== JSON.stringify(expectedPermissions())
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 recovery identity drifted");
  }
  const joins = await tx
    .select({ userId: userRoles.userId, roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id));
  if (joins.length !== 1 || joins[0]?.userId !== user.id || joins[0]?.roleId !== role.id) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 recovery role binding drifted");
  }
  return Object.freeze({
    kind: "complete",
    state: Object.freeze({
      marker: authority.runMarker,
      identity: Object.freeze({ userId: user.id, roleId: role.id }),
    }),
  });
}

async function inspectTask492FixtureRecovery(
  authority: Task492RecoveryAuthority
): Promise<Task492RecoveryState> {
  return await db.transaction((tx) => reconstructTask492RecoveryState(tx, authority));
}

function requireComplete(recovery: Task492RecoveryState): Task492InstalledState {
  if (recovery.kind !== "complete") {
    throw new SmokeError("smoke_cleanup_failed", "TASK-492 fixture is not installed");
  }
  return recovery.state;
}

async function removeTask492RecoveryFixtures(authority: Task492RecoveryAuthority): Promise<
  Readonly<{
    readonly state: Task492InstalledState | null;
    readonly deletedSessions: number;
    readonly deletedAudit: number;
    readonly deletedAccess: number;
    readonly deletedJoins: number;
  }>
> {
  return await db.transaction(async (tx) => {
    const recovery = await reconstructTask492RecoveryState(tx, authority);
    if (recovery.kind === "absent") {
      return Object.freeze({
        state: null,
        deletedSessions: 0,
        deletedAudit: 0,
        deletedAccess: 0,
        deletedJoins: 0,
      });
    }
    const state = recovery.state;
    const userId = state.identity.userId;
    const roleId = state.identity.roleId;
    const [deletedSessions, deletedAudit, deletedAccess, deletedJoins] = await Promise.all([
      tx.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id }),
      tx.delete(auditLogs).where(eq(auditLogs.actorId, userId)).returning({ id: auditLogs.id }),
      tx.delete(accessLogs).where(eq(accessLogs.userId, userId)).returning({ id: accessLogs.id }),
      tx
        .delete(userRoles)
        .where(eq(userRoles.userId, userId))
        .returning({ userId: userRoles.userId }),
    ]);
    const [remainingSessions, remainingAudit, remainingAccess, remainingJoins] = await Promise.all([
      tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId)),
      tx.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.actorId, userId)),
      tx.select({ id: accessLogs.id }).from(accessLogs).where(eq(accessLogs.userId, userId)),
      tx.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.userId, userId)),
    ]);
    if (
      remainingSessions.length !== 0 ||
      remainingAudit.length !== 0 ||
      remainingAccess.length !== 0 ||
      remainingJoins.length !== 0
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 pre-identity absence proof failed");
    }
    const [deletedUsers, deletedRoles] = await Promise.all([
      tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id }),
      tx
        .delete(roles)
        .where(and(eq(roles.id, roleId), eq(roles.name, expectedRoleName(state.marker))))
        .returning({ id: roles.id }),
    ]);
    const [remainingUsers, remainingRoles] = await Promise.all([
      tx.select({ id: users.id }).from(users).where(eq(users.id, userId)),
      tx.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)),
    ]);
    if (
      deletedUsers.length !== 1 ||
      deletedRoles.length !== 1 ||
      remainingUsers.length !== 0 ||
      remainingRoles.length !== 0
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 identity absence proof failed");
    }
    return Object.freeze({
      state: Object.freeze({
        marker: state.marker,
        identity: state.identity,
      }),
      deletedSessions: deletedSessions.length,
      deletedAudit: deletedAudit.length,
      deletedAccess: deletedAccess.length,
      deletedJoins: deletedJoins.length,
    });
  });
}

async function installTask492Fixtures(
  input: Task492BootstrapInput,
  passwordHash: string
): Promise<{
  readonly identity: Task492FixtureIdentity;
  readonly statements: number;
  readonly rows: number;
}> {
  return await db.transaction(async (tx) => {
    const emailFields = buildEmailFields(input.admin.email);
    const roleName = expectedRoleName(input.authority.runMarker);
    const [insertedRoles] = await tx
      .insert(roles)
      .values({
        name: roleName,
        description: expectedRoleDescription(),
        permissions: [...expectedPermissions()],
      })
      .returning({ id: roles.id });
    if (insertedRoles === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-492 role was not created");
    }
    const [insertedUsers] = await tx
      .insert(users)
      .values({
        email: emailFields.email,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
        name: "TASK-492 smoke admin",
        passwordHash,
        status: "active",
      })
      .returning({ id: users.id });
    if (insertedUsers === undefined || insertedUsers.id === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-492 user was not created");
    }
    await tx.insert(userRoles).values({ userId: insertedUsers.id, roleId: insertedRoles.id });
    return Object.freeze({
      identity: Object.freeze({ userId: insertedUsers.id, roleId: insertedRoles.id }),
      statements: 4,
      rows: 3,
    });
  });
}

export class Task492ProductionHandlers implements Task492WorkerHandlers {
  #settingsLease: Task492SettingsLease;
  #state: Task492InstalledState | null = null;
  #cleaned = false;
  #closed = false;
  #databaseClosed = false;
  #fixturesInstalled = false;
  #recoveryStarted = false;
  #closePromise: Promise<void> | null = null;
  #dependencies: Task492ProductionHandlerDependencies;

  constructor(
    dependencies: Task492ProductionHandlerDependencyOverrides | (() => Promise<void>) = {}
  ) {
    this.#dependencies = Object.freeze({
      ...TASK492_PRODUCTION_HANDLER_DEPENDENCIES,
      ...(typeof dependencies === "function" ? { closeDatabase: dependencies } : dependencies),
    });
    this.#settingsLease = new Task492SettingsLease(this.#dependencies.settingsPersistence);
  }

  async #restoreSettingsAfterFailure(error: unknown, message: string): Promise<never> {
    if (this.#fixturesInstalled) throw error;
    try {
      await this.#settingsLease.restore();
    } catch (restoreError) {
      throw new AggregateError([error, restoreError], message);
    }
    throw error;
  }

  async #closeResources(): Promise<void> {
    let restoreError: unknown;
    let restoreFailed = false;
    if (this.#cleaned || (!this.#fixturesInstalled && !this.#recoveryStarted)) {
      try {
        await this.#settingsLease.restore();
      } catch (error) {
        restoreError = error;
        restoreFailed = true;
      }
    }

    let databaseError: unknown;
    let databaseFailed = false;
    try {
      await this.#dependencies.closeDatabase();
      this.#databaseClosed = true;
    } catch (error) {
      databaseError = error;
      databaseFailed = true;
    }

    if (restoreFailed && databaseFailed) {
      throw new AggregateError([restoreError, databaseError], "TASK-492 worker shutdown failed");
    }
    if (restoreFailed) throw restoreError;
    if (databaseFailed) throw databaseError;
  }

  async bootstrap(input: Task492BootstrapInput): Promise<Task492BootstrapOutput> {
    if (this.#state !== null || this.#cleaned)
      throw new SmokeError("smoke_output_invalid", "TASK-492 bootstrap cannot be replayed");
    try {
      const adminPath = await this.#dependencies.readAdminPath();
      if (
        typeof adminPath !== "string" ||
        adminPath.length === 0 ||
        adminPath[0] !== "/" ||
        adminPath.includes("\0")
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-492 admin path is invalid");
      }
      await this.#settingsLease.apply(input.authority);
      this.#recoveryStarted = true;
      const passwordHash = await this.#dependencies.hashPassword(input.admin.password);
      const installed = await installTask492Fixtures(input, passwordHash);
      this.#fixturesInstalled = true;
      this.#state = Object.freeze({
        marker: input.authority.runMarker,
        identity: installed.identity,
      });
      return Object.freeze({
        schemaVersion: 1,
        runMarker: input.authority.runMarker,
        adminPath,
        statements: installed.statements,
        rows: installed.rows,
      });
    } catch (error) {
      return await this.#restoreSettingsAfterFailure(error, "TASK-492 bootstrap cleanup failed");
    }
  }

  async read(input: Task492ReadInput): Promise<Task492ReadOutput> {
    if (this.#state === null)
      throw new SmokeError("smoke_output_invalid", "TASK-492 fixtures are not installed");
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "security.settings"))
      .limit(1);
    const stored = row?.value;
    if (!isPlainObject(stored) || !isPlainObject(stored.loginAlerts)) {
      throw new SmokeError("smoke_output_invalid", "TASK-492 stored settings are invalid");
    }
    const loginAlerts = stored.loginAlerts as Record<string, unknown>;
    const webhookUrlMatches = loginAlerts.webhookUrl === input.expectedWebhookUrl;
    const webhookSecretEncryptedAtRest = isEncryptedSecret(loginAlerts.webhookSecret);
    const recipientsMatch =
      Array.isArray(loginAlerts.recipients) &&
      JSON.stringify(loginAlerts.recipients) === JSON.stringify(input.expectedRecipients);
    if (!webhookUrlMatches || !webhookSecretEncryptedAtRest || !recipientsMatch) {
      throw new SmokeError("smoke_output_invalid", "TASK-492 at-rest settings proof failed");
    }
    return Object.freeze({
      schemaVersion: 1,
      webhookUrlMatches: true,
      webhookSecretEncryptedAtRest: true,
      recipientsMatch: true,
      statements: 1,
      rows: 1,
    });
  }

  async cleanup(authority: Task492RecoveryAuthority): Promise<Task492CleanupOutput> {
    if (this.#cleaned)
      throw new SmokeError("smoke_output_invalid", "TASK-492 cleanup cannot be replayed");
    this.#cleaned = true;
    const removal = await removeTask492RecoveryFixtures(authority);
    const identity = removal.state?.identity ?? null;
    let restoreError: unknown = null;
    try {
      await this.#settingsLease.restore();
    } catch (error) {
      restoreError = error;
    }
    if (restoreError !== null) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 settings restoration failed", {
        cause: restoreError,
      });
    }
    if (!this.#settingsLease.restored) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 settings lease was not restored");
    }
    if (identity === null) {
      return Object.freeze({
        schemaVersion: 1,
        sessionsRemoved: 0,
        auditRowsRemoved: 0,
        accessLogsRemoved: 0,
        userRolesRemoved: 0,
        usersRemoved: 0,
        rolesRemoved: 0,
        preIdentityAbsenceProved: true,
        identityAbsenceProved: true,
        settingsRestored: true,
        statements: 2,
        rows: 0,
      });
    }
    return Object.freeze({
      schemaVersion: 1,
      sessionsRemoved: removal.deletedSessions,
      auditRowsRemoved: removal.deletedAudit,
      accessLogsRemoved: removal.deletedAccess,
      userRolesRemoved: removal.deletedJoins,
      usersRemoved: 1,
      rolesRemoved: 1,
      preIdentityAbsenceProved: true,
      identityAbsenceProved: true,
      settingsRestored: true,
      statements: 3,
      rows:
        1 +
        removal.deletedSessions +
        removal.deletedAudit +
        removal.deletedAccess +
        removal.deletedJoins,
    });
  }

  async prove(authority: Task492RecoveryAuthority): Promise<Task492ProofOutput> {
    const recovery = await inspectTask492FixtureRecovery(authority);
    const fixturesAbsent = recovery.kind === "absent";
    if (!fixturesAbsent) requireComplete(recovery);
    const settingsRestored = this.#settingsLease.restored;
    const receiptAbsent = await this.#settingsLease.proveReceiptAbsent(authority);
    if (!fixturesAbsent || !settingsRestored || !receiptAbsent) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-492 terminal proof is incomplete");
    }
    return Object.freeze({
      schemaVersion: 1,
      fixturesAbsent: true,
      identitiesAbsent: true,
      settingsRestored: true,
      receiptAbsent: true,
      statements: 3,
      rows: 0,
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#closePromise ??= this.#closeResources();
    await this.#closePromise;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && this.#databaseClosed;
  }
}
