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
  ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";

export const FORMA_COLORS = {
  ink: "#07111f",
  navy: "#0b1628",
  surface: "#13233a",
  cyan: "#8ee8ff",
  lime: "#d8ff7a",
  white: "#f7fbff",
  muted: "#b9c9da",
  border: "rgba(142,232,255,0.22)",
  quietBorder: "rgba(255,255,255,0.1)",
} as const;

export const FORMA_GRADIENTS = {
  hero: "radial-gradient(circle at 82% 10%, rgba(142,232,255,.24), transparent 55%), linear-gradient(145deg,#07111f,#163c4b)",
  cyan: "radial-gradient(circle at 88% 12%, rgba(216,255,122,.18), transparent 52%), linear-gradient(145deg,#0b1628,#163c4b)",
  highlight:
    "radial-gradient(circle at 78% 12%, rgba(216,255,122,.22), transparent 48%), linear-gradient(155deg,#163c4b,#0b1628)",
} as const;

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
      textColor: FORMA_COLORS.white,
      fontFamily: "display",
      fontWeight: level === "h1" ? "black" : "bold",
      lineHeight: level === "h1" ? 1.04 : 1.15,
      ...style,
    },
  });

export const text = (id: string, value: string, style: BlockStyle = {}) =>
  createPageBlockV2("text", {
    id,
    props: { text: value, format: "plain", align: style.align ?? "left" },
    style: {
      textColor: FORMA_COLORS.muted,
      fontSize: "lg",
      lineHeight: 1.65,
      ...style,
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
      textColor: options.variant === "ghost" ? FORMA_COLORS.white : FORMA_COLORS.ink,
      fontWeight: "bold",
      ...(options.magnetic ? { magnetic: true } : {}),
      ...options.style,
    },
  });

export const badge = (
  id: string,
  value: string,
  options: { icon?: "check" | "sparkles" | "star" | "zap" | "shield" | "heart" } = {}
) =>
  createPageBlockV2("badge", {
    id,
    props: {
      text: value,
      variant: "soft",
      size: "sm",
      shape: "pill",
      weight: "bold",
      background: "rgba(142,232,255,0.12)",
      textColor: FORMA_COLORS.cyan,
      icon: options.icon ?? "sparkles",
      iconPosition: "start",
    },
  });

export const list = (id: string, items: string[], style: BlockStyle = {}) =>
  createPageBlockV2("list", {
    id,
    props: { items, ordered: false },
    style: {
      textColor: FORMA_COLORS.muted,
      fontSize: "md",
      lineHeight: 1.65,
      ...style,
    },
  });

export const statistic = (
  id: string,
  value: string,
  label: string,
  caption = "",
  style: BlockStyle = {}
) =>
  createPageBlockV2("statistic", {
    id,
    props: { value, label, caption },
    style: {
      textColor: FORMA_COLORS.white,
      fontWeight: "bold",
      background: "rgba(255,255,255,0.04)",
      backgroundType: "color",
      borderColor: FORMA_COLORS.quietBorder,
      borderWidth: 1,
      borderStyle: "solid",
      radius: 18,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      ...style,
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

export const surface = (
  id: string,
  children: PageBlockV2[],
  style: BlockStyle = {},
  options: Omit<GroupOptions, "style"> = {}
) =>
  group(id, children, {
    ...options,
    style: {
      background: FORMA_COLORS.surface,
      backgroundType: "color",
      borderColor: FORMA_COLORS.border,
      borderWidth: 1,
      borderStyle: "solid",
      radius: 24,
      shadow: "md",
      padding: { top: 30, right: 30, bottom: 30, left: 30 },
      surfacePreset: "glass",
      hoverEffect: "lift-glow",
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
  const layout: PageSectionLayoutV2 = {
    columns,
    align: "start",
    justify: "start",
    maxWidth: 1180,
    stackVertical: false,
    ...options.layout,
  };
  const style: PageSectionStyleV2 = {
    background: FORMA_COLORS.ink,
    backgroundType: "color",
    backgroundImage: null,
    accent: FORMA_COLORS.cyan,
    radius: 0,
    shadow: "none",
    fullBleed: true,
    ...options.style,
  };
  const spacing: PageSectionSpacingV2 = {
    paddingTop: 84,
    paddingBottom: 84,
    paddingLeft: 40,
    paddingRight: 40,
    gap: 28,
    ...options.spacing,
  };
  const tablet: PageSectionResponsiveOverrideV2 = {
    layout: { columns: columns > 2 ? 2 : columns, stackVertical: false },
    spacing: { gap: 22, paddingLeft: 28, paddingRight: 28 },
  };
  const mobile: PageSectionResponsiveOverrideV2 = {
    layout: { columns: 1, stackVertical: true },
    spacing: {
      gap: 18,
      paddingTop: 58,
      paddingBottom: 58,
      paddingLeft: 20,
      paddingRight: 20,
    },
  };

  return createPageSectionV2(options.type ?? "content", {
    id,
    name,
    variant: options.variant ?? "default",
    layout,
    style,
    spacing,
    visibility: {
      visible: true,
      authOnly: false,
      anchor: options.anchor ?? null,
      startsAt: null,
      endsAt: null,
    },
    responsive: {
      tablet: mergeResponsiveOverride(tablet, options.responsive?.tablet),
      mobile: mergeResponsiveOverride(mobile, options.responsive?.mobile),
    },
    blocks,
  });
};

export const heroHeading = (id: string, value: string) =>
  heading(id, value, "h1", {
    fontSizeCustom: "clamp(2.8rem,6vw,6.5rem)",
    letterSpacing: -1.4,
    textColor: FORMA_COLORS.white,
  });

export const sectionHeading = (id: string, value: string, columns = 1) =>
  heading(id, value, "h2", {
    fontSizeCustom: "clamp(2rem,4vw,3.6rem)",
    letterSpacing: -0.8,
    ...(columns > 1 ? { colSpan: columns } : {}),
  });

const replaceIds = (value: unknown, refs: ReadonlyMap<string, PackageRef>): unknown => {
  if (typeof value === "string" && refs.has(value)) return { ...refs.get(value)! };
  if (Array.isArray(value)) return value.map((item) => replaceIds(item, refs));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, replaceIds(child, refs)])
  );
};

export const buildPageSeed = (
  key: string,
  title: string,
  sections: PageSectionV2[],
  refs: ReadonlyMap<string, PackageRef> = new Map()
): ResourceSeed => {
  const document: PageDocumentV2 = normalizePageDocumentV2ForWrite({
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: { title },
    settings: {
      template: "page-v2",
      showInNav: true,
      background: FORMA_COLORS.ink,
      effects: {
        cursorSpotlight: true,
        spotlightColor: "rgba(142,232,255,0.14)",
        spotlightSize: 460,
        noiseOverlay: true,
      },
    },
    sections,
  });
  return {
    key,
    desired: {
      title,
      slug: key === "home" ? "/" : `/${key}`,
      status: "published",
      document: replaceIds(document, refs) as JsonObject,
    },
  };
};
