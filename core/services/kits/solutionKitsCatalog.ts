import {
  type SiteBuilderBusinessType,
  type SiteBuilderGoal,
  type SolutionKitDefinition,
  type SolutionKitId,
} from "./solutionKitTypes";

export const solutionKitsCatalog: SolutionKitDefinition[] = [
  {
    id: "automotive-workshop",
    title: "Automotive Workshop",
    shortDescription:
      "Booking-driven website for inspections, repairs, and service packages.",
    longDescription:
      "Designed for local auto workshops that need quick booking, trust signals, and service catalogs.",
    businessTypes: ["automotive_workshop"],
    defaultGoals: [
      "online_booking",
      "lead_generation",
      "reviews_social_proof",
      "collect_qualified_leads",
    ],
    recommendedModules: ["booking", "forms", "reviews", "widgets", "entries"],
    features: [
      "Service catalog blocks",
      "Booking-first homepage",
      "Trust/review layout sections",
      "Lead capture fallback form",
    ],
    resourceBlueprint: {
      pages: [
        { slug: "", title: "Home", status: "published" },
        { slug: "services", title: "Services", status: "published" },
        { slug: "contact", title: "Contact", status: "published" },
      ],
      forms: [{ slug: "service-request", name: "Service Request", status: "published" }],
      contentTypes: [{ slug: "service", name: "Service" }],
      menus: [
        { location: "primary", name: "Primary" },
        { location: "footer", name: "Footer" },
      ],
    },
  },
  {
    id: "medical-clinic",
    title: "Medical Clinic",
    shortDescription:
      "Service and doctor presentation with structured appointment and trust pages.",
    longDescription:
      "For clinics and practices that need clear service pages, intake forms, and reputation sections.",
    businessTypes: ["medical_clinic"],
    defaultGoals: ["online_booking", "lead_generation", "reviews_social_proof"],
    recommendedModules: ["booking", "forms", "reviews", "widgets", "entries"],
    features: [
      "Doctor/team listing scaffolding",
      "Appointment funnel",
      "Patient trust sections",
      "Contact and location pages",
    ],
    resourceBlueprint: {
      pages: [
        { slug: "", title: "Home", status: "published" },
        { slug: "doctors", title: "Doctors", status: "published" },
        { slug: "contact", title: "Contact", status: "published" },
      ],
      forms: [{ slug: "appointment-request", name: "Appointment Request", status: "published" }],
      contentTypes: [{ slug: "doctor", name: "Doctor" }],
      menus: [
        { location: "primary", name: "Primary" },
        { location: "footer", name: "Footer" },
      ],
    },
  },
  {
    id: "beauty-salon",
    title: "Beauty Salon",
    shortDescription:
      "Conversion-focused salon website with services, offers, and booking flow.",
    longDescription:
      "For beauty and wellness brands that need a visual homepage with quick booking and promotions.",
    businessTypes: ["beauty_salon"],
    defaultGoals: ["online_booking", "lead_generation", "reviews_social_proof"],
    recommendedModules: ["booking", "forms", "reviews", "widgets"],
    features: [
      "Offer and package highlights",
      "Gallery-friendly sections",
      "Appointment request form",
      "Social proof placements",
    ],
    resourceBlueprint: {
      pages: [
        { slug: "", title: "Home", status: "published" },
        { slug: "offers", title: "Offers", status: "published" },
        { slug: "contact", title: "Contact", status: "published" },
      ],
      forms: [{ slug: "beauty-booking", name: "Beauty Booking", status: "published" }],
      contentTypes: [{ slug: "offer", name: "Offer" }],
      menus: [
        { location: "primary", name: "Primary" },
        { location: "footer", name: "Footer" },
      ],
    },
  },
  {
    id: "services-directory",
    title: "Local Services Directory",
    shortDescription:
      "Listing-first setup for providers, categories, and filtered search experiences.",
    longDescription:
      "For aggregator-like websites requiring listings, filters, and searchable service cards.",
    businessTypes: ["services_directory"],
    defaultGoals: ["catalog_showcase", "lead_generation", "collect_qualified_leads"],
    recommendedModules: ["listings", "filters", "search", "forms", "entries"],
    features: [
      "Directory listing page scaffolding",
      "Filter/search module presets",
      "Provider detail template placeholders",
      "Lead capture for inquiries",
    ],
    resourceBlueprint: {
      pages: [
        { slug: "", title: "Home", status: "published" },
        { slug: "directory", title: "Directory", status: "published" },
        { slug: "submit", title: "Submit", status: "draft" },
      ],
      forms: [{ slug: "directory-inquiry", name: "Directory Inquiry", status: "published" }],
      contentTypes: [{ slug: "provider", name: "Provider" }],
      menus: [
        { location: "primary", name: "Primary" },
        { location: "footer", name: "Footer" },
      ],
    },
  },
  {
    id: "small-ecommerce",
    title: "Small E-commerce",
    shortDescription:
      "Catalog and conversion-ready storefront starter with product-focused pages.",
    longDescription:
      "For teams that need quick catalog launch with product showcases and conversion pages.",
    businessTypes: ["small_ecommerce"],
    defaultGoals: ["sell_products", "catalog_showcase", "reviews_social_proof"],
    recommendedModules: ["commerce", "widgets", "forms", "reviews", "listings"],
    features: [
      "Product showcase page scaffolding",
      "Compare/table widget-ready structure",
      "Conversion-focused CTA sections",
      "Optional lead form for custom orders",
    ],
    resourceBlueprint: {
      pages: [
        { slug: "", title: "Home", status: "published" },
        { slug: "catalog", title: "Catalog", status: "published" },
        { slug: "contact", title: "Contact", status: "published" },
      ],
      forms: [{ slug: "custom-order", name: "Custom Order", status: "draft" }],
      contentTypes: [{ slug: "catalog-page", name: "Catalog Page" }],
      menus: [
        { location: "primary", name: "Primary" },
        { location: "footer", name: "Footer" },
      ],
    },
  },
];

const byId = new Map(solutionKitsCatalog.map((kit) => [kit.id, kit]));

export const listSolutionKitsCatalog = () => solutionKitsCatalog;

export const getSolutionKitFromCatalog = (id: SolutionKitId) => byId.get(id) ?? null;

export const businessTypeMatchesKit = (
  kit: SolutionKitDefinition,
  businessType: SiteBuilderBusinessType
) => (businessType === "custom" ? false : kit.businessTypes.includes(businessType));

export const goalMatchesKit = (kit: SolutionKitDefinition, goal: SiteBuilderGoal) =>
  kit.defaultGoals.includes(goal);
