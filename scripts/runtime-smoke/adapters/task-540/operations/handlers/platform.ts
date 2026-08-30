import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
} from "../../../../workers/contracts";
import {
  canonicalTask540Json as canonical,
  task540HandlerArtifactSha256,
  type Task540InputFor,
  type Task540TypedHandler,
} from "../contracts";

export async function handlePlatformContentRoutesExact(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"empty-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { settings } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).length !== 0) throw new Error("wf540_input");
  const rows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, "site.contentRoutes"))
    .limit(2);
  if (rows.length > 1) throw new Error("wf540_content_routes_cardinality");
  const [row] = rows;
  const output = row
    ? { exists: true, value: row.value, updatedAt: row.updatedAt.toISOString() }
    : { exists: false, value: null, updatedAt: null };
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformCurrentResourceOwner(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"resource-owner-input-v2">;

  const { and, eq, inArray } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentEntries, customScreenEntryPresentationOverrides, media } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !== "entryIds,mediaId,override,overrideExpectedPresent" ||
    !Array.isArray(input.entryIds) ||
    input.entryIds.length !== 6 ||
    new Set(input.entryIds).size !== 6 ||
    Object.keys(input.override).sort().join(",") !== "blockId,entryId,propPath,screenId" ||
    typeof input.overrideExpectedPresent !== "boolean"
  )
    throw new Error("wf540_input");
  const entries = (
    await db
      .select({ id: contentEntries.id, ownerSubjectIdentifier: contentEntries.authorId })
      .from(contentEntries)
      .where(inArray(contentEntries.id, input.entryIds))
      .limit(7)
  ).sort((a, b) => a.id.localeCompare(b.id));
  const mediaRows = await db
    .select({ id: media.id, ownerSubjectIdentifier: media.createdBy })
    .from(media)
    .where(eq(media.id, input.mediaId))
    .limit(2);
  const overrideRows = await db
    .select({ ownerSubjectIdentifier: customScreenEntryPresentationOverrides.updatedBy })
    .from(customScreenEntryPresentationOverrides)
    .where(
      and(
        eq(customScreenEntryPresentationOverrides.screenId, input.override.screenId),
        eq(customScreenEntryPresentationOverrides.entryId, input.override.entryId),
        eq(customScreenEntryPresentationOverrides.blockId, input.override.blockId),
        eq(customScreenEntryPresentationOverrides.propPath, input.override.propPath)
      )
    )
    .limit(2);
  if (
    entries.length !== 6 ||
    mediaRows.length !== 1 ||
    (input.overrideExpectedPresent ? overrideRows.length !== 1 : overrideRows.length !== 0)
  )
    throw new Error("wf540_owner_rows");
  const [mediaRow] = mediaRows;
  const override = overrideRows[0] ?? null;
  const output = { entries, media: mediaRow, override, overrideAbsent: override === null };
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformMissingMediaDbAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"media-id-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { media } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).join(",") !== "mediaId" || !/^[0-9a-f-]{36}$/.test(input.mediaId))
    throw new Error("wf540_input");
  const rows = await db
    .select({ id: media.id })
    .from(media)
    .where(eq(media.id, input.mediaId))
    .limit(2);
  const output = { rowCount: rows.length };
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformScreenMaterialize(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"screen-materialize-input-v1">;

  const {
    buildDefaultListViewDefinition,
    normalizeCustomScreenDefinitionForWrite,
    customScreenCreateSchema,
  } = await import("../../../../../../core/services/customScreens/customScreenSchemas");
  const { validate } = await import("../../../../../../core/server/validation/schemaValidator");
  if (
    Object.keys(input).sort().join(",") !==
    "bodyWithoutDefinition,contentType,definitionWithoutListView"
  )
    throw new Error("wf540_input");
  const definition = {
    ...input.definitionWithoutListView,
    listView: buildDefaultListViewDefinition(input.contentType),
  };
  const normalized = normalizeCustomScreenDefinitionForWrite(
    { definition },
    { contentType: input.contentType }
  );
  if (canonical(normalized) !== canonical(definition)) throw new Error("wf540_normalizer_delta");
  const output = { ...input.bodyWithoutDefinition, schemaVersion: 4, definition };
  validate(customScreenCreateSchema, output);
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformSecurityRate(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"empty-input-v1">;

  const { getSecuritySettings } =
    await import("../../../../../../core/services/settings/securitySettings");
  if (Object.keys(input).length !== 0) throw new Error("wf540_input");
  const value = await getSecuritySettings();
  const output = {
    enabled: value.rateLimit.enabled,
    maxRequests: value.rateLimit.buckets.auth.maxRequests,
    windowSeconds: value.rateLimit.buckets.auth.windowSeconds,
  };
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformSecuritySession(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"empty-input-v1">;

  const { getSecuritySettings } =
    await import("../../../../../../core/services/settings/securitySettings");
  if (Object.keys(input).length !== 0) throw new Error("wf540_input");
  const value = await getSecuritySettings();
  const output = {
    csrfHeaderName: value.csrf.headerName.toLowerCase(),
    effectiveMaxPerUserAtLeast2: value.session.maxPerUser >= 2,
    singleSession: value.session.singleSession,
  };
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformSeoEntryDiscovery(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"seo-entry-targets-input-v1">;

  const { and, eq, inArray } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { seoDocuments } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "targetIds" ||
    !Array.isArray(input.targetIds) ||
    input.targetIds.length !== 6 ||
    new Set(input.targetIds).size !== 6
  )
    throw new Error("wf540_input");
  const candidates = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(
      and(eq(seoDocuments.targetType, "entry"), inArray(seoDocuments.targetId, input.targetIds))
    )
    .orderBy(seoDocuments.targetId, seoDocuments.id)
    .limit(7);
  const output = { candidates };
  return output as unknown as PlainJsonValue;
}

export async function handlePlatformStoragePreflight(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-agents-input-v1">;

  const { default: path } = await import("node:path");
  const { eq, inArray, or, sql } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { accessLogs, auditLogs, roles, sessions, settings, userRoles, users } =
    await import("../../../../../../core/db/schema");
  const { getStorageSettingsInternal } =
    await import("../../../../../../core/services/settings/storageSettings");
  const { decryptEmail, hashEmail, isEncryptedEmail, normalizeEmail } =
    await import("../../../../../../core/services/security/piiEmail");
  if (
    Object.keys(input).join(",") !== "userAgents" ||
    !Array.isArray(input.userAgents) ||
    input.userAgents.length !== 4 ||
    new Set(input.userAgents).size !== 4
  )
    throw new Error("wf540_input");
  const setupRows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, "setup.completed"))
    .limit(2);
  const driverRows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, "storage.driver"))
    .limit(2);
  const localDirRows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, "storage.local.dir"))
    .limit(2);
  if (
    setupRows.length !== 1 ||
    setupRows[0].value !== true ||
    driverRows.length !== 1 ||
    driverRows[0].value !== "local" ||
    localDirRows.length !== 1 ||
    typeof localDirRows[0].value !== "string" ||
    localDirRows[0].value.length === 0 ||
    Object.hasOwn(process.env, "MEDIA_STORAGE") ||
    Object.hasOwn(process.env, "MEDIA_DIR")
  )
    throw new Error("wf540_preflight");
  const storage = await getStorageSettingsInternal();
  if (storage.driver !== driverRows[0].value || storage.localDir !== localDirRows[0].value)
    throw new Error("wf540_preflight");
  const storageRoot = path.resolve(process.cwd(), localDirRows[0].value);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail === undefined) throw new Error("wf540_admin_email_absent");
  const normalizedEmail = normalizeEmail(adminEmail);
  const bootstrapEmailHash = hashEmail(normalizedEmail);
  const bootstrapRows = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.emailHash, bootstrapEmailHash),
        inArray(users.email, [bootstrapEmailHash, normalizedEmail])
      )
    )
    .limit(2);
  if (bootstrapRows.length !== 1) throw new Error("wf540_bootstrap_cardinality");
  const bootstrap = bootstrapRows[0];
  if (
    bootstrap.status !== "active" ||
    bootstrap.emailHash !== bootstrapEmailHash ||
    bootstrap.email !== bootstrapEmailHash ||
    !isEncryptedEmail(bootstrap.emailEncrypted) ||
    decryptEmail(bootstrap.emailEncrypted) !== normalizedEmail
  )
    throw new Error("wf540_bootstrap_canonical_identity");
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
    .where(eq(userRoles.userId, bootstrap.id))
    .limit(2);
  if (roleRows.length !== 1) throw new Error("wf540_bootstrap_role_cardinality");
  const normalizedPermissions = Array.isArray(roleRows[0].rolePermissions)
    ? [...new Set(roleRows[0].rolePermissions)].sort()
    : [];
  if (roleRows[0].roleName !== "admin" || canonical(normalizedPermissions) !== canonical(["*"]))
    throw new Error("wf540_bootstrap_role");
  const contentRouteRows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "site.contentRoutes"))
    .limit(2);
  if (contentRouteRows.length > 1) throw new Error("wf540_content_routes_cardinality");
  const contentRoutes = contentRouteRows[0];
  const auditRows = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(inArray(sql.raw("metadata->>'userAgent'"), input.userAgents))
    .orderBy(auditLogs.id)
    .limit(4097);
  const accessRows = await db
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(inArray(accessLogs.userAgent, input.userAgents))
    .orderBy(accessLogs.id)
    .limit(4097);
  const sessionRows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(inArray(sessions.userAgent, input.userAgents))
    .orderBy(sessions.id)
    .limit(4097);
  if (auditRows.length > 4096 || accessRows.length > 4096 || sessionRows.length > 4096)
    throw new Error("wf540_task_traffic_baseline_overflow");
  const rawUserRow = {
    id: bootstrap.id,
    email: bootstrap.email,
    emailHash: bootstrap.emailHash,
    emailEncrypted: bootstrap.emailEncrypted,
    passwordHash: bootstrap.passwordHash,
    name: bootstrap.name,
    status: bootstrap.status,
    createdAt: bootstrap.createdAt.toISOString(),
    updatedAt: bootstrap.updatedAt.toISOString(),
    lastLoginAt: bootstrap.lastLoginAt?.toISOString() ?? null,
  };
  const roleTuples = roleRows
    .map((row) => ({
      userId: row.userId,
      roleId: row.roleId,
      roleName: row.roleName,
      roleDescription: row.roleDescription,
      rolePermissions: row.rolePermissions,
      roleCreatedAt: row.roleCreatedAt.toISOString(),
    }))
    .sort((a, b) => a.roleId.localeCompare(b.roleId));
  const output = {
    bootstrap: {
      id: bootstrap.id,
      lastLoginAt: rawUserRow.lastLoginAt,
      updatedAt: rawUserRow.updatedAt,
      normalizedEmailProof: true,
      emailHashProof: true,
      encryptedEmailProof: true,
      decryptEmailProof: true,
      rawUserRow,
      roleTuples,
    },
    contentRoutes: contentRoutes
      ? {
          exists: true,
          value: contentRoutes.value,
          updatedAt: contentRoutes.updatedAt.toISOString(),
        }
      : { exists: false, value: null, updatedAt: null },
    local: true,
    requiredSettings: {
      setup: { ...setupRows[0], updatedAt: setupRows[0].updatedAt.toISOString() },
      driver: { ...driverRows[0], updatedAt: driverRows[0].updatedAt.toISOString() },
      localDir: { ...localDirRows[0], updatedAt: localDirRows[0].updatedAt.toISOString() },
    },
    setupComplete: true,
    storageRoot,
    taskTrafficBaseline: {
      auditIds: auditRows.map((row) => row.id),
      accessIds: accessRows.map((row) => row.id),
      sessionIds: sessionRows.map((row) => row.id),
    },
  };
  return output as unknown as PlainJsonValue;
}

export const TASK540_PLATFORM_HANDLERS: readonly Task540TypedHandler[] = Object.freeze([
  Object.freeze({
    handlerId: "source/platform/content-routes-exact",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/content-routes-exact"),
    execute: handlePlatformContentRoutesExact,
  }),
  Object.freeze({
    handlerId: "source/platform/current-resource-owner",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/current-resource-owner"),
    execute: handlePlatformCurrentResourceOwner,
  }),
  Object.freeze({
    handlerId: "source/platform/missing-media-db-absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/missing-media-db-absence"),
    execute: handlePlatformMissingMediaDbAbsence,
  }),
  Object.freeze({
    handlerId: "source/platform/screen-materialize",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/screen-materialize"),
    execute: handlePlatformScreenMaterialize,
  }),
  Object.freeze({
    handlerId: "source/platform/security-rate",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/security-rate"),
    execute: handlePlatformSecurityRate,
  }),
  Object.freeze({
    handlerId: "source/platform/security-session",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/security-session"),
    execute: handlePlatformSecuritySession,
  }),
  Object.freeze({
    handlerId: "source/platform/seo-entry-discovery",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/seo-entry-discovery"),
    execute: handlePlatformSeoEntryDiscovery,
  }),
  Object.freeze({
    handlerId: "source/platform/storage-preflight",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/platform/storage-preflight"),
    execute: handlePlatformStoragePreflight,
  }),
]);
