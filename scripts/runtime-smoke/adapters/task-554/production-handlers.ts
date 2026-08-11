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
import { RunFixtureLedger } from "../../database/fixture-ledger";
import { buildCleanupBatchPlan, type CleanupBatchPlan } from "../../database/batch-contract";
import { SmokeError } from "../../contracts";
import { task554ScenarioDescriptor, type Task554ActorKind } from "./browser-actions";
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

export interface Task554ProductionHandlerDependencies {
  readonly closeDatabase: () => Promise<void>;
  readonly hashPassword: (password: string) => Promise<string>;
  readonly routingSettings: Task554RoutingSettingsPersistence;
}

const TASK554_PRODUCTION_HANDLER_DEPENDENCIES: Task554ProductionHandlerDependencies = Object.freeze(
  {
    closeDatabase,
    hashPassword,
    routingSettings: new Task554DatabaseRoutingSettingsPersistence(),
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
    try {
      await this.#routingSettingsLease.restore();
    } catch (error) {
      restoreError = error;
      restoreFailed = true;
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
      await this.#routingSettingsLease.apply();
      const passwordHashes = await Promise.all(
        input.actors.map(({ password }) => this.#dependencies.hashPassword(password))
      );
      const result = await db.transaction(async (tx) => {
        const insertedRoles = await tx
          .insert(roles)
          .values(
            input.actors.map(({ kind }) => ({
              name: `task554-${input.runMarker}-${kind}`,
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
        )
          throw new SmokeError("smoke_output_invalid", "TASK-554 roles were not created");
        const insertedUsers = await tx
          .insert(users)
          .values(
            input.actors.map(({ kind, email }, index) => ({
              email,
              name: `TASK-554 ${kind}`,
              passwordHash: passwordHashes[index]!,
              status: "active",
            }))
          )
          .returning({ id: users.id, email: users.email });
        if (insertedUsers.length !== 2)
          throw new SmokeError("smoke_output_invalid", "TASK-554 users were not created");
        const actors = input.actors.map(({ kind, email }) => {
          const user = insertedUsers.find((entry) => entry.email === email);
          const roleId = rolesByKind.get(kind);
          if (user === undefined || roleId === undefined)
            throw new SmokeError("smoke_output_invalid", "TASK-554 actor creation drifted");
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
                slug: `task554-${input.runMarker}-${fixture.scenarioId}-${fixture.variantId}`,
                title: `TASK-554 ${fixture.scenarioId} ${fixture.variantId}`,
                status: fixture.baseline.status,
                scheduledAt:
                  fixture.baseline.scheduledAt === null
                    ? null
                    : new Date(fixture.baseline.scheduledAt),
                seo: { description: fixture.baseline.seoDescription },
                data: {},
                metadata: {},
                tags: [],
              };
            })
          )
          .returning({ id: posts.id, slug: posts.slug });
        if (insertedPosts.length !== input.fixtures.length)
          throw new SmokeError("smoke_output_invalid", "TASK-554 posts were not created");
        const fixtures = input.fixtures.map((fixture) => {
          const slug = `task554-${input.runMarker}-${fixture.scenarioId}-${fixture.variantId}`;
          const post = insertedPosts.find((entry) => entry.slug === slug);
          if (post === undefined)
            throw new SmokeError("smoke_output_invalid", "TASK-554 post fixture is absent");
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
      this.#fixturesInstalled = true;
      const state = Object.freeze({
        marker: input.runMarker,
        actors: result.actors,
        fixtures: result.fixtures,
        ledger: buildTask554CleanupLedger({
          marker: input.runMarker,
          actors: result.actors,
          fixtures: result.fixtures,
        }),
      });
      this.#state = state;
      return Object.freeze({
        schemaVersion: 1,
        runMarker: input.runMarker,
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

  async cleanup(): Promise<Task554CleanupOutput> {
    const state = requireInstalled(this.#state);
    if (this.#cleaned)
      throw new SmokeError("smoke_output_invalid", "TASK-554 cleanup cannot be replayed");
    const output = await (async () => {
      try {
        const authority = task554CleanupAuthority(state);
        const { postIds, userIds, roleIds } = authority;
        return await db.transaction(async (tx) => {
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
          const remainingPosts = await tx
            .select({ id: posts.id })
            .from(posts)
            .where(inArray(posts.id, postIds));
          const remainingAccess = await tx
            .select({ id: accessLogs.id })
            .from(accessLogs)
            .where(inArray(accessLogs.userId, userIds));
          const remainingAudit = await tx
            .select({ id: auditLogs.id })
            .from(auditLogs)
            .where(inArray(auditLogs.actorId, userIds));
          const remainingAssignments = await tx
            .select({ postId: postTermAssignments.postId })
            .from(postTermAssignments)
            .where(inArray(postTermAssignments.postId, postIds));
          const remainingPreviews = await tx
            .select({ id: postPreviewTokens.id })
            .from(postPreviewTokens)
            .where(inArray(postPreviewTokens.postId, postIds));
          const remainingRevisions = await tx
            .select({ id: postRevisions.id })
            .from(postRevisions)
            .where(inArray(postRevisions.postId, postIds));
          const remainingSessions = await tx
            .select({ id: sessions.id })
            .from(sessions)
            .where(inArray(sessions.userId, userIds));
          const remainingJoins = await tx
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .where(inArray(userRoles.userId, userIds));
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
          const remainingUsers = await tx
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.id, userIds));
          const remainingRoles = await tx
            .select({ id: roles.id })
            .from(roles)
            .where(inArray(roles.id, roleIds));
          if (remainingUsers.length !== 0 || remainingRoles.length !== 0)
            throw new SmokeError("smoke_cleanup_failed", "TASK-554 identity absence proof failed");
          return Object.freeze({
            access,
            audit,
            assignments,
            previews,
            revisions,
            deletedPosts,
            deletedSessions,
            joins,
            deletedUsers,
            deletedRoles,
          });
        });
      } catch (error) {
        return await this.#restoreRoutingSettingsAfterFailure(
          error,
          "TASK-554 cleanup failed and routing settings restoration failed"
        );
      }
    })();
    await this.#routingSettingsLease.restore();
    if (!this.#routingSettingsLease.restored) {
      throw new SmokeError(
        "smoke_cleanup_failed",
        "TASK-554 routing settings restoration is unproven"
      );
    }
    this.#cleaned = true;
    const postChildrenRemoved =
      removedCount(output.assignments) +
      removedCount(output.previews) +
      removedCount(output.revisions);
    const rows =
      postChildrenRemoved +
      removedCount(output.access) +
      removedCount(output.audit) +
      removedCount(output.deletedSessions) +
      removedCount(output.joins) +
      removedCount(output.deletedPosts) +
      removedCount(output.deletedUsers) +
      removedCount(output.deletedRoles);
    return Object.freeze({
      schemaVersion: 1,
      postChildrenRemoved,
      accessLogsRemoved: removedCount(output.access),
      loginAuditRowsRemoved: removedCount(output.audit),
      sessionsRemoved: removedCount(output.deletedSessions),
      userRolesRemoved: removedCount(output.joins),
      postsRemoved: removedCount(output.deletedPosts),
      usersRemoved: removedCount(output.deletedUsers),
      rolesRemoved: removedCount(output.deletedRoles),
      preIdentityAbsenceProved: true,
      identityAbsenceProved: true,
      settingsRestored: true,
      statements: 20,
      rows,
    });
  }

  async prove(): Promise<Task554ProofOutput> {
    const state = requireInstalled(this.#state);
    if (!this.#cleaned || !this.#routingSettingsLease.restored)
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 cleanup proof was requested early");
    const postRows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        inArray(
          posts.id,
          state.fixtures.map(({ postId }) => postId)
        )
      );
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(
        inArray(
          users.id,
          state.actors.map(({ userId }) => userId)
        )
      );
    const roleRows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        inArray(
          roles.id,
          state.actors.map(({ roleId }) => roleId)
        )
      );
    if (postRows.length !== 0 || userRows.length !== 0 || roleRows.length !== 0)
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 terminal rows remain");
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
    if (this.#fixturesInstalled && !this.#cleaned) return false;
    return (
      !this.#routingSettingsLease.active &&
      (!this.#routingSettingsLease.wasApplied || this.#routingSettingsLease.restored)
    );
  }
}
