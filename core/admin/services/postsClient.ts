import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type PostStatus = "draft" | "published" | "scheduled" | "archived";

export type PostAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PostSeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type PostTaxonomyTerm = {
  id: string;
  name: string;
  slug: string;
};

export type PostTaxonomy = {
  category?: PostTaxonomyTerm | null;
  tags?: PostTaxonomyTerm[];
};

export type PostSummary = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: PostStatus;
  data: Record<string, unknown>;
  tags?: string[];
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  author?: PostAuthor | null;
  seo?: PostSeo | null;
};

export type PostDetail = PostSummary & {
  taxonomy?: PostTaxonomy | null;
};

export type PostPayload = {
  title: string;
  slug?: string;
  data?: Record<string, unknown>;
};

export type PostMetadataPayload = {
  status?: PostStatus;
  scheduledAt?: string | null;
  tags?: string[];
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: PostSeo;
};

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

let cachedPosts: PostSummary[] | null = null;
let cachedPostsPromise: Promise<PostSummary[]> | null = null;
const cachedPostDetails = new Map<string, PostDetail>();

const isPostList = (value: unknown): value is PostSummary[] => Array.isArray(value);
const isPostDetail = (value: unknown): value is PostDetail =>
  Boolean(value && typeof value === "object");

const toPostSummary = (post: PostSummary | PostDetail): PostSummary => ({
  id: post.id,
  typeId: post.typeId,
  title: post.title,
  slug: post.slug,
  status: post.status,
  data: post.data,
  tags: post.tags,
  scheduledAt: post.scheduledAt,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  publishedAt: post.publishedAt,
  author: post.author ?? null,
  seo: post.seo ?? null,
});

const toPostDetail = (post: PostSummary | PostDetail): PostDetail => ({
  ...toPostSummary(post),
  taxonomy: "taxonomy" in post ? post.taxonomy ?? null : null,
});

const readPostsCache = () =>
  readLocalCache(cacheKeys.postsList, cacheTtlMs.list, isPostList);

const readPostDetailCache = (id: string) =>
  readLocalCache(cacheKeys.postDetail(id), cacheTtlMs.detail, isPostDetail);

const primePostsCache = (items: PostSummary[]) => {
  cachedPosts = items;
  cachedPostsPromise = null;
  writeLocalCache(cacheKeys.postsList, items);
};

const upsertCachedPost = (post: PostSummary | PostDetail) => {
  const current = cachedPosts ?? readPostsCache() ?? [];
  const summary = toPostSummary(post);
  const index = current.findIndex((item) => item.id === summary.id);
  const next = [...current];
  if (index === -1) next.unshift(summary);
  else next[index] = { ...next[index], ...summary };
  primePostsCache(next);

  const detail = toPostDetail(post);
  cachedPostDetails.set(detail.id, detail);
  writeLocalCache(cacheKeys.postDetail(detail.id), detail);
};

const updateCachedPostStatus = (id: string, status: PostStatus) => {
  const current = cachedPosts ?? readPostsCache();
  if (current) {
    primePostsCache(
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  const detail = cachedPostDetails.get(id) ?? readPostDetailCache(id);
  if (detail) {
    const updated = { ...detail, status };
    cachedPostDetails.set(id, updated);
    writeLocalCache(cacheKeys.postDetail(id), updated);
  }
};

const removeCachedPost = (id: string) => {
  const current = cachedPosts ?? readPostsCache();
  if (current) primePostsCache(current.filter((item) => item.id !== id));
  cachedPostDetails.delete(id);
  clearLocalCache(cacheKeys.postDetail(id));
};

export const clearPostsCache = () => {
  cachedPosts = null;
  cachedPostsPromise = null;
  cachedPostDetails.clear();
  clearLocalCache(cacheKeys.postsList);
};

export const getCachedPosts = () => {
  if (cachedPosts) return cachedPosts;
  const cached = readPostsCache();
  if (cached) cachedPosts = cached;
  return cachedPosts;
};

export const getCachedPostDetail = (id: string) => {
  const existing = cachedPostDetails.get(id);
  if (existing) return existing;
  const stored = readPostDetailCache(id);
  if (stored) {
    cachedPostDetails.set(id, stored);
    return stored;
  }
  return null;
};

export async function listPosts() {
  return apiRequest<PostSummary[]>("/posts", { method: "GET" });
}

export async function listPostsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPosts();
    if (cached) return cached;
    if (cachedPostsPromise) return cachedPostsPromise;
  }
  const request = listPosts();
  cachedPostsPromise = request;
  const posts = await request;
  primePostsCache(posts);
  return posts;
}

export async function getPost(id: string) {
  return apiRequest<PostDetail>(`/posts/${id}`, { method: "GET" });
}

export async function getPostCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cachedDetail = getCachedPostDetail(id);
    if (cachedDetail) return cachedDetail;
    const cachedList = getCachedPosts();
    const match = cachedList?.find((item) => item.id === id);
    if (match) return toPostDetail(match);
  }
  const result = await getPost(id);
  if (result) upsertCachedPost(result);
  return result;
}

export async function createPost(payload: PostPayload) {
  const created = await apiRequest<PostDetail>(
    "/posts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedPost(created);
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(created.id), action: "update" });
  }
  return created;
}

export async function updatePost(id: string, payload: Partial<PostPayload>) {
  const updated = await apiRequest<PostDetail>(
    `/posts/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedPost(updated);
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function updatePostMetadata(
  id: string,
  payload: PostMetadataPayload
) {
  const updated = await apiRequest<PostDetail>(
    `/posts/${id}/metadata`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedPost(updated);
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(updated.id), action: "update" });
  }
  return updated;
}

export async function previewPost(id: string, ttlMinutes?: number) {
  return apiRequest<PreviewResponse>(
    `/posts/${id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttlMinutes }),
    },
    { withCsrf: true }
  );
}

export async function publishPost(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/posts/${id}/publish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    updateCachedPostStatus(id, "published");
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "update" });
  }
  return result;
}

export async function unpublishPost(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/posts/${id}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    updateCachedPostStatus(id, "draft");
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "update" });
  }
  return result;
}

export async function duplicatePost(id: string) {
  const duplicated = await apiRequest<PostDetail>(
    `/posts/${id}/duplicate`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (duplicated) {
    upsertCachedPost(duplicated);
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(duplicated.id), action: "update" });
  }
  return duplicated;
}

export async function deletePost(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/posts/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedPost(id);
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "invalidate" });
  }
  return result;
}
