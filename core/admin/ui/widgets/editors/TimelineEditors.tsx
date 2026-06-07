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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
  lucideIconNames,
  lucideKebabIconComponents,
  normalizeTimelineData,
  normalizeTimelineStepCount,
  normalizeTimelineSteps,
  resolveTimelineCapability,
  timelineDotQuickIconNames,
  timelineStepMax,
  timelineStepMin,
  timelineVariantCapabilities,
  timelineVariantIds,
  type TimelineAxisPosition,
  type TimelineConnectorStyle,
  type TimelineData,
  type TimelineDescriptionSize,
  type TimelineDotIcon,
  type TimelineDotSize,
  type TimelineDotTone,
  type TimelineDotVariant,
  type TimelineMaxWidth,
  type TimelinePadding,
  type TimelineSectionSpacing,
  type TimelineSpacing,
  type TimelineStatus,
  type TimelineStep,
  type TimelineThickness,
  type TimelineTitleSize,
  type TimelineTitleWeight,
} from "../../../../widgets/core/timeline";
import type { WidgetEditorProps, WidgetEditorSectionRole } from "../../../../widgets/types";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions = timelineVariantIds.map((id) => ({
  id,
  label: timelineVariantCapabilities[id].label,
  description: timelineVariantCapabilities[id].description,
}));

const axisPositionOptions: Array<{ id: TimelineAxisPosition; label: string }> = [
  { id: "left", label: "Content left" },
  { id: "right", label: "Content right" },
  { id: "alternate", label: "Alternate" },
  { id: "alternate-reverse", label: "Alternate (reverse)" },
];

const dotVariantOptions: Array<{ id: TimelineDotVariant; label: string }> = [
  { id: "filled", label: "Filled" },
  { id: "outlined", label: "Outlined" },
];

const dotToneOptions: Array<{ id: TimelineDotTone; label: string }> = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "success", label: "Success" },
  { id: "error", label: "Error" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Info" },
  { id: "grey", label: "Grey" },
];

const dotSizeOptions: Array<{ id: TimelineDotSize; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const humanizeIconName = (name: string) =>
  name === "none"
    ? "Plain dot"
    : name.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const connectorStyleOptions: Array<{ id: TimelineConnectorStyle; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
];

const thicknessOptions: Array<{ id: TimelineThickness; label: string }> = [
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
  { id: "4", label: "4px" },
];

const titleSizeOptions: Array<{ id: TimelineTitleSize; label: string }> = [
  { id: "none", label: "Hidden" },
  { id: "sm", label: "Small" },
  { id: "base", label: "Base" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const titleWeightOptions: Array<{ id: TimelineTitleWeight; label: string }> = [
  { id: "normal", label: "Normal" },
  { id: "medium", label: "Medium" },
  { id: "semibold", label: "Semibold" },
  { id: "bold", label: "Bold" },
];

const descriptionSizeOptions: Array<{ id: TimelineDescriptionSize; label: string }> = [
  { id: "none", label: "None (inherit)" },
  { id: "xs", label: "Extra small" },
  { id: "sm", label: "Small" },
  { id: "base", label: "Base" },
  { id: "lg", label: "Large" },
];

const gapOptions: Array<{ id: TimelineSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
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

const statusOptions: Array<{ id: string; label: string }> = [
  { id: "__none__", label: "No status" },
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Current" },
  { id: "complete", label: "Complete" },
];

const stepCountOptions = Array.from(
  { length: timelineStepMax - timelineStepMin + 1 },
  (_, index) => timelineStepMin + index
);

type TimelineDot = NonNullable<TimelineData["dot"]>;
type TimelineConnector = NonNullable<TimelineData["connector"]>;
type TimelineTypography = NonNullable<TimelineData["typography"]>;
type TimelineSpacingGroup = NonNullable<TimelineData["spacing"]>;
type TimelineStepCta = NonNullable<TimelineStep["cta"]>;
type TimelineStepLink = NonNullable<TimelineStep["link"]>;

function findOptionLabel(
  options: Array<{ id: string; label: string }>,
  value: string | undefined,
  fallback: string
) {
  return options.find((option) => option.id === value)?.label ?? fallback;
}

function getDraftStepCta(value: TimelineStep["cta"]): TimelineStep["cta"] {
  if (!value || typeof value !== "object") return undefined;
  const label = typeof value.label === "string" ? value.label : "";
  const href = typeof value.href === "string" ? value.href : "";
  return label || href ? { label, href } : undefined;
}

function getDraftStepLink(value: TimelineStep["link"]): TimelineStep["link"] {
  if (!value || typeof value !== "object") return undefined;
  const label = typeof value.label === "string" ? value.label : "";
  const href = typeof value.href === "string" ? value.href : "";
  return label || href ? { label, href } : undefined;
}

function getNormalizedSteps(value: TimelineData) {
  const source = Array.isArray(value.steps) ? value.steps : [];
  return normalizeTimelineSteps(source).map((step, index) => ({
    ...step,
    cta: getDraftStepCta(source[index]?.cta) ?? step.cta,
    link: getDraftStepLink(source[index]?.link) ?? step.link,
  }));
}

function updateHeader(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<NonNullable<TimelineData["header"]>>
) {
  onChange({ ...value, header: { ...value.header, ...patch } });
}

function updateStep(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  index: number,
  patch: Partial<TimelineStep>
) {
  const steps = getNormalizedSteps(value);
  const next = [...steps];
  const current = next[index];
  if (!current) return;
  next[index] = { ...current, ...patch };
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

function updateAxis(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  position: TimelineAxisPosition
) {
  onChange({ ...value, axis: { ...value.axis, position } });
}

function updateDot(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineDot>
) {
  onChange({ ...value, dot: { ...value.dot, ...patch } });
}

function updateConnector(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineConnector>
) {
  onChange({ ...value, connector: { ...value.connector, ...patch } });
}

function updateTypography(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineTypography>
) {
  onChange({ ...value, typography: { ...value.typography, ...patch } });
}

function updateSpacing(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  patch: Partial<TimelineSpacingGroup>
) {
  onChange({ ...value, spacing: { ...value.spacing, ...patch } });
}

function updateBackground(
  value: TimelineData,
  onChange: (next: TimelineData) => void,
  next: string
) {
  onChange({ ...value, background: { ...value.background, color: next } });
}

function clearBackground(value: TimelineData, onChange: (next: TimelineData) => void) {
  onChange({ ...value, background: {} });
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
  onChange({ ...value, steps: normalizeTimelineSteps(next, next.length) });
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

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SelectControl<TValue extends string>({
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

function InputControl({
  id,
  label,
  path,
  value,
  onChange,
  placeholder,
  description,
}: {
  id: string;
  label: string;
  path: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  description?: ReactNode;
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
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
      )}
    </WidgetControlRow>
  );
}

function TextareaControl({
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

function IconSwatch({
  name,
  active,
  onClick,
  dataAttr,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  dataAttr: Record<string, string>;
}) {
  const Icon = lucideKebabIconComponents[name];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={humanizeIconName(name)}
      title={humanizeIconName(name)}
      {...dataAttr}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:border-primary/50"
      )}
    >
      {Icon ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <span className="text-[10px] leading-none" aria-hidden="true">
          —
        </span>
      )}
    </button>
  );
}

function IconBrowserDialog({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, "-");
  const matches = (
    normalizedQuery
      ? lucideIconNames.filter((name) => name.includes(normalizedQuery))
      : lucideIconNames
  ).slice(0, 240);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Browse all icons"
          title="Browse all icons"
          data-timeline-dot-icon-browse="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          <span aria-hidden="true" className="text-base leading-none">
            +
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose an icon</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${lucideIconNames.length.toLocaleString()} icons...`}
          aria-label="Search icons"
        />
        <ScrollArea className="h-72 rounded-md border">
          <div className="grid grid-cols-6 gap-1.5 p-2">
            {matches.map((name) => {
              const Icon = lucideKebabIconComponents[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={humanizeIconName(name)}
                  title={humanizeIconName(name)}
                  data-timeline-dot-icon-pick={name}
                  onClick={() => {
                    onSelect(name);
                    setOpen(false);
                  }}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-md border transition",
                    value === name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {matches.length === 0 ? (
            <p className="px-2 pb-3 text-xs text-muted-foreground">No icons match “{query}”.</p>
          ) : matches.length === 240 ? (
            <p className="px-2 pb-3 text-xs text-muted-foreground">
              Showing the first 240 matches — refine your search to narrow it down.
            </p>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function IconPicker({
  id,
  label,
  path,
  value,
  onChange,
  description,
}: {
  id: string;
  label: string;
  path: string;
  value: TimelineDotIcon | undefined;
  onChange: (next: TimelineDotIcon) => void;
  description?: ReactNode;
}) {
  const current = value ?? "none";
  const quickNames = timelineDotQuickIconNames as readonly string[];
  const showsCurrent = current !== "none" && !quickNames.includes(current);
  return (
    <WidgetControlRow id={id} label={label} path={path}>
      {() => (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <IconSwatch
              name="none"
              active={current === "none"}
              onClick={() => onChange("none")}
              dataAttr={{ "data-timeline-dot-icon-option": "none" }}
            />
            {quickNames.map((name) => (
              <IconSwatch
                key={name}
                name={name}
                active={current === name}
                onClick={() => onChange(name)}
                dataAttr={{ "data-timeline-dot-icon-option": name }}
              />
            ))}
            {showsCurrent ? (
              <IconSwatch
                name={current}
                active
                onClick={() => onChange(current)}
                dataAttr={{ "data-timeline-dot-icon-current": current }}
              />
            ) : null}
            <IconBrowserDialog value={current} onSelect={onChange} />
          </div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
      )}
    </WidgetControlRow>
  );
}

function TimelinePresetGallery({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {variantOptions.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange?.(option.id)}
            data-timeline-preset-card={option.id}
            data-timeline-preset-card-state={active ? "active" : "available"}
            data-widget-control={`timeline.visual.preset-card.${option.id}`}
            data-widget-control-path="variant"
            data-widget-control-ownership="writable"
            className={cn(
              "w-full rounded-lg border p-3 text-left transition",
              active
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
              <Badge className="shrink-0" variant={active ? "default" : "outline"}>
                {active ? "Active" : "Pick"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function TimelineWizardEditor({
  value,
  variant,
  onVariantChange,
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const capability = resolveTimelineCapability(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.setup.gallery"
        mode="wizard"
        role="setup"
        title="Choose a timeline preset"
        description="Pick a starting preset. Visual mode owns content, dots, axis, and appearance."
      >
        <WidgetControlRow id="timeline.wizard.variant" label="Timeline preset" path="variant">
          {() => <TimelinePresetGallery value={variant} onChange={onVariantChange} />}
        </WidgetControlRow>

        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {capability.description} Fine-tune everything else in Visual.
        </div>

        <ReadonlyWidgetSummaryRow
          id="timeline.wizard.steps.count"
          label="Number of steps"
          path="steps.count"
          value={`${steps.length} steps`}
        />
        <div className="space-y-2">
          {steps.map((step, index) => (
            <ReadonlyWidgetSummaryRow
              key={step.id ?? `${index}`}
              id={`timeline.wizard.steps.${index}.title`}
              label={`Step ${index + 1}`}
              path="steps.title"
              value={step.title || `Step ${index + 1}`}
            />
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
}: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const capability = resolveTimelineCapability(variant);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const showAxisPosition =
    capability.visibleFields.has("axisPosition") && capability.allowedAxisPositions.length > 1;
  const allowedAxisOptions = axisPositionOptions.filter((option) =>
    capability.allowedAxisPositions.includes(option.id)
  );
  const showOpposite = capability.visibleFields.has("oppositeContent");
  const showConnector = capability.visibleFields.has("connector");
  const showStepLink = capability.visibleFields.has("stepLink");
  const showStepCta = capability.visibleFields.has("stepCta");

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

  const axisValue =
    value.axis?.position && capability.allowedAxisPositions.includes(value.axis.position)
      ? value.axis.position
      : (capability.allowedAxisPositions[0] ?? "alternate");

  return (
    <div className="space-y-4">
      <EditorSection
        id="timeline.visual.preset-structure"
        mode="visual"
        role="visual"
        title="Preset and structure"
        description="Choose the timeline preset and core structure before editing content and appearance."
      >
        <WidgetControlRow id="timeline.visual.variant" label="Timeline preset" path="variant">
          {() => <TimelinePresetGallery value={variant} onChange={onVariantChange} />}
        </WidgetControlRow>

        <SelectControl
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

        {showAxisPosition ? (
          <SelectControl
            id="timeline.visual.axis-position"
            label="Axis position"
            path="axis.position"
            value={axisValue}
            onValueChange={(next) => updateAxis(value, onChange, next as TimelineAxisPosition)}
            options={allowedAxisOptions}
            placeholder="Axis position"
            description="Controls which side the leading step content sits on."
          />
        ) : null}
      </EditorSection>

      <EditorSection
        id="timeline.visual.step-content"
        mode="visual"
        role="content"
        title="Steps content and order"
        description="Edit each step, reorder, and configure destinations without leaving Visual mode."
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
            const hasCta = Boolean(step.cta?.label?.trim() && step.cta?.href?.trim());
            return (
              <div
                key={step.id ?? `${index}`}
                className={cn(
                  "space-y-4 rounded-lg border p-3",
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

                <FieldGroup title="Content">
                  <InputControl
                    id={`timeline.visual.step.${index}.title`}
                    label="Title"
                    path="steps.title"
                    value={step.title}
                    onChange={(next) => updateStep(value, onChange, index, { title: next })}
                    placeholder="Step title"
                  />
                  <TextareaControl
                    id={`timeline.visual.step.${index}.description`}
                    label="Description"
                    path="steps.description"
                    value={step.description ?? ""}
                    onChange={(next) => updateStep(value, onChange, index, { description: next })}
                    placeholder="Step description"
                  />
                  <SelectControl
                    id={`timeline.visual.step.${index}.status`}
                    label="Status"
                    path="steps.status"
                    value={step.status ?? "__none__"}
                    onValueChange={(next) =>
                      updateStep(value, onChange, index, {
                        status: next === "__none__" ? undefined : (next as TimelineStatus),
                      })
                    }
                    options={statusOptions}
                    placeholder="Status"
                  />
                  {showOpposite ? (
                    <>
                      <InputControl
                        id={`timeline.visual.step.${index}.opposite-content`}
                        label="Opposite content"
                        path="steps.oppositeContent"
                        value={step.oppositeContent ?? ""}
                        onChange={(next) =>
                          updateStep(value, onChange, index, { oppositeContent: next })
                        }
                        placeholder="e.g. Q1 2026"
                        description="Shown on the opposite side of the axis."
                      />
                      <InputControl
                        id={`timeline.visual.step.${index}.opposite-date`}
                        label="Opposite date"
                        path="steps.oppositeDate"
                        value={step.oppositeDate ?? ""}
                        onChange={(next) =>
                          updateStep(value, onChange, index, { oppositeDate: next })
                        }
                        placeholder="2026-05-11"
                        description="Optional machine-readable date for the opposite cell."
                      />
                    </>
                  ) : null}
                </FieldGroup>

                <FieldGroup title="Dot">
                  <IconPicker
                    id={`timeline.visual.step.${index}.marker-icon`}
                    label="Dot icon"
                    path="steps.markerIcon"
                    value={step.markerIcon}
                    onChange={(next) => updateStep(value, onChange, index, { markerIcon: next })}
                    description="Plain dot inherits the global dot icon for this step."
                  />
                  <SelectControl
                    id={`timeline.visual.step.${index}.dot-tone`}
                    label="Dot tone"
                    path="steps.dotTone"
                    value={step.dotTone ?? "__inherit__"}
                    onValueChange={(next) =>
                      updateStep(value, onChange, index, {
                        dotTone: next === "__inherit__" ? undefined : (next as TimelineDotTone),
                      })
                    }
                    options={[{ id: "__inherit__", label: "Inherit global" }, ...dotToneOptions]}
                    placeholder="Dot tone"
                  />
                  <SelectControl
                    id={`timeline.visual.step.${index}.dot-variant`}
                    label="Dot variant"
                    path="steps.dotVariant"
                    value={step.dotVariant ?? "__inherit__"}
                    onValueChange={(next) =>
                      updateStep(value, onChange, index, {
                        dotVariant:
                          next === "__inherit__" ? undefined : (next as TimelineDotVariant),
                      })
                    }
                    options={[{ id: "__inherit__", label: "Inherit global" }, ...dotVariantOptions]}
                    placeholder="Dot variant"
                  />
                  <ColorField
                    id={`timeline.visual.step.${index}.marker-icon-color`}
                    label="Dot icon color"
                    path="steps.markerIconColor"
                    value={step.markerIconColor}
                    onChange={(next) =>
                      updateStep(value, onChange, index, { markerIconColor: next })
                    }
                    onClear={() =>
                      updateStep(value, onChange, index, { markerIconColor: undefined })
                    }
                    placeholder="#ffffff"
                    pickerFallback="#ffffff"
                    helperText="Used when the dot renders an icon."
                  />
                </FieldGroup>

                {showStepCta || showStepLink ? (
                  <FieldGroup title="Links">
                    {showStepCta ? (
                      <>
                        <InputControl
                          id={`timeline.visual.step.${index}.cta-label`}
                          label="CTA label"
                          path="steps.cta.label"
                          value={step.cta?.label ?? ""}
                          onChange={(next) =>
                            updateStepCta(value, onChange, index, { label: next })
                          }
                          placeholder="Step CTA label"
                        />
                        <LinkDestinationField
                          fieldId={`timeline-step-${index + 1}-cta-destination`}
                          label="CTA destination"
                          value={step.cta?.href}
                          onChange={(next) => updateStepCta(value, onChange, index, { href: next })}
                          controlPath="steps.cta.href"
                          emptyLabel="No CTA destination"
                          helpText="Choose an existing site page for this step CTA."
                        />
                      </>
                    ) : null}
                    {showStepLink ? (
                      <>
                        <InputControl
                          id={`timeline.visual.step.${index}.link-label`}
                          label="Whole-step link label"
                          path="steps.link.label"
                          value={step.link?.label ?? ""}
                          onChange={(next) =>
                            updateStepLink(value, onChange, index, { label: next })
                          }
                          placeholder="Whole-step link label"
                        />
                        <LinkDestinationField
                          fieldId={`timeline-step-${index + 1}-link-destination`}
                          label="Whole-step destination"
                          value={step.link?.href}
                          onChange={(next) =>
                            updateStepLink(value, onChange, index, { href: next })
                          }
                          controlPath="steps.link.href"
                          emptyLabel="No whole-step destination"
                          helpText="Use this only when the whole step should open one selected site page."
                          feedback={
                            hasCta
                              ? "Whole-step links are disabled when a CTA link is configured to avoid nested anchors."
                              : null
                          }
                        />
                      </>
                    ) : null}
                  </FieldGroup>
                ) : null}
              </div>
            );
          })}
        </div>
      </EditorSection>

      <EditorSection
        id="timeline.visual.dots-connector"
        mode="visual"
        role="visual"
        title="Dots and connector"
        description="Set the default dot variant, tone, size, icon, and the connector line."
      >
        <FieldGroup title="Dots">
          <SelectControl
            id="timeline.visual.dot-variant"
            label="Dot variant"
            path="dot.variant"
            value={value.dot?.variant ?? "filled"}
            onValueChange={(next) =>
              updateDot(value, onChange, { variant: next as TimelineDotVariant })
            }
            options={dotVariantOptions}
            placeholder="Dot variant"
          />
          <SelectControl
            id="timeline.visual.dot-tone"
            label="Dot tone"
            path="dot.tone"
            value={value.dot?.tone ?? "primary"}
            onValueChange={(next) => updateDot(value, onChange, { tone: next as TimelineDotTone })}
            options={dotToneOptions}
            placeholder="Dot tone"
            description="Tones map to theme tokens."
          />
          <SelectControl
            id="timeline.visual.dot-size"
            label="Dot size"
            path="dot.size"
            value={value.dot?.size ?? "md"}
            onValueChange={(next) => updateDot(value, onChange, { size: next as TimelineDotSize })}
            options={dotSizeOptions}
            placeholder="Dot size"
          />
          <IconPicker
            id="timeline.visual.dot-icon"
            label="Default dot icon"
            path="dot.icon"
            value={value.dot?.icon}
            onChange={(next) => updateDot(value, onChange, { icon: next })}
            description="Applies to every step unless a step sets its own icon."
          />
        </FieldGroup>

        {showConnector ? (
          <FieldGroup title="Connector">
            <WidgetControlRow
              id="timeline.visual.connector-show"
              label="Show connector line"
              path="connector.show"
            >
              {() => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Display the line between dots.</p>
                  <Switch
                    checked={value.connector?.show ?? true}
                    onCheckedChange={(checked) =>
                      updateConnector(value, onChange, { show: checked })
                    }
                  />
                </div>
              )}
            </WidgetControlRow>
            <SelectControl
              id="timeline.visual.connector-style"
              label="Connector style"
              path="connector.style"
              value={value.connector?.style ?? "solid"}
              onValueChange={(next) =>
                updateConnector(value, onChange, { style: next as TimelineConnectorStyle })
              }
              options={connectorStyleOptions}
              placeholder="Connector style"
            />
            <SelectControl
              id="timeline.visual.connector-thickness"
              label="Connector thickness"
              path="connector.thickness"
              value={value.connector?.thickness ?? "2"}
              onValueChange={(next) =>
                updateConnector(value, onChange, { thickness: next as TimelineThickness })
              }
              options={thicknessOptions}
              placeholder="Connector thickness"
            />
          </FieldGroup>
        ) : null}
      </EditorSection>

      <EditorSection
        id="timeline.visual.appearance"
        mode="visual"
        role="visual"
        title="Typography, spacing and background"
        description="Tune the section header, typography scale, spacing, and background."
      >
        <FieldGroup title="Header">
          <InputControl
            id="timeline.visual.header-title"
            label="Header title"
            path="header.title"
            value={value.header?.title ?? ""}
            onChange={(next) => updateHeader(value, onChange, { title: next })}
            placeholder="Timeline heading"
          />
          <TextareaControl
            id="timeline.visual.header-description"
            label="Header description"
            path="header.description"
            value={value.header?.description ?? ""}
            onChange={(next) => updateHeader(value, onChange, { description: next })}
            placeholder="Optional context above the timeline"
          />
        </FieldGroup>

        <FieldGroup title="Typography">
          <SelectControl
            id="timeline.visual.title-size"
            label="Title size"
            path="typography.titleSize"
            value={value.typography?.titleSize ?? "base"}
            onValueChange={(next) =>
              updateTypography(value, onChange, { titleSize: next as TimelineTitleSize })
            }
            options={titleSizeOptions}
            placeholder="Title size"
          />
          <SelectControl
            id="timeline.visual.title-weight"
            label="Title weight"
            path="typography.titleWeight"
            value={value.typography?.titleWeight ?? "semibold"}
            onValueChange={(next) =>
              updateTypography(value, onChange, { titleWeight: next as TimelineTitleWeight })
            }
            options={titleWeightOptions}
            placeholder="Title weight"
          />
          <SelectControl
            id="timeline.visual.description-size"
            label="Description size"
            path="typography.descriptionSize"
            value={value.typography?.descriptionSize ?? "sm"}
            onValueChange={(next) =>
              updateTypography(value, onChange, {
                descriptionSize: next as TimelineDescriptionSize,
              })
            }
            options={descriptionSizeOptions}
            placeholder="Description size"
          />
        </FieldGroup>

        <FieldGroup title="Spacing and background">
          <SelectControl
            id="timeline.visual.gap"
            label="Step spacing"
            path="spacing.gap"
            value={value.spacing?.gap ?? "md"}
            onValueChange={(next) =>
              updateSpacing(value, onChange, { gap: next as TimelineSpacing })
            }
            options={gapOptions}
            placeholder="Spacing"
          />
          <SelectControl
            id="timeline.visual.padding"
            label="Section padding"
            path="spacing.padding"
            value={value.spacing?.padding ?? "md"}
            onValueChange={(next) =>
              updateSpacing(value, onChange, { padding: next as TimelinePadding })
            }
            options={paddingOptions}
            placeholder="Padding"
          />
          <SelectControl
            id="timeline.visual.section-spacing"
            label="Outer section spacing"
            path="spacing.sectionSpacing"
            value={value.spacing?.sectionSpacing ?? "none"}
            onValueChange={(next) =>
              updateSpacing(value, onChange, { sectionSpacing: next as TimelineSectionSpacing })
            }
            options={sectionSpacingOptions}
            placeholder="Section spacing"
          />
          <SelectControl
            id="timeline.visual.max-width"
            label="Max width"
            path="spacing.maxWidth"
            value={value.spacing?.maxWidth ?? "5xl"}
            onValueChange={(next) =>
              updateSpacing(value, onChange, { maxWidth: next as TimelineMaxWidth })
            }
            options={maxWidthOptions}
            placeholder="Max width"
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
        </FieldGroup>
      </EditorSection>
    </div>
  );
}

export function TimelineAdvancedEditor({ value, variant }: WidgetEditorProps<TimelineData>) {
  const steps = getNormalizedSteps(value);
  const capability = resolveTimelineCapability(variant);
  const normalized = normalizeTimelineData(value, capability.id);
  const normalizedSteps = normalized.steps ?? [];
  const dot = normalized.dot!;
  const connector = normalized.connector!;
  const typography = normalized.typography!;
  const spacing = normalized.spacing!;

  const toneOverrides = normalizedSteps.filter((step) => step.dotTone).length;
  const iconOverrides = normalizedSteps.filter(
    (step) => step.markerIcon && step.markerIcon !== "none"
  ).length;
  const safeCta = normalizedSteps.filter((step) => step.cta?.href).length;
  const safeLinks = normalizedSteps.filter((step) => step.link?.href).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Advanced mode is read-only. Use Visual for preset, steps, dots, connector, axis, and
        appearance changes.
      </p>

      <EditorSection
        id="timeline.advanced.runtime"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only summary of the saved renderer contract."
      >
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-variant"
          label="Preset"
          path="variant"
          value={`${capability.label} (${capability.orientation})`}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-axis"
          label="Axis position"
          path="axis.position"
          value={findOptionLabel(axisPositionOptions, normalized.axis?.position, "Right")}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-steps"
          label="Steps"
          path="steps"
          value={`${steps.length} configured steps.`}
        />
      </EditorSection>

      <EditorSection
        id="timeline.advanced.appearance"
        mode="advanced"
        role="diagnostics"
        title="Appearance diagnostics"
        description="Read-only dot, connector, typography, spacing, and background state."
      >
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-dot"
          label="Dot"
          path="dot"
          value={`${findOptionLabel(dotVariantOptions, dot.variant, "Filled")} / ${findOptionLabel(
            dotToneOptions,
            dot.tone,
            "Primary"
          )} / ${findOptionLabel(dotSizeOptions, dot.size, "Medium")} / icon ${humanizeIconName(
            dot.icon ?? "none"
          )} (${iconOverrides} icon, ${toneOverrides} tone overrides)`}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-connector"
          label="Connector"
          path="connector"
          value={
            connector.show
              ? `${findOptionLabel(
                  connectorStyleOptions,
                  connector.style,
                  "Solid"
                )}, ${findOptionLabel(thicknessOptions, connector.thickness, "2px")}`
              : "Hidden"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-typography"
          label="Typography"
          path="typography"
          value={`Title ${findOptionLabel(
            titleSizeOptions,
            typography.titleSize,
            "Base"
          )} ${findOptionLabel(
            titleWeightOptions,
            typography.titleWeight,
            "Semibold"
          )}; Description ${findOptionLabel(descriptionSizeOptions, typography.descriptionSize, "Small")}`}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-spacing"
          label="Spacing"
          path="spacing"
          value={`Gap ${findOptionLabel(gapOptions, spacing.gap, "Default")}; Padding ${findOptionLabel(
            paddingOptions,
            spacing.padding,
            "Default"
          )}; Width ${findOptionLabel(maxWidthOptions, spacing.maxWidth, "5XL")}`}
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-background"
          label="Background"
          path="background"
          value={normalized.background?.color?.trim() || "Inherited / transparent"}
        />
      </EditorSection>

      <EditorSection
        id="timeline.advanced.normalization"
        mode="advanced"
        role="summary"
        title="Data normalization"
        description="Read-only normalization, safe-link, and ownership summary."
      >
        <p className="text-xs text-muted-foreground">
          Current steps: {steps.length}. Normalization keeps payloads within {timelineStepMin}-
          {timelineStepMax} steps with unique stable IDs.
        </p>
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-normalization-scope"
          label="Normalization scope"
          path="steps"
          value="Step count clamp, unique stable IDs, preset-coerced axis position, and safe link sanitization."
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-safe-cta"
          label="Step CTA links"
          path="steps.cta.href"
          value={
            safeCta > 0
              ? `${safeCta} safe CTA destination${safeCta === 1 ? "" : "s"}`
              : "Not configured"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-safe-link"
          label="Whole-step links"
          path="steps.link.href"
          value={
            safeLinks > 0
              ? `${safeLinks} safe whole-step destination${safeLinks === 1 ? "" : "s"}`
              : "Not configured"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="timeline-advanced-ownership"
          label="Ownership"
          path="editorContract"
          value="Wizard picks the preset; Visual owns content, dots, axis, and appearance; Advanced is read-only."
        />
      </EditorSection>
    </div>
  );
}
