import { type ReactNode } from "react";

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
  normalizeTimelineStepCount,
  resolveTimelineMode,
  normalizeTimelineSteps,
  timelineDefaults,
  timelineStepMax,
  timelineStepMin,
  type TimelineAlign,
  type TimelineData,
  type TimelineDescriptionSize,
  type TimelineGuideStyle,
  type TimelineLabelPosition,
  type TimelineLineStyle,
  type TimelineMarkerSize,
  type TimelineMode,
  type TimelineOrientation,
  type TimelineSpacing,
  type TimelineStep,
  type TimelineStatus,
  type TimelineThickness,
  type TimelineTitleSize,
  type TimelineVariantId,
} from "../../../../widgets/core/timeline";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";

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

const modeOptions: Array<{ id: TimelineMode; label: string }> = [
  { id: "process", label: "Process" },
  { id: "axis", label: "Axis" },
  { id: "chronology", label: "Chronology" },
  { id: "alternating", label: "Alternating" },
];

const statusOptions: Array<{ id: TimelineStatus; label: string }> = [
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

const stepCountOptions = Array.from(
  { length: timelineStepMax - timelineStepMin + 1 },
  (_, index) => timelineStepMin + index
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const preferredVariantForMode = (mode: TimelineMode): TimelineVariantId => {
  if (mode === "process") return "compact";
  if (mode === "axis") return "milestones";
  return "cards";
};

const isValidTimelineHref = (value: string | undefined) =>
  !value ||
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  }) !== undefined;

type TimelineLayout = NonNullable<TimelineData["layout"]>;
type TimelineGuides = NonNullable<TimelineData["guides"]>;
type TimelineStyle = NonNullable<TimelineData["style"]>;
type TimelineStepCta = NonNullable<TimelineStep["cta"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

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
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder: string;
  pickerFallback?: string;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
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

function getNormalizedSteps(value: TimelineData) {
  return normalizeTimelineSteps(value.steps);
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

function clearStyle(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  key: keyof TimelineStyle
) {
  const { [key]: _removed, ...nextStyle } = value.style ?? {};
  onChange({
    ...value,
    style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
  });
}

function updateBackground(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  color: string
) {
  onChange({
    ...value,
    background: {
      ...value.background,
      color,
    },
  });
}

function clearBackground(value: TimelineData, onChange: (next: TimelineData) => void) {
  const { color: _removed, ...nextBackground } = value.background ?? {};
  onChange({
    ...value,
    background: Object.keys(nextBackground).length > 0 ? nextBackground : {},
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

function normalizeTimelinePayload(value: TimelineData): TimelineData {
  return {
    ...value,
    mode: resolveTimelineMode(value.mode, "milestones"),
    steps: normalizeTimelineSteps(value.steps),
    layout: {
      orientation: value.layout?.orientation ?? timelineDefaults.layout?.orientation,
      align: value.layout?.align ?? timelineDefaults.layout?.align,
      spacing: value.layout?.spacing ?? timelineDefaults.layout?.spacing,
      labelPosition: value.layout?.labelPosition ?? timelineDefaults.layout?.labelPosition,
    },
    guides: {
      enabled: value.guides?.enabled ?? timelineDefaults.guides?.enabled,
      style: value.guides?.style ?? timelineDefaults.guides?.style,
    },
  };
}

function TimelineStructureFields({
  value,
  onChange,
  onVariantChange,
  onBlockPatch,
  variant = "milestones",
  includeStepCount = true,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
  onVariantChange?: (next: string) => void;
  onBlockPatch?: WidgetEditorProps<TimelineData>["onBlockPatch"];
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
    <>
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

      <div className="grid gap-2 md:grid-cols-2">
        {steps.map((step, index) => (
          <ColorField
            key={step.id ?? `${index}`}
            label={`Step ${index + 1} accent`}
            value={step.accent}
            onChange={(next) => updateStep(value, onChange, index, { accent: next })}
            placeholder="#1d4ed8"
            pickerFallback="#1d4ed8"
          />
        ))}
      </div>
    </>
  );
}

function TimelineColorFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  return (
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
        label="Marker color"
        value={value.style?.markerColor}
        onChange={(next) => updateStyle(value, onChange, { markerColor: next })}
        onClear={() => clearStyle(value, onChange, "markerColor")}
        placeholder="#1d4ed8"
        pickerFallback="#1d4ed8"
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Step titles</p>
        <div className="space-y-2">
          {steps.slice(0, 4).map((step, index) => (
            <Input
              key={step.id ?? `${index}`}
              value={step.title}
              onChange={(event) =>
                updateStep(value, onChange, index, { title: event.target.value })
              }
              placeholder={`Step ${index + 1}`}
            />
          ))}
        </div>
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

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.mode-layout"
        title="Variant and timeline structure"
        description="Choose timeline variant and core structure before styling details."
      >
        <TimelineVariantCards value={variant} onChange={onVariantChange} />
        <TimelineStructureFields
          value={value}
          onChange={onChange}
          onVariantChange={onVariantChange}
          onBlockPatch={onBlockPatch}
          variant={variant}
        />
      </EditorSection>

      <EditorSection
        id="timeline.items-dates"
        title="Steps content and order"
        description="Edit content for each step and reorder without leaving Visual mode."
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
          {steps.map((step, index) => (
            <div key={step.id ?? `${index}`} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {index + 1}
                </p>
                <div className="flex items-center gap-1">
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
                <Input
                  value={step.date ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { date: event.target.value })
                  }
                  placeholder="2026-05-11"
                />
                <Input
                  value={step.dateLabel ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { dateLabel: event.target.value })
                  }
                  placeholder="May 11, 2026"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Select
                  value={step.status ?? "upcoming"}
                  onValueChange={(next) =>
                    updateStep(value, onChange, index, { status: next as TimelineStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={step.icon ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="Icon text or emoji"
                />
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
            </div>
          ))}
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
        description="Configure marker sizing and per-step accent colors."
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
        description="Tune typography scale and spacing density."
      >
        <TimelineTypographyFields value={value} onChange={onChange} />
      </EditorSection>
    </div>
  );
}

export function TimelineAdvancedEditor({ value, onChange }: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.layout-tokens"
        title="Layout tokens"
        description="Technical controls for orientation, alignment, and axis labels."
      >
        <TimelineStructureFields value={value} onChange={onChange} includeStepCount={false} />
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
          onClick={() => onChange(normalizeTimelinePayload(value))}
        >
          Normalize timeline payload
        </Button>
      </EditorSection>
    </div>
  );
}
