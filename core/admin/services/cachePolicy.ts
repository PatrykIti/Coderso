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
  widgetCatalogList: "widgetCatalog:list",
  widgetTemplateCategoriesList: "widgetTemplateCategories:list",
  widgetTemplatesList: "widgetTemplates:list",
  widgetTemplateDetail: (id: string) => `widgetTemplates:detail:${id}`,
  mediaList: "media:list",
};

export const getCacheTtlMs = () => DEFAULT_TTL_MS;
