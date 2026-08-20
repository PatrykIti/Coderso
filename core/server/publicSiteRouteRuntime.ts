import type { ContentListSortableEntry } from "../services/content/contentListResolver";
import {
  resolveContentListRequestedPage,
  resolveContentListRuntimeNavigationMeta,
  sortContentListRuntimeEntries,
} from "../services/content/contentListResolver";
import {
  isDetailPageIdFormat,
  normalizeDetailPageIdText,
} from "../services/settings/detailPageIdContract";
import type { ContentRouteSetting } from "../services/settings/settingsContracts";
import type { PreviewTargetType } from "../services/pages/previewService";
import {
  contentListLimitMax,
  resolveContentListSort,
} from "../services/renderContracts/contentListContract";
import type { DeviceTarget } from "../services/renderContracts/tokens";

export const resolvePreviewTargetType = (value: string | null): PreviewTargetType | null => {
  if (value === "page") return "page";
  if (value === "content") return "content";
  if (value === "page-template") return "page-template";
  if (value === "detail-page") return "detail-page";
  return null;
};

export const normalizePreviewDetailPageId = (value: string | null) => {
  const normalized = normalizeDetailPageIdText(value);
  if (!normalized || !isDetailPageIdFormat(normalized)) return null;
  return normalized;
};

export const resolveLinkedDetailPageId = (typeSlug: string, contentRoutes: ContentRouteSetting[]) =>
  contentRoutes.find((entry) => entry.enabled && entry.type === typeSlug)?.detailPageId ?? null;

export const resolvePreviewDevice = (value: string | null): DeviceTarget | null => {
  if (value === "desktop") return "desktop";
  if (value === "tablet") return "tablet";
  if (value === "mobile") return "mobile";
  return null;
};

export const buildDetailHref = (pattern: string, slug: string, id?: string) => {
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (id && pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

export const isEntryPublished = (entry: { status?: string; publishedAt?: Date | null }) =>
  entry.status === "published" && Boolean(entry.publishedAt ?? true);

/** Page size of auto entry-list routes: the single contract bound (24). */
const entryListRoutePageSize = contentListLimitMax;
const entryListRoutePageParamKey = "page";

/**
 * Auto entry-list route pagination (TASK-459-03): consumes `?page=N` and
 * `?sort=<ContentListSort>` through the shared listing pipeline. Unknown sort
 * values fall back, pages clamp into range, and page 1 omits the query param.
 */
export const paginateEntryListEntries = <
  T extends ContentListSortableEntry & {
    status?: string;
    publishedAt?: Date | null;
  },
>(
  entries: T[],
  runtimeSearchParams?: URLSearchParams
) => {
  const published = entries.filter((entry) => isEntryPublished(entry));
  const sort = resolveContentListSort(runtimeSearchParams?.get("sort") ?? undefined);
  const sorted = sortContentListRuntimeEntries(published, sort);
  const requestedPage = resolveContentListRequestedPage(
    runtimeSearchParams,
    entryListRoutePageParamKey
  );
  const navigation = resolveContentListRuntimeNavigationMeta({
    page: requestedPage,
    pageSize: entryListRoutePageSize,
    total: sorted.length,
    runtimeSearchParams,
    pageKey: entryListRoutePageParamKey,
  });
  const sliceStart = (navigation.page - 1) * navigation.pageSize;
  return {
    entries: sorted.slice(sliceStart, sliceStart + navigation.pageSize),
    pagination: {
      page: navigation.page,
      totalPages: navigation.totalPages,
      total: sorted.length,
      pageParamKey: entryListRoutePageParamKey,
      search: runtimeSearchParams?.toString() ?? "",
      ...(navigation.previousPageHref ? { previousPageHref: navigation.previousPageHref } : {}),
      ...(navigation.nextPageHref ? { nextPageHref: navigation.nextPageHref } : {}),
    },
  };
};
