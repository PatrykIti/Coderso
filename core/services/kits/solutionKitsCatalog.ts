import {
  type SiteBuilderBusinessType,
  type SiteBuilderGoal,
  type SolutionKitDefinition,
  type SolutionKitId,
} from "./solutionKitTypes";
import { buildSolutionKitManifest } from "./kitManifest";
import { getCuratedMediaAsset, type CuratedMediaAssetId } from "../media/curatedMediaProfiles";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockType,
  type PageBlockV2,
  type PageSectionType,
  type PageSectionV2,
} from "../pages/pageDocumentV2";

type LegacyKitBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  variant?: string;
};

const block = (
  id: string,
  type: string,
  data: Record<string, unknown> = {},
  variant?: string
): LegacyKitBlock => ({
  id,
  type,
  ...(variant ? { variant } : {}),
  data,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
};

const toLabel = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const readNestedRecord = (source: Record<string, unknown>, key: string) =>
  isRecord(source[key]) ? source[key] : null;

const readNestedText = (source: Record<string, unknown>, ...path: string[]) => {
  let value: unknown = source;
  for (const key of path) {
    if (!isRecord(value)) return null;
    value = value[key];
  }
  return readText(value);
};

const normalizeHref = (value: unknown) => {
  const href = readText(value);
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("http")) return href;
  return `/${href.replace(/^\/+/, "")}`;
};

const collectLinkItems = (value: unknown): Array<string | { label: string; href: string }> => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Array<string | { label: string; href: string }> => {
    if (typeof item === "string") return [item];
    if (!isRecord(item)) return [];
    const label = readText(item.label, item.title, item.name, item.text);
    if (!label) return [];
    const href = normalizeHref(item.href ?? item.url ?? item.pageSlug);
    return href ? [{ label, href }] : [label];
  });
};

const collectLegacyLinks = (data: Record<string, unknown>) => {
  const direct = [...collectLinkItems(data.items), ...collectLinkItems(data.links)];
  const columns = Array.isArray(data.columns)
    ? data.columns.flatMap((column) => (isRecord(column) ? collectLinkItems(column.links) : []))
    : [];
  return [...direct, ...columns];
};

const readLegacyMedia = (data: Record<string, unknown>) => {
  const media = readNestedRecord(data, "media") ?? readNestedRecord(data, "image");
  if (media) {
    return {
      src: readText(media.src, media.url),
      alt: readText(media.alt, media.title) ?? "",
      caption: readText(media.caption) ?? "",
    };
  }
  return {
    src: readText(data.src, data.imageUrl),
    alt: readText(data.alt, data.imageAlt) ?? "",
    caption: readText(data.caption) ?? "",
  };
};

const readLegacyCta = (data: Record<string, unknown>) =>
  readNestedRecord(data, "primaryCta") ??
  readNestedRecord(data, "cta") ??
  readNestedRecord(data, "button");

const readLegacyFormId = (data: Record<string, unknown>) =>
  readText(data.formId, readNestedText(data, "form", "submission", "formId"));

const legacySectionType = (type: string): PageSectionType => {
  const map: Record<string, PageSectionType> = {
    navigation: "navigation",
    footer: "navigation",
    hero: "hero",
    contact: "lead-form",
    "form-embed": "lead-form",
    "feature-grid": "feature-grid",
    "logo-cloud": "feature-grid",
    team: "feature-grid",
    "pricing-plans": "comparison",
    "stats-kpi": "feature-grid",
    "content-list": "collection",
    "product-gallery": "gallery",
    "product-table": "collection",
    "listing-filters": "filters",
    "search-box": "filters",
    "faq-accordion": "faq",
    "gallery-mosaic": "gallery",
    "cta-banner": "cta",
    "rich-text-section": "content",
    testimonials: "testimonials",
  };
  return map[type] ?? "custom";
};

const legacySectionVariant = (type: string): PageSectionV2["variant"] => {
  if (type === "hero") return "split";
  if (type === "navigation") return "horizontal";
  if (type === "footer") return "compact";
  if (type === "feature-grid" || type === "team" || type === "logo-cloud") return "grid";
  if (type === "cta-banner") return "centered";
  if (type === "pricing-plans") return "cards";
  return "default";
};

const makeBlock = (
  type: PageBlockType,
  id: string,
  props: Record<string, unknown>,
  style?: PageBlockV2["style"]
) => createPageBlockV2(type, { id, props, style });

const legacyBlockToAtomicBlocks = (legacy: LegacyKitBlock): PageBlockV2[] => {
  const data = legacy.data;
  const blocks: PageBlockV2[] = [];
  const title = readText(
    data.headline,
    data.title,
    data.heading,
    data.name,
    legacy.type === "navigation" || legacy.type === "footer" ? null : toLabel(legacy.type)
  );
  const body = readText(data.body, data.description, data.text, data.copy, data.subhead);
  const media = readLegacyMedia(data);
  const cta = readLegacyCta(data);
  const links = collectLegacyLinks(data);
  const formId = readLegacyFormId(data);

  if (title && legacy.type !== "navigation" && legacy.type !== "footer") {
    blocks.push(
      makeBlock("heading", `${legacy.id}-heading`, {
        text: title,
        level: legacy.type === "hero" ? "h1" : "h2",
        align: legacy.type === "cta-banner" ? "center" : "left",
      })
    );
  }

  if (body) {
    blocks.push(
      makeBlock("text", `${legacy.id}-text`, {
        text: body,
        format: "plain",
        align: legacy.type === "cta-banner" ? "center" : "left",
      })
    );
  }

  if (media.src) {
    blocks.push(
      makeBlock("image", `${legacy.id}-image`, {
        assetId: null,
        src: media.src,
        alt: media.alt,
        caption: media.caption,
        fit: "cover",
      })
    );
  }

  if (formId) {
    blocks.push(
      makeBlock("form", `${legacy.id}-form`, {
        formId,
        title: readText(data.title, data.heading, data.name) ?? "Contact form",
      })
    );
  }

  if (links.length > 0) {
    blocks.push(makeBlock("list", `${legacy.id}-links`, { items: links, ordered: false }));
  }

  if (legacy.type === "content-list" || legacy.type === "product-table") {
    blocks.push(
      makeBlock("collection", `${legacy.id}-collection`, {
        contentTypeId: readText(data.contentTypeId, data.contentTypeSlug),
        queryId: readText(data.queryId, data.listingQueryId),
        limit: typeof data.limit === "number" ? data.limit : 6,
        templateId: readText(data.templateId, data.listingTemplateId),
      })
    );
  }

  if (legacy.type === "gallery-mosaic" || legacy.type === "product-gallery") {
    blocks.push(
      makeBlock("gallery", `${legacy.id}-gallery`, {
        items: Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.images)
            ? data.images
            : [],
        layout: "grid",
      })
    );
  }

  if (Array.isArray(data.items) && legacy.type === "stats-kpi") {
    data.items.forEach((item, index) => {
      if (!isRecord(item)) return;
      blocks.push(
        makeBlock("statistic", `${legacy.id}-stat-${index + 1}`, {
          value: readText(item.value, item.metric) ?? "0",
          label: readText(item.label, item.title) ?? "Metric",
          caption: readText(item.caption, item.description) ?? "",
        })
      );
    });
  }

  if (cta) {
    blocks.push(
      makeBlock("button", `${legacy.id}-cta`, {
        label: readText(cta.label, cta.title, cta.text) ?? "Learn more",
        href: normalizeHref(cta.href ?? cta.url) ?? "/",
        target: "self",
        variant: "primary",
        size: "md",
      })
    );
  }

  if (blocks.length === 0) {
    blocks.push(
      makeBlock("card", `${legacy.id}-card`, {
        title: title ?? toLabel(legacy.type),
        text: body ?? "",
        image: media.src ? { src: media.src, alt: media.alt } : null,
        href: null,
      })
    );
  }

  return blocks;
};

const legacyBlockToSection = (legacy: LegacyKitBlock) =>
  createPageSectionV2(legacySectionType(legacy.type), {
    id: `sec_${legacy.id}`,
    name: toLabel(legacy.type),
    variant: legacySectionVariant(legacy.type),
    blocks: legacyBlockToAtomicBlocks(legacy),
  });

const pageData = (
  blocks: LegacyKitBlock[],
  options?: {
    showInNav?: boolean;
    template?: string;
  }
) => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  sections: blocks.map(legacyBlockToSection),
  settings: {
    template: options?.template ?? "page-v2",
    showInNav: options?.showInNav ?? true,
  },
});

const terms = (...values: string[]) => values.map((name) => ({ name }));

const curatedImage = (id: CuratedMediaAssetId) => {
  const asset = getCuratedMediaAsset(id);
  return {
    src: asset.src,
    alt: asset.alt,
  };
};

const clinicHomeImage = curatedImage("medical-clinic-home-care");
const salonHomeImage = curatedImage("beauty-salon-home");
const salonSkincareImage = curatedImage("beauty-salon-skincare");
const salonMakeupImage = curatedImage("beauty-salon-makeup");
const salonSpaImage = curatedImage("beauty-salon-spa-ritual");
const salonNailsImage = curatedImage("beauty-salon-nail-care");

const clinicHeroData = {
  headline: "Primary care and specialist visits in one patient-friendly place",
  subhead: "Medical Clinic",
  body: "Help visitors find doctors, understand available services, and request an appointment without calling the front desk first.",
  badge: {
    enabled: true,
    label: "Appointments available",
    tone: "primary",
    placement: "above-headline",
  },
  primaryCta: { label: "Request appointment", href: "/contact#appointment-request" },
  secondaryCta: { label: "Meet the doctors", href: "/doctors" },
  media: {
    type: "image",
    source: "external",
    src: clinicHomeImage.src,
    alt: clinicHomeImage.alt,
    ratio: "4:3",
    overlay: "linear-gradient(90deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.34))",
  },
  layout: {
    align: "left",
    maxWidth: "2xl",
    contentWidth: "lg",
    height: "auto",
    bleed: "contained",
  },
  spacing: { paddingTop: "xl", paddingBottom: "xl" },
  style: {
    headlineSize: "4xl",
    bodySize: "lg",
    textColor: "#ffffff",
    subheadColor: "#dbeafe",
    bodyColor: "#f8fafc",
    borderWidth: "0",
    mediaRadius: "2xl",
    primaryButtonBg: "#2563eb",
    primaryButtonText: "#ffffff",
    secondaryButtonText: "#ffffff",
    secondaryButtonBorder: "rgba(255, 255, 255, 0.72)",
  },
};

const clinicStatsData = {
  header: {
    title: "Built for everyday clinic decisions",
    description: "Surface the signals patients look for before choosing a provider.",
  },
  items: [
    {
      id: "clinic-stat-1",
      value: "24h",
      label: "request response",
      description: "Set expectations for appointment follow-up.",
    },
    {
      id: "clinic-stat-2",
      value: "8",
      label: "specialties",
      description: "Show available care areas without a complex directory.",
    },
    {
      id: "clinic-stat-3",
      value: "3",
      label: "patient paths",
      description: "Primary care, specialist visit, and follow-up request.",
    },
  ],
  style: {
    alignment: "center",
    spacing: "md",
    valueSize: "lg",
    maxWidth: "xl",
  },
};

const clinicTestimonialsData = {
  header: {
    eyebrow: "Patient confidence",
    title: "Clear information before the first visit",
    description: "Use social proof to reduce uncertainty and guide visitors to the next step.",
  },
  testimonials: [
    {
      id: "clinic-testimonial-1",
      quote: "I could compare specialists and request a visit without waiting on the phone.",
      author: "Agnieszka Nowak",
      role: "Patient",
      rating: 5,
      sourceLabel: "Primary care",
    },
    {
      id: "clinic-testimonial-2",
      quote:
        "The clinic page made preparation simple: services, doctors, and contact details were clear.",
      author: "Marek Zielinski",
      role: "Patient",
      rating: 5,
      sourceLabel: "Specialist visit",
    },
    {
      id: "clinic-testimonial-3",
      quote:
        "A short appointment form helped the reception team call back with the right information.",
      author: "Ewa Kaminska",
      role: "Care coordinator",
      rating: 5,
      sourceLabel: "Clinic operations",
    },
  ],
};

const clinicCtaData = {
  content: {
    badge: "Plan a visit",
    title: "Ready to request an appointment?",
    description:
      "Send patient details and preferred timing so the clinic team can confirm availability.",
    showDescription: true,
  },
  actions: {
    primaryCta: {
      label: "Request appointment",
      href: "/contact#appointment-request",
      enabled: true,
      icon: "arrow-right",
    },
    secondaryCta: {
      label: "View doctors",
      href: "/doctors",
      enabled: true,
      icon: "chevron-right",
    },
  },
};

const salonHeroData = {
  headline: "Beauty treatments, spa packages, and easy booking requests",
  subhead: "Beauty Salon",
  body: "Give clients a clear path from treatment discovery to booking, with offers, gallery proof, and contact details in one polished site.",
  badge: {
    enabled: true,
    label: "New season treatments",
    tone: "primary",
    placement: "above-headline",
  },
  primaryCta: { label: "Book a visit", href: "/contact#beauty-booking" },
  secondaryCta: { label: "Explore offers", href: "/offers" },
  media: {
    type: "image",
    source: "external",
    src: salonHomeImage.src,
    alt: salonHomeImage.alt,
    ratio: "4:3",
    overlay: "linear-gradient(90deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.28))",
  },
  layout: {
    align: "left",
    maxWidth: "2xl",
    contentWidth: "lg",
    height: "auto",
    bleed: "contained",
  },
  spacing: { paddingTop: "xl", paddingBottom: "xl" },
  style: {
    headlineSize: "4xl",
    bodySize: "lg",
    textColor: "#ffffff",
    subheadColor: "#dbeafe",
    bodyColor: "#f8fafc",
    borderWidth: "0",
    mediaRadius: "2xl",
    primaryButtonBg: "#2563eb",
    primaryButtonText: "#ffffff",
    secondaryButtonText: "#ffffff",
    secondaryButtonBorder: "rgba(255, 255, 255, 0.72)",
  },
};

const salonGalleryData = {
  header: {
    title: "Treatment atmosphere and salon results",
    description: "Show clients what the visit feels like before they choose a treatment.",
  },
  items: [
    {
      id: "salon-gallery-1",
      image: salonHomeImage.src,
      alt: salonHomeImage.alt,
      caption: "Hair and style treatments",
    },
    {
      id: "salon-gallery-2",
      image: salonSkincareImage.src,
      alt: salonSkincareImage.alt,
      caption: "Skincare and facial care",
    },
    {
      id: "salon-gallery-3",
      image: salonMakeupImage.src,
      alt: salonMakeupImage.alt,
      caption: "Makeup and event styling",
    },
    {
      id: "salon-gallery-4",
      image: salonSpaImage.src,
      alt: salonSpaImage.alt,
      caption: "Relaxing spa rituals",
    },
    {
      id: "salon-gallery-5",
      image: salonNailsImage.src,
      alt: salonNailsImage.alt,
      caption: "Nails and finishing touches",
    },
  ],
  interaction: {
    mode: "none",
    zoom: "fit",
  },
  style: {
    ratio: "4:3",
    gap: "md",
    radius: "lg",
    overlay: "rgba(15, 23, 42, 0.35)",
    captionPosition: "inside",
    layoutDensity: "auto",
    motionPreset: "none",
  },
};

const salonPricingData = {
  header: {
    title: "Choose the treatment path that fits your day",
    description: "Starter packages for discovery, regular care, and a longer salon ritual.",
  },
  billingToggle: {
    enabled: false,
    monthlyLabel: "Visit",
    annualLabel: "Package",
    defaultCycle: "monthly",
  },
  plans: [
    {
      id: "salon-plan-1",
      name: "Refresh",
      price: "from $45",
      period: "/visit",
      badge: "Quick visit",
      features: [
        "Hair refresh or express manicure",
        "Consultation included",
        "Best for regular care",
      ],
      ctaLabel: "Book refresh",
      ctaHref: "/contact#beauty-booking",
      highlighted: false,
    },
    {
      id: "salon-plan-2",
      name: "Glow",
      price: "from $89",
      period: "/visit",
      badge: "Most booked",
      features: ["Facial or skincare treatment", "Product recommendation", "Relaxing finish"],
      ctaLabel: "Book glow",
      ctaHref: "/contact#beauty-booking",
      highlighted: true,
    },
    {
      id: "salon-plan-3",
      name: "Spa Ritual",
      price: "from $129",
      period: "/visit",
      badge: "Full care",
      features: ["Longer treatment session", "Beauty and wellness pairing", "Ideal before events"],
      ctaLabel: "Ask for availability",
      ctaHref: "/contact#beauty-booking",
      highlighted: false,
    },
  ],
  layout: {
    maxWidth: "default",
    typography: "balanced",
    footerNote: "Packages can be adjusted after the salon confirms treatment length.",
  },
};

const salonTestimonialsData = {
  header: {
    eyebrow: "Client stories",
    title: "A salon page that turns interest into bookings",
    description: "Use client voices to make the site feel trustworthy before the first visit.",
  },
  testimonials: [
    {
      id: "salon-testimonial-1",
      quote: "I found the treatment, checked the offer, and requested a booking in one visit.",
      author: "Natalia K.",
      role: "Skincare client",
      rating: 5,
      sourceLabel: "Facial treatment",
    },
    {
      id: "salon-testimonial-2",
      quote: "The gallery helped me choose the style before contacting the salon.",
      author: "Monika P.",
      role: "Hair styling client",
      rating: 5,
      sourceLabel: "Hair and makeup",
    },
    {
      id: "salon-testimonial-3",
      quote: "Clear packages made it easy to pick a spa ritual for a gift appointment.",
      author: "Karolina S.",
      role: "Spa client",
      rating: 5,
      sourceLabel: "Spa ritual",
    },
  ],
};

const salonOffersIntroData = {
  titleBlock: {
    eyebrow: "Offers",
    title: "Beauty and wellness packages ready to promote",
    headingLevel: 2,
  },
  body: {
    blocks: [
      {
        id: "salon-offers-copy",
        kind: "text",
        heading: "Help clients compare treatments before they book",
        headingLevel: 2,
        contentHtml:
          "<p>Use this page for seasonal promotions, signature treatments, and wellness bundles. Keep offer names clear, show what is included, and guide every visitor toward the booking form.</p>",
      },
      {
        id: "salon-offers-highlights",
        kind: "text",
        heading: "Recommended offer groups",
        headingLevel: 3,
        contentHtml:
          "<ul><li>Hair and style refresh packages</li><li>Facial and skincare treatments</li><li>Spa rituals and event preparation</li></ul>",
      },
    ],
  },
  options: {
    dropcap: false,
    toc: false,
    maxWidth: "lg",
    outputMode: "blocks",
  },
};

const menuNavigationBlock = (
  id: string,
  input: {
    logoText: string;
    ctaLabel: string;
    ctaHref: string;
    fallbackItems: Array<{ label: string; href: string }>;
  }
) =>
  block(
    id,
    "navigation",
    {
      logo: {
        type: "text",
        value: input.logoText,
        href: "/",
        source: "external",
      },
      items: input.fallbackItems,
      linksSource: "menu",
      cta: {
        label: input.ctaLabel,
        href: input.ctaHref,
      },
      behavior: {
        sticky: true,
        transparent: false,
        collapseOnScroll: false,
        mobileMode: "drawer",
        hideCtaOnMobile: false,
        activeLinkMode: "exact",
      },
      layout: {
        alignment: "right",
        maxWidth: "6xl",
        paddingY: "4",
        itemGap: "4",
      },
    },
    "with-cta"
  );

const starterFooterBlock = (
  id: string,
  input: {
    logoText: string;
    tagline: string;
    primaryLinks: Array<{ label: string; href: string }>;
    actionLinks: Array<{ label: string; href: string }>;
  }
) =>
  block(
    id,
    "footer",
    {
      brand: {
        logoText: input.logoText,
        tagline: input.tagline,
      },
      columns: [
        {
          title: "Explore",
          links: input.primaryLinks,
        },
        {
          title: "Next steps",
          links: input.actionLinks,
        },
      ],
      legal: {
        enabled: true,
        privacy: "/privacy",
        privacyLabel: "Privacy",
        terms: "/terms",
        termsLabel: "Terms",
      },
      socialEnabled: false,
      social: [],
    },
    "columns-2"
  );

const serviceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    durationMinutes: { type: "number" },
    priceFrom: { type: "string" },
    featured: { type: "boolean" },
  },
  required: ["title"],
};

const localServiceProjectSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    serviceType: { type: "string" },
    outcome: { type: "string" },
    featured: { type: "boolean" },
  },
  required: ["title"],
};

const doctorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    specialization: { type: "string" },
    yearsExperience: { type: "number" },
    shortBio: { type: "string" },
    acceptsOnlineBooking: { type: "boolean" },
  },
  required: ["title"],
};

const offerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    category: { type: "string" },
    durationMinutes: { type: "number" },
    price: { type: "string" },
    highlighted: { type: "boolean" },
  },
  required: ["title"],
};

const providerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    category: { type: "string" },
    city: { type: "string" },
    phone: { type: "string" },
    website: { type: "string" },
    rating: { type: "number" },
  },
  required: ["title"],
};

type SolutionKitCatalogSeed = Omit<SolutionKitDefinition, "manifest">;

const catalogSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    shortDescription: { type: "string" },
    category: { type: "string" },
    sku: { type: "string" },
    featured: { type: "boolean" },
  },
  required: ["title"],
};

const solutionKitsCatalogSeed: SolutionKitCatalogSeed[] = [
  {
    id: "automotive-workshop",
    title: "Automotive Workshop",
    shortDescription: "Booking-driven website for inspections, repairs, and service packages.",
    longDescription:
      "Designed for local auto workshops that need quick booking, trust signals, and service catalogs.",
    businessTypes: ["automotive_workshop"],
    defaultGoals: [
      "online_booking",
      "lead_generation",
      "reviews_social_proof",
      "collect_qualified_leads",
    ],
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "booking",
      "reviews",
    ],
    features: [
      "Service catalog blocks",
      "Booking-first homepage",
      "Trust/review layout sections",
      "Lead capture fallback form",
    ],
    resourceBlueprint: {
      pages: [
        {
          slug: "",
          title: "Home",
          status: "published",
          template: "service-home",
          data: pageData(
            [
              block("auto-hero", "hero"),
              block("auto-services", "feature-grid"),
              block("auto-proof", "testimonials"),
              block("auto-cta", "cta-banner"),
            ],
            { template: "service-home" }
          ),
          seo: {
            title: "Auto Workshop | Diagnostics and Repairs",
            description:
              "Book diagnostics and repairs online. Fast turnaround and trusted local mechanics.",
            robots: "index,follow",
          },
        },
        {
          slug: "services",
          title: "Services",
          status: "published",
          template: "service-list",
          data: pageData(
            [
              block("auto-services-intro", "rich-text-section"),
              block("auto-services-list", "content-list"),
            ],
            { template: "service-list" }
          ),
          seo: {
            title: "Workshop Services",
            description:
              "Inspect available diagnostic and repair packages for private and fleet vehicles.",
            robots: "index,follow",
          },
        },
        {
          slug: "contact",
          title: "Contact",
          status: "published",
          template: "contact-page",
          data: pageData([block("auto-contact", "contact"), block("auto-form", "form-embed")], {
            template: "contact-page",
          }),
          seo: {
            title: "Contact the Workshop",
            description: "Request service, ask for pricing, or schedule a diagnostic visit.",
            robots: "index,follow",
          },
        },
      ],
      forms: [
        {
          slug: "service-request",
          name: "Service Request",
          status: "published",
          description: "Collect vehicle and issue details before appointment.",
          successMessage: "Thanks. We will contact you shortly with next available slot.",
          submissionAccess: "public",
          settings: {
            layoutMode: "multi_step",
            saveProgress: true,
            stepTitles: ["Contact", "Vehicle", "Issue"],
            preset: "service_intake",
            automationRetry: {
              enabled: true,
              maxAttempts: 3,
              baseDelayMs: 300,
              maxDelayMs: 2000,
            },
          },
          fields: [
            { type: "text", label: "Full name", name: "full_name", required: true },
            { type: "email", label: "Email", name: "email", required: true },
            { type: "phone", label: "Phone", name: "phone", required: true },
            {
              type: "select",
              label: "Service type",
              name: "service_type",
              required: true,
              settings: {
                options: ["Diagnostics", "Maintenance", "Repair", "Other"],
              },
            },
            {
              type: "date",
              label: "Preferred date",
              name: "preferred_date",
              required: false,
            },
            {
              type: "textarea",
              label: "Issue description",
              name: "issue_description",
              required: true,
            },
          ],
        },
      ],
      contentTypes: [
        {
          slug: "service",
          name: "Service",
          schema: serviceSchema,
          taxonomy: {
            categories: terms("Diagnostics", "Repairs", "Maintenance"),
            tags: terms("Same day", "Fleet", "Warranty"),
          },
        },
      ],
      menus: [
        {
          location: "primary",
          name: "Primary",
          items: [
            { key: "home", label: "Home", pageSlug: "/" },
            { key: "services", label: "Services", pageSlug: "services" },
            { key: "contact", label: "Contact", pageSlug: "contact" },
            { key: "book", label: "Book now", href: "/contact#service-request" },
          ],
        },
        {
          location: "footer",
          name: "Footer",
          items: [
            { key: "footer-services", label: "Services", pageSlug: "services" },
            { key: "footer-contact", label: "Contact", pageSlug: "contact" },
            { key: "footer-privacy", label: "Privacy", href: "/privacy" },
          ],
        },
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
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "booking",
      "reviews",
    ],
    features: [
      "Doctor/team listing scaffolding",
      "Appointment funnel",
      "Patient trust sections",
      "Contact and location pages",
    ],
    resourceBlueprint: {
      pages: [
        {
          slug: "",
          title: "Home",
          status: "published",
          template: "clinic-home",
          data: pageData(
            [
              menuNavigationBlock("clinic-navigation", {
                logoText: "Medical Clinic",
                ctaLabel: "Book visit",
                ctaHref: "/contact#appointment-request",
                fallbackItems: [
                  { label: "Home", href: "/" },
                  { label: "Doctors", href: "/doctors" },
                  { label: "Contact", href: "/contact" },
                ],
              }),
              block("clinic-hero", "hero", clinicHeroData),
              block("clinic-kpi", "stats-kpi", clinicStatsData),
              block("clinic-testimonials", "testimonials", clinicTestimonialsData),
              block("clinic-cta", "cta-banner", clinicCtaData),
              starterFooterBlock("clinic-footer", {
                logoText: "Medical Clinic",
                tagline: "Appointments, doctors, and patient contact paths in one place.",
                primaryLinks: [
                  { label: "Doctors", href: "/doctors" },
                  { label: "Contact", href: "/contact" },
                ],
                actionLinks: [
                  { label: "Book visit", href: "/contact#appointment-request" },
                  { label: "Privacy", href: "/privacy" },
                ],
              }),
            ],
            { template: "clinic-home" }
          ),
          seo: {
            title: "Medical Clinic | Appointments and Care",
            description: "Book clinic appointments online and meet our specialist team.",
            robots: "index,follow",
          },
        },
        {
          slug: "doctors",
          title: "Doctors",
          status: "published",
          template: "team-list",
          data: pageData(
            [block("clinic-doctors-team", "team"), block("clinic-doctors-list", "content-list")],
            { template: "team-list" }
          ),
          seo: {
            title: "Doctors and Specialists",
            description: "Meet our clinic team and explore specialties.",
            robots: "index,follow",
          },
        },
        {
          slug: "contact",
          title: "Contact",
          status: "published",
          template: "contact-page",
          data: pageData(
            [
              block("clinic-contact", "contact"),
              block("appointment-request", "form-embed", {
                formId: "appointment-request",
                title: "Appointment Request",
                description:
                  "Share patient details and preferred visit timing with the clinic team.",
                submitLabel: "Request appointment",
                successMessage: "Request received. Our team will confirm your visit shortly.",
              }),
            ],
            {
              template: "contact-page",
            }
          ),
          seo: {
            title: "Clinic Contact",
            description: "Reach the clinic front desk and request appointment availability.",
            robots: "index,follow",
          },
        },
      ],
      forms: [
        {
          slug: "appointment-request",
          name: "Appointment Request",
          status: "published",
          description: "Collect intake details before confirming visit.",
          successMessage: "Request received. Our team will confirm your visit shortly.",
          submissionAccess: "public",
          settings: {
            layoutMode: "multi_step",
            saveProgress: true,
            stepTitles: ["Patient", "Visit", "Notes"],
            preset: "service_intake",
            automationRetry: {
              enabled: true,
              maxAttempts: 3,
              baseDelayMs: 300,
              maxDelayMs: 2000,
            },
          },
          fields: [
            { type: "text", label: "Patient name", name: "patient_name", required: true },
            { type: "email", label: "Email", name: "email", required: true },
            { type: "phone", label: "Phone", name: "phone", required: true },
            {
              type: "select",
              label: "Specialization",
              name: "specialization",
              required: true,
              settings: {
                options: ["Family medicine", "Pediatrics", "Dermatology", "Diagnostics"],
              },
            },
            { type: "date", label: "Preferred date", name: "preferred_date", required: false },
            { type: "textarea", label: "Reason for visit", name: "reason", required: false },
          ],
        },
      ],
      contentTypes: [
        {
          slug: "doctor",
          name: "Doctor",
          schema: doctorSchema,
          taxonomy: {
            categories: terms("Family Medicine", "Pediatrics", "Diagnostics"),
            tags: terms("Online booking", "New patients", "Second opinion"),
          },
        },
      ],
      menus: [
        {
          location: "primary",
          name: "Primary",
          items: [
            { key: "home", label: "Home", pageSlug: "/" },
            { key: "doctors", label: "Doctors", pageSlug: "doctors" },
            { key: "contact", label: "Contact", pageSlug: "contact" },
            { key: "book", label: "Book visit", href: "/contact#appointment-request" },
          ],
        },
        {
          location: "footer",
          name: "Footer",
          items: [
            { key: "footer-doctors", label: "Doctors", pageSlug: "doctors" },
            { key: "footer-contact", label: "Contact", pageSlug: "contact" },
            { key: "footer-privacy", label: "Privacy", href: "/privacy" },
          ],
        },
      ],
    },
  },
  {
    id: "beauty-salon",
    title: "Beauty Salon",
    shortDescription: "Conversion-focused salon website with services, offers, and booking flow.",
    longDescription:
      "For beauty and wellness brands that need a visual homepage with quick booking and promotions.",
    businessTypes: ["beauty_salon"],
    defaultGoals: ["online_booking", "lead_generation", "reviews_social_proof"],
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "booking",
      "reviews",
    ],
    features: [
      "Offer and package highlights",
      "Gallery-friendly sections",
      "Appointment request form",
      "Social proof placements",
    ],
    resourceBlueprint: {
      pages: [
        {
          slug: "",
          title: "Home",
          status: "published",
          template: "salon-home",
          data: pageData(
            [
              menuNavigationBlock("salon-navigation", {
                logoText: "Beauty Salon",
                ctaLabel: "Book now",
                ctaHref: "/contact#beauty-booking",
                fallbackItems: [
                  { label: "Home", href: "/" },
                  { label: "Offers", href: "/offers" },
                  { label: "Contact", href: "/contact" },
                ],
              }),
              block("salon-hero", "hero", salonHeroData),
              block("salon-gallery", "gallery-mosaic", salonGalleryData),
              block("salon-pricing", "pricing-plans", salonPricingData),
              block("salon-proof", "testimonials", salonTestimonialsData),
              starterFooterBlock("salon-footer", {
                logoText: "Beauty Salon",
                tagline: "Treatments, offers, booking, and salon contact in one place.",
                primaryLinks: [
                  { label: "Offers", href: "/offers" },
                  { label: "Contact", href: "/contact" },
                ],
                actionLinks: [
                  { label: "Book now", href: "/contact#beauty-booking" },
                  { label: "Privacy", href: "/privacy" },
                ],
              }),
            ],
            { template: "salon-home" }
          ),
          seo: {
            title: "Beauty Salon | Treatments and Booking",
            description: "Explore treatments, packages, and available appointment times.",
            robots: "index,follow",
          },
        },
        {
          slug: "offers",
          title: "Offers",
          status: "published",
          template: "offers-list",
          data: pageData(
            [
              block("salon-offers-intro", "rich-text-section", salonOffersIntroData),
              block("salon-offers-list", "content-list"),
            ],
            { template: "offers-list" }
          ),
          seo: {
            title: "Salon Offers",
            description: "View current beauty and wellness offers available this month.",
            robots: "index,follow",
          },
        },
        {
          slug: "contact",
          title: "Contact",
          status: "published",
          template: "contact-page",
          data: pageData(
            [
              block("salon-contact", "contact"),
              block("beauty-booking", "form-embed", {
                formId: "beauty-booking",
                title: "Beauty Booking",
                description: "Pick a treatment and request a preferred salon appointment slot.",
                submitLabel: "Request booking",
                successMessage: "Thanks. We will confirm your beauty appointment shortly.",
              }),
            ],
            {
              template: "contact-page",
            }
          ),
          seo: {
            title: "Book Salon Visit",
            description: "Contact the salon team and request your preferred appointment slot.",
            robots: "index,follow",
          },
        },
      ],
      forms: [
        {
          slug: "beauty-booking",
          name: "Beauty Booking",
          status: "published",
          description: "Collect treatment and timing preferences from visitors.",
          successMessage: "Thanks. We will confirm your beauty appointment shortly.",
          submissionAccess: "public",
          settings: {
            layoutMode: "multi_step",
            saveProgress: true,
            stepTitles: ["Contact", "Treatment", "Schedule"],
            preset: "service_intake",
            automationRetry: {
              enabled: true,
              maxAttempts: 3,
              baseDelayMs: 300,
              maxDelayMs: 2000,
            },
          },
          fields: [
            { type: "text", label: "Full name", name: "full_name", required: true },
            { type: "email", label: "Email", name: "email", required: true },
            { type: "phone", label: "Phone", name: "phone", required: true },
            {
              type: "select",
              label: "Treatment",
              name: "treatment",
              required: true,
              settings: {
                options: ["Hair", "Nails", "Skincare", "Makeup", "Spa"],
              },
            },
            { type: "date", label: "Preferred date", name: "preferred_date", required: false },
            { type: "textarea", label: "Additional notes", name: "notes", required: false },
          ],
        },
      ],
      contentTypes: [
        {
          slug: "offer",
          name: "Offer",
          schema: offerSchema,
          taxonomy: {
            categories: terms("Hair", "Nails", "Skincare", "Spa"),
            tags: terms("New", "Popular", "Limited"),
          },
        },
      ],
      menus: [
        {
          location: "primary",
          name: "Primary",
          items: [
            { key: "home", label: "Home", pageSlug: "/" },
            { key: "offers", label: "Offers", pageSlug: "offers" },
            { key: "contact", label: "Contact", pageSlug: "contact" },
            { key: "book", label: "Book now", href: "/contact#beauty-booking" },
          ],
        },
        {
          location: "footer",
          name: "Footer",
          items: [
            { key: "footer-offers", label: "Offers", pageSlug: "offers" },
            { key: "footer-contact", label: "Contact", pageSlug: "contact" },
            { key: "footer-privacy", label: "Privacy", href: "/privacy" },
          ],
        },
      ],
    },
  },
  {
    id: "local-service-business",
    title: "Local Service Business",
    shortDescription:
      "Generic single-business service website with offer, proof, FAQ, and contact.",
    longDescription:
      "For local service providers that need a complete public site rather than an aggregator or marketplace directory.",
    businessTypes: ["custom"],
    defaultGoals: ["lead_generation", "reviews_social_proof", "collect_qualified_leads"],
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "reviews",
    ],
    features: [
      "Offer and services pages",
      "Portfolio/proof sections",
      "FAQ and about pages",
      "Public contact and inquiry form",
    ],
    resourceBlueprint: {
      pages: [
        {
          slug: "",
          title: "Home",
          status: "published",
          template: "local-service-home",
          data: pageData(
            [
              block("local-service-hero", "hero", {
                headline: "Local service website ready for real inquiries",
                subhead:
                  "Present services, proof, answers, and contact paths in one launch-ready public site.",
                primaryCta: { label: "Request service", href: "/contact" },
                secondaryCta: { label: "View services", href: "/services" },
              }),
              block("local-service-offer", "feature-grid", {
                header: {
                  eyebrow: "Service paths",
                  title: "Everything visitors need before they contact you",
                  description:
                    "A practical starter homepage for local providers with services, proof, FAQ, and lead capture.",
                },
                items: [
                  {
                    id: "services",
                    icon: "S",
                    title: "Clear service offer",
                    description: "Show core services, packages, pricing cues, and request paths.",
                    ctaLabel: "View services",
                    ctaHref: "/services",
                  },
                  {
                    id: "proof",
                    icon: "P",
                    title: "Proof and completed work",
                    description:
                      "Highlight outcomes, reviews, and examples that reduce hesitation.",
                    ctaLabel: "See portfolio",
                    ctaHref: "/portfolio",
                  },
                  {
                    id: "faq",
                    icon: "?",
                    title: "Answers before inquiry",
                    description:
                      "Handle timing, process, and preparation questions before contact.",
                    ctaLabel: "Read FAQ",
                    ctaHref: "/faq",
                  },
                ],
              }),
              block("local-service-proof", "testimonials"),
              block("local-service-faq-preview", "faq-accordion"),
              block("local-service-cta", "cta-banner", {
                content: {
                  badge: "Ready for inquiries",
                  title: "Make the next step obvious",
                  description:
                    "Send visitors to a focused contact path once they understand your offer.",
                },
                actions: {
                  primaryCta: {
                    label: "Contact us",
                    href: "/contact",
                    enabled: true,
                    icon: "arrow-right",
                  },
                  secondaryCta: {
                    label: "Review FAQ",
                    href: "/faq",
                    enabled: true,
                    icon: "chevron-right",
                  },
                },
              }),
            ],
            { template: "local-service-home" }
          ),
          seo: {
            title: "Local Service Business",
            description:
              "Practical service website with offer, proof, FAQ, and an easy contact path.",
            robots: "index,follow",
          },
        },
        {
          slug: "services",
          title: "Services",
          status: "published",
          template: "local-service-services",
          data: pageData(
            [
              block("local-service-services-intro", "rich-text-section"),
              block("local-service-services-list", "content-list"),
            ],
            { template: "local-service-services" }
          ),
          seo: {
            title: "Services",
            description:
              "Review the main services, packages, and request paths for this local business.",
            robots: "index,follow",
          },
        },
        {
          slug: "portfolio",
          title: "Portfolio",
          status: "published",
          template: "local-service-portfolio",
          data: pageData(
            [
              block("local-service-portfolio-intro", "rich-text-section"),
              block("local-service-portfolio-list", "content-list"),
            ],
            { template: "local-service-portfolio" }
          ),
          seo: {
            title: "Portfolio",
            description:
              "Selected work, outcomes, and examples that show how this service business helps clients.",
            robots: "index,follow",
          },
        },
        {
          slug: "testimonials",
          title: "Testimonials",
          status: "published",
          template: "local-service-testimonials",
          data: pageData([block("local-service-testimonials", "testimonials")], {
            template: "local-service-testimonials",
          }),
          seo: {
            title: "Testimonials",
            description:
              "Trust signals, customer feedback, and service proof for this local business.",
            robots: "index,follow",
          },
        },
        {
          slug: "faq",
          title: "FAQ",
          status: "published",
          template: "local-service-faq",
          data: pageData([block("local-service-faq", "faq-accordion")], {
            template: "local-service-faq",
          }),
          seo: {
            title: "FAQ",
            description:
              "Answers to common questions about services, pricing, timing, and contact.",
            robots: "index,follow",
          },
        },
        {
          slug: "about",
          title: "About",
          status: "published",
          template: "local-service-about",
          data: pageData(
            [
              block("local-service-about-copy", "rich-text-section"),
              block("local-service-process", "feature-grid"),
            ],
            { template: "local-service-about" }
          ),
          seo: {
            title: "About",
            description: "Business story, service approach, and process for this local provider.",
            robots: "index,follow",
          },
        },
        {
          slug: "contact",
          title: "Contact",
          status: "published",
          template: "local-service-contact",
          data: pageData(
            [
              block("local-service-contact", "contact", {
                form: {
                  submission: {
                    mode: "forms-runtime",
                    formId: "service-inquiry",
                    fieldMap: {
                      name: "name",
                      email: "email",
                      phone: "phone",
                      message: "message",
                    },
                    successMessage: "Thanks. We will contact you shortly.",
                    errorMessage: "Unable to send your request. Please try again.",
                  },
                },
              }),
              block("local-service-form", "form-embed", {
                formId: "service-inquiry",
                title: "Request a service quote",
                description: "Share a few details and the team will follow up with availability.",
                submitLabel: "Send request",
                successMessage: "Thanks. We will contact you shortly.",
              }),
            ],
            { template: "local-service-contact" }
          ),
          seo: {
            title: "Contact",
            description:
              "Contact this local service provider, request a quote, or ask for availability.",
            robots: "index,follow",
          },
        },
      ],
      forms: [
        {
          slug: "service-inquiry",
          name: "Service Inquiry",
          status: "published",
          description: "Collect qualified inquiries for a local service business.",
          successMessage: "Thanks. We will contact you shortly.",
          submissionAccess: "public",
          settings: {
            layoutMode: "single",
            saveProgress: false,
            stepTitles: [],
            preset: "lead_capture",
            automationRetry: {
              enabled: true,
              maxAttempts: 2,
              baseDelayMs: 300,
              maxDelayMs: 1600,
            },
          },
          fields: [
            { type: "text", label: "Name", name: "name", required: true },
            { type: "email", label: "Email", name: "email", required: true },
            { type: "phone", label: "Phone", name: "phone", required: false },
            {
              type: "select",
              label: "Request type",
              name: "request_type",
              required: true,
              settings: {
                options: ["Service question", "Quote request", "Availability", "Other"],
              },
            },
            { type: "textarea", label: "Message", name: "message", required: true },
          ],
        },
      ],
      contentTypes: [
        {
          slug: "service-offer",
          name: "Service Offer",
          schema: serviceSchema,
          taxonomy: {
            categories: terms("Inspection", "Repair", "Maintenance", "Consulting"),
            tags: terms("Featured", "Fast turnaround", "Local"),
          },
        },
        {
          slug: "service-project",
          name: "Service Project",
          schema: localServiceProjectSchema,
          taxonomy: {
            categories: terms("Before and after", "Repair", "Maintenance", "Consulting"),
            tags: terms("Featured", "Customer story", "Local proof"),
          },
        },
      ],
      menus: [
        {
          location: "primary",
          name: "Primary Navigation",
          items: [
            { key: "home", label: "Home", href: "/" },
            { key: "services", label: "Services", pageSlug: "services" },
            { key: "portfolio", label: "Portfolio", pageSlug: "portfolio" },
            { key: "testimonials", label: "Testimonials", pageSlug: "testimonials" },
            { key: "faq", label: "FAQ", pageSlug: "faq" },
            { key: "about", label: "About", pageSlug: "about" },
            { key: "contact", label: "Contact", pageSlug: "contact" },
          ],
        },
        {
          location: "footer",
          name: "Footer Navigation",
          items: [
            { key: "footer-home", label: "Home", href: "/" },
            { key: "footer-services", label: "Services", pageSlug: "services" },
            { key: "footer-faq", label: "FAQ", pageSlug: "faq" },
            { key: "footer-contact", label: "Contact", pageSlug: "contact" },
            { key: "footer-privacy", label: "Privacy", href: "/privacy" },
          ],
        },
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
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "filters",
      "search",
    ],
    features: [
      "Directory listing page scaffolding",
      "Filter/search module presets",
      "Provider detail template placeholders",
      "Lead capture for inquiries",
    ],
    resourceBlueprint: {
      pages: [
        {
          slug: "",
          title: "Home",
          status: "published",
          template: "directory-home",
          data: pageData(
            [
              block("directory-hero", "hero"),
              block("directory-kpi", "stats-kpi"),
              block("directory-search", "search-box"),
              block("directory-categories", "feature-grid"),
            ],
            { template: "directory-home" }
          ),
          seo: {
            title: "Local Services Directory",
            description: "Discover trusted providers and compare local services by category.",
            robots: "index,follow",
          },
        },
        {
          slug: "directory",
          title: "Directory",
          status: "published",
          template: "directory-list",
          data: pageData(
            [
              block("directory-filters", "listing-filters"),
              block("directory-listing", "content-list"),
            ],
            { template: "directory-list" }
          ),
          seo: {
            title: "Browse Providers",
            description: "Use filters to find the right provider for your city and category.",
            robots: "index,follow",
          },
        },
        {
          slug: "submit",
          title: "Submit",
          status: "draft",
          template: "directory-submit",
          data: pageData([block("directory-submit-form", "form-embed")], {
            showInNav: false,
            template: "directory-submit",
          }),
          seo: {
            title: "Submit Provider",
            description: "Send your provider details for directory review.",
            robots: "noindex,nofollow",
          },
        },
      ],
      forms: [
        {
          slug: "directory-inquiry",
          name: "Directory Inquiry",
          status: "published",
          description: "Collect qualified inquiries sent to directory operators.",
          successMessage: "Inquiry submitted. We will forward your request.",
          submissionAccess: "public",
          settings: {
            layoutMode: "single",
            saveProgress: false,
            stepTitles: [],
            preset: "lead_capture",
            automationRetry: {
              enabled: true,
              maxAttempts: 2,
              baseDelayMs: 300,
              maxDelayMs: 1600,
            },
          },
          fields: [
            { type: "text", label: "Name", name: "name", required: true },
            { type: "email", label: "Email", name: "email", required: true },
            {
              type: "select",
              label: "Service category",
              name: "service_category",
              required: true,
              settings: {
                options: ["Home", "Auto", "Health", "Legal", "Education"],
              },
            },
            { type: "textarea", label: "Inquiry", name: "inquiry", required: true },
          ],
        },
      ],
      contentTypes: [
        {
          slug: "provider",
          name: "Provider",
          schema: providerSchema,
          taxonomy: {
            categories: terms("Home", "Automotive", "Health", "Legal"),
            tags: terms("Verified", "24/7", "Featured"),
          },
        },
      ],
      menus: [
        {
          location: "primary",
          name: "Primary",
          items: [
            { key: "home", label: "Home", pageSlug: "/" },
            { key: "directory", label: "Directory", pageSlug: "directory" },
            { key: "submit", label: "Submit listing", pageSlug: "submit" },
            { key: "contact", label: "Contact", href: "/contact" },
          ],
        },
        {
          location: "footer",
          name: "Footer",
          items: [
            { key: "footer-directory", label: "Directory", pageSlug: "directory" },
            { key: "footer-submit", label: "Submit", pageSlug: "submit" },
            { key: "footer-terms", label: "Terms", href: "/terms" },
          ],
        },
      ],
    },
  },
  {
    id: "small-ecommerce",
    title: "Small E-commerce",
    shortDescription: "Catalog and conversion-ready storefront starter with product-focused pages.",
    longDescription:
      "For teams that need quick catalog launch with product showcases and conversion pages.",
    businessTypes: ["small_ecommerce"],
    defaultGoals: ["sell_products", "catalog_showcase", "reviews_social_proof"],
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "filters",
      "commerce",
      "reviews",
    ],
    features: [
      "Product showcase page scaffolding",
      "Compare/table widget-ready structure",
      "Conversion-focused CTA sections",
      "Optional lead form for custom orders",
    ],
    resourceBlueprint: {
      pages: [
        {
          slug: "",
          title: "Home",
          status: "published",
          template: "store-home",
          data: pageData(
            [
              block("store-hero", "hero"),
              block("store-featured", "product-gallery"),
              block("store-trust", "logo-cloud"),
              block("store-cta", "cta-banner"),
            ],
            { template: "store-home" }
          ),
          seo: {
            title: "Storefront | Featured Products",
            description: "Browse featured products and discover current offers.",
            robots: "index,follow",
          },
        },
        {
          slug: "catalog",
          title: "Catalog",
          status: "published",
          template: "catalog-page",
          data: pageData(
            [block("store-gallery", "product-gallery"), block("store-table", "product-table")],
            { template: "catalog-page" }
          ),
          seo: {
            title: "Product Catalog",
            description: "Explore the full catalog with quick product comparison.",
            robots: "index,follow",
          },
        },
        {
          slug: "contact",
          title: "Contact",
          status: "published",
          template: "contact-page",
          data: pageData(
            [block("store-contact", "contact"), block("store-order-form", "form-embed")],
            {
              template: "contact-page",
            }
          ),
          seo: {
            title: "Contact Sales",
            description: "Request product details, delivery info, or custom offers.",
            robots: "index,follow",
          },
        },
      ],
      forms: [
        {
          slug: "custom-order",
          name: "Custom Order",
          status: "published",
          description: "Collect custom order requests for manual follow-up.",
          successMessage: "Order request received. Our team will contact you soon.",
          submissionAccess: "public",
          settings: {
            layoutMode: "single",
            saveProgress: false,
            stepTitles: [],
            preset: "lead_capture",
            automationRetry: {
              enabled: true,
              maxAttempts: 2,
              baseDelayMs: 300,
              maxDelayMs: 1600,
            },
          },
          fields: [
            { type: "text", label: "Full name", name: "full_name", required: true },
            { type: "email", label: "Email", name: "email", required: true },
            { type: "phone", label: "Phone", name: "phone", required: false },
            {
              type: "text",
              label: "Product SKU",
              name: "product_sku",
              required: false,
            },
            {
              type: "textarea",
              label: "Order details",
              name: "order_details",
              required: true,
            },
          ],
        },
      ],
      contentTypes: [
        {
          slug: "catalog-page",
          name: "Catalog Page",
          schema: catalogSchema,
          taxonomy: {
            categories: terms("Featured", "New", "Accessories"),
            tags: terms("Best seller", "Promo", "Limited"),
          },
        },
      ],
      menus: [
        {
          location: "primary",
          name: "Primary",
          items: [
            { key: "home", label: "Home", pageSlug: "/" },
            { key: "catalog", label: "Catalog", pageSlug: "catalog" },
            { key: "contact", label: "Contact", pageSlug: "contact" },
            { key: "wishlist", label: "Wishlist", href: "/wishlist" },
          ],
        },
        {
          location: "footer",
          name: "Footer",
          items: [
            { key: "footer-catalog", label: "Catalog", pageSlug: "catalog" },
            { key: "footer-contact", label: "Contact", pageSlug: "contact" },
            { key: "footer-policy", label: "Shipping policy", href: "/shipping" },
          ],
        },
      ],
    },
  },
];

const toDefinition = (kit: SolutionKitCatalogSeed): SolutionKitDefinition => ({
  ...kit,
  manifest: buildSolutionKitManifest({
    ...kit,
    businessTypes: [...kit.businessTypes],
    recommendedModules: [...kit.recommendedModules],
  }),
});

export const solutionKitsCatalog: SolutionKitDefinition[] =
  solutionKitsCatalogSeed.map(toDefinition);

const byId = new Map(solutionKitsCatalog.map((kit) => [kit.id, kit]));

export const listSolutionKitsCatalog = () => solutionKitsCatalog;

export const getSolutionKitFromCatalog = (id: SolutionKitId) => byId.get(id) ?? null;

export const businessTypeMatchesKit = (
  kit: SolutionKitDefinition,
  businessType: SiteBuilderBusinessType
) => (businessType === "custom" ? false : kit.businessTypes.includes(businessType));

export const goalMatchesKit = (kit: SolutionKitDefinition, goal: SiteBuilderGoal) =>
  kit.defaultGoals.includes(goal);
