import { and, desc, eq, inArray, isNotNull, max, ne, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { hashPassword } from "../auth/password";
import {
  contentEntries,
  contentRevisions,
  contentTermAssignments,
  contentTypes,
  media,
  users,
} from "../../db/schema";
import { createPreviewToken } from "../pages/previewService";
import { clearSiteCache, invalidateContentEntryCache } from "../../site/cache/siteCache";
import { getContentType } from "./typeService";
import {
  applyPreparedSeoMutationWithExecutor,
  getSeoDocumentByTarget,
  prepareSeoMutationWithExecutor,
  upsertSeoDocument,
  type PreparedSeoMutation,
} from "../seo/seoService";
import { resolveEmailValue } from "../security/piiEmail";
import type { ListingPushdownPredicate } from "./listingPushdown";
import { buildEntryDataPredicateSql } from "./listingPushdownSql";
import {
  applyEntryTaxonomyMutation,
  getEntryTaxonomies,
  prepareEntryTaxonomyMutation,
  type EntryTaxonomyAssignments,
  type EntryTaxonomyPlan,
} from "./taxonomyService";
import { type ContentSchema, validateEntryData } from "./validation";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";
export type EntryVisibility = "public" | "private" | "password";
export type EntryData = Record<string, unknown>;
export type EntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type EntryDetail = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  visibility: EntryVisibility;
  hasPassword: boolean;
  data: EntryData;
  tags: string[];
  taxonomy?: EntryTaxonomyAssignments;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string } | null;
  seo: EntrySeo | null;
};

export type EntryListItem = Omit<EntryDetail, "seo" | "taxonomy"> & {
  seo?: EntrySeo | null;
  contentType: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
};

export type CreateEntryInput = {
  title: string;
  slug: string;
  data: EntryData;
  authorId?: string | null;
};

export type UpdateEntryInput = {
  title?: string;
  slug?: string;
  data?: EntryData;
};

export type UpdateEntryMetadataInput = {
  status?: EntryStatus;
  scheduledAt?: Date | null;
  visibility?: EntryVisibility;
  accessPassword?: string | null; // plaintext in; hashed before store; null clears
  tags?: string[];
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: EntrySeo;
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

type RelationFieldConfig = {
  name: string;
  targetSlug: string;
  multiple: boolean;
};

type MediaFieldConfig = {
  name: string;
  multiple: boolean;
  accept: string[] | undefined;
  maxItems: number | undefined;
};

type EntryFieldError = Error & {
  field?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createEntryFieldError = (code: string, field?: string): EntryFieldError =>
  Object.assign(new Error(code), field ? { field } : {});

const readRelationConfig = (value: unknown) => {
  if (!isRecord(value)) return { target: undefined, multiple: false };
  const relation = value.relation;
  if (!isRecord(relation)) return { target: undefined, multiple: false };
  const target = typeof relation.target === "string" ? relation.target.trim() : undefined;
  const multiple = relation.multiple === true;
  return { target: target || undefined, multiple };
};

const readMediaConfig = (value: unknown) => {
  if (!isRecord(value)) return {};
  const mediaValue = isRecord(value.media) ? value.media : value;
  if (!isRecord(mediaValue)) return {};
  const multiple = mediaValue.multiple === true;
  const accept = Array.isArray(mediaValue.accept)
    ? mediaValue.accept
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;
  const maxItems =
    typeof mediaValue.maxItems === "number" && Number.isFinite(mediaValue.maxItems)
      ? mediaValue.maxItems
      : undefined;
  return {
    multiple,
    accept: accept?.length ? accept : undefined,
    maxItems,
  };
};

const extractRelationFields = (schema: ContentSchema) => {
  if (!schema || typeof schema !== "object") return [];
  const typed = schema as Record<string, unknown>;
  const properties = typed.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return [];
  }

  return Object.entries(properties)
    .map(([name, definition]) => {
      if (!isRecord(definition)) return null;
      const xFieldType = definition.xFieldType;
      const xRelationTarget =
        typeof definition.xRelationTarget === "string"
          ? definition.xRelationTarget.trim()
          : undefined;
      const { target, multiple } = readRelationConfig(definition.xFieldConfig);
      const resolvedTarget = xRelationTarget ?? target;
      const isRelation = xFieldType === "relation" || Boolean(resolvedTarget);
      if (!isRelation || !resolvedTarget) return null;
      const isArray = definition.type === "array";
      return {
        name,
        targetSlug: resolvedTarget,
        multiple: isArray || multiple,
      };
    })
    .filter((entry): entry is RelationFieldConfig => Boolean(entry));
};

const extractMediaFields = (schema: ContentSchema) => {
  if (!schema || typeof schema !== "object") return [];
  const typed = schema as Record<string, unknown>;
  const properties = typed.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return [];
  }

  return Object.entries(properties)
    .map(([name, definition]) => {
      if (!isRecord(definition)) return null;
      const xFieldType = definition.xFieldType;
      const mediaConfig = readMediaConfig(definition.xFieldConfig);
      const isMedia =
        xFieldType === "media" || mediaConfig.multiple === true || Boolean(mediaConfig.accept);
      if (!isMedia) return null;
      const multiple = definition.type === "array" || mediaConfig.multiple === true;
      return {
        name,
        multiple,
        accept: mediaConfig.accept,
        maxItems:
          typeof mediaConfig.maxItems === "number"
            ? mediaConfig.maxItems
            : typeof definition.maxItems === "number"
              ? definition.maxItems
              : undefined,
      };
    })
    .filter((entry): entry is MediaFieldConfig => Boolean(entry));
};

const matchesMimeAccept = (mimeType: string, accept?: string[]) => {
  if (!accept || accept.length === 0) return true;
  const normalized = accept.map((entry) => entry.toLowerCase());
  const candidate = mimeType.toLowerCase();
  return normalized.some((pattern) => {
    if (pattern === "*/*") return true;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, pattern.indexOf("/"));
      return candidate.startsWith(`${prefix}/`);
    }
    return candidate === pattern;
  });
};

const mediaAssetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function validateMediaAssets(schema: ContentSchema, data: EntryData, client: DbClient) {
  const mediaFields = extractMediaFields(schema);
  if (mediaFields.length === 0) return;

  const selectedIds = new Set<string>();
  const allowedById = new Map<string, string[][]>();

  for (const field of mediaFields) {
    const rawValue = data[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (field.multiple) {
      if (!Array.isArray(rawValue)) {
        throw createEntryFieldError("media_value_invalid", field.name);
      }
      if (field.maxItems && rawValue.length > field.maxItems) {
        throw createEntryFieldError("media_value_invalid", field.name);
      }
      for (const id of rawValue) {
        if (typeof id !== "string" || id.trim() === "") {
          throw createEntryFieldError("media_value_invalid", field.name);
        }
        if (!mediaAssetIdPattern.test(id)) {
          throw createEntryFieldError("media_asset_missing", field.name);
        }
        selectedIds.add(id);
        if (field.accept) {
          const bucket = allowedById.get(id) ?? [];
          bucket.push(field.accept);
          allowedById.set(id, bucket);
        }
      }
    } else {
      if (Array.isArray(rawValue)) {
        throw createEntryFieldError("media_value_invalid", field.name);
      }
      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        throw createEntryFieldError("media_value_invalid", field.name);
      }
      if (!mediaAssetIdPattern.test(rawValue)) {
        throw createEntryFieldError("media_asset_missing", field.name);
      }
      selectedIds.add(rawValue);
      if (field.accept) {
        const bucket = allowedById.get(rawValue) ?? [];
        bucket.push(field.accept);
        allowedById.set(rawValue, bucket);
      }
    }
  }

  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  const rows = await client
    .select({ id: media.id, mimeType: media.mimeType })
    .from(media)
    .where(inArray(media.id, ids));

  const found = new Map(rows.map((row) => [row.id, row.mimeType]));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    const missingField = mediaFields.find((field) => {
      const rawValue = data[field.name];
      return Array.isArray(rawValue)
        ? rawValue.some((value) => missing.includes(String(value)))
        : typeof rawValue === "string" && missing.includes(rawValue);
    });
    throw createEntryFieldError("media_asset_missing", missingField?.name);
  }

  for (const [id, acceptLists] of allowedById.entries()) {
    const mimeType = found.get(id);
    if (!mimeType) continue;
    for (const accept of acceptLists) {
      if (!matchesMimeAccept(mimeType, accept)) {
        const offendingField = mediaFields.find((field) => {
          const rawValue = data[field.name];
          return Array.isArray(rawValue) ? rawValue.includes(id) : rawValue === id;
        });
        throw createEntryFieldError("media_type_not_allowed", offendingField?.name);
      }
    }
  }
}

async function validateRelationEntries(schema: ContentSchema, data: EntryData, client: DbClient) {
  const relationFields = extractRelationFields(schema);
  if (relationFields.length === 0) return;

  const idsByTarget = new Map<string, Set<string>>();
  const targetsBySlug = new Map<string, string>();
  const uniqueTargets = Array.from(new Set(relationFields.map((field) => field.targetSlug)));
  const targetRows = await client
    .select({ id: contentTypes.id, slug: contentTypes.slug })
    .from(contentTypes)
    .where(inArray(contentTypes.slug, uniqueTargets));
  for (const row of targetRows) {
    targetsBySlug.set(row.slug, row.id);
  }

  if (targetsBySlug.size !== uniqueTargets.length) {
    throw new Error("relation_target_not_found");
  }

  for (const field of relationFields) {
    const rawValue = data[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    const addId = (id: string) => {
      const bucket = idsByTarget.get(field.targetSlug) ?? new Set<string>();
      bucket.add(id);
      idsByTarget.set(field.targetSlug, bucket);
    };

    if (field.multiple) {
      if (!Array.isArray(rawValue)) {
        throw createEntryFieldError("relation_value_invalid", field.name);
      }
      for (const entryId of rawValue) {
        if (typeof entryId !== "string" || entryId.trim() === "") {
          throw createEntryFieldError("relation_value_invalid", field.name);
        }
        addId(entryId);
      }
    } else {
      if (Array.isArray(rawValue)) {
        throw createEntryFieldError("relation_value_invalid", field.name);
      }
      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        throw createEntryFieldError("relation_value_invalid", field.name);
      }
      addId(rawValue);
    }
  }

  for (const [targetSlug, ids] of idsByTarget.entries()) {
    const targetId = targetsBySlug.get(targetSlug);
    if (!targetId) continue;
    const idList = Array.from(ids);
    if (idList.length === 0) continue;

    const rows = await client
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(and(eq(contentEntries.typeId, targetId), inArray(contentEntries.id, idList)));

    const found = new Set(rows.map((row) => row.id));
    const missing = idList.filter((id) => !found.has(id));
    if (missing.length > 0) {
      const offendingField = relationFields.find((field) => {
        if (field.targetSlug !== targetSlug) return false;
        const rawValue = data[field.name];
        return Array.isArray(rawValue)
          ? rawValue.some((value) => missing.includes(String(value)))
          : typeof rawValue === "string" && missing.includes(rawValue);
      });
      throw createEntryFieldError("relation_entry_missing", offendingField?.name);
    }
  }
}

async function getContentSchema(typeId: string) {
  const [row] = await db.select().from(contentTypes).where(eq(contentTypes.id, typeId));
  return row ?? null;
}

async function ensureEntrySlugAvailable(typeId: string, slug: string, excludeEntryId?: string) {
  const rows = await db
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(
      excludeEntryId
        ? and(
            eq(contentEntries.typeId, typeId),
            eq(contentEntries.slug, slug),
            ne(contentEntries.id, excludeEntryId)
          )
        : and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug))
    );

  if (rows.length > 0) {
    throw createEntryFieldError("entry_slug_conflict", "slug");
  }
}

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
  await validateRelationEntries(contentSchema, entry.data, tx);
  await validateMediaAssets(contentSchema, entry.data, tx);
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
) => db.transaction(callback);

export type EntryMutationDeps = Readonly<{
  transaction: EntryTransactionRunner;
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

const resolveDuplicateTitle = (sourceTitle: string, index: number) => {
  if (index === 0) return `${sourceTitle} (Copy)`;
  return `${sourceTitle} (Copy ${index + 1})`;
};

const resolveDuplicateSlug = (sourceSlug: string, index: number) => {
  if (index === 0) return `${sourceSlug}-copy`;
  return `${sourceSlug}-copy-${index + 1}`;
};

const entryListSelection = {
  id: contentEntries.id,
  typeId: contentEntries.typeId,
  authorId: contentEntries.authorId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  status: contentEntries.status,
  visibility: contentEntries.visibility,
  hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
  tags: contentEntries.tags,
  data: contentEntries.data,
  publishedAt: contentEntries.publishedAt,
  scheduledAt: contentEntries.scheduledAt,
  createdAt: contentEntries.createdAt,
  updatedAt: contentEntries.updatedAt,
  authorName: users.name,
  authorEmail: users.email,
  authorEmailEncrypted: users.emailEncrypted,
};

type EntryListSelectionRow = {
  id: string;
  typeId: string;
  authorId: string | null;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  hasPassword: boolean;
  tags: unknown;
  data: unknown;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  authorEmail: string | null;
  authorEmailEncrypted: unknown;
};

const mapEntryListSelectionRow = (row: EntryListSelectionRow) => ({
  id: row.id,
  typeId: row.typeId,
  title: row.title,
  slug: row.slug,
  status: row.status as EntryStatus,
  visibility: row.visibility as EntryVisibility,
  hasPassword: row.hasPassword,
  tags: (row.tags ?? []) as string[],
  data: row.data as EntryData,
  publishedAt: row.publishedAt,
  scheduledAt: row.scheduledAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  author: row.authorId
    ? {
        id: row.authorId,
        name: row.authorName ?? null,
        email:
          resolveEmailValue({
            emailEncrypted: row.authorEmailEncrypted,
            email: row.authorEmail,
          }) ?? "",
      }
    : null,
});

export async function listEntries(typeId: string) {
  const rows = await db
    .select(entryListSelection)
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(eq(contentEntries.typeId, typeId))
    .orderBy(desc(contentEntries.updatedAt));

  return rows.map(mapEntryListSelectionRow);
}

/**
 * Listing-execution fetch with SQL pushdown (TASK-459-04). Unlike
 * `listEntries`, the published-only scope and the allowlisted `data.*`
 * superset predicates apply at the SQL level, so a filtered catalog request
 * no longer transfers the whole content type. The returned rows are a
 * SUPERSET of the in-memory matcher result for the originating query — the
 * caller (`executeListingQuery`) always re-runs the JS matcher on them.
 */
export async function listEntriesForListing(
  typeId: string,
  options: { publishedOnly: boolean; dataPredicates?: ListingPushdownPredicate[] }
) {
  const conditions: SQL[] = [];
  for (const predicate of options.dataPredicates ?? []) {
    conditions.push(buildEntryDataPredicateSql(predicate));
  }

  const rows = await db
    .select(entryListSelection)
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(
      and(
        eq(contentEntries.typeId, typeId),
        ...(options.publishedOnly
          ? [eq(contentEntries.status, "published"), isNotNull(contentEntries.publishedAt)]
          : []),
        ...conditions
      )
    )
    .orderBy(desc(contentEntries.updatedAt));

  return rows.map(mapEntryListSelectionRow);
}

export async function listEntriesWithContentTypes(): Promise<EntryListItem[]> {
  const rows = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
      contentTypeId: contentTypes.id,
      contentTypeSlug: contentTypes.slug,
      contentTypeName: contentTypes.name,
      contentTypeStatus: contentTypes.status,
    })
    .from(contentEntries)
    .innerJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .orderBy(desc(contentEntries.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    typeId: row.typeId,
    title: row.title,
    slug: row.slug,
    status: row.status as EntryStatus,
    visibility: row.visibility as EntryVisibility,
    hasPassword: row.hasPassword,
    tags: (row.tags ?? []) as string[],
    data: row.data as EntryData,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName ?? null,
          email:
            resolveEmailValue({
              emailEncrypted: row.authorEmailEncrypted,
              email: row.authorEmail,
            }) ?? "",
        }
      : null,
    contentType: {
      id: row.contentTypeId,
      slug: row.contentTypeSlug,
      name: row.contentTypeName,
      status: row.contentTypeStatus,
    },
  }));
}

export async function getEntry(id: string): Promise<EntryDetail | null> {
  const [row] = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(contentEntries)
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(eq(contentEntries.id, id));

  if (!row) return null;

  const seo = await getSeoDocumentByTarget("entry", row.id);
  const taxonomy = await getEntryTaxonomies(row.id);

  return {
    id: row.id,
    typeId: row.typeId,
    title: row.title,
    slug: row.slug,
    status: row.status as EntryStatus,
    visibility: row.visibility as EntryVisibility,
    hasPassword: row.hasPassword,
    tags: (row.tags ?? []) as string[],
    data: row.data as EntryData,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName ?? null,
          email:
            resolveEmailValue({
              emailEncrypted: row.authorEmailEncrypted,
              email: row.authorEmail,
            }) ?? "",
        }
      : null,
    seo: seo
      ? {
          title: seo.title ?? null,
          description: seo.description ?? null,
          canonicalUrl: seo.canonicalUrl ?? null,
          robots: seo.robots ?? null,
        }
      : null,
    taxonomy,
  };
}

export async function deleteEntry(id: string) {
  const [row] = await db
    .delete(contentEntries)
    .where(eq(contentEntries.id, id))
    .returning(ENTRY_DELETE_FIELDS);
  return row ?? null;
}

export async function getEntryBySlug(typeId: string, slug: string) {
  // TASK-514-01: explicit WIDE projection — every content_entries column EXCEPT
  // access_password (the hashed secret must never leave the server), plus the
  // derived hasPassword flag. Callers read a broad field set (title/slug/status/
  // data/id/publishedAt/…), so this projection preserves them all.
  const [row] = await db
    .select({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      authorId: contentEntries.authorId,
      slug: contentEntries.slug,
      title: contentEntries.title,
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,
      tags: contentEntries.tags,
      data: contentEntries.data,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      createdAt: contentEntries.createdAt,
      updatedAt: contentEntries.updatedAt,
    })
    .from(contentEntries)
    .where(and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug)));
  return row ?? null;
}

export async function createEntry(typeId: string, input: CreateEntryInput) {
  const contentType = await getContentSchema(typeId);
  if (!contentType) throw new Error("content_type_not_found");

  await ensureEntrySlugAvailable(typeId, input.slug);
  validateEntryData(typeId, contentType.schema as ContentSchema, input.data);
  await validateRelationEntries(contentType.schema as ContentSchema, input.data, db);
  await validateMediaAssets(contentType.schema as ContentSchema, input.data, db);

  // TASK-514-01: visibility relies on the DDL default ('public'); the create
  // drawer does not send it. Route the return through the narrowed getEntry
  // (mirrors duplicateEntry) so the create response carries visibility +
  // hasPassword and NEVER access_password (the create route returns this row
  // directly to the client).
  const [row] = await db
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
  const detail = await getEntry(row.id);
  if (!detail) throw new Error("entry_create_failed");
  return detail;
}

export async function duplicateEntry(entryId: string, actorId?: string | null) {
  const source = await getEntry(entryId);
  if (!source) throw new Error("entry_not_found");

  let createdId: string | null = null;
  let createdTitle: string | null = null;
  let createdSlug: string | null = null;

  for (let index = 0; index < 100; index += 1) {
    const nextTitle = resolveDuplicateTitle(source.title, index);
    const nextSlug = resolveDuplicateSlug(source.slug, index);

    try {
      await ensureEntrySlugAvailable(source.typeId, nextSlug);

      const [created] = await db
        .insert(contentEntries)
        .values({
          typeId: source.typeId,
          authorId: actorId ?? source.author?.id ?? null,
          title: nextTitle,
          slug: nextSlug,
          status: "draft",
          // TASK-514-01: copy visibility but NEVER copy the access password hash.
          // If the source was password-gated, downgrade the copy to 'private' so
          // it is never silently public and never left password-gated without a
          // password (access_password stays null → hasPassword:false).
          visibility: source.visibility === "password" ? "private" : source.visibility,
          tags: source.tags,
          data: source.data,
          publishedAt: null,
          scheduledAt: null,
        })
        .returning({ id: contentEntries.id });

      if (!created) throw new Error("entry_duplicate_failed");
      createdId = created.id;
      createdTitle = nextTitle;
      createdSlug = nextSlug;
      break;
    } catch (error) {
      if (error instanceof Error && error.message === "entry_slug_conflict") {
        continue;
      }
      throw error;
    }
  }

  if (!createdId || !createdTitle || !createdSlug) {
    throw new Error("entry_duplicate_failed");
  }

  const sourceAssignments = await db
    .select({ termId: contentTermAssignments.termId })
    .from(contentTermAssignments)
    .where(eq(contentTermAssignments.entryId, entryId));

  if (sourceAssignments.length > 0) {
    await db.insert(contentTermAssignments).values(
      sourceAssignments.map((assignment) => ({
        entryId: createdId as string,
        termId: assignment.termId,
      }))
    );
  }

  if (source.seo) {
    await upsertSeoDocument({
      targetType: "entry",
      targetId: createdId,
      slug: normalizeSeoSlug(createdSlug),
      title: source.seo.title ?? createdTitle,
      description: source.seo.description ?? undefined,
      canonicalUrl: source.seo.canonicalUrl ?? undefined,
      robots: source.seo.robots ?? undefined,
    });
  }

  return getEntry(createdId);
}

export async function updateEntry(id: string, input: UpdateEntryInput) {
  const [entry] = await db
    .select(ENTRY_UPDATE_FIELDS)
    .from(contentEntries)
    .where(eq(contentEntries.id, id))
    .limit(1);
  if (!entry) throw new Error("entry_not_found");

  const contentType = await getContentSchema(entry.typeId);
  if (!contentType) throw new Error("content_type_not_found");

  const nextSlug = input.slug ?? entry.slug;
  await ensureEntrySlugAvailable(entry.typeId, nextSlug, entry.id);

  const nextData = input.data ?? (entry.data as EntryData);
  validateEntryData(entry.typeId, contentType.schema as ContentSchema, nextData);
  await validateRelationEntries(contentType.schema as ContentSchema, nextData, db);
  await validateMediaAssets(contentType.schema as ContentSchema, nextData, db);

  await db
    .update(contentEntries)
    .set({
      title: input.title ?? entry.title,
      slug: nextSlug,
      data: nextData,
      updatedAt: new Date(),
    })
    .where(eq(contentEntries.id, entry.id));

  if (input.title || input.slug) {
    await upsertSeoDocument({
      targetType: "entry",
      targetId: entry.id,
      title: input.title ?? entry.title,
      slug: normalizeSeoSlug(nextSlug),
    });
  }

  return getEntry(entry.id);
}

export async function publishEntry(entryId: string, userId: string) {
  const committed = await entryMutationDeps.transaction(async (tx) => {
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
    };
  });

  if (committed.updated) {
    await applyEntryPostCommitCache(entryMutationDeps, {
      changed: true,
      seoChanged: false,
      cacheRef: committed.cacheRef,
    });
  }

  return committed.updated;
}

export async function unpublishEntry(entryId: string) {
  const [row] = await db
    .update(contentEntries)
    .set({
      status: "draft",
      publishedAt: null,
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(contentEntries.id, entryId))
    .returning(ENTRY_CACHE_FIELDS);

  if (row) {
    const contentType = await getContentType(row.typeId);
    if (contentType) {
      await invalidateContentEntryCache({
        typeSlug: contentType.slug,
        entrySlug: row.slug,
        entryId: row.id,
      });
    }
  }

  return row ?? null;
}

export async function coordinateEntryMetadataMutation(
  deps: EntryMutationDeps,
  entryId: string,
  input: UpdateEntryMetadataInput,
  actorId: string | undefined,
  mutationAuthorization: EntryMutationAuthorization
) {
  const committed = await deps.transaction(async (tx) => {
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
      | { kind?: unknown; authorize?: unknown }
      | null
      | undefined;
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

export async function listEntryRevisions(entryId: string) {
  return db
    .select()
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, entryId))
    .orderBy(desc(contentRevisions.version));
}

export async function createEntryRevision(entryId: string, data: EntryData, userId: string) {
  return createEntryRevisionTx(db, entryId, data, userId);
}

export async function createEntryRevisionTx(
  tx: DbClient,
  entryId: string,
  data: EntryData,
  userId: string
) {
  const [{ value }] = await tx
    .select({ value: max(contentRevisions.version) })
    .from(contentRevisions)
    .where(eq(contentRevisions.entryId, entryId));

  const nextVersion = (value ?? 0) + 1;

  const [row] = await tx
    .insert(contentRevisions)
    .values({
      entryId,
      version: nextVersion,
      data,
      createdBy: userId,
    })
    .returning();

  return row ?? null;
}

export async function createEntryPreview(entryId: string, ttlMinutes?: number) {
  return createPreviewToken({
    targetType: "content",
    targetId: entryId,
    ttlMinutes,
  });
}
