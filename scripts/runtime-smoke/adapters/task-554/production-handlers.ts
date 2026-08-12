import { createHash } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import { closeDatabase, db } from "../../../../core/db/client";
import {
  accessLogs,
  auditLogs,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
  roles,
  sessions,
  userRoles,
  users,
} from "../../../../core/db/schema";
import { hashPassword } from "../../../../core/services/auth/password";
import {
  buildEmailFields,
  hashEmail,
} from "../../../../core/services/security/piiEmail";
import {
  getSecuritySettings,
  setSecuritySettings,
  type SecuritySettings,
  type SecuritySettingsUpdate,
} from "../../../../core/services/settings/securitySettings";
import { RunFixtureLedger } from "../../database/fixture-ledger";
import { buildCleanupBatchPlan, type CleanupBatchPlan } from "../../database/batch-contract";
import { SmokeError } from "../../contracts";
import {
  buildTask554FixtureSpecs,
  task554ScenarioDescriptor,
  type Task554ActorKind,
} from "./browser-actions";
import {
  Task554DatabaseRoutingSettingsPersistence,
  Task554RoutingSettingsLease,
  type Task554RoutingSettingsPersistence,
} from "./routing-settings-lease";
import type {
  Task554CleanupOutput,
  Task554InstallInput,
  Task554InstallOutput,
  Task554ProofOutput,
  Task554ReadInput,
  Task554ReadOutput,
  Task554RecoveryAuthority,
  Task554WorkerHandlers,
} from "./worker-operations";

type ActorState = Readonly<{
  readonly kind: Task554ActorKind;
  readonly userId: string;
  readonly roleId: string;
}>;
type FixtureState = Readonly<{
  readonly scenarioId: string;
  readonly variantId: string;
  readonly postId: string;
}>;

interface InstalledState {
  readonly marker: string;
  readonly actors: readonly ActorState[];
  readonly fixtures: readonly FixtureState[];
  readonly ledger: ReturnType<RunFixtureLedger["freeze"]>;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type RecoveryState = Readonly<
  { readonly kind: "absent" } | { readonly kind: "complete"; readonly state: InstalledState }
>;

export interface Task554ProductionHandlerDependencies {
  readonly closeDatabase: () => Promise<void>;
  readonly fixtureRecovery: Task554FixtureRecoveryPersistence;
  readonly hashPassword: (password: string) => Promise<string>;
  readonly afterFixtureCommit: () => void;
  readonly routingSettings: Task554RoutingSettingsPersistence;
  readonly getSecuritySettings: () => Promise<SecuritySettings>;
  readonly setSecuritySettings: (update: SecuritySettingsUpdate) => Promise<SecuritySettings>;
}

export interface Task554FixtureRecoveryPersistence {
  install(
    input: Task554InstallInput,
    passwordHashes: readonly string[]
  ): Promise<Task554FixtureInstallResult>;
  inspect(authority: Task554RecoveryAuthority): Promise<"absent" | "complete">;
  remove(authority: Task554RecoveryAuthority): Promise<Task554RemovalCounts>;
}

export type Task554FixtureInstallResult = Readonly<{
  readonly actors: Task554InstallOutput["actors"];
  readonly fixtures: Task554InstallOutput["fixtures"];
  readonly rows: number;
  readonly statements: number;
}>;

const TASK554_DATABASE_FIXTURE_RECOVERY: Task554FixtureRecoveryPersistence = Object.freeze({
  install: installTask554Fixtures,
  async inspect(authority: Task554RecoveryAuthority) {
    return (await inspectTask554FixtureRecovery(authority)).kind;
  },
  async remove(authority: Task554RecoveryAuthority) {
    return (await removeTask554RecoveryFixtures(authority)).counts;
  },
});

const TASK554_PRODUCTION_HANDLER_DEPENDENCIES: Task554ProductionHandlerDependencies = Object.freeze(
  {
    closeDatabase,
    fixtureRecovery: TASK554_DATABASE_FIXTURE_RECOVERY,
    hashPassword,
    afterFixtureCommit: () => undefined,
    routingSettings: new Task554DatabaseRoutingSettingsPersistence(),
    getSecuritySettings,
    setSecuritySettings,
  }
);

type Task554ProductionHandlerDependencyOverrides = Readonly<
  Partial<Task554ProductionHandlerDependencies>
>;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireInstalled(state: InstalledState | null): InstalledState {
  if (state === null)
    throw new SmokeError("smoke_output_invalid", "TASK-554 fixture is not installed");
  return state;
}

function expectedActorIdentity(authority: Task554RecoveryAuthority, kind: Task554ActorKind) {
  const email = `task554-${authority.runMarker}-${kind}@smoke.invalid`;
  return Object.freeze({
    kind,
    email,
    // The Admin login flow stores users with the app's PII email fields
    // (email = HMAC, emailHash, emailEncrypted) and never rewrites a row
    // that already carries them; the recovery matrix must therefore match
    // users by the same canonical hash the app derives.
    emailHash: hashEmail(email),
    roleName: `task554-${authority.runMarker}-${kind}`,
    permissions:
      kind === "writer"
        ? Object.freeze(["content:read", "content:write"])
        : Object.freeze(["content:read", "content:write", "content:publish"]),
  });
}

function expectedFixtureIdentity(authority: Task554RecoveryAuthority) {
  return buildTask554FixtureSpecs(authority.profile).map((fixture) =>
    Object.freeze({
      scenarioId: fixture.scenarioId,
      variantId: fixture.variantId,
      actor: task554ScenarioDescriptor(fixture.scenarioId).actor,
      slug: `task554-${authority.runMarker}-${fixture.scenarioId}-${fixture.variantId}`,
      title: `TASK-554 ${fixture.scenarioId} ${fixture.variantId}`,
    })
  );
}

async function reconstructTask554RecoveryState(
  tx: DbTransaction,
  authority: Task554RecoveryAuthority
): Promise<RecoveryState> {
  const expectedActors = (["writer", "publisher"] as const).map((kind) =>
    expectedActorIdentity(authority, kind)
  );
  const expectedFixtures = expectedFixtureIdentity(authority);
  const [userRows, roleRows, postRows] = await Promise.all([
    tx
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(
        inArray(
          users.email,
          expectedActors.map(({ emailHash }) => emailHash)
        )
      ),
    tx
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
      })
      .from(roles)
      .where(
        inArray(
          roles.name,
          expectedActors.map(({ roleName }) => roleName)
        )
      ),
    tx
      .select({ id: posts.id, slug: posts.slug, title: posts.title, authorId: posts.authorId })
      .from(posts)
      .where(
        inArray(
          posts.slug,
          expectedFixtures.map(({ slug }) => slug)
        )
      ),
  ]);
  if (userRows.length === 0 && roleRows.length === 0 && postRows.length === 0) {
    return Object.freeze({ kind: "absent" });
  }
  if (
    userRows.length !== expectedActors.length ||
    roleRows.length !== expectedActors.length ||
    postRows.length !== expectedFixtures.length
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 recovery matrix is partial");
  }
  const actors = expectedActors.map((expected) => {
    const user = userRows.find(({ email }) => email === expected.emailHash);
    const role = roleRows.find(({ name }) => name === expected.roleName);
    if (
      user === undefined ||
      role === undefined ||
      user.name !== `TASK-554 ${expected.kind}` ||
      user.status !== "active" ||
      role.description !== "TASK-554 synthetic runtime smoke role" ||
      JSON.stringify(role.permissions) !== JSON.stringify(expected.permissions)
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 recovery actor drifted");
    }
    return Object.freeze({ kind: expected.kind, userId: user.id, roleId: role.id });
  });
  const joins = await tx
    .select({ userId: userRoles.userId, roleId: userRoles.roleId })
    .from(userRoles)
    .where(
      inArray(
        userRoles.userId,
        actors.map(({ userId }) => userId)
      )
    );
  if (
    joins.length !== actors.length ||
    actors.some(
      (actor) =>
        !joins.some(({ userId, roleId }) => userId === actor.userId && roleId === actor.roleId)
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 recovery role binding drifted");
  }
  const fixtures = expectedFixtures.map((expected) => {
    const post = postRows.find(({ slug }) => slug === expected.slug);
    const actor = actors.find(({ kind }) => kind === expected.actor);
    if (
      post === undefined ||
      actor === undefined ||
      post.title !== expected.title ||
      post.authorId !== actor.userId
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 recovery Post drifted");
    }
    return Object.freeze({
      scenarioId: expected.scenarioId,
      variantId: expected.variantId,
      postId: post.id,
    });
  });
  const state = Object.freeze({
    marker: authority.runMarker,
    actors: Object.freeze(actors),
    fixtures: Object.freeze(fixtures),
    ledger: buildTask554CleanupLedger({
      marker: authority.runMarker,
      actors,
      fixtures,
    }),
  });
  return Object.freeze({ kind: "complete", state });
}

export function buildTask554CleanupLedger(input: {
  readonly marker: string;
  readonly actors: readonly ActorState[];
  readonly fixtures: readonly FixtureState[];
}): ReturnType<RunFixtureLedger["freeze"]> {
  const ledger = new RunFixtureLedger();
  let ordinal = 0;
  const append = (
    entry: Omit<Parameters<RunFixtureLedger["append"]>[0], "ordinal" | "ownershipSha256">
  ) => {
    ledger.append({
      ...entry,
      ordinal: ordinal++,
      ownershipSha256: digest([input.marker, entry.resourceKey, entry.identifier]),
    });
  };
  for (const fixture of input.fixtures) {
    const postKey = `post/${fixture.postId}`;
    append({
      resourceKey: `post-child/${fixture.postId}`,
      logicalId: `post-child-${fixture.postId}`,
      kind: "post-child",
      profileId: "task-554-db",
      wave: 0,
      identifier: [fixture.postId],
      dependsOn: [postKey],
    });
    const descriptor = task554ScenarioDescriptor(fixture.scenarioId);
    const owner = input.actors.find((actor) => actor.kind === descriptor.actor);
    if (owner === undefined)
      throw new SmokeError("smoke_output_invalid", "TASK-554 post owner is absent");
    append({
      resourceKey: postKey,
      logicalId: `post-${fixture.postId}`,
      kind: "post",
      profileId: "task-554-db",
      wave: 1,
      identifier: [fixture.postId],
      dependsOn: [`user/${owner.userId}`],
    });
  }
  for (const actor of input.actors) {
    const userKey = `user/${actor.userId}`;
    const roleKey = `role/${actor.roleId}`;
    append({
      resourceKey: `access-log/${actor.userId}`,
      logicalId: `access-log-${actor.userId}`,
      kind: "access-log",
      profileId: "task-554-db",
      wave: 0,
      identifier: [actor.userId],
      dependsOn: [userKey],
    });
    append({
      resourceKey: `login-audit/${actor.userId}`,
      logicalId: `login-audit-${actor.userId}`,
      kind: "login-audit",
      profileId: "task-554-db",
      wave: 0,
      identifier: [actor.userId],
      dependsOn: [userKey],
    });
    append({
      resourceKey: `session/${actor.userId}`,
      logicalId: `session-${actor.userId}`,
      kind: "session",
      profileId: "task-554-db",
      wave: 0,
      identifier: [actor.userId],
      dependsOn: [userKey],
    });
    append({
      resourceKey: `user-role/${actor.userId}`,
      logicalId: `user-role-${actor.userId}`,
      kind: "user-role",
      profileId: "task-554-db",
      wave: 2,
      identifier: [actor.userId, actor.roleId],
      dependsOn: [userKey, roleKey],
    });
    append({
      resourceKey: userKey,
      logicalId: `user-${actor.userId}`,
      kind: "user",
      profileId: "task-554-db",
      wave: 3,
      identifier: [actor.userId],
      dependsOn: [],
    });
    append({
      resourceKey: roleKey,
      logicalId: `role-${actor.roleId}`,
      kind: "role",
      profileId: "task-554-db",
      wave: 4,
      identifier: [actor.roleId],
      dependsOn: [],
    });
  }
  return ledger.freeze();
}

const TASK554_CLEANUP_WAVES = Object.freeze([0, 1, 2, 3, 4] as const);

export function buildTask554CleanupPlans(
  ledger: ReturnType<RunFixtureLedger["freeze"]>
): readonly CleanupBatchPlan[] {
  return Object.freeze(
    TASK554_CLEANUP_WAVES.map((wave) => buildCleanupBatchPlan(ledger, "task-554-db", wave))
  );
}

function sameIdentifiers(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

function singleIdentifier(plan: CleanupBatchPlan, kind: string): readonly string[] {
  return Object.freeze(
    plan.resources
      .filter((resource) => resource.kind === kind)
      .map(({ identifier }) => {
        if (
          !Array.isArray(identifier) ||
          identifier.length !== 1 ||
          typeof identifier[0] !== "string"
        ) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-554 cleanup plan identifier is invalid"
          );
        }
        return identifier[0];
      })
  );
}

function joinIdentifier(plan: CleanupBatchPlan): readonly Readonly<[string, string]>[] {
  return Object.freeze(
    plan.resources.map(({ identifier, kind }) => {
      if (
        kind !== "user-role" ||
        !Array.isArray(identifier) ||
        identifier.length !== 2 ||
        typeof identifier[0] !== "string" ||
        typeof identifier[1] !== "string"
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-554 cleanup join plan is invalid");
      }
      return Object.freeze([identifier[0], identifier[1]] as const);
    })
  );
}

function task554CleanupAuthority(state: InstalledState): Readonly<{
  readonly plans: readonly CleanupBatchPlan[];
  readonly postIds: readonly string[];
  readonly userIds: readonly string[];
  readonly roleIds: readonly string[];
}> {
  const plans = buildTask554CleanupPlans(state.ledger);
  const [children, postsPlan, joinsPlan, usersPlan, rolesPlan] = plans;
  if (
    children === undefined ||
    postsPlan === undefined ||
    joinsPlan === undefined ||
    usersPlan === undefined ||
    rolesPlan === undefined ||
    plans.some(
      (plan, index) =>
        plan.schemaVersion !== 1 ||
        plan.profileId !== "task-554-db" ||
        plan.wave !== TASK554_CLEANUP_WAVES[index] ||
        plan.batchId !== `cleanup/task-554-db/wave-${plan.wave}`
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 cleanup plan authority is invalid");
  }
  const postIds = singleIdentifier(postsPlan, "post");
  const childPostIds = singleIdentifier(children, "post-child");
  const userIds = singleIdentifier(usersPlan, "user");
  const roleIds = singleIdentifier(rolesPlan, "role");
  const accessUserIds = singleIdentifier(children, "access-log");
  const auditUserIds = singleIdentifier(children, "login-audit");
  const sessionUserIds = singleIdentifier(children, "session");
  const joins = joinIdentifier(joinsPlan);
  if (
    postIds.length !== state.fixtures.length ||
    userIds.length !== state.actors.length ||
    roleIds.length !== state.actors.length ||
    !sameIdentifiers(postIds, childPostIds) ||
    !sameIdentifiers(userIds, accessUserIds) ||
    !sameIdentifiers(userIds, auditUserIds) ||
    !sameIdentifiers(userIds, sessionUserIds) ||
    joins.length !== state.actors.length ||
    !sameIdentifiers(
      joins.map(([userId]) => userId),
      userIds
    ) ||
    !sameIdentifiers(
      joins.map(([, roleId]) => roleId),
      roleIds
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 cleanup plan ownership drifted");
  }
  return Object.freeze({ plans, postIds, userIds, roleIds });
}

function removedCount(rows: readonly unknown[]): number {
  return rows.length;
}

export type Task554RemovalCounts = Readonly<{
  readonly postChildrenRemoved: number;
  readonly accessLogsRemoved: number;
  readonly loginAuditRowsRemoved: number;
  readonly sessionsRemoved: number;
  readonly userRolesRemoved: number;
  readonly postsRemoved: number;
  readonly usersRemoved: number;
  readonly rolesRemoved: number;
}>;

const EMPTY_REMOVAL_COUNTS: Task554RemovalCounts = Object.freeze({
  postChildrenRemoved: 0,
  accessLogsRemoved: 0,
  loginAuditRowsRemoved: 0,
  sessionsRemoved: 0,
  userRolesRemoved: 0,
  postsRemoved: 0,
  usersRemoved: 0,
  rolesRemoved: 0,
});

async function inspectTask554FixtureRecovery(
  authority: Task554RecoveryAuthority
): Promise<RecoveryState> {
  return await db.transaction((tx) => reconstructTask554RecoveryState(tx, authority));
}

async function removeTask554RecoveryFixtures(
  authority: Task554RecoveryAuthority
): Promise<
  Readonly<{ readonly state: InstalledState | null; readonly counts: Task554RemovalCounts }>
> {
  return await db.transaction(async (tx) => {
    const recovery = await reconstructTask554RecoveryState(tx, authority);
    if (recovery.kind === "absent") {
      return Object.freeze({ state: null, counts: EMPTY_REMOVAL_COUNTS });
    }
    const state = recovery.state;
    const { postIds, userIds, roleIds } = task554CleanupAuthority(state);
    const access = await tx
      .delete(accessLogs)
      .where(inArray(accessLogs.userId, userIds))
      .returning({ id: accessLogs.id });
    const audit = await tx
      .delete(auditLogs)
      .where(inArray(auditLogs.actorId, userIds))
      .returning({ id: auditLogs.id });
    const assignments = await tx
      .delete(postTermAssignments)
      .where(inArray(postTermAssignments.postId, postIds))
      .returning({ postId: postTermAssignments.postId });
    const previews = await tx
      .delete(postPreviewTokens)
      .where(inArray(postPreviewTokens.postId, postIds))
      .returning({ id: postPreviewTokens.id });
    const revisions = await tx
      .delete(postRevisions)
      .where(inArray(postRevisions.postId, postIds))
      .returning({ id: postRevisions.id });
    const deletedPosts = await tx
      .delete(posts)
      .where(inArray(posts.id, postIds))
      .returning({ id: posts.id });
    const deletedSessions = await tx
      .delete(sessions)
      .where(inArray(sessions.userId, userIds))
      .returning({ id: sessions.id });
    const joins = await tx
      .delete(userRoles)
      .where(inArray(userRoles.userId, userIds))
      .returning({ userId: userRoles.userId });
    const [remainingPosts, remainingAccess, remainingAudit, remainingAssignments] =
      await Promise.all([
        tx.select({ id: posts.id }).from(posts).where(inArray(posts.id, postIds)),
        tx
          .select({ id: accessLogs.id })
          .from(accessLogs)
          .where(inArray(accessLogs.userId, userIds)),
        tx.select({ id: auditLogs.id }).from(auditLogs).where(inArray(auditLogs.actorId, userIds)),
        tx
          .select({ postId: postTermAssignments.postId })
          .from(postTermAssignments)
          .where(inArray(postTermAssignments.postId, postIds)),
      ]);
    const [remainingPreviews, remainingRevisions, remainingSessions, remainingJoins] =
      await Promise.all([
        tx
          .select({ id: postPreviewTokens.id })
          .from(postPreviewTokens)
          .where(inArray(postPreviewTokens.postId, postIds)),
        tx
          .select({ id: postRevisions.id })
          .from(postRevisions)
          .where(inArray(postRevisions.postId, postIds)),
        tx.select({ id: sessions.id }).from(sessions).where(inArray(sessions.userId, userIds)),
        tx
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(inArray(userRoles.userId, userIds)),
      ]);
    assertTask554PreIdentityAbsence({
      posts: remainingPosts,
      accessLogs: remainingAccess,
      auditLogs: remainingAudit,
      postTermAssignments: remainingAssignments,
      postPreviewTokens: remainingPreviews,
      postRevisions: remainingRevisions,
      sessions: remainingSessions,
      userRoles: remainingJoins,
    });
    const deletedUsers = await tx
      .delete(users)
      .where(inArray(users.id, userIds))
      .returning({ id: users.id });
    const deletedRoles = await tx
      .delete(roles)
      .where(
        and(
          inArray(roles.id, roleIds),
          inArray(
            roles.name,
            state.actors.map(({ kind }) => `task554-${state.marker}-${kind}`)
          )
        )
      )
      .returning({ id: roles.id });
    const [remainingUsers, remainingRoles] = await Promise.all([
      tx.select({ id: users.id }).from(users).where(inArray(users.id, userIds)),
      tx.select({ id: roles.id }).from(roles).where(inArray(roles.id, roleIds)),
    ]);
    if (remainingUsers.length !== 0 || remainingRoles.length !== 0) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 identity absence proof failed");
    }
    return Object.freeze({
      state,
      counts: Object.freeze({
        postChildrenRemoved:
          removedCount(assignments) + removedCount(previews) + removedCount(revisions),
        accessLogsRemoved: removedCount(access),
        loginAuditRowsRemoved: removedCount(audit),
        sessionsRemoved: removedCount(deletedSessions),
        userRolesRemoved: removedCount(joins),
        postsRemoved: removedCount(deletedPosts),
        usersRemoved: removedCount(deletedUsers),
        rolesRemoved: removedCount(deletedRoles),
      }),
    });
  });
}

async function installTask554Fixtures(
  input: Task554InstallInput,
  passwordHashes: readonly string[]
): Promise<Task554FixtureInstallResult> {
  return await db.transaction(async (tx) => {
    const insertedRoles = await tx
      .insert(roles)
      .values(
        input.actors.map(({ kind }) => ({
          name: `task554-${input.authority.runMarker}-${kind}`,
          description: "TASK-554 synthetic runtime smoke role",
          permissions:
            kind === "writer"
              ? ["content:read", "content:write"]
              : ["content:read", "content:write", "content:publish"],
        }))
      )
      .returning({ id: roles.id, name: roles.name });
    const rolesByKind = new Map(
      input.actors.map(({ kind }, index) => [kind, insertedRoles[index]?.id])
    );
    if (
      rolesByKind.size !== 2 ||
      [...rolesByKind.values()].some((value) => typeof value !== "string")
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-554 roles were not created");
    }
    const insertedUsers = await tx
      .insert(users)
      .values(
        input.actors.map(({ kind, email }, index) => {
          const fields = buildEmailFields(email);
          return {
            email: fields.email,
            emailHash: fields.emailHash,
            emailEncrypted: fields.emailEncrypted,
            name: `TASK-554 ${kind}`,
            passwordHash: passwordHashes[index]!,
            status: "active",
          };
        })
      )
      .returning({ id: users.id, email: users.email });
    if (insertedUsers.length !== 2) {
      throw new SmokeError("smoke_output_invalid", "TASK-554 users were not created");
    }
    const actors = input.actors.map(({ kind, email }) => {
      const user = insertedUsers.find((entry) => entry.email === hashEmail(email));
      const roleId = rolesByKind.get(kind);
      if (user === undefined || roleId === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-554 actor creation drifted");
      }
      return Object.freeze({ kind, userId: user.id, roleId });
    });
    await tx.insert(userRoles).values(actors.map(({ userId, roleId }) => ({ userId, roleId })));
    const insertedPosts = await tx
      .insert(posts)
      .values(
        input.fixtures.map((fixture) => {
          const descriptor = task554ScenarioDescriptor(fixture.scenarioId);
          return {
            authorId: actors.find(({ kind }) => kind === descriptor.actor)!.userId,
            slug: `task554-${input.authority.runMarker}-${fixture.scenarioId}-${fixture.variantId}`,
            title: `TASK-554 ${fixture.scenarioId} ${fixture.variantId}`,
            status: fixture.baseline.status,
            scheduledAt:
              fixture.baseline.scheduledAt === null ? null : new Date(fixture.baseline.scheduledAt),
            seo: { description: fixture.baseline.seoDescription },
            data: {},
            metadata: {},
            tags: [],
          };
        })
      )
      .returning({ id: posts.id, slug: posts.slug });
    if (insertedPosts.length !== input.fixtures.length) {
      throw new SmokeError("smoke_output_invalid", "TASK-554 posts were not created");
    }
    const fixtures = input.fixtures.map((fixture) => {
      const slug = `task554-${input.authority.runMarker}-${fixture.scenarioId}-${fixture.variantId}`;
      const post = insertedPosts.find((entry) => entry.slug === slug);
      if (post === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-554 post fixture is absent");
      }
      return Object.freeze({
        scenarioId: fixture.scenarioId,
        variantId: fixture.variantId,
        postId: post.id,
      });
    });
    return Object.freeze({
      actors: Object.freeze(actors),
      fixtures: Object.freeze(fixtures),
      statements: 4,
      rows: 4 + input.fixtures.length,
    });
  });
}

export function assertTask554PreIdentityAbsence(
  input: Readonly<{
    readonly posts: readonly unknown[];
    readonly accessLogs: readonly unknown[];
    readonly auditLogs: readonly unknown[];
    readonly postTermAssignments: readonly unknown[];
    readonly postPreviewTokens: readonly unknown[];
    readonly postRevisions: readonly unknown[];
    readonly sessions: readonly unknown[];
    readonly userRoles: readonly unknown[];
  }>
): void {
  if (Object.values(input).some((rows) => rows.length !== 0)) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 pre-identity absence proof failed");
  }
}

export class Task554ProductionHandlers implements Task554WorkerHandlers {
  #routingSettingsLease: Task554RoutingSettingsLease;
  #state: InstalledState | null = null;
  #cleaned = false;
  #closed = false;
  #databaseClosed = false;
  #fixturesInstalled = false;
  #recoveryStarted = false;
  #rateLimitEnabledBefore: boolean | null = null;
  #closePromise: Promise<void> | null = null;
  #dependencies: Task554ProductionHandlerDependencies;

  constructor(
    dependencies: Task554ProductionHandlerDependencyOverrides | (() => Promise<void>) = {}
  ) {
    this.#dependencies = Object.freeze({
      ...TASK554_PRODUCTION_HANDLER_DEPENDENCIES,
      ...(typeof dependencies === "function" ? { closeDatabase: dependencies } : dependencies),
    });
    this.#routingSettingsLease = new Task554RoutingSettingsLease(
      this.#dependencies.routingSettings
    );
  }

  async #restoreRoutingSettingsAfterFailure(error: unknown, message: string): Promise<never> {
    if (this.#fixturesInstalled) throw error;
    try {
      await this.#routingSettingsLease.restore();
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
        await this.#routingSettingsLease.restore();
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
      throw new AggregateError([restoreError, databaseError], "TASK-554 worker shutdown failed");
    }
    if (restoreFailed) throw restoreError;
    if (databaseFailed) throw databaseError;
  }

  async install(input: Task554InstallInput): Promise<Task554InstallOutput> {
    if (this.#state !== null || this.#cleaned)
      throw new SmokeError("smoke_output_invalid", "TASK-554 install cannot be replayed");
    try {
      await this.#routingSettingsLease.apply(input.authority);
      // The Admin app boots once per scenario and each boot calls the auth
      // bootstrap endpoints; the auth rate-limit bucket (10 req/60s) would
      // 429 them across the suite and make the app retry CSRF-bound writes.
      // Disable the rate limit for the smoke run and restore it on cleanup.
      const securityBefore = await this.#dependencies.getSecuritySettings();
      await this.#dependencies.setSecuritySettings({ rateLimit: { enabled: false } });
      this.#rateLimitEnabledBefore = securityBefore.rateLimit.enabled;
      const passwordHashes = await Promise.all(
        input.actors.map(({ password }) => this.#dependencies.hashPassword(password))
      );
      const result = await this.#dependencies.fixtureRecovery.install(input, passwordHashes);
      this.#fixturesInstalled = true;
      this.#dependencies.afterFixtureCommit();
      const state = Object.freeze({
        marker: input.authority.runMarker,
        actors: result.actors,
        fixtures: result.fixtures,
        ledger: buildTask554CleanupLedger({
          marker: input.authority.runMarker,
          actors: result.actors,
          fixtures: result.fixtures,
        }),
      });
      this.#state = state;
      return Object.freeze({
        schemaVersion: 1,
        runMarker: input.authority.runMarker,
        actors: state.actors,
        fixtures: state.fixtures,
        statements: result.statements,
        rows: result.rows,
      });
    } catch (error) {
      return await this.#restoreRoutingSettingsAfterFailure(
        error,
        "TASK-554 install failed and routing settings restoration failed"
      );
    }
  }

  async read(input: Task554ReadInput): Promise<Task554ReadOutput> {
    const state = requireInstalled(this.#state);
    if (!state.fixtures.some(({ postId }) => postId === input.postId))
      throw new SmokeError("smoke_output_invalid", "TASK-554 read escaped its fixture ledger");
    const [post] = await db
      .select({
        id: posts.id,
        status: posts.status,
        scheduledAt: posts.scheduledAt,
        seo: posts.seo,
      })
      .from(posts)
      .where(eq(posts.id, input.postId))
      .limit(1);
    if (
      post === undefined ||
      !["draft", "published", "scheduled", "archived"].includes(post.status)
    )
      throw new SmokeError("smoke_output_invalid", "TASK-554 post projection is absent");
    const seo =
      post.seo !== null && typeof post.seo === "object" && !Array.isArray(post.seo)
        ? (post.seo as Record<string, unknown>)
        : {};
    const seoDescription = typeof seo.description === "string" ? seo.description : "";
    return Object.freeze({
      schemaVersion: 1,
      postId: post.id,
      status: post.status as Task554ReadOutput["status"],
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      seoDescription,
      statements: 1,
      rows: 1,
    });
  }

  async cleanup(authority: Task554RecoveryAuthority): Promise<Task554CleanupOutput> {
    if (this.#cleaned) {
      throw new SmokeError("smoke_output_invalid", "TASK-554 cleanup cannot be replayed");
    }
    this.#recoveryStarted = true;
    const receipt = await this.#routingSettingsLease.inspectRecovery(authority);
    const observed = await this.#dependencies.fixtureRecovery.inspect(authority);
    if (receipt === "absent" && observed !== "absent") {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 recovery receipt is absent");
    }
    if (observed === "complete") this.#fixturesInstalled = true;
    const counts =
      receipt === "recoverable"
        ? await this.#dependencies.fixtureRecovery.remove(authority)
        : EMPTY_REMOVAL_COUNTS;
    const restoration = await this.#routingSettingsLease.recover(authority);
    if (
      restoration !== (receipt === "recoverable" ? "restored" : "absent") ||
      !(await this.#routingSettingsLease.proveReceiptAbsent(authority))
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 routing restoration is unproven");
    }
    if (this.#rateLimitEnabledBefore !== null) {
      await this.#dependencies.setSecuritySettings({
        rateLimit: { enabled: this.#rateLimitEnabledBefore },
      });
      this.#rateLimitEnabledBefore = null;
    }
    this.#cleaned = true;
    const rows = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return Object.freeze({
      schemaVersion: 1,
      ...counts,
      preIdentityAbsenceProved: true,
      identityAbsenceProved: true,
      settingsRestored: true,
      statements: 20,
      rows,
    });
  }

  async prove(authority: Task554RecoveryAuthority): Promise<Task554ProofOutput> {
    const recovery = await this.#dependencies.fixtureRecovery.inspect(authority);
    if (
      recovery !== "absent" ||
      !(await this.#routingSettingsLease.proveReceiptAbsent(authority))
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 terminal rows remain");
    }
    return Object.freeze({
      schemaVersion: 1,
      fixturesAbsent: true,
      identitiesAbsent: true,
      settingsRestored: true,
      statements: 3,
      rows: 0,
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#closePromise ??= this.#closeResources();
    await this.#closePromise;
  }

  async proveAbsent(): Promise<boolean> {
    if (!this.#closed || !this.#databaseClosed) return false;
    if (this.#recoveryStarted && !this.#cleaned) return false;
    if (this.#fixturesInstalled && !this.#cleaned) return false;
    return (
      !this.#routingSettingsLease.active &&
      (!this.#routingSettingsLease.wasApplied || this.#routingSettingsLease.restored)
    );
  }
}
