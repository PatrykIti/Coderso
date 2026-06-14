import type {
  SolutionKitDefinition,
  SolutionKitMenuItemBlueprint,
  SolutionKitResourceBlueprint,
} from "../kits/solutionKitTypes";
import {
  createPageBlockV2,
  createPageSectionV2,
  normalizeStoredPageDocumentV2ForRead,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionType,
  type PageSectionV2,
  type PageSectionVariant,
} from "../pages/pageDocumentV2";
import type {
  AssistantSiteBuilderAdvancedHeroVariantFacts,
  AssistantSiteBuilderAdvancedMenuBehaviorId,
  AssistantSiteBuilderAdvancedSectionVariantFacts,
  AssistantSiteBuilderDesignPresetId,
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderNavigationMobileMode,
  AssistantSiteBuilderNavigationVariantId,
  AssistantSiteBuilderPageRoleId,
} from "./assistantSiteBuilderIntakeTypes";

export type AssistantSiteKitAdvancedMenuRuntimeOverride = {
  behaviorIds: AssistantSiteBuilderAdvancedMenuBehaviorId[];
  variantId: AssistantSiteBuilderNavigationVariantId;
  sticky: boolean;
  collapseOnScroll: boolean;
  transparent: boolean;
  mobileMode: AssistantSiteBuilderNavigationMobileMode;
  ctaTargetPageRole: AssistantSiteBuilderPageRoleId | null;
};

export type AssistantSiteKitAdvancedHeroRuntimeOverride = Pick<
  AssistantSiteBuilderAdvancedHeroVariantFacts,
  "variantId" | "widgetType" | "widgetVariantId" | "module" | "alias"
>;

export type AssistantSiteKitAdvancedSectionRuntimeOverride = Pick<
  AssistantSiteBuilderAdvancedSectionVariantFacts,
  "variantId" | "sectionRoleId" | "alias" | "widgetType" | "widgetVariantId" | "module"
>;

export type AssistantSiteKitAdvancedRuntimeOverrides = {
  schemaVersion: 1;
  designPresetId?: AssistantSiteBuilderDesignPresetId | null;
  menu?: AssistantSiteKitAdvancedMenuRuntimeOverride;
  hero?: AssistantSiteKitAdvancedHeroRuntimeOverride;
  sectionVariants?: AssistantSiteKitAdvancedSectionRuntimeOverride[];
};

type RuntimeCtaTarget = {
  label: string;
  href: string;
  pageSlug: string | null;
};

const pageRoleFallbackPaths: Record<AssistantSiteBuilderPageRoleId, string> = {
  home: "/",
  about: "/about",
  services: "/services",
  products: "/products",
  portfolio: "/portfolio",
  "case-studies": "/case-studies",
  pricing: "/pricing",
  testimonials: "/testimonials",
  blog: "/blog",
  faq: "/faq",
  team: "/team",
  locations: "/locations",
  contact: "/contact",
  legal: "/privacy",
};

const pageRoleFallbackLabels: Record<AssistantSiteBuilderPageRoleId, string> = {
  home: "Home",
  about: "About",
  services: "Services",
  products: "Products",
  portfolio: "Portfolio",
  "case-studies": "Case studies",
  pricing: "Pricing",
  testimonials: "Testimonials",
  blog: "Blog",
  faq: "FAQ",
  team: "Team",
  locations: "Locations",
  contact: "Contact",
  legal: "Privacy",
};

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLead = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLead.length > 1 && withLead.endsWith("/") ? withLead.slice(0, -1) : withLead;
};

const normalizeSlugPath = (value: string) => normalizePath(value).replace(/^\/+/, "");

const slugMatchesPath = (slug: string, path: string) => {
  const normalizedSlug = normalizePath(slug);
  const normalizedPath = normalizePath(path);
  return normalizedSlug === normalizedPath || normalizePath(`/${slug}`) === normalizedPath;
};

const readPageDocument = (page: SolutionKitResourceBlueprint["pages"][number]) => {
  const document = normalizeStoredPageDocumentV2ForRead(page.data);
  page.data = document as unknown as Record<string, unknown>;
  return document;
};

const sectionTypeByLegacyWidget: Record<string, PageSectionType> = {
  navigation: "navigation",
  hero: "hero",
  testimonials: "testimonials",
  "faq-accordion": "faq",
  "cta-banner": "cta",
  contact: "lead-form",
  "form-embed": "lead-form",
  "feature-grid": "feature-grid",
  "content-list": "collection",
  "listing-filters": "filters",
};

const normalizeSectionVariant = (variantId: string): PageSectionVariant => {
  if (variantId === "centered") return "centered";
  if (
    variantId === "split" ||
    variantId === "media-left" ||
    variantId === "form-left" ||
    variantId === "form-right"
  ) {
    return "split";
  }
  if (variantId === "cards" || variantId === "spotlight") return "cards";
  if (variantId === "grid" || variantId === "two-column") return "grid";
  if (variantId === "list" || variantId === "single-column" || variantId === "standard") {
    return "default";
  }
  if (variantId === "simple" || variantId === "with-cta") return "horizontal";
  return "default";
};

const findFirstSection = (document: PageDocumentV2, type: PageSectionType) =>
  document.sections.find((section) => section.type === type) ?? null;

const patchFirstMatchingSectionVariant = (
  pages: SolutionKitResourceBlueprint["pages"],
  widgetType: string,
  widgetVariantId: string
) => {
  const sectionType = sectionTypeByLegacyWidget[widgetType];
  if (!sectionType) return false;
  for (const page of pages) {
    const document = readPageDocument(page);
    const target = findFirstSection(document, sectionType);
    if (!target) continue;
    target.variant = normalizeSectionVariant(widgetVariantId);
    return true;
  }
  return false;
};

const menuItemToListItem = (item: SolutionKitMenuItemBlueprint) => ({
  label: item.label,
  href: item.href ? normalizePath(item.href) : normalizePath(item.pageSlug ?? "/"),
});

const buildNavigationBlocks = (
  kit: SolutionKitDefinition,
  cta: RuntimeCtaTarget | null
): PageBlockV2[] => {
  const menu = kit.resourceBlueprint.menus.find((candidate) => candidate.location === "primary");
  const items = (menu?.items ?? []).map(menuItemToListItem);
  const blocks: PageBlockV2[] = [
    createPageBlockV2("list", {
      id: "assistant-advanced-navigation-links",
      props: { items, ordered: false },
    }),
  ];
  if (cta) {
    blocks.push(
      createPageBlockV2("button", {
        id: "assistant-advanced-navigation-cta",
        props: {
          label: cta.label,
          href: cta.href,
          target: "self",
          variant: "primary",
          size: "md",
        },
      })
    );
  }
  if (items.length === 0 && !cta) {
    blocks.unshift(
      createPageBlockV2("heading", {
        id: "assistant-advanced-navigation-brand",
        props: { text: kit.title, level: "h2", align: "left" },
      })
    );
  }
  return blocks;
};

const upsertNavigationSection = (
  document: PageDocumentV2,
  section: PageSectionV2 | null,
  blocks: PageBlockV2[],
  variant: PageSectionVariant
) => {
  if (section) {
    section.variant = variant;
    section.blocks = blocks;
    return;
  }
  document.sections.unshift(
    createPageSectionV2("navigation", {
      id: "sec_assistant_advanced_navigation",
      name: "Navigation",
      variant,
      blocks,
    })
  );
};

const resolveCtaTarget = (
  blueprint: SolutionKitResourceBlueprint,
  role: AssistantSiteBuilderPageRoleId
): RuntimeCtaTarget => {
  const fallbackPath = pageRoleFallbackPaths[role];
  const page = blueprint.pages.find((candidate) => slugMatchesPath(candidate.slug, fallbackPath));
  const existingItem = blueprint.menus
    .flatMap((menu) => menu.items ?? [])
    .find((item) => {
      if (item.pageSlug && slugMatchesPath(item.pageSlug, fallbackPath)) return true;
      if (item.href && normalizePath(item.href) === fallbackPath) return true;
      return false;
    });
  const label = existingItem?.label?.trim() || page?.title?.trim() || pageRoleFallbackLabels[role];
  const href = page ? normalizePath(page.slug) : fallbackPath;
  return {
    label,
    href,
    pageSlug: page ? normalizeSlugPath(page.slug) : null,
  };
};

const applyCtaTargetOverride = (
  blueprint: SolutionKitResourceBlueprint,
  role: AssistantSiteBuilderPageRoleId | null | undefined
): RuntimeCtaTarget | null => {
  if (!role) return null;
  const cta = resolveCtaTarget(blueprint, role);
  let primaryMenu = blueprint.menus.find((menu) => menu.location === "primary");
  if (!primaryMenu) {
    primaryMenu = { location: "primary", name: "Primary", items: [] };
    blueprint.menus.push(primaryMenu);
  }

  const items = [...(primaryMenu.items ?? [])].filter(
    (item) => item.key !== "assistant-advanced-cta"
  );
  const orderIndex = Math.max(-1, ...items.map((item, index) => item.orderIndex ?? index)) + 1;
  const ctaItem: SolutionKitMenuItemBlueprint = {
    key: "assistant-advanced-cta",
    label: cta.label,
    ...(cta.pageSlug !== null ? { pageSlug: cta.pageSlug } : { href: cta.href }),
    orderIndex,
  };
  primaryMenu.items = [...items, ctaItem];
  return cta;
};

const applyNavigationWidgetOverride = (
  kit: SolutionKitDefinition,
  menu: AssistantSiteKitAdvancedMenuRuntimeOverride | undefined,
  cta: RuntimeCtaTarget | null
) => {
  if (!menu) return;
  for (const page of kit.resourceBlueprint.pages) {
    const document = readPageDocument(page);
    const existing = findFirstSection(document, "navigation");
    upsertNavigationSection(
      document,
      existing,
      buildNavigationBlocks(kit, cta),
      normalizeSectionVariant(menu.variantId)
    );
  }
};

export const buildAdvancedRuntimeOverridesFromIntakeFacts = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteKitAdvancedRuntimeOverrides | undefined => {
  const layout = facts.advancedLayout;
  if (!layout && !facts.designPresetId) return undefined;

  const overrides: AssistantSiteKitAdvancedRuntimeOverrides = {
    schemaVersion: 1,
  };
  if (facts.designPresetId) overrides.designPresetId = facts.designPresetId;
  if (layout?.menu) {
    overrides.menu = {
      behaviorIds: [...layout.menu.behaviorIds],
      variantId: layout.menu.variantId,
      sticky: layout.menu.sticky,
      collapseOnScroll: layout.menu.collapseOnScroll,
      transparent: layout.menu.transparent,
      mobileMode: layout.menu.mobileMode,
      ctaTargetPageRole: layout.menu.ctaTargetPageRole,
    };
  }
  if (layout?.hero) {
    overrides.hero = {
      variantId: layout.hero.variantId,
      widgetType: layout.hero.widgetType,
      widgetVariantId: layout.hero.widgetVariantId,
      module: layout.hero.module,
      alias: layout.hero.alias,
    };
  }
  if (layout?.sectionVariants?.length) {
    overrides.sectionVariants = layout.sectionVariants.map((variant) => ({
      variantId: variant.variantId,
      sectionRoleId: variant.sectionRoleId,
      alias: variant.alias,
      widgetType: variant.widgetType,
      widgetVariantId: variant.widgetVariantId,
      module: variant.module,
    }));
  }
  return overrides;
};

export const cloneAdvancedRuntimeOverrides = (
  overrides: AssistantSiteKitAdvancedRuntimeOverrides | undefined
) =>
  overrides ? (structuredClone(overrides) as AssistantSiteKitAdvancedRuntimeOverrides) : undefined;

export const applyAdvancedRuntimeOverridesToKit = (
  kit: SolutionKitDefinition,
  overrides: AssistantSiteKitAdvancedRuntimeOverrides | undefined
): SolutionKitDefinition => {
  if (!overrides) return kit;
  const cta = applyCtaTargetOverride(
    kit.resourceBlueprint,
    overrides.menu?.ctaTargetPageRole ?? null
  );
  applyNavigationWidgetOverride(kit, overrides.menu, cta);
  if (overrides.hero) {
    patchFirstMatchingSectionVariant(
      kit.resourceBlueprint.pages,
      overrides.hero.widgetType,
      overrides.hero.widgetVariantId
    );
  }
  for (const variant of overrides.sectionVariants ?? []) {
    patchFirstMatchingSectionVariant(
      kit.resourceBlueprint.pages,
      variant.widgetType,
      variant.widgetVariantId
    );
  }
  return kit;
};
