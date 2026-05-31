import { resolvePostRuntimeExcerpt } from "../posts/runtime/postBlockRuntimeMapper";
import {
  postsFeedDefaults,
  normalizePostsFeedData,
  type PostsFeedData,
  type PostsFeedSourceMode,
} from "../../widgets/core/postsFeed";
import {
  normalizeContentListLimit,
  type ContentListRuntimeItem,
} from "../../widgets/core/contentList";
import {
  readMediaCandidate,
  resolveContentItemImage,
  type ContentMediaLookup,
} from "./contentMediaResolver";

export type PostsFeedRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
};

export type PostsFeedRuntimePost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  tags?: string[];
  data?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
  updatedAt: Date | string;
  publishedAt?: Date | string | null;
  scheduledAt?: Date | string | null;
  author?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  seo?: unknown;
};

type PostsFeedRuntimeOptions = {
  preview: boolean;
  contentRoutes: PostsFeedRouteSetting[];
  runtimeSearchParams?: URLSearchParams;
  blockId?: string;
};

type PostsFeedRuntimeDeps = {
  getMediaById?: (id: string) => Promise<ContentMediaLookup>;
};

const excerptMaxLength = 220;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveRuntimePageKey = (blockId?: string) => {
  const normalizedBlockId = (blockId ?? "content-list").trim() || "content-list";
  return `cl.${normalizedBlockId}.page`;
};

const resolveRequestedPage = (
  runtimeSearchParams: URLSearchParams | undefined,
  pageKey: string
) => {
  const raw = Number(runtimeSearchParams?.get(pageKey) ?? "1");
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
};

const buildPageHref = (
  runtimeSearchParams: URLSearchParams | undefined,
  pageKey: string,
  page: number
) => {
  const params = new URLSearchParams(runtimeSearchParams?.toString() ?? "");
  if (page <= 1) {
    params.delete(pageKey);
  } else {
    params.set(pageKey, String(page));
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "?";
};

const resolveNavigationMeta = ({
  page,
  pageSize,
  total,
  runtimeSearchParams,
  pageKey,
}: {
  page: number;
  pageSize: number;
  total: number;
  runtimeSearchParams?: URLSearchParams;
  pageKey: string;
}) => {
  const safePageSize = Math.max(1, normalizeContentListLimit(pageSize));
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return {
    page: currentPage,
    pageSize: safePageSize,
    totalPages,
    previousPageHref:
      previousPage !== null ? buildPageHref(runtimeSearchParams, pageKey, previousPage) : undefined,
    nextPageHref:
      nextPage !== null ? buildPageHref(runtimeSearchParams, pageKey, nextPage) : undefined,
  };
};

const toDate = (value: Date | string | null | undefined) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
  return null;
};

const toIso = (value: Date | string | null | undefined) => {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : undefined;
};

const normalizeTagList = (tags: string[] | undefined) =>
  Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [];

const postImageFieldCandidates = [
  "image",
  "imageUrl",
  "coverImage",
  "featuredImage",
  "heroImage",
  "thumbnail",
  "thumbnailSrc",
  "imageSrc",
] as const;

const resolveSortTimestamp = (post: PostsFeedRuntimePost, mode: "published" | "updated") => {
  if (mode === "published") {
    const published = toDate(post.publishedAt ?? null);
    if (published) return published.getTime();
  }
  return toDate(post.updatedAt)?.getTime() ?? 0;
};

const sortPosts = (posts: PostsFeedRuntimePost[], sort: string) => {
  const next = [...posts];
  if (sort === "published-asc") {
    return next.sort(
      (a, b) => resolveSortTimestamp(a, "published") - resolveSortTimestamp(b, "published")
    );
  }
  if (sort === "updated-desc") {
    return next.sort(
      (a, b) => resolveSortTimestamp(b, "updated") - resolveSortTimestamp(a, "updated")
    );
  }
  if (sort === "updated-asc") {
    return next.sort(
      (a, b) => resolveSortTimestamp(a, "updated") - resolveSortTimestamp(b, "updated")
    );
  }
  if (sort === "title-asc") {
    return next.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "title-desc") {
    return next.sort((a, b) => b.title.localeCompare(a.title));
  }
  return next.sort(
    (a, b) => resolveSortTimestamp(b, "published") - resolveSortTimestamp(a, "published")
  );
};

const isFeaturedPost = (post: PostsFeedRuntimePost) => {
  const tagHit = Array.isArray(post.tags)
    ? post.tags.some((tag) => normalizeText(tag) === "featured")
    : false;
  if (tagHit) return true;

  const data = isRecord(post.data) ? post.data : {};
  return data.featured === true;
};

const stableFeaturedFirst = (posts: PostsFeedRuntimePost[]) => {
  const featured: PostsFeedRuntimePost[] = [];
  const rest: PostsFeedRuntimePost[] = [];
  for (const post of posts) {
    if (isFeaturedPost(post)) {
      featured.push(post);
    } else {
      rest.push(post);
    }
  }
  return [...featured, ...rest];
};

const resolveDetailPathPattern = (routes: PostsFeedRouteSetting[]) => {
  const route = routes.find(
    (item) => item.enabled && (item.type === "post" || item.type === "posts")
  );
  return route?.detailPath?.trim() || undefined;
};

const resolveListPath = (routes: PostsFeedRouteSetting[]) => {
  const route = routes.find(
    (item) => item.enabled && (item.type === "post" || item.type === "posts")
  );
  return route?.listPath?.trim() || "";
};

const buildDetailHref = (pattern: string, slug: string, id: string) => {
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

const resolveExcerpt = (post: PostsFeedRuntimePost) => {
  const data = isRecord(post.data) ? post.data : {};
  return resolvePostRuntimeExcerpt(data, excerptMaxLength);
};

const resolveAuthorName = (post: PostsFeedRuntimePost) => {
  const name = post.author?.name?.trim();
  if (name) return name;
  const email = post.author?.email?.trim();
  if (!email) return undefined;
  const [local] = email.split("@");
  return local?.trim() || undefined;
};

const resolveAuthorId = (post: PostsFeedRuntimePost) => post.author?.id?.trim() ?? "";

const includePostByVisibility = (post: PostsFeedRuntimePost, preview: boolean) => {
  if (preview) return true;
  return post.status === "published";
};

const filterByCategory = (posts: PostsFeedRuntimePost[], category: string) => {
  const normalizedCategory = normalizeText(category);
  if (!normalizedCategory) return posts;

  return posts.filter((post) => {
    const tags = normalizeTagList(post.tags).map((item) => normalizeText(item));
    return tags.some((tag) => tag.includes(normalizedCategory));
  });
};

const matchesDateRange = (
  post: PostsFeedRuntimePost,
  dateRange: NonNullable<NonNullable<PostsFeedData["source"]>["dateRange"]> | undefined
) => {
  const from = dateRange?.from?.trim() ?? "";
  const to = dateRange?.to?.trim() ?? "";
  if (!from && !to) return true;

  const published = toDate(post.publishedAt);
  if (!published) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    if (published.getTime() < fromDate.getTime()) return false;
  }
  if (to) {
    const toDateValue = new Date(`${to}T23:59:59.999Z`);
    if (published.getTime() > toDateValue.getTime()) return false;
  }
  return true;
};

const applyPostsFeedFilters = (
  posts: PostsFeedRuntimePost[],
  source: NonNullable<PostsFeedData["source"]>,
  mode: PostsFeedSourceMode
) => {
  if (mode === "manual") return posts;

  const authorId = normalizeText(source.authorId);
  return posts.filter((post) => {
    if (authorId.length > 0 && normalizeText(resolveAuthorId(post)) !== authorId) {
      return false;
    }
    if (!matchesDateRange(post, source.dateRange)) {
      return false;
    }
    return true;
  });
};

const sortPostsFeed = (
  posts: PostsFeedRuntimePost[],
  source: NonNullable<PostsFeedData["source"]>,
  mode: PostsFeedSourceMode
) => {
  if (mode === "manual") return posts;
  const sorted = sortPosts(posts, source.sort ?? "published-desc");
  if (mode === "featured" || !source.featuredFirst) {
    return sorted;
  }
  return stableFeaturedFirst(sorted);
};

const filterByMode = (
  posts: PostsFeedRuntimePost[],
  mode: PostsFeedSourceMode,
  category: string,
  manualPostIds: string[]
) => {
  if (mode === "featured") {
    return posts.filter((post) => isFeaturedPost(post));
  }

  if (mode === "category") {
    return filterByCategory(posts, category);
  }

  if (mode === "manual") {
    if (manualPostIds.length === 0) return [];
    const byId = new Map(posts.map((post) => [post.id, post]));
    return manualPostIds
      .map((id) => byId.get(id))
      .filter((post): post is PostsFeedRuntimePost => Boolean(post));
  }

  return posts;
};

const resolvePostImageCandidate = (post: PostsFeedRuntimePost) => {
  const data = isRecord(post.data) ? post.data : {};
  for (const key of postImageFieldCandidates) {
    const resolved = readMediaCandidate(data[key]);
    if (resolved) return resolved;
  }
  return null;
};

const resolvePostImageAltFallback = (post: PostsFeedRuntimePost) => {
  const data = isRecord(post.data) ? post.data : {};
  const candidates = [
    typeof data.thumbnailAlt === "string" ? data.thumbnailAlt : undefined,
    typeof data.featuredImageAlt === "string" ? data.featuredImageAlt : undefined,
    typeof data.imageAlt === "string" ? data.imageAlt : undefined,
    post.title,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
};

const mapPostToRuntimeItem = async (
  post: PostsFeedRuntimePost,
  detailPathPattern: string | undefined,
  mediaCache: Map<string, { url: string; alt?: string } | null>,
  deps: PostsFeedRuntimeDeps
): Promise<ContentListRuntimeItem> => {
  const resolvedImage = await resolveContentItemImage(resolvePostImageCandidate(post), mediaCache, {
    getMediaById: deps.getMediaById,
  });
  const tags = normalizeTagList(post.tags).slice(0, 8);
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    href:
      detailPathPattern && detailPathPattern.length > 0
        ? buildDetailHref(detailPathPattern, post.slug, post.id)
        : undefined,
    excerpt: resolveExcerpt(post),
    imageSrc: resolvedImage.src,
    imageAlt: resolvedImage.alt ?? resolvePostImageAltFallback(post),
    authorName: resolveAuthorName(post),
    publishedAt: toIso(post.publishedAt),
    status: post.status,
    tags,
  };
};

export async function resolvePostsFeedResolvedData(
  input: PostsFeedData,
  options: PostsFeedRuntimeOptions,
  posts: PostsFeedRuntimePost[],
  deps: PostsFeedRuntimeDeps = {}
) {
  const normalized = normalizePostsFeedData(input);
  const source = normalized.source ?? postsFeedDefaults.source!;
  const pagination = normalized.pagination ?? postsFeedDefaults.pagination!;
  const mode = source.mode ?? "latest";
  const detailPathPattern = resolveDetailPathPattern(options.contentRoutes);
  const listPath = resolveListPath(options.contentRoutes);

  const visible = posts.filter((post) => includePostByVisibility(post, options.preview));
  const modeFiltered = filterByMode(
    visible,
    mode,
    source.category ?? "",
    source.manualPostIds ?? []
  );
  const filtered = applyPostsFeedFilters(modeFiltered, source, mode);
  const ordered = sortPostsFeed(filtered, source, mode);

  const limit = source.limit ?? postsFeedDefaults.source?.limit ?? 6;
  const pageSize = pagination.pageSize ?? limit;
  const paginationMode = pagination.mode ?? "none";
  const pageKey = resolveRuntimePageKey(options.blockId);
  const currentPage =
    paginationMode === "paged" || paginationMode === "load-more"
      ? resolveRequestedPage(options.runtimeSearchParams, pageKey)
      : 1;
  const effectivePageSize = paginationMode === "none" ? limit : pageSize;
  const sliceStart = paginationMode === "paged" ? (currentPage - 1) * effectivePageSize : 0;
  const sliceEnd =
    paginationMode === "load-more"
      ? currentPage * effectivePageSize
      : sliceStart + effectivePageSize;
  const sliced = ordered.slice(sliceStart, sliceEnd);
  const mediaCache = new Map<string, { url: string; alt?: string } | null>();
  const items = await Promise.all(
    sliced.map((post) => mapPostToRuntimeItem(post, detailPathPattern, mediaCache, deps))
  );
  const runtimeNavigation = resolveNavigationMeta({
    page: currentPage,
    pageSize: effectivePageSize,
    total: filtered.length,
    runtimeSearchParams: options.runtimeSearchParams,
    pageKey,
  });

  return {
    items,
    total: filtered.length,
    sourceMode: mode,
    listPath,
    resolvedAt: new Date().toISOString(),
    runtime: {
      page: runtimeNavigation.page,
      pageSize: runtimeNavigation.pageSize,
      totalPages: runtimeNavigation.totalPages,
      ...(runtimeNavigation.previousPageHref
        ? { previousPageHref: runtimeNavigation.previousPageHref }
        : {}),
      ...(runtimeNavigation.nextPageHref ? { nextPageHref: runtimeNavigation.nextPageHref } : {}),
    },
  };
}
