import type { ContentRouteSetting } from "../settings/settingsContracts";
import { listEntries } from "./entryService";
import { POST_CONTENT_TYPE_SLUG } from "./postsService";
import { getContentType, getContentTypeBySlug } from "./typeService";
import { getListingQuery } from "./listingQueriesService";
import { getListingTemplate, type ListingTemplateRecord } from "./listingTemplatesService";
import {
  findListingBindingState,
  resolveListingBindingIndex,
  type ListingRuntimeBindingState,
} from "./listingRuntimeResolver";
import { executeListingQuery, type ListingQuery } from "./queryBuilderService";
import {
  parseListingRuntimeOverrides,
  resolveListingRuntimeOverrides,
} from "../search/filterEngine";
import {
  listingRuntimeTokens,
  resolveListingRuntimeParamName,
  type ListingRuntimeAliasMap,
} from "../search/filterContract";
import {
  buildContentListPageHref,
  contentListDefaults,
  normalizeContentListData,
  normalizeContentListLimit,
  type ContentListPaginationMode,
  type ContentListSourceMode,
  type ContentListData,
  type ContentListRuntimeItem,
} from "../../widgets/core/contentList";
import {
  isPostContentTypeSlug,
  resolvePostRuntimeExcerpt,
} from "../posts/runtime/postBlockRuntimeMapper";
import { isCuratedMediaUrl } from "../media/curatedMediaProfiles";
import { getMediaById } from "../media/mediaService";
import {
  readMediaCandidate,
  resolveContentItemImage,
  type ContentMediaCandidate,
  type ContentMediaLookup,
} from "./contentMediaResolver";

type ListEntriesRow = Awaited<ReturnType<typeof listEntries>>[number];
export type ContentListResolverEntry = ListEntriesRow;
type ContentListResolvedRuntimeMeta = NonNullable<
  NonNullable<ContentListData["resolved"]>["runtime"]
>;
export type ContentListResolvedRuntimeData = {
  items: ContentListRuntimeItem[];
  total: number;
  sourceTypeId: string;
  sourceTypeSlug: string;
  listPath?: string;
  listingQueryId?: string;
  listingTemplateId?: string;
  resolvedAt: string;
  runtime?: ContentListResolvedRuntimeMeta;
  /**
   * Dangling-route guard (TASK-459-03 frozen policy): "missing-route" when
   * the source content type has NO enabled content route, so detail hrefs
   * were suppressed instead of linking at URLs `matchContentRoute` cannot
   * match. Undefined for sources without a route concept (custom tables).
   */
  cardLinkMode?: "ready" | "missing-route";
  /**
   * Listing template presentation passthrough (TASK-459-03): the bound
   * template's normalized `config.style` / `config.emptyState`, consumed by
   * the render-side binding (NOT part of the normalized widget payload).
   */
  templateStyle?: ListingTemplateRecord["config"]["style"];
  templateEmptyState?: ListingTemplateRecord["config"]["emptyState"];
  error?: string;
};
export type ListingContentListResolvedRuntimeData = ContentListResolvedRuntimeData & {
  rawRows: Record<string, unknown>[];
  listPath: string;
  listingQueryId: string;
  listingTemplateId: string;
};

const featuredTagToken = "featured";
const excerptMaxLength = 220;

type ContentListListingRuntimeDeps = {
  getListingQueryById: typeof getListingQuery;
  getListingTemplateById: typeof getListingTemplate;
  executeListing: typeof executeListingQuery;
  getContentTypeById: typeof getContentType;
  getContentTypeBySlug: typeof getContentTypeBySlug;
  listEntriesByTypeId: typeof listEntries;
};

const defaultListingRuntimeDeps: ContentListListingRuntimeDeps = {
  getListingQueryById: getListingQuery,
  getListingTemplateById: getListingTemplate,
  executeListing: executeListingQuery,
  getContentTypeById: getContentType,
  getContentTypeBySlug,
  listEntriesByTypeId: listEntries,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeHref = (value: string) =>
  value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")
    ? value
    : "#";

const normalizeText = (value: string | undefined) => (value ?? "").trim().toLowerCase();

const resolveLegacyContentListPageKey = (blockId?: string) => {
  const normalizedBlockId = (blockId ?? "content-list").trim() || "content-list";
  return `cl.${normalizedBlockId}.page`;
};

export const resolveContentListRequestedPage = (
  runtimeSearchParams: URLSearchParams | undefined,
  pageKey: string
) => {
  const raw = Number(runtimeSearchParams?.get(pageKey) ?? "1");
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
};

export function resolveContentListRuntimeNavigationMeta({
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
}) {
  const safePageSize = Math.max(1, normalizeContentListLimit(pageSize));
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;
  const search = runtimeSearchParams?.toString() ?? "";

  return {
    page: currentPage,
    pageSize: safePageSize,
    totalPages,
    // Pager contract (TASK-459-03): the widget builds numbered page hrefs
    // from the SAME owner helper, so it also receives the param key and the
    // serialized search the prev/next hrefs were derived from.
    pageParamKey: pageKey,
    search,
    previousPageHref:
      previousPage !== null ? buildContentListPageHref(search, pageKey, previousPage) : undefined,
    nextPageHref:
      nextPage !== null ? buildContentListPageHref(search, pageKey, nextPage) : undefined,
  };
}

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
  const candidates = [data.summary, data.description, data.lead, data.intro, data.content];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const plain = stripHtml(candidate);
    if (plain.length === 0) continue;
    return truncate(plain, excerptMaxLength);
  }
  return undefined;
};

const imageFieldCandidates = [
  "image",
  "imageUrl",
  "coverImage",
  "coverImageUrl",
  "featuredImage",
  "heroImage",
  "thumbnail",
] as const;
const curatedExternalImageFieldCandidates = new Set(["coverImageUrl"]);

const readImageFieldName = (field: string) => field.split(".").at(-1) ?? field;

const imageAltFieldCandidates = [
  "imageAlt",
  "coverImageAlt",
  "featuredImageAlt",
  "heroImageAlt",
  "thumbnailAlt",
  "alt",
] as const;

const resolveImageAltFromRecord = (record: Record<string, unknown>): string | undefined => {
  for (const key of imageAltFieldCandidates) {
    const resolved = toDisplayString(record[key]);
    if (resolved) return resolved;
  }
  return undefined;
};

const readImageCandidateForField = (
  field: string,
  value: unknown
): ContentMediaCandidate | null => {
  const candidate = readMediaCandidate(value);
  if (!candidate?.url || !curatedExternalImageFieldCandidates.has(readImageFieldName(field))) {
    return candidate;
  }
  return isCuratedMediaUrl(candidate.url) ? candidate : null;
};

const resolveImageCandidateFromEntry = (entry: ListEntriesRow): ContentMediaCandidate | null => {
  const data = isRecord(entry.data) ? entry.data : {};
  const alt = resolveImageAltFromRecord(data);
  for (const key of imageFieldCandidates) {
    const resolved = readImageCandidateForField(key, data[key]);
    if (resolved) return resolved.alt ? resolved : { ...resolved, alt };
  }
  return null;
};

const resolveSortableTime = (
  entry: { publishedAt?: Date | null; updatedAt?: Date | null },
  mode: "published" | "updated"
) => {
  if (mode === "published") {
    const publishedTs = entry.publishedAt?.getTime();
    if (publishedTs) return publishedTs;
  }
  return entry.updatedAt?.getTime() ?? 0;
};

const normalizeTagList = (tags: string[] | undefined) =>
  Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [];

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

export type ContentListSortableEntry = {
  title: string;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
};

export function sortContentListRuntimeEntries<T extends ContentListSortableEntry>(
  entries: T[],
  sort: NonNullable<ContentListData["source"]>["sort"]
): T[] {
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

/**
 * Detail-path pattern for card links. TASK-459-03 frozen dangling-route
 * policy: when no ENABLED content route exists for the type this returns
 * `undefined` (links suppressed, cards render plain) — the old
 * `/<typeSlug>/:slug` fallback produced hrefs `matchContentRoute` can never
 * match (guaranteed 404s).
 */
const resolveDetailPathPattern = (
  routes: ContentRouteSetting[],
  typeSlug: string
): string | undefined => {
  const route = routes.find((entry) => entry.type === typeSlug && entry.enabled);
  return route?.detailPath;
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
  key?: string;
  source?: string;
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
    key: binding.key,
    source: binding.source,
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
  const templateFieldState = resolveTemplateFieldState(bindingIndex, ["tags", "categories"]);
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
  const data = isRecord(row.data) ? row.data : {};
  const alt =
    resolveStringFromTemplateOrPaths(
      row,
      bindingIndex,
      ["imageAlt", "coverImageAlt", "alt"],
      ["imageAlt", "coverImageAlt", "data.imageAlt", "data.coverImageAlt", "data.alt"]
    ) ?? resolveImageAltFromRecord(data);
  const withAlt = (candidate: ContentMediaCandidate | null) =>
    candidate && !candidate.alt ? { ...candidate, alt } : candidate;
  const templateFieldState = resolveTemplateFieldState(bindingIndex, [
    "image",
    "imageSrc",
    "cover",
    "coverImageUrl",
    "imageUrl",
    "heroImage",
    "thumbnail",
  ]);
  if (templateFieldState.matched) {
    if (!templateFieldState.visible) return null;
    return withAlt(
      readImageCandidateForField(templateFieldState.source ?? "", templateFieldState.value)
    );
  }

  const candidates: Array<{ field: string; value: unknown }> = [
    { field: "imageSrc", value: readPathValue(row, "imageSrc") },
    { field: "image", value: readPathValue(row, "image") },
    { field: "imageUrl", value: readPathValue(row, "imageUrl") },
    { field: "coverImage", value: readPathValue(row, "coverImage") },
    { field: "coverImageUrl", value: readPathValue(row, "coverImageUrl") },
    { field: "featuredImage", value: readPathValue(row, "featuredImage") },
    { field: "heroImage", value: readPathValue(row, "heroImage") },
    { field: "image", value: readPathValue(row, "data.image") },
    { field: "imageUrl", value: readPathValue(row, "data.imageUrl") },
    { field: "coverImage", value: readPathValue(row, "data.coverImage") },
    { field: "coverImageUrl", value: readPathValue(row, "data.coverImageUrl") },
    { field: "featuredImage", value: readPathValue(row, "data.featuredImage") },
    { field: "heroImage", value: readPathValue(row, "data.heroImage") },
  ];
  for (const candidate of candidates) {
    const resolved = readImageCandidateForField(candidate.field, candidate.value);
    if (resolved) return withAlt(resolved);
  }
  return null;
};

const interpolateTemplateHref = (template: string, row: Record<string, unknown>) =>
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

const resolvePostsRouteType = (contentRoutes: ContentRouteSetting[]) =>
  contentRoutes.find((entry) => entry.enabled && isPostContentTypeSlug(entry.type))?.type ??
  POST_CONTENT_TYPE_SLUG;

type ListingRouteMeta = {
  sourceTypeId: string;
  sourceTypeSlug: string;
  detailPathPattern: string | undefined;
  listPath: string | undefined;
  /**
   * Dangling-route guard state (TASK-459-03): set only for sources with a
   * content-route concept (entries/posts). "missing-route" means card links
   * were suppressed because no enabled route exists for the type.
   */
  cardLinkMode: "ready" | "missing-route" | undefined;
};

const resolveListingRouteMeta = async (
  query: ListingQuery,
  contentRoutes: ContentRouteSetting[],
  deps: ContentListListingRuntimeDeps
): Promise<ListingRouteMeta> => {
  if (query.source === "entries") {
    const typeId = query.sourceConfig.contentTypeId?.trim();
    if (!typeId) {
      return {
        sourceTypeId: "",
        sourceTypeSlug: "",
        detailPathPattern: undefined,
        listPath: undefined,
        cardLinkMode: undefined,
      };
    }
    const contentType = await deps.getContentTypeById(typeId);
    if (!contentType) {
      return {
        sourceTypeId: typeId,
        sourceTypeSlug: "",
        detailPathPattern: undefined,
        listPath: undefined,
        cardLinkMode: undefined,
      };
    }
    const detailPathPattern = resolveDetailPathPattern(contentRoutes, contentType.slug);
    return {
      sourceTypeId: contentType.id,
      sourceTypeSlug: contentType.slug,
      detailPathPattern,
      listPath: contentRoutes.find((entry) => entry.type === contentType.slug && entry.enabled)
        ?.listPath,
      cardLinkMode: detailPathPattern ? "ready" : "missing-route",
    };
  }

  if (query.source === "posts") {
    const postRouteType = resolvePostsRouteType(contentRoutes);
    const detailPathPattern = resolveDetailPathPattern(contentRoutes, postRouteType);
    return {
      sourceTypeId: POST_CONTENT_TYPE_SLUG,
      sourceTypeSlug: postRouteType,
      detailPathPattern,
      listPath: contentRoutes.find((entry) => entry.type === postRouteType && entry.enabled)
        ?.listPath,
      cardLinkMode: detailPathPattern ? "ready" : "missing-route",
    };
  }

  return {
    sourceTypeId: query.source,
    sourceTypeSlug: query.source,
    detailPathPattern: undefined,
    listPath: undefined,
    cardLinkMode: undefined,
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

export async function mapEntriesToContentListItems(
  entries: ListEntriesRow[],
  options: {
    /** Absent = no enabled content route: card hrefs are suppressed. */
    detailPathPattern?: string;
    showImage: boolean;
  },
  deps: {
    getMediaById?: (id: string) => Promise<ContentMediaLookup>;
  } = {}
): Promise<ContentListRuntimeItem[]> {
  const mediaCache = new Map<string, { url: string; alt?: string } | null>();
  const runtimeGetMediaById = deps.getMediaById ?? getMediaById;
  const detailPathPattern = options.detailPathPattern;

  return Promise.all(
    entries.map(async (entry) => {
      const imageCandidate = options.showImage ? resolveImageCandidateFromEntry(entry) : null;
      const resolvedImage = await resolveContentItemImage(imageCandidate, mediaCache, {
        getMediaById: runtimeGetMediaById,
      });
      return {
        id: entry.id,
        title: entry.title,
        slug: entry.slug,
        href: detailPathPattern
          ? sanitizeHref(buildDetailHref(detailPathPattern, entry.slug, entry.id))
          : undefined,
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
      const bindingIndex = resolveListingBindingIndex(row, options.template?.config.fields);

      const id = resolveStringFromTemplateOrPaths(row, bindingIndex, ["id"], ["id"]);
      const slug = resolveStringFromTemplateOrPaths(row, bindingIndex, ["slug"], ["slug"]);
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
      const status = resolveStringFromTemplateOrPaths(row, bindingIndex, ["status"], ["status"]);
      const publishedAtBinding = resolveTemplateFieldState(bindingIndex, ["publishedAt", "date"]);
      const publishedAt = publishedAtBinding.matched
        ? publishedAtBinding.visible
          ? toIsoDateString(publishedAtBinding.value)
          : undefined
        : (toIsoDateString(readPathValue(row, "publishedAt")) ??
          toIsoDateString(readPathValue(row, "updatedAt")) ??
          toIsoDateString(readPathValue(row, "createdAt")));

      const hrefBinding = resolveTemplateFieldState(bindingIndex, ["href", "url"]);
      const hrefFromBindingRaw =
        hrefBinding.matched && hrefBinding.visible ? toDisplayString(hrefBinding.value) : undefined;
      const hrefFromBinding =
        hrefFromBindingRaw !== undefined ? sanitizeHref(hrefFromBindingRaw) : undefined;
      const templateHref =
        !hrefBinding.matched && hrefFromBinding === undefined
          ? resolveTemplateActionHref(row, options.template ?? null)
          : undefined;
      const hrefFromRowRaw =
        !hrefBinding.matched && hrefFromBinding === undefined
          ? resolveStringFromTemplateOrPaths(row, bindingIndex, ["href", "url"], ["href", "url"])
          : undefined;
      const hrefFromRow = hrefFromRowRaw !== undefined ? sanitizeHref(hrefFromRowRaw) : undefined;
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
      const resolvedImage = await resolveContentItemImage(imageCandidate, mediaCache, {
        getMediaById,
      });

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
    runtimeAliases?: ListingRuntimeAliasMap;
    blockId?: string;
  },
  deps: Partial<ContentListListingRuntimeDeps> = {}
): Promise<ListingContentListResolvedRuntimeData> {
  const runtimeDeps: ContentListListingRuntimeDeps = {
    ...defaultListingRuntimeDeps,
    ...deps,
  };
  const normalized = normalizeContentListData(input);
  const source = normalized.source ?? contentListDefaults.source!;
  const pagination = normalized.pagination ?? contentListDefaults.pagination!;
  const listingQueryId = source.listingQueryId?.trim() ?? "";
  const listingTemplateId = source.listingTemplateId?.trim() ?? "";

  if (!listingQueryId) {
    return {
      items: [],
      rawRows: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      listPath: "",
      listingQueryId: "",
      listingTemplateId: listingTemplateId,
      resolvedAt: new Date().toISOString(),
    };
  }

  const listingQuery = await runtimeDeps.getListingQueryById(listingQueryId);
  if (!listingQuery) {
    return {
      items: [],
      rawRows: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      listPath: "",
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
      rawRows: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      listPath: "",
      listingQueryId,
      listingTemplateId,
      resolvedAt: new Date().toISOString(),
      error: "Selected listing template no longer exists.",
    };
  }

  const requestedPageSize = normalizeContentListLimit(
    pagination.pageSize ?? source.limit ?? contentListDefaults.source?.limit ?? 6
  );
  const baseQuery = normalizeListingQueryForRuntime(
    {
      ...listingQuery.query,
      pagination: {
        ...listingQuery.query.pagination,
        limit: requestedPageSize,
      },
    },
    options.preview
  );
  const runtimeDraft = options.runtimeSearchParams
    ? parseListingRuntimeOverrides(
        options.runtimeSearchParams,
        listingQueryId,
        options.runtimeAliases
      )
    : parseListingRuntimeOverrides(new URLSearchParams(), listingQueryId, options.runtimeAliases);
  const runtime = resolveListingRuntimeOverrides(baseQuery, runtimeDraft);
  const execution = await runtimeDeps.executeListing(runtime.query);
  const rawRows = execution.rows as Record<string, unknown>[];
  const routeMeta = await resolveListingRouteMeta(
    listingQuery.query,
    options.contentRoutes,
    runtimeDeps
  );
  const items = await mapListingRowsToContentListItems(rawRows, {
    detailPathPattern: routeMeta.detailPathPattern,
    showImage: Boolean(normalized.fields?.showImage),
    template: listingTemplate,
  });

  const runtimeNavigation = resolveContentListRuntimeNavigationMeta({
    page: typeof runtime.page === "number" ? runtime.page : 1,
    pageSize: requestedPageSize,
    total: execution.total,
    runtimeSearchParams: options.runtimeSearchParams,
    pageKey: resolveListingRuntimeParamName(
      listingQueryId,
      listingRuntimeTokens.page,
      options.runtimeAliases
    ),
  });

  const runtimeMeta = {
    rejectedTokens: runtime.rejectedTokens,
    ...(typeof runtime.searchQuery === "string" ? { searchQuery: runtime.searchQuery } : {}),
    page: runtimeNavigation.page,
    pageSize: runtimeNavigation.pageSize,
    totalPages: runtimeNavigation.totalPages,
    pageParamKey: runtimeNavigation.pageParamKey,
    search: runtimeNavigation.search,
    ...(runtimeNavigation.previousPageHref
      ? { previousPageHref: runtimeNavigation.previousPageHref }
      : {}),
    ...(runtimeNavigation.nextPageHref ? { nextPageHref: runtimeNavigation.nextPageHref } : {}),
  };

  return {
    items,
    rawRows,
    total: execution.total,
    sourceTypeId: routeMeta.sourceTypeId,
    sourceTypeSlug: routeMeta.sourceTypeSlug,
    listPath: routeMeta.listPath ?? "",
    listingQueryId,
    listingTemplateId,
    resolvedAt: new Date().toISOString(),
    runtime: runtimeMeta,
    ...(routeMeta.cardLinkMode ? { cardLinkMode: routeMeta.cardLinkMode } : {}),
    ...(listingTemplate
      ? {
          templateStyle: listingTemplate.config.style,
          templateEmptyState: listingTemplate.config.emptyState,
        }
      : {}),
  };
}

export async function resolveContentListRuntimeData(
  input: ContentListData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
    runtimeSearchParams?: URLSearchParams;
    runtimeAliases?: ListingRuntimeAliasMap;
    blockId?: string;
  },
  deps: Partial<ContentListListingRuntimeDeps> = {}
): Promise<ContentListResolvedRuntimeData> {
  const normalized = normalizeContentListData(input);
  const source = normalized.source ?? contentListDefaults.source!;
  const pagination = normalized.pagination ?? contentListDefaults.pagination!;
  const sourceMode: ContentListSourceMode = source.mode ?? "legacy";

  if (sourceMode === "listing") {
    const listingResolved = await resolveListingContentListRuntimeData(input, options, deps);
    const { rawRows: _rawRows, ...resolved } = listingResolved;
    return resolved;
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

  const runtimeDeps: ContentListListingRuntimeDeps = {
    ...defaultListingRuntimeDeps,
    ...deps,
  };

  const contentType = await runtimeDeps.getContentTypeById(contentTypeId);
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

  const entries = await runtimeDeps.listEntriesByTypeId(contentTypeId);
  const filtered = applyContentListRuntimeFilters(entries, normalized, {
    preview: options.preview,
  });
  const sorted = sortContentListRuntimeEntries(filtered, source.sort ?? "published-desc");
  const limit = normalizeContentListLimit(source.limit ?? 6);
  const pageSize = normalizeContentListLimit(pagination.pageSize ?? limit);
  const paginationMode: ContentListPaginationMode = pagination.mode ?? "none";
  const pageKey = resolveLegacyContentListPageKey(options.blockId);
  const currentPage =
    paginationMode === "none" || paginationMode === "view-all"
      ? 1
      : resolveContentListRequestedPage(options.runtimeSearchParams, pageKey);
  const effectivePageSize = paginationMode === "none" ? limit : pageSize;
  const sliceStart = paginationMode === "paged" ? (currentPage - 1) * effectivePageSize : 0;
  const sliceEnd =
    paginationMode === "load-more"
      ? currentPage * effectivePageSize
      : sliceStart + effectivePageSize;
  const sliced = sorted.slice(sliceStart, sliceEnd);
  const detailPathPattern = resolveDetailPathPattern(options.contentRoutes, contentType.slug);
  const listPath =
    options.contentRoutes.find((entry) => entry.type === contentType.slug && entry.enabled)
      ?.listPath ?? "";
  const items = await mapEntriesToContentListItems(sliced, {
    detailPathPattern,
    showImage: Boolean(normalized.fields?.showImage),
  });
  const runtimeNavigation = resolveContentListRuntimeNavigationMeta({
    page: currentPage,
    pageSize: effectivePageSize,
    total: filtered.length,
    runtimeSearchParams: options.runtimeSearchParams,
    pageKey,
  });

  return {
    items,
    total: filtered.length,
    sourceTypeId: contentType.id,
    sourceTypeSlug: contentType.slug,
    listPath,
    resolvedAt: new Date().toISOString(),
    cardLinkMode: detailPathPattern ? "ready" : "missing-route",
    runtime: {
      page: runtimeNavigation.page,
      pageSize: runtimeNavigation.pageSize,
      totalPages: runtimeNavigation.totalPages,
      pageParamKey: runtimeNavigation.pageParamKey,
      search: runtimeNavigation.search,
      ...(runtimeNavigation.previousPageHref
        ? { previousPageHref: runtimeNavigation.previousPageHref }
        : {}),
      ...(runtimeNavigation.nextPageHref ? { nextPageHref: runtimeNavigation.nextPageHref } : {}),
    },
  };
}
