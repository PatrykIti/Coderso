import type { CSSProperties, ComponentType, ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import { parseRepeatableSlotId, resolveWidgetSlotTargets } from "../slots";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export type SectionVariantId = "default" | "contained" | "bleed";
export type SectionElement = "section" | "div";
export type SectionBorderWidth = "0" | "1" | "2" | "3";
export type SectionRadius = "none" | "lg" | "xl" | "2xl";
export type SectionContainerWidth = "content" | "wide" | "full";
export type SectionMaxWidth = "none" | "4xl" | "5xl" | "6xl" | "7xl";
export type SectionPaddingBlock = "sm" | "md" | "lg" | "xl";
export type SectionPaddingInline = "none" | "sm" | "md" | "lg";
export type SectionMinHeight = "none" | "compact" | "hero" | "screen";
export type SectionRegionFlow = "stack" | "row" | "grid";
export type SectionRegionColumns = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type SectionGap = "none" | "sm" | "md" | "lg" | "xl";
export type SectionHeadingAlign = "left" | "center" | "right";
export type SectionHeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type SectionLabelSize = "xs" | "sm" | "md";
export type SectionTitleSize = "xl" | "2xl" | "3xl";
export type SectionDescriptionSize = "sm" | "base" | "lg";
export type SectionBackgroundMediaType = "none" | "image" | "video";
export type SectionBackgroundMediaSource = "library" | "external";
export type SectionBackgroundMediaFit = "cover" | "contain";
export type SectionBackgroundMediaPosition = "center" | "top" | "bottom" | "left" | "right";
export type SectionBackgroundMediaBlendMode = "normal" | "multiply" | "screen" | "overlay";
export type SectionLayerOrder = "media-under-overlay" | "overlay-under-media";
export type SectionShadow = "none" | "sm" | "md" | "lg" | "xl";
export type SectionMotion = "none" | "fade" | "slide-up";

export type SectionRegionMeta = {
  id?: string;
  label?: string;
};

export type SectionBackgroundMedia = {
  type?: SectionBackgroundMediaType;
  source?: SectionBackgroundMediaSource;
  assetId?: string;
  src?: string;
  posterSource?: SectionBackgroundMediaSource;
  posterAssetId?: string;
  posterSrc?: string;
  title?: string;
  description?: string;
  fit?: SectionBackgroundMediaFit;
  position?: SectionBackgroundMediaPosition;
  opacity?: number;
  blendMode?: SectionBackgroundMediaBlendMode;
  layerOrder?: SectionLayerOrder;
};

export type SectionData = {
  regions?: SectionRegionMeta[];
  heading?: {
    label?: string;
    title?: string;
    description?: string;
    level?: SectionHeadingLevel;
    align?: SectionHeadingAlign;
    labelSize?: SectionLabelSize;
    titleSize?: SectionTitleSize;
    descriptionSize?: SectionDescriptionSize;
    labelColor?: string;
    titleColor?: string;
    descriptionColor?: string;
  };
  layout?: {
    containerWidth?: SectionContainerWidth;
    maxWidth?: SectionMaxWidth;
    paddingBlock?: SectionPaddingBlock;
    paddingInline?: SectionPaddingInline;
    mobilePaddingBlock?: SectionPaddingBlock;
    mobilePaddingInline?: SectionPaddingInline;
    desktopPaddingBlock?: SectionPaddingBlock;
    desktopPaddingInline?: SectionPaddingInline;
    minHeight?: SectionMinHeight;
    regionFlow?: SectionRegionFlow;
    regionColumns?: SectionRegionColumns;
    headingGap?: SectionGap;
    regionGap?: SectionGap;
  };
  semantics?: {
    element?: SectionElement;
    anchorId?: string;
    ariaLabel?: string;
  };
  style?: {
    backgroundColor?: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientAngle?: number;
    borderColor?: string;
    borderWidth?: SectionBorderWidth;
    radius?: SectionRadius;
    shadow?: SectionShadow;
    motion?: SectionMotion;
    overlayColor?: string;
    overlayOpacity?: number;
    backgroundMedia?: SectionBackgroundMedia;
  };
};

const sectionVisualPresetDuplicateAllowances = [
  "heading.align",
  "layout.containerWidth",
  "layout.maxWidth",
  "layout.paddingBlock",
  "layout.paddingInline",
  "layout.minHeight",
  "layout.regionFlow",
  "layout.regionColumns",
  "layout.headingGap",
  "layout.regionGap",
  "style.borderWidth",
  "style.radius",
].map((path) => ({
  path,
  reason:
    "Visual quick presets batch-apply Section-owned fields; individual Visual controls remain the daily fine-tuning owners after the preset pass.",
  expiresWithTask: "TASK-336-19",
})) satisfies NonNullable<
  WidgetEditorContract["sections"][number]["allowedDuplicateWritablePaths"]
>;

const sectionHeadingAlignPresetAllowance = sectionVisualPresetDuplicateAllowances.filter(
  (allowance) => allowance.path === "heading.align"
);
const sectionLayoutPresetAllowances = sectionVisualPresetDuplicateAllowances.filter((allowance) =>
  allowance.path.startsWith("layout.")
);
const sectionSurfacePresetAllowances = sectionVisualPresetDuplicateAllowances.filter((allowance) =>
  allowance.path.startsWith("style.")
);

export const sectionEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "section.wizard.quick-start",
      title: "Guided quick start",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant"],
    },
    {
      mode: "visual",
      id: "section.visual.variant-structure",
      title: "Variant and structure",
      role: "layout",
      writablePaths: [
        "variant",
        "heading.align",
        "layout.containerWidth",
        "layout.maxWidth",
        "layout.paddingBlock",
        "layout.paddingInline",
        "layout.minHeight",
        "layout.regionFlow",
        "layout.regionColumns",
        "layout.headingGap",
        "layout.regionGap",
        "style.borderWidth",
        "style.radius",
      ],
      allowedDuplicateWritablePaths: sectionVisualPresetDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "section.visual.heading-intro",
      title: "Heading and intro",
      role: "content",
      writablePaths: [
        "heading.label",
        "heading.title",
        "heading.description",
        "heading.level",
        "heading.align",
        "heading.labelSize",
        "heading.titleSize",
        "heading.descriptionSize",
        "heading.labelColor",
        "heading.titleColor",
        "heading.descriptionColor",
      ],
      allowedDuplicateWritablePaths: [...sectionHeadingAlignPresetAllowance],
    },
    {
      mode: "visual",
      id: "section.width-spacing",
      title: "Width and spacing",
      role: "layout",
      writablePaths: [
        "layout.containerWidth",
        "layout.maxWidth",
        "layout.paddingBlock",
        "layout.paddingInline",
        "layout.mobilePaddingBlock",
        "layout.mobilePaddingInline",
        "layout.desktopPaddingBlock",
        "layout.desktopPaddingInline",
        "layout.minHeight",
        "layout.regionFlow",
        "layout.regionColumns",
        "layout.headingGap",
        "layout.regionGap",
      ],
      allowedDuplicateWritablePaths: sectionLayoutPresetAllowances,
    },
    {
      mode: "visual",
      id: "section.visual.link-accessibility",
      title: "Section link and accessibility",
      role: "content",
      writablePaths: ["semantics.element", "semantics.anchorId", "semantics.ariaLabel"],
    },
    {
      mode: "visual",
      id: "section.surface-borders",
      title: "Surface and borders",
      role: "visual",
      writablePaths: [
        "style.backgroundColor",
        "style.gradientFrom",
        "style.gradientTo",
        "style.gradientAngle",
        "style.borderColor",
        "style.borderWidth",
        "style.radius",
        "style.shadow",
        "style.motion",
        "style.overlayColor",
        "style.overlayOpacity",
      ],
      allowedDuplicateWritablePaths: sectionSurfacePresetAllowances,
    },
    {
      mode: "visual",
      id: "section.background-media-layers",
      title: "Background media and layers",
      role: "visual",
      writablePaths: [
        "style.backgroundMedia",
        "style.backgroundMedia.type",
        "style.backgroundMedia.source",
        "style.backgroundMedia.assetId",
        "style.backgroundMedia.src",
        "style.backgroundMedia.posterSource",
        "style.backgroundMedia.posterAssetId",
        "style.backgroundMedia.posterSrc",
        "style.backgroundMedia.title",
        "style.backgroundMedia.description",
        "style.backgroundMedia.fit",
        "style.backgroundMedia.position",
        "style.backgroundMedia.opacity",
        "style.backgroundMedia.blendMode",
        "style.backgroundMedia.layerOrder",
      ],
    },
    {
      mode: "advanced",
      id: "section.advanced.resolved-summary",
      title: "Resolved layout summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["layout", "style", "semantics"],
    },
    {
      mode: "advanced",
      id: "section.advanced.support-diagnostics",
      title: "Support diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["heading", "style", "style.backgroundMedia"],
    },
    {
      mode: "advanced",
      id: "section.advanced.authoring-boundaries",
      title: "Authoring boundaries",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["editorContract"],
    },
  ],
};

export const sectionRegionSlot = {
  id: "region",
  label: "Region",
  kind: "repeatable" as const,
  minItems: 1,
  maxItems: 8,
};

export const sectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    heading: {
      type: "object",
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        level: { enum: ["h1", "h2", "h3", "h4", "h5", "h6"] },
        align: { enum: ["left", "center", "right"] },
        labelSize: { enum: ["xs", "sm", "md"] },
        titleSize: { enum: ["xl", "2xl", "3xl"] },
        descriptionSize: { enum: ["sm", "base", "lg"] },
        labelColor: { type: "string" },
        titleColor: { type: "string" },
        descriptionColor: { type: "string" },
      },
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      properties: {
        element: { enum: ["section", "div"] },
        anchorId: { type: "string" },
        ariaLabel: { type: "string" },
      },
    },
    regions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        containerWidth: { enum: ["content", "wide", "full"] },
        maxWidth: { enum: ["none", "4xl", "5xl", "6xl", "7xl"] },
        paddingBlock: { enum: ["sm", "md", "lg", "xl"] },
        paddingInline: { enum: ["none", "sm", "md", "lg"] },
        mobilePaddingBlock: { enum: ["sm", "md", "lg", "xl"] },
        mobilePaddingInline: { enum: ["none", "sm", "md", "lg"] },
        desktopPaddingBlock: { enum: ["sm", "md", "lg", "xl"] },
        desktopPaddingInline: { enum: ["none", "sm", "md", "lg"] },
        minHeight: { enum: ["none", "compact", "hero", "screen"] },
        regionFlow: { enum: ["stack", "row", "grid"] },
        regionColumns: { enum: ["1", "2", "3", "4", "5", "6", "7", "8"] },
        headingGap: { enum: ["none", "sm", "md", "lg", "xl"] },
        regionGap: { enum: ["none", "sm", "md", "lg", "xl"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        backgroundColor: { type: "string" },
        gradientFrom: { type: "string" },
        gradientTo: { type: "string" },
        gradientAngle: { type: "number" },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        radius: { enum: ["none", "lg", "xl", "2xl"] },
        shadow: { enum: ["none", "sm", "md", "lg", "xl"] },
        motion: { enum: ["none", "fade", "slide-up"] },
        overlayColor: { type: "string" },
        overlayOpacity: { type: "number" },
        backgroundMedia: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { enum: ["none", "image", "video"] },
            source: { enum: ["library", "external"] },
            assetId: { type: "string" },
            src: { type: "string" },
            posterSource: { enum: ["library", "external"] },
            posterAssetId: { type: "string" },
            posterSrc: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            fit: { enum: ["cover", "contain"] },
            position: { enum: ["center", "top", "bottom", "left", "right"] },
            opacity: { type: "number" },
            blendMode: { enum: ["normal", "multiply", "screen", "overlay"] },
            layerOrder: { enum: ["media-under-overlay", "overlay-under-media"] },
          },
        },
      },
    },
  },
};

export const sectionDefaults: SectionData = {
  heading: {
    label: "",
    title: "",
    description: "",
    level: "h2",
    align: "left",
    labelSize: "xs",
    titleSize: "2xl",
    descriptionSize: "sm",
  },
  semantics: {
    element: "section",
    anchorId: "",
    ariaLabel: "",
  },
  layout: {
    containerWidth: "content",
    maxWidth: "6xl",
    paddingBlock: "md",
    paddingInline: "md",
    minHeight: "none",
    regionFlow: "stack",
    regionColumns: "1",
    headingGap: "md",
  },
  style: {
    backgroundColor: "transparent",
    gradientFrom: "",
    gradientTo: "",
    gradientAngle: 180,
    borderWidth: "0",
    radius: "none",
    motion: "none",
    overlayColor: "#000000",
    overlayOpacity: 0,
    backgroundMedia: {
      type: "none",
      source: "library",
      fit: "cover",
      position: "center",
      opacity: 100,
      blendMode: "normal",
      layerOrder: "media-under-overlay",
    },
  },
};

const borderWidthValueMap: Record<SectionBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

const radiusClassMap: Record<SectionRadius, string> = {
  none: "",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const shadowClassMap: Record<SectionShadow, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const containerWidthClassMap: Record<SectionContainerWidth, string> = {
  content: "mx-auto w-full",
  wide: "mx-auto w-full",
  full: "w-full",
};

const maxWidthClassMap: Record<SectionMaxWidth, string> = {
  none: "",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const paddingBlockClassMap: Record<SectionPaddingBlock, string> = {
  sm: "py-4",
  md: "py-6",
  lg: "py-8",
  xl: "py-10",
};

const paddingInlineClassMap: Record<SectionPaddingInline, string> = {
  none: "px-0",
  sm: "px-4",
  md: "px-6",
  lg: "px-8",
};

const desktopPaddingBlockClassMap: Record<SectionPaddingBlock, string> = {
  sm: "md:py-4",
  md: "md:py-6",
  lg: "md:py-8",
  xl: "md:py-10",
};

const desktopPaddingInlineClassMap: Record<SectionPaddingInline, string> = {
  none: "md:px-0",
  sm: "md:px-4",
  md: "md:px-6",
  lg: "md:px-8",
};

const minHeightClassMap: Record<SectionMinHeight, string> = {
  none: "",
  compact: "min-h-64",
  hero: "min-h-[70vh]",
  screen: "min-h-screen",
};

const regionFlowClassMap: Record<SectionRegionFlow, string> = {
  stack: "flex flex-col",
  row: "flex flex-col md:flex-row md:flex-wrap",
  grid: "grid grid-cols-1",
};

const regionColumnClassMap: Record<SectionRegionColumns, string> = {
  "1": "",
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-2 xl:grid-cols-3",
  "4": "md:grid-cols-2 xl:grid-cols-4",
  "5": "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5",
  "6": "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
  "7": "md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7",
  "8": "md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8",
};

const gapClassMap: Record<SectionGap, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const headingAlignClassMap: Record<SectionHeadingAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const labelSizeClassMap: Record<SectionLabelSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
};

const titleSizeClassMap: Record<SectionTitleSize, string> = {
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

const descriptionSizeClassMap: Record<SectionDescriptionSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const motionClassMap: Record<SectionMotion, string | undefined> = {
  none: undefined,
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none",
  "slide-up":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none",
};

const regionGapVariantFallbackMap: Record<SectionVariantId, SectionGap> = {
  default: "lg",
  contained: "md",
  bleed: "xl",
};

const regionItemClassMap: Record<SectionRegionFlow, string> = {
  stack: "min-w-0",
  row: "min-w-0 md:min-w-[16rem] md:flex-1",
  grid: "min-w-0",
};

const backgroundMediaFitClassMap: Record<SectionBackgroundMediaFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
};

const backgroundMediaPositionStyleMap: Record<SectionBackgroundMediaPosition, string> = {
  center: "center center",
  top: "top center",
  bottom: "bottom center",
  left: "center left",
  right: "center right",
};

const sectionBackgroundHrefOptions = {
  allowRelative: true,
  allowHttp: true,
} as const;

const sectionImageUrlPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const sectionVideoUrlPattern = /\.(?:m4v|mov|mp4|ogg|webm)(?:[?#].*)?$/i;
const sectionRegionInstanceIdPattern = /^[a-zA-Z0-9_-]+$/;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const trimOptionalString = (value: string | undefined) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const normalizeSectionRegionInstanceId = (value: string | undefined) => {
  const trimmed = trimOptionalString(value);
  if (!trimmed) return undefined;
  const parsed = parseRepeatableSlotId(trimmed);
  if (parsed) {
    return parsed.definitionId === sectionRegionSlot.id ? parsed.instanceId : undefined;
  }
  return sectionRegionInstanceIdPattern.test(trimmed) ? trimmed : undefined;
};

const normalizeSectionRegionLabel = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeSectionRegions = (
  value: SectionRegionMeta[] | undefined
): SectionRegionMeta[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized = new Map<string, SectionRegionMeta>();
  for (const item of value) {
    const id = normalizeSectionRegionInstanceId(item?.id);
    const label = normalizeSectionRegionLabel(item?.label);
    if (!id || !label) continue;
    normalized.set(id, { id, label });
  }

  return normalized.size > 0 ? Array.from(normalized.values()) : undefined;
};

const resolveSectionRegionInstanceId = (slotId: string, instanceId?: string) =>
  normalizeSectionRegionInstanceId(instanceId) ?? normalizeSectionRegionInstanceId(slotId);

const withSectionRegions = (
  data: SectionData | undefined,
  regions: SectionRegionMeta[] | undefined
) => {
  const nextData: SectionData = data ? { ...data } : {};
  if (regions && regions.length > 0) {
    nextData.regions = regions;
    return nextData;
  }
  delete nextData.regions;
  return nextData;
};

export const resolveSectionRegionLabelValue = (
  data: SectionData | undefined,
  slotId: string,
  instanceId?: string
) => {
  const regionId = resolveSectionRegionInstanceId(slotId, instanceId);
  if (!regionId) return "";
  const regions = normalizeSectionRegions(data?.regions) ?? [];
  return regions.find((region) => region.id === regionId)?.label ?? "";
};

export const applySectionRegionLabels = <
  T extends {
    definitionId: string;
    slotId: string;
    label: string;
    instanceId?: string;
  },
>(
  targets: T[],
  data: SectionData | undefined
): T[] => {
  const regions = normalizeSectionRegions(data?.regions);
  if (!regions || regions.length === 0) return targets;

  const byId = new Map(regions.map((region) => [region.id!, region.label!] as const));
  return targets.map((target) => {
    if (target.definitionId !== sectionRegionSlot.id) return target;
    const regionId = resolveSectionRegionInstanceId(target.slotId, target.instanceId);
    const label = regionId ? byId.get(regionId) : undefined;
    return label ? { ...target, label } : target;
  });
};

export const updateSectionRegionLabelData = (
  data: SectionData | undefined,
  slotId: string,
  label: string
): SectionData => {
  const regionId = resolveSectionRegionInstanceId(slotId);
  if (!regionId) return data ? { ...data } : {};

  const currentRegions = normalizeSectionRegions(data?.regions) ?? [];
  const nextLabel = normalizeSectionRegionLabel(label);
  const nextRegions = currentRegions.filter((region) => region.id !== regionId);
  if (nextLabel) nextRegions.push({ id: regionId, label: nextLabel });
  return withSectionRegions(data, nextRegions.length > 0 ? nextRegions : undefined);
};

export const syncSectionRegionDataWithSlotMap = (
  data: SectionData | undefined,
  slotMap: Record<string, unknown>
): SectionData => {
  const currentRegions = normalizeSectionRegions(data?.regions);
  if (!currentRegions || currentRegions.length === 0) return data ? { ...data } : {};

  const validInstanceIds = new Set(
    resolveWidgetSlotTargets([sectionRegionSlot], slotMap)
      .filter((target) => target.definitionId === sectionRegionSlot.id)
      .map((target) => resolveSectionRegionInstanceId(target.slotId, target.instanceId))
      .filter((instanceId): instanceId is string => Boolean(instanceId))
  );
  const nextRegions = currentRegions.filter((region) => validInstanceIds.has(region.id ?? ""));
  return withSectionRegions(data, nextRegions.length > 0 ? nextRegions : undefined);
};

const normalizeSectionMediaHref = (value: string | undefined) =>
  normalizeWidgetSafeHref(value, sectionBackgroundHrefOptions);

export const isValidSectionMediaUrl = (value: string | undefined) =>
  !value || normalizeSectionMediaHref(value) !== undefined;

export const isCompatibleSectionMediaUrl = (
  value: string | undefined,
  mediaType: SectionBackgroundMediaType
) => {
  if (mediaType === "none") return false;
  const normalized = normalizeSectionMediaHref(value);
  if (!normalized) return false;
  return mediaType === "image"
    ? sectionImageUrlPattern.test(normalized)
    : sectionVideoUrlPattern.test(normalized);
};

const resolveRenderableSectionMediaSrc = (
  value: string | undefined,
  mediaType: Exclude<SectionBackgroundMediaType, "none">
) => {
  const normalized = normalizeSectionMediaHref(value);
  if (!normalized) return undefined;
  return mediaType === "image"
    ? sectionImageUrlPattern.test(normalized)
      ? normalized
      : undefined
    : sectionVideoUrlPattern.test(normalized)
      ? normalized
      : undefined;
};

const resolveSectionHeadingLevel = (value: string | undefined): SectionHeadingLevel => {
  if (value === "h1" || value === "h3" || value === "h4" || value === "h5" || value === "h6") {
    return value;
  }
  return "h2";
};

const resolveSectionHeadingAlign = (value: string | undefined): SectionHeadingAlign => {
  if (value === "center" || value === "right") return value;
  return "left";
};

const resolveSectionLabelSize = (value: string | undefined): SectionLabelSize => {
  if (value === "sm" || value === "md") return value;
  return "xs";
};

const resolveSectionTitleSize = (value: string | undefined): SectionTitleSize => {
  if (value === "xl" || value === "3xl") return value;
  return "2xl";
};

const resolveSectionDescriptionSize = (value: string | undefined): SectionDescriptionSize => {
  if (value === "base" || value === "lg") return value;
  return "sm";
};

const resolveSectionBackgroundMediaType = (
  value: string | undefined
): SectionBackgroundMediaType => {
  if (value === "image" || value === "video") return value;
  return "none";
};

const resolveSectionBackgroundMediaSource = (
  value: string | undefined
): SectionBackgroundMediaSource => (value === "external" ? "external" : "library");

const resolveSectionBackgroundMediaFit = (value: string | undefined): SectionBackgroundMediaFit =>
  value === "contain" ? "contain" : "cover";

const resolveSectionBackgroundMediaPosition = (
  value: string | undefined
): SectionBackgroundMediaPosition => {
  if (value === "top" || value === "bottom" || value === "left" || value === "right") {
    return value;
  }
  return "center";
};

const resolveSectionBackgroundMediaBlendMode = (
  value: string | undefined
): SectionBackgroundMediaBlendMode => {
  if (value === "multiply" || value === "screen" || value === "overlay") return value;
  return "normal";
};

const resolveSectionLayerOrder = (value: string | undefined): SectionLayerOrder =>
  value === "overlay-under-media" ? "overlay-under-media" : "media-under-overlay";

const clampMediaOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(100, Math.round(value ?? 100)));
};

const normalizeSectionBackgroundMedia = (
  value: SectionBackgroundMedia | undefined
): SectionBackgroundMedia => {
  const type = resolveSectionBackgroundMediaType(value?.type);
  const source = resolveSectionBackgroundMediaSource(value?.source);
  const posterSource =
    type === "video"
      ? resolveSectionBackgroundMediaSource(value?.posterSource ?? source)
      : undefined;

  return {
    type,
    source,
    assetId:
      type !== "none" && source === "library" ? trimOptionalString(value?.assetId) : undefined,
    src: type !== "none" ? trimOptionalString(value?.src) : undefined,
    posterSource,
    posterAssetId:
      type === "video" && posterSource === "library"
        ? trimOptionalString(value?.posterAssetId)
        : undefined,
    posterSrc: type === "video" ? trimOptionalString(value?.posterSrc) : undefined,
    title: type === "video" ? trimOptionalString(value?.title) : undefined,
    description: type === "video" ? trimOptionalString(value?.description) : undefined,
    fit: resolveSectionBackgroundMediaFit(value?.fit),
    position: resolveSectionBackgroundMediaPosition(value?.position),
    opacity: clampMediaOpacity(value?.opacity),
    blendMode: resolveSectionBackgroundMediaBlendMode(value?.blendMode),
    layerOrder: resolveSectionLayerOrder(value?.layerOrder),
  };
};

const resolveSectionBorderWidth = (value: string | undefined): SectionBorderWidth => {
  if (value === "0" || value === "1" || value === "2" || value === "3") return value;
  return sectionDefaults.style?.borderWidth ?? "0";
};

const resolveSectionRadius = (value: string | undefined): SectionRadius => {
  if (value === "none" || value === "lg" || value === "xl" || value === "2xl") return value;
  return sectionDefaults.style?.radius ?? "none";
};

const resolveOptionalSectionShadow = (value: string | undefined): SectionShadow | undefined => {
  if (value === undefined) return undefined;
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return undefined;
};

const resolveSectionMotion = (value: string | undefined): SectionMotion => {
  if (value === "fade" || value === "slide-up") return value;
  return "none";
};

const resolveRenderedSectionShadow = (
  variant: SectionVariantId,
  shadow: SectionShadow | undefined
): SectionShadow => shadow ?? (variant === "contained" ? "sm" : "none");

const resolveSectionContainerWidth = (value: string | undefined): SectionContainerWidth => {
  if (value === "wide" || value === "full") return value;
  return "content";
};

const resolveSectionMaxWidth = (value: string | undefined): SectionMaxWidth => {
  if (value === "none" || value === "4xl" || value === "5xl" || value === "7xl") return value;
  return "6xl";
};

const resolveSectionPaddingBlock = (value: string | undefined): SectionPaddingBlock => {
  if (value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
};

const resolveSectionPaddingInline = (value: string | undefined): SectionPaddingInline => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveOptionalSectionPaddingBlock = (
  value: string | undefined
): SectionPaddingBlock | undefined => {
  if (value === undefined) return undefined;
  if (value === "sm" || value === "md" || value === "lg" || value === "xl") return value;
  return undefined;
};

const resolveOptionalSectionPaddingInline = (
  value: string | undefined
): SectionPaddingInline | undefined => {
  if (value === undefined) return undefined;
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return undefined;
};

const resolveSectionMinHeight = (value: string | undefined): SectionMinHeight => {
  if (value === "compact" || value === "hero" || value === "screen") return value;
  return "none";
};

const resolveSectionRegionFlow = (value: string | undefined): SectionRegionFlow => {
  if (value === "row" || value === "grid") return value;
  return "stack";
};

const resolveSectionRegionColumns = (value: string | number | undefined): SectionRegionColumns => {
  const numericValue = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numericValue)) return "1";
  return String(Math.max(1, Math.min(8, numericValue))) as SectionRegionColumns;
};

const resolveSectionGap = (value: string | undefined): SectionGap => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
};

const resolveOptionalSectionGap = (value: string | undefined): SectionGap | undefined => {
  if (value === undefined) return undefined;
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return undefined;
};

const clampOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
};

const resolveGradientAngle = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 180;
  return Math.max(0, Math.min(360, Math.round(value ?? 180)));
};

export const sanitizeSectionAnchorId = (value: string | undefined) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export function resolveSectionVariant(variant: string): SectionVariantId {
  if (variant === "contained" || variant === "bleed") return variant;
  return "default";
}

function resolveResponsiveSpacingClass<Token extends string>(
  base: Token,
  mobileOverride: Token | undefined,
  desktopOverride: Token | undefined,
  baseClassMap: Record<Token, string>,
  desktopClassMap: Record<Token, string>
) {
  if (mobileOverride) {
    return joinClasses(baseClassMap[mobileOverride], desktopClassMap[desktopOverride ?? base]);
  }

  return joinClasses(
    baseClassMap[base],
    desktopOverride ? desktopClassMap[desktopOverride] : undefined
  );
}

export function normalizeSectionData(data: SectionData): SectionData {
  const headingDefaults = sectionDefaults.heading ?? {
    label: "",
    title: "",
    description: "",
  };
  const semanticsDefaults = sectionDefaults.semantics ?? {
    element: "section",
    anchorId: "",
    ariaLabel: "",
  };
  const layoutDefaults = sectionDefaults.layout ?? {
    containerWidth: "content",
    maxWidth: "6xl",
    paddingBlock: "md",
    paddingInline: "md",
    minHeight: "none",
    regionFlow: "stack",
    regionColumns: "1",
    headingGap: "md",
  };
  const styleDefaults = sectionDefaults.style ?? {
    backgroundColor: "transparent",
    gradientFrom: "",
    gradientTo: "",
    gradientAngle: 180,
    borderWidth: "0",
    radius: "none",
    motion: "none" as const,
    overlayColor: "#000000",
    overlayOpacity: 0,
  };

  const hasStyleObject = data.style !== undefined;
  const regionFlow = resolveSectionRegionFlow(data.layout?.regionFlow ?? layoutDefaults.regionFlow);

  return {
    regions: normalizeSectionRegions(data.regions),
    heading: {
      label: data.heading?.label ?? headingDefaults.label,
      title: data.heading?.title ?? headingDefaults.title,
      description: data.heading?.description ?? headingDefaults.description,
      level: resolveSectionHeadingLevel(data.heading?.level ?? headingDefaults.level),
      align: resolveSectionHeadingAlign(data.heading?.align ?? headingDefaults.align),
      labelSize: resolveSectionLabelSize(data.heading?.labelSize ?? headingDefaults.labelSize),
      titleSize: resolveSectionTitleSize(data.heading?.titleSize ?? headingDefaults.titleSize),
      descriptionSize: resolveSectionDescriptionSize(
        data.heading?.descriptionSize ?? headingDefaults.descriptionSize
      ),
      labelColor: resolveClearableStyleValue(data.heading?.labelColor),
      titleColor: resolveClearableStyleValue(data.heading?.titleColor),
      descriptionColor: resolveClearableStyleValue(data.heading?.descriptionColor),
    },
    layout: {
      containerWidth: resolveSectionContainerWidth(
        data.layout?.containerWidth ?? layoutDefaults.containerWidth
      ),
      maxWidth: resolveSectionMaxWidth(data.layout?.maxWidth ?? layoutDefaults.maxWidth),
      paddingBlock: resolveSectionPaddingBlock(
        data.layout?.paddingBlock ?? layoutDefaults.paddingBlock
      ),
      paddingInline: resolveSectionPaddingInline(
        data.layout?.paddingInline ?? layoutDefaults.paddingInline
      ),
      mobilePaddingBlock: resolveOptionalSectionPaddingBlock(data.layout?.mobilePaddingBlock),
      mobilePaddingInline: resolveOptionalSectionPaddingInline(data.layout?.mobilePaddingInline),
      desktopPaddingBlock: resolveOptionalSectionPaddingBlock(data.layout?.desktopPaddingBlock),
      desktopPaddingInline: resolveOptionalSectionPaddingInline(data.layout?.desktopPaddingInline),
      minHeight: resolveSectionMinHeight(data.layout?.minHeight ?? layoutDefaults.minHeight),
      regionFlow,
      regionColumns:
        regionFlow === "grid"
          ? resolveSectionRegionColumns(data.layout?.regionColumns ?? layoutDefaults.regionColumns)
          : "1",
      headingGap: resolveSectionGap(data.layout?.headingGap ?? layoutDefaults.headingGap),
      regionGap: resolveOptionalSectionGap(data.layout?.regionGap ?? layoutDefaults.regionGap),
    },
    semantics: {
      element: data.semantics?.element === "div" ? "div" : "section",
      anchorId: sanitizeSectionAnchorId(data.semantics?.anchorId ?? semanticsDefaults.anchorId),
      ariaLabel: data.semantics?.ariaLabel ?? semanticsDefaults.ariaLabel,
    },
    style: {
      backgroundColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.backgroundColor)
        : styleDefaults.backgroundColor,
      gradientFrom: data.style?.gradientFrom ?? styleDefaults.gradientFrom,
      gradientTo: data.style?.gradientTo ?? styleDefaults.gradientTo,
      gradientAngle: resolveGradientAngle(data.style?.gradientAngle),
      borderColor: data.style?.borderColor ?? styleDefaults.borderColor,
      borderWidth: resolveSectionBorderWidth(data.style?.borderWidth),
      radius: resolveSectionRadius(data.style?.radius),
      shadow: resolveOptionalSectionShadow(data.style?.shadow),
      motion: resolveSectionMotion(data.style?.motion ?? styleDefaults.motion),
      overlayColor: data.style?.overlayColor ?? styleDefaults.overlayColor,
      overlayOpacity: clampOpacity(data.style?.overlayOpacity),
      backgroundMedia: normalizeSectionBackgroundMedia(data.style?.backgroundMedia),
    },
  };
}

export function SectionBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
  renderBlock,
}: {
  data: SectionData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
}) {
  const resolvedVariant = resolveSectionVariant(variant);
  const normalized = normalizeSectionData(data);
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const slotTargets = resolveWidgetSlotTargets([sectionRegionSlot], slotMap).filter(
    (slot) => slot.definitionId === sectionRegionSlot.id
  );
  const heading = normalized.heading ?? sectionDefaults.heading!;
  const layout = normalized.layout ?? sectionDefaults.layout!;
  const headingLabelColor = resolveClearableStyleValue(heading.labelColor);
  const headingTitleColor = resolveClearableStyleValue(heading.titleColor);
  const headingDescriptionColor = resolveClearableStyleValue(heading.descriptionColor);
  const semantics = normalized.semantics ?? sectionDefaults.semantics!;
  const style = normalized.style ?? sectionDefaults.style!;
  const resolvedShadow = resolveRenderedSectionShadow(resolvedVariant, style.shadow);
  const resolvedMotion = resolveSectionMotion(style.motion);
  const resolvedPaddingBlockClass = resolveResponsiveSpacingClass(
    layout.paddingBlock ?? "md",
    layout.mobilePaddingBlock,
    layout.desktopPaddingBlock,
    paddingBlockClassMap,
    desktopPaddingBlockClassMap
  );
  const resolvedPaddingInlineClass = resolveResponsiveSpacingClass(
    layout.paddingInline ?? "md",
    layout.mobilePaddingInline,
    layout.desktopPaddingInline,
    paddingInlineClassMap,
    desktopPaddingInlineClassMap
  );

  const resolvedRegionGap = layout.regionGap ?? regionGapVariantFallbackMap[resolvedVariant];
  const backgroundMedia = style.backgroundMedia ??
    sectionDefaults.style?.backgroundMedia ?? {
      type: "none",
      source: "library",
      fit: "cover",
      position: "center",
      opacity: 100,
      blendMode: "normal",
      layerOrder: "media-under-overlay",
    };
  const wrapperClass = joinClasses(
    containerWidthClassMap[layout.containerWidth ?? "content"],
    maxWidthClassMap[layout.maxWidth ?? "6xl"],
    layout.containerWidth === "full" && resolvedVariant === "bleed"
      ? undefined
      : resolvedPaddingInlineClass
  );

  const surfaceFrameClass = joinClasses(
    "relative w-full",
    minHeightClassMap[layout.minHeight ?? "none"],
    resolvedPaddingBlockClass,
    shadowClassMap[resolvedShadow],
    motionClassMap[resolvedMotion]
  );
  const clippedSurfaceClass = joinClasses(
    "pointer-events-none absolute inset-0 overflow-hidden",
    radiusClassMap[style.radius ?? "none"]
  );
  const contentClass = joinClasses(
    "relative z-[2] flex flex-col",
    gapClassMap[layout.headingGap ?? "md"]
  );
  const regionLayoutClass = joinClasses(
    regionFlowClassMap[layout.regionFlow ?? "stack"],
    layout.regionFlow === "grid" ? regionColumnClassMap[layout.regionColumns ?? "1"] : undefined,
    gapClassMap[resolvedRegionGap]
  );
  const regionItemClass = regionItemClassMap[layout.regionFlow ?? "stack"];

  const hasGradient =
    (style.gradientFrom ?? "").trim().length > 0 && (style.gradientTo ?? "").trim().length > 0;
  const hasHeading =
    (heading.label ?? "").trim().length > 0 ||
    (heading.title ?? "").trim().length > 0 ||
    (heading.description ?? "").trim().length > 0;
  const overlayOpacity = clampOpacity(style.overlayOpacity);
  const overlayVisible = overlayOpacity > 0;
  const mediaOpacity = clampMediaOpacity(backgroundMedia.opacity);
  const backgroundLayerOrder = backgroundMedia.layerOrder ?? "media-under-overlay";
  const mediaLayerClass = joinClasses(
    "pointer-events-none absolute inset-0",
    backgroundLayerOrder === "overlay-under-media" ? "z-[1]" : "z-[0]"
  );
  const overlayLayerClass = joinClasses(
    "absolute inset-0",
    backgroundLayerOrder === "overlay-under-media" ? "z-[0]" : "z-[1]"
  );
  const backgroundImageSrc =
    backgroundMedia.type === "image"
      ? resolveRenderableSectionMediaSrc(backgroundMedia.src, "image")
      : undefined;
  const backgroundVideoSrc =
    backgroundMedia.type === "video"
      ? resolveRenderableSectionMediaSrc(backgroundMedia.src, "video")
      : undefined;
  const backgroundVideoPoster =
    backgroundMedia.type === "video"
      ? resolveRenderableSectionMediaSrc(backgroundMedia.posterSrc, "image")
      : undefined;
  const renderedBackgroundMediaType = backgroundVideoSrc
    ? "video"
    : backgroundImageSrc
      ? "image"
      : "none";

  const surfaceStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.backgroundColor),
      backgroundImage: hasGradient
        ? `linear-gradient(${resolveGradientAngle(style.gradientAngle)}deg, ${style.gradientFrom}, ${style.gradientTo})`
        : undefined,
      borderColor: style.borderColor ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: borderWidthValueMap[style.borderWidth ?? "0"] ?? "0px",
    }) ?? {};
  const backgroundImageStyle: CSSProperties =
    compactStyle({
      backgroundImage: backgroundImageSrc ? `url(${backgroundImageSrc})` : undefined,
      backgroundSize: backgroundImageSrc ? (backgroundMedia.fit ?? "cover") : undefined,
      backgroundPosition: backgroundImageSrc
        ? backgroundMediaPositionStyleMap[backgroundMedia.position ?? "center"]
        : undefined,
      opacity: backgroundImageSrc ? mediaOpacity / 100 : undefined,
      mixBlendMode:
        backgroundImageSrc && backgroundMedia.blendMode !== "normal"
          ? backgroundMedia.blendMode
          : undefined,
    }) ?? {};
  const backgroundVideoStyle: CSSProperties =
    compactStyle({
      objectPosition: backgroundVideoSrc
        ? backgroundMediaPositionStyleMap[backgroundMedia.position ?? "center"]
        : undefined,
      opacity: backgroundVideoSrc ? mediaOpacity / 100 : undefined,
      mixBlendMode:
        backgroundVideoSrc && backgroundMedia.blendMode !== "normal"
          ? backgroundMedia.blendMode
          : undefined,
    }) ?? {};

  const Element = semantics.element === "div" ? "div" : "section";
  const anchorId = (semantics.anchorId ?? "").trim();
  const ariaLabel = (semantics.ariaLabel ?? "").trim();

  return (
    <Element
      id={anchorId || undefined}
      aria-label={ariaLabel || undefined}
      className={wrapperClass}
      data-section-variant={resolvedVariant}
      data-section-container-width={layout.containerWidth ?? "content"}
      data-section-max-width={layout.maxWidth ?? "6xl"}
      data-section-min-height={layout.minHeight ?? "none"}
      data-section-region-flow={layout.regionFlow ?? "stack"}
      data-section-region-columns={layout.regionColumns ?? "1"}
      data-section-heading-gap={layout.headingGap ?? "md"}
      data-section-region-gap={layout.regionGap ?? "match-variant"}
      data-section-shadow={resolvedShadow}
      data-section-motion={resolvedMotion}
      data-section-background-media={renderedBackgroundMediaType}
      data-section-layer-order={backgroundLayerOrder}
      data-section-regions={String(slotTargets.length)}
      data-section-element={semantics.element ?? "section"}
    >
      <div className={surfaceFrameClass}>
        <div className={clippedSurfaceClass} style={surfaceStyle} aria-hidden="true">
          {backgroundImageSrc ? (
            <div
              data-section-background-media="image"
              className={mediaLayerClass}
              style={backgroundImageStyle}
            />
          ) : null}
          {backgroundVideoSrc ? (
            <video
              data-section-background-media="video"
              aria-hidden="true"
              autoPlay
              loop
              muted
              playsInline
              poster={backgroundVideoPoster}
              className={joinClasses(
                mediaLayerClass,
                "h-full w-full",
                backgroundMediaFitClassMap[backgroundMedia.fit ?? "cover"]
              )}
              style={backgroundVideoStyle}
            >
              <source src={backgroundVideoSrc} />
            </video>
          ) : null}
          {overlayVisible ? (
            <div
              data-section-background-overlay="true"
              className={overlayLayerClass}
              style={{
                backgroundColor: style.overlayColor ?? "#000000",
                opacity: overlayOpacity / 100,
              }}
            />
          ) : null}
        </div>

        <div className={contentClass}>
          {hasHeading ? (
            <header
              className={joinClasses("space-y-2", headingAlignClassMap[heading.align ?? "left"])}
            >
              {(heading.label ?? "").trim().length > 0 ? (
                <p
                  className={joinClasses(
                    labelSizeClassMap[heading.labelSize ?? "xs"],
                    "font-semibold uppercase tracking-[0.2em]",
                    headingLabelColor ? undefined : "text-[var(--color-text)]/70"
                  )}
                  style={compactStyle({ color: headingLabelColor })}
                >
                  {heading.label}
                </p>
              ) : null}
              {(heading.title ?? "").trim().length > 0
                ? (() => {
                    const HeadingTag = heading.level ?? "h2";
                    return (
                      <HeadingTag
                        className={joinClasses(
                          titleSizeClassMap[heading.titleSize ?? "2xl"],
                          "font-semibold",
                          headingTitleColor ? undefined : "text-[var(--color-text)]"
                        )}
                        style={compactStyle({ color: headingTitleColor })}
                      >
                        {heading.title}
                      </HeadingTag>
                    );
                  })()
                : null}
              {(heading.description ?? "").trim().length > 0 ? (
                <p
                  className={joinClasses(
                    descriptionSizeClassMap[heading.descriptionSize ?? "sm"],
                    headingDescriptionColor ? undefined : "text-[var(--color-text)]/75"
                  )}
                  style={compactStyle({ color: headingDescriptionColor })}
                >
                  {heading.description}
                </p>
              ) : null}
            </header>
          ) : null}

          <div className={regionLayoutClass}>
            {slotTargets.map((target) => {
              const slotBlocks = Array.isArray(slotMap[target.slotId])
                ? slotMap[target.slotId]!
                : [];

              return (
                <div
                  key={target.slotId}
                  className={joinClasses(regionItemClass, "space-y-4")}
                  data-section-region={target.slotId}
                >
                  {slotBlocks.length > 0
                    ? slotBlocks.map((block) =>
                        renderBlock ? (
                          <div key={block.id}>{renderBlock(block, renderContext)}</div>
                        ) : (
                          <WidgetRenderer
                            key={block.id}
                            block={block}
                            previewDevice={previewDevice}
                            renderContext={renderContext}
                          />
                        )
                      )
                    : renderEditorPlaceholder("Empty region.", renderContext)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Element>
  );
}

export function createSectionWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<SectionData>>;
  visual: ComponentType<WidgetEditorProps<SectionData>>;
  advanced: ComponentType<WidgetEditorProps<SectionData>>;
}): WidgetDefinition<SectionData> {
  return {
    type: "section",
    title: "Section",
    description: "Semantic layout wrapper with repeatable region slots.",
    category: "layout",
    slots: [sectionRegionSlot],
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Standard width section wrapper for grouped content blocks.",
      },
      {
        id: "contained",
        label: "Contained",
        description: "Compact section surface with internal spacing emphasis.",
      },
      {
        id: "bleed",
        label: "Bleed",
        description: "Full-width section for broad horizontal compositions.",
      },
    ],
    schema: sectionSchema,
    defaults: sectionDefaults,
    editor: editors,
    editorContract: sectionEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
      slotControlSection: {
        id: "section.regions",
        title: "Regions",
        description: "Add or remove repeatable region slots, then populate them from the canvas.",
      },
    },
    render: SectionBlock,
  };
}
