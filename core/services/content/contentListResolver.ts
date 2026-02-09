import { getMediaById } from "../media/mediaService";
import type { ContentRouteSetting } from "../settings/settingsService";
import { listEntries } from "./entryService";
import { getContentType } from "./typeService";
import {
  contentListDefaults,
  normalizeContentListData,
  normalizeContentListLimit,
  type ContentListData,
  type ContentListRuntimeItem,
} from "../../widgets/core/contentList";

type ListEntriesRow = Awaited<ReturnType<typeof listEntries>>[number];
export type ContentListResolverEntry = ListEntriesRow;

const featuredTagToken = "featured";
const excerptMaxLength = 220;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLikelyUrl = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");

const sanitizeHref = (value: string) =>
  value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")
    ? value
    : "#";

const normalizeText = (value: string | undefined) =>
  (value ?? "").trim().toLowerCase();

const trimToOptional = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max).trimEnd()}...`;

const buildDetailHref = (pattern: string, slug: string, id: string) => {
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

const resolveExcerpt = (entry: ListEntriesRow) => {
  const data = isRecord(entry.data) ? entry.data : {};
  const candidates = [
    data.excerpt,
    data.summary,
    data.description,
    data.lead,
    data.intro,
    data.content,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const plain = stripHtml(candidate);
    if (plain.length === 0) continue;
    return truncate(plain, excerptMaxLength);
  }
  return undefined;
};

type MediaCandidate = {
  url?: string;
  mediaId?: string;
  alt?: string;
};

const readMediaCandidate = (value: unknown): MediaCandidate | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return isLikelyUrl(trimmed)
      ? { url: trimmed }
      : { mediaId: trimmed };
  }
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const resolved = readMediaCandidate(candidate);
      if (resolved) return resolved;
    }
    return null;
  }
  if (!isRecord(value)) return null;

  const urlCandidate =
    typeof value.url === "string"
      ? trimToOptional(value.url)
      : typeof value.src === "string"
        ? trimToOptional(value.src)
        : undefined;
  const mediaId =
    typeof value.id === "string"
      ? trimToOptional(value.id)
      : typeof value.assetId === "string"
        ? trimToOptional(value.assetId)
        : undefined;
  const alt =
    typeof value.alt === "string"
      ? trimToOptional(value.alt)
      : typeof value.title === "string"
        ? trimToOptional(value.title)
        : undefined;

  if (urlCandidate && isLikelyUrl(urlCandidate)) {
    return { url: urlCandidate, mediaId, alt };
  }
  if (mediaId) {
    return { mediaId, alt };
  }
  return null;
};

const imageFieldCandidates = [
  "image",
  "imageUrl",
  "coverImage",
  "featuredImage",
  "heroImage",
  "thumbnail",
] as const;

const resolveImageCandidateFromEntry = (entry: ListEntriesRow): MediaCandidate | null => {
  const data = isRecord(entry.data) ? entry.data : {};
  for (const key of imageFieldCandidates) {
    const resolved = readMediaCandidate(data[key]);
    if (resolved) return resolved;
  }
  return null;
};

const resolveSortableTime = (entry: ListEntriesRow, mode: "published" | "updated") => {
  if (mode === "published") {
    const publishedTs = entry.publishedAt?.getTime();
    if (publishedTs) return publishedTs;
  }
  return entry.updatedAt?.getTime() ?? 0;
};

const normalizeTagList = (tags: string[] | undefined) =>
  Array.isArray(tags)
    ? tags
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

const isFeaturedEntry = (entry: ListEntriesRow) => {
  const tags = normalizeTagList(entry.tags as string[] | undefined);
  const byTag = tags.some((tag) => normalizeText(tag) === featuredTagToken);
  if (byTag) return true;
  if (!isRecord(entry.data)) return false;
  return entry.data.featured === true;
};

const matchStatusScope = (
  entry: ListEntriesRow,
  scope: NonNullable<ContentListData["source"]>["statusScope"],
  preview: boolean
) => {
  if (!preview) {
    return entry.status === "published" && Boolean(entry.publishedAt ?? true);
  }
  if (scope === "all") return true;
  return entry.status === scope;
};

const buildSearchHaystack = (entry: ListEntriesRow) => {
  const tags = normalizeTagList(entry.tags as string[] | undefined).join(" ");
  const excerpt = resolveExcerpt(entry) ?? "";
  return normalizeText(`${entry.title} ${entry.slug} ${tags} ${excerpt}`);
};

export function applyContentListRuntimeFilters(
  entries: ListEntriesRow[],
  config: ContentListData,
  options: { preview: boolean }
) {
  const normalized = normalizeContentListData(config);
  const scope = normalized.source?.statusScope ?? "published";
  const taxonomy = normalizeText(normalized.filters?.taxonomy);
  const query = normalizeText(normalized.filters?.searchQuery);
  const authorId = normalizeText(normalized.filters?.authorId);
  const featuredOnly = Boolean(normalized.filters?.featuredOnly);

  return entries.filter((entry) => {
    if (!matchStatusScope(entry, scope, options.preview)) return false;

    if (featuredOnly && !isFeaturedEntry(entry)) return false;

    if (authorId.length > 0) {
      const entryAuthorId = normalizeText(entry.author?.id);
      if (entryAuthorId !== authorId) return false;
    }

    if (taxonomy.length > 0) {
      const tags = normalizeTagList(entry.tags as string[] | undefined).map(normalizeText);
      if (!tags.some((tag) => tag.includes(taxonomy))) return false;
    }

    if (query.length > 0) {
      const haystack = buildSearchHaystack(entry);
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function sortContentListRuntimeEntries(
  entries: ListEntriesRow[],
  sort: NonNullable<ContentListData["source"]>["sort"]
) {
  const next = [...entries];
  if (sort === "published-asc") {
    return next.sort(
      (a, b) => resolveSortableTime(a, "published") - resolveSortableTime(b, "published")
    );
  }
  if (sort === "updated-desc") {
    return next.sort(
      (a, b) => resolveSortableTime(b, "updated") - resolveSortableTime(a, "updated")
    );
  }
  if (sort === "updated-asc") {
    return next.sort(
      (a, b) => resolveSortableTime(a, "updated") - resolveSortableTime(b, "updated")
    );
  }
  if (sort === "title-asc") {
    return next.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "title-desc") {
    return next.sort((a, b) => b.title.localeCompare(a.title));
  }
  return next.sort(
    (a, b) => resolveSortableTime(b, "published") - resolveSortableTime(a, "published")
  );
}

const resolveDetailPathPattern = (
  routes: ContentRouteSetting[],
  typeSlug: string
) => {
  const route = routes.find((entry) => entry.type === typeSlug && entry.enabled);
  return route?.detailPath ?? `/${typeSlug}/:slug`;
};

async function resolveItemImage(
  candidate: MediaCandidate | null,
  cache: Map<string, { url: string; alt?: string } | null>
) {
  if (!candidate) return { src: undefined as string | undefined, alt: undefined as string | undefined };
  if (candidate.url) {
    return { src: candidate.url, alt: candidate.alt };
  }
  const mediaId = candidate.mediaId;
  if (!mediaId) return { src: undefined, alt: candidate.alt };

  if (cache.has(mediaId)) {
    const cached = cache.get(mediaId);
    return {
      src: cached?.url,
      alt: candidate.alt ?? cached?.alt,
    };
  }

  try {
    const media = await getMediaById(mediaId);
    if (!media?.url) {
      cache.set(mediaId, null);
      return { src: undefined, alt: candidate.alt };
    }
    cache.set(mediaId, {
      url: media.url,
      alt: media.alt ?? media.title ?? undefined,
    });
    return {
      src: media.url,
      alt: candidate.alt ?? media.alt ?? media.title ?? undefined,
    };
  } catch {
    cache.set(mediaId, null);
    return { src: undefined, alt: candidate.alt };
  }
}

export async function mapEntriesToContentListItems(
  entries: ListEntriesRow[],
  options: {
    detailPathPattern: string;
    showImage: boolean;
  }
): Promise<ContentListRuntimeItem[]> {
  const mediaCache = new Map<string, { url: string; alt?: string } | null>();

  return Promise.all(
    entries.map(async (entry) => {
      const imageCandidate = options.showImage
        ? resolveImageCandidateFromEntry(entry)
        : null;
      const resolvedImage = await resolveItemImage(imageCandidate, mediaCache);
      return {
        id: entry.id,
        title: entry.title,
        slug: entry.slug,
        href: sanitizeHref(
          buildDetailHref(options.detailPathPattern, entry.slug, entry.id)
        ),
        excerpt: resolveExcerpt(entry),
        imageSrc: resolvedImage.src,
        imageAlt: resolvedImage.alt,
        tags: normalizeTagList(entry.tags as string[] | undefined),
        authorName: entry.author?.name ?? undefined,
        publishedAt: entry.publishedAt
          ? entry.publishedAt.toISOString()
          : entry.updatedAt.toISOString(),
        status: entry.status,
      };
    })
  );
}

export async function resolveContentListRuntimeData(
  input: ContentListData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
  }
) {
  const normalized = normalizeContentListData(input);
  const source = normalized.source ?? contentListDefaults.source!;
  const contentTypeId = source.contentTypeId?.trim();

  if (!contentTypeId) {
    return {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
    };
  }

  const contentType = await getContentType(contentTypeId);
  if (!contentType) {
    return {
      items: [],
      total: 0,
      sourceTypeId: contentTypeId,
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
      error: "Selected content type no longer exists.",
    };
  }

  const entries = await listEntries(contentTypeId);
  const filtered = applyContentListRuntimeFilters(entries, normalized, {
    preview: options.preview,
  });
  const sorted = sortContentListRuntimeEntries(
    filtered,
    source.sort ?? "published-desc"
  );
  const limit = normalizeContentListLimit(source.limit ?? 6);
  const sliced = sorted.slice(0, limit);
  const detailPathPattern = resolveDetailPathPattern(
    options.contentRoutes,
    contentType.slug
  );
  const items = await mapEntriesToContentListItems(sliced, {
    detailPathPattern,
    showImage: Boolean(normalized.fields?.showImage),
  });

  return {
    items,
    total: filtered.length,
    sourceTypeId: contentType.id,
    sourceTypeSlug: contentType.slug,
    resolvedAt: new Date().toISOString(),
  };
}
