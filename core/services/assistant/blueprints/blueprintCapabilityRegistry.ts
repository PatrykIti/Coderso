import type { AssistantIntentFamily } from "../actionPlanTypes";
import { getBusinessBlueprintPack, listBusinessBlueprintPacks } from "./businessBlueprintTypes";
import { getCatalogFamilyDetailPageId } from "./catalogFamilyBlueprint";
import {
  CATALOG_FAMILY_PRESETS,
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
  SERVICES_DIRECTORY_PRESET,
} from "./catalogFamilyPresets";
import { buildFullServiceSitePlan } from "./fullServiceSiteBlueprint";
import {
  buildProductCheckoutNeedsInputPlan,
  buildProductInquiryCatalogPlan,
} from "./productInquiryBlueprint";
import { normalizeBlueprintCapabilities } from "./blueprintCapabilitySchema";
import type {
  BlueprintCapability,
  BlueprintCapabilityRegistration,
  BlueprintCapabilityPlanBuilder,
} from "./blueprintCapabilityTypes";

const capabilityById = (id: string) => {
  const registration = listBusinessBlueprintPacks().find((pack) => pack.id === id);
  return registration ?? null;
};

const createCatalogCapability = (
  intentFamily: keyof typeof CATALOG_FAMILY_PRESETS,
  aliases: string[]
): BlueprintCapabilityRegistration => {
  const pack = capabilityById(CATALOG_FAMILY_PRESETS[intentFamily].intentId);
  const preset = CATALOG_FAMILY_PRESETS[intentFamily];
  if (!pack) {
    throw new Error("assistant_blueprint_registry_pack_missing");
  }
  const [capability] = normalizeBlueprintCapabilities([
    {
      id: pack.id,
      version: 1,
      label: pack.title,
      family: intentFamily,
      description: preset.summary,
      aliases,
      provides: [
        {
          kind: "catalog",
          key: `${preset.key}-catalog`,
          label: `${pack.title} catalog`,
          aliases,
        },
        {
          kind: "public-detail-page",
          key: `${preset.key}-detail-page`,
          label: `${pack.title} detail template`,
          aliases: [`${preset.contentTypeName} detail`, `${preset.contentTypeName} template`],
        },
      ],
      requires: [],
      resources: [
        {
          key: `content-type:${preset.contentTypeSlug}`,
          kind: "content-type",
          label: preset.contentTypeName,
          executable: true,
          actionTypes: ["content-type.upsert"],
          stableTarget: preset.contentTypeSlug,
          owner: "content-type.upsert",
        },
        {
          key: `route:${preset.contentTypeSlug}`,
          kind: "content-route",
          label: `${preset.contentTypeName} public content route`,
          executable: true,
          actionTypes: ["setting.content-route.upsert"],
          stableTarget: preset.contentTypeSlug,
          owner: "setting.content-route.upsert",
        },
        {
          key: `screen:${preset.contentTypeSlug}`,
          kind: "custom-screen",
          label: preset.customScreenName,
          executable: true,
          actionTypes: ["custom-screen.upsert"],
          stableTarget: preset.customScreenName,
          owner: "custom-screen.upsert",
        },
        {
          key: `listing-query:${preset.listingQueryName}`,
          kind: "listing-query",
          label: preset.listingQueryName,
          executable: true,
          actionTypes: ["listing-query.upsert"],
          stableTarget: preset.listingQueryName,
          owner: "listing-query.upsert",
        },
        {
          key: `listing-template:${preset.listingTemplateSlug}`,
          kind: "listing-template",
          label: preset.listingTemplateName,
          executable: true,
          actionTypes: ["listing-template.upsert"],
          stableTarget: preset.listingTemplateSlug,
          owner: "listing-template.upsert",
        },
        {
          key: `page:${preset.catalogPageSlug}`,
          kind: "page",
          label: preset.introTitle,
          executable: true,
          actionTypes: ["page.upsert"],
          stableTarget: preset.catalogPageSlug,
          owner: "page.upsert",
        },
        {
          key: `detail-page:${preset.contentTypeSlug}`,
          kind: "detail-page",
          label: `${preset.contentTypeName} detail template`,
          executable: true,
          actionTypes: ["detail-page.upsert"],
          stableTarget: getCatalogFamilyDetailPageId(preset),
          owner: "detail-page.upsert",
        },
      ],
      pageSections: [
        {
          key: `section:${preset.catalogPageSlug}:catalog`,
          label: `${pack.title} catalog landing`,
          slot: "catalog-landing",
          kind: "catalog-landing",
        },
      ],
      adminSurfaces: [
        {
          key: `admin:${preset.contentTypeSlug}:screen`,
          label: preset.customScreenName,
          surface: "custom-screen",
          routeHint: "/admin/advanced/custom-screens",
        },
        {
          key: `admin:${preset.contentTypeSlug}:entries`,
          label: `${preset.contentTypeName} entries`,
          surface: "entries",
          routeHint: "/admin/advanced/entries",
        },
      ],
      gated: [],
      merge: {
        role: "primary",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 80,
      },
    },
  ]);

  return {
    capability,
    buildPlan: (options) =>
      pack.buildPlan({
        promptKind: options?.promptKind,
        intentFamily: options?.intentFamily ?? pack.intentFamily,
      }),
    primaryIntentFamilies: [intentFamily],
  };
};

const fullServicePages = [
  { slug: "/", label: "Studio Forma" },
  { slug: "/uslugi", label: "Uslugi architektoniczne" },
  { slug: "/portfolio", label: "Portfolio realizacji" },
  { slug: "/o-nas", label: "O Studio Forma" },
  { slug: "/proces", label: "Proces wspolpracy" },
  { slug: "/referencje", label: "Referencje i efekty" },
  { slug: "/kontakt", label: "Kontakt i wycena" },
] as const;

const createFullServiceSiteCapability = (): BlueprintCapabilityRegistration => {
  const [capability] = normalizeBlueprintCapabilities([
    {
      id: "service-business-full-site",
      version: 1,
      label: "Full-Service Architecture Studio Site",
      family: "service_business_full_site",
      description:
        "Launch-shaped service business site with services, portfolio, detail pages, public samples, navigation, lead form, and SEO.",
      aliases: [
        "complete architecture studio site",
        "full-service architecture site",
        "launch-ready architecture studio site",
        "pelna strona pracowni architektonicznej",
      ],
      provides: [
        {
          kind: "full-service-site",
          key: "service-business-full-site",
          label: "Full-service architecture studio website",
          aliases: ["architecture studio site", "complete architecture site"],
        },
        {
          kind: "catalog",
          key: "full-service-services-catalog",
          label: "Services catalog",
          aliases: ["services", "uslugi"],
        },
        {
          kind: "catalog",
          key: "full-service-portfolio-catalog",
          label: "Portfolio catalog",
          aliases: ["portfolio", "realizacje"],
        },
        {
          kind: "lead-capture",
          key: "full-service-lead-capture",
          label: "Lead capture form and contact page",
          aliases: ["contact form", "lead form"],
        },
        {
          kind: "public-detail-page",
          key: "full-service-detail-pages",
          label: "Services and portfolio detail pages",
          aliases: ["detail pages", "service detail", "portfolio detail"],
        },
      ],
      requires: [],
      resources: [
        ...[SERVICES_DIRECTORY_PRESET, PORTFOLIO_PROJECTS_PRESET].flatMap((preset) => [
          {
            key: `content-type:${preset.contentTypeSlug}`,
            kind: "content-type" as const,
            label: preset.contentTypeName,
            executable: true,
            actionTypes: ["content-type.upsert" as const],
            stableTarget: preset.contentTypeSlug,
            owner: "content-type.upsert",
          },
          {
            key: `route:${preset.contentTypeSlug}`,
            kind: "content-route" as const,
            label: `${preset.contentTypeName} public content route`,
            executable: true,
            actionTypes: ["setting.content-route.upsert" as const],
            stableTarget: preset.contentTypeSlug,
            owner: "setting.content-route.upsert",
          },
          {
            key: `detail-page:${preset.contentTypeSlug}`,
            kind: "detail-page" as const,
            label: `${preset.contentTypeName} detail template`,
            executable: true,
            actionTypes: ["detail-page.upsert" as const],
            stableTarget: getCatalogFamilyDetailPageId(preset),
            owner: "detail-page.upsert",
          },
          {
            key: `listing-query:${preset.listingQueryName}`,
            kind: "listing-query" as const,
            label: preset.listingQueryName,
            executable: true,
            actionTypes: ["listing-query.upsert" as const],
            stableTarget: preset.listingQueryName,
            owner: "listing-query.upsert",
          },
          {
            key: `listing-template:${preset.listingTemplateSlug}`,
            kind: "listing-template" as const,
            label: preset.listingTemplateName,
            executable: true,
            actionTypes: ["listing-template.upsert" as const],
            stableTarget: preset.listingTemplateSlug,
            owner: "listing-template.upsert",
          },
          {
            key: `entry:${preset.contentTypeSlug}:samples`,
            kind: "entry" as const,
            label: `${preset.contentTypeName} public samples`,
            executable: true,
            actionTypes: ["entry.sample.create" as const],
            stableTarget: preset.contentTypeSlug,
            owner: "entry.sample.create",
          },
          {
            key: `screen:${preset.contentTypeSlug}`,
            kind: "custom-screen" as const,
            label: preset.customScreenName,
            executable: true,
            actionTypes: ["custom-screen.upsert" as const],
            stableTarget: preset.customScreenName,
            owner: "custom-screen.upsert",
          },
        ]),
        {
          key: "form:lead-capture-inquiry",
          kind: "form",
          label: "Lead Capture Inquiry",
          executable: true,
          actionTypes: ["form.upsert"],
          stableTarget: "lead-capture-inquiry",
          owner: "form.upsert",
        },
        {
          key: "menu:primary",
          kind: "menu",
          label: "Primary navigation",
          executable: true,
          actionTypes: ["menu.upsert", "menu.item.upsert"],
          stableTarget: "primary",
          owner: "menu.upsert",
        },
        {
          key: "menu:footer",
          kind: "menu",
          label: "Footer navigation",
          executable: true,
          actionTypes: ["menu.upsert", "menu.item.upsert"],
          stableTarget: "footer",
          owner: "menu.upsert",
        },
        {
          key: "seo:full-service-pages",
          kind: "seo",
          label: "Main page SEO",
          executable: true,
          actionTypes: ["seo.document.upsert"],
          stableTarget: "full-service-pages",
          owner: "seo.document.upsert",
        },
        ...fullServicePages.map((page) => ({
          key: `page:${page.slug}`,
          kind: "page" as const,
          label: page.label,
          executable: true,
          actionTypes: ["page.upsert" as const],
          stableTarget: page.slug,
          owner: "page.upsert",
        })),
      ],
      pageSections: [],
      adminSurfaces: [
        { key: "admin:pages", label: "Pages", surface: "pages", routeHint: "/admin/pages" },
        {
          key: "admin:forms",
          label: "Forms",
          surface: "forms",
          routeHint: "/admin/advanced/forms",
        },
        {
          key: "admin:listings",
          label: "Listings",
          surface: "listings",
          routeHint: "/admin/advanced/listings",
        },
        {
          key: "admin:entries",
          label: "Entries",
          surface: "entries",
          routeHint: "/admin/advanced/entries",
        },
      ],
      gated: [
        {
          key: "gated:media-import",
          kind: "media-import",
          label: "Original media upload",
          reason:
            "The blueprint can ship launch-shaped copy and public samples, but original media upload remains a reviewed media workflow.",
          blocking: false,
        },
      ],
      merge: {
        role: "primary",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 95,
      },
    },
  ]);

  return {
    capability,
    buildPlan: (options) =>
      buildFullServiceSitePlan({
        prompt: options?.prompt,
        promptKind: options?.promptKind,
      }),
    primaryIntentFamilies: ["service_business_full_site"],
  };
};

const currentBlueprintCapabilities = [
  createCatalogCapability("catalog_showcase", [
    "house projects",
    "projekty domow",
    "projekty domów",
    "mabudo",
  ]),
  createCatalogCapability("product_catalog", ["product catalog", "products", "shop", "sklep"]),
  createCatalogCapability("portfolio_projects", ["portfolio", "case study", "realizacje"]),
  createCatalogCapability("services_directory", [
    "services directory",
    "services",
    "katalog usług",
  ]),
  createFullServiceSiteCapability(),
  ...normalizeBlueprintCapabilities([
    {
      id: "lead-capture-site",
      version: 1,
      label: "Lead Capture Site",
      family: "lead_capture_site",
      description: "Landing page and public inquiry form for contact and quote capture.",
      aliases: ["lead capture", "contact page", "quote form", "kontakt", "wycena"],
      provides: [
        {
          kind: "lead-capture",
          key: "lead-capture",
          label: "Lead capture landing and form",
          aliases: ["contact form", "quote form", "lead form"],
        },
      ],
      requires: [],
      resources: [
        {
          key: "form:lead-capture-inquiry",
          kind: "form",
          label: "Lead Capture Inquiry",
          executable: true,
          actionTypes: ["form.upsert"],
          stableTarget: "lead-capture-inquiry",
          owner: "form.upsert",
        },
        {
          key: "page:/kontakt",
          kind: "page",
          label: "Kontakt i wycena",
          executable: true,
          actionTypes: ["page.upsert"],
          stableTarget: "/kontakt",
          owner: "page.upsert",
        },
      ],
      pageSections: [
        {
          key: "section:/kontakt:lead-capture",
          label: "Lead capture landing",
          slot: "lead-capture-landing",
          kind: "lead-capture-landing",
        },
      ],
      adminSurfaces: [
        {
          key: "admin:forms",
          label: "Forms",
          surface: "forms",
          routeHint: "/admin/advanced/forms",
        },
      ],
      gated: [],
      merge: {
        role: "adjunct",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "keep-separate",
        gatedStrategy: "metadata-only",
        priority: 50,
      },
    },
    {
      id: "product-inquiry-catalog",
      version: 1,
      label: "Product Inquiry Catalog",
      family: "product_catalog",
      description: "Product catalog plus public inquiry form embedded on the catalog page.",
      aliases: ["product inquiry", "ask about product", "catalog plus inquiry"],
      provides: [
        {
          kind: "product-inquiry",
          key: "product-inquiry",
          label: "Product inquiry form",
          aliases: ["product form", "inquiry form", "quote"],
        },
      ],
      requires: [{ kind: "capability", key: "product-catalog", label: "Product catalog" }],
      resources: [
        {
          key: `content-type:${PRODUCT_CATALOG_PRESET.contentTypeSlug}`,
          kind: "content-type",
          label: PRODUCT_CATALOG_PRESET.contentTypeName,
          executable: true,
          actionTypes: ["content-type.upsert"],
          stableTarget: PRODUCT_CATALOG_PRESET.contentTypeSlug,
          owner: "content-type.upsert",
        },
        {
          key: `route:${PRODUCT_CATALOG_PRESET.contentTypeSlug}`,
          kind: "content-route",
          label: `${PRODUCT_CATALOG_PRESET.contentTypeName} public content route`,
          executable: true,
          actionTypes: ["setting.content-route.upsert"],
          stableTarget: PRODUCT_CATALOG_PRESET.contentTypeSlug,
          owner: "setting.content-route.upsert",
        },
        {
          key: `screen:${PRODUCT_CATALOG_PRESET.contentTypeSlug}`,
          kind: "custom-screen",
          label: PRODUCT_CATALOG_PRESET.customScreenName,
          executable: true,
          actionTypes: ["custom-screen.upsert"],
          stableTarget: PRODUCT_CATALOG_PRESET.customScreenName,
          owner: "custom-screen.upsert",
        },
        {
          key: `listing-query:${PRODUCT_CATALOG_PRESET.listingQueryName}`,
          kind: "listing-query",
          label: PRODUCT_CATALOG_PRESET.listingQueryName,
          executable: true,
          actionTypes: ["listing-query.upsert"],
          stableTarget: PRODUCT_CATALOG_PRESET.listingQueryName,
          owner: "listing-query.upsert",
        },
        {
          key: `listing-template:${PRODUCT_CATALOG_PRESET.listingTemplateSlug}`,
          kind: "listing-template",
          label: PRODUCT_CATALOG_PRESET.listingTemplateName,
          executable: true,
          actionTypes: ["listing-template.upsert"],
          stableTarget: PRODUCT_CATALOG_PRESET.listingTemplateSlug,
          owner: "listing-template.upsert",
        },
        {
          key: "form:product-catalog-inquiry",
          kind: "form",
          label: "Product Catalog Inquiry",
          executable: true,
          actionTypes: ["form.upsert"],
          stableTarget: "product-catalog-inquiry",
          owner: "form.upsert",
        },
        {
          key: `page:${PRODUCT_CATALOG_PRESET.catalogPageSlug}`,
          kind: "page",
          label: PRODUCT_CATALOG_PRESET.introTitle,
          executable: true,
          actionTypes: ["page.upsert"],
          stableTarget: PRODUCT_CATALOG_PRESET.catalogPageSlug,
          owner: "page.upsert",
        },
      ],
      pageSections: [
        {
          key: `section:${PRODUCT_CATALOG_PRESET.catalogPageSlug}:form-embed`,
          label: "Product inquiry embed",
          slot: "form-embed",
          kind: "form-embed",
        },
      ],
      adminSurfaces: [
        {
          key: "admin:forms",
          label: "Forms",
          surface: "forms",
          routeHint: "/admin/advanced/forms",
        },
      ],
      gated: [],
      merge: {
        role: "adjunct",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 70,
      },
    },
    {
      id: "editorial-content-hub",
      version: 1,
      label: "Editorial Content Hub",
      family: "editorial_content_hub",
      description: "Published blog hub page with static post navigation guidance.",
      aliases: ["blog", "posts", "editorial", "content hub", "aktualności"],
      provides: [
        {
          kind: "editorial-content-hub",
          key: "editorial-content-hub",
          label: "Editorial hub page",
          aliases: ["blog", "posts feed", "aktualności"],
        },
      ],
      requires: [],
      resources: [
        {
          key: "page:/blog",
          kind: "page",
          label: "Aktualności i poradniki",
          executable: true,
          actionTypes: ["page.upsert"],
          stableTarget: "/blog",
          owner: "page.upsert",
        },
      ],
      pageSections: [
        {
          key: "section:/blog:editorial",
          label: "Editorial hub",
          slot: "editorial-hub",
          kind: "editorial-hub",
        },
      ],
      adminSurfaces: [
        { key: "admin:pages", label: "Pages", surface: "pages", routeHint: "/admin/pages" },
      ],
      gated: [],
      merge: {
        role: "adjunct",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "keep-separate",
        gatedStrategy: "metadata-only",
        priority: 45,
      },
    },
    {
      id: "booking-service",
      version: 1,
      label: "Booking Service Business",
      family: "booking_service",
      description: "Booking remains a gated module until assistant booking adapters exist.",
      aliases: ["booking", "appointment", "calendar", "rezerwacja"],
      provides: [
        {
          kind: "booking",
          key: "booking",
          label: "Booking module",
          aliases: ["booking", "appointment", "calendar"],
        },
      ],
      requires: [],
      resources: [],
      pageSections: [],
      adminSurfaces: [],
      gated: [
        {
          key: "gated:booking",
          kind: "booking",
          label: "Booking setup",
          reason:
            "Booking domain adapters are still gated and must not create a parallel assistant-only write path.",
          blocking: true,
        },
      ],
      merge: {
        role: "gated",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "keep-separate",
        gatedStrategy: "needs-input",
        priority: 90,
      },
    },
    {
      id: "checkout-payment",
      version: 1,
      label: "Checkout and Payment",
      family: "product_catalog",
      description: "Checkout and payment flows remain gated until commerce/payment adapters land.",
      aliases: ["checkout", "payment", "cart", "koszyk", "płatność"],
      provides: [
        {
          kind: "checkout-payment",
          key: "checkout-payment",
          label: "Checkout and payment module",
          aliases: ["checkout", "payment", "cart"],
        },
      ],
      requires: [{ kind: "capability", key: "product-catalog", label: "Product catalog" }],
      resources: [],
      pageSections: [],
      adminSurfaces: [],
      gated: [
        {
          key: "gated:checkout-payment",
          kind: "checkout-payment",
          label: "Checkout and payment",
          reason:
            "Checkout/payment resources are not yet exposed through strict assistant typed actions.",
          blocking: true,
        },
      ],
      merge: {
        role: "gated",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "keep-separate",
        gatedStrategy: "needs-input",
        priority: 85,
      },
    },
  ]).map((capability) => ({
    capability,
    buildPlan: ((options) => {
      switch (capability.id) {
        case "lead-capture-site":
        case "editorial-content-hub":
        case "booking-service": {
          const pack = getBusinessBlueprintPack(
            capability.id === "lead-capture-site"
              ? "lead_capture_site"
              : capability.id === "editorial-content-hub"
                ? "editorial_content_hub"
                : "booking_service"
          );
          if (!pack) throw new Error("assistant_blueprint_registry_pack_missing");
          return pack.buildPlan({
            promptKind: options?.promptKind,
            intentFamily: options?.intentFamily ?? pack.intentFamily,
          });
        }
        case "product-inquiry-catalog":
          return buildProductInquiryCatalogPlan({
            promptKind: options?.promptKind,
            intentFamily: options?.intentFamily ?? "product_catalog",
          });
        case "checkout-payment":
          return buildProductCheckoutNeedsInputPlan({
            promptKind: options?.promptKind,
          });
        default:
          throw new Error("assistant_blueprint_registry_builder_missing");
      }
    }) satisfies BlueprintCapabilityPlanBuilder,
    primaryIntentFamilies:
      capability.id === "lead-capture-site"
        ? (["lead_capture_site"] satisfies AssistantIntentFamily[])
        : capability.id === "editorial-content-hub"
          ? (["editorial_content_hub"] satisfies AssistantIntentFamily[])
          : capability.id === "booking-service"
            ? (["booking_service"] satisfies AssistantIntentFamily[])
            : [],
  })),
];

const capabilityRegistry = new Map(
  currentBlueprintCapabilities.map((registration) => [registration.capability.id, registration])
);

export const listBlueprintCapabilityRegistrations = () => [...currentBlueprintCapabilities];

export const listBlueprintCapabilities = () =>
  currentBlueprintCapabilities.map((registration) => registration.capability);

export const getBlueprintCapabilityRegistration = (
  id: string
): BlueprintCapabilityRegistration | null => capabilityRegistry.get(id) ?? null;

export const getBlueprintCapability = (id: string): BlueprintCapability | null =>
  capabilityRegistry.get(id)?.capability ?? null;

export const findCapabilitiesProviding = (kind: BlueprintCapability["provides"][number]["kind"]) =>
  currentBlueprintCapabilities
    .map((registration) => registration.capability)
    .filter((capability) => capability.provides.some((entry) => entry.kind === kind));

export const findBlueprintCapabilitiesForIntentFamily = (intentFamily: AssistantIntentFamily) =>
  currentBlueprintCapabilities.filter((registration) =>
    registration.primaryIntentFamilies.includes(intentFamily)
  );
