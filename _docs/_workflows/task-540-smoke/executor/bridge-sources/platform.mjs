import { invariant } from "../foundation.mjs";
import {
  BRIDGE_INPUT_READER,
  BRIDGE_OUTPUT_WRITER,
  bridgeInputSchemaGuard,
} from "../../runtime/bun-child-protocol.mjs";

const MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("media-id-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { media } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "mediaId" || !/^[0-9a-f-]{36}$/.test(input.mediaId)) throw new Error("wf540_input");
const rows = await db.select({ id: media.id }).from(media).where(eq(media.id,input.mediaId)).limit(2);
const output = { rowCount: rows.length };` +
  BRIDGE_OUTPUT_WRITER;
const CONTENT_ROUTES_EXACT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("empty-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { settings } from "./db/schema.ts";
if (Object.keys(input).length !== 0) throw new Error("wf540_input");
const rows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"site.contentRoutes")).limit(2);
if (rows.length > 1) throw new Error("wf540_content_routes_cardinality");
const [row] = rows;
const output = row ? { exists:true,value:row.value,updatedAt:row.updatedAt.toISOString() } : { exists:false,value:null,updatedAt:null };` +
  BRIDGE_OUTPUT_WRITER;
const SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("seo-entry-targets-input-v1") +
  String.raw`
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db/client.ts";
import { seoDocuments } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "targetIds" || !Array.isArray(input.targetIds) || input.targetIds.length !== 6 || new Set(input.targetIds).size !== 6) throw new Error("wf540_input");
const candidates = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(and(eq(seoDocuments.targetType,"entry"),inArray(seoDocuments.targetId,input.targetIds))).orderBy(seoDocuments.targetId,seoDocuments.id).limit(7);
const output = { candidates };` +
  BRIDGE_OUTPUT_WRITER;

function assertSeoEntryDiscoveryBridgeFailClosedSource(source = SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE) {
  invariant(typeof source === "string", "SEO discovery bridge source authority drift");
  const required = [
    'validateInput("seo-entry-targets-input-v1",input);/*wf540-bound-input*/',
    'Object.keys(input).join(",") !== "targetIds"',
    "input.targetIds.length !== 6",
    "new Set(input.targetIds).size !== 6",
    "db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType })",
    'where(and(eq(seoDocuments.targetType,"entry"),inArray(seoDocuments.targetId,input.targetIds)))',
    ".orderBy(seoDocuments.targetId,seoDocuments.id).limit(7)",
    "const output = { candidates };",
  ];
  invariant(
    required.every((token) => source.includes(token)) &&
      !source.includes("like(") &&
      !source.includes("ilike(") &&
      !source.includes("ownerSubjectIdentifier"),
    "SEO discovery bridge lost exact bounded entry-target authority"
  );
  return true;
}
const CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("resource-owner-input-v2") +
  String.raw`
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentEntries, customScreenEntryPresentationOverrides, media } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "entryIds,mediaId,override,overrideExpectedPresent" || !Array.isArray(input.entryIds) || input.entryIds.length !== 6 || new Set(input.entryIds).size !== 6 || Object.keys(input.override).sort().join(",") !== "blockId,entryId,propPath,screenId" || typeof input.overrideExpectedPresent !== "boolean") throw new Error("wf540_input");
const entries = (await db.select({ id:contentEntries.id,ownerSubjectIdentifier:contentEntries.authorId }).from(contentEntries).where(inArray(contentEntries.id,input.entryIds)).limit(7)).sort((a,b)=>a.id.localeCompare(b.id));
const mediaRows = await db.select({ id:media.id,ownerSubjectIdentifier:media.createdBy }).from(media).where(eq(media.id,input.mediaId)).limit(2);
const overrideRows = await db.select({ ownerSubjectIdentifier:customScreenEntryPresentationOverrides.updatedBy }).from(customScreenEntryPresentationOverrides).where(and(eq(customScreenEntryPresentationOverrides.screenId,input.override.screenId),eq(customScreenEntryPresentationOverrides.entryId,input.override.entryId),eq(customScreenEntryPresentationOverrides.blockId,input.override.blockId),eq(customScreenEntryPresentationOverrides.propPath,input.override.propPath))).limit(2);
if (entries.length !== 6 || mediaRows.length !== 1 || (input.overrideExpectedPresent ? overrideRows.length !== 1 : overrideRows.length !== 0)) throw new Error("wf540_owner_rows");
const [mediaRow] = mediaRows; const override = overrideRows[0] ?? null;
const output = { entries, media:mediaRow, override, overrideAbsent:override === null };` +
  BRIDGE_OUTPUT_WRITER;

function assertCurrentResourceOwnerBridgeFailClosedSource(
  source = CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE
) {
  invariant(typeof source === "string", "current owner bridge source authority drift");
  const required = [
    'validateInput("resource-owner-input-v2",input);/*wf540-bound-input*/',
    ".limit(7)).sort((a,b)=>a.id.localeCompare(b.id));",
    ".limit(2);\nif (entries.length !== 6 || mediaRows.length !== 1 || (input.overrideExpectedPresent ? overrideRows.length !== 1 : overrideRows.length !== 0))",
    "const [mediaRow] = mediaRows; const override = overrideRows[0] ?? null;",
    "overrideAbsent:override === null",
  ];
  invariant(
    required.every((token) => source.includes(token)),
    "current owner bridge lost exact present/authorized-absence cardinality"
  );
  return true;
}
const STORAGE_PREFLIGHT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-agents-input-v1") +
  String.raw`
import path from "node:path";
import { eq, inArray, or, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { accessLogs, auditLogs, roles, sessions, settings, userRoles, users } from "./db/schema.ts";
import { getStorageSettingsInternal } from "./services/settings/storageSettings.ts";
import { decryptEmail, hashEmail, isEncryptedEmail, normalizeEmail } from "./services/security/piiEmail.ts";
if (Object.keys(input).join(",") !== "userAgents" || !Array.isArray(input.userAgents) || input.userAgents.length !== 4 || new Set(input.userAgents).size !== 4) throw new Error("wf540_input");
const setupRows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"setup.completed")).limit(2);
const driverRows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"storage.driver")).limit(2);
const localDirRows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"storage.local.dir")).limit(2);
if (setupRows.length !== 1 || setupRows[0].value !== true || driverRows.length !== 1 || driverRows[0].value !== "local" || localDirRows.length !== 1 || typeof localDirRows[0].value !== "string" || localDirRows[0].value.length === 0 || Object.hasOwn(process.env,"MEDIA_STORAGE") || Object.hasOwn(process.env,"MEDIA_DIR")) throw new Error("wf540_preflight");
const storage = await getStorageSettingsInternal();
if (storage.driver !== driverRows[0].value || storage.localDir !== localDirRows[0].value) throw new Error("wf540_preflight");
const storageRoot = path.resolve(process.cwd(),localDirRows[0].value);
const normalizedEmail = normalizeEmail(process.env.ADMIN_EMAIL);
const bootstrapEmailHash = hashEmail(normalizedEmail);
const bootstrapRows = await db.select().from(users).where(or(eq(users.emailHash,bootstrapEmailHash),inArray(users.email,[bootstrapEmailHash,normalizedEmail]))).limit(2);
if (bootstrapRows.length !== 1) throw new Error("wf540_bootstrap_cardinality");
const bootstrap = bootstrapRows[0];
if (bootstrap.status !== "active" || bootstrap.emailHash !== bootstrapEmailHash || bootstrap.email !== bootstrapEmailHash || !isEncryptedEmail(bootstrap.emailEncrypted) || decryptEmail(bootstrap.emailEncrypted) !== normalizedEmail) throw new Error("wf540_bootstrap_canonical_identity");
const roleRows = await db.select({
  userId:userRoles.userId, roleId:userRoles.roleId, roleName:roles.name,
  roleDescription:roles.description, rolePermissions:roles.permissions, roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,bootstrap.id)).limit(2);
if (roleRows.length !== 1) throw new Error("wf540_bootstrap_role_cardinality");
const normalizedPermissions = Array.isArray(roleRows[0].rolePermissions) ? [...new Set(roleRows[0].rolePermissions)].sort() : [];
if (roleRows[0].roleName !== "admin" || canonical(normalizedPermissions) !== canonical(["*"])) throw new Error("wf540_bootstrap_role");
const contentRouteRows = await db.select().from(settings).where(eq(settings.key,"site.contentRoutes")).limit(2);
if (contentRouteRows.length > 1) throw new Error("wf540_content_routes_cardinality");
const contentRoutes = contentRouteRows[0];
const auditRows = await db.select({ id:auditLogs.id }).from(auditLogs).where(inArray(sql.raw("metadata->>'userAgent'"),input.userAgents)).orderBy(auditLogs.id).limit(4097);
const accessRows = await db.select({ id:accessLogs.id }).from(accessLogs).where(inArray(accessLogs.userAgent,input.userAgents)).orderBy(accessLogs.id).limit(4097);
const sessionRows = await db.select({ id:sessions.id }).from(sessions).orderBy(sessions.id).limit(4097);
if (auditRows.length > 4096 || accessRows.length > 4096 || sessionRows.length > 4096) throw new Error("wf540_task_traffic_baseline_overflow");
const rawUserRow = {
  id:bootstrap.id,email:bootstrap.email,emailHash:bootstrap.emailHash,emailEncrypted:bootstrap.emailEncrypted,
  passwordHash:bootstrap.passwordHash,name:bootstrap.name,status:bootstrap.status,
  createdAt:bootstrap.createdAt.toISOString(),updatedAt:bootstrap.updatedAt.toISOString(),
  lastLoginAt:bootstrap.lastLoginAt?.toISOString() ?? null,
};
const roleTuples = roleRows.map((row)=>({
  userId:row.userId,roleId:row.roleId,roleName:row.roleName,roleDescription:row.roleDescription,
  rolePermissions:row.rolePermissions,roleCreatedAt:row.roleCreatedAt.toISOString(),
})).sort((a,b)=>a.roleId.localeCompare(b.roleId));
const output = {
  bootstrap: {
    id:bootstrap.id,lastLoginAt:rawUserRow.lastLoginAt,updatedAt:rawUserRow.updatedAt,
    normalizedEmailProof:true,emailHashProof:true,encryptedEmailProof:true,decryptEmailProof:true,
    rawUserRow,roleTuples,
  },
  contentRoutes: contentRoutes ? { exists: true, value: contentRoutes.value, updatedAt: contentRoutes.updatedAt.toISOString() } : { exists: false, value: null, updatedAt: null },
  local: true,
  requiredSettings: {
    setup: { ...setupRows[0], updatedAt: setupRows[0].updatedAt.toISOString() },
    driver: { ...driverRows[0], updatedAt: driverRows[0].updatedAt.toISOString() },
    localDir: { ...localDirRows[0], updatedAt: localDirRows[0].updatedAt.toISOString() },
  },
  setupComplete: true,
  storageRoot,
  taskTrafficBaseline: { auditIds:auditRows.map((row)=>row.id), accessIds:accessRows.map((row)=>row.id), sessionIds:sessionRows.map((row)=>row.id) },
};` +
  BRIDGE_OUTPUT_WRITER;
function securityBridgeSource(mode) {
  invariant(mode === "session" || mode === "rate", "security bridge mode is invalid");
  const projection =
    mode === "session"
      ? String.raw`const output = { csrfHeaderName: value.csrf.headerName.toLowerCase(), effectiveMaxPerUserAtLeast2: value.session.maxPerUser >= 2, singleSession: value.session.singleSession };`
      : String.raw`const output = { enabled: value.rateLimit.enabled, maxRequests: value.rateLimit.buckets.auth.maxRequests, windowSeconds: value.rateLimit.buckets.auth.windowSeconds };`;
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("empty-input-v1") +
    String.raw`
import { getSecuritySettings } from "./services/settings/securitySettings.ts";
if (Object.keys(input).length !== 0) throw new Error("wf540_input");
const value = await getSecuritySettings();
` +
    projection +
    BRIDGE_OUTPUT_WRITER
  );
}
const SECURITY_SESSION_BRIDGE_SOURCE = securityBridgeSource("session");
const SECURITY_RATE_BRIDGE_SOURCE = securityBridgeSource("rate");
const SCREEN_MATERIALIZE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("screen-materialize-input-v1") +
  String.raw`
import { buildDefaultListViewDefinition, normalizeCustomScreenDefinitionForWrite, customScreenCreateSchema } from "./services/customScreens/customScreenSchemas.ts";
import { validate } from "./server/validation/schemaValidator.ts";
if (Object.keys(input).sort().join(",") !== "bodyWithoutDefinition,contentType,definitionWithoutListView") throw new Error("wf540_input");
const definition = { ...input.definitionWithoutListView, listView: buildDefaultListViewDefinition(input.contentType) };
const normalized = normalizeCustomScreenDefinitionForWrite({ definition }, { contentType: input.contentType });
if (canonical(normalized) !== canonical(definition)) throw new Error("wf540_normalizer_delta");
const output = { ...input.bodyWithoutDefinition, schemaVersion: 4, definition };
validate(customScreenCreateSchema, output);` +
  BRIDGE_OUTPUT_WRITER;

export {
  CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
  CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
  SCREEN_MATERIALIZE_BRIDGE_SOURCE,
  SECURITY_RATE_BRIDGE_SOURCE,
  SECURITY_SESSION_BRIDGE_SOURCE,
  SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
  assertCurrentResourceOwnerBridgeFailClosedSource,
  assertSeoEntryDiscoveryBridgeFailClosedSource,
};
