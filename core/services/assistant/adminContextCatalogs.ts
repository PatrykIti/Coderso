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
  listContentTypes: () => Promise<unknown[]>;
  listCustomScreens: () => Promise<unknown[]>;
  listListingQueries: () => Promise<unknown[]>;
  listListingTemplates: () => Promise<unknown[]>;
  listFormsWithFields: () => Promise<AssistantFormWithFieldsRaw[]>;
  listMenusWithItems: () => Promise<AssistantMenuWithItemsRaw[]>;
  listSeoDocuments: () => Promise<unknown[]>;
  listWidgetCatalog: () => Promise<unknown[]>;
};

export type AssistantResourceCatalogInput = AssistantResourceCatalogNormalizeOptions;

type CatalogGroup =
  | "pages"
  | "content_types"
  | "custom_screens"
  | "listing_queries"
  | "listing_templates"
  | "forms"
  | "menus"
  | "seo_documents"
  | "widgets";

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

export async function buildAssistantResourceCatalogSnapshot(
  input: AssistantResourceCatalogInput,
  deps: AssistantResourceCatalogDeps
): Promise<AssistantResourceCatalogSnapshot> {
  const warnings: string[] = [];
  const [
    pages,
    contentTypes,
    customScreens,
    listingQueries,
    listingTemplates,
    forms,
    menus,
    seoDocuments,
    widgets,
  ] = await Promise.all([
    safeLoadGroup("pages", deps.listPages, warnings),
    safeLoadGroup("content_types", deps.listContentTypes, warnings),
    safeLoadGroup("custom_screens", deps.listCustomScreens, warnings),
    safeLoadGroup("listing_queries", deps.listListingQueries, warnings),
    safeLoadGroup("listing_templates", deps.listListingTemplates, warnings),
    safeLoadGroup("forms", deps.listFormsWithFields, warnings),
    safeLoadGroup("menus", deps.listMenusWithItems, warnings),
    safeLoadGroup("seo_documents", deps.listSeoDocuments, warnings),
    safeLoadGroup("widgets", deps.listWidgetCatalog, warnings),
  ]);

  const snapshot = normalizeAssistantResourceCatalog(
    {
      contentTypes,
      pages,
      customScreens,
      listingQueries,
      listingTemplates,
      forms,
      menus,
      seoDocuments,
      widgets,
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
  ]);

  return buildAssistantResourceCatalogSnapshot(input, {
    listPages: pageService.listPages,
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
  });
}
