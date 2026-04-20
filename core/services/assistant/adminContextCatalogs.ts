import {
  normalizeAssistantResourceCatalog,
  type AssistantResourceCatalogNormalizeOptions,
} from "./adminContextCatalogNormalizer";
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";

export type AssistantFormWithFieldsRaw = {
  form: Record<string, unknown>;
  fields: Record<string, unknown>[];
};

export type AssistantMenuWithItemsRaw = {
  menu: Record<string, unknown>;
  items: Record<string, unknown>[];
};

export type AssistantResourceCatalogDeps = {
  listPages: () => Promise<unknown[]>;
  listPosts?: () => Promise<unknown[]>;
  listEntries?: (typeId: string) => Promise<unknown[]>;
  listContentTypes: () => Promise<unknown[]>;
  listCustomScreens: () => Promise<unknown[]>;
  listListingQueries: () => Promise<unknown[]>;
  listListingTemplates: () => Promise<unknown[]>;
  listFormsWithFields: () => Promise<AssistantFormWithFieldsRaw[]>;
  listMenusWithItems: () => Promise<AssistantMenuWithItemsRaw[]>;
  listSeoDocuments: () => Promise<unknown[]>;
  listWidgetCatalog: () => Promise<unknown[]>;
  listMedia?: () => Promise<unknown[]>;
  listCommerceProducts?: () => Promise<unknown[]>;
  listCommerceCollections?: () => Promise<unknown[]>;
  listSolutionKits?: () => Promise<unknown[]>;
};

export type AssistantResourceCatalogInput = AssistantResourceCatalogNormalizeOptions;

type CatalogGroup =
  | "pages"
  | "posts"
  | "entries"
  | "content_types"
  | "custom_screens"
  | "listing_queries"
  | "listing_templates"
  | "forms"
  | "menus"
  | "seo_documents"
  | "widgets"
  | "media"
  | "commerce_products"
  | "commerce_collections"
  | "solution_kits";

const safeLoadGroup = async (
  group: CatalogGroup,
  load: () => Promise<unknown[]>,
  warnings: string[]
) => {
  try {
    return await load();
  } catch {
    warnings.push(`${group}_unavailable`);
    return [];
  }
};

const safeLoadEntries = async (
  contentTypes: unknown[],
  deps: AssistantResourceCatalogDeps,
  warnings: string[]
) => {
  if (!deps.listEntries) return [];
  const result: unknown[] = [];
  for (const contentType of contentTypes) {
    const typeId =
      contentType && typeof contentType === "object" && !Array.isArray(contentType)
        ? (contentType as Record<string, unknown>).id
        : null;
    if (typeof typeId !== "string" || !typeId.trim()) continue;
    try {
      result.push(...(await deps.listEntries(typeId)));
    } catch {
      warnings.push(`entries_${typeId}_unavailable`);
    }
  }
  return result;
};

export async function buildAssistantResourceCatalogSnapshot(
  input: AssistantResourceCatalogInput,
  deps: AssistantResourceCatalogDeps
): Promise<AssistantResourceCatalogSnapshot> {
  const warnings: string[] = [];
  const [
    pages,
    posts,
    contentTypes,
    customScreens,
    listingQueries,
    listingTemplates,
    forms,
    menus,
    seoDocuments,
    widgets,
    media,
    commerceProducts,
    commerceCollections,
    solutionKits,
  ] = await Promise.all([
    safeLoadGroup("pages", deps.listPages, warnings),
    deps.listPosts ? safeLoadGroup("posts", deps.listPosts, warnings) : Promise.resolve([]),
    safeLoadGroup("content_types", deps.listContentTypes, warnings),
    safeLoadGroup("custom_screens", deps.listCustomScreens, warnings),
    safeLoadGroup("listing_queries", deps.listListingQueries, warnings),
    safeLoadGroup("listing_templates", deps.listListingTemplates, warnings),
    safeLoadGroup("forms", deps.listFormsWithFields, warnings),
    safeLoadGroup("menus", deps.listMenusWithItems, warnings),
    safeLoadGroup("seo_documents", deps.listSeoDocuments, warnings),
    safeLoadGroup("widgets", deps.listWidgetCatalog, warnings),
    deps.listMedia ? safeLoadGroup("media", deps.listMedia, warnings) : Promise.resolve([]),
    deps.listCommerceProducts
      ? safeLoadGroup("commerce_products", deps.listCommerceProducts, warnings)
      : Promise.resolve([]),
    deps.listCommerceCollections
      ? safeLoadGroup("commerce_collections", deps.listCommerceCollections, warnings)
      : Promise.resolve([]),
    deps.listSolutionKits
      ? safeLoadGroup("solution_kits", deps.listSolutionKits, warnings)
      : Promise.resolve([]),
  ]);
  const entries = await safeLoadEntries(contentTypes, deps, warnings);

  const snapshot = normalizeAssistantResourceCatalog(
    {
      contentTypes,
      pages,
      posts,
      entries,
      customScreens,
      listingQueries,
      listingTemplates,
      forms,
      menus,
      seoDocuments,
      widgets,
      media,
      commerceProducts,
      commerceCollections,
      solutionKits,
    },
    input
  );

  return {
    ...snapshot,
    warnings: [...new Set([...snapshot.warnings, ...warnings])].sort((left, right) =>
      left.localeCompare(right)
    ),
  };
}

export async function buildAssistantResourceCatalogSnapshotWithDefaultDeps(
  input: AssistantResourceCatalogInput = {}
): Promise<AssistantResourceCatalogSnapshot> {
  const [
    typeService,
    pageService,
    customScreenService,
    listingQueryService,
    listingTemplateService,
    formsService,
    menuService,
    seoService,
    widgetCatalogService,
    postsService,
    entryService,
    mediaService,
    commerceService,
    solutionKitsService,
  ] = await Promise.all([
    import("../content/typeService"),
    import("../pages/pageService"),
    import("../customScreens/customScreenService"),
    import("../content/listingQueriesService"),
    import("../content/listingTemplatesService"),
    import("../forms/formsService"),
    import("../menus/menuService"),
    import("../seo/seoService"),
    import("../widgets/widgetCatalogService"),
    import("../content/postsService"),
    import("../content/entryService"),
    import("../media/mediaService"),
    import("../commerce/commerceService"),
    import("../kits/solutionKitsService"),
  ]);

  return buildAssistantResourceCatalogSnapshot(input, {
    listPages: pageService.listPages,
    listPosts: postsService.listPosts,
    listEntries: entryService.listEntries,
    listContentTypes: typeService.listContentTypes,
    listCustomScreens: customScreenService.listCustomScreens,
    listListingQueries: listingQueryService.listListingQueries,
    listListingTemplates: listingTemplateService.listListingTemplates,
    listFormsWithFields: async () => {
      const forms = await formsService.listForms();
      return Promise.all(
        forms.map(async (form) => ({
          form: form as Record<string, unknown>,
          fields: (await formsService.listFormFields(form.id)) as Record<string, unknown>[],
        }))
      );
    },
    listMenusWithItems: async () => {
      const menus = await menuService.listMenus();
      return Promise.all(
        menus.map(async (menu) => ({
          menu: menu as Record<string, unknown>,
          items: (await menuService.listMenuItems(menu.id)) as unknown as Record<string, unknown>[],
        }))
      );
    },
    listSeoDocuments: seoService.listExistingSeoDocuments,
    listWidgetCatalog: widgetCatalogService.listWidgetCatalog,
    listMedia: mediaService.listMedia,
    listCommerceProducts: commerceService.listCommerceProducts,
    listCommerceCollections: commerceService.listCommerceCollections,
    listSolutionKits: async () => solutionKitsService.listSolutionKits(),
  });
}
