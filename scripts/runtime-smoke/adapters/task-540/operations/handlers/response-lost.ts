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

export async function handleResponseLostContentType(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"slug-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentTypes } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).join(",") !== "slug" || typeof input.slug !== "string")
    throw new Error("wf540_input");
  const rows = await db
    .select({
      id: contentTypes.id,
      name: contentTypes.name,
      slug: contentTypes.slug,
      schema: contentTypes.schema,
      status: contentTypes.status,
      config: contentTypes.config,
    })
    .from(contentTypes)
    .where(eq(contentTypes.slug, input.slug))
    .limit(65);
  const output = {
    candidates: rows.slice(0, 64).sort((a, b) => a.id.localeCompare(b.id)),
    overflow: rows.length > 64,
  };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostEntry(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"entry-discovery-input-v1">;

  const { and, eq, isNull } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentEntries } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !== "slug,typeId" ||
    typeof input.slug !== "string" ||
    typeof input.typeId !== "string"
  )
    throw new Error("wf540_input");
  const rows = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      accessPasswordAbsent: isNull(contentEntries.accessPassword),
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
    })
    .from(contentEntries)
    .where(and(eq(contentEntries.typeId, input.typeId), eq(contentEntries.slug, input.slug)))
    .limit(65);
  const output = {
    candidates: rows
      .slice(0, 64)
      .map((row) => ({
        ...row,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        scheduledAt: row.scheduledAt?.toISOString() ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    overflow: rows.length > 64,
  };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostEntryPreflight(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"entry-preflight-input-v1">;

  const { and, eq, isNull } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentEntries, contentTypes } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).sort().join(",") !== "entrySlug,typeSlug") throw new Error("wf540_input");
  const rows = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      accessPasswordAbsent: isNull(contentEntries.accessPassword),
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
    })
    .from(contentEntries)
    .innerJoin(contentTypes, eq(contentTypes.id, contentEntries.typeId))
    .where(and(eq(contentTypes.slug, input.typeSlug), eq(contentEntries.slug, input.entrySlug)))
    .limit(65);
  const output = {
    candidates: rows
      .slice(0, 64)
      .map((row) => ({
        ...row,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        scheduledAt: row.scheduledAt?.toISOString() ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    overflow: rows.length > 64,
  };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostMedia(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"media-natural-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { media } = await import("../../../../../../core/db/schema");
  const { assertCanonicalStorageKey } =
    await import("../../../../../../core/services/media/storage/adapter");
  if (
    Object.keys(input).sort().join(",") !== "mimeType,originalName,size" ||
    typeof input.originalName !== "string" ||
    typeof input.mimeType !== "string" ||
    !Number.isSafeInteger(input.size)
  )
    throw new Error("wf540_input");
  const rows = await db
    .select({
      id: media.id,
      key: media.key,
      url: media.url,
      originalName: media.originalName,
      type: media.type,
      mimeType: media.mimeType,
      size: media.size,
      width: media.width,
      height: media.height,
      alt: media.alt,
      title: media.title,
      caption: media.caption,
      folderId: media.folderId,
      tags: media.tags,
      focalX: media.focalX,
      focalY: media.focalY,
      description: media.description,
      credit: media.credit,
      createdBy: media.createdBy,
    })
    .from(media)
    .where(
      and(
        eq(media.originalName, input.originalName),
        eq(media.mimeType, input.mimeType),
        eq(media.size, input.size)
      )
    )
    .limit(65);
  const candidates = rows.slice(0, 64);
  for (const candidate of candidates) {
    assertCanonicalStorageKey(candidate.key);
    if (candidate.url !== "/media/" + candidate.key) throw new Error("wf540_media_url");
  }
  const output = {
    candidates: candidates.sort((a, b) => a.id.localeCompare(b.id)),
    overflow: rows.length > 64,
  };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostOverride(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"override-discovery-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { customScreenEntryPresentationOverrides } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !== "blockId,entryId,propPath,screenId" ||
    input.propPath !== "mediaAssetId"
  )
    throw new Error("wf540_input");
  const rows = await db
    .select({
      screenId: customScreenEntryPresentationOverrides.screenId,
      entryId: customScreenEntryPresentationOverrides.entryId,
      blockId: customScreenEntryPresentationOverrides.blockId,
      propPath: customScreenEntryPresentationOverrides.propPath,
      value: customScreenEntryPresentationOverrides.value,
      updatedBy: customScreenEntryPresentationOverrides.updatedBy,
    })
    .from(customScreenEntryPresentationOverrides)
    .where(
      and(
        eq(customScreenEntryPresentationOverrides.screenId, input.screenId),
        eq(customScreenEntryPresentationOverrides.entryId, input.entryId),
        eq(customScreenEntryPresentationOverrides.blockId, input.blockId),
        eq(customScreenEntryPresentationOverrides.propPath, input.propPath)
      )
    )
    .limit(65);
  const output = { candidates: rows.slice(0, 64), overflow: rows.length > 64 };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostOverridePreflight(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"override-preflight-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentEntries, contentTypes, customScreenEntryPresentationOverrides, customScreens } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !==
      "blockId,contentTypeSlug,entrySlug,propPath,screenName" ||
    input.propPath !== "mediaAssetId"
  )
    throw new Error("wf540_input");
  const rows = await db
    .select({
      screenId: customScreenEntryPresentationOverrides.screenId,
      entryId: customScreenEntryPresentationOverrides.entryId,
      blockId: customScreenEntryPresentationOverrides.blockId,
      propPath: customScreenEntryPresentationOverrides.propPath,
      value: customScreenEntryPresentationOverrides.value,
      updatedBy: customScreenEntryPresentationOverrides.updatedBy,
    })
    .from(customScreenEntryPresentationOverrides)
    .innerJoin(customScreens, eq(customScreens.id, customScreenEntryPresentationOverrides.screenId))
    .innerJoin(
      contentEntries,
      eq(contentEntries.id, customScreenEntryPresentationOverrides.entryId)
    )
    .innerJoin(contentTypes, eq(contentTypes.id, contentEntries.typeId))
    .where(
      and(
        eq(customScreens.name, input.screenName),
        eq(contentTypes.slug, input.contentTypeSlug),
        eq(contentEntries.slug, input.entrySlug),
        eq(customScreenEntryPresentationOverrides.blockId, input.blockId),
        eq(customScreenEntryPresentationOverrides.propPath, input.propPath)
      )
    )
    .limit(65);
  const output = { candidates: rows.slice(0, 64), overflow: rows.length > 64 };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostScreen(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"screen-discovery-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { customScreens } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).sort().join(",") !== "contentTypeId,name" ||
    typeof input.contentTypeId !== "string" ||
    typeof input.name !== "string"
  )
    throw new Error("wf540_input");
  const rows = await db
    .select({
      id: customScreens.id,
      name: customScreens.name,
      contentTypeId: customScreens.contentTypeId,
      status: customScreens.status,
      collectionRole: customScreens.collectionRole,
      compositionKey: customScreens.compositionKey,
      showInSidebar: customScreens.showInSidebar,
      sidebarLabel: customScreens.sidebarLabel,
      schemaVersion: customScreens.schemaVersion,
      definition: customScreens.definition,
    })
    .from(customScreens)
    .where(
      and(eq(customScreens.name, input.name), eq(customScreens.contentTypeId, input.contentTypeId))
    )
    .limit(65);
  const output = {
    candidates: rows.slice(0, 64).sort((a, b) => a.id.localeCompare(b.id)),
    overflow: rows.length > 64,
  };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostScreenPreflight(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"screen-preflight-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentTypes, customScreens } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).sort().join(",") !== "contentTypeSlug,name")
    throw new Error("wf540_input");
  const rows = await db
    .select({
      id: customScreens.id,
      name: customScreens.name,
      contentTypeId: customScreens.contentTypeId,
      status: customScreens.status,
      collectionRole: customScreens.collectionRole,
      compositionKey: customScreens.compositionKey,
      showInSidebar: customScreens.showInSidebar,
      sidebarLabel: customScreens.sidebarLabel,
      schemaVersion: customScreens.schemaVersion,
      definition: customScreens.definition,
    })
    .from(customScreens)
    .innerJoin(contentTypes, eq(contentTypes.id, customScreens.contentTypeId))
    .where(and(eq(customScreens.name, input.name), eq(contentTypes.slug, input.contentTypeSlug)))
    .limit(65);
  const output = {
    candidates: rows.slice(0, 64).sort((a, b) => a.id.localeCompare(b.id)),
    overflow: rows.length > 64,
  };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostSetting(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-id-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { userSettings } = await import("../../../../../../core/db/schema");
  if (Object.keys(input).join(",") !== "userId" || typeof input.userId !== "string")
    throw new Error("wf540_input");
  const key = "customScreens.entry.preferences";
  const rows = await db
    .select({ userId: userSettings.userId, key: userSettings.key, value: userSettings.value })
    .from(userSettings)
    .where(and(eq(userSettings.userId, input.userId), eq(userSettings.key, key)))
    .limit(65);
  const output = { candidates: rows.slice(0, 64), overflow: rows.length > 64 };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostSettingPreflight(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"email-input-v1">;

  const { and, eq, or } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { userSettings, users } = await import("../../../../../../core/db/schema");
  const { hashEmail, normalizeEmail } =
    await import("../../../../../../core/services/security/piiEmail");
  if (Object.keys(input).join(",") !== "email") throw new Error("wf540_input");
  const email = normalizeEmail(input.email);
  const key = "customScreens.entry.preferences";
  const rows = await db
    .select({ userId: userSettings.userId, key: userSettings.key, value: userSettings.value })
    .from(userSettings)
    .innerJoin(users, eq(users.id, userSettings.userId))
    .where(
      and(
        or(eq(users.emailHash, hashEmail(email)), eq(users.email, email)),
        eq(userSettings.key, key)
      )
    )
    .limit(65);
  const output = { candidates: rows.slice(0, 64), overflow: rows.length > 64 };
  return output as unknown as PlainJsonValue;
}

export async function handleResponseLostUser(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"email-input-v1">;

  const { eq, or } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { roles, userRoles, users } = await import("../../../../../../core/db/schema");
  const { hashEmail, normalizeEmail, resolveEmailValue } =
    await import("../../../../../../core/services/security/piiEmail");
  if (Object.keys(input).join(",") !== "email" || typeof input.email !== "string")
    throw new Error("wf540_input");
  const normalizedEmail = normalizeEmail(input.email);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      emailEncrypted: users.emailEncrypted,
      name: users.name,
      status: users.status,
      passwordHash: users.passwordHash,
      roleId: userRoles.roleId,
      roleName: roles.name,
      rolePermissions: roles.permissions,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(or(eq(users.emailHash, hashEmail(normalizedEmail)), eq(users.email, normalizedEmail)))
    .limit(65);
  const overflow = rows.length > 64;
  const byId = new Map();
  for (const row of rows.slice(0, 64)) {
    let candidate = byId.get(row.id);
    if (!candidate) {
      candidate = {
        id: row.id,
        normalizedEmailMatches: normalizeEmail(resolveEmailValue(row) ?? "") === normalizedEmail,
        name: row.name,
        status: row.status,
        passwordHashPresent: typeof row.passwordHash === "string" && row.passwordHash.length > 0,
        adminWildcardPermissionCount: 0,
        adminRoleTupleCount: 0,
      };
      byId.set(row.id, candidate);
    }
    if (
      row.roleId &&
      row.roleName === "admin" &&
      canonical(row.rolePermissions) === canonical(["*"])
    ) {
      candidate.adminWildcardPermissionCount += 1;
      candidate.adminRoleTupleCount += 1;
    }
  }
  const output = {
    candidates: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    overflow,
  };
  return output as unknown as PlainJsonValue;
}

export const TASK540_RESPONSE_LOST_HANDLERS: readonly Task540TypedHandler[] = Object.freeze([
  Object.freeze({
    handlerId: "source/response-lost/content-type",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/content-type"),
    execute: handleResponseLostContentType,
  }),
  Object.freeze({
    handlerId: "source/response-lost/entry",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/entry"),
    execute: handleResponseLostEntry,
  }),
  Object.freeze({
    handlerId: "source/response-lost/entry-preflight",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/entry-preflight"),
    execute: handleResponseLostEntryPreflight,
  }),
  Object.freeze({
    handlerId: "source/response-lost/media",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/media"),
    execute: handleResponseLostMedia,
  }),
  Object.freeze({
    handlerId: "source/response-lost/override",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/override"),
    execute: handleResponseLostOverride,
  }),
  Object.freeze({
    handlerId: "source/response-lost/override-preflight",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/override-preflight"),
    execute: handleResponseLostOverridePreflight,
  }),
  Object.freeze({
    handlerId: "source/response-lost/screen",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/screen"),
    execute: handleResponseLostScreen,
  }),
  Object.freeze({
    handlerId: "source/response-lost/screen-preflight",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/screen-preflight"),
    execute: handleResponseLostScreenPreflight,
  }),
  Object.freeze({
    handlerId: "source/response-lost/setting",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/setting"),
    execute: handleResponseLostSetting,
  }),
  Object.freeze({
    handlerId: "source/response-lost/setting-preflight",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/setting-preflight"),
    execute: handleResponseLostSettingPreflight,
  }),
  Object.freeze({
    handlerId: "source/response-lost/user",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/response-lost/user"),
    execute: handleResponseLostUser,
  }),
]);
