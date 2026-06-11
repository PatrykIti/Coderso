import {
  type PageSectionType,
  type PageSectionV2,
  type PageSectionVariant,
} from "./pageDocumentV2";

export type PageSectionTemplateKind =
  | "hero"
  | "content"
  | "feature-grid"
  | "media-split"
  | "timeline"
  | "gallery"
  | "comparison"
  | "faq"
  | "testimonials"
  | "cta"
  | "custom";

export type PageSectionTemplateDefinition = {
  type: PageSectionType;
  template: PageSectionTemplateKind;
  variants: readonly PageSectionVariant[];
  fallbackVariant: PageSectionVariant;
};

export type ResolvedPageSectionTemplate = {
  definition: PageSectionTemplateDefinition | null;
  section: PageSectionV2;
  template: PageSectionTemplateKind | "generic";
  variant: PageSectionVariant;
  fallback: boolean;
};

export const pageSectionTemplateRegistry: Partial<
  Record<PageSectionType, PageSectionTemplateDefinition>
> = {
  hero: {
    type: "hero",
    template: "hero",
    variants: ["default", "split", "centered", "full-width"],
    fallbackVariant: "default",
  },
  content: {
    type: "content",
    template: "content",
    variants: ["default", "compact"],
    fallbackVariant: "default",
  },
  "feature-grid": {
    type: "feature-grid",
    template: "feature-grid",
    variants: ["default", "cards", "grid"],
    fallbackVariant: "default",
  },
  "media-split": {
    type: "media-split",
    template: "media-split",
    variants: ["split", "horizontal", "default"],
    fallbackVariant: "split",
  },
  timeline: {
    type: "timeline",
    template: "timeline",
    variants: ["default", "horizontal", "compact"],
    fallbackVariant: "default",
  },
  gallery: {
    type: "gallery",
    template: "gallery",
    variants: ["grid", "cards", "default"],
    fallbackVariant: "grid",
  },
  comparison: {
    type: "comparison",
    template: "comparison",
    variants: ["default", "grid", "cards"],
    fallbackVariant: "default",
  },
  faq: {
    type: "faq",
    template: "faq",
    variants: ["default", "compact"],
    fallbackVariant: "default",
  },
  testimonials: {
    type: "testimonials",
    template: "testimonials",
    variants: ["cards", "grid", "default"],
    fallbackVariant: "cards",
  },
  cta: {
    type: "cta",
    template: "cta",
    variants: ["centered", "full-width", "default"],
    fallbackVariant: "centered",
  },
  custom: {
    type: "custom",
    template: "custom",
    variants: ["default", "compact", "grid"],
    fallbackVariant: "default",
  },
};

export const getPageSectionTemplateDefinition = (
  type: PageSectionType
): PageSectionTemplateDefinition | null => pageSectionTemplateRegistry[type] ?? null;

export const getPageSectionVariantOptions = (
  type: PageSectionType
): readonly PageSectionVariant[] => getPageSectionTemplateDefinition(type)?.variants ?? [];

export const getPageSectionFallbackVariant = (type: PageSectionType): PageSectionVariant =>
  getPageSectionTemplateDefinition(type)?.fallbackVariant ?? "default";

/**
 * Effective grid column count for a resolved section template. Owns the
 * template-driven column floors used by the renderer grid classes and by the
 * responsive CSS emission contract (`pageResponsiveCss.ts`); both must agree.
 */
export const resolvePageSectionTemplateColumns = (
  template: ResolvedPageSectionTemplate
): number => {
  const columns = template.section.layout.columns;
  if (template.template === "hero" && template.variant === "split") return 2;
  if (template.template === "media-split" && template.variant !== "default") return 2;
  if (
    (template.template === "feature-grid" ||
      template.template === "gallery" ||
      template.template === "testimonials") &&
    (template.variant === "grid" || template.variant === "cards")
  ) {
    return Math.max(columns, 3);
  }
  if (
    (template.template === "comparison" || template.template === "custom") &&
    (template.variant === "grid" || template.variant === "cards")
  ) {
    return Math.max(columns, 2);
  }
  return columns;
};

export const resolvePageSectionTemplate = (section: PageSectionV2): ResolvedPageSectionTemplate => {
  const definition = getPageSectionTemplateDefinition(section.type);
  if (!definition) {
    return {
      definition: null,
      section: section.variant === "default" ? section : { ...section, variant: "default" },
      template: "generic",
      variant: "default",
      fallback: section.variant !== "default",
    };
  }

  const variant = definition.variants.includes(section.variant)
    ? section.variant
    : definition.fallbackVariant;
  return {
    definition,
    section: variant === section.variant ? section : { ...section, variant },
    template: definition.template,
    variant,
    fallback: variant !== section.variant,
  };
};
