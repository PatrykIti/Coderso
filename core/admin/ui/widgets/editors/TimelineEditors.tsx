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

import {
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
  timelineStepMax,
  timelineStepMin,
  type TimelineAlign,
  type TimelineData,
  type TimelineGuideStyle,
  type TimelineLabelPosition,
  type TimelineLineStyle,
  type TimelineMarkerSize,
  type TimelineOrientation,
  type TimelineSpacing,
  type TimelineStep,
  type TimelineThickness,
  type TimelineVariantId,
} from "../../../../widgets/core/timeline";
import type { WidgetEditorProps } from "../../../../widgets/types";

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

const stepCountOptions = Array.from(
  { length: timelineStepMax - timelineStepMin + 1 },
  (_, index) => timelineStepMin + index
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type TimelineLayout = NonNullable<TimelineData["layout"]>;
type TimelineGuides = NonNullable<TimelineData["guides"]>;
type TimelineStyle = NonNullable<TimelineData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback = "#0f172a",
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
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

function getNextStepId(steps: TimelineStep[]) {
  const used = new Set(
    steps
      .map((step) => (typeof step.id === "string" ? step.id.trim() : ""))
      .filter((id) => id.length > 0)
  );
  let cursor = 1;
  while (used.has(`step-${cursor}`)) {
    cursor += 1;
  }
  return `step-${cursor}`;
}

function setStepsCount(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  count: number
) {
  const steps = normalizeTimelineSteps(value.steps, normalizeTimelineStepCount(count));
  onChange({ ...value, steps });
}

function addStep(value: TimelineData, onChange: (next: TimelineData) => void) {
  const steps = getNormalizedSteps(value);
  if (steps.length >= timelineStepMax) return;
  const next = [
    ...steps,
    {
      id: getNextStepId(steps),
      title: `Step ${steps.length + 1}`,
    },
  ];
  onChange({ ...value, steps: next });
}

function removeStep(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  index: number
) {
  const steps = getNormalizedSteps(value);
  if (steps.length <= timelineStepMin) return;
  const next = steps.filter((_, currentIndex) => currentIndex !== index);
  onChange({
    ...value,
    steps: normalizeTimelineSteps(next, next.length),
  });
}

function TimelineLayoutFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  return (
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

function TimelineGuidesFields({
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
    </>
  );
}

function TimelineLineFields({
  value,
  onChange,
}: {
  value: TimelineData;
  onChange: (next: TimelineData) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
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
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ColorField
        label="Line color"
        value={value.style?.lineColor}
        onChange={(next) => updateStyle(value, onChange, { lineColor: next })}
        placeholder="#e2e8f0"
        pickerFallback="#e2e8f0"
      />
      <ColorField
        label="Marker color"
        value={value.style?.markerColor}
        onChange={(next) => updateStyle(value, onChange, { markerColor: next })}
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
        placeholder="transparent"
        pickerFallback="#ffffff"
      />
    </div>
  );
}

export function TimelineWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);

  return (
    <div className="space-y-4">
      <TimelineVariantSelect value={variant} onChange={onVariantChange} />

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

      <TimelineLayoutFields value={value} onChange={onChange} />
      <TimelineGuidesFields value={value} onChange={onChange} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Step titles</p>
        <div className="space-y-2">
          {steps.map((step, index) => (
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
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);

  return (
    <div className="space-y-4">
      <TimelineVariantSelect value={variant} onChange={onVariantChange} />

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Steps
          </p>
          <p className="text-xs text-muted-foreground">
            Update titles, descriptions, icons, and per-step accent.
          </p>
        </div>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id ?? `${index}`} className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {index + 1}
              </p>
              <Input
                value={step.title}
                onChange={(event) =>
                  updateStep(value, onChange, index, { title: event.target.value })
                }
                placeholder="Title"
              />
              <Textarea
                value={step.description ?? ""}
                onChange={(event) =>
                  updateStep(value, onChange, index, {
                    description: event.target.value,
                  })
                }
                placeholder="Short description"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={step.icon ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="Icon text or emoji"
                />
                <ColorField
                  label="Accent"
                  value={step.accent}
                  onChange={(next) => updateStep(value, onChange, index, { accent: next })}
                  placeholder="#1d4ed8"
                  pickerFallback="#1d4ed8"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Layout and Guides
          </p>
          <p className="text-xs text-muted-foreground">
            Control orientation, labels, spacing, and guide visibility.
          </p>
        </div>
        <TimelineLayoutFields value={value} onChange={onChange} />
        <TimelineGuidesFields value={value} onChange={onChange} />
      </section>

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Line and Colors
          </p>
          <p className="text-xs text-muted-foreground">
            Configure axis, markers, text colors, and section background.
          </p>
        </div>
        <TimelineLineFields value={value} onChange={onChange} />
        <TimelineColorFields value={value} onChange={onChange} />
      </section>
    </div>
  );
}

export function TimelineAdvancedEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);

  return (
    <div className="space-y-4">
      <TimelineVariantSelect value={variant} onChange={onVariantChange} />

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Steps Editor
          </p>
          <p className="text-xs text-muted-foreground">
            Full control over step content and metadata.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Steps count: {steps.length}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStepsCount(value, onChange, steps.length - 1)}
              disabled={steps.length <= timelineStepMin}
            >
              Remove step
            </Button>
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
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id ?? `${index}`} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(value, onChange, index)}
                  disabled={steps.length <= timelineStepMin}
                >
                  Delete
                </Button>
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
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={step.icon ?? ""}
                  onChange={(event) =>
                    updateStep(value, onChange, index, { icon: event.target.value })
                  }
                  placeholder="Icon"
                />
                <ColorField
                  label="Accent"
                  value={step.accent}
                  onChange={(next) => updateStep(value, onChange, index, { accent: next })}
                  placeholder="#1d4ed8"
                  pickerFallback="#1d4ed8"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Layout Tokens
          </p>
          <p className="text-xs text-muted-foreground">
            Orientation, alignment, spacing, and label placement.
          </p>
        </div>
        <TimelineLayoutFields value={value} onChange={onChange} />
      </section>

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Guides and Axis Line
          </p>
          <p className="text-xs text-muted-foreground">
            Configure guide behavior and axis dimensions.
          </p>
        </div>
        <TimelineGuidesFields value={value} onChange={onChange} />
        <TimelineLineFields value={value} onChange={onChange} />
      </section>

      <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Color Tokens
          </p>
          <p className="text-xs text-muted-foreground">
            Section, line, marker, and text color controls.
          </p>
        </div>
        <TimelineColorFields value={value} onChange={onChange} />
      </section>
    </div>
  );
}
