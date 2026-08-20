const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_DYNAMIC_KEY_SEGMENT_LENGTH = 96;

const hashCacheKeySegment = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const createBoundedCacheKeySegment = (
  value: string | null | undefined,
  fallback = "all"
) => {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  const encoded = encodeURIComponent(normalized);
  return `${encoded.slice(0, MAX_DYNAMIC_KEY_SEGMENT_LENGTH)}:${hashCacheKeySegment(normalized)}`;
};

export const cacheTtlMs = {
  list: DEFAULT_TTL_MS,
  detail: DEFAULT_TTL_MS,
};

export const cacheKeys = {
  pagesList: "pages:list",
  pageDetail: (id: string) => `pages:detail:${id}`,
  entriesAllList: "entries:list:all",
  entriesList: (typeSlug: string) => `entries:list:${typeSlug}`,
  entryDetail: (typeSlug: string, id: string) => `entries:detail:${typeSlug}:${id}`,
  entryRevisions: (id: string) => `entries:revisions:${id}`,
  customScreensList: "customScreens:list",
  customScreenDetail: (id: string) => `customScreens:detail:${id}`,
  customScreenEntryOverrides: (screenId: string, entryId: string) =>
    `customScreens:entryOverrides:${createBoundedCacheKeySegment(screenId)}:${createBoundedCacheKeySegment(entryId)}`,
  postsList: "posts:list",
  postDetail: (id: string) => `posts:detail:${id}`,
  postRevisions: (id: string) => `posts:revisions:${id}`,
  contentTypesList: "contentTypes:list",
  contentTypeDetail: (id: string) => `contentTypes:detail:${id}`,
  contentTypeCollectionWorkspace: (id: string) => `contentTypes:collectionWorkspace:${id}`,
  detailPagesList: "detailPages:list",
  detailPagesListByContentType: (contentTypeId: string) =>
    `detailPages:list:contentType:${contentTypeId}`,
  detailPageDetail: (id: string) => `detailPages:detail:${id}`,
  menusList: "menus:list",
  menuDetail: (id: string) => `menus:detail:${id}`,
  seoList: "seo:list",
  seoDetail: (id: string) => `seo:detail:${id}`,
  seoOverview: "seo:overview",
  searchRecent: "search:recent",
  searchResults: (queryKey: string) => `search:results:${queryKey}`,
  analyticsOverview: (rangeDays: number | string) => `analytics:overview:${rangeDays}`,
  analyticsTopContent: (rangeDays: number | string, limit: number | string, type: string = "all") =>
    `analytics:topContent:${rangeDays}:${limit}:${type}`,
  analyticsTrafficOverview: (rangeDays: number | string) =>
    `analytics:traffic:overview:${rangeDays}`,
  analyticsTopPages: (rangeDays: number | string, limit: number | string) =>
    `analytics:traffic:topPages:${rangeDays}:${limit}`,
  dashboardLayout: "dashboard:layout",
  dashboardWidgetData: "dashboard:widgetData",
  backupsList: (page: number | string, limit: number | string, queryKey: string = "all") =>
    `backups:list:${page}:${limit}:${queryKey}`,
  backupSchedule: "backups:schedule",
  importHistory: "tools:import:history",
  redirectsList: "redirects:list",
  formsList: "forms:list",
  formDetail: (id: string) => `forms:detail:${id}`,
  formActions: (id: string) => `forms:actions:${id}`,
  formActionRuns: (id: string) => `forms:action-runs:${id}`,
  bookingResourcesList: "booking:resources:list",
  bookingResourceSchedules: (id: string) => `booking:resources:${id}:schedules`,
  bookingServicesList: "booking:services:list",
  bookingServiceResources: (id: string) => `booking:services:${id}:resources`,
  bookingBlackoutsList: "booking:blackouts:list",
  bookingReservationsList: "booking:reservations:list",
  popupsList: "popups:list",
  popupDetail: (id: string) => `popups:detail:${id}`,
  reviewsList: "reviews:list",
  reviewDetail: (id: string) => `reviews:detail:${id}`,
  solutionKitsList: "solutionKits:list",
  solutionKitDetail: (id: string) => `solutionKits:detail:${id}`,
  solutionKitRunsList: (kitId: string) => `solutionKits:runs:list:${kitId}`,
  solutionKitRunDetail: (id: string) => `solutionKits:runs:detail:${id}`,
  listingQueriesList: "listings:queries:list",
  listingQueryDetail: (id: string) => `listings:queries:detail:${id}`,
  listingTemplatesList: "listings:templates:list",
  listingTemplateDetail: (id: string) => `listings:templates:detail:${id}`,
  commerceProductsList: "commerce:products:list",
  commerceProductDetail: (id: string) => `commerce:products:detail:${id}`,
  commerceCollectionsList: "commerce:collections:list",
  pageTemplatesList: "pageTemplates:list",
  pageTemplateDetail: (id: string) => `pageTemplates:detail:${id}`,
  mediaList: "media:list",
  mediaFolders: "media:folders",
  adminThemeTemplatesList: "adminThemeTemplates:list",
  adminThemeProfilesList: "adminThemeProfiles:list",
  settingsRedacted: "settings:redacted",
};

export const getCacheTtlMs = () => DEFAULT_TTL_MS;
