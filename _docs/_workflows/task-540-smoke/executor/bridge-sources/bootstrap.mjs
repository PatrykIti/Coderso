import {
  BRIDGE_INPUT_READER,
  BRIDGE_OUTPUT_WRITER,
  bridgeInputSchemaGuard,
} from "../../runtime/bun-child-protocol.mjs";

const API_SESSION_OBSERVATION_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-session-observation-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { sessions } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "userAgent,userId" || typeof input.userAgent !== "string" || !input.userAgent || typeof input.userId !== "string") throw new Error("wf540_input");
const sessionRows = await db.select({
  id:sessions.id,userId:sessions.userId,tokenHash:sessions.tokenHash,csrfTokenHash:sessions.csrfTokenHash,
  ip:sessions.ip,userAgent:sessions.userAgent,expiresAt:sessions.expiresAt,
  createdAt:sessions.createdAt,revokedAt:sessions.revokedAt,
}).from(sessions).where(and(eq(sessions.userId,input.userId),eq(sessions.userAgent,input.userAgent))).limit(2);
if (sessionRows.length > 1) throw new Error("wf540_api_session_cardinality");
const rows = sessionRows.map((row)=>({
  id:row.id,userId:row.userId,tokenHash:row.tokenHash,csrfTokenHash:row.csrfTokenHash,
  ip:row.ip,userAgent:row.userAgent,expiresAt:row.expiresAt.toISOString(),
  createdAt:row.createdAt.toISOString(),revokedAt:row.revokedAt?.toISOString() ?? null,
}));
const output = { rows };` +
  BRIDGE_OUTPUT_WRITER;
const BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-session-observation-input-v1") +
  String.raw`
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { auditLogs, roles, sessions, userRoles, users } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "userAgent,userId" || typeof input.userAgent !== "string" || !input.userAgent || typeof input.userId !== "string") throw new Error("wf540_input");
const userRows = await db.select().from(users).where(eq(users.id,input.userId)).limit(2);
if (userRows.length !== 1) throw new Error("wf540_bootstrap_observation_cardinality");
const roleRows = await db.select({
  userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
  roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,input.userId)).limit(2);
if (roleRows.length !== 1) throw new Error("wf540_bootstrap_observation_roles");
const sessionRows = await db.select({id:sessions.id}).from(sessions).where(and(eq(sessions.userId,input.userId),eq(sessions.userAgent,input.userAgent))).orderBy(sessions.id).limit(4097);
const auditRows = await db.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.actorId,input.userId),eq(auditLogs.action,"auth.login"),eq(sql.raw("metadata->>'userAgent'"),input.userAgent))).orderBy(auditLogs.id).limit(4097);
if (sessionRows.length > 4096 || auditRows.length > 4096) throw new Error("wf540_bootstrap_observation_overflow");
const row = userRows[0];
const rawUserRow = {
  id:row.id,email:row.email,emailHash:row.emailHash,emailEncrypted:row.emailEncrypted,
  passwordHash:row.passwordHash,name:row.name,status:row.status,
  createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
  lastLoginAt:row.lastLoginAt?.toISOString() ?? null,
};
const roleTuples = roleRows.map((role)=>({
  userId:role.userId,roleId:role.roleId,roleName:role.roleName,roleDescription:role.roleDescription,
  rolePermissions:role.rolePermissions,roleCreatedAt:role.roleCreatedAt.toISOString(),
})).sort((a,b)=>a.roleId.localeCompare(b.roleId));
const output = {
  auditIds:auditRows.map(({id})=>id),id:row.id,lastLoginAt:rawUserRow.lastLoginAt,rawUserRow,roleTuples,
  sessionIds:sessionRows.map(({id})=>id),updatedAt:rawUserRow.updatedAt,
};` +
  BRIDGE_OUTPUT_WRITER;
const BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "userId") throw new Error("wf540_input");
const userRows = await db.select().from(users).where(eq(users.id,input.userId)).limit(2);
if (userRows.length !== 1) throw new Error("wf540_bootstrap_baseline_read_cardinality");
const row = userRows[0];
if (Object.keys(row).sort().join(",") !== "createdAt,email,emailEncrypted,emailHash,id,lastLoginAt,name,passwordHash,status,updatedAt") throw new Error("wf540_bootstrap_baseline_read_columns");
const roleRows = await db.select({
  userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
  roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,input.userId)).limit(2);
if (roleRows.length !== 1) throw new Error("wf540_bootstrap_baseline_read_roles");
const rawUserRow = {
  id:row.id,email:row.email,emailHash:row.emailHash,emailEncrypted:row.emailEncrypted,
  passwordHash:row.passwordHash,name:row.name,status:row.status,
  createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
  lastLoginAt:row.lastLoginAt?.toISOString() ?? null,
};
const roleTuples = roleRows.map((role)=>({
  userId:role.userId,roleId:role.roleId,roleName:role.roleName,roleDescription:role.roleDescription,
  rolePermissions:role.rolePermissions,roleCreatedAt:role.roleCreatedAt.toISOString(),
})).sort((a,b)=>a.roleId.localeCompare(b.roleId));
const output = { id:row.id,rawUserRow,roleTuples };` +
  BRIDGE_OUTPUT_WRITER;
const BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("bootstrap-restore-input-v1") +
  `
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "baseline,newestOwnedPair,userId") throw new Error("wf540_input");
const timestamp = (value) => value === null ? null : new Date(value);
const notDistinct = (column,value) => sql\`\${column} IS NOT DISTINCT FROM \${value}\`;
const knownRollback = Object.freeze({ kind:"wf540_bootstrap_known_rollback" });
const rollbackKnown = () => { throw knownRollback; };
const serializeUser = (row) => {
  if (Object.keys(row).sort().join(",") !== "createdAt,email,emailEncrypted,emailHash,id,lastLoginAt,name,passwordHash,status,updatedAt") return null;
  return {
    id:row.id,email:row.email,emailHash:row.emailHash,emailEncrypted:row.emailEncrypted,
    passwordHash:row.passwordHash,name:row.name,status:row.status,
    createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
    lastLoginAt:row.lastLoginAt?.toISOString() ?? null,
  };
};
const selectRoles = async (executor,lock) => {
  let query = executor.select({
    userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
    roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
  }).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,input.userId)).limit(2);
  if (lock) query = query.for("share");
  return (await query).map((row)=>({
    userId:row.userId,roleId:row.roleId,roleName:row.roleName,roleDescription:row.roleDescription,
    rolePermissions:row.rolePermissions,roleCreatedAt:row.roleCreatedAt.toISOString(),
  })).sort((a,b)=>a.roleId.localeCompare(b.roleId));
};
let transactionProof = null;
try {
  transactionProof = await db.transaction(async (tx) => {
    const lockedRows = await tx.select().from(users).where(eq(users.id,input.userId)).limit(2).for("update");
    const lockedRoles = await selectRoles(tx,true);
    if (lockedRows.length !== 1 || lockedRoles.length !== 1) rollbackKnown();
    const locked = serializeUser(lockedRows[0]);
    if (locked === null) rollbackKnown();
    const pairMatches = locked.lastLoginAt === input.newestOwnedPair.lastLoginAt && locked.updatedAt === input.newestOwnedPair.updatedAt;
    const unchangedMatches = canonical({...locked,lastLoginAt:input.baseline.rawUserRow.lastLoginAt,updatedAt:input.baseline.rawUserRow.updatedAt}) === canonical(input.baseline.rawUserRow);
    const roleTuplesByteIdentical = canonical(lockedRoles) === canonical(input.baseline.roleTuples);
    if (!pairMatches || !unchangedMatches || !roleTuplesByteIdentical) rollbackKnown();
    const predicates = [
      notDistinct(users.id,input.userId),notDistinct(users.email,input.baseline.rawUserRow.email),
      notDistinct(users.emailHash,input.baseline.rawUserRow.emailHash),
      notDistinct(users.emailEncrypted,input.baseline.rawUserRow.emailEncrypted),
      notDistinct(users.passwordHash,input.baseline.rawUserRow.passwordHash),
      notDistinct(users.name,input.baseline.rawUserRow.name),notDistinct(users.status,input.baseline.rawUserRow.status),
      notDistinct(users.createdAt,new Date(input.baseline.rawUserRow.createdAt)),
      notDistinct(users.updatedAt,new Date(input.newestOwnedPair.updatedAt)),
      notDistinct(users.lastLoginAt,timestamp(input.newestOwnedPair.lastLoginAt)),
    ];
    const updated = await tx.update(users).set({
      lastLoginAt:timestamp(input.baseline.rawUserRow.lastLoginAt),
      updatedAt:new Date(input.baseline.rawUserRow.updatedAt),
    }).where(and(...predicates)).returning();
    if (updated.length !== 1) rollbackKnown();
    const conditionalUpdateAffectedOne = true;
    const inTransactionRows = await tx.select().from(users).where(eq(users.id,input.userId)).limit(2);
    const inTransactionUser = inTransactionRows.length === 1 ? serializeUser(inTransactionRows[0]) : null;
    const inTransactionByteIdentical = inTransactionUser !== null &&
      canonical(inTransactionUser) === canonical(input.baseline.rawUserRow);
    const rolesAfter = await selectRoles(tx,false);
    const rolesInTransactionByteIdentical = rolesAfter.length === 1 &&
      canonical(rolesAfter) === canonical(input.baseline.roleTuples);
    if (!inTransactionByteIdentical || !rolesInTransactionByteIdentical) rollbackKnown();
    return {
      conditionalUpdateAffectedOne, inTransactionByteIdentical, roleTuplesByteIdentical,
      rolesInTransactionByteIdentical, rolesShareLocked:true, transactionLocked:true,
    };
  });
} catch (error) {
  if (error !== knownRollback) throw error;
}
let output;
if (transactionProof === null) {
  output = { kind:"rolled-back",proof:null };
} else {
  const afterRows = await db.select().from(users).where(eq(users.id,input.userId)).limit(2);
  const afterRoles = await selectRoles(db,false);
  const afterUser = afterRows.length === 1 ? serializeUser(afterRows[0]) : null;
  const afterCommitByteIdentical = afterUser !== null &&
    canonical(afterUser) === canonical(input.baseline.rawUserRow);
  const completeRowByteIdentical = afterCommitByteIdentical;
  const roleTuplesByteIdentical = afterRoles.length === 1 &&
    transactionProof.roleTuplesByteIdentical &&
    canonical(afterRoles) === canonical(input.baseline.roleTuples);
  const restored = completeRowByteIdentical && roleTuplesByteIdentical;
  const proof = {
    ...transactionProof,afterCommitByteIdentical,completeRowByteIdentical,restored,
    roleTuplesByteIdentical,
  };
  output = { kind:restored ? "committed" : "committed-proof-failed",proof };
}` +
  BRIDGE_OUTPUT_WRITER;

export {
  API_SESSION_OBSERVATION_BRIDGE_SOURCE,
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
};
