import { deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";
import { CLEANUP_OPERATION_KINDS } from "./resource-contracts.mjs";
import {
  BRIDGE_INPUT_READER,
  BRIDGE_OUTPUT_WRITER,
  bridgeInputSchemaGuard,
} from "../runtime/bun-child-protocol.mjs";

function presentationOverrideExactBridgeSource(operation) {
  invariant(
    CLEANUP_OPERATION_KINDS.includes(operation),
    "presentation override bridge operation drift"
  );
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(customScreenEntryPresentationOverrides).where(predicate).returning({ screenId: customScreenEntryPresentationOverrides.screenId })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_override_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_override_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_override_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-override-input-v1") +
    String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { customScreenEntryPresentationOverrides } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 4) throw new Error("wf540_input");
const [screenId,entryId,blockId,propPath] = input.identifier;
const predicate = and(eq(customScreenEntryPresentationOverrides.screenId,screenId),eq(customScreenEntryPresentationOverrides.entryId,entryId),eq(customScreenEntryPresentationOverrides.blockId,blockId),eq(customScreenEntryPresentationOverrides.propPath,propPath));
const before = await db.select({ screenId: customScreenEntryPresentationOverrides.screenId }).from(customScreenEntryPresentationOverrides).where(predicate).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ screenId: customScreenEntryPresentationOverrides.screenId }).from(customScreenEntryPresentationOverrides).where(predicate).limit(2);
` +
    assertion +
    String.raw`
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      presentationOverrideExactBridgeSource(operation),
    ])
  )
);

function seoEntryDocumentExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "SEO entry bridge operation drift");
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(seoDocuments).where(predicate).returning({ id: seoDocuments.id })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_seo_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_seo_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_seo_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-seo-entry-input-v1") +
    String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { seoDocuments } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 3) throw new Error("wf540_input");
const [id,targetType,targetId] = input.identifier;
if (targetType !== "entry") throw new Error("wf540_target_type");
const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));
const before = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);
` +
    assertion +
    String.raw`
const output = { absent:after.length === 0,affected,present:before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      seoEntryDocumentExactBridgeSource(operation),
    ])
  )
);

function assertSeoEntryDocumentExactBridgeSourcesFailClosed(
  sources = SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES
) {
  exactOwnKeys(sources, CLEANUP_OPERATION_KINDS, "SEO entry P/C/A source registry", {
    plain: true,
  });
  const exactPredicate =
    "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));";
  const sharedRequired = [
    'validateInput("identifier-seo-entry-input-v1",input);/*wf540-bound-input*/',
    'if (targetType !== "entry") throw new Error("wf540_target_type");',
    exactPredicate,
    "const before = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);",
    "const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);",
    "const output = { absent:after.length === 0,affected,present:before.length === 1 };",
  ];
  const operationRequired = {
    provenance: [
      "const affected = 0;",
      'if (before.length !== 1) throw new Error("wf540_seo_provenance");',
    ],
    delete: [
      "const affected = (await db.delete(seoDocuments).where(predicate).returning({ id: seoDocuments.id })).length;",
      'if (affected !== 1 || after.length !== 0) throw new Error("wf540_seo_delete");',
    ],
    absence: [
      "const affected = 0;",
      'if (after.length !== 0) throw new Error("wf540_seo_absence");',
    ],
  };
  const expectedPredicateUses = { provenance: 2, delete: 3, absence: 2 };
  for (const operation of CLEANUP_OPERATION_KINDS) {
    const source = sources[operation];
    invariant(typeof source === "string", "SEO entry " + operation + " source is absent");
    invariant(
      [...sharedRequired, ...operationRequired[operation]].every((token) =>
        source.includes(token)
      ) &&
        source.split(".where(predicate)").length - 1 === expectedPredicateUses[operation] &&
        !source.includes("like(") &&
        !source.includes("ilike("),
      "SEO entry " + operation + " source lost exact ID/type/target predicate authority"
    );
  }
  return true;
}

function userSettingExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "user setting bridge operation drift");
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(userSettings).where(predicate).returning({ userId: userSettings.userId })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_setting_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_setting_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_setting_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-setting-input-v1") +
    String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { userSettings } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 2) throw new Error("wf540_input");
const [userId,key] = input.identifier;
const predicate = and(eq(userSettings.userId,userId),eq(userSettings.key,key));
const before = await db.select({ userId: userSettings.userId }).from(userSettings).where(predicate).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ userId: userSettings.userId }).from(userSettings).where(predicate).limit(2);
` +
    assertion +
    String.raw`
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const USER_SETTING_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [operation, userSettingExactBridgeSource(operation)])
  )
);

function userExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "user exact bridge operation drift");
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(users).where(eq(users.id,userId)).returning({ id: users.id })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_user_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_user_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_user_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-uuid-input-v1") +
    String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { users } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 1) throw new Error("wf540_input");
const [userId] = input.identifier;
const before = await db.select({ id: users.id }).from(users).where(eq(users.id,userId)).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ id: users.id }).from(users).where(eq(users.id,userId)).limit(2);
` +
    assertion +
    String.raw`
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const USER_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [operation, userExactBridgeSource(operation)])
  )
);
const TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-agents-input-v1") +
  String.raw`
import { inArray, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { accessLogs, auditLogs, sessions } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "userAgents" || !Array.isArray(input.userAgents) || input.userAgents.length !== 4 || new Set(input.userAgents).size !== 4) throw new Error("wf540_input");
const auditRows = await db.select({ id:auditLogs.id,actorId:auditLogs.actorId,metadata:auditLogs.metadata }).from(auditLogs).where(inArray(sql.raw("metadata->>'userAgent'"),input.userAgents)).orderBy(auditLogs.id).limit(4097);
const access = await db.select({ id:accessLogs.id,sessionId:accessLogs.sessionId,userId:accessLogs.userId,userAgent:accessLogs.userAgent }).from(accessLogs).where(inArray(accessLogs.userAgent,input.userAgents)).orderBy(accessLogs.id).limit(4097);
const session = await db.select({ id:sessions.id,userId:sessions.userId,userAgent:sessions.userAgent }).from(sessions).where(inArray(sessions.userAgent,input.userAgents)).orderBy(sessions.id).limit(4097);
const completeSession = await db.select({ id:sessions.id,userId:sessions.userId,userAgent:sessions.userAgent }).from(sessions).orderBy(sessions.id).limit(4097);
if ([auditRows,access,session,completeSession].some((rows)=>rows.length > 4096)) throw new Error("wf540_task_traffic_overflow");
const audit = auditRows.map(({id,actorId,metadata})=>{
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || !input.userAgents.includes(metadata.userAgent)) throw new Error("wf540_task_audit_projection");
  return {id,actorId,userAgent:metadata.userAgent};
});
const output = { access, audit, completeSession, session };` +
  BRIDGE_OUTPUT_WRITER;

function exactTaskTrafficBridgeSource(kind, operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "task traffic bridge operation drift");
  const table =
    kind === "audit-log-task-ua"
      ? "auditLogs"
      : kind === "access-log-task-ua"
        ? "accessLogs"
        : "sessions";
  const importName = table;
  const mutation =
    operation === "delete"
      ? `const affected = (await db.delete(${table}).where(eq(${table}.id,id)).returning({ id: ${table}.id })).length;`
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_terminal_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_terminal_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_terminal_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-uuid-input-v1") +
    `
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { ${importName} } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 1) throw new Error("wf540_input");
const [id] = input.identifier;
const before = await db.select({ id: ${table}.id }).from(${table}).where(eq(${table}.id,id)).limit(2);
${mutation}
const after = await db.select({ id: ${table}.id }).from(${table}).where(eq(${table}.id,id)).limit(2);
${assertion}
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const TASK_TRAFFIC_EXACT_BRIDGE_SOURCES = deepFreezeExact({
  "audit-log-task-ua": Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      exactTaskTrafficBridgeSource("audit-log-task-ua", operation),
    ])
  ),
  "access-log-task-ua": Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      exactTaskTrafficBridgeSource("access-log-task-ua", operation),
    ])
  ),
  "session-task": Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      exactTaskTrafficBridgeSource("session-task", operation),
    ])
  ),
});

function entityIdProvenanceBridgeSource(tableExport) {
  invariant(
    ["contentTypes", "contentEntries", "customScreens"].includes(tableExport),
    "entity provenance table is not registered"
  );
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-uuid-input-v1") +
    `
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { ${tableExport} } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 1) throw new Error("wf540_input");
const [id] = input.identifier;
const rows = await db.select({ id: ${tableExport}.id }).from(${tableExport}).where(eq(${tableExport}.id,id)).limit(2);
if (rows.length !== 1) throw new Error("wf540_entity_provenance");
const output = { present: true };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE = entityIdProvenanceBridgeSource("contentTypes");
const CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE = entityIdProvenanceBridgeSource("contentEntries");
const CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE = entityIdProvenanceBridgeSource("customScreens");

function mediaExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "media bridge operation drift");
  const assertion =
    operation === "provenance"
      ? 'if (rows.length !== 1 || rows[0].key !== storageKey || rows[0].url !== "/media/" + storageKey) throw new Error("wf540_media_provenance");'
      : 'if (rows.length !== 0) throw new Error("wf540_media_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-media-input-v1") +
    String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { media } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 2) throw new Error("wf540_input");
const [mediaId,storageKey] = input.identifier;
const rows = await db.select({ id:media.id,key:media.key,url:media.url }).from(media).where(eq(media.id,mediaId)).limit(2);
const stage = ` +
    JSON.stringify(operation) +
    String.raw`;
` +
    assertion +
    String.raw`
const output = { absent: rows.length === 0, present: rows.length === 1, stage };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const MEDIA_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [operation, mediaExactBridgeSource(operation)])
  )
);

export {
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
  USER_EXACT_BRIDGE_SOURCES,
  USER_SETTING_EXACT_BRIDGE_SOURCES,
  assertSeoEntryDocumentExactBridgeSourcesFailClosed,
};
