import { getMediaById } from "../media/mediaService";
import type { ContentRouteSetting } from "../settings/settingsService";
import { listEntries } from "./entryService";
import { getContentType, getContentTypeBySlug } from "./typeService";
import { getListingQuery } from "./listingQueriesService";
import {
  getListingTemplate,
  type ListingTemplateRecord,
} from "./listingTemplatesService";
import {
  findListingBindingState,
  resolveListingBindingIndex,
  type ListingRuntimeBindingState,
} from "./listingRuntimeResolver";
import {
  executeListingQuery,
  type ListingQuery,
} from "./queryBuilderService";
import {
  parseListingRuntimeOverrides,
  resolveListingRuntimeOverrides,
} from "../search/filterEngine";
import {
  contentListDefaults,
  normalizeContentListData,
  normalizeContentListLimit,
  type ContentListSourceMode,
  type ContentListData,
  type ContentListRuntimeItem,
} from "../../widgets/core/contentList";
import { resolvePostRuntimeExcerpt } from "../posts/runtime/postBlockRuntimeMapper";

type ListEntriesRow = Awaited<ReturnType<typeof listEntries>>[number];
export type ContentListResolverEntry = ListEntriesRow;

const featuredTagToken = "featured";
const excerptMaxLength = 220;
const postsTypeSlugs = ["post", "posts"] as const;

type ContentTypeSnapshot = {
  id: string;
  slug: string;
};

type ContentListListingRuntimeDeps = {
  getListingQueryById: typeof getListingQuery;
  getListingTemplateById: typeof getListingTemplate;
  executeListing: typeof executeListingQuery;
  getContentTypeById: typeof getContentType;
  getContentTypeBySlug: typeof getContentTypeBySlug;
};

const defaultListingRuntimeDeps: ContentListListingRuntimeDeps = {
  getListingQueryById: getListingQuery,
  getListingTemplateById: getListingTemplate,
  executeListing: executeListingQuery,
  getContentTypeById: getContentType,
  getContentTypeBySlug,
};

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
  const runtimeExcerpt = resolvePostRuntimeExcerpt(data, excerptMaxLength);
  if (runtimeExcerpt) return runtimeExcerpt;
  const candidates = [
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

const readPathValue = (row: Record<string, unknown>, path: string): unknown => {
  const segments = path.split(".");
  let current: unknown = row;
  for (const segment of segments) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
};

const toDisplayString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
};

const toIsoDateString = (value: unknown): string | undefined => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  return undefined;
};

const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => toDisplayString(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }
  return [];
};

type TemplateFieldResolutionState = {
  matched: boolean;
  visible: boolean;
  value: unknown;
};

const resolveTemplateFieldState = (
  bindingIndex: Record<string, ListingRuntimeBindingState>,
  keys: string[]
): TemplateFieldResolutionState => {
  const binding = findListingBindingState(bindingIndex, keys);
  if (!binding) {
    return {
      matched: false,
      visible: true,
      value: undefined,
    };
  }
  return {
    matched: true,
    visible: binding.visible,
    value: binding.value,
  };
};

const resolveStringFromTemplateOrPaths = (
  row: Record<string, unknown>,
  bindingIndex: Record<string, ListingRuntimeBindingState>,
  templateKeys: string[],
  fallbackPaths: string[]
) => {
  const templateFieldState = resolveTemplateFieldState(bindingIndex, templateKeys);
  if (templateFieldState.matched) {
    if (!templateFieldState.visible) return undefined;
    return toDisplayString(templateFieldState.value);
  }
  for (const path of fallbackPaths) {
    const fromRow = toDisplayString(readPathValue(row, path));
    if (fromRow) return fromRow;
  }
  return undefined;
};

const resolveTagsFromTemplateOrPaths = (
  row: Record<string, unknown>,
  bindingIndex: Record<string, ListingRuntimeBindingState>
) => {
  const templateFieldState = resolveTemplateFieldState(bindingIndex, [
    "tags",
    "categories",
  ]);
  if (templateFieldState.matched) {
    if (!templateFieldState.visible) return [];
    return toStringList(templateFieldState.value);
  }
  return toStringList(readPathValue(row, "tags"));
};

const resolveImageCandidateFromListingRow = (
  row: Record<string, unknown>,
  bindingIndex: Record<string, ListingRuntimeBindingState>
) => {
  const templateFieldState = resolveTemplateFieldState(bindingIndex, [
    "image",
    "imageSrc",
    "cover",
    "thumbnail",
  ]);
  if (templateFieldState.matched) {
    if (!templateFieldState.visible) return null;
    return readMediaCandidate(templateFieldState.value);
  }

  const candidates: unknown[] = [
    readPathValue(row, "imageSrc"),
    readPathValue(row, "image"),
    readPathValue(row, "coverImage"),
    readPathValue(row, "featuredImage"),
    readPathValue(row, "data.image"),
    readPathValue(row, "data.coverImage"),
    readPathValue(row, "data.featuredImage"),
  ];
  for (const candidate of candidates) {
    const resolved = readMediaCandidate(candidate);
    if (resolved) return resolved;
  }
  return null;
};

const interpolateTemplateHref = (
  template: string,
  row: Record<string, unknown>
) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, path: string) => {
    const value = readPathValue(row, path);
    return toDisplayString(value) ?? "";
  });

const resolveTemplateActionHref = (
  row: Record<string, unknown>,
  template: ListingTemplateRecord | null
) => {
  if (!template) return undefined;
  const action =
    template.config.itemActions.find((item) => item.kind === "view") ??
    template.config.itemActions.find((item) => item.kind === "custom");
  if (!action?.href) return undefined;
  return sanitizeHref(interpolateTemplateHref(action.href, row));
};

const resolvePostsType = async (
  deps: ContentListListingRuntimeDeps
): Promise<ContentTypeSnapshot | null> => {
  for (const slug of postsTypeSlugs) {
    const type = await deps.getContentTypeBySlug(slug);
    if (type) {
      return { id: type.id, slug: type.slug };
    }
  }
  return null;
};

const resolveListingRouteMeta = async (
  query: ListingQuery,
  contentRoutes: ContentRouteSetting[],
  deps: ContentListListingRuntimeDeps
) => {
  if (query.source === "entries") {
    const typeId = query.sourceConfig.contentTypeId?.trim();
    if (!typeId) {
      return {
        sourceTypeId: "",
        sourceTypeSlug: "",
        detailPathPattern: undefined,
      };
    }
    const contentType = await deps.getContentTypeById(typeId);
    if (!contentType) {
      return {
        sourceTypeId: typeId,
        sourceTypeSlug: "",
        detailPathPattern: undefined,
      };
    }
    return {
      sourceTypeId: contentType.id,
      sourceTypeSlug: contentType.slug,
      detailPathPattern: resolveDetailPathPattern(contentRoutes, contentType.slug),
    };
  }

  if (query.source === "posts") {
    const postType = await resolvePostsType(deps);
    if (!postType) {
      return {
        sourceTypeId: "",
        sourceTypeSlug: "",
        detailPathPattern: undefined,
      };
    }
    return {
      sourceTypeId: postType.id,
      sourceTypeSlug: postType.slug,
      detailPathPattern: resolveDetailPathPattern(contentRoutes, postType.slug),
    };
  }

  return {
    sourceTypeId: query.source,
    sourceTypeSlug: query.source,
    detailPathPattern: undefined,
  };
};

const normalizeListingQueryForRuntime = (query: ListingQuery, preview: boolean): ListingQuery => {
  if (preview) return query;
  if (query.source !== "entries" && query.source !== "posts") return query;
  return {
    ...query,
    sourceConfig: {
      ...query.sourceConfig,
      includeDrafts: false,
    },
  };
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

export async function mapListingRowsToContentListItems(
  rows: Record<string, unknown>[],
  options: {
    detailPathPattern?: string;
    showImage: boolean;
    template?: ListingTemplateRecord | null;
  }
): Promise<ContentListRuntimeItem[]> {
  const mediaCache = new Map<string, { url: string; alt?: string } | null>();

  return Promise.all(
    rows.map(async (row, index) => {
      const bindingIndex = resolveListingBindingIndex(
        row,
        options.template?.config.fields
      );

      const id = resolveStringFromTemplateOrPaths(
        row,
        bindingIndex,
        ["id"],
        ["id"]
      );
      const slug = resolveStringFromTemplateOrPaths(
        row,
        bindingIndex,
        ["slug"],
        ["slug"]
      );
      const title = resolveStringFromTemplateOrPaths(
        row,
        bindingIndex,
        ["title", "name", "headline"],
        ["title", "name", "data.title", "data.name"]
      );
      const excerpt = resolveStringFromTemplateOrPaths(
        row,
        bindingIndex,
        ["excerpt", "summary", "description"],
        ["excerpt", "summary", "description", "data.excerpt", "data.summary", "data.description"]
      );
      const authorName = resolveStringFromTemplateOrPaths(
        row,
        bindingIndex,
        ["author", "authorName"],
        ["author.name", "authorName", "name"]
      );
      const status = resolveStringFromTemplateOrPaths(
        row,
        bindingIndex,
        ["status"],
        ["status"]
      );
      const publishedAtBinding = resolveTemplateFieldState(bindingIndex, [
        "publishedAt",
        "date",
      ]);
      const publishedAt =
        publishedAtBinding.matched
          ? publishedAtBinding.visible
            ? toIsoDateString(publishedAtBinding.value)
            : undefined
          : toIsoDateString(readPathValue(row, "publishedAt")) ??
            toIsoDateString(readPathValue(row, "updatedAt")) ??
            toIsoDateString(readPathValue(row, "createdAt"));

      const hrefBinding = resolveTemplateFieldState(bindingIndex, ["href", "url"]);
      const hrefFromBindingRaw =
        hrefBinding.matched && hrefBinding.visible
          ? toDisplayString(hrefBinding.value)
          : undefined;
      const hrefFromBinding =
        hrefFromBindingRaw !== undefined
          ? sanitizeHref(hrefFromBindingRaw)
          : undefined;
      const templateHref =
        !hrefBinding.matched && hrefFromBinding === undefined
          ? resolveTemplateActionHref(row, options.template ?? null)
          : undefined;
      const hrefFromRowRaw =
        !hrefBinding.matched && hrefFromBinding === undefined
          ? resolveStringFromTemplateOrPaths(row, bindingIndex, ["href", "url"], ["href", "url"])
          : undefined;
      const hrefFromRow =
        hrefFromRowRaw !== undefined ? sanitizeHref(hrefFromRowRaw) : undefined;
      const detailHref =
        !hrefBinding.matched && options.detailPathPattern && (slug || id)
          ? sanitizeHref(
              buildDetailHref(
                options.detailPathPattern,
                slug ?? id ?? `item-${index + 1}`,
                id ?? slug ?? `item-${index + 1}`
              )
            )
          : undefined;
      const href = hrefFromBinding ?? templateHref ?? hrefFromRow ?? detailHref;

      const imageCandidate = options.showImage
        ? resolveImageCandidateFromListingRow(row, bindingIndex)
        : null;
      const resolvedImage = await resolveItemImage(imageCandidate, mediaCache);

      return {
        id: id ?? `listing-item-${index + 1}`,
        title: title ?? `Item ${index + 1}`,
        slug,
        href,
        excerpt,
        imageSrc: resolvedImage.src,
        imageAlt: resolvedImage.alt,
        tags: resolveTagsFromTemplateOrPaths(row, bindingIndex),
        authorName,
        publishedAt,
        status,
      };
    })
  );
}

export async function resolveListingContentListRuntimeData(
  input: ContentListData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
  },
  deps: Partial<ContentListListingRuntimeDeps> = {}
) {
  const runtimeDeps: ContentListListingRuntimeDeps = {
    ...defaultListingRuntimeDeps,
    ...deps,
  };
  const normalized = normalizeContentListData(input);
  const source = normalized.source ?? contentListDefaults.source!;
  const listingQueryId = source.listingQueryId?.trim() ?? "";
  const listingTemplateId = source.listingTemplateId?.trim() ?? "";

  if (!listingQueryId) {
    return {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      listingQueryId: "",
      listingTemplateId: listingTemplateId,
      resolvedAt: new Date().toISOString(),
    };
  }

  const listingQuery = await runtimeDeps.getListingQueryById(listingQueryId);
  if (!listingQuery) {
    return {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      listingQueryId,
      listingTemplateId,
      resolvedAt: new Date().toISOString(),
      error: "Selected listing query no longer exists.",
    };
  }

  const listingTemplate = listingTemplateId
    ? await runtimeDeps.getListingTemplateById(listingTemplateId)
    : null;
  if (listingTemplateId && !listingTemplate) {
    return {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      listingQueryId,
      listingTemplateId,
      resolvedAt: new Date().toISOString(),
      error: "Selected listing template no longer exists.",
    };
  }

  const baseQuery = normalizeListingQueryForRuntime(listingQuery.query, options.preview);
  const runtimeDraft = options.runtimeSearchParams
    ? parseListingRuntimeOverrides(options.runtimeSearchParams, listingQueryId)
    : parseListingRuntimeOverrides(new URLSearchParams(), listingQueryId);
  const runtime = resolveListingRuntimeOverrides(baseQuery, runtimeDraft);
  const execution = await runtimeDeps.executeListing(runtime.query);
  const routeMeta = await resolveListingRouteMeta(
    listingQuery.query,
    options.contentRoutes,
    runtimeDeps
  );
  const items = await mapListingRowsToContentListItems(
    execution.rows as Record<string, unknown>[],
    {
      detailPathPattern: routeMeta.detailPathPattern,
      showImage: Boolean(normalized.fields?.showImage),
      template: listingTemplate,
    }
  );

  return {
    items,
    total: execution.total,
    sourceTypeId: routeMeta.sourceTypeId,
    sourceTypeSlug: routeMeta.sourceTypeSlug,
    listingQueryId,
    listingTemplateId,
    resolvedAt: new Date().toISOString(),
    runtime: {
      rejectedTokens: runtime.rejectedTokens,
      searchQuery: runtime.searchQuery,
      page: runtime.page,
    },
  };
}

export async function resolveContentListRuntimeData(
  input: ContentListData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
  },
  deps: Partial<ContentListListingRuntimeDeps> = {}
) {
  const normalized = normalizeContentListData(input);
  const source = normalized.source ?? contentListDefaults.source!;
  const sourceMode: ContentListSourceMode = source.mode ?? "legacy";

  if (sourceMode === "listing") {
    return resolveListingContentListRuntimeData(input, options, deps);
  }

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
