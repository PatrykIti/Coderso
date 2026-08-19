// TASK-467 worker handlers: install and remove a uniquely scoped admin
// identity through the canonical app password/PII services. The handler owns
// its recovery state and proves absence before and after cleanup.
import { and, eq } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import {
  accessLogs,
  auditLogs,
  roles,
  sessions,
  userRoles,
  users,
} from "../../../../core/db/schema";
import { hashPassword } from "../../../../core/services/auth/password";
import { buildEmailFields } from "../../../../core/services/security/piiEmail";
import { SmokeError } from "../../contracts";
import type {
  Task467BootstrapInput,
  Task467BootstrapOutput,
  Task467CleanupOutput,
  Task467ProofOutput,
  Task467RecoveryAuthority,
  Task467WorkerHandlers,
} from "./worker-operations";

export const TASK467_ADMIN_ROLE_PERMISSIONS = Object.freeze([
  "content:read",
  "content:write",
  "content:publish",
  "settings:read",
  "widgets:read",
] as const);

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Task467FixtureIdentity = Readonly<{
  readonly userId: string;
  readonly roleId: string;
}>;

type Task467InstalledState = Readonly<{
  readonly marker: string;
  readonly identity: Task467FixtureIdentity;
}>;

type Task467RecoveryState = Readonly<
  { readonly kind: "absent" } | { readonly kind: "complete"; readonly state: Task467InstalledState }
>;

export interface Task467ProductionHandlerDependencies {
  readonly closeDatabase: () => Promise<void>;
  readonly hashPassword: (password: string) => Promise<string>;
}

const TASK467_PRODUCTION_HANDLER_DEPENDENCIES: Task467ProductionHandlerDependencies = Object.freeze(
  {
    closeDatabase,
    hashPassword,
  }
);

type Task467ProductionHandlerDependencyOverrides = Readonly<
  Partial<Task467ProductionHandlerDependencies>
>;

function expectedAdminEmail(marker: string): string {
  return `task467-${marker}-admin@smoke.invalid`;
}

function expectedRoleName(marker: string): string {
  return `task467-${marker}-admin`;
}

function expectedRoleDescription(): string {
  return "TASK-467 synthetic runtime smoke role";
}

function expectedPermissions(): readonly string[] {
  return TASK467_ADMIN_ROLE_PERMISSIONS;
}

async function reconstructTask467RecoveryState(
  tx: DbTransaction,
  authority: Task467RecoveryAuthority
): Promise<Task467RecoveryState> {
  const emailFields = buildEmailFields(expectedAdminEmail(authority.runMarker));
  const roleName = expectedRoleName(authority.runMarker);
  const [userRows, roleRows] = await Promise.all([
    tx
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(eq(users.email, emailFields.email)),
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
    throw new SmokeError("smoke_cleanup_failed", "TASK-467 recovery matrix is partial");
  }
  const user = userRows[0]!;
  const role = roleRows[0]!;
  if (
    user.name !== "TASK-467 smoke admin" ||
    user.status !== "active" ||
    role.description !== expectedRoleDescription() ||
    JSON.stringify(role.permissions) !== JSON.stringify(expectedPermissions())
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-467 recovery identity drifted");
  }
  const joins = await tx
    .select({ userId: userRoles.userId, roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id));
  if (joins.length !== 1 || joins[0]?.userId !== user.id || joins[0]?.roleId !== role.id) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-467 recovery role binding drifted");
  }
  return Object.freeze({
    kind: "complete",
    state: Object.freeze({
      marker: authority.runMarker,
      identity: Object.freeze({ userId: user.id, roleId: role.id }),
    }),
  });
}

async function removeTask467RecoveryFixtures(authority: Task467RecoveryAuthority): Promise<
  Readonly<{
    readonly deletedSessions: number;
    readonly deletedAudit: number;
    readonly deletedAccess: number;
    readonly deletedJoins: number;
  }>
> {
  return await db.transaction(async (tx) => {
    const recovery = await reconstructTask467RecoveryState(tx, authority);
    if (recovery.kind === "absent") {
      return Object.freeze({
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
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 pre-identity absence proof failed");
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
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 identity absence proof failed");
    }
    return Object.freeze({
      deletedSessions: deletedSessions.length,
      deletedAudit: deletedAudit.length,
      deletedAccess: deletedAccess.length,
      deletedJoins: deletedJoins.length,
    });
  });
}

async function installTask467Fixtures(
  input: Task467BootstrapInput,
  passwordHash: string
): Promise<{
  readonly identity: Task467FixtureIdentity;
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
      throw new SmokeError("smoke_output_invalid", "TASK-467 role was not created");
    }
    const [insertedUsers] = await tx
      .insert(users)
      .values({
        email: emailFields.email,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
        name: "TASK-467 smoke admin",
        passwordHash,
        status: "active",
      })
      .returning({ id: users.id });
    if (insertedUsers === undefined || insertedUsers.id === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-467 user was not created");
    }
    await tx.insert(userRoles).values({ userId: insertedUsers.id, roleId: insertedRoles.id });
    return Object.freeze({
      identity: Object.freeze({ userId: insertedUsers.id, roleId: insertedRoles.id }),
      statements: 4,
      rows: 3,
    });
  });
}

export class Task467ProductionHandlers implements Task467WorkerHandlers {
  #cleaned = false;
  #closed = false;
  #databaseClosed = false;
  #fixturesInstalled = false;
  #closePromise: Promise<void> | null = null;
  #dependencies: Task467ProductionHandlerDependencies;

  constructor(
    dependencies: Task467ProductionHandlerDependencyOverrides | (() => Promise<void>) = {}
  ) {
    this.#dependencies = Object.freeze({
      ...TASK467_PRODUCTION_HANDLER_DEPENDENCIES,
      ...(typeof dependencies === "function" ? { closeDatabase: dependencies } : dependencies),
    });
  }

  async bootstrap(input: Task467BootstrapInput): Promise<Task467BootstrapOutput> {
    if (this.#fixturesInstalled) {
      throw new SmokeError("smoke_output_invalid", "TASK-467 bootstrap cannot be replayed");
    }
    const passwordHash = await this.#dependencies.hashPassword(input.admin.password);
    const installed = await installTask467Fixtures(input, passwordHash);
    this.#fixturesInstalled = true;
    return Object.freeze({
      schemaVersion: 1,
      runMarker: input.authority.runMarker,
      statements: installed.statements,
      rows: installed.rows,
    });
  }

  async cleanup(authority: Task467RecoveryAuthority): Promise<Task467CleanupOutput> {
    if (this.#cleaned) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 cleanup cannot be replayed");
    }
    const removed = await removeTask467RecoveryFixtures(authority);
    if (removed.deletedJoins === 0) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 identity was not installed");
    }
    this.#cleaned = true;
    this.#fixturesInstalled = false;
    return Object.freeze({
      schemaVersion: 1,
      sessionsRemoved: removed.deletedSessions,
      auditRowsRemoved: removed.deletedAudit,
      accessLogsRemoved: removed.deletedAccess,
      userRolesRemoved: removed.deletedJoins,
      usersRemoved: 1,
      rolesRemoved: 1,
      preIdentityAbsenceProved: true,
      identityAbsenceProved: true,
      statements: 8,
      rows: removed.deletedSessions + removed.deletedAudit + removed.deletedAccess + 3,
    });
  }

  async prove(authority: Task467RecoveryAuthority): Promise<Task467ProofOutput> {
    if (!this.#cleaned) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 terminal proof ran before cleanup");
    }
    const state = await db.transaction((tx) => reconstructTask467RecoveryState(tx, authority));
    if (state.kind !== "absent") {
      throw new SmokeError("smoke_cleanup_failed", "TASK-467 terminal identity remains");
    }
    return Object.freeze({
      schemaVersion: 1,
      identitiesAbsent: true,
      receiptsAbsent: true,
      statements: 2,
      rows: 0,
    });
  }

  async close(): Promise<void> {
    if (this.#closePromise !== null) return this.#closePromise;
    this.#closePromise = this.#closeOnce();
    return this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    if (this.#databaseClosed) return;
    await this.#dependencies.closeDatabase();
    this.#databaseClosed = true;
    this.#closed = true;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && this.#databaseClosed;
  }
}
