import { apiRequest, isApiClientError } from "./apiClient";
import type {
  PostMetadataMutationV1,
  PostMetadataStatus,
} from "../../services/posts/postMetadataContract";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import {
  clearLocalCache,
  createMemoryBackedLocalCache,
  readLocalCache,
  writeLocalCache,
} from "@/utils/storageCache";

export type PostStatus = PostMetadataStatus;

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

export type { PostMetadataMutationV1 as PostMetadataPayload } from "../../services/posts/postMetadataContract";

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

export type PostRevision = {
  id: string;
  postId: string;
  version: number;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: PostAuthor | null;
};

export type PostAutosavePayload = Partial<PostPayload> & {
  tags?: string[];
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: PostSeo;
};

export type PostAutosaveResponse = {
  post: PostDetail;
  revision: PostRevision;
  savedAt: string;
  reusedRevision: boolean;
};

let cachedPostsPromise: Promise<PostSummary[]> | null = null;
const cachedPostDetails = new Map<string, PostDetail>();
const cachedPostRevisions = new Map<string, PostRevision[]>();
const postDetailGenerations = new Map<string, number>();
const postDetailReadSequences = new Map<string, number>();
const acceptedPostDetailReadSequences = new Map<string, number>();
const postDetailTombstones = new Set<string>();
const invalidatedPostListRows = new Set<string>();
const postListRowPublicationEpochs = new Map<string, number>();
const inFlightPostListReads = new Set<{
  cacheAuthorityEpoch: number;
  listPublicationEpoch: number;
}>();
let postsCacheAuthorityEpoch = 0;
let postListPublicationEpoch = 0;

type PostDetailAuthorityTicket = Readonly<{
  id: string;
  cacheAuthorityEpoch: number;
  generation: number;
  readSequence: number | null;
}>;

type PostDetailReadOutcome = Readonly<{
  detail: PostDetail | null;
  accepted: boolean;
}>;

type PostDetailReconciliation = Readonly<{
  status: "accepted" | "not_accepted" | "failed";
  readTicket: PostDetailAuthorityTicket | null;
}>;

const isPostList = (value: unknown): value is PostSummary[] => Array.isArray(value);

const postsListCache = createMemoryBackedLocalCache({
  key: cacheKeys.postsList,
  ttlMs: cacheTtlMs.list,
  validate: isPostList,
});

const isPostDetail = (value: unknown): value is PostDetail =>
  Boolean(value && typeof value === "object");

const isPostRevisionList = (value: unknown): value is PostRevision[] => Array.isArray(value);

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
  taxonomy: "taxonomy" in post ? (post.taxonomy ?? null) : null,
});

const readPostsCache = () => postsListCache.read();

const readPostDetailCache = (id: string) =>
  readLocalCache(cacheKeys.postDetail(id), cacheTtlMs.detail, isPostDetail);

const readPostRevisionsCache = (id: string) =>
  readLocalCache(cacheKeys.postRevisions(id), cacheTtlMs.detail, isPostRevisionList);

const primePostsCache = (items: PostSummary[]) => {
  postsListCache.write(items);
};

const currentPostDetailGeneration = (id: string) => postDetailGenerations.get(id) ?? 0;

const currentPostDetailReadSequence = (id: string) => postDetailReadSequences.get(id) ?? 0;

const nextPostDetailReadSequence = (id: string) => {
  const next = currentPostDetailReadSequence(id) + 1;
  postDetailReadSequences.set(id, next);
  return next;
};

const supersedePostDetailReads = (id: string) => {
  const barrier = nextPostDetailReadSequence(id);
  acceptedPostDetailReadSequences.set(id, barrier);
  return barrier;
};

const capturePostDetailAuthority = (id: string): PostDetailAuthorityTicket => ({
  id,
  cacheAuthorityEpoch: postsCacheAuthorityEpoch,
  generation: currentPostDetailGeneration(id),
  readSequence: null,
});

const capturePostDetailReadAuthority = (id: string): PostDetailAuthorityTicket => ({
  ...capturePostDetailAuthority(id),
  readSequence: nextPostDetailReadSequence(id),
});

const isCurrentPostDetailAuthority = (ticket: PostDetailAuthorityTicket) =>
  ticket.cacheAuthorityEpoch === postsCacheAuthorityEpoch &&
  !postDetailTombstones.has(ticket.id) &&
  ticket.generation === currentPostDetailGeneration(ticket.id);

const isCurrentPostDetailReadAuthority = (ticket: PostDetailAuthorityTicket) =>
  ticket.readSequence !== null &&
  isCurrentPostDetailAuthority(ticket) &&
  ticket.readSequence >= (acceptedPostDetailReadSequences.get(ticket.id) ?? 0);

const advancePostDetailGeneration = (id: string) => {
  const next = currentPostDetailGeneration(id) + 1;
  postDetailGenerations.set(id, next);
  return next;
};

const recordPostListRowPublication = (id: string) => {
  postListPublicationEpoch += 1;
  postListRowPublicationEpochs.set(id, postListPublicationEpoch);
  if (inFlightPostListReads.size === 0) postListRowPublicationEpochs.clear();
};

const prunePostListRowPublicationEpochs = () => {
  const activeEpochs = [...inFlightPostListReads]
    .filter((ticket) => ticket.cacheAuthorityEpoch === postsCacheAuthorityEpoch)
    .map((ticket) => ticket.listPublicationEpoch);
  if (activeEpochs.length === 0) {
    postListRowPublicationEpochs.clear();
    invalidatedPostListRows.clear();
    return;
  }
  const oldestActiveEpoch = Math.min(...activeEpochs);
  for (const [id, rowEpoch] of postListRowPublicationEpochs) {
    if (rowEpoch <= oldestActiveEpoch) {
      postListRowPublicationEpochs.delete(id);
      invalidatedPostListRows.delete(id);
    }
  }
};

const upsertCachedPost = (post: PostSummary | PostDetail) => {
  if (postDetailTombstones.has(post.id)) return false;
  invalidatedPostListRows.delete(post.id);
  const current = readPostsCache() ?? [];
  const summary = toPostSummary(post);
  const index = current.findIndex((item) => item.id === summary.id);
  const next = [...current];
  if (index === -1) next.unshift(summary);
  else next[index] = { ...next[index], ...summary };
  primePostsCache(next);

  const detail = toPostDetail(post);
  cachedPostDetails.set(detail.id, detail);
  writeLocalCache(cacheKeys.postDetail(detail.id), detail);
  recordPostListRowPublication(detail.id);
  return true;
};

const removeCachedPost = (id: string, options?: { invalidateListRow?: boolean }) => {
  if (options?.invalidateListRow) invalidatedPostListRows.add(id);
  else invalidatedPostListRows.delete(id);
  const current = readPostsCache();
  if (current) primePostsCache(current.filter((item) => item.id !== id));
  cachedPostDetails.delete(id);
  cachedPostRevisions.delete(id);
  clearLocalCache(cacheKeys.postDetail(id));
  clearLocalCache(cacheKeys.postRevisions(id));
  recordPostListRowPublication(id);
};

const writePostRevisionsCache = (id: string, revisions: PostRevision[]) => {
  const sorted = [...revisions].sort((left, right) => right.version - left.version);
  cachedPostRevisions.set(id, sorted);
  writeLocalCache(cacheKeys.postRevisions(id), sorted);
};

const upsertCachedPostRevision = (id: string, revision: PostRevision) => {
  const current = getCachedPostRevisions(id) ?? [];
  const index = current.findIndex((item) => item.id === revision.id);
  const next = [...current];
  if (index === -1) next.unshift(revision);
  else next[index] = revision;
  writePostRevisionsCache(id, next);
};

export const clearPostsCache = () => {
  postsCacheAuthorityEpoch += 1;
  cachedPostsPromise = null;
  cachedPostDetails.clear();
  cachedPostRevisions.clear();
  postsListCache.clear();
  postDetailGenerations.clear();
  postDetailReadSequences.clear();
  acceptedPostDetailReadSequences.clear();
  postDetailTombstones.clear();
  invalidatedPostListRows.clear();
  postListRowPublicationEpochs.clear();
  postListPublicationEpoch = 0;
  inFlightPostListReads.clear();
};

export const getCachedPosts = () => readPostsCache();

export const getCachedPostDetail = (id: string) => {
  if (postDetailTombstones.has(id)) return null;
  const existing = cachedPostDetails.get(id);
  if (existing) return existing;
  const stored = readPostDetailCache(id);
  if (stored) {
    cachedPostDetails.set(id, stored);
    return stored;
  }
  return null;
};

export const getCachedPostRevisions = (id: string) => {
  const existing = cachedPostRevisions.get(id);
  if (existing) return existing;
  const stored = readPostRevisionsCache(id);
  if (stored) {
    cachedPostRevisions.set(id, stored);
    return stored;
  }
  return null;
};

const publishPostMutationCacheEvents = (id: string) => {
  broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "update" });
};

const reconcilePostListRead = (received: PostSummary[], capturedListPublicationEpoch: number) => {
  if (capturedListPublicationEpoch === postListPublicationEpoch) return [...received];

  let reconciled = [...received];
  for (const [id, rowPublicationEpoch] of postListRowPublicationEpochs) {
    if (rowPublicationEpoch <= capturedListPublicationEpoch) continue;
    if (postDetailTombstones.has(id) || invalidatedPostListRows.has(id)) {
      reconciled = reconciled.filter((item) => item.id !== id);
      continue;
    }

    const currentDetail = getCachedPostDetail(id);
    if (!currentDetail) continue;
    const currentSummary = toPostSummary(currentDetail);
    const index = reconciled.findIndex((item) => item.id === id);
    if (index === -1) reconciled = [currentSummary, ...reconciled];
    else reconciled[index] = currentSummary;
  }
  return reconciled;
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
  const ticket = {
    cacheAuthorityEpoch: postsCacheAuthorityEpoch,
    listPublicationEpoch: postListPublicationEpoch,
  };
  inFlightPostListReads.add(ticket);

  let request: Promise<PostSummary[]> | null = null;
  request = (async () => {
    try {
      const posts = await listPosts();
      if (ticket.cacheAuthorityEpoch !== postsCacheAuthorityEpoch) {
        return getCachedPosts() ?? [];
      }
      const reconciled = reconcilePostListRead(posts, ticket.listPublicationEpoch);
      primePostsCache(reconciled);
      return reconciled;
    } finally {
      inFlightPostListReads.delete(ticket);
      prunePostListRowPublicationEpochs();
      if (cachedPostsPromise === request) cachedPostsPromise = null;
    }
  })();
  if (!options?.force) cachedPostsPromise = request;
  return request;
}

export async function getPost(id: string) {
  return apiRequest<PostDetail>(`/posts/${id}`, { method: "GET" });
}

const resolveStalePostDetailRead = async (
  id: string,
  retriesRemaining: number
): Promise<PostDetailReadOutcome> => {
  if (postDetailTombstones.has(id)) return { detail: null, accepted: false };
  const currentDetail = getCachedPostDetail(id);
  if (currentDetail) return { detail: currentDetail, accepted: false };
  if (retriesRemaining <= 0) return { detail: null, accepted: false };
  return readPostDetailWithAuthority(id, retriesRemaining - 1);
};

const readPostDetailWithAuthority = async (
  id: string,
  retriesRemaining = 1,
  ticket = capturePostDetailReadAuthority(id)
): Promise<PostDetailReadOutcome> => {
  if (postDetailTombstones.has(id)) return { detail: null, accepted: false };
  try {
    const result = await getPost(id);
    if (!result) return { detail: null, accepted: false };
    if (
      ticket.readSequence !== null &&
      isCurrentPostDetailReadAuthority(ticket) &&
      upsertCachedPost(result)
    ) {
      acceptedPostDetailReadSequences.set(id, ticket.readSequence);
      return { detail: toPostDetail(result), accepted: true };
    }
    return resolveStalePostDetailRead(id, retriesRemaining);
  } catch (error) {
    if (postDetailTombstones.has(id) && isApiClientError(error) && error.status === 404) {
      return { detail: null, accepted: false };
    }
    throw error;
  }
};

export async function getPostCached(id: string, options?: { force?: boolean }) {
  if (postDetailTombstones.has(id)) return null;
  if (!options?.force) {
    const cachedDetail = getCachedPostDetail(id);
    if (cachedDetail) return cachedDetail;
    const cachedList = getCachedPosts();
    const match = cachedList?.find((item) => item.id === id);
    if (match) return toPostDetail(match);
  }
  const outcome = await readPostDetailWithAuthority(id);
  return outcome.detail;
}

const acceptCurrentPostDetailMutation = (
  id: string,
  ticket: PostDetailAuthorityTicket,
  post: PostDetail
) => {
  if (!isCurrentPostDetailAuthority(ticket)) return false;
  advancePostDetailGeneration(id);
  supersedePostDetailReads(id);
  postDetailTombstones.delete(id);
  return upsertCachedPost(post);
};

const reconcileLostPostDetailMutation = async (id: string): Promise<PostDetailReconciliation> => {
  if (postDetailTombstones.has(id)) {
    return { status: "not_accepted", readTicket: null };
  }
  const readTicket = capturePostDetailReadAuthority(id);
  try {
    const outcome = await readPostDetailWithAuthority(id, 1, readTicket);
    if (!outcome.accepted || !outcome.detail || postDetailTombstones.has(id)) {
      return { status: "not_accepted", readTicket };
    }
    publishPostMutationCacheEvents(id);
    return { status: "accepted", readTicket };
  } catch {
    return { status: "failed", readTicket };
  }
};

const invalidateFailedPostDetailReconciliation = (
  id: string,
  reconciliation: PostDetailReconciliation
) => {
  if (
    reconciliation.status !== "failed" ||
    reconciliation.readTicket === null ||
    !isCurrentPostDetailReadAuthority(reconciliation.readTicket)
  ) {
    return false;
  }
  removeCachedPost(id, { invalidateListRow: true });
  broadcastCacheEvent({ key: cacheKeys.postsList, action: "invalidate" });
  broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "invalidate" });
  return true;
};

const settlePostDetailMutation = async (
  id: string,
  ticket: PostDetailAuthorityTicket,
  post: PostDetail,
  onAccepted?: () => void
) => {
  if (ticket.cacheAuthorityEpoch !== postsCacheAuthorityEpoch) return false;
  if (acceptCurrentPostDetailMutation(id, ticket, post)) {
    onAccepted?.();
    publishPostMutationCacheEvents(id);
    return true;
  }
  const reconciliation = await reconcileLostPostDetailMutation(id);
  invalidateFailedPostDetailReconciliation(id, reconciliation);
  return reconciliation.status === "accepted";
};

const settlePostStatusMutation = async (id: string, ticket: PostDetailAuthorityTicket) => {
  if (ticket.cacheAuthorityEpoch !== postsCacheAuthorityEpoch) return false;
  if (isCurrentPostDetailAuthority(ticket)) {
    advancePostDetailGeneration(id);
    supersedePostDetailReads(id);
    postDetailTombstones.delete(id);
  }
  const reconciliation = await reconcileLostPostDetailMutation(id);
  invalidateFailedPostDetailReconciliation(id, reconciliation);
  return reconciliation.status === "accepted";
};

const publishIndependentPost = (post: PostDetail, cacheAuthorityEpoch: number) => {
  if (cacheAuthorityEpoch !== postsCacheAuthorityEpoch) return false;
  advancePostDetailGeneration(post.id);
  supersedePostDetailReads(post.id);
  postDetailTombstones.delete(post.id);
  if (!upsertCachedPost(post)) return false;
  publishPostMutationCacheEvents(post.id);
  return true;
};

export async function createPost(payload: PostPayload) {
  const cacheAuthorityEpoch = postsCacheAuthorityEpoch;
  const created = await apiRequest<PostDetail>(
    "/posts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) publishIndependentPost(created, cacheAuthorityEpoch);
  return created;
}

export async function updatePost(id: string, payload: Partial<PostPayload>) {
  const ticket = capturePostDetailAuthority(id);
  const updated = await apiRequest<PostDetail>(
    `/posts/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) await settlePostDetailMutation(id, ticket, updated);
  return updated;
}

export async function updatePostMetadata(id: string, payload: PostMetadataMutationV1) {
  const ticket = capturePostDetailAuthority(id);
  const updated = await apiRequest<PostDetail>(
    `/posts/${id}/metadata`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) await settlePostDetailMutation(id, ticket, updated);
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

export async function autosavePost(id: string, payload: PostAutosavePayload) {
  const ticket = capturePostDetailAuthority(id);
  const result = await apiRequest<PostAutosaveResponse>(
    `/posts/${id}/autosave`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (result?.post) {
    await settlePostDetailMutation(id, ticket, result.post, () => {
      if (!result.revision) return;
      upsertCachedPostRevision(result.post.id, result.revision);
      broadcastCacheEvent({ key: cacheKeys.postRevisions(result.post.id), action: "update" });
    });
  }
  return result;
}

export async function listPostRevisions(id: string) {
  return apiRequest<PostRevision[]>(`/posts/${id}/revisions`, { method: "GET" });
}

export async function listPostRevisionsCached(id: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedPostRevisions(id);
    if (cached) return cached;
  }
  const revisions = await listPostRevisions(id);
  writePostRevisionsCache(id, revisions);
  return revisions;
}

export async function restorePostRevision(id: string, revisionId: string) {
  const ticket = capturePostDetailAuthority(id);
  const result = await apiRequest<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>(`/posts/${id}/revisions/${revisionId}/restore`, { method: "POST" }, { withCsrf: true });
  if (result?.post) {
    await settlePostDetailMutation(id, ticket, result.post, () => {
      if (!result.revision) return;
      upsertCachedPostRevision(result.post.id, result.revision);
      broadcastCacheEvent({ key: cacheKeys.postRevisions(result.post.id), action: "update" });
    });
  }
  return result;
}

export async function publishPost(id: string) {
  const ticket = capturePostDetailAuthority(id);
  const result = await apiRequest<{
    ok: boolean;
    revision?: PostRevision;
    reusedRevision?: boolean;
  }>(`/posts/${id}/publish`, { method: "POST" }, { withCsrf: true });
  if (result?.ok) {
    const accepted = await settlePostStatusMutation(id, ticket);
    if (accepted && result.revision) {
      upsertCachedPostRevision(id, result.revision);
      broadcastCacheEvent({ key: cacheKeys.postRevisions(id), action: "update" });
    }
  }
  return result;
}

export async function unpublishPost(id: string) {
  const ticket = capturePostDetailAuthority(id);
  const result = await apiRequest<{ ok: boolean }>(
    `/posts/${id}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) await settlePostStatusMutation(id, ticket);
  return result;
}

export async function duplicatePost(id: string) {
  const cacheAuthorityEpoch = postsCacheAuthorityEpoch;
  const duplicated = await apiRequest<PostDetail>(
    `/posts/${id}/duplicate`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (duplicated) publishIndependentPost(duplicated, cacheAuthorityEpoch);
  return duplicated;
}

export async function deletePost(id: string) {
  const ticket = capturePostDetailAuthority(id);
  const result = await apiRequest<{ ok: boolean }>(
    `/posts/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok && ticket.cacheAuthorityEpoch === postsCacheAuthorityEpoch) {
    advancePostDetailGeneration(id);
    supersedePostDetailReads(id);
    postDetailTombstones.add(id);
    removeCachedPost(id);
    broadcastCacheEvent({ key: cacheKeys.postsList, action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "invalidate" });
  }
  return result;
}
