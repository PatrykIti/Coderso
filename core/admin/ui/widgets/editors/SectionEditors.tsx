import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { listMediaCached } from "@/services/mediaClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import { normalizeCssColorValue } from "../../../../services/theme/cssColorContract";
import {
  isCompatibleSectionMediaUrl,
  sanitizeSectionAnchorId,
  type SectionBackgroundMediaBlendMode,
  type SectionBackgroundMediaFit,
  type SectionBackgroundMediaPosition,
  type SectionBackgroundMediaSource,
  type SectionBackgroundMediaType,
  type SectionContainerWidth,
  type SectionDescriptionSize,
  type SectionGap,
  type SectionHeadingAlign,
  type SectionHeadingLevel,
  type SectionLabelSize,
  type SectionLayerOrder,
  type SectionTitleSize,
  normalizeSectionData,
  resolveSectionVariant,
  sectionDefaults,
  type SectionBorderWidth,
  type SectionData,
  type SectionElement,
  type SectionMaxWidth,
  type SectionMinHeight,
  type SectionPaddingBlock,
  type SectionPaddingInline,
  type SectionRadius,
  type SectionRegionColumns,
  type SectionRegionFlow,
  type SectionMotion,
  type SectionShadow,
  type SectionVariantId,
} from "../../../../widgets/core/section";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow as BaseWidgetControlRow,
  WidgetEditorSection,
  type WidgetControlRowProps,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: SectionVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "default",
    label: "Default",
    description: "Balanced section wrapper for most grouped content.",
  },
  {
    id: "contained",
    label: "Contained",
    description: "Compact panel-style section with stronger framing.",
  },
  {
    id: "bleed",
    label: "Bleed",
    description:
      "Expanded section band. Still uses current wrapper settings; pair with Full-width wrapper + No max width for true edge-to-edge.",
  },
];

const elementOptions: Array<{ id: SectionElement; label: string }> = [
  { id: "section", label: "Page section" },
  { id: "div", label: "Neutral wrapper" },
];

const borderWidthOptions: Array<{ id: SectionBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: SectionRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "2xl", label: "2XL" },
];

const shadowOptions: Array<{ id: SectionShadow; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Soft" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const motionOptions: Array<{ id: SectionMotion; label: string }> = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade in" },
  { id: "slide-up", label: "Slide up" },
];

const containerWidthOptions: Array<{ id: SectionContainerWidth; label: string }> = [
  { id: "content", label: "Content wrapper" },
  { id: "wide", label: "Wide alias (same wrapper)" },
  { id: "full", label: "Full-width wrapper" },
];

const maxWidthOptions: Array<{ id: SectionMaxWidth; label: string }> = [
  { id: "none", label: "No max width (follow container)" },
  { id: "4xl", label: "4XL (56rem / 896px)" },
  { id: "5xl", label: "5XL (64rem / 1024px)" },
  { id: "6xl", label: "6XL (72rem / 1152px)" },
  { id: "7xl", label: "7XL (80rem / 1280px)" },
];

const paddingBlockOptions: Array<{ id: SectionPaddingBlock; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const paddingInlineOptions: Array<{ id: SectionPaddingInline; label: string }> = [
  { id: "none", label: "No side padding" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const sectionResponsivePaddingMatchValue = "__match_base__";

const responsivePaddingBlockOptions: Array<{
  id: SectionPaddingBlock | typeof sectionResponsivePaddingMatchValue;
  label: string;
}> = [{ id: sectionResponsivePaddingMatchValue, label: "Match base" }, ...paddingBlockOptions];

const responsivePaddingInlineOptions: Array<{
  id: SectionPaddingInline | typeof sectionResponsivePaddingMatchValue;
  label: string;
}> = [{ id: sectionResponsivePaddingMatchValue, label: "Match base" }, ...paddingInlineOptions];

const minHeightOptions: Array<{ id: SectionMinHeight; label: string }> = [
  { id: "none", label: "No minimum" },
  { id: "compact", label: "Compact band" },
  { id: "hero", label: "Hero" },
  { id: "screen", label: "Screen" },
];

const regionFlowOptions: Array<{ id: SectionRegionFlow; label: string }> = [
  { id: "stack", label: "Stack" },
  { id: "row", label: "Row" },
  { id: "grid", label: "Grid" },
];

const regionColumnOptions: Array<{ id: SectionRegionColumns; label: string }> = [
  { id: "1", label: "1 column" },
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
  { id: "4", label: "4 columns" },
  { id: "5", label: "5 columns" },
  { id: "6", label: "6 columns" },
  { id: "7", label: "7 columns" },
  { id: "8", label: "8 columns" },
];

const gapOptions: Array<{ id: SectionGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const headingLevelOptions: Array<{ id: SectionHeadingLevel; label: string }> = [
  { id: "h1", label: "H1" },
  { id: "h2", label: "H2" },
  { id: "h3", label: "H3" },
  { id: "h4", label: "H4" },
  { id: "h5", label: "H5" },
  { id: "h6", label: "H6" },
];

const headingAlignOptions: Array<{ id: SectionHeadingAlign; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const labelSizeOptions: Array<{ id: SectionLabelSize; label: string }> = [
  { id: "xs", label: "Compact" },
  { id: "sm", label: "Default" },
  { id: "md", label: "Large" },
];

const titleSizeOptions: Array<{ id: SectionTitleSize; label: string }> = [
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "3XL" },
];

const descriptionSizeOptions: Array<{ id: SectionDescriptionSize; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "base", label: "Default" },
  { id: "lg", label: "Large" },
];

const backgroundMediaTypeOptions: Array<{
  id: SectionBackgroundMediaType;
  label: string;
}> = [
  { id: "none", label: "None" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

const backgroundMediaFitOptions: Array<{
  id: SectionBackgroundMediaFit;
  label: string;
}> = [
  { id: "cover", label: "Cover" },
  { id: "contain", label: "Contain" },
];

const backgroundMediaPositionOptions: Array<{
  id: SectionBackgroundMediaPosition;
  label: string;
}> = [
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

const backgroundMediaBlendModeOptions: Array<{
  id: SectionBackgroundMediaBlendMode;
  label: string;
}> = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
];

const backgroundMediaLayerOrderOptions: Array<{
  id: SectionLayerOrder;
  label: string;
}> = [
  { id: "media-under-overlay", label: "Media under overlay" },
  { id: "overlay-under-media", label: "Overlay under media" },
];

const sectionRegionGapAutoValue = "__match_variant__";
const sectionShadowAutoValue = "__match_variant__";

const sectionShadowOptions: Array<{
  id: SectionShadow | typeof sectionShadowAutoValue;
  label: string;
}> = [{ id: sectionShadowAutoValue, label: "Match variant" }, ...shadowOptions];

const sectionSurfacePreviewRadiusClassMap: Record<SectionRadius, string> = {
  none: "",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const sectionSurfacePreviewShadowClassMap: Record<SectionShadow, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const sectionShadowDisplayLabelMap: Record<SectionShadow, string> = {
  none: "None",
  sm: "Soft",
  md: "Medium",
  lg: "Large",
  xl: "Extra large",
};

const sectionMotionDisplayLabelMap: Record<SectionMotion, string> = {
  none: "None",
  fade: "Fade in",
  "slide-up": "Slide up",
};

const regionGapOptions: Array<{
  id: SectionGap | typeof sectionRegionGapAutoValue;
  label: string;
}> = [{ id: sectionRegionGapAutoValue, label: "Match variant" }, ...gapOptions];

type HeadingData = NonNullable<SectionData["heading"]>;
type LayoutData = NonNullable<SectionData["layout"]>;
type SemanticsData = NonNullable<SectionData["semantics"]>;
type StyleData = NonNullable<SectionData["style"]>;
type BackgroundMediaData = NonNullable<StyleData["backgroundMedia"]>;
type SectionPresetId =
  | "standard-content"
  | "framed-panel"
  | "edge-to-edge"
  | "hero-band"
  | "two-column-region-group";
type SectionPresetOption = {
  id: SectionPresetId;
  label: string;
  description: string;
  variant: SectionVariantId;
  patch: {
    heading?: Partial<HeadingData>;
    layout?: Partial<LayoutData>;
    style?: Partial<StyleData>;
  };
};

const sectionControlPathById: Record<string, string | undefined> = {
  "section.wizard.variant": "variant",
};

function WidgetControlRow({ id, path, ownership, ...props }: WidgetControlRowProps) {
  const resolvedPath =
    path ??
    (ownership === "action" || ownership === "preview"
      ? undefined
      : (sectionControlPathById[id] ?? id.replace(/^section\./, "")));
  const resolvedOwnership = ownership;

  return (
    <BaseWidgetControlRow id={id} path={resolvedPath} ownership={resolvedOwnership} {...props} />
  );
}

const sectionHeadingDefaults: HeadingData = {
  label: "",
  title: "",
  description: "",
  level: "h2",
  align: "left",
  labelSize: "xs",
  titleSize: "2xl",
  descriptionSize: "sm",
};

const sectionBackgroundMediaDefaults: BackgroundMediaData = {
  type: "none",
  source: "library",
  fit: "cover",
  position: "center",
  opacity: 100,
  blendMode: "normal",
  layerOrder: "media-under-overlay",
};

const sectionPresetOptions: SectionPresetOption[] = [
  {
    id: "standard-content",
    label: "Standard content",
    description: "Balanced wrapper for most page groups with legacy-safe spacing.",
    variant: "default",
    patch: {
      heading: { align: "left" },
      layout: {
        containerWidth: "content",
        maxWidth: "6xl",
        paddingBlock: "md",
        paddingInline: "md",
        minHeight: "none",
        regionFlow: "stack",
        regionColumns: "1",
        headingGap: "md",
        regionGap: undefined,
      },
      style: { borderWidth: "0", radius: "none" },
    },
  },
  {
    id: "framed-panel",
    label: "Framed panel",
    description: "Contained panel with a comfortable measure and light framing.",
    variant: "contained",
    patch: {
      heading: { align: "left" },
      layout: {
        containerWidth: "content",
        maxWidth: "5xl",
        paddingBlock: "lg",
        paddingInline: "lg",
        minHeight: "none",
        regionFlow: "stack",
        regionColumns: "1",
        headingGap: "lg",
        regionGap: undefined,
      },
      style: { borderWidth: "1", radius: "xl" },
    },
  },
  {
    id: "edge-to-edge",
    label: "Edge-to-edge",
    description: "Bleed surface with the full-width wrapper and no max width already applied.",
    variant: "bleed",
    patch: {
      heading: { align: "left" },
      layout: {
        containerWidth: "full",
        maxWidth: "none",
        paddingBlock: "lg",
        paddingInline: "lg",
        minHeight: "none",
        regionFlow: "stack",
        regionColumns: "1",
        headingGap: "lg",
        regionGap: undefined,
      },
      style: { borderWidth: "0", radius: "none" },
    },
  },
  {
    id: "hero-band",
    label: "Hero band",
    description: "Tall lead section with centered heading and generous spacing.",
    variant: "bleed",
    patch: {
      heading: { align: "center" },
      layout: {
        containerWidth: "full",
        maxWidth: "none",
        paddingBlock: "xl",
        paddingInline: "lg",
        minHeight: "hero",
        regionFlow: "stack",
        regionColumns: "1",
        headingGap: "xl",
        regionGap: undefined,
      },
      style: { borderWidth: "0", radius: "none" },
    },
  },
  {
    id: "two-column-region-group",
    label: "Two-column region group",
    description: "Default surface with a safe two-column grid for grouped content.",
    variant: "default",
    patch: {
      heading: { align: "left" },
      layout: {
        containerWidth: "content",
        maxWidth: "7xl",
        paddingBlock: "lg",
        paddingInline: "md",
        minHeight: "none",
        regionFlow: "grid",
        regionColumns: "2",
        headingGap: "lg",
        regionGap: "lg",
      },
      style: { borderWidth: "0", radius: "none" },
    },
  },
];

const clampOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
};

const clampAngle = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 180;
  return Math.max(0, Math.min(360, Math.round(value ?? 180)));
};

const clampMediaOpacity = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(100, Math.round(value ?? 100)));
};

const resolveBackgroundMedia = (style: SectionData["style"] | undefined): BackgroundMediaData => {
  const media = style?.backgroundMedia;
  return {
    type: media?.type ?? sectionBackgroundMediaDefaults.type,
    source: media?.source ?? sectionBackgroundMediaDefaults.source,
    assetId: media?.assetId,
    src: media?.src,
    posterSource: media?.posterSource ?? media?.source ?? "library",
    posterAssetId: media?.posterAssetId,
    posterSrc: media?.posterSrc,
    title: media?.title,
    description: media?.description,
    fit: media?.fit ?? sectionBackgroundMediaDefaults.fit,
    position: media?.position ?? sectionBackgroundMediaDefaults.position,
    opacity: clampMediaOpacity(media?.opacity),
    blendMode: media?.blendMode ?? sectionBackgroundMediaDefaults.blendMode,
    layerOrder: media?.layerOrder ?? sectionBackgroundMediaDefaults.layerOrder,
  };
};

function normalizeValue(value: SectionData): SectionData {
  return normalizeSectionData(value);
}

const resolveRenderedSectionShadow = (
  variant: SectionVariantId,
  shadow: SectionShadow | undefined
): SectionShadow => shadow ?? (variant === "contained" ? "sm" : "none");

function SectionSurfacePreview({ value, variant }: { value: SectionData; variant: string }) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? sectionDefaults.style ?? {};
  const resolvedVariant = resolveSectionVariant(variant);
  const resolvedShadow = resolveRenderedSectionShadow(resolvedVariant, style.shadow);
  const resolvedMotion = style.motion ?? "none";
  const backgroundColor = normalizeCssColorValue(style.backgroundColor, "inherited-render");
  const borderColor = normalizeCssColorValue(style.borderColor, "inherited-render");
  const overlayColor = normalizeCssColorValue(style.overlayColor, "inherited-render");
  const parsedGradientFrom = normalizeCssColorValue(style.gradientFrom, "inherited-render");
  const parsedGradientTo = normalizeCssColorValue(style.gradientTo, "inherited-render");
  const gradientFrom = parsedGradientFrom === "inherit" ? undefined : parsedGradientFrom;
  const gradientTo = parsedGradientTo === "inherit" ? undefined : parsedGradientTo;
  const hasGradient = Boolean(gradientFrom && gradientTo);
  const overlayOpacity = clampOpacity(style.overlayOpacity);
  const overlayVisible = overlayOpacity > 0;

  return (
    <div className="space-y-2" data-section-surface-preview-panel="true">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Surface preview</p>
        <p>
          Shadow {sectionShadowDisplayLabelMap[resolvedShadow]} · Motion{" "}
          {sectionMotionDisplayLabelMap[resolvedMotion]}
        </p>
      </div>
      <div
        data-section-surface-preview="true"
        data-section-surface-preview-shadow={resolvedShadow}
        data-section-surface-preview-motion={resolvedMotion}
        className={cn(
          "relative h-24 overflow-hidden border bg-background/40",
          sectionSurfacePreviewRadiusClassMap[style.radius ?? "none"],
          sectionSurfacePreviewShadowClassMap[resolvedShadow]
        )}
        style={{
          backgroundColor: backgroundColor ?? "transparent",
          backgroundImage: hasGradient
            ? `linear-gradient(${clampAngle(style.gradientAngle)}deg, ${gradientFrom}, ${gradientTo})`
            : undefined,
          borderColor: borderColor ?? "var(--color-border)",
          borderStyle: "solid",
          borderWidth: `${style.borderWidth ?? "0"}px`,
        }}
      >
        {overlayVisible ? (
          <div
            data-section-surface-preview-overlay="true"
            className="absolute inset-0"
            style={{
              backgroundColor: overlayColor ?? "#000000",
              opacity: overlayOpacity / 100,
            }}
          />
        ) : null}
        <div className="absolute inset-x-3 bottom-3 z-[1] flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/85">
          <span>
            {hasGradient ? `Gradient ${clampAngle(style.gradientAngle)}°` : "Solid surface"}
          </span>
          <span>{overlayVisible ? `Overlay ${overlayOpacity}%` : "No overlay"}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Preview reflects current background, gradient, overlay, border, radius, and effective shadow
        without saving extra state.
      </p>
    </div>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: SectionVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function SectionPresetCards({ onApply }: { onApply?: (preset: SectionPresetOption) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {sectionPresetOptions.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply?.(preset)}
            className="rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/50 hover:bg-muted/20"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-tight">{preset.label}</p>
              <Badge className="shrink-0" variant="outline">
                Apply
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Presets keep your current heading copy and region slot content while resetting only
        supported Section tokens.
      </p>
    </div>
  );
}

type SectionSliderFieldProps = {
  id: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  nudgeStep: number;
  unit: string;
  sliderKey: string;
  sliderLabel: string;
  onChange: (next: number) => void;
};

function SectionSliderField({
  id,
  ariaLabelledby,
  ariaDescribedby,
  value,
  min,
  max,
  step,
  nudgeStep,
  unit,
  sliderKey,
  sliderLabel,
  onChange,
}: SectionSliderFieldProps) {
  return (
    <div className="space-y-3" data-section-range-control={sliderKey}>
      <div className="flex items-center justify-between gap-3">
        <span data-section-range-value={sliderKey}>
          <Badge className="shrink-0" variant="outline">
            {value}
            {unit}
          </Badge>
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            aria-label={`Decrease ${sliderLabel} by ${nudgeStep}${unit}`}
            data-section-stepper={`${sliderKey}-decrease`}
            onClick={() => onChange(value - nudgeStep)}
          >
            -{nudgeStep}
            {unit}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            aria-label={`Increase ${sliderLabel} by ${nudgeStep}${unit}`}
            data-section-stepper={`${sliderKey}-increase`}
            onClick={() => onChange(value + nudgeStep)}
          >
            +{nudgeStep}
            {unit}
          </Button>
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={`${sliderLabel} slider`}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        data-section-slider={sliderKey}
        onValueChange={(next) => {
          const [nextValue] = next;
          onChange(typeof nextValue === "number" ? nextValue : value);
        }}
      />
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          className="h-9 w-24"
          value={String(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
        />
        <span className="text-xs text-muted-foreground">Exact value</span>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  fallbackLabel,
  pickerFallback,
  onClear,
  allowInheritKeyword = true,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  fallbackLabel: string;
  pickerFallback: string;
  onClear?: () => void;
  allowInheritKeyword?: boolean;
}) {
  return (
    <WidgetControlRow id={id} label={label}>
      {() => (
        <SharedColorControl
          label={label}
          value={value}
          onChange={onChange}
          onSwatchChange={onChange}
          onClear={onClear}
          pickerFallback={pickerFallback}
          showValueInput={false}
          colorProfile="inherited-render"
          allowInheritKeyword={allowInheritKeyword}
          clearedDescription={`No color override is saved. The swatch previews ${fallbackLabel}.`}
        />
      )}
    </WidgetControlRow>
  );
}

function updateValue(
  value: SectionData,
  onChange: (next: SectionData) => void,
  updater: (current: SectionData) => SectionData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateHeading(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<HeadingData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    heading: {
      ...current.heading,
      ...patch,
    },
  }));
}

function updateSemantics(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<SemanticsData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    semantics: {
      ...current.semantics,
      ...patch,
    },
  }));
}

function updateLayout(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<LayoutData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateStyle(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function applySectionVariantPatch(
  nextVariant: SectionVariantId,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<SectionData>["onBlockPatch"]
) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
    }));
    return;
  }

  onVariantChange?.(nextVariant);
}

function buildSectionPresetData(value: SectionData, preset: SectionPresetOption): SectionData {
  const current = normalizeValue(value);
  return normalizeValue({
    ...current,
    heading: {
      ...current.heading,
      ...preset.patch.heading,
    },
    layout: {
      ...current.layout,
      ...preset.patch.layout,
    },
    style: {
      ...current.style,
      ...preset.patch.style,
    },
  });
}

function applySectionPreset(
  nextVariant: SectionVariantId,
  nextData: SectionData,
  onChange: (next: SectionData) => void,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<SectionData>["onBlockPatch"]
) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextData,
    }));
    return;
  }

  onChange(nextData);
  onVariantChange?.(nextVariant);
}

function updateBackgroundMedia(
  value: SectionData,
  onChange: (next: SectionData) => void,
  patch: Partial<BackgroundMediaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      backgroundMedia: {
        ...resolveBackgroundMedia(current.style),
        ...patch,
      },
    },
  }));
}

function clearStyleField(
  value: SectionData,
  onChange: (next: SectionData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

const resolveBackgroundMediaTypeTransition = (
  current: BackgroundMediaData,
  nextType: SectionBackgroundMediaType
): Partial<BackgroundMediaData> => {
  if (nextType === "none") {
    return {
      type: "none",
      source: current.source ?? "library",
      assetId: undefined,
      src: undefined,
      posterSource: undefined,
      posterAssetId: undefined,
      posterSrc: undefined,
      title: undefined,
      description: undefined,
      fit: current.fit ?? sectionBackgroundMediaDefaults.fit,
      position: current.position ?? sectionBackgroundMediaDefaults.position,
      opacity: current.opacity ?? sectionBackgroundMediaDefaults.opacity,
      blendMode: current.blendMode ?? sectionBackgroundMediaDefaults.blendMode,
      layerOrder: current.layerOrder ?? sectionBackgroundMediaDefaults.layerOrder,
    };
  }

  const keepExternalSelection =
    current.source === "external" && isCompatibleSectionMediaUrl(current.src, nextType);
  const source: SectionBackgroundMediaSource = keepExternalSelection ? "external" : "library";
  const keepLibrarySelection = current.type === nextType && source === "library";
  const keepVideoMetadata = nextType === "video" && current.type === "video";

  return {
    type: nextType,
    source,
    assetId: keepLibrarySelection ? current.assetId : undefined,
    src: keepLibrarySelection || keepExternalSelection ? current.src : undefined,
    posterSource: nextType === "video" ? (current.posterSource ?? "library") : undefined,
    posterAssetId: nextType === "video" && keepVideoMetadata ? current.posterAssetId : undefined,
    posterSrc: nextType === "video" && keepVideoMetadata ? current.posterSrc : undefined,
    title: nextType === "video" && keepVideoMetadata ? current.title : undefined,
    description: nextType === "video" && keepVideoMetadata ? current.description : undefined,
    fit: current.fit ?? sectionBackgroundMediaDefaults.fit,
    position: current.position ?? sectionBackgroundMediaDefaults.position,
    opacity: current.opacity ?? sectionBackgroundMediaDefaults.opacity,
    blendMode: current.blendMode ?? sectionBackgroundMediaDefaults.blendMode,
    layerOrder: current.layerOrder ?? sectionBackgroundMediaDefaults.layerOrder,
  };
};

function SectionBackgroundMediaSourceFields({
  media,
  mediaType,
  onChange,
}: {
  media: BackgroundMediaData;
  mediaType: Exclude<SectionBackgroundMediaType, "none">;
  onChange: (patch: Partial<BackgroundMediaData>) => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const source: SectionBackgroundMediaSource = media.source ?? "library";
  const accept = mediaType === "image" ? ["image/*"] : ["video/*"];
  const hasSavedExternalMedia = source === "external" && Boolean(media.src);

  const handleAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ assetId: undefined, src: undefined });
      return;
    }

    onChange({ assetId, source: "library" });
    setLookupError(null);
    try {
      const items = await listMediaCached({ force: true });
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          assetId,
          source: "library",
          src: match.url,
          ...(mediaType === "video" && (!media.title || media.title.trim().length === 0)
            ? { title: match.title ?? match.originalName ?? "" }
            : {}),
        });
      } else {
        setLookupError("Selected media could not be resolved.");
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLookupError(isApiClientError(error) ? error.message : "Failed to resolve media URL.");
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <WidgetControlRow
        id="section.style.backgroundMedia.assetId"
        label={mediaType === "image" ? "Background image" : "Background video"}
        path="style.backgroundMedia"
      >
        {() => (
          <div className="space-y-2">
            {["source", "assetId", "src"].map((field) => (
              <span
                key={field}
                className="sr-only"
                data-widget-control-path={`style.backgroundMedia.${field}`}
              />
            ))}
            <MediaPicker
              value={media.assetId ?? null}
              onChange={(value) => void handleAssetChange(value)}
              multiple={false}
              accept={accept}
            />
            {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
          </div>
        )}
      </WidgetControlRow>

      {hasSavedExternalMedia ? (
        <WidgetControlRow
          id="section.style.backgroundMedia.savedExternal"
          label="Saved external media"
          ownership="action"
        >
          {() => (
            <div className="space-y-2 rounded-md border border-dashed border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                This Section has an older external media source saved. Pick an item from the Media
                Library to replace it, or clear the saved media.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({ source: "library", assetId: undefined, src: undefined })
                  }
                >
                  Use Media Library
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({ source: "library", assetId: undefined, src: undefined })
                  }
                >
                  Clear saved media
                </Button>
              </div>
            </div>
          )}
        </WidgetControlRow>
      ) : null}
    </div>
  );
}

function SectionBackgroundPosterFields({
  media,
  onChange,
  onClear,
}: {
  media: BackgroundMediaData;
  onChange: (patch: Partial<BackgroundMediaData>) => void;
  onClear: () => void;
}) {
  const [lookupError, setLookupError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const posterSource: SectionBackgroundMediaSource =
    media.posterSource ?? media.source ?? "library";
  const hasSavedExternalPoster = posterSource === "external" && Boolean(media.posterSrc);

  const handlePosterAssetChange = async (value: unknown) => {
    const assetId = typeof value === "string" ? value : null;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!assetId) {
      onChange({ posterAssetId: undefined, posterSrc: undefined });
      return;
    }

    onChange({ posterAssetId: assetId, posterSource: "library" });
    setLookupError(null);
    try {
      const items = await listMediaCached({ force: true });
      if (requestId !== requestIdRef.current) return;
      const match = items.find((item) => item.id === assetId);
      if (match) {
        onChange({
          posterAssetId: assetId,
          posterSource: "library",
          posterSrc: match.url,
        });
      } else {
        setLookupError("Selected poster image could not be resolved.");
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLookupError(
        isApiClientError(error) ? error.message : "Failed to resolve poster image URL."
      );
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Video poster image</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      <WidgetControlRow
        id="section.style.backgroundMedia.posterAssetId"
        label="Poster image"
        path="style.backgroundMedia"
      >
        {() => (
          <div className="space-y-2">
            {["posterSource", "posterAssetId", "posterSrc"].map((field) => (
              <span
                key={field}
                className="sr-only"
                data-widget-control-path={`style.backgroundMedia.${field}`}
              />
            ))}
            <MediaPicker
              value={media.posterAssetId ?? null}
              onChange={(value) => void handlePosterAssetChange(value)}
              multiple={false}
              accept={["image/*"]}
            />
            {lookupError ? <p className="text-xs text-destructive">{lookupError}</p> : null}
          </div>
        )}
      </WidgetControlRow>

      {hasSavedExternalPoster ? (
        <WidgetControlRow
          id="section.style.backgroundMedia.savedExternalPoster"
          label="Saved external poster"
          ownership="action"
        >
          {() => (
            <div className="space-y-2 rounded-md border border-dashed border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                This video has an older external poster image saved. Pick an image from the Media
                Library to replace it, or clear the poster.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({
                      posterSource: "library",
                      posterAssetId: undefined,
                      posterSrc: undefined,
                    })
                  }
                >
                  Use Media Library
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                  Clear poster
                </Button>
              </div>
            </div>
          )}
        </WidgetControlRow>
      ) : null}
    </div>
  );
}

export function SectionWizardEditor({
  value: _value,
  onChange: _onChange,
  variant,
}: WidgetEditorProps<SectionData>) {
  const resolvedVariant = resolveSectionVariant(variant);
  const variantLabel =
    variantOptions.find((option) => option.id === resolvedVariant)?.label ?? "Default";

  return (
    <div className="space-y-4">
      <WidgetEditorSection
        id="section.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Section setup"
        description="Wizard now summarizes the saved section wrapper. Heading copy, spacing, and surface styling live in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="section.wizard.variant"
          label="Section layout"
          path="variant"
          value={variantLabel}
        />

        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Wizard is one-time starter setup. Use Visual to change the section wrapper, write the
          label, title, description, heading hierarchy, spacing, and surface styling.
        </div>
      </WidgetEditorSection>
    </div>
  );
}

export function SectionVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<SectionData>) {
  const normalized = normalizeValue(value);
  const heading = normalized.heading ?? sectionHeadingDefaults;
  const regionFlow = normalized.layout?.regionFlow ?? sectionDefaults.layout?.regionFlow ?? "stack";
  const regionColumnsEnabled = regionFlow === "grid";
  const regionColumnsValue =
    normalized.layout?.regionColumns ?? sectionDefaults.layout?.regionColumns ?? "1";
  const regionGapValue = normalized.layout?.regionGap ?? sectionRegionGapAutoValue;
  const mobilePaddingBlockValue =
    normalized.layout?.mobilePaddingBlock ?? sectionResponsivePaddingMatchValue;
  const mobilePaddingInlineValue =
    normalized.layout?.mobilePaddingInline ?? sectionResponsivePaddingMatchValue;
  const desktopPaddingBlockValue =
    normalized.layout?.desktopPaddingBlock ?? sectionResponsivePaddingMatchValue;
  const desktopPaddingInlineValue =
    normalized.layout?.desktopPaddingInline ?? sectionResponsivePaddingMatchValue;
  const backgroundMedia = resolveBackgroundMedia(normalized.style);
  const backgroundMediaType = backgroundMedia.type ?? "none";
  const handleBackgroundMediaTypeChange = (nextType: SectionBackgroundMediaType) =>
    updateBackgroundMedia(
      value,
      onChange,
      resolveBackgroundMediaTypeTransition(backgroundMedia, nextType)
    );
  const applyPreset = (preset: SectionPresetOption) =>
    applySectionPreset(
      preset.variant,
      buildSectionPresetData(value, preset),
      onChange,
      onVariantChange,
      onBlockPatch
    );
  const handleVariantChange = (next: string) =>
    applySectionVariantPatch(next as SectionVariantId, onVariantChange, onBlockPatch);

  return (
    <div className="space-y-4">
      <WidgetEditorSection
        title="Variant and structure"
        description="Choose a preset or adjust the section wrapper style and width behavior."
        id="section.visual.variant-structure"
        mode="visual"
        role="layout"
      >
        <div className="space-y-3">
          <WidgetControlRow id="section.visual.preset" label="Quick presets" path="variant">
            {() => (
              <>
                <SectionPresetCards onApply={applyPreset} />
                {[
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
                ].map((presetPath) => (
                  <span
                    key={presetPath}
                    className="sr-only"
                    data-widget-control-path={presetPath}
                  />
                ))}
              </>
            )}
          </WidgetControlRow>
          <WidgetControlRow id="section.visual.variant" label="Section layout" path="variant">
            {() => (
              <VariantCards value={resolveSectionVariant(variant)} onChange={handleVariantChange} />
            )}
          </WidgetControlRow>
        </div>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Heading and intro"
        description="Control heading copy, level, alignment, sizes, and text colors."
        id="section.visual.heading-intro"
        mode="visual"
        role="content"
      >
        <WidgetControlRow id="section.heading.label" label="Label">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={heading.label ?? ""}
              onChange={(event) => updateHeading(value, onChange, { label: event.target.value })}
              placeholder="Section label"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.title" label="Title">
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={heading.title ?? ""}
              onChange={(event) => updateHeading(value, onChange, { title: event.target.value })}
              placeholder="Section title"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.description" label="Description">
          {(fieldProps) => (
            <Textarea
              id={fieldProps.id}
              value={heading.description ?? ""}
              onChange={(event) =>
                updateHeading(value, onChange, { description: event.target.value })
              }
              placeholder="Supportive copy for this section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.level" label="Heading level">
          {(fieldProps) => (
            <Select
              value={heading.level ?? "h2"}
              onValueChange={(next) =>
                updateHeading(value, onChange, { level: next as SectionHeadingLevel })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select heading level" />
              </SelectTrigger>
              <SelectContent>
                {headingLevelOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.align" label="Heading alignment">
          {(fieldProps) => (
            <Select
              value={heading.align ?? "left"}
              onValueChange={(next) =>
                updateHeading(value, onChange, { align: next as SectionHeadingAlign })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select heading alignment" />
              </SelectTrigger>
              <SelectContent>
                {headingAlignOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.labelSize" label="Label size">
          {(fieldProps) => (
            <Select
              value={heading.labelSize ?? "xs"}
              onValueChange={(next) =>
                updateHeading(value, onChange, { labelSize: next as SectionLabelSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                {labelSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.titleSize" label="Title size">
          {(fieldProps) => (
            <Select
              value={heading.titleSize ?? "2xl"}
              onValueChange={(next) =>
                updateHeading(value, onChange, { titleSize: next as SectionTitleSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select title size" />
              </SelectTrigger>
              <SelectContent>
                {titleSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.heading.descriptionSize" label="Description size">
          {(fieldProps) => (
            <Select
              value={heading.descriptionSize ?? "sm"}
              onValueChange={(next) =>
                updateHeading(value, onChange, { descriptionSize: next as SectionDescriptionSize })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select description size" />
              </SelectTrigger>
              <SelectContent>
                {descriptionSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <ColorField
          id="section.heading.labelColor"
          label="Label color"
          value={value.heading?.labelColor}
          onChange={(next) => updateHeading(value, onChange, { labelColor: next })}
          onClear={() => updateHeading(value, onChange, { labelColor: undefined })}
          fallbackLabel="theme text"
          pickerFallback="#475569"
        />

        <ColorField
          id="section.heading.titleColor"
          label="Title color"
          value={value.heading?.titleColor}
          onChange={(next) => updateHeading(value, onChange, { titleColor: next })}
          onClear={() => updateHeading(value, onChange, { titleColor: undefined })}
          fallbackLabel="theme text"
          pickerFallback="#111827"
        />

        <ColorField
          id="section.heading.descriptionColor"
          label="Description color"
          value={value.heading?.descriptionColor}
          onChange={(next) => updateHeading(value, onChange, { descriptionColor: next })}
          onClear={() => updateHeading(value, onChange, { descriptionColor: undefined })}
          fallbackLabel="theme text"
          pickerFallback="#475569"
        />

        <p className="text-xs text-muted-foreground">
          Section titles default to `h2`. Choose `h1` only when this band owns the primary page
          heading.
        </p>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Section link and accessibility"
        description="Add an optional in-page link name and accessibility name without editing raw HTML ids."
        id="section.visual.link-accessibility"
        mode="visual"
        role="content"
      >
        <WidgetControlRow id="section.semantics.element" label="Section type">
          {(fieldProps) => (
            <Select
              value={
                normalized.semantics?.element ?? sectionDefaults.semantics?.element ?? "section"
              }
              onValueChange={(next) =>
                updateSemantics(value, onChange, { element: next as SectionElement })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select section type" />
              </SelectTrigger>
              <SelectContent>
                {elementOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="section.semantics.anchorId"
          label="Section link name"
          help="Optional. Spaces and punctuation are converted to a safe in-page link automatically."
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.semantics?.anchorId ?? ""}
              onChange={(event) =>
                updateSemantics(value, onChange, {
                  anchorId: sanitizeSectionAnchorId(event.target.value),
                })
              }
              placeholder="Pricing area"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="section.semantics.ariaLabel"
          label="Accessibility name"
          help="Optional. Use this when the visible heading is missing or not descriptive enough."
        >
          {(fieldProps) => (
            <Input
              id={fieldProps.id}
              value={normalized.semantics?.ariaLabel ?? ""}
              onChange={(event) =>
                updateSemantics(value, onChange, { ariaLabel: event.target.value })
              }
              placeholder="Pricing section"
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            />
          )}
        </WidgetControlRow>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Width and spacing"
        description="Choose bounded width, height, flow, and spacing tokens instead of raw CSS values."
        id="section.width-spacing"
        mode="visual"
        role="layout"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WidgetControlRow id="section.layout.containerWidth" label="Container width">
            {(fieldProps) => (
              <Select
                value={
                  normalized.layout?.containerWidth ??
                  sectionDefaults.layout?.containerWidth ??
                  "content"
                }
                onValueChange={(next) =>
                  updateLayout(value, onChange, { containerWidth: next as SectionContainerWidth })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select container width" />
                </SelectTrigger>
                <SelectContent>
                  {containerWidthOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.maxWidth" label="Max width">
            {(fieldProps) => (
              <Select
                value={normalized.layout?.maxWidth ?? sectionDefaults.layout?.maxWidth ?? "6xl"}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { maxWidth: next as SectionMaxWidth })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select max width" />
                </SelectTrigger>
                <SelectContent>
                  {maxWidthOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.minHeight" label="Minimum height">
            {(fieldProps) => (
              <Select
                value={normalized.layout?.minHeight ?? sectionDefaults.layout?.minHeight ?? "none"}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { minHeight: next as SectionMinHeight })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select minimum height" />
                </SelectTrigger>
                <SelectContent>
                  {minHeightOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.regionFlow" label="Region flow">
            {(fieldProps) => (
              <Select
                value={regionFlow}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    regionFlow: next as SectionRegionFlow,
                    regionColumns:
                      next === "grid"
                        ? ((normalized.layout?.regionColumns ??
                            sectionDefaults.layout?.regionColumns ??
                            "1") as SectionRegionColumns)
                        : "1",
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select region flow" />
                </SelectTrigger>
                <SelectContent>
                  {regionFlowOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.regionColumns" label="Grid columns">
            {(fieldProps) => (
              <Select
                value={regionColumnsValue}
                disabled={!regionColumnsEnabled}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { regionColumns: next as SectionRegionColumns })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select grid columns" />
                </SelectTrigger>
                <SelectContent>
                  {regionColumnOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.paddingBlock" label="Vertical padding">
            {(fieldProps) => (
              <Select
                value={
                  normalized.layout?.paddingBlock ?? sectionDefaults.layout?.paddingBlock ?? "md"
                }
                onValueChange={(next) =>
                  updateLayout(value, onChange, { paddingBlock: next as SectionPaddingBlock })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select vertical padding" />
                </SelectTrigger>
                <SelectContent>
                  {paddingBlockOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.paddingInline" label="Side padding">
            {(fieldProps) => (
              <Select
                value={
                  normalized.layout?.paddingInline ?? sectionDefaults.layout?.paddingInline ?? "md"
                }
                onValueChange={(next) =>
                  updateLayout(value, onChange, { paddingInline: next as SectionPaddingInline })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select side padding" />
                </SelectTrigger>
                <SelectContent>
                  {paddingInlineOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.mobilePaddingBlock" label="Mobile vertical padding">
            {(fieldProps) => (
              <Select
                value={mobilePaddingBlockValue}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    mobilePaddingBlock:
                      next === sectionResponsivePaddingMatchValue
                        ? undefined
                        : (next as SectionPaddingBlock),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select mobile vertical padding" />
                </SelectTrigger>
                <SelectContent>
                  {responsivePaddingBlockOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.mobilePaddingInline" label="Mobile side padding">
            {(fieldProps) => (
              <Select
                value={mobilePaddingInlineValue}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    mobilePaddingInline:
                      next === sectionResponsivePaddingMatchValue
                        ? undefined
                        : (next as SectionPaddingInline),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select mobile side padding" />
                </SelectTrigger>
                <SelectContent>
                  {responsivePaddingInlineOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow
            id="section.layout.desktopPaddingBlock"
            label="Desktop vertical padding"
          >
            {(fieldProps) => (
              <Select
                value={desktopPaddingBlockValue}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    desktopPaddingBlock:
                      next === sectionResponsivePaddingMatchValue
                        ? undefined
                        : (next as SectionPaddingBlock),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select desktop vertical padding" />
                </SelectTrigger>
                <SelectContent>
                  {responsivePaddingBlockOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.desktopPaddingInline" label="Desktop side padding">
            {(fieldProps) => (
              <Select
                value={desktopPaddingInlineValue}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    desktopPaddingInline:
                      next === sectionResponsivePaddingMatchValue
                        ? undefined
                        : (next as SectionPaddingInline),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select desktop side padding" />
                </SelectTrigger>
                <SelectContent>
                  {responsivePaddingInlineOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.headingGap" label="Heading gap">
            {(fieldProps) => (
              <Select
                value={normalized.layout?.headingGap ?? sectionDefaults.layout?.headingGap ?? "md"}
                onValueChange={(next) =>
                  updateLayout(value, onChange, { headingGap: next as SectionGap })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select heading gap" />
                </SelectTrigger>
                <SelectContent>
                  {gapOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.layout.regionGap" label="Region gap">
            {(fieldProps) => (
              <Select
                value={regionGapValue}
                onValueChange={(next) =>
                  updateLayout(value, onChange, {
                    regionGap:
                      next === sectionRegionGapAutoValue ? undefined : (next as SectionGap),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select region gap" />
                </SelectTrigger>
                <SelectContent>
                  {regionGapOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>
        <p className="text-xs text-muted-foreground">
          `Wide alias` keeps the same wrapper classes as `Content`; use a larger Max width below
          when you want a visibly wider section. `Bleed` changes the section band styling, but true
          edge-to-edge still needs `Full-width wrapper` and `No max width`.
        </p>
        <p className="text-xs text-muted-foreground">
          Grid columns stay inactive until Region flow is set to Grid. Leaving Region gap on Match
          variant keeps the legacy spacing for each Section variant until you choose an explicit
          token.
        </p>
        <p className="text-xs text-muted-foreground">
          Responsive padding stays on the same bounded tokens. `Match base` inherits the main
          padding choice for that breakpoint, and mobile-only overrides automatically return to the
          base token from `md` upward.
        </p>
      </WidgetEditorSection>

      <WidgetEditorSection
        title="Surface and borders"
        description="Tune background, gradient, overlay, border width, radius, shadow, and motion."
        id="section.surface-borders"
        mode="visual"
        role="visual"
      >
        <ColorField
          id="section.style.backgroundColor"
          label="Background color"
          value={value.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          onClear={() => clearStyleField(value, onChange, "backgroundColor")}
          fallbackLabel="transparent"
          pickerFallback="#ffffff"
        />

        <ColorField
          id="section.style.gradientFrom"
          label="Gradient start"
          value={value.style?.gradientFrom}
          onChange={(next) => updateStyle(value, onChange, { gradientFrom: next })}
          onClear={() => clearStyleField(value, onChange, "gradientFrom")}
          fallbackLabel="white"
          pickerFallback="#ffffff"
          allowInheritKeyword={false}
        />

        <ColorField
          id="section.style.gradientTo"
          label="Gradient end"
          value={value.style?.gradientTo}
          onChange={(next) => updateStyle(value, onChange, { gradientTo: next })}
          onClear={() => clearStyleField(value, onChange, "gradientTo")}
          fallbackLabel="soft slate"
          pickerFallback="#f1f5f9"
          allowInheritKeyword={false}
        />

        <WidgetControlRow id="section.style.gradientAngle" label="Gradient angle">
          {(fieldProps) => (
            <SectionSliderField
              id={fieldProps.id}
              ariaLabelledby={fieldProps["aria-labelledby"]}
              ariaDescribedby={fieldProps["aria-describedby"]}
              value={clampAngle(normalized.style?.gradientAngle)}
              min={0}
              max={360}
              step={1}
              nudgeStep={15}
              unit="°"
              sliderKey="gradient-angle"
              sliderLabel="Gradient angle"
              onChange={(next) =>
                updateStyle(value, onChange, {
                  gradientAngle: clampAngle(next),
                })
              }
            />
          )}
        </WidgetControlRow>

        <p className="text-xs text-muted-foreground">
          When both gradient stops are set, the gradient becomes the visible surface. Background
          color still acts as the fallback if you clear the gradient later.
        </p>

        <ColorField
          id="section.style.borderColor"
          label="Border color"
          value={value.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          onClear={() => clearStyleField(value, onChange, "borderColor")}
          fallbackLabel="theme border"
          pickerFallback="#e2e8f0"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <WidgetControlRow id="section.style.borderWidth" label="Border width">
            {(fieldProps) => (
              <Select
                value={normalized.style?.borderWidth ?? sectionDefaults.style?.borderWidth ?? "0"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { borderWidth: next as SectionBorderWidth })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select border width" />
                </SelectTrigger>
                <SelectContent>
                  {borderWidthOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.style.radius" label="Corner radius">
            {(fieldProps) => (
              <Select
                value={normalized.style?.radius ?? sectionDefaults.style?.radius ?? "none"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { radius: next as SectionRadius })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select radius" />
                </SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>

          <WidgetControlRow id="section.style.shadow" label="Surface shadow">
            {(fieldProps) => (
              <Select
                value={normalized.style?.shadow ?? sectionShadowAutoValue}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    shadow: next === sectionShadowAutoValue ? undefined : (next as SectionShadow),
                  })
                }
              >
                <SelectTrigger
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  aria-describedby={fieldProps["aria-describedby"]}
                >
                  <SelectValue placeholder="Select shadow" />
                </SelectTrigger>
                <SelectContent>
                  {sectionShadowOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        </div>

        <p className="text-xs text-muted-foreground">
          Match variant keeps the current contained shadow-sm legacy framing and leaves default and
          bleed flat until you choose an explicit shadow token.
        </p>

        <ColorField
          id="section.style.overlayColor"
          label="Overlay color"
          value={value.style?.overlayColor}
          onChange={(next) => updateStyle(value, onChange, { overlayColor: next })}
          onClear={() => clearStyleField(value, onChange, "overlayColor")}
          fallbackLabel="black"
          pickerFallback="#000000"
        />

        <WidgetControlRow id="section.style.overlayOpacity" label="Overlay opacity (%)">
          {(fieldProps) => (
            <SectionSliderField
              id={fieldProps.id}
              ariaLabelledby={fieldProps["aria-labelledby"]}
              ariaDescribedby={fieldProps["aria-describedby"]}
              value={clampOpacity(normalized.style?.overlayOpacity)}
              min={0}
              max={100}
              step={1}
              nudgeStep={5}
              unit="%"
              sliderKey="overlay-opacity"
              sliderLabel="Overlay opacity"
              onChange={(next) =>
                updateStyle(value, onChange, {
                  overlayOpacity: clampOpacity(next),
                })
              }
            />
          )}
        </WidgetControlRow>

        <WidgetControlRow id="section.style.motion" label="Surface motion">
          {(fieldProps) => (
            <Select
              value={normalized.style?.motion ?? "none"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { motion: next as SectionMotion })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select motion" />
              </SelectTrigger>
              <SelectContent>
                {motionOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <SectionSurfacePreview value={value} variant={variant} />
      </WidgetEditorSection>
      <WidgetEditorSection
        title="Background media and layers"
        description="Add decorative image or video layers while keeping Section content above the surface."
        id="section.background-media-layers"
        mode="visual"
        role="visual"
      >
        <WidgetControlRow id="section.style.backgroundMedia.type" label="Background media type">
          {(fieldProps) => (
            <Select
              value={backgroundMediaType}
              onValueChange={(next) =>
                handleBackgroundMediaTypeChange(next as SectionBackgroundMediaType)
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Select media type" />
              </SelectTrigger>
              <SelectContent>
                {backgroundMediaTypeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        {backgroundMediaType !== "none" ? (
          <>
            <SectionBackgroundMediaSourceFields
              media={backgroundMedia}
              mediaType={backgroundMediaType}
              onChange={(patch) => updateBackgroundMedia(value, onChange, patch)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <WidgetControlRow id="section.style.backgroundMedia.fit" label="Media fit">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.fit ?? "cover"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        fit: next as SectionBackgroundMediaFit,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select fit" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaFitOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow id="section.style.backgroundMedia.position" label="Media position">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.position ?? "center"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        position: next as SectionBackgroundMediaPosition,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaPositionOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow id="section.style.backgroundMedia.blendMode" label="Blend mode">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.blendMode ?? "normal"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        blendMode: next as SectionBackgroundMediaBlendMode,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select blend mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaBlendModeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow id="section.style.backgroundMedia.layerOrder" label="Layer order">
                {(fieldProps) => (
                  <Select
                    value={backgroundMedia.layerOrder ?? "media-under-overlay"}
                    onValueChange={(next) =>
                      updateBackgroundMedia(value, onChange, {
                        layerOrder: next as SectionLayerOrder,
                      })
                    }
                  >
                    <SelectTrigger
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    >
                      <SelectValue placeholder="Select layer order" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundMediaLayerOrderOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </WidgetControlRow>

              <WidgetControlRow
                id="section.style.backgroundMedia.opacity"
                label="Media opacity (%)"
              >
                {(fieldProps) => (
                  <Input
                    id={fieldProps.id}
                    type="number"
                    min={0}
                    max={100}
                    value={String(clampMediaOpacity(backgroundMedia.opacity))}
                    onChange={(event) =>
                      updateBackgroundMedia(value, onChange, {
                        opacity: clampMediaOpacity(Number(event.target.value)),
                      })
                    }
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    aria-describedby={fieldProps["aria-describedby"]}
                  />
                )}
              </WidgetControlRow>
            </div>

            {backgroundMediaType === "video" ? (
              <>
                <WidgetControlRow
                  id="section.style.backgroundMedia.title"
                  label="Background video title"
                >
                  {(fieldProps) => (
                    <Input
                      id={fieldProps.id}
                      value={backgroundMedia.title ?? ""}
                      onChange={(event) =>
                        updateBackgroundMedia(value, onChange, { title: event.target.value })
                      }
                      placeholder="Ambient background video"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>

                <WidgetControlRow
                  id="section.style.backgroundMedia.description"
                  label="Background video description"
                >
                  {(fieldProps) => (
                    <Textarea
                      id={fieldProps.id}
                      value={backgroundMedia.description ?? ""}
                      onChange={(event) =>
                        updateBackgroundMedia(value, onChange, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Optional notes for this decorative video"
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      aria-describedby={fieldProps["aria-describedby"]}
                    />
                  )}
                </WidgetControlRow>

                <SectionBackgroundPosterFields
                  media={backgroundMedia}
                  onChange={(patch) => updateBackgroundMedia(value, onChange, patch)}
                  onClear={() =>
                    updateBackgroundMedia(value, onChange, {
                      posterSource: undefined,
                      posterAssetId: undefined,
                      posterSrc: undefined,
                    })
                  }
                />
              </>
            ) : null}
          </>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Background media is decorative only. Section headings and region content stay above media
          and overlay layers.
        </p>
      </WidgetEditorSection>
    </div>
  );
}

export function SectionAdvancedEditor({ value }: WidgetEditorProps<SectionData>) {
  const normalized = normalizeValue(value);
  const backgroundMedia = resolveBackgroundMedia(normalized.style);
  const backgroundMediaSummary =
    backgroundMedia.type === "none"
      ? "No decorative background media."
      : `${backgroundMedia.type} from ${
          backgroundMedia.source === "library" ? "Media Library" : "saved external source"
        }, ${backgroundMedia.fit ?? "cover"} fit, ${clampMediaOpacity(backgroundMedia.opacity)}% opacity.`;

  return (
    <div className="space-y-4">
      <WidgetEditorSection
        title="Technical tokens"
        description="Visual owns layout and surface editing. Advanced only summarizes the resolved state."
        id="section.advanced.resolved-summary"
        mode="advanced"
        role="diagnostics"
      >
        <ReadonlyWidgetSummaryRow
          id="section.advanced.layout-summary"
          label="Layout"
          path="layout"
          value={`${normalized.layout?.containerWidth ?? "content"} wrapper, ${normalized.layout?.maxWidth ?? "6xl"} max width, ${normalized.layout?.paddingBlock ?? "lg"} vertical padding.`}
        />
        <ReadonlyWidgetSummaryRow
          id="section.advanced.surface-summary"
          label="Surface"
          path="style"
          value={`${normalized.style?.backgroundColor ?? "Inherited background"}, ${normalized.style?.radius ?? "none"} radius, ${normalized.style?.shadow ?? "none"} shadow.`}
        />
        <ReadonlyWidgetSummaryRow
          id="section.advanced.semantics-summary"
          label="Semantics"
          path="semantics"
          value={`${normalized.semantics?.element ?? "section"} type, link name ${normalized.semantics?.anchorId || "not set"}, accessibility name ${normalized.semantics?.ariaLabel || "not set"}.`}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        title="Support diagnostics"
        description="Read-only normalized state for support conversations without exposing raw payload editing."
        id="section.advanced.support-diagnostics"
        mode="advanced"
        role="diagnostics"
      >
        <ReadonlyWidgetSummaryRow
          id="section.advanced.heading-summary"
          label="Heading"
          path="heading"
          value={`${normalized.heading?.level ?? "h2"} heading, ${normalized.heading?.align ?? "left"} aligned, title ${normalized.heading?.title ? "set" : "not set"}.`}
        />
        <ReadonlyWidgetSummaryRow
          id="section.advanced.media-summary"
          label="Background media"
          path="style.backgroundMedia"
          value={backgroundMediaSummary}
        />
        <ReadonlyWidgetSummaryRow
          id="section.advanced.visual-summary"
          label="Visual effects"
          path="style"
          value={`Gradient angle ${clampAngle(normalized.style?.gradientAngle)} degrees, overlay ${clampOpacity(normalized.style?.overlayOpacity)}%, motion ${normalized.style?.motion ?? "none"}.`}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        title="Authoring boundaries"
        description="Read-only summary of which editor mode owns daily section changes."
        id="section.advanced.authoring-boundaries"
        mode="advanced"
        role="summary"
      >
        <ReadonlyWidgetSummaryRow
          id="section.advanced.boundary-wizard"
          label="Wizard"
          value="One-time setup affordance only."
        />
        <ReadonlyWidgetSummaryRow
          id="section.advanced.boundary-visual"
          label="Visual"
          value="Owns daily heading, layout, surface, media, and semantics editing."
        />
        <ReadonlyWidgetSummaryRow
          id="section.advanced.boundary-advanced"
          label="Advanced"
          value="Read-only diagnostics and support summaries only."
        />
      </WidgetEditorSection>
    </div>
  );
}
