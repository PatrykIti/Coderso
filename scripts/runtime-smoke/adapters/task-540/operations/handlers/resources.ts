import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
} from "../../../../workers/contracts";
import {
  task540HandlerArtifactSha256,
  type Task540InputFor,
  type Task540TypedHandler,
} from "../contracts";

export async function handleResourceAuditLogAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { auditLogs } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const before = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(2);
  if (after.length !== 0) throw new Error("wf540_terminal_absence");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceAuditLogDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { auditLogs } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const before = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(2);
  const affected = (
    await db.delete(auditLogs).where(eq(auditLogs.id, id)).returning({ id: auditLogs.id })
  ).length;
  const after = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_terminal_delete");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceAuditLogProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { auditLogs } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const before = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(2);
  if (before.length !== 1) throw new Error("wf540_terminal_provenance");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceContentEntryProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentEntries } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const rows = await db
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(eq(contentEntries.id, id))
    .limit(2);
  if (rows.length !== 1) throw new Error("wf540_entity_provenance");
  const output = { present: true };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceContentTypeProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { contentTypes } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const rows = await db
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(eq(contentTypes.id, id))
    .limit(2);
  if (rows.length !== 1) throw new Error("wf540_entity_provenance");
  const output = { present: true };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceCustomScreenProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { customScreens } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const rows = await db
    .select({ id: customScreens.id })
    .from(customScreens)
    .where(eq(customScreens.id, id))
    .limit(2);
  if (rows.length !== 1) throw new Error("wf540_entity_provenance");
  const output = { present: true };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceMediaAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-media-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { media } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 2
  )
    throw new Error("wf540_input");
  const [mediaId, storageKey] = input.identifier;
  const rows = await db
    .select({ id: media.id, key: media.key, url: media.url })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(2);
  const stage = "absence";
  if (rows.length !== 0) throw new Error("wf540_media_absence");
  const output = { absent: true, present: false, stage };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceMediaDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-media-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { media } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 2
  )
    throw new Error("wf540_input");
  const [mediaId, storageKey] = input.identifier;
  const rows = await db
    .select({ id: media.id, key: media.key, url: media.url })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(2);
  const stage = "delete";
  if (rows.length !== 0) throw new Error("wf540_media_absence");
  const output = { absent: true, present: false, stage };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceMediaProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-media-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { media } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 2
  )
    throw new Error("wf540_input");
  const [mediaId, storageKey] = input.identifier;
  const rows = await db
    .select({ id: media.id, key: media.key, url: media.url })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(2);
  const stage = "provenance";
  if (rows.length !== 1 || rows[0].key !== storageKey || rows[0].url !== "/media/" + storageKey)
    throw new Error("wf540_media_provenance");
  const output = { absent: false, present: true, stage };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceOverrideAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-override-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { customScreenEntryPresentationOverrides } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 4
  )
    throw new Error("wf540_input");
  const [screenId, entryId, blockId, propPath] = input.identifier;
  const predicate = and(
    eq(customScreenEntryPresentationOverrides.screenId, screenId),
    eq(customScreenEntryPresentationOverrides.entryId, entryId),
    eq(customScreenEntryPresentationOverrides.blockId, blockId),
    eq(customScreenEntryPresentationOverrides.propPath, propPath)
  );
  const before = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  if (after.length !== 0) throw new Error("wf540_override_absence");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceOverrideDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-override-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { customScreenEntryPresentationOverrides } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 4
  )
    throw new Error("wf540_input");
  const [screenId, entryId, blockId, propPath] = input.identifier;
  const predicate = and(
    eq(customScreenEntryPresentationOverrides.screenId, screenId),
    eq(customScreenEntryPresentationOverrides.entryId, entryId),
    eq(customScreenEntryPresentationOverrides.blockId, blockId),
    eq(customScreenEntryPresentationOverrides.propPath, propPath)
  );
  const before = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  const affected = (
    await db
      .delete(customScreenEntryPresentationOverrides)
      .where(predicate)
      .returning({ screenId: customScreenEntryPresentationOverrides.screenId })
  ).length;
  const after = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_override_delete");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceOverrideProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-override-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { customScreenEntryPresentationOverrides } =
    await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 4
  )
    throw new Error("wf540_input");
  const [screenId, entryId, blockId, propPath] = input.identifier;
  const predicate = and(
    eq(customScreenEntryPresentationOverrides.screenId, screenId),
    eq(customScreenEntryPresentationOverrides.entryId, entryId),
    eq(customScreenEntryPresentationOverrides.blockId, blockId),
    eq(customScreenEntryPresentationOverrides.propPath, propPath)
  );
  const before = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  if (before.length !== 1) throw new Error("wf540_override_provenance");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSeoAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-seo-entry-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { seoDocuments } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 3
  )
    throw new Error("wf540_input");
  const [id, targetType, targetId] = input.identifier;
  if (targetType !== "entry") throw new Error("wf540_target_type");
  const predicate = and(
    eq(seoDocuments.id, id),
    eq(seoDocuments.targetType, targetType),
    eq(seoDocuments.targetId, targetId)
  );
  const before = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(predicate)
    .limit(2);
  const affected = 0;
  const after = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(predicate)
    .limit(2);
  if (after.length !== 0) throw new Error("wf540_seo_absence");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSeoDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-seo-entry-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { seoDocuments } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 3
  )
    throw new Error("wf540_input");
  const [id, targetType, targetId] = input.identifier;
  if (targetType !== "entry") throw new Error("wf540_target_type");
  const predicate = and(
    eq(seoDocuments.id, id),
    eq(seoDocuments.targetType, targetType),
    eq(seoDocuments.targetId, targetId)
  );
  const before = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(predicate)
    .limit(2);
  const affected = (
    await db.delete(seoDocuments).where(predicate).returning({ id: seoDocuments.id })
  ).length;
  const after = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(predicate)
    .limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_seo_delete");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSeoProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-seo-entry-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { seoDocuments } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 3
  )
    throw new Error("wf540_input");
  const [id, targetType, targetId] = input.identifier;
  if (targetType !== "entry") throw new Error("wf540_target_type");
  const predicate = and(
    eq(seoDocuments.id, id),
    eq(seoDocuments.targetType, targetType),
    eq(seoDocuments.targetId, targetId)
  );
  const before = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(predicate)
    .limit(2);
  const affected = 0;
  const after = await db
    .select({
      id: seoDocuments.id,
      targetId: seoDocuments.targetId,
      targetType: seoDocuments.targetType,
    })
    .from(seoDocuments)
    .where(predicate)
    .limit(2);
  if (before.length !== 1) throw new Error("wf540_seo_provenance");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSessionAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { sessions } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const before = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(2);
  if (after.length !== 0) throw new Error("wf540_terminal_absence");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSessionDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { sessions } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const before = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(2);
  const affected = (
    await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id })
  ).length;
  const after = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_terminal_delete");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSessionProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { sessions } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [id] = input.identifier;
  const before = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(2);
  if (before.length !== 1) throw new Error("wf540_terminal_provenance");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSettingAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-setting-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { userSettings } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 2
  )
    throw new Error("wf540_input");
  const [userId, key] = input.identifier;
  const predicate = and(eq(userSettings.userId, userId), eq(userSettings.key, key));
  const before = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(predicate)
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(predicate)
    .limit(2);
  if (after.length !== 0) throw new Error("wf540_setting_absence");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSettingDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-setting-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { userSettings } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 2
  )
    throw new Error("wf540_input");
  const [userId, key] = input.identifier;
  const predicate = and(eq(userSettings.userId, userId), eq(userSettings.key, key));
  const before = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(predicate)
    .limit(2);
  const affected = (
    await db.delete(userSettings).where(predicate).returning({ userId: userSettings.userId })
  ).length;
  const after = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(predicate)
    .limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_setting_delete");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceSettingProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-setting-input-v1">;

  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { userSettings } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 2
  )
    throw new Error("wf540_input");
  const [userId, key] = input.identifier;
  const predicate = and(eq(userSettings.userId, userId), eq(userSettings.key, key));
  const before = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(predicate)
    .limit(2);
  const affected = 0;
  const after = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(predicate)
    .limit(2);
  if (before.length !== 1) throw new Error("wf540_setting_provenance");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceTaskTrafficSnapshot(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-agents-input-v1">;

  const { inArray, sql } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { accessLogs, auditLogs, sessions } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "userAgents" ||
    !Array.isArray(input.userAgents) ||
    input.userAgents.length !== 4 ||
    new Set(input.userAgents).size !== 4
  )
    throw new Error("wf540_input");
  const auditRows = await db
    .select({ id: auditLogs.id, actorId: auditLogs.actorId, metadata: auditLogs.metadata })
    .from(auditLogs)
    .where(inArray(sql.raw("metadata->>'userAgent'"), input.userAgents))
    .orderBy(auditLogs.id)
    .limit(4097);
  const access = await db
    .select({
      id: accessLogs.id,
      sessionId: accessLogs.sessionId,
      userId: accessLogs.userId,
      userAgent: accessLogs.userAgent,
    })
    .from(accessLogs)
    .where(inArray(accessLogs.userAgent, input.userAgents))
    .orderBy(accessLogs.id)
    .limit(4097);
  const session = await db
    .select({ id: sessions.id, userId: sessions.userId, userAgent: sessions.userAgent })
    .from(sessions)
    .where(inArray(sessions.userAgent, input.userAgents))
    .orderBy(sessions.id)
    .limit(4097);
  const completeSession = await db
    .select({ id: sessions.id, userId: sessions.userId, userAgent: sessions.userAgent })
    .from(sessions)
    .orderBy(sessions.id)
    .limit(4097);
  if ([auditRows, access, session, completeSession].some((rows) => rows.length > 4096))
    throw new Error("wf540_task_traffic_overflow");
  const audit = auditRows.map(({ id, actorId, metadata }) => {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
      throw new Error("wf540_task_audit_projection");
    const userAgent = (metadata as Readonly<Record<string, unknown>>).userAgent;
    if (typeof userAgent !== "string" || !input.userAgents.includes(userAgent))
      throw new Error("wf540_task_audit_projection");
    return { id, actorId, userAgent };
  });
  const output = { access, audit, completeSession, session };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceUserAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { users } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [userId] = input.identifier;
  const before = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(2);
  const affected = 0;
  const after = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(2);
  if (after.length !== 0) throw new Error("wf540_user_absence");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceUserDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { users } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [userId] = input.identifier;
  const before = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(2);
  const affected = (await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id }))
    .length;
  const after = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(2);
  if (affected !== 1 || after.length !== 0) throw new Error("wf540_user_delete");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export async function handleResourceUserProvenance(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"identifier-uuid-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { users } = await import("../../../../../../core/db/schema");
  if (
    Object.keys(input).join(",") !== "identifier" ||
    !Array.isArray(input.identifier) ||
    input.identifier.length !== 1
  )
    throw new Error("wf540_input");
  const [userId] = input.identifier;
  const before = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(2);
  const affected = 0;
  const after = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(2);
  if (before.length !== 1) throw new Error("wf540_user_provenance");
  const output = { absent: after.length === 0, affected, present: before.length === 1 };
  return output as unknown as PlainJsonValue;
}

export const TASK540_RESOURCE_HANDLERS: readonly Task540TypedHandler[] = Object.freeze([
  Object.freeze({
    handlerId: "source/resource/audit-log/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/audit-log/absence"),
    execute: handleResourceAuditLogAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/audit-log/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/audit-log/delete"),
    execute: handleResourceAuditLogDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/audit-log/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/audit-log/provenance"),
    execute: handleResourceAuditLogProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/content-entry-provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/content-entry-provenance"),
    execute: handleResourceContentEntryProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/content-type-provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/content-type-provenance"),
    execute: handleResourceContentTypeProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/custom-screen-provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/custom-screen-provenance"),
    execute: handleResourceCustomScreenProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/media/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/media/absence"),
    execute: handleResourceMediaAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/media/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/media/delete"),
    execute: handleResourceMediaDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/media/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/media/provenance"),
    execute: handleResourceMediaProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/override/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/override/absence"),
    execute: handleResourceOverrideAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/override/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/override/delete"),
    execute: handleResourceOverrideDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/override/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/override/provenance"),
    execute: handleResourceOverrideProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/seo/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/seo/absence"),
    execute: handleResourceSeoAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/seo/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/seo/delete"),
    execute: handleResourceSeoDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/seo/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/seo/provenance"),
    execute: handleResourceSeoProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/session/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/session/absence"),
    execute: handleResourceSessionAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/session/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/session/delete"),
    execute: handleResourceSessionDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/session/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/session/provenance"),
    execute: handleResourceSessionProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/setting/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/setting/absence"),
    execute: handleResourceSettingAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/setting/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/setting/delete"),
    execute: handleResourceSettingDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/setting/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/setting/provenance"),
    execute: handleResourceSettingProvenance,
  }),
  Object.freeze({
    handlerId: "source/resource/task-traffic-snapshot",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/task-traffic-snapshot"),
    execute: handleResourceTaskTrafficSnapshot,
  }),
  Object.freeze({
    handlerId: "source/resource/user/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/user/absence"),
    execute: handleResourceUserAbsence,
  }),
  Object.freeze({
    handlerId: "source/resource/user/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/user/delete"),
    execute: handleResourceUserDelete,
  }),
  Object.freeze({
    handlerId: "source/resource/user/provenance",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/resource/user/provenance"),
    execute: handleResourceUserProvenance,
  }),
]);
