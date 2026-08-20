import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";

export const createFakeProvider = (text: string): AssistantProvider => ({
  id: "fake",
  complete: async () => ({ text }),
});

export const carCatalogMarkdownPrompt = `Nie jestem techniczny. Chce stworzyc na stronie katalog samochodow, zeby klienci mogli przegladac auta, filtrowac po cenie, marce i roczniku oraz wysylac zapytanie o konkretny samochod.

Wytyczne z pliku markdown:

# Katalog samochodow

Katalog ma sluzyc do prezentacji aut dostepnych w komisie. Nie chce sklepu ani platnosci online, tylko strone listy aut, szczegoly auta i formularz zapytania.

## Pola auta

- title
- slug
- brand
- model
- year
- price
- mileage_km
- fuel_type
- transmission
- body_type
- color
- engine_capacity_cm3
- power_hp
- short_description
- full_description
- featured_image
- gallery[]
- vin
- availability_status
- meta_title
- meta_description
`;

export type AssistantPageSurface = Extract<
  NonNullable<AssistantActionContext["activeSurface"]>,
  { kind: "page" }
>;

export type AssistantResourceCatalog = NonNullable<AssistantActionContext["resourceCatalog"]>;

export const createTrustedCatalog = (
  overrides: Partial<AssistantResourceCatalog> = {}
): AssistantResourceCatalog => ({
  schemaVersion: 1,
  generatedAt: "2026-06-06T00:00:00.000Z",
  budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
  pages: [],
  posts: [],
  entries: [],
  contentTypes: [],

  customScreens: [],
  detailPages: [],
  listings: { queries: [], templates: [] },
  forms: [],
  menus: [],
  seoDocuments: [],
  media: [],
  warnings: [],
  ...overrides,
});

export const createPageWithReferencedTemplateContext = (
  surfaceOverrides: Partial<AssistantPageSurface> = {}
): AssistantActionContext => ({
  page: "/admin/pages/page-home",
  locale: "pl-PL",
  activeSurface: {
    kind: "page",
    page: {
      id: "page-home",
      title: "Home",
      slug: "/",
      status: "draft",
      template: "landing",
    },
    selectedSectionId: "section-1",
    selectedBlockId: "template-section-1",
    sections: [
      {
        id: "section-1",
        type: "template",
        name: "Hero Template",
        path: "sections.0",
        blockCount: 1,
        blocks: [
          {
            id: "template-section-1",
            type: "template-section",
            label: "Hero Template",
            path: "sections.0.blocks.0",
            childCount: 0,
            slotKeys: [],
            templateId: "template-1",
            templateName: "Hero Template",
          },
        ],
      },
    ],
    warnings: [],
    ...surfaceOverrides,
  },
});

export const createContentTypeFieldAddContext = (): AssistantActionContext => ({
  page: "/admin/advanced/engine",
  locale: "pl-PL",
  includeResourceCatalog: true,
  resourceCatalog: createTrustedCatalog({
    contentTypes: [
      {
        id: "ct-products",
        slug: "products",
        name: "Products",
        entryCount: 0,
        fields: [
          {
            name: "title",
            type: "string",
            required: false,
            label: "Title",
            orderIndex: null,
          },
        ],
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", title: "Title" },
          },
        },
      },
      {
        id: "ct-orders",
        slug: "orders",
        name: "Orders",
        entryCount: 3,
        fields: [],
      },
    ],
  }),
  runtimeSnapshot: {
    schemaVersion: 2,
    route: "/admin/advanced/engine",
    activeHref: "/admin/advanced/engine",
    area: "advanced",
    advancedModule: "engine",
    selectedResource: {
      kind: "content-type",
      id: "ct-products",
    },
    visibleActions: [],
    permissionHints: {
      known: false,
      requiredForVisibleActions: [],
      reason: "frontend_user_has_no_permissions",
    },
  },
});

export const contentTypeFieldAddPrompt = `dodaj mi pola do Content Type o nazwie 'Products'.. pola ktore podaje nizej

# Project

title
slug
project_code
short_description
full_description
usable_area_m2
featured_image
tags[]
rooms[]
  - room_name
  - room_area_m2
project_pdf`;
