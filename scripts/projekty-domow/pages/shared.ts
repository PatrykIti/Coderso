import {
  createPageBlockV2,
  createPageSectionV2,
  normalizePageDocumentV2ForWrite,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageBlockStyleV2,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionLayoutV2,
  type PageSectionResponsiveOverrideV2,
  type PageSectionSpacingV2,
  type PageSectionStyleV2,
  type PageSectionType,
  type PageSectionV2,
  type PageSectionVariant,
} from "../../../core/services/pages/pageDocumentV2";
import type {
  JsonObject,
  PackageRef,
  PackageResourceKind,
  ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";

export const FORMA_DOM_PAGE_PALETTE = {
  background: "#07111f",
  backgroundSecondary: "#0b1628",
  text: "#f7fbff",
  muted: "#a8b5c7",
  mutedQuiet: "#7e8ba0",
  line: "rgba(255,255,255,.14)",
  aqua: "#8ee8ff",
  mint: "#adffd8",
  violet: "#c7b7ff",
  warm: "#ffd7a8",
  danger: "#ff9fba",
} as const;

export const FORMA_DOM_PAGE_GRADIENTS = {
  hero: `radial-gradient(circle at 82% 10%, rgba(142,232,255,.24), transparent 55%), linear-gradient(145deg,${FORMA_DOM_PAGE_PALETTE.background},${FORMA_DOM_PAGE_PALETTE.backgroundSecondary})`,
  aqua: `radial-gradient(circle at 88% 12%, rgba(142,232,255,.18), transparent 52%), linear-gradient(145deg,${FORMA_DOM_PAGE_PALETTE.backgroundSecondary},${FORMA_DOM_PAGE_PALETTE.background})`,
  highlight: `radial-gradient(circle at 78% 12%, rgba(173,255,216,.22), transparent 48%), linear-gradient(155deg,${FORMA_DOM_PAGE_PALETTE.backgroundSecondary},${FORMA_DOM_PAGE_PALETTE.background})`,
} as const;

export const FORMA_DOM_PAGE_SEO_DESCRIPTION =
  "Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.";

export const PAGE_BINDING_PLACEHOLDERS = {
  projectContentType: "00000000-0000-4000-8000-000000000561",
  projectListingQuery: "00000000-0000-4000-8000-000000000562",
  projectListingTemplate: "00000000-0000-4000-8000-000000000563",
  projectBriefForm: "00000000-0000-4000-8000-000000000564",
} as const;

export type FormaDomPageKey =
  "home" | "oferta" | "projekty" | "proces" | "cennik" | "o-nas" | "kontakt";

export type StaticSeo = { title: string; description: string };

export type FormaDomPageBinding =
  | {
      sectionId: string;
      blockId: string;
      blockType: "collection";
      prop: "contentTypeId" | "queryId" | "templateId";
      value: PackageRef;
    }
  | {
      sectionId: string;
      blockId: string;
      blockType: "filters";
      prop: "queryId";
      value: PackageRef;
    }
  | {
      sectionId: string;
      blockId: string;
      blockType: "form";
      prop: "formId";
      value: PackageRef;
    };

type BlockStyle = PageBlockStyleV2;

export const heading = (
  id: string,
  value: string,
  level: "h1" | "h2" | "h3" = "h2",
  style: BlockStyle = {}
) =>
  createPageBlockV2("heading", {
    id,
    props: { text: value, level, align: style.align ?? "left" },
    style: {
      textColor: FORMA_DOM_PAGE_PALETTE.text,
      fontFamily: "display",
      fontWeight: level === "h1" ? "black" : "bold",
      lineHeight: level === "h1" ? 1.04 : 1.15,
      ...style,
    },
  });

export const heroHeading = (id: string, value: string) =>
  heading(id, value, "h1", {
    fontSizeCustom: "clamp(2.8rem,6vw,6.5rem)",
    letterSpacing: -1.4,
  });

export const sectionHeading = (id: string, value: string, columns = 1) =>
  heading(id, value, "h2", {
    fontSizeCustom: "clamp(2rem,4vw,3.6rem)",
    letterSpacing: -0.8,
    ...(columns > 1 ? { colSpan: columns } : {}),
  });

export const text = (id: string, value: string, style: BlockStyle = {}) =>
  createPageBlockV2("text", {
    id,
    props: { text: value, format: "plain", align: style.align ?? "left" },
    style: {
      textColor: FORMA_DOM_PAGE_PALETTE.muted,
      fontSize: "lg",
      lineHeight: 1.65,
      ...style,
    },
  });

export const badge = (id: string, value: string) =>
  createPageBlockV2("badge", {
    id,
    props: {
      text: value,
      variant: "soft",
      size: "sm",
      shape: "pill",
      weight: "bold",
      background: "rgba(142,232,255,.12)",
      textColor: FORMA_DOM_PAGE_PALETTE.aqua,
      icon: null,
      iconPosition: "start",
    },
  });

type ButtonOptions = {
  magnetic?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  style?: BlockStyle;
};

export const button = (id: string, label: string, href: string, options: ButtonOptions = {}) =>
  createPageBlockV2("button", {
    id,
    props: {
      label,
      href,
      target: "self",
      variant: options.variant ?? "primary",
      size: options.size ?? "md",
    },
    style: {
      textColor:
        options.variant === "ghost" || options.variant === "link"
          ? FORMA_DOM_PAGE_PALETTE.text
          : FORMA_DOM_PAGE_PALETTE.background,
      fontWeight: "bold",
      ...(options.magnetic ? { magnetic: true } : {}),
      ...options.style,
    },
  });

export const list = (id: string, items: string[], ordered = false, style: BlockStyle = {}) =>
  createPageBlockV2("list", {
    id,
    props: { items, ordered },
    style: {
      textColor: FORMA_DOM_PAGE_PALETTE.muted,
      fontSize: "md",
      lineHeight: 1.65,
      ...style,
    },
  });

export const statistic = (id: string, value: string, label: string, caption = "") =>
  createPageBlockV2("statistic", {
    id,
    props: { value, label, caption },
    style: {
      textColor: FORMA_DOM_PAGE_PALETTE.text,
      background: "rgba(255,255,255,.04)",
      backgroundType: "color",
      borderColor: FORMA_DOM_PAGE_PALETTE.line,
      borderWidth: 1,
      borderStyle: "solid",
      radius: 18,
      padding: { top: 18, right: 18, bottom: 18, left: 18 },
    },
  });

type GroupOptions = {
  direction?: "row" | "column";
  wrap?: boolean;
  gap?: number;
  style?: BlockStyle;
};

export const group = (id: string, children: PageBlockV2[], options: GroupOptions = {}) =>
  createPageBlockV2("group", {
    id,
    props: {
      direction: options.direction ?? "column",
      wrap: options.wrap ?? false,
      gap: options.gap ?? 18,
    },
    style: options.style,
    slots: { children },
  });

export const surface = (id: string, children: PageBlockV2[], style: BlockStyle = {}) =>
  group(id, children, {
    style: {
      background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
      backgroundType: "color",
      borderColor: FORMA_DOM_PAGE_PALETTE.line,
      borderWidth: 1,
      borderStyle: "solid",
      radius: 24,
      shadow: "md",
      padding: { top: 28, right: 28, bottom: 28, left: 28 },
      surfacePreset: "glass",
      ...style,
    },
  });

type SectionOptions = {
  type?: PageSectionType;
  variant?: PageSectionVariant;
  anchor?: string;
  layout?: Partial<PageSectionLayoutV2>;
  style?: Partial<PageSectionStyleV2>;
  spacing?: Partial<PageSectionSpacingV2>;
  responsive?: Partial<Record<"tablet" | "mobile", PageSectionResponsiveOverrideV2>>;
};

const mergeResponsiveOverride = (
  base: PageSectionResponsiveOverrideV2,
  override: PageSectionResponsiveOverrideV2 | undefined
): PageSectionResponsiveOverrideV2 => ({
  ...base,
  ...override,
  layout: { ...base.layout, ...override?.layout },
  style: { ...base.style, ...override?.style },
  spacing: { ...base.spacing, ...override?.spacing },
  visibility: { ...base.visibility, ...override?.visibility },
});

export const section = (
  id: string,
  name: string,
  blocks: PageBlockV2[],
  options: SectionOptions = {}
): PageSectionV2 => {
  const columns = options.layout?.columns ?? 1;
  return createPageSectionV2(options.type ?? "content", {
    id,
    name,
    variant: options.variant ?? "default",
    layout: {
      columns,
      align: "start",
      justify: "start",
      maxWidth: 1180,
      stackVertical: false,
      ...options.layout,
    },
    style: {
      background: FORMA_DOM_PAGE_PALETTE.background,
      backgroundType: "color",
      backgroundImage: null,
      accent: FORMA_DOM_PAGE_PALETTE.aqua,
      radius: 0,
      shadow: "none",
      fullBleed: true,
      ...options.style,
    },
    spacing: {
      paddingTop: 84,
      paddingBottom: 84,
      paddingLeft: 40,
      paddingRight: 40,
      gap: 28,
      ...options.spacing,
    },
    visibility: {
      visible: true,
      authOnly: false,
      anchor: options.anchor ?? null,
      startsAt: null,
      endsAt: null,
    },
    responsive: {
      tablet: mergeResponsiveOverride(
        {
          layout: { columns: columns > 2 ? 2 : columns, stackVertical: false },
          spacing: { gap: 22, paddingLeft: 28, paddingRight: 28 },
        },
        options.responsive?.tablet
      ),
      mobile: mergeResponsiveOverride(
        {
          layout: { columns: 1, stackVertical: true },
          spacing: {
            gap: 18,
            paddingTop: 58,
            paddingBottom: 58,
            paddingLeft: 20,
            paddingRight: 20,
          },
        },
        options.responsive?.mobile
      ),
    },
    blocks,
  });
};

const sectionIdsByPage: Readonly<Record<FormaDomPageKey, readonly string[]>> = {
  home: [
    "home-hero",
    "home-intro",
    "home-services",
    "home-switcher",
    "home-projects",
    "home-process",
    "home-cta",
  ],
  oferta: [
    "offer-hero",
    "offer-individual",
    "offer-adaptation",
    "offer-visualization",
    "offer-plot",
    "offer-interiors",
    "offer-comparison",
  ],
  projekty: ["projects-hero", "projects-browser"],
  proces: ["process-hero", "process-timeline", "process-cta"],
  cennik: ["pricing-hero", "pricing-packages"],
  "o-nas": ["about-hero", "about-approach", "about-team"],
  kontakt: ["contact-hero", "contact-form-section"],
};

const assertExactSectionMatrix = (key: FormaDomPageKey, sections: readonly PageSectionV2[]) => {
  const actual = sections.map(({ id }) => id);
  const expected = sectionIdsByPage[key];
  if (
    actual.length !== expected.length ||
    actual.some((sectionId, index) => sectionId !== expected[index]) ||
    new Set(actual).size !== actual.length
  ) {
    throw new Error(`Invalid ${key} section matrix.`);
  }
};

type AllowedBinding = {
  signature: string;
  placeholder: string;
  ref: PackageResourceKind;
};

const allowedBindingsByPage: Readonly<Partial<Record<FormaDomPageKey, readonly AllowedBinding[]>>> =
  {
    projekty: [
      {
        signature: "projects-browser/projects-filters/filters/queryId",
        placeholder: PAGE_BINDING_PLACEHOLDERS.projectListingQuery,
        ref: "listing_query",
      },
      {
        signature: "projects-browser/projects-collection/collection/contentTypeId",
        placeholder: PAGE_BINDING_PLACEHOLDERS.projectContentType,
        ref: "content_type",
      },
      {
        signature: "projects-browser/projects-collection/collection/queryId",
        placeholder: PAGE_BINDING_PLACEHOLDERS.projectListingQuery,
        ref: "listing_query",
      },
      {
        signature: "projects-browser/projects-collection/collection/templateId",
        placeholder: PAGE_BINDING_PLACEHOLDERS.projectListingTemplate,
        ref: "listing_template",
      },
    ],
    kontakt: [
      {
        signature: "contact-form-section/contact-form/form/formId",
        placeholder: PAGE_BINDING_PLACEHOLDERS.projectBriefForm,
        ref: "form",
      },
    ],
  };

const bindingSignature = (binding: FormaDomPageBinding) =>
  `${binding.sectionId}/${binding.blockId}/${binding.blockType}/${binding.prop}`;

export const attachPackageRefsAtAllowedPageBlockPaths = (
  key: FormaDomPageKey,
  document: PageDocumentV2,
  bindings: readonly FormaDomPageBinding[]
): JsonObject => {
  const allowed = allowedBindingsByPage[key] ?? [];
  const actualSignatures = bindings.map(bindingSignature);
  if (
    bindings.length !== allowed.length ||
    new Set(actualSignatures).size !== bindings.length ||
    allowed.some(({ signature }) => !actualSignatures.includes(signature))
  ) {
    throw new Error(`Invalid ${key} page bindings.`);
  }
  const clone = JSON.parse(JSON.stringify(document)) as PageDocumentV2;
  for (const binding of bindings) {
    const rule = allowed.find(({ signature }) => signature === bindingSignature(binding));
    if (!rule || binding.value.ref !== rule.ref) {
      throw new Error(`Invalid ${key} page binding kind.`);
    }
    const sections = clone.sections.filter(({ id }) => id === binding.sectionId);
    if (sections.length !== 1) throw new Error(`Missing ${binding.sectionId} section.`);
    const blocks = sections[0].blocks.filter(({ id }) => id === binding.blockId);
    if (blocks.length !== 1 || blocks[0].type !== binding.blockType) {
      throw new Error(`Invalid ${binding.blockId} direct block binding.`);
    }
    const block = blocks[0];
    if (block.props[binding.prop] !== rule.placeholder) {
      throw new Error(`Invalid ${binding.blockId}.${binding.prop} placeholder.`);
    }
    block.props[binding.prop] = { ...binding.value };
  }
  return clone as unknown as JsonObject;
};

export const buildPageSeed = (input: {
  key: FormaDomPageKey;
  route: string;
  seo: StaticSeo;
  sections: PageSectionV2[];
  bindings?: readonly FormaDomPageBinding[];
}): ResourceSeed => {
  assertExactSectionMatrix(input.key, input.sections);
  const nativePageData = normalizePageDocumentV2ForWrite({
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: input.seo,
    settings: {
      template: "page-v2",
      showInNav: true,
      background: FORMA_DOM_PAGE_PALETTE.background,
      effects: {
        cursorSpotlight: true,
        spotlightColor: "rgba(142,232,255,.14)",
        spotlightSize: 460,
        noiseOverlay: true,
      },
    },
    sections: input.sections,
  });
  const bindings = input.bindings ?? [];
  const expectedBindings = allowedBindingsByPage[input.key] ?? [];
  if (bindings.length !== expectedBindings.length) {
    throw new Error(`Missing ${input.key} page bindings.`);
  }
  const data = bindings.length
    ? attachPackageRefsAtAllowedPageBlockPaths(input.key, nativePageData, bindings)
    : (nativePageData as unknown as JsonObject);
  return {
    key: input.key,
    desired: {
      title: input.seo.title,
      slug: input.route,
      status: "published",
      data,
    },
  };
};
