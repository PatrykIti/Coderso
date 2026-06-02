import { type DragEvent, type ReactNode, useState } from "react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  countTimelineIconMarkerFallbacks,
  normalizeTimelineData,
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
  resolveTimelineMaxWidthDiagnostics,
  resolveTimelineMode,
  timelineStepMax,
  timelineStepMin,
  type TimelineAlign,
  type TimelineData,
  type TimelineDescriptionSize,
  type TimelineGuideStyle,
  type TimelineLabelPosition,
  type TimelineLineStyle,
  type TimelineMarkerDisplay,
  type TimelineMarkerSize,
  type TimelineMaxWidth,
  type TimelineMode,
  type TimelineOrientation,
  type TimelinePadding,
  type TimelineSectionSpacing,
  type TimelineSpacing,
  type TimelineStep,
  type TimelineStatus,
  type TimelineThickness,
  type TimelineTitleSize,
  type TimelineTitleWeight,
  type TimelineVariantId,
} from "../../../../widgets/core/timeline";
import type { WidgetEditorProps, WidgetEditorSectionRole } from "../../../../widgets/types";
import {
  ColorContrastNotice,
  type ColorContrastAdvisory,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{ id: TimelineVariantId; label: string; description: string }> = [
  {
    id: "milestones",
    label: "Milestones",
    description: "Markers with labels around the axis.",
  },
  {
    id: "cards",
    label: "Cards",
    description: "Steps in separate cards with stronger emphasis.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Minimal process strip for concise labels.",
  },
];

const modeOptions: Array<{ id: TimelineMode; label: string; description: string; icon: string }> = [
  {
    id: "process",
    label: "Process",
    description: "Compact flow for short, sequential steps.",
    icon: "1",
  },
  {
    id: "axis",
    label: "Axis",
    description: "Milestone markers arranged around a guiding line.",
    icon: "2",
  },
  {
    id: "chronology",
    label: "Chronology",
    description: "Date-led timeline with events and context.",
    icon: "3",
  },
  {
    id: "alternating",
    label: "Alternating",
    description: "Narrative story flow that alternates left and right.",
    icon: "4",
  },
];

const visualStatusOptions: Array<{ id: string; label: string }> = [
  { id: "__none__", label: "No status" },
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Current" },
  { id: "complete", label: "Complete" },
];

const orientationOptions: Array<{ id: TimelineOrientation; label: string }> = [
  { id: "horizontal", label: "Horizontal" },
  { id: "vertical", label: "Vertical" },
];

const alignOptions: Array<{ id: TimelineAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

const labelPositionOptions: Array<{ id: TimelineLabelPosition; label: string }> = [
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

const spacingOptions: Array<{ id: TimelineSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const spacingDescriptions: Record<TimelineSpacing, string> = {
  none: "0px gap",
  sm: "12px gap",
  md: "20px gap",
  lg: "28px gap",
  xl: "36px gap",
};

const guideStyleOptions: Array<{ id: TimelineGuideStyle; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
];

const lineStyleOptions: Array<{ id: TimelineLineStyle; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
];

const markerSizeOptions: Array<{ id: TimelineMarkerSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const markerDisplayOptions: Array<{
  id: TimelineMarkerDisplay;
  label: string;
  description: string;
}> = [
  { id: "dot", label: "Dot", description: "Use a simple filled marker." },
  { id: "number", label: "Number", description: "Show step numbers inside the marker." },
  { id: "icon", label: "Icon", description: "Render a marker icon inside the marker." },
];

const thicknessOptions: Array<{ id: TimelineThickness; label: string }> = [
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
  { id: "4", label: "4px" },
];

const titleSizeOptions: Array<{ id: TimelineTitleSize; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "base", label: "Base" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const descriptionSizeOptions: Array<{ id: TimelineDescriptionSize; label: string }> = [
  { id: "none", label: "None (inherit)" },
  { id: "xs", label: "Extra small" },
  { id: "sm", label: "Small" },
  { id: "base", label: "Base" },
  { id: "lg", label: "Large" },
];

const titleWeightOptions: Array<{ id: TimelineTitleWeight; label: string }> = [
  { id: "normal", label: "Normal" },
  { id: "medium", label: "Medium" },
  { id: "semibold", label: "Semibold" },
  { id: "bold", label: "Bold" },
];

const paddingOptions: Array<{ id: TimelinePadding; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Relaxed" },
];

const sectionSpacingOptions: Array<{ id: TimelineSectionSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const maxWidthOptions: Array<{ id: TimelineMaxWidth; label: string }> = [
  { id: "none", label: "None" },
  { id: "4xl", label: "4XL" },
  { id: "5xl", label: "5XL" },
  { id: "6xl", label: "6XL" },
  { id: "7xl", label: "7XL" },
  { id: "full", label: "Full" },
];

const stepCountOptions = Array.from(
  { length: timelineStepMax - timelineStepMin + 1 },
  (_, index) => timelineStepMin + index
);

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

type TimelineLayout = NonNullable<TimelineData["layout"]>;
type TimelineGuides = NonNullable<TimelineData["guides"]>;
type TimelineStyle = NonNullable<TimelineData["style"]>;
type TimelineStepCta = NonNullable<TimelineStep["cta"]>;
type TimelineStepLink = NonNullable<TimelineStep["link"]>;

const preferredVariantForMode = (mode: TimelineMode): TimelineVariantId => {
  if (mode === "process") return "compact";
  if (mode === "axis") return "milestones";
  return "cards";
};

const getTimelineModeCopy = (mode: TimelineMode) => {
  const preferredVariant = preferredVariantForMode(mode);
  return `Switching to ${modeOptions.find((option) => option.id === mode)?.label ?? mode} keeps your step content but prefers the ${preferredVariant} visual variant.`;
};

const getDateFeedback = (value: string | undefined) => {
  if (!value)
    return {
      valid: true,
      message: "Use YYYY-MM-DD for machine-readable dates. Put prose in Date label.",
    };
  return isoDatePattern.test(value)
    ? {
        valid: true,
        message: "Machine-readable date looks good. Date label stays optional for editorial copy.",
      }
    : {
        valid: false,
        message: "Use YYYY-MM-DD here or move prose like 'Q3 launch window' into Date label.",
      };
};

function pickContrastAdvisory(advisories: ColorContrastAdvisory[]) {
  return (
    advisories.find((advisory) => advisory.status === "warning") ??
    advisories.find((advisory) => advisory.status === "unknown") ?? { status: "ok" as const }
  );
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode?: "wizard" | "visual" | "advanced";
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function ColorField({
  id,
  label,
  path,
  value,
  onChange,
  onClear,
  placeholder,
  pickerFallback = "#0f172a",
  helperText,
  allowTransparent = false,
}: {
  id: string;
  label: string;
  path?: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder: string;
  pickerFallback?: string;
  helperText?: string;
  allowTransparent?: boolean;
}) {
  return (
    <div className="space-y-2">
      <SharedColorControl
        label={label}
        value={value}
        onChange={onChange}
        onClear={onClear}
        controlId={id}
        controlPath={path}
        placeholder={placeholder}
        pickerFallback={pickerFallback}
        showValueInput={false}
        allowTransparent={allowTransparent}
      />
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

function TimelineSelectControl<TValue extends string>({
  id,
  label,
  path,
  value,
  onValueChange,
  options,
  placeholder,
  description,
}: {
  id: string;
  label: string;
  path: string;
  value: TValue;
  onValueChange: (next: string) => void;
  options: Array<{ id: TValue; label: string }>;
  placeholder: string;
  description?: ReactNode;
}) {
  return (
    <WidgetControlRow id={id} label={label} path={path}>
      {(fieldProps) => (
        <div className="space-y-2">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
      )}
    </WidgetControlRow>
  );
}

function TimelineInputControl({
  id,
  label,
  path,
  value,
  onChange,
  placeholder,
  description,
  descriptionClassName,
}: {
  id: string;
  label: string;
  path: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  description?: ReactNode;
  descriptionClassName?: string;
}) {
  return (
    <WidgetControlRow id={id} label={label} path={path}>
      {(fieldProps) => (
        <div className="space-y-1">
          <Input
            {...fieldProps}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
          {description ? (
            <div className={cn("text-xs text-muted-foreground", descriptionClassName)}>
              {description}
            </div>
          ) : null}
        </div>
      )}
    </WidgetControlRow>
  );
}

function TimelineTextareaControl({
  id,
  label,
  path,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  path: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <WidgetControlRow id={id} label={label} path={path}>
      {(fieldProps) => (
        <Textarea
          {...fieldProps}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </WidgetControlRow>
  );
}

function TimelineVariantCards({
  value,
  mode,
  onChange,
}: {
  value: string;
  mode: TimelineMode;
  onChange?: (next: string) => void;
}) {
  const processModeDominates = mode === "process";
  const effectiveVariant = processModeDominates ? "compact" : value;

  return (
    <div className="space-y-2">
      {processModeDominates ? (
        <p className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Process mode uses compact rendering; choose Axis, Chronology, or Alternating to use a
          saved non-compact variant.
        </p>
      ) : null}
      {variantOptions.map((option) => {
        const isSaved = value === option.id;
        const isEffective = effectiveVariant === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange?.(option.id)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition",
              isEffective
                ? "border-primary bg-primary/5"
                : isSaved
                  ? "border-border bg-muted/40"
                  : "border-border bg-background hover:border-primary/50"
            )}
            data-timeline-variant-card={option.id}
            data-timeline-variant-card-state={
              isEffective ? "effective" : isSaved ? "saved-inactive" : "available"
            }
            data-widget-control={`timeline.visual.variant-card.${option.id}`}
            data-widget-control-path="variant"
            data-widget-control-ownership="writable"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
              <Badge className="shrink-0" variant={isEffective ? "default" : "outline"}>
                {isEffective ? "Active" : isSaved ? "Saved, inactive" : "Pick"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function TimelineModeCards({
  value,
  onChange,
}: {
  value: TimelineMode;
  onChange: (next: TimelineMode) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {modeOptions.map((option) => {
        const preferredVariant = preferredVariantForMode(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            data-widget-control={`timeline.visual.mode-card.${option.id}`}
            data-widget-control-path="mode"
            data-widget-control-ownership="writable"
            className={cn(
              "rounded-lg border p-3 text-left transition",
              value === option.id
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold">
                    {option.icon}
                  </span>
                  <p className="text-sm font-semibold">{option.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <Badge variant={value === option.id ? "default" : "outline"}>
                {preferredVariant}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getDraftTimelineStepCta(value: TimelineStep["cta"]): TimelineStep["cta"] {
  if (!value || typeof value !== "object") return undefined;
  const label = typeof value.label === "string" ? value.label : "";
  const href = typeof value.href === "string" ? value.href : "";
  return label || href ? { label, href } : undefined;
}

function getDraftTimelineStepLink(value: TimelineStep["link"]): TimelineStep["link"] {
  if (!value || typeof value !== "object") return undefined;
  const label = typeof value.label === "string" ? value.label : "";
  const href = typeof value.href === "string" ? value.href : "";
  return label || href ? { label, href } : undefined;
}

function getNormalizedSteps(value: TimelineData) {
  const source = Array.isArray(value.steps) ? value.steps : [];
  return normalizeTimelineSteps(source).map((step, index) => ({
    ...step,
    cta: getDraftTimelineStepCta(source[index]?.cta) ?? step.cta,
    link: getDraftTimelineStepLink(source[index]?.link) ?? step.link,
  }));
}

function updateHeader(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<NonNullable<TimelineData["header"]>>
) {
  onChange({
    ...value,
    header: {
      ...value.header,
      ...patch,
    },
  });
}

function updateStep(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  index: number,
  patch: Partial<TimelineStep>
) {
  const steps = getNormalizedSteps(value);
  const next = [...steps];
  next[index] = { ...next[index], ...patch };
  onChange({ ...value, steps: next });
}

function updateStepCta(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  index: number,
  patch: Partial<TimelineStepCta>
) {
  const steps = getNormalizedSteps(value);
  const current = steps[index];
  if (!current) return;
  const next = [...steps];
  const cta = {
    label: current.cta?.label ?? "",
    href: current.cta?.href ?? "",
    ...current.cta,
    ...patch,
  };
  next[index] = { ...current, cta };
  onChange({ ...value, steps: next });
}

function updateStepLink(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  index: number,
  patch: Partial<TimelineStepLink>
) {
  const steps = getNormalizedSteps(value);
  const current = steps[index];
  if (!current) return;
  const next = [...steps];
  const link = {
    href: current.link?.href ?? "",
    label: current.link?.label ?? "",
    ...current.link,
    ...patch,
  };
  next[index] = { ...current, link };
  onChange({ ...value, steps: next });
}

function updateLayout(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineLayout>
) {
  onChange({
    ...value,
    layout: {
      ...value.layout,
      ...patch,
    },
  });
}

function updateMode(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  nextMode: TimelineMode,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<TimelineData>["onBlockPatch"]
) {
  const nextVariant = preferredVariantForMode(nextMode);
  const nextValue = { ...value, mode: nextMode };
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextValue,
    }));
    return;
  }
  onChange(nextValue);
  onVariantChange?.(nextVariant);
}

function updateGuides(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineGuides>
) {
  onChange({
    ...value,
    guides: {
      ...value.guides,
      ...patch,
    },
  });
}

function updateStyle(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineStyle>
) {
  onChange({
    ...value,
    style: {
      ...value.style,
      ...patch,
    },
  });
}

function updateBackground(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  next: string
) {
  onChange({
    ...value,
    background: {
      ...value.background,
      color: next,
    },
  });
}

function clearStyle(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  key: keyof TimelineStyle
) {
  const style = { ...(value.style ?? {}) };
  delete style[key];
  onChange({
    ...value,
    style,
  });
}

function clearBackground(value: TimelineData, onChange: (next: TimelineData) => void) {
  onChange({
    ...value,
    background: {},
  });
}

function setStepsCount(value: TimelineData, onChange: (next: TimelineData) => void, count: number) {
  const steps = normalizeTimelineSteps(value.steps, normalizeTimelineStepCount(count));
  onChange({ ...value, steps });
}

function addStep(value: TimelineData, onChange: (next: TimelineData) => void) {
  const steps = getNormalizedSteps(value);
  if (steps.length >= timelineStepMax) return;
  const next = normalizeTimelineSteps(
    [...steps, { id: "", title: `Step ${steps.length + 1}` }],
    steps.length + 1
  );
  onChange({ ...value, steps: next });
}

function removeStep(value: TimelineData, onChange: (next: TimelineData) => void, index: number) {
  const steps = getNormalizedSteps(value);
  if (steps.length <= timelineStepMin) return;
  const next = steps.filter((_, currentIndex) => currentIndex !== index);
  onChange({
    ...value,
    steps: normalizeTimelineSteps(next, next.length),
  });
}

function moveStep(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  fromIndex: number,
  toIndex: number
) {
  const steps = getNormalizedSteps(value);
  if (toIndex < 0 || toIndex >= steps.length) return;
  const next = [...steps];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return;
  next.splice(toIndex, 0, item);
  onChange({ ...value, steps: next });
}

function normalizeTimelinePayload(value: TimelineData, variant: string) {
  return normalizeTimelineData(value, variant);
}

function findOptionLabel(
  options: Array<{ id: string; label: string }>,
  value: string | undefined,
  fallback: string
) {
  return options.find((option) => option.id === value)?.label ?? fallback;
}

function formatTimelineLayoutSummary(layout: TimelineData["layout"], stepCount: number) {
  const normalized = {
    orientation: layout?.orientation ?? "horizontal",
    align: layout?.align ?? "center",
    spacing: layout?.spacing ?? "md",
    labelPosition: layout?.labelPosition ?? "top",
    padding: layout?.padding ?? "md",
    sectionSpacing: layout?.sectionSpacing ?? "none",
    maxWidth: layout?.maxWidth ?? "6xl",
  };
  const maxWidthDiagnostics = resolveTimelineMaxWidthDiagnostics(normalized, stepCount);
  const widthLabel = findOptionLabel(maxWidthOptions, normalized.maxWidth, "6XL");
  const effectiveWidthLabel = findOptionLabel(
    maxWidthOptions,
    maxWidthDiagnostics.effective,
    widthLabel
  );

  return [
    `Orientation: ${findOptionLabel(orientationOptions, normalized.orientation, "Horizontal")}`,
    `Alignment: ${findOptionLabel(alignOptions, normalized.align, "Center")}`,
    `Spacing: ${findOptionLabel(spacingOptions, normalized.spacing, "Default")}`,
    `Padding: ${findOptionLabel(paddingOptions, normalized.padding, "Default")}`,
    maxWidthDiagnostics.narrowed
      ? `Width: ${widthLabel} (renders as ${effectiveWidthLabel} for 3 or fewer steps)`
      : `Width: ${widthLabel}`,
    `Labels: ${findOptionLabel(labelPositionOptions, normalized.labelPosition, "Top")}`,
  ].join("; ");
}

function formatTimelineGuidesSummary(guides: TimelineData["guides"]) {
  const enabled = guides?.enabled ?? true;
  const style = guides?.style ?? "dashed";
  return enabled
    ? `Enabled, ${findOptionLabel(guideStyleOptions, style, "Dashed")} style.`
    : "Disabled.";
}

function formatTimelineStyleSummary(style: TimelineData["style"], steps: TimelineStep[]) {
  const markerDisplay = style?.markerDisplay ?? "dot";
  const markerFallbackCount = countTimelineIconMarkerFallbacks(steps, markerDisplay);
  const markerFallbackSummary =
    markerFallbackCount > 0
      ? ` (${markerFallbackCount} step${markerFallbackCount === 1 ? "" : "s"} fall back to dots without marker icons)`
      : "";

  return [
    `Line: ${findOptionLabel(lineStyleOptions, style?.lineStyle, "Solid")}`,
    `Thickness: ${findOptionLabel(thicknessOptions, style?.thickness, "2px")}`,
    `Marker: ${findOptionLabel(markerDisplayOptions, markerDisplay, "Dot")} / ${findOptionLabel(markerSizeOptions, style?.markerSize, "Medium")}${markerFallbackSummary}`,
    `Title: ${findOptionLabel(titleSizeOptions, style?.titleSize, "Base")} ${findOptionLabel(titleWeightOptions, style?.titleWeight, "Semibold")}`,
    `Description: ${findOptionLabel(descriptionSizeOptions, style?.descriptionSize, "Extra small")}`,
  ].join("; ");
}

function formatTimelineBackgroundSummary(background: TimelineData["background"]) {
  const color = background?.color?.trim();
  if (!color || color === "transparent") return "Inherited / transparent";
  return color;
}

function describeTimelineColorValue(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return "Theme default";
  if (normalized === "transparent") return "Transparent";
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return "Selected swatch";
  return "Saved custom color";
}

function countConfiguredStepOverrides(
  steps: TimelineStep[],
  selector: (step: TimelineStep) => string | undefined
) {
  return steps.filter((step) => {
    const value = selector(step)?.trim();
    return Boolean(value);
  }).length;
}

function describeTimelineStepLinkCoverage(
  rawSteps: TimelineStep[],
  normalizedSteps: TimelineStep[],
  kind: "cta" | "link"
) {
  const rawCount = rawSteps.filter((step) => {
    const source = kind === "cta" ? step.cta : step.link;
    const href = source?.href?.trim();
    return Boolean(href);
  }).length;
  const safeCount = normalizedSteps.filter((step) => {
    const source = kind === "cta" ? step.cta : step.link;
    return Boolean(source?.href?.trim());
  }).length;
  if (rawCount === 0) return "Not configured";
  if (rawCount === safeCount) {
    return `${safeCount} safe ${kind === "cta" ? "CTA" : "whole-step"} destination${
      safeCount === 1 ? "" : "s"
    }`;
  }
  return `${safeCount} safe ${kind === "cta" ? "CTA" : "whole-step"} destination${
    safeCount === 1 ? "" : "s"
  }; ${rawCount - safeCount} invalid ${rawCount - safeCount === 1 ? "value was" : "values were"} dropped`;
}

function TimelineStructureFields({
  value,
  onChange,
  variant = "milestones",
  onVariantChange,
  onBlockPatch,
  includeStepCount = true,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
  variant?: string;
  onVariantChange?: (next: string) => void;
  onBlockPatch?: WidgetEditorProps<TimelineData>["onBlockPatch"];
  includeStepCount?: boolean;
}) {
  const steps = getNormalizedSteps(value);
  const mode = resolveTimelineMode(value.mode, variant);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {includeStepCount ? (
        <TimelineSelectControl
          id="timeline.visual.step-count"
          label="Number of steps"
          path="steps.count"
          value={String(steps.length)}
          onValueChange={(next) => setStepsCount(value, onChange, Number(next))}
          options={stepCountOptions.map((count) => ({
            id: String(count),
            label: `${count} steps`,
          }))}
          placeholder="Select step count"
        />
      ) : null}

      <TimelineSelectControl
        id="timeline.visual.mode"
        label="Timeline mode"
        path="mode"
        value={mode}
        onValueChange={(next) =>
          updateMode(value, onChange, next as TimelineMode, onVariantChange, onBlockPatch)
        }
        options={modeOptions}
        placeholder="Select mode"
      />

      <TimelineSelectControl
        id="timeline.visual.orientation"
        label="Orientation"
        path="layout.orientation"
        value={value.layout?.orientation ?? "horizontal"}
        onValueChange={(next) =>
          updateLayout(value, onChange, {
            orientation: next as TimelineLayout["orientation"],
          })
        }
        options={orientationOptions}
        placeholder="Orientation"
      />

      <TimelineSelectControl
        id="timeline.visual.label-position"
        label="Label position"
        path="layout.labelPosition"
        value={value.layout?.labelPosition ?? "top"}
        onValueChange={(next) =>
          updateLayout(value, onChange, {
            labelPosition: next as TimelineLayout["labelPosition"],
          })
        }
        options={labelPositionOptions}
        placeholder="Label position"
      />

      <TimelineSelectControl
        id="timeline.visual.align"
        label="Alignment"
        path="layout.align"
        value={value.layout?.align ?? "center"}
        onValueChange={(next) =>
          updateLayout(value, onChange, {
            align: next as TimelineLayout["align"],
          })
        }
        options={alignOptions}
        placeholder="Alignment"
      />
    </div>
  );
}

function TimelineGuidesAndAxisFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  return (
    <>
      <WidgetControlRow
        id="timeline.visual.guides-enabled"
        label="Show guide lines"
        path="guides.enabled"
      >
        {() => (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Display helper connectors across the timeline.
            </p>
            <Switch
              checked={value.guides?.enabled ?? true}
              onCheckedChange={(checked) => updateGuides(value, onChange, { enabled: checked })}
            />
          </div>
        )}
      </WidgetControlRow>

      <div className="grid gap-3 md:grid-cols-3">
        <TimelineSelectControl
          id="timeline.visual.guide-style"
          label="Guide style"
          path="guides.style"
          value={value.guides?.style ?? "dashed"}
          onValueChange={(next) =>
            updateGuides(value, onChange, {
              style: next as TimelineGuides["style"],
            })
          }
          options={guideStyleOptions}
          placeholder="Guide style"
        />
        <TimelineSelectControl
          id="timeline.visual.line-style"
          label="Line style"
          path="style.lineStyle"
          value={value.style?.lineStyle ?? "solid"}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              lineStyle: next as TimelineStyle["lineStyle"],
            })
          }
          options={lineStyleOptions}
          placeholder="Line style"
        />
        <TimelineSelectControl
          id="timeline.visual.line-thickness"
          label="Line thickness"
          path="style.thickness"
          value={value.style?.thickness ?? "2"}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              thickness: next as TimelineStyle["thickness"],
            })
          }
          options={thicknessOptions}
          placeholder="Thickness"
        />
      </div>
    </>
  );
}

function TimelineMarkerFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  const steps = getNormalizedSteps(value);
  const markerDisplay = value.style?.markerDisplay ?? "dot";
  const markerFallbackCount = countTimelineIconMarkerFallbacks(steps, markerDisplay);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <TimelineSelectControl
          id="timeline.visual.marker-size"
          label="Marker size"
          path="style.markerSize"
          value={value.style?.markerSize ?? "md"}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              markerSize: next as TimelineStyle["markerSize"],
            })
          }
          options={markerSizeOptions}
          placeholder="Marker size"
        />

        <TimelineSelectControl
          id="timeline.visual.marker-display"
          label="Marker display"
          path="style.markerDisplay"
          value={markerDisplay}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              markerDisplay: next as TimelineStyle["markerDisplay"],
            })
          }
          options={markerDisplayOptions}
          placeholder="Marker display"
          description={
            <>
              <p>
                {markerDisplayOptions.find((option) => option.id === markerDisplay)?.description}
              </p>
              {markerDisplay === "icon" ? (
                <p className="text-amber-700">
                  {markerFallbackCount > 0
                    ? `${markerFallbackCount} step${
                        markerFallbackCount === 1 ? "" : "s"
                      } without a marker icon or decorative step icon will render dot markers.`
                    : "Every step has a marker icon or decorative step icon for icon marker mode."}
                </p>
              ) : null}
            </>
          }
        />

        <ColorField
          id="timeline.visual.global-marker-color"
          label="Global marker color"
          path="style.markerColor"
          value={value.style?.markerColor}
          onChange={(next) => updateStyle(value, onChange, { markerColor: next })}
          onClear={() => clearStyle(value, onChange, "markerColor")}
          placeholder="#1d4ed8"
          pickerFallback="#1d4ed8"
          helperText="Steps inherit this color until a local accent or marker background overrides it."
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id ?? `${index}`} className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Step {index + 1} marker group</p>
              <p className="text-xs text-muted-foreground">
                Accent fallback, marker icon, and marker colors stay grouped here so dense timelines
                remain scannable.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ColorField
                id={`timeline.visual.step.${index}.accent`}
                label={`Step ${index + 1} accent`}
                path="steps.accent"
                value={step.accent}
                onChange={(next) => updateStep(value, onChange, index, { accent: next })}
                onClear={() => updateStep(value, onChange, index, { accent: undefined })}
                placeholder="#1d4ed8"
                pickerFallback="#1d4ed8"
                helperText="Optional per-step accent. Leave empty to inherit the global marker color."
              />
              <TimelineInputControl
                id={`timeline.visual.step.${index}.marker-icon`}
                label={`Step ${index + 1} marker icon`}
                path="steps.markerIcon"
                value={step.markerIcon ?? ""}
                onChange={(next) => updateStep(value, onChange, index, { markerIcon: next })}
                placeholder="Marker icon or emoji"
              />
              <ColorField
                id={`timeline.visual.step.${index}.marker-background`}
                label={`Step ${index + 1} marker background`}
                path="steps.markerBackgroundColor"
                value={step.markerBackgroundColor}
                onChange={(next) =>
                  updateStep(value, onChange, index, { markerBackgroundColor: next })
                }
                onClear={() =>
                  updateStep(value, onChange, index, { markerBackgroundColor: undefined })
                }
                placeholder="#1d4ed8"
                pickerFallback="#1d4ed8"
                helperText="Used when the marker display is dot, number, or icon."
              />
              <ColorField
                id={`timeline.visual.step.${index}.marker-icon-color`}
                label={`Step ${index + 1} marker icon color`}
                path="steps.markerIconColor"
                value={step.markerIconColor}
                onChange={(next) => updateStep(value, onChange, index, { markerIconColor: next })}
                onClear={() => updateStep(value, onChange, index, { markerIconColor: undefined })}
                placeholder="#ffffff"
                pickerFallback="#ffffff"
                helperText="Used when the marker display renders a number or icon inside the marker."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineColorFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  const markerContrastAdvisory = resolveColorContrastAdvisory({
    foreground: value.style?.markerColor,
    background: value.background?.color,
  });
  const textContrastAdvisory = pickContrastAdvisory([
    resolveColorContrastAdvisory({
      foreground: value.style?.titleColor,
      background: value.background?.color,
    }),
    resolveColorContrastAdvisory({
      foreground: value.style?.descriptionColor,
      background: value.background?.color,
    }),
  ]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <ColorField
          id="timeline.visual.line-color"
          label="Line color"
          path="style.lineColor"
          value={value.style?.lineColor}
          onChange={(next) => updateStyle(value, onChange, { lineColor: next })}
          onClear={() => clearStyle(value, onChange, "lineColor")}
          placeholder="#e2e8f0"
          pickerFallback="#e2e8f0"
        />
        <ColorField
          id="timeline.visual.title-color"
          label="Title color"
          path="style.titleColor"
          value={value.style?.titleColor}
          onChange={(next) => updateStyle(value, onChange, { titleColor: next })}
          onClear={() => clearStyle(value, onChange, "titleColor")}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
        />
        <ColorField
          id="timeline.visual.description-color"
          label="Description color"
          path="style.descriptionColor"
          value={value.style?.descriptionColor}
          onChange={(next) => updateStyle(value, onChange, { descriptionColor: next })}
          onClear={() => clearStyle(value, onChange, "descriptionColor")}
          placeholder="#334155"
          pickerFallback="#334155"
        />
        <ColorField
          id="timeline.visual.background-color"
          label="Background color"
          path="background.color"
          value={value.background?.color}
          onChange={(next) => updateBackground(value, onChange, next)}
          onClear={() => clearBackground(value, onChange)}
          placeholder="transparent"
          pickerFallback="#ffffff"
          allowTransparent
        />
      </div>
      <div className="space-y-1">
        <ColorContrastNotice advisory={markerContrastAdvisory} label="Marker contrast advisory" />
        <ColorContrastNotice advisory={textContrastAdvisory} label="Text contrast advisory" />
      </div>
    </>
  );
}

function TimelineTypographyFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  const steps = getNormalizedSteps(value);
  const maxWidthDiagnostics = resolveTimelineMaxWidthDiagnostics(value.layout, steps.length);

  return (
    <div className="space-y-4">
      {value.style?.titleSize === "none" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Step titles are currently hidden. Choose a visible title size here when authors should see
          step titles on the page.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <TimelineInputControl
          id="timeline.visual.header-title"
          label="Header title"
          path="header.title"
          value={value.header?.title ?? ""}
          onChange={(next) => updateHeader(value, onChange, { title: next })}
          placeholder="Timeline heading"
        />
        <TimelineTextareaControl
          id="timeline.visual.header-description"
          label="Header description"
          path="header.description"
          value={value.header?.description ?? ""}
          onChange={(next) => updateHeader(value, onChange, { description: next })}
          placeholder="Optional context above the timeline"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TimelineSelectControl
          id="timeline.visual.title-size"
          label="Title size"
          path="style.titleSize"
          value={value.style?.titleSize ?? "base"}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              titleSize: next as TimelineStyle["titleSize"],
            })
          }
          options={titleSizeOptions}
          placeholder="Title size"
        />

        <TimelineSelectControl
          id="timeline.visual.title-weight"
          label="Title weight"
          path="style.titleWeight"
          value={value.style?.titleWeight ?? "semibold"}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              titleWeight: next as TimelineStyle["titleWeight"],
            })
          }
          options={titleWeightOptions}
          placeholder="Title weight"
        />

        <TimelineSelectControl
          id="timeline.visual.description-size"
          label="Description size"
          path="style.descriptionSize"
          value={value.style?.descriptionSize ?? "xs"}
          onValueChange={(next) =>
            updateStyle(value, onChange, {
              descriptionSize: next as TimelineStyle["descriptionSize"],
            })
          }
          options={descriptionSizeOptions}
          placeholder="Description size"
          description={
            value.style?.descriptionSize === "none"
              ? "None keeps descriptions visible and clears the explicit size class so the surrounding typography can inherit."
              : undefined
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <TimelineSelectControl
          id="timeline.visual.spacing"
          label="Spacing"
          path="layout.spacing"
          value={value.layout?.spacing ?? "md"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              spacing: next as TimelineLayout["spacing"],
            })
          }
          options={spacingOptions}
          placeholder="Spacing"
          description={spacingDescriptions[value.layout?.spacing ?? "md"]}
        />

        <TimelineSelectControl
          id="timeline.visual.padding"
          label="Section padding"
          path="layout.padding"
          value={value.layout?.padding ?? "md"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              padding: next as TimelineLayout["padding"],
            })
          }
          options={paddingOptions}
          placeholder="Padding"
        />

        <TimelineSelectControl
          id="timeline.visual.section-spacing"
          label="Outer section spacing"
          path="layout.sectionSpacing"
          value={value.layout?.sectionSpacing ?? "none"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              sectionSpacing: next as TimelineLayout["sectionSpacing"],
            })
          }
          options={sectionSpacingOptions}
          placeholder="Section spacing"
        />

        <TimelineSelectControl
          id="timeline.visual.max-width"
          label="Max width"
          path="layout.maxWidth"
          value={value.layout?.maxWidth ?? "6xl"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              maxWidth: next as TimelineLayout["maxWidth"],
            })
          }
          options={maxWidthOptions}
          placeholder="Max width"
          description={
            maxWidthDiagnostics.narrowed
              ? "6XL renders as 5XL while this timeline has 3 or fewer steps."
              : undefined
          }
        />
      </div>
    </div>
  );
}

export function TimelineWizardEditor({ value, variant }: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const variantLabel =
    variantOptions.find((option) => option.id === variant)?.label ?? variantOptions[0]?.label;

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.wizard.starter-steps"
        mode="wizard"
        role="setup"
        title="Starter steps"
        description="Wizard summarizes the saved timeline story. Visual owns variant changes, daily status, marker accents, guides, layout, and destination changes."
      >
        <ReadonlyWidgetSummaryRow
          id="timeline.wizard.variant"
          label="Timeline style"
          path="variant"
          value={variantLabel}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="timeline.wizard.header.title"
            label="Header title"
            path="header.title"
            value={value.header?.title ?? "No header title yet"}
          />
          <ReadonlyWidgetSummaryRow
            id="timeline.wizard.header.description"
            label="Header description"
            path="header.description"
            value={value.header?.description ?? "No header description yet"}
          />
        </div>

        <div className="space-y-2">
          <ReadonlyWidgetSummaryRow
            id="timeline.wizard.steps.count"
            label="Number of steps"
            path="steps.count"
            value={`${steps.length} steps`}
          />
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Visual owns daily step details such as status, icons, accents, dates, and destinations.
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id ?? `${index}`} className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-semibold">Step {index + 1}</p>

              <ReadonlyWidgetSummaryRow
                id={`timeline.wizard.steps.${index}.title`}
                label={`Step ${index + 1} title`}
                path="steps.title"
                value={step.title || `Step ${index + 1}`}
              />
              <ReadonlyWidgetSummaryRow
                id={`timeline.wizard.steps.${index}.description`}
                label={`Step ${index + 1} description`}
                path="steps.description"
                value={step.description || "No description yet"}
              />
            </div>
          ))}
        </div>
      </EditorSection>
    </div>
  );
}

export function TimelineVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const mode = resolveTimelineMode(value.mode, variant);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleStepDragStart = (event: DragEvent<HTMLButtonElement>, index: number) => {
    event.dataTransfer.setData("text/plain", `timeline-step:${index}`);
    event.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleStepDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleStepDrop = (event: DragEvent<HTMLDivElement>, toIndex: number) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("text/plain");
    const [, rawIndex] = payload.split(":");
    const fromIndex = Number(rawIndex);
    setDraggedIndex(null);
    if (!Number.isInteger(fromIndex) || fromIndex === toIndex) return;
    moveStep(value, onChange, fromIndex, toIndex);
  };

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.mode-layout"
        mode="visual"
        role="visual"
        title="Variant and timeline structure"
        description="Choose timeline variant and core structure before styling details."
      >
        <WidgetControlRow id="timeline.visual.variant" label="Timeline variant" path="variant">
          {() => <TimelineVariantCards value={variant} mode={mode} onChange={onVariantChange} />}
        </WidgetControlRow>
        <div className="space-y-2">
          <p className="text-sm font-medium">Mode preview</p>
          <TimelineModeCards
            value={mode}
            onChange={(next) => updateMode(value, onChange, next, onVariantChange, onBlockPatch)}
          />
          <p className="text-xs text-muted-foreground">{getTimelineModeCopy(mode)}</p>
        </div>
        <TimelineStructureFields
          value={value}
          onChange={onChange}
          variant={variant}
          onVariantChange={onVariantChange}
          onBlockPatch={onBlockPatch}
        />
      </EditorSection>

      <EditorSection
        id="timeline.items-dates"
        mode="visual"
        role="content"
        title="Steps content and order"
        description="Edit content for each step, validate dates, and reorder without leaving Visual mode."
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{steps.length} steps configured</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep(value, onChange)}
            disabled={steps.length >= timelineStepMax}
            data-widget-control="timeline.visual.step.add"
            data-widget-control-path="steps"
            data-widget-control-ownership="action"
          >
            Add step
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const dateFeedback = getDateFeedback(step.date);
            const hasCta = Boolean(step.cta?.label?.trim() && step.cta?.href?.trim());
            return (
              <div
                key={step.id ?? `${index}`}
                className={cn(
                  "space-y-3 rounded-lg border p-3",
                  draggedIndex === index ? "border-primary/60 bg-primary/5" : undefined
                )}
                onDragOver={handleStepDragOver}
                onDrop={(event) => handleStepDrop(event, index)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      draggable={steps.length > 1}
                      onDragStart={(event) => handleStepDragStart(event, index)}
                      onDragEnd={() => setDraggedIndex(null)}
                      aria-label={`Drag step ${index + 1}`}
                      title={`Drag step ${index + 1}`}
                      data-widget-control={`timeline.visual.step.${index}.drag`}
                      data-widget-control-path="steps.order"
                      data-widget-control-ownership="action"
                    >
                      Drag
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(value, onChange, index, index - 1)}
                      disabled={index === 0}
                      data-widget-control={`timeline.visual.step.${index}.move-up`}
                      data-widget-control-path="steps.order"
                      data-widget-control-ownership="action"
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(value, onChange, index, index + 1)}
                      disabled={index === steps.length - 1}
                      data-widget-control={`timeline.visual.step.${index}.move-down`}
                      data-widget-control-path="steps.order"
                      data-widget-control-ownership="action"
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(value, onChange, index)}
                      disabled={steps.length <= timelineStepMin}
                      data-widget-control={`timeline.visual.step.${index}.remove`}
                      data-widget-control-path="steps"
                      data-widget-control-ownership="action"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <TimelineInputControl
                  id={`timeline.visual.step.${index}.title`}
                  label={`Step ${index + 1} title`}
                  path="steps.title"
                  value={step.title}
                  onChange={(next) => updateStep(value, onChange, index, { title: next })}
                  placeholder="Step title"
                />
                <TimelineTextareaControl
                  id={`timeline.visual.step.${index}.description`}
                  label={`Step ${index + 1} description`}
                  path="steps.description"
                  value={step.description ?? ""}
                  onChange={(next) =>
                    updateStep(value, onChange, index, {
                      description: next,
                    })
                  }
                  placeholder="Step description"
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <TimelineInputControl
                    id={`timeline.visual.step.${index}.date`}
                    label={`Step ${index + 1} date`}
                    path="steps.date"
                    value={step.date ?? ""}
                    onChange={(next) => updateStep(value, onChange, index, { date: next })}
                    placeholder="2026-05-11"
                    description={dateFeedback.message}
                    descriptionClassName={
                      dateFeedback.valid ? "text-muted-foreground" : "text-destructive"
                    }
                  />
                  <TimelineInputControl
                    id={`timeline.visual.step.${index}.date-label`}
                    label={`Step ${index + 1} date label`}
                    path="steps.dateLabel"
                    value={step.dateLabel ?? ""}
                    onChange={(next) => updateStep(value, onChange, index, { dateLabel: next })}
                    placeholder="May 11, 2026"
                    description="Date label is optional editorial copy for readers and stays intact even if Date is empty."
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <TimelineSelectControl
                    id={`timeline.visual.step.${index}.status`}
                    label={`Step ${index + 1} status`}
                    path="steps.status"
                    value={step.status ?? "__none__"}
                    onValueChange={(next) =>
                      updateStep(value, onChange, index, {
                        status: next === "__none__" ? undefined : (next as TimelineStatus),
                      })
                    }
                    options={visualStatusOptions}
                    placeholder="Status"
                    description="Leave status empty to omit the badge until the step actually needs one."
                  />
                  <TimelineInputControl
                    id={`timeline.visual.step.${index}.icon`}
                    label={`Step ${index + 1} icon`}
                    path="steps.icon"
                    value={step.icon ?? ""}
                    onChange={(next) => updateStep(value, onChange, index, { icon: next })}
                    placeholder="Icon text or emoji"
                    description="Optional decorative icon shown next to the step title."
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <TimelineInputControl
                    id={`timeline.visual.step.${index}.cta-label`}
                    label={`Step ${index + 1} CTA label`}
                    path="steps.cta.label"
                    value={step.cta?.label ?? ""}
                    onChange={(next) => updateStepCta(value, onChange, index, { label: next })}
                    placeholder="Step CTA label"
                  />
                  <LinkDestinationField
                    fieldId={`timeline-step-${index + 1}-cta-destination`}
                    label="Step CTA destination"
                    value={step.cta?.href}
                    onChange={(next) => updateStepCta(value, onChange, index, { href: next })}
                    controlPath="steps.cta.href"
                    emptyLabel="No CTA destination"
                    helpText="Choose an existing site page for this step CTA. Saved custom destinations stay replace-or-clear only."
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <TimelineInputControl
                    id={`timeline.visual.step.${index}.link-label`}
                    label={`Step ${index + 1} whole-step link label`}
                    path="steps.link.label"
                    value={step.link?.label ?? ""}
                    onChange={(next) => updateStepLink(value, onChange, index, { label: next })}
                    placeholder="Whole-step link label"
                  />
                  <LinkDestinationField
                    fieldId={`timeline-step-${index + 1}-link-destination`}
                    label="Whole-step destination"
                    value={step.link?.href}
                    onChange={(next) => updateStepLink(value, onChange, index, { href: next })}
                    controlPath="steps.link.href"
                    emptyLabel="No whole-step destination"
                    helpText="Use this only when the whole step should open one selected site page."
                    feedback={
                      hasCta
                        ? "Whole-step links are disabled when a CTA link is configured to avoid nested anchors."
                        : null
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </EditorSection>

      <EditorSection
        id="timeline.axis-markers"
        mode="visual"
        role="visual"
        title="Guides and axis line"
        description="Control helper guides and axis line appearance."
      >
        <TimelineGuidesAndAxisFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="timeline.markers-accents"
        mode="visual"
        role="visual"
        title="Markers and accents"
        description="Configure marker sizing, marker mode, and grouped per-step accent controls."
      >
        <TimelineMarkerFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="timeline.colors"
        mode="visual"
        role="visual"
        title="Colors and background"
        description="Set line, marker, text, and section background colors."
      >
        <TimelineColorFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="timeline.typography-spacing"
        mode="visual"
        role="visual"
        title="Typography and spacing"
        description="Tune section header, typography scale, and container spacing tokens."
      >
        <TimelineTypographyFields value={value} onChange={onChange} />
      </EditorSection>
    </div>
  );
}

export function TimelineAdvancedEditor({ value, variant }: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const normalized = normalizeTimelinePayload(value, variant);
  const normalizedSteps = normalized.steps ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Advanced mode is read-only. Use Visual for public-facing timeline steps, layout, guides,
        markers, colors, background, and typography changes.
      </p>

      <EditorSection
        id="timeline.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only summary of the saved renderer contract. Visual owns normal editing."
      >
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-variant"
          label="Variant"
          path="variant"
          value={variant}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-mode"
          label="Mode"
          path="mode"
          value={resolveTimelineMode(value.mode, variant)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-steps"
          label="Steps"
          path="steps"
          value={`${steps.length} configured steps.`}
        />
      </EditorSection>

      <EditorSection
        id="timeline.layout-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Layout diagnostics"
        description="Read-only layout, guide, and style state. Change these in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-layout"
          label="Layout"
          path="layout"
          value={formatTimelineLayoutSummary(normalized.layout, normalizedSteps.length)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-guides"
          label="Guides"
          path="guides"
          value={formatTimelineGuidesSummary(normalized.guides)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-style"
          label="Style"
          path="style"
          value={formatTimelineStyleSummary(normalized.style, normalizedSteps)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-line-color"
          label="Line color"
          path="style.lineColor"
          value={describeTimelineColorValue(normalized.style?.lineColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-marker-color"
          label="Global marker color"
          path="style.markerColor"
          value={describeTimelineColorValue(normalized.style?.markerColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-title-color"
          label="Title color"
          path="style.titleColor"
          value={describeTimelineColorValue(normalized.style?.titleColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-description-color"
          label="Description color"
          path="style.descriptionColor"
          value={describeTimelineColorValue(normalized.style?.descriptionColor)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-background"
          label="Background"
          path="background"
          value={formatTimelineBackgroundSummary(normalized.background)}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-step-accents"
          label="Step accents"
          path="steps.accent"
          value={`${countConfiguredStepOverrides(normalizedSteps, (step) => step.accent)} override${
            countConfiguredStepOverrides(normalizedSteps, (step) => step.accent) === 1 ? "" : "s"
          }`}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-step-marker-backgrounds"
          label="Step marker backgrounds"
          path="steps.markerBackgroundColor"
          value={`${countConfiguredStepOverrides(
            normalizedSteps,
            (step) => step.markerBackgroundColor
          )} override${
            countConfiguredStepOverrides(normalizedSteps, (step) => step.markerBackgroundColor) ===
            1
              ? ""
              : "s"
          }`}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-step-marker-icon-colors"
          label="Step marker icon colors"
          path="steps.markerIconColor"
          value={`${countConfiguredStepOverrides(
            normalizedSteps,
            (step) => step.markerIconColor
          )} override${
            countConfiguredStepOverrides(normalizedSteps, (step) => step.markerIconColor) === 1
              ? ""
              : "s"
          }`}
        />
      </EditorSection>

      <EditorSection
        id="timeline.data-normalization"
        mode="advanced"
        role="summary"
        title="Data normalization"
        description="Read-only normalization, safe-link, and ownership summary for the current payload."
      >
        <p className="text-xs text-muted-foreground">
          Current steps: {steps.length}. Normalization keeps payload compatible with runtime rules
          (`{timelineStepMin}-{timelineStepMax}` steps, unique stable IDs).
        </p>
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-normalization-scope"
          label="Normalization scope"
          path="steps"
          value="Step count clamp, unique stable IDs, safe mode/layout defaults, and inherited background fallback."
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-safe-cta-links"
          label="Step CTA links"
          path="steps.cta.href"
          value={describeTimelineStepLinkCoverage(steps, normalizedSteps, "cta")}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-safe-step-links"
          label="Whole-step links"
          path="steps.link.href"
          value={describeTimelineStepLinkCoverage(steps, normalizedSteps, "link")}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-wizard-owner"
          label="Wizard owns"
          path="variant"
          value="Starter story summary only."
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-visual-owner"
          label="Visual owns"
          path="steps"
          value="Variant, steps, guides, markers, colors, background, and typography spacing."
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-advanced-owner"
          label="Advanced owns"
          path="editorContract"
          value="Read-only runtime, layout diagnostics, and normalization summaries."
        />
      </EditorSection>
    </div>
  );
}
