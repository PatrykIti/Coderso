import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";

export type PageStatus = "draft" | "published" | "scheduled" | "archived";

export type PageAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageSummary = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  updatedAt: string;
  author: PageAuthor | null;
};

export type PageDetail = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  currentData: Record<string, unknown>;
  publishedData?: Record<string, unknown> | null;
  updatedAt: string;
  publishedAt?: string | null;
  authorId?: string | null;
  author?: PageAuthor | null;
};

export type PagePayload = {
  title: string;
  slug: string;
  template?: string;
  data: Record<string, unknown>;
};

export type PageAutosavePayload = Partial<PagePayload>;

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
  probe?: PreviewProbeResult;
};

export type PreviewProbeFailureReason =
  | "unreachable"
  | "http_error"
  | "redirect_blocked"
  | "timeout"
  | "invalid_target";

export type PreviewProbeResult =
  | {
      ok: true;
      status?: number;
      targetLabel: string;
    }
  | {
      ok: false;
      status?: number;
      reason: PreviewProbeFailureReason;
      targetLabel: string;
    };

export type PreviewPageOptions = {
  ttlMinutes?: number;
  probe?: boolean;
};

export type PageRevisionKind = "publish" | "autosave";

export type PageRevision = {
  id: string;
  pageId: string;
  version: number;
  kind: PageRevisionKind;
  title?: string | null;
  slug?: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: PageAuthor | null;
};

export type PageAutosaveResponse = {
  savedAt: string;
  reusedRevision: boolean;
  revision: PageRevision;
};

export type PageTemplateOption = {
  key: string;
  label: string;
};

export type PageTemplateOptionsResponse = {
  themeName: string;
  templates: PageTemplateOption[];
};

let cachedPagesPromise: Promise<PageSummary[]> | null = null;

const isPageList = (value: unknown): value is PageSummary[] => Array.isArray(value);

const pagesListCache = createMemoryBackedLocalCache({
  key: cacheKeys.pagesList,
  ttlMs: cacheTtlMs.list,
  validate: isPageList,
});

const isPageDetail = (value: unknown): value is PageDetail =>
  Boolean(value && typeof value === "object");

const isPageDetailPayload = (value: PageSummary | PageDetail): value is PageDetail =>
  "currentData" in value;

const hasAuthorField = (page: PageSummary | PageDetail) =>
  Object.prototype.hasOwnProperty.call(page, "author");

const toPageSummaryPatch = (page: PageSummary | PageDetail) => {
  const patch: Partial<PageSummary> &
    Pick<PageSummary, "id" | "title" | "slug" | "status" | "updatedAt"> = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    updatedAt: page.updatedAt,
  };
  if (hasAuthorField(page)) {
    patch.author = page.author ?? null;
  }
  return patch;
};

const readPagesCache = () => pagesListCache.read();

const readPageDetailCache = (id: string) =>
  readLocalCache(cacheKeys.pageDetail(id), cacheTtlMs.detail, isPageDetail);

const writePageDetailCache = (page: PageDetail) => {
  writeLocalCache(cacheKeys.pageDetail(page.id), page);
};

const primePagesCacheInternal = (items: PageSummary[]) => {
  cachedPagesPromise = null;
  pagesListCache.write(items);
};

const mergeCachedPageIntoList = (page: PageSummary | PageDetail) => {
  const current = readPagesCache() ?? [];
  const summaryPatch = toPageSummaryPatch(page);
  const index = current.findIndex((item) => item.id === summaryPatch.id);
  const next = [...current];
  if (index === -1) {
    if (hasAuthorField(page)) {
      next.unshift(summaryPatch as PageSummary);
    }
  } else {
    next[index] = { ...next[index], ...summaryPatch };
  }
  if (
    next.length !== current.length ||
    next.some((item, itemIndex) => item !== current[itemIndex])
  ) {
    primePagesCacheInternal(next);
  }
  if (isPageDetailPayload(page)) {
    writePageDetailCache(page);
  }
};

const updateCachedPageStatus = (id: string, status: PageStatus) => {
  const current = readPagesCache();
  if (current) {
    primePagesCacheInternal(current.map((item) => (item.id === id ? { ...item, status } : item)));
  }
  const detail = readPageDetailCache(id);
  if (detail) {
    writePageDetailCache({ ...detail, status });
  }
};

const removeCachedPage = (id: string) => {
  const current = readPagesCache();
  clearLocalCache(cacheKeys.pageDetail(id));
  if (!current) return;
  primePagesCacheInternal(current.filter((item) => item.id !== id));
};

const previewProbeFailureReasons = new Set<PreviewProbeFailureReason>([
  "unreachable",
  "http_error",
  "redirect_blocked",
  "timeout",
  "invalid_target",
]);

const sanitizePreviewTargetLabel = (value: unknown) => {
  const fallback = "preview target";
  if (typeof value !== "string") return fallback;
  try {
    const parsed = new URL(value, "http://localhost");
    parsed.searchParams.delete("token");
    parsed.searchParams.delete("device");
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
      return `${parsed.origin}${parsed.pathname || "/"}`;
    }
    return `${parsed.pathname}${parsed.search}` || fallback;
  } catch {
    const redacted = value
      .replace(/([?&]token=)[^&]+/gi, "$1<redacted>")
      .replace(/([?&]device=)[^&]+/gi, "$1<redacted>")
      .trim();
    return redacted || fallback;
  }
};

const normalizePreviewProbe = (value: unknown): PreviewProbeResult | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const status =
    typeof record.status === "number" && Number.isFinite(record.status) ? record.status : undefined;
  const targetLabel = sanitizePreviewTargetLabel(record.targetLabel);

  if (record.ok === true) {
    return {
      ok: true,
      ...(status === undefined ? {} : { status }),
      targetLabel,
    };
  }

  if (
    record.ok === false &&
    previewProbeFailureReasons.has(record.reason as PreviewProbeFailureReason)
  ) {
    return {
      ok: false,
      ...(status === undefined ? {} : { status }),
      reason: record.reason as PreviewProbeFailureReason,
      targetLabel,
    };
  }

  return undefined;
};

const normalizePreviewResponse = (value: unknown): PreviewResponse => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const probe = normalizePreviewProbe(record.probe);
  return {
    token: typeof record.token === "string" ? record.token : "",
    previewUrl: typeof record.previewUrl === "string" ? record.previewUrl : "",
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : "",
    ...(probe ? { probe } : {}),
  };
};

export const getCachedPages = () => readPagesCache();

export const getCachedPageDetail = (id: string) => readPageDetailCache(id);

export const clearPagesCache = () => {
  cachedPagesPromise = null;
  pagesListCache.clear();
};

export async function listPages() {
  return apiRequest<PageSummary[]>("/pages", { method: "GET" });
}

export async function listPagesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPages();
    if (cached) return cached;
    if (cachedPagesPromise) return cachedPagesPromise;
  }
  const request = listPages();
  cachedPagesPromise = request;
  const items = await request;
  primePagesCacheInternal(items);
  return items;
}

export async function getPage(id: string) {
  return apiRequest<PageDetail>(`/pages/${id}`, { method: "GET" });
}

export async function getPageCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cachedDetail = readPageDetailCache(id);
    if (cachedDetail) return cachedDetail;
  }
  const result = await getPage(id);
  if (result) mergeCachedPageIntoList(result);
  return result;
}

export async function createPage(payload: PagePayload) {
  const created = await apiRequest<PageDetail>(
    "/pages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    writePageDetailCache(created);
    clearPagesCache();
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(created.id), action: "update" });
  }
  return created;
}

export async function updatePage(id: string, payload: Partial<PagePayload>) {
  const updated = await apiRequest<PageDetail>(
    `/pages/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    mergeCachedPageIntoList(updated);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function autosavePage(id: string, payload: PageAutosavePayload) {
  return apiRequest<PageAutosaveResponse>(
    `/pages/${id}/autosave`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export type PagePublishResponse = {
  ok: boolean;
  page?: PageDetail | null;
};

export async function publishPage(id: string, data?: Record<string, unknown>) {
  const result = await apiRequest<PagePublishResponse>(
    `/pages/${id}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data ? { data } : {}),
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    if (result.page && isPageDetail(result.page) && isPageDetailPayload(result.page)) {
      // Publish persists the published document as the draft too; merge the
      // post-publish detail so cached `currentData` never resurrects a stale
      // draft after an editor reload.
      mergeCachedPageIntoList(result.page);
    } else {
      updateCachedPageStatus(id, "published");
    }
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(id), action: "update" });
  }
  return result;
}

export async function unpublishPage(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/pages/${id}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    updateCachedPageStatus(id, "draft");
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(id), action: "update" });
  }
  return result;
}

export async function previewPage(id: string, ttlMinutesOrOptions?: number | PreviewPageOptions) {
  const options =
    typeof ttlMinutesOrOptions === "number"
      ? { ttlMinutes: ttlMinutesOrOptions }
      : (ttlMinutesOrOptions ?? {});
  const body: PreviewPageOptions = {};
  if (options.ttlMinutes !== undefined) body.ttlMinutes = options.ttlMinutes;
  if (options.probe !== undefined) body.probe = options.probe;
  const response = await apiRequest<unknown>(
    `/pages/${id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { withCsrf: true }
  );
  return normalizePreviewResponse(response);
}

export async function duplicatePage(id: string) {
  const clone = await apiRequest<PageDetail>(
    `/pages/${id}/duplicate`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (clone) {
    writePageDetailCache(clone);
    clearPagesCache();
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(clone.id), action: "update" });
  }
  return clone;
}

export async function listPageRevisions(id: string) {
  return apiRequest<PageRevision[]>(`/pages/${id}/revisions`, { method: "GET" });
}

export async function restorePageRevision(id: string, revisionId: string) {
  const result = await apiRequest<{
    ok: boolean;
    restored: boolean;
    revision: PageRevision;
    page: PageDetail;
  }>(`/pages/${id}/revisions/${revisionId}/restore`, { method: "POST" }, { withCsrf: true });
  if (result?.page) {
    mergeCachedPageIntoList(result.page);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(result.page.id), action: "update" });
  }
  return result;
}

export async function discardPageRevision(id: string, revisionId: string) {
  return apiRequest<{ ok: boolean }>(
    `/pages/${id}/revisions/${revisionId}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}

export async function deletePage(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/pages/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedPage(id);
    broadcastCacheEvent({ key: cacheKeys.pagesList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.pageDetail(id), action: "invalidate" });
  }
  return result;
}

export async function getPageTemplateOptions() {
  return apiRequest<PageTemplateOptionsResponse>("/pages/template-options", {
    method: "GET",
  });
}
