import {
  normalizeAssistantResourceCatalog,
  type AssistantResourceCatalogNormalizeOptions,
} from "./adminContextCatalogNormalizer";
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";

export type AssistantFormWithFieldsRaw = {
  form: Record<string, unknown>;
  fields: Record<string, unknown>[];
};

export type AssistantResourceCatalogDeps = {
  listContentTypes: () => Promise<unknown[]>;
  listCustomScreens: () => Promise<unknown[]>;
  listListingQueries: () => Promise<unknown[]>;
  listListingTemplates: () => Promise<unknown[]>;
  listFormsWithFields: () => Promise<AssistantFormWithFieldsRaw[]>;
  listWidgetCatalog: () => Promise<unknown[]>;
};

export type AssistantResourceCatalogInput = AssistantResourceCatalogNormalizeOptions;

type CatalogGroup =
  | "content_types"
  | "custom_screens"
  | "listing_queries"
  | "listing_templates"
  | "forms"
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
    contentTypes,
    customScreens,
    listingQueries,
    listingTemplates,
    forms,
    widgets,
  ] = await Promise.all([
    safeLoadGroup("content_types", deps.listContentTypes, warnings),
    safeLoadGroup("custom_screens", deps.listCustomScreens, warnings),
    safeLoadGroup("listing_queries", deps.listListingQueries, warnings),
    safeLoadGroup("listing_templates", deps.listListingTemplates, warnings),
    safeLoadGroup("forms", deps.listFormsWithFields, warnings),
    safeLoadGroup("widgets", deps.listWidgetCatalog, warnings),
  ]);

  const snapshot = normalizeAssistantResourceCatalog(
    {
      contentTypes,
      customScreens,
      listingQueries,
      listingTemplates,
      forms,
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
    customScreenService,
    listingQueryService,
    listingTemplateService,
    formsService,
    widgetCatalogService,
  ] = await Promise.all([
    import("../content/typeService"),
    import("../customScreens/customScreenService"),
    import("../content/listingQueriesService"),
    import("../content/listingTemplatesService"),
    import("../forms/formsService"),
    import("../widgets/widgetCatalogService"),
  ]);

  return buildAssistantResourceCatalogSnapshot(input, {
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
    listWidgetCatalog: widgetCatalogService.listWidgetCatalog,
  });
}
