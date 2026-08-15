import { and, eq, inArray, sql } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import {
  accessLogs,
  auditLogs,
  contentEntries,
  contentTypes,
  roles,
  sessions,
  userRoles,
  users,
} from "../../../../core/db/schema";
import { hashPassword } from "../../../../core/services/auth/password";
import { buildEmailFields, hashEmail } from "../../../../core/services/security/piiEmail";
import { getSetting } from "../../../../core/services/settings/settingsService";
import { SmokeError } from "../../contracts";
import { buildTask517FixtureSpecs, type Task517FixtureKind } from "./browser-actions";
import {
  TASK517_CACHE_TTL_SECONDS,
  TASK517_CONTENT_ROUTES_KEY,
  Task517ContentRoutesLease,
} from "./settings-lease";
import type {
  Task517CleanupOutput,
  Task517InstallInput,
  Task517InstallOutput,
  Task517ProofOutput,
  Task517ReadInput,
  Task517ReadOutput,
  Task517RecoveryAuthority,
  Task517WorkerHandlers,
} from "./worker-operations";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type FixtureState = Readonly<{
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
  readonly entryId: string;
  readonly typeId: string;
}>;

type InstalledState = Readonly<{
  readonly marker: string;
  readonly adminUserId: string;
  readonly roleId: string;
  readonly contentTypeId: string;
  readonly contentTypeSlug: string;
  readonly fixtures: readonly FixtureState[];
}>;

const VALID_VISIBILITIES = new Set(["public", "private", "password"]);

function fixtureVisibility(kind: Task517FixtureKind): "public" | "private" | "password" {
  if (kind === "public") return "public";
  if (kind === "private") return "private";
  return "password";
}

function expectOne<T>(rows: readonly T[], label: string): T {
  if (rows.length !== 1) {
    throw new SmokeError("smoke_output_invalid", `TASK-517 ${label} expected exactly one row`);
  }
  return rows[0]!;
}

async function resolveAdminPath(): Promise<string> {
  const value = await getSetting("site.adminPath");
  const adminPath = typeof value === "string" && value.startsWith("/") ? value : "/admin";
  if (adminPath === "/") {
    throw new SmokeError("smoke_output_invalid", "TASK-517 adminPath is not nested");
  }
  return adminPath;
}

async function insertContentType(tx: DbTransaction, name: string, slug: string): Promise<string> {
  const rows = await tx
    .insert(contentTypes)
    .values({
      name,
      slug,
      schema: { fields: [] },
      config: {},
      status: "published",
    })
    .returning({ id: contentTypes.id });
  return expectOne(rows, "content type").id;
}

async function insertAdminIdentity(
  tx: DbTransaction,
  marker: string,
  email: string,
  passwordHash: string
): Promise<{ userId: string; roleId: string }> {
  const roleRows = await tx
    .insert(roles)
    .values({
      name: `task517-${marker}-admin`,
      description: "TASK-517 synthetic runtime smoke role",
      permissions: ["content:read", "content:write", "content:publish"],
    })
    .returning({ id: roles.id, name: roles.name });
  const roleId = expectOne(roleRows, "role").id;
  const fields = buildEmailFields(email);
  const userRows = await tx
    .insert(users)
    .values({
      email: fields.email,
      emailHash: fields.emailHash,
      emailEncrypted: fields.emailEncrypted,
      name: "TASK-517 admin",
      passwordHash,
      status: "active",
    })
    .returning({ id: users.id, email: users.email });
  const user = expectOne(userRows, "user");
  if (user.email !== hashEmail(email)) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 admin PII drift");
  }
  await tx.insert(userRoles).values({ userId: user.id, roleId });
  return { userId: user.id, roleId };
}

async function insertFixtures(
  tx: DbTransaction,
  fixtures: readonly {
    fixtureId: string;
    kind: Task517FixtureKind;
    slug: string;
    title: string;
    bodyMarker: string;
  }[],
  accessPasswordHashes: ReadonlyMap<string, string | null>,
  contentTypeId: string,
  authorId: string
): Promise<readonly FixtureState[]> {
  const now = sql`now()`;
  const inserted = await tx
    .insert(contentEntries)
    .values(
      fixtures.map((fixture) => {
        const visibility = fixtureVisibility(fixture.kind);
        return {
          typeId: contentTypeId,
          authorId,
          slug: fixture.slug,
          title: fixture.title,
          status: "published",
          visibility,
          accessPassword: accessPasswordHashes.get(fixture.fixtureId) ?? null,
          tags: [],
          data: { marker: fixture.bodyMarker },
          publishedAt: now,
          scheduledAt: null,
        };
      })
    )
    .returning({ id: contentEntries.id, slug: contentEntries.slug });
  if (inserted.length !== fixtures.length) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 entries were not created");
  }
  const bySlug = new Map(inserted.map((row) => [row.slug, row.id]));
  return Object.freeze(
    fixtures.map((fixture) => {
      const entryId = bySlug.get(fixture.slug);
      if (entryId === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-517 fixture entry is absent");
      }
      return Object.freeze({
        fixtureId: fixture.fixtureId,
        kind: fixture.kind,
        entryId,
        typeId: contentTypeId,
      });
    })
  );
}

export class Task517ProductionHandlers implements Task517WorkerHandlers {
  readonly #lease = new Task517ContentRoutesLease();
  #state: InstalledState | null = null;

  async install(input: Task517InstallInput): Promise<Task517InstallOutput> {
    if (this.#state !== null) {
      throw new SmokeError("smoke_argument_invalid", "TASK-517 install already ran");
    }
    const { authority, admin, fixtures } = input;
    const [adminPasswordHash, ...fixturePasswordHashes] = await Promise.all([
      hashPassword(admin.password),
      ...fixtures.map((fixture) =>
        fixture.accessPassword === null
          ? Promise.resolve(null)
          : hashPassword(fixture.accessPassword)
      ),
    ]);
    const passwordHashesByFixture = new Map(
      fixtures.map((fixture, index) => [fixture.fixtureId, fixturePasswordHashes[index]!])
    );
    const contentTypeSlug = `task517-${authority.runMarker}`;
    const listPath = `/content/${contentTypeSlug}`;
    const detailPath = `/content/${contentTypeSlug}/:slug`;

    const installResult = await db.transaction(
      async (tx) => {
        const contentTypeId = await insertContentType(
          tx,
          `TASK-517 ${authority.runMarker}`,
          contentTypeSlug
        );
        const identity = await insertAdminIdentity(
          tx,
          authority.runMarker,
          admin.email,
          adminPasswordHash
        );
        const insertedFixtures = await insertFixtures(
          tx,
          fixtures,
          passwordHashesByFixture,
          contentTypeId,
          identity.userId
        );
        return Object.freeze({
          contentTypeId,
          identity,
          insertedFixtures,
        });
      },
      { isolationLevel: "read committed" }
    );

    await this.#lease.apply(contentTypeSlug, listPath, detailPath, TASK517_CACHE_TTL_SECONDS);
    const adminPath = await resolveAdminPath();
    this.#state = Object.freeze({
      marker: authority.runMarker,
      adminUserId: installResult.identity.userId,
      roleId: installResult.identity.roleId,
      contentTypeId: installResult.contentTypeId,
      contentTypeSlug,
      fixtures: installResult.insertedFixtures,
    });
    return Object.freeze({
      schemaVersion: 1,
      runMarker: authority.runMarker,
      adminUserId: installResult.identity.userId,
      roleId: installResult.identity.roleId,
      contentTypeId: installResult.contentTypeId,
      contentTypeSlug,
      adminPath,
      fixtures: installResult.insertedFixtures,
      statements: 5,
      rows: 2 + fixtures.length,
    });
  }

  async read(input: Task517ReadInput): Promise<Task517ReadOutput> {
    if (this.#state === null) {
      throw new SmokeError("smoke_argument_invalid", "TASK-517 install has not run");
    }
    const state = this.#state;
    const expected = new Map(state.fixtures.map((fixture) => [fixture.entryId, fixture]));
    const rows = await db
      .select({
        id: contentEntries.id,
        slug: contentEntries.slug,
        title: contentEntries.title,
        status: contentEntries.status,
        visibility: contentEntries.visibility,
        accessPassword: contentEntries.accessPassword,
        publishedAt: contentEntries.publishedAt,
        data: contentEntries.data,
      })
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.typeId, state.contentTypeId),
          inArray(contentEntries.id, [...expected.keys()])
        )
      )
      .orderBy(contentEntries.createdAt);
    if (rows.length !== 4) {
      throw new SmokeError("smoke_output_invalid", "TASK-517 read fixture count drifted");
    }
    const fixtures = Object.freeze(
      rows.map((row) => {
        const fixture = expected.get(row.id);
        if (fixture === undefined) {
          throw new SmokeError("smoke_output_invalid", "TASK-517 read fixture is foreign");
        }
        if (
          row.visibility !== "public" &&
          row.visibility !== "private" &&
          row.visibility !== "password"
        ) {
          throw new SmokeError("smoke_output_invalid", "TASK-517 read visibility invalid");
        }
        if (fixtureVisibility(fixture.kind) !== row.visibility) {
          throw new SmokeError("smoke_output_invalid", "TASK-517 read visibility drifted");
        }
        const marker = isPlainRecord(row.data) ? row.data["marker"] : undefined;
        return Object.freeze({
          fixtureId: fixture.fixtureId,
          kind: fixture.kind,
          visibility: row.visibility,
          status: row.status === "published" ? "published" : "draft",
          published: row.publishedAt !== null,
          hasAccessPassword: row.accessPassword !== null,
          title: row.title,
          slug: row.slug,
          bodyMarker: typeof marker === "string" ? marker : "",
        });
      })
    );
    return Object.freeze({ schemaVersion: 1, fixtures, statements: 1, rows: rows.length });
  }

  async cleanup(input: Task517RecoveryAuthority): Promise<Task517CleanupOutput> {
    const state = this.#state;
    if (state === null) {
      throw new SmokeError("smoke_argument_invalid", "TASK-517 install has not run");
    }
    const entryIds = state.fixtures.map(({ entryId }) => entryId);
    const result = await db.transaction(
      async (tx) => {
        const [access, audit, sessionsRows, joins] = await Promise.all([
          tx
            .delete(accessLogs)
            .where(inArray(accessLogs.userId, [state.adminUserId]))
            .returning({ id: accessLogs.id }),
          tx
            .delete(auditLogs)
            .where(inArray(auditLogs.actorId, [state.adminUserId]))
            .returning({ id: auditLogs.id }),
          tx
            .delete(sessions)
            .where(inArray(sessions.userId, [state.adminUserId]))
            .returning({ id: sessions.id }),
          tx
            .delete(userRoles)
            .where(inArray(userRoles.userId, [state.adminUserId]))
            .returning({ id: userRoles.userId }),
        ]);
        const deletedEntries = await tx
          .delete(contentEntries)
          .where(inArray(contentEntries.id, entryIds))
          .returning({ id: contentEntries.id });
        const deletedTypes = await tx
          .delete(contentTypes)
          .where(eq(contentTypes.id, state.contentTypeId))
          .returning({ id: contentTypes.id });
        const deletedUsers = await tx
          .delete(users)
          .where(eq(users.id, state.adminUserId))
          .returning({ id: users.id });
        const deletedRoles = await tx
          .delete(roles)
          .where(and(eq(roles.id, state.roleId), eq(roles.name, `task517-${state.marker}-admin`)))
          .returning({ id: roles.id });
        const [remainingEntries, remainingUsers, remainingRoles] = await Promise.all([
          tx
            .select({ id: contentEntries.id })
            .from(contentEntries)
            .where(inArray(contentEntries.id, entryIds)),
          tx.select({ id: users.id }).from(users).where(eq(users.id, state.adminUserId)),
          tx.select({ id: roles.id }).from(roles).where(eq(roles.id, state.roleId)),
        ]);
        if (
          remainingEntries.length !== 0 ||
          remainingUsers.length !== 0 ||
          remainingRoles.length !== 0
        ) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-517 identity absence proof failed");
        }
        return Object.freeze({
          accessLogsRemoved: access.length,
          loginAuditRowsRemoved: audit.length,
          sessionsRemoved: sessionsRows.length,
          userRolesRemoved: joins.length,
          entriesRemoved: deletedEntries.length,
          contentTypesRemoved: deletedTypes.length,
          usersRemoved: deletedUsers.length,
          rolesRemoved: deletedRoles.length,
        });
      },
      { isolationLevel: "read committed" }
    );
    const restored = await this.#lease.restore();
    this.#state = null;
    if (restored !== "restored") {
      throw new SmokeError("smoke_cleanup_failed", "TASK-517 settings restore proof failed");
    }
    return Object.freeze({
      schemaVersion: 1,
      ...result,
      preIdentityAbsenceProved: true,
      identityAbsenceProved: true,
      settingsRestored: true,
      statements: 5,
      rows: 2 + entryIds.length,
    });
  }

  async prove(input: Task517RecoveryAuthority): Promise<Task517ProofOutput> {
    if (this.#state !== null) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-517 install state still active");
    }
    const fixturesAbsent = await this.#fixturesAbsent();
    const identitiesAbsent = await this.#identitiesAbsent();
    const settingsRestored = !this.#lease.isActive();
    if (!fixturesAbsent || !identitiesAbsent || !settingsRestored) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-517 terminal proof failed");
    }
    return Object.freeze({
      schemaVersion: 1,
      fixturesAbsent: true,
      identitiesAbsent: true,
      settingsRestored: true,
      statements: 2,
      rows: 0,
    });
  }

  async #fixturesAbsent(): Promise<boolean> {
    const [types, entries] = await Promise.all([
      db
        .select({ id: contentTypes.id })
        .from(contentTypes)
        .where(sql`name like 'TASK-517 %'`),
      db
        .select({ id: contentEntries.id })
        .from(contentEntries)
        .where(sql`slug like 'task517-%'`),
    ]);
    return types.length === 0 && entries.length === 0;
  }

  async #identitiesAbsent(): Promise<boolean> {
    const [userRows, roleRows] = await Promise.all([
      db
        .select({ id: users.id })
        .from(users)
        .where(sql`email like 'task517-%@smoke.invalid'`),
      db
        .select({ id: roles.id })
        .from(roles)
        .where(sql`name like 'task517-%-admin'`),
    ]);
    return userRows.length === 0 && roleRows.length === 0;
  }

  async close(): Promise<void> {
    try {
      if (this.#lease.isActive()) {
        await this.#lease.restore();
      }
      this.#state = null;
    } finally {
      await closeDatabase();
    }
  }

  async proveAbsent(): Promise<boolean> {
    if (this.#lease.isActive()) return false;
    const fixturesAbsent = await this.#fixturesAbsent();
    const identitiesAbsent = await this.#identitiesAbsent();
    return fixturesAbsent && identitiesAbsent;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
