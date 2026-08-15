import { and, eq, inArray } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import { DEFAULT_ADMIN_ROLE_ID } from "../../../../core/db/seedConstants";
import {
  contentEntries,
  contentRevisions,
  contentTypes,
  roles,
  sessions,
  settings,
  userRoles,
  users,
} from "../../../../core/db/schema";
import { hashPassword } from "../../../../core/services/auth/password";
import { buildEmailFields, hashEmail } from "../../../../core/services/security/piiEmail";
import { getSecuritySettings } from "../../../../core/services/settings/securitySettings";
import { SmokeError } from "../../contracts";
import { TASK487_SCENARIO_IDS, task487ScenarioDescriptor } from "./descriptors";
import type {
  Task487CleanupOutput,
  Task487InstallInput,
  Task487InstallOutput,
  Task487ProofOutput,
  Task487RecoveryAuthority,
  Task487WorkerHandlers,
} from "./worker-operations";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ActorState = Readonly<{ readonly userId: string; readonly roleId: string }>;
type FixtureState = Readonly<{
  readonly scenarioId: string;
  readonly entryId: string;
  readonly revisionCount: number;
}>;

interface InstalledState {
  readonly marker: string;
  readonly typeId: string;
  readonly typeSlug: string;
  readonly actor: ActorState;
  readonly fixtures: readonly FixtureState[];
}

type RecoveryState = Readonly<
  { readonly kind: "absent" } | { readonly kind: "complete"; readonly state: InstalledState }
>;

type RemovalCounts = Readonly<{
  readonly revisionsRemoved: number;
  readonly entriesRemoved: number;
  readonly typesRemoved: number;
  readonly sessionsRemoved: number;
  readonly userRolesRemoved: number;
  readonly usersRemoved: number;
}>;

const EMPTY_REMOVAL_COUNTS: RemovalCounts = Object.freeze({
  revisionsRemoved: 0,
  entriesRemoved: 0,
  typesRemoved: 0,
  sessionsRemoved: 0,
  userRolesRemoved: 0,
  usersRemoved: 0,
});

function expectedActorIdentity(authority: Task487RecoveryAuthority) {
  const email = `task487-${authority.runMarker}-admin@smoke.invalid`;
  return Object.freeze({
    email,
    emailHash: hashEmail(email),
    name: "TASK-487 revisions admin",
  });
}

function expectedTypeIdentity(authority: Task487RecoveryAuthority) {
  return Object.freeze({
    slug: `task487-${authority.runMarker}-post`,
    name: "TASK-487 revisions post",
  });
}

function expectedFixtureIdentity(authority: Task487RecoveryAuthority) {
  return TASK487_SCENARIO_IDS.map((scenarioId) => {
    const descriptor = task487ScenarioDescriptor(scenarioId);
    return Object.freeze({
      scenarioId,
      slug: `task487-${authority.runMarker}-entry-${scenarioId}`,
      title: `TASK-487 ${scenarioId} (${descriptor.title})`,
    });
  });
}

const CONTENT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["title", "body"]),
  properties: Object.freeze({
    title: Object.freeze({ type: "string", title: "Title", xFieldType: "text" }),
    body: Object.freeze({ type: "string", title: "Body", xFieldType: "text" }),
  }),
});

async function readAdminPath(tx: DbTransaction): Promise<string> {
  const [row] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "site.adminPath"))
    .limit(1);
  const value = row?.value;
  if (value === undefined || value === null) return "/admin";
  if (typeof value !== "string") {
    throw new SmokeError("smoke_output_invalid", "TASK-487 admin path setting is invalid");
  }
  const trimmed = value.trim();
  if (!trimmed) return "/admin";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized =
    prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
  if (!/^\/[a-zA-Z0-9_-]+$/.test(normalized)) {
    throw new SmokeError("smoke_output_invalid", "TASK-487 admin path setting is invalid");
  }
  return normalized;
}

/**
 * Resolve the admin role id the same way `seed.ts` and the first-run service
 * do: the migration-guaranteed stable id (TASK-518,
 * `core/db/seedConstants.ts`) first, then select-by-name "admin" for
 * pre-518 installs whose role carries a legacy random id. Never create a
 * duplicate role and never renumber an existing one.
 */
async function resolveAdminRoleId(tx: DbTransaction): Promise<string> {
  let [role] = await tx
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.id, DEFAULT_ADMIN_ROLE_ID))
    .limit(1);
  if (role === undefined) {
    [role] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, "admin")).limit(1);
  }
  if (role === undefined) {
    throw new SmokeError("smoke_argument_invalid", "TASK-487 admin role is missing");
  }
  return role.id;
}

async function reconstructTask487RecoveryState(
  tx: DbTransaction,
  authority: Task487RecoveryAuthority
): Promise<RecoveryState> {
  const expectedActor = expectedActorIdentity(authority);
  const expectedType = expectedTypeIdentity(authority);
  const expectedFixtures = expectedFixtureIdentity(authority);
  const [userRows, typeRows] = await Promise.all([
    tx
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(eq(users.email, expectedActor.emailHash)),
    tx
      .select({
        id: contentTypes.id,
        slug: contentTypes.slug,
        name: contentTypes.name,
        status: contentTypes.status,
      })
      .from(contentTypes)
      .where(eq(contentTypes.slug, expectedType.slug)),
  ]);
  if (userRows.length === 0 && typeRows.length === 0) {
    return Object.freeze({ kind: "absent" });
  }
  if (userRows.length !== 1 || typeRows.length !== 1) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-487 recovery matrix is partial");
  }
  const user = userRows[0]!;
  const type = typeRows[0]!;
  if (
    user.name !== expectedActor.name ||
    user.status !== "active" ||
    type.name !== expectedType.name ||
    type.status !== "published"
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-487 recovery identity drifted");
  }
  const entryRows = await tx
    .select({
      id: contentEntries.id,
      slug: contentEntries.slug,
      title: contentEntries.title,
      authorId: contentEntries.authorId,
    })
    .from(contentEntries)
    .where(
      and(
        eq(contentEntries.typeId, type.id),
        inArray(
          contentEntries.slug,
          expectedFixtures.map(({ slug }) => slug)
        )
      )
    );
  if (entryRows.length === 0) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-487 entry fixtures are absent");
  }
  if (entryRows.length !== expectedFixtures.length) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-487 entry fixtures are partial");
  }
  const entryIds = expectedFixtures.map((expected) => {
    const entry = entryRows.find((row) => row.slug === expected.slug);
    if (entry === undefined || entry.title !== expected.title || entry.authorId !== user.id) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-487 entry fixture drifted");
    }
    return entry.id;
  });
  const revisionRows = await tx
    .select({ entryId: contentRevisions.entryId })
    .from(contentRevisions)
    .where(inArray(contentRevisions.entryId, entryIds));
  const revisionCounts = new Map<string, number>();
  for (const row of revisionRows) {
    revisionCounts.set(row.entryId, (revisionCounts.get(row.entryId) ?? 0) + 1);
  }
  const fixtures = expectedFixtures.map((expected, index) => {
    const revisionCount = revisionCounts.get(entryIds[index]!) ?? 0;
    if (revisionCount < 2) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-487 revision fixtures are incomplete");
    }
    return Object.freeze({
      scenarioId: expected.scenarioId,
      entryId: entryIds[index]!,
      revisionCount,
    });
  });
  const state = Object.freeze({
    marker: authority.runMarker,
    typeId: type.id,
    typeSlug: type.slug,
    actor: Object.freeze({ userId: user.id, roleId: await resolveAdminRoleId(tx) }),
    fixtures: Object.freeze(fixtures),
  });
  return Object.freeze({ kind: "complete", state });
}

export class Task487ProductionHandlers implements Task487WorkerHandlers {
  #cleaned = false;
  #closed = false;
  #databaseClosed = false;
  #installed = false;
  #recoveryStarted = false;
  #closePromise: Promise<void> | null = null;

  async install(input: Task487InstallInput): Promise<Task487InstallOutput> {
    if (this.#closed || this.#installed) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 install already ran");
    }
    const security = await getSecuritySettings();
    if (security.botProtection.enabled !== false) {
      throw new SmokeError("smoke_argument_invalid", "TASK-487 requires bot protection disabled");
    }
    const authority = input.authority;
    const expectedActor = expectedActorIdentity(authority);
    const expectedType = expectedTypeIdentity(authority);
    const passwordHash = await hashPassword(input.actor.password);
    const emailFields = buildEmailFields(expectedActor.email);
    let typeId = "";
    let userId = "";
    let roleId = "";
    let adminPath = "/admin";
    await db.transaction(async (tx) => {
      adminPath = await readAdminPath(tx);
      roleId = await resolveAdminRoleId(tx);
      const [typeRow] = await tx
        .insert(contentTypes)
        .values({
          name: expectedType.name,
          slug: expectedType.slug,
          schema: CONTENT_SCHEMA as unknown as Record<string, unknown>,
          status: "published",
          config: {},
        })
        .returning({ id: contentTypes.id });
      if (!typeRow) throw new SmokeError("smoke_output_invalid", "TASK-487 type was not created");
      typeId = typeRow.id;
      const [userRow] = await tx
        .insert(users)
        .values({
          email: emailFields.email,
          emailHash: emailFields.emailHash,
          emailEncrypted: emailFields.emailEncrypted,
          name: expectedActor.name,
          passwordHash,
          status: "active",
        })
        .returning({ id: users.id, email: users.email });
      if (!userRow || userRow.email !== emailFields.emailHash) {
        throw new SmokeError("smoke_output_invalid", "TASK-487 admin user was not created");
      }
      userId = userRow.id;
      await tx.insert(userRoles).values({ userId, roleId });
    });
    this.#installed = true;
    return Object.freeze({
      schemaVersion: 1,
      runMarker: authority.runMarker,
      adminPath,
      botProtectionEnabled: false,
      typeId,
      typeSlug: expectedType.slug,
      actor: Object.freeze({ userId, roleId }),
      statements: 4,
      rows: 3,
    });
  }

  async cleanup(authority: Task487RecoveryAuthority): Promise<Task487CleanupOutput> {
    if (this.#closed) {
      throw new SmokeError("smoke_output_invalid", "TASK-487 worker is closed");
    }
    this.#recoveryStarted = true;
    let counts: RemovalCounts = EMPTY_REMOVAL_COUNTS;
    await db.transaction(async (tx) => {
      // The entries are bootstrapped in-browser through the admin API, so a
      // partial run may leave a subset of them. Cleanup resolves whatever the
      // marker owns (user, type, and any entries with the expected slugs) and
      // then proves total absence; the terminal `prove` keeps the strict
      // full-matrix check.
      const expectedActor = expectedActorIdentity(authority);
      const expectedType = expectedTypeIdentity(authority);
      const expectedSlugs = expectedFixtureIdentity(authority).map(({ slug }) => slug);
      const [userRows, typeRows] = await Promise.all([
        tx
          .select({ id: users.id, email: users.email, name: users.name, status: users.status })
          .from(users)
          .where(eq(users.email, expectedActor.emailHash)),
        tx
          .select({
            id: contentTypes.id,
            slug: contentTypes.slug,
            name: contentTypes.name,
            status: contentTypes.status,
          })
          .from(contentTypes)
          .where(eq(contentTypes.slug, expectedType.slug)),
      ]);
      const user = userRows[0] ?? null;
      const type = typeRows[0] ?? null;
      if (user === null && type === null) {
        counts = EMPTY_REMOVAL_COUNTS;
        this.#cleaned = true;
        return;
      }
      if (
        (user !== null && (user.name !== expectedActor.name || user.status !== "active")) ||
        (type !== null && (type.name !== expectedType.name || type.status !== "published"))
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-487 recovery identity drifted");
      }
      const entryRows =
        type === null
          ? []
          : await tx
              .select({ id: contentEntries.id })
              .from(contentEntries)
              .where(
                and(eq(contentEntries.typeId, type.id), inArray(contentEntries.slug, expectedSlugs))
              );
      const entryIds = entryRows.map(({ id }) => id);
      const userIds = user === null ? [] : [user.id];
      const [revisions, entries, types, deletedSessions, joins, deletedUsers] = await Promise.all([
        tx
          .delete(contentRevisions)
          .where(inArray(contentRevisions.entryId, entryIds))
          .returning({ id: contentRevisions.id }),
        tx
          .delete(contentEntries)
          .where(inArray(contentEntries.id, entryIds))
          .returning({ id: contentEntries.id }),
        tx
          .delete(contentTypes)
          .where(inArray(contentTypes.id, type === null ? [] : [type.id]))
          .returning({ id: contentTypes.id }),
        tx.delete(sessions).where(inArray(sessions.userId, userIds)).returning({ id: sessions.id }),
        tx
          .delete(userRoles)
          .where(inArray(userRoles.userId, userIds))
          .returning({ userId: userRoles.userId }),
        tx.delete(users).where(inArray(users.id, userIds)).returning({ id: users.id }),
      ]);
      const [
        remainingRevisions,
        remainingEntries,
        remainingTypes,
        remainingSessions,
        remainingJoins,
        remainingUsers,
      ] = await Promise.all([
        tx
          .select({ id: contentRevisions.id })
          .from(contentRevisions)
          .where(inArray(contentRevisions.entryId, entryIds)),
        tx
          .select({ id: contentEntries.id })
          .from(contentEntries)
          .where(inArray(contentEntries.id, entryIds)),
        tx
          .select({ id: contentTypes.id })
          .from(contentTypes)
          .where(eq(contentTypes.slug, expectedType.slug)),
        tx.select({ id: sessions.id }).from(sessions).where(inArray(sessions.userId, userIds)),
        tx
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(inArray(userRoles.userId, userIds)),
        tx.select({ id: users.id }).from(users).where(inArray(users.id, userIds)),
      ]);
      if (
        remainingRevisions.length !== 0 ||
        remainingEntries.length !== 0 ||
        remainingTypes.length !== 0 ||
        remainingSessions.length !== 0 ||
        remainingJoins.length !== 0 ||
        remainingUsers.length !== 0
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-487 cleanup absence proof failed");
      }
      counts = Object.freeze({
        revisionsRemoved: revisions.length,
        entriesRemoved: entries.length,
        typesRemoved: types.length,
        sessionsRemoved: deletedSessions.length,
        userRolesRemoved: joins.length,
        usersRemoved: deletedUsers.length,
      });
      this.#cleaned = true;
    });
    const rows = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return Object.freeze({
      schemaVersion: 1,
      ...counts,
      absenceProved: true,
      statements: 14,
      rows,
    });
  }

  async prove(authority: Task487RecoveryAuthority): Promise<Task487ProofOutput> {
    let absent = false;
    await db.transaction(async (tx) => {
      const recovery = await reconstructTask487RecoveryState(tx, authority);
      absent = recovery.kind === "absent";
    });
    if (!absent) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-487 terminal rows remain");
    }
    return Object.freeze({
      schemaVersion: 1,
      fixturesAbsent: true,
      actorAbsent: true,
      statements: 4,
      rows: 0,
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#closePromise ??= this.#closeResources();
    await this.#closePromise;
  }

  async #closeResources(): Promise<void> {
    await closeDatabase();
    this.#databaseClosed = true;
  }

  async proveAbsent(): Promise<boolean> {
    if (!this.#closed || !this.#databaseClosed) return false;
    if (this.#installed && !this.#cleaned) return false;
    if (this.#recoveryStarted && !this.#cleaned) return false;
    return true;
  }
}
