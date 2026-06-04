import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";
import { buildCatalogFamilyPlan } from "./catalogFamilyBlueprint";
import { PORTFOLIO_PROJECTS_PRESET, SERVICES_DIRECTORY_PRESET } from "./catalogFamilyPresets";
import { buildLeadCaptureSitePlan } from "./leadCaptureBlueprint";

const primaryMenuId = "menu-full-service-primary";
const footerMenuId = "menu-full-service-footer";

const pageMap = [
  {
    role: "home",
    label: "Start",
    slug: "/",
    title: "Studio Forma",
    body: "Kompletna pracownia architektury: strategia, koncepcja, projekt wykonawczy i nadzor autorski.",
  },
  {
    role: "services",
    label: "Uslugi",
    slug: "/uslugi",
    title: "Uslugi architektoniczne",
    body: "Zobacz uporzadkowany katalog uslug od koncepcji po wsparcie przy realizacji.",
  },
  {
    role: "portfolio",
    label: "Portfolio",
    slug: "/portfolio",
    title: "Portfolio realizacji",
    body: "Poznaj wybrane projekty mieszkalne, komercyjne i wnetrzarskie.",
  },
  {
    role: "about",
    label: "O nas",
    slug: "/o-nas",
    title: "O Studio Forma",
    body: "Laczymy estetyke, funkcje i prowadzenie procesu, aby inwestor wiedzial, co dzieje sie na kazdym etapie.",
  },
  {
    role: "process",
    label: "Proces",
    slug: "/proces",
    title: "Proces wspolpracy",
    body: "Diagnoza potrzeb, koncepcja, dokumentacja, koordynacja i wsparcie przy decyzjach wykonawczych.",
  },
  {
    role: "proof",
    label: "Referencje",
    slug: "/referencje",
    title: "Referencje i efekty",
    body: "Historie klientow, mierzalne rezultaty i opinie potwierdzajace sposob pracy pracowni.",
  },
  {
    role: "contact",
    label: "Kontakt",
    slug: "/kontakt",
    title: "Kontakt i wycena",
    body: "Opisz projekt, a wrocimy z rekomendowanymi kolejnymi krokami.",
  },
] as const;

const supportingPageActions = (): AssistantPlannedAction[] =>
  pageMap
    .filter((page) => !["services", "portfolio", "contact"].includes(page.role))
    .map((page) => ({
      id: `page-full-service-${page.role}`,
      type: "page.upsert" as const,
      title: `Create ${page.label} page`,
      description: `Publish the full-service ${page.label.toLowerCase()} page.`,
      input: {
        title: page.title,
        slug: page.slug,
        status: "published",
        introTitle: page.title,
        introBody: page.body,
      },
    }));

const leadCaptureActions = () => {
  const leadPlan = buildLeadCaptureSitePlan({ promptKind: "setup_request" });
  return leadPlan.actions;
};

const serviceSamples = (): AssistantPlannedAction[] =>
  [
    {
      title: "Projekt koncepcyjny",
      slug: "projekt-koncepcyjny",
      summary: "Uklad funkcjonalny, nastroj materialowy i decyzje kierunkowe przed dokumentacja.",
      serviceType: "Koncepcja",
      location: "Warszawa",
      responseTimeHours: 24,
      priceFrom: 4500,
    },
    {
      title: "Projekt wykonawczy",
      slug: "projekt-wykonawczy",
      summary: "Dokumentacja, detale i koordynacja branzowa przygotowana pod realizacje.",
      serviceType: "Dokumentacja",
      location: "Cala Polska",
      responseTimeHours: 48,
      priceFrom: 12000,
    },
    {
      title: "Nadzor autorski",
      slug: "nadzor-autorski",
      summary: "Wsparcie na budowie, decyzje materialowe i kontrola zgodnosci z projektem.",
      serviceType: "Realizacja",
      location: "Mazowieckie",
      responseTimeHours: 24,
      priceFrom: 3000,
    },
  ].map((sample) => ({
    id: `entry-sample-service-${sample.slug}`,
    type: "entry.sample.create" as const,
    title: `Publish ${sample.title}`,
    description: "Create a published service sample entry for the public services catalog.",
    input: {
      contentTypeSlug: SERVICES_DIRECTORY_PRESET.contentTypeSlug,
      title: sample.title,
      slug: sample.slug,
      status: "published",
      values: {
        title: sample.title,
        slug: sample.slug,
        summary: sample.summary,
        description: `${sample.summary} Ten zakres porzadkuje decyzje inwestora i daje zespolowi jasne kryteria realizacji.`,
        serviceType: sample.serviceType,
        responseTimeHours: sample.responseTimeHours,
        priceFrom: sample.priceFrom,
        location: sample.location,
        projectStatus: "featured",
      },
      seo: {
        title: `${sample.title} | Studio Forma`,
        description: sample.summary,
        canonicalUrl: `/uslugi/${sample.slug}`,
        robots: "index,follow",
      },
    },
  }));

const portfolioSamples = (): AssistantPlannedAction[] =>
  [
    {
      title: "Apartament nad parkiem",
      slug: "apartament-nad-parkiem",
      summary: "Przebudowa mieszkania z jasna strefa dzienna i zabudowa stolarska.",
      clientName: "Inwestor prywatny",
      deliveryYear: 2025,
      serviceType: "Wnetrza",
      location: "Warszawa",
    },
    {
      title: "Dom w lesie",
      slug: "dom-w-lesie",
      summary: "Koncepcja domu jednorodzinnego z tarasem wpisanym w naturalna skarpe.",
      clientName: "Rodzina 2+2",
      deliveryYear: 2024,
      serviceType: "Dom jednorodzinny",
      location: "Podkowa Lesna",
    },
    {
      title: "Biuro z pracownia",
      slug: "biuro-z-pracownia",
      summary: "Elastyczne biuro z sala warsztatowa, akustyka i spojna identyfikacja.",
      clientName: "Firma uslugowa",
      deliveryYear: 2026,
      serviceType: "Komercja",
      location: "Krakow",
    },
  ].map((sample) => ({
    id: `entry-sample-portfolio-${sample.slug}`,
    type: "entry.sample.create" as const,
    title: `Publish ${sample.title}`,
    description: "Create a published portfolio sample entry for the public portfolio catalog.",
    input: {
      contentTypeSlug: PORTFOLIO_PROJECTS_PRESET.contentTypeSlug,
      title: sample.title,
      slug: sample.slug,
      status: "published",
      values: {
        title: sample.title,
        slug: sample.slug,
        summary: sample.summary,
        description: `${sample.summary} Projekt pokazuje, jak pracownia laczy funkcje, material i prowadzenie procesu.`,
        resultSummary: "Spojny projekt gotowy do realizacji i latwiejsza koordynacja wykonawcza.",
        testimonialQuote: "Proces byl czytelny, a decyzje projektowe dobrze uzasadnione.",
        clientName: sample.clientName,
        deliveryYear: sample.deliveryYear,
        serviceType: sample.serviceType,
        location: sample.location,
        projectStatus: "featured",
      },
      seo: {
        title: `${sample.title} | Portfolio Studio Forma`,
        description: sample.summary,
        canonicalUrl: `/portfolio/${sample.slug}`,
        robots: "index,follow",
      },
    },
  }));

const menuActions = (): AssistantPlannedAction[] => [
  {
    id: primaryMenuId,
    type: "menu.upsert" as const,
    title: "Create primary navigation",
    description: "Create or update the published primary navigation menu.",
    input: {
      name: "Primary navigation",
      location: "primary",
      status: "published",
    },
  },
  {
    id: footerMenuId,
    type: "menu.upsert" as const,
    title: "Create footer navigation",
    description: "Create or update the published footer navigation menu.",
    input: {
      name: "Footer navigation",
      location: "footer",
      status: "published",
    },
  },
  ...pageMap.flatMap((page, index) => [
    {
      id: `menu-primary-${page.role}`,
      type: "menu.item.upsert" as const,
      title: `Add ${page.label} to primary navigation`,
      description: `Link ${page.slug} from the primary navigation.`,
      input: {
        menuId: {
          kind: "action-result" as const,
          actionId: primaryMenuId,
          resourceType: "menu" as const,
          field: "id" as const,
        },
        label: page.label,
        href: page.slug,
        orderIndex: index,
      },
    },
    {
      id: `menu-footer-${page.role}`,
      type: "menu.item.upsert" as const,
      title: `Add ${page.label} to footer navigation`,
      description: `Link ${page.slug} from the footer navigation.`,
      input: {
        menuId: {
          kind: "action-result" as const,
          actionId: footerMenuId,
          resourceType: "menu" as const,
          field: "id" as const,
        },
        label: page.label,
        href: page.slug,
        orderIndex: index,
      },
    },
  ]),
];

const pageSeoActions = (): AssistantPlannedAction[] =>
  pageMap.map((page) => ({
    id: `seo-page-full-service-${page.role}`,
    type: "seo.document.upsert" as const,
    title: `Set SEO for ${page.label}`,
    description: `Create public SEO metadata for ${page.slug}.`,
    input: {
      targetType: "page",
      targetId: {
        kind: "stable-slug" as const,
        resourceType: "page" as const,
        slug: page.slug,
      },
      seo: {
        slug: page.slug,
        title: `${page.title} | Studio Forma`,
        description: page.body,
        canonicalUrl: page.slug,
        robots: "index,follow",
      },
    },
  }));

const launchReadinessMetadata = {
  schemaVersion: 1 as const,
  kind: "full-service-site" as const,
  requiredPages: pageMap.map((page) => page.slug),
  requiredCatalogs: [
    PORTFOLIO_PROJECTS_PRESET.contentTypeSlug,
    SERVICES_DIRECTORY_PRESET.contentTypeSlug,
  ],
  minimumPublishedEntries: {
    [PORTFOLIO_PROJECTS_PRESET.contentTypeSlug]: 3,
    [SERVICES_DIRECTORY_PRESET.contentTypeSlug]: 3,
  },
  checks: [
    {
      id: "pages",
      label: "Required public pages",
      status: "pending_execute" as const,
      evidence: pageMap.map((page) => page.slug),
      gates: [],
    },
    {
      id: "catalogs",
      label: "Services and portfolio catalogs",
      status: "pending_execute" as const,
      evidence: [
        PORTFOLIO_PROJECTS_PRESET.contentTypeSlug,
        SERVICES_DIRECTORY_PRESET.contentTypeSlug,
        "listing-query.upsert",
        "listing-template.upsert",
        "detail-page.upsert",
        "setting.content-route.upsert",
      ],
      gates: [],
    },
    {
      id: "public-content",
      label: "Published sample content",
      status: "pending_execute" as const,
      evidence: ["3 service entries", "3 portfolio entries"],
      gates: [],
    },
    {
      id: "navigation-footer",
      label: "Primary and footer navigation",
      status: "pending_execute" as const,
      evidence: ["primary menu", "footer menu", "14 menu links"],
      gates: [],
    },
    {
      id: "seo",
      label: "Main page and entry SEO",
      status: "pending_execute" as const,
      evidence: ["7 page SEO documents", "sample entry SEO metadata"],
      gates: [],
    },
    {
      id: "media",
      label: "Trusted media handling",
      status: "gated" as const,
      evidence: ["sample content avoids raw media fields"],
      gates: ["media_upload_gated"],
    },
  ],
};

export const buildFullServiceSitePlan = (options?: {
  promptKind?: AssistantPromptKind;
}): AssistantActionPlan => {
  const portfolio = buildCatalogFamilyPlan(PORTFOLIO_PROJECTS_PRESET, {
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "service_business_full_site",
  });
  const services = buildCatalogFamilyPlan(SERVICES_DIRECTORY_PRESET, {
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "service_business_full_site",
  });

  return normalizeAssistantActionPlan({
    id: "plan-service-business-full-site",
    status: "ready",
    intentId: "service-business-full-site",
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "service_business_full_site",
    title: "Full-Service Architecture Studio Site",
    answer:
      "I can create a full public service-business site with catalogs, sample content, navigation, footer, contact form, and SEO metadata.",
    summary:
      "Create a launch-shaped architecture studio site with services, portfolio, process, references, contact, public samples, navigation, footer, and SEO.",
    confidence: 0.9,
    metadata: {
      planner: "local",
      providerDraftUsed: false,
      launchReadiness: launchReadinessMetadata,
    },
    assumptions: [
      "Sample entries use local schema-valid content and avoid untrusted media fields.",
      "Primary and footer navigation are created as published menus before menu items are added.",
      "Public contact form uses the existing Forms runtime hardening.",
      "Raw media import remains gated until the user selects trusted media-library assets.",
    ],
    questions: [],
    actions: [
      ...portfolio.actions,
      ...services.actions,
      ...leadCaptureActions(),
      ...supportingPageActions(),
      ...serviceSamples(),
      ...portfolioSamples(),
      ...menuActions(),
      ...pageSeoActions(),
    ],
  });
};
