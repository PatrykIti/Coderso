const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const cacheTtlMs = {
  list: DEFAULT_TTL_MS,
  detail: DEFAULT_TTL_MS,
};

export const cacheKeys = {
  pagesList: "pages:list",
  pageDetail: (id: string) => `pages:detail:${id}`,
  entriesList: (typeSlug: string) => `entries:list:${typeSlug}`,
  entryDetail: (typeSlug: string, id: string) =>
    `entries:detail:${typeSlug}:${id}`,
  contentTypesList: "contentTypes:list",
  contentTypeDetail: (id: string) => `contentTypes:detail:${id}`,
  menusList: "menus:list",
  menuDetail: (id: string) => `menus:detail:${id}`,
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
  listingQueriesList: "listings:queries:list",
  listingQueryDetail: (id: string) => `listings:queries:detail:${id}`,
  listingTemplatesList: "listings:templates:list",
  listingTemplateDetail: (id: string) => `listings:templates:detail:${id}`,
  widgetCatalogList: "widgetCatalog:list",
  widgetTemplateCategoriesList: "widgetTemplateCategories:list",
  widgetTemplatesList: "widgetTemplates:list",
  widgetTemplateDetail: (id: string) => `widgetTemplates:detail:${id}`,
  mediaList: "media:list",
  adminThemeTemplatesList: "adminThemeTemplates:list",
  adminThemeProfilesList: "adminThemeProfiles:list",
};

export const getCacheTtlMs = () => DEFAULT_TTL_MS;
