// TASK-490 DB fixture handlers: deterministic marker-scoped UUIDs, one
// transactional install (role + admin actor + form + fields + submission), a
// FK-safe set-based cleanup of ONLY the rows this run created, and a post-commit
// absence proof. The worker reads the derived site.adminPath from the settings
// table (never assumes /admin) and never touches other rows.

import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import {
  accessLogs,
  auditLogs,
  formFields,
  forms,
  formSubmissions,
  roles,
  sessions,
  settings,
  userRoles,
  users,
} from "../../../../core/db/schema";
import { hashPassword } from "../../../../core/services/auth/password";
import { buildEmailFields } from "../../../../core/services/security/piiEmail";
import { SmokeError } from "../../contracts";
import type {
  Task490AuthPrepareInput,
  Task490AuthPrepareOutput,
  Task490AuthRestoreInput,
  Task490AuthRestoreOutput,
  Task490CleanupOutput,
  Task490InstallInput,
  Task490InstallOutput,
  Task490ProofOutput,
  Task490RecoveryAuthority,
  Task490WorkerHandlers,
} from "./worker-operations";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ADMIN_PATH = /^\/[A-Za-z0-9._~/-]{0,127}$/u;
const ADMIN_ROLE_PERMISSIONS = Object.freeze(["content:read", "forms:read"]);

const SECURITY_SETTINGS_KEY = "security.settings";
const AUTH_FAST_WINDOW_SECONDS = 5;
const AUTH_MINIMUM_REQUESTS = 10;

const fixtureIds = (marker: string) => {
  const uuid = (salt: string): string => {
    const namespace = Buffer.from("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "hex");
    const digest = createHash("sha1")
      .update(namespace)
      .update(`task490:${marker}:${salt}`)
      .digest();
    digest[6] = (digest[6]! & 0x0f) | 0x50;
    digest[8] = (digest[8]! & 0x3f) | 0x80;
    const hex = digest.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  };
  return Object.freeze({
    roleId: uuid("role"),
    userId: uuid("user"),
    formId: uuid("form"),
    submissionId: uuid("submission"),
    fieldIds: Object.freeze([uuid("field:full_name"), uuid("field:email"), uuid("field:message")]),
  });
};

const FIELD_DEFINITIONS = Object.freeze([
  {
    idSalt: "field:full_name",
    type: "text",
    label: "Full name",
    name: "full_name",
    required: true,
    orderIndex: 0,
  },
  {
    idSalt: "field:email",
    type: "email",
    label: "Email",
    name: "email",
    required: true,
    orderIndex: 1,
  },
  {
    idSalt: "field:message",
    type: "textarea",
    label: "Message",
    name: "message",
    required: false,
    orderIndex: 2,
  },
] as const);

const SUBMISSION_PAYLOAD = Object.freeze({
  full_name: "TASK-490 Smoke Tester",
  email: "smoke490@example.test",
  // Leading `=` proves the CSV formula-injection guard (`'=` prefix) while the
  // JSON export keeps the raw value.
  message: "=TASK-490 export receipt marker",
});

// PII-ish columns that the export contract deliberately omits; they are seeded
// so the suite can prove both downloads never leak them.
const SUBMISSION_PII = Object.freeze({
  ip: "203.0.113.10",
  userAgent: "task490-smoke-agent/1.0",
});

function normalizeAdminPath(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const prefixed = trimmed.startsWith("/") ? trimmed : trimmed ? `/${trimmed}` : "/admin";
  const normalized =
    prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
  if (!ADMIN_PATH.test(normalized)) {
    throw new SmokeError("smoke_output_invalid", "TASK-490 admin path is unsafe");
  }
  return normalized;
}

async function readAdminPath(tx: DbTransaction): Promise<string> {
  const [row] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "site.adminPath"));
  return normalizeAdminPath(row?.value);
}

function removedCount(rows: readonly unknown[]): number {
  return rows.length;
}

interface Task490SettingsSnapshot {
  readonly exists: boolean;
  readonly value: unknown;
  readonly updatedAt: Date | null;
}

export class Task490ProductionHandlers implements Task490WorkerHandlers {
  #closed = false;
  #databaseClosed = false;
  #closePromise: Promise<void> | null = null;
  #fixturesInstalled = false;
  #cleaned = false;
  #authMarker: string | null = null;
  #authSnapshot: Task490SettingsSnapshot | null = null;
  #authPrepared = false;
  #authRestored = false;
  #authChanged = false;

  async install(input: Task490InstallInput): Promise<Task490InstallOutput> {
    const marker = input.authority.runMarker;
    const ids = fixtureIds(marker);
    const email = `task490-${marker}-admin@smoke.invalid`;
    const passwordHash = await hashPassword(input.credential.password);
    const fields = buildEmailFields(email);
    const slug = `task490-${marker}-form`;
    let adminPath = "/admin";
    await db.transaction(async (tx) => {
      adminPath = await readAdminPath(tx);
      if (!ADMIN_PATH.test(adminPath)) {
        throw new SmokeError("smoke_output_invalid", "TASK-490 admin path is unsafe");
      }
      await tx.insert(roles).values({
        id: ids.roleId,
        name: `task490-${marker}-admin`,
        description: "TASK-490 synthetic runtime smoke role",
        permissions: [...ADMIN_ROLE_PERMISSIONS],
      });
      await tx.insert(users).values({
        id: ids.userId,
        email: fields.email,
        emailHash: fields.emailHash,
        emailEncrypted: fields.emailEncrypted,
        passwordHash,
        name: "TASK-490 Admin",
        status: "active",
      });
      await tx.insert(userRoles).values({ userId: ids.userId, roleId: ids.roleId });
      await tx.insert(forms).values({
        id: ids.formId,
        name: "TASK-490 Smoke Form",
        slug,
        status: "published",
        description: "TASK-490 export runtime smoke fixture",
        successMessage: null,
        successRedirectUrl: null,
        submissionAccess: "public",
        settings: {},
      });
      await tx.insert(formFields).values(
        FIELD_DEFINITIONS.map((definition, index) => ({
          id: ids.fieldIds[index]!,
          formId: ids.formId,
          type: definition.type,
          label: definition.label,
          name: definition.name,
          required: definition.required,
          settings: {},
          orderIndex: definition.orderIndex,
        }))
      );
      await tx.insert(formSubmissions).values({
        id: ids.submissionId,
        formId: ids.formId,
        payload: { ...SUBMISSION_PAYLOAD },
        status: "new",
        ip: SUBMISSION_PII.ip,
        userAgent: SUBMISSION_PII.userAgent,
      });
    });
    this.#fixturesInstalled = true;
    return Object.freeze({
      schemaVersion: 1,
      runMarker: marker,
      adminPath,
      roleId: ids.roleId,
      userId: ids.userId,
      formId: ids.formId,
      submissionId: ids.submissionId,
      fieldIds: [...ids.fieldIds],
      statements: 7,
      rows: 8,
    });
  }

  async cleanup(authority: Task490RecoveryAuthority): Promise<Task490CleanupOutput> {
    const ids = fixtureIds(authority.runMarker);
    let removed: Task490CleanupOutput["rows"] = 0;
    let counts: Readonly<{
      formsRemoved: number;
      formFieldsRemoved: number;
      submissionsRemoved: number;
      sessionsRemoved: number;
      auditLogsRemoved: number;
      accessLogsRemoved: number;
      userRolesRemoved: number;
      usersRemoved: number;
      rolesRemoved: number;
    }> = Object.freeze({
      formsRemoved: 0,
      formFieldsRemoved: 0,
      submissionsRemoved: 0,
      sessionsRemoved: 0,
      auditLogsRemoved: 0,
      accessLogsRemoved: 0,
      userRolesRemoved: 0,
      usersRemoved: 0,
      rolesRemoved: 0,
    });
    await db.transaction(async (tx) => {
      const submissions = await tx
        .delete(formSubmissions)
        .where(
          and(eq(formSubmissions.id, ids.submissionId), eq(formSubmissions.formId, ids.formId))
        )
        .returning({ id: formSubmissions.id });
      const fieldRows = await tx
        .delete(formFields)
        .where(and(eq(formFields.formId, ids.formId), inArray(formFields.id, [...ids.fieldIds])))
        .returning({ id: formFields.id });
      const formRows = await tx
        .delete(forms)
        .where(and(eq(forms.id, ids.formId), eq(forms.slug, `task490-${authority.runMarker}-form`)))
        .returning({ id: forms.id });
      const sessionRows = await tx
        .delete(sessions)
        .where(eq(sessions.userId, ids.userId))
        .returning({ id: sessions.id });
      const auditRows = await tx
        .delete(auditLogs)
        .where(eq(auditLogs.actorId, ids.userId))
        .returning({ id: auditLogs.id });
      const accessRows = await tx
        .delete(accessLogs)
        .where(eq(accessLogs.userId, ids.userId))
        .returning({ id: accessLogs.id });
      const joinRows = await tx
        .delete(userRoles)
        .where(eq(userRoles.userId, ids.userId))
        .returning({ id: userRoles.userId });
      const userRows = await tx
        .delete(users)
        .where(
          and(
            eq(users.id, ids.userId),
            eq(
              users.email,
              buildEmailFields(`task490-${authority.runMarker}-admin@smoke.invalid`).email
            )
          )
        )
        .returning({ id: users.id });
      const roleRows = await tx
        .delete(roles)
        .where(
          and(eq(roles.id, ids.roleId), eq(roles.name, `task490-${authority.runMarker}-admin`))
        )
        .returning({ id: roles.id });
      removed =
        removedCount(submissions) +
        removedCount(fieldRows) +
        removedCount(formRows) +
        removedCount(sessionRows) +
        removedCount(auditRows) +
        removedCount(accessRows) +
        removedCount(joinRows) +
        removedCount(userRows) +
        removedCount(roleRows);
      counts = Object.freeze({
        formsRemoved: removedCount(formRows),
        formFieldsRemoved: removedCount(fieldRows),
        submissionsRemoved: removedCount(submissions),
        sessionsRemoved: removedCount(sessionRows),
        auditLogsRemoved: removedCount(auditRows),
        accessLogsRemoved: removedCount(accessRows),
        userRolesRemoved: removedCount(joinRows),
        usersRemoved: removedCount(userRows),
        rolesRemoved: removedCount(roleRows),
      });
    });
    const [fixtureAbsenceProved, identityAbsenceProved] = await Promise.all([
      this.#proveFixturesAbsent(ids),
      this.#proveIdentitiesAbsent(ids),
    ]);
    this.#cleaned = true;
    return Object.freeze({
      schemaVersion: 1,
      ...counts,
      fixtureAbsenceProved,
      identityAbsenceProved,
      statements: 11,
      rows: removed,
    });
  }

  async prove(authority: Task490RecoveryAuthority): Promise<Task490ProofOutput> {
    const ids = fixtureIds(authority.runMarker);
    const [fixturesAbsent, identitiesAbsent] = await Promise.all([
      this.#proveFixturesAbsent(ids),
      this.#proveIdentitiesAbsent(ids),
    ]);
    return Object.freeze({
      schemaVersion: 1,
      fixturesAbsent,
      identitiesAbsent,
      statements: 2,
      rows: 0,
    });
  }

  async #proveFixturesAbsent(ids: ReturnType<typeof fixtureIds>): Promise<true> {
    const [formRows, fieldRows, submissionRows] = await Promise.all([
      db.select({ id: forms.id }).from(forms).where(eq(forms.id, ids.formId)),
      db.select({ id: formFields.id }).from(formFields).where(eq(formFields.formId, ids.formId)),
      db
        .select({ id: formSubmissions.id })
        .from(formSubmissions)
        .where(eq(formSubmissions.formId, ids.formId)),
    ]);
    if (formRows.length !== 0 || fieldRows.length !== 0 || submissionRows.length !== 0) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-490 fixture rows remain");
    }
    return true;
  }

  async #proveIdentitiesAbsent(ids: ReturnType<typeof fixtureIds>): Promise<true> {
    const [userRows, roleRows, joinRows, sessionRows, auditRows, accessRows] = await Promise.all([
      db.select({ id: users.id }).from(users).where(eq(users.id, ids.userId)),
      db.select({ id: roles.id }).from(roles).where(eq(roles.id, ids.roleId)),
      db.select({ id: userRoles.userId }).from(userRoles).where(eq(userRoles.userId, ids.userId)),
      db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, ids.userId)),
      db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.actorId, ids.userId)),
      db.select({ id: accessLogs.id }).from(accessLogs).where(eq(accessLogs.userId, ids.userId)),
    ]);
    if (
      userRows.length !== 0 ||
      roleRows.length !== 0 ||
      joinRows.length !== 0 ||
      sessionRows.length !== 0 ||
      auditRows.length !== 0 ||
      accessRows.length !== 0
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-490 identity rows remain");
    }
    return true;
  }

  async prepareAuthWindow(input: Task490AuthPrepareInput): Promise<Task490AuthPrepareOutput> {
    if (this.#authPrepared || this.#authSnapshot !== null) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-490 auth window was prepared more than once"
      );
    }
    const securitySettings = await import("../../../../core/services/settings/securitySettings");
    const rows = await db
      .select({ value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(eq(settings.key, SECURITY_SETTINGS_KEY))
      .limit(2);
    if (rows.length > 1) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-490 auth settings cardinality drifted");
    }
    const row = rows[0];
    this.#authMarker = input.marker;
    this.#authSnapshot = Object.freeze({
      exists: row !== undefined,
      value: row?.value ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
    securitySettings.resetSecuritySettingsCache();
    const current = await securitySettings.getSecuritySettings();
    const auth = current.rateLimit.buckets.auth;
    // Rate limiting disabled means the auth bucket cannot 429 the suite, so
    // there is nothing to patch and restore becomes a no-op.
    if (!current.rateLimit.enabled) {
      this.#authPrepared = true;
      this.#authChanged = false;
      return Object.freeze({
        schemaVersion: 1,
        prepared: true,
        changed: false,
        windowSeconds: auth.windowSeconds,
        maxRequests: auth.maxRequests,
      });
    }
    const targetWindow = AUTH_FAST_WINDOW_SECONDS;
    const targetRequests = Math.max(auth.maxRequests, AUTH_MINIMUM_REQUESTS);
    this.#authPrepared = true;
    this.#authChanged = true;
    try {
      await securitySettings.setSecuritySettings({
        rateLimit: {
          buckets: {
            auth: { windowSeconds: targetWindow, maxRequests: targetRequests },
          },
        },
      });
      securitySettings.resetSecuritySettingsCache();
      const after = await securitySettings.getSecuritySettings();
      const afterAuth = after.rateLimit.buckets.auth;
      if (afterAuth.windowSeconds !== targetWindow || afterAuth.maxRequests !== targetRequests) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-490 fast auth window did not persist");
      }
      return Object.freeze({
        schemaVersion: 1,
        prepared: true,
        changed: true,
        windowSeconds: afterAuth.windowSeconds,
        maxRequests: afterAuth.maxRequests,
      });
    } catch (error) {
      try {
        await this.restoreAuthWindow(input);
      } catch {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-490 fast auth window failed and could not restore",
          { cause: error }
        );
      }
      throw error;
    }
  }

  async restoreAuthWindow(input: Task490AuthRestoreInput): Promise<Task490AuthRestoreOutput> {
    if (
      !this.#authPrepared ||
      this.#authSnapshot === null ||
      this.#authRestored ||
      this.#authMarker === null ||
      this.#authMarker !== input.marker
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-490 auth window restore authority is absent"
      );
    }
    if (!this.#authChanged) {
      this.#authRestored = true;
      return Object.freeze({ schemaVersion: 1, restored: true });
    }
    const securitySettings = await import("../../../../core/services/settings/securitySettings");
    const snapshot = this.#authSnapshot;
    await db.transaction(async (transaction) => {
      if (!snapshot.exists) {
        await transaction.delete(settings).where(eq(settings.key, SECURITY_SETTINGS_KEY));
        return;
      }
      if (snapshot.updatedAt === null) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-490 auth settings timestamp is absent");
      }
      await transaction
        .insert(settings)
        .values({
          key: SECURITY_SETTINGS_KEY,
          value: snapshot.value,
          updatedAt: snapshot.updatedAt,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: snapshot.value, updatedAt: snapshot.updatedAt },
        });
    });
    securitySettings.resetSecuritySettingsCache();
    const restoredRows = await db
      .select({ value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(eq(settings.key, SECURITY_SETTINGS_KEY))
      .limit(1);
    const restored = restoredRows[0];
    if (!snapshot.exists) {
      if (restored !== undefined) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-490 auth settings restore left a row");
      }
    } else if (
      restored === undefined ||
      restored.updatedAt === null ||
      snapshot.updatedAt === null ||
      restored.updatedAt.getTime() !== snapshot.updatedAt.getTime() ||
      JSON.stringify(restored.value) !== JSON.stringify(snapshot.value)
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-490 auth settings restore drifted");
    }
    this.#authRestored = true;
    return Object.freeze({ schemaVersion: 1, restored: true });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    // Safety net for hard teardown paths: the adapter dispatches the explicit
    // restore, but if the worker is closed without it (crash recovery, pool
    // shutdown ordering), put the settings row back before closing the pool.
    if (this.#authPrepared && !this.#authRestored && this.#authMarker !== null) {
      try {
        await this.restoreAuthWindow(Object.freeze({ marker: this.#authMarker }));
      } catch {
        // Best-effort during close; the adapter already recorded the failure.
      }
    }
    this.#closePromise ??= closeDatabase().then(() => {
      this.#databaseClosed = true;
    });
    await this.#closePromise;
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && this.#databaseClosed && (!this.#fixturesInstalled || this.#cleaned);
  }
}
