import { asc, desc, eq } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import {
  contentEntries,
  contentRevisions,
  contentTermAssignments,
  contentTypes,
  customScreenEntryPresentationOverrides,
} from "../../db/schema";
import { invalidateContentEntryCache } from "../../site/cache/siteCache";
import { validateEntryData, type ContentSchema } from "./validation";

export const ENTRY_FULL_SITE_REVISION_SNAPSHOT_LIMIT = 100;

export type EntryLifecycleRevisionSnapshot = Readonly<{
  id: string;
  version: number;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}>;

export type EntryLifecycleNativeDesired = Readonly<{
  contentTypeId: string;
  authorId: string | null;
  title: string;
  slug: string;
  status: "draft" | "published";
  visibility: "public" | "private";
  tags: readonly string[];
  data: Record<string, unknown>;
  publishedAt: string | null;
  scheduledAt: null;
  revisions: readonly EntryLifecycleRevisionSnapshot[];
}>;

export type EntryLifecycleNativeSnapshot = Readonly<{
  id: string;
  desired: EntryLifecycleNativeDesired;
}>;

export type EntryLifecycleAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: EntryLifecycleNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: EntryLifecycleNativeDesired;
      expectedCurrent: EntryLifecycleNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: EntryLifecycleNativeSnapshot;
      actorId: string;
    }>;

export type EntryLifecycleAtomicMutationResult = Readonly<{
  id: string;
  snapshot: EntryLifecycleNativeSnapshot | null;
}>;

type EntryLifecycleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const desiredKeys = [
  "contentTypeId",
  "authorId",
  "title",
  "slug",
  "status",
  "visibility",
  "tags",
  "data",
  "publishedAt",
  "scheduledAt",
  "revisions",
] as const;

const revisionKeys = ["id", "version", "data", "createdAt", "createdBy"] as const;

const isDirectPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertExactKeys = (value: Record<string, unknown>, keys: readonly string[]): void => {
  const ownKeys = Object.keys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => !keys.includes(key))) {
    throw new Error("content_entry_invalid");
  }
};

const normalizeIsoTimestamp = (value: unknown): string => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("content_entry_invalid");
  }
  return new Date(value).toISOString();
};

const normalizeJsonObject = (value: unknown): Record<string, unknown> => {
  if (!isDirectPlainObject(value)) throw new Error("content_entry_invalid");
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    throw new Error("content_entry_invalid");
  }
};

const normalizeRevision = (value: unknown): EntryLifecycleRevisionSnapshot => {
  if (!isDirectPlainObject(value)) throw new Error("content_entry_invalid");
  assertExactKeys(value, revisionKeys);
  if (
    typeof value.id !== "string" ||
    !value.id ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    (value.createdBy !== null && typeof value.createdBy !== "string")
  ) {
    throw new Error("content_entry_invalid");
  }
  return {
    id: value.id,
    version: value.version as number,
    data: normalizeJsonObject(value.data),
    createdAt: normalizeIsoTimestamp(value.createdAt),
    createdBy: value.createdBy as string | null,
  };
};

export const normalizeEntryLifecycleNativeDesired = (
  value: unknown
): EntryLifecycleNativeDesired => {
  if (!isDirectPlainObject(value)) throw new Error("content_entry_invalid");
  assertExactKeys(value, desiredKeys);
  if (
    typeof value.contentTypeId !== "string" ||
    !value.contentTypeId ||
    (value.authorId !== null && typeof value.authorId !== "string") ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.slug !== "string" ||
    !value.slug.trim() ||
    (value.status !== "draft" && value.status !== "published") ||
    (value.visibility !== "public" && value.visibility !== "private") ||
    !Array.isArray(value.tags) ||
    value.tags.some((tag) => typeof tag !== "string" || !tag.trim()) ||
    value.scheduledAt !== null ||
    !Array.isArray(value.revisions)
  ) {
    throw new Error("content_entry_invalid");
  }
  if (
    (value.status === "draft" && value.publishedAt !== null) ||
    (value.status === "published" && value.publishedAt === null)
  ) {
    throw new Error("content_entry_invalid");
  }
  const revisions = value.revisions
    .map(normalizeRevision)
    .sort((left, right) => right.version - left.version || left.id.localeCompare(right.id));
  if (
    revisions.length > ENTRY_FULL_SITE_REVISION_SNAPSHOT_LIMIT ||
    new Set(revisions.map((revision) => revision.id)).size !== revisions.length ||
    new Set(revisions.map((revision) => revision.version)).size !== revisions.length
  ) {
    throw new Error("entry_revision_snapshot_too_large");
  }
  return {
    contentTypeId: value.contentTypeId,
    authorId: value.authorId as string | null,
    title: value.title.trim(),
    slug: value.slug.trim(),
    status: value.status,
    visibility: value.visibility,
    tags: Object.freeze(value.tags.map((tag) => (tag as string).trim())),
    data: normalizeJsonObject(value.data),
    publishedAt: value.publishedAt === null ? null : normalizeIsoTimestamp(value.publishedAt),
    scheduledAt: null,
    revisions: Object.freeze(revisions),
  };
};

export const prepareEntryLifecycleNativeTargets = (
  input: Readonly<{
    id: string;
    desired: Readonly<{
      contentTypeId: string;
      title: string;
      slug: string;
      status: "draft" | "published";
      data: Record<string, unknown>;
    }>;
    actorId: string;
    expectedCurrent: EntryLifecycleNativeSnapshot | null;
    revisionId: string;
    publicationTimestamp: string;
  }>
): Readonly<{
  staged: EntryLifecycleNativeSnapshot | null;
  complete: EntryLifecycleNativeSnapshot;
}> => {
  const current = input.expectedCurrent?.desired;
  const stagedDesired = normalizeEntryLifecycleNativeDesired({
    contentTypeId: input.desired.contentTypeId,
    authorId: current?.authorId ?? input.actorId,
    title: input.desired.title,
    slug: input.desired.slug,
    status: "draft",
    visibility: current?.visibility ?? "public",
    tags: current?.tags ?? [],
    data: input.desired.data,
    publishedAt: null,
    scheduledAt: null,
    revisions: current?.revisions ?? [],
  });
  if (input.desired.status === "draft") {
    return { staged: null, complete: { id: input.id, desired: stagedDesired } };
  }
  const nextVersion = Math.max(0, ...stagedDesired.revisions.map((row) => row.version)) + 1;
  const completeDesired = normalizeEntryLifecycleNativeDesired({
    ...stagedDesired,
    status: "published",
    publishedAt: input.publicationTimestamp,
    revisions: [
      {
        id: input.revisionId,
        version: nextVersion,
        data: stagedDesired.data,
        createdAt: input.publicationTimestamp,
        createdBy: input.actorId,
      },
      ...stagedDesired.revisions,
    ],
  });
  return {
    staged: { id: input.id, desired: stagedDesired },
    complete: { id: input.id, desired: completeDesired },
  };
};

const rowsToSnapshot = (
  row: typeof contentEntries.$inferSelect,
  revisions: readonly (typeof contentRevisions.$inferSelect)[]
): EntryLifecycleNativeSnapshot => {
  if (row.accessPassword !== null || row.visibility === "password") {
    throw new Error("site_package_invalid");
  }
  return {
    id: row.id,
    desired: normalizeEntryLifecycleNativeDesired({
      contentTypeId: row.typeId,
      authorId: row.authorId,
      title: row.title,
      slug: row.slug,
      status: row.status,
      visibility: row.visibility,
      tags: row.tags,
      data: row.data,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      scheduledAt: row.scheduledAt,
      revisions: revisions.map((revision) => ({
        id: revision.id,
        version: revision.version,
        data: revision.data,
        createdAt: revision.createdAt.toISOString(),
        createdBy: revision.createdBy,
      })),
    }),
  };
};

const readEntryTx = async (
  tx: EntryLifecycleTransaction,
  id: string,
  lock: boolean
): Promise<EntryLifecycleNativeSnapshot | null> => {
  const rootSelect = tx.select().from(contentEntries).where(eq(contentEntries.id, id));
  const [row] = lock ? await rootSelect.for("update") : await rootSelect;
  if (!row) return null;
  const revisionSelect = tx
    .select()
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, id))
    .orderBy(desc(contentRevisions.version), asc(contentRevisions.id))
    .limit(ENTRY_FULL_SITE_REVISION_SNAPSHOT_LIMIT + 1);
  const revisions = lock ? await revisionSelect.for("update") : await revisionSelect;
  if (revisions.length > ENTRY_FULL_SITE_REVISION_SNAPSHOT_LIMIT) {
    throw new Error("entry_revision_snapshot_too_large");
  }
  return rowsToSnapshot(row, revisions);
};

const requireContentTypeTx = async (
  tx: EntryLifecycleTransaction,
  contentTypeId: string
): Promise<Readonly<{ id: string; slug: string; schema: ContentSchema }>> => {
  const [contentType] = await tx
    .select({ id: contentTypes.id, slug: contentTypes.slug, schema: contentTypes.schema })
    .from(contentTypes)
    .where(eq(contentTypes.id, contentTypeId))
    .for("key share");
  if (!contentType) throw new Error("content_type_not_found");
  return { ...contentType, schema: contentType.schema as ContentSchema };
};

const writeRevisionsTx = async (
  tx: EntryLifecycleTransaction,
  entryId: string,
  revisions: readonly EntryLifecycleRevisionSnapshot[]
): Promise<void> => {
  await tx.delete(contentRevisions).where(eq(contentRevisions.entryId, entryId));
  if (revisions.length === 0) return;
  await tx.insert(contentRevisions).values(
    revisions.map((revision) => ({
      id: revision.id,
      entryId,
      version: revision.version,
      data: revision.data,
      createdAt: new Date(revision.createdAt),
      createdBy: revision.createdBy,
    }))
  );
};

export const captureEntryLifecycleNativeSnapshot = async (
  id: string
): Promise<EntryLifecycleNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    return readEntryTx(tx, id, false);
  });

export const mutateEntryLifecycleAtomic = async (
  input: EntryLifecycleAtomicMutation
): Promise<EntryLifecycleAtomicMutationResult> => {
  let cacheReference: Readonly<{ typeSlug: string; entrySlug: string; entryId: string }> | null =
    null;
  const result = await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    if (input.operation === "create") {
      const desired = normalizeEntryLifecycleNativeDesired(input.desired);
      const contentType = await requireContentTypeTx(tx, desired.contentTypeId);
      validateEntryData(desired.contentTypeId, contentType.schema, desired.data);
      await tx.insert(contentEntries).values({
        id: input.id,
        typeId: desired.contentTypeId,
        authorId: desired.authorId,
        title: desired.title,
        slug: desired.slug,
        status: desired.status,
        visibility: desired.visibility,
        accessPassword: null,
        tags: [...desired.tags],
        data: desired.data,
        publishedAt: desired.publishedAt ? new Date(desired.publishedAt) : null,
        scheduledAt: null,
      });
      await writeRevisionsTx(tx, input.id, desired.revisions);
      cacheReference = { typeSlug: contentType.slug, entrySlug: desired.slug, entryId: input.id };
      const snapshot = await readEntryTx(tx, input.id, false);
      if (!snapshot) throw new Error("content_entry_write_failed");
      return { id: input.id, snapshot };
    }
    const current = await readEntryTx(tx, input.id, true);
    if (
      !current ||
      input.expectedCurrent.id !== input.id ||
      !isDeepStrictEqual(current, input.expectedCurrent)
    ) {
      throw new Error("site_package_state_changed");
    }
    if (input.operation === "delete") {
      const [override] = await tx
        .select({ entryId: customScreenEntryPresentationOverrides.entryId })
        .from(customScreenEntryPresentationOverrides)
        .where(eq(customScreenEntryPresentationOverrides.entryId, input.id))
        .limit(1);
      const [assignment] = await tx
        .select({ entryId: contentTermAssignments.entryId })
        .from(contentTermAssignments)
        .where(eq(contentTermAssignments.entryId, input.id))
        .limit(1);
      if (override || assignment) throw new Error("site_package_state_changed");
      const contentType = await requireContentTypeTx(tx, current.desired.contentTypeId);
      const [deleted] = await tx
        .delete(contentEntries)
        .where(eq(contentEntries.id, input.id))
        .returning({ id: contentEntries.id });
      if (!deleted) throw new Error("site_package_state_changed");
      cacheReference = {
        typeSlug: contentType.slug,
        entrySlug: current.desired.slug,
        entryId: input.id,
      };
      return { id: input.id, snapshot: null };
    }
    const desired = normalizeEntryLifecycleNativeDesired(input.desired);
    const contentType = await requireContentTypeTx(tx, desired.contentTypeId);
    validateEntryData(desired.contentTypeId, contentType.schema, desired.data);
    const [updated] = await tx
      .update(contentEntries)
      .set({
        typeId: desired.contentTypeId,
        authorId: desired.authorId,
        title: desired.title,
        slug: desired.slug,
        status: desired.status,
        visibility: desired.visibility,
        accessPassword: null,
        tags: [...desired.tags],
        data: desired.data,
        publishedAt: desired.publishedAt ? new Date(desired.publishedAt) : null,
        scheduledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(contentEntries.id, input.id))
      .returning({ id: contentEntries.id });
    if (!updated) throw new Error("site_package_state_changed");
    await writeRevisionsTx(tx, input.id, desired.revisions);
    cacheReference = { typeSlug: contentType.slug, entrySlug: desired.slug, entryId: input.id };
    const snapshot = await readEntryTx(tx, input.id, false);
    if (!snapshot) throw new Error("site_package_state_changed");
    return { id: input.id, snapshot };
  });
  if (cacheReference) await invalidateContentEntryCache(cacheReference);
  return result;
};
