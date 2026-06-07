import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import {
  assistantSiteBuilderAdvancedHeroVariantIds,
  assistantSiteBuilderAdvancedMenuBehaviorIds,
  assistantSiteBuilderAdvancedSectionVariantIds,
  assistantSiteBuilderSectionRoleIds,
  type AssistantSiteBuilderAdvancedHeroVariantFacts,
  type AssistantSiteBuilderAdvancedHeroVariantId,
  type AssistantSiteBuilderAdvancedLayoutFacts,
  type AssistantSiteBuilderAdvancedLayoutGate,
  type AssistantSiteBuilderAdvancedMenuBehaviorId,
  type AssistantSiteBuilderAdvancedMenuFacts,
  type AssistantSiteBuilderAdvancedSectionVariantFacts,
  type AssistantSiteBuilderAdvancedSectionVariantId,
  type AssistantSiteBuilderIntakeOptionDefinition,
  type AssistantSiteBuilderNavigationMobileMode,
  type AssistantSiteBuilderNavigationVariantId,
  type AssistantSiteBuilderPageRoleId,
  type AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";
import { listWidgetPackMatrix } from "../../widgets/modulePackMatrix";
import { navigationVariantIds } from "../../widgets/core/navigationContract";

type AdvancedMenuBehaviorDefinition =
  AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderAdvancedMenuBehaviorId> & {
    structure?: AssistantSiteBuilderAdvancedMenuFacts["structure"];
    sticky?: boolean;
    transparent?: boolean;
    mobileMode?: AssistantSiteBuilderNavigationMobileMode;
  };

type AdvancedHeroVariantDefinition =
  AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderAdvancedHeroVariantId> & {
    widgetType: "hero";
    widgetVariantId: AssistantSiteBuilderAdvancedHeroVariantId;
    module: "content";
    alias: "hero";
    pagePresetIds: readonly string[];
    sectionPresetIds: readonly string[];
  };

type AdvancedSectionVariantDefinition =
  AssistantSiteBuilderIntakeOptionDefinition<AssistantSiteBuilderAdvancedSectionVariantId> & {
    sectionRoleId: AssistantSiteBuilderSectionRoleId;
    alias: string;
    widgetType: string;
    widgetVariantId: string;
    module: string;
    pagePresetIds: readonly string[];
    sectionPresetIds: readonly string[];
  };

type WidgetVariantRequirement = {
  widgetType: string;
  module: string;
  variantId: string;
};

type BuildAdvancedLayoutFactsInput = {
  menuBehaviorIds?: readonly AssistantSiteBuilderAdvancedMenuBehaviorId[];
  ctaTargetPageRole?: AssistantSiteBuilderPageRoleId | null;
  heroVariantId?: AssistantSiteBuilderAdvancedHeroVariantId | null;
  sectionVariantIds?: readonly AssistantSiteBuilderAdvancedSectionVariantId[];
  selectedSectionRoleIds?: readonly AssistantSiteBuilderSectionRoleId[];
  designSupportedSectionRoleIds?: readonly AssistantSiteBuilderSectionRoleId[];
};

const supportedWidgetVariantIdsByType: Readonly<Record<string, readonly string[]>> = Object.freeze({
  navigation: navigationVariantIds,
  hero: assistantSiteBuilderAdvancedHeroVariantIds,
  "content-list": ["cards", "list", "compact"],
  "posts-feed": ["cards", "list", "compact"],
  testimonials: ["grid", "spotlight", "slider-static"],
  "faq-accordion": ["single-column", "two-column", "compact"],
  "form-embed": ["standard"],
  contact: ["form-left", "form-right", "minimal"],
  "cta-banner": ["centered", "split", "with-badge"],
});

const secretLikeValuePattern =
  /\b(password|token|secret|api[-_\s]?key|authorization|cookie|bearer|csrf|session)\b/iu;

const freezeOptionDefinitions = <TDefinition extends AssistantSiteBuilderIntakeOptionDefinition>(
  definitions: readonly TDefinition[],
  registryName: string
): readonly TDefinition[] => {
  const expectedIds =
    registryName === "advancedMenuBehaviors"
      ? assistantSiteBuilderAdvancedMenuBehaviorIds
      : registryName === "advancedHeroVariants"
        ? assistantSiteBuilderAdvancedHeroVariantIds
        : assistantSiteBuilderAdvancedSectionVariantIds;
  const seenIds = new Set<string>();

  for (const definition of definitions) {
    if (seenIds.has(definition.id)) {
      throwAssistantSiteBuilderIntakeError("intake_registry_duplicate", {
        registryName,
        id: definition.id,
      });
    }
    seenIds.add(definition.id);

    if (!definition.label.trim() || !definition.description.trim()) {
      throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
        registryName,
        id: definition.id,
      });
    }
    if (JSON.stringify(definition).match(secretLikeValuePattern)) {
      throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
        registryName,
        id: definition.id,
        reason: "secret_like_value",
      });
    }
  }

  if (definitions.map((definition) => definition.id).join("|") !== [...expectedIds].join("|")) {
    throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
      registryName,
      reason: "id_order_mismatch",
    });
  }

  return Object.freeze(
    definitions.map((definition) =>
      Object.freeze({
        ...definition,
        ...("pagePresetIds" in definition
          ? { pagePresetIds: Object.freeze([...(definition.pagePresetIds as readonly string[])]) }
          : {}),
        ...("sectionPresetIds" in definition
          ? {
              sectionPresetIds: Object.freeze([
                ...(definition.sectionPresetIds as readonly string[]),
              ]),
            }
          : {}),
      })
    ) as TDefinition[]
  );
};

const assertWidgetVariantRequirement = (
  registryName: string,
  optionId: string,
  requirement: WidgetVariantRequirement
) => {
  const variantIds = supportedWidgetVariantIdsByType[requirement.widgetType];
  if (!variantIds?.includes(requirement.variantId)) {
    throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
      registryName,
      optionId,
      widgetType: requirement.widgetType,
      variantId: requirement.variantId,
    });
  }
};

const assertSectionRole = (
  registryName: string,
  optionId: string,
  sectionRoleId: AssistantSiteBuilderSectionRoleId
) => {
  if (!assistantSiteBuilderSectionRoleIds.includes(sectionRoleId)) {
    throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
      registryName,
      optionId,
      sectionRoleId,
    });
  }
};

const findAssistantPageSectionMapping = (alias: string) => {
  for (const pack of listWidgetPackMatrix()) {
    const mapping = pack.assistantPageSections?.find((section) => section.alias === alias);
    if (mapping) return { pack, mapping };
  }
  return null;
};

const assertPackBackedSectionVariant = (definition: AdvancedSectionVariantDefinition) => {
  assertSectionRole("advancedSectionVariants", definition.id, definition.sectionRoleId);
  assertWidgetVariantRequirement("advancedSectionVariants", definition.id, {
    widgetType: definition.widgetType,
    module: definition.module,
    variantId: definition.widgetVariantId,
  });

  const packMapping = findAssistantPageSectionMapping(definition.alias);
  if (
    !packMapping ||
    packMapping.pack.module !== definition.module ||
    packMapping.mapping.widgetType !== definition.widgetType
  ) {
    throwAssistantSiteBuilderIntakeError("intake_registry_invalid", {
      registryName: "advancedSectionVariants",
      optionId: definition.id,
      alias: definition.alias,
      widgetType: definition.widgetType,
    });
  }
};

const toOptionDefinitions = <TId extends string>(
  definitions: readonly AssistantSiteBuilderIntakeOptionDefinition<TId>[]
): readonly AssistantSiteBuilderIntakeOptionDefinition<TId>[] =>
  Object.freeze(
    definitions.map((definition) =>
      Object.freeze({
        id: definition.id,
        label: definition.label,
        description: definition.description,
      })
    )
  );

const advancedMenuBehaviorDefinitions = freezeOptionDefinitions(
  [
    {
      id: "single-level",
      label: "Single level",
      description: "Prefer one visible navigation level and avoid nested groups unless reviewed.",
      structure: "single-level",
    },
    {
      id: "grouped",
      label: "Grouped",
      description: "Allow reviewed child groups for broader sites with many related pages.",
      structure: "grouped",
    },
    {
      id: "sticky",
      label: "Sticky",
      description: "Use the existing navigation sticky behavior.",
      sticky: true,
    },
    {
      id: "transparent",
      label: "Transparent",
      description: "Use transparent navigation surface over a compatible hero.",
      transparent: true,
    },
    {
      id: "nontransparent",
      label: "Solid surface",
      description: "Use the normal nontransparent navigation surface.",
      transparent: false,
    },
    {
      id: "mobile-drawer",
      label: "Mobile drawer",
      description: "Use the existing mobile drawer behavior for small screens.",
      mobileMode: "drawer",
    },
  ] as const satisfies readonly AdvancedMenuBehaviorDefinition[],
  "advancedMenuBehaviors"
);

const advancedHeroVariantDefinitions = freezeOptionDefinitions(
  [
    {
      id: "centered",
      label: "Centered",
      description: "Centered hero variant from the existing Hero widget.",
      widgetType: "hero",
      widgetVariantId: "centered",
      module: "content",
      alias: "hero",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:hero-benefits"],
    },
    {
      id: "split",
      label: "Media right",
      description: "Split hero variant with media to the right.",
      widgetType: "hero",
      widgetVariantId: "split",
      module: "content",
      alias: "hero",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:hero-benefits"],
    },
    {
      id: "media-left",
      label: "Media left",
      description: "Hero variant with media on the left.",
      widgetType: "hero",
      widgetVariantId: "media-left",
      module: "content",
      alias: "hero",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:hero-benefits"],
    },
    {
      id: "media-center",
      label: "Media center",
      description: "Hero variant with central media emphasis.",
      widgetType: "hero",
      widgetVariantId: "media-center",
      module: "content",
      alias: "hero",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:hero-benefits"],
    },
  ] as const satisfies readonly AdvancedHeroVariantDefinition[],
  "advancedHeroVariants"
);

const advancedSectionVariantDefinitions = freezeOptionDefinitions(
  [
    {
      id: "featured-items-cards",
      label: "Featured cards",
      description: "Card list section for featured services, products, projects, or posts.",
      sectionRoleId: "featured-items",
      alias: "content-list",
      widgetType: "content-list",
      widgetVariantId: "cards",
      module: "listings",
      pagePresetIds: ["listings:directory-index"],
      sectionPresetIds: ["listings:teaser-stack"],
    },
    {
      id: "featured-items-list",
      label: "Featured list",
      description: "One-column list section for featured entries or offers.",
      sectionRoleId: "featured-items",
      alias: "content-list",
      widgetType: "content-list",
      widgetVariantId: "list",
      module: "listings",
      pagePresetIds: ["listings:directory-index"],
      sectionPresetIds: ["listings:teaser-stack"],
    },
    {
      id: "services-overview-cards",
      label: "Services cards",
      description: "Card list section for service categories or offer groups.",
      sectionRoleId: "services-overview",
      alias: "content-list",
      widgetType: "content-list",
      widgetVariantId: "cards",
      module: "listings",
      pagePresetIds: ["listings:directory-index"],
      sectionPresetIds: ["listings:teaser-stack"],
    },
    {
      id: "proof-grid",
      label: "Proof grid",
      description: "Grid variant from the Testimonials widget for social proof.",
      sectionRoleId: "proof",
      alias: "testimonials",
      widgetType: "testimonials",
      widgetVariantId: "grid",
      module: "engagement",
      pagePresetIds: ["engagement:trust-loop"],
      sectionPresetIds: ["engagement:testimonials-cta"],
    },
    {
      id: "proof-spotlight",
      label: "Proof spotlight",
      description: "Spotlight variant from the Testimonials widget.",
      sectionRoleId: "proof",
      alias: "testimonials",
      widgetType: "testimonials",
      widgetVariantId: "spotlight",
      module: "engagement",
      pagePresetIds: ["engagement:trust-loop"],
      sectionPresetIds: ["engagement:testimonials-cta"],
    },
    {
      id: "faq-single-column",
      label: "FAQ single column",
      description: "Single-column FAQ Accordion variant.",
      sectionRoleId: "faq",
      alias: "faq",
      widgetType: "faq-accordion",
      widgetVariantId: "single-column",
      module: "engagement",
      pagePresetIds: ["engagement:trust-loop"],
      sectionPresetIds: ["engagement:faq-proof"],
    },
    {
      id: "faq-two-column",
      label: "FAQ two column",
      description: "Two-column FAQ Accordion variant for denser FAQ sections.",
      sectionRoleId: "faq",
      alias: "faq",
      widgetType: "faq-accordion",
      widgetVariantId: "two-column",
      module: "engagement",
      pagePresetIds: ["engagement:trust-loop"],
      sectionPresetIds: ["engagement:faq-proof"],
    },
    {
      id: "lead-capture-standard",
      label: "Lead form",
      description: "Standard Form Embed section for inquiry, booking, newsletter, or quote flows.",
      sectionRoleId: "lead-capture",
      alias: "form-embed",
      widgetType: "form-embed",
      widgetVariantId: "standard",
      module: "forms",
      pagePresetIds: ["forms:lead-capture"],
      sectionPresetIds: ["forms:intake-inline"],
    },
    {
      id: "contact-form-left",
      label: "Contact form left",
      description: "Contact widget variant with form content on the left.",
      sectionRoleId: "contact",
      alias: "contact",
      widgetType: "contact",
      widgetVariantId: "form-left",
      module: "forms",
      pagePresetIds: ["forms:lead-capture"],
      sectionPresetIds: ["forms:contact-split"],
    },
    {
      id: "contact-form-right",
      label: "Contact form right",
      description: "Contact widget variant with form content on the right.",
      sectionRoleId: "contact",
      alias: "contact",
      widgetType: "contact",
      widgetVariantId: "form-right",
      module: "forms",
      pagePresetIds: ["forms:lead-capture"],
      sectionPresetIds: ["forms:contact-split"],
    },
    {
      id: "content-feed-cards",
      label: "Content feed cards",
      description: "Posts Feed card variant for updates or resources.",
      sectionRoleId: "content-feed",
      alias: "posts-feed",
      widgetType: "posts-feed",
      widgetVariantId: "cards",
      module: "listings",
      pagePresetIds: ["listings:directory-index"],
      sectionPresetIds: ["listings:teaser-stack"],
    },
    {
      id: "content-feed-list",
      label: "Content feed list",
      description: "Posts Feed list variant for editorial or resource flows.",
      sectionRoleId: "content-feed",
      alias: "posts-feed",
      widgetType: "posts-feed",
      widgetVariantId: "list",
      module: "listings",
      pagePresetIds: ["listings:directory-index"],
      sectionPresetIds: ["listings:teaser-stack"],
    },
    {
      id: "call-to-action-centered",
      label: "CTA centered",
      description: "Centered CTA Banner variant.",
      sectionRoleId: "call-to-action",
      alias: "cta",
      widgetType: "cta-banner",
      widgetVariantId: "centered",
      module: "content",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:proof-cta"],
    },
    {
      id: "call-to-action-split",
      label: "CTA split",
      description: "Split CTA Banner variant.",
      sectionRoleId: "call-to-action",
      alias: "cta",
      widgetType: "cta-banner",
      widgetVariantId: "split",
      module: "content",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:proof-cta"],
    },
  ] as const satisfies readonly AdvancedSectionVariantDefinition[],
  "advancedSectionVariants"
);

for (const definition of advancedHeroVariantDefinitions) {
  assertWidgetVariantRequirement("advancedHeroVariants", definition.id, {
    widgetType: definition.widgetType,
    module: definition.module,
    variantId: definition.widgetVariantId,
  });
}

for (const definition of advancedSectionVariantDefinitions) {
  assertPackBackedSectionVariant(definition);
}

const advancedMenuBehaviorDefinitionsById = new Map(
  advancedMenuBehaviorDefinitions.map((definition) => [definition.id, definition])
);
const advancedHeroVariantDefinitionsById = new Map(
  advancedHeroVariantDefinitions.map((definition) => [definition.id, definition])
);
const advancedSectionVariantDefinitionsById = new Map(
  advancedSectionVariantDefinitions.map((definition) => [definition.id, definition])
);

export const siteBuilderIntakeAdvancedMenuBehaviorOptionDefinitions = toOptionDefinitions(
  advancedMenuBehaviorDefinitions
);

export const siteBuilderIntakeAdvancedHeroVariantOptionDefinitions = toOptionDefinitions(
  advancedHeroVariantDefinitions
);

export const siteBuilderIntakeAdvancedSectionVariantOptionDefinitions = toOptionDefinitions(
  advancedSectionVariantDefinitions
);

export const listSiteBuilderIntakeAdvancedMenuBehaviors = () => advancedMenuBehaviorDefinitions;

export const listSiteBuilderIntakeAdvancedHeroVariants = () => advancedHeroVariantDefinitions;

export const listSiteBuilderIntakeAdvancedSectionVariants = () => advancedSectionVariantDefinitions;

export const resolveSiteBuilderIntakeAdvancedMenuBehavior = (
  behaviorId: string
): AdvancedMenuBehaviorDefinition => {
  const behavior = advancedMenuBehaviorDefinitionsById.get(
    behaviorId as AssistantSiteBuilderAdvancedMenuBehaviorId
  );
  if (behavior) return behavior;

  return throwAssistantSiteBuilderIntakeError("intake_option_invalid", {
    registryId: "advancedMenuBehaviors",
    optionId: behaviorId,
  });
};

export const resolveSiteBuilderIntakeAdvancedHeroVariant = (
  variantId: string
): AdvancedHeroVariantDefinition => {
  const variant = advancedHeroVariantDefinitionsById.get(
    variantId as AssistantSiteBuilderAdvancedHeroVariantId
  );
  if (variant) return variant;

  return throwAssistantSiteBuilderIntakeError("intake_option_invalid", {
    registryId: "advancedHeroVariants",
    optionId: variantId,
  });
};

export const resolveSiteBuilderIntakeAdvancedSectionVariant = (
  variantId: string
): AdvancedSectionVariantDefinition => {
  const variant = advancedSectionVariantDefinitionsById.get(
    variantId as AssistantSiteBuilderAdvancedSectionVariantId
  );
  if (variant) return variant;

  return throwAssistantSiteBuilderIntakeError("intake_option_invalid", {
    registryId: "advancedSectionVariants",
    optionId: variantId,
  });
};

const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

const cloneHeroVariantFacts = (
  definition: AdvancedHeroVariantDefinition
): AssistantSiteBuilderAdvancedHeroVariantFacts => ({
  variantId: definition.id,
  widgetType: definition.widgetType,
  widgetVariantId: definition.widgetVariantId,
  module: definition.module,
  alias: definition.alias,
  pagePresetIds: [...definition.pagePresetIds],
  sectionPresetIds: [...definition.sectionPresetIds],
});

const cloneSectionVariantFacts = (
  definition: AdvancedSectionVariantDefinition
): AssistantSiteBuilderAdvancedSectionVariantFacts => ({
  variantId: definition.id,
  sectionRoleId: definition.sectionRoleId,
  alias: definition.alias,
  widgetType: definition.widgetType,
  widgetVariantId: definition.widgetVariantId,
  module: definition.module,
  pagePresetIds: [...definition.pagePresetIds],
  sectionPresetIds: [...definition.sectionPresetIds],
});

const buildAdvancedMenuFacts = (input: {
  behaviorIds: readonly AssistantSiteBuilderAdvancedMenuBehaviorId[];
  ctaTargetPageRole?: AssistantSiteBuilderPageRoleId | null;
  gates: AssistantSiteBuilderAdvancedLayoutGate[];
}): AssistantSiteBuilderAdvancedMenuFacts => {
  const behaviorIds = unique(input.behaviorIds);
  const behaviorSet = new Set<AssistantSiteBuilderAdvancedMenuBehaviorId>(behaviorIds);

  for (const behaviorId of behaviorIds) {
    resolveSiteBuilderIntakeAdvancedMenuBehavior(behaviorId);
  }

  if (behaviorSet.has("single-level") && behaviorSet.has("grouped")) {
    input.gates.push({
      code: "advanced_menu_structure_conflict",
      severity: "warning",
      optionId: "grouped",
      message:
        "Advanced menu selected both single-level and grouped; grouped is kept for review and must be confirmed before execution.",
    });
  }

  if (behaviorSet.has("transparent") && behaviorSet.has("nontransparent")) {
    input.gates.push({
      code: "advanced_menu_surface_conflict",
      severity: "warning",
      optionId: "nontransparent",
      message:
        "Advanced menu selected both transparent and solid surface; solid surface is kept for safer default review.",
    });
  }

  const structure = behaviorSet.has("grouped") ? "grouped" : "single-level";
  const ctaTargetPageRole = input.ctaTargetPageRole ?? null;
  const variantId: AssistantSiteBuilderNavigationVariantId = ctaTargetPageRole
    ? structure === "grouped"
      ? "split"
      : "with-cta"
    : "simple";

  return {
    behaviorIds,
    widgetType: "navigation",
    module: "navigation",
    variantId,
    structure,
    sticky: behaviorSet.has("sticky"),
    transparent: behaviorSet.has("transparent") && !behaviorSet.has("nontransparent"),
    mobileMode: behaviorSet.has("mobile-drawer") ? "drawer" : "expanded",
    ctaTargetPageRole,
  };
};

export const buildSiteBuilderIntakeAdvancedLayoutFacts = (
  input: BuildAdvancedLayoutFactsInput
): AssistantSiteBuilderAdvancedLayoutFacts | undefined => {
  const menuBehaviorIds = unique(input.menuBehaviorIds ?? []);
  const sectionVariantIds = unique(input.sectionVariantIds ?? []);
  const hasAdvancedInput =
    menuBehaviorIds.length > 0 ||
    Boolean(input.ctaTargetPageRole) ||
    Boolean(input.heroVariantId) ||
    sectionVariantIds.length > 0;
  if (!hasAdvancedInput) return undefined;

  const gates: AssistantSiteBuilderAdvancedLayoutGate[] = [];
  const selectedSectionRoleIds = new Set(input.selectedSectionRoleIds ?? []);
  const designSupportedSectionRoleIds = input.designSupportedSectionRoleIds
    ? new Set(input.designSupportedSectionRoleIds)
    : null;
  const menu =
    menuBehaviorIds.length > 0 || input.ctaTargetPageRole
      ? buildAdvancedMenuFacts({
          behaviorIds: menuBehaviorIds,
          ctaTargetPageRole: input.ctaTargetPageRole,
          gates,
        })
      : undefined;
  const sectionVariants = sectionVariantIds.map((variantId) => {
    const definition = resolveSiteBuilderIntakeAdvancedSectionVariant(variantId);
    if (selectedSectionRoleIds.size > 0 && !selectedSectionRoleIds.has(definition.sectionRoleId)) {
      gates.push({
        code: "advanced_section_role_missing",
        severity: "warning",
        optionId: definition.id,
        sectionRoleId: definition.sectionRoleId,
        message: `Advanced section variant "${definition.id}" requires section role "${definition.sectionRoleId}" to be selected.`,
      });
    }
    if (
      designSupportedSectionRoleIds &&
      !designSupportedSectionRoleIds.has(definition.sectionRoleId)
    ) {
      gates.push({
        code: "advanced_section_preset_unsupported",
        severity: "warning",
        optionId: definition.id,
        sectionRoleId: definition.sectionRoleId,
        message: `Advanced section variant "${definition.id}" is not supported by the selected design preset.`,
      });
    }
    return cloneSectionVariantFacts(definition);
  });
  const hero = input.heroVariantId
    ? cloneHeroVariantFacts(resolveSiteBuilderIntakeAdvancedHeroVariant(input.heroVariantId))
    : undefined;

  return {
    ...(menu ? { menu } : {}),
    ...(hero ? { hero } : {}),
    ...(sectionVariants.length > 0 ? { sectionVariants } : {}),
    gates,
  };
};

export const listSiteBuilderIntakeAdvancedWidgetRequirements = (): WidgetVariantRequirement[] => [
  ...advancedHeroVariantDefinitions.map((definition) => ({
    widgetType: definition.widgetType,
    module: definition.module,
    variantId: definition.widgetVariantId,
  })),
  ...advancedSectionVariantDefinitions.map((definition) => ({
    widgetType: definition.widgetType,
    module: definition.module,
    variantId: definition.widgetVariantId,
  })),
  ...navigationVariantIds.map((variantId) => ({
    widgetType: "navigation",
    module: "navigation",
    variantId,
  })),
];
