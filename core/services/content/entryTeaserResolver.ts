import type { ContentRouteSetting } from "../settings/settingsService";
import { listEntries } from "./entryService";
import { getContentType } from "./typeService";
import {
  mapEntriesToContentListItems,
  type ContentListResolverEntry,
} from "./contentListResolver";
import {
  normalizeEntryTeaserData,
  type EntryTeaserData,
  type EntryTeaserRuntimeItem,
} from "../../widgets/core/entryTeaser";

const featuredTagToken = "featured";

const normalizeText = (value: string | undefined) =>
  (value ?? "").trim().toLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveDetailPathPattern = (
  routes: ContentRouteSetting[],
  typeSlug: string
) => {
  const route = routes.find((entry) => entry.type === typeSlug && entry.enabled);
  return route?.detailPath ?? `/${typeSlug}/:slug`;
};

const isPublishedEntry = (entry: ContentListResolverEntry) =>
  entry.status === "published" && Boolean(entry.publishedAt ?? true);

const isFeaturedEntry = (entry: ContentListResolverEntry) => {
  const tags = Array.isArray(entry.tags)
    ? entry.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => normalizeText(tag))
    : [];
  if (tags.includes(featuredTagToken)) return true;
  if (!isRecord(entry.data)) return false;
  return entry.data.featured === true;
};

const sortByFreshness = (entries: ContentListResolverEntry[]) =>
  [...entries].sort((a, b) => {
    const aTs =
      a.publishedAt?.getTime() ??
      a.updatedAt.getTime() ??
      0;
    const bTs =
      b.publishedAt?.getTime() ??
      b.updatedAt.getTime() ??
      0;
    return bTs - aTs;
  });

const chooseTeaserEntry = (
  entries: ContentListResolverEntry[],
  config: EntryTeaserData
) => {
  const sourceMode = config.sourceMode ?? "latest";
  const sourceEntryId = config.source?.entryId?.trim();
  const sorted = sortByFreshness(entries);

  if (sourceMode === "manual") {
    if (!sourceEntryId) return null;
    return sorted.find((entry) => entry.id === sourceEntryId) ?? null;
  }

  if (sourceMode === "featured") {
    const featured = sorted.find((entry) => isFeaturedEntry(entry));
    if (featured) return featured;
    if (config.fallback?.fallbackToLatest) {
      return sorted[0] ?? null;
    }
    return null;
  }

  return sorted[0] ?? null;
};

export async function resolveEntryTeaserRuntimeData(
  input: EntryTeaserData,
  options: {
    preview: boolean;
    contentRoutes: ContentRouteSetting[];
  }
): Promise<{
  item: EntryTeaserRuntimeItem | null;
  sourceTypeId: string;
  sourceTypeSlug: string;
  resolvedAt: string;
  error?: string;
}> {
  const normalized = normalizeEntryTeaserData(input);
  const contentTypeId = normalized.source?.contentTypeId?.trim();

  if (!contentTypeId) {
    return {
      item: null,
      sourceTypeId: "",
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
    };
  }

  const contentType = await getContentType(contentTypeId);
  if (!contentType) {
    return {
      item: null,
      sourceTypeId: contentTypeId,
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
      error: "Selected content type no longer exists.",
    };
  }

  const entries = await listEntries(contentType.id);
  const available = options.preview
    ? entries
    : entries.filter((entry) => isPublishedEntry(entry));
  const selected = chooseTeaserEntry(available, normalized);
  if (!selected) {
    return {
      item: null,
      sourceTypeId: contentType.id,
      sourceTypeSlug: contentType.slug,
      resolvedAt: new Date().toISOString(),
    };
  }

  const detailPathPattern = resolveDetailPathPattern(
    options.contentRoutes,
    contentType.slug
  );
  const mapped = await mapEntriesToContentListItems([selected], {
    detailPathPattern,
    showImage: Boolean(normalized.fields?.showImage),
  });

  return {
    item: mapped[0] ?? null,
    sourceTypeId: contentType.id,
    sourceTypeSlug: contentType.slug,
    resolvedAt: new Date().toISOString(),
  };
}
