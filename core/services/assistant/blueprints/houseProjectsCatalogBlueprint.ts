import type { WidgetBlock } from "../../../widgets/types";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
} from "../actionPlanTypes";

const contentTypeSlug = "house-projects";
const catalogPageSlug = "/projekty-domow";
const catalogHiddenListPath = "/_catalog/house-projects";
const detailPath = "/projekty-domow/:slug";
const listingQueryName = "House Projects Catalog Query";
const listingTemplateSlug = "house-projects-catalog-grid";
const customScreenName = "House Projects";

const createBlock = (
  id: string,
  type: string,
  data: Record<string, unknown>,
  options?: {
    variant?: string;
    slots?: Record<string, WidgetBlock[]>;
  }
): WidgetBlock => ({
  id,
  type,
  ...(options?.variant ? { variant: options.variant } : {}),
  data,
  ...(options?.slots ? { slots: options.slots } : {}),
});

const contentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "slug", "summary", "areaM2", "rooms", "projectStatus"],
  properties: {
    title: {
      type: "string",
      title: "Project name",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    slug: {
      type: "string",
      title: "Project slug",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    summary: {
      type: "string",
      title: "Short summary",
      description: "One-sentence summary displayed in cards and overviews.",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    description: {
      type: "string",
      title: "Long description",
      xFieldType: "richtext",
      xFieldConfig: {
        layout: { tab: "content", section: "Description", width: "full" },
      },
    },
    heroImage: {
      type: "string",
      title: "Hero image",
      xFieldType: "media",
      xFieldConfig: {
        media: { accept: ["image/*"] },
        layout: { tab: "media", section: "Media", width: "full" },
      },
    },
    gallery: {
      type: "array",
      items: { type: "string" },
      title: "Gallery",
      xFieldType: "media",
      xFieldConfig: {
        media: { multiple: true, accept: ["image/*"], maxItems: 24 },
        layout: { tab: "media", section: "Media", width: "full" },
      },
    },
    areaM2: {
      type: "number",
      title: "Area (m2)",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "specs", section: "Key facts", width: "half" },
      },
    },
    rooms: {
      type: "number",
      title: "Rooms",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "specs", section: "Key facts", width: "half" },
      },
    },
    bathrooms: {
      type: "number",
      title: "Bathrooms",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "specs", section: "Key facts", width: "half" },
      },
    },
    floors: {
      type: "number",
      title: "Floors",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "specs", section: "Key facts", width: "half" },
      },
    },
    priceFrom: {
      type: "number",
      title: "Price from",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
    },
    location: {
      type: "string",
      title: "Location",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
    },
    projectStatus: {
      type: "string",
      title: "Project status",
      enum: ["available", "reserved", "sold"],
      xFieldType: "select",
      xFieldConfig: {
        select: { options: ["available", "reserved", "sold"] },
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
      default: "available",
    },
  },
} as const;

const screenBlocks = (): WidgetBlock[] => [
  createBlock("house-project-header", "screen-record-header", {
    eyebrow: "House projects",
    title: "Project overview",
    subtitle: "Review the main catalog fields in one place.",
    description:
      "Use this record screen to review the key project fields before opening the classic editor.",
    badge: "available",
    align: "start",
  }),
  createBlock(
    "house-project-columns",
    "screen-two-column",
    {
      leftTitle: "Project facts",
      rightTitle: "Commercial details",
      gap: "md",
    },
    {
      variant: "aside",
      slots: {
        left: [
          createBlock(
            "house-project-facts",
            "screen-field-group",
            {
              title: "Core project details",
              description: "Surface the facts most editors update together.",
            },
            {
              slots: {
                content: [
                  createBlock("house-project-area", "screen-field-value", {
                    label: "Area (m2)",
                    value: "0",
                    helper: "Built area shown in listings and comparisons.",
                    tone: "strong",
                  }),
                  createBlock("house-project-rooms", "screen-field-value", {
                    label: "Rooms",
                    value: "0",
                    helper: "Main room count for catalog filtering.",
                    tone: "default",
                  }),
                  createBlock("house-project-bathrooms", "screen-field-value", {
                    label: "Bathrooms",
                    value: "0",
                    helper: "Bathroom count for buyers.",
                    tone: "default",
                  }),
                  createBlock("house-project-floors", "screen-field-value", {
                    label: "Floors",
                    value: "0",
                    helper: "Number of floor levels.",
                    tone: "default",
                  }),
                ],
              },
            }
          ),
        ],
        right: [
          createBlock(
            "house-project-commercial",
            "screen-field-group",
            {
              title: "Commercial overview",
              description: "Status and location surfaced next to price.",
            },
            {
              slots: {
                content: [
                  createBlock("house-project-price", "screen-field-value", {
                    label: "Price from",
                    value: "0",
                    helper: "Starting price shown in the listing template.",
                    tone: "strong",
                  }),
                  createBlock("house-project-location", "screen-field-value", {
                    label: "Location",
                    value: "Location",
                    helper: "Displayed in cards and detail view.",
                    tone: "default",
                  }),
                  createBlock("house-project-status", "screen-field-value", {
                    label: "Status",
                    value: "available",
                    helper: "Used for badges and status filters.",
                    tone: "muted",
                  }),
                ],
              },
            }
          ),
        ],
      },
    }
  ),
];

const screenBindings = () => [
  {
    id: "binding-house-project-header-title",
    widgetId: "house-project-header",
    propPath: "title",
    field: "title",
    mode: "read",
  },
  {
    id: "binding-house-project-header-subtitle",
    widgetId: "house-project-header",
    propPath: "subtitle",
    field: "summary",
    mode: "read",
  },
  {
    id: "binding-house-project-header-badge",
    widgetId: "house-project-header",
    propPath: "badge",
    field: "projectStatus",
    mode: "read",
  },
  {
    id: "binding-house-project-area-value",
    widgetId: "house-project-area",
    propPath: "value",
    field: "areaM2",
    mode: "read",
  },
  {
    id: "binding-house-project-rooms-value",
    widgetId: "house-project-rooms",
    propPath: "value",
    field: "rooms",
    mode: "read",
  },
  {
    id: "binding-house-project-bathrooms-value",
    widgetId: "house-project-bathrooms",
    propPath: "value",
    field: "bathrooms",
    mode: "read",
  },
  {
    id: "binding-house-project-floors-value",
    widgetId: "house-project-floors",
    propPath: "value",
    field: "floors",
    mode: "read",
  },
  {
    id: "binding-house-project-price-value",
    widgetId: "house-project-price",
    propPath: "value",
    field: "priceFrom",
    mode: "read",
  },
  {
    id: "binding-house-project-location-value",
    widgetId: "house-project-location",
    propPath: "value",
    field: "location",
    mode: "read",
  },
  {
    id: "binding-house-project-status-value",
    widgetId: "house-project-status",
    propPath: "value",
    field: "projectStatus",
    mode: "read",
  },
];

const listingTemplateConfig = {
  fields: [
    {
      key: "summary",
      source: "data.summary",
      label: "Summary",
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "price",
      source: "data.priceFrom",
      label: "Price from",
      fallback: null,
      format: "currency",
      conditions: [],
    },
    {
      key: "area",
      source: "data.areaM2",
      label: "Area (m2)",
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "rooms",
      source: "data.rooms",
      label: "Rooms",
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "status",
      source: "data.projectStatus",
      label: "Status",
      fallback: null,
      format: "badge",
      conditions: [],
    },
    {
      key: "location",
      source: "data.location",
      label: "Location",
      fallback: null,
      format: "text",
      conditions: [],
    },
  ],
  itemActions: [
    {
      id: "view-project",
      label: "View project",
      kind: "view",
      href: null,
      opensInNewTab: false,
    },
  ],
  emptyState: {
    title: "No house projects yet",
    description:
      "Create your first project entry in Coderso > House Projects to populate the catalog.",
    ctaLabel: null,
    ctaHref: null,
  },
  style: {
    columns: 3,
    gap: "md",
    cardVariant: "default",
  },
};

export const buildHouseProjectsCatalogPlan = (): AssistantActionPlan => {
  const actions: AssistantPlannedAction[] = [
    {
      id: "content-route-house-projects",
      type: "setting.content-route.upsert",
      title: "Register public detail route for house projects",
      description:
        "Add public entry routes so listing cards can open a working detail page.",
      input: {
        typeSlug: contentTypeSlug,
        listPath: catalogHiddenListPath,
        detailPath,
        enabled: true,
      },
    },
    {
      id: "content-type-house-projects",
      type: "content-type.upsert",
      title: "Create the house projects content model",
      description:
        "Provision structured fields for summaries, media, specs, pricing, and project status.",
      input: {
        slug: contentTypeSlug,
        name: "House Projects",
        schema: contentSchema as unknown as Record<string, unknown>,
      },
    },
    {
      id: "custom-screen-house-projects",
      type: "custom-screen.upsert",
      title: "Create a dedicated House Projects admin screen",
      description:
        "Add a sidebar shortcut and a dedicated records surface for reviewing key project data.",
      input: {
        name: customScreenName,
        contentTypeSlug,
        status: "active",
        showInSidebar: true,
        sidebarLabel: "House Projects",
        blocks: screenBlocks() as unknown as Array<Record<string, unknown>>,
        bindings: screenBindings() as unknown as Array<Record<string, unknown>>,
      },
    },
    {
      id: "listing-query-house-projects",
      type: "listing-query.upsert",
      title: "Create a listing query for the projects catalog",
      description:
        "Prepare a reusable query for published house project entries.",
      input: {
        name: listingQueryName,
        description: "Published house projects used by the public catalog page.",
        contentTypeSlug,
        fields: [
          "id",
          "title",
          "slug",
          "status",
          "updatedAt",
          "data.summary",
          "data.heroImage",
          "data.priceFrom",
          "data.areaM2",
          "data.rooms",
          "data.projectStatus",
          "data.location",
        ],
        includeDrafts: false,
        limit: 24,
        sort: [{ field: "title", dir: "asc" }],
      },
    },
    {
      id: "listing-template-house-projects",
      type: "listing-template.upsert",
      title: "Create a grid listing template for project cards",
      description:
        "Define which project fields appear in catalog cards and how they are formatted.",
      input: {
        name: "House Projects Catalog Grid",
        slug: listingTemplateSlug,
        description: "Grid card layout for house project listings.",
        layout: "grid",
        config: listingTemplateConfig,
      },
    },
    {
      id: "page-house-projects-catalog",
      type: "page.upsert",
      title: "Create the public house projects catalog page",
      description:
        "Publish a public landing page that renders the listing query through the content-list widget.",
      input: {
        title: "Katalog Projektów Domów",
        slug: catalogPageSlug,
        status: "published",
        listingQueryName,
        listingTemplateSlug,
        introTitle: "Katalog Projektów Domów",
        introBody:
          "Przeglądaj gotowe projekty domów i otwieraj szczegóły każdego projektu z katalogu.",
        ctaLabel: "Zobacz projekt",
      },
    },
  ];

  return {
    id: "plan-house-projects-catalog",
    status: "ready",
    intentId: "house-projects-catalog",
    title: "House Projects Catalog",
    answer: [
      "I can set up a complete catalog flow for house projects in Coderso.",
      "",
      "Planned resources:",
      "1. A structured content type for house projects.",
      "2. A dedicated House Projects admin screen in the sidebar.",
      "3. A listing query and grid template for catalog cards.",
      "4. A published catalog page at /projekty-domow.",
      "5. Public detail routes for each project entry.",
    ].join("\n"),
    summary:
      "Create a structured house-projects catalog with content model, dedicated admin surface, listing query/template, public catalog page, and detail routes.",
    confidence: 0.91,
    assumptions: [
      "The first release focuses on catalog setup without inquiry form automation.",
      "A hidden system list route is registered for cache invalidation, while the public landing page stays at /projekty-domow.",
      "The dedicated admin screen starts as a review-focused records surface and keeps the classic editor available when deeper edits are needed.",
    ],
    questions: [],
    actions,
  };
};

export const HOUSE_PROJECTS_CATALOG_BLUEPRINT = {
  contentTypeSlug,
  catalogPageSlug,
  catalogHiddenListPath,
  detailPath,
  listingQueryName,
  listingTemplateSlug,
  customScreenName,
};
