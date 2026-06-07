import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";
import type { RichTextSectionData } from "../../../widgets/core/richTextSection";
import { buildCatalogFamilyPlan } from "./catalogFamilyBlueprint";
import { PORTFOLIO_PROJECTS_PRESET, SERVICES_DIRECTORY_PRESET } from "./catalogFamilyPresets";
import {
  getCuratedMediaEvidence,
  getCuratedMediaAssetsForProfile,
  selectCuratedMediaProfile,
  type CuratedMediaAsset,
  type CuratedMediaProfileId,
  type CuratedMediaProfile,
  type CuratedMediaRole,
} from "../../media/curatedMediaProfiles";
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

type FullServicePage = (typeof pageMap)[number];
type PageUpsertBlocks = NonNullable<
  Extract<AssistantPlannedAction, { type: "page.upsert" }>["input"]["blocks"]
>;
type PageUpsertAction = Extract<AssistantPlannedAction, { type: "page.upsert" }>;

const navigationItems = pageMap.map((page) => ({
  label: page.label,
  href: page.slug,
}));

const buildNavigationBlock = (): PageUpsertBlocks[number] => ({
  id: "full-service-primary-navigation",
  type: "navigation",
  variant: "with-cta",
  data: {
    logo: {
      type: "text",
      value: "Studio Forma",
      href: "/",
      source: "external",
    },
    items: navigationItems,
    linksSource: "menu",
    cta: {
      label: "Kontakt",
      href: "/kontakt",
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
    style: {
      surfaceColor: "var(--color-bg)",
      borderColor: "var(--color-border)",
      linkUnderline: "none",
      shadow: "sm",
      backdropBlur: "sm",
      ctaBackgroundColor: "var(--color-primary)",
      ctaTextColor: "var(--color-bg)",
      ctaBorderColor: "transparent",
    },
  },
});

const buildFooterBlock = (): PageUpsertBlocks[number] => ({
  id: "full-service-footer",
  type: "footer",
  variant: "columns-3",
  data: {
    brand: {
      logoText: "Studio Forma",
      tagline: "Architektura, wnetrza i proces inwestycyjny prowadzone w jednym miejscu.",
    },
    columns: [
      {
        title: "Studio",
        links: navigationItems.slice(0, 4),
      },
      {
        title: "Oferta",
        links: [
          { label: "Uslugi", href: "/uslugi" },
          { label: "Portfolio", href: "/portfolio" },
          { label: "Proces", href: "/proces" },
        ],
      },
      {
        title: "Kontakt",
        links: [
          { label: "Kontakt i wycena", href: "/kontakt" },
          { label: "Referencje", href: "/referencje" },
        ],
      },
    ],
    legal: {
      enabled: false,
      copyright: "(c) 2026 Studio Forma",
      privacyLabel: "",
      termsLabel: "",
    },
    socialEnabled: false,
    layout: {
      align: "left",
      legalAlign: "right",
      maxWidth: "6xl",
      columnGap: "6",
      columnBreakpoint: "md",
      sectionPaddingY: "10",
    },
    style: {
      surfaceColor: "var(--color-surface)",
      textColor: "var(--color-text)",
      linkColor: "var(--color-text)",
      linkHoverColor: "var(--color-primary)",
      borderColor: "var(--color-border)",
    },
  },
});

const withSiteShellBlocks = (action: AssistantPlannedAction): AssistantPlannedAction => {
  if (action.type !== "page.upsert") return action;
  const blocks = action.input.blocks ?? [];
  const hasNavigation = blocks.some((block) => block.type === "navigation");
  const hasFooter = blocks.some((block) => block.type === "footer");
  const nextBlocks: PageUpsertBlocks = [
    ...(hasNavigation ? [] : [buildNavigationBlock()]),
    ...blocks,
    ...(hasFooter ? [] : [buildFooterBlock()]),
  ];

  return {
    ...action,
    input: {
      ...action.input,
      blocks: nextBlocks,
    },
  } satisfies PageUpsertAction;
};

const supportingPageDetails: Record<
  Extract<FullServicePage["role"], "home" | "about" | "process" | "proof">,
  { eyebrow: string; heading: string; content: string; mediaRole: CuratedMediaRole }
> = {
  home: {
    eyebrow: "Studio",
    heading: "Architektura prowadzona od decyzji do realizacji",
    content:
      "Studio Forma laczy koncepcje, dokumentacje, koordynacje i nadzor w jednym procesie, z czytelnymi etapami dla inwestora.",
    mediaRole: "home",
  },
  about: {
    eyebrow: "O pracowni",
    heading: "Zespol, ktory trzyma estetyke i proces w jednym rytmie",
    content:
      "Pracownia porzadkuje wymagania, budzet i decyzje materialowe, aby projekt byl spojny wizualnie i mozliwy do sprawnej realizacji.",
    mediaRole: "about",
  },
  process: {
    eyebrow: "Proces",
    heading: "Od diagnozy potrzeb do wsparcia przy wykonaniu",
    content:
      "Kazdy etap konczy sie konkretnym zakresem decyzji: briefem, koncepcja, dokumentacja, koordynacja i rekomendacjami wykonawczymi.",
    mediaRole: "process",
  },
  proof: {
    eyebrow: "Referencje",
    heading: "Rezultaty, ktore widac w gotowych przestrzeniach",
    content:
      "Historie klientow pokazuja, jak uporzadkowany proces skraca droge od pierwszej rozmowy do dopracowanej realizacji.",
    mediaRole: "proof",
  },
};

const defaultArchitectureProfilePrompt =
  "studio architektoniczne pracownia architektury architektura wnetrza portfolio";

const pickCuratedProfileImage = (
  mediaProfile: CuratedMediaProfile | null,
  role: CuratedMediaRole,
  index = 0
) => {
  if (!mediaProfile) return null;
  const assets = getCuratedMediaAssetsForProfile(mediaProfile.id, { kind: "image", role });
  if (assets.length === 0) return null;
  return assets[index % assets.length] ?? null;
};

const toCuratedCoverImageValues = (image: CuratedMediaAsset) => ({
  coverImageUrl: image.src,
  coverImageAlt: image.alt,
  coverImageSourceName: image.sourceName,
  coverImageSourceUrl: image.sourceUrl,
  coverImageLicenseName: image.licenseName,
  coverImageLicenseUrl: image.licenseUrl,
});

const buildSupportingPageBlocks = (
  page: FullServicePage,
  mediaProfile: CuratedMediaProfile | null
): PageUpsertBlocks => {
  const details =
    page.role === "home" ||
    page.role === "about" ||
    page.role === "process" ||
    page.role === "proof"
      ? supportingPageDetails[page.role]
      : null;
  if (!details) return [];
  const image = pickCuratedProfileImage(mediaProfile, details.mediaRole);
  const blocks: NonNullable<RichTextSectionData["body"]>["blocks"] = [
    {
      id: `full-service-${page.role}-copy`,
      kind: "text",
      heading: details.heading,
      content: `${page.body} ${details.content}`,
    },
  ];

  if (image) {
    blocks.push({
      id: `full-service-${page.role}-image`,
      kind: "image",
      src: image.src,
      alt: image.alt,
      caption: `${image.sourceName} media reference, ${image.licenseName}`,
      width: "wide",
      align: "center",
    });
  }

  return [
    {
      id: `full-service-${page.role}-intro`,
      type: "rich-text-section",
      variant: "single-column",
      data: {
        titleBlock: {
          eyebrow: details.eyebrow,
          title: page.title,
        },
        body: {
          html: "",
          blocks,
        },
        options: {
          outputMode: "blocks",
          maxWidth: "lg",
        },
      },
    },
  ];
};

const supportingPageActions = (
  mediaProfile: CuratedMediaProfile | null
): AssistantPlannedAction[] =>
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
        status: "published" as const,
        introTitle: page.title,
        introBody: page.body,
        blocks: buildSupportingPageBlocks(page, mediaProfile),
      },
    }))
    .map(withSiteShellBlocks);

const leadCaptureActions = () => {
  const leadPlan = buildLeadCaptureSitePlan({ promptKind: "setup_request" });
  return leadPlan.actions;
};

const serviceSamples = (mediaProfile: CuratedMediaProfile | null): AssistantPlannedAction[] =>
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
  ].map((sample, index) => {
    const image = pickCuratedProfileImage(mediaProfile, "service", index);
    return {
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
          ...(image ? toCuratedCoverImageValues(image) : {}),
        },
        seo: {
          title: `${sample.title} | Studio Forma`,
          description: sample.summary,
          canonicalUrl: `/uslugi/${sample.slug}`,
          robots: "index,follow",
        },
      },
    };
  });

const portfolioSamples = (mediaProfile: CuratedMediaProfile | null): AssistantPlannedAction[] =>
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
  ].map((sample, index) => {
    const image = pickCuratedProfileImage(mediaProfile, "portfolio", index);
    return {
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
          ...(image ? toCuratedCoverImageValues(image) : {}),
        },
        seo: {
          title: `${sample.title} | Portfolio Studio Forma`,
          description: sample.summary,
          canonicalUrl: `/portfolio/${sample.slug}`,
          robots: "index,follow",
        },
      },
    };
  });

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

const buildLaunchReadinessMetadata = (mediaProfileId: CuratedMediaProfileId | null) => ({
  schemaVersion: 1 as const,
  kind: "full-service-site" as const,
  requiredPages: pageMap.map((page) => page.slug),
  requiredCatalogs: [
    PORTFOLIO_PROJECTS_PRESET.contentTypeSlug,
    SERVICES_DIRECTORY_PRESET.contentTypeSlug,
  ],
  ...(mediaProfileId ? { requiredMediaPages: ["/", "/o-nas", "/proces", "/referencje"] } : {}),
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
    ...(mediaProfileId
      ? [
          {
            id: "media",
            label: "Curated media profile",
            status: "pending_execute" as const,
            evidence: getCuratedMediaEvidence(mediaProfileId),
            gates: [],
          },
        ]
      : []),
  ],
});

export const buildFullServiceSitePlan = (options?: {
  prompt?: string;
  promptKind?: AssistantPromptKind;
}): AssistantActionPlan => {
  const mediaProfile = selectCuratedMediaProfile({
    prompt: options?.prompt ?? defaultArchitectureProfilePrompt,
    intentFamily: "service_business_full_site",
  });
  const launchReadinessMetadata = buildLaunchReadinessMetadata(mediaProfile?.id ?? null);
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
      mediaProfile
        ? "Sample entries use local schema-valid content and curated media URL fields; media-library fields remain media asset ids."
        : "No curated media profile matched the prompt, so media-library fields remain empty instead of using unrelated stock media.",
      "Primary and footer navigation are created as published menus before menu items are added.",
      "Public contact form uses the existing Forms runtime hardening.",
      "Arbitrary raw media import remains gated until the user selects trusted media-library assets.",
    ],
    questions: [],
    actions: [
      ...portfolio.actions.map(withSiteShellBlocks),
      ...services.actions.map(withSiteShellBlocks),
      ...leadCaptureActions().map(withSiteShellBlocks),
      ...supportingPageActions(mediaProfile),
      ...serviceSamples(mediaProfile),
      ...portfolioSamples(mediaProfile),
      ...menuActions(),
      ...pageSeoActions(),
    ],
  });
};
