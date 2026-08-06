import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  type MemoryBackedStorageCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "integer" | "boolean" | "array";
  items?: { type?: "string"; enum?: string[] };
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean | string[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  maxItems?: number;
  xFieldType?: string;
  xFieldConfig?: Record<string, unknown>;
  xRelationTarget?: string;
};

export type ContentSchema = {
  type: "object";
  additionalProperties: false;
  required?: string[];
  properties: Record<string, ContentSchemaProperty>;
};

// Client MIRROR of the server-authoritative config shape defined in
// core/services/content/contentTypeConfig.ts (kept in sync). The admin UI CANNOT import
// typeService.ts (server-only `db`), so 513-03/513-04 import these types + the resolve helpers
// below from here.
export type ContentTypePermissionCapabilities = {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  publish?: boolean;
};

export type ContentTypeConfig = {
  singularName?: string;
  pluralName?: string;
  draftsEnabled?: boolean; // resolved default true
  versioning?: boolean; // resolved default false
  permissions?: Record<string, ContentTypePermissionCapabilities>;
};

// Canonical, pure (no db/Bun) resolved-default helpers — UI-importable source for 513-03.
export function resolveDraftsEnabled(cfg: ContentTypeConfig | undefined): boolean {
  return cfg?.draftsEnabled ?? true;
}

export function resolveVersioning(cfg: ContentTypeConfig | undefined): boolean {
  return cfg?.versioning ?? false;
}

export type ContentTypeSummary = {
  id: string;
  name: string;
  slug: string;
  schema: ContentSchema;
  status: "draft" | "published";
  config?: ContentTypeConfig;
  createdAt: string;
  updatedAt: string;
  entryCount?: number;
};

export type ContentTypePayload = {
  name: string;
  slug: string;
  schema: ContentSchema;
  status?: "draft" | "published";
  config?: ContentTypeConfig;
};

export type CollectionWorkspaceResourceKind =
  "contentRoute" | "detailPage" | "listPage" | "listingQuery" | "listingTemplate" | "adminScreen";

export type CollectionWorkspaceUnresolvedReason =
  | "missing_content_route"
  | "canonical_resolution_deferred"
  | "explicit_link_missing"
  | "ambiguous_candidates"
  | "permission_missing";

export type CollectionWorkspaceUnresolved = {
  resource: CollectionWorkspaceResourceKind;
  reason: CollectionWorkspaceUnresolvedReason;
};

export type CollectionWorkspaceRouteSummary = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export type CollectionWorkspaceCandidate = {
  id: string;
  label: string;
  status?: string | null;
  slug?: string | null;
  role?: string | null;
  compositionKey?: string | null;
  updatedAt?: string | null;
};

export type ContentTypeCollectionWorkspaceSummary = {
  contentType: {
    id: string;
    name: string;
    slug: string;
    status: string;
    fieldCount: number;
    updatedAt: string;
  };
  canonical: {
    contentRoute: CollectionWorkspaceRouteSummary | null;
    detailPage: CollectionWorkspaceCandidate | null;
    listPage: CollectionWorkspaceCandidate | null;
    listingQuery: CollectionWorkspaceCandidate | null;
    listingTemplate: CollectionWorkspaceCandidate | null;
    adminScreen: CollectionWorkspaceCandidate | null;
  };
  linkedSecondary: {
    pages: CollectionWorkspaceCandidate[];
    adminScreens: CollectionWorkspaceCandidate[];
  };
  unresolved: CollectionWorkspaceUnresolved[];
  candidates: {
    detailPages: CollectionWorkspaceCandidate[];
    pages: CollectionWorkspaceCandidate[];
    listingQueries: CollectionWorkspaceCandidate[];
    listingTemplates: CollectionWorkspaceCandidate[];
    adminScreens: CollectionWorkspaceCandidate[];
  };
};

let cachedContentTypesPromise: Promise<ContentTypeSummary[]> | null = null;
const collectionWorkspacePromiseById = new Map<
  string,
  Promise<ContentTypeCollectionWorkspaceSummary>
>();
const collectionWorkspaceCacheById = new Map<
  string,
  MemoryBackedStorageCache<ContentTypeCollectionWorkspaceSummary>
>();

const isContentTypeList = (value: unknown): value is ContentTypeSummary[] => Array.isArray(value);

const isContentType = (value: unknown): value is ContentTypeSummary =>
  Boolean(value && typeof value === "object");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>) =>
  Object.keys(value).every((key) => keys.has(key));

const isNullableString = (value: unknown) =>
  value === null || value === undefined || typeof value === "string";

const collectionWorkspaceResources = new Set<string>([
  "contentRoute",
  "detailPage",
  "listPage",
  "listingQuery",
  "listingTemplate",
  "adminScreen",
]);

const collectionWorkspaceReasons = new Set<string>([
  "missing_content_route",
  "canonical_resolution_deferred",
  "explicit_link_missing",
  "ambiguous_candidates",
  "permission_missing",
]);

const contentTypeCollectionWorkspaceKeys = new Set([
  "contentType",
  "canonical",
  "linkedSecondary",
  "unresolved",
  "candidates",
]);
const contentTypeCollectionWorkspaceContentTypeKeys = new Set([
  "id",
  "name",
  "slug",
  "status",
  "fieldCount",
  "updatedAt",
]);
const collectionWorkspaceCanonicalKeys = new Set([
  "contentRoute",
  "detailPage",
  "listPage",
  "listingQuery",
  "listingTemplate",
  "adminScreen",
]);
const collectionWorkspaceLinkedSecondaryKeys = new Set(["pages", "adminScreens"]);
const collectionWorkspaceCandidatesKeys = new Set([
  "detailPages",
  "pages",
  "listingQueries",
  "listingTemplates",
  "adminScreens",
]);
const collectionWorkspaceRouteKeys = new Set([
  "type",
  "listPath",
  "detailPath",
  "enabled",
  "detailPageId",
]);
const collectionWorkspaceCandidateKeys = new Set([
  "id",
  "label",
  "status",
  "slug",
  "role",
  "compositionKey",
  "updatedAt",
]);
const collectionWorkspaceUnresolvedKeys = new Set(["resource", "reason"]);

const isCollectionWorkspaceRouteSummary = (
  value: unknown
): value is CollectionWorkspaceRouteSummary => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, collectionWorkspaceRouteKeys)) return false;
  if (typeof value.type !== "string") return false;
  if (typeof value.listPath !== "string") return false;
  if (typeof value.detailPath !== "string") return false;
  if (typeof value.enabled !== "boolean") return false;
  return (
    !Object.prototype.hasOwnProperty.call(value, "detailPageId") ||
    isNullableString(value.detailPageId)
  );
};

const isCollectionWorkspaceCandidate = (value: unknown): value is CollectionWorkspaceCandidate => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, collectionWorkspaceCandidateKeys)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.label !== "string") return false;
  return (
    isNullableString(value.status) &&
    isNullableString(value.slug) &&
    isNullableString(value.role) &&
    isNullableString(value.compositionKey) &&
    isNullableString(value.updatedAt)
  );
};

const isCollectionWorkspaceCandidateList = (value: unknown) =>
  Array.isArray(value) && value.every(isCollectionWorkspaceCandidate);

const isCollectionWorkspaceUnresolved = (
  value: unknown
): value is CollectionWorkspaceUnresolved => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, collectionWorkspaceUnresolvedKeys)) return false;
  return (
    typeof value.resource === "string" &&
    collectionWorkspaceResources.has(value.resource) &&
    typeof value.reason === "string" &&
    collectionWorkspaceReasons.has(value.reason)
  );
};

const isContentTypeCollectionWorkspaceSummary = (
  value: unknown
): value is ContentTypeCollectionWorkspaceSummary => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, contentTypeCollectionWorkspaceKeys)) return false;
  const contentType = value.contentType;
  const canonical = value.canonical;
  const linkedSecondary = value.linkedSecondary;
  const candidates = value.candidates;
  if (!isRecord(contentType)) return false;
  if (!hasOnlyKeys(contentType, contentTypeCollectionWorkspaceContentTypeKeys)) {
    return false;
  }
  if (typeof contentType.id !== "string") return false;
  if (typeof contentType.name !== "string") return false;
  if (typeof contentType.slug !== "string") return false;
  if (typeof contentType.status !== "string") return false;
  if (typeof contentType.fieldCount !== "number") return false;
  if (typeof contentType.updatedAt !== "string") return false;
  if (!isRecord(canonical)) return false;
  if (!hasOnlyKeys(canonical, collectionWorkspaceCanonicalKeys)) return false;
  if (
    canonical.contentRoute !== null &&
    !isCollectionWorkspaceRouteSummary(canonical.contentRoute)
  ) {
    return false;
  }
  if (canonical.detailPage !== null && !isCollectionWorkspaceCandidate(canonical.detailPage)) {
    return false;
  }
  if (canonical.listPage !== null && !isCollectionWorkspaceCandidate(canonical.listPage)) {
    return false;
  }
  if (canonical.listingQuery !== null && !isCollectionWorkspaceCandidate(canonical.listingQuery)) {
    return false;
  }
  if (
    canonical.listingTemplate !== null &&
    !isCollectionWorkspaceCandidate(canonical.listingTemplate)
  ) {
    return false;
  }
  if (canonical.adminScreen !== null && !isCollectionWorkspaceCandidate(canonical.adminScreen)) {
    return false;
  }
  if (!isRecord(linkedSecondary)) return false;
  if (!hasOnlyKeys(linkedSecondary, collectionWorkspaceLinkedSecondaryKeys)) {
    return false;
  }
  if (!isCollectionWorkspaceCandidateList(linkedSecondary.pages)) return false;
  if (!isCollectionWorkspaceCandidateList(linkedSecondary.adminScreens)) return false;
  if (
    !Array.isArray(value.unresolved) ||
    !value.unresolved.every(isCollectionWorkspaceUnresolved)
  ) {
    return false;
  }
  if (!isRecord(candidates)) return false;
  if (!hasOnlyKeys(candidates, collectionWorkspaceCandidatesKeys)) return false;
  return (
    isCollectionWorkspaceCandidateList(candidates.detailPages) &&
    isCollectionWorkspaceCandidateList(candidates.pages) &&
    isCollectionWorkspaceCandidateList(candidates.listingQueries) &&
    isCollectionWorkspaceCandidateList(candidates.listingTemplates) &&
    isCollectionWorkspaceCandidateList(candidates.adminScreens)
  );
};

const contentTypesListCache = createMemoryBackedLocalCache({
  key: cacheKeys.contentTypesList,
  ttlMs: cacheTtlMs.list,
  validate: isContentTypeList,
});

const writeContentTypeDetailCache = (item: ContentTypeSummary) => {
  writeLocalCache(cacheKeys.contentTypeDetail(item.id), item);
};

const readContentTypeDetailCache = (id: string) =>
  readLocalCache(cacheKeys.contentTypeDetail(id), cacheTtlMs.detail, isContentType);

const getCollectionWorkspaceCache = (id: string) => {
  const existing = collectionWorkspaceCacheById.get(id);
  if (existing) return existing;
  const cache = createMemoryBackedLocalCache({
    key: cacheKeys.contentTypeCollectionWorkspace(id),
    ttlMs: cacheTtlMs.detail,
    validate: isContentTypeCollectionWorkspaceSummary,
  });
  collectionWorkspaceCacheById.set(id, cache);
  return cache;
};

const primeContentTypesCacheInternal = (items: ContentTypeSummary[]) => {
  contentTypesListCache.write(items);
};

const revokeContentTypesListRead = () => {
  cachedContentTypesPromise = null;
};

const upsertCachedContentType = (item: ContentTypeSummary) => {
  const current = contentTypesListCache.read() ?? [];
  const index = current.findIndex((cached) => cached.id === item.id);
  const next = [...current];
  if (index == -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeContentTypesCacheInternal(next);
  writeContentTypeDetailCache(item);
};

const removeCachedContentType = (id: string) => {
  const current = contentTypesListCache.read();
  if (current) {
    primeContentTypesCacheInternal(current.filter((item) => item.id !== id));
  }
  clearLocalCache(cacheKeys.contentTypeDetail(id));
  clearContentTypeCollectionWorkspaceCache(id);
};

export const getCachedContentTypes = () => {
  return contentTypesListCache.read();
};

export const primeContentTypesCache = (items: ContentTypeSummary[]) => {
  revokeContentTypesListRead();
  primeContentTypesCacheInternal(items);
};

export const clearContentTypesCache = () => {
  revokeContentTypesListRead();
  contentTypesListCache.clear();
  for (const cache of collectionWorkspaceCacheById.values()) {
    cache.clear();
  }
  collectionWorkspaceCacheById.clear();
  collectionWorkspacePromiseById.clear();
};

export async function listContentTypes() {
  return apiRequest<ContentTypeSummary[]>("/content-types", { method: "GET" });
}

export function listContentTypesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedContentTypes();
    if (cached) return Promise.resolve(cached);
    if (cachedContentTypesPromise) return cachedContentTypesPromise;
  }

  let request: Promise<ContentTypeSummary[]>;
  request = listContentTypes()
    .then((items) => {
      if (cachedContentTypesPromise === request) {
        primeContentTypesCacheInternal(items);
      }
      return items;
    })
    .finally(() => {
      if (cachedContentTypesPromise === request) {
        cachedContentTypesPromise = null;
      }
    });
  cachedContentTypesPromise = request;
  return request;
}

export async function getContentType(id: string) {
  return apiRequest<ContentTypeSummary>(`/content-types/${id}`, { method: "GET" });
}

export async function getContentTypeCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cachedDetail = readContentTypeDetailCache(id);
    if (cachedDetail) return cachedDetail;
    const cached = getCachedContentTypes();
    const match = cached?.find((item) => item.id === id);
    if (match) return match;
  }
  const result = await getContentType(id);
  if (result) upsertCachedContentType(result);
  return result;
}

export const getCachedContentTypeCollectionWorkspace = (id: string) =>
  getCollectionWorkspaceCache(id).read();

export const clearContentTypeCollectionWorkspaceCache = (id: string) => {
  collectionWorkspacePromiseById.delete(id);
  const cache = collectionWorkspaceCacheById.get(id);
  if (cache) {
    cache.clear();
    return;
  }
  clearLocalCache(cacheKeys.contentTypeCollectionWorkspace(id));
};

export async function getContentTypeCollectionWorkspace(id: string) {
  return apiRequest<ContentTypeCollectionWorkspaceSummary>(
    `/content-types/${encodeURIComponent(id)}/collection-workspace`,
    { method: "GET" }
  );
}

export async function getContentTypeCollectionWorkspaceCached(
  id: string,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cached = getCachedContentTypeCollectionWorkspace(id);
    if (cached) return cached;
    const inFlight = collectionWorkspacePromiseById.get(id);
    if (inFlight) return inFlight;
  }

  const request = getContentTypeCollectionWorkspace(id)
    .then((summary) => {
      getCollectionWorkspaceCache(id).write(summary);
      return summary;
    })
    .finally(() => {
      collectionWorkspacePromiseById.delete(id);
    });
  collectionWorkspacePromiseById.set(id, request);
  return request;
}

export async function getContentTypeBySlug(slug: string) {
  const types = await listContentTypesCached();
  return types.find((type) => type.slug === slug) ?? null;
}

export async function createContentType(payload: ContentTypePayload) {
  const created = await apiRequest<ContentTypeSummary>(
    "/content-types",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    revokeContentTypesListRead();
    upsertCachedContentType(created);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.contentTypeDetail(created.id), action: "update" });
  }
  return created;
}

export async function duplicateContentType(
  id: string,
  payload: { name?: string; slug?: string } = {}
) {
  const duplicated = await apiRequest<ContentTypeSummary>(
    `/content-types/${id}/duplicate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (duplicated) {
    revokeContentTypesListRead();
    upsertCachedContentType(duplicated);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.contentTypeDetail(duplicated.id),
      action: "update",
    });
  }
  return duplicated;
}

export async function updateContentType(id: string, payload: Partial<ContentTypePayload>) {
  const updated = await apiRequest<ContentTypeSummary>(
    `/content-types/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    revokeContentTypesListRead();
    upsertCachedContentType(updated);
    clearContentTypeCollectionWorkspaceCache(id);
    clearContentTypeCollectionWorkspaceCache(updated.id);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.contentTypeDetail(updated.id), action: "update" });
    broadcastCacheEvent({
      key: cacheKeys.contentTypeCollectionWorkspace(updated.id),
      action: "invalidate",
    });
  }
  return updated;
}

export async function deleteContentType(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/content-types/${id}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    revokeContentTypesListRead();
    removeCachedContentType(id);
    broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.contentTypeDetail(id), action: "invalidate" });
    broadcastCacheEvent({
      key: cacheKeys.contentTypeCollectionWorkspace(id),
      action: "invalidate",
    });
  }
  return result;
}
