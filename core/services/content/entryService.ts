import { randomUUID } from "node:crypto";
import { and, eq, max, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { hashPassword } from "../auth/password";
import { contentEntries, contentRevisions, contentTypes, previewTokens } from "../../db/schema";
import { hashPreviewToken } from "../pages/previewService";
import { clearSiteCache, invalidateContentEntryCache } from "../../site/cache/siteCache";
import { emitIntegrationEventSafe } from "../integrations/integrationEventDispatch";
import {
  applyPreparedSeoMutationWithExecutor,
  prepareSeoMutationWithExecutor,
  type PreparedSeoMutation,
} from "../seo/seoService";
import {
  applyEntryTaxonomyMutation,
  prepareEntryTaxonomyMutation,
  type EntryTaxonomyPlan,
} from "./taxonomyService";
import { type ContentSchema, validateEntryData } from "./validation";
import {
  ensureEntrySlugAvailableWithExecutor,
  getEntryContentTypeWithExecutor,
  validateEntryReferences,
} from "./entryReferenceValidation";
import {
  getEntry,
  getEntryBySlug,
  getEntryRevisionData,
  listEntries,
  listEntriesForListing,
  listEntriesWithContentTypes,
  listEntryRevisions,
  entryRevisionUuidPattern,
  type EntryRevisionAuthor,
  type EntryRevisionDetail,
  type EntryRevisionMeta,
} from "./entryReadService";
import { duplicateEntry } from "./entryDuplicationService";
import { areRevisionSnapshotsEqual } from "./revisionSnapshot";
import type {
  CreateEntryInput,
  EntryData,
  EntryDetail,
  EntryListItem,
  EntrySeo,
  EntryStatus,
  EntryVisibility,
  UpdateEntryInput,
  UpdateEntryMetadataInput,
} from "./entryTypes";

export {
  duplicateEntry,
  getEntry,
  getEntryBySlug,
  getEntryRevisionData,
  listEntries,
  listEntriesForListing,
  listEntriesWithContentTypes,
  listEntryRevisions,
};
export type {
  CreateEntryInput,
  EntryData,
  EntryDetail,
  EntryListItem,
  EntryRevisionAuthor,
  EntryRevisionDetail,
  EntryRevisionMeta,
  EntrySeo,
  EntryStatus,
  EntryVisibility,
  UpdateEntryInput,
  UpdateEntryMetadataInput,
};

type EntryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type EntryTransactionRunner = <T>(callback: (tx: EntryTransaction) => Promise<T>) => Promise<T>;
type DbClient = typeof db | EntryTransaction;

type EntryMutationAuthorization =
  | Readonly<{
      kind: "route";
      authorize: (
        tx: EntryTransaction,
        requirement: Readonly<{ publishTransition: boolean }>
      ) => Promise<void>;
    }>
  | Readonly<{ kind: "trusted-internal" }>;

type EntryMutationState = Readonly<{
  id: string;
  typeId: string;
  slug: string;
  title: string;
  status: EntryStatus;
  data: EntryData;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  visibility: EntryVisibility;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  hasPassword: boolean;
}>;

type ContentTypeMutationContext = Readonly<{
  id: string;
  slug: string;
  schema: ContentSchema;
}>;

type EntryCacheProjection = Readonly<{
  id: string;
  typeId: string;
  slug: string;
  status: EntryStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  updatedAt: Date;
}>;

type EntryStatusWritePlan = Readonly<{
  entryId: string;
  values: Readonly<{
    status: EntryStatus;
    publishedAt?: Date | null;
    scheduledAt: Date | null;
    updatedAt: Date;
  }>;
}>;

type EntryMetadataWritePlan = Readonly<{
  entryId: string;
  values: Readonly<{
    tags?: string[];
    visibility?: EntryVisibility;
    accessPassword?: string | null;
    scheduledAt?: Date | null;
    updatedAt: Date;
  }>;
}>;

type EntryMutationWritePlan = Readonly<{
  transitionToPublished: boolean;
  statusWrite: EntryStatusWritePlan | null;
  taxonomyWrite: boolean;
  metadataWrite: EntryMetadataWritePlan | null;
  seoWrite: boolean;
  changed: boolean;
}>;

type EntryCacheReference = Readonly<{
  typeSlug: string;
  entrySlug: string;
  entryId: string;
}>;

type EntryCacheFailureCode = "entry_cache_invalidation_failed";

const ENTRY_MUTATION_FIELDS = {
  id: contentEntries.id,
  typeId: contentEntries.typeId,
  slug: contentEntries.slug,
  title: contentEntries.title,
  status: contentEntries.status,
  data: contentEntries.data,
  publishedAt: contentEntries.publishedAt,
  scheduledAt: contentEntries.scheduledAt,
  visibility: contentEntries.visibility,
  tags: contentEntries.tags,
  createdAt: contentEntries.createdAt,
  updatedAt: contentEntries.updatedAt,
  hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
} as const;

const ENTRY_CACHE_FIELDS = {
  id: contentEntries.id,
  typeId: contentEntries.typeId,
  slug: contentEntries.slug,
  status: contentEntries.status,
  publishedAt: contentEntries.publishedAt,
  scheduledAt: contentEntries.scheduledAt,
  updatedAt: contentEntries.updatedAt,
} as const;

const ENTRY_DELETE_FIELDS = {
  id: contentEntries.id,
  title: contentEntries.title,
} as const;

const ENTRY_UPDATE_FIELDS = {
  id: contentEntries.id,
  typeId: contentEntries.typeId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  data: contentEntries.data,
} as const;

const CONTENT_TYPE_MUTATION_CONTEXT_FIELDS = {
  id: contentTypes.id,
  slug: contentTypes.slug,
  schema: contentTypes.schema,
} as const;

const normalizeTags = (tags?: string[]) => {
  if (!tags) return null;
  const trimmed = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);
  return Array.from(new Set(trimmed)).slice(0, 20);
};

const normalizeSeoSlug = (slug: string | null) => {
  if (!slug) return null;
  return slug.startsWith("/") ? slug : `/${slug}`;
};

const sameOptionalDate = (left: Date | null, right: Date | null) =>
  left === null || right === null ? left === right : left.getTime() === right.getTime();

async function loadEntryMutationStateForUpdate(
  executor: EntryTransaction,
  entryId: string
): Promise<EntryMutationState | null> {
  const [row] = await executor
    .select(ENTRY_MUTATION_FIELDS)
    .from(contentEntries)
    .where(eq(contentEntries.id, entryId))
    .limit(1)
    .for("update");

  if (!row) return null;
  return {
    id: row.id,
    typeId: row.typeId,
    slug: row.slug,
    title: row.title,
    status: row.status as EntryStatus,
    data: row.data as EntryData,
    publishedAt: row.publishedAt ?? null,
    scheduledAt: row.scheduledAt ?? null,
    visibility: row.visibility as EntryVisibility,
    tags: (row.tags ?? []) as string[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasPassword: row.hasPassword,
  };
}

async function getContentTypeMutationContextWithExecutor(
  executor: EntryTransaction,
  typeId: string
): Promise<ContentTypeMutationContext | null> {
  const [row] = await executor
    .select(CONTENT_TYPE_MUTATION_CONTEXT_FIELDS)
    .from(contentTypes)
    .where(eq(contentTypes.id, typeId))
    .limit(1);

  return row
    ? {
        id: row.id,
        slug: row.slug,
        schema: row.schema as ContentSchema,
      }
    : null;
}

async function writeEntryStatusTx(
  tx: EntryTransaction,
  plan: EntryStatusWritePlan
): Promise<EntryCacheProjection | null> {
  const [row] = await tx
    .update(contentEntries)
    .set(plan.values)
    .where(eq(contentEntries.id, plan.entryId))
    .returning(ENTRY_CACHE_FIELDS);

  return row ? { ...row, status: row.status as EntryStatus } : null;
}

async function writeEntryMetadataTx(
  tx: EntryTransaction,
  plan: EntryMetadataWritePlan
): Promise<void> {
  await tx.update(contentEntries).set(plan.values).where(eq(contentEntries.id, plan.entryId));
}

async function validateEntryForPublish(
  tx: EntryTransaction,
  entry: EntryMutationState,
  contentSchema: ContentSchema
) {
  validateEntryData(entry.typeId, contentSchema, entry.data);
  await validateEntryReferences(contentSchema, entry.data, tx);
}

async function publishEntryTx(
  deps: EntryMutationDeps,
  tx: EntryTransaction,
  entry: EntryMutationState,
  contentSchema: ContentSchema,
  actorId: string,
  statusPlan: EntryStatusWritePlan
): Promise<EntryCacheProjection | null> {
  await validateEntryForPublish(tx, entry, contentSchema);
  await deps.createRevision(tx, entry.id, entry.data, actorId);
  return deps.writeStatus(tx, statusPlan);
}

function reportEntryCacheFailure(code: EntryCacheFailureCode): void {
  try {
    console.warn(code);
  } catch {
    // Best-effort reporting must not turn a durable commit into a failed request.
  }
}

const runEntryTransaction: EntryTransactionRunner = async <T>(
  callback: (tx: EntryTransaction) => Promise<T>
) => db.transaction(callback, { isolationLevel: "read committed" });

export type EntryMutationDeps = Readonly<{
  transaction: EntryTransactionRunner;
  acquireFence: typeof acquireNativeCmsWriterFence;
  hashPassword: typeof hashPassword;
  prepareTaxonomy: typeof prepareEntryTaxonomyMutation;
  applyTaxonomy: typeof applyEntryTaxonomyMutation;
  prepareSeo: typeof prepareSeoMutationWithExecutor;
  applySeo: typeof applyPreparedSeoMutationWithExecutor;
  createRevision: typeof createEntryRevisionTx;
  writeStatus: typeof writeEntryStatusTx;
  writeMetadata: typeof writeEntryMetadataTx;
  invalidateEntrySiteCache: typeof invalidateContentEntryCache;
  clearAllSiteCache: typeof clearSiteCache;
  reportCacheFailure: typeof reportEntryCacheFailure;
}>;

const entryMutationDeps: EntryMutationDeps = Object.freeze({
  transaction: runEntryTransaction,
  acquireFence: acquireNativeCmsWriterFence,
  hashPassword,
  prepareTaxonomy: prepareEntryTaxonomyMutation,
  applyTaxonomy: applyEntryTaxonomyMutation,
  prepareSeo: prepareSeoMutationWithExecutor,
  applySeo: applyPreparedSeoMutationWithExecutor,
  createRevision: createEntryRevisionTx,
  writeStatus: writeEntryStatusTx,
  writeMetadata: writeEntryMetadataTx,
  invalidateEntrySiteCache: invalidateContentEntryCache,
  clearAllSiteCache: clearSiteCache,
  reportCacheFailure: reportEntryCacheFailure,
});

export function createEntryMutationDepsForTest(
  overrides: Partial<EntryMutationDeps>
): EntryMutationDeps {
  return Object.freeze({ ...entryMutationDeps, ...overrides });
}

async function applyEntryPostCommitCache(
  deps: EntryMutationDeps,
  effect: Readonly<{
    changed: boolean;
    seoChanged: boolean;
    cacheRef: EntryCacheReference;
  }>
) {
  try {
    if (effect.seoChanged) {
      await deps.clearAllSiteCache();
    } else if (effect.changed) {
      await deps.invalidateEntrySiteCache(effect.cacheRef);
    }
  } catch {
    try {
      deps.reportCacheFailure("entry_cache_invalidation_failed");
    } catch {
      // Reporting is best-effort and must not change the durable mutation result.
    }
  }
}

const createStatusWritePlan = (
  entry: EntryMutationState,
  nextStatus: EntryStatus,
  nextScheduledAt: Date | null
): EntryStatusWritePlan => {
  const now = new Date();
  const values: EntryStatusWritePlan["values"] =
    nextStatus === "published"
      ? Object.freeze({
          status: nextStatus,
          publishedAt: now,
          scheduledAt: null,
          updatedAt: now,
        })
      : nextStatus === "draft"
        ? Object.freeze({
            status: nextStatus,
            publishedAt: null,
            scheduledAt: null,
            updatedAt: now,
          })
        : Object.freeze({
            status: nextStatus,
            scheduledAt: nextStatus === "scheduled" ? nextScheduledAt : null,
            updatedAt: now,
          });

  return Object.freeze({ entryId: entry.id, values });
};

export async function deleteEntry(id: string) {
  return runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [row] = await tx
      .delete(contentEntries)
      .where(eq(contentEntries.id, id))
      .returning(ENTRY_DELETE_FIELDS);
    return row ?? null;
  });
}

export async function createEntry(typeId: string, input: CreateEntryInput) {
  const createdId = await runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const contentType = await getEntryContentTypeWithExecutor(tx, typeId);
    if (!contentType) throw new Error("content_type_not_found");
    await ensureEntrySlugAvailableWithExecutor(tx, typeId, input.slug);
    const schema = contentType.schema as ContentSchema;
    validateEntryData(typeId, schema, input.data);
    await validateEntryReferences(schema, input.data, tx);

    const [row] = await tx
      .insert(contentEntries)
      .values({
        typeId,
        authorId: input.authorId ?? null,
        title: input.title,
        slug: input.slug,
        status: "draft",
        data: input.data,
      })
      .returning({ id: contentEntries.id });
    if (!row) throw new Error("entry_create_failed");
    return row.id;
  });

  const detail = await getEntry(createdId);
  if (!detail) throw new Error("entry_create_failed");
  return detail;
}

export async function updateEntry(id: string, input: UpdateEntryInput) {
  const updatedId = await runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [entry] = await tx
      .select(ENTRY_UPDATE_FIELDS)
      .from(contentEntries)
      .where(eq(contentEntries.id, id))
      .limit(1)
      .for("update");
    if (!entry) throw new Error("entry_not_found");

    const contentType = await getEntryContentTypeWithExecutor(tx, entry.typeId);
    if (!contentType) throw new Error("content_type_not_found");
    const nextSlug = input.slug ?? entry.slug;
    await ensureEntrySlugAvailableWithExecutor(tx, entry.typeId, nextSlug, entry.id);
    const nextData = input.data ?? (entry.data as EntryData);
    const schema = contentType.schema as ContentSchema;
    validateEntryData(entry.typeId, schema, nextData);
    await validateEntryReferences(schema, nextData, tx);
    const seoPlan =
      input.title || input.slug
        ? await prepareSeoMutationWithExecutor(tx, {
            targetType: "entry",
            targetId: entry.id,
            title: input.title ?? entry.title,
            slug: normalizeSeoSlug(nextSlug),
          })
        : null;

    await tx
      .update(contentEntries)
      .set({
        title: input.title ?? entry.title,
        slug: nextSlug,
        data: nextData,
        updatedAt: new Date(),
      })
      .where(eq(contentEntries.id, entry.id));
    if (seoPlan) await applyPreparedSeoMutationWithExecutor(tx, seoPlan);
    return entry.id;
  });

  return getEntry(updatedId);
}

export async function publishEntry(entryId: string, userId: string) {
  const committed = await entryMutationDeps.transaction(async (tx) => {
    await entryMutationDeps.acquireFence(tx);
    const entry = await loadEntryMutationStateForUpdate(tx, entryId);
    if (!entry) throw new Error("entry_not_found");

    const contentType = await getContentTypeMutationContextWithExecutor(tx, entry.typeId);
    if (!contentType) throw new Error("content_type_not_found");

    const statusPlan = createStatusWritePlan(entry, "published", null);
    const updated = await publishEntryTx(
      entryMutationDeps,
      tx,
      entry,
      contentType.schema,
      userId,
      statusPlan
    );
    return {
      updated,
      cacheRef: {
        typeSlug: contentType.slug,
        entrySlug: entry.slug,
        entryId: entry.id,
      },
      title: entry.title,
    };
  });

  if (committed.updated) {
    await applyEntryPostCommitCache(entryMutationDeps, {
      changed: true,
      seoChanged: false,
      cacheRef: committed.cacheRef,
    });
    emitIntegrationEventSafe("entry.published", {
      type: "entry",
      id: committed.updated.id,
      title: committed.title,
      slug: committed.updated.slug,
    });
  }

  return committed.updated;
}

export async function unpublishEntry(entryId: string) {
  const committed = await runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const entry = await loadEntryMutationStateForUpdate(tx, entryId);
    if (!entry) return null;
    const contentType = await getContentTypeMutationContextWithExecutor(tx, entry.typeId);
    if (!contentType) throw new Error("content_type_not_found");
    const [row] = await tx
      .update(contentEntries)
      .set({
        status: "draft",
        publishedAt: null,
        scheduledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(contentEntries.id, entry.id))
      .returning(ENTRY_CACHE_FIELDS);
    return row ? { row, typeSlug: contentType.slug } : null;
  });

  if (committed) {
    await invalidateContentEntryCache({
      typeSlug: committed.typeSlug,
      entrySlug: committed.row.slug,
      entryId: committed.row.id,
    });
  }

  return committed?.row ?? null;
}

export async function coordinateEntryMetadataMutation(
  deps: EntryMutationDeps,
  entryId: string,
  input: UpdateEntryMetadataInput,
  actorId: string | undefined,
  mutationAuthorization: EntryMutationAuthorization
) {
  const committed = await deps.transaction(async (tx) => {
    await deps.acquireFence(tx);
    const entry = await loadEntryMutationStateForUpdate(tx, entryId);
    if (!entry) throw new Error("entry_not_found");

    const hasScheduledAt = Object.hasOwn(input, "scheduledAt");
    if (
      hasScheduledAt &&
      input.scheduledAt !== null &&
      (!(input.scheduledAt instanceof Date) || Number.isNaN(input.scheduledAt.getTime()))
    ) {
      throw new Error("scheduled_at_invalid");
    }

    const nextStatus = input.status ?? entry.status;
    const nextScheduledAt =
      input.status !== undefined && input.status !== "scheduled"
        ? null
        : hasScheduledAt
          ? (input.scheduledAt ?? null)
          : entry.scheduledAt;
    if (nextStatus === "scheduled" && !nextScheduledAt) {
      throw new Error("scheduled_at_required");
    }

    const transitionToPublished = input.status === "published" && entry.status !== "published";
    const authorization = mutationAuthorization as
      { kind?: unknown; authorize?: unknown } | null | undefined;
    if (authorization?.kind === "route") {
      if (typeof authorization.authorize !== "function") {
        throw new Error("entry_publish_authorization_required");
      }
      await authorization.authorize(
        tx,
        Object.freeze({ publishTransition: transitionToPublished })
      );
    } else if (authorization?.kind !== "trusted-internal") {
      throw new Error("entry_publish_authorization_required");
    }

    let publishActorId: string | null = null;
    if (transitionToPublished) {
      if (!actorId) throw new Error("auth_required");
      publishActorId = actorId;
    }

    const hasNewPassword =
      input.visibility === "password" &&
      typeof input.accessPassword === "string" &&
      input.accessPassword.length > 0;
    if (input.visibility === "password" && !hasNewPassword && !entry.hasPassword) {
      throw new Error("entry_password_required");
    }
    const preparedHash = hasNewPassword
      ? await deps.hashPassword(input.accessPassword as string)
      : undefined;

    const normalizedTags = normalizeTags(input.tags);
    const taxonomyPlan: EntryTaxonomyPlan | null =
      input.taxonomy !== undefined
        ? await deps.prepareTaxonomy(tx, entry.id, entry.typeId, input.taxonomy)
        : null;
    const seoPlan: PreparedSeoMutation | null =
      input.seo !== undefined
        ? await deps.prepareSeo(tx, {
            targetType: "entry",
            targetId: entry.id,
            slug: normalizeSeoSlug(entry.slug),
            title: input.seo.title ?? undefined,
            description: input.seo.description ?? undefined,
            canonicalUrl: input.seo.canonicalUrl ?? undefined,
            robots: input.seo.robots ?? undefined,
          })
        : null;
    const contentType = await getContentTypeMutationContextWithExecutor(tx, entry.typeId);
    if (!contentType) throw new Error("content_type_not_found");

    const statusTransition = input.status !== undefined && input.status !== entry.status;
    const statusWrite = statusTransition
      ? createStatusWritePlan(entry, nextStatus, nextScheduledAt)
      : null;
    const metadataValues: {
      tags?: string[];
      visibility?: EntryVisibility;
      accessPassword?: string | null;
      scheduledAt?: Date | null;
    } = {};

    if (taxonomyPlan) {
      metadataValues.tags = [...taxonomyPlan.resolvedTagNames];
    } else if (normalizedTags !== null) {
      metadataValues.tags = normalizedTags;
    }
    if (
      !statusTransition &&
      hasScheduledAt &&
      !sameOptionalDate(nextScheduledAt, entry.scheduledAt)
    ) {
      metadataValues.scheduledAt = nextScheduledAt;
    }
    if (input.visibility !== undefined) {
      metadataValues.visibility = input.visibility;
      if (input.visibility === "password") {
        if (preparedHash !== undefined) metadataValues.accessPassword = preparedHash;
      } else {
        metadataValues.accessPassword = null;
      }
    }

    const metadataWrite: EntryMetadataWritePlan | null =
      Object.keys(metadataValues).length > 0
        ? Object.freeze({
            entryId: entry.id,
            values: Object.freeze({ ...metadataValues, updatedAt: new Date() }),
          })
        : null;
    const writePlan: EntryMutationWritePlan = Object.freeze({
      transitionToPublished,
      statusWrite,
      taxonomyWrite: taxonomyPlan !== null,
      metadataWrite,
      seoWrite: seoPlan !== null,
      changed:
        statusWrite !== null || taxonomyPlan !== null || metadataWrite !== null || seoPlan !== null,
    });

    if (writePlan.transitionToPublished) {
      if (!publishActorId || !writePlan.statusWrite) {
        throw new Error("entry_publish_authorization_required");
      }
      await publishEntryTx(
        deps,
        tx,
        entry,
        contentType.schema,
        publishActorId,
        writePlan.statusWrite
      );
    } else if (writePlan.statusWrite) {
      await deps.writeStatus(tx, writePlan.statusWrite);
    }
    if (taxonomyPlan) await deps.applyTaxonomy(tx, taxonomyPlan);
    if (writePlan.metadataWrite) await deps.writeMetadata(tx, writePlan.metadataWrite);
    if (seoPlan) await deps.applySeo(tx, seoPlan);

    return {
      changed: writePlan.changed,
      seoChanged: writePlan.seoWrite,
      resultId: entry.id,
      cacheRef: {
        typeSlug: contentType.slug,
        entrySlug: entry.slug,
        entryId: entry.id,
      },
    };
  });

  await applyEntryPostCommitCache(deps, committed);
  return getEntry(committed.resultId);
}

export async function updateEntryMetadataForRoute(
  entryId: string,
  input: UpdateEntryMetadataInput,
  actorId: string | undefined,
  authorizeMutation: (
    tx: EntryTransaction,
    requirement: Readonly<{ publishTransition: boolean }>
  ) => Promise<void>
) {
  return coordinateEntryMetadataMutation(entryMutationDeps, entryId, input, actorId, {
    kind: "route",
    authorize: authorizeMutation,
  });
}

export async function updateEntryMetadata(
  entryId: string,
  input: UpdateEntryMetadataInput,
  actorId?: string
) {
  return coordinateEntryMetadataMutation(entryMutationDeps, entryId, input, actorId, {
    kind: "trusted-internal",
  });
}

export async function createEntryRevision(entryId: string, data: EntryData, userId: string) {
  return runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [entry] = await tx
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(eq(contentEntries.id, entryId))
      .for("update");
    if (!entry) throw new Error("entry_not_found");
    return createEntryRevisionTx(tx, entryId, data, userId);
  });
}

const MAX_REVISION_VERSION_ATTEMPTS = 5;

/**
 * Allocate the next revision version and insert the snapshot. The unique
 * `(entry_id, version)` index (migration 0076) makes allocation
 * concurrency-safe WITHOUT requiring the caller to hold the entry row
 * `FOR UPDATE`: `max(version) + 1` is re-derived per attempt and a conflicting
 * insert is swallowed by `ON CONFLICT DO NOTHING`, so two writers racing on the
 * same next version retry with a fresh max and converge. Retry exhaustion
 * surfaces the machine-readable `revision_conflict`.
 */
export async function createEntryRevisionTx(
  tx: DbClient,
  entryId: string,
  data: EntryData,
  userId: string
) {
  for (let attempt = 0; attempt < MAX_REVISION_VERSION_ATTEMPTS; attempt += 1) {
    const [{ value }] = await tx
      .select({ value: max(contentRevisions.version) })
      .from(contentRevisions)
      .where(eq(contentRevisions.entryId, entryId));

    const nextVersion = (value ?? 0) + 1;

    const [row] = await tx
      .insert(contentRevisions)
      .values({ entryId, version: nextVersion, data, createdBy: userId })
      .onConflictDoNothing({ target: [contentRevisions.entryId, contentRevisions.version] })
      .returning();

    if (row) return row;
  }

  throw new Error("revision_conflict");
}

/**
 * Restore an entry's `data` from a stored revision, mirroring
 * `restorePostRevision`, as ONE fenced transaction (H-487-01). The entry row is
 * locked `FOR UPDATE` and the fence is acquired inside the same transaction, so
 * an interleaved editor write can never be lost between the pre-read and the
 * overwrite, and the pre-restore snapshot always reflects the data actually
 * overwritten. The target snapshot is re-validated exactly like `updateEntry`
 * (`validateEntryData` + `validateEntryReferences`) so a stale or non-conforming
 * snapshot surfaces as `ContentValidationError`, not a silent persist — and on
 * validation failure the whole transaction rolls back, leaving NO snapshot row
 * behind.
 *
 * Cache invalidation runs post-commit through the real
 * `applyEntryPostCommitCache` seam (no `onCommit` hook exists on
 * `runEntryTransaction`), and the committed response re-reads the entry for the
 * `cacheRef` exactly like the previous implementation. A no-op restore
 * (`areRevisionSnapshotsEqual`) writes nothing and skips cache invalidation.
 */
export async function restoreEntryRevision(
  entryId: string,
  revisionId: string,
  actorId?: string | null
) {
  if (!entryRevisionUuidPattern.test(revisionId)) throw new Error("entry_revision_not_found");

  const committed = await runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [entry] = await tx
      .select(ENTRY_UPDATE_FIELDS)
      .from(contentEntries)
      .where(eq(contentEntries.id, entryId))
      .limit(1)
      .for("update");
    if (!entry) throw new Error("entry_not_found");

    const [revision] = await tx
      .select({ id: contentRevisions.id, data: contentRevisions.data })
      .from(contentRevisions)
      .where(and(eq(contentRevisions.entryId, entryId), eq(contentRevisions.id, revisionId)))
      .limit(1);
    if (!revision) throw new Error("entry_revision_not_found");

    const contentType = await getEntryContentTypeWithExecutor(tx, entry.typeId);
    if (!contentType) throw new Error("content_type_not_found");

    const schema = contentType.schema as ContentSchema;
    const currentData = entry.data as EntryData;
    const targetData = revision.data as EntryData;
    validateEntryData(entry.typeId, schema, targetData);
    await validateEntryReferences(schema, targetData, tx);

    // No-op when current data already equals the snapshot (stable-key JSON
    // compare). Nothing is written, no snapshot row, no cache invalidation.
    if (areRevisionSnapshotsEqual(currentData, targetData)) {
      return { restored: false as const, cacheRef: null };
    }

    // Snapshot the LOCKED current data before overwrite so restore is itself
    // reversible. Null actor -> no snapshot row (null-actor regression).
    if (actorId) {
      await createEntryRevisionTx(tx, entryId, currentData, actorId);
    }

    await tx
      .update(contentEntries)
      .set({ data: targetData, updatedAt: new Date() })
      .where(eq(contentEntries.id, entryId));

    return {
      restored: true as const,
      cacheRef: {
        typeSlug: contentType.slug,
        entrySlug: entry.slug,
        entryId: entry.id,
      },
    };
  });

  if (committed.cacheRef) {
    await applyEntryPostCommitCache(entryMutationDeps, {
      changed: true,
      seoChanged: false,
      cacheRef: committed.cacheRef,
    });
  }

  const entry = await getEntry(entryId);
  if (!entry) throw new Error("entry_not_found");
  const revision = await getEntryRevisionData(entryId, revisionId);
  if (!revision) throw new Error("entry_revision_not_found");
  return { restored: committed.restored, revision, entry };
}

export async function createEntryPreview(entryId: string, ttlMinutes?: number) {
  return runEntryTransaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + (ttlMinutes ?? 60) * 60_000);
    await tx.insert(previewTokens).values({
      targetType: "content",
      targetId: entryId,
      tokenHash: hashPreviewToken(token),
      context: null,
      expiresAt,
    });
    return { token, expiresAt };
  });
}
