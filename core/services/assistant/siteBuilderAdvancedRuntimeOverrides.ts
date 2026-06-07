import type {
  SolutionKitDefinition,
  SolutionKitMenuItemBlueprint,
  SolutionKitResourceBlueprint,
} from "../kits/solutionKitTypes";
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const ensureBlocks = (pageData: Record<string, unknown>): Record<string, unknown>[] => {
  const blocks = Array.isArray(pageData.blocks)
    ? pageData.blocks.filter(isRecord).map((block) => block)
    : [];
  pageData.blocks = blocks;
  return blocks;
};

const findFirstBlock = (
  blocks: Record<string, unknown>[],
  type: string
): Record<string, unknown> | null => {
  for (const block of blocks) {
    if (block.type === type) return block;
    if (Array.isArray(block.children)) {
      const child = findFirstBlock(block.children.filter(isRecord), type);
      if (child) return child;
    }
    if (isRecord(block.slots)) {
      for (const slotBlocks of Object.values(block.slots)) {
        if (!Array.isArray(slotBlocks)) continue;
        const child = findFirstBlock(slotBlocks.filter(isRecord), type);
        if (child) return child;
      }
    }
  }
  return null;
};

const patchFirstMatchingBlockVariant = (
  pages: SolutionKitResourceBlueprint["pages"],
  widgetType: string,
  widgetVariantId: string
) => {
  for (const page of pages) {
    const pageData = isRecord(page.data) ? page.data : {};
    page.data = pageData;
    const target = findFirstBlock(ensureBlocks(pageData), widgetType);
    if (!target) continue;
    target.variant = widgetVariantId;
    return true;
  }
  return false;
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
    const pageData = isRecord(page.data) ? page.data : {};
    page.data = pageData;
    const blocks = ensureBlocks(pageData);
    const existing = findFirstBlock(blocks, "navigation");
    const navigationBlock =
      existing ??
      ({
        id: `assistant-advanced-navigation-${page.slug.trim() || "home"}`,
        type: "navigation",
        data: {},
      } satisfies Record<string, unknown>);
    const data = isRecord(navigationBlock.data) ? navigationBlock.data : {};
    navigationBlock.variant = menu.variantId;
    navigationBlock.data = {
      ...data,
      logo: {
        type: "text",
        value: kit.title,
        href: "/",
        source: "external",
      },
      linksSource: "menu",
      ...(cta ? { cta: { label: cta.label, href: cta.href } } : {}),
      behavior: {
        ...(isRecord(data.behavior) ? data.behavior : {}),
        sticky: menu.sticky,
        collapseOnScroll: menu.collapseOnScroll,
        transparent: menu.transparent,
        mobileMode: menu.mobileMode,
      },
    };
    if (!existing) blocks.unshift(navigationBlock);
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
    patchFirstMatchingBlockVariant(
      kit.resourceBlueprint.pages,
      overrides.hero.widgetType,
      overrides.hero.widgetVariantId
    );
  }
  for (const variant of overrides.sectionVariants ?? []) {
    patchFirstMatchingBlockVariant(
      kit.resourceBlueprint.pages,
      variant.widgetType,
      variant.widgetVariantId
    );
  }
  return kit;
};
