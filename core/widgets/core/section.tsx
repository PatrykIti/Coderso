import type { CSSProperties, ComponentType, ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import { resolveWidgetSlotTargets } from "../slots";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type SectionVariantId = "default" | "contained" | "bleed";
export type SectionElement = "section" | "div";
export type SectionBorderWidth = "0" | "1" | "2" | "3";
export type SectionRadius = "none" | "lg" | "xl" | "2xl";
export type SectionContainerWidth = "content" | "wide" | "full";
export type SectionMaxWidth = "none" | "4xl" | "5xl" | "6xl" | "7xl";
export type SectionPaddingBlock = "sm" | "md" | "lg" | "xl";
export type SectionPaddingInline = "none" | "sm" | "md" | "lg";

export type SectionData = {
  heading?: {
    label?: string;
    title?: string;
    description?: string;
  };
  layout?: {
    containerWidth?: SectionContainerWidth;
    maxWidth?: SectionMaxWidth;
    paddingBlock?: SectionPaddingBlock;
    paddingInline?: SectionPaddingInline;
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
    overlayColor?: string;
    overlayOpacity?: number;
  };
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
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        containerWidth: { enum: ["content", "wide", "full"] },
        maxWidth: { enum: ["none", "4xl", "5xl", "6xl", "7xl"] },
        paddingBlock: { enum: ["sm", "md", "lg", "xl"] },
        paddingInline: { enum: ["none", "sm", "md", "lg"] },
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
        overlayColor: { type: "string" },
        overlayOpacity: { type: "number" },
      },
    },
  },
};

export const sectionDefaults: SectionData = {
  heading: {
    label: "",
    title: "",
    description: "",
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
  },
  style: {
    backgroundColor: "transparent",
    gradientFrom: "",
    gradientTo: "",
    gradientAngle: 180,
    borderColor: "var(--color-border)",
    borderWidth: "0",
    radius: "none",
    overlayColor: "#000000",
    overlayOpacity: 0,
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

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const resolveSectionBorderWidth = (value: string | undefined): SectionBorderWidth => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const resolveSectionRadius = (value: string | undefined): SectionRadius => {
  if (value === "none" || value === "lg" || value === "xl") return value;
  return "2xl";
};

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
  };
  const styleDefaults = sectionDefaults.style ?? {
    backgroundColor: "transparent",
    gradientFrom: "",
    gradientTo: "",
    gradientAngle: 180,
    borderColor: "var(--color-border)",
    borderWidth: "0",
    radius: "none",
    overlayColor: "#000000",
    overlayOpacity: 0,
  };

  const hasStyleObject = data.style !== undefined;

  return {
    heading: {
      label: data.heading?.label ?? headingDefaults.label,
      title: data.heading?.title ?? headingDefaults.title,
      description: data.heading?.description ?? headingDefaults.description,
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
      overlayColor: data.style?.overlayColor ?? styleDefaults.overlayColor,
      overlayOpacity: clampOpacity(data.style?.overlayOpacity),
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
  const semantics = normalized.semantics ?? sectionDefaults.semantics!;
  const style = normalized.style ?? sectionDefaults.style!;

  const regionGapClass =
    resolvedVariant === "contained" ? "gap-4" : resolvedVariant === "bleed" ? "gap-8" : "gap-6";
  const wrapperClass = joinClasses(
    containerWidthClassMap[layout.containerWidth ?? "content"],
    maxWidthClassMap[layout.maxWidth ?? "6xl"],
    layout.containerWidth === "full" && resolvedVariant === "bleed"
      ? undefined
      : paddingInlineClassMap[layout.paddingInline ?? "md"]
  );

  const surfaceFrameClass = joinClasses(
    "relative w-full",
    paddingBlockClassMap[layout.paddingBlock ?? "md"],
    resolvedVariant === "contained" ? "shadow-sm" : undefined
  );
  const clippedSurfaceClass = joinClasses(
    "pointer-events-none absolute inset-0 overflow-hidden",
    radiusClassMap[style.radius ?? "none"]
  );

  const hasGradient =
    (style.gradientFrom ?? "").trim().length > 0 && (style.gradientTo ?? "").trim().length > 0;
  const hasHeading =
    (heading.label ?? "").trim().length > 0 ||
    (heading.title ?? "").trim().length > 0 ||
    (heading.description ?? "").trim().length > 0;
  const overlayOpacity = clampOpacity(style.overlayOpacity);
  const overlayVisible = overlayOpacity > 0;

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
      data-section-regions={String(slotTargets.length)}
      data-section-element={semantics.element ?? "section"}
    >
      <div className={surfaceFrameClass}>
        <div className={clippedSurfaceClass} style={surfaceStyle} aria-hidden="true">
          {overlayVisible ? (
            <div
              className="absolute inset-0 z-[0]"
              style={{
                backgroundColor: style.overlayColor ?? "#000000",
                opacity: overlayOpacity / 100,
              }}
            />
          ) : null}
        </div>

        <div className="relative z-[1] flex flex-col gap-4">
          {hasHeading ? (
            <header className="space-y-2">
              {(heading.label ?? "").trim().length > 0 ? (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/70">
                  {heading.label}
                </p>
              ) : null}
              {(heading.title ?? "").trim().length > 0 ? (
                <h2 className="text-2xl font-semibold text-[var(--color-text)]">{heading.title}</h2>
              ) : null}
              {(heading.description ?? "").trim().length > 0 ? (
                <p className="text-sm text-[var(--color-text)]/75">{heading.description}</p>
              ) : null}
            </header>
          ) : null}

          <div className={joinClasses("flex flex-col", regionGapClass)}>
            {slotTargets.map((target) => {
              const slotBlocks = Array.isArray(slotMap[target.slotId])
                ? slotMap[target.slotId]!
                : [];

              return (
                <div key={target.slotId} className="space-y-4" data-section-region={target.slotId}>
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
