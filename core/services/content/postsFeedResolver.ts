import type { ContentRouteSetting } from "../settings/settingsService";
import { listPosts, type PostSummary } from "./postsService";
import { resolvePostRuntimeExcerpt } from "../posts/runtime/postBlockRuntimeMapper";
import {
  normalizePostsFeedData,
  type PostsFeedData,
  type PostsFeedSourceMode,
} from "../../widgets/core/postsFeed";
import type { ContentListRuntimeItem } from "../../widgets/core/contentList";

type PostsFeedResolverDeps = {
  listPosts: typeof listPosts;
};

const defaultDeps: PostsFeedResolverDeps = {
  listPosts,
};

const excerptMaxLength = 220;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const resolveSortTimestamp = (post: PostSummary, mode: "published" | "updated") => {
  if (mode === "published") {
    const published = toDate(post.publishedAt ?? null);
    if (published) return published.getTime();
  }
  return toDate(post.updatedAt)?.getTime() ?? 0;
};

const sortPosts = (posts: PostSummary[], sort: string) => {
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

const isFeaturedPost = (post: PostSummary) => {
  const tagHit = Array.isArray(post.tags)
    ? post.tags.some((tag) => normalizeText(tag) === "featured")
    : false;
  if (tagHit) return true;

  const data = isRecord(post.data) ? post.data : {};
  return data.featured === true;
};

const resolveDetailPathPattern = (routes: ContentRouteSetting[]) => {
  const route = routes.find(
    (item) => item.enabled && (item.type === "post" || item.type === "posts")
  );
  return route?.detailPath ?? "/post/:slug";
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

const resolveExcerpt = (post: PostSummary) => {
  const data = isRecord(post.data) ? post.data : {};
  return resolvePostRuntimeExcerpt(data, excerptMaxLength);
};

const resolveAuthorName = (post: PostSummary) => {
  const name = post.author?.name?.trim();
  if (name) return name;
  const email = post.author?.email?.trim();
  if (!email) return undefined;
  const [local] = email.split("@");
  return local?.trim() || undefined;
};

const includePostByVisibility = (post: PostSummary, preview: boolean) => {
  if (preview) return true;
  return post.status === "published";
};

const filterByCategory = (posts: PostSummary[], category: string) => {
  const normalizedCategory = normalizeText(category);
  if (!normalizedCategory) return posts;

  return posts.filter((post) => {
    const tags = Array.isArray(post.tags)
      ? post.tags.map((item) => normalizeText(item)).filter(Boolean)
      : [];

    return tags.some((tag) => tag.includes(normalizedCategory));
  });
};

const filterByMode = (
  posts: PostSummary[],
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
      .filter((post): post is PostSummary => Boolean(post));
  }

  return posts;
};

const mapPostToRuntimeItem = (
  post: PostSummary,
  detailPathPattern: string
): ContentListRuntimeItem => ({
  id: post.id,
  title: post.title,
  slug: post.slug,
  href: buildDetailHref(detailPathPattern, post.slug, post.id),
  excerpt: resolveExcerpt(post),
  authorName: resolveAuthorName(post),
  publishedAt: toIso(post.publishedAt),
  status: post.status,
  tags: [],
});

export async function resolvePostsFeedRuntimeData(
  input: PostsFeedData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
  },
  deps: Partial<PostsFeedResolverDeps> = {}
) {
  const runtimeDeps = {
    ...defaultDeps,
    ...deps,
  };

  const normalized = normalizePostsFeedData(input);
  const source = normalized.source ?? {};
  const mode = source.mode ?? "latest";
  const limit = source.limit ?? 6;
  const sort = source.sort ?? "published-desc";
  const detailPathPattern = resolveDetailPathPattern(options.contentRoutes);

  const allPosts = await runtimeDeps.listPosts();
  const visible = allPosts.filter((post) => includePostByVisibility(post, options.preview));
  const modeFiltered = filterByMode(
    visible,
    mode,
    source.category ?? "",
    source.manualPostIds ?? []
  );

  const ordered =
    mode === "manual" ? modeFiltered : sortPosts(modeFiltered, sort);
  const sliced = ordered.slice(0, limit);

  return {
    items: sliced.map((post) => mapPostToRuntimeItem(post, detailPathPattern)),
    total: modeFiltered.length,
    sourceMode: mode,
    resolvedAt: new Date().toISOString(),
  };
}
