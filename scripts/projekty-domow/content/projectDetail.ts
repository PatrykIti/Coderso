import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import { normalizeContentRoutes } from "../../../core/services/settings/settingsContracts";
import type { JsonObject, PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import { HOUSE_PROJECT_RESOURCE_KEY } from "./constants";
import { PROJECT_LISTING_QUERY_KEY } from "./projectListing";
import { cleanJsonObject } from "../json";

export const PROJECT_DETAIL_KEY = "project-detail";
export const PROJECT_LIST_PATH = "/projekty";
export const PROJECT_DETAIL_PATH = "/projekty/:slug";

const CONTENT_ID = "00000000-0000-4000-8000-000000000547";
const DETAIL_ID = "00000000-0000-4000-8000-000000000548";
const QUERY_ID = "00000000-0000-4000-8000-000000000549";

const fullWidthLayout = {
  container: "full",
  padding: { top: "none", bottom: "none" },
  margin: { top: "none", bottom: "none" },
  background: { color: "transparent", image: null },
} as const;

const buildProjectDetailBlocks = () => [
  {
    id: "project-hero",
    type: "hero",
    variant: "centered",
    layout: fullWidthLayout,
    data: {
      headline: "",
      subhead: "Projekt domu dopasowany do codziennego rytmu",
      body: "",
      badge: {
        enabled: true,
        label: "Projekt FormaDom",
        tone: "primary",
        placement: "above-headline",
      },
      primaryCta: { label: "Porozmawiajmy o adaptacji", href: "/kontakt" },
      media: { type: "none", source: "external" },
      layout: {
        align: "left",
        maxWidth: "2xl",
        contentWidth: "xl",
        height: "large",
        bleed: "full-bleed",
      },
      spacing: { paddingTop: "2xl", paddingBottom: "2xl" },
      style: {
        textColor: "#f7fbff",
        subheadColor: "#8ee8ff",
        bodyColor: "#d9e5f2",
        headlineSize: "5xl",
        bodySize: "lg",
        borderWidth: "0",
        borderRadius: "none",
        primaryButtonBg: "#d8ff7a",
        primaryButtonText: "#07111f",
        primaryButtonBorder: "#d8ff7a",
        primaryButtonSize: "lg",
        cardShadow: "none",
        buttonShadow: "soft",
        fontFamily: "sans",
        headlineWeight: "bold",
        bodyWeight: "normal",
        motion: "slide-up",
        tilt: "none",
      },
      background: {
        color: "#07111f",
        gradient: "linear-gradient(135deg, #07111f, #163c4b)",
      },
      responsive: { hideMediaOnMobile: true },
    },
  },
  {
    id: "project-specifications",
    type: "stats-kpi",
    variant: "cards",
    data: {
      header: {
        title: "Najważniejsze parametry",
        description: "Czytelny punkt wyjścia do rozmowy o adaptacji projektu.",
      },
      items: [
        { id: "area", value: "0", suffix: " m²", label: "Powierzchnia", icon: "⌂" },
        {
          id: "storeys",
          value: "0",
          suffix: "kond.",
          label: "Kondygnacje",
          icon: "↕",
        },
        { id: "rooms", value: "0", suffix: "pok.", label: "Pokoje", icon: "▦" },
        {
          id: "energy",
          value: "—",
          suffix: "standard",
          label: "Klasa energii",
          icon: "◌",
        },
      ],
      style: {
        alignment: "start",
        spacing: "md",
        valueColor: "#f7fbff",
        labelColor: "#b9c9da",
        descriptionColor: "#8fa5bb",
        valueSize: "lg",
        divider: false,
        dividerIntensity: "soft",
        sectionBackground: "#0b1628",
        maxWidth: "xl",
        padding: "lg",
        minHeight: "compact",
        cardBackground: "#13233a",
        cardBorderColor: "#26384d",
        iconSize: "md",
        iconSurface: "#163c4b",
        iconBorderColor: "#2c6674",
      },
    },
  },
  {
    id: "project-gallery",
    type: "gallery-mosaic",
    variant: "feature-left",
    data: {
      header: {
        title: "Kierunek wizualny",
        description: "",
      },
      items: [
        { id: "project-view-main", caption: "Bryła od strony ogrodu", ratio: "16:9" },
        { id: "project-view-day", caption: "Strefa dzienna", ratio: "4:3" },
        { id: "project-view-night", caption: "Strefa prywatna", ratio: "4:3" },
        { id: "project-view-detail", caption: "Detal materiałowy", ratio: "4:3" },
      ],
      interaction: { mode: "none", zoom: "fit" },
      style: {
        ratio: "4:3",
        gap: "lg",
        radius: "xl",
        overlay: "rgba(7, 17, 31, 0.72)",
        captionPosition: "inside",
        layoutDensity: "balanced",
        motionPreset: "slide-up",
      },
    },
  },
  {
    id: "project-assumptions",
    type: "feature-grid",
    variant: "cards-3",
    data: {
      header: {
        eyebrow: "Założenia",
        title: "Rozwiązania wpisane w projekt",
        description: "Trzy decyzje, które porządkują układ i charakter domu.",
      },
      items: [
        { id: "assumption-1", icon: "01", title: "", description: "Założenie projektu" },
        { id: "assumption-2", icon: "02", title: "", description: "Założenie projektu" },
        { id: "assumption-3", icon: "03", title: "", description: "Założenie projektu" },
      ],
      style: {
        columns: "3",
        gap: "lg",
        surfaceColor: "#0b1628",
        sectionBackground: "#07111f",
        borderColor: "#26384d",
        borderWidth: "1",
        radius: "xl",
        textAlign: "left",
        cardPadding: "spacious",
        mediaSize: "md",
        cardLayout: "vertical",
        maxWidth: "6xl",
        headerSize: "lg",
        cardTitleSize: "lg",
        hoverEffect: "lift",
      },
    },
  },
  {
    id: "project-related",
    type: "content-list",
    variant: "cards",
    data: {
      source: {
        mode: "listing",
        listingQueryId: "detail-related-projects",
        listingTemplateId: "",
        contentTypeId: "",
        statusScope: "published",
        limit: 3,
        sort: "title-asc",
      },
      filters: {
        taxonomy: "",
        featuredOnly: false,
        searchQuery: "",
        authorId: "",
      },
      title: "Podobne projekty",
      description: "Porównaj inne układy i wybierz kierunek najbliższy Twoim potrzebom.",
      pagination: { mode: "none", pageSize: 3 },
      fields: { showImage: false, showExcerpt: true, showMeta: false, showCta: true },
      emptyState: {
        title: "Brak podobnych projektów",
        description: "Wkrótce pojawią się tutaj kolejne propozycje.",
      },
      style: {
        columns: "3",
        gap: "lg",
        cardStyle: "elevated",
        imageAspect: "wide",
        tagMode: "hidden",
        tagLimit: 2,
        ctaLabel: "Zobacz projekt",
        backgroundColor: "#07111f",
        borderColor: "#26384d",
        textColor: "#f7fbff",
      },
      resolved: {
        items: [],
        total: 0,
        sourceTypeId: "",
        sourceTypeSlug: HOUSE_PROJECT_RESOURCE_KEY,
        listPath: PROJECT_LIST_PATH,
        listingQueryId: "detail-related-projects",
        listingTemplateId: "",
        resolvedAt: "",
      },
    },
  },
];

const projectDetailBindings = [
  {
    id: "project-title",
    blockId: "project-hero",
    propPath: "headline",
    source: { kind: "entry-meta", field: "title" },
    required: true,
  },
  {
    id: "project-summary",
    blockId: "project-hero",
    propPath: "body",
    source: { kind: "entry-field", field: "summary" },
    required: true,
  },
  ...[
    ["area", "project-area", "project-specifications", "items.0.value"],
    ["storeys", "project-storeys", "project-specifications", "items.1.value"],
    ["rooms", "project-rooms", "project-specifications", "items.2.value"],
    ["energyClass", "project-energy", "project-specifications", "items.3.value"],
    ["visualLabel", "project-visual-label", "project-gallery", "header.description"],
    ["assumptions.0", "project-assumption-1", "project-assumptions", "items.0.title"],
    ["assumptions.1", "project-assumption-2", "project-assumptions", "items.1.title"],
    ["assumptions.2", "project-assumption-3", "project-assumptions", "items.2.title"],
  ].map(([field, id, blockId, propPath]) => ({
    id,
    blockId,
    propPath,
    source: { kind: "entry-field", field },
    transform: "text",
    required: true,
  })),
  {
    id: "project-related-items",
    blockId: "project-related",
    propPath: "resolved.items",
    source: { kind: "computed", resolver: "relatedItems" },
    required: true,
  },
] as const;

const assertRef: (
  value: unknown,
  expected: { ref: PackageRef["ref"]; key: string },
  code: string
) => asserts value is PackageRef = (value, expected, code) => {
  const record = value as Partial<PackageRef> | null;
  if (
    !record ||
    record.ref !== expected.ref ||
    record.key !== expected.key ||
    Object.keys(record).length !== 2
  ) {
    throw new Error(code);
  }
};

export const buildProjectDetailDesired = (
  contentTypeId: unknown,
  listingQueryId: unknown
): JsonObject => {
  assertRef(
    contentTypeId,
    { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY },
    "house_project_detail_content_ref_invalid"
  );
  assertRef(
    listingQueryId,
    { ref: "listing_query", key: PROJECT_LISTING_QUERY_KEY },
    "house_project_detail_query_ref_invalid"
  );
  const normalized = normalizeDetailPageDocument({
    schemaVersion: 1,
    id: DETAIL_ID,
    name: "Szczegóły projektu domu",
    contentTypeId: CONTENT_ID,
    contentTypeSlug: HOUSE_PROJECT_RESOURCE_KEY,
    status: "published",
    titlePattern: "{{ title }} — projekt domu",
    seo: { titlePattern: "{{ title }} — FormaDom", descriptionField: "summary" },
    settings: { template: "project-detail", layout: {} },
    blocks: buildProjectDetailBlocks(),
    bindings: projectDetailBindings,
    related: [
      {
        id: "related-projects",
        kind: "listing-query",
        label: "Podobne projekty",
        limit: 3,
        listingQueryId: QUERY_ID,
        excludeCurrentEntry: true,
      },
    ],
  });
  const { id: _nativeValidationId, ...withoutDatabaseId } = normalized;
  return cleanJsonObject({
    ...withoutDatabaseId,
    contentTypeId,
    related: withoutDatabaseId.related?.map((source) => ({
      ...source,
      listingQueryId,
    })),
  });
};

export const buildContentRouteSettingDesired = (detailPageId: unknown): JsonObject => {
  assertRef(
    detailPageId,
    { ref: "detail_page", key: PROJECT_DETAIL_KEY },
    "house_project_route_detail_ref_invalid"
  );
  const [normalized] = normalizeContentRoutes([
    {
      type: HOUSE_PROJECT_RESOURCE_KEY,
      listPath: PROJECT_LIST_PATH,
      detailPath: PROJECT_DETAIL_PATH,
      enabled: true,
      detailPageId: DETAIL_ID,
    },
  ]);
  if (!normalized) throw new Error("house_project_route_invalid");
  return cleanJsonObject({ value: [{ ...normalized, detailPageId }] });
};
