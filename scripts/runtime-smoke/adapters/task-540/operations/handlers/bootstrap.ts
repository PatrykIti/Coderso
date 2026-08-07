import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
} from "../../../../workers/contracts";
import type { SQLWrapper } from "drizzle-orm";
import {
  canonicalTask540Json as canonical,
  task540HandlerArtifactSha256,
  type Task540InputFor,
  type Task540TypedHandler,
} from "../contracts";

export async function handleBootstrapApiSessionObservation(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-session-observation-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { sessions } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !== "userAgent,userId" ||
    typeof input.userAgent !== "string" ||
    !input.userAgent ||
    typeof input.userId !== "string"
  )
    throw new Error("wf540_input");
  const sessionRows = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      tokenHash: sessions.tokenHash,
      csrfTokenHash: sessions.csrfTokenHash,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, input.userId), eq(sessions.userAgent, input.userAgent)))
    .limit(2);
  if (sessionRows.length > 1) throw new Error("wf540_api_session_cardinality");
  const rows = sessionRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    csrfTokenHash: row.csrfTokenHash,
    ip: row.ip,
    userAgent: row.userAgent,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  }));
  const output = { rows };
  return output as unknown as PlainJsonValue;
}

export async function handleBootstrapBaselineRead(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-id-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { roles, userRoles, users } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).sort().join(",") !== "userId") throw new Error("wf540_input");
  const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(2);
  if (userRows.length !== 1) throw new Error("wf540_bootstrap_baseline_read_cardinality");
  const row = userRows[0];
  if (
    Object.keys(row).sort().join(",") !==
    "createdAt,email,emailEncrypted,emailHash,id,lastLoginAt,name,passwordHash,status,updatedAt"
  )
    throw new Error("wf540_bootstrap_baseline_read_columns");
  const roleRows = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDescription: roles.description,
      rolePermissions: roles.permissions,
      roleCreatedAt: roles.createdAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, input.userId))
    .limit(2);
  if (roleRows.length !== 1) throw new Error("wf540_bootstrap_baseline_read_roles");
  const rawUserRow = {
    id: row.id,
    email: row.email,
    emailHash: row.emailHash,
    emailEncrypted: row.emailEncrypted,
    passwordHash: row.passwordHash,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
  const roleTuples = roleRows
    .map((role) => ({
      userId: role.userId,
      roleId: role.roleId,
      roleName: role.roleName,
      roleDescription: role.roleDescription,
      rolePermissions: role.rolePermissions,
      roleCreatedAt: role.roleCreatedAt.toISOString(),
    }))
    .sort((a, b) => a.roleId.localeCompare(b.roleId));
  const output = { id: row.id, rawUserRow, roleTuples };
  return output as unknown as PlainJsonValue;
}

export async function handleBootstrapCasRestore(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"bootstrap-restore-input-v1">;

  const { and, eq, sql } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { roles, userRoles, users } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).sort().join(",") !== "baseline,newestOwnedPair,userId")
    throw new Error("wf540_input");
  const timestamp = (value: unknown): Date | null => {
    if (value === null) return null;
    if (typeof value !== "string") throw new Error("wf540_bootstrap_timestamp");
    return new Date(value);
  };
  const rollbackReasons = Object.freeze([
    "wf540_bootstrap_cas_locked_user_cardinality",
    "wf540_bootstrap_cas_locked_role_cardinality",
    "wf540_bootstrap_cas_locked_user_shape",
    "wf540_bootstrap_cas_newest_pair_mismatch",
    "wf540_bootstrap_cas_user_baseline_mismatch",
    "wf540_bootstrap_cas_role_baseline_mismatch",
    "wf540_bootstrap_cas_update_cardinality",
    "wf540_bootstrap_cas_transaction_user_mismatch",
    "wf540_bootstrap_cas_transaction_role_mismatch",
  ] as const);
  type RollbackReason = (typeof rollbackReasons)[number];
  const knownRollbacks = Object.freeze(
    Object.fromEntries(
      rollbackReasons.map((reason) => [
        reason,
        Object.freeze({ kind: "wf540_bootstrap_known_rollback", reason }),
      ])
    )
  ) as Readonly<Record<RollbackReason, Readonly<{ kind: string; reason: RollbackReason }>>>;
  const rollbackKnown = (reason: RollbackReason): never => {
    const rollback = knownRollbacks[reason];
    if (rollback === undefined) throw new Error("wf540_bootstrap_cas_reason_drift");
    throw rollback;
  };
  const serializeUser = (row: typeof users.$inferSelect | undefined) => {
    if (row === undefined) return null;
    if (
      Object.keys(row).sort().join(",") !==
      "createdAt,email,emailEncrypted,emailHash,id,lastLoginAt,name,passwordHash,status,updatedAt"
    )
      return null;
    return {
      id: row.id,
      email: row.email,
      emailHash: row.emailHash,
      emailEncrypted: row.emailEncrypted,
      passwordHash: row.passwordHash,
      name: row.name,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    };
  };
  const selectRoles = async (executor: Pick<typeof db, "select">, lock: boolean) => {
    const query = executor
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        roleName: roles.name,
        roleDescription: roles.description,
        rolePermissions: roles.permissions,
        roleCreatedAt: roles.createdAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, input.userId))
      .limit(2);
    const rows = lock ? await query.for("share") : await query;
    return rows
      .map((row) => ({
        userId: row.userId,
        roleId: row.roleId,
        roleName: row.roleName,
        roleDescription: row.roleDescription,
        rolePermissions: row.rolePermissions,
        roleCreatedAt: row.roleCreatedAt.toISOString(),
      }))
      .sort((a, b) => a.roleId.localeCompare(b.roleId));
  };
  interface TransactionProof {
    readonly conditionalUpdateAffectedOne: boolean;
    readonly inTransactionByteIdentical: boolean;
    readonly roleTuplesByteIdentical: boolean;
    readonly rolesInTransactionByteIdentical: boolean;
    readonly rolesShareLocked: boolean;
    readonly transactionLocked: boolean;
  }
  let transactionProof: TransactionProof | null = null;
  let rollbackReason: RollbackReason | null = null;
  try {
    transactionProof = await db.transaction(async (tx) => {
      const lockedRows = await tx
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(2)
        .for("update");
      const lockedRoles = await selectRoles(tx, true);
      if (lockedRows.length !== 1) rollbackKnown("wf540_bootstrap_cas_locked_user_cardinality");
      if (lockedRoles.length !== 1) rollbackKnown("wf540_bootstrap_cas_locked_role_cardinality");
      const locked =
        serializeUser(lockedRows[0]) ?? rollbackKnown("wf540_bootstrap_cas_locked_user_shape");
      const pairMatches =
        locked.lastLoginAt === input.newestOwnedPair.lastLoginAt &&
        locked.updatedAt === input.newestOwnedPair.updatedAt;
      const unchangedMatches =
        canonical({
          ...locked,
          lastLoginAt: input.baseline.rawUserRow.lastLoginAt,
          updatedAt: input.baseline.rawUserRow.updatedAt,
        }) === canonical(input.baseline.rawUserRow);
      const roleTuplesByteIdentical =
        canonical(lockedRoles) === canonical(input.baseline.roleTuples);
      if (!pairMatches) rollbackKnown("wf540_bootstrap_cas_newest_pair_mismatch");
      if (!unchangedMatches) rollbackKnown("wf540_bootstrap_cas_user_baseline_mismatch");
      if (!roleTuplesByteIdentical) rollbackKnown("wf540_bootstrap_cas_role_baseline_mismatch");
      const notDistinctText = (column: SQLWrapper, value: unknown) =>
        sql`${column} IS NOT DISTINCT FROM ${value}::text`;
      const notDistinctUuid = (column: SQLWrapper, value: unknown) =>
        sql`${column} IS NOT DISTINCT FROM ${value}::uuid`;
      const notDistinctJsonb = (column: SQLWrapper, value: unknown) =>
        sql`${column} IS NOT DISTINCT FROM ${value === null ? null : JSON.stringify(value)}::jsonb`;
      const notDistinctTimestampMs = (column: SQLWrapper, iso: unknown) =>
        sql`date_trunc('milliseconds',${column}) IS NOT DISTINCT FROM ${iso}::timestamp`;
      const predicates = [
        notDistinctUuid(users.id, input.userId),
        notDistinctText(users.email, input.baseline.rawUserRow.email),
        notDistinctText(users.emailHash, input.baseline.rawUserRow.emailHash),
        notDistinctJsonb(users.emailEncrypted, input.baseline.rawUserRow.emailEncrypted),
        notDistinctText(users.passwordHash, input.baseline.rawUserRow.passwordHash),
        notDistinctText(users.name, input.baseline.rawUserRow.name),
        notDistinctText(users.status, input.baseline.rawUserRow.status),
        notDistinctTimestampMs(users.createdAt, input.baseline.rawUserRow.createdAt),
        notDistinctTimestampMs(users.updatedAt, input.newestOwnedPair.updatedAt),
        notDistinctTimestampMs(users.lastLoginAt, input.newestOwnedPair.lastLoginAt),
      ];
      const updated = await tx
        .update(users)
        .set({
          lastLoginAt: timestamp(input.baseline.rawUserRow.lastLoginAt),
          updatedAt:
            timestamp(input.baseline.rawUserRow.updatedAt) ??
            rollbackKnown("wf540_bootstrap_cas_user_baseline_mismatch"),
        })
        .where(and(...predicates))
        .returning();
      if (updated.length !== 1) rollbackKnown("wf540_bootstrap_cas_update_cardinality");
      const conditionalUpdateAffectedOne = true;
      const inTransactionRows = await tx
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(2);
      const inTransactionUser =
        inTransactionRows.length === 1 ? serializeUser(inTransactionRows[0]) : null;
      const inTransactionByteIdentical =
        inTransactionUser !== null &&
        canonical(inTransactionUser) === canonical(input.baseline.rawUserRow);
      const rolesAfter = await selectRoles(tx, false);
      const rolesInTransactionByteIdentical =
        rolesAfter.length === 1 && canonical(rolesAfter) === canonical(input.baseline.roleTuples);
      if (!inTransactionByteIdentical)
        rollbackKnown("wf540_bootstrap_cas_transaction_user_mismatch");
      if (!rolesInTransactionByteIdentical)
        rollbackKnown("wf540_bootstrap_cas_transaction_role_mismatch");
      return {
        conditionalUpdateAffectedOne,
        inTransactionByteIdentical,
        roleTuplesByteIdentical,
        rolesInTransactionByteIdentical,
        rolesShareLocked: true,
        transactionLocked: true,
      };
    });
  } catch (error) {
    const knownReason = rollbackReasons.find((reason) => error === knownRollbacks[reason]) ?? null;
    if (knownReason === null) throw error;
    rollbackReason = knownReason;
  }
  let output;
  if (transactionProof === null) {
    if (rollbackReason === null) throw new Error("wf540_bootstrap_cas_reason_absent");
    output = { kind: "rolled-back", proof: null, reason: rollbackReason };
  } else {
    if (rollbackReason !== null) throw new Error("wf540_bootstrap_cas_reason_unexpected");
    const afterRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(2);
    const afterRoles = await selectRoles(db, false);
    const afterUser = afterRows.length === 1 ? serializeUser(afterRows[0]) : null;
    const afterCommitByteIdentical =
      afterUser !== null && canonical(afterUser) === canonical(input.baseline.rawUserRow);
    const completeRowByteIdentical = afterCommitByteIdentical;
    const roleTuplesByteIdentical =
      afterRoles.length === 1 &&
      transactionProof.roleTuplesByteIdentical &&
      canonical(afterRoles) === canonical(input.baseline.roleTuples);
    const restored = completeRowByteIdentical && roleTuplesByteIdentical;
    const proof = {
      ...transactionProof,
      afterCommitByteIdentical,
      completeRowByteIdentical,
      restored,
      roleTuplesByteIdentical,
    };
    output = { kind: restored ? "committed" : "committed-proof-failed", proof, reason: null };
  }
  return output as unknown as PlainJsonValue;
}

export async function handleBootstrapLoginObservation(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-session-observation-input-v1">;

  const { and, eq, sql } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { auditLogs, roles, sessions, userRoles, users } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !== "userAgent,userId" ||
    typeof input.userAgent !== "string" ||
    !input.userAgent ||
    typeof input.userId !== "string"
  )
    throw new Error("wf540_input");
  const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(2);
  if (userRows.length !== 1) throw new Error("wf540_bootstrap_observation_cardinality");
  const roleRows = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDescription: roles.description,
      rolePermissions: roles.permissions,
      roleCreatedAt: roles.createdAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, input.userId))
    .limit(2);
  if (roleRows.length !== 1) throw new Error("wf540_bootstrap_observation_roles");
  const sessionRows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, input.userId), eq(sessions.userAgent, input.userAgent)))
    .orderBy(sessions.id)
    .limit(4097);
  const auditRows = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.actorId, input.userId),
        eq(auditLogs.action, "auth.login"),
        eq(sql.raw("metadata->>'userAgent'"), input.userAgent)
      )
    )
    .orderBy(auditLogs.id)
    .limit(4097);
  if (sessionRows.length > 4096 || auditRows.length > 4096)
    throw new Error("wf540_bootstrap_observation_overflow");
  const row = userRows[0];
  const rawUserRow = {
    id: row.id,
    email: row.email,
    emailHash: row.emailHash,
    emailEncrypted: row.emailEncrypted,
    passwordHash: row.passwordHash,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
  const roleTuples = roleRows
    .map((role) => ({
      userId: role.userId,
      roleId: role.roleId,
      roleName: role.roleName,
      roleDescription: role.roleDescription,
      rolePermissions: role.rolePermissions,
      roleCreatedAt: role.roleCreatedAt.toISOString(),
    }))
    .sort((a, b) => a.roleId.localeCompare(b.roleId));
  const output = {
    auditIds: auditRows.map(({ id }) => id),
    id: row.id,
    lastLoginAt: rawUserRow.lastLoginAt,
    rawUserRow,
    roleTuples,
    sessionIds: sessionRows.map(({ id }) => id),
    updatedAt: rawUserRow.updatedAt,
  };
  return output as unknown as PlainJsonValue;
}

export const TASK540_BOOTSTRAP_HANDLERS: readonly Task540TypedHandler[] = Object.freeze([
  Object.freeze({
    handlerId: "source/bootstrap/api-session-observation",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/bootstrap/api-session-observation"),
    execute: handleBootstrapApiSessionObservation,
  }),
  Object.freeze({
    handlerId: "source/bootstrap/baseline-read",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/bootstrap/baseline-read"),
    execute: handleBootstrapBaselineRead,
  }),
  Object.freeze({
    handlerId: "source/bootstrap/cas-restore",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/bootstrap/cas-restore"),
    execute: handleBootstrapCasRestore,
  }),
  Object.freeze({
    handlerId: "source/bootstrap/login-observation",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/bootstrap/login-observation"),
    execute: handleBootstrapLoginObservation,
  }),
]);
