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
  normalizeTimelineData,
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
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
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import type { WidgetEditorProps } from "../../../../widgets/types";
import {
  ClearableFieldHeader,
  ColorContrastNotice,
  type ColorContrastAdvisory,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

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

const wizardStatusOptions: Array<{ id: string; label: string }> = [
  { id: "__none__", label: "Not set" },
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Current" },
  { id: "complete", label: "Complete" },
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
  { id: "none", label: "None" },
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

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
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

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

const isValidTimelineHref = (value: string | undefined) =>
  !value ||
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  }) !== undefined;

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
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function ColorField({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  pickerFallback = "#0f172a",
  helperText,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder: string;
  pickerFallback?: string;
  helperText?: string;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader
        label={label}
        value={value}
        onClear={onClear}
        onRestoreValue={onChange}
      />
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

function TimelineVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Timeline style</p>
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose variant" />
        </SelectTrigger>
        <SelectContent>
          {variantOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TimelineVariantCards({
  value,
  onChange,
}: {
  value: string;
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

function TimelineStructureFields({
  value,
  onChange,
  variant = "milestones",
  includeStepCount = true,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
  variant?: string;
  includeStepCount?: boolean;
}) {
  const steps = getNormalizedSteps(value);
  const mode = resolveTimelineMode(value.mode, variant);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {includeStepCount ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Number of steps</p>
          <Select
            value={String(steps.length)}
            onValueChange={(next) => setStepsCount(value, onChange, Number(next))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select step count" />
            </SelectTrigger>
            <SelectContent>
              {stepCountOptions.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} steps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Timeline mode</p>
        <Select
          value={mode}
          onValueChange={(next) => updateMode(value, onChange, next as TimelineMode)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {modeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Orientation</p>
        <Select
          value={value.layout?.orientation ?? "horizontal"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              orientation: next as TimelineLayout["orientation"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Orientation" />
          </SelectTrigger>
          <SelectContent>
            {orientationOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Label position</p>
        <Select
          value={value.layout?.labelPosition ?? "top"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              labelPosition: next as TimelineLayout["labelPosition"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Label position" />
          </SelectTrigger>
          <SelectContent>
            {labelPositionOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Alignment</p>
        <Select
          value={value.layout?.align ?? "center"}
          onValueChange={(next) =>
            updateLayout(value, onChange, {
              align: next as TimelineLayout["align"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Alignment" />
          </SelectTrigger>
          <SelectContent>
            {alignOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show guide lines</p>
          <p className="text-xs text-muted-foreground">
            Display helper connectors across the timeline.
          </p>
        </div>
        <Switch
          checked={value.guides?.enabled ?? true}
          onCheckedChange={(checked) => updateGuides(value, onChange, { enabled: checked })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Guide style</p>
          <Select
            value={value.guides?.style ?? "dashed"}
            onValueChange={(next) =>
              updateGuides(value, onChange, {
                style: next as TimelineGuides["style"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Guide style" />
            </SelectTrigger>
            <SelectContent>
              {guideStyleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Line style</p>
          <Select
            value={value.style?.lineStyle ?? "solid"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                lineStyle: next as TimelineStyle["lineStyle"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Line style" />
            </SelectTrigger>
            <SelectContent>
              {lineStyleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Line thickness</p>
          <Select
            value={value.style?.thickness ?? "2"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                thickness: next as TimelineStyle["thickness"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Thickness" />
            </SelectTrigger>
            <SelectContent>
              {thicknessOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Marker size</p>
          <Select
            value={value.style?.markerSize ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                markerSize: next as TimelineStyle["markerSize"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Marker size" />
            </SelectTrigger>
            <SelectContent>
              {markerSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Marker display</p>
          <Select
            value={value.style?.markerDisplay ?? "dot"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                markerDisplay: next as TimelineStyle["markerDisplay"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Marker display" />
            </SelectTrigger>
            <SelectContent>
              {markerDisplayOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {
              markerDisplayOptions.find(
                (option) => option.id === (value.style?.markerDisplay ?? "dot")
              )?.description
            }
          </p>
        </div>

        <ColorField
          label="Global marker color"
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
                label={`Step ${index + 1} accent`}
                value={step.accent}
                onChange={(next) => updateStep(value, onChange, index, { accent: next })}
                placeholder="#1d4ed8"
                pickerFallback="#1d4ed8"
                helperText="Optional per-step accent. Leave empty to inherit the global marker color."
              />
              <Input
                value={step.markerIcon ?? ""}
                onChange={(event) =>
                  updateStep(value, onChange, index, { markerIcon: event.target.value })
                }
                placeholder="Marker icon or emoji"
              />
              <ColorField
                label={`Step ${index + 1} marker background`}
                value={step.markerBackgroundColor}
                onChange={(next) =>
                  updateStep(value, onChange, index, { markerBackgroundColor: next })
                }
                placeholder="#1d4ed8"
                pickerFallback="#1d4ed8"
                helperText="Used when the marker display is dot, number, or icon."
              />
              <ColorField
                label={`Step ${index + 1} marker icon color`}
                value={step.markerIconColor}
                onChange={(next) => updateStep(value, onChange, index, { markerIconColor: next })}
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
          label="Line color"
          value={value.style?.lineColor}
          onChange={(next) => updateStyle(value, onChange, { lineColor: next })}
          onClear={() => clearStyle(value, onChange, "lineColor")}
          placeholder="#e2e8f0"
          pickerFallback="#e2e8f0"
        />
        <ColorField
          label="Title color"
          value={value.style?.titleColor}
          onChange={(next) => updateStyle(value, onChange, { titleColor: next })}
          placeholder="#0f172a"
          pickerFallback="#0f172a"
        />
        <ColorField
          label="Description color"
          value={value.style?.descriptionColor}
          onChange={(next) => updateStyle(value, onChange, { descriptionColor: next })}
          placeholder="#334155"
          pickerFallback="#334155"
        />
        <ColorField
          label="Background color"
          value={value.background?.color}
          onChange={(next) => updateBackground(value, onChange, next)}
          onClear={() => clearBackground(value, onChange)}
          placeholder="transparent"
          pickerFallback="#ffffff"
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
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Header title</p>
          <Input
            value={value.header?.title ?? ""}
            onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
            placeholder="Timeline heading"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Header description</p>
          <Textarea
            value={value.header?.description ?? ""}
            onChange={(event) => updateHeader(value, onChange, { description: event.target.value })}
            placeholder="Optional context above the timeline"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Title size</p>
          <Select
            value={value.style?.titleSize ?? "base"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                titleSize: next as TimelineStyle["titleSize"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Title size" />
            </SelectTrigger>
            <SelectContent>
              {titleSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Title weight</p>
          <Select
            value={value.style?.titleWeight ?? "semibold"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                titleWeight: next as TimelineStyle["titleWeight"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Title weight" />
            </SelectTrigger>
            <SelectContent>
              {titleWeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description size</p>
          <Select
            value={value.style?.descriptionSize ?? "xs"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                descriptionSize: next as TimelineStyle["descriptionSize"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Description size" />
            </SelectTrigger>
            <SelectContent>
              {descriptionSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={value.layout?.spacing ?? "md"}
            onValueChange={(next) =>
              updateLayout(value, onChange, {
                spacing: next as TimelineLayout["spacing"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {spacingDescriptions[value.layout?.spacing ?? "md"]}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Section padding</p>
          <Select
            value={value.layout?.padding ?? "md"}
            onValueChange={(next) =>
              updateLayout(value, onChange, {
                padding: next as TimelineLayout["padding"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Padding" />
            </SelectTrigger>
            <SelectContent>
              {paddingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Outer section spacing</p>
          <Select
            value={value.layout?.sectionSpacing ?? "none"}
            onValueChange={(next) =>
              updateLayout(value, onChange, {
                sectionSpacing: next as TimelineLayout["sectionSpacing"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Section spacing" />
            </SelectTrigger>
            <SelectContent>
              {sectionSpacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Max width</p>
          <Select
            value={value.layout?.maxWidth ?? "6xl"}
            onValueChange={(next) =>
              updateLayout(value, onChange, {
                maxWidth: next as TimelineLayout["maxWidth"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Max width" />
            </SelectTrigger>
            <SelectContent>
              {maxWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function TimelineWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const mode = resolveTimelineMode(value.mode, variant);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const pendingRemoveStep =
    typeof pendingRemoveIndex === "number" ? steps[pendingRemoveIndex] : undefined;

  return (
    <div className="space-y-4">
      <TimelineVariantSelect value={variant} onChange={onVariantChange} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Timeline mode</p>
        <Select
          value={mode}
          onValueChange={(next) =>
            updateMode(value, onChange, next as TimelineMode, onVariantChange, onBlockPatch)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {modeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Number of steps</p>
        <Select
          value={String(steps.length)}
          onValueChange={(next) => setStepsCount(value, onChange, Number(next))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select step count" />
          </SelectTrigger>
          <SelectContent>
            {stepCountOptions.map((count) => (
              <SelectItem key={count} value={String(count)}>
                {count} steps
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Orientation</p>
          <Select
            value={value.layout?.orientation ?? "horizontal"}
            onValueChange={(next) =>
              updateLayout(value, onChange, {
                orientation: next as TimelineLayout["orientation"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Orientation" />
            </SelectTrigger>
            <SelectContent>
              {orientationOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show guide lines</p>
            <p className="text-xs text-muted-foreground">Enable helper connectors.</p>
          </div>
          <Switch
            checked={value.guides?.enabled ?? true}
            onCheckedChange={(checked) => updateGuides(value, onChange, { enabled: checked })}
          />
        </div>
      </div>

      {value.style?.titleSize === "none" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Step titles are hidden right now because Title size is set to None. Update Typography and
          spacing if you want titles visible again.
        </div>
      ) : null}

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id ?? `${index}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Step {index + 1}</p>
              {pendingRemoveIndex === index ? (
                <div className="flex items-center gap-2 text-xs">
                  <span>{`Remove ${pendingRemoveStep?.title || `Step ${index + 1}`}?`}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      removeStep(value, onChange, index);
                      setPendingRemoveIndex(null);
                    }}
                    disabled={steps.length <= timelineStepMin}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingRemoveIndex(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingRemoveIndex(index)}
                  disabled={steps.length <= timelineStepMin}
                >
                  Remove
                </Button>
              )}
            </div>

            <Input
              value={step.title}
              onChange={(event) =>
                updateStep(value, onChange, index, { title: event.target.value })
              }
              placeholder={`Step ${index + 1}`}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <Select
                  value={step.status ?? "__none__"}
                  onValueChange={(next) =>
                    updateStep(value, onChange, index, {
                      status: next === "__none__" ? undefined : (next as TimelineStatus),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {wizardStatusOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Icon</p>
                <Input
                  value={step.icon ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="Icon text or emoji"
                />
                <p className="text-xs text-muted-foreground">
                  Plain text or emoji only. Decorative output stays hidden from assistive tech.
                </p>
              </div>
            </div>

            <ColorField
              label={`Step ${index + 1} accent`}
              value={step.accent}
              onChange={(next) => updateStep(value, onChange, index, { accent: next })}
              placeholder="#1d4ed8"
              pickerFallback="#1d4ed8"
              helperText="Optional accent for this step. Leave empty to inherit the global marker color."
            />
          </div>
        ))}
      </div>
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
        title="Variant and timeline structure"
        description="Choose timeline variant and core structure before styling details."
      >
        <TimelineVariantCards value={variant} onChange={onVariantChange} />
        <div className="space-y-2">
          <p className="text-sm font-medium">Mode preview</p>
          <TimelineModeCards
            value={mode}
            onChange={(next) => updateMode(value, onChange, next, onVariantChange, onBlockPatch)}
          />
          <p className="text-xs text-muted-foreground">{getTimelineModeCopy(mode)}</p>
        </div>
        <TimelineStructureFields value={value} onChange={onChange} variant={variant} />
      </EditorSection>

      <EditorSection
        id="timeline.items-dates"
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
                    >
                      Drag
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(value, onChange, index, index - 1)}
                      disabled={index === 0}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(value, onChange, index, index + 1)}
                      disabled={index === steps.length - 1}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(value, onChange, index)}
                      disabled={steps.length <= timelineStepMin}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <Input
                  value={step.title}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { title: event.target.value })
                  }
                  placeholder="Step title"
                />
                <Textarea
                  value={step.description ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, {
                      description: event.target.value,
                    })
                  }
                  placeholder="Step description"
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Input
                      value={step.date ?? ""}
                      onChange={(event) =>
                        updateStep(value, onChange, index, { date: event.target.value })
                      }
                      placeholder="2026-05-11"
                    />
                    <p
                      className={cn(
                        "text-xs",
                        dateFeedback.valid ? "text-muted-foreground" : "text-destructive"
                      )}
                    >
                      {dateFeedback.message}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={step.dateLabel ?? ""}
                      onChange={(event) =>
                        updateStep(value, onChange, index, { dateLabel: event.target.value })
                      }
                      placeholder="May 11, 2026"
                    />
                    <p className="text-xs text-muted-foreground">
                      Date label is optional editorial copy for readers and stays intact even if
                      Date is empty.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Select
                      value={step.status ?? "__none__"}
                      onValueChange={(next) =>
                        updateStep(value, onChange, index, {
                          status: next === "__none__" ? undefined : (next as TimelineStatus),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {visualStatusOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Leave status empty to omit the badge until the step actually needs one.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={step.icon ?? ""}
                      onChange={(event) =>
                        updateStep(value, onChange, index, { icon: event.target.value })
                      }
                      placeholder="Icon text or emoji"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional decorative icon shown next to the step title.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={step.cta?.label ?? ""}
                    onChange={(event) =>
                      updateStepCta(value, onChange, index, { label: event.target.value })
                    }
                    placeholder="Step CTA label"
                  />
                  <div className="space-y-1">
                    <Input
                      value={step.cta?.href ?? ""}
                      onChange={(event) =>
                        updateStepCta(value, onChange, index, { href: event.target.value })
                      }
                      placeholder="/timeline-step"
                    />
                    {!isValidTimelineHref(step.cta?.href) ? (
                      <p className="text-xs text-destructive">
                        Use a relative path, hash, or full URL.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={step.link?.label ?? ""}
                    onChange={(event) =>
                      updateStepLink(value, onChange, index, { label: event.target.value })
                    }
                    placeholder="Whole-step link label"
                  />
                  <div className="space-y-1">
                    <Input
                      value={step.link?.href ?? ""}
                      onChange={(event) =>
                        updateStepLink(value, onChange, index, { href: event.target.value })
                      }
                      placeholder="/timeline-step"
                    />
                    {!isValidTimelineHref(step.link?.href) ? (
                      <p className="text-xs text-destructive">
                        Use a relative path, hash, or full URL.
                      </p>
                    ) : hasCta ? (
                      <p className="text-xs text-muted-foreground">
                        Whole-step links are disabled when a CTA link is configured to avoid nested
                        anchors.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Use this only when the whole step should open one destination.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </EditorSection>

      <EditorSection
        id="timeline.axis-markers"
        title="Guides and axis line"
        description="Control helper guides and axis line appearance."
      >
        <TimelineGuidesAndAxisFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="timeline.markers-accents"
        title="Markers and accents"
        description="Configure marker sizing, marker mode, and grouped per-step accent controls."
      >
        <TimelineMarkerFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="timeline.colors"
        title="Colors and background"
        description="Set line, marker, text, and section background colors."
      >
        <TimelineColorFields value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="timeline.typography-spacing"
        title="Typography and spacing"
        description="Tune section header, typography scale, and container spacing tokens."
      >
        <TimelineTypographyFields value={value} onChange={onChange} />
      </EditorSection>
    </div>
  );
}

export function TimelineAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.layout-tokens"
        title="Layout tokens"
        description="Technical controls for orientation, alignment, and axis labels."
      >
        <TimelineStructureFields
          value={value}
          onChange={onChange}
          includeStepCount={false}
          variant={variant}
        />
      </EditorSection>

      <EditorSection
        id="timeline.data-normalization"
        title="Data normalization"
        description="Normalize step IDs and enforce safe step-count bounds."
      >
        <p className="text-xs text-muted-foreground">
          Current steps: {steps.length}. Normalization keeps payload compatible with runtime rules
          (`{timelineStepMin}-{timelineStepMax}` steps, unique stable IDs).
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(normalizeTimelinePayload(value, variant))}
        >
          Normalize timeline payload
        </Button>
      </EditorSection>
    </div>
  );
}
