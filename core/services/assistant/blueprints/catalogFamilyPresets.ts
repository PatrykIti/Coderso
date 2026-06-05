import type { CatalogFamilyPreset } from "./catalogFamilyBlueprint";

const curatedCoverImageSchemaProperties = {
  coverImageUrl: {
    type: "string",
    title: "Curated cover image URL",
    xFieldType: "text",
    xFieldConfig: {
      layout: { tab: "media", section: "Curated stock reference", width: "full" },
    },
  },
  coverImageAlt: {
    type: "string",
    title: "Curated cover image alt text",
    xFieldType: "text",
    xFieldConfig: {
      layout: { tab: "media", section: "Curated stock reference", width: "full" },
    },
  },
  coverImageSourceName: {
    type: "string",
    title: "Curated cover image source",
    xFieldType: "text",
    xFieldConfig: {
      layout: { tab: "media", section: "Curated stock reference", width: "half" },
    },
  },
  coverImageSourceUrl: {
    type: "string",
    title: "Curated cover image source URL",
    xFieldType: "text",
    xFieldConfig: {
      layout: { tab: "media", section: "Curated stock reference", width: "half" },
    },
  },
  coverImageLicenseName: {
    type: "string",
    title: "Curated cover image license",
    xFieldType: "text",
    xFieldConfig: {
      layout: { tab: "media", section: "Curated stock reference", width: "half" },
    },
  },
  coverImageLicenseUrl: {
    type: "string",
    title: "Curated cover image license URL",
    xFieldType: "text",
    xFieldConfig: {
      layout: { tab: "media", section: "Curated stock reference", width: "half" },
    },
  },
} as const;

const houseProjectsSchema = {
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

const productCatalogSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "slug", "summary", "sku", "priceFrom", "projectStatus"],
  properties: {
    title: {
      type: "string",
      title: "Product name",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    slug: {
      type: "string",
      title: "Product slug",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    summary: {
      type: "string",
      title: "Short summary",
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
      title: "Product image",
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
    sku: {
      type: "string",
      title: "SKU",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "specs", section: "Product facts", width: "half" },
      },
    },
    category: {
      type: "string",
      title: "Category",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "specs", section: "Product facts", width: "half" },
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
    stockStatus: {
      type: "string",
      title: "Stock status",
      enum: ["in-stock", "low-stock", "out-of-stock"],
      xFieldType: "select",
      xFieldConfig: {
        select: { options: ["in-stock", "low-stock", "out-of-stock"] },
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
      default: "in-stock",
    },
    projectStatus: {
      type: "string",
      title: "Status",
      enum: ["active", "coming-soon", "archived"],
      xFieldType: "select",
      xFieldConfig: {
        select: { options: ["active", "coming-soon", "archived"] },
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
      default: "active",
    },
  },
} as const;

const portfolioProjectsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "slug", "summary", "clientName", "projectStatus"],
  properties: {
    title: {
      type: "string",
      title: "Project title",
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
    resultSummary: {
      type: "string",
      title: "Results summary",
      xFieldType: "richtext",
      xFieldConfig: {
        layout: { tab: "content", section: "Case study", width: "full" },
      },
    },
    testimonialQuote: {
      type: "string",
      title: "Client testimonial",
      xFieldType: "textarea",
      xFieldConfig: {
        layout: { tab: "content", section: "Case study", width: "full" },
      },
    },
    heroImage: {
      type: "string",
      title: "Project image",
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
    ...curatedCoverImageSchemaProperties,
    clientName: {
      type: "string",
      title: "Client",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "specs", section: "Project facts", width: "half" },
      },
    },
    deliveryYear: {
      type: "number",
      title: "Delivery year",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "specs", section: "Project facts", width: "half" },
      },
    },
    serviceType: {
      type: "string",
      title: "Service type",
      xFieldType: "text",
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
      title: "Status",
      enum: ["published", "draft", "featured"],
      xFieldType: "select",
      xFieldConfig: {
        select: { options: ["published", "draft", "featured"] },
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
      default: "published",
    },
  },
} as const;

const servicesDirectorySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "slug", "summary", "serviceType", "location", "projectStatus"],
  properties: {
    title: {
      type: "string",
      title: "Service title",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    slug: {
      type: "string",
      title: "Service slug",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "content", section: "Basics", width: "full" },
      },
    },
    summary: {
      type: "string",
      title: "Short summary",
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
      title: "Service image",
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
    ...curatedCoverImageSchemaProperties,
    serviceType: {
      type: "string",
      title: "Service type",
      xFieldType: "text",
      xFieldConfig: {
        layout: { tab: "specs", section: "Service facts", width: "half" },
      },
    },
    responseTimeHours: {
      type: "number",
      title: "Response time (hours)",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "specs", section: "Service facts", width: "half" },
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
      title: "Status",
      enum: ["available", "featured", "hidden"],
      xFieldType: "select",
      xFieldConfig: {
        select: { options: ["available", "featured", "hidden"] },
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
      default: "available",
    },
  },
} as const;

const createListingTemplateConfig = (input: {
  emptyTitle: string;
  emptyDescription: string;
  summaryLabel: string;
  numericLabel: string;
  secondaryNumericLabel: string;
  statusLabel: string;
  locationLabel: string;
  numericField: string;
  secondaryNumericField: string;
  locationField?: string;
  imageUrlField?: string;
}) => ({
  fields: [
    ...(input.imageUrlField
      ? [
          {
            key: "image",
            source: `data.${input.imageUrlField}`,
            label: "Image",
            fallback: null,
            format: "text",
            conditions: [],
          },
        ]
      : []),
    {
      key: "summary",
      source: "data.summary",
      label: input.summaryLabel,
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "primary",
      source: `data.${input.numericField}`,
      label: input.numericLabel,
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "secondary",
      source: `data.${input.secondaryNumericField}`,
      label: input.secondaryNumericLabel,
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "status",
      source: "data.projectStatus",
      label: input.statusLabel,
      fallback: null,
      format: "badge",
      conditions: [],
    },
    {
      key: "location",
      source: `data.${input.locationField ?? "location"}`,
      label: input.locationLabel,
      fallback: null,
      format: "text",
      conditions: [],
    },
  ],
  itemActions: [
    {
      id: "view-entry",
      label: "View details",
      kind: "view",
      href: null,
      opensInNewTab: false,
    },
  ],
  emptyState: {
    title: input.emptyTitle,
    description: input.emptyDescription,
    ctaLabel: null,
    ctaHref: null,
  },
  style: {
    columns: 3,
    gap: "md",
    cardVariant: "default",
  },
});

export const HOUSE_PROJECTS_CATALOG_PRESET: CatalogFamilyPreset = {
  key: "house-projects-catalog",
  intentId: "house-projects-catalog",
  title: "House Projects Catalog",
  summary:
    "Create a structured house-projects catalog with content model, dedicated admin surface, listing query/template, public catalog page, and detail routes.",
  answerIntro: "I can set up a complete catalog flow for house projects in Coderso.",
  contentTypeSlug: "house-projects",
  contentTypeName: "House Projects",
  catalogPageSlug: "/projekty-domow",
  catalogHiddenListPath: "/_catalog/house-projects",
  detailPath: "/projekty-domow/:slug",
  listingQueryName: "House Projects Catalog Query",
  listingTemplateSlug: "house-projects-catalog-grid",
  listingTemplateName: "House Projects Catalog Grid",
  customScreenName: "House Projects",
  introTitle: "Katalog Projektów Domów",
  introBody: "Przeglądaj gotowe projekty domów i otwieraj szczegóły każdego projektu z katalogu.",
  ctaLabel: "Zobacz projekt",
  contentSchema: houseProjectsSchema as unknown as Record<string, unknown>,
  listingTemplateConfig: createListingTemplateConfig({
    emptyTitle: "No house projects yet",
    emptyDescription:
      "Create your first project entry in Coderso > House Projects to populate the catalog.",
    summaryLabel: "Summary",
    numericLabel: "Area (m2)",
    secondaryNumericLabel: "Rooms",
    statusLabel: "Status",
    locationLabel: "Location",
    numericField: "areaM2",
    secondaryNumericField: "rooms",
    locationField: "location",
  }),
  screen: {
    eyebrow: "House projects",
    subtitle: "Review the main catalog fields in one place.",
    description:
      "Use this record screen to review the key project fields before opening the classic editor.",
    badge: "available",
    leftTitle: "Project facts",
    rightTitle: "Commercial details",
    leftGroupTitle: "Core project details",
    leftGroupDescription: "Surface the facts most editors update together.",
    rightGroupTitle: "Commercial overview",
    rightGroupDescription: "Status and location surfaced next to price.",
    leftFields: [
      {
        id: "area",
        label: "Area (m2)",
        helper: "Built area shown in listings and comparisons.",
        tone: "strong",
        field: "areaM2",
      },
      {
        id: "rooms",
        label: "Rooms",
        helper: "Main room count for catalog filtering.",
        tone: "default",
        field: "rooms",
      },
      {
        id: "bathrooms",
        label: "Bathrooms",
        helper: "Bathroom count for buyers.",
        tone: "default",
        field: "bathrooms",
      },
      {
        id: "floors",
        label: "Floors",
        helper: "Number of floor levels.",
        tone: "default",
        field: "floors",
      },
    ],
    rightFields: [
      {
        id: "price",
        label: "Price from",
        helper: "Starting price shown in the listing template.",
        tone: "strong",
        field: "priceFrom",
      },
      {
        id: "location",
        label: "Location",
        helper: "Displayed in cards and detail view.",
        tone: "default",
        field: "location",
      },
      {
        id: "status",
        label: "Status",
        helper: "Used for badges and status filters.",
        tone: "muted",
        field: "projectStatus",
      },
    ],
  },
  assumptions: [
    "The first release focuses on catalog setup without inquiry form automation.",
    "A hidden system list route is registered for cache invalidation, while the public landing page stays at /projekty-domow.",
    "The dedicated admin screen starts as a review-focused records surface and keeps the classic editor available when deeper edits are needed.",
  ],
  refinement: {
    defaultFilterTitle: "Filter house projects",
    defaultFilterDescription: "Narrow down house projects by specs and status.",
    defaultSearchPlaceholder: "Search house projects...",
    availableFacets: [
      {
        id: "area",
        kind: "range",
        label: "Area (m2)",
        field: "data.areaM2",
        op: "between",
      },
      {
        id: "rooms",
        kind: "checkbox",
        label: "Rooms",
        field: "data.rooms",
        op: "in",
        options: ["2", "3", "4", "5", "6"].map((value) => ({
          value,
          label: `${value} rooms`,
        })),
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "data.projectStatus",
        op: "in",
        options: ["available", "reserved", "sold"].map((value) => ({
          value,
          label: value,
        })),
      },
    ],
  },
};

export const PRODUCT_CATALOG_PRESET: CatalogFamilyPreset = {
  key: "product-catalog",
  intentId: "product-catalog",
  title: "Product Catalog",
  summary:
    "Create a structured product catalog with content model, dedicated admin surface, listing query/template, public catalog page, and detail routes.",
  answerIntro: "I can set up a complete catalog flow for products in Coderso.",
  contentTypeSlug: "products",
  contentTypeName: "Products",
  catalogPageSlug: "/produkty",
  catalogHiddenListPath: "/_catalog/products",
  detailPath: "/produkty/:slug",
  listingQueryName: "Product Catalog Query",
  listingTemplateSlug: "product-catalog-grid",
  listingTemplateName: "Product Catalog Grid",
  customScreenName: "Products",
  introTitle: "Katalog Produktów",
  introBody:
    "Przeglądaj produkty, otwieraj szczegóły i zarządzaj podstawowymi danymi katalogowymi.",
  ctaLabel: "Zobacz produkt",
  contentSchema: productCatalogSchema as unknown as Record<string, unknown>,
  listingTemplateConfig: createListingTemplateConfig({
    emptyTitle: "No products yet",
    emptyDescription:
      "Create your first product entry in Coderso > Products to populate the catalog.",
    summaryLabel: "Summary",
    numericLabel: "Price from",
    secondaryNumericLabel: "SKU",
    statusLabel: "Status",
    locationLabel: "Category",
    numericField: "priceFrom",
    secondaryNumericField: "sku",
    locationField: "category",
  }),
  screen: {
    eyebrow: "Products",
    subtitle: "Review the main product fields in one place.",
    description: "Use this record screen to review the key product fields.",
    badge: "active",
    leftTitle: "Product facts",
    rightTitle: "Commercial details",
    leftGroupTitle: "Core product details",
    leftGroupDescription: "Surface the product facts most editors update together.",
    rightGroupTitle: "Commercial overview",
    rightGroupDescription: "Status and category surfaced next to price.",
    leftFields: [
      {
        id: "sku",
        label: "SKU",
        helper: "Product SKU shown in catalog workflows.",
        tone: "strong",
        field: "sku",
      },
      {
        id: "category",
        label: "Category",
        helper: "Primary product category.",
        tone: "default",
        field: "category",
      },
    ],
    rightFields: [
      {
        id: "price",
        label: "Price from",
        helper: "Starting price shown in the listing template.",
        tone: "strong",
        field: "priceFrom",
      },
      {
        id: "stock",
        label: "Stock status",
        helper: "Operational stock visibility for editors.",
        tone: "default",
        field: "stockStatus",
      },
      {
        id: "status",
        label: "Status",
        helper: "Used for badges and product visibility.",
        tone: "muted",
        field: "projectStatus",
      },
    ],
  },
  assumptions: [
    "The first generic product preset does not yet model advanced variants or inventory rules.",
    "Catalog cards focus on summary, price, SKU, and status first.",
  ],
  refinement: {
    defaultFilterTitle: "Filter products",
    defaultFilterDescription: "Narrow down products by category, stock, and status.",
    defaultSearchPlaceholder: "Search products...",
    availableFacets: [
      {
        id: "category",
        kind: "checkbox",
        label: "Category",
        field: "data.category",
        op: "in",
      },
      {
        id: "price",
        kind: "range",
        label: "Price from",
        field: "data.priceFrom",
        op: "between",
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "data.projectStatus",
        op: "in",
        options: ["active", "coming-soon", "archived"].map((value) => ({
          value,
          label: value,
        })),
      },
    ],
  },
};

export const PORTFOLIO_PROJECTS_PRESET: CatalogFamilyPreset = {
  key: "portfolio-projects",
  intentId: "portfolio-projects",
  title: "Portfolio Projects Catalog",
  summary:
    "Create a structured portfolio/projects catalog with content model, dedicated admin surface, listing query/template, public catalog page, and detail routes.",
  answerIntro: "I can set up a complete portfolio/projects catalog flow in Coderso.",
  contentTypeSlug: "portfolio-projects",
  contentTypeName: "Portfolio Projects",
  catalogPageSlug: "/portfolio",
  catalogHiddenListPath: "/_catalog/portfolio-projects",
  detailPath: "/portfolio/:slug",
  listingQueryName: "Portfolio Projects Query",
  listingTemplateSlug: "portfolio-projects-grid",
  listingTemplateName: "Portfolio Projects Grid",
  customScreenName: "Portfolio Projects",
  introTitle: "Portfolio",
  introBody:
    "Przeglądaj realizacje, case studies i szczegóły projektów w jednym katalogu portfolio.",
  ctaLabel: "Zobacz realizację",
  contentSchema: portfolioProjectsSchema as unknown as Record<string, unknown>,
  coverImageUrlField: "coverImageUrl",
  coverImageAltField: "coverImageAlt",
  listingTemplateConfig: createListingTemplateConfig({
    emptyTitle: "No portfolio projects yet",
    emptyDescription:
      "Create your first project entry in Coderso > Portfolio Projects to populate the portfolio.",
    summaryLabel: "Summary",
    numericLabel: "Client",
    secondaryNumericLabel: "Delivery year",
    statusLabel: "Status",
    locationLabel: "Location",
    numericField: "clientName",
    secondaryNumericField: "deliveryYear",
    locationField: "location",
    imageUrlField: "coverImageUrl",
  }),
  screen: {
    eyebrow: "Portfolio projects",
    subtitle: "Review the main portfolio fields in one place.",
    description: "Use this record screen to review the key delivery and showcase fields.",
    badge: "published",
    leftTitle: "Project facts",
    rightTitle: "Delivery details",
    leftGroupTitle: "Core project details",
    leftGroupDescription: "Surface the portfolio facts most editors update together.",
    rightGroupTitle: "Delivery overview",
    rightGroupDescription: "Client and delivery context surfaced next to the status.",
    leftFields: [
      {
        id: "client",
        label: "Client",
        helper: "Client name displayed in project details.",
        tone: "strong",
        field: "clientName",
      },
      {
        id: "service",
        label: "Service type",
        helper: "Primary service shown in portfolio listings.",
        tone: "default",
        field: "serviceType",
      },
      {
        id: "result",
        label: "Result",
        helper: "Short outcome summary for case-study context.",
        tone: "default",
        field: "resultSummary",
      },
    ],
    rightFields: [
      {
        id: "year",
        label: "Delivery year",
        helper: "Year shown in the portfolio card.",
        tone: "strong",
        field: "deliveryYear",
      },
      {
        id: "location",
        label: "Location",
        helper: "Project location displayed in cards and detail view.",
        tone: "default",
        field: "location",
      },
      {
        id: "testimonial",
        label: "Testimonial",
        helper: "Client quote shown in case-study detail workflows.",
        tone: "default",
        field: "testimonialQuote",
      },
      {
        id: "status",
        label: "Status",
        helper: "Used for badges and project visibility.",
        tone: "muted",
        field: "projectStatus",
      },
    ],
  },
  assumptions: [
    "The first portfolio preset focuses on project showcase fields rather than complex case-study sections.",
    "Portfolio cards prioritize client, delivery year, and status metadata.",
    "Case-study detail fields capture result summary and testimonial copy without adding a bespoke page type.",
  ],
  refinement: {
    defaultFilterTitle: "Filter portfolio projects",
    defaultFilterDescription: "Narrow down projects by service type, delivery year, and location.",
    defaultSearchPlaceholder: "Search projects...",
    availableFacets: [
      {
        id: "service-type",
        kind: "checkbox",
        label: "Service type",
        field: "data.serviceType",
        op: "in",
      },
      {
        id: "delivery-year",
        kind: "range",
        label: "Delivery year",
        field: "data.deliveryYear",
        op: "between",
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "data.projectStatus",
        op: "in",
        options: ["published", "draft", "featured"].map((value) => ({
          value,
          label: value,
        })),
      },
    ],
  },
};

export const SERVICES_DIRECTORY_PRESET: CatalogFamilyPreset = {
  key: "services-directory",
  intentId: "services-directory",
  title: "Services Directory",
  summary:
    "Create a structured services directory with content model, dedicated admin surface, listing query/template, public catalog page, and detail routes.",
  answerIntro: "I can set up a complete services directory flow in Coderso.",
  contentTypeSlug: "services-directory",
  contentTypeName: "Services Directory",
  catalogPageSlug: "/uslugi",
  catalogHiddenListPath: "/_catalog/services-directory",
  detailPath: "/uslugi/:slug",
  listingQueryName: "Services Directory Query",
  listingTemplateSlug: "services-directory-grid",
  listingTemplateName: "Services Directory Grid",
  customScreenName: "Services Directory",
  introTitle: "Katalog Usług",
  introBody:
    "Przeglądaj usługi, porównuj ich szczegóły i otwieraj dedykowane strony każdej pozycji w katalogu.",
  ctaLabel: "Zobacz usługę",
  contentSchema: servicesDirectorySchema as unknown as Record<string, unknown>,
  coverImageUrlField: "coverImageUrl",
  coverImageAltField: "coverImageAlt",
  listingTemplateConfig: createListingTemplateConfig({
    emptyTitle: "No services yet",
    emptyDescription:
      "Create your first service entry in Coderso > Services Directory to populate the catalog.",
    summaryLabel: "Summary",
    numericLabel: "Service type",
    secondaryNumericLabel: "Response time (hours)",
    statusLabel: "Status",
    locationLabel: "Location",
    numericField: "serviceType",
    secondaryNumericField: "responseTimeHours",
    locationField: "location",
    imageUrlField: "coverImageUrl",
  }),
  screen: {
    eyebrow: "Services directory",
    subtitle: "Review the main service fields in one place.",
    description: "Use this record screen to review service facts and commercial details.",
    badge: "available",
    leftTitle: "Service facts",
    rightTitle: "Commercial details",
    leftGroupTitle: "Core service details",
    leftGroupDescription: "Surface the service facts most editors update together.",
    rightGroupTitle: "Commercial overview",
    rightGroupDescription: "Status and location surfaced next to pricing.",
    leftFields: [
      {
        id: "service-type",
        label: "Service type",
        helper: "Primary service category shown in cards.",
        tone: "strong",
        field: "serviceType",
      },
      {
        id: "response-time",
        label: "Response time (hours)",
        helper: "Operational response time for customers.",
        tone: "default",
        field: "responseTimeHours",
      },
    ],
    rightFields: [
      {
        id: "price",
        label: "Price from",
        helper: "Starting price shown in the listing template.",
        tone: "strong",
        field: "priceFrom",
      },
      {
        id: "location",
        label: "Location",
        helper: "Location displayed in cards and detail view.",
        tone: "default",
        field: "location",
      },
      {
        id: "status",
        label: "Status",
        helper: "Used for badges and service visibility.",
        tone: "muted",
        field: "projectStatus",
      },
    ],
  },
  assumptions: [
    "The first services-directory preset focuses on structured service cards rather than booking or calendar integration.",
    "Services directory cards prioritize service type, response time, price, and location.",
  ],
  refinement: {
    defaultFilterTitle: "Filter services",
    defaultFilterDescription: "Narrow down services by type, response time, and status.",
    defaultSearchPlaceholder: "Search services...",
    availableFacets: [
      {
        id: "service-type",
        kind: "checkbox",
        label: "Service type",
        field: "data.serviceType",
        op: "in",
      },
      {
        id: "response-time",
        kind: "range",
        label: "Response time (hours)",
        field: "data.responseTimeHours",
        op: "between",
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "data.projectStatus",
        op: "in",
        options: ["available", "featured", "hidden"].map((value) => ({
          value,
          label: value,
        })),
      },
    ],
  },
};

export const CATALOG_FAMILY_PRESETS = {
  catalog_showcase: HOUSE_PROJECTS_CATALOG_PRESET,
  product_catalog: PRODUCT_CATALOG_PRESET,
  portfolio_projects: PORTFOLIO_PROJECTS_PRESET,
  services_directory: SERVICES_DIRECTORY_PRESET,
} as const;
