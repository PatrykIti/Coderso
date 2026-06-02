import { type ReactNode, useState } from "react";

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
  compareAxisStepMax,
  compareAxisStepMin,
  normalizeCompareAxisSteps,
  normalizeCompareTimelineData,
  resolveCompareTimelineVariant,
  type CompareAxisStep,
  type CompareTimelineFontWeight,
  type CompareTimelineData,
  type CompareTimelineMarkerShape,
  type CompareTimelineVariantId,
  type CompareTrack,
  type CompareTrackSegment,
} from "../../../../widgets/core/compareTimeline";
import type {
  WidgetEditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { ConfirmActionDialog } from "../../shared/ConfirmActionDialog";
import {
  ColorContrastNotice,
  type ColorContrastAdvisory,
  resolveColorContrastAdvisory,
} from "./ClearableFields";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: CompareTimelineVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "dual-track",
    label: "Dual Track",
    description: "Compare two processes across a shared axis.",
  },
  {
    id: "dual-track-highlight",
    label: "Dual Track Highlight",
    description: "Focus key ranges on one or both tracks.",
  },
];

const guideStyles = ["solid", "dashed"] as const;
const labelPositionOptions = ["top", "bottom"] as const;
const trackSpacingOptions = ["none", "sm", "md", "lg", "xl"] as const;
const maxWidthOptions = ["none", "4xl", "5xl", "6xl", "7xl"] as const;
const paddingOptions = ["sm", "md", "lg"] as const;
const motionOptions = ["none", "fade", "slide"] as const;
const highlightLabelStyles = ["solid", "outline", "subtle"] as const;
const trackLabelSizes = ["none", "sm", "base", "lg"] as const;
const stepLabelSizes = ["none", "xs", "sm", "base"] as const;
const segmentLabelSizes = ["none", "xs", "sm", "base"] as const;
const fontWeightOptions: CompareTimelineFontWeight[] = ["normal", "medium", "semibold", "bold"];
const markerShapeOptions: CompareTimelineMarkerShape[] = ["rounded", "circle", "numbered", "check"];

const guideStyleLabels: Record<(typeof guideStyles)[number], string> = {
  solid: "Solid",
  dashed: "Dashed",
};

const highlightLabelStyleLabels: Record<(typeof highlightLabelStyles)[number], string> = {
  solid: "Filled badge",
  outline: "Outlined badge",
  subtle: "Soft badge",
};

const labelSizeLabels = {
  none: "Inherit",
  xs: "Tiny",
  sm: "Small",
  base: "Default",
  lg: "Large",
} as const;

const fontWeightLabels: Record<CompareTimelineFontWeight, string> = {
  normal: "Regular",
  medium: "Medium emphasis",
  semibold: "Strong emphasis",
  bold: "Bold",
};

const markerShapeLabels: Record<CompareTimelineMarkerShape, string> = {
  rounded: "Rounded square",
  circle: "Circle",
  numbered: "Numbered",
  check: "Check mark",
};

const trackSpacingLabels: Record<(typeof trackSpacingOptions)[number], string> = {
  none: "No gap",
  sm: "Compact",
  md: "Comfortable",
  lg: "Spacious",
  xl: "Extra spacious",
};

const labelPositionLabels: Record<(typeof labelPositionOptions)[number], string> = {
  top: "Above axis",
  bottom: "Below axis",
};

const maxWidthLabels: Record<(typeof maxWidthOptions)[number], string> = {
  none: "Full width",
  "4xl": "Compact width",
  "5xl": "Comfortable width",
  "6xl": "Wide width",
  "7xl": "Extra-wide width",
};

const paddingLabels: Record<(typeof paddingOptions)[number], string> = {
  sm: "Compact padding",
  md: "Comfortable padding",
  lg: "Spacious padding",
};

const motionLabels: Record<(typeof motionOptions)[number], string> = {
  none: "No animation",
  fade: "Fade in",
  slide: "Slide in",
};

const stepCountOptions = Array.from(
  { length: compareAxisStepMax - compareAxisStepMin + 1 },
  (_, index) => compareAxisStepMin + index
);

type CompareGuides = NonNullable<CompareTimelineData["guides"]>;
type CompareStyle = NonNullable<CompareTimelineData["style"]>;
type CompareLayout = NonNullable<CompareTimelineData["layout"]>;
type CompareHighlight = NonNullable<CompareTimelineData["highlight"]>;

const spacingTokenDescriptions: Record<string, string> = {
  none: "No extra breathing room between tracks.",
  sm: "A compact gap between tracks.",
  md: "Comfortable breathing room between tracks.",
  lg: "A spacious gap between tracks.",
  xl: "The most generous track spacing.",
};

function pickContrastAdvisory(advisories: ColorContrastAdvisory[]) {
  return (
    advisories.find((advisory) => advisory.status === "warning") ??
    advisories.find((advisory) => advisory.status === "unknown") ?? { status: "ok" as const }
  );
}

function normalizeValue(value: CompareTimelineData): CompareTimelineData {
  return normalizeCompareTimelineData(value);
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: WidgetEditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      mode={mode}
      role={role}
      title={title}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function updateCompareValue(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  updater: (current: CompareTimelineData) => CompareTimelineData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateTrack(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  patch: Partial<CompareTrack>
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    tracks[trackIndex] = { ...track, ...patch };
    return { ...current, tracks };
  });
}

function updateSegment(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  segmentIndex: number,
  patch: Partial<CompareTrackSegment>
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const segments = Array.isArray(track.segments) ? [...track.segments] : [];
    const base = segments[segmentIndex] ?? { from: 0, to: 0 };
    segments[segmentIndex] = {
      from: patch.from ?? base.from,
      to: patch.to ?? base.to,
      label: patch.label ?? base.label,
      href: patch.href ?? base.href,
    };
    tracks[trackIndex] = { ...track, segments };
    return { ...current, tracks };
  });
}

function removeSegment(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  segmentIndex: number
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const segments = Array.isArray(track.segments) ? [...track.segments] : [];
    tracks[trackIndex] = {
      ...track,
      segments: segments.filter((_, index) => index !== segmentIndex),
    };
    return { ...current, tracks };
  });
}

function addSegment(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const lastIndex = Math.max(0, current.axis.steps.length - 1);
    const segments = Array.isArray(track.segments) ? [...track.segments] : [];
    segments.push({ from: 0, to: Math.min(1, lastIndex), label: "", href: "" });
    tracks[trackIndex] = { ...track, segments };
    return { ...current, tracks };
  });
}

function toggleMarker(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  trackIndex: number,
  stepIndex: number
) {
  updateCompareValue(value, onChange, (current) => {
    const tracks = [...current.tracks];
    const track = tracks[trackIndex];
    if (!track) return current;
    const exists = track.markers.includes(stepIndex);
    tracks[trackIndex] = {
      ...track,
      markers: exists
        ? track.markers.filter((marker) => marker !== stepIndex)
        : [...track.markers, stepIndex],
    };
    return { ...current, tracks };
  });
}

function updateGuides(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareGuides>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    guides: {
      ...current.guides,
      ...patch,
    },
  }));
}

function updateStyle(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareStyle>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateHeader(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<NonNullable<CompareTimelineData["header"]>>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    header: {
      ...current.header,
      ...patch,
    },
  }));
}

function clearStyle(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  key: keyof CompareStyle
) {
  updateCompareValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function updateLayout(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareLayout>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateHighlight(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  patch: Partial<CompareHighlight>
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    highlight: {
      ...current.highlight,
      ...patch,
    },
  }));
}

function updateAxisStep(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  index: number,
  patch: Partial<CompareAxisStep>
) {
  updateCompareValue(value, onChange, (current) => {
    const steps = [...current.axis.steps];
    const step = steps[index];
    if (!step) return current;
    steps[index] = {
      ...step,
      ...patch,
    };
    return {
      ...current,
      axis: { ...current.axis, steps },
    };
  });
}

function setAxisStepCount(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  count: number
) {
  updateCompareValue(value, onChange, (current) => ({
    ...current,
    axis: {
      ...current.axis,
      steps: normalizeCompareAxisSteps(current.axis.steps, count),
    },
  }));
}

function addAxisStep(value: CompareTimelineData, onChange: (next: CompareTimelineData) => void) {
  const current = normalizeValue(value);
  if (current.axis.steps.length >= compareAxisStepMax) return;
  setAxisStepCount(value, onChange, current.axis.steps.length + 1);
}

function removeAxisStep(value: CompareTimelineData, onChange: (next: CompareTimelineData) => void) {
  const current = normalizeValue(value);
  if (current.axis.steps.length <= compareAxisStepMin) return;
  setAxisStepCount(value, onChange, current.axis.steps.length - 1);
}

function resolveHighlightModeValue(normalized: CompareTimelineData) {
  const targetTrackIds = normalized.highlight?.targetTrackIds ?? [];
  if (targetTrackIds.length > 1) return "both";
  return (
    normalized.highlight?.targetTrackId ??
    normalized.tracks[1]?.id ??
    normalized.tracks[0]?.id ??
    "a"
  );
}

function updateHighlightTargets(
  value: CompareTimelineData,
  onChange: (next: CompareTimelineData) => void,
  mode: string
) {
  const normalized = normalizeValue(value);
  const [firstTrack, secondTrack] = normalized.tracks;
  if (!firstTrack) return;
  if (mode === "both" && secondTrack) {
    updateHighlight(value, onChange, {
      targetTrackId: normalized.highlight?.targetTrackId ?? firstTrack.id,
      targetTrackIds: [firstTrack.id, secondTrack.id],
    });
    return;
  }

  if (mode === firstTrack.id || mode === secondTrack?.id) {
    updateHighlight(value, onChange, {
      targetTrackId: mode,
      targetTrackIds: [mode],
    });
  }
}

function resolveTrackHighlightHint(normalized: CompareTimelineData, trackId: string) {
  const targetTrackIds = normalized.highlight?.targetTrackIds ?? [];
  if (targetTrackIds.includes(trackId)) return undefined;
  return "Saved segments stay on this track but render only after you include it in Highlight targets.";
}

function resolveTrackOrderOptions(tracks: CompareTrack[]) {
  const firstLabel = tracks[0]?.label || "Track 1";
  const secondLabel = tracks[1]?.label || "Track 2";

  return [
    { id: "a-first" as const, label: `${firstLabel} first` },
    { id: "b-first" as const, label: `${secondLabel} first` },
  ];
}

function resolveTrackOrderSummary(normalized: CompareTimelineData) {
  const options = resolveTrackOrderOptions(normalized.tracks);
  return (
    options.find((option) => option.id === (normalized.layout?.trackOrder ?? "a-first"))?.label ??
    options[0]!.label
  );
}

function ColorField({
  label,
  path,
  value,
  onChange,
  onClear,
  placeholder,
  pickerFallback,
}: {
  label: string;
  path: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div data-widget-control-path={path}>
      <SharedColorControl
        label={label}
        value={value}
        onChange={onChange}
        onClear={onClear}
        placeholder={placeholder}
        pickerFallback={pickerFallback}
        showValueInput={false}
      />
    </div>
  );
}

function VariantCards({ value, onChange }: { value: string; onChange?: (next: string) => void }) {
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
          <div className="mt-3 rounded-md border bg-muted/40 p-3">
            {option.id === "dual-track" ? (
              <div className="space-y-2" aria-hidden="true">
                <div className="grid grid-cols-3 gap-1">
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Plan</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Build</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Ship</span>
                </div>
                <div className="space-y-1">
                  <div className="rounded-md border border-border bg-background px-2 py-2 text-[10px]">
                    Traditional
                  </div>
                  <div className="rounded-md border border-border bg-background px-2 py-2 text-[10px]">
                    With us
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2" aria-hidden="true">
                <div className="grid grid-cols-3 gap-1">
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Plan</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Build</span>
                  <span className="rounded bg-background px-2 py-1 text-[10px]">Ship</span>
                </div>
                <div className="space-y-1">
                  <div className="rounded-md border border-border bg-background px-2 py-2 text-[10px]">
                    Traditional
                  </div>
                  <div className="rounded-md border border-primary bg-primary/10 px-2 py-2 text-[10px]">
                    With us
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[9px]">
                        Launch sprint
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function MarkerToggleGrid({
  track,
  steps,
  onToggle,
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  onToggle: (stepIndex: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const active = track.markers.includes(index);
        return (
          <button
            key={`${track.id}-${step.id ?? index}`}
            type="button"
            onClick={() => onToggle(index)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground"
            )}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentEditor({
  track,
  steps,
  onAdd,
  onPatch,
  onRemove,
  renderHint,
}: {
  track: CompareTrack;
  steps: CompareAxisStep[];
  onAdd: () => void;
  onPatch: (segmentIndex: number, patch: Partial<CompareTrackSegment>) => void;
  onRemove: (segmentIndex: number) => void;
  renderHint?: string;
}) {
  const segments = Array.isArray(track.segments) ? track.segments : [];
  const [rangeWarnings, setRangeWarnings] = useState<Record<number, string | undefined>>({});

  const updateRangeWarning = (segmentIndex: number, from: number, to: number) => {
    setRangeWarnings((current) => ({
      ...current,
      [segmentIndex]:
        from > to
          ? "The saved range will normalize from the earlier step to the later step."
          : undefined,
    }));
  };

  return (
    <div className="space-y-2">
      {renderHint ? <p className="text-xs text-muted-foreground">{renderHint}</p> : null}

      {segments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No highlight segments configured.</p>
      ) : null}

      {segments.map((segment, segmentIndex) => (
        <div
          key={`${track.id}-${segment.from}-${segment.to}-${segmentIndex}`}
          className="space-y-2 rounded-lg border p-3"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              value={String(segment.from)}
              onValueChange={(next) => {
                const nextFrom = Number(next);
                updateRangeWarning(segmentIndex, nextFrom, segment.to);
                onPatch(segmentIndex, { from: nextFrom });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {steps.map((step, stepIndex) => (
                  <SelectItem
                    key={`${track.id}-from-${step.id ?? stepIndex}`}
                    value={String(stepIndex)}
                  >
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(segment.to)}
              onValueChange={(next) => {
                const nextTo = Number(next);
                updateRangeWarning(segmentIndex, segment.from, nextTo);
                onPatch(segmentIndex, { to: nextTo });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {steps.map((step, stepIndex) => (
                  <SelectItem
                    key={`${track.id}-to-${step.id ?? stepIndex}`}
                    value={String(stepIndex)}
                  >
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(segmentIndex)}>
              Remove segment
            </Button>
          </div>

          <Input
            value={segment.label ?? ""}
            onChange={(event) => onPatch(segmentIndex, { label: event.target.value })}
            placeholder={`Optional label. Empty -> "Steps ${segment.from + 1}-${segment.to + 1}"`}
          />

          <LinkDestinationField
            fieldId={`compare-timeline-segment-${segmentIndex + 1}-destination`}
            label="Segment destination"
            value={segment.href}
            onChange={(next) => onPatch(segmentIndex, { href: next })}
            emptyLabel="No segment destination"
            helpText="Pick a page for this highlighted segment. Saved custom destinations stay replace-or-clear compatible."
          />

          <p className="text-xs text-muted-foreground">
            Empty labels fall back to <code>{`Steps ${segment.from + 1}-${segment.to + 1}`}</code>.
          </p>

          {rangeWarnings[segmentIndex] ? (
            <p className="text-xs text-amber-700">{rangeWarnings[segmentIndex]}</p>
          ) : null}
        </div>
      ))}

      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        Add segment
      </Button>
    </div>
  );
}

function getHighlightContext(value: CompareTimelineData) {
  const targetTrackIds = value.highlight?.targetTrackIds?.length
    ? value.highlight.targetTrackIds
    : [];
  return {
    highlightMode: resolveHighlightModeValue(value),
    targetTrackIds,
  };
}

export function CompareTimelineWizardEditor({
  value,
  variant,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const highlightEnabled = resolvedVariant === "dual-track-highlight";

  return (
    <div className="space-y-4">
      <EditorSection
        id="compare-timeline.wizard.starter-comparison"
        mode="wizard"
        role="setup"
        title="Quick setup"
        description="Set comparison baseline without deep styling controls."
      >
        <ReadonlyWidgetSummaryRow
          id="compare-timeline.wizard.variant"
          label="Highlight mode"
          path="variant"
          value={highlightEnabled ? "Enabled on one or both tracks" : "Disabled"}
        />

        <ReadonlyWidgetSummaryRow
          id="compare-timeline.wizard.axis-steps-count"
          label="Axis step count"
          path="axis.steps.count"
          value={`${normalized.axis.steps.length} steps`}
        />
        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Visual owns axis wording, track labels, marker mapping, and highlight segment editing
          after setup.
        </div>
        {highlightEnabled ? (
          <p className="text-xs text-muted-foreground">
            Highlight targets and segment ranges stay in Visual so comparison mapping has one
            truthful editing surface.
          </p>
        ) : null}
      </EditorSection>
    </div>
  );
}

export function CompareTimelineVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const markerContrastAdvisory = pickContrastAdvisory([
    resolveColorContrastAdvisory({
      foreground: normalized.style?.markerColor,
      background: normalized.style?.trackBackgroundColor,
    }),
  ]);
  const labelContrastAdvisory = pickContrastAdvisory([
    resolveColorContrastAdvisory({
      foreground: normalized.style?.trackLabelColor,
      background: normalized.style?.trackBackgroundColor,
    }),
    resolveColorContrastAdvisory({
      foreground: normalized.style?.stepLabelColor,
      background: normalized.style?.trackBackgroundColor,
    }),
  ]);
  const highlightEnabled = resolvedVariant === "dual-track-highlight";
  const { highlightMode } = getHighlightContext(normalized);
  const hasPreservedSegments = normalized.tracks.some((track) => (track.segments?.length ?? 0) > 0);
  const trackOrderOptions = resolveTrackOrderOptions(normalized.tracks);

  return (
    <div className="space-y-4">
      <EditorSection
        id="compare-timeline.visual.variant"
        mode="visual"
        role="setup"
        title="Variant and compare structure"
        description="Select how the comparison story is presented."
      >
        <div data-widget-control-path="variant">
          <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        </div>
      </EditorSection>

      <EditorSection
        id="compare-timeline.visual.section-heading"
        mode="visual"
        role="content"
        title="Section heading"
        description="Name the compare block before tuning the axis and tracks."
      >
        <div className="grid gap-2">
          <div data-widget-control-path="header.title">
            <Input
              value={normalized.header?.title ?? ""}
              onChange={(event) => updateHeader(value, onChange, { title: event.target.value })}
              placeholder="Optional section title"
            />
          </div>
          <div data-widget-control-path="header.subtitle">
            <Textarea
              value={normalized.header?.subtitle ?? ""}
              onChange={(event) => updateHeader(value, onChange, { subtitle: event.target.value })}
              placeholder="Optional supporting subtitle"
              rows={2}
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="compare-timeline.visual.axis-tracks"
        mode="visual"
        role="content"
        title="Axis steps and track labels"
        description="Define axis wording and track names shown in preview."
      >
        <div
          className="space-y-3 rounded-lg border p-3"
          data-widget-control-path="axis.steps.count"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1 space-y-2">
              <p className="text-sm font-medium">Axis step count</p>
              <Select
                value={String(normalized.axis.steps.length)}
                onValueChange={(next) => setAxisStepCount(value, onChange, Number(next))}
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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAxisStep(value, onChange)}
              disabled={normalized.axis.steps.length <= compareAxisStepMin}
            >
              Remove step
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addAxisStep(value, onChange)}
              disabled={normalized.axis.steps.length >= compareAxisStepMax}
            >
              Add step
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep the comparison readable while scaling from {compareAxisStepMin} to{" "}
            {compareAxisStepMax} steps.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Axis step content</p>
          {normalized.axis.steps.map((step, stepIndex) => (
            <div key={step.id ?? `${stepIndex}`} className="space-y-2 rounded-lg border p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div data-widget-control-path="axis.steps.*.label">
                  <Input
                    value={step.label}
                    onChange={(event) =>
                      updateAxisStep(value, onChange, stepIndex, { label: event.target.value })
                    }
                    placeholder={`Step ${stepIndex + 1}`}
                  />
                </div>
                <div data-widget-control-path="axis.steps.*.icon">
                  <Input
                    value={step.icon ?? ""}
                    onChange={(event) =>
                      updateAxisStep(value, onChange, stepIndex, { icon: event.target.value })
                    }
                    placeholder="Optional icon or emoji"
                  />
                </div>
              </div>
              <div data-widget-control-path="axis.steps.*.description">
                <Textarea
                  value={step.description ?? ""}
                  onChange={(event) =>
                    updateAxisStep(value, onChange, stepIndex, {
                      description: event.target.value,
                    })
                  }
                  placeholder="Optional step description"
                  rows={2}
                />
              </div>
              <LinkDestinationField
                fieldId={`compare-timeline-step-${stepIndex + 1}-destination`}
                label="Step destination"
                controlPath="axis.steps.*.href"
                value={step.href}
                onChange={(next) => updateAxisStep(value, onChange, stepIndex, { href: next })}
                emptyLabel="No step destination"
                helpText="Pick a page for this timeline step. Saved custom destinations stay replace-or-clear compatible."
              />
            </div>
          ))}
        </div>

        <div className="space-y-2" data-widget-control-path="tracks.*.label">
          <p className="text-sm font-medium">Track labels</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {normalized.tracks.map((track, trackIndex) => (
              <Input
                key={track.id}
                value={track.label}
                onChange={(event) =>
                  updateTrack(value, onChange, trackIndex, { label: event.target.value })
                }
                placeholder={`Track ${trackIndex + 1} label`}
              />
            ))}
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="compare-timeline.visual.markers-segments"
        mode="visual"
        role="visual"
        title="Markers and segment mapping"
        description="Map active points per track and configure highlight ranges when needed."
      >
        {highlightEnabled ? (
          <div
            className="space-y-2 rounded-lg border p-3"
            data-widget-control-path="highlight.targetTrackId"
          >
            <span className="sr-only" data-widget-control-path="highlight.targetTrackIds" />
            <p className="text-sm font-medium">Highlight targets</p>
            <Select
              value={highlightMode}
              onValueChange={(next) => updateHighlightTargets(value, onChange, next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select highlight targets" />
              </SelectTrigger>
              <SelectContent>
                {normalized.tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.label}
                  </SelectItem>
                ))}
                <SelectItem value="both">Both tracks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {normalized.tracks.map((track, trackIndex) => (
          <div
            key={track.id}
            className="space-y-3 rounded-lg border p-3"
            data-widget-control-path="tracks.*.markers"
          >
            <p className="text-sm font-medium">{track.label}</p>
            <MarkerToggleGrid
              track={track}
              steps={normalized.axis.steps}
              onToggle={(stepIndex) => toggleMarker(value, onChange, trackIndex, stepIndex)}
            />
            {track.markers.length === 0 ? (
              <p className="text-xs text-amber-700">
                This track currently has no active markers, so the runtime row will look empty.
              </p>
            ) : null}

            {highlightEnabled ? (
              <div data-widget-control-path="tracks.*.segments">
                <SegmentEditor
                  track={track}
                  steps={normalized.axis.steps}
                  onAdd={() => addSegment(value, onChange, trackIndex)}
                  onPatch={(segmentIndex, patch) =>
                    updateSegment(value, onChange, trackIndex, segmentIndex, patch)
                  }
                  onRemove={(segmentIndex) =>
                    removeSegment(value, onChange, trackIndex, segmentIndex)
                  }
                  renderHint={resolveTrackHighlightHint(normalized, track.id)}
                />
              </div>
            ) : null}
          </div>
        ))}

        {!highlightEnabled ? (
          <p className="text-xs text-muted-foreground">
            {hasPreservedSegments
              ? "Segment mapping is hidden in Dual Track. Saved segments are preserved and will reappear in Dual Track Highlight."
              : "Segment mapping is available only in the Dual Track Highlight variant."}
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        id="compare-timeline.visual.highlight-guides"
        mode="visual"
        role="visual"
        title="Highlight and guide styles"
        description="Tune emphasis style and guide lines for better readability."
      >
        <div
          className="flex items-center justify-between rounded-lg border p-3"
          data-widget-control-path="guides.enabled"
        >
          <div>
            <p className="text-sm font-medium">Show guides</p>
            <p className="text-xs text-muted-foreground">
              Draw track guide borders for visual alignment.
            </p>
          </div>
          <Switch
            checked={normalized.guides?.enabled ?? true}
            onCheckedChange={(checked) => updateGuides(value, onChange, { enabled: checked })}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2" data-widget-control-path="guides.style">
            <p className="text-sm font-medium">Guide style</p>
            <Select
              value={normalized.guides?.style ?? "dashed"}
              onValueChange={(next) =>
                updateGuides(value, onChange, { style: next as CompareGuides["style"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Guide style" />
              </SelectTrigger>
              <SelectContent>
                {guideStyles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {guideStyleLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {highlightEnabled ? (
            <div className="space-y-2" data-widget-control-path="style.highlightLabelStyle">
              <p className="text-sm font-medium">Highlight label style</p>
              <Select
                value={normalized.style?.highlightLabelStyle ?? "solid"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    highlightLabelStyle: next as CompareStyle["highlightLabelStyle"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Highlight label style" />
                </SelectTrigger>
                <SelectContent>
                  {highlightLabelStyles.map((option) => (
                    <SelectItem key={option} value={option}>
                      {highlightLabelStyleLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </EditorSection>

      <EditorSection
        id="compare-timeline.visual.colors-typography"
        mode="visual"
        role="visual"
        title="Colors and typography"
        description="Control comparison contrast, label colors, and text scale."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {highlightEnabled ? (
            <ColorField
              label="Highlight color"
              path="style.highlightColor"
              value={normalized.style?.highlightColor}
              onChange={(next) => updateStyle(value, onChange, { highlightColor: next })}
              onClear={() => clearStyle(value, onChange, "highlightColor")}
              placeholder="#f59e0b"
              pickerFallback="#f59e0b"
            />
          ) : null}

          <ColorField
            label="Marker color"
            path="style.markerColor"
            value={normalized.style?.markerColor}
            onChange={(next) => updateStyle(value, onChange, { markerColor: next })}
            onClear={() => clearStyle(value, onChange, "markerColor")}
            placeholder="#1d4ed8"
            pickerFallback="#1d4ed8"
          />

          <ColorField
            label="Track label color"
            path="style.trackLabelColor"
            value={normalized.style?.trackLabelColor}
            onChange={(next) => updateStyle(value, onChange, { trackLabelColor: next })}
            onClear={() => clearStyle(value, onChange, "trackLabelColor")}
            placeholder="#0f172a"
            pickerFallback="#0f172a"
          />

          <ColorField
            label="Step label color"
            path="style.stepLabelColor"
            value={normalized.style?.stepLabelColor}
            onChange={(next) => updateStyle(value, onChange, { stepLabelColor: next })}
            onClear={() => clearStyle(value, onChange, "stepLabelColor")}
            placeholder="#0f172a"
            pickerFallback="#0f172a"
          />

          <ColorField
            label="Muted step color"
            path="style.mutedStepColor"
            value={normalized.style?.mutedStepColor}
            onChange={(next) => updateStyle(value, onChange, { mutedStepColor: next })}
            onClear={() => clearStyle(value, onChange, "mutedStepColor")}
            placeholder="#334155"
            pickerFallback="#334155"
          />

          <ColorField
            label="Guide color"
            path="style.guideColor"
            value={normalized.style?.guideColor}
            onChange={(next) => updateStyle(value, onChange, { guideColor: next })}
            onClear={() => clearStyle(value, onChange, "guideColor")}
            placeholder="#e2e8f0"
            pickerFallback="#e2e8f0"
          />

          <ColorField
            label="Track background color"
            path="style.trackBackgroundColor"
            value={normalized.style?.trackBackgroundColor}
            onChange={(next) => updateStyle(value, onChange, { trackBackgroundColor: next })}
            onClear={() => clearStyle(value, onChange, "trackBackgroundColor")}
            placeholder="#ffffff"
            pickerFallback="#ffffff"
          />
        </div>
        <div className="space-y-1">
          <ColorContrastNotice advisory={markerContrastAdvisory} label="Marker contrast advisory" />
          <ColorContrastNotice advisory={labelContrastAdvisory} label="Label contrast advisory" />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2" data-widget-control-path="style.trackLabelSize">
            <p className="text-sm font-medium">Track label size</p>
            <Select
              value={normalized.style?.trackLabelSize ?? "base"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  trackLabelSize: next as CompareStyle["trackLabelSize"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track label size" />
              </SelectTrigger>
              <SelectContent>
                {trackLabelSizes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {labelSizeLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" data-widget-control-path="style.stepLabelSize">
            <p className="text-sm font-medium">Step label size</p>
            <Select
              value={normalized.style?.stepLabelSize ?? "xs"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  stepLabelSize: next as CompareStyle["stepLabelSize"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Step label size" />
              </SelectTrigger>
              <SelectContent>
                {stepLabelSizes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {labelSizeLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {highlightEnabled ? (
            <div className="space-y-2" data-widget-control-path="style.segmentLabelSize">
              <p className="text-sm font-medium">Segment label size</p>
              <Select
                value={normalized.style?.segmentLabelSize ?? "xs"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    segmentLabelSize: next as CompareStyle["segmentLabelSize"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Segment label size" />
                </SelectTrigger>
                <SelectContent>
                  {segmentLabelSizes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {labelSizeLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2" data-widget-control-path="style.trackLabelFontWeight">
            <p className="text-sm font-medium">Track label weight</p>
            <Select
              value={normalized.style?.trackLabelFontWeight ?? "semibold"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  trackLabelFontWeight: next as CompareStyle["trackLabelFontWeight"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track label weight" />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {fontWeightLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" data-widget-control-path="style.stepLabelFontWeight">
            <p className="text-sm font-medium">Step label weight</p>
            <Select
              value={normalized.style?.stepLabelFontWeight ?? "semibold"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  stepLabelFontWeight: next as CompareStyle["stepLabelFontWeight"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Step label weight" />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {fontWeightLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {highlightEnabled ? (
            <div className="space-y-2" data-widget-control-path="style.segmentLabelFontWeight">
              <p className="text-sm font-medium">Segment label weight</p>
              <Select
                value={normalized.style?.segmentLabelFontWeight ?? "normal"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    segmentLabelFontWeight: next as CompareStyle["segmentLabelFontWeight"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Segment label weight" />
                </SelectTrigger>
                <SelectContent>
                  {fontWeightOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {fontWeightLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="space-y-2" data-widget-control-path="style.markerShape">
          <p className="text-sm font-medium">Marker shape</p>
          <Select
            value={normalized.style?.markerShape ?? "rounded"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { markerShape: next as CompareStyle["markerShape"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Marker shape" />
            </SelectTrigger>
            <SelectContent>
              {markerShapeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {markerShapeLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        id="compare-timeline.visual.spacing-layout"
        mode="visual"
        role="layout"
        title="Spacing and layout preview hints"
        description="Adjust density and axis label placement for desktop/tablet/mobile preview modes."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2" data-widget-control-path="layout.trackSpacing">
            <p className="text-sm font-medium">Track spacing</p>
            <Select
              value={normalized.layout?.trackSpacing ?? "md"}
              onValueChange={(next) =>
                updateLayout(value, onChange, {
                  trackSpacing: next as CompareLayout["trackSpacing"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track spacing" />
              </SelectTrigger>
              <SelectContent>
                {trackSpacingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {trackSpacingLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {spacingTokenDescriptions[normalized.layout?.trackSpacing ?? "md"]}
            </p>
          </div>

          <div className="space-y-2" data-widget-control-path="layout.labelPosition">
            <p className="text-sm font-medium">Axis label position</p>
            <Select
              value={normalized.layout?.labelPosition ?? "top"}
              onValueChange={(next) =>
                updateLayout(value, onChange, {
                  labelPosition: next as CompareLayout["labelPosition"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Axis label position" />
              </SelectTrigger>
              <SelectContent>
                {labelPositionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {labelPositionLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2" data-widget-control-path="layout.maxWidth">
            <p className="text-sm font-medium">Max width</p>
            <Select
              value={normalized.layout?.maxWidth ?? "6xl"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { maxWidth: next as CompareLayout["maxWidth"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Max width" />
              </SelectTrigger>
              <SelectContent>
                {maxWidthOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {maxWidthLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" data-widget-control-path="layout.padding">
            <p className="text-sm font-medium">Section padding</p>
            <Select
              value={normalized.layout?.padding ?? "md"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { padding: next as CompareLayout["padding"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Section padding" />
              </SelectTrigger>
              <SelectContent>
                {paddingOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {paddingLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" data-widget-control-path="layout.trackOrder">
            <p className="text-sm font-medium">Track order</p>
            <Select
              value={normalized.layout?.trackOrder ?? "a-first"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { trackOrder: next as CompareLayout["trackOrder"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Track order" />
              </SelectTrigger>
              <SelectContent>
                {trackOrderOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2" data-widget-control-path="layout.motion">
            <p className="text-sm font-medium">Motion</p>
            <Select
              value={normalized.layout?.motion ?? "none"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { motion: next as CompareLayout["motion"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Motion" />
              </SelectTrigger>
              <SelectContent>
                {motionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {motionLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Animation turns off automatically for visitors who prefer reduced motion.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Use runtime preview device tabs to validate spacing and label readability per viewport.
        </p>
      </EditorSection>
    </div>
  );
}

export function CompareTimelineAdvancedEditor({
  value,
  variant,
  onChange,
}: WidgetEditorProps<CompareTimelineData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveCompareTimelineVariant(variant);
  const highlightEnabled = resolvedVariant === "dual-track-highlight";
  const { highlightMode } = getHighlightContext(normalized);
  const normalizationSignature = JSON.stringify(value);
  const highlightTrack =
    highlightMode === "both" ? null : normalized.tracks.find((track) => track.id === highlightMode);
  const highlightSummary =
    highlightMode === "both" ? "Both tracks" : (highlightTrack?.label ?? "Track");
  const highlightDiagnostics = highlightEnabled
    ? highlightSummary
    : `Disabled in Dual Track; saved target ${highlightSummary} is preserved for Dual Track Highlight.`;
  const [confirmNormalizeSignature, setConfirmNormalizeSignature] = useState<string | null>(null);
  const confirmNormalize = confirmNormalizeSignature === normalizationSignature;

  return (
    <div className="space-y-4">
      <EditorSection
        id="compare-timeline.advanced.runtime-layout"
        mode="advanced"
        role="diagnostics"
        title="Runtime layout diagnostics"
        description="Read-only layout, guide, highlight, and style summary."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Guide lines</p>
            <p className="mt-1 text-muted-foreground">
              {(normalized.guides?.enabled ?? true) ? "Enabled" : "Disabled"} ·{" "}
              {guideStyleLabels[normalized.guides?.style ?? "dashed"]}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Highlight target</p>
            <p className="mt-1 text-muted-foreground">{highlightDiagnostics}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Layout</p>
            <p className="mt-1 text-muted-foreground">
              Spacing {spacingTokenDescriptions[normalized.layout?.trackSpacing ?? "md"]} · Labels{" "}
              {labelPositionLabels[normalized.layout?.labelPosition ?? "top"]} · Width{" "}
              {maxWidthLabels[normalized.layout?.maxWidth ?? "6xl"]}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Motion and order</p>
            <p className="mt-1 text-muted-foreground">
              {motionLabels[normalized.layout?.motion ?? "none"]} ·{" "}
              {resolveTrackOrderSummary(normalized)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Visual owns guide, highlight, spacing, label, motion, and style changes so editors have
          one truthful place to adjust presentation.
        </p>
      </EditorSection>

      <EditorSection
        id="compare-timeline.advanced.metadata"
        mode="advanced"
        role="diagnostics"
        title="Metadata diagnostics"
        description="Read-only normalized IDs, step descriptions, and runtime counts."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Track references</p>
            <p className="mt-1 text-muted-foreground">
              {normalized.tracks.map((track) => track.label).join(", ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Internal support references are available below only for troubleshooting.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Axis step count</p>
            <p className="mt-1 text-muted-foreground">
              {normalized.axis.steps.length} steps · supported range {compareAxisStepMin}-
              {compareAxisStepMax}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Axis steps</p>
          {normalized.axis.steps.map((step, stepIndex) => (
            <div key={step.id ?? `${stepIndex}`} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">
                {step.label.trim() ? step.label : `Step ${stepIndex + 1}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {step.description?.trim()
                  ? step.description
                  : "No optional description configured."}
              </p>
            </div>
          ))}
        </div>

        <details className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            Show internal support references
          </summary>
          <div className="mt-3 space-y-2">
            <p>
              Tracks: {normalized.tracks.map((track) => `${track.label}: ${track.id}`).join(", ")}
            </p>
            <p>
              Steps:{" "}
              {normalized.axis.steps
                .map((step, stepIndex) => {
                  const label = step.label.trim() ? step.label : `Step ${stepIndex + 1}`;
                  return `${label}: ${step.id ?? `step-${stepIndex + 1}`}`;
                })
                .join(", ")}
            </p>
          </div>
        </details>
      </EditorSection>

      <EditorSection
        id="compare-timeline.advanced.normalization"
        mode="advanced"
        role="summary"
        title="Normalization support"
        description="Confirmed deterministic cleanup for axis count, IDs, markers, and segments."
      >
        <p className="text-xs text-muted-foreground">
          Current axis steps: {normalized.axis.steps.length}. Runtime rules enforce{" "}
          {compareAxisStepMin}-{compareAxisStepMax} steps, stable IDs, and clamped marker/segment
          ranges.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmNormalizeSignature(normalizationSignature)}
        >
          Normalize compare payload
        </Button>
      </EditorSection>

      <ConfirmActionDialog
        open={confirmNormalize}
        onOpenChange={(open) => setConfirmNormalizeSignature(open ? normalizationSignature : null)}
        title="Normalize compare timeline"
        description="Normalize this compare timeline now? Current copy is preserved while IDs, marker ranges, segment ranges, and count guard rails are reapplied."
        confirmLabel="Normalize"
        onConfirm={() => {
          if (!confirmNormalize) return;
          onChange(normalized);
          setConfirmNormalizeSignature(null);
        }}
      />
    </div>
  );
}
